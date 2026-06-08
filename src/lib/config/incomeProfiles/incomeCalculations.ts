/**
 * Income Display Utilities
 * ===================================================================
 * Formatting and display helpers for income data.
 *
 * All computation functions (monthlyEquivalent, incomeSummary, etc.)
 * have been removed. Income aggregation and lender-specific calculations
 * are the Rule Engine's responsibility, operating on raw
 * IncomeSourceEntry[] data.
 * ===================================================================
 */

import type { IncomeSourceEntry, ProfitFrequency } from '$lib/types/incomeProfile';

// ============================================================================
// UTILITY: Format income for display
// ============================================================================

/**
 * Format a number as Indian currency string.
 * e.g., 150000 -> "₹1,50,000"
 */
export function formatIncomeCurrency(amount: number): string {
	if (!amount || isNaN(amount)) return '₹0';

	const isNegative = amount < 0;
	const absAmount = Math.abs(Math.round(amount));
	const str = absAmount.toString();

	if (str.length <= 3) {
		return `${isNegative ? '-' : ''}₹${str}`;
	}

	// Indian number system: last 3 digits, then groups of 2
	const lastThree = str.slice(-3);
	const remaining = str.slice(0, -3);
	const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;

	return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Format a number with Indian grouping (without currency symbol).
 * e.g., 150000 -> "1,50,000"
 */
export function formatIndianNumber(amount: number): string {
	if (!amount || isNaN(amount)) return '0';

	const absAmount = Math.abs(Math.round(amount));
	const str = absAmount.toString();

	if (str.length <= 3) return str;

	const lastThree = str.slice(-3);
	const remaining = str.slice(0, -3);
	return remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

/**
 * Get a human-readable label for the income frequency
 */
export function getFrequencyLabel(frequency: ProfitFrequency): string {
	const labels: Record<ProfitFrequency, string> = {
		monthly: 'Monthly',
		quarterly: 'Quarterly',
		half_yearly: 'Half-Yearly',
		annual: 'Annually',
		as_and_when: 'As & When'
	};
	return labels[frequency] || frequency;
}

/**
 * Compute the evidence summary text for an entry
 */
export function getEvidenceSummary(entry: IncomeSourceEntry): {
	label: string;
	color: string;
	icon: string;
} {
	const hasItr = entry.evidence.itrFiled;
	const hasDoc = entry.evidence.hasDocumentaryEvidence;

	if (hasItr && hasDoc) {
		return {
			label: 'Fully Verifiable',
			color: 'text-green-600',
			icon: 'CheckCircle2'
		};
	}
	if (hasItr || hasDoc) {
		return {
			label: 'Partially Verifiable',
			color: 'text-stone-600',
			icon: 'AlertCircle'
		};
	}
	return {
		label: 'Declared Only',
		color: 'text-red-500',
		icon: 'AlertTriangle'
	};
}
