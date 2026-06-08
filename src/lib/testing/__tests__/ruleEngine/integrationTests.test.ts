/**
 * =============================================================================
 * INTEGRATION TESTS — 25 Fixture Profiles x 3 Sample Lender Rule Documents
 * =============================================================================
 *
 * Runs every fixture profile through all three sample lender rule documents
 * using the real evaluateLender() and buildResults() pure functions.
 *
 * No MongoDB required — all data is passed in directly.
 *
 * Test Groups:
 *   1. Structural validity (all combinations)
 *   2. PVT gate behavior
 *   3. GOV gate behavior
 *   4. NBFC gate behavior
 *   5. Deviation coverage
 *   6. Income assessment variance
 *   7. ROI variation
 *   8. FOIR pressure
 *   9. LTV computation
 *  10. Multi-lender buildResults
 *  11. NRI coverage
 *  12. Company applicant handling
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import { evaluateLender, buildResults } from '$lib/ruleEngine/evaluationEngine.js';
import {
	SAMPLE_PVT_BANK,
	SAMPLE_GOV_BANK,
	SAMPLE_NBFC,
	ALL_SAMPLE_RULE_DOCS
} from '$lib/ruleEngine/sampleRuleDocs.js';
import {
	fixture01_SalariedClean,
	fixture02_SalariedWithCarLoan,
	fixture03_SelfEmployedCA,
	fixture04_CashHeavyTrader,
	fixture05_Pensioner,
	fixture06_NRISalaried,
	fixture07_CompanyPvtLtd,
	fixture08_BTCleanTrack,
	fixture09_BTIrregularTrack,
	fixture10_LowCIBILDefault,
	fixture11_HighFOIR,
	fixture12_CoupleJoint,
	fixture13_HighNetWorth,
	fixture14_YoungFirstBuyer,
	fixture15_SeniorPensioner,
	ALL_FIXTURES
} from './fixtureProfiles.test.js';
import type { LenderEvaluation, ParsedLenderRuleDocument } from '$lib/ruleEngine/types.js';

// =============================================================================
// HELPERS
// =============================================================================

/** Evaluate a fixture against a specific lender and return the result */
function evaluate(
	fixture: (typeof ALL_FIXTURES)[number]['fixture'],
	ruleDoc: ParsedLenderRuleDocument
): LenderEvaluation {
	return evaluateLender(fixture, ruleDoc);
}

// =============================================================================
// GROUP 1: STRUCTURAL VALIDITY
// =============================================================================

describe('Group 1: Structural validity — all fixture x lender combinations', () => {
	const lenderDocs = [
		{ name: 'PVT', doc: SAMPLE_PVT_BANK },
		{ name: 'GOV', doc: SAMPLE_GOV_BANK },
		{ name: 'NBFC', doc: SAMPLE_NBFC }
	];

	describe.each(ALL_FIXTURES)('$name', ({ fixture }) => {
		for (const { name: lenderName, doc } of lenderDocs) {
			describe(`vs ${lenderName}`, () => {
				it('returns a valid LenderEvaluation with required fields', () => {
					const result = evaluate(fixture, doc);
					expect(result).toBeDefined();
					expect(result.lender_id).toBe(doc.lender_id);
					expect(result.lender_name).toBe(doc.lender_name);
					expect(result.classification).toBe(doc.classification);
					expect(typeof result.traffic_light).toBe('string');
					expect(typeof result.assessed_income).toBe('number');
					expect(typeof result.offered_amount).toBe('number');
					expect(typeof result.emi).toBe('number');
					expect(typeof result.roi).toBe('number');
					expect(Array.isArray(result.gate_results)).toBe(true);
					expect(Array.isArray(result.income_sources)).toBe(true);
					expect(Array.isArray(result.deviations_applied)).toBe(true);
				});

				it('traffic_light is one of green/amber/red/grey', () => {
					const result = evaluate(fixture, doc);
					expect(['green', 'amber', 'red', 'grey']).toContain(result.traffic_light);
				});

				it('all numeric fields are non-negative', () => {
					const result = evaluate(fixture, doc);
					expect(result.assessed_income).toBeGreaterThanOrEqual(0);
					expect(result.offered_amount).toBeGreaterThanOrEqual(0);
					expect(result.emi).toBeGreaterThanOrEqual(0);
					expect(result.roi).toBeGreaterThanOrEqual(0);
					expect(result.foir).toBeGreaterThanOrEqual(0);
					expect(result.eligible_amount).toBeGreaterThanOrEqual(0);
					expect(result.obligation_load_monthly).toBeGreaterThanOrEqual(0);
					expect(result.tenure_months).toBeGreaterThanOrEqual(0);
				});

				it('gate_results is a non-empty array for non-grey evaluations', () => {
					const result = evaluate(fixture, doc);
					if (result.traffic_light !== 'grey') {
						expect(result.gate_results.length).toBeGreaterThan(0);
					}
				});

				it('income_sources has entries for non-grey evaluations', () => {
					const result = evaluate(fixture, doc);
					if (result.traffic_light !== 'grey') {
						expect(result.income_sources.length).toBeGreaterThan(0);
					}
				});
			});
		}
	});
});

// =============================================================================
// GROUP 2: PVT GATE BEHAVIOR
// =============================================================================

describe('Group 2: PVT gate behavior', () => {
	it('FIX-01 (CIBIL 780, age 34, HL) — all gates pass', () => {
		const result = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-04 (CIBIL 730, LAP) vs PVT — evaluates (LAP supported), CIBIL passes', () => {
		const result = evaluate(fixture04_CashHeavyTrader, SAMPLE_PVT_BANK);
		expect(result.traffic_light).not.toBe('grey');
		// CIBIL gate passes (730 >= 700)
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
		// May be red/amber due to self-employed income haircut + FOIR constraints
	});

	it('FIX-05 (age 62) vs PVT — traffic_light is red (age 62 > 58)', () => {
		const result = evaluate(fixture05_Pensioner, SAMPLE_PVT_BANK);
		expect(result.traffic_light).toBe('red');
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
	});

	it('FIX-07 (Business Loan) vs PVT — traffic_light is grey (BL not supported)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, SAMPLE_PVT_BANK);
		expect(result.traffic_light).toBe('grey');
		// Grey evaluations should have empty gate_results
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-09 (CIBIL 760) vs PVT — CIBIL passes (760 >= 700)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, SAMPLE_PVT_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
	});

	it('FIX-10 (PL) vs PVT — grey (PL not supported by PVT)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, SAMPLE_PVT_BANK);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-14 (Plot Loan) vs PVT — grey (Plot Loan not supported)', () => {
		const result = evaluate(fixture14_YoungFirstBuyer, SAMPLE_PVT_BANK);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-15 (age 62) vs PVT — age gate fails (62 > 58)', () => {
		const result = evaluate(fixture15_SeniorPensioner, SAMPLE_PVT_BANK);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});
});

// =============================================================================
// GROUP 3: GOV GATE BEHAVIOR
// =============================================================================

describe('Group 3: GOV gate behavior', () => {
	it('FIX-04 (CIBIL 730) vs GOV — CIBIL passes (730 >= 650)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, SAMPLE_GOV_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-05 (age 62) vs GOV — traffic_light is red (age 62 > 60)', () => {
		const result = evaluate(fixture05_Pensioner, SAMPLE_GOV_BANK);
		expect(result.traffic_light).toBe('red');
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
	});

	it('FIX-07 (Company, BL) vs GOV — evaluates (BL supported), company gate passes (age 8 >= 2)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, SAMPLE_GOV_BANK);
		expect(result.traffic_light).not.toBe('grey');
		// Company gate should pass (applies_when Company, age 8 >= 2)
		const companyGate = result.gate_results.find((g) => g.section === 'company');
		expect(companyGate).toBeDefined();
		expect(companyGate!.passed).toBe(true);
	});

	it('FIX-09 (CIBIL 760) vs GOV — CIBIL passes (760 >= 650)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, SAMPLE_GOV_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-10 (PL) vs GOV — grey (PL not supported by GOV)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, SAMPLE_GOV_BANK);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-15 (age 62) vs GOV — age gate fails (62 > 60)', () => {
		const result = evaluate(fixture15_SeniorPensioner, SAMPLE_GOV_BANK);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});
});

// =============================================================================
// GROUP 4: NBFC GATE BEHAVIOR
// =============================================================================

describe('Group 4: NBFC gate behavior', () => {
	it('FIX-04 (LAP) vs NBFC — grey (LAP not supported by NBFC)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, SAMPLE_NBFC);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-05 (age 62) vs NBFC — age passes (62 <= 65)', () => {
		const result = evaluate(fixture05_Pensioner, SAMPLE_NBFC);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(true);
	});

	it('FIX-07 (Company, BL) vs NBFC — evaluates (BL supported), company gate passes (age 8 >= 3)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, SAMPLE_NBFC);
		expect(result.traffic_light).not.toBe('grey');
		const companyGate = result.gate_results.find((g) => g.section === 'company');
		expect(companyGate).toBeDefined();
		expect(companyGate!.passed).toBe(true);
	});

	it('FIX-09 (LAP) vs NBFC — grey (LAP not supported by NBFC)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, SAMPLE_NBFC);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-10 (PL) vs NBFC — grey (PL not supported by NBFC)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, SAMPLE_NBFC);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-15 (age 62) vs NBFC — all gates pass', () => {
		const result = evaluate(fixture15_SeniorPensioner, SAMPLE_NBFC);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
		expect(result.traffic_light).not.toBe('grey');
	});
});

// =============================================================================
// GROUP 5: DEVIATION COVERAGE
// =============================================================================

describe('Group 5: Deviation coverage', () => {
	it('FIX-10 (PL, CIBIL 710) — grey at all sample lenders (none support PL)', () => {
		const pvtResult = evaluate(fixture10_LowCIBILDefault, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture10_LowCIBILDefault, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture10_LowCIBILDefault, SAMPLE_NBFC);

		// Personal Loan not supported by any sample lender
		expect(pvtResult.traffic_light).toBe('grey');
		expect(govResult.traffic_light).toBe('grey');
		expect(nbfcResult.traffic_light).toBe('grey');
		// Grey evaluations have no deviations
		expect(pvtResult.deviations_applied).toHaveLength(0);
		expect(govResult.deviations_applied).toHaveLength(0);
		expect(nbfcResult.deviations_applied).toHaveLength(0);
	});

	it('FIX-09 (CIBIL 760) vs PVT — all gates pass, no deviation', () => {
		const result = evaluate(fixture09_BTIrregularTrack, SAMPLE_PVT_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.deviations_applied).toHaveLength(0);
	});

	it('FIX-04 (CIBIL 730) vs PVT — all gates pass, no deviation', () => {
		const result = evaluate(fixture04_CashHeavyTrader, SAMPLE_PVT_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.deviations_applied).toHaveLength(0);
	});

	it('FIX-13 (CIBIL 780) passes all gates -> no deviation needed', () => {
		const resultPvt = evaluate(fixture13_HighNetWorth, SAMPLE_PVT_BANK);
		const resultGov = evaluate(fixture13_HighNetWorth, SAMPLE_GOV_BANK);
		const resultNbfc = evaluate(fixture13_HighNetWorth, SAMPLE_NBFC);

		expect(resultPvt.all_gates_passed).toBe(true);
		expect(resultPvt.deviations_applied).toHaveLength(0);
		expect(resultGov.all_gates_passed).toBe(true);
		expect(resultGov.deviations_applied).toHaveLength(0);
		expect(resultNbfc.all_gates_passed).toBe(true);
		expect(resultNbfc.deviations_applied).toHaveLength(0);
	});
});

// =============================================================================
// GROUP 6: INCOME ASSESSMENT VARIANCE
// =============================================================================

describe('Group 6: Income assessment variance across lenders', () => {
	it('FIX-01 (salaried, 80K net) — same assessed income for all 3 lenders (0% haircut)', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture01_SalariedClean, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture01_SalariedClean, SAMPLE_NBFC);

		// All lenders have 0% haircut on salaried_regular
		// FIX-01 netIncome = 80000, so assessed = 80000
		expect(pvtResult.assessed_income).toBe(govResult.assessed_income);
		expect(govResult.assessed_income).toBe(nbfcResult.assessed_income);
		expect(pvtResult.assessed_income).toBe(80000);
	});

	it('FIX-03 (professional CA) — different assessed amounts per lender haircut', () => {
		const pvtResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_NBFC);

		// FIX-03 employmentType is Self-employed(Professional) -> maps to professional_practice
		// Gross monthly = avg netProfit / 12 = avg(1000000, 1200000, 1400000) / 12 = 1200000/12 = 100000
		const grossMonthly = 100000;

		// PVT: 15% haircut -> assessed = 85000
		expect(pvtResult.assessed_income).toBeCloseTo(grossMonthly * 0.85, -1);
		// GOV: 20% haircut -> assessed = 80000
		expect(govResult.assessed_income).toBeCloseTo(grossMonthly * 0.8, -1);
		// NBFC: 10% haircut -> assessed = 90000
		expect(nbfcResult.assessed_income).toBeCloseTo(grossMonthly * 0.9, -1);

		// NBFC gives highest assessed, GOV gives lowest
		expect(nbfcResult.assessed_income).toBeGreaterThan(pvtResult.assessed_income);
		expect(pvtResult.assessed_income).toBeGreaterThan(govResult.assessed_income);
	});

	it('FIX-05 (pensioner) — PVT 0% haircut, GOV 0%, NBFC 5% haircut', () => {
		const pvtResult = evaluate(fixture05_Pensioner, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture05_Pensioner, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture05_Pensioner, SAMPLE_NBFC);

		// FIX-05: Pensioner, netIncome = 40000
		// PVT maps Pensioner -> pension profile, 0% haircut = 40000
		// GOV maps Pensioner -> pension profile, 0% haircut = 40000
		// NBFC maps Pensioner -> pension profile, 5% haircut = 38000

		// Note: PVT and GOV are red due to age gates, but income is still assessed
		expect(pvtResult.assessed_income).toBe(40000);
		expect(govResult.assessed_income).toBe(40000);
		expect(nbfcResult.assessed_income).toBeCloseTo(38000, -1);
	});

	it('FIX-12 (couple joint) — combined income from both applicants', () => {
		const pvtResult = evaluate(fixture12_CoupleJoint, SAMPLE_PVT_BANK);

		// Primary (75K net) + Co-applicant (50K net), both salaried 0% haircut
		// Total assessed should be 75000 + 50000 = 125000
		expect(pvtResult.assessed_income).toBe(125000);
	});

	it('FIX-13 (salaried 80K net) — assessed income is 80000', () => {
		const pvtResult = evaluate(fixture13_HighNetWorth, SAMPLE_PVT_BANK);
		// netIncome = 80000, salaried_regular 0% haircut
		expect(pvtResult.assessed_income).toBe(80000);
	});

	it('FIX-07 (Company) — uses financial data for income assessment', () => {
		const govResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_GOV_BANK);
		// Company with financials: avg netProfit = (3500000+4200000+5100000)/3 = 4266666.67
		// Monthly = 4266666.67 / 12 = 355555.56
		// GOV business_proprietorship haircut = 30%, so assessed = 355555.56 * 0.70 = 248888.89
		expect(govResult.assessed_income).toBeGreaterThan(0);
		// Rough check: income should be in a reasonable range
		expect(govResult.assessed_income).toBeGreaterThan(200000);
		expect(govResult.assessed_income).toBeLessThan(400000);
	});
});

// =============================================================================
// GROUP 7: ROI VARIATION
// =============================================================================

describe('Group 7: ROI variation across lenders', () => {
	it('FIX-01 (CIBIL 780) — PVT 8.35%, GOV 8.25%, NBFC 9.5%', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture01_SalariedClean, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture01_SalariedClean, SAMPLE_NBFC);

		expect(pvtResult.roi).toBeCloseTo(8.35, 2);
		expect(govResult.roi).toBeCloseTo(8.25, 2);
		expect(nbfcResult.roi).toBeCloseTo(9.5, 2);
	});

	it('FIX-02 (PL) — grey at all sample lenders (none support PL), ROI = 0', () => {
		const pvtResult = evaluate(fixture02_SalariedWithCarLoan, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture02_SalariedWithCarLoan, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture02_SalariedWithCarLoan, SAMPLE_NBFC);

		// Personal Loan not supported by any sample lender
		expect(pvtResult.traffic_light).toBe('grey');
		expect(govResult.traffic_light).toBe('grey');
		expect(nbfcResult.traffic_light).toBe('grey');
		expect(pvtResult.roi).toBe(0);
	});

	it('FIX-13 (CIBIL 780) — PVT 8.35%, GOV 8.25%, NBFC 9.5%', () => {
		const pvtResult = evaluate(fixture13_HighNetWorth, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture13_HighNetWorth, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture13_HighNetWorth, SAMPLE_NBFC);

		expect(pvtResult.roi).toBeCloseTo(8.35, 2);
		expect(govResult.roi).toBeCloseTo(8.25, 2);
		expect(nbfcResult.roi).toBeCloseTo(9.5, 2);
	});

	it('FIX-03 (CIBIL 750) — PVT 8.65%, GOV 8.25%, NBFC 9.5%', () => {
		const pvtResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture03_SelfEmployedCA, SAMPLE_NBFC);

		expect(pvtResult.roi).toBeCloseTo(8.65, 2);
		expect(govResult.roi).toBeCloseTo(8.25, 2);
		expect(nbfcResult.roi).toBeCloseTo(9.5, 2);
	});

	it('GOV ROI is always lowest (flat 8.25%) among the three lenders', () => {
		// Test with a profile that passes all three
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture01_SalariedClean, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture01_SalariedClean, SAMPLE_NBFC);

		expect(govResult.roi).toBeLessThan(pvtResult.roi);
		expect(govResult.roi).toBeLessThan(nbfcResult.roi);
	});

	it('NBFC ROI is always highest among the three lenders for same CIBIL', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		const nbfcResult = evaluate(fixture01_SalariedClean, SAMPLE_NBFC);

		expect(nbfcResult.roi).toBeGreaterThan(pvtResult.roi);
	});
});

// =============================================================================
// GROUP 8: FOIR PRESSURE
// =============================================================================

describe('Group 8: FOIR pressure — high obligations limit eligible amount', () => {
	it('FIX-11 (BL) vs PVT — grey (BL not supported by PVT)', () => {
		const pvtResult = evaluate(fixture11_HighFOIR, SAMPLE_PVT_BANK);
		expect(pvtResult.traffic_light).toBe('grey');
	});

	it('FIX-13 (80K income, no obligations) — zero obligation load, capacity available', () => {
		const pvtResult = evaluate(fixture13_HighNetWorth, SAMPLE_PVT_BANK);

		// No obligations
		expect(pvtResult.obligation_load_monthly).toBe(0);
		expect(pvtResult.offered_amount).toBeGreaterThan(0);
		// FOIR may equal max_foir when loan uses full capacity
		expect(pvtResult.foir).toBeLessThanOrEqual(pvtResult.max_foir);
	});

	it('FIX-02 (PL) vs PVT — grey (PL not supported), no FOIR computation', () => {
		const pvtResult = evaluate(fixture02_SalariedWithCarLoan, SAMPLE_PVT_BANK);

		// Personal Loan not supported by PVT
		expect(pvtResult.traffic_light).toBe('grey');
		// Grey evaluations have zero obligation load (no assessment performed)
		expect(pvtResult.obligation_load_monthly).toBe(0);
	});

	it('FIX-01 (no obligations) — zero obligation load', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		expect(pvtResult.obligation_load_monthly).toBe(0);
		expect(pvtResult.obligation_details).toHaveLength(0);
	});
});

// =============================================================================
// GROUP 9: LTV COMPUTATION
// =============================================================================

describe('Group 9: LTV computation for secured vs unsecured loans', () => {
	it('FIX-01 (HL 60L, property 75L) — secured loan gets LTV computation', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);

		// Home Loan is secured, so LTV fields should be populated
		expect(pvtResult.ltv).toBeDefined();
		expect(pvtResult.max_ltv).toBeDefined();
		expect(pvtResult.ltv_capped_amount).toBeDefined();

		// LTV = loanAmount / propertyValue = 6000000 / 7500000 = 0.80
		expect(pvtResult.ltv).toBeCloseTo(0.8, 2);

		// PVT LTV for 60L loan (30L-75L range): 80% -> capped at 75L * 0.80 = 60L
		expect(pvtResult.ltv_capped_amount).toBe(6000000);
	});

	it('FIX-07 (BL 50L) — unsecured loan, no LTV', () => {
		const govResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_GOV_BANK);

		// Business Loan is unsecured — no LTV computation
		expect(govResult.ltv).toBeUndefined();
		expect(govResult.max_ltv).toBeUndefined();
		expect(govResult.ltv_capped_amount).toBeUndefined();
	});

	it('Different lenders have different LTV caps for same HL amount', () => {
		const pvtResult = evaluate(fixture01_SalariedClean, SAMPLE_PVT_BANK);
		const govResult = evaluate(fixture01_SalariedClean, SAMPLE_GOV_BANK);
		const nbfcResult = evaluate(fixture01_SalariedClean, SAMPLE_NBFC);

		// PVT for 60L: LTV 80% of 75L = 60L
		// GOV for 60L: LTV 75% of 75L = 56.25L
		// NBFC for 60L: LTV 80% (< 50L) but 60L >= 50L -> 70% of 75L = 52.5L

		// All should have LTV fields
		expect(pvtResult.ltv_capped_amount).toBeDefined();
		expect(govResult.ltv_capped_amount).toBeDefined();
		expect(nbfcResult.ltv_capped_amount).toBeDefined();

		// PVT should have highest LTV cap for this loan amount range
		expect(pvtResult.ltv_capped_amount!).toBeGreaterThanOrEqual(govResult.ltv_capped_amount!);
	});

	it('FIX-14 (Plot Loan) vs PVT — grey (not supported), no LTV', () => {
		const pvtResult = evaluate(fixture14_YoungFirstBuyer, SAMPLE_PVT_BANK);
		expect(pvtResult.traffic_light).toBe('grey');
		expect(pvtResult.ltv).toBeUndefined();
	});
});

// =============================================================================
// GROUP 10: MULTI-LENDER buildResults()
// =============================================================================

describe('Group 10: Multi-lender buildResults()', () => {
	it('Feed all 3 evaluations for FIX-01 into buildResults()', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);
		expect(results).toBeDefined();
		expect(results.results).toBeDefined();
		expect(results.summary).toBeDefined();
		expect(results.computed_at).toBeDefined();
	});

	it('results are sorted by traffic_light priority (GREEN first)', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);
		const lights = results.results.map((r) => r.traffic_light);

		// All should be green or amber for FIX-01, but verify ordering
		const lightOrder: Record<string, number> = { green: 0, amber: 1, red: 2, grey: 3 };
		for (let i = 1; i < lights.length; i++) {
			expect(lightOrder[lights[i]]).toBeGreaterThanOrEqual(lightOrder[lights[i - 1]]);
		}
	});

	it('summary.total_lenders is correct', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);
		expect(results.summary.total_lenders).toBe(3);
	});

	it('summary.best_roi picks lowest ROI from passing results', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);

		// GOV has 8.25% which is the lowest
		expect(results.summary.best_roi.value).toBeCloseTo(8.25, 2);
		expect(results.summary.best_roi.lender).toBe('Sample GOV Bank');
	});

	it('summary.best_amount picks highest offered_amount from passing results', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);

		// best_amount should be > 0
		expect(results.summary.best_amount.value).toBeGreaterThan(0);
		// And it should be the highest among all passing results
		const nonRedResults = results.results.filter(
			(r) => r.traffic_light !== 'red' && r.traffic_light !== 'grey'
		);
		const maxOffered = Math.max(...nonRedResults.map((r) => r.offered_amount));
		expect(results.summary.best_amount.value).toBe(maxOffered);
	});

	it('each result has rating assigned', () => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture01_SalariedClean, doc));

		const results = buildResults(evaluations, fixture01_SalariedClean);

		for (const r of results.results) {
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.rating);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.amount);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.roi);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.emi);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.tenure);
		}
	});
});

// =============================================================================
// GROUP 11: NRI COVERAGE
// =============================================================================

describe('Group 11: NRI coverage — no NRI fixtures in current scenario set', () => {
	it('FIX-06 (HL Top-up) — NRI gate is skipped for non-NRI applicant', () => {
		const result = evaluate(fixture06_NRISalaried, SAMPLE_PVT_BANK);
		// fixture06 is no longer NRI — it's a HL Top-up salaried profile
		// NRI gate should not appear (applies_when checks isNRI)
		const nriGate = result.gate_results.find((g) => g.section === 'nri');
		expect(nriGate).toBeUndefined();
	});

	it('FIX-06 (HL Top-up) — evaluates as normal HL', () => {
		const result = evaluate(fixture06_NRISalaried, SAMPLE_PVT_BANK);
		expect(result.traffic_light).not.toBe('grey');
		// CIBIL 740 >= 700 → passes
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});
});

// =============================================================================
// GROUP 12: COMPANY APPLICANT HANDLING
// =============================================================================

describe('Group 12: Company applicant handling', () => {
	it('FIX-07 (Company, age 8) — individual age gates are skipped (applies_when Individual)', () => {
		const govResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_GOV_BANK);

		// The eligibility age gate has applies_when: Individual-only
		// FIX-07 applicantType is 'Company', so the age gate should NOT apply
		const ageGate = govResult.gate_results.find(
			(g) => g.section === 'eligibility' && g.rule_id.includes('elig-age')
		);
		// The gate should not appear in results because it was skipped via applies_when
		expect(ageGate).toBeUndefined();
	});

	it('FIX-07 vs GOV — company age 8 >= 2, passes', () => {
		const govResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_GOV_BANK);
		const companyGate = govResult.gate_results.find((g) => g.section === 'company');
		expect(companyGate).toBeDefined();
		expect(companyGate!.passed).toBe(true);
	});

	it('FIX-07 vs NBFC — company age 8 >= 3, passes', () => {
		const nbfcResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_NBFC);
		const companyGate = nbfcResult.gate_results.find((g) => g.section === 'company');
		expect(companyGate).toBeDefined();
		expect(companyGate!.passed).toBe(true);
	});

	it('FIX-07 vs PVT — grey (no BL support)', () => {
		const pvtResult = evaluate(fixture07_CompanyPvtLtd, SAMPLE_PVT_BANK);
		expect(pvtResult.traffic_light).toBe('grey');
	});
});

// =============================================================================
// BONUS: END-TO-END SMOKE TEST
// =============================================================================

describe('End-to-end smoke: all 25 fixtures through all 3 lenders produce valid buildResults()', () => {
	it.each(ALL_FIXTURES)('$name', ({ fixture }) => {
		const evaluations = ALL_SAMPLE_RULE_DOCS.map((doc) => evaluate(fixture, doc));
		const results = buildResults(evaluations, fixture);

		// Basic structure checks
		expect(results.summary.total_lenders).toBe(3);
		expect(results.results).toHaveLength(3);
		expect(results.summary.requested_amount).toBe(fixture.loanTransaction.loanAmount);
		expect(results.summary.loan_type).toBe(fixture.loanTransaction.loanName);

		// Count consistency
		const { green_count, amber_count, red_count } = results.summary;
		const greyCount = results.results.filter((r) => r.traffic_light === 'grey').length;
		expect(green_count + amber_count + red_count + greyCount).toBe(3);

		// Each result has a valid traffic light message
		for (const r of results.results) {
			if (r.traffic_light !== 'grey') {
				expect(r.traffic_light_message.length).toBeGreaterThan(0);
			}
		}
	});
});
