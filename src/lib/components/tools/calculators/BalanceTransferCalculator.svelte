<script lang="ts">
	/**
	 * BalanceTransferCalculator -- Compare current loan with a new bank offer.
	 *
	 * Helps DSAs demonstrate refinancing value to their clients by showing:
	 * - Monthly EMI savings
	 * - Total interest savings over the loan lifetime
	 * - Net benefit after processing fees
	 * - Side-by-side comparison of current vs new loan
	 *
	 * Uses Svelte 5 runes ($state, $derived) for reactive calculations.
	 * All math is delegated to btEngine.ts -- this component is UI only.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import { calculateBalanceTransfer } from '$lib/tools/calculators/balanceTransfer/btEngine.js';
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

	/** Outstanding principal balance on the existing loan */
	let outstandingPrincipal: number = $state(LOAN_DEFAULTS.PRINCIPAL);

	/** Current annual interest rate (percentage) */
	let currentInterestRate: number = $state(10.5);

	/** Remaining tenure on the current loan in months */
	let remainingTenureMonths: number = $state(LOAN_DEFAULTS.TENURE_MONTHS);

	/** New annual interest rate offered by the target bank */
	let newInterestRate: number = $state(8.5);

	/** Processing fee as a percentage of outstanding principal */
	let processingFeePercent: number = $state(0.5);

	// =========================================================================
	// DERIVED VALUES
	// =========================================================================

	/**
	 * The complete balance transfer comparison result.
	 * Recalculates automatically whenever any input changes.
	 */
	let result = $derived.by(() => {
		if (outstandingPrincipal <= 0 || currentInterestRate <= 0 || remainingTenureMonths <= 0) {
			return null;
		}

		return calculateBalanceTransfer(
			{
				outstandingPrincipal,
				currentInterestRate,
				remainingTenureMonths
			},
			{
				bankName: 'New Bank',
				newInterestRate,
				processingFeePercent
			}
		);
	});

	/**
	 * Result card items -- the key savings numbers displayed prominently.
	 */
	let resultItems = $derived(
		result
			? [
					{
						label: 'Monthly EMI Saving',
						value: `₹ ${formatNumber(result.monthlyEmiSaving)}`,
						highlight: true,
						subText: result.monthlyEmiSaving > 0 ? 'per month' : 'No saving'
					},
					{
						label: 'Total Interest Saving',
						value: `₹ ${formatNumber(result.totalInterestSaving)}`
					},
					{
						label: 'Processing Fee',
						value: `₹ ${formatNumber(result.processingFee)}`
					},
					{
						label: 'Net Saving',
						value: `₹ ${formatNumber(result.netSaving)}`,
						subText: result.isWorthTransferring ? 'Transfer recommended' : 'Not worth transferring'
					}
				]
			: []
	);

	// =========================================================================
	// EVENT HANDLERS
	// =========================================================================

	/** Handle current interest rate input -- accepts decimal values */
	function handleCurrentRateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			currentInterestRate = value;
		}
	}

	/** Handle new interest rate input -- accepts decimal values */
	function handleNewRateInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			newInterestRate = value;
		}
	}

	/** Handle processing fee input -- accepts decimal values */
	function handleProcessingFeeInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0) {
			processingFeePercent = value;
		}
	}
</script>

<!-- ======================================================================= -->
<!-- BALANCE TRANSFER CALCULATOR UI                                          -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Input Section: Current Loan Details === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Current Loan Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- Outstanding Principal -->
			<NumberField
				id="bt-outstanding"
				label="Outstanding Principal (₹)"
				bind:value={outstandingPrincipal}
				min={LOAN_DEFAULTS.MIN_PRINCIPAL}
				max={LOAN_DEFAULTS.MAX_PRINCIPAL}
				formatIndian={true}
				placeholder="Current outstanding amount"
				icon="indian-rupee"
			/>

			<!-- Current Interest Rate (manual input for decimal support) -->
			<div class="flex w-full flex-col">
				<label for="bt-current-rate" class="label-modern"> Current Interest Rate (% p.a.) </label>
				<div class="group relative">
					<input
						id="bt-current-rate"
						type="number"
						step="0.1"
						min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
						max={LOAN_DEFAULTS.MAX_INTEREST_RATE}
						value={currentInterestRate}
						oninput={handleCurrentRateInput}
						class="input-modern inputText"
						placeholder="e.g. 10.5"
					/>
				</div>
			</div>

			<!-- Remaining Tenure -->
			<NumberField
				id="bt-remaining-tenure"
				label="Remaining Tenure (months)"
				bind:value={remainingTenureMonths}
				min={LOAN_DEFAULTS.MIN_TENURE_MONTHS}
				max={LOAN_DEFAULTS.MAX_TENURE_MONTHS}
				formatIndian={false}
				placeholder="Months remaining"
			/>
		</div>
	</div>

	<!-- === Input Section: New Bank Offer === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">New Bank Offer</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<!-- New Interest Rate (manual input for decimal support) -->
			<div class="flex w-full flex-col">
				<label for="bt-new-rate" class="label-modern"> New Interest Rate (% p.a.) </label>
				<div class="group relative">
					<input
						id="bt-new-rate"
						type="number"
						step="0.1"
						min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
						max={LOAN_DEFAULTS.MAX_INTEREST_RATE}
						value={newInterestRate}
						oninput={handleNewRateInput}
						class="input-modern inputText"
						placeholder="e.g. 8.5"
					/>
				</div>
			</div>

			<!-- Processing Fee Percent (manual input for decimal support) -->
			<div class="flex w-full flex-col">
				<label for="bt-processing-fee" class="label-modern"> Processing Fee (%) </label>
				<div class="group relative">
					<input
						id="bt-processing-fee"
						type="number"
						step="0.1"
						min={0}
						max={5}
						value={processingFeePercent}
						oninput={handleProcessingFeeInput}
						class="input-modern inputText"
						placeholder="e.g. 0.5"
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- === Results Section === -->
	{#if result}
		<ResultCard items={resultItems} title="Balance Transfer Analysis" />

		<!-- Side-by-Side Comparison -->
		<div class="rounded-xl border border-[var(--dash-border)] bg-white p-5">
			<h3 class="mb-4 text-sm font-semibold text-[var(--ddsa-secondary)]">
				Side-by-Side Comparison
			</h3>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-[var(--dash-border)]">
							<th class="px-3 py-2 text-left font-medium text-[var(--ddsa-secondary-600)]"
								>Parameter</th
							>
							<th class="px-3 py-2 text-right font-medium text-[var(--ddsa-secondary-600)]"
								>Current Loan</th
							>
							<th class="px-3 py-2 text-right font-medium text-[var(--ddsa-secondary-600)]"
								>After Transfer</th
							>
						</tr>
					</thead>
					<tbody class="text-[var(--ddsa-secondary-700)]">
						<tr class="border-b border-[var(--ddsa-secondary-50)]">
							<td class="px-3 py-2.5">Monthly EMI</td>
							<td class="px-3 py-2.5 text-right font-medium">₹ {formatNumber(result.currentEmi)}</td
							>
							<td class="px-3 py-2.5 text-right font-medium text-[var(--ddsa-primary)]"
								>₹ {formatNumber(result.newEmi)}</td
							>
						</tr>
						<tr class="border-b border-[var(--ddsa-secondary-50)]">
							<td class="px-3 py-2.5">Interest Rate</td>
							<td class="px-3 py-2.5 text-right font-medium">{currentInterestRate.toFixed(2)}%</td>
							<td class="px-3 py-2.5 text-right font-medium text-[var(--ddsa-primary)]"
								>{newInterestRate.toFixed(2)}%</td
							>
						</tr>
						<tr class="border-b border-[var(--ddsa-secondary-50)]">
							<td class="px-3 py-2.5">Total Interest</td>
							<td class="px-3 py-2.5 text-right font-medium"
								>₹ {formatNumber(result.currentTotalInterest)}</td
							>
							<td class="px-3 py-2.5 text-right font-medium text-[var(--ddsa-primary)]"
								>₹ {formatNumber(result.newTotalInterest)}</td
							>
						</tr>
						<tr>
							<td class="px-3 py-2.5">Total Payment</td>
							<td class="px-3 py-2.5 text-right font-medium"
								>₹ {formatNumber(result.currentTotalPayment)}</td
							>
							<td class="px-3 py-2.5 text-right font-medium text-[var(--ddsa-primary)]"
								>₹ {formatNumber(result.newTotalPayment)}</td
							>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Transfer Verdict -->
		<div
			class="rounded-lg border p-4 text-sm {result.isWorthTransferring
				? 'border-green-200 bg-green-50 text-green-800'
				: 'border-red-200 bg-red-50 text-red-800'}"
		>
			<p class="font-medium">
				{result.isWorthTransferring ? 'Transfer Recommended' : 'Transfer Not Recommended'}
			</p>
			<p class="mt-1">
				{#if result.isWorthTransferring}
					You will save ₹ {formatNumber(result.monthlyEmiSaving)} per month and ₹ {formatNumber(
						result.netSaving
					)} overall (after processing fee of ₹ {formatNumber(result.processingFee)}).
				{:else}
					After accounting for the processing fee of ₹ {formatNumber(result.processingFee)}, the net
					saving is ₹ {formatNumber(result.netSaving)}. The transfer does not offer a meaningful
					financial benefit.
				{/if}
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
