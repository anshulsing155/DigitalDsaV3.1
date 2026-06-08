/**
 * F.5 — NPS eligibility + survey-row helpers
 * ══════════════════════════════════════════════════════════════════════
 * Pure date math for "which NPS window is this user in right now?",
 * plus a DB-backed check for "have they already answered that window?".
 *
 * Eligibility windows are tight (4 days each) so a user who's exactly
 * at day-30 sees the banner for ~4 days, then it disappears whether
 * they answered or not. This prevents the banner from nagging — once
 * the window closes, the next opportunity is the day-180 window.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.5
 */

import type { ObjectId } from 'mongodb';
import { SurveyResponses } from '$lib/database/mongo';
import {
	NPS_DAY30_OPENS_AT_DAYS,
	NPS_DAY30_CLOSES_AT_DAYS,
	NPS_DAY180_OPENS_AT_DAYS,
	NPS_DAY180_CLOSES_AT_DAYS
} from '$lib/types/survey';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type NpsWindow = 'day30' | 'day180';

/**
 * Compute which NPS window the user falls into based on their signup
 * date. Returns null when the user is outside both windows. Pure
 * function — no DB I/O. The caller pairs this with hasAnsweredWindow
 * to decide whether to actually show the banner.
 */
export function computeNpsWindow(
	signupDate: Date,
	now: Date = new Date()
): NpsWindow | null {
	const ageDays = (now.getTime() - signupDate.getTime()) / MS_PER_DAY;
	if (ageDays >= NPS_DAY30_OPENS_AT_DAYS && ageDays <= NPS_DAY30_CLOSES_AT_DAYS) {
		return 'day30';
	}
	if (ageDays >= NPS_DAY180_OPENS_AT_DAYS && ageDays <= NPS_DAY180_CLOSES_AT_DAYS) {
		return 'day180';
	}
	return null;
}

/**
 * Has the user already submitted an NPS response in the given window?
 * Quick indexed lookup (user_id + type + created_at index).
 */
export async function hasAnsweredNpsWindow(
	userId: ObjectId,
	window: NpsWindow
): Promise<boolean> {
	const row = await SurveyResponses.findOne(
		{ user_id: userId, type: 'nps', nps_window: window },
		{ projection: { _id: 1 } }
	);
	return row !== null;
}

/**
 * Combined check: returns the window the user should see right now
 * (eligible AND not already answered) OR null when no banner should
 * show. The dashboard layout calls this to decide whether to mount
 * NpsBanner.svelte.
 */
export async function getActiveNpsWindow(
	userId: ObjectId,
	signupDate: Date,
	now: Date = new Date()
): Promise<NpsWindow | null> {
	const window = computeNpsWindow(signupDate, now);
	if (!window) return null;
	const alreadyAnswered = await hasAnsweredNpsWindow(userId, window);
	return alreadyAnswered ? null : window;
}
