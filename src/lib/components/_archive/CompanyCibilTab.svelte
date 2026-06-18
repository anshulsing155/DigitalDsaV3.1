<script lang="ts">
	/**
	 * CompanyCibilTab — Credit Score & CIBIL Factors
	 * ═══════════════════════════════════════════════════════════════════
	 * Standalone tab for Company credit assessment.
	 * - Credit score input (300-900 or -1/0 for special cases)
	 * - If 300-900: CIBIL contributing factors (multi-select)
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import MultiOptionsSelection from './MultiOptionsSelection.svelte';
	import { Star } from '$lib/utils/iconRegistry';

	interface Props {
		applicantIndex: number;
		onComplete?: (isComplete: boolean) => void;
	}

	let { applicantIndex, onComplete }: Props = $props();

	const applicant = $derived(formState.applicants[applicantIndex] ?? {});
	let touchedScore = $state(false);

	// ── Credit score ─────────────────────────────────────────────────
	const creditScore = $derived(applicant.creditScore as number | undefined);
	const hasValidScore = $derived(
		creditScore != null && creditScore >= 300 && creditScore <= 900
	);
	const isSpecialScore = $derived(creditScore === -1 || creditScore === 0);
	const showFactors = $derived(hasValidScore);
	const factorsComplete = $derived(
		!showFactors || (applicant.whyPrimaryLowCreditValidate === true)
	);

	// ── Completion ───────────────────────────────────────────────────
	const isComplete = $derived(
		(hasValidScore && factorsComplete) || isSpecialScore
	);

	$effect(() => {
		onComplete?.(isComplete);
	});

	// ── Field updates ────────────────────────────────────────────────
	function updateField(key: string, value: unknown) {
		const updated = [...formState.applicants];
		updated[applicantIndex] = { ...updated[applicantIndex], [key]: value };
		formState.replaceApplicants(updated);
	}

	// Local answers for MultiOptionsSelection binding
	let localAnswers = $state<Record<string, unknown>>({});

	$effect(() => {
		localAnswers = {
			whyPrimaryLowCredit: applicant.whyPrimaryLowCredit,
			whyPrimaryLowCreditValidate: applicant.whyPrimaryLowCreditValidate,
			whyPrimaryLowCreditVisible: applicant.whyPrimaryLowCreditVisible
		};
	});

	// Sync local answers back to formState
	$effect(() => {
		if (localAnswers.whyPrimaryLowCreditValidate !== undefined) {
			const current = formState.applicants[applicantIndex];
			if (
				current?.whyPrimaryLowCreditValidate !== localAnswers.whyPrimaryLowCreditValidate ||
				JSON.stringify(current?.whyPrimaryLowCreditVisible) !== JSON.stringify(localAnswers.whyPrimaryLowCreditVisible)
			) {
				const updated = [...formState.applicants];
				updated[applicantIndex] = {
					...updated[applicantIndex],
					whyPrimaryLowCredit: localAnswers.whyPrimaryLowCredit,
					whyPrimaryLowCreditValidate: localAnswers.whyPrimaryLowCreditValidate,
					whyPrimaryLowCreditVisible: localAnswers.whyPrimaryLowCreditVisible
				};
				formState.replaceApplicants(updated);
			}
		}
	});

	const CIBIL_FACTORS = [
		{ label: 'Delayed EMI payments in the past 12 months', value: 'delayedEMI' },
		{ label: 'High utilization of available credit card limit', value: 'highCreditUtilization' },
		{ label: 'Limited or no credit history', value: 'noCreditHistory' },
		{ label: 'Only minimum due payments made on credit cards', value: 'minimumDueOnly' },
		{ label: 'Multiple recent loan or credit card enquiries', value: 'multipleEnquiries' },
		{ label: 'Defaulted in one or more previous loans as co-applicant / guarantor', value: 'coApplicantDefault' },
		{ label: 'Loan default or settlement in the past', value: 'loanDefault' },
		{ label: 'Only unsecured loans such as credit cards or personal loans in profile', value: 'onlyUnsecuredLoans' }
	];
</script>

<div class="flex flex-col gap-7 pb-4">
	<!-- ── Section Header ───────────────────────────────────────── -->
	<div class="flex items-start gap-3">
		<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
			<Star class="h-4 w-4" />
		</div>
		<div>
			<h3 class="font-titleBold text-sm text-[var(--form-text)]">Credit Score (CIBIL)</h3>
			<p class="mt-0.5 font-paragraph text-xs text-[var(--form-text-secondary)]">
				Enter the company's credit score. This affects lender eligibility and interest rates.
			</p>
		</div>
	</div>

	<!-- ── Credit Score Input ────────────────────────────────────── -->
	<div class="flex flex-col gap-2">
		<p class="font-titleMedium text-sm text-[var(--form-text)]">
			What's the Credit Score? <span class="text-red-400">*</span>
		</p>
		<NumberFieldIndianFormat
			value={creditScore ?? null}
			icon="Sparkles"
			showNumberInWords={false}
			maxLength={3}
			max={900}
			isTouched={touchedScore}
			onBlur={() => { touchedScore = true; }}
			onInput={(val) => updateField('creditScore', val)}
		/>
		{#if touchedScore && creditScore != null}
			{#if creditScore < 300 && creditScore !== -1 && creditScore !== 0}
				<p class="text-xs text-red-500">Credit Score must be between 300 and 900 (or -1/0 for no history)</p>
			{:else if creditScore > 900}
				<p class="text-xs text-red-500">Credit Score must be at most 900</p>
			{/if}
		{/if}

		<!-- Score interpretation -->
		{#if hasValidScore}
			<div class="mt-1 flex gap-2">
				{#if (creditScore ?? 0) >= 750}
					<span class="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">Excellent (750+)</span>
				{:else if (creditScore ?? 0) >= 650}
					<span class="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Good (650-749)</span>
				{:else if (creditScore ?? 0) >= 550}
					<span class="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Fair (550-649)</span>
				{:else}
					<span class="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-[var(--color-error)] dark:bg-red-900/30 dark:text-red-400">Poor (300-549)</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ── CIBIL Factors ────────────────────────────────────────── -->
	{#if showFactors}
		<div class="flex flex-col gap-2">
			<p class="font-titleMedium text-sm text-[var(--form-text)]">
				What factors have contributed to this CIBIL score? <span class="text-red-400">*</span>
			</p>
			<MultiOptionsSelection
				options={CIBIL_FACTORS}
				bind:answers={localAnswers}
				questionId="whyPrimaryLowCredit"
				compact
			/>
		</div>
	{/if}

	{#if isSpecialScore}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
			<p class="text-xs text-blue-700 dark:text-blue-300">
				Score of {creditScore} indicates no credit history. This is common for new businesses.
			</p>
		</div>
	{/if}
</div>
