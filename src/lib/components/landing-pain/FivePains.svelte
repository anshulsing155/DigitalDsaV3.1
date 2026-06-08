<script lang="ts">
	import { onMount } from 'svelte';

	let activeBottleneck = $state<number>(0);
	let revealed = $state(false);
	let sectionRef: HTMLElement | undefined = $state(undefined);

	// Bottleneck 1 State
	let selectedCity = $state<'pune' | 'mumbai' | 'delhi'>('pune');

	// Bottleneck 2 State
	let salaryIncome = $state(100000);
	let businessIncome = $state(80000);
	let rentalIncome = $state(50000);

	const salaryHaircut = 0.0; // 0%
	const businessHaircut = 0.35; // 35%
	const rentalHaircut = 0.30; // 30%

	const salaryEligible = $derived(salaryIncome * (1 - salaryHaircut));
	const businessEligible = $derived(businessIncome * (1 - businessHaircut));
	const rentalEligible = $derived(rentalIncome * (1 - rentalHaircut));
	const totalGrossIncome = $derived(salaryIncome + businessIncome + rentalIncome);
	const totalEligibleIncome = $derived(salaryEligible + businessEligible + rentalEligible);

	// Bottleneck 3 State
	let piiSanitized = $state(true);

	// Bottleneck 4 State
	let broadcastSimulating = $state(false);
	let broadcastReceived = $state(false);

	function runBroadcastSimulation() {
		if (broadcastSimulating) return;
		broadcastSimulating = true;
		broadcastReceived = false;
		setTimeout(() => {
			broadcastSimulating = false;
			broadcastReceived = true;
		}, 1200);
	}

	// Bottleneck 5 State
	let queryResolved = $state(false);

	const BOTTLENECKS = [
		{
			id: 0,
			tag: 'Zoning Failures',
			title: '1. The Late Rejection',
			pain: 'Spending weeks visiting sites and paying surveyors, only to have the bank reject the property at the final stage because of a hyper-local zoning boundary you did not know existed.',
			icon: '📍'
		},
		{
			id: 1,
			tag: 'Eligibility Gaps',
			title: '2. The Eligibility Shock',
			pain: 'Promising your borrower a ₹80 Lakh loan based on gross income, only to have the credit team apply unwritten haircuts to self-employed and rental sources—slashing the sanction and losing your client\'s trust.',
			icon: '🧮'
		},
		{
			id: 2,
			tag: 'Lead Security',
			title: '3. The Stolen Commission',
			pain: 'Sharing a borrower\'s raw Aadhaar card, PAN card, and bank statements on WhatsApp, only to have the representative bypass your agency and file under another code.',
			icon: '🔒'
		},
		{
			id: 3,
			tag: 'RM Turnover',
			title: '4. The Ignored RM Call',
			pain: 'Your client is demanding updates, but your Bank Relationship Manager got transferred last week. Your calls go unanswered, and your file sits untouched in an empty desk drawer.',
			icon: '📡'
		},
		{
			id: 4,
			tag: 'Processing Stalls',
			title: '5. The Expired Document Trap',
			pain: 'A submitted file sits silent for 3 weeks. Suddenly, the credit officer flags an expired bank statement. You request a refresh, but the irritated applicant has already signed up with your competitor.',
			icon: '⏳'
		}
	];

	onMount(() => {
		if (!sectionRef) return;
		const observer = new IntersectionObserver(([e]) => {
			if (e.isIntersecting) { revealed = true; observer.disconnect(); }
		}, { threshold: 0.1 });
		observer.observe(sectionRef);
		return () => observer.disconnect();
	});
</script>

<section bind:this={sectionRef} id="bottlenecks" class="relative py-20 sm:py-28 bg-white dark:bg-[#0C0C09] px-4 sm:px-8 lg:px-16 border-t border-gray-100 dark:border-[#1a1a12] transition-colors">

	<div class="w-full max-w-6xl mx-auto">

		<!-- Section header focusing on relatable daily struggles -->
		<div class="mb-16 max-w-3xl">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-[#4a4a35] mb-3">Your Daily Business Nightmares</p>
			<h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
				Five scenarios where your commissions leak away.
			</h2>
			<p class="text-sm sm:text-base text-gray-400 dark:text-[#6a6a50] leading-relaxed">
				Filing a retail loan is not a paperwork game; it is a race against invisible business friction. Select any struggle below to see how DigitalDSA intercepts it before it costs you your payout.
			</p>
		</div>

		<!-- Main Interactive Dashboard Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">

			<!-- LEFT Side: The Nightmares Selector (5 Columns) -->
			<div class="lg:col-span-5 flex flex-col gap-3">
				{#each BOTTLENECKS as item, i}
					<button
						onclick={() => activeBottleneck = item.id}
						class="w-full text-left p-4.5 rounded-2xl border transition-all duration-300 flex items-start gap-4 hover:bg-gray-50/50 dark:hover:bg-[#111109] {activeBottleneck === item.id ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm' : 'border-gray-200/60 dark:border-[#1e1e14] bg-white dark:bg-[#0E0E0B]'}"
					>
						<span class="text-xl p-2.5 rounded-xl bg-gray-100 dark:bg-[#1a1a12] border border-gray-200/50 dark:border-[#222218] select-none flex-shrink-0">
							{item.icon}
						</span>
						<div class="flex-1">
							<span class="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-[#5a5a40]">
								{item.tag}
							</span>
							<h3 class="text-sm font-bold text-gray-900 dark:text-white mt-0.5 transition-colors {activeBottleneck === item.id ? 'text-amber-700 dark:text-amber-500' : ''}">
								{item.title}
							</h3>
							<p class="text-xs text-gray-400 dark:text-[#5a5a40] mt-1.5 leading-relaxed">
								{item.pain}
							</p>
						</div>
					</button>
				{/each}
			</div>

			<!-- RIGHT Side: Live Infographic Visual Simulator (7 Columns) -->
			<div class="lg:col-span-7">
				<div class="bg-gray-50 dark:bg-[#111109] border border-gray-200 dark:border-[#1e1e14] rounded-3xl p-6 sm:p-8 h-full flex flex-col justify-between shadow-inner relative overflow-hidden min-h-[460px]">
					
					<!-- Atmosphere background elements inside simulator -->
					<div class="absolute inset-0 bg-[radial-gradient(#C8C4B0_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#222218_0.5px,transparent_0.5px)] [background-size:24px_24px] opacity-30 pointer-events-none" aria-hidden="true"></div>

					<!-- Visual 1: Geographic Policy Overrides -->
					{#if activeBottleneck === 0}
						<div class="flex-1 flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-center mb-6">
									<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40]">Zoning Policy Override Simulator</p>
									<span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold border border-emerald-100 dark:border-emerald-900/40 uppercase tracking-wider">Hyper-Local Overrides</span>
								</div>

								<!-- City Tabs -->
								<div class="flex gap-2 p-1 bg-white dark:bg-[#16160f] border border-gray-200/50 dark:border-[#222218] rounded-xl mb-6 font-semibold">
									<button
										onclick={() => selectedCity = 'pune'}
										class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {selectedCity === 'pune' ? 'bg-[#1A1A14] dark:bg-[#2c2c20] text-white' : 'text-gray-400 dark:text-[#5a5a40] hover:text-gray-600 dark:hover:text-gray-200'}"
									>
										Pune Property
									</button>
									<button
										onclick={() => selectedCity = 'mumbai'}
										class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {selectedCity === 'mumbai' ? 'bg-[#1A1A14] dark:bg-[#2c2c20] text-white' : 'text-gray-400 dark:text-[#5a5a40] hover:text-gray-600 dark:hover:text-gray-200'}"
									>
										Mumbai Property
									</button>
									<button
										onclick={() => selectedCity = 'delhi'}
										class="flex-1 py-2 text-xs font-bold rounded-lg transition-all {selectedCity === 'delhi' ? 'bg-[#1A1A14] dark:bg-[#2c2c20] text-white' : 'text-gray-400 dark:text-[#5a5a40] hover:text-gray-600 dark:hover:text-gray-200'}"
									>
										Delhi Property
									</button>
								</div>

								<!-- Waterfall list -->
								<div class="space-y-4">
									<div class="flex items-start gap-3">
										<div class="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#222218] border border-gray-300 dark:border-[#333324] flex items-center justify-center text-[9px] font-bold text-gray-400">1</div>
										<div>
											<p class="text-xs font-bold text-gray-500 dark:text-[#5a5a40]">Standard Bank PDF Guideline</p>
											<p class="text-xs text-gray-900 dark:text-white mt-0.5">"Standard residential home loans are funded across urban municipal limits." (Generic rule you read)</p>
										</div>
									</div>

									<div class="flex items-start gap-3">
										<div class="w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-950 border border-amber-300 dark:border-amber-900 flex items-center justify-center text-[9px] font-bold text-amber-700 dark:text-amber-500">2</div>
										<div class="flex-1">
											<p class="text-xs font-bold text-amber-700 dark:text-amber-500">Active Geographic Restriction (Filing Block)</p>
											
											{#if selectedCity === 'pune'}
												<div class="bg-white dark:bg-[#16160f] border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 mt-1.5 shadow-sm">
													<p class="text-xs font-bold text-gray-900 dark:text-white">Pune – Gunthewari Zoning Override</p>
													<p class="text-xs text-gray-400 dark:text-[#7a7a60] mt-1 leading-relaxed">HDFC standard policy restricts Gunthewari zones, but local PMC cooperative co-borrower rules override the restriction. We flag this immediately so you don't submit blindly.</p>
												</div>
											{:else if selectedCity === 'mumbai'}
												<div class="bg-white dark:bg-[#16160f] border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 mt-1.5 shadow-sm">
													<p class="text-xs font-bold text-gray-900 dark:text-white">Mumbai – Gaothan Boundaries Override</p>
													<p class="text-xs text-gray-400 dark:text-[#7a7a60] mt-1 leading-relaxed">ICICI policy restricts gaothan housing, but active MMRDA authority overrides the block with custom LTV calculations. We highlight this before you spend fuel on site visits.</p>
												</div>
											{:else}
												<div class="bg-white dark:bg-[#16160f] border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 mt-1.5 shadow-sm">
													<p class="text-xs font-bold text-gray-900 dark:text-white">Delhi – Lal Dora Plots Override</p>
													<p class="text-xs text-gray-400 dark:text-[#7a7a60] mt-1 leading-relaxed">SBI standard policies reject Lal Dora layout financing, but registrar stamp duty history overrides this with a 20% LTV haircut rule. We capture this exception upfront.</p>
												</div>
											{/if}
										</div>
									</div>
								</div>
							</div>
							
							<div class="mt-6 pt-4 border-t border-gray-200/50 dark:border-[#222218] text-xs text-gray-400 dark:text-[#5a5a40]">
								📍 <strong>How We Solve It:</strong> DigitalDSA checks local geographical policy overrides across 25 major cities before you submit, guaranteeing you never get caught off-guard by hyper-local rules.
							</div>
						</div>

					<!-- Visual 2: Income Haircut Slicer -->
					{:else if activeBottleneck === 1}
						<div class="flex-1 flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-center mb-5">
									<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40]">Borrower Eligibility Shock Simulator</p>
									<span class="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold border border-amber-100 dark:border-amber-900/40 uppercase tracking-wider">Unwritten Haircuts</span>
								</div>

								<!-- Income inputs -->
								<div class="space-y-4">
									<!-- Salaried Input -->
									<div>
										<div class="flex justify-between text-xs mb-1">
											<span class="text-gray-500 dark:text-[#6a6a50]">Salaried Income (0% Haircut)</span>
											<span class="font-bold font-mono text-gray-900 dark:text-white">₹{(salaryIncome).toLocaleString('en-IN')}</span>
										</div>
										<input
											type="range"
											min="20000"
											max="250000"
											step="5000"
											bind:value={salaryIncome}
											class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
										/>
									</div>

									<!-- Self-Employed Business Input -->
									<div>
										<div class="flex justify-between text-xs mb-1">
											<span class="text-gray-500 dark:text-[#6a6a50]">Business Income (35% Unwritten Haircut)</span>
											<div class="text-right">
												<span class="text-[10px] text-gray-400 line-through mr-1">₹{businessIncome.toLocaleString('en-IN')}</span>
												<span class="font-bold font-mono text-gray-900 dark:text-white">₹{Math.round(businessEligible).toLocaleString('en-IN')}</span>
											</div>
										</div>
										<input
											type="range"
											min="20000"
											max="250000"
											step="5000"
											bind:value={businessIncome}
											class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
										/>
									</div>

									<!-- Rental Income Input -->
									<div>
										<div class="flex justify-between text-xs mb-1">
											<span class="text-gray-500 dark:text-[#6a6a50]">Rental Receipts (30% Unwritten Haircut)</span>
											<div class="text-right">
												<span class="text-[10px] text-gray-400 line-through mr-1">₹{rentalIncome.toLocaleString('en-IN')}</span>
												<span class="font-bold font-mono text-gray-900 dark:text-white">₹{Math.round(rentalEligible).toLocaleString('en-IN')}</span>
											</div>
										</div>
										<input
											type="range"
											min="10000"
											max="150000"
											step="5000"
											bind:value={rentalIncome}
											class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
										/>
									</div>
								</div>
							</div>

							<!-- Totals Box -->
							<div class="mt-5 grid grid-cols-2 gap-3 bg-white dark:bg-[#14140e] border border-gray-200/50 dark:border-[#222218] rounded-2xl p-4 shadow-sm">
								<div>
									<span class="text-[10px] text-gray-400 dark:text-[#5a5a40]">What You Told The Client</span>
									<p class="text-sm font-bold font-mono text-gray-600 dark:text-gray-400">₹{totalGrossIncome.toLocaleString('en-IN')} / mo</p>
								</div>
								<div class="border-l border-gray-100 dark:border-[#1e1e14] pl-4">
									<span class="text-[10px] text-gray-400 dark:text-[#5a5a40]">What the Bank Actually Considers</span>
									<p class="text-base font-extrabold font-mono text-amber-600 dark:text-amber-500">₹{Math.round(totalEligibleIncome).toLocaleString('en-IN')} / mo</p>
								</div>
							</div>
						</div>

					<!-- Visual 3: PII Sanitizer & Masked Document -->
					{:else if activeBottleneck === 2}
						<div class="flex-1 flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-center mb-5">
									<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40]">Lead Security Simulator</p>
									
									<button
										onclick={() => piiSanitized = !piiSanitized}
										class="px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all select-none {piiSanitized ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-white dark:bg-[#14140e] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#222218]'}"
									>
										<span>{piiSanitized ? '🔒 Secure Mode: Active' : '🔓 Raw PII Exposed'}</span>
									</button>
								</div>

								<!-- Document Card -->
								<div class="bg-white dark:bg-[#14140e] border border-gray-200/50 dark:border-[#222218] rounded-2xl p-5 shadow-sm relative overflow-hidden max-w-sm mx-auto">
									<div class="flex items-center justify-between border-b border-gray-100 dark:border-[#1e1e14] pb-3 mb-3">
										<p class="text-[9px] font-mono text-gray-400 uppercase tracking-wider">File: Case #HL-7492</p>
										<span class="text-[8px] font-bold font-mono bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">PDF EXPORTABLE</span>
									</div>

									<div class="space-y-3 font-mono text-xs">
										<div class="flex justify-between py-1 border-b border-gray-100 dark:border-[#1a1a12]/50">
											<span class="text-gray-400 dark:text-[#5a5a40]">Borrower Name</span>
											<span class="text-right transition-all duration-300 {piiSanitized ? 'blur-sm bg-gray-100 dark:bg-[#1e1e14]/50 select-none text-transparent' : 'text-gray-900 dark:text-white font-bold'}">
												Aditya Vardhan Roy
											</span>
										</div>

										<div class="flex justify-between py-1 border-b border-gray-100 dark:border-[#1a1a12]/50">
											<span class="text-gray-400 dark:text-[#5a5a40]">Mobile Contact</span>
											<span class="text-right transition-all duration-300 {piiSanitized ? 'blur-sm bg-gray-100 dark:bg-[#1e1e14]/50 select-none text-transparent' : 'text-gray-900 dark:text-white font-bold'}">
												+91 98453 29402
											</span>
										</div>

										<div class="flex justify-between py-1 border-b border-gray-100 dark:border-[#1a1a12]/50">
											<span class="text-gray-400 dark:text-[#5a5a40]">PAN Card Identifier</span>
											<span class="text-right transition-all duration-300 {piiSanitized ? 'blur-sm bg-gray-100 dark:bg-[#1e1e14]/50 select-none text-transparent' : 'text-gray-900 dark:text-white font-bold'}">
												BVPPR8349Q
											</span>
										</div>

										<div class="flex justify-between py-1 border-b border-gray-100 dark:border-[#1a1a12]/50">
											<span class="text-gray-400 dark:text-[#5a5a40]">Monthly Obligations</span>
											<span class="font-bold text-gray-900 dark:text-white">₹75,000 / mo</span>
										</div>

										<div class="flex justify-between py-1">
											<span class="text-gray-400 dark:text-[#5a5a40]">CIBIL Credit Score</span>
											<span class="font-bold text-emerald-600 dark:text-emerald-400">764 (Excellent)</span>
										</div>
									</div>
								</div>
							</div>

							<div class="mt-6 pt-4 border-t border-gray-200/50 dark:border-[#222218] text-xs text-gray-400 dark:text-[#5a5a40]">
								🛡️ <strong>How We Solve It:</strong> Toggling secure mode masks all applicant PII (PAN, Aadhaar, Name) before sharing. The bank RM can run credit profiling, but cannot bypass your agent code.
							</div>
						</div>

					<!-- Visual 4: RM Broadcast Simulation -->
					{:else if activeBottleneck === 3}
						<div class="flex-1 flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-center mb-5">
									<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40]">Lender Connection Simulator</p>
									<span class="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[9px] font-extrabold border border-purple-100 dark:border-purple-900/40 uppercase tracking-wider">Instant sync</span>
								</div>

								<!-- Graphical connection node -->
								<div class="flex items-center justify-between max-w-sm mx-auto bg-white dark:bg-[#14140e] border border-gray-200/50 dark:border-[#222218] rounded-2xl p-5 shadow-sm mb-5 relative">
									<!-- Connection Line -->
									<div class="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gray-200 dark:bg-[#222218] -translate-y-1/2 z-0">
										{#if broadcastSimulating}
											<div class="h-full bg-amber-500 w-1/3 animate-ping"></div>
										{/if}
									</div>

									<!-- Node A: RM -->
									<div class="z-10 flex flex-col items-center gap-1.5 text-center">
										<div class="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-800 flex items-center justify-center text-xl">👤</div>
										<div>
											<p class="text-[9px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400">HDFC Bank</p>
											<p class="text-[10px] text-gray-900 dark:text-white font-bold">Lender RM</p>
										</div>
									</div>

									<!-- Node B: DSA -->
									<div class="z-10 flex flex-col items-center gap-1.5 text-center">
										<div class="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-xl">💼</div>
										<div>
											<p class="text-[9px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">YOUR AGENCY</p>
											<p class="text-[10px] text-gray-900 dark:text-white font-bold">DSA Cockpit</p>
										</div>
									</div>
								</div>

								<!-- Action button -->
								<div class="text-center">
									<button
										onclick={runBroadcastSimulation}
										disabled={broadcastSimulating}
										class="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1A1A14] dark:bg-white text-white dark:text-[#0C0C09] hover:bg-[#2c2c20] dark:hover:bg-gray-100 transition-all select-none disabled:opacity-50"
									>
										{broadcastSimulating ? '⚡ Dispatching Signal...' : 'Simulate Campaign Update'}
									</button>
								</div>

								<!-- Broadcast Notification Output -->
								{#if broadcastReceived}
									<div class="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 mt-4 animate-pulse flex items-start gap-3">
										<span class="text-xl">📡</span>
										<div>
											<p class="text-xs font-bold text-amber-800 dark:text-amber-500">Live Rate Sheet Received</p>
											<p class="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 font-medium">HDFC RM broadcasts rate drop: ROI cut to 8.45% for Home Loans > ₹75 Lakh. Processing charges waived for next 48 hours.</p>
										</div>
									</div>
								{/if}
							</div>

							<div class="mt-6 pt-4 border-t border-gray-200/50 dark:border-[#222218] text-xs text-gray-400 dark:text-[#5a5a40]">
								📡 <strong>How We Solve It:</strong> Our direct partner messaging feed keeps you directly linked to bank officers. You get instant rate drop sheets and policy adjustments without chasing people on WhatsApp.
							</div>
						</div>

					<!-- Visual 5: Attention Alert Cards -->
					{:else if activeBottleneck === 4}
						<div class="flex-1 flex flex-col justify-between">
							<div>
								<div class="flex justify-between items-center mb-5">
									<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40]">Active Alarm Center</p>
									<span class="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[9px] font-extrabold border border-red-100 dark:border-red-900/40 uppercase tracking-wider">TAT Alert Triggered</span>
								</div>

								<!-- Query card -->
								<div class="bg-white dark:bg-[#14140e] border border-red-200 dark:border-red-900/30 rounded-2xl p-5 shadow-sm max-w-sm mx-auto">
									<div class="flex justify-between items-start mb-3">
										<div>
											<span class="text-[8px] font-mono text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 px-1.5 py-0.5 rounded font-bold uppercase">Processing Blocked</span>
											<h4 class="text-xs font-extrabold text-gray-900 dark:text-white mt-2">Case #HL-8493 (ICICI Bank)</h4>
										</div>
										<span class="text-[10px] font-mono font-bold text-red-500">Stuck 48 hrs</span>
									</div>

									<p class="text-xs text-gray-500 dark:text-[#7a7a60] leading-relaxed mb-4">
										ICICI credit officer has flagged an expired statement: "Bank statement has crossed 30-day limit. Need immediate refresh."
									</p>

									<div class="flex items-center gap-2">
										{#if !queryResolved}
											<button
												onclick={() => queryResolved = true}
												class="flex-1 py-2 rounded-xl text-[10px] font-bold bg-[#1A1A14] dark:bg-white text-white dark:text-[#0C0C09] hover:bg-[#2c2c20] dark:hover:bg-gray-100 transition-all select-none"
											>
												📤 Upload Document & Clear Query
											</button>
										{:else}
											<div class="flex-1 py-2 rounded-xl text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 text-center select-none animate-bounce">
												✓ Document Uploaded. Processing resumed.
											</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="mt-6 pt-4 border-t border-gray-200/50 dark:border-[#222218] text-xs text-gray-400 dark:text-[#5a5a40]">
								⏳ <strong>How We Solve It:</strong> Instead of letting cases gather dust on empty desks, our automated Alarm Center alerts you the second a credit officer flags an issue, slashing file TAT from 21 to 9 days.
							</div>
						</div>
					{/if}

				</div>
			</div>

		</div>

	</div>
</section>

<style>
	/* range styling consistency */
	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #d97706;
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0,0,0,0.15);
	}
	:global(.dark) input[type='range']::-webkit-slider-thumb {
		background: #f59e0b;
	}
</style>
