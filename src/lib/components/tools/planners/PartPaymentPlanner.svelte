<script lang="ts">
	/**
	 * PartPaymentPlanner — Plan part-payments to reduce loan tenure or EMI.
	 *
	 * This planner allows users to:
	 * 1. Enter their loan details (amount, rate, tenure, start date)
	 * 2. Add one or more part-payment schedules (various frequencies)
	 * 3. Choose a purpose: reduce tenure, reduce EMI, or both
	 * 4. See the impact: interest saved, tenure saved, comparison chart
	 *
	 * All calculations are handled by partPaymentEngine.ts.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import RadioField from '$lib/components/RadioField.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import ComparisonSummary from '$lib/components/tools/shared/ComparisonSummary.svelte';
	import AmortizationTable from '$lib/components/tools/shared/AmortizationTable.svelte';
	import {
		buildBalanceComparisonLine,
		buildSingleBalanceLine
	} from '$lib/components/tools/charts/chartConfigs.js';
	import { computePartPaymentComparison } from '$lib/tools/planners/partPaymentEngine.js';
	import { groupScheduleByCalendarYear } from '$lib/tools/calculators/emiEngine.js';
	import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
	import { formatNumber } from '$lib/i18n';
	import { themeState } from '$lib/stores/theme.svelte';
	import {
		LOAN_DEFAULTS,
		PART_PAYMENT_FREQUENCY_OPTIONS,
		PART_PAYMENT_PURPOSE_OPTIONS,
		OCCUPATION_OPTIONS,
		MAX_AGE_BY_OCCUPATION,
		MONTH_NAMES_SHORT
	} from '$lib/tools/constants.js';
	import type { PartPaymentScheduleEntry, PartPaymentPurpose } from '$lib/tools/types.js';

	// --- Component Props ---
	interface Props {
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// LOAN DETAILS (user inputs)
	// =========================================================================

	let loanPrincipal: number = $state(LOAN_DEFAULTS.PRINCIPAL);
	let annualInterestRate: number = $state(LOAN_DEFAULTS.INTEREST_RATE);
	let tenureInMonths: number = $state(LOAN_DEFAULTS.TENURE_MONTHS);
	let purpose: string = $state('Reduce Tenure');
	let occupation: string = $state('Government');
	let applicantAge: number = $state(30);

	// --- Loan start date ---
	const now = new Date();
	let loanStartYear: number = $state(now.getFullYear());
	let loanStartMonth: number = $state(now.getMonth() + 1);
	let loanStartDate = $derived(`${loanStartYear}-${String(loanStartMonth).padStart(2, '0')}`);

	// =========================================================================
	// PART-PAYMENT SCHEDULES (managed list)
	// =========================================================================

	/** All part-payment schedules the user has added */
	let partPaymentSchedules: PartPaymentScheduleEntry[] = $state([]);

	/** Counter for generating unique IDs */
	let nextScheduleId: number = $state(1);

	// --- Form fields for adding a new part-payment ---
	// Initialized from `now` (not from loanStartMonth/Year $state) to avoid
	// `state_referenced_locally`. These are independent local defaults, not
	// synced mirrors of the loan start date.
	let newFrequency: string = $state('Quarterly');
	let newAmount: number = $state(100_000);
	let newStartMonth: number = $state(now.getMonth() + 1);
	let newStartYear: number = $state(now.getFullYear());
	let newEndMonth: number = $state(now.getMonth() + 1);
	let newEndYear: number = $state(now.getFullYear() + Math.floor(LOAN_DEFAULTS.TENURE_MONTHS / 12));
	let newCustomInterval: number = $state(6);
	let addError: string = $state('');

	// --- Month-Year picker options ---
	const monthOptions = MONTH_NAMES_SHORT.map((m, i) => ({ label: m, value: i + 1 }));

	let yearOptions = $derived.by(() => {
		const endYear = loanStartYear + Math.ceil(tenureInMonths / 12) + 5;
		const options: { label: string; value: number }[] = [];
		for (let y = loanStartYear; y <= endYear; y++) {
			options.push({ label: String(y), value: y });
		}
		return options;
	});

	function toMonthIndex(year: number, month: number): number {
		return (year - loanStartYear) * 12 + (month - loanStartMonth);
	}

	function toDateLabel(monthIndex: number): string {
		const date = new Date(loanStartYear, loanStartMonth - 1 + monthIndex);
		return `${MONTH_NAMES_SHORT[date.getMonth()]}-${date.getFullYear()}`;
	}

	// =========================================================================
	// DERIVED CALCULATIONS
	// =========================================================================

	/** The base EMI without any part-payments */
	let baseMonthlyEmi = $derived(calculateEMI(loanPrincipal, annualInterestRate, tenureInMonths));

	/** Maximum retirement age based on occupation */
	let maxRetirementAge = $derived(MAX_AGE_BY_OCCUPATION[occupation] || 65);

	/**
	 * The full comparison result: original schedule vs modified schedule.
	 * Recalculates whenever loan details or part-payment schedules change.
	 */
	let comparisonResult = $derived.by(() => {
		if (loanPrincipal <= 0 || annualInterestRate <= 0 || tenureInMonths <= 0) return null;

		return computePartPaymentComparison(
			loanPrincipal,
			annualInterestRate,
			tenureInMonths,
			loanStartDate,
			partPaymentSchedules,
			purpose as PartPaymentPurpose
		);
	});

	/** Whether there are any part-payments added */
	let hasPartPayments = $derived(partPaymentSchedules.length > 0);

	/** Chart config for balance comparison — tracks theme for color updates */
	let chartConfig = $derived.by(() => {
		const _scheme = themeState.scheme;
		const _theme = themeState.resolved;
		if (!comparisonResult) return null;

		const originalYearly = groupScheduleByCalendarYear(
			comparisonResult.originalSchedule,
			loanPrincipal
		);
		const modifiedYearly = comparisonResult.modifiedYearlySummary;

		if (hasPartPayments) {
			return buildBalanceComparisonLine(originalYearly, modifiedYearly);
		} else {
			return buildSingleBalanceLine(originalYearly);
		}
	});

	/** Comparison summary rows */
	let comparisonRows = $derived(
		comparisonResult
			? [
					{
						label: 'Total Interest',
						original: comparisonResult.originalTotalInterest,
						modified: comparisonResult.modifiedTotalInterest,
						showSaving: true
					},
					{
						label: 'Loan Tenure',
						original: comparisonResult.originalTenureMonths,
						modified: comparisonResult.modifiedTenureMonths,
						showSaving: true,
						unit: 'months'
					},
					{
						label: 'Total Part-Payments',
						original: 0,
						modified: comparisonResult.totalPartPaymentsMade,
						showSaving: false
					}
				]
			: []
	);

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Add a new part-payment schedule to the list */
	function addPartPaymentSchedule() {
		addError = '';

		const startIdx = toMonthIndex(newStartYear, newStartMonth);
		const endIdx = toMonthIndex(newEndYear, newEndMonth);

		// Validation
		if (newAmount <= 0) {
			addError = 'Part-payment amount must be greater than zero';
			return;
		}
		if (newAmount > loanPrincipal * 0.8) {
			addError = 'Part-payment amount should not exceed 80% of loan amount';
			return;
		}
		if (startIdx < 0) {
			addError = 'Start date must be at or after loan start';
			return;
		}
		if (startIdx >= endIdx && newFrequency !== 'Lump Sum') {
			addError = 'End date must be after start date';
			return;
		}

		const resolvedStart = Math.max(0, startIdx);
		const resolvedEnd =
			newFrequency === 'Lump Sum' ? resolvedStart : Math.max(resolvedStart + 1, endIdx);

		const newEntry: PartPaymentScheduleEntry = {
			id: `pp-${nextScheduleId++}`,
			frequency: newFrequency as PartPaymentScheduleEntry['frequency'],
			amount: newAmount,
			startMonthIndex: resolvedStart,
			endMonthIndex: resolvedEnd,
			customIntervalMonths: newFrequency === 'Custom' ? newCustomInterval : undefined,
			startDateLabel: toDateLabel(resolvedStart),
			endDateLabel: newFrequency === 'Lump Sum' ? undefined : toDateLabel(resolvedEnd)
		};

		partPaymentSchedules = [...partPaymentSchedules, newEntry];
	}

	/** Remove a part-payment schedule by ID */
	function removeSchedule(scheduleId: string) {
		partPaymentSchedules = partPaymentSchedules.filter((s) => s.id !== scheduleId);
	}

	/** Get a human-readable label for the frequency */
	function getFrequencyLabel(schedule: PartPaymentScheduleEntry): string {
		if (schedule.frequency === 'Custom' && schedule.customIntervalMonths) {
			return `Every ${schedule.customIntervalMonths} months`;
		}
		return schedule.frequency;
	}
</script>

<!-- ======================================================================= -->
<!-- PART-PAYMENT PLANNER UI                                                 -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Section 1: Loan Details === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Loan Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<NumberField
				id="pp-loan-amount"
				label="Principal Outstanding (₹)"
				bind:value={loanPrincipal}
				min={LOAN_DEFAULTS.MIN_PRINCIPAL}
				max={LOAN_DEFAULTS.MAX_PRINCIPAL}
				formatIndian={true}
				icon="indian-rupee"
			/>

			<div class="flex w-full flex-col">
				<label for="pp-interest-rate" class="label-modern">Interest Rate (% p.a.)</label>
				<input
					id="pp-interest-rate"
					type="number"
					step="0.1"
					min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
					max={LOAN_DEFAULTS.MAX_INTEREST_RATE}
					bind:value={annualInterestRate}
					class="input-modern inputText"
				/>
			</div>

			<NumberField
				id="pp-tenure"
				label="Remaining Tenure (Months)"
				bind:value={tenureInMonths}
				min={LOAN_DEFAULTS.MIN_TENURE_MONTHS}
				max={LOAN_DEFAULTS.MAX_TENURE_MONTHS}
				formatIndian={false}
			/>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<SelectField
				id="pp-purpose"
				label="Purpose of Part-Payment"
				options={[...PART_PAYMENT_PURPOSE_OPTIONS]}
				bind:value={purpose}
			/>

			<SelectField
				id="pp-occupation"
				label="Occupation"
				options={[...OCCUPATION_OPTIONS]}
				bind:value={occupation}
			/>

			<NumberField
				id="pp-age"
				label="Current Age"
				bind:value={applicantAge}
				min={18}
				max={maxRetirementAge}
				formatIndian={false}
			/>
		</div>

		<!-- Current EMI Display -->
		{#if baseMonthlyEmi > 0}
			<div class="rounded-lg bg-[var(--ddsa-secondary-50)] px-4 py-3 text-sm">
				<span class="text-[var(--ddsa-secondary-500)]">Current Monthly EMI:</span>
				<span class="ml-2 font-bold text-[var(--ddsa-secondary)]"
					>₹ {formatNumber(baseMonthlyEmi)}</span
				>
			</div>
		{/if}
	</div>

	<!-- === Section 2: Add Part-Payments === -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Part-Payments</h2>

		<!-- Part-payment form (add new) -->
		<div
			class="space-y-4 rounded-xl border border-[var(--dash-border)] bg-white p-4 dark:bg-[var(--dash-bg-card)]"
		>
			<div class="grid gap-4 sm:grid-cols-2">
				<SelectField
					id="pp-new-frequency"
					label="Frequency"
					options={[...PART_PAYMENT_FREQUENCY_OPTIONS]}
					bind:value={newFrequency}
				/>

				<NumberField
					id="pp-new-amount"
					label="Amount (₹)"
					bind:value={newAmount}
					min={1000}
					max={loanPrincipal}
					formatIndian={true}
					icon="indian-rupee"
				/>
			</div>

			<!-- Start month-year -->
			<div>
				<p class="label-modern mb-1">
					{newFrequency === 'Lump Sum' ? 'Payment Date' : 'Start From'}
				</p>
				<div class="grid grid-cols-2 gap-2">
					<SelectField
						id="pp-start-month"
						label=""
						bind:value={newStartMonth}
						options={monthOptions}
					/>
					<SelectField
						id="pp-start-year"
						label=""
						bind:value={newStartYear}
						options={yearOptions}
					/>
				</div>
			</div>

			<!-- End month-year (for recurring frequencies) -->
			{#if newFrequency !== 'Lump Sum'}
				<div>
					<p class="label-modern mb-1">Until</p>
					<div class="grid grid-cols-2 gap-2">
						<SelectField
							id="pp-end-month"
							label=""
							bind:value={newEndMonth}
							options={monthOptions}
						/>
						<SelectField id="pp-end-year" label="" bind:value={newEndYear} options={yearOptions} />
					</div>
				</div>
			{/if}

			{#if newFrequency === 'Custom'}
				<div class="w-48">
					<NumberField
						id="pp-new-custom-interval"
						label="Custom Interval (months)"
						bind:value={newCustomInterval}
						min={2}
						max={tenureInMonths}
						formatIndian={false}
					/>
				</div>
			{/if}

			{#if addError}
				<p class="text-sm text-[var(--ddsa-error)]">{addError}</p>
			{/if}

			<button
				type="button"
				onclick={addPartPaymentSchedule}
				class="rounded-lg bg-[var(--ddsa-primary)] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--ddsa-primary-600)]"
			>
				Add Part-Payment
			</button>
		</div>

		<!-- Part-payment schedules table -->
		{#if partPaymentSchedules.length > 0}
			<div class="overflow-x-auto rounded-lg border border-[var(--dash-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--ddsa-secondary)] text-white">
						<tr>
							<th class="px-3 py-2.5 text-left font-medium">Frequency</th>
							<th class="px-3 py-2.5 text-right font-medium">Amount</th>
							<th class="px-3 py-2.5 text-center font-medium">From</th>
							<th class="px-3 py-2.5 text-center font-medium">To</th>
							<th class="px-3 py-2.5 text-center font-medium"></th>
						</tr>
					</thead>
					<tbody>
						{#each partPaymentSchedules as schedule (schedule.id)}
							<tr class="border-b border-[var(--dash-border)] hover:bg-[var(--ddsa-primary-50)]">
								<td class="px-3 py-2.5">{getFrequencyLabel(schedule)}</td>
								<td class="px-3 py-2.5 text-right font-medium">₹ {formatNumber(schedule.amount)}</td
								>
								<td class="px-3 py-2.5 text-center"
									>{schedule.startDateLabel ?? toDateLabel(schedule.startMonthIndex)}</td
								>
								<td class="px-3 py-2.5 text-center"
									>{schedule.endDateLabel ??
										(schedule.startMonthIndex === schedule.endMonthIndex
											? '—'
											: toDateLabel(schedule.endMonthIndex))}</td
								>
								<td class="px-3 py-2.5 text-center">
									<button
										type="button"
										onclick={() => removeSchedule(schedule.id)}
										class="text-xs text-[var(--ddsa-error)] hover:underline"
									>
										Remove
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- === Section 3: Results === -->
	{#if comparisonResult}
		<!-- Savings Summary -->
		{#if hasPartPayments}
			<ResultCard
				title="Your Savings"
				items={[
					{
						label: 'Interest Saved',
						value: `₹ ${formatNumber(Math.round(comparisonResult.interestSaved))}`,
						highlight: true
					},
					{
						label: 'Tenure Saved',
						value: `${comparisonResult.tenureSavedMonths} months`
					},
					{
						label: 'Total Part-Payments',
						value: `₹ ${formatNumber(Math.round(comparisonResult.totalPartPaymentsMade))}`
					}
				]}
			/>

			<ComparisonSummary rows={comparisonRows} />
		{/if}

		<!-- Chart -->
		{#if chartConfig}
			<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
				<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">
					{hasPartPayments
						? 'Balance Comparison: With vs Without Part-Payments'
						: 'Outstanding Balance Over Time'}
				</h3>
				<ChartWrapper
					type="line"
					data={chartConfig.data}
					options={chartConfig.options}
					height="320px"
				/>
			</div>
		{/if}

		<!-- Amortization Table -->
		<div>
			<h3 class="mb-3 text-lg font-semibold text-[var(--ddsa-secondary)]">
				Amortization Schedule {hasPartPayments ? '(With Part-Payments)' : ''}
			</h3>
			<AmortizationTable
				yearlySummary={comparisonResult.modifiedYearlySummary}
				showPartPaymentColumn={hasPartPayments}
			/>
		</div>
	{/if}
</div>
