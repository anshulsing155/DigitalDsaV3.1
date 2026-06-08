/**
 * Admin review page for a single PMS policy.
 * Loads the submitted policy + the current published version (if any) so the
 * review UI can diff field-by-field.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { PmsLenderPolicies } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { PolicyDocument } from '$lib/config/pms/policyTypes.js';
import { getPolicyById, PolicyNotFoundError } from '$lib/server/pms/policyService.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'admin');

	const { policyId } = params;

	let policy: PolicyDocument;
	try {
		policy = await getPolicyById(policyId);
	} catch (err) {
		if (err instanceof PolicyNotFoundError) throw error(404, 'Policy not found');
		throw err;
	}

	const lenderName = LENDER_BY_ID.get(policy.lenderId)?.lenderName ?? policy.lenderId;

	// Currently published version for diff context (null if this is the first ever)
	const published = (await PmsLenderPolicies.findOne(
		{
			lenderId: policy.lenderId,
			loanProduct: policy.loanProduct,
			status: 'published',
			_id: { $ne: policy._id }
		},
		{ sort: { version: -1 } }
	)) as PolicyDocument | null;

	return {
		lenderName,
		policy: serializeReviewPolicy(policy),
		publishedSnapshot: published
			? {
					version: published.version,
					sections: published.sections,
					conditionalOverrides: published.conditionalOverrides,
					publishedAt: published.publishedAt?.toISOString() ?? null
				}
			: null
	};
};

function serializeReviewPolicy(p: PolicyDocument) {
	return {
		id: p._id.toString(),
		lenderId: p.lenderId,
		loanProduct: p.loanProduct,
		version: p.version,
		status: p.status,
		lockVersion: p.lockVersion,
		sections: p.sections,
		conditionalOverrides: p.conditionalOverrides.map((o) => ({
			...o,
			addedAt: o.addedAt.toISOString(),
			conflictCheck: o.conflictCheck
				? { ...o.conflictCheck, ranAt: o.conflictCheck.ranAt.toISOString() }
				: null
		})),
		bankCardNotes: p.bankCardNotes.map((n) => ({ ...n, addedAt: n.addedAt.toISOString() })),
		pendingChanges: (p.pendingChanges ?? []).map((pc) => ({
			...pc,
			changedAt: pc.changedAt.toISOString(),
			rmAcknowledgedAt: pc.rmAcknowledgedAt ? pc.rmAcknowledgedAt.toISOString() : null
		})),
		adminClauseComments: p.adminClauseComments,
		adminRejectionNote: p.adminRejectionNote,
		adminRejectedAt: p.adminRejectedAt ? p.adminRejectedAt.toISOString() : null,
		pipelineState: p.pipelineState
			? {
					currentStep: p.pipelineState.currentStep,
					pass2Clauses: p.pipelineState.pass2Clauses,
					rmStep1Decisions: p.pipelineState.rmStep1Decisions,
					rmStep2Encodings: p.pipelineState.rmStep2Encodings,
					pass4LastScore: p.pipelineState.pass4LastScore,
					pass6Result: p.pipelineState.pass6Result ?? null
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
		sourceFileName: p.sourceDocument.fileName,
		submittedBy: p.submittedBy,
		submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
		reconciliation: {
			status: p.reconciliation.status,
			completedAt: p.reconciliation.completedAt?.toISOString() ?? null
		},
		legacyComparison: p.legacyComparison
			? {
					comparedAt: p.legacyComparison.comparedAt.toISOString(),
					discrepancies: p.legacyComparison.discrepancies,
					resolvedAt: p.legacyComparison.resolvedAt?.toISOString() ?? null,
					resolvedBy: p.legacyComparison.resolvedBy
				}
			: null,
		qaRun: p.qaRun
			? {
					ranAt: p.qaRun.ranAt.toISOString(),
					totalProfiles: p.qaRun.totalProfiles,
					testedProfiles: p.qaRun.testedProfiles,
					changedProfiles: p.qaRun.changedProfiles,
					flippedEligibility: p.qaRun.flippedEligibility,
					hadBaseline: p.qaRun.hadBaseline,
					results: p.qaRun.results
				}
			: null
	};
}
