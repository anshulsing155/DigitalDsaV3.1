/**
 * businessLoan — Page Assembly
 *
 * Imports questions from question bank modules and assembles them into
 * RawSchemaPage objects. getAllPages() returns all pages in schema order.
 *
 * DC (Debt Consolidation) reordering: Location moves to end of form.
 * Fresh: LoanReq → Location → Applicant → BusinessProfile → Income → Credit → Obligations
 * DC:    LoanReq → Applicant → BusinessProfile → Income → Credit → Obligations → Location
 * This is achieved by showWhen-gating locationPage (NOT DC) and locationPageDC (IS DC).
 *
 * Company vs Individual flow:
 * - Individual: IncomeProfiles → IncomeDetails → Credit → Obligations
 * - Company:    CompanyFinancials → Credit → Obligations
 *
 * Note: BusinessProfile moved after Applicant (was before Location in earlier versions).
 * This groups it with the "applicant block" — business context comes after who's applying.
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
import { getBusinessProfilePageQuestions } from './questionBank/businessProfile.js';
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

// Shows pages for any single applicant (Individual OR Company), hides for multi-applicant
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

// Sole proprietorship has no separate legal entity — owner IS the business.
// All Business Profile fields (industry, vintage, GST status, turnover) are
// captured in richer form on Income Details under the business_proprietorship
// income profile, so the Business Profile page is redundant and is hidden here.
// For all other entity types (Pvt Ltd, LLP, Partnership, etc.) the company is
// a separate legal entity and the page is needed.
//
// Authored as `! { == }` rather than `!=` to dodge CLAUDE.md Pitfall #1 — the
// `!=` operator is overridden to fail-HIDE on null/undefined, which would
// also hide the page before the user has set businessEntityType (e.g. when
// the wizard pre-evaluates pages on first load). The `! { == }` form keeps
// standard semantics: unset entity → not equal to 'proprietorship' → visible.
const NOT_PROPRIETORSHIP: RulesLogic = {
	'!': { '==': [{ var: 'businessEntityType' }, 'proprietorship'] }
};

// ---------------------------------------------------------------------------
// Page builder functions
// ---------------------------------------------------------------------------

/** Business Profile — hidden for sole proprietorship (data already captured
 *  in the business_proprietorship income profile on Income Details). */
export function buildBusinessProfilePage(): RawSchemaPage {
	return {
		id: 'businessProfilePage',
		title: 'Business Profile',
		showWhen: NOT_PROPRIETORSHIP,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getBusinessProfilePageQuestions()
	};
}

/** Business Location — Fresh flow only (appears early, right after requirements) */
export function buildLocationPage(): RawSchemaPage {
	return {
		id: 'locationPage',
		title: 'Business Location',
		showWhen: NOT_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Business Location — DC flow only (appears last, after financial assessment) */
export function buildLocationPageDC(): RawSchemaPage {
	return {
		id: 'locationPageDC',
		title: 'Business Location',
		showWhen: IS_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Applicant Details — custom component */
export function buildApplicantPage(): RawSchemaPage {
	return sharedApplicantPage('applicantPage', 'Applicant Details');
}

/** Applicant Profile — custom component.
 *  Sole-proprietor (lone Individual) ONLY. A Company captures its profile inside the
 *  applicant modal (Identity/Character tabs) via the multi cards+modal flow, so it must
 *  NOT walk this flattened page (see applicantViewMode.ts / Business Loan model). */
export function buildApplicantProfilePage(): RawSchemaPage {
	return sharedApplicantProfilePage(SINGLE_INDIVIDUAL);
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

/** Credit Score — custom component. Sole-proprietor (lone Individual) ONLY — a Company
 *  captures CIBIL in its applicant modal's CIBIL tab (multi cards+modal flow). */
export function buildCreditScorePage(): RawSchemaPage {
	return sharedCreditScorePage(SINGLE_INDIVIDUAL);
}

/** Existing Loans — custom component. Sole-proprietor (lone Individual) ONLY — a Company
 *  captures obligations in its applicant modal's Obligations tab (multi cards+modal flow).
 *  ObligationsRunning question is on this page itself. */
export function buildObligationsPage(): RawSchemaPage {
	return sharedObligationsPage(SINGLE_INDIVIDUAL);
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

// ---------------------------------------------------------------------------
// Full page list
// ---------------------------------------------------------------------------

/**
 * Returns all pages in schema order.
 *
 * Page visibility is controlled by showWhen:
 * - locationPage: visible only when NOT DC (Fresh flow — appears early)
 * - locationPageDC: visible only when IS DC (DC flow — appears last)
 * - businessProfilePage: hidden for proprietorship (NOT_PROPRIETORSHIP) —
 *   data is captured in richer form on Income Details
 * - incomeProfilesPage / incomeDetailsPage: Individual only (SINGLE_INDIVIDUAL)
 * - companyFinancialsPage: Company only (SINGLE_COMPANY)
 * - creditScorePage / obligationsPage: any single applicant (NOT_MULTI_APPLICANT)
 *
 * Fresh Proprietor: LoanReq → Location → Applicant → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations
 * Fresh Individual: LoanReq → Location → Applicant → BizProfile → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations
 * Fresh Company:    LoanReq → Location → Applicant → BizProfile → Profile → CompanyFinancials → Credit → Obligations
 * DC Proprietor:    LoanReq → Applicant → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations → LocationDC
 * DC Individual:    LoanReq → Applicant → BizProfile → Profile → IncomeProfiles → IncomeDetails → Credit → Obligations → LocationDC
 * DC Company:       LoanReq → Applicant → BizProfile → Profile → CompanyFinancials → Credit → Obligations → LocationDC
 */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildSharedIntake('caseIntake_businessLoan'),
		buildLoanRequirementPage(),
		buildLocationPage(),
		buildApplicantPage(),
		// businessProfilePage + companyFinancialsPage are intentionally NOT assembled:
		// they only ever showed for a Company, and a Company now captures business
		// profile + financials inside its applicant modal (Identity/Character/Income
		// tabs) via the multi cards+modal flow. Keeping them as separate pages
		// duplicated the modal (Problem D) and produced divergent/dead keys. The build
		// functions remain defined for reference. Sole-prop uses the pages below.
		buildApplicantProfilePage(),
		buildIncomeProfilesPage(),
		buildIncomeDetailsPage(),
		buildCreditScorePage(),
		buildObligationsPage(),
		buildLocationPageDC()
	];
}
