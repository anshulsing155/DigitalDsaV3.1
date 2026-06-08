import { type RequestHandler } from '@sveltejs/kit';
import { QaScenarios } from '$lib/database/mongo.js';
import { toObjectId } from '$lib/testing/qaHelpers.js';
import { requireAuthApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import type { UpdateScenarioRequest } from '$lib/types/qaScenario.js';

// ─── GET /api/qa/scenarios/[id] ───────────────────────────────────────────────
// Full scenario detail including payload (used in detail view and run page).

export const GET: RequestHandler = async ({ locals, params }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_view');
	if (permDenied) return permDenied;

	const _id = toObjectId(params.id ?? '');
	if (!_id) return apiError('Invalid scenario ID', 400);

	try {
		const scenario = await QaScenarios.findOne({ _id });
		if (!scenario) return apiError('Scenario not found', 404);

		return apiOk({ scenario });
	} catch (err) {
		logger.error({ err, id: params.id }, 'GET /api/qa/scenarios/[id] failed');
		return apiServerError(err);
	}
};

// ─── PATCH /api/qa/scenarios/[id] ────────────────────────────────────────────
// Update the tester-editable fields: note, expected warnings, archived state.
// autoName, payload, meta are never updated here — they are derived from form answers.

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_write');
	if (permDenied) return permDenied;

	const _id = toObjectId(params.id ?? '');
	if (!_id) return apiError('Invalid scenario ID', 400);

	const body = await parseJsonBody<UpdateScenarioRequest>(request);
	if (!body.ok) return body.response;

	const { testerNote, expectedWarnings, isArchived } = body.data;

	// Build update object with only the fields that were sent
	const $set: Record<string, unknown> = { updatedAt: new Date() };
	if (testerNote !== undefined) $set['testerNote'] = testerNote;
	if (expectedWarnings !== undefined) $set['expectedWarnings'] = expectedWarnings;
	if (isArchived !== undefined) $set['isArchived'] = isArchived;

	try {
		const result = await QaScenarios.updateOne({ _id }, { $set });
		if (result.matchedCount === 0) return apiError('Scenario not found', 404);

		logger.info({ id: params.id, $set }, 'QA scenario updated');
		return apiOk({ updated: true });
	} catch (err) {
		logger.error({ err, id: params.id }, 'PATCH /api/qa/scenarios/[id] failed');
		return apiServerError(err);
	}
};

// ─── DELETE /api/qa/scenarios/[id] ───────────────────────────────────────────
// Soft delete — sets isArchived: true. Hard delete is not exposed.

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_write');
	if (permDenied) return permDenied;

	const _id = toObjectId(params.id ?? '');
	if (!_id) return apiError('Invalid scenario ID', 400);

	try {
		const result = await QaScenarios.updateOne(
			{ _id },
			{ $set: { isArchived: true, updatedAt: new Date() } }
		);
		if (result.matchedCount === 0) return apiError('Scenario not found', 404);

		logger.info({ id: params.id }, 'QA scenario archived');
		return apiOk({ archived: true });
	} catch (err) {
		logger.error({ err, id: params.id }, 'DELETE /api/qa/scenarios/[id] failed');
		return apiServerError(err);
	}
};
