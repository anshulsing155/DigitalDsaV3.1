<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import { getIcon } from '$lib/utils/iconRegistry';

	type InputRestriction = 'numeric' | 'alphabet' | 'alphanumeric' | 'currency';

	interface Props {
		inputRestriction?: InputRestriction;
		restrictionError?: string;
		maxLengthErrorMessage?: string;
		maxLengthError?: string;
		maxlength?: number;
		showValidationErrors?: boolean;
		id?: string;
		label?: string;
		placeholder?: string;
		value?: string | number;
		type?: string;
		required?: boolean;
		validateOnInput?: boolean;
		error?: string;
		disabled?: boolean;
		icon?: ComponentType | string | null;
		containerClass?: string;
		labelClass?: string;
		inputClass?: string;
		errorClass?: string;
		descriptionHeader?: string;
		isTouched?: boolean;
		onInput?: (val: string | number) => void;
		onBlur?: (val: string | number) => void;
	}

	let {
		inputRestriction = undefined,
		restrictionError = $bindable(''),
		maxLengthErrorMessage = '',
		maxLengthError = $bindable(''),
		maxlength = undefined,
		showValidationErrors = false,
		id = '',
		label = '',
		placeholder = '',
		value = $bindable(),
		type = 'text',
		required = false,
		validateOnInput = false,
		error = '',
		disabled = false,
		icon = null,
		containerClass = ' ',
		labelClass = 'buttonText',
		inputClass = '',
		errorClass = '',
		descriptionHeader = '',
		isTouched = false,
		onInput = () => {},
		onBlur = () => {}
	}: Props = $props();

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

	// Format number in Indian style (1,00,000)
	// Preserves leading zeros during active editing — cleaned on blur
	function formatIndianNumber(num: string): string {
		if (!num) return '';
		const stripped = num.replace(/^0+/, '');
		if (stripped === '') return num;
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

	function handleBeforeInput(e: InputEvent) {
		if (!maxlength) return;

		const el = e.target as HTMLInputElement;
		const incoming = e.data ?? '';

		// Account for selected text that will be replaced
		const selectionStart = el.selectionStart ?? 0;
		const selectionEnd = el.selectionEnd ?? 0;
		const selectionLength = selectionEnd - selectionStart;
		const nextLength = el.value.length - selectionLength + incoming.length;

		if (nextLength > maxlength) {
			e.preventDefault();
			maxLengthError = maxLengthErrorMessage;
		}
	}

	function toPascalCase(str: string): string {
		return str
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join('');
	}

	let IconComponent = $derived(
		typeof icon === 'string' && icon ? (getIcon(toPascalCase(icon)) ?? null) : icon
	);

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

				// Mid-edit guard: if all digits are zero, don't update value
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
			} else {
				// Restriction with no regex filter (e.g. alphanumeric)
				el.value = nextValue;
				value = nextValue;
			}
		} else {
			el.value = nextValue;
			value = nextValue;
		}

		if (maxlength) {
			if (String(value).length <= maxlength) {
				maxLengthError = '';
			}
		}

		if (validateOnInput) {
			onInput(value ?? '');
		}
	}

	function handleFocus() {
		isTouched = false; // Hide errors when user starts editing
	}

	function handleBlur(e: Event) {
		const val = (e.target as HTMLInputElement).value;

		isTouched = true; // Set touched on blur for deferred error display

		if (maxlength && val.length <= maxlength) {
			maxLengthError = '';
		}

		onBlur(val);
	}

	$effect(() => {
		if (!maxlength) maxLengthError = '';
	});

	let computedInputMode = $derived.by(() => {
		return (
			inputRestriction === 'numeric' || inputRestriction === 'currency' ? 'numeric' : 'text'
		) as 'numeric' | 'text';
	});

	let displayError = $derived(
		isTouched
			? restrictionError || maxLengthError || error || ''
			: restrictionError || maxLengthError || ''
	);
</script>

<div class={`w-full ${containerClass}`}>
	{#if label}
		<label
			for={id}
			class={`text-labelText font-titleMedium !m-0 text-[var(--form-text-label)] ${labelClass}`}
		>
			{label}
			{#if required}
				<span class="ml-0.5 text-red-600">*</span>
			{/if}
		</label>

		{#if descriptionHeader && formState.applicationData?.ApplicantIsNRI === 'Yes'}
			<p class="smallText text-[var(--form-text-label)]">{descriptionHeader}</p>
		{/if}
	{/if}

	<div
		class="relative mt-2 flex overflow-hidden rounded-md border bg-[var(--form-bg-card)] transition-all duration-150
		{displayError
			? 'border-red-500 ring-1 ring-red-500/30'
			: 'border-[var(--form-border)] focus-within:ring-1 focus-within:ring-[var(--ddsa-primary-700)]'}"
	>
		{#if IconComponent && typeof IconComponent !== 'string'}
			{@const Icon = IconComponent}
			{@const hasValue = value && value !== ''}
			<div
				class="flex w-8 shrink-0 items-center justify-center transition-all duration-300 {hasValue
					? 'icon-filled'
					: 'icon-empty'}"
			>
				<Icon
					class="h-4 w-4 shrink-0 text-white transition-transform duration-300 dark:text-gray-900"
				/>
			</div>
		{/if}

		<input
			{id}
			{type}
			{placeholder}
			{disabled}
			inputmode={computedInputMode}
			value={getDisplayValue()}
			onbeforeinput={handleBeforeInput}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			aria-invalid={!!displayError}
			aria-describedby={displayError ? `${id}-error` : undefined}
			class="
				buttonText placeholder-[var( var(--form-text-muted)] h-10 w-full border-none px-3 py-2.5 text-[var(--form-text-label)] outline-none
				{disabled ? 'cursor-not-allowed bg-[var(--form-bg-disabled)] text-[var(--form-text-muted)] ' : ''}
				{inputClass}
			"
			autocomplete="off"
		/>
	</div>

	{#if displayError}
		<p
			id={`${id}-error`}
			class={`tinyText mt-1 text-red-600 ${IconComponent ? 'pl-8' : ''} ${errorClass}`}
		>
			{displayError}
		</p>
	{/if}
</div>
