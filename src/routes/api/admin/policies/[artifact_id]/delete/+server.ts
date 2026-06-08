/**
 * POST /api/admin/policies/[artifact_id]/delete
 * Delete or soft-delete a rule artifact.
 *
 * Behavior by status:
 *   - draft, parsing, in_review: hard delete (remove from DB)
 *   - approved, active: soft delete (set status to 'superseded', record deleted_by)
 *   - superseded: hard delete allowed
 *   - rm_pending: cannot delete while RM review is in progress
 *
 * Admin-only. All deletes are logged to PolicyAuditLogs.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { LenderRuleArtifacts, PolicyAuditLogs } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { invalidateLenderRuleDocsCache } from '$lib/ruleEngine/evaluationEngine.js';
import logger from '$lib/server/logger.js';

// Statuses that allow hard delete
const HARD_DELETE_STATUSES = new Set(['draft', 'parsing', 'in_review', 'superseded']);

// Statuses that get soft-deleted (superseded with audit trail)
const SOFT_DELETE_STATUSES = new Set(['approved', 'active']);

export const POST: RequestHandler = async ({ params, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const artifactId = params.artifact_id;
		if (!artifactId) {
			return apiError('Artifact ID is required', 400);
		}

		// Find by artifact_id string (not ObjectId) — matches how seed creates them
		const artifact = await LenderRuleArtifacts.findOne({ artifact_id: artifactId });
		if (!artifact) {
			return apiError('Artifact not found', 404);
		}

		const { status } = artifact;
		const adminId = locals.user?.mobileNumber || 'unknown';
		const now = new Date();

		// Cannot delete during active RM review
		if (status === 'rm_pending') {
			return apiError(
				'Cannot delete artifact while RM review is pending. Resolve or cancel the review first.',
				409
			);
		}

		let action: 'hard_delete' | 'soft_delete';

		if (HARD_DELETE_STATUSES.has(status)) {
			// Hard delete — remove from DB entirely
			await LenderRuleArtifacts.deleteOne({ _id: artifact._id });
			action = 'hard_delete';
		} else if (SOFT_DELETE_STATUSES.has(status)) {
			// Soft delete — set to superseded with audit fields
			await LenderRuleArtifacts.updateOne(
				{ _id: artifact._id },
				{
					$set: {
						status: 'superseded',
						deleted_by: adminId,
						deleted_at: now,
						updated_at: now
					}
				}
			);
			action = 'soft_delete';
		} else {
			return apiError(`Cannot delete artifact in "${status}" status`, 400);
		}

		// Log to audit trail
		await PolicyAuditLogs.insertOne({
			target_type: 'rule_artifact',
			target_id: artifact.artifact_id,
			action: action === 'hard_delete' ? 'artifact_deleted' : 'artifact_superseded',
			actor_type: 'admin',
			actor_id: adminId,
			changes: {
				previous_status: status,
				action,
				lender_name: artifact.lender_name,
				version: artifact.version
			},
			created_at: now
		} as any);

		// Invalidate the in-process rule-docs cache on this instance when
		// an ACTIVE artifact is removed (the only delete path that affects
		// what loadActiveRuleDocuments returns). Hard-deletes of draft/
		// parsing/in_review/superseded artifacts don't change cache state
		// because they were never in the cache to begin with.
		if (status === 'active') {
			const affectedLoanTypes = (artifact.loan_types as string[] | undefined) ?? [];
			for (const loanType of affectedLoanTypes) {
				invalidateLenderRuleDocsCache(loanType);
			}
		}

		logger.info(
			{
				artifact_id: artifact.artifact_id,
				lender_name: artifact.lender_name,
				action,
				previous_status: status,
				admin_id: adminId
			},
			`Artifact ${action}: ${artifact.artifact_id}`
		);

		return apiOk({
			action,
			artifact_id: artifact.artifact_id,
			lender_name: artifact.lender_name,
			message:
				action === 'hard_delete'
					? `Artifact "${artifact.lender_name}" permanently deleted`
					: `Artifact "${artifact.lender_name}" marked as superseded`
		});
	} catch (err) {
		return apiServerError(err, 'Failed to delete artifact');
	}
};
