/**
 * POST /api/notifications/mark-all-read
 * Mark all unread notifications as read for the authenticated user.
 */
import type { RequestHandler } from './$types';
import { requireAuthApi, blockDemoWrite } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { markAllRead } from '$lib/server/notifications.js';

export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const markedCount = await markAllRead(locals.user!.id);
		return apiOk({ markedCount });
	} catch (err) {
		return apiServerError(err, 'notifications mark-all-read');
	}
};
