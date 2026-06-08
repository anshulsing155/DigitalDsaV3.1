import type { RequestHandler } from './$types';
import { Applicant, DsaApplications, rmApplications } from '$lib/database/mongo';
import { verifyAccessToken } from '$lib/services/jwtService';
import { ObjectId } from 'mongodb';
import { apiError, apiOkMessage } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { dev } from '$app/environment';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit logout. Auth-optional (a stale-token second click should
	// still clear cookies), so IP-based. 20/min/IP is well above any human flow
	// while blocking a logout-flood that would waste DB writes on Applicant /
	// DsaApplications / rmApplications $unset operations.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-logout:${getClientAddress()}`,
		maxRequests: 20,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many logout attempts. Please wait before trying again.', 429);
	}

	try {
		// Get token from Authorization header or cookie
		const authHeader = request.headers.get('authorization');
		let token = null;

		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7);
		} else {
			token = cookies.get('accessToken');
		}

		if (token) {
			// Verify token to get user ID
			const tokenValidation = verifyAccessToken(token);
			if (tokenValidation.valid && tokenValidation.payload) {
				const { userId } = tokenValidation.payload;

				// Clear refresh token + activeTokenId from all collections
				const logoutFilter = { _id: new ObjectId(userId) };
				const logoutUpdate = {
					$unset: {
						refreshToken: '' as const,
						refreshTokenExpiry: '' as const,
						activeTokenId: '' as const,
						activeTokenIds: '' as const
					}
				};
				await Promise.all([
					Applicant.updateOne(logoutFilter, logoutUpdate as any),
					DsaApplications.updateOne(logoutFilter, logoutUpdate as any),
					rmApplications.updateOne(logoutFilter, logoutUpdate as any)
				]);
			}
		}

		// Clear all auth cookies
		cookies.set('accessToken', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('refreshToken', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		});

		// Also clear legacy session cookie if it exists
		cookies.set('session', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('activeRole', '', {
			httpOnly: false, // Must match the original cookie's httpOnly for proper clearing
			path: '/',
			expires: new Date(0),
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('role', '', {
			httpOnly: true,
			path: '/',
			expires: new Date(0),
			secure: !dev,
			sameSite: 'lax'
		});

		return apiOkMessage('Logged out successfully');
	} catch (error) {
		logger.error({ err: error }, 'Logout error');

		// Still clear cookies even if there's an error
		cookies.set('accessToken', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		});

		cookies.set('refreshToken', '', {
			path: '/',
			expires: new Date(0),
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		});

		return apiOkMessage('Logged out successfully');
	}
};
