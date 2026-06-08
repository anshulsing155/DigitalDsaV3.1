<script lang="ts">
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		case_id: string;
		label: string;
		loan_type: string;
		loan_amount: number;
		days_in_stage: number;
		lenders: string[];
	}

	let { case_id, label, loan_type, loan_amount, days_in_stage, lenders }: Props = $props();
</script>

<a href="/dashboard/dsa/cases/{case_id}" class="case-card">
	<div class="card-header">
		<span class="case-label" title={label}>{label}</span>
		<span class="loan-type-badge">{loan_type}</span>
	</div>

	<div class="card-amount">
		{#if loan_amount > 0}
			{formatCurrency(loan_amount, true)}
		{:else}
			<span class="amount-na">Amount TBD</span>
		{/if}
	</div>

	<div class="card-footer">
		<span
			class="days-badge"
			class:days-warning={days_in_stage >= 7}
			class:days-critical={days_in_stage >= 14}
		>
			{days_in_stage}d
		</span>
		{#if lenders.length > 0}
			<span class="lender-badge" title={lenders.join(', ')}>
				{lenders.length} lender{lenders.length !== 1 ? 's' : ''}
			</span>
		{/if}
	</div>
</a>

<style>
	.case-card {
		display: block;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border);
		border-radius: 0.5rem;
		padding: 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
		text-decoration: none;
		color: inherit;
	}

	.case-card:hover {
		border-color: var(--ddsa-primary-400);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.375rem;
		margin-bottom: 0.375rem;
	}

	.case-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.loan-type-badge {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		background: var(--dash-bg-alt);
		padding: 0.0625rem 0.375rem;
		border-radius: 0.25rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.card-amount {
		font-size: 0.8125rem;
		font-weight: 700;
		color: var(--dash-text);
		margin-bottom: 0.375rem;
	}

	.amount-na {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--dash-text-muted);
		font-style: italic;
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.days-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		background: var(--dash-bg-alt);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.days-badge.days-warning {
		color: var(--ddsa-primary-600);
		background: var(--ddsa-primary-50);
	}

	.days-badge.days-critical {
		color: var(--ddsa-primary-800);
		background: var(--ddsa-primary-100);
	}

	.lender-badge {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--ddsa-secondary-700);
		background: var(--ddsa-secondary-100);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	@media (max-width: 768px) {
		.case-card {
			padding: 0.5rem;
			min-height: 2.75rem;
		}
	}
</style>
