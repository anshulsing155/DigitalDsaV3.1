/**
 * Static Eligibility Engine -- Client-side loan eligibility calculation.
 *
 * Uses simplified, hardcoded rules for the public calculator version.
 * The dashboard version will use the full rule engine via API, which
 * has per-lender policies, multi-applicant income, and deviation logic.
 *
 * This engine covers the 80% case: single applicant, standard products,
 * no deviations. Good enough for lead-gen and quick DSA conversations.
 */
import {
	calculateEMI,
	calculateFoirEligibleAmount,
	calculateLtvCappedAmount,
	calculateOfferedAmount,
	determineEffectiveTenure
} from '$lib/ruleEngine/emiCalculator.js';

// ============================================================================
// CREDIT SCORE TIERS
// ============================================================================

/**
 * Simplified credit score tiers and corresponding interest rate ranges.
 * In production, rates come from per-lender rule documents.
 * Here we use the midpoint of each range for estimation.
 */
const CREDIT_SCORE_RATE_MAP: Record<string, { minRate: number; maxRate: number }> = {
	'750+': { minRate: 8.25, maxRate: 9.0 },
	'700-749': { minRate: 8.75, maxRate: 9.75 },
	'650-699': { minRate: 9.5, maxRate: 10.75 },
	'600-649': { minRate: 10.5, maxRate: 12.0 },
	'Below 600': { minRate: 12.0, maxRate: 15.0 },
	'No Score': { minRate: 11.0, maxRate: 14.0 }
};

/** All available credit score tier labels for UI dropdowns */
export const CREDIT_SCORE_OPTIONS = Object.keys(CREDIT_SCORE_RATE_MAP);

// ============================================================================
// FOIR LIMITS
// ============================================================================

/**
 * Get the FOIR (Fixed Obligation to Income Ratio) limit by income bracket.
 *
 * Higher incomes get more generous FOIR because discretionary spending
 * is a larger share -- missing an EMI is less likely.
 *
 * @param monthlyIncome - Gross monthly income in INR
 * @returns FOIR as a decimal (e.g. 0.55 for 55%)
 */
function getFoirLimit(monthlyIncome: number): number {
	if (monthlyIncome >= 100_000) return 0.65;
	if (monthlyIncome >= 50_000) return 0.55;
	return 0.5;
}

// ============================================================================
// LTV LIMITS
// ============================================================================

/**
 * Get maximum LTV percentage based on loan type and property value.
 *
 * RBI mandates lower LTV for higher-value properties to limit systemic risk.
 * Personal loans have no collateral, so LTV is not applicable.
 *
 * @param loanType - The loan product type
 * @param propertyValue - Property/collateral value in INR
 * @returns LTV as a whole number percentage (e.g. 80 for 80%)
 */
function getLtvPercent(loanType: string, propertyValue: number): number {
	if (loanType === 'Personal Loan' || loanType === 'Business Loan') return 0;
	if (propertyValue <= 3_000_000) return 90;
	if (propertyValue <= 7_500_000) return 80;
	return 75;
}

/**
 * Get the maximum age at maturity based on occupation type.
 *
 * Government employees can serve until 65, private sector typically retires
 * at 60, and self-employed/business owners can work until 70.
 *
 * @param occupation - Occupation category
 * @returns Maximum age at loan maturity
 */
function getMaxAgeAtMaturity(occupation: string): number {
	if (occupation === 'Government') return 65;
	if (occupation === 'Business') return 70;
	return 60; // Private sector default
}

/** Default lender maximum tenure: 30 years = 360 months */
const LENDER_MAX_TENURE_MONTHS = 360;

// ============================================================================
// TYPES
// ============================================================================

export interface EligibilityInputs {
	/** Loan product type */
	loanType: string;
	/** Gross monthly income in INR */
	monthlyIncome: number;
	/** Total existing EMI obligations per month */
	existingEmiAmount: number;
	/** Credit score tier label (e.g. '750+', '700-749') */
	creditScoreTier: string;
	/** Applicant's current age in years */
	applicantAge: number;
	/** Occupation category */
	occupation: string;
	/** Property/collateral value -- only for secured loans */
	propertyValue?: number;
	/** Requested loan amount */
	requestedAmount?: number;
	/** Requested tenure in years */
	requestedTenureYears?: number;
}

export interface EligibilityResult {
	/** The final maximum eligible loan amount */
	maxEligibleAmount: number;
	/** Estimated monthly EMI on the eligible amount */
	estimatedEmi: number;
	/** Interest rate used for calculation (midpoint of tier range) */
	estimatedRate: number;
	/** Effective tenure in months (age-limited, capped) */
	effectiveTenureMonths: number;
	/** Maximum loan from FOIR constraint alone */
	foirEligibleAmount: number;
	/** Maximum loan from LTV constraint (null for unsecured) */
	ltvCappedAmount: number | null;
	/** FOIR percentage used */
	maxFoir: number;
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Calculate loan eligibility using simplified static rules.
 *
 * Steps:
 * 1. Determine interest rate from credit score tier (use midpoint)
 * 2. Determine FOIR limit from income bracket
 * 3. Determine max age at maturity from occupation
 * 4. Calculate effective tenure (age-limited)
 * 5. Calculate FOIR-eligible amount (max loan from income)
 * 6. For secured loans: calculate LTV-capped amount
 * 7. Final amount = min(requested, FOIR, LTV)
 * 8. Calculate EMI on the final amount
 *
 * @param inputs - All user-provided eligibility parameters
 * @returns Complete eligibility result with all intermediate values
 */
export function calculateEligibility(inputs: EligibilityInputs): EligibilityResult {
	const {
		loanType,
		monthlyIncome,
		existingEmiAmount,
		creditScoreTier,
		applicantAge,
		occupation,
		propertyValue = 0,
		requestedAmount = 100_000_000, // Default to a high cap so FOIR/LTV are the binding constraints
		requestedTenureYears = 20
	} = inputs;

	// Step 1: Interest rate from credit score tier (use midpoint for estimation)
	const tierRates = CREDIT_SCORE_RATE_MAP[creditScoreTier] ?? CREDIT_SCORE_RATE_MAP['700-749'];
	const estimatedRate = (tierRates.minRate + tierRates.maxRate) / 2;

	// Step 2: FOIR limit from income bracket
	const maxFoir = getFoirLimit(monthlyIncome);

	// Step 3: Max age at maturity from occupation
	const maxAgeAtMaturity = getMaxAgeAtMaturity(occupation);

	// Step 4: Effective tenure (respects age limit and lender max)
	const effectiveTenureMonths = determineEffectiveTenure(
		requestedTenureYears,
		applicantAge,
		maxAgeAtMaturity,
		LENDER_MAX_TENURE_MONTHS
	);

	// Step 5: FOIR-eligible amount (max loan supportable by income)
	const foirEligibleAmount = calculateFoirEligibleAmount(
		monthlyIncome,
		maxFoir,
		existingEmiAmount,
		estimatedRate,
		effectiveTenureMonths
	);

	// Step 6: LTV-capped amount (only for secured loans with collateral)
	const isSecured = loanType === 'Home Loan' || loanType === 'Loan Against Property';
	let ltvCappedAmount: number | null = null;

	if (isSecured && propertyValue > 0) {
		const ltvPercent = getLtvPercent(loanType, propertyValue);
		ltvCappedAmount = calculateLtvCappedAmount(ltvPercent, propertyValue);
	}

	// Step 7: Final offered amount = min(requested, FOIR, LTV if applicable)
	const maxEligibleAmount = calculateOfferedAmount(
		requestedAmount,
		foirEligibleAmount,
		ltvCappedAmount !== null ? ltvCappedAmount : undefined
	);

	// Step 8: EMI on the final eligible amount
	const estimatedEmi = calculateEMI(maxEligibleAmount, estimatedRate, effectiveTenureMonths);

	return {
		maxEligibleAmount,
		estimatedEmi,
		estimatedRate,
		effectiveTenureMonths,
		foirEligibleAmount,
		ltvCappedAmount,
		maxFoir
	};
}
