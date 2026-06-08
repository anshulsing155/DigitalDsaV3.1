/**
 * GET /api/billing/da-quota — RETIRED (DA quota now exposed via /api/billing/usage)
 * ══════════════════════════════════════════════════════════════════
 * The original handler (tier resolution + getUsageSummary lookup) is
 * recoverable from git history. This stub exists only because
 * Vite/Rollup bundles every `+server.ts` under `src/routes/` —
 * SvelteKit's `_archived_*` prefix prevents the URL from registering
 * but does NOT exclude the file from the build graph. Keeping the
 * file as a self-contained 410 stub makes it immune to future
 * deletions of symbols it used to import (see Pitfall #63).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const GET: RequestHandler = async () => {
	return apiError('DA quota endpoint has been retired.', 410);
};
