/**
 * Form Guard Orchestrator
 *
 * Single entry point for all form security checks. Called by API routes
 * before form engine evaluation. Ties together:
 * - Trust scoring (blocked/suspended checks)
 * - Rate limiting (adaptive based on trust score)
 * - Form sessions (page access validation, timing analysis)
 * - Behavioral analysis
 *
 * Tab-agnostic: all checks work with multi-tab usage.
 */

import {
	getOrCreateSession,
	validatePageAccess,
	recordPageView,
	analyzeSessionTiming,
	markSessionSubmitted
} from './formSession';
import { checkTrustAccess, recordTrustEvent } from './trustScore';
import type { BehaviorSignals, FormGuardResult } from '$lib/types/formSession';
import {
	BASE_RATE_LIMIT_PER_MIN,
	MAX_ACTIVE_SESSIONS,
	MAX_EVALUATIONS_PER_SESSION,
	MAX_SAME_PAGE_REQUESTS
} from '$lib/types/formSession';

// ============================================================================
// In-memory rate limit tracking (per-user request counts)
// ============================================================================

interface RateEntry {
	count: number;
	windowStart: number;
}

/** @internal Exported for testing only. */
export const rateLimits = new Map<string, RateEntry>();

/**
 * Simple sliding-window rate limiter (in-memory).
 * Returns true if within limit, false if exceeded.
 */
/** @internal Exported for testing only. */
export function checkRateLimit(userId: string, maxPerMinute: number): boolean {
	const now = Date.now();
	const entry = rateLimits.get(userId);

	if (!entry || now - entry.windowStart > 60_000) {
		// New window
		rateLimits.set(userId, { count: 1, windowStart: now });
		return true;
	}

	entry.count++;
	if (entry.count > maxPerMinute) {
		return false;
	}

	return true;
}

// Periodic cleanup of stale rate limit entries (every 5 minutes)
setInterval(
	() => {
		const cutoff = Date.now() - 120_000;
		for (const [key, entry] of rateLimits) {
			if (entry.windowStart < cutoff) {
				rateLimits.delete(key);
			}
		}
	},
	5 * 60 * 1000
);

// ============================================================================
// Public API
// ============================================================================

export interface ValidateEvaluateParams {
	userId: string;
	loanType: string;
	pageIndex: number;
	ip?: string;
	ua?: string;
	behaviorSignals?: BehaviorSignals;
	timeSpentMs?: number;
	answerCount?: number;
}

/**
 * Validate an evaluate request through all security layers.
 * Called before form engine evaluation in the API endpoint.
 */
export async function validateEvaluateRequest(
	params: ValidateEvaluateParams
): Promise<FormGuardResult> {
	const { userId, loanType, pageIndex, ip, ua, behaviorSignals, timeSpentMs, answerCount } = params;
	const warnings: string[] = [];

	// 1. Trust score check (blocked? suspended?)
	const trustCheck = await checkTrustAccess(userId);
	if (!trustCheck.allowed) {
		return {
			allowed: false,
			reason: trustCheck.reason
		};
	}

	// 2. Adaptive rate limiting (base rate × trust multiplier)
	const effectiveLimit = Math.max(
		10,
		Math.floor(BASE_RATE_LIMIT_PER_MIN * trustCheck.rateMultiplier)
	);
	if (!checkRateLimit(userId, effectiveLimit)) {
		// Record the rate limit hit in trust score
		await recordTrustEvent(userId, 'rate_limit_hit', {
			effectiveLimit,
			trustScore: trustCheck.score
		});
		return {
			allowed: false,
			reason: 'Rate limit exceeded. Please slow down.'
		};
	}

	// 3. Get or create form session
	const session = await getOrCreateSession(userId, loanType, ip, ua);
	if (!session) {
		return {
			allowed: false,
			reason: `You have ${MAX_ACTIVE_SESSIONS} active applications. Please submit or close one before starting a new one.`
		};
	}

	// 4. Validate page access (no skip-ahead)
	const pageCheck = validatePageAccess(session, pageIndex);
	if (!pageCheck.valid) {
		await recordTrustEvent(userId, 'skip_ahead', {
			requestedPage: pageIndex,
			maxReached: session.maxPageReached
		});
		return {
			allowed: false,
			reason: pageCheck.reason
		};
	}

	// 4.5 Per-session evaluation budget (non-blocking: warns + penalizes trust)
	if (session.totalRequestCount > MAX_EVALUATIONS_PER_SESSION) {
		await recordTrustEvent(userId, 'session_budget_exceeded', {
			sessionId: session.sessionId,
			totalRequests: session.totalRequestCount
		});
		warnings.push('Session evaluation budget exceeded');
	}

	// 4.6 Repeat-page detection
	const pageRepeatCount = session.pageTimings.filter((t) => t.pageIndex === pageIndex).length;
	if (pageRepeatCount > MAX_SAME_PAGE_REQUESTS) {
		await recordTrustEvent(userId, 'repeat_page', {
			sessionId: session.sessionId,
			pageIndex,
			repeatCount: pageRepeatCount
		});
		warnings.push('Repeated page access detected');
	}

	// 5. Record page view + behavior (append-only)
	await recordPageView(
		session.sessionId,
		pageIndex,
		timeSpentMs ?? 0,
		answerCount ?? 0,
		behaviorSignals
	);

	// 6. Analyze session for anomalies (async, non-blocking on first few pages)
	if (session.totalRequestCount > 5) {
		const analysis = await analyzeSessionTiming(session.sessionId);

		if (analysis.hasFastCompletionPattern) {
			await recordTrustEvent(userId, 'fast_completion', {
				sessionId: session.sessionId
			});
			warnings.push('Unusual completion speed detected');
		}

		if (analysis.hasSustainedBurst) {
			await recordTrustEvent(userId, 'sustained_burst', {
				sessionId: session.sessionId
			});
			warnings.push('High request rate detected');
		}

		if (analysis.hasMissingBehaviorPattern) {
			await recordTrustEvent(userId, 'missing_behavior', {
				sessionId: session.sessionId
			});
			warnings.push('Missing interaction signals');
		}
	}

	// 7. Reward normal behavior
	if (behaviorSignals) {
		const hasHumanSignals =
			behaviorSignals.hadMouseMovement ||
			behaviorSignals.hadKeyboardInput ||
			behaviorSignals.hadScrolling;

		if (hasHumanSignals) {
			await recordTrustEvent(userId, 'normal_behavior');
		}

		if ((timeSpentMs ?? 0) >= 5000) {
			await recordTrustEvent(userId, 'normal_completion');
		}
	}

	return {
		allowed: true,
		sessionId: session.sessionId,
		warnings: warnings.length > 0 ? warnings : undefined
	};
}

export interface ValidateSubmitParams {
	userId: string;
	loanType: string;
	sessionId?: string;
	ip?: string;
}

/**
 * Validate a form submission request.
 * Lighter than evaluate — just trust check + rate limit + mark submitted.
 */
export async function validateSubmitRequest(
	params: ValidateSubmitParams
): Promise<FormGuardResult> {
	const { userId, sessionId } = params;

	// Trust check
	const trustCheck = await checkTrustAccess(userId);
	if (!trustCheck.allowed) {
		return { allowed: false, reason: trustCheck.reason };
	}

	// Rate limit submissions more strictly (3 per 5 minutes)
	const submitKey = `submit:${userId}`;
	if (!checkRateLimit(submitKey, 3)) {
		return { allowed: false, reason: 'Too many submission attempts. Please wait.' };
	}

	// Mark session as submitted and reward
	if (sessionId) {
		await markSessionSubmitted(sessionId);
	}
	await recordTrustEvent(userId, 'successful_submit');

	return { allowed: true, sessionId };
}

/**
 * Record a honeypot trigger — massive trust score penalty.
 */
export async function recordHoneypotTrigger(
	userId: string,
	sessionId?: string,
	fieldName?: string
): Promise<void> {
	await recordTrustEvent(userId, 'honeypot_triggered', {
		sessionId,
		fieldName
	});
}
