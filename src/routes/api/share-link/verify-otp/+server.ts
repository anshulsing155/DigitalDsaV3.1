/**
 * POST /api/share-link/verify-otp
 * ═══════════════════════════════════════════════════════════════════
 * Two-step OTP flow for share link access:
 *
 * Step 1: action = 'send'
 *   - Sends OTP to the applicant's mobile number via MSG91
 *   - Requires: token, mobileNumber
 *
 * Step 2: action = 'verify'
 *   - Verifies the OTP entered by the applicant via MSG91
 *   - Requires: token, mobileNumber, otp
 *
 * This is a public endpoint (no auth required) since the applicant
 * is not a logged-in user.
 * ═══════════════════════════════════════════════════════════════════
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiOkMessage, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { validateShareLink, createShareOtpProof } from '$lib/server/shareLinks';
import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import { dev } from '$app/environment';
import logger from '$lib/server/logger.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { externalFetch } from '$lib/server/externalFetch.js';

// Rate limiting: 5 OTP sends per hour per token+mobile combo
const MAX_OTP_SENDS = 5;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const POST: RequestHandler = async ({ request, cookies }) => {
	const jsonParsed = await parseJsonBody<{
		action: string;
		token: string;
		mobileNumber: string;
		otp?: string;
	}>(request);
	if (!jsonParsed.ok) return jsonParsed.response;

	try {
		const { action, token, mobileNumber, otp } = jsonParsed.data;

		// Validate inputs
		if (!token || !mobileNumber) {
			return apiError('Token and mobile number are required');
		}

		// Validate mobile number format
		if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
			return apiError('Invalid mobile number. Must be a valid 10-digit Indian mobile number');
		}

		// Validate the share link first
		const linkResult = await validateShareLink(token);
		if (!linkResult.valid) {
			return apiError(linkResult.error || 'Invalid link', 200);
		}

		const identifier = `91${mobileNumber}`;

		// ── SEND OTP ─────────────────────────────────────────────────
		if (action === 'send') {
			// Rate limit check using centralized rate limiter
			const isLimited = await rateLimit(mobileNumber, {
				maxRequests: MAX_OTP_SENDS,
				windowMs: OTP_SEND_WINDOW_MS,
				identifier: `share-otp:${token}:${mobileNumber}`
			});
			if (isLimited) {
				return apiError('Too many OTP requests. Please try again later.', 429);
			}

			// Dev mode: skip real SMS, use fixed dev OTP
			if (dev) {
				const devOtp = '123456'; // Fixed dev OTP — no weak randomness needed
				logger.info(
					{ mobileNumber, token: token.substring(0, 8) },
					'[DEV] Share Link OTP generated'
				);
				return apiOkMessage('OTP sent successfully');
			}

			// Production: send via MSG91 widget API
			const otpResponse = await externalFetch(
				'https://api.msg91.com/api/v5/widget/sendOtp',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						tokenauth: MSG91_TOKEN_AUTH,
						Accept: 'application/json'
					},
					body: JSON.stringify({
						identifier,
						tokenAuth: MSG91_TOKEN_AUTH,
						widgetId: MSG91_WIDGET_ID
					})
				},
				{ service: 'msg91', timeoutMs: 10_000 }
			);

			const otpData = await otpResponse.json();

			if (!otpResponse.ok || otpData.type !== 'success') {
				return apiServerError(otpData, 'Failed to send OTP. Please try again.');
			}

			return apiOkMessage('OTP sent successfully');
		}

		// ── VERIFY OTP ───────────────────────────────────────────────
		if (action === 'verify') {
			if (!otp) {
				return apiError('OTP is required');
			}

			// Dev mode: accept any 6-digit OTP
			if (dev) {
				if (otp.length === 6) {
					const proof = createShareOtpProof(token, mobileNumber);
					cookies.set('share-otp-proof', proof, {
						path: '/',
						httpOnly: true,
						secure: !dev,
						sameSite: 'strict',
						maxAge: 900
					});
					// left: extra top-level `verified` key (not under `data`) — apiOk would nest it
					return json({
						success: true,
						verified: true,
						message: 'Identity verified successfully'
					});
				}
				return apiError('Invalid OTP', 200);
			}

			// Production: verify via MSG91 widget API
			const verifyResponse = await externalFetch(
				'https://api.msg91.com/api/v5/widget/verifyOtp',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						tokenauth: MSG91_TOKEN_AUTH,
						Accept: 'application/json'
					},
					body: JSON.stringify({
						identifier,
						otp,
						tokenAuth: MSG91_TOKEN_AUTH,
						widgetId: MSG91_WIDGET_ID
					})
				},
				{ service: 'msg91', timeoutMs: 10_000 }
			);

			const verifyData = await verifyResponse.json();

			if (!verifyResponse.ok || verifyData.type !== 'success') {
				logger.warn({ msg91Response: verifyData }, 'Share link OTP verification failed');
				return apiError('OTP verification failed. Please try again.', 200);
			}

			// Set HMAC proof cookie for server-side verification on submit
			const proof = createShareOtpProof(token, mobileNumber);
			cookies.set('share-otp-proof', proof, {
				path: '/',
				httpOnly: true,
				secure: !dev,
				sameSite: 'strict',
				maxAge: 900 // 15 minutes
			});

			// left: extra top-level `verified` key (not under `data`) — apiOk would nest it
			return json({
				success: true,
				verified: true,
				message: 'Identity verified successfully'
			});
		}

		return apiError('Invalid action. Use "send" or "verify".');
	} catch (error) {
		return apiServerError(error, 'Failed to process OTP request');
	}
};
