/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: questions that ask for a month+year MUST declare uiType:'monthYear'
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * The 6 loan form pages share a renderer that routes questions to the right
 * input component. For month+year input (e.g. loan disbursement date, planned
 * property-registration month), the renderer wires a real `DatePickerYearAndMonth`
 * modal — but ONLY when the schema declares `uiType: 'monthYear'`.
 *
 * Without that field, the renderer falls through to a plain `TextField`, and
 * users see a calendar-icon placeholder asking them to hand-type "YYYY-MM".
 * That's how `q7a_registryPlannedDate` shipped originally (CLAUDE.md Pitfall #19):
 * a calendar-decorated text input with no picker behind it. Looks like it should
 * open a picker; tapping does nothing.
 *
 * THIS TEST
 * ─────────
 * Walks every page of every loan composer and asserts: if a question's
 * placeholder mentions a YYYY-MM-style format, OR its bindsTo key matches a
 * known month-question convention, it MUST have `uiType: 'monthYear'` so the
 * renderer wires a picker. Catches a future schema author copy-pasting a
 * plain `text` question for a date prompt and forgetting the uiType.
 *
 * Companion: CLAUDE.md §3 Pitfall #19, §4 grep recipe.
 */

import { describe, it, expect } from 'vitest';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';

interface PickerIssue {
	loanType: string;
	pageId: string;
	questionId: string;
	bindsTo: string;
	reason: string;
}

/** Triggers that suggest a question is asking for a month+year. */
function looksLikeMonthYearQuestion(q: {
	id?: unknown;
	bindsTo_template?: unknown;
	uiMeta?: { placeholder?: unknown } | unknown;
	question?: unknown;
}): boolean {
	const uiMeta = (q.uiMeta as { placeholder?: unknown } | undefined) ?? {};
	const placeholder = typeof uiMeta.placeholder === 'string' ? uiMeta.placeholder : '';
	const text = typeof q.question === 'string' ? q.question.toLowerCase() : '';
	const bindsTo =
		typeof q.bindsTo_template === 'string'
			? q.bindsTo_template
			: typeof q.id === 'string'
				? q.id
				: '';
	if (/YYYY[\s-]?MM\b/i.test(placeholder)) return true;
	if (/(month\s*and\s*year|month\s*\/\s*year|select.*month)/i.test(placeholder)) return true;
	// bindsTo hints — covers known month-questions in the schema
	if (/(DisbursementDate|PlannedDate|registryPlannedDate|loanDisbursementDate)$/i.test(bindsTo)) {
		return true;
	}
	// Question-text hints — "planned ... month", "disbursement month"
	if (/\b(planned|disbursement).*month/i.test(text)) return true;
	return false;
}

function collectPickerIssues(schema: { pages: Array<{ id?: string; questions?: unknown[] }> }, loanType: string): PickerIssue[] {
	const issues: PickerIssue[] = [];
	for (const page of schema.pages) {
		const questions = (page.questions ?? []) as Array<Record<string, unknown>>;
		for (const q of questions) {
			if (!looksLikeMonthYearQuestion(q as never)) continue;
			const uiType = q.uiType as string | undefined;
			if (uiType !== 'monthYear') {
				issues.push({
					loanType,
					pageId: (page.id as string) ?? '?',
					questionId: (q.id as string) ?? '?',
					bindsTo: (q.bindsTo_template as string) ?? '?',
					reason: `month-year question must declare uiType:'monthYear' (got uiType=${uiType ?? '<unset>'})`
				});
			}
		}
	}
	return issues;
}

describe("month+year questions declare uiType:'monthYear'", () => {
	it('Home Loan: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composeHomeLoanSchema() as never, 'Home Loan');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});

	it('LAP: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composeLapLoanSchema() as never, 'LAP');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});

	it('Plot Loan: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composePlotLoanSchema() as never, 'Plot Loan');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});

	it('Personal Loan: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composePersonalLoanSchema() as never, 'Personal Loan');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});

	it('Business Loan: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composeBusinessLoanSchema() as never, 'Business Loan');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});

	it('Professional Loan: every month-year question routes through DatePickerYearAndMonth', () => {
		const issues = collectPickerIssues(composeProfessionalLoanSchema() as never, 'Professional Loan');
		expect(issues, JSON.stringify(issues, null, 2)).toEqual([]);
	});
});
