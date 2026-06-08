/**
 * RM Reputation Score (6.14) — Pure function (like scorecardEngine)
 * ══════════════════════════════════════════════════════════════════
 * Computes reputation from communication threads, cases, and ratings.
 * No database calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RMReputationScore, ReputationRating } from '$lib/types/rmPortal.js';

export interface ThreadInput {
	messages: Array<{
		sender_role: 'dsa' | 'rm';
		created_at: Date;
	}>;
	updated_at: Date;
}

export interface CaseInput {
	lender_applications: Array<{
		queries: Array<{
			status: string;
			raised_at: Date;
			response?: { responded_at: Date };
		}>;
	}>;
}

export interface RatingInput {
	rating: number;
}

export function computeReputation(
	threads: ThreadInput[],
	cases: CaseInput[],
	ratings: RatingInput[]
): RMReputationScore {
	// 1. Response time (avg hours between DSA message and RM reply)
	let totalResponseMs = 0;
	let responseCount = 0;

	for (const t of threads) {
		const msgs = [...t.messages].sort(
			(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		);

		for (let i = 0; i < msgs.length - 1; i++) {
			if (msgs[i].sender_role === 'dsa' && msgs[i + 1].sender_role === 'rm') {
				const diff =
					new Date(msgs[i + 1].created_at).getTime() - new Date(msgs[i].created_at).getTime();
				if (diff > 0 && diff < 7 * 24 * 60 * 60 * 1000) {
					// ignore > 7 days
					totalResponseMs += diff;
					responseCount++;
				}
			}
		}
	}

	const responseTimeAvgHours =
		responseCount > 0
			? Math.round((totalResponseMs / responseCount / (1000 * 60 * 60)) * 10) / 10
			: 0;

	// 2. Query resolution rate
	let totalQueries = 0;
	let resolvedQueries = 0;

	for (const c of cases) {
		for (const la of c.lender_applications) {
			for (const q of la.queries) {
				totalQueries++;
				if (q.status === 'resolved' || q.response) {
					resolvedQueries++;
				}
			}
		}
	}

	const queryResolutionRate =
		totalQueries > 0 ? Math.round((resolvedQueries / totalQueries) * 100) / 100 : 0;

	// 3. Accuracy rating average
	const accuracyAvg =
		ratings.length > 0
			? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10
			: 0;

	// 4. DSA satisfaction (derived from thread activity -- more messages = more engagement)
	const avgMsgCount =
		threads.length > 0 ? threads.reduce((s, t) => s + t.messages.length, 0) / threads.length : 0;
	// Normalize to 1-5 scale: 1-2 messages = 2, 3-5 = 3, 6-10 = 4, 10+ = 5
	const dsaSatisfaction =
		avgMsgCount <= 0 ? 0 : avgMsgCount <= 2 ? 2 : avgMsgCount <= 5 ? 3 : avgMsgCount <= 10 ? 4 : 5;

	// 5. Overall score (weighted)
	const caseCount = cases.length;
	let score = 0;
	let weights = 0;

	// Response time: lower is better. <4h = 100, <12h = 80, <24h = 60, <48h = 40, else 20
	if (responseCount > 0) {
		const rtScore =
			responseTimeAvgHours <= 4
				? 100
				: responseTimeAvgHours <= 12
					? 80
					: responseTimeAvgHours <= 24
						? 60
						: responseTimeAvgHours <= 48
							? 40
							: 20;
		score += rtScore * 25;
		weights += 25;
	}

	// Query resolution: direct percentage
	if (totalQueries > 0) {
		score += queryResolutionRate * 100 * 25;
		weights += 25;
	}

	// Accuracy: (avg / 5) * 100
	if (ratings.length > 0) {
		score += (accuracyAvg / 5) * 100 * 30;
		weights += 30;
	}

	// DSA satisfaction: (satisfaction / 5) * 100
	if (threads.length > 0) {
		score += (dsaSatisfaction / 5) * 100 * 20;
		weights += 20;
	}

	const overallScore = weights > 0 ? Math.round(score / weights) : 0;

	// Rating tier
	let rating: ReputationRating;
	if (overallScore >= 80) rating = 'excellent';
	else if (overallScore >= 60) rating = 'good';
	else if (overallScore >= 40) rating = 'average';
	else rating = 'needs_improvement';

	return {
		overall_score: overallScore,
		response_time_avg_hours: responseTimeAvgHours,
		query_resolution_rate: queryResolutionRate,
		accuracy_rating_avg: accuracyAvg,
		dsa_satisfaction_avg: dsaSatisfaction,
		case_count: caseCount,
		rating
	};
}
