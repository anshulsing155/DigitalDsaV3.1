<script lang="ts">
	/**
	 * AffordabilityCalculator -- Property affordability estimation component.
	 *
	 * Helps users understand the maximum property value they can afford
	 * given their income, existing obligations, and available down payment.
	 *
	 * Uses the existing affordabilityCalculator rule engine functions
	 * (calculatePureEligibility + calculateDpConstrained) for accurate
	 * piecewise-linear DP-to-property mapping with RBI LTV slabs.
	 *
	 * Uses Svelte 5 runes ($state, $derived) for reactive calculations.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import {
		calculatePureEligibility,
		calculateDpConstrained,
		maxAffordableEMI,
		type AffordabilityParams
	} from '$lib/ruleEngine/affordabilityCalculator.js';
	import { formatNumber } from '$lib/i18n';
	import { LOAN_DEFAULTS } from '$lib/tools/constants.js';

	// --- Component Props ---
	interface Props {
		/** 'public' = public page, 'dashboard' = inside DSA dashboard */
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// USER INPUTS (reactive state)
	// =========================================================================

	/** Gross monthly income in INR */
	let monthlyIncome: number = $state(75_000);

	/** Total existing EMI obligations per month */
	let existingEmiAmount: number = $state(0);

	/** Annual interest rate for the home loan */
	let annualInterestRate: number = $state(LOAN_DEFAULTS.INTEREST_RATE);

	/** Requested tenure in years */
	let requestedTenureYears: number = $state(LOAN_DEFAULTS.TENURE_YEARS);

	/** Available down payment amount (optional -- 0 means pure eligibility mode) */
	let availableDownPayment: number = $state(0);

	// =========================================================================
	// DERIVED VALUES
	// =========================================================================

	/** Tenure converted to months for the engine */
	let tenureMonths = $derived(requestedTenureYears * 12);

	/** FOIR limit -- using 50% as a simplified default for the public calculator */
	const MAX_FOIR = 0.5;

	/**
	 * Affordability calculation result.
	 * Uses Mode A (pure eligibility) when no DP is entered,
	 * and Mode B (DP-constrained) when the user provides a down payment.
	 */
	let result = $derived.by(() => {
		if (monthlyIncome <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) return null;

		const params: AffordabilityParams = {
			assessedIncome: monthlyIncome,
			maxFoir: MAX_FOIR,
			existingObligationMonthly: existingEmiAmount,
			securedRate: annualInterestRate,
			tenureMonths,
			availableDP: availableDownPayment,
			unsecuredRate: 14, // Default PL rate -- not used in Mode A/B
			unsecuredTenureMonths: 60 // Default PL tenure -- not used in Mode A/B
		};

		if (availableDownPayment > 0) {
			// Mode B: DP-constrained -- property limited by available down payment
			return calculateDpConstrained(params);
		}

		// Mode A: Pure eligibility -- assumes sufficient DP available
		return calculatePureEligibility(params);
	});

	/** Maximum affordable EMI for display */
	let maxEmi = $derived(
		monthlyIncome > 0 ? maxAffordableEMI(monthlyIncome, MAX_FOIR, existingEmiAmount) : 0
	);

	/**
	 * Result card items -- the key numbers displayed prominently.
	 */
	let resultItems = $derived(
		result
			? [
					{
						label: 'Max Affordable Property',
						value: `₹ ${formatNumber(result.maxPropertyCost)}`,
						highlight: true,
						subText:
							availableDownPayment > 0
								? 'Based on your down payment'
								: 'Assuming sufficient down payment'
					},
					{
						label: 'Max Loan Amount',
						value: `₹ ${formatNumber(result.homeLoanAmount)}`,
						subText: `${result.ltvPercent}% LTV`
					},
					{
						label: 'Monthly EMI',
						value: `₹ ${formatNumber(result.homeLoanEMI)}`
					},
					{
						label: 'Down Payment Required',
						value: `₹ ${formatNumber(result.downPaymentRequired)}`,
						subText: `${result.downPaymentPercent}% of property value`
					}
				]
			: []
	);

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	/** Handle interest rate input -- accepts decimal values */
	function handleInterestRateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			annualInterestRate = value;
		}
	}
</script>

<!-- ======================================================================= -->
<!-- AFFORDABILITY CALCULATOR UI                                             -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Input Section: Income & Loan Details === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Income Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- Monthly Income -->
			<NumberField
				id="afford-monthly-income"
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
				id="afford-existing-emi"
				label="Existing EMI (₹/month)"
				bind:value={existingEmiAmount}
				min={0}
				max={10_000_000}
				formatIndian={true}
				placeholder="Total current EMIs"
				icon="indian-rupee"
			/>

			<!-- Interest Rate (manual input for decimal support) -->
			<div class="flex w-full flex-col">
				<label for="afford-interest-rate" class="label-modern"> Interest Rate (% per annum) </label>
				<div class="group relative">
					<input
						id="afford-interest-rate"
						type="number"
						step="0.1"
						min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
						max={LOAN_DEFAULTS.MAX_INTEREST_RATE}
						value={annualInterestRate}
						oninput={handleInterestRateInput}
						class="input-modern inputText"
						placeholder="e.g. 8.5"
					/>
				</div>
			</div>

			<!-- Tenure -->
			<NumberField
				id="afford-tenure"
				label="Loan Tenure (years)"
				bind:value={requestedTenureYears}
				min={1}
				max={LOAN_DEFAULTS.MAX_TENURE_YEARS}
				formatIndian={false}
				placeholder="Loan tenure in years"
			/>

			<!-- Available Down Payment -->
			<NumberField
				id="afford-down-payment"
				label="Available Down Payment (₹)"
				bind:value={availableDownPayment}
				min={0}
				max={1_000_000_000}
				formatIndian={true}
				placeholder="Leave 0 for max eligibility"
				icon="indian-rupee"
			/>
		</div>
	</div>

	<!-- === Results Section === -->
	{#if result}
		<ResultCard items={resultItems} title="Your Affordability Estimate" />

		<!-- EMI Capacity Details -->
		<div class="rounded-xl border border-[var(--dash-border)] bg-white p-5">
			<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">
				EMI Capacity Breakdown
			</h3>
			<div class="grid gap-3 text-sm text-[var(--ddsa-secondary-700)] sm:grid-cols-2">
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>Max Affordable EMI</span>
					<span class="font-medium">₹ {formatNumber(Math.round(maxEmi))}</span>
				</div>
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>FOIR Limit</span>
					<span class="font-medium">{(MAX_FOIR * 100).toFixed(0)}%</span>
				</div>
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>Calculation Mode</span>
					<span class="font-medium">
						{result.mode === 'eligibility' ? 'Pure Eligibility' : 'Down Payment Constrained'}
					</span>
				</div>
				<div class="flex justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-3 py-2">
					<span>LTV Applied</span>
					<span class="font-medium">{result.ltvPercent}%</span>
				</div>
			</div>
		</div>

		<!-- Informational Note -->
		<div
			class="rounded-lg border border-[var(--ddsa-warning)] bg-[var(--ddsa-accent-50)] p-4 text-sm text-[var(--ddsa-secondary-700)]"
		>
			<p class="font-medium">Note:</p>
			<p class="mt-1">
				This estimate uses RBI-standard LTV slabs and a simplified 50% FOIR limit. Actual
				affordability depends on your credit profile, lender policies, and income documentation.
				Property costs exclude stamp duty and registration charges.
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
