/**
 * Payload Filter — Submission Pipeline Layer A + B
 * ═══════════════════════════════════════════════════════════════════
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The raw form store (`formState.loanData[loanName]`) intentionally keeps
 * every answer the user ever gave — even answers to questions that are now
 * invisible because of a later branch switch (e.g. user answered a dozen
 * "Business" questions, then flipped employment to "Salaried"; we keep those
 * answers so that if the user flips back the form is pre-populated).
 *
 * The submission pipeline (rule engine, persisted snapshot, external API)
 * must NOT see those stale answers — they would pollute derivations
 * (`_computed.*`, `_is_business_file`) and produce wrong assessments.
 *
 * This module produces a **filtered view** of the raw store for submission:
 *  - Raw memory is untouched (form bindings still get the full history).
 *  - The filtered view is a projection — never a mutation.
 *  - Downstream builders, enricher, and case-insights derivations read the
 *    filtered view, not raw.
 *
 * TWO LAYERS
 * ──────────
 * Layer A (floor — schema-driven, default-safe)
 *    `buildCleanAnswers(schema, rawLoanAnswers)` drops every key whose page
 *    or question is invisible under the current answers. New questions are
 *    auto-excluded when hidden. Requires a schema — not always available
 *    client-side today (see Phase 1.6 follow-up in SESSION-HANDOFF.md).
 *    When `schema` is `null`, Layer A is a passthrough.
 *
 * Layer B (exceptions — gate-driven, primary enforcement today)
 *    Pure functions of shape `(input, context) => output` that either
 *    (a) re-admit loan-answer keys Layer A dropped but business rules still
 *        require, or
 *    (b) filter per-applicant arrays (obligations, incomeEntries) based on
 *        applicant-level state (guarantor-only mode, deselected income
 *        profiles, etc.). Per-applicant data never passes through Layer A
 *        because it lives in a separate array, not in the schema.
 *
 * Until Phase 1.6 plumbs the schema client-side, Layer B does almost all of
 * the actual work. The gate registry is the audit trail — adding or removing
 * a gate here is the only code-level surface for changing the contract.
 *
 * IDEMPOTENCE
 * ───────────
 * The current builders (`cleanObligationEntries`, `extractIncomeEntries`)
 * perform the same filtering inline as the gates below. This is deliberate
 * defensive duplication during the migration — if an unfiltered applicant
 * record sneaks past this layer, the builder still produces correct output.
 * A future phase can collapse the duplication once every consumer is
 * confirmed to go through `buildFilteredAnswers`.
 *
 * SEE ALSO
 * ────────
 *  - docs/SESSION-HANDOFF.md §S77c — architecture decision + phase plan
 *  - docs/PAYLOAD_DOCUMENTATION.md — gate registry rationale
 *  - src/lib/utils/payloadGrouping.ts — `buildCleanAnswers` (Layer A)
 *  - src/lib/utils/payloadBuilder/obligationPayload.ts — source of guarantor gate
 *  - src/lib/utils/payloadBuilder/incomePayload.ts — source of income-profile gate
 * ═══════════════════════════════════════════════════════════════════
 */

import { buildCleanAnswers } from './payloadGrouping.js';
import type { Schema } from '$lib/types/formTypes';

// ────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ────────────────────────────────────────────────────────────────────

/**
 * The filtered projection of raw form state consumed by the submission
 * pipeline. Loan-level answers are a flat Record; applicants are an array
 * of per-applicant records, each already scrubbed by the applicant gates.
 */
export interface FilteredView {
	loanAnswers: Record<string, unknown>;
	applicants: Record<string, unknown>[];
}

/**
 * A Layer-B gate operating on the loan-level answers Record.
 * Runs AFTER Layer A. May re-admit a key Layer A dropped, or strip a key
 * Layer A let through but business rules disallow.
 */
export interface LoanAnswersGate {
	/** Machine-readable identifier — used in logging and tests */
	readonly name: string;
	/** Human-readable justification — what business rule does this enforce? */
	readonly description: string;
	/**
	 * @param filtered  — the output of Layer A (or the chain of prior gates)
	 * @param raw       — the untouched raw loanAnswers (for re-admit lookups)
	 * @returns the new filtered state (must not mutate `filtered` or `raw`)
	 */
	apply(
		filtered: Record<string, unknown>,
		raw: Record<string, unknown>
	): Record<string, unknown>;
}

/**
 * A Layer-B gate operating on a single applicant record.
 * Per-applicant data is not schema-backed, so these gates are the ONLY
 * filter that runs against applicant state.
 */
export interface ApplicantGate {
	readonly name: string;
	readonly description: string;
	/**
	 * @param applicant — the untouched raw applicant record
	 * @returns the filtered applicant record (must not mutate input)
	 */
	apply(applicant: Record<string, unknown>): Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────────
// GATE REGISTRY — LOAN-LEVEL
// ────────────────────────────────────────────────────────────────────
//
// Intentionally empty at Phase 1.1. Placeholder for audit findings.
// If a hidden loan-answer key is discovered to be required by the rule
// engine (e.g. a derived flag read cross-page), its re-admit logic goes
// here with a documented business justification.
//
// DO NOT add gates without a linked audit item in SESSION-HANDOFF.md.

export const LOAN_ANSWERS_GATES: readonly LoanAnswersGate[] = Object.freeze([]);

// ────────────────────────────────────────────────────────────────────
// GATE REGISTRY — APPLICANT-LEVEL
// ────────────────────────────────────────────────────────────────────
//
// Seeded from existing inline filters in the payload builders. Each gate
// has a "source" comment pointing at the file+line where the same rule
// is currently enforced defensively inside the builder.

/**
 * Gate: `includeGuarantorObligations`
 *
 * Business rule (from `obligationPayload.ts` lines 38–48):
 *    When a user says `ObligationsRunning = 'No'` but
 *    `isGuarantorOnOtherLoan = 'Yes'`, we are in "guarantor-only mode".
 *    In this mode the obligations UI hides non-guarantor entries, but the
 *    raw store may still contain stale co-borrower rows from a previous
 *    session. Only `role === 'guarantor'` rows should reach the rule
 *    engine — any other row would inflate EMI / FOIR.
 *
 * Source: src/lib/utils/payloadBuilder/obligationPayload.ts §cleanObligationEntries
 */
const includeGuarantorObligations: ApplicantGate = {
	name: 'includeGuarantorObligations',
	description:
		'In guarantor-only mode (ObligationsRunning=No + isGuarantorOnOtherLoan=Yes), ' +
		'only role=guarantor obligation entries are admitted; co-borrower/primary rows are stripped.',
	apply(applicant) {
		const isGuarantorOnlyMode =
			applicant.ObligationsRunning === 'No' && applicant.isGuarantorOnOtherLoan === 'Yes';
		if (!isGuarantorOnlyMode) return applicant;

		const obligations = pickObligationsArray(applicant);
		if (!obligations) return applicant;

		const filtered = obligations.filter((entry) => {
			if (entry === null || typeof entry !== 'object') return false;
			return String((entry as Record<string, unknown>).role ?? '') === 'guarantor';
		});

		return writeObligationsArray(applicant, filtered);
	}
};

/**
 * Gate: `includeSelectedIncomeProfiles`
 *
 * Business rule (from `incomePayload.ts` lines 22–30):
 *    When the user has set `selectedIncomeProfiles`, only income entries
 *    whose `profileType` is in that list should reach the rule engine.
 *    Deselecting a profile type (e.g. removing "rental_income") must not
 *    leave its entries lying around to inflate gross income.
 *
 * Source: src/lib/utils/payloadBuilder/incomePayload.ts §extractIncomeEntries
 */
const includeSelectedIncomeProfiles: ApplicantGate = {
	name: 'includeSelectedIncomeProfiles',
	description:
		'Drops income entries whose profileType is absent from selectedIncomeProfiles. ' +
		'When selectedIncomeProfiles is empty/unset, all entries are retained (legacy-safe).',
	apply(applicant) {
		const entries = applicant.incomeEntries;
		if (!Array.isArray(entries) || entries.length === 0) return applicant;

		const selected = applicant.selectedIncomeProfiles;
		const hasFilter = Array.isArray(selected) && selected.length > 0;
		if (!hasFilter) return applicant;

		const filtered = entries.filter((entry) => {
			if (entry === null || typeof entry !== 'object') return false;
			const profileType = String((entry as Record<string, unknown>).profileType ?? '');
			return (selected as unknown[]).includes(profileType);
		});

		// Return a shallow copy with the filtered array; never mutate input.
		return { ...applicant, incomeEntries: filtered };
	}
};

export const APPLICANT_GATES: readonly ApplicantGate[] = Object.freeze([
	includeGuarantorObligations,
	includeSelectedIncomeProfiles
]);

// ────────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────────

/**
 * Produce the filtered view consumed by the submission pipeline.
 *
 * @param schema           Schema for the active loan type, or `null` if the
 *                         client can't load it yet. Layer A is a passthrough
 *                         when null. See Phase 1.6 follow-up for client
 *                         schema plumbing.
 * @param rawLoanAnswers   Raw `formState.loanData[loanName]` — untouched.
 * @param rawApplicants    Raw `formState.applicants` — untouched.
 * @returns                Filtered loanAnswers + filtered applicants array.
 *                         Inputs are never mutated.
 */
export function buildFilteredAnswers(
	schema: Schema | null,
	rawLoanAnswers: Record<string, unknown>,
	rawApplicants: Record<string, unknown>[]
): FilteredView {
	// ── Layer A: schema-driven floor ────────────────────────────────
	const layerA = schema ? buildCleanAnswers(schema, rawLoanAnswers) : { ...rawLoanAnswers };

	// ── Layer B (loan answers): audit-driven re-admits ──────────────
	let loanAnswers: Record<string, unknown> = layerA;
	for (const gate of LOAN_ANSWERS_GATES) {
		loanAnswers = gate.apply(loanAnswers, rawLoanAnswers);
	}

	// ── Layer B (applicants): filter each applicant independently ──
	const applicants = rawApplicants.map((applicant) => {
		let current: Record<string, unknown> = applicant;
		for (const gate of APPLICANT_GATES) {
			current = gate.apply(current);
		}
		return current;
	});

	return { loanAnswers, applicants };
}

/**
 * Diagnostic helper: returns the list of gates that actually changed their
 * input for a given (loanAnswers, applicants) pair. Useful for regression
 * tests and for the payload debugger.
 *
 * Not called in hot paths — safe to iterate.
 */
export function explainFilter(
	schema: Schema | null,
	rawLoanAnswers: Record<string, unknown>,
	rawApplicants: Record<string, unknown>[]
): {
	layerADropped: string[];
	loanGatesApplied: string[];
	applicantGatesApplied: { index: number; gate: string }[];
} {
	const layerA = schema ? buildCleanAnswers(schema, rawLoanAnswers) : { ...rawLoanAnswers };
	const layerADropped = Object.keys(rawLoanAnswers).filter((k) => !(k in layerA));

	const loanGatesApplied: string[] = [];
	let loanAnswers = layerA;
	for (const gate of LOAN_ANSWERS_GATES) {
		const next = gate.apply(loanAnswers, rawLoanAnswers);
		if (!shallowEqualRecord(next, loanAnswers)) loanGatesApplied.push(gate.name);
		loanAnswers = next;
	}

	const applicantGatesApplied: { index: number; gate: string }[] = [];
	rawApplicants.forEach((applicant, index) => {
		let current: Record<string, unknown> = applicant;
		for (const gate of APPLICANT_GATES) {
			const next = gate.apply(current);
			if (next !== current) applicantGatesApplied.push({ index, gate: gate.name });
			current = next;
		}
	});

	return { layerADropped, loanGatesApplied, applicantGatesApplied };
}

// ────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ────────────────────────────────────────────────────────────────────

/**
 * Read the canonical obligations array from an applicant record.
 * Prefers the unified `obligations` field; falls back to legacy split
 * arrays so guarantor-only filtering covers older persisted data too.
 * Returns `null` if the applicant has no obligations in any format.
 */
function pickObligationsArray(
	applicant: Record<string, unknown>
): unknown[] | null {
	if (Array.isArray(applicant.obligations)) return applicant.obligations;

	const loans = Array.isArray(applicant.tableLoanEntries) ? applicant.tableLoanEntries : [];
	const limits = Array.isArray(applicant.tableLimitEntries) ? applicant.tableLimitEntries : [];
	if (loans.length === 0 && limits.length === 0) return null;
	return [...loans, ...limits];
}

/**
 * Write a filtered obligations array back to an applicant record without
 * mutating the input. Preserves whichever shape the applicant originally
 * used (unified `obligations` vs legacy split arrays).
 */
function writeObligationsArray(
	applicant: Record<string, unknown>,
	filtered: unknown[]
): Record<string, unknown> {
	if (Array.isArray(applicant.obligations)) {
		return { ...applicant, obligations: filtered };
	}
	// Legacy split-array shape: collapse into the unified field. Downstream
	// builders already prefer `obligations` when present, so this normalises
	// storage without breaking legacy data.
	return { ...applicant, obligations: filtered };
}

/** Shallow-equal for diagnostic use only. Array/object values compared by ===. */
function shallowEqualRecord(
	a: Record<string, unknown>,
	b: Record<string, unknown>
): boolean {
	if (a === b) return true;
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const k of aKeys) if (a[k] !== b[k]) return false;
	return true;
}
