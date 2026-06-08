/**
 * PATCH /api/crm-lenders/[lender_id] — Update lender relationship
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { CRMLenders } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { apiOk, apiError, apiValidationError, parseJsonBody } from '$lib/server/apiResponse.js';

const crmLenderUpdateSchema = z.object({
	lender_name: z.string().min(1).max(200).optional(),
	branch: z.string().max(200).nullable().optional(),
	city: z.string().max(100).nullable().optional(),
	empanelled: z.boolean().optional(),
	dsa_code_at_lender: z.string().max(50).nullable().optional(),
	is_active: z.boolean().optional()
});

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	let lenderId: ObjectId;
	try {
		lenderId = new ObjectId(params.lender_id);
	} catch {
		return apiError('Invalid lender ID', 400);
	}

	const lender = await CRMLenders.findOne({ _id: lenderId, dsa_id: result.dsaId });
	if (!lender) {
		return apiError('Lender not found', 404);
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;
	const parsed = crmLenderUpdateSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		const errors: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = issue.path[0] as string;
			if (!errors[key]) errors[key] = issue.message;
		}
		return apiValidationError('Validation failed', errors);
	}

	const updates = parsed.data;
	const setFields: Record<string, any> = { updated_at: new Date() };
	const unsetFields: Record<string, any> = {};

	for (const [key, val] of Object.entries(updates)) {
		if (val === null) {
			unsetFields[key] = '';
		} else if (val !== undefined) {
			setFields[key] = val;
		}
	}

	const updateOp: any = { $set: setFields };
	if (Object.keys(unsetFields).length > 0) {
		updateOp.$unset = unsetFields;
	}

	// Defense-in-depth: scope the write to (_id, dsa_id) too. The findOne
	// above is the BOLA gate; keeping the same scope on the write protects
	// against a future refactor that removes the gate.
	await CRMLenders.updateOne({ _id: lenderId, dsa_id: result.dsaId }, updateOp);

	return apiOk({ updated: true });
};
