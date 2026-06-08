/**
 * POST /api/pms/policies/[id]/revise
 *
 * Phase 5 entry point: forks a published policy into a new draft so the RM
 * can edit it in /dashboard/rm/policies/[lenderId]/[product]/edit.
 *
 * Guards:
 *   - role: rm or admin
 *   - RM must have an active assignment for this lender
 *   - source policy must be status='published'
 *   - no existing draft for the same (lenderId, loanProduct)
 *
 * Returns the new draft's policyId + lockVersion.
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import {
	getPolicyById,
	revisePublishedPolicy,
	PolicyNotFoundError,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const { id } = params;
	const userId = locals.user!.id;
	// Admin bypass — see /api/pms/policies/[id]/+server.ts for full rationale.
	const isAdmin =
		locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;

	try {
		// Look up the source policy first so we can RM-gate on its lenderId
		const source = await getPolicyById(id);

		if (!isAdmin) {
			const assignment = await RmLenderAssignments.findOne({
				rmUserId: userId,
				lenderId: source.lenderId,
				status: 'active'
			});
			if (!assignment) {
				return apiError('You are not assigned to this lender', 403);
			}
		}

		const newDraft = await revisePublishedPolicy(id, userId);

		logger.info(
			{
				newDraftId: newDraft._id.toString(),
				sourcePolicyId: id,
				sourceVersion: source.version,
				lenderId: source.lenderId,
				loanProduct: source.loanProduct,
				revisedBy: userId
			},
			'PMS published policy forked into revision draft'
		);

		return apiOk({
			policyId: newDraft._id.toString(),
			lenderId: newDraft.lenderId,
			loanProduct: newDraft.loanProduct,
			status: newDraft.status,
			lockVersion: newDraft.lockVersion
		});
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		if (err instanceof PolicyStatusError) return apiError(err.message, 409);
		return apiServerError(err, 'pms policy revise POST');
	}
};
