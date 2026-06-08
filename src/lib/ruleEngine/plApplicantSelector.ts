/**
 * PL Applicant Selector — picks the best applicant for a personal loan bridge.
 *
 * In multi-applicant secured loan cases, the bridge scenario needs to assign
 * the PL to a specific applicant. This module evaluates each individual
 * applicant's PL eligibility based on CIBIL score, income, age, and
 * employment type, then returns the best candidate.
 *
 * Pure function — no DB, no side effects. Only operates on the applicant array.
 */

import logger from '$lib/server/logger.js';

// ============================================================================
// 1. TYPES
// ============================================================================

export interface PlEligibilityScore {
	applicantIndex: number;
	displayName: string;
	creditScore: number;
	monthlyIncome: number;
	age: number;
	employmentType: string;
	/** Composite score: weighted sum of normalized factors */
	compositeScore: number;
	/** Reasons why this applicant was selected or rejected */
	reasons: string[];
	/** Whether this applicant meets minimum PL requirements */
	isEligible: boolean;
}

export interface PlAssignmentResult {
	/** Index of the selected applicant (null if none eligible) */
	selectedIndex: number | null;
	/** All evaluated applicants with their scores */
	evaluations: PlEligibilityScore[];
	/** Human-readable explanation of why this applicant was selected */
	selectionReason: string;
}

// ============================================================================
// 2. CONSTANTS — Minimum PL Requirements
// ============================================================================

/** Most PL lenders require CIBIL >= 700 */
const MIN_CIBIL_SCORE = 700;

/** Minimum age for PL eligibility (21 years) */
const MIN_AGE = 21;

/** Maximum age for PL eligibility (60 years) */
const MAX_AGE = 60;

// ============================================================================
// 3. SCORING WEIGHTS
// ============================================================================

/** CIBIL accounts for 40% of composite score */
const WEIGHT_CIBIL = 0.4;

/** Monthly income accounts for 30% of composite score */
const WEIGHT_INCOME = 0.3;

/** Age factor accounts for 15% of composite score */
const WEIGHT_AGE = 0.15;

/** Employment type accounts for 15% of composite score */
const WEIGHT_EMPLOYMENT = 0.15;

/** Income normalization cap — scores plateau at 2 lakh/month */
const INCOME_NORMALIZATION_CAP = 200_000;

/** CIBIL range: 300 (min) to 900 (max) = 600 point range */
const CIBIL_RANGE = 600;

/** CIBIL floor used for normalization (300 is the minimum CIBIL score) */
const CIBIL_FLOOR = 300;

// ============================================================================
// 4. EMPLOYMENT TYPE SCORING
// ============================================================================

/**
 * Employment type to score mapping.
 * Salaried and government employees get 1.0 (stable income, easy to verify).
 * Self-employed gets 0.7 (harder for lenders to assess).
 * Others get 0.5 (pension, freelance, etc. — less preferred for PL).
 */
const EMPLOYMENT_SCORES: Record<string, number> = {
	'Salaried(Private)': 1.0,
	'Salaried(Government)': 1.0,
	'Self-employed(Professional)': 0.7,
	'Self-employed(Businessman)': 0.7,
	'Self-employed(Other)': 0.7
};

/** Default score for unrecognized employment types */
const DEFAULT_EMPLOYMENT_SCORE = 0.5;

// ============================================================================
// 5. NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalize CIBIL score to 0-1 range.
 * Formula: (score - 300) / 600
 * A score of 300 → 0.0, a score of 900 → 1.0.
 */
function normalizeCibilScore(creditScore: number): number {
	if (creditScore <= CIBIL_FLOOR) return 0;
	return Math.min((creditScore - CIBIL_FLOOR) / CIBIL_RANGE, 1);
}

/**
 * Normalize monthly income to 0-1 range.
 * Caps at 2 lakh/month — beyond that, PL eligibility doesn't improve much.
 */
function normalizeIncome(monthlyIncome: number): number {
	if (monthlyIncome <= 0) return 0;
	return Math.min(monthlyIncome / INCOME_NORMALIZATION_CAP, 1);
}

/**
 * Age factor: peaks at 30-45 (prime earning years), declines at extremes.
 *
 * Scoring curve:
 *   21-29: linear ramp from 0.6 to 1.0
 *   30-45: plateau at 1.0 (optimal range)
 *   46-60: linear decline from 1.0 to 0.5
 *   Outside 21-60: 0 (ineligible, but handled before this)
 */
function computeAgeFactor(age: number): number {
	if (age < MIN_AGE || age > MAX_AGE) return 0;

	// 30-45: peak earning years — full score
	if (age >= 30 && age <= 45) return 1.0;

	// 21-29: ramping up (younger = slightly less established)
	if (age < 30) {
		return 0.6 + (age - MIN_AGE) * (0.4 / (30 - MIN_AGE));
	}

	// 46-60: declining (closer to retirement = higher risk for lenders)
	return 1.0 - (age - 45) * (0.5 / (MAX_AGE - 45));
}

/**
 * Get employment type score from the lookup table.
 * Falls back to DEFAULT_EMPLOYMENT_SCORE for unrecognized types.
 */
function getEmploymentScore(employmentType: string): number {
	return EMPLOYMENT_SCORES[employmentType] ?? DEFAULT_EMPLOYMENT_SCORE;
}

// ============================================================================
// 6. INCOME EXTRACTION
// ============================================================================

/**
 * Extract monthly income from an applicant record.
 * Prefers assessed income fields, then falls back to gross income.
 *
 * In the payload, income can live in several places:
 *   - grossIncome: flat field on the applicant
 *   - incomeEntries[]: detailed per-source entries (used by income assessor)
 *
 * For PL selection, we use gross income as a rough proxy — the exact
 * assessed amount depends on the PL lender's rules which we don't have here.
 */
function extractMonthlyIncome(applicant: Record<string, unknown>): number {
	// Try grossIncome first (already a monthly figure in the payload)
	const grossIncome = Number(applicant.grossIncome) || 0;
	if (grossIncome > 0) return grossIncome;

	// Try netIncome as fallback
	const netIncome = Number(applicant.netIncome) || 0;
	if (netIncome > 0) return netIncome;

	// Try summing incomeEntries if available
	const entries = applicant.incomeEntries as Array<Record<string, unknown>> | undefined;
	if (entries && entries.length > 0) {
		let total = 0;
		for (const entry of entries) {
			const income = entry.income as Record<string, unknown> | undefined;
			if (!income) continue;

			// Try common monthly salary fields (salaried employees)
			const monthlySalary =
				Number(income.grossMonthlySalary) || Number(income.netMonthlySalary) || 0;
			if (monthlySalary > 0) {
				total += monthlySalary;
				continue;
			}

			// Try director/partner salary (drawn from company)
			const directorSalary = Number(income.monthlySalaryAmount) || 0;
			if (directorSalary > 0) {
				total += directorSalary;
				continue;
			}

			// Try director/partner profit withdrawals
			const profitShare = Number(income.averageProfitPerWithdrawal) || 0;
			if (profitShare > 0) {
				total += profitShare;
				continue;
			}

			// Try professional/freelance monthly income
			const monthlyProfessional = Number(income.netProfessionalIncome) || 0;
			if (monthlyProfessional > 0) {
				total += monthlyProfessional;
				continue;
			}

			// Try pension
			const pension = Number(income.monthlyPensionAmount) || 0;
			if (pension > 0) {
				total += pension;
				continue;
			}

			// Try rental
			const rental = Number(income.monthlyRentAmount) || 0;
			if (rental > 0) {
				total += rental;
				continue;
			}

			// Try freelance
			const freelance = Number(income.averageMonthlyFreelanceIncome) || 0;
			if (freelance > 0) {
				total += freelance;
			}
		}
		return total;
	}

	return 0;
}

// ============================================================================
// 7. MAIN SELECTOR
// ============================================================================

/**
 * Evaluate each individual applicant's PL eligibility and pick the best one.
 *
 * Steps:
 *   1. Filter to Individual applicants only (skip Company)
 *   2. For each individual, extract credit score, age, income, employment
 *   3. Check minimum PL requirements (CIBIL >= 700, age 21-60, some income)
 *   4. Compute composite score (weighted sum of normalized factors)
 *   5. Sort eligible applicants by composite score descending
 *   6. Return the top candidate (or null if none eligible)
 */
export function selectBestPlApplicant(applicants: Record<string, unknown>[]): PlAssignmentResult {
	const evaluations: PlEligibilityScore[] = [];

	for (let index = 0; index < applicants.length; index++) {
		const applicant = applicants[index];
		const applicantType = String(applicant.applicantType ?? 'Individual');

		// Step 1: Skip Company applicants — PL is only for individuals
		if (applicantType === 'Company') {
			logger.debug({ index, applicantType }, 'PL selector: skipping Company applicant');
			continue;
		}

		// Step 2: Extract key fields
		const displayName = String(applicant.fullName ?? `Applicant ${index + 1}`);
		const creditScore = Number(applicant.creditScore) || 0;
		const age = Number(applicant.age) || 0;
		const employmentType = String(applicant.employmentType ?? 'unknown');
		const monthlyIncome = extractMonthlyIncome(applicant);
		const isNonEarning = applicant.isNonEarning === true;

		// Step 3: Check minimum PL requirements and collect rejection reasons
		const reasons: string[] = [];
		let isEligible = true;

		if (creditScore < MIN_CIBIL_SCORE) {
			reasons.push(`CIBIL ${creditScore} below minimum ${MIN_CIBIL_SCORE}`);
			isEligible = false;
		} else {
			reasons.push(`CIBIL ${creditScore} meets minimum ${MIN_CIBIL_SCORE}`);
		}

		if (age < MIN_AGE) {
			reasons.push(`Age ${age} below minimum ${MIN_AGE}`);
			isEligible = false;
		} else if (age > MAX_AGE) {
			reasons.push(`Age ${age} exceeds maximum ${MAX_AGE}`);
			isEligible = false;
		} else {
			reasons.push(`Age ${age} within eligible range ${MIN_AGE}-${MAX_AGE}`);
		}

		if (monthlyIncome <= 0 || isNonEarning) {
			reasons.push('No income — PL requires earning capacity');
			isEligible = false;
		} else {
			reasons.push(`Monthly income ₹${Math.round(monthlyIncome).toLocaleString('en-IN')}`);
		}

		// Step 4: Compute composite score even for ineligible (for diagnostics)
		const normalizedCibil = normalizeCibilScore(creditScore);
		const normalizedIncome = normalizeIncome(monthlyIncome);
		const ageFactor = computeAgeFactor(age);
		const employmentScore = getEmploymentScore(employmentType);

		const compositeScore =
			normalizedCibil * WEIGHT_CIBIL +
			normalizedIncome * WEIGHT_INCOME +
			ageFactor * WEIGHT_AGE +
			employmentScore * WEIGHT_EMPLOYMENT;

		evaluations.push({
			applicantIndex: index,
			displayName,
			creditScore,
			monthlyIncome,
			age,
			employmentType,
			compositeScore: Math.round(compositeScore * 1000) / 1000,
			reasons,
			isEligible
		});
	}

	// Step 5: Sort eligible applicants by composite score (highest first)
	const eligibleApplicants = evaluations
		.filter((e) => e.isEligible)
		.sort((a, b) => b.compositeScore - a.compositeScore);

	// Step 6: Return the top candidate or null
	if (eligibleApplicants.length === 0) {
		logger.debug(
			{ totalEvaluated: evaluations.length },
			'PL selector: no eligible applicant found'
		);
		return {
			selectedIndex: null,
			evaluations,
			selectionReason: 'No applicant meets minimum PL eligibility requirements'
		};
	}

	const selected = eligibleApplicants[0];

	// Build a human-readable explanation of why this applicant was chosen
	const selectionReason = buildSelectionReason(selected, eligibleApplicants.length);

	logger.debug(
		{
			selectedIndex: selected.applicantIndex,
			displayName: selected.displayName,
			compositeScore: selected.compositeScore,
			eligibleCount: eligibleApplicants.length
		},
		'PL selector: best applicant selected'
	);

	return {
		selectedIndex: selected.applicantIndex,
		evaluations,
		selectionReason
	};
}

// ============================================================================
// 8. SELECTION REASON BUILDER
// ============================================================================

/**
 * Build a human-readable explanation for why this applicant was selected.
 * Highlights the dominant scoring factor(s) for transparency.
 */
function buildSelectionReason(selected: PlEligibilityScore, eligibleCount: number): string {
	const parts: string[] = [];

	// Name and position
	parts.push(`${selected.displayName} selected`);

	// Why — highlight strongest factor
	const normalizedCibil = normalizeCibilScore(selected.creditScore);
	const normalizedIncome = normalizeIncome(selected.monthlyIncome);
	const ageFactor = computeAgeFactor(selected.age);

	// Find the dominant factor
	const factors = [
		{ name: 'CIBIL', contribution: normalizedCibil * WEIGHT_CIBIL },
		{ name: 'income', contribution: normalizedIncome * WEIGHT_INCOME },
		{ name: 'age profile', contribution: ageFactor * WEIGHT_AGE }
	].sort((a, b) => b.contribution - a.contribution);

	parts.push(`(strongest factor: ${factors[0].name})`);

	if (eligibleCount > 1) {
		parts.push(`— chosen over ${eligibleCount - 1} other eligible applicant(s)`);
	} else {
		parts.push('— only eligible applicant');
	}

	return parts.join(' ');
}
