/**
 * DATA-4 — City → region-tier lookup.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Spec: docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md §5 + open-question Q6.
 *
 * A city name is already low-resolution (non-PII on its own), but a region
 * TIER ('Tier 1' metro vs 'Tier 2' vs 'Tier 3') is the more useful axis for
 * analytics — it groups dozens of cities into comparable cohorts. This helper
 * maps a city name to its tier via a static lookup.
 *
 * v1 is a static map (Q6 recommendation). The tier classification roughly
 * follows the common Indian metro / non-metro convention (RBI / HRA-style
 * Tier 1 = the major metros). Unknown cities return null — NOT 'Rural' — so
 * we never assert a tier we don't actually know. ('Rural' is reserved for
 * inputs explicitly tagged rural by upstream data, should that ever arrive.)
 * ══════════════════════════════════════════════════════════════════════════════
 */

/** Tier 1 — the major metros. */
const TIER_1 = new Set([
	'mumbai', 'navi mumbai', 'thane', 'delhi', 'new delhi', 'bengaluru', 'bangalore',
	'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad'
]);

/** Tier 2 — large non-metro cities. */
const TIER_2 = new Set([
	'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'bhopal', 'visakhapatnam',
	'vizag', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'coimbatore', 'kochi', 'cochin',
	'chandigarh', 'nashik', 'faridabad', 'gurgaon', 'gurugram', 'noida', 'rajkot', 'agra',
	'varanasi', 'meerut', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'jabalpur',
	'jamshedpur', 'amritsar', 'allahabad', 'prayagraj', 'ranchi', 'gwalior', 'vijayawada',
	'mysuru', 'mysore', 'tiruchirappalli', 'bhubaneswar', 'salem', 'dehradun', 'mangalore'
]);

/**
 * Map a city name to its region tier. Returns 'Tier 1' / 'Tier 2' / 'Tier 3'
 * for known cities, or null when the city is missing.
 *
 * A non-empty but unrecognised city is treated as 'Tier 3' (the catch-all for
 * smaller cities/towns); an empty/missing city is null (no data). We
 * distinguish the two because "small town" and "unknown" are different
 * analytics signals.
 *
 * @example
 *   regionTier('Mumbai')      → 'Tier 1'
 *   regionTier('Indore')      → 'Tier 2'
 *   regionTier('Bhuj')        → 'Tier 3'
 *   regionTier('')            → null
 */
export function regionTier(city: string | null | undefined): string | null {
	if (city === null || city === undefined) return null;
	const normalized = String(city).trim().toLowerCase();
	if (normalized.length === 0) return null;

	if (TIER_1.has(normalized)) return 'Tier 1';
	if (TIER_2.has(normalized)) return 'Tier 2';
	return 'Tier 3';
}
