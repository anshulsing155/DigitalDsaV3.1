/**
 * Pure helpers for the DSA dashboard "Needs Attention" panel.
 *
 * Extracted from `dashboard/dsa/+page.server.ts` for C.8: pre-fix the
 * computation emitted one item per (lender_application × query) per case,
 * which produced 5 identical "Home Loan — stuck 86 days" rows when a single
 * case had five lender applications with open queries. Post-fix:
 *
 *   - One `open_query` item per case (worst-pending wins; description
 *     summarises "N open queries from M lenders").
 *   - One `expiring_document` item per case (most-urgent wins; description
 *     names the count when >1).
 *   - One `stuck_stage` item per case (unchanged — already one per case).
 *
 * The function is side-effect-free and tested in dsaAttentionItems.test.ts.
 */

import type { Case, CaseStage } from '$lib/types/case';

export interface AttentionItem {
	type: 'open_query' | 'expiring_document' | 'stuck_stage';
	case_id: string;
	label: string;
	/** Primary applicant full name (DSA view) — populated by the load function
	 *  after computation via snapshot decrypt (B.4). */
	applicant_name?: string;
	description: string;
	severity: 'warning' | 'critical';
	days: number;
	stage: CaseStage;
	stage_label: string;
}

export const STAGE_LABELS: Record<CaseStage, string> = {
	quota_blocked: 'Awaiting Processing',
	intake: 'Intake',
	profiling: 'Profiling',
	file_building: 'Documents',
	submitted: 'Submitted',
	processing: 'Under Review',
	query: 'Query',
	sanctioned: 'Sanctioned',
	disbursed: 'Disbursed',
	rejected: 'Rejected',
	dropped: 'Dropped',
	closed: 'Closed'
};

export const OPEN_QUERY_WARNING_DAYS = 5;
export const OPEN_QUERY_CRITICAL_DAYS = 10;
export const EXPIRING_DOC_WARNING_DAYS = 7;
export const EXPIRING_DOC_CRITICAL_DAYS = 3;
export const STUCK_STAGE_WARNING_DAYS = 10;
export const STUCK_STAGE_CRITICAL_DAYS = 21;

/** Maximum items returned — prevents dashboard noise when many cases are stale. */
export const MAX_ATTENTION_ITEMS = 8;

export interface ComputeOptions {
	/** Override "now" for deterministic tests. Defaults to current time. */
	now?: Date;
	/** Cap on returned items. Defaults to MAX_ATTENTION_ITEMS. */
	maxItems?: number;
}

export function computeAttentionItems(
	cases: Case[],
	options: ComputeOptions = {}
): AttentionItem[] {
	const now = options.now ?? new Date();
	const maxItems = options.maxItems ?? MAX_ATTENTION_ITEMS;
	const items: AttentionItem[] = [];

	for (const c of cases) {
		// Skip terminal stages and sample/demo cases (sample data is always stale)
		if (['closed', 'dropped', 'rejected', 'disbursed'].includes(c.stage)) continue;
		if (c.is_sample) continue;

		// 1. Open queries — dedup at the case level. Pre-C.8 this emitted one
		//    row per (lender_application × query); 5 lenders with open queries
		//    on one case = 5 identical rows. Now: tally per case, pick the
		//    worst-pending days, summarise lender count.
		let worstQueryDays = -1;
		const lendersWithOpenQueries = new Set<string>();
		let openQueryCount = 0;
		for (const la of c.lender_applications) {
			let lenderHasOpenQuery = false;
			for (const q of la.queries) {
				if (q.status !== 'open') continue;
				const raisedAt = new Date(q.raised_at);
				const daysOpen = Math.floor((now.getTime() - raisedAt.getTime()) / (1000 * 60 * 60 * 24));
				if (daysOpen >= OPEN_QUERY_WARNING_DAYS) {
					openQueryCount += 1;
					if (daysOpen > worstQueryDays) worstQueryDays = daysOpen;
					lenderHasOpenQuery = true;
				}
			}
			if (lenderHasOpenQuery) lendersWithOpenQueries.add(la.lender_name);
		}
		if (worstQueryDays >= 0) {
			const lenderArr = Array.from(lendersWithOpenQueries);
			const description =
				openQueryCount === 1
					? `Open query from ${lenderArr[0]} — ${worstQueryDays} days pending`
					: lenderArr.length === 1
						? `${openQueryCount} open queries from ${lenderArr[0]} — ${worstQueryDays} days pending`
						: `${openQueryCount} open queries from ${lenderArr.length} lenders — ${worstQueryDays} days pending`;
			items.push({
				type: 'open_query',
				case_id: c.case_id,
				label: c.label,
				description,
				severity: worstQueryDays >= OPEN_QUERY_CRITICAL_DAYS ? 'critical' : 'warning',
				days: worstQueryDays,
				stage: c.stage,
				stage_label: STAGE_LABELS[c.stage]
			});
		}

		// 2. Expiring documents — dedup at the case level. Most-urgent doc wins
		//    the description; count surfaces when >1.
		let mostUrgentDays = Infinity;
		let mostUrgentDocName = '';
		let expiringDocCount = 0;
		for (const la of c.lender_applications) {
			for (const doc of la.document_checklist) {
				if (!doc.validity?.valid_until) continue;
				const expiry = new Date(doc.validity.valid_until);
				const daysUntilExpiry = Math.floor(
					(expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
				);
				if (daysUntilExpiry <= EXPIRING_DOC_WARNING_DAYS && daysUntilExpiry >= 0) {
					expiringDocCount += 1;
					if (daysUntilExpiry < mostUrgentDays) {
						mostUrgentDays = daysUntilExpiry;
						mostUrgentDocName = doc.doc_name;
					}
				}
			}
		}
		if (expiringDocCount > 0) {
			const daySuffix = mostUrgentDays === 1 ? '' : 's';
			const description =
				expiringDocCount === 1
					? `${mostUrgentDocName} expires in ${mostUrgentDays} day${daySuffix}`
					: `${mostUrgentDocName} (+${expiringDocCount - 1} more) expires in ${mostUrgentDays} day${daySuffix}`;
			items.push({
				type: 'expiring_document',
				case_id: c.case_id,
				label: c.label,
				description,
				severity: mostUrgentDays <= EXPIRING_DOC_CRITICAL_DAYS ? 'critical' : 'warning',
				days: mostUrgentDays,
				stage: c.stage,
				stage_label: STAGE_LABELS[c.stage]
			});
		}

		// 3. Cases stuck in same stage for an unusually long time (already one
		//    per case — no dedup needed).
		const transitionDate =
			c.stage_history.length > 0
				? new Date(c.stage_history[c.stage_history.length - 1].timestamp)
				: new Date(c.created_at);
		const daysInStage = Math.floor(
			(now.getTime() - transitionDate.getTime()) / (1000 * 60 * 60 * 24)
		);
		if (daysInStage >= STUCK_STAGE_WARNING_DAYS) {
			items.push({
				type: 'stuck_stage',
				case_id: c.case_id,
				label: c.label,
				description: `Stuck in "${STAGE_LABELS[c.stage]}" for ${daysInStage} days`,
				severity: daysInStage >= STUCK_STAGE_CRITICAL_DAYS ? 'critical' : 'warning',
				days: daysInStage,
				stage: c.stage,
				stage_label: STAGE_LABELS[c.stage]
			});
		}
	}

	// Sort by severity (critical first), then by days descending.
	items.sort((a, b) => {
		if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
		return b.days - a.days;
	});

	return items.slice(0, maxItems);
}
