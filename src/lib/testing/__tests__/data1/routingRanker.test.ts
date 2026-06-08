/**
 * DATA-1 — rankCandidates unit tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 (composite scoring).
 *
 * The ranker is pure — these tests run on in-memory vault entries and
 * exercise: composite scoring, top-K truncation, top-lender selection,
 * match_strength stamping, distinct-DSA grouping.
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { rankCandidates } from '$lib/server/data1/routingRanker';
import type { LeadAttributionVaultEntry } from '$lib/server/data1/types';

function makeEntry(overrides: Partial<LeadAttributionVaultEntry> = {}): LeadAttributionVaultEntry {
	return {
		_id: new ObjectId(),
		source_case_id: `HL-2026-${Math.random().toString().slice(2, 8)}`,
		source_dsa_id: new ObjectId(),
		closed_quarter: '2026-Q1',
		created_at: new Date('2026-03-14T00:00:00Z'),
		loan_type: 'Home Loan',
		lender_selected: 'HDFC',
		property_locality_bucket: 'Hiranandani Gardens Powai',
		property_pincode: '400076',
		property_price_bucket: 18_000_000,
		loan_amount_bucket: 15_000_000,
		consent_ref: 'consent-xyz',
		...overrides
	};
}

describe('rankCandidates', () => {
	it('returns empty array on empty input', () => {
		expect(rankCandidates([], 'pincode', '2026-Q3')).toEqual([]);
	});

	it('stamps match_strength on every returned candidate', () => {
		const dsa = new ObjectId();
		const result = rankCandidates(
			[makeEntry({ source_dsa_id: dsa })],
			'locality',
			'2026-Q3'
		);
		expect(result).toHaveLength(1);
		expect(result[0].match_strength).toBe('locality');
	});

	it('groups multiple entries by source_dsa_id', () => {
		const dsaA = new ObjectId();
		const dsaB = new ObjectId();
		const entries = [
			makeEntry({ source_dsa_id: dsaA }),
			makeEntry({ source_dsa_id: dsaA }),
			makeEntry({ source_dsa_id: dsaB })
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result).toHaveLength(2);
		const aResult = result.find((r) => r.dsa_id.equals(dsaA))!;
		expect(aResult.case_count_in_area).toBe(2);
		const bResult = result.find((r) => r.dsa_id.equals(dsaB))!;
		expect(bResult.case_count_in_area).toBe(1);
	});

	it('caps output at 5 candidates even when more DSAs match', () => {
		const entries = Array.from({ length: 8 }, () =>
			makeEntry({ source_dsa_id: new ObjectId() })
		);
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result).toHaveLength(5);
	});

	it('ranks recent + high-count DSA above old + low-count DSA', () => {
		const recentDsa = new ObjectId();
		const oldDsa = new ObjectId();
		const entries = [
			// recentDsa: 1 case in current quarter
			makeEntry({ source_dsa_id: recentDsa, closed_quarter: '2026-Q3' }),
			// oldDsa: 1 case from 7 quarters ago (floor recency = 0.1)
			makeEntry({ source_dsa_id: oldDsa, closed_quarter: '2024-Q4' })
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result[0].dsa_id).toEqual(recentDsa);
		expect(result[1].dsa_id).toEqual(oldDsa);
	});

	it('uses MOST RECENT quarter per group (not average) for recency score', () => {
		const dsa = new ObjectId();
		const entries = [
			makeEntry({ source_dsa_id: dsa, closed_quarter: '2024-Q1' }),
			makeEntry({ source_dsa_id: dsa, closed_quarter: '2026-Q3' }) // most recent
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result[0].most_recent_quarter).toBe('2026-Q3');
	});

	it('returns top 3 lender names ordered most-recent-first, deduped', () => {
		const dsa = new ObjectId();
		const entries = [
			makeEntry({
				source_dsa_id: dsa,
				lender_selected: 'HDFC',
				created_at: new Date('2026-01-01T00:00:00Z')
			}),
			makeEntry({
				source_dsa_id: dsa,
				lender_selected: 'SBI',
				created_at: new Date('2026-03-01T00:00:00Z')
			}),
			makeEntry({
				source_dsa_id: dsa,
				lender_selected: 'HDFC', // duplicate — should dedupe
				created_at: new Date('2026-02-01T00:00:00Z')
			}),
			makeEntry({
				source_dsa_id: dsa,
				lender_selected: 'ICICI',
				created_at: new Date('2025-12-01T00:00:00Z')
			}),
			makeEntry({
				source_dsa_id: dsa,
				lender_selected: 'Axis',
				created_at: new Date('2025-06-01T00:00:00Z') // 4th-newest — should be truncated
			})
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result[0].top_lenders).toEqual(['SBI', 'HDFC', 'ICICI']);
	});

	it('drops null lender_selected entries when computing top_lenders', () => {
		const dsa = new ObjectId();
		const entries = [
			makeEntry({ source_dsa_id: dsa, lender_selected: null }),
			makeEntry({ source_dsa_id: dsa, lender_selected: 'HDFC' })
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result[0].top_lenders).toEqual(['HDFC']);
	});

	it('computes avg_price_bucket across the group', () => {
		const dsa = new ObjectId();
		const entries = [
			makeEntry({ source_dsa_id: dsa, property_price_bucket: 18_000_000 }),
			makeEntry({ source_dsa_id: dsa, property_price_bucket: 22_000_000 })
		];
		const result = rankCandidates(entries, 'pincode', '2026-Q3');
		expect(result[0].avg_price_bucket).toBe(20_000_000);
	});
});
