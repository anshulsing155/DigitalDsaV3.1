/**
 * POST /api/cron/process-unblocked-cases — RETIRED 2026-05-30
 * ══════════════════════════════════════════════════════════════════
 * Replaced by INLINE offer computation inside
 * `processBlockedCasesAfter` (src/lib/server/billing/quotaUnblock.ts).
 * The cron-based approach was over-architected — see
 * `recomputeOffersForUnblockedCase.ts` JSDoc for the full rationale.
 *
 * Original handler is recoverable from git history at the retirement
 * SHA. This stub exists ONLY because Vite/Rollup bundles every
 * `+server.ts` under src/routes/ — SvelteKit's `_archived_*` folder
 * prefix prevents URL registration but does NOT exclude the file
 * from the build graph (Pitfall #63).
 *
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
	return apiError(
		'This cron endpoint has been retired. Offer computation for quota-unblocked cases now runs inline inside processBlockedCasesAfter.',
		410
	);
};
