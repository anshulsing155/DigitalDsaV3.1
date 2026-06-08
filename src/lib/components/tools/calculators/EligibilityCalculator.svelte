<script lang="ts">
	/**
	 * EligibilityCalculator -- Loan eligibility estimation component.
	 *
	 * Allows users to enter income, credit score, age, and loan details
	 * to see how much loan they can qualify for.
	 *
	 * Uses simplified static rules for the public version.
	 * Dashboard version will eventually use the full rule engine via API.
	 *
	 * Uses Svelte 5 runes ($state, $derived) for reactive calculations.
	 * All math is delegated to staticEligibilityEngine.ts -- this component is UI only.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import {
		calculateEligibility,
		CREDIT_SCORE_OPTIONS
	} from '$lib/tools/calculators/eligibility/staticEligibilityEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { LOAN_DEFAULTS, OCCUPATION_OPTIONS } from '$lib/tools/constants.js';

	// --- Component Props ---
	interface Props {
		/** 'public' = public page, 'dashboard' = inside DSA dashboard */
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// LOAN TYPE OPTIONS
	// =========================================================================

	/**
	 * Loan products available for eligibility check.
	 * Values match the canonical `loanName` vocabulary (post-2026-05-31 rename per ADR-0020),
	 * so a future wiring of this calculator into the live rule engine via API can pass
	 * `selectedLoan` straight through as `loanName` without translation.
	 */
	const loanTypeOptions = [
		{ label: 'Home Loan', value: 'Home Loan' },
		{ label: 'Loan Against Property', value: 'Loan Against Property' },
		{ label: 'Personal Loan', value: 'Personal Loan' },
		{ label: 'Business Loan', value: 'Business Loan' }
	];

	/** Credit score options formatted for SelectField */
	const creditScoreSelectOptions = CREDIT_SCORE_OPTIONS.map((tier) => ({
		label: tier,
		value: tier
	}));

	// =========================================================================
	// USER INPUTS (reactive state)
	// =========================================================================

	/** Selected loan product type */
	let loanType: string = $state('Home Loan');

	/** Gross monthly income in INR */
	let monthlyIncome: number = $state(75_000);

	/** Total existing EMI obligations per month */
	let existingEmiAmount: number = $state(0);

	/** Selected credit score tier */
	let creditScoreTier: string = $state('750+');

	/** Applicant's current age in years */
	let applicantAge: number = $state(LOAN_DEFAULTS.DEFAULT_AGE);

	/** Occupation category */
	let occupation: string = $state('Private');

	/** Property/collateral value -- only relevant for secured loans */
	let propertyValue: number = $state(5_000_000);

	/** Requested loan amount */
	let requestedAmount: number = $state(LOAN_DEFAULTS.PRINCIPAL);

	/** Requested tenure in years */
	let requestedTenureYears: number = $state(LOAN_DEFAULTS.TENURE_YEARS);

	// =========================================================================
	// DERIVED VALUES
	// =========================================================================

	/** Whether the selected loan product requires collateral */
	let isSecuredLoan = $derived(
		loanType === 'Home Loan' || loanType === 'Loan Against Property'
	);

	/**
	 * The complete eligibility calculation result.
	 * Recalculates automatically whenever any input changes.
	 */
	let result = $derived.by(() => {
		if (monthlyIncome <= 0 || applicantAge <= 0) return null;

		return calculateEligibility({
			loanType,
			monthlyIncome,
			existingEmiAmount,
			creditScoreTier,
			applicantAge,
			occupation,
			propertyValue: isSecuredLoan ? propertyValue : undefined,
			requestedAmount,
			requestedTenureYears
		});
	});

	/**
	 * Result card items -- the key numbers displayed prominently.
	 */
	let resultItems = $derived(
		result
			? [
					{
						label: 'Maximum Eligible Amount',
						value: `₹ ${formatNumber(result.maxEligibleAmount)}`,
						highlight: true
					},
					{
						label: 'Estimated Monthly EMI',
						value: `₹ ${formatNumber(result.estimatedEmi)}`
					},
					{
						label: 'Estimated Interest Rate',
						value: `${result.estimatedRate.toFixed(2)}% p.a.`
					},
					{
						label: 'Effective Tenure',
						value: `${result.effectiveTenureMonths} months (${(result.effectiveTenureMonths / 12).toFixed(1)} years)`
					}
				]
			: []
	);
</script>

<!-- ======================================================================= -->
<!-- ELIGIBILITY CALCULATOR UI                                               -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Input Section: Applicant & Loan Details === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Applicant Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- Loan Type -->
			<SelectField
				id="elig-loan-type"
				label="Loan Type"
				options={loanTypeOptions}
				bind:value={loanType}
			/>

			<!-- Monthly Income -->
			<NumberField
				id="elig-monthly-income"
				label="Monthly Income (₹)"
				bind:value={monthlyIncome}
				min={10_000}
				max={100_000_000}
				formatIndian={true}
				placeholder="Gross monthly income"
				icon="indian-rupee"
			/>

			<!-- Existing EMI -->
			<NumberField
				id="elig-existing-emi"
				label="Existing EMI (₹/month)"
				bind:value={existingEmiAmount}
				min={0}
				max={10_000_000}
				formatIndian={true}
				placeholder="Total current EMIs"
				icon="indian-rupee"
			/>

			<!-- Credit Score Tier -->
			<SelectField
				id="elig-credit-score"
				label="Credit Score Range"
				options={creditScoreSelectOptions}
				bind:value={creditScoreTier}
			/>

			<!-- Applicant Age -->
			<NumberField
				id="elig-age"
				label="Applicant Age (years)"
				bind:value={applicantAge}
				min={18}
				max={70}
				formatIndian={false}
				placeholder="Current age"
			/>

			<!-- Occupation -->
			<SelectField
				id="elig-occupation"
				label="Occupation"
				options={[...OCCUPATION_OPTIONS]}
				bind:value={occupation}
			/>
		</div>
	</div>

	<!-- === Loan Parameters === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Loan Parameters</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- Property Value (only for secured loans) -->
			{#if isSecuredLoan}
				<NumberField
					id="elig-property-value"
					label="Property Value (₹)"
					bind:value={propertyValue}
					min={200_000}
					max={1_000_000_000}
					formatIndian={true}
					placeholder="Estimated property value"
					icon="indian-rupee"
				/>
			{/if}

			<!-- Requested Amount -->
			<NumberField
				id="elig-requested-amount"
				label="Requested Loan Amount (₹)"
				bind:value={requestedAmount}
				min={LOAN_DEFAULTS.MIN_PRINCIPAL}
				max={LOAN_DEFAULTS.MAX_PRINCIPAL}
				formatIndian={true}
				placeholder="Desired loan amount"
				icon="indian-rupee"
			/>

			<!-- Requested Tenure -->
			<NumberField
				id="elig-tenure"
				label="Requested Tenure (years)"
				bind:value={requestedTenureYears}
				min={1}
				max={LOAN_DEFAULTS.MAX_TENURE_YEARS}
				formatIndian={false}
				placeholder="Loan tenure in years"
			/>
		</div>
	</div>

	<!-- === Results Section === -->
	{#if result}
		<ResultCard items={resultItems} title="Your Eligibility Estimate" />

		<!-- Breakdown Details -->
		<div class="rounded-xl border border-[var(--dash-border)] bg-white p-5">
			<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">
				How This Was Calculated
			</h3>
			<div class="grid gap-3 text-sm text-[var(--ddsa-secondary-700)] sm:grid-cols-2">
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>FOIR Limit Used</span>
					<span class="font-medium">{(result.maxFoir * 100).toFixed(0)}%</span>
				</div>
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>FOIR Eligible Amount</span>
					<span class="font-medium">₹ {formatNumber(result.foirEligibleAmount)}</span>
				</div>
				{#if result.ltvCappedAmount !== null}
					<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
						<span>LTV Capped Amount</span>
						<span class="font-medium">₹ {formatNumber(result.ltvCappedAmount)}</span>
					</div>
				{/if}
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>Effective Tenure</span>
					<span class="font-medium">{result.effectiveTenureMonths} months</span>
				</div>
			</div>
		</div>

		<!-- Informational Note -->
		<div
			class="rounded-lg border border-[var(--ddsa-warning)] bg-[var(--ddsa-accent-50)] p-4 text-sm text-[var(--ddsa-secondary-700)]"
		>
			<p class="font-medium">Note:</p>
			<p class="mt-1">
				This is an indicative estimate based on simplified rules. Actual eligibility depends on
				credit history, lender-specific policies, income documentation, and other factors. Use the
				full assessment in the dashboard for accurate per-lender results.
			</p>
		</div>

		<!-- Dashboard CTA -->
		{#if variant === 'dashboard'}
			<div class="flex justify-center pt-2">
				<button
					type="button"
					class="rounded-xl bg-[var(--ddsa-primary)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--ddsa-primary-600)] hover:shadow-md"
				>
					Create Case from This Calculation
				</button>
			</div>
		{/if}
	{/if}
</div>
