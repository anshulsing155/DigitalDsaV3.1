<script lang="ts">
	import { Check } from '$lib/utils/iconRegistry';

	interface Props {
		evaluating: boolean;
	}

	let { evaluating }: Props = $props();

	let showSaved = $state(false);
	let wasEvaluating = $state(false);
	let fadeTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (wasEvaluating && !evaluating) {
			// Evaluation just completed — show "Saved"
			showSaved = true;
			clearTimeout(fadeTimer);
			fadeTimer = setTimeout(() => {
				showSaved = false;
			}, 2000);
		}
		wasEvaluating = evaluating;
	});

	$effect(() => {
		return () => clearTimeout(fadeTimer);
	});
</script>

<span class="save-indicator-wrapper" aria-live="polite" aria-atomic="true">
	{#if evaluating}
		<span class="save-indicator saving">Saving...</span>
	{:else if showSaved}
		<span class="save-indicator saved">
			<Check size={14} />
			Saved
		</span>
	{/if}
</span>

<style>
	.save-indicator-wrapper {
		display: inline-flex;
		align-items: center;
		min-width: 4.5rem;
		height: 1em;
		flex-shrink: 0;
	}

	.save-indicator {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 0.75rem;
		font-weight: 500;
		margin-left: 0.75rem;
		vertical-align: middle;
		transition: opacity 0.3s ease;
		white-space: nowrap;
	}

	.saving {
		color: var(--form-text-muted, #9ca3af);
		animation: pulse 1.2s ease-in-out infinite;
	}

	.saved {
		color: var(--ddsa-success, #7a9e7e);
		animation: fadeInOut 2s ease forwards;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	@keyframes fadeInOut {
		0% {
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
