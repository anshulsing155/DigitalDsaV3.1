/**
 * GET /dashboard/rm/policies/[lenderId]/[product]/edit
 *
 * Phase 5 RM edit mode — loads the active draft revision for post-publish edits.
 * The draft is created by POST /api/pms/policies/[id]/revise which forks the
 * published policy; this page never fork-creates — if no draft exists the RM
 * is redirected back to the detail page to start a revision.
 *
 * Guards: RM must have an active assignment for this lender.
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
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

	// RM must have an active assignment — also pulls official bank email for OTP submit
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

	// Look for an active draft revision. Spec invariant: only one draft per
	// (lenderId, loanProduct) at a time, so we take the most recent.
	const draft = (await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: 'draft' },
		{ sort: { createdAt: -1 } }
	)) as PolicyDocument | null;

	// No draft → RM must start a revision from the detail page first
	if (!draft) {
		throw redirect(302, `/dashboard/rm/policies/${lenderId}/${encodeURIComponent(loanProduct)}`);
	}

	// Also load the currently-published policy so we can show "was → now" hints
	// on fields the RM has edited. Optional — null if this is the first-ever version.
	const published = (await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: 'published' },
		{ sort: { version: -1 } }
	)) as PolicyDocument | null;

	return {
		lenderId,
		loanProduct,
		lenderName: lenderEntry.lenderName,
		officialBankEmail,
		draft: serializeEditPolicy(draft),
		publishedSnapshot: published
			? {
					version: published.version,
					sections: published.sections,
					publishedAt: published.publishedAt?.toISOString() ?? null
				}
			: null
	};
};

// ── Serializer ────────────────────────────────────────────────────────────────

function serializeEditPolicy(p: PolicyDocument) {
	return {
		id: p._id.toString(),
		lockVersion: p.lockVersion,
		status: p.status,
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
		sourceFileName: p.sourceDocument.fileName,
		createdAt: p.createdAt.toISOString(),
		reconciliation: {
			status: p.reconciliation.status,
			completedAt: p.reconciliation.completedAt?.toISOString() ?? null
		}
	};
}
