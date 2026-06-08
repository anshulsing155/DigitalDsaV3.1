<script lang="ts">
	import TextField from './TextField.svelte';
	import { tick } from 'svelte';

	/**
	 * Firm-name combobox — a TextField with a floating suggestion list AND
	 * the ability to accept an arbitrary typed string as the final value.
	 * Used for the Director partner-in-firm flow where the firm name should
	 * come from a known list (parent borrowing firm, sibling-director
	 * declarations, prior entries) but the user may also type a new name.
	 *
	 * Designed to mount inside modal contexts (DirectorFormModal,
	 * IncomePageNew's IncomeModalContent), so the dropdown uses
	 * `position: fixed` with rect-based positioning to avoid Pitfall #17
	 * (scrollable-modal clipping).
	 *
	 * Spec: docs/specs/DIRECTOR-FIRM-NAME-SPEC.md
	 *   - §2: component selection (TextField wrapper, not a select extension)
	 *   - §3: option source algorithm (caller assembles + passes options)
	 *   - §4: inline-add UX ("Use X as new firm name" pseudo-option)
	 */

	interface FirmOption {
		label: string;
		value: string;
	}

	interface Props {
		id: string;
		label: string;
		value: string;
		options: FirmOption[];
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string | null;
		onChange: (value: string) => void;
	}

	let {
		id,
		label,
		value = '',
		options = [],
		placeholder = 'Enter firm name',
		required = false,
		disabled = false,
		error = null,
		onChange
	}: Props = $props();

	// ── Local state ──
	let focused = $state(false);
	let highlightedIndex = $state(0);
	let wrapperEl: HTMLDivElement | undefined = $state();
	let dropdownTop = $state(0);
	let dropdownLeft = $state(0);
	let dropdownWidth = $state(0);
	const MAX_VISIBLE_OPTIONS = 6;

	// ── Derived: filter options against the typed value ──
	let filteredOptions = $derived.by(() => {
		const trimmed = value.trim().toLowerCase();
		if (!trimmed) return options.slice(0, MAX_VISIBLE_OPTIONS);
		return options
			.filter((opt) => opt.value.toLowerCase().includes(trimmed))
			.slice(0, MAX_VISIBLE_OPTIONS);
	});

	// ── Derived: show "Use X as new firm name" when typed text is non-empty
	// and not an exact (normalized) match to any known option.
	let showCreatePseudoOption = $derived.by(() => {
		const trimmed = value.trim();
		if (!trimmed) return false;
		const normalized = trimmed.toLowerCase();
		return !options.some((opt) => opt.value.toLowerCase() === normalized);
	});

	// ── Total visible row count (pseudo-option + filtered options) ──
	let totalRows = $derived(filteredOptions.length + (showCreatePseudoOption ? 1 : 0));

	// ── Show dropdown only when focused AND there is something to show ──
	let showDropdown = $derived(focused && !disabled && totalRows > 0);

	// ── Position dropdown via getBoundingClientRect — fixed, modal-safe ──
	function recomputePosition() {
		if (!wrapperEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		dropdownTop = rect.bottom + 4;
		dropdownLeft = rect.left;
		dropdownWidth = rect.width;
	}

	$effect(() => {
		if (!showDropdown) return;
		// Re-measure on open and on scroll/resize while open.
		recomputePosition();
		const onScrollOrResize = () => recomputePosition();
		window.addEventListener('scroll', onScrollOrResize, true);
		window.addEventListener('resize', onScrollOrResize);
		return () => {
			window.removeEventListener('scroll', onScrollOrResize, true);
			window.removeEventListener('resize', onScrollOrResize);
		};
	});

	// ── Reset highlight when the visible row set changes ──
	$effect(() => {
		// Touch the values that affect row count so the effect re-runs.
		filteredOptions.length;
		showCreatePseudoOption;
		if (highlightedIndex >= totalRows) {
			highlightedIndex = 0;
		}
	});

	/**
	 * Collapse runs of whitespace to a single space and trim the ends.
	 * "Acme   Corp  " → "Acme Corp". Applied only on COMMIT (blur / accept-typed),
	 * never on keystroke — collapsing live would stop the user typing a space
	 * between words. This also keeps the stored name matchable against the option
	 * list, which compares case-insensitively but does not itself collapse spaces
	 * (bug P7: a double-spaced name silently became a near-duplicate firm).
	 */
	function normalizeFirmName(raw: string): string {
		return raw.replace(/\s+/g, ' ').trim();
	}

	function handleInput(val: string | string[]) {
		const next = typeof val === 'string' ? val : String(val ?? '');
		onChange(next);
		highlightedIndex = 0;
	}

	function handleFocus() {
		focused = true;
		highlightedIndex = 0;
		// Delay one tick so wrapperEl is laid out before measuring.
		tick().then(recomputePosition);
	}

	function handleBlur() {
		// Delay so clicks on dropdown rows register first.
		setTimeout(() => {
			focused = false;
			// Commit-time normalization: clean up any multi-space / padded firm name
			// the user typed before they leave the field.
			const normalized = normalizeFirmName(value);
			if (normalized !== value) onChange(normalized);
		}, 150);
	}

	function selectOption(optValue: string) {
		onChange(optValue);
		focused = false;
	}

	function selectPseudoOption() {
		// "Use X as new firm name" — accept the typed text, whitespace-normalized
		// (trim ends + collapse internal runs) so it matches future lookups.
		onChange(normalizeFirmName(value));
		focused = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showDropdown) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlightedIndex = (highlightedIndex + 1) % totalRows;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlightedIndex = (highlightedIndex - 1 + totalRows) % totalRows;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			activateHighlighted();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			focused = false;
		} else if (e.key === 'Tab') {
			focused = false;
			// Don't preventDefault — let Tab move focus naturally.
		}
	}

	function activateHighlighted() {
		// Order in the list: pseudo-option (if shown) is row 0, then filteredOptions.
		if (showCreatePseudoOption) {
			if (highlightedIndex === 0) {
				selectPseudoOption();
				return;
			}
			const opt = filteredOptions[highlightedIndex - 1];
			if (opt) selectOption(opt.value);
		} else {
			const opt = filteredOptions[highlightedIndex];
			if (opt) selectOption(opt.value);
		}
	}
</script>

<div bind:this={wrapperEl} class="firm-combobox-wrapper" onkeydown={handleKeydown} role="combobox" tabindex="-1" aria-haspopup="listbox" aria-expanded={showDropdown} aria-controls={`${id}-dropdown`}>
	<div onfocusin={handleFocus} onfocusout={handleBlur}>
		<TextField
			{id}
			{label}
			{placeholder}
			{value}
			{required}
			{error}
			readonly={disabled}
			onInput={(val) => handleInput(val)}
		/>
	</div>

	{#if showDropdown}
		<div
			id={`${id}-dropdown`}
			role="listbox"
			class="firm-combobox-dropdown"
			style="top: {dropdownTop}px; left: {dropdownLeft}px; width: {dropdownWidth}px;"
		>
			{#if showCreatePseudoOption}
				<button
					type="button"
					role="option"
					aria-selected={highlightedIndex === 0}
					class="firm-combobox-row firm-combobox-pseudo"
					class:firm-combobox-row-highlighted={highlightedIndex === 0}
					onmousedown={(e) => {
						e.preventDefault();
						selectPseudoOption();
					}}
				>
					<span class="firm-combobox-plus">+</span>
					Use <span class="firm-combobox-typed">"{value.trim()}"</span> as new firm name
				</button>
			{/if}

			{#each filteredOptions as opt, i (opt.value + i)}
				{@const rowIndex = showCreatePseudoOption ? i + 1 : i}
				<button
					type="button"
					role="option"
					aria-selected={highlightedIndex === rowIndex}
					class="firm-combobox-row"
					class:firm-combobox-row-highlighted={highlightedIndex === rowIndex}
					onmousedown={(e) => {
						e.preventDefault();
						selectOption(opt.value);
					}}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.firm-combobox-wrapper {
		position: relative;
	}

	/* Fixed positioning so the dropdown escapes any scrollable parent
	   (e.g., modal body). Pitfall #17 — absolute positioning gets clipped
	   inside `overflow: auto` ancestors. */
	.firm-combobox-dropdown {
		position: fixed;
		z-index: 100;
		max-height: 18rem;
		overflow-y: auto;
		background-color: white;
		border: 1px solid rgb(229 231 235);
		border-radius: 0.375rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
	}

	:global(.dark) .firm-combobox-dropdown {
		background-color: rgb(31 41 55);
		border-color: rgb(55 65 81);
	}

	.firm-combobox-row {
		display: block;
		width: 100%;
		padding: 0.625rem 1rem;
		text-align: left;
		font-size: 0.875rem;
		color: rgb(31 41 55);
		border: none;
		border-bottom: 1px solid rgb(243 244 246);
		background: transparent;
		cursor: pointer;
		transition: background-color 120ms;
	}

	.firm-combobox-row:last-child {
		border-bottom: none;
	}

	.firm-combobox-row:hover {
		background-color: rgb(249 250 251);
	}

	.firm-combobox-row-highlighted {
		background-color: rgb(239 246 255);
	}

	:global(.dark) .firm-combobox-row {
		color: rgb(229 231 235);
		border-bottom-color: rgb(55 65 81);
	}

	:global(.dark) .firm-combobox-row:hover {
		background-color: rgb(55 65 81);
	}

	:global(.dark) .firm-combobox-row-highlighted {
		background-color: rgb(30 58 138 / 0.4);
	}

	.firm-combobox-pseudo {
		background-color: rgb(249 250 251);
		font-style: italic;
		color: rgb(75 85 99);
	}

	:global(.dark) .firm-combobox-pseudo {
		background-color: rgb(17 24 39);
		color: rgb(156 163 175);
	}

	.firm-combobox-plus {
		display: inline-block;
		width: 1rem;
		font-weight: 600;
		color: rgb(37 99 235);
	}

	.firm-combobox-typed {
		font-weight: 600;
		font-style: normal;
		color: rgb(31 41 55);
	}

	:global(.dark) .firm-combobox-typed {
		color: rgb(229 231 235);
	}
</style>
