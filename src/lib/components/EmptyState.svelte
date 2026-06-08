<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Lucide icon component to display */
		icon?: any;
		/** Title text */
		title?: string;
		/** Description text */
		description?: string;
		/** Variant controls icon background and border style */
		variant?: 'default' | 'filtered' | 'compact';
		/** Optional action slot (button, link, etc.) */
		action?: Snippet;
	}

	let { icon, title = '', description = '', variant = 'default', action }: Props = $props();
</script>

<div
	class="empty-state"
	class:empty-dashed={variant !== 'compact'}
	class:empty-compact={variant === 'compact'}
>
	{#if icon}
		{@const Icon = icon}
		<div
			class="empty-icon"
			class:empty-icon-accent={variant === 'default'}
			class:empty-icon-neutral={variant !== 'default'}
		>
			{#if typeof Icon === 'string'}
				<span class="text-xl">{Icon}</span>
			{:else}
				<Icon size={variant === 'compact' ? 20 : 28} class="icon-svg" />
			{/if}
		</div>
	{/if}

	{#if title}
		<h3 class="empty-title">{title}</h3>
	{/if}

	{#if description}
		<p class="empty-desc">{description}</p>
	{/if}

	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		background: var(--dash-bg-card, var(--form-bg-card, #fff));
		border-radius: 1rem;
	}

	.empty-dashed {
		border: 2px dashed var(--dash-border, var(--form-border, #e5e7eb));
		padding: 3rem 1.5rem;
	}

	.empty-compact {
		border: 1px solid var(--dash-border, var(--form-border, #e5e7eb));
		padding: 2rem 1.5rem;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9999px;
		margin-bottom: 1rem;
	}

	.empty-icon-accent {
		width: 3.5rem;
		height: 3.5rem;
		background: linear-gradient(
			135deg,
			var(--ddsa-accent-100, #f3f0ed) 0%,
			var(--ddsa-primary-100, #ebe5e0) 100%
		);
	}

	.empty-icon-accent :global(.icon-svg) {
		color: var(--ddsa-accent-500, #cb997e);
	}

	.empty-icon-neutral {
		width: 3rem;
		height: 3rem;
		background: var(--dash-bg-alt, var(--form-bg-alt, #f9fafb));
	}

	.empty-icon-neutral :global(.icon-svg) {
		color: var(--dash-text-muted, var(--form-text-muted, #9ca3af));
	}

	.empty-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 1rem;
		color: var(--dash-text, var(--form-text, #111827));
		margin-bottom: 0.375rem;
	}

	.empty-desc {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.8125rem;
		color: var(--dash-text-secondary, var(--form-text-secondary, #6b7280));
		max-width: 28rem;
		line-height: 1.5;
	}

	.empty-action {
		margin-top: 1.25rem;
	}
</style>
