<script lang="ts">
	/**
	 * CompanyObligationsTab — Running Loans & Credit Limits
	 * ═══════════════════════════════════════════════════════════════════
	 * Standalone tab for Company existing obligations.
	 * - Running loans question (Yes/No)
	 * - If Yes: ExistingLoanDetails for term loans + credit limits
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import ExistingLoanDetails from './ExistingLoanDetails.svelte';
	import { FileText } from '$lib/utils/iconRegistry';

	interface Props {
		applicantIndex: number;
		onComplete?: (isComplete: boolean) => void;
	}

	let { applicantIndex, onComplete }: Props = $props();

	// Local answers for ExistingLoanDetails binding
	let localAnswers = $state<Record<string, unknown>>({});

	// Hydrate from formState
	$effect(() => {
		const applicant = formState.applicants[applicantIndex] ?? {};
		localAnswers = {
			ObligationsRunning: applicant.ObligationsRunning,
			tableLoanEntries: applicant.tableLoanEntries,
			tableLimitEntries: applicant.tableLimitEntries
		};
	});

	// Sync back to formState
	$effect(() => {
		const applicant = formState.applicants[applicantIndex];
		if (!applicant) return;
		const storeObligation = applicant.ObligationsRunning;
		const localObligation = localAnswers.ObligationsRunning;
		if (
			storeObligation !== localObligation ||
			JSON.stringify(applicant.tableLoanEntries) !== JSON.stringify(localAnswers.tableLoanEntries) ||
			JSON.stringify(applicant.tableLimitEntries) !== JSON.stringify(localAnswers.tableLimitEntries)
		) {
			const updated = [...formState.applicants];
			updated[applicantIndex] = {
				...updated[applicantIndex],
				ObligationsRunning: localAnswers.ObligationsRunning,
				tableLoanEntries: localAnswers.tableLoanEntries as any,
				tableLimitEntries: localAnswers.tableLimitEntries as any
			};
			formState.replaceApplicants(updated);
		}
	});

	// ── Derived state ────────────────────────────────────────────────
	const obligationsRunning = $derived(localAnswers.ObligationsRunning as string | undefined);
	const hasObligations = $derived(obligationsRunning === 'Yes');
	const obligationsAnswered = $derived(obligationsRunning === 'Yes' || obligationsRunning === 'No');

	const hasEntries = $derived(
		(localAnswers.tableLoanEntries as unknown[])?.length > 0 ||
		(localAnswers.tableLimitEntries as unknown[])?.length > 0
	);

	const isComplete = $derived(
		obligationsAnswered && (obligationsRunning === 'No' || hasEntries)
	);

	$effect(() => {
		onComplete?.(isComplete);
	});

	function handleObligationChange(val: string | number) {
		localAnswers = { ...localAnswers, ObligationsRunning: String(val) };
	}
</script>

<div class="flex flex-col gap-7 pb-4">
	<!-- ── Section Header ───────────────────────────────────────── -->
	<div class="flex items-start gap-3">
		<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
			<FileText class="h-4 w-4" />
		</div>
		<div>
			<h3 class="font-titleBold text-sm text-[var(--form-text)]">Existing Obligations</h3>
			<p class="mt-0.5 font-paragraph text-xs text-[var(--form-text-secondary)]">
				Running loans, credit limits, and credit card obligations of the company.
			</p>
		</div>
	</div>

	<!-- ── Running Loans Question ────────────────────────────────── -->
	<div class="flex flex-col gap-2">
		<p class="font-titleMedium text-sm text-[var(--form-text)]">
			Does this company have any running loans as borrower or co-applicant? <span class="text-red-400">*</span>
		</p>
		<RadioCustom
			options={[
				{ label: 'Yes', value: 'Yes', icon: 'ThumbsUp' },
				{ label: 'No', value: 'No', icon: 'ThumbsDown' }
			]}
			value={obligationsRunning ?? ''}
			gridClass="grid grid-cols-2 gap-3"
			onchange={handleObligationChange}
		/>
	</div>

	<!-- ── Loan Details ──────────────────────────────────────────── -->
	{#if hasObligations}
		<ExistingLoanDetails idx={applicantIndex} bind:answers={localAnswers} />
	{/if}

	{#if obligationsRunning === 'Yes' && !hasEntries}
		<p class="text-xs text-amber-600 dark:text-amber-400">
			Add at least one loan or credit limit entry to proceed.
		</p>
	{/if}
</div>
