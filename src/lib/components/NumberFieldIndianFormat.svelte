<script lang="ts">
	import { getIcon, User } from '$lib/utils/iconRegistry';
	import { ToWords } from 'to-words';

	interface Props {
		value?: number | null | undefined;
		onInput?: (val: number | null) => void;
		onBlur?: (val: number | null) => void;
		onChange?: (val: number | null) => void;
		icon?: string;
		helperText?: string;
		isTouched?: boolean;
		maxLength?: number;
		max?: number;
		showNumberInWords?: boolean;
	}

	let {
		value = undefined,
		onInput = () => {},
		onBlur = () => {},
		onChange = () => {},
		icon = 'User',
		helperText = undefined,
		isTouched = false,
		maxLength = undefined,
		max = undefined,
		showNumberInWords = false
	}: Props = $props();

	const toWords = new ToWords({
		localeCode: 'en-IN',
		converterOptions: {
			currency: false
		}
	});

	// Track when user clears the input — suppress stale words until parent prop updates
	let inputCleared = $state(false);

	$effect(() => {
		if (value !== null && value !== undefined) {
			inputCleared = false;
		}
	});

	// Compute number-to-words text reactively.
	// Returns '' for zero / negative — "Zero" lingering after the user clears
	// looks like a stale ghost value (the previous helper text from a typed
	// number that hasn't yet propagated). Positive amounts only.
	let wordsText = $derived.by(() => {
		if (inputCleared) return '';
		if (!showNumberInWords || value === null || value === undefined) return '';
		const num = Number(value);
		if (!Number.isFinite(num) || num <= 0) return '';
		try {
			return toWords.convert(num);
		} catch {
			return '';
		}
	});

	// Combined helper text: words text takes priority if showNumberInWords is enabled
	let displayHelperText = $derived(showNumberInWords && wordsText ? wordsText : helperText);

	let displayValue = $derived(formatIndian(value === null || value === undefined ? '' : value));

	function formatIndian(num: number | string) {
		if (num === '' || num === null || num === undefined) return '';

		let str = num.toString().replace(/\D/g, '');
		if (str.length <= 3) return str;
		let lastThree = str.slice(-3);
		let other = str.slice(0, -3);
		let formattedOther = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

		return `${formattedOther},${lastThree}`;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const cursorPos = target.selectionStart ?? 0;
		const oldLength = target.value.length;

		let raw = target.value.replace(/\D/g, '');

		if (raw === '') {
			target.value = '';
			inputCleared = true;
			onInput(null);
			return;
		}

		// Don't strip leading zeros during active editing — let the user
		// fix the first digit without the field collapsing "0000" → "0".
		// Leading zeros are cleaned on blur instead.

		// Enforce maxLength
		if (maxLength && raw.length > maxLength) {
			raw = raw.slice(0, maxLength);
		}

		if (raw === '') {
			target.value = '';
			inputCleared = true;
			onInput(null);
			return;
		}

		let numValue = Number(raw);

		// Mid-edit guard: if all digits are zero (user deleted first digit),
		// keep the display as-is and don't store 0 — let user type the new digit
		if (numValue === 0 && raw.length > 1) {
			target.value = raw;
			// Keep cursor where it was (don't jump to end)
			requestAnimationFrame(() => {
				target.setSelectionRange(cursorPos, cursorPos);
			});
			return;
		}

		// Enforce max value
		if (max !== undefined && numValue > max) {
			numValue = max;
			raw = String(max);
		}

		const formatted = formatIndian(raw);
		target.value = formatted;

		// Calculate and set cursor position
		const newLength = formatted.length;
		const lengthDiff = newLength - oldLength;
		let newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength));

		requestAnimationFrame(() => {
			target.setSelectionRange(newCursorPos, newCursorPos);
		});

		onInput(numValue);
	}

	function handleFocus() {
		// Parent handles isTouched via onInput callback
	}

	function handleBlur(e?: Event) {
		// Clean up leading zeros on blur — safe now that user is done editing
		if (e?.target) {
			const target = e.target as HTMLInputElement;
			let raw = target.value.replace(/\D/g, '');
			if (raw !== '0') {
				raw = raw.replace(/^0+/, '') || '';
			}
			if (raw === '') {
				target.value = '';
			} else {
				target.value = formatIndian(raw);
			}
		}
		onBlur(value ?? null);
	}

	function handleChange() {
		onChange(value ?? null);
	}

	let IconComponent = $derived(getIcon(icon as string) ?? User);
	let hasValue = $derived(value !== null && value !== undefined);
</script>

<div class="flex w-full flex-col gap-1">
	<div class="relative flex w-full">
		<div
			class="absolute left-0 flex h-full w-8 items-center justify-center rounded-l-md bg-[var(--form-bg-alt)] transition-all duration-300"
		>
			<IconComponent
				class="h-4 w-4 transition-transform duration-300 {hasValue
					? 'text-stone-600'
					: 'text-[var(--form-text-muted)]'}"
			/>
		</div>

		<input
			type="text"
			value={displayValue}
			placeholder="Enter Value"
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={(e) => handleBlur(e)}
			onchange={handleChange}
			class="text-inputText w-full rounded-md border border-[var(--form-border)] py-[0.6rem] pl-14 outline-none focus:border-primary focus:ring-2 focus:ring-primary md:py-[0.8rem]"
		/>
	</div>
	{#if displayHelperText && displayValue != ''}
		<p class="smallText pl-12 text-[var(--form-text-secondary)] italic">
			{displayHelperText}
		</p>
	{/if}
</div>
