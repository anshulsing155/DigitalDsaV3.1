/**
 * POST /api/pms/policies/[id]/approve
 * Admin approves a submitted policy.
 * Body: { scheduledPublishAt?: ISO string }
 * If scheduledPublishAt is set → status becomes 'approved_scheduled'.
 * Otherwise → status becomes 'approved'.
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
import { requireRoleApi } from '$lib/server/guards.js';
import { Notifications } from '$lib/database/mongo.js';
import {
	getPolicyById,
	approvePolicy,
	PolicyNotFoundError,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';
import { z } from 'zod';

// DX-2: ISO datetime string for the optional scheduled publish time.
// z.string().datetime() rejects empty strings, malformed dates, and
// non-string types up front — the post-Zod isNaN check is preserved
// as a belt-and-braces defense against future refactors.
const postRequestSchema = z.object({
	scheduledPublishAt: z.string().datetime().optional()
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const { id } = params;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = postRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}

	const adminId = locals.user!.id;
	const scheduledPublishAt = validated.data.scheduledPublishAt
		? new Date(validated.data.scheduledPublishAt)
		: null;

	// Defense-in-depth: even though Zod's .datetime() should catch malformed
	// dates, isNaN guards against any edge case where the string parses to
	// an Invalid Date.
	if (scheduledPublishAt && isNaN(scheduledPublishAt.getTime())) {
		return apiError('Invalid scheduledPublishAt date', 400);
	}

	try {
		const policy = await getPolicyById(id);

		await approvePolicy(id, adminId, scheduledPublishAt);

		// Notify the reconciliation RM (only if field is set — older policies may not have it)
		if (policy.reconciliationAssignedTo) await Notifications.insertOne({
			user_id: policy.reconciliationAssignedTo,
			user_role: 'rm',
			type: 'pms_policy_approved',
			title: `${policy.lenderId} ${policy.loanProduct} policy approved`,
			message: scheduledPublishAt
				? `Your policy has been approved and will publish on ${scheduledPublishAt.toLocaleDateString('en-IN')}.`
				: 'Your policy has been approved and is ready to publish.',
			action_url: `/dashboard/rm/policies/${policy.lenderId}/${encodeURIComponent(policy.loanProduct)}`,
			read: false,
			created_at: new Date(),
			metadata: { policyId: id, lenderId: policy.lenderId, loanProduct: policy.loanProduct }
		} as any);

		logger.info(
			{ policyId: id, approvedBy: adminId, scheduledPublishAt },
			'PMS policy approved'
		);

		return apiOk({
			message: scheduledPublishAt
				? `Policy approved. Will publish on ${scheduledPublishAt.toLocaleDateString('en-IN')}.`
				: 'Policy approved.'
		});
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		return apiServerError(err, 'pms policy approve');
	}
};
