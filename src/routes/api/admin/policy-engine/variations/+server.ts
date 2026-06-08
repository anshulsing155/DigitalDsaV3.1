/**
 * GET/POST /api/admin/policy-engine/variations
 * List and create product variations.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { LenderProducts, ProductVariations, PolicyAuditLogs } from '$lib/database/mongo.js';
import type { VariationCategory } from '$lib/types/policyEngine.js';

const VALID_CATEGORIES: VariationCategory[] = [
	'standard',
	'borrower_type',
	'employment_type',
	'property_type',
	'special_scheme',
	'custom'
];

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const product_id = url.searchParams.get('product_id');
		const lender_id = url.searchParams.get('lender_id');
		const filter: Record<string, unknown> = {};
		if (product_id) filter.product_id = product_id;
		if (lender_id) filter.lender_id = lender_id;

		const variations = await ProductVariations.find(filter).sort({ variation_id: 1 }).toArray();
		return apiOk(
			variations.map((v) => ({
				...v,
				_id: v._id.toString()
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list variations');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, any>>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		const { product_id, label, slug, category } = body;

		if (!product_id || typeof product_id !== 'string') {
			return apiError('product_id is required', 400);
		}
		if (!label || typeof label !== 'string') {
			return apiError('label is required', 400);
		}
		if (!slug || typeof slug !== 'string') {
			return apiError('slug is required', 400);
		}
		if (!category || !VALID_CATEGORIES.includes(category)) {
			return apiError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`, 400);
		}

		// Verify product exists
		const product = await LenderProducts.findOne({ product_id });
		if (!product) {
			return apiError('Product not found', 404);
		}

		const variation_id = `${product_id}:${slug}`;

		// Check uniqueness
		const existing = await ProductVariations.findOne({ variation_id });
		if (existing) {
			return apiError(`Variation "${variation_id}" already exists`, 409);
		}

		const now = new Date();
		const doc = {
			variation_id,
			product_id,
			lender_id: product.lender_id,
			label: label.trim(),
			slug,
			category: category as VariationCategory,
			match_condition: body.match_condition || null,
			match_priority: typeof body.match_priority === 'number' ? body.match_priority : 0,
			is_active: true,
			created_at: now,
			updated_at: now
		};

		const result = await ProductVariations.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'variation',
			target_id: variation_id,
			action: 'variation_created',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { product_id, label, slug, category },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), variation_id }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create variation');
	}
};
