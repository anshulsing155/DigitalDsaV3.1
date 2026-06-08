/**
 * GET/POST /api/admin/policy-engine/products
 * List and create lender products.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { Lenders, LenderProducts, PolicyAuditLogs } from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import type { ProductType } from '$lib/types/policyEngine.js';

const VALID_PRODUCT_TYPES = new Set(Object.keys(PRODUCT_TYPE_LABELS));

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const lender_id = url.searchParams.get('lender_id');
		const filter: Record<string, unknown> = {};
		if (lender_id) filter.lender_id = lender_id;

		const products = await LenderProducts.find(filter).sort({ product_id: 1 }).toArray();
		return apiOk(
			products.map((p) => ({
				...p,
				_id: p._id.toString(),
				product_label: PRODUCT_TYPE_LABELS[p.product_type] || p.product_type
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list products');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<{ lender_id: string; product_type: string; notes?: string }>(
		request
	);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		const { lender_id, product_type } = body;

		if (!lender_id || typeof lender_id !== 'string') {
			return apiError('lender_id is required', 400);
		}
		if (!product_type || !VALID_PRODUCT_TYPES.has(product_type)) {
			return apiError(
				`product_type must be one of: ${[...VALID_PRODUCT_TYPES].join(', ')}`,
				400
			);
		}

		// Verify lender exists
		const lender = await Lenders.findOne({ lender_id });
		if (!lender) {
			return apiError('Lender not found', 404);
		}

		const product_id = `${lender_id}:${product_type}`;

		// Check uniqueness
		const existing = await LenderProducts.findOne({ product_id });
		if (existing) {
			return apiError(`Product "${product_id}" already exists`, 409);
		}

		const now = new Date();
		const doc = {
			product_id,
			lender_id,
			product_type: product_type as ProductType,
			is_active: true,
			notes: body.notes || undefined,
			created_at: now,
			updated_at: now
		};

		const result = await LenderProducts.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'product',
			target_id: product_id,
			action: 'product_created',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { lender_id, product_type },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), product_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create product');
	}
};
