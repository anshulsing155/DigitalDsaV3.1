/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Journey-Based Fixture Factory: Type Definitions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A "journey" is a recorded sequence of DSA actions through the loan form.
 * When played by `journeyPlayer.playJourney()`, it produces a `FormEndState`
 * — the accumulated answers + applicants that a real session would hold
 * at submit time. `payloadAssembler.toLoanApplicationPayload()` then
 * converts that end-state into the `LoanApplicationPayload` shape the
 * rule engine expects.
 *
 * This file defines the data shapes only. Behaviour lives in:
 *   - `journeyHarness.ts`       — DSL helpers (`journey()`, `page()`, ...)
 *   - `journeyPlayer.ts`        — playback through the real form engine
 *   - `payloadAssembler.ts`     — FormEndState → LoanApplicationPayload
 *   - `schemaFixtureFactory.ts` — public entry point: toScenario()
 *
 * See `docs/specs/FIXTURE-FACTORY-SPEC.md` §3 (journey-based architecture)
 * and §4a (factory internals file plan) for the design rationale.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { AnswersMap } from '$lib/server/formEngine/visibility.js';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export for convenience (keeps consumers one import away)
// ─────────────────────────────────────────────────────────────────────────────

export type { AnswersMap };

// ─────────────────────────────────────────────────────────────────────────────
// Applicant journey data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Data for a single applicant as the DSA would fill it in the applicant
 * modal. Shape-compatible with the `applicants[i]` objects that the
 * existing `buildApplicantPayload()` consumes — the factory does NOT
 * invent its own applicant shape; it mirrors what real session state
 * produces.
 */
export type ApplicantJourneyData = Record<string, unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// Journey steps (discriminated union)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single atomic action a DSA performs during a form session.
 *
 * Why these four and not more? These are the only actions that affect
 * the accumulated form-state. Everything else the DSA does (clicking
 * next, scrolling, reading guidance) is rendering-only and has no
 * bearing on the submitted payload.
 *
 * `kind: 'page'` — DSA fills answers on a page and advances. `answers`
 * is the delta applied to the accumulated AnswersMap. Pre-existing keys
 * are overwritten; keys not named on this step are preserved (important
 * for branch-switch journeys — see FM-6 in spec §7).
 *
 * `kind: 'add-applicant'` — DSA adds a new applicant via the modal.
 * `applicantIndex` lets later steps target a specific applicant for
 * edits; omit to append.
 *
 * `kind: 'edit-applicant'` — DSA returns to an existing applicant's
 * modal and changes fields. Used for co-applicant updates, relationship
 * edits, etc. Shallow-merges `data` into the existing applicant.
 *
 * `kind: 'submit'` — DSA clicks the final submit button. The player
 * validates visibility-aware required answers at this step. No new
 * data written.
 */
export type JourneyStep =
	| { kind: 'page'; pageId: string; answers: AnswersMap }
	| { kind: 'add-applicant'; data: ApplicantJourneyData; applicantIndex?: number }
	| { kind: 'edit-applicant'; applicantIndex: number; data: ApplicantJourneyData }
	| { kind: 'submit' };

// ─────────────────────────────────────────────────────────────────────────────
// Journey declaration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A complete, named form session. Mirrors the `FormPathScenario`
 * metadata surface (id, description, tags) so the factory can wrap
 * a Journey as a FormPathScenario without additional authoring.
 *
 * `seed` powers any non-deterministic choices the journey defers to
 * `fromPool()` — the harness helper that picks deterministically from
 * a data pool given the journey's seed.
 *
 * `loanName` names which composer schema the player loads. Must match
 * the `loanName` value the form writes into `applicationData` at
 * submit time (e.g. 'Home Loan', 'Loan Against Property').
 */
export interface Journey {
	/** Unique scenario ID, e.g. "HL-NEW-SAL-CLEAN" */
	id: string;
	/** Human-readable description. Populates `FormPathScenario.description`. */
	description: string;
	/** Freeform tags. Populates `FormPathScenario.tags`. */
	tags: readonly string[];
	/** PRNG seed for `fromPool()` picks and any other deterministic randomness. */
	seed: number;
	/** Loan name — dispatches to the correct composer schema at play time. */
	loanName: string;
	/** Sequence of DSA actions. Played in order. */
	steps: readonly JourneyStep[];
	/**
	 * Optional — pre-form answers set by the how-can-we-help flow
	 * (e.g. `loanType`, `facilityType`, `loanVariant`, `ObligationsRunning`).
	 * These keys are NOT validated against the loaded loan schema at play
	 * time — they originate outside the loan form and belong to a separate
	 * "prelude" schema. Authors are trusted to get them right (the
	 * consequence of a typo here is visibility behaving as if the field
	 * were unset, which shows up in `expectedAsked` drift and test
	 * failures — caught downstream).
	 *
	 * `loanName` is set automatically from `Journey.loanName` — do not
	 * duplicate it here.
	 */
	initialAnswers?: AnswersMap;
	/**
	 * Optional — overrides the route the FormPathScenario wrapper
	 * would otherwise derive. Default: `/form/${kebab(loanName)}`.
	 */
	expectedRoute?: string;
	/**
	 * Optional — overrides the Layer-1 form-path metadata that
	 * FormPathScenario surfaces. Most journeys can derive this from
	 * accumulated answers after play.
	 */
	formPathOverride?: Record<string, string | undefined>;
}

// ─────────────────────────────────────────────────────────────────────────────
// End state (output of journeyPlayer.playJourney)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The accumulated state at the moment `submit()` was reached (or at
 * journey end if no explicit submit).
 *
 * `answers` is the loan-level answer map — the equivalent of
 * `formState.loanData[loanName]` in the real application. Includes
 * every key the DSA touched, in order, with branch-switch overwrites
 * applied naturally (no pre-stripping — that's the submission filter's
 * job, not the journey player's).
 *
 * `applicants` is the ordered list of applicant objects as they'd
 * appear in `formState.applicants`.
 *
 * `visitedPageIds` records the ordered list of page IDs the journey
 * traversed. Used by `schemaFixtureFactory` to compute
 * `expectedFill.expectedPageCount` without re-walking the schema.
 *
 * `submitted` is true if the journey included an explicit `submit()`
 * step. Tests can assert on this to distinguish "abandoned" journeys
 * from "completed" ones.
 */
export interface FormEndState {
	answers: AnswersMap;
	applicants: ApplicantJourneyData[];
	visitedPageIds: string[];
	submitted: boolean;
}
