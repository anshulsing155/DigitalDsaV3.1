/**
 * POST /api/pms/pipeline/delta
 *
 * Runs the delta parse pipeline: AI diffs an addendum against the current
 * published policy and returns field-level changes for RM review.
 *
 * Does NOT write to the database — the result is returned to the client
 * and only persisted when the RM saves via POST /api/pms/policies/[id]/apply-delta.
 *
 * Body:
 *   policyId:     string — published PolicyDocument _id
 *   addendumText: string — pasted or extracted addendum text
 *
 * 60% size guard: if addendumText.length / policy.sourceDocument.text.length > 0.60
 * returns { warning: 'full_policy_detected', ... } — client must confirm before retry.
 *
 * Rate limit: 10 req/min per IP (shared with encode pipeline).
 * Token circuit breaker: 100k cumulative per policy session.
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { runDelta } from '$lib/server/pms/deltaPipeline.js';
import {
	getPolicyById,
	PolicyNotFoundError,
	PolicyStatusError
} from '$lib/server/pms/policyService.js';

const TOKEN_CIRCUIT_BREAKER = 100_000;
// Addendum text longer than 60% of the current policy text is probably
// a full policy re-upload, not an addendum. Warn the RM before proceeding.
const SIZE_GUARD_RATIO = 0.60;

export const POST: RequestHandler = async ({ locals, request, getClientAddress }) => {
	const denied = requireRoleApi(locals, ['rm', 'admin']);
	if (denied) return denied;

	const ip = getClientAddress();
	const limited = await rateLimit(ip, {
		maxRequests: 10,
		windowMs: 60_000,
		identifier: `pms_pipeline_delta_${ip}`
	});
	if (limited) return apiError('Too many pipeline requests. Please wait before retrying.', 429);

	const body = await parseJsonBody<{
		policyId: string;
		addendumText: string;
		/** true = RM confirmed the size warning and wants to proceed anyway */
		confirmedFullPolicy?: boolean;
	}>(request);
	if (!body.ok) return body.response;

	const { policyId, addendumText, confirmedFullPolicy = false } = body.data;

	if (!policyId || typeof policyId !== 'string') {
		return apiError('policyId is required', 400);
	}
	if (!addendumText || typeof addendumText !== 'string' || addendumText.trim().length < 10) {
		return apiError('addendumText must be at least 10 characters', 400);
	}
	// Cap addendum length to prevent token abuse
	if (addendumText.length > 50_000) {
		return apiError('Addendum text exceeds 50,000 character limit. Please trim and retry.', 400);
	}

	let policy;
	try {
		policy = await getPolicyById(policyId);
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err);
	}

	if (policy.status !== 'published') {
		return apiError('Delta parse can only run against published policies', 422);
	}

	// Token circuit breaker — even though this is a fresh run, check if the policy
	// has accumulated prior pipeline tokens (e.g. from a previous encode session).
	const existingTokens = policy.aiPipelineRun?.totalTokensUsed ?? 0;
	if (existingTokens >= TOKEN_CIRCUIT_BREAKER) {
		return apiError(
			`Token limit reached for this policy (${existingTokens.toLocaleString()} / ${TOKEN_CIRCUIT_BREAKER.toLocaleString()}). Contact admin to reset.`,
			429
		);
	}

	// 60% size guard — if addendum is suspiciously large, it's probably the full
	// policy re-uploaded. Warn the RM; they must confirm before we burn tokens.
	const existingTextLength = policy.sourceDocument.text.length;
	if (
		existingTextLength > 0 &&
		addendumText.length / existingTextLength > SIZE_GUARD_RATIO &&
		!confirmedFullPolicy
	) {
		return apiOk({
			warning: 'full_policy_detected',
			message:
				`The uploaded text is ${Math.round((addendumText.length / existingTextLength) * 100)}% the size of the current policy. ` +
				`This looks like a full policy re-upload rather than a change circular. ` +
				`If you still want to proceed, confirm and resubmit.`,
			addendumLength: addendumText.length,
			policyLength: existingTextLength
		});
	}

	const userId = locals.user!.id;

	logger.info(
		{ policyId, userId, addendumLength: addendumText.length },
		'[PMS delta] Starting delta parse'
	);

	let deltaResult;
	try {
		deltaResult = await runDelta(policy.sections, addendumText, policy.loanProduct);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		const isTimeout = message.toLowerCase().includes('timed out');

		logger.error({ policyId, message }, '[PMS delta] Delta parse failed');

		return apiError(
			isTimeout
				? 'Delta parse timed out. The addendum may be too long. Please try again.'
				: `Delta parse error: ${message}`,
			isTimeout ? 408 : 500
		);
	}

	logger.info(
		{
			policyId,
			userId,
			deltaCount: deltaResult.deltas.length,
			tokensUsed: deltaResult.tokensUsed,
			overallConfidence: deltaResult.overallConfidence
		},
		'[PMS delta] Delta parse complete'
	);

	return apiOk({ deltaResult });
};
