<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import { getIcon, ChevronDown, Check } from '$lib/utils/iconRegistry';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { formState } from '$lib/state/form.svelte';
	import { tick } from 'svelte';

	type SelectOption = {
		label: string;
		value: string | number;
		icon?: string;
		helperText?: string;
		/** Alias for helperText — used in JSON config options */
		description?: string;
		disabled?: boolean;
		showWhen?: any;
	};

	interface Props {
		id?: string;
		label?: string;
		placeholder?: string;
		value?: string | number;
		selectedIndex?: number;
		isTouched?: boolean;
		options?: SelectOption[];
		showValidationErrors?: boolean;
		required?: boolean;
		error?: string;
		warning?: string | null;
		disabled?: boolean;
		onChange?: (val: string | number) => void;
		icon?: typeof SvelteComponent | string | null;
		containerClass?: string;
		labelClass?: string;
		selectClass?: string;
		errorClass?: string;
	}

	let {
		id = '',
		label = '',
		placeholder = '',
		value = '',
		selectedIndex = 0,
		isTouched = $bindable(false),
		options = [],
		showValidationErrors = false,
		required = false,
		error = '',
		warning = null,
		disabled = false,
		onChange = () => {},
		icon = null,
		containerClass = '',
		labelClass = 'buttonText',
		selectClass = '',
		errorClass = ''
	}: Props = $props();

	// Instance-specific tracking for this select component
	let previousValue = $state<string | number>('');
	let previousVisibleOptionsSignature = $state('');
	let clearTimeoutId: ReturnType<typeof setTimeout> | null = $state(null);

	function toPascalCase(str: string | null | undefined): string {
		if (!str || typeof str !== 'string') return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(icon ? getIcon(toPascalCase(icon as string)) : null);

	let applicant = $derived(formState.applicants[selectedIndex] ?? {});
	let answerContext = $derived({
		...applicant,
		...formState.applicationData
	});

	let visibleOptions = $derived(options.filter((opt) => shouldShow(opt.showWhen, answerContext)));

	// Create a signature of visible options to detect actual changes
	let visibleOptionsSignature = $derived(
		visibleOptions
			.map((o) => o.value)
			.sort()
			.join('|')
	);

	// Enhanced reactive clearing logic with proper instance isolation
	$effect(() => {
		// Cancel any pending clear operations
		if (clearTimeoutId !== null) {
			clearTimeout(clearTimeoutId);
			clearTimeoutId = null;
		}

		// Only attempt to clear if we have a meaningful value
		if (value && value !== '' && value !== null && value !== undefined) {
			const allowedValues = visibleOptions.map((o) => o.value);

			// Only proceed if:
			// 1. We have visible options (not during initialization)
			// 2. The visible options signature actually changed (not just a recalculation)
			// 3. Current value is not in the allowed list
			if (
				allowedValues.length > 0 &&
				visibleOptionsSignature !== previousVisibleOptionsSignature &&
				previousVisibleOptionsSignature !== '' && // Don't clear on first render
				!allowedValues.includes(value)
			) {
				// Schedule clearing with instance-specific timeout
				clearTimeoutId = setTimeout(() => {
					// Double-check conditions before clearing
					const currentAllowedValues = visibleOptions.map((o) => o.value);
					const currentValue = value;

					if (
						currentAllowedValues.length > 0 &&
						currentValue &&
						!currentAllowedValues.includes(currentValue)
					) {
						onChange('');
					}

					clearTimeoutId = null;
				}, 10);
			}
		}

		// Update tracking variables
		previousValue = value;
		previousVisibleOptionsSignature = visibleOptionsSignature;
	});

	let displayError = $derived(isTouched && error ? error : '');

	// Custom dropdown state
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let searchString = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let dropdownRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let listRef: HTMLUListElement | null = $state(null);
	let dropdownPosition = $state<'bottom' | 'top'>('bottom');
	let dropdownMaxHeight = $state(0);
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);

	// Fixed-position coordinates for the dropdown (CLAUDE.md Pitfall #17 — FORM-3).
	// position: fixed + button-rect-derived left/top/width so the dropdown escapes
	// any ancestor with overflow:auto/clip/hidden (modal bodies, sticky panels).
	let dropdownLeft = $state(0);
	let dropdownTop = $state(0);
	let dropdownWidth = $state(0);

	let selectedOption = $derived(
		visibleOptions.find((opt) => String(opt.value) === String(value)) ?? null
	);

	let selectedIdx = $derived(
		visibleOptions.findIndex((opt) => String(opt.value) === String(value))
	);

	function calculateDropdownPosition() {
		if (!buttonRef) return;
		const rect = buttonRef.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const gap = 4;
		const viewportPadding = 16;
		const isMobileViewport = window.innerWidth < 768;
		const maxAllowed = isMobileViewport ? 180 : 240;
		const estimatedHeight = Math.min(visibleOptions.length * 44 + 8, maxAllowed);

		if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
			dropdownPosition = 'top';
			dropdownMaxHeight = Math.min(spaceAbove - gap - viewportPadding, maxAllowed);
			dropdownTop = rect.top - gap;
		} else {
			dropdownPosition = 'bottom';
			dropdownMaxHeight = Math.min(spaceBelow - gap - viewportPadding, maxAllowed);
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
		updateScrollIndicators();
		scrollToHighlighted();
	}

	function closeDropdown() {
		isOpen = false;
		highlightedIndex = -1;
		searchString = '';
	}

	function toggleDropdown() {
		if (isOpen) closeDropdown();
		else openDropdown();
	}

	function selectOption(option: SelectOption) {
		isTouched = true;
		onChange(option.value);
		closeDropdown();
		buttonRef?.focus();
	}

	function scrollToHighlighted() {
		if (!listRef || highlightedIndex < 0) return;
		const el = listRef.children[highlightedIndex] as HTMLElement;
		if (el) el.scrollIntoView({ block: 'nearest' });
		requestAnimationFrame(updateScrollIndicators);
	}

	function updateScrollIndicators() {
		if (!listRef) return;
		const { scrollTop, scrollHeight, clientHeight } = listRef;
		canScrollUp = scrollTop > 2;
		canScrollDown = scrollTop + clientHeight < scrollHeight - 2;
	}

	function handleDropdownScroll() {
		updateScrollIndicators();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;
		switch (event.key) {
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (isOpen && highlightedIndex >= 0) selectOption(visibleOptions[highlightedIndex]);
				else openDropdown();
				break;
			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen) openDropdown();
				else {
					highlightedIndex = Math.min(highlightedIndex + 1, visibleOptions.length - 1);
					scrollToHighlighted();
				}
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (!isOpen) openDropdown();
				else {
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
				if (isOpen) closeDropdown();
				break;
			default:
				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
					event.preventDefault();
					handleTypeSearch(event.key);
				}
				break;
		}
	}

	function handleTypeSearch(char: string) {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchString += char.toLowerCase();
		const matchIndex = visibleOptions.findIndex((opt) =>
			opt.label.toLowerCase().startsWith(searchString)
		);
		if (matchIndex >= 0) {
			highlightedIndex = matchIndex;
			if (!isOpen) selectOption(visibleOptions[matchIndex]);
			else scrollToHighlighted();
		}
		searchTimeout = setTimeout(() => {
			searchString = '';
		}, 500);
	}

	function handleClickOutside(event: MouseEvent) {
		if (dropdownRef && !dropdownRef.contains(event.target as Node)) closeDropdown();
	}

	function handleOptionMouseEnter(idx: number) {
		highlightedIndex = idx;
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
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

	$effect(() => {
		return () => {
			if (searchTimeout) clearTimeout(searchTimeout);
		};
	});
</script>

<div class={`${containerClass}`}>
	{#if label}
		<label
			for="{id}-button"
			id="{id}-label"
			class={`text-labelText font-titleMedium !m-0 text-[var(--form-text-label)] ${labelClass}`}
		>
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</label>
	{/if}

	<div bind:this={dropdownRef} class="relative mt-2">
		<div
			class="flex overflow-hidden rounded-md border bg-(--form-bg-card) transition-all duration-150
			{displayError
				? 'border-red-500 ring-1 ring-red-500/30'
				: isOpen
					? 'border-[var(--form-border)] focus-within:ring-1 focus-within:ring-[var(--ddsa-primary-700)]'
					: 'border-[var(--form-border)] focus-within:ring-1 focus-within:ring-[var(--ddsa-primary-700)]'}"
		>
			{#if IconComponent}
				{@const Icon = IconComponent}
				<div
					class="flex w-8 shrink-0 items-center justify-center transition-all duration-300 {value &&
					value !== ''
						? 'icon-filled'
						: 'icon-empty'}"
				>
					<Icon
						class="h-4 w-4 shrink-0 text-white transition-transform duration-300 dark:text-gray-900"
					/>
				</div>
			{/if}

			<!-- Hidden input for form submission -->
			<input type="hidden" {id} name={id} value={value ?? ''} {required} />

			<!-- Custom Select Button -->
			<button
				bind:this={buttonRef}
				id="{id}-button"
				type="button"
				class="app-select-button buttonText h-10 px-3 py-2.5 {selectClass}"
				class:app-select-button-disabled={disabled}
				{disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-labelledby="{id}-label"
				onclick={toggleDropdown}
				onkeydown={handleKeyDown}
			>
				<span
					class="app-select-value text-[var(--form-text-label)]"
					class:app-select-placeholder={!selectedOption}
				>
					{#if selectedOption}
						{selectedOption.label}
					{:else}
						{placeholder || 'Select Option'}
					{/if}
				</span>
				<ChevronDown
					size={16}
					class="app-select-arrow text-[var(--form-text-label)] {isOpen
						? 'app-select-arrow-open'
						: ''}"
				/>
			</button>
		</div>

		<!-- Dropdown -->
		{#if isOpen}
			<div
				class="app-select-dropdown-wrapper"
				class:app-select-dropdown-top={dropdownPosition === 'top'}
				class:app-select-dropdown-bottom={dropdownPosition === 'bottom'}
				style:left="{dropdownLeft}px"
				style:top="{dropdownTop}px"
				style:width="{dropdownWidth}px"
			>
				{#if canScrollUp}
					<div class="app-select-scroll-fade-top"></div>
				{/if}
				<ul
					bind:this={listRef}
					id="{id}-listbox"
					class="app-select-dropdown"
					style:max-height="{dropdownMaxHeight}px"
					role="listbox"
					aria-activedescendant={highlightedIndex >= 0
						? `${id}-option-${highlightedIndex}`
						: undefined}
					tabindex="-1"
					onscroll={handleDropdownScroll}
				>
					{#each visibleOptions as option, idx (option.value)}
						{@const OptionIcon = option.icon ? getIcon(toPascalCase(option.icon)) : null}
						<li
							id="{id}-option-{idx}"
							class="app-select-option"
							class:app-select-option-highlighted={highlightedIndex === idx}
							class:app-select-option-selected={selectedIdx === idx}
							class:app-select-option-with-helper={option.helperText || option.description}
							role="option"
							aria-selected={selectedIdx === idx}
							onclick={() => selectOption(option)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									selectOption(option);
								}
							}}
							onmouseenter={() => handleOptionMouseEnter(idx)}
						>
							{#if OptionIcon}
								<div
									class="app-select-option-icon"
									class:app-select-option-icon-selected={selectedIdx === idx}
								>
									<OptionIcon size={16} />
								</div>
							{/if}
							<div class="app-select-option-content">
								<span
									class={selectedIdx === idx ? 'flex-1 ' : 'flex-1 text-[var(--form-text-label)]'}
									>{option.label}</span
								>
								{#if option.helperText || option.description}
									<span class="app-select-option-helper"
										>{option.helperText ?? option.description}</span
									>
								{/if}
							</div>
							{#if selectedIdx === idx}
								<Check class="app-select-option-check" />
							{/if}
						</li>
					{/each}
				</ul>
				{#if canScrollDown}
					<div class="app-select-scroll-fade-bottom"></div>
				{/if}
			</div>
		{/if}
	</div>

	{#if displayError}
		<p class="tinyText mt-1 pl-8 text-red-600">{displayError}</p>
	{/if}

	{#if warning}
		<div class="warning-message mt-1">
			<p class="smallText italic">
				{warning}
			</p>
		</div>
	{/if}
</div>

<style>
	.app-select-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background-color: var(--form-bg-card);
		border: none;
		cursor: pointer;
		outline: none;
		transition: all 0.15s ease;
		text-align: left;
		color: var(--form-text);
		position: relative;
	}

	.app-select-button-disabled {
		background-color: var(--form-bg-disabled);
		cursor: not-allowed;
		color: var(--form-text-muted);
	}

	.app-select-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.app-select-placeholder {
		color: var(--form-text-muted);
		/* font-size: 0.8rem; */
	}

	.app-select-arrow {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 0.875rem;
		height: 0.875rem;
		/* color: var(--form-text-muted); */
		transition:
			transform 0.2s ease,
			color 0.2s ease;
		pointer-events: none;
	}

	.app-select-arrow-open {
		transform: translateY(-50%) rotate(180deg);
		color: var(--ddsa-primary-500, #f59e0b);
	}

	.app-select-dropdown-wrapper {
		/* position: fixed so the dropdown escapes any ancestor with
		   overflow:auto/clip/hidden (modal bodies, sticky panels).
		   left/top/width are set inline from button getBoundingClientRect(). */
		position: fixed;
		z-index: 100;
	}

	/* .app-select-dropdown-bottom needs no rules — `top` (set inline) is the
	   gap-padded button bottom; the box grows downward by default. */
	.app-select-dropdown-top {
		/* `top` (set inline) is the gap-padded button top; translateY(-100%)
		   flips the box upward so it grows above the button. */
		transform: translateY(-100%);
	}

	.app-select-dropdown {
		overflow-y: auto;
		background-color: var(--form-bg-card);
		border: 1px solid var(--ddsa-primary-200, #fde68a);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
		padding: 0.25rem;
		padding-right: 0.375rem;
		margin: 0;
		list-style: none;
	}

	.app-select-scroll-fade-top,
	.app-select-scroll-fade-bottom {
		position: absolute;
		left: 1px;
		right: 12px;
		height: 24px;
		pointer-events: none;
		z-index: 1;
	}

	.app-select-scroll-fade-top {
		top: 1px;
		background: linear-gradient(to bottom, var(--form-scroll-fade) 0%, transparent 100%);
		border-radius: 0.5rem 0.5rem 0 0;
		box-shadow: inset 0 6px 6px -4px rgba(0, 0, 0, 0.06);
	}

	.app-select-scroll-fade-bottom {
		bottom: 1px;
		background: linear-gradient(to top, var(--form-scroll-fade) 0%, transparent 100%);
		border-radius: 0 0 0.5rem 0.5rem;
		box-shadow: inset 0 -6px 6px -4px rgba(0, 0, 0, 0.06);
	}

	.app-select-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.15s ease;
		color: var(--ddsa-gray-700, #374151);
		font-family: var(--font-paragraph);
		font-size: var(--font-size-xs);
		line-height: 1.5rem;
		gap: 0.5rem;
		border-bottom: 1px solid var(--ddsa-gray-100, #f3f4f6);

		@media (min-width: 768px) {
			font-size: var(--font-size-base);
		}
	}

	.app-select-option:last-child {
		border-bottom: none;
	}

	.app-select-option-with-helper {
		align-items: flex-start;
		padding: 0.625rem 0.75rem;
	}

	.app-select-option:hover,
	.app-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-100, #fef3c7) 0%,
			var(--ddsa-primary-50, #fffbeb) 100%
		);
		color: var(--ddsa-primary-700, #b45309);
	}

	/* .app-select-option:hover .app-select-option-helper,
	.app-select-option-highlighted .app-select-option-helper {
		color: var(--ddsa-primary-600, #d97706);
	} */

	.app-select-option-selected {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-500, #f59e0b) 0%,
			var(--ddsa-accent-500, #ea580c) 100%
		);
		color: white;
		font-weight: 500;
	}

	.app-select-option-selected .app-select-option-helper {
		color: rgba(255, 255, 255, 0.85);
	}

	.app-select-option-selected:hover,
	.app-select-option-selected.app-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-600, #d97706) 0%,
			var(--ddsa-accent-600, #dc2626) 100%
		);
		color: white;
	}

	.app-select-option-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.app-select-option-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.app-select-option-helper {
		font-size: 0.7rem;
		color: var(--ddsa-gray-500, #6b7280);
		font-weight: 400;
		line-height: 1.3;
		white-space: normal;
	}

	.app-select-option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.375rem;
		background-color: var(--ddsa-gray-100, #f3f4f6);
		color: var(--ddsa-gray-600, #4b5563);
		flex-shrink: 0;
		transition: all 0.15s ease;
	}

	.app-select-option:hover .app-select-option-icon,
	.app-select-option-highlighted .app-select-option-icon {
		background-color: var(--ddsa-primary-200, #fde68a);
		/* color: var(--ddsa-primary-700, #b45309); */
	}

	.app-select-option-icon-selected {
		background-color: rgba(255, 255, 255, 0.2) !important;
		color: white !important;
	}

	.app-select-option-check {
		width: 1rem;
		height: 1rem;
		margin-left: 0.5rem;
		flex-shrink: 0;
		align-self: center;
	}

	/* Scrollbar styling — dark contrasting slider */
	.app-select-dropdown {
		scrollbar-width: auto;
		scrollbar-color: var(--form-text-muted, #3f3f46) var(--form-bg-alt, #e8e8e8);
	}

	.app-select-dropdown::-webkit-scrollbar {
		width: 8px;
	}

	.app-select-dropdown::-webkit-scrollbar-track {
		background: var(--form-bg-alt, #ededed);
		border-radius: 8px;
		margin: 6px 2px;
	}

	.app-select-dropdown::-webkit-scrollbar-thumb {
		background: var(--form-text-muted, #3f3f46);
		border-radius: 8px;
		border: 2px solid var(--form-bg-alt, #ededed);
		min-height: 36px;
	}

	.app-select-dropdown::-webkit-scrollbar-thumb:hover {
		background: #1f1f23;
	}

	.app-select-dropdown::-webkit-scrollbar-thumb:active {
		background: #0a0a0a;
	}
</style>
