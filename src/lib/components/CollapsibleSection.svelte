<script lang="ts">
	import { ChevronDown, Check } from '$lib/utils/iconRegistry';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		stepNumber?: number;
		expanded?: boolean;
		completed?: boolean;
		onToggle?: () => void;
		children?: Snippet;
	}

	let {
		title,
		stepNumber = 1,
		expanded = false,
		completed = false,
		onToggle,
		children
	}: Props = $props();
</script>

<div class="collapsible-section" class:is-expanded={expanded} class:is-completed={completed}>
	<button type="button" class="section-header" onclick={onToggle}>
		<div class="section-left">
			<div class="step-badge" class:done={completed} class:active={expanded && !completed}>
				{#if completed}
					<Check class="h-4 w-4" />
				{:else}
					<span class="step-num">{stepNumber}</span>
				{/if}
			</div>
			<span class="section-title">{title}</span>
			{#if completed}
				<span class="completed-label">Completed</span>
			{/if}
		</div>
		<div class="chevron" class:rotated={expanded}>
			<ChevronDown class="h-5 w-5" />
		</div>
	</button>

	{#if expanded}
		<div class="section-body">
			{#if children}{@render children()}{/if}
		</div>
	{/if}
</div>

<style>
	.collapsible-section {
		border: 2px solid var(--form-border);
		border-radius: 0.75rem;
		overflow: hidden;
		margin-top: 1.25rem;
		transition:
			border-color 0.25s ease,
			box-shadow 0.25s ease;
		background: var(--form-bg-card);
	}

	.collapsible-section.is-expanded {
		border-color: var(--ddsa-primary-500);
		box-shadow: 0 2px 8px rgba(203, 153, 126, 0.12);
	}

	.collapsible-section.is-completed {
		border-color: #10b981;
		box-shadow: none;
	}

	.section-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.section-header:hover {
		background: rgba(0, 0, 0, 0.015);
	}

	.section-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.step-badge {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.8rem;
		background: var(--form-bg-disabled);
		color: var(--form-text-muted);
		transition: all 0.25s ease;
		flex-shrink: 0;
	}

	.step-badge.active {
		background: var(--ddsa-primary-500);
		color: #fff;
	}

	.step-badge.done {
		background: #10b981;
		color: #fff;
	}

	.step-num {
		line-height: 1;
	}

	.section-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: var(--font-size-md);
		color: var(--form-text);
	}

	.completed-label {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.7rem;
		color: #10b981;
		background: #ecfdf5;
		padding: 0.125rem 0.5rem;
		border-radius: 1rem;
		font-weight: 500;
	}

	:global(.dark) .completed-label {
		background: rgba(16, 185, 129, 0.15);
	}

	.chevron {
		transition: transform 0.25s ease;
		color: var(--form-text-muted);
		flex-shrink: 0;
	}

	.chevron.rotated {
		transform: rotate(180deg);
	}

	.section-body {
		padding: 0 1rem 1rem;
	}
</style>
