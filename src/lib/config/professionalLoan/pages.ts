/**
 * professionalLoan — Page Assembly
 *
 * Imports questions from question bank modules and assembles them into
 * RawSchemaPage objects. getAllPages() returns all pages in schema order.
 *
 * DC (Debt Consolidation) reordering: Location moves to end of form.
 * Fresh: LoanReq → Location → Applicant → Profile → Income → Credit → Obligations
 * DC:    LoanReq → Applicant → Profile → Income → Credit → Obligations → Location
 * This is achieved by showWhen-gating locationPage (NOT DC) and locationPageDC (IS DC).
 *
 * Company vs Individual flow:
 * - Individual: IncomeProfiles → IncomeDetails → Credit → Obligations
 * - Company:    CompanyFinancials → Credit → Obligations
 */

import type { RawSchemaPage, RulesLogic } from '../schema/schemaTypes.js';
import { buildCaseIntakePage as buildSharedIntake } from '../schema/caseIntakeQuestions.js';
import {
	buildApplicantPage as sharedApplicantPage,
	buildApplicantProfilePage as sharedApplicantProfilePage,
	buildIncomeProfilesPage as sharedIncomeProfilesPage,
	buildIncomeDetailsPage as sharedIncomeDetailsPage,
	buildCreditScorePage as sharedCreditScorePage,
	buildObligationsPage as sharedObligationsPage,
	buildCompanyFinancialsPage as sharedCompanyFinancialsPage
} from '../schema/customComponentPages.js';
import { getProfessionalProfilePageQuestions } from './questionBank/professionalProfile.js';
import { getLocationPageQuestions } from './questionBank/location.js';
import { getLoanRequirementPageQuestions } from './questionBank/loanRequirement.js';

// ---------------------------------------------------------------------------
// DC detection helpers (shared across page builders)
// ---------------------------------------------------------------------------

const DC_TYPES = ['Debt Consolidation', 'Debt Consolidation with Extra Funds'];

const NOT_DC: RulesLogic = {
	'!': { in: [{ var: 'loanType' }, DC_TYPES] }
};

const IS_DC: RulesLogic = {
	in: [{ var: 'loanType' }, DC_TYPES]
};

// ---------------------------------------------------------------------------
// Applicant-type visibility guards
// ---------------------------------------------------------------------------

// Shows pages only for single Individual applicants (hides for multi AND Company-only)
const SINGLE_INDIVIDUAL: RulesLogic = {
	and: [
		{ '!=': [{ var: '__multiApplicantMode' }, true] },
		{ '!=': [{ var: '__onlyCompanyApplicant' }, true] }
	]
};

// Shows pages for any single applicant (Individual or Company), hides for multi-applicant
const NOT_MULTI_APPLICANT: RulesLogic = {
	'!=': [{ var: '__multiApplicantMode' }, true]
};

// Shows pages only for single Company applicants (hides for Individual and multi)
const SINGLE_COMPANY: RulesLogic = {
	and: [
		{ '!=': [{ var: '__multiApplicantMode' }, true] },
		{ '==': [{ var: '__onlyCompanyApplicant' }, true] }
	]
};

// ---------------------------------------------------------------------------
// Page builder functions
// ---------------------------------------------------------------------------

/**
 * Credit History page — ARCHIVED from active flow.
 * Credit history is now captured inside CreditScoreSection component.
 * Kept as function for reference but not included in getAllPages().
 */
// export function buildCreditHistoryPage() — see creditHistory.ts

/**
 * Eligibility Check page — ARCHIVED from active flow.
 * NRI status is now captured per-applicant in AddApplicantProfessional (step 0).
 * Kept as function for reference but not included in getAllPages().
 */
// export function buildCollateralFreeSelectionPage() — see collateral_free_selection.ts

/** Professional Profile */
export function buildProfessionalProfilePage(): RawSchemaPage {
	return {
		id: 'professionalProfilePage',
		title: 'Professional Profile',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getProfessionalProfilePageQuestions()
	};
}

/** Practice Location — Fresh flow only (appears early, right after requirements) */
export function buildLocationPage(): RawSchemaPage {
	return {
		id: 'locationPage',
		title: 'Practice Location',
		showWhen: NOT_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Practice Location — DC flow only (appears last, after financial assessment) */
export function buildLocationPageDC(): RawSchemaPage {
	return {
		id: 'locationPageDC',
		title: 'Practice Location',
		showWhen: IS_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Applicant Details — custom component */
export function buildApplicantPage(): RawSchemaPage {
	return sharedApplicantPage('applicantPage', 'Applicant Details');
}

/** Income Profiles — custom component (Individual only) */
export function buildIncomeProfilesPage(): RawSchemaPage {
	return sharedIncomeProfilesPage(SINGLE_INDIVIDUAL);
}

/** Income Details — custom component (Individual only) */
export function buildIncomeDetailsPage(): RawSchemaPage {
	return sharedIncomeDetailsPage(SINGLE_INDIVIDUAL);
}

/** Company Financials — custom component (Company only) */
export function buildCompanyFinancialsPage(): RawSchemaPage {
	return sharedCompanyFinancialsPage(SINGLE_COMPANY);
}

/** Credit Score — custom component (any single applicant — Individual or Company) */
export function buildCreditScorePage(): RawSchemaPage {
	return sharedCreditScorePage(NOT_MULTI_APPLICANT);
}

/** Existing Loans — custom component.
 *  Shows when single applicant (Individual or Company, not multi-applicant).
 *  ObligationsRunning question is now on this page itself.
 */
export function buildObligationsPage(): RawSchemaPage {
	return sharedObligationsPage(NOT_MULTI_APPLICANT);
}

/** Your Loan Requirements */
export function buildLoanRequirementPage(): RawSchemaPage {
	return {
		id: 'loanRequirementPage',
		title: 'Your Loan Requirements',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLoanRequirementPageQuestions()
	};
}

/** Applicant Profile — custom component (education, religion, residence, professional details).
 *  Hidden for multi-applicant (Company) path — profile is handled inside
 *  ApplicantFormUnsecured's internal sub-steps (Income & Credit modal). */
export function buildApplicantProfilePage(): RawSchemaPage {
	return sharedApplicantProfilePage(NOT_MULTI_APPLICANT);
}

// ---------------------------------------------------------------------------
// Full page list
// ---------------------------------------------------------------------------

/**
 * Returns all pages in schema order.
 *
 * Page visibility is controlled by showWhen:
 * - locationPage: visible only when NOT DC (Fresh flow — appears early)
 * - locationPageDC: visible only when IS DC (DC flow — appears last)
 * - incomeProfilesPage / incomeDetailsPage: Individual only (SINGLE_INDIVIDUAL)
 * - companyFinancialsPage: Company only (SINGLE_COMPANY)
 * - creditScorePage / obligationsPage: any single applicant (NOT_MULTI_APPLICANT)
 *
 * Fresh Individual: LoanReq → Location → Applicant → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations
 * Fresh Company:    LoanReq → Location → Applicant → Profile → CompanyFinancials → Credit → Obligations
 * DC Individual:    LoanReq → Applicant → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations → LocationDC
 * DC Company:       LoanReq → Applicant → Profile → CompanyFinancials → Credit → Obligations → LocationDC
 */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildSharedIntake('caseIntake_professionalLoan'),
		buildLoanRequirementPage(),
		buildLocationPage(),
		buildApplicantPage(),
		buildApplicantProfilePage(),
		buildIncomeProfilesPage(),
		buildIncomeDetailsPage(),
		buildCompanyFinancialsPage(),
		buildCreditScorePage(),
		buildObligationsPage(),
		buildLocationPageDC()
	];
}
