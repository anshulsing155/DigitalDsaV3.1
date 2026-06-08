import { describe, it, expect } from 'vitest';
import {
	canonicalLoanName,
	isSecuredLoan,
	hasPropertyComponent,
	getMinimumLoanAmount,
	LOAN_TYPE_CONFIG
} from '$lib/ruleEngine/systemConfig';

/**
 * Plot Loan naming gap — regression lock for the 2026-05-28 audit finding.
 *
 * The form-side picker (`commonPage.json` + `plot-loan/+page.svelte`) sets
 * `loanName = 'Plot Loan'`. The engine-side `LOAN_TYPE_CONFIG` registers
 * the longer canonical `'Plot and Construction Loan'`. Without the
 * `canonicalLoanName` alias map, `isSecuredLoan('Plot Loan')` returned
 * `false` → engine treated every Plot Loan eval as unsecured → no LTV
 * cap, no RERA gate, no rule-doc matches in production PMS data.
 *
 * If these tests fail, either:
 * 1. The alias map in systemConfig.ts has been removed (regression), or
 * 2. The form-side label has been changed to the canonical form (in which
 *    case update this test to reflect the new contract — but verify the
 *    picker UI label still reads sensibly).
 */
describe('Plot Loan name alias resolution', () => {
	it("canonicalLoanName('Plot Loan') returns 'Plot and Construction Loan'", () => {
		expect(canonicalLoanName('Plot Loan')).toBe('Plot and Construction Loan');
	});

	it('canonicalLoanName is idempotent on the canonical form', () => {
		expect(canonicalLoanName('Plot and Construction Loan')).toBe('Plot and Construction Loan');
	});

	it('canonicalLoanName passes through other loan types untouched', () => {
		expect(canonicalLoanName('Home Loan')).toBe('Home Loan');
		expect(canonicalLoanName('Loan Against Property')).toBe('Loan Against Property');
		expect(canonicalLoanName('Personal Loan')).toBe('Personal Loan');
		expect(canonicalLoanName('Business Loan')).toBe('Business Loan');
		expect(canonicalLoanName('Professional Loan')).toBe('Professional Loan');
	});

	it('canonicalLoanName returns unknown names unchanged (no fallback to canonical)', () => {
		expect(canonicalLoanName('Made Up Loan')).toBe('Made Up Loan');
		expect(canonicalLoanName('')).toBe('');
	});

	it("isSecuredLoan('Plot Loan') === true (the dominant audit finding)", () => {
		expect(isSecuredLoan('Plot Loan')).toBe(true);
	});

	it("isSecuredLoan('Plot and Construction Loan') === true (canonical also works)", () => {
		expect(isSecuredLoan('Plot and Construction Loan')).toBe(true);
	});

	it("hasPropertyComponent('Plot Loan') === true", () => {
		expect(hasPropertyComponent('Plot Loan')).toBe(true);
	});

	it("getMinimumLoanAmount('Plot Loan') matches the canonical entry", () => {
		const aliasResult = getMinimumLoanAmount('Plot Loan');
		const canonicalResult = getMinimumLoanAmount('Plot and Construction Loan');
		expect(aliasResult).toBe(canonicalResult);
		expect(aliasResult).toBe(LOAN_TYPE_CONFIG['Plot and Construction Loan'].min_loan_amount);
	});

	it("unsecured loans correctly return false for isSecuredLoan", () => {
		expect(isSecuredLoan('Personal Loan')).toBe(false);
		expect(isSecuredLoan('Business Loan')).toBe(false);
		expect(isSecuredLoan('Professional Loan')).toBe(false);
	});

	it("unknown loan types correctly return false (default behavior preserved)", () => {
		expect(isSecuredLoan('Made Up Loan')).toBe(false);
		expect(hasPropertyComponent('Made Up Loan')).toBe(false);
		expect(getMinimumLoanAmount('Made Up Loan')).toBe(0);
	});
});
