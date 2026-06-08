/**
 * GET /dashboard/admin/policies/registry-health
 * Admin dashboard for PMS key registry health. Runs the check at page load.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { runRegistryHealthCheck } from '$lib/server/pms/registryIntegrityChecker.js';
import { REGISTRY_CHANGELOG } from '$lib/config/pms/registryChangelog.js';
import { KEY_REGISTRY } from '$lib/config/pms/keyRegistry.js';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	const report = await runRegistryHealthCheck();

	// Recent changelog entries (last 20, newest first)
	const recentChangelog = [...REGISTRY_CHANGELOG]
		.reverse()
		.slice(0, 20)
		.map((entry) => ({ ...entry }));

	// Active keys grouped by product scope for the registry browser
	const activeKeys = KEY_REGISTRY
		.filter((k) => k.deprecatedAt === null)
		.map((k) => ({
			path: k.path,
			type: k.type,
			source: k.source,
			products: k.products,
			bindsTo: k.bindsTo,
			addedAt: k.addedAt
		}));

	const deprecatedKeys = KEY_REGISTRY
		.filter((k) => k.deprecatedAt !== null)
		.map((k) => ({
			path: k.path,
			deprecatedAt: k.deprecatedAt,
			deprecationReason: k.deprecationReason,
			replacedBy: k.replacedBy
		}));

	return {
		report: {
			...report,
			ranAt: report.ranAt.toISOString()
		},
		recentChangelog,
		activeKeys,
		deprecatedKeys
	};
};
