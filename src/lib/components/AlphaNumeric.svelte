<script lang="ts">
	import { CreditCard, IdCard } from '$lib/utils/iconRegistry';

	interface Props {
		id?: string;
		label?: string;
		placeholder?: string;
		value?: string;
		readonly?: boolean;
		error?: string | null;
		onInput?: (val: string) => void;
		type?: 'PAN' | 'GST' | 'AADHAR';
		required?: boolean;
	}

	let {
		id = '',
		label = 'ID Number',
		placeholder = '',
		value = $bindable(),
		readonly = false,
		error = null,
		onInput = () => {},
		type = 'PAN',
		required = false
	}: Props = $props();

	// Type-derived fallback when caller omits `id` — pre-fix the default was
	// the constant 'id-field', so every loan-application page rendered both
	// PAN and Aadhaar with id="id-field" (silent autofill/a11y collision).
	// Computed in $derived because we can't reference `type` in a destructuring
	// default (TS TDZ — `type` is declared later in the same `let` block).
	let effectiveId = $derived(id || `alpha_${type.toLowerCase()}`);

	let localError: string | null = $state(null);
	// Track if field has been blurred to show validation errors only after blur
	let isTouched = $state(false);

	// Define maxLength per type
	const maxLengths = {
		PAN: 10,
		GST: 15,
		AADHAR: 12
	};

	const icons = {
		PAN: CreditCard,
		GST: CreditCard,
		AADHAR: IdCard
	};

	const Icon = $derived(icons[type]);

	function validate(val: string) {
		if (!val) return null;

		val = val.toUpperCase();

		if (type === 'PAN') {
			const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
			if (val.length !== 10) return 'PAN must be 10 characters long';
			if (!regex.test(val)) return 'Invalid PAN format';
		}

		if (type === 'GST') {
			const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
			if (val.length !== 15) return 'GST must be 15 characters long';
			if (!regex.test(val)) return 'Invalid GST format';
		}

		if (type === 'AADHAR') {
			if (val.length !== 12) return 'Aadhar must be 12 digits';
		}

		return null;
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		let val = target.value;
		val = val.replace(/\s+/g, '');

		// Prevent input beyond maxLength
		if (val.length > maxLengths[type]) {
			val = val.slice(0, maxLengths[type]);
		}

		localError = validate(val);
		target.value = val;
		onInput(val);
	}

	function handleFocus() {
		isTouched = false; // Hide errors when user starts editing
	}

	function handleBlur() {
		isTouched = true;
		// Validate on blur instead of clearing error
		localError = validate(value ?? '');
	}
</script>

<div class="flex w-full flex-col gap-1">
	<label for={id} class="text-labelText">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>

	<div class="relative flex w-full flex-row justify-between overflow-hidden rounded-md">
		<div
			class="absolute left-0 flex h-full w-[3rem] items-center justify-center rounded-l-md bg-primary"
		>
			<Icon class="h-5 w-5 text-white" />
		</div>

		<input
			id={effectiveId}
			name={effectiveId}
			type={type == 'AADHAR' ? 'number' : 'text'}
			{placeholder}
			{value}
			{readonly}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="text-inputText w-full rounded-md border border-[var(--form-border)] py-[0.6rem] pl-[3.5rem] uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary md:py-[0.8rem]"
			aria-describedby={error ? effectiveId + '-error' : undefined}
			aria-invalid={error ? 'true' : 'false'}
		/>
	</div>

	<div class="flex flex-col">
		{#if isTouched && error}
			<p id={effectiveId + '-error'} class="smallText pl-[3rem] text-error">{error}</p>
		{:else if isTouched && localError}
			<p class="smallText pl-[3rem] text-error">{localError}</p>
		{/if}
	</div>
</div>

<style>
	/* Chrome, Safari, Edge, Opera */
	input[type='number']::-webkit-outer-spin-button,
	input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
</style>
