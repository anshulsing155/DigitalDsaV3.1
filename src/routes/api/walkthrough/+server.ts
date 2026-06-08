/**
 * PATCH /api/walkthrough — Universal walkthrough state persistence
 * ═══════════════════════════════════════════════════════════════════
 * Detects user role and persists walkthrough state to the correct collection.
 * Works for DSA, RM, and Admin roles.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { DsaApplications, rmApplications, AdminUsers } from '$lib/database/mongo.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { ObjectId } from 'mongodb';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;
	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const role = locals.user!.activeRole || 'dsa';
	const userId = locals.user!.id;

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	const now = new Date();
	const setFields: Record<string, unknown> = {};
	const pushFields: Record<string, unknown> = {};

	if (body.current_step !== undefined) {
		setFields['walkthrough_state.current_step'] = body.current_step;
	}
	if (body.completed) {
		setFields['walkthrough_state.completed'] = true;
	}
	if (body.dismissed) {
		setFields['walkthrough_state.dismissed_at'] = now;
		setFields['walkthrough_state.completed'] = true;
	}
	if (body.intro_completed) {
		setFields['walkthrough_state.intro_completed'] = true;
		if (body.dismissed) {
			setFields['walkthrough_state.intro_dismissed_at'] = now;
		}
	}
	// Lifetime exposure marker — set the first time the intro auto-trigger
	// fires for this user. Stamped server-side (Date) so the layout read can
	// detect "has the auto-trigger ever fired?" across all sessions. See
	// WalkthroughDbState.intro_auto_triggered_at for the design rationale.
	if (body.intro_auto_triggered) {
		setFields['walkthrough_state.intro_auto_triggered_at'] = now;
	}
	if (body.explanatory_completed) {
		setFields['walkthrough_state.explanatory_completed'] = true;
	}
	if (body.page_tour_completed && typeof body.page_tour_completed === 'string') {
		setFields[`walkthrough_state.page_tours_completed.${body.page_tour_completed}`] = true;
	}
	if (body.step_seen) {
		pushFields['walkthrough_state.steps_seen'] = body.step_seen;
	}

	const updateOp: Record<string, unknown> = {};
	if (Object.keys(setFields).length > 0) updateOp.$set = setFields;
	if (Object.keys(pushFields).length > 0) updateOp.$addToSet = pushFields;

	if (Object.keys(updateOp).length === 0) {
		return apiOk();
	}

	try {
		let userOid: ObjectId;
		try {
			userOid = new ObjectId(userId);
		} catch {
			return apiError('Invalid user ID');
		}

		if (role === 'rm') {
			await rmApplications.updateOne({ _id: userOid }, updateOp);
		} else if (role === 'admin') {
			await AdminUsers.updateOne({ _id: userOid }, updateOp);
		} else {
			await DsaApplications.updateOne({ _id: userOid }, updateOp);
		}

		return apiOk();
	} catch (err) {
		return apiServerError(err, 'Failed to save');
	}
};
