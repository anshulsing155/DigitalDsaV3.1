/**
 * POST /api/admin/policies/[artifact_id]/review
 * Admin approves, rejects, or sends artifact to RM for review.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ObjectId } from 'mongodb';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';

// Enum gate locks the action to the 3 valid choices before any state-transition
// check fires. `note` carries the admin's free-text comment when requesting a
// correction (rendered into rm_review.queries).
const postRequestSchema = z.object({
	action: z.enum(['approve', 'send_to_rm', 'request_correction']),
	note: z.string().max(5000).optional()
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
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

		const parsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!parsed.ok) return parsed.response;
		const validation = postRequestSchema.safeParse(parsed.data);
		if (!validation.success) {
			return apiValidationError('Invalid body', validation.error.flatten());
		}
		const { action, note = '' } = validation.data;

		const adminName = locals.user?.name || 'admin';
		const now = new Date();

		if (action === 'approve') {
			if (artifact.status !== 'in_review' && artifact.status !== 'rm_pending') {
				return apiError(`Cannot approve artifact in "${artifact.status}" status`, 400);
			}

			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{
					$set: {
						status: 'approved',
						reviewed_by: adminName,
						updated_at: now
					}
				}
			);

			return apiOk({ status: 'approved' });
		}

		if (action === 'send_to_rm') {
			if (artifact.status !== 'in_review') {
				return apiError(`Cannot send to RM from "${artifact.status}" status`, 400);
			}

			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{
					$set: {
						status: 'rm_pending',
						updated_at: now
					}
				}
			);

			return apiOk({ status: 'rm_pending' });
		}

		// request_correction — stays in_review, append the correction note as a query
		await LenderRuleArtifacts.updateOne(
			{ _id: artifactOid },
			{
				$set: { updated_at: now },
				$push: {
					'rm_review.queries': {
						query_id: `q-${Date.now()}`,
						category: 'general',
						section: 'overall',
						question: note || 'Correction requested',
						resolved: false,
						raised_at: now
					}
				} as any
			}
		);

		return apiOk({ status: artifact.status, correction_noted: true });
	} catch (err) {
		return apiServerError(err, 'Failed to process review');
	}
};
