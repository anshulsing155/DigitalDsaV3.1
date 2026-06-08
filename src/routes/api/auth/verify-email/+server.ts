import type { RequestHandler } from '@sveltejs/kit';
import { otpStore } from '$lib/services/otpStore.js';
import { apiError, apiOkMessage, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 10 requests per 10 minutes per IP to prevent OTP brute-force
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 10,
		windowMs: 10 * 60 * 1000,
		identifier: `verify-email:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ email: string; otp: string; role: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { email, otp, role } = parsed.data;

	try {
		if (!email || !otp) {
			return apiError('Email and OTP are required');
		}

		if (!/^\d{6}$/.test(otp)) {
			return apiError('Invalid OTP format. Must be 6 digits');
		}

		const verification = await otpStore.verify(email, otp);

		if (!verification.success) {
			logger.warn({ message: verification.message }, 'Email verification failed');
			return apiError('Email verification failed');
		}

		// ✅ OTP correct — nothing else needed
		return apiOkMessage('OTP verified successfully');
	} catch (err) {
		return apiServerError(err, 'Something went wrong');
	}
};
