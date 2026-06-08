<script lang="ts">
	import { TRIAL_DAYS } from '$lib/config/billing';
	import { landingNav } from '$lib/state/landingNavigation.svelte';

	function handleCTA() {
		landingNav.handleCTA();
	}
	function handleDemo() {
		window.location.href = '/test-dashboard';
	}
</script>

<section id="start" class="relative py-20 sm:py-28 bg-[#F8F7F2] dark:bg-[#0A0A07] px-4 sm:px-8 lg:px-16 border-t border-gray-100 dark:border-[#1a1a12] transition-colors overflow-hidden">

	<!-- Warm centered atmospheric glow -->
	<div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-amber-500/5 dark:bg-amber-400/2 blur-[100px] pointer-events-none"></div>

	<div class="w-full max-w-5xl mx-auto relative z-10">

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

			<!-- LEFT: Interactive Onboarding Flow (7 Columns) -->
			<div class="lg:col-span-7">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-[#4a4a35] mb-3">Onboarding Flow</p>
				<h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-5">
					Submit one case.<br/>Experience the difference.
				</h2>
				<p class="text-sm sm:text-base text-gray-500 dark:text-[#7a7a60] leading-relaxed mb-8">
					Select one of your active, complex cases—an application where you are uncertain of lender approval or credit haircut limits. File it inside DigitalDSA to verify the bank matches, eligible income calculations, and active RM contact details in under two minutes.
				</p>

				<!-- Steps — visual -->
				<div class="flex flex-col gap-3 mb-8">
					{#each [
						{ n: '1', t: 'Create Your Professional Account', s: 'Instant registration using your business email only' },
						{ n: '2', t: 'Submit Case Profile Metrics', s: 'Enter borrower income sources, credit history, and property specifics' },
						{ n: '3', t: 'Unlock Sourcing Insights', s: 'View standard bank match scores, policy checks, and verified RM directory connections' },
					] as step}
						<div class="flex items-center gap-4 bg-white dark:bg-[#111109] border border-gray-200/60 dark:border-[#1e1e14] rounded-2xl px-5 py-4 shadow-sm transition-all hover:scale-[1.01]">
							<div class="w-8 h-8 rounded-full bg-[#1A1A14] dark:bg-white text-white dark:text-[#0C0C09] text-xs font-extrabold flex items-center justify-center flex-shrink-0 select-none">
								{step.n}
							</div>
							<div>
								<p class="text-sm font-bold text-gray-900 dark:text-white">{step.t}</p>
								<p class="text-xs text-gray-400 dark:text-[#5a5a40] mt-0.5">{step.s}</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- CTA buttons -->
				<div class="flex flex-col sm:flex-row gap-3">
					<button
						onclick={handleCTA}
						class="group px-7 py-3.5 rounded-xl bg-[#1A1A14] dark:bg-white text-white dark:text-[#0C0C09] font-bold text-sm hover:bg-[#2a2a1e] dark:hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-black/10"
					>
						Start {TRIAL_DAYS}-Day Free Trial
						<svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
					</button>
					<button
						onclick={handleDemo}
						class="px-7 py-3.5 rounded-xl border border-gray-200 dark:border-[#2a2a1e] bg-white dark:bg-[#111109] text-gray-700 dark:text-gray-300 font-semibold text-sm hover:border-gray-300 dark:hover:border-[#3a3a28] transition-all hover:scale-[1.02]"
					>
						See demo cockpit
					</button>
				</div>

				<p class="text-xs text-gray-400 dark:text-[#4a4a35] mt-4">
					No credit card setup required · Flat monthly subscription fee · GST inclusive pricing
				</p>
			</div>

			<!-- RIGHT: Clean Pricing Grid (5 Columns) -->
			<div class="lg:col-span-5">
				<div class="bg-white dark:bg-[#111109] border border-gray-200 dark:border-[#1e1e14] rounded-3xl overflow-hidden shadow-md">

					<div class="px-6 py-4.5 border-b border-gray-100 dark:border-[#1e1e14] bg-gray-50/50 dark:bg-[#16160f]/40">
						<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#4a4a35] select-none">Software Licensing Plans</p>
					</div>

					<div class="divide-y divide-gray-100 dark:divide-[#1e1e14]">
						{#each [
							{ name: 'Basic Tier', price: '₹999', period: '/mo', desc: '10 active case pipelines', highlight: false },
							{ name: 'Professional', price: '₹3,999', period: '/mo', desc: '50 active case pipelines', highlight: true },
							{ name: 'Enterprise', price: '₹9,999', period: '/mo', desc: 'Unlimited active cases & team seat', highlight: false },
						] as plan}
							<div class="flex items-center justify-between px-6 py-4.5 {plan.highlight ? 'bg-amber-500/5 dark:bg-amber-400/5' : ''}">
								<div>
									<div class="flex items-center gap-2">
										<p class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{plan.name}</p>
										{#if plan.highlight}
											<span class="text-[8px] font-extrabold bg-amber-600 text-white px-2 py-0.5 rounded uppercase tracking-wider select-none">Popular</span>
										{/if}
									</div>
									<p class="text-[10px] sm:text-xs text-gray-400 dark:text-[#5a5a40] mt-0.5">{plan.desc}</p>
								</div>
								<div class="text-right flex-shrink-0">
									<span class="text-sm sm:text-base font-extrabold font-mono text-gray-900 dark:text-white">{plan.price}</span>
									<span class="text-[10px] text-gray-400 dark:text-[#5a5a40]">{plan.period}</span>
								</div>
							</div>
						{/each}
					</div>

					<div class="px-6 py-4.5 bg-gray-50 dark:bg-[#0e0e0b]/55 border-t border-gray-100 dark:border-[#1e1e14]">
						<p class="text-[10px] text-gray-400 dark:text-[#4a4a35] leading-relaxed">
							All standard licensing tiers include: 77+ bank credit policy files · Income haircut calculators · verified RM partner directory access · geographical policy overrides · redacted file export builders.
						</p>
					</div>
				</div>

				<!-- Satisfaction Guarantee -->
				<div class="mt-4 flex items-start gap-3.5 p-4.5 rounded-2xl border border-gray-200/60 dark:border-[#1e1e14] bg-white dark:bg-[#111109] shadow-sm">
					<span class="text-xl flex-shrink-0 select-none">🛡️</span>
					<p class="text-xs text-gray-500 dark:text-[#6a6a60] leading-relaxed">
						<strong class="text-gray-900 dark:text-white">30-day satisfaction guarantee.</strong> If DigitalDSA does not improve your case filing accuracy or speed within 30 days of registration, we will issue a full refund of your licensing fee.
					</p>
				</div>
			</div>

		</div>
	</div>
</section>
