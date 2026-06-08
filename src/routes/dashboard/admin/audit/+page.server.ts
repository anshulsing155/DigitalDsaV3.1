import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { PolicyAuditLogs, Lenders } from '$lib/database/mongo.js';
import { escapeRegex } from '$lib/server/utils.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin');

	// Parse filter params from URL
	const actor = url.searchParams.get('actor') || '';
	const action = url.searchParams.get('action') || '';
	const targetType = url.searchParams.get('target_type') || '';
	const lenderId = url.searchParams.get('lender_id') || '';
	const dateFrom = url.searchParams.get('date_from') || '';
	const dateTo = url.searchParams.get('date_to') || '';
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const pageSize = 50;

	// Build MongoDB query
	const query: Record<string, unknown> = {};
	if (actor) query['actor_name'] = { $regex: escapeRegex(actor), $options: 'i' };
	if (action) query['action'] = action;
	if (targetType) query['target_type'] = targetType;
	if (lenderId) {
		// Match target_id containing the lender_id (most targets have lender as prefix)
		query['$or'] = [
			{ target_id: { $regex: escapeRegex(lenderId), $options: 'i' } },
			{ 'details.lender_id': lenderId }
		];
	}
	if (dateFrom || dateTo) {
		const dateFilter: Record<string, Date> = {};
		if (dateFrom) dateFilter['$gte'] = new Date(dateFrom);
		if (dateTo) {
			const end = new Date(dateTo);
			end.setHours(23, 59, 59, 999);
			dateFilter['$lte'] = end;
		}
		query['created_at'] = dateFilter;
	}

	// Parallel: count + paginated results + lender list for filter dropdown
	const [totalCount, entries, lenders] = await Promise.all([
		PolicyAuditLogs.countDocuments(query),
		PolicyAuditLogs.find(query)
			.sort({ created_at: -1 })
			.skip((pageNum - 1) * pageSize)
			.limit(pageSize)
			.toArray(),
		Lenders.find({ status: 'active' })
			.project({ lender_id: 1, lender_name: 1 })
			.sort({ lender_name: 1 })
			.toArray()
	]);

	return {
		entries: entries.map((e) => ({
			_id: e._id.toString(),
			target_type: e.target_type,
			target_id: e.target_id,
			action: e.action,
			actor_id: e.actor_id,
			actor_name: e.actor_name,
			actor_role: e.actor_role,
			details: e.details || {},
			created_at: e.created_at ? new Date(e.created_at).toISOString() : null
		})),
		lenders: lenders.map((l) => ({
			lender_id: l.lender_id,
			lender_name: l.lender_name
		})),
		filters: { actor, action, targetType, lenderId, dateFrom, dateTo },
		pagination: {
			page: pageNum,
			pageSize,
			totalCount,
			totalPages: Math.ceil(totalCount / pageSize)
		}
	};
};
