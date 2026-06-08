import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { getAccountStats } from '$lib/server/adminStats.js';

/**
 * GET /api/admin/account-stats
 * Returns account status counts for DSA-only platform.
 *
 * Active collections hold live accounts. Deleted accounts live in the
 * deleted* archive collections. "Inactive" = active-collection user
 * with lastActiveAt > 180 days ago (or never set).
 *
 * Auth: admin role + user_management permission. The same data is also
 * served via SSR in /dashboard/admin/+page.server.ts using the shared
 * getAccountStats() helper.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'user_management');
	if (permDenied) return permDenied;

	try {
		const data = await getAccountStats();
		return apiOk(data);
	} catch (err) {
		return apiServerError(err, 'Failed to fetch account stats');
	}
};
