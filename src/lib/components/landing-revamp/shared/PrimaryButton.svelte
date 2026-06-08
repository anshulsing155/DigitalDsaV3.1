<script lang="ts">
	interface Props {
		href?: string;
		onclick?: () => void;
		size?: 'sm' | 'md' | 'lg';
		fullWidth?: boolean;
		arrow?: boolean;
		variant?: 'gold' | 'dark' | 'black';
		children: import('svelte').Snippet;
	}

	let {
		href,
		onclick,
		size = 'md',
		fullWidth = false,
		arrow = true,
		variant = 'gold',
		children
	}: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'px-5 py-2.5 text-sm',
		md: 'px-7 py-3.5 text-base',
		lg: 'px-9 py-4 text-lg'
	};
</script>

{#if href}
	<a {href} class="primary-btn {variant} {sizeClasses[size]}" class:full-width={fullWidth}>
		{@render children()}
		{#if arrow}
			<svg
				class="arrow-icon"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				viewBox="0 0 24 24"
			>
				<path d="M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
				<path d="m12 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</a>
{:else}
	<button
		type="button"
		{onclick}
		class="primary-btn {variant} {sizeClasses[size]}"
		class:full-width={fullWidth}
	>
		{@render children()}
		{#if arrow}
			<svg
				class="arrow-icon"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				viewBox="0 0 24 24"
			>
				<path d="M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
				<path d="m12 5 7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		{/if}
	</button>
{/if}

<style>
	.primary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
		border-radius: 9999px;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
	}
	.primary-btn:hover {
		transform: scale(1.02);
	}
	.primary-btn.gold {
		background-image: linear-gradient(
			to right,
			var(--landing-accent-gradient-from) 0%,
			var(--landing-accent-gradient-to) 51%,
			var(--landing-accent-gradient-from) 100%
		);
		background-size: 200% auto;
		color: var(--landing-accent-text);
		box-shadow: 0 4px 24px rgba(var(--landing-accent-rgb), 0.3);
	}
	.primary-btn.gold:hover {
		background-position: right center;
		box-shadow: 0 8px 32px rgba(var(--landing-accent-rgb), 0.4);
	}
	.primary-btn.dark {
		background-color: var(--landing-bg-card);
		color: var(--dark-text);
		border: 1px solid var(--landing-border);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}
	.primary-btn.dark:hover {
		box-shadow: var(--landing-shadow-card);
	}
	/* Black button — for use on yellow backgrounds */
	.primary-btn.black {
		background-color: #1a1a1a;
		color: #ffffff;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
	.primary-btn.black:hover {
		background-color: #333333;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}
	.full-width {
		width: 100%;
	}
	.arrow-icon {
		width: 1rem;
		height: 1rem;
		transition: transform 0.2s ease;
	}
	.primary-btn:hover .arrow-icon {
		transform: translateX(3px);
	}
</style>
