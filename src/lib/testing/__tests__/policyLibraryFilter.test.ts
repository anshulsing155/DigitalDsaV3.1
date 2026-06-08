/**
 * Policy Library filter + sort helpers (C.2) — unit tests.
 *
 * Verifies the pure helpers used by /dashboard/rm/policies/+page.svelte for
 * search, classification filter, and sort. 78 lenders fits in memory so all
 * operations are client-side; correctness here is the only thing the user
 * sees, so it's heavily covered.
 */

import { describe, it, expect } from 'vitest';
import {
	filterAssignments,
	sortAssignments,
	type PolicyLibraryAssignment
} from '$lib/utils/policyLibraryFilter';

function mk(
	name: string,
	overrides: Partial<PolicyLibraryAssignment> = {}
): PolicyLibraryAssignment {
	return {
		lenderName: name,
		lenderClassification: 'PVT',
		lastVerifiedAt: '2026-04-01T00:00:00.000Z',
		daysUntilRenewal: 20,
		renewalOverdue: false,
		renewalDueSoon: false,
		...overrides
	};
}

const SAMPLE: PolicyLibraryAssignment[] = [
	mk('HDFC Bank', { lenderClassification: 'PVT', lastVerifiedAt: '2026-05-01T00:00:00Z' }),
	mk('ICICI Bank', {
		lenderClassification: 'PVT',
		lastVerifiedAt: '2026-04-15T00:00:00Z',
		daysUntilRenewal: 3,
		renewalDueSoon: true
	}),
	mk('SBI', {
		lenderClassification: 'GOV',
		lastVerifiedAt: '2026-03-10T00:00:00Z',
		daysUntilRenewal: -2,
		renewalOverdue: true
	}),
	mk('Bajaj Finserv', { lenderClassification: 'NBFC', lastVerifiedAt: '2026-04-22T00:00:00Z' }),
	mk('LIC Housing', { lenderClassification: 'HFC', lastVerifiedAt: null }),
	mk('AU Small Finance', {
		lenderClassification: 'SFB',
		lastVerifiedAt: '2026-04-28T00:00:00Z'
	})
];

describe('filterAssignments', () => {
	it('returns the input unchanged when query and type are both empty', () => {
		const out = filterAssignments(SAMPLE, { query: '', type: '' });
		expect(out).toHaveLength(SAMPLE.length);
		// Identity (not a copy) is fine — the helper is read-only on input.
		expect(out).toEqual(SAMPLE);
	});

	it('substring-matches lenderName case-insensitively', () => {
		const out = filterAssignments(SAMPLE, { query: 'bank', type: '' });
		expect(out.map((a) => a.lenderName).sort()).toEqual(['HDFC Bank', 'ICICI Bank']);
	});

	it('ignores leading/trailing whitespace in the query', () => {
		const out = filterAssignments(SAMPLE, { query: '   hdfc   ', type: '' });
		expect(out.map((a) => a.lenderName)).toEqual(['HDFC Bank']);
	});

	it('filters by exact lenderClassification', () => {
		const out = filterAssignments(SAMPLE, { query: '', type: 'GOV' });
		expect(out.map((a) => a.lenderName)).toEqual(['SBI']);
	});

	it('returns empty when no lender matches a non-empty query', () => {
		const out = filterAssignments(SAMPLE, { query: 'xyz_does_not_exist', type: '' });
		expect(out).toEqual([]);
	});

	it('applies query AND type together (intersection)', () => {
		const out = filterAssignments(SAMPLE, { query: 'bank', type: 'GOV' });
		// "bank" matches HDFC + ICICI (PVT), neither is GOV → empty.
		expect(out).toEqual([]);

		const out2 = filterAssignments(SAMPLE, { query: 'finance', type: 'SFB' });
		expect(out2.map((a) => a.lenderName)).toEqual(['AU Small Finance']);
	});
});

describe('sortAssignments — overdue always floats to top', () => {
	it("places overdue records before any non-overdue, regardless of mode", () => {
		for (const mode of ['recent', 'az', 'due_soonest'] as const) {
			const out = sortAssignments(SAMPLE, mode);
			expect(
				out[0].renewalOverdue,
				`mode=${mode}: first row should be overdue (SBI)`
			).toBe(true);
		}
	});
});

describe('sortAssignments — recent', () => {
	it('orders non-overdue records by lastVerifiedAt descending', () => {
		const nonOverdue = SAMPLE.filter((a) => !a.renewalOverdue);
		const out = sortAssignments(nonOverdue, 'recent');
		expect(out.map((a) => a.lenderName)).toEqual([
			'HDFC Bank', // 2026-05-01 (newest)
			'AU Small Finance', // 2026-04-28
			'Bajaj Finserv', // 2026-04-22
			'ICICI Bank', // 2026-04-15
			'LIC Housing' // null → bottom
		]);
	});

	it('puts records with null lastVerifiedAt at the bottom', () => {
		const out = sortAssignments(SAMPLE.filter((a) => !a.renewalOverdue), 'recent');
		expect(out[out.length - 1].lenderName).toBe('LIC Housing');
	});
});

describe('sortAssignments — due_soonest', () => {
	it('orders by daysUntilRenewal ascending', () => {
		const nonOverdue = SAMPLE.filter((a) => !a.renewalOverdue);
		const out = sortAssignments(nonOverdue, 'due_soonest');
		// ICICI (3 days) before everything else (20 days, default).
		expect(out[0].lenderName).toBe('ICICI Bank');
	});
});

describe('sortAssignments — az', () => {
	it('orders by lenderName alphabetically', () => {
		const nonOverdue = SAMPLE.filter((a) => !a.renewalOverdue);
		const out = sortAssignments(nonOverdue, 'az');
		expect(out.map((a) => a.lenderName)).toEqual([
			'AU Small Finance',
			'Bajaj Finserv',
			'HDFC Bank',
			'ICICI Bank',
			'LIC Housing'
		]);
	});
});

describe('sortAssignments — does not mutate input', () => {
	it('returns a new array; original order is preserved', () => {
		const before = SAMPLE.map((a) => a.lenderName);
		sortAssignments(SAMPLE, 'az');
		const after = SAMPLE.map((a) => a.lenderName);
		expect(after).toEqual(before);
	});
});
