/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every loan +page.svelte that composes a uiType:'monthYear' question
 * MUST wire the matching render-dispatch branch
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * `monthPickerWiring.test.ts` already locks the SCHEMA side — month-and-year
 * questions declare `uiType: 'monthYear'`. But that's only half of CLAUDE.md
 * Pitfall #19: each consuming +page.svelte must ALSO route those questions to
 * `<DatePickerYearAndMonth>`. Commit `3595bd11` (2026-05-28) shipped the
 * picker for Plot Loan and LAP after a user reported the disbursement-date
 * field rendering as a calendar-icon-decorated text input with no picker —
 * the schema was correct, the render dispatch was missing in those two files.
 *
 * That render-dispatch gap was invisible to CI: tests pass, type-check is
 * green, the schema-side lock is happy. The only signal was the user E2E.
 *
 * THIS TEST
 * ─────────
 * For every loan composer, walks every question and finds the loans that
 * actually USE `uiType: 'monthYear'`. For each such loan, reads the
 * corresponding +page.svelte and asserts:
 *
 *   1. The file imports `DatePickerYearAndMonth`
 *   2. The file contains the dispatch branch matching
 *      `question.uiType === 'monthYear'` (the if/else-if chain on `question.type`)
 *   3. The dispatch branch instantiates `<DatePickerYearAndMonth ...`
 *
 * Loans whose schema currently composes NO monthYear question are skipped
 * (Personal/Business/Professional today) — adding a monthYear question to
 * their schema later will cause the discovery step to surface them, and the
 * three assertions will then enforce the render-dispatch wiring.
 *
 * Companion: CLAUDE.md §3 Pitfall #19, §4 grep recipe, monthPickerWiring.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

interface LoanTarget {
	name: string;
	compose: () => unknown;
	pagePath: string;
}

// Path to each loan's +page.svelte (relative to repo root). Routes use the
// (app) SvelteKit group for unsecured loans, hence the nested path.
const LOAN_TARGETS: LoanTarget[] = [
	{
		name: 'Home Loan',
		compose: composeHomeLoanSchema,
		pagePath: 'src/routes/(app)/form/home-loan/+page.svelte'
	},
	{
		name: 'LAP',
		compose: composeLapLoanSchema,
		pagePath: 'src/routes/(app)/form/lap/+page.svelte'
	},
	{
		name: 'Plot Loan',
		compose: composePlotLoanSchema,
		pagePath: 'src/routes/(app)/form/plot-loan/+page.svelte'
	},
	{
		name: 'Personal Loan',
		compose: composePersonalLoanSchema,
		pagePath: 'src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte'
	},
	{
		name: 'Business Loan',
		compose: composeBusinessLoanSchema,
		pagePath: 'src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte'
	},
	{
		name: 'Professional Loan',
		compose: composeProfessionalLoanSchema,
		pagePath: 'src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte'
	}
];

/** Does this schema compose at least one question with uiType: 'monthYear'? */
function schemaUsesMonthYear(schema: unknown): boolean {
	const pages = (schema as { pages?: Array<{ questions?: unknown[] }> }).pages ?? [];
	for (const page of pages) {
		for (const q of page.questions ?? []) {
			if ((q as { uiType?: string }).uiType === 'monthYear') return true;
		}
	}
	return false;
}

/** Lazy-load + cache the file source per test. Resolved against the repo root. */
function readPage(pagePath: string): string {
	// vitest runs from the project root; resolve() against cwd gives the right path.
	return readFileSync(resolve(pagePath), 'utf8');
}

describe('uiType:monthYear render-dispatch wiring in loan +page.svelte', () => {
	for (const target of LOAN_TARGETS) {
		it(`${target.name}: dispatch branch + import present when schema composes any monthYear question`, () => {
			const schema = target.compose();
			const usesMonthYear = schemaUsesMonthYear(schema);

			if (!usesMonthYear) {
				// Schema currently has no monthYear question for this loan — nothing
				// to wire. If someone later adds one, this branch flips and the
				// assertions below kick in to enforce the dispatch.
				expect(usesMonthYear).toBe(false);
				return;
			}

			const src = readPage(target.pagePath);

			// 1. Component import — required because the dispatch instantiates it.
			expect(
				/import\s+DatePickerYearAndMonth\s+from\s+['"]\$lib\/components\/DatePickerYearAndMonth\.svelte['"]/.test(
					src
				),
				`${target.name}: missing 'import DatePickerYearAndMonth ...' — schema uses uiType:'monthYear' but page won't render it (Pitfall #19)`
			).toBe(true);

			// 2. Dispatch branch — Svelte's if/else-if chain on question.type with
			//    the uiType discriminator. Allows minor whitespace + quoting variation.
			//    Matches the pattern used in home-loan/lap/plot-loan today:
			//      {:else if question.type === 'text' && question.uiType === 'monthYear'}
			const dispatchRegex =
				/\{:else if\s+question\.type\s*===\s*['"]text['"]\s*&&\s*question\.uiType\s*===\s*['"]monthYear['"]\s*\}/;
			expect(
				dispatchRegex.test(src),
				`${target.name}: missing dispatch branch \`{:else if question.type === 'text' && question.uiType === 'monthYear'}\` — composed monthYear questions will fall through to the generic text branch (Pitfall #19, last bit by Plot Loan + LAP in 3595bd11)`
			).toBe(true);

			// 3. The dispatch branch actually instantiates the picker. A future
			//    "added the branch but forgot the component" regression is exactly
			//    the kind of half-fix this test exists to catch.
			expect(
				/<DatePickerYearAndMonth\b/.test(src),
				`${target.name}: dispatch branch present but <DatePickerYearAndMonth> not instantiated anywhere in the file`
			).toBe(true);
		});
	}
});
