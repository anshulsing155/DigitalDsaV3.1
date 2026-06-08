<script lang="ts">
	/**
	 * AmortizationTable — Collapsible yearly amortization schedule.
	 *
	 * Redesigned to match the reference EMI calculator:
	 * - Colored column headers (green for Principal, blue for Interest,
	 *   red/coral for Balance) for instant visual association with the chart
	 * - Clean expand/collapse with + icon
	 * - Sticky header for long tables
	 * - Responsive horizontal scroll on mobile
	 */
	import { formatNumber } from '$lib/i18n';
	import type { YearlyPaymentSummary } from '$lib/tools/types.js';

	interface Props {
		/** The yearly summary data to display */
		yearlySummary: YearlyPaymentSummary[];

		/** Whether to show the part-payment column (planners only) */
		showPartPaymentColumn?: boolean;

		/** Maximum scrollable height */
		maxHeight?: string;
	}

	let { yearlySummary, showPartPaymentColumn = false, maxHeight = '36rem' }: Props = $props();

	// Track which years are expanded
	let expandedYears = $state<Set<string>>(new Set());

	function toggleYear(yearLabel: string) {
		const next = new Set(expandedYears);
		if (next.has(yearLabel)) next.delete(yearLabel);
		else next.add(yearLabel);
		expandedYears = next;
	}

	function fmt(value: number | undefined): string {
		if (!value || value === 0) return '0';
		return formatNumber(Math.round(value));
	}
</script>

<div
	class="overflow-x-auto rounded-xl border border-[var(--dash-border)] shadow-sm"
	style="max-height: {maxHeight};"
>
	<table class="w-full min-w-[700px] text-sm">
		<!-- ═══ Table Header with colored columns ═══ -->
		<thead class="sticky top-0 z-10">
			<tr>
				<!-- Year: neutral dark -->
				<th
					class="bg-[var(--ddsa-secondary)] px-4 py-3 text-left text-xs font-bold tracking-wider text-white uppercase"
				>
					Year
				</th>
				<!-- Principal: green -->
				<th
					class="bg-[var(--table-header-principal)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
				>
					Principal<br /><span class="text-[10px] font-normal opacity-80">(A)</span>
				</th>
				<!-- Interest: blue/teal -->
				<th
					class="bg-[var(--table-header-interest)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
				>
					Interest<br /><span class="text-[10px] font-normal opacity-80">(B)</span>
				</th>
				{#if showPartPaymentColumn}
					<th
						class="bg-[var(--table-header-special)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
					>
						Part-Payment
					</th>
				{/if}
				<!-- Total Payment: neutral -->
				<th
					class="bg-[var(--ddsa-secondary-700)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
				>
					Total Payment<br /><span class="text-[10px] font-normal opacity-80">(A + B)</span>
				</th>
				<!-- Balance: coral/red -->
				<th
					class="bg-[var(--table-header-balance)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
				>
					Balance
				</th>
				<!-- Loan Paid: neutral -->
				<th
					class="bg-[var(--ddsa-secondary)] px-4 py-3 text-center text-xs font-bold tracking-wider text-white uppercase"
				>
					Loan Paid<br /><span class="text-[10px] font-normal opacity-80">To Date</span>
				</th>
			</tr>
		</thead>

		<tbody>
			{#each yearlySummary as yearData, rowIdx (yearData.yearLabel)}
				{@const isExpanded = expandedYears.has(yearData.yearLabel)}
				<!-- ═══ Year summary row ═══ -->
				<tr
					class="cursor-pointer border-b border-[var(--dash-border)] transition-colors duration-150
						{rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
						hover:bg-[var(--ddsa-primary-50)]"
					onclick={() => toggleYear(yearData.yearLabel)}
				>
					<td class="px-4 py-3 font-semibold text-[var(--ddsa-secondary)]">
						<span
							class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--ddsa-secondary-200)] text-xs text-[var(--ddsa-secondary-400)] transition-transform duration-200 {isExpanded
								? 'rotate-45 bg-[var(--ddsa-primary-50)]'
								: ''}"
						>
							+
						</span>
						{yearData.yearLabel}
					</td>
					<td class="px-4 py-3 text-right font-medium text-[var(--table-text-principal)]">
						₹ {fmt(yearData.totalPrincipalPaid)}
					</td>
					<td class="px-4 py-3 text-right font-medium text-[var(--table-text-interest)]">
						₹ {fmt(yearData.totalInterestPaid)}
					</td>
					{#if showPartPaymentColumn}
						<td class="px-4 py-3 text-right font-medium text-[var(--table-text-special)]">
							₹ {fmt(yearData.totalPartPayments)}
						</td>
					{/if}
					<td class="px-4 py-3 text-right font-semibold text-[var(--ddsa-secondary)]">
						₹ {fmt(yearData.totalEmiPaid)}
					</td>
					<td class="px-4 py-3 text-right font-semibold text-[var(--table-text-balance)]">
						₹ {fmt(yearData.closingBalance)}
					</td>
					<td class="px-4 py-3 text-center text-[var(--ddsa-secondary-600)]">
						{yearData.loanPaidPercentage.toFixed(2)}%
					</td>
				</tr>

				<!-- ═══ Monthly detail rows (expanded) ═══ -->
				{#if isExpanded}
					{#each yearData.monthlyEntries as monthEntry (monthEntry.monthNumber)}
						<tr
							class="border-b border-dashed border-[var(--ddsa-secondary-100)] bg-[var(--ddsa-secondary-50)]/50"
						>
							<td class="py-2 pr-4 pl-12 text-xs text-[var(--ddsa-secondary-500)]">
								{monthEntry.formattedDate}
							</td>
							<td class="px-4 py-2 text-right text-xs text-[var(--table-text-principal)]/80">
								₹ {fmt(monthEntry.principalAmount)}
							</td>
							<td class="px-4 py-2 text-right text-xs text-[var(--table-text-interest)]/80">
								₹ {fmt(monthEntry.interestAmount)}
							</td>
							{#if showPartPaymentColumn}
								<td class="px-4 py-2 text-right text-xs text-[var(--table-text-special)]/80">
									₹ {fmt(monthEntry.partPaymentAmount)}
								</td>
							{/if}
							<td class="px-4 py-2 text-right text-xs text-[var(--ddsa-secondary-600)]">
								₹ {fmt(monthEntry.emiAmount)}
							</td>
							<td
								class="px-4 py-2 text-right text-xs font-medium text-[var(--table-text-balance)]/70"
							>
								₹ {fmt(monthEntry.closingBalance)}
							</td>
							<td class="px-4 py-2 text-center text-xs text-[var(--ddsa-secondary-400)]"> — </td>
						</tr>
					{/each}
				{/if}
			{/each}
		</tbody>
	</table>
</div>
