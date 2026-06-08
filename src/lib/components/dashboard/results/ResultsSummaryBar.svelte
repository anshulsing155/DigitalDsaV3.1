<script lang="ts">
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		summary: {
			total_lenders: number;
			green_count: number;
			amber_count: number;
			red_count: number;
			best_amount: { value: number; lender: string };
			best_roi: { value: number; lender: string };
			best_emi: { value: number; lender: string };
			requested_amount: number;
			loan_type: string;
		};
		version?: number;
		computedAt?: string;
	}

	let { summary, version, computedAt }: Props = $props();

	const computedLabel = $derived(() => {
		if (!computedAt) return '';
		const d = new Date(computedAt);
		return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
	});
</script>

<div class="summary-bar">
	<!-- Best offer highlights -->
	<div class="summary-highlights">
		<span class="highlight-value">{formatCurrency(summary.best_amount.value, true)}</span>
		<span class="highlight-sep">&middot;</span>
		<span class="highlight-label">{summary.best_roi.value}% ROI</span>
		<span class="highlight-sep">&middot;</span>
		<span class="highlight-label">{formatCurrency(summary.best_emi.value, true)}/mo</span>
	</div>

	<!-- Lender counts with traffic dots -->
	<div class="summary-counts">
		{#if summary.green_count > 0}
			<span class="count-item" aria-label="{summary.green_count} eligible">
				<span class="count-dot dot-green" aria-hidden="true"></span>
				{summary.green_count}
			</span>
		{/if}
		{#if summary.amber_count > 0}
			<span class="count-item" aria-label="{summary.amber_count} marginal">
				<span class="count-dot dot-amber" aria-hidden="true"></span>
				{summary.amber_count}
			</span>
		{/if}
		{#if summary.red_count > 0}
			<span class="count-item" aria-label="{summary.red_count} ineligible">
				<span class="count-dot dot-red" aria-hidden="true"></span>
				{summary.red_count}
			</span>
		{/if}
		<span class="count-total">of {summary.total_lenders}</span>
		{#if version && version > 1}
			<span class="count-version">v{version}</span>
		{/if}
		{#if computedAt}
			<span class="count-date">{computedLabel()}</span>
		{/if}
	</div>
</div>

<style>
	.summary-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.625rem 0.875rem;
		background: var(--ddsa-secondary-900, #0f172a);
		border-radius: 0.625rem;
		flex-wrap: wrap;
	}

	.summary-highlights {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.highlight-value {
		font-size: 1rem;
		font-weight: 700;
		color: white;
		font-family: var(--font-title);
		letter-spacing: -0.01em;
	}

	.highlight-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}

	.highlight-sep {
		color: rgba(255, 255, 255, 0.3);
		font-size: 0.75rem;
	}

	.summary-counts {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.count-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
	}

	.count-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
	}

	.dot-green {
		background: #34d399;
	}
	.dot-amber {
		background: #d6ae99;
	}
	.dot-red {
		background: #f87171;
	}

	.count-total {
		font-size: 0.6875rem;
		color: rgba(255, 255, 255, 0.45);
	}

	.count-version {
		font-size: 0.625rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.4);
		padding: 0.0625rem 0.375rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 0.25rem;
	}

	.count-date {
		font-size: 0.625rem;
		color: rgba(255, 255, 255, 0.35);
	}

	@media (max-width: 640px) {
		.summary-bar {
			padding: 0.5rem 0.75rem;
			gap: 0.5rem;
		}

		.highlight-value {
			font-size: 0.875rem;
		}
	}
</style>
