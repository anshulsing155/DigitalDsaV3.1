/**
 * Director firm-name combobox option-assembly tests.
 *
 * Locks the contract of `assembleFirmNameOptions` so future changes
 * can't silently reorder the dropdown, drop dedup, or change suffixes
 * in ways the FirmNameCombobox component depends on.
 *
 * Spec: docs/specs/DIRECTOR-FIRM-NAME-SPEC.md §3
 */

import { describe, it, expect } from 'vitest';
import { assembleFirmNameOptions } from '$lib/utils/firmNameOptions';

describe('assembleFirmNameOptions', () => {
	it('returns empty list when no applicants', () => {
		const result = assembleFirmNameOptions([], 'me');
		expect(result).toEqual([]);
	});

	it('returns empty list when no Partnership/LLP companies AND no partnership income entries', () => {
		const result = assembleFirmNameOptions(
			[
				{ id: 'a', applicantType: 'Individual', incomeEntries: [] },
				{ id: 'b', applicantType: 'Company', companyType: 'Private Limited', companyName: 'Acme Pvt' }
			],
			'a'
		);
		expect(result).toEqual([]);
	});

	it('surfaces a Partnership Firm with "(this firm)" suffix as the first option', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'a',
					applicantType: 'Company',
					companyType: 'Partnership Firm',
					companyName: 'Acme Trading'
				},
				{ id: 'b', applicantType: 'Individual', incomeEntries: [] }
			],
			'b'
		);
		expect(result.length).toBe(1);
		expect(result[0].label).toBe('Acme Trading (this firm)');
		expect(result[0].value).toBe('Acme Trading');
	});

	it('surfaces an LLP with "(this firm)" suffix', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'a',
					applicantType: 'Company',
					companyType: 'LLP',
					companyName: 'Acme LLP'
				}
			],
			undefined
		);
		expect(result.length).toBe(1);
		expect(result[0].label).toBe('Acme LLP (this firm)');
	});

	it('does NOT surface a Private Limited or OPC company', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'a',
					applicantType: 'Company',
					companyType: 'Private Limited',
					companyName: 'PrivCo'
				},
				{
					id: 'b',
					applicantType: 'Company',
					companyType: 'One Person Company (OPC)',
					companyName: 'OPCCo'
				}
			],
			undefined
		);
		expect(result).toEqual([]);
	});

	it('adds sibling-declared firms (without suffix) after the parent', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'parent',
					applicantType: 'Company',
					companyType: 'Partnership Firm',
					companyName: 'Acme'
				},
				{
					id: 'sibling',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'business_partnership', entityName: 'Beta Industries' }
					]
				},
				{ id: 'me', applicantType: 'Individual', incomeEntries: [] }
			],
			'me'
		);
		expect(result.map((r) => r.value)).toEqual(['Acme', 'Beta Industries']);
		expect(result[0].label).toBe('Acme (this firm)');
		expect(result[1].label).toBe('Beta Industries');
	});

	it('adds current applicant own prior entries with "(already added)" suffix LAST', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'parent',
					applicantType: 'Company',
					companyType: 'Partnership Firm',
					companyName: 'Acme'
				},
				{
					id: 'me',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'business_partnership', entityName: 'Gamma Co' }
					]
				}
			],
			'me'
		);
		expect(result.map((r) => r.value)).toEqual(['Acme', 'Gamma Co']);
		expect(result[1].label).toBe('Gamma Co (already added)');
	});

	it('dedupes case-insensitive and whitespace-insensitive', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'parent',
					applicantType: 'Company',
					companyType: 'Partnership Firm',
					companyName: 'Acme Trading'
				},
				{
					id: 'sibling',
					applicantType: 'Individual',
					incomeEntries: [
						// Same firm, different spacing + case
						{ profileType: 'business_partnership', entityName: 'acme  trading' }
					]
				}
			],
			'me'
		);
		expect(result.length).toBe(1);
		expect(result[0].label).toBe('Acme Trading (this firm)');
	});

	it('ignores non-business_partnership income entries from siblings', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'sibling',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'salaried', entityName: 'My Employer' },
						{ profileType: 'business_partnership', entityName: 'Real Firm' }
					]
				}
			],
			'me'
		);
		expect(result.map((r) => r.value)).toEqual(['Real Firm']);
	});

	it('ignores entries with empty entityName', () => {
		const result = assembleFirmNameOptions(
			[
				{
					id: 'sibling',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'business_partnership', entityName: '' },
						{ profileType: 'business_partnership' } // missing entityName entirely
					]
				}
			],
			'me'
		);
		expect(result).toEqual([]);
	});

	it('does NOT include the current applicant in the sibling pass (only in self-pass)', () => {
		// "Self entry" check: a firm declared by the current applicant
		// should appear with the "(already added)" suffix, not the bare label.
		const result = assembleFirmNameOptions(
			[
				{
					id: 'me',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'business_partnership', entityName: 'My Firm' }
					]
				}
			],
			'me'
		);
		expect(result.length).toBe(1);
		expect(result[0].label).toBe('My Firm (already added)');
	});

	it('parent firm dedups out a self-entry with the same name', () => {
		// Edge case: current applicant has already declared the parent
		// firm. Parent should still win (label "(this firm)") — the
		// self-entry dedup is silent.
		const result = assembleFirmNameOptions(
			[
				{
					id: 'parent',
					applicantType: 'Company',
					companyType: 'Partnership Firm',
					companyName: 'Acme'
				},
				{
					id: 'me',
					applicantType: 'Individual',
					incomeEntries: [
						{ profileType: 'business_partnership', entityName: 'Acme' }
					]
				}
			],
			'me'
		);
		expect(result.length).toBe(1);
		expect(result[0].label).toBe('Acme (this firm)');
	});
});
