import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { LENDER_DIRECTORY } from '$lib/config/lenderPolicies/lenderDirectory.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, ['rm', 'admin']);

	const rmUserId = locals.user!.id;

	// Fetch RM's existing assignments to grey out already-assigned lenders
	const existingAssignments = await RmLenderAssignments.find({
		rmUserId,
		status: 'active'
	}).toArray();

	const assignedLenderIds = new Set(existingAssignments.map((a) => a.lenderId));

	// Build lender list for Step 1 picker
	const lenders = LENDER_DIRECTORY.map((l) => ({
		lenderId: l.lenderId,
		lenderName: l.lenderName,
		classification: l.classification,
		officialEmailDomain: l.officialEmailDomain ?? null,
		dsaChannelAvailable: l.dsaChannelAvailable,
		alreadyAssigned: assignedLenderIds.has(l.lenderId)
	}));

	// Pre-fill from query params (e.g. when coming from renewal reminder)
	const preselectedLenderId = url.searchParams.get('lenderId') ?? null;
	const purpose = url.searchParams.get('purpose') ?? 'onboarding';

	return { lenders, preselectedLenderId, purpose };
};
