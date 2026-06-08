<script lang="ts">
	import { Calendar } from '$lib/utils/iconRegistry';
	import { dialogState } from '$lib/state/dialog.svelte';
	import { untrack } from 'svelte';

	interface Props {
		id?: string;
		value?: string;
		applicantIndex?: number | null;
		questionId: string;
		minYear?: number | null;
		maxYear?: number | null;
		introduceMonthIndia?: number | null;
		/**
		 * Forward-only fields (e.g. "Planned registration month") set this
		 * to true so the picker disables months strictly earlier than today.
		 * Defaults to false to preserve legacy past-anchored fields like
		 * disbursement / allotment dates. See CLAUDE.md §3 Pitfall (Planned
		 * registration month accepts past months, 2026-05-28).
		 */
		futureOnly?: boolean;
		label?: string;
		description?: string;
		textFieldClass?: string;
		continueButton?: boolean | any;
		placeholder?: string;
		onchange?: (e: CustomEvent<string>) => void;
	}

	let {
		id = '',
		value = $bindable(),
		applicantIndex = null,
		questionId,
		minYear = null,
		maxYear = null,
		introduceMonthIndia = null,
		futureOnly = false,
		label = undefined,
		onchange
	}: Props = $props();

	// ── Apply the month/year value selected in MonthYearModal ───────────
	// MonthYearModal writes to dialogState.selectedDate when the user
	// picks a month.  This effect reads the rune and applies the value
	// only to the correct DatePicker instance (identified by modalContext).
	//
	// IMPORTANT: the same-value guard prevents creating a new answers
	// object in the parent when the value hasn't changed, which would
	// cascade through every child effect and cause
	// effect_update_depth_exceeded.
	function applyMonthYear(newVal: string) {
		if (newVal === value) return;

		value = newVal;
		if (onchange) {
			onchange(new CustomEvent('change', { detail: newVal }));
		}
	}

	// Snapshot the selection epoch on mount. Any pick that already happened
	// before this DatePicker existed is "stale" — we must ignore it. Without
	// this guard, a fresh DatePicker mounting after a previous pick (e.g. the
	// second business entry's GST date field after the first entry's GST date
	// was picked) would read the leftover selectedDate + matching modalContext
	// and silently auto-apply the previous value with no user click.
	let lastSeenEpoch = $state<number | null>(null);

	$effect(() => {
		// Track the epoch — this is what fires the effect on each fresh pick.
		const epoch = dialogState.selectionEpoch;

		// First run after mount: record the baseline and never apply.
		if (lastSeenEpoch === null) {
			lastSeenEpoch = epoch;
			return;
		}

		// Same epoch as last time we ran = no new pick happened. Bail.
		if (epoch === lastSeenEpoch) return;
		lastSeenEpoch = epoch;

		// Read selectedDate + modalContext outside tracking so we only react
		// to epoch ticks (which signal a fresh confirmed pick).
		const d = untrack(() => dialogState.selectedDate);
		if (!d) return;
		const ctx = untrack(() => dialogState.modalContext);

		if (ctx.applicantIndex !== applicantIndex || ctx.questionId !== questionId) {
			return;
		}

		applyMonthYear(d);
	});

	// ── Open the layout-level MonthYearModal ────────────────────────────
	// Single atomic call replaces 4 sequential store writes, eliminating
	// the previous race window and stale-year-on-reopen bugs.
	// The layout renders MonthYearModal at the top of the DOM (avoids
	// z-index / overflow clipping issues, no double-modal rendering).
	function toggleDateArea() {
		dialogState.openDatePicker(
			applicantIndex,
			questionId,
			value || '',
			minYear,
			introduceMonthIndia,
			maxYear,
			futureOnly
		);
	}
</script>

<section class="z-30 flex w-full flex-col gap-1 md:gap-2">
	<div class="relative">
		<div class="flex w-full items-center bg-[var(--form-bg-card)]">
			<div
				class={`absolute left-0 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-300
				${value ? 'icon-filled' : 'icon-empty'}`}
			>
				<Calendar class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
			</div>

			<input
				{id}
				name={id}
				type="text"
				bind:value
				onclick={toggleDateArea}
				readonly
				class="text-labelText {value ? 'text-[var(--form-text-label)]' : 'text-[var(--form-text-muted)]'} !m-0 w-full rounded-l-md rounded-r-xl
					border border-2
					border-[var(--form-border)] bg-[var(--form-bg-card)]
					py-[0.8rem] pr-4 pl-14 placeholder-[var(--form-text-muted)] transition-colors outline-none
					focus:border-[var(--ddsa-primary-500)] focus:ring-1
					focus:ring-[var(--ddsa-primary-500)] "
				placeholder="Select date"
			/>
		</div>
	</div>
</section>

<style>
	.icon-empty {
		background: var(--ddsa-secondary-900, #1e293b);
	}
	:global(.dark) .icon-empty {
		background: var(--ddsa-secondary-200, #e2e8f0);
	}
	.icon-filled {
		background: var(--ddsa-primary-500);
	}
</style>
