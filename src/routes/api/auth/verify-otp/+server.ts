import { MSG91_TOKEN_AUTH, MSG91_WIDGET_ID } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import { REFRESH_COOKIE_MAX_AGE } from '$lib/server/sessionConstants.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { externalFetch } from '$lib/server/externalFetch.js';
import { dev } from '$app/environment';

const WIDGET_ID = MSG91_WIDGET_ID;
const TOKEN_AUTH = MSG91_TOKEN_AUTH;

interface VerifyOtpRequest {
	otpCode: string;
	reqId: string;
	mobileNumber: string;
	/**
	 * Role to stamp on the `role` cookie. Defaults to `'user'`. For existing
	 * DSA/RM/admin users this gets overwritten by `check-dsa` (called next in
	 * the client's `loginWithRole` flow) with the user's actual role; for
	 * new users entering the signup → onboarding flow, this is the cookie
	 * the onboarding layout reads before `accessToken` exists.
	 */
	userRole?: string;
	/** Reserved for future device-fingerprint validation in this endpoint; unused today. */
	hardwareFingerprint?: string;
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	const parsed = await parseJsonBody<VerifyOtpRequest>(request);
	if (!parsed.ok) return parsed.response;
	const { otpCode, reqId, mobileNumber, userRole } = parsed.data;

	try {
		if (!/^\d{4}$/.test(otpCode)) return apiError('Invalid OTP');
		if (!reqId) return apiError('Missing reqId');
		if (!/^[6-9]\d{9}$/.test(mobileNumber)) return apiError('Invalid mobile number');

		// Rate limiting: per-IP (10/hr) + per-mobile (5/15min)
		// Dev mode: 100/hr per IP, 50/15min per mobile (relaxed for testing)
		const ip = getClientAddress();
		const ipMax = dev ? 100 : 10;
		const mobMax = dev ? 50 : 5;

		if (
			await rateLimit(ip, {
				maxRequests: ipMax,
				windowMs: 3_600_000,
				identifier: `otp-verify:ip:${ip}`
			})
		) {
			return apiError('Too many attempts. Try again later.', 429);
		}

		if (
			await rateLimit(ip, {
				maxRequests: mobMax,
				windowMs: 900_000,
				identifier: `otp-verify:mob:${mobileNumber}`
			})
		) {
			return apiError('Too many attempts for this number. Try again later.', 429);
		}

		const verifyResponse = await externalFetch(
			'https://api.msg91.com/api/v5/widget/verifyOtp',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					tokenauth: TOKEN_AUTH,
					Accept: 'application/json'
				},
				body: JSON.stringify({ otp: otpCode, reqId, widgetId: WIDGET_ID, tokenAuth: TOKEN_AUTH })
			},
			{ service: 'msg91', timeoutMs: 10_000 }
		);

		const verifyResult = await verifyResponse.json();
		if (!verifyResponse.ok || verifyResult.type !== 'success') {
			throw new Error(verifyResult.message || 'OTP verification failed');
		}

		// Store temporary verified mobile number
		cookies.set('verifiedMobile', mobileNumber, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			sameSite: 'lax',
			secure: !dev
		});

		// Set the `role` cookie unconditionally with the request-supplied role
		// (default `'user'`). Two flows depend on this cookie:
		//
		//   • NEW user → /api/auth/signup → /dsa-onboarding. Signup sets
		//     accessToken, but the (onboarding)/+layout.server.ts redirect
		//     guard also checks the role cookie as a fallback when locals.user
		//     is briefly nil during navigation; this keeps the onboarding
		//     gate consistent for the very first hop.
		//   • EXISTING user → /api/auth/check-dsa via loginWithRole. check-dsa
		//     sets its own `role` cookie based on the user's actual collection
		//     ('dsa' / 'rm' / 'admin'), OVERWRITING this 'user' value before
		//     any dashboard navigation occurs (login.svelte awaits check-dsa
		//     before window.location.href = safeRedirectPath(...)). So the
		//     'user' default here is invisible to existing users in practice.
		//
		// Previously this endpoint also called check-dsa internally to look up
		// the user and set tokens. That call was redundant: the client always
		// calls check-dsa again via loginWithRole, which overwrote those
		// tokens with a fresh pair. Per-login impact of the redundancy: 2x DB
		// writes + the rolling activeTokenIds window filling at 2x rate
		// (effective multi-device session cap halved from 10 → 5).
		// Internal fetch removed 2026-05-29 (code-review M3).
		const role = userRole?.toLowerCase() || 'user';
		cookies.set('role', role, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		// The response body is intentionally minimal — `success: true` is the
		// only field the client reads from the verify-otp response (see
		// login/+page.svelte handleOtpSubmit). Prior versions returned a
		// user/userExists payload from the internal check-dsa response; the
		// client never consumed it (it calls detect-roles + check-dsa
		// directly afterwards for the authoritative user data).
		return apiOk({});
	} catch (error) {
		return apiServerError(error, 'Verify OTP Error');
	}
};
