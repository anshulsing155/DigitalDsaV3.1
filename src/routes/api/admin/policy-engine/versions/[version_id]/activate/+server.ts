/**
 * POST /api/admin/policy-engine/versions/[version_id]/activate
 * Activate a policy version (approved -> active), supersede previous, bust cache.
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
import { PolicyVersions, PolicyRules, PolicyAuditLogs } from '$lib/database/mongo.js';
import { isValidStatusTransition } from '$lib/types/policyEngine.js';
import { bustCacheForLender } from '$lib/server/policyResolver.js';

// Optional ISO datetime — defaults to now when omitted. Strict ISO check
// (z.string().datetime()) avoids the loose `new Date(any)` accepting garbage.
const postRequestSchema = z.object({
	effective_from: z.string().datetime().optional()
});

export const POST: RequestHandler = async ({ locals, params, request }) => {
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

		if (!isValidStatusTransition(version.status, 'active')) {
			return apiError(
				`Cannot activate: version is in "${version.status}" status. Must be "approved".`,
				400
			);
		}

		// Parse optional effective_from from body (Zod-validated ISO datetime).
		// Body is empty-optional — only validate the shape when it's present.
		let effective_from: Date | undefined;
		const parsed = await parseJsonBody<Record<string, unknown>>(request);
		if (parsed.ok) {
			const validation = postRequestSchema.safeParse(parsed.data);
			if (!validation.success) {
				return apiValidationError('Invalid body', validation.error.flatten());
			}
			if (validation.data.effective_from) {
				effective_from = new Date(validation.data.effective_from);
			}
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		// Get the rule to find previous active version
		const rule = await PolicyRules.findOne({ policy_rule_id: version.policy_rule_id });
		if (!rule) {
			return apiError('Associated rule not found', 404);
		}

		// Supersede previous active version (if any)
		if (rule.active_version_id) {
			await PolicyVersions.updateOne(
				{ _id: rule.active_version_id },
				{ $set: { status: 'superseded', effective_until: now, updated_at: now } }
			);

			await PolicyAuditLogs.insertOne({
				target_type: 'policy_version',
				target_id: rule.active_version_id.toString(),
				action: 'version_superseded',
				actor_id: actorId,
				actor_name: actorName,
				actor_role: 'admin',
				details: { superseded_by: versionId, policy_rule_id: version.policy_rule_id },
				created_at: now
			} as any);
		}

		// Activate the new version
		await PolicyVersions.updateOne(
			{ _id: new ObjectId(versionId) },
			{
				$set: {
					status: 'active',
					effective_from: effective_from || now,
					updated_at: now
				}
			}
		);

		// Update rule to point to new active version
		await PolicyRules.updateOne(
			{ policy_rule_id: version.policy_rule_id },
			{
				$set: {
					active_version_id: new ObjectId(versionId),
					active_version_number: version.version_number,
					updated_at: now
				}
			}
		);

		// Bust resolution cache for this lender
		bustCacheForLender(rule.lender_id);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: versionId,
			action: 'version_activated',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: {
				policy_rule_id: version.policy_rule_id,
				version_number: version.version_number,
				effective_from: (effective_from || now).toISOString()
			},
			created_at: now
		} as any);

		return apiOk({
			version_id: versionId,
			status: 'active',
			effective_from: (effective_from || now).toISOString()
		});
	} catch (err) {
		return apiServerError(err, 'Failed to activate version');
	}
};
