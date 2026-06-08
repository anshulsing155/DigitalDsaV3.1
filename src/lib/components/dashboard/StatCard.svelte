<script lang="ts">
	interface Props {
		title: string;
		value: string | number;
		subtitle?: string;
		compareText?: string;
		icon?: any;
		trend?: 'up' | 'down' | 'neutral';
	}

	let {
		title,
		value,
		subtitle = '',
		compareText = '',
		icon: Icon,
		trend = 'neutral'
	}: Props = $props();

	const trendIcon = {
		up: '\u2191',
		down: '\u2193',
		neutral: '\u2192'
	};

	const trendColor = {
		up: 'text-[var(--dash-accent-text)]',
		down: 'text-[var(--ddsa-secondary-400)]',
		neutral: 'text-[var(--dash-text-muted)]'
	};
</script>

<div class="stat-card">
	<div class="stat-card-inner">
		<div class="stat-card-content">
			<p class="stat-title">{title}</p>
			<p class="stat-value">{value}</p>
			{#if subtitle}
				<p class="stat-subtitle">
					<span class={trendColor[trend]}>{trendIcon[trend]}</span>
					{subtitle}
				</p>
			{/if}
			{#if compareText}
				<p class="stat-compare">{compareText}</p>
			{/if}
		</div>
		{#if Icon}
			<div class="stat-icon">
				{#if typeof Icon === 'string'}
					<span class="text-lg">{Icon}</span>
				{:else}
					<Icon size={18} strokeWidth={1.5} class="text-[var(--dash-accent-text)]" />
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.stat-card {
		border-radius: 0.75rem;
		border-left-width: 4px;
		border-left-color: var(--ddsa-primary-400);
		background-color: var(--dash-bg-card);
		padding: 1rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition: all 0.15s ease;
		border-top: 1px solid var(--dash-border-light);
		border-right: 1px solid var(--dash-border-light);
		border-bottom: 1px solid var(--dash-border-light);
	}

	.stat-card:hover {
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
	}

	.stat-card-inner {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.stat-card-content {
		flex: 1;
		min-width: 0;
	}

	.stat-title {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dash-text-secondary);
	}

	.stat-value {
		margin-top: 0.25rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--dash-text);
		line-height: 1.2;
	}

	.stat-subtitle {
		margin-top: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--dash-text-secondary);
	}

	.stat-compare {
		margin-top: 0.125rem;
		font-size: 0.6875rem;
		color: var(--dash-text-muted);
	}

	.stat-icon {
		display: flex;
		height: 2.25rem;
		width: 2.25rem;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		background-color: var(--dash-btn-ghost-bg);
	}

	@media (max-width: 768px) {
		.stat-card {
			padding: 0.75rem;
		}

		.stat-value {
			font-size: 1.25rem;
		}

		.stat-title {
			font-size: 0.6875rem;
		}

		.stat-subtitle {
			font-size: 0.6875rem;
		}

		.stat-compare {
			font-size: 0.625rem;
		}

		.stat-icon {
			height: 2rem;
			width: 2rem;
		}
	}
</style>
