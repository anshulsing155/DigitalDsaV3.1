<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import { landingNav } from '$lib/state/landingNavigation.svelte';
	import { TRIAL_DAYS, PLANS } from '$lib/config/billing';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';
	import Check from 'lucide-svelte/icons/check';

	let containerRef: HTMLElement | undefined = $state(undefined);

	function handleCTA() {
		landingNav.handleCTA();
	}

	function handleGuestDemo() {
		window.location.href = '/test-dashboard';
	}

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				'.pricing-card',
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					stagger: 0.15,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: '.pricing-grid',
						start: 'top 80%'
					}
				}
			);
		}, containerRef);

		return () => ctx.revert();
	});
</script>

<section bind:this={containerRef} id="pricing" class="relative py-24 bg-[#fcfcfc] dark:bg-[#09090b] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8">
	<!-- Ambient lights backdrop -->
	<div class="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[90px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10 text-center">
		
		<!-- Header -->
		<div class="mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Transparent, professional pricing</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				Professional Plans, <span class="bg-gradient-to-r from-[#ffcc00] to-[#ffd633] bg-clip-text text-transparent">No Commission Share</span>
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				We are a subscription utility, not a corporate DSA. You keep 100% of your bank payouts. GST inclusive.
			</p>
		</div>

		<!-- Pricing Cards Grid -->
		<div class="pricing-grid grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto mb-20">
			
			<!-- BASIC TIER -->
			<div class="pricing-card flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#101014]/60 backdrop-blur-md relative select-none hover:border-[#ffcc00]/30 transition-all duration-300 shadow-md dark:shadow-xl">
				<div>
					<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Basic</h3>
					<p class="text-xs text-gray-500 dark:text-[#a1a1aa] mb-6">Perfect for independent local agents.</p>
					
					<div class="mb-6 font-mono">
						<span class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">₹999</span>
						<span class="text-xs text-gray-500 dark:text-[#a1a1aa] font-sans">/mo</span>
					</div>

					<div class="h-[1px] bg-gray-100 dark:bg-[#1f1f23] mb-6"></div>

					<ul class="flex flex-col gap-3.5 text-left mb-8">
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>10 active cases</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>All 6 loan types + variants</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Rule engine validation</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-400 dark:text-[#71717a] line-through">
							<span>Priority direct support</span>
						</li>
					</ul>
				</div>

				<button 
					onclick={handleCTA}
					class="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#18181b] dark:hover:bg-[#27272a] text-gray-900 dark:text-white text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#27272a] transition-all hover:scale-[1.02] duration-200"
				>
					Start Free Trial
				</button>
			</div>

			<!-- PRO TIER (Most Popular / Highlighted) -->
			<div class="pricing-card flex flex-col justify-between p-6 sm:p-8 rounded-3xl border-2 border-[#ffcc00] bg-white dark:bg-[#101014]/90 backdrop-blur-md relative shadow-lg dark:shadow-[0_15px_40px_rgba(255,204,0,0.05)] select-none hover:scale-[1.02] transition-all duration-300">
				
				<!-- Recommended Badge -->
				<span class="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full bg-[#ffcc00] text-[#09090b] text-[10px] font-extrabold uppercase tracking-widest shadow-md">Recommended</span>

				<div>
					<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Pro</h3>
					<p class="text-xs text-gray-500 dark:text-[#a1a1aa] mb-6">Designed for active solo DSAs and small teams.</p>
					
					<div class="mb-6 font-mono">
						<span class="text-3xl sm:text-4xl font-extrabold text-[#ffcc00]">₹3,999</span>
						<span class="text-xs text-gray-500 dark:text-[#a1a1aa] font-sans">/mo</span>
					</div>

					<div class="h-[1px] bg-gray-100 dark:bg-[#1f1f23] mb-6"></div>

					<ul class="flex flex-col gap-3.5 text-left mb-8">
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>50 active cases</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>All 6 loan types + variants</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Rule engine validation</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Priority direct support</span>
						</li>
					</ul>
				</div>

				<button 
					onclick={handleCTA}
					class="w-full py-3 rounded-xl bg-gradient-to-r from-[#ffcc00] to-[#e6b800] text-[#09090b] text-xs sm:text-sm font-bold hover:from-[#ffd633] hover:to-[#ffcc00] transition-all hover:scale-[1.02] shadow-[0_4px_20px_rgba(255,204,0,0.15)] duration-200"
				>
					Start Free Trial
				</button>
			</div>

			<!-- ENTERPRISE TIER -->
			<div class="pricing-card flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-[#27272a] bg-white dark:bg-[#101014]/60 backdrop-blur-md relative select-none hover:border-[#ffcc00]/30 transition-all duration-300 shadow-md dark:shadow-xl">
				<div>
					<h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Enterprise</h3>
					<p class="text-xs text-gray-500 dark:text-[#a1a1aa] mb-6">Best for Corporate channels and loan broker networks.</p>
					
					<div class="mb-6 font-mono">
						<span class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">₹9,999</span>
						<span class="text-xs text-gray-500 dark:text-[#a1a1aa] font-sans">/mo</span>
					</div>

					<div class="h-[1px] bg-gray-100 dark:bg-[#1f1f23] mb-6"></div>

					<ul class="flex flex-col gap-3.5 text-left mb-8">
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Unlimited active cases</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>All 6 loan types + variants</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Dedicated Relationship Manager</span>
						</li>
						<li class="flex items-center gap-3 text-xs sm:text-sm text-gray-800 dark:text-white font-medium">
							<Check class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
							<span>Custom Lender policy ingestion</span>
						</li>
					</ul>
				</div>

				<button 
					onclick={handleCTA}
					class="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#18181b] dark:hover:bg-[#27272a] text-gray-900 dark:text-white text-xs sm:text-sm font-bold border border-gray-200 dark:border-[#27272a] transition-all hover:scale-[1.02] duration-200"
				>
					Start Free Trial
				</button>
			</div>

		</div>

		<!-- Strategic Non-Compete Trust Pledge Block -->
		<div class="max-w-4xl mx-auto bg-white border border-gray-200 dark:bg-[#101014] dark:border-[#27272a] p-8 rounded-3xl shadow-lg dark:shadow-2xl relative text-left transition-colors">
			<div class="flex flex-col sm:flex-row items-start gap-5">
				<div class="w-12 h-12 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center flex-shrink-0 text-[#ef4444]">
					<ShieldAlert class="w-6 h-6" />
				</div>
				<div class="flex-1">
					<h4 class="text-lg font-bold text-gray-900 dark:text-white tracking-wide mb-2 font-sans">Our Strategic Non-Compete Pledge</h4>
					<p class="text-xs sm:text-sm text-gray-500 dark:text-[#a1a1aa] leading-relaxed mb-4">
						Indian loan fintechs almost always drift into one of two traps: they either sell your leads to third parties (becoming lead-resellers) or originate files directly as a corporate competitor.
					</p>
					<p class="text-xs sm:text-sm text-[#ffcc00] font-semibold leading-relaxed">
						DigitalDSA is Salesforce or AutoCAD for the retail loan industry. We never compete, never resell details, and have no customer-facing interfaces. We are strictly a private, professional workbench.
					</p>
				</div>
			</div>
		</div>

		<!-- Final Bottom Conversion Buttons -->
		<div class="mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center">
			<button 
				onclick={handleCTA}
				class="px-8 py-4 rounded-xl bg-gradient-to-r from-[#ffcc00] to-[#e6b800] text-[#09090b] font-bold text-base hover:from-[#ffd633] hover:to-[#ffcc00] transition-all hover:scale-[1.03] active:scale-[0.98] shadow-[0_0_20px_rgba(255,204,0,0.2)] duration-200"
			>
				Activate {TRIAL_DAYS}-Day Free Trial
			</button>
			<button 
				onclick={handleGuestDemo}
				class="px-8 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#18181b] dark:hover:bg-[#27272a] text-gray-900 dark:text-white font-semibold text-base border border-gray-200 dark:border-[#27272a] transition-all hover:scale-[1.03] active:scale-[0.98] duration-200"
			>
				Explore Guest Demo Mode
			</button>
		</div>

	</div>
</section>
