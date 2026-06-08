/**
 * GET /api/admin/policies/proxy-capture/check-existing?lender_id=&product_type=
 * ═══════════════════════════════════════════════════════════════════
 * A.2 Slice 4b — Step-0 dedup. Before an admin keys in a proxy capture,
 * surface any existing non-rejected capture for the same lender + product
 * (across ALL RMs — a policy is per lender + product, not per RM). This is a
 * soft warning only: the create flow still allows continuing (legit reasons:
 * geo variants, deliberate re-capture).
 *
 * Auth: admin role + `rule_authoring` permission.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { PolicyCaptures } from '$lib/database/mongo.js';
import type { ProductType } from '$lib/types/policyEngine.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const lender_id = (url.searchParams.get('lender_id') || '').trim();
	const product_type = (url.searchParams.get('product_type') || '').trim();
	if (!lender_id || !product_type) return apiError('lender_id and product_type are required');

	try {
		const existing = await PolicyCaptures.find({
			lender_id,
			product_type: product_type as ProductType,
			status: { $ne: 'rejected' }
		})
			.sort({ updated_at: -1 })
			.limit(10)
			.toArray();

		return apiOk({
			count: existing.length,
			captures: existing.map((c) => ({
				capture_id: c.capture_id,
				rm_name: c.rm_name,
				status: c.status,
				provenance_source: c.provenance?.source_type ?? 'rm_self',
				updated_at: c.updated_at ? new Date(c.updated_at).toISOString() : null
			}))
		});
	} catch (err) {
		return apiServerError(err, 'Failed to check for existing captures');
	}
};
