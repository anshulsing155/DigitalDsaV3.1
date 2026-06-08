<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * GlanceCard — frosted glass stat card for the Quick Glance dashboard zone.
	 * Shows a single prominent number + label + optional trend indicator.
	 *
	 * Contrast: Uses --dash-accent-text (WCAG AA ≥4.5:1 in both light/dark).
	 * Typography: 2rem stat number, 0.875rem label — readable at all viewports.
	 *
	 * Bento redesign (2026-05-31): added optional corner icon snippet so cards
	 * can render a small Lucide icon in the top-right without coupling
	 * GlanceCard to any particular icon library. Caller passes a snippet:
	 *   <GlanceCard ...>{#snippet icon()}<Briefcase size={14}/>{/snippet}</GlanceCard>
	 */
	interface Props {
		label: string;
		value: string | number;
		/** Optional trend arrow: up/down/neutral */
		trend?: 'up' | 'down' | 'neutral';
		/** Optional comparison text like "vs 3 last month" */
		compareText?: string;
		/** Highlight this card with bronze accent (e.g. Active Cases) */
		accent?: boolean;
		/** Navigate to this URL on click */
		href?: string;
		/** Optional corner icon snippet (rendered top-right) */
		icon?: Snippet;
	}

	let {
		label,
		value,
		trend = 'neutral',
		compareText = '',
		accent = false,
		href,
		icon
	}: Props = $props();

	const trendSymbol = {
		up: '\u2191',
		down: '\u2193',
		neutral: ''
	};

	const trendColorClass = {
		up: 'text-[var(--ddsa-success-dark)]',
		down: 'text-[var(--ddsa-error-dark)]',
		neutral: 'text-[var(--dash-text-muted)]'
	};
</script>

{#if href}
	<a {href} class="glance-card card-glass" class:glance-accent={accent}>
		{#if icon}
			<span class="glance-icon">{@render icon()}</span>
		{/if}
		<p class="glance-value" class:glance-value-accent={accent}>{value}</p>
		<p class="glance-label">{label}</p>
		{#if compareText}
			<p class="glance-compare">
				{#if trend !== 'neutral'}
					<span class={trendColorClass[trend]}>{trendSymbol[trend]}</span>
				{/if}
				{compareText}
			</p>
		{/if}
	</a>
{:else}
	<div class="glance-card card-glass" class:glance-accent={accent}>
		{#if icon}
			<span class="glance-icon">{@render icon()}</span>
		{/if}
		<p class="glance-value" class:glance-value-accent={accent}>{value}</p>
		<p class="glance-label">{label}</p>
		{#if compareText}
			<p class="glance-compare">
				{#if trend !== 'neutral'}
					<span class={trendColorClass[trend]}>{trendSymbol[trend]}</span>
				{/if}
				{compareText}
			</p>
		{/if}
	</div>
{/if}

<style>
	.glance-card {
		padding: 1.25rem 1.5rem;
		cursor: default;
		min-width: 0;
		position: relative;
	}

	/* Bento redesign (2026-05-31): corner icon for instant scan-ability. */
	.glance-icon {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.5rem;
		background: var(--dash-bg-alt);
		color: var(--dash-text-muted);
		transition: all 0.2s;
	}

	a.glance-card:hover .glance-icon {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	.glance-accent .glance-icon {
		background: var(--dash-btn-ghost-bg);
		color: var(--dash-accent-text);
	}

	a.glance-card {
		cursor: pointer;
		text-decoration: none;
		color: inherit;
	}

	.glance-value {
		font-family: var(--font-title);
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: -0.5px;
		line-height: 1.2;
		color: var(--dash-text);
	}

	/* Accent uses the WCAG-safe adaptive token — dark in light mode, light in dark mode */
	.glance-value-accent {
		color: var(--dash-accent-text);
	}

	.glance-label {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
	}

	.glance-compare {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin-top: 0.375rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* Mobile: slightly smaller numbers */
	@media (max-width: 640px) {
		.glance-value {
			font-size: 1.5rem;
		}

		.glance-card {
			padding: 1rem 1.125rem;
		}

		.glance-label {
			font-size: 0.8125rem;
		}
	}
</style>
