/**
 * previousMonthlyAnchor — calendar-month subtraction with day-overflow snap
 * ══════════════════════════════════════════════════════════════════
 * Locks the date math driving the sidebar quota pill "5 May 26 - 4 Jun 26".
 *
 * Pre-fix code used a fixed 30-day subtraction (`getTime() - 30 * 86400 * 1000`)
 * which drifts on every month that isn't 30 days long. Visible to every DSA
 * on every page load. Review finding M-N2, 2026-05-30.
 *
 * Real billing anchors stay on a stable day-of-month per Razorpay subscription
 * semantics, capped to last-day-of-month when the source day doesn't exist
 * (Feb 31 → Feb 28/29). The helper mirrors that semantic so display matches
 * what the charge engine actually does.
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { previousMonthlyAnchor } from '$lib/server/billing/quotaState';

/** Construct a UTC Date from y/m/d (1-indexed month for readability). */
function utc(y: number, mOneIndexed: number, d: number): Date {
	return new Date(Date.UTC(y, mOneIndexed - 1, d, 10, 0, 0, 0));
}

describe('previousMonthlyAnchor — typical mid-month cases', () => {
	it('Mar 15 → Feb 15 (same day, prior month)', () => {
		const result = previousMonthlyAnchor(utc(2026, 3, 15));
		expect(result.toISOString().slice(0, 10)).toBe('2026-02-15');
	});

	it('Jun 10 → May 10', () => {
		const result = previousMonthlyAnchor(utc(2026, 6, 10));
		expect(result.toISOString().slice(0, 10)).toBe('2026-05-10');
	});

	it('preserves the time-of-day portion of the source anchor', () => {
		const source = utc(2026, 4, 15);
		const result = previousMonthlyAnchor(source);
		expect(result.getUTCHours()).toBe(source.getUTCHours());
		expect(result.getUTCMinutes()).toBe(source.getUTCMinutes());
	});
});

describe('previousMonthlyAnchor — day-overflow snap to last-day-of-prior-month', () => {
	it('Mar 31 → Feb 28 in non-leap year (Feb has only 28 days)', () => {
		const result = previousMonthlyAnchor(utc(2026, 3, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2026-02-28');
	});

	it('Mar 31 → Feb 29 in leap year', () => {
		// 2024 is a leap year (divisible by 4, not by 100).
		const result = previousMonthlyAnchor(utc(2024, 3, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2024-02-29');
	});

	it('May 31 → Apr 30 (April has 30 days)', () => {
		const result = previousMonthlyAnchor(utc(2026, 5, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2026-04-30');
	});

	it('Jul 31 → Jun 30 (June has 30 days)', () => {
		const result = previousMonthlyAnchor(utc(2026, 7, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2026-06-30');
	});

	it('Oct 31 → Sep 30 (September has 30 days)', () => {
		const result = previousMonthlyAnchor(utc(2026, 10, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2026-09-30');
	});

	it('Jul 31 → Jun 30 (does NOT bleed into Jul 1 via JS day-overflow normalization)', () => {
		// Regression guard: naive setUTCMonth(month - 1) without the day-1
		// pre-shift would normalize Jun 31 → Jul 1. Verify we're not in that
		// failure mode.
		const result = previousMonthlyAnchor(utc(2026, 7, 31));
		expect(result.getUTCMonth()).toBe(5); // June = month index 5 (0-indexed)
		expect(result.getUTCDate()).toBe(30);
	});
});

describe('previousMonthlyAnchor — year boundary', () => {
	it('Jan 5 → Dec 5 of the prior year', () => {
		const result = previousMonthlyAnchor(utc(2026, 1, 5));
		expect(result.toISOString().slice(0, 10)).toBe('2025-12-05');
	});

	it('Jan 31 → Dec 31 of the prior year (no overflow, December has 31 days)', () => {
		const result = previousMonthlyAnchor(utc(2026, 1, 31));
		expect(result.toISOString().slice(0, 10)).toBe('2025-12-31');
	});

	it('Mar 31 of leap year → Feb 29 of leap year (year unchanged)', () => {
		const result = previousMonthlyAnchor(utc(2024, 3, 31));
		expect(result.getUTCFullYear()).toBe(2024);
	});

	it('Jan 1 → Dec 1 of prior year', () => {
		const result = previousMonthlyAnchor(utc(2026, 1, 1));
		expect(result.toISOString().slice(0, 10)).toBe('2025-12-01');
	});
});

describe('previousMonthlyAnchor — regression against the 30-day-subtraction bug', () => {
	it('Mar 5 → Feb 5 (calendar), NOT Feb 3 (which 30-day subtraction gave)', () => {
		// March has 31 days, so 30 days before Mar 5 lands on Feb 3 — visibly
		// wrong to the DSA. Calendar subtraction stays on the 5th.
		const result = previousMonthlyAnchor(utc(2026, 3, 5));
		expect(result.toISOString().slice(0, 10)).toBe('2026-02-05');
		expect(result.toISOString().slice(0, 10)).not.toBe('2026-02-03');
	});

	it('May 15 → Apr 15 (calendar), NOT Apr 15 by accident', () => {
		// April has 30 days, so 30-day subtraction would accidentally land
		// on Apr 15 too — agreement on a 30-day month is luck, not correctness.
		// This test makes sure we ALSO land on Apr 15 (the right way).
		const result = previousMonthlyAnchor(utc(2026, 5, 15));
		expect(result.toISOString().slice(0, 10)).toBe('2026-04-15');
	});
});
