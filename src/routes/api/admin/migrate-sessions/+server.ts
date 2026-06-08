import type { RequestHandler } from './$types';
import { FormSessions } from '$lib/database/mongo.js';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';

/**
 * POST /api/admin/migrate-sessions
 *
 * One-time migration to deactivate all existing FormSessions after schema restructuring.
 * Restructured schemas changed page indices, making existing maxPageReached values invalid.
 * Users get fresh sessions on next form visit. Answer data in sessionStorage (keyed by
 * field name) is unaffected.
 *
 * Requires admin role. Idempotent — safe to run multiple times.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;

	try {
		const result = await FormSessions.updateMany(
			{ isActive: true },
			{
				$set: {
					isActive: false,
					flagReason: 'schema_migration',
					deactivatedAt: new Date()
				}
			}
		);

		return apiOk({
			deactivated: result.modifiedCount,
			message: `Deactivated ${result.modifiedCount} active form session(s). Users will get fresh sessions on next form visit.`
		});
	} catch (err) {
		return apiServerError(err, 'Failed to deactivate sessions');
	}
};

/**
 * GET /api/admin/migrate-sessions
 * Check how many active sessions would be affected.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;

	const activeCount = await FormSessions.countDocuments({ isActive: true });
	const migratedCount = await FormSessions.countDocuments({ flagReason: 'schema_migration' });

	return apiOk({
		activeSessions: activeCount,
		alreadyMigrated: migratedCount,
		message:
			activeCount > 0
				? `${activeCount} active session(s) will be deactivated on POST.`
				: 'No active sessions to migrate.'
	});
};
