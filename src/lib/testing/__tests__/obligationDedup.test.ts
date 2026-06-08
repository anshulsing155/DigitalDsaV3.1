/**
 * Obligation Dedup Detection Tests
 * ═══════════════════════════════════════════════════════════════════
 * Phase 5: Cross-applicant obligation duplicate detection.
 * ═══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import { detectObligationDuplicates, type ObligationDupWarning } from '$lib/utils/obligationDedup';

describe('Phase 5: Obligation Dedup Detection', () => {
	describe('detectObligationDuplicates', () => {
		it('Same person, 2 entries, same lender → warning', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Rajesh Kumar',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Rajesh Kumar',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].personName).toBe('Rajesh Kumar');
			expect(warnings[0].lender).toBe('hdfc bank');
			expect(warnings[0].applicantIndexes).toEqual([0, 1]);
		});

		it('Same person, 2 entries, different lenders → no warning', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Rajesh Kumar',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Rajesh Kumar',
					tableLoanEntries: [{ lenderName: 'ICICI Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(0);
		});

		it('Different persons, same lender → no warning', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Rajesh Kumar',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Suresh Kumar',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(0);
		});

		it('Company applicants are excluded', () => {
			const applicants = [
				{
					applicantType: 'Company',
					fullName: 'ABC Pvt Ltd',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				},
				{
					applicantType: 'Company',
					fullName: 'ABC Pvt Ltd',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(0);
		});

		it('Name normalization: case-insensitive + whitespace', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: '  Rajesh  Kumar  ',
					tableLoanEntries: [{ lenderName: 'SBI' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'rajesh kumar',
					tableLoanEntries: [{ lenderName: 'SBI' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
		});

		it('Handles legacy obligations array', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					obligations: [{ bankName: 'Axis Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					obligations: [{ bankName: 'Axis Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
		});

		it('Handles tableLimitEntries (credit cards)', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLimitEntries: [{ lenderName: 'Kotak Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLimitEntries: [{ lenderName: 'Kotak Bank' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
		});

		it('Multiple lenders, only one overlapping → one warning', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }, { lenderName: 'ICICI Bank' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }, { lenderName: 'SBI' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].lender).toBe('hdfc bank');
		});

		it('No obligations → no warnings', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User'
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User'
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(0);
		});

		it('Empty applicants array → no warnings', () => {
			expect(detectObligationDuplicates([])).toHaveLength(0);
		});

		it('Single applicant → no warnings', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLoanEntries: [{ lenderName: 'HDFC Bank' }]
				}
			];
			expect(detectObligationDuplicates(applicants)).toHaveLength(0);
		});

		it('3 entries for same person and lender → one warning with 3 indexes', () => {
			const applicants = [
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLoanEntries: [{ lenderName: 'SBI' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					tableLoanEntries: [{ lenderName: 'SBI' }]
				},
				{
					applicantType: 'Individual',
					fullName: 'Test User',
					obligations: [{ bank: 'SBI' }]
				}
			];
			const warnings = detectObligationDuplicates(applicants);
			expect(warnings).toHaveLength(1);
			expect(warnings[0].applicantIndexes).toHaveLength(3);
		});
	});
});
