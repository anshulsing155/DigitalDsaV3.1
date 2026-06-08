/**
 * =============================================================================
 * RULE ENGINE — FIXTURE PROFILES (Scenario-Derived)
 * =============================================================================
 *
 * 25 loan application fixtures derived from form-path-validated scenarios.
 * Each fixture traces a real, working form path through the application.
 *
 * Unlike the previous random fixtures, these are:
 *   1. Validated against actual form schemas (correct option values)
 *   2. Mapped to specific form paths (scenario.formPath)
 *   3. Tested for fill coverage (scenario.expectedFill)
 *
 * This file re-exports from formPathScenarios.ts for backward compatibility.
 * All consumers importing from this file continue to work.
 *
 * =============================================================================
 */

import type { LoanApplicationPayload, ObligationEntry } from '$lib/utils/payloadBuilder';

import { ALL_SCENARIOS, SCENARIO_BY_ID } from '../scenarios/formPathScenarios.js';

export type { ObligationEntry };

// ─────────────────────────────────────────────────────────────────────────────
// Named fixture exports (backward compatibility for direct imports)
// ─────────────────────────────────────────────────────────────────────────────

/** Home Loan — Salaried 80K, CIBIL 780, no obligations, RTM flat ₹60L */
export const fixture01_SalariedClean: LoanApplicationPayload =
	SCENARIO_BY_ID.get('HL-NEW-SAL-CLEAN')!.payload;

/** Home Loan — Self-employed CA, CIBIL 750, under-construction */
export const fixture02_SelfEmployedCA: LoanApplicationPayload =
	SCENARIO_BY_ID.get('HL-NEW-SE-PRO')!.payload;

/** Home Loan — Pensioner 40K, CIBIL 800, resale house */
export const fixture03_Pensioner: LoanApplicationPayload =
	SCENARIO_BY_ID.get('HL-NEW-PENS')!.payload;

/** Home Loan — BT Only, salaried 90K, CIBIL 770, outstanding 40L */
export const fixture04_BTCleanTrack: LoanApplicationPayload =
	SCENARIO_BY_ID.get('HL-BT-ONLY')!.payload;

/** Home Loan — BT+Topup, couple joint, CIBIL 750/740 */
export const fixture05_BTTopupCouple: LoanApplicationPayload =
	SCENARIO_BY_ID.get('HL-BT-TOPUP')!.payload;

/** Home Loan — Top-up Only, salaried 70K, CIBIL 740 */
export const fixture06_TopupOnly: LoanApplicationPayload = SCENARIO_BY_ID.get('HL-TOPUP')!.payload;

/** LAP — New Term Loan, trader, Ahmedabad, CIBIL 730 */
export const fixture07_LAPNewTerm: LoanApplicationPayload =
	SCENARIO_BY_ID.get('LAP-NEW-TERM')!.payload;

/** LAP — BT Only, salaried, Mumbai, CIBIL 760 */
export const fixture08_LAPBTTerm: LoanApplicationPayload =
	SCENARIO_BY_ID.get('LAP-BT-TERM')!.payload;

/** LAP — Top-up, doctor, Chennai, CIBIL 780 */
export const fixture09_LAPTopup: LoanApplicationPayload =
	SCENARIO_BY_ID.get('LAP-TOPUP-TERM')!.payload;

/** LAP — BT+Topup, manufacturer, Mumbai, CIBIL 720 */
export const fixture10_LAPBTTopup: LoanApplicationPayload =
	SCENARIO_BY_ID.get('LAP-BT-TOPUP')!.payload;

/** LAP — DOD New, B2C services, Bangalore, CIBIL 740 */
export const fixture11_LAPDOD: LoanApplicationPayload = SCENARIO_BY_ID.get('LAP-DOD-NEW')!.payload;

/** Plot Loan Only — Salaried, Jaipur, CIBIL 740, ₹20L */
export const fixture12_PlotOnly: LoanApplicationPayload = SCENARIO_BY_ID.get('PLOT-ONLY')!.payload;

/** Plot & Construction — Govt employee, Bhopal, CIBIL 760 */
export const fixture13_PlotConstruction: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PLOT-CONSTRUCTION')!.payload;

/** Plot & Equity — Business owner, Indore, CIBIL 710 */
export const fixture14_PlotEquity: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PLOT-EQUITY')!.payload;

/** Construction Only — Doctor, Coimbatore, CIBIL 790 */
export const fixture15_ConstructionOnly: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PLOT-CONSTRUCTION-ONLY')!.payload;

/** Plot Balance Transfer — Salaried, Agra, CIBIL 730 */
export const fixture16_PlotBT: LoanApplicationPayload = SCENARIO_BY_ID.get('PLOT-BT')!.payload;

/** Personal Loan — Start Fresh, salaried with obligations, CIBIL 750 */
export const fixture17_PersonalFresh: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PL-FRESH-YES-OBLIG')!.payload;

/** Personal Loan — Debt Consolidation, salaried, CIBIL 710 */
export const fixture18_PersonalConsol: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PL-CONSOL')!.payload;

/** Personal Loan — No Obligations, doctor, CIBIL 780 */
export const fixture19_PersonalNoOblig: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PL-NO-OBLIG')!.payload;

/** Business Loan — Start Fresh, trader, CIBIL 720 */
export const fixture20_BusinessFresh: LoanApplicationPayload =
	SCENARIO_BY_ID.get('BL-FRESH-YES-OBLIG')!.payload;

/** Business Loan — Debt Consolidation, manufacturer, CIBIL 700 */
export const fixture21_BusinessConsol: LoanApplicationPayload =
	SCENARIO_BY_ID.get('BL-CONSOL')!.payload;

/** Business Loan — No Obligations, company Pvt Ltd, CIBIL 740 */
export const fixture22_BusinessCompany: LoanApplicationPayload =
	SCENARIO_BY_ID.get('BL-NO-OBLIG')!.payload;

/** Professional Loan — Start Fresh, CA, CIBIL 760 */
export const fixture23_ProfFresh: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PROF-FRESH-YES-OBLIG')!.payload;

/** Professional Loan — Debt Consolidation, lawyer, CIBIL 730 */
export const fixture24_ProfConsol: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PROF-CONSOL')!.payload;

/** Professional Loan — No Obligations, architect, CIBIL 770 */
export const fixture25_ProfNoOblig: LoanApplicationPayload =
	SCENARIO_BY_ID.get('PROF-NO-OBLIG')!.payload;

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD-COMPAT ALIASES — old fixture names → closest new scenarios
// ─────────────────────────────────────────────────────────────────────────────
// These aliases keep downstream test files (evaluationEngine, integrationTests,
// realBankIntegrationTests) compiling while they're migrated in Phase 7.
// The underlying data has changed (form-path-validated scenarios vs hand-crafted
// random profiles), so downstream assertion values will need updating.

/** @deprecated Use fixture17_PersonalFresh — obligations profile */
export const fixture02_SalariedWithCarLoan = fixture17_PersonalFresh;
/** @deprecated Use fixture02_SelfEmployedCA */
export const fixture03_SelfEmployedCA = fixture02_SelfEmployedCA;
/** @deprecated Use fixture07_LAPNewTerm — self-employed trader */
export const fixture04_CashHeavyTrader = fixture07_LAPNewTerm;
/** @deprecated Use fixture03_Pensioner */
export const fixture05_Pensioner = fixture03_Pensioner;
/** @deprecated Use fixture06_TopupOnly — NRI scenarios not yet in form paths */
export const fixture06_NRISalaried = fixture06_TopupOnly;
/** @deprecated Use fixture22_BusinessCompany — Company applicant */
export const fixture07_CompanyPvtLtd = fixture22_BusinessCompany;
/** @deprecated Use fixture04_BTCleanTrack */
export const fixture08_BTCleanTrack = fixture04_BTCleanTrack;
/** @deprecated Use fixture08_LAPBTTerm — BT profile */
export const fixture09_BTIrregularTrack = fixture08_LAPBTTerm;
/** @deprecated Use fixture18_PersonalConsol — lower CIBIL */
export const fixture10_LowCIBILDefault = fixture18_PersonalConsol;
/** @deprecated Use fixture20_BusinessFresh — obligations profile */
export const fixture11_HighFOIR = fixture20_BusinessFresh;
/** @deprecated Use fixture05_BTTopupCouple — multi-applicant */
export const fixture12_CoupleJoint = fixture05_BTTopupCouple;
/** @deprecated Use fixture01_SalariedClean — high income */
export const fixture13_HighNetWorth = fixture01_SalariedClean;
/** @deprecated Use fixture12_PlotOnly — young buyer */
export const fixture14_YoungFirstBuyer = fixture12_PlotOnly;
/** @deprecated Use fixture03_Pensioner — senior pension */
export const fixture15_SeniorPensioner = fixture03_Pensioner;

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASE FIXTURES (12) — boundary testing
// ─────────────────────────────────────────────────────────────────────────────

export const edge_CIBIL580 = SCENARIO_BY_ID.get('EDGE-CIBIL-580')!.payload;
export const edge_CIBIL650 = SCENARIO_BY_ID.get('EDGE-CIBIL-650')!.payload;
export const edge_HighFOIR = SCENARIO_BY_ID.get('EDGE-HIGH-FOIR')!.payload;
export const edge_NRI = SCENARIO_BY_ID.get('EDGE-NRI')!.payload;
export const edge_CompanyPvt = SCENARIO_BY_ID.get('EDGE-COMPANY-PVT')!.payload;
export const edge_3Applicants = SCENARIO_BY_ID.get('EDGE-3-APPLICANTS')!.payload;
export const edge_Age23 = SCENARIO_BY_ID.get('EDGE-AGE-23')!.payload;
export const edge_Age68 = SCENARIO_BY_ID.get('EDGE-AGE-68')!.payload;
export const edge_BTCreditLines = SCENARIO_BY_ID.get('EDGE-BT-CREDIT-LINES')!.payload;
export const edge_ProfLawyerDC = SCENARIO_BY_ID.get('EDGE-PROF-LAWYER-DC')!.payload;
export const edge_GovtSal = SCENARIO_BY_ID.get('EDGE-GOVT-SAL')!.payload;
export const edge_HighValue = SCENARIO_BY_ID.get('EDGE-HIGH-VALUE')!.payload;

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE EXPORT — all 37 fixtures (25 original + 12 edge cases)
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_FIXTURES: { name: string; fixture: LoanApplicationPayload }[] = ALL_SCENARIOS.map(
	(s) => ({
		name: s.description,
		fixture: s.payload
	})
);
