/**
 * ObligationCapture — pure validation + math
 * ──────────────────────────────────────────
 * Extracted from ObligationCapture.svelte so the same algorithms can be unit-tested
 * directly. The component imports these and wraps them in `$derived.by(...)`.
 *
 * Pure functions only — no Svelte runes, no DOM, no i18n formatting.
 * The component is responsible for turning numeric facts into user-facing strings.
 */

import { deriveFacilityType, isInstaLoan } from '$lib/config/obligationOptions';

export interface PendingValidityInput {
	loanType: string;
	bankName: string;
	emi: string;
	tenure: string;
	sanctionedLimit: string;
}

/**
 * Whether the partially-filled obligation form has a complete-enough entry to
 * enable the parent's Done/Next button. Returns false unless every field
 * required by the derived facility type has a usable value.
 *
 * Branches by facility:
 *   - term_loan / insta:        loanType + bankName + emi ≥ 1000 + tenure ≥ 1
 *   - credit_line:              loanType + bankName + sanctionedLimit ≥ 10,000
 *   - dropline:                 credit_line floor + emi ≥ 1000  (real branch — the
 *                               pre-extraction inline test copy missed this)
 */
export function hasPendingValidEntry(input: PendingValidityInput): boolean {
	const { loanType, bankName, emi, tenure, sanctionedLimit } = input;

	if (!loanType && !bankName) return false;
	if (!loanType || !bankName) return false;

	const facilityType = deriveFacilityType(loanType);
	const isTermLoan = facilityType === 'term_loan';
	const isCreditLine = facilityType === 'credit_line';
	const isDropline = facilityType === 'dropline';
	const isInsta = isInstaLoan(loanType);

	if (isTermLoan || isInsta) {
		const emiNum = parseFloat(emi);
		if (!emiNum || emiNum < 1000) return false;
		const tenureNum = parseInt(tenure);
		if (!tenureNum || tenureNum < 1) return false;
	}
	if (isCreditLine || isDropline) {
		const limitNum = parseFloat(sanctionedLimit);
		if (!limitNum || limitNum < 10_000) return false;
	}
	if (isDropline) {
		const dropEmi = parseFloat(emi);
		if (!dropEmi || dropEmi < 1000) return false;
	}
	return true;
}

export interface EmiMismatchInput {
	loanType: string;
	principalOutstanding: string;
	tenure: string;
	interestRate: string;
	emi: string;
}

export interface EmiMismatchResult {
	/** True when entered EMI differs from calculated EMI by more than ₹500. */
	triggered: boolean;
	/** 0 when inputs are incomplete or not applicable (non-term/non-dropline). */
	calculatedEmi: number;
	/** Absolute difference; 0 when not computable. */
	difference: number;
}

/**
 * Numeric facts for the EMI cross-check. Applies to term_loan + dropline only.
 *
 * Formula: EMI = P · r · (1 + r)^n / ((1 + r)^n − 1)
 *   where r = monthlyRate (annualRate / 12 / 100), n = tenure in months.
 *
 * The component takes this result and formats the warning string with i18n —
 * the threshold (₹500) and the math live here so they can be locked by tests.
 */
export function computeEmiMismatch(input: EmiMismatchInput): EmiMismatchResult {
	const facilityType = deriveFacilityType(input.loanType);
	const isTermLoan = facilityType === 'term_loan';
	const isDropline = facilityType === 'dropline';
	if (!isTermLoan && !isDropline) {
		return { triggered: false, calculatedEmi: 0, difference: 0 };
	}

	const principal = parseFloat(input.principalOutstanding);
	const months = parseInt(input.tenure);
	const annualRate = parseFloat(input.interestRate);
	const enteredEmi = parseFloat(input.emi);

	if (!principal || !months || !annualRate || !enteredEmi) {
		return { triggered: false, calculatedEmi: 0, difference: 0 };
	}
	if (principal <= 0 || months <= 0 || annualRate <= 0 || enteredEmi <= 0) {
		return { triggered: false, calculatedEmi: 0, difference: 0 };
	}

	const monthlyRate = annualRate / 12 / 100;
	const rateCompound = Math.pow(1 + monthlyRate, months);
	const calculatedEmi = Math.round(
		(principal * monthlyRate * rateCompound) / (rateCompound - 1)
	);
	const difference = Math.abs(enteredEmi - calculatedEmi);

	return {
		triggered: difference > 500,
		calculatedEmi,
		difference
	};
}
