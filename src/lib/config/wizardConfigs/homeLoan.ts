/**
 * Home Loan — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import { homeLoanSections } from '$lib/config/wizardSections/homeLoan';
import { ROUTES } from '$lib/config/routes';

export const homeLoanConfig: LoanWizardConfig = {
	loanType: 'home',
	selectedLoanValue: 'Home Loan',
	pageIndexKey: 'homeLoanPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: homeLoanSections,
	/* No DC variant for Home Loan */

	/** Home loan uses property location + applicant residence */
	cityQuestionMap: {
		propertyStateName: 'q5_propertyCityName',
		residenceStateName: 'q6_residenceCityName'
	},

	hasGstValidation: true,
	isSecured: true,
	hasBtTopup: true,

	/**
	 * Pages that use specialised rendering (applicant, income, profile, etc.)
	 * Note: Home Loan uses 'tellUs_homeLoan' instead of 'tellUsApplyingPage'
	 */
	customPageIds: new Set([
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** Pages to skip in goNext payload collection (they manage their own store writes) */
	skipPageIds: new Set([
		'tellUs_homeLoan',
		'applicantProfilePage',
		'incomeProfilesPage',
		'incomeDetailsPage',
		'creditScorePage',
		'obligationsPage'
	]),

	/** Home loan also carries facilityType for BT/top-up variant detection */
	extraPayloadFields: (answers: Record<string, unknown>) => ({
		facilityType: (answers['facilityType'] as string) || ''
	}),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'Home Loan Application',
	pageDescription: 'Apply for a home loan with DigitalDSA'
};
