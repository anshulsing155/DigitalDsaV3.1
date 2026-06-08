<script lang="ts">
	/**
	 * AffordabilityOverview — shown on the results page for secured loans where
	 * the applicant has NOT identified a specific property (propertyIdentified = No).
	 *
	 * Computes the BEST affordability across all green/amber-eligible lenders and
	 * presents the three planning modes so the DSA can advise the client on
	 * which price bracket to target.
	 *
	 * Mode A — Eligibility: max property assuming the applicant brings enough DP
	 * Mode B — DP-constrained: max property given the actual available DP
	 * Mode C — Bridge: max property if the DSA arranges a short-term bridge loan
	 *           to cover the DP gap (adds a second EMI obligation)
	 */

	import { formatCurrency } from '$lib/i18n';
	import type { LenderResult } from '$lib/types/lenderResults';

	let {
		lenderResults,
		loanName = 'Home Loan'
	}: { lenderResults: LenderResult[]; loanName?: string } = $props();

	// ── Find the best (highest maxPropertyCost) for each mode across eligible lenders ──

	type ModeResult = {
		maxPropertyCost: number;
		homeLoanAmount: number;
		homeLoanEMI: number;
		downPaymentRequired: number;
		ltvPercent: number;
		lenderName: string;
	};

	type BridgeModeResult = ModeResult & {
		bridgeLoanAmount: number;
		bridgeLoanEMI: number;
		totalEMI: number;
	};

	const bestByMode = $derived.by(() => {
		let bestEligibility: ModeResult | null = null;
		let bestDpConstrained: ModeResult | null = null;
		let bestBridge: BridgeModeResult | null = null;

		for (const result of lenderResults) {
			// Only consider green and amber lenders — red means ineligible
			const isEligible = result.traffic_light === 'green' || result.traffic_light === 'amber';
			if (!isEligible || !result.affordability) continue;

			const { eligibility, dpConstrained, bridge } = result.affordability;

			if (eligibility && (!bestEligibility || eligibility.maxPropertyCost > bestEligibility.maxPropertyCost)) {
				bestEligibility = {
					maxPropertyCost: eligibility.maxPropertyCost,
					homeLoanAmount: eligibility.homeLoanAmount,
					homeLoanEMI: eligibility.homeLoanEMI,
					downPaymentRequired: eligibility.downPaymentRequired,
					ltvPercent: eligibility.ltvPercent,
					lenderName: result.lender_name
				};
			}

			if (dpConstrained && (!bestDpConstrained || dpConstrained.maxPropertyCost > bestDpConstrained.maxPropertyCost)) {
				bestDpConstrained = {
					maxPropertyCost: dpConstrained.maxPropertyCost,
					homeLoanAmount: dpConstrained.homeLoanAmount,
					homeLoanEMI: dpConstrained.homeLoanEMI,
					downPaymentRequired: dpConstrained.downPaymentRequired,
					ltvPercent: dpConstrained.ltvPercent,
					lenderName: result.lender_name
				};
			}

			if (bridge && (!bestBridge || bridge.maxPropertyCost > bestBridge.maxPropertyCost)) {
				bestBridge = {
					maxPropertyCost: bridge.maxPropertyCost,
					homeLoanAmount: bridge.homeLoanAmount,
					homeLoanEMI: bridge.homeLoanEMI,
					downPaymentRequired: bridge.downPaymentRequired,
					ltvPercent: bridge.ltvPercent,
					bridgeLoanAmount: bridge.bridgeLoanAmount,
					bridgeLoanEMI: bridge.bridgeLoanEMI,
					totalEMI: bridge.totalEMI,
					lenderName: result.lender_name
				};
			}
		}

		return { eligibility: bestEligibility, dpConstrained: bestDpConstrained, bridge: bestBridge };
	});

	// Only render if at least one mode has data
	const hasAnyData = $derived(
		bestByMode.eligibility !== null ||
		bestByMode.dpConstrained !== null ||
		bestByMode.bridge !== null
	);
</script>

{#if hasAnyData}
	<div class="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
		<!-- Header -->
		<div class="mb-3 flex items-center gap-2">
			<svg class="h-4 w-4 shrink-0 text-blue-600" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
			</svg>
			<h3 class="text-sm font-semibold text-blue-800">Property Affordability — What Can This Applicant Buy?</h3>
			<span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
				Best across eligible lenders
			</span>
		</div>

		<!-- Three-mode grid -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<!-- Mode A: Eligibility -->
			{#if bestByMode.eligibility}
				{@const m = bestByMode.eligibility}
				<div class="rounded-lg border border-green-200 bg-white p-3">
					<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600">
						Mode A — Eligibility
					</p>
					<p class="text-[10px] text-gray-400 mb-2">Affordable property (sufficient DP assumed)</p>
					<p class="text-lg font-bold text-gray-900">{formatCurrency(m.maxPropertyCost, true)}</p>
					<div class="mt-2 space-y-1 text-[11px] text-gray-500">
						<div class="flex justify-between">
							<span>{loanName}</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanAmount, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Monthly EMI</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanEMI, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Down Payment</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.downPaymentRequired, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>LTV</span>
							<span class="font-medium text-gray-700">{m.ltvPercent}%</span>
						</div>
					</div>
					<p class="mt-2 text-[10px] text-gray-400">Best lender: {m.lenderName}</p>
				</div>
			{/if}

			<!-- Mode B: DP-Constrained -->
			{#if bestByMode.dpConstrained}
				{@const m = bestByMode.dpConstrained}
				<div class="rounded-lg border border-amber-200 bg-white p-3">
					<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
						Mode B — DP-Constrained
					</p>
					<p class="text-[10px] text-gray-400 mb-2">Affordable property given available down payment</p>
					<p class="text-lg font-bold text-gray-900">{formatCurrency(m.maxPropertyCost, true)}</p>
					<div class="mt-2 space-y-1 text-[11px] text-gray-500">
						<div class="flex justify-between">
							<span>{loanName}</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanAmount, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Monthly EMI</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanEMI, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Down Payment</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.downPaymentRequired, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>LTV</span>
							<span class="font-medium text-gray-700">{m.ltvPercent}%</span>
						</div>
					</div>
					<p class="mt-2 text-[10px] text-gray-400">Best lender: {m.lenderName}</p>
				</div>
			{/if}

			<!-- Mode C: Bridge Loan -->
			{#if bestByMode.bridge}
				{@const m = bestByMode.bridge}
				<div class="rounded-lg border border-purple-200 bg-white p-3">
					<p class="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-600">
						Mode C — Bridge Loan
					</p>
					<p class="text-[10px] text-gray-400 mb-2">Affordable property with PL bridge for DP gap</p>
					<p class="text-lg font-bold text-gray-900">{formatCurrency(m.maxPropertyCost, true)}</p>
					<div class="mt-2 space-y-1 text-[11px] text-gray-500">
						<div class="flex justify-between">
							<span>{loanName}</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanAmount, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Bridge Loan</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.bridgeLoanAmount, true)}</span>
						</div>
						<div class="flex justify-between font-semibold">
							<span class="text-gray-600">Total EMI</span>
							<span class="text-purple-700">{formatCurrency(m.totalEMI, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>{loanName} EMI</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.homeLoanEMI, true)}</span>
						</div>
						<div class="flex justify-between">
							<span>Bridge EMI</span>
							<span class="font-medium text-gray-700">{formatCurrency(m.bridgeLoanEMI, true)}</span>
						</div>
					</div>
					<p class="mt-2 text-[10px] text-gray-400">Best lender: {m.lenderName}</p>
				</div>
			{/if}
		</div>

		<p class="mt-3 text-[10px] text-blue-600">
			These figures are derived from the applicant's assessed EMI capacity and RBI LTV norms.
			Final loan amount is subject to lender approval and property valuation.
		</p>
	</div>
{/if}
