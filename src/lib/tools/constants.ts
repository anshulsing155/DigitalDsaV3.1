/**
 * Constants for all calculator and planner tools.
 *
 * This file contains tool listings, default values, and option arrays
 * used across the calculator and planner pages.
 */

import type { ToolInfo } from './types.js';

// ============================================================================
// TOOL LISTINGS
// ============================================================================

/**
 * All available calculators with their metadata.
 * Used by the calculator index page and navigation components.
 */
export const CALCULATOR_LIST: ToolInfo[] = [
	{
		id: 'emi-calculator',
		label: 'EMI Calculator',
		description: 'Calculate your monthly EMI for any loan amount, interest rate, and tenure',
		iconName: 'calculator',
		publicRoute: '/calculators/emi-calculator',
		dashboardRoute: '/dashboard/dsa/tools/emi-calculator',
		isActive: true
	},
	{
		id: 'eligibility-calculator',
		label: 'Eligibility Calculator',
		description: 'Check how much loan you are eligible for based on your income and profile',
		iconName: 'check-circle',
		publicRoute: '/calculators/eligibility-calculator',
		dashboardRoute: '/dashboard/dsa/tools/eligibility-calculator',
		isActive: true
	},
	{
		id: 'affordability-calculator',
		label: 'Affordability Calculator',
		description: 'Find out the maximum property value you can afford with your income',
		iconName: 'home',
		publicRoute: '/calculators/affordability-calculator',
		dashboardRoute: '/dashboard/dsa/tools/affordability-calculator',
		isActive: true
	},
	{
		id: 'balance-transfer-calculator',
		label: 'Balance Transfer Calculator',
		description: 'Compare your current loan with new bank offers to see potential savings',
		iconName: 'arrow-right-left',
		publicRoute: '/calculators/balance-transfer-calculator',
		dashboardRoute: '/dashboard/dsa/tools/balance-transfer-calculator',
		isActive: true
	},
	{
		id: 'stamp-duty-calculator',
		label: 'Stamp Duty Calculator',
		description: 'Calculate stamp duty and registration charges for any state and city',
		iconName: 'stamp',
		publicRoute: '/calculators/stamp-duty-calculator',
		dashboardRoute: '/dashboard/dsa/tools/stamp-duty-calculator',
		isActive: true
	}
];

/**
 * All available planners with their metadata.
 * Used by the planner index page and navigation components.
 */
export const PLANNER_LIST: ToolInfo[] = [
	{
		id: 'part-payment-planner',
		label: 'Part-Payment Planner',
		description: 'Plan part-payments to reduce your loan tenure or EMI and save on interest',
		iconName: 'scissors',
		publicRoute: '/planners/part-payment-planner',
		dashboardRoute: '/dashboard/dsa/tools/part-payment-planner',
		isActive: true
	},
	{
		id: 'flexible-emi-planner',
		label: 'Flexible EMI Planner',
		description: 'Plan EMI changes over time — increase or decrease EMI at specific points',
		iconName: 'trending-up',
		publicRoute: '/planners/flexible-emi-planner',
		dashboardRoute: '/dashboard/dsa/tools/flexible-emi-planner',
		isActive: true
	},
	{
		id: 'both',
		label: 'Part-Payments & EMI Planner',
		description: 'Combine part-payments and EMI changes for maximum interest savings',
		iconName: 'layers',
		publicRoute: '/planners/both',
		dashboardRoute: '/dashboard/dsa/tools/both',
		isActive: true
	},
	{
		id: 'rate-ripple-planner',
		label: 'Rate Ripple Planner',
		description:
			'Simulate interest rate changes, prepayments & EMI adjustments on your existing loan',
		iconName: 'activity',
		publicRoute: '/planners/rate-ripple-planner',
		dashboardRoute: '/dashboard/dsa/tools/rate-ripple-planner',
		isActive: true
	}
];

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default values for loan-related inputs.
 * These provide sensible starting points for Indian home loans.
 */
export const LOAN_DEFAULTS = {
	/** Default loan amount: ₹50,00,000 (50 Lakhs) */
	PRINCIPAL: 5_000_000,

	/** Default annual interest rate: 8.5% */
	INTEREST_RATE: 8.5,

	/** Default loan tenure: 20 years */
	TENURE_YEARS: 20,

	/** Default tenure in months: 240 months */
	TENURE_MONTHS: 240,

	/** Minimum loan amount: ₹50,000 */
	MIN_PRINCIPAL: 50_000,

	/** Maximum loan amount: ₹100 Crore */
	MAX_PRINCIPAL: 1_000_000_000,

	/** Minimum interest rate: 3.5% */
	MIN_INTEREST_RATE: 3.5,

	/** Maximum interest rate: 30% */
	MAX_INTEREST_RATE: 30,

	/** Minimum tenure: 1 year / 12 months */
	MIN_TENURE_MONTHS: 12,

	/** Maximum tenure: 30 years / 360 months */
	MAX_TENURE_MONTHS: 360,

	/** Maximum tenure in years */
	MAX_TENURE_YEARS: 30,

	/** Default applicant age */
	DEFAULT_AGE: 30
} as const;

// ============================================================================
// OPTION ARRAYS
// ============================================================================

/** Tenure frequency options: whether the user enters months or years */
export const FREQUENCY_OPTIONS = [
	{ label: 'Months', value: 'Months' },
	{ label: 'Years', value: 'Years' }
] as const;

/** Part-payment frequency options */
export const PART_PAYMENT_FREQUENCY_OPTIONS = [
	{ label: 'Quarterly', value: 'Quarterly' },
	{ label: 'Half-Yearly', value: 'Half-Yearly' },
	{ label: 'Yearly', value: 'Yearly' },
	{ label: 'Every Two Years', value: 'Every Two Years' },
	{ label: 'Every Three Years', value: 'Every Three Years' },
	{ label: 'Lump Sum', value: 'Lump Sum' },
	{ label: 'Custom', value: 'Custom' }
] as const;

/** Part-payment purpose options */
export const PART_PAYMENT_PURPOSE_OPTIONS = [
	{ label: 'Reduce Tenure', value: 'Reduce Tenure' },
	{ label: 'Reduce EMI', value: 'Reduce EMI' },
	{ label: 'Reduce Both', value: 'Reduce Both' }
] as const;

/** Occupation options (affects max retirement age) */
export const OCCUPATION_OPTIONS = [
	{ label: 'Government', value: 'Government' },
	{ label: 'Private', value: 'Private' },
	{ label: 'Self-Employed / Business', value: 'Business' }
] as const;

/**
 * Maximum retirement age by occupation.
 * This limits the maximum loan tenure (loan must end before retirement).
 */
export const MAX_AGE_BY_OCCUPATION: Record<string, number> = {
	Government: 65,
	Private: 60,
	Business: 70
};

/** Loan planning type options */
export const LOAN_PLANNING_OPTIONS = [
	{ label: 'An Existing Loan', value: 'Existing Loan' },
	{ label: 'A New Loan', value: 'New Loan' }
] as const;

/** Buyer gender options (for stamp duty) */
export const GENDER_OPTIONS = [
	{ label: 'Male', value: 'Male' },
	{ label: 'Female', value: 'Female' },
	{ label: 'Joint Ownership', value: 'Joint' }
] as const;

// ============================================================================
// MONTH NAMES
// ============================================================================

/** Short month names for formatting dates in schedules */
export const MONTH_NAMES_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;
