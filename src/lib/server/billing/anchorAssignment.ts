/**
 * D.1 Recurring Billing — Anchor day assignment + cycle math
 * ══════════════════════════════════════════════════════════════════
 * Implements the §11 Q2 decision: 6 concentrated anchor days per month
 * (1st, 5th, 10th, 15th, 20th, 25th). On subscribe, the DSA is assigned
 * to the NEAREST FUTURE anchor; days between subscribe and first anchor
 * are gifted free access (no debit). From first anchor onward, debit
 * fires on that same anchor day every cycle.
 *
 * All math is done in IST (Indian Standard Time). The cron schedule
 * lives elsewhere (S3); this module is the pure date arithmetic.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2 + §11 Q2
 * ══════════════════════════════════════════════════════════════════
 */

import type { BillingSubscriptionDoc } from '$lib/types/billingSubscription';

// ── Anchor configuration ────────────────────────────────────────

/**
 * The six concentrated billing anchor days per month, ascending.
 * Locked 2026-05-25 per §11 Q2 owner decision (after iterations on
 * subscribe-day-anchored and 2-anchor variants).
 */
export const ANCHOR_DAYS = [1, 5, 10, 15, 20, 25] as const;

/** Type narrowing for anchor day values. */
export type AnchorDay = (typeof ANCHOR_DAYS)[number];

// ── IST helpers ─────────────────────────────────────────────────

/**
 * IST is UTC+05:30. We don't need a full tz library for this — IST has
 * no daylight saving and the offset is fixed. Computing the day-of-month
 * "in IST" means shifting the input by +5h30m and reading the UTC day.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Returns the day-of-month (1-31) as seen from IST. */
export function istDayOfMonth(d: Date): number {
	const shifted = new Date(d.getTime() + IST_OFFSET_MS);
	return shifted.getUTCDate();
}

/**
 * Builds a Date that represents 00:00:00 IST on a given (year, month, day)
 * in IST. Internally that's `Date.UTC(y, m, d, -5, -30)` because we want
 * the IST midnight, expressed as UTC.
 *
 * `month` is 0-indexed (Jan=0) to match JS Date convention.
 */
export function istMidnight(year: number, month: number, day: number): Date {
	// Date.UTC(y, m, d, 0, 0, 0) is UTC midnight. Subtract IST offset to land
	// at "00:00 IST" expressed in UTC time.
	return new Date(Date.UTC(year, month, day, 0, 0, 0) - IST_OFFSET_MS);
}

// ── Anchor assignment ──────────────────────────────────────────

/**
 * Given a subscribe-time `now`, return the nearest FUTURE anchor day
 * (1 / 5 / 10 / 15 / 20 / 25) the DSA will be billed on.
 *
 * Examples (all IST):
 *   Jan 1   → 5   (4 days gifted)
 *   Jan 4   → 5   (1 day gifted)
 *   Jan 5   → 10  (5 days gifted — same-day-as-anchor still rolls to NEXT)
 *   Jan 12  → 15
 *   Jan 22  → 25
 *   Jan 26  → 1   (Feb 1, 6 days gifted)
 *   Jan 31  → 1   (Feb 1, 1 day gifted)
 *
 * Note "nearest FUTURE" — if `now` falls exactly on an anchor day, we
 * roll forward to the next anchor (we never bill on the same calendar
 * day someone subscribed; gives at least 1 day of clearance).
 */
export function assignAnchor(now: Date): AnchorDay {
	const dom = istDayOfMonth(now);
	for (const anchor of ANCHOR_DAYS) {
		if (anchor > dom) return anchor;
	}
	// Past the last anchor of this month (dom >= 25). Wrap to next month's 1st.
	return 1;
}

/**
 * Compute the first `next_charge_at` for a fresh subscription.
 * Returns a Date at 00:00 IST on the assigned anchor day.
 *
 * Used in the S2 mandate registration flow; the cron's `next_charge_at <= now`
 * check is what gates the debit.
 */
export function firstChargeAtForSubscribe(now: Date): Date {
	const anchor = assignAnchor(now);
	const shifted = new Date(now.getTime() + IST_OFFSET_MS);
	const istYear = shifted.getUTCFullYear();
	const istMonth = shifted.getUTCMonth();
	const istDom = shifted.getUTCDate();

	// If the assigned anchor is AHEAD in the same month, use this month.
	// Otherwise (anchor <= current day, i.e. we wrapped to next-month's 1st),
	// roll to next month.
	if (anchor > istDom) {
		return istMidnight(istYear, istMonth, anchor);
	}
	// Next month's 1st (or next anchor day if it's not exactly 1, though by
	// construction wrap-around always lands on 1 because 1 is the smallest
	// anchor and dom >= 25).
	return istMidnight(istYear, istMonth + 1, anchor);
}

/**
 * Compute the NEXT `next_charge_at` after a successful charge for a
 * subscription with a fixed anchor day. Returns the same anchor day in
 * the FOLLOWING calendar month, at 00:00 IST.
 *
 * Used at the end of S3's charge cron when a debit succeeds.
 *
 * Edge case: cycle anchor 25 → next month's 25 — works for every month
 * because 25 ≤ 28 (all months have a 25th). The §11 Q2 wisdom of
 * picking anchors ≤ 25 is what makes this safe.
 */
export function nextChargeAtForAnchor(currentChargeAt: Date, anchorDay: AnchorDay): Date {
	const shifted = new Date(currentChargeAt.getTime() + IST_OFFSET_MS);
	const istYear = shifted.getUTCFullYear();
	const istMonth = shifted.getUTCMonth();
	return istMidnight(istYear, istMonth + 1, anchorDay);
}

/**
 * Days until the next anchor — used by the subscribe modal disclosure
 * copy ("you have N days of free access until then" per §4 S2).
 *
 * Returns a positive integer. Same-day-as-anchor returns the gap to
 * the SUBSEQUENT anchor (consistent with assignAnchor's never-bill-today
 * rule).
 */
export function daysUntilFirstCharge(now: Date): number {
	const firstCharge = firstChargeAtForSubscribe(now);
	const diffMs = firstCharge.getTime() - now.getTime();
	return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

// ── Pre-charge reminder helper (S3 §4 — locked 2026-05-25 §11.2 #14) ──

/**
 * Returns true when `next_charge_at` is within the next 3-4 days from `now`.
 * The pre-charge reminder cron uses this to pick eligible subscriptions to
 * email ("reminder: ₹X will debit on the 5th").
 *
 * Window is 3-4 days (inclusive of both ends) — gives the cron a 24h
 * window to fire without missing edge-of-day subscriptions.
 */
export function isWithinPreChargeReminderWindow(now: Date, nextChargeAt: Date): boolean {
	const diffMs = nextChargeAt.getTime() - now.getTime();
	const diffDays = diffMs / (24 * 60 * 60 * 1000);
	return diffDays >= 3 && diffDays <= 4;
}

// ── Type guard for the BillingSubscriptionDoc's anchor_day field ──

export function isValidAnchorDay(n: number): n is AnchorDay {
	return (ANCHOR_DAYS as readonly number[]).includes(n);
}

// ── Convenience: extract anchor_day from a subscription doc safely ──

export function anchorDayOf(sub: Pick<BillingSubscriptionDoc, 'anchor_day'>): AnchorDay | null {
	if (sub.anchor_day === undefined) return null;
	return isValidAnchorDay(sub.anchor_day) ? sub.anchor_day : null;
}
