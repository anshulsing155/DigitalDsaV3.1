<script lang="ts">
	interface Props {
		currentStepIndex: number;
		totalSteps: number;
		progressWidth: number;
	}

	let { currentStepIndex, totalSteps, progressWidth }: Props = $props();
</script>

<div class="mb-8">
	<div class="mb-2 flex items-center justify-between">
		<span class="smallText text-grayOne">
			Question {currentStepIndex + 1} of {totalSteps}
		</span>
		<span class="smallText text-grayOne">
			{Math.round(progressWidth)}% Complete
		</span>
	</div>

	<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--dash-bg-alt)]">
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			class="h-full bg-gradient-to-r from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-500)] transition-all duration-500 ease-out"
			style="width: {progressWidth}%"
		/>
	</div>
</div>
