<script lang="ts">
	import { dialogState } from '$lib/state/dialog.svelte';

	const modalId = crypto.randomUUID();
	let isRegistered = $state(false);
	let dialog: HTMLDialogElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;

	$effect(() => {
		if (dialogState.agreeModal.open && !isRegistered) {
			dialogState.registerModal(modalId);
			isRegistered = true;
		}

		if (!dialogState.agreeModal.open && isRegistered) {
			dialogState.unregisterModal(modalId);
			isRegistered = false;
		}

		return () => {
			dialogState.unregisterModal(modalId);
		};
	});

	// Sync dialog open/close with state + focus management
	$effect(() => {
		if (dialog && dialogState.agreeModal.open && !dialog.open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			dialog.showModal();
		} else if (dialog && !dialogState.agreeModal.open && dialog.open) {
			dialog.close();
			previouslyFocused?.focus?.();
			previouslyFocused = null;
		}
	});

	function handleClose() {
		// ESC key — treat as acknowledgment (same as clicking "I understand")
		dialogState.agreeModal.onAgree?.();
		dialogState.closeAgreeModal();
	}

	function handleOutsideClick(e: MouseEvent) {
		// Don't close on outside click — user must explicitly acknowledge
		e.stopPropagation();
	}
</script>

<dialog
	bind:this={dialog}
	class="agree-dialog"
	onclose={handleClose}
	onclick={handleOutsideClick}
	aria-modal="true"
	role="alertdialog"
	aria-labelledby="agree-title"
	aria-describedby="agree-message"
>
	{#if dialogState.agreeModal.open}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="animate-zoom relative w-[90vw] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-xl dark:bg-gray-900"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="agree-title" class="sectionHeadingText">
				{dialogState.agreeModal.title}
			</h2>

			<p id="agree-message" class="inputText mt-2">
				{dialogState.agreeModal.message}
			</p>

			<div class="mt-6 flex justify-end">
				<button
					class="bg-trial-accent hover:bg-trial-accent-dark buttonText cursor-pointer rounded-md px-5 py-2 text-white"
					onclick={() => {
						dialogState.agreeModal.onAgree?.();
						dialogState.closeAgreeModal();
					}}
				>
					I understand
				</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.agree-dialog {
		border: none;
		padding: 0;
		background: transparent;
		width: 100vw;
		height: 100vh;
	}

	.agree-dialog::backdrop {
		background-color: rgba(0, 0, 0, 0.4);
	}

	.agree-dialog[open] {
		display: grid;
		place-items: center;
		z-index: 9999;
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
		animation: zoomIn 0.15s ease-out;
	}
</style>
