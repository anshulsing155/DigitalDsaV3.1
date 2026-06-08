/**
 * GET /dashboard/rm/policies/[lenderId]/[product]/suggestions
 * RM suggestion inbox — DSA-submitted policy feedback for a specific lender/product.
 *
 * Guards: RM must have an active assignment for the lender (admin bypasses).
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments, PolicySuggestions } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';
import type { LoanProduct } from '$lib/config/lenderPolicies/types.js';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	requireRole(locals, ['rm', 'admin']);

	const { lenderId, product } = params;
	const loanProduct = decodeURIComponent(product) as LoanProduct;
	const userId = locals.user!.id;
	const isAdmin = locals.user!.activeRole === 'admin';

	// RM must have active assignment for this lender (admin bypasses)
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

	// Which status tab to show (default: pending)
	const statusFilter = (url.searchParams.get('status') ?? 'pending') as
		| 'pending'
		| 'accepted'
		| 'dismissed';

	const suggestions = await PolicySuggestions.find(
		{ lenderId, loanProduct, status: statusFilter },
		{ sort: { submittedAt: -1 }, limit: 100 }
	).toArray();

	// Serialize for JSON transport
	const serializedSuggestions = suggestions.map((s) => ({
		id: s._id.toString(),
		fieldPath: s.fieldPath,
		currentValue: s.currentValue,
		suggestedValue: s.suggestedValue,
		dsaNote: s.dsaNote,
		caseReference: s.caseReference,
		branchCity: s.branchCity,
		status: s.status,
		reviewedBy: s.reviewedBy,
		reviewNote: s.reviewNote,
		submittedBy: s.submittedBy,
		submittedAt: s.submittedAt.toISOString()
	}));

	// Count by status for the tab badges
	const [pendingCount, acceptedCount, dismissedCount] = await Promise.all([
		PolicySuggestions.countDocuments({ lenderId, loanProduct, status: 'pending' }),
		PolicySuggestions.countDocuments({ lenderId, loanProduct, status: 'accepted' }),
		PolicySuggestions.countDocuments({ lenderId, loanProduct, status: 'dismissed' })
	]);

	return {
		lenderId,
		lenderName: lenderEntry.lenderName,
		loanProduct,
		statusFilter,
		suggestions: serializedSuggestions,
		counts: { pending: pendingCount, accepted: acceptedCount, dismissed: dismissedCount }
	};
};
