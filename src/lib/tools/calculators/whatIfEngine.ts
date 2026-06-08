/**
 * What-If Insight Engine — Computes the highest-impact changes a user can make.
 *
 * This is the DSA's secret weapon. Instead of just showing "₹42L eligible",
 * it shows: "Adding ₹15K income would unlock ₹8.2L more."
 *
 * The engine runs the eligibility calculation multiple times with small tweaks
 * and ranks the improvements by impact. This gives DSAs actionable talking
 * points when sitting with a client.
 *
 * Performance: ~5 calculations per insight set. Each is pure math (no API calls).
 * Total time: <2ms. Safe to run on every input change.
 */

import {
	computeRefinedEligibility,
	type ApplicantInput,
	type EmploymentCategory,
	type CreditScoreTier,
	type LoanCategory
} from './smartEligibility.js';

// ============================================================================
// TYPES
// ============================================================================

export interface WhatIfInsight {
	/** Unique identifier */
	id: string;

	/** Icon emoji for visual distinction */
	icon: string;

	/** Short label: "Add ₹15K income" */
	label: string;

	/** Impact description: "unlocks ₹8.2L more loan" */
	impact: string;

	/** The additional loan amount this change would unlock (in INR) */
	additionalAmount: number;

	/** Category for grouping/prioritization */
	category: 'income' | 'credit' | 'tenure' | 'obligation' | 'co-applicant';

	/** Difficulty: how hard is this for the user to actually do? */
	difficulty: 'easy' | 'moderate' | 'hard';
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Generate what-if insights by simulating small improvements.
 *
 * Strategy: For each "lever" the user can pull (income, credit, EMIs, co-applicant),
 * compute the delta in loan eligibility if that lever is adjusted favorably.
 * Return the top 3-4 insights ranked by impact.
 *
 * @param applicants - Current applicant inputs
 * @param loanType - Current loan type
 * @param tenure - Current tenure in years
 * @returns Array of insights, sorted by impact (highest first)
 */
export function generateWhatIfInsights(
	applicants: ApplicantInput[],
	loanType: LoanCategory,
	tenure: number
): WhatIfInsight[] {
	// Step 1: Calculate current eligibility (baseline)
	const baseline = computeRefinedEligibility(applicants, loanType, tenure);
	if (!baseline || baseline.maxLoanAmount <= 0) return [];

	const insights: WhatIfInsight[] = [];
	const primary = applicants[0];
	const formatLakhs = (amount: number) => `₹${(Math.abs(amount) / 100000).toFixed(1)}L`;

	// ── Lever 1: Income Increase ──────────────────────────────────────
	// Simulate adding ₹15K to primary income
	const incomeBoost = 15_000;
	const withMoreIncome = simulateChange(applicants, loanType, tenure, (apps) => {
		apps[0] = { ...apps[0], monthlyIncome: apps[0].monthlyIncome + incomeBoost };
	});
	if (withMoreIncome) {
		const delta = withMoreIncome.maxLoanAmount - baseline.maxLoanAmount;
		if (delta > 50_000) {
			insights.push({
				id: 'income-boost',
				icon: '💰',
				label: `Add ₹${(incomeBoost / 1000).toFixed(0)}K monthly income`,
				impact: `unlocks ${formatLakhs(delta)} more loan`,
				additionalAmount: delta,
				category: 'income',
				difficulty: 'moderate'
			});
		}
	}

	// ── Lever 2: Credit Score Improvement ─────────────────────────────
	// Simulate improving to the next tier
	const creditUpgrade = getNextCreditTier(primary.creditScore);
	if (creditUpgrade) {
		const withBetterCredit = simulateChange(applicants, loanType, tenure, (apps) => {
			apps[0] = { ...apps[0], creditScore: creditUpgrade.tier };
		});
		if (withBetterCredit) {
			const delta = withBetterCredit.maxLoanAmount - baseline.maxLoanAmount;
			const rateDiff = baseline.interestRate - withBetterCredit.interestRate;
			if (delta > 50_000 || rateDiff > 0) {
				insights.push({
					id: 'credit-upgrade',
					icon: '📊',
					label: `Improve CIBIL to ${creditUpgrade.label}`,
					impact:
						rateDiff > 0
							? `saves ${rateDiff.toFixed(2)}% on rate, adds ${formatLakhs(delta)}`
							: `unlocks ${formatLakhs(delta)} more`,
					additionalAmount: delta,
					category: 'credit',
					difficulty: 'hard'
				});
			}
		}
	}

	// ── Lever 3: Reduce Existing EMIs ────────────────────────────────
	// Simulate clearing all existing EMIs
	if (primary.existingMonthlyEmis > 0) {
		const withNoEmis = simulateChange(applicants, loanType, tenure, (apps) => {
			apps[0] = { ...apps[0], existingMonthlyEmis: 0 };
		});
		if (withNoEmis) {
			const delta = withNoEmis.maxLoanAmount - baseline.maxLoanAmount;
			if (delta > 50_000) {
				insights.push({
					id: 'clear-emis',
					icon: '🔓',
					label: `Clear ₹${(primary.existingMonthlyEmis / 1000).toFixed(0)}K existing EMIs`,
					impact: `frees up ${formatLakhs(delta)} loan capacity`,
					additionalAmount: delta,
					category: 'obligation',
					difficulty: 'moderate'
				});
			}
		}
	}

	// ── Lever 4: Add Co-Applicant ────────────────────────────────────
	// Only suggest if user hasn't already added one
	if (applicants.length === 1) {
		const estimatedCoIncome = Math.round(primary.monthlyIncome * 0.6); // Assume spouse earns 60%
		const withCoApplicant = simulateChange(applicants, loanType, tenure, (apps) => {
			apps.push({
				monthlyIncome: estimatedCoIncome,
				employment: primary.employment,
				age: primary.age,
				creditScore: primary.creditScore,
				existingMonthlyEmis: 0
			});
		});
		if (withCoApplicant) {
			const delta = withCoApplicant.maxLoanAmount - baseline.maxLoanAmount;
			if (delta > 100_000) {
				insights.push({
					id: 'add-co-applicant',
					icon: '👥',
					label: `Add co-applicant (~₹${(estimatedCoIncome / 1000).toFixed(0)}K income)`,
					impact: `boosts eligibility by ${formatLakhs(delta)}`,
					additionalAmount: delta,
					category: 'co-applicant',
					difficulty: 'easy'
				});
			}
		}
	}

	// ── Lever 5: Extend Tenure ──────────────────────────────────────
	// Simulate adding 5 more years (if not at max)
	if (tenure < 28) {
		const longerTenure = Math.min(30, tenure + 5);
		const withLongerTenure = simulateChange(applicants, loanType, longerTenure, () => {});
		if (withLongerTenure) {
			const delta = withLongerTenure.maxLoanAmount - baseline.maxLoanAmount;
			if (delta > 100_000) {
				insights.push({
					id: 'extend-tenure',
					icon: '📅',
					label: `Extend tenure to ${longerTenure} years`,
					impact: `adds ${formatLakhs(delta)} (higher total interest)`,
					additionalAmount: delta,
					category: 'tenure',
					difficulty: 'easy'
				});
			}
		}
	}

	// Sort by impact (highest additional amount first) and return top 4
	return insights.sort((a, b) => b.additionalAmount - a.additionalAmount).slice(0, 4);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Run the eligibility calculation with a modified set of applicants.
 * The modifier function receives a clone of the applicants array to mutate.
 */
function simulateChange(
	applicants: ApplicantInput[],
	loanType: LoanCategory,
	tenure: number,
	modifier: (cloned: ApplicantInput[]) => void
) {
	const cloned = applicants.map((a) => ({ ...a }));
	modifier(cloned);
	try {
		return computeRefinedEligibility(cloned, loanType, tenure);
	} catch {
		return null;
	}
}

/** Get the next higher credit tier from the current one */
function getNextCreditTier(
	current: CreditScoreTier
): { tier: CreditScoreTier; label: string } | null {
	const upgrades: Record<CreditScoreTier, { tier: CreditScoreTier; label: string } | null> = {
		Excellent: null, // Already at top
		Good: { tier: 'Excellent', label: '780+' },
		Average: { tier: 'Good', label: '730-779' },
		Fair: { tier: 'Average', label: '700-729' },
		Poor: { tier: 'Fair', label: '650-699' },
		'No Score': { tier: 'Average', label: '700+' }
	};
	return upgrades[current];
}
