/**
 * C.6 — `getLenderCoverageStats()` unit test.
 *
 * The function is the single canonical source for every "how many lenders"
 * count rendered across the admin dashboards. Audit reported four numbers
 * (288 / 78 / 62 / 0) appearing without explanation — this helper assembles
 * all four with explicit definitions. The test asserts each count is sourced
 * from the correct collection + filter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/database/mongo', () => {
	const dbHandle = {
		collection: () => ({ countDocuments: vi.fn(), distinct: vi.fn() })
	};
	return {
		Applicant: dbHandle,
		DsaApplications: dbHandle,
		rmApplications: dbHandle,
		deletedUsers: dbHandle,
		deletedDsa: dbHandle,
		LenderRuleArtifacts: dbHandle,
		LenderRuleFixtures: dbHandle,
		SyntheticProfiles: dbHandle,
		E2eTestRuns: dbHandle,
		Lenders: {
			countDocuments: vi.fn()
		},
		RmLenderAssignments: {
			distinct: vi.fn()
		},
		PmsLenderPolicies: {
			distinct: vi.fn()
		}
	};
});

import { Lenders, RmLenderAssignments, PmsLenderPolicies } from '$lib/database/mongo';
import { getLenderCoverageStats } from '$lib/server/adminStats';

describe('getLenderCoverageStats — 4-count assembly', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the four canonical counts with the right sources', async () => {
		const lendersCount = vi.mocked(Lenders.countDocuments);
		const rmDistinct = vi.mocked(RmLenderAssignments.distinct);
		const pmsDistinct = vi.mocked(PmsLenderPolicies.distinct);

		// First call: all records (no filter). Second call: active filter.
		lendersCount.mockResolvedValueOnce(288).mockResolvedValueOnce(62);
		rmDistinct.mockResolvedValueOnce([
			'sbi',
			'hdfc',
			'icici',
			'axis',
			'bob',
			'pnb',
			'kotak'
			// 78 in prod, 7 here is enough to verify .length
		] as any);
		pmsDistinct.mockResolvedValueOnce([] as any);

		const result = await getLenderCoverageStats();

		expect(result).toEqual({
			lenderRecords: 288,
			activeLenders: 62,
			lendersWithAssignedRm: 7,
			lendersWithPublishedPolicy: 0
		});

		// Lenders was called twice: once for all, once with status:active filter.
		expect(lendersCount).toHaveBeenCalledTimes(2);
		expect(lendersCount.mock.calls[0][0]).toEqual({});
		expect(lendersCount.mock.calls[1][0]).toEqual({ status: 'active' });

		// distinct() was called with the right field + active-status filter.
		expect(rmDistinct).toHaveBeenCalledTimes(1);
		expect(rmDistinct.mock.calls[0][0]).toBe('lenderId');
		expect(rmDistinct.mock.calls[0][1]).toEqual({ status: 'active' });

		expect(pmsDistinct).toHaveBeenCalledTimes(1);
		expect(pmsDistinct.mock.calls[0][0]).toBe('lenderId');
		expect(pmsDistinct.mock.calls[0][1]).toEqual({ status: 'published' });
	});

	it('handles the zero-coverage state (the "0 published" audit finding)', async () => {
		vi.mocked(Lenders.countDocuments).mockResolvedValueOnce(50).mockResolvedValueOnce(50);
		vi.mocked(RmLenderAssignments.distinct).mockResolvedValueOnce(['sbi'] as any);
		vi.mocked(PmsLenderPolicies.distinct).mockResolvedValueOnce([] as any);

		const result = await getLenderCoverageStats();
		expect(result.lendersWithPublishedPolicy).toBe(0);
		// Audit-Lens-14 invariant: the customer-facing number can be zero
		// even when the operational counts are healthy; the label is what
		// disambiguates.
		expect(result.activeLenders).toBe(50);
	});

	it('issues all four queries in parallel (Promise.all)', async () => {
		// Soft-verifies non-sequential execution: each mock's resolve is delayed,
		// but the wall-clock time should be near the max of the four delays, not
		// the sum. Since unit tests can't reliably measure timing, instead assert
		// all four mocks were called BEFORE any awaited result returns by using
		// a shared counter.
		let inFlight = 0;
		let maxInFlight = 0;
		const wrap = <T>(value: T) =>
			new Promise<T>((resolve) => {
				inFlight += 1;
				maxInFlight = Math.max(maxInFlight, inFlight);
				setTimeout(() => {
					inFlight -= 1;
					resolve(value);
				}, 5);
			});

		vi.mocked(Lenders.countDocuments)
			.mockImplementationOnce(() => wrap(10))
			.mockImplementationOnce(() => wrap(8));
		vi.mocked(RmLenderAssignments.distinct).mockImplementationOnce(() => wrap(['x']));
		vi.mocked(PmsLenderPolicies.distinct).mockImplementationOnce(() => wrap(['x', 'y']));

		await getLenderCoverageStats();
		// All four queries should have been in flight at the same time.
		expect(maxInFlight).toBe(4);
	});
});
