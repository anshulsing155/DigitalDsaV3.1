<script lang="ts">
	import { Pencil, Trash2 } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';
	import { parseBorrowerCount } from '$lib/utils/emiShareCalculator';

	interface Props {
		/** "term_loan" or "credit_line" */
		type: 'term_loan' | 'credit_line';
		/** Entries to display (already filtered by type) */
		entries: any[];
		/** The loan type from parent form (used to hide certain rows) */
		formLoanType?: string;
		/** Called when user clicks delete on an entry */
		ondelete: (index: number) => void;
		/** Called when user clicks edit on an entry */
		onedit: (index: number) => void;
	}

	let { type, entries, formLoanType = '', ondelete, onedit }: Props = $props();

	let isTermLoan = $derived(type === 'term_loan');
	let title = $derived(isTermLoan ? 'Term Loans' : 'Credit Lines');

	function shortEmiMethod(method: string): string {
		const map: Record<string, string> = {
			'Full from my account': 'My account',
			'Full from co-borrower': 'Co-borrower',
			'Proportional split': 'Split',
			'From joint account': 'Joint a/c',
			'From business account': 'Business a/c'
		};
		return map[method] || method || '—';
	}

	function shortRole(role: string): string {
		const map: Record<string, string> = {
			'Primary Borrower': 'Primary',
			'Co-Borrower': 'Co-Borrower',
			Guarantor: 'Guarantor',
			'Name Lender': 'Paper only'
		};
		return map[role] || role || '—';
	}

	function shortCapacity(capacity: string, entityName?: string): string {
		if (!capacity || capacity === 'individual') return 'Personal';
		const label = capacity === 'as_director' ? 'Director' : capacity === 'as_partner' ? 'Partner' : capacity === 'as_proprietor' ? 'Proprietor' : capacity;
		return entityName ? `${label} — ${entityName}` : label;
	}

	function shortPaidBy(paidBy: string): string {
		const map: Record<string, string> = {
			spouse: 'Spouse',
			parent: 'Parent',
			child: 'Child',
			sibling: 'Sibling',
			other_family: 'Family',
			employer_business: 'Employer'
		};
		return map[paidBy] || paidBy || '';
	}

	function shortPaymentMode(mode: string): string {
		const map: Record<string, string> = {
			transfer_to_mine: 'transfer',
			direct_to_bank: 'direct',
			auto_debit_theirs: 'auto-debit',
			mixed: 'mixed'
		};
		return map[mode] || mode || '';
	}
</script>

{#if entries.length > 0}
	<h5 class="labelText">{title}</h5>
	<div class="overflow-x-auto sm:overflow-visible">
		<table class="min-w-full border border-grayTwo">
			<thead class="bg-blue-50 dark:bg-blue-900/20">
				<tr>
					<th class="smallText border px-2 py-1 text-left font-semibold">Loan Type</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Bank</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Role</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Capacity</th>
					<th class="smallText border px-2 py-1 text-left font-semibold"
						>{isTermLoan ? 'EMI' : 'Limit'}</th
					>
					<th class="smallText border px-2 py-1 text-left font-semibold">EMI Method</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Tenure</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Rate</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Closure</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Paid by</th>
					<th class="smallText border px-2 py-1 text-left font-semibold">Action</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry, i}
					{#if !((formLoanType === 'Start Fresh with New Loan' || formLoanType === 'New Loan') && entry.selectedToClose === 'Will be closed by Top-up amount')}
						<tr>
							<td class="smallText border px-2 py-1">{entry.loanType || entry.loanProduct}</td>
							<td class="smallText border px-2 py-1">{entry.bankName}</td>
							<td class="smallText border px-2 py-1">{shortRole(entry.role)}</td>
							<td class="smallText border px-2 py-1">{shortCapacity(entry.capacity, entry.capacityEntityName)}</td>
							<td class="smallText border px-2 py-1">
								{#if entry.applicantEmiShare != null && parseBorrowerCount(entry.borrowerCount) > 1}
									{formatCurrency(entry.applicantEmiShare)}
									<span class="text-[10px] text-[var(--form-text-muted)]">(of {formatCurrency(parseFloat((isTermLoan ? entry.emi : entry.totalLimit) || '0'))})</span>
								{:else}
									{isTermLoan ? entry.emi : entry.totalLimit}
								{/if}
							</td>
							<td class="smallText border px-2 py-1">{shortEmiMethod(entry.emiMethod)}</td>
							<td class="smallText border px-2 py-1">{entry.tenure}m</td>
							<td class="smallText border px-2 py-1">{entry.interestRate}%</td>
							<td class="smallText border px-2 py-1">{entry.selectedToClose}</td>
							<td class="smallText border px-2 py-1">
								{#if entry.emiPaidBy && entry.emiPaidBy !== 'self'}
									<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
										Paid by: {shortPaidBy(entry.emiPaidBy)}{entry.emiPaymentMode ? " (" + shortPaymentMode(entry.emiPaymentMode) + ")" : ""}
									</span>
								{:else}
									—
								{/if}
							</td>
							<td class="smallText border px-2 py-1">
								<div class="flex h-full gap-2">
									<button
										class="flex flex-1 items-center justify-center rounded text-error hover:text-error/90"
										onclick={() => ondelete(i)}
									>
										<Trash2 size={18} />
									</button>
									<button
										class="bg-brown-400 hover:bg-brown-500 flex flex-1 items-center justify-center rounded"
										onclick={() => onedit(i)}
									>
										<Pencil size={18} />
									</button>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/if}
