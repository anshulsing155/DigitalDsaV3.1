<script lang="ts">
	/**
	 * DirectorRemovePickerModal — Asks user which filled directors to remove
	 * when the director count is reduced below the number of filled entries.
	 */
	import Modal from '$lib/components/Modal.svelte';
	import { CircleAlert } from '$lib/utils/iconRegistry';
	import type { DirectorForm } from '$lib/utils/directorFormUtils';

	interface Props {
		open: boolean;
		memberLabel: string;
		filledDirectors: DirectorForm[];
		targetCount: number;
		onConfirm: (keepIndexes: number[]) => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(false),
		memberLabel,
		filledDirectors,
		targetCount,
		onConfirm,
		onCancel
	}: Props = $props();

	const removeCount = $derived(filledDirectors.length - targetCount);

	// Track which directors are selected for REMOVAL
	let selectedForRemoval: Set<number> = $state(new Set());

	// Reset selection when modal opens
	$effect(() => {
		if (open) selectedForRemoval = new Set();
	});

	function toggleRemoval(idx: number) {
		const next = new Set(selectedForRemoval);
		if (next.has(idx)) {
			next.delete(idx);
		} else if (next.size < removeCount) {
			next.add(idx);
		}
		selectedForRemoval = next;
	}

	function handleConfirm() {
		// Keep indexes = all filled indexes NOT selected for removal
		const keepIndexes = filledDirectors.map((_, i) => i).filter((i) => !selectedForRemoval.has(i));
		onConfirm(keepIndexes);
	}

	function handleCancel() {
		open = false;
		onCancel();
	}

	const canConfirm = $derived(selectedForRemoval.size === removeCount);
</script>

<Modal bind:showModal={open} onclose={handleCancel} closeOnOutside={false} maxWidth="max-w-md">
	{#snippet modalTitle()}
		<div class="flex items-center gap-2">
			<CircleAlert size={18} class="text-[var(--form-text)]" />
			<h3 class="font-titleBold text-labelQuestion !m-0 text-[var(--form-text)]">
				Remove {removeCount}
				{memberLabel}{removeCount > 1 ? 's' : ''}
			</h3>
		</div>
	{/snippet}

	<div class="mt-4 space-y-4">
		<p class="alertText text-[var(--form-text-secondary)]">
			You have {filledDirectors.length} filled {memberLabel.toLowerCase()}s but reduced the count to {targetCount}.
			Select {removeCount} to remove:
		</p>

		<div class="space-y-2">
			{#each filledDirectors as dir, idx (dir.id)}
				<button
					onclick={() => toggleRemoval(idx)}
					class="flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all
						{selectedForRemoval.has(idx)
						? 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/20'
						: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:border-[var(--form-border)] hover:bg-[var(--form-bg-alt)]'}"
				>
					<div
						class="alertText font-titleBold flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors
							{selectedForRemoval.has(idx)
							? 'border-red-500 bg-red-500 text-white'
							: 'border-[var(--form-border)] text-transparent'}"
					>
						{#if selectedForRemoval.has(idx)}
							✕
						{/if}
					</div>
					<div class="flex-1">
						<div class="alertText font-titleBold text-[var(--form-text)]">
							{dir.fullName || `${memberLabel} ${idx + 1}`}
						</div>
						<div class="tinyText mt-0.5 text-[var(--form-text-secondary)]">
							{[
								dir.age ? `Age ${dir.age}` : '',
								dir.gender || '',
								dir.ownershipPercent ? `${dir.ownershipPercent}% stake` : ''
							]
								.filter(Boolean)
								.join(' · ') || 'Partially filled'}
						</div>
					</div>
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-end gap-3 border-t border-[var(--form-border)] pt-4">
			<button
				onclick={handleCancel}
				class="buttonText cursor-pointer rounded-lg border border-[var(--form-border)] px-4 py-2 text-[var(--form-text)] transition-all hover:bg-[var(--form-bg-alt)]"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				disabled={!canConfirm}
				class="buttonText rounded-lg px-5 py-2 transition-colors
					{canConfirm
					? 'cursor-pointer bg-red-600 text-white hover:bg-red-700'
					: 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}"
			>
				Remove {selectedForRemoval.size}/{removeCount} Selected
			</button>
		</div>
	</div>
</Modal>
