/**
 * POST /api/billing/da-topup — RETIRED 2026-05-28
 * ══════════════════════════════════════════════════════════════════
 * Top-up purchases were removed in commit 1aeb988c. This stub is kept
 * on disk per the no-delete rule; the original handler (Razorpay
 * signature verify + purchaseTopup call) is recoverable from git
 * history at that SHA. The folder `_archived_*` prefix prevents
 * SvelteKit from registering a URL for this route, but Vite/Rollup
 * still bundles every `+server.ts` under src/routes/, so the file
 * must compile on its own — the previous revision imported
 * `purchaseTopup` from daQuota.ts, which was deleted, breaking
 * Vercel's production build. This stub responds 410 Gone if anything
 * ever reaches it (it can't, but defense in depth).
 * ══════════════════════════════════════════════════════════════════
 */

import type { RequestHandler } from './$types';
import { apiError } from '$lib/server/apiResponse.js';

export const POST: RequestHandler = async () => {
	return apiError('Document Assessment top-up packs have been retired.', 410);
};
