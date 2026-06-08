/**
 * POST /api/admin/policy-engine/versions/[version_id]/verbal-approval
 * Log a verbal RM approval for a policy version.
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

// 'portal' is excluded — that confirmation method is reserved for the RM-portal
// path. Verbal/email/whatsapp are the admin-logged out-of-band confirmations.
const postRequestSchema = z.object({
	method: z.enum(['verbal', 'email', 'whatsapp']).optional(),
	notes: z.string().max(2000).optional(),
	rm_name: z.string().max(200).optional()
});

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const versionId = params.version_id;
		if (!versionId || !ObjectId.isValid(versionId)) {
			return apiError('Invalid version_id', 400);
		}

		const version = await PolicyVersions.findOne({ _id: new ObjectId(versionId) });
		if (!version) {
			return apiError('Version not found', 404);
		}

		// Verbal approval skips RM portal — goes from pending_rm_review to pending_admin_final
		if (version.status !== 'pending_rm_review') {
			return apiError(
				`Cannot log verbal approval: version is in "${version.status}" status. Must be "pending_rm_review".`,
				400
			);
		}

		const newStatus = 'pending_admin_final';
		if (!isValidStatusTransition(version.status, newStatus)) {
			return apiError('Invalid status transition', 400);
		}

		const parsed = await parseJsonBody<Record<string, unknown>>(request);
		if (!parsed.ok) return parsed.response;
		const validation = postRequestSchema.safeParse(parsed.data);
		if (!validation.success) {
			return apiValidationError('Invalid body', validation.error.flatten());
		}
		const body = validation.data;
		const method = body.method ?? 'verbal';

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		await PolicyVersions.updateOne(
			{ _id: new ObjectId(versionId) },
			{
				$set: {
					status: newStatus,
					'provenance.confirmation_method': method,
					'provenance.confirmation_date': now,
					'provenance.confirmation_notes': body.notes || undefined,
					'provenance.source_rm_name': body.rm_name || version.provenance?.source_rm_name,
					updated_at: now
				}
			}
		);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: versionId,
			action: 'version_status_changed',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: {
				from: 'pending_rm_review',
				to: newStatus,
				confirmation_method: method,
				rm_name: body.rm_name || version.provenance?.source_rm_name,
				notes: body.notes
			},
			created_at: now
		} as any);

		return apiOk({ version_id: versionId, status: newStatus, confirmation_method: method });
	} catch (err) {
		return apiServerError(err, 'Failed to log verbal approval');
	}
};
