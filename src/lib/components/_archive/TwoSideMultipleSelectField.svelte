<script lang="ts">
	import DescriptionTooltip from './DescriptionTooltip.svelte';

	interface Option {
		label: string;
		value: string | number;
		description?: string;
	}

	interface Props {
		id?: string;
		label?: string;
		description?: string;
		options?: Option[];
		selectedValues?: (string | number)[];
		error?: string | null;
		disabled?: boolean;
		required?: boolean;
		searchBankName?: string;
		multipleSelectClass?: string;
		onChange?: (values: (string | number)[]) => void;
	}

	let {
		id = '',
		label = '',
		description = undefined,
		options = [],
		selectedValues = $bindable([]),
		error = null,
		disabled = false,
		required = false,
		searchBankName = '',
		multipleSelectClass = '',
		onChange = () => {}
	}: Props = $props();

	let filteredOptions = $derived(
		searchBankName && options.length > 20
			? options.filter((opt) => opt.label.toLowerCase().includes(searchBankName.toLowerCase()))
			: options
	);

	function handleOptionClick(optionValue: string | number) {
		let newSelectedValues: (string | number)[];
		if (selectedValues.includes(optionValue)) {
			newSelectedValues = selectedValues.filter((v) => v !== optionValue);
		} else {
			newSelectedValues = [...selectedValues, optionValue];
		}
		selectedValues = newSelectedValues;
		onChange(newSelectedValues);
	}
</script>

<div class={`flex w-full flex-col gap-1 md:gap-2 ${multipleSelectClass}`}>
	<label for={id} class="labelText mb-1 block text-[var(--form-text)]">
		{@html label}

		{#if description}
			<DescriptionTooltip {description} />
		{/if}
	</label>

	<!-- Responsive table container -->
	<div
		class="relative w-full overflow-hidden rounded-lg border border-[var(--form-border)] bg-[var(--form-bg-card)] shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
		class:error={!!error}
	>
		<div class="h-[20rem] overflow-x-auto">
			<table class="inputText min-w-full border-collapse">
				<thead class="sticky top-0 bg-primary font-titleBold text-primaryText">
					<tr>
						<th class="w-[60px] px-3 py-2 text-left">S.No.</th>
						<th class="min-w-[200px] px-3 py-2 text-left">Option</th>
						<th class="min-w-[250px] px-3 py-2 text-left">Explanation</th>
						<th class="w-[80px] px-3 py-2 text-center">Select</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredOptions as option, index (option.value)}
						<tr
							class={`border-b border-[var(--form-border)] transition-colors hover:bg-primary/5 ${
								selectedValues.includes(option.value) ? 'bg-primary/5' : ''
							}`}
						>
							<td class="px-3 py-3 font-titleBold text-primaryText">{index + 1}.</td>
							<td class="px-3 py-3 font-titleBold text-primaryText">{option.label}</td>
							<td class="px-3 py-3 text-grayOne">
								{@html option.description || ''}
							</td>
							<td class="px-3 py-3 text-center">
								<input
									type="checkbox"
									class="h-4 w-4 cursor-pointer accent-primary"
									checked={selectedValues.includes(option.value)}
									{disabled}
									onchange={() => handleOptionClick(option.value)}
								/>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	{#if error}
		<p class="mt-1 text-sm text-error">{error}</p>
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
		background: linear-gradient(90deg, #ddbea9, #e3cab9);
		border-radius: 4px;
		transition: all 0.3s ease;
	}

	::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(90deg, #ddbea9, #e3cab9);
		box-shadow: 0 0 6px rgba(221, 190, 169, 0.6);
	}

	/* For Firefox */
	* {
		scrollbar-width: thin;
		scrollbar-color: #ddbea9 transparent;
	}
</style>
