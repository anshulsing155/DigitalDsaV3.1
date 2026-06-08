<script lang="ts">
	import { ChevronLeft, ChevronRight, X, Calendar, Check } from '$lib/utils/iconRegistry';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { focusTrap } from '$lib/utils/focusTrap';

	interface Props {
		minYear?: number | null;
		maxYear?: number | null;
		introduceMonthIndia?: number | null;
		/**
		 * When true, disables every month BEFORE the current month within
		 * the minimum year (and any year < current year). Used by forward-only
		 * fields like "Planned registration month" where past months are
		 * semantically invalid. Defaults to false to preserve legacy behavior
		 * of past-anchored fields (disbursement / allotment dates).
		 *
		 * See CLAUDE.md §3 Pitfall (Planned registration month accepts past
		 * months, 2026-05-28).
		 */
		futureOnly?: boolean;
	}

	let {
		minYear: minYearProp = 2017,
		maxYear: maxYearProp = null,
		introduceMonthIndia: introduceMonthIndiaProp = 6,
		futureOnly = false
	}: Props = $props();

	// Handle null values by falling back to defaults
	const minYear = $derived(minYearProp ?? 2017);
	const introduceMonthIndia = $derived(introduceMonthIndiaProp ?? 6);

	// ── Use <dialog> with showModal() so this appears in the browser's
	// top layer, above any other <dialog> (e.g. WideModal).
	let dialogEl = $state<HTMLDialogElement | null>(null);

	// Open the dialog as soon as the element is bound (component is mounted
	// only when isDateAreaOpen is true, so this fires exactly once per open).
	$effect(() => {
		if (dialogEl && !dialogEl.open) {
			dialogEl.showModal();
		}
	});

	const monthsFull = [
		{ short: 'Jan', full: 'January' },
		{ short: 'Feb', full: 'February' },
		{ short: 'Mar', full: 'March' },
		{ short: 'Apr', full: 'April' },
		{ short: 'May', full: 'May' },
		{ short: 'Jun', full: 'June' },
		{ short: 'Jul', full: 'July' },
		{ short: 'Aug', full: 'August' },
		{ short: 'Sep', full: 'September' },
		{ short: 'Oct', full: 'October' },
		{ short: 'Nov', full: 'November' },
		{ short: 'Dec', full: 'December' }
	];

	const today = new Date();
	let currentYear = $state(today.getFullYear());
	// Reactive so a changed maxYearProp flows through without remount
	const maxYear = $derived(maxYearProp ?? new Date().getFullYear());

	// ── Sync currentYear from THIS PICKER'S initial value when modal opens ──
	// Uses datePickerInitialValue (set atomically in openDatePicker) so each
	// picker reopens on its own previously-chosen year, not a stale global.
	$effect(() => {
		const d = dialogState.datePickerInitialValue;
		if (d) {
			const parts = d.split('-');
			const y = parts[1] ? parseInt(parts[1]) : NaN;
			if (!isNaN(y) && y >= minYear && y <= maxYear) {
				currentYear = y;
			}
		}
		// Always reset year-edit mode to arrows when a picker opens
		yearEditMode = 'arrows';
	});

	// ── Year editing mode ────────────────────────────────────────
	let yearEditMode: 'arrows' | 'input' | 'grid' = $state('arrows');
	let yearInputValue = $state('');
	let yearInputEl = $state<HTMLInputElement | null>(null);

	// ── Year grid variables ──────────────────────────────────────
	let yearGridPage = $state(0); // 0 = current page
	const YEARS_PER_PAGE = 12;

	let yearGridStart = $derived(maxYear - (YEARS_PER_PAGE - 1) + yearGridPage * YEARS_PER_PAGE);
	let yearGridYears = $derived.by(() => {
		const years: number[] = [];
		for (let i = 0; i < YEARS_PER_PAGE; i++) {
			const y = yearGridStart + i;
			if (y >= minYear && y <= maxYear) years.push(y);
		}
		return years.sort((a, b) => a - b);
	});

	// ── Parse selected date (from dialogState) for highlight state ──
	let selectedMonth = $derived.by(() => {
		if (!dialogState.selectedDate) return null;
		const parts = dialogState.selectedDate.split('-');
		return parts[0] || null;
	});

	let selectedYear = $derived.by(() => {
		if (!dialogState.selectedDate) return null;
		const parts = dialogState.selectedDate.split('-');
		return parts[1] ? parseInt(parts[1]) : null;
	});

	// ── Close the modal ─────────────────────────────────────────
	// Called by: X button, backdrop click, native Escape key (oncancel).
	// Delegates to dialogState — layout's {#if isDateAreaOpen} unmounts us.
	function closeModal() {
		dialogState.closeDatePicker();
	}

	// ── Confirm month selection ─────────────────────────────────
	// Writes the date to dialogState.selectedDate (reactive — triggers
	// DatePickerYearAndMonth $effect to pick it up via modalContext routing).
	function selectMonthYear(month: string) {
		const dateVal = `${month}-${currentYear}`;
		dialogState.selectedDate = dateVal;
		// Tick the epoch so newly-mounted DatePickerYearAndMonth instances
		// can tell this is a fresh pick vs leftover state from an earlier
		// session (which would otherwise auto-apply on mount — see the
		// selectionEpoch comment in dialog.svelte.ts).
		dialogState.selectionEpoch += 1;
		dialogState.closeDatePicker();
	}

	// ── Handle clicking the dialog backdrop ─────────────────────
	// The <dialog> element covers the full viewport; clicks on it (not on
	// the inner content div) are backdrop clicks.
	function handleDialogClick(e: MouseEvent) {
		if (e.target === dialogEl) closeModal();
	}

	// ── Year navigation arrows ──────────────────────────────────
	function minYearFn() {
		if (currentYear > minYear) currentYear--;
	}

	function maxYearFn() {
		if (currentYear < maxYear) currentYear++;
	}

	// ── Month state helpers ─────────────────────────────────────
	function isMonthDisabled(index: number): boolean {
		// Disable months before the earliest allowed month in minYear
		if (currentYear === minYear && index < introduceMonthIndia) return true;
		// Only disable future months when maxYear is the actual current year
		// (for planners, maxYear is far in the future — all months are valid)
		if (currentYear === today.getFullYear() && currentYear === maxYear && index > today.getMonth())
			return true;
		// Forward-only fields: block months strictly earlier than the current
		// month. Applies when `currentYear === today.getFullYear()` (months
		// before today within the current year) AND when currentYear is in
		// the past (every month in a past year is invalid — defensive in case
		// the picker is opened on a year < currentYear).
		if (futureOnly) {
			if (currentYear < today.getFullYear()) return true;
			if (currentYear === today.getFullYear() && index < today.getMonth()) return true;
			// Additionally block the CURRENT month when fewer than 7 days
			// remain in it — a registry (or any forward-only event) can't
			// realistically be scheduled with less than a week's notice. Today
			// 2026-05-28 → May has 3 days left → May blocked, June onwards
			// open. Threshold is exclusive (`< 7`) so picking the current
			// month with exactly 7 days remaining still works (Pitfall:
			// registry date must be ≥7 days ahead, 2026-05-28).
			if (currentYear === today.getFullYear() && index === today.getMonth()) {
				const daysInCurrentMonth = new Date(
					today.getFullYear(),
					today.getMonth() + 1,
					0
				).getDate();
				const daysRemaining = daysInCurrentMonth - today.getDate();
				if (daysRemaining < 7) return true;
			}
		}
		return false;
	}

	function isMonthSelected(monthShort: string): boolean {
		return selectedMonth === monthShort && selectedYear === currentYear;
	}

	function isCurrentMonth(index: number): boolean {
		return currentYear === today.getFullYear() && index === today.getMonth();
	}

	// ── Click/double-click disambiguation ────────────────────────
	// Single click → year grid; double-click → type year directly.
	let clickTimer: ReturnType<typeof setTimeout> | null = null;

	function handleYearClickOrDouble() {
		if (clickTimer) {
			clearTimeout(clickTimer);
			clickTimer = null;
			enterYearInput();
		} else {
			clickTimer = setTimeout(() => {
				clickTimer = null;
				toggleYearGrid();
			}, 250);
		}
	}

	function enterYearInput() {
		yearEditMode = 'input';
		yearInputValue = String(currentYear);
		// Small delay so the input is rendered before we focus.
		// scrollIntoView handles Android soft-keyboard pushing the input off screen.
		setTimeout(() => {
			if (yearInputEl) {
				yearInputEl.focus();
				yearInputEl.select();
				yearInputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 50);
	}

	function toggleYearGrid() {
		if (yearEditMode === 'grid') {
			yearEditMode = 'arrows';
		} else {
			yearEditMode = 'grid';
			yearGridPage = Math.floor((maxYear - currentYear) / YEARS_PER_PAGE) * -1;
		}
	}

	// ── Year input handlers ──────────────────────────────────────
	function handleYearInputKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			applyYearInput();
		} else if (e.key === 'Escape') {
			e.stopPropagation(); // prevent dialog closing while editing year
			yearEditMode = 'arrows';
		}
	}

	function handleYearInputBlur() {
		applyYearInput();
	}

	function applyYearInput() {
		const year = parseInt(yearInputValue);
		if (!isNaN(year) && year >= minYear && year <= maxYear) {
			currentYear = year;
		}
		yearEditMode = 'arrows';
	}

	// ── Year grid selection ──────────────────────────────────────
	function selectYearFromGrid(year: number) {
		currentYear = year;
		yearEditMode = 'arrows';
	}
</script>

<!-- Using <dialog> so it enters the browser's top layer,
     appearing above WideModal's dialog on secured loan pages.
     oncancel fires on native Escape key press. -->
<dialog
	bind:this={dialogEl}
	class="month-year-dialog"
	onclick={handleDialogClick}
	oncancel={(e) => {
		e.preventDefault();
		closeModal();
	}}
	use:focusTrap
>
	<div
		class="relative mx-auto w-[92%] max-w-sm overflow-hidden rounded-2xl bg-[var(--form-bg-card)] shadow-2xl"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="presentation"
	>
		<!-- Header -->
		<div class="mymodal-header px-5 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Calendar class="h-5 w-5 text-[var(--dash-btn-text)]" />
					<span class="text-lg font-semibold text-[var(--dash-btn-text)]">Select Date</span>
				</div>
				<button
					onclick={closeModal}
					class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-white/20"
					aria-label="Close date picker"
				>
					<X class="h-5 w-5 text-[var(--dash-btn-text)]" />
				</button>
			</div>

			<!-- Year Navigator -->
			<div class="mt-4 flex items-center justify-center gap-4">
				{#if yearEditMode === 'arrows'}
					<button
						onclick={minYearFn}
						disabled={currentYear === minYear}
						aria-label="Previous year"
						class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all duration-200
							{currentYear === minYear ? 'cursor-not-allowed opacity-30' : 'hover:bg-white/20 active:scale-95'}"
					>
						<ChevronLeft class="h-6 w-6 text-[var(--dash-btn-text)]" />
					</button>

					<button
						onclick={handleYearClickOrDouble}
						class="group flex min-h-[44px] cursor-pointer flex-col items-center justify-center select-none"
						title="Click to browse years, double-click to type"
						aria-label="Current year: {currentYear}. Click to browse, double-click to type."
					>
						<span
							class="text-3xl font-bold text-[var(--dash-btn-text)] transition-transform group-hover:scale-105"
						>
							{currentYear}
						</span>
						<span class="mt-0.5 text-[10px] font-medium tracking-wide text-[var(--dash-btn-text)]">
							{currentYear === maxYear ? 'CURRENT YEAR' : 'TAP TO BROWSE'}
						</span>
					</button>

					<button
						onclick={maxYearFn}
						disabled={currentYear === maxYear}
						aria-label="Next year"
						class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all duration-200
							{currentYear === maxYear ? 'cursor-not-allowed opacity-30' : 'hover:bg-white/20 active:scale-95'}"
					>
						<ChevronRight class="h-6 w-6 text-[var(--dash-btn-text)]" />
					</button>
				{:else if yearEditMode === 'input'}
					<!-- Direct Year Input Mode -->
					<div class="flex flex-col items-center gap-1">
						<div class="flex items-center gap-2">
							<input
								bind:this={yearInputEl}
								bind:value={yearInputValue}
								type="number"
								inputmode="numeric"
								min={minYear}
								max={maxYear}
								maxlength={4}
								onkeydown={handleYearInputKeydown}
								onblur={handleYearInputBlur}
								class="mymodal-year-input"
								placeholder={String(currentYear)}
								aria-label="Enter year"
							/>
							<button
								onclick={applyYearInput}
								aria-label="Confirm year"
								class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
							>
								<Check class="h-5 w-5 text-primaryText" />
							</button>
						</div>
						<p class="text-[10px] text-primaryText/60">
							Enter year between {minYear} — {maxYear}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Year Grid View (when tapping the year) -->
		{#if yearEditMode === 'grid'}
			<div class="border-b border-[var(--form-border)] bg-[var(--form-bg-alt)] p-4">
				<!-- Grid Navigation -->
				<div class="mb-3 flex items-center justify-between">
					<button
						onclick={() => {
							yearGridPage--;
						}}
						disabled={yearGridStart <= minYear}
						aria-label="Previous year range"
						class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors
							{yearGridStart <= minYear
							? 'cursor-not-allowed opacity-30'
							: 'hover:bg-[var(--form-border)] active:scale-95'}"
					>
						<ChevronLeft class="h-4 w-4 text-[var(--form-text-secondary)]" />
					</button>
					<button
						onclick={enterYearInput}
						class="min-h-[44px] px-3 text-xs font-medium text-[var(--trial-accent)] hover:underline"
					>
						Type Year
					</button>
					<button
						onclick={() => {
							yearGridPage++;
						}}
						disabled={yearGridStart + YEARS_PER_PAGE > maxYear}
						aria-label="Next year range"
						class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors
							{yearGridStart + YEARS_PER_PAGE > maxYear
							? 'cursor-not-allowed opacity-30'
							: 'hover:bg-[var(--form-border)] active:scale-95'}"
					>
						<ChevronRight class="h-4 w-4 text-[var(--form-text-secondary)]" />
					</button>
				</div>

				<!-- Year Buttons -->
				<div class="grid grid-cols-4 gap-2">
					{#each yearGridYears as year}
						{@const isCurrent = year === currentYear}
						{@const isThisYear = year === today.getFullYear()}
						<button
							onclick={() => selectYearFromGrid(year)}
							class="min-h-[44px] rounded-xl py-2 text-sm font-semibold transition-all duration-200
								{isCurrent
								? 'mymodal-year-selected'
								: isThisYear
									? 'mymodal-year-current'
									: 'border border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] hover:border-[var(--trial-accent)] hover:text-[var(--trial-accent)] active:scale-95'}"
						>
							{year}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Month Grid -->
		{#if yearEditMode !== 'grid'}
			<div class="bg-[var(--form-bg-alt)] p-4">
				<div class="grid grid-cols-3 gap-2.5">
					{#each monthsFull as { short, full }, index}
						{@const disabled = isMonthDisabled(index)}
						{@const selected = isMonthSelected(short)}
						{@const isCurrent = isCurrentMonth(index)}
						<button
							type="button"
							{disabled}
							onclick={() => selectMonthYear(short)}
							aria-label="{full}{disabled ? ' (unavailable)' : selected ? ' (selected)' : ''}"
							aria-pressed={selected}
							class="relative min-h-[44px] rounded-xl px-2 text-sm font-medium transition-all duration-200
								{disabled
								? 'cursor-not-allowed bg-[var(--form-bg-alt)] text-[var(--form-text-muted)]'
								: selected
									? 'mymodal-month-selected'
									: isCurrent
										? 'mymodal-month-current'
										: 'border border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text-secondary)] hover:border-[var(--trial-accent)]/50 hover:bg-[var(--trial-accent)]/5 hover:text-[var(--trial-accent-300)] active:scale-95'}"
						>
							<span class="block">{short}</span>
							{#if selected}
								<span class="mymodal-selected-dot"></span>
							{/if}
							{#if isCurrent && !selected}
								<span class="mymodal-current-dot"></span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Footer hint -->
		<div class="border-t border-[var(--form-border)] bg-[var(--form-bg-card)] px-4 py-3">
			<p class="text-center text-xs text-[var(--form-text-secondary)]">
				{#if dialogState.datePickerInitialValue && yearEditMode !== 'grid'}
					Current: <span class="font-semibold" style="color: var(--trial-accent)"
						>{dialogState.datePickerInitialValue}</span
					>
					&bull; tap a month to change
				{:else if yearEditMode === 'grid'}
					Select a year, then pick a month
				{:else}
					Tap a month to select &bull; Tap year to browse
				{/if}
			</p>
		</div>
	</div>
</dialog>

<style>
	/* Dialog element styles — uses the browser's top layer */
	.month-year-dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: 100vw;
		max-height: 100vh;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.month-year-dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
	}

	.month-year-dialog[open] {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* ── Header gradient using theme colors ────────────────────── */
	.mymodal-header {
		background: linear-gradient(
			135deg,
			var(--trial-accent) 0%,
			var(--trial-accent-300, var(--trial-accent)) 100%
		);
	}

	/* ── Year input (double-click edit mode) ───────────────────── */
	.mymodal-year-input {
		width: 120px;
		text-align: center;
		font-size: 1.875rem; /* text-3xl */
		font-weight: 700;
		color: white;
		background: rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.5);
		border-radius: 0.75rem;
		padding: 0.25rem 0.5rem;
		outline: none;
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.mymodal-year-input::-webkit-inner-spin-button,
	.mymodal-year-input::-webkit-outer-spin-button {
		appearance: none;
		-webkit-appearance: none;
		margin: 0;
	}

	.mymodal-year-input:focus {
		border-color: white;
		background: rgba(255, 255, 255, 0.3);
		box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15);
	}

	/* ── Selected month button ─────────────────────────────────── */
	.mymodal-month-selected {
		background: var(--trial-accent);
		color: white;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--trial-accent) 35%, transparent);
		transform: scale(1.05);
		font-weight: 600;
	}

	/* ── Current month indicator ───────────────────────────────── */
	.mymodal-month-current {
		background: var(--form-bg-card);
		color: var(--trial-accent-300, var(--trial-accent));
		border: 2px solid var(--trial-accent);
		font-weight: 600;
	}

	/* ── Selected year in grid ─────────────────────────────────── */
	.mymodal-year-selected {
		background: var(--trial-accent);
		color: white;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--trial-accent) 35%, transparent);
		transform: scale(1.05);
	}

	/* ── Current year in grid ──────────────────────────────────── */
	.mymodal-year-current {
		background: var(--form-bg-card);
		color: var(--trial-accent-300, var(--trial-accent));
		border: 2px solid var(--trial-accent);
		font-weight: 600;
	}

	/* ── Selection indicator dots ──────────────────────────────── */
	.mymodal-selected-dot {
		position: absolute;
		top: -2px;
		right: -2px;
		width: 10px;
		height: 10px;
		background: var(--trial-accent-dark, #10b981);
		border-radius: 50%;
		border: 2px solid white;
	}

	.mymodal-current-dot {
		position: absolute;
		bottom: 4px;
		left: 50%;
		transform: translateX(-50%);
		width: 4px;
		height: 4px;
		background: var(--trial-accent);
		border-radius: 50%;
	}
</style>
