/**
 * Smart Eligibility Engine — 3-step progressive calculation.
 *
 * This engine powers both the Eligibility Calculator and the Affordability Calculator.
 * It works at THREE levels of detail:
 *
 * STEP 1 — Quick Estimate (3 fields, instant, client-side)
 *   Input: income, employment type, loan type
 *   Output: ballpark eligible amount, estimated EMI, estimated property value
 *
 * STEP 2 — Refined Calculation (6-8 fields, client-side with static rates)
 *   Input: + age, credit score, existing EMIs, down payment, co-applicant
 *   Output: more accurate amount, per-tier rate, tenure-adjusted calculation
 *
 * STEP 3 — Full Analysis (dashboard only, calls rule engine API)
 *   Input: same as Step 2 but processed through real lender policies
 *   Output: per-lender results with traffic lights, decision factors, suggestions
 *
 * WHITE-LABEL READY: All functions are pure — they take inputs and return outputs.
 * No UI, no stores, no fetch calls. The component layer handles API communication.
 *
 * REUSES V3's existing math:
 * - calculateEMI, calculateFoirEligibleAmount from emiCalculator.ts
 * - calculateAffordability (3 modes) from affordabilityCalculator.ts
 * - determineEffectiveTenure from emiCalculator.ts
 * - maxAffordableEMI, loanToPropertyCost, dpToPropertyCost from affordabilityCalculator.ts
 */

import {
	calculateEMI,
	calculateFoirEligibleAmount,
	calculateLtvCappedAmount,
	calculateOfferedAmount,
	determineEffectiveTenure
} from '$lib/ruleEngine/emiCalculator.js';

import {
	maxAffordableEMI,
	emiToLoan,
	loanToPropertyCost,
	dpToPropertyCost,
	calculateAffordability,
	type AffordabilityParams,
	type AffordabilityResult,
	type BridgeResult
} from '$lib/ruleEngine/affordabilityCalculator.js';

// ============================================================================
// TYPES
// ============================================================================

/** Simplified employment categories (maps to FOIR brackets) */
export type EmploymentCategory = 'Salaried' | 'Self-Employed' | 'Professional';

/** Simplified credit score tiers */
export type CreditScoreTier = 'Excellent' | 'Good' | 'Average' | 'Fair' | 'Poor' | 'No Score';

/** Loan type (determines LTV rules and tenure caps) */
export type LoanCategory = 'Home Loan' | 'LAP' | 'Plot Loan' | 'Personal Loan' | 'Business Loan';

/** Single applicant's input data */
export interface ApplicantInput {
	/** Monthly income in INR */
	monthlyIncome: number;
	/** Employment category */
	employment: EmploymentCategory;
	/** Current age in years */
	age: number;
	/** Credit score tier */
	creditScore: CreditScoreTier;
	/** Total existing monthly EMI obligations */
	existingMonthlyEmis: number;
	/** Other monthly income (50% is counted — rent, freelance, etc.) */
	otherMonthlyIncome?: number;
}

/** Step 1 result — quick ballpark estimate */
export interface QuickEstimateResult {
	/** Estimated max eligible loan amount */
	estimatedLoanAmount: number;
	/** Estimated monthly EMI */
	estimatedEmi: number;
	/** Estimated interest rate used */
	estimatedRate: number;
	/** Estimated max property value (loan ÷ LTV) */
	estimatedPropertyValue: number;
	/** FOIR percentage used */
	foirUsed: number;
	/** Tenure in months */
	tenureUsed: number;
}

/** Step 2 result — refined with all inputs */
export interface RefinedEligibilityResult {
	/** Max eligible loan amount */
	maxLoanAmount: number;
	/** Monthly EMI for that loan */
	monthlyEmi: number;
	/** Interest rate applied */
	interestRate: number;
	/** Effective tenure in months */
	effectiveTenureMonths: number;
	/** Max FOIR capacity (income × FOIR% - existing EMIs) */
	maxEmiCapacity: number;
	/** FOIR percentage used */
	foirPercent: number;
	/** Max property value (from loan via LTV) */
	maxPropertyValue: number;
	/** Down payment required for that property */
	downPaymentRequired: number;
	/** Total income considered (all applicants) */
	totalIncomeConsidered: number;
	/** Total existing EMIs deducted */
	totalExistingEmis: number;
}

/** Step 2 affordability result — includes 3-mode breakdown */
export interface RefinedAffordabilityResult extends RefinedEligibilityResult {
	/** Mode A: max property if DP is unlimited */
	pureEligibility: AffordabilityResult | null;
	/** Mode B: max property with actual DP, no bridge */
	dpConstrained: AffordabilityResult | null;
	/** Mode C: max property with PL bridge to boost DP */
	bridgeScenario: BridgeResult | null;
}

// ============================================================================
// STATIC LOOKUP TABLES (for client-side calculations)
// ============================================================================

/**
 * Conservative mid-market interest rates by credit score tier.
 * These are NOT bank-specific — they represent a reasonable average
 * across major banks. The dashboard version uses real lender rates.
 */
const STATIC_RATES: Record<CreditScoreTier, number> = {
	Excellent: 8.25, // 780+ CIBIL
	Good: 8.75, // 730-779
	Average: 9.5, // 700-729
	Fair: 10.5, // 650-699
	Poor: 12.5, // Below 650
	'No Score': 11.0 // New to credit
};

/**
 * FOIR limits by employment type and income bracket.
 * Based on RBI guidelines and common bank practices.
 *
 * HOW TO READ: Salaried earning ₹75K-1L gets 55% FOIR
 * = bank allows 55% of their income towards all EMIs.
 */
const FOIR_TABLE: Record<EmploymentCategory, { upTo: number; foir: number }[]> = {
	Salaried: [
		{ upTo: 50_000, foir: 0.5 },
		{ upTo: 100_000, foir: 0.55 },
		{ upTo: 150_000, foir: 0.6 },
		{ upTo: Infinity, foir: 0.65 }
	],
	'Self-Employed': [
		{ upTo: 50_000, foir: 0.55 },
		{ upTo: 100_000, foir: 0.6 },
		{ upTo: Infinity, foir: 0.65 }
	],
	Professional: [
		{ upTo: 50_000, foir: 0.6 },
		{ upTo: 100_000, foir: 0.65 },
		{ upTo: Infinity, foir: 0.7 }
	]
};

/**
 * Max retirement age by employment type.
 * Loan must end before retirement → affects max tenure.
 */
const MAX_RETIREMENT_AGE: Record<EmploymentCategory, number> = {
	Salaried: 60,
	'Self-Employed': 70,
	Professional: 65
};

/**
 * Max tenure by loan type (in months).
 */
const MAX_TENURE_BY_LOAN: Record<LoanCategory, number> = {
	'Home Loan': 360, // 30 years
	LAP: 180, // 15 years
	'Plot Loan': 240, // 20 years
	'Personal Loan': 60, // 5 years
	'Business Loan': 60 // 5 years
};

/** Default PL rate for bridge scenario */
const DEFAULT_PL_RATE = 14.0;
const DEFAULT_PL_TENURE = 60; // 5 years

// ============================================================================
// STEP 1 — QUICK ESTIMATE (3 fields)
// ============================================================================

/**
 * Instant ballpark estimate from just income, employment, and loan type.
 *
 * This gives users a number within 5 seconds of opening the calculator.
 * Accuracy: ±15-20% of actual (good enough to hook the user).
 *
 * @param monthlyIncome - Primary applicant's monthly income
 * @param employment - Employment category
 * @param loanType - Type of loan
 */
export function computeQuickEstimate(
	monthlyIncome: number,
	employment: EmploymentCategory,
	loanType: LoanCategory
): QuickEstimateResult {
	// Step 1: Get FOIR for this income level and employment type
	const foirPercent = lookupFoir(employment, monthlyIncome);

	// Step 2: Use a conservative mid-market rate (assume "Good" credit)
	const estimatedRate = STATIC_RATES['Good'];

	// Step 3: Determine tenure (assume age 30, which gives max tenure for most)
	const maxTenureForLoan = MAX_TENURE_BY_LOAN[loanType];
	const retirementAge = MAX_RETIREMENT_AGE[employment];
	const ageBasedMaxTenure = (retirementAge - 30) * 12; // Assume age 30
	const tenureMonths = Math.min(maxTenureForLoan, ageBasedMaxTenure);

	// Step 4: Calculate max EMI capacity from FOIR
	const maxEmi = maxAffordableEMI(monthlyIncome, foirPercent, 0);

	// Step 5: Reverse-calculate the max loan from that EMI
	const maxLoan = emiToLoan(maxEmi, estimatedRate, tenureMonths);

	// Step 6: Calculate actual EMI for that loan (may differ due to rounding)
	const emi = calculateEMI(maxLoan, estimatedRate, tenureMonths);

	// Step 7: Back-calculate property value from loan via LTV
	const propertyValue = loanToPropertyCost(maxLoan);

	return {
		estimatedLoanAmount: maxLoan,
		estimatedEmi: emi,
		estimatedRate,
		estimatedPropertyValue: propertyValue,
		foirUsed: foirPercent * 100,
		tenureUsed: tenureMonths
	};
}

// ============================================================================
// STEP 2 — REFINED ELIGIBILITY (6-8 fields)
// ============================================================================

/**
 * More accurate calculation using all available inputs.
 * Still client-side — uses static rate tables, not real lender policies.
 *
 * @param applicants - Array of applicant inputs (primary + optional co-applicants)
 * @param loanType - Type of loan
 * @param requestedTenureYears - User's preferred tenure (may be capped by age)
 */
export function computeRefinedEligibility(
	applicants: ApplicantInput[],
	loanType: LoanCategory,
	requestedTenureYears: number = 20
): RefinedEligibilityResult {
	// Step 1: Determine the interest rate from the WORST credit score
	//         (banks use weakest-link rule across all co-borrowers)
	const worstCreditTier = getWorstCreditScore(applicants);
	const interestRate = STATIC_RATES[worstCreditTier];

	// Step 2: Determine effective tenure (considers all applicants' ages)
	const maxTenureForLoan = MAX_TENURE_BY_LOAN[loanType];
	let bestTenureMonths = 0;
	for (const applicant of applicants) {
		const retirementAge = MAX_RETIREMENT_AGE[applicant.employment];
		const ageBasedTenure = Math.max(0, (retirementAge - applicant.age) * 12);
		const effectiveTenure = Math.min(maxTenureForLoan, ageBasedTenure, requestedTenureYears * 12);
		// Use the BEST (longest) tenure across all applicants
		bestTenureMonths = Math.max(bestTenureMonths, effectiveTenure);
	}
	const effectiveTenureMonths = Math.max(12, bestTenureMonths);

	// Step 3: Calculate each applicant's loan eligibility independently
	//         (like V4: each gets their own FOIR based on their income + employment)
	let totalLoanEligibility = 0;
	let totalEmiCapacity = 0;
	let totalIncomeConsidered = 0;
	let totalExistingEmis = 0;

	for (const applicant of applicants) {
		// Effective income = declared income + 50% of other income (bank haircut on secondary income)
		const effectiveIncome =
			applicant.monthlyIncome + Math.round((applicant.otherMonthlyIncome || 0) * 0.5);
		totalIncomeConsidered += effectiveIncome;
		totalExistingEmis += applicant.existingMonthlyEmis;

		// Get FOIR for this applicant's profile
		const foir = lookupFoir(applicant.employment, effectiveIncome);

		// Max EMI this applicant can support
		const applicantMaxEmi = maxAffordableEMI(effectiveIncome, foir, applicant.existingMonthlyEmis);
		totalEmiCapacity += applicantMaxEmi;

		// Convert EMI capacity to loan amount
		const applicantLoanEligibility = emiToLoan(
			applicantMaxEmi,
			interestRate,
			effectiveTenureMonths
		);
		totalLoanEligibility += applicantLoanEligibility;
	}

	// Step 4: Calculate EMI for the total eligible loan
	const monthlyEmi = calculateEMI(totalLoanEligibility, interestRate, effectiveTenureMonths);

	// Step 5: Back-calculate property value via LTV
	const maxPropertyValue = loanToPropertyCost(totalLoanEligibility);
	const downPaymentRequired = maxPropertyValue - totalLoanEligibility;

	// Step 6: Determine the blended FOIR used
	const blendedFoir =
		totalIncomeConsidered > 0
			? ((totalEmiCapacity + totalExistingEmis) / totalIncomeConsidered) * 100
			: 0;

	return {
		maxLoanAmount: totalLoanEligibility,
		monthlyEmi,
		interestRate,
		effectiveTenureMonths,
		maxEmiCapacity: totalEmiCapacity,
		foirPercent: blendedFoir,
		maxPropertyValue,
		downPaymentRequired,
		totalIncomeConsidered,
		totalExistingEmis
	};
}

// ============================================================================
// STEP 2B — REFINED AFFORDABILITY (adds down payment + 3-mode results)
// ============================================================================

/**
 * Affordability calculation: "What's the max property I can afford?"
 *
 * Extends the eligibility calculation with down payment analysis
 * and the 3-mode affordability breakdown (pure / DP-constrained / bridge).
 *
 * @param applicants - Applicant inputs
 * @param loanType - Loan type
 * @param availableDownPayment - User's available down payment
 * @param requestedTenureYears - Preferred tenure
 */
export function computeRefinedAffordability(
	applicants: ApplicantInput[],
	loanType: LoanCategory,
	availableDownPayment: number,
	requestedTenureYears: number = 20
): RefinedAffordabilityResult {
	// First get the base eligibility result
	const eligibility = computeRefinedEligibility(applicants, loanType, requestedTenureYears);

	// Build the params for V3's affordability calculator (which already handles all 3 modes)
	const affordabilityParams: AffordabilityParams = {
		assessedIncome: eligibility.totalIncomeConsidered,
		maxFoir: eligibility.foirPercent / 100,
		existingObligationMonthly: eligibility.totalExistingEmis,
		securedRate: eligibility.interestRate,
		tenureMonths: eligibility.effectiveTenureMonths,
		availableDP: availableDownPayment,
		unsecuredRate: DEFAULT_PL_RATE,
		unsecuredTenureMonths: DEFAULT_PL_TENURE
	};

	// V3's calculateAffordability already does all 3 modes — just call it
	const affordability = calculateAffordability(affordabilityParams);

	return {
		...eligibility,
		pureEligibility: affordability.eligibility,
		dpConstrained: affordability.dpConstrained,
		bridgeScenario: affordability.bridge as BridgeResult | null
	};
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Look up FOIR percentage for an employment type and income level.
 * Returns as a decimal (e.g., 0.55 for 55%).
 */
function lookupFoir(employment: EmploymentCategory, monthlyIncome: number): number {
	const brackets = FOIR_TABLE[employment];
	for (const bracket of brackets) {
		if (monthlyIncome <= bracket.upTo) return bracket.foir;
	}
	return brackets[brackets.length - 1].foir;
}

/**
 * Get the worst (lowest) credit score tier across all applicants.
 * Banks use the weakest-link rule: one low-score co-borrower drags everyone's rate up.
 */
function getWorstCreditScore(applicants: ApplicantInput[]): CreditScoreTier {
	const tierOrder: CreditScoreTier[] = ['Excellent', 'Good', 'Average', 'Fair', 'Poor', 'No Score'];
	let worstIndex = 0;
	for (const applicant of applicants) {
		const thisIndex = tierOrder.indexOf(applicant.creditScore);
		if (thisIndex > worstIndex) worstIndex = thisIndex;
	}
	return tierOrder[worstIndex];
}

// ============================================================================
// EXPORTS FOR EXTERNAL USE
// ============================================================================

/**
 * Credit score options for the UI dropdown.
 * Ordered best → worst for display.
 */
export const CREDIT_SCORE_OPTIONS: { label: string; value: CreditScoreTier }[] = [
	{ label: '780+ (Excellent)', value: 'Excellent' },
	{ label: '730-779 (Good)', value: 'Good' },
	{ label: '700-729 (Average)', value: 'Average' },
	{ label: '650-699 (Fair)', value: 'Fair' },
	{ label: 'Below 650 (Poor)', value: 'Poor' },
	{ label: 'No CIBIL Score', value: 'No Score' }
];

/** Employment options for the UI */
export const EMPLOYMENT_OPTIONS: { label: string; value: EmploymentCategory }[] = [
	{ label: 'Salaried (Govt/Private)', value: 'Salaried' },
	{ label: 'Self-Employed (Business)', value: 'Self-Employed' },
	{ label: 'Professional (Doctor/CA/Architect)', value: 'Professional' }
];

/** Loan type options */
export const LOAN_TYPE_OPTIONS: { label: string; value: LoanCategory }[] = [
	{ label: 'Home Loan', value: 'Home Loan' },
	{ label: 'Loan Against Property', value: 'LAP' },
	{ label: 'Plot Loan', value: 'Plot Loan' },
	{ label: 'Personal Loan', value: 'Personal Loan' },
	{ label: 'Business Loan', value: 'Business Loan' }
];

/** Static rate table (exported for display — "rates starting from X%") */
export { STATIC_RATES };
