/**
 * Home Loan Schema — Page Assembly
 *
 * Imports questions from question bank modules and assembles them into
 * RawSchemaPage objects. Each builder function returns one page.
 * getAllPages() returns all 16 pages in schema order.
 *
 * Page restructuring (Session 32):
 * - BT Registry merged into Location page (was separate page 4)
 * - UC questions (progress, completion, track record, approvals) moved to Character
 * - Legal questions merged into Compliance page (was separate page 8)
 * - Authority page expanded (absorbs OC/CC, possession, docReadiness for AUTH)
 */

import type { RawSchemaPage } from './types.js';
import {
	buildApplicantPage,
	buildApplicantProfilePage as buildSharedApplicantProfilePage,
	buildIncomeProfilesPage as buildSharedIncomeProfilesPage,
	buildIncomeDetailsPage as buildSharedIncomeDetailsPage,
	buildCreditScorePage as buildSharedCreditScorePage,
	buildObligationsPage as buildSharedObligationsPage
} from '../schema/customComponentPages.js';
import { getCaseIntakeQuestions } from '../schema/caseIntakeQuestions.js';
import { getPropertyLocationQuestions } from './questionBank/propertyLocation.js';
import { getPropertyCharacterQuestions } from './questionBank/propertyCharacter.js';
import { getPropertyConditionQuestions } from './questionBank/propertyCondition.js';
import { getLegalQuestions } from './questionBank/legal.js';
import { getResaleSellerQuestions } from './questionBank/counterparty/resaleSeller.js';
import { getAuthorityQuestions } from './questionBank/counterparty/authority.js';
import { getDealFinancialsQuestions } from './questionBank/dealFinancials.js';
import { getExistingLoanQuestions } from './questionBank/existingLoan.js';
import { getLoanRequirementsQuestions } from './questionBank/loanRequirements.js';
import { getSanctionProfileQuestions } from './questionBank/sanctionProfile.js';

// ---------------------------------------------------------------------------
// Reusable showWhen fragments
// ---------------------------------------------------------------------------

/** Property location always shows after case intake is answered.
 *  propertyIdentified question moved here — gated to New Loan via its own showWhen. */
const SHOW_WHEN_PROPERTY_LOCATION = {
	'!=': [{ var: 'assessmentStatus' }, '']
};

const SHOW_WHEN_PROPERTY_OR_BT_TOPUP = {
	or: [
		{ '==': [{ var: 'propertyIdentified' }, 'Yes'] },
		{
			in: [
				{ var: 'loanType' },
				['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
			]
		}
	]
};

/** Any BT or Top-up loan type */
const SHOW_WHEN_BT_TOPUP = {
	in: [
		{ var: 'loanType' },
		['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
	]
};

// ---------------------------------------------------------------------------
// Page builder functions
// ---------------------------------------------------------------------------

/** Page 1: Case Intake — shared assessment status question */
export function buildCaseIntakePage(): RawSchemaPage {
	return {
		id: 'caseIntake_homeLoan',
		title: 'Case Assessment',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getCaseIntakeQuestions()
	};
}

/** Page 2: Property Location & Status
 *  Includes BT Registry questions (merged — auto-hidden for New Loan via showWhen) */
export function buildPropertyLocationPage(): RawSchemaPage {
	return {
		id: 'propertyLocation_homeLoan',
		title: 'Property Location & Status',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: SHOW_WHEN_PROPERTY_LOCATION,
		questions: getPropertyLocationQuestions()
	};
}

/** Page 3: Property Character
 *  Includes UC construction questions (progress, completion, track record, approvals) */
export function buildPropertyCharacterPage(): RawSchemaPage {
	return {
		id: 'propertyCharacter_homeLoan',
		title: 'Property Character',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: SHOW_WHEN_PROPERTY_OR_BT_TOPUP,
		questions: getPropertyCharacterQuestions()
	};
}

/** Page 4: Compliance & Legal Verification
 *  Merged: property compliance + legal verification questions.
 *  Skipped for AUTH purchases (authority page handles compliance for those). */
export function buildComplianceLegalPage(): RawSchemaPage {
	return {
		id: 'complianceLegal_homeLoan',
		title: 'Compliance & Legal Verification',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			and: [
				SHOW_WHEN_PROPERTY_OR_BT_TOPUP,
				{ '!=': [{ var: 'purchaseType' }, 'direct_from_authority'] }
			]
		},
		questions: [...getPropertyConditionQuestions(), ...getLegalQuestions()]
	};
}

/** Page 5: Seller & Transaction Details (resale purchases only) */
export function buildSellerTransactionPage(): RawSchemaPage {
	return {
		id: 'sellerTransaction_homeLoan',
		title: 'Seller & Transaction Details',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			and: [
				{
					and: [
						{ '==': [{ var: 'propertyIdentified' }, 'Yes'] },
						{ in: [{ var: 'loanType' }, ['New Loan']] }
					]
				},
				{ in: [{ var: 'purchaseType' }, ['resale_normal', 'resale_endorsement']] }
			]
		},
		questions: getResaleSellerQuestions()
	};
}

/** Page 6: Authority Details (direct from authority, new loan only)
 *  Expanded to include OC/CC, possession, and documentation readiness for AUTH flow. */
export function buildAuthorityPage(): RawSchemaPage {
	return {
		id: 'sellerTransaction_authority_homeLoan',
		title: 'Authority Details',
		description: 'Property allotted by development authority',
		showWhen: {
			and: [
				{ '==': [{ var: 'purchaseType' }, 'direct_from_authority'] },
				{ '==': [{ var: 'loanType' }, 'New Loan'] },
				{ '==': [{ var: 'propertyIdentified' }, 'Yes'] } // Show for AUTH only if property identified
			]
		},
		questions: getAuthorityQuestions()
	};
}

/** Page 7: Applicant Details — always visible, custom component */
export function buildTellUsPage(): RawSchemaPage {
	return buildApplicantPage('tellUs_homeLoan', 'Applicant Details');
}

/** Not a Company-only case (Individual applicant pages should be hidden for single-Company).
 *  Uses `!` instead of `!=` because the custom json-logic `!=` operator treats null/undefined
 *  as "unanswered → hide", which would hide pages when the flag simply isn't set. */
const NOT_ONLY_COMPANY = { '!': [{ var: '__onlyCompanyApplicant' }] };

/** Page 8: Applicant Profile — custom component */
export function buildHomeLoanApplicantProfilePage(): RawSchemaPage {
	return buildSharedApplicantProfilePage({
		and: [{ '<=': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Page 9: Income Profiles — custom component */
export function buildHomeLoanIncomeProfilesPage(): RawSchemaPage {
	return buildSharedIncomeProfilesPage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Page 10: Income Details — custom component */
export function buildHomeLoanIncomeDetailsPage(): RawSchemaPage {
	return buildSharedIncomeDetailsPage({
		and: [
			{ '==': [{ var: '__applicantCount' }, 1] },
			{ '!': [{ var: '__hasOnlyNoCurrentIncome' }] },
			NOT_ONLY_COMPANY
		]
	});
}

/** Page 11: Credit Score — custom component */
export function buildHomeLoanCreditScorePage(): RawSchemaPage {
	return buildSharedCreditScorePage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Page 12: Existing Loans — custom component.
 *  ObligationsRunning question is now on this page itself. */
export function buildHomeLoanObligationsPage(): RawSchemaPage {
	return buildSharedObligationsPage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Page 13: Deal & Financials (new loan with identified property) */
export function buildDealFinancialsPage(): RawSchemaPage {
	return {
		id: 'dealFinancials_homeLoan',
		title: 'Deal & Financials',
		description: 'Property valuation and loan structuring using the three-cost model',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			and: [
				{ '==': [{ var: 'loanType' }, 'New Loan'] },
				{ '==': [{ var: 'propertyIdentified' }, 'Yes'] }
			]
		},
		questions: getDealFinancialsQuestions()
	};
}

/** Page 14: Existing Loan Details (BT/Top-up) */
export function buildBtExistingLoanPage(): RawSchemaPage {
	return {
		id: 'btExistingLoan_homeLoan',
		title: 'Existing Loan Details',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: SHOW_WHEN_BT_TOPUP,
		questions: getExistingLoanQuestions()
	};
}

/** Page 15: Loan Requirements (BT/Top-up) */
export function buildLoanRequirementsPage(): RawSchemaPage {
	return {
		id: 'loanRequirements_homeLoan',
		title: 'Loan Requirements',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: SHOW_WHEN_BT_TOPUP,
		questions: getLoanRequirementsQuestions()
	};
}

/** Page 16: Pre-Sanction Profile (new loan, property not identified) */
export function buildSanctionProfilePage(): RawSchemaPage {
	return {
		id: 'sanctionProfile_homeLoan',
		title: 'Pre-Sanction Profile',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			and: [
				{ '==': [{ var: 'loanName' }, 'Home Loan'] },
				{ '==': [{ var: 'loanType' }, 'New Loan'] },
				{ '==': [{ var: 'propertyIdentified' }, 'No'] }
			]
		},
		questions: getSanctionProfileQuestions()
	};
}

// ---------------------------------------------------------------------------
// Full page list
// ---------------------------------------------------------------------------

/** Returns all 16 pages in schema order */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildCaseIntakePage(),
		buildPropertyLocationPage(),
		buildPropertyCharacterPage(),
		buildComplianceLegalPage(),
		buildSellerTransactionPage(),
		buildAuthorityPage(),
		buildTellUsPage(),
		buildHomeLoanApplicantProfilePage(),
		buildHomeLoanIncomeProfilesPage(),
		buildHomeLoanIncomeDetailsPage(),
		buildHomeLoanCreditScorePage(),
		buildHomeLoanObligationsPage(),
		buildDealFinancialsPage(),
		buildBtExistingLoanPage(),
		buildLoanRequirementsPage(),
		buildSanctionProfilePage()
	];
}
