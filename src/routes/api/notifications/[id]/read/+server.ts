/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read.
 */
import type { RequestHandler } from './$types';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { markAsRead } from '$lib/server/notifications.js';

export const PATCH: RequestHandler = async ({ params, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		// Validate ObjectId format (24 hex chars)
		if (!/^[a-f\d]{24}$/i.test(params.id)) {
			return apiError('Invalid notification ID', 400);
		}

		const updated = await markAsRead(params.id, locals.user!.id);
		if (!updated) {
			return apiError('Notification not found', 404);
		}

		return apiOk({ marked: true });
	} catch (err) {
		return apiServerError(err, 'notification mark-read');
	}
};
