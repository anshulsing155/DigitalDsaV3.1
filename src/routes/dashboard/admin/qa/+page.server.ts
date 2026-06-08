import type { PageServerLoad } from './$types.js';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { QaScenarios } from '$lib/database/mongo.js';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'qa_view');

	const loanType = url.searchParams.get('loanType') ?? '';
	const employment = url.searchParams.get('employment') ?? '';
	const result = url.searchParams.get('result') ?? '';
	const tag = url.searchParams.get('tag') ?? '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const skip = (page - 1) * PAGE_SIZE;

	const filter: Record<string, unknown> = { isArchived: false };
	if (loanType) filter['meta.loanType'] = loanType;
	if (employment) filter['meta.employment'] = employment;
	if (result === 'never') filter['lastRunResult'] = null;
	else if (result) filter['lastRunResult'] = result;
	if (tag) filter['meta.tags'] = tag;

	const [scenarios, total, summaryStats] = await Promise.all([
		QaScenarios.find(filter, {
			projection: {
				autoName: 1, testerNote: 1, meta: 1,
				lastRunAt: 1, lastRunResult: 1,
				createdAt: 1, isArchived: 1
			}
		})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(PAGE_SIZE)
			.toArray(),
		QaScenarios.countDocuments(filter),
		// Summary counts for the stats bar — always across all non-archived scenarios
		QaScenarios.aggregate([
			{ $match: { isArchived: false } },
			{ $group: { _id: '$lastRunResult', count: { $sum: 1 } } }
		]).toArray()
	]);

	// Tally stats by result
	const stats = { total: 0, pass: 0, fail: 0, warning: 0, neverRun: 0 };
	for (const row of summaryStats) {
		const count = row.count as number;
		stats.total += count;
		if (row._id === 'pass') stats.pass = count;
		else if (row._id === 'fail') stats.fail = count;
		else if (row._id === 'warning') stats.warning = count;
		else if (row._id === null) stats.neverRun = count;
	}

	// Derive available filter options from existing scenarios (distinct values)
	const [loanTypes, employmentTypes] = await Promise.all([
		QaScenarios.distinct('meta.loanType', { isArchived: false }),
		QaScenarios.distinct('meta.employment', { isArchived: false })
	]);

	return {
		scenarios: scenarios.map((s) => ({
			...s,
			_id: s._id!.toString(),
			createdAt: s.createdAt.toISOString(),
			lastRunAt: s.lastRunAt?.toISOString() ?? null
		})),
		pagination: {
			page,
			total,
			totalPages: Math.ceil(total / PAGE_SIZE),
			pageSize: PAGE_SIZE
		},
		filters: { loanType, employment, result, tag },
		filterOptions: {
			loanTypes: loanTypes.sort(),
			employmentTypes: employmentTypes.sort()
		},
		stats
	};
};
