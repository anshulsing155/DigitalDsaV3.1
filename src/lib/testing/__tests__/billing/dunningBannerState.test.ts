/**
 * D.1 S5 M4 — Dunning banner state loader tests
 * ══════════════════════════════════════════════════════════════════
 * Behavioral coverage for loadDunningBannerState — the helper that
 * decides whether the banner should render. Locks the short-circuit
 * branches (so non-DSA / unauthenticated nav doesn't hit Mongo) and
 * the dunning-state filter (so non-dunning subs don't render banners).
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

const mockFindOne = vi.fn();
vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockFindOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { loadDunningBannerState } from '$lib/server/billing/dunningBannerState';

beforeEach(() => {
	mockFindOne.mockReset();
});

const validId = new ObjectId().toString();

describe('loadDunningBannerState — short-circuit branches (no Mongo)', () => {
	it('returns null for unauthenticated locals', async () => {
		const result = await loadDunningBannerState({ user: null });
		expect(result).toBeNull();
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns null for locals with no user', async () => {
		const result = await loadDunningBannerState({});
		expect(result).toBeNull();
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns null for RM user (banner is DSA-only)', async () => {
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'rm' }
		});
		expect(result).toBeNull();
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns null for admin user', async () => {
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'admin' }
		});
		expect(result).toBeNull();
		expect(mockFindOne).not.toHaveBeenCalled();
	});

	it('returns null for demo-guest (non-ObjectId id)', async () => {
		const result = await loadDunningBannerState({
			user: { id: 'demo-guest', role: 'dsa' }
		});
		expect(result).toBeNull();
		expect(mockFindOne).not.toHaveBeenCalled();
	});
});

describe('loadDunningBannerState — DSA subscription filter', () => {
	it('returns null when DSA has no subscription doc', async () => {
		mockFindOne.mockResolvedValue(null);
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});

	it('returns null for active subscription (no banner)', async () => {
		mockFindOne.mockResolvedValue({
			state: 'active',
			dunning_started_at: undefined,
			plan_id: 'pro'
		});
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});

	it('returns null for paused subscription', async () => {
		mockFindOne.mockResolvedValue({
			state: 'paused',
			dunning_started_at: new Date(),
			plan_id: 'pro'
		});
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});

	it('returns null for downgraded (terminal — own screen, not a banner)', async () => {
		mockFindOne.mockResolvedValue({
			state: 'downgraded',
			plan_id: 'pro'
		});
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});

	it('returns banner data for dunning_t0', async () => {
		const failureAt = new Date('2026-06-01T09:30:00.000Z');
		mockFindOne.mockResolvedValue({
			state: 'dunning_t0',
			dunning_started_at: failureAt,
			plan_id: 'pro'
		});
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toEqual({
			state: 'dunning_t0',
			dunningStartedAtIso: failureAt.toISOString(),
			planId: 'pro'
		});
	});

	it('returns banner data for dunning_grace + dunning_final', async () => {
		const failureAt = new Date('2026-06-01T09:30:00.000Z');
		for (const state of ['dunning_grace', 'dunning_final'] as const) {
			mockFindOne.mockResolvedValueOnce({
				state,
				dunning_started_at: failureAt,
				plan_id: 'basic'
			});
			const result = await loadDunningBannerState({
				user: { id: validId, role: 'dsa' }
			});
			expect(result?.state).toBe(state);
		}
	});

	it('returns null when state is dunning_* but dunning_started_at is missing (data drift)', async () => {
		mockFindOne.mockResolvedValue({
			state: 'dunning_t0',
			dunning_started_at: undefined,
			plan_id: 'pro'
		});
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});

	it('returns null when Mongo throws (banner is never load-blocking)', async () => {
		mockFindOne.mockRejectedValue(new Error('Mongo unavailable'));
		const result = await loadDunningBannerState({
			user: { id: validId, role: 'dsa' }
		});
		expect(result).toBeNull();
	});
});
