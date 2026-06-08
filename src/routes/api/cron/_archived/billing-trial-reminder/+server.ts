/**
 * POST /api/cron/billing-trial-reminder — RETIRED (legacy trial reminder cron)
 * ══════════════════════════════════════════════════════════════════
 * Replaced by the D.1 recurring-subscription dunning + reminder flow.
 * The original handler (DsaApplications lookup + reminder email send,
 * protected by CRON_SECRET) is recoverable from git history at the
 * retirement SHA (ba3fdab2 — "chore(d.1 s8 skip): archive legacy
 * one-time-pay routes").
 *
 * This stub exists only because Vite/Rollup bundles every `+server.ts`
 * under `src/routes/` — SvelteKit's `_archived` prefix prevents the URL
 * from registering but does NOT exclude the file from the build graph.
 * Keeping the file as a self-contained 410 stub makes it immune to
 * future deletions of symbols it used to import (see Pitfall #63).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
	return apiError('Legacy billing trial reminder cron has been retired.', 410);
};
