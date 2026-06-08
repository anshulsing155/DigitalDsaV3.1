/**
 * POST /api/notifications/unsubscribe
 * Deactivate a browser push subscription for the authenticated user.
 */
import type { RequestHandler } from './$types';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { parseJsonBody } from '$lib/server/apiResponse.js';
import { removePushSubscription } from '$lib/server/pushService.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const parsed = await parseJsonBody<{ endpoint: string }>(request);
	if (!parsed.ok) return parsed.response;

	const { endpoint } = parsed.data;
	if (!endpoint) {
		return apiError('Missing subscription endpoint');
	}

	try {
		const removed = await removePushSubscription(locals.user!.id, endpoint);
		return apiOk({ removed });
	} catch (err) {
		return apiServerError(err, 'push unsubscribe');
	}
};
