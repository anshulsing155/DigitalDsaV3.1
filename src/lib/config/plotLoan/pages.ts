/**
 * plotLoan — Page Assembly
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
import { getPropertyLocationPlotQuestions } from './questionBank/propertyLocation_Plot.js';
import { getPropertyCharacterPlotQuestions } from './questionBank/propertyCharacter_Plot.js';
import { getConstructionDetailsPlotQuestions } from './questionBank/constructionDetails_Plot.js';
import { getPropertyConditionPlotQuestions } from './questionBank/propertyCondition_Plot.js';
import { getPropertyLegalPlotQuestions } from './questionBank/propertyLegal_Plot.js';
import { buildBtLoanDetailsPage } from '../schema/btLoanDetailsQuestions.js';
import { getLoanRequirementPageQuestions } from './questionBank/loanRequirement.js';

// ---------------------------------------------------------------------------
// Page builder functions
// ---------------------------------------------------------------------------

/** Property Location */
export function buildPropertyIdentificationPage(): RawSchemaPage {
	return {
		id: 'propertyIdentificationPage',
		title: 'Plot Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyIdentificationPageQuestions()
	};
}

/** Plot Area & Location */
export function buildPropertyLocationPlotPage(): RawSchemaPage {
	return {
		id: 'propertyLocation_Plot',
		title: 'Plot Area & Location',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyLocationPlotQuestions()
	};
}

/** Plot Character & Ownership */
export function buildPropertyCharacterPlotPage(): RawSchemaPage {
	return {
		id: 'propertyCharacter_Plot',
		title: 'Plot Character & Ownership',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyCharacterPlotQuestions()
	};
}

/** Construction Details */
export function buildConstructionDetailsPlotPage(): RawSchemaPage {
	return {
		id: 'constructionDetails_Plot',
		title: 'Construction Details',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			in: [
				{
					var: 'loanVariant'
				},
				['Plot & Construction Loan', 'Construction Loan Only']
			]
		},
		questions: getConstructionDetailsPlotQuestions()
	};
}

/** Plot Condition & Compliance */
export function buildPropertyConditionPlotPage(): RawSchemaPage {
	return {
		id: 'propertyCondition_Plot',
		title: 'Plot Condition & Compliance',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		showWhen: {
			'!=': [
				{
					var: 'loanVariant'
				},
				'Construction Loan Only'
			]
		},
		questions: getPropertyConditionPlotQuestions()
	};
}

/** Legal, Title & Registration */
export function buildPropertyLegalPlotPage(): RawSchemaPage {
	return {
		id: 'propertyLegal_Plot',
		title: 'Legal, Title & Registration',
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: getPropertyLegalPlotQuestions()
	};
}

/** Applicant Type — custom component */
export function buildTellUsApplyingPage(): RawSchemaPage {
	return buildApplicantPage('tellUsApplyingPage', 'Applicant Type');
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
		and: [{ '==': [{ var: '__applicantCount' }, 1] }, NOT_ONLY_COMPANY]
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
		in: [{ var: 'loanType' }, ['Balance Transfer Only']]
	});
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

/** Returns all 15 pages in schema order */
export function getAllPages(): RawSchemaPage[] {
	return [
		buildSharedIntake('caseIntake_plotLoan'),
		buildPropertyIdentificationPage(),
		buildPropertyLocationPlotPage(),
		buildPropertyCharacterPlotPage(),
		buildConstructionDetailsPlotPage(),
		buildPropertyConditionPlotPage(),
		buildPropertyLegalPlotPage(),
		buildTellUsApplyingPage(),
		buildApplicantProfilePage(),
		buildIncomeProfilesPage(),
		buildIncomeDetailsPage(),
		buildCreditScorePage(),
		buildObligationsPage(),
		buildExistingDetailsPage(),
		buildLoanRequirementPage()
	];
}
