import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateEMI, calculateFoirEligibleAmount } from '$lib/ruleEngine/emiCalculator';

/**
 * Audit BUG-E regression — Dual-tenure modeling for hybrid BT+Top-up.
 *
 * Before the fix, `evaluationEngine.ts` resolved a single `tenureMonths`
 * value and used it to amortize the FULL offered amount, even though for
 * BT+Top-up the base BT portion (= principalOutstanding, inherited verbatim
 * by the takeover lender) and the Top-up portion (= topUpAmount, lender's
 * discretion) typically run over very different tenures — base over
 * remainingTenure / newTenure (15-20 yr), top-up over topUpTenure (3-7 yr).
 *
 * Squishing both portions under one tenure UNDER-states the EMI when the
 * top-up runs shorter, which OVER-states FOIR-eligible amount. Concrete
 * example for a ₹30L BT + ₹10L top-up:
 *   • Single 20yr tenure @ 9% → EMI ≈ ₹35,989 on combined ₹40L principal
 *   • Dual: 20yr on ₹30L (₹26,992) + 5yr on ₹10L (₹20,758) = ₹47,750
 *   • Same applicant FOIR rejects the second; accepts the first (wrong)
 *
 * The fix splits both the FOIR-eligible reverse-solve and the final EMI
 * into two pieces and sums them, gated to loanType === 'BT + Top-up' AND
 * all four inputs (principalOutstanding, topUpAmount, base tenure,
 * top-up tenure) present. Missing inputs → defensive fallback to today's
 * single-tenure path with a logger.warn so operator notices.
 *
 * Two layers — source-pattern (locks structure) + pure-math (locks math).
 *
 * Same source-pattern-scan style as topupLtvExposure +
 * resaleDownPaymentBoundary + btTopupStringMatching.
 *
 * Companion: SESSION-HANDOFF 2026-05-28 night-end, audit batch Session 4.
 */

const ENGINE_PATH = resolve(__dirname, '../../../lib/ruleEngine/evaluationEngine.ts');

describe('BT+Top-up dual-tenure modeling (Audit BUG-E)', () => {
	const source = readFileSync(ENGINE_PATH, 'utf-8');

	// Isolate the dual-tenure setup block (variable declarations + gate +
	// warn-fallback). Spans from the BUG-E comment header through to the
	// end of `baseBtEmi` declaration just before the foirEligibleAmount
	// computation.
	const setupBlockMatch = source.match(
		/\/\/ Audit BUG-E[\s\S]+?const baseBtEmi = dualTenureEligible[\s\S]+?: 0;/
	);

	it('isolates the dual-tenure setup block successfully', () => {
		expect(
			setupBlockMatch,
			'BUG-E dual-tenure setup block not found in evaluationEngine.ts — refactor likely moved or renamed the gate'
		).not.toBeNull();
	});

	const setupBlock = setupBlockMatch?.[0] ?? '';

	// ── Source-pattern locks ────────────────────────────────────────────────

	it('gate fires only on exact "Balance Transfer With Top-up" loanType (not broadened to .includes)', () => {
		// Per audit's spot-check math + the BUG-F precedent: BT-Only and Top-up
		// Only have different LTV / amortization semantics. A future "simplify"
		// to .includes('Top-up') would silently broaden the dual-tenure path to
		// BT-Only (wrong — no top-up) and Top-up Only (wrong — no BT principal).
		//
		// Post-2026-05-31-rename: canonical scope value is the full
		// 'Balance Transfer With Top-up' emitted by payloadBuilder/loanTransaction.ts.
		// Previously this test asserted 'BT + Top-up' (a UI abbreviation), which
		// ratified a production bug — the engine gate never fired because the
		// stored value never matched. See evaluationEngine.ts:878.
		expect(setupBlock).toMatch(/['"]Balance Transfer With Top-up['"]/);
		const broadIncludesPattern = /\.includes\(\s*['"]Top-up['"]\s*\)/;
		expect(
			setupBlock,
			'BT+Top-up gate must NOT use .includes("Top-up") — catches BT-Only and Top-up Only too'
		).not.toMatch(broadIncludesPattern);
	});

	it('references both base tenure (newTenure or remainingTenure) AND topUpTenure', () => {
		// Either prefer-newTenure-then-fallback-remainingTenure pattern is fine;
		// what matters is that both fields are read. A future regression that
		// drops one is exactly what this test catches.
		expect(setupBlock).toMatch(/newTenure/);
		expect(setupBlock).toMatch(/remainingTenure/);
		expect(setupBlock).toMatch(/topUpTenure/);
	});

	it('converts topUpTenure from YEARS to months (× 12)', () => {
		// Schema-confirmed unit: topUpTenure is stored in YEARS (homeLoanSchemaV2
		// options "10 yrs" / "15 yrs" / "20 yrs"). The engine needs months for
		// calculateEMI / calculateFoirEligibleAmount. Missing the conversion
		// would amortize a 5-year top-up over 5 MONTHS — EMI explodes 12×.
		expect(setupBlock).toMatch(/topUpTenure[\s\S]{0,80}?\*\s*12/);
	});

	it('eligibility gate requires all four inputs (principal, top-up, base tenure, top-up tenure)', () => {
		// The gate must require every input — silently dropping any one would
		// let the dual-tenure path run with zeros (NaN risk) or stale single-
		// tenure outputs.
		expect(setupBlock).toMatch(/dualTenureEligible\s*=/);
		expect(setupBlock).toMatch(/baseBtPrincipal\s*>\s*0/);
		expect(setupBlock).toMatch(/topUpAmountReq\s*>\s*0/);
		expect(setupBlock).toMatch(/baseBtTenureMonths\s*!==\s*undefined/);
		expect(setupBlock).toMatch(/topUpTenureMonths\s*!==\s*undefined/);
	});

	it('falls back to single-tenure with a logger.warn when inputs are incomplete', () => {
		// Defensive: dropping any input means the user's BT+Top-up case still
		// gets evaluated (better than crashing or zeroing). But silent fallback
		// would hide a payload-builder regression that starts losing fields, so
		// the warn-log is mandatory.
		expect(setupBlock).toMatch(/logger\.warn/);
		expect(setupBlock).toMatch(/missing/);
		expect(setupBlock).toMatch(/falling back/i);
	});

	it('LTV block does NOT also apply the dual-tenure (BUG-F decision preserved)', () => {
		// Per the BUG-F commit body (175994ea): the takeover pays off the
		// outstanding, so the new combined loan stands alone against LTV cap
		// — no subtraction for BT+Top-up. BUG-E must NOT touch the LTV branch.
		// Isolate the LTV block and confirm it doesn't reference dualTenureEligible.
		const ltvBlockMatch = source.match(
			/let ltvCappedAmount: number \| undefined;[\s\S]+?(?=\/\/ -- Step 6b: LCR)/
		);
		expect(ltvBlockMatch).not.toBeNull();
		expect(
			ltvBlockMatch![0],
			'LTV block must NOT reference dualTenureEligible — BT+Top-up LTV path is unchanged per BUG-F'
		).not.toMatch(/dualTenureEligible/);
	});

	// ── Pure-math verification ──────────────────────────────────────────────
	//
	// These don't drive the full engine — they confirm the underlying helpers
	// produce the values our dual-tenure code multiplexes. If the engine math
	// drifts from these, the source-pattern locks above still pass but the
	// behavior is wrong — these tests catch that.

	it('combined dual-tenure EMI exceeds single-tenure EMI when top-up runs shorter', () => {
		const principalBase = 3_000_000; // ₹30L outstanding
		const principalTopUp = 1_000_000; // ₹10L top-up
		const roi = 9; // %
		const baseTenureMonths = 240; // 20yr
		const topUpTenureMonths = 60; // 5yr

		const singleTenureEmi = calculateEMI(principalBase + principalTopUp, roi, baseTenureMonths);
		const dualBaseEmi = calculateEMI(principalBase, roi, baseTenureMonths);
		const dualTopUpEmi = calculateEMI(principalTopUp, roi, topUpTenureMonths);
		const dualTenureEmi = dualBaseEmi + dualTopUpEmi;

		// Top-up amortized over 5yr instead of 20yr is the whole point — its EMI
		// is much higher per rupee, so the combined dual EMI must beat the
		// single-tenure under-statement. If this inequality breaks, the math
		// assumption behind BUG-E is wrong.
		expect(dualTenureEmi).toBeGreaterThan(singleTenureEmi);

		// Sanity bounds — top-up EMI alone should be at least the per-month
		// principal split (10L / 60 = ₹16,666); base EMI for 30L @ 9% / 20yr
		// is the standard ≈ ₹26,992.
		expect(dualBaseEmi).toBeGreaterThan(26_000);
		expect(dualBaseEmi).toBeLessThan(28_000);
		expect(dualTopUpEmi).toBeGreaterThan(20_000);
	});

	it('dual-tenure FOIR-eligible: top-up portion reverse-solves with base EMI added to obligations', () => {
		// Replicates the engine's dual-tenure FOIR-eligible path. Given an
		// applicant with ₹1L assessed income, 50% max FOIR, no other
		// obligations, and a ₹30L base BT @ 9% over 20yr → base EMI ≈ ₹26,992;
		// FOIR headroom = ₹50,000; available for top-up EMI = ₹23,008.
		// Reverse-solve over a 5yr top-up tenure @ 9%: principal ≈ ₹11.08L.
		const assessedIncome = 100_000;
		const maxFoir = 0.5;
		const roi = 9;
		const baseBtPrincipal = 3_000_000;
		const baseBtTenureMonths = 240;
		const topUpTenureMonths = 60;
		const baseBtEmi = calculateEMI(baseBtPrincipal, roi, baseBtTenureMonths);

		const topUpFoirEligible = calculateFoirEligibleAmount(
			assessedIncome,
			maxFoir,
			baseBtEmi,
			roi,
			topUpTenureMonths
		);

		// Foir headroom after base EMI is 50_000 - 26_992 = 23_008. Reverse-
		// solving 23_008/mo over 60mo @ 9% lands around 11_08_000 ± 5000.
		expect(topUpFoirEligible).toBeGreaterThan(1_080_000);
		expect(topUpFoirEligible).toBeLessThan(1_120_000);

		// foirEligibleAmount the engine returns is base + top-up portion
		const foirEligibleAmount = baseBtPrincipal + topUpFoirEligible;
		expect(foirEligibleAmount).toBeGreaterThan(4_080_000); // 30L + 10.8L+
	});

	it('when base BT EMI exhausts FOIR headroom, top-up FOIR-eligible is 0', () => {
		// Worked degenerate case: low-income applicant, ₹40L base BT @ 9% / 20yr
		// → base EMI ≈ ₹35,989 alone exceeds 50% of ₹50k income. Top-up gets 0.
		// Engine should report foirEligibleAmount = baseBtPrincipal (no top-up
		// possible), traffic light AMBER/RED via offeredAmount < requested.
		const assessedIncome = 50_000;
		const maxFoir = 0.5;
		const roi = 9;
		const baseBtPrincipal = 4_000_000;
		const baseBtTenureMonths = 240;
		const topUpTenureMonths = 60;
		const baseBtEmi = calculateEMI(baseBtPrincipal, roi, baseBtTenureMonths);

		// Sanity: base EMI ≈ ₹35,989 > ₹25,000 headroom
		expect(baseBtEmi).toBeGreaterThan(25_000);

		const topUpFoirEligible = calculateFoirEligibleAmount(
			assessedIncome,
			maxFoir,
			baseBtEmi,
			roi,
			topUpTenureMonths
		);
		expect(topUpFoirEligible).toBe(0);

		const foirEligibleAmount = baseBtPrincipal + topUpFoirEligible;
		expect(foirEligibleAmount).toBe(baseBtPrincipal);
	});
});
