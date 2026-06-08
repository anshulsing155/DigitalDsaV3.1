/**
 * D.1 S7 — Reconciliation document shape
 * ══════════════════════════════════════════════════════════════════
 * One row per daily reconcile cron run. Stores the per-day match
 * counts + every discrepancy detail so the admin view at
 * `/dashboard/admin/billing/reconciliation` can render a paginated
 * history with drill-down.
 *
 * Discrepancies are a discriminated union — each `kind` carries the
 * shape the admin view needs to render that case. The four kinds map
 * 1:1 to the spec §4 S7 logic checks:
 *
 *   1. missing-our-side       — provider says settled, we have no transaction
 *   2. missing-provider-side  — we have a succeeded transaction, no settlement
 *   3. amount-mismatch        — matching pair, different amounts
 *   4. unmatched-test-auth    — ₹1 verification debit > 1h old, no paired refund
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S7 (line 413)
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';

/**
 * The four discrepancy kinds the engine flags. Each carries the
 * minimal data needed to render the admin drill-down AND for an
 * operator to look the row up at the provider / in our DB.
 */
export type Discrepancy =
	| {
			kind: 'missing-our-side';
			provider_payment_id: string;
			settled_amount_paise: number;
			settled_at: string; // ISO string for serializability
			type: 'charge' | 'refund';
	  }
	| {
			kind: 'missing-provider-side';
			provider_payment_id: string;
			our_amount_paise: number;
			our_recorded_at: string;
			dsa_id: string;
	  }
	| {
			kind: 'amount-mismatch';
			provider_payment_id: string;
			settled_amount_paise: number;
			our_amount_paise: number;
			dsa_id: string;
	  }
	| {
			kind: 'unmatched-test-auth';
			provider_payment_id: string;
			our_amount_paise: number;
			our_recorded_at: string;
			age_hours: number; // age at the time of the reconcile run
			dsa_id: string;
	  };

/** Severity = drives email subject + admin badge color. */
export type ReconciliationStatus = 'clean' | 'drift' | 'critical_drift';

/**
 * Critical = anything `missing-our-side` (provider paid us, we never
 * recorded — could be silent revenue loss OR a chargeback case).
 * All other drift is "drift" (usually timing or harmless).
 */
export function severityOf(discrepancies: Discrepancy[]): ReconciliationStatus {
	if (discrepancies.length === 0) return 'clean';
	if (discrepancies.some((d) => d.kind === 'missing-our-side')) return 'critical_drift';
	return 'drift';
}

export interface ReconciliationRunDoc {
	_id?: ObjectId;
	/** ISO date string `YYYY-MM-DD` of the IST settlement-day window reconciled. */
	run_date: string;
	/** When the cron actually fired (UTC). */
	run_at: Date;
	/** [from, to] window in UTC bounding the IST calendar day. */
	window_from: Date;
	window_to: Date;
	status: ReconciliationStatus;
	/** Number of settlement entries the provider reported in this window. */
	provider_entries: number;
	/** Number of our BillingTransactions in this window. */
	our_transactions: number;
	/** Number of matched pairs (settlement entry → our transaction). */
	matched: number;
	/** Counts per discrepancy kind — convenience for the admin list. */
	counts: {
		missing_our_side: number;
		missing_provider_side: number;
		amount_mismatch: number;
		unmatched_test_auth: number;
	};
	discrepancies: Discrepancy[];
	/** Whether the drift email was dispatched (false on clean runs). */
	drift_email_sent: boolean;
	/** Provider name — for multi-provider future. */
	provider: string;
}
