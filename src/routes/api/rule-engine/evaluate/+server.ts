/**
 * POST  /api/rule-engine/evaluate
 * ======================================================================
 * Evaluates a loan application payload against all active lender rules.
 * Returns per-lender results with traffic lights, amounts, and reasons.
 *
 * Auth: DSA + Admin (admin bypasses via guard)
 * Rate limit: 20 evals/min per user (skipped in dev)
 * ======================================================================
 */

import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { requireRoleApi } from '$lib/server/guards.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiStructuredError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { evaluatePayload } from '$lib/ruleEngine/evaluationEngine.js';
import type { LoanApplicationPayload } from '$lib/utils/payloadBuilder.js';
import { resolveActivePlanId } from '$lib/server/billing/planResolver.js';
import { ObjectId } from 'mongodb';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

interface ValidationError {
	valid: false;
	error: string;
}

interface ValidationSuccess {
	valid: true;
	payload: LoanApplicationPayload;
}

/**
 * Validate the evaluate request body.
 * Exported for unit testing without needing SvelteKit request mocking.
 */
export function _validateEvaluateRequest(body: unknown): ValidationSuccess | ValidationError {
	if (!body || typeof body !== 'object') {
		return { valid: false, error: 'Request body must be a JSON object' };
	}

	const obj = body as Record<string, unknown>;

	// loanTransaction must exist and be an object
	if (!obj.loanTransaction || typeof obj.loanTransaction !== 'object') {
		return { valid: false, error: 'Missing required field: loanTransaction' };
	}

	const lt = obj.loanTransaction as Record<string, unknown>;

	// loanName must be a non-empty string
	if (typeof lt.loanName !== 'string' || lt.loanName.trim() === '') {
		return { valid: false, error: 'loanTransaction.loanName must be a non-empty string' };
	}

	// loanAmount must be a positive number
	if (typeof lt.loanAmount !== 'number' || lt.loanAmount <= 0) {
		return { valid: false, error: 'loanTransaction.loanAmount must be a positive number' };
	}

	// allApplicantDetails must be a non-empty array
	if (!Array.isArray(obj.allApplicantDetails) || obj.allApplicantDetails.length === 0) {
		return { valid: false, error: 'allApplicantDetails must be a non-empty array' };
	}

	return { valid: true, payload: body as LoanApplicationPayload };
}

// ============================================================================
// ENDPOINT
// ============================================================================

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	// 1. Auth guard — DSA and admin access
	const denied = requireRoleApi(locals, ['dsa', 'admin']);
	if (denied) return denied;

	// 1b. Subscription gate — block evaluations when no active recurring sub (skip in dev)
	//
	// D.1 S8 (skipped) cleanup: source-of-truth moved from
	// DsaApplications.subscription (legacy isSubscriptionActive helper) to
	// BillingSubscriptions.state via resolveActivePlanId. Active set
	// includes paused/dunning_* so a DSA in retry/grace still gets to evaluate.
	if (!dev && locals.user?.role === 'dsa') {
		try {
			const activePlan = await resolveActivePlanId(new ObjectId(locals.user!.id));
			if (!activePlan) {
				// apiStructuredError preserves the top-level `code` paywall signal
				// (apiError would drop it). Body keys are identical to the prior
				// raw json() — only JSON key order differs, which consumers ignore.
				return apiStructuredError(
					'Subscription required. Please subscribe to a plan to run evaluations.',
					{ code: 'SUBSCRIPTION_REQUIRED' },
					402
				);
			}
		} catch (subscriptionCheckError) {
			// Fail-closed: if we can't verify the subscription, deny the request.
			// A DB outage should not grant free access to paid features.
			logger.error(
				{ err: subscriptionCheckError, userId: locals.user!.id },
				'Subscription check failed — denying evaluation for safety'
			);
			return apiServerError(
				subscriptionCheckError,
				'Unable to verify subscription. Please try again.'
			);
		}
	}

	// 2. Rate limit (skip in dev mode)
	if (!dev) {
		const userId = locals.user!.id;
		const ip = getClientAddress();
		const limited = await rateLimit(ip, {
			maxRequests: 20,
			windowMs: 60_000,
			identifier: `rule-engine-${userId}`
		});
		if (limited) {
			return apiError('Rate limit exceeded. Please try again later.', 429);
		}
	}

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		// 3. Validate
		const validation = _validateEvaluateRequest(jsonParsed.data);
		if (!validation.valid) {
			return apiError(validation.error, 400);
		}

		// 5. Evaluate against all active lender rules
		const results = await evaluatePayload(validation.payload);

		// 6. Return results
		return apiOk(results);
	} catch (err) {
		return apiServerError(err, 'Rule evaluation failed');
	}
};
