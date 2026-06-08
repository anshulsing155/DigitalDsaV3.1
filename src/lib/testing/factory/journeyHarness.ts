/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Journey Harness: DSL helpers
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tiny builders that make journey declarations read like a screenplay:
 *
 *   journey({
 *     id: 'HL-NEW-SAL-CLEAN',
 *     description: '...',
 *     tags: ['home-loan', 'salaried'],
 *     seed: 42,
 *     loanName: 'Home Loan',
 *     steps: [
 *       page('loanRequirementPage', { loanType: 'New Loan', ... }),
 *       page('propertyDetailsPage', { propertyStateName: 'Maharashtra', ... }),
 *       addApplicant({ fullName: 'Amit Deshmukh', ... }),
 *       submit()
 *     ]
 *   })
 *
 * None of these helpers do any validation or I/O — they're sugar for
 * constructing typed literals. The heavy lifting happens in
 * `journeyPlayer.playJourney()`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	Journey,
	JourneyStep,
	AnswersMap,
	ApplicantJourneyData
} from './journeyTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// journey() — top-level constructor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declares a journey. Mostly an identity function but gives the type
 * checker a chance to complain at declaration site (rather than at
 * `toScenario()` call site, which is further from the author).
 *
 * Tag/seed/loanName defaults keep call sites short; any journey worth
 * committing will override them.
 */
export function journey(config: {
	id: string;
	description: string;
	tags?: readonly string[];
	seed?: number;
	loanName: string;
	steps: readonly JourneyStep[];
	initialAnswers?: AnswersMap;
	expectedRoute?: string;
	formPathOverride?: Record<string, string | undefined>;
}): Journey {
	if (!config.steps.length) {
		throw new Error(
			`journey() — ${config.id} has no steps. ` +
				`At minimum add one page() step and a submit().`
		);
	}
	return {
		id: config.id,
		description: config.description,
		tags: config.tags ?? [],
		seed: config.seed ?? 42,
		loanName: config.loanName,
		steps: config.steps,
		initialAnswers: config.initialAnswers,
		expectedRoute: config.expectedRoute,
		formPathOverride: config.formPathOverride
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// page() — fill answers on a page and advance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records a "fill these answers on this page, then click next" action.
 * `answers` is merged into the accumulated AnswersMap on play.
 *
 * Multiple page() steps for the same pageId are legal — they represent
 * the DSA editing the page twice during a single session (e.g. going
 * back to correct a value before continuing). Later keys overwrite
 * earlier ones.
 */
export function page(pageId: string, answers: AnswersMap): JourneyStep {
	return { kind: 'page', pageId, answers };
}

// ─────────────────────────────────────────────────────────────────────────────
// addApplicant() / editApplicant() — applicant modal actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records "the DSA opened the add-applicant modal and filled in this
 * applicant's data." Appends to the applicant list by default; pass
 * `applicantIndex` to insert at a specific position.
 */
export function addApplicant(data: ApplicantJourneyData, applicantIndex?: number): JourneyStep {
	return applicantIndex !== undefined
		? { kind: 'add-applicant', data, applicantIndex }
		: { kind: 'add-applicant', data };
}

/**
 * Records "the DSA re-opened an existing applicant's modal and edited
 * some fields." Shallow-merges into the existing applicant at the
 * given index. Errors at play time if the index is out of bounds.
 */
export function editApplicant(applicantIndex: number, data: ApplicantJourneyData): JourneyStep {
	return { kind: 'edit-applicant', applicantIndex, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// submit() — finalise the journey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Records the final submit click. Visibility-aware required-answer
 * validation happens at this step in the player — a journey that
 * submits without filling every visible required question will fail
 * fast with a descriptive error.
 *
 * Journeys may intentionally omit submit() to model an abandoned
 * session (useful for Phase 1.6 branch-switch tests that never reach
 * the submission filter).
 */
export function submit(): JourneyStep {
	return { kind: 'submit' };
}

// ─────────────────────────────────────────────────────────────────────────────
// fromPool() — deterministic pick from a data pool
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Picks a single element from `pool` deterministically based on the
 * seed + pick-index. Use in journey declarations when the specific
 * value doesn't matter (e.g. "any Tier-1 city") but you want the
 * choice to be reproducible across runs.
 *
 *   const city = fromPool(TIER_1_CITIES, journey.seed, 0);
 *   const name = fromPool(NAMES_MH,     journey.seed, 1);
 *
 * Using a local PRNG keeps the journey harness pure — no global state,
 * no shared RNG across journeys. Each journey is self-contained.
 */
export function fromPool<T>(pool: readonly T[], seed: number, pickIndex: number = 0): T {
	if (pool.length === 0) {
		throw new Error('fromPool() — pool is empty');
	}
	// Lehmer PRNG — same algorithm as SeededRandom in syntheticGenerator.ts
	// so seed-hash determinism is preserved across the fixture system.
	let state = (seed + pickIndex * 2654435761) >>> 0;
	state = (state * 9301 + 49297) % 233280;
	const idx = Math.floor((state / 233280) * pool.length);
	return pool[idx];
}
