/**
 * GET/POST /api/admin/policy-engine/comments
 * List and create review comments on policy versions or RM submissions.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ReviewComments, PolicyAuditLogs } from '$lib/database/mongo.js';
import type { ReviewTargetType } from '$lib/types/policyEngine.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';

const VALID_TARGET_TYPES: ReviewTargetType[] = ['policy_version', 'rm_submission'];

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const target_type = url.searchParams.get('target_type') as ReviewTargetType | null;
		const target_id = url.searchParams.get('target_id');

		const filter: Record<string, unknown> = {};
		if (target_type) filter.target_type = target_type;
		if (target_id && ObjectId.isValid(target_id)) {
			filter.target_id = new ObjectId(target_id);
		}

		const comments = await ReviewComments.find(filter)
			.sort({ created_at: -1 })
			.limit(100)
			.toArray();

		return apiOk(
			comments.map((c) => ({
				...c,
				_id: c._id.toString(),
				target_id: c.target_id.toString(),
				resolved_at: c.resolved_at ? new Date(c.resolved_at).toISOString() : null,
				created_at: c.created_at ? new Date(c.created_at).toISOString() : null
			}))
		);
	} catch (err) {
		return apiServerError(err, 'Failed to list comments');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const parsed = await parseJsonBody<Record<string, any>>(request);
	if (!parsed.ok) return parsed.response;
	const body = parsed.data;

	try {
		if (!body.target_type || !VALID_TARGET_TYPES.includes(body.target_type)) {
			return apiError(`target_type must be one of: ${VALID_TARGET_TYPES.join(', ')}`);
		}
		if (!body.target_id || !ObjectId.isValid(body.target_id)) {
			return apiError('target_id must be a valid ObjectId');
		}
		if (!body.text || typeof body.text !== 'string' || body.text.trim().length < 2) {
			return apiError('text is required (min 2 characters)');
		}

		const now = new Date();
		const actorId = locals.user!.id;
		const actorName = locals.user!.name || locals.user!.email || 'Admin';

		const doc = {
			target_type: body.target_type as ReviewTargetType,
			target_id: new ObjectId(body.target_id),
			author_id: actorId,
			author_name: actorName,
			author_role: 'admin' as const,
			text: body.text.trim(),
			attachment_ids: body.attachment_ids || [],
			is_resolved: false,
			created_at: now
		};

		const result = await ReviewComments.insertOne(doc as any);

		await PolicyAuditLogs.insertOne({
			target_type: 'comment',
			target_id: result.insertedId.toString(),
			action: 'comment_added',
			actor_id: actorId,
			actor_name: actorName,
			actor_role: 'admin',
			details: {
				target_type: body.target_type,
				target_id: body.target_id,
				text_preview: body.text.slice(0, 100)
			},
			created_at: now
		} as any);

		return apiOk({ _id: result.insertedId.toString() }, 201);
	} catch (err) {
		return apiServerError(err, 'Failed to create comment');
	}
};
