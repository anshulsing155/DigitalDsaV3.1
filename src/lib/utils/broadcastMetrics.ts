/**
 * Pure helpers for the RM Broadcasts engagement-metric strip (C.3).
 *
 * Extracted from `dashboard/rm/broadcasts/+page.svelte` so the
 * sent/opened/percentage math is unit-testable without mounting Svelte
 * and so the same formatter can be reused if Broadcasts grow more
 * surfaces (e.g. per-broadcast detail page in a follow-up).
 *
 * Pre-C.3 the per-broadcast card showed "N read" with no percentage and
 * no clear opened-vs-clicked distinction. The audit called this out as
 * "RM sends into a void" — without context, 12/23 vs 12/12 vs 12/200
 * all look the same. Adding the percentage answers "did it land?"
 * without changing the data model.
 *
 * Click tracking (wrapped links → tracking endpoint → click_count) is
 * deferred to a follow-up PR — that needs an in-body URL rewriter,
 * a new GET /api/rm/broadcasts/[id]/click endpoint, and storage for
 * distinct clicker IDs. Phase one keeps the metric strip honest by
 * surfacing only what's actually tracked (target + opened).
 */

export interface BroadcastEngagement {
	/** Recipients at send time (frozen — `target_dsa_ids.length` from server). */
	target: number;
	/** Distinct DSAs who opened the broadcast (= `read_by.length` from server). */
	opened: number;
}

/**
 * Returns the opened percentage as an integer 0..100, or null when there
 * are no recipients (division by zero — caller renders "—" instead).
 */
export function openedPercentage({ target, opened }: BroadcastEngagement): number | null {
	if (target <= 0) return null;
	const clamped = Math.max(0, Math.min(opened, target));
	return Math.round((clamped / target) * 100);
}

/**
 * One-line engagement summary suitable for a card chip. Examples:
 *   - 0 recipients   → "Sent to no one"
 *   - 0 of 23 opened → "Sent to 23 · Opened 0 (0%)"
 *   - 12 of 23      → "Sent to 23 · Opened 12 (52%)"
 *   - 23 of 23      → "Sent to 23 · Opened 23 (100%)"
 *
 * The "Sent to" framing matches the spec; the percentage gives the
 * "did it actually land" signal that bare counts can't.
 */
export function formatEngagement(eng: BroadcastEngagement): string {
	if (eng.target <= 0) return 'Sent to no one';
	const pct = openedPercentage(eng);
	const clampedOpened = Math.max(0, Math.min(eng.opened, eng.target));
	return `Sent to ${eng.target} · Opened ${clampedOpened} (${pct ?? 0}%)`;
}

/**
 * Send-button copy that includes the recipient count, so the RM sees
 * the number on the action they're about to take. "Send to 23 DSAs".
 * Falls back to a generic "Send Broadcast" when no recipients.
 */
export function formatSendButtonLabel(dsaCount: number): string {
	if (dsaCount <= 0) return 'Send Broadcast';
	return `Send to ${dsaCount} DSA${dsaCount === 1 ? '' : 's'}`;
}
