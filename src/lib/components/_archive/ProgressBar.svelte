<script lang="ts">
	interface Props {
		currentStep?: number; // Zero-based index
		totalSteps?: number; // Must be at least 1
	}

	let { currentStep = 0, totalSteps = 10 }: Props = $props();

	let progress = $derived(Math.min((currentStep / (totalSteps - 1)) * 100, 100));
</script>

<div class="flex items-center justify-between gap-4">
	<!-- Progress Bar -->
	<div class="relative h-2 flex-grow rounded bg-[var(--dash-bg-alt)]">
		<div
			class="absolute top-0 left-0 h-2 rounded bg-gradient-to-r from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-500)] transition-all duration-300"
			style="width: {progress}%"
		></div>
	</div>

	<!-- Index Indicator -->
	<div class="min-w-max pl-2 text-sm text-[var(--dash-text-secondary)]">
		<p>{currentStep + 1} / {totalSteps}</p>
	</div>
</div>
