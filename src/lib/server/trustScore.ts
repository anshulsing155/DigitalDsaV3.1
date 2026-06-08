/**
 * Progressive Trust Scoring Engine
 *
 * Tracks a per-user trust score (0-100, starts at 50).
 * Score decreases on suspicious behavior, increases on normal usage.
 * Thresholds trigger escalating restrictions:
 *   - score < 30 → watchlisted (stricter rate limits)
 *   - score < 15 → suspended (1-hour form access ban)
 *   - score < 5  → blocked (manual review required)
 */

import { TrustScores } from '$lib/database/mongo';
import type { TrustScore, TrustEventType, TrustEvent } from '$lib/types/formSession';
import { TRUST_DELTAS, TRUST_THRESHOLDS, getTrustMultiplier } from '$lib/types/formSession';

// ============================================================================
// Score Management
// ============================================================================

/**
 * Get or create a trust score for a user.
 */
export async function getOrCreateTrustScore(userId: string): Promise<TrustScore> {
	const existing = await TrustScores.findOne({ userId });
	if (existing) return existing;

	const score: TrustScore = {
		userId,
		score: TRUST_THRESHOLDS.INITIAL_SCORE,
		events: [],
		isWatchlisted: false,
		isSuspended: false,
		isBlocked: false
	};

	await TrustScores.insertOne(score);
	return score;
}

/**
 * Record a trust event and adjust the score.
 * Automatically updates threshold flags (watchlisted, suspended, blocked).
 */
export async function recordTrustEvent(
	userId: string,
	eventType: TrustEventType,
	metadata?: Record<string, unknown>
): Promise<TrustScore> {
	const delta = TRUST_DELTAS[eventType];

	const event: TrustEvent = {
		timestamp: new Date(),
		eventType,
		scoreDelta: delta,
		metadata
	};

	// Atomically update score and push event
	const result = await TrustScores.findOneAndUpdate(
		{ userId },
		{
			$inc: { score: delta },
			$push: {
				events: {
					$each: [event],
					$slice: -200 // Keep last 200 events
				} as any
			}
		},
		{ returnDocument: 'after' }
	);

	if (!result) {
		// User doesn't have a trust score yet — create one with the event
		const newScore = TRUST_THRESHOLDS.INITIAL_SCORE + delta;
		const score: TrustScore = {
			userId,
			score: Math.max(0, Math.min(TRUST_THRESHOLDS.MAX_SCORE, newScore)),
			events: [event],
			isWatchlisted: newScore < TRUST_THRESHOLDS.WATCHLIST,
			isSuspended: newScore < TRUST_THRESHOLDS.SUSPEND,
			isBlocked: newScore < TRUST_THRESHOLDS.BLOCK,
			...(newScore < TRUST_THRESHOLDS.SUSPEND
				? { suspensionUntil: new Date(Date.now() + 60 * 60 * 1000) }
				: {})
		};
		await TrustScores.insertOne(score);
		return score;
	}

	// Clamp score to [0, 100]
	const clampedScore = Math.max(0, Math.min(TRUST_THRESHOLDS.MAX_SCORE, result.score));

	// Update threshold flags based on new score
	const thresholdUpdate: Record<string, unknown> = {
		score: clampedScore,
		isWatchlisted: clampedScore < TRUST_THRESHOLDS.WATCHLIST,
		isSuspended: clampedScore < TRUST_THRESHOLDS.SUSPEND,
		isBlocked: clampedScore < TRUST_THRESHOLDS.BLOCK
	};

	// Set suspension expiry when transitioning to suspended
	if (clampedScore < TRUST_THRESHOLDS.SUSPEND && !result.isSuspended) {
		thresholdUpdate.suspensionUntil = new Date(Date.now() + 60 * 60 * 1000);
	}

	await TrustScores.updateOne({ userId }, { $set: thresholdUpdate });

	return {
		...result,
		...thresholdUpdate
	} as TrustScore;
}

// ============================================================================
// Access Checks
// ============================================================================

/** Check result for trust-based access control. */
export interface TrustCheckResult {
	allowed: boolean;
	reason?: string;
	score: number;
	rateMultiplier: number;
}

/**
 * Check if a user is allowed to access form endpoints.
 * Returns the trust-based rate limit multiplier.
 */
export async function checkTrustAccess(userId: string): Promise<TrustCheckResult> {
	const trustScore = await getOrCreateTrustScore(userId);

	// Blocked users need manual review
	if (trustScore.isBlocked) {
		return {
			allowed: false,
			reason: 'Account blocked due to suspicious activity. Please contact support.',
			score: trustScore.score,
			rateMultiplier: 0
		};
	}

	// Suspended users: check if suspension has expired
	if (trustScore.isSuspended) {
		if (trustScore.suspensionUntil && trustScore.suspensionUntil > new Date()) {
			const minutesLeft = Math.ceil((trustScore.suspensionUntil.getTime() - Date.now()) / 60000);
			return {
				allowed: false,
				reason: `Form access temporarily suspended. Try again in ${minutesLeft} minutes.`,
				score: trustScore.score,
				rateMultiplier: 0
			};
		}
		// Suspension expired — allow but keep reduced rate
	}

	return {
		allowed: true,
		score: trustScore.score,
		rateMultiplier: getTrustMultiplier(trustScore.score)
	};
}

/**
 * Get the current trust score for a user (read-only).
 */
export async function getTrustScore(userId: string): Promise<TrustScore | null> {
	return TrustScores.findOne({ userId });
}
