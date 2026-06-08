/**
 * DATA-1 — Closed-quarter bucketing.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.5
 *
 * Reduces a closing date to "YYYY-Q{1..4}" — no day, no exact month. The
 * quarter granularity defeats timing-based linkage attacks: an adversary
 * who knows locality + price + lender + quarter still needs to scan public
 * property registrar records to link to a specific transaction, and a
 * ~90-day window dramatically reduces the search space's specificity.
 * ══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Returns the quarter string for a given Date. UTC-based — quarter boundaries
 * are calendar quarters, not fiscal. Defensive: invalid dates return ''.
 *
 * @example
 *   closedQuarterBucket(new Date('2026-03-14'))  → '2026-Q1'
 *   closedQuarterBucket(new Date('2026-04-01'))  → '2026-Q2'
 *   closedQuarterBucket(new Date('2025-12-31'))  → '2025-Q4'
 *   closedQuarterBucket(new Date('invalid'))     → ''
 */
export function closedQuarterBucket(date: Date | string | null | undefined): string {
	if (!date) return '';
	const d = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(d.getTime())) return '';

	// getUTCMonth() returns 0..11; quarter is ceil((month+1)/3).
	const year = d.getUTCFullYear();
	const monthIndex = d.getUTCMonth(); // 0..11
	const quarter = Math.floor(monthIndex / 3) + 1; // 1..4
	return `${year}-Q${quarter}`;
}
