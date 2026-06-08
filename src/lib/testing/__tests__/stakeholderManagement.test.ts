/**
 * Stakeholder Management Tests
 * ═══════════════════════════════════════════════════════════════════
 * Tests for Phase 1 (entity-specific stake validation), Phase 2
 * (loanRole + stake-over-threshold override; threshold =
 * STAKE_FULL_FINANCIALS_THRESHOLD = 20%), and Phase 3 (family
 * dominance + skip minor directors).
 * ═══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import {
	type DirectorForm,
	isCardComplete,
	validateAllDirectors,
	createEmptyDirectorForm,
	getStakeValidationRule
} from '$lib/utils/directorFormUtils';
import {
	deriveUnsecuredDirectorRole,
	deriveUnsecuredDirectorRoleWithFamily,
	isDirectorSkippable,
	STAKE_FULL_FINANCIALS_THRESHOLD,
	SKIP_MINOR_DIRECTOR_THRESHOLD,
	type ApplicantDerivedRole
} from '$lib/utils/applicantRoleUtils';
import { computeSectionCompletion, type CompletionOptions } from '$lib/utils/incomeTabState';
import type { FamilyControlResult } from '$lib/types/form';

// ── Test Helpers ──────────────────────────────────────────────────

/** Create a fully valid DirectorForm for unsecured loans */
function makeCompleteDirector(overrides: Partial<DirectorForm> = {}): DirectorForm {
	return {
		id: 'test-' + Math.random().toString(36).slice(2),
		fullName: 'Test Director',
		gender: 'Male',
		age: '35',
		maritalStatus: 'married',
		ownershipPercent: '50',
		location: 'same_city',
		isNRI: 'No',
		onProperty: 'false',
		onEMI: 'false',
		designation: '',
		loanRole: '',
		restoredFrom: '',
		lockedFields: [],
		pendingMatch: null,
		...overrides
	};
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 1: Entity-Type Stake Validation + OPC Enforcement
// ═══════════════════════════════════════════════════════════════════

describe('Phase 1: Stake Validation Rules', () => {
	describe('getStakeValidationRule', () => {
		it('Partnership → exact_100', () => {
			expect(getStakeValidationRule('Partnership Firm')).toBe('exact_100');
		});

		it('LLP → exact_100', () => {
			expect(getStakeValidationRule('LLP')).toBe('exact_100');
		});

		it('Private Limited → max_100', () => {
			expect(getStakeValidationRule('Private Limited')).toBe('max_100');
		});

		it('OPC → max_100', () => {
			expect(getStakeValidationRule('One Person Company (OPC)')).toBe('max_100');
		});

		it('Unknown type → max_100 (safe default)', () => {
			expect(getStakeValidationRule('Unknown')).toBe('max_100');
		});
	});

	describe('validateAllDirectors — entity-specific', () => {
		it('Partnership: total=90 → error (must equal 100%)', () => {
			const forms = [
				makeCompleteDirector({ ownershipPercent: '45' }),
				makeCompleteDirector({ ownershipPercent: '45' })
			];
			const errors = validateAllDirectors(forms, true, 'Partner', 'Partnership Firm');
			expect(errors.length).toBeGreaterThan(0);
			// Find the stake total error (not an individual form error)
			const stakeError = errors.find((e) => e.includes('100%') || e.includes('must'));
			expect(stakeError).toBeDefined();
		});

		it('Partnership: total=100 → no error', () => {
			const forms = [
				makeCompleteDirector({ ownershipPercent: '50' }),
				makeCompleteDirector({ ownershipPercent: '50' })
			];
			const errors = validateAllDirectors(forms, true, 'Partner', 'Partnership Firm');
			expect(errors).toHaveLength(0);
		});

		it('PvtLtd: total=80 → no error (loanRole required for complete)', () => {
			// Pvt Ltd designation defaults to 'director' (see directorFormUtils.ts).
			// Test fixture must set it explicitly since makeCompleteDirector defaults to ''.
			const forms = [
				makeCompleteDirector({ ownershipPercent: '40', loanRole: 'co_borrower', designation: 'director' }),
				makeCompleteDirector({ ownershipPercent: '40', loanRole: 'co_borrower', designation: 'director' })
			];
			const errors = validateAllDirectors(forms, true, 'Director', 'Private Limited');
			expect(errors).toHaveLength(0);
		});

		it('PvtLtd: total=110 → error (exceeds 100%)', () => {
			const forms = [
				makeCompleteDirector({ ownershipPercent: '60', loanRole: 'co_borrower', designation: 'director' }),
				makeCompleteDirector({ ownershipPercent: '50', loanRole: 'co_borrower', designation: 'director' })
			];
			const errors = validateAllDirectors(forms, true, 'Director', 'Private Limited');
			expect(errors.length).toBeGreaterThan(0);
			const stakeError = errors.find((e) => e.includes('100%') || e.includes('exceed'));
			expect(stakeError).toBeDefined();
		});
	});

	describe('OPC enforcement', () => {
		it('createEmptyDirectorForm with isOPC → 100% ownership, locked', () => {
			const form = createEmptyDirectorForm(true, { isOPC: true });
			expect(form.ownershipPercent).toBe('100');
			expect(form.lockedFields).toContain('ownershipPercent');
		});

		it('createEmptyDirectorForm without isOPC → empty ownership', () => {
			const form = createEmptyDirectorForm(true);
			expect(form.ownershipPercent).toBe('');
			expect(form.lockedFields).not.toContain('ownershipPercent');
		});
	});

	describe('isCardComplete — entity-aware', () => {
		it('PvtLtd: incomplete without ownership', () => {
			const d = makeCompleteDirector({ ownershipPercent: '', loanRole: 'co_borrower' });
			expect(isCardComplete(d, true, 'Private Limited')).toBe(false);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 2: Director LoanRole + Stake-Over-Threshold Override
// (threshold = STAKE_FULL_FINANCIALS_THRESHOLD = 20%)
// ═══════════════════════════════════════════════════════════════════

describe('Phase 2: LoanRole + Stake Override', () => {
	const makeApplicants = (directorStake: number, directorLoanRole: string, companyType: string) => {
		const company: Record<string, unknown> = {
			id: 'company-1',
			applicantType: 'Company',
			companyType
		};
		const director: Record<string, unknown> = {
			id: 'director-1',
			applicantType: 'Individual',
			linkedCompanyId: 'company-1',
			ownershipPercent: directorStake,
			loanRole: directorLoanRole
		};
		return { company, director, all: [company, director] };
	};

	describe('deriveUnsecuredDirectorRole', () => {
		it('PvtLtd, stake=10%, role=information_only → collateral', () => {
			const { director, all } = makeApplicants(10, 'information_only', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('collateral');
		});

		it('PvtLtd, stake=30%, role=information_only → borrower (stake override)', () => {
			const { director, all } = makeApplicants(30, 'information_only', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('borrower');
		});

		it('PvtLtd, stake=15%, role=co_borrower → borrower', () => {
			const { director, all } = makeApplicants(15, 'co_borrower', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('borrower');
		});

		it('PvtLtd, stake=20%, role=guarantor → cibil_only', () => {
			const { director, all } = makeApplicants(20, 'guarantor', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('cibil_only');
		});

		it('Partnership, any stake, any role → undefined (full assessment)', () => {
			const { director, all } = makeApplicants(20, 'co_borrower', 'Partnership Firm');
			expect(deriveUnsecuredDirectorRole(director, all)).toBeUndefined();
		});

		it('LLP, any stake, any role → undefined (full assessment)', () => {
			const { director, all } = makeApplicants(10, 'information_only', 'LLP');
			expect(deriveUnsecuredDirectorRole(director, all)).toBeUndefined();
		});

		it('OPC, stake=100%, any role → borrower (stake override)', () => {
			const { director, all } = makeApplicants(100, 'information_only', 'One Person Company (OPC)');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('borrower');
		});

		it('Non-linked individual → undefined', () => {
			const individual: Record<string, unknown> = {
				id: 'ind-1',
				applicantType: 'Individual'
			};
			expect(deriveUnsecuredDirectorRole(individual, [individual])).toBeUndefined();
		});

		it('PvtLtd, stake=20% (exactly at threshold), role=guarantor → cibil_only (not overridden)', () => {
			const { director, all } = makeApplicants(20, 'guarantor', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('cibil_only');
		});

		it('PvtLtd, stake=25% (over 20% threshold), role=guarantor → borrower', () => {
			const { director, all } = makeApplicants(25, 'guarantor', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('borrower');
		});

		it('PvtLtd, stake=21%, role=guarantor → borrower (just over threshold)', () => {
			const { director, all } = makeApplicants(21, 'guarantor', 'Private Limited');
			expect(deriveUnsecuredDirectorRole(director, all)).toBe('borrower');
		});
	});

	describe('isCardComplete — loanRole required for PvtLtd/OPC', () => {
		it('PvtLtd: no loanRole → incomplete', () => {
			const d = makeCompleteDirector({
				ownershipPercent: '15',
				loanRole: '',
				designation: 'director'
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(false);
		});

		it('PvtLtd: with loanRole → complete', () => {
			// designation required for Pvt Ltd (MD vs Director choice exposed in modal)
			const d = makeCompleteDirector({
				ownershipPercent: '15',
				loanRole: 'co_borrower',
				designation: 'director'
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(true);
		});

		it('PvtLtd: stake > 20% threshold → complete even without loanRole', () => {
			const d = makeCompleteDirector({
				ownershipPercent: '30',
				loanRole: '',
				designation: 'director'
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(true);
		});

		// P16 lock-in: 22% is between the old frontend threshold (25) and the
		// backend threshold (20). Before alignment, isCardComplete returned false
		// here (UI required loanRole) while the rule engine derived 'borrower'
		// anyway. After alignment, UI matches backend — 22% is over threshold,
		// no loanRole required.
		it('PvtLtd: stake=22% (between old 25 and new 20 thresholds) → complete without loanRole', () => {
			const d = makeCompleteDirector({
				ownershipPercent: '22',
				loanRole: '',
				designation: 'director'
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(true);
		});

		// Boundary: exactly at the threshold should still require loanRole
		// (the rule is `>`, not `>=`). Mirrors deriveUnsecuredDirectorRole
		// behavior — a 20% director with role=guarantor stays 'cibil_only'.
		it('PvtLtd: stake=20% (exactly at threshold) → loanRole still required', () => {
			const d = makeCompleteDirector({
				ownershipPercent: '20',
				loanRole: '',
				designation: 'director'
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(false);
		});

		it('PvtLtd: missing designation → incomplete (regardless of loanRole/stake)', () => {
			// New: Pvt Ltd has two designations (MD vs Director), user must pick.
			const d = makeCompleteDirector({
				ownershipPercent: '30',
				loanRole: 'co_borrower',
				designation: ''
			});
			expect(isCardComplete(d, true, 'Private Limited')).toBe(false);
		});

		it('Partnership: no loanRole → still complete (not role-based)', () => {
			// Partnership has a single auto-set designation ('partner') so the
			// designation requirement passes implicitly — no need to set it here.
			const d = makeCompleteDirector({ ownershipPercent: '50', loanRole: '' });
			expect(isCardComplete(d, true, 'Partnership Firm')).toBe(true);
		});
	});
});

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: Family Dominance + Skip Minor Directors
// ═══════════════════════════════════════════════════════════════════

describe('Phase 3: Family Dominance + Skip', () => {
	const makeApplicantsWithFamily = (
		directorStake: number,
		directorLoanRole: string,
		companyType: string,
		directorId: string = 'director-1'
	) => {
		const company: Record<string, unknown> = {
			id: 'company-1',
			applicantType: 'Company',
			companyType
		};
		const director: Record<string, unknown> = {
			id: directorId,
			applicantType: 'Individual',
			linkedCompanyId: 'company-1',
			ownershipPercent: directorStake,
			loanRole: directorLoanRole
		};
		return { company, director, all: [company, director] };
	};

	const highFamilyControl: FamilyControlResult = {
		familyControlled: true,
		familyStakePercent: 80,
		familyDominance: 'HIGH',
		familyClusterSize: 3,
		totalDirectors: 4,
		outsiderCount: 1,
		familyClusterIds: ['director-1', 'director-2', 'director-3']
	};

	const mediumFamilyControl: FamilyControlResult = {
		familyControlled: true,
		familyStakePercent: 55,
		familyDominance: 'MEDIUM',
		familyClusterSize: 2,
		totalDirectors: 4,
		outsiderCount: 2,
		familyClusterIds: ['director-1', 'director-2']
	};

	const lowFamilyControl: FamilyControlResult = {
		familyControlled: false,
		familyStakePercent: 30,
		familyDominance: 'LOW',
		familyClusterSize: 1,
		totalDirectors: 4,
		outsiderCount: 3,
		familyClusterIds: ['director-1']
	};

	describe('deriveUnsecuredDirectorRoleWithFamily', () => {
		it('Family cluster member, HIGH dominance → borrower', () => {
			const { director, all } = makeApplicantsWithFamily(
				10,
				'information_only',
				'Private Limited',
				'director-1'
			);
			const familyMap = new Map([['company-1', highFamilyControl]]);
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all, familyMap)).toBe('borrower');
		});

		it('Family cluster member, MEDIUM dominance → borrower', () => {
			const { director, all } = makeApplicantsWithFamily(
				10,
				'information_only',
				'Private Limited',
				'director-1'
			);
			const familyMap = new Map([['company-1', mediumFamilyControl]]);
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all, familyMap)).toBe('borrower');
		});

		it('Family cluster member, LOW dominance → role-based', () => {
			const { director, all } = makeApplicantsWithFamily(
				10,
				'information_only',
				'Private Limited',
				'director-1'
			);
			const familyMap = new Map([['company-1', lowFamilyControl]]);
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all, familyMap)).toBe('collateral');
		});

		it('Non-family member → role-based (even with HIGH dominance)', () => {
			const { director, all } = makeApplicantsWithFamily(
				10,
				'guarantor',
				'Private Limited',
				'outsider-1'
			);
			const familyMap = new Map([['company-1', highFamilyControl]]);
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all, familyMap)).toBe('cibil_only');
		});

		it('stake > 20% threshold overrides family check', () => {
			const { director, all } = makeApplicantsWithFamily(
				30,
				'information_only',
				'Private Limited',
				'outsider-1'
			);
			const familyMap = new Map([['company-1', highFamilyControl]]);
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all, familyMap)).toBe('borrower');
		});

		it('No family map → falls back to base role derivation', () => {
			const { director, all } = makeApplicantsWithFamily(10, 'guarantor', 'Private Limited');
			expect(deriveUnsecuredDirectorRoleWithFamily(director, all)).toBe('cibil_only');
		});
	});

	describe('isDirectorSkippable', () => {
		const make5DirectorScenario = (
			targetId: string,
			targetLoanRole: string,
			targetStake: number
		) => {
			const company: Record<string, unknown> = {
				id: 'company-1',
				applicantType: 'Company',
				companyType: 'Private Limited'
			};
			const directors = Array.from({ length: 5 }, (_, i) => ({
				id: i === 0 ? targetId : `dir-${i}`,
				applicantType: 'Individual' as const,
				linkedCompanyId: 'company-1',
				ownershipPercent: i === 0 ? targetStake : 10,
				loanRole: i === 0 ? targetLoanRole : 'information_only'
			}));
			const all = [company, ...directors];
			return { target: directors[0] as Record<string, unknown>, all };
		};

		it('Non-family, ≤25% stake, information_only, 5 directors → skippable', () => {
			const { target, all } = make5DirectorScenario('outsider-1', 'information_only', 10);
			expect(isDirectorSkippable(target, all)).toBe(true);
		});

		it('Non-family, ≤25% stake, information_only, 3 directors → NOT skippable (too few)', () => {
			const company: Record<string, unknown> = {
				id: 'company-1',
				applicantType: 'Company',
				companyType: 'Private Limited'
			};
			const directors = Array.from({ length: 3 }, (_, i) => ({
				id: `dir-${i}`,
				applicantType: 'Individual' as const,
				linkedCompanyId: 'company-1',
				ownershipPercent: 10,
				loanRole: 'information_only'
			}));
			const all = [company, ...directors];
			expect(isDirectorSkippable(directors[0], all)).toBe(false);
		});

		it('Non-family, 30% stake → NOT skippable (over threshold)', () => {
			const { target, all } = make5DirectorScenario('outsider-1', 'information_only', 30);
			expect(isDirectorSkippable(target, all)).toBe(false);
		});

		it('Non-family, co_borrower role → NOT skippable', () => {
			const { target, all } = make5DirectorScenario('outsider-1', 'co_borrower', 10);
			expect(isDirectorSkippable(target, all)).toBe(false);
		});

		it('Family member → NOT skippable (even with info_only, ≤25%, >4 directors)', () => {
			const { target, all } = make5DirectorScenario('director-1', 'information_only', 10);
			const familyMap = new Map([['company-1', highFamilyControl]]);
			expect(isDirectorSkippable(target, all, familyMap)).toBe(false);
		});

		it('Family member, MEDIUM dominance (20–50% family stake) → NOT skippable', () => {
			// MEDIUM dominance: family stake is between 50% and 75% (threshold in
			// familyControlDerivation.ts: HIGH >= 75%, MEDIUM >= 50%, else LOW).
			// The mediumFamilyControl fixture has familyStakePercent: 55.
			// A director who is IN the family cluster must not be skipped even though
			// their individual stake is low and their loanRole is information_only.
			// This guards the rule: family cluster members are never minor directors.
			const { target, all } = make5DirectorScenario('director-1', 'information_only', 10);
			const familyMap = new Map([['company-1', mediumFamilyControl]]);
			expect(isDirectorSkippable(target, all, familyMap)).toBe(false);
		});
	});

	describe('computeSectionCompletion — skippable', () => {
		it('skippable=true → all tabs auto-complete', () => {
			const options: CompletionOptions = { skippable: true };
			const result = computeSectionCompletion({}, options);
			expect(result.profile).toBe(true);
			expect(result.income_profiles).toBe(true);
			expect(result.income_details).toBe(true);
			expect(result.credit_score).toBe(true);
			expect(result.obligations_details).toBe(true);
		});

		it('skippable=false, empty Individual → profile incomplete', () => {
			// An Individual with no fields → profileComplete = false
			const options: CompletionOptions = { skippable: false };
			const result = computeSectionCompletion({ applicantType: 'Individual' }, options);
			expect(result.profile).toBe(false);
		});
	});
});

// ══════════════════════════════════════════════════════════════════
// OPC Duplicate Detection
// ══════════════════════════════════════════════════════════════════

import { checkOpcDuplicate } from '$lib/utils/directorFormUtils';

describe('checkOpcDuplicate', () => {
	const makeCompany = (id: string, name: string, type: string): Record<string, unknown> => ({
		id,
		applicantType: 'Company',
		companyName: name,
		companyType: type
	});

	it('returns empty string for non-OPC company types', () => {
		const applicants = [
			makeCompany('c1', 'Test Pvt Ltd', 'Private Limited'),
			makeCompany('c2', 'Test Pvt Ltd', 'Private Limited')
		];
		const result = checkOpcDuplicate('Test Pvt Ltd', 'Private Limited', 'c1', applicants);
		expect(result).toBe('');
	});

	it('returns empty string when no duplicate OPC exists', () => {
		const applicants = [
			makeCompany('c1', 'My OPC', 'One Person Company (OPC)'),
			makeCompany('c2', 'Other OPC', 'One Person Company (OPC)')
		];
		const result = checkOpcDuplicate('My OPC', 'One Person Company (OPC)', 'c1', applicants);
		expect(result).toBe('');
	});

	it('returns warning when another OPC has the same name', () => {
		const applicants = [
			makeCompany('c1', 'Duplicate OPC', 'One Person Company (OPC)'),
			makeCompany('c2', 'Duplicate OPC', 'One Person Company (OPC)')
		];
		const result = checkOpcDuplicate('Duplicate OPC', 'One Person Company (OPC)', 'c1', applicants);
		expect(result).toContain('OPC');
		expect(result).toContain('one director');
	});

	it('name matching is case-insensitive', () => {
		const applicants = [
			makeCompany('c1', 'My OPC Ltd', 'One Person Company (OPC)'),
			makeCompany('c2', 'MY OPC LTD', 'One Person Company (OPC)')
		];
		const result = checkOpcDuplicate('my opc ltd', 'One Person Company (OPC)', 'c1', applicants);
		expect(result).toContain('OPC');
	});

	it('returns empty for short company names (< 2 chars)', () => {
		const applicants = [
			makeCompany('c1', 'A', 'One Person Company (OPC)'),
			makeCompany('c2', 'A', 'One Person Company (OPC)')
		];
		const result = checkOpcDuplicate('A', 'One Person Company (OPC)', 'c1', applicants);
		expect(result).toBe('');
	});

	it('excludes self from duplicate check', () => {
		const applicants = [makeCompany('c1', 'Solo OPC', 'One Person Company (OPC)')];
		// c1 checking against itself should not trigger
		const result = checkOpcDuplicate('Solo OPC', 'One Person Company (OPC)', 'c1', applicants);
		expect(result).toBe('');
	});
});
