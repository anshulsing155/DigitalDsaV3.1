/**
 * personalLoan — Page Assembly
 *
 * Imports questions from question bank modules and assembles them into
 * RawSchemaPage objects. getAllPages() returns all pages in schema order.
 *
 * DC (Debt Consolidation) reordering: Location moves to end of form.
 * Fresh: LoanReq → Location → Applicant → Income → Credit → Obligations
 * DC:    LoanReq → Applicant → Income → Credit → Obligations → Location
 * This is achieved by showWhen-gating locationPage (NOT DC) and locationPageDC (IS DC).
 */

import type { RawSchemaPage, RulesLogic } from '../schema/schemaTypes.js';
import { buildCaseIntakePage as buildSharedIntake } from '../schema/caseIntakeQuestions.js';
import {
	buildApplicantPage as sharedApplicantPage,
	buildApplicantProfilePage as sharedApplicantProfilePage,
	buildIncomeProfilesPage as sharedIncomeProfilesPage,
	buildIncomeDetailsPage as sharedIncomeDetailsPage,
	buildCreditScorePage as sharedCreditScorePage,
	buildObligationsPage as sharedObligationsPage
} from '../schema/customComponentPages.js';
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
// Page builder functions
// ---------------------------------------------------------------------------

/** Loan Processing Location — Fresh flow only (appears early, right after requirements) */
export function buildLocationPage(): RawSchemaPage {
	return {
		id: 'locationPage',
		title: 'Loan Processing Location',
		showWhen: NOT_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Loan Processing Location — DC flow only (appears last, after financial assessment) */
export function buildLocationPageDC(): RawSchemaPage {
	return {
		id: 'locationPageDC',
		title: 'Loan Processing Location',
		showWhen: IS_DC,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getLocationPageQuestions()
	};
}

/** Applicant Details — custom component */
export function buildApplicantPage(): RawSchemaPage {
	return sharedApplicantPage('applicantPage', 'Applicant Details');
}

// Shared showWhen: single Individual applicant only (hide for multi-applicant AND Company-only)
const SINGLE_INDIVIDUAL: RulesLogic = {
	and: [
		{ '!=': [{ var: '__multiApplicantMode' }, true] },
		{ '!=': [{ var: '__onlyCompanyApplicant' }, true] }
	]
};

/** Applicant Profile — custom component (education, religion, residence pattern, owned properties).
 *  Shows when single Individual applicant (not multi, not Company-only). */
export function buildApplicantProfilePage(): RawSchemaPage {
	return sharedApplicantProfilePage(SINGLE_INDIVIDUAL);
}

/** Income Profiles — custom component */
export function buildIncomeProfilesPage(): RawSchemaPage {
	return sharedIncomeProfilesPage(SINGLE_INDIVIDUAL);
}

/** Income Details — custom component */
export function buildIncomeDetailsPage(): RawSchemaPage {
	return sharedIncomeDetailsPage(SINGLE_INDIVIDUAL);
}

/** Credit Score — custom component */
export function buildCreditScorePage(): RawSchemaPage {
	return sharedCreditScorePage(SINGLE_INDIVIDUAL);
}

/** Existing Loans — custom component.
 *  Shows when Single Individual applicant (not multi, not Company-only).
 *  ObligationsRunning question is now on this page itself.
 */
export function buildObligationsPage(): RawSchemaPage {
	return sharedObligationsPage(SINGLE_INDIVIDUAL);
}

/** Loan Requirements */
export function buildLoanRequirementPage(): RawSchemaPage {
	return {
		id: 'loanRequirementPage',
		title: 'Loan Requirements',
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
 * - All other pages: always visible (or gated by __multiApplicantMode)
 *
 * Fresh visible order: LoanReq → Location → Applicant → Profile → Income → Credit → Obligations
 * DC visible order:    LoanReq → Applicant → Profile → Income → Credit → Obligations → LocationDC
 */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildSharedIntake('caseIntake_personalLoan'),
		buildLoanRequirementPage(),
		buildLocationPage(),
		buildApplicantPage(),
		buildApplicantProfilePage(),
		buildIncomeProfilesPage(),
		buildIncomeDetailsPage(),
		buildCreditScorePage(),
		buildObligationsPage(),
		buildLocationPageDC()
	];
}
