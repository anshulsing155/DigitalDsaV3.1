<script lang="ts">
	import { Trash2, Pencil } from '$lib/utils/iconRegistry';
	import { deleteLoanEntry, editLoanEntry } from '$lib/utils/ApplicantUtils/loanEntries';
	import { formatNumber } from '$lib/i18n';

	interface Props {
		title: string;
		entries?: any[];
		isLimit?: boolean;
		answers?: any;
		idx?: number;
	}

	let {
		title,
		entries = $bindable([]),
		isLimit = false,
		answers = $bindable({}),
		idx = 0
	}: Props = $props();

	let heading = $derived([
		{
			key: 'loanType',
			label: 'Loan Type'
		},
		{
			key: 'bankName',
			label: 'Bank'
		},
		{
			key: 'selectedToClose',
			label: 'Closure Plan'
		},
		{
			key: isLimit ? 'totalLimit' : 'emi',
			label: isLimit ? 'Total Limit' : 'EMI'
		},
		{
			key: 'tenure',
			label: 'Tenure'
		},
		{
			key: 'interestRate',
			label: 'Interest Rate'
		},
		{
			key: 'action',
			label: 'Action'
		}
	]);
</script>

{#if entries?.length}
	<h5 class="text-labelText">{title}</h5>
	<div class="overflow-x-auto">
		<table class="min-w-full border border-grayTwo">
			<thead class="bg-primary/10 dark:bg-primary/5">
				<tr>
					{#each heading as head}
						<th class="smallText border px-2 py-1 text-left font-semibold">{head.label}</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each entries as entry, entryIdx}
					<tr>
						<td class="smallText border px-2 py-1">{entry.loanType}</td>
						<td class="smallText border px-2 py-1">{entry.bankName}</td>
						<td class="smallText border px-2 py-1">{entry.selectedToClose}</td>

						<td class="smallText border px-2 py-1">
							{isLimit
								? entry.totalLimitFormatted || formatNumber(Number(entry.totalLimit) || 0)
								: entry.emiFormatted || formatNumber(Number(entry.emi) || 0)}
						</td>

						<td class="smallText border px-2 py-1">{entry.tenure} months</td>
						<td class="smallText border px-2 py-1">{entry.interestRate}%</td>

						<td class="smallText border px-2 py-1">
							<div class="flex h-full gap-2">
								<button
									class="flex flex-1 items-center justify-center text-error hover:text-error/90"
									onclick={() => {
										deleteLoanEntry(entryIdx, isLimit, answers);
										answers = { ...answers };
									}}
								>
									<Trash2 size={18} />
								</button>

								<button
									class="bg-brown-400 hover:bg-brown-500 flex flex-1 items-center justify-center"
									onclick={() => {
										editLoanEntry(entryIdx, isLimit, answers);
										answers = { ...answers };
									}}
								>
									<Pencil size={18} />
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
