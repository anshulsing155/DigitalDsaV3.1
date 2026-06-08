import { describe, it, expect } from 'vitest';
import { buildLoanTransactionPayload } from '$lib/utils/payloadBuilder/loanTransaction.js';

/**
 * Regression guard for Problem 1 (A2): stale property data must not leak into the
 * payload when the user runs the sanction-letter view (Home Loan, propertyIdentified
 * = "No"). The bug: property cost is preserved in the form (hide-not-delete), so a
 * cost left over from a prior "Yes" run was deriving a stale loanAmount and LTV cap —
 * producing a wrong top-row Amount/EMI.
 *
 * Plot Loan + LAP forced to `true` (2026-06-02, LEND-1): neither form asks the
 * question because the property is the loan target (LAP) or the loan target by
 * variant (all four Plot variants). The payload now forces `propertyIdentified: true`
 * for both loan families at `loanTransaction.ts` so downstream consumers reading
 * the boolean as "is there a real property?" don't silently miss Plot/LAP deals.
 * The sanction-letter view's `propertyNotIdentified` flag keys off the EXPLICIT "No"
 * answer (Home Loan only), independent of this boolean.
 */

describe('buildLoanTransactionPayload — sanction-letter view excludes property data', () => {
	it('Home Loan + propertyIdentified="No": no propertyCost, no property-derived loanAmount', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				propertyIdentified: 'No',
				// preserved from a prior "Yes" run — must be ignored
				propCost: '5500000',
				deposit: '1000000'
			},
			{ loanName: 'Home Loan' }
		);

		expect(payload.propertyCost).toBeUndefined();
		// loanAmount must NOT be back-derived from the stale property cost
		expect(payload.loanAmount).toBe(0);
		expect(payload.propertyIdentified).toBe(false);
	});

	it('Home Loan + propertyIdentified="Yes": keeps propertyCost and derives loanAmount', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				propertyIdentified: 'Yes',
				propCost: '5500000',
				deposit: '1000000'
			},
			{ loanName: 'Home Loan' }
		);

		expect(payload.propertyCost).toBe(5_500_000);
		// cost - downpayment when no explicit loan amount
		expect(payload.loanAmount).toBe(4_500_000);
		expect(payload.propertyIdentified).toBe(true);
	});

	it('LAP (never asks property identified): forced to true, keeps propertyCost + derived loanAmount', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				// no propertyIdentified answer in the form — payload forces true
				propertyCost: '8000000'
			},
			{ loanName: 'Loan Against Property' }
		);

		// Forced true per LEND-1 (2026-06-02): LAP always identifies its collateral.
		// The explicit-"No" sanction-letter guard does NOT fire here (HL-only).
		expect(payload.propertyIdentified).toBe(true);
		expect(payload.propertyCost).toBe(8_000_000);
		expect(payload.loanAmount).toBe(8_000_000);
	});

	it('Plot Loan (never asks property identified): forced to true for all variants', () => {
		for (const loanVariant of [
			'Plot Loan Only',
			'Plot & Construction Loan',
			'Plot & Equity Loan',
			'Construction Loan Only'
		]) {
			const payload = buildLoanTransactionPayload(
				{
					loanType: 'New Loan',
					loanVariant,
					// no propertyIdentified answer in the form — payload forces true
					propCost: '5000000'
				},
				{ loanName: 'Plot Loan' }
			);

			expect(payload.propertyIdentified, `variant=${loanVariant}`).toBe(true);
		}
	});

	it('Home Loan with no answer (unchanged): coerced to false', () => {
		// Home Loan still reads its explicit Yes/No answer. With no answer, the
		// coercion path returns false — unchanged by the Plot/LAP force-true fix.
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				propCost: '6000000'
			},
			{ loanName: 'Home Loan' }
		);

		expect(payload.propertyIdentified).toBe(false);
	});
});
