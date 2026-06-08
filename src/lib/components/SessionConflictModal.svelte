<script lang="ts">
	/**
	 * SEC-10 — Session conflict resolution modal.
	 * ──────────────────────────────────────────────────────────────────────
	 * Shown by the login flow when /api/auth/check-dsa responds with
	 * { status: 'session_conflict', existing_sessions, pending_login_token }.
	 * The user picks which of their other sessions to sign out, then the
	 * caller posts kick_session_ids to /api/auth/login-confirm.
	 *
	 * Controlled component — props-driven (NOT the global ConfirmModal
	 * dialogState queue). The login page manages open-state locally; the
	 * modal calls onConfirm / onCancel and the page handles the POST +
	 * navigation.
	 *
	 * Accessibility:
	 *   - <dialog> element with showModal() so it's focus-trapped + Esc-able
	 *     by the browser, matching ConfirmModal pattern
	 *   - aria-labelledby + aria-describedby for screen readers
	 *   - Each session row has its own checkbox label association
	 *
	 * Spec: docs/specs/SINGLE-SESSION-ENFORCEMENT-SPEC.md §7.1
	 */
	import { X, AlertTriangle, Laptop, Globe } from '$lib/utils/iconRegistry';
	import type { ExistingSessionDigest } from '$lib/server/auth/sessionConflict';

	interface Props {
		open: boolean;
		/** From check-dsa session_conflict response. */
		existingSessions: ExistingSessionDigest[];
		/** Called with the subset of session IDs the user chose to kick. */
		onConfirm: (kickSessionIds: string[]) => void;
		/** Called on Escape / X / backdrop click / explicit Cancel. */
		onCancel: () => void;
		/** Disables the action buttons while the parent's POST is in flight. */
		busy?: boolean;
	}

	let { open, existingSessions, onConfirm, onCancel, busy = false }: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;

	/**
	 * Per-session selection state. Defaults: every row checked, because
	 * "Continue here" most naturally means "kick all the others". User
	 * can untick individual rows to keep specific sessions alive.
	 *
	 * Keyed on session_id (= Sessions.session_id = refresh JWT tokenId).
	 * Re-derives whenever `existingSessions` changes (e.g. modal re-opened
	 * for a different conflict).
	 */
	let selectedById: Record<string, boolean> = $state({});
	$effect(() => {
		const next: Record<string, boolean> = {};
		for (const s of existingSessions) next[s.id] = true;
		selectedById = next;
	});

	const checkedCount = $derived(
		Object.values(selectedById).filter(Boolean).length
	);

	// Dialog open/close + focus management. Mirrors ConfirmModal's pattern.
	$effect(() => {
		const el = dialog;
		if (!el) return;

		if (open && !el.open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			el.showModal();
		} else if (!open && el.open) {
			el.close();
			previouslyFocused?.focus?.();
			previouslyFocused = null;
		}
	});

	function handleConfirm() {
		if (busy) return;
		const kickIds = Object.entries(selectedById)
			.filter(([, v]) => v)
			.map(([id]) => id);
		onConfirm(kickIds);
	}

	function handleCancel() {
		if (busy) return;
		onCancel();
	}

	/**
	 * Format "last active" as a human-friendly relative time. Falls back
	 * to a parseable ISO string if Date math fails (e.g. malformed input).
	 */
	function relativeTime(iso: string): string {
		try {
			const then = new Date(iso).getTime();
			const now = Date.now();
			const seconds = Math.max(0, Math.floor((now - then) / 1000));
			if (seconds < 60) return 'just now';
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
			const days = Math.floor(hours / 24);
			return `${days} day${days === 1 ? '' : 's'} ago`;
		} catch {
			return iso;
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="session-conflict-dialog"
	onclose={handleCancel}
	onclick={(e) => {
		if (e.target === dialog) handleCancel();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') handleCancel();
	}}
	aria-modal="true"
	role="alertdialog"
	aria-labelledby="session-conflict-title"
	aria-describedby="session-conflict-message"
>
	{#if open}
		<div
			class="animate-zoom relative w-full overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl"
		>
			<!-- Top accent strip — amber to signal "attention, not destructive" -->
			<div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-amber-500 to-orange-400"></div>

			<div class="p-6">
				<!-- Close button -->
				<button
					onclick={handleCancel}
					disabled={busy}
					class="absolute top-4 right-3 z-10 cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors duration-150 hover:text-[var(--form-text)] disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Close"
				>
					<X size={18} />
				</button>

				<!-- Header -->
				<div class="flex items-start gap-3 pr-8">
					<div class="mt-0.5 shrink-0 rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
						<AlertTriangle size={20} class="text-amber-500" />
					</div>
					<div class="min-w-0 flex-1">
						<h2
							id="session-conflict-title"
							class="text-labelQuestion font-titleBold !m-0 text-[var(--form-text-label)]"
						>
							You're already signed in
						</h2>
						<p
							id="session-conflict-message"
							class="mt-2 descriptionText !m-0 text-[var(--form-text-muted)]"
						>
							Your DigitalDSA account is open elsewhere. Choose which sessions to
							sign out before continuing here.
						</p>
					</div>
				</div>

				<!-- Policy callout — short, plain-English explanation of the rule
				     (Risk R2 in the spec: incognito counts as a separate browser;
				     extra tabs in the same browser don't trigger this modal). -->
				<div
					class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/40 dark:bg-amber-900/20"
				>
					<p class="tinyText !m-0 text-amber-900 dark:text-amber-100">
						<strong>One active session per account.</strong> Multiple tabs in the
						same browser don't count — only separate browsers or devices do.
					</p>
				</div>

				<!-- Existing sessions list -->
				<ul class="mt-5 space-y-2" role="list">
					{#each existingSessions as session (session.id)}
						<li>
							<label
								class="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--form-border)] p-3 hover:bg-[var(--form-bg-alt)]"
							>
								<input
									type="checkbox"
									bind:checked={selectedById[session.id]}
									disabled={busy}
									class="h-4 w-4 shrink-0 cursor-pointer accent-[var(--ddsa-primary-500)]"
									aria-label={`Sign out ${session.ua_summary}`}
								/>
								<div class="shrink-0 rounded-md bg-stone-100 p-1.5 dark:bg-stone-700">
									{#if session.conflict_type === 'device'}
										<Laptop size={16} class="text-stone-600 dark:text-stone-300" />
									{:else}
										<Globe size={16} class="text-stone-600 dark:text-stone-300" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="smallText font-titleMedium text-[var(--form-text-label)]">
										{session.ua_summary}
									</div>
									<div class="tinyText text-[var(--form-text-muted)]">
										Last active: {relativeTime(session.last_seen_at)}
										<span class="ml-2 inline-flex items-center rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-600 dark:bg-stone-800 dark:text-stone-400">
											{session.conflict_type}
										</span>
									</div>
								</div>
							</label>
						</li>
					{/each}
				</ul>

				<!-- Selection summary — invisible when all are checked (the default) -->
				{#if checkedCount < existingSessions.length}
					<div class="mt-3 tinyText text-[var(--form-text-muted)]">
						{checkedCount} of {existingSessions.length} session{existingSessions.length === 1
							? ''
							: 's'} will be signed out.
					</div>
				{/if}

				<!-- Actions -->
				<div class="mt-6 flex flex-wrap justify-end gap-3">
					<button
						onclick={handleCancel}
						disabled={busy}
						class="cursor-pointer rounded-xl border border-[var(--form-border)] px-4 py-2.5 buttonText text-[var(--form-text-label)] hover:bg-[var(--form-bg-alt)] disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onclick={handleConfirm}
						disabled={busy}
						class="cursor-pointer rounded-xl bg-[var(--ddsa-primary-500)] px-4 py-2.5 buttonText text-[var(--bg-header-text)] hover:bg-[var(--ddsa-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
					>
						{busy ? 'Signing in...' : 'Continue here'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.session-conflict-dialog {
		border: none;
		max-width: 92vw;
		width: 30rem;
		background: transparent;
		padding: 0;
		margin: auto;
	}

	.session-conflict-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	@keyframes zoomIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-zoom {
		animation: zoomIn 0.2s ease-out;
	}
</style>
