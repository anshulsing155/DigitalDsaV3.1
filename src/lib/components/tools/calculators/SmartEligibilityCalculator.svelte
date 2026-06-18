<script lang="ts">
	/**
	 * SmartEligibilityCalculator — Progressive 3-step eligibility calculator.
	 *
	 * Step 1: Quick Estimate (3 fields → instant ballpark)
	 * Step 2: Refined Calculation (add age, credit score, EMIs, co-applicant)
	 * Step 3: Full Analysis (dashboard only, calls rule engine for per-lender results)
	 *
	 * White-label ready: receives CalculatorConfig prop.
	 * Uses range sliders for key inputs (consistent with EMI Calculator UX).
	 */
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import { buildPrincipalInterestDoughnut } from '$lib/components/tools/charts/chartConfigs.js';
	import {
		computeQuickEstimate,
		computeRefinedEligibility,
		CREDIT_SCORE_OPTIONS,
		EMPLOYMENT_OPTIONS,
		LOAN_TYPE_OPTIONS,
		STATIC_RATES,
		type ApplicantInput,
		type EmploymentCategory,
		type CreditScoreTier,
		type LoanCategory,
		type QuickEstimateResult,
		type RefinedEligibilityResult
	} from '$lib/tools/calculators/smartEligibility.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { DASHBOARD_CONFIG, PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';

	// --- Props ---
	interface Props {
		config?: CalculatorConfig;
	}
	let { config = PUBLIC_CONFIG }: Props = $props();

	// =========================================================================
	// STATE — Which step is the user on?
	// =========================================================================

	/** Current calculation step: 1 = quick, 2 = refined, 3 = full analysis */
	let currentStep: number = $state(1);

	// =========================================================================
	// STEP 1 INPUTS (always visible)
	// =========================================================================

	let monthlyIncome: number = $state(75_000);
	let employment: string = $state('Salaried');
	let loanType: string = $state('Home Loan');

	// =========================================================================
	// STEP 2 INPUTS (revealed when user clicks "Refine")
	// =========================================================================

	let applicantAge: number = $state(30);
	let creditScore: string = $state('Good');
	let existingEmis: number = $state(0);
	let requestedTenure: number = $state(20);

	// Co-applicant toggle + fields
	let hasCoApplicant: boolean = $state(false);
	let coApplicantIncome: number = $state(50_000);
	let coApplicantEmployment: string = $state('Salaried');
	let coApplicantCreditScore: string = $state('Good');

	// =========================================================================
	// DERIVED CALCULATIONS
	// =========================================================================

	/** Step 1 result — instant quick estimate */
	let quickResult = $derived.by(() => {
		const _scheme = themeState.scheme;
		if (monthlyIncome <= 0) return null;
		return computeQuickEstimate(
			monthlyIncome,
			employment as EmploymentCategory,
			loanType as LoanCategory
		);
	});

	/** Step 2 result — refined with all inputs */
	let refinedResult = $derived.by(() => {
		const _scheme = themeState.scheme;
		if (currentStep < 2 || monthlyIncome <= 0) return null;

		const applicants: ApplicantInput[] = [
			{
				monthlyIncome,
				employment: employment as EmploymentCategory,
				age: applicantAge,
				creditScore: creditScore as CreditScoreTier,
				existingMonthlyEmis: existingEmis
			}
		];

		if (hasCoApplicant && coApplicantIncome > 0) {
			applicants.push({
				monthlyIncome: coApplicantIncome,
				employment: coApplicantEmployment as EmploymentCategory,
				age: applicantAge, // Simplified: use same age for co-applicant
				creditScore: coApplicantCreditScore as CreditScoreTier,
				existingMonthlyEmis: 0
			});
		}

		return computeRefinedEligibility(applicants, loanType as LoanCategory, requestedTenure);
	});

	/** The active result (step 2 takes precedence if available) */
	let activeResult = $derived(refinedResult || quickResult);

	/** Pie chart for the active result */
	let pieChart = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (!activeResult) return null;
		const principal =
			'maxLoanAmount' in activeResult
				? activeResult.maxLoanAmount
				: activeResult.estimatedLoanAmount;
		const totalPaid =
			'monthlyEmi' in activeResult
				? activeResult.monthlyEmi * activeResult.effectiveTenureMonths
				: activeResult.estimatedEmi * activeResult.tenureUsed;
		const interest = totalPaid - principal;
		return buildPrincipalInterestDoughnut(principal, interest);
	});

	// =========================================================================
	// HELPERS
	// =========================================================================

	function goToStep2() {
		currentStep = 2;
	}

	function getRate(): string {
		if (refinedResult) return refinedResult.interestRate.toFixed(2);
		if (quickResult) return quickResult.estimatedRate.toFixed(2);
		return '—';
	}

	function getLoan(): number {
		if (refinedResult) return refinedResult.maxLoanAmount;
		if (quickResult) return quickResult.estimatedLoanAmount;
		return 0;
	}

	function getEmi(): number {
		if (refinedResult) return refinedResult.monthlyEmi;
		if (quickResult) return quickResult.estimatedEmi;
		return 0;
	}

	function getProperty(): number {
		if (refinedResult) return refinedResult.maxPropertyValue;
		if (quickResult) return quickResult.estimatedPropertyValue;
		return 0;
	}

	function getTenure(): number {
		if (refinedResult) return Math.round(refinedResult.effectiveTenureMonths / 12);
		if (quickResult) return Math.round(quickResult.tenureUsed / 12);
		return 0;
	}
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- SMART ELIGIBILITY CALCULATOR                                          -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="space-y-8">
	<!-- ═══ STEP 1: Quick Inputs (Always Visible) ═══ -->
	<div class="grid gap-8 lg:grid-cols-5">
		<!-- LEFT: Inputs -->
		<div class="space-y-6 lg:col-span-3">
			<!-- Loan Type Selector -->
			<div class="flex flex-wrap gap-2">
				{#each LOAN_TYPE_OPTIONS as option (option.value)}
					<button
						type="button"
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-all
							{loanType === option.value
							? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
							: 'border-[var(--dash-border)] bg-white text-[var(--ddsa-secondary-500)] hover:border-[var(--ddsa-primary-300)]'}"
						onclick={() => (loanType = option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<!-- Monthly Income Slider -->
			<RangeSliderInput
				id="elig-income"
				label="Monthly Income"
				bind:value={monthlyIncome}
				min={25_000}
				max={10_000_000}
				step="auto"
				unit="₹"
				unitPosition="prefix"
			/>

			<!-- Employment Type -->
			<div class="flex flex-wrap gap-2">
				{#each EMPLOYMENT_OPTIONS as option (option.value)}
					<button
						type="button"
						class="rounded-lg border px-4 py-2 text-sm font-medium transition-all
							{employment === option.value
							? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
							: 'border-[var(--dash-border)] bg-white text-[var(--ddsa-secondary-500)] hover:border-[var(--ddsa-primary-300)]'}"
						onclick={() => (employment = option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<!-- Step 2 reveal button (only shown when on Step 1) -->
			{#if currentStep === 1}
				<button
					type="button"
					onclick={goToStep2}
					class="mt-2 text-sm font-medium text-[var(--ddsa-primary-500)] underline decoration-dotted underline-offset-4 transition-colors hover:text-[var(--ddsa-primary-700)]"
				>
					+ Add more details for accurate results
				</button>
			{/if}

			<!-- ═══ STEP 2: Refined Inputs (revealed on click) ═══ -->
			{#if currentStep >= 2}
				<div
					class="space-y-5 rounded-xl border border-dashed border-[var(--ddsa-primary-200)] bg-[var(--ddsa-primary-50)]/30 p-4"
				>
					<p
						class="text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
					>
						Refine your estimate
					</p>

					<div class="grid gap-4 sm:grid-cols-2">
						<NumberField
							id="elig-age"
							label="Your Age"
							bind:value={applicantAge}
							min={18}
							max={70}
							formatIndian={false}
							icon="user"
						/>

						<SelectField
							id="elig-credit"
							label="Credit Score (CIBIL)"
							options={CREDIT_SCORE_OPTIONS}
							bind:value={creditScore}
						/>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<NumberField
							id="elig-emis"
							label="Existing EMIs (₹/month)"
							bind:value={existingEmis}
							min={0}
							max={monthlyIncome}
							formatIndian={true}
							icon="indian-rupee"
						/>

						<NumberField
							id="elig-tenure"
							label="Preferred Tenure (Years)"
							bind:value={requestedTenure}
							min={1}
							max={30}
							formatIndian={false}
						/>
					</div>

					<!-- Co-applicant toggle -->
					<div class="flex items-center gap-3">
						<label class="relative inline-flex cursor-pointer items-center">
							<input type="checkbox" bind:checked={hasCoApplicant} class="peer sr-only" />
							<div
								class="peer h-5 w-9 rounded-full bg-[var(--ddsa-secondary-200)] peer-checked:bg-[var(--ddsa-primary-500)] after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"
							></div>
						</label>
						<span class="text-sm font-medium text-[var(--ddsa-secondary-600)]">
							Add a co-applicant to increase eligibility
						</span>
					</div>

					<!-- Co-applicant fields (if toggled on) -->
					{#if hasCoApplicant}
						<div class="space-y-4 rounded-lg border border-[var(--dash-border)] bg-white p-4">
							<p class="text-xs font-semibold text-[var(--ddsa-secondary-400)]">
								Co-Applicant Details
							</p>
							<div class="grid gap-4 sm:grid-cols-3">
								<NumberField
									id="co-income"
									label="Monthly Income"
									bind:value={coApplicantIncome}
									min={10_000}
									max={10_000_000}
									formatIndian={true}
									icon="indian-rupee"
								/>
								<SelectField
									id="co-employment"
									label="Employment"
									options={[...EMPLOYMENT_OPTIONS]}
									bind:value={coApplicantEmployment}
								/>
								<SelectField
									id="co-credit"
									label="Credit Score"
									options={CREDIT_SCORE_OPTIONS}
									bind:value={coApplicantCreditScore}
								/>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- RIGHT: Results Panel -->
		<div class="flex flex-col items-center justify-start lg:col-span-2">
			{#if activeResult}
				<!-- Eligible Loan Amount (hero number) -->
				<div class="mb-4 w-full rounded-xl bg-[var(--ddsa-primary-50)] p-5 text-center">
					<p
						class="text-xs font-semibold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						{currentStep === 1 ? 'Estimated' : ''} Eligible Loan
					</p>
					<p
						class="mt-1 text-3xl font-extrabold text-[var(--ddsa-secondary)] sm:text-4xl"
						style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
					>
						₹ {formatNumber(getLoan())}
					</p>

					{#if currentStep === 1}
						<p class="mt-1 text-[10px] text-[var(--ddsa-secondary-400)]">
							Quick estimate · Add details for accuracy ↓
						</p>
					{/if}
				</div>

				<!-- Key metrics grid -->
				<div class="mb-4 grid w-full grid-cols-2 gap-3">
					<div class="rounded-lg bg-white p-3 text-center shadow-sm">
						<p class="text-[10px] font-medium text-[var(--ddsa-secondary-400)] uppercase">
							Monthly EMI
						</p>
						<p class="mt-0.5 text-base font-bold text-[var(--ddsa-secondary)]">
							₹ {formatNumber(getEmi())}
						</p>
					</div>
					<div class="rounded-lg bg-white p-3 text-center shadow-sm">
						<p class="text-[10px] font-medium text-[var(--ddsa-secondary-400)] uppercase">
							Interest Rate
						</p>
						<p class="mt-0.5 text-base font-bold text-[var(--ddsa-secondary)]">{getRate()} %</p>
					</div>
					<div class="rounded-lg bg-white p-3 text-center shadow-sm">
						<p class="text-[10px] font-medium text-[var(--ddsa-secondary-400)] uppercase">
							Max Property
						</p>
						<p class="mt-0.5 text-base font-bold text-[var(--ddsa-secondary)]">
							₹ {formatNumber(getProperty())}
						</p>
					</div>
					<div class="rounded-lg bg-white p-3 text-center shadow-sm">
						<p class="text-[10px] font-medium text-[var(--ddsa-secondary-400)] uppercase">Tenure</p>
						<p class="mt-0.5 text-base font-bold text-[var(--ddsa-secondary)]">
							{getTenure()} Years
						</p>
					</div>
				</div>

				<!-- Pie chart -->
				{#if pieChart}
					<div class="w-full max-w-[240px]">
						<p class="mb-2 text-center text-xs font-semibold text-[var(--ddsa-secondary-500)]">
							Payment Break-up
						</p>
						<ChartWrapper
							type="pie"
							data={pieChart.data}
							options={pieChart.options}
							height="180px"
							animated={true}
							animationDuration={800}
						/>
					</div>
				{/if}

				<!-- Factors summary (Step 2 only) -->
				{#if refinedResult && currentStep >= 2}
					<div class="mt-4 w-full space-y-2">
						<p class="text-xs font-semibold text-[var(--ddsa-secondary-400)] uppercase">
							Key Factors
						</p>

						<div class="flex items-center gap-2 text-xs text-[var(--ddsa-secondary-600)]">
							<span class="inline-block h-2 w-2 rounded-full bg-[var(--ddsa-primary-500)]"></span>
							FOIR capacity: ₹{formatNumber(Math.round(refinedResult.maxEmiCapacity))}/month
						</div>
						<div class="flex items-center gap-2 text-xs text-[var(--ddsa-secondary-600)]">
							<span class="inline-block h-2 w-2 rounded-full bg-[var(--ddsa-primary-500)]"></span>
							Rate based on {creditScore} credit ({STATIC_RATES[creditScore as CreditScoreTier]}%)
						</div>
						{#if existingEmis > 0}
							<div class="flex items-center gap-2 text-xs text-[var(--ddsa-error)]">
								<span class="inline-block h-2 w-2 rounded-full bg-[var(--ddsa-error)]"></span>
								Existing EMIs reduce capacity by ₹{formatNumber(existingEmis)}/month
							</div>
						{/if}
						{#if hasCoApplicant}
							<div class="flex items-center gap-2 text-xs text-[var(--ddsa-success)]">
								<span class="inline-block h-2 w-2 rounded-full bg-[var(--ddsa-success)]"></span>
								Co-applicant adds ₹{formatNumber(coApplicantIncome)} income
							</div>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</div>

	<!-- ═══ CTA Button ═══ -->
	{#if config.cta.enabled && activeResult}
		<div class="flex justify-center pt-2">
			<button
				type="button"
				class="rounded-xl bg-[var(--tool-cta-bg)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--tool-cta-hover)] hover:shadow-md"
			>
				{config.cta.label}
			</button>
		</div>
	{/if}

	<!-- ═══ Watermark (embed free tier) ═══ -->
	{#if config.branding?.showWatermark}
		<p class="text-center text-[10px] text-[var(--ddsa-secondary-300)]">
			Powered by <a href="https://digitaldsa.com" target="_blank" class="underline underline-offset-4">DigitalDSA</a>
		</p>
	{/if}
</div>
