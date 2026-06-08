/**
 * Plot & Equity Loan canonical payload fields — lock test for ADR-0025.
 *
 * The payload builder aliases existing form answers (`propCost`,
 * `agreementSellValue`) into the canonical V2 keys (`marketValue`,
 * `registryValue`) when `loanVariant === 'Plot & Equity Loan'`, and computes
 * the derived `sellerCashComponent = marketValue − registryValue`. See
 * `loanTransaction.ts` and the comment block citing ADR-0025.
 *
 * This test locks three properties of that wiring:
 *
 *   1. Gold-standard fixture — ₹1Cr market / ₹20L registry produces the
 *      canonical fields the engine (Phase 2) and offer card (Phase 4) expect,
 *      including the ₹80L `sellerCashComponent` derivation. Matches the
 *      worked example in docs/specs/PLOT-EQUITY-LOAN-DESIGN.md §3.
 *
 *   2. Variant gating — aliasing fires for Plot & Equity Loan ONLY. The
 *      three other Plot variants (Plot Loan Only, Plot & Construction Loan,
 *      Construction Loan Only) and the non-Plot secured loans (Home Loan,
 *      LAP) must NOT get aliased values.
 *
 *   3. Direct-write precedence — if a future form binds directly to
 *      `marketValue` / `registryValue`, those values win over the
 *      `propCost` / `agreementSellValue` aliasing. The `=== undefined`
 *      guards in the payload builder enforce this; this test locks it so
 *      the eventual deprecation of the aliasing block can ship without
 *      a behavior change.
 *
 * Per CLAUDE.md §16 Rule #16: this asserts the CANONICAL post-Phase-1b state.
 * When ADR-0025's sunset trigger fires (either form gets dedicated questions
 * OR app-wide rename ships), the aliasing block deletes and this test moves
 * with it — the canonical-field assertions stay, the alias-from-legacy ones
 * become irrelevant.
 */

import { describe, it, expect } from 'vitest';
import { buildLoanTransactionPayload } from '$lib/utils/payloadBuilder';

const ONE_CRORE = 10_000_000; // ₹1,00,00,000
const TWENTY_LAKH = 2_000_000; // ₹20,00,000
const EIGHTY_LAKH = 8_000_000; // ₹80,00,000

/** Minimal Plot & Equity loan answers — the gold-standard fixture from spec §3 */
function plotEquityAnswers(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		loanName: 'Plot Loan',
		loanType: 'New Loan',
		loanVariant: 'Plot & Equity Loan',
		mortgageYear: '15',
		propCost: ONE_CRORE,
		deposit: 0,
		ATSReady: 'Yes',
		agreementSellValue: TWENTY_LAKH,
		depositAsPerATS: 0,
		numberOfDirectorOrApplicant: 1,
		propertyIdentified: 'Yes',
		...overrides
	};
}

describe('Plot & Equity Loan — canonical payload fields (ADR-0025)', () => {
	describe('Gold-standard fixture (spec §3 worked example)', () => {
		it('aliases propCost → marketValue (₹1Cr)', () => {
			const payload = buildLoanTransactionPayload(plotEquityAnswers(), {});
			expect(payload.marketValue).toBe(ONE_CRORE);
		});

		it('aliases agreementSellValue → registryValue (₹20L)', () => {
			const payload = buildLoanTransactionPayload(plotEquityAnswers(), {});
			expect(payload.registryValue).toBe(TWENTY_LAKH);
		});

		it('derives sellerCashComponent = market − registry (₹80L)', () => {
			const payload = buildLoanTransactionPayload(plotEquityAnswers(), {});
			expect(payload.sellerCashComponent).toBe(EIGHTY_LAKH);
		});
	});

	describe('Variant gating — aliasing fires for Plot & Equity ONLY', () => {
		const otherPlotVariants = [
			'Plot Loan Only',
			'Plot & Construction Loan',
			'Construction Loan Only'
		];

		for (const variant of otherPlotVariants) {
			it(`does NOT alias for variant: ${variant}`, () => {
				const payload = buildLoanTransactionPayload(
					plotEquityAnswers({ loanVariant: variant }),
					{}
				);
				// marketValue / registryValue must not have been populated from
				// propCost / agreementSellValue for these variants.
				expect(payload.marketValue).toBeUndefined();
				expect(payload.registryValue).toBeUndefined();
				expect(payload.sellerCashComponent).toBeUndefined();
			});
		}

		it('does NOT alias for Home Loan', () => {
			const payload = buildLoanTransactionPayload(
				{
					loanName: 'Home Loan',
					loanType: 'New Loan',
					mortgageYear: '20',
					propCost: ONE_CRORE,
					agreementSellValue: TWENTY_LAKH,
					numberOfDirectorOrApplicant: 1,
					propertyIdentified: 'Yes'
				},
				{}
			);
			expect(payload.marketValue).toBeUndefined();
			expect(payload.registryValue).toBeUndefined();
			expect(payload.sellerCashComponent).toBeUndefined();
		});

		it('does NOT alias for LAP', () => {
			const payload = buildLoanTransactionPayload(
				{
					loanName: 'Loan Against Property',
					loanType: 'New Loan',
					mortgageYear: '15',
					propCost: ONE_CRORE,
					agreementSellValue: TWENTY_LAKH,
					numberOfDirectorOrApplicant: 1,
					propertyIdentified: 'Yes'
				},
				{}
			);
			expect(payload.marketValue).toBeUndefined();
			expect(payload.registryValue).toBeUndefined();
			expect(payload.sellerCashComponent).toBeUndefined();
		});
	});

	describe('Direct-write precedence (future form support)', () => {
		it('uses direct marketValue answer over propCost when both are present', () => {
			// Hypothetical future state: form binds directly to `marketValue`.
			// The direct answer must win; the `=== undefined` guard in the
			// payload builder is what makes this safe.
			const payload = buildLoanTransactionPayload(
				plotEquityAnswers({
					marketValue: 9_500_000, // ₹95L — distinct from propCost so we can tell
					propCost: ONE_CRORE
				}),
				{}
			);
			expect(payload.marketValue).toBe(9_500_000);
		});

		it('uses direct registryValue answer over agreementSellValue when both are present', () => {
			const payload = buildLoanTransactionPayload(
				plotEquityAnswers({
					registryValue: 1_800_000, // ₹18L — distinct from agreementSellValue
					agreementSellValue: TWENTY_LAKH
				}),
				{}
			);
			expect(payload.registryValue).toBe(1_800_000);
		});
	});

	describe('Degenerate input handling', () => {
		it('omits sellerCashComponent when registry == market (no gap)', () => {
			const payload = buildLoanTransactionPayload(
				plotEquityAnswers({
					propCost: ONE_CRORE,
					agreementSellValue: ONE_CRORE
				}),
				{}
			);
			expect(payload.marketValue).toBe(ONE_CRORE);
			expect(payload.registryValue).toBe(ONE_CRORE);
			expect(payload.sellerCashComponent).toBeUndefined();
		});

		it('omits sellerCashComponent when registry > market (defensive)', () => {
			// Pathological — registry should never exceed market — but defend
			// against negative cash-component values reaching the engine.
			const payload = buildLoanTransactionPayload(
				plotEquityAnswers({
					propCost: TWENTY_LAKH,
					agreementSellValue: ONE_CRORE
				}),
				{}
			);
			expect(payload.sellerCashComponent).toBeUndefined();
		});

		it('omits marketValue when propCost absent', () => {
			const answers = plotEquityAnswers();
			delete answers.propCost;
			const payload = buildLoanTransactionPayload(answers, {});
			expect(payload.marketValue).toBeUndefined();
			// registryValue should still come through from agreementSellValue
			expect(payload.registryValue).toBe(TWENTY_LAKH);
			// no market → no derived sellerCashComponent
			expect(payload.sellerCashComponent).toBeUndefined();
		});

		it('omits registryValue when agreementSellValue absent', () => {
			const answers = plotEquityAnswers();
			delete answers.agreementSellValue;
			const payload = buildLoanTransactionPayload(answers, {});
			expect(payload.marketValue).toBe(ONE_CRORE);
			expect(payload.registryValue).toBeUndefined();
			expect(payload.sellerCashComponent).toBeUndefined();
		});
	});
});
