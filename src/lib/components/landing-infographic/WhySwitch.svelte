<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';

	let containerRef: HTMLElement | undefined = $state(undefined);
	let currentMode = $state<'split' | 'cockpit'>('split');

	function toggleMode(mode: 'split' | 'cockpit') {
		currentMode = mode;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		if (mode === 'cockpit') {
			// Gorgeous transition shrinking the Old World and maximizing the Modern Cockpit
			gsap.to('.old-world-panel', {
				scale: 0.94,
				opacity: 0.15,
				filter: 'blur(4px)',
				duration: 0.5,
				ease: 'power3.out'
			});
			gsap.to('.digital-cockpit-panel', {
				scale: 1.02,
				borderColor: '#ffcc00',
				boxShadow: '0 25px 60px rgba(255, 204, 0, 0.08)',
				duration: 0.5,
				ease: 'power3.out'
			});
		} else {
			gsap.to('.old-world-panel, .digital-cockpit-panel', {
				scale: 1,
				opacity: 1,
				filter: 'blur(0px)',
				borderColor: '',
				boxShadow: '',
				duration: 0.5,
				ease: 'power3.out'
			});
		}
	}

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				'.comparison-row',
				{ opacity: 0, y: 15 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.08,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: '.comparison-table-container',
						start: 'top 80%'
					}
				}
			);
		}, containerRef);

		return () => ctx.revert();
	});
</script>

<section bind:this={containerRef} id="why-switch" class="relative py-24 bg-[#fcfcfc] dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	
	<!-- Background visual overlays -->
	<div class="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[100px] pointer-events-none animate-pulse" aria-hidden="true"></div>
	<div class="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(239,68,68,0.015)] to-transparent rounded-full blur-[90px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10 text-center">
		
		<!-- Header -->
		<div class="mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Modernize your loan operation</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				Why India's Top DSAs <span class="bg-gradient-to-r from-[#ffcc00] to-[#ffd633] bg-clip-text text-transparent">Are Switching</span>
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Excel files and fragmented WhatsApp groups are a leaky bucket. Switch to a centralizedpolicy engine built exclusively for lending professionals.
			</p>
		</div>

		<!-- Action Mode Toggle Switch -->
		<div class="flex justify-center gap-2 mb-12 bg-gray-100 dark:bg-[#121216] p-1.5 rounded-2xl border border-gray-200 dark:border-[#202028] max-w-md mx-auto relative z-20">
			<button 
				onclick={() => toggleMode('split')}
				class="flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 {currentMode === 'split' ? 'bg-white dark:bg-[#1b1b24] text-gray-900 dark:text-white border border-gray-200 dark:border-[#2d2d3a] shadow-md' : 'text-gray-500 dark:text-[#71717a]'}"
			>
				<span>Compare Side-by-Side</span>
			</button>
			<button 
				onclick={() => toggleMode('cockpit')}
				class="flex-1 py-3 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 {currentMode === 'cockpit' ? 'bg-[#ffcc00] text-[#050505] shadow-md font-extrabold' : 'text-gray-500 dark:text-[#71717a]'}"
			>
				<Sparkles class="w-4 h-4" />
				<span>Transform My Agency</span>
			</button>
		</div>

		<!-- Split Cards Layout -->
		<div class="comparison-table-container grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto mb-16 relative">
			
			<!-- THE OLD WORLD (Left Card) -->
			<div class="old-world-panel bg-red-50/15 dark:bg-[#120f0f]/40 border border-red-200/60 dark:border-[#ef4444]/15 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative select-none">
				
				<div>
					<div class="flex items-center gap-3 border-b border-gray-200/80 dark:border-[#ef4444]/15 pb-4 mb-6">
						<div class="w-7 h-7 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444]">
							<X class="w-4.5 h-4.5" />
						</div>
						<span class="text-xs font-extrabold uppercase tracking-wider text-red-500 font-mono">Yesterday's Leaky Process</span>
					</div>

					<!-- Comparison Rows -->
					<div class="flex flex-col gap-5 text-left">
						
						<!-- Row 1 -->
						<div class="comparison-row p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-red-200/35 dark:border-red-950/20">
							<span class="text-[9px] font-bold font-mono text-gray-400 block mb-1 uppercase tracking-wider">Policy intelligence</span>
							<h4 class="text-xs font-extrabold text-gray-800 dark:text-gray-300 leading-normal">
								Broken WhatsApp groups sharing generic, outdated interest rate sheets and raw PDFs.
							</h4>
						</div>

						<!-- Row 2 -->
						<div class="comparison-row p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-red-200/35 dark:border-red-950/20">
							<span class="text-[9px] font-bold font-mono text-gray-400 block mb-1 uppercase tracking-wider">Income haircuts</span>
							<h4 class="text-xs font-extrabold text-gray-800 dark:text-gray-300 leading-normal">
								Excel files with zero formula backing for self-employed, rental, or complex co-borrower haircuts.
							</h4>
						</div>

						<!-- Row 3 -->
						<div class="comparison-row p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-red-200/35 dark:border-red-950/20">
							<span class="text-[9px] font-bold font-mono text-gray-400 block mb-1 uppercase tracking-wider">Geographic Specifics</span>
							<h4 class="text-xs font-extrabold text-gray-800 dark:text-gray-300 leading-normal">
								Sending cases blindly only to get immediate geographical rejects at final credit checking stage.
							</h4>
						</div>

						<!-- Row 4 -->
						<div class="comparison-row p-4 rounded-2xl bg-white/50 dark:bg-black/30 border border-red-200/35 dark:border-red-950/20">
							<span class="text-[9px] font-bold font-mono text-gray-400 block mb-1 uppercase tracking-wider">lead theft risk</span>
							<h4 class="text-xs font-extrabold text-gray-800 dark:text-gray-300 leading-normal">
								Sharing raw borrower profiles with aggregator tools who resell the information or poach codes.
							</h4>
						</div>

					</div>
				</div>

				<!-- Footer Annotations -->
				<div class="mt-8 pt-4.5 border-t border-gray-200 dark:border-[#ef4444]/15 text-xs text-red-500 italic flex items-center gap-2.5 font-sans leading-relaxed">
					<ShieldAlert class="w-5 h-5 flex-shrink-0" />
					<span class="handwritten text-left">Loses 20-30% of eligible files due to lack of policy transparency.</span>
				</div>
			</div>

			<!-- THE DIGITAL COCKPIT (Right Card) -->
			<div class="digital-cockpit-panel bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative shadow-md dark:shadow-xl select-none">
				
				<div>
					<div class="flex items-center gap-3 border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
						<div class="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
							<Check class="w-4.5 h-4.5" />
						</div>
						<span class="text-xs font-extrabold uppercase tracking-wider text-green-500 font-mono">DigitalDSA Cockpit Solution</span>
					</div>

					<!-- Comparison Rows -->
					<div class="flex flex-col gap-5 text-left">
						
						<!-- Row 1 -->
						<div class="comparison-row p-4 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-gray-100 dark:border-[#1e1e24] shadow-sm">
							<span class="text-[9px] font-bold font-mono text-[#ffcc00] block mb-1 uppercase tracking-wider">Policy intelligence</span>
							<h4 class="text-xs font-extrabold text-gray-900 dark:text-white leading-normal">
								Centralized digital guidelines resolving standard and deviations rules for 77+ active Indian lenders.
							</h4>
						</div>

						<!-- Row 2 -->
						<div class="comparison-row p-4 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-gray-100 dark:border-[#1e1e24] shadow-sm">
							<span class="text-[9px] font-bold font-mono text-[#ffcc00] block mb-1 uppercase tracking-wider">Income haircuts</span>
							<h4 class="text-xs font-extrabold text-gray-900 dark:text-white leading-normal">
								12-source profile slicer mapping specific haircuts across lenders to discover eligible borrowers.
							</h4>
						</div>

						<!-- Row 3 -->
						<div class="comparison-row p-4 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-gray-100 dark:border-[#1e1e24] shadow-sm">
							<span class="text-[9px] font-bold font-mono text-[#ffcc00] block mb-1 uppercase tracking-wider">Geographic Specifics</span>
							<h4 class="text-xs font-extrabold text-gray-900 dark:text-white leading-normal">
								CSS-style cascades resolution. Applies district, city, and municipal rules automatically in 15ms.
							</h4>
						</div>

						<!-- Row 4 -->
						<div class="comparison-row p-4 rounded-2xl bg-gray-50 dark:bg-[#141419] border border-gray-100 dark:border-[#1e1e24] shadow-sm">
							<span class="text-[9px] font-bold font-mono text-[#ffcc00] block mb-1 uppercase tracking-wider">lead theft risk</span>
							<h4 class="text-xs font-extrabold text-gray-900 dark:text-white leading-normal">
								Strict non-compete pledge. Masks PAN/Aadhaar details completely. Pure professional SaaS.
							</h4>
						</div>

					</div>
				</div>

				<!-- Footer Annotations -->
				<div class="mt-8 pt-4.5 border-t border-gray-200 dark:border-[#27272a] text-xs text-[#ffcc00] italic flex items-center gap-2.5 font-sans leading-relaxed">
					<Sparkles class="w-5 h-5 flex-shrink-0 text-[#ffcc00]" />
					<span class="handwritten text-left">Fast tracks sanctions by over 70% with direct vetted relationship manager access.</span>
				</div>
			</div>

		</div>

		<!-- Float Margin handwriting callout note -->
		{#if currentMode === 'cockpit'}
			<div class="hidden xl:block absolute bottom-[8%] right-[8%] select-none rotate-3">
				<div class="flex flex-col items-center">
					<span class="handwritten text-xs text-[#ffcc00] bg-white dark:bg-[#050505] px-3 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-lg max-w-[170px] leading-relaxed text-center">
						*Cockpit is up to 10x faster than Excel sheets!
					</span>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#ffcc00] rotate-45 mt-1">
						<path d="M2 2C6 8 12 16 22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<path d="M16 22L22 22L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</div>
			</div>
		{/if}

	</div>
</section>
