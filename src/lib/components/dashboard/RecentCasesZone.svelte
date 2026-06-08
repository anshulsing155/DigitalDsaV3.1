<script lang="ts">
	/**
	 * RecentCasesZone — compact case list for the dashboard.
	 * Initials circle + name + detail + stage badge.
	 *
	 * Contrast: All text ≥4.5:1 via --dash-text/--dash-text-secondary tokens.
	 * Typography: 15px case name, 13px detail, 12px badge — all bumped from prior.
	 */
	import { ChevronRight, Plus } from 'lucide-svelte';
	import { ROUTES } from '$lib/config/routes.js';
	import { formatTimeAgo } from '$lib/i18n';

	interface CompactCase {
		case_id: string;
		label: string;
		loan_type: string;
		stage: string;
		stage_label: string;
		lenders: string[];
		updated_at: string;
		is_sample: boolean;
		/** DSA name — shown in RM view to identify who shared the case */
		dsa_name?: string;
	}

	interface Props {
		cases: CompactCase[];
		maxItems?: number;
		basePath?: string;
		viewAllHref?: string;
	}

	let {
		cases,
		maxItems = 5,
		basePath = '/dashboard/dsa/cases',
		viewAllHref = '/dashboard/dsa/cases'
	}: Props = $props();

	const displayed = $derived(cases.slice(0, maxItems));
	const hasMore = $derived(cases.length > maxItems);

	/** Extract 2-letter initials from a case label (e.g. "Rajesh Sharma" → "RS") */
	function getInitials(label: string): string {
		const words = label.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return label.substring(0, 2).toUpperCase();
	}

	/** Map stage to a badge style class */
	function getStageBadgeClass(stage: string): string {
		if (['sanctioned', 'disbursed'].includes(stage)) return 'badge-sanctioned';
		if (stage === 'submitted') return 'badge-submitted';
		if (stage === 'processing' || stage === 'query') return 'badge-processing';
		if (['rejected', 'dropped', 'closed'].includes(stage)) return 'badge-terminal';
		return 'badge-default';
	}
</script>

<section class="cases-zone">
	<div class="zone-header">
		<h2 class="zone-title">Recent Cases</h2>
		{#if cases.length > 0}
			<a href={viewAllHref} class="zone-link">
				All cases <ChevronRight size={14} strokeWidth={2} class="inline" />
			</a>
		{/if}
	</div>

	{#if cases.length === 0}
		<div class="cases-empty card-glass">
			<p class="cases-empty-title">No cases yet</p>
			<p class="cases-empty-subtitle">Create your first case to get started</p>
			<a href={ROUTES.FORM.HOW_CAN_WE_HELP} class="cases-empty-cta">
				<Plus size={16} strokeWidth={2} />
				New Case
			</a>
		</div>
	{:else}
		<div class="cases-list">
			{#each displayed as caseItem (caseItem.case_id)}
				<a href="{basePath}/{caseItem.case_id}" class="case-row card-glass">
					<!-- Initials avatar -->
					<div class="case-initials">{getInitials(caseItem.label)}</div>

					<!-- Case info -->
					<div class="case-info">
						<p class="case-name">
							{caseItem.label}
							{#if caseItem.is_sample}
								<span class="case-sample-tag">Sample</span>
							{/if}
						</p>
						<p class="case-detail">
							<!-- case_id renders first so visually-identical labels (two cases
							     for the same customer + loan type + lender) are immediately
							     distinguishable. Format e.g. "HL-2026-0042". -->
							<span class="case-id">{caseItem.case_id}</span>
							{#if caseItem.dsa_name}
								<span class="case-divider">&middot;</span>
								{caseItem.dsa_name}
							{/if}
							<span class="case-divider">&middot;</span>
							{caseItem.loan_type}
							{#if caseItem.lenders.length > 0}
								<span class="case-divider">&middot;</span>
								{caseItem.lenders[0]}{caseItem.lenders.length > 1
									? ` +${caseItem.lenders.length - 1}`
									: ''}
							{/if}
							<span class="case-divider">&middot;</span>
							Updated {formatTimeAgo(new Date(caseItem.updated_at))}
						</p>
					</div>

					<!-- Stage badge -->
					<span class="stage-badge {getStageBadgeClass(caseItem.stage)}">
						{caseItem.stage_label}
					</span>
				</a>
			{/each}
		</div>

		{#if hasMore}
			<a href={viewAllHref} class="cases-view-all">
				View all {cases.length} cases
			</a>
		{/if}
	{/if}
</section>

<style>
	.cases-zone {
		margin-bottom: 2rem;
	}

	.zone-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.zone-title {
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dash-text-secondary);
	}

	.zone-link {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		text-decoration: none;
		display: flex;
		align-items: center;
		gap: 0.125rem;
		transition: opacity 0.15s;
	}

	.zone-link:hover {
		opacity: 0.8;
	}

	.case-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		margin-bottom: 0.5rem;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}

	.case-initials {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.5rem;
		background: var(--dash-bg-alt);
		border: 1px solid var(--dash-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		flex-shrink: 0;
	}

	.case-info {
		flex: 1;
		min-width: 0;
	}

	.case-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.case-sample-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		flex-shrink: 0;
	}

	.case-detail {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.case-divider {
		color: var(--dash-text-muted);
		margin: 0 0.125rem;
	}

	.case-id {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text-muted);
		letter-spacing: 0.02em;
	}

	.stage-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.3125rem 0.75rem;
		border-radius: 0.375rem;
		letter-spacing: 0.02em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* Badge colors — 60-30-10: neutral / accent / contrast */
	.badge-processing {
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
		border: 1px solid var(--dash-contrast-ghost-border);
	}

	.badge-sanctioned {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		border: 1px solid var(--dash-btn-ghost-border);
	}

	.badge-submitted {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		border: 1px solid var(--dash-btn-ghost-border);
	}

	.badge-terminal {
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
		border: 1px solid var(--dash-border);
	}

	.badge-default {
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
		border: 1px solid var(--dash-border);
	}

	/* Empty state */
	.cases-empty {
		padding: 2.5rem 1.5rem;
		text-align: center;
	}

	.cases-empty-title {
		font-size: 1rem;
		font-weight: 500;
		color: var(--dash-text);
	}

	.cases-empty-subtitle {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
	}

	.cases-empty-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 1rem;
		padding: 0.5rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--dash-btn-text);
		background: var(--dash-btn-bg);
		border-radius: 0.5rem;
		text-decoration: none;
		transition: all 0.2s;
	}

	.cases-empty-cta:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.cases-view-all {
		display: block;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		padding: 0.75rem 0;
		text-decoration: none;
	}

	.cases-view-all:hover {
		text-decoration: underline;
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.case-row {
			padding: 0.875rem 1rem;
			gap: 0.75rem;
		}

		.case-initials {
			width: 2.25rem;
			height: 2.25rem;
			font-size: 0.75rem;
		}
	}
</style>
