/**
 * Anti-Scraping System — Unit Tests
 * ══════════════════════════════════════════════════════════════════
 * Tests for pure functions in the anti-scraping security layer:
 * - validatePageAccess (skip-ahead prevention)
 * - getTrustMultiplier (rate limit brackets)
 * - TRUST_DELTAS / TRUST_THRESHOLDS (constant snapshots)
 * - checkRateLimit (in-memory sliding window)
 * - encodeSessionFingerprint / deterministicShuffle (response fingerprinting)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validatePageAccess } from '$lib/server/formSession';
import {
	getTrustMultiplier,
	TRUST_DELTAS,
	TRUST_THRESHOLDS,
	MAX_ACTIVE_SESSIONS,
	BASE_RATE_LIMIT_PER_MIN,
	MAX_EVALUATIONS_PER_SESSION,
	MAX_SAME_PAGE_REQUESTS
} from '$lib/types/formSession';
import type { FormSession, TrustEventType } from '$lib/types/formSession';
import { checkRateLimit, rateLimits } from '$lib/server/formGuard';
import {
	encodeSessionFingerprint,
	deterministicShuffle,
	ZWC_ZERO,
	ZWC_ONE
} from '$lib/server/formEngine/engine';

// ════════════════════════════════════════════════════════════════
// Helper: create a minimal FormSession for testing
// ════════════════════════════════════════════════════════════════

function makeSession(overrides: Partial<FormSession> = {}): FormSession {
	return {
		userId: 'user-1',
		loanType: 'Home Loan',
		sessionId: 'test-session-id',
		maxPageReached: 0,
		pageTimings: [],
		behaviorLog: [],
		totalRequestCount: 0,
		isActive: true,
		isSubmitted: false,
		isFlagged: false,
		startedAt: new Date(),
		lastActivityAt: new Date(),
		...overrides
	};
}

// ════════════════════════════════════════════════════════════════
// 1. validatePageAccess — skip-ahead prevention
// ════════════════════════════════════════════════════════════════

describe('validatePageAccess', () => {
	it('allows page 0 when maxPageReached is 0', () => {
		const session = makeSession({ maxPageReached: 0 });
		expect(validatePageAccess(session, 0)).toEqual({ valid: true });
	});

	it('allows the next page (maxPageReached + 1)', () => {
		const session = makeSession({ maxPageReached: 3 });
		expect(validatePageAccess(session, 4)).toEqual({ valid: true });
	});

	it('allows going back to any earlier page', () => {
		const session = makeSession({ maxPageReached: 5 });
		expect(validatePageAccess(session, 0)).toEqual({ valid: true });
		expect(validatePageAccess(session, 2)).toEqual({ valid: true });
		expect(validatePageAccess(session, 5)).toEqual({ valid: true });
	});

	it('rejects skip-ahead beyond maxPageReached + 1', () => {
		const session = makeSession({ maxPageReached: 3 });
		const result = validatePageAccess(session, 5);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('Skip-ahead rejected');
		expect(result.reason).toContain('page 5');
		expect(result.reason).toContain('max reached is 3');
	});

	it('rejects skip-ahead by 2 pages', () => {
		const session = makeSession({ maxPageReached: 0 });
		const result = validatePageAccess(session, 2);
		expect(result.valid).toBe(false);
	});

	it('allows exactly maxPageReached', () => {
		const session = makeSession({ maxPageReached: 7 });
		expect(validatePageAccess(session, 7)).toEqual({ valid: true });
	});

	it('handles large page numbers', () => {
		const session = makeSession({ maxPageReached: 100 });
		expect(validatePageAccess(session, 101)).toEqual({ valid: true });
		expect(validatePageAccess(session, 102).valid).toBe(false);
	});
});

// ════════════════════════════════════════════════════════════════
// 2. getTrustMultiplier — rate limit brackets
// ════════════════════════════════════════════════════════════════

describe('getTrustMultiplier', () => {
	it('returns 1.0 for score >= 70', () => {
		expect(getTrustMultiplier(70)).toBe(1.0);
		expect(getTrustMultiplier(100)).toBe(1.0);
		expect(getTrustMultiplier(85)).toBe(1.0);
	});

	it('returns 0.75 for score >= 50 and < 70', () => {
		expect(getTrustMultiplier(50)).toBe(0.75);
		expect(getTrustMultiplier(69)).toBe(0.75);
		expect(getTrustMultiplier(55)).toBe(0.75);
	});

	it('returns 0.5 for score >= 30 and < 50', () => {
		expect(getTrustMultiplier(30)).toBe(0.5);
		expect(getTrustMultiplier(49)).toBe(0.5);
		expect(getTrustMultiplier(35)).toBe(0.5);
	});

	it('returns 0.25 for score < 30', () => {
		expect(getTrustMultiplier(29)).toBe(0.25);
		expect(getTrustMultiplier(0)).toBe(0.25);
		expect(getTrustMultiplier(15)).toBe(0.25);
		expect(getTrustMultiplier(5)).toBe(0.25);
	});

	it('handles exact boundary values', () => {
		expect(getTrustMultiplier(70)).toBe(1.0); // boundary: >= 70
		expect(getTrustMultiplier(69)).toBe(0.75); // just below
		expect(getTrustMultiplier(50)).toBe(0.75); // boundary: >= 50
		expect(getTrustMultiplier(49)).toBe(0.5); // just below
		expect(getTrustMultiplier(30)).toBe(0.5); // boundary: >= 30
		expect(getTrustMultiplier(29)).toBe(0.25); // just below
	});
});

// ════════════════════════════════════════════════════════════════
// 3. TRUST_DELTAS / TRUST_THRESHOLDS — constant snapshots
// ════════════════════════════════════════════════════════════════

describe('TRUST_DELTAS', () => {
	it('has correct penalty values for suspicious events', () => {
		expect(TRUST_DELTAS.fast_completion).toBe(-10);
		expect(TRUST_DELTAS.missing_behavior).toBe(-5);
		expect(TRUST_DELTAS.rate_limit_hit).toBe(-15);
		expect(TRUST_DELTAS.skip_ahead).toBe(-20);
		expect(TRUST_DELTAS.sustained_burst).toBe(-10);
		expect(TRUST_DELTAS.honeypot_triggered).toBe(-50);
		expect(TRUST_DELTAS.session_budget_exceeded).toBe(-15);
		expect(TRUST_DELTAS.repeat_page).toBe(-5);
	});

	it('has correct reward values for normal behavior', () => {
		expect(TRUST_DELTAS.normal_behavior).toBe(1);
		expect(TRUST_DELTAS.normal_completion).toBe(2);
		expect(TRUST_DELTAS.successful_submit).toBe(10);
	});

	it('covers all TrustEventType values', () => {
		const expectedEvents: TrustEventType[] = [
			'fast_completion',
			'missing_behavior',
			'rate_limit_hit',
			'skip_ahead',
			'sustained_burst',
			'honeypot_triggered',
			'session_budget_exceeded',
			'repeat_page',
			'normal_behavior',
			'normal_completion',
			'successful_submit'
		];
		expect(Object.keys(TRUST_DELTAS).sort()).toEqual(expectedEvents.sort());
	});

	it('has all penalties as negative and all rewards as positive', () => {
		const penalties = [
			'fast_completion',
			'missing_behavior',
			'rate_limit_hit',
			'skip_ahead',
			'sustained_burst',
			'honeypot_triggered',
			'session_budget_exceeded',
			'repeat_page'
		] as TrustEventType[];
		const rewards = [
			'normal_behavior',
			'normal_completion',
			'successful_submit'
		] as TrustEventType[];

		for (const p of penalties) {
			expect(TRUST_DELTAS[p]).toBeLessThan(0);
		}
		for (const r of rewards) {
			expect(TRUST_DELTAS[r]).toBeGreaterThan(0);
		}
	});

	it('honeypot is the harshest penalty', () => {
		const penalties = Object.values(TRUST_DELTAS).filter((v) => v < 0);
		const minPenalty = Math.min(...penalties);
		expect(TRUST_DELTAS.honeypot_triggered).toBe(minPenalty);
	});
});

describe('TRUST_THRESHOLDS', () => {
	it('has correct threshold values', () => {
		expect(TRUST_THRESHOLDS.WATCHLIST).toBe(30);
		expect(TRUST_THRESHOLDS.SUSPEND).toBe(15);
		expect(TRUST_THRESHOLDS.BLOCK).toBe(5);
		expect(TRUST_THRESHOLDS.INITIAL_SCORE).toBe(50);
		expect(TRUST_THRESHOLDS.MAX_SCORE).toBe(100);
	});

	it('thresholds are ordered correctly (BLOCK < SUSPEND < WATCHLIST < INITIAL < MAX)', () => {
		expect(TRUST_THRESHOLDS.BLOCK).toBeLessThan(TRUST_THRESHOLDS.SUSPEND);
		expect(TRUST_THRESHOLDS.SUSPEND).toBeLessThan(TRUST_THRESHOLDS.WATCHLIST);
		expect(TRUST_THRESHOLDS.WATCHLIST).toBeLessThan(TRUST_THRESHOLDS.INITIAL_SCORE);
		expect(TRUST_THRESHOLDS.INITIAL_SCORE).toBeLessThan(TRUST_THRESHOLDS.MAX_SCORE);
	});
});

describe('System constants', () => {
	it('MAX_ACTIVE_SESSIONS is 5', () => {
		expect(MAX_ACTIVE_SESSIONS).toBe(5);
	});

	it('BASE_RATE_LIMIT_PER_MIN is 30', () => {
		expect(BASE_RATE_LIMIT_PER_MIN).toBe(30);
	});

	it('MAX_EVALUATIONS_PER_SESSION is 150', () => {
		expect(MAX_EVALUATIONS_PER_SESSION).toBe(150);
	});

	it('MAX_SAME_PAGE_REQUESTS is 8', () => {
		expect(MAX_SAME_PAGE_REQUESTS).toBe(8);
	});
});

// ════════════════════════════════════════════════════════════════
// 4. checkRateLimit — in-memory sliding window
// ════════════════════════════════════════════════════════════════

describe('checkRateLimit', () => {
	beforeEach(() => {
		rateLimits.clear();
	});

	it('allows first request for a new user', () => {
		expect(checkRateLimit('user-1', 60)).toBe(true);
	});

	it('allows requests up to the limit', () => {
		for (let i = 0; i < 60; i++) {
			expect(checkRateLimit('user-1', 60)).toBe(true);
		}
	});

	it('blocks request when limit is exceeded', () => {
		for (let i = 0; i < 60; i++) {
			checkRateLimit('user-1', 60);
		}
		// 61st request should be blocked
		expect(checkRateLimit('user-1', 60)).toBe(false);
	});

	it('tracks users independently', () => {
		// Fill up user-1
		for (let i = 0; i < 10; i++) {
			checkRateLimit('user-1', 10);
		}
		expect(checkRateLimit('user-1', 10)).toBe(false);

		// user-2 should still be allowed
		expect(checkRateLimit('user-2', 10)).toBe(true);
	});

	it('resets after window expires (simulated)', () => {
		// Fill up the limit
		for (let i = 0; i < 5; i++) {
			checkRateLimit('user-1', 5);
		}
		expect(checkRateLimit('user-1', 5)).toBe(false);

		// Simulate window expiry by backdating the entry
		const entry = rateLimits.get('user-1');
		if (entry) {
			entry.windowStart = Date.now() - 61_000; // 61 seconds ago
		}

		// Should be allowed again (new window)
		expect(checkRateLimit('user-1', 5)).toBe(true);
	});

	it('works with adaptive limits (trust-based)', () => {
		// High trust: 60 * 1.0 = 60
		for (let i = 0; i < 60; i++) {
			expect(checkRateLimit('trusted-user', 60)).toBe(true);
		}
		expect(checkRateLimit('trusted-user', 60)).toBe(false);

		// Low trust: 60 * 0.25 = 15
		for (let i = 0; i < 15; i++) {
			expect(checkRateLimit('suspicious-user', 15)).toBe(true);
		}
		expect(checkRateLimit('suspicious-user', 15)).toBe(false);
	});

	it('handles limit of 1', () => {
		expect(checkRateLimit('user-1', 1)).toBe(true);
		expect(checkRateLimit('user-1', 1)).toBe(false);
	});
});

// ════════════════════════════════════════════════════════════════
// 5. encodeSessionFingerprint — zero-width character encoding
// ════════════════════════════════════════════════════════════════

describe('encodeSessionFingerprint', () => {
	it('produces only zero-width characters', () => {
		const result = encodeSessionFingerprint('abcdefgh');
		for (const ch of result) {
			expect([ZWC_ZERO, ZWC_ONE]).toContain(ch);
		}
	});

	it('encodes 8 chars to exactly 64 zero-width chars (8×8 bits)', () => {
		const result = encodeSessionFingerprint('12345678');
		expect(result.length).toBe(64);
	});

	it('encodes fewer than 8 chars proportionally', () => {
		const result = encodeSessionFingerprint('abc');
		expect(result.length).toBe(24); // 3 chars × 8 bits
	});

	it('truncates to first 8 chars for longer sessionIds', () => {
		const result8 = encodeSessionFingerprint('abcdefgh');
		const resultLong = encodeSessionFingerprint('abcdefghijklmnop');
		expect(result8).toBe(resultLong);
	});

	it('produces different output for different inputs', () => {
		const a = encodeSessionFingerprint('abcd1234');
		const b = encodeSessionFingerprint('wxyz9876');
		expect(a).not.toBe(b);
	});

	it('is deterministic (same input → same output)', () => {
		const first = encodeSessionFingerprint('test1234');
		const second = encodeSessionFingerprint('test1234');
		expect(first).toBe(second);
	});

	it('encodes known character correctly', () => {
		// 'A' = 0x41 = 01000001 in binary
		const result = encodeSessionFingerprint('A');
		expect(result.length).toBe(8);
		const bits = result
			.split('')
			.map((ch) => (ch === ZWC_ONE ? '1' : '0'))
			.join('');
		expect(bits).toBe('01000001');
	});

	it('handles empty string', () => {
		const result = encodeSessionFingerprint('');
		expect(result).toBe('');
	});
});

// ════════════════════════════════════════════════════════════════
// 6. deterministicShuffle — seeded Fisher-Yates
// ════════════════════════════════════════════════════════════════

describe('deterministicShuffle', () => {
	it('returns same-length array', () => {
		const input = [1, 2, 3, 4, 5];
		const result = deterministicShuffle(input, 'seed-1');
		expect(result.length).toBe(input.length);
	});

	it('contains all original elements', () => {
		const input = ['a', 'b', 'c', 'd', 'e'];
		const result = deterministicShuffle(input, 'seed-1');
		expect(result.sort()).toEqual(input.sort());
	});

	it('does not modify the original array', () => {
		const input = [1, 2, 3, 4, 5];
		const copy = [...input];
		deterministicShuffle(input, 'seed-1');
		expect(input).toEqual(copy);
	});

	it('is deterministic (same seed → same order)', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const first = deterministicShuffle(input, 'consistent-seed');
		const second = deterministicShuffle(input, 'consistent-seed');
		expect(first).toEqual(second);
	});

	it('produces different order for different seeds', () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const a = deterministicShuffle(input, 'seed-alpha');
		const b = deterministicShuffle(input, 'seed-beta');
		// With 10 elements, probability of same order is ~1/3.6M
		expect(a).not.toEqual(b);
	});

	it('returns single-element array unchanged', () => {
		expect(deterministicShuffle([42], 'any-seed')).toEqual([42]);
	});

	it('returns empty array unchanged', () => {
		expect(deterministicShuffle([], 'any-seed')).toEqual([]);
	});

	it('works with objects', () => {
		const input = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
		const result = deterministicShuffle(input, 'obj-seed');
		expect(result.length).toBe(3);
		expect(result.map((x) => x.id).sort()).toEqual(['q1', 'q2', 'q3']);
	});

	it('uses seed + page id pattern for per-page shuffling', () => {
		const questions = ['q1', 'q2', 'q3', 'q4', 'q5'];
		const sessionId = 'abc-123';
		const page1 = deterministicShuffle(questions, sessionId + 'page1');
		const page2 = deterministicShuffle(questions, sessionId + 'page2');
		// Different pages get different orders
		expect(page1).not.toEqual(page2);
	});
});
