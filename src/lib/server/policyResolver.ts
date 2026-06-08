/**
 * Policy Resolution Engine
 * ══════════════════════════════════════════════════════════════════
 * CSS-specificity model for two-axis policy resolution:
 *   Product axis: Lender > Product Type > Variation
 *   Geography axis: PAN India > State > City > Zone
 *
 * Resolution algorithm:
 *   1. Build geo scope chain from property location
 *   2. Query PolicyRules matching (variations + cross-variation) at any geo in chain
 *   3. Load active PolicyVersions for each rule (batch $in query)
 *   4. Sort by specificity: geo ASC, cross-variation BEFORE variation-specific
 *   5. Merge policy_fields: iterate least→most specific, last write wins per field
 *   6. Collect rule_overlays in order
 *   7. Return resolved_fields + field_sources + resolution_chain
 *
 * Performance: 2 MongoDB queries per resolution. In-memory cache with 1hr TTL.
 * ══════════════════════════════════════════════════════════════════
 */

import type { Collection } from 'mongodb';
import type {
	PolicyResolutionQuery,
	ResolvedPolicy,
	PolicyFields,
	PolicyFieldKey,
	FieldSource,
	RuleOverlay,
	PolicyRule,
	PolicyVersion,
	GeoLevel
} from '$lib/types/policyEngine.js';
import { GEO_SPECIFICITY } from '$lib/types/policyEngine.js';
import { PolicyRules, PolicyVersions } from '$lib/database/mongo.js';

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
	result: ResolvedPolicy;
	expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

/** Build a deterministic cache key from the query */
function buildCacheKey(query: PolicyResolutionQuery): string {
	const variations = [...query.matched_variation_ids].sort().join(',');
	return `${query.lender_id}|${query.product_type}|${variations}|${query.property_state || ''}|${query.property_city || ''}|${query.zone_type || ''}`;
}

/** Bust all cache entries for a given lender (called on version activation) */
export function bustCacheForLender(lender_id: string): number {
	let busted = 0;
	for (const [key] of cache) {
		if (key.startsWith(`${lender_id}|`)) {
			cache.delete(key);
			busted++;
		}
	}
	return busted;
}

/** Bust the entire cache */
export function bustAllCache(): void {
	cache.clear();
}

/** Get cache stats for monitoring */
export function getCacheStats(): { size: number; ttlMs: number } {
	return { size: cache.size, ttlMs: CACHE_TTL_MS };
}

// ============================================================================
// GEO SCOPE CHAIN BUILDER
// ============================================================================

/**
 * Build the geographic scope chain from property location.
 * Always starts with "pan_india" and adds more specific levels.
 *
 * Examples:
 *   {} → ["pan_india"]
 *   { property_state: "UP" } → ["pan_india", "uttar-pradesh"]
 *   { property_state: "UP", property_city: "Lucknow" } → ["pan_india", "uttar-pradesh", "uttar-pradesh:lucknow"]
 *   { ..., zone_type: "urban" } → [..., "uttar-pradesh:lucknow:urban"]
 */
export function buildGeoScopeChain(query: {
	property_state?: string;
	property_city?: string;
	zone_type?: string;
}): string[] {
	const chain: string[] = ['pan_india'];

	if (query.property_state) {
		const stateSlug = toSlug(query.property_state);
		chain.push(stateSlug);

		if (query.property_city) {
			const citySlug = `${stateSlug}:${toSlug(query.property_city)}`;
			chain.push(citySlug);

			if (query.zone_type) {
				chain.push(`${citySlug}:${query.zone_type}`);
			}
		}
	}

	return chain;
}

// ============================================================================
// CORE RESOLUTION
// ============================================================================

/**
 * Resolve the effective policy for a given query.
 *
 * @param query - The resolution query (lender, product, variations, geography)
 * @param options - Optional overrides for testing/flexibility
 * @returns The resolved policy with provenance
 */
export async function resolvePolicy(
	query: PolicyResolutionQuery,
	options?: {
		skipCache?: boolean;
		rulesCollection?: Collection<PolicyRule>;
		versionsCollection?: Collection<PolicyVersion>;
	}
): Promise<ResolvedPolicy> {
	// Check cache
	const cacheKey = buildCacheKey(query);
	if (!options?.skipCache) {
		const cached = cache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.result;
		}
	}

	const rules = options?.rulesCollection || PolicyRules;
	const versions = options?.versionsCollection || PolicyVersions;

	// Step 1: Build geo scope chain
	const geoChain = buildGeoScopeChain(query);

	// Step 2: Query PolicyRules — find all active rules matching variations + cross-variation
	// at any geo scope in the chain. This is 1 MongoDB query.
	const product_id = `${query.lender_id}:${query.product_type}`;

	let matchingRules = await rules
		.find({
			is_active: true,
			product_id,
			geo_scope_id: { $in: geoChain },
			$or: [
				// Variation-specific rules for matched variations
				{ variation_id: { $in: query.matched_variation_ids }, is_cross_variation: false },
				// Cross-variation rules (apply to ALL variations)
				{ is_cross_variation: true }
			]
		})
		.toArray();

	let inheritedFromColdStart = false;

	// Step 2.5: Cold-start fallback (PMS Phase 2.C — passive intelligence,
	// 2026-05-31). When the natural geo chain yields zero rules, look at
	// all active rules for (product, matched variations) regardless of geo.
	// If EXACTLY ONE city-level scope has any matching rule, use that
	// city's rules — covers the early-stage case where only one RM has
	// authored anything for this (lender, product). With 0 or 2+ cities
	// the fallback stops: explicit beats implicit, and once two cities
	// diverge each is strictly scoped to its own geography.
	if (matchingRules.length === 0) {
		matchingRules = await findColdStartFallbackRules(rules, product_id, query.matched_variation_ids);
		inheritedFromColdStart = matchingRules.length > 0;
	}

	// If still no rules found, return empty resolution
	if (matchingRules.length === 0) {
		const emptyResult = buildEmptyResolvedPolicy(query);
		if (!options?.skipCache) {
			cache.set(cacheKey, { result: emptyResult, expiresAt: Date.now() + CACHE_TTL_MS });
		}
		return emptyResult;
	}

	// Step 3: Load active PolicyVersions for all matched rules (1 MongoDB query)
	const activeVersionIds = matchingRules
		.filter((r) => r.active_version_id !== null)
		.map((r) => r.active_version_id!);

	const activeVersions =
		activeVersionIds.length > 0
			? await versions.find({ _id: { $in: activeVersionIds } }).toArray()
			: [];

	// Build lookup: policy_rule_id → PolicyVersion
	const versionByRuleId = new Map<string, PolicyVersion>();
	for (const version of activeVersions) {
		versionByRuleId.set(version.policy_rule_id, version);
	}

	// Steps 4–7: Delegate to the shared resolver so the single-query and batched
	// (resolvePoliciesForMany) paths produce byte-equivalent results.
	const result = buildResolvedPolicyFromRules(
		query,
		matchingRules,
		versionByRuleId,
		geoChain,
		inheritedFromColdStart
	);

	// Cache result
	if (!options?.skipCache) {
		cache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
	}

	return result;
}

// ============================================================================
// BATCHED RESOLUTION (PERF: 2 queries for N lenders instead of 2N)
// ============================================================================

/**
 * Resolve policies for many queries in a single batched pass.
 *
 * The naive approach (calling `resolvePolicy` in a loop or `Promise.all`)
 * issues 2 DB queries per query — 2N round-trips total for N queries.
 * This function issues exactly 2 DB queries regardless of N:
 *   1. Fetch all candidate PolicyRules in one `$in` query across every
 *      (product_id, geo_scope, variation) combination appearing in the batch.
 *   2. Fetch all active PolicyVersions in one `$in` query.
 *
 * Per-query resolution (sort + merge + field_sources) is then done in memory
 * by re-using `buildResolvedPolicyFromRules` — the same helper `resolvePolicy`
 * uses. Results are byte-equivalent.
 *
 * Cache-aware: queries whose cache entries are still valid are served from
 * cache and excluded from the DB round-trip. Fresh results are written back
 * to the cache with the same 1-hour TTL as the single-query path.
 *
 * @returns Array of ResolvedPolicy values in the same order as `queries`.
 *          Each element is either a cache hit, a freshly-resolved policy,
 *          or an empty-resolution sentinel (no rules matched for that query).
 */
export async function resolvePoliciesForMany(
	queries: PolicyResolutionQuery[],
	options?: {
		skipCache?: boolean;
		rulesCollection?: Collection<PolicyRule>;
		versionsCollection?: Collection<PolicyVersion>;
	}
): Promise<ResolvedPolicy[]> {
	if (queries.length === 0) return [];

	const results: (ResolvedPolicy | undefined)[] = new Array(queries.length);

	// Phase 1: Resolve cache hits; collect misses with per-query state.
	const missIndexes: number[] = [];
	const missStates: Array<{
		query: PolicyResolutionQuery;
		cacheKey: string;
		geoChain: string[];
		productId: string;
	}> = [];

	for (let i = 0; i < queries.length; i++) {
		const query = queries[i];
		const cacheKey = buildCacheKey(query);

		if (!options?.skipCache) {
			const cached = cache.get(cacheKey);
			if (cached && cached.expiresAt > Date.now()) {
				results[i] = cached.result;
				continue;
			}
		}

		missIndexes.push(i);
		missStates.push({
			query,
			cacheKey,
			geoChain: buildGeoScopeChain(query),
			productId: `${query.lender_id}:${query.product_type}`
		});
	}

	if (missStates.length === 0) {
		return results as ResolvedPolicy[];
	}

	// Phase 2: Collect the union of (product_id, geo_scope_id, variation_id)
	// across all misses — bounds the batched DB query to exactly what the
	// misses could possibly need, no more.
	const allProductIds = new Set<string>();
	const allGeoScopes = new Set<string>();
	const allVariationIds = new Set<string>();

	for (const s of missStates) {
		allProductIds.add(s.productId);
		for (const g of s.geoChain) allGeoScopes.add(g);
		for (const v of s.query.matched_variation_ids) allVariationIds.add(v);
	}

	const rules = options?.rulesCollection || PolicyRules;
	const versions = options?.versionsCollection || PolicyVersions;

	// Phase 3: One PolicyRules query covering every miss's candidate rules.
	// We fetch broadly (by product_id + geo_scope union) and filter per-query
	// in memory. The per-query filter mirrors the single-query `find` filter.
	const matchingRules = await rules
		.find({
			is_active: true,
			product_id: { $in: [...allProductIds] },
			geo_scope_id: { $in: [...allGeoScopes] },
			$or: [
				{ variation_id: { $in: [...allVariationIds] }, is_cross_variation: false },
				{ is_cross_variation: true }
			]
		})
		.toArray();

	// Phase 4: One PolicyVersions query for all active versions across all matched rules.
	const activeVersionIds = matchingRules
		.filter((r) => r.active_version_id !== null)
		.map((r) => r.active_version_id!);

	const activeVersions =
		activeVersionIds.length > 0
			? await versions.find({ _id: { $in: activeVersionIds } }).toArray()
			: [];

	const versionByRuleId = new Map<string, PolicyVersion>();
	for (const version of activeVersions) {
		versionByRuleId.set(version.policy_rule_id, version);
	}

	// Phase 5: Per-miss in-memory resolution (same sort + merge as single-query path).
	const now = Date.now();
	for (let m = 0; m < missStates.length; m++) {
		const { query, cacheKey, geoChain, productId } = missStates[m];
		const resultIndex = missIndexes[m];

		// Filter the union rule set down to this query's criteria.
		// Mirrors the single-query `find` filter exactly.
		let queryRules = matchingRules.filter((r) => {
			if (r.product_id !== productId) return false;
			if (!geoChain.includes(r.geo_scope_id)) return false;
			if (r.is_cross_variation) return true;
			return query.matched_variation_ids.includes(r.variation_id);
		});

		// PMS Phase 2.C cold-start fallback — see comment in resolvePolicy().
		// The batched query is geo-bounded for performance, so the cold-start
		// lookup happens here as a per-miss extra query when needed. The path
		// fires only when the natural chain yielded nothing; in steady state
		// this is a rare occurrence (only the truly early-stage lender/product
		// combinations) so the per-miss roundtrip is acceptable.
		let inheritedFromColdStart = false;
		let queryVersionByRuleId = versionByRuleId;
		if (queryRules.length === 0) {
			const coldStartRules = await findColdStartFallbackRules(
				rules,
				productId,
				query.matched_variation_ids
			);
			if (coldStartRules.length > 0) {
				queryRules = coldStartRules;
				inheritedFromColdStart = true;

				// Fetch versions for the cold-start rules — they likely weren't
				// pulled by the batched query (we only fetched versions whose
				// rules were already in our candidate set). Build a private
				// rule→version map so the shared resolver merges correctly.
				const coldStartVersionIds = coldStartRules
					.filter((r) => r.active_version_id !== null)
					.map((r) => r.active_version_id!);
				if (coldStartVersionIds.length > 0) {
					const coldStartVersions = await versions
						.find({ _id: { $in: coldStartVersionIds } })
						.toArray();
					queryVersionByRuleId = new Map(versionByRuleId);
					for (const v of coldStartVersions) {
						queryVersionByRuleId.set(v.policy_rule_id, v);
					}
				}
			}
		}

		let resolved: ResolvedPolicy;
		if (queryRules.length === 0) {
			resolved = buildEmptyResolvedPolicy(query);
		} else {
			resolved = buildResolvedPolicyFromRules(
				query,
				queryRules,
				queryVersionByRuleId,
				geoChain,
				inheritedFromColdStart
			);
		}

		if (!options?.skipCache) {
			cache.set(cacheKey, { result: resolved, expiresAt: now + CACHE_TTL_MS });
		}
		results[resultIndex] = resolved;
	}

	return results as ResolvedPolicy[];
}

// ============================================================================
// SHARED RESOLUTION HELPERS
// ============================================================================

/** Build the empty-resolution result for a query with no matching rules. */
function buildEmptyResolvedPolicy(query: PolicyResolutionQuery): ResolvedPolicy {
	return {
		lender_id: query.lender_id,
		product_type: query.product_type,
		resolved_fields: {},
		field_sources: {},
		resolved_rule_overlays: [],
		resolution_chain: [],
		resolved_at: new Date()
	};
}

/**
 * Sort rules by specificity and merge their policy fields into a ResolvedPolicy.
 *
 * Invariants (must be preserved across both single-query and batched paths):
 *   - Primary sort: geo specificity ASC (pan_india=0 first, zone=30 last)
 *   - Secondary sort: cross-variation BEFORE variation-specific at same geo level
 *   - Tertiary sort: by variation_id for determinism
 *   - Merge: iterate least→most specific; last-write-wins per field
 *   - Skip fields with null/undefined values during merge
 *   - Skip rules whose active_version_id is missing from versionByRuleId
 *
 * This function is the single source of truth for merge semantics.
 */
function buildResolvedPolicyFromRules(
	query: PolicyResolutionQuery,
	candidateRules: PolicyRule[],
	versionByRuleId: Map<string, PolicyVersion>,
	geoChain: string[],
	inheritedFromColdStart: boolean = false
): ResolvedPolicy {
	const sortedRules = candidateRules
		.filter((r) => versionByRuleId.has(r.policy_rule_id))
		.sort((a, b) => {
			const geoA = getGeoSpecificity(a.geo_scope_id, geoChain);
			const geoB = getGeoSpecificity(b.geo_scope_id, geoChain);
			if (geoA !== geoB) return geoA - geoB;
			// At same geo level: cross-variation first (they are less specific)
			if (a.is_cross_variation !== b.is_cross_variation) {
				return a.is_cross_variation ? -1 : 1;
			}
			// Deterministic: sort by variation_id
			return a.variation_id.localeCompare(b.variation_id);
		});

	const resolved_fields: PolicyFields = {};
	const field_sources: Partial<Record<PolicyFieldKey, FieldSource>> = {};
	const resolved_rule_overlays: RuleOverlay[] = [];
	const resolution_chain: ResolvedPolicy['resolution_chain'] = [];

	for (const rule of sortedRules) {
		const version = versionByRuleId.get(rule.policy_rule_id)!;
		const geoSpec = getGeoSpecificity(rule.geo_scope_id, geoChain);
		const geoLevel = getGeoLevel(rule.geo_scope_id);
		const fieldsContributed: PolicyFieldKey[] = [];

		// Merge policy_fields: last write wins per field
		if (version.policy_fields) {
			for (const [key, value] of Object.entries(version.policy_fields)) {
				if (value !== undefined && value !== null) {
					resolved_fields[key as PolicyFieldKey] = value;
					field_sources[key as PolicyFieldKey] = {
						policy_rule_id: rule.policy_rule_id,
						version_number: version.version_number,
						geo_scope_id: rule.geo_scope_id,
						geo_level: geoLevel,
						specificity: geoSpec,
						is_cross_variation: rule.is_cross_variation,
						...(inheritedFromColdStart && { inherited_from_cold_start: true })
					};
					fieldsContributed.push(key as PolicyFieldKey);
				}
			}
		}

		// Collect rule overlays in order
		if (version.rule_overlays && version.rule_overlays.length > 0) {
			resolved_rule_overlays.push(...version.rule_overlays);
		}

		resolution_chain.push({
			policy_rule_id: rule.policy_rule_id,
			geo_scope_id: rule.geo_scope_id,
			geo_level: geoLevel,
			specificity: geoSpec,
			is_cross_variation: rule.is_cross_variation,
			version_number: version.version_number,
			fields_contributed: fieldsContributed,
			...(inheritedFromColdStart && { inherited_from_cold_start: true })
		});
	}

	return {
		lender_id: query.lender_id,
		product_type: query.product_type,
		resolved_fields,
		field_sources,
		resolved_rule_overlays,
		resolution_chain,
		resolved_at: new Date()
	};
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Cold-start fallback lookup (PMS Phase 2.C — 2026-05-31).
 *
 * Called when the natural geo-chain query yields no matching rules. Looks
 * at all active rules for this (product, matched-variations) regardless
 * of geo scope, and returns them IFF exactly one city-level scope has
 * any matching rule. With 0 cities → nothing to inherit; with 2+ cities
 * → ambiguous, explicit-beats-implicit wins; with exactly 1 city → safe
 * to surface that city's rules as a soft default for the rest of India.
 *
 * Returns the matched rules (possibly multiple at the same city — e.g. a
 * cross-variation rule + a variation-specific rule) when the fallback
 * fires, or an empty array otherwise.
 */
async function findColdStartFallbackRules(
	rulesCollection: Collection<PolicyRule>,
	product_id: string,
	matched_variation_ids: string[]
): Promise<PolicyRule[]> {
	const candidateRules = await rulesCollection
		.find({
			is_active: true,
			product_id,
			$or: [
				{ variation_id: { $in: matched_variation_ids }, is_cross_variation: false },
				{ is_cross_variation: true }
			]
		})
		.toArray();

	// Keep only city-level scopes — state and pan_india are explicit overrides;
	// if those existed they would have been hit by the natural chain query.
	const cityRules = candidateRules.filter(
		(r) => getGeoLevel(r.geo_scope_id) === 'city'
	);
	if (cityRules.length === 0) return [];

	const distinctCities = new Set(cityRules.map((r) => r.geo_scope_id));
	if (distinctCities.size !== 1) return [];

	return cityRules;
}

/** Determine geo specificity score for a geo_scope_id */
function getGeoSpecificity(geo_scope_id: string, _geoChain: string[]): number {
	if (geo_scope_id === 'pan_india') return GEO_SPECIFICITY.pan_india;

	const parts = geo_scope_id.split(':');
	switch (parts.length) {
		case 1:
			return GEO_SPECIFICITY.state; // e.g., "uttar-pradesh"
		case 2:
			return GEO_SPECIFICITY.city; // e.g., "uttar-pradesh:lucknow"
		case 3:
			return GEO_SPECIFICITY.zone; // e.g., "uttar-pradesh:lucknow:urban"
		default:
			return GEO_SPECIFICITY.state;
	}
}

/** Determine geo level from geo_scope_id */
function getGeoLevel(geo_scope_id: string): GeoLevel {
	if (geo_scope_id === 'pan_india') return 'pan_india';
	const parts = geo_scope_id.split(':');
	switch (parts.length) {
		case 1:
			return 'state';
		case 2:
			return 'city';
		case 3:
			return 'zone';
		default:
			return 'state';
	}
}

/** Convert a string to a URL-safe slug */
function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[&]/g, 'and')
		.replace(/[()]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
