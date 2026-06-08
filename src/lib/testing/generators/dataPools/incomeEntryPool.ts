/**
 * Income Entry Pool
 *
 * Generates CleanIncomeEntry[] arrays that exactly match the output of
 * extractIncomeEntries() in payloadBuilder.ts (lines 909-922).
 *
 * Each profile type produces income entries with the correct keys from
 * IncomeEntryAmounts (src/lib/types/incomeProfile.ts), using amounts
 * derived from existing incomePool.ts ranges.
 *
 * Reference types:
 *   CleanIncomeEntry { profileType, entityName, income: Record<string, unknown>, evidence }
 *   IncomeEntryAmounts — per-profile income fields
 *   IncomeEvidence { itrFiled, hasDocumentaryEvidence, vintageYears? }
 */

import type { CleanIncomeEntry } from '$lib/utils/payloadBuilder.js';
import type { SeededRandom } from './namePool.js';
import { pickEntityName, pickGovernmentEmployer } from './entityNamePool.js';
import {
	SALARIED_PRIVATE_INCOME,
	SALARIED_GOVT_INCOME,
	PROFESSIONAL_INCOME,
	BUSINESS_INCOME,
	PENSION_INCOME,
	DEPRECIATION_RANGE
} from './incomePool.js';

// ============================================================================
// SALARIED INCOME ENTRIES
// ============================================================================

/**
 * Builds a salaried_regular income entry with grossMonthlySalary and netMonthlySalary.
 */
export function buildSalariedRegularEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	salaryMultiplier: number = 1,
	options?: { isGovernment?: boolean }
): CleanIncomeEntry {
	const isGovt = options?.isGovernment ?? false;
	const profileType = isGovt ? 'salaried_regular' : 'salaried_regular';
	const incomeRange = isGovt ? SALARIED_GOVT_INCOME[tier] : SALARIED_PRIVATE_INCOME[tier];
	const gross = Math.round(rng.range(incomeRange[0], incomeRange[1]) * salaryMultiplier);
	const deductionRate = isGovt ? 0.8 : 0.82;
	const net = Math.round(gross * deductionRate);

	const entityName = isGovt ? pickGovernmentEmployer(rng) : pickEntityName(rng, 'salaried_regular');

	return {
		profileType,
		entityName,
		income: {
			grossMonthlySalary: gross,
			netMonthlySalary: net
		},
		evidence: {
			itrFiled: isGovt ? rng.boolean(0.9) : true,
			hasDocumentaryEvidence: true
		}
	};
}

/**
 * Builds a salaried_contractual income entry.
 */
export function buildSalariedContractualEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	salaryMultiplier: number = 1
): CleanIncomeEntry {
	const incomeRange = SALARIED_PRIVATE_INCOME[tier];
	// Contractual typically 10-20% lower than permanent
	const gross = Math.round(rng.range(incomeRange[0], incomeRange[1]) * salaryMultiplier * 0.85);
	const net = Math.round(gross * 0.85);

	return {
		profileType: 'salaried_contractual',
		entityName: pickEntityName(rng, 'salaried_contractual'),
		income: {
			grossMonthlySalary: gross,
			netMonthlySalary: net
		},
		evidence: {
			itrFiled: rng.boolean(0.6),
			hasDocumentaryEvidence: true
		}
	};
}

// ============================================================================
// BUSINESS INCOME ENTRIES
// ============================================================================

/**
 * Builds a business_proprietorship income entry with financialsTable.
 */
export function buildBusinessProprietorshipEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1,
	options?: { businessType?: string; hasCash?: boolean }
): CleanIncomeEntry {
	const bizIncome = BUSINESS_INCOME[tier];
	const years = tier === 1 ? 3 : rng.boolean(0.7) ? 3 : 2;

	const grossReceipts: number[] = [];
	const netProfitArray: number[] = [];
	const depreciationArray: number[] = [];
	const turnOverArray: number[] = [];

	for (let y = 0; y < years; y++) {
		const yearMultiplier = 1 + y * 0.05; // slight growth per year
		const gr = Math.round(
			rng.range(bizIncome.grossReceipts[0], bizIncome.grossReceipts[1]) *
				incMultiplier *
				yearMultiplier
		);
		const profitMargin =
			rng.range(bizIncome.profitMargin[0] * 100, bizIncome.profitMargin[1] * 100) / 100;
		const np = Math.round(gr * profitMargin);
		const dep = Math.round(
			(gr * rng.range(DEPRECIATION_RANGE[0] * 100, DEPRECIATION_RANGE[1] * 100)) / 100
		);

		grossReceipts.push(gr);
		netProfitArray.push(np);
		depreciationArray.push(dep);
		turnOverArray.push(gr);
	}

	const income: Record<string, unknown> = {
		financialsTable: {
			netProfitArray,
			depreciationArray,
			turnOverArray,
			grossReceipts
		}
	};

	// averageBankBalance — derived from monthly income
	const avgMonthlyProfit = netProfitArray[netProfitArray.length - 1] / 12;
	const bankBalMultiplier =
		tier === 1 ? rng.range(3, 8) : tier === 2 ? rng.range(2, 5) : rng.range(1, 3);
	income.averageBankBalance = Math.round(avgMonthlyProfit * bankBalMultiplier);

	// Optional cash income
	if (options?.hasCash) {
		income.cashAmount = rng.range(20000, 100000);
	}

	const vintageYears =
		tier === 1 ? rng.range(5, 15) : tier === 2 ? rng.range(3, 7) : rng.range(1, 4);

	return {
		profileType: 'business_proprietorship',
		entityName: pickEntityName(rng, 'business_proprietorship', {
			businessType: options?.businessType
		}),
		income,
		evidence: {
			itrFiled: true,
			hasDocumentaryEvidence: true,
			vintageYears
		}
	};
}

/**
 * Builds a business_partnership income entry.
 */
export function buildBusinessPartnershipEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1
): CleanIncomeEntry {
	const drawsSalary = rng.boolean(0.6);
	const monthlySalaryAmount = drawsSalary
		? Math.round(rng.range(30000, 200000) * incMultiplier)
		: undefined;

	const receivesProfit = true;
	const profitFrequency = rng.choice(['monthly', 'quarterly', 'half_yearly', 'annual'] as const);
	const averageProfitPerWithdrawal = Math.round(rng.range(50000, 500000) * incMultiplier);

	const income: Record<string, unknown> = {
		drawsSalary,
		receivesProfit,
		profitFrequency,
		averageProfitPerWithdrawal
	};

	if (monthlySalaryAmount !== undefined) {
		income.monthlySalaryAmount = monthlySalaryAmount;
	}

	return {
		profileType: 'business_partnership',
		entityName: pickEntityName(rng, 'business_partnership'),
		income,
		evidence: {
			itrFiled: true,
			hasDocumentaryEvidence: true,
			vintageYears: tier === 1 ? rng.range(5, 12) : tier === 2 ? rng.range(3, 6) : rng.range(1, 4)
		}
	};
}

/**
 * Builds a director_company income entry.
 */
export function buildDirectorCompanyEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1
): CleanIncomeEntry {
	const drawsSalary = rng.boolean(0.7);
	const monthlySalaryAmount = drawsSalary
		? Math.round(rng.range(50000, 300000) * incMultiplier)
		: undefined;

	const receivesProfit = rng.boolean(0.8);
	const profitFrequency = receivesProfit
		? rng.choice(['monthly', 'quarterly', 'annual'] as const)
		: undefined;
	const averageProfitPerWithdrawal = receivesProfit
		? Math.round(rng.range(100000, 1000000) * incMultiplier)
		: undefined;

	const income: Record<string, unknown> = {
		drawsSalary,
		receivesProfit
	};

	if (monthlySalaryAmount !== undefined) income.monthlySalaryAmount = monthlySalaryAmount;
	if (profitFrequency !== undefined) income.profitFrequency = profitFrequency;
	if (averageProfitPerWithdrawal !== undefined)
		income.averageProfitPerWithdrawal = averageProfitPerWithdrawal;

	return {
		profileType: 'director_company',
		entityName: pickEntityName(rng, 'director_company'),
		income,
		evidence: {
			itrFiled: true,
			hasDocumentaryEvidence: true,
			vintageYears: tier === 1 ? rng.range(5, 15) : tier === 2 ? rng.range(3, 8) : rng.range(1, 5)
		}
	};
}

// ============================================================================
// PROFESSIONAL PRACTICE INCOME ENTRIES
// ============================================================================

/**
 * Builds a professional_practice income entry.
 */
export function buildProfessionalPracticeEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1,
	options?: { professionType?: string; lastName?: string }
): CleanIncomeEntry {
	const profIncome = PROFESSIONAL_INCOME[tier];
	const annualReceipts = Math.round(
		rng.range(profIncome.grossReceipts[0], profIncome.grossReceipts[1]) * incMultiplier
	);
	const expenseRatio = rng.range(35, 60) / 100;
	const monthlyReceipts = Math.round(annualReceipts / 12);
	const monthlyExpenses = Math.round(monthlyReceipts * expenseRatio);
	const annualNetProfit = (monthlyReceipts - monthlyExpenses) * 12;

	// Build a 3-year financialsTable matching the live form shape
	// (PROFESSIONAL_INCOME_FIELDS in profileFormConfig.ts). Position 0 = most
	// recent year. Use FLAT per-year values so that `extractGrossFromEntry`'s
	// "average first two filed ITRs / 12" rule yields exactly
	// `annualNetProfit / 12` — predictable for any downstream consumer of the
	// generator that asserts monthly income from this entry.
	const netProfitArray = [annualNetProfit, annualNetProfit, annualNetProfit];
	const depreciationArray = netProfitArray.map((p) => Math.round(p * 0.08));
	const grossReceipts = netProfitArray.map((p) => Math.round(p / (1 - expenseRatio)));

	return {
		profileType: 'professional_practice',
		entityName: pickEntityName(rng, 'professional_practice', {
			professionType: options?.professionType,
			lastName: options?.lastName
		}),
		income: {
			financialsTable: {
				netProfitArray,
				depreciationArray,
				grossReceipts,
				itrFiled: [true, true, true]
			}
		},
		evidence: {
			itrFiled: true,
			hasDocumentaryEvidence: true,
			vintageYears: tier === 1 ? rng.range(5, 12) : tier === 2 ? rng.range(3, 6) : rng.range(1, 4)
		}
	};
}

// ============================================================================
// PENSION INCOME ENTRIES
// ============================================================================

/**
 * Builds a pension income entry.
 */
export function buildPensionEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1
): CleanIncomeEntry {
	const pensionRange = PENSION_INCOME[tier];
	const monthly = Math.round(rng.range(pensionRange[0], pensionRange[1]) * incMultiplier);

	return {
		profileType: 'pension',
		entityName: pickEntityName(rng, 'pension'),
		income: {
			monthlyPensionAmount: monthly
		},
		evidence: {
			itrFiled: rng.boolean(0.8),
			hasDocumentaryEvidence: true
		}
	};
}

// ============================================================================
// OTHER INCOME ENTRIES (supplementary/passive)
// ============================================================================

/**
 * Builds a rental_income entry.
 */
export function buildRentalIncomeEntry(rng: SeededRandom, tier: 1 | 2 | 3): CleanIncomeEntry {
	const baseRent =
		tier === 1
			? rng.range(15000, 80000)
			: tier === 2
				? rng.range(10000, 40000)
				: rng.range(5000, 20000);

	return {
		profileType: 'rental_income',
		entityName: pickEntityName(rng, 'rental_income'),
		income: {
			monthlyRentAmount: baseRent
		},
		evidence: {
			itrFiled: rng.boolean(0.5),
			hasDocumentaryEvidence: rng.boolean(0.7)
		}
	};
}

/**
 * Builds a freelance_consulting income entry.
 */
export function buildFreelanceConsultingEntry(
	rng: SeededRandom,
	tier: 1 | 2 | 3
): CleanIncomeEntry {
	const baseIncome =
		tier === 1
			? rng.range(30000, 150000)
			: tier === 2
				? rng.range(20000, 80000)
				: rng.range(10000, 40000);

	return {
		profileType: 'freelance_consulting',
		entityName: pickEntityName(rng, 'freelance_consulting'),
		income: {
			averageMonthlyFreelanceIncome: baseIncome
		},
		evidence: {
			itrFiled: rng.boolean(0.5),
			hasDocumentaryEvidence: rng.boolean(0.4)
		}
	};
}

/**
 * Builds an agriculture_income entry.
 */
export function buildAgricultureIncomeEntry(rng: SeededRandom): CleanIncomeEntry {
	const annualIncome = rng.range(100000, 600000);

	return {
		profileType: 'agriculture_income',
		entityName: pickEntityName(rng, 'agriculture_income'),
		income: {
			averageAnnualAgricultureIncome: annualIncome
		},
		evidence: {
			itrFiled: false,
			hasDocumentaryEvidence: rng.boolean(0.3)
		}
	};
}

/**
 * Builds an investment_income entry.
 */
export function buildInvestmentIncomeEntry(rng: SeededRandom): CleanIncomeEntry {
	const annualIncome = rng.range(50000, 500000);

	return {
		profileType: 'investment_income',
		entityName: pickEntityName(rng, 'investment_income'),
		income: {
			averageAnnualInvestmentIncome: annualIncome
		},
		evidence: {
			itrFiled: rng.boolean(0.7),
			hasDocumentaryEvidence: rng.boolean(0.6)
		}
	};
}

// ============================================================================
// COMPOSITE BUILDERS (employment type -> income entries)
// ============================================================================

/**
 * Builds income entries for a salaried applicant based on employment type.
 * Returns a single-entry array (salaried profiles have one income source).
 */
export function buildSalariedIncomeEntries(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	employmentType: string,
	salaryMultiplier: number = 1
): CleanIncomeEntry[] {
	if (employmentType === 'Salaried(Government)') {
		return [buildSalariedRegularEntry(rng, tier, salaryMultiplier, { isGovernment: true })];
	}
	return [buildSalariedRegularEntry(rng, tier, salaryMultiplier)];
}

/**
 * Builds income entries for a self-employed (professional) applicant.
 */
export function buildProfessionalIncomeEntries(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1,
	options?: { professionType?: string; lastName?: string }
): CleanIncomeEntry[] {
	return [buildProfessionalPracticeEntry(rng, tier, incMultiplier, options)];
}

/**
 * Builds income entries for a self-employed (other/business) applicant.
 */
export function buildBusinessIncomeEntries(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1,
	options?: { businessType?: string; hasCash?: boolean }
): CleanIncomeEntry[] {
	return [buildBusinessProprietorshipEntry(rng, tier, incMultiplier, options)];
}

/**
 * Builds income entries for a pensioner applicant.
 */
export function buildPensionIncomeEntries(
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1
): CleanIncomeEntry[] {
	return [buildPensionEntry(rng, tier, incMultiplier)];
}

// ============================================================================
// MULTI-INCOME BUILDERS
// ============================================================================

/**
 * Adds a secondary rental income entry to an existing entry array.
 */
export function addRentalIncomeEntry(
	entries: CleanIncomeEntry[],
	rng: SeededRandom,
	tier: 1 | 2 | 3
): CleanIncomeEntry[] {
	return [...entries, buildRentalIncomeEntry(rng, tier)];
}

/**
 * Adds a secondary director_company income entry for multi-directorship scenarios.
 */
export function addDirectorCompanyEntry(
	entries: CleanIncomeEntry[],
	rng: SeededRandom,
	tier: 1 | 2 | 3,
	incMultiplier: number = 1
): CleanIncomeEntry[] {
	return [...entries, buildDirectorCompanyEntry(rng, tier, incMultiplier)];
}
