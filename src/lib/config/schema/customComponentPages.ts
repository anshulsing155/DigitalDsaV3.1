/**
 * Shared Custom Component Page Builders
 *
 * These pages have empty `questions: []` and are rendered by dedicated
 * Svelte components (ApplicantForm, Income, Credit, Obligations, etc.).
 * They appear in ALL loan types with the same structure — only page IDs,
 * titles, and showWhen conditions vary per loan type.
 */

import type { RawSchemaPage, RulesLogic } from './schemaTypes.js';

interface CustomPageOptions {
	id: string;
	title: string;
	showWhen?: RulesLogic;
}

/** Generic custom-component page builder */
function buildCustomPage(opts: CustomPageOptions): RawSchemaPage {
	const page: RawSchemaPage = {
		id: opts.id,
		title: opts.title,
		nextButtonVisibility: { mode: ['allRequiredAnswered'] },
		questions: []
	};
	if (opts.showWhen) {
		page.showWhen = opts.showWhen;
	}
	return page;
}

/** Applicant details / "Tell us who's applying" page */
export function buildApplicantPage(
	id: string,
	title: string,
	showWhen?: RulesLogic
): RawSchemaPage {
	return buildCustomPage({ id, title, showWhen });
}

/** Applicant profile page */
export function buildApplicantProfilePage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'applicantProfilePage',
		title: 'Applicant Profile',
		showWhen
	});
}

/** Income profiles selection page */
export function buildIncomeProfilesPage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'incomeProfilesPage',
		title: 'Income Profiles',
		showWhen
	});
}

/** Income details entry page */
export function buildIncomeDetailsPage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'incomeDetailsPage',
		title: 'Income Details',
		showWhen
	});
}

/** Credit score page */
export function buildCreditScorePage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'creditScorePage',
		title: 'Credit Score',
		showWhen
	});
}

/** Existing loans / obligations page */
export function buildObligationsPage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'obligationsPage',
		title: 'Existing Loans',
		showWhen
	});
}

/** Company financials page (ITR/cash income capture for Company applicants) */
export function buildCompanyFinancialsPage(showWhen?: RulesLogic): RawSchemaPage {
	return buildCustomPage({
		id: 'companyFinancialsPage',
		title: 'Company Financials',
		showWhen
	});
}
