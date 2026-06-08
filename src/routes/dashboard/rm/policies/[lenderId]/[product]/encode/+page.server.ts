/**
 * GET /dashboard/rm/policies/[lenderId]/[product]/encode
 * RM Encode Wizard — load or resume draft policy for AI-assisted encoding.
 *
 * Guards: RM must have an active assignment for this lender.
 * Returns: full pipelineState (pass1/pass2 data) for client-side wizard resume.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments, PmsLenderPolicies } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, ['rm', 'admin']);

	const { lenderId, product } = params;
	const loanProduct = decodeURIComponent(product) as LoanProduct;
	const userId = locals.user!.id;
	const isAdmin = locals.user!.activeRole === 'admin';

	const lenderEntry = LENDER_BY_ID.get(lenderId);
	if (!lenderEntry) throw error(404, 'Lender not found');

	// RM must have an active assignment — also retrieves their official bank email for OTP
	let officialBankEmail = '';
	if (!isAdmin) {
		const assignment = await RmLenderAssignments.findOne({
			rmUserId: userId,
			lenderId,
			status: 'active'
		});
		if (!assignment) throw error(403, 'No active assignment for this lender');
		officialBankEmail = assignment.officialBankEmail;
	}

	// Most-recent non-archived policy for this lender + product
	const policy = (await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: { $ne: 'archived' } },
		{ sort: { version: -1, createdAt: -1 } }
	)) as PolicyDocument | null;

	// Only draft policies are encodable in this wizard
	// submitted/approved/published should not be re-encoded via this route
	if (policy && policy.status !== 'draft') {
		throw error(
			422,
			'This policy is not a draft. Encoding is only available for draft policies.'
		);
	}

	return {
		lenderId,
		loanProduct,
		lenderName: lenderEntry.lenderName,
		officialBankEmail,
		policy: policy ? serializeEncodePolicy(policy) : null
	};
};

// ── Serializer ────────────────────────────────────────────────────────────────
// Returns full pipelineState data so the wizard can resume mid-session

function serializeEncodePolicy(p: PolicyDocument) {
	return {
		id: p._id.toString(),
		lockVersion: p.lockVersion,
		status: p.status,
		sourceFileName: p.sourceDocument.fileName,

		// Full pipeline state for resume — includes AI pass results
		pipelineState: p.pipelineState
			? {
					currentStep: p.pipelineState.currentStep,
					pass1Result: p.pipelineState.pass1Result,
					pass2Clauses: p.pipelineState.pass2Clauses,
					rmStep1Decisions: p.pipelineState.rmStep1Decisions,
					rmStep2Encodings: p.pipelineState.rmStep2Encodings,
					pass4LastScore: p.pipelineState.pass4LastScore,
					pass6Result: p.pipelineState.pass6Result ?? null,
					lastSavedAt: p.pipelineState.lastSavedAt.toISOString(),
					errorState: p.pipelineState.errorState
				}
			: null,

		// Existing overrides + notes (for Step 3 missed items summary)
		conditionalOverrides: p.conditionalOverrides,
		bankCardNotes: p.bankCardNotes,

		// Reconciliation status (determines if wizard step 4 is signed off)
		reconciliation: {
			status: p.reconciliation.status,
			completedAt: p.reconciliation.completedAt?.toISOString() ?? null
		},

		// AI summary stats shown in Step 5
		aiPipelineRun: p.aiPipelineRun
			? {
					finalScore: p.aiPipelineRun.finalScore,
					passesExecuted: p.aiPipelineRun.passesExecuted,
					totalTokensUsed: p.aiPipelineRun.totalTokensUsed
				}
			: null
	};
}
