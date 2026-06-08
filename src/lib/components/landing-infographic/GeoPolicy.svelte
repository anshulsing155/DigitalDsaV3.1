<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import MapPin from 'lucide-svelte/icons/map-pin';
	import ShieldAlert from 'lucide-svelte/icons/shield-alert';

	let selectedCity = $state<'mumbai' | 'pune' | 'delhi' | 'ahmedabad'>('mumbai');

	const CITY_POLICIES = {
		mumbai: {
			title: 'Mumbai Municipal Overrides',
			lender: 'HDFC Home Loan',
			desc: 'Local real estate dynamics trigger specific exceptions.',
			note: 'LTV limits raised by 5%. Max FOIR floor 70% PMC.',
			overrides: [
				'Interest rate floor reduced by 0.15% inside BMC limits.',
				'Maximum FOIR (debt-to-income ratio) allowed up to 70% (normally 60%).',
				'Minimum property cost valuation reduced from ₹75L to ₹45L for peripheral suburbs.'
			]
		},
		pune: {
			title: 'Pune District Exceptions',
			lender: 'ICICI LAP & HL',
			desc: 'Co-borrower and land registration modifications for corporate IT hubs.',
			note: 'Gunthewari title PMC guidelines resolved automatically.',
			overrides: [
				'Allows co-borrower agricultural income backing if flats are in PMC limits.',
				'Reconstruction/extension loans allowed without mandatory architectural plans up to 1200 sq.ft.',
				'Accepts Gunthewari property titles with collector validation (strictly blocked in other districts).'
			]
		},
		delhi: {
			title: 'NCR Region Overrides',
			lender: 'Axis Bank LAP',
			desc: 'Property type specifications for Municipal MCD zones.',
			note: 'Lal Dora zone approvals resolved in 15 milliseconds.',
			overrides: [
				'Allows up to 85% LTV on Lal Dora properties within specified municipal zones (national standard is 60%).',
				'Validates properties in unapproved/regularized colonies with verified registration registry.',
				'Self-employed non-professionals requires only 1.5 years business vintage (standard is 3 years).'
			]
		},
		ahmedabad: {
			title: 'Gujarat Retail Outliers',
			lender: 'SBI Plot & Construction',
			desc: 'Simplified documentation compliance for active retail zones.',
			note: 'Composite NA waiver guidelines active.',
			overrides: [
				'Plot + Construction composite loans requires only 1 year audited IT returns instead of standard 2 years.',
				'Sanctions allowed on Gram Panchayat land borders without municipal non-agricultural (NA) certification.',
				'Waiver of technical verification deposit fees for government approved projects.'
			]
		}
	};

	function selectCity(city: 'mumbai' | 'pune' | 'delhi' | 'ahmedabad') {
		selectedCity = city;

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.fromTo(
			'.spec-details-sheet',
			{ opacity: 0, scale: 0.98, y: 10 },
			{ opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' }
		);
	}
</script>

<section id="geo-policy" class="relative py-24 bg-white dark:bg-[#050505] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	<!-- Background glow spot -->
	<div class="absolute top-[20%] right-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Cascading Policy Specification</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				Geographic Specificity Engine
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Lender credit policies vary drastically across states and cities. DigitalDSA models city-level exceptions that override national rules automatically, preventing false rejections.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8 select-none">
			
			<!-- LEFT CITY SELECTOR (5 Cols) -->
			<div class="lg:col-span-5 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 flex flex-col justify-between relative shadow-md dark:shadow-xl min-h-[400px] transition-colors">
				<div>
					<h3 class="text-base font-bold text-gray-900 dark:text-white tracking-wide border-b border-gray-200 dark:border-[#27272a] pb-3 mb-4 select-none font-sans">
						Select Indian Districts
					</h3>
					
					<!-- City selection vertical list -->
					<div class="flex flex-col gap-3">
						{#each Object.keys(CITY_POLICIES) as cityKey}
							<button 
								onclick={() => selectCity(cityKey as any)}
								class="flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 {selectedCity === cityKey ? 'bg-[#ffcc00]/10 border-[#ffcc00] text-gray-900 dark:text-white shadow-sm' : 'bg-gray-50 border-gray-200 dark:bg-[#15151c] dark:border-[#232328] hover:border-gray-300 dark:hover:border-[#27272a]'}"
							>
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 {selectedCity === cityKey ? 'bg-[#ffcc00]/20 text-[#ffcc00]' : 'bg-gray-100 dark:bg-[#27272a] text-gray-400 dark:text-[#71717a]' }">
									<MapPin class="w-4.5 h-4.5" />
								</div>
								<div class="flex-1">
									<h4 class="text-sm font-bold text-gray-900 dark:text-white capitalize">{cityKey} Override</h4>
									<p class="text-[10px] text-gray-400 dark:text-[#71717a] mt-0.5 font-mono">{CITY_POLICIES[cityKey as 'mumbai'].lender} Rules</p>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="text-[10px] text-gray-400 dark:text-[#71717a] font-mono leading-relaxed bg-gray-50 dark:bg-[#0c0c0f] p-3 rounded border border-gray-200 dark:border-[#1f1f24] mt-6 flex items-center gap-2.5">
					<ShieldAlert class="w-5 h-5 text-[#ffcc00] flex-shrink-0" />
					<span>Geographical overrides resolve automatically in 15 milliseconds using CSS-style specificity rules.</span>
				</div>
			</div>

			<!-- RIGHT DETAILS PANEL (7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[400px] transition-colors">
				
				<!-- Resolution tree visual -->
				<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-6">
					<span class="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white font-mono">Specificity Cascade Hierarchy</span>
					<span class="text-[10px] text-[#22d3ee] font-mono border border-[#0891b2]/30 bg-[#164e63]/20 px-2 py-0.5 rounded font-bold font-mono">Winner Override Resolve</span>
				</div>

				<!-- Cascading Tree Infographic -->
				<div class="flex flex-col gap-3.5 mb-6 relative select-none">
					<!-- Connection line graphics -->
					<div class="absolute left-6 top-8 bottom-8 w-[2px] bg-gray-200 dark:bg-[#232328] z-0"></div>

					<!-- Circle 1: National -->
					<div class="flex items-center gap-4 bg-gray-50 dark:bg-[#141418] p-3 rounded-xl border border-gray-200 dark:border-[#232328] opacity-40 relative z-10">
						<span class="text-[10px] font-bold font-mono text-gray-400 dark:text-[#a1a1aa] bg-gray-100 dark:bg-[#27272a] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">1</span>
						<div class="text-left text-xs">
							<span class="text-gray-900 dark:text-white font-bold block">National Guidelines (Level 0)</span>
							<span class="text-gray-400 dark:text-[#71717a]">Generic policy applied to all Indian branches.</span>
						</div>
					</div>

					<!-- Circle 2: State/Region -->
					<div class="flex items-center gap-4 bg-gray-50 dark:bg-[#141418] p-3 rounded-xl border border-gray-200 dark:border-[#232328] opacity-60 relative z-10">
						<span class="text-[10px] font-bold font-mono text-gray-400 dark:text-[#a1a1aa] bg-gray-100 dark:bg-[#27272a] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">2</span>
						<div class="text-left text-xs">
							<span class="text-gray-900 dark:text-white font-bold block">Regional/State Specific (Level 1)</span>
							<span class="text-gray-400 dark:text-[#71717a]">Overrides specific to State boundaries and circulars.</span>
						</div>
					</div>

					<!-- Circle 3: City Overrides (Active Node) -->
					<div class="flex items-center gap-4 bg-[#ffcc00]/5 p-3.5 rounded-xl border border-[#ffcc00]/25 relative z-10 shadow-[0_0_20px_rgba(255,204,0,0.03)]">
						<span class="text-[10px] font-bold font-mono text-[#ffcc00] bg-[#ffcc00]/20 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">3</span>
						<div class="text-left text-xs flex-1">
							<span class="text-[#ffcc00] font-extrabold block">City/District Override (Level 2) - CSS Priority Winner</span>
							<span class="text-gray-500 dark:text-[#a1a1aa] font-mono text-[10px]">{CITY_POLICIES[selectedCity].note}</span>
						</div>
					</div>
				</div>

				<!-- Specs sheet details -->
				<div class="spec-details-sheet bg-gray-50 dark:bg-[#0c0c0f] p-5 rounded-2xl border border-gray-200 dark:border-[#232328] relative transition-colors">
					<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#1f1f24] pb-3 mb-4">
						<h4 class="text-sm font-bold text-gray-900 dark:text-white">{CITY_POLICIES[selectedCity].title}</h4>
						<span class="text-[10px] font-mono text-[#22d3ee] font-bold bg-[#164e63]/25 px-2.5 py-0.5 rounded border border-[#0891b2]/20">{CITY_POLICIES[selectedCity].lender}</span>
					</div>

					<p class="text-xs text-gray-500 dark:text-[#a1a1aa] italic mb-4 leading-relaxed">{CITY_POLICIES[selectedCity].desc}</p>

					<ul class="flex flex-col gap-3">
						{#each CITY_POLICIES[selectedCity].overrides as override}
							<li class="flex items-start gap-2.5 text-xs text-gray-900 dark:text-white leading-relaxed">
								<span class="w-1.5 h-1.5 rounded-full bg-[#ffcc00] mt-1.5 flex-shrink-0"></span>
								<span>{override}</span>
							</li>
						{/each}
					</ul>

					<!-- Handwriting annotations -->
					{#if selectedCity === 'mumbai'}
						<span class="handwritten text-[10px] text-[#ffcc00] absolute right-4 top-[-25px] rotate-[-5deg] bg-[#fcfcfc] dark:bg-[#101014] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-sm hidden xl:inline select-none">
							*FOIR raised to 70% only in BMC limits!
						</span>
					{:else if selectedCity === 'pune'}
						<span class="handwritten text-[10px] text-[#ffcc00] absolute right-4 top-[-25px] rotate-[5deg] bg-[#fcfcfc] dark:bg-[#101014] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-sm hidden xl:inline select-none">
							*Allows Gunthewari titles PMC limits!
						</span>
					{:else if selectedCity === 'delhi'}
						<span class="handwritten text-[10px] text-[#ffcc00] absolute right-4 top-[-25px] rotate-[-5deg] bg-[#fcfcfc] dark:bg-[#101014] px-2.5 py-1 rounded border border-gray-200 dark:border-[#27272a] shadow-sm hidden xl:inline select-none">
							*Lal Dora zone approvals resolved!
						</span>
					{/if}
				</div>
			</div>

		</div>
	</div>
</section>
