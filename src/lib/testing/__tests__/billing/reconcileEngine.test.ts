/**
 * D.1 S7 — reconcileEngine pure logic tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the matching algorithm + IST window math. No DB, no mocks
 * beyond the input args.
 *
 * Cases covered:
 *   - exact match (provider + ours, same amount) → matched, no drift
 *   - missing-our-side (provider entry with no matching transaction)
 *   - missing-provider-side (our succeeded transaction not in settlement)
 *   - amount-mismatch (same payment_id, different amounts)
 *   - ₹1 auth-pair within 1h → silently dropped
 *   - ₹1 unmatched > 1h → unmatched-test-auth flagged
 *   - ₹1 unmatched < 1h → not flagged (next run will handle)
 *   - failed charges in our DB do not generate missing-provider-side
 *   - settlement refund entries are checked the same way as charges
 *   - priorIstDayWindow returns correct UTC bounds for an IST settlement day
 *   - priorIstDayWindow handles month/year boundaries (Feb 28/29, Dec 31)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingTransactionDoc } from '$lib/types/billingSubscription';
import type { SettlementEntry } from '$lib/server/billing/providers/BillingProvider';
import {
	reconcileSettlements,
	priorIstDayWindow,
	VERIFICATION_AMOUNT_PAISE
} from '../../../server/billing/reconcileEngine';

const NOW = new Date('2026-06-02T22:30:00Z'); // 04:00 IST 2026-06-02 → recon for 2026-06-01 IST
const DAY = 24 * 60 * 60 * 1000;

function makeRecurringCharge(
	overrides: {
		provider_payment_id?: string;
		amount_paise?: number;
		status?: 'succeeded' | 'failed';
		dsa_id?: ObjectId;
		created_at?: Date;
	} = {}
): BillingTransactionDoc {
	return {
		_id: new ObjectId(),
		kind: 'recurring_charge',
		dsa_id: overrides.dsa_id ?? new ObjectId(),
		subscription_id: new ObjectId(),
		attempt_id: 'att_' + Math.random().toString(36).slice(2),
		plan_id: 'pro',
		amount_paise: overrides.amount_paise ?? 399900,
		status: overrides.status ?? 'succeeded',
		provider: 'razorpay',
		provider_payment_id: overrides.provider_payment_id ?? 'pay_' + Math.random().toString(36).slice(2),
		cycle_anchor: new Date('2026-06-01T00:00:00Z'),
		charged_at: overrides.created_at ?? new Date('2026-06-01T08:00:00Z'),
		created_at: overrides.created_at ?? new Date('2026-06-01T08:00:00Z')
	} as BillingTransactionDoc;
}

function makeRefundRow(
	dsa_id: ObjectId,
	created_at: Date,
	amount_paise = VERIFICATION_AMOUNT_PAISE
): BillingTransactionDoc {
	// We don't have an explicit refund kind in v1 — use legacy shape with
	// status='refunded' as the discriminator (matches normalizeTx logic).
	return {
		_id: new ObjectId(),
		kind: 'legacy_one_time',
		dsa_id,
		plan: 'pro',
		amount: amount_paise / 100,
		amount_paise,
		status: 'refunded',
		created_at,
		razorpay_payment_id: null
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

function makeSettlement(
	provider_payment_id: string,
	amount_paise: number,
	settled_at: Date = new Date('2026-06-01T12:00:00Z'),
	type: 'charge' | 'refund' = 'charge'
): SettlementEntry {
	return { provider_payment_id, amount_paise, settled_at, type };
}

// ── exact match ─────────────────────────────────────────────────

describe('reconcileSettlements — happy path', () => {
	it('clean run: every settlement entry matches a transaction; no discrepancies', () => {
		const tx1 = makeRecurringCharge({ provider_payment_id: 'pay_a', amount_paise: 399900 });
		const tx2 = makeRecurringCharge({ provider_payment_id: 'pay_b', amount_paise: 99900 });
		const settlements = [makeSettlement('pay_a', 399900), makeSettlement('pay_b', 99900)];

		const result = reconcileSettlements({
			settlements,
			transactions: [tx1, tx2],
			now: NOW
		});

		expect(result.matched).toBe(2);
		expect(result.discrepancies).toEqual([]);
		expect(result.counts.missing_our_side).toBe(0);
		expect(result.counts.missing_provider_side).toBe(0);
		expect(result.counts.amount_mismatch).toBe(0);
	});

	it('zero-input edge case: no settlements, no transactions → clean', () => {
		const result = reconcileSettlements({
			settlements: [],
			transactions: [],
			now: NOW
		});
		expect(result.matched).toBe(0);
		expect(result.discrepancies).toEqual([]);
	});
});

// ── missing-our-side (CRITICAL) ─────────────────────────────────

describe('reconcileSettlements — missing-our-side', () => {
	it('flags a settlement entry with no matching transaction', () => {
		const result = reconcileSettlements({
			settlements: [makeSettlement('pay_orphan', 99900)],
			transactions: [],
			now: NOW
		});
		expect(result.counts.missing_our_side).toBe(1);
		expect(result.discrepancies).toHaveLength(1);
		const d = result.discrepancies[0];
		if (d.kind !== 'missing-our-side') throw new Error('expected missing-our-side');
		expect(d.provider_payment_id).toBe('pay_orphan');
		expect(d.settled_amount_paise).toBe(99900);
	});

	it('passes through the entry type (charge vs refund)', () => {
		const result = reconcileSettlements({
			settlements: [makeSettlement('pay_refund_orphan', 99900, NOW, 'refund')],
			transactions: [],
			now: NOW
		});
		const d = result.discrepancies[0];
		if (d.kind !== 'missing-our-side') throw new Error('expected missing-our-side');
		expect(d.type).toBe('refund');
	});
});

// ── missing-provider-side ───────────────────────────────────────

describe('reconcileSettlements — missing-provider-side', () => {
	it('flags a succeeded transaction with no settlement entry', () => {
		const tx = makeRecurringCharge({ provider_payment_id: 'pay_unsettled' });
		const result = reconcileSettlements({
			settlements: [],
			transactions: [tx],
			now: NOW
		});
		expect(result.counts.missing_provider_side).toBe(1);
		const d = result.discrepancies[0];
		if (d.kind !== 'missing-provider-side') throw new Error('expected missing-provider-side');
		expect(d.provider_payment_id).toBe('pay_unsettled');
	});

	it('does NOT flag failed charges', () => {
		const tx = makeRecurringCharge({ status: 'failed', provider_payment_id: 'pay_failed' });
		const result = reconcileSettlements({
			settlements: [],
			transactions: [tx],
			now: NOW
		});
		expect(result.discrepancies).toEqual([]);
	});

	it('does NOT flag succeeded transactions without provider_payment_id (separate alarm)', () => {
		// Build a row directly so we can omit provider_payment_id — the helper
		// defaults the field via `?? 'pay_random'` which would mask this case.
		const tx = {
			_id: new ObjectId(),
			kind: 'recurring_charge' as const,
			dsa_id: new ObjectId(),
			subscription_id: new ObjectId(),
			attempt_id: 'att_x',
			plan_id: 'pro' as const,
			amount_paise: 399900,
			status: 'succeeded' as const,
			provider: 'razorpay' as const,
			cycle_anchor: new Date('2026-06-01T00:00:00Z'),
			charged_at: new Date('2026-06-01T08:00:00Z'),
			created_at: new Date('2026-06-01T08:00:00Z')
			// NOTE: no provider_payment_id field set at all.
		} as BillingTransactionDoc;
		const result = reconcileSettlements({
			settlements: [],
			transactions: [tx],
			now: NOW
		});
		expect(result.discrepancies).toEqual([]);
	});
});

// ── amount-mismatch ─────────────────────────────────────────────

describe('reconcileSettlements — amount-mismatch', () => {
	it('flags differing amounts for the same payment_id', () => {
		const tx = makeRecurringCharge({ provider_payment_id: 'pay_mismatch', amount_paise: 399900 });
		const result = reconcileSettlements({
			settlements: [makeSettlement('pay_mismatch', 100000)], // different amount
			transactions: [tx],
			now: NOW
		});
		expect(result.counts.amount_mismatch).toBe(1);
		const d = result.discrepancies[0];
		if (d.kind !== 'amount-mismatch') throw new Error('expected amount-mismatch');
		expect(d.settled_amount_paise).toBe(100000);
		expect(d.our_amount_paise).toBe(399900);
	});

	it('matched count still counts the mismatch as "seen on both sides"', () => {
		const tx = makeRecurringCharge({ provider_payment_id: 'pay_mismatch', amount_paise: 399900 });
		const result = reconcileSettlements({
			settlements: [makeSettlement('pay_mismatch', 100000)],
			transactions: [tx],
			now: NOW
		});
		expect(result.matched).toBe(1);
		// And we do NOT also emit a missing-provider-side for the same row.
		expect(result.counts.missing_provider_side).toBe(0);
	});
});

// ── ₹1 auth-pair special case ───────────────────────────────────

describe('reconcileSettlements — ₹1 auth-pair handling', () => {
	const dsaId = new ObjectId();

	it('₹1 debit + ₹1 refund within 1h on same dsa → silently dropped', () => {
		const debitAt = new Date('2026-06-01T08:00:00Z');
		const refundAt = new Date('2026-06-01T08:30:00Z'); // 30 min later
		const debit = makeRecurringCharge({
			provider_payment_id: 'pay_auth1',
			amount_paise: VERIFICATION_AMOUNT_PAISE,
			dsa_id: dsaId,
			created_at: debitAt
		});
		const refund = makeRefundRow(dsaId, refundAt);

		const result = reconcileSettlements({
			settlements: [], // neither shows in settlement (auth charges are ephemeral)
			transactions: [debit, refund],
			now: NOW
		});
		expect(result.discrepancies).toEqual([]);
	});

	it('₹1 debit with NO refund and > 1h old → unmatched-test-auth flagged', () => {
		const debitAt = new Date(NOW.getTime() - 2 * 60 * 60 * 1000); // 2h ago
		const debit = makeRecurringCharge({
			provider_payment_id: 'pay_auth_stuck',
			amount_paise: VERIFICATION_AMOUNT_PAISE,
			dsa_id: dsaId,
			created_at: debitAt
		});

		const result = reconcileSettlements({
			settlements: [],
			transactions: [debit],
			now: NOW
		});

		expect(result.counts.unmatched_test_auth).toBe(1);
		const d = result.discrepancies[0];
		if (d.kind !== 'unmatched-test-auth') throw new Error('expected unmatched-test-auth');
		expect(d.provider_payment_id).toBe('pay_auth_stuck');
		expect(d.age_hours).toBeGreaterThanOrEqual(2);
		// And NOT flagged as missing-provider-side too.
		expect(result.counts.missing_provider_side).toBe(0);
	});

	it('₹1 debit < 1h with no refund → not flagged this run (deferred)', () => {
		const debitAt = new Date(NOW.getTime() - 30 * 60 * 1000); // 30 min ago
		const debit = makeRecurringCharge({
			provider_payment_id: 'pay_auth_fresh',
			amount_paise: VERIFICATION_AMOUNT_PAISE,
			dsa_id: dsaId,
			created_at: debitAt
		});
		const result = reconcileSettlements({
			settlements: [],
			transactions: [debit],
			now: NOW
		});
		expect(result.discrepancies).toEqual([]);
	});

	it('₹1 debit from one DSA does NOT pair with ₹1 refund from a different DSA', () => {
		const otherDsa = new ObjectId();
		const debitAt = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
		const debit = makeRecurringCharge({
			provider_payment_id: 'pay_auth_x',
			amount_paise: VERIFICATION_AMOUNT_PAISE,
			dsa_id: dsaId,
			created_at: debitAt
		});
		// Refund belongs to a DIFFERENT DSA — wrong pair.
		const refund = makeRefundRow(otherDsa, new Date(debitAt.getTime() + 5 * 60 * 1000));

		const result = reconcileSettlements({
			settlements: [],
			transactions: [debit, refund],
			now: NOW
		});
		// Debit still unmatched after 2h → flagged.
		expect(result.counts.unmatched_test_auth).toBe(1);
	});
});

// ── Mixed real-world scenario ──────────────────────────────────

describe('reconcileSettlements — mixed run', () => {
	it('aggregates a realistic mixed batch correctly', () => {
		const dsaA = new ObjectId();
		const dsaB = new ObjectId();
		const dsaC = new ObjectId();
		const dsaD = new ObjectId();

		// dsaA: clean ₹3999 charge
		const txA = makeRecurringCharge({
			dsa_id: dsaA,
			provider_payment_id: 'pay_clean',
			amount_paise: 399900
		});
		// dsaB: amount mismatch (we recorded 999900, provider settled 99900)
		const txB = makeRecurringCharge({
			dsa_id: dsaB,
			provider_payment_id: 'pay_mismatch',
			amount_paise: 999900
		});
		// dsaC: we recorded but no settlement (probably timing)
		const txC = makeRecurringCharge({
			dsa_id: dsaC,
			provider_payment_id: 'pay_unsettled',
			amount_paise: 99900
		});
		// dsaD: ₹1 auth stuck (3h, no refund)
		const txD = makeRecurringCharge({
			dsa_id: dsaD,
			provider_payment_id: 'pay_stuck_auth',
			amount_paise: VERIFICATION_AMOUNT_PAISE,
			created_at: new Date(NOW.getTime() - 3 * 60 * 60 * 1000)
		});

		const settlements: SettlementEntry[] = [
			makeSettlement('pay_clean', 399900),
			makeSettlement('pay_mismatch', 99900),
			makeSettlement('pay_phantom', 50000) // missing-our-side
		];

		const result = reconcileSettlements({
			settlements,
			transactions: [txA, txB, txC, txD],
			now: NOW
		});

		expect(result.matched).toBe(2); // pay_clean + pay_mismatch
		expect(result.counts.missing_our_side).toBe(1); // pay_phantom
		expect(result.counts.missing_provider_side).toBe(1); // pay_unsettled
		expect(result.counts.amount_mismatch).toBe(1); // pay_mismatch
		expect(result.counts.unmatched_test_auth).toBe(1); // pay_stuck_auth
		expect(result.discrepancies).toHaveLength(4);
	});
});

// ── priorIstDayWindow ──────────────────────────────────────────

describe('priorIstDayWindow', () => {
	it('returns the prior IST day for a 04:00 IST cron run', () => {
		// 2026-06-02 04:00 IST = 2026-06-01 22:30 UTC.
		// Prior IST day = 2026-06-01 (yesterday in IST relative to cron time).
		const runAt = new Date('2026-06-01T22:30:00Z');
		const w = priorIstDayWindow(runAt);
		expect(w.date_iso).toBe('2026-06-01');
		// Window = 2026-06-01 00:00 IST .. 2026-06-01 23:59:59.999 IST
		// In UTC = 2026-05-31 18:30 UTC .. 2026-06-01 18:29:59.999 UTC
		expect(w.from.toISOString()).toBe('2026-05-31T18:30:00.000Z');
		expect(w.to.toISOString()).toBe('2026-06-01T18:29:59.999Z');
	});

	it('handles month boundary (cron fires 1st of next month IST)', () => {
		// 2026-07-01 04:00 IST = 2026-06-30 22:30 UTC.
		// Prior IST day = 2026-06-30.
		const runAt = new Date('2026-06-30T22:30:00Z');
		const w = priorIstDayWindow(runAt);
		expect(w.date_iso).toBe('2026-06-30');
	});

	it('handles year boundary', () => {
		// 2027-01-01 04:00 IST = 2026-12-31 22:30 UTC.
		// Prior IST day = 2026-12-31.
		const runAt = new Date('2026-12-31T22:30:00Z');
		const w = priorIstDayWindow(runAt);
		expect(w.date_iso).toBe('2026-12-31');
	});

	it('handles Feb 29 in a leap year', () => {
		// 2028-03-01 04:00 IST = 2028-02-29 22:30 UTC.
		// Prior IST day = 2028-02-29.
		const runAt = new Date('2028-02-29T22:30:00Z');
		const w = priorIstDayWindow(runAt);
		expect(w.date_iso).toBe('2028-02-29');
	});

	it('crossing the IST → UTC boundary: cron run BEFORE 18:30 UTC reconciles 2 days back (defensive)', () => {
		// 2026-06-01 12:00 UTC = 2026-06-01 17:30 IST. Same IST date.
		// In this case "prior IST day" should be 2026-05-31.
		const runAt = new Date('2026-06-01T12:00:00Z');
		const w = priorIstDayWindow(runAt);
		expect(w.date_iso).toBe('2026-05-31');
	});
});
