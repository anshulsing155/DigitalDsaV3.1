/**
 * POST /api/admin/policy-engine/versions/[version_id]/approve
 * Approve a policy version (pending_admin_final -> approved).
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiError, apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { PolicyVersions, PolicyAuditLogs } from '$lib/database/mongo.js';
import { isValidStatusTransition } from '$lib/types/policyEngine.js';

export const POST: RequestHandler = async ({ locals, params }) => {
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

		if (!isValidStatusTransition(version.status, 'approved')) {
			return apiError(
				`Cannot approve: version is in "${version.status}" status. Must be "pending_admin_final".`,
				400
			);
		}

		const now = new Date();
		await PolicyVersions.updateOne(
			{ _id: new ObjectId(versionId) },
			{ $set: { status: 'approved', updated_at: now } }
		);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: versionId,
			action: 'version_status_changed',
			actor_id: locals.user!.id,
			actor_name: locals.user!.name || locals.user!.email || 'Admin',
			actor_role: 'admin',
			details: { from: version.status, to: 'approved', policy_rule_id: version.policy_rule_id },
			created_at: now
		} as any);

		return apiOk({ version_id: versionId, status: 'approved' });
	} catch (err) {
		return apiServerError(err, 'Failed to approve version');
	}
};
