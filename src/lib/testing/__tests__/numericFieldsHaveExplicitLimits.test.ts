/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: every numeric form question MUST declare an explicit minLimit.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * `isFieldAnswered(val, q)` in `src/lib/utils/formWizardEngine.ts` defaults
 * `minLimit` to 1 for numeric fields when the schema doesn't declare one.
 * That default is *correct* for positive-amount fields (loan, salary, area)
 * but *wrong* for count fields where 0 is a legitimate answer (EMIs paid
 * so far, dependents, late payments).
 *
 * Without explicit `minLimit`, a future schema author could accidentally
 * block users who legitimately type 0 — Next button stays disabled, no
 * error message explains why. We caught one live latent bug while
 * auditing this in CLAUDE.md Pitfall #14: `q3b_btEmisPaid` (BT EMIs paid)
 * relied on the implicit default of 1, which would block brand-new BT
 * applicants with 0 EMIs paid yet.
 *
 * THIS TEST
 * ─────────
 * Walks every page of every loan composer and asserts that every numeric
 * question (uiType === 'number' OR type === 'number' OR type === 'currency')
 * declares minLimit explicitly. Fails CI if a future schema addition forgets
 * to set it.
 *
 * Companion: CLAUDE.md §3 Pitfall #14, §4 grep recipe.
 */

import { describe, it, expect } from 'vitest';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if the question is treated as numeric by `isFieldAnswered`.
 * Mirrors the predicate at formWizardEngine.ts:425.
 */
function isNumericQuestion(q: unknown): q is { uiType?: string; type?: string } {
	if (!q || typeof q !== 'object') return false;
	const obj = q as { uiType?: unknown; type?: unknown };
	return obj.uiType === 'number' || obj.type === 'number' || obj.type === 'currency';
}

interface NumericIssue {
	loanType: string;
	pageId: string;
	questionId: string;
	bindsTo: string;
	missing: 'minLimit' | 'minLimit-and-maxLimit';
}

/**
 * Walks all pages of a composed schema and collects numeric questions
 * that are missing `minLimit`. Returns one entry per offending question.
 */
function findNumericQuestionsMissingMinLimit(
	loanType: string,
	schema: ReturnType<typeof composeHomeLoanSchema>
): NumericIssue[] {
	const issues: NumericIssue[] = [];

	for (const page of schema.pages ?? []) {
		const questions = (page as { questions?: unknown[] }).questions ?? [];
		for (const q of questions) {
			if (!isNumericQuestion(q)) continue;

			const obj = q as {
				id?: string;
				bindsTo_template?: string;
				minLimit?: unknown;
				maxLimit?: unknown;
			};
			const hasMinLimit = typeof obj.minLimit === 'number';
			const hasMaxLimit = typeof obj.maxLimit === 'number';

			if (!hasMinLimit) {
				issues.push({
					loanType,
					pageId: (page as { pageId?: string }).pageId ?? '<unknown-page>',
					questionId: obj.id ?? '<unknown-id>',
					bindsTo: obj.bindsTo_template ?? '<unknown-bindsTo>',
					missing: hasMaxLimit ? 'minLimit' : 'minLimit-and-maxLimit'
				});
			}
		}
	}

	return issues;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('numeric form fields — explicit minLimit contract', () => {
	const composers: Array<[string, () => ReturnType<typeof composeHomeLoanSchema>]> = [
		['Home Loan', composeHomeLoanSchema],
		['LAP', composeLapLoanSchema],
		['Plot Loan', composePlotLoanSchema],
		['Personal Loan', composePersonalLoanSchema],
		['Business Loan', composeBusinessLoanSchema],
		['Professional Loan', composeProfessionalLoanSchema]
	];

	for (const [loanType, compose] of composers) {
		it(`${loanType}: every numeric question declares explicit minLimit`, () => {
			const schema = compose();
			const issues = findNumericQuestionsMissingMinLimit(loanType, schema);

			if (issues.length > 0) {
				const summary = issues
					.map(
						(i) =>
							`  - ${i.pageId} > ${i.questionId} (bindsTo: ${i.bindsTo}) — missing ${i.missing}`
					)
					.join('\n');
				const message =
					`${loanType}: ${issues.length} numeric question(s) missing explicit minLimit:\n${summary}\n\n` +
					`Fix: add \`minLimit: <n>\` to each schema entry.\n` +
					`  - Use 0 if 0 is a legitimate answer (counts: EMIs paid, dependents).\n` +
					`  - Use 1 (or higher) for positive amounts (loan, area, salary, tenure).\n` +
					`See CLAUDE.md Pitfall #14 for the full contract.`;
				throw new Error(message);
			}

			expect(issues).toEqual([]);
		});
	}

	it('the predicate matches the live isFieldAnswered check', () => {
		// Mirrors the runtime predicate at formWizardEngine.ts:425+493.
		// If isFieldAnswered ever changes the predicate, this test must update.
		expect(isNumericQuestion({ uiType: 'number' })).toBe(true);
		expect(isNumericQuestion({ type: 'number' })).toBe(true);
		expect(isNumericQuestion({ type: 'currency' })).toBe(true);
		expect(isNumericQuestion({ type: 'tenure-select' })).toBe(false);
		expect(isNumericQuestion({ uiType: 'monthYear' })).toBe(false);
		expect(isNumericQuestion(null)).toBe(false);
		expect(isNumericQuestion(undefined)).toBe(false);
	});
});
