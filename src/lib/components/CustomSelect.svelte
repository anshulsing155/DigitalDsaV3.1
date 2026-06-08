<script lang="ts">
	import { ChevronDown, Check } from '$lib/utils/iconRegistry';
	import { tick } from 'svelte';

	interface Option {
		label: string;
		value: string | number;
		helperText?: string;
	}

	interface Props {
		id: string;
		options?: Option[];
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		hasIcon?: boolean;
		hasError?: boolean;
		searchable?: boolean;
		searchPlaceholder?: string;
		onChange?: (value: string | number) => void;
		onFocus?: () => void;
		onBlur?: () => void;
	}

	let {
		id,
		options = [],
		value = $bindable(),
		placeholder = 'Select an option',
		disabled = false,
		required = false,
		hasIcon = false,
		hasError = false,
		searchable = false,
		searchPlaceholder = 'Search...',
		onChange = () => {},
		onFocus = () => {},
		onBlur = () => {}
	}: Props = $props();

	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let searchString = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let dropdownRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let listRef: HTMLUListElement | null = $state(null);
	let searchInputRef: HTMLInputElement | null = $state(null);
	let dropdownPosition = $state<'bottom' | 'top'>('bottom');
	let dropdownMaxHeight = $state(0);
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);

	// Fixed-position coordinates for the dropdown. We render the dropdown with
	// position: fixed so it escapes any ancestor with overflow:auto/clip/hidden
	// (e.g. modal scroll regions, sticky panels). Without this, dropdowns inside
	// scrollable modals get clipped at the modal's edges — burned us on the
	// Existing Loans modal where the loan-type list options were cropped.
	let dropdownLeft = $state(0);
	let dropdownTop = $state(0);
	let dropdownWidth = $state(0);

	// Search filter for searchable mode
	let searchFilter = $state('');

	// Filtered options when searchable
	// Normalize both query and label (strip spaces) so "110025" matches "(110 025)"
	const filteredOptions = $derived(
		searchable && searchFilter
			? (() => {
					const query = searchFilter.toLowerCase().replace(/\s/g, '');
					return options.filter((opt) =>
						opt.label.toLowerCase().replace(/\s/g, '').includes(query)
					);
				})()
			: options
	);

	// Find selected option (from full list).
	// When options are still loading (empty array) but value exists, show value as label.
	let selectedOption = $derived(
		options.find((opt) => String(opt.value) === String(value)) ??
			(value ? { label: String(value), value } : null)
	);

	// Find selected index (in filtered list for highlighting)
	let selectedIndex = $derived(
		filteredOptions.findIndex((opt) => String(opt.value) === String(value))
	);

	function calculateDropdownPosition() {
		if (!buttonRef) return;
		const rect = buttonRef.getBoundingClientRect();
		// Reserve space for fixed nav bar (~70px) at bottom of viewport
		const navBarReserve = 70;
		const spaceBelow = window.innerHeight - rect.bottom - navBarReserve;
		const spaceAbove = rect.top;
		const gap = 8;
		const viewportPadding = 16;
		const isMobileViewport = window.innerWidth < 768;
		const maxAllowed = isMobileViewport ? 180 : 240;
		const estimatedHeight = Math.min(options.length * 44 + 8, maxAllowed);

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
		searchFilter = '';
		isOpen = true;
		highlightedIndex = selectedIndex >= 0 ? selectedIndex : 0;
		onFocus();
		await tick();
		if (searchable && searchInputRef) {
			searchInputRef.focus();
		}
		updateScrollIndicators();
		scrollToHighlighted();
	}

	function closeDropdown() {
		isOpen = false;
		highlightedIndex = -1;
		searchString = '';
		searchFilter = '';
		onBlur();
	}

	function toggleDropdown() {
		if (isOpen) {
			closeDropdown();
		} else {
			openDropdown();
		}
	}

	function selectOption(option: Option) {
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
				event.preventDefault();
				if (isOpen && highlightedIndex >= 0) {
					selectOption(filteredOptions[highlightedIndex]);
				} else {
					openDropdown();
				}
				break;

			case ' ':
				// In searchable mode, space is for typing, not selecting
				if (searchable && isOpen) break;
				event.preventDefault();
				if (isOpen && highlightedIndex >= 0) {
					selectOption(filteredOptions[highlightedIndex]);
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
					highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
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
					highlightedIndex = filteredOptions.length - 1;
					scrollToHighlighted();
				}
				break;

			case 'Tab':
				if (isOpen) {
					closeDropdown();
				}
				break;

			default:
				// Type-to-search: jump to option starting with typed character(s)
				// Skip in searchable mode — the search input handles filtering
				if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
					event.preventDefault();
					handleTypeSearch(event.key);
				}
				break;
		}
	}

	function handleTypeSearch(char: string) {
		// Clear previous timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Append character to search string
		searchString += char.toLowerCase();

		// Find matching option
		const matchIndex = options.findIndex((opt) => opt.label.toLowerCase().startsWith(searchString));

		if (matchIndex >= 0) {
			highlightedIndex = matchIndex;
			if (!isOpen) {
				// Select directly if dropdown is closed
				selectOption(options[matchIndex]);
			} else {
				scrollToHighlighted();
			}
		}

		// Clear search string after 500ms of no typing
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
	// scroll or the viewport resizes. Uses capture phase to catch scroll on any
	// nested scroller (modal body, page).
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
</script>

<div
	bind:this={dropdownRef}
	class="custom-select-container"
	class:custom-select-disabled={disabled}
>
	<!-- Hidden input for form submission -->
	<input type="hidden" {id} name={id} value={value ?? ''} {required} />

	<!-- Select Button -->
	<button
		bind:this={buttonRef}
		type="button"
		class="custom-select-button inputText"
		class:custom-select-button-open={isOpen}
		class:custom-select-button-filled={selectedOption}
		class:custom-select-button-error={hasError}
		class:custom-select-button-with-icon={hasIcon}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={isOpen}
		aria-labelledby="{id}-label"
		aria-controls="{id}-listbox"
		onclick={toggleDropdown}
		onkeydown={handleKeyDown}
	>
		<span
			class="custom-select-value text-labelText !m-0 {selectedOption
				? 'text-[var(--form-text-label)]'
				: 'text-[var(--form-text-muted)]'}"
			class:custom-select-placeholder={!selectedOption}
		>
			{selectedOption ? selectedOption.label : placeholder}
		</span>
		<ChevronDown class="custom-select-arrow {isOpen ? 'custom-select-arrow-open' : ''}" />
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<div
			class="custom-select-dropdown-wrapper"
			class:custom-select-dropdown-top={dropdownPosition === 'top'}
			class:custom-select-dropdown-bottom={dropdownPosition === 'bottom'}
			style:left="{dropdownLeft}px"
			style:top="{dropdownTop}px"
			style:width="{dropdownWidth}px"
		>
			{#if searchable}
				<div class="custom-select-search-wrapper">
					<input
						bind:this={searchInputRef}
						type="text"
						class="custom-select-search-input"
						placeholder={searchPlaceholder}
						value={searchFilter}
						oninput={(e) => {
							searchFilter = (e.target as HTMLInputElement).value;
							highlightedIndex = 0;
						}}
						onkeydown={handleKeyDown}
					/>
				</div>
			{/if}
			{#if canScrollUp}
				<div
					class="custom-select-scroll-fade-top"
					class:custom-select-scroll-fade-below-search={searchable}
				></div>
			{/if}
			<ul
				bind:this={listRef}
				id="{id}-listbox"
				class="custom-select-dropdown"
				style:max-height="{dropdownMaxHeight - (searchable ? 44 : 0)}px"
				role="listbox"
				aria-activedescendant={highlightedIndex >= 0
					? `${id}-option-${highlightedIndex}`
					: undefined}
				tabindex="-1"
				onscroll={handleDropdownScroll}
			>
				{#each filteredOptions as option, index}
					<li
						id="{id}-option-{index}"
						class="custom-select-option text-labelText {selectedIndex === index
							? 'text-[var(--form-text-label)]'
							: 'text-[var(--form-text-muted)]'}"
						class:custom-select-option-highlighted={highlightedIndex === index}
						class:custom-select-option-selected={selectedIndex === index}
						class:custom-select-option-with-helper={option.helperText}
						role="option"
						aria-selected={selectedIndex === index}
						onclick={() => selectOption(option)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								selectOption(option);
							}
						}}
						onmouseenter={() => handleOptionMouseEnter(index)}
					>
						<div class="custom-select-option-content">
							<span class="custom-select-option-label">{option.label}</span>
							{#if option.helperText}
								<span class="smallText">{option.helperText}</span>
							{/if}
						</div>
						{#if selectedIndex === index}
							<Check class="custom-select-option-check" />
						{/if}
					</li>
				{/each}
				{#if searchable && filteredOptions.length === 0}
					<li class="custom-select-no-results alertText">No matches found</li>
				{/if}
			</ul>
			{#if canScrollDown}
				<div class="custom-select-scroll-fade-bottom"></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.custom-select-container {
		position: relative;
		width: 100%;
	}

	.custom-select-disabled {
		cursor: not-allowed;
	}

	.custom-select-disabled .custom-select-button {
		background-color: var(--form-bg-disabled);
		border-color: var(--ddsa-primary-500) !important;
		box-shadow: none !important;
		color: var(--form-text-muted);
		cursor: not-allowed;
		opacity: 0.75;
	}

	.custom-select-disabled .custom-select-button:hover {
		/* border-color: color-mix(in srgb, var(--form-border) 70%, transparent); */
		box-shadow: none;
	}

	.custom-select-disabled :global(.custom-select-arrow) {
		opacity: 0.5;
	}

	.custom-select-button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.875rem 1rem;
		padding-right: 2.5rem;
		background-color: var(--form-bg-input);
		border: 2px solid var(--form-border);
		border-radius: 1rem;
		cursor: pointer;
		outline: none;
		transition: all 0.3s ease-out;
		text-align: left;
		color: var(--form-text);
	}

	.custom-select-button:hover:not(:disabled):not(.custom-select-button-open):not(
			.custom-select-button-filled
		) {
		border-color: var(--form-border-hover);
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}
	.custom-select-button-filled {
		background-color: var(--form-bg-card);
		border: 2px solid var(--ddsa-primary-500);
	}

	.custom-select-button:focus,
	.custom-select-button-open {
		background-color: var(--form-bg-card);
		border-color: var(--ddsa-primary-500, #f59e0b);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--ddsa-primary-500) 45%, transparent),
			0 8px 20px -6px rgba(16, 185, 129, 0.18);
	}

	.custom-select-button-error {
		border-color: #ef4444;
	}

	.custom-select-button-with-icon {
		padding-left: 3.5rem;
	}

	.custom-select-button:disabled {
		background-color: var(--form-bg-disabled);
		border-color: color-mix(in srgb, var(--form-border) 70%, transparent);
		box-shadow: none;
		color: var(--form-text-muted);
		cursor: not-allowed;
	}

	.custom-select-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.custom-select-placeholder {
		color: var(--form-text-muted);
	}

	:global(.custom-select-arrow) {
		position: absolute;
		right: 1rem;
		width: 1.25rem;
		height: 1.25rem;
		color: var(--form-border-hover);
		transition:
			transform 0.3s ease,
			color 0.3s ease;
		pointer-events: none;
	}

	:global(.custom-select-arrow-open) {
		transform: rotate(180deg);
		color: var(--ddsa-primary-500, #f59e0b);
	}

	.custom-select-dropdown-wrapper {
		/* position: fixed so the dropdown escapes any ancestor with
		   overflow:auto/clip/hidden (modal bodies, sticky panels). left/top/width
		   are set inline from the button's getBoundingClientRect(). */
		position: fixed;
		z-index: 100;
	}

	/* .custom-select-dropdown-bottom needs no extra rules — `top` (set inline)
	   is the gap-padded button bottom and the box grows downward by default. */
	.custom-select-dropdown-top {
		/* `top` (set inline) is the gap-padded button top; translateY(-100%)
		   flips the box upward so it grows above the button. */
		transform: translateY(-100%);
	}

	.custom-select-search-wrapper {
		padding: 0.5rem 0.5rem 0.25rem;
		border-bottom: 1px solid var(--ddsa-gray-200, #e5e7eb);
	}

	:global(.dark) .custom-select-search-wrapper {
		border-bottom-color: var(--ddsa-gray-700, #374151);
	}

	.custom-select-search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--ddsa-gray-200, #e5e7eb);
		border-radius: 0.5rem;
		background-color: var(--form-bg-input);
		color: var(--form-text);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.2s ease;
	}

	.custom-select-search-input:focus {
		border-color: var(--ddsa-primary-500, #f59e0b);
	}

	.custom-select-search-input::placeholder {
		color: var(--form-text-muted);
	}

	.custom-select-no-results {
		padding: 0.75rem 1rem;
		text-align: center;
		color: var(--form-text-muted);
		/* font-size: 0.875rem; */
	}

	.custom-select-dropdown {
		overflow-y: auto;
		padding: 0.25rem;
		margin: 0;
		list-style: none;
	}

	/* Fallback for browsers that don't support :has() — style the dropdown directly */
	.custom-select-dropdown {
		background-color: var(--form-bg-card);
		border: 2px solid var(--ddsa-primary-200, #fde68a);
		border-radius: 1rem;
		box-shadow:
			0 10px 25px -5px rgba(0, 0, 0, 0.1),
			0 8px 10px -6px rgba(0, 0, 0, 0.1);
	}

	/* When NOT searchable, the dropdown list itself gets the border/bg/shadow */
	@supports selector(:has(*)) {
		.custom-select-dropdown-wrapper:not(:has(.custom-select-search-wrapper))
			.custom-select-dropdown {
			background-color: var(--form-bg-card);
			border: 2px solid var(--ddsa-primary-200, #fde68a);
			border-radius: 1rem;
			box-shadow:
				0 10px 25px -5px rgba(0, 0, 0, 0.1),
				0 8px 10px -6px rgba(0, 0, 0, 0.1);
		}
	}

	/* When searchable, the wrapper gets the styling so search + list share the container */
	@supports selector(:has(*)) {
		.custom-select-dropdown-wrapper:has(.custom-select-search-wrapper) {
			background-color: var(--form-bg-card);
			border: 2px solid var(--ddsa-primary-200, #fde68a);
			border-radius: 1rem;
			box-shadow:
				0 10px 25px -5px rgba(0, 0, 0, 0.1),
				0 8px 10px -6px rgba(0, 0, 0, 0.1);
			overflow: hidden;
		}
	}

	.custom-select-scroll-fade-top,
	.custom-select-scroll-fade-bottom {
		position: absolute;
		left: 2px;
		right: 2px;
		height: 24px;
		pointer-events: none;
		z-index: 1;
	}

	.custom-select-scroll-fade-top {
		top: 2px;
		background: linear-gradient(to bottom, var(--form-scroll-fade) 0%, transparent 100%);
		border-radius: 1rem 1rem 0 0;
		box-shadow: inset 0 6px 6px -4px rgba(0, 0, 0, 0.06);
	}

	.custom-select-scroll-fade-bottom {
		bottom: 2px;
		background: linear-gradient(to top, var(--form-scroll-fade) 0%, transparent 100%);
		border-radius: 0 0 1rem 1rem;
		box-shadow: inset 0 -6px 6px -4px rgba(0, 0, 0, 0.06);
	}

	.custom-select-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		cursor: pointer;
		border-radius: 0.75rem;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
		/* color: var(--ddsa-gray-700, #374151); */
		gap: 0.5rem;
	}

	.custom-select-option-with-helper {
		align-items: flex-start;
		padding: 0.875rem 1rem;
	}

	.custom-select-option:hover,
	.custom-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-100, #fef3c7) 0%,
			var(--ddsa-primary-50, #fffbeb) 100%
		);
		color: var(--ddsa-primary-700, #b45309);
	}

	/* .custom-select-option:hover .custom-select-option-helper,
	.custom-select-option-highlighted .custom-select-option-helper {
		color: var(--ddsa-primary-600, #d97706);
	} */

	.custom-select-option-selected {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-500, #f59e0b) 0%,
			var(--ddsa-accent-500, #ea580c) 100%
		);
		color: white;
		font-weight: 500;
	}

	.custom-select-option-selected:hover,
	.custom-select-option-selected.custom-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-600, #d97706) 0%,
			var(--ddsa-accent-600, #dc2626) 100%
		);
		color: white;
	}

	.custom-select-option-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.custom-select-option-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	:global(.custom-select-option-check) {
		width: 1.25rem;
		height: 1.25rem;
		margin-left: 0.5rem;
		flex-shrink: 0;
		align-self: center;
	}

	/* Scrollbar styling */
	.custom-select-dropdown::-webkit-scrollbar {
		width: 6px;
	}

	.custom-select-dropdown::-webkit-scrollbar-track {
		background: var(--ddsa-gray-100, #f3f4f6);
		border-radius: 3px;
	}

	.custom-select-dropdown::-webkit-scrollbar-thumb {
		background: var(--ddsa-primary-300, #fcd34d);
		border-radius: 3px;
	}

	.custom-select-dropdown::-webkit-scrollbar-thumb:hover {
		background: var(--ddsa-primary-400, #fbbf24);
	}
</style>
