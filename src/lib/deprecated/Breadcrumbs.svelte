<script lang="ts">
	interface Crumb {
		label: string;
		href?: string;
	}

	interface Props {
		crumbs: Crumb[];
	}

	let { crumbs }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="breadcrumbs">
	<ol>
		{#each crumbs as crumb, i}
			<li>
				{#if i > 0}
					<svg
						class="separator"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
					</svg>
				{/if}
				{#if crumb.href && i < crumbs.length - 1}
					<a href={crumb.href}>{crumb.label}</a>
				{:else}
					<span class="current" aria-current="page">{crumb.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.breadcrumbs {
		font-size: 0.8125rem;
	}

	ol {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
		flex-wrap: wrap;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	a {
		color: var(--dash-text-secondary);
		text-decoration: none;
		transition: color 0.15s;
	}

	a:hover {
		color: var(--ddsa-accent-500);
	}

	.current {
		color: var(--dash-text-muted);
		font-weight: 500;
		max-width: 18ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.separator {
		width: 0.75rem;
		height: 0.75rem;
		color: var(--dash-text-muted);
		flex-shrink: 0;
	}
</style>
