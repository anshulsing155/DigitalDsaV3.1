/**
 * POST /api/auth/create-rm
 * ═══════════════════════════════════════════════════════════════════
 * Creates a bare RM record for partner signup.
 * Called after OTP verification when a new number is detected
 * via the /partner-signup flow.
 *
 * Generates JWT tokens with the rmApplications._id as userId.
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { rmApplications, Applicant, DsaApplications, pcApplications } from '$lib/database/mongo.js';
import { generateTokenPair, generateTokenId } from '$lib/services/jwtService.js';
import { dev } from '$app/environment';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import {
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { z } from 'zod';
import { findUserByMobile, encryptUserPii } from '$lib/server/csfle/index.js';

// DX-2: Zod schema — same Indian mobile constraint as signup. Shared
// pattern would be nice but the schema is small enough to inline per
// route; future routes that accept mobileNumber can copy/paste.
const postRequestSchema = z.object({
	mobileNumber: z
		.union([z.string(), z.number()])
		.transform((v) => String(v))
		.pipe(z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'))
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit RM account creation by IP. 5/min matches signup —
	// real partner signups are rare so this is generous.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-create-rm:${getClientAddress()}`,
		maxRequests: 5,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many signup attempts. Please wait before trying again.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = postRequestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const mobileStr = validated.data.mobileNumber;

	try {
		const mobileNum = Number(mobileStr);

		// Verify OTP was completed
		const verifiedMobile = cookies.get('verifiedMobile');
		if (!verifiedMobile || verifiedMobile !== mobileStr) {
			return apiError('Mobile number not verified. Complete OTP first.', 403);
		}

		// SEC-2: Enforce one-number-one-role across all collections.
		// findUserByMobile transparently handles encrypted + plaintext rows.
		const [, existingDsa, existingRm, existingPc] = await Promise.all([
			findUserByMobile(Applicant, mobileStr),
			findUserByMobile(DsaApplications, mobileStr),
			findUserByMobile(rmApplications, mobileStr),
			findUserByMobile(pcApplications, mobileStr)
		]);

		if (existingDsa || existingRm || existingPc) {
			return apiError('An account with this number already exists. Please sign in.', 409);
		}

		// Create bare RM record — encrypt PII fields before insert (mobile
		// is the only non-empty PII at this stage; empty strings for name/
		// email pass through encryption harmlessly).
		const newRm = await encryptUserPii({
			mobileNumber: mobileNum,
			name: '',
			email: '',
			gender: '',
			age: 0,
			role: 'rm',
			onboardingCompleted: false,
			accountStatus: 'active',
			lastActiveAt: new Date(),
			usedCoins: 0,
			availableCoins: 0,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		const result = await rmApplications.insertOne(newRm as any);

		if (!result.acknowledged) {
			return apiError('Failed to create partner account', 500);
		}

		// Generate JWT tokens with RM _id
		const tokenId = generateTokenId();
		const tokens = generateTokenPair(result.insertedId.toString(), '', mobileNum, '', tokenId);

		// Store refresh token
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

		await rmApplications.updateOne(
			{ _id: result.insertedId },
			{
				$set: {
					refreshToken: tokens.refreshToken,
					refreshTokenExpiry,
					activeTokenId: tokenId,
					updatedAt: new Date()
				}
			}
		);

		// Set httpOnly cookies
		cookies.set('accessToken', tokens.accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: ACCESS_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('role', 'rm', {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		return json({
			success: true,
			user: {
				id: result.insertedId.toString(),
				name: '',
				mobileNumber: mobileNum,
				email: '',
				role: 'rm',
				onboardingCompleted: false
			},
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken
		});
	} catch (error) {
		return apiServerError(error, 'Failed to create partner account');
	}
};
