/**
 * Business Loan (Unsecured) — wizard configuration.
 *
 * Captures every parametric difference so the shared wizard infrastructure
 * can render / navigate / evaluate without loan-type-specific branching.
 */

import type { LoanWizardConfig } from '$lib/types/wizardConfig';
import {
	businessLoanSections,
	businessLoanDCSections
} from '$lib/config/wizardSections/businessLoan';
import { ROUTES } from '$lib/config/routes';

export const businessLoanConfig: LoanWizardConfig = {
	loanType: 'business',
	// `selectedLoanValue` is the case-level identifier this wizard creates. The
	// '- Unsecured' suffix is INTENTIONALLY load-bearing — but for an obligation-
	// level reason, not because we offer a "Business Loan - Secured" application
	// product. The matching string appears in `applicantOptions/loanTypes.ts`
	// + `obligationOptions.ts` as one of the existing-loan categories a customer
	// can pick when listing obligations they're paying off. The customer's existing
	// loans CAN be either secured or unsecured Business Loans (industry reality —
	// other banks offer both); we therefore expose both strings as obligation-type
	// options. Matching the case-level value to the obligation string keeps the
	// vocabulary coherent for cross-cutting features (e.g. "consolidate my existing
	// BL via a new BL application").
	//
	// No case-level handlers for the sibling 'Business Loan - Secured' exist
	// (removed in S215, 2026-06-02 — see TECH-DEBT-CLEANUP-2026-05-31 §6 closure).
	// The string remains live on two other axes: obligation-type taxonomy
	// (obligationOptions.ts, applicantOptions/loanTypes.ts, RM-portfolio filter)
	// and policy taxonomy (PMS `BL_SECURED` short-code in policyEngine.ts /
	// policyCapture.ts / seedPolicyEngine.ts short-code passthrough).
	//
	// Sunset trigger: if/when DigitalDSA ever introduces a true "Business Loan -
	// Secured" application product (separate form, separate flow, separate sidebar),
	// restore the case-level handlers (routes.ts, caseHelpers.ts prefix,
	// loanSwitchOrchestrator page-index, evaluating animation, deriveFixtureName).
	selectedLoanValue: 'Business Loan - Unsecured',
	pageIndexKey: 'businessLoanPageIndex',

	/** Sidebar section configuration (completion tracking + navigation) */
	sectionConfig: businessLoanSections,
	dcSectionConfig: businessLoanDCSections,

	/** Business loan routes on business location, not residence/property */
	cityQuestionMap: {
		businessStateName: 'q2_businessCityName'
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

	/** Business loan needs entity type for multi-applicant mode detection */
	extraPayloadFields: (answers: Record<string, unknown>) => ({
		businessEntityType: (answers['businessEntityType'] as string) || ''
	}),

	clearRedirectRoute: ROUTES.FORM.HOW_CAN_WE_HELP,
	pageTitle: 'Business Loan Application',
	pageDescription: 'Apply for a business loan with DigitalDSA'
};
