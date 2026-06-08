/**
 * PATCH /api/sources/[source_id] — Update source
 * DELETE /api/sources/[source_id] — Deactivate source
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { Sources } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { requireTeamPermission } from '$lib/server/guards.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { sourceUpdateSchema } from '$lib/schemas/source.schema.js';
import { ObjectId } from 'mongodb';
import { parseJsonBody, apiOk, apiError, apiValidationError } from '$lib/server/apiResponse.js';

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'sources_manage');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	let sourceId: ObjectId;
	try {
		sourceId = new ObjectId(params.source_id);
	} catch {
		return apiError('Invalid source ID', 400);
	}

	const source = await Sources.findOne({ _id: sourceId, dsa_id: result.dsaId });
	if (!source) {
		return apiError('Source not found', 404);
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;
	const parsed = sourceUpdateSchema.safeParse(jsonParsed.data);
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
	// against a future refactor that removes the gate. (DELETE below
	// already scopes its updateOne — this brings PATCH to parity.)
	await Sources.updateOne({ _id: sourceId, dsa_id: result.dsaId }, updateOp);

	return apiOk({ updated: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;
	const permDenied = requireTeamPermission(locals, 'sources_manage');
	if (permDenied) return permDenied;

	const result = await resolveEffectiveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	let sourceId: ObjectId;
	try {
		sourceId = new ObjectId(params.source_id);
	} catch {
		return apiError('Invalid source ID', 400);
	}

	// Soft-deactivate
	await Sources.updateOne(
		{ _id: sourceId, dsa_id: result.dsaId },
		{ $set: { is_active: false, updated_at: new Date() } }
	);

	return apiOk({ deactivated: true });
};
