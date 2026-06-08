/**
 * Wizard Configuration — per-loan-type parameters for the shared form wizard.
 *
 * Each loan type (personal, business, professional, home, LAP, plot) provides
 * a config object that captures all its unique behavior. The shared wizard
 * infrastructure reads this config to customize its behavior.
 */

import type { WizardSectionConfig } from '$lib/types/wizard';

/** Which form state property stores the page index for this loan type */
export type PageIndexKey =
	| 'personalLoanPageIndex'
	| 'businessLoanPageIndex'
	| 'professionalLoanPageIndex'
	| 'homeLoanPageIndex'
	| 'lapPageIndex'
	| 'plotLoanPageIndex';

/** Mapping of state question IDs to dependent city question IDs */
export type CityQuestionMap = Record<string, string>;

/** Configuration for a specific loan type's wizard */
export interface LoanWizardConfig {
	/** Internal loan type identifier */
	loanType: string;

	/** Display name for UI ("Personal Loan", "Business Loan - Unsecured", etc.) */
	selectedLoanValue: string;

	/** Form state property for persisting the page index */
	pageIndexKey: PageIndexKey;

	/** Wizard section configuration (sidebar sections + completion tracking) */
	sectionConfig: WizardSectionConfig;

	/** Dynamic guidance section config (optional, for DC-enhanced loans) */
	dcSectionConfig?: WizardSectionConfig;

	/** State -> city question ID mappings for dependent option loading */
	cityQuestionMap: CityQuestionMap;

	/** Whether this loan type has GST state validation */
	hasGstValidation: boolean;

	/** Whether this loan type is secured (has property fields, builder/project, pincode typeahead) */
	isSecured: boolean;

	/** Whether this loan type has BT/top-up page ordering */
	hasBtTopup: boolean;

	/** Custom page IDs that use specialized rendering (applicant, income, credit, etc.) */
	customPageIds: Set<string>;

	/** Page IDs to skip in goNext when the page isn't the current step type */
	skipPageIds: Set<string>;

	/** Extra fields to add to the evaluation payload (e.g., businessEntityType) */
	extraPayloadFields?: (answers: Record<string, unknown>) => Record<string, unknown>;

	/** Route to redirect to when clearing form and starting over */
	clearRedirectRoute: string;

	/** SEO page title */
	pageTitle: string;

	/** SEO meta description */
	pageDescription: string;
}
