/**
 * POST /api/admin/policy-engine/comments/[id]/resolve
 * Mark a review comment as resolved.
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { ReviewComments } from '$lib/database/mongo.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async ({ locals, params }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	try {
		const commentId = params.id;
		if (!commentId || !ObjectId.isValid(commentId)) {
			return apiError('Invalid comment ID');
		}

		const comment = await ReviewComments.findOne({ _id: new ObjectId(commentId) });
		if (!comment) {
			return apiError('Comment not found', 404);
		}

		if (comment.is_resolved) {
			return apiOk({ already_resolved: true });
		}

		await ReviewComments.updateOne(
			{ _id: new ObjectId(commentId) },
			{
				$set: {
					is_resolved: true,
					resolved_by: locals.user!.id,
					resolved_at: new Date()
				}
			}
		);

		return apiOk({ comment_id: commentId, resolved: true });
	} catch (err) {
		return apiServerError(err, 'Failed to resolve comment');
	}
};
