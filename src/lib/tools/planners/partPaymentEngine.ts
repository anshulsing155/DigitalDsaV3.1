/**
 * Part-Payment Planner Engine — Amortization with prepayments.
 *
 * This engine calculates how making extra payments (part-payments)
 * on a loan can reduce either the tenure, the EMI, or both.
 *
 * Key concepts:
 * - Part-payment: An extra lump-sum payment on top of regular EMI
 * - When you make a part-payment, the principal reduces faster
 * - "Reduce Tenure": Keep EMI the same, finish the loan sooner
 * - "Reduce EMI": Keep tenure the same, lower the monthly EMI
 * - "Reduce Both": Split the benefit between tenure and EMI reduction
 *
 * All functions are pure and can be unit-tested independently.
 */

import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
import {
	generateAmortizationSchedule,
	groupScheduleByCalendarYear
} from '$lib/tools/calculators/emiEngine.js';
import type {
	MonthlyPaymentEntry,
	PartPaymentScheduleEntry,
	PartPaymentPurpose,
	PartPaymentComparisonResult
} from '$lib/tools/types.js';

// ============================================================================
// PART-PAYMENT MAP BUILDER
// ============================================================================

/**
 * Pre-compute a map of month → total part-payment amount for that month.
 *
 * This avoids the V4 approach of iterating ALL schedules for EVERY month.
 * Instead, we build the map once (O(schedules × occurrences)), then
 * look up each month in O(1) during amortization generation.
 *
 * @param schedules - All part-payment schedules the user has added
 * @returns Map where key = monthIndex, value = total part-payment for that month
 */
function buildPartPaymentMap(schedules: PartPaymentScheduleEntry[]): Map<number, number> {
	const paymentMap = new Map<number, number>();

	for (const schedule of schedules) {
		// Determine the interval (in months) between payments based on frequency
		let intervalMonths: number;

		switch (schedule.frequency) {
			case 'Quarterly':
				intervalMonths = 3;
				break;
			case 'Half-Yearly':
				intervalMonths = 6;
				break;
			case 'Yearly':
				intervalMonths = 12;
				break;
			case 'Every Two Years':
				intervalMonths = 24;
				break;
			case 'Every Three Years':
				intervalMonths = 36;
				break;
			case 'Custom':
				intervalMonths = schedule.customIntervalMonths || 12;
				break;
			case 'Lump Sum':
				// Lump sum: single payment at the start month only
				const existing = paymentMap.get(schedule.startMonthIndex) || 0;
				paymentMap.set(schedule.startMonthIndex, existing + schedule.amount);
				continue; // Skip the loop below
			default:
				intervalMonths = 12;
		}

		// Add the part-payment amount at each interval from start to end
		for (
			let monthIndex = schedule.startMonthIndex;
			monthIndex <= schedule.endMonthIndex;
			monthIndex += intervalMonths
		) {
			const existing = paymentMap.get(monthIndex) || 0;
			paymentMap.set(monthIndex, existing + schedule.amount);
		}
	}

	return paymentMap;
}

// ============================================================================
// AMORTIZATION WITH PART-PAYMENTS
// ============================================================================

/**
 * Generate an amortization schedule that includes part-payments.
 *
 * This is the heart of the Part-Payment Planner. It generates a month-by-month
 * schedule showing how part-payments reduce the loan balance and either
 * shorten the tenure, lower the EMI, or both.
 *
 * @param loanPrincipal - Total loan amount
 * @param annualInterestRate - Annual interest rate as percentage
 * @param tenureInMonths - Original loan tenure in months
 * @param loanStartDate - Loan start date in "YYYY-MM" format
 * @param partPaymentSchedules - All part-payment schedules added by the user
 * @param purpose - What should the part-payment achieve?
 * @returns Complete amortization schedule with part-payments applied
 */
export function generateScheduleWithPartPayments(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate: string,
	partPaymentSchedules: PartPaymentScheduleEntry[],
	purpose: PartPaymentPurpose
): MonthlyPaymentEntry[] {
	const schedule: MonthlyPaymentEntry[] = [];

	// Step 1: Calculate the original EMI (before any part-payments)
	let currentEmiAmount = calculateEMI(loanPrincipal, annualInterestRate, tenureInMonths);
	if (currentEmiAmount <= 0) return schedule;

	// Step 2: Build the part-payment lookup map (O(1) per month)
	const partPaymentMap = buildPartPaymentMap(partPaymentSchedules);

	// Step 3: Convert the annual rate to monthly
	const monthlyInterestRate = annualInterestRate / 100 / 12;

	// Step 4: Parse the start date
	const [startYearStr, startMonthStr] = loanStartDate.split('-');
	const startYear = parseInt(startYearStr, 10);
	const startMonth = parseInt(startMonthStr, 10) - 1; // 0-based

	// Step 5: Generate the schedule month by month
	let remainingLoanBalance = loanPrincipal;

	for (let monthIndex = 0; monthIndex < tenureInMonths + 1; monthIndex++) {
		// Stop if the loan is fully paid off
		if (Math.round(remainingLoanBalance) <= 0) break;

		// Calculate the date for this month
		const currentDate = new Date(startYear, startMonth + monthIndex);
		const monthName = MONTH_NAMES_SHORT[currentDate.getMonth()];
		const year = currentDate.getFullYear();

		// Look up if there's a part-payment scheduled for this month
		let partPaymentForThisMonth = partPaymentMap.get(monthIndex) || 0;

		// Calculate interest on the current remaining balance
		const interestForThisMonth = remainingLoanBalance * monthlyInterestRate;

		// --- Purpose-based EMI adjustment ---
		if (purpose === 'Reduce EMI' && partPaymentForThisMonth > 0) {
			// Recalculate EMI based on reduced principal and remaining tenure
			const remainingMonths = tenureInMonths - monthIndex;
			if (remainingMonths > 0) {
				const reducedPrincipal = remainingLoanBalance - partPaymentForThisMonth;
				if (reducedPrincipal > 0) {
					currentEmiAmount = calculateEMI(reducedPrincipal, annualInterestRate, remainingMonths);
				}
			}
		} else if (purpose === 'Reduce Both' && partPaymentForThisMonth > 0) {
			// Partially reduce EMI — allocate half the benefit to EMI reduction
			const remainingMonths = tenureInMonths - monthIndex;
			if (remainingMonths > 0) {
				const reducedPrincipal = remainingLoanBalance - partPaymentForThisMonth;
				if (reducedPrincipal > 0) {
					const newEmi = calculateEMI(reducedPrincipal, annualInterestRate, remainingMonths);
					// Average between old and new EMI for a balanced reduction
					currentEmiAmount = Math.round((currentEmiAmount + newEmi) / 2);
				}
			}
		}
		// For "Reduce Tenure": keep currentEmiAmount unchanged — loan ends sooner

		// Prevent overpayment in the last month
		let emiForThisMonth = currentEmiAmount;
		if (emiForThisMonth + partPaymentForThisMonth > remainingLoanBalance + interestForThisMonth) {
			if (emiForThisMonth > remainingLoanBalance + interestForThisMonth) {
				emiForThisMonth = remainingLoanBalance + interestForThisMonth;
				partPaymentForThisMonth = 0;
			} else {
				partPaymentForThisMonth = remainingLoanBalance + interestForThisMonth - emiForThisMonth;
			}
		}

		// Calculate principal portion of EMI
		const principalForThisMonth = emiForThisMonth - interestForThisMonth;

		// Update the remaining balance (principal portion + part-payment both reduce it)
		remainingLoanBalance -= principalForThisMonth + partPaymentForThisMonth;
		if (remainingLoanBalance < 0) remainingLoanBalance = 0;

		schedule.push({
			monthNumber: monthIndex + 1,
			formattedDate: `${monthName}-${year}`,
			numericDate: `${year}-${currentDate.getMonth() + 1}`,
			emiAmount: emiForThisMonth,
			interestAmount: interestForThisMonth,
			principalAmount: principalForThisMonth,
			closingBalance: remainingLoanBalance,
			partPaymentAmount: partPaymentForThisMonth
		});
	}

	return schedule;
}

// ============================================================================
// COMPARISON RESULT
// ============================================================================

/**
 * Generate a full comparison between the original loan (no part-payments)
 * and the modified loan (with part-payments).
 *
 * This is the main entry point for the Part-Payment Planner UI.
 * Returns everything needed to render the comparison summary, charts, and table.
 *
 * @param loanPrincipal - Loan amount
 * @param annualInterestRate - Annual rate as percentage
 * @param tenureInMonths - Original tenure in months
 * @param loanStartDate - Start date "YYYY-MM"
 * @param partPaymentSchedules - User's part-payment schedules
 * @param purpose - What should the part-payment achieve?
 * @returns Comparison result with original vs modified schedules and savings
 */
export function computePartPaymentComparison(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate: string,
	partPaymentSchedules: PartPaymentScheduleEntry[],
	purpose: PartPaymentPurpose
): PartPaymentComparisonResult {
	// Step 1: Generate the original schedule (no part-payments — the baseline)
	const originalSchedule = generateAmortizationSchedule(
		loanPrincipal,
		annualInterestRate,
		tenureInMonths,
		loanStartDate
	);

	// Step 2: Generate the modified schedule (with part-payments)
	const modifiedSchedule = generateScheduleWithPartPayments(
		loanPrincipal,
		annualInterestRate,
		tenureInMonths,
		loanStartDate,
		partPaymentSchedules,
		purpose
	);

	// Step 3: Calculate totals for comparison
	const originalTotalInterest = originalSchedule.reduce((sum, e) => sum + e.interestAmount, 0);
	const modifiedTotalInterest = modifiedSchedule.reduce((sum, e) => sum + e.interestAmount, 0);
	const totalPartPaymentsMade = modifiedSchedule.reduce(
		(sum, e) => sum + (e.partPaymentAmount || 0),
		0
	);

	// Step 4: Group modified schedule by year for the table
	const modifiedYearlySummary = groupScheduleByCalendarYear(modifiedSchedule, loanPrincipal);

	return {
		originalSchedule,
		modifiedSchedule,
		originalTotalInterest,
		modifiedTotalInterest,
		interestSaved: originalTotalInterest - modifiedTotalInterest,
		originalTenureMonths: originalSchedule.length,
		modifiedTenureMonths: modifiedSchedule.length,
		tenureSavedMonths: originalSchedule.length - modifiedSchedule.length,
		totalPartPaymentsMade,
		modifiedYearlySummary
	};
}
