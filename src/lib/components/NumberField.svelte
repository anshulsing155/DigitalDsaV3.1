<script lang="ts">
	import { getIcon, AlertCircle } from '$lib/utils/iconRegistry';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import CustomSelect from './CustomSelect.svelte';

	interface Props {
		id: string;
		label: string;
		numberClass?: string;
		description?: string | undefined;
		value?: number[] | number | null;
		error?: string | null;
		min?: number | undefined;
		max?: number | undefined;
		step?: number | 'any';
		disabled?: boolean;
		required?: boolean;
		icon?: string;
		icons?: string[];
		placeholder?: string | string[];
		onInput?: (value: number | number[] | null) => void;
		showUnitDropdown?: boolean;
		unit?: string;
		onUnitChange?: (val: string) => void;
		maxLength?: number;
		formatIndian?: boolean;
	}

	let {
		id,
		label,
		numberClass = '',
		description = undefined,
		value = $bindable(),
		error = $bindable(null),
		min = undefined,
		max = undefined,
		step = 1,
		disabled = false,
		required = false,
		icon = '',
		icons = [],
		placeholder = '',
		onInput = () => {},
		showUnitDropdown = false,
		unit = $bindable(''),
		onUnitChange = () => {},
		maxLength = 15,
		formatIndian = true
	}: Props = $props();

	const unitOptions = [
		{ label: 'Sq. Ft.', value: 'Sq. Ft.' },
		{ label: 'Sq. Mt.', value: 'Sq. Mt.' },
		{ label: 'Sq. Yd.', value: 'Sq. Yd.' }
	];
	let isFocused = $state(false);
	let focusedIndex = $state<number | null>(null);
	let unitPickerOpen = $state(false);

	// Format number in Indian style (1,00,000).
	// Preserves leading zeros during active editing so user can fix the first digit
	// without the field collapsing. Leading zeros are cleaned on blur.
	function formatIndianNumber(num: string): string {
		if (!num) return '';
		// During active editing: keep leading zeros as-is for cursor stability.
		// Only add comma formatting to the non-zero portion.
		const stripped = num.replace(/^0+/, '');
		if (stripped === '') return num; // all zeros — keep as-is (e.g. "0000")
		const leadingZeros = num.slice(0, num.length - stripped.length);
		if (stripped.length <= 3) return leadingZeros + stripped;
		const lastThree = stripped.slice(-3);
		const other = stripped.slice(0, -3);
		const formattedOther = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
		return leadingZeros + `${formattedOther},${lastThree}`;
	}

	// Get raw numeric value from formatted string
	function getRawNumber(str: string): string {
		return str.replace(/[^0-9]/g, '');
	}

	// Get display value with optional Indian formatting
	function getDisplayValue(val: number | number[] | null | undefined, idx?: number): string {
		let numVal: number | null | undefined;
		if (Array.isArray(val)) {
			numVal = val[idx ?? 0];
		} else {
			numVal = val;
		}

		if (numVal === null || numVal === undefined) return '';

		const strVal = String(numVal);
		return formatIndian ? formatIndianNumber(strVal) : strVal;
	}

	function handleInput(event: Event, index?: number) {
		const target = event.target as HTMLInputElement;
		const cursorPos = target.selectionStart ?? 0;
		const oldLength = target.value.length;

		// Strip all non-numeric characters
		let rawVal = getRawNumber(target.value);

		// Don't strip leading zeros during active editing — let the user fix the
		// first digit without the field collapsing "0000" → "0".
		// Leading zeros are stripped on blur (handleBlur) instead.

		// Enforce max length
		if (rawVal.length > maxLength) {
			rawVal = rawVal.slice(0, maxLength);
		}

		// Format display value (formatIndianNumber handles leading zeros for display)
		const formatted = formatIndian ? formatIndianNumber(rawVal) : rawVal;
		target.value = formatted;

		// Calculate and set cursor position
		const newLength = formatted.length;
		const lengthDiff = newLength - oldLength;
		let newCursorPos = Math.max(0, Math.min(cursorPos + lengthDiff, newLength));

		requestAnimationFrame(() => {
			target.setSelectionRange(newCursorPos, newCursorPos);
		});

		// Parse to number
		const newValue = rawVal ? parseInt(rawVal, 10) : null;

		// Mid-edit guard: if all digits are zero (user deleted first digit),
		// don't store 0 — keep display as-is and let user type the new digit
		if (newValue === 0 && rawVal.length > 1) {
			requestAnimationFrame(() => {
				target.setSelectionRange(cursorPos, cursorPos);
			});
			return;
		}

		// Validate min/max
		if (newValue !== null) {
			if (min !== undefined && newValue < min) {
				error = `Minimum value is ${min.toLocaleString('en-IN')}`;
			} else if (max !== undefined && newValue > max) {
				error = `Maximum value is ${max.toLocaleString('en-IN')}`;
			} else {
				error = null;
			}
		}

		if (Array.isArray(placeholder)) {
			const currentValue: (number | null)[] = Array.isArray(value)
				? structuredClone(value)
				: placeholder.map(() => null);

			if (index !== undefined) {
				currentValue[index] = newValue;
			}
			value = currentValue as number[]; // Update bindable for two-way binding
			onInput(currentValue as number[] | null);
		} else {
			value = newValue; // Update bindable for two-way binding
			onInput(newValue);
		}
	}

	const isMultiInput = $derived(Array.isArray(placeholder));

	function toPascalCase(str: string) {
		return str.replace(/(^\w|-\w)/g, (s) => s.replace('-', '').toUpperCase());
	}

	function resolveIcon(entry: string | null | undefined) {
		if (!entry) return null;
		if (typeof entry !== 'string') return entry;
		const key = toPascalCase(entry);
		return getIcon(key) ?? null;
	}

	const resolvedIcon = $derived(resolveIcon(icon));
	const resolvedIcons = $derived(icons.map((i) => resolveIcon(i)));

	function handleFocus(index?: number) {
		isFocused = true;
		focusedIndex = index ?? null;
	}

	function handleBlur(event?: Event) {
		isFocused = false;
		focusedIndex = null;

		// Clean up leading zeros on blur — safe to strip now that user is done editing
		if (event?.target) {
			const target = event.target as HTMLInputElement;
			let rawVal = getRawNumber(target.value);
			rawVal = rawVal.replace(/^0+/, '') || '';
			const formatted = formatIndian ? formatIndianNumber(rawVal) : rawVal;
			if (target.value !== formatted) {
				target.value = formatted;
			}
		}
	}
</script>

<div class={`${numberClass} flex w-full flex-col`}>
	<label for={id} class="label-modern">
		{label}
		{#if required}
			<span class="label-required">*</span>
		{/if}
		{#if description}
			<DescriptionTooltip {description} />
		{/if}
	</label>

	{#if isMultiInput}
		<div class="space-y-3">
			{#each placeholder as ph, i}
				{@const ResolvedIcon = resolvedIcons[i]}
				{@const itemHasValue = Array.isArray(value) && value[i] !== null && value[i] !== undefined}
				<div class="group relative">
					{#if ResolvedIcon}
						<div
							class="input-icon-wrapper {focusedIndex === i
								? 'input-icon-wrapper-primary'
								: itemHasValue
									? 'input-icon-wrapper-completed'
									: ''}"
						>
							<ResolvedIcon
								class="input-icon {itemHasValue ? 'text-white dark:text-gray-900' : ''}"
							/>
						</div>
					{/if}
					<input
						id={i === 0 ? id : `${id}_${i}`}
						type="text"
						inputmode="numeric"
						value={getDisplayValue(value, i)}
						{disabled}
						{required}
						placeholder={ph}
						oninput={(e) => handleInput(e, i)}
						onfocus={() => handleFocus(i)}
						onblur={(e) => handleBlur(e)}
						class="input-modern inputText
							{ResolvedIcon ? 'input-modern-with-icon' : ''}
							{error ? 'input-error' : ''}
							{disabled ? 'cursor-not-allowed opacity-60' : ''}"
					/>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Unit input: unit label in icon-wrapper position, CustomSelect modal on click -->
		{#if showUnitDropdown}
			{@const hasValue = value !== null && value !== undefined && value !== 0}
			<div class="group relative">
				<!-- Unit label in icon-wrapper position — clickable to change unit -->
				<button
					type="button"
					onclick={() => {
						unitPickerOpen = true;
					}}
					class="input-icon-wrapper {isFocused
						? 'input-icon-wrapper-primary'
						: hasValue
							? 'input-icon-wrapper-completed'
							: ''}"
					style="cursor: pointer; width: 3.5rem;"
					title="Click to change unit"
				>
					<span
						class="text-[10px] font-bold {hasValue
							? 'text-white dark:text-gray-900'
							: 'text-gray-400 dark:text-gray-500'}">{unit ? unit.replace('Sq. ', '') : 'Ft.'}</span
					>
				</button>
				<input
					{id}
					type="text"
					inputmode="numeric"
					value={getDisplayValue(value)}
					{disabled}
					{required}
					placeholder={Array.isArray(placeholder) ? placeholder[0] : placeholder}
					oninput={(e) => handleInput(e)}
					onfocus={() => handleFocus()}
					onblur={(e) => handleBlur(e)}
					class="input-modern inputText input-modern-with-icon
						{error ? 'input-error' : ''}
						{disabled ? 'cursor-not-allowed opacity-60' : ''}"
				/>
			</div>
			<!-- CustomSelect modal for unit selection — same popup as all other selects -->
			{#if unitPickerOpen}
				<div class="mt-2">
					<CustomSelect
						id="{id}-unit"
						options={unitOptions}
						value={unit}
						onChange={(val) => {
							unit = String(val);
							onUnitChange(String(val));
							unitPickerOpen = false;
						}}
					/>
				</div>
				<!-- Tap outside closes -->
				<button
					type="button"
					class="fixed inset-0 z-30 cursor-default border-none bg-transparent"
					onclick={() => {
						unitPickerOpen = false;
					}}
					aria-label="Close unit picker"
					tabindex="-1"
				></button>
			{/if}
		{:else}
			<!-- Standard number input (no unit dropdown) -->
			<div class="group relative">
				{#if resolvedIcon}
					{@const ResolvedIcon = resolvedIcon}
					{@const hasValue =
						value !== null &&
						value !== undefined &&
						(Array.isArray(value) ? value[0] !== null : true)}
					<div
						class="input-icon-wrapper {isFocused
							? 'input-icon-wrapper-primary'
							: hasValue
								? 'input-icon-wrapper-completed'
								: ''}"
					>
						<ResolvedIcon class="input-icon {hasValue ? 'text-white dark:text-gray-900' : ''}" />
					</div>
				{/if}

				<input
					{id}
					type="text"
					inputmode="numeric"
					value={getDisplayValue(value)}
					{disabled}
					{required}
					placeholder={Array.isArray(placeholder) ? placeholder[0] : placeholder}
					oninput={(e) => handleInput(e)}
					onfocus={() => handleFocus()}
					onblur={(e) => handleBlur(e)}
					class="input-modern inputText
					{resolvedIcon ? 'input-modern-with-icon' : ''}
					{error ? 'input-error' : ''}
					{disabled ? 'cursor-not-allowed opacity-60' : ''}"
				/>
			</div>
		{/if}
	{/if}

	<!-- Error Message -->
	{#if error}
		<div role="alert" class="error-message">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>
