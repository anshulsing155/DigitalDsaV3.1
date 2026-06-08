// =============================================================================
// Canonical CLIENT-SIDE bindsTo / combined-answers resolver.
// =============================================================================
// This is THE live client copy. Used by the `how-can-we-help` loan-picker page
// and transitively by anything that imports `resolveBindsTo`,
// `buildCombinedAnswers`, or `resolveDynamicText` from `$lib/form/firstPage/*`.
//
// There are TWO other `resolveBindsTo` copies in the codebase and both exist
// for a reason — they are NOT duplication, do not "consolidate" them:
//
//   1. `$lib/server/formEngine/engine.ts` — server copy.
//      - Has an extra `locationConfig` pre-flatten branch (compound location
//        questions resolve to a prefix-based state key). The client never
//        sees `type: 'location'` questions; they are flattened server-side
//        before the payload is sent.
//      - Lives in server code to stay behind the `jsonLogic.add_operation`
//        singleton-override boundary documented in CLAUDE.md Pitfall #1
//        and RESOLUTION-PLAN §4A. Importing the server module into client
//        bundles would mutate client JSON-Logic semantics process-wide.
//
//   2. `$lib/components/ExistingLoanDetails.svelte` — inline 2-arg copy.
//      - Scoped to the existing-loan sub-form. Templates in that flow never
//        reference `q1_loanName`, so the 3rd `selectedLoan` arg is not needed.
//      - Inlined because the component is used in isolation (modals + form)
//        and the 2-arg signature keeps the call sites honest.
//
// Two historical copies (`homeLoan/schema.ts` and `homeLoan/validation.ts`)
// were both dead code at S77b-4B and have been archived under
// `$lib/form/_archive/`. See the archive README and RESOLUTION-PLAN §4B
// for the full rationale.
//
// DO NOT consolidate without first reading:
//   - docs/RESOLUTION-PLAN.md §4B (this file's closure entry)
//   - docs/RESOLUTION-PLAN.md §4A (the singleton-boundary reason the server
//     copy stays; also the `isQuestionVisible` split)
//   - CLAUDE.md "Critical Pitfalls" #1 (`jsonLogic.add_operation` semantics)
// =============================================================================

import { preprocessSchemaBindings } from '$lib/utils/schemaUtils';
import { sanitizeKey } from '$lib/utils/sanitizeKey';
import type { Question, Schema, Answers } from '$lib/types/formTypes';

export function preprocessSchema(schema: any, loan: string): Schema {
	return preprocessSchemaBindings(schema, loan) as unknown as Schema;
}

export function resolveBindsTo(question: Question, answers: Answers, selectedLoan: string): string {
	if (!question.bindsTo_template) return question.bindsTo || question.id;

	return question.bindsTo_template.replace(/\{([^}]+)\}/g, (_, key: string) => {
		if (key === 'q1_loanName') return sanitizeKey(selectedLoan);
		const val = answers[key];
		return typeof val === 'string' ? sanitizeKey(val) : (val?.toString('en-IN') ?? '');
	});
}

// =============================================================================
// `buildCombinedAnswers` — loan-picker variant (schema-walking + default injection).
// =============================================================================
// One of THREE buildCombinedAnswers shapes in the codebase. They are not three
// copies of the same function — they are three different algorithms solving
// three different problems. Do NOT consolidate without reading all three:
//
//   1. `$lib/utils/combinedAnswersMemo.ts` (canonical form-page variant)
//      - Flat merge. No schema walk. No default injection.
//      - Adds applicant meta (__applicantCount, __allIndividualsNRI, etc.)
//        and shorthand aliases for every answered key.
//      - Paired with `stableReference()` for Svelte-5 $derived memoization.
//      - Used by all 6 form pages.
//
//   2. `$lib/form/firstPage/schema.ts` — THIS FUNCTION.
//      - Walks `schema.pages` and INJECTS type-specific defaults for every
//        question (multiple-select→[], number→0, checkbox→false, else→'').
//      - No applicant meta (applicants don't exist yet on the loan-picker page).
//      - Sole consumer: `src/routes/(app)/form/how-can-we-help/+page.svelte`.
//
//   3. `$lib/server/formEngine/engine.ts` (private server method)
//      - Walks `this.schema.pages` but ONLY copies real answers (opposite of
//        this variant — no default injection).
//      - Adds flagKey resolution: selected radio/select options with a
//        `flagKey` object merge key-value pairs into combined answers
//        (with a contextKey-collision guard — see that file for details).
//      - Uses the server `resolveBindsTo` with the `locationConfig`
//        pre-flatten branch.
//
// Why THIS variant injects defaults (and the other two do not):
//   The loan-picker page is paired with the naive `isQuestionVisible`
//   evaluator from `$lib/form/firstPage/visibility.ts` (RESOLUTION-PLAN §4A —
//   the naive evaluator does not have dependency guards). For showWhen rules
//   like `{ "==": [{ "var": "q2_loanType" }, "BT"] }` to produce deterministic
//   booleans on a blank form, every referenced key must have a type-correct
//   default. Without injection, `undefined == 'BT'` gives `false` via the
//   non-overridden `==`, which works — but `{ "!": [{ "var": "x" }] }` on an
//   empty-string vs `undefined` diverges, and `multiple-select` showWhens that
//   use `{ "in": [...] }` throw if the var is undefined. Injecting `[]`, `0`,
//   `false`, `''` makes the evaluator total over the schema.
//
// Why combinedAnswersMemo (form pages) DOESN'T need defaults:
//   The form pages use the server's fail-HIDE `isQuestionVisible` (with the
//   `!=` / `!==` override from CLAUDE.md Pitfall #1). That evaluator already
//   treats unanswered deps as "hide" — no type-specific defaults needed.
//
// Why the server variant DOESN'T inject defaults:
//   Server-side the combined answers feed form evaluation AND payload
//   enrichment. Injecting defaults would pollute the submission payload with
//   zero-ish values the user never touched. The server evaluator handles
//   unanswered keys via the `!=` / `!==` override; defaults would be wrong.
//
// If the loan-picker migrates to server-driven evaluation (the same migration
// that subsumed the per-loan-type client namespaces in §4B), this variant can
// be archived — the default-injection is load-bearing only because the naive
// client evaluator from §4A is. See `docs/RESOLUTION-PLAN.md` §4C.
// =============================================================================
export function buildCombinedAnswers(
	schema: Schema,
	currentAnswers: Answers,
	selectedLoan: string
): Answers {
	const combined: Answers = { ...currentAnswers };

	for (const page of schema.pages) {
		for (const q of page.questions) {
			const key = resolveBindsTo(q, currentAnswers, selectedLoan);
			if (!key) continue;

			combined[key] =
				q.type === 'multiple-select'
					? (currentAnswers[key] ?? [])
					: q.type === 'number'
						? (currentAnswers[key] ?? 0)
						: q.type === 'checkbox'
							? (currentAnswers[key] ?? false)
							: (currentAnswers[key] ?? '');

			if (key.includes('_')) {
				combined[key.split('_').pop()!] = combined[key];
			}
			if (q.contextKey) {
				combined[q.contextKey] = combined[key];
			}
		}
	}

	combined.loanName = selectedLoan;
	combined.q1_loanName = selectedLoan;

	return combined;
}
