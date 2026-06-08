/**
 * POST /api/admin/policy-engine/versions/[version_id]/status
 * General-purpose status transition for policy versions (admin).
 * Supports: draft->pending_rm_review, rm_corrections_requested->pending_rm_review, any->rejected
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import {
	apiError,
	apiOk,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { PolicyVersions, PolicyAuditLogs } from '$lib/database/mongo.js';
import { isValidStatusTransition } from '$lib/types/policyEngine.js';

// Zod schema mirrors the PolicyVersionStatus union in $lib/types/policyEngine.
// Enum gate (instead of free string) locks the input to known statuses BEFORE
// the transition check fires — gives a clear "invalid status value" error
// instead of "Cannot transition from X to <garbage>".
const postRequestSchema = z.object({
	status: z.enum([
		'draft',
		'pending_rm_review',
		'rm_corrections_requested',
		'pending_admin_final',
		'approved',
		'active',
		'superseded',
		'rejected'
	]),
	reason: z.string().max(1000).optional()
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
		const versionId = params.version_id;
		if (!versionId || !ObjectId.isValid(versionId)) {
			return apiError('Invalid version_id', 400);
		}

		const newStatus = body.status;

		const version = await PolicyVersions.findOne({ _id: new ObjectId(versionId) });
		if (!version) {
			return apiError('Version not found', 404);
		}

		if (!isValidStatusTransition(version.status, newStatus)) {
			return apiError(`Cannot transition from "${version.status}" to "${newStatus}"`, 400);
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		await PolicyVersions.updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { status: newStatus, updated_at: now } }
		);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: versionId,
			action: 'version_status_changed',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { from: version.status, to: newStatus, reason: body.reason },
			created_at: now
		} as any);

		return apiOk({ version_id: versionId, from: version.status, to: newStatus });
	} catch (err) {
		return apiServerError(err, 'Failed to change version status');
	}
};
