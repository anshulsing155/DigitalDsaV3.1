/**
 * Professional Loan — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import {
	professionalLoanSections,
	professionalLoanDCSections
} from '$lib/config/wizardSections/professionalLoan';
import { ROUTES } from '$lib/config/routes';

export const professionalLoanConfig: LoanWizardConfig = {
	loanType: 'professional',
	selectedLoanValue: 'Professional Loan',
	pageIndexKey: 'professionalLoanPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: professionalLoanSections,
	dcSectionConfig: professionalLoanDCSections,

	/** Professional loan routes on business location (q5_ prefix, not q2_) */
	cityQuestionMap: {
		businessStateName: 'q5_businessCityName'
	},

	hasGstValidation: true,
	isSecured: false,
	hasBtTopup: false,

	/** Pages that use specialised rendering — includes applicantProfilePage + companyFinancialsPage */
	customPageIds: new Set([
		'applicantPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'companyFinancialsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** Pages to skip in goNext payload collection (they manage their own store writes) */
	skipPageIds: new Set([
		'applicantPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'companyFinancialsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'Professional Loan Application',
	pageDescription: 'Apply for a professional loan with DigitalDSA'
};
