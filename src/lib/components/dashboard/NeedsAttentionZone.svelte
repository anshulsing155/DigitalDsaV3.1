<script lang="ts">
	/**
	 * NeedsAttentionZone — compact attention items for the dashboard.
	 * Colored dot + case name + description + action CTA button.
	 *
	 * Contrast: CTA uses --dash-btn-bg/--dash-btn-text (WCAG AA ≥4.5:1).
	 * Typography: 15px case name, 14px meta, 13px CTA — all readable.
	 */
	import { ChevronRight } from 'lucide-svelte';

	interface AttentionItem {
		type: 'open_query' | 'expiring_document' | 'stuck_stage';
		case_id: string;
		label: string;
		applicant_name?: string;
		description: string;
		severity: 'warning' | 'critical';
		days: number;
		stage?: string;
		stage_label?: string;
	}

	interface Props {
		items: AttentionItem[];
		maxItems?: number;
		basePath?: string;
		viewAllHref?: string;
	}

	let {
		items,
		maxItems = 5,
		basePath = '/dashboard/dsa/cases',
		viewAllHref = '/dashboard/dsa/cases?attention=true'
	}: Props = $props();

	const displayed = $derived(items.slice(0, maxItems));
	const hasMore = $derived(items.length > maxItems);

	// Map attention type to a short CTA label
	const actionLabels: Record<string, string> = {
		open_query: 'Reply',
		expiring_document: 'Upload',
		stuck_stage: 'Follow up'
	};

	// Short reason chip per item so a list of similar rows is still scannable (B.4).
	function reasonChip(item: AttentionItem): string {
		if (item.type === 'open_query') return 'Query open';
		if (item.type === 'expiring_document') return 'Doc expiring';
		return `Stuck ${item.days}d`;
	}
</script>

<section class="attention-zone">
	<div class="zone-header">
		<h2 class="zone-title">Needs Attention</h2>
		{#if items.length > 0}
			<a href={viewAllHref} class="zone-link">
				View all cases <ChevronRight size={14} strokeWidth={2} class="inline" />
			</a>
		{/if}
	</div>

	{#if items.length === 0}
		<div class="attention-empty card-glass">
			<p class="attention-empty-text">All clear — no cases need attention right now.</p>
		</div>
	{:else}
		{#each displayed as item (item.case_id + item.type)}
			<a href="{basePath}/{item.case_id}" class="attention-row card-glass">
				<!-- Severity dot -->
				<span
					class="attention-dot"
					class:attention-dot-critical={item.severity === 'critical'}
					class:attention-dot-warning={item.severity === 'warning'}
				></span>

				<!-- Case info -->
				<div class="attention-content">
					<p class="attention-name">
						{item.applicant_name || item.label}
						<span class="reason-chip" class:reason-chip-critical={item.severity === 'critical'}>
							{reasonChip(item)}
						</span>
					</p>
					<p class="attention-meta">
						{item.description}
						{#if item.stage_label}
							<span class="attention-divider">&middot;</span>
							{item.stage_label}
						{/if}
					</p>
				</div>

				<!-- Action CTA — solid button for maximum readability -->
				<span class="attention-action">
					{actionLabels[item.type] || 'View'}
					<ChevronRight size={14} strokeWidth={2} class="inline" />
				</span>
			</a>
		{/each}

		{#if hasMore}
			<a href={viewAllHref} class="attention-more">
				View all {items.length} cases needing attention →
			</a>
		{/if}
	{/if}
</section>

<style>
	.attention-zone {
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

	.attention-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		margin-bottom: 0.5rem;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}

	.attention-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.attention-dot-critical {
		background: var(--ddsa-error);
		box-shadow: 0 0 8px rgba(196, 112, 112, 0.4);
	}

	.attention-dot-warning {
		background: var(--ddsa-warning);
		box-shadow: 0 0 8px rgba(212, 168, 78, 0.3);
	}

	.attention-content {
		flex: 1;
		min-width: 0;
	}

	.attention-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.reason-chip {
		display: inline-block;
		margin-left: 0.5rem;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 600;
		vertical-align: middle;
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
	}

	.reason-chip-critical {
		background: var(--dash-contrast-ghost-bg);
		color: var(--dash-contrast-text);
	}

	.attention-meta {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.attention-divider {
		color: var(--dash-text-muted);
	}

	/* Solid CTA button — uses adaptive tokens for WCAG AA in both modes */
	.attention-action {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-btn-text);
		background: var(--dash-btn-bg);
		padding: 0.4375rem 1rem;
		border-radius: 0.5rem;
		white-space: nowrap;
		border: none;
		transition: all 0.15s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.attention-action:hover {
		filter: brightness(1.1);
		transform: translateY(-1px);
	}

	.attention-empty {
		padding: 1.5rem;
		text-align: center;
	}

	.attention-empty-text {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
	}

	.attention-more {
		display: block;
		text-align: center;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		padding: 0.625rem 0;
		text-decoration: none;
	}

	.attention-more:hover {
		text-decoration: underline;
	}

	/* Mobile: stack action below content */
	@media (max-width: 480px) {
		.attention-row {
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0.875rem 1rem;
		}

		.attention-action {
			margin-left: 1.5rem;
		}
	}
</style>
