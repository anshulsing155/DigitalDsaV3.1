/**
 * Variation Matcher — evaluates which ProductVariation records match a payload.
 *
 * ProductVariations have JSON-Logic `match_condition` fields that are evaluated
 * against the enriched loan payload. For example, a "Women Borrower" variation
 * might match when the primary applicant's gender is "Female".
 *
 * The matcher queries active variations for a given product, evaluates each
 * condition against the payload, and returns sorted matched variation IDs.
 */

import jsonLogic from 'json-logic-js';
import logger from '$lib/server/logger.js';
import { selectYoungest, selectHighestCibil, selectBestEmployment } from './applicantSelectors.js';

// ============================================================================
// PAYLOAD FLATTENING
// ============================================================================

/**
 * Build a flat context object from the loan payload for JSON-Logic evaluation.
 *
 * Variation match_conditions are simple JSON-Logic rules (e.g. {"==": [{"var": "gender"}, "Female"]}).
 * This function extracts commonly used fields into a flat namespace so condition
 * authors don't need to navigate deeply nested payload structures.
 */
function buildVariationContext(payload: Record<string, unknown>): Record<string, unknown> {
	const tx = (payload.loanTransaction ?? {}) as Record<string, unknown>;
	const applicants = (payload.allApplicantDetails ?? []) as Record<string, unknown>[];

	// Use purpose-specific selectors instead of blind applicants[0]
	const youngestApplicant = selectYoungest(applicants) ?? {};
	const bestCibilApplicant = selectHighestCibil(applicants) ?? {};
	const bestEmploymentApplicant = selectBestEmployment(applicants) ?? {};

	// Age from youngest (maximizes tenure), employment from best (most favorable for rules)
	const primaryAge = Number(youngestApplicant.age) || 0;
	const primaryEmploymentType = String(bestEmploymentApplicant.employmentType ?? '');

	// Gender/NRI: use applicants[0] as-is since these are lender-specific preferences
	// and there's no universal "best" — the DSA's ordering intent matters here
	const firstApplicant = applicants[0] ?? {};

	return {
		// ── Full transaction fields as base ───────────────────────────────
		// Spread tx first so named fields below take precedence.
		// Any field in tx that doesn't have an explicit mapping is still
		// accessible for custom variation conditions.
		...tx,

		// ── Loan-level fields (override tx with normalized names) ────────
		loanType: tx.loanType ?? tx.LoanType ?? '',
		loanName: tx.LoanName ?? tx.loanName ?? '',
		propertyType: tx.propertyType ?? '',
		propertyStage: tx.PropertyStage ?? '',
		purchaseType: tx.purchaseType ?? '',
		propertyIdentified: tx.propertyIdentified ?? '',
		propCost: Number(tx.propCost) || 0,
		loanAmount: Number(tx.RequiredLoanAmount) || 0,

		// ── Primary applicant fields (purpose-selected) ──────────────────
		gender: firstApplicant.gender ?? '',
		age: primaryAge,
		isNRI: firstApplicant.isNRI ?? 'No',
		employmentType: primaryEmploymentType,
		creditScore: Number(bestCibilApplicant.creditScore) || 0,

		// ── Computed convenience flags ────────────────────────────────────
		// These let variation conditions use simple boolean checks instead of
		// repeating the same logic in every match_condition.
		applicantCount: applicants.length,
		hasCoApplicant: applicants.length > 1,
		isSeniorCitizen: primaryAge >= 60,
		isSelfEmployed: [
			'Self-employed(Professional)',
			'Self-employed(Businessman)',
			'Self-employed(Other)'
		].includes(primaryEmploymentType),
		isSalaried: ['Salaried(Private)', 'Salaried(Government)'].includes(primaryEmploymentType),
		isGovernment: primaryEmploymentType === 'Salaried(Government)',
		isWoman: String(firstApplicant.gender ?? '').toLowerCase() === 'female'
	};
}

// ============================================================================
// MAIN MATCHER
// ============================================================================

/**
 * Query active ProductVariation records for a lender+product and evaluate
 * each one's match_condition against the loan payload.
 *
 * @param lenderId   - The lender's slug ID (e.g. "hdfc-bank")
 * @param productType - Product type slug (e.g. "HL_NEW", "PL")
 * @param payload    - The full loan application payload (pre- or post-enrichment)
 * @returns Sorted array of matched variation_id strings (highest priority first).
 *          Returns [] on any error (graceful fallback — evaluation continues without variations).
 */
export async function matchVariationsForProduct(
	lenderId: string,
	productType: string,
	payload: Record<string, unknown>
): Promise<string[]> {
	try {
		const { ProductVariations } = await import('$lib/database/mongo.js');

		// Composite product_id matches the DB index: "{lender_id}:{product_type}"
		const productId = `${lenderId}:${productType}`;

		// Fetch only active variations for this product
		const variations = await ProductVariations.find({
			product_id: productId,
			is_active: true
		}).toArray();

		if (variations.length === 0) return [];

		// Flatten the payload into a simple key-value context for JSON-Logic
		const flatContext = buildVariationContext(payload);

		// Evaluate each variation's match_condition against the flat context
		const matched = variations.filter((variation) => {
			// null match_condition = "standard" variation — always matches
			if (variation.match_condition === null) return true;

			try {
				const result = jsonLogic.apply(variation.match_condition, flatContext);
				return !!result;
			} catch (err) {
				// A single broken condition should not disqualify the entire batch.
				// Log and skip this variation.
				logger.warn(
					{ err, variationId: variation.variation_id, productId },
					'Variation match_condition evaluation failed — skipping variation'
				);
				return false;
			}
		});

		// Sort by match_priority descending (higher priority = first in list)
		matched.sort((a, b) => (b.match_priority ?? 0) - (a.match_priority ?? 0));

		const matchedIds = matched.map((v) => v.variation_id);

		logger.debug(
			{
				productId,
				totalVariations: variations.length,
				matchedCount: matchedIds.length,
				matchedIds
			},
			'Variation matching complete'
		);

		return matchedIds;
	} catch (err) {
		// Graceful fallback — if DB query or any step fails, return empty.
		// The policy resolver will proceed with no variation-specific rules,
		// which is equivalent to the previous hardcoded [] behavior.
		logger.warn({ err, lenderId, productType }, 'Variation matching failed — returning empty');
		return [];
	}
}

// ============================================================================
// BATCHED MATCHER (PERF: 1 DB query for N products instead of N)
// ============================================================================

/**
 * Batched variant of `matchVariationsForProduct`. Queries all variations
 * across a set of `product_id`s in ONE DB round-trip, then evaluates each
 * product's variations against the shared payload context.
 *
 * Use this from call sites that resolve policies for many lenders at once
 * (e.g. the rule engine's per-lender evaluation loop). For a single lender,
 * prefer `matchVariationsForProduct`.
 *
 * Context semantics are identical to the single-product function: the
 * `buildVariationContext(payload)` result is shared across all products
 * because it is lender-independent (applicant selectors + loan-level fields).
 *
 * @param productIds Array of composite product_id strings (e.g.
 *                   `["hdfc-bank:HL_NEW", "sbi:HL_NEW", ...]`)
 * @param payload    Full loan application payload
 * @returns Map keyed by `product_id`, values are sorted matched `variation_id`s
 *          (same ordering as the single-product function). Every input
 *          `product_id` is present in the map, even when it matched no
 *          variations (value is `[]`). On DB failure, all values are `[]`.
 */
export async function matchVariationsForProducts(
	productIds: string[],
	payload: Record<string, unknown>
): Promise<Map<string, string[]>> {
	const result = new Map<string, string[]>();
	for (const pid of productIds) result.set(pid, []);

	if (productIds.length === 0) return result;

	try {
		const { ProductVariations } = await import('$lib/database/mongo.js');

		// De-dupe product_ids to avoid passing duplicates to Mongo.
		const uniqueIds = [...new Set(productIds)];

		const variations = await ProductVariations.find({
			product_id: { $in: uniqueIds },
			is_active: true
		}).toArray();

		if (variations.length === 0) return result;

		// Group fetched variations by product_id so per-product matching
		// operates on a smaller list and doesn't iterate the entire batch.
		const byProduct = new Map<string, typeof variations>();
		for (const v of variations) {
			const list = byProduct.get(v.product_id);
			if (list) {
				list.push(v);
			} else {
				byProduct.set(v.product_id, [v]);
			}
		}

		// Context is lender-independent — compute once and reuse.
		const flatContext = buildVariationContext(payload);

		for (const [productId, varList] of byProduct) {
			const matched = varList.filter((variation) => {
				// null match_condition = "standard" variation — always matches
				if (variation.match_condition === null) return true;

				try {
					return !!jsonLogic.apply(variation.match_condition, flatContext);
				} catch (err) {
					logger.warn(
						{ err, variationId: variation.variation_id, productId },
						'Variation match_condition evaluation failed — skipping variation'
					);
					return false;
				}
			});

			// Sort by match_priority DESC (higher priority first) — identical
			// ordering to matchVariationsForProduct.
			matched.sort((a, b) => (b.match_priority ?? 0) - (a.match_priority ?? 0));

			result.set(
				productId,
				matched.map((v) => v.variation_id)
			);
		}

		return result;
	} catch (err) {
		// Graceful fallback — same behavior as the single-product function:
		// return empty arrays for every input product_id.
		logger.warn({ err, count: productIds.length }, 'Batched variation matching failed');
		return result;
	}
}
