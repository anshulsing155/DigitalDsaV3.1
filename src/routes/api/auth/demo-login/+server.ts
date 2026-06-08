/**
 * Demo Login — Guest Access Endpoint
 * ====================================================================
 * Creates a demo session with a synthetic DSA user. No MongoDB writes.
 * Sets JWT cookies so the demo user flows through the same auth
 * pipeline as real users.
 * ====================================================================
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import {
	generateDemoAccessToken,
	generateDemoRefreshToken,
	DEMO_USER_ID
} from '$lib/services/jwtService';
import { apiError, apiServerError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';

export const POST: RequestHandler = async ({ cookies, getClientAddress }) => {
	// SEC-4: rate-limit demo logins by IP. The endpoint mints valid JWT
	// cookies without any input check — without a limit, a bot could
	// burn a lot of CPU on token signing.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-demo-login:${getClientAddress()}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many demo login attempts. Please wait before trying again.', 429);
	}

	try {
		const accessToken = generateDemoAccessToken();
		const refreshToken = generateDemoRefreshToken();

		// Set auth cookies (same as real login flow)
		cookies.set('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours (extended for demo)
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: 60 * 60 * 24,
			secure: !dev,
			sameSite: 'lax'
		});

		// Set active role cookie
		cookies.set('activeRole', 'dsa', {
			httpOnly: false, // Client-side JS reads this for role-switching UI
			path: '/',
			maxAge: 60 * 60 * 24,
			secure: !dev,
			sameSite: 'lax'
		});

		return json({
			success: true,
			user: {
				id: DEMO_USER_ID,
				name: 'Demo DSA Agent',
				email: 'demo@digitaldsa.com',
				mobileNumber: 9999999999,
				role: 'dsa'
			}
		});
	} catch (error) {
		return apiServerError(error, 'Demo login failed');
	}
};
