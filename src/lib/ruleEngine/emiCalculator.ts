// RE-2: EMI Calculator — Pure math functions for loan calculations
import { MIN_TENURE_MONTHS } from './systemConfig.js';

/**
 * Calculate EMI using standard formula:
 * EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 * where P = principal, r = monthly rate, n = months
 */
export function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
	if (principal <= 0 || tenureMonths <= 0) return 0;
	if (annualRate <= 0) return Math.round(principal / tenureMonths);

	const monthlyRate = annualRate / 100 / 12;
	const factor = Math.pow(1 + monthlyRate, tenureMonths);
	const emi = (principal * monthlyRate * factor) / (factor - 1);
	return Math.round(emi);
}

/**
 * Calculate maximum eligible amount from FOIR constraint.
 * maxEMI = (assessedIncome * maxFoir) - existingObligations
 * Then reverse-calculate the principal: P = EMI * ((1+r)^n - 1) / (r * (1+r)^n)
 */
export function calculateFoirEligibleAmount(
	assessedIncome: number,
	maxFoir: number,
	existingObligationMonthly: number,
	annualRate: number,
	tenureMonths: number
): number {
	if (assessedIncome <= 0 || tenureMonths <= 0) return 0;

	const maxEmiAllowed = assessedIncome * maxFoir - existingObligationMonthly;
	if (maxEmiAllowed <= 0) return 0;

	if (annualRate <= 0) return Math.round(maxEmiAllowed * tenureMonths);

	const monthlyRate = annualRate / 100 / 12;
	const factor = Math.pow(1 + monthlyRate, tenureMonths);
	const principal = (maxEmiAllowed * (factor - 1)) / (monthlyRate * factor);
	return Math.max(0, Math.round(principal));
}

/**
 * For credit line facilities (OD/CC/DOD), eligible limit is FOIR headroom / factor.
 * Credit lines don't have EMI — banks count them as factor% of limit in FOIR.
 * @param assessedIncome Monthly assessed income
 * @param maxFoir FOIR cap as decimal (e.g., 0.50 for 50%)
 * @param existingObligationMonthly Current monthly obligation burden
 * @param creditLineFactor Percentage of limit counted in FOIR (e.g., 0.05 for 5%)
 */
export function calculateCreditLineFoirEligibleLimit(
	assessedIncome: number,
	maxFoir: number,
	existingObligationMonthly: number,
	creditLineFactor: number
): number {
	if (assessedIncome <= 0 || creditLineFactor <= 0) return 0;
	const headroom = assessedIncome * maxFoir - existingObligationMonthly;
	if (headroom <= 0) return 0;
	return Math.floor(headroom / creditLineFactor);
}

/**
 * Calculate LTV-capped amount for secured loans.
 * Uses min(propertyCost, comparisonValue) as property value.
 * comparisonValue is marketValue (V2) or atsValue (V1/LAP).
 */
export function calculateLtvCappedAmount(
	maxLtvPercent: number,
	propertyCost: number,
	comparisonValue?: number
): number {
	if (maxLtvPercent <= 0 || propertyCost <= 0) return 0;

	const propertyValue =
		comparisonValue && comparisonValue > 0 ? Math.min(propertyCost, comparisonValue) : propertyCost;

	return Math.round(propertyValue * (maxLtvPercent / 100));
}

/**
 * Determine the final offered amount.
 * Minimum of: requested amount, FOIR-eligible amount, LTV-capped amount (if
 * secured), and LCR-capped amount (if registry value is under-stated relative
 * to deal value — under-registration is common in India, and lenders cap
 * disbursement at registration time based on the registry value).
 *
 * PITFALL: lcrCappedAmount used to be computed in evaluationEngine.ts but
 * never passed here, so the offered amount over-promised by ₹3-4L in
 * realistic Resale / Direct Sale scenarios. The customer would then hit a
 * funding shortfall at registry day. Fixed 2026-05-28.
 */
export function calculateOfferedAmount(
	requestedAmount: number,
	foirEligibleAmount: number,
	ltvCappedAmount?: number,
	lcrCappedAmount?: number
): number {
	let offered = Math.min(requestedAmount, foirEligibleAmount);

	if (ltvCappedAmount !== undefined && ltvCappedAmount >= 0) {
		offered = Math.min(offered, ltvCappedAmount);
	}

	if (lcrCappedAmount !== undefined && lcrCappedAmount >= 0) {
		offered = Math.min(offered, lcrCappedAmount);
	}

	return Math.max(0, Math.round(offered));
}

/**
 * Determine effective tenure in months.
 * Respects: requested tenure, max age at maturity, lender max tenure.
 */
export function determineEffectiveTenure(
	requestedYears: number,
	primaryAge: number,
	maxAgeAtMaturity: number,
	lenderMaxMonths: number
): number {
	const requestedMonths = requestedYears * 12;
	const ageLimitedMonths = Math.max(0, (maxAgeAtMaturity - primaryAge) * 12);

	return Math.max(MIN_TENURE_MONTHS, Math.min(requestedMonths, ageLimitedMonths, lenderMaxMonths));
}
