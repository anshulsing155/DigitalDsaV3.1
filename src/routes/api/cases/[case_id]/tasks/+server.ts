/**
 * GET / POST  /api/cases/[case_id]/tasks
 * ══════════════════════════════════════════════════════════════════
 * Task management for a specific case.
 *
 * GET:  List all tasks for a case.
 * POST: Create a new manual task.
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { CaseTasks } from '$lib/database/mongo.js';
import { taskCreateSchema } from '$lib/schemas/caseTask.schema.js';
import {
	resolveEffectiveDsaId,
	verifyCaseOwnership,
	createTimelineEvent
} from '$lib/server/caseHelpers.js';
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import logger from '$lib/server/logger.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

// ── GET — List tasks for a case ─────────────────────────────────

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);
		const dsaId = result.dsaId;

		const caseId = params.case_id;
		const ownership = await verifyCaseOwnership(caseId, dsaId);
		if (!ownership.ok) return apiError(ownership.error, 404);

		const tasks = await CaseTasks.find({ case_id: caseId, dsa_id: dsaId })
			.sort({ status: 1, due_date: 1, created_at: -1 })
			.toArray();

		return apiOk({ tasks });
	} catch (err) {
		return apiServerError(err, 'Failed to fetch tasks');
	}
};

// ── POST — Create a new task ────────────────────────────────────

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const parsed = await parseJsonBody<unknown>(request);
	if (!parsed.ok) return parsed.response;

	const validation = taskCreateSchema.safeParse(parsed.data);
	if (!validation.success) {
		logger.warn({ issues: validation.error.issues }, 'Task validation failed');
		return apiError('Invalid task data', 400);
	}

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);
		const dsaId = result.dsaId;

		const caseId = params.case_id;
		const ownership = await verifyCaseOwnership(caseId, dsaId);
		if (!ownership.ok) return apiError(ownership.error, 404);

		const body = validation.data;

		// Generate task_id: count existing tasks for this case + 1
		const count = await CaseTasks.countDocuments({ case_id: caseId });
		const taskId = `T-${caseId}-${count + 1}`;

		const now = new Date();
		const task = {
			task_id: taskId,
			case_id: caseId,
			dsa_id: dsaId,
			title: body.title,
			description: body.description,
			priority: body.priority,
			status: 'pending' as const,
			due_date: body.due_date ? new Date(body.due_date) : undefined,
			source: 'manual' as const,
			lender_app_id: body.lender_app_id,
			created_at: now,
			updated_at: now
		};

		const insertResult = await CaseTasks.insertOne(task);

		await createTimelineEvent(caseId, 'case_updated', `Task created: ${body.title}`);

		return apiOk({ _id: insertResult.insertedId, task_id: taskId }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create task');
	}
};
