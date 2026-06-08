/**
 * DATA-1 — Price + loan-amount bucketing.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §2.3 / §2.4
 *
 * Both property price and loan amount are floored to the nearest ₹10,000.
 * At a ₹2 Cr price point that is 0.05% precision loss — negligible for
 * routing, but enough to break direct correlation between vault entries
 * and any individual transaction.
 *
 * The bucket is the storable form. Routing queries derive a price BAND
 * (±40% around target_price, also bucketed) — see the routing module's
 * `priceBand()` helper (Slice 5).
 * ══════════════════════════════════════════════════════════════════════════════
 */

const BUCKET_GRANULARITY = 10_000;

/**
 * Floor a positive rupee value to the nearest ₹10,000.
 *
 * Defensive: negatives, NaN, or non-finite values return 0 (the writer must
 * decide whether to skip the vault entry — see bucketVaultEntry's guard).
 *
 * @example
 *   priceBucket(18_743_200)  → 18_740_000   // ₹1.87 Cr → ₹1.874 Cr
 *   priceBucket(10_000)      → 10_000
 *   priceBucket(9_999)       → 0            // sub-₹10k input → zero bucket
 *   priceBucket(0)           → 0
 *   priceBucket(-1)          → 0
 *   priceBucket(NaN)         → 0
 */
export function priceBucket(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.floor(value / BUCKET_GRANULARITY) * BUCKET_GRANULARITY;
}

/**
 * Alias for loan amounts. Same rule, kept separate for call-site clarity —
 * if the spec later diverges (e.g. coarser granularity for loan amounts),
 * the alias gives us one place to change.
 */
export const loanAmountBucket = priceBucket;
