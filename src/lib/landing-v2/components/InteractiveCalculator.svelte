<!-- src/lib/landing-v2/components/InteractiveCalculator.svelte -->
<script lang="ts">
	import { tokens } from '../design/tokens';
	import CommandCard from './ui/CommandCard.svelte';
	import Section from './ui/Section.svelte';
	import SectionHeader from './ui/SectionHeader.svelte';
	import NumberTicker from './ui/NumberTicker.svelte';

	interface Props {
		isDark?: boolean;
	}
	let { isDark = true }: Props = $props();

	// Inputs
	let loanAmount = $state<number>(5000000); // 50 Lakhs
	let netIncome = $state<number>(120000); // 1.2 Lakhs
	let tenureYears = $state<number>(20); // 20 years
	let interestRate = $state<number>(8.5); // 8.5%
	let currentEmi = $state<number>(10000); // 10k existing EMIs
	let propertyValue = $state<number>(7500000); // 75 Lakhs
	let userCibil = $state<number>(720);

	// EMI math
	let monthlyEmi = $derived.by(() => {
		const P = loanAmount;
		const r = interestRate / 12 / 100;
		const n = tenureYears * 12;
		if (r === 0) return Math.round(P / n);
		const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
		return Math.round(emi);
	});

	// FOIR & LTV math
	let computedFoir = $derived(Math.round(((currentEmi + monthlyEmi) / netIncome) * 100));
	let computedLtv = $derived(Math.round((loanAmount / propertyValue) * 100));

	// Bank rules checking
	const lenders = [
		{ name: 'State Bank of India', minCIBIL: 680, maxFOIR: 55, maxLTV: 90, rate: 8.4 },
		{ name: 'HDFC Private Bank', minCIBIL: 700, maxFOIR: 60, maxLTV: 80, rate: 8.5 },
		{ name: 'ICICI Private Bank', minCIBIL: 680, maxFOIR: 65, maxLTV: 75, rate: 8.75 },
		{ name: 'Bajaj Finance NBFC', minCIBIL: 600, maxFOIR: 65, maxLTV: 75, rate: 9.2 }
	];

	function evaluateEligibility(lender: (typeof lenders)[0]) {
		const reasons: string[] = [];
		if (userCibil < lender.minCIBIL) {
			reasons.push(`CIBIL ${userCibil} < ${lender.minCIBIL}`);
		}
		if (computedFoir > lender.maxFOIR) {
			reasons.push(`FOIR ${computedFoir}% > ${lender.maxFOIR}%`);
		}
		if (computedLtv > lender.maxLTV) {
			reasons.push(`LTV ${computedLtv}% > ${lender.maxLTV}%`);
		}
		return {
			eligible: reasons.length === 0,
			reason: reasons.length === 0 ? 'Meets all criteria' : reasons.join(', ')
		};
	}
</script>

<Section id="eligibility-calculator" {isDark} paddingClass="py-24 px-6">
	<SectionHeader
		label="ELIGIBILITY RULE ENGINE"
		title="Run eligibility checks instantly."
		description="Simulate lending parameters based on actual Indian banking policy thresholds (FOIR, LTV, CIBIL) documented in our EKB."
		{isDark}
	/>

	<div class="relative z-10 mt-8 grid grid-cols-1 gap-12 lg:grid-cols-12">
		<!-- Left Panel: Input Parameters -->
		<div class="flex flex-col gap-6 lg:col-span-6">
			<span
				class="block px-2 font-mono text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-[#94a3b8]"
				>Borrower Parameters</span
			>
			<CommandCard {isDark} variant="solid" className="p-8 md:p-10 space-y-5">
				<!-- Loan Amount -->
				<div class="space-y-2">
					<div class="flex items-center justify-between text-xs">
						<span class="font-medium text-slate-500 dark:text-[#94a3b8]">Desired Loan Amount</span>
						<span class="font-mono font-bold text-[#111827] dark:text-[#f8fafc]"
							>₹{Math.round(loanAmount / 100000)} Lakhs</span
						>
					</div>
					<div class="relative flex items-center">
						<input
							type="range"
							min="1000000"
							max="15000000"
							step="500000"
							bind:value={loanAmount}
							class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0f62fe] focus:outline-none dark:bg-slate-800"
						/>
					</div>
				</div>

				<!-- Monthly Net Income -->
				<div class="space-y-2">
					<div class="flex items-center justify-between text-xs">
						<span class="font-medium text-slate-500 dark:text-[#94a3b8]">Monthly Net Income</span>
						<span class="font-mono font-bold text-[#111827] dark:text-[#f8fafc]"
							>₹{netIncome.toLocaleString('en-IN')}</span
						>
					</div>
					<div class="relative flex items-center">
						<input
							type="range"
							min="30000"
							max="500000"
							step="5000"
							bind:value={netIncome}
							class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0f62fe] focus:outline-none dark:bg-slate-800"
						/>
					</div>
				</div>

				<!-- Property Value -->
				<div class="space-y-2">
					<div class="flex items-center justify-between text-xs">
						<span class="font-medium text-slate-500 dark:text-[#94a3b8]"
							>Estimated Property Value</span
						>
						<span class="font-mono font-bold text-[#111827] dark:text-[#f8fafc]"
							>₹{Math.round(propertyValue / 100000)} Lakhs</span
						>
					</div>
					<div class="relative flex items-center">
						<input
							type="range"
							min="1500000"
							max="25000000"
							step="500000"
							bind:value={propertyValue}
							class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0f62fe] focus:outline-none dark:bg-slate-800"
						/>
					</div>
				</div>

				<!-- Existing EMIs & CIBIL score -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<div class="flex items-center justify-between text-xs">
							<span class="block text-slate-500 dark:text-[#94a3b8]">CIBIL Score</span>
							<span class="font-mono font-bold text-[#111827] dark:text-[#f8fafc]">{userCibil}</span>
						</div>
						<input
							type="range"
							min="500"
							max="900"
							step="10"
							bind:value={userCibil}
							class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0f62fe] focus:outline-none dark:bg-slate-800"
						/>
					</div>
					<div class="space-y-2">
						<div class="flex items-center justify-between text-xs">
							<span class="block text-slate-500 dark:text-[#94a3b8]">Tenure Years</span>
							<span class="font-mono font-bold text-[#111827] dark:text-[#f8fafc]">{tenureYears} yrs</span>
						</div>
						<input
							type="range"
							min="5"
							max="30"
							step="1"
							bind:value={tenureYears}
							class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#0f62fe] focus:outline-none dark:bg-slate-800"
						/>
					</div>
				</div>
			</CommandCard>
		</div>

		<!-- Right Panel: Results Matrix -->
		<div class="flex flex-col gap-6 lg:col-span-6">
			<span
				class="block px-2 font-mono text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-[#94a3b8]"
				>Verification & Matching Output</span
			>
			<CommandCard {isDark} variant="glass" className="p-8 md:p-10 space-y-6">
				<!-- Live computations -->
				<div
					class="grid grid-cols-3 gap-4 border-b pb-4 transition-colors duration-300 {isDark
						? 'border-slate-800/80'
						: 'border-slate-200/80'}"
				>
					<div>
						<span class="block font-mono text-[9px] text-slate-500 uppercase dark:text-[#94a3b8]"
							>Monthly EMI</span
						>
						<span
							class="font-sans text-base font-bold {isDark
								? 'text-[#f8fafc]'
								: 'text-[#111827]'} mt-0.5 block">₹<NumberTicker value={monthlyEmi} /></span
						>
					</div>
					<div>
						<span class="block font-mono text-[9px] text-slate-500 uppercase dark:text-[#94a3b8]"
							>LTV Ratio</span
						>
						<span
							class="mt-0.5 block font-sans text-base font-bold {computedLtv <= 80
								? 'text-[#00a76f]'
								: 'text-rose-500/80'}"
						>
							<NumberTicker value={computedLtv} formatter={(v) => Math.round(v) + '%'} />
						</span>
					</div>
					<div>
						<span class="block font-mono text-[9px] text-slate-500 uppercase dark:text-[#94a3b8]"
							>FOIR Ratio</span
						>
						<span
							class="mt-0.5 block font-sans text-base font-bold {computedFoir <= 60
								? 'text-[#00a76f]'
								: 'text-rose-500/80'}"
						>
							<NumberTicker value={computedFoir} formatter={(v) => Math.round(v) + '%'} />
						</span>
					</div>
				</div>

				<!-- Lender eligibility checklist -->
				<div class="space-y-3 font-sans text-xs">
					<span
						class="block font-mono text-[9px] tracking-widest text-slate-500 uppercase dark:text-[#94a3b8]"
						>Bank Matching Matrix</span
					>
					{#each lenders as lender}
						{@const check = evaluateEligibility(lender)}
						<div
							class="flex items-center justify-between rounded-2xl border p-3 transition-all duration-350
                        {check.eligible
								? isDark
									? 'border-[#00a76f]/25 bg-[#00a76f]/5 opacity-100 hover:scale-[1.01] hover:border-[#00a76f]/45 hover:shadow-[0_2px_12px_rgba(0,167,111,0.03)]'
									: 'border-[#00a76f]/15 bg-[#00a76f]/3 opacity-100 hover:scale-[1.01] hover:border-[#00a76f]/35 hover:shadow-[0_4px_24px_rgba(15,98,254,0.01)]'
								: 'border-slate-200 opacity-25 dark:border-slate-800/60'}"
						>
							<div>
								<span
									class="font-sans font-bold {isDark && check.eligible
										? 'text-[#f8fafc]'
										: check.eligible
											? 'text-[#111827]'
											: 'text-slate-400'}">{lender.name}</span
								>
								<span class="mt-0.5 block text-[10px] text-slate-500"
									>Indicative Rate: {lender.rate}% p.a.</span
								>
							</div>
							<div class="flex flex-col items-end gap-1 text-right">
								{#if check.eligible}
									<div class="flex items-center gap-1.5">
										<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00a76f]"></span>
										<span class="font-mono text-[9px] font-bold text-[#00a76f]">ELIGIBLE</span>
									</div>
								{:else}
									<div class="flex items-center gap-1.5">
										<span class="h-1.5 w-1.5 rounded-full bg-rose-500/80"></span>
										<span class="font-mono text-[9px] font-bold text-rose-500/80">INELIGIBLE</span>
									</div>
								{/if}
								<span class="block font-mono text-[9px] text-slate-500">{check.reason}</span>
							</div>
						</div>
					{/each}
				</div>
			</CommandCard>
		</div>
	</div>
</Section>
