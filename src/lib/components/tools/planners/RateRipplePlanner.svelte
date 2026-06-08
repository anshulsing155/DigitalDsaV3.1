<script lang="ts">
	/**
	 * RateRipplePlanner — Simulate interest rate changes, prepayments & EMI adjustments.
	 *
	 * Focused wizard with 4 steps:
	 *   1. Loan Information (amount, rate, tenure, start date)
	 *   2. Rate Changes (date + new rate + tenure/EMI choice)
	 *   3. Prepayments (one-time or recurring)
	 *   4. EMI Changes (increase/decrease by %/₹)
	 *
	 * Uses the existing loanSimulator engine — no new calculation code.
	 */

	import { Plus, Trash2 } from '$lib/utils/iconRegistry';
	import RangeSliderInput from '$lib/components/tools/shared/RangeSliderInput.svelte';
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import MonthYearInput from '$lib/components/tools/shared/MonthYearInput.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import AmortizationTable from '$lib/components/tools/shared/AmortizationTable.svelte';
	import {
		buildBalanceComparisonLine,
		buildPrincipalInterestDoughnut
	} from '$lib/components/tools/charts/chartConfigs.js';
	import {
		simulateLoan,
		type BaseLoanConfig,
		type TimelineEvent,
		type SimulationResult
	} from '$lib/tools/planners/loanSimulator/index.js';
	import { groupScheduleByCalendarYear } from '$lib/tools/calculators/emiEngine.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
	import type { MonthlyPaymentEntry } from '$lib/tools/types.js';

	// =========================================================================
	// PROPS
	// =========================================================================
	interface Props {
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// WIZARD STATE
	// =========================================================================
	let currentStep = $state(1); // 1-4
	const steps = [
		{ num: 1, label: 'Loan Info' },
		{ num: 2, label: 'Rate Changes' },
		{ num: 3, label: 'Prepayments' },
		{ num: 4, label: 'EMI Changes' }
	];

	// =========================================================================
	// STEP 1: LOAN INFORMATION
	// =========================================================================
	let loanAmount: number = $state(50_00_000);
	let interestRate: number = $state(8.5);
	let tenureMonths: number = $state(240);
	let tenureYears = $derived(Math.round(tenureMonths / 12));

	const now = new Date();
	let loanStartYear: number = $state(now.getFullYear());
	let loanStartMonth: number = $state(now.getMonth() + 1);
	let loanStartDate = $derived(`${loanStartYear}-${String(loanStartMonth).padStart(2, '0')}`);

	// Start date picker binding (40 years back)
	const startDateRefYear = now.getFullYear() - 40;
	let loanStartMonthIndex = $state((now.getFullYear() - startDateRefYear) * 12 + now.getMonth());

	$effect(() => {
		const date = new Date(startDateRefYear, loanStartMonthIndex);
		const newYear = date.getFullYear();
		const newMonth = date.getMonth() + 1;
		if (newYear !== loanStartYear || newMonth !== loanStartMonth) {
			loanStartYear = newYear;
			loanStartMonth = newMonth;
		}
	});

	let loanStartLabel = $derived(`${MONTH_NAMES_SHORT[loanStartMonth - 1]}-${loanStartYear}`);

	// Month-year ↔ monthIndex helpers
	function monthIndexToLabel(idx: number | null): string {
		if (idx == null || idx < 0) return '';
		const date = new Date(loanStartYear, loanStartMonth - 1 + idx);
		return `${MONTH_NAMES_SHORT[date.getMonth()]}-${date.getFullYear()}`;
	}

	// =========================================================================
	// STEP 2: RATE CHANGES
	// =========================================================================
	let rateChanges: Array<{
		id: string;
		atMonth: number;
		newRate: number;
		recalculateEmi: boolean;
	}> = $state([]);

	let nextRateId = $state(1);
	let newRateMonth: number = $state(12);
	let newRateValue: number = $state(9.0);
	let newRateRecalcEmi: boolean = $state(true);

	function addRateChange() {
		rateChanges = [
			...rateChanges,
			{
				id: `rc-${nextRateId++}`,
				atMonth: newRateMonth,
				newRate: newRateValue,
				recalculateEmi: newRateRecalcEmi
			}
		];
	}

	function removeRateChange(id: string) {
		rateChanges = rateChanges.filter((r) => r.id !== id);
	}

	// =========================================================================
	// STEP 3: PREPAYMENTS
	// =========================================================================
	let prepayments: Array<{
		id: string;
		type: 'one_time' | 'recurring';
		amount: number;
		atMonth: number;
		fromMonth: number;
		toMonth: number;
		intervalMonths: number;
		effect: string;
	}> = $state([]);

	let nextPpId = $state(1);
	let ppType: string = $state('one_time');
	let ppAmount: number = $state(500_000);
	let ppMonth: number = $state(12);
	let ppFromMonth: number = $state(12);
	let ppToMonth: number | null = $state(null);
	let ppInterval: number = $state(12);
	let ppEffect: string = $state('reduce_tenure');

	const ppEffectOptions = [
		{ label: 'Reduce Tenure', value: 'reduce_tenure' },
		{ label: 'Reduce EMI', value: 'reduce_emi' }
	];

	const ppIntervalOptions = [
		{ label: 'Monthly', value: 1 },
		{ label: 'Quarterly', value: 3 },
		{ label: 'Half-yearly', value: 6 },
		{ label: 'Yearly', value: 12 }
	];

	function addPrepayment() {
		prepayments = [
			...prepayments,
			{
				id: `pp-${nextPpId++}`,
				type: ppType as any,
				amount: ppAmount,
				atMonth: ppMonth,
				fromMonth: ppFromMonth,
				toMonth: ppToMonth ?? tenureMonths,
				intervalMonths: ppInterval,
				effect: ppEffect
			}
		];
	}

	function removePrepayment(id: string) {
		prepayments = prepayments.filter((p) => p.id !== id);
	}

	// =========================================================================
	// STEP 4: EMI CHANGES
	// =========================================================================
	let emiChanges: Array<{
		id: string;
		mode: string;
		value: number;
		fromMonth: number;
		toMonth: number;
		isPermanent: boolean;
	}> = $state([]);

	let nextEmiId = $state(1);
	let emiMode: string = $state('increase_percent');
	let emiValue: number = $state(10);
	let emiFromMonth: number = $state(24);
	let emiToMonth: number | null = $state(null);

	const emiModeOptions = [
		{ label: 'Increase by %', value: 'increase_percent' },
		{ label: 'Decrease by %', value: 'decrease_percent' },
		{ label: 'Increase by ₹', value: 'increase_amount' },
		{ label: 'Decrease by ₹', value: 'decrease_amount' }
	];

	let emiValueLabel = $derived(
		(emiMode as string).includes('percent') ? 'Change by (%)' : 'Change by (₹)'
	);

	function addEmiChange() {
		emiChanges = [
			...emiChanges,
			{
				id: `emi-${nextEmiId++}`,
				mode: emiMode,
				value: emiValue,
				fromMonth: emiFromMonth,
				toMonth: emiToMonth ?? tenureMonths,
				isPermanent: emiToMonth == null
			}
		];
	}

	function removeEmiChange(id: string) {
		emiChanges = emiChanges.filter((e) => e.id !== id);
	}

	// =========================================================================
	// SIMULATION ENGINE — Convert wizard entries to TimelineEvents
	// =========================================================================
	let baseLoan = $derived<BaseLoanConfig>({
		principalAmount: loanAmount,
		annualInterestRate: interestRate,
		tenureMonths,
		startDate: loanStartDate,
		emiType: 'standard'
	});

	let activeEvents = $derived.by((): TimelineEvent[] => {
		const events: TimelineEvent[] = [];

		// Rate changes
		for (const rc of rateChanges) {
			events.push({
				type: 'rate_change',
				id: rc.id,
				atMonth: rc.atMonth,
				newAnnualRate: rc.newRate,
				recalculateEmi: rc.recalculateEmi
			});
		}

		// Prepayments
		for (const pp of prepayments) {
			if (pp.type === 'one_time') {
				events.push({
					type: 'part_payment',
					id: pp.id,
					atMonth: pp.atMonth,
					amount: pp.amount,
					effect: pp.effect as any
				});
			} else {
				events.push({
					type: 'recurring_part_payment',
					id: pp.id,
					fromMonth: pp.fromMonth,
					toMonth: pp.toMonth,
					intervalMonths: pp.intervalMonths,
					amountType: 'fixed',
					amount: pp.amount,
					effect: pp.effect as any
				});
			}
		}

		// EMI changes → emi_override events
		for (const ec of emiChanges) {
			const isPercent = (ec.mode as string).includes('percent');
			const isDecrease = (ec.mode as string).includes('decrease');
			events.push({
				type: 'emi_override',
				id: ec.id,
				fromMonth: ec.fromMonth,
				toMonth: ec.toMonth,
				overrideType: isPercent ? 'percentage_change' : 'fixed_amount',
				value: isPercent
					? isDecrease
						? -ec.value
						: ec.value
					: isDecrease
						? baseEmi - ec.value
						: baseEmi + ec.value
			});
		}

		return events;
	});

	let baseResult: SimulationResult = $derived.by(() => simulateLoan(baseLoan, []));
	let modifiedResult: SimulationResult = $derived.by(() => {
		const _scheme = themeState.scheme;
		return simulateLoan(baseLoan, activeEvents);
	});

	let hasEvents = $derived(activeEvents.length > 0);
	let baseEmi = $derived(Math.round(baseResult.summary.peakEmi));
	let totalEventCount = $derived(rateChanges.length + prepayments.length + emiChanges.length);

	// =========================================================================
	// SNAPSHOT & CHARTS
	// =========================================================================
	let snapshotTotalInterest = $derived(Math.round(baseResult.summary.totalInterestPaid));
	let snapshotTotalPayment = $derived(loanAmount + snapshotTotalInterest);
	let snapshotPrincipalPercent = $derived(
		snapshotTotalPayment > 0 ? ((loanAmount / snapshotTotalPayment) * 100).toFixed(1) : '0'
	);
	let snapshotInterestPercent = $derived(
		snapshotTotalPayment > 0
			? ((snapshotTotalInterest / snapshotTotalPayment) * 100).toFixed(1)
			: '0'
	);

	let snapshotPieChart = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (loanAmount <= 0 || snapshotTotalInterest <= 0) return null;
		return buildPrincipalInterestDoughnut(loanAmount, snapshotTotalInterest);
	});

	function snapshotsToMonthlyEntries(result: SimulationResult): MonthlyPaymentEntry[] {
		return result.timeline.map((s) => ({
			monthNumber: s.monthIndex,
			formattedDate: s.dateLabel,
			numericDate: s.date,
			emiAmount: s.emiPaid,
			interestAmount: s.interestComponent,
			principalAmount: s.principalComponent,
			closingBalance: s.outstandingPrincipal,
			partPaymentAmount: s.partPaymentMade
		}));
	}

	let chartConfig = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		const baseYearly = groupScheduleByCalendarYear(
			snapshotsToMonthlyEntries(baseResult),
			loanAmount
		);
		const modYearly = groupScheduleByCalendarYear(
			snapshotsToMonthlyEntries(modifiedResult),
			loanAmount
		);
		return buildBalanceComparisonLine(baseYearly, modYearly);
	});

	let modifiedYearlySummary = $derived(
		groupScheduleByCalendarYear(snapshotsToMonthlyEntries(modifiedResult), loanAmount)
	);

	// =========================================================================
	// BALANCE TRANSFER COMPARISON
	// =========================================================================
	let interestSaved = $derived(
		hasEvents
			? Math.round(baseResult.summary.totalInterestPaid - modifiedResult.summary.totalInterestPaid)
			: 0
	);
	let tenureSaved = $derived(
		hasEvents ? baseResult.timeline.length - modifiedResult.timeline.length : 0
	);
	let modifiedEmi = $derived(hasEvents ? Math.round(modifiedResult.summary.peakEmi) : baseEmi);
</script>

<!-- ═════════════════════════════════════════════════════════════════════ -->
<!-- RATE RIPPLE PLANNER UI                                               -->
<!-- ═════════════════════════════════════════════════════════════════════ -->

<div class="space-y-5">
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SECTION 1: LOAN INFO + SNAPSHOT (same as LoanPlanner)             -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4 sm:p-5">
		<div class="grid gap-8 lg:grid-cols-5">
			<!-- LEFT: Inputs (3/5) -->
			<div class="flex flex-col justify-between gap-3 lg:col-span-3">
				<RangeSliderInput
					id="rr-amount"
					label="Loan Amount"
					bind:value={loanAmount}
					min={100_000}
					max={10_00_00_000}
					step="auto"
					unit="₹"
					unitPosition="prefix"
				/>
				<RangeSliderInput
					id="rr-rate"
					label="Interest Rate"
					bind:value={interestRate}
					min={5}
					max={20}
					step={0.1}
					unit="%"
					unitPosition="suffix"
					allowDecimals={true}
				/>
				<RangeSliderInput
					id="rr-tenure"
					label="Tenure ({tenureYears} yrs)"
					bind:value={tenureMonths}
					min={12}
					max={360}
					step={12}
					unit="months"
					unitPosition="suffix"
					formatLabel={(v) => `${Math.round(v / 12)}yr`}
				/>
				<MonthYearInput
					id="rr-start-date"
					label="Loan Start Date"
					bind:value={loanStartMonthIndex}
					startYear={startDateRefYear}
					startMonth={1}
					tenureMonths={480 + tenureMonths}
				/>
				<!-- Mobile-only EMI -->
				<div
					class="mt-1 flex items-center justify-between rounded-lg bg-[var(--ddsa-secondary-50)] px-4 py-3 lg:hidden"
				>
					<span
						class="text-xs font-semibold tracking-wider text-[var(--ddsa-secondary-400)] uppercase"
						>Monthly EMI</span
					>
					<span class="text-xl font-extrabold text-[var(--ddsa-secondary)]"
						>₹{formatNumber(baseEmi)}</span
					>
				</div>
			</div>

			<!-- RIGHT: Loan Snapshot (2/5) -->
			<div class="hidden flex-col items-center justify-center lg:col-span-2 lg:flex">
				<div class="mb-4 text-center">
					<p
						class="text-xs font-semibold tracking-widest text-[var(--ddsa-secondary-400)] uppercase"
					>
						Loan EMI
					</p>
					<p
						class="mt-1 text-3xl font-extrabold text-[var(--ddsa-secondary)]"
						style="transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
					>
						₹ {formatNumber(baseEmi)}
					</p>
					<p class="mt-1 text-[11px] text-[var(--ddsa-secondary-400)]">
						Loan Start: <span class="font-semibold text-[var(--ddsa-secondary-600)]"
							>{loanStartLabel}</span
						>
					</p>
				</div>
				{#if snapshotPieChart}
					<div class="w-full max-w-[220px]">
						<p class="mb-2 text-center text-xs font-semibold text-[var(--ddsa-secondary-500)]">
							Break-up of Total Payment
						</p>
						<div class="relative">
							<ChartWrapper
								type="pie"
								data={snapshotPieChart.data}
								options={snapshotPieChart.options}
								height="180px"
								animated={true}
								animationDuration={1000}
							/>
							<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
								<div class="flex gap-8 text-xs font-bold text-white drop-shadow-md">
									<span>{snapshotPrincipalPercent}%</span>
									<span>{snapshotInterestPercent}%</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
				<div class="mt-3 space-y-1.5 text-xs">
					<div class="flex items-center gap-2">
						<span class="h-3 w-3 rounded-full" style="background: var(--chart-principal, #8b8b6b);"
						></span>
						<span class="text-[var(--ddsa-secondary-600)]">Principal</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary-700)]"
							>₹{formatNumber(loanAmount)}</span
						>
					</div>
					<div class="flex items-center gap-2">
						<span class="h-3 w-3 rounded-full" style="background: var(--chart-interest, #d4a84e);"
						></span>
						<span class="text-[var(--ddsa-secondary-600)]">Interest</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary-700)]"
							>₹{formatNumber(snapshotTotalInterest)}</span
						>
					</div>
					<div class="flex items-center gap-2 border-t border-[var(--ddsa-secondary-200)] pt-1">
						<span class="text-[var(--ddsa-secondary-500)]">Total</span>
						<span class="ml-auto font-bold text-[var(--ddsa-secondary)]"
							>₹{formatNumber(snapshotTotalPayment)}</span
						>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SECTION 2: WIZARD — Step-by-step event builder                    -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<div
		class="rounded-xl border border-[var(--ddsa-primary-300)] bg-[var(--ddsa-secondary-50)]/30 p-4 shadow-sm sm:p-5"
	>
		<!-- Step navigation pills -->
		<div class="mb-5 flex flex-wrap gap-2">
			{#each steps as step (step.num)}
				{@const isActive = currentStep === step.num}
				{@const eventCount =
					step.num === 2
						? rateChanges.length
						: step.num === 3
							? prepayments.length
							: step.num === 4
								? emiChanges.length
								: 0}
				<button
					type="button"
					class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all
						{isActive
						? 'bg-[var(--ddsa-primary-500)] text-white shadow-sm'
						: 'bg-[var(--ddsa-secondary-100)] text-[var(--ddsa-secondary-600)] hover:bg-[var(--ddsa-secondary-200)]'}"
					onclick={() => {
						currentStep = step.num;
					}}
				>
					<span
						class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
						{isActive ? 'bg-white/20 text-white' : 'bg-[var(--ddsa-secondary-300)] text-white'}"
					>
						{step.num}
					</span>
					{step.label}
					{#if eventCount > 0}
						<span
							class="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/30 px-1 text-[10px] font-bold"
						>
							{eventCount}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- ─── STEP 2: RATE CHANGES ─── -->
		{#if currentStep === 2}
			<div class="space-y-4">
				<h3 class="text-sm font-bold text-[var(--ddsa-secondary)]">Add Interest Rate Change</h3>
				<div class="grid grid-cols-2 gap-4">
					<MonthYearInput
						id="rr-rate-month"
						label="Effective Date"
						bind:value={newRateMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
					/>
					<NumberField
						id="rr-new-rate"
						label="New Rate (%)"
						bind:value={newRateValue}
						min={5}
						max={20}
						step="any"
					/>
				</div>
				<div class="flex items-center gap-4">
					<label
						class="flex cursor-pointer items-center gap-2 text-sm text-[var(--ddsa-secondary-600)]"
					>
						<input
							type="checkbox"
							bind:checked={newRateRecalcEmi}
							class="h-4 w-4 rounded accent-[var(--ddsa-primary-500)]"
						/>
						Recalculate EMI (otherwise tenure adjusts)
					</label>
					<button
						type="button"
						onclick={addRateChange}
						class="ml-auto rounded-lg bg-[var(--ddsa-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ddsa-primary-600)]"
					>
						<Plus size={14} class="-mt-0.5 inline" /> Add
					</button>
				</div>

				<!-- List -->
				{#if rateChanges.length > 0}
					<div class="space-y-2">
						{#each rateChanges as rc (rc.id)}
							<div
								class="flex items-center justify-between rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-3"
							>
								<div class="text-sm">
									<span class="font-medium text-[var(--ddsa-secondary-700)]"
										>{monthIndexToLabel(rc.atMonth)}</span
									>
									<span class="mx-2 text-[var(--ddsa-secondary-400)]">→</span>
									<span class="font-bold text-[var(--ddsa-primary-600)]">{rc.newRate}%</span>
									<span class="ml-2 text-xs text-[var(--ddsa-secondary-400)]">
										({rc.recalculateEmi ? 'EMI recalculated' : 'Tenure adjusts'})
									</span>
								</div>
								<button
									onclick={() => removeRateChange(rc.id)}
									class="rounded-lg p-1.5 text-[var(--ddsa-error)] hover:bg-red-50"
								>
									<Trash2 size={14} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ─── STEP 3: PREPAYMENTS ─── -->
		{:else if currentStep === 3}
			<div class="space-y-4">
				<h3 class="text-sm font-bold text-[var(--ddsa-secondary)]">Add Prepayment</h3>
				<div class="grid grid-cols-2 gap-4">
					<SelectField
						id="rr-pp-type"
						label="Type"
						bind:value={ppType}
						options={[
							{ label: 'One-time', value: 'one_time' },
							{ label: 'Recurring', value: 'recurring' }
						]}
					/>
					<NumberField
						id="rr-pp-amount"
						label="Amount (₹)"
						bind:value={ppAmount}
						min={10000}
						max={loanAmount}
						formatIndian={true}
						icon="indian-rupee"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					{#if ppType === 'one_time'}
						<MonthYearInput
							id="rr-pp-month"
							label="Payment Date"
							bind:value={ppMonth}
							startYear={loanStartYear}
							startMonth={loanStartMonth}
							{tenureMonths}
						/>
					{:else}
						<MonthYearInput
							id="rr-pp-from"
							label="Start From"
							bind:value={ppFromMonth}
							startYear={loanStartYear}
							startMonth={loanStartMonth}
							{tenureMonths}
						/>
						<MonthYearInput
							id="rr-pp-to"
							label="Until"
							showTillEnd={true}
							bind:value={ppToMonth}
							startYear={loanStartYear}
							startMonth={loanStartMonth}
							{tenureMonths}
							onTillEnd={() => {
								ppToMonth = null;
							}}
						/>
					{/if}
				</div>
				{#if ppType === 'recurring'}
					<div class="grid grid-cols-2 gap-4">
						<SelectField
							id="rr-pp-interval"
							label="Frequency"
							bind:value={ppInterval}
							options={ppIntervalOptions}
						/>
						<SelectField
							id="rr-pp-effect"
							label="Effect"
							bind:value={ppEffect}
							options={ppEffectOptions}
						/>
					</div>
				{:else}
					<SelectField
						id="rr-pp-effect"
						label="Effect"
						bind:value={ppEffect}
						options={ppEffectOptions}
					/>
				{/if}
				<button
					type="button"
					onclick={addPrepayment}
					class="rounded-lg bg-[var(--ddsa-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ddsa-primary-600)]"
				>
					<Plus size={14} class="-mt-0.5 inline" /> Add Prepayment
				</button>

				{#if prepayments.length > 0}
					<div class="space-y-2">
						{#each prepayments as pp (pp.id)}
							<div
								class="flex items-center justify-between rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-3"
							>
								<div class="text-sm">
									<span class="font-bold text-[var(--ddsa-secondary-700)]"
										>₹{formatNumber(pp.amount)}</span
									>
									{#if pp.type === 'one_time'}
										<span class="text-[var(--ddsa-secondary-400)]"> at </span>
										<span class="font-medium">{monthIndexToLabel(pp.atMonth)}</span>
									{:else}
										<span class="text-[var(--ddsa-secondary-400)]">
											every {pp.intervalMonths}mo from
										</span>
										<span class="font-medium">{monthIndexToLabel(pp.fromMonth)}</span>
									{/if}
								</div>
								<button
									onclick={() => removePrepayment(pp.id)}
									class="rounded-lg p-1.5 text-[var(--ddsa-error)] hover:bg-red-50"
								>
									<Trash2 size={14} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ─── STEP 4: EMI CHANGES ─── -->
		{:else if currentStep === 4}
			<div class="space-y-4">
				<h3 class="text-sm font-bold text-[var(--ddsa-secondary)]">Add EMI Change</h3>
				<div class="grid grid-cols-2 gap-4">
					<SelectField
						id="rr-emi-mode"
						label="Change Type"
						bind:value={emiMode}
						options={emiModeOptions}
					/>
					<NumberField
						id="rr-emi-value"
						label={emiValueLabel}
						bind:value={emiValue}
						min={(emiMode as string).includes('percent') ? 0.5 : 1000}
						max={(emiMode as string).includes('percent') ? 100 : 10_00_000}
						step={(emiMode as string).includes('percent') ? 0.5 : 1000}
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<MonthYearInput
						id="rr-emi-from"
						label="Start Date"
						bind:value={emiFromMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
					/>
					<MonthYearInput
						id="rr-emi-to"
						label="End Date"
						showTillEnd={true}
						bind:value={emiToMonth}
						startYear={loanStartYear}
						startMonth={loanStartMonth}
						{tenureMonths}
						onTillEnd={() => {
							emiToMonth = null;
						}}
					/>
				</div>
				<button
					type="button"
					onclick={addEmiChange}
					class="rounded-lg bg-[var(--ddsa-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ddsa-primary-600)]"
				>
					<Plus size={14} class="-mt-0.5 inline" /> Add EMI Change
				</button>

				{#if emiChanges.length > 0}
					<div class="space-y-2">
						{#each emiChanges as ec (ec.id)}
							{@const isPercent = (ec.mode as string).includes('percent')}
							{@const isDecrease = (ec.mode as string).includes('decrease')}
							<div
								class="flex items-center justify-between rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-4 py-3"
							>
								<div class="text-sm">
									<span class="font-bold text-[var(--ddsa-primary-600)]">
										{isDecrease ? '-' : '+'}{ec.value}{isPercent ? '%' : `₹`}
									</span>
									<span class="text-[var(--ddsa-secondary-400)]"> from </span>
									<span class="font-medium">{monthIndexToLabel(ec.fromMonth)}</span>
									<span class="text-[var(--ddsa-secondary-400)]"> to </span>
									<span class="font-medium"
										>{ec.isPermanent ? 'end' : monthIndexToLabel(ec.toMonth)}</span
									>
								</div>
								<button
									onclick={() => removeEmiChange(ec.id)}
									class="rounded-lg p-1.5 text-[var(--ddsa-error)] hover:bg-red-50"
								>
									<Trash2 size={14} />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- ─── STEP 1: GETTING STARTED (default) ─── -->
		{:else}
			<div class="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
				<p class="mb-2 text-xs font-bold tracking-wider text-amber-700 uppercase">How to use</p>
				<ul class="space-y-1.5 text-sm text-amber-800">
					<li class="flex items-start gap-2">
						<span class="font-bold text-amber-600">Step 2:</span> Add interest rate changes (past or planned)
					</li>
					<li class="flex items-start gap-2">
						<span class="font-bold text-amber-600">Step 3:</span> Add prepayments (lump-sum or recurring)
					</li>
					<li class="flex items-start gap-2">
						<span class="font-bold text-amber-600">Step 4:</span> Add EMI changes (increase/decrease by
						% or ₹)
					</li>
				</ul>
				<p class="mt-3 text-xs text-amber-600">Graph and schedule update live as you add events.</p>
			</div>
		{/if}
	</div>

	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SECTION 3: BALANCE TRANSFER COMPARISON (only when events exist)    -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	{#if hasEvents}
		<div
			class="rounded-xl border-2 border-[var(--ddsa-primary-300)] bg-gradient-to-r from-[var(--ddsa-primary-50)] to-white p-5"
		>
			<h3 class="mb-4 text-sm font-bold tracking-wider text-[var(--ddsa-secondary-500)] uppercase">
				Impact Summary
			</h3>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="text-center">
					<p class="text-[10px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">
						Current EMI
					</p>
					<p class="text-lg font-extrabold text-[var(--ddsa-secondary)]">
						₹{formatNumber(baseEmi)}
					</p>
				</div>
				<div class="text-center">
					<p class="text-[10px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">
						Interest Saved
					</p>
					<p class="text-lg font-extrabold {interestSaved > 0 ? 'text-green-600' : 'text-red-500'}">
						{interestSaved > 0 ? '' : '-'}₹{formatNumber(Math.abs(interestSaved))}
					</p>
				</div>
				<div class="text-center">
					<p class="text-[10px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">
						Tenure Change
					</p>
					<p
						class="text-lg font-extrabold {tenureSaved > 0
							? 'text-green-600'
							: tenureSaved < 0
								? 'text-red-500'
								: 'text-[var(--ddsa-secondary)]'}"
					>
						{tenureSaved > 0
							? `-${tenureSaved}`
							: tenureSaved < 0
								? `+${Math.abs(tenureSaved)}`
								: '0'} months
					</p>
				</div>
				<div class="text-center">
					<p class="text-[10px] font-semibold text-[var(--ddsa-secondary-400)] uppercase">
						Total Prepayments
					</p>
					<p class="text-lg font-extrabold text-[var(--ddsa-secondary)]">
						₹{formatNumber(Math.round(modifiedResult.summary.totalPartPayments))}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SECTION 4: GRAPH                                                   -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	{#if chartConfig}
		<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
			<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">Balance Over Time</h3>
			<ChartWrapper
				type="line"
				data={chartConfig.data}
				options={chartConfig.options}
				height="320px"
				animated={true}
				animationDuration={1000}
			/>
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<!-- SECTION 5: AMORTIZATION SCHEDULE                                   -->
	<!-- ═══════════════════════════════════════════════════════════════════ -->
	<AmortizationTable yearlySummary={modifiedYearlySummary} showPartPaymentColumn={hasEvents} />
</div>
