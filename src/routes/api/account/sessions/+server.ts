/**
 * GET /api/account/sessions
 * ══════════════════════════════════════════════════════════════════════
 * List the calling user's active sessions for the "Active Devices" UI.
 * Each row shows device label, rough location, last-seen, and an
 * is_current flag so the UI can mark "this device" and prevent the
 * user from accidentally revoking it via "Sign out all other devices".
 *
 * Returns: { sessions: SessionRow[] } sorted by last_seen_at desc.
 *
 * Auth: requireAuthApi (any role). Server-side ownership filter on
 * user_id — never trust a client to pass it.
 *
 * Admin impersonation: when an admin is impersonating, locals.user is
 * the impersonated user. We still show the impersonated user's
 * sessions — but the impersonation session ITSELF is intentionally
 * NOT recorded in Sessions (recordSession is only called in check-dsa,
 * not in /api/admin/impersonate/start), so it cannot show up here.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.3
 */

import type { RequestHandler } from './$types';
import { apiOk, apiServerError } from '$lib/server/apiResponse';
import { requireAuthApi } from '$lib/server/guards';
import { Sessions, AdminUsers, DsaApplications, rmApplications, Applicant } from '$lib/database/mongo';
import { verifyRefreshToken } from '$lib/services/jwtService';
import { findUserByMobile } from '$lib/server/csfle';
import logger from '$lib/server/logger';

/**
 * Identify which session_id corresponds to the calling device. Reads
 * the refresh-token cookie (httpOnly) and extracts the tokenId claim.
 * Returns null when the cookie is missing or invalid — the UI shows
 * all sessions without a "this device" badge in that case (rare;
 * usually means the user's refresh cookie was already cleared).
 */
function currentSessionId(refreshTokenCookie: string | undefined): string | null {
	if (!refreshTokenCookie) return null;
	const v = verifyRefreshToken(refreshTokenCookie);
	if (!v.valid || !v.payload) return null;
	return v.payload.tokenId ?? null;
}

/**
 * Look up the user's _id across all 4 user collections. Each
 * collection uses mobileNumber as the natural key. CSFLE-aware via
 * findUserByMobile (passthrough when CSFLE_ENABLED is off).
 */
async function resolveUserIdByRole(
	role: 'dsa' | 'rm' | 'admin' | 'applicant' | string,
	mobileNumber: string
): Promise<{ _id: import('mongodb').ObjectId } | null> {
	// Inline per branch — TS doesn't unify the four Collection<T> types
	// when a ternary picks among them. The explicit switch keeps each
	// findUserByMobile call typed against its specific collection schema.
	switch (role) {
		case 'dsa': {
			const d = await findUserByMobile(DsaApplications, mobileNumber);
			return d ? { _id: d._id } : null;
		}
		case 'rm': {
			const d = await findUserByMobile(rmApplications, mobileNumber);
			return d ? { _id: d._id } : null;
		}
		case 'admin': {
			const d = await findUserByMobile(AdminUsers, mobileNumber);
			return d ? { _id: d._id } : null;
		}
		default: {
			const d = await findUserByMobile(Applicant, mobileNumber);
			return d ? { _id: d._id } : null;
		}
	}
}

export const GET: RequestHandler = async ({ locals, cookies }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	try {
		const role = sessionUser.activeRole ?? sessionUser.role ?? 'dsa';
		const userDoc = await resolveUserIdByRole(role, sessionUser.mobileNumber);
		if (!userDoc?._id) {
			// No DB row for this user — return empty list (defensive).
			return apiOk({ sessions: [] });
		}

		const myCurrentId = currentSessionId(cookies.get('refreshToken'));

		const rows = await Sessions.find(
			{ user_id: userDoc._id, revoked_at: { $exists: false } },
			{
				sort: { last_seen_at: -1 },
				projection: {
					session_id: 1,
					device_label: 1,
					ip_country: 1,
					ip_country_region: 1,
					ip_city: 1,
					created_at: 1,
					last_seen_at: 1,
					user_role: 1
				}
			}
		).toArray();

		return apiOk({
			sessions: rows.map((r) => ({
				session_id: r.session_id,
				device_label: r.device_label,
				ip_city: r.ip_city ?? null,
				ip_country_region: r.ip_country_region ?? null,
				ip_country: r.ip_country ?? null,
				created_at: r.created_at.toISOString(),
				last_seen_at: r.last_seen_at.toISOString(),
				role: r.user_role,
				is_current: myCurrentId !== null && r.session_id === myCurrentId
			}))
		});
	} catch (err) {
		return apiServerError(err, 'Failed to load active sessions');
	}
};
