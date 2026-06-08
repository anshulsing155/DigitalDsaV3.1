import { type RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { QaScenarios } from '$lib/database/mongo.js';
import { toObjectId } from '$lib/testing/qaHelpers.js';
import { requireAuthApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { buildLoanPayload } from '$lib/utils/payloadBuilder.js';
import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine.js';
import type { RunScenariosRequest, QaRunDetails } from '$lib/types/qaScenario.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';

// ─── POST /api/qa/scenarios/run ───────────────────────────────────────────────
// Run one or many scenarios through the full pipeline:
//   1. Rebuild payload from stored form answers via buildLoanPayload()
//   2. Run through the rule engine via evaluatePayload()
//   3. Check if expectedWarnings are satisfied
//   4. Store and return results
//
// Pass ids: [] to run ALL non-archived scenarios.

export const POST: RequestHandler = async ({ locals, request }) => {
	const authDenied = requireAuthApi(locals);
	if (authDenied) return authDenied;

	const permDenied = requireAdminPermission(locals, 'qa_run');
	if (permDenied) return permDenied;

	const body = await parseJsonBody<RunScenariosRequest>(request);
	if (!body.ok) return body.response;

	const { ids } = body.data;

	if (!Array.isArray(ids)) {
		return apiError('ids must be an array of scenario IDs (pass [] to run all)');
	}

	try {
		// Build the MongoDB filter: specific IDs or all non-archived
		const filter =
			ids.length > 0
				? { _id: { $in: ids.map((id) => toObjectId(id)).filter((id): id is ObjectId => id !== null) } }
				: { isArchived: false };

		const scenarios = await QaScenarios.find(filter).toArray();

		if (scenarios.length === 0) {
			return apiError('No matching scenarios found', 404);
		}

		if (scenarios.length > 100) {
			return apiError('Too many scenarios — pass specific ids or reduce to ≤100 at a time', 400);
		}

		logger.info({ count: scenarios.length }, 'QA run started');

		// Run in batches of 10 to avoid exhausting MongoDB connections under load
		const results = await runInBatches(scenarios, 10, runSingleScenario);

		// Persist results back to each scenario
		await Promise.all(
			results.map(({ scenarioId, runDetails }) =>
				QaScenarios.updateOne(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					{ _id: new ObjectId(scenarioId) as any },
					{
						$set: {
							lastRunAt: runDetails.ranAt,
							lastRunResult: runDetails.overallResult,
							lastRunDetails: runDetails,
							updatedAt: new Date()
						}
					}
				)
			)
		);

		const summary = {
			total: results.length,
			pass: results.filter((r) => r.runDetails.overallResult === 'pass').length,
			fail: results.filter((r) => r.runDetails.overallResult === 'fail').length,
			warning: results.filter((r) => r.runDetails.overallResult === 'warning').length
		};

		logger.info({ summary }, 'QA run complete');
		return apiOk({ summary, results });
	} catch (err) {
		logger.error({ err }, 'POST /api/qa/scenarios/run failed');
		return apiServerError(err);
	}
};

// ─── Single scenario runner ───────────────────────────────────────────────────

async function runSingleScenario(scenario: {
	_id?: unknown;
	loanAnswers: Record<string, unknown>;
	applicationData: Record<string, unknown>;
	applicants: Array<Record<string, unknown>>;
	relationships: Array<{ fromId: string; toId: string; relationType: string; category?: string }>;
	expectedWarnings: string[];
	autoName: string;
}): Promise<{ scenarioId: string; autoName: string; runDetails: QaRunDetails }> {
	const ranAt = new Date();
	const scenarioId = String(scenario._id);

	// Step 1: Rebuild payload from form answers
	let payload: LoanApplicationPayload;
	let payloadBuilt = false;
	let buildError: string | undefined;

	try {
		payload = buildLoanPayload(
			scenario.loanAnswers,
			scenario.applicants,
			scenario.applicationData,
			scenario.relationships
		);
		payloadBuilt = true;
	} catch (err) {
		buildError = String(err);
		logger.warn({ err, scenarioId, autoName: scenario.autoName }, 'QA run: payload build failed');

		return {
			scenarioId,
			autoName: scenario.autoName,
			runDetails: {
				ranAt,
				payloadBuilt: false,
				evaluationResult: null,
				warningsMatched: [],
				warningsMissing: scenario.expectedWarnings,
				overallResult: 'fail',
				buildError
			}
		};
	}

	// Step 2: Run through rule engine
	let evaluationResult = null;
	try {
		evaluationResult = await evaluatePayload(payload!);
	} catch (err) {
		logger.warn({ err, scenarioId }, 'QA run: evaluatePayload failed');
		// Payload built fine but rule engine failed — treat as warning, not hard fail
		return {
			scenarioId,
			autoName: scenario.autoName,
			runDetails: {
				ranAt,
				payloadBuilt,
				evaluationResult: null,
				warningsMatched: [],
				warningsMissing: scenario.expectedWarnings,
				overallResult: 'warning',
				buildError: `Rule engine error: ${String(err)}`
			}
		};
	}

	// Step 3: Check expected warnings
	// At this stage we check whether the scenario's expected warnings are satisfied.
	// Form-flow warning checking (showWhen-level) is Phase 4 — for now we verify
	// rule engine negative factors + traffic_light_messages contain the expected strings.
	const allSignals = (evaluationResult?.results ?? []).flatMap((l) => [
		l.traffic_light_message,
		...(l.factors ?? [])
			.filter((f) => f.impact === 'negative')
			.map((f) => f.description)
	]);

	const warningsMatched = scenario.expectedWarnings.filter((w) =>
		allSignals.some((signal: string) => signal.toLowerCase().includes(w.toLowerCase()))
	);
	const warningsMissing = scenario.expectedWarnings.filter(
		(w) => !warningsMatched.includes(w)
	);

	// Determine overall result:
	// fail   = payload couldn't be built
	// warning = warnings expected but not found
	// pass   = payload built + all expected warnings present (or no warnings expected)
	const overallResult: 'pass' | 'fail' | 'warning' =
		warningsMissing.length > 0 ? 'warning' : 'pass';

	return {
		scenarioId,
		autoName: scenario.autoName,
		runDetails: {
			ranAt,
			payloadBuilt,
			evaluationResult,
			warningsMatched,
			warningsMissing,
			overallResult
		}
	};
}

async function runInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		results.push(...await Promise.all(batch.map(fn)));
	}
	return results;
}

