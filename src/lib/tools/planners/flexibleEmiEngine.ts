/**
 * Flexible EMI Planner Engine — Amortization with EMI changes over time.
 *
 * This engine lets users see what happens if they increase or decrease
 * their EMI at specific points during the loan. For example:
 * - "After 5 years, I'll get a raise — increase EMI by ₹10,000"
 * - "After 10 years, reduce EMI as kids move out"
 *
 * The schedule is recalculated from each change point forward,
 * so the remaining tenure adjusts accordingly.
 */

import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
import {
	generateAmortizationSchedule,
	groupScheduleByCalendarYear
} from '$lib/tools/calculators/emiEngine.js';
import type {
	MonthlyPaymentEntry,
	EmiChangePoint,
	EmiChangeMode,
	YearlyPaymentSummary
} from '$lib/tools/types.js';

// ============================================================================
// HELPERS — Apply EMI change by mode
// ============================================================================

/**
 * Compute the new EMI amount based on the change mode.
 * For percentage modes, the change is relative to the current EMI at time of change.
 */
export function applyEmiChange(currentEmi: number, changePoint: EmiChangePoint): number {
	const mode: EmiChangeMode = changePoint.changeMode ?? 'set_amount';
	const value = changePoint.value ?? changePoint.newEmiAmount;

	switch (mode) {
		case 'set_amount':
			return value;
		case 'increase_percent':
			return Math.round(currentEmi * (1 + value / 100));
		case 'decrease_percent':
			return Math.round(currentEmi * (1 - value / 100));
		case 'increase_amount':
			return currentEmi + value;
		case 'decrease_amount':
			return Math.max(0, currentEmi - value);
		default:
			return value;
	}
}

// ============================================================================
// SCHEDULE WITH EMI CHANGES
// ============================================================================

/**
 * Generate an amortization schedule where the EMI amount changes at
 * specified points during the loan.
 *
 * @param loanPrincipal - Loan amount
 * @param annualInterestRate - Annual rate as percentage
 * @param tenureInMonths - Original tenure in months
 * @param loanStartDate - Start date "YYYY-MM"
 * @param emiChangePoints - Points where EMI amount changes (sorted by month)
 * @returns Modified amortization schedule
 */
export function generateScheduleWithEmiChanges(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate: string,
	emiChangePoints: EmiChangePoint[]
): MonthlyPaymentEntry[] {
	const schedule: MonthlyPaymentEntry[] = [];

	// Step 1: Calculate the initial EMI
	let currentEmiAmount = calculateEMI(loanPrincipal, annualInterestRate, tenureInMonths);
	if (currentEmiAmount <= 0) return schedule;

	// Step 2: Sort change points by month (earliest first)
	const sortedChangePoints = [...emiChangePoints].sort((a, b) => a.atMonthIndex - b.atMonthIndex);

	// Step 3: Build maps for O(1) lookup
	// Start map: monthIndex → change point (when the change begins)
	const emiStartMap = new Map<number, EmiChangePoint>();
	// End map: monthIndex → EMI to revert to (when a temporary change ends)
	const emiEndMap = new Map<number, number>();

	for (const cp of sortedChangePoints) {
		emiStartMap.set(cp.atMonthIndex, cp);
	}

	// Step 4: Parse start date
	const monthlyInterestRate = annualInterestRate / 100 / 12;
	const [startYearStr, startMonthStr] = loanStartDate.split('-');
	const startYear = parseInt(startYearStr, 10);
	const startMonth = parseInt(startMonthStr, 10) - 1;

	// Step 5: Generate the schedule
	let remainingLoanBalance = loanPrincipal;
	// Allow extra months in case EMI decreases extend the tenure
	const maxMonths = tenureInMonths * 2;

	// Track EMI before each temporary change so we can revert
	let emiBeforeTemporaryChange = currentEmiAmount;

	for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
		if (Math.round(remainingLoanBalance) <= 0) break;

		// Check if a temporary change ends at this month — revert EMI
		if (emiEndMap.has(monthIndex)) {
			currentEmiAmount = emiEndMap.get(monthIndex)!;
		}

		// Check if a new EMI change starts at this month
		if (emiStartMap.has(monthIndex)) {
			const changePoint = emiStartMap.get(monthIndex)!;
			emiBeforeTemporaryChange = currentEmiAmount;
			currentEmiAmount = applyEmiChange(currentEmiAmount, changePoint);

			// If this is a temporary change, schedule the reversion
			if (changePoint.endMonthIndex != null && changePoint.endMonthIndex > monthIndex) {
				emiEndMap.set(changePoint.endMonthIndex, emiBeforeTemporaryChange);
			}
		}

		const currentDate = new Date(startYear, startMonth + monthIndex);
		const monthName = MONTH_NAMES_SHORT[currentDate.getMonth()];
		const year = currentDate.getFullYear();

		const interestForThisMonth = remainingLoanBalance * monthlyInterestRate;

		// Ensure EMI covers at least the interest (otherwise loan never ends)
		let emiForThisMonth = Math.max(currentEmiAmount, interestForThisMonth + 1);

		// Handle final month — don't overpay
		if (emiForThisMonth > remainingLoanBalance + interestForThisMonth) {
			emiForThisMonth = remainingLoanBalance + interestForThisMonth;
		}

		const principalForThisMonth = emiForThisMonth - interestForThisMonth;
		remainingLoanBalance -= principalForThisMonth;
		if (remainingLoanBalance < 0) remainingLoanBalance = 0;

		schedule.push({
			monthNumber: monthIndex + 1,
			formattedDate: `${monthName}-${year}`,
			numericDate: `${year}-${currentDate.getMonth() + 1}`,
			emiAmount: emiForThisMonth,
			interestAmount: interestForThisMonth,
			principalAmount: principalForThisMonth,
			closingBalance: remainingLoanBalance
		});
	}

	return schedule;
}

/**
 * Compute the full comparison for the Flexible EMI Planner.
 *
 * @returns Original schedule, modified schedule, yearly summaries, and savings
 */
export function computeFlexibleEmiComparison(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate: string,
	emiChangePoints: EmiChangePoint[]
) {
	const originalSchedule = generateAmortizationSchedule(
		loanPrincipal,
		annualInterestRate,
		tenureInMonths,
		loanStartDate
	);

	const modifiedSchedule = generateScheduleWithEmiChanges(
		loanPrincipal,
		annualInterestRate,
		tenureInMonths,
		loanStartDate,
		emiChangePoints
	);

	const originalTotalInterest = originalSchedule.reduce((sum, e) => sum + e.interestAmount, 0);
	const modifiedTotalInterest = modifiedSchedule.reduce((sum, e) => sum + e.interestAmount, 0);

	return {
		originalSchedule,
		modifiedSchedule,
		originalTotalInterest,
		modifiedTotalInterest,
		interestSaved: originalTotalInterest - modifiedTotalInterest,
		originalTenureMonths: originalSchedule.length,
		modifiedTenureMonths: modifiedSchedule.length,
		tenureSavedMonths: originalSchedule.length - modifiedSchedule.length,
		modifiedYearlySummary: groupScheduleByCalendarYear(modifiedSchedule, loanPrincipal)
	};
}
