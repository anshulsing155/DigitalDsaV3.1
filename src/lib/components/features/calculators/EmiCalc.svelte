<script lang="ts">
	import { onMount } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { ToWords } from 'to-words';
	import Button from '../../ui/Button.svelte';
	import CurrencyFormateInput from '../../sections/CurrencyFormateInput.svelte';

	const toWords = new ToWords();

	// ── Core inputs ───────────────────────────────────────────────────────────────
	let loanAmount = $state(5_000_000);
	let interestRate = $state(8.5);
	let loanTenure = $state(20);
	let tenureUnit = $state('Years'); // 'Years' | 'Months'

	const _now = new Date();
	let startDate = $state(`${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}`);

	// ── Advanced options ──────────────────────────────────────────────────────────
	let showAdvanced = $state(false);
	let emiStepUpPct = $state(0);

	// One-time prepayment
	let prepayEnabled = $state(false);
	let prepayMonth = $state(12); // 1-indexed month number in the schedule
	let prepayType = $state('fixed'); // 'fixed' | 'percent'
	let prepayValue = $state(0);

	// ── View / UI state ───────────────────────────────────────────────────────────
	let yearView = $state('calendar'); // 'calendar' | 'financial'
	let expandedIndex = $state(-1);
	let showSkeleton = $state(false);

	// ── Results ───────────────────────────────────────────────────────────────────
	let emi = $state(0);
	let totalInterest = $state(0);
	let interestSaved = $state(0);
	let monthsSaved = $state(0);
	let schedule = $state<any[]>([]);
	let yearlyData = $state<any[]>([]);

	// ── Errors ────────────────────────────────────────────────────────────────────
	let loanAmountError = $state('');
	let interestRateError = $state('');
	let loanTenureError = $state('');
	let stepUpError = $state('');
	let prepayError = $state('');

	// ── Animated EMI counter ──────────────────────────────────────────────────────
	const animatedEmi = tweened(0, { duration: 500, easing: cubicOut });

	// ── Derived ───────────────────────────────────────────────────────────────────
	const tenureMonths = $derived(
		tenureUnit === 'Years' ? Math.round(loanTenure * 12) : Math.round(loanTenure)
	);

	const prepayMonthLabel = $derived.by(() => {
		if (!startDate || !prepayMonth) return '';
		const [y, m] = startDate.split('-').map(Number);
		const d = new Date(y, m - 1 + (prepayMonth - 1));
		return d.toLocaleString('default', { month: 'short', year: 'numeric' });
	});

	const anyEnhancementActive = $derived(emiStepUpPct > 0 || (prepayEnabled && prepayValue > 0));
	const showPrepayCol = $derived(
		prepayEnabled && prepayValue > 0 && schedule.some((r) => r.isPrepayMonth)
	);

	// ── Unit switch: CONVERT value, don't reset ───────────────────────────────────
	function handleUnitChange(newUnit: string) {
		if (newUnit === tenureUnit) return;
		loanTenure =
			newUnit === 'Years'
				? Math.round((loanTenure / 12) * 10) / 10
				: Math.round(loanTenure * 12);
		tenureUnit = newUnit;
		loanTenureError = '';
		showSkeleton = true;
	}

	// ── EMI formula ───────────────────────────────────────────────────────────────
	function calcMonthlyEmi(principal: number, annualRatePct: number, months: number) {
		const r = annualRatePct / 12 / 100;
		if (r === 0) return principal / months;
		const factor = Math.pow(1 + r, months);
		return (principal * r * factor) / (factor - 1);
	}

	// ── Build amortisation schedule ───────────────────────────────────────────────
	function buildSchedule() {
		const r = interestRate / 12 / 100;
		const n = tenureMonths;
		const baseEmi = calcMonthlyEmi(loanAmount, interestRate, n);
		const hasEnhancement = emiStepUpPct > 0 || (prepayEnabled && prepayValue > 0);

		// Flat baseline — only needed for savings comparison
		let baselineInterest = 0;
		if (hasEnhancement) {
			let ob = loanAmount;
			for (let i = 0; i < n; i++) {
				if (ob < 0.005) break;
				const interest = ob * r;
				const principal = Math.min(baseEmi, ob + interest) - interest;
				ob = Math.max(ob - principal, 0);
				baselineInterest += interest;
			}
		}

		// Main schedule with step-up and/or prepayment
		const [sy, sm] = startDate.split('-').map(Number);
		let outstanding = loanAmount;
		let accruedInterest = 0;
		const rows = [];

		for (let i = 0; i < n; i++) {
			if (outstanding < 0.005) break;

			const monthNum = i + 1;
			const yearIndex = Math.floor(i / 12);

			// Step-up: compound EMI by emiStepUpPct every 12 months.
			const currentEmi = baseEmi * Math.pow(1 + emiStepUpPct / 100, yearIndex);

			const interest = outstanding * r;
			const effectiveEmi = Math.min(currentEmi, outstanding + interest);
			const principal = effectiveEmi - interest;
			outstanding = Math.max(outstanding - principal, 0);
			accruedInterest += interest;

			// One-time prepayment
			let prepayAmt = 0;
			if (prepayEnabled && prepayValue > 0 && monthNum === prepayMonth) {
				prepayAmt = prepayType === 'fixed' ? prepayValue : (prepayValue / 100) * outstanding;
				prepayAmt = Math.min(prepayAmt, outstanding);
				outstanding = Math.max(outstanding - prepayAmt, 0);
			}

			const d = new Date(sy, sm - 1 + i);
			rows.push({
				monthNumber: monthNum,
				numericDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
				formattedDate: `${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()}`,
				emi: effectiveEmi,
				interest,
				principal,
				prepayment: prepayAmt,
				closingBalance: outstanding,
				paidToDate: ((loanAmount - outstanding) / loanAmount) * 100,
				isPrepayMonth: prepayAmt > 0,
				stepUpYear: yearIndex + 1
			});
		}

		return {
			monthlyEmi: baseEmi,
			rows,
			totalInterest: accruedInterest,
			interestSaved: hasEnhancement ? Math.max(0, baselineInterest - accruedInterest) : 0,
			monthsSaved: hasEnhancement ? Math.max(0, n - rows.length) : 0
		};
	}

	// ── Grouping ──────────────────────────────────────────────────────────────────
	function getYearKey(formattedDate: string, mode: string) {
		const [mon, yr] = formattedDate.split('-');
		const year = parseInt(yr, 10);
		if (mode === 'calendar') return String(year);
		const monthNum = new Date(`${mon} 1, 2000`).getMonth() + 1;
		return monthNum >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
	}

	function groupByYear(rows: any[], mode: string) {
		const map = new Map();
		for (const row of rows) {
			const key = getYearKey(row.formattedDate, mode);
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(row);
		}
		return Array.from(map.entries()).map(([yearKey, months]) => ({
			yearKey,
			principal: months.reduce((s: number, r: any) => s + r.principal, 0),
			interest: months.reduce((s: number, r: any) => s + r.interest, 0),
			prepayment: months.reduce((s: number, r: any) => s + r.prepayment, 0),
			closingBalance: months[months.length - 1].closingBalance,
			paidToDate: months[months.length - 1].paidToDate,
			hasPrepay: months.some((r: any) => r.isPrepayMonth),
			months
		}));
	}

	// ── Validation ────────────────────────────────────────────────────────────────
	function validate() {
		loanAmountError = interestRateError = loanTenureError = stepUpError = prepayError = '';
		let ok = true;

		if (!loanAmount || loanAmount < 50_000) {
			loanAmountError = 'Minimum loan amount is ₹50,000.';
			ok = false;
		}
		if (!interestRate || interestRate < 1 || interestRate > 50) {
			interestRateError = 'Interest rate must be between 1% and 50%.';
			ok = false;
		}
		if (tenureUnit === 'Years' && (loanTenure < 1 || loanTenure > 40)) {
			loanTenureError = 'Tenure must be between 1 and 40 years.';
			ok = false;
		}
		if (tenureUnit === 'Months' && (loanTenure < 6 || loanTenure > 480)) {
			loanTenureError = 'Tenure must be between 6 and 480 months.';
			ok = false;
		}
		if (emiStepUpPct < 0 || emiStepUpPct > 50) {
			stepUpError = 'Step-up must be between 0% and 50%.';
			ok = false;
		}
		if (prepayEnabled) {
			if (prepayMonth < 1 || prepayMonth > tenureMonths) {
				prepayError = `Month must be between 1 and ${tenureMonths}.`;
				ok = false;
			} else if (prepayValue <= 0) {
				prepayError = 'Enter a prepayment amount greater than 0.';
				ok = false;
			} else if (prepayType === 'percent' && prepayValue > 100) {
				prepayError = 'Percentage cannot exceed 100%.';
				ok = false;
			}
		}
		return ok;
	}

	// ── Calculate ─────────────────────────────────────────────────────────────────
	function calculate() {
		if (!validate()) return;
		showSkeleton = false;

		const result = buildSchedule();
		emi = result.monthlyEmi;
		totalInterest = result.totalInterest;
		interestSaved = result.interestSaved;
		monthsSaved = result.monthsSaved;
		schedule = result.rows;
		yearlyData = groupByYear(schedule, yearView);
		expandedIndex = -1;
		animatedEmi.set(emi);

		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			setTimeout(() => {
				document
					.getElementById('resultView')
					?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 80);
		}
	}

	function switchView(mode: string) {
		yearView = mode;
		if (schedule.length > 0) {
			yearlyData = groupByYear(schedule, mode);
			expandedIndex = -1;
		}
	}

	function toggleRow(i: number) {
		expandedIndex = expandedIndex === i ? -1 : i;
		if (expandedIndex === i) {
			setTimeout(() => {
				document.getElementById(`row-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}, 60);
		}
	}

	const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
	const fmtPct = (n: number) => n.toFixed(1) + '%';
	const colCount = $derived(showPrepayCol ? 7 : 6);
	const minWidth = $derived(showPrepayCol ? '720px' : '640px');

	onMount(calculate);
</script>

<section>
	<div class="grid justify-center md:grid-cols-7 gap-6 md:gap-[2rem]">
		<!-- ── Input Panel ─────────────────────────────────────────────────────── -->
		<div class="relative grid gap-[1rem] bg-[#f4f4f4] py-6 px-4 shadow-md md:col-span-3">
			<div class="flex flex-col gap-5 pb-[2rem]">
				<!-- Loan Amount -->
				<div class="flex flex-col gap-2">
					<label class="font-FourthHead text-minParaFont lg:text-paraFont" for="loanAmt">
						Loan Amount <span class="font-Paragraph text-minParaFont text-gray-500">(₹)</span>
					</label>
					<CurrencyFormateInput
						placeHolder="e.g. 50,00,000"
						bind:inputsValue={loanAmount}
						onInput={() => {
							loanAmountError = '';
							showSkeleton = true;
						}}
					/>
					{#if loanAmountError}
						<p class="text-xs text-dangerColor">{loanAmountError}</p>
					{:else if loanAmount > 0}
						<p class="text-xs text-gray-500 pl-1">{toWords.convert(loanAmount)}</p>
					{/if}
				</div>

				<!-- Annual Interest Rate -->
				<div class="flex flex-col gap-2">
					<label class="font-FourthHead text-minParaFont lg:text-paraFont" for="rate">
						Annual Interest Rate
					</label>
					<div
						class="flex items-center border border-black bg-white font-Paragraph text-minParaFont md:text-paraFont"
					>
						<input
							id="rate"
							bind:value={interestRate}
							onwheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
							oninput={() => {
								interestRateError = '';
								showSkeleton = true;
							}}
							class="w-full py-2 pl-3 pr-0 outline-none"
							type="number"
							min="1"
							max="50"
							step="0.05"
							placeholder="e.g. 8.5"
						/>
						<span class="px-3 text-gray-500 select-none">%</span>
					</div>
					{#if interestRateError}
						<p class="text-xs text-dangerColor">{interestRateError}</p>
					{/if}
				</div>

				<!-- Loan Tenure -->
				<div class="flex flex-col gap-2">
					<label class="font-FourthHead text-minParaFont lg:text-paraFont" for="tenure">
						Loan Tenure
						<span class="font-Paragraph text-minParaFont text-gray-500">
							({tenureUnit === 'Years' ? '1–40 years' : '6–480 months'})
						</span>
					</label>
					<div
						class="flex items-center border border-black bg-white font-Paragraph text-minParaFont md:text-paraFont"
					>
						<input
							id="tenure"
							bind:value={loanTenure}
							onwheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
							oninput={() => {
								loanTenureError = '';
								showSkeleton = true;
							}}
							class="w-full py-2 pl-3 pr-0 outline-none"
							type="number"
							step={tenureUnit === 'Years' ? 1 : 12}
							min={tenureUnit === 'Years' ? 1 : 6}
							max={tenureUnit === 'Years' ? 40 : 480}
						/>
						<div class="flex text-xs border-l border-black shrink-0 bg-white">
							<button
								type="button"
								class="px-3 py-2 transition-colors {tenureUnit === 'Months'
									? 'bg-black text-white'
									: 'bg-white text-black hover:bg-gray-100'}"
								onclick={() => handleUnitChange('Months')}>Mo</button
							>
							<button
								type="button"
								class="px-3 py-2 border-l border-black transition-colors {tenureUnit === 'Years'
									? 'bg-black text-white'
									: 'bg-white text-black hover:bg-gray-100'}"
								onclick={() => handleUnitChange('Years')}>Yr</button
							>
						</div>
					</div>
					{#if loanTenureError}
						<p class="text-xs text-dangerColor">{loanTenureError}</p>
					{:else}
						<p class="text-xs text-gray-400 pl-1">= {tenureMonths} monthly payments</p>
					{/if}
				</div>

				<!-- First EMI Month -->
				<div class="flex flex-col gap-2">
					<label class="font-FourthHead text-minParaFont lg:text-paraFont" for="startDate">
						First EMI Month
						<span class="font-Paragraph text-minParaFont text-gray-500">(optional)</span>
					</label>
					<input
						id="startDate"
						bind:value={startDate}
						onchange={() => {
							showSkeleton = true;
						}}
						type="month"
						class="border border-black bg-white py-2 px-3 outline-none font-Paragraph text-minParaFont md:text-paraFont w-full"
					/>
				</div>

				<!-- ── Advanced Options ────────────────────────────────────────────── -->
				<div class="border border-gray-300 rounded-sm">
					<button
						type="button"
						class="flex w-full items-center justify-between px-3 py-2 font-FourthHead text-minParaFont lg:text-paraFont bg-gray-100 hover:bg-gray-200 transition-colors"
						onclick={() => (showAdvanced = !showAdvanced)}
					>
						<span>Advanced Options</span>
						<i
							class="fa-solid fa-chevron-down text-xs transition-transform duration-200"
							style="transform: rotate({showAdvanced ? '180deg' : '0deg'})"
						></i>
					</button>

					{#if showAdvanced}
						<div class="flex flex-col gap-5 px-3 py-4">
							<!-- Annual EMI Step-Up -->
							<div class="flex flex-col gap-2">
								<label class="font-FourthHead text-minParaFont lg:text-paraFont" for="stepUp">
									Annual EMI Increase
									<span class="font-Paragraph text-minParaFont text-gray-500"
										>(% / year, optional)</span
									>
								</label>
								<div
									class="flex items-center border border-black bg-white font-Paragraph text-minParaFont md:text-paraFont"
								>
									<input
										id="stepUp"
										bind:value={emiStepUpPct}
										onwheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
										oninput={() => {
											stepUpError = '';
											showSkeleton = true;
										}}
										class="w-full py-2 pl-3 pr-0 outline-none"
										type="number"
										min="0"
										max="50"
										step="0.5"
										placeholder="0"
									/>
									<span class="px-3 text-gray-500 select-none">% / yr</span>
								</div>
								{#if stepUpError}
									<p class="text-xs text-dangerColor">{stepUpError}</p>
								{:else if emiStepUpPct > 0}
									<p class="text-xs text-gray-400 pl-1">
										EMI compounds yearly · Year 2 = ₹{fmt(emi * (1 + emiStepUpPct / 100))}
									</p>
								{:else}
									<p class="text-xs text-gray-400 pl-1">0 = flat EMI for full tenure</p>
								{/if}
							</div>

							<!-- One-Time Prepayment -->
							<div class="flex flex-col gap-2">
								<div class="flex items-center justify-between">
									<span class="font-FourthHead text-minParaFont lg:text-paraFont"
										>One-Time Prepayment</span
									>
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											bind:checked={prepayEnabled}
											onchange={() => {
												prepayError = '';
												showSkeleton = true;
											}}
											class="custom-radio animate-none"
										/>
										<span class="text-xs font-Paragraph text-gray-500">Enable</span>
									</label>
								</div>

								{#if prepayEnabled}
									<div class="flex flex-col gap-3 pt-1">
										<!-- Amount type: Fixed ₹ or % of balance -->
										<div class="flex border border-black overflow-hidden text-xs font-Paragraph">
											<button
												type="button"
												class="flex-1 py-2 transition-colors {prepayType === 'fixed'
													? 'bg-black text-white'
													: 'bg-white text-black hover:bg-gray-100'}"
												onclick={() => {
													prepayType = 'fixed';
													prepayError = '';
													showSkeleton = true;
												}}
											>
												Fixed Amount (₹)
											</button>
											<button
												type="button"
												class="flex-1 py-2 border-l border-black transition-colors {prepayType ===
												'percent'
													? 'bg-black text-white'
													: 'bg-white text-black hover:bg-gray-100'}"
												onclick={() => {
													prepayType = 'percent';
													prepayError = '';
													showSkeleton = true;
												}}
											>
												% of Balance
											</button>
										</div>

										<!-- Value input -->
										{#if prepayType === 'fixed'}
											<CurrencyFormateInput
												placeHolder="e.g. 2,00,000"
												bind:inputsValue={prepayValue}
												onInput={() => {
													prepayError = '';
													showSkeleton = true;
												}}
											/>
										{:else}
											<div
												class="flex items-center border border-black bg-white font-Paragraph text-minParaFont"
											>
												<input
													bind:value={prepayValue}
													onwheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
													oninput={() => {
														prepayError = '';
														showSkeleton = true;
													}}
													class="w-full py-2 pl-3 pr-0 outline-none"
													type="number"
													min="0.1"
													max="100"
													step="1"
													placeholder="e.g. 20"
												/>
												<span class="px-3 text-gray-500 select-none">% of balance</span>
											</div>
										{/if}

										<!-- Month picker with calendar label -->
										<div class="flex items-center gap-3">
											<div class="flex flex-col gap-1 flex-1">
												<label class="text-xs text-gray-500 font-Paragraph" for="prepayMon">
													At month
												</label>
												<div
													class="flex items-center border border-black bg-white font-Paragraph text-minParaFont"
												>
													<input
														id="prepayMon"
														bind:value={prepayMonth}
														onwheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
														oninput={() => {
															prepayError = '';
															showSkeleton = true;
														}}
														class="w-full py-2 pl-3 pr-0 outline-none"
														type="number"
														min="1"
														max={tenureMonths}
														step="1"
													/>
													<span class="px-2 text-gray-400 text-xs select-none"
														>of {tenureMonths}</span
													>
												</div>
											</div>
											{#if prepayMonthLabel}
												<div class="flex flex-col justify-end shrink-0 pb-0">
													<span
														class="text-xs font-semibold text-gray-700 bg-yellow-100 border border-yellow-300 px-2 py-[6px] rounded"
													>
														{prepayMonthLabel}
													</span>
												</div>
											{/if}
										</div>

										{#if prepayError}
											<p class="text-xs text-dangerColor">{prepayError}</p>
										{:else if prepayValue > 0}
											<p class="text-xs text-gray-400 font-Paragraph">
												{prepayType === 'fixed'
													? `₹${fmt(prepayValue)} prepaid after EMI in month ${prepayMonth} (${prepayMonthLabel})`
													: `${prepayValue}% of outstanding balance prepaid after EMI in month ${prepayMonth}`}
											</p>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<div class="flex justify-center">
				<button
					class="w-full rounded-full bg-btnBg border border-black px-[3rem] py-3 font-Paragraph text-minParaFont md:text-paraFont hover:opacity-90 md:w-auto cursor-pointer"
					onclick={calculate}
				>
					Calculate EMI
				</button>
			</div>
		</div>

		<!-- ── Result Panel ─────────────────────────────────────────────────────── -->
		{#if showSkeleton}
			<div
				id="resultView"
				class="grid items-center justify-center gap-2 bg-darkColor p-[2rem] md:col-span-4"
			>
				<div class="flex flex-col gap-[2rem]">
					<div class="flex flex-col items-center gap-3 text-center">
						<div class="h-3 animate-pulse rounded bg-gray-600 w-32"></div>
						<div class="h-5 animate-pulse rounded bg-gray-700 w-48"></div>
					</div>
					<div class="h-[1px] w-full bg-gray-600"></div>
					<div class="grid grid-cols-3 gap-6 text-center">
						{#each [1, 2, 3] as _}
							<div class="grid gap-2">
								<div class="h-2 animate-pulse rounded bg-gray-600 w-20 mx-auto"></div>
								<div class="h-4 animate-pulse rounded bg-gray-700 w-24 mx-auto"></div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if schedule.length > 0}
			<div id="resultView" class="grid gap-2 bg-darkColor py-[2rem] md:p-[2rem] md:col-span-4">
				<div class="flex flex-col gap-[2rem] p-[1rem] bg-mainBg w-full">
					<!-- EMI headline -->
					<div class="flex flex-col items-center justify-center gap-1 text-center">
						<p class="font-Paragraph text-xs text-gray-500 uppercase tracking-widest">
							{emiStepUpPct > 0 ? 'Starting Monthly EMI' : 'Monthly EMI'}
						</p>
						<p class="font-Paragraph text-mobSubHead md:text-minHeadFont">
							₹ {fmt($animatedEmi)}
						</p>
						{#if emiStepUpPct > 0}
							<p class="text-xs text-gray-500 font-Paragraph">
								→ Year 2: ₹{fmt(emi * (1 + emiStepUpPct / 100))} · grows {emiStepUpPct}% yearly
							</p>
						{/if}
					</div>

					<div
						class="h-[1px] w-full bg-gradient-to-r from-transparent via-black to-transparent"
					></div>

					<!-- Three-stat row -->
					<div class="grid grid-cols-3 gap-4 text-center text-black">
						<div class="flex flex-col gap-1">
							<p class="font-Paragraph text-minParaFont md:text-paraFont text-gray-500">Principal</p>
							<p class="font-Paragraph text-minParaFont sm:text-paraFont font-semibold">
								₹{fmt(loanAmount)}
							</p>
						</div>
						<div class="flex flex-col gap-1">
							<p class="font-Paragraph text-minParaFont md:text-paraFont text-gray-500">
								Total Interest
							</p>
							<p class="font-Paragraph text-minParaFont sm:text-paraFont font-semibold">
								₹{fmt(totalInterest)}
							</p>
						</div>
						<div class="flex flex-col gap-1">
							<p class="font-Paragraph text-minParaFont md:text-paraFont text-gray-500">
								Total Payable
							</p>
							<p class="font-Paragraph text-minParaFont sm:text-paraFont font-semibold">
								₹{fmt(loanAmount + totalInterest)}
							</p>
						</div>
					</div>

					<!-- Savings callout -->
					{#if anyEnhancementActive && (interestSaved > 0 || monthsSaved > 0)}
						<div
							class="grid grid-cols-2 gap-3 rounded border border-green-300 bg-green-50 p-3 text-center text-green-800 font-Paragraph"
						>
							<div class="flex flex-col gap-1">
								<p class="font-semibold text-sm">₹{fmt(interestSaved)}</p>
								<p class="text-xs">Interest saved vs flat EMI</p>
							</div>
							<div class="flex flex-col gap-1">
								<p class="font-semibold text-sm">{monthsSaved} months</p>
								<p class="text-xs">Loan closes earlier</p>
							</div>
						</div>
					{/if}

					<!-- Cost of credit bar -->
					<div class="flex flex-col gap-1 font-Paragraph">
						<div class="flex text-xs justify-between text-gray-500">
							<span>Principal {fmtPct((loanAmount / (loanAmount + totalInterest)) * 100)}</span>
							<span>Interest {fmtPct((totalInterest / (loanAmount + totalInterest)) * 100)}</span>
						</div>
						<div class="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
							<div
								class="h-full bg-btnBg transition-all duration-500"
								style="width: {(loanAmount / (loanAmount + totalInterest)) * 100}%"
							></div>
							<div class="h-full bg-darkColor flex-1"></div>
						</div>
						<p class="text-xs text-gray-400 text-center font-Paragraph">
							Cost of credit: ₹{((loanAmount + totalInterest) / loanAmount).toFixed(2)} per ₹1 borrowed
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Amortisation Table ──────────────────────────────────────────────── -->
		{#if schedule.length > 0}
			<div id="amortizationTable" class="w-full md:col-span-7">
				<!-- Year-view switcher -->
				<div class="flex flex-col items-center gap-1 py-4 font-Paragraph">
					<p class="font-Paragraph text-minParaFont text-gray-500">Group schedule by</p>
					<div class="flex border border-black overflow-hidden rounded-sm text-sm">
						<button
							type="button"
							class="px-5 py-2 transition-colors cursor-pointer {yearView === 'calendar'
								? 'bg-darkColor text-white'
								: 'bg-white text-black hover:bg-gray-100'}"
							onclick={() => switchView('calendar')}
						>
							Calendar Year
						</button>
						<button
							type="button"
							class="px-5 py-2 border-l border-black transition-colors cursor-pointer {yearView ===
							'financial'
								? 'bg-darkColor text-white'
								: 'bg-white text-black hover:bg-gray-100'}"
							onclick={() => switchView('financial')}
						>
							Financial Year
							<span class="text-gray-400 text-xs ml-1">(Apr–Mar)</span>
						</button>
					</div>
				</div>

				<!-- Scrollable table -->
				<div class="mx-auto h-[28rem] md:h-[34rem] w-full border border-black overflow-auto">
					<!-- Header -->
					<div
						class="sticky top-0 z-10 grid bg-darkColor text-center text-white"
						style="grid-template-columns: repeat({colCount}, minmax(0,1fr)); min-width:{minWidth}"
					>
						{#each ['Year / Month', 'Principal (₹)', 'Interest (₹)', emiStepUpPct > 0 ? 'EMI (₹) ↑' : 'Total EMI (₹)', ...(showPrepayCol ? ['Prepayment (₹)'] : []), 'Balance (₹)', 'Loan Paid'] as col}
							<div class="p-2 font-FifthHead text-minParaFont lg:text-subParaFont">{col}</div>
						{/each}
					</div>

					<!-- Body -->
					<div style="min-width:{minWidth}">
						{#each yearlyData as row, i}
							<!-- Year summary row -->
							<!-- svelte-ignore a11y_interactive_supports_focus -->
							<div
								id="row-{i}"
								role="button"
								class="grid border-b border-[#b4b5b6] cursor-pointer text-center transition-colors font-Paragraph"
								class:bg-yellow-50={row.hasPrepay}
								class:bg-gray-50={!row.hasPrepay && i % 2 === 0}
								class:hover:bg-yellow-100={row.hasPrepay}
								class:hover:bg-gray-100={!row.hasPrepay}
								style="grid-template-columns: repeat({colCount}, minmax(0,1fr))"
								onclick={() => toggleRow(i)}
								onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleRow(i)}
							>
								<div
									class="flex items-center justify-center gap-2 p-2 font-FifthHead text-minParaFont"
								>
									<span
										class="flex h-5 w-5 items-center justify-center rounded-full bg-darkColor shrink-0"
									>
										<i
											class="fa-solid {expandedIndex === i
												? 'fa-minus'
												: 'fa-plus'} text-white text-[10px]"
										></i>
									</span>
									{row.yearKey}
									{#if row.hasPrepay}
										<span class="text-[9px] bg-green-200 text-green-800 px-1 rounded leading-tight"
											>prepay</span
										>
									{/if}
								</div>
								<div class="p-2 text-minParaFont font-Paragraph">{fmt(row.principal)}</div>
								<div class="p-2 text-minParaFont font-Paragraph">{fmt(row.interest)}</div>
								<div class="p-2 text-minParaFont font-Paragraph">
									{fmt(row.principal + row.interest)}
								</div>
								{#if showPrepayCol}
									<div class="p-2 text-minParaFont text-green-700 font-semibold font-Paragraph">
										{row.prepayment > 0 ? fmt(row.prepayment) : '—'}
									</div>
								{/if}
								<div class="p-2 text-minParaFont font-Paragraph">{fmt(row.closingBalance)}</div>
								<div
									class="p-2 text-minParaFont flex flex-col items-center justify-center gap-1 font-Paragraph"
								>
									<span>{fmtPct(row.paidToDate)}</span>
									<div class="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
										<div class="h-full bg-btnBg" style="width:{row.paidToDate}%"></div>
									</div>
								</div>
							</div>

							<!-- Expanded monthly rows -->
							{#if expandedIndex === i}
								{#each row.months as m}
									<div
										class="grid border-b text-center text-white font-Paragraph"
										class:bg-darkColor={!m.isPrepayMonth}
										class:bg-green-800={m.isPrepayMonth}
										style="grid-template-columns: repeat({colCount}, minmax(0,1fr))"
									>
										<div
											class="p-2 font-FifthHead text-minParaFont flex items-center justify-center gap-1"
										>
											{m.formattedDate}
											{#if m.isPrepayMonth}
												<span
													class="text-[8px] bg-green-300 text-green-900 px-1 rounded leading-tight"
													>+prepay</span
												>
											{/if}
										</div>
										<div class="p-2 text-minParaFont font-Paragraph">{fmt(m.principal)}</div>
										<div class="p-2 text-minParaFont font-Paragraph">{fmt(m.interest)}</div>
										<div class="p-2 text-minParaFont font-Paragraph">{fmt(m.emi)}</div>
										{#if showPrepayCol}
											<div class="p-2 text-minParaFont font-Paragraph">
												{m.prepayment > 0 ? fmt(m.prepayment) : '—'}
											</div>
										{/if}
										<div class="p-2 text-minParaFont font-Paragraph">{fmt(m.closingBalance)}</div>
										<div class="p-2 text-minParaFont font-Paragraph">{fmtPct(m.paidToDate)}</div>
									</div>
								{/each}
							{/if}
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Help us improve -->
		<div
			class="flex flex-col items-center justify-center gap-4 border border-borderColor p-[2rem] md:col-span-3 font-Paragraph"
		>
			<p class="font-ThirdHead text-minSubHead md:text-miniHeadFont text-center">
				Help us improve our calculator
			</p>
			<button
				onclick={() => goto('/complaint-compliment#feedback')}
				class="w-full rounded-full border border-black px-[3rem] py-3 font-Paragraph text-minParaFont md:text-paraFont hover:opacity-90 md:w-auto bg-btnBg cursor-pointer"
			>
				Click here
			</button>
		</div>

		<!-- Pre-approval block -->
		<div class="grid gap-[2rem] border border-borderColor p-[1rem] md:p-[2rem] md:col-span-4 font-Paragraph">
			<div class="grid gap-4 md:mt-[1.5rem]">
				<h2 class="font-ThirdHead text-minSubHead md:text-miniHeadFont text-center">
					Why apply for conditional pre-approval?
				</h2>
				<p class="font-Paragraph text-minParaFont">
					Get conditional pre-approval so you can confidently find your property. Chat to one of
					our lenders or start your application online in 10 minutes.
				</p>
			</div>
			<div class="grid gap-4">
				<div class="grid gap-2">
					<p class="font-ThirdHead text-minSubHead md:text-miniHeadFont">What you'll get</p>
					<ul class="pl-4 list-disc font-Paragraph text-minParaFont">
						<li>A tailored interest rate when you speak to us</li>
						<li>Market news &amp; insights for suburbs you're interested in</li>
						<li>Ongoing expert lending support</li>
						<li>An estimate of how much you can borrow</li>
					</ul>
				</div>
				<div class="grid gap-4 mt-[2rem]">
					<Button btnName="Book an Appointment" btnColor="#ffcc00" link="/appointment" />
					<Button btnName="Check Conditional Approval" link="/get-started/how-can-we-help" btnBorder="#E3E3E3" />
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'] {
		-moz-appearance: textfield;
	}
	.custom-radio {
		width: 16px;
		height: 16px;
		accent-color: #007bff;
	}
	::-webkit-scrollbar {
		width: 5px;
		height: 5px;
	}
	::-webkit-scrollbar-track {
		background: #f1f1f1;
	}
	::-webkit-scrollbar-thumb {
		background: black;
	}
	::-webkit-scrollbar-thumb:hover {
		background: #555;
	}
</style>
