/**
 * Tests for 6-way applicant classification system.
 *
 * Classification:
 *   co_applicant_financial       — on EMI (liable for repayment), full assessment
 *   co_applicant_non_financial   — on property only (NBFC), profile + CIBIL
 *   guarantor_financial          — independent financial assessment (≥20% stake + non-family)
 *   non_applicant_full_financial — family Both=No, lender needs full financial verification
 *   non_applicant_cibil_only     — non-family Both=No, just KYC + CIBIL check
 *   guarantor_non_financial      — DSA override only (police/defense/lawyer), profile only
 */
import { describe, it, expect } from 'vitest';
import {
	deriveApplicantClassification,
	classificationToLegacyRole,
	getClassificationLabel,
	getClassificationBadgeColor,
	getRequiredTabsForClassification,
	isFamilyRelationship,
	getGuarantorAdvisory,
	type ClassificationInput
} from '$lib/utils/applicantRoleUtils';

// ============================================================================
// Auto-Derivation: Individual Applicants (Secured Loans)
// ============================================================================

describe('deriveApplicantClassification — secured individual', () => {
	const base: ClassificationInput = { isSecuredLoan: true };

	it('both=No → guarantor_financial (no primary concept, classified by flags)', () => {
		expect(deriveApplicantClassification({ ...base, onEMI: false, onProperty: false })).toBe(
			'guarantor_financial'
		);
	});

	it('onEMI=true → co_applicant_financial', () => {
		expect(deriveApplicantClassification({ ...base, onEMI: true, onProperty: false })).toBe(
			'co_applicant_financial'
		);
	});

	it('onEMI=true + onProperty=true → co_applicant_financial', () => {
		expect(deriveApplicantClassification({ ...base, onEMI: true, onProperty: true })).toBe(
			'co_applicant_financial'
		);
	});

	it('onProperty=true, onEMI=false → co_applicant_non_financial', () => {
		expect(deriveApplicantClassification({ ...base, onProperty: true, onEMI: false })).toBe(
			'co_applicant_non_financial'
		);
	});

	it('Both=No + family → guarantor_financial (guarantor supporting low-CIBIL applicants)', () => {
		expect(
			deriveApplicantClassification({
				...base,
				onEMI: false,
				onProperty: false,
				isFamilyMember: true
			})
		).toBe('guarantor_financial');
	});

	it('Both=No + non-family → guarantor_financial', () => {
		expect(
			deriveApplicantClassification({
				...base,
				onEMI: false,
				onProperty: false,
				isFamilyMember: false
			})
		).toBe('guarantor_financial');
	});

	it('Both=No + no relationship data → guarantor_financial', () => {
		expect(deriveApplicantClassification({ ...base, onEMI: false, onProperty: false })).toBe(
			'guarantor_financial'
		);
	});

	it('flags not yet answered → defaults to co_applicant_financial', () => {
		expect(deriveApplicantClassification({ ...base })).toBe('co_applicant_financial');
	});
});

// ============================================================================
// Reactivity: classification changes correctly when flags change
// ============================================================================

describe('deriveApplicantClassification — flag change scenarios', () => {
	const base: ClassificationInput = { isSecuredLoan: true };

	it('financial → guarantor when onEMI changes Yes→No and onProperty stays No', () => {
		// DSA initially marks onEMI=Yes → financial
		const step1 = deriveApplicantClassification({ ...base, onEMI: true, onProperty: false });
		expect(step1).toBe('co_applicant_financial');

		// DSA goes back, changes onEMI to No → guarantor (both=No)
		const step2 = deriveApplicantClassification({ ...base, onEMI: false, onProperty: false });
		expect(step2).toBe('guarantor_financial');
	});

	it('non-financial → financial when onEMI changes No→Yes', () => {
		// DSA initially marks onProperty=Yes, onEMI=No → non-financial
		const step1 = deriveApplicantClassification({ ...base, onProperty: true, onEMI: false });
		expect(step1).toBe('co_applicant_non_financial');

		// DSA goes back, adds onEMI=Yes → financial
		const step2 = deriveApplicantClassification({ ...base, onProperty: true, onEMI: true });
		expect(step2).toBe('co_applicant_financial');
	});

	it('guarantor → non-financial when onProperty changes No→Yes', () => {
		// Both=No → guarantor
		const step1 = deriveApplicantClassification({ ...base, onEMI: false, onProperty: false });
		expect(step1).toBe('guarantor_financial');

		// DSA adds to property → non-financial (on property, not on EMI)
		const step2 = deriveApplicantClassification({ ...base, onEMI: false, onProperty: true });
		expect(step2).toBe('co_applicant_non_financial');
	});

	it('director: onProperty changes → always stays financial (not non-financial)', () => {
		const dirBase: ClassificationInput = {
			...base,
			companyType: 'Private Limited',
			ownershipPercent: 50
		};

		// Director onEMI=Yes → financial
		const step1 = deriveApplicantClassification({ ...dirBase, onEMI: true, onProperty: false });
		expect(step1).toBe('co_applicant_financial');

		// Director onProperty=Yes, onEMI=No → STILL financial (directors always full financial)
		const step2 = deriveApplicantClassification({ ...dirBase, onEMI: false, onProperty: true });
		expect(step2).toBe('co_applicant_financial');

		// Director both=No, 50% stake, non-family → guarantor_financial
		const step3 = deriveApplicantClassification({
			...dirBase,
			onEMI: false,
			onProperty: false,
			isFamilyMember: false
		});
		expect(step3).toBe('guarantor_financial');
	});
});

// ============================================================================
// Tab requirements match classification (completion reactivity)
// ============================================================================

describe('getRequiredTabsForClassification — tab visibility', () => {
	it('co_applicant_financial → all 5 tabs', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_financial');
		expect(tabs).toContain('income_profiles');
		expect(tabs).toContain('income_details');
		expect(tabs).toContain('obligations_details');
		expect(tabs).toHaveLength(5);
	});

	it('co_applicant_non_financial → profile + credit only', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_non_financial');
		expect(tabs).toContain('profile');
		expect(tabs).toContain('credit_score');
		expect(tabs).not.toContain('income_profiles');
		expect(tabs).not.toContain('income_details');
	});

	it('guarantor_financial → all 5 tabs (full independent assessment)', () => {
		const tabs = getRequiredTabsForClassification('guarantor_financial');
		expect(tabs).toContain('income_profiles');
		expect(tabs).toContain('income_details');
		expect(tabs).toContain('obligations_details');
		expect(tabs).toHaveLength(5);
	});

	it('switching classification changes required tabs', () => {
		// Financial → 5 tabs
		const financialTabs = getRequiredTabsForClassification('co_applicant_financial');
		expect(financialTabs).toHaveLength(5);

		// Same person reclassified to non-financial → 2 tabs
		const nonFinancialTabs = getRequiredTabsForClassification('co_applicant_non_financial');
		expect(nonFinancialTabs).toHaveLength(2);

		// Proves: tab count changes when classification changes
		expect(financialTabs.length).toBeGreaterThan(nonFinancialTabs.length);
	});
});

// ============================================================================
// Auto-Derivation: Unsecured Loans
// ============================================================================

describe('deriveApplicantClassification — unsecured', () => {
	const base: ClassificationInput = { isSecuredLoan: false };

	it('defaults to co_applicant_financial', () => {
		expect(deriveApplicantClassification(base)).toBe('co_applicant_financial');
	});

	it('unsecured defaults to co_applicant_financial (no flags to check)', () => {
		expect(deriveApplicantClassification({ ...base })).toBe('co_applicant_financial');
	});
});

// ============================================================================
// Auto-Derivation: Company Directors
// ============================================================================

describe('deriveApplicantClassification — company directors', () => {
	const pvtBase: ClassificationInput = {
		isSecuredLoan: true,
		companyType: 'Private Limited'
	};

	it('Sole Prop director → always co_applicant_financial', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			companyType: 'Sole Proprietorship',
			onEMI: false,
			onProperty: false
		};
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('Partnership director → always co_applicant_financial', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			companyType: 'Partnership Firm',
			onEMI: false,
			onProperty: false
		};
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('OPC director → always co_applicant_financial', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			companyType: 'One Person Company (OPC)',
			onEMI: false,
			onProperty: false
		};
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('LLP partner → always co_applicant_financial', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			companyType: 'LLP',
			onEMI: false,
			onProperty: false
		};
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('PvtLtd + onEMI=true → co_applicant_financial', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onEMI: true,
				onProperty: false,
				ownershipPercent: 5
			})
		).toBe('co_applicant_financial');
	});

	it('PvtLtd + onProperty=true, onEMI=false → co_applicant_financial (directors always full financial)', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onProperty: true,
				onEMI: false,
				ownershipPercent: 5
			})
		).toBe('co_applicant_financial');
	});

	it('PvtLtd + Both=No + ≥20% stake + family → co_applicant_financial (family controls company)', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onEMI: false,
				onProperty: false,
				ownershipPercent: 25,
				isFamilyMember: true
			})
		).toBe('co_applicant_financial');
	});

	it('PvtLtd + Both=No + <20% individual but ≥20% combined family → co_applicant_financial', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onEMI: false,
				onProperty: false,
				ownershipPercent: 12,
				combinedFamilyStake: 62,
				isFamilyMember: true
			})
		).toBe('co_applicant_financial');
	});

	it('PvtLtd + Both=No + ≥20% stake + non-family → guarantor_financial', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onEMI: false,
				onProperty: false,
				ownershipPercent: 25,
				isFamilyMember: false
			})
		).toBe('guarantor_financial');
	});

	it('PvtLtd + Both=No + <20% stake → non_applicant_cibil_only (minor director)', () => {
		expect(
			deriveApplicantClassification({
				...pvtBase,
				onEMI: false,
				onProperty: false,
				ownershipPercent: 10,
				isFamilyMember: false
			})
		).toBe('non_applicant_cibil_only');
	});
});

// ============================================================================
// Auto-Derivation: Unsecured company directors/partners (Business + Professional)
// ----------------------------------------------------------------------------
// Owner rule (2026-05-22, ADR-0012): a company business/professional loan is
// sized ENTIRELY on the company entity (income/obligations/CIBIL). Directors and
// partners NEVER pool — their financials are for validation/fraud only. Split:
//   • ≥20% stake OR family → non_applicant_full_financial (captured, not pooled)
//   • <20% AND non-family  → co_applicant_non_financial   (on loan, CIBIL only)
//   • explicit guarantor   → guarantor_financial          (preserved, not pooled)
//   • Sole Proprietorship  → co_applicant_financial       (proprietor IS the entity)
// ============================================================================

describe('deriveApplicantClassification — unsecured company directors/partners', () => {
	const pvtUnsecuredBase: ClassificationInput = {
		isSecuredLoan: false,
		companyType: 'Private Limited'
	};

	it('≥20% stake, non-family → non_applicant_full_financial (captured, NOT pooled)', () => {
		expect(
			deriveApplicantClassification({ ...pvtUnsecuredBase, ownershipPercent: 30, isFamilyMember: false })
		).toBe('non_applicant_full_financial');
	});

	it('exactly 20% stake, non-family → non_applicant_full_financial (≥20 boundary)', () => {
		expect(
			deriveApplicantClassification({ ...pvtUnsecuredBase, ownershipPercent: 20, isFamilyMember: false })
		).toBe('non_applicant_full_financial');
	});

	it('19% stake, non-family → co_applicant_non_financial (below threshold)', () => {
		expect(
			deriveApplicantClassification({ ...pvtUnsecuredBase, ownershipPercent: 19, isFamilyMember: false })
		).toBe('co_applicant_non_financial');
	});

	it('<20% stake but family member → non_applicant_full_financial (family always captured)', () => {
		expect(
			deriveApplicantClassification({ ...pvtUnsecuredBase, ownershipPercent: 5, isFamilyMember: true })
		).toBe('non_applicant_full_financial');
	});

	it('<20% individual but combined family stake ≥20% → non_applicant_full_financial', () => {
		expect(
			deriveApplicantClassification({
				...pvtUnsecuredBase,
				ownershipPercent: 12,
				combinedFamilyStake: 62,
				isFamilyMember: true
			})
		).toBe('non_applicant_full_financial');
	});

	it('no stake, no family data → co_applicant_non_financial (missing-relationship = non-family)', () => {
		expect(deriveApplicantClassification({ ...pvtUnsecuredBase })).toBe('co_applicant_non_financial');
	});

	it('explicit guarantor role → guarantor_financial (preserved, not pooled)', () => {
		expect(
			deriveApplicantClassification({ ...pvtUnsecuredBase, ownershipPercent: 40, loanRole: 'guarantor' })
		).toBe('guarantor_financial');
	});

	it('co_borrower role no longer forces pooling — ≥20% → non_applicant_full_financial', () => {
		// Pre-rule this returned co_applicant_financial (pooled). The owner rule
		// removes director pooling; stake decides capture, never pooling.
		expect(
			deriveApplicantClassification({
				...pvtUnsecuredBase,
				ownershipPercent: 51,
				loanRole: 'co_borrower',
				isFamilyMember: false
			})
		).toBe('non_applicant_full_financial');
	});

	it('Partnership partner ≥20% → non_applicant_full_financial (not pooled — entity is the basis)', () => {
		expect(
			deriveApplicantClassification({
				isSecuredLoan: false,
				companyType: 'Partnership Firm',
				ownershipPercent: 50,
				isFamilyMember: false
			})
		).toBe('non_applicant_full_financial');
	});

	it('OPC sole member (100%) → non_applicant_full_financial (captured; OPC entity pools separately)', () => {
		expect(
			deriveApplicantClassification({
				isSecuredLoan: false,
				companyType: 'One Person Company (OPC)',
				ownershipPercent: 100,
				isFamilyMember: false
			})
		).toBe('non_applicant_full_financial');
	});

	it('Sole Proprietorship (unsecured) → co_applicant_financial (proprietor IS the entity, pools)', () => {
		expect(
			deriveApplicantClassification({
				isSecuredLoan: false,
				companyType: 'Sole Proprietorship'
			})
		).toBe('co_applicant_financial');
	});

	it('Professional Loan partner ≥20% → non_applicant_full_financial (same rule as Business)', () => {
		expect(
			deriveApplicantClassification({
				isSecuredLoan: false,
				companyType: 'Partnership Firm',
				loanCategory: 'Professional Loan',
				ownershipPercent: 33,
				isFamilyMember: false
			})
		).toBe('non_applicant_full_financial');
	});

	it('Professional Loan minor partner <20% non-family → co_applicant_non_financial', () => {
		expect(
			deriveApplicantClassification({
				isSecuredLoan: false,
				companyType: 'Private Limited',
				loanCategory: 'Professional Loan',
				ownershipPercent: 8,
				isFamilyMember: false
			})
		).toBe('co_applicant_non_financial');
	});
});

// ============================================================================
// DSA Override (removed in S72 — classification is fully auto-derived)
// ============================================================================

describe('deriveApplicantClassification — dsaOverride ignored', () => {
	it('dsaOverride is ignored — auto-derivation takes precedence', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			onEMI: true,
			onProperty: true,
			dsaOverride: 'guarantor_financial'
		};
		// S72: dsaOverride no longer takes precedence — onEMI=true → co_applicant_financial
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('flags not set → defaults to co_applicant_financial despite override', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			dsaOverride: 'co_applicant_non_financial'
		};
		// Flags not answered → default co_applicant_financial (override ignored)
		expect(deriveApplicantClassification(input)).toBe('co_applicant_financial');
	});

	it('family Both=No stays guarantor_financial despite override', () => {
		const input: ClassificationInput = {
			isSecuredLoan: true,
			onEMI: false,
			onProperty: false,
			isFamilyMember: true,
			dsaOverride: 'guarantor_non_financial'
		};
		// S72: override ignored — Both=No → guarantor_financial
		expect(deriveApplicantClassification(input)).toBe('guarantor_financial');
	});
});

// ============================================================================
// Guarantor Advisory (police/defense/govt employment)
// ============================================================================

describe('getGuarantorAdvisory', () => {
	it('returns advisory for Police employment', () => {
		expect(getGuarantorAdvisory('Police')).toContain('Guarantor may be required');
	});

	it('returns advisory for Defence/Defense employment', () => {
		expect(getGuarantorAdvisory('Defence')).toContain('Guarantor may be required');
		expect(getGuarantorAdvisory('Defense')).toContain('Guarantor may be required');
	});

	it('returns advisory for BSF/CRPF/CISF paramilitary', () => {
		expect(getGuarantorAdvisory('BSF')).toContain('Guarantor may be required');
		expect(getGuarantorAdvisory('CRPF')).toContain('senior officer');
	});

	it('returns advisory for Army/Navy/Air Force', () => {
		expect(getGuarantorAdvisory('Army')).toContain('Guarantor may be required');
		expect(getGuarantorAdvisory('Navy')).toContain('Guarantor may be required');
		expect(getGuarantorAdvisory('Air Force')).toContain('Guarantor may be required');
	});

	it('returns advisory for lawyers/advocates', () => {
		expect(getGuarantorAdvisory('Lawyer')).toContain('Guarantor may be required');
		expect(getGuarantorAdvisory('Advocate')).toContain('Guarantor may be required');
	});

	it('returns null for normal employment types', () => {
		expect(getGuarantorAdvisory('Salaried')).toBeNull();
		expect(getGuarantorAdvisory('Self-employed(Businessman)')).toBeNull();
		expect(getGuarantorAdvisory('Government')).toBeNull(); // Generic govt is fine
	});

	it('matches case-insensitively via profession field', () => {
		expect(getGuarantorAdvisory('Government', 'police department')).toContain(
			'Guarantor may be required'
		);
		expect(getGuarantorAdvisory('', 'BSF Constable')).toContain('Guarantor may be required');
	});

	it('returns null for empty/undefined inputs', () => {
		expect(getGuarantorAdvisory()).toBeNull();
		expect(getGuarantorAdvisory('')).toBeNull();
		expect(getGuarantorAdvisory(undefined, undefined)).toBeNull();
	});
});

// ============================================================================
// Bridge to Legacy System
// ============================================================================

describe('classificationToLegacyRole', () => {
	it('co_applicant_financial → borrower', () => {
		expect(classificationToLegacyRole('co_applicant_financial')).toBe('borrower');
	});

	it('co_applicant_non_financial → cibil_only', () => {
		expect(classificationToLegacyRole('co_applicant_non_financial')).toBe('cibil_only');
	});

	it('guarantor_financial → borrower (Phase 1: full data collection)', () => {
		expect(classificationToLegacyRole('guarantor_financial')).toBe('borrower');
	});

	it('non_applicant_full_financial → borrower (independent assessment)', () => {
		expect(classificationToLegacyRole('non_applicant_full_financial')).toBe('borrower');
	});

	it('non_applicant_cibil_only → cibil_only (just CIBIL check)', () => {
		expect(classificationToLegacyRole('non_applicant_cibil_only')).toBe('cibil_only');
	});

	it('guarantor_non_financial → not_on_loan', () => {
		expect(classificationToLegacyRole('guarantor_non_financial')).toBe('not_on_loan');
	});
});

// ============================================================================
// Tab Requirements
// ============================================================================

describe('getRequiredTabsForClassification', () => {
	it('co_applicant_financial requires all 5 tabs', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_financial');
		expect(tabs).toHaveLength(5);
		expect(tabs).toContain('income_profiles');
		expect(tabs).toContain('obligations_details');
	});

	it('co_applicant_non_financial requires profile + credit_score', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_non_financial');
		expect(tabs).toContain('profile');
		expect(tabs).toContain('credit_score');
		expect(tabs).not.toContain('income_profiles');
	});

	it('co_applicant_non_financial adds obligations when CIBIL < 725', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_non_financial', 680);
		expect(tabs).toContain('obligations_details');
	});

	it('co_applicant_non_financial does NOT add obligations when CIBIL ≥ 725', () => {
		const tabs = getRequiredTabsForClassification('co_applicant_non_financial', 750);
		expect(tabs).not.toContain('obligations_details');
	});

	it('guarantor_financial requires all 5 tabs', () => {
		const tabs = getRequiredTabsForClassification('guarantor_financial');
		expect(tabs).toHaveLength(5);
	});

	it('non_applicant_full_financial requires all 5 tabs (full verification)', () => {
		const tabs = getRequiredTabsForClassification('non_applicant_full_financial');
		expect(tabs).toHaveLength(5);
		expect(tabs).toContain('profile');
		expect(tabs).toContain('income_profiles');
		expect(tabs).toContain('income_details');
		expect(tabs).toContain('credit_score');
		expect(tabs).toContain('obligations_details');
	});

	it('non_applicant_cibil_only requires profile + credit_score', () => {
		const tabs = getRequiredTabsForClassification('non_applicant_cibil_only');
		expect(tabs).toContain('profile');
		expect(tabs).toContain('credit_score');
		expect(tabs).not.toContain('income_profiles');
	});

	it('non_applicant_cibil_only adds obligations when CIBIL < 725', () => {
		const tabs = getRequiredTabsForClassification('non_applicant_cibil_only', 680);
		expect(tabs).toContain('obligations_details');
	});

	it('non_applicant_cibil_only does NOT add obligations when CIBIL ≥ 725', () => {
		const tabs = getRequiredTabsForClassification('non_applicant_cibil_only', 750);
		expect(tabs).not.toContain('obligations_details');
	});

	it('guarantor_non_financial requires only profile', () => {
		const tabs = getRequiredTabsForClassification('guarantor_non_financial');
		expect(tabs).toEqual(['profile']);
	});
});

// ============================================================================
// Labels & Colors
// ============================================================================

describe('getClassificationLabel', () => {
	it('returns human-readable labels for all 6 types', () => {
		expect(getClassificationLabel('co_applicant_financial')).toBe('Co-Applicant (Financial)');
		expect(getClassificationLabel('co_applicant_non_financial')).toBe(
			'Co-Applicant (Non-Financial)'
		);
		expect(getClassificationLabel('guarantor_financial')).toBe('Guarantor (Financial)');
		expect(getClassificationLabel('non_applicant_full_financial')).toBe(
			'Non-Applicant (Full Financial)'
		);
		expect(getClassificationLabel('non_applicant_cibil_only')).toBe('Non-Applicant (KYC & CIBIL)');
		expect(getClassificationLabel('guarantor_non_financial')).toBe('Guarantor (Non-Financial)');
	});
});

describe('getClassificationBadgeColor', () => {
	it('returns distinct colors per classification', () => {
		const colors = new Set([
			getClassificationBadgeColor('co_applicant_financial'),
			getClassificationBadgeColor('co_applicant_non_financial'),
			getClassificationBadgeColor('guarantor_financial'),
			getClassificationBadgeColor('non_applicant_full_financial'),
			getClassificationBadgeColor('non_applicant_cibil_only'),
			getClassificationBadgeColor('guarantor_non_financial')
		]);
		expect(colors.size).toBe(6);
	});

	it('non_applicant_full_financial is orange (warning — needs verification)', () => {
		expect(getClassificationBadgeColor('non_applicant_full_financial')).toBe('orange');
	});

	it('non_applicant_cibil_only is slate (minimal involvement)', () => {
		expect(getClassificationBadgeColor('non_applicant_cibil_only')).toBe('slate');
	});
});

// ============================================================================
// Family Relationship Helper
// ============================================================================

describe('isFamilyRelationship', () => {
	it('direct_family is family', () => {
		expect(isFamilyRelationship('direct_family')).toBe(true);
	});

	it('in_law_family is family', () => {
		expect(isFamilyRelationship('in_law_family')).toBe(true);
	});

	it('extended_family is family', () => {
		expect(isFamilyRelationship('extended_family')).toBe(true);
	});

	it('grandparent_family is family', () => {
		expect(isFamilyRelationship('grandparent_family')).toBe(true);
	});

	it('non_family is NOT family', () => {
		expect(isFamilyRelationship('non_family')).toBe(false);
	});

	it('undefined is NOT family', () => {
		expect(isFamilyRelationship(undefined)).toBe(false);
	});
});
