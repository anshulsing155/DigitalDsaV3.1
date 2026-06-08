import { json } from '@sveltejs/kit';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { externalFetch } from '$lib/server/externalFetch.js';

// Define interfaces for better type safety
interface ResendOTPRequest {
	reqId: string;
	mobileNumber: string;
}

interface MSG91Response {
	type?: string;
	message?: string;
	request_id?: string;
}

// Rate limiting: 5 OTP resends per hour per IP (relaxed to 50 in dev)
const OTP_RESEND_LIMIT = dev ? 50 : 5;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	const parsed = await parseJsonBody<ResendOTPRequest>(request);
	if (!parsed.ok) return parsed.response;
	const { reqId, mobileNumber } = parsed.data;

	try {
		// Get client IP for rate limiting
		const clientIp = getClientAddress();

		// Check rate limit using centralized rate limiter
		const isLimited = await rateLimit(clientIp, {
			maxRequests: OTP_RESEND_LIMIT,
			windowMs: OTP_RESEND_WINDOW_MS,
			identifier: `otp-resend:${clientIp}`
		});
		if (isLimited) {
			return apiError('Too many OTP resend attempts. Please try again later.', 429);
		}

		// Validate request ID
		if (!reqId || typeof reqId !== 'string') {
			return apiError('Request ID is required');
		}

		// Validate mobile number (Indian format)
		if (!mobileNumber || typeof mobileNumber !== 'string' || !/^[6-9]\d{9}$/.test(mobileNumber)) {
			return apiError('Invalid mobile number. Must be a 10-digit Indian mobile number.');
		}

		// Validate environment variables
		if (!MSG91_WIDGET_ID || !MSG91_TOKEN_AUTH) {
			logger.error('Missing required environment variables for MSG91 integration');
			return apiError('Service configuration error', 500);
		}

		// Prepare payload for MSG91
		const payload = {
			identifier: `91${mobileNumber}`, // Add country code
			reqId: reqId,
			widgetId: MSG91_WIDGET_ID,
			tokenAuth: MSG91_TOKEN_AUTH,
			retryType: 11 // SMS retry type
		};

		// Add request ID for tracking
		const requestId = `req_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

		// Make API request to MSG91
		const response = await externalFetch(
			'https://api.msg91.com/api/v5/widget/retryOtp',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					tokenauth: MSG91_TOKEN_AUTH,
					Accept: 'application/json',
					'X-Request-ID': requestId
				},
				body: JSON.stringify(payload)
			},
			{ service: 'msg91', timeoutMs: 10_000 }
		);

		// Parse response
		const result = (await response.json()) as MSG91Response;

		// Handle error responses
		if (!response.ok) {
			throw new Error(`OTP resend failed: ${response.status} - ${JSON.stringify(result)}`);
		}

		// Handle successful responses
		if (result.type === 'success') {
			return json({
				success: true,
				requestId: result.request_id,
				message: 'OTP resent successfully'
			});
		}

		throw new Error(result.message || 'OTP resend failed');
	} catch (error) {
		return apiServerError(error, 'Failed to resend OTP');
	}
};
