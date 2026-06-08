/**
 * Tests for companyAutoDerive.ts — R4 Company-Individual Income Intelligence
 * ═══════════════════════════════════════════════════════════════════════════
 * Covers the decision tree for director/partner qualifying questions
 * and company lookup/dedup utilities.
 *
 * NOTE: Companies are NOT auto-created as co-applicants. The evaluator
 * only determines when company financials are needed for documentation.
 * DSAs manually add companies via the "Add Company" flow.
 */

import { describe, it, expect } from 'vitest';
import {
	evaluateCompanyFinancialsNeeded,
	findExistingCompanyApplicant,
	findOtherDirectorsForCompany
} from '$lib/utils/companyAutoDerive';

// ============================================================================
// evaluateCompanyFinancialsNeeded — Director Decision Tree
// ============================================================================

describe('evaluateCompanyFinancialsNeeded — Director', () => {
	it('foreign company → financials NOT needed, foreign_income treatment', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: false, foreignCountry: 'USA' },
			'GHI Inc'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('foreign_income');
	});

	it('OPC → financials NOT needed (captured inline with individual)', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'opc' },
			'OPC Corp'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('director_standard');
	});

	it('listed/large public → financials NOT needed, salaried treatment', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'listed_large_public' },
			'Reliance Ltd'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('salaried_treatment');
	});

	it('Indian Pvt Ltd + no equity (professional director) → financials NOT needed, salaried', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'pvt_ltd', hasEquity: false },
			'XYZ Pvt Ltd'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('salaried_treatment');
	});

	it('Indian Pvt Ltd + has equity → financials NEEDED for documentation', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{
				registeredInIndia: true,
				companyType: 'pvt_ltd',
				hasEquity: true,
				shareholding: 45,
				cin: 'U12345MH2020PTC123456'
			},
			'ABC Pvt Ltd'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.treatment).toBe('director_standard');
		expect(result.entityName).toBe('ABC Pvt Ltd');
		expect(result.entityType).toBe('Private Limited');
		expect(result.reason).toContain('income verification');
	});

	it('does NOT auto-create company as co-applicant (no companyData in return)', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'pvt_ltd', hasEquity: true },
			'ABC Pvt Ltd'
		);
		// The old interface had companyData — the new one does not
		expect((result as any).companyData).toBeUndefined();
	});

	it('Indian Public Ltd (unlisted) + has equity → financials NEEDED', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'public_ltd', hasEquity: true, shareholding: 25 },
			'DEF Public Ltd'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.entityType).toBe('Public Limited');
	});

	it('Section 8 company + has equity → financials NEEDED', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'section_8', hasEquity: true, shareholding: 10 },
			'Foundation NGO'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.entityType).toBe('Section 8');
	});

	it('incomplete qualifying answers → defaults to not needed', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'pvt_ltd' },
			'Incomplete Co'
		);
		// hasEquity is undefined → incomplete
		expect(result.financialsNeeded).toBe(false);
		expect(result.reason).toContain('incomplete');
	});
});

// ============================================================================
// evaluateCompanyFinancialsNeeded — Partner Decision Tree
// ============================================================================

describe('evaluateCompanyFinancialsNeeded — Partner', () => {
	it('foreign firm → financials NOT needed, foreign_income treatment', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{ registeredInIndia: false, foreignCountry: 'UK' },
			'London Partners LLP'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('foreign_income');
	});

	it('active partner in Indian partnership → financials NEEDED', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{
				registeredInIndia: true,
				firmType: 'partnership',
				partnerType: 'active',
				capitalContribution: 40
			},
			'Kumar & Associates'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.treatment).toBe('partner_standard');
		expect(result.entityType).toBe('Partnership Firm');
	});

	it('designated partner in Indian LLP → financials NEEDED', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{ registeredInIndia: true, firmType: 'llp', partnerType: 'designated' },
			'TechSoft LLP'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.entityType).toBe('LLP');
		expect(result.entityName).toBe('TechSoft LLP');
	});

	it('sleeping partner + profit share >30% → financials NEEDED', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{
				registeredInIndia: true,
				firmType: 'partnership',
				partnerType: 'sleeping',
				profitShareExceedsThreshold: true
			},
			'MNO & Co'
		);
		expect(result.financialsNeeded).toBe(true);
		expect(result.treatment).toBe('partner_standard');
	});

	it('sleeping partner + profit share <30% → financials NOT needed, passive income', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{
				registeredInIndia: true,
				firmType: 'llp',
				partnerType: 'sleeping',
				profitShareExceedsThreshold: false
			},
			'Minor Share LLP'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.treatment).toBe('passive_income');
	});

	it('sleeping partner + incomplete threshold → defaults to not needed', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{ registeredInIndia: true, firmType: 'partnership', partnerType: 'sleeping' },
			'Pending Firm'
		);
		expect(result.financialsNeeded).toBe(false);
		expect(result.reason).toContain('incomplete');
	});
});

// ============================================================================
// evaluateCompanyFinancialsNeeded — Other profile types
// ============================================================================

describe('evaluateCompanyFinancialsNeeded — Other profiles', () => {
	it('salaried profile → never needs company financials', () => {
		const result = evaluateCompanyFinancialsNeeded('salaried_regular', {}, 'Employer');
		expect(result.financialsNeeded).toBe(false);
	});

	it('business proprietorship → never needs company financials', () => {
		const result = evaluateCompanyFinancialsNeeded('business_proprietorship', {}, 'My Shop');
		expect(result.financialsNeeded).toBe(false);
	});
});

// ============================================================================
// Business rule: Companies are NEVER auto-created as co-applicants
// ============================================================================

describe('Company is documentation-only, never auto-created', () => {
	it('evaluation result has NO companyData (no auto-creation material)', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'director_company',
			{ registeredInIndia: true, companyType: 'pvt_ltd', hasEquity: true },
			'Some Company'
		);
		expect(result.financialsNeeded).toBe(true);
		// Old interface had companyData for auto-creation — removed
		expect('companyData' in result).toBe(false);
	});

	it('evaluation result has entityName and entityType for banner display', () => {
		const result = evaluateCompanyFinancialsNeeded(
			'business_partnership',
			{ registeredInIndia: true, firmType: 'llp', partnerType: 'designated' },
			'TechSoft LLP'
		);
		expect(result.entityName).toBe('TechSoft LLP');
		expect(result.entityType).toBe('LLP');
	});
});

// ============================================================================
// findExistingCompanyApplicant
// ============================================================================

describe('findExistingCompanyApplicant', () => {
	const applicants = [
		{ id: 'ind1', applicantType: 'Individual', fullName: 'Pramod Kumar' },
		{ id: 'co1', applicantType: 'Company', companyName: 'ABC Pvt Ltd' },
		{ id: 'co2', applicantType: 'Company', companyName: 'DEF LLP' }
	];

	it('finds exact name match', () => {
		const result = findExistingCompanyApplicant('ABC Pvt Ltd', applicants);
		expect(result.found).toBe(true);
		expect(result.companyId).toBe('co1');
		expect(result.companyIndex).toBe(1);
	});

	it('finds case-insensitive match', () => {
		const result = findExistingCompanyApplicant('abc pvt ltd', applicants);
		expect(result.found).toBe(true);
		expect(result.companyId).toBe('co1');
	});

	it('finds match with extra whitespace', () => {
		const result = findExistingCompanyApplicant('  ABC Pvt Ltd  ', applicants);
		expect(result.found).toBe(true);
	});

	it('returns not found for partial match', () => {
		const result = findExistingCompanyApplicant('ABC', applicants);
		expect(result.found).toBe(false);
	});

	it('returns not found for empty name', () => {
		const result = findExistingCompanyApplicant('', applicants);
		expect(result.found).toBe(false);
	});

	it('returns not found when no companies exist', () => {
		const result = findExistingCompanyApplicant('ABC Pvt Ltd', [
			{ id: 'ind1', applicantType: 'Individual', fullName: 'Someone' }
		]);
		expect(result.found).toBe(false);
	});

	it('ignores Individual applicants', () => {
		const result = findExistingCompanyApplicant('Pramod Kumar', applicants);
		expect(result.found).toBe(false);
	});
});

// ============================================================================
// findOtherDirectorsForCompany
// ============================================================================

describe('findOtherDirectorsForCompany', () => {
	const applicants = [
		{
			id: 'ind1',
			applicantType: 'Individual',
			fullName: 'Pramod',
			incomeEntries: [
				{
					profileType: 'director_company',
					entityName: 'ABC Pvt Ltd',
					specifics: { shareholding: 45 }
				}
			]
		},
		{
			id: 'ind2',
			applicantType: 'Individual',
			fullName: 'Nidhi',
			incomeEntries: [
				{
					profileType: 'director_company',
					entityName: 'ABC Pvt Ltd',
					specifics: { shareholding: 30 }
				},
				{
					profileType: 'salaried_regular',
					entityName: 'Some Employer',
					specifics: {}
				}
			]
		},
		{
			id: 'ind3',
			applicantType: 'Individual',
			fullName: 'Ravi',
			incomeEntries: [
				{
					profileType: 'director_company',
					entityName: 'XYZ Ltd',
					specifics: { shareholding: 10 }
				}
			]
		},
		{ id: 'co1', applicantType: 'Company', companyName: 'ABC Pvt Ltd' }
	];

	it('finds other directors for the same company', () => {
		// Exclude ind1, should find ind2
		const results = findOtherDirectorsForCompany('ABC Pvt Ltd', applicants, 'ind1');
		expect(results).toHaveLength(1);
		expect(results[0].applicantId).toBe('ind2');
		expect(results[0].fullName).toBe('Nidhi');
		expect(results[0].ownershipPercent).toBe(30);
	});

	it('case-insensitive company name matching', () => {
		const results = findOtherDirectorsForCompany('abc pvt ltd', applicants, 'ind1');
		expect(results).toHaveLength(1);
	});

	it('returns empty when no other directors found', () => {
		const results = findOtherDirectorsForCompany('XYZ Ltd', applicants, 'ind3');
		expect(results).toHaveLength(0);
	});

	it('skips Company applicants', () => {
		const results = findOtherDirectorsForCompany('ABC Pvt Ltd', applicants, 'ind1');
		// Should not include the Company applicant 'co1'
		expect(results.every((r) => r.applicantId !== 'co1')).toBe(true);
	});

	it('returns empty for unknown company', () => {
		const results = findOtherDirectorsForCompany('Unknown Co', applicants);
		expect(results).toHaveLength(0);
	});
});
