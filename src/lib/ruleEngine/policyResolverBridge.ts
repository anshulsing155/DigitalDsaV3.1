/**
 * Policy Resolver Bridge — connects DB-driven policy engine to evaluation pipeline.
 * Graceful fallback: if DB is unavailable, returns [] so static policies are preserved.
 */
import type { ParsedPolicy } from './types.js';
import type { PolicyResolutionQuery, ResolvedPolicy } from '$lib/types/policyEngine.js';

const CATEGORY_MAP: Record<string, string> = {
	roi: 'interest_rate',
	processing_fee: 'fees',
	insurance: 'insurance',
	moratorium: 'terms',
	lock_in: 'terms',
	prepayment: 'terms',
	max_tenure: 'eligibility',
	min_tenure: 'eligibility',
	max_age: 'eligibility',
	min_age: 'eligibility',
	max_loan: 'limits',
	min_loan: 'limits',
	cibil_floor: 'eligibility'
};

function deriveCategory(key: string): string {
	for (const [prefix, cat] of Object.entries(CATEGORY_MAP)) {
		if (key.startsWith(prefix)) return cat;
	}
	return 'general';
}

/**
 * Resolve DB-driven policies for a specific lender, optionally matching
 * product variations against the loan payload.
 *
 * When `payload` is provided, the variation matcher evaluates each active
 * ProductVariation's JSON-Logic match_condition against the payload to
 * determine which variation-specific policy rules should activate.
 * Without `payload`, matched_variation_ids defaults to [] (base policies only).
 */
export async function resolvePoliciesForLender(
	lenderId: string,
	productType: string,
	geoContext?: { state?: string; city?: string; zoneType?: string },
	payload?: Record<string, unknown>
): Promise<ParsedPolicy[]> {
	try {
		const { resolvePolicy } = await import('$lib/server/policyResolver.js');

		// Match variations from payload if available — otherwise fall back to empty
		// (equivalent to the previous hardcoded [] behavior)
		let matchedVariationIds: string[] = [];
		if (payload) {
			const { matchVariationsForProduct } = await import('./variationMatcher.js');
			matchedVariationIds = await matchVariationsForProduct(lenderId, productType, payload);
		}

		const query = {
			lender_id: lenderId,
			product_type: productType,
			matched_variation_ids: matchedVariationIds,
			property_state: geoContext?.state,
			property_city: geoContext?.city,
			zone_type: geoContext?.zoneType
		};
		const resolved = await resolvePolicy(query as any);
		if (!resolved?.resolved_fields) return [];
		return Object.entries(resolved.resolved_fields)
			.filter(([, v]) => v !== null && v !== undefined)
			.map(([key, value]) => ({
				policy_key: key,
				label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
				value: value as string | number | boolean,
				category: deriveCategory(key),
				display_on_offer_card: true
			}));
	} catch {
		return [];
	}
}

export function mergePolicies(
	dbPolicies: ParsedPolicy[],
	staticPolicies: ParsedPolicy[]
): ParsedPolicy[] {
	const merged = new Map<string, ParsedPolicy>();
	for (const p of staticPolicies) merged.set(p.policy_key, p);
	for (const p of dbPolicies) merged.set(p.policy_key, p);
	return [...merged.values()];
}

// ============================================================================
// BATCHED RESOLUTION (PERF: N lenders → 3 DB queries total, not 3N)
// ============================================================================

/** Convert a ResolvedPolicy's resolved_fields map into the ParsedPolicy[] shape
 *  that evaluation consumers expect. Extracted so the single-lender and
 *  batched paths produce byte-equivalent output. */
function resolvedFieldsToParsedPolicies(resolved: ResolvedPolicy | undefined): ParsedPolicy[] {
	if (!resolved?.resolved_fields) return [];
	return Object.entries(resolved.resolved_fields)
		.filter(([, v]) => v !== null && v !== undefined)
		.map(([key, value]) => ({
			policy_key: key,
			label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			value: value as string | number | boolean,
			category: deriveCategory(key),
			display_on_offer_card: true
		}));
}

/**
 * Resolve DB-driven policies for many lenders in a single batched pass.
 *
 * Before this function existed, the rule engine called `resolvePoliciesForLender`
 * in `Promise.all` over N lenders — that's up to 3N DB queries per evaluation
 * (N× ProductVariations + N× PolicyRules + N× PolicyVersions), offset only by
 * the in-memory cache in `policyResolver`.
 *
 * This function collapses that to 3 queries regardless of N:
 *   1. One `ProductVariations` query ($in on all product_ids)
 *   2. One `PolicyRules` query ($in on product_ids + union of geo scopes + variations)
 *   3. One `PolicyVersions` query ($in on all matched rules' active_version_ids)
 *
 * Per-lender policy resolution (sort + merge + provenance) is then done in
 * memory using the same helpers the single-lender path uses — results are
 * byte-equivalent. Cache-aware: already-cached queries are served from cache
 * and excluded from the batched DB round-trip.
 *
 * @param lenderIds   Array of lender slug IDs (e.g. ["hdfc-bank", "sbi", ...]).
 * @param productType Product type slug (e.g. "HL_NEW").
 * @param geoContext  Property geography for specificity cascade.
 * @param payload     Full loan application payload (required for variation matching).
 * @returns Map keyed by `lender_id`, values are `ParsedPolicy[]`. Every
 *          input `lender_id` is present in the map (value is `[]` on no match
 *          or DB failure — same graceful-fallback semantics as the single-lender
 *          function).
 */
export async function resolvePoliciesForLenders(
	lenderIds: string[],
	productType: string,
	geoContext: { state?: string; city?: string; zoneType?: string } | undefined,
	payload: Record<string, unknown>
): Promise<Map<string, ParsedPolicy[]>> {
	const result = new Map<string, ParsedPolicy[]>();
	for (const id of lenderIds) result.set(id, []);

	if (lenderIds.length === 0) return result;

	try {
		// Step 1: Batched variation matching — ONE DB query for all lenders.
		const { matchVariationsForProducts } = await import('./variationMatcher.js');
		const productIds = lenderIds.map((id) => `${id}:${productType}`);
		const variationsByProduct = await matchVariationsForProducts(productIds, payload);

		// Step 2: Build one policy-resolution query per lender using the matched
		//         variations, then batch-resolve — 2 more DB queries total.
		// `as any` matches the single-lender path in this file: `PolicyResolutionQuery`
		// narrows `product_type` to `ProductType` (string-literal union) and
		// `zone_type` to `ZoneType`, which the loose string inputs here cannot
		// satisfy at compile time.
		const { resolvePoliciesForMany } = await import('$lib/server/policyResolver.js');
		const queries = lenderIds.map((lenderId) => ({
			lender_id: lenderId,
			product_type: productType,
			matched_variation_ids: variationsByProduct.get(`${lenderId}:${productType}`) ?? [],
			property_state: geoContext?.state,
			property_city: geoContext?.city,
			zone_type: geoContext?.zoneType
		})) as unknown as PolicyResolutionQuery[];

		const resolved = await resolvePoliciesForMany(queries);

		// Step 3: Shape each lender's ResolvedPolicy into ParsedPolicy[] (same
		//         transformation the single-lender function does).
		for (let i = 0; i < lenderIds.length; i++) {
			result.set(lenderIds[i], resolvedFieldsToParsedPolicies(resolved[i]));
		}

		return result;
	} catch {
		// Graceful fallback — every lender gets []; caller merges with static policies.
		return result;
	}
}
