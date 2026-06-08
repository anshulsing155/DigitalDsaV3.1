/**
 * GET/POST /api/admin/policy-engine/rules/[rule_id]/versions
 * List and create policy versions for a rule.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import {
	apiError,
	apiOk,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { PolicyRules, PolicyVersions, PolicyAuditLogs } from '$lib/database/mongo.js';
import type { PolicyFields, PolicyVersionStatus } from '$lib/types/policyEngine.js';
import { z } from 'zod';

/** Zod schema for creating a new policy version */
const createVersionSchema = z.object({
	/** Core policy data — flexible record since PolicyFields is Partial<Record<key, unknown>> */
	policy_fields: z.record(z.string(), z.unknown()).optional(),

	/** JSON-Logic rule overlays for this version */
	rule_overlays: z.array(z.record(z.string(), z.unknown())).optional(),

	/** Human-readable documentation of this policy version */
	human_readable_doc: z.string().optional(),

	/** Provenance fields — how this version was sourced */
	source_type: z
		.enum(['admin_manual', 'rm_submission', 'document_parse', 'bulk_import'])
		.optional(),
	source_rm_id: z.string().optional(),
	source_rm_name: z.string().optional(),
	document_ids: z.array(z.string()).optional(),
	confirmation_method: z.enum(['portal', 'verbal', 'email', 'whatsapp']).optional(),
	artifact_id: z.string().optional(),

	/** Change log entries for this version */
	changelog: z.array(z.string()).optional(),

	/** ISO date string for when this version becomes effective.
	 * Strict ISO check avoids new Date(garbage) silently producing Invalid Date. */
	effective_from: z.string().datetime().optional()
});

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const policy_rule_id = params.rule_id;
		const versions = await PolicyVersions.find({ policy_rule_id })
			.sort({ version_number: -1 })
			.toArray();

		return apiOk(
			versions.map((v) => ({
				...v,
				_id: v._id.toString()
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list versions');
	}
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<z.infer<typeof createVersionSchema>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = createVersionSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid input', validated.error.issues);
	}
	const body = validated.data;

	try {
		const policy_rule_id = params.rule_id;

		// Verify rule exists
		const rule = await PolicyRules.findOne({ policy_rule_id });
		if (!rule) {
			return apiError('Policy rule not found', 404);
		}

		// Auto-increment version number
		const latestVersion = await PolicyVersions.findOne(
			{ policy_rule_id },
			{ sort: { version_number: -1 } }
		);
		const version_number = latestVersion ? latestVersion.version_number + 1 : 1;

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		const doc = {
			policy_rule_id,
			version_number,
			status: 'draft' as PolicyVersionStatus,
			policy_fields: (body.policy_fields || {}) as PolicyFields,
			rule_overlays: body.rule_overlays || [],
			human_readable_doc: body.human_readable_doc || undefined,
			provenance: {
				source_type: body.source_type || 'admin_manual',
				source_rm_id: body.source_rm_id || undefined,
				source_rm_name: body.source_rm_name || undefined,
				document_ids: body.document_ids || [],
				confirmation_method: body.confirmation_method || undefined,
				artifact_id: body.artifact_id || undefined
			},
			changelog: body.changelog || [],
			effective_from: body.effective_from ? new Date(body.effective_from) : undefined,
			created_by: actorId,
			created_at: now,
			updated_at: now
		};

		const result = await PolicyVersions.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'policy_version',
			target_id: result.insertedId.toString(),
			action: 'version_created',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: { policy_rule_id, version_number, source_type: doc.provenance.source_type },
			created_at: now
		} as any);

		return apiOk(
			{ _id: result.insertedId.toString(), policy_rule_id, version_number },
			201
		);
	} catch (err) {
		return apiServerError(err, 'Failed to create version');
	}
};
