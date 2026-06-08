<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';

	interface Props {
		pageId: string | undefined;
		direction: 1 | -1;
		evaluating?: boolean;
		children: Snippet;
	}

	let { pageId, direction, evaluating = false, children }: Props = $props();
</script>

<div class="step-wrapper">
	{#key pageId}
		<div
			class="step-container"
			class:evaluating
			in:fly={{ x: direction * 200, duration: 280, easing: quintOut }}
		>
			{@render children()}
		</div>
	{/key}
</div>

{#if evaluating}
	<div class="eval-overlay" aria-live="polite" aria-label="Loading page">
		<div class="eval-spinner">
			<div class="spinner-ring"></div>
		</div>
	</div>

	<div class="eval-indicator">
		<div class="eval-bar"></div>
	</div>
{/if}

<style>
	.step-wrapper {
		position: relative;
		width: 100%;
	}

	.step-container {
		width: 100%;
		transition: opacity 0.15s ease;
	}

	.step-container.evaluating {
		pointer-events: none;
		visibility: hidden;
	}

	.eval-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 40;
		pointer-events: none;
	}

	.eval-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.spinner-ring {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 3px solid color-mix(in srgb, var(--ddsa-primary-200, #cb997e) 20%, transparent);
		border-top-color: var(--ddsa-primary-500, #cb997e);
		animation: spinnerRotate 0.8s linear infinite;
	}

	@keyframes spinnerRotate {
		to {
			transform: rotate(360deg);
		}
	}

	.eval-indicator {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		z-index: 50;
		overflow: hidden;
	}

	.eval-bar {
		height: 100%;
		width: 40%;
		background: linear-gradient(90deg, transparent, var(--ddsa-primary, #cb997e), transparent);
		border-radius: 999px;
		animation: evalSlide 1.2s ease-in-out infinite;
	}

	@keyframes evalSlide {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(350%);
		}
	}
</style>
