/**
 * D.1 S1 — Subscription state machine tests
 * ══════════════════════════════════════════════════════════════════
 * Covers:
 *   - Every legal transition in §3.2.1 succeeds
 *   - Representative illegal transitions throw
 *   - Side-effects bake correctly (dunning clock, paused_from_state,
 *     recovery clears bookkeeping)
 *   - LEGAL_TRANSITION_COUNT matches the implementation set size
 *     (static drift detection)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import {
	IllegalSubscriptionTransitionError,
	LEGAL_TRANSITION_COUNT,
	isLegalTransition,
	legalTargetsFrom,
	makeFreshSubscription,
	transitionSubscription
} from '$lib/server/billing/subscriptionState';
import type { SubscriptionState } from '$lib/types/billingSubscription';

// ── Helpers ─────────────────────────────────────────────────────

function seed(state: SubscriptionState) {
	const sub = makeFreshSubscription(new ObjectId(), 'pro', 599_800);
	return { ...sub, state };
}

// ── LEGAL_TRANSITION_COUNT drift detection ─────────────────────

describe('subscriptionState — transition table integrity', () => {
	it('LEGAL_TRANSITION_COUNT matches all sources of truth', () => {
		// Build the same set from legalTargetsFrom() to confirm the export
		// matches the actual set size — drift between the constant and
		// the implementation set would silently allow new legal edges
		// to bypass the static check.
		const allStates: SubscriptionState[] = [
			'not_subscribed',
			'pending_mandate',
			'active',
			'paused',
			'dunning_t0',
			'dunning_grace',
			'dunning_final',
			'downgraded',
			'cancelled'
		];
		const totalEdges = allStates.reduce(
			(sum, from) => sum + legalTargetsFrom(from).length,
			0
		);
		expect(totalEdges).toBe(LEGAL_TRANSITION_COUNT);
	});

	it('every transition table edge from §3.2.1 is legal', () => {
		// A representative sampling — full list lives in the implementation
		// and is cross-checked above. These spot-checks fail loudly if a
		// row is renamed/removed.
		const checks: [SubscriptionState, SubscriptionState][] = [
			['not_subscribed', 'pending_mandate'],
			['pending_mandate', 'active'],
			['pending_mandate', 'not_subscribed'],
			['pending_mandate', 'pending_mandate'],
			['active', 'active'],
			['active', 'dunning_t0'],
			['active', 'downgraded'],
			['active', 'paused'],
			['active', 'cancelled'],
			['dunning_t0', 'active'],
			['dunning_t0', 'dunning_grace'],
			['dunning_t0', 'downgraded'],
			['dunning_t0', 'paused'],
			['dunning_grace', 'dunning_final'],
			['dunning_grace', 'active'],
			['dunning_grace', 'downgraded'],
			['dunning_grace', 'paused'],
			['dunning_final', 'downgraded'],
			['dunning_final', 'active'],
			['dunning_final', 'paused'],
			['paused', 'active'],
			['paused', 'dunning_t0'],
			['paused', 'cancelled'],
			['downgraded', 'pending_mandate'],
			['cancelled', 'pending_mandate']
		];
		for (const [from, to] of checks) {
			expect(isLegalTransition(from, to)).toBe(true);
		}
	});

	it('representative illegal transitions are rejected', () => {
		// NOTE: paused → dunning_* IS legal (resume restores paused_from_state),
		// not in this list. The illegal ones are about skipping required steps,
		// going backward, or terminal-state escape without re-mandate.
		const illegal: [SubscriptionState, SubscriptionState][] = [
			['not_subscribed', 'active'], // must go through pending_mandate
			['not_subscribed', 'dunning_t0'], // can't skip auth
			['pending_mandate', 'dunning_t0'], // no charge has happened yet
			['active', 'dunning_grace'], // must enter dunning at t0 first
			['active', 'dunning_final'], // ditto
			['downgraded', 'active'], // must re-mandate
			['cancelled', 'active'], // must re-mandate
			['dunning_grace', 'dunning_t0'], // no backward dunning
			['dunning_final', 'dunning_grace'], // no backward dunning
			['active', 'not_subscribed'] // can't unsubscribe cleanly
		];
		for (const [from, to] of illegal) {
			expect(isLegalTransition(from, to)).toBe(false);
		}
	});
});

// ── transitionSubscription happy paths ─────────────────────────

describe('transitionSubscription — happy paths', () => {
	it('subscribe path: not_subscribed → pending_mandate', () => {
		const result = transitionSubscription(seed('not_subscribed'), 'pending_mandate', {
			reason: 'DSA clicked Subscribe'
		});
		expect(result.state).toBe('pending_mandate');
		expect(result.state_history).toHaveLength(1);
		expect(result.state_history[0]).toMatchObject({
			from: 'not_subscribed',
			to: 'pending_mandate',
			reason: 'DSA clicked Subscribe'
		});
	});

	it('mandate authorized: pending_mandate → active', () => {
		const result = transitionSubscription(seed('pending_mandate'), 'active', {
			reason: 'webhook mandate.authorized'
		});
		expect(result.state).toBe('active');
	});

	it('charge succeeds: active → active (self-loop, history appended)', () => {
		const result = transitionSubscription(seed('active'), 'active', {
			reason: 'charge.succeeded — cycle renewed'
		});
		expect(result.state).toBe('active');
		expect(result.state_history).toHaveLength(1);
	});

	it('first failed charge: active → dunning_t0 sets dunning_started_at AND increments failed_attempt_count', () => {
		const before = seed('active');
		expect(before.dunning_started_at).toBeUndefined();
		expect(before.failed_attempt_count).toBe(0);
		const after = transitionSubscription(before, 'dunning_t0', {
			reason: 'charge.failed INSUFFICIENT_FUNDS'
		});
		expect(after.state).toBe('dunning_t0');
		expect(after.dunning_started_at).toBeInstanceOf(Date);
		// Increment is required so S4's escalation cron can use the counter
		// to know when to advance dunning_t0 → dunning_grace → dunning_final.
		// Discovered missing during the S3 smoke 2026-05-27.
		expect(after.failed_attempt_count).toBe(1);
	});

	it('terminal failure: active → downgraded increments failed_attempt_count', () => {
		// MANDATE_INVALID is still a failed charge, just terminal — count must bump.
		const before = { ...seed('active'), failed_attempt_count: 0 };
		const after = transitionSubscription(before, 'downgraded', {
			reason: 'charge.failed MANDATE_INVALID'
		});
		expect(after.state).toBe('downgraded');
		expect(after.failed_attempt_count).toBe(1);
	});

	it('retry within dunning_t0: self-loop bumps count, preserves dunning_started_at (S4)', () => {
		// S4: a failed retry within the same dunning state stays in that
		// state but increments the failure counter. The dunning_started_at
		// clock MUST NOT reset (S5 uses it for day-counting from the
		// original failure, not the latest retry).
		const original = new Date('2026-05-25T00:00:00Z');
		const before = {
			...seed('dunning_t0'),
			dunning_started_at: original,
			failed_attempt_count: 1
		};
		const after = transitionSubscription(before, 'dunning_t0', {
			reason: 'retry 2 failed — INSUFFICIENT_FUNDS'
		});
		expect(after.state).toBe('dunning_t0');
		expect(after.failed_attempt_count).toBe(2);
		expect(after.dunning_started_at).toEqual(original);
	});

	it('retry within dunning_grace: self-loop bumps count (S4)', () => {
		const before = { ...seed('dunning_grace'), failed_attempt_count: 3 };
		const after = transitionSubscription(before, 'dunning_grace', {
			reason: 'retry failed within dunning_grace'
		});
		expect(after.state).toBe('dunning_grace');
		expect(after.failed_attempt_count).toBe(4);
	});

	it('retry within dunning_final: self-loop bumps count (S4)', () => {
		const before = { ...seed('dunning_final'), failed_attempt_count: 5 };
		const after = transitionSubscription(before, 'dunning_final', {
			reason: 'retry failed within dunning_final'
		});
		expect(after.state).toBe('dunning_final');
		expect(after.failed_attempt_count).toBe(6);
	});

	it('dunning escalation: dunning_t0 → dunning_grace bumps count (used by S4 timing)', () => {
		const before = { ...seed('dunning_t0'), failed_attempt_count: 1 };
		const after = transitionSubscription(before, 'dunning_grace', {
			reason: 'retry 2 failed'
		});
		expect(after.state).toBe('dunning_grace');
		expect(after.failed_attempt_count).toBe(2);
	});

	it('mandate death during dunning: dunning_grace → downgraded bumps count one last time', () => {
		const before = { ...seed('dunning_grace'), failed_attempt_count: 2 };
		const after = transitionSubscription(before, 'downgraded', {
			reason: 'mandate revoked at bank'
		});
		expect(after.state).toBe('downgraded');
		expect(after.failed_attempt_count).toBe(3);
	});

	it('successful charge self-loop: active → active does NOT bump count', () => {
		// The increment is exclusively a FRESH-FAILURE side-effect. A
		// successful renewal must not pollute the counter.
		const before = { ...seed('active'), failed_attempt_count: 0 };
		const after = transitionSubscription(before, 'active', {
			reason: 'charge succeeded — cycle renewed'
		});
		expect(after.state).toBe('active');
		expect(after.failed_attempt_count).toBe(0);
	});

	it('cancel from active: active → cancelled does NOT bump count (not a failure)', () => {
		const before = { ...seed('active'), failed_attempt_count: 0 };
		const after = transitionSubscription(before, 'cancelled', {
			reason: 'cancel_at_cycle_end honored'
		});
		expect(after.state).toBe('cancelled');
		expect(after.failed_attempt_count).toBe(0);
	});

	it('retry succeeds: dunning_t0 → active clears dunning bookkeeping', () => {
		const before = {
			...seed('dunning_t0'),
			dunning_started_at: new Date('2026-05-20T00:00:00Z'),
			failed_attempt_count: 2
		};
		const after = transitionSubscription(before, 'active', {
			reason: 'retry succeeded'
		});
		expect(after.state).toBe('active');
		expect(after.dunning_started_at).toBeUndefined();
		expect(after.failed_attempt_count).toBe(0);
	});

	it('pause from active records paused_from_state = active', () => {
		const after = transitionSubscription(seed('active'), 'paused', {
			reason: 'DSA paused'
		});
		expect(after.state).toBe('paused');
		expect(after.paused_from_state).toBe('active');
	});

	it('pause from dunning_t0 preserves dunning state via paused_from_state', () => {
		const before = {
			...seed('dunning_t0'),
			dunning_started_at: new Date('2026-05-20T00:00:00Z'),
			failed_attempt_count: 1
		};
		const after = transitionSubscription(before, 'paused', {
			reason: 'DSA paused mid-dunning'
		});
		expect(after.state).toBe('paused');
		expect(after.paused_from_state).toBe('dunning_t0');
		// CRITICAL: dunning bookkeeping is NOT cleared on pause.
		// Resume restores from paused_from_state with the same clock.
		expect(after.dunning_started_at).toEqual(before.dunning_started_at);
		expect(after.failed_attempt_count).toBe(1);
	});

	it('resume from paused (was active) → active, clears paused_from_state', () => {
		const before = { ...seed('paused'), paused_from_state: 'active' as const };
		const after = transitionSubscription(before, 'active', { reason: 'DSA resumed' });
		expect(after.state).toBe('active');
		expect(after.paused_from_state).toBeUndefined();
	});

	it('resume from paused (was dunning_t0) → dunning_t0, clears paused_from_state', () => {
		const before = {
			...seed('paused'),
			paused_from_state: 'dunning_t0' as const,
			dunning_started_at: new Date('2026-05-20T00:00:00Z'),
			failed_attempt_count: 1
		};
		const after = transitionSubscription(before, 'dunning_t0', { reason: 'DSA resumed' });
		expect(after.state).toBe('dunning_t0');
		expect(after.paused_from_state).toBeUndefined();
		// dunning clock preserved across pause/resume per §11.2 #12
		expect(after.dunning_started_at).toEqual(before.dunning_started_at);
	});
});

// ── transitionSubscription throws on illegal ───────────────────

describe('transitionSubscription — illegal transitions throw', () => {
	it('not_subscribed → active throws IllegalSubscriptionTransitionError', () => {
		expect(() =>
			transitionSubscription(seed('not_subscribed'), 'active', { reason: 'test' })
		).toThrow(IllegalSubscriptionTransitionError);
	});

	it('downgraded → active throws (must re-mandate first)', () => {
		expect(() =>
			transitionSubscription(seed('downgraded'), 'active', { reason: 'test' })
		).toThrow(IllegalSubscriptionTransitionError);
	});

	it('illegal error message references the spec location', () => {
		try {
			transitionSubscription(seed('cancelled'), 'active', { reason: 'test' });
			throw new Error('should have thrown');
		} catch (err) {
			expect(err).toBeInstanceOf(IllegalSubscriptionTransitionError);
			expect((err as Error).message).toContain('§3.2.1');
		}
	});

	it('active → dunning_grace throws (must enter dunning at t0 first)', () => {
		expect(() =>
			transitionSubscription(seed('active'), 'dunning_grace', { reason: 'test' })
		).toThrow(IllegalSubscriptionTransitionError);
	});
});

// ── Idempotency ─────────────────────────────────────────────────

describe('transitionSubscription — idempotent option', () => {
	it('idempotent self-loop returns input unchanged', () => {
		const before = seed('active');
		const after = transitionSubscription(before, 'active', {
			reason: 'duplicate webhook',
			idempotent: true
		});
		// History should NOT have been appended on idempotent re-application.
		expect(after.state_history).toHaveLength(0);
		expect(after).toBe(before); // same reference
	});

	it('non-idempotent self-loop appends history (cycle renewal counts as an event)', () => {
		const before = seed('active');
		const after = transitionSubscription(before, 'active', {
			reason: 'charge.succeeded'
		});
		expect(after.state_history).toHaveLength(1);
	});
});

// ── legalTargetsFrom ────────────────────────────────────────────

describe('legalTargetsFrom', () => {
	it('from active returns all 5 reachable states', () => {
		const targets = legalTargetsFrom('active').sort();
		expect(targets).toEqual(['active', 'cancelled', 'downgraded', 'dunning_t0', 'paused']);
	});

	it('from not_subscribed returns only pending_mandate', () => {
		expect(legalTargetsFrom('not_subscribed')).toEqual(['pending_mandate']);
	});

	it('from cancelled returns only pending_mandate (re-subscribe path)', () => {
		expect(legalTargetsFrom('cancelled')).toEqual(['pending_mandate']);
	});

	it('from paused returns active + 3 dunning targets + cancelled', () => {
		const targets = legalTargetsFrom('paused').sort();
		expect(targets).toEqual([
			'active',
			'cancelled',
			'dunning_final',
			'dunning_grace',
			'dunning_t0'
		]);
	});
});

// ── makeFreshSubscription defaults ─────────────────────────────

describe('makeFreshSubscription', () => {
	it('initializes in not_subscribed with empty history + zero failed attempts', () => {
		const id = new ObjectId();
		const sub = makeFreshSubscription(id, 'pro', 599_800);
		expect(sub.dsa_id).toBe(id);
		expect(sub.state).toBe('not_subscribed');
		expect(sub.plan_id).toBe('pro');
		expect(sub.max_amount_paise).toBe(599_800);
		expect(sub.state_history).toEqual([]);
		expect(sub.failed_attempt_count).toBe(0);
		expect(sub.provider).toBe('razorpay');
		expect(sub.created_at).toBeInstanceOf(Date);
		expect(sub.updated_at).toBeInstanceOf(Date);
	});

	it('accepts provider override (for mock-based tests)', () => {
		const sub = makeFreshSubscription(new ObjectId(), 'basic', 149_850, 'mock');
		expect(sub.provider).toBe('mock');
	});
});
