/**
 * DATA-1 — Recency scoring.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 (lead-routing query).
 *
 * Converts a quarter-string ("2026-Q1") into a 0..1 recency score used in
 * the composite ranking formula `(0.6 * recency + 0.4 * normalized_count)`.
 * The rule (verbatim from spec):
 *
 *   - 1.0 for the current quarter
 *   - subtract 0.15 per quarter in the past
 *   - floor at 0.1 after 6 quarters (i.e., quarter-distance ≥ 6)
 *
 * That means scores degrade linearly for the first 6 quarters and then
 * flatten — a 3-year-old case still counts a little, just not much, which
 * prevents thin niche markets from being completely starved of routing
 * signal.
 *
 * Note: the spec doesn't say what happens for FUTURE quarters (e.g. a case
 * dated 2027-Q1 when the routing query runs in 2026-Q3). That can only
 * happen via clock skew or test fixtures — we treat future quarters the
 * same as the current quarter (score 1.0). A score > 1.0 would distort
 * the ranking math against well-behaved data.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const DECAY_PER_QUARTER = 0.15;
const FLOOR_SCORE = 0.1;
const FLOOR_QUARTER_THRESHOLD = 6;

/**
 * Parse a "YYYY-Q{1..4}" string into a year + quarter-index pair, or null
 * if malformed. Tolerates whitespace; rejects everything else.
 */
function parseQuarter(s: string | null | undefined): { year: number; q: number } | null {
	if (!s) return null;
	const match = /^(\d{4})-Q([1-4])$/.exec(s.trim());
	if (!match) return null;
	return { year: parseInt(match[1], 10), q: parseInt(match[2], 10) };
}

/** Convert a date to the current-quarter "YYYY-Q{1..4}" string. UTC. */
export function quarterFromDate(date: Date): string {
	const year = date.getUTCFullYear();
	const q = Math.floor(date.getUTCMonth() / 3) + 1;
	return `${year}-Q${q}`;
}

/**
 * Distance in quarters from `entryQuarter` to `currentQuarter`. Returns
 * NaN on malformed inputs (caller can decide; recencyScore() treats NaN
 * as "unknown" → 0).
 *
 * Positive = entry is in the past; negative = entry is in the future
 * (clock skew). The recency-score formula uses Math.max(0, ...) so the
 * negative case collapses to "current".
 */
export function quarterDelta(entryQuarter: string, currentQuarter: string): number {
	const a = parseQuarter(entryQuarter);
	const b = parseQuarter(currentQuarter);
	if (!a || !b) return NaN;
	return (b.year - a.year) * 4 + (b.q - a.q);
}

/**
 * Returns the 0..1 recency score for a vault entry's quarter.
 *
 * @param entryQuarter   The vault entry's `closed_quarter` (e.g. "2026-Q1")
 * @param currentQuarter The "as-of" quarter the query runs in (e.g. "2026-Q3")
 *
 * @example
 *   recencyScore('2026-Q3', '2026-Q3')  → 1.0  (current quarter)
 *   recencyScore('2026-Q2', '2026-Q3')  → 0.85 (one quarter back)
 *   recencyScore('2025-Q1', '2026-Q3')  → 0.1  (>= 6 quarters → floor)
 *   recencyScore('bad', '2026-Q3')       → 0    (malformed input)
 */
export function recencyScore(entryQuarter: string, currentQuarter: string): number {
	const delta = quarterDelta(entryQuarter, currentQuarter);
	if (!Number.isFinite(delta)) return 0;
	// Future-dated entries (negative delta) collapse to the current quarter.
	const positiveDelta = Math.max(0, delta);
	if (positiveDelta >= FLOOR_QUARTER_THRESHOLD) return FLOOR_SCORE;
	return Math.max(FLOOR_SCORE, 1.0 - DECAY_PER_QUARTER * positiveDelta);
}
