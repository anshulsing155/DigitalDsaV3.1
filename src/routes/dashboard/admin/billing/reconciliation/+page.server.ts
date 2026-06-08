/**
 * GET /dashboard/admin/billing/reconciliation
 * ══════════════════════════════════════════════════════════════════
 * Admin view of daily reconciliation runs (D.1 S7). Paginated list of
 * ReconciliationRuns rows, newest first, with optional "drift only"
 * filter. The page itself renders the per-row counts; the drill-down
 * panel (rendered inline on row-expand) shows every discrepancy in
 * the selected run.
 *
 * Auth: admin-only (requireRole). Reconciliation data is operator-
 * internal and contains payment_ids + dsa_ids; never exposed to DSAs
 * or RMs.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S7 (line 430)
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { ReconciliationRuns } from '$lib/database/mongo.js';
import type { ReconciliationRunDoc } from '$lib/types/reconciliation';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'admin');

	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const driftOnly = url.searchParams.get('drift_only') === '1';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const query: Record<string, any> = {};
	if (driftOnly) {
		query.status = { $in: ['drift', 'critical_drift'] };
	}

	const [totalCount, runs] = await Promise.all([
		ReconciliationRuns.countDocuments(query),
		ReconciliationRuns.find(query)
			.sort({ run_date: -1, run_at: -1 })
			.skip((pageNum - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE)
			.toArray()
	]);

	// Serialize Dates + ObjectIds for the client. The Discrepancy union
	// already carries ISO strings; just stringify the doc-level Dates.
	const serialize = (r: ReconciliationRunDoc) => ({
		_id: r._id?.toString() ?? '',
		run_date: r.run_date,
		run_at: r.run_at.toISOString(),
		window_from: r.window_from.toISOString(),
		window_to: r.window_to.toISOString(),
		status: r.status,
		provider: r.provider,
		provider_entries: r.provider_entries,
		our_transactions: r.our_transactions,
		matched: r.matched,
		counts: r.counts,
		discrepancies: r.discrepancies,
		drift_email_sent: r.drift_email_sent
	});

	return {
		runs: runs.map(serialize),
		filters: { driftOnly },
		pagination: {
			page: pageNum,
			pageSize: PAGE_SIZE,
			totalCount,
			totalPages: Math.ceil(totalCount / PAGE_SIZE)
		}
	};
};
