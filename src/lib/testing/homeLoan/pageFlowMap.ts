/**
 * Home Loan Page Flow Map
 *
 * Single source of truth for all Home Loan page sequences,
 * question IDs, DOM selectors, and visibility conditions.
 *
 * IMPORTANT: All question definitions below are derived from
 * src/lib/server/formEngine/schemas/homeLoanSchemaV2.json -- the actual JSON that drives the form.
 * Any change in the schema must be reflected here.
 *
 * Used by both Vitest unit tests and Playwright E2E tests.
 */

import { ROUTES as APP_ROUTES } from '$lib/config/routes.js';

// --- Page IDs -----------------------------------------------
export const PAGE_IDS = {
	CASE_INTAKE: 'caseIntake_homeLoan',
	PROPERTY_LOCATION: 'propertyLocation_homeLoan',
	PROPERTY_CHARACTER: 'propertyCharacter_homeLoan',
	// Session 32: BT Registry merged into Location page, Property Condition replaced by Compliance & Legal
	COMPLIANCE_LEGAL: 'complianceLegal_homeLoan',
	SELLER_TRANSACTION: 'sellerTransaction_homeLoan',
	SELLER_TRANSACTION_AUTHORITY: 'sellerTransaction_authority_homeLoan',
	APPLICANTS: 'tellUs_homeLoan',
	APPLICANT_PROFILE: 'applicantProfilePage',
	INCOME_PROFILES: 'incomeProfilesPage',
	INCOME_DETAILS: 'incomeDetailsPage',
	CREDIT_SCORE: 'creditScorePage',
	OBLIGATIONS: 'obligationsPage',
	DEAL_FINANCIALS: 'dealFinancials_homeLoan',
	BT_EXISTING_LOAN: 'btExistingLoan_homeLoan',
	LOAN_REQUIREMENTS: 'loanRequirements_homeLoan',
	SANCTION_PROFILE: 'sanctionProfile_homeLoan'
} as const;

export type PageId = (typeof PAGE_IDS)[keyof typeof PAGE_IDS];

// --- Loan Types ---------------------------------------------
export const LOAN_TYPE_VALUES = {
	NEW_LOAN: 'New Loan',
	BALANCE_TRANSFER: 'Balance Transfer Only',
	TOP_UP: 'Top-up Only',
	BT_WITH_TOPUP: 'Balance Transfer With Top-up'
} as const;

export type HomeLoanType = (typeof LOAN_TYPE_VALUES)[keyof typeof LOAN_TYPE_VALUES];

// --- Page Sequences Per Loan Type ---------------------------

/** New Loan with property identified = Yes */
export const NEW_LOAN_SEQUENCE: PageId[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.PROPERTY_LOCATION,
	PAGE_IDS.PROPERTY_CHARACTER,
	PAGE_IDS.COMPLIANCE_LEGAL,
	PAGE_IDS.SELLER_TRANSACTION,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.DEAL_FINANCIALS
];

/** New Loan with property identified = No (pre-sanction) */
export const PRE_SANCTION_SEQUENCE: PageId[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.SANCTION_PROFILE
];

/** ID-based BT/Top-up page order (replaces old index-based btTopUpSequence) */
export const BT_TOPUP_PAGE_ORDER: string[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.PROPERTY_LOCATION,
	PAGE_IDS.PROPERTY_CHARACTER,
	PAGE_IDS.COMPLIANCE_LEGAL,
	PAGE_IDS.SELLER_TRANSACTION,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.APPLICANT_PROFILE,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.BT_EXISTING_LOAN,
	PAGE_IDS.LOAN_REQUIREMENTS
];

/** Balance Transfer Only visible pages */
export const BT_ONLY_SEQUENCE: PageId[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.PROPERTY_LOCATION,
	PAGE_IDS.PROPERTY_CHARACTER,
	PAGE_IDS.COMPLIANCE_LEGAL,
	PAGE_IDS.SELLER_TRANSACTION,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.APPLICANT_PROFILE,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.BT_EXISTING_LOAN,
	PAGE_IDS.LOAN_REQUIREMENTS
];

/** Top-up Only visible pages */
export const TOPUP_ONLY_SEQUENCE: PageId[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.PROPERTY_LOCATION,
	PAGE_IDS.PROPERTY_CHARACTER,
	PAGE_IDS.COMPLIANCE_LEGAL,
	PAGE_IDS.SELLER_TRANSACTION,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.APPLICANT_PROFILE,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.BT_EXISTING_LOAN,
	PAGE_IDS.LOAN_REQUIREMENTS
];

/** Balance Transfer With Top-up visible pages */
export const BT_TOPUP_SEQUENCE: PageId[] = [
	PAGE_IDS.CASE_INTAKE,
	PAGE_IDS.PROPERTY_LOCATION,
	PAGE_IDS.PROPERTY_CHARACTER,
	PAGE_IDS.COMPLIANCE_LEGAL,
	PAGE_IDS.SELLER_TRANSACTION,
	PAGE_IDS.APPLICANTS,
	PAGE_IDS.APPLICANT_PROFILE,
	PAGE_IDS.INCOME_PROFILES,
	PAGE_IDS.INCOME_DETAILS,
	PAGE_IDS.CREDIT_SCORE,
	PAGE_IDS.OBLIGATIONS,
	PAGE_IDS.BT_EXISTING_LOAN,
	PAGE_IDS.LOAN_REQUIREMENTS
];

// --- Get Sequence for Loan Type -----------------------------
export function getPageSequence(
	loanType: HomeLoanType,
	propertyIdentified: 'Yes' | 'No' = 'Yes'
): PageId[] {
	switch (loanType) {
		case LOAN_TYPE_VALUES.NEW_LOAN:
			return propertyIdentified === 'Yes' ? NEW_LOAN_SEQUENCE : PRE_SANCTION_SEQUENCE;
		case LOAN_TYPE_VALUES.BALANCE_TRANSFER:
			return BT_ONLY_SEQUENCE;
		case LOAN_TYPE_VALUES.TOP_UP:
			return TOPUP_ONLY_SEQUENCE;
		case LOAN_TYPE_VALUES.BT_WITH_TOPUP:
			return BT_TOPUP_SEQUENCE;
		default:
			return NEW_LOAN_SEQUENCE;
	}
}

/** Check if a loan type uses the BT/Top-up navigation */
export function usesBtNavigation(loanType: HomeLoanType): boolean {
	return loanType !== LOAN_TYPE_VALUES.NEW_LOAN;
}

// --- Questions Per Page -------------------------------------
// Derived from: src/lib/server/formEngine/schemas/homeLoanSchemaV2.json

export interface QuestionDef {
	id: string;
	contextKey: string;
	/** bindsTo_template from schema -- the key data is stored under. Defaults to contextKey if same. */
	bindsTo: string;
	type:
		| 'radio'
		| 'text'
		| 'select'
		| 'derivedSelect'
		| 'multiple-select'
		| 'multiple-select-toggle'
		| 'checkbox'
		| 'month-year';
	required: boolean;
	/** Summarized showWhen condition from JSON-Logic. null = always visible on this page */
	showWhen: string | null;
	options?: string[];
}

export const QUESTIONS_BY_PAGE: Record<string, QuestionDef[]> = {
	// ---------------------------------------------------------
	// PAGE: caseIntake_homeLoan -- "Case Intake"
	// ---------------------------------------------------------
	[PAGE_IDS.CASE_INTAKE]: [
		{
			id: 'q1_priorAssessmentHistory',
			contextKey: 'priorAssessmentHistory',
			bindsTo: 'priorAssessmentHistory',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['first_assessment', 'assessed_1_2', 'assessed_3_plus', 'previously_rejected']
		},
		{
			id: 'q2_propertyIdentified',
			contextKey: 'propertyIdentified',
			bindsTo: 'propertyIdentified',
			type: 'radio',
			required: true,
			showWhen: 'loanType == "New Loan" AND priorAssessmentHistory != ""',
			options: ['Yes', 'No']
		}
	],

	// ---------------------------------------------------------
	// PAGE: propertyLocation_homeLoan -- "Property Location & Type"
	// ---------------------------------------------------------
	[PAGE_IDS.PROPERTY_LOCATION]: [
		{
			id: 'q1_propertyAreaType',
			contextKey: 'propertyAreaType',
			bindsTo: 'propertyAreaType',
			type: 'select',
			required: true,
			showWhen: null,
			options: [
				'PLANNED_AUTHORITY',
				'CONVERTED_RESIDENTIAL',
				'OLD_MUNICIPAL',
				'LOCAL_COLONY',
				'UNKNOWN'
			]
		},
		{
			id: 'q2a_purchaseType_planned',
			contextKey: 'purchaseType',
			bindsTo: 'purchaseType',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "PLANNED_AUTHORITY" AND NOT (BT AND isRegistryDone == "Yes")',
			options: [
				'direct_from_builder',
				'direct_from_authority',
				'resale_normal',
				'resale_endorsement'
			]
		},
		{
			id: 'q2b_purchaseType_other',
			contextKey: 'purchaseType',
			bindsTo: 'purchaseType',
			type: 'radio',
			required: true,
			showWhen:
				'propertyAreaType != "" AND propertyAreaType != "PLANNED_AUTHORITY" AND NOT (BT AND isRegistryDone == "Yes")',
			options: ['direct_from_builder', 'resale_normal', 'resale_endorsement']
		},
		{
			id: 'q4_propertyStateName',
			contextKey: 'propertyStateName',
			bindsTo: 'propertyStateName',
			type: 'select',
			required: true,
			showWhen: 'purchaseType != ""'
		},
		{
			id: 'q5_propertyCityName',
			contextKey: 'propertyCityName',
			bindsTo: 'propertyCityName',
			type: 'derivedSelect',
			required: true,
			showWhen: 'propertyStateName != ""'
		},
		{
			id: 'q6_pincode',
			contextKey: 'pincode',
			bindsTo: 'pincode',
			type: 'text',
			required: false,
			showWhen: 'propertyCityName != ""'
		},
		// --- BT Registry questions (merged from btRegistry page, Session 32) ---
		{
			id: 'q1_isRegistryDone',
			contextKey: 'isRegistryDone',
			bindsTo: 'isRegistryDone',
			type: 'radio',
			required: true,
			showWhen: 'loanType in BT types',
			options: ['Yes', 'No']
		},
		{
			id: 'q2_bt_possessionAndDemandStatus',
			contextKey: 'bt_possessionAndDemandStatus',
			bindsTo: 'bt_possessionAndDemandStatus',
			type: 'radio',
			required: true,
			showWhen: 'isRegistryDone == "No"',
			options: [
				'POSSESSION_NO_DEMAND',
				'POSSESSION_WITH_DEMAND',
				'NO_POSSESSION_NO_DEMAND',
				'NO_POSSESSION_WITH_DEMAND'
			]
		},
		{
			id: 'q3_bt_outstandingDemandAmount',
			contextKey: 'bt_outstandingDemandAmount',
			bindsTo: 'bt_outstandingDemandAmount',
			type: 'text',
			required: true,
			showWhen:
				'bt_possessionAndDemandStatus in ["POSSESSION_WITH_DEMAND", "NO_POSSESSION_WITH_DEMAND"]'
		},
		{
			id: 'q4_sixMonthsPassedAfterRegistry',
			contextKey: 'sixMonthsPassedAfterRegistry',
			bindsTo: 'sixMonthsPassedAfterRegistry',
			type: 'radio',
			required: true,
			showWhen: 'isRegistryDone == "Yes"',
			options: ['Yes', 'No']
		}
	],

	// ---------------------------------------------------------
	// PAGE: propertyCharacter_homeLoan -- "Property Character"
	// Page showWhen: propertyIdentified == "Yes" OR loanType in BT types
	// ---------------------------------------------------------
	[PAGE_IDS.PROPERTY_CHARACTER]: [
		{
			id: 'q1_constructionType',
			contextKey: 'constructionType',
			bindsTo: 'constructionType',
			type: 'select',
			required: true,
			showWhen: null,
			options: ['House', 'Flat', 'Floor']
		},
		{
			id: 'q2_PropertyStage',
			contextKey: 'PropertyStage',
			bindsTo: 'PropertyStage',
			type: 'radio',
			required: true,
			showWhen: 'constructionType != "" AND NOT (BT AND isRegistryDone == "Yes")',
			options: ['Under Construction', 'Ready To Move']
		},
		{
			id: 'q3_propertyAge',
			contextKey: 'propertyAge',
			bindsTo: 'propertyAge',
			type: 'select',
			required: true,
			showWhen:
				'constructionType != "" AND (PropertyStage == "Ready To Move" OR (BT AND isRegistryDone == "Yes"))',
			options: ['0-5', '6-10', '11-15', '16-20', '21-25', '26-30', '30+']
		},
		{
			id: 'q4_carpetArea',
			contextKey: 'carpetArea',
			bindsTo: 'carpetArea',
			type: 'text',
			required: true,
			showWhen:
				'constructionType != "" AND (PropertyStage == "Ready To Move" OR PropertyStage == "Under Construction" OR (BT AND isRegistryDone == "Yes"))'
		},
		{
			id: 'q5_projectName',
			contextKey: 'projectName',
			bindsTo: 'projectName',
			type: 'text',
			required: false,
			showWhen: 'carpetArea != "" AND constructionType in ["Flat", "Floor"]'
		}
	],

	// ---------------------------------------------------------
	// PAGE: complianceLegal_homeLoan -- "Compliance & Legal Verification"
	// Merged: property compliance + legal verification questions (Session 32)
	// Page showWhen: (propertyIdentified == "Yes" OR BT) AND purchaseType != "direct_from_authority"
	// BT Registry questions moved to propertyLocation page
	// ---------------------------------------------------------
	[PAGE_IDS.COMPLIANCE_LEGAL]: [
		// Q1 variants — 5 area-specific versions (same contextKey: propertyComplianceStatus)
		{
			id: 'q1a_propertyComplianceStatus_planned',
			contextKey: 'propertyComplianceStatus',
			bindsTo: 'propertyComplianceStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "PLANNED_AUTHORITY"',
			options: ['fully_compliant', 'authorized_not_per_plan', 'not_authorized']
		},
		{
			id: 'q1b_propertyComplianceStatus_converted',
			contextKey: 'propertyComplianceStatus',
			bindsTo: 'propertyComplianceStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "CONVERTED_RESIDENTIAL"',
			options: ['fully_compliant', 'authorized_not_per_plan', 'not_authorized']
		},
		{
			id: 'q1c_propertyComplianceStatus_municipal',
			contextKey: 'propertyComplianceStatus',
			bindsTo: 'propertyComplianceStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "OLD_MUNICIPAL"',
			options: ['fully_compliant', 'authorized_not_per_plan', 'not_authorized']
		},
		{
			id: 'q1d_propertyComplianceStatus_colony',
			contextKey: 'propertyComplianceStatus',
			bindsTo: 'propertyComplianceStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "LOCAL_COLONY"',
			options: ['fully_compliant', 'authorized_not_per_plan', 'not_authorized']
		},
		{
			id: 'q1e_propertyComplianceStatus_unknown',
			contextKey: 'propertyComplianceStatus',
			bindsTo: 'propertyComplianceStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "UNKNOWN" OR propertyAreaType == ""',
			options: ['fully_compliant', 'authorized_not_per_plan', 'not_authorized']
		},
		// Existing questions (preserved)
		{
			id: 'q2_ocCcAvailable',
			contextKey: 'ocCcAvailable',
			bindsTo: 'ocCcAvailable',
			type: 'radio',
			required: true,
			showWhen:
				'constructionType in ["Flat", "Floor"] AND (PropertyStage == "Ready To Move" OR (BT AND isRegistryDone == "Yes"))',
			options: ['BOTH', 'CC_ONLY', 'NONE', 'UNKNOWN']
		},
		{
			id: 'q3_municipalApproval',
			contextKey: 'municipalApproval',
			bindsTo: 'municipalApproval',
			type: 'radio',
			required: true,
			showWhen:
				'constructionType == "House" AND (PropertyStage == "Ready To Move" OR (BT AND isRegistryDone == "Yes"))',
			options: ['APPROVED', 'PARTIAL', 'NO_PLAN', 'UNKNOWN']
		},
		{
			id: 'q4_isPossessionOfferedByAuthority',
			contextKey: 'isPossessionOfferedByAuthority',
			bindsTo: 'isPossessionOfferedByAuthority',
			type: 'radio',
			required: true,
			showWhen:
				'loanType == "New Loan" AND purchaseType in ["direct_from_builder", "Direct Sale"] AND PropertyStage == "Ready To Move"',
			options: ['Yes', 'No']
		},
		// New area-specific questions
		{
			id: 'q5_reraRegistrationStatus',
			contextKey: 'reraRegistrationStatus',
			bindsTo: 'reraRegistrationStatus',
			type: 'radio',
			required: true,
			showWhen:
				'propertyAreaType in ["PLANNED_AUTHORITY", "UNKNOWN"] AND purchaseType == "direct_from_builder" AND PropertyStage == "Under Construction"',
			options: ['REGISTERED', 'NOT_REGISTERED', 'EXEMPT', 'UNKNOWN']
		},
		{
			id: 'q6_naConversionStatus',
			contextKey: 'naConversionStatus',
			bindsTo: 'naConversionStatus',
			type: 'radio',
			required: true,
			showWhen: 'HIDDEN (always false — naConversionStatus now derived from Q1b)',
			options: ['REGISTERED', 'APPLIED', 'NOT_STARTED', 'NOT_REQUIRED']
		},
		{
			id: 'q7_zoneClassification',
			contextKey: 'zoneClassification',
			bindsTo: 'zoneClassification',
			type: 'radio',
			required: true,
			showWhen:
				'propertyAreaType == "CONVERTED_RESIDENTIAL" AND propertyComplianceStatus == "fully_compliant"',
			options: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE']
		},
		{
			id: 'q8_municipalTaxStatus',
			contextKey: 'municipalTaxStatus',
			bindsTo: 'municipalTaxStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "OLD_MUNICIPAL" AND propertyComplianceStatus != ""',
			options: ['PAID_REGULAR', 'PAID_IRREGULAR', 'UNPAID', 'UNKNOWN']
		},
		{
			id: 'q9_unauthorizedAdditions',
			contextKey: 'unauthorizedAdditions',
			bindsTo: 'unauthorizedAdditions',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "OLD_MUNICIPAL" AND municipalTaxStatus != ""',
			options: ['NONE', 'MINOR', 'MAJOR', 'UNKNOWN']
		},
		{
			id: 'q10_revenueRecordStatus',
			contextKey: 'revenueRecordStatus',
			bindsTo: 'revenueRecordStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "LOCAL_COLONY" AND propertyComplianceStatus != ""',
			options: ['AVAILABLE_CURRENT', 'AVAILABLE_OUTDATED', 'NOT_AVAILABLE', 'UNKNOWN']
		},
		{
			id: 'q11_colonyRegularizationStatus',
			contextKey: 'colonyRegularizationStatus',
			bindsTo: 'colonyRegularizationStatus',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "LOCAL_COLONY" AND revenueRecordStatus != ""',
			options: ['REGULARIZED', 'PENDING', 'NOT_REGULARIZED', 'UNKNOWN']
		},
		{
			id: 'q12_gramPanchayatPermission',
			contextKey: 'gramPanchayatPermission',
			bindsTo: 'gramPanchayatPermission',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "LOCAL_COLONY" AND colonyRegularizationStatus != ""',
			options: ['YES', 'NO', 'NOT_REQUIRED', 'UNKNOWN']
		},
		// --- Legal Verification questions (merged from legalVerification page) ---
		// Q1 variants — 5 area-specific versions (same contextKey: documentationReadiness)
		{
			id: 'q1a_documentationReadiness_planned',
			contextKey: 'documentationReadiness',
			bindsTo: 'documentationReadiness',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "PLANNED_AUTHORITY"',
			options: ['ALL_READY', 'PARTIAL', 'NOT_STARTED', 'ISSUES_FOUND']
		},
		{
			id: 'q1b_documentationReadiness_converted',
			contextKey: 'documentationReadiness',
			bindsTo: 'documentationReadiness',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "CONVERTED_RESIDENTIAL"',
			options: ['ALL_READY', 'PARTIAL', 'NOT_STARTED', 'ISSUES_FOUND']
		},
		{
			id: 'q1c_documentationReadiness_municipal',
			contextKey: 'documentationReadiness',
			bindsTo: 'documentationReadiness',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "OLD_MUNICIPAL"',
			options: ['ALL_READY', 'PARTIAL', 'NOT_STARTED', 'ISSUES_FOUND']
		},
		{
			id: 'q1d_documentationReadiness_colony',
			contextKey: 'documentationReadiness',
			bindsTo: 'documentationReadiness',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "LOCAL_COLONY"',
			options: ['ALL_READY', 'PARTIAL', 'NOT_STARTED', 'ISSUES_FOUND']
		},
		{
			id: 'q1e_documentationReadiness_unknown',
			contextKey: 'documentationReadiness',
			bindsTo: 'documentationReadiness',
			type: 'radio',
			required: true,
			showWhen: 'propertyAreaType == "UNKNOWN" OR propertyAreaType == ""',
			options: ['ALL_READY', 'PARTIAL', 'NOT_STARTED', 'ISSUES_FOUND']
		},
		{
			id: 'q3_nocFromPreviousLender',
			contextKey: 'nocFromPreviousLender',
			bindsTo: 'nocFromPreviousLender',
			type: 'radio',
			required: true,
			showWhen: 'documentationReadiness != "" AND loanType in BT types',
			options: ['Yes', 'No', 'N/A']
		},
		{
			id: 'q4_titleChainStatus',
			contextKey: 'titleChainStatus',
			bindsTo: 'titleChainStatus',
			type: 'radio',
			required: true,
			showWhen: 'documentationReadiness != ""',
			options: ['CLEAR', 'PARTIAL_GAPS', 'UNCLEAR', 'UNKNOWN']
		},
		{
			id: 'q5_encumbranceCertStatus',
			contextKey: 'encumbranceCertStatus',
			bindsTo: 'encumbranceCertStatus',
			type: 'radio',
			required: true,
			showWhen: 'titleChainStatus != ""',
			options: ['CLEAR', 'ENCUMBERED', 'NOT_OBTAINED', 'UNKNOWN']
		},
		{
			id: 'q6_successionStatus',
			contextKey: 'successionStatus',
			bindsTo: 'successionStatus',
			type: 'radio',
			required: true,
			showWhen:
				'encumbranceCertStatus != "" AND purchaseType in ["resale_normal", "resale_endorsement"]',
			options: ['NOT_INHERITED', 'SUCCESSION_COMPLETE', 'SUCCESSION_PENDING', 'UNKNOWN']
		},
		{
			id: 'q7_revenueRecordMutation',
			contextKey: 'revenueRecordMutation',
			bindsTo: 'revenueRecordMutation',
			type: 'radio',
			required: true,
			showWhen:
				'propertyAreaType in ["CONVERTED_RESIDENTIAL", "OLD_MUNICIPAL", "LOCAL_COLONY", "UNKNOWN"] AND encumbranceCertStatus != ""',
			options: ['MUTATED', 'MUTATION_PENDING', 'NOT_MUTATED', 'NOT_REQUIRED']
		}
	],

	// ---------------------------------------------------------
	// PAGE: sellerTransaction_homeLoan -- "Seller & Transaction Details"
	// Page showWhen: (propertyIdentified == "Yes" OR BT) AND purchaseType in resale types
	// ---------------------------------------------------------
	[PAGE_IDS.SELLER_TRANSACTION]: [
		{
			id: 'q1_sellerOwnershipType',
			contextKey: 'sellerOwnershipType',
			bindsTo: 'sellerOwnershipType',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['SOLE_OWNER', 'JOINT_OWNERS', 'INHERITED', 'POA_HOLDER']
		},
		{
			id: 'q2_poaRegistrationStatus',
			contextKey: 'poaRegistrationStatus',
			bindsTo: 'poaRegistrationStatus',
			type: 'radio',
			required: true,
			showWhen: 'sellerOwnershipType == "POA_HOLDER"',
			options: ['REGISTERED', 'NOT_REGISTERED', 'UNKNOWN']
		},
		{
			id: 'q3_propertyAcquisitionMethod',
			contextKey: 'propertyAcquisitionMethod',
			bindsTo: 'propertyAcquisitionMethod',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['PURCHASED', 'INHERITED', 'GIFT_DEED', 'GOVT_ALLOTMENT', 'AGREEMENT_POA']
		},
		{
			id: 'q4_agreementPoaRegistryWilling',
			contextKey: 'agreementPoaRegistryWilling',
			bindsTo: 'agreementPoaRegistryWilling',
			type: 'radio',
			required: true,
			showWhen: 'propertyAcquisitionMethod == "AGREEMENT_POA"',
			options: ['YES', 'NO']
		},
		{
			id: 'q5_agreementPoaNbfcKnown',
			contextKey: 'agreementPoaNbfcKnown',
			bindsTo: 'agreementPoaNbfcKnown',
			type: 'radio',
			required: true,
			showWhen: 'agreementPoaRegistryWilling == "NO"',
			options: ['Yes', 'No']
		},
		{
			id: 'q6_agreementPoaNbfcName',
			contextKey: 'agreementPoaNbfcName',
			bindsTo: 'agreementPoaNbfcName',
			type: 'text',
			required: true,
			showWhen: 'agreementPoaNbfcKnown == "Yes"'
		},
		{
			id: 'q7_sellerOnLoan',
			contextKey: 'sellerOnLoan',
			bindsTo: 'sellerOnLoan',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['Yes', 'No', 'UNKNOWN']
		},
		{
			id: 'q8_sellerOutstandingAmount',
			contextKey: 'sellerOutstandingAmount',
			bindsTo: 'sellerOutstandingAmount',
			type: 'text',
			required: true,
			showWhen: 'sellerOnLoan == "Yes"'
		},
		{
			id: 'q9_sellerCurrentLender',
			contextKey: 'sellerCurrentLender',
			bindsTo: 'sellerCurrentLender',
			type: 'select',
			required: true,
			showWhen: 'sellerOnLoan == "Yes"'
		},
		{
			id: 'q10_ifPropertyRegistered',
			contextKey: 'ifPropertyRegistered',
			bindsTo: 'ifPropertyRegistered',
			type: 'radio',
			required: true,
			showWhen: 'sellerOnLoan != ""',
			options: ['Yes', 'No']
		},
		{
			id: 'q11_lastRegistryDuration',
			contextKey: 'lastRegistryDuration',
			bindsTo: 'lastRegistryDuration',
			type: 'radio',
			required: true,
			showWhen: 'ifPropertyRegistered == "Yes"',
			options: ['underSixMonths', 'underOneYear', 'underTwoYears', 'moreThanTwoYears']
		},
		{
			id: 'q12_isAnyBuilderDemand',
			contextKey: 'isAnyBuilderDemand',
			bindsTo: 'isAnyBuilderDemand',
			type: 'radio',
			required: true,
			showWhen: 'ifPropertyRegistered == "No"',
			options: ['Yes', 'No']
		}
	],

	// ---------------------------------------------------------
	// PAGE: sellerTransaction_authority_homeLoan -- "Authority Details"
	// Page showWhen: purchaseType == "direct_from_authority" AND loanType == "New Loan"
	// ---------------------------------------------------------
	[PAGE_IDS.SELLER_TRANSACTION_AUTHORITY]: [
		{
			id: 'q1_authorityName',
			contextKey: 'authorityName',
			bindsTo: 'authorityName',
			type: 'text',
			required: false,
			showWhen: null
		},
		{
			id: 'q2_allotmentLetterStatus',
			contextKey: 'allotmentLetterStatus',
			bindsTo: 'allotmentLetterStatus',
			type: 'radio',
			required: false,
			showWhen: null,
			options: ['ORIGINAL_AVAILABLE', 'COPY_AVAILABLE', 'PENDING_RECEIPT', 'NOT_AVAILABLE']
		},
		{
			id: 'q3_allotmentDate',
			contextKey: 'allotmentDate',
			bindsTo: 'allotmentDate',
			type: 'month-year',
			required: false,
			showWhen: 'allotmentLetterStatus != ""'
		},
		{
			id: 'q4_authorityPaymentStatus',
			contextKey: 'authorityPaymentStatus',
			bindsTo: 'authorityPaymentStatus',
			type: 'radio',
			required: false,
			showWhen: null,
			options: ['FULLY_PAID', 'PARTIALLY_PAID', 'NOT_PAID', 'UNKNOWN']
		},
		{
			id: 'q5_possessionCertificateStatus',
			contextKey: 'possessionCertificateStatus',
			bindsTo: 'possessionCertificateStatus',
			type: 'radio',
			required: false,
			showWhen: null,
			options: ['POSSESSION_CERT_AVAILABLE', 'TDR_ISSUED', 'NOT_ISSUED', 'UNKNOWN']
		},
		{
			id: 'q6_authorityDuesStatus',
			contextKey: 'authorityDuesStatus',
			bindsTo: 'authorityDuesStatus',
			type: 'radio',
			required: false,
			showWhen: null,
			options: ['NO_DUES', 'MINOR_DUES', 'MAJOR_DUES', 'UNKNOWN']
		}
	],

	// ---------------------------------------------------------
	// PAGE: tellUs_homeLoan -- "Applicant Details"
	// Questions: empty in JSON schema -- handled by ApplicantFormSecured component
	// ---------------------------------------------------------
	[PAGE_IDS.APPLICANTS]: [],

	// ---------------------------------------------------------
	// PAGE: applicantProfilePage -- "Applicant Profile"
	// Component page -- handled by ApplicantProfilePage component
	// showWhen: __applicantCount <= 1 (single applicant only)
	// Wizard location: "Profile & Financial" group (first subsection)
	// Questions: Education, Religion, SC/ST Category (Hindu), Disability,
	//            Owned Properties, Residence Pattern + location cascade, NRI Country
	// ---------------------------------------------------------
	[PAGE_IDS.APPLICANT_PROFILE]: [],

	// ---------------------------------------------------------
	// PAGE: incomeProfilesPage -- "Income Profiles"
	// Component page -- handled by IncomePageNew component
	// ---------------------------------------------------------
	[PAGE_IDS.INCOME_PROFILES]: [],

	// ---------------------------------------------------------
	// PAGE: incomeDetailsPage -- "Income Details"
	// Component page -- handled by IncomeTabContent component
	// ---------------------------------------------------------
	[PAGE_IDS.INCOME_DETAILS]: [],

	// ---------------------------------------------------------
	// PAGE: creditScorePage -- "Credit Score"
	// Component page -- handled by CreditScoreSection component
	// ---------------------------------------------------------
	[PAGE_IDS.CREDIT_SCORE]: [],

	// ---------------------------------------------------------
	// PAGE: obligationsPage -- "Existing Loans"
	// Component page -- handled by UnsecuredObligation component
	// ---------------------------------------------------------
	[PAGE_IDS.OBLIGATIONS]: [],

	// ---------------------------------------------------------
	// PAGE: dealFinancials_homeLoan -- "Deal & Financials"
	// Page showWhen: loanType == "New Loan" AND propertyIdentified == "Yes"
	// ---------------------------------------------------------
	[PAGE_IDS.DEAL_FINANCIALS]: [
		{
			id: 'q1_auctionPropertyStatus',
			contextKey: 'auctionPropertyStatus',
			bindsTo: 'auctionPropertyStatus',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['STANDARD', 'AUCTION_AWARE', 'AUCTION_UNAWARE']
		},
		{
			id: 'q2_mortgageYear',
			contextKey: 'mortgageYear',
			bindsTo: 'mortgageYear',
			type: 'radio',
			required: true,
			showWhen: 'auctionPropertyStatus != ""',
			options: ['10', '15', '20', '25', '30', 'MAX', 'OTHER']
		},
		{
			id: 'q2a_mortgageYearCustom',
			contextKey: 'mortgageYearCustom',
			bindsTo: 'mortgageYearCustom',
			type: 'text',
			required: true,
			showWhen: 'mortgageYear == "OTHER"'
		},
		{
			id: 'q3_marketValue',
			contextKey: 'marketValue',
			bindsTo: 'marketValue',
			type: 'text',
			required: true,
			showWhen: 'mortgageYear != "" AND (mortgageYear != "OTHER" OR mortgageYearCustom != "")'
		},
		{
			id: 'q4_propCost',
			contextKey: 'propCost',
			bindsTo: 'propCost',
			type: 'text',
			required: true,
			showWhen: 'marketValue != ""'
		},
		{
			id: 'q5_registryValue',
			contextKey: 'registryValue',
			bindsTo: 'registryValue',
			type: 'text',
			required: true,
			showWhen: 'propCost != ""'
		},
		{
			id: 'q6_deposit',
			contextKey: 'deposit',
			bindsTo: 'deposit',
			type: 'text',
			required: true,
			showWhen: 'registryValue != ""'
		},
		{
			id: 'q7_registryTimeline',
			contextKey: 'registryTimeline',
			bindsTo: 'registryTimeline',
			type: 'radio',
			required: true,
			showWhen: 'deposit != ""',
			options: ['WITHIN_1_MONTH', '1_3_MONTHS', '3_6_MONTHS', 'SPECIFIC_DATE']
		},
		{
			id: 'q7a_registryPlannedDate',
			contextKey: 'registryPlannedDate',
			bindsTo: 'registryPlannedDate',
			type: 'text',
			required: true,
			showWhen: 'registryTimeline == "SPECIFIC_DATE"'
		},
		{
			id: 'q7b_registryDateReason',
			contextKey: 'registryDateReason',
			bindsTo: 'registryDateReason',
			type: 'select',
			required: true,
			showWhen: 'registryTimeline == "SPECIFIC_DATE"',
			options: ['AUSPICIOUS', 'ANNIVERSARY', 'BIRTHDAY', 'TAX_PLANNING', 'FESTIVE', 'OTHER']
		}
	],

	// ---------------------------------------------------------
	// PAGE: btExistingLoan_homeLoan -- "Existing Loan Details"
	// Page showWhen: loanType != "New Loan"
	// ---------------------------------------------------------
	[PAGE_IDS.BT_EXISTING_LOAN]: [
		{
			id: 'q1_sanctionAmount',
			contextKey: 'sanctionAmount',
			bindsTo: 'sanctionAmount',
			type: 'text',
			required: true,
			showWhen:
				'loanType in ["Top-up Only", "Balance Transfer Only", "Balance Transfer With Top-up"]'
		},
		// q2_loanAccountNumber removed — operational detail
		{
			id: 'q3_loanDisbursementDate',
			contextKey: 'loanDisbursementDate',
			bindsTo: 'loanDisbursementDate',
			type: 'text',
			required: true,
			showWhen: 'sanctionAmount != ""'
		},
		{
			id: 'q4_interestRateType',
			contextKey: 'interestRateType',
			bindsTo: 'interestRateType',
			type: 'radio',
			required: true,
			showWhen:
				'loanDisbursementDate != "" AND loanType in ["Balance Transfer Only", "Balance Transfer With Top-up", "Top-up Only"]',
			options: ['FLOATING', 'FIXED', 'UNKNOWN']
		},
		{
			id: 'q5_emiBounceHistory',
			contextKey: 'emiBounceHistory',
			bindsTo: 'emiBounceHistory',
			type: 'radio',
			required: true,
			showWhen: 'interestRateType != ""',
			options: ['0', '1', '2', '3+']
		},
		{
			id: 'q6_principalOutstanding',
			contextKey: 'principalOutstanding',
			bindsTo: 'principalOutstanding',
			type: 'text',
			required: true,
			showWhen: 'emiBounceHistory != ""'
		},
		{
			id: 'q7_existingInterestRate',
			contextKey: 'existingInterestRate',
			bindsTo: 'existingInterestRate',
			type: 'text',
			required: true,
			showWhen: 'principalOutstanding != ""'
		},
		{
			id: 'q8_remainingTenure',
			contextKey: 'orignalRemaningTenure',
			bindsTo: 'remainingTenure',
			type: 'text',
			required: true,
			showWhen: 'existingInterestRate != ""'
		},
		{
			id: 'q9_selectSingleBank',
			contextKey: 'selectSingleBank',
			bindsTo: 'selectSingleBank',
			type: 'select',
			required: true,
			showWhen: 'remainingTenure != ""'
		},
		{
			id: 'q10_includedCurrentEMIsAmount',
			contextKey: 'includedCurrentEMIsAmount',
			bindsTo: 'includedCurrentEMIsAmount',
			type: 'text',
			required: true,
			showWhen: 'selectSingleBank != ""'
		}
	],

	// ---------------------------------------------------------
	// PAGE: loanRequirements_homeLoan -- "Loan Requirements"
	// Page showWhen: loanType != "New Loan"
	// ---------------------------------------------------------
	[PAGE_IDS.LOAN_REQUIREMENTS]: [
		{
			id: 'q1_marketValue',
			contextKey: 'marketValue',
			bindsTo: 'marketValue',
			type: 'text',
			required: true,
			showWhen: null
		},
		{
			id: 'q2_mortgageYear',
			contextKey: 'mortgageYear',
			bindsTo: 'mortgageYear',
			type: 'radio',
			required: true,
			showWhen: 'loanType != "Top-up Only"',
			options: ['10', '15', '20', '25', '30', 'MAX', 'OTHER']
		},
		{
			id: 'q2a_mortgageYearCustom',
			contextKey: 'mortgageYearCustom',
			bindsTo: 'mortgageYearCustom',
			type: 'text',
			required: true,
			showWhen: 'mortgageYear == "OTHER"'
		},
		{
			id: 'q4_topUpTenure',
			contextKey: 'topUpTenure',
			bindsTo: 'topUpTenure',
			type: 'select',
			required: true,
			showWhen: 'loanType in ["Top-up Only", "Balance Transfer With Top-up"]'
		},
		{
			id: 'q5_topUpAmount',
			contextKey: 'topUpAmount',
			bindsTo: 'topUpAmount',
			type: 'text',
			required: true,
			showWhen:
				'loanType in ["Top-up Only", "Balance Transfer With Top-up"] AND (topUpTenure != "" OR mortgageYear != "")'
		},
		{
			id: 'q6_topUpPurpose',
			contextKey: 'topUpPurpose',
			bindsTo: 'topUpPurpose',
			type: 'select',
			required: true,
			showWhen: 'loanType in ["Top-up Only", "Balance Transfer With Top-up"] AND topUpAmount != ""',
			options: [
				'RENOVATION',
				'EXTENSION',
				'FURNISHING',
				'MEDICAL',
				'EDUCATION',
				'BUSINESS',
				'DEBT_CONSOLIDATION',
				'WEDDING',
				'PERSONAL'
			]
		}
	],

	// ---------------------------------------------------------
	// PAGE: sanctionProfile_homeLoan -- "Pre-Sanction Profile"
	// Page showWhen: loanName == "Home Loan" AND loanType == "New Loan" AND propertyIdentified == "No"
	// ---------------------------------------------------------
	[PAGE_IDS.SANCTION_PROFILE]: [
		{
			id: 'q1_mortgageYear',
			contextKey: 'mortgageYear',
			bindsTo: 'mortgageYear',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['10', '15', '20', '25', 'MAX', 'OTHER']
		},
		{
			id: 'q1a_mortgageYearCustom',
			contextKey: 'mortgageYearCustom',
			bindsTo: 'mortgageYearCustom',
			type: 'text',
			required: true,
			showWhen: 'mortgageYear == "OTHER"'
		},
		{
			id: 'q2_sanctionType',
			contextKey: 'sanctionType',
			bindsTo: 'sanctionType',
			type: 'radio',
			required: true,
			showWhen: null,
			options: ['Based On Eligibility', 'Based on Downpayment']
		},
		{
			id: 'q3_deposit',
			contextKey: 'deposit',
			bindsTo: 'deposit',
			type: 'text',
			required: true,
			showWhen: 'sanctionType == "Based on Downpayment"'
		},
		{
			id: 'q4_withPersonalLoan',
			contextKey: 'withPersonalLoan',
			bindsTo: 'withPersonalLoan',
			type: 'radio',
			required: true,
			showWhen: 'sanctionType == "Based on Downpayment" AND deposit != ""',
			options: ['Yes', 'No']
		}
	]
};

// --- Page Visibility Conditions ------------------------------

/** Returns which pages are visible for given loan type + property identified combination */
export function getVisiblePages(
	loanType: HomeLoanType,
	propertyIdentified: 'Yes' | 'No' = 'Yes'
): PageId[] {
	const isNewLoan = loanType === LOAN_TYPE_VALUES.NEW_LOAN;
	const isBT =
		loanType === LOAN_TYPE_VALUES.BALANCE_TRANSFER ||
		loanType === LOAN_TYPE_VALUES.BT_WITH_TOPUP ||
		loanType === LOAN_TYPE_VALUES.TOP_UP;
	const hasProperty = propertyIdentified === 'Yes';

	const pages: PageId[] = [PAGE_IDS.CASE_INTAKE];

	// Property Location: visible if propertyIdentified=Yes OR any BT type
	if (hasProperty || isBT) {
		pages.push(PAGE_IDS.PROPERTY_LOCATION);
	}

	// Property Character: visible if propertyIdentified=Yes OR any BT type
	if (hasProperty || isBT) {
		pages.push(PAGE_IDS.PROPERTY_CHARACTER);
	}

	// Compliance & Legal: visible if propertyIdentified=Yes OR any BT type
	// (BT Registry questions now merged into Location page, Legal merged into Compliance)
	if (hasProperty || isBT) {
		pages.push(PAGE_IDS.COMPLIANCE_LEGAL);
	}

	// Seller Transaction: visible if (propertyIdentified=Yes OR BT) — further filtered by purchaseType in schema
	if (hasProperty || isBT) {
		pages.push(PAGE_IDS.SELLER_TRANSACTION);
	}

	// Applicants: always visible
	pages.push(PAGE_IDS.APPLICANTS);

	// Single-applicant income pages
	pages.push(PAGE_IDS.INCOME_PROFILES);
	pages.push(PAGE_IDS.INCOME_DETAILS);
	pages.push(PAGE_IDS.CREDIT_SCORE);
	pages.push(PAGE_IDS.OBLIGATIONS);

	// Deal Financials: New Loan with property identified only
	if (isNewLoan && hasProperty) {
		pages.push(PAGE_IDS.DEAL_FINANCIALS);
	}

	// BT Existing Loan + Requirements: NOT New Loan
	if (isBT) {
		pages.push(PAGE_IDS.BT_EXISTING_LOAN);
		pages.push(PAGE_IDS.LOAN_REQUIREMENTS);
	}

	// Sanction: New Loan without property
	if (isNewLoan && !hasProperty) {
		pages.push(PAGE_IDS.SANCTION_PROFILE);
	}

	return pages;
}

// --- DOM Selectors for Playwright ----------------------------

export const SELECTORS = {
	// Navigation
	NEXT_BUTTON: 'button[aria-label="Go to next step"]',
	NEXT_BUTTON_ACTIVE: 'button[aria-label="Go to next step"]:not(.nav-btn-muted)',
	PREV_BUTTON: 'button[aria-label="Go to previous step"]',
	SUBMIT_BUTTON: 'button[aria-label="Submit application"]',

	// Form field patterns (use with question ID)
	radio: (questionId: string, value: string) =>
		`label:has(input[name="${questionId}"][value="${value}"])`,
	radioInput: (questionId: string, value: string) =>
		`input[name="${questionId}"][value="${value}"]`,
	textInput: (questionId: string) => `input#${questionId}`,
	selectButton: (questionId: string) => `button[id="${questionId}"]`,
	selectOption: (label: string) => `li[role="option"]:has-text("${label}")`,
	listbox: 'ul[role="listbox"]',

	// Validation
	fieldError: (questionId: string) => `#${questionId}-error`,
	errorMessage: '.error-message',
	warningMessage: '.warning-message',

	// Session resume modal
	sessionResumeModal: '[data-testid="session-resume-modal"]',

	// Page indicators
	navError: '.nav-error'
} as const;

// --- Applicant Steps -----------------------------------------

export const APPLICANT_STEPS = {
	BASIC_DETAILS: 0,
	RELATIONSHIPS: 1,
	INCOME_CREDIT: 2
} as const;

/** Relationships step only shows when __individualApplicantCount > 1 */
export function getApplicantStepSequence(individualCount: number): number[] {
	if (individualCount > 1) {
		return [
			APPLICANT_STEPS.BASIC_DETAILS,
			APPLICANT_STEPS.RELATIONSHIPS,
			APPLICANT_STEPS.INCOME_CREDIT
		];
	}
	return [APPLICANT_STEPS.BASIC_DETAILS, APPLICANT_STEPS.INCOME_CREDIT];
}

// --- Form Routes ---------------------------------------------

export const ROUTES = {
	HOW_CAN_WE_HELP: APP_ROUTES.FORM.HOW_CAN_WE_HELP,
	HOME_LOAN_FORM: APP_ROUTES.FORM.HOME_LOAN,
	HOME_LOAN_OFFERS: APP_ROUTES.OFFERS.HOME_LOAN
} as const;

// --- Test Data Defaults (valid values for happy path) --------

export const HAPPY_PATH_ANSWERS = {
	/** Page: caseIntake_homeLoan */
	caseIntake: {
		priorAssessmentHistory: 'first_assessment',
		propertyIdentified: 'Yes'
	},

	/** Page: propertyLocation_homeLoan */
	propertyLocation: {
		propertyAreaType: 'PLANNED_AUTHORITY',
		purchaseType: 'direct_from_builder',
		propertyStateName: 'Delhi',
		propertyCityName: 'New Delhi',
		pincode: '110001'
	},

	/** Page: propertyCharacter_homeLoan */
	propertyCharacter: {
		constructionType: 'Flat',
		PropertyStage: 'Ready To Move',
		propertyAge: '0-5',
		carpetArea: '1200',
		projectName: 'DLF Capital Greens'
	},

	/** Page: complianceLegal_homeLoan (compliance + legal merged) */
	complianceLegal: {
		propertyComplianceStatus: 'fully_compliant',
		ocCcAvailable: 'BOTH',
		documentationReadiness: 'ALL_READY',
		nocFromPreviousLender: 'N/A'
	},

	/** Page: sellerTransaction_homeLoan (resale only) */
	sellerTransaction: {
		sellerOwnershipType: 'SOLE_OWNER',
		propertyAcquisitionMethod: 'PURCHASED',
		sellerOnLoan: 'No',
		ifPropertyRegistered: 'Yes',
		lastRegistryDuration: 'moreThanTwoYears'
	},

	/** Page: dealFinancials_homeLoan (New Loan + property) */
	dealFinancials: {
		auctionPropertyStatus: 'STANDARD',
		mortgageYear: '20',
		marketValue: '10000000',
		propCost: '7500000',
		registryValue: '7000000',
		deposit: '1875000',
		registryTimeline: 'WITHIN_1_MONTH'
	},

	/** Page: btExistingLoan_homeLoan (for BT/TopUp) */
	btExistingLoan: {
		sanctionAmount: '5000000',
		loanDisbursementDate: '2022-06',
		interestRateType: 'FLOATING',
		emiBounceHistory: '0',
		principalOutstanding: '3500000',
		existingInterestRate: '9.5',
		remainingTenure: '180',
		selectSingleBank: 'SBI',
		includedCurrentEMIsAmount: '35000'
	},

	/** Page: loanRequirements_homeLoan (for BT/TopUp) */
	loanRequirements: {
		marketValue: '7500000',
		mortgageYear: '20',
		topUpAmount: '1000000',
		topUpTenure: '10',
		topUpPurpose: 'RENOVATION'
	},

	/** Page: sanctionProfile_homeLoan (for pre-sanction) */
	sanctionProfile: {
		mortgageYear: '20',
		sanctionType: 'Based On Eligibility',
		withPersonalLoan: 'No'
	}
} as const;
