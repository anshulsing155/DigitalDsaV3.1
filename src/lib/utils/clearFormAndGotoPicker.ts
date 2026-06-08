/**
 * Clear Form → Loan Picker — defensive navigation helper
 * ══════════════════════════════════════════════════════════════════
 * Wipes ALL form state and navigates the user back to the loan picker
 * (`/form/how-can-we-help`).
 *
 * Why this helper exists: the per-loan-page `clearFormAndRedirect`
 * pattern that lived inline in 6 loan pages would sometimes leave the
 * user on a blank page (team report 2026-05-18). Symptom: form state
 * cleared, but the URL didn't change — `goto()` was being silently
 * canceled by a `beforeNavigate` guard reading stale `formState.isDirty`,
 * OR by a different guard (e.g. loanRouteGuard). After `formState.reset()`
 * the page rendered against empty state — completely blank.
 *
 * Fix: await the `goto`, then check if the URL actually changed. If not,
 * force a hard navigation via `window.location.href`. The user just
 * confirmed a destructive clear — a cold reload is acceptable and beats
 * leaving them stuck.
 *
 * Usage:
 *   import { clearFormAndGotoPicker } from '$lib/utils/clearFormAndGotoPicker';
 *   ...
 *   dialogState.openConfirmModal('Clear this form?', '...', async () => {
 *     dialogState.closeConfirmModal();
 *     await clearFormAndGotoPicker();
 *   }, { confirmLabel: 'Clear form', cancelLabel: 'Cancel' });
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { formState } from '$lib/state/form.svelte';
import { clearAllRelationships } from '$lib/components/relationship-capture/relationshipStore';
import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
import { ROUTES } from '$lib/config/routes';

const PICKER_PATH = ROUTES.FORM.HOW_CAN_WE_HELP;

export async function clearFormAndGotoPicker(): Promise<void> {
	// Wipe all state. `formState.reset()` sets isDirty=false from inside
	// the class so the unsavedGuard's beforeNavigate sees clean state on
	// the upcoming goto.
	formState.reset();
	clearAllRelationships();
	incomeProfileStore.clearAll();

	try {
		await goto(PICKER_PATH, { replaceState: true, invalidateAll: true });
	} catch {
		// goto can throw if a beforeNavigate hook cancels. Fall through to
		// the hard-reload fallback below.
	}

	// Fallback — if we're still on the original URL after goto resolved,
	// force a hard navigation. The user just confirmed a destructive clear,
	// so a cold reload is acceptable and prevents the "blank page" trap.
	if (browser && !window.location.pathname.endsWith(PICKER_PATH)) {
		window.location.href = PICKER_PATH;
	}
}
