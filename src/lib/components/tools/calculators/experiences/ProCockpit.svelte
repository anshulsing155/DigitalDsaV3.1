<script lang="ts">
	/**
	 * ProCockpit — Professional split-screen calculator for DSA Dashboard.
	 *
	 * Design philosophy: SPEED + INSIGHT for professionals who run 20+ calculations daily.
	 * - Zero buttons: everything is live, every slider change updates results instantly
	 * - Split-screen: inputs left, results right (always visible, no scrolling to see results)
	 * - What-If panel: auto-generated actionable insights ("add ₹15K income = ₹8.2L more")
	 * - Eligibility ↔ Affordability toggle: one interface, two modes
	 * - CIBIL dots: 5 tappable dots instead of dropdown (Fitts's Law: faster targeting)
	 */
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import { buildPrincipalInterestDoughnut } from '$lib/components/tools/charts/chartConfigs.js';
	import {
		computeRefinedEligibility,
		computeRefinedAffordability,
		EMPLOYMENT_OPTIONS,
		LOAN_TYPE_OPTIONS,
		STATIC_RATES,
		type ApplicantInput,
		type EmploymentCategory,
		type CreditScoreTier,
		type LoanCategory,
		type RefinedEligibilityResult,
		type RefinedAffordabilityResult
	} from '$lib/tools/calculators/smartEligibility.js';
	import {
		generateWhatIfInsights,
		type WhatIfInsight
	} from '$lib/tools/calculators/whatIfEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { DASHBOARD_CONFIG } from '$lib/tools/calculatorConfig.js';

	// --- Props ---
	interface Props {
		config?: CalculatorConfig;
	}
	let { config = DASHBOARD_CONFIG }: Props = $props();

	// =========================================================================
	// STATE
	// =========================================================================

	// Mode: eligibility or affordability (toggled, same inputs)
	let mode: string = $state('eligibility');

	// Core inputs — all live, no "Calculate" button
	let monthlyIncome: number = $state(75_000);
	let employment: string = $state('Salaried');
	let loanType: string = $state('Home Loan');
	let applicantAge: number = $state(30);
	let existingEmis: number = $state(0);
	let requestedTenure: number = $state(20);

	// CIBIL dots (0-4 mapping to tiers)
	let cibilDotIndex: number = $state(3); // Default: Good (730-779)
	const CIBIL_DOTS: { index: number; tier: CreditScoreTier; label: string; range: string }[] = [
		{ index: 0, tier: 'Poor', label: '<650', range: 'Below 650' },
		{ index: 1, tier: 'Fair', label: '650-699', range: '650-699' },
		{ index: 2, tier: 'Average', label: '700-729', range: '700-729' },
		{ index: 3, tier: 'Good', label: '730-779', range: '730-779' },
		{ index: 4, tier: 'Excellent', label: '780+', range: '780 and above' }
	];
	let creditScore = $derived<CreditScoreTier>(CIBIL_DOTS[cibilDotIndex].tier);

	// Co-applicant
	let hasCoApplicant: boolean = $state(false);
	let coApplicantIncome: number = $state(50_000);

	// Affordability-specific
	let availableDownPayment: number = $state(20_00_000);

	// =========================================================================
	// DERIVED: Live calculations (no button needed)
	// =========================================================================

	let applicants = $derived.by((): ApplicantInput[] => {
		const primary: ApplicantInput = {
			monthlyIncome,
			employment: employment as EmploymentCategory,
			age: applicantAge,
			creditScore,
			existingMonthlyEmis: existingEmis
		};
		if (hasCoApplicant && coApplicantIncome > 0) {
			return [
				primary,
				{
					monthlyIncome: coApplicantIncome,
					employment: employment as EmploymentCategory,
					age: applicantAge,
					creditScore,
					existingMonthlyEmis: 0
				}
			];
		}
		return [primary];
	});

	let eligibilityResult = $derived.by((): RefinedEligibilityResult | null => {
		const _scheme = themeState.scheme;
		if (monthlyIncome <= 0) return null;
		return computeRefinedEligibility(applicants, loanType as LoanCategory, requestedTenure);
	});

	let affordabilityResult = $derived.by((): RefinedAffordabilityResult | null => {
		const _scheme = themeState.scheme;
		if (mode !== 'affordability' || monthlyIncome <= 0) return null;
		return computeRefinedAffordability(
			applicants,
			loanType as LoanCategory,
			availableDownPayment,
			requestedTenure
		);
	});

	let activeResult = $derived(mode === 'affordability' ? affordabilityResult : eligibilityResult);

	// What-If insights — recomputed on every input change
	let insights = $derived(
		eligibilityResult
			? generateWhatIfInsights(applicants, loanType as LoanCategory, requestedTenure)
			: ([] as WhatIfInsight[])
	);

	// Pie chart
	let pieChart = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (!eligibilityResult) return null;
		const loan = eligibilityResult.maxLoanAmount;
		const totalPaid = eligibilityResult.monthlyEmi * eligibilityResult.effectiveTenureMonths;
		return buildPrincipalInterestDoughnut(loan, totalPaid - loan);
	});

	// FOIR health indicator
	let foirHealth = $derived.by(() => {
		if (!eligibilityResult) return { label: '—', color: '', percent: 0 };
		const pct = eligibilityResult.foirPercent;
		if (pct <= 45) return { label: 'Excellent', color: 'text-green-600', percent: pct };
		if (pct <= 55)
			return { label: 'Healthy', color: 'text-[var(--ddsa-primary-500)]', percent: pct };
		if (pct <= 65) return { label: 'Stretched', color: 'text-amber-500', percent: pct };
		return { label: 'Tight', color: 'text-red-500', percent: pct };
	});
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- PRO COCKPIT — Split-Screen DSA Dashboard Calculator                   -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
	<!-- ═══ LEFT PANEL: Compact Inputs ═══ -->
	<div class="w-full space-y-5 lg:w-[380px] lg:shrink-0">
		<!-- Mode toggle: Eligibility ↔ Affordability -->
		<div class="flex overflow-hidden rounded-lg border border-[var(--ddsa-primary-300)]">
			<button
				type="button"
				class="flex-1 py-2.5 text-center text-sm font-bold transition-all
					{mode === 'eligibility'
					? 'bg-[var(--ddsa-primary-500)] text-white'
					: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
				onclick={() => (mode = 'eligibility')}>Eligibility</button
			>
			<button
				type="button"
				class="flex-1 py-2.5 text-center text-sm font-bold transition-all
					{mode === 'affordability'
					? 'bg-[var(--ddsa-primary-500)] text-white'
					: 'bg-white text-[var(--ddsa-secondary-500)] hover:bg-[var(--ddsa-primary-50)]'}"
				onclick={() => (mode = 'affordability')}>Affordability</button
			>
		</div>

		<!-- Loan type pills (compact) -->
		<div class="flex flex-wrap gap-1.5">
			{#each LOAN_TYPE_OPTIONS as option (option.value)}
				<button
					type="button"
					class="rounded-md border px-3 py-1.5 text-xs font-semibold transition-all
						{loanType === option.value
						? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
						: 'border-[var(--dash-border)] text-[var(--ddsa-secondary-400)] hover:border-[var(--ddsa-primary-300)]'}"
					onclick={() => (loanType = option.value)}>{option.label}</button
				>
			{/each}
		</div>

		<!-- Income slider -->
		<RangeSliderInput
			id="cockpit-income"
			label="Monthly Income"
			bind:value={monthlyIncome}
			min={25_000}
			max={25_00_000}
			step="auto"
			unit="₹"
			unitPosition="prefix"
		/>

		<!-- Age + Employment row -->
		<div class="flex gap-3">
			<div class="w-20">
				<NumberField
					id="cockpit-age"
					label="Age"
					bind:value={applicantAge}
					min={18}
					max={70}
					formatIndian={false}
				/>
			</div>
			<div class="flex-1">
				<p class="label-modern mb-1">Employment</p>
				<div class="flex flex-wrap gap-1">
					{#each EMPLOYMENT_OPTIONS as option (option.value)}
						<button
							type="button"
							class="rounded-md border px-2 py-1 text-[10px] font-semibold transition-all
								{employment === option.value
								? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
								: 'border-[var(--dash-border)] text-[var(--ddsa-secondary-400)]'}"
							onclick={() => (employment = option.value)}>{option.label.split(' (')[0]}</button
						>
					{/each}
				</div>
			</div>
		</div>

		<!-- CIBIL Dots -->
		<div>
			<p class="label-modern mb-2">CIBIL Score</p>
			<div class="flex items-center gap-1">
				{#each CIBIL_DOTS as dot (dot.index)}
					<button
						type="button"
						onclick={() => (cibilDotIndex = dot.index)}
						class="group relative flex flex-col items-center"
						title={dot.range}
					>
						<div
							class="h-5 w-5 rounded-full border-2 transition-all
							{cibilDotIndex >= dot.index
								? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-500)]'
								: 'border-[var(--ddsa-secondary-200)] bg-white'}"
						></div>
						<span class="mt-1 text-[8px] text-[var(--ddsa-secondary-400)]">{dot.label}</span>
						<!-- Tooltip on hover -->
						<span
							class="pointer-events-none absolute -top-7 rounded bg-[var(--ddsa-secondary)] px-2 py-0.5 text-[9px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100"
						>
							{dot.range}
						</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Existing EMIs -->
		<RangeSliderInput
			id="cockpit-emis"
			label="Existing EMIs"
			bind:value={existingEmis}
			min={0}
			max={Math.max(monthlyIncome * 0.5, 10_000)}
			step={1_000}
			unit="₹"
			unitPosition="prefix"
			formatLabel={(v) => (v === 0 ? 'None' : `₹${(v / 1000).toFixed(0)}K`)}
		/>

		<!-- Co-applicant toggle -->
		<div class="rounded-lg border border-[var(--dash-border)] p-3">
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold text-[var(--ddsa-secondary-600)]">Co-Applicant</span>
				<label class="relative inline-flex cursor-pointer items-center">
					<input type="checkbox" bind:checked={hasCoApplicant} class="peer sr-only" />
					<div
						class="peer h-5 w-9 rounded-full bg-[var(--ddsa-secondary-200)] peer-checked:bg-[var(--ddsa-primary-500)] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
					></div>
				</label>
			</div>
			{#if hasCoApplicant}
				<div class="mt-3">
					<RangeSliderInput
						id="cockpit-co-income"
						label="Co-applicant Income"
						bind:value={coApplicantIncome}
						min={10_000}
						max={25_00_000}
						step="auto"
						unit="₹"
						unitPosition="prefix"
					/>
				</div>
			{/if}
		</div>

		<!-- Down Payment (affordability mode only) -->
		{#if mode === 'affordability'}
			<div
				class="rounded-lg border-2 border-dashed border-[var(--ddsa-primary-200)] bg-[var(--ddsa-primary-50)]/30 p-3"
			>
				<RangeSliderInput
					id="cockpit-dp"
					label="Available Down Payment"
					bind:value={availableDownPayment}
					min={1_00_000}
					max={50_000_000}
					step="auto"
					unit="₹"
					unitPosition="prefix"
				/>
			</div>
		{/if}

		<!-- Tenure -->
		<div class="flex items-center gap-3">
			<span class="text-xs font-semibold whitespace-nowrap text-[var(--ddsa-secondary-600)]"
				>Tenure</span
			>
			<input
				type="range"
				min={1}
				max={30}
				bind:value={requestedTenure}
				class="emi-range-slider flex-1"
				style="--fill: {((requestedTenure - 1) / 29) * 100}%;"
			/>
			<span class="w-10 text-right text-sm font-bold text-[var(--ddsa-secondary)]"
				>{requestedTenure}yr</span
			>
		</div>
	</div>

	<!-- ═══ RIGHT PANEL: Live Results ═══ -->
	<div class="flex-1 space-y-5">
		<!-- Hero Result Card -->
		{#if activeResult}
			<div class="rounded-2xl bg-[var(--ddsa-primary-50)] p-6">
				<div class="flex items-start justify-between">
					<div>
						<p
							class="text-[10px] font-bold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
						>
							{mode === 'eligibility' ? 'Max Eligible Loan' : 'Max Affordable Property'}
						</p>
						<p
							class="mt-1 font-extrabold text-[var(--ddsa-secondary)]"
							style="font-size: clamp(1.5rem, 4vw, 2.5rem); transition: all 0.3s ease;"
						>
							₹ {formatNumber(
								mode === 'eligibility'
									? activeResult.maxLoanAmount
									: (affordabilityResult?.dpConstrained?.maxPropertyCost ??
											activeResult.maxPropertyValue)
							)}
						</p>
					</div>
					<!-- Pie chart (compact) -->
					{#if pieChart}
						<div class="hidden w-24 sm:block">
							<ChartWrapper
								type="pie"
								data={pieChart.data}
								options={{
									...pieChart.options,
									plugins: { ...pieChart.options.plugins, legend: { display: false } }
								}}
								height="80px"
								animated={true}
								animationDuration={600}
							/>
						</div>
					{/if}
				</div>

				<!-- Metrics strip -->
				<div class="mt-4 grid grid-cols-4 gap-2">
					<div class="text-center">
						<p class="text-[9px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">EMI</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							₹{formatNumber(activeResult.monthlyEmi)}
						</p>
					</div>
					<div class="text-center">
						<p class="text-[9px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">Rate</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							{activeResult.interestRate}%
						</p>
					</div>
					<div class="text-center">
						<p class="text-[9px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">
							Tenure
						</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							{Math.round(activeResult.effectiveTenureMonths / 12)}yr
						</p>
					</div>
					<div class="text-center">
						<p class="text-[9px] font-semibold uppercase {foirHealth.color}">FOIR</p>
						<p class="text-sm font-bold {foirHealth.color}">{foirHealth.percent.toFixed(0)}%</p>
						<p class="text-[8px] {foirHealth.color}">{foirHealth.label}</p>
					</div>
				</div>
			</div>

			<!-- Affordability: 3-mode breakdown -->
			{#if mode === 'affordability' && affordabilityResult}
				<div class="grid gap-2 sm:grid-cols-3">
					{#if affordabilityResult.pureEligibility}
						<div class="rounded-xl border border-[var(--dash-border)] bg-white p-3">
							<p class="text-[9px] font-bold text-[var(--ddsa-secondary-400)] uppercase">
								Max Capacity
							</p>
							<p class="text-base font-bold text-[var(--ddsa-secondary)]">
								₹{formatNumber(affordabilityResult.pureEligibility.maxPropertyCost)}
							</p>
							<p class="text-[9px] text-[var(--ddsa-secondary-400)]">If DP unlimited</p>
						</div>
					{/if}
					{#if affordabilityResult.dpConstrained}
						<div
							class="rounded-xl border-2 border-[var(--ddsa-primary-300)] bg-[var(--ddsa-primary-50)] p-3"
						>
							<p class="text-[9px] font-bold text-[var(--ddsa-primary-700)] uppercase">
								With Your DP
							</p>
							<p class="text-base font-bold text-[var(--ddsa-primary-700)]">
								₹{formatNumber(affordabilityResult.dpConstrained.maxPropertyCost)}
							</p>
							<p class="text-[9px] text-[var(--ddsa-secondary-400)]">
								DP ₹{formatNumber(availableDownPayment)}
							</p>
						</div>
					{/if}
					{#if affordabilityResult.bridgeScenario}
						<div class="rounded-xl border border-[var(--dash-border)] bg-white p-3">
							<div class="flex items-center gap-1">
								<p class="text-[9px] font-bold text-[var(--ddsa-secondary-400)] uppercase">
									PL Bridge
								</p>
								<span
									class="rounded bg-[var(--ddsa-primary-100)] px-1 text-[7px] font-bold text-[var(--ddsa-primary-700)]"
									>BOOST</span
								>
							</div>
							<p class="text-base font-bold text-[var(--ddsa-secondary)]">
								₹{formatNumber(affordabilityResult.bridgeScenario.maxPropertyCost)}
							</p>
							<p class="text-[9px] text-[var(--ddsa-secondary-400)]">
								+PL ₹{formatNumber(affordabilityResult.bridgeScenario.bridgeLoanAmount)}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<!-- What-If Insights Panel -->
			{#if insights.length > 0}
				<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
					<p
						class="mb-3 text-[10px] font-bold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						💡 What-If Insights
					</p>
					<div class="space-y-2">
						{#each insights as insight (insight.id)}
							<div
								class="flex items-start gap-3 rounded-lg bg-[var(--ddsa-primary-50)]/50 p-2.5 transition-all hover:bg-[var(--ddsa-primary-50)]"
							>
								<span class="text-base">{insight.icon}</span>
								<div class="flex-1">
									<p class="text-xs font-semibold text-[var(--ddsa-secondary-700)]">
										{insight.label}
									</p>
									<p class="text-[10px] text-[var(--ddsa-primary-700)]">{insight.impact}</p>
								</div>
								<span
									class="rounded bg-[var(--ddsa-primary-100)] px-2 py-0.5 text-[9px] font-bold whitespace-nowrap text-[var(--ddsa-primary-700)]"
								>
									+₹{formatNumber(Math.round(insight.additionalAmount / 100000))}L
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Credibility badge -->
			<p class="text-center text-[9px] text-[var(--ddsa-secondary-300)]">
				Based on policies from 47+ banks · Rates as of April 2026
			</p>

			<!-- CTA -->
			{#if config.cta.enabled}
				<div class="flex justify-center">
					<button
						type="button"
						class="rounded-xl bg-[var(--tool-cta-bg)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--tool-cta-hover)] hover:shadow-md"
					>
						{config.cta.label}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
