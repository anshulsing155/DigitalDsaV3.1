/**
 * GET /api/auth/session-status — SEC-10 Commit C kicked-side poll
 * ══════════════════════════════════════════════════════════════════════
 * Lightweight read-only endpoint the client polls (~every 8s) to discover
 * its own session has been revoked by a SEC-10 conflict-and-kick on
 * another device.
 *
 *   200 { active: true }
 *   401 { revoked: { reason, at } }   — client kicks itself to /login
 *
 * Auth shape:
 *   - We read the refresh-token cookie, verify it, and extract its
 *     `tokenId` claim — that's the Sessions row's `session_id`.
 *   - We do NOT require a valid access token (those expire every 15min
 *     and the whole point of polling is to catch revoke FAST, not wait
 *     for the next refresh-rotation to surface the kick).
 *   - When the refresh cookie is missing or unparseable we return 200
 *     with `{active: false, reason: 'no_session'}` — the user is signed
 *     out by definition; no need to surface a kick toast.
 *
 * Read-only: no Mongo writes. Activity tracking lives on the refresh
 * endpoint which is hit every ~15min — frequent enough for the active-
 * sessions UI; this poll fires 100×+ more often and a write per poll
 * would dominate session-row IOPS at scale (spec §6.3).
 *
 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §6
 * ADR:  docs/adr/0028-single-session-enforcement.md
 * ══════════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { Sessions } from '$lib/database/mongo';
import { verifyRefreshToken } from '$lib/services/jwtService';
import logger from '$lib/server/logger';

/**
 * Map the persisted `revoke_reason` onto the smaller client-facing
 * `reason` union the kicked-toast UI cares about. Anything we don't
 * explicitly recognise collapses to `'logout'` — the toast copy reads
 * "You've been signed out" in that case which is correct for any
 * revoke shape we might add later.
 */
function mapReason(
	persisted: string | null | undefined
): 'kicked_by_new_login' | 'account_closed' | 'logout' {
	if (persisted === 'kicked_by_new_login') return 'kicked_by_new_login';
	if (persisted === 'account_closed') return 'account_closed';
	return 'logout';
}

// Note on response shape — intentional raw `Response(JSON.stringify(...))`
// throughout this handler (deviation from §15 apiOk/apiError convention).
// The client poller (sessionStatusPoller.svelte.ts) consumes a non-standard
// shape: `{revoked:{reason, at}}` on 401 and `{active:true}` / `{active:false,
// reason}` on 200 — none of which the `{success, data, error}` apiOk/apiError
// helpers can produce. End-verify workflow flagged this as info-level on
// 2026-06-05 (S225) and explicitly accepted.
export const GET: RequestHandler = async ({ cookies }) => {
	const refreshToken = cookies.get('refreshToken');
	if (!refreshToken) {
		// No cookie = no session. Client treats this as a no-op (no toast).
		return new Response(
			JSON.stringify({ active: false, reason: 'no_session' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const validation = verifyRefreshToken(refreshToken);
	if (!validation.valid || !validation.payload?.tokenId) {
		// Tampered or expired cookie. Treat as no-session — the user's
		// next page nav will redirect them through login normally.
		return new Response(
			JSON.stringify({ active: false, reason: 'invalid_token' }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	}

	const sessionId = validation.payload.tokenId;

	try {
		const row = await Sessions.findOne(
			{ session_id: sessionId },
			{ projection: { revoked_at: 1, revoke_reason: 1 } }
		);

		// No row = pre-SEC-10 session that was never recorded. Fail-open:
		// the user is functionally signed in (their access token still
		// works); we don't have evidence of revoke. Return active.
		if (!row || !row.revoked_at) {
			return new Response(
				JSON.stringify({ active: true }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const reason = mapReason(row.revoke_reason);
		logger.info(
			{
				event: 'session.poll_revoked',
				session_id: sessionId,
				reason
			},
			'session-status: poll returned 401'
		);

		return new Response(
			JSON.stringify({
				revoked: {
					reason,
					at: row.revoked_at instanceof Date
						? row.revoked_at.toISOString()
						: new Date(row.revoked_at).toISOString()
				}
			}),
			{ status: 401, headers: { 'Content-Type': 'application/json' } }
		);
	} catch (err) {
		// DB blip — fail-open. Returning 401 here would log the user out
		// every time Mongo hiccups, which is much worse than a delayed
		// kick. The next poll will retry.
		logger.warn(
			{ err, session_id: sessionId },
			'session-status: Sessions lookup failed — failing open'
		);
		return new Response(
			JSON.stringify({ active: true }),
			{ status: 200, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
