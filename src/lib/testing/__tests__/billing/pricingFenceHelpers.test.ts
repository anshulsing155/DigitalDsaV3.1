/**
 * ═══════════════════════════════════════════════════════════════════════════
 * D.6 — Pricing-fence plan helpers
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Covers the four helpers added to `$lib/config/billing` for the Billing-page
 * redesign + case-creation upgrade modal:
 *   • recommendPlan(activeCases)     — cheapest sufficient tier (single badge)
 *   • getAnnualPrice(plan)           — × ANNUAL_PRICE_MULTIPLIER (= 10)
 *   • getAnnualSavings(plan)         — { saved, freeMonths } for the toggle
 *   • getGstBreakdown(amountInclGst) — inclusive-GST split (ADR-0019)
 *
 * Also covers the static-removal of the legacy `plan.badge` field (the
 * dual-badge "Most Popular" + "Best Value" issue D.6 flagged): the type
 * no longer has the field and consumers don't depend on it.
 *
 * Companion: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §D.6,
 * docs/adr/0019-pricing-inclusive-of-gst.md.
 */

import { describe, it, expect } from 'vitest';
import {
	PLANS,
	PLAN_LIST,
	GST_RATE,
	recommendPlan,
	getGstBreakdown
} from '$lib/config/billing';
// Annual-cycle helpers (ANNUAL_PRICE_MULTIPLIER, getAnnualPrice,
// getAnnualSavings) and the BillingCycle type were removed 2026-05-28
// per owner decision — monthly only, no toggle. Their tests were
// removed with them; the recommendPlan / GST / dead-field / dedup
// locks stay because they're independent of cycle.

describe('D.6 pricing-fence helpers', () => {
	// ── recommendPlan ────────────────────────────────────────────────────

	describe('recommendPlan — cheapest sufficient tier', () => {
		it('0 active cases → basic (basic.caseLimit = 10 already covers it)', () => {
			expect(recommendPlan(0)).toBe('basic');
		});

		it('exactly Basic cap (10) stays in Basic — no premature upgrade nudge', () => {
			// Boundary: a DSA at exactly their limit isn't yet OVER it. The
			// recommendation should stay Basic; the +1 gesture covers crossing.
			expect(recommendPlan(10)).toBe('basic');
		});

		it('one over Basic (11) → pro', () => {
			// First case that genuinely requires a higher tier.
			expect(recommendPlan(11)).toBe('pro');
		});

		it('exactly Pro cap (50) stays in Pro', () => {
			expect(recommendPlan(50)).toBe('pro');
		});

		it('one over Pro (51) → enterprise', () => {
			expect(recommendPlan(51)).toBe('enterprise');
		});

		it('large case count (10,000) → enterprise (Infinity always wins)', () => {
			expect(recommendPlan(10_000)).toBe('enterprise');
		});

		it('always returns the CHEAPEST sufficient tier (never overshoots)', () => {
			// Spot-check: a DSA at 25 cases (well within Pro's 50) should NOT
			// be steered to Enterprise. The PMS audit explicitly called out
			// over-recommendation as a problem.
			expect(recommendPlan(25)).toBe('pro');
		});
	});

	// ── Annual-cycle removal lock ────────────────────────────────────────

	describe('annual-cycle helpers — removed 2026-05-28 (owner decision: monthly only)', () => {
		it('the four annual-cycle exports are absent from $lib/config/billing', async () => {
			// Lock: monthly-only product. If a future change re-adds any of
			// these exports without a corresponding owner decision, this
			// test fails and forces a conversation. The exports were:
			//   ANNUAL_PRICE_MULTIPLIER, getAnnualPrice, getAnnualSavings,
			//   BillingCycle (type — TS, not testable at runtime)
			const billing = (await import('$lib/config/billing')) as Record<string, unknown>;
			expect(
				billing.ANNUAL_PRICE_MULTIPLIER,
				'ANNUAL_PRICE_MULTIPLIER must remain unexported — annual billing was removed 2026-05-28 per owner decision (monthly-only product). See SESSION-HANDOFF night-end-6 + CHANGELOG.'
			).toBeUndefined();
			expect(
				billing.getAnnualPrice,
				'getAnnualPrice must remain unexported — see annual-billing removal note above.'
			).toBeUndefined();
			expect(
				billing.getAnnualSavings,
				'getAnnualSavings must remain unexported — see annual-billing removal note above.'
			).toBeUndefined();
		});
	});

	// ── getGstBreakdown — inclusive-GST back-compute (ADR-0019) ──────────

	describe('getGstBreakdown — back-compute taxable + GST from inclusive total', () => {
		it('GST_RATE is exactly 18% (matches invoiceEngine.ts)', () => {
			// Two locations must agree (invoiceEngine.ts has its own paise-
			// precise version for actual money math). If the rate ever
			// changes, BOTH update.
			expect(GST_RATE).toBe(0.18);
		});

		it('₹3,999 → ₹3,389 taxable + ₹610 GST (sums exactly to total)', () => {
			// Worked example from ADR-0019. The subtraction-based gst
			// component (total − netTaxable) guarantees the sum invariant
			// even when the divide is non-integer.
			const { netTaxable, gst, total } = getGstBreakdown(3_999);
			expect(netTaxable).toBe(3_389);
			expect(gst).toBe(610);
			expect(total).toBe(3_999);
			expect(netTaxable + gst).toBe(total);
		});

		it('₹999 → ₹847 taxable + ₹152 GST', () => {
			const { netTaxable, gst, total } = getGstBreakdown(999);
			expect(netTaxable + gst).toBe(total);
			expect(netTaxable).toBe(847);
			expect(gst).toBe(152);
		});

		it('₹9,999 → ₹8,474 taxable + ₹1,525 GST (sums exactly)', () => {
			const { netTaxable, gst, total } = getGstBreakdown(9_999);
			expect(netTaxable + gst).toBe(total);
		});

		it('returns 0/0/0 for zero input — safe for unused plan rows', () => {
			expect(getGstBreakdown(0)).toEqual({ netTaxable: 0, gst: 0, total: 0 });
		});
	});

	// ── Dead-field removal lock ─────────────────────────────────────────

	describe('BillingPlan — static badge field removed (dual-badge fix)', () => {
		it('PLANS entries do NOT carry a static badge field anymore', () => {
			// The dual "Most Popular" + "Best Value" badges were the D.6 audit
			// finding. Removed in favor of computed `recommendPlan()`. This
			// test catches a future regression that re-adds the field.
			for (const plan of PLAN_LIST) {
				expect(
					(plan as unknown as Record<string, unknown>).badge,
					`Plan "${plan.name}" carries a legacy badge — D.6 removed static badges. Use recommendPlan(activeCases) instead.`
				).toBeUndefined();
			}
		});
	});
});
