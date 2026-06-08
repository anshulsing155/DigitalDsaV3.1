/**
 * POST /api/auth/register-device
 * Silent device fingerprint registration — no UI, purely server-side tracking.
 * Authenticated users only; upserts a DeviceRegistry record.
 */

import type { RequestHandler } from './$types';
import { DeviceRegistry } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import { DEMO_USER_ID } from '$lib/services/jwtService.js';
import {
	apiError,
	apiOk,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { z } from 'zod';

// DX-2: Zod schema replaces the hand-rolled fingerprint check and locks
// down deviceInfo.type to known device classes (previously cast without
// validation). Other deviceInfo fields stay free-form strings since
// browsers report wildly varied OS/browser strings.
const postRequestSchema = z.object({
	fingerprint: z.string().min(1),
	deviceInfo: z
		.object({
			type: z.enum(['desktop', 'mobile', 'tablet']).optional(),
			os: z.string().optional(),
			browser: z.string().optional()
		})
		.optional()
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const user = locals.user;
	if (!user || user.id === DEMO_USER_ID) {
		return apiError('Unauthorized', 401);
	}

	// SEC-4: rate-limit device registration. Per-user (not IP) because the
	// real risk is fingerprint-spray — a compromised token could spam many
	// distinct fingerprints, each creating a new DeviceRegistry row (the
	// upsert key is `userId + fingerprint`). 10/min/user is far above any
	// legitimate flow (one registration on each new device, run once per
	// page load at most).
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-register-device:${user.id}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many device registration attempts. Please wait.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = postRequestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { fingerprint, deviceInfo } = validated.data;

	try {
		// Determine which collection this user lives in
		const role = user.activeRole || user.role || 'user';
		let userCollection: 'userApplications' | 'DsaApplications' | 'rmApplications' =
			'userApplications';
		if (role === 'dsa') userCollection = 'DsaApplications';
		else if (role === 'rm') userCollection = 'rmApplications';

		const userId = new ObjectId(user.id);
		const now = new Date();

		await DeviceRegistry.updateOne(
			{ userId, fingerprint },
			{
				$set: {
					userCollection,
					deviceInfo: {
						type: (deviceInfo?.type || 'desktop') as 'desktop' | 'mobile' | 'tablet',
						os: deviceInfo?.os || 'unknown',
						browser: deviceInfo?.browser || 'unknown'
					},
					lastSeen: now
				},
				$setOnInsert: {
					firstSeen: now,
					flags: []
				},
				$inc: { loginCount: 1 }
			},
			{ upsert: true }
		);

		return apiOk();
	} catch (error) {
		return apiServerError(error, 'Failed to register device');
	}
};
