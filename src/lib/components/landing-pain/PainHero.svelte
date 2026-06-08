<script lang="ts">
	import { onMount } from 'svelte';
	import { landingNav } from '$lib/state/landingNavigation.svelte';

	let heroVisible = $state(false);
	let calculatorTab = $state<'calculator' | 'breakdown'>('calculator');

	// Interactive Loss Calculator States
	let monthlyCases = $state(20); // 5 to 100
	let ticketSize = $state(50); // ₹10L to ₹5Cr (in Lakhs)

	// Calculations
	const failureRate = 0.82; // 82% attrition rate
	const averageCommissionRate = 0.01; // 1% average DSA commission

	const ticketSizeInRupees = $derived(ticketSize * 100000);
	const monthlyVolume = $derived(monthlyCases * ticketSizeInRupees);
	const annualVolume = $derived(monthlyVolume * 12);

	const lostCasesPerYear = $derived(Math.round(monthlyCases * 12 * failureRate));
	const annualCommissionLeakage = $derived(annualVolume * failureRate * averageCommissionRate);
	
	// If DigitalDSA increases sanction rate from 18% to 90% (recovering 72% of total cases)
	const recoverableCommission = $derived(annualVolume * 0.72 * averageCommissionRate);

	// Breakdown of leakage by root cause
	const WRONG_BANK_LEAK = $derived(annualCommissionLeakage * 0.31);
	const INCOME_MISCALC_LEAK = $derived(annualCommissionLeakage * 0.27);
	const LOCAL_POLICY_LEAK = $derived(annualCommissionLeakage * 0.23);
	const RM_GHOSTING_LEAK = $derived(annualCommissionLeakage * 0.19);

	function formatINR(num: number): string {
		if (num >= 10000000) {
			return '₹' + (num / 10000000).toFixed(2) + ' Cr';
		} else if (num >= 100000) {
			return '₹' + (num / 100000).toFixed(2) + ' Lakh';
		} else {
			return '₹' + Math.round(num).toLocaleString('en-IN');
		}
	}

	function handleCTA() {
		landingNav.handleCTA();
	}
	function handleDemo() {
		window.location.href = '/test-dashboard';
	}

	onMount(() => {
		setTimeout(() => (heroVisible = true), 80);
	});
</script>

<section id="hero" class="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#F8F7F2] dark:bg-[#0C0C09] px-4 sm:px-8 lg:px-16 pt-28 pb-20 transition-colors duration-300">

	<!-- Subtle dot grid -->
	<div class="absolute inset-0 bg-[radial-gradient(#C8C4B0_1px,transparent_1px)] dark:bg-[radial-gradient(#222218_1px,transparent_1px)] [background-size:32px_32px] opacity-40 pointer-events-none" aria-hidden="true"></div>

	<!-- Top ambient spotlight glow -->
	<div class="absolute top-0 right-0 w-[600px] h-[400px] bg-gradient-to-bl from-amber-100/30 dark:from-amber-950/10 to-transparent pointer-events-none"></div>

	<div class="relative z-10 w-full max-w-6xl mx-auto">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

			<!-- LEFT: B2B Headline & Business Pain Context (7 Columns) -->
			<div class="lg:col-span-7 transition-all duration-700 {heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}">

				<!-- Category badge -->
				<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-[#141410] text-xs font-semibold text-amber-700 dark:text-amber-500 mb-7 select-none shadow-sm">
					<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
					B2B Operating System for Loan DSAs
				</div>

				<!-- Premium, high-impact headline focused on cash loss -->
				<h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-[1.05] tracking-tight mb-6">
					How much <span class="text-red-500 dark:text-red-400">commission</span><br/>
					did your agency<br/>
					lose last month?
				</h1>

				<p class="text-base sm:text-lg text-gray-500 dark:text-[#7a7a60] leading-relaxed mb-8 max-w-xl">
					Every rejected loan file, every slashed credit sanction, and every ignored RM phone call carries a direct cash penalty. If you are managing your agency on manual rate sheets and blind submissions, you are letting up to 82% of your hard-earned payouts leak away.
				</p>

				<!-- CTA Row -->
				<div class="flex flex-col sm:flex-row gap-3 max-w-md">
					<button
						onclick={handleCTA}
						class="group px-7 py-3.5 rounded-xl bg-[#1A1A14] dark:bg-white text-white dark:text-[#0C0C09] font-bold text-sm hover:bg-[#2a2a1e] dark:hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-black/10"
					>
						Recover Your Commission
						<svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
					</button>
					<button
						onclick={handleDemo}
						class="px-7 py-3.5 rounded-xl border border-gray-200 dark:border-[#2a2a1e] bg-white dark:bg-[#141410] text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-gray-300 dark:hover:border-[#3a3a28] transition-all duration-200 hover:scale-[1.02]"
					>
						See live demo
					</button>
				</div>

				<!-- Micro-copy -->
				<p class="text-xs text-gray-400 dark:text-[#4a4a38] mt-5">
					Active in 25 major cities · No credit card required · Flat subscription billing
				</p>
			</div>

			<!-- RIGHT: Interactive Case Loss Calculator (5 Columns) -->
			<div class="lg:col-span-5 transition-all duration-700 delay-200 {heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}">

				<div class="bg-white dark:bg-[#111109] border border-gray-200 dark:border-[#222218] rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
					
					<!-- Spotlight background element inside card -->
					<div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none"></div>

					<!-- Segment Control Tabs -->
					<div class="flex bg-gray-100 dark:bg-[#1a1a12] p-1 rounded-xl mb-6 border border-gray-200/50 dark:border-[#26261b]">
						<button
							onclick={() => calculatorTab = 'calculator'}
							class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {calculatorTab === 'calculator' ? 'bg-white dark:bg-[#2c2c20] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-[#5a5a40] hover:text-gray-600 dark:hover:text-gray-200'}"
						>
							Commission Leakage Calculator
						</button>
						<button
							onclick={() => calculatorTab = 'breakdown'}
							class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {calculatorTab === 'breakdown' ? 'bg-white dark:bg-[#2c2c20] text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-[#5a5a40] hover:text-gray-600 dark:hover:text-gray-200'}"
						>
							Loss Breakdown
						</button>
					</div>

					{#if calculatorTab === 'calculator'}
						<div>
							<h3 class="text-xs font-bold text-gray-400 dark:text-[#6a6a50] mb-5 uppercase tracking-wider">Calculate Your Hidden Losses</h3>

							<!-- Slider 1: Monthly Cases Sourced -->
							<div class="mb-5">
								<div class="flex justify-between items-center mb-2">
									<label for="monthly-cases-range" class="text-xs font-medium text-gray-500 dark:text-[#6a6a50]">Monthly Cases Sourced</label>
									<span class="text-sm font-bold font-mono text-amber-600 dark:text-amber-500">{monthlyCases} cases</span>
								</div>
								<input
									id="monthly-cases-range"
									type="range"
									min="5"
									max="100"
									step="5"
									bind:value={monthlyCases}
									class="w-full h-1.5 bg-gray-200 dark:bg-[#1e1e14] rounded-lg appearance-none cursor-pointer accent-amber-500 dark:accent-amber-400"
								/>
								<div class="flex justify-between text-[10px] text-gray-400 dark:text-[#4a4a35] mt-1 font-mono">
									<span>5</span>
									<span>50</span>
									<span>100</span>
								</div>
							</div>

							<!-- Slider 2: Average Case Size -->
							<div class="mb-6">
								<div class="flex justify-between items-center mb-2">
									<label for="ticket-size-range" class="text-xs font-medium text-gray-500 dark:text-[#6a6a50]">Average Case Size</label>
									<span class="text-sm font-bold font-mono text-amber-600 dark:text-amber-500">{formatINR(ticketSizeInRupees)}</span>
								</div>
								<input
									id="ticket-size-range"
									type="range"
									min="10"
									max="500"
									step="10"
									bind:value={ticketSize}
									class="w-full h-1.5 bg-gray-200 dark:bg-[#1e1e14] rounded-lg appearance-none cursor-pointer accent-amber-500 dark:accent-amber-400"
								/>
								<div class="flex justify-between text-[10px] text-gray-400 dark:text-[#4a4a35] mt-1 font-mono">
									<span>₹10 Lakh</span>
									<span>₹2.5 Cr</span>
									<span>₹5.0 Cr</span>
								</div>
							</div>

							<!-- Dynamic Outputs -->
							<div class="space-y-3 bg-[#F8F7F2] dark:bg-[#16160e] border border-gray-100 dark:border-[#1e1e14] rounded-2xl p-4">
								<div class="flex justify-between items-center text-xs">
									<span class="text-gray-400 dark:text-[#5a5a40] font-medium">Your Annual Lost Payouts (82% lost)</span>
									<span class="font-bold font-mono text-red-500 dark:text-red-400">{formatINR(annualCommissionLeakage)} / yr</span>
								</div>
								<div class="border-t border-dashed border-gray-200 dark:border-[#26261b] my-2"></div>
								<div class="flex justify-between items-center">
									<div>
										<span class="text-xs font-bold text-gray-800 dark:text-gray-200">Recoverable Payouts</span>
										<p class="text-[9px] text-gray-400 dark:text-[#5a5a40] mt-0.5">By sealing policy leaks & tracking RMs</p>
									</div>
									<span class="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{formatINR(recoverableCommission)} / yr</span>
								</div>
							</div>

							<div class="mt-5 text-[10px] text-center text-gray-400 dark:text-[#5a5a40]">
								* Industry-wide statistic shows 82% case attrition rate across retail loans.
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<h3 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Your Daily Revenue Leaks</h3>
							<p class="text-xs text-gray-400 dark:text-[#5a5a40] mb-4">Calculated based on your annual commission loss of <span class="font-bold text-red-500">{formatINR(annualCommissionLeakage)}</span>.</p>

							<!-- Wrong Bank Selection (31%) -->
							<div>
								<div class="flex justify-between text-xs mb-1">
									<span class="font-medium text-gray-700 dark:text-gray-300">🏦 Wrong Bank Submissions (31%)</span>
									<span class="font-semibold font-mono text-red-400">{formatINR(WRONG_BANK_LEAK)}</span>
								</div>
								<div class="w-full h-2 bg-gray-100 dark:bg-[#1a1a12] rounded-full overflow-hidden">
									<div class="h-full bg-amber-400 rounded-full" style="width: 31%"></div>
								</div>
							</div>

							<!-- Income Haircuts (27%) -->
							<div>
								<div class="flex justify-between text-xs mb-1">
									<span class="font-medium text-gray-700 dark:text-gray-300">🧮 Borrower Eligibility Shock (27%)</span>
									<span class="font-semibold font-mono text-red-400">{formatINR(INCOME_MISCALC_LEAK)}</span>
								</div>
								<div class="w-full h-2 bg-gray-100 dark:bg-[#1a1a12] rounded-full overflow-hidden">
									<div class="h-full bg-blue-400 rounded-full" style="width: 27%"></div>
								</div>
							</div>

							<!-- Local Policies (23%) -->
							<div>
								<div class="flex justify-between text-xs mb-1">
									<span class="font-medium text-gray-700 dark:text-gray-300">📍 Unwritten Regional Rejections (23%)</span>
									<span class="font-semibold font-mono text-red-400">{formatINR(LOCAL_POLICY_LEAK)}</span>
								</div>
								<div class="w-full h-2 bg-gray-100 dark:bg-[#1a1a12] rounded-full overflow-hidden">
									<div class="h-full bg-emerald-400 rounded-full" style="width: 23%"></div>
								</div>
							</div>

							<!-- RM Ghosting / Poaching (19%) -->
							<div>
								<div class="flex justify-between text-xs mb-1">
									<span class="font-medium text-gray-700 dark:text-gray-300">🔗 RM Friction & Bypassed Codes (19%)</span>
									<span class="font-semibold font-mono text-red-400">{formatINR(RM_GHOSTING_LEAK)}</span>
								</div>
								<div class="w-full h-2 bg-gray-100 dark:bg-[#1a1a12] rounded-full overflow-hidden">
									<div class="h-full bg-purple-400 rounded-full" style="width: 19%"></div>
								</div>
							</div>

							<!-- Handwritten note -->
							<div class="mt-4 pt-3 border-t border-gray-100 dark:border-[#1e1e14] text-center">
								<span class="handwritten text-xs text-amber-600 dark:text-amber-500/80 rotate-[-1deg] inline-block">
									* All of these leaks are preventable before you file.
								</span>
							</div>
						</div>
					{/if}

				</div>
			</div>

		</div>
	</div>
</section>

<style>
	/* Custom styling for range input */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #d97706; /* amber-600 */
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.1s ease;
	}
	:global(.dark) input[type='range']::-webkit-slider-thumb {
		background: #f59e0b; /* amber-500 */
	}
	input[type='range']::-webkit-slider-thumb:hover {
		transform: scale(1.15);
	}
</style>
