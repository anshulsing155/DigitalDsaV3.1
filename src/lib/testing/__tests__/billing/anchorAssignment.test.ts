/**
 * D.1 S1 — Anchor assignment + cycle math tests
 * ══════════════════════════════════════════════════════════════════
 * Covers §11 Q2 owner decision: 6 concentrated anchors (1/5/10/15/20/25)
 * with 1-6 day free-access window on subscribe.
 *
 * Edge cases worth getting right (would silently mis-bill DSAs):
 *   - Same-day-as-anchor rolls forward (never bill on subscribe day)
 *   - Past-the-25th wraps to next month's 1st
 *   - Anchor 25 → 25 month-to-month works even for February (25 ≤ 28)
 *   - IST day-of-month correct around UTC midnight (DSA in IST timezone)
 * ══════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from 'vitest';
import {
	ANCHOR_DAYS,
	anchorDayOf,
	assignAnchor,
	daysUntilFirstCharge,
	firstChargeAtForSubscribe,
	isValidAnchorDay,
	istDayOfMonth,
	istMidnight,
	isWithinPreChargeReminderWindow,
	nextChargeAtForAnchor
} from '$lib/server/billing/anchorAssignment';

/**
 * Helper: build a Date corresponding to a specific IST wall-clock time.
 * Express IST midnight via the istMidnight helper, then add hours.
 */
function ist(year: number, month: number, day: number, hours = 0, minutes = 0): Date {
	return new Date(
		istMidnight(year, month, day).getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000
	);
}

// ── ANCHOR_DAYS constant ────────────────────────────────────────

describe('ANCHOR_DAYS', () => {
	it('is exactly [1, 5, 10, 15, 20, 25]', () => {
		expect(ANCHOR_DAYS).toEqual([1, 5, 10, 15, 20, 25]);
	});

	it('isValidAnchorDay narrows correctly', () => {
		expect(isValidAnchorDay(1)).toBe(true);
		expect(isValidAnchorDay(5)).toBe(true);
		expect(isValidAnchorDay(25)).toBe(true);
		expect(isValidAnchorDay(7)).toBe(false);
		expect(isValidAnchorDay(28)).toBe(false);
		expect(isValidAnchorDay(0)).toBe(false);
	});
});

// ── IST date helpers ────────────────────────────────────────────

describe('istDayOfMonth + istMidnight', () => {
	it('istMidnight produces a Date at 00:00 IST', () => {
		const d = istMidnight(2026, 0, 15); // Jan 15 2026 in IST
		// 00:00 IST = 18:30 UTC the prior day
		expect(d.getUTCDate()).toBe(14);
		expect(d.getUTCHours()).toBe(18);
		expect(d.getUTCMinutes()).toBe(30);
	});

	it('istDayOfMonth handles UTC-midnight edge case (still in IST yesterday)', () => {
		// Jan 15 at 02:00 UTC = Jan 15 07:30 IST — still IST Jan 15
		const morningUtc = new Date(Date.UTC(2026, 0, 15, 2, 0, 0));
		expect(istDayOfMonth(morningUtc)).toBe(15);
	});

	it('istDayOfMonth on UTC late evening rolls to next IST day', () => {
		// Jan 14 at 19:00 UTC = Jan 15 00:30 IST — IST Jan 15
		const lateUtc = new Date(Date.UTC(2026, 0, 14, 19, 0, 0));
		expect(istDayOfMonth(lateUtc)).toBe(15);
	});
});

// ── assignAnchor ────────────────────────────────────────────────

describe('assignAnchor — nearest future anchor', () => {
	it('Jan 1 IST → 5 (4 days gifted)', () => {
		expect(assignAnchor(ist(2026, 0, 1))).toBe(5);
	});

	it('Jan 4 IST → 5 (1 day gifted)', () => {
		expect(assignAnchor(ist(2026, 0, 4))).toBe(5);
	});

	it('Jan 5 IST → 10 (same-day-as-anchor rolls forward; never bill today)', () => {
		expect(assignAnchor(ist(2026, 0, 5))).toBe(10);
	});

	it('Jan 12 IST → 15', () => {
		expect(assignAnchor(ist(2026, 0, 12))).toBe(15);
	});

	it('Jan 22 IST → 25', () => {
		expect(assignAnchor(ist(2026, 0, 22))).toBe(25);
	});

	it('Jan 25 IST → 1 (rolls to next month)', () => {
		expect(assignAnchor(ist(2026, 0, 25))).toBe(1);
	});

	it('Jan 26 IST → 1 (next month, 6 days gifted)', () => {
		expect(assignAnchor(ist(2026, 0, 26))).toBe(1);
	});

	it('Jan 31 IST → 1 (next month, 1 day gifted)', () => {
		expect(assignAnchor(ist(2026, 0, 31))).toBe(1);
	});

	it('Feb 26 IST → 1 (Mar 1, 3 days gifted — Feb has 28d)', () => {
		expect(assignAnchor(ist(2026, 1, 26))).toBe(1);
	});

	it('handles late-evening UTC that rolls to next IST day', () => {
		// Jan 4 22:00 UTC = Jan 5 03:30 IST — assignAnchor should see "Jan 5" → 10
		const lateUtc = new Date(Date.UTC(2026, 0, 4, 22, 0, 0));
		expect(assignAnchor(lateUtc)).toBe(10);
	});
});

// ── firstChargeAtForSubscribe ──────────────────────────────────

describe('firstChargeAtForSubscribe', () => {
	it('Jan 12 IST → Jan 15 IST midnight', () => {
		const result = firstChargeAtForSubscribe(ist(2026, 0, 12));
		expect(result).toEqual(istMidnight(2026, 0, 15));
	});

	it('Jan 31 IST → Feb 1 IST midnight (cross-month wrap)', () => {
		const result = firstChargeAtForSubscribe(ist(2026, 0, 31));
		expect(result).toEqual(istMidnight(2026, 1, 1));
	});

	it('Feb 22 IST → Feb 25 IST midnight (no wrap)', () => {
		const result = firstChargeAtForSubscribe(ist(2026, 1, 22));
		expect(result).toEqual(istMidnight(2026, 1, 25));
	});

	it('Dec 26 IST → Jan 1 NEXT YEAR midnight (year wrap)', () => {
		const result = firstChargeAtForSubscribe(ist(2026, 11, 26));
		expect(result).toEqual(istMidnight(2027, 0, 1));
	});
});

// ── nextChargeAtForAnchor (month-to-month roll) ────────────────

describe('nextChargeAtForAnchor', () => {
	it('Jan 15 + anchor 15 → Feb 15', () => {
		const next = nextChargeAtForAnchor(istMidnight(2026, 0, 15), 15);
		expect(next).toEqual(istMidnight(2026, 1, 15));
	});

	it('Jan 25 + anchor 25 → Feb 25 (Feb has 28 days, 25 always valid)', () => {
		const next = nextChargeAtForAnchor(istMidnight(2026, 0, 25), 25);
		expect(next).toEqual(istMidnight(2026, 1, 25));
	});

	it('Feb 25 + anchor 25 → Mar 25 (no skipped month)', () => {
		const next = nextChargeAtForAnchor(istMidnight(2026, 1, 25), 25);
		expect(next).toEqual(istMidnight(2026, 2, 25));
	});

	it('Dec 25 + anchor 25 → Jan 25 NEXT YEAR (year wrap)', () => {
		const next = nextChargeAtForAnchor(istMidnight(2026, 11, 25), 25);
		expect(next).toEqual(istMidnight(2027, 0, 25));
	});
});

// ── daysUntilFirstCharge (subscribe-modal disclosure) ──────────

describe('daysUntilFirstCharge', () => {
	it('subscribe Jan 1 IST 00:00 → first charge Jan 5 → 4 days', () => {
		expect(daysUntilFirstCharge(ist(2026, 0, 1))).toBe(4);
	});

	it('subscribe Jan 4 IST 12:00 → first charge Jan 5 → 1 day', () => {
		expect(daysUntilFirstCharge(ist(2026, 0, 4, 12))).toBe(1);
	});

	it('subscribe Jan 31 IST 23:00 → first charge Feb 1 → 1 day', () => {
		expect(daysUntilFirstCharge(ist(2026, 0, 31, 23))).toBe(1);
	});
});

// ── Pre-charge reminder window (§4 S3 cron) ────────────────────

describe('isWithinPreChargeReminderWindow', () => {
	it('charge 3.5 days out → in window', () => {
		const now = ist(2026, 0, 1, 12);
		const future = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000);
		expect(isWithinPreChargeReminderWindow(now, future)).toBe(true);
	});

	it('charge 2 days out → NOT in window (too close)', () => {
		const now = ist(2026, 0, 1, 12);
		const future = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
		expect(isWithinPreChargeReminderWindow(now, future)).toBe(false);
	});

	it('charge 5 days out → NOT in window (too far)', () => {
		const now = ist(2026, 0, 1, 12);
		const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
		expect(isWithinPreChargeReminderWindow(now, future)).toBe(false);
	});

	it('exactly 3 days → in window (inclusive)', () => {
		const now = ist(2026, 0, 1, 12);
		const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
		expect(isWithinPreChargeReminderWindow(now, future)).toBe(true);
	});
});

// ── anchorDayOf helper ──────────────────────────────────────────

describe('anchorDayOf', () => {
	it('returns the anchor day when set + valid', () => {
		expect(anchorDayOf({ anchor_day: 10 })).toBe(10);
	});

	it('returns null when undefined', () => {
		expect(anchorDayOf({ anchor_day: undefined })).toBeNull();
	});
});
