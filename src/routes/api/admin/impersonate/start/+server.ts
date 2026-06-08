/**
 * POST /api/admin/impersonate/start
 * Admin-only. Sets a signed impersonation cookie so the admin can navigate
 * the target user's dashboard as that user without needing their credentials.
 *
 * Body: { userId: string; role: 'dsa' | 'rm'; reason: string }
 * Returns: { targetName: string; targetRole: 'dsa' | 'rm'; redirectPath: string }
 *
 * Writes a PolicyAuditLogs row at start (action: 'impersonation_start'). The
 * exit endpoint pairs this with an 'impersonation_exit' row that records
 * session duration. Together they meet the consent+audit requirement in the
 * audit's Lens 13.
 */
import type { RequestHandler } from './$types';
import { apiOk, apiError, apiServerError, parseJsonBody } from '$lib/server/apiResponse.js';
import { requireRoleApi } from '$lib/server/guards.js';
import { rateLimit } from '$lib/server/rateLimiter.js';
import { DsaApplications, rmApplications, PolicyAuditLogs } from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';
import logger from '$lib/server/logger.js';
import {
	signImpersonationCookie,
	IMPERSONATION_COOKIE,
	IMPERSONATION_SESSION_MAX_AGE_SECONDS,
	type ImpersonationTargetRole
} from '$lib/server/adminImpersonation.js';
import { dev } from '$app/environment';

interface StartBody {
	userId: string;
	role: ImpersonationTargetRole;
	reason: string;
}

export const POST: RequestHandler = async ({ locals, request, cookies, getClientAddress }) => {
	const denied = requireRoleApi(locals, ['admin']);
	if (denied) return denied;

	// Defense-in-depth (review F1 2026-05-23): even though the endpoint is
	// admin-only and writes an audit-log row per invocation, cap repeated
	// invocations from a single admin so a compromised account can't burst
	// thousands of impersonations between detection and lockout. 30/hour is
	// generous for legitimate troubleshooting and tight enough to flag
	// anomalies. Pattern matches admin/policies/proxy-capture.
	const limited = await rateLimit(getClientAddress(), {
		maxRequests: 30,
		windowMs: 60 * 60 * 1000,
		identifier: `impersonate-start:${locals.user!.id}`
	});
	if (limited) return apiError('Too many impersonation requests. Please try again later.', 429);

	const body = await parseJsonBody<StartBody>(request);
	if (!body.ok) return body.response;

	const { userId, role, reason } = body.data;
	const trimmedReason = (reason || '').trim();

	// Shape guards. `role` constrained to dsa|rm — admin-impersonates-admin is
	// blocked at the type level; the runtime check refuses anything else.
	if (!userId || typeof userId !== 'string') {
		return apiError('userId is required', 400);
	}
	if (role !== 'dsa' && role !== 'rm') {
		return apiError('role must be "dsa" or "rm" (admin impersonation is not allowed)', 400);
	}
	if (!trimmedReason) {
		return apiError('reason is required', 400);
	}

	const adminId = locals.user!.id;
	if (userId === adminId) {
		return apiError('Cannot impersonate yourself', 400);
	}

	try {
		// Union of the two collections — TS types don't expose `is_suspended`
		// uniformly across DsaApplications / rmApplications even though the
		// field is present in both DB shapes (read via the suspend endpoint).
		// Narrow through a record cast for the unmodelled field.
		const collection = role === 'dsa' ? DsaApplications : rmApplications;
		const targetDoc = (await collection.findOne(
			{ _id: new ObjectId(userId) },
			{ projection: { name: 1, email: 1, is_suspended: 1 } }
		)) as (Record<string, unknown> & { name?: string }) | null;
		if (!targetDoc) return apiError('User not found', 404);
		if (targetDoc.is_suspended === true) {
			return apiError('Cannot impersonate a suspended user', 400);
		}

		const startedAt = Date.now();
		const cookieValue = signImpersonationCookie({
			adminId,
			targetId: userId,
			targetRole: role,
			startedAt
		});

		cookies.set(IMPERSONATION_COOKIE, cookieValue, {
			httpOnly: true,
			path: '/',
			maxAge: IMPERSONATION_SESSION_MAX_AGE_SECONDS,
			secure: !dev,
			sameSite: 'lax'
		});

		const targetName = targetDoc.name || (role === 'dsa' ? 'Unknown DSA' : 'Unknown RM');

		// Audit row at start. Pairs with the exit row written by /exit.
		await PolicyAuditLogs.insertOne({
			target_type: 'user',
			target_id: userId,
			action: 'impersonation_start',
			actor_id: adminId,
			actor_name: locals.user!.name || '',
			actor_role: 'admin',
			details: {
				targetName,
				targetRole: role,
				reason: trimmedReason,
				startedAt: new Date(startedAt)
			},
			created_at: new Date()
		} as any);

		logger.info(
			{ adminId, targetId: userId, targetRole: role },
			'Admin started user impersonation session'
		);

		const redirectPath = role === 'dsa' ? '/dashboard/dsa' : '/dashboard/rm';

		return apiOk({ targetName, targetRole: role, redirectPath });
	} catch (err) {
		return apiServerError(err, 'admin impersonate start');
	}
};
