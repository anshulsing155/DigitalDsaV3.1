/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical: restoreApplicantIntent.svelte.ts)
 * - No active imports in new code
 * - Kept for backward compatibility only
 *
 * For new code: Import directly from '$lib/stores/restoreApplicantIntent.svelte'
 * To restore: git mv src/lib/stores/_archive/legacy-shims/restoreApplicantIntent.ts src/lib/stores/restoreApplicantIntent.ts
 * To verify no imports: grep -r "from.*stores/restoreApplicantIntent\.ts" src/
 */

/**
 * Restore Applicant Intent — backward-compatible bridge
 * ══════════════════════════════════════════════════════════════════
 * Re-exports from the canonical runes state in restoreApplicantIntent.svelte.ts.
 * ══════════════════════════════════════════════════════════════════
 */

export type { RestoreIntentMatch, RestoreIntent } from './restoreApplicantIntent.svelte';
export { restoreIntentState } from './restoreApplicantIntent.svelte';

import { fromRune } from './_bridge.svelte';
import { restoreIntentState } from './restoreApplicantIntent.svelte';
import type { RestoreIntent } from './restoreApplicantIntent.svelte';

/** Legacy writable bridge for $restoreApplicantIntent syntax */
export const restoreApplicantIntent = fromRune(
	() =>
		({
			open: restoreIntentState.open,
			currentIndex: restoreIntentState.currentIndex,
			matches: restoreIntentState.matches,
			detectionKey: restoreIntentState.detectionKey
		}) as RestoreIntent,
	(v: RestoreIntent) => {
		restoreIntentState.set(v);
	}
);
