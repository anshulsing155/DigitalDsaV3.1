import { type RequestHandler } from '@sveltejs/kit';
import { QaScenarios } from '$lib/database/mongo.js';
import { requireAuthApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { deriveFixtureName } from '$lib/testing/deriveFixtureName.js';
import { buildLoanPayload } from '$lib/utils/payloadBuilder.js';
import { extractMeta, toObjectId } from '$lib/testing/qaHelpers.js';

interface CloneRequest {
	/** Override specific loanAnswers keys (e.g. change CIBIL, city). */
	loanAnswerOverrides?: Record<string, unknown>;
	/** Override specific keys on the primary applicant. */
	primaryApplicantOverrides?: Record<string, unknown>;
	/** Optional note for the cloned scenario. */
	testerNote?: string;
}

// ─── POST /api/qa/scenarios/[id]/clone ───────────────────────────────────────
// Clone an existing scenario with optional overrides on specific fields.
// The clone rebuilds autoName and payload from the merged answers.
//
// Example: clone a CIBIL 750 scenario with { primaryApplicantOverrides: { creditScore: 620 } }
// → new scenario "... · CIBIL 620 · ... · Low CIBIL" saved alongside the original.

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_write');
	if (permDenied) return permDenied;

	const _id = toObjectId(params.id ?? '');
	if (!_id) return apiError('Invalid scenario ID', 400);

	const body = await parseJsonBody<CloneRequest>(request);
	if (!body.ok) return body.response;

	const { loanAnswerOverrides = {}, primaryApplicantOverrides = {}, testerNote = '' } = body.data;

	try {
		const source = await QaScenarios.findOne({ _id });
		if (!source) return apiError('Source scenario not found', 404);

		// Merge overrides into the source's form answers
		const loanAnswers = { ...source.loanAnswers, ...loanAnswerOverrides };
		const applicants = source.applicants.map((a, index) =>
			index === 0 ? { ...a, ...primaryApplicantOverrides } : { ...a }
		);
		const applicationData = source.applicationData;
		const relationships = source.relationships;

		// Rebuild payload from merged answers — ensures the clone is always valid
		let payload;
		try {
			payload = buildLoanPayload(loanAnswers, applicants, applicationData, relationships);
		} catch (buildErr) {
			logger.warn({ buildErr }, 'POST /api/qa/scenarios/[id]/clone — buildLoanPayload failed');
			return apiError(`Overrides produced an invalid payload: ${String(buildErr)}`);
		}

		const autoName = deriveFixtureName(loanAnswers, applicants);
		const meta = extractMeta(loanAnswers, applicants, autoName);
		const now = new Date();

		const result = await QaScenarios.insertOne({
			autoName,
			testerNote: testerNote || `Cloned from: ${source.autoName}`,
			loanAnswers,
			applicationData,
			applicants,
			relationships,
			payload,
			meta,
			expectedWarnings: [...source.expectedWarnings],
			lastRunAt: null,
			lastRunResult: null,
			lastRunDetails: null,
			createdBy: locals.user?.id ?? 'unknown',
			createdAt: now,
			updatedAt: now,
			isArchived: false
		});

		logger.info(
			{ newId: result.insertedId, sourceId: params.id, autoName },
			'QA scenario cloned'
		);
		return apiOk({ id: result.insertedId.toString(), autoName }, 201);
	} catch (err) {
		logger.error({ err, id: params.id }, 'POST /api/qa/scenarios/[id]/clone failed');
		return apiServerError(err);
	}
};

