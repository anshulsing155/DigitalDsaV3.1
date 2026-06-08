/**
 * GET /dashboard/rm/policies/[lenderId]/[product]
 * RM policy detail page — wizard entry point for Phase 4 encoding.
 *
 * Loads the most-recent non-archived policy for the given (lenderId, loanProduct).
 * Guards: RM must have an active assignment for the lender.
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, ['rm', 'admin']);

	const { lenderId, product } = params;
	const loanProduct = decodeURIComponent(product) as LoanProduct;
	const userId = locals.user!.id;
	const isAdmin = locals.user!.activeRole === 'admin';

	// RM must have active assignment for this lender
	if (!isAdmin) {
		const assignment = await RmLenderAssignments.findOne({
			rmUserId: userId,
			lenderId,
			status: 'active'
		});
		if (!assignment) {
			throw error(403, 'No active assignment for this lender');
		}
	}

	const lenderEntry = LENDER_BY_ID.get(lenderId);
	if (!lenderEntry) throw error(404, 'Lender not found');

	// Most-recent non-archived policy for this (lenderId, loanProduct)
	const policy = (await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: { $ne: 'archived' } },
		{ sort: { version: -1, createdAt: -1 } }
	)) as PolicyDocument | null;

	// If no policy and user is RM, redirect to the create flow
	if (!policy && !isAdmin) {
		redirect(302, `/dashboard/rm/policies?noPolicy=${encodeURIComponent(loanProduct)}`);
	}

	return {
		lenderId,
		loanProduct,
		lenderName: lenderEntry.lenderName,
		policy: policy ? serializePolicy(policy) : null
	};
};

// ── Serializer ────────────────────────────────────────────────────────────────

function serializePolicy(p: PolicyDocument) {
	return {
		id: p._id.toString(),
		lenderId: p.lenderId,
		loanProduct: p.loanProduct,
		version: p.version,
		status: p.status,
		lockVersion: p.lockVersion,
		validFrom: p.validFrom.toISOString(),
		validTo: p.validTo?.toISOString() ?? null,

		// Pipeline progress
		pipelineState: p.pipelineState
			? {
					currentStep: p.pipelineState.currentStep,
					lastSavedAt: p.pipelineState.lastSavedAt.toISOString(),
					errorState: p.pipelineState.errorState ?? null
				}
			: null,

		aiPipelineRun: p.aiPipelineRun
			? {
					mode: p.aiPipelineRun.mode,
					finalScore: p.aiPipelineRun.finalScore,
					passesExecuted: p.aiPipelineRun.passesExecuted,
					totalTokensUsed: p.aiPipelineRun.totalTokensUsed,
					ranAt: p.aiPipelineRun.ranAt.toISOString()
				}
			: null,

		// Source document
		sourceFileName: p.sourceDocument.fileName,
		uploadedAt: p.sourceDocument.uploadedAt.toISOString(),

		// Submission audit trail
		submittedAt: p.submittedAt?.toISOString() ?? null,
		approvedAt: p.approvedAt?.toISOString() ?? null,
		scheduledPublishAt: p.scheduledPublishAt?.toISOString() ?? null,
		publishedAt: p.publishedAt?.toISOString() ?? null,

		// Admin feedback
		adminRejectionNote: p.adminRejectionNote ?? null,
		adminRejectedAt: p.adminRejectedAt?.toISOString() ?? null,
		adminClauseCommentCount: p.adminClauseComments?.length ?? 0,

		// Override counts
		overrideCount: p.conditionalOverrides.length,
		bankCardNoteCount: p.bankCardNotes.length,

		// Timestamps
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString()
	};
}
