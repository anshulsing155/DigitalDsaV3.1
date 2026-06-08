import { json } from '@sveltejs/kit';
import { Applicant, DsaApplications } from '$lib/database/mongo.js';
import type { RequestHandler } from '@sveltejs/kit';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { findUserByEmail } from '$lib/server/csfle/index.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 10 requests per 10 minutes per IP to prevent email enumeration
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 10,
		windowMs: 10 * 60 * 1000,
		identifier: `check-email:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ email: string; role?: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { email, role } = parsed.data;

	try {
		if (!email) {
			return apiError('Email is required');
		}

		// DSA-only platform: check DSA or Applicant collection
		const effectiveRole = role === 'dsa' ? 'dsa' : 'user';

		// SEC-2: encrypted-first email lookup with plaintext fallback.
		// Branched on collection to avoid the union-type narrowing issue
		// when the helper's generic resolves to `Dsa | User`.
		const existingUser =
			effectiveRole === 'dsa'
				? await findUserByEmail(DsaApplications, email)
				: await findUserByEmail(Applicant, email);

		if (existingUser) {
			return json(
				{
					success: false,
					exists: true,
					error: 'Email already registered. Please use a different email or try logging in.'
				},
				{ status: 409 }
			);
		}

		return json({
			success: true,
			exists: false,
			message: 'Email is available'
		});
	} catch (error) {
		return apiServerError(error, 'Failed to check email availability');
	}
};
