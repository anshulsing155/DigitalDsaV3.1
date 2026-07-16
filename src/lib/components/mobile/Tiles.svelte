<script lang="ts">
	import { onMount } from 'svelte';
	import { ROUTES } from '$lib/config/routes.js';

	interface Props {
		tiles?: any[];
		onRestrictedAction?: (route: string) => void;
	}

	let { tiles = [], onRestrictedAction = () => {} }: Props = $props();

	let carousel: HTMLElement;
	let index = $state(1); // start at first real slide (after prepended lastClone)
	let totalSlides = $state(0); // initialize; set on mount after reading DOM

	const interval = 3000;
	const duration = 700;
	let timer: ReturnType<typeof setInterval> | null = null;

	// Track all active timeouts for cleanup
	let activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

	const slideWidth = 80; // 80% width with peeks
	let gapPercent = $state(4.4); // default based on mx-[2.2%] on each slide (total 4.4%)
	// Pixel-based values for smoother drag
	let slideWidthPx = $state(0);
	let gapPx = $state(0);
	let unitPx = $state(0);
	let centerOffsetPx = $state(0);

	// Drag state
	let isDragging = $state(false);
	let startX = $state(0);
	let deltaX = $state(0);
	let containerWidth = $state(0);
	let deltaPercent = $derived(containerWidth ? (deltaX / containerWidth) * 100 : 0);

	// Map track index to real index for dots
	let realIndex = $derived(
		totalSlides > 0
			? index === 0
				? totalSlides - 1
				: index === totalSlides + 1
					? 0
					: index - 1
			: 0
	);

	function updateWidth() {
		// Use parent container width for swipe threshold consistency
		containerWidth = carousel?.parentElement?.clientWidth ?? 0;

		// Dynamically compute gapPercent and pixel metrics from slide margins
		try {
			const realFirstIndex = 1; // first real slide after prepended clone
			const slideEl = carousel?.children?.[realFirstIndex];
			if (containerWidth && slideEl) {
				const cs = getComputedStyle(slideEl);
				const ml = parseFloat(cs.marginLeft) || 0;
				const mr = parseFloat(cs.marginRight) || 0;
				gapPx = ml + mr;
				gapPercent = (gapPx / containerWidth) * 100;
				slideWidthPx = slideEl.getBoundingClientRect().width;
				unitPx = slideWidthPx + gapPx;
				centerOffsetPx = (containerWidth - slideWidthPx) / 2;
			}
		} catch {}
	}

	function updateTransform(noTransition = false) {
		// Use pixel-based transform for smooth, 1:1 drag
		const base = -(index * unitPx) + centerOffsetPx + deltaX;
		carousel.style.transform = `translate3d(${base}px, 0, 0)`;
		carousel.style.transition = noTransition ? 'none' : `transform ${duration}ms ease-in-out`;
	}

	function trackTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
		const timeoutId = setTimeout(() => {
			activeTimeouts.delete(timeoutId);
			callback();
		}, delay);
		activeTimeouts.add(timeoutId);
		return timeoutId;
	}

	function goToSlide(trackIndex: number) {
		index = trackIndex;
		updateTransform();
		// If moved to clones, snap back to corresponding real slide after transition
		if (trackIndex === 0) {
			trackTimeout(() => {
				index = totalSlides; // last real slide
				updateTransform(true);
			}, duration);
		} else if (trackIndex === totalSlides + 1) {
			trackTimeout(() => {
				index = 1; // first real slide
				updateTransform(true);
			}, duration);
		}
	}

	function moveCarousel() {
		index += 1;
		updateTransform();
		if (index === totalSlides + 1) {
			// reached firstClone, snap back to first real slide
			trackTimeout(() => {
				index = 1;
				updateTransform(true);
			}, duration);
		}
	}

	function startAutoScroll() {
		stopAutoScroll();
		timer = setInterval(moveCarousel, interval);
	}

	function stopAutoScroll() {
		if (timer) clearInterval(timer);
	}

	function onPointerDown(e: PointerEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		deltaX = 0;
		if (e instanceof PointerEvent && carousel?.setPointerCapture) {
			carousel.setPointerCapture(e.pointerId);
		}
		stopAutoScroll();
	}

	function onPointerMove(e: PointerEvent | TouchEvent) {
		if (!isDragging) return;
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		deltaX = clientX - startX;
		updateTransform(true);
	}

	function onPointerUp(e: PointerEvent | TouchEvent) {
		if (!isDragging) return;
		isDragging = false;
		if (e instanceof PointerEvent && carousel?.releasePointerCapture) {
			carousel.releasePointerCapture(e.pointerId);
		}
		const threshold = Math.min(80, containerWidth * 0.2);
		if (deltaX > threshold) {
			goToSlide(index - 1);
		} else if (deltaX < -threshold) {
			goToSlide(index + 1);
		} else {
			// Snap back to current
			deltaX = 0;
			updateTransform();
		}
		deltaX = 0;
		startAutoScroll();
	}

	onMount(() => {
		// Capture initial slides, then add clones at both ends
		const initialSlides = Array.from(carousel.children);
		totalSlides = initialSlides.length;
		const firstClone = initialSlides[0]?.cloneNode(true);
		const lastClone = initialSlides[totalSlides - 1]?.cloneNode(true);
		if (lastClone) carousel.insertBefore(lastClone, initialSlides[0]); // prepend lastClone
		if (firstClone) carousel.appendChild(firstClone); // append firstClone

		// Set starting index to first real slide
		index = 1;
		updateWidth();
		updateTransform(true);
		startAutoScroll();

		window.addEventListener('resize', updateWidth);
		return () => {
			stopAutoScroll();
			window.removeEventListener('resize', updateWidth);
			// Clear all tracked timeouts
			activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
			activeTimeouts.clear();
		};
	});
</script>

<main class="flex flex-col items-center justify-center py-4">
	<h1 class="mb-4 text-xl font-semibold text-[var(--dash-text)]">Featured</h1>

	<div
		class="relative w-full max-w-md overflow-hidden px-2"
		role="region"
		aria-label="Featured cards carousel"
	>
		<!-- Track -->
		<div
			bind:this={carousel}
			class="flex touch-pan-y py-6"
			style="touch-action: pan-y; will-change: transform;"
			role="listbox"
			tabindex="0"
			aria-live="polite"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointerleave={onPointerUp}
			onpointercancel={onPointerUp}
		>
			{#if tiles && tiles.length > 0}
				{#each tiles as tile, i}
					<div
						class="relative mx-[2.2%] h-44 w-[80%] flex-shrink-0 overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] shadow-xl transition-transform select-none"
						class:scale-105={i === realIndex}
						role="option"
						aria-selected={i === realIndex}
					>
						<div class="absolute inset-0 flex flex-col p-6">
							<div class="flex items-center justify-between">
								<p class="text-base font-semibold text-[var(--dash-text)]">{tile.name}</p>
								<span class="text-xs font-medium text-indigo-600">{tile.interestRate}</span>
							</div>
							<p class="mt-1 line-clamp-2 text-xs text-[var(--dash-text-muted)]">
								{tile.description}
							</p>
							<div class="mt-auto flex items-center justify-between">
								<button
									class="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white active:scale-[0.98]"
									aria-label={`Apply for ${tile.name}`}
									onclick={() => onRestrictedAction(tile.route || '/contact')}
								>
									Apply
								</button>
								<button
									class="rounded-xl bg-[var(--dash-bg-alt)] px-3 py-2 text-xs font-semibold text-[var(--dash-text)] active:scale-[0.98]"
									aria-label={`Check eligibility for ${tile.name}`}
									onclick={() => onRestrictedAction(tile.route || '/contact')}
								>
									Check Eligibility
								</button>
							</div>
						</div>
					</div>
				{/each}
			{:else}
				<!-- Fallback slides -->
				<div
					class="relative mx-[2.2%] flex h-44 w-[80%] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-lg font-semibold text-[var(--dash-text)] shadow-xl transition-transform select-none"
					class:scale-105={realIndex === 0}
				>
					Home Loan
				</div>
				<div
					class="relative mx-[2.2%] flex h-44 w-[80%] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-lg font-semibold text-[var(--dash-text)] shadow-xl transition-transform select-none"
					class:scale-105={realIndex === 1}
				>
					Business Loan
				</div>
				<div
					class="relative mx-[2.2%] flex h-44 w-[80%] flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-lg font-semibold text-[var(--dash-text)] shadow-xl transition-transform select-none"
					class:scale-105={realIndex === 2}
				>
					Personal Loan
				</div>
			{/if}
		</div>

		<!-- Dot Indicators (use realIndex for active dot) -->

		<!-- Safe area bottom padding for iOS -->
		<div style="padding-bottom: env(safe-area-inset-bottom);"></div>
	</div>
</main>

<style>
	.touch-pan-y {
		touch-action: pan-y;
	}
</style>
