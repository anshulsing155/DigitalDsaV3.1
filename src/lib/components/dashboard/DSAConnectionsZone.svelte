<script lang="ts">
	/**
	 * DSAConnectionsZone — compact DSA connections list for the RM dashboard.
	 * Initials circle + DSA name + case count + last shared time.
	 *
	 * Matches the zone pattern from NeedsAttentionZone / RecentCasesZone.
	 * Uses card-glass + --dash-* adaptive tokens for 60-30-10 compliance.
	 */
	import { ChevronRight, Star, Users, Search } from 'lucide-svelte';
	import { formatTimeAgo } from '$lib/i18n';

	interface DSAConnection {
		dsa_id: string;
		dsa_name: string;
		case_count: number;
		last_shared_at: string;
	}

	interface Props {
		connections: DSAConnection[];
		maxItems?: number;
		viewAllHref?: string;
		/** IDs of preferred/starred DSAs */
		preferredIds?: string[];
		/** Callback when star is toggled */
		onTogglePreferred?: (dsaId: string) => void;
		/** Map of DSA IDs currently toggling (for loading state) */
		togglingMap?: Record<string, boolean>;
	}

	let {
		connections,
		maxItems = 5,
		viewAllHref = '/dashboard/rm/dsa-search',
		preferredIds = [],
		onTogglePreferred,
		togglingMap = {}
	}: Props = $props();

	const displayed = $derived(connections.slice(0, maxItems));
	const hasMore = $derived(connections.length > maxItems);

	/** Extract 2-letter initials from a DSA name */
	function getInitials(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	}
</script>

<section class="connections-zone">
	<div class="zone-header">
		<h2 class="zone-title">DSA Connections</h2>
		{#if connections.length > 0}
			<a href={viewAllHref} class="zone-link">
				All connections <ChevronRight size={14} strokeWidth={2} class="inline" />
			</a>
		{/if}
	</div>

	{#if connections.length === 0}
		<div class="connections-empty card-glass">
			<div class="connections-empty-icon">
				<Users size={20} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
			</div>
			<p class="connections-empty-title">No DSA connections yet</p>
			<p class="connections-empty-subtitle">DSAs who share cases with you will appear here</p>
			<a href={viewAllHref} class="connections-empty-cta">
				<Search size={14} strokeWidth={2} />
				Find DSAs
			</a>
		</div>
	{:else}
		<div class="connections-list">
			{#each displayed as dsa (dsa.dsa_id)}
				<div class="connection-row card-glass">
					<!-- Star / Preferred toggle -->
					{#if onTogglePreferred}
						<button
							onclick={() => onTogglePreferred?.(dsa.dsa_id)}
							disabled={togglingMap[dsa.dsa_id]}
							class="connection-star"
							class:connection-star-active={preferredIds.includes(dsa.dsa_id)}
							title={preferredIds.includes(dsa.dsa_id)
								? 'Remove from preferred'
								: 'Mark as preferred'}
						>
							<Star
								size={14}
								strokeWidth={1.5}
								fill={preferredIds.includes(dsa.dsa_id) ? 'currentColor' : 'none'}
							/>
						</button>
					{/if}

					<!-- Initials avatar -->
					<div class="connection-initials">{getInitials(dsa.dsa_name)}</div>

					<!-- DSA info -->
					<div class="connection-info">
						<p class="connection-name">{dsa.dsa_name}</p>
						<p class="connection-detail">
							{dsa.case_count} case{dsa.case_count !== 1 ? 's' : ''}
							<span class="connection-divider">&middot;</span>
							Last shared {formatTimeAgo(new Date(dsa.last_shared_at))}
						</p>
					</div>
				</div>
			{/each}
		</div>

		{#if hasMore}
			<a href={viewAllHref} class="connections-view-all">
				View all {connections.length} connections
			</a>
		{/if}
	{/if}
</section>

<style>
	.connections-zone {
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

	.connection-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		margin-bottom: 0.5rem;
	}

	.connection-star {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
		transition: all 0.15s;
	}

	.connection-star:hover {
		background: var(--dash-hover);
	}

	.connection-star-active {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.connection-star:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.connection-initials {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 0.5rem;
		background: var(--dash-bg-alt);
		border: 1px solid var(--dash-border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--dash-text-secondary);
		flex-shrink: 0;
	}

	.connection-info {
		flex: 1;
		min-width: 0;
	}

	.connection-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--dash-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.connection-detail {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.125rem;
	}

	.connection-divider {
		color: var(--dash-text-muted);
		margin: 0 0.125rem;
	}

	/* Empty state */
	.connections-empty {
		padding: 2rem 1.5rem;
		text-align: center;
	}

	.connections-empty-icon {
		display: flex;
		height: 2.75rem;
		width: 2.75rem;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		background: var(--dash-btn-ghost-bg);
		margin: 0 auto 0.75rem;
	}

	.connections-empty-title {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--dash-text);
	}

	.connections-empty-subtitle {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
	}

	.connections-empty-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-accent-text);
		text-decoration: none;
	}

	.connections-empty-cta:hover {
		text-decoration: underline;
	}

	.connections-view-all {
		display: block;
		text-align: center;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		padding: 0.75rem 0;
		text-decoration: none;
	}

	.connections-view-all:hover {
		text-decoration: underline;
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.connection-row {
			padding: 0.75rem 1rem;
			gap: 0.5rem;
		}

		.connection-initials {
			width: 2rem;
			height: 2rem;
			font-size: 0.6875rem;
		}
	}
</style>
