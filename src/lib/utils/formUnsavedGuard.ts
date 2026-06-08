/**
 * Form Unsaved Changes Guard
 * ══════════════════════════════════════════════════════════════════
 * Warns users before they navigate away from a form with unsaved changes.
 *
 * Two layers of protection:
 *   1. `beforeunload` — browser tab close, external navigation, refresh
 *   2. `beforeNavigate` — SvelteKit in-app navigation (back button, links)
 *
 * Usage in form pages (with themed modal):
 *   onMount(() => {
 *     const guard = setupUnsavedGuard(
 *       () => formState.isDirty && !isSubmitting,
 *       (onProceed) => dialogState.openConfirmModal(
 *         'Unsaved Changes',
 *         'You have unsaved progress on this form. Leaving now will discard your current page entries.',
 *         onProceed,
 *         { confirmLabel: 'Leave anyway', cancelLabel: 'Stay on page' }
 *       )
 *     );
 *     return () => guard.destroy();
 *   });
 * ══════════════════════════════════════════════════════════════════
 */

import { browser } from '$app/environment';
import { beforeNavigate, goto } from '$app/navigation';

/**
 * Set up unsaved changes protection for a form page.
 *
 * @param hasUnsavedChanges - Returns true when the user has unsaved work.
 * @param showModal - Optional callback to show a themed modal instead of the
 *   browser's native `window.confirm`. Receives `onProceed` — call it when
 *   the user confirms they want to leave.
 */
export function setupUnsavedGuard(
	hasUnsavedChanges: () => boolean,
	showModal?: (onProceed: () => void) => void
) {
	if (!browser) return { destroy: () => {} };

	// Bypass flag: set to true right before we programmatically re-navigate
	// after the user confirms, so the next beforeNavigate call doesn't intercept.
	let allowNextNav = false;

	// ── Layer 1: Browser-level protection (tab close, refresh, external nav) ──
	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (hasUnsavedChanges()) {
			e.preventDefault();
			// Modern browsers ignore custom messages but still show the dialog
		}
	}
	window.addEventListener('beforeunload', onBeforeUnload);

	// ── Layer 2: SvelteKit in-app navigation (back button, sidebar links) ──
	beforeNavigate(({ cancel, to }) => {
		if (!to) return;

		// If we set the bypass flag, consume it and let navigation proceed
		if (allowNextNav) {
			allowNextNav = false;
			return;
		}

		if (!hasUnsavedChanges()) return;

		// Don't block navigation to the evaluating page (form submitted successfully)
		if (to.url.pathname === '/evaluating') return;

		// beforeNavigate requires cancel() to be called synchronously — do it first,
		// then show the modal. If the user confirms, we re-navigate programmatically.
		cancel();

		const destination = to.url.href;

		if (showModal) {
			showModal(() => {
				allowNextNav = true;
				goto(destination);
			});
		} else {
			// Fallback for callers that haven't wired up a themed modal yet
			if (window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
				allowNextNav = true;
				goto(destination);
			}
		}
	});

	return {
		destroy() {
			window.removeEventListener('beforeunload', onBeforeUnload);
			// Note: beforeNavigate is automatically scoped to the component
			// lifecycle by SvelteKit — no manual cleanup needed for it.
		}
	};
}
