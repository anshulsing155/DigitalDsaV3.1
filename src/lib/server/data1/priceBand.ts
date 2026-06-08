/**
 * DATA-1 — Price band derivation for the lead-routing query.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-1-LEAD-ATTRIBUTION-SPEC.md §4 + §9.
 *
 * Given an inbound customer's `target_price`, returns the inclusive
 * `[lower, upper]` bucket band the routing query matches against:
 *   - lower = floor(target * 0.6 / 10_000) * 10_000
 *   - upper = floor(target * 1.4 / 10_000) * 10_000
 *
 * The ±40% spread is broad enough that real cohort matches survive in
 * tier-2 cities, but narrow enough that "₹2 Cr looking" doesn't match
 * "₹50 lakh deals". This is the same shape the SQL-equivalent in spec §4
 * uses (`price_lower` / `price_upper`).
 *
 * The k-anonymity threshold (§9) is also priced — ≥ ₹3 Cr triggers k ≥ 10
 * instead of k ≥ 5. That threshold operates on the UPPER bucket boundary
 * (i.e., the most expensive entry that could match), because that's the
 * highest re-identification risk in the cohort.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const BAND_FACTOR_LOW = 0.6;
const BAND_FACTOR_HIGH = 1.4;
const BUCKET_GRANULARITY = 10_000;

/** ₹3 Cr — the luxury threshold above which k-anonymity tightens to k ≥ 10. */
export const LUXURY_THRESHOLD = 30_000_000;
export const K_THRESHOLD_STANDARD = 5;
export const K_THRESHOLD_LUXURY = 10;

export interface PriceBand {
	lower: number;
	upper: number;
}

/**
 * Returns the [lower, upper] bucket band for a target price. Both ends are
 * floored to the ₹10k granularity so they align with the stored bucket
 * values — this means the Mongo `$gte`/`$lte` comparisons are exact.
 *
 * Defensive: non-positive / non-finite input returns a degenerate band
 * (0, 0). The caller's range query would then match nothing — preferred
 * over throwing, because routing should fail closed (no matches) on bad
 * input rather than open (everyone matches).
 *
 * @example
 *   priceBand(20_000_000)  → { lower: 12_000_000, upper: 28_000_000 }
 *   priceBand(50_000_000)  → { lower: 30_000_000, upper: 70_000_000 } — luxury threshold
 *   priceBand(0)           → { lower: 0, upper: 0 }
 */
export function priceBand(targetPrice: number): PriceBand {
	if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
		return { lower: 0, upper: 0 };
	}
	const lower = Math.floor((targetPrice * BAND_FACTOR_LOW) / BUCKET_GRANULARITY) * BUCKET_GRANULARITY;
	const upper = Math.floor((targetPrice * BAND_FACTOR_HIGH) / BUCKET_GRANULARITY) * BUCKET_GRANULARITY;
	return { lower, upper };
}

/**
 * Returns the k-anonymity threshold for a given price band. Anything
 * with the upper band ≥ LUXURY_THRESHOLD uses the tighter k = 10 — the
 * cohort is more re-identifiable in thin luxury markets.
 */
export function kAnonymityThreshold(band: PriceBand): number {
	return band.upper >= LUXURY_THRESHOLD ? K_THRESHOLD_LUXURY : K_THRESHOLD_STANDARD;
}
