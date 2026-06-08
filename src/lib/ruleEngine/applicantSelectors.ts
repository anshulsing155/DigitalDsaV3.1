/**
 * Applicant Selectors — pick the optimal applicant for each rule engine purpose.
 *
 * The rule engine needs different "representative" applicants for different contexts:
 *   - Age-at-maturity: youngest (maximizes available tenure)
 *   - CIBIL gates/display: highest credit score (best case for the application)
 *   - Employment classification: most favorable employment type (salaried > self-employed)
 *
 * All functions filter to Individual applicants only (Company applicants don't have
 * personal age/CIBIL/employment). Returns undefined when no individuals found.
 *
 * Pure functions — no DB, no side effects. Accept Record<string, unknown>[] for
 * compatibility with the loosely-typed payload used throughout the engine.
 */

// ============================================================================
// 1. EMPLOYMENT PRIORITY MAP
// ============================================================================

/**
 * Employment type priority — higher = more favorable for underwriting.
 * Government salaried is most preferred (stable, verifiable income).
 * Self-employed types are less preferred (harder to assess, volatile income).
 */
const EMPLOYMENT_PRIORITY: Record<string, number> = {
	'Salaried(Government)': 5,
	'Salaried(Private)': 4,
	'Self-employed(Professional)': 3,
	'Self-employed(Businessman)': 2,
	'Self-employed(Other)': 1
};

const DEFAULT_EMPLOYMENT_PRIORITY = 0;

// ============================================================================
// 2. INDIVIDUAL FILTER
// ============================================================================

/**
 * Filter to Individual applicants only.
 * Company applicants don't have personal demographics (age, CIBIL, employment).
 */
function individualsOnly(applicants: Record<string, unknown>[]): Record<string, unknown>[] {
	return applicants.filter((a) => String(a.applicantType ?? 'Individual') !== 'Company');
}

// ============================================================================
// 3. SELECTOR FUNCTIONS
// ============================================================================

/**
 * Select the youngest Individual applicant.
 * Used for age-at-maturity calculations — youngest = maximum possible tenure.
 *
 * Falls back to applicants[0] when all ages are missing (age 0 or undefined).
 */
export function selectYoungest(
	applicants: Record<string, unknown>[]
): Record<string, unknown> | undefined {
	const individuals = individualsOnly(applicants);
	if (individuals.length === 0) return undefined;
	if (individuals.length === 1) return individuals[0];

	// Find the individual with the lowest positive age
	let youngest: Record<string, unknown> | undefined;
	let youngestAge = Infinity;

	for (const a of individuals) {
		const age = Number(a.age) || 0;
		// Skip zero/missing ages — they'd always "win" but represent missing data
		if (age > 0 && age < youngestAge) {
			youngestAge = age;
			youngest = a;
		}
	}

	// If all ages are 0/missing, return the first individual as fallback
	return youngest ?? individuals[0];
}

/**
 * Select the Individual with the highest credit score.
 * Used for CIBIL gates and gap analysis — shows the strongest credit position.
 */
export function selectHighestCibil(
	applicants: Record<string, unknown>[]
): Record<string, unknown> | undefined {
	const individuals = individualsOnly(applicants);
	if (individuals.length === 0) return undefined;
	if (individuals.length === 1) return individuals[0];

	let best: Record<string, unknown> | undefined;
	let bestScore = -1;

	for (const a of individuals) {
		const score = Number(a.creditScore) || 0;
		if (score > bestScore) {
			bestScore = score;
			best = a;
		}
	}

	return best ?? individuals[0];
}

/**
 * Select the Individual with the most favorable employment type.
 * Used for employment classification in rule evaluation — salaried is preferred
 * because it's easier for lenders to verify and more stable.
 */
export function selectBestEmployment(
	applicants: Record<string, unknown>[]
): Record<string, unknown> | undefined {
	const individuals = individualsOnly(applicants);
	if (individuals.length === 0) return undefined;
	if (individuals.length === 1) return individuals[0];

	let best: Record<string, unknown> | undefined;
	let bestPriority = -1;

	for (const a of individuals) {
		const empType = String(a.employmentType ?? 'unknown');
		const priority = EMPLOYMENT_PRIORITY[empType] ?? DEFAULT_EMPLOYMENT_PRIORITY;
		if (priority > bestPriority) {
			bestPriority = priority;
			best = a;
		}
	}

	return best ?? individuals[0];
}
