<script lang="ts">
	import { getIcon } from '$lib/utils/iconRegistry';

	interface Props {
		id?: string;
		label?: string;
		value?: string | string[];
		readonly?: boolean;
		error?: string | null;
		onInput?: (val: string | string[], index?: number) => void;
		onBlur?: () => void;
		icon?: string | string[];
		placeholder?: string | string[];
		textFieldClass?: string;
		showTitleDropdown?: boolean;
		showAreaUnitDropdown?: boolean;
		uiType?: string;
		disabled?: boolean;
	}

	let {
		id = '',
		label = '',
		value = $bindable(),
		readonly = false,
		error = null,
		onInput = () => {},
		onBlur = () => {},
		icon = '',
		placeholder = '',
		textFieldClass = '',
		showTitleDropdown = false,
		showAreaUnitDropdown = false,
		uiType = 'text',
		disabled = false
	}: Props = $props();

	let localInputError: string | null = $state(null);
	let lastValidValue = $state('');
	// Track if field has been blurred to show validation errors only after blur
	let isTouched = $state(false);

	function validateInterestRate(val: string | string[]): {
		isValid: boolean;
		error: string | null;
	} {
		// Convert to string if it's an array or other type
		const strVal = Array.isArray(val) ? val[0] || '' : String(val || '');

		// Empty value is valid
		if (strVal === '') {
			return { isValid: true, error: null };
		}

		// Check if it matches the decimal pattern (digits with optional decimal and max 2 decimal places)
		const regex = /^\d+(\.\d{0,2})?$/;
		if (!regex.test(strVal)) {
			return { isValid: false, error: 'Invalid format. Use numbers with up to 2 decimal places.' };
		}

		const numValue = parseFloat(strVal);

		// Check if value exceeds maximum
		if (numValue > 99.99) {
			return { isValid: false, error: 'Interest rate cannot exceed 99.99%' };
		}

		// Check for integer part length (max 2 digits before decimal)
		const parts = strVal.split('.');
		if (parts[0].length > 2) {
			return { isValid: false, error: 'Interest rate cannot exceed 99.99%' };
		}

		return { isValid: true, error: null };
	}

	function handleInput(event: Event, index?: number) {
		const target = event.target as HTMLInputElement;
		let val: string = target.value ?? '';

		// Allow empty value (user deleting everything)
		if (val === '') {
			lastValidValue = '';
			localInputError = null;

			if (Array.isArray(placeholder)) {
				const currentValue = Array.isArray(value)
					? [...value]
					: new Array(placeholder.length).fill('');
				if (typeof index === 'number') currentValue[index] = '';
				onInput(currentValue, index);
			} else {
				onInput('');
			}
			return;
		}

		// Basic regex to allow only valid number input during typing
		// Allows: digits, one decimal point, and up to 2 decimal places
		const typingRegex = /^\d{0,2}(\.\d{0,2})?$/;

		// If the format is completely invalid during typing, revert
		if (!typingRegex.test(val)) {
			target.value = lastValidValue;
			return;
		}

		// Validate the complete value
		const validation = validateInterestRate(val);

		if (!validation.isValid) {
			// Set error but don't revert immediately - let user see what they typed
			localInputError = validation.error;
			// Revert to last valid value
			target.value = lastValidValue;
			return;
		}

		// Valid input
		lastValidValue = val;
		localInputError = null;

		// Update parent
		if (Array.isArray(placeholder)) {
			const currentValue = Array.isArray(value)
				? [...value]
				: new Array(placeholder.length).fill('');
			if (typeof index === 'number') currentValue[index] = val;
			onInput(currentValue, index);
		} else {
			onInput(val);
		}
	}

	function handleFocus() {
		isTouched = false; // Hide errors when user starts editing
	}

	function handleBlur() {
		isTouched = true;
		// Final validation on blur
		const validation = validateInterestRate(value ?? '');

		const strValue = Array.isArray(value) ? value[0] : value;
		if (!validation.isValid && strValue !== '') {
			localInputError = validation.error;
		} else {
			localInputError = null;
		}

		onBlur();
	}

	function toPascalCase(str: string | null | undefined): string {
		if (!str || typeof str !== 'string') return '';
		return str
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(
		icon ? getIcon(toPascalCase(Array.isArray(icon) ? icon[0] : icon)) : null
	);
</script>

<div class={`${textFieldClass} flex w-full flex-col gap-1 md:gap-2`}>
	<label for={id} class="text-labelText">
		{label}
	</label>

	<div class="relative flex w-full flex-row justify-between overflow-hidden rounded-md">
		{#if IconComponent}
			{@const Icon = IconComponent}
			{@const hasValue = value !== undefined && value !== null && value !== ''}
			<div
				class="absolute left-0 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200"
				style="background: var({hasValue ? '--ddsa-primary-500' : '--ddsa-secondary-900, #1e293b'})"
			>
				<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
			</div>
		{/if}
		<input
			{id}
			type="text"
			inputmode="decimal"
			{value}
			placeholder={Array.isArray(placeholder) ? placeholder[0] : placeholder}
			{readonly}
			{disabled}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class={`inputText w-full rounded-md border border-grayTwo py-[0.6rem] outline-none focus:border-primary focus:ring-2 focus:ring-primary md:py-[0.8rem] ${
				showAreaUnitDropdown
					? 'pl-[4.7rem]'
					: showTitleDropdown || IconComponent
						? 'pl-[3.5rem]'
						: ''
			} ${disabled || readonly ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''} ${
				error || localInputError ? 'border-red-500 focus:ring-red-500' : ''
			}`}
		/>
	</div>

	<div class="flex flex-col">
		{#if isTouched && error}
			<p id={id + '-error'} class="smallText pl-[3rem] text-error">{error}</p>
		{/if}
		{#if isTouched && localInputError}
			<p class="smallText pl-[3rem] text-error">{localInputError}</p>
		{/if}
	</div>
</div>
