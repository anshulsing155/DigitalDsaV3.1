/**
 * GET  /api/tasks
 * ══════════════════════════════════════════════════════════════════
 * List all tasks for the authenticated DSA across all cases.
 * Used by the DSA dashboard "My Tasks" section.
 *
 * Query params:
 *   status  — filter by status (pending, in_progress, done, cancelled)
 *   limit   — max results (default 10, max 50)
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { CaseTasks } from '$lib/database/mongo.js';
import { resolveEffectiveDsaId } from '$lib/server/caseHelpers.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const result = await resolveEffectiveDsaId(locals);
		if (!result.ok) return apiError(result.error, 404);
		const dsaId = result.dsaId;

		const status = url.searchParams.get('status');
		const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
		const parsedLimit = parseInt(url.searchParams.get('limit') || '10', 10);
		const limit = Math.min(50, Math.max(1, Number.isNaN(parsedLimit) ? 10 : parsedLimit));

		const filter: Record<string, any> = { dsa_id: dsaId };

		if (status && validStatuses.includes(status)) {
			filter.status = status;
		} else {
			// Default: show pending + in_progress
			filter.status = { $in: ['pending', 'in_progress'] };
		}

		const tasks = await CaseTasks.find(filter)
			.sort({ due_date: 1, priority: -1, created_at: -1 })
			.limit(limit)
			.toArray();

		const total = await CaseTasks.countDocuments(filter);

		return apiOk({ tasks, total });
	} catch (err) {
		return apiServerError(err, 'Failed to fetch tasks');
	}
};
