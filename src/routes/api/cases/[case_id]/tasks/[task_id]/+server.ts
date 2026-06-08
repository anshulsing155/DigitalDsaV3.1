/**
 * PATCH / DELETE  /api/cases/[case_id]/tasks/[task_id]
 * ══════════════════════════════════════════════════════════════════
 * Update or delete a specific task.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { CaseTasks } from '$lib/database/mongo.js';
import { taskUpdateSchema } from '$lib/schemas/caseTask.schema.js';
import { resolveEffectiveDsaId, verifyCaseOwnership } from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

// ── PATCH — Update task ─────────────────────────────────────────

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<unknown>(request);
	if (!parsed.ok) return parsed.response;

	const validation = taskUpdateSchema.safeParse(parsed.data);
	if (!validation.success) {
		logger.warn({ issues: validation.error.issues }, 'Task validation failed');
		return apiError('Invalid task data', 400);
	}

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);
		const dsaId = result.dsaId;

		const { case_id: caseId, task_id: taskId } = params;
		const ownership = await verifyCaseOwnership(caseId, dsaId);
		if (!ownership.ok) return apiError(ownership.error, 404);

		const body = validation.data;
		const update: Record<string, any> = { updated_at: new Date() };

		if (body.title !== undefined) update.title = body.title;
		if (body.description !== undefined) update.description = body.description;
		if (body.priority !== undefined) update.priority = body.priority;
		if (body.due_date !== undefined) {
			update.due_date = body.due_date ? new Date(body.due_date) : null;
		}
		if (body.status !== undefined) {
			update.status = body.status;
			if (body.status === 'done') {
				update.completed_at = new Date();
			} else {
				update.completed_at = null;
			}
		}

		const updateResult = await CaseTasks.updateOne(
			{ task_id: taskId, case_id: caseId, dsa_id: dsaId },
			{ $set: update }
		);

		if (updateResult.matchedCount === 0) {
			return apiError('Task not found', 404);
		}

		return apiOk({ modified: updateResult.modifiedCount });
	} catch (err) {
		return apiServerError(err, 'Failed to update task');
	}
};

// ── DELETE — Remove task ────────────────────────────────────────

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);
		const dsaId = result.dsaId;

		const { case_id: caseId, task_id: taskId } = params;
		const ownership = await verifyCaseOwnership(caseId, dsaId);
		if (!ownership.ok) return apiError(ownership.error, 404);

		const deleteResult = await CaseTasks.deleteOne({
			task_id: taskId,
			case_id: caseId,
			dsa_id: dsaId
		});

		if (deleteResult.deletedCount === 0) {
			return apiError('Task not found', 404);
		}

		return apiOk({ deleted: true });
	} catch (err) {
		return apiServerError(err, 'Failed to delete task');
	}
};
