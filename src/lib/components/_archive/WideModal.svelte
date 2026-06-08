<script lang="ts">
	import { X } from '$lib/utils/iconRegistry';
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';

	import type { Snippet } from 'svelte';

	interface Props {
		showModal?: boolean;
		closeOnOutside?: boolean;
		maxWidth?: string;
		modalTitle?: Snippet;
		children?: Snippet;
		onclose?: () => void;
	}

	let {
		showModal = $bindable(false),
		closeOnOutside = true,
		maxWidth = '',
		modalTitle,
		children,
		onclose
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	const modalId = crypto.randomUUID();
	let previouslyFocused: HTMLElement | null = null;

	$effect(() => {
		if (showModal && dialog && !dialog.open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			dialog.showModal();
			registerModal(modalId);
		}

		if (!showModal && dialog?.open) {
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
		showModal = false;
		unregisterModal(modalId);
		onclose?.();
	}

	function handleOutsideClick(e: MouseEvent) {
		if (!closeOnOutside) return;
		if (e.target === dialog) closeModal();
	}

	function handleNativeClose() {
		// Sync showModal when dialog is closed natively (ESC key)
		showModal = false;
		unregisterModal(modalId);
		onclose?.();
	}
</script>

<dialog
	bind:this={dialog}
	class="fixed inset-0 z-[20] m-auto flex h-full
	       w-full items-center justify-center bg-transparent p-0 backdrop:bg-black/50"
	onclick={handleOutsideClick}
	onclose={handleNativeClose}
	aria-modal="true"
>
	<div
		class={`relative mx-auto flex w-full max-w-4xl flex-col ${maxWidth}
	        animate-zoom h-fit max-h-[95vh] overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl`}
		role="dialog"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<!-- Top accent bar -->
		<div class="h-1.5 w-full shrink-0 bg-gradient-to-r from-stone-500 to-neutral-500"></div>

		<div
			class="mx-auto flex w-full items-center justify-between border-b border-[var(--form-border)] bg-[var(--form-bg-alt)] px-5 py-3.5"
		>
			<div class="min-w-0 flex-1 pr-8">
				{@render modalTitle?.()}
			</div>
			<button
				class="absolute top-4 right-3 z-10 cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors duration-150 hover:bg-[var(--form-bg-alt)] hover:text-[var(--form-text)]"
				onclick={closeModal}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</div>

		<div class="max-h-[90svh] flex-1 overflow-y-auto px-5 pb-6">
			{@render children?.()}
		</div>
	</div>
</dialog>

<style>
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
