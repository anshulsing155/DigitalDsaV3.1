// =============================================================================
// ARCHIVED — do not import from this file.
// =============================================================================
// Originally at: src/lib/form/homeLoan/schema.ts
// Archived on:   2026-04-21 (session S77b-4B, RESOLUTION-PLAN §4B)
// Restore path:  git show 895470dd:src/lib/form/homeLoan/schema.ts
//                (introduction)  or any of:
//                git show cfd9eb61:src/lib/form/homeLoan/schema.ts (pre-archive)
//
// Why archived:
//   Every export in this file had ZERO live importers at archive time:
//     • preprocessHomeLoanSchema     — no callers; `how-can-we-help/+page.svelte`
//       calls `preprocessSchema` directly from firstPage/schema.ts
//     • resolveBindsTo               — imported only by homeLoan/validation.ts,
//       which was itself dead and archived in the same commit
//     • buildCombinedAnswers         — no callers; all 6 form pages call
//       buildCombinedAnswersSecured / buildCombinedAnswersUnsecured from
//       $lib/utils/combinedAnswersMemo.ts
//     • getLastThreeFinancialYears   — self-consumed (only used by
//       applyFinancialYearPlaceholders in this file, which has no callers)
//     • applyFinancialYearPlaceholders — no callers; server-side version lives
//       at $lib/server/formEngine/textResolver.ts
//     • resolveDynamicText re-export — redundant; real consumers import from
//       $lib/utils/resolveDynamicText directly (or firstPage/utils.ts)
//
// This file was created in 895470dd as the first of an intended 6 per-loan-type
// client namespaces (homeLoan/, plotLoan/, lapLoan/, personalLoan/, businessLoan/,
// professionalLoan/). Before the other 5 could be built, architecture pivoted
// to server-driven evaluation (e0534f0e + 3104d918) and this file stopped
// accreting callers. The `// ✅ Home-loan-specific resolver` comment on
// resolveBindsTo is aspirational — the body was always byte-equivalent to
// firstPage/schema.ts's resolveBindsTo.
//
// DO NOT restore without rebuilding the 5 missing namespaces AND deciding
// whether the server engine or per-type client modules own the truth.
// See docs/RESOLUTION-PLAN.md §4B (CLOSED) for the full rationale.
// =============================================================================

import { preprocessSchema } from '$lib/form/firstPage/schema';
import type { Schema, Answers, Question } from '$lib/types/formTypes';
import { sanitizeKey } from '$lib/utils/sanitizeKey';
export { resolveDynamicText } from '$lib/utils/resolveDynamicText';

export function preprocessHomeLoanSchema(rawSchema: any, selectedLoan: string): Schema {
	return preprocessSchema(rawSchema, selectedLoan);
}

// ✅ Home-loan-specific resolver
export function resolveBindsTo(question: Question, answers: Answers, selectedLoan: string): string {
	if (!question.bindsTo_template) return question.bindsTo || question.id;

	return question.bindsTo_template.replace(/\{([^}]+)\}/g, (_, key: string) => {
		if (key === 'q1_loanName') return sanitizeKey(selectedLoan);
		const val = answers[key];
		return typeof val === 'string' ? sanitizeKey(val) : (val?.toString('en-IN') ?? '');
	});
}

// ✅ CRITICAL FIX — DO NOT inject empty defaults
export function buildCombinedAnswers(
	schema: Schema,
	currentAnswers: Answers,
	selectedLoan: string
): Answers {
	const combined: Answers = {};

	for (const page of schema.pages) {
		for (const q of page.questions) {
			const key = resolveBindsTo(q, currentAnswers, selectedLoan);
			if (!key) continue;

			// ✅ ONLY copy real answers
			if (currentAnswers[key] !== undefined) {
				combined[key] = currentAnswers[key];

				// shorthand alias
				if (key.includes('_')) {
					combined[key.split('_').pop()!] = currentAnswers[key];
				}

				// contextKey mapping
				if (q.contextKey) {
					combined[q.contextKey] = currentAnswers[key];
				}
			}
		}
	}

	combined.loanName = selectedLoan;
	combined.q1_loanName = selectedLoan;

	return combined;
}

// FY helper (unchanged)
export function getLastThreeFinancialYears(date = new Date()) {
	let previousYear = '';
	let twoYearsAgo = '';
	let thisYear = '';
	let threeYearsAgo = '';
	let currentYear = date.getFullYear();
	const currentMonth = date.getMonth() + 1;
	let startYear = currentMonth >= 4 ? currentYear : currentYear - 1;

	const fyStart = startYear;
	const fyEnd = startYear + 1;
	thisYear = `FY${fyStart}-${fyEnd.toString().slice(-2)}`;
	previousYear = `FY${fyStart - 1}-${(fyEnd - 1).toString().slice(-2)}`;
	twoYearsAgo = `FY${fyStart - 2}-${(fyEnd - 2).toString().slice(-2)}`;
	threeYearsAgo = `FY${fyStart - 3}-${(fyEnd - 3).toString().slice(-2)}`;

	return {
		thisYear,
		previousYear,
		twoYearsAgo,
		threeYearsAgo
	};
}

// Apply FY replacement + option label replacements (unchanged)
export function applyFinancialYearPlaceholders(schema: Schema, currentFYStartYear: number) {
	const word = '{{currentFinancialYear}}';
	const { thisYear, previousYear, twoYearsAgo, threeYearsAgo } = getLastThreeFinancialYears();

	schema.pages = schema.pages.map((page) => {
		page.questions = page.questions.map((q) => {
			if (typeof q.question === 'string' && q.question.includes(word)) {
				q.question = q.question.replace(word, `${currentFYStartYear - 1}-${currentFYStartYear}`);
			}

			if (Array.isArray(q.options)) {
				q.options = q.options.map((option) => {
					if (typeof option.label === 'string') {
						option.label = option.label
							.replace(/{{thisYear}}/g, thisYear)
							.replace(/{{previousYear}}/g, previousYear)
							.replace(/{{twoYearsAgo}}/g, twoYearsAgo)
							.replace(/{{threeYearsAgo}}/g, threeYearsAgo);
					}
					return option;
				});
			}
			return q;
		});
		return page;
	});

	return schema;
}
