/**
 * Personal Loan — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import {
	personalLoanSections,
	personalLoanDCSections
} from '$lib/config/wizardSections/personalLoan';
import { ROUTES } from '$lib/config/routes';

export const personalLoanConfig: LoanWizardConfig = {
	loanType: 'personal',
	selectedLoanValue: 'Personal Loan',
	pageIndexKey: 'personalLoanPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: personalLoanSections,
	dcSectionConfig: personalLoanDCSections,

	/** Personal loan routes on residence location, not business/property */
	cityQuestionMap: {
		residenceStateName: 'q2_residenceCityName'
	},

	hasGstValidation: false,
	isSecured: false,
	hasBtTopup: false,

	/** Pages that use specialised rendering (applicant, profile, income, credit, obligations) */
	customPageIds: new Set([
		'applicantPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** Pages to skip in goNext payload collection (they manage their own store writes) */
	skipPageIds: new Set([
		'applicantPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'Personal Loan Application',
	pageDescription: 'Apply for a personal loan with DigitalDSA'
};
