/**
 * Plot Loan — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import { plotLoanSections } from '$lib/config/wizardSections/plotLoan';
import { ROUTES } from '$lib/config/routes';

export const plotLoanConfig: LoanWizardConfig = {
	loanType: 'plot',
	selectedLoanValue: 'Plot Loan',
	pageIndexKey: 'plotLoanPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: plotLoanSections,
	/* No DC variant for Plot Loan */

	/** Plot loan uses property location + applicant residence */
	cityQuestionMap: {
		propertyStateName: 'q3_propertyCityName',
		residenceStateName: 'q6_residenceCityName'
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

	/** Plot loan also carries facilityType for BT/top-up variant detection */
	extraPayloadFields: (answers: Record<string, unknown>) => ({
		facilityType: (answers['facilityType'] as string) || ''
	}),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'Plot Loan Application',
	pageDescription: 'Apply for a plot loan with DigitalDSA'
};
