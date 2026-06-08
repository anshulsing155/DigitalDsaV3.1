<script lang="ts">
	import { getIcon } from '$lib/utils/iconRegistry';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	interface Props {
		id?: string;
		label?: string;
		description?: string | null;
		value?: string;
		readonly?: boolean;
		error?: string | null;
		warning?: string | null;
		onInput?: (val: string) => void;
		icon?: string | null;
		placeholder?: string;
		textFieldClass?: string;
		disabled?: boolean;
		required?: boolean;
		modalWidth?: string;
		descriptionHeader?: string;
		descriptionText?: string;
		maxLength?: number;
	}

	let {
		id = '',
		label = '',
		description = null,
		value = $bindable(),
		readonly = false,
		error = null,
		warning = null,
		onInput = () => {},
		icon = null,
		placeholder = '',
		textFieldClass = '',
		disabled = false,
		required = false,
		modalWidth = '',
		descriptionHeader = '',
		descriptionText = '',
		maxLength = undefined
	}: Props = $props();

	function toPascalCase(str: string | null | undefined): string {
		if (!str) return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(icon ? getIcon(toPascalCase(icon)) : null);

	let isTouched = $state(false);

	function handleFocus() {
		isTouched = false;
	}

	function handleBlur() {
		isTouched = true;
	}

	function handleValueChange(val: string) {
		onInput(val);
	}
</script>

<div class={`${textFieldClass} flex w-full flex-col gap-1 md:gap-2`}>
	<label for={id} class="text-labelText block text-[var(--form-text)]">
		{@html sanitizeHtml(label)}
		{#if required}<span class="text-error">*</span>{/if}

		{#if description}<DescriptionTooltip {description} {modalWidth} />{/if}
		{#if descriptionHeader}<p class="smallText">{@html sanitizeHtml(descriptionHeader)}</p>{/if}
		{#if descriptionText}<DescriptionTooltip {description} {modalWidth} {descriptionText} />{/if}
	</label>

	<div class="relative flex w-full overflow-hidden rounded-md">
		{#if IconComponent}
			{@const Icon = IconComponent}
			<div
				class="absolute left-0 flex h-full w-[3rem] items-center justify-center rounded-l-md bg-[var(--dash-bg-elevated)] dark:bg-[var(--dash-bg-elevated)]"
			>
				<Icon class="h-5 w-5 text-[var(--dash-text-secondary)]" />
			</div>
		{/if}

		<input
			{id}
			type="text"
			bind:value
			{placeholder}
			{readonly}
			{disabled}
			maxlength={maxLength}
			oninput={() => handleValueChange(value ?? '')}
			onfocus={handleFocus}
			onblur={handleBlur}
			class={`inputText w-full rounded-md border border-[var(--form-border)] py-[0.6rem] outline-none
				focus:border-primary focus:ring-primary md:py-[0.8rem]
				${IconComponent ? 'pl-[3.5rem]' : ''}
				${disabled || readonly ? 'cursor-not-allowed bg-[var(--form-bg-alt)] text-[var(--form-text-secondary)]' : ''}`}
		/>
	</div>

	{#if error}
		<p class="smallText pl-[3rem] text-error">{error}</p>
	{/if}

	{#if warning}
		<p class="smallText pl-[3rem] text-warning italic">{warning}</p>
	{/if}
</div>

<!-- <style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		appearance: none;
		margin: 0;
	}
</style> -->
