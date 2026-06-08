/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: buildErrorSummary's "Missing" list matches the gate (isNextEnabled)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND
 * ──────────
 * 2026-05-23 E2E test (docs/reviews/E2E-TEST-2026-05-23.md, Recurring issue-class
 * #1 / CLAUDE.md Pitfall #26): a disabled Next/Submit/Show-Offers sometimes showed
 * "Missing: none" (or nothing) while the gate stayed blocked. Root cause: the gate
 * `isNextEnabled` evaluates required questions with `isQuestionAnswered` (which
 * handles compound `type:'location'` state+city and numeric `minLimit`), but
 * `buildErrorSummary` used a weaker plain `value === ''/null/undefined` check, so
 * the human-readable "Missing" list could disagree with the disabled state:
 *   • FALSE NEGATIVE — a numeric field below minLimit blocks the gate but wasn't listed.
 *   • FALSE POSITIVE — a location question (writes sub-keys, never bindsTo) was always
 *     "missing" even when answered.
 *
 * THIS TEST
 * ─────────
 * Locks buildErrorSummary to the SAME isQuestionAnswered predicate as the gate.
 * If the two ever drift again, "Missing" will lie about why the action is blocked.
 *
 * Companion: CLAUDE.md §3 Pitfall #26; FormNavigationBar surfaces this list.
 */

import { describe, it, expect } from 'vitest';
import { buildErrorSummary } from '$lib/utils/formWizardEngine';
import type { ClientQuestion, PageResponse } from '$lib/types/formEngine';

// Minimal question fixture — only the fields buildErrorSummary / isQuestionAnswered read.
function q(overrides: Partial<ClientQuestion>): ClientQuestion {
	return {
		id: 'q_test',
		bindsTo: 'testKey',
		question: 'Test question?',
		required: true,
		...overrides
	} as unknown as ClientQuestion;
}

describe('buildErrorSummary', () => {
	it('lists a required radio that is unanswered', () => {
		const questions = [q({ id: 'q_reg', bindsTo: 'registrationTiming', question: 'When is registration planned?' })];
		const summary = buildErrorSummary(null, questions, {});
		expect(summary).toEqual(['When is registration planned?']);
	});

	it('does NOT list a required radio once answered', () => {
		const questions = [q({ bindsTo: 'registrationTiming', question: 'When is registration planned?' })];
		const summary = buildErrorSummary(null, questions, { registrationTiming: 'within_1_month' });
		expect(summary).toEqual([]);
	});

	it('does NOT list a required location question once state+city are set (false-positive regression)', () => {
		// Location questions write to sub-keys (state/city/...), never to bindsTo —
		// the old plain currentAnswers[bindsTo] check listed them as missing forever.
		const questions = [
			q({
				id: 'q_loc',
				bindsTo: 'businessLocation',
				question: 'Where is the business located?',
				type: 'location',
				locationBindsTo: {
					state: 'businessStateName',
					city: 'businessCityName',
					area: 'businessArea',
					pincode: 'businessPincode'
				}
			})
		];
		const answered = { businessStateName: 'Maharashtra', businessCityName: 'Pune' };
		expect(buildErrorSummary(null, questions, answered)).toEqual([]);
		// …but still listed when city is missing (matches the gate).
		expect(buildErrorSummary(null, questions, { businessStateName: 'Maharashtra' })).toEqual([
			'Where is the business located?'
		]);
	});

	it('lists a numeric question whose value is below minLimit (false-negative regression)', () => {
		// A loan amount of 0 passes the plain empty-check but fails the gate's minLimit.
		const questions = [
			q({ id: 'q_amt', bindsTo: 'loanAmount', question: 'Loan amount?', type: 'number', minLimit: 1 })
		];
		expect(buildErrorSummary(null, questions, { loanAmount: 0 })).toEqual(['Loan amount?']);
		expect(buildErrorSummary(null, questions, { loanAmount: 500000 })).toEqual([]);
	});

	it('ignores non-required questions even when empty', () => {
		const questions = [q({ required: false, question: 'Optional note?' })];
		expect(buildErrorSummary(null, questions, {})).toEqual([]);
	});

	it('strips HTML tags from question labels', () => {
		const questions = [q({ question: 'Income <b>amount</b>?' })];
		expect(buildErrorSummary(null, questions, {})).toEqual(['Income amount?']);
	});

	it('caps the list at 3 labels', () => {
		const questions = [
			q({ id: 'a', bindsTo: 'a', question: 'A?' }),
			q({ id: 'b', bindsTo: 'b', question: 'B?' }),
			q({ id: 'c', bindsTo: 'c', question: 'C?' }),
			q({ id: 'd', bindsTo: 'd', question: 'D?' })
		];
		expect(buildErrorSummary(null, questions, {}).length).toBe(3);
	});

	it('prioritizes server validation errors over the unanswered-required check', () => {
		const serverPage = {
			questions: [{ id: 'q_pan', question: 'PAN number?' }],
			validationErrors: [{ questionId: 'q_pan', message: 'Invalid PAN format' }]
		} as unknown as PageResponse;
		// Even though a separate visible question is unanswered, server errors win.
		const visible = [q({ id: 'q_other', bindsTo: 'other', question: 'Other?' })];
		expect(buildErrorSummary(serverPage, visible, {})).toEqual(['PAN number?']);
	});
});
