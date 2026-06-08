/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Contract: in-progress income-source draft survives step navigation
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BACKGROUND (docs/reviews/E2E-TEST-2026-05-23.md, Recurring issue-class #6):
 * a half-filled income entry (not yet "Added to Profile") was silently lost when
 * the user navigated to another wizard step, because it lived only in
 * IncomeSourceForm's local component state. This module buffers the draft per
 * applicant so the form can rehydrate it on return; these tests lock the
 * persistence/keying/clearing contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	incomeDraftKey,
	isDraftMeaningful,
	saveIncomeSourceDraft,
	loadIncomeSourceDraft,
	clearIncomeSourceDraft,
	__resetIncomeSourceDrafts,
	type IncomeSourceDraft
} from '$lib/utils/incomeSourceDraft';

function makeDraft(overrides: Partial<IncomeSourceDraft> = {}): IncomeSourceDraft {
	return {
		currentProfileType: '',
		entityName: '',
		specificsAnswers: {},
		incomeAnswers: {},
		evidenceAnswers: {
			itrFiled: false,
			hasDocumentaryEvidence: false,
			receivingBankName: '',
			vintageYears: undefined
		},
		companyLinkedSelection: false,
		selectedCompanyId: undefined,
		useOtherCompany: false,
		...overrides
	};
}

beforeEach(() => __resetIncomeSourceDrafts());

describe('incomeSourceDraft', () => {
	describe('incomeDraftKey', () => {
		it('scopes the key by filledBy and applicant id', () => {
			expect(incomeDraftKey('dsa', 'app-1')).toBe('dsa:app-1');
			expect(incomeDraftKey('applicant', 'app-1')).not.toBe(incomeDraftKey('dsa', 'app-1'));
			expect(incomeDraftKey('dsa', 'app-1')).not.toBe(incomeDraftKey('dsa', 'app-2'));
		});

		it('falls back to a stable token when id is missing', () => {
			expect(incomeDraftKey('dsa', undefined)).toBe('dsa:unknown');
			expect(incomeDraftKey('dsa', 0)).toBe('dsa:0');
		});
	});

	describe('isDraftMeaningful', () => {
		it('is false for an empty / default-only draft', () => {
			expect(isDraftMeaningful(makeDraft())).toBe(false);
		});
		it('is true once a profile type is chosen', () => {
			expect(isDraftMeaningful(makeDraft({ currentProfileType: 'salaried_regular' }))).toBe(true);
		});
		it('is true once an entity name is typed', () => {
			expect(isDraftMeaningful(makeDraft({ entityName: 'Acme Corp' }))).toBe(true);
		});
		it('ignores whitespace-only entity names', () => {
			expect(isDraftMeaningful(makeDraft({ entityName: '   ' }))).toBe(false);
		});
		it('is true once specifics or income answers exist', () => {
			expect(isDraftMeaningful(makeDraft({ specificsAnswers: { gstRegistered: true } }))).toBe(true);
			expect(isDraftMeaningful(makeDraft({ incomeAnswers: { grossSalary: 60000 } }))).toBe(true);
		});
		it('is NOT made meaningful by evidence/company defaults alone', () => {
			expect(isDraftMeaningful(makeDraft({ companyLinkedSelection: true }))).toBe(false);
		});
		// Pitfall #25 specialization (financial-table reset on Previous→back).
		// CustomIncomeTable writes to tableAnswers.financialTable via bind:answers.
		// A draft with FY values but no other answers must still be saved or the
		// user loses everything they typed in the table.
		it('is true when the financial table has any FY cell filled', () => {
			expect(
				isDraftMeaningful(
					makeDraft({
						tableAnswers: {
							financialTable: {
								netProfitArray: ['', '500000'],
								depreciationArray: ['', ''],
								turnOverArray: ['', '']
							}
						}
					})
				)
			).toBe(true);
		});
		it('is true when only currentFYTurnover is filled', () => {
			expect(
				isDraftMeaningful(
					makeDraft({
						tableAnswers: { financialTable: { currentFYTurnover: '150000' } }
					})
				)
			).toBe(true);
		});
		it('is false when tableAnswers exists but every FY cell is empty', () => {
			expect(
				isDraftMeaningful(
					makeDraft({
						tableAnswers: {
							financialTable: {
								netProfitArray: ['', '', '', ''],
								depreciationArray: ['', '', '', ''],
								turnOverArray: ['', '', '', '']
							}
						}
					})
				)
			).toBe(false);
		});
	});

	describe('save / load / clear', () => {
		it('round-trips a meaningful draft', () => {
			const key = incomeDraftKey('dsa', 'app-1');
			const draft = makeDraft({ currentProfileType: 'salaried_regular', entityName: 'Acme Corp' });
			saveIncomeSourceDraft(key, draft);
			expect(loadIncomeSourceDraft(key)).toEqual(draft);
		});

		it('does not store (and clears) a non-meaningful draft', () => {
			const key = incomeDraftKey('dsa', 'app-1');
			saveIncomeSourceDraft(key, makeDraft({ currentProfileType: 'salaried_regular' }));
			expect(loadIncomeSourceDraft(key)).toBeDefined();
			// Saving an empty draft over it (e.g. user cleared everything) removes it.
			saveIncomeSourceDraft(key, makeDraft());
			expect(loadIncomeSourceDraft(key)).toBeUndefined();
		});

		it('isolates drafts between applicants', () => {
			const keyA = incomeDraftKey('dsa', 'app-1');
			const keyB = incomeDraftKey('dsa', 'app-2');
			saveIncomeSourceDraft(keyA, makeDraft({ entityName: 'A Corp' }));
			expect(loadIncomeSourceDraft(keyB)).toBeUndefined();
			expect(loadIncomeSourceDraft(keyA)?.entityName).toBe('A Corp');
		});

		it('clears a draft on commit/cancel', () => {
			const key = incomeDraftKey('dsa', 'app-1');
			saveIncomeSourceDraft(key, makeDraft({ entityName: 'Acme Corp' }));
			clearIncomeSourceDraft(key);
			expect(loadIncomeSourceDraft(key)).toBeUndefined();
		});

		it('returns undefined for an unknown key', () => {
			expect(loadIncomeSourceDraft('dsa:never-saved')).toBeUndefined();
		});
		// Pitfall #25 specialization — the financial table must survive a
		// Previous→back round trip via the draft's tableAnswers bucket.
		it('round-trips financial table data via tableAnswers', () => {
			const key = incomeDraftKey('dsa', 'app-fin');
			const tableData = {
				financialTable: {
					netProfitArray: ['250000', '300000'],
					depreciationArray: ['10000', '12000'],
					turnOverArray: ['1500000', '1800000'],
					itrFiled: [true, true]
				}
			};
			saveIncomeSourceDraft(
				key,
				makeDraft({
					currentProfileType: 'business_proprietorship',
					tableAnswers: tableData
				})
			);
			expect(loadIncomeSourceDraft(key)?.tableAnswers).toEqual(tableData);
		});
	});
});
