<script lang="ts">
	import { Info, CircleAlert } from '$lib/utils/iconRegistry';

	interface Props {
		isBTCase: boolean;
		btCoApplicantCount: number;
		btGuarantorCount: number;
		btExpectedCount: number;
		btMismatchWarning: string;
		onCoApplicantCountChange: (count: number) => void;
		onGuarantorCountChange: (count: number) => void;
	}

	let {
		isBTCase,
		btCoApplicantCount,
		btGuarantorCount,
		btExpectedCount,
		btMismatchWarning,
		onCoApplicantCountChange,
		onGuarantorCountChange
	}: Props = $props();
</script>

{#if isBTCase}
	<div
		class="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<div class="mb-3 flex items-center gap-2">
			<Info size="16" class="shrink-0 text-blue-600 dark:text-blue-400" />
			<h3 class="text-sm font-semibold text-blue-800 dark:text-blue-200">
				Existing Loan — Applicant Structure
			</h3>
		</div>
		<p class="mb-4 text-xs text-blue-700 dark:text-blue-300">
			Specify the number of co-applicants and guarantors on the existing loan. The primary borrower
			is always counted.
		</p>

		<div class="space-y-3">
			<!-- Co-applicant stepper -->
			<div
				class="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-700 dark:bg-blue-900/30"
			>
				<span class="text-sm font-medium text-blue-800 dark:text-blue-200">Co-applicants</span>
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => onCoApplicantCountChange(Math.max(0, btCoApplicantCount - 1))}
						disabled={btCoApplicantCount <= 0}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800/60"
						aria-label="Decrease co-applicants"
					>
						&minus;
					</button>
					<span class="w-6 text-center text-base font-semibold text-blue-800 dark:text-blue-200">
						{btCoApplicantCount}
					</span>
					<button
						type="button"
						onclick={() => onCoApplicantCountChange(Math.min(7, btCoApplicantCount + 1))}
						disabled={btCoApplicantCount >= 7}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800/60"
						aria-label="Increase co-applicants"
					>
						+
					</button>
				</div>
			</div>

			<!-- Guarantor stepper -->
			<div
				class="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-700 dark:bg-blue-900/30"
			>
				<span class="text-sm font-medium text-blue-800 dark:text-blue-200">Guarantors</span>
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={() => onGuarantorCountChange(Math.max(0, btGuarantorCount - 1))}
						disabled={btGuarantorCount <= 0}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800/60"
						aria-label="Decrease guarantors"
					>
						&minus;
					</button>
					<span class="w-6 text-center text-base font-semibold text-blue-800 dark:text-blue-200">
						{btGuarantorCount}
					</span>
					<button
						type="button"
						onclick={() => onGuarantorCountChange(Math.min(3, btGuarantorCount + 1))}
						disabled={btGuarantorCount >= 3}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800/60"
						aria-label="Increase guarantors"
					>
						+
					</button>
				</div>
			</div>
		</div>

		{#if btExpectedCount > 0}
			<div
				class="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-100/50 p-2.5 dark:border-blue-700 dark:bg-blue-900/30"
			>
				<Info size="14" class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
				<p class="text-xs font-medium text-blue-700 dark:text-blue-300">
					Add all {btExpectedCount} applicant{btExpectedCount > 1 ? 's' : ''} exactly as they appear on
					the existing loan ({btExpectedCount === 1
						? 'borrower only'
						: `1 borrower + ${btCoApplicantCount} co-applicant${btCoApplicantCount !== 1 ? 's' : ''}${btGuarantorCount > 0 ? ` + ${btGuarantorCount} guarantor${btGuarantorCount !== 1 ? 's' : ''}` : ''}`}).
				</p>
			</div>
		{/if}
		{#if btMismatchWarning}
			<div
				class="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-700 dark:bg-amber-900/20"
			>
				<CircleAlert size="14" class="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
				<p class="text-xs font-medium text-amber-600 dark:text-amber-400">{btMismatchWarning}</p>
			</div>
		{/if}
		<p class="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
			If any co-applicant has passed away, the structure must be updated at the existing lender
			before applying for balance transfer.
		</p>
	</div>
{/if}
