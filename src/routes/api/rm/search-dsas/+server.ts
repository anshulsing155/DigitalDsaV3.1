/**
 * POST /api/rm/search-dsas
 * ═══════════════════════════════════════════════════════════════════
 * Search DsaApplications by city/area.
 * Only returns DSAs with onboarding completed.
 * ═══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from '@sveltejs/kit';
import { DsaApplications } from '$lib/database/mongo.js';
import { requireRoleApi, blockDemoWrite } from '$lib/server/guards.js';
import { parseJsonBody, apiOk, apiError, apiServerError } from '$lib/server/apiResponse.js';
import { escapeRegex } from '$lib/server/utils.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Auth + role guard (RM feature)
	const denied = requireRoleApi(locals, 'rm');
	if (denied) return denied;

	// Rate limit: 20 requests per minute per user
	const mobileNumber = locals.user?.mobileNumber || 'anon';
	const isLimited = await rateLimit(mobileNumber, {
		maxRequests: 20,
		windowMs: 60_000,
		identifier: `rm-search:${mobileNumber}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const demoBlocked = blockDemoWrite(locals);
	if (demoBlocked) return demoBlocked;

	const bodyParsed = await parseJsonBody<{ query?: string }>(request);
	if (!bodyParsed.ok) return bodyParsed.response;

	try {
		const { query } = bodyParsed.data;

		if (!query || typeof query !== 'string' || query.trim().length < 2) {
			return apiError('Search query must be at least 2 characters', 400);
		}

		const searchTerm = query.trim();

		// Search by workingCity or city — escape user input to prevent regex injection
		const escapedTerm = escapeRegex(searchTerm);
		const results = await DsaApplications.find({
			onboardingCompleted: true,
			$or: [
				{ workingCity: { $regex: escapedTerm, $options: 'i' } },
				{ city: { $regex: escapedTerm, $options: 'i' } }
			]
		})
			.project({
				name: 1,
				workingCity: 1,
				city: 1,
				lenderName: 1,
				dsaCode: 1
			})
			.limit(50)
			.toArray();

		const data = results.map((dsa) => ({
			_id: dsa._id?.toString() || '',
			name: dsa.name || '',
			city: dsa.workingCity || dsa.city || '',
			lenderName: dsa.lenderName || '',
			dsaCode: dsa.dsaCode || ''
		}));

		return apiOk(data);
	} catch (error) {
		return apiServerError(error, 'Search failed');
	}
};
