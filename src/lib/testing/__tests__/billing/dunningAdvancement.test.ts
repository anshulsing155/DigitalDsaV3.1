/**
 * D.1 S5 M1 — Dunning advancement math (pure)
 * ══════════════════════════════════════════════════════════════════
 * Pins the day-N escalation contract from spec §4 S5:
 *
 *   dunning_t0    + 3 days → dunning_grace
 *   dunning_grace + 7 days → dunning_final
 *   dunning_final + 8 days → downgraded
 *
 * Day-N rule: floor((now - dunning_started_at) / 24h). All thresholds
 * count from the ORIGINAL dunning_started_at, not the most recent
 * transition (per spec — dunning_started_at survives retries).
 *
 * These tests run against a frozen `now` so the boundaries are exact.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import {
	daysSinceFirstFailure,
	computeDunningAdvancement,
	DUNNING_ADVANCE_THRESHOLDS,
	DUNNING_ADVANCE_TARGETS
} from '$lib/server/billing/dunningEngine';

// ── daysSinceFirstFailure ───────────────────────────────────────────

describe('daysSinceFirstFailure', () => {
	const FAILURE_AT = new Date('2026-06-01T09:30:00.000Z'); // 15:00 IST

	it('returns 0 for same-millisecond input', () => {
		expect(daysSinceFirstFailure(FAILURE_AT, FAILURE_AT)).toBe(0);
	});

	it('returns 0 when now < failure time (defensive against clock skew)', () => {
		const earlier = new Date(FAILURE_AT.getTime() - 60_000); // 1 min before
		expect(daysSinceFirstFailure(FAILURE_AT, earlier)).toBe(0);
	});

	it('returns 0 at 23h 59m 59s elapsed (just under one day)', () => {
		const almostADay = new Date(FAILURE_AT.getTime() + 24 * 3600 * 1000 - 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, almostADay)).toBe(0);
	});

	it('returns 1 at exactly 24h elapsed', () => {
		const oneDay = new Date(FAILURE_AT.getTime() + 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, oneDay)).toBe(1);
	});

	it('returns 3 at 3 days exact', () => {
		const threeDays = new Date(FAILURE_AT.getTime() + 3 * 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, threeDays)).toBe(3);
	});

	it('returns 7 at 7 days exact', () => {
		const sevenDays = new Date(FAILURE_AT.getTime() + 7 * 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, sevenDays)).toBe(7);
	});

	it('returns 8 at 8 days exact (downgrade threshold)', () => {
		const eightDays = new Date(FAILURE_AT.getTime() + 8 * 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, eightDays)).toBe(8);
	});

	it('returns 30 at 30 days (terminal state stays computable, not capped)', () => {
		const thirtyDays = new Date(FAILURE_AT.getTime() + 30 * 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(FAILURE_AT, thirtyDays)).toBe(30);
	});

	it('is timezone-invariant: identical result whether boundary straddles IST midnight or not', () => {
		// Failure at 23:00 IST on Jan 5 (= 17:30 UTC Jan 5)
		const failureIST23 = new Date('2026-01-05T17:30:00.000Z');
		// Now at 01:00 IST on Jan 6 (= 19:30 UTC Jan 5) — crossed IST midnight,
		// only 2 elapsed hours. Spec formula = floor(2h / 24h) = 0.
		const nowIST01NextDay = new Date('2026-01-05T19:30:00.000Z');
		expect(daysSinceFirstFailure(failureIST23, nowIST01NextDay)).toBe(0);
		// 24h later: should be 1 regardless of which calendar day it lands on in IST.
		const plus24h = new Date(failureIST23.getTime() + 24 * 3600 * 1000);
		expect(daysSinceFirstFailure(failureIST23, plus24h)).toBe(1);
	});

	it('handles Feb 28 → Mar 1 boundary unchanged (no DST in IST, no leap-day quirks)', () => {
		// 2026 is NOT a leap year (Feb has 28 days).
		const feb28 = new Date('2026-02-28T12:00:00.000Z');
		const mar3 = new Date('2026-03-03T12:00:00.000Z');
		expect(daysSinceFirstFailure(feb28, mar3)).toBe(3);
	});
});

// ── computeDunningAdvancement ──────────────────────────────────────

describe('computeDunningAdvancement', () => {
	const FAILURE_AT = new Date('2026-06-01T09:30:00.000Z');

	// Helper: now = FAILURE_AT + N days exactly.
	const nowAt = (days: number) =>
		new Date(FAILURE_AT.getTime() + days * 24 * 3600 * 1000);

	describe('non-dunning states are no-ops', () => {
		it('returns null for active', () => {
			expect(computeDunningAdvancement('active', FAILURE_AT, nowAt(30))).toBeNull();
		});
		it('returns null for paused', () => {
			expect(computeDunningAdvancement('paused', FAILURE_AT, nowAt(30))).toBeNull();
		});
		it('returns null for downgraded (terminal — engine never re-acts)', () => {
			expect(computeDunningAdvancement('downgraded', FAILURE_AT, nowAt(30))).toBeNull();
		});
		it('returns null for cancelled', () => {
			expect(computeDunningAdvancement('cancelled', FAILURE_AT, nowAt(30))).toBeNull();
		});
		it('returns null for not_subscribed', () => {
			expect(computeDunningAdvancement('not_subscribed', FAILURE_AT, nowAt(30))).toBeNull();
		});
		it('returns null for pending_mandate', () => {
			expect(computeDunningAdvancement('pending_mandate', FAILURE_AT, nowAt(30))).toBeNull();
		});
	});

	describe('missing dunning_started_at is a no-op (data integrity check)', () => {
		it('returns null when dunning_started_at is undefined', () => {
			expect(computeDunningAdvancement('dunning_t0', undefined, nowAt(30))).toBeNull();
		});
	});

	describe('dunning_t0 → dunning_grace at day 3', () => {
		it('no advancement at day 0', () => {
			expect(computeDunningAdvancement('dunning_t0', FAILURE_AT, nowAt(0))).toBeNull();
		});
		it('no advancement at day 2', () => {
			expect(computeDunningAdvancement('dunning_t0', FAILURE_AT, nowAt(2))).toBeNull();
		});
		it('no advancement at 2d 23h 59m', () => {
			const justBefore = new Date(FAILURE_AT.getTime() + (3 * 24 * 3600 - 1) * 1000);
			expect(computeDunningAdvancement('dunning_t0', FAILURE_AT, justBefore)).toBeNull();
		});
		it('escalates to dunning_grace at exactly day 3', () => {
			const advancement = computeDunningAdvancement('dunning_t0', FAILURE_AT, nowAt(3));
			expect(advancement).toEqual({
				nextState: 'dunning_grace',
				emailKind: 'dunning_grace',
				daysSinceFailure: 3
			});
		});
		it('still escalates at day 6 (caller may have lagged behind cron schedule)', () => {
			const advancement = computeDunningAdvancement('dunning_t0', FAILURE_AT, nowAt(6));
			expect(advancement?.nextState).toBe('dunning_grace');
			expect(advancement?.daysSinceFailure).toBe(6);
		});
	});

	describe('dunning_grace → dunning_final at day 7', () => {
		it('no advancement at day 6', () => {
			expect(computeDunningAdvancement('dunning_grace', FAILURE_AT, nowAt(6))).toBeNull();
		});
		it('escalates to dunning_final at exactly day 7', () => {
			const advancement = computeDunningAdvancement('dunning_grace', FAILURE_AT, nowAt(7));
			expect(advancement).toEqual({
				nextState: 'dunning_final',
				emailKind: 'dunning_final',
				daysSinceFailure: 7
			});
		});
	});

	describe('dunning_final → downgraded at day 8', () => {
		it('no advancement at day 7', () => {
			expect(computeDunningAdvancement('dunning_final', FAILURE_AT, nowAt(7))).toBeNull();
		});
		it('downgrades at exactly day 8', () => {
			const advancement = computeDunningAdvancement('dunning_final', FAILURE_AT, nowAt(8));
			expect(advancement).toEqual({
				nextState: 'downgraded',
				emailKind: 'downgraded',
				daysSinceFailure: 8
			});
		});
		it('downgrades at day 15 (cron lagged by a week, same result)', () => {
			const advancement = computeDunningAdvancement('dunning_final', FAILURE_AT, nowAt(15));
			expect(advancement?.nextState).toBe('downgraded');
			expect(advancement?.daysSinceFailure).toBe(15);
		});
	});

	describe('threshold lookup tables match spec values', () => {
		it('DUNNING_ADVANCE_THRESHOLDS pins exact spec values', () => {
			expect(DUNNING_ADVANCE_THRESHOLDS.dunning_t0).toBe(3);
			expect(DUNNING_ADVANCE_THRESHOLDS.dunning_grace).toBe(7);
			expect(DUNNING_ADVANCE_THRESHOLDS.dunning_final).toBe(8);
		});
		it('DUNNING_ADVANCE_TARGETS forms a complete escalation chain', () => {
			expect(DUNNING_ADVANCE_TARGETS.dunning_t0).toBe('dunning_grace');
			expect(DUNNING_ADVANCE_TARGETS.dunning_grace).toBe('dunning_final');
			expect(DUNNING_ADVANCE_TARGETS.dunning_final).toBe('downgraded');
		});
	});
});
