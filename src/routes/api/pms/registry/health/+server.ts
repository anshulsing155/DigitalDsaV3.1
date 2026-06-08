/**
 * GET /api/pms/registry/health
 * Run the registry integrity check on demand and return the report.
 * Admin-gated. Used by the admin registry-health dashboard.
 */

import type { RequestHandler } from './$types';
import { requireRoleApi } from '$lib/server/guards.js';
import { apiOk, apiServerError } from '$lib/server/apiResponse.js';
import logger from '$lib/server/logger.js';
import { runRegistryHealthCheck } from '$lib/server/pms/registryIntegrityChecker.js';

export const GET: RequestHandler = async ({ locals }) => {
	const guard = requireRoleApi(locals, 'admin');
	if (guard) return guard;

	try {
		const report = await runRegistryHealthCheck();

		// Serialize Dates for JSON transport
		return apiOk({
			...report,
			ranAt: report.ranAt.toISOString()
		});
	} catch (err) {
		logger.error({ err }, 'GET /api/pms/registry/health failed');
		return apiServerError('Failed to run registry health check');
	}
};
