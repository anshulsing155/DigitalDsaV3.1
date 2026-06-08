<script lang="ts">
	import { formatCurrency } from '$lib/i18n';

	interface Props {
		sanctionHeadline: number;
		sellerDisbursement: number;
		buyerCashComponent: number;
		buyerNetOutOfPocket: number;
		/** Market + registry inputs that drive the buyer-margin-on-registered sub-note.
		 *  When either is missing the sub-note is suppressed gracefully. */
		marketValue?: number;
		registryValue?: number;
	}

	let {
		sanctionHeadline,
		sellerDisbursement,
		buyerCashComponent,
		buyerNetOutOfPocket,
		marketValue,
		registryValue
	}: Props = $props();

	const totalDisbursed = $derived(sellerDisbursement + buyerCashComponent);
	const unusedSanction = $derived(Math.max(0, sanctionHeadline - totalDisbursed));

	// Buyer's margin on the registered portion = what the buyer owes on
	// registration day beyond what the seller-disbursement loan covers.
	// = registryValue − sellerDisbursement (clamped to zero).
	// Only meaningful when registryValue is known and exceeds the seller disbursement.
	const hasBuyerMargin = $derived(
		registryValue !== undefined && registryValue > sellerDisbursement
	);
	const buyerMarginOnRegistered = $derived(
		hasBuyerMargin ? Math.max(0, (registryValue ?? 0) - sellerDisbursement) : 0
	);
</script>

<div class="pe-section">
	<div class="pe-header">
		<span class="pe-title">Plot & Equity — 4-number breakdown</span>
		<span class="pe-subtitle">Two loan files: plot loan to seller + LAP to buyer</span>
	</div>

	<div class="pe-grid">
		<div class="pe-item pe-item-sanction">
			<div class="pe-label-row">
				<span class="pe-label">Sanctioned</span>
				<span class="pe-tag pe-tag-headline">Headline</span>
			</div>
			<span class="pe-amount">{formatCurrency(sanctionHeadline, true)}</span>
			<span class="pe-note">Total lender commitment (X% × market value)</span>
		</div>

		<div class="pe-item">
			<div class="pe-label-row">
				<span class="pe-label">Seller payment</span>
				<span class="pe-tag pe-tag-seller">To seller</span>
			</div>
			<span class="pe-amount">{formatCurrency(sellerDisbursement, true)}</span>
			<span class="pe-note">Plot-loan file disbursement (bounded by registry value)</span>
		</div>

		<div class="pe-item">
			<div class="pe-label-row">
				<span class="pe-label">Buyer cash</span>
				<span class="pe-tag pe-tag-buyer">To buyer</span>
			</div>
			<span class="pe-amount">{formatCurrency(buyerCashComponent, true)}</span>
			<span class="pe-note">LAP-on-plot disbursement (the cash component)</span>
		</div>

		<div class="pe-item pe-item-net">
			<div class="pe-label-row">
				<span class="pe-label">Buyer net cash needed</span>
				<span class="pe-tag pe-tag-net">Out of pocket</span>
			</div>
			<span class="pe-amount">{formatCurrency(buyerNetOutOfPocket, true)}</span>
			<span class="pe-note">What buyer must bring from own funds</span>
		</div>
	</div>

	{#if hasBuyerMargin}
		<div class="pe-margin-note pe-margin-note-warn">
			<span class="pe-margin-text pe-margin-text-warn">
				You'll need to bring
				<strong>{formatCurrency(buyerMarginOnRegistered, true)}</strong>
				on registration day as your margin on the registered portion.
			</span>
		</div>
	{/if}

	{#if unusedSanction > 0}
		<div class="pe-margin-note pe-margin-note-info">
			<span class="pe-margin-text">
				Unused sanction: <strong>{formatCurrency(unusedSanction, true)}</strong> of headline
				not disbursed (combined caps).
			</span>
		</div>
	{/if}
</div>

<style>
	.pe-section {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--dash-border);
	}

	.pe-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin-bottom: 0.5rem;
	}

	.pe-title {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--dash-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.pe-subtitle {
		font-size: 0.625rem;
		color: var(--dash-text-muted);
		font-style: italic;
	}

	.pe-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}

	.pe-item {
		padding: 0.5rem;
		background: var(--dash-bg-alt);
		border-radius: 0.375rem;
		border: 1px solid var(--dash-border);
	}

	.pe-item-sanction {
		background: rgba(59, 130, 246, 0.04);
		border-color: rgba(59, 130, 246, 0.16);
	}

	.pe-item-net {
		background: rgba(245, 158, 11, 0.04);
		border-color: rgba(245, 158, 11, 0.16);
	}

	.pe-label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.pe-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
	}

	.pe-tag {
		font-size: 0.5625rem;
		font-weight: 700;
		padding: 0.0625rem 0.3125rem;
		border-radius: 0.1875rem;
		letter-spacing: 0.02em;
	}

	.pe-tag-headline {
		background: rgba(59, 130, 246, 0.1);
		color: #2563eb;
	}

	.pe-tag-seller {
		background: rgba(203, 153, 126, 0.15);
		color: #8e5739;
	}

	.pe-tag-buyer {
		background: rgba(16, 185, 129, 0.1);
		color: #059669;
	}

	.pe-tag-net {
		background: rgba(245, 158, 11, 0.1);
		color: #b45309;
	}

	.pe-amount {
		display: block;
		font-family: var(--font-title);
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--dash-text);
	}

	.pe-note {
		display: block;
		font-size: 0.625rem;
		color: var(--dash-text-muted);
		margin-top: 0.1875rem;
		line-height: 1.3;
	}

	.pe-margin-note {
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

	.pe-margin-note-info {
		background: rgba(59, 130, 246, 0.06);
		border: 1px solid rgba(59, 130, 246, 0.12);
		border-left: 3px solid #3b82f6;
	}

	.pe-margin-note-warn {
		background: rgba(245, 158, 11, 0.08);
		border: 1px solid rgba(245, 158, 11, 0.2);
		border-left: 3px solid #b45309;
	}

	.pe-margin-text {
		font-size: 0.6875rem;
		color: #1e40af;
		line-height: 1.4;
	}

	.pe-margin-text-warn {
		color: #92400e;
	}

	.pe-margin-text strong {
		font-weight: 700;
	}

	@media (max-width: 640px) {
		.pe-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
