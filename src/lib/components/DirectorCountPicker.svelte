<script module lang="ts">
	// Module-scope counter so the fallback id is unique across every component
	// instance, not just per-instance. Two DirectorCountPickers on the same page
	// (multi-company forms) would otherwise share the previously hardcoded
	// `director-count-custom` literal and emit duplicate-id DOM warnings.
	let pickerInstanceCounter = 0;
	const FALLBACK_ID_PREFIX = 'director-count-picker';
	function nextFallbackId(): string {
		return `${FALLBACK_ID_PREFIX}-${++pickerInstanceCounter}`;
	}
</script>

<script lang="ts">
	interface Props {
		id?: string;
		value?: string | number;
		label?: string;
		isOPC?: boolean;
		minCount?: number;
		error?: string;
		showValidationErrors?: boolean;
		isTouched?: boolean;
		required?: boolean;
		containerClass?: string;
		onChange: (value: string) => void;
	}

	let {
		id = nextFallbackId(),
		value = '',
		label = 'Number of directors / partners',
		isOPC = false,
		minCount = 2,
		error = '',
		showValidationErrors = false,
		isTouched = false,
		required = false,
		containerClass = '',
		onChange
	}: Props = $props();

	const customInputId = $derived(`${id}_custom`);
	const groupLabelId = $derived(`${id}_label`);

	// Chip options — filter out chips below minCount
	const CHIPS = $derived(['2', '3', '4'].filter((c) => Number(c) >= minCount));

	// Is current value one of the chips or custom?
	const isChip = $derived(CHIPS.includes(String(value)));
	const isCustom = $derived(!isChip && String(value) !== '' && String(value) !== '1');

	// Mutable state for custom input — initialized empty, synced from prop via $effect below.
	let customInput = $state('');
	let showCustom = $state(false);

	// Sync prop → local state when the parent sets a custom value (e.g. on restore / edit).
	$effect(() => {
		const v = String(value);
		const custom = !CHIPS.includes(v) && v !== '' && v !== '1';
		if (custom && !showCustom) {
			customInput = v;
			showCustom = true;
		}
	});

	const showError = $derived((showValidationErrors || isTouched) && !!error);
	/** Inline error when custom input is below minimum */
	let customInputError = $state('');

	function selectChip(chip: string) {
		showCustom = false;
		customInput = '';
		customInputError = '';
		onChange(chip);
	}

	function toggleCustom() {
		showCustom = true;
		customInputError = '';
		// Focus the input after render
		setTimeout(() => {
			const el = document.getElementById(customInputId);
			el?.focus();
		}, 50);
	}

	function handleCustomInput(e: Event) {
		const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
		const num = parseInt(raw, 10);
		customInput = raw;
		if (raw === '') {
			customInputError = '';
			onChange('');
		} else if (num < minCount) {
			customInputError = `Minimum ${minCount} required`;
			onChange(''); // Clear invalid value
		} else if (num <= 99) {
			customInputError = '';
			onChange(String(num));
		}
	}
</script>

<div
	class={`w-full ${containerClass}`}
	role="group"
	aria-labelledby={label ? groupLabelId : undefined}
>
	{#if label}
		<p id={groupLabelId} class="text-labelText mb-2">
			{label}{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
		</p>
	{/if}

	{#if isOPC}
		<!-- OPC: auto-locked to 1, not selectable -->
		<div class="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
			<span class="text-sm font-semibold text-primary">1</span>
			<span class="text-xs text-primary/70">(One Person Company — single owner, auto-set)</span>
		</div>
	{:else}
		<div class="flex flex-wrap items-center gap-2">
			<!-- Quick chips -->
			{#each CHIPS as chip}
				<button
					type="button"
					onclick={() => selectChip(chip)}
					class={`h-10 w-10 rounded-lg border text-sm font-semibold transition-all ${String(value) === chip && !showCustom ? 'border-primary bg-primary text-white shadow-sm' : 'border-gray-300 bg-white text-gray-700 hover:border-primary/60 hover:text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300'}`}
				>
					{chip}
				</button>
			{/each}

			<!-- Custom number input -->
			{#if showCustom}
				<input
					id={customInputId}
					type="text"
					inputmode="numeric"
					value={customInput}
					oninput={handleCustomInput}
					placeholder="eg. 7"
					class={`h-10 w-20 rounded-lg border px-3 text-center text-sm font-semibold transition-all outline-none ${customInputError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-primary bg-primary/5 text-primary dark:bg-primary/10 dark:text-primary/90'} focus:ring-2 focus:ring-primary/30`}
				/>
				{#if customInputError}
					<span class="text-xs font-medium text-red-500">{customInputError}</span>
				{/if}
			{:else}
				<button
					type="button"
					onclick={toggleCustom}
					class="h-10 rounded-lg border border-dashed border-gray-300 px-3 text-xs text-gray-400 transition-all hover:border-primary/60 hover:text-primary dark:border-gray-600 dark:text-gray-500"
				>
					Other
				</button>
			{/if}
		</div>

		{#if minCount > 1}
			<p class="mt-1 text-xs text-gray-400">Minimum {minCount} required</p>
		{/if}
	{/if}

	{#if showError}
		<p class="mt-1.5 flex items-start gap-1 text-xs text-red-600">
			<span>•</span><span>{error}</span>
		</p>
	{/if}
</div>
