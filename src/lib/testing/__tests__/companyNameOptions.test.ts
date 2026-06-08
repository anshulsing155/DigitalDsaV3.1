import { describe, it, expect } from 'vitest';
import { assembleCompanyNameOptions } from '$lib/utils/companyNameOptions';

/**
 * Regression guard for Problem 2 (director income auto-fill): the
 * Director-in-Company combobox lists the case's director-eligible Company
 * applicants so a director picks the REAL company (linking + auto-fill) instead
 * of free-typing a name that conflicts with the actual applicant.
 */

describe('assembleCompanyNameOptions', () => {
	it('lists director-eligible Company applicants (Pvt Ltd / OPC / Public Ltd / Section 8)', () => {
		const applicants = [
			{ id: 'c1', applicantType: 'Company', companyType: 'Private Limited', companyName: 'Acme Pvt Ltd' },
			{ id: 'c2', applicantType: 'Company', companyType: 'One Person Company (OPC)', companyName: 'Sweets Corner' },
			{ id: 'i1', applicantType: 'Individual', fullName: 'Rampal' }
		];
		const opts = assembleCompanyNameOptions(applicants);
		expect(opts.map((o) => o.value)).toEqual(['Acme Pvt Ltd', 'Sweets Corner']);
		expect(opts[0]).toMatchObject({ companyId: 'c1', companyType: 'Private Limited' });
	});

	it('excludes partnership/LLP companies (those use the firm combobox)', () => {
		const applicants = [
			{ id: 'c1', applicantType: 'Company', companyType: 'Partnership Firm', companyName: 'Partners & Co' },
			{ id: 'c2', applicantType: 'Company', companyType: 'LLP', companyName: 'Build LLP' },
			{ id: 'c3', applicantType: 'Company', companyType: 'Private Limited', companyName: 'Acme Pvt Ltd' }
		];
		const opts = assembleCompanyNameOptions(applicants);
		expect(opts.map((o) => o.value)).toEqual(['Acme Pvt Ltd']);
	});

	it('carries registrationCountry and dedupes by name', () => {
		const applicants = [
			{ id: 'c1', applicantType: 'Company', companyType: 'Private Limited', companyName: 'Acme', registrationCountry: 'Foreign' },
			{ id: 'c2', applicantType: 'Company', companyType: 'Private Limited', companyName: 'acme' } // dup (case-insensitive)
		];
		const opts = assembleCompanyNameOptions(applicants);
		expect(opts).toHaveLength(1);
		expect(opts[0].registrationCountry).toBe('Foreign');
	});

	it('skips companies missing a name or id', () => {
		const applicants = [
			{ id: '', applicantType: 'Company', companyType: 'Private Limited', companyName: 'NoId' },
			{ id: 'c2', applicantType: 'Company', companyType: 'Private Limited', companyName: '' }
		];
		expect(assembleCompanyNameOptions(applicants)).toHaveLength(0);
	});

	it('returns empty when there are no company applicants', () => {
		expect(assembleCompanyNameOptions([{ id: 'i1', applicantType: 'Individual', fullName: 'Solo' }])).toHaveLength(0);
	});
});
