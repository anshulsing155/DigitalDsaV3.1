<script lang="ts">
	/**
	 * ComparisonSummary — Side-by-side before/after comparison card.
	 *
	 * Used by planners to show the impact of part-payments or EMI changes:
	 * original values vs modified values, with the difference highlighted.
	 *
	 * Usage:
	 *   <ComparisonSummary rows={[
	 *     { label: 'Total Interest', original: 1200000, modified: 900000, showSaving: true },
	 *     { label: 'Tenure (months)', original: 240, modified: 180, showSaving: true }
	 *   ]} />
	 */
	import { formatNumber } from '$lib/i18n';

	// --- Types ---
	interface ComparisonRow {
		/** Label describing what's being compared */
		label: string;

		/** Original value (before part-payment / EMI change) */
		original: number;

		/** Modified value (after changes) */
		modified: number;

		/** Whether to show the difference as a "saving" */
		showSaving?: boolean;

		/** Unit suffix like "months", "%". If empty, treated as currency (₹). */
		unit?: string;

		/** Whether this row should be highlighted (e.g., total row) */
		isHighlighted?: boolean;
	}

	// --- Component Props ---
	interface Props {
		/** The rows of comparison data to display */
		rows: ComparisonRow[];
	}

	let { rows }: Props = $props();

	/**
	 * Format a value based on whether it has a unit or should be shown as currency.
	 */
	function formatValue(value: number, unit?: string): string {
		if (unit) {
			return `${formatNumber(Math.round(value))} ${unit}`;
		}
		return `₹ ${formatNumber(Math.round(value))}`;
	}
</script>

<div class="overflow-hidden rounded-xl border border-[var(--dash-border)]">
	<!-- === Header Row === -->
	<div
		class="grid grid-cols-4 gap-2 bg-[var(--ddsa-secondary)] px-4 py-3 text-sm font-medium text-white"
	>
		<div>Metric</div>
		<div class="text-right">Without Changes</div>
		<div class="text-right">With Changes</div>
		<div class="text-right">Saving</div>
	</div>

	<!-- === Data Rows === -->
	{#each rows as row, index (row.label)}
		<div
			class="grid grid-cols-4 gap-2 border-b border-[var(--dash-border)] px-4 py-3 text-sm
				{row.isHighlighted
				? 'bg-[var(--ddsa-primary-50)] font-medium'
				: index % 2 === 0
					? 'bg-white'
					: 'bg-[var(--ddsa-secondary-50)]'}"
		>
			<!-- Label -->
			<div class="text-[var(--ddsa-secondary-700)]">
				{row.label}
			</div>

			<!-- Original value -->
			<div class="text-right text-[var(--ddsa-secondary-600)]">
				{formatValue(row.original, row.unit)}
			</div>

			<!-- Modified value -->
			<div class="text-right font-medium text-[var(--ddsa-secondary)]">
				{formatValue(row.modified, row.unit)}
			</div>

			<!-- Saving (difference) -->
			<div class="text-right">
				{#if row.showSaving && row.original !== row.modified}
					{@const saving = row.original - row.modified}
					<span
						class="font-semibold {saving > 0
							? 'text-[var(--ddsa-success)]'
							: 'text-[var(--ddsa-error)]'}"
					>
						{saving > 0 ? '↓ ' : '↑ '}{formatValue(Math.abs(saving), row.unit)}
					</span>
				{:else}
					<span class="text-[var(--ddsa-secondary-400)]">—</span>
				{/if}
			</div>
		</div>
	{/each}
</div>
