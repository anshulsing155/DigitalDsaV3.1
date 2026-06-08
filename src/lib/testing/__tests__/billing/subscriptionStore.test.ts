/**
 * D.1 S2.1 — Subscription persistence helper tests
 * ══════════════════════════════════════════════════════════════════
 * Covers the subscriptionStore layer that sits between the endpoints
 * and the BillingSubscriptions collection. Mongo is fully mocked so
 * these tests are fast + don't need a live DB.
 *
 * What's tested:
 *   - createOrRefreshPending: fresh doc, terminal-state refresh,
 *     pending re-subscribe overwrite, rejects active/paused/dunning
 *   - applyTransition: writes via findOneAndUpdate, precondition gate
 *   - checkAndMarkWebhookProcessed: first-time vs duplicate
 *   - sweepExpiredPendingMandates: transitions stale rows
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

// ── Mongo mocks ────────────────────────────────────────────────

const mockSubsFindOne = vi.fn();
const mockSubsInsertOne = vi.fn();
const mockSubsUpdateOne = vi.fn();
const mockSubsFindOneAndUpdate = vi.fn();
const mockSubsFind = vi.fn();
const mockWebhookInsertOne = vi.fn();

vi.mock('$lib/database/mongo', () => ({
	BillingSubscriptions: {
		findOne: (...args: unknown[]) => mockSubsFindOne(...args),
		insertOne: (...args: unknown[]) => mockSubsInsertOne(...args),
		updateOne: (...args: unknown[]) => mockSubsUpdateOne(...args),
		findOneAndUpdate: (...args: unknown[]) => mockSubsFindOneAndUpdate(...args),
		find: (...args: unknown[]) => mockSubsFind(...args)
	},
	ProcessedWebhookEvents: {
		insertOne: (...args: unknown[]) => mockWebhookInsertOne(...args)
	}
}));

vi.mock('$lib/server/logger', () => ({
	default: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

import {
	applyTransition,
	checkAndMarkWebhookProcessed,
	createOrRefreshPending,
	sweepExpiredPendingMandates
} from '$lib/server/billing/subscriptionStore';

// ── Fixtures ───────────────────────────────────────────────────

function fakeSub(overrides: Partial<BillingSubscriptionDoc> = {}): BillingSubscriptionDoc {
	const now = new Date();
	return {
		_id: new ObjectId(),
		dsa_id: new ObjectId(),
		state: 'not_subscribed',
		plan_id: 'pro',
		billing_cycle: 'monthly',
		provider: 'razorpay',
		max_amount_paise: 599_800,
		failed_attempt_count: 0,
		state_history: [],
		created_at: now,
		updated_at: now,
		...overrides
	};
}

beforeEach(() => {
	mockSubsFindOne.mockReset();
	mockSubsInsertOne.mockReset();
	mockSubsUpdateOne.mockReset();
	mockSubsFindOneAndUpdate.mockReset();
	mockSubsFind.mockReset();
	mockWebhookInsertOne.mockReset();
});

// ── createOrRefreshPending ─────────────────────────────────────

describe('createOrRefreshPending', () => {
	it('inserts a fresh doc when DSA has no subscription', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		mockSubsInsertOne.mockResolvedValue({ insertedId: new ObjectId() });

		const dsa_id = new ObjectId();
		const result = await createOrRefreshPending({
			dsa_id,
			plan_id: 'pro',
			max_amount_paise: 599_800,
			provider: 'razorpay',
			pending_registration_id: 'inv_reg_abc',
			provider_customer_id: 'cust_xyz',
			pending_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
		});

		expect(mockSubsInsertOne).toHaveBeenCalledOnce();
		expect(result.state).toBe('pending_mandate');
		expect(result.pending_registration_id).toBe('inv_reg_abc');
		expect(result.provider_customer_id).toBe('cust_xyz');
		expect(result.state_history).toHaveLength(1);
	});

	it('updates an existing doc when DSA is in cancelled state (re-subscribe)', async () => {
		const existing = fakeSub({ state: 'cancelled', mandate_token: 'old_token' });
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

		await createOrRefreshPending({
			dsa_id: existing.dsa_id,
			plan_id: 'basic', // plan switch on re-subscribe
			max_amount_paise: 149_850,
			provider: 'razorpay',
			pending_registration_id: 'inv_reg_new',
			provider_customer_id: 'cust_new',
			pending_expires_at: new Date()
		});

		expect(mockSubsInsertOne).not.toHaveBeenCalled();
		expect(mockSubsUpdateOne).toHaveBeenCalledOnce();
		const updateArgs = mockSubsUpdateOne.mock.calls[0];
		expect(updateArgs[1].$set.state).toBe('pending_mandate');
		expect(updateArgs[1].$set.plan_id).toBe('basic');
		// Old mandate_token should be unset
		expect(updateArgs[1].$unset).toHaveProperty('mandate_token');
	});

	it('updates an existing doc when DSA is in downgraded state', async () => {
		const existing = fakeSub({ state: 'downgraded' });
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

		await createOrRefreshPending({
			dsa_id: existing.dsa_id,
			plan_id: 'pro',
			max_amount_paise: 599_800,
			provider: 'razorpay',
			pending_registration_id: 'inv_reg_x',
			provider_customer_id: 'cust_x',
			pending_expires_at: new Date()
		});

		expect(mockSubsUpdateOne).toHaveBeenCalledOnce();
	});

	it('overwrites pending_mandate within 24h window (caller already validated provider state)', async () => {
		const existing = fakeSub({
			state: 'pending_mandate',
			pending_registration_id: 'inv_old'
		});
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsUpdateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

		await createOrRefreshPending({
			dsa_id: existing.dsa_id,
			plan_id: 'pro',
			max_amount_paise: 599_800,
			provider: 'razorpay',
			pending_registration_id: 'inv_new',
			provider_customer_id: 'cust_x',
			pending_expires_at: new Date()
		});

		expect(mockSubsUpdateOne).toHaveBeenCalledOnce();
	});

	it('throws when DSA is in active state (caller should use change-plan)', async () => {
		const existing = fakeSub({ state: 'active', mandate_token: 'tok' });
		mockSubsFindOne.mockResolvedValue(existing);

		await expect(
			createOrRefreshPending({
				dsa_id: existing.dsa_id,
				plan_id: 'pro',
				max_amount_paise: 599_800,
				provider: 'razorpay',
				pending_registration_id: 'inv_x',
				provider_customer_id: 'cust_x',
				pending_expires_at: new Date()
			})
		).rejects.toThrow(/already in state 'active'/);
	});

	it('throws when DSA is in paused state', async () => {
		const existing = fakeSub({ state: 'paused' });
		mockSubsFindOne.mockResolvedValue(existing);
		await expect(
			createOrRefreshPending({
				dsa_id: existing.dsa_id,
				plan_id: 'pro',
				max_amount_paise: 599_800,
				provider: 'razorpay',
				pending_registration_id: 'inv_x',
				provider_customer_id: 'cust_x',
				pending_expires_at: new Date()
			})
		).rejects.toThrow(/'paused'/);
	});

	it('throws when DSA is in dunning_t0', async () => {
		const existing = fakeSub({ state: 'dunning_t0' });
		mockSubsFindOne.mockResolvedValue(existing);
		await expect(
			createOrRefreshPending({
				dsa_id: existing.dsa_id,
				plan_id: 'pro',
				max_amount_paise: 599_800,
				provider: 'razorpay',
				pending_registration_id: 'inv_x',
				provider_customer_id: 'cust_x',
				pending_expires_at: new Date()
			})
		).rejects.toThrow(/'dunning_t0'/);
	});
});

// ── applyTransition ────────────────────────────────────────────

describe('applyTransition', () => {
	it('writes via findOneAndUpdate with from-state precondition', async () => {
		const existing = fakeSub({ state: 'pending_mandate' });
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...existing, state: 'active' });

		const result = await applyTransition(
			existing.dsa_id,
			'pending_mandate',
			'active',
			'webhook mandate.authorized'
		);

		expect(result).not.toBeNull();
		expect(mockSubsFindOneAndUpdate).toHaveBeenCalledOnce();
		const [filter, update] = mockSubsFindOneAndUpdate.mock.calls[0];
		expect(filter).toMatchObject({ dsa_id: existing.dsa_id, state: 'pending_mandate' });
		expect(update.$set.state).toBe('active');
		// state_history should be appended (length 1 since started empty)
		expect(update.$set.state_history).toHaveLength(1);
	});

	it('returns null when DSA has no subscription', async () => {
		mockSubsFindOne.mockResolvedValue(null);
		const result = await applyTransition(
			new ObjectId(),
			'pending_mandate',
			'active',
			'test'
		);
		expect(result).toBeNull();
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('returns null on precondition mismatch (state already changed by concurrent update)', async () => {
		// findOne sees state='active' but caller expected 'pending_mandate'
		mockSubsFindOne.mockResolvedValue(fakeSub({ state: 'active' }));
		const result = await applyTransition(
			new ObjectId(),
			'pending_mandate',
			'active',
			'test'
		);
		expect(result).toBeNull();
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('passes optional patch fields through to $set', async () => {
		const existing = fakeSub({ state: 'pending_mandate' });
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsFindOneAndUpdate.mockResolvedValue({
			...existing,
			state: 'active',
			mandate_token: 'tok',
			anchor_day: 5,
			next_charge_at: new Date('2026-06-05T00:00:00Z')
		});

		await applyTransition(
			existing.dsa_id,
			'pending_mandate',
			'active',
			'webhook',
			{
				mandate_token: 'tok',
				anchor_day: 5,
				next_charge_at: new Date('2026-06-05T00:00:00Z')
			}
		);

		const update = mockSubsFindOneAndUpdate.mock.calls[0][1];
		expect(update.$set.mandate_token).toBe('tok');
		expect(update.$set.anchor_day).toBe(5);
	});

	it('$unsets dunning_started_at on dunning_* → active recovery (S4 smoke fix)', async () => {
		// The state-machine recovery side-effect sets transitioned.dunning_started_at
		// to undefined. Without an explicit $unset, MongoDB silently keeps the
		// prior value — making the NEXT failure skip the "set fresh
		// dunning_started_at" branch (gated on !input.dunning_started_at) and
		// causing S5 day-counting to see a stale failure time. Surfaced by
		// D.1 S4 smoke Test S4-5 on 2026-05-27.
		const existing = fakeSub({
			state: 'dunning_t0',
			dunning_started_at: new Date('2026-05-20T00:00:00Z'),
			failed_attempt_count: 2
		});
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...existing, state: 'active' });

		await applyTransition(
			existing.dsa_id,
			'dunning_t0',
			'active',
			'retry succeeded'
		);

		const [, updateOps] = mockSubsFindOneAndUpdate.mock.calls[0];
		// $set must NOT include dunning_started_at (state machine cleared it)
		expect(updateOps.$set.dunning_started_at).toBeUndefined();
		// $unset MUST include dunning_started_at so Mongo removes the field
		expect(updateOps.$unset).toBeDefined();
		expect(updateOps.$unset.dunning_started_at).toBe('');
		// failed_attempt_count is reset to 0 via $set (state-machine-managed)
		expect(updateOps.$set.failed_attempt_count).toBe(0);
	});

	it('$unsets paused_from_state when resuming from paused', async () => {
		// Parallel case: pause→resume flow. transitionSubscription clears
		// paused_from_state when from===paused && to!==paused. applyTransition
		// must $unset it.
		const existing = fakeSub({
			state: 'paused',
			paused_from_state: 'active'
		});
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...existing, state: 'active' });

		await applyTransition(
			existing.dsa_id,
			'paused',
			'active',
			'DSA resumed from paused'
		);

		const [, updateOps] = mockSubsFindOneAndUpdate.mock.calls[0];
		expect(updateOps.$unset).toBeDefined();
		expect(updateOps.$unset.paused_from_state).toBe('');
	});

	it('does NOT include $unset when transitioning between non-clearing states', async () => {
		// active → active (cycle renewal) doesn't clear any field; the update
		// should be pure $set, no $unset (Mongo rejects empty $unset objects).
		const existing = fakeSub({ state: 'active' });
		mockSubsFindOne.mockResolvedValue(existing);
		mockSubsFindOneAndUpdate.mockResolvedValue({ ...existing });

		await applyTransition(
			existing.dsa_id,
			'active',
			'active',
			'cycle renewal'
		);

		const [, updateOps] = mockSubsFindOneAndUpdate.mock.calls[0];
		expect(updateOps.$unset).toBeUndefined();
	});
});

// ── checkAndMarkWebhookProcessed ───────────────────────────────

describe('checkAndMarkWebhookProcessed', () => {
	it('returns firstTime: true when insert succeeds', async () => {
		mockWebhookInsertOne.mockResolvedValue({ insertedId: 'evt_xyz' });
		const result = await checkAndMarkWebhookProcessed('evt_xyz');
		expect(result.firstTime).toBe(true);
	});

	it('returns firstTime: false on duplicate key (E11000)', async () => {
		mockWebhookInsertOne.mockRejectedValue({ code: 11000, message: 'duplicate key' });
		const result = await checkAndMarkWebhookProcessed('evt_xyz');
		expect(result.firstTime).toBe(false);
	});

	it('re-throws non-duplicate-key errors (e.g. network/auth)', async () => {
		mockWebhookInsertOne.mockRejectedValue(new Error('network down'));
		await expect(checkAndMarkWebhookProcessed('evt_xyz')).rejects.toThrow('network down');
	});
});

// ── sweepExpiredPendingMandates ────────────────────────────────

describe('sweepExpiredPendingMandates', () => {
	it('transitions stale rows to not_subscribed', async () => {
		const now = new Date();
		const stale = [
			fakeSub({ state: 'pending_mandate', updated_at: new Date(now.getTime() - 36 * 60 * 60 * 1000) }),
			fakeSub({ state: 'pending_mandate', updated_at: new Date(now.getTime() - 30 * 60 * 60 * 1000) })
		];
		// find().toArray() pattern
		mockSubsFind.mockReturnValue({
			toArray: vi.fn().mockResolvedValue(stale)
		});
		// applyTransition does findOne + findOneAndUpdate per row
		mockSubsFindOne.mockImplementation((filter: { dsa_id: ObjectId }) => {
			return Promise.resolve(stale.find((s) => s.dsa_id.equals(filter.dsa_id)) ?? null);
		});
		mockSubsFindOneAndUpdate.mockResolvedValue(stale[0]); // any non-null

		const result = await sweepExpiredPendingMandates(now);
		expect(result.swept).toBe(2);
		expect(mockSubsFindOneAndUpdate).toHaveBeenCalledTimes(2);
	});

	it('returns 0 when no stale rows', async () => {
		mockSubsFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
		const result = await sweepExpiredPendingMandates();
		expect(result.swept).toBe(0);
		expect(mockSubsFindOneAndUpdate).not.toHaveBeenCalled();
	});

	it('skips rows where the transition is a no-op (precondition mismatch)', async () => {
		const now = new Date();
		const stale = [fakeSub({ state: 'pending_mandate' })];
		mockSubsFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue(stale) });
		// Simulate concurrent update: by the time applyTransition's findOne runs,
		// the row's state has changed.
		mockSubsFindOne.mockResolvedValue(fakeSub({ state: 'active' })); // mismatch
		const result = await sweepExpiredPendingMandates(now);
		expect(result.swept).toBe(0);
	});
});
