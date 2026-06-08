<script lang="ts">
	import { onMount } from 'svelte';
	// Importing ArrowRight for the CTA button enhancement
	import { Star, StarOff, ArrowRight } from '$lib/utils/iconRegistry';
	import type { LoanProduct, TrustMetric } from '$lib/types/landing';

	interface Props {
		loanProducts: LoanProduct[];
		metrics: TrustMetric[];
	}

	let { loanProducts, metrics }: Props = $props();

	let currentTestimonial = $state(0);
	let autoPlayInterval: NodeJS.Timeout | undefined;
	let sectionElement: HTMLElement | undefined;
	let isVisible = $state(false);

	// Sliding track refs and state
	let containerEl: HTMLElement | undefined;
	let containerWidth = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let deltaX = $state(0);
	let deltaPercent = $derived(containerWidth ? (deltaX / containerWidth) * 100 : 0);

	function updateWidth() {
		containerWidth = containerEl?.clientWidth ?? 0;
	}

	// Helper function to handle infinite looping autoplay
	function startAutoplay() {
		// Clear any existing interval first
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
		}

		// Only start autoplay if there are multiple products
		if (loanProducts.length > 1) {
			autoPlayInterval = setInterval(() => {
				// Use modulo operator for infinite looping (0, 1, 2, ..., N-1, 0, 1, ...)
				currentTestimonial = (currentTestimonial + 1) % loanProducts.length;
			}, 5000);
		}
	}

	onMount(() => {
		// Start infinite looping auto-play
		startAutoplay();

		// Intersection observer for animations
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isVisible = true;
					}
				});
			},
			{ threshold: 0.3 }
		);

		if (sectionElement) {
			observer.observe(sectionElement);
		}

		updateWidth();
		window.addEventListener('resize', updateWidth);

		return () => {
			if (autoPlayInterval) clearInterval(autoPlayInterval);
			observer.disconnect();
			window.removeEventListener('resize', updateWidth);
		};
	});

	function goToTestimonial(index: number) {
		currentTestimonial = index;
		// Restart auto-play
		startAutoplay();
	}

	// Function to render stars (using Lucide icons)
	function renderStars(rating: number) {
		return Array(5)
			.fill(0)
			.map((_, i) => i < rating);
	}

	function onPointerDown(e: PointerEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as PointerEvent).clientX;
		deltaX = 0;
		// Use standard PointerEvent handling
		if (e instanceof PointerEvent && containerEl?.setPointerCapture) {
			containerEl.setPointerCapture(e.pointerId);
		}
		// Temporarily stop autoplay during drag
		if (autoPlayInterval) {
			clearInterval(autoPlayInterval);
		}
	}

	function onPointerMove(e: PointerEvent | TouchEvent) {
		if (!isDragging) return;
		const clientX =
			'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as PointerEvent).clientX;
		deltaX = clientX - startX;
	}

	function onPointerUp(e?: PointerEvent | TouchEvent) {
		if (!isDragging) return;
		isDragging = false;
		if (e instanceof PointerEvent && containerEl?.releasePointerCapture) {
			containerEl.releasePointerCapture(e.pointerId);
		}

		const threshold = Math.min(80, containerWidth * 0.25); // Increased sensitivity

		if (deltaX > threshold) {
			// Swiped right (to previous slide): (index - 1 + length) % length ensures positive wrap around
			currentTestimonial = (currentTestimonial - 1 + loanProducts.length) % loanProducts.length;
		} else if (deltaX < -threshold) {
			// Swiped left (to next slide): (index + 1) % length ensures wrap around to 0
			currentTestimonial = (currentTestimonial + 1) % loanProducts.length;
		}
		deltaX = 0;

		// Restart autoplay (which now loops)
		startAutoplay();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			// Move left/backward
			goToTestimonial((currentTestimonial - 1 + loanProducts.length) % loanProducts.length);
		} else if (e.key === 'ArrowRight') {
			// Move right/forward
			goToTestimonial((currentTestimonial + 1) % loanProducts.length);
		}
	}
</script>

<div bind:this={sectionElement} class="bg-gray-50 px-2 py-2">
	<div class="mx-auto max-w-sm">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={containerEl}
			onpointerdown={(e) => {
				e.preventDefault();
				onPointerDown(e);
			}}
			onpointermove={(e) => {
				e.preventDefault();
				onPointerMove(e);
			}}
			onpointerup={(e) => onPointerUp(e)}
			onpointerleave={() => onPointerUp()}
			onkeydown={onKeyDown}
			tabindex="0"
			role="group"
			aria-roledescription="carousel"
			aria-label="Loan products carousel"
			class="touch-pan-y overflow-hidden focus:outline-none"
		>
			<div
				class="flex"
				style={`
					transform: translateX(calc(-${currentTestimonial * 100}% + ${deltaPercent}%));
					transition: transform ${isDragging ? '0ms' : '500ms'} ease-out;
				`}
			>
				{#each loanProducts as product, index}
					<div class="w-full shrink-0 px-1">
						<!-- Enhanced Card Content -->
						<div
							class="relative transform rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-blue-200/50 transition-all duration-500 sm:p-8 {isVisible
								? 'translate-y-0 opacity-100'
								: 'translate-y-4 opacity-0'}"
						>
							<div class="mb26 flex items-start justify-between">
								<!-- Enhanced Icon and Title -->
								<div class="flex flex-col">
									<div class="mb-2 text-4xl text-blue-600">{product.icon}</div>
									<h3 class="text-md sm:text-md font-extrabold text-gray-900 transition-colors">
										{product.name}
									</h3>
								</div>

								<!-- Interest Rate Pill Badge -->
								<div class="flex flex-col items-end">
									<!-- <span class="text-xs font-semibold text-gray-500 uppercase">Rate from</span> -->
									<div
										class="rounded-full border border-green-500 bg-green-500/10 px-2 py-1 text-sm font-bold text-green-700 sm:text-sm"
									>
										{product.interestRate}
									</div>
								</div>
							</div>

							<p class="mb-4 text-sm leading-relaxed text-gray-600 sm:text-base">
								{product.description}
							</p>

							<!-- Elevated CTA Button with Icon -->
							<button
								class="flex w-full transform items-center justify-center gap-2 rounded-xl bg-[#007bff] px-4 py-3 font-bold text-white shadow-lg shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
								aria-label="Apply for {product.name}"
							>
								Check Offers Now
								<ArrowRight size={20} class="ml-1" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	/* Prevent text selection during drag */
	:global(.touch-pan-y) {
		user-select: none;
		-webkit-user-select: none;
		-ms-user-select: none;
	}

	/* Smooth scrolling for touch devices */
	:global(.overflow-hidden) {
		-webkit-overflow-scrolling: touch;
	}
</style>
