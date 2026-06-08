/**
 * =============================================================================
 * FORM PATH SCENARIOS — Two-Layer Test Data
 * =============================================================================
 *
 * Each scenario defines:
 *   Layer 1: The exact form path through how-can-we-help (q1 → q2 → q3 → q4)
 *   Layer 2: A realistic LoanApplicationPayload for that path
 *   Layer 3: Expected fill results (what gets asked vs skipped)
 *
 * These scenarios replace the old random fixture/archetype system.
 * Every scenario traces a real, validated form path.
 *
 * 25 scenarios covering all 21 working form paths.
 * =============================================================================
 */

import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder';
import { toScenario } from '$lib/testing/factory/schemaFixtureFactory.js';
import {
	HL_NEW_SAL_CLEAN_JOURNEY,
	HL_NEW_SE_PRO_JOURNEY,
	HL_NEW_PENS_JOURNEY,
	HL_BT_ONLY_JOURNEY,
	HL_BT_TOPUP_JOURNEY,
	HL_TOPUP_JOURNEY,
	LAP_NEW_TERM_JOURNEY,
	LAP_BT_TERM_JOURNEY,
	LAP_TOPUP_TERM_JOURNEY,
	LAP_BT_TOPUP_JOURNEY,
	LAP_DOD_NEW_JOURNEY,
	PLOT_ONLY_JOURNEY,
	PLOT_CONSTRUCTION_JOURNEY,
	PLOT_EQUITY_JOURNEY,
	PLOT_CONSTRUCTION_ONLY_JOURNEY,
	PLOT_BT_JOURNEY,
	PL_FRESH_YES_OBLIG_JOURNEY,
	PL_CONSOL_JOURNEY,
	PL_NO_OBLIG_JOURNEY,
	BL_FRESH_YES_OBLIG_JOURNEY,
	BL_CONSOL_JOURNEY,
	BL_NO_OBLIG_JOURNEY,
	PROF_FRESH_YES_OBLIG_JOURNEY,
	PROF_CONSOL_JOURNEY,
	PROF_NO_OBLIG_JOURNEY,
	EDGE_AGE_23_JOURNEY,
	EDGE_AGE_68_JOURNEY,
	EDGE_BT_CREDIT_LINES_JOURNEY,
	EDGE_CIBIL_580_JOURNEY,
	EDGE_CIBIL_650_JOURNEY,
	EDGE_COMPANY_PVT_JOURNEY,
	EDGE_GOVT_SAL_JOURNEY,
	EDGE_HIGH_FOIR_JOURNEY,
	EDGE_HIGH_VALUE_JOURNEY,
	EDGE_NRI_JOURNEY,
	EDGE_PROF_LAWYER_DC_JOURNEY,
	EDGE_3_APPLICANTS_JOURNEY
} from '$lib/testing/journeys/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FormPath {
	q1_loanName: string;
	q2_facilityType_LAP?: string;
	q2_loanType?: string;
	q2_facilityType_unsec?: string;
	q3_obligationsRunning?: string;
	/**
	 * q4_loanType — the scope question for non-Plot loans (Home / LAP / PL / BL / Prof).
	 * Optional because Plot Loan uses the q4_loanVariant question instead, and BT
	 * scopes hide q4 entirely. Pre-S210 this was required, which forced Plot
	 * scenarios to misuse it as the variant axis — fixed S210 per ADR-0020.
	 */
	q4_loanType?: string;
	/**
	 * q4_loanVariant — the variant question, Plot Loan only. Mutually exclusive
	 * with q4_loanType (different questions on the same form page; only one
	 * shows at a time based on q1_loanName). Added S210 audit per ADR-0020.
	 */
	q4_loanVariant?: string;
}

export interface ExpectedFill {
	/** Payload keys that SHOULD be asked by the form */
	expectedAsked: string[];
	/** Payload keys that should NOT be asked (invisible due to showWhen) */
	expectedSkipped: string[];
	/** Total pages expected to have fills */
	expectedPageCount: number;
}

export interface FormPathScenario {
	/** Unique ID like "HL-NEW-SAL-CLEAN" */
	id: string;
	/** Human-readable description */
	description: string;

	/** Layer 1: Form path through how-can-we-help */
	formPath: FormPath;
	/** Expected route after how-can-we-help */
	expectedRoute: string;

	/** Layer 2: Complete loan payload for this path */
	payload: LoanApplicationPayload;

	/** Layer 3: Expected fill results */
	expectedFill: ExpectedFill;

	/** Tags for filtering */
	tags: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME LOAN SCENARIOS (6)
// ═══════════════════════════════════════════════════════════════════════════════

const HL_NEW_SAL_CLEAN: FormPathScenario = {
	id: 'HL-NEW-SAL-CLEAN',
	description: 'Home Loan New — Salaried 80K, CIBIL 780, no obligations, RTM flat Pune ₹60L',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_NEW_SAL_CLEAN_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'purchaseType',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'residenceOptionSame',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: [
			'PropertyStage',
			'propertyValueAsPerATS',
			'residenceStateName',
			'residenceCityName'
		],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'new-loan', 'salaried', 'no-obligations', 'rtm']
};

const HL_NEW_SE_PRO: FormPathScenario = {
	id: 'HL-NEW-SE-PRO',
	description:
		'Home Loan New — Self-employed CA, CIBIL 750, under-construction flat Ahmedabad ₹50L',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_NEW_SE_PRO_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'purchaseType',
			'constructionType',
			'PropertyStage',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['residenceOptionSame'],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'new-loan', 'self-employed-professional', 'ca', 'under-construction']
};

const HL_NEW_PENS: FormPathScenario = {
	id: 'HL-NEW-PENS',
	description: 'Home Loan New — Pensioner 40K, CIBIL 800, resale house Bhopal ₹15L',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_NEW_PENS_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'purchaseType',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['PropertyStage'],
		expectedPageCount: 9
	},
	tags: ['home-loan', 'new-loan', 'pensioner', 'resale', 'rtm']
};

const HL_BT_ONLY: FormPathScenario = {
	id: 'HL-BT-ONLY',
	description: 'Home Loan BT Only — Salaried 90K, CIBIL 770, Outstanding 40L from HDFC',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'Balance Transfer Only'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_BT_ONLY_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'newTenure',
			'loanVintage',
			'repaymentTrack',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage'],
		expectedPageCount: 12
	},
	tags: ['home-loan', 'balance-transfer', 'salaried', 'clean-track']
};

const HL_BT_TOPUP: FormPathScenario = {
	id: 'HL-BT-TOPUP',
	description: 'Home Loan BT+Topup — Couple joint, CIBIL 750/740, Outstanding 35L SBI + 5L topup',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'Balance Transfer With Top-up'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_BT_TOPUP_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'newTenure',
			'requiredTopupAmount',
			'topupTerm',
			'loanVintage',
			'repaymentTrack',
			'residenceOptionSame',
			'residenceStateName',
			'residenceCityName',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage'],
		expectedPageCount: 13
	},
	tags: ['home-loan', 'balance-transfer', 'top-up', 'couple', 'salaried']
};

const HL_TOPUP: FormPathScenario = {
	id: 'HL-TOPUP',
	description: 'Home Loan Top-up Only — Salaried 70K, CIBIL 740, existing HL at ICICI',
	formPath: {
		q1_loanName: 'Home Loan',
		q4_loanType: 'Top-up Only'
	},
	expectedRoute: '/form/home-loan',
	payload: toScenario(HL_TOPUP_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'requiredTopupAmount',
			'topupTerm',
			'loanVintage',
			'repaymentTrack',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage', 'newTenure'],
		expectedPageCount: 12
	},
	tags: ['home-loan', 'top-up', 'salaried', 'obligations']
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAP SCENARIOS (5)
// ═══════════════════════════════════════════════════════════════════════════════

const LAP_NEW_TERM: FormPathScenario = {
	id: 'LAP-NEW-TERM',
	description: 'LAP Term New — Trader business expansion, Ahmedabad, CIBIL 730, ₹25L',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/lap',
	// S77e Step 4 — payload rewritten 2026-04-22 to match buildLoanPayload
	// output from LAP_NEW_TERM_JOURNEY. See pre-migration snapshot for full
	// shift notes (classification (i) FIXTURE-WAS-WRONG).
	payload: toScenario(LAP_NEW_TERM_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'carpetArea',
			'carpetAreaUnit',
			'propertyAreaType',
			'existingEncumbrance',
			'ocCcAvailable',
			'municipalApproval',
			'loanPurpose',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'PropertyStage', 'downPayment'],
		expectedPageCount: 9
	},
	tags: ['lap', 'new-loan', 'term', 'self-employed', 'trader', 'business-expansion']
};

const LAP_BT_TERM: FormPathScenario = {
	id: 'LAP-BT-TERM',
	description: 'LAP Term BT Only — Salaried BT from Axis Bank, Mumbai, CIBIL 760, ₹30L',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'Balance Transfer Only'
	},
	expectedRoute: '/form/lap',
	// S77e Step 4 — see LAP-BT-TERM pre-migration snapshot for shift notes.
	payload: toScenario(LAP_BT_TERM_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'newTenure',
			'loanVintage',
			'repaymentTrack',
			'carpetArea',
			'carpetAreaUnit',
			'propertyAreaType',
			'existingEncumbrance',
			'ocCcAvailable',
			'municipalApproval',
			'loanPurpose',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage'],
		expectedPageCount: 10
	},
	tags: ['lap', 'balance-transfer', 'term', 'salaried']
};

const LAP_TOPUP_TERM: FormPathScenario = {
	id: 'LAP-TOPUP-TERM',
	description: 'LAP Term Top-up Only — Doctor clinic expansion, Chennai, CIBIL 780',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'Top-up Only'
	},
	expectedRoute: '/form/lap',
	// S77e Step 4 — see LAP-TOPUP-TERM pre-migration snapshot for shift notes.
	payload: toScenario(LAP_TOPUP_TERM_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'requiredTopupAmount',
			'topupTerm',
			'loanVintage',
			'repaymentTrack',
			'carpetArea',
			'carpetAreaUnit',
			'propertyAreaType',
			'existingEncumbrance',
			'ocCcAvailable',
			'municipalApproval',
			'loanPurpose',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage', 'newTenure'],
		expectedPageCount: 10
	},
	tags: ['lap', 'top-up', 'term', 'self-employed-professional', 'doctor']
};

const LAP_BT_TOPUP: FormPathScenario = {
	id: 'LAP-BT-TOPUP',
	description: 'LAP Term BT+Topup — Manufacturer, Mumbai, CIBIL 720, BT+10L topup',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'Balance Transfer With Top-up'
	},
	expectedRoute: '/form/lap',
	// S77e Step 4 — see LAP-BT-TOPUP pre-migration snapshot for shift notes.
	payload: toScenario(LAP_BT_TOPUP_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'newTenure',
			'requiredTopupAmount',
			'topupTerm',
			'loanVintage',
			'repaymentTrack',
			'carpetArea',
			'carpetAreaUnit',
			'propertyAreaType',
			'existingEncumbrance',
			'ocCcAvailable',
			'municipalApproval',
			'loanPurpose',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage'],
		expectedPageCount: 10
	},
	tags: ['lap', 'balance-transfer', 'top-up', 'term', 'self-employed', 'manufacturer']
};

const LAP_DOD_NEW: FormPathScenario = {
	id: 'LAP-DOD-NEW',
	description: 'LAP DOD New — B2C services, Bangalore, CIBIL 740, ₹20L DOD',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Drop-line OverDraft (DOD)',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/lap',
	// S77e Step 4 — see LAP-DOD-NEW pre-migration snapshot for shift notes.
	payload: toScenario(LAP_DOD_NEW_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'constructionType',
			'propertyComplianceStatus',
			'ifPropertyRegistered',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'carpetArea',
			'carpetAreaUnit',
			'propertyAreaType',
			'existingEncumbrance',
			'ocCcAvailable',
			'municipalApproval',
			'loanPurpose',
			'dodMonthlyWithdrawal',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['purchaseType', 'downPayment', 'PropertyStage'],
		expectedPageCount: 9
	},
	tags: ['lap', 'new-loan', 'dod', 'self-employed', 'b2c-services']
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLOT LOAN SCENARIOS (5)
// ═══════════════════════════════════════════════════════════════════════════════

const PLOT_ONLY: FormPathScenario = {
	id: 'PLOT-ONLY',
	description: 'Plot Loan Only — Salaried, Jaipur, CIBIL 740, ₹20L plot purchase',
	formPath: {
		q1_loanName: 'Plot Loan',
		q2_loanType: 'New Loan',
		q4_loanVariant: 'Plot Loan Only'
	},
	expectedRoute: '/form/plot-loan',
	// S77e Step-4 FM-1 snapshot lock (see PLOT-ONLY.pre-migration.json for shift notes).
	// Payload rewritten to match buildLoanPayload() output from the PLOT_ONLY_JOURNEY.
	payload: toScenario(PLOT_ONLY_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'propertyComplianceStatus',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['constructionType', 'PropertyStage', 'ifPropertyRegistered', 'purchaseType'],
		expectedPageCount: 7
	},
	tags: ['plot-loan', 'plot-only', 'new-loan', 'salaried']
};

const PLOT_CONSTRUCTION: FormPathScenario = {
	id: 'PLOT-CONSTRUCTION',
	description: 'Plot & Construction — Govt employee, Bhopal, CIBIL 760, ₹30L',
	formPath: {
		q1_loanName: 'Plot Loan',
		q2_loanType: 'New Loan',
		q4_loanVariant: 'Plot & Construction Loan'
	},
	expectedRoute: '/form/plot-loan',
	// S77e Step-4 FM-1 snapshot lock (see PLOT-CONSTRUCTION.pre-migration.json for shift notes).
	payload: toScenario(PLOT_CONSTRUCTION_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'propertyComplianceStatus',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: ['constructionType', 'PropertyStage', 'ifPropertyRegistered', 'purchaseType'],
		expectedPageCount: 7
	},
	tags: ['plot-loan', 'plot-construction', 'new-loan', 'government']
};

const PLOT_EQUITY: FormPathScenario = {
	id: 'PLOT-EQUITY',
	description: 'Plot & Equity — Business owner, Indore, CIBIL 710, ₹25L',
	formPath: {
		q1_loanName: 'Plot Loan',
		q2_loanType: 'New Loan',
		q4_loanVariant: 'Plot & Equity Loan'
	},
	expectedRoute: '/form/plot-loan',
	// S77e Step-4 FM-1 snapshot lock (see PLOT-EQUITY.pre-migration.json).
	// Obligation id pinned to 'plot-equity-obligation-1' for deterministic byte-match.
	payload: toScenario(PLOT_EQUITY_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'propertyComplianceStatus',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'cashAmount',
			'ObligationsRunning'
		],
		expectedSkipped: ['constructionType', 'PropertyStage', 'ifPropertyRegistered', 'purchaseType'],
		expectedPageCount: 7
	},
	tags: ['plot-loan', 'plot-equity', 'new-loan', 'self-employed', 'trader']
};

const PLOT_CONSTRUCTION_ONLY: FormPathScenario = {
	id: 'PLOT-CONSTRUCTION-ONLY',
	description: 'Construction Only — Doctor building on owned plot, Coimbatore, CIBIL 790',
	formPath: {
		q1_loanName: 'Plot Loan',
		q2_loanType: 'New Loan',
		q4_loanVariant: 'Construction Loan Only'
	},
	expectedRoute: '/form/plot-loan',
	// S77e Step-4 FM-1 snapshot lock — page-visibility shift:
	// propertyCondition_Plot PAGE HIDDEN for Construction Loan Only, so its
	// downstream keys (municipalTaxStatus/unauthorizedAdditions/revenueRecordStatus)
	// do NOT appear in this payload (unlike the other plot journeys).
	payload: toScenario(PLOT_CONSTRUCTION_ONLY_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'propertyComplianceStatus',
			'propertyCost',
			'downPayment',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: ['constructionType', 'PropertyStage', 'ifPropertyRegistered', 'purchaseType'],
		expectedPageCount: 7
	},
	tags: ['plot-loan', 'construction-only', 'new-loan', 'self-employed-professional', 'doctor']
};

const PLOT_BT: FormPathScenario = {
	id: 'PLOT-BT',
	description: 'Plot Balance Transfer — Salaried BT from PNB, Agra, CIBIL 730',
	formPath: {
		q1_loanName: 'Plot Loan',
		q2_loanType: 'Balance Transfer Only'
		// No q4_loanVariant: Plot BT scope does not branch on variant.
		// (Pre-rename this incorrectly carried `q4_loanType: 'Plot Balance Transfer'`
		// — a value that's neither a canonical scope nor a canonical variant.
		// Fixed S210 audit, per ADR-0020 canonical four-field model.)
	},
	expectedRoute: '/form/plot-loan',
	// S77e Step-4 FM-1 snapshot lock — loanAmount derived from cost-minus-dp
	// fallback in buildLoanTransactionPayload (no sanction/RequiredLoanAmount set),
	// so loanAmount = propCost = 2000000 (downPayment is not set for BT flow).
	payload: toScenario(PLOT_BT_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'propertyIdentified',
			'propertyStateName',
			'propertyCityName',
			'propertyComplianceStatus',
			'propertyCost',
			'RequiredLoanAmount',
			'mortgageYear',
			'selectSingleBank',
			'principalOutstanding',
			'existingInterestRate',
			'remainingTenure',
			'includedCurrentEMIsAmount',
			'sixMonthsPassedAfterRegistry',
			'currentPropertyValue',
			'newTenure',
			'loanVintage',
			'repaymentTrack',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: [
			'constructionType',
			'PropertyStage',
			'ifPropertyRegistered',
			'purchaseType',
			'downPayment'
		],
		expectedPageCount: 8
	},
	tags: ['plot-loan', 'balance-transfer', 'salaried']
};

// ═══════════════════════════════════════════════════════════════════════════════
// UNSECURED LOAN SCENARIOS (9 = 3 per loan type)
// ═══════════════════════════════════════════════════════════════════════════════

// --- Personal Loan ---

const PL_FRESH_YES_OBLIG: FormPathScenario = {
	id: 'PL-FRESH-YES-OBLIG',
	description: 'Personal Loan Start Fresh — Salaried with obligations, Bangalore, CIBIL 750',
	formPath: {
		q1_loanName: 'Personal Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/personal',
	// S77e Step-4 (FIXTURE-WAS-WRONG): rewritten to match buildLoanPayload output.
	// urgencyLevel:'STANDARD' and existingBankRelationship:'YES' dropped (invalid enums).
	// Obligation.id pinned to 'obl-pl-fresh-1' (was random) and cleanObligationEntries()
	// defaults (remainingLimit:'0', utilizedAmount:'0') added. See pre-migration snapshot.
	payload: toScenario(PL_FRESH_YES_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['personal-loan', 'start-fresh', 'yes-obligations', 'salaried']
};

const PL_CONSOL: FormPathScenario = {
	id: 'PL-CONSOL',
	description:
		'Personal Loan Debt Consolidation — Salaried with multiple obligations, Delhi, CIBIL 710',
	formPath: {
		q1_loanName: 'Personal Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'Debt Consolidation with Extra Funds'
	},
	expectedRoute: '/form/unsecure-loan/personal',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see pre-migration snapshot for shift notes.
	payload: toScenario(PL_CONSOL_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'grossIncome',
			'netIncome',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['personal-loan', 'debt-consolidation', 'yes-obligations', 'salaried']
};

const PL_NO_OBLIG: FormPathScenario = {
	id: 'PL-NO-OBLIG',
	description:
		'Personal Loan No Obligations — Doctor, Hyderabad, CIBIL 780 (auto-rule sets Start Fresh)',
	formPath: {
		q1_loanName: 'Personal Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'No',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/personal',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see pre-migration snapshot for shift notes.
	// Notable: enrolledWithProfessionalBody comes from 'bar_council_registered' selection,
	// which the journey does NOT set (doctor) → defaults to false (was true in hand-written).
	payload: toScenario(PL_NO_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['personal-loan', 'no-obligations', 'auto-rule', 'self-employed-professional', 'doctor']
};

// --- Business Loan ---

const BL_FRESH_YES_OBLIG: FormPathScenario = {
	id: 'BL-FRESH-YES-OBLIG',
	description: 'Business Loan Start Fresh — Trading firm with obligations, Surat, CIBIL 720',
	formPath: {
		q1_loanName: 'Business Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/business',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see BL-FRESH-YES-OBLIG pre-migration snapshot.
	// Applicant-level businessEntityType/IndustrySector/Vintage/gstRegistrationStatus/
	// annualTurnoverRange/numberOfEmployees dropped: builder does not surface them on
	// the applicant block (they live on loanAnswers set from businessProfilePage).
	payload: toScenario(BL_FRESH_YES_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['business-loan', 'start-fresh', 'yes-obligations', 'self-employed', 'trader']
};

const BL_CONSOL: FormPathScenario = {
	id: 'BL-CONSOL',
	description:
		'Business Loan Debt Consolidation — Manufacturer with multiple loans, Indore, CIBIL 700',
	formPath: {
		q1_loanName: 'Business Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'Debt Consolidation with Extra Funds'
	},
	expectedRoute: '/form/unsecure-loan/business',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see BL-CONSOL pre-migration snapshot.
	payload: toScenario(BL_CONSOL_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'businessType',
			'GSTRegistrationYear',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['business-loan', 'debt-consolidation', 'yes-obligations', 'self-employed', 'manufacturer']
};

const BL_NO_OBLIG: FormPathScenario = {
	id: 'BL-NO-OBLIG',
	description:
		'Business Loan No Obligations — Company Pvt Ltd, Delhi, CIBIL 740 (auto-rule sets Start Fresh)',
	formPath: {
		q1_loanName: 'Business Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'No',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/business',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see BL-NO-OBLIG pre-migration snapshot.
	// Company applicant: title:'Mr.' auto-derived by deriveTitle when the raw
	// applicant doesn't carry one; each director gets isCoApplicant:false default.
	payload: toScenario(BL_NO_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'creditScore',
			'applicantType',
			'companyName',
			'companyType',
			'companyAge',
			'ObligationsRunning'
		],
		expectedSkipped: ['maritalStatus', 'TypeOfResidence'],
		expectedPageCount: 6
	},
	tags: ['business-loan', 'no-obligations', 'auto-rule', 'company', 'pvt-ltd']
};

// --- Professional Loan ---

const PROF_FRESH_YES_OBLIG: FormPathScenario = {
	id: 'PROF-FRESH-YES-OBLIG',
	description: 'Professional Loan Start Fresh — CA with obligations, Pune, CIBIL 760',
	formPath: {
		q1_loanName: 'Professional Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/professional',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see PROF-FRESH-YES-OBLIG pre-migration snapshot.
	payload: toScenario(PROF_FRESH_YES_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'professionType',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['professional-loan', 'start-fresh', 'yes-obligations', 'ca']
};

const PROF_CONSOL: FormPathScenario = {
	id: 'PROF-CONSOL',
	description: 'Professional Loan Debt Consolidation — Lawyer with obligations, Delhi, CIBIL 730',
	formPath: {
		q1_loanName: 'Professional Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'Debt Consolidation with Extra Funds'
	},
	expectedRoute: '/form/unsecure-loan/professional',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see PROF-CONSOL pre-migration snapshot.
	payload: toScenario(PROF_CONSOL_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'professionType',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['professional-loan', 'debt-consolidation', 'yes-obligations', 'lawyer']
};

const PROF_NO_OBLIG: FormPathScenario = {
	id: 'PROF-NO-OBLIG',
	description:
		'Professional Loan No Obligations — Architect, Bangalore, CIBIL 770 (auto-rule sets Start Fresh)',
	formPath: {
		q1_loanName: 'Professional Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'No',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/professional',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see PROF-NO-OBLIG pre-migration snapshot.
	payload: toScenario(PROF_NO_OBLIG_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'numberOfDirectorOrApplicant',
			'RequiredLoanAmount',
			'mortgageYear',
			'employmentType',
			'ageOfApplicant',
			'gender',
			'maritalStatus',
			'creditScore',
			'TypeOfResidence',
			'professionType',
			'averageBankBalance',
			'ObligationsRunning'
		],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['professional-loan', 'no-obligations', 'auto-rule', 'architect']
};

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE SCENARIOS (12) — Boundary testing for rule engine + form coverage
// ═══════════════════════════════════════════════════════════════════════════════

/** CIBIL 580: Deep subprime — tests deviation recovery, red→amber path */
const EDGE_CIBIL_580: FormPathScenario = {
	id: 'EDGE-CIBIL-580',
	description: 'Home Loan — CIBIL 580, Salaried 55K, stressed applicant, UC flat Thane ₹45L',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_CIBIL_580_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'propertyStateName',
			'propertyCityName',
			'creditScore',
			'employmentType'
		],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'low-cibil', 'subprime', 'stressed', 'under-construction', 'edge-case']
};

/** CIBIL 650: Marginal — tests amber results, borderline eligibility */
const EDGE_CIBIL_650: FormPathScenario = {
	id: 'EDGE-CIBIL-650',
	description: 'Personal Loan — CIBIL 650, Self-employed trader, 2 obligations, Delhi ₹8L',
	formPath: {
		q1_loanName: 'Personal Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/personal-loan',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see EDGE-CIBIL-650 pre-migration snapshot.
	payload: toScenario(EDGE_CIBIL_650_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanAmount', 'creditScore', 'employmentType', 'ObligationsRunning'],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['personal-loan', 'marginal-cibil', 'self-employed', 'obligations', 'edge-case']
};

/** High FOIR: 4 obligations consuming ~68% income — tests FOIR limit */
// S77e Step-4 shift notes (classification (i) FIXTURE-WAS-WRONG):
// purchaseType 'Direct Sale' → 'resale_normal'; propertyType REMOVED (no V2 binding);
// constructionStatus 'Ready to Move' → 'Flat'; propertyStage added (flagKey);
// carpetArea/carpetAreaUnit/carpetAreaRaw added from propertyCharacter page;
// ocCcAvailable/sellerTransaction fields added; titleChainStatus/encumbranceCertStatus
// REMOVED (hidden for PLANNED_AUTHORITY); marketValue/registryValue/auctionPropertyStatus/
// registryTimeline/documentationReadiness added; obligation ids pinned deterministically
// ('obl-high-foir-1..4'); obligation defaults from cleanObligationEntries;
// Credit Card carries explicit obligationType 'credit_line' override ('Credit Card' not
// in CREDIT_LINE_TYPES — only 'CC Limit'/'OD Limit'/'Dropline OD' auto-map).
const EDGE_HIGH_FOIR: FormPathScenario = {
	id: 'EDGE-HIGH-FOIR',
	description:
		'Home Loan — Salaried ₹1.2L but ₹82K EMI obligations, FOIR ~68%, RTM flat Noida ₹55L',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_HIGH_FOIR_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanType', 'creditScore', 'employmentType', 'ObligationsRunning'],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'high-foir', 'stressed', 'multiple-obligations', 'edge-case']
};

/** NRI applicant: Home Loan with NRI salaried profile */
const EDGE_NRI: FormPathScenario = {
	id: 'EDGE-NRI',
	description: 'Home Loan — NRI Doctor, CIBIL 810, RTM villa Goa ₹1.35Cr, GPA required',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_NRI_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanType', 'propertyStateName', 'creditScore', 'employmentType', 'isNRI'],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'nri', 'doctor', 'high-income', 'villa', 'edge-case']
};

/** Company applicant: Business Loan, Pvt Ltd, 2 directors */
const EDGE_COMPANY_PVT: FormPathScenario = {
	id: 'EDGE-COMPANY-PVT',
	description: 'Business Loan — Pvt Ltd, Manufacturing, 2 directors, CIBIL 720, Hyderabad ₹25L',
	formPath: {
		q1_loanName: 'Business Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'No',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/business-loan',
	payload: toScenario(EDGE_COMPANY_PVT_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanAmount', 'businessEntityType', 'creditScore'],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: [
		'business-loan',
		'company',
		'private-limited',
		'manufacturing',
		'multi-applicant',
		'edge-case'
	]
};

/** Multi-applicant: Husband + Wife + Father, Home Loan */
const EDGE_3_APPLICANTS: FormPathScenario = {
	id: 'EDGE-3-APPLICANTS',
	description:
		'Home Loan — 3 applicants (husband+wife+father), CIBIL 760/730/790, Bangalore ₹1.2Cr',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_3_APPLICANTS_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanType', 'numberOfDirectorOrApplicant', 'creditScore'],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'multi-applicant', 'family', 'pensioner', 'high-value', 'edge-case']
};

/** Young applicant: Age 23, minimum eligibility boundary */
const EDGE_AGE_23: FormPathScenario = {
	id: 'EDGE-AGE-23',
	description: 'Personal Loan — Age 23, Salaried 35K, CIBIL 710, first-time borrower, Chennai ₹5L',
	formPath: {
		q1_loanName: 'Personal Loan',
		q2_facilityType_unsec: 'Term Loan',
		q3_obligationsRunning: 'No',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/unsecure-loan/personal-loan',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see EDGE-AGE-23 pre-migration snapshot.
	payload: toScenario(EDGE_AGE_23_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanAmount', 'creditScore', 'employmentType'],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['personal-loan', 'young-applicant', 'age-boundary', 'first-time', 'edge-case']
};

/** Elderly applicant: Age 68, Pensioner + son co-borrower */
const EDGE_AGE_68: FormPathScenario = {
	id: 'EDGE-AGE-68',
	description:
		'LAP — Pensioner age 68 + son co-borrower, CIBIL 800/750, commercial property Jaipur ₹40L',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/lap',
	// S77e Step-4 (FIXTURE-WAS-WRONG) — see EDGE-AGE-68 pre-migration snapshot.
	payload: toScenario(EDGE_AGE_68_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanType', 'propertyStateName', 'creditScore', 'employmentType'],
		expectedSkipped: [],
		expectedPageCount: 8
	},
	tags: [
		'lap',
		'elderly',
		'age-boundary',
		'pensioner',
		'commercial',
		'multi-applicant',
		'edge-case'
	]
};

/** BT with existing OD/CC: Tests credit line handling in BT flow */
const EDGE_BT_CREDIT_LINES: FormPathScenario = {
	id: 'EDGE-BT-CREDIT-LINES',
	description:
		'Home Loan BT — Transferring HDFC HL + has OD + CC obligations, Salaried ₹95K, Mumbai ₹80L',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'Balance Transfer Only' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_BT_CREDIT_LINES_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'creditScore',
			'ObligationsRunning',
			'currentBank',
			'principalOutstanding'
		],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'balance-transfer', 'credit-lines', 'od', 'cc', 'edge-case']
};

/** Professional: Lawyer with Debt Consolidation */
const EDGE_PROF_LAWYER_DC: FormPathScenario = {
	id: 'EDGE-PROF-LAWYER-DC',
	description: 'Professional Loan DC — Lawyer, CIBIL 700, consolidating 2 PL, Kolkata ₹12L',
	formPath: {
		q1_loanName: 'Professional Loan',
		q2_facilityType_unsec: 'Debt Consolidation',
		q3_obligationsRunning: 'Yes',
		q4_loanType: 'Debt Consolidation with Extra Funds'
	},
	expectedRoute: '/form/unsecure-loan/professional-loan',
	payload: toScenario(EDGE_PROF_LAWYER_DC_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanAmount', 'professionalCategory', 'creditScore', 'ObligationsRunning'],
		expectedSkipped: [],
		expectedPageCount: 6
	},
	tags: ['professional-loan', 'lawyer', 'debt-consolidation', 'marginal-cibil', 'edge-case']
};

/** Government employee: Central Govt, high stability, LAP for commercial */
const EDGE_GOVT_SAL: FormPathScenario = {
	id: 'EDGE-GOVT-SAL',
	description: 'LAP — Central Govt officer, CIBIL 820, owned commercial Lucknow, ₹30L',
	formPath: {
		q1_loanName: 'Loan Against Property',
		q2_facilityType_LAP: 'Term Loan',
		q4_loanType: 'New Loan'
	},
	expectedRoute: '/form/lap',
	payload: toScenario(EDGE_GOVT_SAL_JOURNEY).payload,
	expectedFill: {
		expectedAsked: ['loanType', 'propertyStateName', 'creditScore', 'employmentType'],
		expectedSkipped: [],
		expectedPageCount: 8
	},
	tags: ['lap', 'government', 'central-govt', 'high-cibil', 'commercial', 'edge-case']
};

/** Very high loan: ₹5Cr+ Home Loan, Enterprise tier case */
const EDGE_HIGH_VALUE: FormPathScenario = {
	id: 'EDGE-HIGH-VALUE',
	description: 'Home Loan — ₹5Cr, Self-employed business, CIBIL 790, RTM flat Delhi ₹7Cr',
	formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
	expectedRoute: '/form/home-loan',
	payload: toScenario(EDGE_HIGH_VALUE_JOURNEY).payload,
	expectedFill: {
		expectedAsked: [
			'loanType',
			'propertyStateName',
			'creditScore',
			'employmentType',
			'propertyCost'
		],
		expectedSkipped: [],
		expectedPageCount: 10
	},
	tags: ['home-loan', 'high-value', 'self-employed', 'business', 'enterprise-tier', 'edge-case']
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_SCENARIOS: FormPathScenario[] = [
	// Home Loan (6)
	HL_NEW_SAL_CLEAN,
	HL_NEW_SE_PRO,
	HL_NEW_PENS,
	HL_BT_ONLY,
	HL_BT_TOPUP,
	HL_TOPUP,
	// LAP (5)
	LAP_NEW_TERM,
	LAP_BT_TERM,
	LAP_TOPUP_TERM,
	LAP_BT_TOPUP,
	LAP_DOD_NEW,
	// Plot Loan (5)
	PLOT_ONLY,
	PLOT_CONSTRUCTION,
	PLOT_EQUITY,
	PLOT_CONSTRUCTION_ONLY,
	PLOT_BT,
	// Personal Loan (3)
	PL_FRESH_YES_OBLIG,
	PL_CONSOL,
	PL_NO_OBLIG,
	// Business Loan (3)
	BL_FRESH_YES_OBLIG,
	BL_CONSOL,
	BL_NO_OBLIG,
	// Professional Loan (3)
	PROF_FRESH_YES_OBLIG,
	PROF_CONSOL,
	PROF_NO_OBLIG,
	// Edge Cases (12)
	EDGE_CIBIL_580,
	EDGE_CIBIL_650,
	EDGE_HIGH_FOIR,
	EDGE_NRI,
	EDGE_COMPANY_PVT,
	EDGE_3_APPLICANTS,
	EDGE_AGE_23,
	EDGE_AGE_68,
	EDGE_BT_CREDIT_LINES,
	EDGE_PROF_LAWYER_DC,
	EDGE_GOVT_SAL,
	EDGE_HIGH_VALUE
];

/** Quick lookup by scenario ID */
export const SCENARIO_BY_ID = new Map<string, FormPathScenario>(
	ALL_SCENARIOS.map((s) => [s.id, s])
);

/** Filter scenarios by tag */
export function getScenariosByTag(tag: string): FormPathScenario[] {
	return ALL_SCENARIOS.filter((s) => s.tags.includes(tag));
}

/** Filter scenarios by loan name */
export function getScenariosByLoanName(loanName: string): FormPathScenario[] {
	return ALL_SCENARIOS.filter((s) => s.formPath.q1_loanName === loanName);
}

