/**
 * PATCH /api/dsa/walkthrough — Update walkthrough state
 * ═══════════════════════════════════════════════════════════════════
 * Tracks which walkthrough steps the DSA has seen/completed.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { DsaApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { resolveDsaId } from '$lib/server/caseHelpers.js';
import { z } from 'zod';
import { apiOk, apiError, parseJsonBody } from '$lib/server/apiResponse.js';

const walkthroughUpdateSchema = z.object({
	current_step: z.number().int().min(0).max(20).optional(),
	step_seen: z.string().optional(),
	completed: z.boolean().optional(),
	dismissed: z.boolean().optional(),
	// Two-mode walkthrough fields
	intro_completed: z.boolean().optional(),
	explanatory_completed: z.boolean().optional(),
	// Per-page tour completion
	page_tour_completed: z
		.enum(['profile', 'cases', 'crm', 'communication', 'analytics', 'team', 'shared-links'])
		.optional()
});

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const authDenied = requireRoleApi(locals, 'dsa');
	if (authDenied) return authDenied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const result = await resolveDsaId(locals);
	if (!result.ok) return apiError(result.error, 404);

	const jsonParsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!jsonParsed.ok) return jsonParsed.response;
	const parsed = walkthroughUpdateSchema.safeParse(jsonParsed.data);
	if (!parsed.success) {
		return apiError('Invalid walkthrough data');
	}

	const updates = parsed.data;
	const now = new Date();
	const setFields: Record<string, any> = {};

	if (updates.current_step !== undefined) {
		setFields['walkthrough_state.current_step'] = updates.current_step;
	}

	if (updates.completed) {
		setFields['walkthrough_state.completed'] = true;
	}

	if (updates.dismissed) {
		setFields['walkthrough_state.dismissed_at'] = now;
		setFields['walkthrough_state.completed'] = true;
	}

	if (updates.intro_completed) {
		setFields['walkthrough_state.intro_completed'] = true;
		setFields['walkthrough_state.intro_dismissed_at'] = updates.dismissed ? now : undefined;
	}

	if (updates.explanatory_completed) {
		setFields['walkthrough_state.explanatory_completed'] = true;
	}

	if (updates.page_tour_completed) {
		setFields[`walkthrough_state.page_tours_completed.${updates.page_tour_completed}`] = true;
	}

	const pushFields: Record<string, any> = {};
	if (updates.step_seen) {
		pushFields['walkthrough_state.steps_seen'] = updates.step_seen;
	}

	const updateOp: any = {};
	if (Object.keys(setFields).length > 0) updateOp.$set = setFields;
	if (Object.keys(pushFields).length > 0) {
		updateOp.$addToSet = pushFields;
	}

	if (Object.keys(updateOp).length > 0) {
		await DsaApplications.updateOne({ _id: result.dsaId }, updateOp);
	}

	return apiOk();
};
