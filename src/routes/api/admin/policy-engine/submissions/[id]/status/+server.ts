/**
 * POST /api/admin/policy-engine/submissions/[id]/status
 * Transition an RM submission's status (admin).
 * Valid transitions:
 *   submitted -> under_review
 *   under_review -> clarification_needed | accepted | rejected
 *   clarification_needed -> under_review (after RM responds)
 */

import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import {
	apiError,
	apiOk,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { RMSubmissions, PolicyAuditLogs } from '$lib/database/mongo.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
	submitted: ['under_review'],
	under_review: ['clarification_needed', 'accepted', 'rejected'],
	clarification_needed: ['under_review', 'rejected']
};

// Zod schema mirrors RMSubmissionStatus union — locks input to known values
// before the transition check fires. Cleaner error than letting a garbage
// status fall through to "Cannot transition from X to <garbage>".
const postRequestSchema = z.object({
	status: z.enum(['submitted', 'under_review', 'clarification_needed', 'accepted', 'rejected']),
	admin_notes: z.string().max(2000).optional()
});

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;
	const validation = postRequestSchema.safeParse(parsed.data);
	if (!validation.success) {
		return apiValidationError('Invalid body', validation.error.flatten());
	}
	const body = validation.data;

	try {
		const submissionId = params.id;
		const newStatus = body.status;

		const submission = await RMSubmissions.findOne({ submission_id: submissionId });
		if (!submission) {
			return apiError('Submission not found', 404);
		}

		const allowed = VALID_TRANSITIONS[submission.status] || [];
		if (!allowed.includes(newStatus)) {
			return apiError(
				`Cannot transition from "${submission.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
				400
			);
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		const updates: Record<string, unknown> = {
			status: newStatus,
			updated_at: now
		};
		if (body.admin_notes) {
			updates.admin_notes = body.admin_notes;
		}

		await RMSubmissions.updateOne({ submission_id: submissionId }, { $set: updates });

		await PolicyAuditLogs.insertOne({
			target_type: 'rm_submission',
			target_id: submissionId,
			action: 'rm_submission_status_changed',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { from: submission.status, to: newStatus, admin_notes: body.admin_notes },
			created_at: now
		} as any);

		return apiOk({ submission_id: submissionId, from: submission.status, to: newStatus });
	} catch (err) {
		return apiServerError(err, 'Failed to change submission status');
	}
};
