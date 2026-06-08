import type { ObjectId } from 'mongodb';

// ── Rating Categories ────────────────────────────────────────
export type RatingCategory =
	| 'income_estimation'
	| 'property_valuation'
	| 'eligibility_check'
	| 'documentation'
	| 'overall';

// ── Accuracy Rating (6.5) ────────────────────────────────────
export interface AccuracyRating {
	_id?: ObjectId;
	case_id: string;
	rm_id: ObjectId;
	lender_app_id: string;
	lender_name: string;
	rating: number; // 1-5
	category: RatingCategory;
	comment?: string;
	disclaimer_accepted: boolean;
	created_at: Date;
}

// ── RM Broadcast (6.8) ──────────────────────────────────────
export interface RMBroadcast {
	_id?: ObjectId;
	rm_id: ObjectId;
	rm_name: string;
	lender_name: string;
	title: string;
	body: string;
	footer: string; // Server-enforced disclaimer (6.17)
	target_dsa_ids: ObjectId[];
	read_by: ObjectId[];
	created_at: Date;
	expires_at?: Date;
}

// ── Policy Document (6.10) ──────────────────────────────────
export interface PolicyDocument {
	_id?: ObjectId;
	rm_id: ObjectId;
	lender_name: string;
	title: string;
	description?: string;
	file_url: string; // ImageKit URL
	file_id: string; // ImageKit file ID
	version: number;
	supersedes?: ObjectId; // Previous version _id
	notified_dsa_ids: ObjectId[];
	created_at: Date;
}

// ── RM Reputation Score (6.14) — computed, not stored ───────
export type ReputationRating = 'excellent' | 'good' | 'average' | 'needs_improvement';

export interface RMReputationScore {
	overall_score: number; // 0-100
	response_time_avg_hours: number;
	query_resolution_rate: number; // 0-1
	accuracy_rating_avg: number; // 1-5
	dsa_satisfaction_avg: number; // 1-5
	case_count: number;
	rating: ReputationRating;
}

// ── Auto-Match Suggestion (6.12) ────────────────────────────
export interface AutoMatchSuggestion {
	rm_id: ObjectId;
	rm_name: string;
	lender_name: string;
	city?: string;
	score: number; // 0-100
	reasons: string[]; // e.g., ["Same city", "Same lender", "High reputation"]
}

// ── Policy Feedback Aggregate (6.13) ────────────────────────
export interface PolicyFeedbackAggregate {
	category: RatingCategory;
	lender_name: string;
	avg_rating: number;
	count: number;
	trend: 'up' | 'down' | 'stable';
}
