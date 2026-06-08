import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { RmLenderAssignments, rmApplications } from '$lib/database/mongo.js';
import { escapeRegex } from '$lib/server/utils.js';

const PAGE_LIMIT = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin'); // throws redirect if not admin

	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const skip = (page - 1) * PAGE_LIMIT;
	const search = (url.searchParams.get('q') || '').trim();
	const statusFilter = url.searchParams.get('status') || '';
	const lenderFilter = url.searchParams.get('lender') || '';

	// Build assignment query
	const assignmentFilter: Record<string, unknown> = {};
	if (statusFilter && ['active', 'suspended', 'pending_verification'].includes(statusFilter)) {
		assignmentFilter.status = statusFilter;
	}
	if (lenderFilter) {
		assignmentFilter.lenderId = lenderFilter;
	}

	const [assignments, totalAssignments] = await Promise.all([
		RmLenderAssignments.find(assignmentFilter)
			.sort({ onboardedAt: -1 })
			.skip(skip)
			.limit(PAGE_LIMIT)
			.toArray(),
		RmLenderAssignments.countDocuments(assignmentFilter)
	]);

	// Batch-fetch RM details for the current page
	const rmUserIds = [...new Set(assignments.map((a) => a.rmUserId))];

	const searchFilter = search
		? {
				$or: [
					{ name: { $regex: escapeRegex(search), $options: 'i' } },
					{ mobileNumber: { $in: [search, Number(search)] } }
				]
			}
		: {};

	const rmDocs = await rmApplications
		.find(
			{
				...(rmUserIds.length > 0 ? { _id: { $in: rmUserIds } as any } : {}),
				...searchFilter
			} as any,
			{ projection: { name: 1, email: 1, mobileNumber: 1 } }
		)
		.toArray();

	const rmMap = new Map(rmDocs.map((r) => [String(r._id), r]));

	const now = new Date();

	const rows = assignments
		.map((a) => {
			const rm = rmMap.get(a.rmUserId);
			// If search is active and this RM wasn't matched, omit row
			if (search && !rm) return null;

			const daysUntilRenewal = Math.ceil(
				(a.nextVerificationDueBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);

			return {
				assignmentId: a._id.toString(),
				rmUserId: a.rmUserId,
				rmName: (rm?.name as string) || 'Unknown RM',
				rmEmail: (rm?.email as string) || '',
				rmPhone: String(rm?.mobileNumber || ''),
				lenderId: a.lenderId,
				lenderName: a.lenderName,
				officialBankEmail: a.officialBankEmail,
				status: a.status,
				onboardedAt: a.onboardedAt.toISOString(),
				lastVerifiedAt: a.lastMonthlyVerifiedAt.toISOString(),
				nextVerificationDueBy: a.nextVerificationDueBy.toISOString(),
				daysUntilRenewal,
				renewalOverdue: daysUntilRenewal < 0,
				renewalDueSoon: daysUntilRenewal >= 0 && daysUntilRenewal <= 7,
				suspendedAt: a.suspendedAt ? a.suspendedAt.toISOString() : null,
				suspendedReason: a.suspendedReason,
				transferredTo: a.transferredTo
			};
		})
		.filter((r) => r !== null);

	// Collect distinct lender names for the lender filter dropdown
	const distinctLenders = await RmLenderAssignments.aggregate([
		{ $group: { _id: '$lenderId', lenderName: { $first: '$lenderName' } } },
		{ $sort: { lenderName: 1 } }
	]).toArray();

	return {
		rows,
		total: search ? rows.length : totalAssignments,
		page,
		limit: PAGE_LIMIT,
		search,
		statusFilter,
		lenderFilter,
		lenders: distinctLenders.map((l) => ({ lenderId: l._id as string, lenderName: l.lenderName as string }))
	};
};
