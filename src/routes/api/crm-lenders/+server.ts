/**
 * GET /api/crm-lenders — List CRM lender relationships
 * POST /api/crm-lenders — Create a lender relationship
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { CRMLenders } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite, requireTeamPermission } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import type { CRMLender } from '$lib/types/crmLender.js';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import {
	apiOk,
	apiError,
	apiValidationError,
	apiServerError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';

const crmLenderCreateSchema = z.object({
	lender_name: z.string().min(1, 'Lender name is required').max(200),
	branch: z.string().max(200).optional(),
	city: z.string().max(100).optional(),
	empanelled: z.boolean(),
	dsa_code_at_lender: z.string().max(50).optional()
});

export const GET: RequestHandler = async ({ locals, url }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const permDenied = requireTeamPermission(locals, 'cases_view');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const activeOnly = url.searchParams.get('active') !== 'false';
	const filter: any = { dsa_id: result.dsaId };
	if (activeOnly) filter.is_active = true;

	const lenders = await CRMLenders.find(filter).sort({ lender_name: 1 }).toArray();

	return apiOk({
		lenders: lenders.map((l) => ({
			...l,
			_id: l._id!.toString(),
			dsa_id: l.dsa_id.toString(),
			rm_contact_ids: l.rm_contact_ids.map((id) => id.toString())
		}))
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'cases_create');
	if (permDenied) return permDenied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);

		const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!jsonParsed.ok) return jsonParsed.response;
		const parsed = crmLenderCreateSchema.safeParse(jsonParsed.data);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) {
				const key = issue.path[0] as string;
				if (!errors[key]) errors[key] = issue.message;
			}
			return apiValidationError('Validation failed', errors);
		}

		const data = parsed.data;
		const now = new Date();

		// Check for duplicate lender_name for this DSA
		const existing = await CRMLenders.findOne({
			dsa_id: result.dsaId,
			lender_name: data.lender_name
		});
		if (existing) {
			return apiError('Lender relationship already exists', 409);
		}

		const newLender: Omit<CRMLender, '_id'> = {
			dsa_id: result.dsaId,
			lender_name: data.lender_name,
			branch: data.branch,
			city: data.city,
			rm_contact_ids: [],
			empanelled: data.empanelled,
			dsa_code_at_lender: data.dsa_code_at_lender,
			total_cases: 0,
			total_sanctioned: 0,
			avg_processing_days: 0,
			is_active: true,
			created_at: now,
			updated_at: now
		};

		const insertResult = await CRMLenders.insertOne(newLender);

		logger.info(
			{
				lenderId: insertResult.insertedId.toString(),
				dsaId: result.dsaId.toString(),
				lenderName: data.lender_name
			},
			'CRM lender created'
		);

		return apiOk({ _id: insertResult.insertedId.toString() }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create CRM lender');
	}
};
