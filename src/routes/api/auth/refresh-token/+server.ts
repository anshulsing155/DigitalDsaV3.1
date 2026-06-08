import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Applicant } from '$lib/database/mongo';
import { verifyRefreshToken, generateTokenPair, generateTokenId } from '$lib/services/jwtService';
import { isSessionRevoked } from '$lib/server/account/sessions';
import { Sessions } from '$lib/database/mongo';

/**
 * E.3 — rotate the Sessions.session_id from old → new on every JWT
 * refresh. Kept local to this endpoint because it's the only caller
 * AND the existing sessions.ts helpers are passive (read-only). Future
 * callers (e.g. forced rotation on suspicious activity) would graduate
 * this into sessions.ts.
 */
async function rotateSessionId(oldId: string, newId: string): Promise<void> {
	if (!oldId || !newId || oldId === newId) return;
	await Sessions.updateOne(
		{ session_id: oldId },
		{ $set: { session_id: newId, last_seen_at: new Date() } }
	);
}
// TokenPair / ApiResponse removed — tokens no longer in response body (PB-3)
import { ObjectId } from 'mongodb';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import { DsaApplications, rmApplications } from '$lib/database/mongo';
import { apiError, apiServerError } from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { dev } from '$app/environment';

// Refresh token rate limits: generous enough for legitimate use,
// tight enough to block brute-force token guessing
const REFRESH_RATE_LIMIT_PER_IP = 20; // max 20 refreshes per IP per window
const REFRESH_RATE_WINDOW_MS = 60_000; // 1-minute window

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	try {
		// ── Rate limiting: prevent brute-force refresh attempts ──
		const clientIp = getClientAddress();
		const isRateLimited = await rateLimit(clientIp, {
			maxRequests: REFRESH_RATE_LIMIT_PER_IP,
			windowMs: REFRESH_RATE_WINDOW_MS,
			identifier: `token-refresh:${clientIp}`
		});

		if (isRateLimited) {
			logger.warn({ ip: clientIp }, 'Refresh token rate limit exceeded');
			return apiError('Too many requests. Please try again shortly.', 429);
		}

		// Get refresh token from cookies
		const refreshToken = cookies.get('refreshToken');

		if (!refreshToken) {
			return json(
				{
					success: false,
					error: 'Refresh token is required'
				},
				{ status: 200 }
			);
		}

		// Verify refresh token
		const tokenValidation = verifyRefreshToken(refreshToken);
		if (!tokenValidation.valid || !tokenValidation.payload) {
			return json(
				{
					success: false,
					error: 'Invalid or expired refresh token'
				},
				{ status: 200 }
			);
		}

		const { userId, tokenId } = tokenValidation.payload;

		// ── Step 1: Find user and verify refresh token matches DB ──
		// This prevents replay attacks with old/stolen tokens since
		// each rotation replaces the stored token in the database.
		const userObjectId = new ObjectId(userId);

		const user = await Applicant.findOne({
			_id: userObjectId,
			refreshToken: refreshToken
		});

		// Also check DsaApplications and rmApplications
		let resolvedUser: any = user;
		let resolvedCollection: any = Applicant;
		if (!user) {
			const dsaUser = await DsaApplications.findOne({
				_id: userObjectId,
				refreshToken: refreshToken
			});
			if (dsaUser) {
				resolvedUser = dsaUser;
				resolvedCollection = DsaApplications;
			} else {
				const rmUser = await rmApplications.findOne({
					_id: userObjectId,
					refreshToken: refreshToken
				});
				if (rmUser) {
					resolvedUser = rmUser;
					resolvedCollection = rmApplications;
				}
			}
		}

		if (!resolvedUser) {
			// ── Token reuse detection ──
			// The JWT is cryptographically valid but doesn't match the DB.
			// This means the token was already rotated (legitimate user refreshed),
			// and someone is replaying the old token. Invalidate ALL sessions
			// for this user as a precaution against token theft.
			const userExistsAnywhere =
				(await Applicant.findOne({ _id: userObjectId })) ||
				(await DsaApplications.findOne({ _id: userObjectId })) ||
				(await rmApplications.findOne({ _id: userObjectId }));

			if (userExistsAnywhere) {
				logger.warn(
					{ userId, ip: clientIp },
					'Possible refresh token reuse detected — invalidating all sessions'
				);

				// Nuke all tokens across all collections for this user
				const invalidateUpdate = {
					$unset: {
						refreshToken: 1 as const,
						refreshTokenExpiry: 1 as const,
						activeTokenId: 1 as const,
						activeTokenIds: 1 as const
					}
				};
				await Promise.allSettled([
					Applicant.updateOne({ _id: userObjectId }, invalidateUpdate),
					DsaApplications.updateOne({ _id: userObjectId }, invalidateUpdate),
					rmApplications.updateOne({ _id: userObjectId }, invalidateUpdate)
				]);
			}

			return json(
				{
					success: false,
					error: 'User not found or refresh token invalid'
				},
				{ status: 200 }
			);
		}

		// ── Step 2: Multi-browser device enforcement ──
		// Verify the tokenId from the JWT is in the user's active session list.
		// Array-first + legacy fallback (matches hooks.server.ts and check-dsa patterns).
		const activeIds = resolvedUser.activeTokenIds as string[] | undefined;
		const legacyId = resolvedUser.activeTokenId as string | undefined;

		if (activeIds && activeIds.length > 0) {
			if (!activeIds.includes(tokenId)) {
				return json(
					{
						success: false,
						error: 'Session ended - logged in from another device'
					},
					{ status: 200 }
				);
			}
		} else if (legacyId && tokenId !== legacyId) {
			return json(
				{
					success: false,
					error: 'Session ended - logged in from another device'
				},
				{ status: 200 }
			);
		}

		// ── Step 2.5: E.3 — check Sessions revoke flag ──
		// User clicked "Sign out this device" in the Active Devices UI.
		// Reject the refresh; the access token expires within 15 min and
		// the device is fully logged out. Spec §E.3 "natural" revoke
		// semantics — no per-request blacklist on the hot path.
		if (await isSessionRevoked(tokenId)) {
			logger.info(
				{ userId, tokenId },
				'[sessions] refresh rejected — session revoked by user'
			);
			return json(
				{
					success: false,
					error: 'This device was signed out from Active Devices. Please sign in again.'
				},
				{ status: 200 }
			);
		}

		// ── Step 3: Check if refresh token is expired ──
		if (resolvedUser.refreshTokenExpiry && new Date() > resolvedUser.refreshTokenExpiry) {
			// Clear expired refresh token
			await resolvedCollection.updateOne(
				{ _id: new ObjectId(userId) },
				{
					$unset: {
						refreshToken: 1,
						refreshTokenExpiry: 1
					}
				}
			);

			return json(
				{
					success: false,
					error: 'Refresh token expired'
				},
				{ status: 200 }
			);
		}

		// ── Step 4: Rotate — generate new tokens and invalidate the old one ──
		// The old refresh token is replaced in the DB atomically,
		// so any replay of the old token will fail the DB match check above.
		const newTokenId = generateTokenId();
		const tokens = generateTokenPair(
			userId,
			resolvedUser.email || '',
			resolvedUser.mobileNumber,
			resolvedUser.name || '',
			newTokenId
		);

		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

		// Replace old token with new one (rotation) and swap tokenId in the active list
		await resolvedCollection.updateOne(
			{ _id: userObjectId },
			{
				$set: {
					refreshToken: tokens.refreshToken,
					refreshTokenExpiry: refreshTokenExpiry,
					activeTokenId: newTokenId // Legacy field kept in sync
				},
				$push: {
					activeTokenIds: { $each: [newTokenId], $slice: -10 } as any
				}
			}
		);

		// E.3 — rotate the Sessions row's session_id alongside the JWT
		// rotation. The UI revokes by session_id, so it must always equal
		// the CURRENT refresh-token id (not the original login's id) or
		// "Sign out this device" would target a stale tokenId and miss
		// the live refresh. Also bumps last_seen_at so the UI's "active
		// 2h ago" stays fresh. Best-effort — failure here doesn't roll
		// back the rotation; just an out-of-sync session_id on next list.
		try {
			await rotateSessionId(tokenId, newTokenId);
		} catch (err) {
			logger.warn(
				{ err, oldTokenId: tokenId, newTokenId },
				'[sessions] Sessions session_id rotate failed — UI may show stale id'
			);
		}

		// Set new tokens in cookies
		cookies.set('accessToken', tokens.accessToken, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: ACCESS_COOKIE_MAX_AGE
		});

		cookies.set('refreshToken', tokens.refreshToken, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: REFRESH_COOKIE_MAX_AGE
		});

		// PB-3: Tokens transported via httpOnly cookies only (set above).
		// Never include tokens in the JSON response body.
		return json({
			success: true,
			message: 'Tokens refreshed successfully',
			data: {
				user: {
					id: resolvedUser._id.toString(),
					name: resolvedUser.name,
					email: resolvedUser.email,
					mobileNumber: resolvedUser.mobileNumber,
					gender: resolvedUser.gender,
					isEmailVerified: resolvedUser.isEmailVerified || false,
					hasApplications: (resolvedUser.Applications?.length ?? 0) > 0
				}
			}
		});
	} catch (error) {
		return apiServerError(error, 'Internal server error');
	}
};
