/**
 * GET /api/admin/testing/coverage-report
 * ══════════════════════════════════════════════════════════════════
 * Returns E2E fill coverage analysis: how many form questions each
 * loan type has vs how many the payload mapping can produce answers for.
 * ══════════════════════════════════════════════════════════════════
 */

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoleApi, requireAdminPermission } from '$lib/server/guards.js';
import { generateCoverageReport } from '$lib/server/testing/coverageReport.js';
import { apiOk } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!dev) throw error(404, 'Not found');

	const denied = requireRoleApi(locals, 'admin');
	if (denied) return denied;
	const permDenied = requireAdminPermission(locals, 'rule_authoring');
	if (permDenied) return permDenied;

	const report = generateCoverageReport();
	return apiOk(report);
};
