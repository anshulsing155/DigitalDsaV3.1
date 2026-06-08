/**
 * GET /dashboard/rm/policies/[lenderId]/[product]/delta
 *
 * Phase 5 Entry B — Delta parse wizard loader.
 * Loads the currently PUBLISHED policy for the RM to upload an addendum against.
 *
 * Guards:
 *   - RM must have an active assignment for this lender
 *   - A published policy must exist (nothing to diff against otherwise)
 *   - No active draft may exist (prevents collision with Entry A edit session)
 *     Per spec: pick option (a) — simplest, defer merge-on-top to a later phase
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

	// Guard: a draft already exists — RM must resolve it before starting delta parse
	// (Concurrent edit collision prevention — spec option a)
	const existingDraft = await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: 'draft' },
		{ projection: { _id: 1 } }
	);
	if (existingDraft) {
		// Redirect to the edit page so the RM can finish or discard the existing draft
		throw redirect(
			302,
			`/dashboard/rm/policies/${lenderId}/${encodeURIComponent(loanProduct)}/edit`
		);
	}

	// Load the currently published policy — this is what we diff the addendum against
	const published = (await PmsLenderPolicies.findOne(
		{ lenderId, loanProduct, status: 'published' },
		{ sort: { version: -1 } }
	)) as PolicyDocument | null;

	if (!published) {
		// No published policy yet — can't do a delta. Go back to detail page.
		throw redirect(302, `/dashboard/rm/policies/${lenderId}/${encodeURIComponent(loanProduct)}`);
	}

	return {
		lenderId,
		loanProduct,
		lenderName: lenderEntry.lenderName,
		officialBankEmail,
		policy: {
			id: published._id.toString(),
			version: published.version,
			loanProduct: published.loanProduct,
			sourceFileName: published.sourceDocument.fileName,
			// Pass sections so the delta result can show old values inline in the review step
			sections: published.sections
		}
	};
};
