/**
 * Tests for lenderClassificationEvaluator.ts
 * ═══════════════════════════════════════════════════════════════════
 * Verifies per-lender classification overrides for the rule engine.
 * PVT/GOV/NBFC/HFC/SFB treat the same applicant differently.
 * Updated for 6-way classification system.
 */

import { describe, it, expect } from 'vitest';
import { evaluateClassificationsForLender } from '$lib/ruleEngine/lenderClassificationEvaluator';

// Helper: create a mock applicant
function makeApplicant(overrides: Record<string, unknown> = {}) {
	return {
		id: 'test-id',
		applicantType: 'Individual',
		onEMI: false,
		onProperty: false,
		isFamilyMember: false,
		ownershipPercent: 0,
		applicantClassification: 'co_applicant_non_financial',
		...overrides
	};
}

// ============================================================================
// Universal rules — these NEVER change per lender
// ============================================================================

describe('Universal rules (no overrides regardless of lender)', () => {
	it('primary applicant (index 0) is never overridden', () => {
		const applicants = [makeApplicant({ applicantClassification: 'co_applicant_financial' })];
		const overrides = evaluateClassificationsForLender(applicants, 'NBFC', true);
		expect(overrides.size).toBe(0);
	});

	it('onEMI=true applicant is never overridden', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({ onEMI: true, applicantClassification: 'co_applicant_financial' })
		];
		const overrides = evaluateClassificationsForLender(applicants, 'PVT', true);
		expect(overrides.size).toBe(0);
	});

	it('Professional Loan directors are never overridden', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				loanCategory: 'Professional Loan',
				applicantClassification: 'co_applicant_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});

	it('Partnership/LLP/OPC directors always financial — never overridden', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				companyType: 'Partnership Firm',
				applicantClassification: 'co_applicant_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'PVT', true);
		expect(overrides.size).toBe(0);
	});
});

// ============================================================================
// PVT — Strictest, no overrides
// ============================================================================

describe('PVT lender — no overrides from default', () => {
	it('non_applicant_full_financial stays as-is for PVT', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 25,
				applicantClassification: 'non_applicant_full_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'PVT', true);
		expect(overrides.size).toBe(0);
	});

	it('non_applicant_cibil_only stays as-is for PVT', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({ isFamilyMember: false, applicantClassification: 'non_applicant_cibil_only' })
		];
		const overrides = evaluateClassificationsForLender(applicants, 'PVT', true);
		expect(overrides.size).toBe(0);
	});

	it('guarantor_non_financial stays as-is for PVT', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({ isFamilyMember: false, applicantClassification: 'guarantor_non_financial' })
		];
		const overrides = evaluateClassificationsForLender(applicants, 'PVT', true);
		expect(overrides.size).toBe(0);
	});
});

// ============================================================================
// GOV / SFB — Lenient with family + significant stake
// ============================================================================

describe('GOV lender — upgrades family with significant stake', () => {
	it('family co_applicant_non_financial + >=20% stake → upgraded to co_applicant_financial', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 25,
				applicantClassification: 'co_applicant_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(1);
		expect(overrides.get(1)).toBe('co_applicant_financial');
	});

	it('family non_applicant_full_financial + >=20% stake → upgraded to co_applicant_financial', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 25,
				applicantClassification: 'non_applicant_full_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(1);
		expect(overrides.get(1)).toBe('co_applicant_financial');
	});

	it('family co_applicant_non_financial + <20% stake → no override', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 15,
				applicantClassification: 'co_applicant_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});

	it('non-family non_applicant_cibil_only stays unchanged for GOV', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: false,
				ownershipPercent: 30,
				applicantClassification: 'non_applicant_cibil_only'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});

	it('non-family guarantor_non_financial stays unchanged even for GOV', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: false,
				ownershipPercent: 30,
				applicantClassification: 'guarantor_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});
});

describe('SFB lender — same lenient rules as GOV', () => {
	it('family co_applicant_non_financial + >=20% stake → upgraded', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 20,
				applicantClassification: 'co_applicant_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'SFB', true);
		expect(overrides.get(1)).toBe('co_applicant_financial');
	});

	it('family non_applicant_full_financial + >=20% stake → upgraded for SFB', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 25,
				applicantClassification: 'non_applicant_full_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'SFB', true);
		expect(overrides.get(1)).toBe('co_applicant_financial');
	});
});

// ============================================================================
// NBFC / HFC — Already lenient, no upgrades needed
// ============================================================================

describe('NBFC lender — no overrides (already lenient default)', () => {
	it('non_applicant_full_financial stays as-is for NBFC', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 30,
				applicantClassification: 'non_applicant_full_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'NBFC', true);
		expect(overrides.size).toBe(0);
	});

	it('non_applicant_cibil_only stays as-is for NBFC', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: false,
				applicantClassification: 'non_applicant_cibil_only'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'NBFC', true);
		expect(overrides.size).toBe(0);
	});
});

// ============================================================================
// Edge cases
// ============================================================================

describe('Edge cases', () => {
	it('empty applicant list → empty overrides', () => {
		const overrides = evaluateClassificationsForLender([], 'PVT', true);
		expect(overrides.size).toBe(0);
	});

	it('applicant without stored classification → skipped', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({ applicantClassification: undefined })
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});

	it('financial co-applicant is not overridden', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				applicantClassification: 'co_applicant_financial',
				onEMI: false,
				onProperty: false
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.size).toBe(0);
	});

	it('GOV upgrades guarantor_non_financial family → guarantor_financial', () => {
		const applicants = [
			makeApplicant({ applicantClassification: 'co_applicant_financial' }),
			makeApplicant({
				isFamilyMember: true,
				ownershipPercent: 25,
				applicantClassification: 'guarantor_non_financial'
			})
		];
		const overrides = evaluateClassificationsForLender(applicants, 'GOV', true);
		expect(overrides.get(1)).toBe('guarantor_financial');
	});
});
