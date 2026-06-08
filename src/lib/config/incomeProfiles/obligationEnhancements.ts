/**
 * Obligation Enhancement Configuration
 * ═══════════════════════════════════════════════════════════════════
 * Defines the new fields added to the existing obligation form:
 *   1. Loan Role (primary borrower / co-borrower / guarantor / on-paper-only)
 *   2. EMI Source (from own account / paid by others)
 *   3. EMI Paid By (spouse / parent / co-borrower / business account)
 *   4. Loan Capacity (individual / as director / as partner / as proprietor)
 *   5. Loan Capacity Entity Name (company/firm name)
 *
 * These are injected into the existing UnsecuredObligation component
 * via the enhanced obligation entry structure.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { IncomeProfileType } from '$lib/types/incomeProfile';

// ============================================================================
// LOAN ROLE OPTIONS
// ============================================================================

export const LOAN_ROLE_OPTIONS = [
	{
		label: 'Primary Borrower',
		value: 'primary_borrower',
		labelDescription: "EMI is the applicant's direct responsibility"
	},
	{
		label: 'Co-Borrower',
		value: 'co_borrower',
		labelDescription: 'Joint obligation with another person'
	},
	{
		label: 'Guarantor',
		value: 'guarantor',
		labelDescription: "Guaranteed someone else's loan — EMI counted but lighter weight"
	},
	{
		label: 'On Paper Only',
		value: 'on_paper_only',
		labelDescription: 'Name on loan but not paying — lender may still count it'
	}
];

// ============================================================================
// EMI SOURCE OPTIONS
// ============================================================================

export const EMI_SOURCE_OPTIONS = [
	{
		label: 'Yes — Direct debit from my account',
		value: 'yes_direct_debit'
	},
	{
		label: 'Yes — I transfer manually',
		value: 'yes_manual_transfer'
	},
	{
		label: 'No — EMI paid by someone else',
		value: 'no_paid_by_others'
	}
];

// ============================================================================
// EMI PAID BY OPTIONS (shown when EMI source = 'no_paid_by_others')
// ============================================================================

export const EMI_PAID_BY_OPTIONS = [
	{ label: 'Spouse', value: 'spouse' },
	{ label: 'Parent', value: 'parent' },
	{ label: 'Co-Borrower', value: 'co_borrower' },
	{ label: 'Business Account', value: 'business_account' },
	{ label: 'Other', value: 'other' }
];

// ============================================================================
// LOAN CAPACITY OPTIONS
// ============================================================================

export const LOAN_CAPACITY_OPTIONS = [
	{
		label: 'Individual',
		value: 'individual',
		labelDescription: 'Loan taken in personal capacity'
	},
	{
		label: 'As Director',
		value: 'as_director',
		labelDescription: 'Loan taken as director of a company'
	},
	{
		label: 'As Partner',
		value: 'as_partner',
		labelDescription: 'Loan taken as partner in a firm'
	},
	{
		label: 'As Proprietor',
		value: 'as_proprietor',
		labelDescription: 'Loan taken for proprietorship business'
	}
];

/**
 * Get loan capacity options filtered by selected income profiles.
 * If applicant hasn't declared director/partner/proprietorship profiles,
 * those capacity options are hidden.
 */
export function getFilteredCapacityOptions(selectedProfiles: IncomeProfileType[]) {
	return LOAN_CAPACITY_OPTIONS.filter((opt) => {
		switch (opt.value) {
			case 'as_director':
				return selectedProfiles.includes('director_company');
			case 'as_partner':
				return selectedProfiles.includes('business_partnership');
			case 'as_proprietor':
				return selectedProfiles.includes('business_proprietorship');
			case 'individual':
			default:
				return true;
		}
	});
}

/**
 * Get entity name label based on loan capacity
 */
export function getCapacityEntityLabel(capacity: string): string {
	switch (capacity) {
		case 'as_director':
			return 'Company Name';
		case 'as_partner':
			return 'Partnership / LLP Firm Name';
		case 'as_proprietor':
			return 'Business Name';
		default:
			return '';
	}
}

/**
 * Check if entity name is needed for the selected capacity
 */
export function needsCapacityEntity(capacity: string): boolean {
	return ['as_director', 'as_partner', 'as_proprietor'].includes(capacity);
}
