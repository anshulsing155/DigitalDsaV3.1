import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { DisclaimerAcceptances } from '$lib/database/mongo';
import { getDisclaimer } from '$lib/types/disclaimer';

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	if (!locals.user?.id) {
		return apiError('Unauthorized', 401);
	}

	const parsed = await parseJsonBody<{ disclaimerId: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { disclaimerId } = parsed.data;

	if (!disclaimerId || typeof disclaimerId !== 'string') {
		return apiError('disclaimerId is required');
	}

	const disclaimer = getDisclaimer(disclaimerId);
	if (!disclaimer) {
		return apiError('Unknown disclaimer ID');
	}

	if (!disclaimer.requires_acceptance) {
		return apiError('This disclaimer does not require acceptance');
	}

	try {
		// Upsert: update if already accepted (version upgrade), insert if new
		await DisclaimerAcceptances.updateOne(
			{ user_id: locals.user.id, disclaimer_id: disclaimerId },
			{
				$set: {
					user_id: locals.user.id,
					disclaimer_id: disclaimerId,
					disclaimer_version: disclaimer.version,
					accepted_at: new Date(),
					ip_address: getClientAddress(),
					user_agent: request.headers.get('user-agent') || undefined
				}
			},
			{ upsert: true }
		);

		return apiOk();
	} catch (error) {
		return apiServerError(error, 'Failed to record acceptance');
	}
};
