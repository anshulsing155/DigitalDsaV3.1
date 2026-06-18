<script lang="ts">
	/**
	 * SmartAffordabilityCalculator — "What's the max property I can afford?"
	 *
	 * Uses V3's 3-mode affordability engine:
	 * Mode A: Pure Eligibility — max property if down payment is unlimited
	 * Mode B: DP Constrained — max property with your actual down payment
	 * Mode C: Bridge Scenario — boost property value using a short-term personal loan
	 *
	 * Progressive: starts with Quick Estimate, refines with more details.
	 * White-label ready: receives CalculatorConfig prop.
	 */
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import { buildPrincipalInterestDoughnut } from '$lib/components/tools/charts/chartConfigs.js';
	import {
		computeRefinedAffordability,
		computeQuickEstimate,
		CREDIT_SCORE_OPTIONS,
		EMPLOYMENT_OPTIONS,
		LOAN_TYPE_OPTIONS,
		STATIC_RATES,
		type ApplicantInput,
		type EmploymentCategory,
		type CreditScoreTier,
		type LoanCategory,
		type RefinedAffordabilityResult
	} from '$lib/tools/calculators/smartEligibility.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import type { CalculatorConfig } from '$lib/tools/calculatorConfig.js';
	import { PUBLIC_CONFIG } from '$lib/tools/calculatorConfig.js';

	// --- Props ---
	interface Props {
		config?: CalculatorConfig;
	}
	let { config = PUBLIC_CONFIG }: Props = $props();

	// =========================================================================
	// INPUTS
	// =========================================================================

	// Core inputs (always visible)
	let monthlyIncome: number = $state(75_000);
	let employment: string = $state('Salaried');
	let loanType: string = $state('Home Loan');
	let availableDownPayment: number = $state(20_00_000);

	// Refine inputs
	let showRefined: boolean = $state(false);
	let applicantAge: number = $state(30);
	let creditScore: string = $state('Good');
	let existingEmis: number = $state(0);
	let otherIncome: number = $state(0);
	let requestedTenure: number = $state(20);

	// Co-applicant
	let hasCoApplicant: boolean = $state(false);
	let coApplicantIncome: number = $state(50_000);
	let coApplicantEmployment: string = $state('Salaried');
	let coApplicantCreditScore: string = $state('Good');

	// Which result mode to highlight
	let activeMode: string = $state('dpConstrained');

	// =========================================================================
	// DERIVED
	// =========================================================================

	let result = $derived.by((): RefinedAffordabilityResult | null => {
		const _scheme = themeState.scheme;
		if (monthlyIncome <= 0) return null;

		const effectiveIncome = monthlyIncome + Math.round((otherIncome || 0) * 0.5);

		const applicants: ApplicantInput[] = [
			{
				monthlyIncome: effectiveIncome,
				employment: employment as EmploymentCategory,
				age: showRefined ? applicantAge : 30,
				creditScore: (showRefined ? creditScore : 'Good') as CreditScoreTier,
				existingMonthlyEmis: showRefined ? existingEmis : 0,
				otherMonthlyIncome: otherIncome
			}
		];

		if (hasCoApplicant && coApplicantIncome > 0) {
			applicants.push({
				monthlyIncome: coApplicantIncome,
				employment: coApplicantEmployment as EmploymentCategory,
				age: applicantAge,
				creditScore: coApplicantCreditScore as CreditScoreTier,
				existingMonthlyEmis: 0
			});
		}

		return computeRefinedAffordability(
			applicants,
			loanType as LoanCategory,
			availableDownPayment,
			showRefined ? requestedTenure : 20
		);
	});

	/** Get the currently selected mode's property value */
	let highlightedProperty = $derived.by(() => {
		if (!result) return 0;
		if (activeMode === 'pureEligibility' && result.pureEligibility)
			return result.pureEligibility.maxPropertyCost;
		if (activeMode === 'bridge' && result.bridgeScenario)
			return result.bridgeScenario.maxPropertyCost;
		if (result.dpConstrained) return result.dpConstrained.maxPropertyCost;
		return result.maxPropertyValue;
	});

	let highlightedLoan = $derived.by(() => {
		if (!result) return 0;
		if (activeMode === 'pureEligibility' && result.pureEligibility)
			return result.pureEligibility.homeLoanAmount;
		if (activeMode === 'bridge' && result.bridgeScenario)
			return result.bridgeScenario.homeLoanAmount;
		if (result.dpConstrained) return result.dpConstrained.homeLoanAmount;
		return result.maxLoanAmount;
	});

	let highlightedEmi = $derived.by(() => {
		if (!result) return 0;
		if (activeMode === 'bridge' && result.bridgeScenario) return result.bridgeScenario.totalEMI;
		if (activeMode === 'pureEligibility' && result.pureEligibility)
			return result.pureEligibility.homeLoanEMI;
		if (result.dpConstrained) return result.dpConstrained.homeLoanEMI;
		return result.monthlyEmi;
	});
</script>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- SMART AFFORDABILITY CALCULATOR                                        -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<div class="space-y-8">
	<!-- ═══ INPUT SECTION ═══ -->
	<div class="grid gap-8 lg:grid-cols-5">
		<!-- LEFT: Inputs (3/5) -->
		<div class="space-y-6 lg:col-span-3">
			<!-- Loan type pills -->
			<div class="flex flex-wrap gap-2">
				{#each LOAN_TYPE_OPTIONS.filter((o) => o.value === 'Home Loan' || o.value === 'LAP' || o.value === 'Plot Loan') as option (option.value)}
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

			<!-- Monthly Income -->
			<RangeSliderInput
				id="afford-income"
				label="Monthly Income"
				bind:value={monthlyIncome}
				min={25_000}
				max={10_000_000}
				step="auto"
				unit="₹"
				unitPosition="prefix"
			/>

			<!-- Employment type pills -->
			<div class="flex flex-wrap gap-2">
				{#each EMPLOYMENT_OPTIONS as option (option.value)}
					<button
						type="button"
						class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-all
							{employment === option.value
							? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)] text-[var(--ddsa-primary-700)]'
							: 'border-[var(--dash-border)] bg-white text-[var(--ddsa-secondary-500)]'}"
						onclick={() => (employment = option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>

			<!-- Down Payment (THE key affordability input) -->
			<RangeSliderInput
				id="afford-dp"
				label="Available Down Payment"
				bind:value={availableDownPayment}
				min={1_00_000}
				max={50_000_000}
				step="auto"
				unit="₹"
				unitPosition="prefix"
			/>

			<!-- Refine toggle -->
			{#if !showRefined}
				<button
					type="button"
					onclick={() => (showRefined = true)}
					class="text-sm font-medium text-[var(--ddsa-primary-500)] underline decoration-dotted underline-offset-4 hover:text-[var(--ddsa-primary-700)]"
				>
					+ Add more details for accuracy
				</button>
			{/if}

			<!-- Refined inputs -->
			{#if showRefined}
				<div
					class="space-y-4 rounded-xl border border-dashed border-[var(--ddsa-primary-200)] bg-[var(--ddsa-primary-50)]/30 p-4"
				>
					<p
						class="text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
					>
						Refine your estimate
					</p>

					<div class="grid gap-4 sm:grid-cols-2">
						<NumberField
							id="afford-age"
							label="Your Age"
							bind:value={applicantAge}
							min={18}
							max={70}
							formatIndian={false}
							icon="user"
						/>
						<SelectField
							id="afford-credit"
							label="Credit Score"
							options={CREDIT_SCORE_OPTIONS}
							bind:value={creditScore}
						/>
					</div>
					<div class="grid gap-4 sm:grid-cols-3">
						<NumberField
							id="afford-emis"
							label="Existing EMIs (₹/mo)"
							bind:value={existingEmis}
							min={0}
							max={monthlyIncome}
							formatIndian={true}
							icon="indian-rupee"
						/>
						<NumberField
							id="afford-other-income"
							label="Other Income (₹/mo)"
							bind:value={otherIncome}
							min={0}
							max={10_000_000}
							formatIndian={true}
							icon="indian-rupee"
						/>
						<NumberField
							id="afford-tenure"
							label="Tenure (Years)"
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
						<span class="text-sm text-[var(--ddsa-secondary-600)]">Add co-applicant</span>
					</div>

					{#if hasCoApplicant}
						<div
							class="grid gap-4 rounded-lg border border-[var(--dash-border)] bg-white p-3 sm:grid-cols-3"
						>
							<NumberField
								id="co-aff-income"
								label="Co-applicant Income"
								bind:value={coApplicantIncome}
								min={10_000}
								max={10_000_000}
								formatIndian={true}
								icon="indian-rupee"
							/>
							<SelectField
								id="co-aff-emp"
								label="Employment"
								options={[...EMPLOYMENT_OPTIONS]}
								bind:value={coApplicantEmployment}
							/>
							<SelectField
								id="co-aff-credit"
								label="Credit Score"
								options={CREDIT_SCORE_OPTIONS}
								bind:value={coApplicantCreditScore}
							/>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- RIGHT: 3-Mode Results (2/5) -->
		<div class="lg:col-span-2">
			{#if result}
				<!-- Hero: Max Affordable Property -->
				<div class="mb-4 rounded-xl bg-[var(--ddsa-primary-50)] p-5 text-center">
					<p
						class="text-xs font-semibold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						Max Affordable Property
					</p>
					<p
						class="mt-1 text-3xl font-extrabold text-[var(--ddsa-secondary)] sm:text-4xl"
						style="transition: all 0.3s ease;"
					>
						₹ {formatNumber(highlightedProperty)}
					</p>
					<p class="mt-1 text-xs text-[var(--ddsa-secondary-400)]">
						Loan: ₹{formatNumber(highlightedLoan)} · EMI: ₹{formatNumber(
							Math.round(highlightedEmi)
						)}/mo
					</p>
				</div>

				<!-- 3-Mode Tabs -->
				<div class="mb-4 space-y-2">
					<p
						class="text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
					>
						Scenarios
					</p>

					<!-- Mode A: Pure Eligibility -->
					{#if result.pureEligibility}
						<button
							type="button"
							onclick={() => (activeMode = 'pureEligibility')}
							class="w-full rounded-lg border p-3 text-left transition-all
								{activeMode === 'pureEligibility'
								? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)]'
								: 'border-[var(--dash-border)] bg-white hover:border-[var(--ddsa-primary-200)]'}"
						>
							<p class="text-xs font-semibold text-[var(--ddsa-secondary-600)]">
								Your Max Capacity
							</p>
							<p class="text-lg font-bold text-[var(--ddsa-secondary)]">
								₹ {formatNumber(result.pureEligibility.maxPropertyCost)}
							</p>
							<p class="text-[10px] text-[var(--ddsa-secondary-400)]">
								If down payment was not a constraint · Loan: ₹{formatNumber(
									result.pureEligibility.homeLoanAmount
								)}
							</p>
						</button>
					{/if}

					<!-- Mode B: DP Constrained -->
					{#if result.dpConstrained}
						<button
							type="button"
							onclick={() => (activeMode = 'dpConstrained')}
							class="w-full rounded-lg border p-3 text-left transition-all
								{activeMode === 'dpConstrained'
								? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)]'
								: 'border-[var(--dash-border)] bg-white hover:border-[var(--ddsa-primary-200)]'}"
						>
							<p class="text-xs font-semibold text-[var(--ddsa-secondary-600)]">
								With Your Down Payment
							</p>
							<p class="text-lg font-bold text-[var(--ddsa-secondary)]">
								₹ {formatNumber(result.dpConstrained.maxPropertyCost)}
							</p>
							<p class="text-[10px] text-[var(--ddsa-secondary-400)]">
								DP: ₹{formatNumber(availableDownPayment)} · Loan: ₹{formatNumber(
									result.dpConstrained.homeLoanAmount
								)} · EMI: ₹{formatNumber(Math.round(result.dpConstrained.homeLoanEMI))}
							</p>
						</button>
					{/if}

					<!-- Mode C: Bridge Scenario -->
					{#if result.bridgeScenario}
						<button
							type="button"
							onclick={() => (activeMode = 'bridge')}
							class="w-full rounded-lg border p-3 text-left transition-all
								{activeMode === 'bridge'
								? 'border-[var(--ddsa-primary-500)] bg-[var(--ddsa-primary-50)]'
								: 'border-[var(--dash-border)] bg-white hover:border-[var(--ddsa-primary-200)]'}"
						>
							<div class="flex items-center gap-2">
								<p class="text-xs font-semibold text-[var(--ddsa-primary-600)]">
									With Personal Loan Bridge
								</p>
								<span
									class="rounded bg-[var(--ddsa-primary-100)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--ddsa-primary-700)]"
									>BOOST</span
								>
							</div>
							<p class="text-lg font-bold text-[var(--ddsa-primary-700)]">
								₹ {formatNumber(result.bridgeScenario.maxPropertyCost)}
							</p>
							<p class="text-[10px] text-[var(--ddsa-secondary-400)]">
								PL: ₹{formatNumber(result.bridgeScenario.bridgeLoanAmount)} adds to DP · Total EMI: ₹{formatNumber(
									Math.round(result.bridgeScenario.totalEMI)
								)}
							</p>
						</button>
					{/if}
				</div>

				<!-- Key metrics for selected mode -->
				<div class="grid grid-cols-2 gap-2">
					<div class="rounded-lg bg-white p-2.5 text-center shadow-sm">
						<p class="text-[9px] font-medium text-[var(--ddsa-secondary-400)] uppercase">Rate</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">{result.interestRate}%</p>
					</div>
					<div class="rounded-lg bg-white p-2.5 text-center shadow-sm">
						<p class="text-[9px] font-medium text-[var(--ddsa-secondary-400)] uppercase">Tenure</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							{Math.round(result.effectiveTenureMonths / 12)} Yrs
						</p>
					</div>
					<div class="rounded-lg bg-white p-2.5 text-center shadow-sm">
						<p class="text-[9px] font-medium text-[var(--ddsa-secondary-400)] uppercase">LTV</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							{#if activeMode === 'dpConstrained' && result.dpConstrained}
								{result.dpConstrained.ltvPercent}%
							{:else if activeMode === 'bridge' && result.bridgeScenario}
								{result.bridgeScenario.ltvPercent}%
							{:else if result.pureEligibility}
								{result.pureEligibility.ltvPercent}%
							{:else}
								—
							{/if}
						</p>
					</div>
					<div class="rounded-lg bg-white p-2.5 text-center shadow-sm">
						<p class="text-[9px] font-medium text-[var(--ddsa-secondary-400)] uppercase">
							FOIR Used
						</p>
						<p class="text-sm font-bold text-[var(--ddsa-secondary)]">
							{result.foirPercent.toFixed(0)}%
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ═══ CTA ═══ -->
	{#if config.cta.enabled && result}
		<div class="flex justify-center pt-2">
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
