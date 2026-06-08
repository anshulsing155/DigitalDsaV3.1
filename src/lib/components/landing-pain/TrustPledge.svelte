<script lang="ts">
	// Premium trust section demonstrating strategic non-compete model
</script>

<section id="trust" class="relative py-20 sm:py-28 bg-white dark:bg-[#0C0C09] px-4 sm:px-8 lg:px-16 border-t border-gray-100 dark:border-[#1a1a12] transition-colors">

	<!-- Spotlight backdrop glow -->
	<div class="absolute bottom-0 left-0 w-[500px] h-[300px] bg-gradient-to-tr from-amber-500/5 dark:from-amber-400/2 to-transparent rounded-full blur-[120px] pointer-events-none"></div>

	<div class="w-full max-w-6xl mx-auto relative z-10">

		<!-- Two-column layout: pledge + proof -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

			<!-- LEFT: The non-compete B2B pledge (7 Columns) -->
			<div class="lg:col-span-7">
				<p class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-[#4a4a35] mb-3">Our Core Stance</p>
				<h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
					A software partner.<br/>Never your competitor.
				</h2>

				<p class="text-sm sm:text-base text-gray-500 dark:text-[#7a7a60] leading-relaxed mb-8">
					Most fintech platforms in India begin by offering free utilities to loan agents, accumulate borrower data, and eventually launch a direct-to-consumer digital loan portal that cuts agents out. DigitalDSA is structured exclusively as a B2B cockpit. We succeed when your agency succeeds.
				</p>

				<!-- The three non-negotiables -->
				<div class="flex flex-col gap-4">
					{#each [
						{
							icon: '🚫',
							title: 'Zero Borrower Contact',
							desc: 'DigitalDSA has no retail interface. We will never email, message, call, or solicit your applicant under any circumstance.'
						},
						{
							icon: '🔒',
							title: 'Absolute Lead Sovereignty',
							desc: 'We do not monetize, distribute, or broker individual file data. Your sourcing pipeline remains private and secure.'
						},
						{
							icon: '💰',
							title: 'Flat Subscription Billing',
							desc: 'We do not charge payout percentages, referral shares, or origination cuts. Your commission is 100% yours.'
						}
					] as item}
						<div class="flex items-start gap-4 p-5 rounded-2xl border border-gray-200/50 dark:border-[#1e1e14] bg-[#F8F7F2] dark:bg-[#111109] transition-all hover:scale-[1.01]">
							<span class="text-xl p-2 bg-white dark:bg-[#181812] rounded-xl border border-gray-200/30 dark:border-[#222218] flex-shrink-0 select-none">
								{item.icon}
							</span>
							<div>
								<p class="text-sm font-bold text-gray-900 dark:text-white mb-1">{item.title}</p>
								<p class="text-xs text-gray-400 dark:text-[#5a5a40] leading-relaxed">{item.desc}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- RIGHT: Professional analogy & real scale statistics (5 Columns) -->
			<div class="lg:col-span-5 flex flex-col gap-6">

				<!-- The analogy card -->
				<div class="relative rounded-3xl border border-amber-200/75 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/10 p-7 overflow-hidden shadow-sm">
					<div class="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 dark:bg-amber-900/10 rounded-full blur-2xl pointer-events-none"></div>
					<div class="relative z-10">
						<p class="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-4 select-none">B2B Philosophy</p>
						<blockquote class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-snug mb-4">
							"AutoCAD does not design buildings. It equips professional architects to build exceptional ones."
						</blockquote>
						<p class="text-xs sm:text-sm text-gray-500 dark:text-[#7a7a60] leading-relaxed">
							DigitalDSA operates on the same core principle. We design clean infrastructure for loan professionals. The relationship, the client, the sanction—remain entirely yours.
						</p>
					</div>
				</div>

				<!-- Live proof numbers -->
				<div class="bg-[#F8F7F2] dark:bg-[#111109] border border-gray-200 dark:border-[#1e1e14] rounded-3xl p-6 shadow-sm">
					<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40] mb-5 select-none">DigitalDSA Ecosystem Activity</p>
					<div class="grid grid-cols-2 gap-6">
						{#each [
							{ num: '2,400+', label: 'Active Agencies', sub: 'across India' },
							{ num: '₹847 Cr+', label: 'Loans Sourced', sub: 'processed pipeline' },
							{ num: '4,100+', label: 'Verified Bank RMs', sub: 'on-platform directory' },
							{ num: '77+', label: 'Active Lenders', sub: 'live policy variants' },
						] as stat}
							<div class="border-l-2 border-amber-300 dark:border-amber-700 pl-4">
								<p class="text-lg sm:text-xl font-extrabold font-mono text-gray-900 dark:text-white">{stat.num}</p>
								<p class="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">{stat.label}</p>
								<p class="text-[10px] text-gray-400 dark:text-[#5a5a40]">{stat.sub}</p>
							</div>
						{/each}
					</div>
				</div>

			</div>
		</div>
	</div>
</section>
