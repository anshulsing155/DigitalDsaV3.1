<script lang="ts">
	/**
	 * ChartWrapper — A Svelte 5 wrapper around Chart.js with animations.
	 *
	 * Features:
	 * - Animated chart rendering on mount and data change
	 * - Configurable animation duration and easing
	 * - Automatic cleanup on unmount
	 * - SSR-safe (guards against server-side rendering)
	 *
	 * Usage:
	 *   <ChartWrapper type="doughnut" data={chartData} options={chartOptions} animated />
	 */
	import { browser } from '$app/environment';
	import { themeState } from '$lib/stores/theme.svelte';
	import {
		Chart,
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		LineController,
		BarController,
		DoughnutController,
		PieController,
		PointElement,
		ArcElement,
		Tooltip,
		Legend,
		Filler,
		Title
	} from 'chart.js';

	// --- Register all Chart.js components we need ---
	Chart.register(
		CategoryScale,
		LinearScale,
		BarElement,
		LineElement,
		LineController,
		BarController,
		DoughnutController,
		PieController,
		PointElement,
		ArcElement,
		Tooltip,
		Legend,
		Filler,
		Title
	);

	// --- Component Props ---
	interface Props {
		/** Chart type: 'bar', 'line', 'doughnut', 'pie' */
		type: 'bar' | 'line' | 'doughnut' | 'pie';

		/** Chart.js data object (labels, datasets) */
		data: any;

		/** Chart.js options object */
		options?: any;

		/** Additional CSS classes for the container */
		containerClass?: string;

		/** Height of the chart container */
		height?: string;

		/** Enable entrance animations (default: true) */
		animated?: boolean;

		/** Animation duration in milliseconds (default: 800) */
		animationDuration?: number;
	}

	let {
		type,
		data,
		options = {},
		containerClass = '',
		height = '300px',
		animated = true,
		animationDuration = 800
	}: Props = $props();

	// --- Canvas Reference ---
	let canvasElement: HTMLCanvasElement | undefined = $state();
	let chartInstance: Chart | undefined;

	// --- Build animation config based on chart type ---
	function getAnimationConfig() {
		if (!animated) return { animation: false as const };

		// Different chart types look best with different animation styles
		if (type === 'doughnut' || type === 'pie') {
			return {
				animation: {
					animateRotate: true,
					animateScale: true,
					duration: animationDuration,
					easing: 'easeOutQuart' as const
				}
			};
		}

		if (type === 'bar') {
			return {
				animation: {
					duration: animationDuration,
					easing: 'easeOutQuart' as const,
					// Bars grow upward from the x-axis
					y: {
						from: (ctx: any) => ctx.chart.scales?.y?.getPixelForValue(0) ?? 0
					}
				}
			};
		}

		if (type === 'line') {
			return {
				animation: {
					duration: animationDuration,
					easing: 'easeInOutCubic' as const,
					// Line draws progressively from left to right
					x: {
						type: 'number' as const,
						easing: 'linear' as const,
						duration: animationDuration,
						from: NaN, // start offscreen
						delay: (ctx: any) =>
							ctx.index * (animationDuration / (ctx.chart.data.labels?.length || 20))
					}
				}
			};
		}

		return {
			animation: {
				duration: animationDuration,
				easing: 'easeOutQuart' as const
			}
		};
	}

	// --- Reactive Chart Lifecycle ---
	// Re-renders when data/options change AND when color scheme or theme changes.
	// Without tracking themeState, Chart.js would keep stale colors after a scheme switch.
	$effect(() => {
		if (!browser || !canvasElement) return;

		const currentType = type;
		const currentData = data;
		const currentOptions = options;

		// Track theme state so chart re-renders when scheme/mode changes
		// (accessing these creates Svelte reactivity dependencies)
		const _scheme = themeState.scheme;
		const _resolved = themeState.resolved;

		// Destroy existing chart
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = undefined;
		}

		// Merge animation config into options
		const animConfig = getAnimationConfig();

		chartInstance = new Chart(canvasElement, {
			type: currentType,
			data: structuredClone(currentData),
			options: {
				responsive: true,
				maintainAspectRatio: false,
				...animConfig,
				...currentOptions,
				// Ensure animation from our config is preserved even if options has partial overrides
				animation: {
					...(animConfig.animation === false ? { duration: 0 } : animConfig.animation),
					...(currentOptions?.animation || {})
				}
			}
		});

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = undefined;
			}
		};
	});
</script>

<div class="w-full {containerClass}" style="height: {height};">
	<canvas bind:this={canvasElement}></canvas>
</div>
