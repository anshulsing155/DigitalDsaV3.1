<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import { getIcon, AlertCircle, CheckCircle2 } from '$lib/utils/iconRegistry';

	type InputRestriction = 'numeric' | 'alphabet' | 'alphanumeric' | 'currency';

	interface Props {
		inputRestriction?: InputRestriction;
		restrictionError?: string;
		maxLengthErrorMessage?: string;
		maxLengthError?: string;
		maxlength?: number;
		id?: string;
		label?: string;
		placeholder?: string;
		value?: string | number;
		type?: string;
		required?: boolean;
		error?: string;
		disabled?: boolean;
		icon?: ComponentType | string | null;
		validateOnInput?: boolean;
		containerClass?: string;
		labelClass?: string;
		inputClass?: string;
		errorClass?: string;
		descriptionHeader?: string;
		onInput?: () => void;
		onBlur?: () => void;
	}

	let {
		inputRestriction = undefined,
		restrictionError = $bindable(''),
		maxLengthErrorMessage = '',
		maxLengthError = $bindable(''),
		maxlength = undefined,
		id = '',
		label = '',
		placeholder = '',
		value = $bindable(),
		type = 'text',
		required = false,
		error = '',
		disabled = false,
		icon = null,
		validateOnInput = false,
		containerClass = '',
		labelClass = '',
		inputClass = '',
		errorClass = '',
		descriptionHeader = '',
		onInput = () => {},
		onBlur = () => {}
	}: Props = $props();

	// Track if field has been blurred - errors only show after blur, hide on focus
	let isTouched = $state(false);
	let isFocused = $state(false);

	// Format number in Indian style (1,00,000)
	// Preserves leading zeros during active editing — cleaned on blur
	function formatIndianNumber(num: string): string {
		if (!num) return '';
		const stripped = num.replace(/^0+/, '');
		if (stripped === '') return num; // all zeros — keep as-is during editing
		const leadingZeros = num.slice(0, num.length - stripped.length);
		if (stripped.length <= 3) return leadingZeros + stripped;
		const lastThree = stripped.slice(-3);
		const other = stripped.slice(0, -3);
		const formattedOther = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
		return leadingZeros + `${formattedOther},${lastThree}`;
	}

	// Get display value for currency fields
	function getDisplayValue(): string | number {
		if (inputRestriction === 'currency' && value) {
			const rawVal = String(value).replace(/[^0-9]/g, '');
			return formatIndianNumber(rawVal);
		}
		return value ?? '';
	}

	const RESTRICTION_CONFIG = {
		numeric: {
			regex: /[^0-9]/g,
			message: ''
		},
		alphabet: {
			regex: /[^a-zA-Z ]/g,
			message: ''
		},
		alphanumeric: {
			regex: null,
			message: ''
		},
		currency: {
			regex: /[^0-9]/g,
			message: ''
		}
	} as const;

	function handleBeforeInput(e: InputEvent) {
		if (!maxlength) return;

		const el = e.target as HTMLInputElement;
		const incoming = e.data ?? '';
		const nextLength = el.value.length + incoming.length;

		if (nextLength > maxlength) {
			e.preventDefault();
			maxLengthError = maxLengthErrorMessage;
		}
	}

	function toPascalCase(str: string): string {
		return str
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join('');
	}

	let IconComponent = $derived(
		typeof icon === 'string' && icon ? (getIcon(toPascalCase(icon)) ?? null) : icon
	) as ComponentType | null;

	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		let nextValue = el.value;

		nextValue = nextValue.replace(/^\s+/, '');
		nextValue = nextValue.replace(/\s{2,}/g, ' ');

		if (inputRestriction) {
			const config = RESTRICTION_CONFIG[inputRestriction];

			if (inputRestriction === 'currency') {
				// Special handling for currency with Indian formatting
				const cursorPos = el.selectionStart ?? 0;
				const oldLength = nextValue.length;

				// Strip non-numeric — keep leading zeros during editing (cleaned on blur)
				let rawVal = nextValue.replace(/[^0-9]/g, '');

				// Enforce max length on raw digits
				if (maxlength && rawVal.length > maxlength) {
					rawVal = rawVal.slice(0, maxlength);
				}

				// Mid-edit guard: if all digits are zero, don't update value —
				// keep display as-is and let user type the new first digit
				const numericVal = Number(rawVal);
				if (numericVal === 0 && rawVal.length > 1) {
					el.value = rawVal;
					requestAnimationFrame(() => {
						el.setSelectionRange(cursorPos, cursorPos);
					});
					return;
				}

				// Format with Indian commas
				const formatted = formatIndianNumber(rawVal);
				el.value = formatted;

				// Calculate and set cursor position
				const newLength = formatted.length;
				const lengthDiff = newLength - oldLength;
				let newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength));

				requestAnimationFrame(() => {
					el.setSelectionRange(newCursorPos, newCursorPos);
				});

				// Store raw value (without commas)
				value = rawVal;
				restrictionError = '';
			} else if (config.regex) {
				const cleaned = nextValue.replace(config.regex, '');

				if (cleaned !== nextValue) {
					restrictionError = config.message;
				} else {
					restrictionError = '';
				}

				nextValue = cleaned;
				el.value = nextValue;
				value = nextValue;
			}
		} else {
			el.value = nextValue;
			value = nextValue;
		}

		if (maxlength && String(value).length <= maxlength) {
			maxLengthError = '';
		}

		if (validateOnInput) {
			onInput();
		}
	}

	$effect(() => {
		if (!maxlength) {
			maxLengthError = '';
		}
	});

	let computedInputMode = $derived(
		(inputRestriction === 'numeric' || inputRestriction === 'currency' ? 'numeric' : 'text') as
			| 'numeric'
			| 'text'
	);

	function handleFocus() {
		isFocused = true;
		isTouched = false;
	}

	function handleBlur() {
		isFocused = false;
		isTouched = true;
		onBlur();
	}

	let hasError = $derived(isTouched && (error || restrictionError || maxLengthError));
	let isValid = $derived(isTouched && value && !hasError);
</script>

<div class="flex w-full flex-col {containerClass}">
	{#if label}
		<label
			for={id}
			class="text-labelText font-titleBold text-[var(--form-text-secondary)] {labelClass}"
		>
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</label>
		{#if descriptionHeader && formState.applicationData?.ApplicantIsNRI == 'Yes'}
			<p class="smallText text-[var(--form-text-label)]">{descriptionHeader}</p>
		{/if}
	{/if}

	<div class="relative flex w-full flex-row justify-between">
		{#if IconComponent}
			{@const Icon = IconComponent}
			{@const hasValue = value !== undefined && value !== null && value !== ''}
			<div
				class="absolute top-0 left-0 z-10  rounded-l-md flex h-full w-12 items-center justify-center transition-all duration-200
					{isFocused ? 'icon-focused' : hasValue ? 'icon-filled' : 'icon-empty'}"
			>
				<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
			</div>
		{/if}

		<input
			{id}
			{type}
			inputmode={computedInputMode}
			value={getDisplayValue()}
			{disabled}
			{placeholder}
			onbeforeinput={handleBeforeInput}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			aria-invalid={hasError ? 'true' : 'false'}
			aria-describedby={hasError ? `${id}-error` : undefined}
			class={`text-labelText !m-0 w-full border-2  rounded-l-md rounded-r-[1rem]
					${value && value !== '' ? 'border-[var(--ddsa-primary-500)]' : 'border-[var(--form-border)]'}
					bg-[var(--form-bg-card)] py-[0.8rem]
					pr-4 pl-14 text-[var(--form-text-label)] placeholder-[var(--form-text-muted)] caret-[var(--ddsa-primary-500)] transition-colors
					outline-none focus:border-[var(--ddsa-primary-500)]
					focus:border-[var(--ddsa-primary-500)] focus:ring-1 focus:ring-[var(--ddsa-primary-500)]  ${disabled ? 'text-[var(--form-text-muted) cursor-not-allowed bg-[var(--form-bg-disabled)]' : ''}`}
			autocomplete="off"
		/>

		<!-- Status Icon -->
		{#if hasError}
			<div class="absolute top-1/2 right-4 -translate-y-1/2">
				<AlertCircle class="animate-pulse-subtle h-5 w-5 text-red-500" />
			</div>
		{:else if isValid}
			<div class="absolute top-1/2 right-4 -translate-y-1/2">
				<CheckCircle2 class="h-5 w-5 text-green-500" />
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if hasError}
		<div class="error-message !border-l-1 {errorClass}" id="{id}-error">
			<AlertCircle class="h-5 w-4 shrink-0" />
			<span>{error || restrictionError || maxLengthError}</span>
		</div>
	{/if}
</div>

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		margin: 0;
	}

	.icon-empty {
		background: var(--ddsa-secondary-900, #1e293b);
	}
	:global(.dark) .icon-empty {
		background: var(--ddsa-secondary-200, #e2e8f0);
	}
	.icon-filled {
		background: var(--ddsa-primary-500);
	}

	.icon-focused {
		background: var(--ddsa-primary-500);
		box-shadow: 0 0 8px color-mix(in srgb, var(--ddsa-primary-500) 40%, transparent);
	}
</style>
