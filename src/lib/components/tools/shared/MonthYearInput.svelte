<script lang="ts">
	/**
	 * MonthYearInput — Inline month-year picker with dropdown calendar.
	 *
	 * Click the field to open a dropdown with:
	 * - Year navigation arrows (← 2026 →)
	 * - 12-month grid (greyed out months before loan start)
	 * - Optional "Till end date" button for end-date pickers
	 *
	 * Converts between a 0-based month index (from loan start) and display.
	 */
	import { Calendar, ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import { MONTH_NAMES_SHORT } from '$lib/tools/constants.js';

	interface Props {
		value: number | null;
		label: string;
		startYear: number;
		startMonth: number;
		id?: string;
		tenureMonths?: number;
		/** Show "Till end date" option at the bottom (for end-date pickers) */
		showTillEnd?: boolean;
		/** Callback when "Till end date" is clicked */
		onTillEnd?: () => void;
	}

	let {
		value = $bindable(0) as number | null,
		label,
		startYear,
		startMonth,
		id = 'myi',
		tenureMonths = 360,
		showTillEnd = false,
		onTillEnd
	}: Props = $props();

	let isOpen = $state(false);

	// Calendar navigation — stores the user's in-session navigation override.
	// Falls through to `value`-derived year (or `startYear + 1` when value is
	// null) when the user hasn't navigated. This keeps the calendar in sync
	// when the parent swaps `value` or `startYear`, while still letting the
	// arrow buttons and toggleDropdown move the calendar freely.
	let calendarYearOverride: number | null = $state(null);
	let calendarYear = $derived(
		calendarYearOverride ?? (value != null ? toYear(value) : startYear + 1)
	);

	// Convert monthIndex → year
	function toYear(idx: number): number {
		return new Date(startYear, startMonth - 1 + idx).getFullYear();
	}

	// Convert monthIndex → month (0-11)
	function toMonthOfYear(idx: number): number {
		return new Date(startYear, startMonth - 1 + idx).getMonth();
	}

	// Convert year + monthOfYear → monthIndex
	function toIndex(year: number, monthOfYear: number): number {
		return (year - startYear) * 12 + (monthOfYear + 1 - startMonth);
	}

	// Display string — shows "Till end date" when value is null and showTillEnd is enabled
	let displayText = $derived.by(() => {
		if (value == null || value < 0) {
			return showTillEnd ? 'Till end date' : '--- -----';
		}
		const date = new Date(startYear, startMonth - 1 + value);
		return `${MONTH_NAMES_SHORT[date.getMonth()]}-${date.getFullYear()}`;
	});

	let isTillEnd = $derived(showTillEnd && (value == null || value < 0));

	// Is a specific month selectable? (not before loan start)
	function isMonthDisabled(monthOfYear: number): boolean {
		const idx = toIndex(calendarYear, monthOfYear);
		if (idx < 0) return true; // before loan start
		const maxIdx = tenureMonths + 60; // allow some buffer past tenure
		if (idx > maxIdx) return true;
		return false;
	}

	// Is this month currently selected?
	function isSelected(monthOfYear: number): boolean {
		if (value == null) return false;
		return calendarYear === toYear(value) && monthOfYear === toMonthOfYear(value);
	}

	// Is this the current calendar month?
	const today = new Date();
	function isCurrentMonth(monthOfYear: number): boolean {
		return calendarYear === today.getFullYear() && monthOfYear === today.getMonth();
	}

	function selectMonth(monthOfYear: number) {
		value = toIndex(calendarYear, monthOfYear);
		isOpen = false;
	}

	function handleTillEnd() {
		onTillEnd?.();
		isOpen = false;
	}

	function toggleDropdown() {
		if (!isOpen && value != null) {
			calendarYearOverride = toYear(value);
		}
		isOpen = !isOpen;
	}

	// Close when clicking outside
	let containerEl: HTMLElement;
	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside, true);
			return () => document.removeEventListener('click', handleClickOutside, true);
		}
	});
</script>

<div class="relative" bind:this={containerEl}>
	{#if label}
		<label for={id} class="mb-1 block text-sm font-medium text-[var(--ddsa-secondary-600)]"
			>{label}</label
		>
	{/if}

	<!-- Trigger field -->
	<button
		{id}
		type="button"
		class="flex w-full items-center gap-2 rounded-lg border border-[var(--ddsa-secondary-200)] bg-white px-3 py-2.5
			text-left text-sm shadow-sm transition-colors
			hover:border-[var(--ddsa-primary-400)]
			focus:border-[var(--ddsa-primary-500)] focus:ring-2 focus:ring-[var(--ddsa-primary-100)]
			dark:border-[var(--ddsa-secondary-600)] dark:bg-[var(--ddsa-secondary-800)]"
		onclick={toggleDropdown}
	>
		<Calendar class="h-4 w-4 shrink-0 text-[var(--ddsa-secondary-400)]" />
		<span
			class={value != null
				? 'text-[var(--ddsa-secondary-700)] dark:text-[var(--ddsa-secondary-200)]'
				: 'text-[var(--ddsa-secondary-400)]'}
		>
			{displayText}
		</span>
	</button>

	<!-- Dropdown calendar -->
	{#if isOpen}
		{@const minCalYear = startYear}
		{@const maxCalYear = startYear + Math.ceil(tenureMonths / 12) + 5}
		<div
			class="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-[var(--ddsa-secondary-200)] bg-white p-3 shadow-xl
			dark:border-[var(--ddsa-secondary-600)] dark:bg-[var(--ddsa-secondary-800)]"
		>
			<!-- Year navigation -->
			<div class="mb-3 flex items-center justify-between">
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full transition-colors
						{calendarYear <= minCalYear
						? 'cursor-not-allowed opacity-30'
						: 'hover:bg-[var(--ddsa-secondary-100)] dark:hover:bg-[var(--ddsa-secondary-700)]'}"
					onclick={() => {
						if (calendarYear > minCalYear) calendarYearOverride = calendarYear - 1;
					}}
					disabled={calendarYear <= minCalYear}
				>
					<ChevronLeft class="h-4 w-4 text-[var(--ddsa-secondary-500)]" />
				</button>
				<span
					class="text-sm font-bold text-[var(--ddsa-secondary-700)] dark:text-[var(--ddsa-secondary-200)]"
				>
					{calendarYear}
				</span>
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full transition-colors
						{calendarYear >= maxCalYear
						? 'cursor-not-allowed opacity-30'
						: 'hover:bg-[var(--ddsa-secondary-100)] dark:hover:bg-[var(--ddsa-secondary-700)]'}"
					onclick={() => {
						if (calendarYear < maxCalYear) calendarYearOverride = calendarYear + 1;
					}}
					disabled={calendarYear >= maxCalYear}
				>
					<ChevronRight class="h-4 w-4 text-[var(--ddsa-secondary-500)]" />
				</button>
			</div>

			<!-- Month grid (4 rows × 3 cols) -->
			<div class="grid grid-cols-3 gap-1">
				{#each MONTH_NAMES_SHORT as monthName, i}
					{@const disabled = isMonthDisabled(i)}
					{@const selected = isSelected(i)}
					{@const current = isCurrentMonth(i)}
					<button
						type="button"
						class="rounded-lg px-2 py-1.5 text-sm font-medium transition-all
							{disabled
							? 'cursor-not-allowed text-[var(--ddsa-secondary-300)] dark:text-[var(--ddsa-secondary-600)]'
							: selected
								? 'bg-[var(--ddsa-primary-500)] text-white shadow-sm'
								: current
									? 'bg-[var(--ddsa-primary-50)] font-bold text-[var(--ddsa-primary-700)]'
									: 'text-[var(--ddsa-secondary-700)] hover:bg-[var(--ddsa-secondary-100)] dark:text-[var(--ddsa-secondary-200)] dark:hover:bg-[var(--ddsa-secondary-700)]'}"
						{disabled}
						onclick={() => selectMonth(i)}
					>
						{monthName}
					</button>
				{/each}
			</div>

			<!-- "Till end date" option -->
			{#if showTillEnd}
				<button
					type="button"
					class="mt-2 w-full rounded-lg border border-dashed border-[var(--ddsa-secondary-300)] py-2 text-sm font-medium
						text-[var(--ddsa-secondary-500)] transition-colors hover:border-[var(--ddsa-primary-400)] hover:text-[var(--ddsa-primary-600)]
						dark:border-[var(--ddsa-secondary-600)] dark:text-[var(--ddsa-secondary-400)]"
					onclick={handleTillEnd}
				>
					Till end date
				</button>
			{/if}
		</div>
	{/if}
</div>
