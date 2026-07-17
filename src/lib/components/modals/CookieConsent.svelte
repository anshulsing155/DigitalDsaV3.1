<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, fly, slide } from 'svelte/transition';

	let isConsentGiven = $state(false);
	let showModal = $state(false);
	let hasScrolledToPageHit = $state(false);
	let isExpanded = $state(false); // Mobile details drawer toggle

	// Reactively identify if we are on the cookies page
	let isCookiesPage = $derived(page.url.pathname === '/cookies');

	const acceptCookies = () => {
		document.cookie = 'consent=true; path=/; max-age=' + 60 * 60 * 24 * 365;
		isConsentGiven = true;
		showModal = false;
	};

	const handleScroll = () => {
		if (!isConsentGiven && !hasScrolledToPageHit) {
			const pageHit = document.getElementById('PageHit');
			if (pageHit && pageHit.getBoundingClientRect().top <= window.innerHeight) {
				showModal = true;
				hasScrolledToPageHit = true;
			}
		}
	};

	const handlePageLoad = () => {
		if (document.readyState === 'complete') {
			setTimeout(() => {
				if (!isConsentGiven) showModal = true;
			}, 1500);
		}
	};

	$effect(() => {
		const currentRoute = page.url.pathname;
		if (currentRoute === '/') {
			window.addEventListener('scroll', handleScroll);
		} else {
			handlePageLoad();
		}

		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});

	onMount(() => {
		isConsentGiven = document.cookie.includes('consent=true');
	});

	// Lock scroll only when overlay is visible AND we are not on the cookies text details page
	$effect(() => {
		if (showModal && !isCookiesPage && typeof document !== 'undefined') {
			document.body.style.overflow = 'hidden';
		} else if (typeof document !== 'undefined') {
			document.body.style.overflow = '';
		}
	});
</script>

{#if !isConsentGiven && showModal}
	{#if isCookiesPage}
		<!-- Slim bottom persistent banner on /cookies page to avoid blocking readability -->
		<div
			class="fixed bottom-6 left-1/2 z-50 flex w-11/12 max-w-2xl -translate-x-1/2 flex-col items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--form-border)] bg-[var(--landing-bg-card)] px-6 py-4 shadow-2xl backdrop-blur-md sm:flex-row text-[var(--form-text)]"
			transition:fly={{ y: 30, duration: 400 }}
		>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] text-xl animate-bounce"
				>
					🍪
				</div>
				<div>
					<h4 class="text-subParaFont font-FourthHead leading-none text-[var(--form-text)]">
						Reviewing our cookie policy?
					</h4>
					<p class="mt-1 font-Paragraph text-[0.65rem] leading-snug text-[var(--form-text-secondary)]">
						Accept cookies when you are ready to enable personalization and advanced site metrics.
					</p>
				</div>
			</div>

			<div class="flex w-full items-center justify-end gap-3 sm:w-auto">
				<button
					onclick={acceptCookies}
					class="w-full cursor-pointer rounded-xl bg-[var(--landing-accent)] text-[var(--landing-accent-text)] px-5 py-2.5 text-center font-FourthHead text-[0.75rem] whitespace-nowrap shadow-md transition-all hover:opacity-90 sm:w-auto"
				>
					Accept All Cookies
				</button>
			</div>
		</div>
	{:else}
		<!-- Backdrop (covers screen with blur effect, allowing blurred home content to peek through at the top) -->
		<div
			class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-0 backdrop-blur-sm md:items-center md:p-4"
			transition:fade={{ duration: 300 }}
		>
			<!-- Bottom Sheet container for mobile / centered dialog card for desktop -->
			<div
				class="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-[2.5rem] border-t border-[var(--form-border)] bg-[var(--landing-bg-card)] text-[var(--form-text)] shadow-2xl md:h-auto md:max-h-none md:max-w-4xl md:flex-row md:overflow-hidden md:rounded-[2rem] md:border"
				transition:fly={{ y: 100, duration: 400 }}
			>
				<!-- Grab handle for mobile bottom sheet to visually imply sheet overlay context -->
				<div
					class="mx-auto my-3.5 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--form-border)] md:hidden"
				></div>

				<!-- ==================== MOBILE/TABLET ACCORDION VIEW ==================== -->
				<div class="block w-full px-6 pb-6 md:hidden">
					<!-- Small screen brand header -->
					<div class="mb-4 flex items-center gap-3">
						<div class="flex items-center justify-center">
							<img src="/logo/logoBlack.svg" alt="Digital DSA" class="h-8 w-auto filter dark:invert" />
						</div>
						<div>
							<h2 class="text-subParaFont font-FourthHead leading-tight text-[var(--form-text)]">
								Digital DSA
							</h2>
							<span class="font-Paragraph text-[0.55rem] tracking-wider text-[var(--form-text-muted)] uppercase"
								>powered by Eyantrik</span
							>
						</div>
					</div>

					<!-- Concise initial summary -->
					<p class="text-subParaFont mb-4 font-Paragraph leading-relaxed text-[var(--form-text-secondary)]">
						We are an independent loan comparison platform. <span
							class="font-FourthHead text-[var(--form-text)] underline decoration-amber-400 decoration-2 underline-offset-2"
							>We do not provide loans directly.</span
						> We use cookies to personalise and improve our services.
					</p>

					<!-- Drawer Toggle -->
					<button
						onclick={() => (isExpanded = !isExpanded)}
						class="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] px-3 py-2.5 font-FourthHead text-[0.7rem] text-[var(--form-text-secondary)] transition-colors hover:opacity-90"
					>
						<span>{isExpanded ? 'Hide Details' : 'Show Full Disclaimer & Cookie Notice'}</span>
						<i class="fa-solid fa-chevron-{isExpanded ? 'up' : 'down'} text-[0.6rem] text-[var(--form-text-muted)]"
						></i>
					</button>

					<!-- Collapsible details drawer -->
					{#if isExpanded}
						<div
							class="mt-4 space-y-4 border-t border-[var(--form-border)] pt-3"
							transition:slide={{ duration: 300 }}
						>
							<!-- Platform Disclaimer Section -->
							<div
								class="flex flex-col gap-2 rounded-2xl border border-amber-200/50 bg-amber-50/30 p-4"
							>
								<div class="flex items-center gap-1.5">
									<svg
										class="h-4.5 w-4.5 text-amber-700"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<span
										class="font-FourthHead text-[0.65rem] tracking-wider text-amber-900 uppercase"
										>Disclaimer</span
									>
								</div>
								<ul class="list-disc space-y-2 pl-4 font-Paragraph text-[0.7rem] text-[var(--form-text-secondary)]">
									<li>Digital DSA is a loan and financial product comparison platform.</li>
									<li>We help users explore options from banks and NBFCs.</li>
									<li><strong>We do not provide loans directly.</strong></li>
									<li>We are independent and not affiliated with institutions.</li>
									<li>Our goal is transparent, unbiased financial information.</li>
								</ul>
							</div>

							<!-- Cookie Usage Details -->
							<div class="flex flex-col gap-2 rounded-2xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-4">
								<div class="flex items-center gap-1.5">
									<span class="text-base">🍪</span>
									<span
										class="font-FourthHead text-[0.65rem] tracking-wider text-[var(--form-text)] uppercase"
										>Cookie Details</span
									>
								</div>
								<ul class="list-disc space-y-2 pl-4 font-Paragraph text-[0.7rem] text-[var(--form-text-secondary)]">
									<li><strong>Running Website:</strong> Keep vital services operational</li>
									<li><strong>Personalization:</strong> Remember options & preferences</li>
									<li><strong>Relevance:</strong> Tailor parameters to your profile</li>
									<li><strong>Analytics:</strong> Understand site metrics to improve</li>
								</ul>
							</div>
						</div>
					{/if}

					<!-- Actions Footer on mobile sheet -->
					<div class="mt-6 flex items-center justify-between gap-4 border-t border-[var(--form-border)] pt-4">
						<button
							onclick={() => goto('/cookies')}
							class="text-subParaFont cursor-pointer font-Paragraph text-linkColor underline underline-offset-4 transition-colors hover:text-linkColor/80 hover:no-underline"
						>
							Learn More
						</button>

						<button
							onclick={acceptCookies}
							class="cursor-pointer rounded-xl bg-[var(--landing-accent)] text-[var(--landing-accent-text)] px-5 py-2.5 font-FourthHead text-[0.75rem] shadow-md transition-all hover:opacity-90 hover:shadow-lg"
						>
							Accept Cookies
						</button>
					</div>
				</div>

				<!-- ==================== DESKTOP DUAL PANEL VIEW ==================== -->
				<div class="hidden w-full md:flex">
					<!-- Left Panel: Brand & Platform Disclaimer -->
					<div
						class="flex w-1/2 flex-col justify-between border-r border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-8"
					>
						<!-- Header & Logo -->
						<div class="mb-6 flex items-center gap-3">
							<div class="flex items-center justify-center p-2.5">
								<img src="/logo/logoBlack.svg" alt="Digital DSA" class="h-8 w-auto filter dark:invert" />
							</div>
							<div>
								<h2 class="text-paraFont font-FourthHead leading-tight text-[var(--form-text)]">
									Digital DSA
								</h2>
								<span class="font-Paragraph text-[0.65rem] tracking-wider text-[var(--form-text-muted)] uppercase"
									>powered by Eyantrik</span
								>
							</div>
						</div>

						<!-- Disclaimer Block -->
						<div>
							<div
								class="mb-4 inline-flex animate-pulse items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-3 py-1 text-amber-800"
							>
								<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<span class="font-FourthHead text-[0.7rem] tracking-wider uppercase"
									>Disclaimer</span
								>
							</div>

							<ul class="text-subParaFont space-y-3.5 font-Paragraph text-[var(--form-text-secondary)]">
								<li class="flex items-start gap-2.5">
									<span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
									<span>Digital DSA is a loan and financial product comparison platform.</span>
								</li>
								<li class="flex items-start gap-2.5">
									<span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
									<span>We help users explore and choose better options from banks and NBFCs.</span>
								</li>
								<li class="flex items-start gap-2.5">
									<span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
									<span
										class="font-FourthHead text-[var(--form-text)] underline decoration-amber-400 decoration-2 underline-offset-4"
										>We do not provide loans directly.</span
									>
								</li>
								<li class="flex items-start gap-2.5">
									<span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--form-border)]"></span>
									<span>Digital DSA operates as an independent, user-focused platform.</span>
								</li>
								<li class="flex items-start gap-2.5">
									<span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--form-border)]"></span>
									<span>We are not affiliated with any bank or financial institution.</span>
								</li>
								<li class="flex items-start gap-2.5">
									<span class="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--form-border)]"></span>
									<span>Our goal is to provide transparent and unbiased financial information.</span>
								</li>
							</ul>
						</div>

						<div class="border-t border-[var(--form-border)] pt-4">
							<p class="font-Paragraph text-[0.7rem] text-[var(--form-text-muted)]">
								Independent Comparative Services. All rights reserved.
							</p>
						</div>
					</div>

					<!-- Right Panel: Cookie Notice & Acceptance -->
					<div class="flex w-1/2 flex-col justify-between p-8 bg-[var(--landing-bg-card)]">
						<div>
							<div class="mb-6 flex items-center gap-2">
								<span class="text-2xl">🍪</span>
								<h2 class="text-paraFont font-FourthHead leading-tight text-[var(--form-text)]">
									Cookie Notice
								</h2>
							</div>

							<p class="mb-4 font-FourthHead text-[0.8rem] text-[var(--form-text-secondary)]">
								We use cookies to enhance your experience:
							</p>

							<!-- Cookie items styled as cards -->
							<div class="space-y-2.5">
								<div
									class="flex items-center gap-3 rounded-2xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-3 transition-colors hover:opacity-90"
								>
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm text-indigo-600"
									>
										<i class="fa-solid fa-server"></i>
									</div>
									<div>
										<h4 class="text-subParaFont font-FourthHead leading-none text-[var(--form-text)]">
											Running Website
										</h4>
										<p class="mt-0.5 font-Paragraph text-[0.65rem] text-[var(--form-text-muted)]">
											Keep vital services operational
										</p>
									</div>
								</div>

								<div
									class="flex items-center gap-3 rounded-2xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-3 transition-colors hover:opacity-90"
								>
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm text-sky-600"
									>
										<i class="fa-solid fa-user-gear"></i>
									</div>
									<div>
										<h4 class="text-subParaFont font-FourthHead leading-none text-[var(--form-text)]">
											Personalization
										</h4>
										<p class="mt-0.5 font-Paragraph text-[0.65rem] text-[var(--form-text-muted)]">
											Identify you and remember preferences
										</p>
									</div>
								</div>

								<div
									class="flex items-center gap-3 rounded-2xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-3 transition-colors hover:opacity-90"
								>
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-600"
									>
										<i class="fa-solid fa-bullseye"></i>
									</div>
									<div>
										<h4 class="text-subParaFont font-FourthHead leading-none text-[var(--form-text)]">
											Relevance
										</h4>
										<p class="mt-0.5 font-Paragraph text-[0.65rem] text-[var(--form-text-muted)]">
											Make details and options relevant to you
										</p>
									</div>
								</div>

								<div
									class="flex items-center gap-3 rounded-2xl border border-[var(--form-border)] bg-[var(--landing-bg-alt)] p-3 transition-colors hover:opacity-90"
								>
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-sm text-purple-600"
									>
										<i class="fa-solid fa-chart-line"></i>
									</div>
									<div>
										<h4 class="text-subParaFont font-FourthHead leading-none text-[var(--form-text)]">
											Analytics
										</h4>
										<p class="mt-0.5 font-Paragraph text-[0.65rem] text-[var(--form-text-muted)]">
											Understand usage to improve platform
										</p>
									</div>
								</div>
							</div>
						</div>

						<!-- Footer Actions -->
						<div class="flex items-center justify-between gap-4 border-t border-[var(--form-border)] pt-4">
							<button
								onclick={() => goto('/cookies')}
								class="text-subParaFont cursor-pointer font-Paragraph text-linkColor underline underline-offset-4 transition-colors hover:text-linkColor/80 hover:no-underline"
							>
								Learn About Cookies
							</button>

							<button
								onclick={acceptCookies}
								class="cursor-pointer rounded-full bg-[var(--landing-accent)] text-[var(--landing-accent-text)] px-6 py-2.5 font-FourthHead text-[0.8rem] shadow-md transition-all hover:opacity-90 hover:shadow-lg"
							>
								Accept Cookies
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	/* Custom micro-animations */
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
