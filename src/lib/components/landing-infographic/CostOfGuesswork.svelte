<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';
	import Calculator from 'lucide-svelte/icons/calculator';

	let containerRef: HTMLElement | undefined = $state(undefined);
	
	// Dynamic CRO inputs
	let ticketSizeLakhs = $state(50); // ₹50 Lakhs average loan size
	let payoutSlab = $state(1.0);     // 1.0% DSA payout commission slab

	// Calculation models
	let ticketSizeRaw = $derived(ticketSizeLakhs * 100000);
	let payoutFraction = $derived(payoutSlab / 100);

	// Without DigitalDSA: 18 approvals, 27 lost files (45 rejected - 18 approved)
	let commissionGuesswork = $derived(18 * ticketSizeRaw * payoutFraction);
	// Lost files: 27 files that could have been approved or recovered
	let commissionLost = $derived(27 * ticketSizeRaw * payoutFraction);

	// With DigitalDSA: 58 approvals, 0 lost files
	let commissionCertainty = $derived(58 * ticketSizeRaw * payoutFraction);
	// Additional earned: 58 approvals - 18 guesswork approvals = 40 extra approvals!
	let commissionAdditional = $derived(40 * ticketSizeRaw * payoutFraction);

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				'.funnel-tier',
				{ scaleX: 0.8, opacity: 0.3 },
				{
					scaleX: 1,
					opacity: 1,
					duration: 0.6,
					stagger: 0.08,
					scrollTrigger: {
						trigger: '.funnels-wrapper',
						start: 'top 80%'
					}
				}
			);
		}, containerRef);

		return () => ctx.revert();
	});
</script>

<section bind:this={containerRef} id="cost-of-guesswork" class="relative py-24 bg-white dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<!-- Spotlights -->
	<div class="absolute top-[20%] right-[-10%] w-[350px] h-[350px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[90px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Section Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>The True Cost Of Guesswork</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				Stop Wasting Sourced Files.
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Every rejected file is lost commission. Adjust the sliders below to calculate exactly how much payout leak DigitalDSA blocks for your firm.
			</p>
		</div>

		<!-- Interactive Dynamic Calculator Panel -->
		<div class="bg-gray-50 dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] p-6 rounded-3xl max-w-3xl mx-auto mb-16 flex flex-col md:flex-row gap-8 items-center transition-colors">
			
			<div class="flex-1 flex flex-col gap-6 w-full text-left">
				<div class="flex items-center gap-2 border-b border-gray-200 dark:border-[#1f1f24] pb-3 mb-2 select-none">
					<Calculator class="w-4.5 h-4.5 text-[#ffcc00]" />
					<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">Commission Calculator</span>
				</div>

				<!-- Input 1: Ticket Size -->
				<div class="flex flex-col gap-2">
					<div class="flex justify-between items-center text-xs">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Average Case Ticket Size:</span>
						<span class="text-sm font-mono text-gray-900 dark:text-white font-extrabold">₹{ticketSizeLakhs} LAKHS</span>
					</div>
					<input 
						type="range" 
						min="10" 
						max="300" 
						step="5"
						bind:value={ticketSizeLakhs}
						class="w-full accent-[#ffcc00] h-1 bg-gray-200 dark:bg-[#1f1f23] rounded-lg appearance-none cursor-pointer"
					/>
				</div>

				<!-- Input 2: Payout Commission -->
				<div class="flex flex-col gap-2">
					<div class="flex justify-between items-center text-xs">
						<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">DSA Payout Commission Slab:</span>
						<span class="text-sm font-mono text-[#ffcc00] font-extrabold">{payoutSlab}%</span>
					</div>
					<input 
						type="range" 
						min="0.3" 
						max="2.0" 
						step="0.05"
						bind:value={payoutSlab}
						class="w-full accent-[#ffcc00] h-1 bg-gray-200 dark:bg-[#1f1f23] rounded-lg appearance-none cursor-pointer"
					/>
				</div>
			</div>

			<!-- Dynamic Calculated Payout results -->
			<div class="w-full md:w-72 bg-white dark:bg-[#050505] p-5 rounded-2xl border border-gray-200 dark:border-[#1f1f24] flex flex-col gap-4 text-left shadow-lg">
				<div class="select-none">
					<span class="text-[9px] uppercase tracking-widest text-[#ef4444] font-bold block mb-1">Commission Lost (Guesswork)</span>
					<span class="text-xl sm:text-2xl font-extrabold text-[#ef4444] font-mono">₹{commissionLost.toLocaleString('en-IN')}</span>
				</div>
				
				<div class="h-[1px] bg-gray-100 dark:bg-[#1f1f24] my-1"></div>

				<div class="select-none relative">
					<span class="text-[9px] uppercase tracking-widest text-[#10b981] font-bold block mb-1">Additional Earned (DigitalDSA)</span>
					<span class="text-xl sm:text-2xl font-extrabold text-[#10b981] font-mono">₹{commissionAdditional.toLocaleString('en-IN')}</span>
					<!-- Handwriting callout overlay -->
					<span class="handwritten text-[9px] text-[#ffcc00] absolute right-[-5px] bottom-[-22px] rotate-[-5deg] bg-white dark:bg-[#0c0c0f] px-2 py-0.5 rounded border border-[#27272a] shadow hidden xl:inline select-none">
						*40 extra cases approved!
					</span>
				</div>
			</div>
		</div>

		<!-- Funnel Visual Comparison Grid -->
		<div class="funnels-wrapper grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto items-stretch select-none">
			
			<!-- THE GUESSWORK FUNNEL (Red) -->
			<div class="flex flex-col gap-4 bg-white dark:bg-[#0D0D0D] border border-red-200/50 dark:border-[#ef4444]/15 rounded-3xl p-6 shadow-sm relative">
				<div class="flex justify-between items-center border-b border-gray-100 dark:border-[#1f1f24] pb-4 mb-4 select-none">
					<span class="text-xs font-bold uppercase tracking-wider text-red-500 font-mono flex items-center gap-1.5">
						<ShieldAlert class="w-4 h-4" />
						<span>Traditional Guesswork</span>
					</span>
					<span class="text-[9px] font-mono text-[#ef4444] bg-[#ef4444]/15 border border-[#ef4444]/25 px-2 py-0.5 rounded font-bold">18% APPROVAL RATIO</span>
				</div>

				<!-- Funnel Layer 1 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-red-50/10 border border-red-200/20 text-xs">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">100 Borrower Leads Sourced</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">100 Leads</span>
				</div>

				<!-- Funnel Layer 2 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-red-50/10 border border-red-200/20 text-xs w-[90%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Submitted to Lenders (30% dropped)</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">70 Filed</span>
				</div>

				<!-- Funnel Layer 3 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-red-50/10 border border-red-200/20 text-xs w-[80%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Rejected on Policy Mismatches</span>
					<span class="font-mono text-[#ef4444] font-bold">45 Rejected</span>
				</div>

				<!-- Funnel Layer 4 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-red-50/10 border border-red-200/20 text-xs w-[70%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Bank Sanctions Approved</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">18 Approved</span>
				</div>
			</div>

			<!-- THE DIGITAL DSA FUNNEL (Green/Gold) -->
			<div class="flex flex-col gap-4 bg-white dark:bg-[#0D0D0D] border border-green-200/50 dark:border-[#ffcc00]/15 rounded-3xl p-6 shadow-sm relative">
				<div class="flex justify-between items-center border-b border-gray-100 dark:border-[#1f1f24] pb-4 mb-4 select-none">
					<span class="text-xs font-bold uppercase tracking-wider text-green-500 font-mono flex items-center gap-1.5">
						<Sparkles class="w-4 h-4 text-[#ffcc00]" />
						<span class="text-[#10b981] font-bold">DigitalDSA Certainty</span>
					</span>
					<span class="text-[9px] font-mono text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/25 px-2 py-0.5 rounded font-bold animate-pulse">58% APPROVAL RATIO</span>
				</div>

				<!-- Funnel Layer 1 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-[#ffcc00]/5 border border-[#ffcc00]/15 text-xs">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">100 Borrower Leads Sourced</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">100 Leads</span>
				</div>

				<!-- Funnel Layer 2 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-[#ffcc00]/5 border border-[#ffcc00]/15 text-xs w-[95%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Intelligently Qualified in Cockpit</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">90 Qualified</span>
				</div>

				<!-- Funnel Layer 3 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-[#ffcc00]/5 border border-[#ffcc00]/15 text-xs w-[90%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">Submitted to Lenders (Optimized)</span>
					<span class="font-mono text-gray-900 dark:text-white font-bold">72 Filed</span>
				</div>

				<!-- Funnel Layer 4 -->
				<div class="funnel-tier flex items-center justify-between p-3.5 rounded-xl bg-[#ffcc00]/5 border border-[#ffcc00]/15 text-xs w-[85%] mx-auto">
					<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold font-bold text-[#ffcc00]">Bank Sanctions Approved</span>
					<span class="font-mono text-[#ffcc00] font-extrabold text-sm sm:text-base">58 Approved</span>
				</div>
			</div>

		</div>
	</div>
</section>
