/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: mortgageYear='MAX' resolves to the lender's max tenure
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * Team audit 2026-05-28 surfaced a critical eligibility bug: any DSA selecting
 * "Max possible" tenure (`mortgageYear='MAX'`) silently evaluated at 12 months
 * for every lender, severely deflating eligibility (and EMI affordability).
 *
 * The chain:
 *   1. casePayloadBuilder.ts:353  — `toNumber('MAX')` returns null →
 *      payload.loanTransaction.tenureYears = null
 *   2. payloadEnricher.ts:756-757 — correctly stamps
 *      `effectiveMortgageYear = 'MAX'` on the enriched payload
 *   3. evaluationEngine.ts (PRE-FIX) — read raw `tenureYears` (null) and
 *      ignored `effectiveMortgageYear`. determineEffectiveTenure(null, ...)
 *      → null * 12 = 0 → Math.max(MIN_TENURE_MONTHS, min(0, ..., ...))
 *      = MIN_TENURE_MONTHS (12 months).
 *
 * Result: every "Max tenure" pick was evaluated as 12-month tenure. EMI and
 * eligibility for the vast majority of cases (DSAs commonly pick max) were
 * catastrophically deflated. No surfaced error; no test caught it.
 *
 * FIX (2026-05-28)
 * ────────────────
 * `evaluationEngine.ts` now resolves a `requestedYears` value upfront:
 *   - If `effectiveMortgageYear === 'MAX'` → use `params.maxTenureMonths / 12`
 *     so the downstream Math.min picks the lender cap.
 *   - Else if `effectiveMortgageYear` is a positive finite number → use it.
 *   - Else fall back to raw `tenureYears` (still defensive against NaN/null).
 * This new variable is then passed to `determineEffectiveTenure` and to the
 * credit-line branch.
 *
 * THIS TEST
 * ─────────
 * Static source-code scan asserts that evaluationEngine.ts reads
 * `effectiveMortgageYear` AND that the credit-line branch uses the resolved
 * value (not raw `tenureYears`). Plus a behavioral check via
 * `determineEffectiveTenure` showing the floor regression case.
 *
 * Companion: CLAUDE.md §3 Pitfall (MAX tenure silently 12mo, 2026-05-28).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { determineEffectiveTenure } from '$lib/ruleEngine/emiCalculator';

describe('MAX tenure evaluation — Pitfall: silent 12-month floor', () => {
	describe('regression baseline (determineEffectiveTenure itself)', () => {
		it('floors to MIN_TENURE_MONTHS=12 when requestedYears is 0 (the broken pre-fix value)', () => {
			// This documents the failure mode: raw tenureYears = null/0 → 12 months.
			const result = determineEffectiveTenure(0, 35, 65, 360);
			expect(result).toBe(12);
		});

		it('returns lender max when requestedYears = lenderMaxMonths/12 and age allows', () => {
			// This is what the fix passes when effectiveMortgageYear === 'MAX'.
			// Lender max = 360mo (30y). Age 35 → maxAge 65 → ageLimited = 360mo.
			// Math.min(360*12=4320, 360, 360) = 360. PASS.
			const result = determineEffectiveTenure(360 / 12, 35, 65, 360);
			expect(result).toBe(360);
		});

		it('age-cap still wins over MAX when applicable', () => {
			// 60yo applicant, maxAge 65 → ageLimited = 60mo. Even if MAX would
			// have asked for 360, the age cap floors it. Bank rule respected.
			const result = determineEffectiveTenure(360 / 12, 60, 65, 360);
			expect(result).toBe(60);
		});
	});

	describe('static-scan: evaluationEngine.ts reads effectiveMortgageYear', () => {
		const filePath = resolve(process.cwd(), 'src/lib/ruleEngine/evaluationEngine.ts');
		const source = readFileSync(filePath, 'utf-8');

		it('references effectiveMortgageYear in the tenure resolution block', () => {
			expect(
				source.includes('effectiveMortgageYear'),
				'evaluationEngine.ts no longer reads effectiveMortgageYear. ' +
					'Without it, mortgageYear="MAX" payloads silently floor to 12 months ' +
					'for every lender. See CLAUDE.md §3 Pitfall (MAX tenure silently 12mo).'
			).toBe(true);
		});

		it('handles the MAX literal by using maxTenureMonths as the requested cap', () => {
			// The fix derives requestedYears from params.maxTenureMonths / 12
			// when effectiveMortgageYear === 'MAX'. This pattern must be present.
			const pattern = /rawEffective\s*===\s*['"]MAX['"][\s\S]{0,200}?maxTenureMonths\s*\/\s*12/;
			expect(
				pattern.test(source),
				'evaluationEngine.ts does not derive requestedYears from ' +
					'params.maxTenureMonths/12 when effectiveMortgageYear==="MAX". ' +
					'See CLAUDE.md §3 Pitfall (MAX tenure silently 12mo).'
			).toBe(true);
		});

		it('credit-line tenure branch uses the resolved requestedYears (not raw tenureYears)', () => {
			// Find the credit-line branch. It must use `requestedYears * 12` after
			// the fix, NOT `payload.loanTransaction.tenureYears * 12`.
			const creditLineBlock = source.match(
				/isCreditLine\s*&&\s*!facilityConfig\.hasFixedEmi[\s\S]{0,500}?\}/
			);
			expect(creditLineBlock, 'credit-line branch not found').toBeTruthy();
			const block = creditLineBlock![0];

			expect(
				block.includes('requestedYears * 12'),
				'Credit-line branch does not use the resolved requestedYears variable. ' +
					'It still reads raw payload.loanTransaction.tenureYears * 12, which ' +
					'is null/0 when DSA picks MAX. See CLAUDE.md §3 Pitfall.'
			).toBe(true);

			expect(
				/payload\.loanTransaction\.tenureYears\s*\*\s*12/.test(block),
				'Credit-line branch still references payload.loanTransaction.tenureYears * 12. ' +
					'This bypasses the MAX-resolution logic. See CLAUDE.md §3 Pitfall.'
			).toBe(false);
		});
	});

	describe('static-scan: enricher still stamps effectiveMortgageYear=MAX', () => {
		it('payloadEnricher.ts has the MAX branch that engine relies on', () => {
			const filePath = resolve(process.cwd(), 'src/lib/ruleEngine/payloadEnricher.ts');
			const source = readFileSync(filePath, 'utf-8');
			const pattern =
				/mortgageYear\s*===\s*['"]MAX['"][\s\S]{0,200}?effectiveMortgageYear\s*=\s*['"]MAX['"]/;
			expect(
				pattern.test(source),
				'payloadEnricher.ts no longer stamps effectiveMortgageYear="MAX". ' +
					'The engine fix depends on this. See CLAUDE.md §3 Pitfall.'
			).toBe(true);
		});
	});
});
