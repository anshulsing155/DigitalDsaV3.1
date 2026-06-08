/**
 * Types for server-side form session tracking and anti-scraping system.
 *
 * FormSession: tracks a user's form-filling progress per loan type.
 * TrustScore: progressive trust scoring for abuse detection.
 * BehaviorSignals: client-side behavioral telemetry (booleans, not keylogging).
 */

import type { ObjectId } from 'mongodb';

// ============================================================================
// Form Sessions
// ============================================================================

/** Server-side form session — one per user+loanType, shared across tabs. */
export interface FormSession {
	_id?: ObjectId;
	userId: string;
	loanType: string;
	sessionId: string; // UUID — returned to client, used in subsequent requests

	/** High-water mark: furthest page reached. Only increases. */
	maxPageReached: number;

	/** Append-only timing log. Multiple visits to same page append new entries. */
	pageTimings: PageTiming[];

	/** Append-only behavioral signal log. One entry per evaluate request. */
	behaviorLog: BehaviorLogEntry[];

	/** Total evaluate requests across all tabs (for rate limiting). */
	totalRequestCount: number;

	isActive: boolean;
	isSubmitted: boolean;
	isFlagged: boolean;
	flagReason?: string;

	startedAt: Date;
	lastActivityAt: Date;
	ipAddress?: string;
	userAgent?: string;
}

export interface PageTiming {
	pageIndex: number;
	viewedAt: Date;
	timeSpentMs: number;
	answerCount: number;
	/** Unique per-request identifier to correlate timing + behavior entries. */
	requestId: string;
}

export interface BehaviorLogEntry {
	pageIndex: number;
	hadMouse: boolean;
	hadScroll: boolean;
	hadFocus: boolean;
	hadKeyboard: boolean;
	hadPaste: boolean;
	requestId: string;
}

// ============================================================================
// Trust Scores
// ============================================================================

/** Progressive trust score — one per user. */
export interface TrustScore {
	_id?: ObjectId;
	userId: string;
	/** Current trust score (0-100, starts at 50). */
	score: number;
	/** Append-only event history. */
	events: TrustEvent[];

	/** Derived thresholds. */
	isWatchlisted: boolean; // score < 30
	isSuspended: boolean; // score < 15
	isBlocked: boolean; // score < 5
	/** Suspension expiry (1-hour temp ban). */
	suspensionUntil?: Date;
}

export type TrustEventType =
	| 'fast_completion'
	| 'missing_behavior'
	| 'rate_limit_hit'
	| 'skip_ahead'
	| 'sustained_burst'
	| 'honeypot_triggered'
	| 'session_budget_exceeded'
	| 'repeat_page'
	| 'normal_behavior'
	| 'normal_completion'
	| 'successful_submit';

export interface TrustEvent {
	timestamp: Date;
	eventType: TrustEventType;
	scoreDelta: number;
	metadata?: Record<string, unknown>;
}

// ============================================================================
// Behavioral Signals (Client → Server)
// ============================================================================

/** Behavioral signals sent by the client with each evaluate request. */
export interface BehaviorSignals {
	hadMouseMovement: boolean;
	hadScrolling: boolean;
	hadFieldFocus: boolean;
	hadKeyboardInput: boolean;
	hadPasteEvents: boolean;
	focusBlurCount: number;
	timeToFirstInteraction: number;
}

// ============================================================================
// Form Guard Results
// ============================================================================

/** Result from FormGuard validation. */
export interface FormGuardResult {
	allowed: boolean;
	reason?: string;
	sessionId?: string;
	warnings?: string[];
}

// ============================================================================
// Trust Score Deltas (constants)
// ============================================================================

export const TRUST_DELTAS: Record<TrustEventType, number> = {
	fast_completion: -10,
	missing_behavior: -5,
	rate_limit_hit: -15,
	skip_ahead: -20,
	sustained_burst: -10,
	honeypot_triggered: -50,
	session_budget_exceeded: -15,
	repeat_page: -5,
	normal_behavior: 1,
	normal_completion: 2,
	successful_submit: 10
};

export const TRUST_THRESHOLDS = {
	WATCHLIST: 30,
	SUSPEND: 15,
	BLOCK: 5,
	INITIAL_SCORE: 50,
	MAX_SCORE: 100
} as const;

/** Rate limit multiplier based on trust score. */
export function getTrustMultiplier(score: number): number {
	if (score >= 70) return 1.0;
	if (score >= 50) return 0.75;
	if (score >= 30) return 0.5;
	return 0.25;
}

/** Max active form sessions per user. */
export const MAX_ACTIVE_SESSIONS = 5;

/** Base rate limit (requests per minute) before trust multiplier. */
export const BASE_RATE_LIMIT_PER_MIN = 30;

/** Max evaluate requests per session before flagging. */
export const MAX_EVALUATIONS_PER_SESSION = 150;

/** Max times the same page can be requested in a single session. */
export const MAX_SAME_PAGE_REQUESTS = 8;
