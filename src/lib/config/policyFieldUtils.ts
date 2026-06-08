/**
 * Shared Policy Field Utilities
 * ══════════════════════════════════════════════════════════════════
 * Pure data + formatters for policy fields. Used by:
 *   - policyDocGenerator.ts (server HTML/markdown generation)
 *   - PolicyFieldReview.svelte (client interactive validation)
 *
 * No server-only dependencies — safe for client import.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PolicyFieldKey } from '$lib/types/policyEngine.js';
import { POLICY_FIELD_LABELS } from '$lib/types/policyEngine.js';

// Re-export for convenience
export { POLICY_FIELD_LABELS };

// ============================================================================
// FIELD GROUPING
// ============================================================================

export interface FieldGroup {
	title: string;
	icon: string;
	keys: PolicyFieldKey[];
}

/**
 * 9 logical groups covering all 25 universal policy field keys.
 * Each group has a title, a descriptive icon label, and its field keys.
 */
export const FIELD_GROUPS: FieldGroup[] = [
	{
		title: 'Interest Rate',
		icon: 'rate',
		keys: ['roi_type', 'roi_benchmark', 'roi_spread', 'roi_range', 'teaser_rate']
	},
	{
		title: 'Processing Fee',
		icon: 'fee',
		keys: ['processing_fee_percent', 'processing_fee_flat', 'processing_fee_waiver']
	},
	{
		title: 'Prepayment & Lock-in',
		icon: 'lock',
		keys: ['prepayment_charge_floating', 'prepayment_charge_fixed', 'lock_in_period_months']
	},
	{
		title: 'Insurance',
		icon: 'shield',
		keys: ['insurance_mandatory', 'insurance_type']
	},
	{
		title: 'Turnaround',
		icon: 'clock',
		keys: ['login_to_sanction_days', 'login_to_disbursal_days']
	},
	{
		title: 'Loan Limits & Eligibility',
		icon: 'limit',
		keys: ['max_age_at_maturity', 'min_loan_amount', 'max_loan_amount']
	},
	{
		title: 'Special Schemes & Offers',
		icon: 'star',
		keys: ['women_borrower_discount', 'festive_offer']
	},
	{
		title: 'Other Charges',
		icon: 'receipt',
		keys: ['stamp_duty_info', 'legal_technical_fee', 'cersai_charge']
	},
	{
		title: 'Disbursement',
		icon: 'disburse',
		keys: ['moratorium_available', 'part_disbursement_allowed', 'tranche_disbursement_info']
	}
];

// ============================================================================
// VALUE FORMATTERS
// ============================================================================

/** Currency fields that should be displayed as INR amounts. */
const CURRENCY_KEYS = new Set<PolicyFieldKey>([
	'min_loan_amount',
	'max_loan_amount',
	'processing_fee_flat',
	'legal_technical_fee',
	'cersai_charge'
]);

/** Percentage fields. */
const PERCENT_KEYS = new Set<PolicyFieldKey>(['processing_fee_percent']);

/** Day-count fields. */
const DAY_KEYS = new Set<PolicyFieldKey>(['login_to_sanction_days', 'login_to_disbursal_days']);

/** Boolean-type fields. */
const BOOLEAN_KEYS = new Set<PolicyFieldKey>([
	'insurance_mandatory',
	'moratorium_available',
	'part_disbursement_allowed',
	'processing_fee_waiver'
]);

/**
 * Format a policy field value for human display.
 * Handles currency (INR), percentages, months, days, booleans, and strings.
 */
export function formatPolicyValue(key: PolicyFieldKey, value: unknown): string {
	if (value === null || value === undefined || value === '') return '\u2014'; // em-dash

	if (typeof value === 'boolean') return value ? 'Yes' : 'No';

	if (typeof value === 'number') {
		if (CURRENCY_KEYS.has(key)) {
			return `\u20B9 ${value.toLocaleString('en-IN')}`; // ₹ symbol
		}
		if (PERCENT_KEYS.has(key)) {
			return `${value}%`;
		}
		if (key === 'lock_in_period_months') {
			return value === 0 ? 'None' : `${value} month${value !== 1 ? 's' : ''}`;
		}
		if (DAY_KEYS.has(key)) {
			return `${value} day${value !== 1 ? 's' : ''}`;
		}
		if (key === 'max_age_at_maturity') {
			return `${value} years`;
		}
		return String(value);
	}

	return String(value);
}

/**
 * Check if a field key represents a boolean-type value.
 * Used by the review component to render Yes/No badges.
 */
export function isBooleanField(key: PolicyFieldKey): boolean {
	return BOOLEAN_KEYS.has(key);
}
