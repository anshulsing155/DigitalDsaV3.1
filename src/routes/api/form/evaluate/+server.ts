/**
 * POST  /api/form/evaluate
 * ══════════════════════════════════════════════════════════════════
 * Evaluates a single form page given the current answers.
 *
 * Returns visible questions (text resolved, options filtered),
 * navigation state, progress, and validation results.
 * The client NEVER receives showWhen rules or raw schema data.
 *
 * Security layers (via FormGuard):
 * - Trust score check (blocked/suspended)
 * - Adaptive rate limiting (60/min × trust multiplier)
 * - Form session tracking (skip-ahead prevention)
 * - Behavioral telemetry analysis
 *
 * State/bank data is loaded SERVER-SIDE and passed to the engine
 * so the client never needs to import those large JSON files.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { requireAuthApi } from '$lib/server/guards';
import logger from '$lib/server/logger.js';
import { parseJsonBody } from '$lib/server/apiResponse.js';
import { createFormEngine } from '$lib/server/formEngine/engine';
import type { FormEvaluateRequest } from '$lib/types/formEngine';
import type { BehaviorSignals } from '$lib/types/formSession';
import { getEngineOptions } from '$lib/server/formEngine/engineContext';
import { validateEvaluateRequest } from '$lib/server/formGuard';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// 1. Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// 2. Parse request body
		const body = jsonParsed.data;
		const { loanType, pageIndex, answers } = body as unknown as FormEvaluateRequest;
		const behaviorSignals = body.behaviorSignals as BehaviorSignals | undefined;
		const timeSpentMs = body.timeSpentMs as number | undefined;
		const answerCount = body.answerCount as number | undefined;

		// 3. Validate required fields
		if (!loanType || pageIndex === undefined || !answers) {
			return json(
				{ success: false, error: 'Missing required fields: loanType, pageIndex, answers' },
				{ status: 400 }
			);
		}

		// 4. FormGuard: trust check + rate limit + session + page access + behavior
		const userId = locals.user!.id;
		let sessionId: string | undefined;

		if (!dev) {
			const ip = getClientAddress();
			const ua = request.headers.get('user-agent') || undefined;

			const guardResult = await validateEvaluateRequest({
				userId,
				loanType,
				pageIndex,
				ip,
				ua,
				behaviorSignals,
				timeSpentMs,
				answerCount
			});

			if (!guardResult.allowed) {
				return json({ success: false, error: guardResult.reason }, { status: 403 });
			}
			sessionId = guardResult.sessionId;
		}

		// 5. Create engine with server-side context data + session fingerprint
		const engine = createFormEngine(loanType);
		const options = { ...getEngineOptions(), sessionId };
		const page = await engine.evaluatePage(pageIndex, answers, options);

		// 6. Return evaluated page + sessionId (client stores per-tab)
		return json(
			{
				success: true,
				data: page,
				sessionId
			},
			{
				headers: {
					'Cache-Control': 'no-store, no-cache, must-revalidate, private',
					Pragma: 'no-cache'
				}
			}
		);
	} catch (err) {
		logger.error({ err }, '[FormEngine] Evaluate error');
		return json({ success: false, error: 'Evaluation failed' }, { status: 500 });
	}
};
