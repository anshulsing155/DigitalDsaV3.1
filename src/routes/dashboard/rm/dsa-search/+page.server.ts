/**
 * /dashboard/rm/dsa-search — SSR load
 * ══════════════════════════════════════════════════════════════════
 * PERF-1 migration: the preferred-DSA list previously loaded via
 * `onMount(async () => fetch('/api/rm/preferred-dsas'))`, costing a
 * post-paint round-trip with a "loading" gap. Now ships in the SSR
 * payload so the page renders with the correct star icons on first
 * paint.
 *
 * Search itself remains client-driven — it's user-initiated, can't be
 * pre-computed at SSR time.
 * ══════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards.js';
import { getPreferredDsaIds } from '$lib/server/rmHelpers.js';
import logger from '$lib/server/logger.js';

export const load: PageServerLoad = async ({ locals }) => {
	// requireRole throws a 302 → /login on missing auth, 403 on wrong role.
	// The page layout already enforces RM-only access, but the redirect-on-throw
	// behaviour is what makes load functions safe — no risk of leaking data.
	requireRole(locals, 'rm');

	try {
		const preferredDsaIds = await getPreferredDsaIds(locals.user!);
		return { preferredDsaIds };
	} catch (err) {
		// Empty list is the safe default — page degrades gracefully (star
		// icons all show "not preferred" until a mutation toggles them).
		logger.error({ err }, 'dsa-search: getPreferredDsaIds failed');
		return { preferredDsaIds: [] };
	}
};
