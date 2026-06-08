<script lang="ts">
	import { CircleAlert, X } from '$lib/utils/iconRegistry';

	interface DirectorImpact {
		name: string;
		directorId: string;
		isMultiLinked: boolean;
		otherCompanies: string[];
	}

	interface Props {
		companyName: string;
		companyId: string;
		directors: DirectorImpact[];
		onConfirm: (keepSingleLinked: Map<string, boolean>) => void;
		onCancel: () => void;
	}

	let { companyName, companyId, directors, onConfirm, onCancel }: Props = $props();

	// Track keep/remove decisions for single-linked directors
	let keepDecisions: Map<string, boolean> = $state(new Map());

	// Initialize: single-linked directors default to "remove" (unchecked)
	$effect(() => {
		const map = new Map<string, boolean>();
		for (const dir of directors) {
			if (!dir.isMultiLinked) {
				map.set(dir.directorId, false);
			}
		}
		keepDecisions = map;
	});

	const multiLinked = $derived(directors.filter((d) => d.isMultiLinked));
	const singleLinked = $derived(directors.filter((d) => !d.isMultiLinked));

	function toggleKeep(directorId: string) {
		const next = new Map(keepDecisions);
		next.set(directorId, !next.get(directorId));
		keepDecisions = next;
	}

	function handleConfirm() {
		onConfirm(keepDecisions);
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	aria-label="Delete company confirmation"
>
	<div class="relative w-full max-w-md rounded-2xl bg-[var(--form-bg-card)] p-6 shadow-xl">
		<!-- Close button -->
		<button
			onclick={onCancel}
			class="absolute top-3 right-3 cursor-pointer rounded-lg p-1.5 text-[var(--form-text-muted)] hover:bg-[var(--form-border)]/30"
			aria-label="Cancel"
		>
			<X size={18} />
		</button>

		<!-- Header -->
		<div class="flex items-start gap-3 pr-8">
			<div class="mt-0.5 rounded-full bg-red-100 p-2 dark:bg-red-900/30">
				<CircleAlert size={20} class="text-red-500" />
			</div>
			<div>
				<h3 class="text-labelQuestion !m-0">
					Delete "{companyName}"?
				</h3>
				<p class="alertText text-[var(--form-text-label)]">
					This company has {directors.length} director{directors.length !== 1
						? 's'
						: ''}/partner{directors.length !== 1 ? 's' : ''}.
				</p>
			</div>
		</div>

		<!-- Director impact list -->
		<div class="mt-5 space-y-3">
			{#if multiLinked.length > 0}
				{#each multiLinked as dir (dir.directorId)}
					<div
						class="rounded-lg border border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] p-3"
					>
						<div class="alertText font-titleBold text-[var(--form-text)]">
							{dir.name}
						</div>
						<div class="tinyText font-titleBold mt-1 text-primary">
							Will remain (also in: {dir.otherCompanies.join(', ')})
						</div>
						<div class="tinyText mt-0.5 text-[var(--form-text-secondary)]">
							Income from {companyName} will be kept but highlighted
						</div>
					</div>
				{/each}
			{/if}

			{#if singleLinked.length > 0}
				{#each singleLinked as dir (dir.directorId)}
					<div
						class="rounded-lg border border-[var(--form-border)] bg-[var(--ddsa-primary-500)]/[0.03] p-3"
					>
						<label class="flex cursor-pointer items-start gap-3">
							<input
								type="checkbox"
								checked={keepDecisions.get(dir.directorId) ?? false}
								onchange={() => toggleKeep(dir.directorId)}
								class="mt-0.5 h-4 w-4 rounded border-[var(--form-border)] text-[var(--ddsa-primary-500)] accent-primary focus:ring-[var(--ddsa-primary-500)]"
							/>
							<div>
								<div class="alertText font-titleBold text-[var(--form-text)]">
									Keep {dir.name} as standalone applicant
								</div>
								<div class="tinyText mt-0.5 text-[var(--form-text-secondary)]">
									{#if keepDecisions.get(dir.directorId)}
										Income entries will be kept but highlighted
									{:else}
										Will be removed with all income entries
									{/if}
								</div>
							</div>
						</label>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-6 flex justify-end gap-3">
			<button
				onclick={onCancel}
				class="buttonText cursor-pointer rounded-lg border border-[var(--form-border)] px-4 py-2 text-[var(--form-text)] transition-all hover:bg-[var(--form-bg-alt)]"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				class="buttonText cursor-pointer rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
			>
				Delete Company
			</button>
		</div>
	</div>
</div>
