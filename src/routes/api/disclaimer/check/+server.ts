import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { DisclaimerAcceptances } from '$lib/database/mongo';
import { getDisclaimer, needsReAcceptance } from '$lib/types/disclaimer';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user?.id) {
		return apiError('Unauthorized', 401);
	}

	const disclaimerId = url.searchParams.get('disclaimerId');
	if (!disclaimerId) {
		return apiError('disclaimerId query param required');
	}

	const disclaimer = getDisclaimer(disclaimerId);
	if (!disclaimer) {
		return apiError('Unknown disclaimer ID');
	}

	try {
		const acceptance = await DisclaimerAcceptances.findOne({
			user_id: locals.user.id,
			disclaimer_id: disclaimerId
		});

		const lastVersion = acceptance?.disclaimer_version;
		const accepted = !needsReAcceptance(disclaimerId, lastVersion);

		return apiOk({
			accepted,
			lastAcceptedVersion: lastVersion || null,
			currentVersion: disclaimer.version,
			acceptedAt: acceptance?.accepted_at?.toISOString() || null
		});
	} catch (error) {
		return apiServerError(error, 'Check failed');
	}
};
