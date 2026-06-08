/**
 * Company Business Categories
 * ═══════════════════════════════════════════════════════════════════
 * 4 lender-aligned categories (SENP classification).
 * Multi-select: a company can operate in multiple categories.
 * Revenue share % determines the dominant category for multiplier.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { BusinessCategoryType } from '$lib/types/companyIncome';

export interface BusinessCategoryOption {
	value: BusinessCategoryType;
	label: string;
	description: string;
	icon: string;
	/** Examples shown as subtle hint text below description */
	examples: string;
}

export const BUSINESS_CATEGORIES: BusinessCategoryOption[] = [
	{
		value: 'manufacturing',
		label: 'Manufacturing & Production',
		description: 'Produces, assembles, or processes goods',
		icon: 'Factory',
		examples: 'Factory, food processing, garments, pharma, chemicals, printing'
	},
	{
		value: 'trading',
		label: 'Trading',
		description: 'Buys and sells goods without manufacturing',
		icon: 'ShoppingCart',
		examples: 'Wholesale, retail, import/export, distributors, e-commerce sellers'
	},
	{
		value: 'services',
		label: 'Services',
		description: 'Provides services, job work, or expertise',
		icon: 'Briefcase',
		examples: 'IT, consulting, transport, healthcare, hospitality, education, media'
	},
	{
		value: 'commission_agency',
		label: 'Commission & Agency',
		description: 'Earns via commission, brokerage, or fees',
		icon: 'Wallet',
		examples: 'Insurance agents, real estate brokers, franchise, liaising, contractors'
	}
];

/** Get category option by value */
export function getCategoryOption(value: BusinessCategoryType): BusinessCategoryOption | undefined {
	return BUSINESS_CATEGORIES.find((c) => c.value === value);
}

/** Convert to Option[] for MultipleSelectField */
export function toCategorySelectOptions(): {
	label: string;
	value: string;
	description: string;
	icon: string;
}[] {
	return BUSINESS_CATEGORIES.map((c) => ({
		label: c.label,
		value: c.value,
		description: c.description,
		icon: c.icon
	}));
}
