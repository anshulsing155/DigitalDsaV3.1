<script lang="ts">
	import { CheckCircle2, ArrowRight } from '$lib/utils/iconRegistry';

	interface Props {
		/** The loan the user was on before the switch. */
		prevLoan: string;
		/** The loan they just switched to. */
		nextLoan: string;
		/** Called when the user clicks "Go back to <prevLoan>". */
		onGoBack: () => void;
		/** Called when the user clicks "Continue" OR dismisses (timeout / backdrop). */
		onContinue: () => void;
	}

	let { prevLoan, nextLoan, onGoBack, onContinue }: Props = $props();
</script>

<div
	class="fixed inset-0 z-[100] flex items-center justify-center"
	role="dialog"
	aria-modal="true"
	aria-labelledby="loan-switch-undo-title"
>
	<button
		type="button"
		class="absolute inset-0 cursor-default border-none bg-black/50"
		onclick={onContinue}
		aria-label="Dismiss undo prompt"
	></button>

	<div
		class="relative z-10 w-[92%] max-w-md rounded-xl bg-[var(--form-bg-card)] p-6 shadow-2xl"
	>
		<div class="mb-3 flex items-center gap-2">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
			>
				<CheckCircle2 size={18} />
			</div>
			<h2 id="loan-switch-undo-title" class="text-sectionHeadingText font-titleBold">
				Loan type changed
			</h2>
		</div>

		<p class="inputText mt-3 text-[var(--form-text-secondary)]">
			You're now starting <span class="font-titleMedium text-primary">{nextLoan}</span>. Your
			earlier <span class="font-titleMedium">{prevLoan}</span> work is safe. Did you want to go back?
		</p>

		<div class="mt-6 flex flex-col gap-2">
			<button
				onclick={onContinue}
				type="button"
				class="gold-gradient buttonText flex w-full items-center justify-center rounded-lg px-5 py-3 font-titleMedium text-white shadow transition-opacity hover:opacity-90"
			>
				Continue with {nextLoan}
				<ArrowRight size={16} class="ml-2" />
			</button>
			<button
				onclick={onGoBack}
				type="button"
				class="buttonText flex w-full items-center justify-center rounded-lg border border-[var(--form-border)] px-5 py-3 font-titleMedium text-[var(--form-text)] transition-colors hover:bg-[var(--dash-hover)]"
			>
				Go back to {prevLoan}
			</button>
		</div>
	</div>
</div>
