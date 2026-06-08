/**
 * POST /api/surveys/exit
 * ══════════════════════════════════════════════════════════════════════
 * Submit an exit-survey response. Called inline in the cancel flow.
 * BOTH the reason and the free-text are optional — per spec, we never
 * hold the cancel hostage to survey completion. The cancel proceeds
 * regardless of whether the user submits.
 *
 * Multiple submissions per user are allowed (no upsert) — a user who
 * cancels, re-subscribes, then cancels again should have both data
 * points in the admin dashboard.
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
import { EXIT_SURVEY_REASONS, type ExitSurveyReason } from '$lib/types/survey';
import logger from '$lib/server/logger';

const exitSchema = z.object({
	reason: z
		.enum(EXIT_SURVEY_REASONS as readonly [ExitSurveyReason, ...ExitSurveyReason[]])
		.optional(),
	text: z.string().max(2000).optional()
});

async function resolveUserId(
	role: string,
	mobileNumber: string
): Promise<ObjectId | null> {
	let doc: { _id: ObjectId } | null = null;
	if (role === 'dsa') doc = await findUserByMobile(DsaApplications, mobileNumber);
	else if (role === 'rm') doc = await findUserByMobile(rmApplications, mobileNumber);
	else if (role === 'admin') doc = await findUserByMobile(AdminUsers, mobileNumber);
	else doc = await findUserByMobile(Applicant, mobileNumber);
	return doc?._id ?? null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = exitSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Validation failed', validated.error.flatten());
	}

	try {
		const role = sessionUser.activeRole ?? sessionUser.role ?? 'dsa';
		const userRole: 'dsa' | 'rm' | 'admin' =
			role === 'dsa' || role === 'rm' || role === 'admin' ? role : 'dsa';
		const userId = await resolveUserId(role, sessionUser.mobileNumber);
		if (!userId) return apiError('User profile not found', 404);

		await SurveyResponses.insertOne({
			user_id: userId,
			user_role: userRole,
			type: 'exit',
			...(validated.data.reason && { reason: validated.data.reason }),
			...(validated.data.text && { text: validated.data.text }),
			created_at: new Date()
		});

		logger.info(
			{
				user_id: String(userId),
				role: userRole,
				reason: validated.data.reason ?? null,
				has_text: !!validated.data.text
			},
			'[surveys] Exit survey response recorded'
		);

		return apiOk({ recorded: true });
	} catch (err) {
		return apiServerError(err, 'Failed to record exit survey response');
	}
};
