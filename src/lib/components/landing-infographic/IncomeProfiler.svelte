<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ShieldCheck from 'lucide-svelte/icons/shield-check';
	import Scissors from 'lucide-svelte/icons/scissors';

	let containerRef: HTMLElement | undefined = $state(undefined);

	// 12 Income Sources states
	let incomes = $state({
		salary: { active: true, amount: 150000, haircut: 0, label: '🏢 Salaried Job' },
		rental: { active: true, amount: 40000, haircut: 0.30, label: '🏠 Rental Yield' },
		business: { active: false, amount: 100000, haircut: 0.30, label: '⚙️ Business Prof.' },
		agriculture: { active: false, amount: 60000, haircut: 0.40, label: '🌾 Agriculture' },
		commission: { active: false, amount: 50000, haircut: 0.30, label: '📈 Commission' },
		freelance: { active: false, amount: 40000, haircut: 0.35, label: '💻 Freelance Code' },
		partnership: { active: false, amount: 120000, haircut: 0.30, label: '💼 Partner Share' },
		pension: { active: false, amount: 30000, haircut: 0.15, label: '👵 Pension Fund' },
		professional: { active: false, amount: 80000, haircut: 0.25, label: '🩺 Doctor/CA' },
		fd: { active: false, amount: 20000, haircut: 0.20, label: '🪙 FD Interest' },
		interest: { active: false, amount: 15000, haircut: 0.20, label: '💰 Interest yields' },
		other: { active: false, amount: 10000, haircut: 0.40, label: '🔗 Other source' }
	});

	// Calculated live totals
	let totalGross = $derived(
		Object.values(incomes).reduce((sum, item) => sum + (item.active ? item.amount : 0), 0)
	);

	let totalNet = $derived(
		Object.values(incomes).reduce((sum, item) => sum + (item.active ? Math.round(item.amount * (1 - item.haircut)) : 0), 0)
	);

	let eligibleLoan = $derived(totalNet * 60); // standard multiplier (e.g. 5x annual income = 60x monthly)

	function toggleSource(key: keyof typeof incomes) {
		incomes[key].active = !incomes[key].active;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// GSAP trigger pulse to borrower node
		if (incomes[key].active) {
			gsap.fromTo(
				`.bubble-flow-${key}`,
				{ strokeDashoffset: 40, opacity: 0 },
				{ strokeDashoffset: 0, opacity: 1, duration: 0.5, ease: 'power1.out' }
			);
			gsap.fromTo(
				'.borrower-node',
				{ scale: 0.95 },
				{ scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.3)' }
			);
		}
	}

	onMount(() => {
		if (!containerRef) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const ctx = gsap.context(() => {
			gsap.fromTo(
				'.profiler-header',
				{ opacity: 0, y: 30 },
				{
					opacity: 1,
					y: 0,
					duration: 0.6,
					scrollTrigger: {
						trigger: containerRef,
						start: 'top 80%'
					}
				}
			);
		}, containerRef);

		return () => ctx.revert();
	});
</script>

<section bind:this={containerRef} id="income-profiler" class="relative py-24 bg-[#fcfcfc] dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<div class="absolute bottom-[-10%] left-[10%] w-[500px] h-[300px] bg-radial from-[rgba(6,182,212,0.02)] to-transparent rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Header -->
		<div class="text-center mb-16 profiler-header">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>12-Income Sourcing Engine</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				Aggregate 12 Income Sources Live.
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Real borrowers have highly complex financial files. Toggle any of the 12 income streams below to watch DigitalDSA automatically calculate standard credit haircuts and compute bank-eligible loans.
			</p>
		</div>

		<!-- Main Interactive Profiler Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8 select-none">
			
			<!-- 12 INCOMES GRID (Left - 5 Cols) -->
			<div class="lg:col-span-5 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] p-6 rounded-3xl shadow-md dark:shadow-xl flex flex-col justify-between transition-colors">
				<div>
					<h3 class="text-base font-bold text-gray-900 dark:text-white tracking-wide border-b border-gray-200 dark:border-[#27272a] pb-3 mb-6 select-none font-sans">
						Activate Borrower Streams
					</h3>

					<div class="grid grid-cols-2 gap-3 mb-6">
						{#each Object.keys(incomes) as key}
							<button 
								onclick={() => toggleSource(key as any)}
								class="flex items-center justify-between p-3 rounded-2xl border text-left text-xs font-bold transition-all duration-200 {incomes[key as 'salary'].active ? 'bg-[#ffcc00]/10 border-[#ffcc00] text-gray-900 dark:text-white shadow-sm' : 'bg-gray-50 border-gray-200 dark:bg-[#15151c] dark:border-[#232328] text-gray-500 dark:text-[#71717a]'}"
							>
								<span>{incomes[key as 'salary'].label}</span>
							</button>
						{/each}
					</div>

					<!-- Sliders for ACTIVE sources -->
					<div class="flex flex-col gap-4 border-t border-gray-200 dark:border-[#1f1f23] pt-6">
						<span class="text-[10px] font-mono text-gray-400 dark:text-[#71717a] font-bold uppercase">Stream Valuations</span>
						{#each Object.keys(incomes) as key}
							{#if incomes[key as 'salary'].active}
								<div class="flex flex-col gap-2">
									<div class="flex justify-between items-center text-xs">
										<span class="text-gray-500 dark:text-[#a1a1aa] font-semibold">{incomes[key as 'salary'].label} Gross:</span>
										<span class="font-mono text-gray-900 dark:text-white font-bold">₹{incomes[key as 'salary'].amount.toLocaleString('en-IN')}</span>
									</div>
									<input 
										type="range" 
										min="10000" 
										max="250000" 
										step="5000"
										bind:value={incomes[key as 'salary'].amount}
										class="w-full accent-[#ffcc00] h-1 bg-gray-200 dark:bg-[#1f1f23] rounded-lg appearance-none cursor-pointer"
									/>
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>

			<!-- THE BORROWER CONSOLE GRAPH (Right - 7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[520px] transition-colors">
				
				<!-- Graph Title -->
				<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
					<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">The Credit Slicer Flow</span>
					<span class="text-[10px] text-[#ffcc00] font-mono border border-[#ffcc00]/20 bg-[#ffcc00]/10 px-2 py-0.5 rounded font-bold font-mono">Automatic Haircut Processing</span>
				</div>

				<!-- Visual Incomes Flow Graph (Conveyor layout) -->
				<div class="flex-1 flex flex-col justify-center items-center py-6 relative">
					
					<!-- Top Node: Inflow Sum -->
					<div class="w-full max-w-sm mb-6 bg-gray-50 dark:bg-[#14141a] p-4 rounded-2xl border border-gray-200 dark:border-[#232328] relative text-left">
						<span class="text-xs text-gray-500 dark:text-[#a1a1aa] block mb-1">Raw Monthly Gross Input</span>
						<span class="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white font-mono">₹{totalGross.toLocaleString('en-IN')}</span>
					</div>

					<!-- Central Borrower node with glowing rings -->
					<div class="borrower-node w-36 h-36 rounded-full bg-white dark:bg-[#15151c] border-2 border-[#ffcc00] flex flex-col items-center justify-center relative shadow-lg my-4 transition-colors">
						<div class="absolute inset-0 rounded-full border border-dashed border-[#ffcc00]/30 animate-spin" style="animation-duration: 20s;"></div>
						<div class="text-center font-sans">
							<span class="text-[8px] uppercase tracking-wider text-gray-500 dark:text-[#71717a] font-bold block mb-1">Borrower Profile</span>
							<span class="text-sm font-extrabold text-gray-900 dark:text-white">Active Profile</span>
							<span class="text-[10px] text-[#ffcc00] font-bold font-mono block mt-1">12 Streams</span>
						</div>
					</div>

					<!-- Bottom Node: Net Eligible Credit Income -->
					<div class="w-full max-w-sm mt-6 bg-[#ffcc00]/5 p-4 rounded-2xl border-2 border-[#ffcc00] relative text-left shadow-[0_0_20px_rgba(255,204,0,0.02)]">
						<div class="flex justify-between items-center">
							<div>
								<span class="text-xs text-[#ffcc00] font-bold block mb-1">True Bank-Eligible Credit Income</span>
								<span class="text-xl sm:text-2xl font-extrabold text-[#ffcc00] font-mono">₹{totalNet.toLocaleString('en-IN')}</span>
							</div>
							<div class="text-right">
								<span class="text-[8px] uppercase tracking-widest text-[#10b981] font-bold block mb-0.5">Calculated Loan Max</span>
								<span class="text-sm font-extrabold text-gray-900 dark:text-white font-mono">₹{(eligibleLoan / 100000).toFixed(1)}L</span>
							</div>
						</div>
					</div>

					<!-- Custom margin note overlay -->
					<div class="absolute right-[-10px] bottom-16 select-none hidden xl:block">
						<div class="flex flex-col items-start rotate-3">
							<span class="handwritten text-[10px] text-[#ffcc00] bg-white dark:bg-[#0c0c0f] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-md max-w-[140px] leading-relaxed text-center">
								*Engine applies exact lender haircuts in real-time!
							</span>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-[#ffcc00] rotate-45 ml-4 mt-0.5">
								<path d="M2 2C6 8 12 16 22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<path d="M16 22L22 22L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</div>
					</div>
				</div>

				<div class="mt-6 flex items-start gap-2.5 text-xs text-gray-500 dark:text-[#a1a1aa] leading-relaxed border-t border-gray-200 dark:border-[#232328] pt-4 select-none">
					<ShieldCheck class="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
					<span>Note: Naive software sums gross parameters, leading to direct file rejections from underwriters. DigitalDSA ensures sanction safety before you apply.</span>
				</div>
			</div>

		</div>
	</div>
</section>
