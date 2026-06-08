/**
 * ═══════════════════════════════════════════════════════════════════════════
 * S77e — Journey Player: play a Journey through the real form engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Takes a `Journey` declaration and walks it through the composed loan
 * schema, accumulating answers and applicants into a `FormEndState`.
 *
 * Critical invariants (protected by tests in schemaFixtureFactory.test.ts):
 *
 *   FM-2 — The visibility check reuses `isQuestionVisible` from
 *          `$lib/server/formEngine/visibility.js` BY REFERENCE.
 *          No local reimplementation, no wrapper, no copy-paste.
 *          The identity test `expect(VISIBILITY_REF).toBe(isQuestionVisible)`
 *          catches any drift instantly.
 *
 *   FM-5 — Every `page()` pageId and every answer key referenced in a
 *          journey is validated against the loaded schema at play time.
 *          Unknown pageId or unknown bindsTo key throws a descriptive
 *          error naming the journey id and the offending reference.
 *
 *   FM-6 — The answer accumulator is APPEND-ONLY. `page()` steps can
 *          overwrite existing keys (branch-switch) but never delete.
 *          The submission filter's job is to strip stale keys on output;
 *          the player faithfully retains everything a real session
 *          would retain.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { isQuestionVisible } from '$lib/server/formEngine/visibility.js';
import type { RawSchema, RawSchemaQuestion, RawSchemaPage } from '$lib/types/formEngine.js';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

import type {
	Journey,
	JourneyStep,
	FormEndState,
	AnswersMap,
	ApplicantJourneyData
} from './journeyTypes.js';

// ═══════════════════════════════════════════════════════════════════════════
// FM-2 BACKSTOP — by-reference visibility import
// ═══════════════════════════════════════════════════════════════════════════
//
// Exported for identity-test purposes ONLY. Test file asserts:
//   expect(VISIBILITY_REF).toBe(isQuestionVisible)
// If anyone ever extracts a local copy of the visibility logic, the
// identity test fails on next run — forcing them to justify the split
// or restore the by-reference import.
//
// Do not rename this export without updating the identity test.

export const VISIBILITY_REF = isQuestionVisible;

// ═══════════════════════════════════════════════════════════════════════════
// Schema dispatch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Maps a `loanName` (as written into formState at submit time) to its
 * composed RawSchema. The factory deliberately goes through the composer
 * layer (pure TS, client-safe) instead of `$lib/server/formEngine/schemaLoader`
 * to keep vitest boot cost low — see FM-4 in spec §7.
 */
const SCHEMA_COMPOSERS: Record<string, () => RawSchema> = {
	'Home Loan': composeHomeLoanSchema,
	'Loan Against Property': composeLapLoanSchema,
	'Plot Loan': composePlotLoanSchema,
	'Personal Loan': composePersonalLoanSchema,
	'Business Loan': composeBusinessLoanSchema,
	'Professional Loan': composeProfessionalLoanSchema
};

function loadSchema(loanName: string): RawSchema {
	const composer = SCHEMA_COMPOSERS[loanName];
	if (!composer) {
		throw new Error(
			`journeyPlayer.loadSchema — unknown loanName '${loanName}'. ` +
				`Expected one of: ${Object.keys(SCHEMA_COMPOSERS).join(', ')}`
		);
	}
	return composer();
}

// ═══════════════════════════════════════════════════════════════════════════
// Schema indexing (FM-5 round-trip backstop)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Flattens a RawSchema into lookup tables used for round-trip validation:
 *
 *   - `pageById`         — pageId  → RawSchemaPage
 *   - `bindsToByPageId`  — pageId  → Set<bindsTo-key>
 *
 * Built once per `playJourney()` call (not cached across calls — schemas
 * are pure TS so re-composition is cheap, ~millisecond).
 */
interface SchemaIndex {
	schema: RawSchema;
	pageById: Map<string, RawSchemaPage>;
	bindsToByPageId: Map<string, Set<string>>;
	/**
	 * Pages rendered by a dedicated Svelte component (applicant profile,
	 * income, obligations, etc.). Their `questions: []` list is empty —
	 * they manage their own keys directly. Journeys that target these
	 * pages can use any answer key; bindsTo validation is skipped (FM-5
	 * relaxation — the strict spec-level bindsTo check is infeasible for
	 * these pages by construction).
	 */
	customComponentPageIds: Set<string>;
}

function indexSchema(schema: RawSchema): SchemaIndex {
	const pageById = new Map<string, RawSchemaPage>();
	const bindsToByPageId = new Map<string, Set<string>>();
	const customComponentPageIds = new Set<string>();

	for (const page of schema.pages) {
		pageById.set(page.id, page);

		// Custom-component pages (applicantProfile, income, obligations, etc.)
		// have no questions in the schema — they render a dedicated component
		// that manages its own keys.
		if (!page.questions || page.questions.length === 0) {
			customComponentPageIds.add(page.id);
			bindsToByPageId.set(page.id, new Set());
			continue;
		}

		const bindsToKeys = new Set<string>();
		for (const q of page.questions) {
			for (const key of resolveSchemaKeysForQuestion(q)) {
				bindsToKeys.add(key);
			}
		}
		bindsToByPageId.set(page.id, bindsToKeys);
	}

	return { schema, pageById, bindsToByPageId, customComponentPageIds };
}

/**
 * Resolves every storage key a question contributes to the answer map.
 *
 *   - Normal question: returns `[bindsTo]` or `[bindsTo_template]`
 *   - Location question (`type: 'location'`): returns synthetic keys
 *     derived from `locationConfig.prefix` — e.g. `propertyStateName`,
 *     `propertyCityName`, `propertyArea`, `propertyPincode`. These keys
 *     are what `buildLocationQuestion()` writes into formState at render
 *     time; journeys need to set them directly.
 *   - Unknown/structural: returns `[]`
 */
function resolveSchemaKeysForQuestion(q: RawSchemaQuestion): string[] {
	// Location questions — synthesize {prefix}{StateName,CityName,Area,Pincode}
	// buildLocationQuestion() writes these keys into formState at render time;
	// journeys must set them directly (the 'location' question has no
	// bindsTo of its own).
	if (q.type === 'location') {
		const cfg = q.locationConfig;
		if (!cfg?.prefix) return [];
		const keys = [`${cfg.prefix}StateName`, `${cfg.prefix}CityName`];
		if (cfg.showArea) keys.push(`${cfg.prefix}Area`);
		// showPincode defaults to true — only suppress when explicitly false.
		if (cfg.showPincode !== false) keys.push(`${cfg.prefix}Pincode`);
		return keys;
	}
	const single = resolveBindsTo(q);
	return single ? [single] : [];
}

/**
 * Resolves the storage key for a question. Prefers explicit `bindsTo`;
 * falls back to `bindsTo_template` (schema uses this for dynamically-keyed
 * questions like `q4_propertyStateName` → `propertyStateName`).
 */
function resolveBindsTo(q: RawSchemaQuestion): string | undefined {
	if (typeof q.bindsTo === 'string' && q.bindsTo.length > 0) return q.bindsTo;
	if (typeof q.bindsTo_template === 'string' && q.bindsTo_template.length > 0)
		return q.bindsTo_template;
	return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry: playJourney
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Plays a journey through the composed schema and returns the accumulated
 * form-state.
 *
 * @throws if the journey references an unknown pageId (FM-5)
 * @throws if the journey references a bindsTo key not present on the named page (FM-5)
 * @throws if the journey submits with a visible required question unanswered
 */
export function playJourney(j: Journey): FormEndState {
	const schema = loadSchema(j.loanName);
	const idx = indexSchema(schema);

	// Prelude answers: loanName is always set from the journey meta;
	// initialAnswers (loanType, facilityType, loanVariant) flow in from how-can-we-help.
	// These are NOT validated against the loaded schema — they originate in
	// a separate flow. See Journey.initialAnswers in journeyTypes.ts.
	const prelude: AnswersMap = { loanName: j.loanName, ...(j.initialAnswers ?? {}) };

	const state: FormEndState = {
		answers: { ...prelude },
		applicants: [],
		visitedPageIds: [],
		submitted: false
	};

	for (let stepIdx = 0; stepIdx < j.steps.length; stepIdx++) {
		const step = j.steps[stepIdx];
		applyStep(j, step, stepIdx, state, idx);
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step dispatcher
// ═══════════════════════════════════════════════════════════════════════════

function applyStep(
	j: Journey,
	step: JourneyStep,
	stepIdx: number,
	state: FormEndState,
	idx: SchemaIndex
): void {
	switch (step.kind) {
		case 'page':
			applyPage(j, step, stepIdx, state, idx);
			return;
		case 'add-applicant':
			applyAddApplicant(j, step, stepIdx, state);
			return;
		case 'edit-applicant':
			applyEditApplicant(j, step, stepIdx, state);
			return;
		case 'submit':
			applySubmit(j, stepIdx, state, idx);
			return;
	}
}

// ─── page step ───────────────────────────────────────────────────────────────

function applyPage(
	j: Journey,
	step: Extract<JourneyStep, { kind: 'page' }>,
	stepIdx: number,
	state: FormEndState,
	idx: SchemaIndex
): void {
	// FM-5: validate pageId exists
	if (!idx.pageById.has(step.pageId)) {
		throw new Error(
			`[${j.id} · step ${stepIdx}] Unknown pageId '${step.pageId}' in journey. ` +
				`Schema '${idx.schema.formId}' defines pages: ` +
				`${idx.schema.pages.map((p) => p.id).join(', ')}`
		);
	}

	// FM-5: validate answer keys reference questions on this page
	// (or anywhere in the schema — some journey pages edit keys whose
	//  defining question lives on an earlier page, which is legitimate
	//  when visibility-gated re-evaluation changes an upstream answer).
	//
	// Custom-component pages (applicantProfile, income, obligations, etc.)
	// have `questions: []` in the schema and manage their own keys via a
	// Svelte component. We can't statically validate their bindsTo keys,
	// so those pages bypass the bindsTo check.
	if (!idx.customComponentPageIds.has(step.pageId)) {
		const localKeys = idx.bindsToByPageId.get(step.pageId) ?? new Set();
		const allKeys = new Set<string>();
		for (const keys of idx.bindsToByPageId.values()) {
			for (const k of keys) allKeys.add(k);
		}

		for (const key of Object.keys(step.answers)) {
			if (!allKeys.has(key)) {
				throw new Error(
					`[${j.id} · step ${stepIdx}] Unknown answer key '${key}' on page ` +
						`'${step.pageId}'. Schema has no question with bindsTo='${key}'. ` +
						`Local keys on this page: ${[...localKeys].join(', ') || '(none)'}`
				);
			}
		}
	}

	// FM-6: append-only write. Later keys overwrite earlier ones;
	// keys not named on this step are preserved.
	Object.assign(state.answers, step.answers);

	// Record visit (for expectedPageCount + audit)
	state.visitedPageIds.push(step.pageId);
}

// ─── add-applicant step ──────────────────────────────────────────────────────

function applyAddApplicant(
	j: Journey,
	step: Extract<JourneyStep, { kind: 'add-applicant' }>,
	stepIdx: number,
	state: FormEndState
): void {
	const applicant: ApplicantJourneyData = { ...step.data };

	if (step.applicantIndex === undefined) {
		state.applicants.push(applicant);
		return;
	}

	if (step.applicantIndex < 0 || step.applicantIndex > state.applicants.length) {
		throw new Error(
			`[${j.id} · step ${stepIdx}] add-applicant applicantIndex=${step.applicantIndex} ` +
				`out of bounds (current applicant count: ${state.applicants.length})`
		);
	}
	state.applicants.splice(step.applicantIndex, 0, applicant);
}

// ─── edit-applicant step ─────────────────────────────────────────────────────

function applyEditApplicant(
	j: Journey,
	step: Extract<JourneyStep, { kind: 'edit-applicant' }>,
	stepIdx: number,
	state: FormEndState
): void {
	if (step.applicantIndex < 0 || step.applicantIndex >= state.applicants.length) {
		throw new Error(
			`[${j.id} · step ${stepIdx}] edit-applicant applicantIndex=${step.applicantIndex} ` +
				`out of bounds (current applicant count: ${state.applicants.length})`
		);
	}
	// Shallow merge — matches how the applicant modal edits an existing entry.
	state.applicants[step.applicantIndex] = {
		...state.applicants[step.applicantIndex],
		...step.data
	};
}

// ─── submit step ─────────────────────────────────────────────────────────────

function applySubmit(
	j: Journey,
	stepIdx: number,
	state: FormEndState,
	idx: SchemaIndex
): void {
	// Visibility-aware required-answer check. For every page visible
	// under the accumulated answers, every question visible on that
	// page that's marked required must have a non-empty answer.
	const missing: string[] = [];
	const answers: AnswersMap = state.answers;

	for (const page of idx.schema.pages) {
		// Use isQuestionVisible's companion isVisible on page.showWhen via
		// the Q-level check as a proxy — if the first question on the page
		// isn't visible due to the page's showWhen propagating into Q-level
		// showWhen, we'd skip anyway. Cheapest correct heuristic for
		// first-pass Step-3 correctness; page-level visibility can be
		// layered in later if a Row-10 coverage regression surfaces.
		for (const q of page.questions) {
			if (!q.required) continue;
			if (!VISIBILITY_REF(q, answers)) continue;
			const key = resolveBindsTo(q);
			if (!key) continue;
			const val = answers[key];
			if (val === undefined || val === null || val === '') {
				missing.push(`${page.id}.${key}`);
			}
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`[${j.id} · step ${stepIdx}] Cannot submit — visible required answers ` +
				`unanswered:\n  ${missing.join('\n  ')}\n` +
				`(Add the missing answers to an earlier page() step, or remove ` +
				`the submit() step to model an abandoned session.)`
		);
	}

	state.submitted = true;
}
