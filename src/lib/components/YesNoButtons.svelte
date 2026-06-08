<script lang="ts">
	import { Check, X } from '$lib/utils/iconRegistry';

	interface Props {
		label?: string;
		value?: boolean | null;
		required?: boolean;
		error?: string;
		showValidationErrors?: boolean;
		disabled?: boolean;
		isTouched?: boolean;
		onChange?: (val: boolean) => void;
		containerClass?: string;
		id?: string;
	}

	let {
		label = '',
		value = $bindable(),
		required = false,
		error = '',
		showValidationErrors = false,
		disabled = false,
		isTouched = false,
		onChange = () => {},
		containerClass = '',
		id = ''
	}: Props = $props();

	let locallyTouched = $state(false);

	function handleSelect(val: boolean) {
		locallyTouched = true;
		value = val;
		onChange(val);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (disabled) return;

		switch (e.key.toUpperCase()) {
			case 'Y':
				e.preventDefault();
				handleSelect(true);
				break;
			case 'N':
				e.preventDefault();
				handleSelect(false);
				break;
		}
	}

	let displayError = $derived((isTouched || locallyTouched) && error ? error : '');
</script>

<div
	class={containerClass}
	role="radiogroup"
	tabindex="0"
	aria-labelledby={id ? `${id}-label` : undefined}
	onkeydown={handleKeyDown}
>
	{#if label}
		<span id={id ? `${id}-label` : undefined} class="text-labelText mb-2 block">
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</span>
	{/if}

	<div class="grid w-full grid-cols-2 gap-3">
		<!-- Yes Button -->
		<button
			type="button"
			{disabled}
			class="buttonText relative flex w-full items-center justify-center gap-2 rounded-lg
			border px-3 py-2.5 font-medium transition-all duration-200
			{value === true
				? 'yes-button-selected border-transparent'
				: error && showValidationErrors
					? 'border-red-500 bg-red-50 dark:bg-red-900/20'
					: 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}
			{disabled && 'cursor-not-allowed opacity-50'}"
			onclick={() => handleSelect(true)}
			aria-pressed={value === true}
		>
			<Check
				size={18}
				class={value === true ? 'text-white' : 'text-green-600 dark:text-green-400'}
			/>
			<span class={value === true ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>Yes</span>
		</button>

		<!-- No Button -->
		<button
			type="button"
			{disabled}
			class="buttonText relative flex w-full items-center justify-center gap-2 rounded-lg
			border px-3 py-2.5 font-medium transition-all duration-200
			{value === false
				? 'no-button-selected border-transparent'
				: error && showValidationErrors
					? 'border-red-500 bg-red-50 dark:bg-red-900/20'
					: 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'}
			{disabled && 'cursor-not-allowed opacity-50'}"
			onclick={() => handleSelect(false)}
			aria-pressed={value === false}
		>
			<X size={18} class={value === false ? 'text-white' : 'text-red-600 dark:text-red-400'} />
			<span class={value === false ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>No</span>
		</button>
	</div>

	{#if displayError}
		<p class="mt-2 flex items-start gap-1 text-sm text-red-600">
			<span>•</span>
			<span>{error}</span>
		</p>
	{/if}
</div>

<style>
	.yes-button-selected {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
	}

	.no-button-selected {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
	}
</style>
