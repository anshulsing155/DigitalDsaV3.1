<script lang="ts">
	import { onMount } from 'svelte';

	let revealed = $state(false);
	let sectionRef: HTMLElement | undefined = $state(undefined);

	// Part-Payment Interactive States
	let loanAmount = $state(5000000); // ₹50 Lakh default
	let interestRate = $state(8.5); // 8.5% default
	let prepaymentAmount = $state(500000); // ₹5 Lakh prepayment default
	let tenureYears = $state(20); // 20 years default

	// Mathematical calculations for loan amortization and prepayments
	const monthlyRate = $derived((interestRate / 100) / 12);
	const totalMonths = $derived(tenureYears * 12);

	// Standard EMI calculation
	const standardEmi = $derived(
		(loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
		(Math.pow(1 + monthlyRate, totalMonths) - 1)
	);

	// Calculate total interest without prepayment
	const totalPaymentWithoutPrepayment = $derived(standardEmi * totalMonths);
	const totalInterestWithoutPrepayment = $derived(totalPaymentWithoutPrepayment - loanAmount);

	// Simulating amortization with prepayment at month 12
	const prepaymentSim = $derived.by(() => {
		let balance = loanAmount;
		let totalInterestPaid = 0;
		let monthsElapsed = 0;
		const prepaymentMonth = 12;

		while (balance > 0 && monthsElapsed < totalMonths) {
			monthsElapsed++;
			const interestForMonth = balance * monthlyRate;
			let principalPaid = standardEmi - interestForMonth;

			if (monthsElapsed === prepaymentMonth) {
				principalPaid += prepaymentAmount;
			}

			totalInterestPaid += interestForMonth;
			balance -= principalPaid;

			if (balance <= 0) {
				balance = 0;
				break;
			}
		}

		const monthsSaved = totalMonths - monthsElapsed;
		const netInterestSaved = Math.max(0, totalInterestWithoutPrepayment - totalInterestPaid);

		return {
			newMonths: monthsElapsed,
			monthsSaved,
			newInterest: totalInterestPaid,
			netInterestSaved
		};
	});

	function formatINR(num: number): string {
		if (num >= 10000000) {
			return '₹' + (num / 10000000).toFixed(2) + ' Cr';
		} else if (num >= 100000) {
			return '₹' + (num / 100000).toFixed(2) + ' Lakh';
		} else {
			return '₹' + Math.round(num).toLocaleString('en-IN');
		}
	}

	onMount(() => {
		if (!sectionRef) return;
		const observer = new IntersectionObserver(([e]) => {
			if (e.isIntersecting) { revealed = true; observer.disconnect(); }
		}, { threshold: 0.1 });
		observer.observe(sectionRef);
		return () => observer.disconnect();
	});
</script>

<section bind:this={sectionRef} id="planners" class="relative py-20 sm:py-28 bg-[#F8F7F2] dark:bg-[#0A0A07] px-4 sm:px-8 lg:px-16 border-t border-gray-100 dark:border-[#1a1a12] transition-colors overflow-hidden">

	<div class="w-full max-w-6xl mx-auto">

		<!-- Section header focusing on the real client-advisory struggle -->
		<div class="mb-16 max-w-3xl">
			<p class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-[#4a4a35] mb-3">The Client Advisory Pressure</p>
			<h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
				Stop scrambling on Excel sheets when clients ask for rate options.
			</h2>
			<p class="text-sm sm:text-base text-gray-400 dark:text-[#6a6a50] leading-relaxed">
				When a borrower calls asking: <em>"If I prepay ₹5 Lakhs next month, how much interest will I save? Will it reduce my EMI or my tenure?"</em> you shouldn't have to tell them you'll call them back. DigitalDSA equips your phone with real-time simulators so you can close deals right on the call.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

			<!-- LEFT: Description of Planner Utilities (5 Columns) -->
			<div class="lg:col-span-5 flex flex-col justify-between h-full py-2">
				<div class="space-y-6">
					<div>
						<div class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-3 select-none">
							<span>📊</span>
							Borrower Trust Building
						</div>
						<h3 class="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
							Never guess a prepayment timeline again.
						</h3>
						<p class="text-xs sm:text-sm text-gray-500 dark:text-[#7a7a60] leading-relaxed">
							Slide the prepayment tool right in front of your client or during a phone call. Instantly calculate net savings, remaining tenure, and EMI payouts. Build instant authority that separates your agency from amateur brokers.
						</p>
					</div>

					<div class="space-y-4">
						<div class="flex gap-3">
							<span class="text-lg">✂️</span>
							<div>
								<p class="text-xs font-bold text-gray-900 dark:text-white">Instant Tenure Reduction</p>
								<p class="text-xs text-gray-400 dark:text-[#5a5a40] mt-0.5 leading-relaxed">Confirm exactly how many months of monthly EMIs get slashed with a single lump-sum deposit.</p>
							</div>
						</div>

						<div class="flex gap-3">
							<span class="text-lg">📉</span>
							<div>
								<p class="text-xs font-bold text-gray-900 dark:text-white">Immediate Interest Savings</p>
								<p class="text-xs text-gray-400 dark:text-[#5a5a40] mt-0.5 leading-relaxed">Show your client precisely how much interest expense is saved, making refinancing options incredibly clear.</p>
							</div>
						</div>
					</div>
				</div>

				<div class="mt-8 pt-5 border-t border-gray-200/50 dark:border-[#222218] text-xs text-gray-400 dark:text-[#5a5a40]">
					✓ Part-Payment Calculator · ✓ Interest Saver Simulator · ✓ Direct Client Blueprint
				</div>
			</div>

			<!-- RIGHT: Interactive Part-Payment & Interest Saver (7 Columns) -->
			<div class="lg:col-span-7">
				<div class="bg-white dark:bg-[#111109] border border-gray-200 dark:border-[#1e1e14] rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
					
					<div class="flex justify-between items-center mb-6">
						<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#5a5a40] select-none">Live Advisory Simulator</p>
						<span class="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold border border-emerald-100 dark:border-emerald-900/40 uppercase tracking-wider select-none">Calculations Active</span>
					</div>

					<div class="space-y-4">
						<!-- Slider 1: Loan Amount Outstanding -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="loan-amount-range" class="text-xs font-medium text-gray-500 dark:text-[#6a6a50]">Outstanding Loan Amount</label>
								<span class="text-xs font-bold font-mono text-gray-900 dark:text-white">{formatINR(loanAmount)}</span>
							</div>
							<input
								id="loan-amount-range"
								type="range"
								min="1000000"
								max="15000000"
								step="200000"
								bind:value={loanAmount}
								class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
							/>
						</div>

						<!-- Slider 2: Interest Rate -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="interest-rate-range" class="text-xs font-medium text-gray-500 dark:text-[#6a6a50]">Annual Interest Rate (ROI)</label>
								<span class="text-xs font-bold font-mono text-gray-900 dark:text-white">{interestRate}%</span>
							</div>
							<input
								id="interest-rate-range"
								type="range"
								min="6.5"
								max="14.0"
								step="0.1"
								bind:value={interestRate}
								class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
							/>
						</div>

						<!-- Slider 3: Lump Sum Prepayment -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="prepayment-range" class="text-xs font-medium text-gray-500 dark:text-[#6a6a50]">Lump Sum Prepayment (at Month 12)</label>
								<span class="text-xs font-bold font-mono text-amber-600 dark:text-amber-500">{formatINR(prepaymentAmount)}</span>
							</div>
							<input
								id="prepayment-range"
								type="range"
								min="50000"
								max="2000000"
								step="25000"
								bind:value={prepaymentAmount}
								class="w-full h-1 bg-gray-200 dark:bg-[#1e1e14] rounded-lg cursor-pointer accent-amber-500"
							/>
						</div>
					</div>

					<!-- Visual Output Box -->
					<div class="mt-6 p-4 bg-[#F8F7F2] dark:bg-[#15150e] border border-gray-100 dark:border-[#1e1e14] rounded-2xl">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<span class="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-[#5a5a40] select-none">Total Net Interest Saved</span>
								<p class="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
									{formatINR(prepaymentSim.netInterestSaved)}
								</p>
							</div>
							<div class="border-l border-gray-200/50 dark:border-[#222218] pl-4">
								<span class="text-[9px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-[#5a5a40] select-none">Tenure Months Saved</span>
								<p class="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-500 mt-1">
									{prepaymentSim.monthsSaved} months
								</p>
								<p class="text-[9px] text-gray-400 dark:text-[#5a5a40] mt-0.5 font-medium">Saves {Math.floor(prepaymentSim.monthsSaved / 12)} yrs {prepaymentSim.monthsSaved % 12} mos</p>
							</div>
						</div>

						<div class="border-t border-dashed border-gray-200 dark:border-[#222218] my-3.5"></div>

						<div class="flex justify-between items-center text-xs">
							<span class="text-gray-500 dark:text-[#6a6a50]">Original Monthly EMI Payment</span>
							<span class="font-bold font-mono text-gray-900 dark:text-white">₹{Math.round(standardEmi).toLocaleString('en-IN')} / mo</span>
						</div>
					</div>

					<div class="mt-4 text-[9px] text-center text-gray-400 dark:text-[#5a5a40]">
						* Estimates calculated assuming prepayment is applied at the end of the 1st year of the loan.
					</div>

				</div>
			</div>

		</div>
	</div>
</section>

<style>
	/* range consistency styling */
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
