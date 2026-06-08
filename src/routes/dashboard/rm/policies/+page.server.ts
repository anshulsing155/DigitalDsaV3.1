import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments } from '$lib/database/mongo.js';
import { LENDER_BY_ID } from '$lib/config/lenderPolicies/lenderDirectory.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, ['rm', 'admin']);

	const rmUserId = locals.user!.id;

	const assignments = await RmLenderAssignments.find({ rmUserId })
		.sort({ onboardedAt: -1 })
		.toArray();

	const now = new Date();

	const enrichedAssignments = assignments.map((a) => {
		const lender = LENDER_BY_ID.get(a.lenderId);
		const daysUntilRenewal = Math.ceil(
			(a.nextVerificationDueBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		);

		return {
			id: a._id.toString(),
			lenderId: a.lenderId,
			lenderName: a.lenderName,
			lenderClassification: lender?.classification ?? null,
			officialBankEmail: a.officialBankEmail,
			status: a.status,
			onboardedAt: a.onboardedAt.toISOString(),
			// C.2: surface the canonical last-verified stamp so the row badge
			// can show "Verified 2mo ago" instead of a meaningless static
			// "Verified" chip. The field is already written at onboard +
			// monthly_renewal; previously just not projected.
			lastVerifiedAt: a.lastMonthlyVerifiedAt
				? a.lastMonthlyVerifiedAt.toISOString()
				: null,
			nextVerificationDueBy: a.nextVerificationDueBy.toISOString(),
			daysUntilRenewal,
			renewalOverdue: daysUntilRenewal < 0,
			renewalDueSoon: daysUntilRenewal >= 0 && daysUntilRenewal <= 7
		};
	});

	return { assignments: enrichedAssignments };
};
