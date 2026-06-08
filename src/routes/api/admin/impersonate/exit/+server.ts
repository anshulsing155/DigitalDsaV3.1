/**
 * POST /api/admin/impersonate/exit
 * Clears the impersonation cookie and returns the admin to their own session.
 * Writes a PolicyAuditLogs row at exit (action: 'impersonation_exit') with
 * the session's actual duration computed from the cookie's `startedAt`.
 *
 * No body required.
 * Returns: { ok: true }
 *
 * Auth: requireAuthApi only (NOT requireRoleApi('admin')) — when impersonating,
 * locals.user.role is 'dsa'/'rm', so an admin role check would block the very
 * session trying to exit. The action is benign (deletes a cookie); the auth
 * check exists to keep this consistent with project rule #12 ("always use
 * guards") and so we log unexpected callers.
 */
import type { RequestHandler } from './$types';
import { apiOk } from '$lib/server/apiResponse.js';
import { requireAuthApi } from '$lib/server/guards.js';
import {
	IMPERSONATION_COOKIE,
	verifyImpersonationCookie
} from '$lib/server/adminImpersonation.js';
import { PolicyAuditLogs } from '$lib/database/mongo.js';
import logger from '$lib/server/logger.js';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	const denied = requireAuthApi(locals);
	if (denied) return denied;

	const adminActingAs = locals.adminActingAs;
	// Read + verify the cookie BEFORE deleting it so we have `startedAt` for the
	// audit row's duration calculation. Verify (not just decode) so a tampered
	// cookie can't fake a long duration in the audit log.
	const rawCookie = cookies.get(IMPERSONATION_COOKIE);
	const payload = rawCookie ? verifyImpersonationCookie(rawCookie) : null;

	cookies.delete(IMPERSONATION_COOKIE, { path: '/' });

	if (adminActingAs && payload) {
		const now = Date.now();
		const durationMs = Math.max(0, now - payload.startedAt);

		try {
			await PolicyAuditLogs.insertOne({
				target_type: 'user',
				target_id: payload.targetId,
				action: 'impersonation_exit',
				actor_id: adminActingAs.id,
				actor_name: adminActingAs.name || '',
				actor_role: 'admin',
				details: {
					targetRole: payload.targetRole,
					targetName: locals.user?.name || '',
					startedAt: new Date(payload.startedAt),
					endedAt: new Date(now),
					durationMs
				},
				created_at: new Date()
			} as any);
		} catch (auditErr) {
			// Audit failure is non-fatal — the cookie is already cleared and the
			// admin needs to exit cleanly. Log loudly so the gap can be investigated.
			logger.error(
				{ err: auditErr, adminId: adminActingAs.id, targetId: payload.targetId },
				'Failed to write impersonation_exit audit row'
			);
		}

		logger.info(
			{ adminId: adminActingAs.id, targetId: payload.targetId, durationMs },
			'Admin exited user impersonation session'
		);
	} else {
		// Caller authenticated but had no active impersonation. Worth logging —
		// could be a stale cookie cleanup, or a sign of confused client state.
		logger.warn(
			{ userId: locals.user?.id, role: locals.user?.role },
			'Impersonation exit called with no active session'
		);
	}

	return apiOk({ ok: true });
};
