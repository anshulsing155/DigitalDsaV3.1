import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Applicant } from '$lib/database/mongo';
import { verifyAccessToken, DEMO_USER_ID } from '$lib/services/jwtService';
import type { JWTPayload } from '$lib/types';
import { ObjectId } from 'mongodb';
import {
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { z } from 'zod';

// DX-2: Zod schema for POST body. Both fields are optional — the route
// gracefully falls back to Authorization header / accessToken cookie when
// body.token is absent.
const postRequestSchema = z.object({
	token: z.string().optional()
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit token validation. Without a limit an attacker can
	// brute-force token guesses at high rate; each call does an Applicant DB
	// lookup. IP-based because the route is designed to handle no-auth
	// gracefully (returns `valid: false` for missing/invalid tokens). 30/min
	// is conservative — real clients call this only a handful of times per
	// session (on app load, after navigation, after refresh).
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-validate-token:${getClientAddress()}`,
		maxRequests: 30,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many validation attempts. Please wait.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = postRequestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	let { token } = validated.data;

	try {
		// If no token in body, try to get from Authorization header or cookie
		if (!token) {
			const authHeader = request.headers.get('authorization');
			if (authHeader && authHeader.startsWith('Bearer ')) {
				token = authHeader.substring(7);
			} else {
				token = cookies.get('accessToken');
			}
		}

		if (!token) {
			return json(
				{
					success: true,
					message: 'No token provided',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		// Verify JWT token
		const tokenValidation = verifyAccessToken(token);
		if (!tokenValidation.valid || !tokenValidation.payload) {
			return json(
				{
					success: true,
					message: 'Invalid or expired token',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		const payload = tokenValidation.payload as JWTPayload;

		// Demo user — skip DB lookup
		if (payload.userId === DEMO_USER_ID) {
			return json({
				success: true,
				message: 'Token is valid',
				data: {
					valid: true,
					user: {
						id: DEMO_USER_ID,
						name: 'Demo User',
						mobileNumber: '0000000000',
						role: payload.role || 'dsa',
						isDemo: true
					},
					tokenInfo: {
						issuedAt: payload.iat || 0,
						expiresAt: payload.exp || 0
					}
				}
			});
		}

		// Verify user still exists in database
		const user = await Applicant.findOne({
			_id: new ObjectId(payload.userId)
		});

		if (!user) {
			return json(
				{
					success: true,
					message: 'User not found',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		// Return user data
		return json({
			success: true,
			message: 'Token is valid',
			data: {
				valid: true,
				user: {
					id: user._id?.toString() || '',
					name: user.name,
					email: user.email,
					mobileNumber: user.mobileNumber,
					gender: user.gender,
					occupation: user.occupation,
					role: user.role || 'user',
					isEmailVerified: user.isEmailVerified || false,
					onboardingCompleted: user.onboardingCompleted || false
				},
				tokenInfo: {
					issuedAt: payload.iat || 0,
					expiresAt: payload.exp || 0
				}
			}
		});
	} catch (error) {
		return apiServerError(error, 'Internal server error');
	}
};

export const GET: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit token validation (GET handler). Same rationale as POST
	// — see comment in POST. Same identifier prefix so a client switching
	// between POST/GET shares the budget (prevents trivial bypass).
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-validate-token:${getClientAddress()}`,
		maxRequests: 30,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many validation attempts. Please wait.', 429);
	}

	try {
		// SEC-7: JWTs must NEVER appear in the URL (logs, referer headers,
		// browser history, analytics). Accept only from Authorization header
		// or the httpOnly `accessToken` cookie.
		let token: string | null | undefined;
		const authHeader = request.headers.get('authorization');
		if (authHeader && authHeader.startsWith('Bearer ')) {
			token = authHeader.substring(7);
		} else {
			token = cookies.get('accessToken') ?? null;
		}

		if (!token) {
			return json(
				{
					success: true,
					message: 'No token provided',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		// Verify JWT token
		const tokenValidation = verifyAccessToken(token);
		if (!tokenValidation.valid || !tokenValidation.payload) {
			return json(
				{
					success: true,
					message: 'Invalid or expired token',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		const payload = tokenValidation.payload as JWTPayload;

		// Demo user — skip DB lookup
		if (payload.userId === DEMO_USER_ID) {
			return json({
				success: true,
				message: 'Token is valid',
				data: {
					valid: true,
					user: {
						id: DEMO_USER_ID,
						name: 'Demo User',
						mobileNumber: '0000000000',
						role: payload.role || 'dsa',
						isDemo: true
					},
					tokenInfo: {
						issuedAt: payload.iat || 0,
						expiresAt: payload.exp || 0
					}
				}
			});
		}

		// Verify user still exists in database
		const user = await Applicant.findOne({
			_id: new ObjectId(payload.userId)
		});

		if (!user) {
			return json(
				{
					success: true,
					message: 'User not found',
					data: { valid: false }
				},
				{ status: 200 }
			);
		}

		// Return valid flag along with user data to avoid unnecessary refresh
		return json({
			success: true,
			message: 'Token is valid',
			data: {
				valid: true,
				user: {
					id: user._id?.toString() || '',
					name: user.name,
					email: user.email,
					mobileNumber: user.mobileNumber,
					gender: user.gender,
					occupation: user.occupation,
					role: user.role || 'user',
					isEmailVerified: user.isEmailVerified || false,
					onboardingCompleted: user.onboardingCompleted || false
				},
				tokenInfo: {
					issuedAt: payload.iat || 0,
					expiresAt: payload.exp || 0
				}
			}
		});
	} catch (error) {
		return apiServerError(error, 'Internal server error');
	}
};
