/**
 * POST /api/admin/policy-engine/resolve-preview
 * Preview resolved policy for a given query (always skips cache).
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { resolvePolicy } from '$lib/server/policyResolver.js';
import type { PolicyResolutionQuery, ProductType, ZoneType } from '$lib/types/policyEngine.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';

const VALID_PRODUCT_TYPES = new Set(Object.keys(PRODUCT_TYPE_LABELS));

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, any>>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		if (!body.lender_id || typeof body.lender_id !== 'string') {
			return apiError('lender_id is required', 400);
		}
		if (!body.product_type || !VALID_PRODUCT_TYPES.has(body.product_type)) {
			return apiError('Invalid product_type', 400);
		}
		if (!Array.isArray(body.matched_variation_ids) || body.matched_variation_ids.length === 0) {
			return apiError('matched_variation_ids must be a non-empty array', 400);
		}

		const query: PolicyResolutionQuery = {
			lender_id: body.lender_id,
			product_type: body.product_type as ProductType,
			matched_variation_ids: body.matched_variation_ids,
			property_state: body.property_state,
			property_city: body.property_city,
			zone_type: body.zone_type as ZoneType | undefined
		};

		const result = await resolvePolicy(query, { skipCache: true });
		return apiOk(result);
	} catch (err) {
		return apiServerError(err, 'Failed to resolve policy preview');
	}
};
