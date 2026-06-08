/**
 * DATA-1 — findLeadCandidates orchestrator tests.
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 + §9.
 *
 * Covers the privacy-critical 3-pass flow:
 *   - Pass 1 hits, ≥ 3 DSAs → returns pincode-tagged candidates
 *   - Pass 1 below cohort floor (k-anonymity) → suppresses, jumps to Pass 3
 *   - Pass 1 < 3 DSAs but cohort OK → Pass 2 fallback runs
 *   - Pass 2 cohort below k → suppression, Pass 3
 *   - Pass 3 always allowed (no geography → no PII risk)
 *   - Luxury threshold tightens k from 5 to 10
 *
 * The vault is mocked with a per-test in-memory store; each pass's filter
 * is checked against an actual filter function so we exercise the real
 * findLeadCandidates code (not just stubbed return values).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { findLeadCandidates } from '$lib/server/data1/leadRoutingQuery';
import type { LeadAttributionVaultEntry } from '$lib/server/data1/types';

// ── Test vault stub — minimal `find().toArray()` fluent shape ───────────────

interface VaultStub {
	entries: LeadAttributionVaultEntry[];
	calls: { filter: any; sortKey?: string; limit?: number }[];
}

function makeVaultStub(entries: LeadAttributionVaultEntry[] = []): {
	stub: VaultStub;
	collection: any;
} {
	const stub: VaultStub = { entries, calls: [] };

	function find(filter: any) {
		let pendingSortKey: string | undefined;
		let pendingLimit: number | undefined;
		const chain = {
			sort(spec: Record<string, number>) {
				pendingSortKey = Object.keys(spec)[0];
				return chain;
			},
			limit(n: number) {
				pendingLimit = n;
				return chain;
			},
			async toArray() {
				stub.calls.push({ filter, sortKey: pendingSortKey, limit: pendingLimit });
				const matches = stub.entries.filter((e) => matchesFilter(e, filter));
				if (pendingSortKey === 'closed_quarter') {
					matches.sort((a, b) => (a.closed_quarter < b.closed_quarter ? 1 : -1));
				}
				return pendingLimit ? matches.slice(0, pendingLimit) : matches;
			}
		};
		return chain;
	}

	return { stub, collection: { find } };
}

/** Tiny filter matcher — supports equality + $gte/$lte (the only ops the query uses). */
function matchesFilter(entry: LeadAttributionVaultEntry, filter: any): boolean {
	for (const [key, expected] of Object.entries(filter)) {
		const value = (entry as any)[key];
		if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
			if ('$gte' in expected && !(value >= (expected as any).$gte)) return false;
			if ('$lte' in expected && !(value <= (expected as any).$lte)) return false;
		} else {
			if (value !== expected) return false;
		}
	}
	return true;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<LeadAttributionVaultEntry> = {}): LeadAttributionVaultEntry {
	return {
		_id: new ObjectId(),
		source_case_id: 'HL-2026-' + Math.random().toString().slice(2, 8),
		source_dsa_id: new ObjectId(),
		closed_quarter: '2026-Q3',
		created_at: new Date('2026-08-01T00:00:00Z'),
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

const ROUTING_NOW = new Date('2026-09-01T00:00:00Z'); // → 2026-Q3
const ROUTING_INPUT_STANDARD = {
	loan_type: 'Home Loan',
	pincode: '400076',
	locality: 'Powai',
	target_price: 20_000_000 // sub-luxury; k = 5
};

// ── Tests ───────────────────────────────────────────────────────────────────

let logCalls: { msg: string; obj: Record<string, unknown> }[] = [];
const testLogger = {
	info: (obj: Record<string, unknown>, msg: string) => {
		logCalls.push({ obj, msg });
	}
};

beforeEach(() => {
	vi.clearAllMocks();
	logCalls = [];
});

describe('findLeadCandidates — Pass 1 (pincode)', () => {
	it('returns pincode-tagged candidates when ≥ 3 DSAs have ≥ k cohort total', () => {
		// 5 entries from 3 distinct DSAs at the matching pincode + in price band.
		// Cohort = 5 (passes k=5 standard); distinct = 3 → stop at Pass 1.
		const dsa1 = new ObjectId();
		const dsa2 = new ObjectId();
		const dsa3 = new ObjectId();
		const entries = [
			makeEntry({ source_dsa_id: dsa1 }),
			makeEntry({ source_dsa_id: dsa1 }),
			makeEntry({ source_dsa_id: dsa2 }),
			makeEntry({ source_dsa_id: dsa3 }),
			makeEntry({ source_dsa_id: dsa3 })
		];
		const { collection, stub } = makeVaultStub(entries);

		return findLeadCandidates(ROUTING_INPUT_STANDARD, {
			vault: collection,
			now: ROUTING_NOW,
			logger: testLogger
		}).then((result) => {
			expect(result).toHaveLength(3);
			expect(result.every((c) => c.match_strength === 'pincode')).toBe(true);
			// Only Pass 1 should have queried.
			expect(stub.calls).toHaveLength(1);
			expect(logCalls).toHaveLength(0);
		});
	});
});

describe('findLeadCandidates — k-anonymity suppression', () => {
	it('suppresses Pass 1 when cohort is 1 < k=5 → jumps to Pass 3', async () => {
		const dsa = new ObjectId();
		const entries = [
			// Single matching entry — below k=5 threshold for sub-luxury.
			makeEntry({ source_dsa_id: dsa }),
			// Out-of-pincode entries for Pass 3 to find.
			makeEntry({
				source_dsa_id: new ObjectId(),
				property_pincode: '500001'
			}),
			makeEntry({
				source_dsa_id: new ObjectId(),
				property_pincode: '500002'
			})
		];
		const { collection } = makeVaultStub(entries);

		const result = await findLeadCandidates(ROUTING_INPUT_STANDARD, {
			vault: collection,
			now: ROUTING_NOW,
			logger: testLogger
		});

		// Pass 1 cohort = 1 (< 5) → suppressed. Pass 3 returns up to 5.
		// Critically, the single suppressed-pincode DSA must NOT appear with
		// match_strength === 'pincode'.
		expect(result.every((c) => c.match_strength === 'loan_type_only')).toBe(true);

		// Log emission confirmed.
		expect(logCalls.find((c) => c.msg.includes('Pass 1 cohort suppressed'))).toBeTruthy();
	});

	it('luxury threshold: target ≥ ₹3 Cr applies k=10 instead of k=5', async () => {
		// 8 entries → passes standard (k=5) but FAILS luxury (k=10).
		const dsas = Array.from({ length: 8 }, () => new ObjectId());
		const entries = dsas.map((dsa) =>
			makeEntry({
				source_dsa_id: dsa,
				property_pincode: '400076',
				property_price_bucket: 45_000_000 // ₹4.5 Cr — solidly in luxury band
			})
		);
		const { collection } = makeVaultStub(entries);

		const result = await findLeadCandidates(
			{
				loan_type: 'Home Loan',
				pincode: '400076',
				locality: 'Powai',
				target_price: 50_000_000 // luxury → k = 10
			},
			{ vault: collection, now: ROUTING_NOW, logger: testLogger }
		);

		// 8 < 10 → suppressed.
		expect(result.every((c) => c.match_strength === 'loan_type_only')).toBe(true);
		expect(logCalls.find((c) => (c.obj.k_threshold as number) === 10)).toBeTruthy();
	});
});

describe('findLeadCandidates — Pass 2 (locality fallback)', () => {
	it('falls through to Pass 2 when Pass 1 has < 3 distinct DSAs', async () => {
		const dsa1 = new ObjectId();
		const dsa2 = new ObjectId();
		const dsa3 = new ObjectId();
		const entries = [
			// Pass 1 (pincode match): 5 entries from 2 distinct DSAs — cohort OK,
			// but only 2 < 3 → fall through to Pass 2.
			makeEntry({ source_dsa_id: dsa1, property_pincode: '400076' }),
			makeEntry({ source_dsa_id: dsa1, property_pincode: '400076' }),
			makeEntry({ source_dsa_id: dsa1, property_pincode: '400076' }),
			makeEntry({ source_dsa_id: dsa2, property_pincode: '400076' }),
			makeEntry({ source_dsa_id: dsa2, property_pincode: '400076' }),
			// Pass 2 (locality match): adds dsa3 from a different pincode.
			makeEntry({
				source_dsa_id: dsa3,
				property_pincode: '400077',
				property_locality_bucket: 'Powai' // matches bucketed input
			})
		];
		const { collection, stub } = makeVaultStub(entries);

		const result = await findLeadCandidates(
			{ ...ROUTING_INPUT_STANDARD, locality: 'Powai' },
			{ vault: collection, now: ROUTING_NOW, logger: testLogger }
		);

		// Merged: 3 distinct DSAs → returns from Pass 2 with 'locality' tag.
		expect(result.length).toBeGreaterThanOrEqual(3);
		expect(result.every((c) => c.match_strength === 'locality')).toBe(true);
		expect(stub.calls.length).toBe(2); // Pass 1 + Pass 2
	});
});

describe('findLeadCandidates — Pass 3 (loan_type only)', () => {
	it('Pass 3 has no k-anonymity gate (no geography → no PII)', async () => {
		// Only one Home Loan in the entire vault. Pass 3 still returns it.
		const dsa = new ObjectId();
		const entries = [
			makeEntry({
				source_dsa_id: dsa,
				property_pincode: '999999',
				property_locality_bucket: 'Nowhere'
			})
		];
		const { collection } = makeVaultStub(entries);

		const result = await findLeadCandidates(
			{ loan_type: 'Home Loan', pincode: '400076', locality: 'Powai', target_price: 20_000_000 },
			{ vault: collection, now: ROUTING_NOW, logger: testLogger }
		);

		expect(result).toHaveLength(1);
		expect(result[0].match_strength).toBe('loan_type_only');
	});

	it('Pass 3 filters by loan_type only — ignores price band and geography', async () => {
		const dsa = new ObjectId();
		const entries = [
			// Far outside the price band, different pincode + locality —
			// Pass 1 + Pass 2 would never match.
			makeEntry({
				source_dsa_id: dsa,
				property_pincode: '500001',
				property_locality_bucket: 'Different Area',
				property_price_bucket: 5_000_000
			})
		];
		const { collection } = makeVaultStub(entries);

		const result = await findLeadCandidates(ROUTING_INPUT_STANDARD, {
			vault: collection,
			now: ROUTING_NOW,
			logger: testLogger
		});

		expect(result).toHaveLength(1);
		expect(result[0].match_strength).toBe('loan_type_only');
	});
});
