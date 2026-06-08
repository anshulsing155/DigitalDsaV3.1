/**
 * Server-Side Form Session Management
 *
 * Tracks form-filling progress per user+loanType for anti-scraping defense.
 * Tab-agnostic: multiple tabs share one session, no per-tab state.
 *
 * Key behaviors:
 * - maxPageReached is a high-water mark (only increases)
 * - pageTimings and behaviorLog are append-only
 * - No backward navigation limit (multi-tab users revisit pages)
 * - Max 5 active sessions per user (enforced on creation)
 */

import { FormSessions } from '$lib/database/mongo';
import type { FormSession, BehaviorSignals } from '$lib/types/formSession';
import { MAX_ACTIVE_SESSIONS } from '$lib/types/formSession';

// ============================================================================
// Session CRUD
// ============================================================================

/**
 * Get an existing active session or create a new one.
 * One active session per user+loanType. Tab-agnostic.
 *
 * @returns The session, or null if the 5-session limit is reached.
 */
export async function getOrCreateSession(
	userId: string,
	loanType: string,
	ip?: string,
	ua?: string
): Promise<FormSession | null> {
	// Try to find existing active session
	const existing = await FormSessions.findOne({
		userId,
		loanType,
		isActive: true
	});

	if (existing) {
		// Update activity timestamp
		await FormSessions.updateOne(
			{ _id: existing._id },
			{
				$set: {
					lastActivityAt: new Date(),
					...(ip ? { ipAddress: ip } : {}),
					...(ua ? { userAgent: ua } : {})
				}
			}
		);
		return existing;
	}

	// Check session limit before creating
	const activeCount = await FormSessions.countDocuments({
		userId,
		isActive: true
	});

	if (activeCount >= MAX_ACTIVE_SESSIONS) {
		return null; // Caller should return 429
	}

	// Create new session
	const now = new Date();
	const session: FormSession = {
		userId,
		loanType,
		sessionId: crypto.randomUUID(),
		maxPageReached: 0,
		pageTimings: [],
		behaviorLog: [],
		totalRequestCount: 0,
		isActive: true,
		isSubmitted: false,
		isFlagged: false,
		startedAt: now,
		lastActivityAt: now,
		ipAddress: ip,
		userAgent: ua
	};

	await FormSessions.insertOne(session);
	return session;
}

// ============================================================================
// Page Access Validation
// ============================================================================

/**
 * Validate that the requested page is reachable.
 * Rejects skip-ahead: can't request page > maxPageReached + 1.
 * No backward limit (multi-tab users revisit earlier pages).
 */
export function validatePageAccess(
	session: FormSession,
	requestedPageIndex: number
): { valid: boolean; reason?: string } {
	// Allow any page up to one beyond the furthest reached
	if (requestedPageIndex <= session.maxPageReached + 1) {
		return { valid: true };
	}

	return {
		valid: false,
		reason: `Skip-ahead rejected: requested page ${requestedPageIndex} but max reached is ${session.maxPageReached}`
	};
}

// ============================================================================
// Page View Recording
// ============================================================================

/**
 * Record a page view: append timing + behavior, update maxPageReached.
 * All updates are append-only (no overwrite of existing entries).
 */
export async function recordPageView(
	sessionId: string,
	pageIndex: number,
	timeSpentMs: number,
	answerCount: number,
	behaviorSignals?: BehaviorSignals
): Promise<void> {
	const requestId = crypto.randomUUID();
	const now = new Date();

	const updateOps: Record<string, unknown> = {
		$set: { lastActivityAt: now },
		$inc: { totalRequestCount: 1 },
		$max: { maxPageReached: pageIndex },
		$push: {
			pageTimings: {
				pageIndex,
				viewedAt: now,
				timeSpentMs,
				answerCount,
				requestId
			}
		} as any
	};

	// Append behavior signals if provided
	if (behaviorSignals) {
		(updateOps.$push as any).behaviorLog = {
			pageIndex,
			hadMouse: behaviorSignals.hadMouseMovement,
			hadScroll: behaviorSignals.hadScrolling,
			hadFocus: behaviorSignals.hadFieldFocus,
			hadKeyboard: behaviorSignals.hadKeyboardInput,
			hadPaste: behaviorSignals.hadPasteEvents,
			requestId
		};
	}

	await FormSessions.updateOne({ sessionId }, updateOps);
}

// ============================================================================
// Timing Analysis
// ============================================================================

/** Anomaly flags from session timing analysis. */
export interface TimingAnalysis {
	/** >50% of page timings under 3 seconds */
	hasFastCompletionPattern: boolean;
	/** >20 requests/minute sustained over recent window */
	hasSustainedBurst: boolean;
	/** >80% of behavior entries missing all human signals */
	hasMissingBehaviorPattern: boolean;
}

/**
 * Analyze session for suspicious timing patterns.
 * Uses statistical thresholds (not individual page checks) to avoid
 * false positives from legitimate multi-tab usage.
 */
export async function analyzeSessionTiming(sessionId: string): Promise<TimingAnalysis> {
	const session = await FormSessions.findOne({ sessionId });

	if (!session) {
		return {
			hasFastCompletionPattern: false,
			hasSustainedBurst: false,
			hasMissingBehaviorPattern: false
		};
	}

	// Fast completion: >50% of page timings under 3 seconds
	const timings = session.pageTimings;
	let hasFastCompletionPattern = false;
	if (timings.length >= 5) {
		const fastCount = timings.filter((t) => t.timeSpentMs < 3000).length;
		hasFastCompletionPattern = fastCount / timings.length > 0.5;
	}

	// Sustained burst: >20 requests in the last minute
	let hasSustainedBurst = false;
	if (timings.length >= 20) {
		const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
		const recentTimings = timings.filter((t) => t.viewedAt > fiveMinAgo);
		if (recentTimings.length > 0) {
			const durationMs =
				recentTimings[recentTimings.length - 1].viewedAt.getTime() -
				recentTimings[0].viewedAt.getTime();
			const durationMin = durationMs / 60000;
			if (durationMin > 0) {
				const requestsPerMin = recentTimings.length / durationMin;
				hasSustainedBurst = requestsPerMin > 20 && durationMin >= 1;
			}
		}
	}

	// Missing behavior: >80% of entries have no human signals
	const behaviorEntries = session.behaviorLog;
	let hasMissingBehaviorPattern = false;
	if (behaviorEntries.length >= 5) {
		const missingCount = behaviorEntries.filter(
			(b) => !b.hadMouse && !b.hadKeyboard && !b.hadScroll
		).length;
		hasMissingBehaviorPattern = missingCount / behaviorEntries.length > 0.8;
	}

	return {
		hasFastCompletionPattern,
		hasSustainedBurst,
		hasMissingBehaviorPattern
	};
}

// ============================================================================
// Session Lifecycle
// ============================================================================

/**
 * Mark a session as submitted (form completed successfully).
 */
export async function markSessionSubmitted(sessionId: string): Promise<void> {
	await FormSessions.updateOne(
		{ sessionId },
		{ $set: { isSubmitted: true, isActive: false, lastActivityAt: new Date() } }
	);
}

/**
 * Flag a session for manual review.
 */
export async function flagSession(sessionId: string, reason: string): Promise<void> {
	await FormSessions.updateOne(
		{ sessionId },
		{ $set: { isFlagged: true, flagReason: reason, lastActivityAt: new Date() } }
	);
}

/**
 * Invalidate a session (deactivate without submission).
 */
export async function invalidateSession(sessionId: string): Promise<void> {
	await FormSessions.updateOne(
		{ sessionId },
		{ $set: { isActive: false, lastActivityAt: new Date() } }
	);
}

/**
 * Get a session by its sessionId.
 */
export async function getSession(sessionId: string): Promise<FormSession | null> {
	return FormSessions.findOne({ sessionId });
}
