<script lang="ts">
	import {
		getIcon,
		AlertCircle,
		AlertTriangle,
		XCircle,
		TriangleAlert
	} from '$lib/utils/iconRegistry';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import CustomSelect from './CustomSelect.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	interface Option {
		label: string;
		value: string | number;
	}

	interface Props {
		readonly?: boolean;
		id: string;
		label: string;
		customSelectClass?: string;
		labelClass?: string;
		description?: string;
		selectIconClass?: string;
		options?: Option[];
		value?: string | number;
		error?: string | null;
		warning?: string | null;
		disabled?: boolean;
		required?: boolean;
		onChange?: (value: string | number) => void;
		icon?: string;
		selectClass?: string;
		subLabel?: string;
		modalWidth?: string;
		continueButton?: boolean | any;
		parentClass?: string;
	}

	let {
		readonly = false,
		id,
		label,
		labelClass = '',
		customSelectClass = 'rounded-[1rem]',
		selectIconClass = 'rounded-l-md',
		description = undefined,
		options = [],
		value = $bindable(),
		error = null,
		warning = null,
		disabled = false,
		required = false,
		onChange = () => {},
		icon = '',
		selectClass = '',
		subLabel = undefined,
		modalWidth = '',
		continueButton = true
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

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur() {
		isFocused = false;
	}

	let placeholder = $derived(subLabel ? `Select ${subLabel}` : 'Select an option');
</script>

<div class={`${selectClass} flex flex-col`}>
	<label
		for={id}
		id="{id}-label"
		class="text-labelQuestion {(value == null || value === '') &&
		formState.applicationData.checkUnsecureData
			? 'text-(--form-text-label)'
			: ''} {labelClass}"
	>
		{@html sanitizeHtml(label)}
		{#if required}
			<span class="label-required">*</span>
		{/if}
		{#if description}
			<DescriptionTooltip {description} {modalWidth} />
		{/if}
	</label>

	<div class="flex flex-col">
		<div class="relative">
			{#if IconComponent}
				{@const Icon = IconComponent}
				<div
					class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center {selectIconClass} transition-all duration-200
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
	</div>

	<!-- Error Message -->
	{#if error}
		<div role="alert" class="error-message">
			<XCircle class="h-5 w-5 shrink-0 text-red-500" />
			<span class="alertText text-red-600">{error}</span>
		</div>
	{/if}

	<!-- Warning Message -->
	{#if warning}
		<div class="warning-message">
			<TriangleAlert class="text-currentColor h-5 w-5 shrink-0" />
			<p class="alertText text-currentColor">{warning}</p>
		</div>
	{/if}
</div>

<style>
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
