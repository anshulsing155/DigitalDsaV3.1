/**
 * Balance Transfer Engine -- Compare current loan with new bank offers.
 *
 * Helps DSAs demonstrate the value of refinancing to their clients.
 * Shows monthly savings, total interest savings, and net benefit after
 * accounting for processing fees.
 *
 * Pure math -- no UI, no database, no side effects.
 */
import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';

// ============================================================================
// TYPES
// ============================================================================

export interface CurrentLoanDetails {
	/** Outstanding principal balance on the existing loan */
	outstandingPrincipal: number;
	/** Current annual interest rate (percentage, e.g. 10.5) */
	currentInterestRate: number;
	/** Remaining tenure on the current loan in months */
	remainingTenureMonths: number;
}

export interface NewBankOffer {
	/** Name of the new bank (for display purposes) */
	bankName: string;
	/** New annual interest rate offered (percentage, e.g. 8.5) */
	newInterestRate: number;
	/** Processing fee as a percentage of outstanding principal */
	processingFeePercent: number;
}

export interface BalanceTransferResult {
	/** Current monthly EMI */
	currentEmi: number;
	/** Total interest remaining on current loan */
	currentTotalInterest: number;
	/** Total payment remaining on current loan (principal + interest) */
	currentTotalPayment: number;
	/** New monthly EMI after transfer */
	newEmi: number;
	/** Total interest on the new loan */
	newTotalInterest: number;
	/** Total payment on the new loan (principal + interest) */
	newTotalPayment: number;
	/** One-time processing fee for the balance transfer */
	processingFee: number;
	/** Monthly EMI saving (current - new) */
	monthlyEmiSaving: number;
	/** Total interest saving over the loan lifetime */
	totalInterestSaving: number;
	/** Net saving after deducting processing fee from total interest saving */
	netSaving: number;
	/** Whether the transfer makes financial sense (net saving > 0) */
	isWorthTransferring: boolean;
}

// ============================================================================
// MAIN CALCULATION
// ============================================================================

/**
 * Compare current loan with a new bank offer and calculate all savings.
 *
 * The remaining tenure stays the same -- we compare apples to apples.
 * Processing fee is deducted from total interest saving to get net benefit.
 *
 * @param current - Details of the existing loan
 * @param newOffer - The proposed new bank offer
 * @returns Complete comparison with savings breakdown
 */
export function calculateBalanceTransfer(
	current: CurrentLoanDetails,
	newOffer: NewBankOffer
): BalanceTransferResult {
	const { outstandingPrincipal, currentInterestRate, remainingTenureMonths } = current;
	const { newInterestRate, processingFeePercent } = newOffer;

	// Current loan calculations
	const currentEmi = calculateEMI(outstandingPrincipal, currentInterestRate, remainingTenureMonths);
	const currentTotalPayment = currentEmi * remainingTenureMonths;
	const currentTotalInterest = currentTotalPayment - outstandingPrincipal;

	// New loan calculations (same principal and tenure, different rate)
	const newEmi = calculateEMI(outstandingPrincipal, newInterestRate, remainingTenureMonths);
	const newTotalPayment = newEmi * remainingTenureMonths;
	const newTotalInterest = newTotalPayment - outstandingPrincipal;

	// Processing fee
	const processingFee = Math.round(outstandingPrincipal * (processingFeePercent / 100));

	// Savings
	const monthlyEmiSaving = currentEmi - newEmi;
	const totalInterestSaving = currentTotalInterest - newTotalInterest;
	const netSaving = totalInterestSaving - processingFee;

	return {
		currentEmi,
		currentTotalInterest,
		currentTotalPayment,
		newEmi,
		newTotalInterest,
		newTotalPayment,
		processingFee,
		monthlyEmiSaving,
		totalInterestSaving,
		netSaving,
		isWorthTransferring: netSaving > 0
	};
}
