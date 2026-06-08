import type { RequestHandler } from './$types';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import { getTestingActivity } from '$lib/server/adminStats.js';

/**
 * GET /api/admin/testing-activity
 * Returns testing activity data for the admin home dashboard:
 * active rule artifacts, fixture / synthetic-profile counts,
 * and recent E2E test runs.
 *
 * Auth: admin role. The same data is also served via SSR in
 * /dashboard/admin/+page.server.ts using the shared getTestingActivity() helper.
 */
export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;

	try {
		const data = await getTestingActivity();
		return apiOk(data);
	} catch (err) {
		return apiServerError(err, 'Failed to load testing activity');
	}
};
