/**
 * POST /api/pms/policies/[id]/clause-comment
 *
 * Phase 6: admin attaches a review comment to a specific clause. The comment
 * is visible to the RM on rejection and in the audit trail.
 *
 * Body: { clauseId: string, comment: string }
 *   - Empty comment removes any existing comment for that clauseId.
 *   - Only works on 'submitted' policies (review state).
 */

import type { RequestHandler } from './$types';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import {
	upsertAdminClauseComment,
	PolicyNotFoundError
} from '$lib/server/pms/policyService.js';
import { z } from 'zod';

// DX-2: clauseId is required-non-empty; comment is a string (empty
// comment removes the existing comment per the route docstring). 1000
// char cap matches the prior hand-rolled check.
const postRequestSchema = z.object({
	clauseId: z.string().trim().min(1, 'clauseId is required'),
	comment: z.string().max(1000, 'comment too long (max 1000 chars)')
});

export const POST: RequestHandler = async ({ locals, params, request, getClientAddress }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	const ip = getClientAddress();
	const limited = await rateLimit(ip, { maxRequests: 30, windowMs: 60_000, identifier: `pms_clause_comment:${ip}` });
	if (limited) return apiError('Too many requests. Please slow down.', 429);

	const { id } = params;

	const body = await parseJsonBody<Record<string, unknown>>(request);
	if (!body.ok) return body.response;

	const validated = postRequestSchema.safeParse(body.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { clauseId, comment } = validated.data;

	try {
		await upsertAdminClauseComment(id, clauseId, comment);
		return apiOk({ message: comment.trim() ? 'Comment saved.' : 'Comment removed.' });
	} catch (err) {
		if (err instanceof PolicyNotFoundError) return apiError('Policy not found', 404);
		return apiServerError(err, 'pms clause-comment POST');
	}
};
