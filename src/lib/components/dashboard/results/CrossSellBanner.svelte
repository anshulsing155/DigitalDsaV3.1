<script lang="ts">
	import { Lightbulb } from '$lib/utils/iconRegistry';
	import { formatCurrency } from '$lib/i18n';

	// ── Props ────────────────────────────────────────────────────
	interface Props {
		opportunity: {
			parent_lender: string;
			shortfall: number;
			loan_type: 'Personal Loan' | 'Business Loan';
			explanation: string;
			options: Array<{
				lender: string;
				amount: number;
				roi: number;
				emi: number;
			}>;
		};
	}

	let { opportunity }: Props = $props();

	// ── INR formatter ──────────────────────────────────────────── Cr`;
</script>

<div
	class="rounded-xl border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] p-5"
>
	<!-- Header row -->
	<div class="flex items-center gap-2">
		<Lightbulb size={16} class="shrink-0 text-[var(--dash-accent-text)]" />
		<span class="text-sm font-bold text-[var(--dash-text)]">Bridge the Gap</span>
		<span
			class="rounded-full bg-[var(--dash-bg-alt)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--dash-text-secondary)]"
		>
			{opportunity.loan_type}
		</span>
	</div>

	<!-- Explanation text -->
	<p class="mt-1 text-xs leading-relaxed text-[var(--dash-text-secondary)]">
		{opportunity.explanation}
	</p>

	<!-- Shortfall amount -->
	<p class="mt-2 text-lg font-bold text-[var(--dash-text)]">
		{formatCurrency(opportunity.shortfall, true)} shortfall
	</p>

	<!-- Option cards grid -->
	{#if opportunity.options.length > 0}
		<div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each opportunity.options as option}
				<div
					class="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-3 shadow-sm"
				>
					<p class="text-xs font-bold text-[var(--dash-text)]">{option.lender}</p>

					<div class="mt-2 space-y-1.5">
						<div class="flex justify-between text-[13px]">
							<span class="text-[var(--dash-text-muted)]">Amount</span>
							<span class="font-semibold text-[var(--dash-text-secondary)]"
								>{formatCurrency(option.amount, true)}</span
							>
						</div>
						<div class="flex justify-between text-[13px]">
							<span class="text-[var(--dash-text-muted)]">ROI</span>
							<span class="font-semibold text-[var(--dash-text-secondary)]">{option.roi}%</span>
						</div>
						<div class="flex justify-between text-[13px]">
							<span class="text-[var(--dash-text-muted)]">EMI</span>
							<span class="font-semibold text-[var(--dash-text-secondary)]"
								>{formatCurrency(option.emi, true)}</span
							>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
