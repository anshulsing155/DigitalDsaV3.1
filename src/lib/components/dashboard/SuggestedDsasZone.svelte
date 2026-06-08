<script lang="ts">
	/**
	 * SuggestedDsasZone — surfaces the suggestedDsas data computed in the RM
	 * home server load that, pre-2026-05-30 audit, was never rendered.
	 * Same visual language as DSAConnectionsZone — initials + name + score
	 * reasons + star toggle. Score reasons (e.g. "Same city", "Works with
	 * your bank") are shown as compact chips so the DSA understands WHY the
	 * match was surfaced.
	 */
	import { ChevronRight, Star, Sparkles, Search } from 'lucide-svelte';

	interface SuggestedDsa {
		dsa_id: string;
		dsa_name: string;
		city: string;
		score: number;
		reasons: string[];
	}

	interface Props {
		suggestions: SuggestedDsa[];
		viewAllHref?: string;
		/** IDs of preferred/starred DSAs */
		preferredIds?: string[];
		/** Callback when star is toggled */
		onTogglePreferred?: (dsaId: string) => void;
		/** Map of DSA IDs currently toggling (for loading state) */
		togglingMap?: Record<string, boolean>;
	}

	let {
		suggestions,
		viewAllHref = '/dashboard/rm/dsa-search',
		preferredIds = [],
		onTogglePreferred,
		togglingMap = {}
	}: Props = $props();

	/** Extract 2-letter initials from a DSA name */
	function getInitials(name: string): string {
		const words = name.trim().split(/\s+/);
		if (words.length >= 2) {
			return (words[0][0] + words[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	}
</script>

{#if suggestions.length > 0}
	<section class="suggested-zone">
		<div class="zone-header">
			<h2 class="zone-title">
				<Sparkles size={14} strokeWidth={2} class="inline" />
				Suggested DSAs
			</h2>
			<a href={viewAllHref} class="zone-link">
				Find more <ChevronRight size={14} strokeWidth={2} class="inline" />
			</a>
		</div>

		<p class="zone-subtitle">
			Active DSAs near you who haven't connected yet — based on city and bank match.
		</p>

		<div class="suggested-list">
			{#each suggestions as dsa (dsa.dsa_id)}
				<div class="suggested-row card-glass">
					{#if onTogglePreferred}
						<button
							onclick={() => onTogglePreferred?.(dsa.dsa_id)}
							disabled={togglingMap[dsa.dsa_id]}
							class="suggested-star"
							class:suggested-star-active={preferredIds.includes(dsa.dsa_id)}
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

					<div class="suggested-initials">{getInitials(dsa.dsa_name)}</div>

					<div class="suggested-info">
						<p class="suggested-name">{dsa.dsa_name}</p>
						<div class="suggested-reasons">
							{#if dsa.city}
								<span class="suggested-city">{dsa.city}</span>
							{/if}
							{#each dsa.reasons as reason}
								<span class="suggested-chip">{reason}</span>
							{/each}
						</div>
					</div>

					<a href="{viewAllHref}?q={encodeURIComponent(dsa.city)}" class="suggested-cta">
						<Search size={12} strokeWidth={2} />
						View
					</a>
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.suggested-zone {
		margin-bottom: 2rem;
	}

	.zone-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.25rem;
	}

	.zone-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--dash-text-secondary);
	}

	.zone-subtitle {
		font-size: 0.75rem;
		color: var(--dash-text-muted);
		margin-bottom: 0.75rem;
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

	.suggested-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.25rem;
		margin-bottom: 0.5rem;
	}

	.suggested-star {
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

	.suggested-star:hover {
		background: var(--dash-hover);
	}

	.suggested-star-active {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.suggested-star:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.suggested-initials {
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

	.suggested-info {
		flex: 1;
		min-width: 0;
	}

	.suggested-name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--dash-text-primary);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.suggested-reasons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.25rem;
		align-items: center;
	}

	.suggested-city {
		font-size: 0.75rem;
		color: var(--dash-text-muted);
	}

	.suggested-chip {
		font-size: 0.6875rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
		white-space: nowrap;
	}

	.suggested-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dash-accent-link);
		text-decoration: none;
		padding: 0.375rem 0.625rem;
		border-radius: 0.375rem;
		transition: background 0.15s;
		flex-shrink: 0;
	}

	.suggested-cta:hover {
		background: var(--dash-hover);
	}
</style>
