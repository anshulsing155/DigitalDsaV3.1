<script lang="ts">
	import { X } from '$lib/utils/iconRegistry';
	import type { Snippet } from 'svelte';
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';
	import { generateId } from '$lib/utils';

	interface Props {
		showModal: boolean;
		dialog?: HTMLDialogElement;
		/** When false, clicking outside the modal does NOT close it. Default: true. */
		closeOnOutside?: boolean;
		/** Optional callback when modal closes (ESC key, close button, or outside click). */
		onclose?: () => void;
		/** Optional title snippet. When provided, renders structured panel layout (accent bar + title bar + scrollable body). */
		modalTitle?: Snippet;
		/** Max-width override for panel layout (e.g. 'max-w-2xl'). Only used when modalTitle is provided. */
		maxWidth?: string;
		children?: Snippet;
	}

	let {
		showModal = $bindable(false),
		dialog = $bindable(),
		closeOnOutside = true,
		onclose,
		modalTitle,
		maxWidth = '',
		children
	}: Props = $props();

	const modalId = generateId();
	let previouslyFocused: HTMLElement | null = null;

	$effect(() => {
		if (dialog && showModal) {
			if (!dialog.open) {
				previouslyFocused = document.activeElement as HTMLElement | null;
				dialog.showModal();
				registerModal(modalId);
			}
		} else if (dialog && !showModal && dialog.open) {
			dialog.close();
			unregisterModal(modalId);
			previouslyFocused?.focus?.();
			previouslyFocused = null;
		}

		return () => {
			unregisterModal(modalId);
		};
	});

	function closeModal() {
		if (dialog && dialog.open) {
			dialog.close();
		}
		showModal = false;
		unregisterModal(modalId);
		onclose?.();
	}

	function handleOutsideClick(event: MouseEvent) {
		if (!closeOnOutside) return;
		if (dialog && event.target === dialog) {
			closeModal();
		}
	}

	function handleClose() {
		// Sync showModal when dialog is closed natively (Escape key, etc.)
		showModal = false;
		unregisterModal(modalId);
		onclose?.();
	}
</script>

<dialog
	bind:this={dialog}
	class={modalTitle
		? 'fixed inset-0 z-[20] m-auto flex h-full w-full items-center justify-center bg-transparent p-0 backdrop:bg-black/50'
		: 'mx-auto flex h-screen w-full items-center justify-center bg-transparent p-0 backdrop:bg-black/30'}
	onclick={handleOutsideClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') closeModal();
	}}
	onclose={handleClose}
	aria-modal="true"
>
	{#if modalTitle}
		<div
			class={`relative mx-auto flex w-full max-w-4xl flex-col ${maxWidth}
			animate-zoom h-fit max-h-[95vh] overflow-clip rounded-2xl bg-[var(--form-bg-card)] shadow-2xl`}
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div
				class="bg-ddsa-gradient-primary mx-auto flex w-full items-center justify-between border-b border-[var(--form-border)] px-5 py-3.5"
			>
				<div class="min-w-0 flex-1 pr-8">
					{@render modalTitle?.()}
				</div>
				<button
					class="absolute top-3 right-3 z-10 cursor-pointer p-1.5 text-[var(--form-text)] transition-all duration-150 hover:bg-[var(--form-border)]/30 rounded-lg"
					onclick={closeModal}
					aria-label="Close"
				>
					<X size={18} />
				</button>
			</div>

			<div class="max-h-[90svh] flex-1 overflow-y-auto px-4 md:px-5 pb-6" data-modal-scroll>
				{@render children?.()}
			</div>
		</div>
	{:else}
		<div
			class="animate-zoom relative w-[95%] max-w-lg rounded-xl bg-[var(--form-bg-card)] p-6 shadow-md"
			role="dialog"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<button
				class="absolute top-3 right-3 z-10 cursor-pointer p-1.5 text-[var(--form-text)] transition-all duration-150 hover:bg-[var(--form-border)]/30 rounded-lg"
				aria-label="Close"
				onclick={closeModal}
			>
				<X />
			</button>

			{#if children}
				{@render children()}
			{/if}
		</div>
	{/if}
</dialog>

<style>
	@keyframes zoomIn {
		0% {
			transform: scale(0.8);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.animate-zoom {
		animation: zoomIn 0.2s ease-out;
	}
</style>
