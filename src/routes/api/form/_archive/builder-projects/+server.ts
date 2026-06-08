/**
 * POST /api/form/builder-projects — RETIRED (builder/promoter + project lookup)
 * ══════════════════════════════════════════════════════════════════
 * The original handler (authenticated city → builders → projects lookup,
 * gated by formGuard rate-limit + trust score) is recoverable from git
 * history at the retirement SHA (a04dcee7 — "chore: track all
 * _archive/ folders in git + landing-revamp WIP").
 *
 * This stub exists only because Vite/Rollup bundles every `+server.ts`
 * under `src/routes/` — SvelteKit's `_archive` prefix prevents the URL
 * from registering but does NOT exclude the file from the build graph.
 * Keeping the file as a self-contained 410 stub makes it immune to
 * future deletions of symbols it used to import (see Pitfall #63).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
	return apiError('Builder/project lookup endpoint has been retired.', 410);
};
