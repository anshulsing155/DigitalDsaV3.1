/**
 * GET/POST /api/admin/policy-engine/rules
 * List and create policy rules (matrix slots).
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { PolicyRules, ProductVariations, GeoScopes, PolicyAuditLogs } from '$lib/database/mongo.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const lender_id = url.searchParams.get('lender_id');
		const variation_id = url.searchParams.get('variation_id');
		const geo_scope_id = url.searchParams.get('geo_scope_id');
		const filter: Record<string, unknown> = {};
		if (lender_id) filter.lender_id = lender_id;
		if (variation_id) filter.variation_id = variation_id;
		if (geo_scope_id) filter.geo_scope_id = geo_scope_id;

		const rules = await PolicyRules.find(filter).sort({ policy_rule_id: 1 }).toArray();
		return apiOk(
			rules.map((r) => ({
				...r,
				_id: r._id.toString(),
				active_version_id: r.active_version_id?.toString() || null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list rules');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{
		variation_id: string;
		geo_scope_id: string;
		is_cross_variation?: boolean;
	}>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		const { variation_id, geo_scope_id } = body;

		if (!variation_id || typeof variation_id !== 'string') {
			return apiError('variation_id is required', 400);
		}
		if (!geo_scope_id || typeof geo_scope_id !== 'string') {
			return apiError('geo_scope_id is required', 400);
		}

		// Verify references
		const variation = await ProductVariations.findOne({ variation_id });
		if (!variation) {
			return apiError('Variation not found', 404);
		}
		const geo = await GeoScopes.findOne({ geo_scope_id });
		if (!geo) {
			return apiError('GeoScope not found', 404);
		}

		const policy_rule_id = `${variation_id}@${geo_scope_id}`;

		const existing = await PolicyRules.findOne({ policy_rule_id });
		if (existing) {
			return apiError(`Rule "${policy_rule_id}" already exists`, 409);
		}

		const now = new Date();
		const doc = {
			policy_rule_id,
			variation_id,
			geo_scope_id,
			lender_id: variation.lender_id,
			product_id: variation.product_id,
			active_version_id: null,
			active_version_number: null,
			is_cross_variation: body.is_cross_variation === true,
			is_active: true,
			created_at: now,
			updated_at: now
		};

		const result = await PolicyRules.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_rule',
			target_id: policy_rule_id,
			action: 'rule_created',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { variation_id, geo_scope_id, is_cross_variation: doc.is_cross_variation },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), policy_rule_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create rule');
	}
};
