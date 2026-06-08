/**
 * Shared TypeScript types for all calculator and planner tools.
 *
 * These types define the data structures used across EMI calculators,
 * loan planners, stamp duty calculators, and budget planners.
 * They ensure consistency between engine functions and UI components.
 */

// ============================================================================
// AMORTIZATION & SCHEDULE TYPES
// ============================================================================

/**
 * A single month's payment breakdown in a loan amortization schedule.
 * This is the fundamental unit that all calculators and planners build upon.
 */
export interface MonthlyPaymentEntry {
	/** Which month in the schedule (1-based: month 1, month 2, etc.) */
	monthNumber: number;

	/** Human-readable date like "Jan-2025" for display in tables */
	formattedDate: string;

	/** Machine-readable date like "2025-1" for sorting and grouping */
	numericDate: string;

	/** The EMI amount paid this month (principal + interest portion) */
	emiAmount: number;

	/** The interest component of this month's payment */
	interestAmount: number;

	/** The principal component of this month's payment (reduces the loan balance) */
	principalAmount: number;

	/** The remaining loan balance after this month's payment */
	closingBalance: number;

	/** Any extra payment made this month to reduce the principal faster (optional) */
	partPaymentAmount?: number;
}

/**
 * A summary of all payments grouped by year (calendar or financial year).
 * Each year can be expanded to show individual monthly entries.
 */
export interface YearlyPaymentSummary {
	/** The year label, e.g. "2025" (calendar) or "2025-2026" (financial) */
	yearLabel: string;

	/** Total EMI paid during this year */
	totalEmiPaid: number;

	/** Total interest paid during this year */
	totalInterestPaid: number;

	/** Total principal repaid during this year */
	totalPrincipalPaid: number;

	/** Total part-payments (extra payments) made during this year */
	totalPartPayments: number;

	/** Opening loan balance at the start of this year */
	openingBalance: number;

	/** Closing loan balance at the end of this year */
	closingBalance: number;

	/** How many months of payments fall in this year */
	monthCount: number;

	/** What percentage of the total loan has been paid off by end of this year */
	loanPaidPercentage: number;

	/** The individual monthly entries that make up this year (for drill-down) */
	monthlyEntries: MonthlyPaymentEntry[];

	/** Whether the year's monthly details are expanded in the UI */
	isExpanded?: boolean;
}

// ============================================================================
// EMI CALCULATOR TYPES
// ============================================================================

/** Input parameters for the EMI calculator */
export interface EmiCalculatorInputs {
	/** The total loan amount (principal) in INR */
	loanPrincipal: number;

	/** Annual interest rate as a percentage, e.g. 8.5 for 8.5% */
	annualInterestRate: number;

	/** Loan duration — the number depends on frequencyUnit */
	tenureValue: number;

	/** Whether tenure is specified in months or years */
	frequencyUnit: 'Months' | 'Years';

	/** When the loan starts — used for generating dated schedule */
	loanStartDate?: string; // "YYYY-MM" format
}

/** Computed results from the EMI calculator */
export interface EmiCalculatorResult {
	/** The fixed monthly EMI amount */
	monthlyEmiAmount: number;

	/** Total interest paid over the entire loan duration */
	totalInterestPaid: number;

	/** Total amount paid = principal + total interest */
	totalAmountPaid: number;

	/** Full month-by-month amortization schedule */
	monthlySchedule: MonthlyPaymentEntry[];

	/** Schedule grouped by calendar year (Jan-Dec) */
	calendarYearSummary: YearlyPaymentSummary[];

	/** Schedule grouped by financial year (Apr-Mar) */
	financialYearSummary: YearlyPaymentSummary[];
}

// ============================================================================
// PART-PAYMENT PLANNER TYPES
// ============================================================================

/** Frequency options for recurring part-payments */
export type PartPaymentFrequency =
	| 'Quarterly'
	| 'Half-Yearly'
	| 'Yearly'
	| 'Every Two Years'
	| 'Every Three Years'
	| 'Lump Sum'
	| 'Custom';

/** What should the part-payment reduce? */
export type PartPaymentPurpose = 'Reduce Tenure' | 'Reduce EMI' | 'Reduce Both';

/**
 * A single part-payment schedule entry.
 * A user can add multiple part-payment schedules with different frequencies.
 */
export interface PartPaymentScheduleEntry {
	/** Unique identifier for this entry (for edit/delete operations) */
	id: string;

	/** How often the part-payment is made */
	frequency: PartPaymentFrequency;

	/** The part-payment amount in INR */
	amount: number;

	/** Month index when this part-payment schedule starts (0-based from loan start) */
	startMonthIndex: number;

	/** Month index when this part-payment schedule ends */
	endMonthIndex: number;

	/** For custom frequency: interval in months between payments */
	customIntervalMonths?: number;

	/** Human-readable start date for display */
	startDateLabel?: string;

	/** Human-readable end date for display */
	endDateLabel?: string;
}

/** Input parameters for the part-payment planner */
export interface PartPaymentPlannerInputs {
	/** Is this an existing loan or a new loan? */
	loanType: 'Existing Loan' | 'New Loan';

	/** The loan principal (current outstanding for existing, total for new) */
	loanPrincipal: number;

	/** Annual interest rate */
	annualInterestRate: number;

	/** Remaining tenure in months */
	tenureInMonths: number;

	/** Loan start date in "YYYY-MM" format */
	loanStartDate: string;

	/** What should part-payments reduce? */
	purpose: PartPaymentPurpose;

	/** Applicant's occupation (affects max age/tenure constraints) */
	occupation?: 'Government' | 'Private' | 'Business';

	/** Applicant's current age */
	applicantAge?: number;

	/** All part-payment schedules the user has added */
	partPaymentSchedules: PartPaymentScheduleEntry[];
}

/** Comparison results: with vs without part-payments */
export interface PartPaymentComparisonResult {
	/** Schedule WITHOUT any part-payments (baseline) */
	originalSchedule: MonthlyPaymentEntry[];

	/** Schedule WITH part-payments applied */
	modifiedSchedule: MonthlyPaymentEntry[];

	/** Original total interest (no part-payments) */
	originalTotalInterest: number;

	/** Modified total interest (with part-payments) */
	modifiedTotalInterest: number;

	/** How much interest was saved by making part-payments */
	interestSaved: number;

	/** Original tenure in months */
	originalTenureMonths: number;

	/** Modified tenure in months (may be shorter if purpose is reduce tenure) */
	modifiedTenureMonths: number;

	/** How many months of tenure were saved */
	tenureSavedMonths: number;

	/** Total part-payment amount across all schedules */
	totalPartPaymentsMade: number;

	/** Yearly summary of modified schedule (for table display) */
	modifiedYearlySummary: YearlyPaymentSummary[];
}

// ============================================================================
// FLEXIBLE EMI PLANNER TYPES
// ============================================================================

/** How the EMI is being changed */
export type EmiChangeMode =
	| 'set_amount' // Set EMI to a specific ₹ amount
	| 'increase_percent' // Increase current EMI by X%
	| 'decrease_percent' // Decrease current EMI by X%
	| 'increase_amount' // Increase current EMI by ₹X
	| 'decrease_amount'; // Decrease current EMI by ₹X

/** A point where the EMI amount changes (increase or decrease) */
export interface EmiChangePoint {
	/** Unique identifier */
	id: string;

	/** At which month (0-based from loan start) does the EMI change? */
	atMonthIndex: number;

	/** The new EMI amount after this change point (used by engine for set_amount mode) */
	newEmiAmount: number;

	/** Human-readable date label for display */
	dateLabel?: string;

	/** How the EMI is being changed — defaults to 'set_amount' for backward compat */
	changeMode?: EmiChangeMode;

	/** The user-entered value: ₹ amount for set/increase/decrease_amount, % for percent modes */
	value?: number;

	/** Optional: month index where this change reverts (for temporary changes) */
	endMonthIndex?: number;

	/** Human-readable end date label */
	endDateLabel?: string;
}

// ============================================================================
// BUDGET PLANNER TYPES
// ============================================================================

/** A single income or expense line item */
export interface BudgetLineItem {
	/** Unique identifier */
	id: string;

	/** Description of this income/expense, e.g. "Salary", "Rent", "Groceries" */
	label: string;

	/** Monthly amount in INR */
	monthlyAmount: number;
}

/** Complete budget data structure */
export interface BudgetData {
	/** All income sources */
	incomeItems: BudgetLineItem[];

	/** Household/essential expenses */
	householdExpenses: BudgetLineItem[];

	/** Lifestyle/discretionary expenses */
	lifestyleExpenses: BudgetLineItem[];
}

/** Budget summary computed from income and expenses */
export interface BudgetSummary {
	/** Total monthly income */
	totalIncome: number;

	/** Total household expenses */
	totalHouseholdExpenses: number;

	/** Total lifestyle expenses */
	totalLifestyleExpenses: number;

	/** Total of all expenses */
	totalExpenses: number;

	/** Income minus expenses */
	monthlySurplus: number;

	/** What percentage of income is saved */
	savingsRate: number;

	/** Recommended maximum EMI based on surplus (typically 40-50% of surplus) */
	recommendedMaxEmi: number;
}

// ============================================================================
// STAMP DUTY CALCULATOR TYPES
// ============================================================================

/** Input for stamp duty calculation */
export interface StampDutyInputs {
	/** Indian state name */
	stateName: string;

	/** City within the state */
	cityName: string;

	/** Market/registry value of the property */
	propertyValue: number;

	/** Gender of the property buyer */
	buyerGender: 'Male' | 'Female' | 'Joint';

	/** Is the buyer a resident of the state? */
	isResident: boolean;
}

/** Stamp duty calculation result */
export interface StampDutyResult {
	/** Stamp duty amount */
	stampDutyAmount: number;

	/** Stamp duty as percentage of property value */
	stampDutyPercentage: number;

	/** Registration charge amount */
	registrationChargeAmount: number;

	/** Registration charge as percentage */
	registrationChargePercentage: number;

	/** Total cost (stamp duty + registration) */
	totalCharges: number;
}

// ============================================================================
// TOOL NAVIGATION TYPES
// ============================================================================

/** Metadata for a single calculator or planner tool */
export interface ToolInfo {
	/** URL-friendly identifier, e.g. "emi-calculator" */
	id: string;

	/** Display name, e.g. "EMI Calculator" */
	label: string;

	/** Short description for cards/tooltips */
	description: string;

	/** Lucide icon name */
	iconName: string;

	/** Public route path */
	publicRoute: string;

	/** Dashboard route path */
	dashboardRoute: string;

	/** Whether this tool is currently available */
	isActive: boolean;
}
