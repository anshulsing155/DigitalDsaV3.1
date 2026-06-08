/**
 * Regression test suite — prevents re-introduction of bugs fixed in S62/S63.
 *
 * 8 test cases covering:
 *   1. OPC locking (designation + shareholding immutable)
 *   2. Clear button (reset must clear all income editing state)
 *   3. Zero income validation (drawsSalary=false + receivesProfit=false)
 *   4. ITR toggle (itrReflectsIncome=false → itrFiled=false)
 *   5. BT/Top-up closure label ("Close by this new loan" for DC/BT variants)
 *   6. onProperty-only income check (no false income warning)
 *   7. Restoration income profiles (selectedIncomeProfiles rebuilt from entries)
 *   8. LAP page ordering (loanRequirementPage at index 1)
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Test 1: OPC Locking — designation=MD, shareholding=100, both immutable
// ============================================================================

import {
	createEmptyDirectorForm,
	initDirectorForms,
	OPC_DESIGNATION
} from '$lib/utils/directorFormUtils';

describe('OPC director locking', () => {
	it('createEmptyDirectorForm sets designation to managing_director for OPC', () => {
		const form = createEmptyDirectorForm(false, { isOPC: true });
		expect(form.designation).toBe('managing_director');
		expect(form.designation).toBe(OPC_DESIGNATION);
	});

	it('createEmptyDirectorForm sets ownershipPercent to 100 for OPC', () => {
		const form = createEmptyDirectorForm(false, { isOPC: true });
		expect(form.ownershipPercent).toBe('100');
	});

	it('OPC lockedFields include ownershipPercent and designation', () => {
		const form = createEmptyDirectorForm(false, { isOPC: true });
		expect(form.lockedFields).toContain('ownershipPercent');
		expect(form.lockedFields).toContain('designation');
	});

	it('OPC unsecured also locks loanRole', () => {
		const form = createEmptyDirectorForm(true, { isOPC: true });
		expect(form.lockedFields).toContain('loanRole');
		expect(form.loanRole).toBe('co_borrower');
	});

	it('non-OPC directors have empty lockedFields', () => {
		const form = createEmptyDirectorForm(false);
		expect(form.lockedFields).toEqual([]);
		expect(form.designation).toBe('');
		expect(form.ownershipPercent).toBe('');
	});

	it('initDirectorForms restores OPC locking from saved company data', () => {
		const company = {
			companyType: 'One Person Company (OPC)',
			numberOfDirectorsOrPartners: 1,
			directors: [
				{
					id: 'dir-1',
					fullName: 'Test Director',
					gender: 'male',
					age: 35,
					ownershipPercent: 100,
					designation: 'managing_director'
				}
			]
		};
		const forms = initDirectorForms(company, false);
		expect(forms).toHaveLength(1);
		expect(forms[0].ownershipPercent).toBe('100');
		expect(forms[0].designation).toBe('managing_director');
		expect(forms[0].lockedFields).toContain('ownershipPercent');
		expect(forms[0].lockedFields).toContain('designation');
	});
});

// ============================================================================
// Test 3: Zero income validation — both salary=No and profit=No is incomplete
// ============================================================================

import { hasIncomeData } from '$lib/utils/incomeTabState';
import type { IncomeSourceEntry } from '$lib/types/incomeProfile';

describe('Zero income validation for director entries', () => {
	/** Helper to build a minimal IncomeSourceEntry for testing hasIncomeData */
	function makeEntry(income: Record<string, unknown>): IncomeSourceEntry {
		return {
			id: 'test-entry',
			profileType: 'director_company' as any,
			entityName: 'Test Company',
			specifics: {},
			income,
			evidence: { itrFiled: false, hasDocumentaryEvidence: false },
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			filledBy: 'dsa'
		} as IncomeSourceEntry;
	}

	it('returns false when drawsSalary=false AND receivesProfit=false', () => {
		expect(hasIncomeData(makeEntry({ drawsSalary: false, receivesProfit: false }))).toBe(false);
	});

	it('returns true when drawsSalary=true', () => {
		expect(hasIncomeData(makeEntry({ drawsSalary: true, receivesProfit: false }))).toBe(true);
	});

	it('returns true when receivesProfit=true', () => {
		expect(hasIncomeData(makeEntry({ drawsSalary: false, receivesProfit: true }))).toBe(true);
	});

	it('returns false when income is empty object', () => {
		expect(hasIncomeData(makeEntry({}))).toBe(false);
	});

	it('returns true when numeric income field has value > 0', () => {
		expect(hasIncomeData(makeEntry({ grossMonthlySalary: 50000 }))).toBe(true);
	});

	it('returns false when numeric income field is 0', () => {
		expect(hasIncomeData(makeEntry({ grossMonthlySalary: 0 }))).toBe(false);
	});

	// ── P6: financials-table completeness ──────────────────────────────────
	// A blank/partial multi-year grid must NOT count as complete (the bug was
	// that any non-null financialsTable object passed the Next gate).
	it('returns false when financialsTable exists but all cells are empty (P6)', () => {
		expect(
			hasIncomeData(
				makeEntry({
					financialsTable: {
						itrFiled: [true, true, true],
						netProfitArray: ['', '', ''],
						turnOverArray: ['', '', ''],
						depreciationArray: ['', '', '']
					}
				})
			)
		).toBe(false);
	});

	it('returns false when financialsTable cells are all zero (P6)', () => {
		expect(
			hasIncomeData(
				makeEntry({ financialsTable: { netProfitArray: [0, 0], turnOverArray: [0, 0] } })
			)
		).toBe(false);
	});

	it('returns true when net-profit series has a value (P6)', () => {
		expect(
			hasIncomeData(makeEntry({ financialsTable: { netProfitArray: ['', 800000, ''] } }))
		).toBe(true);
	});

	it('returns true when only turnover series has a value (P6)', () => {
		expect(
			hasIncomeData(makeEntry({ financialsTable: { turnOverArray: [5000000] } }))
		).toBe(true);
	});
});

// ============================================================================
// Test 5: BT/Top-up closure label — "Close by this new loan" for DC/BT variants
// ============================================================================

import { getClosureOptionsFiltered } from '$lib/config/obligationOptions';

describe('BT/Top-up closure options', () => {
	// PITFALL UPDATE (2026-05-28): the closure-options filter switched from loose
	// substring matching (`loanVariant.includes('Balance Transfer')`) to exact-
	// membership in CLOSURE_ALLOWED_VARIANTS, because the loose match caught BOTH
	// 'Balance Transfer Only' (which should NOT show the option — no extra
	// funds) AND 'Balance Transfer With Top-up' (which should). The canonical
	// variant strings stored in form state are 'Balance Transfer With Top-up'
	// and 'Top-up Only', not the legacy loose names 'Balance Transfer' and
	// 'Top-up'.
	it('includes "Close by this new loan" for Balance Transfer With Top-up variant', () => {
		const options = getClosureOptionsFiltered(
			'co_applicant',
			'Home Loan',
			'Balance Transfer With Top-up'
		);
		const closeOption = options.find((o) => o.label === 'Close by this new loan');
		expect(closeOption).toBeDefined();
	});

	it('includes "Close by this new loan" for Debt Consolidation variant', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Debt Consolidation');
		const closeOption = options.find((o) => o.label === 'Close by this new loan');
		expect(closeOption).toBeDefined();
	});

	it('includes "Close by this new loan" for Top-up Only variant', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Top-up Only');
		const closeOption = options.find((o) => o.label === 'Close by this new loan');
		expect(closeOption).toBeDefined();
	});

	it('includes "Close by this new loan" for LAP regardless of variant', () => {
		const options = getClosureOptionsFiltered(
			'co_applicant',
			'Loan Against Property',
			'Fresh / New Loan'
		);
		const closeOption = options.find((o) => o.label === 'Close by this new loan');
		expect(closeOption).toBeDefined();
	});

	it('does NOT include "Close by this new loan" for fresh Home Loan', () => {
		const options = getClosureOptionsFiltered('co_applicant', 'Home Loan', 'Fresh / New Loan');
		const closeOption = options.find((o) => o.label === 'Close by this new loan');
		expect(closeOption).toBeUndefined();
	});

	it('guarantor gets only "Not my liability" option', () => {
		const options = getClosureOptionsFiltered('guarantor', 'Home Loan', 'Debt Consolidation');
		expect(options).toHaveLength(1);
		expect(options[0].value).toMatch(/^Not my/);
	});
});

// ============================================================================
// Test 6: onProperty-only income check — no false zero-income warning
// ============================================================================

import { runCrossFieldValidation } from '$lib/utils/crossStepValidator';

describe('onProperty-only co-applicant income check', () => {
	it('does NOT flag zero income when onEMI=false, onProperty=true', () => {
		const applicants = [
			{
				id: 'ap-1',
				applicantType: 'Individual',
				fullName: 'Primary Borrower',
				onEMI: true,
				onProperty: true,
				selectedIncomeProfiles: ['salaried_regular']
			},
			{
				id: 'ap-2',
				applicantType: 'Individual',
				fullName: 'Property Co-Applicant',
				onEMI: false,
				onProperty: true,
				selectedIncomeProfiles: []
			}
		];
		const result = runCrossFieldValidation(applicants, {}, []);
		const zeroIncomeWarnings = result.warnings.filter(
			(w) => w.category === 'borrower_zero_income' && w.applicantName === 'Property Co-Applicant'
		);
		expect(zeroIncomeWarnings).toHaveLength(0);
	});

	it('DOES flag zero income when onEMI=true with no income profiles', () => {
		const applicants = [
			{
				id: 'ap-1',
				applicantType: 'Individual',
				fullName: 'Borrower On EMI',
				onEMI: true,
				onProperty: true,
				selectedIncomeProfiles: []
			}
		];
		const result = runCrossFieldValidation(applicants, {}, []);
		const zeroIncomeWarnings = result.warnings.filter((w) => w.category === 'borrower_zero_income');
		expect(zeroIncomeWarnings.length).toBeGreaterThan(0);
	});

	it('does NOT flag when both onEMI=false and onProperty=false', () => {
		const applicants = [
			{
				id: 'ap-1',
				applicantType: 'Individual',
				fullName: 'Guarantor Only',
				onEMI: false,
				onProperty: false,
				selectedIncomeProfiles: []
			}
		];
		const result = runCrossFieldValidation(applicants, {}, []);
		const zeroIncomeWarnings = result.warnings.filter((w) => w.category === 'borrower_zero_income');
		expect(zeroIncomeWarnings).toHaveLength(0);
	});
});

// ============================================================================
// Test 7: Restoration income profiles — selectedIncomeProfiles rebuilt
// ============================================================================

import { rebuildSelectedIncomeProfiles } from '$lib/utils/applicantRestoreHandler';

describe('Restoration income profile rebuild', () => {
	it('rebuilds profiles from incomeProfiles.selectedProfiles', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: ['salaried_regular', 'rental_income'] },
			incomeEntries: { active: {} }
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toContain('salaried_regular');
		expect(result).toContain('rental_income');
		expect(result).toHaveLength(2);
	});

	it('derives profiles from incomeEntries.active keys when selectedProfiles is empty', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: [] },
			incomeEntries: {
				active: {
					salaried_regular: [{ id: 'e1', profileType: 'salaried_regular' }],
					pension: [{ id: 'e2', profileType: 'pension' }]
				}
			}
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toContain('salaried_regular');
		expect(result).toContain('pension');
		expect(result).toHaveLength(2);
	});

	it('merges both sources (explicit + derived)', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: ['salaried_regular'] },
			incomeEntries: {
				active: {
					rental_income: [{ id: 'e1', profileType: 'rental_income' }]
				}
			}
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toContain('salaried_regular');
		expect(result).toContain('rental_income');
	});

	it('removes no_current_income when earning profiles exist (contradiction fix)', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: ['no_current_income', 'salaried_regular'] },
			incomeEntries: { active: {} }
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).not.toContain('no_current_income');
		expect(result).toContain('salaried_regular');
	});

	it('keeps no_current_income when it is the only profile', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: ['no_current_income'] },
			incomeEntries: { active: {} }
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toContain('no_current_income');
		expect(result).toHaveLength(1);
	});

	it('returns empty array when no profiles or entries exist', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: [] },
			incomeEntries: { active: {} }
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toHaveLength(0);
	});

	it('handles missing incomeProfiles gracefully', () => {
		const structured = {
			incomeEntries: {
				active: {
					business_proprietorship: [{ id: 'e1' }]
				}
			}
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toContain('business_proprietorship');
	});

	it('ignores empty active arrays', () => {
		const structured = {
			incomeProfiles: { selectedProfiles: [] },
			incomeEntries: {
				active: {
					salaried_regular: [],
					rental_income: [{ id: 'e1' }]
				}
			}
		};
		const result = rebuildSelectedIncomeProfiles(structured);
		expect(result).toEqual(['rental_income']);
	});
});

// ============================================================================
// Test 8: LAP page ordering — loanRequirementPage at index 1
// ============================================================================

import { getAllPages } from '$lib/config/lapLoan/pages';

describe('LAP page ordering', () => {
	it('returns loanRequirementPage at index 1 (after intake)', () => {
		const pages = getAllPages();
		expect(pages[0].id).toBe('caseIntake_lapLoan');
		expect(pages[1].id).toBe('loanRequirementPage');
	});

	it('intake page is always first', () => {
		const pages = getAllPages();
		expect(pages[0].id).toMatch(/caseIntake/);
	});

	it('property pages come after loan requirement', () => {
		const pages = getAllPages();
		const loanReqIdx = pages.findIndex((p) => p.id === 'loanRequirementPage');
		const propertyIdx = pages.findIndex((p) => p.id === 'propertyIdentificationPage');
		expect(loanReqIdx).toBeGreaterThanOrEqual(0);
		expect(propertyIdx).toBeGreaterThan(loanReqIdx);
	});

	it('returns at least 14 pages', () => {
		const pages = getAllPages();
		expect(pages.length).toBeGreaterThanOrEqual(14);
	});
});

// ============================================================================
// Test 12: NBFC single-applicant advisory — must fire on SECURED loans only.
//
// Earlier 2026-05-04 commit gated this advisory to UNSECURED-only with the
// rationale "NBFCs require ≥2 applicants for unsecured loans". User clarified
// 2026-05-28 that the rule is inverted — HFCs and NBFCs financing SECURED
// mortgages (Home Loan / LAP / Plot Loan) prefer ≥2 applicants for risk
// diversification; unsecured single-applicant cases are normal. The advisory
// now fires on secured loans only, suppressed for sole Company applicants
// (the entity is its own legal counterparty).
// See CLAUDE.md §3 Pitfall (NBFC advisory mis-fired on unsecured, 2026-05-28).
// ============================================================================

describe('NBFC single-applicant advisory — fires on secured loans only', () => {
	const singleIndividual = [
		{
			id: 'ap-1',
			applicantType: 'Individual',
			fullName: 'Solo Borrower',
			selectedIncomeProfiles: ['salaried_regular']
		}
	];

	const singleCompany = [
		{
			id: 'ap-1',
			applicantType: 'Company',
			fullName: 'Acme Pvt Ltd'
		}
	];

	it('DOES fire for Loan Against Property single individual (secured)', () => {
		const result = runCrossFieldValidation(
			singleIndividual,
			{ loanName: 'Loan Against Property' },
			[]
		);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeDefined();
	});

	it('DOES fire for Home Loan single individual (secured)', () => {
		const result = runCrossFieldValidation(singleIndividual, { loanName: 'Home Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeDefined();
	});

	it('DOES fire for Plot Loan single individual (secured)', () => {
		const result = runCrossFieldValidation(singleIndividual, { loanName: 'Plot Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeDefined();
	});

	it('does NOT fire for Personal Loan single individual (unsecured)', () => {
		const result = runCrossFieldValidation(singleIndividual, { loanName: 'Personal Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeUndefined();
	});

	it('does NOT fire for Business Loan single individual (unsecured)', () => {
		const result = runCrossFieldValidation(singleIndividual, { loanName: 'Business Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeUndefined();
	});

	it('does NOT fire for sole Company applicant on Home Loan (entity is its own counterparty)', () => {
		const result = runCrossFieldValidation(singleCompany, { loanName: 'Home Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeUndefined();
	});

	it('does NOT fire for sole Company applicant on Plot Loan', () => {
		const result = runCrossFieldValidation(singleCompany, { loanName: 'Plot Loan' }, []);
		expect(result.warnings.find((w) => w.id === 'nbfc_min_applicant')).toBeUndefined();
	});
});

// ============================================================================
// Test 13: __individualApplicantCount must mirror the visible "Added Applicants"
// table — director-linked Individuals fold under their parent Company and are
// NOT counted as standalone. Detected 2026-05-04: a Sole Proprietorship
// Business Loan with one visible applicant was showing the Relationships page
// because the count read 3 (1 standalone + 2 director-linked) while the table
// rendered only 1 standalone row.
// ============================================================================

import {
	countStandaloneIndividuals,
	isStandaloneApplicant
} from '$lib/utils/applicantVisibility';

describe('countStandaloneIndividuals — visibility-aligned count', () => {
	it('counts a single standalone Individual (sole proprietor)', () => {
		const applicants = [{ id: 'a1', applicantType: 'Individual' }];
		expect(countStandaloneIndividuals(applicants)).toBe(1);
	});

	it('hides director-linked Individuals when the parent Company exists', () => {
		const applicants = [
			{ id: 'co', applicantType: 'Company' },
			{ id: 'd1', applicantType: 'Individual', linkedCompanyId: 'co' },
			{ id: 'd2', applicantType: 'Individual', linkedCompanyId: 'co' }
		];
		// Two director-linked individuals fold under the company → 0 standalone.
		expect(countStandaloneIndividuals(applicants)).toBe(0);
	});

	it('shows director-linked Individuals when their parent Company is missing', () => {
		// Company was deleted but directors remain — they surface as standalone
		// rows in the table, so the count must include them.
		const applicants = [
			{ id: 'd1', applicantType: 'Individual', linkedCompanyId: 'deleted-co' },
			{ id: 'd2', applicantType: 'Individual', linkedCompanyId: 'deleted-co' }
		];
		expect(countStandaloneIndividuals(applicants)).toBe(2);
	});

	it('mixes standalone and director-linked correctly', () => {
		const applicants = [
			{ id: 'co', applicantType: 'Company' },
			{ id: 'd1', applicantType: 'Individual', linkedCompanyId: 'co' }, // hidden
			{ id: 'p1', applicantType: 'Individual' }, // standalone primary
			{ id: 'p2', applicantType: 'Individual' } // standalone co-applicant
		];
		expect(countStandaloneIndividuals(applicants)).toBe(2);
	});

	it('ignores typed-but-empty entries (applicantType="")', () => {
		const applicants = [
			{ id: 'a1', applicantType: 'Individual' },
			{ id: 'a2', applicantType: '' }
		];
		expect(countStandaloneIndividuals(applicants)).toBe(1);
	});

	it('isStandaloneApplicant flips false for director linked to existing company', () => {
		const applicants = [
			{ id: 'co', applicantType: 'Company' },
			{ id: 'd1', applicantType: 'Individual', linkedCompanyId: 'co' }
		];
		expect(isStandaloneApplicant(applicants[1], applicants)).toBe(false);
	});
});
