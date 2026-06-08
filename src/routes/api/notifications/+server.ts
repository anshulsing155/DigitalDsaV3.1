/**
 * GET /api/notifications
 * Fetch paginated notifications + unread count for the authenticated user.
 */
import type { RequestHandler } from './$types';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { getNotifications, getUnreadCount } from '$lib/server/notifications.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	try {
		const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);
		const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

		const [{ items, total }, unreadCount] = await Promise.all([
			getNotifications(locals.user!.id, { limit, offset }),
			getUnreadCount(locals.user!.id)
		]);

		return apiOk({ notifications: items, total, unreadCount });
	} catch (err) {
		return apiServerError(err, 'notifications GET');
	}
};
