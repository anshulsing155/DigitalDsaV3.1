/**
 * EMI Share Calculator Tests
 *
 * Validates parseBorrowerCount and computeApplicantEmiShare.
 */

import { describe, it, expect } from 'vitest';
import { parseBorrowerCount, computeApplicantEmiShare } from '$lib/utils/emiShareCalculator';

// ============================================================================
// parseBorrowerCount
// ============================================================================

describe('parseBorrowerCount', () => {
	it('returns 1 for empty string', () => {
		expect(parseBorrowerCount('')).toBe(1);
	});

	it('returns 1 for undefined', () => {
		expect(parseBorrowerCount(undefined)).toBe(1);
	});

	it('returns 1 for null', () => {
		expect(parseBorrowerCount(null)).toBe(1);
	});

	it('parses "2" → 2', () => {
		expect(parseBorrowerCount('2')).toBe(2);
	});

	it('parses "4+" → 4', () => {
		expect(parseBorrowerCount('4+')).toBe(4);
	});

	it('returns 1 for "0" (invalid)', () => {
		expect(parseBorrowerCount('0')).toBe(1);
	});

	it('parses "3" → 3', () => {
		expect(parseBorrowerCount('3')).toBe(3);
	});
});

// ============================================================================
// computeApplicantEmiShare
// ============================================================================

describe('computeApplicantEmiShare', () => {
	it('single borrower → full EMI', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '1',
			obligationType: 'term_loan'
		});
		expect(share).toBe(50000);
	});

	it('2 borrowers → EMI / 2', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});
		expect(share).toBe(25000);
	});

	it('3 borrowers → EMI / 3', () => {
		const share = computeApplicantEmiShare({
			emi: '30000',
			borrowerCount: '3',
			obligationType: 'term_loan'
		});
		expect(share).toBe(10000);
	});

	it('"4+" → EMI / 4', () => {
		const share = computeApplicantEmiShare({
			emi: '40000',
			borrowerCount: '4+',
			obligationType: 'term_loan'
		});
		expect(share).toBe(10000);
	});

	it('Guarantor → 0', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			role: 'Guarantor',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('Name Lender → 0', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			role: 'Name Lender',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('Full from co-borrower → 0', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			emiMethod: 'Full from co-borrower',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('Non-self emiPaidBy → 0', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '1',
			emiPaidBy: 'spouse',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('Proof override → overridden value', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			hasProofOverride: true,
			monthlyShare: '30000',
			obligationType: 'term_loan'
		});
		expect(share).toBe(30000);
	});

	it('Proof override with empty monthlyShare → fallback to equal split', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			hasProofOverride: true,
			monthlyShare: '',
			obligationType: 'term_loan'
		});
		expect(share).toBe(25000);
	});

	it('Credit line → totalLimit / count', () => {
		const share = computeApplicantEmiShare({
			totalLimit: '500000',
			borrowerCount: '2',
			obligationType: 'credit_line'
		});
		expect(share).toBe(250000);
	});

	it('Missing borrowerCount → defaults to 1 (full amount)', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			obligationType: 'term_loan'
		});
		expect(share).toBe(50000);
	});

	it('emiPaidBy = "self" → normal share calculation', () => {
		const share = computeApplicantEmiShare({
			emi: '50000',
			borrowerCount: '2',
			emiPaidBy: 'self',
			obligationType: 'term_loan'
		});
		expect(share).toBe(25000);
	});

	it('Guarantor takes precedence over borrowerCount', () => {
		const share = computeApplicantEmiShare({
			emi: '100000',
			borrowerCount: '1',
			role: 'Guarantor',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});

	it('zero EMI → 0 share', () => {
		const share = computeApplicantEmiShare({
			emi: '0',
			borrowerCount: '2',
			obligationType: 'term_loan'
		});
		expect(share).toBe(0);
	});
});
