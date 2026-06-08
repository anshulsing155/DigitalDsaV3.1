/**
 * Borrowing-firm declaration validation tests.
 *
 * Locks the contract of `checkBorrowingFirmDeclaration` — the
 * Partnership/LLP rule that requires at least one linked partner to
 * declare partner-income from the borrowing firm itself.
 *
 * Spec: docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §6
 */

import { describe, it, expect } from 'vitest';
import { checkBorrowingFirmDeclaration } from '$lib/utils/directorFormUtils';

const COMPANY_ID = 'company-acme';

describe('checkBorrowingFirmDeclaration', () => {
	it('returns valid:true silently when companyName is empty', () => {
		const result = checkBorrowingFirmDeclaration('', COMPANY_ID, []);
		expect(result.valid).toBe(true);
		expect(result.missingDirectorNames).toEqual([]);
	});

	it('returns valid:true silently when no Individuals are linked yet', () => {
		// Validation is not applicable until partners exist.
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: COMPANY_ID,
				applicantType: 'Company'
			}
		]);
		expect(result.valid).toBe(true);
		expect(result.missingDirectorNames).toEqual([]);
	});

	it('returns valid:true when at least one linked partner declares the borrowing firm', () => {
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Rajesh Kumar',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'business_partnership', entityName: 'Acme Trading' }
				]
			},
			{
				id: 'partner-2',
				applicantType: 'Individual',
				fullName: 'Priya Sharma',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: []
			}
		]);
		expect(result.valid).toBe(true);
		expect(result.missingDirectorNames).toEqual([]);
	});

	it('returns valid:false with missing names when no partner declares the borrowing firm', () => {
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Rajesh Kumar',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: []
			},
			{
				id: 'partner-2',
				applicantType: 'Individual',
				fullName: 'Priya Sharma',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'business_partnership', entityName: 'Different Firm' }
				]
			}
		]);
		expect(result.valid).toBe(false);
		expect(result.missingDirectorNames).toEqual(['Rajesh Kumar', 'Priya Sharma']);
	});

	it('uses "Unnamed partner" placeholder when fullName is missing', () => {
		const result = checkBorrowingFirmDeclaration('Acme', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: []
			}
		]);
		expect(result.valid).toBe(false);
		expect(result.missingDirectorNames).toEqual(['Unnamed partner']);
	});

	it('normalizes whitespace + case when comparing firm names', () => {
		// Stored declaration: " ACME  TRADING " (extra spaces + caps)
		// Borrowing firm: "Acme Trading"
		// Should match.
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Sole Partner',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'business_partnership', entityName: ' ACME  TRADING ' }
				]
			}
		]);
		expect(result.valid).toBe(true);
	});

	it('ignores non-business_partnership income entries', () => {
		// Even if there's a salaried entry with name "Acme Trading"
		// (e.g. employer name), it does NOT count for the declaration.
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Sole Partner',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'salaried', entityName: 'Acme Trading' }
				]
			}
		]);
		expect(result.valid).toBe(false);
	});

	it('ignores applicants not linked to the borrowing firm', () => {
		// Another Individual has the declaration but isn't linked to
		// this company — doesn't count.
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Linked Partner',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: []
			},
			{
				id: 'unlinked',
				applicantType: 'Individual',
				fullName: 'Unlinked',
				linkedCompanyIds: [],
				incomeEntries: [
					{ profileType: 'business_partnership', entityName: 'Acme Trading' }
				]
			}
		]);
		expect(result.valid).toBe(false);
		expect(result.missingDirectorNames).toEqual(['Linked Partner']);
	});

	it('ignores Company applicants in the linked check', () => {
		// Companies can't "declare partner-income" — only Individuals.
		// Even if a Company has linkedCompanyIds matching, it doesn't
		// satisfy the rule.
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'company-other',
				applicantType: 'Company',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'business_partnership', entityName: 'Acme Trading' }
				]
			}
		]);
		// No linked Individuals → validation not applicable yet → valid: true
		expect(result.valid).toBe(true);
		expect(result.missingDirectorNames).toEqual([]);
	});

	it('partner with multiple income entries — any one matching is enough', () => {
		const result = checkBorrowingFirmDeclaration('Acme Trading', COMPANY_ID, [
			{
				id: 'partner-1',
				applicantType: 'Individual',
				fullName: 'Multi-Earner',
				linkedCompanyIds: [COMPANY_ID],
				incomeEntries: [
					{ profileType: 'salaried', entityName: 'Day Job' },
					{ profileType: 'business_partnership', entityName: 'Beta Industries' },
					{ profileType: 'business_partnership', entityName: 'Acme Trading' }
				]
			}
		]);
		expect(result.valid).toBe(true);
	});
});
