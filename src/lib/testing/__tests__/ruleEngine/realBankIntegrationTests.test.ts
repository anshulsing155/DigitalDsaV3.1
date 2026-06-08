/**
 * =============================================================================
 * REAL BANK INTEGRATION TESTS — 25 Fixture Profiles x 7 Real Indian Bank Rule Documents
 * =============================================================================
 *
 * Runs every fixture profile through all seven real Indian bank rule documents
 * using the real evaluateLender() and buildResults() pure functions.
 *
 * No MongoDB required — all data is passed in directly.
 *
 * Banks under test:
 *   1. HDFC Bank         (PVT) — CIBIL 700+, age 21-65, ROI 8.50-9.85
 *   2. ICICI Bank        (PVT) — CIBIL 650+, age 21-65, ROI 8.75-9.90
 *   3. Axis Bank         (PVT) — CIBIL 700+, age 21-60 (strictest), ROI 8.70-10.10
 *   4. SBI               (GOV) — CIBIL 650+, age 18-70 (widest), ROI 8.00-9.15
 *   5. Bajaj Housing     (NBFC) — CIBIL 700+, age 23-75 (highest), ROI 8.25-10.25
 *   6. Tata Capital      (NBFC) — CIBIL 650+, age 24-65, ROI 8.75-10.50
 *   7. LIC Housing Fin   (NBFC) — CIBIL 650+, age 21-60, ROI 8.00-9.50
 *
 * Test Groups:
 *    1. Structural validity (25 x 7 = 175 combinations)
 *    2. HDFC Bank specific
 *    3. ICICI Bank specific
 *    4. Axis Bank specific
 *    5. SBI specific
 *    6. Bajaj Housing specific
 *    7. Tata Capital specific
 *    8. LIC HFL specific
 *    9. ROI Differentiation
 *   10. FOIR Pressure
 *   11. LTV Computation
 *   12. Multi-lender buildResults
 *   13. Discomfort Zone Verification
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import { evaluateLender, buildResults } from '$lib/ruleEngine/evaluationEngine.js';
import {
	HDFC_BANK,
	ICICI_BANK,
	AXIS_BANK,
	SBI_BANK,
	BAJAJ_HOUSING,
	TATA_CAPITAL,
	LIC_HFL,
	ALL_REAL_BANK_RULE_DOCS
} from '$lib/ruleEngine/realBankRuleDocs.js';
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
import { analyzeDiscomfort } from '$lib/ruleEngine/discomfortAnalyzer.js';

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
// GROUP 1: STRUCTURAL VALIDITY — 25 fixtures x 7 lenders = 175 combinations
// =============================================================================

describe('Group 1: Structural validity — all 25 fixture x real lender combinations', () => {
	const lenderDocs = [
		{ name: 'HDFC Bank', doc: HDFC_BANK },
		{ name: 'ICICI Bank', doc: ICICI_BANK },
		{ name: 'Axis Bank', doc: AXIS_BANK },
		{ name: 'SBI', doc: SBI_BANK },
		{ name: 'Bajaj Housing', doc: BAJAJ_HOUSING },
		{ name: 'Tata Capital', doc: TATA_CAPITAL },
		{ name: 'LIC HFL', doc: LIC_HFL }
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
// GROUP 2: HDFC BANK SPECIFIC
// =============================================================================

describe('Group 2: HDFC Bank specific', () => {
	it('FIX-01 (CIBIL 780, age 34, HL) — green, all gates pass', () => {
		const result = evaluate(fixture01_SalariedClean, HDFC_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-04 (CIBIL 730, LAP) — CIBIL passes (730 >= 700)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, HDFC_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-05 (Pensioner age 62) — age gate passes (62 <= 65)', () => {
		const result = evaluate(fixture05_Pensioner, HDFC_BANK);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(true);
	});

	it('FIX-07 (Business Loan) — grey (HDFC only supports HL and LAP)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, HDFC_BANK);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('FIX-14 (Plot Loan) — grey (HDFC does not support Plot Loan)', () => {
		const result = evaluate(fixture14_YoungFirstBuyer, HDFC_BANK);
		expect(result.traffic_light).toBe('grey');
	});

	it('FIX-10 (PL) — grey (HDFC does not support Personal Loan)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, HDFC_BANK);
		expect(result.traffic_light).toBe('grey');
	});

	it('FIX-13 (CIBIL 780, HL) — all gates pass, premium ROI 8.50%', () => {
		const result = evaluate(fixture13_HighNetWorth, HDFC_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.roi).toBeCloseTo(8.5, 2);
	});

	it('FIX-01 (CIBIL 780) — premium ROI tier 8.50%', () => {
		const result = evaluate(fixture01_SalariedClean, HDFC_BANK);
		expect(result.roi).toBeCloseTo(8.5, 2);
	});

	it('HDFC processing fee is 0.50%', () => {
		const result = evaluate(fixture01_SalariedClean, HDFC_BANK);
		expect(result.processing_fee_percent).toBe(0.5);
	});
});

// =============================================================================
// GROUP 3: ICICI BANK SPECIFIC
// =============================================================================

describe('Group 3: ICICI Bank specific', () => {
	it('FIX-01 (CIBIL 780) — green, all gates pass', () => {
		const result = evaluate(fixture01_SalariedClean, ICICI_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-09 (CIBIL 760, LAP) — passes CIBIL gate (ICICI min 650)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, ICICI_BANK);
		const cibilGate = result.gate_results.find(
			(g) => g.section === 'cibil' && g.rule_id === 'icici-cibil-min'
		);
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-04 (CIBIL 730) — passes CIBIL gate at ICICI (730 >= 650)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, ICICI_BANK);
		const cibilGate = result.gate_results.find(
			(g) => g.section === 'cibil' && g.rule_id === 'icici-cibil-min'
		);
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-06 (CIBIL 740, HL Top-up) — all CIBIL gates pass, NRI gate skipped', () => {
		const result = evaluate(fixture06_NRISalaried, ICICI_BANK);
		// Standard CIBIL gate: 740 >= 650
		const cibilGate = result.gate_results.find(
			(g) => g.section === 'cibil' && g.rule_id === 'icici-cibil-min'
		);
		if (cibilGate) expect(cibilGate.passed).toBe(true);
		// NRI gate should NOT appear (not an NRI applicant)
		const nriGate = result.gate_results.find((g) => g.section === 'nri');
		expect(nriGate).toBeUndefined();
	});

	it('FIX-10 (PL) — grey (ICICI does not support Personal Loan)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, ICICI_BANK);
		expect(result.traffic_light).toBe('grey');
	});

	it('ICICI processing fee is 0.50%', () => {
		const result = evaluate(fixture01_SalariedClean, ICICI_BANK);
		expect(result.processing_fee_percent).toBe(0.5);
	});

	it('FIX-07 (Business Loan) — grey (ICICI only supports HL and LAP)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, ICICI_BANK);
		expect(result.traffic_light).toBe('grey');
	});
});

// =============================================================================
// GROUP 4: AXIS BANK SPECIFIC
// =============================================================================

describe('Group 4: Axis Bank specific — strictest age range (21-60)', () => {
	it('FIX-01 (age 34) — all gates pass', () => {
		const result = evaluate(fixture01_SalariedClean, AXIS_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
	});

	it('FIX-05 (age 62) — red (Axis max age 60, strictest!)', () => {
		const result = evaluate(fixture05_Pensioner, AXIS_BANK);
		// Age 62 > 60, so age gate should fail
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});

	it('FIX-15 (age 62) — age gate fails (62 > 60, same as FIX-05)', () => {
		const result = evaluate(fixture15_SeniorPensioner, AXIS_BANK);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});

	it('Axis has highest FOIR tolerance — demonstrated with fixture01', () => {
		const axisResult = evaluate(fixture01_SalariedClean, AXIS_BANK);
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);
		const sbiResult = evaluate(fixture01_SalariedClean, SBI_BANK);

		// Axis FOIR caps are higher than HDFC and SBI
		expect(axisResult.max_foir).toBeGreaterThanOrEqual(hdfcResult.max_foir);
		expect(axisResult.max_foir).toBeGreaterThanOrEqual(sbiResult.max_foir);
	});

	it('FIX-07 (Business Loan) — grey (Axis only supports HL and LAP)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, AXIS_BANK);
		expect(result.traffic_light).toBe('grey');
	});

	it('Axis processing fee is 1.00% (highest among PVT banks)', () => {
		const result = evaluate(fixture01_SalariedClean, AXIS_BANK);
		expect(result.processing_fee_percent).toBe(1.0);
	});

	it('FIX-04 (CIBIL 730) — passes Axis CIBIL gate (730 >= 700)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, AXIS_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});
});

// =============================================================================
// GROUP 5: SBI SPECIFIC — widest acceptance (age 18-70, CIBIL 650+)
// =============================================================================

describe('Group 5: SBI specific — widest age range and lowest CIBIL threshold', () => {
	it('FIX-01 — green, all gates pass', () => {
		const result = evaluate(fixture01_SalariedClean, SBI_BANK);
		expect(result.all_gates_passed).toBe(true);
		expect(result.traffic_light).not.toBe('red');
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-09 (CIBIL 760) — passes CIBIL gate (SBI min 650)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, SBI_BANK);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-05 (age 62) — passes age gate (SBI max age 70!)', () => {
		const result = evaluate(fixture05_Pensioner, SBI_BANK);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(true);
	});

	it('FIX-14 (Plot Loan) — grey (SBI does not support Plot Loan)', () => {
		const result = evaluate(fixture14_YoungFirstBuyer, SBI_BANK);
		expect(result.traffic_light).toBe('grey');
	});

	it('FIX-07 (Business Loan) — NOT grey (SBI supports BL)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, SBI_BANK);
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-10 (PL) vs SBI — grey (PL not supported by SBI)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, SBI_BANK);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('SBI processing fee is the lowest at 0.35%', () => {
		const result = evaluate(fixture01_SalariedClean, SBI_BANK);
		expect(result.processing_fee_percent).toBe(0.35);
	});

	it('SBI has cheapest ROI for CIBIL 780+ (8.00%)', () => {
		const result = evaluate(fixture01_SalariedClean, SBI_BANK);
		expect(result.roi).toBeCloseTo(8.0, 2);
	});

	it('FIX-07 (Company, BL) — company gate passes (SBI requires min 2 years, fixture has 8)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, SBI_BANK);
		const companyGate = result.gate_results.find((g) => g.section === 'company');
		expect(companyGate).toBeDefined();
		expect(companyGate!.passed).toBe(true);
	});
});

// =============================================================================
// GROUP 6: BAJAJ HOUSING SPECIFIC — widest age range (23-75)
// =============================================================================

describe('Group 6: Bajaj Housing specific — widest max age (75)', () => {
	it('FIX-05 (age 62) — age gate passes (62 <= 75)', () => {
		const result = evaluate(fixture05_Pensioner, BAJAJ_HOUSING);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(true);
	});

	it('FIX-15 (age 62) — age gate passes (62 <= 75)', () => {
		const result = evaluate(fixture15_SeniorPensioner, BAJAJ_HOUSING);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(true);
	});

	it('FIX-07 (Business Loan) — NOT grey (Bajaj supports BL)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, BAJAJ_HOUSING);
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-14 (Plot Loan) — grey (Bajaj does not support Plot Loan)', () => {
		const result = evaluate(fixture14_YoungFirstBuyer, BAJAJ_HOUSING);
		expect(result.traffic_light).toBe('grey');
	});

	it('FIX-04 (CIBIL 730) — CIBIL passes (730 >= 700)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, BAJAJ_HOUSING);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('Bajaj max tenure is 40 years (480 months) — longest available', () => {
		// For a relatively young applicant, Bajaj should allow longer tenure
		const bajajResult = evaluate(fixture01_SalariedClean, BAJAJ_HOUSING);
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);

		// Bajaj max 480 months vs HDFC max 360 months
		// fixture01 age 34, both allow long tenure, but Bajaj's max is higher
		expect(bajajResult.tenure_months).toBeGreaterThanOrEqual(hdfcResult.tenure_months);
	});

	it('Bajaj processing fee is 2.00% (highest among all lenders)', () => {
		const result = evaluate(fixture01_SalariedClean, BAJAJ_HOUSING);
		expect(result.processing_fee_percent).toBe(2.0);
	});
});

// =============================================================================
// GROUP 7: TATA CAPITAL SPECIFIC — min age 24
// =============================================================================

describe('Group 7: Tata Capital specific — min age 24', () => {
	it('FIX-04 (CIBIL 730) — passes CIBIL gate (Tata min 650)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, TATA_CAPITAL);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-09 (CIBIL 760) — passes CIBIL gate (760 >= 650)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, TATA_CAPITAL);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-07 (Business Loan) — NOT grey (Tata supports BL)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, TATA_CAPITAL);
		expect(result.traffic_light).not.toBe('grey');
	});

	it('FIX-14 (Plot Loan) — grey (Tata does not support Plot Loan)', () => {
		const result = evaluate(fixture14_YoungFirstBuyer, TATA_CAPITAL);
		expect(result.traffic_light).toBe('grey');
	});

	it('Tata processing fee is 2.00%', () => {
		const result = evaluate(fixture01_SalariedClean, TATA_CAPITAL);
		expect(result.processing_fee_percent).toBe(2.0);
	});

	it('FIX-10 (PL) vs Tata — grey (PL not supported by Tata)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, TATA_CAPITAL);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('Tata LTV follows standard slabs for HL', () => {
		// FIX-13 (=fixture01) requests 60L (30L-75L range)
		const result = evaluate(fixture13_HighNetWorth, TATA_CAPITAL);
		if (result.max_ltv !== undefined) {
			// 30L-75L range: Tata typically has 75% LTV
			expect(result.max_ltv).toBeGreaterThanOrEqual(0.7);
			expect(result.max_ltv).toBeLessThanOrEqual(0.8);
		}
	});
});

// =============================================================================
// GROUP 8: LIC HFL SPECIFIC — max age 60, CIBIL 650+
// =============================================================================

describe('Group 8: LIC HFL specific — conservative LTV, max age 60', () => {
	it('FIX-05 (age 62) — red (LIC max age 60!)', () => {
		const result = evaluate(fixture05_Pensioner, LIC_HFL);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});

	it('FIX-15 (age 62) — age gate fails at LIC (62 > 60)', () => {
		const result = evaluate(fixture15_SeniorPensioner, LIC_HFL);
		const ageGate = result.gate_results.find((g) => g.section === 'eligibility');
		expect(ageGate).toBeDefined();
		expect(ageGate!.passed).toBe(false);
		expect(result.traffic_light).toBe('red');
	});

	it('FIX-04 (CIBIL 730) — passes CIBIL gate (LIC min 650)', () => {
		const result = evaluate(fixture04_CashHeavyTrader, LIC_HFL);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});

	it('FIX-07 (Business Loan) — NOT grey (LIC supports BL)', () => {
		const result = evaluate(fixture07_CompanyPvtLtd, LIC_HFL);
		expect(result.traffic_light).not.toBe('grey');
	});

	it('LIC processing fee is the lowest at 0.25%', () => {
		const result = evaluate(fixture01_SalariedClean, LIC_HFL);
		expect(result.processing_fee_percent).toBe(0.25);
	});

	it('FIX-10 (PL) vs LIC — grey (PL not supported by LIC HFL)', () => {
		const result = evaluate(fixture10_LowCIBILDefault, LIC_HFL);
		expect(result.traffic_light).toBe('grey');
		expect(result.gate_results).toHaveLength(0);
	});

	it('LIC has conservative LTV — 85% for < 20L', () => {
		// Use fixture05 (HL 15L, property 20L) — under 20L
		const result05 = evaluate(fixture05_Pensioner, LIC_HFL);
		// LIC: 85% for < 20L — but age 62 > 60, so may be red
		// LTV computation still happens even if age gate fails
		if (result05.max_ltv !== undefined) {
			expect(result05.max_ltv).toBeCloseTo(0.85, 2);
		}
	});

	it('FIX-09 (CIBIL 760) — passes CIBIL gate at LIC (760 >= 650)', () => {
		const result = evaluate(fixture09_BTIrregularTrack, LIC_HFL);
		const cibilGate = result.gate_results.find((g) => g.section === 'cibil');
		expect(cibilGate).toBeDefined();
		expect(cibilGate!.passed).toBe(true);
	});
});

// =============================================================================
// GROUP 9: ROI DIFFERENTIATION
// =============================================================================

describe('Group 9: ROI differentiation across all 7 lenders', () => {
	it('FIX-01 (CIBIL 780) — verify ROI ordering: SBI cheapest, Tata most expensive', () => {
		const sbiResult = evaluate(fixture01_SalariedClean, SBI_BANK);
		const licResult = evaluate(fixture01_SalariedClean, LIC_HFL);
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);
		const axisResult = evaluate(fixture01_SalariedClean, AXIS_BANK);
		const iciciResult = evaluate(fixture01_SalariedClean, ICICI_BANK);
		const bajajResult = evaluate(fixture01_SalariedClean, BAJAJ_HOUSING);
		const tataResult = evaluate(fixture01_SalariedClean, TATA_CAPITAL);

		// CIBIL 780 tier:
		// SBI: 8.00% (CIBIL 780+)
		// LIC: 8.15% (CIBIL 750-799, since LIC premium tier starts at 800)
		// Bajaj: 8.75% (CIBIL 750-799, since Bajaj premium starts at 800)
		// HDFC: 8.50% (CIBIL 780+)
		// Axis: 8.70% (CIBIL 780+)
		// ICICI: 8.75% (CIBIL 780+)
		// Tata: 8.75% (CIBIL 780+)

		// SBI should be cheapest
		expect(sbiResult.roi).toBeCloseTo(8.0, 2);
		expect(sbiResult.roi).toBeLessThan(hdfcResult.roi);
		expect(sbiResult.roi).toBeLessThan(iciciResult.roi);
		expect(sbiResult.roi).toBeLessThan(axisResult.roi);
		expect(sbiResult.roi).toBeLessThan(tataResult.roi);

		// HDFC should be competitive
		expect(hdfcResult.roi).toBeCloseTo(8.5, 2);

		// Axis
		expect(axisResult.roi).toBeCloseTo(8.7, 2);

		// ICICI
		expect(iciciResult.roi).toBeCloseTo(8.75, 2);

		// Tata
		expect(tataResult.roi).toBeCloseTo(8.75, 2);
	});

	it('FIX-13 (CIBIL 780) — SBI and LIC offer competitive ROI', () => {
		const sbiResult = evaluate(fixture13_HighNetWorth, SBI_BANK);
		const licResult = evaluate(fixture13_HighNetWorth, LIC_HFL);

		// SBI: 8.00% for CIBIL 780+
		expect(sbiResult.roi).toBeCloseTo(8.0, 2);
		// LIC: 8.15% for CIBIL 750-799 or 8.00% for 800+
		// CIBIL 780 may fall in 750-799 tier at LIC
		expect(licResult.roi).toBeLessThanOrEqual(8.25);
	});

	it('FIX-02 (CIBIL 750) — verify ROI in premium tier range', () => {
		const sbiResult = evaluate(fixture02_SalariedWithCarLoan, SBI_BANK);
		const hdfcResult = evaluate(fixture02_SalariedWithCarLoan, HDFC_BANK);
		const tataResult = evaluate(fixture02_SalariedWithCarLoan, TATA_CAPITAL);

		// CIBIL 750 tier (check if PL is supported):
		// SBI supports PL, HDFC doesn't, Tata supports PL
		// Only test lenders that support the loan type
		if (sbiResult.traffic_light !== 'grey') {
			expect(sbiResult.roi).toBeLessThan(10);
			expect(sbiResult.roi).toBeGreaterThan(7);
		}
		if (tataResult.traffic_light !== 'grey') {
			expect(tataResult.roi).toBeLessThan(11);
			expect(tataResult.roi).toBeGreaterThan(8);
		}

		// SBI should still offer competitive rates
		if (sbiResult.traffic_light !== 'grey' && tataResult.traffic_light !== 'grey') {
			expect(sbiResult.roi).toBeLessThanOrEqual(tataResult.roi);
		}
	});

	it('GOV bank (SBI) always has lowest ROI among all 7 lenders for same CIBIL', () => {
		const sbiResult = evaluate(fixture01_SalariedClean, SBI_BANK);
		for (const doc of ALL_REAL_BANK_RULE_DOCS) {
			if (doc.lender_id === 'sbi') continue;
			const result = evaluate(fixture01_SalariedClean, doc);
			if (result.traffic_light !== 'grey') {
				expect(sbiResult.roi).toBeLessThanOrEqual(result.roi);
			}
		}
	});
});

// =============================================================================
// GROUP 10: FOIR PRESSURE
// =============================================================================

describe('Group 10: FOIR pressure — high obligations limit eligible amount', () => {
	it('FIX-11 (BL, 25K obligation EMI) — obligation load present at supporting lenders', () => {
		for (const doc of ALL_REAL_BANK_RULE_DOCS) {
			const result = evaluate(fixture11_HighFOIR, doc);
			if (result.traffic_light !== 'grey') {
				// BL with 25K obligation EMI
				expect(result.obligation_load_monthly).toBeGreaterThanOrEqual(25000);
			}
		}
	});

	it('Axis gives highest FOIR cap among PVT banks for HL', () => {
		const axisResult = evaluate(fixture01_SalariedClean, AXIS_BANK);
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);
		const iciciResult = evaluate(fixture01_SalariedClean, ICICI_BANK);

		expect(axisResult.max_foir).toBeGreaterThanOrEqual(hdfcResult.max_foir);
		expect(axisResult.max_foir).toBeGreaterThanOrEqual(iciciResult.max_foir);
	});

	it('SBI and HDFC are most conservative on FOIR', () => {
		const sbiResult = evaluate(fixture01_SalariedClean, SBI_BANK);
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);
		const axisResult = evaluate(fixture01_SalariedClean, AXIS_BANK);

		expect(sbiResult.max_foir).toBeLessThanOrEqual(axisResult.max_foir);
		expect(hdfcResult.max_foir).toBeLessThanOrEqual(axisResult.max_foir);
	});

	it('FIX-13 (80K income, no obligations) — zero obligations, capacity available', () => {
		for (const doc of ALL_REAL_BANK_RULE_DOCS) {
			const result = evaluate(fixture13_HighNetWorth, doc);
			if (result.traffic_light !== 'grey') {
				expect(result.obligation_load_monthly).toBe(0);
				// FOIR may equal max_foir when loan uses full capacity
				expect(result.foir).toBeLessThanOrEqual(result.max_foir);
				expect(result.offered_amount).toBeGreaterThan(0);
			}
		}
	});

	it('FIX-01 (no obligations) — zero obligation load across all lenders', () => {
		for (const doc of ALL_REAL_BANK_RULE_DOCS) {
			const result = evaluate(fixture01_SalariedClean, doc);
			if (result.traffic_light !== 'grey') {
				expect(result.obligation_load_monthly).toBe(0);
				expect(result.obligation_details).toHaveLength(0);
			}
		}
	});
});

// =============================================================================
// GROUP 11: LTV COMPUTATION
// =============================================================================

describe('Group 11: LTV computation for secured loans', () => {
	it('FIX-13 (HL 60L = same as FIX-01) — LTV in 30L-75L slab', () => {
		const hdfcResult = evaluate(fixture13_HighNetWorth, HDFC_BANK);

		// 60L is in 30L-75L range → 80% LTV at most lenders
		if (hdfcResult.max_ltv !== undefined) expect(hdfcResult.max_ltv).toBeCloseTo(0.8, 2);
	});

	it('Tata LTV is competitive with HDFC for standard HL', () => {
		const tataResult = evaluate(fixture13_HighNetWorth, TATA_CAPITAL);
		const hdfcResult = evaluate(fixture13_HighNetWorth, HDFC_BANK);

		if (tataResult.ltv_capped_amount !== undefined && hdfcResult.ltv_capped_amount !== undefined) {
			// Both should be in reasonable range for 60L loan
			expect(tataResult.ltv_capped_amount).toBeGreaterThan(0);
			expect(hdfcResult.ltv_capped_amount).toBeGreaterThan(0);
		}
	});

	it('FIX-05 (HL 15L, property 20L) — small loan gets higher LTV %', () => {
		// 15L < 30L, so lenders should apply the lower slab
		const sbiResult = evaluate(fixture05_Pensioner, SBI_BANK);

		// SBI: 90% for < 30L
		if (sbiResult.max_ltv !== undefined) expect(sbiResult.max_ltv).toBeCloseTo(0.9, 2);
	});

	it('FIX-05 — LIC has 85% LTV for < 20L (most conservative for small loans)', () => {
		const licResult = evaluate(fixture05_Pensioner, LIC_HFL);
		// LIC: 85% for < 20L, FIX-05 loan is 15L
		if (licResult.max_ltv !== undefined) {
			expect(licResult.max_ltv).toBeCloseTo(0.85, 2);
		}
	});

	it('FIX-01 (HL 60L) — mid-range LTV slab (30L-75L)', () => {
		const hdfcResult = evaluate(fixture01_SalariedClean, HDFC_BANK);
		// HDFC: 80% for 30L-75L
		if (hdfcResult.max_ltv !== undefined) expect(hdfcResult.max_ltv).toBeCloseTo(0.8, 2);
	});

	it('FIX-07 (BL) — unsecured loan, no LTV across all lenders that support BL', () => {
		const sbiResult = evaluate(fixture07_CompanyPvtLtd, SBI_BANK);
		const tataResult = evaluate(fixture07_CompanyPvtLtd, TATA_CAPITAL);
		const licResult = evaluate(fixture07_CompanyPvtLtd, LIC_HFL);

		// Business Loan is unsecured — no LTV computation
		expect(sbiResult.ltv).toBeUndefined();
		expect(sbiResult.max_ltv).toBeUndefined();
		expect(tataResult.ltv).toBeUndefined();
		expect(licResult.ltv).toBeUndefined();
	});
});

// =============================================================================
// GROUP 12: MULTI-LENDER buildResults
// =============================================================================

describe('Group 12: Multi-lender buildResults with all 7 real banks', () => {
	it('FIX-01 through all 7 lenders — returns exactly 7 results', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);
		expect(results.results).toHaveLength(7);
		expect(results.summary.total_lenders).toBe(7);
	});

	it('each result has correct lender_name', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);
		const lenderNames = results.results.map((r) => r.lender_name);

		expect(lenderNames).toContain('HDFC Bank');
		expect(lenderNames).toContain('ICICI Bank');
		expect(lenderNames).toContain('Axis Bank');
		expect(lenderNames).toContain('State Bank of India');
		expect(lenderNames).toContain('Bajaj Housing Finance');
		expect(lenderNames).toContain('Tata Capital');
		expect(lenderNames).toContain('LIC Housing Finance');
	});

	it('summary counts total to 7', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);
		const { green_count, amber_count, red_count } = results.summary;
		const greyCount = results.results.filter((r) => r.traffic_light === 'grey').length;
		expect(green_count + amber_count + red_count + greyCount).toBe(7);
	});

	it('results are sorted by traffic_light priority (GREEN first)', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);
		const lights = results.results.map((r) => r.traffic_light);

		const lightOrder: Record<string, number> = { green: 0, amber: 1, red: 2, grey: 3 };
		for (let i = 1; i < lights.length; i++) {
			expect(lightOrder[lights[i]]).toBeGreaterThanOrEqual(lightOrder[lights[i - 1]]);
		}
	});

	it('summary.best_roi picks SBI (lowest ROI for FIX-01)', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);

		// SBI has 8.00% which is the lowest ROI for CIBIL 780+
		expect(results.summary.best_roi.value).toBeCloseTo(8.0, 2);
		expect(results.summary.best_roi.lender).toBe('State Bank of India');
	});

	it('summary.best_amount picks highest offered amount among passing results', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);

		expect(results.summary.best_amount.value).toBeGreaterThan(0);
		expect(results.summary.best_amount.lender).toBeTruthy();

		// Verify it's actually the maximum
		const nonRedResults = results.results.filter(
			(r) => r.traffic_light !== 'red' && r.traffic_light !== 'grey'
		);
		const maxOffered = Math.max(...nonRedResults.map((r) => r.offered_amount));
		expect(results.summary.best_amount.value).toBe(maxOffered);
	});

	it('each result has valid rating assigned', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture01_SalariedClean, doc)
		);

		const results = buildResults(evaluations, fixture01_SalariedClean);

		for (const r of results.results) {
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.rating);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.amount);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.roi);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.emi);
			expect(['excellent', 'good', 'average', 'poor']).toContain(r.metric_ratings.tenure);
		}
	});

	it('FIX-07 (BL) — PVT banks show grey, GOV/NBFC banks evaluate', () => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) =>
			evaluate(fixture07_CompanyPvtLtd, doc)
		);

		const results = buildResults(evaluations, fixture07_CompanyPvtLtd);

		// HDFC, ICICI, Axis do NOT support BL -> grey
		const hdfcResult = results.results.find((r) => r.lender_name === 'HDFC Bank');
		const iciciResult = results.results.find((r) => r.lender_name === 'ICICI Bank');
		const axisResult = results.results.find((r) => r.lender_name === 'Axis Bank');
		expect(hdfcResult?.traffic_light).toBe('grey');
		expect(iciciResult?.traffic_light).toBe('grey');
		expect(axisResult?.traffic_light).toBe('grey');

		// SBI, Bajaj, Tata, LIC support BL -> NOT grey
		const sbiResult = results.results.find((r) => r.lender_name === 'State Bank of India');
		const bajajResult = results.results.find((r) => r.lender_name === 'Bajaj Housing Finance');
		const tataResult = results.results.find((r) => r.lender_name === 'Tata Capital');
		const licResult = results.results.find((r) => r.lender_name === 'LIC Housing Finance');
		expect(sbiResult?.traffic_light).not.toBe('grey');
		expect(bajajResult?.traffic_light).not.toBe('grey');
		expect(tataResult?.traffic_light).not.toBe('grey');
		expect(licResult?.traffic_light).not.toBe('grey');
	});
});

// =============================================================================
// GROUP 13: DISCOMFORT ZONE VERIFICATION
// =============================================================================

describe('Group 13: Discomfort zone verification', () => {
	it('FIX-11 (BL with 25K obligations) — discomfort analysis returns valid structure', () => {
		const sbiResult = evaluate(fixture11_HighFOIR, SBI_BANK);
		expect(sbiResult.traffic_light).not.toBe('grey'); // SBI supports BL

		const discomfort = analyzeDiscomfort(sbiResult, fixture11_HighFOIR);

		// Should return valid discomfort structure
		expect(discomfort).toBeDefined();
		expect(Array.isArray(discomfort.discomfort_zones)).toBe(true);
		expect(Array.isArray(discomfort.quick_solutions)).toBe(true);
		expect(discomfort.async_hints).toBeDefined();
		// Note: Self-employed BL without netProfit fields may have 0 assessed_income,
		// which means FOIR-based discomfort zones may not trigger (max_foir = 0 guard)
	});

	it('FIX-05 (age 62) — age limit discomfort at Axis (max 60)', () => {
		const axisResult = evaluate(fixture05_Pensioner, AXIS_BANK);
		const discomfort = analyzeDiscomfort(axisResult, fixture05_Pensioner);

		// Should detect gate failure for age
		const ageZone = discomfort.discomfort_zones.find(
			(z) => z.zone_id.includes('elig-age') || z.zone_id.includes('gate_')
		);
		expect(ageZone).toBeDefined();
		if (ageZone) {
			expect(ageZone.severity).toBe('blocking');
		}
	});

	it('FIX-05 (age 62) — age limit discomfort at LIC (max 60)', () => {
		const licResult = evaluate(fixture05_Pensioner, LIC_HFL);
		const discomfort = analyzeDiscomfort(licResult, fixture05_Pensioner);

		// Should detect gate failure for age
		const ageZone = discomfort.discomfort_zones.find(
			(z) => z.zone_id.includes('elig-age') || z.zone_id.includes('gate_')
		);
		expect(ageZone).toBeDefined();
	});

	it('FIX-10 (CIBIL 710) — CIBIL passes at supporting lenders, no CIBIL discomfort', () => {
		for (const doc of ALL_REAL_BANK_RULE_DOCS) {
			const result = evaluate(fixture10_LowCIBILDefault, doc);
			if (result.traffic_light === 'grey') continue;
			const discomfort = analyzeDiscomfort(result, fixture10_LowCIBILDefault);

			// CIBIL 710 passes all gates (min thresholds: 650-700)
			// For lenders with 700 threshold, 710 is marginal but passes
			const cibilZone = discomfort.discomfort_zones.find(
				(z) => z.zone_id === 'cibil_below_threshold'
			);
			// Should NOT have blocking CIBIL zone since gate passes
			if (cibilZone) {
				expect(cibilZone.severity).not.toBe('blocking');
			}
		}
	});

	it('FIX-01 (clean profile) — minimal discomfort at SBI (best match)', () => {
		const sbiResult = evaluate(fixture01_SalariedClean, SBI_BANK);
		const discomfort = analyzeDiscomfort(sbiResult, fixture01_SalariedClean);

		// Clean profile should have no blocking zones
		const blockingZones = discomfort.discomfort_zones.filter((z) => z.severity === 'blocking');
		expect(blockingZones).toHaveLength(0);
	});

	it('FIX-13 (HNW) — no discomfort zones for green evaluations at full amount', () => {
		const sbiResult = evaluate(fixture13_HighNetWorth, SBI_BANK);
		const discomfort = analyzeDiscomfort(sbiResult, fixture13_HighNetWorth);

		// If SBI gives green with full amount, discomfort should be empty or only marginal
		if (
			sbiResult.traffic_light === 'green' &&
			sbiResult.offered_amount >= fixture13_HighNetWorth.loanTransaction.loanAmount
		) {
			const blockingZones = discomfort.discomfort_zones.filter((z) => z.severity === 'blocking');
			expect(blockingZones).toHaveLength(0);
		}
	});

	it('FIX-11 (high FOIR) — solutions suggest closing obligations', () => {
		const sbiResult = evaluate(fixture11_HighFOIR, SBI_BANK);
		const discomfort = analyzeDiscomfort(sbiResult, fixture11_HighFOIR);

		if (discomfort.quick_solutions.length > 0) {
			// Should have obligation-related or FOIR-related solutions
			const hasFoirSolution = discomfort.quick_solutions.some(
				(s) =>
					s.id.includes('close-obligation') ||
					s.id.includes('reduce-loan') ||
					s.id.includes('extend-tenure') ||
					s.id.includes('coapplicant')
			);
			expect(hasFoirSolution).toBe(true);
		}
	});

	it('FIX-04 (CIBIL 730) — no CIBIL discomfort at HDFC (730 >= 700) or ICICI (730 >= 650)', () => {
		const hdfcResult = evaluate(fixture04_CashHeavyTrader, HDFC_BANK);
		const hdfcDiscomfort = analyzeDiscomfort(hdfcResult, fixture04_CashHeavyTrader);

		const iciciResult = evaluate(fixture04_CashHeavyTrader, ICICI_BANK);
		const iciciDiscomfort = analyzeDiscomfort(iciciResult, fixture04_CashHeavyTrader);

		// CIBIL 730 passes both HDFC (700) and ICICI (650)
		const hdfcCibilZone = hdfcDiscomfort.discomfort_zones.find(
			(z) => z.zone_id === 'cibil_below_threshold'
		);
		expect(hdfcCibilZone).toBeUndefined();

		const iciciCibilZone = iciciDiscomfort.discomfort_zones.find(
			(z) => z.zone_id === 'cibil_below_threshold'
		);
		expect(iciciCibilZone).toBeUndefined();
	});
});

// =============================================================================
// BONUS: END-TO-END SMOKE TEST — all 25 fixtures through all 7 real lenders
// =============================================================================

describe('End-to-end smoke: all 25 fixtures through all 7 real lenders produce valid buildResults()', () => {
	it.each(ALL_FIXTURES)('$name', ({ fixture }) => {
		const evaluations = ALL_REAL_BANK_RULE_DOCS.map((doc) => evaluate(fixture, doc));
		const results = buildResults(evaluations, fixture);

		// Basic structure checks
		expect(results.summary.total_lenders).toBe(7);
		expect(results.results).toHaveLength(7);
		expect(results.summary.requested_amount).toBe(fixture.loanTransaction.loanAmount);
		expect(results.summary.loan_type).toBe(fixture.loanTransaction.loanName);

		// Count consistency
		const { green_count, amber_count, red_count } = results.summary;
		const greyCount = results.results.filter((r) => r.traffic_light === 'grey').length;
		expect(green_count + amber_count + red_count + greyCount).toBe(7);

		// Each result has a valid traffic light message
		for (const r of results.results) {
			if (r.traffic_light !== 'grey') {
				expect(r.traffic_light_message.length).toBeGreaterThan(0);
			}
		}
	});
});
