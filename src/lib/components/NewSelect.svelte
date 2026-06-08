<script lang="ts">
	import type { Component } from 'svelte';
	import { getIcon, ChevronDown, Check, XCircle, TriangleAlert } from '$lib/utils/iconRegistry';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { formState } from '$lib/state/form.svelte';
	import { tick } from 'svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';
	import CustomSelect from './CustomSelect.svelte';

	type SelectOption = {
		label: string;
		/** Opt-in HTML rendering for trusted static labels only (e.g. styled relationship labels). */
		labelHtml?: string;
		value: string | number;
		disabled?: boolean;
		showWhen?: unknown;
	};

	interface Props {
		readonly?: boolean;
		id?: string;
		label?: string;
		/** Explicit placeholder. If omitted, falls back to `Select {subLabel}` or `Select an option`. */
		placeholder?: string;
		value?: string | number;
		selectedIndex?: number;
		options?: SelectOption[];
		required?: boolean;
		error?: string | null;
		warning?: string | null;
		disabled?: boolean;
		onChange?: (value: string | number) => void;
		onBlur?: () => void;
		icon?: Component | string | null;
		containerClass?: string;
		labelClass?: string;
		subLabel?: string;
		selectClass?: string;
		errorClass?: string;
	}

	let {
		readonly = false,
		id = '',
		label = '',
		placeholder: placeholderProp = undefined,
		onBlur = () => {},
		value = $bindable(),
		selectedIndex = 0,
		options = [],
		required = false,
		error = null,
		warning = null,
		disabled = false,
		onChange = (_v: string | number) => {},
		icon = null,
		containerClass = 'flex flex-col gap-1 md:gap-2',
		labelClass = 'text-sm font-medium text-gray-700',
		selectClass = '',
		subLabel = undefined,
		errorClass = ''
	}: Props = $props();

	let isOpen = $state(false);
	let isFocused = $state(false);
	let highlightedIndex = $state(-1);
	let searchString = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let dropdownRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let listRef: HTMLUListElement | null = $state(null);
	let dropdownPosition = $state<'bottom' | 'top'>('bottom');

	// Fixed-position coordinates for the dropdown (CLAUDE.md Pitfall #17 — FORM-3).
	// position: fixed + button-rect-derived left/top/width so the dropdown escapes
	// any ancestor with overflow:auto/clip/hidden (modal bodies, sticky panels).
	let dropdownLeft = $state(0);
	let dropdownTop = $state(0);
	let dropdownWidth = $state(0);
	let dropdownMaxHeight = $state(280);

	function toPascalCase(str: string | null | undefined): string {
		if (!str || typeof str !== 'string') return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(icon ? getIcon(toPascalCase(icon as string)) : null);

	// Compute context ONCE outside the loop to prevent store subscription explosion
	let showContext = $derived({
		...(formState.applicants[selectedIndex] ?? {}),
		...formState.applicationData
	});

	// Pre-filter visible options to avoid shouldShow in template
	let visibleOptions = $derived(
		options.filter((opt) => !opt.disabled && shouldShow((opt as any).showWhen, showContext))
	);

	// Find selected option
	let selectedOption = $derived(
		visibleOptions.find((opt) => String(opt.value) === String(value)) ?? null
	);

	// Find selected index
	let selectedIdx = $derived(
		visibleOptions.findIndex((opt) => String(opt.value) === String(value))
	);

	function calculateDropdownPosition() {
		if (!buttonRef) return;
		const rect = buttonRef.getBoundingClientRect();
		// Reserve space for fixed nav bar (~70px) at bottom of viewport
		const navBarReserve = 70;
		const spaceBelow = window.innerHeight - rect.bottom - navBarReserve;
		const spaceAbove = rect.top;
		const gap = 4;
		const viewportPadding = 16;
		const dropdownHeight = Math.min(visibleOptions.length * 44 + 8, 280);

		if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
			dropdownPosition = 'top';
			dropdownMaxHeight = Math.min(spaceAbove - gap - viewportPadding, 280);
			dropdownTop = rect.top - gap;
		} else {
			dropdownPosition = 'bottom';
			dropdownMaxHeight = Math.min(spaceBelow - gap - viewportPadding, 280);
			dropdownTop = rect.bottom + gap;
		}
		dropdownMaxHeight = Math.max(dropdownMaxHeight, 100);
		dropdownLeft = rect.left;
		dropdownWidth = rect.width;
	}

	async function openDropdown() {
		if (disabled) return;
		calculateDropdownPosition();
		isOpen = true;
		highlightedIndex = selectedIdx >= 0 ? selectedIdx : 0;
		await tick();
		scrollToHighlighted();
	}

	function closeDropdown() {
		isOpen = false;
		highlightedIndex = -1;
		searchString = '';
	}

	function toggleDropdown() {
		if (isOpen) {
			closeDropdown();
		} else {
			openDropdown();
		}
	}

	function selectOption(option: SelectOption) {
		value = option.value;
		onChange(option.value);
		closeDropdown();
		buttonRef?.focus();
	}

	function scrollToHighlighted() {
		if (!listRef || highlightedIndex < 0) return;
		const highlightedElement = listRef.children[highlightedIndex] as HTMLElement;
		if (highlightedElement) {
			highlightedElement.scrollIntoView({ block: 'nearest' });
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;

		switch (event.key) {
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (isOpen && highlightedIndex >= 0) {
					selectOption(visibleOptions[highlightedIndex]);
				} else {
					openDropdown();
				}
				break;

			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;

			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else {
					highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
					scrollToHighlighted();
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (!isOpen) {
					openDropdown();
				} else {
					highlightedIndex = Math.max(highlightedIndex - 1, 0);
					scrollToHighlighted();
				}
				break;

			case 'Home':
				event.preventDefault();
				if (isOpen) {
					highlightedIndex = 0;
					scrollToHighlighted();
				}
				break;

			case 'End':
				event.preventDefault();
				if (isOpen) {
					highlightedIndex = visibleOptions.length - 1;
					scrollToHighlighted();
				}
				break;

			case 'Tab':
				if (isOpen) {
					closeDropdown();
				}
				break;

			default:
				// Type-to-search
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
					event.preventDefault();
					handleTypeSearch(event.key);
				}
				break;
		}
	}

	function handleTypeSearch(char: string) {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchString += char.toLowerCase();

		const matchIndex = visibleOptions.findIndex((opt) =>
			opt.label.toLowerCase().startsWith(searchString)
		);

		if (matchIndex >= 0) {
			highlightedIndex = matchIndex;
			if (!isOpen) {
				selectOption(visibleOptions[matchIndex]);
			} else {
				scrollToHighlighted();
			}
		}

		searchTimeout = setTimeout(() => {
			searchString = '';
		}, 500);
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
			closeDropdown();
		}
	}

	function handleOptionMouseEnter(index: number) {
		highlightedIndex = index;
	}

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur() {
		isFocused = false;
		onBlur();
	}

	function handleChange(newValue: string | number) {
		value = newValue;
		onChange(newValue);
	}

	// Click outside listener
	$effect(() => {
		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
			};
		}
	});

	// Keep the fixed-position dropdown anchored to the button when ancestors
	// scroll or the viewport resizes. Capture phase so nested scrollers
	// (modal body, page) bubble up to this listener.
	$effect(() => {
		if (!isOpen) return;
		const onReposition = () => calculateDropdownPosition();
		window.addEventListener('scroll', onReposition, true);
		window.addEventListener('resize', onReposition);
		return () => {
			window.removeEventListener('scroll', onReposition, true);
			window.removeEventListener('resize', onReposition);
		};
	});

	// Cleanup timeout on destroy
	$effect(() => {
		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	});

	let placeholder = $derived(
		placeholderProp ?? (subLabel ? `Select ${subLabel}` : 'Select an option')
	);
</script>

<div class={`w-full ${containerClass}`}>
	{#if label}
		<label
			for="{id}-button"
			id="{id}-label"
			class="text-labelText font-titleBold !m-0 text-[var(--form-text-secondary)] {labelClass}"
		>
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</label>
	{/if}

	<div bind:this={dropdownRef} class="relative">
		{#if IconComponent}
			{@const Icon = IconComponent}
			<div
				class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200
					{disabled || readonly
					? 'icon-disabled'
					: isFocused
						? 'icon-focused'
						: value
							? 'icon-filled'
							: 'icon-empty'}"
			>
				<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
			</div>
		{/if}

		<CustomSelect
			{id}
			{options}
			bind:value
			{placeholder}
			disabled={disabled || readonly}
			{required}
			hasIcon={!!IconComponent}
			hasError={!!error}
			onChange={handleChange}
			onFocus={handleFocus}
			onBlur={handleBlur}
		/>

		{#if subLabel && value}
			<p
				class="tinyText absolute -top-2 left-[4rem] z-10 hidden bg-[var(--form-bg-card)] px-1 text-[var(--form-text-muted)] md:block"
			>
				Selected {subLabel}
			</p>
		{/if}
	</div>

	{#if error}
		<div role="alert" class="error-message">
			<XCircle class="h-5 w-5 shrink-0 text-red-500" />
			<span class="alertText text-red-600">{error}</span>
		</div>
	{/if}

	{#if warning}
		<div class="warning-message">
			<TriangleAlert class="text-currentColor h-5 w-5 shrink-0" />
			<p class="alertText text-currentColor">{warning}</p>
		</div>
	{/if}
</div>

<style>
	.new-select-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 2rem 0.5rem 0.75rem;
		/* Theme tokens — auto-adapt to dark mode (CLAUDE.md Pitfall #10). */
		background-color: var(--form-bg-card);
		border: 1px solid var(--form-border, #d1d5db);
		border-radius: 0.375rem;
		cursor: pointer;
		outline: none;
		transition: all 0.15s ease;
		text-align: left;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--form-text);
		position: relative;
	}

	@media (min-width: 768px) {
		.new-select-button {
			padding: 0.75rem 2rem 0.75rem 0.75rem;
		}
	}

	.new-select-button:hover:not(:disabled) {
		border-color: #9ca3af;
	}

	.new-select-button:focus,
	.new-select-button-open {
		border-color: var(--ddsa-primary-500, #f59e0b);
		box-shadow: 0 0 0 2px rgba(203, 153, 126, 0.2);
	}

	.new-select-button-error {
		border-color: #ef4444;
	}

	.new-select-button-error:focus {
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
	}

	.new-select-button-with-icon {
		padding-left: 3.5rem;
	}

	.new-select-button:disabled {
		background-color: var(--form-bg-disabled, #f3f4f6);
		cursor: not-allowed;
	}

	.new-select-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.new-select-placeholder {
		color: #9ca3af;
	}

	.new-select-arrow {
		position: absolute;
		right: 0.75rem;
		width: 1rem;
		height: 1rem;
		color: #9ca3af;
		transition: transform 0.2s ease;
		pointer-events: none;
	}

	@media (min-width: 640px) {
		.new-select-arrow {
			width: 1.25rem;
			height: 1.25rem;
		}
	}

	.new-select-arrow-open {
		transform: rotate(180deg);
		color: var(--ddsa-primary-500, #f59e0b);
	}

	.new-select-dropdown {
		/* position: fixed so the dropdown escapes any ancestor with
		   overflow:auto/clip/hidden (modal bodies, sticky panels).
		   left/top/width/max-height are set inline from button getBoundingClientRect(). */
		position: fixed;
		z-index: 100;
		overflow-y: auto;
		/* Theme token — dark mode swaps to dark surface (CLAUDE.md Pitfall #10). */
		background-color: var(--form-bg-card);
		border: 1px solid var(--ddsa-primary-200, #fde68a);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
		padding: 0.25rem;
		margin: 0;
		list-style: none;
	}

	/* .new-select-dropdown-bottom needs no rules — `top` (set inline) is the
	   gap-padded button bottom; the box grows downward by default. */
	.new-select-dropdown-top {
		/* `top` (set inline) is the gap-padded button top; translateY(-100%)
		   flips the box upward so it grows above the button. */
		transform: translateY(-100%);
	}

	.new-select-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.15s ease;
		color: var(--ddsa-gray-700, #374151);
		font-size: 0.875rem;
	}

	.new-select-option:hover,
	.new-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-100, #fef3c7) 0%,
			var(--ddsa-primary-50, #fffbeb) 100%
		);
		color: var(--ddsa-primary-700, #b45309);
	}

	.new-select-option-selected {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-500, #f59e0b) 0%,
			var(--ddsa-accent-500, #ea580c) 100%
		);
		color: white;
		font-weight: 500;
	}

	.new-select-option-selected:hover,
	.new-select-option-selected.new-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-600, #d97706) 0%,
			var(--ddsa-accent-600, #dc2626) 100%
		);
		color: white;
	}

	.new-select-option-label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.new-select-option-check {
		width: 1rem;
		height: 1rem;
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	/* Scrollbar styling */
	.new-select-dropdown::-webkit-scrollbar {
		width: 6px;
	}

	.new-select-dropdown::-webkit-scrollbar-track {
		background: var(--ddsa-gray-100, #f3f4f6);
		border-radius: 3px;
	}

	.new-select-dropdown::-webkit-scrollbar-thumb {
		background: var(--ddsa-primary-300, #fcd34d);
		border-radius: 3px;
	}

	.new-select-dropdown::-webkit-scrollbar-thumb:hover {
		background: var(--ddsa-primary-400, #fbbf24);
	}

	.icon-empty {
		background: var(--ddsa-secondary-900, #1e293b);
	}
	:global(.dark) .icon-empty {
		background: var(--ddsa-secondary-200, #e2e8f0);
	}
	.icon-filled,
	.icon-focused {
		border-right-color: color-mix(in srgb, var(--ddsa-primary-500) 35%, var(--form-border));
	}
	.icon-filled {
		background: var(--ddsa-primary-500);
	}
	.icon-focused {
		background: var(--ddsa-primary-500);
		box-shadow: 0 0 8px color-mix(in srgb, var(--ddsa-primary-500) 40%, transparent);
	}

	.icon-disabled {
		border-right-color: var(--ddsa-primary-500);
	}
	.icon-disabled {
		color: var(--form-text-muted);
	}
</style>
