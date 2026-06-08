/**
 * SEC-10 — POST /api/auth/login-confirm
 * ────────────────────────────────────────────────────────────────────────────
 * Step 2 of the conflict-resolution sub-flow.
 *
 * Client flow:
 *   1. POST /api/auth/check-dsa with fingerprints (Commit A)
 *   2. If response is { status: 'session_conflict', existing_sessions,
 *      pending_login_token } → show SessionConflictModal (Commit B B.6/B.7)
 *   3. User chooses sessions to kick → POST here with the pending_login_token
 *      and the chosen kick_session_ids subset
 *   4. This endpoint verifies the token, marks the chosen Sessions rows
 *      revoked, mints access + refresh JWTs, sets cookies, inserts a new
 *      Sessions row (with the fingerprints carried in the token), and
 *      returns the same response shape check-dsa would have returned on
 *      a no-conflict success path
 *
 * Pragmatic scope decisions (S223+1 implementation notes):
 *   - No device-switch-nuke at confirm — the SEC-10 conflict gate already
 *     kicked the conflicting sessions per the user's explicit choice. Re-
 *     running buildTokenUpdate's deviceClassHash logic would require
 *     carrying hardwareFingerprint through the pending-login-token, and
 *     the device-switch-nuke is a legacy mechanism that sunsets 30 days
 *     post-Commit-C anyway. We just write activeTokenIds: [tokenId] —
 *     a clean reset matching the "first login" branch of buildTokenUpdate.
 *   - No FormSessions invalidation — the user explicitly confirmed they
 *     want to continue; their in-flight form work should survive.
 *   - TFA-pending preserved — admins with 2FA enabled get the same
 *     `requires_2fa: true, redirect: '/admin/2fa'` response that check-dsa
 *     branches 1 and 6 produce.
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §5 Step 2 + §9 Commit B
 * ADR : docs/adr/0028-single-session-enforcement.md
 */

import type { RequestHandler } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { dev } from '$app/environment';
import { z } from 'zod';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { generateTokenPair } from '$lib/services/jwtService.js';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import { isNativePlatform } from '$lib/server/platformDetection.js';
import {
	DsaApplications,
	rmApplications,
	AdminUsers,
	Applicant,
	Sessions
} from '$lib/database/mongo.js';
import { decryptUserPii } from '$lib/server/csfle/index.js';
import { recordSession } from '$lib/server/account/sessions';
import {
	verifyPendingLoginToken,
	type PendingLoginCollection,
	type PendingLoginPayload
} from '$lib/server/auth/pendingLoginToken';

// ── Request schema ─────────────────────────────────────────────────────

const requestSchema = z.object({
	pending_login_token: z.string().min(1, 'pending_login_token is required'),
	// Optional: client may pass an explicit empty array meaning "don't
	// kick anyone, just record I saw the modal" (closes the loop without
	// performing destructive action). Most flows will pass non-empty.
	kick_session_ids: z.array(z.string()).default([])
});

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Map a userCollection discriminator to the actual Mongo collection.
 * Keeps the typing tight — login-confirm doesn't accept arbitrary
 * collection names.
 */
function resolveCollection(name: PendingLoginCollection) {
	switch (name) {
		case 'DsaApplications':
			return DsaApplications;
		case 'rmApplications':
			return rmApplications;
		case 'AdminUsers':
			return AdminUsers;
		case 'Applicant':
			return Applicant;
	}
}

/**
 * Derive the cookie-friendly role (what /role cookie carries) + the
 * user.role value in the response payload. Both consumers expect
 * 'admin' | 'dsa' | 'rm' (not the Sessions.user_role flavour which can
 * be 'applicant'). For the Applicant collection, fall back to the user
 * doc's role field — that's how check-dsa decides today.
 */
function deriveResponseRole(
	collection: PendingLoginCollection,
	userDoc: { role?: string }
): 'admin' | 'dsa' | 'rm' {
	switch (collection) {
		case 'DsaApplications':
			return 'dsa';
		case 'rmApplications':
			return 'rm';
		case 'AdminUsers':
			return 'admin';
		case 'Applicant':
			return userDoc.role === 'admin' ? 'admin' : 'dsa';
	}
}

// ── Handler ────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// Rate-limit identical to check-dsa — 10/min/IP. Protects against
	// pending-token-replay scanning and unauthenticated POST floods.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-login-confirm:${getClientAddress()}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many requests. Please wait before trying again.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = requestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { pending_login_token, kick_session_ids } = validated.data;

	// Verify pending-login-token. Maps verify failures to user-facing
	// reasons that the client can use to show a useful error (e.g.
	// "session expired, log in again" for 'expired').
	const verifyResult = verifyPendingLoginToken(pending_login_token);
	if (!verifyResult.ok) {
		return apiError(`pending_login_token_${verifyResult.reason}`, 401);
	}
	const token: PendingLoginPayload = verifyResult.payload;

	// Validate kick_session_ids ⊆ kickEligibleSessionIds. Defends against
	// a client crafting a request that kicks sessions outside the modal's
	// presented choices.
	const eligibleSet = new Set(token.kickEligibleSessionIds);
	const invalidKickIds = kick_session_ids.filter((id) => !eligibleSet.has(id));
	if (invalidKickIds.length > 0) {
		return apiError('kick_session_ids must be a subset of eligible sessions', 400);
	}

	try {
		// Look up the user via the collection discriminator in the token.
		// decryptUserPii returns null only when its input is null — but
		// we pass an already-validated non-null doc, so the null-check
		// below is purely defensive (and keeps TypeScript happy).
		const collection = resolveCollection(token.userCollection);
		const userId = new ObjectId(token.userId);
		const userRaw = await collection.findOne({ _id: userId });
		if (!userRaw) {
			return apiError('User no longer exists', 404);
		}
		const user = await decryptUserPii(userRaw);
		if (!user) {
			return apiError('User no longer exists', 404);
		}

		// Admin-active guard mirrors check-dsa branches 1+6.
		if (token.userCollection === 'AdminUsers' && !(user as any).is_active) {
			return apiError('Admin account is not active', 403);
		}

		// Mark kicked Sessions rows. Only rows that match BOTH the user_id
		// AND the kick list — defends against a stolen pending token being
		// used to revoke an unrelated user's sessions.
		if (kick_session_ids.length > 0) {
			await Sessions.updateMany(
				{
					user_id: userId,
					session_id: { $in: kick_session_ids },
					revoked_at: null
				},
				{
					$set: {
						revoked_at: new Date(),
						revoke_reason: 'kicked_by_new_login'
					}
				}
			);
			logger.info(
				{
					event: 'session.kicked',
					userId: token.userId,
					userRole: token.userRole,
					kicked_session_ids: kick_session_ids,
					kicker_token_id: token.tokenId
				},
				'[sec-10] sessions kicked via login-confirm'
			);
		}

		// E.2 — TFA-pending for admins. Same logic as check-dsa branches 1+6.
		const tfaPending =
			token.userCollection === 'AdminUsers' && (user as any).twofa?.enabled === true;

		const tokens = generateTokenPair(
			user._id.toString(),
			(user as any).email || '',
			(user as any).mobileNumber,
			(user as any).name || '',
			token.tokenId,
			token.userCollection === 'AdminUsers'
				? { role: 'admin', tfa_pending: tfaPending }
				: undefined
		);

		// activeTokenIds[] dual-write. Two-step pattern so PARTIAL kicks
		// preserve the user's intent — when they unticked a session in the
		// modal, that session's tokenId must STAY in activeTokenIds so
		// hooks.server.ts:122 keeps it alive at next refresh:
		//
		//   1. $pull the kicked tokenIds from activeTokenIds.
		//   2. $push the new tokenId (bounded to last 10 via $slice).
		//
		// Non-atomic across the two calls (microsecond race window), but
		// each call is atomic individually so a concurrent login can only
		// gain/lose its own tokenId at the boundary — never corrupt the
		// kept-vs-kicked invariant the user just authorized via the modal.
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

		if (kick_session_ids.length > 0) {
			await collection.updateOne(
				{ _id: userId },
				{ $pull: { activeTokenIds: { $in: kick_session_ids } } } as any
			);
		}

		await collection.updateOne(
			{ _id: userId },
			{
				$set: {
					refreshToken: tokens.refreshToken,
					refreshTokenExpiry,
					activeTokenId: token.tokenId,
					updatedAt: new Date()
				},
				$push: {
					activeTokenIds: { $each: [token.tokenId], $slice: -10 }
				}
			} as any
		);

		// Cookies — same shape as check-dsa.
		cookies.set('accessToken', tokens.accessToken, {
			httpOnly: true,
			path: '/',
			maxAge: ACCESS_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});
		cookies.set('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});
		const responseRole = deriveResponseRole(token.userCollection, user as any);
		cookies.set('role', responseRole, {
			httpOnly: true,
			path: '/',
			maxAge: REFRESH_COOKIE_MAX_AGE,
			secure: !dev,
			sameSite: 'lax'
		});

		// New Sessions row with the fingerprints from the token.
		await recordSession({
			session_id: token.tokenId,
			user_id: userId,
			user_role: token.userRole,
			headers: request.headers,
			device_fingerprint: token.incomingFingerprints.device_fingerprint,
			browser_fingerprint: token.incomingFingerprints.browser_fingerprint,
			client_class: token.incomingFingerprints.client_class
		});

		// onboardingCompleted is collection-specific. AdminUsers is always
		// onboarded (matching check-dsa); the others fall back to false.
		const onboardingCompleted =
			token.userCollection === 'AdminUsers'
				? true
				: Boolean((user as any).onboardingCompleted ?? false);

		return apiOk({
			userExists: true,
			user: {
				id: user._id,
				name: (user as any).name,
				mobileNumber: (user as any).mobileNumber,
				email: (user as any).email,
				role: responseRole,
				onboardingCompleted
			},
			...(tfaPending && { requires_2fa: true, redirect: '/admin/2fa' }),
			...(isNativePlatform(request)
				? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
				: {})
		});
	} catch (error) {
		return apiServerError(error, 'login-confirm failed');
	}
};
