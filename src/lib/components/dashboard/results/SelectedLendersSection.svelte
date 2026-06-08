<script lang="ts">
	import type { LenderResult } from '$lib/types/lenderResults';
	import type { LenderSelectionState } from '$lib/types/lenderResultsSnapshot';
	import { FileText, ArrowRight, X } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';

	interface SelectionEntry {
		lender_application_id: string;
		state: LenderSelectionState;
	}

	interface Props {
		results: LenderResult[];
		selections: SelectionEntry[];
		caseId: string;
		onDeselect: (lenderId: string) => void;
	}

	let { results, selections, caseId, onDeselect }: Props = $props();

	// Split into selected (green) and shortlisted (yellow)
	const selectedIds = $derived(
		new Set(selections.filter((s) => s.state === 'selected').map((s) => s.lender_application_id))
	);
	const shortlistedIds = $derived(
		new Set(selections.filter((s) => s.state === 'shortlisted').map((s) => s.lender_application_id))
	);

	const selectedResults = $derived(results.filter((r) => selectedIds.has(r.lender_application_id)));
	const shortlistedResults = $derived(
		results.filter((r) => shortlistedIds.has(r.lender_application_id))
	);
</script>

{#if selectedResults.length > 0 || shortlistedResults.length > 0}
	<div class="selected-section">
		<!-- Selected lenders (green) -->
		{#if selectedResults.length > 0}
			<div class="mb-3">
				<p class="section-label section-label-selected">
					<span class="inline-block h-2 w-2 rounded-full bg-[var(--dash-accent-text)]"></span>
					Selected ({selectedResults.length})
				</p>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each selectedResults as result (result.lender_application_id)}
						<div class="mini-card mini-card-selected">
							<div class="mini-card-header">
								<span class="mini-card-name">{result.lender_name}</span>
								<button
									type="button"
									class="mini-card-remove"
									onclick={() => onDeselect(result.lender_application_id)}
									title="Remove selection"
								>
									<X size={12} />
								</button>
							</div>
							<div class="mini-card-metrics">
								<span>{formatCurrency(result.offered_amount, true)}</span>
								<span class="mini-card-divider">|</span>
								<span>{result.roi}%</span>
								<span class="mini-card-divider">|</span>
								<span>{formatCurrency(result.emi, true)}/mo</span>
							</div>
							<a
								href="/dashboard/dsa/cases/{caseId}/file-builder?lender={result.lender_application_id}"
								class="mini-card-cta"
							>
								<FileText size={12} />
								Prepare File
								<ArrowRight size={12} />
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Shortlisted lenders (yellow) -->
		{#if shortlistedResults.length > 0}
			<div>
				<p class="section-label section-label-shortlisted">
					<span class="inline-block h-2 w-2 rounded-full bg-[var(--dash-text-muted)]"></span>
					Shortlisted ({shortlistedResults.length})
				</p>
				<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{#each shortlistedResults as result (result.lender_application_id)}
						<div class="mini-card mini-card-shortlisted">
							<div class="mini-card-header">
								<span class="mini-card-name">{result.lender_name}</span>
								<button
									type="button"
									class="mini-card-remove"
									onclick={() => onDeselect(result.lender_application_id)}
									title="Remove from shortlist"
								>
									<X size={12} />
								</button>
							</div>
							<div class="mini-card-metrics">
								<span>{formatCurrency(result.offered_amount, true)}</span>
								<span class="mini-card-divider">|</span>
								<span>{result.roi}%</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.selected-section {
		border-radius: 0.75rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-alt);
		padding: 1rem;
	}

	.section-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.section-label-selected {
		color: var(--dash-accent-text);
	}

	.section-label-shortlisted {
		color: var(--dash-text-secondary);
	}

	.mini-card {
		border-radius: 0.5rem;
		padding: 0.625rem 0.75rem;
		background: var(--dash-bg-card);
		transition: box-shadow 0.15s ease;
	}

	.mini-card:hover {
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.mini-card-selected {
		border: 1px solid var(--dash-btn-ghost-border);
	}

	.mini-card-shortlisted {
		border: 1px solid var(--dash-border);
	}

	.mini-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.mini-card-name {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--dash-text);
	}

	.mini-card-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: none;
		border: none;
		color: var(--dash-text-muted);
		cursor: pointer;
		transition: all 0.1s ease;
	}

	.mini-card-remove:hover {
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
	}

	.mini-card-metrics {
		margin-top: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.mini-card-divider {
		color: var(--dash-text-muted);
		font-weight: 300;
	}

	.mini-card-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.5rem;
		padding: 0.25rem 0.625rem;
		border-radius: 0.375rem;
		background: var(--dash-btn-bg);
		color: var(--dash-btn-text);
		font-size: 0.625rem;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.mini-card-cta:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}
</style>
