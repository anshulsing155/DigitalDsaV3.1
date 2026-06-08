/**
 * Income Pool - Income range templates by employment type and city tier
 */

export interface IncomeRanges {
	monthlySalaryRange: [number, number];
	monthlyProfitRange: [number, number];
	pensionRange: [number, number];
}

/** Salaried(Private) income by tier */
export const SALARIED_PRIVATE_INCOME: Record<1 | 2 | 3, [number, number]> = {
	1: [40000, 250000],
	2: [25000, 150000],
	3: [18000, 80000]
};

/** Salaried(Government) income — less city-dependent */
export const SALARIED_GOVT_INCOME: Record<1 | 2 | 3, [number, number]> = {
	1: [35000, 120000],
	2: [30000, 100000],
	3: [25000, 80000]
};

/** Self-employed(Professional) income by tier */
export const PROFESSIONAL_INCOME: Record<
	1 | 2 | 3,
	{ grossReceipts: [number, number]; profitMargin: [number, number] }
> = {
	1: { grossReceipts: [3000000, 12000000], profitMargin: [0.4, 0.6] },
	2: { grossReceipts: [1500000, 6000000], profitMargin: [0.35, 0.55] },
	3: { grossReceipts: [800000, 3000000], profitMargin: [0.3, 0.5] }
};

/** Self-employed(Other) income by tier and businessType */
export const BUSINESS_INCOME: Record<
	1 | 2 | 3,
	{ grossReceipts: [number, number]; profitMargin: [number, number] }
> = {
	1: { grossReceipts: [5000000, 50000000], profitMargin: [0.1, 0.25] },
	2: { grossReceipts: [2000000, 20000000], profitMargin: [0.1, 0.2] },
	3: { grossReceipts: [1000000, 8000000], profitMargin: [0.08, 0.18] }
};

/** High-income professions get a multiplier */
export const PROFESSION_MULTIPLIER: Record<string, number> = {
	'MBBS Doctor': 1.3,
	'Chartered Accountant(CA)': 1.2,
	Architect: 1.1,
	Lawyer: 1.15,
	'Company Secretary': 1.1,
	'Cost Accountant': 1.05
};

/** Pensioner income range */
export const PENSION_INCOME: Record<1 | 2 | 3, [number, number]> = {
	1: [30000, 80000],
	2: [20000, 60000],
	3: [15000, 45000]
};

/** Depreciation as % of gross receipts */
export const DEPRECIATION_RANGE: [number, number] = [0.03, 0.08];

/** Average bank balance as multiple of monthly income */
export const BANK_BALANCE_MULTIPLIER: Record<1 | 2 | 3, [number, number]> = {
	1: [3, 8],
	2: [2, 5],
	3: [1, 3]
};
