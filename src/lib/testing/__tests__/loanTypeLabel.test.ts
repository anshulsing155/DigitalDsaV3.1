/**
 * loanTypeLabel — Audit B.2.
 * Covers the real spread of stored `loan.type` values (verified against the dev
 * cases collection 2026-05-21): mostly human strings, a few raw enums, and
 * variant strings.
 */

import { describe, it, expect } from 'vitest';
import { loanTypeLabel } from '$lib/config/loanTypeLabels';

describe('loanTypeLabel', () => {
	it('canonicalises raw enum forms', () => {
		expect(loanTypeLabel('home_loan')).toBe('Home Loan');
		expect(loanTypeLabel('lap')).toBe('Loan Against Property');
		expect(loanTypeLabel('plot_loan')).toBe('Plot & Construction Loan');
		expect(loanTypeLabel('personal_loan')).toBe('Personal Loan');
		expect(loanTypeLabel('business_loan')).toBe('Business Loan');
		expect(loanTypeLabel('professional_loan')).toBe('Professional Loan');
	});

	it('is idempotent on already-human values', () => {
		expect(loanTypeLabel('Home Loan')).toBe('Home Loan');
		expect(loanTypeLabel('Personal Loan')).toBe('Personal Loan');
		expect(loanTypeLabel('Business Loan')).toBe('Business Loan');
		// "Loan Against Property" is stored human; must not get re-mapped or mangled.
		expect(loanTypeLabel('Loan Against Property')).toBe('Loan Against Property');
	});

	it('passes legitimate variant strings through (tidied), per display-only decision', () => {
		expect(loanTypeLabel('Plot Loan Only')).toBe('Plot Loan Only');
		expect(loanTypeLabel('Construction Loan Only')).toBe('Construction Loan Only');
		expect(loanTypeLabel('Balance Transfer')).toBe('Balance Transfer');
		expect(loanTypeLabel('Plot & Construction Loan')).toBe('Plot & Construction Loan');
	});

	it('title-cases unknown/legacy enums instead of leaking raw snake_case', () => {
		expect(loanTypeLabel('some_new_loan')).toBe('Some New Loan');
		expect(loanTypeLabel('gold-loan')).toBe('Gold Loan');
	});

	it('handles null/undefined/empty safely', () => {
		expect(loanTypeLabel(null)).toBe('');
		expect(loanTypeLabel(undefined)).toBe('');
		expect(loanTypeLabel('')).toBe('');
	});
});
