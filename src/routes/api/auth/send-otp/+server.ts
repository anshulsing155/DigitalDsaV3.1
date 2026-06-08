import { json } from '@sveltejs/kit';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import type { OtpResponse } from '$lib/types/index.js';
import { dev } from '$app/environment';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { externalFetch } from '$lib/server/externalFetch.js';

const WIDGET_ID = MSG91_WIDGET_ID;
const TOKEN_AUTH = MSG91_TOKEN_AUTH;

// Rate limiting: 5 OTP sends per hour per IP (relaxed to 50 in dev)
const OTP_RATE_LIMIT = dev ? 50 : 5;
const OTP_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const parsed = await parseJsonBody<{ mobileNumber: string }>(request);
	if (!parsed.ok) return parsed.response;
	const { mobileNumber } = parsed.data;

	try {
		// Get client IP for rate limiting
		const clientIp = getClientAddress();

		// Check rate limit using centralized rate limiter
		const isLimited = await rateLimit(clientIp, {
			maxRequests: OTP_RATE_LIMIT,
			windowMs: OTP_RATE_WINDOW_MS,
			identifier: `otp-send:${clientIp}`
		});
		if (isLimited) {
			return apiError('Too many OTP requests. Please try again later.', 429);
		}

		if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
			return apiError('Invalid mobile number. Must be a valid 10-digit Indian mobile number');
		}

		const identifier = `91${mobileNumber}`;
		const payload = {
			identifier,
			tokenAuth: TOKEN_AUTH,
			widgetId: WIDGET_ID
		};

		const otpResponse = await externalFetch(
			'https://api.msg91.com/api/v5/widget/sendOtp',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					tokenauth: TOKEN_AUTH,
					Accept: 'application/json'
				},
				body: JSON.stringify(payload)
			},
			{ service: 'msg91', timeoutMs: 10_000 }
		);

		const otpData = await otpResponse.json();

		if (!otpResponse.ok) {
			throw new Error(`OTP send failed: ${otpResponse.status} - ${JSON.stringify(otpData)}`);
		}

		if (otpData.type === 'success') {
			const response: OtpResponse = {
				success: true,
				reqId: otpData.message,
				message: 'OTP sent successfully',
				otpSent: true
			};
			return json(response);
		} else {
			throw new Error(otpData.message || 'Failed to send OTP');
		}
	} catch (error) {
		return apiServerError(error, 'Failed to send OTP');
	}
};
