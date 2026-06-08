/**
 * POST /api/pms/policies/[id]/submit
 * RM submits a draft policy for admin review.
 * Requires a valid pmsOtpToken in x-pms-otp-token header (per §0.6).
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi, requirePmsOtpToken } from '$lib/server/guards.js';
import { RmLenderAssignments, AdminUsers, Notifications } from '$lib/database/mongo.js';
import {
	getPolicyById,
	submitPolicy,
	PolicyNotFoundError,
	PolicyStatusError,
	PolicyLockConflictError
} from '$lib/server/pms/policyService.js';
import { allConflictsAcknowledged } from '$lib/server/pms/conflictChecker.js';
import { getPmsSigningKey } from '$lib/server/pms/signingKey.js';
import crypto from 'crypto';
import { z } from 'zod';

// DX-2: locks the optimistic-lock version to a non-negative integer.
// The pre-Zod handler accepted any `typeof === 'number'` (including NaN
// and negatives); the new shape rejects both.
const postRequestSchema = z.object({
	lockVersion: z.number().int().min(0)
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const { id } = params;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = postRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { lockVersion } = validated.data;

	const userId = locals.user!.id;
	// Admin bypass — see /api/pms/policies/[id]/+server.ts for full rationale.
	const isAdmin =
		locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;

	try {
		const policy = await getPolicyById(id);

		// RM must have active assignment
		if (!isAdmin) {
			const assignment = await RmLenderAssignments.findOne({
				rmUserId: userId,
				lenderId: policy.lenderId,
				status: 'active'
			});
			if (!assignment) return apiError('Access denied — no active assignment for this lender', 403);
		}

		// Guard: all conflicts must be acknowledged before submission
		if (!allConflictsAcknowledged(policy.conditionalOverrides)) {
			return apiError(
				'Some conditional overrides have unacknowledged conflicts. Acknowledge or resolve them before submitting.',
				422
			);
		}

		// Verify pmsOtpToken (bound to this policy's current draft hash + 15-min window)
		const draftHash = computeDraftHash(policy);
		let signingKey: string;
		try {
			signingKey = getPmsSigningKey();
		} catch (err) {
			logger.error({ err }, 'PMS signing key unavailable on submit');
			return apiError('Server configuration error', 500);
		}

		const tokenError = requirePmsOtpToken(request, userId, policy.lenderId, id, draftHash, signingKey);
		if (tokenError) return tokenError;

		await submitPolicy(id, userId, lockVersion);

		// Notify all admins so the review queue surfaces the new submission
		try {
			const admins = await AdminUsers.find(
				{},
				{ projection: { _id: 1 } }
			).toArray();
			if (admins.length > 0) {
				const now = new Date();
				await Notifications.insertMany(
					admins.map((a) => ({
						user_id: a._id.toString(),
						user_role: 'admin',
						type: 'pms_policy_submitted',
						title: `${policy.lenderId} ${policy.loanProduct} — new submission`,
						message: `RM submitted a policy ${policy.version === 0 ? 'encoding' : 'revision'} for review.`,
						action_url: `/dashboard/admin/policies/pms/${id}`,
						read: false,
						created_at: now,
						metadata: { policyId: id, lenderId: policy.lenderId, loanProduct: policy.loanProduct }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					})) as any
				);
			}
		} catch (notifyErr) {
			// Non-critical — submission already persisted. Log and continue.
			logger.warn({ err: notifyErr, policyId: id }, 'PMS submit notification fanout failed');
		}

		logger.info({ policyId: id, submittedBy: userId, lenderId: policy.lenderId, loanProduct: policy.loanProduct }, 'PMS policy submitted for review');

		return apiOk({ message: 'Policy submitted for admin review.' });
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		if (err instanceof PolicyLockConflictError) return apiError(err.message, 409);
		return apiServerError(err, 'pms policy submit');
	}
};

function computeDraftHash(policy: { sections: unknown; conditionalOverrides: unknown }): string {
	const payload = JSON.stringify({ sections: policy.sections, overrides: policy.conditionalOverrides });
	return crypto.createHash('sha256').update(payload).digest('hex');
}
