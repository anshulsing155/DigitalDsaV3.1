<script lang="ts">
	/**
	 * ComfortZone — Visual financial spectrum for public pages.
	 *
	 * Design philosophy: SPATIAL THINKING > NUMERICAL THINKING
	 * - Shows a visual "comfort zone" spectrum instead of raw numbers
	 * - Property type anchors (Studio → Villa) make loan amounts tangible
	 * - Progressive disclosure: starts with 1 slider, reveals more on engagement
	 * - Designed to hook visitors in the first 10 seconds
	 */
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import {
		computeQuickEstimate,
		computeRefinedEligibility,
		CREDIT_SCORE_OPTIONS,
		EMPLOYMENT_OPTIONS,
		STATIC_RATES,
		type ApplicantInput,
		type EmploymentCategory,
		type CreditScoreTier,
		type LoanCategory
	} from '$lib/tools/calculators/smartEligibility.js';
	import { formatNumber } from '$lib/i18n';
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';

	// --- Props ---
	interface Props {
		config?: CalculatorConfig;
	}
	let { config = PUBLIC_CONFIG }: Props = $props();

	// =========================================================================
	// STATE
	// =========================================================================

	let monthlyIncome: number = $state(75_000);
	let employment: string = $state('Salaried');
	let showRefined: boolean = $state(false);
	let applicantAge: number = $state(30);
	let creditScore: string = $state('Good');
	let existingEmis: number = $state(0);

	// =========================================================================
	// DERIVED
	// =========================================================================

	let quickResult = $derived.by(() => {
		if (monthlyIncome <= 0) return null;
		return computeQuickEstimate(monthlyIncome, employment as EmploymentCategory, 'Home Loan');
	});

	let refinedResult = $derived.by(() => {
		if (!showRefined || monthlyIncome <= 0) return null;
		return computeRefinedEligibility(
			[
				{
					monthlyIncome,
					employment: employment as EmploymentCategory,
					age: applicantAge,
					creditScore: creditScore as CreditScoreTier,
					existingMonthlyEmis: existingEmis
				}
			],
			'Home Loan',
			20
		);
	});

	let activeProperty = $derived(
		refinedResult?.maxPropertyValue ?? quickResult?.estimatedPropertyValue ?? 0
	);
	let activeLoan = $derived(refinedResult?.maxLoanAmount ?? quickResult?.estimatedLoanAmount ?? 0);
	let activeEmi = $derived(refinedResult?.monthlyEmi ?? quickResult?.estimatedEmi ?? 0);

	// Spectrum position: 0-100% based on property value (₹10L to ₹3Cr range)
	let spectrumPosition = $derived(
		Math.min(100, Math.max(0, ((activeProperty - 10_00_000) / (3_00_00_000 - 10_00_000)) * 100))
	);

	// Property type based on value
	let propertyType = $derived.by(() => {
		if (activeProperty < 20_00_000) return { label: 'Studio Apartment', emoji: '🏢' };
		if (activeProperty < 40_00_000) return { label: '1 BHK', emoji: '🏠' };
		if (activeProperty < 70_00_000) return { label: '2 BHK', emoji: '🏡' };
		if (activeProperty < 1_20_00_000) return { label: '3 BHK', emoji: '🏘️' };
		if (activeProperty < 2_00_00_000) return { label: 'Premium 3 BHK', emoji: '✨' };
		return { label: 'Luxury / Villa', emoji: '🏰' };
	});

	// FOIR usage as percentage of capacity
	let foirPercent = $derived(
		refinedResult ? refinedResult.foirPercent : quickResult ? quickResult.foirUsed : 50
	);

	/** Property anchor markers on the spectrum */
	const ANCHORS = [
		{ position: 5, label: 'Studio', value: '₹15L' },
		{ position: 20, label: '1 BHK', value: '₹30L' },
		{ position: 40, label: '2 BHK', value: '₹60L' },
		{ position: 62, label: '3 BHK', value: '₹1Cr' },
		{ position: 85, label: 'Premium', value: '₹2Cr' }
	];
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- COMFORT ZONE — Visual Financial Spectrum                              -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="space-y-8">
	<!-- ═══ The Spectrum Bar ═══ -->
	<div class="relative rounded-2xl bg-white p-6 shadow-sm">
		<!-- Spectrum gradient bar -->
		<div
			class="relative mb-2 h-3 overflow-hidden rounded-full bg-gradient-to-r from-[var(--ddsa-secondary-100)] via-[var(--ddsa-primary-200)] to-[var(--ddsa-primary-500)]"
		>
			<!-- "You are here" marker -->
			<div
				class="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
				style="left: {spectrumPosition}%;"
			>
				<div
					class="h-6 w-6 -translate-x-1/2 rounded-full border-3 border-white bg-[var(--ddsa-primary-500)] shadow-lg"
				></div>
			</div>
		</div>

		<!-- Property anchors below the spectrum -->
		<div class="relative h-10">
			{#each ANCHORS as anchor (anchor.label)}
				<div
					class="absolute flex flex-col items-center transition-opacity duration-300"
					style="left: {anchor.position}%; transform: translateX(-50%);"
				>
					<div class="h-1.5 w-px bg-[var(--ddsa-secondary-200)]"></div>
					<span class="mt-0.5 text-[9px] font-semibold text-[var(--ddsa-secondary-400)]"
						>{anchor.label}</span
					>
					<span class="text-[8px] text-[var(--ddsa-secondary-300)]">{anchor.value}</span>
				</div>
			{/each}
		</div>

		<!-- "You can afford" statement -->
		<div class="mt-4 text-center">
			<p class="text-sm text-[var(--ddsa-secondary-500)]">You can comfortably afford a</p>
			<p
				class="mt-1 text-2xl font-extrabold text-[var(--ddsa-secondary)] sm:text-3xl"
				style="transition: all 0.4s ease;"
			>
				{propertyType.emoji}
				{propertyType.label}
			</p>
			<p class="mt-1 text-base font-bold text-[var(--ddsa-primary-700)]">
				Property up to ₹ {formatNumber(activeProperty)}
			</p>
			<p class="mt-0.5 text-xs text-[var(--ddsa-secondary-400)]">
				Loan: ₹{formatNumber(activeLoan)} · EMI: ₹{formatNumber(activeEmi)}/month
				{#if foirPercent <= 50}
					· <span class="text-green-600">comfortable</span>
				{:else if foirPercent <= 60}
					· <span class="text-amber-500">manageable</span>
				{:else}
					· <span class="text-red-500">stretched</span>
				{/if}
			</p>
		</div>
	</div>

	<!-- ═══ The Question: Monthly Income ═══ -->
	<div class="mx-auto max-w-lg space-y-6">
		<RangeSliderInput
			id="cz-income"
			label="What's your monthly income?"
			bind:value={monthlyIncome}
			min={25_000}
			max={25_00_000}
			step="auto"
			unit="₹"
			unitPosition="prefix"
		/>

		<!-- Employment pills -->
		<div>
			<p class="mb-2 text-xs font-semibold text-[var(--ddsa-secondary-600)]">How do you earn?</p>
			<div class="flex flex-wrap gap-2">
				{#each EMPLOYMENT_OPTIONS as option (option.value)}
					<button
						type="button"
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-all
							{employment === option.value
							? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
							: 'border-[var(--dash-border)] text-[var(--ddsa-secondary-500)] hover:border-[var(--ddsa-primary-300)]'}"
						onclick={() => (employment = option.value)}>{option.label}</button
					>
				{/each}
			</div>
		</div>

		<!-- Progressive reveal -->
		{#if !showRefined}
			<button
				type="button"
				onclick={() => (showRefined = true)}
				class="mx-auto block text-sm font-medium text-[var(--ddsa-primary-500)] underline decoration-dotted underline-offset-4 hover:text-[var(--ddsa-primary-700)]"
			>
				+ Sharpen your estimate with a few more details
			</button>
		{/if}

		{#if showRefined}
			<div
				class="space-y-4 rounded-xl border border-dashed border-[var(--ddsa-primary-200)] bg-[var(--ddsa-primary-50)]/30 p-4"
			>
				<div class="grid gap-4 sm:grid-cols-3">
					<NumberField
						id="cz-age"
						label="Your Age"
						bind:value={applicantAge}
						min={18}
						max={70}
						formatIndian={false}
					/>
					<SelectField
						id="cz-credit"
						label="Credit Score"
						options={CREDIT_SCORE_OPTIONS}
						bind:value={creditScore}
					/>
					<NumberField
						id="cz-emis"
						label="Existing EMIs"
						bind:value={existingEmis}
						min={0}
						max={monthlyIncome}
						formatIndian={true}
						icon="indian-rupee"
					/>
				</div>
			</div>
		{/if}
	</div>

	<!-- ═══ Insight Card ═══ -->
	{#if activeProperty > 0}
		<div class="mx-auto max-w-lg rounded-xl border border-[var(--dash-border)] bg-white p-5">
			<p class="text-xs font-bold tracking-widest text-[var(--ddsa-secondary-400)] uppercase">
				Your Financial Snapshot
			</p>
			<div class="mt-3 space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-base">🏠</span>
					<p class="text-sm text-[var(--ddsa-secondary-600)]">
						You can comfortably afford a <strong>{propertyType.label}</strong> in most Tier-1 cities
					</p>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-base">💪</span>
					<p class="text-sm text-[var(--ddsa-secondary-600)]">
						Your FOIR is {foirPercent.toFixed(0)}% —
						{#if foirPercent <= 50}healthy room to breathe
						{:else if foirPercent <= 60}within comfort limits
						{:else}you may want to reduce existing EMIs
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- ═══ CTA ═══ -->
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

	{#if config.branding?.showWatermark}
		<p class="text-center text-[10px] text-[var(--ddsa-secondary-300)]">
			Powered by <a href="https://digitaldsa.com" target="_blank" class="underline underline-offset-4">DigitalDSA</a>
		</p>
	{/if}
</div>
