<script lang="ts">
	import type { TrancheBreakdown } from '$lib/types/lenderResults';
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		breakdown: TrancheBreakdown;
	}

	let { breakdown }: Props = $props();
</script>

<div class="tranche-section">
	<div class="tranche-header">
		<span class="tranche-title">Disbursement Structure</span>
		{#if breakdown.lcr_is_failsafe}
			<span class="tranche-failsafe">Estimated LCR</span>
		{/if}
	</div>
	<div class="tranche-grid">
		{#each breakdown.tranches as tranche}
			<div class="tranche-item">
				<div class="tranche-label-row">
					<span class="tranche-label">{tranche.label}</span>
					{#if tranche.recipient === 'seller'}
						<span class="tranche-recipient tranche-recipient-seller">To seller</span>
					{:else if tranche.recipient === 'buyer'}
						<span class="tranche-recipient tranche-recipient-buyer">To buyer</span>
					{/if}
				</div>
				<span class="tranche-amount">{formatCurrency(tranche.amount, true)}</span>
				<div class="tranche-meta">
					<span class="tranche-rate">{tranche.roi}%</span>
					<span class="tranche-timing tranche-timing-{tranche.timing}">{tranche.timing_label}</span>
				</div>
				{#if tranche.release_condition}
					<div class="tranche-condition">{tranche.release_condition}</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Own contribution breakdown -->
	{#if breakdown.own_contribution}
		<div class="tranche-own-contribution">
			<div class="tranche-own-header">Your Contribution</div>
			<div class="tranche-own-grid">
				{#if breakdown.own_contribution.advance_paid > 0}
					<div class="tranche-own-row">
						<span class="tranche-own-label">Advance paid (per agreement)</span>
						<span class="tranche-own-value"
							>{formatCurrency(breakdown.own_contribution.advance_paid, true)}</span
						>
					</div>
				{/if}
				{#if breakdown.own_contribution.remaining_to_seller > 0}
					<div class="tranche-own-row">
						<span class="tranche-own-label">Remaining to seller</span>
						<span class="tranche-own-value"
							>{formatCurrency(breakdown.own_contribution.remaining_to_seller, true)}</span
						>
					</div>
				{/if}
				<div class="tranche-own-row tranche-own-total">
					<span class="tranche-own-label">Total own funds needed</span>
					<span class="tranche-own-value"
						>{formatCurrency(breakdown.own_contribution.total, true)}</span
					>
				</div>
			</div>
		</div>
	{/if}

	<!-- PL cross-sell hint -->
	{#if breakdown.pl_crosssell_hint}
		<div class="tranche-crosssell">
			<svg class="tranche-crosssell-icon" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
					clip-rule="evenodd"
				/>
			</svg>
			<span class="tranche-crosssell-text">{breakdown.pl_crosssell_hint}</span>
		</div>
	{/if}

	{#if breakdown.post_registry_gap > 0}
		<div class="tranche-warning">
			<svg class="tranche-warn-icon" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
					clip-rule="evenodd"
				/>
			</svg>
			<div class="tranche-warn-text">
				<strong>{formatCurrency(breakdown.post_registry_gap, true)}</strong>
				disbursed after registry
				{#if breakdown.mitigation_guidance}
					<span class="tranche-mitigation">— {breakdown.mitigation_guidance}</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.tranche-section {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--dash-border);
	}

	.tranche-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.tranche-title {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--dash-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tranche-failsafe {
		font-size: 0.5625rem;
		font-weight: 600;
		color: #b45309;
		background: rgba(245, 158, 11, 0.1);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.tranche-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.tranche-item {
		padding: 0.5rem;
		background: var(--dash-bg-alt);
		border-radius: 0.375rem;
		border: 1px solid var(--dash-border);
	}

	.tranche-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.tranche-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	.tranche-recipient {
		font-size: 0.5625rem;
		font-weight: 700;
		padding: 0.0625rem 0.3125rem;
		border-radius: 0.1875rem;
		letter-spacing: 0.02em;
	}

	.tranche-recipient-seller {
		background: rgba(203, 153, 126, 0.15);
		color: #8e5739;
	}

	.tranche-recipient-buyer {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	.tranche-amount {
		display: block;
		font-family: var(--font-title);
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--dash-text);
	}

	.tranche-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.25rem;
	}

	.tranche-rate {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	.tranche-timing {
		font-size: 0.5625rem;
		font-weight: 600;
		padding: 0.0625rem 0.3125rem;
		border-radius: 0.1875rem;
	}

	.tranche-timing-before_registry {
		background: rgba(16, 185, 129, 0.1);
		color: #059669;
	}

	.tranche-timing-at_registry {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	.tranche-timing-after_registry {
		background: rgba(245, 158, 11, 0.1);
		color: #b45309;
	}

	.tranche-condition {
		font-size: 0.625rem;
		font-style: italic;
		color: var(--dash-text-muted);
		margin-top: 0.25rem;
		line-height: 1.3;
	}

	/* ── Own Contribution ────────────────────────────────────── */

	.tranche-own-contribution {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: rgba(245, 158, 11, 0.04);
		border: 1px solid rgba(245, 158, 11, 0.12);
		border-radius: 0.375rem;
	}

	.tranche-own-header {
		font-size: 0.625rem;
		font-weight: 700;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.375rem;
	}

	.tranche-own-grid {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.tranche-own-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tranche-own-label {
		font-size: 0.6875rem;
		color: var(--dash-text-muted);
	}

	.tranche-own-value {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text);
	}

	.tranche-own-total {
		margin-top: 0.125rem;
		padding-top: 0.25rem;
		border-top: 1px dashed rgba(245, 158, 11, 0.2);
	}

	.tranche-own-total .tranche-own-label {
		font-weight: 600;
		color: #92400e;
	}

	.tranche-own-total .tranche-own-value {
		font-weight: 700;
		color: #92400e;
	}

	/* ── PL Cross-sell Banner ───────────────────────────────── */

	.tranche-crosssell {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		margin-top: 0.5rem;
		padding: 0.4375rem 0.625rem;
		background: rgba(59, 130, 246, 0.06);
		border: 1px solid rgba(59, 130, 246, 0.12);
		border-left: 3px solid #3b82f6;
		border-radius: 0.375rem;
	}

	.tranche-crosssell-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #3b82f6;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.tranche-crosssell-text {
		font-size: 0.6875rem;
		color: #1e40af;
		line-height: 1.4;
		font-weight: 500;
	}

	/* ── Post-registry Warning ──────────────────────────────── */

	.tranche-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		margin-top: 0.5rem;
		padding: 0.5rem 0.625rem;
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-radius: 0.375rem;
	}

	.tranche-warn-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: #b45309;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}

	.tranche-warn-text {
		font-size: 0.6875rem;
		color: #92400e;
		line-height: 1.4;
	}

	.tranche-warn-text strong {
		font-weight: 700;
	}

	.tranche-mitigation {
		color: var(--dash-text-muted);
	}

	@media (max-width: 640px) {
		.tranche-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
