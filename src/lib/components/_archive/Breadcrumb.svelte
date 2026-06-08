<script lang="ts">
	import { ChevronRight, CircleCheck, Circle } from '$lib/utils/iconRegistry';

	type BreadcrumbItem = {
		label: string;
		href?: string;
		icon?: any;
		onClick?: () => void;
		isActive?: boolean;
		isPast?: boolean;
	};

	interface Props {
		items?: BreadcrumbItem[];
	}

	let { items = [] }: Props = $props();

	let activeRef: HTMLElement | undefined = $state();

	$effect(() => {
		if (items && activeRef) {
			activeRef.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	});
</script>

<nav class="breadcrumb-nav mb-4 pb-2" aria-label="Breadcrumb">
	<ol class="breadcrumb-list">
		{#each items as item, index}
			<li class="breadcrumb-item">
				{#if index > 0}
					<ChevronRight class="breadcrumb-separator" />
				{/if}

				{#if item.href}
					<a href={item.href} class="breadcrumb-link labelText">
						{#if index === 0 && item.icon}
							{@const ItemIcon = item.icon}
							<ItemIcon class="breadcrumb-icon" />
						{/if}
						{item.label}
					</a>
				{:else if item.isActive}
					<span class="breadcrumb-active labelText" bind:this={activeRef}>
						<Circle class="breadcrumb-icon" />
						{item.label}
					</span>
				{:else if item.isPast && item.onClick}
					<button type="button" onclick={item.onClick} class="breadcrumb-past labelText">
						<CircleCheck class="breadcrumb-icon breadcrumb-icon-past" />
						{item.label}
					</button>
				{:else}
					<span class="breadcrumb-default labelText">
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.breadcrumb-nav {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.breadcrumb-list {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.breadcrumb-item {
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
	}

	:global(.breadcrumb-separator) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--color-grayThree);
		margin: 0 0.125rem;
	}

	:global(.breadcrumb-icon) {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
		margin-right: 0.25rem;
	}

	:global(.breadcrumb-icon-past) {
		color: var(--ddsa-primary-500);
	}

	.breadcrumb-link {
		display: inline-flex;
		align-items: center;
		color: var(--color-text-light);
		transition: color 0.2s ease;
		text-decoration: none;
	}

	.breadcrumb-link:hover {
		color: var(--ddsa-primary-500);
	}

	.breadcrumb-active {
		display: inline-flex;
		align-items: center;
		background: var(--ddsa-primary-500);
		color: white;
		font-family: var(--font-titleMedium);
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
	}

	.breadcrumb-past {
		display: inline-flex;
		align-items: center;
		color: var(--color-text-light);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.breadcrumb-past:hover {
		color: var(--ddsa-primary-500);
		text-decoration: underline;
	}

	.breadcrumb-default {
		display: inline-flex;
		align-items: center;
		color: var(--color-grayThree);
	}
</style>
