/**
 * EMI Calculator Engine — Pure math functions for EMI and amortization.
 *
 * This module provides all the calculation logic for the EMI Calculator tool.
 * It builds on the existing `calculateEMI()` function from the rule engine
 * and adds amortization schedule generation and yearly grouping.
 *
 * All functions are pure (no side effects) and can be unit-tested independently.
 */

import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
import type {
	MonthlyPaymentEntry,
	YearlyPaymentSummary,
	EmiCalculatorResult
} from '$lib/tools/types.js';

// Re-export calculateEMI so consumers can import everything from one place
export { calculateEMI };

// ============================================================================
// PRECISE EMI CALCULATION (UNROUNDED)
// ============================================================================

/**
 * Calculate the PRECISE EMI without rounding.
 *
 * WHY: The rule engine's calculateEMI() rounds to the nearest rupee.
 * That rounding error (even ₹0.35/month) compounds over 240 months
 * into a residual of ~₹84, forcing the last month to have a different EMI.
 *
 * By keeping full floating-point precision during amortization,
 * every month pays EXACTLY the same amount, and the loan closes
 * to zero in exactly the specified number of months.
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as percentage (e.g. 8.5)
 * @param tenureMonths - Number of months
 * @returns Precise EMI as a floating-point number (NOT rounded)
 */
function calculatePreciseEMI(principal: number, annualRate: number, tenureMonths: number): number {
	if (principal <= 0 || tenureMonths <= 0) return 0;
	if (annualRate <= 0) return principal / tenureMonths;

	const monthlyRate = annualRate / 100 / 12;
	const factor = Math.pow(1 + monthlyRate, tenureMonths);
	return (principal * monthlyRate * factor) / (factor - 1);
}

// ============================================================================
// AMORTIZATION SCHEDULE GENERATION
// ============================================================================

/**
 * Generate a complete month-by-month amortization schedule for a loan.
 *
 * This is the core function that shows exactly how a loan gets paid off:
 * - How much of each EMI goes towards interest vs principal
 * - How the outstanding balance decreases each month
 * - When the loan is fully paid off
 *
 * @param loanPrincipal - The total loan amount (e.g., 5000000 for ₹50L)
 * @param annualInterestRate - Annual rate as percentage (e.g., 8.5 for 8.5%)
 * @param tenureInMonths - Loan duration in months (e.g., 240 for 20 years)
 * @param loanStartDate - When the loan starts, in "YYYY-MM" format (e.g., "2025-01")
 * @returns Array of monthly payment entries showing the full repayment journey
 */
export function generateAmortizationSchedule(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate?: string
): MonthlyPaymentEntry[] {
	const schedule: MonthlyPaymentEntry[] = [];

	// Step 1: Calculate the PRECISE (unrounded) monthly EMI
	// WHY precise? If we round the EMI (e.g. 43,391.35 → 43,391), we underpay
	// by ₹0.35 each month. Over 240 months that's ~₹84 left unpaid, forcing
	// the last month to have a DIFFERENT EMI. Using the precise value ensures
	// every month has the exact same EMI and the loan closes to ₹0.
	const preciseEmiAmount = calculatePreciseEMI(loanPrincipal, annualInterestRate, tenureInMonths);
	if (preciseEmiAmount <= 0) return schedule;

	// The rounded EMI is what we display to the user (whole rupees)
	const displayEmiAmount = Math.round(preciseEmiAmount);

	// Step 2: Convert the annual rate to a monthly rate
	// Banks quote annual rates, but interest is charged monthly
	const monthlyInterestRate = annualInterestRate / 100 / 12;

	// Step 3: Parse the start date (defaults to current month if not provided)
	const now = new Date();
	let startYear = now.getFullYear();
	let startMonth = now.getMonth(); // 0-based (0 = Jan, 11 = Dec)

	if (loanStartDate) {
		const [yearStr, monthStr] = loanStartDate.split('-');
		startYear = parseInt(yearStr, 10);
		startMonth = parseInt(monthStr, 10) - 1; // Convert to 0-based
	}

	// Step 4: Generate each month's payment breakdown using PRECISE EMI
	// All internal calculations use the unrounded EMI for mathematical accuracy.
	// Display values are rounded at the end (in the schedule entry).
	let remainingLoanBalance = loanPrincipal;

	for (let monthIndex = 0; monthIndex < tenureInMonths; monthIndex++) {
		// Calculate the date for this month
		const currentDate = new Date(startYear, startMonth + monthIndex);
		const monthName = MONTH_NAMES_SHORT[currentDate.getMonth()];
		const year = currentDate.getFullYear();

		// Calculate interest for this month on the remaining balance
		// In early months, interest is high because the balance is large
		const interestForThisMonth = remainingLoanBalance * monthlyInterestRate;

		// Determine the EMI for this month
		let emiForThisMonth: number;

		const isLastMonth = monthIndex === tenureInMonths - 1;
		if (isLastMonth) {
			// LAST MONTH: Pay off whatever remains (balance + this month's interest)
			// Due to floating-point arithmetic, there may be a tiny residual
			// (typically < ₹0.01). We settle it cleanly here so the loan
			// closes to exactly ₹0 in exactly N months.
			emiForThisMonth = remainingLoanBalance + interestForThisMonth;
		} else {
			// ALL OTHER MONTHS: Use the precise (unrounded) EMI
			emiForThisMonth = preciseEmiAmount;
		}

		// The principal portion = EMI minus interest
		// This is the amount that actually reduces your loan balance
		const principalForThisMonth = emiForThisMonth - interestForThisMonth;

		// Update the remaining balance
		remainingLoanBalance -= principalForThisMonth;

		// Snap to zero if the balance is negligibly small (floating-point dust)
		// This catches residuals like 0.00000001 from IEEE 754 arithmetic
		if (Math.abs(remainingLoanBalance) < 0.01) remainingLoanBalance = 0;

		// Add this month's entry to the schedule
		// NOTE: We store the DISPLAY (rounded) EMI for all months.
		// The last month's EMI will be almost identical (within ±₹1 at most)
		// because the precise EMI eliminates the compounding rounding error.
		schedule.push({
			monthNumber: monthIndex + 1,
			formattedDate: `${monthName}-${year}`,
			numericDate: `${year}-${currentDate.getMonth() + 1}`,
			emiAmount: isLastMonth ? Math.round(emiForThisMonth) : displayEmiAmount,
			interestAmount: interestForThisMonth,
			principalAmount: principalForThisMonth,
			closingBalance: remainingLoanBalance
		});
	}

	return schedule;
}

// ============================================================================
// YEARLY GROUPING
// ============================================================================

/**
 * Group monthly payment entries by calendar year (January to December).
 *
 * This transforms the detailed monthly schedule into a more digestible
 * yearly view, showing totals for each calendar year.
 *
 * @param monthlySchedule - The full monthly amortization schedule
 * @param loanPrincipal - Original loan amount (needed for loan-paid-percentage calculation)
 * @returns Array of yearly summaries, each containing its monthly entries
 */
export function groupScheduleByCalendarYear(
	monthlySchedule: MonthlyPaymentEntry[],
	loanPrincipal: number
): YearlyPaymentSummary[] {
	if (monthlySchedule.length === 0) return [];

	// Group entries by extracting the year from each entry's formatted date
	const yearGroups = new Map<string, MonthlyPaymentEntry[]>();

	for (const entry of monthlySchedule) {
		// Extract year from "Jan-2025" format → "2025"
		const year = entry.formattedDate.split('-')[1];
		if (!yearGroups.has(year)) {
			yearGroups.set(year, []);
		}
		yearGroups.get(year)!.push(entry);
	}

	// Convert each group into a yearly summary with aggregated totals
	return buildYearlySummaries(yearGroups, loanPrincipal);
}

/**
 * Group monthly payment entries by Indian financial year (April to March).
 *
 * Financial year in India runs from April to March.
 * So "Feb-2025" belongs to FY "2024-2025", and "May-2025" belongs to FY "2025-2026".
 *
 * @param monthlySchedule - The full monthly amortization schedule
 * @param loanPrincipal - Original loan amount
 * @returns Array of yearly summaries grouped by financial year
 */
export function groupScheduleByFinancialYear(
	monthlySchedule: MonthlyPaymentEntry[],
	loanPrincipal: number
): YearlyPaymentSummary[] {
	if (monthlySchedule.length === 0) return [];

	const yearGroups = new Map<string, MonthlyPaymentEntry[]>();

	for (const entry of monthlySchedule) {
		// Parse the month and year from "Jan-2025"
		const [monthName, yearStr] = entry.formattedDate.split('-');
		const year = parseInt(yearStr, 10);
		const monthIndex = MONTH_NAMES_SHORT.indexOf(monthName as (typeof MONTH_NAMES_SHORT)[number]);

		// Determine the financial year:
		// April (month 3) onwards = current year FY, Jan-Mar = previous year FY
		let financialYearLabel: string;
		if (monthIndex >= 3) {
			// April to December → FY starts this year
			financialYearLabel = `${year}-${year + 1}`;
		} else {
			// January to March → FY started last year
			financialYearLabel = `${year - 1}-${year}`;
		}

		if (!yearGroups.has(financialYearLabel)) {
			yearGroups.set(financialYearLabel, []);
		}
		yearGroups.get(financialYearLabel)!.push(entry);
	}

	return buildYearlySummaries(yearGroups, loanPrincipal);
}

/**
 * Internal helper: Convert grouped monthly entries into yearly summary objects.
 *
 * Calculates totals (EMI, principal, interest, part-payments) and
 * the cumulative loan-paid percentage for each year.
 */
function buildYearlySummaries(
	yearGroups: Map<string, MonthlyPaymentEntry[]>,
	loanPrincipal: number
): YearlyPaymentSummary[] {
	const summaries: YearlyPaymentSummary[] = [];
	let cumulativePrincipalPaid = 0;

	for (const [yearLabel, entries] of yearGroups) {
		// Aggregate all monthly values for this year
		const totalEmiPaid = entries.reduce((sum, e) => sum + e.emiAmount, 0);
		const totalInterestPaid = entries.reduce((sum, e) => sum + e.interestAmount, 0);
		const totalPrincipalPaid = entries.reduce((sum, e) => sum + e.principalAmount, 0);
		const totalPartPayments = entries.reduce((sum, e) => sum + (e.partPaymentAmount || 0), 0);

		// Track cumulative principal to calculate loan-paid percentage
		cumulativePrincipalPaid += totalPrincipalPaid + totalPartPayments;

		// Opening balance = first month's closing + that month's principal + part-payment
		const firstEntry = entries[0];
		const openingBalance =
			firstEntry.closingBalance + firstEntry.principalAmount + (firstEntry.partPaymentAmount || 0);

		// Closing balance = last month's closing balance
		const closingBalance = entries[entries.length - 1].closingBalance;

		// What percentage of the original loan has been paid off so far
		const loanPaidPercentage = Math.min(100, (cumulativePrincipalPaid / loanPrincipal) * 100);

		summaries.push({
			yearLabel,
			totalEmiPaid,
			totalInterestPaid,
			totalPrincipalPaid,
			totalPartPayments,
			openingBalance,
			closingBalance,
			monthCount: entries.length,
			loanPaidPercentage,
			monthlyEntries: entries
		});
	}

	return summaries;
}

// ============================================================================
// COMPLETE EMI CALCULATION
// ============================================================================

/**
 * Run the complete EMI calculation and return all results at once.
 *
 * This is the main entry point for the EMI Calculator component.
 * It calculates the EMI, generates the full schedule, and groups it
 * by both calendar and financial year.
 *
 * @param loanPrincipal - Loan amount in INR
 * @param annualInterestRate - Annual rate as percentage
 * @param tenureInMonths - Duration in months
 * @param loanStartDate - Start date in "YYYY-MM" format
 * @returns Complete calculation results including schedule and summaries
 */
export function computeFullEmiResult(
	loanPrincipal: number,
	annualInterestRate: number,
	tenureInMonths: number,
	loanStartDate?: string
): EmiCalculatorResult {
	// Step 1: Calculate the monthly EMI
	const monthlyEmiAmount = calculateEMI(loanPrincipal, annualInterestRate, tenureInMonths);

	// Step 2: Generate the complete month-by-month schedule
	const monthlySchedule = generateAmortizationSchedule(
		loanPrincipal,
		annualInterestRate,
		tenureInMonths,
		loanStartDate
	);

	// Step 3: Calculate total interest from the schedule
	// (more accurate than EMI * months - principal, due to rounding)
	const totalInterestPaid = monthlySchedule.reduce((sum, entry) => sum + entry.interestAmount, 0);

	// Step 4: Group the schedule by calendar year and financial year
	const calendarYearSummary = groupScheduleByCalendarYear(monthlySchedule, loanPrincipal);
	const financialYearSummary = groupScheduleByFinancialYear(monthlySchedule, loanPrincipal);

	return {
		monthlyEmiAmount,
		totalInterestPaid,
		totalAmountPaid: loanPrincipal + totalInterestPaid,
		monthlySchedule,
		calendarYearSummary,
		financialYearSummary
	};
}
