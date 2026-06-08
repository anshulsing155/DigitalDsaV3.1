/**
 * POST /api/admin/policies/[artifact_id]/publish
 * Activate an approved artifact and supersede the previous active version.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { invalidateLenderRuleDocsCache } from '$lib/ruleEngine/evaluationEngine.js';
import { ObjectId } from 'mongodb';

export const POST: RequestHandler = async ({ params, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		if (!params.artifact_id || !ObjectId.isValid(params.artifact_id)) {
			return apiError('Invalid artifact ID', 400);
		}
		const artifactOid = new ObjectId(params.artifact_id);

		const artifact = await LenderRuleArtifacts.findOne({ _id: artifactOid });
		if (!artifact) {
			return apiError('Artifact not found', 404);
		}

		if (artifact.status !== 'approved') {
			return apiError(
				`Cannot publish artifact in "${artifact.status}" status. Must be "approved".`,
				400
			);
		}

		const now = new Date();

		// Supersede any currently active version for the same lender
		await LenderRuleArtifacts.updateMany(
			{ lender_id: artifact.lender_id, status: 'active' },
			{ $set: { status: 'superseded', updated_at: now } }
		);

		// Activate this artifact
		await LenderRuleArtifacts.updateOne(
			{ _id: artifactOid },
			{
				$set: {
					status: 'active',
					activated_at: now,
					updated_at: now
				}
			}
		);

		// Invalidate the in-process rule-docs cache for every loan_type this
		// artifact covers. Same instance only — other Vercel function
		// instances will pick up the change naturally within the 60s TTL.
		// Clears NOTHING when this artifact has no loan_types (defensive).
		const affectedLoanTypes = (artifact.loan_types as string[] | undefined) ?? [];
		for (const loanType of affectedLoanTypes) {
			invalidateLenderRuleDocsCache(loanType);
		}

		return apiOk({
			status: 'active',
			version: artifact.version,
			lender_id: artifact.lender_id
		});
	} catch (err) {
		return apiServerError(err, 'Failed to publish artifact');
	}
};
