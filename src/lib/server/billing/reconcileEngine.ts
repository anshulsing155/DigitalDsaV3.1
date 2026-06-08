/**
 * D.1 S7 — Reconciliation engine
 * ══════════════════════════════════════════════════════════════════
 * Pure matching logic. Takes the provider's settlement entries for a
 * given IST settlement day + our BillingTransactions in the same
 * window, returns a {matched, discrepancies} report. No DB writes.
 *
 * The cron at `/api/cron/billing-reconcile/+server.ts` wraps this with
 * the provider fetch + the DB load + the ReconciliationRuns insert +
 * the admin email.
 *
 * Matching algorithm:
 *   1. For every settlement entry (settled_payment from provider):
 *      a. Look up the matching BillingTransaction by provider_payment_id
 *      b. amounts equal → matched, drop from pending set
 *      c. amounts differ → 'amount-mismatch' discrepancy
 *      d. no match in our DB → 'missing-our-side' discrepancy (CRITICAL)
 *   2. For every BillingTransaction NOT matched in step 1:
 *      a. If it's part of a ₹1 auth-pair (debit + refund within 1h on
 *         the same dsa_id) → silently dropped (real-money-movement zero)
 *      b. If it's an unmatched ₹1 debit > 1h old → 'unmatched-test-auth'
 *         (refund failed at provider, operator alert)
 *      c. Otherwise → 'missing-provider-side' (likely timing, settlement
 *         not yet posted; the next day's run will catch this)
 *
 * IST settlement day = [00:00 IST, 23:59:59.999 IST] in the underlying
 * UTC math. The caller (cron) computes the window from the run timestamp
 * and passes it in; engine only needs the timestamp + the data.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S7 (line 413) + §11.1
 * ══════════════════════════════════════════════════════════════════
 */

import type {
	BillingTransactionDoc,
	RecurringBillingTransactionDoc
} from '$lib/types/billingSubscription';
import type { SettlementEntry } from './providers/BillingProvider';
import type { Discrepancy } from '$lib/types/reconciliation';

/** ₹1 verification amount in paise (§11.1). */
export const VERIFICATION_AMOUNT_PAISE = 100;
/** Window inside which a ₹1 debit is expected to be paired with its refund. */
export const TEST_AUTH_PAIR_WINDOW_MS = 60 * 60 * 1000;

export interface ReconcileInput {
	settlements: SettlementEntry[];
	transactions: BillingTransactionDoc[];
	now: Date;
}

export interface ReconcileResult {
	provider_entries: number;
	our_transactions: number;
	matched: number;
	discrepancies: Discrepancy[];
	counts: {
		missing_our_side: number;
		missing_provider_side: number;
		amount_mismatch: number;
		unmatched_test_auth: number;
	};
}

/**
 * Normalize a BillingTransaction (legacy OR recurring) to the fields
 * the engine needs. Legacy rows had `amount` in rupees + `razorpay_payment_id`;
 * recurring rows have `amount_paise` + `provider_payment_id`.
 */
interface NormalizedTx {
	id: string; // mongo _id stringified
	dsa_id: string;
	provider_payment_id: string | null;
	amount_paise: number;
	created_at: Date;
	/** True for charge rows (kind=recurring_charge / webhook_confirmation / legacy). */
	is_charge: boolean;
	/**
	 * v1 there are no explicit refund rows in BillingTransactions for D.1
	 * recurring (D.3 will add them). The ₹1 auth pair is the only refund
	 * we expect to see today; even THOSE aren't written today (the
	 * provider handles auth+refund opaquely in the registration flow).
	 * We mark a row as a refund if its status is 'refunded' OR if a
	 * future D.3 row carries an explicit refund discriminator.
	 */
	is_refund: boolean;
	/** Original transaction this refund refunds — null for charges. */
	refund_of_payment_id: string | null;
}

function normalizeTx(tx: BillingTransactionDoc): NormalizedTx {
	if ('kind' in tx && (tx.kind === 'recurring_charge' || tx.kind === 'webhook_confirmation')) {
		const r = tx as RecurringBillingTransactionDoc;
		return {
			id: r._id?.toString() ?? '',
			dsa_id: r.dsa_id.toString(),
			provider_payment_id: r.provider_payment_id ?? null,
			amount_paise: r.amount_paise,
			created_at: r.created_at,
			is_charge: r.status === 'succeeded',
			is_refund: false,
			refund_of_payment_id: null
		};
	}
	// Legacy / cancelled row.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const l = tx as any;
	const amountPaise =
		typeof l.amount_paise === 'number'
			? l.amount_paise
			: Math.round((l.amount ?? 0) * 100);
	return {
		id: l._id?.toString() ?? '',
		dsa_id: l.dsa_id.toString(),
		provider_payment_id: l.razorpay_payment_id ?? null,
		amount_paise: amountPaise,
		created_at: l.created_at,
		is_charge: l.status === 'completed' || l.status === 'succeeded',
		is_refund: l.status === 'refunded',
		refund_of_payment_id: null
	};
}

/**
 * Pair a ₹1 debit with its expected ₹1 refund (same dsa_id, within 1h).
 * Returns the set of debit IDs that have a matched refund and can be
 * silently dropped from the missing-provider-side check.
 *
 * Heuristic — same-DSA + same-amount + within 1h. v1 doesn't carry an
 * explicit refund→original linkage in BillingTransactions (no D.3 yet),
 * so we lean on this proxy. When D.3 lands with refund_of_payment_id
 * stamped, swap to exact ID matching.
 */
function findTestAuthPairs(txs: NormalizedTx[]): Set<string> {
	const debits = txs.filter(
		(t) => t.is_charge && t.amount_paise === VERIFICATION_AMOUNT_PAISE
	);
	const refunds = txs.filter(
		(t) => t.is_refund && t.amount_paise === VERIFICATION_AMOUNT_PAISE
	);

	const pairedDebitIds = new Set<string>();
	const usedRefundIds = new Set<string>();

	for (const debit of debits) {
		for (const refund of refunds) {
			if (usedRefundIds.has(refund.id)) continue;
			if (refund.dsa_id !== debit.dsa_id) continue;
			const deltaMs = Math.abs(refund.created_at.getTime() - debit.created_at.getTime());
			if (deltaMs <= TEST_AUTH_PAIR_WINDOW_MS) {
				pairedDebitIds.add(debit.id);
				usedRefundIds.add(refund.id);
				break;
			}
		}
	}
	return pairedDebitIds;
}

/** Main entry point. Pure: no Date.now(), no DB, no I/O. */
export function reconcileSettlements(input: ReconcileInput): ReconcileResult {
	const { settlements, transactions, now } = input;

	const normalized = transactions.map(normalizeTx);

	// Index our transactions by provider_payment_id for O(1) lookup.
	const ourByPaymentId = new Map<string, NormalizedTx>();
	for (const tx of normalized) {
		if (tx.provider_payment_id) {
			ourByPaymentId.set(tx.provider_payment_id, tx);
		}
	}

	const matchedPaymentIds = new Set<string>();
	const discrepancies: Discrepancy[] = [];

	// ── Pass 1: walk settlement entries ──
	for (const entry of settlements) {
		const ourTx = ourByPaymentId.get(entry.provider_payment_id);
		if (!ourTx) {
			discrepancies.push({
				kind: 'missing-our-side',
				provider_payment_id: entry.provider_payment_id,
				settled_amount_paise: entry.amount_paise,
				settled_at: entry.settled_at.toISOString(),
				type: entry.type
			});
			continue;
		}
		if (ourTx.amount_paise !== entry.amount_paise) {
			discrepancies.push({
				kind: 'amount-mismatch',
				provider_payment_id: entry.provider_payment_id,
				settled_amount_paise: entry.amount_paise,
				our_amount_paise: ourTx.amount_paise,
				dsa_id: ourTx.dsa_id
			});
			matchedPaymentIds.add(entry.provider_payment_id); // still counts as "seen on both sides"
			continue;
		}
		matchedPaymentIds.add(entry.provider_payment_id);
	}

	// ── Pass 2: walk our transactions for unmatched ones ──
	const pairedTestAuthIds = findTestAuthPairs(normalized);

	for (const tx of normalized) {
		// Refunds without explicit metadata get a pass — they're consumed
		// by pairs above OR they're D.3 refunds (not built yet).
		if (tx.is_refund) continue;
		if (!tx.is_charge) continue; // skip 'failed' rows — those aren't expected to settle

		if (!tx.provider_payment_id) {
			// A succeeded charge with no provider_payment_id is itself a data
			// integrity issue, but flagging it as a reconcile discrepancy
			// would be noise — it's a separate alarm. Skip here.
			continue;
		}

		if (matchedPaymentIds.has(tx.provider_payment_id)) continue;

		// ₹1 auth pair: silently dropped (no real money movement).
		if (
			tx.amount_paise === VERIFICATION_AMOUNT_PAISE &&
			pairedTestAuthIds.has(tx.id)
		) {
			continue;
		}

		// ₹1 unmatched > 1h old → operator alert.
		if (tx.amount_paise === VERIFICATION_AMOUNT_PAISE) {
			const ageMs = now.getTime() - tx.created_at.getTime();
			if (ageMs > TEST_AUTH_PAIR_WINDOW_MS) {
				discrepancies.push({
					kind: 'unmatched-test-auth',
					provider_payment_id: tx.provider_payment_id,
					our_amount_paise: tx.amount_paise,
					our_recorded_at: tx.created_at.toISOString(),
					age_hours: Math.round((ageMs / (60 * 60 * 1000)) * 10) / 10,
					dsa_id: tx.dsa_id
				});
				continue;
			}
			// ₹1 within 1h, no refund yet → not flagged this run; next run will
			// either see the refund pair (drop silently) or see it >1h old.
			continue;
		}

		// Normal charge in our DB without a settlement entry → likely timing.
		discrepancies.push({
			kind: 'missing-provider-side',
			provider_payment_id: tx.provider_payment_id,
			our_amount_paise: tx.amount_paise,
			our_recorded_at: tx.created_at.toISOString(),
			dsa_id: tx.dsa_id
		});
	}

	const counts = {
		missing_our_side: discrepancies.filter((d) => d.kind === 'missing-our-side').length,
		missing_provider_side: discrepancies.filter((d) => d.kind === 'missing-provider-side')
			.length,
		amount_mismatch: discrepancies.filter((d) => d.kind === 'amount-mismatch').length,
		unmatched_test_auth: discrepancies.filter((d) => d.kind === 'unmatched-test-auth').length
	};

	return {
		provider_entries: settlements.length,
		our_transactions: transactions.length,
		matched: matchedPaymentIds.size,
		discrepancies,
		counts
	};
}

/**
 * IST settlement-day window for a given reconcile run timestamp.
 * Returns [from, to] in UTC bounding the PRIOR IST calendar day.
 *
 * Example: run at 2026-06-01T22:30:00Z (= 2026-06-02 04:00 IST) →
 *   prior IST day = 2026-06-01
 *   window = [2026-05-31T18:30:00Z, 2026-06-01T18:29:59.999Z]
 *
 * Per spec §4 S7 + critique P1-8: IST has no DST and a fixed +5:30
 * offset, so the math is straightforward.
 */
export function priorIstDayWindow(runAt: Date): {
	from: Date;
	to: Date;
	date_iso: string;
} {
	const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
	// Shift to IST, take the date components, subtract 1 day to get "prior"
	const istNow = new Date(runAt.getTime() + IST_OFFSET_MS);
	const priorIstY = istNow.getUTCFullYear();
	const priorIstM = istNow.getUTCMonth();
	const priorIstD = istNow.getUTCDate() - 1;
	// Build UTC-bounded window for that IST day
	const startOfIstDayUtcMs = Date.UTC(priorIstY, priorIstM, priorIstD, 0, 0, 0) - IST_OFFSET_MS;
	const endOfIstDayUtcMs = startOfIstDayUtcMs + 24 * 60 * 60 * 1000 - 1;
	const from = new Date(startOfIstDayUtcMs);
	const to = new Date(endOfIstDayUtcMs);

	// Date label uses the IST date, not the UTC date.
	const istDateLabel = new Date(from.getTime() + IST_OFFSET_MS);
	const yyyy = istDateLabel.getUTCFullYear();
	const mm = String(istDateLabel.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(istDateLabel.getUTCDate()).padStart(2, '0');
	return { from, to, date_iso: `${yyyy}-${mm}-${dd}` };
}
