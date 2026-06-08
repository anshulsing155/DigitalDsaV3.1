/**
 * Intent Translator — Maps user strategies to structured timeline events.
 *
 * Instead of making users construct complex event objects, we present
 * pre-built "strategies" that translate human intent into events:
 *
 * "Increase EMI when salary grows"  → EmiStepUpEvent (5% yearly)
 * "Pay extra every Diwali"          → ConditionalPartPaymentEvent (year_end)
 * "Reduce EMI for 6 months"         → EmiOverrideEvent (temporary reduction)
 * "Close loan early aggressively"   → RecurringPartPaymentEvent + EmiStepUpEvent
 *
 * These intents are shown in the planner UI as strategy cards.
 * Users pick strategies → engine generates events → simulation runs.
 */

import type { BaseLoanConfig, TimelineEvent, UserIntent } from './types.js';
import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';

// ============================================================================
// PRE-BUILT STRATEGY INTENTS
// ============================================================================

/**
 * All available strategies, grouped by category.
 * Each strategy creates one or more TimelineEvent objects.
 */
export const STRATEGY_INTENTS: {
	category: string;
	categoryIcon: string;
	strategies: UserIntent[];
}[] = [
	// ── ACCELERATE REPAYMENT ─────────────────────────────────────
	{
		category: 'Pay Off Faster',
		categoryIcon: '🚀',
		strategies: [
			{
				label: 'Annual salary step-up (compounding)',
				description: 'Increase EMI by 5% of current EMI every year — mirrors real salary growth',
				icon: '📈',
				createEvent: (loan) => ({
					type: 'emi_step_up',
					id: `intent-step-up-${Date.now()}`,
					method: 'percentage',
					value: 5,
					intervalMonths: 12,
					fromMonth: 13, // Start from 2nd year
					compounding: true, // Key: 5% of CURRENT EMI, not original
					label: 'Annual 5% compounding step-up'
				})
			},
			{
				label: 'Aggressive early closure',
				description: 'Pay ₹50K extra quarterly + increase EMI ₹5K yearly',
				icon: '⚡',
				createEvent: (loan) => ({
					type: 'recurring_part_payment',
					id: `intent-aggressive-${Date.now()}`,
					fromMonth: 4,
					toMonth: loan.tenureMonths,
					intervalMonths: 3,
					amountType: 'fixed',
					amount: 50_000,
					effect: 'reduce_tenure',
					label: 'Quarterly ₹50K extra payment'
				})
			},
			{
				label: 'Pay extra every Diwali',
				description: 'Make a bonus payment at year-end (October/November)',
				icon: '🪔',
				createEvent: (loan) => ({
					type: 'conditional_part_payment',
					id: `intent-diwali-${Date.now()}`,
					trigger: 'every_year_end',
					amount: 100_000,
					effect: 'reduce_tenure',
					label: 'Diwali bonus payment ₹1L'
				})
			},
			{
				label: 'Fixed monthly extra',
				description: 'Pay ₹10,000 extra every month on top of EMI',
				icon: '💪',
				createEvent: (loan) => {
					const baseEmi = calculateEMI(
						loan.principalAmount,
						loan.annualInterestRate,
						loan.tenureMonths
					);
					return {
						type: 'emi_one_time_jump',
						id: `intent-extra-monthly-${Date.now()}`,
						atMonth: 1,
						newEmiAmount: baseEmi + 10_000,
						label: 'EMI + ₹10K extra monthly'
					};
				}
			}
		]
	},

	// ── REDUCE BURDEN ────────────────────────────────────────────
	{
		category: 'Reduce Monthly Burden',
		categoryIcon: '🛡️',
		strategies: [
			{
				label: 'Temporary relief (6 months)',
				description: 'Reduce EMI by 30% for 6 months, then restore',
				icon: '⏸️',
				createEvent: (loan) => ({
					type: 'emi_override',
					id: `intent-relief-${Date.now()}`,
					fromMonth: 1,
					toMonth: 6,
					overrideType: 'percentage_change',
					value: -30,
					label: '6-month EMI relief (-30%)'
				})
			},
			{
				label: 'Post-retirement step-down',
				description: 'Reduce EMI by 20% after 15 years (near retirement)',
				icon: '🏖️',
				createEvent: (loan) => ({
					type: 'emi_step_down',
					id: `intent-retirement-${Date.now()}`,
					method: 'percentage',
					value: 20,
					intervalMonths: 12, // One-time but using step-down
					fromMonth: 181, // After 15 years
					toMonth: 181, // Only fires once
					label: 'Post-retirement 20% EMI reduction'
				})
			},
			{
				label: 'EMI moratorium (3 months)',
				description: 'Pause EMI for 3 months — interest capitalizes',
				icon: '⏳',
				createEvent: (loan) => ({
					type: 'moratorium',
					id: `intent-moratorium-${Date.now()}`,
					fromMonth: 1,
					toMonth: 3,
					interestTreatment: 'capitalize',
					label: '3-month EMI moratorium'
				})
			}
		]
	},

	// ── LUMP SUM EVENTS ──────────────────────────────────────────
	{
		category: 'Lump Sum Payments',
		categoryIcon: '💰',
		strategies: [
			{
				label: 'Bonus payment',
				description: 'Make a one-time ₹5L payment to reduce principal',
				icon: '🎯',
				createEvent: (loan) => ({
					type: 'part_payment',
					id: `intent-bonus-${Date.now()}`,
					atMonth: 12,
					amount: 500_000,
					effect: 'reduce_tenure',
					label: 'One-time ₹5L part-payment'
				})
			},
			{
				label: 'Property sale proceeds',
				description: 'Use ₹15L from a property sale to reduce loan',
				icon: '🏠',
				createEvent: (loan) => ({
					type: 'part_payment',
					id: `intent-property-sale-${Date.now()}`,
					atMonth: 24,
					amount: 1_500_000,
					effect: 'reduce_tenure',
					label: '₹15L property sale proceeds'
				})
			},
			{
				label: 'Annual 2% of outstanding',
				description: 'Pay 2% of remaining principal every year',
				icon: '📊',
				createEvent: (loan) => ({
					type: 'recurring_part_payment',
					id: `intent-2pct-annual-${Date.now()}`,
					fromMonth: 12,
					toMonth: loan.tenureMonths,
					intervalMonths: 12,
					amountType: 'percent_of_outstanding',
					amount: 2,
					effect: 'reduce_tenure',
					label: '2% annual part-payment'
				})
			}
		]
	},

	// ── RATE CHANGES ─────────────────────────────────────────────
	{
		category: 'Interest Rate Changes',
		categoryIcon: '📉',
		strategies: [
			{
				label: 'Expected rate hike',
				description: 'Model a 0.5% rate increase after 12 months',
				icon: '📈',
				createEvent: (loan) => ({
					type: 'rate_change',
					id: `intent-rate-hike-${Date.now()}`,
					atMonth: 13,
					newAnnualRate: loan.annualInterestRate + 0.5,
					recalculateEmi: true,
					label: '+0.5% rate hike'
				})
			},
			{
				label: 'Expected rate cut',
				description: 'Model a 0.25% rate cut after 18 months',
				icon: '📉',
				createEvent: (loan) => ({
					type: 'rate_change',
					id: `intent-rate-cut-${Date.now()}`,
					atMonth: 19,
					newAnnualRate: Math.max(6, loan.annualInterestRate - 0.25),
					recalculateEmi: true,
					label: '-0.25% rate cut'
				})
			}
		]
	}
];

/**
 * Get all strategies as a flat array (for search/filter).
 */
export function getAllStrategies(): UserIntent[] {
	return STRATEGY_INTENTS.flatMap((cat) => cat.strategies);
}

/**
 * Create a "base case" scenario — no events, just the standard EMI.
 * Used as the reference for comparisons.
 */
export function createBaseScenario(baseLoan: BaseLoanConfig) {
	return {
		id: 'base',
		name: 'Base Case (No Changes)',
		baseLoan,
		events: [] as TimelineEvent[]
	};
}
