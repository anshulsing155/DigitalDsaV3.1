/**
 * /dashboard/admin — SSR load
 * ══════════════════════════════════════════════════════════════════
 * PERF-1 #3: closes the last remaining onMount-fetch dashboard. The
 * page previously made two `/api/admin/*` round-trips from client-side
 * Promise.all, leaving the dashboard blank for 300-800ms after first
 * paint. Now ships both payloads via SSR.
 *
 * Permission split:
 *   - admin role required for the page itself
 *   - user_management permission required for account stats (graceful
 *     degradation: admins without it still see testing activity, plus
 *     an inline notice that stats are gated)
 *   - testing activity is admin-wide, no extra permission needed
 *
 * Each helper is wrapped independently so a failure in one section
 * doesn't blank the other.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { getAccountStats, getTestingActivity } from '$lib/server/adminStats.js';
import logger from '$lib/server/logger.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	const hasUserManagementPerm =
		locals.isSuperAdmin || locals.adminPermissions?.user_management === true;

	// Run both queries in parallel where permitted; allSettled so one
	// failure (or a permission gate) doesn't blank the other tile.
	const [statsResult, testingResult] = await Promise.allSettled([
		hasUserManagementPerm ? getAccountStats() : Promise.resolve(null),
		getTestingActivity()
	]);

	let stats: Awaited<ReturnType<typeof getAccountStats>> | null = null;
	let statsError: string | null = null;
	if (statsResult.status === 'fulfilled') {
		stats = statsResult.value;
	} else {
		logger.error({ err: statsResult.reason }, 'admin dashboard: getAccountStats failed');
		statsError = 'Failed to load account stats';
	}
	if (!hasUserManagementPerm) {
		statsError = 'Stats require user_management permission';
	}

	let testingActivity: Awaited<ReturnType<typeof getTestingActivity>> | null = null;
	let testingError: string | null = null;
	if (testingResult.status === 'fulfilled') {
		testingActivity = testingResult.value;
	} else {
		logger.error({ err: testingResult.reason }, 'admin dashboard: getTestingActivity failed');
		testingError = 'Failed to load testing activity';
	}

	return {
		stats,
		statsError,
		testingActivity,
		testingError
	};
};
