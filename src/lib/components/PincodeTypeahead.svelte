<script lang="ts">
	import TextField from './TextField.svelte';

	/**
	 * Reusable pincode typeahead — wraps TextField with live suggestions
	 * fetched from /api/pincodes. Used across all 6 loan form pages.
	 *
	 * source='selected' → pincode_IN_Selected.json (23 states, for property locations)
	 * source='all'      → pincode_IN_all.json (36 states, for residence/business)
	 */

	interface Props {
		id: string;
		label: string;
		value: string;
		stateValue: string;
		cityValue: string;
		source?: 'selected' | 'all';
		placeholder?: string;
		required?: boolean;
		description?: string;
		descriptionHeader?: string;
		onInput: (val: string) => void;
		onSelect: (pincode: string) => void;
		onerror?: (error: string) => void;
	}

	let {
		id,
		label,
		value = '',
		stateValue = '',
		cityValue = '',
		source = 'selected',
		placeholder = 'Enter 6-digit pincode',
		required = false,
		description = '',
		descriptionHeader = '',
		onInput,
		onSelect,
		onerror
	}: Props = $props();

	// ── State ──
	let pincodeStateMap = $state<Record<string, Array<{ pincode: string; area: string }>>>({});
	let showSuggestions = $state(false);
	let lastLoadedState = '';

	// ── Derived ──
	let filteredPincodes = $derived.by(() => {
		if (!value || value.length < 3) return [];
		const cityPincodes = pincodeStateMap[cityValue] ?? [];
		if (cityPincodes.length === 0) return [];
		return cityPincodes.filter((p) => p.pincode.startsWith(value)).slice(0, 8);
	});

	let validationError = $derived.by(() => {
		if (!value || value.length < 3 || !cityValue) return '';
		const cityPincodes = pincodeStateMap[cityValue] ?? [];
		if (cityPincodes.length === 0) return '';
		const hasMatch = cityPincodes.some((p) => p.pincode.startsWith(value));
		if (!hasMatch) {
			if (value.length === 6) {
				return `Pincode ${value} does not belong to ${cityValue}, ${stateValue}`;
			}
			return `No pincodes starting with ${value} found in ${cityValue}`;
		}
		return '';
	});

	// ── Emit validation error to parent ──
	$effect(() => {
		onerror?.(validationError);
	});

	// ── Load pincodes when state changes ──
	$effect(() => {
		if (stateValue && stateValue !== lastLoadedState) {
			lastLoadedState = stateValue;
			loadPincodes(stateValue);
		} else if (!stateValue) {
			lastLoadedState = '';
			pincodeStateMap = {};
		}
	});

	async function loadPincodes(state: string) {
		try {
			const url =
				source === 'all'
					? `/api/pincodes?state=${encodeURIComponent(state)}&source=all`
					: `/api/pincodes?state=${encodeURIComponent(state)}`;
			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				pincodeStateMap = data.data?.pincodes ?? {};
			}
		} catch {
			pincodeStateMap = {};
		}
	}

	function handleInput(val: string) {
		showSuggestions = val.length >= 3 && val.length < 6;
		onInput(val);
	}

	function handleSelect(pincode: string) {
		showSuggestions = false;
		onSelect(pincode);
	}
</script>

<div class="relative">
	<TextField
		{id}
		{label}
		{placeholder}
		{value}
		fieldType="pincode"
		{required}
		{description}
		{descriptionHeader}
		onInput={(val) => handleInput(val as string)}
	/>

	{#if validationError}
		<p class="mt-1 text-xs font-medium text-red-500">{validationError}</p>
	{/if}

	{#if showSuggestions && filteredPincodes.length > 0}
		<div
			class="absolute z-100 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
		>
			{#each filteredPincodes as entry (entry.pincode + entry.area)}
				<button
					type="button"
					class="w-full border-b border-gray-100 px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
					onclick={() => handleSelect(entry.pincode)}
				>
					<span class="font-semibold text-gray-800">{entry.pincode}</span>
					<span class="ml-2 text-gray-500">— {entry.area}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
