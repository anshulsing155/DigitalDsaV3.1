<script lang="ts">
	/**
	 * FlexibleEmiPlanner — Plan EMI changes over the life of a loan.
	 *
	 * This planner allows users to:
	 * 1. Enter their loan details (amount, rate, tenure, start date)
	 * 2. Add EMI change points (increase or decrease EMI at specific months)
	 * 3. See the impact: interest saved, tenure saved, comparison chart
	 *
	 * All calculations are handled by flexibleEmiEngine.ts.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import SelectField from '$lib/components/SelectField.svelte';
	import { themeState } from '$lib/stores/theme.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import ComparisonSummary from '$lib/components/tools/shared/ComparisonSummary.svelte';
	import AmortizationTable from '$lib/components/tools/shared/AmortizationTable.svelte';
	import {
		buildBalanceComparisonLine,
		buildSingleBalanceLine
	} from '$lib/components/tools/charts/chartConfigs.js';
	import { computeFlexibleEmiComparison } from '$lib/tools/planners/flexibleEmiEngine.js';
	import { groupScheduleByCalendarYear } from '$lib/tools/calculators/emiEngine.js';
	import { calculateEMI } from '$lib/ruleEngine/emiCalculator.js';
	import { formatNumber } from '$lib/i18n';
	import { LOAN_DEFAULTS, MONTH_NAMES_SHORT } from '$lib/tools/constants.js';
	import type { EmiChangePoint, EmiChangeMode } from '$lib/tools/types.js';
	import { applyEmiChange } from '$lib/tools/planners/flexibleEmiEngine.js';

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

	// --- Loan start date ---
	const now = new Date();
	let loanStartYear: number = $state(now.getFullYear());
	let loanStartMonth: number = $state(now.getMonth() + 1);
	let loanStartDate = $derived(`${loanStartYear}-${String(loanStartMonth).padStart(2, '0')}`);

	// =========================================================================
	// EMI CHANGE POINTS (managed list)
	// =========================================================================

	/** All EMI change points the user has added */
	let emiChangePoints: EmiChangePoint[] = $state([]);

	/** Counter for generating unique IDs */
	let nextChangeId: number = $state(1);

	// --- Form fields for adding a new EMI change point ---
	// Initialized from `now` (not from loanStartMonth/Year $state) to avoid
	// `state_referenced_locally`. These are independent local defaults, not
	// synced mirrors of the loan start date.
	let newChangeMode: EmiChangeMode = $state('increase_percent');
	let newChangeValue: number = $state(10);
	let newChangeStartMonth: number = $state(now.getMonth() + 1);
	let newChangeStartYear: number = $state(now.getFullYear() + 1);
	let isTemporary: boolean = $state(false);
	let newChangeEndMonth: number = $state(now.getMonth() + 1);
	let newChangeEndYear: number = $state(now.getFullYear() + 2);
	let addError: string = $state('');

	// --- Month-Year picker options ---
	const monthOptions = MONTH_NAMES_SHORT.map((m, i) => ({ label: m, value: i + 1 }));

	// Year range: loan start year to loan end year + 5
	let yearOptions = $derived.by(() => {
		const endYear = loanStartYear + Math.ceil(tenureInMonths / 12) + 5;
		const options: { label: string; value: number }[] = [];
		for (let y = loanStartYear; y <= endYear; y++) {
			options.push({ label: String(y), value: y });
		}
		return options;
	});

	// Convert month-year to 0-based month index from loan start
	function toMonthIndex(year: number, month: number): number {
		return (year - loanStartYear) * 12 + (month - loanStartMonth);
	}

	// Convert month index to readable date label
	function toDateLabel(monthIndex: number): string {
		const date = new Date(loanStartYear, loanStartMonth - 1 + monthIndex);
		return `${MONTH_NAMES_SHORT[date.getMonth()]}-${date.getFullYear()}`;
	}

	// Mode labels for the change type selector
	const changeModeOptions: { label: string; value: EmiChangeMode }[] = [
		{ label: 'Set EMI to specific amount', value: 'set_amount' },
		{ label: 'Increase EMI by %', value: 'increase_percent' },
		{ label: 'Decrease EMI by %', value: 'decrease_percent' },
		{ label: 'Increase EMI by ₹', value: 'increase_amount' },
		{ label: 'Decrease EMI by ₹', value: 'decrease_amount' }
	];

	// Dynamic label for the value input based on selected mode
	let valueLabel = $derived(
		(newChangeMode as string) === 'set_amount'
			? 'New EMI Amount (₹)'
			: (newChangeMode as string).includes('percent')
				? 'Change by (%)'
				: 'Change by (₹)'
	);

	// Dynamic max for value input
	let valueMax = $derived((newChangeMode as string).includes('percent') ? 100 : loanPrincipal);

	// Dynamic step for value input
	let valueStep = $derived((newChangeMode as string).includes('percent') ? 0.5 : 1000);

	// =========================================================================
	// DERIVED CALCULATIONS
	// =========================================================================

	/** The base EMI without any changes */
	let baseMonthlyEmi = $derived(calculateEMI(loanPrincipal, annualInterestRate, tenureInMonths));

	/**
	 * The full comparison result: original schedule vs modified schedule.
	 * Recalculates whenever loan details or EMI change points change.
	 */
	let comparisonResult = $derived.by(() => {
		if (loanPrincipal <= 0 || annualInterestRate <= 0 || tenureInMonths <= 0) return null;

		return computeFlexibleEmiComparison(
			loanPrincipal,
			annualInterestRate,
			tenureInMonths,
			loanStartDate,
			emiChangePoints
		);
	});

	/** Whether there are any EMI change points added */
	let hasChangePoints = $derived(emiChangePoints.length > 0);

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

		if (hasChangePoints) {
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
					}
				]
			: []
	);

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Add a new EMI change point to the list */
	function addEmiChangePoint() {
		addError = '';

		const startIdx = toMonthIndex(newChangeStartYear, newChangeStartMonth);
		const endIdx = isTemporary ? toMonthIndex(newChangeEndYear, newChangeEndMonth) : undefined;

		// Validation
		if (newChangeValue <= 0) {
			addError = 'Value must be greater than zero';
			return;
		}
		if (startIdx <= 0) {
			addError = 'Start date must be after the loan start date';
			return;
		}
		if (startIdx > tenureInMonths * 2) {
			addError = 'Start date exceeds loan tenure';
			return;
		}
		if (isTemporary && endIdx != null && endIdx <= startIdx) {
			addError = 'End date must be after start date';
			return;
		}

		// Check for duplicate start month
		if (emiChangePoints.some((cp) => cp.atMonthIndex === startIdx)) {
			addError = 'An EMI change already exists at this month';
			return;
		}

		// Compute the resolved EMI amount for display
		const resolvedEmi = applyEmiChange(baseMonthlyEmi, {
			id: '',
			atMonthIndex: startIdx,
			newEmiAmount: newChangeValue,
			changeMode: newChangeMode,
			value: newChangeValue
		});

		const newEntry: EmiChangePoint = {
			id: `ec-${nextChangeId++}`,
			atMonthIndex: startIdx,
			newEmiAmount: resolvedEmi,
			dateLabel: toDateLabel(startIdx),
			changeMode: newChangeMode,
			value: newChangeValue,
			endMonthIndex: endIdx,
			endDateLabel: endIdx != null ? toDateLabel(endIdx) : undefined
		};

		emiChangePoints = [...emiChangePoints, newEntry];
	}

	/** Remove an EMI change point by ID */
	function removeChangePoint(changeId: string) {
		emiChangePoints = emiChangePoints.filter((cp) => cp.id !== changeId);
	}
</script>

<!-- ======================================================================= -->
<!-- FLEXIBLE EMI PLANNER UI                                                 -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- === Section 1: Loan Details === -->
	<div class="space-y-6">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Loan Details</h2>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<NumberField
				id="fem-loan-amount"
				label="Principal Outstanding ({'\u20B9'})"
				bind:value={loanPrincipal}
				min={LOAN_DEFAULTS.MIN_PRINCIPAL}
				max={LOAN_DEFAULTS.MAX_PRINCIPAL}
				formatIndian={true}
				icon="indian-rupee"
			/>

			<div class="flex w-full flex-col">
				<label for="fem-interest-rate" class="label-modern">Interest Rate (% p.a.)</label>
				<input
					id="fem-interest-rate"
					type="number"
					step="0.1"
					min={LOAN_DEFAULTS.MIN_INTEREST_RATE}
					max={LOAN_DEFAULTS.MAX_INTEREST_RATE}
					bind:value={annualInterestRate}
					class="input-modern inputText"
				/>
			</div>

			<NumberField
				id="fem-tenure"
				label="Remaining Tenure (Months)"
				bind:value={tenureInMonths}
				min={LOAN_DEFAULTS.MIN_TENURE_MONTHS}
				max={LOAN_DEFAULTS.MAX_TENURE_MONTHS}
				formatIndian={false}
			/>
		</div>

		<!-- Current EMI Display -->
		{#if baseMonthlyEmi > 0}
			<div class="rounded-lg bg-[var(--ddsa-secondary-50)] px-4 py-3 text-sm">
				<span class="text-[var(--ddsa-secondary-500)]">Current Monthly EMI:</span>
				<span class="ml-2 font-bold text-[var(--ddsa-secondary)]"
					>{'\u20B9'} {formatNumber(baseMonthlyEmi)}</span
				>
			</div>
		{/if}
	</div>

	<!-- === Section 2: EMI Change Points === -->
	<div class="space-y-4">
		<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">EMI Change Points</h2>

		<!-- EMI change point form (add new) -->
		<div
			class="space-y-4 rounded-xl border border-[var(--dash-border)] bg-white p-4 dark:bg-[var(--dash-bg-card)]"
		>
			<!-- Row 1: Change type + value -->
			<div class="grid gap-4 sm:grid-cols-2">
				<SelectField
					id="fem-change-mode"
					label="Change Type"
					bind:value={newChangeMode}
					options={changeModeOptions}
				/>

				<NumberField
					id="fem-change-value"
					label={valueLabel}
					bind:value={newChangeValue}
					min={newChangeMode.includes('percent') ? 0.5 : 1000}
					max={valueMax}
					step={valueStep}
					formatIndian={!newChangeMode.includes('percent')}
					icon={newChangeMode.includes('percent') ? undefined : 'indian-rupee'}
				/>
			</div>

			<!-- Row 2: Start month-year -->
			<div>
				<p class="label-modern mb-1">Start From</p>
				<div class="grid grid-cols-2 gap-2">
					<SelectField
						id="fem-start-month"
						label=""
						bind:value={newChangeStartMonth}
						options={monthOptions}
					/>
					<SelectField
						id="fem-start-year"
						label=""
						bind:value={newChangeStartYear}
						options={yearOptions}
					/>
				</div>
			</div>

			<!-- Row 3: Temporary toggle + end date -->
			<div>
				<label class="flex cursor-pointer items-center gap-2 select-none">
					<input
						type="checkbox"
						bind:checked={isTemporary}
						class="h-4 w-4 rounded border-[var(--dash-border)] accent-[var(--ddsa-primary)]"
					/>
					<span class="text-sm text-[var(--form-text)]"
						>Temporary change (revert after a period)</span
					>
				</label>

				{#if isTemporary}
					<div class="mt-2">
						<p class="label-modern mb-1">Revert After</p>
						<div class="grid grid-cols-2 gap-2">
							<SelectField
								id="fem-end-month"
								label=""
								bind:value={newChangeEndMonth}
								options={monthOptions}
							/>
							<SelectField
								id="fem-end-year"
								label=""
								bind:value={newChangeEndYear}
								options={yearOptions}
							/>
						</div>
					</div>
				{/if}
			</div>

			{#if addError}
				<p class="text-sm text-[var(--ddsa-error)]">{addError}</p>
			{/if}

			<button
				type="button"
				onclick={addEmiChangePoint}
				class="rounded-lg bg-[var(--ddsa-primary)] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--ddsa-primary-600)]"
			>
				Add EMI Change
			</button>
		</div>

		<!-- EMI change points table -->
		{#if emiChangePoints.length > 0}
			<div class="overflow-x-auto rounded-lg border border-[var(--dash-border)]">
				<table class="w-full text-sm">
					<thead class="bg-[var(--ddsa-secondary)] text-white">
						<tr>
							<th class="px-3 py-2.5 text-left font-medium">From</th>
							<th class="px-3 py-2.5 text-left font-medium">To</th>
							<th class="px-3 py-2.5 text-left font-medium">Change</th>
							<th class="px-3 py-2.5 text-right font-medium">New EMI</th>
							<th class="px-3 py-2.5 text-center font-medium"></th>
						</tr>
					</thead>
					<tbody>
						{#each emiChangePoints as cp (cp.id)}
							{@const mode = cp.changeMode ?? 'set_amount'}
							{@const changeLabel =
								mode === 'set_amount'
									? `Set to ₹${formatNumber(cp.value ?? cp.newEmiAmount)}`
									: mode === 'increase_percent'
										? `+${cp.value}%`
										: mode === 'decrease_percent'
											? `-${cp.value}%`
											: mode === 'increase_amount'
												? `+₹${formatNumber(cp.value ?? 0)}`
												: `-₹${formatNumber(cp.value ?? 0)}`}
							<tr class="border-b border-[var(--dash-border)] hover:bg-[var(--ddsa-primary-50)]">
								<td class="px-3 py-2.5 text-left">{cp.dateLabel ?? `Month ${cp.atMonthIndex}`}</td>
								<td class="px-3 py-2.5 text-left text-[var(--form-text-secondary)]">
									{cp.endDateLabel ??
										(cp.endMonthIndex != null ? `Month ${cp.endMonthIndex}` : 'Permanent')}
								</td>
								<td class="px-3 py-2.5 text-left font-medium">{changeLabel}</td>
								<td class="px-3 py-2.5 text-right font-medium">₹{formatNumber(cp.newEmiAmount)}</td>
								<td class="px-3 py-2.5 text-center">
									<button
										type="button"
										onclick={() => removeChangePoint(cp.id)}
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
		{#if hasChangePoints}
			<ResultCard
				title="Your Savings"
				items={[
					{
						label: 'Interest Saved',
						value: `\u20B9 ${formatNumber(Math.round(comparisonResult.interestSaved))}`,
						highlight: true
					},
					{
						label: 'Tenure Saved',
						value: `${comparisonResult.tenureSavedMonths} months`
					}
				]}
			/>

			<ComparisonSummary rows={comparisonRows} />
		{/if}

		<!-- Chart -->
		{#if chartConfig}
			<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
				<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">
					{hasChangePoints
						? 'Balance Comparison: With vs Without EMI Changes'
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
				Amortization Schedule {hasChangePoints ? '(With EMI Changes)' : ''}
			</h3>
			<AmortizationTable
				yearlySummary={comparisonResult.modifiedYearlySummary}
				showPartPaymentColumn={false}
			/>
		</div>
	{/if}
</div>
