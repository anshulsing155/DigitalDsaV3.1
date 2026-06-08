/**
 * POST /api/billing/subscribe — RETIRED (legacy one-time subscription)
 * ══════════════════════════════════════════════════════════════════
 * Replaced by the D.1 recurring-subscription activate flow. The
 * original handler (Razorpay signature verify + server-side amount
 * check + DsaApplications subscription update + activation email +
 * notification) is recoverable from git history. This stub exists
 * only because Vite/Rollup bundles every `+server.ts` under
 * `src/routes/` — SvelteKit's `_archived_*` prefix prevents the URL
 * from registering but does NOT exclude the file from the build
 * graph. Keeping the file as a self-contained 410 stub makes it
 * immune to future deletions of symbols it used to import
 * (see Pitfall #63).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
	return apiError('Legacy one-time subscription activation has been retired.', 410);
};
