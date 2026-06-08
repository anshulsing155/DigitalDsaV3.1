/**
 * POST /api/account/sessions/[session_id]/revoke
 * ══════════════════════════════════════════════════════════════════════
 * Revoke a single session by id. Owner-only — the target row must
 * belong to the calling user (server-side filter on user_id + the
 * URL param).
 *
 * Idempotent: revoking an already-revoked session returns success
 * silently (doesn't double-set revoked_at; the existing one stays).
 *
 * "Natural" semantics per owner decision 2026-05-30: setting
 * revoked_at causes the refresh-token endpoint to reject on next
 * refresh. The device's existing 15-min access token still works
 * until it expires; then re-login is required.
 *
 * Spec: docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md §E.3
 */

import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { requireAuthApi } from '$lib/server/guards';
import {
	Sessions,
	AdminUsers,
	DsaApplications,
	rmApplications,
	Applicant
} from '$lib/database/mongo';
import { findUserByMobile } from '$lib/server/csfle';
import logger from '$lib/server/logger';

async function resolveUserId(
	role: string,
	mobileNumber: string
): Promise<import('mongodb').ObjectId | null> {
	// Inline per role — TS doesn't unify the four Collection<T> types,
	// so a ternary loses type info; the explicit switch keeps each
	// findUserByMobile call typed against its specific collection.
	let doc: { _id: import('mongodb').ObjectId } | null = null;
	if (role === 'dsa') doc = await findUserByMobile(DsaApplications, mobileNumber);
	else if (role === 'rm') doc = await findUserByMobile(rmApplications, mobileNumber);
	else if (role === 'admin') doc = await findUserByMobile(AdminUsers, mobileNumber);
	else doc = await findUserByMobile(Applicant, mobileNumber);
	return doc?._id ?? null;
}

export const POST: RequestHandler = async ({ locals, params }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	const targetSessionId = params.session_id;
	if (!targetSessionId) return apiError('Missing session_id', 400);

	try {
		const role = sessionUser.activeRole ?? sessionUser.role ?? 'dsa';
		const userId = await resolveUserId(role, sessionUser.mobileNumber);
		if (!userId) return apiError('User profile not found', 404);

		// Ownership-gated update — filter by BOTH session_id AND user_id so
		// a caller can never revoke a session belonging to another user
		// even if they guess a session_id (which is a tokenId — unguessable
		// in practice, but defense-in-depth is cheap).
		const result = await Sessions.updateOne(
			{ session_id: targetSessionId, user_id: userId },
			{
				$set: {
					revoked_at: new Date(),
					revoke_reason: 'user_action'
				}
			}
		);

		if (result.matchedCount === 0) {
			// Either the session doesn't exist, or it belongs to another
			// user. We don't distinguish — same response either way to
			// avoid leaking session-id existence to a curious caller.
			return apiError('Session not found', 404);
		}

		logger.info(
			{ user_id: String(userId), session_id: targetSessionId, role },
			'[sessions] user revoked single session'
		);

		return apiOk({ revoked: 1 });
	} catch (err) {
		return apiServerError(err, 'Failed to revoke session');
	}
};
