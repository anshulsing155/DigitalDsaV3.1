<script lang="ts">
	import { dialogState } from '$lib/state/dialog.svelte';
	import { X, AlertTriangle, Info, Send, Pencil } from '$lib/utils/iconRegistry';
	import { generateId } from '$lib/utils.js';
	import { afterNavigate } from '$app/navigation';

	let dialog: HTMLDialogElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;
	const modalId = generateId();

	// Route change = dismissal. `dialogState.confirmModal` is a module-level
	// singleton; without this, navigating away (browser back/forward button,
	// internal `goto()`, link click) leaves the modal floating over the new
	// page. Pitfall #39 covered Escape / X / backdrop dismissals via the
	// modal's own DOM events — but those events don't fire when SvelteKit
	// transitions routes client-side. afterNavigate runs once per nav and
	// dismissConfirmModal is idempotent (no-ops if state is already closed,
	// so an in-modal `onConfirm` that calls `goto()` doesn't double-fire).
	afterNavigate(() => {
		dialogState.dismissConfirmModal();
	});

	// Derived from rune state directly (no store bridge). `onCancel` is read
	// inside dialogState.dismissConfirmModal so it isn't surfaced here.
	const isOpen = $derived(dialogState.confirmModal.open);
	const title = $derived(dialogState.confirmModal.title);
	const message = $derived(dialogState.confirmModal.message);
	const onConfirm = $derived(dialogState.confirmModal.onConfirm);
	const confirmLabel = $derived(dialogState.confirmModal.confirmLabel);
	const cancelLabel = $derived(dialogState.confirmModal.cancelLabel);

	// Optional fields from the redesign (LEND-1 stack pop, 2026-06-02).
	// All undefined-by-default — existing callers continue to render the
	// legacy 2-button confirm modal unchanged.
	const icon = $derived(dialogState.confirmModal.icon);
	const badge = $derived(dialogState.confirmModal.badge);
	const footerNote = $derived(dialogState.confirmModal.footerNote);
	const secondaryAction = $derived(dialogState.confirmModal.secondaryAction);

	// Determine icon based on title keywords (legacy heuristic — applied only
	// when no explicit `icon` variant is supplied).
	const isDestructive = $derived(/delet|remov|clear|reset/i.test(title ?? ''));

	// Final icon-variant resolution. Explicit `icon` wins; otherwise the
	// destructive-title heuristic picks alert vs info.
	const iconVariant = $derived(icon ?? (isDestructive ? 'alert' : 'info'));

	// Visual tone (gradient strip + icon-bubble + icon color) keyed off
	// iconVariant. Centralized here so the template stays declarative.
	const TONE = {
		send: {
			strip: 'bg-gradient-to-r from-sky-500 to-blue-500',
			bubble: 'bg-sky-100 dark:bg-sky-900/30',
			iconClass: 'text-sky-600'
		},
		edit: {
			strip: 'bg-gradient-to-r from-emerald-500 to-teal-500',
			bubble: 'bg-emerald-100 dark:bg-emerald-900/30',
			iconClass: 'text-emerald-600'
		},
		alert: {
			strip: 'bg-ddsa-gradient-error',
			bubble: 'bg-red-100 dark:bg-red-900/30',
			iconClass: 'text-red-500'
		},
		info: {
			strip: 'bg-gradient-to-r from-amber-500 to-orange-400',
			bubble: 'bg-amber-100 dark:bg-amber-900/30',
			iconClass: 'text-amber-500'
		}
	} as const;
	const tone = $derived(TONE[iconVariant]);

	// Badge tint classes — Tailwind utility tuples for the four states.
	const BADGE_TINT = {
		green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
		amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
		red: 'bg-red-50 text-[var(--color-error)] border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
		neutral: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
	} as const;
	const badgeClass = $derived(badge ? BADGE_TINT[badge.tint] : '');

	// Sync dialog open/close + body scroll lock + focus management
	$effect(() => {
		const open = isOpen;
		const el = dialog;
		if (!el) return;

		// Use untrack for side effects that mutate other $state (modalStack)
		if (open && !el.open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			el.showModal();
			queueMicrotask(() => dialogState.registerModal(modalId));
		} else if (!open && el.open) {
			el.close();
			queueMicrotask(() => dialogState.unregisterModal(modalId));
			previouslyFocused?.focus?.();
			previouslyFocused = null;
		}

		return () => {
			queueMicrotask(() => dialogState.unregisterModal(modalId));
		};
	});

	// Dismissal paths (X close button, Escape key, backdrop click, native
	// <dialog> `close` event) all route through `dialogState.dismissConfirmModal`
	// so a caller's `onCancel` is invoked exactly once regardless of how the
	// user closed the modal. The previous design only fired onCancel from the
	// explicit Cancel button — which is hidden when `cancelLabel: null` (e.g.
	// the FEMA notice), so pressing Escape or clicking the backdrop silently
	// skipped the cancel callback. See docs/PITFALLS.md.
	function handleConfirm() {
		onConfirm?.();
		dialogState.closeConfirmModal();
	}
</script>

<dialog
	bind:this={dialog}
	class="confirm-dialog"
	onclose={() => dialogState.dismissConfirmModal()}
	onclick={(e) => {
		if (e.target === dialog) dialogState.dismissConfirmModal();
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') dialogState.dismissConfirmModal();
	}}
	aria-modal="true"
	role="alertdialog"
	aria-labelledby="confirm-title"
	aria-describedby="confirm-message"
>
	{#if isOpen}
		<div
			class="animate-zoom relative w-full overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl"
		>
			<!-- Top accent bar — keyed off the resolved iconVariant tone -->
			<div class="h-1.5 w-full shrink-0 {tone.strip}"></div>

			<div class="p-6">
				<!-- Close button -->
				<button
					onclick={() => dialogState.dismissConfirmModal()}
					class="absolute top-4 right-3 z-10 cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors duration-150 hover:text-[var(--form-text)]"
					aria-label="Close"
				>
					<X size={18} />
				</button>

				<!-- Header with icon -->
				<div class="flex items-start gap-3 pr-8">
					<div class="mt-0.5 shrink-0 rounded-full p-2 {tone.bubble}">
						{#if iconVariant === 'send'}
							<Send size={20} class={tone.iconClass} />
						{:else if iconVariant === 'edit'}
							<Pencil size={20} class={tone.iconClass} />
						{:else if iconVariant === 'alert'}
							<AlertTriangle size={20} class={tone.iconClass} />
						{:else}
							<Info size={20} class={tone.iconClass} />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<h2
							id="confirm-title"
							class="text-labelQuestion font-titleBold !m-0 text-[var(--form-text-label)]"
						>
							{title}
						</h2>

						<!-- Optional quota badge chip under the title.
						     Tint matches the modal state (green/amber/red/neutral). -->
						{#if badge}
							<div class="mt-2">
								<span
									class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold {badgeClass}"
								>
									{badge.text}
								</span>
							</div>
						{/if}

						<p
							id="confirm-message"
							class="mt-2 descriptionText !m-0 text-[var(--form-text-muted)]"
						>
							{message}
						</p>
					</div>
				</div>

				<!-- Optional in-flight footer note — renders above the action row.
				     Italic + neutral border so it reads as supplementary context, not
				     a body-text continuation. Hidden when caller doesn't supply one. -->
				{#if footerNote}
					<div
						class="mt-5 rounded-md border-l-2 border-stone-300 bg-stone-50 px-3 py-2 text-xs italic text-stone-600 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-300"
					>
						{footerNote}
					</div>
				{/if}

				<!-- Actions -->
				<div class="mt-6 flex flex-wrap justify-end gap-3">
					{#if cancelLabel !== null}
						<button
							onclick={() => dialogState.dismissConfirmModal()}
							class="cursor-pointer rounded-xl border border-[var(--form-border)] px-4 py-2.5 buttonText text-[var(--form-text-label)] hover:bg-[var(--form-bg-alt)]"
						>
							{cancelLabel || 'Cancel'}
						</button>
					{/if}

					{#if secondaryAction}
						<button
							onclick={() => {
								secondaryAction.onClick();
								dialogState.closeConfirmModal();
							}}
							class="cursor-pointer rounded-xl px-4 py-2.5 buttonText {secondaryAction.style ===
							'subtle'
								? 'text-[var(--ddsa-primary-600)] hover:bg-[var(--form-bg-alt)]'
								: 'border border-[var(--ddsa-primary-500)] text-[var(--ddsa-primary-600)] hover:bg-[var(--ddsa-primary-50)]'}"
						>
							{secondaryAction.label}
						</button>
					{/if}

					<button
						onclick={handleConfirm}
						class="cursor-pointer rounded-xl px-4 py-2.5 buttonText text-[var(--bg-header-text)] {iconVariant ===
						'alert'
							? 'bg-ddsa-gradient-error hover:bg-red-600'
							: 'bg-[var(--ddsa-primary-500)] hover:bg-[var(--ddsa-primary-600)]'}"
					>
						{confirmLabel || 'Ok'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.confirm-dialog {
		border: none;
		max-width: 90vw;
		width: 28rem;
		background: transparent;
		padding: 0;
		margin: auto;
	}

	.confirm-dialog::backdrop {
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
