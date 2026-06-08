<!--
	CompanyFinancials.svelte
	=============================
	Captures company-level financial data for Company applicants in
	Business Loan and Professional Loan flows (single-Company path).

	Fields: annual turnover, net profit, ITR filing status, cash income.
	Completion requires at least turnover + ITR status answered.
-->
<script lang="ts">
	import { formState } from '$lib/state/form.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		applicantIndex: number;
		onComplete?: (complete: boolean) => void;
	}

	let { applicantIndex, onComplete }: Props = $props();

	// Read company financial data from the applicant object
	let applicant = $derived(formState.applicants[applicantIndex] ?? {});
	/** Type-safe accessor — applicant is Record<string, unknown> from formState */
	function field<T>(key: string): T | undefined {
		return applicant[key] as T | undefined;
	}

	// Financial fields stored on the applicant
	let annualTurnover = $derived(field<number>('companyAnnualTurnover'));
	let netProfitLastYear = $derived(field<number>('companyNetProfitLastYear'));
	let netProfitPrevYear = $derived(field<number>('companyNetProfitPrevYear'));
	let itrFiled = $derived(field<string>('companyITRFiled'));
	let cashIncomePercent = $derived(field<number>('companyCashIncomePercent'));

	// Completion: turnover + ITR status are required
	let isComplete = $derived(
		annualTurnover !== undefined && annualTurnover > 0 && itrFiled !== undefined && itrFiled !== ''
	);

	// Notify parent of completion status
	$effect(() => {
		onComplete?.(isComplete);
	});

	// Update a field on the company applicant
	function updateField(key: string, value: unknown) {
		const newList = [...formState.applicants];
		newList[applicantIndex] = { ...newList[applicantIndex], [key]: value };
		formState.replaceApplicants(newList);
	}
</script>

<div class="company-financials mx-auto w-full max-w-2xl space-y-6 py-4">
	<div class="mb-2">
		<h3 class="text-base font-semibold text-[var(--form-text-primary)]">
			{field<string>('companyName') || 'Company'} — Financial Details
		</h3>
		<p class="mt-1 text-xs text-[var(--form-text-muted)]">
			Lenders need these figures to assess the company's financial health.
		</p>
	</div>

	<!-- Annual Turnover -->
	<NumberField
		id="companyAnnualTurnover"
		label="Annual Turnover (latest FY)"
		value={annualTurnover ?? null}
		placeholder="e.g. 50,00,000"
		required={true}
		onInput={(val) => updateField('companyAnnualTurnover', val)}
	/>
	{#if annualTurnover}
		<p class="-mt-3 mb-4 text-xs text-[var(--form-text-muted)]">{formatCurrency(annualTurnover)}</p>
	{/if}

	<!-- Net Profit — Last Year -->
	<NumberField
		id="companyNetProfitLastYear"
		label="Net Profit — Last Financial Year"
		value={netProfitLastYear ?? null}
		placeholder="e.g. 12,00,000"
		onInput={(val) => updateField('companyNetProfitLastYear', val)}
	/>
	{#if netProfitLastYear}
		<p class="-mt-3 mb-4 text-xs text-[var(--form-text-muted)]">
			{formatCurrency(netProfitLastYear)}
		</p>
	{/if}

	<!-- Net Profit — Previous Year -->
	<NumberField
		id="companyNetProfitPrevYear"
		label="Net Profit — Previous Financial Year"
		value={netProfitPrevYear ?? null}
		placeholder="e.g. 10,00,000"
		onInput={(val) => updateField('companyNetProfitPrevYear', val)}
	/>
	{#if netProfitPrevYear}
		<p class="-mt-3 mb-4 text-xs text-[var(--form-text-muted)]">
			{formatCurrency(netProfitPrevYear)}
		</p>
	{/if}

	<!-- ITR Filed Status -->
	<RadioField
		id="companyITRFiled"
		label="ITR Filed for Last 2 Years?"
		value={itrFiled ?? ''}
		required={true}
		options={[
			{ label: 'Yes — both years filed', value: 'yes_both' },
			{ label: 'Yes — only last year', value: 'yes_one' },
			{ label: 'No — not filed', value: 'no' }
		]}
		onChange={(val) => updateField('companyITRFiled', val)}
	/>

	<!-- Cash Income % -->
	<NumberField
		id="companyCashIncomePercent"
		label="Approximate Cash Income (% of turnover)"
		value={cashIncomePercent ?? null}
		placeholder="e.g. 20"
		max={100}
		onInput={(val) => updateField('companyCashIncomePercent', val)}
	/>
	{#if cashIncomePercent !== undefined && cashIncomePercent > 30}
		<p class="-mt-3 mb-4 text-xs text-amber-600 dark:text-amber-400">
			High cash component ({cashIncomePercent}%) — lenders may apply higher haircuts or require
			additional documentation.
		</p>
	{/if}

	<!-- Completion indicator -->
	{#if !isComplete}
		<p class="text-xs text-amber-600 dark:text-amber-400">
			Please fill Annual Turnover and ITR status to proceed.
		</p>
	{/if}
</div>
