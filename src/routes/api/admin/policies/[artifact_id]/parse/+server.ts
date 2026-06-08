/**
 * POST /api/admin/policies/[artifact_id]/parse
 * Trigger the AI parsing pipeline for a draft artifact.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { LenderRuleArtifacts } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { ObjectId } from 'mongodb';
import { runFullParsePipeline } from '$lib/server/aiService.js';

// Optional source-document content (pasted text fallback when the artifact's
// uploaded URLs aren't reachable). 5 MB upper bound — anything bigger should
// be uploaded as a document instead of pasted into a request body.
const postRequestSchema = z.object({
	source_doc_content: z.string().max(5_000_000).optional()
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

		if (artifact.status !== 'draft' && artifact.status !== 'in_review') {
			return apiError(`Cannot parse artifact in "${artifact.status}" status`, 400);
		}

		// Body is optional — only validate the shape when present.
		let sourceDocContent = '';
		const parsed = await parseJsonBody<Record<string, unknown>>(request);
		if (parsed.ok) {
			const validation = postRequestSchema.safeParse(parsed.data);
			if (!validation.success) {
				return apiValidationError('Invalid body', validation.error.flatten());
			}
			sourceDocContent = validation.data.source_doc_content ?? '';
		}

		// Mark as parsing
		await LenderRuleArtifacts.updateOne(
			{ _id: artifactOid },
			{ $set: { status: 'parsing', updated_at: new Date() } }
		);

		try {
			// Run the full AI pipeline
			const result = await runFullParsePipeline(
				artifact.source_document_urls,
				artifact.lender_name,
				sourceDocContent,
				4
			);

			// Update artifact with results
			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{
					$set: {
						json_logic: result.json_logic,
						human_readable: result.human_readable,
						confidence_scores: result.confidence,
						parse_iterations: result.iterations,
						status: result.converged ? 'in_review' : 'in_review',
						updated_at: new Date()
					}
				}
			);

			return apiOk({
				iterations_run: result.iterations.length,
				converged: result.converged,
				needs_human: !result.converged && result.iterations.length >= 4
			});
		} catch (aiError) {
			// Revert to draft on AI failure
			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{ $set: { status: 'draft', updated_at: new Date() } }
			);
			logger.error({ err: aiError }, 'AI Parse Error');
			return apiError(
				`AI parsing failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
				500
			);
		}
	} catch (err) {
		return apiServerError(err, 'Failed to initiate parsing');
	}
};
