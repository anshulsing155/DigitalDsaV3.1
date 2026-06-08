<script lang="ts">
	import PipelineCaseCard from './PipelineCaseCard.svelte';
	import { formatCurrency } from '$lib/i18n';

	interface CaseItem {
		case_id: string;
		label: string;
		loan_type: string;
		loan_amount: number;
		days_in_stage: number;
		lenders: string[];
	}

	interface Props {
		stage: string;
		label: string;
		count: number;
		totalAmount: number;
		cases: CaseItem[];
		color: string;
	}

	let { stage, label, count, totalAmount, cases, color }: Props = $props();

	const isEmpty = $derived(count === 0);
</script>

<div class="pipeline-column" class:column-empty={isEmpty}>
	<div class="column-header" style="border-top-color: {color};">
		<div class="header-top">
			<span class="stage-name">{label}</span>
			<span class="case-count" style="background-color: {color};">{count}</span>
		</div>
		{#if totalAmount > 0}
			<div class="header-amount">
				{formatCurrency(totalAmount, true)}
			</div>
		{/if}
	</div>

	<div class="column-body">
		{#if isEmpty}
			<div class="empty-state">
				<span class="empty-dot" style="background-color: {color};"></span>
				<span class="empty-text">No cases</span>
			</div>
		{:else}
			{#each cases as caseItem (caseItem.case_id)}
				<PipelineCaseCard
					case_id={caseItem.case_id}
					label={caseItem.label}
					loan_type={caseItem.loan_type}
					loan_amount={caseItem.loan_amount}
					days_in_stage={caseItem.days_in_stage}
					lenders={caseItem.lenders}
				/>
			{/each}
		{/if}
	</div>
</div>

<style>
	.pipeline-column {
		min-width: 220px;
		max-width: 260px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		background: var(--dash-bg-alt);
		border-radius: 0.75rem;
		border: 1px solid var(--dash-border);
		overflow: hidden;
	}

	.pipeline-column.column-empty {
		opacity: 0.5;
	}

	.column-header {
		padding: 0.75rem;
		border-top: 3px solid;
		background: var(--dash-bg-card);
		border-bottom: 1px solid var(--dash-border-light);
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.stage-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.case-count {
		font-size: 0.6875rem;
		font-weight: 700;
		color: white;
		min-width: 1.375rem;
		height: 1.375rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		padding: 0 0.375rem;
	}

	.header-amount {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
	}

	.column-body {
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		overflow-y: auto;
		max-height: 420px;
		flex: 1;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 1.5rem 0.5rem;
		gap: 0.5rem;
	}

	.empty-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		opacity: 0.4;
	}

	.empty-text {
		font-size: 0.6875rem;
		color: var(--dash-text-muted);
	}

	@media (max-width: 768px) {
		.pipeline-column {
			min-width: 200px;
			max-width: 240px;
		}

		.column-header {
			padding: 0.625rem;
		}

		.column-body {
			padding: 0.375rem;
			max-height: 320px;
		}
	}
</style>
