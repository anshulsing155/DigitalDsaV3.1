// ============================================================================
// RE-3: System Configuration — Single source of truth for Rule Engine constants
// ============================================================================
// Previously 47+ magic numbers scattered across evaluationEngine.ts,
// incomeAssessor.ts, resultBuilder.ts, payloadEnricher.ts.
// Now centralized, typed, and documented.
// ============================================================================

// ============================================================================
// 1. PARAMETER VALIDATION — Which params must come from rule docs
// ============================================================================

/** Parameters that MUST exist in rule docs. If missing → GREY the lender. */
export const REQUIRED_PARAMS = [
	'roi',
	'max_foir',
	'max_tenure_months',
	'max_age_at_maturity'
] as const;

/** Additional params required for secured loans (Home Loan, LAP, Plot). */
export const REQUIRED_PARAMS_SECURED = ['max_ltv'] as const;

// ============================================================================
// 2. RATING ALGORITHM — Weights for overall lender rating
// ============================================================================

/** Weighted average weights for computing overall MetricRating.
 *  Keys must match metric names in assignRatings(). */
export const RATING_WEIGHTS = {
	amount: 0.4,
	roi: 0.3,
	emi: 0.2,
	tenure: 0.1
} as const;

/** Percentile → MetricRating thresholds (higher percentile = better).
 *  Index 0 = excellent boundary, 1 = good, 2 = average. Below 2 = poor. */
export const RATING_PERCENTILE_THRESHOLDS = {
	excellent: 0.75,
	good: 0.5,
	average: 0.25
} as const;

/** Numeric score → MetricRating reverse mapping thresholds. */
export const RATING_NUMERIC_THRESHOLDS = {
	excellent: 3.5,
	good: 2.5,
	average: 1.5
} as const;

// ============================================================================
// 3. APPROVAL PROBABILITY MODEL
// ============================================================================

/** Base probability by traffic light classification. */
export const PROBABILITY_BASE = {
	green: 0.88,
	amber: 0.55,
	red: 0.05,
	grey: 0
} as const;

/** FOIR proximity penalties — applied when FOIR ratio approaches the cap. */
export const FOIR_PROXIMITY_PENALTIES = {
	/** FOIR ratio ≥ this → apply severe penalty */
	severe_threshold: 0.9,
	severe_penalty: 0.08,
	/** FOIR ratio ≥ this → apply moderate penalty */
	moderate_threshold: 0.8,
	moderate_penalty: 0.04
} as const;

/** Penalty applied when CIBIL gate fails. */
export const CIBIL_FAILURE_PENALTY = 0.1;

// ============================================================================
// 4. ENRICHER DEFAULTS — Used ONLY for _computed fields, not authoritative
// ============================================================================

/**
 * Default credit line factor used in payloadEnricher for _computed._total_obligations_monthly.
 * This is an ESTIMATE for JSON-Logic pre-checks only.
 * The authoritative obligation computation uses lender-specific rules in incomeAssessor.ts.
 */
export const ENRICHER_CREDIT_LINE_FACTOR = 0.05;

/**
 * When no matching obligation rule exists, count obligation EMI at 100% (conservative).
 * This is safer than undercounting — prevents overestimating eligibility.
 */
export const FALLBACK_OBLIGATION_COUNT_FACTOR = 1.0;

// ============================================================================
// 4b. FACILITY TYPE CONFIGURATION — Per-facility defaults
// ============================================================================

/**
 * How each unsecured facility type is treated in FOIR and EMI calculations.
 * Per-lender overrides come from ParsedObligationRule in the rule documents.
 * These are conservative industry-standard defaults.
 *
 * Facility types (from the form's facilityType field):
 *   - "Term Loan"                 → standard EMI-based FOIR
 *   - "Overdraft (OD)"            → revolving, % of limit in FOIR, no fixed EMI
 *   - "Drop-line OverDraft (DOD)" → reducing limit, declining balance installments
 *   - "Cash Credit (CC)"          → revolving, % of limit in FOIR, no fixed EMI
 */
export interface FacilityTypeConfig {
	/** How to compute FOIR burden for this facility */
	foirMethod: 'emi_based' | 'percentage_of_limit' | 'declining_balance';
	/** Default FOIR factor: for percentage_of_limit, this is % of sanctioned limit */
	defaultFoirFactor: number;
	/** Whether the facility has a fixed EMI schedule */
	hasFixedEmi: boolean;
	/** Default max tenure in months — OD/CC typically 12 months (annual renewal) */
	defaultMaxTenureMonths: number;
	/** Human-readable label for display */
	label: string;
}

export const FACILITY_TYPE_CONFIG: Record<string, FacilityTypeConfig> = {
	'Term Loan': {
		foirMethod: 'emi_based',
		defaultFoirFactor: 0, // Not used — standard EMI formula applies
		hasFixedEmi: true,
		defaultMaxTenureMonths: 84, // 7 years for unsecured term loans
		label: 'Term Loan'
	},
	'Overdraft (OD)': {
		foirMethod: 'percentage_of_limit',
		defaultFoirFactor: 0.05, // 5% of sanctioned limit
		hasFixedEmi: false,
		defaultMaxTenureMonths: 12, // Annual renewal
		label: 'Overdraft'
	},
	'Drop-line OverDraft (DOD)': {
		foirMethod: 'declining_balance',
		defaultFoirFactor: 0.05, // 5% of sanctioned limit as proxy
		hasFixedEmi: false,
		defaultMaxTenureMonths: 60, // 5-year drop-line period
		label: 'Drop-line Overdraft'
	},
	'Cash Credit (CC)': {
		foirMethod: 'percentage_of_limit',
		defaultFoirFactor: 0.05, // 5% of sanctioned limit
		hasFixedEmi: false,
		defaultMaxTenureMonths: 12, // Annual renewal
		label: 'Cash Credit'
	},
	// Flexi Drop-line Overdraft: a dropline OD whose limit stays FIXED for the
	// first 24 months (interest-only on the utilised amount), then converts to a
	// dropline for the remaining tenure. Personal Loan only (P8). For FOIR the
	// near-term burden is interest-only, so the engine overrides defaultFoirFactor
	// with the actual monthly interest rate (see evaluationEngine effectiveCreditLineFactor).
	'Flexi Drop-line OverDraft (Flexi DOD)': {
		foirMethod: 'percentage_of_limit',
		defaultFoirFactor: 0.05, // fallback only — engine uses the monthly rate for Flexi DOD
		hasFixedEmi: false,
		defaultMaxTenureMonths: 84, // 2-year interest-only window + ~5-year dropline
		label: 'Flexi Drop-line Overdraft'
	}
};

/**
 * Check if a facility type is a revolving credit line (no fixed EMI).
 * Term Loans and DOD both have repayment schedules; OD/CC are purely revolving.
 */
export function isRevolvingFacility(facilityType: string): boolean {
	return FACILITY_TYPE_CONFIG[facilityType]?.hasFixedEmi === false;
}

/**
 * Get the facility config for a given facility type.
 * Returns Term Loan config as safe default for unknown types.
 */
export function getFacilityConfig(facilityType: string): FacilityTypeConfig {
	return FACILITY_TYPE_CONFIG[facilityType] ?? FACILITY_TYPE_CONFIG['Term Loan'];
}

// ============================================================================
// 5. EMI CALCULATOR BOUNDS
// ============================================================================

/** Minimum effective tenure enforced by the EMI calculator. */
export const MIN_TENURE_MONTHS = 12;

// ============================================================================
// 6. LOAN TYPE CONFIGURATION
// ============================================================================

export interface LoanTypeConfig {
	/** Whether this loan is secured against property */
	secured: boolean;
	/** Whether LTV computation applies */
	has_property: boolean;
	/** Human-readable display name */
	display_name: string;
	/**
	 * Minimum loan amount lenders practically book for this product (₹).
	 * If income/property only support an offer BELOW this, it's not a real
	 * offer — the engine flags it RED instead of surfacing a tiny, unbookable
	 * amount. Owner-set per loan type (2026-05-22).
	 */
	min_loan_amount: number;
}

/** Registry of all supported loan types. Adding a new type = add one entry. */
export const LOAN_TYPE_CONFIG: Record<string, LoanTypeConfig> = {
	'Home Loan': { secured: true, has_property: true, display_name: 'Home Loan', min_loan_amount: 1_000_000 },
	'Loan Against Property': {
		secured: true,
		has_property: true,
		display_name: 'Loan Against Property',
		min_loan_amount: 1_000_000
	},
	'Plot and Construction Loan': {
		secured: true,
		has_property: true,
		display_name: 'Plot & Construction',
		min_loan_amount: 1_000_000
	},
	'Personal Loan': { secured: false, has_property: false, display_name: 'Personal Loan', min_loan_amount: 200_000 },
	'Business Loan': { secured: false, has_property: false, display_name: 'Business Loan', min_loan_amount: 500_000 },
	'Professional Loan': { secured: false, has_property: false, display_name: 'Professional Loan', min_loan_amount: 500_000 }
};

/**
 * Form-facing loan-name → engine-canonical loan-name aliases.
 *
 * The form-side uses the short label `'Plot Loan'` (set in `commonPage.json`
 * loan picker + `plot-loan/+page.svelte`); the engine-side `LOAN_TYPE_CONFIG`
 * keys + bank policy `loan_types` arrays + RERA gate use the longer
 * `'Plot and Construction Loan'`. Without normalization,
 * `isSecuredLoan('Plot Loan')` returns `false`, the engine treats every
 * Plot Loan evaluation as unsecured (skips LTV), and rule-doc lookups by
 * `loan_types: 'Plot Loan'` find zero matches in production PMS docs that
 * store the longer name. Surfaced by 2026-05-28 audit batch.
 *
 * Defense-in-depth: the 3 lookup functions below pipe through
 * `canonicalLoanName()`, AND `evaluatePayload()` mutates the payload's
 * loanName to the canonical form at engine entry so downstream code paths
 * (rule-doc filter, `evaluateLender`'s own `ruleDoc.loan_types.includes`
 * check at line ~619) see the canonical name without each needing its own
 * alias logic.
 */
const LOAN_NAME_ALIASES: Record<string, string> = {
	'Plot Loan': 'Plot and Construction Loan'
};

/**
 * Map a form-facing loan name to its engine-canonical form (or pass through
 * if no alias applies). Idempotent — calling on an already-canonical name
 * returns the name unchanged.
 */
export function canonicalLoanName(loanName: string): string {
	return LOAN_NAME_ALIASES[loanName] ?? loanName;
}

/** Check if a loan type is secured. Defaults to false for unknown types. */
export function isSecuredLoan(loanName: string): boolean {
	return LOAN_TYPE_CONFIG[canonicalLoanName(loanName)]?.secured ?? false;
}

/**
 * Minimum bookable loan amount (₹) for a loan type. Returns 0 for unknown
 * types so the floor is a no-op rather than a false RED.
 */
export function getMinimumLoanAmount(loanName: string): number {
	return LOAN_TYPE_CONFIG[canonicalLoanName(loanName)]?.min_loan_amount ?? 0;
}

/** Check if a loan type has property (LTV applies). */
export function hasPropertyComponent(loanName: string): boolean {
	return LOAN_TYPE_CONFIG[canonicalLoanName(loanName)]?.has_property ?? false;
}

// NOTE: INCOME_EXTRACTORS registry was removed (dead code — never imported).
// Income extraction is handled by extractGrossMonthlyIncome() in incomeAssessor.ts
// and the V2 assessor in incomeAssessorV2.ts.
