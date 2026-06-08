/**
 * Policy Capture Types
 * ══════════════════════════════════════════════════════════════════
 * Structured progressive form data for RM policy capture.
 * Each step of the wizard maps to a data interface here.
 *
 * Flow: RM fills form → PolicyCapture doc → Admin reviews →
 *       policyCaptureTransformer → ParsedLenderRuleDocument
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { ProductType, LenderClassification, PolicyFieldKey } from './policyEngine.js';
import type { IncomeProfileType } from './incomeProfile.js';

// ============================================================================
// CAPTURE STATUS & PROGRESS
// ============================================================================

export type PolicyCaptureStatus =
	| 'draft'
	| 'submitted'
	| 'under_review'
	| 'accepted'
	| 'rejected'
	| 'clarification_needed';

// ============================================================================
// UNIVERSAL BUILDING BLOCKS (used across all steps)
// ============================================================================

/** A single slab in a range-based rule (e.g., LTV by loan amount) */
export interface PolicySlab {
	from: number;
	to: number; // Use Infinity for open-ended
	value: number;
	label?: string; // e.g., "Up to ₹30L"
}

/** A named slab (e.g., LTV by property type) */
export interface NamedSlab {
	name: string; // e.g., "Flat", "Independent House"
	value: number;
}

/**
 * Conditional Rule — "When [condition] → Then [value]"
 * Used for parameters that vary by applicant profile, income level, etc.
 * Banks have different values for the same parameter based on conditions.
 * E.g., "FOIR = 50% for salaried, 45% for self-employed, 60% if income > 2L"
 */
export interface ConditionalRule {
	condition_description: string; // Human-readable: "Salaried with income > ₹1.5L"
	condition_type: string; // e.g., "employment", "income_level", "cibil_range", "property_type", "custom"
	value: string | number | boolean; // The value when condition is true
	value_label?: string; // Optional label for the value
}

/**
 * Custom Entry — Free-form entry for anything our form doesn't cover.
 * Every step gets an array of these as escape hatch.
 * "The RM should never think 'I have more info but nowhere to put it.'"
 */
export interface CustomEntry {
	label: string; // What this rule/condition is about
	value: string; // The actual value/description
	category?: string; // Optional grouping (e.g., "multiplier", "special_scheme", "condition")
}

/**
 * Multiplier/Special Rule — Double whammy, income multipliers, etc.
 * Banks apply special calculation modifiers in certain scenarios.
 */
export interface SpecialMultiplier {
	name: string; // e.g., "Double Whammy", "Co-applicant Multiplier"
	description: string; // e.g., "If both applicants salaried, multiply assessed income by 1.1x"
	multiplier_value: number | null; // e.g., 1.1 or 0.9
	applies_when: string; // When this kicks in
}

// ============================================================================
// PRODUCT VARIANT INFO
// ============================================================================

/**
 * Banks don't just have "Home Loan" — they have named products:
 * "HDFC Salaried Home Loan", "SBI PMAY Scheme", "Bajaj Women Special"
 * Each targets specific segments derivable from our form inputs.
 */
export interface ProductVariantInfo {
	/** Bank's own product name (e.g., "HDFC Salaried Home Loan") */
	bank_product_name: string;
	/** Internal code if any (e.g., "HL-SAL-001") */
	bank_product_code?: string;
	/** Description of target segment */
	target_segment?: string; // e.g., "Salaried employees in metro cities"
	/** Which applicant conditions auto-match this variant */
	segment_conditions?: string[]; // e.g., ["Salaried", "Income > 5L", "Metro city"]
	/** Is this the standard/vanilla product? */
	is_vanilla: boolean;
}

// ============================================================================
// STEP DATA INTERFACES
// ============================================================================

// ── Step 1: Core Parameters ──────────────────────────────────────

export type ROIType = 'fixed' | 'floating' | 'hybrid';
export type ROIBenchmark = 'MCLR' | 'EBLR' | 'RLLR' | 'T-REPO' | 'other';

export interface CoreParametersData {
	roi: number | null; // Interest rate %
	roi_type: ROIType | null;
	roi_benchmark: ROIBenchmark | null;
	roi_spread: number | null; // Spread over benchmark
	/** Conditional ROI: different rates for different profiles */
	roi_conditional: ConditionalRule[];

	max_foir: number | null; // Single FOIR cap (0-100)
	foir_is_slab_based: boolean;
	foir_slabs: PolicySlab[]; // Income range → FOIR cap
	/** Conditional FOIR: different caps for employment type, etc. */
	foir_conditional: ConditionalRule[];

	max_tenure_months: number | null;
	max_age_at_maturity: number | null;
	min_loan_amount: number | null;
	max_loan_amount: number | null;

	// Secured loans only
	max_ltv: number | null;
	ltv_is_slab_based: boolean;
	ltv_slabs: PolicySlab[]; // Loan amount range → LTV cap
	/** Conditional LTV: different caps by property type, purchase type, etc. */
	ltv_conditional: ConditionalRule[];
	max_lcr: number | null;

	processing_fee_percent: number | null;
	processing_fee_flat: number | null;
	processing_fee_waiver: string | null; // Conditions text

	/** Special multipliers — double whammy, co-applicant boost, etc. */
	multipliers: SpecialMultiplier[];
	/** Custom entries — anything not covered above */
	custom_entries: CustomEntry[];
}

// ── Step 2: Eligibility ──────────────────────────────────────────

export type ResidencyPolicy = 'indian_only' | 'nri_allowed' | 'nri_with_conditions';
export type ApplicationStructure = 'individual' | 'joint' | 'family';

export interface EligibilityData {
	min_age: number | null;
	max_age: number | null;
	accepted_employment_types: IncomeProfileType[];
	application_structures: ApplicationStructure[];
	residency_policy: ResidencyPolicy | null;
	nri_conditions: string | null;
	min_years_at_address: number | null;
	min_work_experience_years: number | null;
	min_current_employer_tenure_years: number | null;
	/** Conditional eligibility: age varies by employment, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 3: Credit & CIBIL ───────────────────────────────────────

export type CIBILAppliesTo = 'primary_only' | 'all_applicants' | 'highest_score';
export type LowCIBILHandling = 'reject' | 'accept_with_conditions';
export type RepaymentTrack = 'clean_only' | 'minor_allowed' | 'major_allowed';

export interface CreditCibilData {
	min_cibil_score: number | null;
	cibil_applies_to: CIBILAppliesTo | null;
	low_cibil_handling: LowCIBILHandling | null;
	low_cibil_conditions: string | null;
	repayment_track_requirement: RepaymentTrack[];
	/** Conditional CIBIL: score varies by income level, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 4: Income Assessment ────────────────────────────────────

export interface IncomeTypeAssessment {
	profile_type: IncomeProfileType;
	accepted: boolean | null; // null = Don't Know
	haircut_percent: number | null;
	max_contribution_percent: number | null;
	conditions: IncomeCondition[];
	special_notes: string | null;
}

export type IncomeCondition =
	| 'itr_required'
	| 'min_2yr_vintage'
	| 'gst_required'
	| 'bank_account_proof'
	| 'min_profit_margin'
	| 'co_applicant_required'
	| 'audited_financials'
	| 'salary_slip_3months'
	| 'form16_required';

export const INCOME_CONDITIONS: { value: IncomeCondition; label: string }[] = [
	{ value: 'itr_required', label: 'ITR Filing Required' },
	{ value: 'min_2yr_vintage', label: 'Min 2-Year Vintage' },
	{ value: 'gst_required', label: 'GST Registration Required' },
	{ value: 'bank_account_proof', label: 'Bank Account Proof Required' },
	{ value: 'min_profit_margin', label: 'Min Profit Margin' },
	{ value: 'co_applicant_required', label: 'Co-Applicant Income Required' },
	{ value: 'audited_financials', label: 'Audited Financials Required' },
	{ value: 'salary_slip_3months', label: '3-Month Salary Slips Required' },
	{ value: 'form16_required', label: 'Form 16 Required' }
];

export interface IncomeAssessmentData {
	assessments: IncomeTypeAssessment[];
	/** Conditional income rules: haircuts vary by conditions */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 5: Property Rules (Secured Only) ────────────────────────

export type PropertyType =
	| 'flat'
	| 'independent_house'
	| 'villa'
	| 'plot'
	| 'commercial'
	| 'mixed_use';
export type PurchaseType = 'direct_sale' | 'resale';
export type ConstructionStatus = 'ready_to_move' | 'under_construction' | 'plot_construction';
export type ComplianceRequirement = 'fully_compliant_only' | 'authorized_not_per_plan_ok' | 'all';
export type RestrictedZone = 'crz' | 'industrial' | 'agricultural' | 'tribal' | 'forest' | 'other';
export type OcCcRequirement = 'both_required' | 'cc_only_ok' | 'neither_ok';

export interface PropertyRulesData {
	accepted_property_types: PropertyType[];
	accepted_purchase_types: PurchaseType[];
	accepted_construction_status: ConstructionStatus[];
	max_property_age_years: number | null; // null = no limit
	min_property_value: number | null;
	compliance_requirement: ComplianceRequirement | null;
	lease_minimum_years: number | null; // For leasehold
	restricted_zones: RestrictedZone[];
	ltv_by_property_cost_slabs: PolicySlab[];
	ltv_by_property_type: NamedSlab[];
	// LAP-specific
	encumbrance_allowed: boolean | null;
	oc_cc_requirement: OcCcRequirement | null;
	/** Conditional property rules: LTV varies by zone, age, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 6: Obligation Treatment ─────────────────────────────────

export type CreditLineMethod = 'percentage_of_limit' | 'actual_emi' | 'minimum_payment';
export type EMIPaidByOthersTreatment = 'count_full' | 'count_half' | 'ignore';

export interface ObligationsData {
	term_loan_emi_factor: number | null; // 0-100%, default 100
	credit_line_method: CreditLineMethod | null;
	credit_line_factor: number | null; // e.g., 5 (for 5% of limit)
	ignore_if_closing: boolean | null;
	ignore_below_amount: number | null;
	guarantor_factor: number | null; // 0-100%
	emi_paid_by_others: EMIPaidByOthersTreatment | null;
	/** Conditional obligation rules: factor varies by loan type, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 7: BT & Top-up Rules ────────────────────────────────────

export type BTLenderRestriction = 'any' | 'external_only' | 'same_bank_ok';

export interface BTTopupData {
	// BT rules
	bt_min_vintage_months: number | null;
	bt_min_repayment_track: RepaymentTrack | null;
	bt_lender_restriction: BTLenderRestriction | null;
	bt_max_outstanding: number | null;
	bt_max_outstanding_is_percent: boolean; // true = % of property value

	// Top-up rules
	topup_eligibility: 'all_bt' | 'conditions_apply' | null;
	topup_eligibility_conditions: string | null;
	topup_max_amount: number | null;
	topup_max_amount_is_percent: boolean;
	topup_separate_tenure: boolean | null;

	/** Conditional BT/top-up rules: varies by existing lender, vintage, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 8: Fees, Turnaround & Policies ──────────────────────────

export interface FeesPoliciesData {
	// Captured as partial set of 25 PolicyFieldKey values
	fields: Partial<Record<PolicyFieldKey, string | number | boolean | null>>;
	/** Conditional fee rules: processing fee varies by scheme, etc. */
	conditional_rules: ConditionalRule[];
	custom_entries: CustomEntry[];
}

// ── Step 9: Deviations ───────────────────────────────────────────

export type DeviationGateType =
	| 'cibil'
	| 'age'
	| 'income_haircut'
	| 'property'
	| 'employment'
	| 'tenure'
	| 'ltv'
	| 'foir'
	| 'other';

export type ApprovalAuthority =
	| 'branch_manager'
	| 'credit_manager'
	| 'regional_head'
	| 'zonal_head'
	| 'coo';

export const APPROVAL_AUTHORITIES: { value: ApprovalAuthority; label: string }[] = [
	{ value: 'branch_manager', label: 'Branch Manager' },
	{ value: 'credit_manager', label: 'Credit Manager' },
	{ value: 'regional_head', label: 'Regional Head' },
	{ value: 'zonal_head', label: 'Zonal Head' },
	{ value: 'coo', label: 'COO' }
];

export interface DeviationEntry {
	gate_type: DeviationGateType;
	description: string;
	condition_text: string; // e.g., "Accept CIBIL 650 if income > ₹2L"
	// Structured condition fields (depends on gate_type)
	condition_value: number | null; // e.g., 650 for CIBIL relaxation
	condition_threshold: number | null; // e.g., 200000 for income threshold
	approval_authority: ApprovalAuthority | null;
}

export interface DeviationsData {
	entries: DeviationEntry[];
	custom_entries: CustomEntry[];
}

// ── Step 10: Special Conditions ──────────────────────────────────

export interface SpecialConditionsData {
	notes: string | null; // Anything not covered by structured fields
	custom_entries: CustomEntry[];
}

// ============================================================================
// MAIN DOCUMENT
// ============================================================================

export interface PolicyCaptureData {
	core_parameters?: CoreParametersData;
	eligibility?: EligibilityData;
	credit_cibil?: CreditCibilData;
	income_assessment?: IncomeAssessmentData;
	property_rules?: PropertyRulesData;
	obligations?: ObligationsData;
	bt_topup?: BTTopupData;
	fees_policies?: FeesPoliciesData;
	deviations?: DeviationsData;
	special_conditions?: SpecialConditionsData;
}

// ── A.2 — admin-proxy capture provenance ─────────────────────────
/** How a paper-based policy reached the admin (Gap A). */
export type ProxyArrivalChannel = 'whatsapp' | 'email' | 'fax' | 'phone' | 'in_person';

/**
 * Provenance for a policy capture. Absent / `rm_self` for the normal RM
 * self-capture flow. `admin_manual_proxy` when an admin keyed it in on an
 * RM's behalf (Gap A); upgraded to `rm_confirmed` when that RM later reviews
 * and confirms it. Purely a trust/audit overlay — admin-captured policies go
 * through the same review/approval queue as RM-submitted ones.
 */
export interface PolicyCaptureProvenance {
	source_type: 'rm_self' | 'admin_manual_proxy' | 'rm_confirmed';
	/** AdminUsers._id of the admin who captured it (proxy only). */
	captured_by?: string;
	/** rmApplications._id (real or admin-created stub) the policy is for. */
	captured_for_rm?: string;
	arrival_channel?: ProxyArrivalChannel;
	reference_note?: string;
	captured_at?: Date;
	/** Set when the RM confirms an admin-captured policy. */
	confirmed_at?: Date;
	confirmed_by?: string;
}

/**
 * Whether the target RM can confirm this capture (A.2 Slice 3). Only an
 * admin-keyed proxy capture is confirmable — a normal RM self-capture has
 * nothing to confirm, and an already-confirmed one can't be re-confirmed.
 * Status-independent by design: confirmation is a trust overlay, not a step
 * in the review pipeline.
 */
export function canConfirmProxy(provenance: PolicyCaptureProvenance | undefined): boolean {
	return provenance?.source_type === 'admin_manual_proxy';
}

export interface PolicyCapture {
	_id: ObjectId;
	capture_id: string; // "CAP-{timestamp}-{random}"
	rm_id: string;
	rm_name: string;

	/** A.2 — present when admin-captured on behalf of an RM (Gap A). */
	provenance?: PolicyCaptureProvenance;

	// Scope
	lender_id: string;
	lender_name: string;
	classification: LenderClassification;
	product_type: ProductType;
	geo_state?: string;
	geo_city?: string;

	// Bank's named product variants (vanilla + niche)
	product_variants: ProductVariantInfo[];

	// Progress
	status: PolicyCaptureStatus;
	current_step: number; // 0-9
	completed_steps: number[];
	completion_percent: number;

	// Structured data
	data: PolicyCaptureData;

	// "Don't Know" tracking
	unknown_fields: string[];

	// Evidence
	document_ids: string[];
	admin_notes?: string;

	// Links
	resulting_submission_id?: string;
	resulting_version_id?: ObjectId;

	created_at: Date;
	updated_at: Date;
}

// ============================================================================
// STEP DEFINITIONS (for wizard navigation)
// ============================================================================

export interface PolicyCaptureStep {
	id: string;
	label: string;
	shortLabel: string;
	dataKey: keyof PolicyCaptureData;
	/** Which product types show this step (empty = all) */
	showFor: ProductType[] | 'all';
}

/** Loan categories for step visibility */
const SECURED: ProductType[] = [
	'HL_NEW',
	'HL_BT',
	'HL_TOPUP',
	'HL_BT_TOPUP',
	'LAP_NEW',
	'LAP_BT',
	'PLOT_CONST',
	'BL_SECURED'
];
const BT_TOPUP: ProductType[] = ['HL_BT', 'HL_TOPUP', 'HL_BT_TOPUP', 'LAP_BT'];

export const POLICY_CAPTURE_STEPS: PolicyCaptureStep[] = [
	{
		id: 'core_parameters',
		label: 'Core Parameters',
		shortLabel: 'Core',
		dataKey: 'core_parameters',
		showFor: 'all'
	},
	{
		id: 'eligibility',
		label: 'Eligibility',
		shortLabel: 'Eligibility',
		dataKey: 'eligibility',
		showFor: 'all'
	},
	{
		id: 'credit_cibil',
		label: 'Credit & CIBIL',
		shortLabel: 'CIBIL',
		dataKey: 'credit_cibil',
		showFor: 'all'
	},
	{
		id: 'income_assessment',
		label: 'Income Assessment',
		shortLabel: 'Income',
		dataKey: 'income_assessment',
		showFor: 'all'
	},
	{
		id: 'property_rules',
		label: 'Property Rules',
		shortLabel: 'Property',
		dataKey: 'property_rules',
		showFor: SECURED
	},
	{
		id: 'obligations',
		label: 'Obligations',
		shortLabel: 'Obligations',
		dataKey: 'obligations',
		showFor: 'all'
	},
	{
		id: 'bt_topup',
		label: 'BT & Top-up',
		shortLabel: 'BT/Top-up',
		dataKey: 'bt_topup',
		showFor: BT_TOPUP
	},
	{
		id: 'fees_policies',
		label: 'Fees & Policies',
		shortLabel: 'Fees',
		dataKey: 'fees_policies',
		showFor: 'all'
	},
	{
		id: 'deviations',
		label: 'Deviations',
		shortLabel: 'Deviations',
		dataKey: 'deviations',
		showFor: 'all'
	},
	{
		id: 'special_conditions',
		label: 'Review & Submit',
		shortLabel: 'Review',
		dataKey: 'special_conditions',
		showFor: 'all'
	}
];

/**
 * Get visible steps for a product type
 */
export function getVisibleSteps(productType: ProductType): PolicyCaptureStep[] {
	return POLICY_CAPTURE_STEPS.filter(
		(step) => step.showFor === 'all' || step.showFor.includes(productType)
	);
}

// ============================================================================
// DEFAULT DATA FACTORIES
// ============================================================================

export function createDefaultCoreParameters(): CoreParametersData {
	return {
		roi: null,
		roi_type: null,
		roi_benchmark: null,
		roi_spread: null,
		roi_conditional: [],
		max_foir: null,
		foir_is_slab_based: false,
		foir_slabs: [],
		foir_conditional: [],
		max_tenure_months: null,
		max_age_at_maturity: null,
		min_loan_amount: null,
		max_loan_amount: null,
		max_ltv: null,
		ltv_is_slab_based: false,
		ltv_slabs: [],
		ltv_conditional: [],
		max_lcr: null,
		processing_fee_percent: null,
		processing_fee_flat: null,
		processing_fee_waiver: null,
		multipliers: [],
		custom_entries: []
	};
}

export function createDefaultEligibility(): EligibilityData {
	return {
		min_age: null,
		max_age: null,
		accepted_employment_types: [],
		application_structures: [],
		residency_policy: null,
		nri_conditions: null,
		min_years_at_address: null,
		min_work_experience_years: null,
		min_current_employer_tenure_years: null,
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultCreditCibil(): CreditCibilData {
	return {
		min_cibil_score: null,
		cibil_applies_to: null,
		low_cibil_handling: null,
		low_cibil_conditions: null,
		repayment_track_requirement: [],
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultIncomeAssessment(): IncomeAssessmentData {
	return {
		assessments: [],
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultPropertyRules(): PropertyRulesData {
	return {
		accepted_property_types: [],
		accepted_purchase_types: [],
		accepted_construction_status: [],
		max_property_age_years: null,
		min_property_value: null,
		compliance_requirement: null,
		lease_minimum_years: null,
		restricted_zones: [],
		ltv_by_property_cost_slabs: [],
		ltv_by_property_type: [],
		encumbrance_allowed: null,
		oc_cc_requirement: null,
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultObligations(): ObligationsData {
	return {
		term_loan_emi_factor: null,
		credit_line_method: null,
		credit_line_factor: null,
		ignore_if_closing: null,
		ignore_below_amount: null,
		guarantor_factor: null,
		emi_paid_by_others: null,
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultBTTopup(): BTTopupData {
	return {
		bt_min_vintage_months: null,
		bt_min_repayment_track: null,
		bt_lender_restriction: null,
		bt_max_outstanding: null,
		bt_max_outstanding_is_percent: false,
		topup_eligibility: null,
		topup_eligibility_conditions: null,
		topup_max_amount: null,
		topup_max_amount_is_percent: false,
		topup_separate_tenure: null,
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultFeesPolicies(): FeesPoliciesData {
	return {
		fields: {},
		conditional_rules: [],
		custom_entries: []
	};
}

export function createDefaultDeviations(): DeviationsData {
	return {
		entries: [],
		custom_entries: []
	};
}

export function createDefaultSpecialConditions(): SpecialConditionsData {
	return {
		notes: null,
		custom_entries: []
	};
}

/** Create a complete empty PolicyCaptureData */
export function createDefaultPolicyCaptureData(): PolicyCaptureData {
	return {
		core_parameters: createDefaultCoreParameters(),
		eligibility: createDefaultEligibility(),
		credit_cibil: createDefaultCreditCibil(),
		income_assessment: createDefaultIncomeAssessment(),
		property_rules: createDefaultPropertyRules(),
		obligations: createDefaultObligations(),
		bt_topup: createDefaultBTTopup(),
		fees_policies: createDefaultFeesPolicies(),
		deviations: createDefaultDeviations(),
		special_conditions: createDefaultSpecialConditions()
	};
}
