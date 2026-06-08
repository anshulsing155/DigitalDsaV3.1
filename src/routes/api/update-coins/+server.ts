import { Applicant } from '$lib/database/mongo.js';
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit'; // left: success response has extra top-level keys (usedCoins, availableCoins)
import { blockDemoWrite, requireAuthApi } from '$lib/server/guards.js';
import { parseJsonBody, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { findUserByMobile } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	// Accept only a delta (how many coins to consume), not absolute values
	const parsed = await parseJsonBody<{ coinsToUse: number }>(request);
	if (!parsed.ok) return parsed.response;

	try {
		const { coinsToUse } = parsed.data;
		const mobileNumber = locals.user!.mobileNumber as string;

		// Validate: must be a positive integer (consuming coins)
		if (typeof coinsToUse !== 'number' || !Number.isInteger(coinsToUse) || coinsToUse < 1) {
			return apiError('coinsToUse must be a positive integer.', 400);
		}

		// Read current balance from DB — server is the source of truth.
		// SEC-2: encrypted-first mobile lookup. Drop the projection — at
		// per-user scale the full-doc fetch is negligible, and the
		// helper doesn't accept projection options.
		const user = await findUserByMobile(Applicant, mobileNumber);

		if (!user) {
			return apiError('User not found', 404);
		}

		const currentAvailable = typeof user.availableCoins === 'number' ? user.availableCoins : 0;

		if (coinsToUse > currentAvailable) {
			return apiError('Insufficient coin balance.', 400);
		}

		// Server-side arithmetic — client never controls absolute values
		await Applicant.updateOne(
			{ _id: user._id },
			{
				$inc: { usedCoins: coinsToUse, availableCoins: -coinsToUse }
			}
		);

		return json({
			// left: extra top-level keys (usedCoins, availableCoins) — not apiOk shape
			success: true,
			usedCoins: (user.usedCoins || 0) + coinsToUse,
			availableCoins: currentAvailable - coinsToUse
		});
	} catch (error) {
		return apiServerError(error, 'Coins update error');
	}
};
