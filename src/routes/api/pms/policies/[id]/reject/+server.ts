/**
 * POST /api/pms/policies/[id]/reject
 * Admin rejects a submitted policy with a note — returns it to draft.
 * Body: { rejectionNote: string, clauseComments?: { clauseId: string; comment: string }[] }
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
import { PmsLenderPolicies, Notifications } from '$lib/database/mongo.js';
import {
	getPolicyById,
	rejectPolicy,
	PolicyNotFoundError,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

// DX-2: required non-empty rejectionNote with 1000-char cap, plus
// optional clause-level comments. Matches the inline checks the
// pre-Zod handler did.
const postRequestSchema = z.object({
	rejectionNote: z
		.string()
		.trim()
		.min(1, 'rejectionNote is required')
		.max(1000, 'rejectionNote must be under 1000 characters'),
	clauseComments: z
		.array(z.object({ clauseId: z.string(), comment: z.string() }))
		.optional()
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
	const { rejectionNote, clauseComments } = validated.data;

	const adminId = locals.user!.id;

	try {
		const policy = await getPolicyById(id);

		await rejectPolicy(id, adminId, rejectionNote);

		// Save clause-level comments if provided
		if (clauseComments?.length) {
			await PmsLenderPolicies.updateOne(
				{ _id: new ObjectId(id) },
				{ $set: { adminClauseComments: clauseComments } }
			);
		}

		// Notify the reconciliation RM (only if field is set — older policies may not have it)
		if (policy.reconciliationAssignedTo) await Notifications.insertOne({
			user_id: policy.reconciliationAssignedTo,
			user_role: 'rm',
			type: 'pms_policy_rejected',
			title: `${policy.lenderId} ${policy.loanProduct} policy needs revision`,
			message: `Admin returned your policy for revision: "${rejectionNote.slice(0, 120)}${rejectionNote.length > 120 ? '…' : ''}"`,
			action_url: `/dashboard/rm/policies/${policy.lenderId}/${encodeURIComponent(policy.loanProduct)}`,
			read: false,
			created_at: new Date(),
			metadata: {
				policyId: id,
				lenderId: policy.lenderId,
				loanProduct: policy.loanProduct,
				clauseCommentCount: clauseComments?.length ?? 0
			}
		} as any);

		logger.info(
			{ policyId: id, rejectedBy: adminId, clauseCommentCount: clauseComments?.length ?? 0 },
			'PMS policy rejected'
		);

		return apiOk({ message: 'Policy returned to draft with admin notes.' });
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 422);
		return apiServerError(err, 'pms policy reject');
	}
};
