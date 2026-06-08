import { describe, it, expect } from 'vitest';
import { buildLoanTransactionPayload } from '$lib/utils/payloadBuilder/loanTransaction.js';

/**
 * Audit BUG-A regression — BT / Top-up / BT+Top-up loanAmount sizing.
 *
 * Before the fix, `loanTransaction.ts` derived `loanAmount` from the chain
 * `RequiredLoanAmount ?? loanAmount ?? sanctionAmount`. For BT-Only none of
 * these were set → fell back to `propertyCost - downPayment` → evaluated the
 * full property value. For Top-up Only fell back to `sanctionAmount` (the
 * ORIGINAL home-loan sanction, e.g. ₹50L) instead of the actual top-up
 * (e.g. ₹10L). Result: FOIR calcs ran against wildly wrong amounts → false
 * RED rejections across all lenders.
 *
 * These tests lock the type-aware sizing:
 *   • BT-Only         → principalOutstanding
 *   • Top-up Only     → topUpAmount
 *   • BT + Top-up     → principalOutstanding + topUpAmount
 *   • Plot BT (PlotLoanActivity flag) → principalOutstanding
 *
 * Plus the Plot Construction sizing variants:
 *   • Construction Only      → requiredExtraAmount - deposit
 *   • Plot & Construction    → propCost + requiredExtraAmount - deposit
 *
 * Also locks propertyCost (LTV base):
 *   • Plot & Construction    → propCost + requiredExtraAmount
 *   • Construction Only      → requiredExtraAmount
 */

describe('BT/Top-up loanAmount sizing (Audit BUG-A)', () => {
	it('Balance Transfer Only → loanAmount equals principalOutstanding', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'Balance Transfer Only',
				principalOutstanding: 3000000,
				// these MUST be ignored for BT-Only sizing
				sanctionAmount: 5000000,
				currentPropertyValue: 6000000,
				propCost: 6000000
			},
			{ loanName: 'Home Loan' }
		);
		expect(payload.loanAmount).toBe(3000000);
	});

	it('Top-up Only → loanAmount equals topUpAmount (not original sanctionAmount)', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'Top-up Only',
				topUpAmount: 1000000,
				// audit's exact false-fallback: ₹50L original sanction must NOT leak through
				sanctionAmount: 5000000,
				principalOutstanding: 3000000
			},
			{ loanName: 'Home Loan' }
		);
		expect(payload.loanAmount).toBe(1000000);
	});

	it('Balance Transfer With Top-up → loanAmount equals principalOutstanding + topUpAmount', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'Balance Transfer With Top-up',
				principalOutstanding: 3000000,
				topUpAmount: 1000000,
				sanctionAmount: 5000000 // must NOT leak through
			},
			{ loanName: 'Home Loan' }
		);
		expect(payload.loanAmount).toBe(4000000);
	});

	it('Plot Loan BT (scope=Balance Transfer Only) → loanAmount equals principalOutstanding', () => {
		// Post-rename: Plot scope lives in loanType (was PlotLoanActivity).
		// Variant lives in loanVariant — but for BT there's no variant question,
		// so loanVariant stays empty. Sizing only needs the unified loanType.
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'Balance Transfer Only',
				loanVariant: '',
				principalOutstanding: 1500000,
				currentPropertyValue: 2500000,
				propCost: 2000000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.loanAmount).toBe(1500000);
	});

	it('New Loan with RequiredLoanAmount → loanAmount uses the request as before (no regression)', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				RequiredLoanAmount: 4500000,
				propCost: 6000000
			},
			{ loanName: 'Home Loan' }
		);
		expect(payload.loanAmount).toBe(4500000);
	});
});

describe('Plot Construction loanAmount + propertyCost sizing (Audit, 2026-05-28)', () => {
	it('Construction Loan Only → loanAmount = requiredExtraAmount - deposit', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				loanVariant: 'Construction Loan Only',
				propCost: 4500000, // plot value — already owned, not the funded amount
				requiredExtraAmount: 2500000, // construction cost
				deposit: 1000000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.loanAmount).toBe(1500000); // 25L - 10L
	});

	it('Construction Loan Only → propertyCost = requiredExtraAmount (not plot value)', () => {
		// LTV base for Construction Only is the construction cost alone — the
		// plot is already owned and not security for THIS new loan.
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				loanVariant: 'Construction Loan Only',
				propCost: 4500000,
				requiredExtraAmount: 2500000,
				deposit: 1000000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.propertyCost).toBe(2500000);
	});

	it('Plot & Construction Loan → loanAmount = propCost + requiredExtraAmount - deposit', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				loanVariant: 'Plot & Construction Loan',
				propCost: 3800000, // plot price
				requiredExtraAmount: 2500000, // construction cost
				deposit: 800000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.loanAmount).toBe(5500000); // 38L + 25L - 8L
	});

	it('Plot & Construction Loan → propertyCost = propCost + requiredExtraAmount (full project value)', () => {
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				loanVariant: 'Plot & Construction Loan',
				propCost: 3800000,
				requiredExtraAmount: 2500000,
				deposit: 800000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.propertyCost).toBe(6300000); // 38L + 25L
	});

	it('Plot Loan Only (no construction) → propertyCost = propCost only', () => {
		// Sanity: non-construction Plot variants preserve the old behavior.
		const payload = buildLoanTransactionPayload(
			{
				loanType: 'New Loan',
				loanVariant: 'Plot Loan Only',
				propCost: 3200000,
				deposit: 700000
			},
			{ loanName: 'Plot Loan' }
		);
		expect(payload.propertyCost).toBe(3200000);
	});
});
