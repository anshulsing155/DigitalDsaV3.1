/**
 * POST /api/notifications/subscribe
 * Save a browser push subscription for the authenticated user.
 */
import type { RequestHandler } from './$types';
import { requireAuthApi } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { parseJsonBody } from '$lib/server/apiResponse.js';
import { savePushSubscription } from '$lib/server/pushService.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const parsed = await parseJsonBody<{
		subscription: {
			endpoint: string;
			expirationTime?: number | null;
			keys: { p256dh: string; auth: string };
		};
	}>(request);
	if (!parsed.ok) return parsed.response;

	const { subscription } = parsed.data;

	// Basic validation — endpoint must be an HTTPS URL
	if (!subscription?.endpoint || !subscription.endpoint.startsWith('https://')) {
		return apiError('Invalid push subscription: endpoint must be HTTPS');
	}
	if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
		return apiError('Invalid push subscription: missing encryption keys');
	}

	try {
		const userAgent = request.headers.get('user-agent') || 'Unknown';
		const userRole = (locals.user!.activeRole || 'dsa') as 'dsa' | 'rm' | 'admin';

		const subscriptionId = await savePushSubscription(
			locals.user!.id,
			userRole,
			subscription,
			userAgent
		);

		return apiOk({ subscriptionId });
	} catch (err) {
		return apiServerError(err, 'push subscribe');
	}
};
