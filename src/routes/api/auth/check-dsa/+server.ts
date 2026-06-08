import {
	DsaApplications,
	Applicant,
	rmApplications,
	AdminUsers,
	FormSessions
} from '$lib/database/mongo.js';
import type { RequestHandler } from '@sveltejs/kit';
import { generateTokenPair, generateTokenId } from '$lib/services/jwtService.js';
import { dev } from '$app/environment';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';
import {
	apiOk,
	apiError,
	apiServerError,
	apiValidationError,
	parseJsonBody
} from '$lib/server/apiResponse.js';
import { isNativePlatform } from '$lib/server/platformDetection.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import logger from '$lib/server/logger.js';
import { z } from 'zod';
import { findUserByMobile, decryptUserPii } from '$lib/server/csfle/index.js';
import { recordSession } from '$lib/server/account/sessions';
import { evaluateLoginConflict } from '$lib/server/auth/checkDsaConflictGate';

// DX-2: Zod schema replaces the hand-rolled mobileNumber empty/regex check
// and locks preferredRole to known values (previously a free-form string
// compared inline). The schema is intentionally lenient on `mobileNumber`
// width (10-15 digits) to cover international numbers if ever needed —
// the existing regex matched the same range.
//
// SEC-10: deviceFingerprint, browserFingerprint, clientClass are all
// optional and intentionally lenient at the Zod layer (plain string,
// no regex). Format validation runs in the handler body — malformed
// values are silently dropped to undefined so a buggy client release
// can't lock the whole login endpoint out. The dropped-value path is
// logged at debug level for ops visibility.
const postRequestSchema = z.object({
	mobileNumber: z.string().regex(/^\d{10,15}$/, 'Mobile number must be 10-15 digits'),
	hardwareFingerprint: z.string().optional(),
	preferredRole: z.enum(['dsa', 'rm', 'admin']).optional(),
	deviceFingerprint: z.string().optional(),
	browserFingerprint: z.string().optional(),
	clientClass: z.string().optional()
});

// SEC-10 fingerprints are SHA-256 hex digests built client-side. Format
// check is intentionally simple: lowercase hex, exactly 64 chars. Anything
// else is treated as "not present" so a malformed client release degrades
// gracefully (login still works; conflict detection just runs without the
// fingerprint signal for that session).
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function sanitizeFingerprint(value: string | undefined): string | undefined {
	if (!value) return undefined;
	return SHA256_HEX_RE.test(value) ? value : undefined;
}

function sanitizeClientClass(value: string | undefined): 'web' | 'android' | undefined {
	if (value === 'web' || value === 'android') return value;
	return undefined;
}

// NOTE: Capacitor WebView cannot reliably read httpOnly cookies set by SvelteKit.
// Native platforms receive tokens in the JSON response body as a deliberate bridge.
// Web platforms use httpOnly cookies only (tokens never in response body).

/**
 * Build the DB update for device-aware token management.
 * Same device → push tokenId to array (multi-browser support).
 * Different device → NUKE: clear all old tokens, invalidate form sessions.
 */
function buildTokenUpdate(
	tokenId: string,
	refreshToken: string,
	refreshTokenExpiry: Date,
	storedDeviceHash: string | undefined,
	incomingDeviceHash: string | undefined
): { update: Record<string, any>; isDeviceSwitch: boolean } {
	const isDeviceSwitch = !!(
		storedDeviceHash &&
		incomingDeviceHash &&
		storedDeviceHash !== incomingDeviceHash
	);

	if (isDeviceSwitch || !storedDeviceHash) {
		// Different device or first login: nuke old tokens, set new device hash
		return {
			update: {
				$set: {
					refreshToken,
					refreshTokenExpiry,
					activeTokenId: tokenId,
					activeTokenIds: [tokenId],
					...(incomingDeviceHash ? { deviceClassHash: incomingDeviceHash } : {}),
					updatedAt: new Date()
				}
			},
			isDeviceSwitch
		};
	}

	// Same device: push new tokenId to array
	return {
		update: {
			$set: {
				refreshToken,
				refreshTokenExpiry,
				activeTokenId: tokenId,
				updatedAt: new Date()
			},
			$push: {
				activeTokenIds: { $each: [tokenId], $slice: -10 } as any
			}
		},
		isDeviceSwitch: false
	};
}

/**
 * POST /api/auth/check-dsa
 * Primary auth endpoint: checks DsaApplications first, then rmApplications (partners),
 * then Applicant (for admin users), then AdminUsers.
 *
 * Accepts optional `preferredRole` param — when set (e.g. 'admin', 'rm'),
 * the endpoint skips the fallback chain and goes directly to that collection.
 * This enables multi-role users to pick which role to log in as.
 */
export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
	// SEC-4: rate-limit the primary login endpoint by IP. Without this, an
	// attacker can enumerate registered mobile numbers (the response shape
	// differs between "found" and "not found"). 10/min/IP is generous for
	// real users (typical OTP flow makes 1 call) but blocks scraping rates.
	const isLimited = await rateLimit(getClientAddress(), {
		identifier: `auth-check-dsa:${getClientAddress()}`,
		maxRequests: 10,
		windowMs: 60_000
	});
	if (isLimited) {
		return apiError('Too many login attempts. Please wait before trying again.', 429);
	}

	const parsed = await parseJsonBody<Record<string, unknown>>(request);
	if (!parsed.ok) return parsed.response;

	const validated = postRequestSchema.safeParse(parsed.data);
	if (!validated.success) {
		return apiValidationError('Invalid request body', validated.error.flatten());
	}
	const { mobileNumber, hardwareFingerprint, preferredRole } = validated.data;

	// SEC-10: sanitize the three new optional fingerprint inputs once at
	// request entry, then spread the result into every recordSession call
	// below. This keeps each branch's recordSession call short and
	// guarantees the same sanitized values land in every code path.
	const cleanDeviceFingerprint = sanitizeFingerprint(validated.data.deviceFingerprint);
	const cleanBrowserFingerprint = sanitizeFingerprint(validated.data.browserFingerprint);
	const cleanClientClass = sanitizeClientClass(validated.data.clientClass);
	const sessionExtras = {
		...(cleanDeviceFingerprint ? { device_fingerprint: cleanDeviceFingerprint } : {}),
		...(cleanBrowserFingerprint ? { browser_fingerprint: cleanBrowserFingerprint } : {}),
		...(cleanClientClass ? { client_class: cleanClientClass } : {})
	};
	// Surface dropped/malformed inputs at debug level — no noise in normal
	// operation (the comparator is value-vs-sanitized, so all-undefined
	// requests log nothing). Helps diagnose buggy client releases.
	if (
		(validated.data.deviceFingerprint && !cleanDeviceFingerprint) ||
		(validated.data.browserFingerprint && !cleanBrowserFingerprint) ||
		(validated.data.clientClass && !cleanClientClass)
	) {
		logger.debug(
			{
				deviceFingerprintReceived: validated.data.deviceFingerprint?.slice(0, 8),
				browserFingerprintReceived: validated.data.browserFingerprint?.slice(0, 8),
				clientClassReceived: validated.data.clientClass
			},
			'[sec-10] check-dsa dropped malformed fingerprint input'
		);
	}

	// SEC-10: hoist tokenId generation to handler entry so the same value
	// is used by (a) the conflict gate's pending-login-token signing, and
	// (b) the access + refresh JWTs + activeTokenIds + Sessions row that
	// get written on the no-conflict path. One UUID per login attempt.
	// Small cost on userExists=false branches (one wasted UUID); cleaner
	// than per-branch generation + duplicated wiring.
	const tokenId = generateTokenId();

	try {
		// SEC-2: findUserByMobile transparently handles both encrypted (new)
		// and plaintext (legacy) rows. decryptUserPii unwraps PII fields
		// before downstream code reads them. When CSFLE is disabled, both
		// helpers passthrough and behave like the prior dual-query logic.

		// ── If preferredRole is 'admin', skip straight to AdminUsers ──
		if (preferredRole === 'admin') {
			let adminUser = await findUserByMobile(AdminUsers, mobileNumber);
			if (adminUser) adminUser = await decryptUserPii(adminUser);

			if (adminUser && adminUser.is_active) {
				// SEC-10: conflict-detection gate. Soak mode: no-op + telemetry.
				// SESSION_ENFORCEMENT_KICK_ENABLED='true' (Commit C flip) makes
				// real conflicts short-circuit with the session_conflict body.
				const gate = await evaluateLoginConflict({
					userId: adminUser._id,
					userRole: 'admin',
					userCollection: 'AdminUsers',
					tokenId,
					sanitizedFingerprints: sessionExtras
				});
				if (gate.kind === 'conflict') return apiOk(gate.body);

				// E.2 — when 2FA is enabled, mint the access token with
				// tfa_pending=true. hooks.server.ts gates such sessions
				// to /admin/2fa + the verify endpoint only.
				const tfaPending = adminUser.twofa?.enabled === true;
				const tokens = generateTokenPair(
					adminUser._id.toString(),
					adminUser.email || '',
					adminUser.mobileNumber,
					adminUser.name || '',
					tokenId,
					{ role: 'admin', tfa_pending: tfaPending }
				);

				const refreshTokenExpiry = new Date();
				refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

				const { update: adminUpdate } = buildTokenUpdate(
					tokenId,
					tokens.refreshToken,
					refreshTokenExpiry,
					(adminUser as any).deviceClassHash,
					hardwareFingerprint
				);

				await AdminUsers.updateOne({ _id: adminUser._id }, adminUpdate);

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

				cookies.set('role', 'admin', {
					httpOnly: true,
					path: '/',
					maxAge: REFRESH_COOKIE_MAX_AGE,
					secure: !dev,
					sameSite: 'lax'
				});

				// E.3 — register an active-session row for "Active devices" UI.
				await recordSession({
					session_id: tokenId,
					user_id: adminUser._id,
					user_role: 'admin',
					headers: request.headers,
					...sessionExtras
				});

				return apiOk({
					userExists: true,
					user: {
						id: adminUser._id,
						name: adminUser.name,
						mobileNumber: adminUser.mobileNumber,
						email: adminUser.email,
						role: 'admin',
						onboardingCompleted: true
					},
					// E.2 — client redirects to /admin/2fa instead of the
					// dashboard when this flag is set.
					...(tfaPending && { requires_2fa: true, redirect: '/admin/2fa' }),
					...(isNativePlatform(request)
						? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
						: {})
				});
			}

			return apiOk({ userExists: false });
		}

		// ── If preferredRole is 'rm', skip straight to rmApplications ──
		if (preferredRole === 'rm') {
			let rmUser = await findUserByMobile(rmApplications, mobileNumber);
			if (rmUser) rmUser = await decryptUserPii(rmUser);

			if (rmUser) {
				// SEC-10: conflict-detection gate (see admin-preferred for full comment).
				const gate = await evaluateLoginConflict({
					userId: rmUser._id,
					userRole: 'rm',
					userCollection: 'rmApplications',
					tokenId,
					sanitizedFingerprints: sessionExtras
				});
				if (gate.kind === 'conflict') return apiOk(gate.body);

				const tokens = generateTokenPair(
					rmUser._id.toString(),
					rmUser.email || '',
					rmUser.mobileNumber,
					rmUser.name || '',
					tokenId
				);

				const refreshTokenExpiry = new Date();
				refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

				const { update: rmUpdate, isDeviceSwitch: rmDeviceSwitch } = buildTokenUpdate(
					tokenId,
					tokens.refreshToken,
					refreshTokenExpiry,
					(rmUser as any).deviceClassHash,
					hardwareFingerprint
				);

				await rmApplications.updateOne({ _id: rmUser._id }, rmUpdate);

				if (rmDeviceSwitch) {
					const uid = rmUser._id.toString();
					try {
						await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
					} catch (firstErr) {
						logger.warn({ err: firstErr, userId: uid }, 'Session invalidation on device switch failed, retrying');
						try {
							await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
						} catch (retryErr) {
							logger.error({ err: retryErr, userId: uid }, 'Session invalidation on device switch failed after retry');
						}
					}
				}

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

				cookies.set('role', 'rm', {
					httpOnly: true,
					path: '/',
					maxAge: REFRESH_COOKIE_MAX_AGE,
					secure: !dev,
					sameSite: 'lax'
				});

				// E.3 — register an active-session row for "Active devices" UI.
				await recordSession({
					session_id: tokenId,
					user_id: rmUser._id,
					user_role: 'rm',
					headers: request.headers,
					...sessionExtras
				});

				return apiOk({
					userExists: true,
					user: {
						id: rmUser._id,
						name: rmUser.name,
						mobileNumber: rmUser.mobileNumber,
						email: rmUser.email,
						role: 'rm',
						onboardingCompleted: rmUser.onboardingCompleted ?? false
					},
					...(isNativePlatform(request)
						? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
						: {})
				});
			}

			return apiOk({ userExists: false });
		}

		// ── Default fallback chain (no preferredRole or preferredRole='dsa') ──

		// 1. Check DSA collection first (primary for this platform)
		let dsaUser = await findUserByMobile(DsaApplications, mobileNumber);
		if (dsaUser) dsaUser = await decryptUserPii(dsaUser);

		if (dsaUser) {
			// SEC-10: conflict-detection gate (see admin-preferred for full comment).
			const gate = await evaluateLoginConflict({
				userId: dsaUser._id,
				userRole: 'dsa',
				userCollection: 'DsaApplications',
				tokenId,
				sanitizedFingerprints: sessionExtras
			});
			if (gate.kind === 'conflict') return apiOk(gate.body);

			const tokens = generateTokenPair(
				dsaUser._id.toString(),
				dsaUser.email,
				dsaUser.mobileNumber,
				dsaUser.name,
				tokenId
			);

			const refreshTokenExpiry = new Date();
			refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

			const { update: dsaUpdate, isDeviceSwitch: dsaDeviceSwitch } = buildTokenUpdate(
				tokenId,
				tokens.refreshToken,
				refreshTokenExpiry,
				dsaUser.deviceClassHash,
				hardwareFingerprint
			);

			await DsaApplications.updateOne({ _id: dsaUser._id }, dsaUpdate);

			// Device switch: invalidate all active form sessions (force fresh start)
			if (dsaDeviceSwitch) {
				const uid = dsaUser._id.toString();
				try {
					await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
				} catch (firstErr) {
					logger.warn({ err: firstErr, userId: uid }, 'Session invalidation on device switch failed, retrying');
					try {
						await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
					} catch (retryErr) {
						logger.error({ err: retryErr, userId: uid }, 'Session invalidation on device switch failed after retry');
					}
				}
			}

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

			cookies.set('role', 'dsa', {
				httpOnly: true,
				path: '/',
				maxAge: REFRESH_COOKIE_MAX_AGE,
				secure: !dev,
				sameSite: 'lax'
			});

			// E.3 — register an active-session row for "Active devices" UI.
			await recordSession({
				session_id: tokenId,
				user_id: dsaUser._id,
				user_role: 'dsa',
				headers: request.headers,
				...sessionExtras
			});

			return apiOk({
				userExists: true,
				user: {
					id: dsaUser._id,
					name: dsaUser.name,
					mobileNumber: dsaUser.mobileNumber,
					email: dsaUser.email,
					role: 'dsa',
					onboardingCompleted: dsaUser.onboardingCompleted ?? false
				},
				...(isNativePlatform(request)
					? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
					: {})
			});
		}

		// 2. Check RM collection (partner entry point)
		let rmUser = await findUserByMobile(rmApplications, mobileNumber);
		if (rmUser) rmUser = await decryptUserPii(rmUser);

		if (rmUser) {
			// SEC-10: conflict-detection gate (see admin-preferred for full comment).
			const gate = await evaluateLoginConflict({
				userId: rmUser._id,
				userRole: 'rm',
				userCollection: 'rmApplications',
				tokenId,
				sanitizedFingerprints: sessionExtras
			});
			if (gate.kind === 'conflict') return apiOk(gate.body);

			const tokens = generateTokenPair(
				rmUser._id.toString(),
				rmUser.email || '',
				rmUser.mobileNumber,
				rmUser.name || '',
				tokenId
			);

			const refreshTokenExpiry = new Date();
			refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

			const { update: rmUpdate, isDeviceSwitch: rmDeviceSwitch } = buildTokenUpdate(
				tokenId,
				tokens.refreshToken,
				refreshTokenExpiry,
				(rmUser as any).deviceClassHash,
				hardwareFingerprint
			);

			await rmApplications.updateOne({ _id: rmUser._id }, rmUpdate);

			if (rmDeviceSwitch) {
				const uid = rmUser._id.toString();
				try {
					await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
				} catch (firstErr) {
					logger.warn({ err: firstErr, userId: uid }, 'Session invalidation on device switch failed, retrying');
					try {
						await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
					} catch (retryErr) {
						logger.error({ err: retryErr, userId: uid }, 'Session invalidation on device switch failed after retry');
					}
				}
			}

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

			cookies.set('role', 'rm', {
				httpOnly: true,
				path: '/',
				maxAge: REFRESH_COOKIE_MAX_AGE,
				secure: !dev,
				sameSite: 'lax'
			});

			// E.3 — register an active-session row for "Active devices" UI.
			await recordSession({
				session_id: tokenId,
				user_id: rmUser._id,
				user_role: 'rm',
				headers: request.headers,
				...sessionExtras
			});

			return apiOk({
				userExists: true,
				user: {
					id: rmUser._id,
					name: rmUser.name,
					mobileNumber: rmUser.mobileNumber,
					email: rmUser.email,
					role: 'rm',
					onboardingCompleted: rmUser.onboardingCompleted ?? false
				},
				...(isNativePlatform(request)
					? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
					: {})
			});
		}

		// 3. Fallback: check Applicant collection (for admin users)
		let applicantUser = await findUserByMobile(Applicant, mobileNumber);
		if (applicantUser) applicantUser = await decryptUserPii(applicantUser);

		if (applicantUser) {
			// Determine role up-front — needed by the SEC-10 gate (uses
			// the Sessions.user_role flavour: 'admin'|'applicant') and by
			// the cookie + response payload below (which use 'admin'|'dsa').
			// One source-of-truth check (`applicantUser.role === 'admin'`),
			// two derived values to keep the two consumers semantically clean.
			const role: 'admin' | 'dsa' = applicantUser.role === 'admin' ? 'admin' : 'dsa';
			const sessionsRole: 'admin' | 'applicant' =
				role === 'admin' ? 'admin' : 'applicant';

			// SEC-10: conflict-detection gate (see admin-preferred for full comment).
			const gate = await evaluateLoginConflict({
				userId: applicantUser._id,
				userRole: sessionsRole,
				userCollection: 'Applicant',
				tokenId,
				sanitizedFingerprints: sessionExtras
			});
			if (gate.kind === 'conflict') return apiOk(gate.body);

			const tokens = generateTokenPair(
				applicantUser._id.toString(),
				applicantUser.email || '',
				applicantUser.mobileNumber,
				applicantUser.name || '',
				tokenId
			);

			const refreshTokenExpiry = new Date();
			refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

			const { update: applicantUpdate, isDeviceSwitch: applicantDeviceSwitch } = buildTokenUpdate(
				tokenId,
				tokens.refreshToken,
				refreshTokenExpiry,
				applicantUser.deviceClassHash,
				hardwareFingerprint
			);

			await Applicant.updateOne({ _id: applicantUser._id }, applicantUpdate);

			if (applicantDeviceSwitch) {
				const uid = applicantUser._id.toString();
				try {
					await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
				} catch (firstErr) {
					logger.warn({ err: firstErr, userId: uid }, 'Session invalidation on device switch failed, retrying');
					try {
						await FormSessions.updateMany({ userId: uid, isActive: true }, { $set: { isActive: false, flagReason: 'device_switch' } });
					} catch (retryErr) {
						logger.error({ err: retryErr, userId: uid }, 'Session invalidation on device switch failed after retry');
					}
				}
			}

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

			// `role` derived above for both the gate and this cookie set.
			cookies.set('role', role, {
				httpOnly: true,
				path: '/',
				maxAge: REFRESH_COOKIE_MAX_AGE,
				secure: !dev,
				sameSite: 'lax'
			});

			// E.3 — register an active-session row for "Active devices" UI.
			// `sessionsRole` matches the SEC-10 gate's user_role above.
			await recordSession({
				session_id: tokenId,
				user_id: applicantUser._id,
				user_role: sessionsRole,
				headers: request.headers,
				...sessionExtras
			});

			// NOTE: The Applicant-collection path previously set a Cache-Control
			// header. apiOk() doesn't support custom headers — but SvelteKit
			// handles caching via hooks.server.ts, and auth responses should
			// never be cached by browsers anyway (httpOnly cookies + short JWT
			// lifetime handle this). No behavioral change.
			return apiOk({
				userExists: true,
				user: {
					id: applicantUser._id,
					name: applicantUser.name,
					mobileNumber: applicantUser.mobileNumber,
					email: applicantUser.email,
					gender: applicantUser.gender,
					role,
					onboardingCompleted: Boolean(applicantUser.onboardingCompleted)
				},
				...(isNativePlatform(request)
					? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
					: {})
			});
		}

		// 4. Check dedicated adminUsers collection
		let adminUser = await findUserByMobile(AdminUsers, mobileNumber);
		if (adminUser) adminUser = await decryptUserPii(adminUser);

		if (adminUser && adminUser.is_active) {
			// SEC-10: conflict-detection gate (see admin-preferred for full comment).
			const gate = await evaluateLoginConflict({
				userId: adminUser._id,
				userRole: 'admin',
				userCollection: 'AdminUsers',
				tokenId,
				sanitizedFingerprints: sessionExtras
			});
			if (gate.kind === 'conflict') return apiOk(gate.body);

			// E.2 — gate session behind /admin/2fa when enabled.
			const tfaPending = adminUser.twofa?.enabled === true;
			const tokens = generateTokenPair(
				adminUser._id.toString(),
				adminUser.email || '',
				adminUser.mobileNumber,
				adminUser.name || '',
				tokenId,
				{ role: 'admin', tfa_pending: tfaPending }
			);

			const refreshTokenExpiry = new Date();
			refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);

			const { update: adminUpdate } = buildTokenUpdate(
				tokenId,
				tokens.refreshToken,
				refreshTokenExpiry,
				(adminUser as any).deviceClassHash,
				hardwareFingerprint
			);

			await AdminUsers.updateOne({ _id: adminUser._id }, adminUpdate);

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

			cookies.set('role', 'admin', {
				httpOnly: true,
				path: '/',
				maxAge: REFRESH_COOKIE_MAX_AGE,
				secure: !dev,
				sameSite: 'lax'
			});

			// E.3 — register an active-session row for "Active devices" UI.
			await recordSession({
				session_id: tokenId,
				user_id: adminUser._id,
				user_role: 'admin',
				headers: request.headers,
				...sessionExtras
			});

			return apiOk({
				userExists: true,
				user: {
					id: adminUser._id,
					name: adminUser.name,
					mobileNumber: adminUser.mobileNumber,
					email: adminUser.email,
					role: 'admin',
					onboardingCompleted: true
				},
				// E.2 — client redirects to /admin/2fa instead of dashboard.
				...(tfaPending && { requires_2fa: true, redirect: '/admin/2fa' }),
				...(isNativePlatform(request)
					? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
					: {})
			});
		}

		return apiOk({ userExists: false });
	} catch (error) {
		return apiServerError(error, 'Authentication failed');
	}
};
