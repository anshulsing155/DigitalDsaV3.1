/**
 * Combined Answers Memoization Utility (CP-5)
 *
 * ==========================================================================
 * ONE OF THREE `buildCombinedAnswers` SHAPES — NOT A COPY.
 * ==========================================================================
 * This file is the canonical client-side combiner for the six form pages.
 * Two other shapes exist and are intentionally different algorithms, NOT
 * duplication. Do NOT consolidate without first reading all three and the
 * closure entry in `docs/RESOLUTION-PLAN.md` §4C.
 *
 *   1. THIS FILE — `$lib/utils/combinedAnswersMemo.ts`
 *      - Flat merge over currentAnswers (no schema walk).
 *      - Does NOT inject type-specific defaults (the form pages use the
 *        fail-HIDE `!=` / `!==` server evaluator from §4A which handles
 *        unanswered deps without needing defaults).
 *      - Adds applicant-derived meta flags (`__applicantCount`,
 *        `__allIndividualsNRI`, `__onlyCompanyApplicant`, `ObligationsRunning`,
 *        `selectedIncomeProfiles`, `__hasOnlyNoCurrentIncome`) — the other two
 *        variants do NOT produce these because applicants don't exist yet at
 *        the loan-picker stage and the server variant gets applicant state
 *        through a different codepath.
 *      - Adds shorthand aliases (`q4_propertyStateName` → `propertyStateName`)
 *        for every answered key.
 *      - Designed to be wrapped with `stableReference()` for Svelte-5 $derived
 *        memoization — returning the same object reference on no-op updates
 *        avoids triggering downstream $effect chains (auto-clear,
 *        getFilteredOptions, getWarning, wizard state).
 *      - Consumers: all 6 form pages (home, lap, plot, personal, business,
 *        professional).
 *
 *   2. `$lib/form/firstPage/schema.ts` `buildCombinedAnswers`
 *      - Walks `schema.pages` and INJECTS type-specific defaults
 *        (multiple-select→[], number→0, checkbox→false, else→'').
 *      - No applicant meta. No shorthand alias layer beyond what the schema
 *        walk produces directly.
 *      - The default injection is load-bearing because the loan-picker page
 *        uses the naive `isQuestionVisible` evaluator from §4A (no fail-HIDE
 *        override). Without injected defaults, `{ "in": [...] }` showWhens
 *        throw on undefined vars and `{ "!": [...] }` diverges between
 *        undefined vs empty string.
 *      - Sole consumer: `src/routes/(app)/form/how-can-we-help/+page.svelte`
 *        (loan-picker).
 *
 *   3. `$lib/server/formEngine/engine.ts` private `buildCombinedAnswers`
 *      - Walks the schema but only copies REAL answers (opposite of #2 — no
 *        defaults; defaults would pollute the submission payload).
 *      - Adds `flagKey` resolution: selected radio/select options with a
 *        `flagKey: { ... }` object merge those key-value pairs into combined
 *        answers (with a contextKey-collision guard to prevent boolean flags
 *        overwriting string "Yes"/"No" answers).
 *      - Uses the server `resolveBindsTo` with the server-only `locationConfig`
 *        pre-flatten branch (compound location questions only exist server-side).
 *      - Lives inside the `jsonLogic.add_operation` singleton-override boundary
 *        from §4A / CLAUDE.md Pitfall #1. Importing server code into client
 *        bundles would flip every client JSON-Logic evaluation to fail-hide
 *        process-wide.
 *
 * The differences matrix:
 *
 *   | Variant                        | Schema walk | Default inject | Applicant meta | flagKey resolve | locationConfig |
 *   |--------------------------------|-------------|----------------|----------------|-----------------|----------------|
 *   | combinedAnswersMemo (THIS)     | ✗           | ✗              | ✓              | ✗               | n/a            |
 *   | firstPage/schema.ts            | ✓           | ✓ per type     | ✗              | ✗               | ✗              |
 *   | server/engine.ts               | ✓           | ✗ (opposite)   | ✗              | ✓               | ✓              |
 *
 * Every row differs from every other row in at least three columns — there is
 * no super-algorithm that makes sense. See `docs/RESOLUTION-PLAN.md` §4C for
 * the full closure rationale.
 * ==========================================================================
 *
 * Performance optimization for form pages. combinedAnswers is a merged view of
 * currentAnswers + shorthand aliases + computed applicant flags, used by showWhen
 * evaluation, option filtering, and warning checks.
 *
 * Problem: combinedAnswers recalculates on EVERY keystroke because it depends on
 * reactive answer state. This creates a new object reference each time, which
 * triggers ALL downstream $derived/$effect chains (auto-clear, getFilteredOptions,
 * getWarning, wizard state, etc.) even when nothing structurally changed.
 *
 * Solution: Shallow-equal memoization. We compare the newly computed object against
 * the previous result. If all keys and values are identical (by ===), we return the
 * SAME object reference. Svelte 5's reactivity system uses reference equality for
 * $derived values — same reference = no downstream propagation.
 *
 * When does this help most?
 * - Text field typing: "150000" is 6 keystrokes, but showWhen conditions typically
 *   depend on categorical fields (radio/select), not text values. The shorthand keys
 *   and computed flags stay identical across keystrokes in the same text field.
 * - Re-renders from unrelated state changes (e.g., applicant data updates that
 *   don't change the computed flags).
 *
 * Usage in form pages:
 *   let previousCombined: Answers = {} as Answers;
 *   let combinedAnswers = $derived.by(() => {
 *     const next = buildCombinedAnswersSecured(currentAnswers, selectedLoan, formState.applicants);
 *     return stableReference(next, previousCombined, (ref) => { previousCombined = ref; });
 *   });
 */

import type { Answers } from '$lib/types/formTypes';
import {
	countStandaloneIndividuals,
	isStandaloneApplicant
} from '$lib/utils/applicantVisibility';

// ============================================================================
// SHALLOW EQUALITY — optimized for Answers objects (flat string/number/boolean values)
// ============================================================================

/**
 * Fast shallow equality check for Answers objects.
 * Returns true if both objects have the same keys with the same values (by ===).
 * Handles arrays by reference (sufficient because showWhen doesn't deep-compare arrays).
 */
export function shallowEqualAnswers(previous: Answers, next: Answers): boolean {
	// Same reference — trivially equal
	if (previous === next) return true;

	const previousKeys = Object.keys(previous);
	const nextKeys = Object.keys(next);

	// Different number of keys — definitely not equal
	if (previousKeys.length !== nextKeys.length) return false;

	// Check every key in 'next' exists in 'previous' with the same value
	for (const key of nextKeys) {
		if (previous[key] !== next[key]) return false;
	}

	return true;
}

/**
 * Returns the previous reference if the new value is shallowly equal,
 * otherwise updates the stored reference and returns the new value.
 *
 * This is the core memoization primitive. By returning the same object
 * reference when nothing changed, Svelte 5's $derived skips notifying
 * downstream subscribers (it uses === to detect changes).
 *
 * @param next - The freshly computed combinedAnswers object
 * @param previous - The last returned reference (stored in a closure variable)
 * @param updateRef - Callback to update the closure variable when reference changes
 * @returns Either `previous` (same reference) or `next` (new reference)
 */
export function stableReference(
	next: Answers,
	previous: Answers,
	updateRef: (ref: Answers) => void
): Answers {
	if (shallowEqualAnswers(previous, next)) {
		return previous;
	}
	updateRef(next);
	return next;
}

// ============================================================================
// COMMON BUILDING BLOCKS — shared across all 6 form pages
// ============================================================================

/**
 * Applicant-like structure used for computing combined answer flags.
 * Intentionally loose to avoid coupling to the full applicant type.
 * Note: isNRI is typed as boolean in the Applicant interface but
 * used as 'Yes'/'No' string at runtime — accept both to avoid cast issues.
 */
interface ApplicantLike {
	applicantType?: string;
	isNRI?: boolean | string;
	ObligationsRunning?: unknown;
	selectedIncomeProfiles?: string[];
	[key: string]: unknown;
}

const MONTH_ABBREV: Record<string, number> = {
	Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
	Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

/**
 * Parse "MMM-YYYY" (e.g. "Jan-2011") and return months elapsed since then.
 * Returns null if the format is unrecognisable or the date is in the future.
 *
 * Accepts an optional `referenceDate` for deterministic testing — production
 * callers omit it and get real-time behaviour. See review finding M3
 * (CODE-REVIEW-2026-05-12) for why this parameter exists.
 */
export function computeMonthsSinceDisbursement(
	raw: string,
	referenceDate?: Date
): number | null {
	const parts = raw.split('-');
	if (parts.length !== 2) return null;
	const monthIdx = MONTH_ABBREV[parts[0]];
	const year = parseInt(parts[1], 10);
	if (monthIdx === undefined || isNaN(year)) return null;

	const now = referenceDate ?? new Date();
	const months = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIdx);
	return months > 0 ? months : null;
}

/**
 * Build the base combinedAnswers object shared by ALL form pages.
 * Handles: shorthand aliases, loanName, applicant count, NRI flags,
 * only-company flag, obligations, income profiles.
 *
 * Each form page adds its own loan-type-specific fields on top.
 */
export function buildCombinedAnswersBase(
	currentAnswers: Answers,
	selectedLoan: string,
	applicants: ApplicantLike[]
): Answers {
	const combined: Answers = { ...currentAnswers };

	// Add shorthand keys: "q4_propertyStateName" → "propertyStateName"
	for (const [key, value] of Object.entries(currentAnswers)) {
		if (key.includes('_')) {
			const shortKey = key.split('_').pop() || '';
			if (shortKey) combined[shortKey] = value;
		}
	}

	// Loan identity
	combined['q1_loanName'] = selectedLoan;
	combined['loanName'] = selectedLoan;

	// Applicant count — must mirror the Who's Applying table (typed rows only,
	// director-linked Individuals fold under their parent Company).
	combined['__applicantCount'] = applicants.filter((a) => a.applicantType).length;

	// NRI detection: true only when ALL standalone individual applicants are NRI.
	// Director-linked Individuals are excluded — their NRI status is part of their
	// company sub-row, not a standalone NRI gate for the loan.
	const standaloneIndividuals = applicants.filter(
		(a) => a.applicantType === 'Individual' && isStandaloneApplicant(a, applicants)
	);
	combined['__allIndividualsNRI'] =
		standaloneIndividuals.length > 0 && standaloneIndividuals.every((a) => a.isNRI === 'Yes');

	// Only-company flag: single applicant that is a company
	combined['__onlyCompanyApplicant'] =
		applicants.length === 1 && applicants[0]?.applicantType === 'Company';

	// Primary applicant's obligation status
	const obligationsRunning = applicants[0]?.ObligationsRunning;
	if (obligationsRunning !== undefined) combined['ObligationsRunning'] = obligationsRunning;

	// Primary applicant's income profiles
	const profiles = applicants[0]?.selectedIncomeProfiles as string[] | undefined;
	if (profiles) {
		combined['selectedIncomeProfiles'] = profiles;
		combined['__hasOnlyNoCurrentIncome'] =
			profiles.length === 1 && profiles[0] === 'no_current_income';
	}

	// BT: compute max possible EMIs from disbursement date for cross-field validation
	const disbDateRaw = combined['loanDisbursementDate'] as string | undefined;
	if (disbDateRaw && typeof disbDateRaw === 'string') {
		const maxEmis = computeMonthsSinceDisbursement(disbDateRaw);
		if (maxEmis !== null) combined['_maxPossibleEmis'] = maxEmis;
	}

	return combined;
}

/**
 * Build combinedAnswers for SECURED loan forms (Home Loan, LAP, Plot Loan).
 * Adds loanType (Scope), loanVariant (Plot only), and facilityType (LAP only).
 */
export function buildCombinedAnswersSecured(
	currentAnswers: Answers,
	selectedLoan: string,
	applicants: ApplicantLike[]
): Answers {
	const combined = buildCombinedAnswersBase(currentAnswers, selectedLoan, applicants);

	combined['loanType'] = (currentAnswers as Record<string, unknown>).loanType ?? '';
	combined['loanVariant'] = (currentAnswers as Record<string, unknown>).loanVariant ?? '';
	combined['facilityType'] = (currentAnswers as Record<string, unknown>).facilityType ?? '';

	return combined;
}

/**
 * Build combinedAnswers for UNSECURED loan forms (Personal, Business, Professional).
 * Adds multi-applicant flags, NRI bridge, loanType (Scope), and facilityType.
 *
 * @param includeNriBridge - true for Personal Loan (bridges per-applicant NRI to form-level key)
 * @param isSingleApplicant - current single-applicant mode state
 */
export function buildCombinedAnswersUnsecured(
	currentAnswers: Answers,
	selectedLoan: string,
	applicants: ApplicantLike[],
	isSingleApplicant: boolean,
	includeNriBridge: boolean
): Answers {
	const combined = buildCombinedAnswersBase(currentAnswers, selectedLoan, applicants);

	// Multi-applicant mode flags (unsecured forms have explicit multi-applicant UX)
	combined['__multiApplicantMode'] = !isSingleApplicant;
	combined['__individualApplicantCount'] = countStandaloneIndividuals(applicants);

	// Bridge per-applicant NRI to form-level key (Personal Loan only — used by location questions)
	if (includeNriBridge) {
		const firstNRI = (applicants[0] as any)?.isNRI;
		if (firstNRI) combined['ApplicantIsNRI'] = firstNRI;
	}

	combined['loanType'] = (currentAnswers as Record<string, unknown>).loanType ?? '';
	combined['facilityType'] = (currentAnswers as Record<string, unknown>).facilityType ?? '';

	return combined;
}
