/**
 * GET/POST /api/admin/policy-engine/lenders
 * List and create lenders.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { Lenders, PolicyAuditLogs } from '$lib/database/mongo.js';
import { toLenderSlug } from '$lib/types/policyEngine.js';
import type { LenderClassification, LenderStatus } from '$lib/types/policyEngine.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const status = url.searchParams.get('status') as LenderStatus | null;
		const filter: Record<string, unknown> = {};
		if (status) filter.status = status;

		const lenders = await Lenders.find(filter).sort({ lender_name: 1 }).toArray();
		return apiOk(
			lenders.map((l) => ({
				...l,
				_id: l._id.toString()
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list lenders');
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
		const lender_name = (body.lender_name || '').trim();
		if (!lender_name) {
			return apiError('lender_name is required', 400);
		}

		const classification: LenderClassification = body.classification || 'PVT';
		if (!['PVT', 'GOV', 'NBFC'].includes(classification)) {
			return apiError('classification must be PVT, GOV, or NBFC', 400);
		}

		const lender_id = body.lender_id || toLenderSlug(lender_name);

		// Check uniqueness
		const existing = await Lenders.findOne({ lender_id });
		if (existing) {
			return apiError(`Lender with ID "${lender_id}" already exists`, 409);
		}

		const now = new Date();
		const doc = {
			lender_id,
			lender_name,
			classification,
			status: 'active' as LenderStatus,
			bank_name_value: body.bank_name_value || lender_name,
			meta: body.meta || {},
			created_at: now,
			updated_at: now
		};

		const result = await Lenders.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'lender',
			target_id: lender_id,
			action: 'lender_created',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { lender_name, classification },
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString(), lender_id, lender_name }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create lender');
	}
};
