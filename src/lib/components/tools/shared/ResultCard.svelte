<script lang="ts">
	/**
	 * ResultCard — A summary card for displaying key calculation results.
	 *
	 * Shows a grid of labeled values, typically used for:
	 * - EMI amount, total interest, total payment (EMI Calculator)
	 * - Interest saved, tenure saved (Part-Payment Planner)
	 * - Stamp duty, registration charges (Stamp Duty Calculator)
	 *
	 * Usage:
	 *   <ResultCard items={[
	 *     { label: 'Monthly EMI', value: '₹ 43,391', highlight: true },
	 *     { label: 'Total Interest', value: '₹ 54,13,840' },
	 *     { label: 'Total Amount', value: '₹ 1,04,13,840' }
	 *   ]} />
	 */
	import type { Snippet } from 'svelte';

	// --- Types ---
	interface ResultItem {
		/** Label describing the value (e.g., "Monthly EMI") */
		label: string;

		/** The formatted value to display (e.g., "₹ 43,391") */
		value: string;

		/** Whether this item should be visually highlighted (e.g., the primary result) */
		highlight?: boolean;

		/** Optional sub-text below the value (e.g., "Forty-three thousand...") */
		subText?: string;
	}

	// --- Component Props ---
	interface Props {
		/** Array of result items to display in a grid */
		items: ResultItem[];

		/** Optional title above the result cards */
		title?: string;

		/** Optional content rendered below the results */
		children?: Snippet;
	}

	let { items, title = '', children }: Props = $props();
</script>

<div class="rounded-xl border border-[var(--dash-border)] bg-[var(--ddsa-primary-50)] p-4 sm:p-6">
	{#if title}
		<h3 class="mb-4 text-base font-semibold text-[var(--ddsa-secondary)]">
			{title}
		</h3>
	{/if}

	<!-- Results Grid: responsive columns based on item count -->
	<div
		class="grid gap-4 {items.length <= 3
			? 'grid-cols-1 sm:grid-cols-3'
			: 'grid-cols-2 sm:grid-cols-4'}"
	>
		{#each items as item (item.label)}
			<div
				class="rounded-lg p-3 text-center transition-all
					{item.highlight
					? 'bg-[var(--ddsa-secondary)] text-white shadow-md'
					: 'bg-white text-[var(--ddsa-secondary)] shadow-sm'}"
			>
				<!-- Label -->
				<p
					class="text-xs font-medium tracking-wide uppercase
					{item.highlight ? 'text-[var(--ddsa-primary-200)]' : 'text-[var(--ddsa-secondary-400)]'}"
				>
					{item.label}
				</p>

				<!-- Value -->
				<p
					class="mt-1 text-lg font-bold sm:text-xl
					{item.highlight ? 'text-white' : 'text-[var(--ddsa-secondary)]'}"
					style="transition: all 0.3s ease;"
				>
					{item.value}
				</p>

				<!-- Optional sub-text (e.g., number in words) -->
				{#if item.subText}
					<p
						class="mt-0.5 text-[10px] leading-tight
						{item.highlight ? 'text-[var(--ddsa-primary-300)]' : 'text-[var(--ddsa-secondary-400)]'}"
					>
						{item.subText}
					</p>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Optional child content below the results -->
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{/if}
</div>
