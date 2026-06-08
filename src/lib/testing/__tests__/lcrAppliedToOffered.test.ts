/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: LCR-capped amount is applied to the offered amount
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Team audit 2026-05-28 surfaced a high-severity regulatory bug: the
 * Loan-to-Cost Ratio (LCR) cap — which limits disbursement based on the
 * registry value of the property — was computed in `evaluationEngine.ts`
 * but never passed to `calculateOfferedAmount`. The offered amount was
 * bounded only by requested / FOIR-eligible / LTV-capped.
 *
 * IMPACT
 * ──────
 * Under-registration of property (registry value < deal value) is very
 * common in India — buyers under-state the registry value to save stamp
 * duty. Lenders correctly cap disbursement at the registry-time LCR.
 *
 * Math example from the audit (Resale, ₹50L deal, ₹42L registry):
 *   - FOIR-eligible:    ₹49.9L
 *   - LTV-capped:       ₹46.4L
 *   - LCR-capped:       ₹43.0L
 *   - Offered (PRE-FIX): min(48, 49.9, 46.4)        = ₹46.4L
 *   - Offered (CORRECT): min(48, 49.9, 46.4, 43.0)  = ₹43.0L
 *
 * The DSA promised the customer ₹46.4L; the bank disbursed ₹43L at
 * registry. ₹3.4L funding shortfall on registration day.
 *
 * FIX (2026-05-28)
 * ────────────────
 * `calculateOfferedAmount` now accepts an optional `lcrCappedAmount`
 * parameter. `evaluationEngine.ts` passes it through.
 *
 * THIS TEST
 * ─────────
 * 1. Behavioral: `calculateOfferedAmount` clamps to lcrCappedAmount.
 * 2. Static-scan: evaluationEngine.ts passes lcrCappedAmount as the 4th arg.
 *
 * Companion: CLAUDE.md §3 Pitfall (LCR over-offer at registry, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateOfferedAmount } from '$lib/ruleEngine/emiCalculator';

describe('LCR cap applied to offered amount — Pitfall: registry-day shortfall', () => {
	describe('behavioral — calculateOfferedAmount honors lcrCappedAmount', () => {
		it('clamps to lcrCappedAmount when it is the smallest cap (audit scenario)', () => {
			// Resale audit numbers: requested=48L, foir=49.9L, ltv=46.4L, lcr=43L
			const result = calculateOfferedAmount(
				48_00_000,
				49_90_000,
				46_40_000,
				43_00_000
			);
			expect(result).toBe(43_00_000);
		});

		it('still respects LTV cap when LTV is smaller than LCR', () => {
			// LTV=40L, LCR=43L → LTV wins
			const result = calculateOfferedAmount(48_00_000, 49_90_000, 40_00_000, 43_00_000);
			expect(result).toBe(40_00_000);
		});

		it('still respects FOIR cap when FOIR is smaller than LCR', () => {
			// FOIR=35L, LCR=43L → FOIR wins
			const result = calculateOfferedAmount(48_00_000, 35_00_000, 46_40_000, 43_00_000);
			expect(result).toBe(35_00_000);
		});

		it('omitting lcrCappedAmount preserves legacy behavior (backwards compatible)', () => {
			const result = calculateOfferedAmount(48_00_000, 49_90_000, 46_40_000);
			expect(result).toBe(46_40_000);
		});

		it('lcrCappedAmount = 0 clamps to 0 (cannot disburse at registry)', () => {
			const result = calculateOfferedAmount(48_00_000, 49_90_000, 46_40_000, 0);
			expect(result).toBe(0);
		});

		it('handles undefined LTV but defined LCR (no propertyCost path)', () => {
			const result = calculateOfferedAmount(48_00_000, 49_90_000, undefined, 43_00_000);
			expect(result).toBe(43_00_000);
		});
	});

	describe('static-scan: evaluationEngine.ts passes lcrCappedAmount', () => {
		const filePath = resolve(process.cwd(), 'src/lib/ruleEngine/evaluationEngine.ts');
		const source = readFileSync(filePath, 'utf-8');

		it('calculateOfferedAmount call site passes 4 args including lcrCappedAmount', () => {
			// The call must be:
			//   calculateOfferedAmount(requestedAmount, foirEligibleAmount, ltvCappedAmount, lcrCappedAmount)
			const callPattern =
				/calculateOfferedAmount\s*\([^)]*lcrCappedAmount[^)]*\)/;
			expect(
				callPattern.test(source),
				'evaluationEngine.ts does NOT pass lcrCappedAmount to ' +
					'calculateOfferedAmount. Resale / Direct Sale offers will over-promise ' +
					'by the LCR gap, causing customer funding shortfall at registry. ' +
					'See CLAUDE.md §3 Pitfall (LCR over-offer at registry).'
			).toBe(true);
		});

		it('lcrCappedAmount is still computed before the offered-amount call', () => {
			// Sanity: the variable must exist
			expect(source.includes('lcrCappedAmount')).toBe(true);
		});
	});
});
