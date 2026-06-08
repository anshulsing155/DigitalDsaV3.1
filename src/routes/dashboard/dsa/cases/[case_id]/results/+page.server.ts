/**
 * Results page — server load (THIN, post-CSR split 2026-06-03)
 * ═══════════════════════════════════════════════════════════════════════════
 * The heavy work (lender results snapshot + form snapshot decrypt +
 * versioned history + assessment data) moved to
 *   GET /api/cases/[case_id]/results-data
 * because the SvelteKit __data.json SSR fetch was 504-ing on Vercel
 * Hobby's 10s function ceiling (user-reported 2026-06-03).
 *
 * This load now does ZERO database work — it just passes URL params
 * through so the page can render the shell + skeleton instantly. The
 * +page.svelte mounts and calls the API client-side via fetch, with
 * loading/error/retry states for graceful 504 recovery.
 *
 * Parent layout data (caseData, dsaProfile, etc.) is still loaded
 * SSR-side from +layout.server.ts — that layout's own parallelization
 * keeps it under the function ceiling.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	return {
		caseId: params.case_id,
		// Echoed for diagnostic / future use; the +page.svelte reads its own
		// version query param via $page.url anyway.
		requestedVersion: url.searchParams.get('version')
	};
};
