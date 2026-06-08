import { describe, it, expect } from 'vitest';
import { buildLoanTransaction } from '$lib/utils/loanPayload.js';

/**
 * Audit BUG-B regression — BT-Only and BT+Top-up base tenure mapping.
 *
 * Before the fix, `loanPayload.ts` mapped `mortgageYear = Number(currentAnswers?.newTenure)`
 * but `newTenure` is a dead form key (removed in V2). Value resolved to NaN/0,
 * server-side `determineEffectiveTenure(0, ...)` floored to 12 months, every BT
 * EMI was computed over 1 year, FOIR blew past the cap, every lender RED'd.
 *
 * Fix: derive `mortgageYear` from `remainingTenure` (in months, ÷12 → years).
 */

describe('BT tenure mapping (Audit BUG-B)', () => {
	it('Balance Transfer Only → mortgageYear = remainingTenure / 12', () => {
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Balance Transfer Only',
			remainingTenure: 180, // 15 years
			principalOutstanding: 3000000
		});
		expect(payload.mortgageYear).toBe(15);
	});

	it('Balance Transfer Only with no remainingTenure → mortgageYear = 0 (falls through to engine default)', () => {
		// Defensive: if the form somehow submits without remainingTenure, send 0
		// rather than crashing. The engine's determineEffectiveTenure will then
		// use the lender's max tenure based on age. (Note: this still loses the
		// user's stated preference, but it's better than the previous behavior
		// which silently floored to 12 months.)
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Balance Transfer Only',
			principalOutstanding: 3000000
		});
		expect(payload.mortgageYear).toBe(0);
	});

	it('Balance Transfer With Top-up → mortgageYear = remainingTenure / 12 (base BT tenure)', () => {
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Balance Transfer With Top-up',
			remainingTenure: 180,
			topUpTenure: 25, // separate field, base tenure is still from remainingTenure
			principalOutstanding: 3000000,
			topUpAmount: 1000000
		});
		expect(payload.mortgageYear).toBe(15);
	});

	it('Balance Transfer With Top-up: top-up tenure is preserved separately', () => {
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Balance Transfer With Top-up',
			remainingTenure: 180,
			topUpTenure: 25,
			principalOutstanding: 3000000,
			topUpAmount: 1000000
		});
		expect(payload.topUpTenure).toBe(25);
	});

	it('Balance Transfer Only: rounds half-tenure correctly', () => {
		// 178 months / 12 = 14.833... → rounds to 15
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Balance Transfer Only',
			remainingTenure: 178,
			principalOutstanding: 3000000
		});
		expect(payload.mortgageYear).toBe(15);
	});

	it('Top-up Only: tenure path unchanged (already used live `topUpTenure` key, not dead `newTenure`)', () => {
		const payload = buildLoanTransaction({
			loanName: 'Home Loan',
			loanType: 'Top-up Only',
			topUpTenure: 15,
			topUpAmount: 1000000,
			principalOutstanding: 3000000
		});
		expect(payload.mortgageYear).toBe(15);
	});
});
