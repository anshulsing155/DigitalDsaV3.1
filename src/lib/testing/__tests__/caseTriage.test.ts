/**
 * Case triage logic — Audit B.5.
 */

import { describe, it, expect } from 'vitest';
import { computeCaseTriage } from '$lib/utils/caseTriage';

const base = { stage: 'intake', lendersCount: 0, docsPercent: 0, openQueryCount: 0, daysInStage: 0 };

describe('computeCaseTriage', () => {
	it('open queries → high priority, top rank', () => {
		const t = computeCaseTriage({ ...base, stage: 'processing', lendersCount: 2, openQueryCount: 2 });
		expect(t.priority).toBe('high');
		expect(t.rank).toBe(0);
		expect(t.nextAction).toBe('2 queries to resolve');
	});

	it('singular query wording', () => {
		expect(computeCaseTriage({ ...base, openQueryCount: 1 }).nextAction).toBe('1 query to resolve');
	});

	it('stuck in stage → high priority follow-up', () => {
		const t = computeCaseTriage({ ...base, stage: 'submitted', lendersCount: 1, docsPercent: 100, daysInStage: 15 });
		expect(t.priority).toBe('high');
		expect(t.nextAction).toBe('Stuck 15d — follow up');
	});

	it('early stage, no lenders → add lenders', () => {
		const t = computeCaseTriage({ ...base, stage: 'intake', lendersCount: 0, daysInStage: 1 });
		expect(t.priority).toBe('medium');
		expect(t.nextAction).toBe('Add lenders / build file');
	});

	it('lenders chosen, docs incomplete → complete & submit', () => {
		const t = computeCaseTriage({ ...base, stage: 'file_building', lendersCount: 2, docsPercent: 60, daysInStage: 2 });
		expect(t.priority).toBe('medium');
		expect(t.nextAction).toBe('Docs 60% — complete & submit');
	});

	it('file ready but not submitted → submit file', () => {
		const t = computeCaseTriage({ ...base, stage: 'file_building', lendersCount: 2, docsPercent: 100, daysInStage: 1 });
		expect(t.nextAction).toBe('Submit file');
	});

	it('submitted, docs done, not stuck → awaiting lender, low', () => {
		const t = computeCaseTriage({ ...base, stage: 'submitted', lendersCount: 2, docsPercent: 100, daysInStage: 3 });
		expect(t.priority).toBe('low');
		expect(t.nextAction).toBe('Awaiting lender');
	});

	it('terminal stage → none, sinks to bottom', () => {
		const t = computeCaseTriage({ ...base, stage: 'disbursed' });
		expect(t.priority).toBe('none');
		expect(t.rank).toBe(100);
		expect(t.nextAction).toBe('Disbursed');
	});

	it('rank orders queries < stuck < pending', () => {
		const q = computeCaseTriage({ ...base, openQueryCount: 1 }).rank;
		const stuck = computeCaseTriage({ ...base, stage: 'query', daysInStage: 10 }).rank;
		const pending = computeCaseTriage({ ...base, stage: 'intake' }).rank;
		expect(q).toBeLessThan(stuck);
		expect(stuck).toBeLessThan(pending);
	});
});
