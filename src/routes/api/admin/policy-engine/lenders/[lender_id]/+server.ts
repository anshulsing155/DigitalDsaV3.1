/**
 * GET/PATCH /api/admin/policy-engine/lenders/[lender_id]
 * Get lender detail (with products/variations/rules) or update lender.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import {
	apiError,
	apiOk,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import {
	Lenders,
	LenderProducts,
	ProductVariations,
	PolicyRules,
	PolicyAuditLogs
} from '$lib/database/mongo.js';
import { PRODUCT_TYPE_LABELS } from '$lib/types/policyEngine.js';
import type { LenderClassification, LenderStatus } from '$lib/types/policyEngine.js';
import { z } from 'zod';

/** Zod schema for PATCH lender updates — all fields optional since it's a partial update */
const patchLenderSchema = z
	.object({
		lender_name: z.string().min(1).optional(),
		classification: z.enum(['PVT', 'GOV', 'NBFC']).optional(),
		status: z.enum(['active', 'inactive', 'archived']).optional(),
		meta: z.record(z.string(), z.unknown()).optional()
	})
	.strict();

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const { lender_id } = params;
		const lender = await Lenders.findOne({ lender_id });
		if (!lender) {
			return apiError('Lender not found', 404);
		}

		const [products, variations, rules] = await Promise.all([
			LenderProducts.find(
				{ lender_id },
				{
					projection: {
						product_id: 1,
						lender_id: 1,
						product_type: 1,
						is_active: 1,
						notes: 1,
						created_at: 1,
						updated_at: 1
					}
				}
			)
				.sort({ product_type: 1 })
				.toArray(),
			ProductVariations.find(
				{ lender_id },
				{
					projection: {
						variation_id: 1,
						product_id: 1,
						lender_id: 1,
						label: 1,
						slug: 1,
						category: 1,
						match_condition: 1,
						match_priority: 1,
						is_active: 1,
						created_at: 1,
						updated_at: 1
					}
				}
			)
				.sort({ variation_id: 1 })
				.toArray(),
			// Only need _id (for count) and active_version_id (for active filter)
			PolicyRules.find(
				{ lender_id, is_active: true },
				{
					projection: { _id: 1, active_version_id: 1 }
				}
			).toArray()
		]);

		return apiOk({
			...lender,
			_id: lender._id.toString(),
			products: products.map((p) => ({
				...p,
				_id: p._id.toString(),
				product_label: PRODUCT_TYPE_LABELS[p.product_type] || p.product_type
			})),
			variations: variations.map((v) => ({
				...v,
				_id: v._id.toString()
			})),
			rules_count: rules.length,
			active_rules_count: rules.filter((r) => r.active_version_id !== null).length
		});
	} catch (err) {
		return apiServerError(err, 'Failed to get lender');
	}
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<z.infer<typeof patchLenderSchema>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = patchLenderSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid input', validated.error.issues);
	}
	const body = validated.data;

	try {
		const { lender_id } = params;

		const lender = await Lenders.findOne({ lender_id });
		if (!lender) {
			return apiError('Lender not found', 404);
		}

		const updates: Record<string, unknown> = { updated_at: new Date() };

		if (body.lender_name !== undefined) updates.lender_name = body.lender_name.trim();
		if (body.classification !== undefined) {
			updates.classification = body.classification as LenderClassification;
		}
		if (body.status !== undefined) {
			updates.status = body.status as LenderStatus;
		}
		if (body.meta !== undefined) updates.meta = body.meta;

		await Lenders.updateOne({ lender_id }, { $set: updates });

		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: lender_id,
			action: 'lender_updated',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { updated_fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
			created_at: new Date()
		} as any);

		return apiOk({ lender_id, updated: true });
	} catch (err) {
		return apiServerError(err, 'Failed to update lender');
	}
};
