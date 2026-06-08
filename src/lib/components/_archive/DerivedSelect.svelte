<script lang="ts">
	import { getIcon } from '$lib/utils/iconRegistry';
	import CustomSelect from './CustomSelect.svelte';

	interface Option {
		label: string;
		value: string | number;
	}

	interface Props {
		derivedClass?: string;
		id: string;
		label: string;
		description?: string;
		options?: Option[];
		value?: string | number;
		error?: string | null;
		disabled?: boolean;
		required?: boolean;
		onChange?: (value: string | number) => void;
		icon?: string;
		subLabel?: string;
	}

	let {
		derivedClass = '',
		id,
		label,
		description = undefined,
		options = [],
		value = $bindable(),
		error = null,
		disabled = false,
		required = false,
		onChange = () => {},
		icon = '',
		subLabel = undefined
	}: Props = $props();

	let isFocused = $state(false);

	function handleChange(newValue: string | number) {
		value = newValue;
		onChange(newValue);
	}

	function toPascalCase(str: string): string {
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived.by(() => {
		return icon ? (getIcon(toPascalCase(icon)) ?? null) : null;
	});

	let placeholder = $derived(subLabel ? `Select ${subLabel}` : 'Select an option');
</script>

<div class={`${derivedClass} flex flex-col gap-1 md:gap-2`}>
	{#if label}
		<label for={id} id="{id}-label" class="labelText block">
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</label>
	{/if}
	{#if description}
		<p class="regularText mb-2 text-nowrap text-grayOne">
			{description}
		</p>
	{/if}
	<div class="flex flex-col">
		<div class="relative">
			{#if IconComponent}
				{@const Icon = IconComponent}
				<div
					class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200
					{isFocused ? 'icon-focused' : value ? 'icon-selected' : 'bg-black dark:bg-gray-200'}"
				>
					<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
				</div>
			{/if}

			<CustomSelect
				{id}
				{options}
				bind:value
				{placeholder}
				{disabled}
				{required}
				hasIcon={!!IconComponent}
				hasError={!!error}
				onChange={handleChange}
				onFocus={() => (isFocused = true)}
				onBlur={() => (isFocused = false)}
			/>

			{#if subLabel && value}
				<p
					class="alertText absolute -top-2 left-[4rem] z-10 mb-1 bg-[var(--form-bg-card)] text-grayThree"
				>
					Selected {subLabel}
				</p>
			{/if}
		</div>
	</div>
	{#if error}
		<p class="smallText mt-1 pl-[3rem] text-error">{error}</p>
	{/if}
</div>

<style>
	.icon-selected {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
	}
	.icon-focused {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		box-shadow: 0 0 12px rgba(203, 153, 126, 0.4);
	}
</style>
