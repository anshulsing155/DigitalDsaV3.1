/**
 * POST /api/account/sessions/revoke-others
 * ══════════════════════════════════════════════════════════════════════
 * Sign out every device EXCEPT the calling one. Identifies the calling
 * device by the refresh-token cookie's tokenId claim — that session_id
 * is excluded from the bulk update.
 *
 * Defensive: if the refresh-token cookie is missing / unparseable, we
 * REJECT instead of revoking everything (since we couldn't reliably
 * spare the current session). User can retry on next page reload when
 * the cookie is back.
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
import { verifyRefreshToken } from '$lib/services/jwtService';
import logger from '$lib/server/logger';

async function resolveUserId(
	role: string,
	mobileNumber: string
): Promise<import('mongodb').ObjectId | null> {
	// Inline per role — see note in [session_id]/revoke for why.
	let doc: { _id: import('mongodb').ObjectId } | null = null;
	if (role === 'dsa') doc = await findUserByMobile(DsaApplications, mobileNumber);
	else if (role === 'rm') doc = await findUserByMobile(rmApplications, mobileNumber);
	else if (role === 'admin') doc = await findUserByMobile(AdminUsers, mobileNumber);
	else doc = await findUserByMobile(Applicant, mobileNumber);
	return doc?._id ?? null;
}

export const POST: RequestHandler = async ({ locals, cookies }) => {
	const authError = requireAuthApi(locals);
	if (authError) return authError;
	const sessionUser = locals.user!;

	const refreshCookie = cookies.get('refreshToken');
	const verified = refreshCookie ? verifyRefreshToken(refreshCookie) : null;
	const currentSessionId = verified?.valid ? (verified.payload?.tokenId ?? null) : null;

	if (!currentSessionId) {
		// Can't reliably spare the current session — reject the call.
		// The user's refresh-token cookie is missing or unparseable;
		// retrying after a refresh-token rotation should give them a
		// valid cookie + retry succeeds.
		return apiError(
			'Could not identify your current session. Please reload the page and try again.',
			400
		);
	}

	try {
		const role = sessionUser.activeRole ?? sessionUser.role ?? 'dsa';
		const userId = await resolveUserId(role, sessionUser.mobileNumber);
		if (!userId) return apiError('User profile not found', 404);

		const result = await Sessions.updateMany(
			{
				user_id: userId,
				session_id: { $ne: currentSessionId },
				revoked_at: { $exists: false }
			},
			{
				$set: {
					revoked_at: new Date(),
					revoke_reason: 'revoke_others'
				}
			}
		);

		logger.info(
			{
				user_id: String(userId),
				role,
				current_session_id: currentSessionId,
				revoked_count: result.modifiedCount
			},
			'[sessions] user revoked all other sessions'
		);

		return apiOk({ revoked: result.modifiedCount });
	} catch (err) {
		return apiServerError(err, 'Failed to revoke other sessions');
	}
};
