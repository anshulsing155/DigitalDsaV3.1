// ──────────────────────────────────────────────────────────────────────────
// OBS-2: OpenTelemetry must be initialized BEFORE any module that we want to
// instrument is used. MongoDB driver method patches activate at start() time,
// so calling startTelemetry() here at module load — once per server boot —
// ensures every DB call inside a request handler is captured. No-op when
// OTEL_ENABLED isn't set, so local dev pays zero cost by default.
// ──────────────────────────────────────────────────────────────────────────
import { startTelemetry } from '$lib/server/telemetry.js';

// ──────────────────────────────────────────────────────────────────────────
// SEC-10 sidecar — Boot observability (S223 incident follow-up)
// ──────────────────────────────────────────────────────────────────────────
// The 2026-06-04 SSR canvas/jsdom production-down incident ran for ~3 hours
// while Vercel function logs were EMPTY — SvelteKit's `handleError` hook is
// only wired up AFTER module-init completes, so a chunk-init throw never
// reaches it. The only diagnostic surface that fired was `sendErrorAlert`'s
// email. This block closes that observability gap:
//
//   [BOOT-1] logs first, before any other module-level side effect runs.
//            Sole purpose: prove the module started loading at all. Useful
//            when Vercel logs are blank for some other route's invocation.
//   process.on('uncaughtException' / 'unhandledRejection') installs catch-
//            alls that print the stack to stderr (Vercel function logs).
//            Without these, an async chunk-init throw silently crashes the
//            pod with nothing in logs.
//   [BOOT-2] logs after all module-level setup completes. If you see BOOT-1
//            but not BOOT-2 in logs, an error fired between them — narrows
//            the haystack from "the whole file" to "the init block".
//
// Belt-and-suspenders for the chunk-init class of failure SvelteKit's
// handleError can't see. See ADR-0031 + Pitfall #74.
console.error('[BOOT-1] hooks.server.ts module init starting');

process.on('uncaughtException', (err) => {
	// stderr → Vercel function log surface (the path that bypasses handleError).
	// Deliberately raw console.error (not logger) so this works even if Pino's
	// own module-init blew up.
	console.error('[BOOT-uncaughtException]', err?.stack || err?.message || String(err));
});

process.on('unhandledRejection', (reason) => {
	const detail =
		reason instanceof Error ? reason.stack || reason.message : String(reason);
	console.error('[BOOT-unhandledRejection]', detail);
});

// Fire-and-forget: startTelemetry is now async (lazy SDK module loading saves
// 100-300ms cold-start when OTEL_ENABLED is off, which is the default). Any
// request hitting the function before init resolves will be uninstrumented;
// observability gap is one request per cold start, acceptable for the win.
void startTelemetry();

console.error('[BOOT-2] hooks.server.ts module init complete');
import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';

import {
	redirect,
	isRedirect,
	isHttpError,
	type Handle,
	type HandleServerError,
	type RequestEvent
} from '@sveltejs/kit';
import {
	IMPERSONATION_COOKIE,
	verifyImpersonationCookie
} from '$lib/server/adminImpersonation.js';
import { Applicant, DsaApplications, rmApplications, AdminUsers, Teams } from '$lib/database/mongo';
import logger from '$lib/server/logger.js';
import {
	verifyAccessToken,
	verifyRefreshToken,
	generateTokenPair,
	DEMO_USER_ID
} from '$lib/services/jwtService';
import { isSessionRevoked } from '$lib/server/account/sessions';
import { ObjectId } from 'mongodb';
import type { JWTPayload, UserRoles } from '$lib/types';
import { DEFAULT_ROLES } from '$lib/types';
import { dev } from '$app/environment';
import { CSRF_SECRET } from '$env/static/private';
import { createCsrfToken, verifyCsrfToken } from '$lib/server/csrfTokens.js';
import { sendErrorAlert } from '$lib/server/errorAlert.js';
import { validateRequiredEnv } from '$lib/server/envValidation.js';
import {
	REFRESH_COOKIE_MAX_AGE,
	ACCESS_COOKIE_MAX_AGE,
	REFRESH_TOKEN_DAYS
} from '$lib/server/sessionConstants.js';

// OBS-2: request-level tracer. One root span per inbound request gives the
// trace tree something to anchor MongoDB + external-fetch spans against.
const requestTracer = trace.getTracer('digitaldsa-v3.request');

// ── Activity tracking: throttle DB writes to once per 5 minutes per user ──
const lastActivityUpdates = new Map<string, number>();
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

// 🔒 SECURITY: CSRF secret for token generation/verification
const csrfSecret = CSRF_SECRET || '';
if (!csrfSecret && !dev) {
	logger.error('FATAL: CSRF_SECRET environment variable is required in production');
	process.exit(1);
}

async function handleJWTAuthentication(event: RequestEvent) {
	try {
		const authHeader = event.request.headers.get('authorization');
		let accessToken = authHeader?.startsWith('Bearer ')
			? authHeader.substring(7)
			: event.cookies.get('accessToken');

		const refreshToken = event.cookies.get('refreshToken');

		// No tokens → no user
		if (!accessToken && !refreshToken) {
			event.locals.user = null;
			return;
		}

		// Try verifying access token normally
		let accessValidation = accessToken ? verifyAccessToken(accessToken) : { valid: false };

		// ✅ If access token expired → try refresh
		if (!accessValidation.valid && refreshToken) {
			const refreshValidation = verifyRefreshToken(refreshToken);

			if (refreshValidation.valid && refreshValidation.payload?.userId) {
				const refreshUserId = refreshValidation.payload.userId;
				// Query all 4 collections in parallel instead of sequential waterfall
				const refreshOid = new ObjectId(refreshUserId);
				const [userDoc, dsaDoc, rmDoc, adminDoc] = await Promise.all([
					Applicant.findOne({ _id: refreshOid }),
					DsaApplications.findOne({ _id: refreshOid }),
					rmApplications.findOne({ _id: refreshOid }),
					AdminUsers.findOne({ _id: refreshOid })
				]);

				// Pick the first matching collection result
				let resolvedDoc: { _id: any; email?: string; mobileNumber?: number; name?: string } | null =
					null;
				let resolvedRole: string | null = null;

				if (userDoc) {
					resolvedDoc = userDoc;
				} else if (dsaDoc) {
					resolvedDoc = dsaDoc;
					resolvedRole = 'dsa';
				} else if (rmDoc) {
					resolvedDoc = rmDoc;
					resolvedRole = 'rm';
				} else if (adminDoc && adminDoc.is_active) {
					resolvedDoc = adminDoc;
					resolvedRole = 'admin';
				}

				if (!resolvedDoc) {
					event.locals.user = null;
					event.cookies.delete('accessToken', { path: '/' });
					event.cookies.delete('refreshToken', { path: '/' });
					event.cookies.delete('activeRole', { path: '/' });
					event.cookies.delete('session', { path: '/' });
					return;
				}

				// Multi-browser device enforcement: check if tokenId is in the active array.
				// Supports multiple browsers on the same device (multiple valid tokenIds).
				// Logging in on a different device nukes all old tokens (device-switch nuke).
				// Skip for demo users (they share a static tokenId).
				const activeIds = (resolvedDoc as any).activeTokenIds as string[] | undefined;
				const legacyId = (resolvedDoc as any).activeTokenId as string | undefined;
				const currentTokenId = refreshValidation.payload.tokenId;

				if (activeIds && activeIds.length > 0) {
					// New system: check array
					if (!activeIds.includes(currentTokenId)) {
						event.locals.user = null;
						event.cookies.delete('accessToken', { path: '/' });
						event.cookies.delete('refreshToken', { path: '/' });
						event.cookies.delete('activeRole', { path: '/' });
						event.cookies.delete('role', { path: '/' });
						return;
					}
				} else if (legacyId && currentTokenId !== legacyId) {
					// Legacy fallback: single activeTokenId (pre-migration users)
					event.locals.user = null;
					event.cookies.delete('accessToken', { path: '/' });
					event.cookies.delete('refreshToken', { path: '/' });
					event.cookies.delete('activeRole', { path: '/' });
					event.cookies.delete('role', { path: '/' });
					return;
				}

				const newTokenId = crypto.randomUUID();
				const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokenPair(
					resolvedDoc._id.toString(),
					resolvedDoc.email || '',
					resolvedDoc.mobileNumber ?? 0,
					resolvedDoc.name || '',
					newTokenId
				);

				// 🔒 SECURITY: Set HttpOnly cookies with secure flags
				event.cookies.set('accessToken', newAccessToken, {
					httpOnly: true,
					path: '/',
					maxAge: ACCESS_COOKIE_MAX_AGE,
					secure: !dev,
					sameSite: 'lax'
				});

				event.cookies.set('refreshToken', newRefreshToken, {
					httpOnly: true,
					path: '/',
					maxAge: REFRESH_COOKIE_MAX_AGE,
					secure: !dev,
					sameSite: 'lax'
				});

				// Fire-and-forget: persist new refresh token + add to activeTokenIds array
				const refreshTokenExpiry = new Date();
				refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + REFRESH_TOKEN_DAYS);
				const refreshUserId_oid = new ObjectId(refreshValidation.payload.userId);
				const refreshUpdate = {
					$set: {
						refreshToken: newRefreshToken,
						refreshTokenExpiry,
						activeTokenId: newTokenId // Legacy field kept in sync
					},
					$push: {
						activeTokenIds: { $each: [newTokenId], $slice: -10 } as any
					}
				};
				const refreshCollection =
					resolvedRole === 'dsa' ? DsaApplications
					: resolvedRole === 'rm' ? rmApplications
					: resolvedRole === 'admin' ? AdminUsers
					: Applicant;
				try {
					await refreshCollection.updateOne({ _id: refreshUserId_oid }, refreshUpdate);
				} catch (firstErr) {
					logger.warn({ err: firstErr, userId: refreshValidation.payload.userId, role: resolvedRole }, 'Refresh token DB write failed, retrying');
					try {
						await refreshCollection.updateOne({ _id: refreshUserId_oid }, refreshUpdate);
					} catch (retryErr) {
						logger.error({ err: retryErr, userId: refreshValidation.payload.userId, role: resolvedRole }, 'Refresh token DB write failed after retry');
					}
				}

				// Replace old token reference
				accessToken = newAccessToken;
				accessValidation = verifyAccessToken(newAccessToken);
			} else {
				// Refresh token invalid → log out fully
				event.locals.user = null;
				event.cookies.delete('accessToken', { path: '/' });
				event.cookies.delete('refreshToken', { path: '/' });
				return;
			}
		}

		// If access token still invalid → logout
		if (!accessValidation.valid || !accessValidation.payload) {
			event.locals.user = null;
			event.cookies.delete('accessToken', { path: '/' });
			return;
		}

		const payload = accessValidation.payload as JWTPayload;

		// ── SEC-10 — session-revoke check ────────────────────────
		// When another device's login has flipped this Sessions row's
		// revoked_at (conflict gate's kick path, or /api/auth/delete-
		// account, or any future explicit "sign out everywhere" tool),
		// boot this device on its very next request — no waiting for
		// the client-side poller's 3s cadence.
		//
		// Skip on two paths:
		//   - /api/auth/session-status — that endpoint is the canonical
		//     surface for reading the revoke payload; if we hard-bounced
		//     it here the kicked-toast couldn't render before redirect.
		//   - /api/auth/logout         — a graceful logout shouldn't
		//     race with the hook to clear cookies; let the endpoint own
		//     its return.
		//
		// Cost: one indexed Sessions.findOne per authenticated request.
		// At DigitalDSA's scale (small operator product, not consumer)
		// the per-request cost is sub-millisecond and well below the
		// PERF-3A parallel-lookup wins below. If this ever becomes hot,
		// the right next step is a short in-process cache keyed on
		// session_id with a few-second TTL — same pattern as the
		// activity-tracking throttle above.
		const requestPath = event.url.pathname;
		const skipRevokeCheck =
			requestPath === '/api/auth/session-status' || requestPath === '/api/auth/logout';
		if (!skipRevokeCheck && refreshToken) {
			const refreshCheck = verifyRefreshToken(refreshToken);
			const sessionTokenId = refreshCheck.valid ? refreshCheck.payload?.tokenId : null;
			if (sessionTokenId && (await isSessionRevoked(sessionTokenId))) {
				event.locals.user = null;
				event.cookies.delete('accessToken', { path: '/' });
				event.cookies.delete('refreshToken', { path: '/' });
				event.cookies.delete('activeRole', { path: '/' });
				event.cookies.delete('role', { path: '/' });
				logger.info(
					{
						event: 'session.hook_revoked',
						session_id: sessionTokenId,
						path: requestPath,
						method: event.request.method
					},
					'hooks: session revoked, kicking device on next request'
				);
				// Page navigations (GET on a non-/api/ route) get bounced to
				// the public home page with a query-param tag the marketing
				// page can later use to render a "you were signed out" banner.
				// API / POST requests fall through with locals.user=null so
				// the downstream route's auth guard returns its standard 401
				// — the client-side poller catches that within ~3s and shows
				// the toast + redirect.
				const isApiCall = requestPath.startsWith('/api/');
				if (event.request.method === 'GET' && !isApiCall) {
					throw redirect(303, '/?reason=kicked');
				}
				return;
			}
		}

		// ── Demo mode: skip DB lookup, use synthetic user ────────
		if (payload.isDemo === true && payload.userId === DEMO_USER_ID) {
			event.locals.user = {
				id: DEMO_USER_ID,
				name: payload.name || 'Demo DSA Agent',
				email: payload.email || 'demo@digitaldsa.com',
				mobileNumber: String(payload.mobileNumber || '9999999999'),
				role: 'dsa',
				roles: { user: true, dsa: true, rm: false, propertyConsultant: false, admin: false },
				activeRole: 'dsa',
				onboardingCompleted: true
			};
			return;
		}

		// PERF-3A: issue all 4 user-collection lookups in parallel instead of
		// waterfalling. For DSA/RM/Admin logins (the hot path) this collapses
		// a 2–4 round-trip serial chain into a single round-trip. Matches the
		// pattern already used in the refresh-token path above (lines 59–64).
		// The Applicant-login path now does 4 queries instead of 1, but that
		// flow is low-volume (share-link form applicants) — acceptable for
		// the consistent win across the operator paths. Branch selection still
		// follows the `applicant → dsa → rm → admin` precedence.
		const primaryOid = new ObjectId(payload.userId);
		const [userDoc, prefetchedDsaDoc, prefetchedRmDoc, prefetchedAdminDoc] = await Promise.all([
			Applicant.findOne({ _id: primaryOid }),
			DsaApplications.findOne({ _id: primaryOid }),
			rmApplications.findOne({ _id: primaryOid }),
			AdminUsers.findOne({ _id: primaryOid })
		]);

		if (!userDoc) {
			// Fallback: userId might be from DsaApplications or rmApplications
			const dsaDoc = prefetchedDsaDoc;
			if (dsaDoc) {
				event.locals.user = {
					id: payload.userId,
					name: dsaDoc.name || payload.name || '',
					email: dsaDoc.email || payload.email || '',
					mobileNumber: String(dsaDoc.mobileNumber || payload.mobileNumber),
					role: 'dsa',
					roles: { ...DEFAULT_ROLES, dsa: true },
					activeRole: 'dsa',
					onboardingCompleted: Boolean(dsaDoc.onboardingCompleted)
				};

				// ── Team context resolution (only for team members) ──
				// If this DSA has a team_owner_id, they're a sub-DSA member.
				// Load their team context so permission checks work downstream.
				if (dsaDoc.team_owner_id) {
					try {
						const team = await Teams.findOne({ owner_dsa_id: dsaDoc.team_owner_id });
						if (team) {
							const member = team.members.find(
								(m) => m.user_id.toString() === dsaDoc._id!.toString()
							);
							if (member && member.status === 'active') {
								event.locals.user.teamContext = {
									teamId: team._id!.toString(),
									ownerDsaId: dsaDoc.team_owner_id.toString(),
									memberRole: member.team_role,
									permissions: member.permissions,
									isOwner: false
								};
							}
						}
					} catch {
						// Non-fatal: team lookup failure doesn't block auth
					}
				} else if (dsaDoc.is_team_owner) {
					// Owner DSAs get a lightweight teamContext flag
					try {
						const team = await Teams.findOne({ owner_dsa_id: dsaDoc._id });
						if (team) {
							event.locals.user.teamContext = {
								teamId: team._id!.toString(),
								ownerDsaId: dsaDoc._id!.toString(),
								memberRole: 'owner',
								permissions: {
									cases_view: true,
									cases_create: true,
									cases_edit: true,
									form_fill: true,
									form_view: true,
									results_view: true,
									file_builder_view: true,
									file_builder_configure: true,
									leads_view: true,
									leads_create: true,
									leads_edit: true,
									sources_view: true,
									sources_manage: true,
									communication_view: true,
									analytics_view: true
								},
								isOwner: true
							};
						}
					} catch {
						// Non-fatal
					}
				}
				return;
			}

			const rmDoc = prefetchedRmDoc;
			if (rmDoc) {
				event.locals.user = {
					id: payload.userId,
					name: rmDoc.name || payload.name || '',
					email: rmDoc.email || payload.email || '',
					mobileNumber: String(rmDoc.mobileNumber || payload.mobileNumber),
					role: 'rm',
					roles: { ...DEFAULT_ROLES, rm: true },
					activeRole: 'rm',
					onboardingCompleted: Boolean(rmDoc.onboardingCompleted)
				};
				return;
			}

			// Check dedicated admin collection
			const adminDoc = prefetchedAdminDoc;
			if (adminDoc && adminDoc.is_active) {
				const adminId = payload.userId;
				const adminName = adminDoc.name || payload.name || '';
				const adminEmail = adminDoc.email || payload.email || '';

				// Check for active impersonation cookie — admin acting as a specific
				// DSA or RM. The signed cookie payload carries targetRole so we know
				// which collection to look up. teamContext is NOT propagated during
				// DSA impersonation: an admin looking at a team-owner DSA's view sees
				// only that DSA's personal scope, not team-wide controls. Acceptable
				// limitation; team-context elevation while impersonating would be a
				// separate ask.
				const impersonationCookie = event.cookies.get(IMPERSONATION_COOKIE);
				if (impersonationCookie) {
					const impersonation = verifyImpersonationCookie(impersonationCookie);
					if (impersonation && impersonation.adminId === adminId) {
						try {
							const collection =
								impersonation.targetRole === 'dsa' ? DsaApplications : rmApplications;
							const targetDoc = await collection.findOne({
								_id: new ObjectId(impersonation.targetId)
							});
							if (targetDoc) {
								// Override locals.user with the impersonated target's identity.
								// adminPermissions / isSuperAdmin are deliberately NOT propagated:
								// while impersonating, the session must behave like a true DSA/RM.
								// Any guard that checks isSuperAdmin (e.g. requireSuperAdmin in
								// guards.ts) would otherwise grant admin-level access to the
								// impersonated session — exactly what role='dsa'/'rm' prevents.
								event.locals.user = {
									id: impersonation.targetId,
									name: targetDoc.name || '',
									email: targetDoc.email || '',
									mobileNumber: String(targetDoc.mobileNumber || ''),
									role: impersonation.targetRole,
									roles: { ...DEFAULT_ROLES, [impersonation.targetRole]: true },
									activeRole: impersonation.targetRole,
									onboardingCompleted: Boolean(targetDoc.onboardingCompleted)
								};
								// Real admin identity preserved for OTP bypass + audit only.
								event.locals.adminActingAs = {
									id: adminId,
									name: adminName,
									email: adminEmail
								};
								return;
							}
						} catch {
							// Target not found or DB error — fall through to normal admin auth
						}
					}
					// Invalid/expired cookie (including any stale pre-refactor cookies
					// that carried the old { adminId, rmId } shape — verify returns null
					// on shape mismatch) — clear it.
					event.cookies.delete(IMPERSONATION_COOKIE, { path: '/' });
				}

				// Normal admin auth — respect activeRole cookie for testing
				const adminActiveRoleCookie = event.cookies.get('activeRole');
				const adminActiveRole =
					adminActiveRoleCookie === 'dsa' || adminActiveRoleCookie === 'rm'
						? adminActiveRoleCookie
						: 'admin';

				event.locals.user = {
					id: adminId,
					name: adminName,
					email: adminEmail,
					mobileNumber: String(adminDoc.mobileNumber || payload.mobileNumber),
					role: adminActiveRole,
					roles: { ...DEFAULT_ROLES, admin: true, dsa: true, rm: true },
					activeRole: adminActiveRole,
					onboardingCompleted: true,
					// E.2 — propagate the JWT's tfa_pending claim so the
					// gate below (and downstream consumers) can see the
					// session is OTP-verified but 2FA-not-yet-verified.
					...(payload.tfa_pending && { tfa_pending: true })
				};
				// Populate admin permission context for downstream guards
				event.locals.adminPermissions = adminDoc.permissions;
				event.locals.isSuperAdmin = adminDoc.is_super_admin === true;
				return;
			}

			// Truly not found in any collection — clean all auth cookies
			event.locals.user = null;
			event.cookies.delete('accessToken', { path: '/' });
			event.cookies.delete('refreshToken', { path: '/' });
			event.cookies.delete('activeRole', { path: '/' });
			event.cookies.delete('session', { path: '/' });
			return;
		}

		// ✅ Build roles object (support both new booleans and legacy string)
		// DSA-only platform: only DSA + admin roles are active
		let roles: UserRoles;
		if (userDoc.roles) {
			// New format — use directly
			roles = userDoc.roles;
		} else {
			// Legacy format — derive from old `role` string
			roles = { ...DEFAULT_ROLES };
			const legacyRole = userDoc.role;
			if (legacyRole === 'admin') roles.admin = true;
			if (legacyRole === 'user' || userDoc.onboardingCompleted) roles.user = true;
			if (legacyRole === 'dsa') {
				roles.dsa = true;
				roles.user = true;
			}
		}

		// Determine active role: cookie > DB activeRole > first true role > legacy role > 'user'
		// Validate cookie value against user's actual roles to prevent privilege escalation
		const activeRoleCookie = event.cookies.get('activeRole');
		const validatedCookieRole =
			activeRoleCookie && isRole(activeRoleCookie) && roles[activeRoleCookie]
				? activeRoleCookie
				: null;
		const activeRole =
			validatedCookieRole || userDoc.activeRole || (isRole(userDoc.role) ? userDoc.role : 'user');

		// ✅ Set user in locals
		// (Deleted accounts are physically moved to archive collections,
		//  so if userDoc exists here, the account is active.)
		event.locals.user = {
			id: payload.userId,
			name: payload.name || userDoc.name || '',
			email: payload.email || userDoc.email,
			mobileNumber: String(payload.mobileNumber),
			gender: userDoc.gender,
			occupation: userDoc.occupation,
			role: isRole(activeRole) ? activeRole : 'user',
			roles,
			activeRole,
			onboardingCompleted: Boolean(userDoc.onboardingCompleted)
		};
	} catch (error) {
		// SvelteKit's redirect() / error() throw special Redirect / HttpError
		// objects that the framework recognises ONLY if they propagate out of
		// the handler. The original catch here treated them as generic errors,
		// logged them as "JWT validation error", and silently swallowed them —
		// which is exactly what was bricking the SEC-10 hook-level revoke kick
		// (instant redirect-to-home never reached the response). Re-throw the
		// SvelteKit-special objects FIRST so the framework can act on them.
		// Any other thrown value is a real error and lands in the log below.
		if (isRedirect(error) || isHttpError(error)) {
			throw error;
		}
		logger.error({ err: error }, 'JWT validation error');
		event.locals.user = null;
		event.cookies.delete('accessToken', { path: '/' });
	}
}

// ── Update lastActiveAt for authenticated users (fire-and-forget, throttled) ──
// DSA-only platform: update DsaApplications or Applicant (for admin)
function trackUserActivity(userId: string, role: string) {
	const now = Date.now();
	const lastUpdate = lastActivityUpdates.get(userId) ?? 0;

	if (now - lastUpdate < ACTIVITY_THROTTLE_MS) return; // Skip if updated recently
	lastActivityUpdates.set(userId, now);

	const update = { $set: { lastActiveAt: new Date() } };
	const filter = { _id: new ObjectId(userId) };

	// Route activity update to the correct collection based on role
	if (role === 'dsa') {
		DsaApplications.updateOne(filter, update).catch(() => {});
	} else if (role === 'rm') {
		rmApplications.updateOne(filter, update).catch(() => {});
	} else {
		// admin/user — userId IS the Applicant _id
		Applicant.updateOne(filter, update).catch(() => {});
	}
}

// DSA-only platform: valid roles are dsa, admin, user (base)
type Role = 'admin' | 'user' | 'dsa' | 'rm';

function isRole(r: unknown): r is Role {
	return r === 'admin' || r === 'user' || r === 'dsa' || r === 'rm';
}

// 🔒 SECURITY: CSRF token validation
function validateCSRF(event: RequestEvent): boolean {
	// Skip CSRF in local development only. A blanket `if (dev) return true`
	// also opened the gate when the dev server was exposed via tunnels
	// (ngrok, cloudflared, LAN IP preview). Restrict to localhost so devs
	// keep their ergonomics but staging/tunnel deployments are protected.
	if (dev) {
		const hostname = event.url.hostname;
		if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
			return true;
		}
	}

	const method = event.request.method;

	// Only validate CSRF for state-changing methods
	if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
		return true;
	}

	// Skip CSRF for public auth endpoints used during login/signup flow
	// (user is unauthenticated at this point, so no CSRF cookie exists yet)
	// and share-link endpoints (accessed by unauthenticated applicants)
	const url = new URL(event.request.url);

	// Skip CSRF for ALL /api/cron/* endpoints. They have their own auth
	// (x-cron-secret header validated inside each endpoint) and are called
	// by external schedulers (cron-job.org for S3, Vercel Cron for the
	// 2-slot Free-tier ones) which cannot present a CSRF token by design.
	//
	// Surfaced 2026-05-27 during D.1 S3 cron-job.org wiring: the latent
	// bug had been silently 403-ing every cron endpoint
	// (billing-pending-cleanup, data2-revoke-sweep, data3-sweep,
	// analytics-etl, and the new S3 billing-charge + billing-charge-reminder).
	// They had never been smoke-tested from a real external scheduler
	// against production until this push.
	//
	// Safety: every cron handler MUST validate the x-cron-secret header
	// before doing any work. Without that header (or with a wrong value)
	// the endpoint returns 401 directly — CSRF skip doesn't open new attack
	// surface. The CRON_SECRET is 256 bits of hex entropy per Pitfall #60.
	if (url.pathname.startsWith('/api/cron/')) {
		return true;
	}

	// Skip CSRF for /api/webhook/* — third-party providers (AWS SNS, Razorpay,
	// etc.) cannot present our CSRF token. Each webhook MUST verify its own
	// authentication (SNS message signature + TopicArn match for SES bounce,
	// HMAC for Razorpay) BEFORE doing any work. Without that, an endpoint
	// short-circuits with the provider-specific reject (e.g. 401 or 200 no-op
	// on signature mismatch). CSRF skip doesn't open new attack surface — same
	// rationale as the /api/cron/* skip above.
	if (url.pathname.startsWith('/api/webhook/')) {
		return true;
	}

	const publicEndpoints = [
		// ── Login / Signup flow ──
		'/api/auth/login',
		'/api/auth/signup',
		'/api/auth/send-otp', // Send mobile OTP (MSG91)
		'/api/auth/verify-otp', // Verify mobile OTP (MSG91)
		'/api/auth/resend-otp', // Resend mobile OTP (MSG91)
		'/api/auth/detect-roles', // Detect user roles after mobile verification
		'/api/auth/check-email', // Check email availability during signup
		'/api/auth/send-email-verification', // Send email OTP for verification
		'/api/auth/verify-email-otp', // Verify email OTP
		'/api/auth/verify-email', // Legacy email verification
		'/api/auth/resend-email-otp', // Resend email OTP
		'/api/auth/refresh-token',
		'/api/auth/logout',
		'/api/auth/demo-login', // Guest demo login (no auth required)

		// ── DSA login check ──
		'/api/auth/check-dsa',
		// SEC-10 — the 2-step conflict-resolution endpoint. User has
		// verified OTP but holds no auth context yet (waiting on the
		// confirm-or-cancel modal decision), so there's no CSRF cookie
		// to present. Endpoint defends itself via signed pending-login-
		// token verification + per-IP rate limit + kick_session_ids ⊆
		// kickEligibleSessionIds subset check. CSRF skip doesn't open
		// new attack surface — same rationale as /api/auth/check-dsa.
		'/api/auth/login-confirm',

		// ── Team member onboarding (pre-auth via verifiedMobile cookie) ──
		'/api/onboarding/team-member-onboarding',

		// ── Share link (unauthenticated applicants) ──
		'/api/share-link/validate',
		'/api/share-link/verify-otp',
		'/api/share-link/submit',
		'/api/share-link/upload'
	];

	if (publicEndpoints.some((endpoint) => url.pathname === endpoint)) {
		return true;
	}

	// Get CSRF token from header or body
	const csrfToken = event.request.headers.get('x-csrf-token');

	if (!csrfToken) {
		return false;
	}

	// Verify token using native HMAC-SHA256 (replaced deprecated `csrf` package)
	return verifyCsrfToken(csrfSecret, csrfToken);
}

export const handle: Handle = async ({ event, resolve }) => {
	// OBS-2: wrap the entire request handling in a single root span. All
	// downstream MongoDB calls and external-fetch spans become children
	// automatically via OpenTelemetry's async context propagation.
	// Span name uses the URL pathname so paths group naturally; the route
	// template is recorded as an attribute when SvelteKit resolves it.
	return requestTracer.startActiveSpan(
		`${event.request.method} ${event.url.pathname}`,
		{
			attributes: {
				'http.request.method': event.request.method,
				'http.url': event.url.toString(),
				'url.path': event.url.pathname,
				'url.scheme': event.url.protocol.replace(':', '')
			}
		},
		async (rootSpan: Span) => {
			try {
				const response = await handleRequest(event, resolve);
				rootSpan.setAttribute('http.response.status_code', response.status);
				rootSpan.setStatus(
					response.status >= 500
						? { code: SpanStatusCode.ERROR, message: `HTTP ${response.status}` }
						: { code: SpanStatusCode.OK }
				);
				return response;
			} catch (err) {
				// SvelteKit's redirect() / error() throw control-flow objects,
				// not actual errors — recording them on the OTel span would
				// false-positive every 303/404/etc. as an "Unhandled error".
				// Skip the span exception for those and just re-throw.
				if (!isRedirect(err) && !isHttpError(err)) {
					rootSpan.recordException(err as Error);
					rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: 'Unhandled error in handle()' });
				}
				throw err;
			} finally {
				rootSpan.end();
			}
		}
	);
};

async function handleRequest(
	event: RequestEvent,
	resolve: Parameters<Handle>[0]['resolve']
): Promise<Response> {
	// Validate required env vars on the first request — fail-fast for missing
	// MONGODB_URI / JWT_SECRET / CSRF_SECRET / OPENAI_API_KEY rather than
	// crashing later when a dependent code path is hit. Idempotent; the
	// validator early-returns after the first call.
	validateRequiredEnv();

	// 🔒 SECURITY: Generate CSRF token for GET requests (only if CSRF_SECRET is configured)
	if (event.request.method === 'GET' && csrfSecret) {
		const csrfToken = createCsrfToken(csrfSecret);
		event.locals.csrfToken = csrfToken;

		// Set CSRF token in cookie for client-side access
		event.cookies.set('csrf-token', csrfToken, {
			httpOnly: false,
			path: '/',
			maxAge: 60 * 60 * 24,
			secure: !dev,
			sameSite: 'strict'
		});
	}

	// 🔒 SECURITY: Validate CSRF token for state-changing requests
	if (!validateCSRF(event)) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Invalid CSRF token'
			}),
			{
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Handle JWT authentication
	await handleJWTAuthentication(event);

	// ── E.2 — Admin 2FA pending-session gate ────────────────────
	// An admin whose JWT carries `tfa_pending: true` has completed OTP
	// but not yet the second factor. Their session is restricted to the
	// /admin/2fa UI + the verify endpoint + logout. Everything else is
	// redirected (HTML requests) or 403'd (API requests). Without this
	// gate, the tfa_pending claim is informational only and provides
	// zero security benefit.
	if (event.locals.user?.tfa_pending === true && event.locals.user.role === 'admin') {
		const path = event.url.pathname;
		const allowedPaths = [
			'/admin/2fa',
			'/api/admin/2fa/verify',
			'/api/auth/logout',
			'/api/csrf-token' // CSRF token endpoint needed for the verify POST
		];
		const isAllowed =
			allowedPaths.some((p) => path === p || path.startsWith(p + '/')) ||
			// Static assets + Sveltekit internal paths (_app/, favicon, etc.)
			path.startsWith('/_app/') ||
			path.startsWith('/favicon') ||
			path === '/robots.txt';
		if (!isAllowed) {
			// API requests get a structured 403 so the client can react.
			// HTML requests get a 302 redirect to the 2FA page.
			const isApiRequest =
				path.startsWith('/api/') ||
				event.request.headers.get('accept')?.includes('application/json');
			if (isApiRequest) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Two-factor verification required',
						code: 'tfa_required',
						redirect: '/admin/2fa'
					}),
					{ status: 403, headers: { 'Content-Type': 'application/json' } }
				);
			}
			return new Response(null, {
				status: 302,
				headers: { Location: '/admin/2fa' }
			});
		}
	}

	// ── Track user activity (throttled, fire-and-forget) — skip demo users ──
	if (event.locals.user?.id && event.locals.user.id !== DEMO_USER_ID) {
		trackUserActivity(event.locals.user.id, event.locals.user.role || 'user');
	}

	// ── F.3 — UTM first-touch attribution capture ────────────────
	// On every request, if the URL carries any utm_* param AND we don't
	// already have a UTM cookie, set the cookie. First-touch wins —
	// once set, subsequent visits with different UTM params are ignored
	// (that's the point: we want to know the FIRST campaign that brought
	// this person, not the last). Cookie is consumed at signup time
	// (auth/signup or onboarding) and persisted on the DSA record.
	try {
		const { parseUtmFromUrl, serializeForCookie, UTM_COOKIE_NAME, UTM_COOKIE_MAX_AGE_SECONDS } =
			await import('$lib/server/attribution/utm');
		const existing = event.cookies.get(UTM_COOKIE_NAME);
		if (!existing) {
			const attr = parseUtmFromUrl(event.url);
			if (attr) {
				event.cookies.set(UTM_COOKIE_NAME, serializeForCookie(attr), {
					path: '/',
					httpOnly: false, // client analytics may read it; not sensitive
					secure: !dev,
					sameSite: 'lax',
					maxAge: UTM_COOKIE_MAX_AGE_SECONDS
				});
			}
		}
	} catch {
		// Non-fatal — UTM capture is observability, not a correctness gate.
	}

	// ── Resolve active role for routing ──
	// Priority: activeRole (from user object) > legacy role cookie > default 'user'
	const roleCookie = event.cookies.get('role');
	const activeRoleCookie = event.cookies.get('activeRole');

	if (event.locals.user) {
		// Use the activeRole resolved during JWT auth
		event.locals.role = isRole(event.locals.user.activeRole)
			? event.locals.user.activeRole
			: (event.locals.user.role ?? 'user');
	} else if (isRole(roleCookie)) {
		// Not authenticated but has legacy role cookie (during onboarding)
		event.locals.role = roleCookie;
	} else if (isRole(activeRoleCookie)) {
		event.locals.role = activeRoleCookie;
	} else {
		event.locals.role = null;
	}

	// 🔒 SECURITY: Generate CSP nonce BEFORE resolve so it can be injected into HTML
	let cspNonce: string | undefined;
	if (!dev) {
		cspNonce = crypto.randomUUID().replace(/-/g, '');
		event.locals.cspNonce = cspNonce;
	}

	// Resolve with nonce injection for production
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			if (cspNonce) {
				return html.replace(/<script>/g, `<script nonce="${cspNonce}">`);
			}
			return html;
		}
	});

	// 🔒 SECURITY: Add security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	// HSTS header - only in production (localhost uses HTTP)
	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	// CSP header — only in production (dev mode needs eval for Vite HMR)
	if (cspNonce) {
		response.headers.set(
			'Content-Security-Policy',
			`default-src 'self'; script-src 'self' 'nonce-${cspNonce}' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.razorpay.com https://ik.imagekit.io; frame-ancestors 'none'`
		);
	}

	return response;
}

// ── Error capture ────────────────────────────────────────────────────────────
// Without this hook, SvelteKit silently swallows SSR errors and shows the
// generic "Internal Error" placeholder in production. Use console.error
// (NOT the Pino logger here) — Pino can buffer stdout in serverless functions
// and lose output on cold returns. console.error is captured synchronously
// by Vercel's runtime and surfaces in `vercel logs`.
export const handleError: HandleServerError = ({ error, event, status, message }) => {
	const err = error as Error;
	const summary = `[SSR-ERROR] ${event.request.method} ${event.url.pathname} status=${status} msg=${message} err=${err?.name ?? 'Unknown'}: ${err?.message ?? 'no-message'}`;
	// Two writes — one structured, one raw — to maximise capture chance
	// across Vercel's serverless and edge runtimes.
	console.error(summary);
	console.error('[SSR-ERROR-STACK]', err?.stack ?? '(no stack)');
	// Also log via Pino in case stdout is captured but JSON parser is preferred.
	logger.error(
		{
			ssrError: true,
			path: event.url.pathname,
			method: event.request.method,
			status,
			message,
			errMessage: err?.message,
			errName: err?.name,
			stack: err?.stack
		},
		summary
	);

	// Fire-and-forget email alert (dedup + global rate-limit handled inside).
	// Not awaited — handleError runs in the response path and we don't want
	// email delivery latency to delay the 500 page.
	// `status` is promoted to a first-class field so the alerter can collapse
	// sub-500 noise (bot probes + intentional load-fn 404s) into a single
	// dedup bucket. See errorAlert.ts fingerprint() comment for the rationale.
	sendErrorAlert({
		source: 'ssr',
		message: err?.message ?? message ?? 'Internal Error',
		stack: err?.stack,
		path: event.url.pathname,
		method: event.request.method,
		userAgent: event.request.headers.get('user-agent') ?? undefined,
		timestamp: new Date().toISOString(),
		status: typeof status === 'number' ? status : undefined,
		extra: { sveltekitMessage: message, errName: err?.name }
	});

	// Returning undefined keeps the default client-facing error response.
	return undefined;
};
