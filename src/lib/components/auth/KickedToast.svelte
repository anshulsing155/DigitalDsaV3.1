<script lang="ts">
	/**
	 * KickedToast — SEC-10 Commit C kicked-side surface
	 * ══════════════════════════════════════════════════════════════════
	 * Despite the name (preserved for lock-test stability), this is a
	 * centered, full-overlay modal — NOT a corner toast. Owner direction
	 * 2026-06-05: the kick notice must dominate the screen so the user
	 * can't miss it during the 5-second window before redirect to /.
	 *
	 * Renders when /api/auth/session-status returns 401 with a `revoked`
	 * payload. Caller owns when to mount; auto-dismisses via the parent's
	 * setTimeout (KICKED_REDIRECT_DELAY_MS in sessionStatusPoller).
	 *
	 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §7.2
	 * ══════════════════════════════════════════════════════════════════
	 */

	interface Props {
		/** Which revoke shape we got from the poll. Drives the body copy. */
		reason: 'kicked_by_new_login' | 'account_closed' | 'logout';
		/** Optional ISO timestamp from the poll payload. Currently unused
		 *  in the body but kept on the contract so a future spec rev can
		 *  add "X minutes ago" without changing the prop shape. */
		at?: string;
	}

	const { reason }: Props = $props();

	const headline = $derived.by(() => {
		if (reason === 'kicked_by_new_login') return 'Signed in on another device';
		if (reason === 'account_closed') return 'Account closed';
		return "You've been signed out";
	});

	const body = $derived.by(() => {
		if (reason === 'kicked_by_new_login') {
			return 'You have logged in on another device. Logging out from here.';
		}
		if (reason === 'account_closed') {
			return 'This account is closed. Sign in again to restore it within 30 days.';
		}
		return 'Your session has ended. Sign in again to continue.';
	});
</script>

<!-- Full-screen overlay. Centered card. z-index high enough to sit above
     every other modal, toast, banner, and command palette this app
     renders (the dashboard's ConfirmModal sits at z-50). -->
<div
	role="alertdialog"
	aria-live="assertive"
	aria-labelledby="kicked-headline"
	aria-describedby="kicked-body"
	class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4"
	data-testid="kicked-modal"
>
	<div
		class="w-full max-w-md rounded-xl border border-amber-300 bg-amber-50 p-6 text-center shadow-2xl dark:border-amber-700/60 dark:bg-amber-950"
	>
		<!-- Amber-tinted icon ring — attention, not destructive. -->
		<div
			class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-6 w-6 text-amber-600 dark:text-amber-300"
				aria-hidden="true"
			>
				<path d="M12 9v4" />
				<path
					d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
				/>
				<path d="M12 17h.01" />
			</svg>
		</div>

		<h2
			id="kicked-headline"
			class="text-lg font-bold text-amber-900 dark:text-amber-100"
		>
			{headline}
		</h2>
		<p id="kicked-body" class="mt-2 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
			{body}
		</p>
		<p class="mt-4 text-xs text-amber-700 dark:text-amber-300">
			Redirecting to the home page…
		</p>
	</div>
</div>
