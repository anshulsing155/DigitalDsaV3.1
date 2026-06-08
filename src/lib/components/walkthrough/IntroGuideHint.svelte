<script lang="ts">
	import { onMount } from 'svelte';
	import { walkthroughState } from '$lib/state/walkthrough.svelte';

	let hintElement: HTMLDivElement | undefined = $state();
	let isVisible = $state(false);
	let position = $state({ top: 0, left: 0 });

	onMount(() => {
		// Auto-hide after 3.5 seconds
		const timer = setTimeout(() => {
			walkthroughState.hideIntroDismissedHint();
		}, 3500);

		return () => clearTimeout(timer);
	});

	// Watch for hint state changes and position tooltip
	$effect(() => {
		if (walkthroughState.showIntroDismissedHint) {
			isVisible = true;
			// Wait for DOM to render, then position relative to guide button
			setTimeout(() => {
				const guideButton = document.querySelector('[data-walkthrough*="page-tour"]');
				if (guideButton && hintElement) {
					const rect = guideButton.getBoundingClientRect();
					const tooltipWidth = hintElement.offsetWidth;
					const viewportWidth = window.innerWidth;

					// The dashboard sidebar (lg+ only) is w-52 = 208px and opaque.
					// The tooltip is up to 220px wide centered on a small ~32px button
					// just inside the content area, so a naive centered position
					// overflows ~94px into the sidebar — visually covering the
					// "Digital DSA / DSA Agent" header. Clamp `left` to keep the
					// tooltip strictly within the content area on lg+ viewports.
					const SIDEBAR_WIDTH = 208; // matches dashboard/+layout.svelte w-52
					const LG_BREAKPOINT = 1024; // Tailwind default
					const EDGE_PADDING = 12;
					const minLeft =
						viewportWidth >= LG_BREAKPOINT ? SIDEBAR_WIDTH + EDGE_PADDING : EDGE_PADDING;
					// Also keep the tooltip's right edge inside the viewport.
					const maxLeft = Math.max(minLeft, viewportWidth - tooltipWidth - EDGE_PADDING);

					const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
					const clampedLeft = Math.min(maxLeft, Math.max(minLeft, centeredLeft));

					position = {
						top: rect.bottom + 12, // 12px below button
						left: clampedLeft
					};
				}
			}, 0);
		}
	});
</script>

{#if isVisible}
	<div
		bind:this={hintElement}
		class="animate-in fade-in slide-in-from-top-2 fixed z-50 duration-300"
		style="top: {position.top}px; left: {position.left}px;"
	>
		<!-- Arrow pointing up -->
		<div class="absolute -top-1 left-1/2 -translate-x-1/2 transform">
			<div
				class="h-2 w-2 rotate-45 bg-slate-800"
				style="box-shadow: -1px -1px 2px rgba(0, 0, 0, 0.1);"
			></div>
		</div>

		<!-- Tooltip bubble -->
		<div
			class="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white shadow-lg"
			style="max-width: 220px; white-space: nowrap;"
		>
			✨ You can access the guide anytime from here
		</div>
	</div>
{/if}

<style>
	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideInFromTop {
		from {
			transform: translateY(-8px);
		}
		to {
			transform: translateY(0);
		}
	}

	:global(.animate-in) {
		animation:
			fadeIn 0.3s ease-out,
			slideInFromTop 0.3s ease-out;
	}
</style>
