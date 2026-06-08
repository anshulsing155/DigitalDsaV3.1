/**
 * D.1 — planResolver tests
 * ══════════════════════════════════════════════════════════════════
 * Locks the contract of resolveActivePlanId(dsa_id):
 *   - null when no BillingSubscriptions row exists
 *   - null when row exists but state is in the not-active set
 *     (not_subscribed, pending_mandate, downgraded, cancelled)
 *   - returns { plan_id, state } for active / paused / dunning_*
 *   - surfaces pending_downgrade_to when set
 *
 * Why these specific states are "active": spec §3.2 — the DSA still has
 * paid access while in dunning (we're trying to recover them), and while
 * paused (they've paid through the pause start; they may resume).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { SubscriptionState } from '$lib/types/billingSubscription';

const mockFindOne = vi.fn();
const mockAdminFindOne = vi.fn();
const mockDsaFindOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockFindOne(...args)
	},
	AdminUsers: {
		findOne: (...args: unknown[]) => mockAdminFindOne(...args)
	},
	DsaApplications: {
		findOne: (...args: unknown[]) => mockDsaFindOne(...args)
	}
}));

// Silence the planResolver warn-log on the defensive-fallback test so the
// suite output stays clean. The behavior under test is the fallback path
// itself, not the log line.
vi.mock('$lib/server/logger', () => ({
	default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

beforeEach(() => {
	mockFindOne.mockReset();
	// Default: not an admin, not a test profile. Tests opt-in to the override
	// by overriding these in the test body.
	mockAdminFindOne.mockReset();
	mockAdminFindOne.mockResolvedValue(null);
	mockDsaFindOne.mockReset();
	mockDsaFindOne.mockResolvedValue(null);
});

const TEST_DSA = new ObjectId();

describe('resolveActivePlanId', () => {
	it('returns null when no subscription row exists', async () => {
		mockFindOne.mockResolvedValueOnce(null);
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toBeNull();
	});

	const activeStates: SubscriptionState[] = [
		'active',
		'paused',
		'dunning_t0',
		'dunning_grace',
		'dunning_final'
	];

	for (const state of activeStates) {
		it(`returns plan_id + state for state=${state}`, async () => {
			mockFindOne.mockResolvedValueOnce({ state, plan_id: 'pro' });
			const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
			const result = await resolveActivePlanId(TEST_DSA);
			expect(result).toEqual({ plan_id: 'pro', state });
		});
	}

	const inactiveStates: SubscriptionState[] = [
		'not_subscribed',
		'pending_mandate',
		'downgraded',
		'cancelled'
	];

	for (const state of inactiveStates) {
		it(`returns null for state=${state}`, async () => {
			mockFindOne.mockResolvedValueOnce({ state, plan_id: 'pro' });
			const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
			const result = await resolveActivePlanId(TEST_DSA);
			expect(result).toBeNull();
		});
	}

	it('surfaces pending_downgrade_to when set on the doc', async () => {
		mockFindOne.mockResolvedValueOnce({
			state: 'active',
			plan_id: 'pro',
			pending_downgrade_to: 'basic'
		});
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toEqual({
			plan_id: 'pro',
			state: 'active',
			pending_downgrade_to: 'basic'
		});
	});

	it('accepts a string dsa_id and converts to ObjectId', async () => {
		mockFindOne.mockResolvedValueOnce({ state: 'active', plan_id: 'basic' });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		await resolveActivePlanId(TEST_DSA.toString());
		const firstArg = mockFindOne.mock.calls[0][0] as { dsa_id: ObjectId };
		expect(firstArg.dsa_id).toBeInstanceOf(ObjectId);
		expect(firstArg.dsa_id.toString()).toBe(TEST_DSA.toString());
	});

	// ── Internal-profile override (admin + is_test DSA) ──────────────────
	// Both audiences resolve as a synthetic Pro/active subscription so
	// downstream gates treat them uniformly as paying Pro users. The
	// BillingSubscriptions lookup is short-circuited.

	it('returns synthetic Pro/active when the id matches an AdminUsers row', async () => {
		mockAdminFindOne.mockResolvedValueOnce({ _id: TEST_DSA });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result?.plan_id).toBe('pro');
		expect(result?.state).toBe('active');
		// BillingSubscriptions must NOT have been consulted — admins skip
		// the subscription read entirely.
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns synthetic Pro/active when the DSA row has is_test === true', async () => {
		mockDsaFindOne.mockResolvedValueOnce({ is_test: true });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result?.plan_id).toBe('pro');
		expect(result?.state).toBe('active');
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	// Lock the synthetic-cycle-anchor: admin/is_test accounts have no
	// BillingSubscriptions row, so without a synthesised next_charge_at the
	// dashboard sidebar renders bare "Pro Plan" with no cycle range — exactly
	// the bug reported 2026-06-02. The fix attaches a calendar-month anchor
	// (start of next calendar month UTC) so getQuotaState can derive both
	// cycleStartAt and nextCycleAt for the sidebar block.
	it('attaches a synthetic next_charge_at at start of next calendar month for admin override', async () => {
		mockAdminFindOne.mockResolvedValueOnce({ _id: TEST_DSA });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);

		expect(result?.next_charge_at).toBeInstanceOf(Date);
		const d = result!.next_charge_at!;
		// Must be the 1st of a month at UTC midnight (matches real
		// BillingSubscriptions.next_charge_at stamping convention).
		expect(d.getUTCDate()).toBe(1);
		expect(d.getUTCHours()).toBe(0);
		expect(d.getUTCMinutes()).toBe(0);
		expect(d.getUTCSeconds()).toBe(0);
		// Must be strictly in the future (we set it to next calendar month).
		expect(d.getTime()).toBeGreaterThan(Date.now());
	});

	it('attaches a synthetic next_charge_at for is_test DSA override', async () => {
		mockDsaFindOne.mockResolvedValueOnce({ is_test: true });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result?.next_charge_at).toBeInstanceOf(Date);
		expect(result!.next_charge_at!.getUTCDate()).toBe(1);
	});

	it('does NOT trigger the override when is_test is false or absent', async () => {
		mockDsaFindOne.mockResolvedValueOnce({ is_test: false });
		mockFindOne.mockResolvedValueOnce({ state: 'active', plan_id: 'basic' });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toEqual({ plan_id: 'basic', state: 'active' });
		expect(mockFindOne).toHaveBeenCalledOnce();
	});

	// ── Defensive fallback — DB throw on override lookups MUST NOT propagate ──
	// resolveActivePlanId is on the hot path of every case-create gate,
	// dashboard quota read, and DA-quota check. A transient DB blip on
	// the AdminUsers / DsaApplications override lookups must silently fall
	// through to the normal BillingSubscriptions resolution path, never
	// 500 the caller. The 2026-05-31 production-down incident is the
	// reason this guard exists.

	it('falls through to the normal subscription path when AdminUsers.findOne throws', async () => {
		mockAdminFindOne.mockRejectedValueOnce(new Error('db blip'));
		mockFindOne.mockResolvedValueOnce({ state: 'active', plan_id: 'basic' });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toEqual({ plan_id: 'basic', state: 'active' });
		expect(mockFindOne).toHaveBeenCalledOnce();
	});

	it('falls through to the normal subscription path when DsaApplications.findOne throws', async () => {
		mockDsaFindOne.mockRejectedValueOnce(new Error('db blip'));
		mockFindOne.mockResolvedValueOnce({ state: 'active', plan_id: 'pro' });
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toEqual({ plan_id: 'pro', state: 'active' });
		expect(mockFindOne).toHaveBeenCalledOnce();
	});

	it('returns null when override DB throws AND the user has no subscription', async () => {
		mockAdminFindOne.mockRejectedValueOnce(new Error('db blip'));
		mockFindOne.mockResolvedValueOnce(null);
		const { resolveActivePlanId } = await import('../../../server/billing/planResolver');
		const result = await resolveActivePlanId(TEST_DSA);
		expect(result).toBeNull();
	});
});

describe('ACTIVE_PLAN_STATES export', () => {
	it('contains the 5 documented states', async () => {
		const { ACTIVE_PLAN_STATES } = await import('../../../server/billing/planResolver');
		expect(ACTIVE_PLAN_STATES.size).toBe(5);
		expect(ACTIVE_PLAN_STATES.has('active')).toBe(true);
		expect(ACTIVE_PLAN_STATES.has('paused')).toBe(true);
		expect(ACTIVE_PLAN_STATES.has('dunning_t0')).toBe(true);
		expect(ACTIVE_PLAN_STATES.has('dunning_grace')).toBe(true);
		expect(ACTIVE_PLAN_STATES.has('dunning_final')).toBe(true);
	});

	it('does not include terminal or pre-pay states', async () => {
		const { ACTIVE_PLAN_STATES } = await import('../../../server/billing/planResolver');
		expect(ACTIVE_PLAN_STATES.has('not_subscribed')).toBe(false);
		expect(ACTIVE_PLAN_STATES.has('pending_mandate')).toBe(false);
		expect(ACTIVE_PLAN_STATES.has('downgraded')).toBe(false);
		expect(ACTIVE_PLAN_STATES.has('cancelled')).toBe(false);
	});
});
