import { Applicant } from '$lib/database/mongo.js';
import type { RequestHandler } from '@sveltejs/kit';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Only DSAs and admins can check coin balance
	const denied = requireRoleApi(locals, ['dsa', 'admin']);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	try {
		const mobileNumber = locals.user!.mobileNumber as string;

		// SEC-2: encrypted-first lookup. Result fields (availableCoins,
		// usedCoins) are non-PII — no decrypt needed.
		const user = await findUserByMobile(Applicant, mobileNumber);

		if (!user) {
			return apiError('User not found', 404);
		}

		return apiOk({
			availableCoins: user.availableCoins,
			usedCoins: user.usedCoins
		});
	} catch (err) {
		return apiServerError(err, 'Failed to get coins balance');
	}
};
