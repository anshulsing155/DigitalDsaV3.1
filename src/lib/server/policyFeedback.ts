/**
 * Policy Feedback Aggregation (6.13) — Pure function
 * ══════════════════════════════════════════════════════════════════
 * Aggregates AccuracyRatings by category + lender.
 * No DB calls — fully testable and side-effect free.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PolicyFeedbackAggregate, RatingCategory } from '$lib/types/rmPortal.js';

export interface RatingInput {
	category: RatingCategory;
	lender_name: string;
	rating: number;
	created_at: Date;
}

export function computePolicyFeedback(ratings: RatingInput[]): PolicyFeedbackAggregate[] {
	if (ratings.length === 0) return [];

	// Group by category + lender
	const groups: Record<string, { ratings: number[]; dates: Date[] }> = {};

	for (const r of ratings) {
		const key = `${r.category}|${r.lender_name}`;
		if (!groups[key]) {
			groups[key] = { ratings: [], dates: [] };
		}
		groups[key].ratings.push(r.rating);
		groups[key].dates.push(new Date(r.created_at));
	}

	const aggregates: PolicyFeedbackAggregate[] = [];

	for (const [key, data] of Object.entries(groups)) {
		const [category, lender_name] = key.split('|');
		const avg = data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length;

		// Compute trend: compare first half vs second half
		let trend: 'up' | 'down' | 'stable' = 'stable';
		if (data.ratings.length >= 4) {
			const mid = Math.floor(data.ratings.length / 2);
			const sorted = [...data.ratings]; // already in insertion order
			const firstHalf = sorted.slice(0, mid);
			const secondHalf = sorted.slice(mid);
			const firstAvg = firstHalf.reduce((s, r) => s + r, 0) / firstHalf.length;
			const secondAvg = secondHalf.reduce((s, r) => s + r, 0) / secondHalf.length;
			if (secondAvg - firstAvg > 0.3) trend = 'up';
			else if (firstAvg - secondAvg > 0.3) trend = 'down';
		}

		aggregates.push({
			category: category as RatingCategory,
			lender_name,
			avg_rating: Math.round(avg * 10) / 10,
			count: data.ratings.length,
			trend
		});
	}

	// Sort by count descending
	aggregates.sort((a, b) => b.count - a.count);
	return aggregates;
}
