<script lang="ts">
	import { modal, closeModal } from '$lib/stores/modal';
	import { X } from '$lib/utils/iconRegistry';
	import { registerModal, unregisterModal } from '$lib/stores/modalStack';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import { generateId } from '$lib/utils.js';
	import { tick } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	// Route change = close. Same architectural concern as ConfirmModal
	// (Pitfall #39): the `modal` store is a module-level singleton that
	// persists across SvelteKit client-side navigations, so without this
	// the description modal stays floating over the new page. closeModal()
	// is idempotent so this is safe even when no modal is open.
	afterNavigate(() => {
		closeModal();
	});
	// Only import the specific icons used in description HTML (`data-lucide="..."`)
	// across questionBank files. Importing the full `icons` object would pull all
	// ~1,948 icon definitions (~200KB) into the client bundle.
	import {
		createIcons,
		AlertTriangle,
		BadgePlus,
		Pencil,
		BrickWall,
		Briefcase,
		ChartColumn,
		ChartLine,
		ChartNoAxesCombined,
		ClipboardList,
		Coins,
		Construction,
		CreditCard,
		DraftingCompass,
		Fence,
		FileText,
		FlagTriangleRight,
		Goal,
		Handshake,
		House,
		Landmark,
		Calendar,
		Lightbulb,
		Link,
		Map,
		NotebookPen,
		Pickaxe,
		PiggyBank,
		RefreshCcw,
		Scale,
		ScrollText,
		Search,
		Shield,
		ShieldOff,
		SignpostBig,
		Sprout,
		TentTree,
		TriangleAlert,
		UserRound
	} from 'lucide';

	/** Selective icon set matching all data-lucide="..." values in form descriptions */
	const descriptionIcons = {
		AlertTriangle,
		Pencil,
		BadgePlus,
		BrickWall,
		Briefcase,
		ChartColumn,
		ChartLine,
		ChartNoAxesCombined,
		ClipboardList,
		Coins,
		Construction,
		CreditCard,
		DraftingCompass,
		Fence,
		FileText,
		FlagTriangleRight,
		Goal,
		Handshake,
		House,
		Landmark,
		Calendar,
		Lightbulb,
		Link,
		Map,
		NotebookPen,
		Pickaxe,
		PiggyBank,
		RefreshCcw,
		Scale,
		ScrollText,
		Search,
		Shield,
		ShieldOff,
		SignpostBig,
		Sprout,
		TentTree,
		TriangleAlert,
		UserRound
	};

	interface Props {
		description?: string | null;
		modalWidth?: string;
	}

	let { description = $bindable(null), modalWidth = $bindable('') }: Props = $props();

	let isOpen = $state(false);
	let dialog: HTMLDialogElement | undefined = $state();
	const modalId = generateId();
	let previouslyFocused: HTMLElement | null = null;

	// Handle modal subscription with $effect cleanup
	$effect(() => {
		const unsubscribe = modal.subscribe(($modal) => {
			const wasOpen = isOpen;
			isOpen = $modal.open;
			description = $modal.description;
			modalWidth = $modal.modalWidth || 'md:max-w-md';

			// Register/unregister with modal stack
			if ($modal.open && !wasOpen) {
				registerModal(modalId);
			} else if (!$modal.open && wasOpen) {
				unregisterModal(modalId);
			}
		});

		return () => {
			unsubscribe();
			unregisterModal(modalId);
		};
	});

	// Control dialog open/close state + focus management
	$effect(() => {
		if (dialog && isOpen && description) {
			if (!dialog.open) {
				previouslyFocused = document.activeElement as HTMLElement | null;
				dialog.showModal();
			}
		} else if (dialog && dialog.open) {
			dialog.close();
			previouslyFocused?.focus?.();
			previouslyFocused = null;
		}
	});

	$effect(() => {
		if (isOpen && description) {
			tick().then(() => {
				createIcons({
					icons: descriptionIcons
				});
			});
		}
	});

	function handleDialogClick(event: MouseEvent) {
		if (event.target === dialog) {
			closeModal();
		}
	}
</script>

<dialog
	bind:this={dialog}
	class="info-dialog mx-auto h-screen w-full bg-transparent p-4 backdrop:bg-black/40"
	onclick={handleDialogClick}
	onkeydown={(e) => {
		if (e.key === 'Escape') closeModal();
	}}
	aria-modal="true"
>
	{#if description}
		<div
			class={`info-modal-content relative w-full rounded-2xl bg-[var(--form-bg-card)] p-4 shadow-lg md:p-6 ${modalWidth}`}
		>
			<button
				class="absolute top-4 right-3 z-10 cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] transition-colors duration-150 hover:text-[var(--form-text)]"
				onclick={closeModal}
			>
				<X class="h-5 w-5" />
			</button>

			<div class="flex max-h-80 w-full flex-col gap-4 overflow-y-auto md:max-h-full">
				<div class="flex flex-col gap-4 text-[var(--form-text)]">
					{@html sanitizeHtml(description)}
				</div>
			</div>

			<div class="mt-4">
				<button
					class="bg-ddsa-gradient-primary buttonText cancelBtn text-[var(--bg-header-text)]"
					onclick={closeModal}
				>
					Close
				</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	.info-dialog {
		border: none;
		max-width: none;
		max-height: none;
	}

	.info-dialog[open] {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-modal-content {
		max-width: 28rem;
		animation: zoomIn 0.2s ease-out;
	}

	@keyframes zoomIn {
		0% {
			transform: scale(0.9);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: scale(1);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-in-out forwards;
		backface-visibility: hidden;
	}

	.cancelBtn {
		flex: 1;
		padding: 0.75rem 1rem;
		width: 100%;
		border-radius: 0.75rem;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}

	.cancelBtn:hover {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
		opacity: 0.9;
	}
</style>
