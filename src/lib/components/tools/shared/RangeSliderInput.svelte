<script lang="ts">
	/**
	 * RangeSliderInput — A styled range slider with integrated number input.
	 *
	 * Inspired by the reference EMI calculator design:
	 * - Label on the left, input field on the right with unit suffix
	 * - Orange/bronze range slider below
	 * - Min/max labels under the slider track
	 * - Smooth thumb interaction with ddsa color accent
	 *
	 * Usage:
	 *   <RangeSliderInput
	 *     label="Loan Amount"
	 *     bind:value={loanAmount}
	 *     min={50000} max={100000000}
	 *     step={50000}
	 *     unit="₹"
	 *     formatValue={formatIndian}
	 *   />
	 */

	interface Props {
		/** Descriptive label for the input */
		label: string;

		/** Current value (two-way bindable) */
		value: number;

		/** Minimum slider value */
		min: number;

		/** Maximum slider value */
		max: number;

		/** Step increment for the slider.
		 *  Can be a fixed number OR 'auto' for smart adaptive steps.
		 *  'auto' uses smaller steps for lower values and larger steps for higher values,
		 *  solving the accuracy problem for loan amounts (₹50K → ₹10Cr range). */
		step?: number | 'auto';

		/** Unit displayed next to the input (e.g., "₹", "%") */
		unit?: string;

		/** Unit position: before the value ("₹ 50L") or after ("8.5 %") */
		unitPosition?: 'prefix' | 'suffix';

		/** Whether to allow decimal input (for interest rate) */
		allowDecimals?: boolean;

		/** Custom formatter for the min/max labels under the slider */
		formatLabel?: (value: number) => string;

		/** Intermediary snap points to show as small ticks on the slider track.
		 *  E.g. [25_00_000, 50_00_000, 75_00_000, 100_00_000] for loan amounts. */
		snapPoints?: number[];

		/** Unique ID for accessibility */
		id: string;
	}

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		unit = '',
		unitPosition = 'prefix',
		allowDecimals = false,
		formatLabel,
		snapPoints,
		id
	}: Props = $props();

	/**
	 * Calculate the effective step for the slider.
	 *
	 * When step is 'auto', we use a logarithmic scale approach:
	 * - Values < 10L: ₹10,000 steps (fine control for smaller loans)
	 * - Values 10L–50L: ₹25,000 steps (common home loan range)
	 * - Values 50L–1Cr: ₹50,000 steps
	 * - Values > 1Cr: ₹1,00,000 steps (commercial loans)
	 *
	 * This ensures ~100-300 positions on the slider regardless of range,
	 * which is the sweet spot for both mobile touch accuracy and desktop mouse precision.
	 */
	let effectiveStep = $derived.by(() => {
		if (step !== 'auto') return step;

		const range = max - min;
		if (range <= 1_000_000) return 10_000; // Up to 10L: ₹10K steps
		if (range <= 5_000_000) return 25_000; // Up to 50L: ₹25K steps
		if (range <= 50_000_000) return 50_000; // Up to 5Cr: ₹50K steps
		if (range <= 100_000_000) return 100_000; // Up to 10Cr: ₹1L steps
		return 500_000; // Above 10Cr: ₹5L steps
	});

	/**
	 * Calculate the percentage position of the slider thumb.
	 * Used to fill the track color up to the thumb position.
	 * Guards against min === max (would produce Infinity/NaN and break the CSS fill).
	 */
	let fillPercentage = $derived.by(() => {
		const range = max - min;
		if (range <= 0) return 0;
		return Math.min(100, Math.max(0, ((value - min) / range) * 100));
	});

	// When min/max collapse to a single value (or max < min), the slider can't
	// represent any choice. Disabling the input makes the degenerate state
	// visible instead of silently leaving a stuck thumb with no feedback.
	let isDegenerate = $derived(max <= min);

	/** Format a number for the min/max labels under the slider */
	function defaultFormatLabel(val: number): string {
		if (val >= 10000000) return `${(val / 10000000).toFixed(0)}Cr`;
		if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
		if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
		return String(val);
	}

	let labelFormatter = $derived(formatLabel || defaultFormatLabel);

	/** Handle direct number input */
	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const raw = target.value.replace(/[^0-9.]/g, '');
		const parsed = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
		if (!isNaN(parsed)) {
			value = Math.max(min, Math.min(max, parsed));
		}
	}

	/** Format the displayed input value (Indian number system) */
	function formatDisplayValue(val: number): string {
		if (allowDecimals) return String(val);
		return val.toLocaleString('en-IN');
	}
</script>

<div class="space-y-2">
	<!-- Row: Label + Input Field -->
	<div class="flex items-center justify-between gap-4">
		<label
			for="{id}-input"
			class="text-sm font-semibold whitespace-nowrap text-[var(--ddsa-secondary-700)]"
		>
			{label}
		</label>

		<div
			class="flex items-center gap-1.5 rounded-lg border border-[var(--ddsa-primary-200)] bg-white px-3 py-1.5 shadow-sm transition-all focus-within:border-[var(--ddsa-primary)] focus-within:ring-2 focus-within:ring-[var(--ddsa-primary-100)]"
		>
			{#if unit && unitPosition === 'prefix'}
				<span class="text-sm font-medium text-[var(--ddsa-secondary-400)]">{unit}</span>
			{/if}
			<input
				id="{id}-input"
				type="text"
				inputmode={allowDecimals ? 'decimal' : 'numeric'}
				value={formatDisplayValue(value)}
				oninput={handleInputChange}
				class="w-28 border-none bg-transparent text-right text-sm font-bold text-[var(--ddsa-secondary)] outline-none sm:w-32"
			/>
			{#if unit && unitPosition === 'suffix'}
				<span class="text-sm font-medium text-[var(--ddsa-secondary-400)]">{unit}</span>
			{/if}
		</div>
	</div>

	<!-- Range Slider -->
	<div class="relative">
		<input
			id="{id}-slider"
			type="range"
			{min}
			{max}
			step={effectiveStep}
			bind:value
			disabled={isDegenerate}
			aria-disabled={isDegenerate}
			class="emi-range-slider w-full {isDegenerate ? 'cursor-not-allowed opacity-60' : ''}"
			style="--fill: {fillPercentage}%;"
		/>

		<!-- Snap point tick marks (if provided) — subtle dots on the track -->
		{#if snapPoints && snapPoints.length > 0 && max > min}
			<div class="pointer-events-none absolute top-0 right-0 left-0 h-[6px]">
				{#each snapPoints as point (point)}
					{@const pct = ((point - min) / (max - min)) * 100}
					{#if pct > 2 && pct < 98}
						<div
							class="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-white/60"
							style="left: {pct}%;"
						></div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Min / Max labels + optional snap point labels -->
	<div class="flex justify-between text-[10px] font-medium text-[var(--ddsa-secondary-400)]">
		<span>{labelFormatter(min)}</span>
		{#if snapPoints && snapPoints.length <= 5}
			{#each snapPoints as point (point)}
				{@const pct = ((point - min) / (max - min)) * 100}
				{#if pct > 10 && pct < 90}
					<span
						style="position: absolute; left: {pct}%; transform: translateX(-50%);"
						class="relative"
					>
						{labelFormatter(point)}
					</span>
				{/if}
			{/each}
		{/if}
		<span>{labelFormatter(max)}</span>
	</div>
</div>

<style>
	/* === Custom Range Slider Styling ===
	 * Creates the orange/bronze track fill effect from the reference design.
	 * The --fill CSS variable is set dynamically based on the slider value. */

	.emi-range-slider {
		-webkit-appearance: none;
		appearance: none;
		height: 6px;
		border-radius: 3px;
		outline: none;
		cursor: pointer;
		/* Track fill gradient uses CSS variable tokens — auto-adapts to theme */
		background: linear-gradient(
			to right,
			var(--slider-track-fill) 0%,
			var(--slider-track-fill) var(--fill),
			var(--slider-track-bg) var(--fill),
			var(--slider-track-bg) 100%
		);
		transition: background 0.1s ease;
	}

	/* Thumb: WebKit (Chrome, Safari, Edge) */
	.emi-range-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--slider-thumb);
		border: 3px solid var(--slider-thumb-border);
		box-shadow: 0 1px 4px var(--slider-thumb-shadow);
		cursor: grab;
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
	}

	.emi-range-slider::-webkit-slider-thumb:hover {
		transform: scale(1.15);
		box-shadow: 0 2px 8px var(--slider-thumb-hover-shadow);
	}

	.emi-range-slider::-webkit-slider-thumb:active {
		cursor: grabbing;
		transform: scale(1.1);
	}

	/* Thumb: Firefox */
	.emi-range-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--slider-thumb);
		border: 3px solid var(--slider-thumb-border);
		box-shadow: 0 1px 4px var(--slider-thumb-shadow);
		cursor: grab;
	}

	/* Track fill: Firefox (native support) */
	.emi-range-slider::-moz-range-progress {
		background: var(--slider-track-fill);
		height: 6px;
		border-radius: 3px;
	}

	.emi-range-slider::-moz-range-track {
		background: var(--slider-track-bg);
		height: 6px;
		border-radius: 3px;
	}
</style>
