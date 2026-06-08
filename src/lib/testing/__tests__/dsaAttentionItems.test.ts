/**
 * C.8 — DSA "Needs Attention" dedup tests.
 *
 * Pre-fix repro: a single case with 5 lender_applications, each with an
 * open query, produced 5 identical-looking rows ("Stuck 86 days") on the
 * DSA home. The attention computation emitted one item per
 * (lender_application × query × case) and the keyed-each fell back to a
 * concatenation that didn't disambiguate them.
 *
 * Post-fix: one `open_query` item per case (worst-pending days wins;
 * description summarises N queries from M lenders); one
 * `expiring_document` per case (most-urgent doc wins; description names
 * the count when >1); one `stuck_stage` per case (unchanged).
 */

import { describe, it, expect } from 'vitest';
import type { Case } from '$lib/types/case';
import { computeAttentionItems } from '$lib/utils/dsaAttentionItems';

// Deterministic "now" so days-pending calculations don't drift with the
// test-runner clock.
const NOW = new Date('2026-06-01T12:00:00.000Z');

function mkCase(overrides: Partial<Case> = {}): Case {
	// Default created_at + stage_history is set to "very recent" so a test
	// targeting a specific item type doesn't accidentally also trigger
	// stuck_stage. Tests that want stuck_stage emit it explicitly.
	const recentTransition = new Date(NOW.getTime() - 2 * 86400000).toISOString();
	return {
		case_id: 'C-1',
		label: 'Home Loan — case',
		is_sample: false,
		stage: 'processing',
		created_at: recentTransition as unknown as Date,
		stage_history: [{ stage: 'processing', timestamp: recentTransition }] as unknown as Case['stage_history'],
		lender_applications: [],
		...overrides
	} as unknown as Case;
}

function withOpenQueries(
	caseId: string,
	lenders: Array<{ name: string; daysOpen: number }>
): Case {
	return mkCase({
		case_id: caseId,
		lender_applications: lenders.map((l) => ({
			lender_name: l.name,
			lender_application_id: `${caseId}-${l.name}`,
			queries: [
				{
					status: 'open' as const,
					raised_at: new Date(
						NOW.getTime() - l.daysOpen * 24 * 60 * 60 * 1000
					).toISOString() as unknown as Date
				}
			],
			document_checklist: []
		})) as unknown as Case['lender_applications']
	});
}

describe('computeAttentionItems — open_query dedup at case level', () => {
	it('5 lenders with open queries on one case = 1 row (was 5 pre-fix)', () => {
		const cases: Case[] = [
			withOpenQueries('C-AAA', [
				{ name: 'SBI', daysOpen: 12 },
				{ name: 'HDFC', daysOpen: 8 },
				{ name: 'ICICI', daysOpen: 6 },
				{ name: 'BoB', daysOpen: 6 },
				{ name: 'PNB', daysOpen: 14 }
			])
		];
		const items = computeAttentionItems(cases, { now: NOW });
		const openQueries = items.filter((i) => i.type === 'open_query');
		expect(openQueries).toHaveLength(1);
		expect(openQueries[0].days).toBe(14); // worst-pending wins
		expect(openQueries[0].severity).toBe('critical'); // 14 >= 10
		expect(openQueries[0].description).toMatch(/5 open queries from 5 lenders/);
		expect(openQueries[0].description).toMatch(/14 days pending/);
	});

	it('single lender with multiple open queries summarises with that lender name', () => {
		const cases: Case[] = [
			mkCase({
				case_id: 'C-BBB',
				lender_applications: [
					{
						lender_name: 'HDFC',
						queries: [
							{ status: 'open', raised_at: new Date(NOW.getTime() - 6 * 86400000).toISOString() },
							{ status: 'open', raised_at: new Date(NOW.getTime() - 9 * 86400000).toISOString() }
						],
						document_checklist: []
					}
				] as unknown as Case['lender_applications']
			})
		];
		const items = computeAttentionItems(cases, { now: NOW });
		const oq = items.filter((i) => i.type === 'open_query');
		expect(oq).toHaveLength(1);
		expect(oq[0].description).toMatch(/2 open queries from HDFC/);
		expect(oq[0].days).toBe(9);
	});

	it('single query collapses to "Open query from X — Nd pending" format', () => {
		const cases: Case[] = [withOpenQueries('C-CCC', [{ name: 'Axis', daysOpen: 7 }])];
		const items = computeAttentionItems(cases, { now: NOW });
		const oq = items.filter((i) => i.type === 'open_query');
		expect(oq).toHaveLength(1);
		expect(oq[0].description).toBe('Open query from Axis — 7 days pending');
	});

	it('queries under the 5-day warning threshold are ignored', () => {
		const cases: Case[] = [
			withOpenQueries('C-DDD', [
				{ name: 'SBI', daysOpen: 2 },
				{ name: 'HDFC', daysOpen: 3 }
			])
		];
		const items = computeAttentionItems(cases, { now: NOW });
		expect(items.filter((i) => i.type === 'open_query')).toHaveLength(0);
	});

	it('does not emit items for terminal-stage or is_sample cases', () => {
		const cases: Case[] = [
			withOpenQueries('C-EEE', [{ name: 'SBI', daysOpen: 12 }]),
			{ ...withOpenQueries('C-FFF', [{ name: 'HDFC', daysOpen: 12 }]), stage: 'closed' } as Case,
			{ ...withOpenQueries('C-GGG', [{ name: 'ICICI', daysOpen: 12 }]), is_sample: true } as Case
		];
		const items = computeAttentionItems(cases, { now: NOW });
		expect(items.filter((i) => i.type === 'open_query')).toHaveLength(1);
		expect(items[0].case_id).toBe('C-EEE');
	});
});

describe('computeAttentionItems — expiring_document dedup at case level', () => {
	function withExpiringDocs(
		caseId: string,
		docs: Array<{ doc_name: string; daysUntilExpiry: number }>
	): Case {
		return mkCase({
			case_id: caseId,
			lender_applications: [
				{
					lender_name: 'HDFC',
					queries: [],
					document_checklist: docs.map((d) => ({
						doc_name: d.doc_name,
						validity: {
							valid_until: new Date(
								NOW.getTime() + d.daysUntilExpiry * 86400000
							).toISOString()
						}
					}))
				}
			] as unknown as Case['lender_applications']
		});
	}

	it('multiple expiring docs on a case = 1 row with (+N more) summary', () => {
		const cases: Case[] = [
			withExpiringDocs('C-DOC1', [
				{ doc_name: 'PAN', daysUntilExpiry: 5 },
				{ doc_name: 'Aadhaar', daysUntilExpiry: 2 },
				{ doc_name: 'Salary slip', daysUntilExpiry: 6 }
			])
		];
		const items = computeAttentionItems(cases, { now: NOW });
		const docs = items.filter((i) => i.type === 'expiring_document');
		expect(docs).toHaveLength(1);
		// Most-urgent (Aadhaar, 2 days) wins the name + days
		expect(docs[0].days).toBe(2);
		expect(docs[0].severity).toBe('critical');
		expect(docs[0].description).toMatch(/^Aadhaar \(\+2 more\) expires in 2 days/);
	});

	it('single expiring doc shows the simple "X expires in Nd" format', () => {
		const cases: Case[] = [
			withExpiringDocs('C-DOC2', [{ doc_name: 'PAN', daysUntilExpiry: 5 }])
		];
		const items = computeAttentionItems(cases, { now: NOW });
		const docs = items.filter((i) => i.type === 'expiring_document');
		expect(docs).toHaveLength(1);
		expect(docs[0].description).toBe('PAN expires in 5 days');
	});
});

describe('computeAttentionItems — sort + cap', () => {
	it('critical floats above warning regardless of days', () => {
		const cases: Case[] = [
			withOpenQueries('C-W', [{ name: 'X', daysOpen: 8 }]), // warning
			withOpenQueries('C-C', [{ name: 'Y', daysOpen: 11 }]) // critical
		];
		const items = computeAttentionItems(cases, { now: NOW });
		expect(items[0].case_id).toBe('C-C');
		expect(items[0].severity).toBe('critical');
	});

	it('caps the result list at maxItems', () => {
		const cases: Case[] = Array.from({ length: 12 }, (_, i) =>
			withOpenQueries(`C-${i}`, [{ name: `L${i}`, daysOpen: 6 + i }])
		);
		const items = computeAttentionItems(cases, { now: NOW, maxItems: 3 });
		expect(items).toHaveLength(3);
	});
});
