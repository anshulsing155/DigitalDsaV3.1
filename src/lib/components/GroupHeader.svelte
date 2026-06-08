<script lang="ts">
	import { ChevronDown } from '$lib/utils/iconRegistry';

	interface Props {
		group: any;
		progress: any;
		isComplete: boolean;
		isLocked: boolean;
		isExpanded: boolean;
		onToggle?: () => void;
	}

	let { group, progress, isComplete, isLocked, isExpanded, onToggle = () => {} }: Props = $props();

	let handleToggle = () => {
		if (!isLocked) {
			onToggle();
		}
	};

	let progressPercent = $derived(Math.round(progress.percentage));
</script>

<button
	onclick={handleToggle}
	disabled={isLocked}
	type="button"
	class="group-header w-full text-left transition-all duration-200 disabled:cursor-not-allowed"
	class:expanded={isExpanded}
	class:locked={isLocked}
>
	<!-- Dark Header Section -->
	<div class="header-bar px-4 py-3" class:header-locked={isLocked}>
		<div class="flex items-center justify-between gap-3">
			<!-- Left: Icon + Title -->
			<div class="flex items-center gap-3">
				<div class="header-icon" class:icon-locked={isLocked}>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
						<path
							d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<div class="flex flex-col">
					<h4 class="header-title">
						{group.label}
					</h4>
					{#if group.description}
						<p class="header-subtitle">
							{group.description}
						</p>
					{/if}
				</div>
			</div>

			<!-- Right: Progress Badge + Chevron -->
			<div class="flex items-center gap-3">
				<div class="progress-badge" class:badge-complete={isComplete}>
					<span class="badge-text">{progress.completed}/{progress.total}</span>
				</div>
				<div
					class="chevron-icon"
					class:rotate-180={isExpanded}
					class:chevron-active={isExpanded && !isLocked}
					class:chevron-locked={isLocked}
				>
					<ChevronDown class="h-5 w-5" />
				</div>
			</div>
		</div>
	</div>

	<!-- Progress Bar -->
	<div class="progress-container">
		<div class="progress-fill" class:complete={isComplete} style="width: {progressPercent}%"></div>
	</div>
</button>

<style>
	.group-header {
		background: transparent;
		border-radius: 12px;
		overflow: hidden;
	}

	/* Dark Header Bar */
	.header-bar {
		background: #1a1a1a;
		color: #ffffff;
	}

	.header-bar.header-locked {
		background: #4a4a4a;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--color-primary);
		border-radius: 8px;
		color: #1a1a1a;
		flex-shrink: 0;
	}

	.header-icon.icon-locked {
		background: #666666;
		color: #999999;
	}

	.header-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 14px;
		color: #ffffff;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.header-subtitle {
		font-family: var(--font-paragraph);
		font-size: 12px;
		color: #999999;
		margin: 0.125rem 0 0 0;
	}

	/* Progress Badge */
	.progress-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem 0.75rem;
		background: #333333;
		border-radius: 16px;
		transition: all 0.3s ease;
	}

	.progress-badge.badge-complete {
		background: var(--color-primary);
	}

	.badge-text {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 12px;
		color: #ffffff;
	}

	.progress-badge.badge-complete .badge-text {
		color: #1a1a1a;
	}

	/* Chevron */
	.chevron-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #333333;
		color: #ffffff;
		transition: all 0.3s ease;
		transform-origin: center;
	}

	.chevron-icon.chevron-locked {
		background: #555555;
		color: #888888;
	}

	.chevron-icon.chevron-active {
		background: var(--color-primary);
		color: #1a1a1a;
	}

	.rotate-180 {
		transform: rotate(180deg);
	}

	/* Progress Bar */
	.progress-container {
		height: 4px;
		background: #e5e5e5;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.4s ease;
	}

	.progress-fill.complete {
		background: var(--color-primary);
	}

	/* Hover States */
	.group-header:not(.locked):hover .header-bar {
		background: #252525;
	}

	.group-header.expanded .header-bar {
		background: #1a1a1a;
	}

	.group-header.locked {
		opacity: 0.85;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.header-icon {
			width: 32px;
			height: 32px;
		}

		.header-title {
			font-size: 13px;
		}

		.progress-badge {
			padding: 0.25rem 0.5rem;
		}

		.badge-text {
			font-size: 11px;
		}

		.chevron-icon {
			width: 24px;
			height: 24px;
		}
	}
</style>
