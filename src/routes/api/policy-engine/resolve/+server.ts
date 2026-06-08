/**
 * POST /api/policy-engine/resolve
 * ══════════════════════════════════════════════════════════════════
 * Resolves the effective policy for a given lender + product + geography.
 *
 * Input: PolicyResolutionQuery
 * Output: { success: true, data: ResolvedPolicy }
 *
 * Auth: any authenticated user (DSA, RM, admin).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { resolvePolicy } from '$lib/server/policyResolver.js';
import type { PolicyResolutionQuery, ProductType, ZoneType } from '$lib/types/policyEngine.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

const VALID_PRODUCT_TYPES = new Set(Object.keys(PRODUCT_TYPE_LABELS));
const VALID_ZONE_TYPES = new Set(['urban', 'rural', 'semi_urban']);

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const body = jsonParsed.data;

		// ── Validate required fields ──
		if (!body.lender_id || typeof body.lender_id !== 'string') {
			return apiError('lender_id is required and must be a string', 400);
		}

		if (!body.product_type || !VALID_PRODUCT_TYPES.has(body.product_type as string)) {
			return apiError(`product_type must be one of: ${[...VALID_PRODUCT_TYPES].join(', ')}`, 400);
		}

		if (!Array.isArray(body.matched_variation_ids) || body.matched_variation_ids.length === 0) {
			return apiError('matched_variation_ids must be a non-empty array of strings', 400);
		}

		for (const vid of body.matched_variation_ids) {
			if (typeof vid !== 'string') {
				return apiError('All matched_variation_ids must be strings', 400);
			}
		}

		// ── Validate optional fields ──
		if (body.property_state !== undefined && typeof body.property_state !== 'string') {
			return apiError('property_state must be a string if provided', 400);
		}

		if (body.property_city !== undefined && typeof body.property_city !== 'string') {
			return apiError('property_city must be a string if provided', 400);
		}

		if (body.zone_type !== undefined && !VALID_ZONE_TYPES.has(body.zone_type as string)) {
			return apiError(`zone_type must be one of: ${[...VALID_ZONE_TYPES].join(', ')}`, 400);
		}

		// ── Build query ──
		const query: PolicyResolutionQuery = {
			lender_id: body.lender_id,
			product_type: body.product_type as ProductType,
			matched_variation_ids: body.matched_variation_ids,
			property_state: body.property_state,
			property_city: body.property_city,
			zone_type: body.zone_type as ZoneType | undefined
		};

		// ── Resolve ──
		const result = await resolvePolicy(query);

		return apiOk(result);
	} catch (error) {
		return apiServerError(error, 'Failed to resolve policy');
	}
};
