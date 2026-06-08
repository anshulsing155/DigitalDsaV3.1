/**
 * POST /api/admin/policy-engine/rules/[rule_id]/rollback
 * Creates a new draft version by copying fields from a previous version.
 * The new version must go through the full approval workflow.
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
import { PolicyVersions, PolicyRules, PolicyAuditLogs } from '$lib/database/mongo.js';

// Source version must be a positive integer — matches the .findOne by
// version_number lookup below. Replaces hand-typed parseJsonBody + manual
// "must be a positive integer" check.
const postRequestSchema = z.object({
	source_version_number: z.number().int().positive()
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
		const ruleId = params.rule_id;
		if (!ruleId) {
			return apiError('rule_id is required', 400);
		}

		const sourceVersionNumber = body.source_version_number;

		// Verify the policy rule exists
		const rule = await PolicyRules.findOne({ policy_rule_id: ruleId });
		if (!rule) {
			return apiError('Policy rule not found', 404);
		}

		// Load the source version to copy from
		const sourceVersion = await PolicyVersions.findOne({
			policy_rule_id: ruleId,
			version_number: sourceVersionNumber
		});
		if (!sourceVersion) {
			return apiError(`Version ${sourceVersionNumber} not found`, 404);
		}

		// Determine next version number
		const latestVersion = await PolicyVersions.findOne(
			{ policy_rule_id: ruleId },
			{ sort: { version_number: -1 }, projection: { version_number: 1 } }
		);
		const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		// Create new draft version with copied fields
		const newVersion = {
			policy_rule_id: ruleId,
			version_number: nextVersionNumber,
			status: 'draft' as const,
			policy_fields: { ...sourceVersion.policy_fields },
			rule_overlays: [...(sourceVersion.rule_overlays || [])],
			provenance: {
				source_type: 'admin_manual' as const,
				document_ids: []
			},
			changelog: [
				{
					field: '_rollback',
					old_value: `v${sourceVersionNumber}`,
					new_value: `v${nextVersionNumber}`,
					description: `Rolled back to version ${sourceVersionNumber} by ${actorName}`
				}
			],
			created_by: actorId,
			created_at: now,
			updated_at: now
		};

		const insertResult = await PolicyVersions.insertOne(newVersion as any);

		// Audit log
		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: insertResult.insertedId.toString(),
			action: 'version_created',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: {
				rollback_from: sourceVersionNumber,
				new_version: nextVersionNumber,
				policy_rule_id: ruleId
			},
			created_at: now
		} as any);

		return apiOk({
			version_id: insertResult.insertedId.toString(),
			version_number: nextVersionNumber,
			rolled_back_from: sourceVersionNumber
		});
	} catch (err) {
		return apiServerError(err, 'Failed to create rollback version');
	}
};
