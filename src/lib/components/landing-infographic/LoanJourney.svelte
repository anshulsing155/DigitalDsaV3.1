<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from '$lib/utils/gsapSetup';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import UserPlus from 'lucide-svelte/icons/user-plus';
	import Percent from 'lucide-svelte/icons/percent';
	import MapPin from 'lucide-svelte/icons/map-pin';
	import Building from 'lucide-svelte/icons/building';
	import Users from 'lucide-svelte/icons/users';
	import FileLock2 from 'lucide-svelte/icons/file-lock-2';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';

	let containerRef: HTMLElement | undefined = $state(undefined);
	let activeStep = $state(0);
	let autoPlayInterval: any;

	const STAGES = [
		{
			title: 'Lead Ingestion',
			subtitle: 'Step 1: Universal Input',
			icon: UserPlus,
			color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
			desc: 'WhatsApp snapshots, raw documents, or basic info ingested instantly into a clean digital template.',
			detailLabel: 'Data Cleaned',
			detailValue: 'OCR & Auto-extraction complete',
			badge: 'OCR Verified',
			badgeColor: 'bg-blue-500/15 text-blue-500 border-blue-500/20'
		},
		{
			title: 'Income Profiling',
			subtitle: 'Step 2: Haircut Assessment',
			icon: Percent,
			color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
			desc: 'Scrapes 12+ income streams (salary, rent, IT returns) and applies strict bank-specific haircut rules.',
			detailLabel: 'Net Eligibility',
			detailValue: 'FOIR Adjusted: 65% limit',
			badge: 'Haircuts Applied',
			badgeColor: 'bg-amber-500/15 text-amber-500 border-amber-500/20'
		},
		{
			title: 'Policy Match',
			subtitle: 'Step 3: Cascading Filters',
			icon: MapPin,
			color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
			desc: 'Cross-checks with municipal regional rules (Lal Dora zones, PMC borders) to prevent immediate rejects.',
			detailLabel: 'Rule Check',
			detailValue: '77+ Lenders filtered',
			badge: 'Geo-Specificity',
			badgeColor: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20'
		},
		{
			title: 'Bank Selection',
			subtitle: 'Step 4: Smart Matching',
			icon: Building,
			color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
			desc: 'Ranks top 3 optimal lenders based on interest rates, turnaround times, and final approval odds.',
			detailLabel: 'Matched Banks',
			detailValue: 'HDFC, ICICI, Axis options',
			badge: '92% Approval Odds',
			badgeColor: 'bg-purple-500/15 text-purple-500 border-purple-500/20'
		},
		{
			title: 'RM Discovery',
			subtitle: 'Step 5: Network Connect',
			icon: Users,
			color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
			desc: 'Identifies active relationship managers for the selected branch. Gets direct campaigns instantly.',
			detailLabel: 'Active Agents',
			detailValue: 'Direct RM WhatsApp active',
			badge: 'Rated 4.9★ RMs',
			badgeColor: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/20'
		},
		{
			title: 'File Building',
			subtitle: 'Step 6: Redacted Packaging',
			icon: FileLock2,
			color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
			desc: 'Generates B2B files with sensitive borrower details masked. PII protected to avoid data poaching.',
			detailLabel: 'Encryption Status',
			detailValue: 'PAN/Aadhaar Redacted',
			badge: 'Leads Secured',
			badgeColor: 'bg-rose-500/15 text-rose-500 border-rose-500/20'
		},
		{
			title: 'Sanction Approval',
			subtitle: 'Step 7: Commission Payout',
			icon: CheckCircle,
			color: 'text-green-500 bg-green-500/10 border-green-500/20',
			desc: 'Clean, matched file submitted to Banker with total transparency. Sanction ready in record time.',
			detailLabel: 'Final Payout',
			detailValue: '100% DSA Commission Saved',
			badge: 'Sanction Ready',
			badgeColor: 'bg-green-500/15 text-green-500 border-green-500/20'
		}
	];

	function selectStep(index: number, manual = true) {
		activeStep = index;
		if (manual && autoPlayInterval) {
			clearInterval(autoPlayInterval);
		}

		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.fromTo(
			'.journey-detail-panel',
			{ opacity: 0, scale: 0.98, y: 15 },
			{ opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out' }
		);
	}

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		// Simple interval to cycle auto steps
		autoPlayInterval = setInterval(() => {
			selectStep((activeStep + 1) % STAGES.length, false);
		}, 6000);

		const ctx = gsap.context(() => {
			gsap.fromTo(
				'.journey-step-button',
				{ opacity: 0, y: 20 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.08,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: '.journey-timeline-container',
						start: 'top 85%'
					}
				}
			);
		}, containerRef);

		return () => {
			if (autoPlayInterval) clearInterval(autoPlayInterval);
			ctx.revert();
		};
	});
</script>

<section bind:this={containerRef} id="loan-journey" class="relative py-24 bg-white dark:bg-[#0c0c0f] text-gray-900 dark:text-[#f4f4f5] border-b border-gray-200/80 dark:border-[#1f1f23] transition-colors duration-300 px-4 md:px-8 overflow-hidden">
	
	<!-- Ambient atmospheric decoration -->
	<div class="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-radial from-[rgba(0,229,255,0.02)] to-transparent rounded-full blur-[100px] pointer-events-none" aria-hidden="true"></div>
	<div class="absolute bottom-[20%] right-[-10%] w-[450px] h-[450px] bg-radial from-[rgba(255,204,0,0.02)] to-transparent rounded-full blur-[120px] pointer-events-none" aria-hidden="true"></div>

	<div class="w-full max-w-7xl mx-auto relative z-10">
		
		<!-- Header -->
		<div class="text-center mb-16">
			<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] text-xs text-gray-500 dark:text-[#a1a1aa] mb-4">
				<Sparkles class="w-3.5 h-3.5 text-[#ffcc00]" />
				<span>Automation end-to-end pipeline</span>
			</div>
			<h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
				The Complete Loan Lifecycle Journey
			</h2>
			<p class="text-gray-500 dark:text-[#a1a1aa] max-w-2xl mx-auto text-sm sm:text-base">
				Follow a single client file as it moves through DigitalDSA's intelligence workflow. Every manual checkpoint, structured and resolved automatically.
			</p>
		</div>

		<!-- Mobile/Tablet Carousel Selector -->
		<div class="lg:hidden flex overflow-x-auto gap-3 pb-6 px-1 snap-x scrollbar-thin select-none">
			{#each STAGES as stage, index}
				<button 
					onclick={() => selectStep(index)}
					class="snap-center flex-shrink-0 w-[240px] p-5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden bg-white dark:bg-[#101014] {activeStep === index ? 'border-[#ffcc00] ring-1 ring-[#ffcc00]' : 'border-gray-200 dark:border-[#232328]'}"
				>
					<div class="flex items-center justify-between mb-3">
						<div class="w-8 h-8 rounded-lg flex items-center justify-center {activeStep === index ? 'bg-[#ffcc00]/20 text-[#ffcc00]' : 'bg-gray-100 dark:bg-[#1f1f26] text-gray-400'}">
							<stage.icon class="w-4.5 h-4.5" />
						</div>
						<span class="text-[9px] font-mono font-bold text-gray-400">0{index + 1}</span>
					</div>
					<h4 class="text-xs font-bold text-gray-900 dark:text-white mb-1">{stage.title}</h4>
					<p class="text-[10px] text-gray-400 dark:text-[#71717a] line-clamp-2">{stage.desc}</p>
				</button>
			{/each}
		</div>

		<!-- Desktop Timeline (Lg and above) -->
		<div class="journey-timeline-container hidden lg:flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#121216]/80 border border-gray-200 dark:border-[#1e1e24] p-4 rounded-3xl mb-12 select-none relative z-10">
			{#each STAGES as stage, index}
				<button 
					onclick={() => selectStep(index)}
					class="journey-step-button flex-1 py-4.5 px-3 rounded-2xl border text-center transition-all duration-300 relative group {activeStep === index ? 'bg-white dark:bg-[#17171f] border-[#ffcc00] shadow-md dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)]' : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-[#15151b]/40'}"
				>
					<div class="flex flex-col items-center gap-2.5">
						<div class="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 {activeStep === index ? 'bg-[#ffcc00]/20 text-[#ffcc00]' : 'bg-gray-100 dark:bg-[#23232a] text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}">
							<stage.icon class="w-5 h-5" />
						</div>
						<div>
							<span class="text-[9px] font-bold font-mono tracking-wider block mb-0.5 {activeStep === index ? 'text-[#ffcc00]' : 'text-gray-400'}">0{index + 1}</span>
							<h4 class="text-[11px] font-extrabold text-gray-800 dark:text-white group-hover:text-[#ffcc00] transition-colors">{stage.title}</h4>
						</div>
					</div>
					{#if index < STAGES.length - 1}
						<div class="absolute top-[40%] right-[-10px] translate-y-[-50%] text-gray-300 dark:text-[#232328] group-hover:text-gray-400 pointer-events-none z-20">
							<ArrowRight class="w-4.5 h-4.5" />
						</div>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Live Visual Interactive Playground Sandbox -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
			
			<!-- Interactive Details Panel (5 Cols) -->
			<div class="journey-detail-panel lg:col-span-5 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg dark:shadow-xl transition-colors min-h-[380px]">
				
				<div>
					<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-4 mb-5 select-none">
						<span class="text-xs font-bold text-gray-500 dark:text-[#a1a1aa] font-mono capitalize">{STAGES[activeStep].subtitle}</span>
						<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded border {STAGES[activeStep].badgeColor}">{STAGES[activeStep].badge}</span>
					</div>

					<h3 class="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">{STAGES[activeStep].title}</h3>
					<p class="text-xs sm:text-sm text-gray-500 dark:text-[#a1a1aa] leading-relaxed mb-6">{STAGES[activeStep].desc}</p>
				</div>

				<div class="bg-gray-50 dark:bg-[#141419] border border-gray-200 dark:border-[#232328] p-4.5 rounded-2xl relative transition-colors font-mono">
					<div class="flex justify-between items-center text-xs mb-2">
						<span class="text-gray-500 dark:text-[#71717a] font-medium">{STAGES[activeStep].detailLabel}:</span>
						<span class="text-gray-900 dark:text-white font-bold">{STAGES[activeStep].detailValue}</span>
					</div>
					<div class="flex justify-between items-center text-[10px] border-t border-gray-100 dark:border-[#1f1f24] pt-2 mt-2">
						<span class="text-gray-400 dark:text-[#71717a]">Status:</span>
						<span class="text-green-500 font-extrabold uppercase animate-pulse">✓ RESOLVED LIVE</span>
					</div>
				</div>
			</div>

			<!-- Dynamic Sandbox Animation Display Mock (7 Cols) -->
			<div class="lg:col-span-7 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#27272a] rounded-3xl p-6 sm:p-8 flex flex-col justify-center relative shadow-lg dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-h-[380px] transition-colors overflow-hidden">
				
				<!-- Mock Interactive Console -->
				<div class="w-full max-w-lg mx-auto bg-gray-50 dark:bg-[#131317] border border-gray-200 dark:border-[#202028] p-6 rounded-2xl relative transition-colors shadow-inner flex flex-col gap-4 font-mono select-none">
					
					<!-- Header Dots -->
					<div class="flex items-center justify-between border-b border-gray-200 dark:border-[#202028]/80 pb-3 mb-1">
						<div class="flex gap-1.5">
							<span class="w-2.5 h-2.5 rounded-full bg-red-400"></span>
							<span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
							<span class="w-2.5 h-2.5 rounded-full bg-green-400"></span>
						</div>
						<span class="text-[9px] text-gray-400 tracking-widest uppercase">TERMINAL://ACTIVE_SESSION</span>
					</div>

					<!-- SCREEN 1: Ingestion -->
					{#if activeStep === 0}
						<div class="flex flex-col gap-3 py-2 text-left">
							<div class="text-[10px] text-gray-500">// EXTRACTING RAW METADATA...</div>
							<div class="p-3 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl flex items-center justify-between text-xs animate-pulse">
								<span class="text-gray-400">Source: WhatsApp Screenshot</span>
								<span class="text-blue-500 font-bold">100% Extracted</span>
							</div>
							<div class="p-3 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl flex items-center justify-between text-xs">
								<span class="text-gray-400">Income declared: ₹1,50,000 /mo</span>
								<span class="text-green-500 font-bold">Raw Value</span>
							</div>
						</div>
					{/if}

					<!-- SCREEN 2: Income Profiling -->
					{#if activeStep === 1}
						<div class="flex flex-col gap-3 py-2 text-left">
							<div class="text-[10px] text-[#ffcc00] font-bold">// HAIR-CUT COMPUTATION SYSTEM</div>
							<div class="grid grid-cols-2 gap-3 text-xs">
								<div class="p-2.5 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl">
									<span class="text-gray-400 block text-[9px]">Salaried Income</span>
									<span class="text-gray-900 dark:text-white font-bold font-mono">₹1,00,000</span>
									<span class="text-green-500 text-[8px] font-bold block mt-0.5">0% Haircut</span>
								</div>
								<div class="p-2.5 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl">
									<span class="text-gray-400 block text-[9px]">Rental Stream</span>
									<span class="text-gray-900 dark:text-white font-bold font-mono">₹50,000</span>
									<span class="text-amber-500 text-[8px] font-bold block mt-0.5">30% Haircut applied</span>
								</div>
							</div>
							<div class="p-3 bg-amber-500/10 border border-amber-500/20 text-[#ffcc00] rounded-xl text-center text-xs font-bold font-mono">
								Real Adjusted Income: ₹1,35,000 /mo
							</div>
						</div>
					{/if}

					<!-- SCREEN 3: Policy Match -->
					{#if activeStep === 2}
						<div class="flex flex-col gap-3 py-2 text-left">
							<div class="text-[10px] text-gray-500">// CROSS-CHECKING REGIONAL BOUNDS</div>
							<div class="p-3 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl flex items-center justify-between text-xs">
								<span class="text-gray-400">Location: Mumbai Metro BMC</span>
								<span class="text-green-500 font-bold">✓ Matches BMC Override</span>
							</div>
							<div class="p-3 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl flex items-center justify-between text-xs">
								<span class="text-gray-400">Outlier Zone check (Lal Dora):</span>
								<span class="text-emerald-500 font-bold">✓ Vetted Safe</span>
							</div>
						</div>
					{/if}

					<!-- SCREEN 4: Bank Selection -->
					{#if activeStep === 3}
						<div class="flex flex-col gap-2 py-2 text-left">
							<div class="text-[10px] text-purple-400 font-bold">// COMPILING MATCHMATRIX GRID</div>
							<div class="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs">
								<span class="text-gray-900 dark:text-white font-bold">1. HDFC Home Loan</span>
								<span class="text-emerald-500 font-bold font-mono">92% Match Score</span>
							</div>
							<div class="flex items-center justify-between p-2 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl text-xs">
								<span class="text-gray-400">2. ICICI LAP</span>
								<span class="text-gray-500 font-mono">81% Match Score</span>
							</div>
							<div class="flex items-center justify-between p-2 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl text-xs">
								<span class="text-gray-400">3. Axis HL</span>
								<span class="text-gray-500 font-mono">75% Match Score</span>
							</div>
						</div>
					{/if}

					<!-- SCREEN 5: RM Discovery -->
					{#if activeStep === 4}
						<div class="flex flex-col gap-3 py-2 text-left">
							<div class="text-[10px] text-cyan-400 font-bold">// BROADCASTING DIRECT CAMPAIGNS</div>
							<div class="p-3 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-xl flex items-center gap-3">
								<div class="w-8 h-8 rounded-full bg-cyan-500/25 flex items-center justify-center font-bold text-xs text-cyan-500 select-none">AS</div>
								<div class="text-left flex-1">
									<span class="text-xs text-gray-900 dark:text-white font-bold block">Abhishek Sharma</span>
									<span class="text-[9px] text-cyan-400 font-mono">Vetted HDFC HL RM - Mumbai West</span>
								</div>
								<span class="text-[9px] text-green-500 font-bold animate-pulse">✓ BROADCASTING</span>
							</div>
						</div>
					{/if}

					<!-- SCREEN 6: File Building -->
					{#if activeStep === 5}
						<div class="flex flex-col gap-2.5 py-1 text-left relative">
							<div class="text-[10px] text-rose-500 font-bold">// SECURED DATA redaction ONGOING</div>
							<div class="p-3.5 bg-white dark:bg-[#1b1b24] border border-gray-200 dark:border-[#2d2d3a] rounded-2xl relative overflow-hidden flex flex-col gap-2">
								<div class="flex justify-between items-center text-[10px] text-gray-400 pb-1.5 border-b border-gray-100 dark:border-[#2d2d3a]">
									<span>File-Code: DS-99881-A</span>
									<span class="text-rose-500">Anti-poaching Active</span>
								</div>
								<div class="flex justify-between text-xs items-center">
									<span class="text-gray-400">Borrower Phone:</span>
									<span class="bg-gray-900 dark:bg-black text-transparent select-none filter blur-[4px] px-3.5 py-0.5 rounded font-mono">XXXXXX9898</span>
								</div>
								<div class="flex justify-between text-xs items-center">
									<span class="text-gray-400">Aadhaar Card:</span>
									<span class="bg-gray-900 dark:bg-black text-transparent select-none filter blur-[4px] px-3.5 py-0.5 rounded font-mono">XXXX-XXXX-3344</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- SCREEN 7: Sanction Approval -->
					{#if activeStep === 6}
						<div class="flex flex-col gap-3 py-2 text-center items-center justify-center">
							<div class="w-12 h-12 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center text-green-500 animate-bounce">
								<CheckCircle class="w-6 h-6" />
							</div>
							<div class="text-left w-full">
								<div class="p-3.5 bg-green-500/5 border border-green-500/20 text-[#10b981] rounded-2xl text-center text-xs font-bold font-mono">
									✓ SANCTION COMMITTED: HDFC Home Loan
									<span class="text-[9px] text-gray-400 dark:text-[#a1a1aa] block font-normal mt-1 leading-relaxed">
										Lead data protected. Relationship locked with RM. Full commission payout cleared.
									</span>
								</div>
							</div>
						</div>
					{/if}

				</div>

				<!-- Handwriting notes floating around sandbox -->
				{#if activeStep === 1}
					<span class="handwritten text-[10px] text-[#ffcc00] absolute right-4 top-4 rotate-[6deg] bg-white dark:bg-[#0D0D0D] px-2 py-0.5 rounded border border-gray-200 dark:border-[#27272a] shadow-sm hidden sm:inline select-none">
						*Adjusts dynamically for self-employed!
					</span>
				{:else if activeStep === 5}
					<span class="handwritten text-[10px] text-[#ffcc00] absolute right-4 top-4 rotate-[-4deg] bg-white dark:bg-[#0D0D0D] px-2 py-0.5 rounded border border-gray-200 dark:border-[#27272a] shadow-sm hidden sm:inline select-none">
						*Masks raw PII parameters perfectly!
					</span>
				{/if}

			</div>

		</div>

	</div>
</section>
