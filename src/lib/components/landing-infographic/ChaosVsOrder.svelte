<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';
	import Cpu from 'lucide-svelte/icons/cpu';

	let containerRef: HTMLElement | undefined = $state(undefined);
	let activeTab = $state<'chaos' | 'order'>('order');

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = gsap.context(() => {
			gsap.to('.sticky-note', {
				y: '+=6',
				x: '-=3',
				rotation: '+=1',
				duration: 3,
				ease: 'sine.inOut',
				yoyo: true,
				repeat: -1,
				stagger: 0.2
			});

			gsap.to('.glow-flow-line', {
				strokeDashoffset: -40,
				duration: 2,
				ease: 'none',
				repeat: -1
			});
		}, containerRef);

		return () => ctx.revert();
	});

	function selectMode(mode: 'chaos' | 'order') {
		activeTab = mode;
	}
</script>

<section bind:this={containerRef} id="chaos-vs-order" class="relative py-24 bg-white dark:bg-[#0c0c0f] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<!-- Background grid -->
	<div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_0.8px,transparent_0.8px)] dark:bg-[radial-gradient(#1f1f23_0.8px,transparent_0.8px)] [background-size:20px_20px] opacity-35 dark:opacity-10 pointer-events-none" aria-hidden="true"></div>
	<div class="absolute top-[20%] left-[-10%] w-[350px] h-[350px] bg-radial from-[rgba(239,68,68,0.02)] to-transparent rounded-full blur-[90px] pointer-events-none" aria-hidden="true"></div>
	<div class="absolute bottom-[20%] right-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(255,204,0,0.03)] to-transparent rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10 text-center">
		<!-- Section Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Engineered for clarity, not chaos</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				The Crumpled Desk vs. <span class="bg-gradient-to-r from-[#ffcc00] to-[#ffd633] bg-clip-text text-transparent">The Digital Cockpit</span>
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Real DSAs don't need generic bullet lists. They need to escape the daily paperwork storm. Here is exactly what we replace.
			</p>
		</div>

		<!-- Mobile/Tablet Toggle Buttons -->
		<div class="flex md:hidden justify-center gap-2 mb-8 bg-gray-100 dark:bg-[#15151b] p-1.5 rounded-xl border border-gray-200 dark:border-[#27272a] max-w-xs mx-auto">
			<button 
				onclick={() => selectMode('chaos')}
				class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 {activeTab === 'chaos' ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30' : 'text-gray-500 dark:text-[#71717a]'}"
			>
				The Chaos
			</button>
			<button 
				onclick={() => selectMode('order')}
				class="flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 {activeTab === 'order' ? 'bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/30' : 'text-gray-500 dark:text-[#71717a]'}"
			>
				The Order
			</button>
		</div>

		<!-- Main Split Comparison Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
			
			<!-- THE MESSY DESK (Left - 5 Cols) -->
			<div class="lg:col-span-5 bg-red-50/20 dark:bg-[#120f0f]/45 border border-red-200 dark:border-[#ef4444]/15 rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden min-h-[500px]">
				
				<!-- Header label -->
				<div class="flex items-center gap-3 border-b border-gray-200 dark:border-[#27272a]/60 pb-4 mb-6">
					<div class="w-7 h-7 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center text-[#ef4444]">
						<Trash2 class="w-4 h-4" />
					</div>
					<span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#a1a1aa] font-mono">Yesterday's Scattered Desk</span>
				</div>

				<!-- Messy Desk Layout (Overlapping visual handwritten notes) -->
				<div class="flex-1 flex flex-col gap-6 relative py-4">
					<!-- Sticky Note 1 (Yellow) -->
					<div class="sticky-note bg-[#fef08a] border border-[#facc15] shadow-lg text-[#854d0e] p-4 rounded-lg w-full max-w-[280px] -rotate-[2deg] relative z-10 transition-transform hover:scale-105 duration-200">
						<span class="handwritten text-xs font-bold block mb-1">⚠️ Urgent RM search!</span>
						<p class="handwritten text-xs leading-relaxed text-left">HDFC RM just left the bank! Who is our Pune contact now? Case is completely blocked!</p>
					</div>

					<!-- Sticky Note 2 (Pink) -->
					<div class="sticky-note bg-[#fbcfe8] border border-[#f472b6] shadow-lg text-[#9d174d] p-4 rounded-lg w-full max-w-[280px] rotate-[3deg] self-end -mt-2 relative z-20 transition-transform hover:scale-105 duration-200">
						<span class="handwritten text-xs font-bold block mb-1">📝 Missing Papers</span>
						<p class="handwritten text-xs leading-relaxed text-left">Rental ITR paper missing. Did client send it on WhatsApp or email? Search downloads...</p>
					</div>

					<!-- Sticky Note 3 (Blue) -->
					<div class="sticky-note bg-[#bfdbfe] border border-[#60a5fa] shadow-lg text-[#1e40af] p-4 rounded-lg w-full max-w-[260px] -rotate-[1deg] -mt-2 relative z-10 transition-transform hover:scale-105 duration-200">
						<span class="handwritten text-xs font-bold block mb-1">💻 Portal entry...</span>
						<p class="handwritten text-xs leading-relaxed text-left">ICICI portal failed again. Re-entering exact same data in Axis portal now. Double work.</p>
					</div>
				</div>

				<!-- Visual Annotation pointer -->
				<div class="mt-6 flex items-start gap-2.5 text-xs text-[#ef4444] italic leading-relaxed border-t border-gray-200 dark:border-[#232328] pt-4 select-none">
					<ShieldAlert class="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
					<span class="handwritten">This is "free" but wastes 15 hours a week in operational friction.</span>
				</div>
			</div>

			<!-- THE PRISTINE COCKPIT (Right - 7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#101014] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[500px] transition-colors">
				
				<!-- Header label -->
				<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
					<div class="flex items-center gap-3">
						<div class="w-7 h-7 rounded-lg bg-[#ffcc00]/10 border border-[#ffcc00]/20 flex items-center justify-center text-[#ffcc00]">
							<Cpu class="w-4 h-4" />
						</div>
						<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">The Integrated Cockpit</span>
					</div>
					<span class="text-[10px] text-[#22d3ee] font-mono border border-[#0891b2]/30 bg-[#164e63]/20 px-2 py-0.5 rounded font-bold">1 Form = 50+ Banks</span>
				</div>

				<!-- Visual Connected Network Graph -->
				<div class="flex-1 flex flex-col justify-center items-center py-6 relative">
					<div class="w-full max-w-lg bg-gray-50 dark:bg-[#14141a] border border-gray-200 dark:border-[#232328] p-5 rounded-2xl flex flex-col gap-4 relative">
						
						<!-- Step 1: Input -->
						<div class="flex items-center gap-4 bg-white dark:bg-[#1b1b24] p-3 rounded-xl border border-gray-200 dark:border-[#2d2d3a] relative shadow-sm">
							<div class="w-6 h-6 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] flex items-center justify-center font-bold text-xs select-none">1</div>
							<div class="text-left text-xs">
								<span class="text-gray-900 dark:text-white font-bold block">One Smart Wizard Form</span>
								<span class="text-gray-500 dark:text-[#a1a1aa]">Type borrower income & geo variables once.</span>
							</div>
							<span class="text-[10px] text-[#10b981] font-mono ml-auto">Vetted V1</span>
						</div>

						<!-- Connection pointer -->
						<div class="flex justify-center my-0.5">
							<svg width="2" height="24" viewBox="0 0 2 24" fill="none" class="opacity-45">
								<line x1="1" y1="0" x2="1" y2="24" stroke="#ffcc00" stroke-width="2" stroke-dasharray="4 4" />
							</svg>
						</div>

						<!-- Step 2: Engine Match -->
						<div class="flex items-center gap-4 bg-white dark:bg-[#1b1b24] p-3 rounded-xl border border-gray-200 dark:border-[#2d2d3a] relative shadow-sm">
							<div class="w-6 h-6 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] flex items-center justify-center font-bold text-xs select-none">2</div>
							<div class="text-left text-xs">
								<span class="text-gray-900 dark:text-white font-bold block">Centralized Policy Engine Match</span>
								<span class="text-gray-500 dark:text-[#a1a1aa]">50+ policies resolved instantly with city specificity.</span>
							</div>
							<span class="text-[10px] text-[#ffcc00] font-mono ml-auto">Matched</span>
						</div>

						<!-- Connection pointer -->
						<div class="flex justify-center my-0.5">
							<svg width="2" height="24" viewBox="0 0 2 24" fill="none" class="opacity-45">
								<line x1="1" y1="0" x2="1" y2="24" stroke="#ffcc00" stroke-width="2" stroke-dasharray="4 4" />
							</svg>
						</div>

						<!-- Step 3: Global Directory -->
						<div class="flex items-center gap-4 bg-white dark:bg-[#1b1b24] p-3 rounded-xl border border-gray-200 dark:border-[#2d2d3a] relative shadow-sm">
							<div class="w-6 h-6 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] flex items-center justify-center font-bold text-xs select-none">3</div>
							<div class="text-left text-xs">
								<span class="text-gray-900 dark:text-white font-bold block">Verified Global RM Connection</span>
								<span class="text-gray-500 dark:text-[#a1a1aa]">Shared rated RM network updates automatically.</span>
							</div>
							<span class="text-[10px] text-[#22d3ee] font-mono ml-auto">Connected</span>
						</div>
					</div>
				</div>

				<!-- Handwriting callout -->
				<div class="absolute bottom-8 right-8 z-30 select-none hidden md:block">
					<div class="flex flex-col items-center">
						<span class="handwritten text-xs text-[#ffcc00] tracking-wide max-w-[140px] text-center mb-1 leading-relaxed bg-white dark:bg-[#0c0c0f] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-md">Direct shortcuts to matched RMs!</span>
						<svg width="34" height="28" viewBox="0 0 34 28" fill="none" class="text-[#ffcc00] -rotate-12">
							<path d="M2 2C8 10 18 20 32 25" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							<path d="M26 26L32 25L30 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
					</div>
				</div>

				<div class="mt-6 flex items-start gap-2.5 text-xs text-gray-400 dark:text-[#a1a1aa] leading-relaxed border-t border-gray-200 dark:border-[#232328] pt-4 select-none">
					<span>Instead of running around collecting papers and managing rate sheets, you operate from a unified, secure fintech terminal.</span>
				</div>
			</div>

		</div>
	</div>
</section>
