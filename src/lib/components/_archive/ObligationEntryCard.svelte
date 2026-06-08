<script lang="ts">
	/**
	 * ObligationEntryCard — Summary card for a saved obligation entry
	 */
	import { Pencil, Trash2 } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';
	import type { ObligationEntry } from '$lib/types/obligation';
	import { deriveFacilityType, shortEvidence, getLoanTypeIcon } from '$lib/config/obligationOptions';

	interface Props {
		entry: ObligationEntry;
		onEdit: () => void;
		onDelete: () => void;
	}

	let { entry, onEdit, onDelete }: Props = $props();

	const facility = $derived(deriveFacilityType(entry.loanType));
	const isTermLoan = $derived(facility === 'term_loan');

	// Cast to any for reading potentially missing fields from legacy entries
	const e = $derived(entry as any);

	// Summary line: EMI or Limit info
	const amountSummary = $derived(() => {
		if (isTermLoan) {
			const parts: string[] = [];
			if (e.emi) parts.push(`EMI ${formatCurrency(parseFloat(e.emi))}`);
			if (e.tenure) parts.push(`${e.tenure}mo`);
			if (e.interestRate) parts.push(`${e.interestRate}%`);
			return parts.join(' · ');
		}
		const parts: string[] = [];
		const limit = e.sanctionedLimit || e.totalLimit;
		if (limit) parts.push(`Limit ${formatCurrency(parseFloat(limit))}`);
		if (e.utilizedAmount) parts.push(`Used ${formatCurrency(parseFloat(e.utilizedAmount))}`);
		if (e.emi) parts.push(`Red. ${formatCurrency(parseFloat(e.emi))}/mo`);
		return parts.join(' · ');
	});

	// Role + share line
	const roleSummary = $derived(() => {
		const roleLabel = e.role === 'guarantor' ? 'Guarantor' : 'Co-Applicant';
		const count = Number(e.borrowerCount) || 1;
		if (count > 1) {
			const share = e.applicantEmiShare ?? e.monthlyShare;
			const shareText = share ? formatCurrency(parseFloat(String(share))) : 'equal split';
			return `${roleLabel} (1 of ${count}) · ${shareText}/mo`;
		}
		return roleLabel;
	});

	// Closure + evidence line
	const statusLine = $derived(() => {
		const rawClosure = e.selectedToClose ?? 'Keep running';
		// Map old verbose strings to short labels
		let closure = rawClosure;
		if (rawClosure.startsWith('Self-funded')) closure = 'Close (Self)';
		else if (rawClosure.startsWith('Will be closed')) closure = 'Close (Top-up)';
		else if (rawClosure.startsWith('Not my')) closure = 'Not Liable';
		else if (rawClosure === 'Keep running') closure = 'Keep Running';
		const ev = e.evidence ? shortEvidence(e.evidence) : '';
		return `${closure}${ev ? ` · 📄 ${ev}` : ''}`;
	});
</script>

<div class="group flex items-start gap-3 rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] p-3 transition-all hover:border-[var(--form-accent)]/30">
	<!-- Content -->
	<div class="min-w-0 flex-1">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-[var(--form-text)]">
				{entry.loanType}
			</span>
			<span class="text-xs text-[var(--form-text-muted)]">— {entry.bankName}</span>
		</div>
		<p class="mt-0.5 text-xs text-[var(--form-text-secondary)]">{amountSummary()}</p>
		<p class="mt-0.5 text-xs text-[var(--form-text-muted)]">{roleSummary()}</p>
		<p class="mt-0.5 text-[10px] text-[var(--form-text-muted)]">{statusLine()}</p>
	</div>

	<!-- Actions -->
	<div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
		<button
			type="button"
			class="rounded p-1.5 text-[var(--form-text-muted)] hover:bg-[var(--form-accent)]/10 hover:text-[var(--form-accent)]"
			onclick={onEdit}
			title="Edit"
		>
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button
			type="button"
			class="rounded p-1.5 text-[var(--form-text-muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
			onclick={onDelete}
			title="Delete"
		>
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
