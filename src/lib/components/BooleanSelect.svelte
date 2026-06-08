<script lang="ts">
	import type { Component } from 'svelte';
	import { getIcon, ChevronDown, Check, ThumbsUp, ThumbsDown } from '$lib/utils/iconRegistry';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { formState } from '$lib/state/form.svelte';
	import { tick } from 'svelte';

	type BooleanOption = {
		label: string;
		value: boolean;
		icon?: string;
		disabled?: boolean;
		showWhen?: any;
	};

	interface Props {
		id?: string;
		label?: string;
		placeholder?: string;
		value?: boolean | null;
		selectedIndex?: number;
		options?: BooleanOption[];
		required?: boolean;
		error?: string;
		warning?: string | null;
		showValidationErrors?: boolean;
		disabled?: boolean;
		isTouched?: boolean;
		onChange?: (val: boolean) => void;
		icon?: Component | string | null;
		containerClass?: string;
		labelClass?: string;
		selectClass?: string;
	}

	let {
		id = '',
		label = '',
		placeholder = 'Select option',
		value = $bindable(),
		selectedIndex = 0,
		options = [
			{ label: 'Yes', value: true },
			{ label: 'No', value: false }
		],
		required = false,
		error = '',
		warning = null,
		showValidationErrors = false,
		disabled = false,
		isTouched = false,
		onChange = () => {},
		icon = null,
		containerClass = '',
		labelClass = 'buttonText',
		selectClass = ''
	}: Props = $props();

	let locallyTouched = $state(false);
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let dropdownRef: HTMLDivElement | null = $state(null);
	let buttonRef: HTMLButtonElement | null = $state(null);
	let listRef: HTMLUListElement | null = $state(null);
	let dropdownPosition = $state<'bottom' | 'top'>('bottom');
	let dropdownMaxHeight = $state(180);
	let canScrollUp = $state(false);
	let canScrollDown = $state(false);

	// Fixed-position coordinates for the dropdown (CLAUDE.md Pitfall #17 — FORM-3).
	// position: fixed + button-rect-derived left/top/width so the dropdown escapes
	// any ancestor with overflow:auto/clip/hidden (modal bodies, sticky panels).
	let dropdownLeft = $state(0);
	let dropdownTop = $state(0);
	let dropdownWidth = $state(0);

	function toPascalCase(str: string | null | undefined): string {
		if (!str) return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(typeof icon === 'string' ? getIcon(toPascalCase(icon)) : null);
	let displayError = $derived((isTouched || locallyTouched) && error ? error : '');

	// Filter visible options
	let visibleOptions = $derived(
		options.filter((opt) =>
			shouldShow(opt.showWhen, {
				...formState.applicants[selectedIndex],
				...formState.applicationData
			})
		)
	);

	// Find selected option
	let selectedOption = $derived(visibleOptions.find((opt) => opt.value === value) ?? null);

	// Find selected index
	let selectedIdx = $derived(visibleOptions.findIndex((opt) => opt.value === value));

	function calculateDropdownPosition() {
		if (!buttonRef) return;
		const rect = buttonRef.getBoundingClientRect();
		// Reserve space for fixed nav bar (~70px) at bottom of viewport
		const navBarReserve = 70;
		const spaceBelow = window.innerHeight - rect.bottom - navBarReserve;
		const spaceAbove = rect.top;
		const gap = 4;
		const viewportPadding = 16;
		const isMobileViewport = window.innerWidth < 768;

		const maxAllowed = isMobileViewport ? 160 : 180;
		const estimatedHeight = Math.min(visibleOptions.length * 44 + 8, maxAllowed);

		if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
			dropdownPosition = 'top';
			dropdownMaxHeight = Math.min(spaceAbove - gap - viewportPadding, maxAllowed);
			dropdownTop = rect.top - gap;
		} else {
			dropdownPosition = 'bottom';
			dropdownMaxHeight = Math.min(spaceBelow - gap - navBarReserve - viewportPadding, maxAllowed);
			dropdownTop = rect.bottom + gap;
		}
		dropdownMaxHeight = Math.max(dropdownMaxHeight, 80);

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
	}

	function toggleDropdown() {
		if (isOpen) {
			closeDropdown();
		} else {
			openDropdown();
		}
	}

	function selectOption(option: BooleanOption) {
		locallyTouched = true;
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
			requestAnimationFrame(updateScrollIndicators);
		}
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

		const key = event.key.toUpperCase();

		// Y key: select Yes (true)
		if (key === 'Y') {
			event.preventDefault();
			const yesOption = visibleOptions.find((opt) => opt.value === true);
			if (yesOption) {
				selectOption(yesOption);
			}
			return;
		}

		// N key: select No (false)
		if (key === 'N') {
			event.preventDefault();
			const noOption = visibleOptions.find((opt) => opt.value === false);
			if (noOption) {
				selectOption(noOption);
			}
			return;
		}

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

			case 'Tab':
				if (isOpen) {
					closeDropdown();
				}
				break;
		}
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
</script>

<div class={containerClass}>
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

	<div bind:this={dropdownRef} class="relative mt-1">
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
					class="flex w-8 shrink-0 items-center justify-center transition-all duration-300
					{value !== null && value !== undefined ? 'icon-filled' : 'icon-empty'}"
				>
					<Icon
						class="h-4 w-4 shrink-0 text-white transition-transform duration-300 dark:text-gray-900"
					/>
				</div>
			{/if}

			<!-- Hidden input for form submission -->
			<input
				type="hidden"
				{id}
				name={id}
				value={value === true ? 'true' : value === false ? 'false' : ''}
				{required}
			/>

			<!-- Custom Select Button -->
			<button
				bind:this={buttonRef}
				id="{id}-button"
				type="button"
				class="custom-bool-select-button buttonText h-10 px-3 py-2.5 {selectClass}"
				class:custom-select-button-disabled={disabled}
				{disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-labelledby="{id}-label"
				onclick={toggleDropdown}
				onkeydown={handleKeyDown}
				onblur={() => (locallyTouched = true)}
			>
				<span
					class="custom-bool-select-value text-[var(--form-text-label)]"
					class:custom-bool-select-placeholder={!selectedOption}
				>
					{selectedOption ? selectedOption.label : placeholder}
				</span>
				<ChevronDown
					size={16}
					class="custom-bool-select-arrow  text-[var(--form-text-label)] {isOpen
						? 'custom-bool-select-arrow-open'
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
					{#each visibleOptions as option, index}
						{@const OptionIcon = option.icon ? getIcon(toPascalCase(option.icon)) : null}
						{#if !option.disabled}
							<li
								id="{id}-option-{index}"
								class="app-select-option"
								class:app-select-option-highlighted={highlightedIndex === index}
								class:app-select-option-selected={selectedIdx === index}
								role="option"
								aria-selected={selectedIdx === index}
								onclick={() => selectOption(option)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										selectOption(option);
									}
								}}
								onmouseenter={() => handleOptionMouseEnter(index)}
							>
								{#if OptionIcon}
									<div
										class="app-select-option-icon"
										class:app-select-option-icon-selected={selectedIdx === index}
									>
										<OptionIcon size={16} />
									</div>
								{/if}
								<div class="app-select-option-content">
									<span
										class={selectedIdx === index
											? 'flex-1 '
											: 'flex-1 text-[var(--form-text-label)]'}>{option.label}</span
									>
								</div>
								{#if selectedIdx === index}
									<Check class="app-select-option-check" />
								{/if}
							</li>
						{/if}
					{/each}
				</ul>
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
	.custom-bool-select-button {
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

	.custom-bool-select-button:disabled {
		background-color: var(--form-bg-disabled);
		cursor: not-allowed;
		color: var(--form-text-muted);
	}

	.custom-bool-select-value {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.custom-bool-select-placeholder {
		color: var(--form-text-muted);
		/* font-size: 0.875rem; */
	}

	.custom-bool-select-arrow {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 0.875rem;
		height: 0.875rem;
		color: var(--form-text-muted);
		transition:
			transform 0.2s ease,
			color 0.2s ease;
		pointer-events: none;
	}

	.custom-bool-select-arrow-open {
		transform: translateY(-50%) rotate(180deg);
		color: var(--ddsa-primary-500, #f59e0b);
	}

	.custom-bool-select-dropdown {
		/* position: fixed so the dropdown escapes any ancestor with
		   overflow:auto/clip/hidden (modal bodies, sticky panels).
		   left/top/width are set inline from button getBoundingClientRect(). */
		position: fixed;
		z-index: 100;
		overflow-y: auto;
		background-color: var(--form-bg-card);
		border: 1px solid var(--ddsa-primary-200, #fde68a);
		border-radius: 0.5rem;
		box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.1);
		padding: 0.25rem;
		margin: 0;
		list-style: none;
	}

	/* .custom-bool-select-dropdown-bottom needs no rules — `top` (set inline)
	   is the gap-padded button bottom; the box grows downward by default. */
	.custom-bool-select-dropdown-top {
		/* `top` (set inline) is the gap-padded button top; translateY(-100%)
		   flips the box upward so it grows above the button. */
		transform: translateY(-100%);
	}

	.custom-bool-select-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background-color 0.15s ease;
		color: var(--ddsa-gray-700, #374151);
		gap: 0.5rem;
	}

	.custom-bool-select-option-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.custom-bool-select-option:hover,
	.custom-bool-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-100, #fef3c7) 0%,
			var(--ddsa-primary-50, #fffbeb) 100%
		);
		color: var(--ddsa-primary-700, #b45309);
	}

	.custom-bool-select-option-selected {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-500, #f59e0b) 0%,
			var(--ddsa-accent-500, #ea580c) 100%
		);
		color: white;
		font-weight: 500;
	}

	.custom-bool-select-option-selected:hover,
	.custom-bool-select-option-selected.custom-bool-select-option-highlighted {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-600, #d97706) 0%,
			var(--ddsa-accent-600, #dc2626) 100%
		);
		color: white;
	}

	.custom-bool-select-option-label {
		flex: 1;
	}

	.custom-bool-select-option-check {
		width: 1rem;
		height: 1rem;
		margin-left: 0.5rem;
		flex-shrink: 0;
	}

	/* ===== */
	.app-select-dropdown-wrapper {
		/* position: fixed so the dropdown escapes any ancestor with
		   overflow:auto/clip/hidden (modal bodies, sticky panels).
		   left/top/width are set inline from button getBoundingClientRect(). */
		position: fixed;
		z-index: 100;
	}

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

	/* Scrollbar styling — dark contrasting slider */
	.app-select-dropdown {
		scrollbar-width: auto;
		scrollbar-color: var(--form-text-muted, #3f3f46) var(--form-bg-alt, #e8e8e8);
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
