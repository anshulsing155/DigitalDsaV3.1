import type { PageServerLoad } from './$types.js';
import { requireRole, requireAdminPermissionPage } from '$lib/server/guards.js';
import { QaScenarios } from '$lib/database/mongo.js';

// Canonical display order
const LOAN_TYPE_ORDER = [
	'Home Loan',
	'Loan Against Property',
	'Plot Loan',
	'Personal Loan',
	'Business Loan',
	'Professional Loan'
];

const EMPLOYMENT_ORDER = [
	'Salaried',
	'Self-Employed',
	'Self-Employed Professional',
	'CA',
	'Doctor',
	'Lawyer',
	'Architect',
	'Pensioner',
	'NRI'
];

export interface CoverageCell {
	loanType: string;
	employment: string;
	total: number;
	pass: number;
	fail: number;
	warning: number;
	neverRun: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	requireAdminPermissionPage(locals, 'qa_view');

	// Aggregate coverage counts per loan type × employment combination
	const rawCells = await QaScenarios.aggregate<{
		_id: { loanType: string; employment: string };
		total: number;
		pass: number;
		fail: number;
		warning: number;
		neverRun: number;
	}>([
		{ $match: { isArchived: { $ne: true } } },
		{
			$group: {
				_id: { loanType: '$meta.loanType', employment: '$meta.employment' },
				total: { $sum: 1 },
				pass: { $sum: { $cond: [{ $eq: ['$lastRunResult', 'pass'] }, 1, 0] } },
				fail: { $sum: { $cond: [{ $eq: ['$lastRunResult', 'fail'] }, 1, 0] } },
				warning: { $sum: { $cond: [{ $eq: ['$lastRunResult', 'warning'] }, 1, 0] } },
				neverRun: { $sum: { $cond: [{ $eq: ['$lastRunResult', null] }, 1, 0] } }
			}
		}
	]).toArray();

	// Collect all loan types and employment types present in data
	const loanTypesInData = [...new Set(rawCells.map(c => c._id.loanType))];
	const employmentsInData = [...new Set(rawCells.map(c => c._id.employment))];

	// Merge canonical order with any extra values found in data
	const loanTypes = [
		...LOAN_TYPE_ORDER.filter(l => loanTypesInData.includes(l)),
		...loanTypesInData.filter(l => !LOAN_TYPE_ORDER.includes(l)).sort()
	];
	const employments = [
		...EMPLOYMENT_ORDER.filter(e => employmentsInData.includes(e)),
		...employmentsInData.filter(e => !EMPLOYMENT_ORDER.includes(e)).sort()
	];

	// Build lookup map for O(1) cell access
	const cellMap = new Map<string, CoverageCell>();
	for (const row of rawCells) {
		const key = `${row._id.loanType}|${row._id.employment}`;
		cellMap.set(key, {
			loanType: row._id.loanType,
			employment: row._id.employment,
			total: row.total,
			pass: row.pass,
			fail: row.fail,
			warning: row.warning,
			neverRun: row.neverRun
		});
	}

	// Totals per loan type (row totals)
	const rowTotals: Record<string, { total: number; pass: number; fail: number; warning: number; neverRun: number }> = {};
	for (const lt of loanTypes) {
		rowTotals[lt] = { total: 0, pass: 0, fail: 0, warning: 0, neverRun: 0 };
	}
	for (const cell of rawCells) {
		const lt = cell._id.loanType;
		if (rowTotals[lt]) {
			rowTotals[lt].total += cell.total;
			rowTotals[lt].pass += cell.pass;
			rowTotals[lt].fail += cell.fail;
			rowTotals[lt].warning += cell.warning;
			rowTotals[lt].neverRun += cell.neverRun;
		}
	}

	// Overall stats
	const overall = { total: 0, pass: 0, fail: 0, warning: 0, neverRun: 0 };
	for (const row of rawCells) {
		overall.total += row.total;
		overall.pass += row.pass;
		overall.fail += row.fail;
		overall.warning += row.warning;
		overall.neverRun += row.neverRun;
	}

	return {
		loanTypes,
		employments,
		cells: Object.fromEntries(cellMap),
		rowTotals,
		overall
	};
};
