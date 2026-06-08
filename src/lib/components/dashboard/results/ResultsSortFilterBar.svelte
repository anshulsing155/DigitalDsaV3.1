<script lang="ts">
	type SortOption = 'amount_desc' | 'roi_asc' | 'emi_asc';
	type FilterOption = 'all' | 'green' | 'amber' | 'red';

	interface Props {
		sortBy: SortOption;
		filterBy: FilterOption;
		onSort: (sort: SortOption) => void;
		onFilter: (filter: FilterOption) => void;
		counts: { green: number; amber: number; red: number; total: number };
	}

	let { filterBy, onFilter, counts }: Props = $props();

	const DOT_COLORS: Record<string, string> = {
		green: 'dot-green',
		amber: 'dot-amber',
		red: 'dot-red'
	};

	const LABELS: Record<string, string> = {
		all: 'All',
		green: 'Eligible',
		amber: 'Marginal',
		red: 'Ineligible'
	};

	const filterEntries = $derived(
		(['all', 'green', 'amber', 'red'] as FilterOption[]).filter(
			(f) =>
				f === 'all' ||
				(f === 'green' ? counts.green : f === 'amber' ? counts.amber : counts.red) > 0
		)
	);
</script>

<div class="filter-bar">
	{#each filterEntries as f (f)}
		{@const count =
			f === 'all'
				? counts.total
				: f === 'green'
					? counts.green
					: f === 'amber'
						? counts.amber
						: counts.red}
		<button
			type="button"
			class="filter-tab {filterBy === f ? 'filter-tab-active' : ''}"
			onclick={() => onFilter(f)}
		>
			{#if f !== 'all'}
				<span class="filter-dot {DOT_COLORS[f]}" aria-hidden="true"></span>
			{/if}
			{LABELS[f]}
			<span class="filter-count">{count}</span>
		</button>
	{/each}
</div>

<style>
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.125rem;
		border-bottom: 1px solid var(--dash-border);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.filter-tab {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--dash-text-muted);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		transition: color 0.15s ease;
		margin-bottom: -1px;
	}

	.filter-tab:hover {
		color: var(--dash-text-secondary);
	}

	.filter-tab-active {
		color: var(--dash-text);
		font-weight: 600;
		border-bottom-color: var(--dash-text);
	}

	.filter-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot-green {
		background: #10b981;
	}
	.dot-amber {
		background: #cb997e;
	}
	.dot-red {
		background: #ef4444;
	}

	.filter-count {
		font-size: 0.625rem;
		font-weight: 700;
		color: var(--dash-text-muted);
	}

	.filter-tab-active .filter-count {
		color: var(--dash-text-secondary);
	}
</style>
