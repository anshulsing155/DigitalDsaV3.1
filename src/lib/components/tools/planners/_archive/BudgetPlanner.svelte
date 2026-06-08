<script lang="ts">
	/**
	 * BudgetPlanner — Track income and expenses to find affordable EMI.
	 *
	 * This planner provides a 4-tab interface:
	 * 1. Income — list all income sources with monthly amounts
	 * 2. Household — essential/fixed expenses (rent, groceries, bills)
	 * 3. Lifestyle — discretionary expenses (dining, entertainment, travel)
	 * 4. Summary — totals, savings rate, recommended EMI, doughnut chart
	 *
	 * All calculations are handled by budgetEngine.ts.
	 */
	import NumberField from '$lib/components/NumberField.svelte';
	import ChartWrapper from '$lib/components/tools/charts/ChartWrapper.svelte';
	import ResultCard from '$lib/components/tools/shared/ResultCard.svelte';
	import { buildBudgetAllocationDoughnut } from '$lib/components/tools/charts/chartConfigs.js';
	import { computeBudgetSummary, createDefaultBudgetData, generateBudgetItemId } from '$lib/tools/planners/budgetEngine.js';
	import { formatNumber } from '$lib/utils/formatNumber.js';
	import type { BudgetData, BudgetLineItem } from '$lib/tools/types.js';

	// --- Component Props ---
	interface Props {
		variant?: 'public' | 'dashboard';
	}

	let { variant = 'public' }: Props = $props();

	// =========================================================================
	// BUDGET DATA (user inputs)
	// =========================================================================

	let budgetData: BudgetData = $state(createDefaultBudgetData());

	// =========================================================================
	// TAB STATE
	// =========================================================================

	let activeTab: string = $state('income');

	/** Tab definitions for rendering */
	const tabs = [
		{ id: 'income', label: 'Income' },
		{ id: 'household', label: 'Household' },
		{ id: 'lifestyle', label: 'Lifestyle' },
		{ id: 'summary', label: 'Summary' }
	] as const;

	// =========================================================================
	// DERIVED CALCULATIONS
	// =========================================================================

	/** Computed budget summary (totals, surplus, savings rate, recommended EMI) */
	let summary = $derived(computeBudgetSummary(budgetData));

	/** Chart config for the budget allocation doughnut */
	let chartConfig = $derived(
		buildBudgetAllocationDoughnut(
			summary.totalHouseholdExpenses,
			summary.totalLifestyleExpenses,
			summary.monthlySurplus
		)
	);

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Add a new item to the specified category */
	function addItem(category: 'incomeItems' | 'householdExpenses' | 'lifestyleExpenses') {
		const prefixMap = {
			incomeItems: 'inc',
			householdExpenses: 'hh',
			lifestyleExpenses: 'ls'
		};
		const newItem: BudgetLineItem = {
			id: generateBudgetItemId(prefixMap[category]),
			label: '',
			monthlyAmount: 0
		};
		budgetData[category] = [...budgetData[category], newItem];
	}

	/** Remove an item by ID from the specified category */
	function removeItem(category: 'incomeItems' | 'householdExpenses' | 'lifestyleExpenses', itemId: string) {
		budgetData[category] = budgetData[category].filter((item) => item.id !== itemId);
	}
</script>

<!-- ======================================================================= -->
<!-- BUDGET PLANNER UI                                                       -->
<!-- ======================================================================= -->

<div class="space-y-8">
	<!-- Tab Navigation -->
	<div class="flex rounded-lg bg-[var(--ddsa-secondary-50)] p-0.5">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="rounded-md px-4 py-2 text-sm font-medium transition-all {activeTab === tab.id
					? 'bg-[var(--ddsa-secondary)] text-white'
					: 'text-[var(--ddsa-secondary-600)]'}"
				onclick={() => (activeTab = tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- === Income Tab === -->
	{#if activeTab === 'income'}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Monthly Income Sources</h2>

			<div class="space-y-3">
				{#each budgetData.incomeItems as item (item.id)}
					<div class="flex items-end gap-3 rounded-lg border border-[var(--dash-border)] bg-white p-3">
						<div class="flex-1">
							<label for="inc-label-{item.id}" class="label-modern">Description</label>
							<input
								id="inc-label-{item.id}"
								type="text"
								bind:value={item.label}
								placeholder="e.g. Monthly Salary"
								class="input-modern inputText"
							/>
						</div>
						<div class="w-48">
							<NumberField
								id="inc-amt-{item.id}"
								label="Amount ({'\u20B9'})"
								bind:value={item.monthlyAmount}
								min={0}
								max={100_000_000}
								formatIndian={true}
								icon="indian-rupee"
							/>
						</div>
						<button
							type="button"
							onclick={() => removeItem('incomeItems', item.id)}
							class="mb-1 text-sm text-[var(--ddsa-error)] hover:underline"
						>
							Remove
						</button>
					</div>
				{/each}
			</div>

			<button
				type="button"
				onclick={() => addItem('incomeItems')}
				class="rounded-lg bg-[var(--ddsa-primary)] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--ddsa-primary-600)]"
			>
				Add Income Source
			</button>
		</div>
	{/if}

	<!-- === Household Tab === -->
	{#if activeTab === 'household'}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Household Expenses</h2>

			<div class="space-y-3">
				{#each budgetData.householdExpenses as item (item.id)}
					<div class="flex items-end gap-3 rounded-lg border border-[var(--dash-border)] bg-white p-3">
						<div class="flex-1">
							<label for="hh-label-{item.id}" class="label-modern">Description</label>
							<input
								id="hh-label-{item.id}"
								type="text"
								bind:value={item.label}
								placeholder="e.g. Rent"
								class="input-modern inputText"
							/>
						</div>
						<div class="w-48">
							<NumberField
								id="hh-amt-{item.id}"
								label="Amount ({'\u20B9'})"
								bind:value={item.monthlyAmount}
								min={0}
								max={100_000_000}
								formatIndian={true}
								icon="indian-rupee"
							/>
						</div>
						<button
							type="button"
							onclick={() => removeItem('householdExpenses', item.id)}
							class="mb-1 text-sm text-[var(--ddsa-error)] hover:underline"
						>
							Remove
						</button>
					</div>
				{/each}
			</div>

			<button
				type="button"
				onclick={() => addItem('householdExpenses')}
				class="rounded-lg bg-[var(--ddsa-primary)] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--ddsa-primary-600)]"
			>
				Add Household Expense
			</button>
		</div>
	{/if}

	<!-- === Lifestyle Tab === -->
	{#if activeTab === 'lifestyle'}
		<div class="space-y-4">
			<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Lifestyle Expenses</h2>

			<div class="space-y-3">
				{#each budgetData.lifestyleExpenses as item (item.id)}
					<div class="flex items-end gap-3 rounded-lg border border-[var(--dash-border)] bg-white p-3">
						<div class="flex-1">
							<label for="ls-label-{item.id}" class="label-modern">Description</label>
							<input
								id="ls-label-{item.id}"
								type="text"
								bind:value={item.label}
								placeholder="e.g. Dining Out"
								class="input-modern inputText"
							/>
						</div>
						<div class="w-48">
							<NumberField
								id="ls-amt-{item.id}"
								label="Amount ({'\u20B9'})"
								bind:value={item.monthlyAmount}
								min={0}
								max={100_000_000}
								formatIndian={true}
								icon="indian-rupee"
							/>
						</div>
						<button
							type="button"
							onclick={() => removeItem('lifestyleExpenses', item.id)}
							class="mb-1 text-sm text-[var(--ddsa-error)] hover:underline"
						>
							Remove
						</button>
					</div>
				{/each}
			</div>

			<button
				type="button"
				onclick={() => addItem('lifestyleExpenses')}
				class="rounded-lg bg-[var(--ddsa-primary)] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--ddsa-primary-600)]"
			>
				Add Lifestyle Expense
			</button>
		</div>
	{/if}

	<!-- === Summary Tab === -->
	{#if activeTab === 'summary'}
		<div class="space-y-6">
			<h2 class="text-lg font-semibold text-[var(--ddsa-secondary)]">Budget Summary</h2>

			<!-- Result Card with totals -->
			<ResultCard
				title="Monthly Overview"
				items={[
					{
						label: 'Total Income',
						value: `\u20B9 ${formatNumber(Math.round(summary.totalIncome))}`
					},
					{
						label: 'Household Expenses',
						value: `\u20B9 ${formatNumber(Math.round(summary.totalHouseholdExpenses))}`
					},
					{
						label: 'Lifestyle Expenses',
						value: `\u20B9 ${formatNumber(Math.round(summary.totalLifestyleExpenses))}`
					},
					{
						label: 'Monthly Surplus',
						value: `\u20B9 ${formatNumber(Math.round(summary.monthlySurplus))}`,
						highlight: true
					},
					{
						label: 'Savings Rate',
						value: `${summary.savingsRate.toFixed(1)}%`
					},
					{
						label: 'Recommended Max EMI',
						value: `\u20B9 ${formatNumber(summary.recommendedMaxEmi)}`,
						highlight: true
					}
				]}
			/>

			<!-- Budget Allocation Chart -->
			{#if summary.totalIncome > 0}
				<div class="rounded-xl border border-[var(--dash-border)] bg-white p-4">
					<h3 class="mb-3 text-sm font-semibold text-[var(--ddsa-secondary)]">
						Income Allocation
					</h3>
					<ChartWrapper
						type="doughnut"
						data={chartConfig.data}
						options={chartConfig.options}
						height="320px"
					/>
				</div>
			{/if}

			<!-- Recommendation Note -->
			{#if summary.recommendedMaxEmi > 0}
				<div class="rounded-lg bg-[var(--ddsa-primary-50)] px-4 py-3 text-sm">
					<span class="font-medium text-[var(--ddsa-primary-700)]">Recommendation:</span>
					<span class="ml-1 text-[var(--ddsa-primary-600)]">
						Based on your surplus of {'\u20B9'} {formatNumber(Math.round(summary.monthlySurplus))},
						your maximum affordable EMI is approximately
						<strong>{'\u20B9'} {formatNumber(summary.recommendedMaxEmi)}</strong>
						(40% of surplus, per FOIR guidelines).
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
