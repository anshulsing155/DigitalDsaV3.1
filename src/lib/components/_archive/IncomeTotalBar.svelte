<script lang="ts">
	import type { IncomeSourceEntry } from '$lib/types/incomeProfile';
	import { estimateTotalMonthlyIncome } from '$lib/utils/incomeEstimate';
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		entries: IncomeSourceEntry[];
	}

	let { entries }: Props = $props();

	let total = $derived(estimateTotalMonthlyIncome(entries));
</script>

<!-- Hidden: each lender assesses income differently, showing an estimate may confuse DSAs -->
<!-- To restore, change the condition back to: entries.length > 0 && total > 0 -->
{#if false}
	<div class="income-total-bar">
		<span class="income-total-label">Est. Monthly Income</span>
		<span class="income-total-amount">{formatCurrency(total, true)}</span>
	</div>
{/if}

<style>
	.income-total-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		margin-top: 0.75rem;
		background: var(--form-bg-alt, #f9fafb);
		border: 1px solid var(--form-border, #e5e7eb);
		border-radius: 0.5rem;
		font-family: var(--font-paragraph);
	}

	.income-total-label {
		font-size: 0.75rem;
		color: var(--form-text-muted, #6b7280);
		font-weight: 500;
	}

	.income-total-amount {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--ddsa-accent-500, #22c55e);
		font-family: var(--font-titleBold);
	}
</style>
