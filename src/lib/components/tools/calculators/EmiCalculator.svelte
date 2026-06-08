<script lang="ts">
	/**
	 * EmiCalculator — Premium EMI Calculator with animated charts.
	 *
	 * Redesigned based on the reference image:
	 * - Range sliders with colored fill tracks for each input
	 * - Combined bar+line chart (Principal/Interest bars + Balance line)
	 * - Pie chart with percentage breakdown
	 * - Colored column headers in amortization table
	 * - Smooth animated chart transitions
	 * - Yr/Mo toggle for tenure
	 * - Calendar/Financial year toggle for schedule
	 *
	 * All math delegated to emiEngine.ts — this is UI only.
	 */
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import AmortizationTable from '$lib/components/tools/shared/AmortizationTable.svelte';
	import {
		buildPrincipalInterestDoughnut,
		buildCombinedAmortizationChart
	} from '$lib/components/tools/charts/chartConfigs.js';
	import { computeFullEmiResult } from '$lib/tools/calculators/emiEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { LOAN_DEFAULTS } from '$lib/tools/constants.js';
	import { themeState } from '$lib/stores/theme.svelte';

	// --- Props ---
	interface Props {
		variant?: 'public' | 'dashboard';
	}
	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// USER INPUTS
	// =========================================================================

	let loanPrincipal: number = $state(LOAN_DEFAULTS.PRINCIPAL);
	let annualInterestRate: number = $state(LOAN_DEFAULTS.INTEREST_RATE);
	let tenureValue: number = $state(LOAN_DEFAULTS.TENURE_YEARS);
	let frequencyUnit: string = $state('Years');
	let yearGrouping: string = $state('Calendar Year');

	// =========================================================================
	// DERIVED VALUES
	// =========================================================================

	let tenureInMonths = $derived(frequencyUnit === 'Years' ? tenureValue * 12 : tenureValue);

	let emiResult = $derived.by(() => {
		if (loanPrincipal <= 0 || annualInterestRate <= 0 || tenureInMonths <= 0) return null;
		return computeFullEmiResult(loanPrincipal, annualInterestRate, tenureInMonths);
	});

	let activeYearlySummary = $derived(
		emiResult
			? yearGrouping === 'Calendar Year'
				? emiResult.calendarYearSummary
				: emiResult.financialYearSummary
			: []
	);

	/**
	 * Pie chart: principal vs interest.
	 * Depends on themeState.scheme so it rebuilds with new colors when user switches theme.
	 * (Chart.js renders to canvas — it reads colors once, so we must rebuild the config.)
	 */
	let pieChart = $derived.by(() => {
		// Track scheme + resolved theme to trigger rebuild on theme change
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (!emiResult) return null;
		return buildPrincipalInterestDoughnut(loanPrincipal, emiResult.totalInterestPaid);
	});

	/** Combined bar+line chart: yearly breakdown + balance curve */
	let combinedChart = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (activeYearlySummary.length === 0) return null;
		return buildCombinedAmortizationChart(activeYearlySummary);
	});

	/** Percentage splits for display */
	let principalPercent = $derived(
		emiResult ? ((loanPrincipal / emiResult.totalAmountPaid) * 100).toFixed(1) : '0'
	);
	let interestPercent = $derived(
		emiResult ? ((emiResult.totalInterestPaid / emiResult.totalAmountPaid) * 100).toFixed(1) : '0'
	);

	// =========================================================================
	// SLIDER CONFIGURATION
	// =========================================================================

	/**
	 * Loan amount snap points — key breakpoints shown as tick marks on the slider.
	 * These represent common loan amounts in India (25L, 50L, 75L, 1Cr, etc.)
	 */
	const LOAN_SNAP_POINTS = [25_00_000, 50_00_000, 75_00_000, 1_00_00_000, 2_00_00_000, 5_00_00_000];

	/** Tenure slider: depends on unit */
	let tenureStep = $derived(frequencyUnit === 'Years' ? 1 : 6);
	let tenureMin = $derived(frequencyUnit === 'Years' ? 1 : 12);
	let tenureMax = $derived(
		frequencyUnit === 'Years' ? LOAN_DEFAULTS.MAX_TENURE_YEARS : LOAN_DEFAULTS.MAX_TENURE_MONTHS
	);

	// =========================================================================
	// HANDLERS
	// =========================================================================

	function setFrequencyUnit(unit: string) {
		if (unit === 'Years' && frequencyUnit === 'Months') {
			tenureValue = Math.round(tenureValue / 12) || 1;
		} else if (unit === 'Months' && frequencyUnit === 'Years') {
			tenureValue = tenureValue * 12;
		}
		frequencyUnit = unit;
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- EMI CALCULATOR — PREMIUM LAYOUT                                       -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="space-y-8">
	<!-- ═══ INPUT SECTION ═══ -->
	<!-- Two-column layout: sliders on left, results on right (desktop) -->
	<div class="grid gap-8 lg:grid-cols-5">
		<!-- LEFT: Input Sliders (3/5 width on desktop) -->
		<div class="space-y-6 lg:col-span-3">
			<!-- Loan Amount Slider — uses 'auto' step for adaptive precision -->
			<RangeSliderInput
				id="emi-amount"
				label="Loan Amount"
				bind:value={loanPrincipal}
				min={LOAN_DEFAULTS.MIN_PRINCIPAL}
				max={100_000_000}
				step="auto"
				unit="₹"
				unitPosition="prefix"
				snapPoints={LOAN_SNAP_POINTS}
			/>

			<!-- Interest Rate Slider — 0.1% steps for precise control -->
			<RangeSliderInput
				id="emi-rate"
				label="Interest Rate"
				bind:value={annualInterestRate}
				min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
				max={20}
				step={0.1}
				unit="%"
				unitPosition="suffix"
				allowDecimals={true}
				formatLabel={(v) => `${v}%`}
			/>

			<!-- Loan Tenure Slider + Yr/Mo Toggle -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm font-semibold text-[var(--ddsa-secondary-700)]">Loan Tenure</span>

					<!-- Yr / Mo toggle (inline with label) -->
					<div class="flex overflow-hidden rounded-md border border-[var(--ddsa-primary-300)]">
						<button
							type="button"
							class="px-3 py-1 text-xs font-bold transition-all
								{frequencyUnit === 'Years'
								? 'bg-[var(--ddsa-primary-500)] text-white'
								: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
							onclick={() => setFrequencyUnit('Years')}>Yr</button
						>
						<button
							type="button"
							class="px-3 py-1 text-xs font-bold transition-all
								{frequencyUnit === 'Months'
								? 'bg-[var(--ddsa-primary-500)] text-white'
								: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
							onclick={() => setFrequencyUnit('Months')}>Mo</button
						>
					</div>
				</div>

				<RangeSliderInput
					id="emi-tenure"
					label=""
					bind:value={tenureValue}
					min={tenureMin}
					max={tenureMax}
					step={tenureStep}
					unit={frequencyUnit === 'Years' ? '' : ''}
					formatLabel={(v) => (frequencyUnit === 'Years' ? `${v}` : `${v}`)}
				/>
			</div>
		</div>

		<!-- RIGHT: Key Results + Pie Chart (2/5 width on desktop) -->
		{#if emiResult}
			<div class="flex flex-col items-center justify-center lg:col-span-2">
				<!-- EMI Amount (hero number) -->
				<div class="mb-4 text-center">
					<p
						class="text-xs font-semibold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						Loan EMI
					</p>
					<p
						class="mt-1 text-3xl font-extrabold text-[var(--ddsa-secondary)] sm:text-4xl"
						style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
					>
						₹ {formatNumber(emiResult.monthlyEmiAmount)}
					</p>
				</div>

				<!-- Total Interest -->
				<div class="mb-1 text-center">
					<p class="text-[11px] text-[var(--ddsa-secondary-400)]">Total Interest Payable</p>
					<p class="text-base font-bold text-[var(--ddsa-secondary)]">
						₹ {formatNumber(Math.round(emiResult.totalInterestPaid))}
					</p>
				</div>

				<!-- Total Payment -->
				<div class="mb-5 text-center">
					<p class="text-[11px] text-[var(--ddsa-secondary-400)]">
						Total Payment (Principal + Interest)
					</p>
					<p class="text-base font-bold text-[var(--ddsa-secondary)]">
						₹ {formatNumber(Math.round(emiResult.totalAmountPaid))}
					</p>
				</div>

				<!-- Pie Chart: Break-up of Total Payment -->
				{#if pieChart}
					<div class="w-full max-w-[260px]">
						<p class="mb-2 text-center text-xs font-semibold text-[var(--ddsa-secondary-500)]">
							Break-up of Total Payment
						</p>
						<div class="relative">
							<ChartWrapper
								type="pie"
								data={pieChart.data}
								options={pieChart.options}
								height="200px"
								animated={true}
								animationDuration={1000}
							/>
							<!-- Percentage labels overlaid on the pie -->
							<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
								<div class="flex gap-8 text-xs font-bold text-white drop-shadow-md">
									<span>{principalPercent}%</span>
									<span>{interestPercent}%</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ═══ COMBINED CHART: Bar + Line with dual Y-axes ═══ -->
	{#if combinedChart}
		<div class="space-y-3">
			<!-- Schedule controls row -->
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--dash-border)] bg-white px-4 py-3"
			>
				<p class="text-sm font-medium text-[var(--ddsa-secondary-600)]">
					Schedule showing EMI payments
				</p>

				<!-- Calendar / Financial Year toggle -->
				<div class="flex overflow-hidden rounded-lg border border-[var(--ddsa-secondary-200)]">
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-semibold transition-all
							{yearGrouping === 'Calendar Year'
							? 'bg-[var(--ddsa-secondary)] text-white'
							: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-secondary-50)]'}"
						onclick={() => (yearGrouping = 'Calendar Year')}>Calendar Year wise</button
					>
					<button
						type="button"
						class="px-3 py-1.5 text-xs font-semibold transition-all
							{yearGrouping === 'Financial Year'
							? 'bg-[var(--ddsa-secondary)] text-white'
							: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-secondary-50)]'}"
						onclick={() => (yearGrouping = 'Financial Year')}>Financial Year wise</button
					>
				</div>
			</div>

			<!-- The main combined chart -->
			<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
				<ChartWrapper
					type="bar"
					data={combinedChart.data}
					options={combinedChart.options}
					height="360px"
					animated={true}
					animationDuration={1200}
				/>
			</div>
		</div>
	{/if}

	<!-- ═══ AMORTIZATION TABLE ═══ -->
	{#if activeYearlySummary.length > 0}
		<AmortizationTable yearlySummary={activeYearlySummary} />
	{/if}

	<!-- ═══ DASHBOARD CTA ═══ -->
	{#if variant === 'dashboard' && emiResult}
		<div class="flex justify-center pt-2">
			<button
				type="button"
				class="rounded-xl bg-[var(--tool-cta-bg)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--tool-cta-hover)] hover:shadow-md"
			>
				Create Case from This Calculation
			</button>
		</div>
	{/if}
</div>
