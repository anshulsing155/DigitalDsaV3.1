<script lang="ts">
	interface Props {
		/** Skeleton variant */
		variant?: 'text' | 'card' | 'row' | 'field';
		/** Width (CSS value). Defaults to '100%'. */
		width?: string;
		/** Height (CSS value). Text defaults to '1rem', card to '8rem'. */
		height?: string;
		/** Number of skeleton lines to render (for text variant) */
		lines?: number;
	}

	let { variant = 'text', width = '100%', height, lines = 1 }: Props = $props();

	const defaultHeights: Record<string, string> = {
		text: '0.875rem',
		card: '8rem',
		row: '3rem',
		field: '2.5rem'
	};

	let h = $derived(height || defaultHeights[variant] || '1rem');
</script>

{#if variant === 'text' && lines > 1}
	<div class="skeleton-lines" style:width>
		{#each Array(lines) as _, i}
			<div
				class="skeleton"
				style:height={h}
				style:width={i === lines - 1 ? '60%' : '100%'}
				role="presentation"
				aria-hidden="true"
			></div>
		{/each}
	</div>
{:else if variant === 'card'}
	<div
		class="skeleton skeleton-card"
		style:width
		style:height={h}
		role="presentation"
		aria-hidden="true"
	></div>
{:else if variant === 'row'}
	<div class="skeleton-row" style:width role="presentation" aria-hidden="true">
		<div
			class="skeleton"
			style:width="2.5rem"
			style:height="2.5rem"
			style:border-radius="9999px"
		></div>
		<div class="skeleton-row-content">
			<div class="skeleton" style:width="40%" style:height="0.75rem"></div>
			<div class="skeleton" style:width="65%" style:height="0.625rem"></div>
		</div>
	</div>
{:else if variant === 'field'}
	<div class="skeleton-field" style:width role="presentation" aria-hidden="true">
		<div class="skeleton" style:width="30%" style:height="0.75rem"></div>
		<div class="skeleton" style:width="100%" style:height={h}></div>
	</div>
{:else}
	<div class="skeleton" style:width style:height={h} role="presentation" aria-hidden="true"></div>
{/if}

<style>
	.skeleton {
		background: linear-gradient(
			90deg,
			var(--dash-bg-alt, #f3f4f6) 25%,
			var(--dash-border, #e5e7eb) 50%,
			var(--dash-bg-alt, #f3f4f6) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s ease-in-out infinite;
		border-radius: 0.375rem;
	}

	.skeleton-card {
		border-radius: 0.75rem;
	}

	.skeleton-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.skeleton-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--dash-border, #e5e7eb);
		border-radius: 0.75rem;
	}

	.skeleton-row-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.skeleton-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
