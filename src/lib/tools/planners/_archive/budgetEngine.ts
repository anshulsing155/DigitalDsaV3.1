/**
 * Budget Planner Engine — Income and expense aggregation.
 *
 * Helps users understand their monthly cash flow by categorizing
 * income and expenses, then computing:
 * - Total income, total expenses, surplus
 * - Savings rate (what % of income is saved)
 * - Recommended maximum EMI (based on surplus and FOIR guidelines)
 */

import type { BudgetData, BudgetSummary, BudgetLineItem } from '$lib/tools/types.js';

// ============================================================================
// BUDGET COMPUTATION
// ============================================================================

/**
 * Compute the budget summary from income and expense data.
 *
 * The recommended max EMI is calculated as 40% of the monthly surplus.
 * This follows the general banking guideline that loan obligations
 * should not exceed 40-50% of net disposable income (FOIR).
 *
 * @param budgetData - The user's income and expense items
 * @returns Computed summary with totals, surplus, savings rate, and max EMI
 */
export function computeBudgetSummary(budgetData: BudgetData): BudgetSummary {
	// Step 1: Sum up all income sources
	const totalIncome = sumItems(budgetData.incomeItems);

	// Step 2: Sum up household expenses (essentials like rent, groceries, bills)
	const totalHouseholdExpenses = sumItems(budgetData.householdExpenses);

	// Step 3: Sum up lifestyle expenses (discretionary like dining, entertainment)
	const totalLifestyleExpenses = sumItems(budgetData.lifestyleExpenses);

	// Step 4: Calculate total expenses and surplus
	const totalExpenses = totalHouseholdExpenses + totalLifestyleExpenses;
	const monthlySurplus = totalIncome - totalExpenses;

	// Step 5: Calculate savings rate (what % of income is saved)
	const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

	// Step 6: Calculate recommended max EMI
	// Banks typically allow EMI up to 40-50% of net disposable income
	// We use 40% of surplus as a conservative recommendation
	const recommendedMaxEmi = Math.max(0, Math.round(monthlySurplus * 0.4));

	return {
		totalIncome,
		totalHouseholdExpenses,
		totalLifestyleExpenses,
		totalExpenses,
		monthlySurplus,
		savingsRate,
		recommendedMaxEmi
	};
}

/**
 * Helper: Sum the monthly amounts of all items in a category.
 */
function sumItems(items: BudgetLineItem[]): number {
	return items.reduce((total, item) => total + (item.monthlyAmount || 0), 0);
}

// ============================================================================
// DEFAULT BUDGET ITEMS
// ============================================================================

/**
 * Generate a default budget data structure with common categories pre-filled.
 * Users can add/remove items as needed.
 */
export function createDefaultBudgetData(): BudgetData {
	return {
		incomeItems: [
			{ id: 'inc-1', label: 'Monthly Salary (Net)', monthlyAmount: 0 },
			{ id: 'inc-2', label: 'Spouse Income', monthlyAmount: 0 },
			{ id: 'inc-3', label: 'Rental Income', monthlyAmount: 0 },
			{ id: 'inc-4', label: 'Other Income', monthlyAmount: 0 }
		],
		householdExpenses: [
			{ id: 'hh-1', label: 'Rent / Housing', monthlyAmount: 0 },
			{ id: 'hh-2', label: 'Groceries & Essentials', monthlyAmount: 0 },
			{ id: 'hh-3', label: 'Utilities (Electricity, Water, Gas)', monthlyAmount: 0 },
			{ id: 'hh-4', label: 'Internet & Mobile', monthlyAmount: 0 },
			{ id: 'hh-5', label: 'Children Education', monthlyAmount: 0 },
			{ id: 'hh-6', label: 'Insurance Premiums', monthlyAmount: 0 },
			{ id: 'hh-7', label: 'Existing EMIs', monthlyAmount: 0 },
			{ id: 'hh-8', label: 'Medical / Healthcare', monthlyAmount: 0 }
		],
		lifestyleExpenses: [
			{ id: 'ls-1', label: 'Dining Out / Food Delivery', monthlyAmount: 0 },
			{ id: 'ls-2', label: 'Entertainment & Subscriptions', monthlyAmount: 0 },
			{ id: 'ls-3', label: 'Shopping & Personal Care', monthlyAmount: 0 },
			{ id: 'ls-4', label: 'Travel & Holidays', monthlyAmount: 0 },
			{ id: 'ls-5', label: 'Fuel & Transportation', monthlyAmount: 0 },
			{ id: 'ls-6', label: 'Miscellaneous', monthlyAmount: 0 }
		]
	};
}

/** Generate a unique ID for new budget line items */
let budgetItemCounter = 100;
export function generateBudgetItemId(prefix: string): string {
	return `${prefix}-${++budgetItemCounter}`;
}
