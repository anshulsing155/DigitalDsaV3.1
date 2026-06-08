<script lang="ts">
	import type { PipelineItem } from '$lib/data/sampleDashboardData';

	interface Props {
		data: PipelineItem[];
		height?: number;
		showValues?: boolean;
	}

	let { data, height = 120, showValues = true }: Props = $props();

	const maxValue = $derived(Math.max(...data.map((d) => d.value), 1));
</script>

<div class="w-full">
	<div class="flex items-end justify-between gap-2" style="height: {height}px">
		{#each data as item}
			{@const barHeight = (item.value / maxValue) * 100}
			<div class="flex flex-1 flex-col items-center gap-1">
				{#if showValues}
					<span class="text-xs font-semibold text-[var(--dash-text-secondary)]">{item.value}</span>
				{/if}
				<div
					class="w-full overflow-hidden rounded-t-md"
					style="height: {barHeight}%; min-height: 4px;"
				>
					<div
						class="h-full w-full animate-[grow_0.6s_ease-out] rounded-t-md"
						style="background-color: {item.color};"
					></div>
				</div>
			</div>
		{/each}
	</div>
	<div class="mt-2 flex justify-between gap-2">
		{#each data as item}
			<div class="flex-1 text-center">
				<span class="text-[13px] font-medium text-[var(--dash-text-secondary)]">{item.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	@keyframes grow {
		from {
			transform: scaleY(0);
			transform-origin: bottom;
		}
		to {
			transform: scaleY(1);
			transform-origin: bottom;
		}
	}
</style>
