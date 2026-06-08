<script lang="ts">
	/**
	 * ApplicantKeepPickerModal — Ask user which applicant(s) to keep when the
	 * applicant-type selection is reduced below the number of entered applicants.
	 *
	 * Example: user entered 2 applicants in "Joint" mode, then switched the
	 * applicant type to "Individual" (which allows only 1). Rather than
	 * silently dropping data, prompt the user to choose which applicant remains.
	 */
	import Modal from '$lib/components/Modal.svelte';
	import { CircleAlert } from '$lib/utils/iconRegistry';

	/** Minimal applicant shape used by this picker. Real objects may have more fields. */
	export interface PickableApplicant {
		id: string;
		fullName?: string;
		age?: string | number;
		gender?: string;
	}

	interface Props {
		open: boolean;
		applicants: PickableApplicant[];
		/** How many applicants the user is allowed to keep (e.g., 1 for Individual). */
		keepCount: number;
		/** Short noun used in headings/labels, e.g. "applicant". */
		memberLabel?: string;
		onConfirm: (keepIds: string[]) => void;
		onCancel: () => void;
	}

	let {
		open = $bindable(false),
		applicants,
		keepCount,
		memberLabel = 'applicant',
		onConfirm,
		onCancel
	}: Props = $props();

	// Clamp keepCount to the number of candidates so callers passing a larger
	// value (e.g. keepCount=2 with only 1 applicant) can't create a modal with a
	// permanently-disabled Confirm button.
	const effectiveKeepCount = $derived(Math.max(0, Math.min(keepCount, applicants.length)));
	const removeCount = $derived(Math.max(0, applicants.length - effectiveKeepCount));

	// Track which applicant ids the user wants to KEEP.
	// We phrase the UI as "keep" (positive action) rather than "remove".
	let selectedForKeep: Set<string> = $state(new Set());

	// Reset selection every time the modal opens.
	$effect(() => {
		if (open) selectedForKeep = new Set();
	});

	function toggleKeep(id: string) {
		const next = new Set(selectedForKeep);
		if (next.has(id)) {
			next.delete(id);
		} else if (next.size < effectiveKeepCount) {
			next.add(id);
		}
		selectedForKeep = next;
	}

	function handleConfirm() {
		onConfirm(Array.from(selectedForKeep));
	}

	function handleCancel() {
		open = false;
		onCancel();
	}

	function buildSubtitle(a: PickableApplicant): string {
		const parts = [a.age ? `Age ${a.age}` : '', a.gender || ''].filter(Boolean);
		return parts.length > 0 ? parts.join(' · ') : 'No profile details entered';
	}

	const canConfirm = $derived(applicants.length > 0 && selectedForKeep.size === effectiveKeepCount);
</script>

<Modal bind:showModal={open} onclose={handleCancel} closeOnOutside={false} maxWidth="max-w-md">
	{#snippet modalTitle()}
		<div class="flex items-center gap-2">
			<CircleAlert size={18} class="text-amber-500" />
			<h3 class="text-base font-semibold text-[var(--form-text)]">
				Keep which {memberLabel}{effectiveKeepCount > 1 ? 's' : ''}?
			</h3>
		</div>
	{/snippet}

	<div class="mt-4 space-y-4">
		<p class="text-sm text-[var(--form-text-secondary)]">
			You previously entered {applicants.length}
			{memberLabel}s, but the current selection only allows {effectiveKeepCount}. Choose {effectiveKeepCount ===
			1
				? 'the one'
				: `${effectiveKeepCount}`} to keep — the {removeCount === 1
				? 'other will'
				: `other ${removeCount} will`} be removed.
		</p>

		<div class="space-y-2">
			{#each applicants as applicant (applicant.id)}
				<button
					type="button"
					onclick={() => toggleKeep(applicant.id)}
					class="flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all
						{selectedForKeep.has(applicant.id)
						? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
						: 'border-[var(--form-border)] bg-[var(--form-bg-card)] hover:border-[var(--form-border)] hover:bg-[var(--form-bg-alt)]'}"
				>
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors
							{selectedForKeep.has(applicant.id)
							? 'border-emerald-500 bg-emerald-500 text-white'
							: 'border-[var(--form-border)] text-transparent'}"
					>
						{#if selectedForKeep.has(applicant.id)}✓{/if}
					</div>
					<div class="flex-1">
						<div class="text-sm font-medium text-[var(--form-text)]">
							{applicant.fullName || 'Unnamed applicant'}
						</div>
						<div class="mt-0.5 text-xs text-[var(--form-text-secondary)]">
							{buildSubtitle(applicant)}
						</div>
					</div>
				</button>
			{/each}
		</div>

		<div class="flex items-center justify-end gap-3 border-t border-[var(--form-border)] pt-4">
			<button
				type="button"
				onclick={handleCancel}
				class="rounded-lg border border-[var(--form-border)] px-4 py-2 text-sm font-medium text-[var(--form-text-secondary)] transition-colors hover:bg-[var(--form-bg-alt)]"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleConfirm}
				disabled={!canConfirm}
				class="rounded-lg px-5 py-2 text-sm font-semibold transition-colors
					{canConfirm
					? 'bg-emerald-600 text-white hover:bg-emerald-700'
					: 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}"
			>
				Keep {selectedForKeep.size}/{effectiveKeepCount}
			</button>
		</div>
	</div>
</Modal>
