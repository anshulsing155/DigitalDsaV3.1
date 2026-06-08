/**
 * DA Quota Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests the atomic quota consumption logic, top-up purchases,
 * monthly usage creation, and the concurrency gate.
 *
 * Since we can't spin up a real MongoDB in unit tests, we mock the
 * MonthlyAssessmentUsage collection methods. The mocks simulate
 * the $expr atomic gate behavior to prove correctness.
 *
 * The real integration test (25 parallel locks → exactly 20 succeed)
 * happens in Day A3 when the lock endpoint is wired.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';

// ── Mock MongoDB collection ─────────────────────────────────────

// Simulated in-memory store for the monthlyAssessmentUsage collection
let mockStore: Map<string, any>;

// Track consumed count for the atomic gate simulation
function storeKey(dsaId: ObjectId, yearMonth: string): string {
	return `${dsaId.toString()}_${yearMonth}`;
}

const mockFindOneAndUpdate = vi.fn();
const mockFindOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	MonthlyAssessmentUsage: {
		findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
		findOne: (...args: any[]) => mockFindOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

// ── Import after mocks ──────────────────────────────────────────

import {
	currentYearMonth,
	getOrCreateMonthlyUsage,
	consumeQuota,
	getUsageSummary
} from '$lib/server/billing/daQuota';
import type { DaUsageEvent } from '$lib/types/monthlyAssessmentUsage';

// ── Test helpers ────────────────────────────────────────────────

function makeEvent(action: DaUsageEvent['action'] = 'initial_lock', caseId = 'case-1'): DaUsageEvent {
	return { action, at: new Date(), case_id: caseId };
}

function createMockDoc(overrides: Partial<any> = {}) {
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		year_month: '2026-05',
		tier: 'pro_da',
		base_quota: 50,
		topup_quota: 0,
		consumed: 0,
		events: [],
		overage_charges_pending: 0,
		...overrides
	};
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

describe('currentYearMonth', () => {
	it('returns a YYYY-MM string', () => {
		const result = currentYearMonth();
		expect(result).toMatch(/^\d{4}-\d{2}$/);
	});

	it('returns correct month for a known date', () => {
		// Mock Date to 2026-05-05 15:00:00 IST (09:30 UTC)
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-05-05T09:30:00.000Z'));

		const result = currentYearMonth();
		expect(result).toBe('2026-05');

		vi.useRealTimers();
	});

	it('handles IST midnight boundary correctly (11:30 PM IST = same day)', () => {
		vi.useFakeTimers();
		// 11:30 PM IST on May 31 = 18:00 UTC May 31 (still May in IST)
		vi.setSystemTime(new Date('2026-05-31T18:00:00.000Z'));

		const result = currentYearMonth();
		expect(result).toBe('2026-05');

		vi.useRealTimers();
	});

	it('handles IST midnight boundary — after midnight = next month', () => {
		vi.useFakeTimers();
		// 12:30 AM IST on June 1 = 19:00 UTC May 31
		vi.setSystemTime(new Date('2026-05-31T19:00:00.000Z'));

		const result = currentYearMonth();
		expect(result).toBe('2026-06');

		vi.useRealTimers();
	});
});

describe('getOrCreateMonthlyUsage', () => {
	beforeEach(() => {
		mockStore = new Map();
		mockFindOneAndUpdate.mockReset();
	});

	it('creates a new doc with correct defaults on first call', async () => {
		const dsaId = new ObjectId();
		const expectedDoc = createMockDoc({ dsa_id: dsaId, tier: 'pro_da', base_quota: 50 });

		mockFindOneAndUpdate.mockResolvedValue(expectedDoc);

		const result = await getOrCreateMonthlyUsage(dsaId, '2026-05', 'pro_da');

		expect(result.tier).toBe('pro_da');
		expect(result.base_quota).toBe(50);
		expect(result.topup_quota).toBe(0);
		expect(result.consumed).toBe(0);
		expect(result.events).toEqual([]);

		// Verify the upsert was called with $setOnInsert
		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			{ dsa_id: dsaId, year_month: '2026-05' },
			{
				$setOnInsert: {
					tier: 'pro_da',
					base_quota: 50,
					topup_quota: 0,
					consumed: 0,
					events: [],
					overage_charges_pending: 0
				}
			},
			{ upsert: true, returnDocument: 'after' }
		);
	});

	it('returns existing doc without modification on second call', async () => {
		const dsaId = new ObjectId();
		const existingDoc = createMockDoc({
			dsa_id: dsaId,
			consumed: 5,
			events: [makeEvent()]
		});

		mockFindOneAndUpdate.mockResolvedValue(existingDoc);

		const result = await getOrCreateMonthlyUsage(dsaId, '2026-05', 'pro_da');

		// Should return the existing doc, consumed is 5 (not reset)
		expect(result.consumed).toBe(5);
	});

	it('uses correct base_quota for basic_da tier (10)', async () => {
		const dsaId = new ObjectId();
		const expectedDoc = createMockDoc({ dsa_id: dsaId, tier: 'basic_da', base_quota: 10 });

		mockFindOneAndUpdate.mockResolvedValue(expectedDoc);

		await getOrCreateMonthlyUsage(dsaId, '2026-05', 'basic_da');

		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				$setOnInsert: expect.objectContaining({ base_quota: 10 })
			}),
			expect.anything()
		);
	});

	it('uses correct base_quota for enterprise_da tier (100)', async () => {
		const dsaId = new ObjectId();
		const expectedDoc = createMockDoc({ dsa_id: dsaId, tier: 'enterprise_da', base_quota: 100 });

		mockFindOneAndUpdate.mockResolvedValue(expectedDoc);

		await getOrCreateMonthlyUsage(dsaId, '2026-05', 'enterprise_da');

		expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				$setOnInsert: expect.objectContaining({ base_quota: 100 })
			}),
			expect.anything()
		);
	});

	it('throws if findOneAndUpdate returns null (impossible in practice)', async () => {
		const dsaId = new ObjectId();
		mockFindOneAndUpdate.mockResolvedValue(null);

		await expect(
			getOrCreateMonthlyUsage(dsaId, '2026-05', 'pro_da')
		).rejects.toThrow('Failed to get/create monthly usage');
	});
});

describe('consumeQuota', () => {
	beforeEach(() => {
		mockFindOneAndUpdate.mockReset();
	});

	it('succeeds when quota is available', async () => {
		const dsaId = new ObjectId();
		const usageDoc = createMockDoc({ dsa_id: dsaId, consumed: 0 });
		const afterConsumeDoc = { ...usageDoc, consumed: 1 };

		// First call: getOrCreateMonthlyUsage
		mockFindOneAndUpdate.mockResolvedValueOnce(usageDoc);
		// Second call: the atomic consume (succeeds — quota available)
		mockFindOneAndUpdate.mockResolvedValueOnce(afterConsumeDoc);

		const result = await consumeQuota(dsaId, '2026-05', 'pro_da', makeEvent());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.consumed).toBe(1);
			expect(result.total).toBe(50);
		}
	});

	it('fails when quota is exhausted (non-enterprise)', async () => {
		const dsaId = new ObjectId();
		const exhaustedDoc = createMockDoc({ dsa_id: dsaId, consumed: 50 });

		// First call: getOrCreateMonthlyUsage returns exhausted state
		mockFindOneAndUpdate.mockResolvedValueOnce(exhaustedDoc);
		// Second call: atomic consume FAILS ($expr guard rejects)
		mockFindOneAndUpdate.mockResolvedValueOnce(null);

		const result = await consumeQuota(dsaId, '2026-05', 'pro_da', makeEvent());

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.consumed).toBe(50);
			expect(result.total).toBe(50);
			// 2026-05-28: top-ups retired; can_topup is now permanently false.
			// UI should route to plan-upgrade CTA instead.
			expect(result.can_topup).toBe(false);
			expect(result.is_overage).toBe(false);
		}
	});

	it('allows overage for enterprise_da when base quota exhausted', async () => {
		const dsaId = new ObjectId();
		const exhaustedDoc = createMockDoc({
			dsa_id: dsaId,
			tier: 'enterprise_da',
			base_quota: 100,
			consumed: 100
		});
		const overageDoc = { ...exhaustedDoc, consumed: 101, overage_charges_pending: 1 };

		// First call: getOrCreateMonthlyUsage
		mockFindOneAndUpdate.mockResolvedValueOnce(exhaustedDoc);
		// Second call: atomic consume FAILS (base+topup exhausted)
		mockFindOneAndUpdate.mockResolvedValueOnce(null);
		// Third call: overage path succeeds
		mockFindOneAndUpdate.mockResolvedValueOnce(overageDoc);

		const result = await consumeQuota(dsaId, '2026-05', 'enterprise_da', makeEvent());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.consumed).toBe(101);
		}
	});

	it('records the event in the push operation', async () => {
		const dsaId = new ObjectId();
		const usageDoc = createMockDoc({ dsa_id: dsaId });
		const event = makeEvent('initial_lock', 'case-xyz');

		mockFindOneAndUpdate.mockResolvedValueOnce(usageDoc);
		mockFindOneAndUpdate.mockResolvedValueOnce({ ...usageDoc, consumed: 1 });

		await consumeQuota(dsaId, '2026-05', 'pro_da', event);

		// The second call (atomic consume) should push the event
		const secondCall = mockFindOneAndUpdate.mock.calls[1];
		expect(secondCall[1].$push.events).toEqual(event);
	});

	it('includes $expr gate in the atomic update filter', async () => {
		const dsaId = new ObjectId();
		const usageDoc = createMockDoc({ dsa_id: dsaId });

		mockFindOneAndUpdate.mockResolvedValueOnce(usageDoc);
		mockFindOneAndUpdate.mockResolvedValueOnce({ ...usageDoc, consumed: 1 });

		await consumeQuota(dsaId, '2026-05', 'pro_da', makeEvent());

		// Verify the $expr gate is in the filter
		const secondCall = mockFindOneAndUpdate.mock.calls[1];
		const filter = secondCall[0];
		expect(filter.$expr).toEqual({
			$lt: ['$consumed', { $add: ['$base_quota', '$topup_quota'] }]
		});
	});

	// ── Concurrency simulation ──────────────────────────────────
	// This simulates what happens when 25 requests race on 20 slots.
	// The mock implements the same $expr semantics as MongoDB.

	it('25 parallel requests on 20-slot quota → exactly 20 succeed, 5 fail', async () => {
		const dsaId = new ObjectId();
		let currentConsumed = 0;
		const totalQuota = 20;

		// Simulate the atomic gate behavior:
		// getOrCreateMonthlyUsage always returns the "live" state
		// consumeQuota's $expr check uses currentConsumed < totalQuota
		mockFindOneAndUpdate.mockImplementation((filter: any, update: any, options: any) => {
			// Detect which call this is based on the filter shape
			if (filter.$expr) {
				// This is the atomic consume call
				if (currentConsumed < totalQuota) {
					currentConsumed++;
					return Promise.resolve(
						createMockDoc({
							dsa_id: dsaId,
							base_quota: totalQuota,
							consumed: currentConsumed
						})
					);
				}
				// Gate failed — quota exhausted
				return Promise.resolve(null);
			}

			// This is getOrCreateMonthlyUsage (upsert)
			return Promise.resolve(
				createMockDoc({
					dsa_id: dsaId,
					base_quota: totalQuota,
					consumed: currentConsumed
				})
			);
		});

		// Fire 25 parallel requests
		const requests = Array.from({ length: 25 }, (_, i) =>
			consumeQuota(dsaId, '2026-05', 'pro_da', makeEvent('initial_lock', `case-${i}`))
		);

		const results = await Promise.all(requests);

		const successes = results.filter((r) => r.ok);
		const failures = results.filter((r) => !r.ok);

		expect(successes).toHaveLength(20);
		expect(failures).toHaveLength(5);
		expect(currentConsumed).toBe(20);
	});

	it('respects topup_quota in the total calculation', async () => {
		const dsaId = new ObjectId();
		// Base 10 + topup 5 = 15 total, consumed 10 → 5 remaining
		const usageDoc = createMockDoc({
			dsa_id: dsaId,
			tier: 'basic_da',
			base_quota: 10,
			topup_quota: 5,
			consumed: 10
		});

		mockFindOneAndUpdate.mockResolvedValueOnce(usageDoc);
		mockFindOneAndUpdate.mockResolvedValueOnce({ ...usageDoc, consumed: 11 });

		const result = await consumeQuota(dsaId, '2026-05', 'basic_da', makeEvent());

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.total).toBe(15); // base + topup
		}
	});
});

// `purchaseTopup` test block retired 2026-05-28 — top-up purchases are no
// longer a product offering. The helper itself + the route + the TOPUP_PACKS
// constants are gone (see daQuota.ts in-file note). This block was 5 tests:
// +5 / +20 / +50 pack increments, event-recording, and invalid-pack error.
// If a future product slice resurrects top-ups, restore from git history.

describe('getUsageSummary', () => {
	beforeEach(() => {
		mockFindOne.mockReset();
	});

	it('returns null when no usage doc exists', async () => {
		const dsaId = new ObjectId();
		mockFindOne.mockResolvedValue(null);

		const result = await getUsageSummary(dsaId, '2026-05');
		expect(result).toBeNull();
	});

	it('returns correct summary with remaining quota', async () => {
		const dsaId = new ObjectId();
		mockFindOne.mockResolvedValue(
			createMockDoc({ dsa_id: dsaId, base_quota: 50, topup_quota: 5, consumed: 30 })
		);

		const result = await getUsageSummary(dsaId, '2026-05');

		expect(result).not.toBeNull();
		expect(result!.consumed).toBe(30);
		expect(result!.total).toBe(55);
		expect(result!.remaining).toBe(25);
		expect(result!.overage).toBe(0);
	});

	it('remaining is 0 when fully consumed (never negative)', async () => {
		const dsaId = new ObjectId();
		mockFindOne.mockResolvedValue(
			createMockDoc({
				dsa_id: dsaId,
				tier: 'enterprise_da',
				base_quota: 100,
				topup_quota: 0,
				consumed: 105,
				overage_charges_pending: 5
			})
		);

		const result = await getUsageSummary(dsaId, '2026-05');

		expect(result!.remaining).toBe(0); // Never negative
		expect(result!.overage).toBe(5);
	});
});

describe('billing.ts tier helpers', () => {
	// Import directly to test the helpers
	it('tierAllowsDocAssessment returns true for DA tiers', async () => {
		const { tierAllowsDocAssessment } = await import('$lib/config/billing');
		expect(tierAllowsDocAssessment('basic_da')).toBe(true);
		expect(tierAllowsDocAssessment('pro_da')).toBe(true);
		expect(tierAllowsDocAssessment('enterprise_da')).toBe(true);
	});

	it('tierAllowsDocAssessment returns false for non-DA tiers', async () => {
		const { tierAllowsDocAssessment } = await import('$lib/config/billing');
		expect(tierAllowsDocAssessment('free')).toBe(false);
		expect(tierAllowsDocAssessment('basic')).toBe(false);
		expect(tierAllowsDocAssessment('pro')).toBe(false);
		expect(tierAllowsDocAssessment('enterprise')).toBe(false);
	});

	it('tierHasOverage returns true only for enterprise_da', async () => {
		const { tierHasOverage } = await import('$lib/config/billing');
		expect(tierHasOverage('enterprise_da')).toBe(true);
		expect(tierHasOverage('pro_da')).toBe(false);
		expect(tierHasOverage('basic_da')).toBe(false);
		expect(tierHasOverage('enterprise')).toBe(false);
	});

	it('getTierDaQuota returns correct values', async () => {
		const { getTierDaQuota } = await import('$lib/config/billing');
		expect(getTierDaQuota('free')).toBe(0);
		expect(getTierDaQuota('basic')).toBe(0);
		expect(getTierDaQuota('basic_da')).toBe(10);
		expect(getTierDaQuota('pro')).toBe(0);
		expect(getTierDaQuota('pro_da')).toBe(50);
		expect(getTierDaQuota('enterprise')).toBe(0);
		expect(getTierDaQuota('enterprise_da')).toBe(100);
	});

	it('TIERS has exactly 7 entries', async () => {
		const { TIERS } = await import('$lib/config/billing');
		expect(Object.keys(TIERS)).toHaveLength(7);
	});

	// TOPUP_PACKS test retired 2026-05-28 — see top-up retirement note above.
});
