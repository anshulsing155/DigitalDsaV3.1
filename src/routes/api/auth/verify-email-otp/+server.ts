import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { otpStore } from '$lib/services/otpStore.js';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Rate limit: 10 requests per 10 minutes per IP to prevent OTP brute-force
	const isLimited = await rateLimit(getClientAddress(), {
		maxRequests: 10,
		windowMs: 10 * 60 * 1000,
		identifier: `verify-email-otp:${getClientAddress()}`
	});
	if (isLimited) {
		return apiError('Too many requests. Please try again later.', 429);
	}

	const parsed = await parseJsonBody<{ otp: string; email: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { otp, email } = parsed.data;

	try {
		if (!otp || !email) {
			return apiError('OTP and email are required');
		}

		// Validate OTP format
		if (!/^\d{6}$/.test(otp)) {
			return apiError('Invalid OTP format. Please enter a 6-digit code.');
		}

		// Verify OTP using secure server-side validation (MongoDB-backed, timing-safe)
		const verificationResult = await otpStore.verify(email, otp);

		if (!verificationResult.success) {
			return json(
				{
					success: false,
					error: verificationResult.message,
					remainingAttempts: verificationResult.remainingAttempts
				},
				{ status: 400 }
			);
		}

		return json({
			success: true,
			message: verificationResult.message,
			data: {
				email: email,
				verified: true
			}
		});
	} catch (error) {
		return apiServerError(error, 'Failed to verify OTP');
	}
};
