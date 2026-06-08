/**
 * =============================================================================
 * RULE ENGINE — FIXTURE PROFILES (Tests)
 * =============================================================================
 *
 * Tests for the 25 scenario-derived loan application fixtures.
 *
 * Fixture DATA lives in $lib/testing/fixtures/fixtureProfiles.ts (no vitest
 * dependency) so it can be safely imported at server runtime for DB seeding.
 *
 * This file re-exports the fixtures for backward compatibility with any test
 * files that import from here.
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import {
	// ── New 25 fixtures (canonical names) ──
	fixture01_SalariedClean,
	fixture02_SelfEmployedCA,
	fixture03_Pensioner,
	fixture04_BTCleanTrack,
	fixture05_BTTopupCouple,
	fixture06_TopupOnly,
	fixture07_LAPNewTerm,
	fixture08_LAPBTTerm,
	fixture09_LAPTopup,
	fixture10_LAPBTTopup,
	fixture11_LAPDOD,
	fixture12_PlotOnly,
	fixture13_PlotConstruction,
	fixture14_PlotEquity,
	fixture15_ConstructionOnly,
	fixture16_PlotBT,
	fixture17_PersonalFresh,
	fixture18_PersonalConsol,
	fixture19_PersonalNoOblig,
	fixture20_BusinessFresh,
	fixture21_BusinessConsol,
	fixture22_BusinessCompany,
	fixture23_ProfFresh,
	fixture24_ProfConsol,
	fixture25_ProfNoOblig,
	// ── Backward-compat aliases (old names) ──
	fixture02_SalariedWithCarLoan,
	fixture04_CashHeavyTrader,
	fixture06_NRISalaried,
	fixture07_CompanyPvtLtd,
	fixture09_BTIrregularTrack,
	fixture10_LowCIBILDefault,
	fixture11_HighFOIR,
	fixture12_CoupleJoint,
	fixture13_HighNetWorth,
	fixture14_YoungFirstBuyer,
	fixture15_SeniorPensioner,
	ALL_FIXTURES
} from '$lib/testing/fixtures/fixtureProfiles';

// Aliases that share names with new canonical exports need local aliases
// so we can re-export them under the old name
const fixture03_SelfEmployedCA_compat = fixture02_SelfEmployedCA; // old fixture03 → new fixture02 (same data via alias chain)
const fixture05_Pensioner_compat = fixture03_Pensioner; // old fixture05 → new fixture03
const fixture08_BTCleanTrack_compat = fixture04_BTCleanTrack; // old fixture08 → new fixture04

// Re-export all fixtures for backward compatibility with other test files
export {
	// ── New canonical names ──
	fixture01_SalariedClean,
	fixture02_SelfEmployedCA,
	fixture03_Pensioner,
	fixture04_BTCleanTrack,
	fixture05_BTTopupCouple,
	fixture06_TopupOnly,
	fixture07_LAPNewTerm,
	fixture08_LAPBTTerm,
	fixture09_LAPTopup,
	fixture10_LAPBTTopup,
	fixture11_LAPDOD,
	fixture12_PlotOnly,
	fixture13_PlotConstruction,
	fixture14_PlotEquity,
	fixture15_ConstructionOnly,
	fixture16_PlotBT,
	fixture17_PersonalFresh,
	fixture18_PersonalConsol,
	fixture19_PersonalNoOblig,
	fixture20_BusinessFresh,
	fixture21_BusinessConsol,
	fixture22_BusinessCompany,
	fixture23_ProfFresh,
	fixture24_ProfConsol,
	fixture25_ProfNoOblig,
	// ── Backward-compat aliases (old names for downstream tests) ──
	fixture02_SalariedWithCarLoan,
	fixture03_SelfEmployedCA_compat as fixture03_SelfEmployedCA,
	fixture04_CashHeavyTrader,
	fixture05_Pensioner_compat as fixture05_Pensioner,
	fixture06_NRISalaried,
	fixture07_CompanyPvtLtd,
	fixture08_BTCleanTrack_compat as fixture08_BTCleanTrack,
	fixture09_BTIrregularTrack,
	fixture10_LowCIBILDefault,
	fixture11_HighFOIR,
	fixture12_CoupleJoint,
	fixture13_HighNetWorth,
	fixture14_YoungFirstBuyer,
	fixture15_SeniorPensioner,
	ALL_FIXTURES
};

// ═════════════════════════════════════════════════════════════════════════════
// TESTS — payload shape validation (all 25 fixtures)
// ═════════════════════════════════════════════════════════════════════════════

describe('fixtureProfiles — payload shape validation', () => {
	describe.each(ALL_FIXTURES)('$name', ({ fixture }) => {
		// ── Top-level shape ──────────────────────────────────────────────

		it('has a loanTransaction object', () => {
			expect(fixture.loanTransaction).toBeDefined();
			expect(typeof fixture.loanTransaction).toBe('object');
		});

		it('has an allApplicantDetails array with at least one entry', () => {
			expect(Array.isArray(fixture.allApplicantDetails)).toBe(true);
			expect(fixture.allApplicantDetails.length).toBeGreaterThanOrEqual(1);
		});

		// ── LoanTransaction required fields ──────────────────────────────

		it('loanTransaction.loanName is a non-empty string', () => {
			expect(typeof fixture.loanTransaction.loanName).toBe('string');
			expect(fixture.loanTransaction.loanName.length).toBeGreaterThan(0);
		});

		it('loanTransaction.loanType is a non-empty string', () => {
			expect(typeof fixture.loanTransaction.loanType).toBe('string');
			expect(fixture.loanTransaction.loanType.length).toBeGreaterThan(0);
		});

		it('loanTransaction.loanAmount is a positive number', () => {
			expect(typeof fixture.loanTransaction.loanAmount).toBe('number');
			expect(fixture.loanTransaction.loanAmount).toBeGreaterThan(0);
		});

		it('loanTransaction.tenureYears is a positive number', () => {
			expect(typeof fixture.loanTransaction.tenureYears).toBe('number');
			expect(fixture.loanTransaction.tenureYears).toBeGreaterThan(0);
		});

		it('loanTransaction.numberOfApplicants matches allApplicantDetails length', () => {
			expect(fixture.loanTransaction.numberOfApplicants).toBe(fixture.allApplicantDetails.length);
		});

		// ── Per-applicant required fields ─────────────────────────────────

		it('every applicant has applicantType', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(['Individual', 'Company']).toContain(applicant.applicantType);
			}
		});

		it('every applicant has fullName as a non-empty string', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(typeof applicant.fullName).toBe('string');
				expect(applicant.fullName.length).toBeGreaterThan(0);
			}
		});

		it('every applicant has age as a positive number', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(typeof applicant.age).toBe('number');
				expect(applicant.age).toBeGreaterThan(0);
			}
		});

		it('every applicant has employmentType as a non-empty string', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(typeof applicant.employmentType).toBe('string');
				expect(applicant.employmentType.length).toBeGreaterThan(0);
			}
		});

		it('every applicant has creditScore in range 300-900', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(typeof applicant.creditScore).toBe('number');
				expect(applicant.creditScore).toBeGreaterThanOrEqual(300);
				expect(applicant.creditScore).toBeLessThanOrEqual(900);
			}
		});

		it('every applicant has hasExistingObligations boolean', () => {
			for (const applicant of fixture.allApplicantDetails) {
				expect(typeof applicant.hasExistingObligations).toBe('boolean');
			}
		});

		// ── Income values are positive when present ──────────────────────

		it('grossIncome is positive when present', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.grossIncome !== undefined) {
					expect(applicant.grossIncome).toBeGreaterThan(0);
				}
			}
		});

		it('netIncome is positive when present', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.netIncome !== undefined) {
					expect(applicant.netIncome).toBeGreaterThan(0);
				}
			}
		});

		it('monthlyOtherIncome is positive when present', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.monthlyOtherIncome !== undefined) {
					expect(applicant.monthlyOtherIncome).toBeGreaterThan(0);
				}
			}
		});

		// ── Financials positive values when present ──────────────────────

		it('financials netProfit values are positive when present', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.financials) {
					for (const val of applicant.financials.netProfit) {
						expect(val).toBeGreaterThan(0);
					}
				}
			}
		});

		it('financials grossReceipts values are positive when present', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.financials) {
					for (const val of applicant.financials.grossReceipts) {
						expect(val).toBeGreaterThan(0);
					}
				}
			}
		});

		// ── Obligations structure ────────────────────────────────────────

		it('obligations array is present when hasExistingObligations is true', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.hasExistingObligations) {
					expect(Array.isArray(applicant.obligations)).toBe(true);
					expect(applicant.obligations!.length).toBeGreaterThan(0);
				}
			}
		});

		it('each obligation has required fields', () => {
			for (const applicant of fixture.allApplicantDetails) {
				if (applicant.obligations) {
					for (const obl of applicant.obligations) {
						expect(typeof obl.id).toBe('string');
						expect(obl.id.length).toBeGreaterThan(0);
						expect(['term_loan', 'credit_line']).toContain(obl.obligationType);
						expect(typeof obl.loanType).toBe('string');
						expect(obl.loanType.length).toBeGreaterThan(0);
						expect(typeof obl.emi).toBe('string');
						expect(typeof obl.selectedToClose).toBe('string');
					}
				}
			}
		});
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// SPECIFIC FIXTURE TESTS — scenario-specific assertions
// ═════════════════════════════════════════════════════════════════════════════

describe('fixtureProfiles — fixture-specific assertions', () => {
	// ── Home Loan scenarios ──

	it('fixture 01 (HL-NEW-SAL-CLEAN): salaried, no obligations, Home Loan new', () => {
		const primary = fixture01_SalariedClean.allApplicantDetails[0];
		expect(primary.hasExistingObligations).toBe(false);
		expect(primary.obligations).toBeUndefined();
		expect(primary.employmentType).toBe('Salaried(Private)');
		expect(fixture01_SalariedClean.loanTransaction.loanName).toBe('Home Loan');
		expect(fixture01_SalariedClean.loanTransaction.loanType).toBe('New Loan');
	});

	it('fixture 02 (HL-NEW-SE-PRO): self-employed CA, Home Loan new', () => {
		const primary = fixture02_SelfEmployedCA.allApplicantDetails[0];
		expect(primary.employmentType).toBe('Self-employed(Professional)');
		expect(primary.professionType).toBe('Chartered Accountant(CA)');
		expect(primary.financials).toBeDefined();
		expect(primary.financials!.netProfit).toHaveLength(3);
		expect(fixture02_SelfEmployedCA.loanTransaction.loanName).toBe('Home Loan');
	});

	it('fixture 03 (HL-NEW-PENS): pensioner, Home Loan new', () => {
		const primary = fixture03_Pensioner.allApplicantDetails[0];
		expect(primary.employmentType).toBe('Pensioner');
		expect(primary.pensionProfile).toBeDefined();
		expect(primary.pensionProfile!.isGovernmentPension).toBe(true);
		expect(fixture03_Pensioner.loanTransaction.loanName).toBe('Home Loan');
	});

	it('fixture 04 (HL-BT-ONLY): BT only, Home Loan', () => {
		const tx = fixture04_BTCleanTrack.loanTransaction;
		expect(tx.loanName).toBe('Home Loan');
		expect(tx.loanType).toBe('Balance Transfer Only');
		expect(tx.currentBank).toBeDefined();
		expect(tx.principalOutstanding).toBeGreaterThan(0);
		// S77e Step-4: repaymentTrack removed from HL fixtures — orphan field (defined
		// in lapLoan/existingDetails.ts but not surfaced on any HL page).
		expect(tx.sanctionAmount).toBe(4000000);
	});

	it('fixture 05 (HL-BT-TOPUP): BT+topup, couple joint', () => {
		expect(fixture05_BTTopupCouple.allApplicantDetails).toHaveLength(2);
		expect(fixture05_BTTopupCouple.loanTransaction.loanType).toBe('Balance Transfer With Top-up');
		const coApplicant = fixture05_BTTopupCouple.allApplicantDetails[1];
		expect(coApplicant.roleInApplication).toBe('Co-applicant');
		expect(coApplicant.relationshipWithPrimary).toBe('Spouse');
	});

	it('fixture 06 (HL-TOPUP): top-up only', () => {
		expect(fixture06_TopupOnly.loanTransaction.loanType).toBe('Top-up Only');
		expect(fixture06_TopupOnly.loanTransaction.topUpAmount).toBeGreaterThan(0);
	});

	// ── LAP scenarios ──

	it('fixture 07 (LAP-NEW-TERM): LAP new, trader', () => {
		expect(fixture07_LAPNewTerm.loanTransaction.loanName).toBe('Loan Against Property');
		expect(fixture07_LAPNewTerm.loanTransaction.loanType).toBe('New Loan');
		const primary = fixture07_LAPNewTerm.allApplicantDetails[0];
		expect(primary.employmentType).toBe('Self-employed(Other)');
	});

	it('fixture 08 (LAP-BT-TERM): LAP BT only', () => {
		expect(fixture08_LAPBTTerm.loanTransaction.loanName).toBe('Loan Against Property');
		expect(fixture08_LAPBTTerm.loanTransaction.loanType).toBe('Balance Transfer Only');
	});

	it('fixture 11 (LAP-DOD-NEW): LAP DOD new loan', () => {
		expect(fixture11_LAPDOD.loanTransaction.loanName).toBe('Loan Against Property');
		expect(fixture11_LAPDOD.loanTransaction.loanType).toBe('New Loan');
	});

	// ── Plot Loan scenarios ──

	it('fixture 12 (PLOT-ONLY): plot loan only', () => {
		// Post-rename (2026-05-31): scope lives in loanType for every loan
		// (Plot included); the Plot variant moved to its own loanVariant field.
		expect(fixture12_PlotOnly.loanTransaction.loanName).toBe('Plot Loan');
		expect(fixture12_PlotOnly.loanTransaction.loanType).toBe('New Loan');
		expect(fixture12_PlotOnly.loanTransaction.loanVariant).toBe('Plot Loan Only');
	});

	it('fixture 13 (PLOT-CONSTRUCTION): plot & construction', () => {
		expect(fixture13_PlotConstruction.loanTransaction.loanName).toBe('Plot Loan');
		expect(fixture13_PlotConstruction.loanTransaction.loanType).toBe('New Loan');
		expect(fixture13_PlotConstruction.loanTransaction.loanVariant).toBe('Plot & Construction Loan');
	});

	it('fixture 16 (PLOT-BT): plot balance transfer', () => {
		// BT scope has no variant question — loanVariant stays undefined/empty.
		expect(fixture16_PlotBT.loanTransaction.loanName).toBe('Plot Loan');
		expect(fixture16_PlotBT.loanTransaction.loanType).toBe('Balance Transfer Only');
	});

	// ── Personal Loan scenarios ──

	it('fixture 17 (PL-FRESH): personal, start fresh with obligations', () => {
		const primary = fixture17_PersonalFresh.allApplicantDetails[0];
		expect(primary.hasExistingObligations).toBe(true);
		expect(primary.obligations).toBeDefined();
		expect(fixture17_PersonalFresh.loanTransaction.loanName).toBe('Personal Loan');
		expect(fixture17_PersonalFresh.loanTransaction.loanType).toBe('New Loan');
	});

	it('fixture 18 (PL-CONSOL): personal, debt consolidation', () => {
		expect(fixture18_PersonalConsol.loanTransaction.loanType).toBe(
			'Debt Consolidation with Extra Funds'
		);
	});

	it('fixture 19 (PL-NO-OBLIG): personal, no obligations', () => {
		const primary = fixture19_PersonalNoOblig.allApplicantDetails[0];
		expect(primary.hasExistingObligations).toBe(false);
		expect(fixture19_PersonalNoOblig.loanTransaction.loanType).toBe('New Loan');
	});

	// ── Business Loan scenarios ──

	it('fixture 22 (BL-NO-OBLIG): business, company applicant', () => {
		const primary = fixture22_BusinessCompany.allApplicantDetails[0];
		expect(primary.applicantType).toBe('Company');
		expect(primary.companyType).toBeDefined();
		expect(fixture22_BusinessCompany.loanTransaction.loanName).toBe('Business Loan');
	});

	// ── Professional Loan scenarios ──

	it('fixture 23 (PROF-FRESH): professional, CA, start fresh', () => {
		const primary = fixture23_ProfFresh.allApplicantDetails[0];
		expect(primary.professionType).toBe('Chartered Accountant(CA)');
		expect(fixture23_ProfFresh.loanTransaction.loanName).toBe('Professional Loan');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// CROSS-FIXTURE CONSISTENCY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('fixtureProfiles — cross-fixture consistency', () => {
	it('all fixtures are present (25 original + 12 edge cases)', () => {
		expect(ALL_FIXTURES).toHaveLength(37);
	});

	it('every fixture has a unique name', () => {
		const names = ALL_FIXTURES.map((f) => f.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it('no two primary applicants share the same full name', () => {
		const names = ALL_FIXTURES.map((f) => f.fixture.allApplicantDetails[0].fullName);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it('CIBIL scores cover a realistic range (below 720 to above 770)', () => {
		const scores = ALL_FIXTURES.flatMap((f) =>
			f.fixture.allApplicantDetails.map((a) => a.creditScore)
		);
		expect(Math.min(...scores)).toBeLessThanOrEqual(720);
		expect(Math.max(...scores)).toBeGreaterThanOrEqual(770);
	});

	it('at least one fixture uses each employment type category', () => {
		const types = new Set(
			ALL_FIXTURES.flatMap((f) => f.fixture.allApplicantDetails.map((a) => a.employmentType))
		);
		expect(types.has('Salaried(Private)')).toBe(true);
		expect(types.has('Self-employed(Professional)')).toBe(true);
		expect(types.has('Self-employed(Other)')).toBe(true);
		expect(types.has('Pensioner')).toBe(true);
	});

	it('at least one BT fixture exists (uses exact form values)', () => {
		const btFixtures = ALL_FIXTURES.filter(
			(f) =>
				f.fixture.loanTransaction.loanType === 'Balance Transfer Only' ||
				f.fixture.loanTransaction.loanType === 'Balance Transfer With Top-up' ||
				f.fixture.loanTransaction.loanType === 'Plot Balance Transfer'
		);
		expect(btFixtures.length).toBeGreaterThanOrEqual(1);
	});

	it('at least one multi-applicant fixture exists', () => {
		const multiApp = ALL_FIXTURES.filter((f) => f.fixture.allApplicantDetails.length > 1);
		expect(multiApp.length).toBeGreaterThanOrEqual(1);
	});

	it('at least one Company applicant fixture exists', () => {
		const companyFixtures = ALL_FIXTURES.filter((f) =>
			f.fixture.allApplicantDetails.some((a) => a.applicantType === 'Company')
		);
		expect(companyFixtures.length).toBeGreaterThanOrEqual(1);
	});

	it('at least one fixture with obligations exists', () => {
		const withObligations = ALL_FIXTURES.filter((f) =>
			f.fixture.allApplicantDetails.some((a) => a.hasExistingObligations)
		);
		expect(withObligations.length).toBeGreaterThanOrEqual(1);
	});

	it('loan amounts are realistic Indian amounts (above 5L)', () => {
		for (const { fixture } of ALL_FIXTURES) {
			expect(fixture.loanTransaction.loanAmount).toBeGreaterThanOrEqual(500000);
		}
	});

	it('all loanName values use exact form values', () => {
		const validLoanNames = new Set([
			'Home Loan',
			'Loan Against Property',
			'Plot Loan',
			'Personal Loan',
			'Business Loan',
			'Professional Loan'
		]);
		for (const { fixture } of ALL_FIXTURES) {
			expect(validLoanNames.has(fixture.loanTransaction.loanName)).toBe(true);
		}
	});

	it('all loanType values use exact form values (no stale values)', () => {
		const validLoanTypes = new Set([
			'New Loan',
			'Balance Transfer Only',
			'Balance Transfer With Top-up',
			'Top-up Only',
			'Plot Loan Only',
			'Plot & Construction Loan',
			'Plot & Equity Loan',
			'Construction Loan Only',
			'Plot Balance Transfer',
			// 'Start Fresh with New Loan' retired in S213 (D8 sunset, ADR-0024).
			// Value now writes canonical 'New Loan' from formSchema.json q4_loanType.
			'Debt Consolidation with Extra Funds'
		]);
		for (const { fixture } of ALL_FIXTURES) {
			expect(validLoanTypes.has(fixture.loanTransaction.loanType)).toBe(true);
		}
	});

	it('covers all 6 loan names', () => {
		const loanNames = new Set(ALL_FIXTURES.map((f) => f.fixture.loanTransaction.loanName));
		expect(loanNames.size).toBe(6);
	});
});
