/**
 * lapLoan — Page Assembly
 *
 * Imports questions from question bank modules and assembles them into
 * RawSchemaPage objects. getAllPages() returns all pages in schema order.
 */

import type { RawSchemaPage } from '../schema/schemaTypes.js';
import { buildCaseIntakePage as buildSharedIntake } from '../schema/caseIntakeQuestions.js';
import {
	buildApplicantPage,
	buildApplicantProfilePage as sharedApplicantProfilePage,
	buildIncomeProfilesPage as sharedIncomeProfilesPage,
	buildIncomeDetailsPage as sharedIncomeDetailsPage,
	buildCreditScorePage as sharedCreditScorePage,
	buildObligationsPage as sharedObligationsPage
} from '../schema/customComponentPages.js';
import { getPropertyIdentificationPageQuestions } from './questionBank/propertyIdentification.js';
import { getPropertyLocationLapQuestions } from './questionBank/propertyLocation.js';
import { getPropertyCharacterLapQuestions } from './questionBank/propertyCharacter.js';
import { getPropertyConditionLapQuestions } from './questionBank/propertyCondition.js';
import { getPropertyLegalLapQuestions } from './questionBank/propertyLegal.js';
import { buildBtLoanDetailsPage } from '../schema/btLoanDetailsQuestions.js';
import { getTopUpDetailsPageQuestions } from './questionBank/topUpDetails.js';
import { getLoanRequirementPageQuestions } from './questionBank/loanRequirement.js';

// ---------------------------------------------------------------------------
// Page builder functions
// ---------------------------------------------------------------------------

/** Property & Applicant Location */
export function buildPropertyIdentificationPage(): RawSchemaPage {
	return {
		id: 'propertyIdentificationPage',
		title: 'Property & Applicant Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyIdentificationPageQuestions()
	};
}

/** Property Area & Location */
export function buildPropertyLocationLAPPage(): RawSchemaPage {
	return {
		id: 'propertyLocation_LAP',
		title: 'Property Area & Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyLocationLapQuestions()
	};
}

/** Property Character */
export function buildPropertyCharacterLAPPage(): RawSchemaPage {
	return {
		id: 'propertyCharacter_LAP',
		title: 'Property Character',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyCharacterLapQuestions()
	};
}

/** Property Condition & Compliance */
export function buildPropertyConditionLAPPage(): RawSchemaPage {
	return {
		id: 'propertyCondition_LAP',
		title: 'Property Condition & Compliance',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyConditionLapQuestions()
	};
}

/** Legal, Title & Occupation */
export function buildPropertyLegalLAPPage(): RawSchemaPage {
	return {
		id: 'propertyLegal_LAP',
		title: 'Legal, Title & Occupation',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyLegalLapQuestions()
	};
}

/** Applicant Information — custom component */
export function buildTellUsApplyingPage(): RawSchemaPage {
	return buildApplicantPage('tellUsApplyingPage', 'Applicant Information');
}

/** Not a Company-only case (Individual applicant pages should be hidden for single-Company).
 *  Uses `!` instead of `!=` because the custom json-logic `!=` operator treats null/undefined
 *  as "unanswered → hide", which would hide pages when the flag simply isn't set. */
const NOT_ONLY_COMPANY = { '!': [{ var: '__onlyCompanyApplicant' }] };

/** Applicant Profile — custom component */
export function buildApplicantProfilePage(): RawSchemaPage {
	return sharedApplicantProfilePage({
		and: [{ '<=': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Income Profiles — custom component */
export function buildIncomeProfilesPage(): RawSchemaPage {
	return sharedIncomeProfilesPage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Income Details — custom component */
export function buildIncomeDetailsPage(): RawSchemaPage {
	return sharedIncomeDetailsPage({
		and: [
			{ '==': [{ var: '__applicantCount' }, 1] },
			{ '!': [{ var: '__hasOnlyNoCurrentIncome' }] },
			NOT_ONLY_COMPANY
		]
	});
}

/** Credit Score — custom component */
export function buildCreditScorePage(): RawSchemaPage {
	return sharedCreditScorePage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Existing Loans — custom component.
 *  ObligationsRunning question is now on this page itself. */
export function buildObligationsPage(): RawSchemaPage {
	return sharedObligationsPage({
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
	});
}

/** Current Loan Details — uses the canonical shared question bank */
export function buildExistingDetailsPage(): RawSchemaPage {
	return buildBtLoanDetailsPage('existingDetailsPage', {
		in: [
			{ var: 'loanType' },
			['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
		]
	});
}

/** Balance Transfer & Top-Up */
export function buildTopUpDetailsPage(): RawSchemaPage {
	return {
		id: 'topUpDetailsPage',
		title: 'Balance Transfer & Top-Up',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			in: [
				{
					var: 'loanType'
				},
				['Balance Transfer With Top-up', 'Balance Transfer Only', 'Top-up Only']
			]
		},
		questions: getTopUpDetailsPageQuestions()
	};
}

/** Loan Amount & Tenure */
export function buildLoanRequirementPage(): RawSchemaPage {
	return {
		id: 'loanRequirementPage',
		title: 'Loan Amount & Tenure',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			and: [
				{
					'==': [
						{
							var: 'loanName'
						},
						'Loan Against Property'
					]
				},
				{
					'!=': [
						{
							var: 'facilityType'
						},
						''
					]
				},
				{
					'==': [
						{
							var: 'loanType'
						},
						'New Loan'
					]
				}
			]
		},
		questions: getLoanRequirementPageQuestions()
	};
}

// ---------------------------------------------------------------------------
// Full page list
// ---------------------------------------------------------------------------

/** Returns all 14 pages in schema order.
 * Loan requirement page comes BEFORE property & applicant pages because
 * the purpose selection (e.g., Debt Consolidation) affects downstream
 * questions in property, applicant, and obligation sections. */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildSharedIntake('caseIntake_lapLoan'),
		buildLoanRequirementPage(),
		buildPropertyIdentificationPage(),
		buildPropertyLocationLAPPage(),
		buildPropertyCharacterLAPPage(),
		buildPropertyConditionLAPPage(),
		buildPropertyLegalLAPPage(),
		buildTellUsApplyingPage(),
		buildApplicantProfilePage(),
		buildIncomeProfilesPage(),
		buildIncomeDetailsPage(),
		buildCreditScorePage(),
		buildObligationsPage(),
		buildExistingDetailsPage(),
		buildTopUpDetailsPage()
	];
}
