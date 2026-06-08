<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Database from 'lucide-svelte/icons/database';
	import Megaphone from 'lucide-svelte/icons/megaphone';

	let containerRef: HTMLElement | undefined = $state(undefined);
	let flowState = $state<'idle' | 'case' | 'rate'>('idle');

	function triggerFlow(type: 'case' | 'rate') {
		flowState = type;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// GSAP pulse particles across nodes
		const duration = 1.2;
		gsap.timeline()
			.fromTo('.flow-particle', { strokeDashoffset: 100, opacity: 0.1 }, { strokeDashoffset: 0, opacity: 1, duration, ease: 'none', stagger: 0.1 })
			.to('.glow-node', { scale: 1.15, filter: 'drop-shadow(0 0 12px #ffcc00)', duration: 0.3, yoyo: true, repeat: 1, stagger: 0.08 }, '-=0.8')
			.call(() => { flowState = 'idle'; }, [], `+=${duration}`);
	}

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// Continuous gentle organic floating for network nodes
		gsap.to('.network-floating-node', {
			x: '+=10',
			y: '-=10',
			duration: 4,
			ease: 'sine.inOut',
			yoyo: true,
			repeat: -1,
			stagger: 0.15
		});
	});
</script>

<section bind:this={containerRef} id="rm-ecosystem" class="relative py-24 bg-[#fcfcfc] dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<div class="absolute bottom-[-10%] left-[10%] w-[500px] h-[300px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Direct banker relationship networks</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				The RM & Lender Network Moat
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Real DSA success is built on access. Watch how DigitalDSA aggregates thousands of relationship managers, partner codes, bank underwriters, and active pipelines into one living cooperative web.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center select-none">
			
			<!-- LEFT CONTENT CONTROL (5 Cols) -->
			<div class="lg:col-span-5 flex flex-col gap-6 text-left">
				<h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
					A Living, Growing <span class="text-[#ffcc00]">Ecosystem</span>.
				</h3>

				<p class="text-gray-500 dark:text-[#a1a1aa] text-sm sm:text-base leading-relaxed">
					Instead of manual single-bank relationships, DigitalDSA connects you to a crowdsourced grid of verified bank partners. Policies and RM contacts update instantly when variables change.
				</p>

				<!-- Interactive action buttons -->
				<div class="flex flex-wrap gap-3 mt-2">
					<button 
						onclick={() => triggerFlow('case')}
						class="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border transition-all duration-200 {flowState === 'case' ? 'bg-[#ffcc00] text-[#09090b] border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.15)]' : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-[#15151c] dark:text-[#a1a1aa] dark:border-[#232328] dark:hover:border-[#27272a]'}"
					>
						<Database class="w-4 h-4" />
						<span>Ingest Case Flow</span>
					</button>

					<button 
						onclick={() => triggerFlow('rate')}
						class="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border transition-all duration-200 {flowState === 'rate' ? 'bg-[#ffcc00] text-[#09090b] border-[#ffcc00] shadow-[0_0_20px_rgba(255,204,0,0.15)]' : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-[#15151c] dark:text-[#a1a1aa] dark:border-[#232328] dark:hover:border-[#27272a]'}"
					>
						<Megaphone class="w-4 h-4" />
						<span>Broadcast Bank Rates</span>
					</button>
				</div>
			</div>

			<!-- RIGHT ECOSYSTEM RADAR NETWORK GRAPH (7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[460px] transition-colors">
				
				<!-- Graph Title -->
				<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
					<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">Ecosystem live web network</span>
					<span class="text-[10px] text-[#22d3ee] font-mono border border-[#0891b2]/30 bg-[#164e63]/20 px-2 py-0.5 rounded font-bold font-mono">Web Active</span>
				</div>

				<!-- Beautiful SVG Complex Node Web -->
				<div class="flex-1 flex flex-col justify-center items-center py-6 relative">
					<!-- SVG connection grid with glowing particles -->
					<svg class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
						<!-- Connection line paths -->
						<line x1="20%" y1="30%" x2="50%" y2="50%" class="grid-conn-line" stroke-width="1.5" />
						<line x1="80%" y1="30%" x2="50%" y2="50%" class="grid-conn-line" stroke-width="1.5" />
						<line x1="30%" y1="75%" x2="50%" y2="50%" class="grid-conn-line" stroke-width="1.5" />
						<line x1="70%" y1="75%" x2="50%" y2="50%" class="grid-conn-line" stroke-width="1.5" />
						<line x1="20%" y1="30%" x2="30%" y2="75%" class="grid-conn-line" stroke-dasharray="4 4" stroke-width="1" />
						<line x1="80%" y1="30%" x2="70%" y2="75%" class="grid-conn-line" stroke-dasharray="4 4" stroke-width="1" />

						<!-- Inflow/Outflow flowing particles -->
						{#if flowState === 'case'}
							<line x1="30%" y1="75%" x2="50%" y2="50%" stroke="#ffcc00" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
							<line x1="50%" y1="50%" x2="20%" y2="30%" stroke="#ffcc00" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
							<line x1="50%" y1="50%" x2="80%" y2="30%" stroke="#ffcc00" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
						{:else if flowState === 'rate'}
							<line x1="20%" y1="30%" x2="50%" y2="50%" stroke="#00E5FF" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
							<line x1="80%" y1="30%" x2="50%" y2="50%" stroke="#00E5FF" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
							<line x1="50%" y1="50%" x2="70%" y2="75%" stroke="#00E5FF" stroke-width="2.5" stroke-dasharray="10 5" class="flow-particle" />
						{/if}
					</svg>

					<!-- Floating nodes -->
					<!-- Node 1: HDFC Bank (Top Left) -->
					<div class="network-floating-node absolute top-[15%] left-[10%] z-10">
						<div class="glow-node flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 dark:bg-[#15151c] dark:border-[#232328] w-24 text-center transition-all">
							<span class="text-[8px] font-mono text-gray-400 dark:text-[#71717a] font-bold">LENDER</span>
							<span class="text-[10px] font-bold text-gray-900 dark:text-white">HDFC Bank</span>
						</div>
					</div>

					<!-- Node 2: SBI Bank (Top Right) -->
					<div class="network-floating-node absolute top-[15%] right-[10%] z-10">
						<div class="glow-node flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 dark:bg-[#15151c] dark:border-[#232328] w-24 text-center transition-all">
							<span class="text-[8px] font-mono text-gray-400 dark:text-[#71717a] font-bold">LENDER</span>
							<span class="text-[10px] font-bold text-gray-900 dark:text-white">SBI Lenders</span>
						</div>
					</div>

					<!-- Central Node: Policy PMS Engine Gateway -->
					<div class="p-4 rounded-full bg-gray-100 dark:bg-[#1c1c24] border border-gray-200 dark:border-[#27272a] shadow-lg relative z-20 w-36 h-36 flex flex-col items-center justify-center text-center">
						<span class="text-[8px] uppercase tracking-wider text-[#ffcc00] font-mono font-bold block mb-1">Ecosystem core</span>
						<span class="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">DigitalDSA PMS Engine</span>
					</div>

					<!-- Node 3: Your Cockpit (Bottom Left) -->
					<div class="network-floating-node absolute bottom-[15%] left-[15%] z-10">
						<div class="glow-node flex flex-col items-center gap-1 p-2.5 rounded-xl bg-[#ffcc00]/5 border border-[#ffcc00]/30 w-28 text-center transition-all shadow-sm">
							<span class="text-[8px] font-mono text-[#ffcc00] font-bold">YOUR COCKPIT</span>
							<span class="text-[10px] font-bold text-gray-900 dark:text-white font-sans">Active DSA</span>
						</div>
					</div>

					<!-- Node 4: Another Partner DSA (Bottom Right) -->
					<div class="network-floating-node absolute bottom-[15%] right-[15%] z-10">
						<div class="glow-node flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 dark:bg-[#15151c] dark:border-[#232328] w-28 text-center transition-all">
							<span class="text-[8px] font-mono text-gray-400 dark:text-[#71717a] font-bold">PARTNER DSA</span>
							<span class="text-[10px] font-bold text-gray-900 dark:text-white">Corporate DSA</span>
						</div>
					</div>

					<!-- Handwritten annotations overlay for human created look -->
					<div class="absolute bottom-4 right-[-10px] z-30 select-none hidden xl:block">
						<div class="flex flex-col items-start rotate-3">
							<span class="handwritten text-[10px] text-[#ffcc00] max-w-[130px] leading-relaxed bg-white dark:bg-[#050505] p-2 rounded border border-gray-200 dark:border-[#27272a] shadow-md">
								*Thousands of nodes updating live collectively!
							</span>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#ffcc00] rotate-45 ml-4">
								<path d="M2 2C6 8 12 16 22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<path d="M16 22L22 22L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</div>
					</div>
				</div>

				<!-- Live simulation details text -->
				<div class="text-[10px] text-gray-400 dark:text-[#71717a] leading-relaxed text-center font-mono mt-4">
					{#if flowState === 'case'}
						<span class="text-[#ffcc00] font-bold bg-[#ffcc00]/10 px-2 py-0.5 rounded border border-[#ffcc00]/20 animate-pulse">*Ingestion Active: Borrower profile parameters matching all active RMs instantly.</span>
					{:else if flowState === 'rate'}
						<span class="text-[#ffcc00] font-bold bg-[#ffcc00]/10 px-2 py-0.5 rounded border border-[#ffcc00]/20 animate-pulse">*Broadcast Active: New SBI composite NA waiver parameters pushed directly to your cockpit.</span>
					{:else}
						<span>*Click "Ingest Case Flow" or "Broadcast Bank Rates" on the left to see information flow through the network.</span>
					{/if}
				</div>

			</div>

		</div>
	</div>
</section>

<style>
	.grid-conn-line {
		stroke: #e5e7eb;
	}
	:global(.dark) .grid-conn-line {
		stroke: #232328;
	}
</style>
