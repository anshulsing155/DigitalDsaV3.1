/**
 * LAP (Loan Against Property) — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import { lapLoanSections } from '$lib/config/wizardSections/lapLoan';
import { ROUTES } from '$lib/config/routes';

export const lapLoanConfig: LoanWizardConfig = {
	loanType: 'lap',
	selectedLoanValue: 'Loan Against Property',
	pageIndexKey: 'lapPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: lapLoanSections,
	/* No DC variant for LAP */

	/** LAP uses property location + applicant residence */
	cityQuestionMap: {
		propertyStateName: 'q3_propertyCityName',
		residenceStateName: 'q5_residenceCityName'
	},

	hasGstValidation: true,
	isSecured: true,
	hasBtTopup: true,

	/** Pages that use specialised rendering (applicant, income, profile, etc.) */
	customPageIds: new Set([
		'tellUsApplyingPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** Pages to skip in goNext payload collection (they manage their own store writes) */
	skipPageIds: new Set([
		'tellUsApplyingPage',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** LAP-specific: facilityType differentiates BT/top-up variants */
	extraPayloadFields: (answers: Record<string, unknown>) => ({
		facilityType: (answers['facilityType'] as string) || ''
	}),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'LAP Loan Application',
	pageDescription: 'Apply for a loan against property with DigitalDSA'
};
