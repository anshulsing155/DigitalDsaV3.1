/**
 * POST /api/surveys/nps
 * ══════════════════════════════════════════════════════════════════════
 * Submit an NPS response (0-10 score + optional free-text reason).
 * Idempotent per (user, window) — a re-submit in the same window
 * just updates the existing row's score + reason rather than creating
 * a duplicate. Outside the eligible window → 400 (defensive; the UI
 * should not present the form when not eligible).
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §F.5
 */

import type { RequestHandler } from './$types';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse';
import { requireAuthApi } from '$lib/server/guards';
import {
	SurveyResponses,
	DsaApplications,
	rmApplications,
	AdminUsers,
	Applicant
} from '$lib/database/mongo';
import { findUserByMobile } from '$lib/server/csfle';
import { computeNpsWindow } from '$lib/server/account/surveys';
import logger from '$lib/server/logger';

const npsSchema = z.object({
	score: z.number().int().min(0).max(10),
	reason: z.string().max(500).optional(),
	text: z.string().max(2000).optional()
});

async function resolveUser(
	role: string,
	mobileNumber: string
): Promise<{ _id: ObjectId; created_at?: Date } | null> {
	if (role === 'dsa') return (await findUserByMobile(DsaApplications, mobileNumber)) as any;
	if (role === 'rm') return (await findUserByMobile(rmApplications, mobileNumber)) as any;
	if (role === 'admin') return (await findUserByMobile(AdminUsers, mobileNumber)) as any;
	return (await findUserByMobile(Applicant, mobileNumber)) as any;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = npsSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Validation failed', validated.error.flatten());
	}

	try {
		const role = sessionUser.activeRole ?? sessionUser.role ?? 'dsa';
		const userRole: 'dsa' | 'rm' | 'admin' =
			role === 'dsa' || role === 'rm' || role === 'admin' ? role : 'dsa';
		const userDoc = await resolveUser(role, sessionUser.mobileNumber);
		if (!userDoc?._id) return apiError('User profile not found', 404);

		// Determine which window this submission belongs to. If the user
		// is outside any window, reject — the UI shouldn't have shown the
		// form. This guards against late-submission curveballs (e.g. the
		// user opens the banner at day 31:23:59, takes 5 minutes to type,
		// and submits at day 32:00:04 — we accept; outside that buffer
		// they get a friendly "thanks but this window closed" message).
		const created_at =
			(userDoc as { created_at?: Date }).created_at ?? new Date();
		const npsWindow = computeNpsWindow(created_at);
		if (!npsWindow) {
			return apiError(
				'The survey window has closed. Thanks for the thought — we appreciate it.',
				400
			);
		}

		// Idempotent upsert per (user, window). Re-submits update the
		// score; we don't create duplicate rows.
		await SurveyResponses.updateOne(
			{ user_id: userDoc._id, type: 'nps', nps_window: npsWindow },
			{
				$set: {
					score: validated.data.score,
					...(validated.data.reason && { reason: validated.data.reason }),
					...(validated.data.text && { text: validated.data.text }),
					user_role: userRole,
					created_at: new Date()
				},
				$setOnInsert: {
					user_id: userDoc._id,
					type: 'nps' as const,
					nps_window: npsWindow
				}
			},
			{ upsert: true }
		);

		logger.info(
			{
				user_id: String(userDoc._id),
				role: userRole,
				nps_window: npsWindow,
				score: validated.data.score
			},
			'[surveys] NPS response recorded'
		);

		return apiOk({ window: npsWindow });
	} catch (err) {
		return apiServerError(err, 'Failed to record NPS response');
	}
};
