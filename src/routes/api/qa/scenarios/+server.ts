import { type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { QaScenarios } from '$lib/database/mongo.js';
import { requireAuthApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { deriveFixtureName } from '$lib/testing/deriveFixtureName.js';
import { buildLoanPayload } from '$lib/utils/payloadBuilder.js';
import type { SaveScenarioRequest } from '$lib/types/qaScenario.js';
import { extractMeta, toObjectId } from '$lib/testing/qaHelpers.js';

// ─── GET /api/qa/scenarios ────────────────────────────────────────────────────
// List scenarios with optional filters. Returns non-archived by default.

export const GET: RequestHandler = async ({ locals, url }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_view');
	if (permDenied) return permDenied;

	try {
		const loanType = url.searchParams.get('loanType');
		const employment = url.searchParams.get('employment');
		const lastRunResult = url.searchParams.get('lastRunResult');
		const tag = url.searchParams.get('tag');
		const includeArchived = url.searchParams.get('includeArchived') === 'true';
		const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
		const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'));
		const skip = (page - 1) * limit;

		const filter: Record<string, unknown> = { isArchived: includeArchived ? { $in: [true, false] } : false };

		if (loanType) filter['meta.loanType'] = loanType;
		if (employment) filter['meta.employment'] = employment;
		if (lastRunResult) filter['lastRunResult'] = lastRunResult;
		if (tag) filter['meta.tags'] = tag;

		const [scenarios, total] = await Promise.all([
			QaScenarios.find(filter, {
				// Don't return full payload in list view — it's large and unused there
				projection: {
					autoName: 1, testerNote: 1, meta: 1, expectedWarnings: 1,
					lastRunAt: 1, lastRunResult: 1, createdBy: 1, createdAt: 1,
					updatedAt: 1, isArchived: 1
				}
			})
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.toArray(),
			QaScenarios.countDocuments(filter)
		]);

		return apiOk({
			scenarios,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		});
	} catch (err) {
		logger.error({ err }, 'GET /api/qa/scenarios failed');
		return apiServerError(err);
	}
};

// ─── POST /api/qa/scenarios ───────────────────────────────────────────────────
// Save a new scenario captured from the form.

export const POST: RequestHandler = async ({ locals, request }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	// Save Scenario is a DEV-only utility surfaced via FormShell's {#if dev} modal.
	// In dev mode any authenticated user can save (so devs/QAs don't need an admin
	// login to capture form state). In production the admin permission gates it.
	if (!dev) {
		const permDenied = requireAdminPermission(locals, 'qa_write');
		if (permDenied) return permDenied;
	}

	const body = await parseJsonBody<SaveScenarioRequest>(request);
	if (!body.ok) return body.response;

	const { loanAnswers, applicationData, applicants, relationships = [], testerNote = '', expectedWarnings = [] } = body.data;

	if (!loanAnswers || !applicants?.length) {
		return apiError('loanAnswers and at least one applicant are required');
	}

	try {
		// Build payload via the real form builder — same path as a live submission.
		// If this throws, the scenario has invalid form answers and must not be saved.
		let payload;
		try {
			payload = buildLoanPayload(loanAnswers, applicants, applicationData, relationships);
		} catch (buildErr) {
			logger.warn({ buildErr }, 'POST /api/qa/scenarios — buildLoanPayload failed');
			return apiError(`Form answers produced an invalid payload: ${String(buildErr)}`);
		}

		const autoName = deriveFixtureName(loanAnswers, applicants);
		const meta = extractMeta(loanAnswers, applicants, autoName);
		const now = new Date();

		const result = await QaScenarios.insertOne({
			autoName,
			testerNote,
			loanAnswers,
			applicationData,
			applicants,
			relationships,
			payload,
			meta,
			expectedWarnings,
			lastRunAt: null,
			lastRunResult: null,
			lastRunDetails: null,
			createdBy: locals.user?.id ?? 'unknown',
			createdAt: now,
			updatedAt: now,
			isArchived: false
		});

		logger.info({ scenarioId: result.insertedId, autoName }, 'QA scenario saved');
		return apiOk({ id: result.insertedId.toString(), autoName }, 201);
	} catch (err) {
		logger.error({ err }, 'POST /api/qa/scenarios failed');
		return apiServerError(err);
	}
};

