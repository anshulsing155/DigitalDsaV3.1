/**
 * POST /api/admin/policies/[artifact_id]/reparse
 * Re-run AI parsing with optional correction guidance.
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

// `corrections`: admin's free-text guidance to the AI re-parse (10 KB ceiling).
// `source_doc_content`: optional pasted-text fallback for the source doc (5 MB
// ceiling — matches the /parse route).
const postRequestSchema = z.object({
	corrections: z.string().max(10_000).optional(),
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

		if (artifact.status !== 'in_review' && artifact.status !== 'draft') {
			return apiError(`Cannot reparse artifact in "${artifact.status}" status`, 400);
		}

		let corrections = '';
		let sourceDocContent = '';
		const parsed = await parseJsonBody<Record<string, unknown>>(request);
		if (parsed.ok) {
			const validation = postRequestSchema.safeParse(parsed.data);
			if (!validation.success) {
				return apiValidationError('Invalid body', validation.error.flatten());
			}
			corrections = validation.data.corrections ?? '';
			sourceDocContent = validation.data.source_doc_content ?? '';
		}

		// Mark as parsing
		await LenderRuleArtifacts.updateOne(
			{ _id: artifactOid },
			{ $set: { status: 'parsing', updated_at: new Date() } }
		);

		try {
			const guidedContent = corrections
				? `${sourceDocContent}\n\nCORRECTIONS TO APPLY:\n${corrections}`
				: sourceDocContent;

			const result = await runFullParsePipeline(
				artifact.source_document_urls,
				artifact.lender_name,
				guidedContent,
				4
			);

			// Append new iterations to existing ones
			const existingIterations = artifact.parse_iterations || [];
			const newIterations = result.iterations.map((it, idx) => ({
				...it,
				iteration: existingIterations.length + idx + 1
			}));

			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{
					$set: {
						json_logic: result.json_logic,
						human_readable: result.human_readable,
						confidence_scores: result.confidence,
						status: 'in_review',
						updated_at: new Date()
					},
					$push: {
						parse_iterations: { $each: newIterations }
					} as any
				}
			);

			return apiOk({
				iterations_run: result.iterations.length,
				total_iterations: existingIterations.length + newIterations.length,
				converged: result.converged
			});
		} catch (aiError) {
			const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
			await LenderRuleArtifacts.updateOne(
				{ _id: artifactOid },
				{
					$set: {
						status: 'parse_error',
						last_parse_error: { message: errorMessage, at: new Date() },
						updated_at: new Date()
					}
				}
			);
			logger.error({ err: aiError, artifactId: artifactOid.toString() }, 'AI Reparse Error');
			return apiError(`AI reparsing failed: ${errorMessage}`, 500);
		}
	} catch (err) {
		return apiServerError(err, 'Failed to reparse');
	}
};
