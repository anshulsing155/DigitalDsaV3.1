<script lang="ts">
	import type { WizardSection } from '$lib/types/wizard';

	interface Props {
		overallProgress: number;
		currentSectionLabel?: string;
		currentStepIndex?: number;
		totalSteps?: number;
		showStepText?: boolean;
	}

	let {
		overallProgress,
		currentSectionLabel = '',
		currentStepIndex = 0,
		totalSteps = 0,
		showStepText = false
	}: Props = $props();
</script>

<div class="wizard-top-progress">
	<div
		class="progress-track"
		role="progressbar"
		aria-valuenow={overallProgress}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Form progress: {overallProgress}%"
	>
		<div class="progress-fill" style="width: {overallProgress}%"></div>
	</div>
	{#if showStepText && totalSteps > 0}
		<div class="border-b border-[var(--ddsa-primary-500)] flex justify-center items-center h-full py-2 ">
			<p class="buttonText !m-0 text-center text-[var(--form-text-label)]" aria-live="polite">
				Step {currentStepIndex + 1} of {totalSteps}
				{#if currentSectionLabel}
					— <span class="font-titleMedium text-[var(--ddsa-primary-500)]"
						>{currentSectionLabel}</span
					>
				{/if}
			</p>
		</div>
	{/if}
</div>

<style>
	.wizard-top-progress {
		width: 100%;
	}

	.progress-track {
		width: 100%;
		height: 4px;
		background: var(--ddsa-accent-100);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(to right, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 2px;
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
