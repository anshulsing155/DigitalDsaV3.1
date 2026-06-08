/**
 * POST /api/admin/policy-engine/captures/[capture_id]/activate
 *
 * Converts a PolicyCapture into a live LenderRuleArtifact.
 * Steps:
 *   1. Read the PolicyCapture document
 *   2. Transform capture data → ParsedLenderRuleDocument (JSON-Logic)
 *   3. Upsert LenderRuleArtifact with status='active' for this lender + loan types
 *   4. Mark capture as 'accepted' with resulting artifact reference
 *
 * This bypasses the full PolicyVersion workflow for fast activation.
 * Use when admin has reviewed the capture and wants to make it live immediately.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { PolicyCaptures, LenderRuleArtifacts } from '$lib/database/mongo.js';
import { transformCaptureToRuleDoc } from '$lib/server/policyCaptureTransformer.js';
import { invalidateLenderRuleDocsCache } from '$lib/ruleEngine/evaluationEngine.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const captureId = params.capture_id;
		if (!captureId) {
			return apiError('Missing capture_id', 400);
		}

		// 1. Read the PolicyCapture
		const capture = await PolicyCaptures.findOne({ capture_id: captureId });
		if (!capture) {
			return apiError('Capture not found', 404);
		}

		// Only submitted or under_review captures can be activated
		if (!['submitted', 'under_review', 'accepted'].includes(capture.status)) {
			return apiError(`Cannot activate capture in "${capture.status}" status`, 400);
		}

		// 2. Transform capture → ParsedLenderRuleDocument
		const ruleDoc = transformCaptureToRuleDoc(capture);

		if (!ruleDoc.loan_types.length) {
			return apiError(
				`Unknown product type "${capture.product_type}" — cannot determine loan types`,
				400
			);
		}

		const now = new Date();
		const artifactId = `${capture.lender_id}-${capture.product_type}-${Date.now()}`;

		// 3. Supersede any existing active artifact for this lender + loan types
		await LenderRuleArtifacts.updateMany(
			{
				lender_id: capture.lender_id,
				status: 'active',
				loan_types: { $in: ruleDoc.loan_types }
			},
			{ $set: { status: 'superseded', updated_at: now } }
		);

		// 4. Insert new active artifact (cast to any — MongoDB auto-generates _id)
		await LenderRuleArtifacts.insertOne({
			_id: undefined as any,
			artifact_id: artifactId,
			lender_id: capture.lender_id,
			lender_name: capture.lender_name,
			classification: capture.classification,
			loan_types: ruleDoc.loan_types,
			version: 1,
			status: 'active',
			json_logic: ruleDoc as unknown as Record<string, unknown>,
			human_readable: null,
			confidence_scores: null,
			parse_iterations: [],
			rm_review: { queries: [] },
			source_document_urls: [],
			parsed_by: 'policy_capture_transformer',
			reviewed_by: locals.user?.name ?? 'admin',
			change_summary: `Activated from RM capture ${captureId}`,
			created_at: now,
			activated_at: now,
			updated_at: now
		});

		// 5. Mark capture as accepted
		await PolicyCaptures.updateOne(
			{ capture_id: captureId },
			{
				$set: {
					status: 'accepted',
					updated_at: now,
					admin_notes: `Activated as artifact ${artifactId}`
				}
			}
		);

		// Invalidate the in-process rule-docs cache on this instance for
		// every loan_type this new artifact covers. Mirrors the hook in
		// /api/admin/policies/[id]/publish — both paths end with a new
		// active artifact and the next eval should see it without waiting
		// out the 60s TTL.
		for (const loanType of ruleDoc.loan_types) {
			invalidateLenderRuleDocsCache(loanType);
		}

		logger.info(
			{ captureId, artifactId, lenderId: capture.lender_id },
			'Policy capture activated as rule artifact'
		);

		return apiOk({
			artifact_id: artifactId,
			lender_id: capture.lender_id,
			loan_types: ruleDoc.loan_types
		});
	} catch (err) {
		return apiServerError(err, 'Failed to activate policy capture', {
			captureId: params.capture_id
		});
	}
};
