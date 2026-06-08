/**
 * POST /api/rm/profile/complete
 * ═══════════════════════════════════════════════════════════════════
 * Complete an auto-provisioned RM profile (A.1). Used by the Settings
 * page's "Create my profile" setup form when the RM holds the role but
 * has only a `profile_incomplete` stub (or no doc yet).
 *
 * Fills the required fields, encrypts PII, and flips the profile to
 * `profileStatus: 'active'`. Idempotent on the doc — re-submitting just
 * overwrites the editable fields.
 *
 * Auth: requireRoleApi('rm'). CSRF: global hook (client uses secureFetch).
 * Rate-limited 5/hr/user to slow abuse of the create path.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { rmApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, apiValidationError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { encryptUserPii, findUserByMobile } from '$lib/server/csfle/index.js';
import { ensureRmProfile, resolveRmDoc, shapeRmProfile } from '$lib/server/rmHelpers.js';
import { ObjectId } from 'mongodb';
import logger from '$lib/server/logger.js';

const completeSchema = z.object({
	name: z.string().trim().min(2).max(100),
	officialEmail: z.string().trim().email().max(120),
	bankName: z.string().trim().min(1).max(100),
	designation: z.string().trim().max(60).optional(),
	workingCity: z.string().trim().min(1).max(100)
});

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// 5 requests / hour / user — the create path shouldn't be hammered.
	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 5,
		windowMs: 60 * 60 * 1000,
		identifier: `rm-profile-complete:${locals.user!.id}`
	});
	if (limited) return apiError('Too many attempts. Please try again later.', 429);

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = completeSchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid profile details', validation.error.flatten());
	}
	const { name, officialEmail, bankName, designation, workingCity } = validation.data;

	try {
		// Guarantee the doc exists before updating (handles the rare case where
		// the form is reached before any provisioning ran).
		await ensureRmProfile(locals.user!);

		// SEC-2: encrypt PII fields; non-PII fields pass through unchanged.
		// Typed as Record so the literal 'active' doesn't widen-clash with the
		// Rm.profileStatus union at the $set call (mirrors the PATCH endpoint).
		const updateFields: Record<string, unknown> = {
			name,
			rmOfficialEmail: officialEmail,
			bankName,
			designation: designation ?? '',
			workingCity,
			profileStatus: 'active',
			updatedAt: new Date()
		};
		const update = await encryptUserPii(updateFields);

		// Update by _id first (admin-mirror id), fall back to mobile lookup.
		let matched = 0;
		try {
			const res = await rmApplications.updateOne(
				{ _id: new ObjectId(locals.user!.id) },
				{ $set: update }
			);
			matched = res.matchedCount;
		} catch {
			const rm = await findUserByMobile(rmApplications, locals.user!.mobileNumber);
			if (rm?._id) {
				const res = await rmApplications.updateOne({ _id: rm._id }, { $set: update });
				matched = res.matchedCount;
			}
		}

		if (matched === 0) {
			return apiError('RM profile not found', 404);
		}

		logger.info({ userId: locals.user!.id }, 'rm_profile_completed');

		const rmDoc = await resolveRmDoc(locals.user!);
		return apiOk({ profile: rmDoc ? shapeRmProfile(rmDoc) : null });
	} catch (err) {
		return apiServerError(err, 'RM profile completion failed');
	}
};
