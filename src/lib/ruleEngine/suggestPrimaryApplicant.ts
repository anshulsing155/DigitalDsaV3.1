/**
 * Suggest Primary Applicant — ranks applicants by composite score
 * and suggests reordering when a stronger candidate exists.
 *
 * The rule engine treats applicants[0] as "primary" for age-at-maturity,
 * employment type, CIBIL display, and variation matching. If a weaker
 * applicant sits at index 0, results suffer silently.
 *
 * This module surfaces an advisory suggestion to the DSA when a better
 * candidate exists. It does NOT auto-reorder — the DSA decides.
 *
 * Scoring: CIBIL (40%) + Income (30%) + Age sweet-spot (15%) + Employment (15%)
 * Same weights as plApplicantSelector.ts for consistency.
 *
 * Pure function — no DB, no side effects.
 */

// ============================================================================
// 1. TYPES
// ============================================================================

export interface ApplicantScore {
	index: number;
	name: string;
	creditScore: number;
	monthlyIncome: number;
	age: number;
	employmentType: string;
	compositeScore: number;
}

export interface PrimarySuggestion {
	/** Index of the recommended primary applicant */
	suggestedIndex: number;
	/** Display name of recommended applicant */
	suggestedName: string;
	/** Display name of current applicant at index 0 */
	currentName: string;
	/** Human-readable reason for the suggestion */
	reason: string;
	/** All scored applicants for transparency */
	scores: ApplicantScore[];
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

/** Only suggest reorder if top scorer beats current [0] by this margin */
const SUGGESTION_THRESHOLD = 0.1;

/** Scoring weights — same as plApplicantSelector for consistency */
const WEIGHT_CIBIL = 0.4;
const WEIGHT_INCOME = 0.3;
const WEIGHT_AGE = 0.15;
const WEIGHT_EMPLOYMENT = 0.15;

/** Income normalization cap — scores plateau at 2 lakh/month */
const INCOME_CAP = 200_000;

/** CIBIL normalization: 300 floor, 600 range */
const CIBIL_FLOOR = 300;
const CIBIL_RANGE = 600;

/** Employment type scores */
const EMPLOYMENT_SCORES: Record<string, number> = {
	'Salaried(Private)': 1.0,
	'Salaried(Government)': 1.0,
	'Self-employed(Professional)': 0.7,
	'Self-employed(Businessman)': 0.7,
	'Self-employed(Other)': 0.7
};
const DEFAULT_EMPLOYMENT_SCORE = 0.5;

// ============================================================================
// 3. NORMALIZATION HELPERS
// ============================================================================

function normalizeCibil(score: number): number {
	if (score <= CIBIL_FLOOR) return 0;
	return Math.min((score - CIBIL_FLOOR) / CIBIL_RANGE, 1);
}

function normalizeIncome(income: number): number {
	if (income <= 0) return 0;
	return Math.min(income / INCOME_CAP, 1);
}

/**
 * Age factor: peaks at 28-50 (broader than PL selector's 30-45).
 * For general primary applicant ranking, slightly wider prime range
 * since secured loans allow longer tenures.
 *
 *   21-27: ramp from 0.6 to 1.0
 *   28-50: plateau at 1.0
 *   51-65: decline from 1.0 to 0.4
 *   Outside 21-65: 0
 */
function ageFactor(age: number): number {
	if (age < 21 || age > 65) return 0;
	if (age >= 28 && age <= 50) return 1.0;
	if (age < 28) return 0.6 + (age - 21) * (0.4 / 7);
	// 51-65: declining
	return 1.0 - (age - 50) * (0.6 / 15);
}

function employmentScore(type: string): number {
	return EMPLOYMENT_SCORES[type] ?? DEFAULT_EMPLOYMENT_SCORE;
}

// ============================================================================
// 4. INCOME EXTRACTION (same logic as plApplicantSelector)
// ============================================================================

function extractIncome(applicant: Record<string, unknown>): number {
	const gross = Number(applicant.grossIncome) || 0;
	if (gross > 0) return gross;

	const net = Number(applicant.netIncome) || 0;
	if (net > 0) return net;

	// Sum incomeEntries if available
	const entries = applicant.incomeEntries as Array<Record<string, unknown>> | undefined;
	if (!entries?.length) return 0;

	let total = 0;
	for (const entry of entries) {
		const income = entry.income as Record<string, unknown> | undefined;
		if (!income) continue;

		const amount =
			Number(income.grossMonthlySalary) ||
			Number(income.netMonthlySalary) ||
			Number(income.monthlySalaryAmount) ||
			Number(income.averageProfitPerWithdrawal) ||
			Number(income.netProfessionalIncome) ||
			Number(income.monthlyPensionAmount) ||
			Number(income.monthlyRentAmount) ||
			Number(income.averageMonthlyFreelanceIncome) ||
			0;
		total += amount;
	}
	return total;
}

// ============================================================================
// 5. MAIN FUNCTION
// ============================================================================

/**
 * Suggest a better primary applicant if one exists.
 *
 * Returns null when:
 *   - Only 1 individual applicant (nothing to compare)
 *   - Current [0] is already the best or within threshold
 *   - Professional loan (profession constraint locks [0])
 *   - All applicants are Company type
 */
export function suggestPrimaryApplicant(
	applicants: Record<string, unknown>[],
	loanName: string
): PrimarySuggestion | null {
	// Professional loans have a hard constraint — first applicant must match profession
	if (loanName.toLowerCase().includes('professional')) return null;

	// Score only Individual applicants
	const scored: ApplicantScore[] = [];
	for (let i = 0; i < applicants.length; i++) {
		const applicant = applicants[i];
		if (String(applicant.applicantType ?? 'Individual') === 'Company') continue;

		const creditScore = Number(applicant.creditScore) || 0;
		const age = Number(applicant.age) || 0;
		const monthlyIncome = extractIncome(applicant);
		const empType = String(applicant.employmentType ?? 'unknown');

		const composite =
			normalizeCibil(creditScore) * WEIGHT_CIBIL +
			normalizeIncome(monthlyIncome) * WEIGHT_INCOME +
			ageFactor(age) * WEIGHT_AGE +
			employmentScore(empType) * WEIGHT_EMPLOYMENT;

		scored.push({
			index: i,
			name: String(applicant.fullName ?? `Applicant ${i + 1}`),
			creditScore,
			monthlyIncome,
			age,
			employmentType: empType,
			compositeScore: Math.round(composite * 1000) / 1000
		});
	}

	// Need at least 2 individuals to compare
	if (scored.length < 2) return null;

	// Sort by composite score descending
	const ranked = [...scored].sort((a, b) => b.compositeScore - a.compositeScore);

	const best = ranked[0];
	const currentPrimary = scored.find((s) => s.index === 0);

	// Current [0] is already the best — no suggestion needed
	if (!currentPrimary || best.index === 0) return null;

	// Check if the difference exceeds threshold
	const scoreDiff = best.compositeScore - currentPrimary.compositeScore;
	if (
		currentPrimary.compositeScore === 0 ||
		scoreDiff / currentPrimary.compositeScore < SUGGESTION_THRESHOLD
	) {
		return null;
	}

	// Build human-readable reason highlighting the key advantage
	const reason = buildReason(best, currentPrimary);

	return {
		suggestedIndex: best.index,
		suggestedName: best.name,
		currentName: currentPrimary.name,
		reason,
		scores: scored
	};
}

// ============================================================================
// 6. REASON BUILDER
// ============================================================================

function buildReason(best: ApplicantScore, current: ApplicantScore): string {
	const advantages: string[] = [];

	if (best.creditScore > current.creditScore) {
		advantages.push(`higher CIBIL (${best.creditScore} vs ${current.creditScore})`);
	}
	if (best.monthlyIncome > current.monthlyIncome * 1.1) {
		advantages.push('higher income');
	}
	if (ageFactor(best.age) > ageFactor(current.age)) {
		advantages.push(`better age profile (${best.age} yrs)`);
	}

	if (advantages.length === 0) {
		return `${best.name} has a stronger overall profile for primary applicant`;
	}

	return `${best.name} has ${advantages.join(', ')}`;
}
