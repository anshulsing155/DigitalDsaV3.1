<script lang="ts">
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { Search, X, Check, AlertCircle, getIcon } from '$lib/utils/iconRegistry';
	import type { Option } from '$lib/types/optionType/option';
	import { formState } from '$lib/state/form.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	interface Props {
		id?: string;
		label?: string;
		description: string;
		options?: Option[];
		selectedValues?: (string | number)[];
		error?: string | null;
		disabled?: boolean;
		searchBarNeeded?: boolean;
		descriptionHeader?: string;
		multipleSelectClass?: string;
		onChange?: (values: (string | number)[]) => void;
		visibleOptions?: Option[];
		emptyMessage?: string;
		descriptionHeaderClass?: string;
		maxSelection?: number | null;
		required?: boolean;
	}

	let {
		id = '',
		label = '',
		description,
		options = [],
		selectedValues = $bindable([]),
		error = null,
		disabled = false,
		searchBarNeeded = true,
		descriptionHeader = '',
		multipleSelectClass = '',
		onChange = () => {},
		visibleOptions = [],
		emptyMessage = 'No options available',
		descriptionHeaderClass = '',
		maxSelection = null,
		required = false
	}: Props = $props();

	// Auto-hide search when option count is small (≤ 8)
	let showSearch = $derived(searchBarNeeded && options.length > 8);

	// When few options, show all without scroll constraint
	let listClass = $derived(options.length <= 8 ? '' : 'max-h-72 overflow-y-auto');
	let mobileListClass = $derived(options.length <= 8 ? '' : 'max-h-[50vh] overflow-y-auto');

	let searchTerm = $state('');
	let debouncedSearchTerm = $state('');
	let debounceTimeout: ReturnType<typeof setTimeout>;
	let isSearchFocused = $state(false);

	$effect(() => {
		if (searchTerm !== undefined) {
			clearTimeout(debounceTimeout);
			debounceTimeout = setTimeout(() => {
				debouncedSearchTerm = searchTerm.toLowerCase();
			}, 300);
		}
	});

	$effect(() => {
		return () => clearTimeout(debounceTimeout);
	});

	const [send, receive] = crossfade({
		duration: (d) => Math.sqrt(d * 200),
		fallback(node) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;
			return {
				duration: 300,
				easing: quintOut,
				css: (t) => `transform: ${transform} scale(${t}); opacity: ${t};`
			};
		}
	});

	// Session 32: Reactively enforce exclusivity — if both exclusive and non-exclusive
	// values coexist in selectedValues (e.g., from server restore), remove exclusive ones.
	$effect(() => {
		const exclusiveVals = options.filter((o) => o.exclusive).map((o) => o.value);
		if (exclusiveVals.length === 0) return;
		const hasExclusive = selectedValues.some((v) => exclusiveVals.includes(v));
		const hasNonExclusive = selectedValues.some((v) => !exclusiveVals.includes(v));
		if (hasExclusive && hasNonExclusive) {
			// Auto-remove exclusive values — real docs take priority
			const cleaned = selectedValues.filter((v) => !exclusiveVals.includes(v));
			selectedValues = cleaned;
			onChange(cleaned);
		}
	});

	// Derived states
	let unselectedOptions = $derived(options.filter((o) => !selectedValues.includes(o.value)));
	let selectedOptions = $derived(options.filter((o) => selectedValues.includes(o.value)));

	let filteredUnselected = $derived(
		debouncedSearchTerm && options.length > 5
			? unselectedOptions.filter((opt) => opt.label.toLowerCase().includes(debouncedSearchTerm))
			: unselectedOptions
	);

	// Session 32: Hide exclusive options (e.g., "None collected yet") when any
	// non-exclusive option is already selected — prevents contradictory combos.
	let hasNonExclusiveSelected = $derived(
		selectedValues.some((v) => {
			const opt = options.find((o) => o.value === v);
			return opt && !opt.exclusive;
		})
	);

	let displayedUnselected = $derived(
		(visibleOptions.length > 0
			? visibleOptions.filter((o) => !selectedValues.includes(o.value))
			: filteredUnselected
		).filter((o) => !hasNonExclusiveSelected || !o.exclusive)
	);

	let filterOptionsForMobileScreen = $derived(
		options
			.filter(
				(opt) => !debouncedSearchTerm || opt.label.toLowerCase().includes(debouncedSearchTerm)
			)
			// Hide exclusive options when non-exclusive is selected (mobile too)
			.filter(
				(opt) => !hasNonExclusiveSelected || !opt.exclusive || selectedValues.includes(opt.value)
			)
			.map((opt) => ({
				...opt,
				isSelected: selectedValues.includes(opt.value)
			}))
	);

	let isAtMaxSelection = $derived(maxSelection !== null && selectedValues.length >= maxSelection);

	function toggleOption(optionValue: string | number) {
		if (disabled) return;

		if (
			maxSelection &&
			!selectedValues.includes(optionValue) &&
			selectedValues.length >= maxSelection
		) {
			return;
		}

		// Session 32: Exclusive option support (e.g., "None collected yet").
		// If selecting an exclusive option → clear all others.
		// If selecting a non-exclusive option → remove any exclusive options.
		const allOptions = options ?? [];
		const clickedOpt = allOptions.find((o) => o.value === optionValue);
		const isExclusive = clickedOpt?.exclusive === true;
		const isDeselecting = selectedValues.includes(optionValue);

		let newSelectedValues: (string | number)[];
		if (isDeselecting) {
			newSelectedValues = selectedValues.filter((v) => v !== optionValue);
		} else if (isExclusive) {
			// Exclusive option selected → clear all others, keep only this
			newSelectedValues = [optionValue];
		} else {
			// Non-exclusive selected → remove any exclusive options
			const exclusiveValues = allOptions.filter((o) => o.exclusive === true).map((o) => o.value);
			newSelectedValues = [
				...selectedValues.filter((v) => !exclusiveValues.includes(v)),
				optionValue
			];
		}

		selectedValues = newSelectedValues;
		onChange(newSelectedValues);
	}

	function clearSelected() {
		selectedValues = [];
		onChange([]);
	}

	function removeSelected(optionValue: string | number) {
		const newSelectedValues = selectedValues.filter((v) => v !== optionValue);
		selectedValues = newSelectedValues;
		onChange(newSelectedValues);
	}
</script>

<div class={`${multipleSelectClass} flex w-full flex-col`}>
	<label
		for={id}
		class={`label-modern ${selectedValues.length == 0 && formState.applicationData.checkUnsecureData ? 'text-red-400' : ''}`}
	>
		{@html sanitizeHtml(label)}
		{#if required}
			<span class="label-required">*</span>
		{/if}
		{#if description}
			<DescriptionTooltip {description} />
		{/if}
	</label>

	{#if descriptionHeader}
		<p class="mb-3 text-sm text-[var(--form-text-secondary)] {descriptionHeaderClass}">
			{@html sanitizeHtml(descriptionHeader)}
		</p>
	{/if}

	<!-- Desktop Two-column layout -->
	<div class="w-full">
		<div class="hidden grid-cols-2 gap-4 md:grid">
			<!-- Available Options -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-sm"
			>
				<div
					class="sticky top-0 z-10 bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-primary-700)] px-4 py-3"
				>
					<span class="text-sm font-medium text-white">Available Options</span>
					<span class="ml-2 text-xs text-white/60">({displayedUnselected.length})</span>
				</div>

				{#if showSearch}
					<div
						class="sticky top-0 border-b border-[var(--form-border)] bg-[var(--form-bg-card)] p-3"
					>
						<div class="relative">
							<Search
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--form-text-muted)]"
							/>
							<input
								type="text"
								placeholder="Search options..."
								bind:value={searchTerm}
								onfocus={() => (isSearchFocused = true)}
								onblur={() => (isSearchFocused = false)}
								class="w-full rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-input)] py-2.5 pr-4 pl-10
									text-sm text-[var(--form-text)] transition-all duration-300 outline-none
									focus:border-[var(--ddsa-primary-500)] focus:bg-[var(--form-bg-card)] focus:shadow-sm"
							/>
						</div>
					</div>
				{/if}

				<ul class="flex flex-col gap-2 p-3 {listClass}">
					{#each displayedUnselected as option (option.value)}
						<li
							class="group flex cursor-pointer items-center justify-between rounded-xl border-2
								border-transparent bg-[var(--form-bg-input)] px-4 py-3
								transition-all duration-200
								hover:border-[var(--ddsa-primary-400)] hover:bg-[var(--ddsa-primary-50)] hover:shadow-sm
								{isAtMaxSelection ? 'cursor-not-allowed opacity-50' : ''}"
							onclick={() => toggleOption(option.value)}
							onkeydown={(e) => e.key === 'Enter' && toggleOption(option.value)}
							tabindex="0"
							role="option"
							aria-selected="false"
							in:receive={{ key: option.value }}
							out:send={{ key: option.value }}
						>
							<div class="flex items-center gap-3">
								{#if option.icon}
									{@const IconComp = getIcon(option.icon)}
									{#if IconComp}
										<IconComp
											class="h-5 w-5 shrink-0 text-[var(--form-text-muted)] group-hover:text-[var(--ddsa-primary-500)]"
										/>
									{/if}
								{/if}
								<div class="flex flex-col">
									<span
										class="inputText text-[var(--form-text-secondary)] group-hover:text-[var(--form-text)]"
										>{option.label}</span
									>
									{#if option.description}
										<span class="text-[10px] leading-tight text-[var(--form-text-muted)]"
											>{option.description}</span
										>
									{/if}
								</div>
							</div>
							<div
								class="flex h-5 w-5 shrink-0 items-center justify-center
								rounded-full border-2
								border-[var(--form-border)] transition-all duration-200 group-hover:border-[var(--ddsa-primary-400)] group-hover:bg-[var(--ddsa-primary-100)]"
							></div>
						</li>
					{/each}

					{#if displayedUnselected.length === 0}
						<div class="py-8 text-center">
							<p class="text-sm text-[var(--form-text-muted)]">{emptyMessage}</p>
						</div>
					{/if}
				</ul>
			</div>

			<!-- Selected Options -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--ddsa-accent-500)] bg-[var(--form-bg-card)] shadow-sm"
			>
				<div
					class="sticky top-0 z-10 flex items-center justify-between
					bg-gradient-to-r from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-500)] px-4 py-3"
				>
					<div>
						<span class="text-sm font-medium text-white">Selected</span>
						<span class="ml-2 text-xs text-white/70"
							>({selectedValues.length}{maxSelection ? `/${maxSelection}` : ''})</span
						>
					</div>
					{#if selectedValues.length > 0}
						<button
							class="rounded-lg px-2 py-1 text-xs
								font-medium text-white/80 transition-all duration-200 hover:bg-white/20 hover:text-white"
							onclick={clearSelected}
						>
							Clear All
						</button>
					{/if}
				</div>

				<ul class="flex flex-col gap-2 p-3 {listClass}">
					{#each selectedOptions as option (option.value)}
						<li
							class="group flex cursor-pointer items-center justify-between rounded-xl border-2
								border-transparent bg-[var(--form-bg-card)]
								[background-image:linear-gradient(var(--form-bg-card),var(--form-bg-card)),linear-gradient(135deg,var(--ddsa-primary-500),var(--ddsa-accent-500))] [background-clip:padding-box,border-box] [background-origin:border-box]
								px-4 py-3
								shadow-sm
								transition-all
								duration-200
								hover:shadow-md"
							onclick={() => toggleOption(option.value)}
							onkeydown={(e) => e.key === 'Enter' && toggleOption(option.value)}
							tabindex="0"
							role="option"
							aria-selected="true"
							in:receive={{ key: option.value }}
							out:send={{ key: option.value }}
						>
							<div class="flex items-center gap-3">
								<div
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-500)]"
								>
									<Check class="h-3 w-3 text-white" />
								</div>
								{#if option.icon}
									{@const IconComp = getIcon(option.icon)}
									{#if IconComp}
										<IconComp class="h-5 w-5 shrink-0 text-[var(--ddsa-primary-500)]" />
									{/if}
								{/if}
								<div class="flex flex-col">
									<span class="inputText font-medium text-[var(--form-text)]">{option.label}</span>
									{#if option.description}
										<span class="text-[10px] leading-tight text-[var(--form-text-muted)]"
											>{option.description}</span
										>
									{/if}
								</div>
							</div>
							<X
								class="h-4 w-4 text-[var(--form-text-muted)] transition-colors group-hover:text-red-500"
							/>
						</li>
					{/each}

					{#if selectedOptions.length === 0}
						<div class="py-8 text-center">
							<div
								class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--form-bg-alt)]"
							>
								<Check class="h-6 w-6 text-[var(--form-text-muted)]" />
							</div>
							<p class="text-sm text-[var(--form-text-muted)]">No options selected</p>
						</div>
					{/if}
				</ul>
			</div>
		</div>

		<!-- Mobile Layout -->
		<div
			class="block overflow-hidden rounded-2xl border-2 border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-sm md:hidden"
		>
			<!-- Header -->
			<div
				class="sticky top-0 z-10 bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-primary-700)] px-4 py-3"
			>
				<span class="text-sm font-medium text-white">Select Options</span>
				{#if maxSelection}
					<span class="ml-2 text-xs text-white/60">({selectedValues.length}/{maxSelection})</span>
				{/if}
			</div>

			{#if showSearch}
				<div class="sticky top-0 border-b border-[var(--form-border)] bg-[var(--form-bg-card)] p-3">
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--form-text-muted)]"
						/>
						<input
							type="text"
							placeholder="Search..."
							bind:value={searchTerm}
							class="w-full rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-input)] py-2.5 pr-4 pl-10
								text-sm text-[var(--form-text)] transition-all duration-300 outline-none
								focus:border-[var(--form-border-hover,var(--form-border))] focus:bg-[var(--form-bg-card)]"
						/>
					</div>
				</div>
			{/if}

			<!-- Option List -->
			<ul class="flex flex-col gap-2 p-3 {mobileListClass}">
				{#each filterOptionsForMobileScreen as option (option.value)}
					{@const isSelected = selectedValues.includes(option.value)}
					<li>
						<button
							type="button"
							class="flex w-full items-center justify-between rounded-xl border-2 p-3
								text-left transition-all duration-200
								{isSelected
								? 'border-2 border-transparent bg-[var(--form-bg-card)] [background-image:linear-gradient(var(--form-bg-card),var(--form-bg-card)),linear-gradient(135deg,var(--ddsa-primary-500),var(--ddsa-accent-500))] [background-clip:padding-box,border-box] [background-origin:border-box]'
								: 'border-[var(--form-border)] bg-[var(--form-bg-input)] hover:border-[var(--form-border-hover,var(--form-border))] hover:bg-[var(--form-bg-card)]'}
								{isAtMaxSelection && !isSelected ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
							onclick={() => toggleOption(option.value)}
							disabled={isAtMaxSelection && !isSelected}
						>
							<div class="flex items-center gap-3">
								{#if option.icon}
									{@const IconComp = getIcon(option.icon)}
									{#if IconComp}
										<IconComp
											class="h-5 w-5 shrink-0 {isSelected
												? 'text-[var(--ddsa-primary-500)]'
												: 'text-[var(--form-text-muted)]'}"
										/>
									{/if}
								{/if}
								<div class="flex flex-col">
									<span
										class="inputText {isSelected
											? 'font-medium text-[var(--form-text)]'
											: 'text-[var(--form-text-secondary)]'}"
									>
										{option.label}
									</span>
									{#if option.description}
										<span class="text-[10px] leading-tight text-[var(--form-text-muted)]"
											>{option.description}</span
										>
									{/if}
								</div>
							</div>
							<div
								class="flex h-6 w-6 items-center justify-center rounded-lg border-2
								transition-all duration-200
								{isSelected
									? 'border-0 bg-gradient-to-br from-[var(--ddsa-primary-500)] to-[var(--ddsa-accent-500)]'
									: 'border-[var(--form-border)] bg-[var(--form-bg-card)]'}"
							>
								{#if isSelected}
									<Check class="h-4 w-4 text-white" />
								{/if}
							</div>
						</button>
					</li>
				{/each}

				{#if filterOptionsForMobileScreen.length === 0}
					<div class="py-8 text-center">
						<p class="text-sm text-[var(--form-text-muted)]">{emptyMessage}</p>
					</div>
				{/if}
			</ul>

			<!-- Footer -->
			{#if selectedValues.length > 0}
				<div
					class="sticky bottom-0 z-20 flex items-center justify-between border-t border-[var(--form-border)]
					bg-[var(--form-bg-alt)] px-4 py-3"
				>
					<span class="text-sm font-medium text-[var(--form-text-secondary)]">
						Selected: {selectedValues.length}{maxSelection ? `/${maxSelection}` : ''}
					</span>
					<button
						type="button"
						class="rounded-lg border border-red-200 bg-red-50 px-3
							py-1.5 text-sm font-medium text-red-500
							transition-all duration-200 hover:bg-red-100"
						onclick={clearSelected}
					>
						Clear All
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Error Message -->
	{#if error}
		<div role="alert" class="error-message mt-3">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>

<style>
	::-webkit-scrollbar {
		height: 6px;
		width: 6px;
	}
	::-webkit-scrollbar-track {
		background: transparent;
	}
	::-webkit-scrollbar-thumb {
		background: linear-gradient(135deg, var(--ddsa-primary-500), var(--ddsa-accent-500));
		border-radius: 6px;
		transition: all 0.3s ease;
	}
	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(135deg, var(--ddsa-accent-500), var(--ddsa-accent-600));
		box-shadow: 0 0 8px rgba(221, 190, 169, 0.4);
	}
	* {
		scrollbar-width: thin;
		scrollbar-color: var(--ddsa-accent-500) transparent;
	}
</style>
