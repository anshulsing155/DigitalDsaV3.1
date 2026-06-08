/**
 * RE-7: Property Affordability Back-Calculator
 *
 * Pure math functions — no UI, no database, no Svelte.
 * Computes affordable property cost when propertyIdentified = false.
 *
 * Three modes:
 *   A) Pure eligibility (assume DP available)
 *   B) Down payment constrained — without unsecured bridge
 *   C) Down payment constrained — WITH unsecured bridge ("what-if" toggle)
 *
 * Core innovation: Piecewise linear DP→Property mapping with smooth 1:1
 * transition zones at LTV slab boundaries. No iteration needed for the
 * mapping itself — just arithmetic with if/else.
 *
 * Spec: docs/specs/PROPERTY-AFFORDABILITY-BACK-CALCULATOR.md
 */

import { calculateEMI } from './emiCalculator.js';

// ============================================================================
// 1. TYPES
// ============================================================================

/** RBI-mandated LTV slab */
export interface LtvSlab {
	/** Upper bound of property cost for this slab (Infinity for last) */
	upTo: number;
	/** LTV percentage (e.g. 90, 80, 75) */
	ltvPercent: number;
}

/** Per-lender parameters for affordability calculation */
export interface AffordabilityParams {
	/** Monthly assessed income (after haircuts, all applicants combined) */
	assessedIncome: number;
	/** Lender's max FOIR as decimal (e.g. 0.50 for 50%) */
	maxFoir: number;
	/** Total existing monthly obligation burden */
	existingObligationMonthly: number;
	/** Lender's secured loan annual interest rate */
	securedRate: number;
	/** Effective tenure in months (already age-limited) */
	tenureMonths: number;
	/** Available own down payment */
	availableDP: number;
	/** Unsecured bridge loan annual rate (for Mode C) */
	unsecuredRate: number;
	/** Unsecured bridge loan tenure in months (for Mode C) */
	unsecuredTenureMonths: number;
	/** Bank's max loan cap (if any) */
	maxLoanCap?: number;
}

/** Result of affordability calculation */
export interface AffordabilityResult {
	maxPropertyCost: number;
	homeLoanAmount: number;
	homeLoanEMI: number;
	ltvPercent: number;
	downPaymentRequired: number;
	downPaymentPercent: number;
	mode: 'eligibility' | 'dp_constrained' | 'bridge';
}

/** Bridge scenario result */
export interface BridgeResult extends AffordabilityResult {
	mode: 'bridge';
	bridgeLoanAmount: number;
	bridgeLoanEMI: number;
	totalEMI: number;
}

// ============================================================================
// 2. RBI LTV SLABS + DP BOUNDARIES
// ============================================================================

/**
 * RBI Home Loan LTV norms. Universal for all regulated lenders.
 * Custom slabs can be passed for NBFCs with stricter policies.
 */
export const RBI_LTV_SLABS: LtvSlab[] = [
	{ upTo: 3_000_000, ltvPercent: 90 },
	{ upTo: 7_500_000, ltvPercent: 80 },
	{ upTo: Infinity, ltvPercent: 75 }
];

/**
 * DP boundaries for the piecewise linear mapping.
 * Derived from RBI slabs: DP at each slab boundary = boundary × DP%.
 *
 * | Slab boundary | LTV | DP% | DP amount  | Property |
 * |---------------|-----|-----|------------|----------|
 * | ₹30L          | 90% | 10% | ₹3,33,333 | ₹33.33L  |
 * | ₹75L          | 80% | 20% | ₹7,50,000 | ₹37.5L   | ← transition end
 * | (mid-80%)     | 80% | 20% | ₹18,75,000| ₹93.75L  | ← transition start
 * | ₹1Cr          | 75% | 25% | ₹25,00,000| ₹1Cr     | ← transition end
 */
const DP_SLAB_90_MAX = 333_333; // DP at max 90% LTV property (₹33.33L × 10%)
const DP_TRANSITION_1_END = 750_000; // DP where 80% LTV zone starts cleanly
const DP_SLAB_80_MAX = 1_875_000; // DP at max clean 80% LTV property (₹93.75L × 20%)
const DP_TRANSITION_2_END = 2_500_000; // DP where 75% LTV zone starts cleanly (₹1Cr × 25%)

const PROP_AT_90_MAX = 3_333_333; // ₹33.33L — max property in 90% LTV zone
const PROP_AT_TRANSITION_1_END = 3_750_000; // ₹37.5L — where 80% zone starts
const PROP_AT_80_MAX = 9_375_000; // ₹93.75L — max property before 80%→75% transition
const PROP_AT_TRANSITION_2_END = 10_000_000; // ₹1Cr — where 75% zone starts

/**
 * Tested allocation factors for splitting excess EMI between HL and PL.
 * Derived with HL≈850/lakh, PL≈3000/lakh. Kept for validation.
 * Dynamic formula: f = p×D / (p×D + h×L) can replace these once validated.
 */
export const TESTED_PL_FACTORS = {
	/** 90% LTV zone — 22% of excess EMI to PL */
	low: 0.22,
	/** 80% LTV zone — 38.95% of excess EMI to PL */
	mid: 0.3895,
	/** 75% LTV zone — 46% of excess EMI to PL */
	high: 0.46
} as const;

// ============================================================================
// 3. CORE HELPERS
// ============================================================================

/** Get LTV% for a property cost. */
export function getLtvForPropertyCost(
	propertyCost: number,
	slabs: LtvSlab[] = RBI_LTV_SLABS
): number {
	for (const slab of slabs) {
		if (propertyCost <= slab.upTo) return slab.ltvPercent;
	}
	return slabs[slabs.length - 1].ltvPercent;
}

/** Get DP% for a property cost. */
export function getDpPercentForPropertyCost(
	propertyCost: number,
	slabs: LtvSlab[] = RBI_LTV_SLABS
): number {
	return 100 - getLtvForPropertyCost(propertyCost, slabs);
}

/** Reverse EMI: given EMI → max principal. P = EMI × ((1+r)^n − 1) / (r × (1+r)^n) */
export function emiToLoan(emi: number, annualRate: number, tenureMonths: number): number {
	if (emi <= 0 || tenureMonths <= 0) return 0;
	if (annualRate <= 0) return Math.round(emi * tenureMonths);
	const r = annualRate / 100 / 12;
	const factor = Math.pow(1 + r, tenureMonths);
	return Math.round((emi * (factor - 1)) / (r * factor));
}

/** Max affordable new EMI from FOIR headroom. */
export function maxAffordableEMI(
	assessedIncome: number,
	maxFoir: number,
	existingObligationMonthly: number
): number {
	return Math.max(0, assessedIncome * maxFoir - existingObligationMonthly);
}

// ============================================================================
// 4. PIECEWISE LINEAR DP → PROPERTY MAPPING (The Core)
// ============================================================================

/**
 * Convert a down payment amount to affordable property cost.
 * Uses piecewise linear mapping with 1:1 transition zones at LTV slab boundaries.
 *
 * Zones:
 *   DP ≤ ₹3.33L            → Property = DP / 0.10        (90% LTV, 1:10 leverage)
 *   ₹3.33L < DP ≤ ₹7.5L   → Property = ₹33.33L + (DP - ₹3.33L)  (TRANSITION 1:1)
 *   ₹7.5L < DP ≤ ₹18.75L  → Property = DP / 0.20        (80% LTV, 1:5 leverage)
 *   ₹18.75L < DP ≤ ₹25L   → Property = ₹93.75L + (DP - ₹18.75L) (TRANSITION 1:1)
 *   DP > ₹25L              → Property = DP / 0.25        (75% LTV, 1:4 leverage)
 */
export function dpToPropertyCost(downPayment: number): number {
	if (downPayment <= 0) return 0;

	if (downPayment <= DP_SLAB_90_MAX) {
		// 90% LTV zone: ₹1 DP = ₹10 property
		return Math.round(downPayment / 0.1);
	}

	if (downPayment <= DP_TRANSITION_1_END) {
		// Transition 90%→80%: ₹1 DP = ₹1 property (penalty absorption)
		return Math.round(PROP_AT_90_MAX + (downPayment - DP_SLAB_90_MAX));
	}

	if (downPayment <= DP_SLAB_80_MAX) {
		// 80% LTV zone: ₹1 DP = ₹5 property
		return Math.round(downPayment / 0.2);
	}

	if (downPayment <= DP_TRANSITION_2_END) {
		// Transition 80%→75%: ₹1 DP = ₹1 property (penalty absorption)
		return Math.round(PROP_AT_80_MAX + (downPayment - DP_SLAB_80_MAX));
	}

	// 75% LTV zone: ₹1 DP = ₹4 property
	return Math.round(downPayment / 0.25);
}

/**
 * Convert a loan amount to property cost using LTV slab lookup.
 * Used when converting eligibility (loan) to property (Mode A).
 */
export function loanToPropertyCost(loanAmount: number): number {
	if (loanAmount <= 0) return 0;

	// Check each slab: property = loan / LTV%
	if (loanAmount <= 3_000_000 * 0.9) {
		// Loan fits in 90% LTV zone
		return Math.round(loanAmount / 0.9);
	}

	if (loanAmount <= 7_500_000 * 0.8) {
		// Loan fits in 80% LTV zone
		return Math.round(loanAmount / 0.8);
	}

	// 75% LTV zone
	return Math.round(loanAmount / 0.75);
}

// ============================================================================
// 5. PL ALLOCATION FACTOR
// ============================================================================

/**
 * Get the PL allocation factor for a given loan eligibility level.
 *
 * Uses tested fixed factors by default. When `useDynamic` is true,
 * computes exact factor from actual per-lakh-EMI values:
 *   f = p×D / (p×D + h×L)
 * where h = HL per-lakh-EMI, p = PL per-lakh-EMI, L = LTV, D = DP%
 *
 * @param maxEligibleLoan - Max HL eligibility (determines which LTV slab applies)
 * @param hlPerLakhEmi - HL EMI per ₹1 lakh loan (optional, for dynamic mode)
 * @param plPerLakhEmi - PL EMI per ₹1 lakh loan (optional, for dynamic mode)
 * @param useDynamic - If true, compute from actual EMI values instead of fixed factors
 */
export function getPlAllocationFactor(
	maxEligibleLoan: number,
	hlPerLakhEmi?: number,
	plPerLakhEmi?: number,
	useDynamic: boolean = false
): number {
	const isLow = maxEligibleLoan <= 3_000_000;
	const isMid = maxEligibleLoan <= 7_500_000;

	if (useDynamic && hlPerLakhEmi && plPerLakhEmi) {
		// Dynamic factor: f = p×D / (p×D + h×L)
		const L = isLow ? 0.9 : isMid ? 0.8 : 0.75;
		const D = 1 - L;
		return (plPerLakhEmi * D) / (plPerLakhEmi * D + hlPerLakhEmi * L);
	}

	// Tested fixed factors (HL≈850/lakh, PL≈3000/lakh)
	if (isLow) return TESTED_PL_FACTORS.low;
	if (isMid) return TESTED_PL_FACTORS.mid;
	return TESTED_PL_FACTORS.high;
}

// ============================================================================
// 6. MODE A: Pure Eligibility (Assume DP Available)
// ============================================================================

/**
 * Max affordable property assuming sufficient DP.
 * Simple: loan eligibility → LTV slab → property cost.
 */
export function calculatePureEligibility(
	params: Pick<
		AffordabilityParams,
		| 'assessedIncome'
		| 'maxFoir'
		| 'existingObligationMonthly'
		| 'securedRate'
		| 'tenureMonths'
		| 'maxLoanCap'
	>,
	slabs: LtvSlab[] = RBI_LTV_SLABS
): AffordabilityResult | null {
	const maxEmi = maxAffordableEMI(
		params.assessedIncome,
		params.maxFoir,
		params.existingObligationMonthly
	);
	if (maxEmi <= 0) return null;

	let maxLoan = emiToLoan(maxEmi, params.securedRate, params.tenureMonths);
	if (maxLoan <= 0) return null;

	// Apply bank cap if any
	if (params.maxLoanCap && params.maxLoanCap > 0) {
		maxLoan = Math.min(maxLoan, params.maxLoanCap);
	}

	const propertyCost = loanToPropertyCost(maxLoan);
	const ltv = getLtvForPropertyCost(propertyCost, slabs);
	const dp = propertyCost - maxLoan;

	return {
		maxPropertyCost: propertyCost,
		homeLoanAmount: maxLoan,
		homeLoanEMI: calculateEMI(maxLoan, params.securedRate, params.tenureMonths),
		ltvPercent: ltv,
		downPaymentRequired: dp,
		downPaymentPercent: propertyCost > 0 ? Math.round((dp / propertyCost) * 1000) / 10 : 0,
		mode: 'eligibility'
	};
}

// ============================================================================
// 7. MODE B: Down Payment Constrained (No Bridge)
// ============================================================================

/**
 * Max affordable property given available DP, without unsecured bridge.
 *
 * Two sub-cases:
 *   a) User's DP ≥ min DP for eligibility → surplus DP increases property
 *   b) User's DP < min DP for eligibility → property constrained by DP (use slab mapping)
 */
export function calculateDpConstrained(
	params: AffordabilityParams,
	slabs: LtvSlab[] = RBI_LTV_SLABS
): AffordabilityResult | null {
	const maxEmi = maxAffordableEMI(
		params.assessedIncome,
		params.maxFoir,
		params.existingObligationMonthly
	);
	if (maxEmi <= 0 || params.availableDP <= 0) return null;

	// First get eligibility-based property
	const eligResult = calculatePureEligibility(params, slabs);
	if (!eligResult) return null;

	const minDpForEligibility = eligResult.downPaymentRequired;

	let propertyCost: number;

	if (params.availableDP >= minDpForEligibility) {
		// Sub-case (a): DP surplus — add surplus to property
		propertyCost = eligResult.maxPropertyCost + (params.availableDP - minDpForEligibility);
	} else {
		// Sub-case (b): DP constrained — use piecewise linear mapping
		propertyCost = dpToPropertyCost(params.availableDP);
	}

	// Verify the HL loan for this property is within EMI capacity
	const ltv = getLtvForPropertyCost(propertyCost, slabs);
	const loan = Math.round(propertyCost * (ltv / 100));
	const emi = calculateEMI(loan, params.securedRate, params.tenureMonths);

	if (emi > maxEmi) {
		// EMI exceeds capacity — fall back to eligibility result
		return { ...eligResult, mode: 'dp_constrained' };
	}

	const dp = propertyCost - loan;
	return {
		maxPropertyCost: propertyCost,
		homeLoanAmount: loan,
		homeLoanEMI: emi,
		ltvPercent: ltv,
		downPaymentRequired: dp,
		downPaymentPercent: propertyCost > 0 ? Math.round((dp / propertyCost) * 1000) / 10 : 0,
		mode: 'dp_constrained'
	};
}

// ============================================================================
// 8. MODE C: Unsecured Bridge ("What If" Toggle)
// ============================================================================

/**
 * Max affordable property using an unsecured loan to increase DP.
 *
 * Flow:
 *   1. Calculate current affordable property from DP alone
 *   2. Calculate HL EMI for that property
 *   3. Excess EMI = max EMI capacity − current HL EMI
 *   4. Split excess: PL EMI = excess × factor, remaining increases HL
 *   5. PL loan from PL EMI → extra DP
 *   6. Total DP = own + PL proceeds
 *   7. Map total DP → property using piecewise linear function
 */
export function calculateBridgeScenario(
	params: AffordabilityParams,
	slabs: LtvSlab[] = RBI_LTV_SLABS,
	useDynamicFactor: boolean = false
): BridgeResult | null {
	const maxEmi = maxAffordableEMI(
		params.assessedIncome,
		params.maxFoir,
		params.existingObligationMonthly
	);
	if (maxEmi <= 0 || params.availableDP <= 0) return null;

	// Step 1: Max HL eligibility (full EMI to HL, no PL)
	let maxEligibleLoan = emiToLoan(maxEmi, params.securedRate, params.tenureMonths);
	if (params.maxLoanCap && params.maxLoanCap > 0) {
		maxEligibleLoan = Math.min(maxEligibleLoan, params.maxLoanCap);
	}
	const maxHlEmi = calculateEMI(maxEligibleLoan, params.securedRate, params.tenureMonths);

	// Step 2: Current affordable property from DP alone (no bridge)
	const currentPropertyFromDP = dpToPropertyCost(params.availableDP);
	const currentLtv = getLtvForPropertyCost(currentPropertyFromDP, slabs);
	const currentLoanRequired = currentPropertyFromDP - params.availableDP;
	const currentLoanEmi = calculateEMI(currentLoanRequired, params.securedRate, params.tenureMonths);

	// Step 3: Excess EMI capacity
	const excessEmi = maxHlEmi - currentLoanEmi;
	if (excessEmi <= 0) {
		// No excess — bridge won't help
		return null;
	}

	// Step 4: Split excess EMI using allocation factor.
	//
	// PITFALL: previously this passed `maxEligibleLoan` (the full FOIR-eligible
	// max) into `getPlAllocationFactor`, which buckets HL→PL split by loan
	// size (low ≤30L / mid ≤75L / high >75L). When eligibility is much larger
	// than the actual DP-constrained HL (e.g. ₹50L eligibility but only ₹15L
	// HL needed), the zone was set by the max — over-estimating PL proceeds
	// and pushing the bridge scenario into mathematically-unaffordable
	// territory (audit math: total EMI ₹69,011 > maxEmi ₹40,000). Pass the
	// DP-constrained `currentLoanRequired` instead so the PL allocation
	// matches the loan zone actually in play (Pitfall: Mode C overshoot,
	// 2026-05-28).
	const hlPerLakhEmi = calculateEMI(100_000, params.securedRate, params.tenureMonths);
	const plPerLakhEmi = calculateEMI(100_000, params.unsecuredRate, params.unsecuredTenureMonths);

	const plFactor = getPlAllocationFactor(
		currentLoanRequired,
		hlPerLakhEmi,
		plPerLakhEmi,
		useDynamicFactor
	);

	const plEmi = Math.round(excessEmi * plFactor);

	// Step 5: PL loan from PL EMI → extra DP
	const plLoanAmount = emiToLoan(plEmi, params.unsecuredRate, params.unsecuredTenureMonths);
	if (plLoanAmount <= 0) return null;

	// Step 6: Total DP = own + PL proceeds
	const totalDP = params.availableDP + plLoanAmount;

	// Step 7: Map total DP → property using piecewise linear function
	const propertyCost = dpToPropertyCost(totalDP);

	// Calculate final HL loan and EMI
	const ltv = getLtvForPropertyCost(propertyCost, slabs);
	const hlLoan = propertyCost - totalDP;
	const hlEmi = calculateEMI(hlLoan, params.securedRate, params.tenureMonths);
	const totalEmi = hlEmi + plEmi;

	// PITFALL: rounding and zone-bucket interactions can produce a scenario
	// whose total EMI (HL + PL) exceeds the customer's FOIR-derived maxEmi —
	// i.e. mathematically unaffordable. Suppress the scenario rather than
	// surface an over-promise. A small 1% tolerance absorbs benign rounding
	// gaps so a near-exact match isn't unnecessarily rejected (Pitfall: Mode
	// C overshoot, 2026-05-28).
	const EMI_TOLERANCE = 1.01;
	if (totalEmi > maxEmi * EMI_TOLERANCE) return null;

	const dp = propertyCost - hlLoan;

	return {
		maxPropertyCost: propertyCost,
		homeLoanAmount: hlLoan,
		homeLoanEMI: hlEmi,
		ltvPercent: ltv,
		downPaymentRequired: dp,
		downPaymentPercent: propertyCost > 0 ? Math.round((dp / propertyCost) * 1000) / 10 : 0,
		mode: 'bridge',
		bridgeLoanAmount: plLoanAmount,
		bridgeLoanEMI: plEmi,
		totalEMI: totalEmi
	};
}

// ============================================================================
// 9. MASTER FUNCTION
// ============================================================================

/**
 * Calculate property affordability using all three modes.
 */
export function calculateAffordability(
	params: AffordabilityParams,
	slabs: LtvSlab[] = RBI_LTV_SLABS,
	useDynamicFactor: boolean = false
): {
	eligibility: AffordabilityResult | null;
	dpConstrained: AffordabilityResult | null;
	bridge: BridgeResult | null;
} {
	return {
		eligibility: calculatePureEligibility(params, slabs),
		dpConstrained: calculateDpConstrained(params, slabs),
		bridge: calculateBridgeScenario(params, slabs, useDynamicFactor)
	};
}

// ============================================================================
// 10. SCENARIO SELECTION (business gating — how many cards to surface)
// ============================================================================

/**
 * Decide which of the three computed scenarios to actually show, based on the
 * applicant's pre-sanction answers. The math above is computed unconditionally;
 * this applies the *business* rule for the card count the DSA asked for:
 *
 *   sanctionType = 'Based On Eligibility'                 → eligibility only      (1 card)
 *   sanctionType = 'Based on Downpayment'                 → + dpConstrained        (2 cards)
 *   sanctionType = 'Based on Downpayment' + wantsPlBridge → + bridge               (3 cards)
 *
 * The bridge is additionally suppressed by the math itself (calculateBridgeScenario
 * returns null when there's no spare EMI capacity), so opting in never renders an
 * empty bridge card.
 *
 * Keeping this separate from calculateAffordability keeps the calculator pure
 * (math only) and puts the user-driven gating in one testable place.
 */
export function selectAffordabilityScenarios(
	full: {
		eligibility: AffordabilityResult | null;
		dpConstrained: AffordabilityResult | null;
		bridge: BridgeResult | null;
	},
	opts: { sanctionType?: string; wantsPlBridge?: boolean }
): {
	eligibility: AffordabilityResult | null;
	dpConstrained: AffordabilityResult | null;
	bridge: BridgeResult | null;
} {
	const isDownPaymentBasis = opts.sanctionType === 'Based on Downpayment';
	return {
		eligibility: full.eligibility,
		dpConstrained: isDownPaymentBasis ? full.dpConstrained : null,
		bridge: isDownPaymentBasis && opts.wantsPlBridge === true ? full.bridge : null
	};
}
