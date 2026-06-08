/**
 * POST  /api/form/options
 * ══════════════════════════════════════════════════════════════════
 * Lightweight endpoint for resolving dynamic options for a single question.
 *
 * Used when client needs updated options after an answer change (e.g.,
 * state → city, bank selection). Avoids full page re-evaluation.
 *
 * Returns only the resolved options array for the requested question ID.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { requireAuthApi } from '$lib/server/guards';
import logger from '$lib/server/logger.js';
import { parseJsonBody } from '$lib/server/apiResponse.js';
import { createFormEngine } from '$lib/server/formEngine/engine';
import { getEngineOptions } from '$lib/server/formEngine/engineContext';
import { checkRateLimit } from '$lib/server/formGuard';

interface OptionsRequest {
	loanType: string;
	questionIds: string[];
	answers: Record<string, unknown>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. Auth guard
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	// Rate limit options requests (production only)
	if (!dev && locals.user) {
		if (!checkRateLimit(`options:${locals.user.id}`, 20)) {
			return json(
				{ success: false, error: 'Too many option requests. Please slow down.' },
				{ status: 429 }
			);
		}
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const body = jsonParsed.data;
		const { loanType, questionIds, answers } = body as unknown as OptionsRequest;

		if (!loanType || !questionIds || !answers) {
			return json(
				{ success: false, error: 'Missing required fields: loanType, questionIds, answers' },
				{ status: 400 }
			);
		}

		if (!Array.isArray(questionIds) || questionIds.length === 0 || questionIds.length > 10) {
			return json(
				{ success: false, error: 'questionIds must be an array of 1-10 question IDs' },
				{ status: 400 }
			);
		}

		// Resolve options for requested questions using the engine's option resolver
		const engine = createFormEngine(loanType);
		const engineOptions = getEngineOptions();
		const result = await engine.resolveQuestionOptions(questionIds, answers, engineOptions);

		return json(
			{ success: true, data: result },
			{
				headers: {
					'Cache-Control': 'no-store, no-cache, must-revalidate, private',
					Pragma: 'no-cache'
				}
			}
		);
	} catch (err) {
		logger.error({ err }, '[FormEngine] Options resolve error');
		return json({ success: false, error: 'Option resolution failed' }, { status: 500 });
	}
};
