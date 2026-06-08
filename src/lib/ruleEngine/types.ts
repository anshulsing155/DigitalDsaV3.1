// RE-2: Evaluation Engine — Internal Pipeline Types
// These types are used within the evaluation pipeline only.
// External consumers use LenderResultsData from src/lib/types/lenderResults.ts.

import type { LenderClassification } from '$lib/types/policyEngine';
import type { AffordabilityResult, BridgeResult } from './affordabilityCalculator.js';
import type { PlAssignmentResult } from './plApplicantSelector.js';

// ============================================================================
// PARSED RULE SHAPES (typed version of json_logic field contents)
// ============================================================================

/** A single rule from any section of the LenderRuleDocument */
export interface ParsedRule {
	rule_id: string;
	description: string;
	tier: 'hard_gate' | 'computed' | 'parameter';
	logic: Record<string, unknown>;
	fail_message?: string;
	fail_category?: string;
	compute_output?: string;
	parameter_key?: string;
	parameter_value?: unknown;
	applies_when?: Record<string, unknown> | null;
	confidence: number;
	source_excerpt: string;
}

/** Income assessment rule (special structure per spec Section 5) */
export interface ParsedIncomeRule {
	rule_id: string;
	income_profile_type: string;
	accepted: boolean;
	haircut_percent: number;
	conditions?: Record<string, unknown>;
	max_contribution_percent?: number;
	computation_method: string;
	/** JSON-Logic expression returning assessed amount — overrides haircut_percent when present */
	assessment_logic?: Record<string, unknown>;
	confidence: number;
	source_excerpt: string;
}

/** Obligation treatment rule (special structure per spec Section 5) */
export interface ParsedObligationRule {
	rule_id: string;
	obligation_type: 'term_loan' | 'credit_line';
	loan_type_filter?: string;
	treatment: {
		count_factor: number;
		ignore_if_closing: boolean;
		credit_line_method?: 'percentage_of_limit' | 'actual_emi' | 'minimum_payment';
		credit_line_factor?: number;
		ignore_below_amount?: number;
		guarantor_factor?: number;
	};
	confidence: number;
	source_excerpt: string;
}

/** Deviation rule */
export interface ParsedDeviation {
	deviation_id: string;
	description: string;
	deviates_from: string;
	condition: Record<string, unknown>;
	approval_authority: string;
	max_deviation: string;
	probability_modifier: number;
	confidence: number;
	source_excerpt: string;
}

/** Policy display object */
export interface ParsedPolicy {
	policy_key: string;
	label: string;
	value: string | number | boolean | string[];
	display_on_offer_card: boolean;
	category: string;
}

/** Complete parsed rule document (typed version of RuleArtifactPair.json_logic) */
export interface ParsedLenderRuleDocument {
	lender_id: string;
	lender_name: string;
	classification: LenderClassification;
	loan_types: string[];

	sections: {
		eligibility: ParsedRule[] | null;
		cibil: ParsedRule[] | null;
		foir: ParsedRule[] | null;
		income_assessment: ParsedIncomeRule[] | null;
		ltv: ParsedRule[] | null;
		obligation_treatment: ParsedObligationRule[] | null;
		property: ParsedRule[] | null;
		transaction: ParsedRule[] | null;
		tenure: ParsedRule[] | null;
		roi: ParsedRule[] | null;
		fees: ParsedRule[] | null;
		disbursement: ParsedRule[] | null;
		documentation: ParsedRule[] | null;
		nri: ParsedRule[] | null;
		company: ParsedRule[] | null;
		balance_transfer: ParsedRule[] | null;
		top_up: ParsedRule[] | null;
	};

	deviations: ParsedDeviation[] | null;
	policies: ParsedPolicy[] | null;

	/** Income calculation strategy: sum first then calculate, or per-source calculate then sum */
	calculation_strategy?: 'sum_then_calculate' | 'calculate_then_sum';
	/** Rules evaluated against enriched payload to classify the case profile */
	case_profile_rules?: ParsedRule[];

	/** Which applicants' CIBIL scores to check: 'financial_only' | 'all_including_guarantors' | 'all_co_applicants' (default) */
	cibilScope?: string;
	/** Minimum acceptable CIBIL score — synthetic hard gate enforced by the evaluation engine */
	cibil_floor?: number;

	/**
	 * Guarantor acceptance policy (per `GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md`).
	 * `min_emi_capacity_percent` is the minimum % of the proposed EMI the guarantor
	 * must independently service (after their own existing obligations).
	 *   - `80` is the HFC default, applied when this field is absent
	 *   - `100` typical for PSU banks
	 *   - `70` typical for fintech-NBFCs
	 *   - `null` means this lender does not accept guarantors at all — any case
	 *     with a guarantor will fail the guarantor-acceptance check at this lender
	 */
	guarantor_acceptance?: {
		min_emi_capacity_percent: number | null;
	};
}

// ============================================================================
// INTERMEDIATE EVALUATION RESULTS
// ============================================================================

/** Result of evaluating a single hard_gate rule */
export interface GateResult {
	rule_id: string;
	section: string;
	passed: boolean;
	fail_message?: string;
	fail_category?: string;
	description: string;
}

/** Result of a single income source assessment */
export interface AssessedIncomeSource {
	applicant_index: number;
	profile_type: string;
	gross_amount: number;
	haircut_percent: number;
	assessed_amount: number;
	capped_at?: number;
	final_amount: number;
	rule_id?: string;
}

/** Per-obligation breakdown */
export interface ObligationDetail {
	applicant_index: number;
	obligation_index: number;
	type: 'term_loan' | 'credit_line';
	/** Specific facility type (e.g. "OD Limit", "CC Limit", "Dropline OD") */
	loan_type?: string;
	original_amount: number;
	counted_amount: number;
	treatment_applied: string;
	loan_capacity?: string;
	ownership_split?: number;
}

/** A matched deviation that changes RED to AMBER */
export interface AppliedDeviation {
	deviation_id: string;
	deviates_from: string;
	description: string;
	probability_modifier: number;
	approval_authority: string;
}

/** Complete intermediate evaluation state for one lender */
export interface LenderEvaluation {
	lender_id: string;
	lender_name: string;
	classification: LenderClassification;

	gate_results: GateResult[];
	all_gates_passed: boolean;
	failed_gate_ids: string[];

	assessed_income: number;
	income_sources: AssessedIncomeSource[];
	obligation_load_monthly: number;
	obligation_details: ObligationDetail[];

	foir: number;
	max_foir: number;
	foir_eligible_amount: number;

	ltv?: number;
	max_ltv?: number;
	ltv_capped_amount?: number;

	max_lcr?: number;
	lcr_capped_amount?: number;
	/** true when max_lcr was not in the rule doc and a failsafe (90%) was used */
	lcr_is_failsafe?: boolean;
	/** Advance already paid to seller — deducted from LCR disbursement */
	advance_in_agreement?: number;

	// ── Plot & Equity Loan 3-cap structure (LEND-1 Phase 2, ADR-0021) ──────
	// Populated ONLY when loanVariant === 'Plot & Equity Loan' AND the lender's
	// rule doc supplies the three caps (plot_equity_overall_sanction_ltv,
	// plot_equity_seller_disbursement_cap, plot_equity_lap_on_plot_cap).
	// Otherwise undefined — engine falls back to generic LTV/LCR. See spec §2.
	/** X% × marketValue — overall lender commitment */
	plot_equity_sanction_headline?: number;
	/** min(Y% × registryValue, sanction) — seller's plot loan disbursement */
	plot_equity_seller_disbursement?: number;
	/** min(Z% × marketValue, sanction − seller) — buyer's LAP-component cash */
	plot_equity_buyer_cash_component?: number;
	/** (registry − seller) + (market − registry) − buyer cash — DSA's headline */
	plot_equity_buyer_net_out_of_pocket?: number;
	/** Lender's appraised market value used in the 3-cap math (UI sub-note input). */
	plot_equity_market_value?: number;
	/** Registered / ATS value used in the 3-cap math (UI sub-note input). */
	plot_equity_registry_value?: number;

	roi: number;
	tenure_months: number;
	processing_fee_percent?: number;

	eligible_amount: number;
	offered_amount: number;
	emi: number;

	deviations_applied: AppliedDeviation[];

	traffic_light: 'green' | 'amber' | 'red' | 'grey';
	traffic_light_message: string;
	approval_probability: number;

	policies: ParsedPolicy[];

	/** True when the loan being applied for is a credit line (OD/CC/DOD) */
	is_credit_line?: boolean;
	/** The FOIR factor used for credit line (typically 0.05) */
	credit_line_factor?: number;
	/** Specific facility type: "Term Loan" | "Overdraft (OD)" | "Drop-line OverDraft (DOD)" | "Cash Credit (CC)" */
	facility_type?: string;

	/** RE-7: Affordability back-calculation (secured loans with propertyIdentified = false) */
	affordability?: {
		eligibility: AffordabilityResult | null;
		dpConstrained: AffordabilityResult | null;
		bridge: BridgeResult | null;
	};

	/** Per-applicant PL assignment — which applicant should get the bridge PL */
	plAssignment?: PlAssignmentResult;

	/**
	 * Guarantor eligibility assessment (per `GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md`).
	 * Set ONLY when the case has a guarantor (an applicant classified as
	 * `guarantor_financial` or `guarantor_non_financial`). Undefined otherwise.
	 * The result UI hides the guarantor row entirely when this field is absent.
	 */
	guarantor?: GuarantorAssessment;
}

/**
 * Per-lender guarantor eligibility assessment.
 *
 * Locked decisions (`GUARANTOR-ELIGIBILITY-ASSESSMENT-SPEC.md`):
 *   - At most ONE guarantor per case (enforced by `singleGuarantorRule.test.ts`)
 *   - Default threshold 80% when the lender hasn't set `guarantor_acceptance`
 *   - Two states only — accepted or rejected (no Marginal)
 *   - When rejected, traffic-light demotes GREEN → AMBER
 */
export interface GuarantorAssessment {
	/** Index of the guarantor in the payload's applicants array */
	applicant_index: number;
	/** Display name of the guarantor (for the result row label) */
	name: string;
	/** Guarantor's independently-serviceable EMI as % of the proposed EMI */
	capacity_percent: number;
	/** Lender's threshold (lender value, or 80 default) */
	required_percent: number;
	/** Final pass/fail */
	accepted_by_lender: boolean;
	/**
	 * When `accepted_by_lender` is false, identifies which gate failed:
	 *   - `'capacity'`     → guarantor's FOIR headroom below required %
	 *   - `'age_at_maturity'` → guarantor would exceed lender's max age at maturity
	 *   - `'not_accepted'` → lender's `guarantor_acceptance.min_emi_capacity_percent`
	 *                       is `null` (lender does not accept guarantors at all)
	 */
	failure_reason?: 'capacity' | 'age_at_maturity' | 'not_accepted';
}

// ============================================================================
// SECTION CLASSIFICATION
// ============================================================================

/** Sections evaluated as hard gates */
export const HARD_GATE_SECTIONS = [
	'eligibility',
	'cibil',
	'property',
	'transaction',
	'documentation',
	'nri',
	'company'
] as const;

/** Sections that may contain parameter-tier rules */
export const PARAMETER_SECTIONS = ['tenure', 'roi', 'fees', 'ltv', 'foir'] as const;

/** Loan types that require LTV computation. Includes both the form-facing
 * 'Plot Loan' alias and the engine-canonical 'Plot and Construction Loan' —
 * normalization happens at engine entry (see canonicalLoanName), but consumers
 * of this union (combination generator, etc.) need both labels to match
 * whichever label flows through their code path. */
export const SECURED_LOAN_TYPES = [
	'Home Loan',
	'Loan Against Property',
	'Plot Loan',
	'Plot and Construction Loan'
] as const;

/** Section name to factor category mapping */
export const SECTION_TO_CATEGORY: Record<
	string,
	'income' | 'credit' | 'property' | 'obligation' | 'profile' | 'policy'
> = {
	eligibility: 'profile',
	cibil: 'credit',
	foir: 'obligation',
	income_assessment: 'income',
	ltv: 'property',
	obligation_treatment: 'obligation',
	property: 'property',
	transaction: 'property',
	tenure: 'policy',
	roi: 'policy',
	fees: 'policy',
	disbursement: 'policy',
	documentation: 'policy',
	nri: 'profile',
	company: 'profile',
	balance_transfer: 'policy',
	top_up: 'policy'
};
