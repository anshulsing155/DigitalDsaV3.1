<script lang="ts">
	interface Segment {
		value: number;
		color: string;
		label?: string;
	}

	interface Props {
		segments: Segment[];
		size?: number;
		strokeWidth?: number;
		showCenter?: boolean;
		centerText?: string;
		centerSubtext?: string;
	}

	let {
		segments,
		size = 120,
		strokeWidth = 14,
		showCenter = true,
		centerText = '',
		centerSubtext = ''
	}: Props = $props();

	const radius = $derived((size - strokeWidth) / 2);
	const circumference = $derived(2 * Math.PI * radius);
	const total = $derived(segments.reduce((sum, s) => sum + s.value, 0));

	const arcs = $derived.by(() => {
		if (total === 0) return [];
		let offset = 0;
		return segments
			.filter((s) => s.value > 0)
			.map((s) => {
				const fraction = s.value / total;
				const dashLength = fraction * circumference;
				const dashOffset = -offset;
				offset += dashLength;
				return {
					...s,
					fraction,
					dashArray: `${dashLength} ${circumference - dashLength}`,
					dashOffset
				};
			});
	});
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	class="block"
	role="img"
	aria-label="Distribution chart"
>
	<!-- Empty state ring -->
	{#if total === 0}
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="var(--dash-border)"
			stroke-width={strokeWidth}
			opacity="0.3"
		/>
	{:else}
		<!-- Segment arcs -->
		{#each arcs as arc}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke={arc.color}
				stroke-width={strokeWidth}
				stroke-dasharray={arc.dashArray}
				stroke-dashoffset={arc.dashOffset}
				stroke-linecap="butt"
				transform="rotate(-90 {size / 2} {size / 2})"
				class="transition-all duration-700 ease-out"
			/>
		{/each}
	{/if}

	<!-- Center text -->
	{#if showCenter}
		{#if centerText}
			<text
				x={size / 2}
				y={centerSubtext ? size / 2 - 4 : size / 2}
				text-anchor="middle"
				dominant-baseline="central"
				class="fill-[var(--dash-text)] text-lg font-bold"
				style="font-size: {size * 0.18}px; font-weight: 700;"
			>
				{centerText}
			</text>
		{/if}
		{#if centerSubtext}
			<text
				x={size / 2}
				y={size / 2 + size * 0.12}
				text-anchor="middle"
				dominant-baseline="central"
				class="fill-[var(--dash-text-muted)]"
				style="font-size: {size * 0.1}px; font-weight: 500;"
			>
				{centerSubtext}
			</text>
		{/if}
	{/if}
</svg>
