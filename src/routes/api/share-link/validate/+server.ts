/**
 * POST /api/share-link/validate
 * ═══════════════════════════════════════════════════════════════════
 * Validates a share link token. Public endpoint (no auth required).
 * Called when an applicant opens a share link.
 *
 * Request body:
 *   - token: string
 *
 * Response:
 *   - valid: boolean
 *   - error?: string
 *   - link?: { customTitle, customSubtitle, sections, requiresOtp, prefilledData }
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateShareLink, incrementUseCount } from '$lib/server/shareLinks';
import logger from '$lib/server/logger.js';
import { apiError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 5 validations per minute per IP. Share links are typically
	// opened once per session; a burst signals scraping/enumeration of
	// tokens. Pattern mirrors restore-account/subscribe endpoints.
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 5,
		windowMs: 60 * 1000,
		identifier: `share-link-validate:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const jsonParsed = await parseJsonBody<{ token: string }>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const { token } = jsonParsed.data;

		// left: bespoke { valid, error, link } contract — not the success/data shape; apiOk/apiError would break clients
		if (!token || typeof token !== 'string') {
			return json({ valid: false, error: 'Token is required' }, { status: 400 });
		}

		const result = await validateShareLink(token);

		if (!result.valid || !result.link) {
			return json(
				{ valid: false, error: result.error },
				{ status: 200 } // 200 because the request itself was valid
			);
		}

		// Increment use count
		await incrementUseCount(token);

		// Return only public-safe fields (no internal IDs)
		return json({
			valid: true,
			link: {
				customTitle: result.link.customTitle,
				customSubtitle: result.link.customSubtitle,
				sections: result.link.sections,
				requiresOtp: result.link.requiresOtp,
				prefilledData: result.link.prefilledData,
				submissionStatus: result.link.submissionStatus,
				expiresAt: result.link.expiresAt
			}
		});
	} catch (error) {
		logger.error({ err: error }, 'Error validating share link');
		return json({ valid: false, error: 'Failed to validate link' }, { status: 500 });
	}
};
