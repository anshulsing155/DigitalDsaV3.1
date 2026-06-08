import type { IncomeSourceEntry, ProfitFrequency } from '$lib/types/incomeProfile';

const PROFIT_FREQUENCY_DIVISOR: Record<ProfitFrequency, number> = {
	monthly: 1,
	quarterly: 3,
	half_yearly: 6,
	annual: 12,
	as_and_when: 12
};

/**
 * Extracts a rough monthly income estimate from an income entry.
 * This is for UI display only — the Rule Engine does the authoritative assessment.
 */
export function estimateMonthlyIncome(entry: IncomeSourceEntry): number {
	const inc = entry.income;
	if (!inc) return 0;

	switch (entry.profileType) {
		case 'salaried_regular':
		case 'salaried_contractual':
			return toNum(inc.grossMonthlySalary);

		case 'director_company':
		case 'business_partnership': {
			let total = 0;
			if (inc.drawsSalary) total += toNum(inc.monthlySalaryAmount);
			if (inc.receivesProfit && inc.averageProfitPerWithdrawal) {
				const div = PROFIT_FREQUENCY_DIVISOR[inc.profitFrequency ?? 'annual'];
				total += toNum(inc.averageProfitPerWithdrawal) / div;
			}
			return total;
		}

		case 'professional_practice':
			return toNum(inc.netProfessionalIncome) || toNum(inc.averageMonthlyReceipts);

		case 'business_proprietorship': {
			// Use average bank balance as proxy if financials table not easily reducible
			if (inc.financialsTable?.netProfitArray?.length) {
				const profits = inc.financialsTable.netProfitArray.map(Number).filter((n) => !isNaN(n));
				if (profits.length) {
					const avg = profits.reduce((a, b) => a + b, 0) / profits.length;
					return Math.max(0, avg / 12);
				}
			}
			return toNum(inc.averageBankBalance);
		}

		case 'pension':
			return toNum(inc.monthlyPensionAmount);

		case 'rental_income':
			return toNum(inc.monthlyRentAmount);

		case 'freelance_consulting':
			return toNum(inc.averageMonthlyFreelanceIncome);

		case 'agriculture_income':
			return toNum(inc.averageAnnualAgricultureIncome) / 12;

		case 'investment_income':
			return toNum(inc.averageAnnualInvestmentIncome) / 12;

		case 'no_current_income':
			return 0;

		default:
			return toNum(inc.otherMonthlyIncome);
	}
}

function toNum(v: unknown): number {
	if (typeof v === 'number') return v;
	if (typeof v === 'string') {
		const n = parseFloat(v);
		return isNaN(n) ? 0 : n;
	}
	return 0;
}

/**
 * Sums estimated monthly income across all entries.
 */
export function estimateTotalMonthlyIncome(entries: IncomeSourceEntry[]): number {
	return entries.reduce((sum, e) => sum + estimateMonthlyIncome(e), 0);
}
