<script lang="ts">
	import { AlertTriangle } from '$lib/utils/iconRegistry';

	interface Props {
		/** The loan the user is currently on. */
		fromLoan: string;
		/** The loan they're about to switch to. */
		toLoan: string;
		/** Display sketch — "X applicants, Y pages filled" copy. */
		summary: { applicantCount: number; pagesFilled: number };
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { fromLoan, toLoan, summary, onConfirm, onCancel }: Props = $props();

	// Compose the body copy parts. Pluralized + Indian-DSA friendly: no
	// jargon ("park" / "scope" / "context"), short sentences.
	let summaryBits = $derived.by(() => {
		const parts: string[] = [];
		if (summary.applicantCount > 0) {
			parts.push(
				`${summary.applicantCount} applicant${summary.applicantCount === 1 ? '' : 's'}`
			);
		}
		if (summary.pagesFilled > 0) {
			parts.push(`${summary.pagesFilled} page${summary.pagesFilled === 1 ? '' : 's'} filled`);
		}
		return parts.join(' and ');
	});
</script>

<div
	class="fixed inset-0 z-[100] flex items-center justify-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="loan-switch-confirm-title"
>
	<button
		type="button"
		class="absolute inset-0 cursor-default border-none bg-black/50"
		onclick={onCancel}
		aria-label="Cancel loan type change"
	></button>

	<div
		class="relative z-10 w-[92%] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-2xl"
	>
		<div class="mb-3 flex items-center gap-2">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
			>
				<AlertTriangle size={18} />
			</div>
			<h2 id="loan-switch-confirm-title" class="text-sectionHeadingText font-titleBold">
				Change loan type?
			</h2>
		</div>

		<p class="inputText mt-3 text-[var(--form-text-secondary)]">
			Your <span class="font-titleMedium text-primary">{fromLoan}</span> work will be saved.
			{#if summaryBits}
				You have <span class="font-titleMedium">{summaryBits}</span>.
			{/if}
			You can come back to it later — nothing will be lost.
		</p>

		<div class="mt-6 flex flex-col gap-2">
			<button
				onclick={onConfirm}
				type="button"
				class="gold-gradient buttonText flex w-full items-center justify-center rounded-lg px-5 py-3 font-titleMedium text-white shadow transition-opacity hover:opacity-90"
			>
				Save and change to {toLoan}
			</button>
			<button
				onclick={onCancel}
				type="button"
				class="buttonText flex w-full items-center justify-center rounded-lg border border-[var(--form-border)] px-5 py-3 font-titleMedium text-[var(--form-text)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Stay on {fromLoan}
			</button>
		</div>
	</div>
</div>
