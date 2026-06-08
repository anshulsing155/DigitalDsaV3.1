/**
 * F.5 — NPS + exit survey response document
 * ══════════════════════════════════════════════════════════════════════
 * Two survey types share one collection (cheaper indexing, same shape):
 *
 *   nps  — "How likely are you to recommend DigitalDSA?" (0-10 score
 *          + optional free-text reason). Triggered at day-30 + day-180
 *          from signup, once per window.
 *
 *   exit — "Why are you cancelling?" inline in the D.1 cancel flow.
 *          Optional structured reason + free text. Cancel proceeds
 *          regardless of whether the user submits.
 *
 * Score is required + 0-10 inclusive for nps; ignored for exit.
 * Reason is the structured pick from EXIT_SURVEY_REASONS for exit;
 * free text for nps.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.5
 */

import type { ObjectId } from 'mongodb';

export type SurveyType = 'nps' | 'exit';

export interface SurveyResponseDoc {
	_id?: ObjectId;
	user_id: ObjectId;
	user_role: 'dsa' | 'rm' | 'admin';
	type: SurveyType;
	/** NPS only: 0-10 inclusive. Undefined for exit surveys. */
	score?: number;
	/** Exit: enum from EXIT_SURVEY_REASONS. NPS: free text (one of). */
	reason?: string;
	/** Free-text follow-up. Both surveys allow this. */
	text?: string;
	created_at: Date;
	/**
	 * For NPS only: which trigger window this row answered. Drives the
	 * "already answered in this window" idempotency check so the banner
	 * doesn't reappear. Exit surveys carry undefined.
	 */
	nps_window?: 'day30' | 'day180';
}

/**
 * Exit-survey reasons (spec). 'other' allows free text in `text`.
 */
export const EXIT_SURVEY_REASONS = [
	'too_expensive',
	'not_enough_cases',
	'missing_feature',
	'found_alternative',
	'technical_issues',
	'other'
] as const;

export type ExitSurveyReason = (typeof EXIT_SURVEY_REASONS)[number];

export const EXIT_SURVEY_REASON_LABELS: Record<ExitSurveyReason, string> = {
	too_expensive: 'Too expensive',
	not_enough_cases: "I'm not getting enough cases through this",
	missing_feature: 'Missing a feature I need',
	found_alternative: 'Found a better alternative',
	technical_issues: 'Technical issues / bugs',
	other: 'Other'
};

// ── NPS window math ────────────────────────────────────────────

/** Day-30 NPS window opens at +28d, closes at +32d (4-day window). */
export const NPS_DAY30_OPENS_AT_DAYS = 28;
export const NPS_DAY30_CLOSES_AT_DAYS = 32;

/** Day-180 NPS window opens at +178d, closes at +182d (4-day window). */
export const NPS_DAY180_OPENS_AT_DAYS = 178;
export const NPS_DAY180_CLOSES_AT_DAYS = 182;
