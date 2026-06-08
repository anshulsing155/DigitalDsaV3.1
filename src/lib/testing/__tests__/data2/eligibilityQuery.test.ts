/**
 * DATA-2 — findEligibleCandidates unit tests.
 * Spec: docs/specs/DATA-2-CONSENTED-VAULT-SPEC.md §8 + §12.
 */

import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import {
	findEligibleCandidates,
	BT_FLOOR_BPS
} from '$lib/server/data2/eligibilityQuery';
import type { OutreachVaultEntry } from '$lib/server/data2/types';

const DSA_A = new ObjectId();
const DSA_B = new ObjectId();

function makeEntry(overrides: Partial<OutreachVaultEntry> = {}): OutreachVaultEntry {
	return {
		_id: new ObjectId(),
		dsa_id: DSA_A,
		case_id: 'HL-2026-001',
		mobile: '9876543210',
		loan_profile: {
			loan_type: 'Home Loan',
			lender_id: 'hdfc-bank',
			lender_name: 'HDFC',
			sanctioned_amount: 5_000_000,
			sanctioned_roi: 9.5,
			tenure_months: 240
		},
		consent_doc_ref: {
			imagekit_file_id: 'ik-1',
			imagekit_url: 'https://ik/1',
			template_version: 'v1',
			uploaded_at: new Date()
		},
		consent_signed_at: new Date(),
		revocation_token: 'a'.repeat(32),
		consent_status: 'active',
		created_at: new Date(),
		updated_at: new Date(),
		...overrides
	};
}

// Mock Collection that supports .find().sort().limit().toArray()
function makeMockVault(entries: OutreachVaultEntry[]) {
	function findOps(filter: any) {
		const matched = entries.filter((e) => matches(e, filter));
		let sortKey: string | undefined;
		let sortDir = 1;
		let limit = Infinity;
		const chain = {
			sort(spec: Record<string, number>) {
				sortKey = Object.keys(spec)[0];
				sortDir = spec[sortKey] ?? 1;
				return chain;
			},
			limit(n: number) {
				limit = n;
				return chain;
			},
			async toArray() {
				const sorted = [...matched];
				if (sortKey === 'loan_profile.sanctioned_roi') {
					sorted.sort(
						(a, b) =>
							(a.loan_profile.sanctioned_roi - b.loan_profile.sanctioned_roi) * sortDir
					);
				}
				return sorted.slice(0, limit);
			}
		};
		return chain;
	}
	return { find: findOps } as any;
}

function matches(entry: OutreachVaultEntry, filter: any): boolean {
	for (const [key, expected] of Object.entries(filter)) {
		if (key === '$or') continue; // accept anything for the consent_expiry $or — we don't seed expiries
		const value = getPath(entry, key);
		// Order matters: check ObjectId BEFORE the generic object branch,
		// otherwise ObjectIds (which are typeof 'object') silently pass.
		if (expected instanceof ObjectId) {
			if (!(value instanceof ObjectId) || !(value as ObjectId).equals(expected)) return false;
		} else if (typeof expected === 'object' && expected !== null && !Array.isArray(expected)) {
			if ('$gte' in expected && !(value >= (expected as any).$gte)) return false;
		} else {
			if (value !== expected) return false;
		}
	}
	return true;
}

function getPath(obj: any, path: string): any {
	return path.split('.').reduce((v, k) => v?.[k], obj);
}

describe('findEligibleCandidates — happy path', () => {
	it('returns entries above the BT floor, sorted by ROI desc', async () => {
		const entries = [
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 8.5 } }), // below floor
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 10.5 } }),
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 9.5 } }),
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 11.0 } })
		];
		const vault = makeMockVault(entries);

		const result = await findEligibleCandidates(vault, {
			dsa_id: DSA_A,
			current_rate_floor: 9.0 // floor of 9.5 (with 0.5 bps) → 8.5 excluded
		});
		expect(result).toHaveLength(3);
		expect(result.map((r) => r.loan_profile.sanctioned_roi)).toEqual([11.0, 10.5, 9.5]);
	});
});

describe('findEligibleCandidates — BT floor', () => {
	it('excludes entries at or below current_rate_floor + 0.5 bps', async () => {
		const entries = [
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 9.4 } }), // = floor + 0.4 → excluded
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 9.5 } }), // = floor + 0.5 → included (boundary)
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 9.6 } }) // above → included
		];
		const vault = makeMockVault(entries);

		const result = await findEligibleCandidates(vault, {
			dsa_id: DSA_A,
			current_rate_floor: 9.0
		});
		expect(result).toHaveLength(2);
		expect(result.find((r) => r.loan_profile.sanctioned_roi === 9.4)).toBeUndefined();
	});

	it('BT_FLOOR_BPS constant is 0.5 (the spec value)', () => {
		expect(BT_FLOOR_BPS).toBe(0.5);
	});
});

describe('findEligibleCandidates — DSA scoping (BOLA)', () => {
	it('only returns entries owned by the calling DSA', async () => {
		const entries = [
			makeEntry({ dsa_id: DSA_A, loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 11.0 } }),
			makeEntry({ dsa_id: DSA_B, loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 12.0 } }) // OTHER DSA — must be excluded
		];
		const vault = makeMockVault(entries);

		const result = await findEligibleCandidates(vault, {
			dsa_id: DSA_A,
			current_rate_floor: 9.0
		});
		expect(result).toHaveLength(1);
		expect(result[0].loan_profile.sanctioned_roi).toBe(11.0);
	});
});

describe('findEligibleCandidates — consent_status scoping', () => {
	it('excludes revoked entries', async () => {
		const entries = [
			makeEntry({ consent_status: 'revoked', loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 12.0 } }),
			makeEntry({ consent_status: 'active', loan_profile: { ...makeEntry().loan_profile, sanctioned_roi: 11.0 } })
		];
		const vault = makeMockVault(entries);
		const result = await findEligibleCandidates(vault, {
			dsa_id: DSA_A,
			current_rate_floor: 9.0
		});
		expect(result).toHaveLength(1);
		expect(result[0].consent_status).toBe('active');
	});
});

describe('findEligibleCandidates — filters', () => {
	it('loan_type filter restricts to one type', async () => {
		const entries = [
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, loan_type: 'Home Loan', sanctioned_roi: 11 } }),
			makeEntry({ loan_profile: { ...makeEntry().loan_profile, loan_type: 'Personal Loan', sanctioned_roi: 14 } })
		];
		const vault = makeMockVault(entries);
		const result = await findEligibleCandidates(vault, {
			dsa_id: DSA_A,
			current_rate_floor: 9.0,
			loan_type: 'Home Loan'
		});
		expect(result).toHaveLength(1);
		expect(result[0].loan_profile.loan_type).toBe('Home Loan');
	});
});

describe('findEligibleCandidates — defensive', () => {
	it('returns [] for non-positive current_rate_floor', async () => {
		const vault = makeMockVault([makeEntry()]);
		expect(await findEligibleCandidates(vault, { dsa_id: DSA_A, current_rate_floor: 0 })).toEqual([]);
		expect(await findEligibleCandidates(vault, { dsa_id: DSA_A, current_rate_floor: -5 })).toEqual([]);
	});
});
