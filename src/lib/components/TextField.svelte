<script lang="ts">
	import { AlertCircle, getIcon, TriangleAlert, XCircle } from '$lib/utils/iconRegistry';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { checkGibberish, type ValidationContext } from '$lib/utils/checkGibberish';
	import { inputErrorsState } from '$lib/stores/inputErrors.svelte';
	import { ToWords } from 'to-words';
	import { numberToWordsState } from '$lib/stores/numberToWords.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	// Field-ID registries — drive context-aware validation rules.
	// Entity-name fields are very permissive (allow numbers, &, dots, hyphens)
	// because legitimate company names like "AAA Industries", "5G Networks",
	// "M&A Partners", "7-Eleven" should pass without complaint.
	const ENTITY_NAME_IDS = new Set<string>([
		'entityName',
		'companyName',
		'firm_name',
		'q_builderName',
		'q_builderNameManual',
		'q_projectName',
		'q_projectNameManual',
		'q4_bankName',
		'obl_bankName',
		'q1_authorityName',
		'q6_agreementPoaNbfcName',
		'lender_name_input'
	]);

	// Person-name fields use stricter character set but with proper allowance
	// for dots (K.K. Sharma), apostrophes (O'Brien), and hyphens (Mary-Anne).
	const PERSON_NAME_IDS = new Set<string>([
		'fullName',
		'director-fullName',
		'gpa_name',
		'basic_name',
		'ob_name',
		'rm_name',
		'ri_propertyInWhoseName'
	]);

	function resolveValidationContext(fieldId: string): ValidationContext {
		if (ENTITY_NAME_IDS.has(fieldId)) return 'entity';
		if (PERSON_NAME_IDS.has(fieldId)) return 'person';
		return 'generic';
	}

	interface Props {
		helperText?: string;
		errorValue?: Record<string, any>;
		questionValue?: string | null;
		id?: string;
		label?: string;
		description?: string | null;
		value?: string | string[];
		inputFieldClass?: string;
		readonly?: boolean;
		error?: string | null;
		warning?: string | null;
		onInput?: (val: any, index?: number) => void;
		onBlur?: () => void;
		onEnter?: () => void;
		onButtonClick?: () => void;
		icon?: string | string[];
		placeholder?: string | string[];
		textFieldClass?: string;
		labelClass?: string;
		loanName?: string | string[];
		showTitleDropdown?: boolean;
		showAreaUnitDropdown?: boolean;
		areaUnit?: string;
		onUnitChange?: (val: string) => void;
		title?: string;
		onTitleChange?: (val: string) => void;
		uiType?: string;
		fieldType?: string;
		type?: string;
		getValue?: any;
		tellUsWhoIsApplying?: string;
		getLimitCheckerText?: any;
		customTitles?: string[] | null;
		disabled?: boolean;
		required?: boolean;
		modalWidth?: string;
		descriptionHeader?: string;
		descriptionText?: string;
		button?: boolean;
		buttonText?: string;
		buttonIcon?: any;
		enableNumberToWords?: boolean;
		index?: number;
		continueButton?: boolean;
		maxLength?: number;
		minLength?: number;
		minLimit?: number;
		maxLimit?: number;
		minLimitMessage?: string;
		maxLimitMessage?: string;
	}

	let {
		helperText = undefined,
		errorValue = $bindable({}),
		questionValue = null,
		id = '',
		label = '',
		labelClass = '',
		description = null,
		value = $bindable(),
		readonly = false,
		error = $bindable(null),
		warning = null,
		onInput = () => {},
		onBlur = () => {},
		onEnter = () => {},
		onButtonClick = () => {},
		icon = '',
		placeholder = '',
		textFieldClass = '',
		inputFieldClass = 'rounded-l-md rounded-r-xl',
		loanName = '',
		showTitleDropdown = false,
		showAreaUnitDropdown = false,
		areaUnit = $bindable(''),
		onUnitChange = () => {},
		title = $bindable(''),
		onTitleChange = () => {},
		uiType = 'text',
		fieldType = '',
		type = 'text',
		getValue = undefined,
		tellUsWhoIsApplying = '',
		getLimitCheckerText = undefined,
		customTitles = null,
		disabled = false,
		required = false,
		modalWidth = '',
		descriptionHeader = '',
		descriptionText = '',
		button = false,
		buttonText = '',
		buttonIcon = null,
		enableNumberToWords = false,
		index = 0,
		continueButton = true,
		maxLength = 15,
		minLength = undefined as number | undefined,
		minLimit = undefined as number | undefined,
		maxLimit = undefined as number | undefined,
		minLimitMessage = undefined as string | undefined,
		maxLimitMessage = undefined as string | undefined
	}: Props = $props();
	let asyncValue = $state<string | number | null>(null);
	let localInputError: string | null = null;
	// Soft-flag warning surfaced by the context-aware validator (see resolveValidationContext).
	// Distinct from the `warning` prop — that's parent-driven; this is internal validation feedback.
	let localInputWarning = $state<string | null>(null);
	let isAsyncValueLoading = $state(false);
	// Track if field has been blurred to show schema validation errors only after blur
	let isTouched = $state(false);
	let isFocused = $state(false);
	let allTitles = ['Mr.', 'Mrs.', 'Miss'];

	const toWords = new ToWords({
		localeCode: 'en-IN',
		converterOptions: {
			currency: false
		}
	});

	// Compute number-to-words text directly (reactive, no store dependency).
	// Also returns '' for zero / negative — "Zero" or "Minus..." aren't useful
	// helper text for typical positive-amount fields and a stale "Zero" can
	// linger after the user clears (when value is the string "0" rather than
	// the number 0, the !value falsy-check passes through).
	let computedWordsText = $derived.by(() => {
		if (!enableNumberToWords || uiType !== 'number' || !value) return '';
		const rawVal = String(value).replace(/[^0-9]/g, '');
		if (!rawVal) return '';
		const num = Number(rawVal);
		if (!Number.isFinite(num) || num <= 0) return '';
		try {
			return toWords.convert(num);
		} catch {
			return '';
		}
	});

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

	// Get raw numeric value from formatted string
	function getRawNumber(str: string): string {
		return str.replace(/[^0-9]/g, '');
	}

	// Get display value with Indian formatting for number fields
	function getDisplayValue(val: string | string[] | undefined, idx?: number): string {
		if (uiType !== 'number' || fieldType === 'percentage') {
			return Array.isArray(val) ? (val[idx ?? 0] ?? '') : (val ?? '');
		}
		const rawVal = Array.isArray(val) ? (val[idx ?? 0] ?? '') : (val ?? '');
		return formatIndianNumber(getRawNumber(String(rawVal)));
	}

	// Guard to prevent repeated async calls
	let lastGetValueRef: typeof getValue = undefined;

	$effect(() => {
		// Skip if getValue hasn't changed (prevents repeated calls on re-render)
		if (getValue === lastGetValueRef) return;
		lastGetValueRef = getValue;

		if (typeof getValue === 'function') {
			isAsyncValueLoading = true;
			getValue()
				.then((val: any) => {
					asyncValue = Math.round(val).toLocaleString('en-IN');
					isAsyncValueLoading = false;
				})
				.catch(() => {
					asyncValue = null;
					isAsyncValueLoading = false;
				});
		} else {
			asyncValue = getValue;
		}
	});

	/** Runs validation that should only happen on blur, not keystroke. */
	function validateOnBlur() {
		if (uiType === 'email') {
			const val = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
			const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
			if (val && !emailRegex.test(String(val))) {
				localInputError = 'Please enter a valid email address';
			} else {
				localInputError = null;
			}
			inputErrorsState.set(id, localInputError ?? '');
		}
	}

	function errorHandling() {
		if (questionValue) {
			if (error) {
				errorValue = { ...errorValue, [questionValue]: error };
			} else if (inputErrorsState.has(id)) {
				errorValue = { ...errorValue, [questionValue]: inputErrorsState.get(id) };
			} else if (questionValue in errorValue) {
				const { [questionValue]: _, ...rest } = errorValue;
				errorValue = rest;
			}
		}
	}

	function handleInput(event: Event, index?: number) {
		const target = event.target as HTMLInputElement;
		let val: string = target.value ?? '';

		if (uiType === 'number') {
			if (fieldType === 'percentage') {
				if (!/^\d*\.?\d{0,2}$/.test(val)) {
					localInputError = 'Value must be a number with up to 2 decimal places';
					target.value = Array.isArray(value) ? value[index ?? 0] || '' : String(value ?? '');
					return;
				} else if (val !== '') {
					const numVal = parseFloat(val);
					if (minLimit !== undefined && numVal < minLimit) {
						localInputError = minLimitMessage ?? `Minimum value is ${minLimit}%`;
					} else if (maxLimit !== undefined && numVal > maxLimit) {
						localInputError = maxLimitMessage ?? `Maximum value is ${maxLimit}%`;
					} else {
						localInputError = null;
					}
				} else {
					localInputError = null;
				}
				inputErrorsState.set(id, localInputError ?? '');
			} else {
				// Get cursor position before formatting
				const cursorPos = target.selectionStart ?? 0;
				const oldLength = val.length;

				// Strip all non-numeric characters — keep leading zeros during editing
				let rawVal = getRawNumber(val);

				// Enforce max length on raw digits (default 15 digits = 999,99,99,99,99,999)
				if (rawVal.length > maxLength) {
					rawVal = rawVal.slice(0, maxLength);
				}

				// Mid-edit guard: if all digits are zero, don't update —
				// keep display as-is and let user type the new first digit
				const numericVal = Number(rawVal);
				if (numericVal === 0 && rawVal.length > 1) {
					target.value = rawVal;
					requestAnimationFrame(() => {
						target.setSelectionRange(cursorPos, cursorPos);
					});
					return;
				}

				// Format with Indian commas
				const formatted = formatIndianNumber(rawVal);

				// Update display value
				target.value = formatted;

				// Calculate new cursor position
				const newLength = formatted.length;
				const lengthDiff = newLength - oldLength;
				let newCursorPos = cursorPos + lengthDiff;

				// Ensure cursor doesn't go negative or beyond length
				newCursorPos = Math.max(0, Math.min(newCursorPos, newLength));

				// Set cursor position after a microtask to ensure DOM update
				requestAnimationFrame(() => {
					target.setSelectionRange(newCursorPos, newCursorPos);
				});

				// Min/max validation for currency/number fields (skip if empty)
				if (rawVal !== '') {
					const numericVal = Number(rawVal);
					if (minLength !== undefined && rawVal.length < minLength) {
						localInputError = `Please enter at least ${minLength} digits`;
					} else if (minLimit !== undefined && numericVal < minLimit) {
						localInputError =
							minLimitMessage ?? `Minimum amount is ₹${formatIndianNumber(String(minLimit))}`;
					} else if (maxLimit !== undefined && numericVal > maxLimit) {
						localInputError =
							maxLimitMessage ?? `Maximum amount is ₹${formatIndianNumber(String(maxLimit))}`;
					} else {
						localInputError = null;
					}
				} else {
					localInputError = null;
				}
				inputErrorsState.set(id, localInputError ?? '');

				// Store raw value (without commas) for data
				val = rawVal;
			}
		} else if (uiType === 'email') {
			// Email validation deferred to blur â€” clear stale error while typing
			if (localInputError) {
				localInputError = null;
				inputErrorsState.set(id, '');
			}
		} else if (fieldType === 'pincode') {
			// Pincode: digits only, max 6
			val = val.replace(/[^0-9]/g, '');
			if (val.length > 6) val = val.slice(0, 6);
			target.value = val;
			localInputError = null;
			inputErrorsState.set(id, '');
		} else if (
			uiType === 'text' &&
			id !== 'q4_GSTNumber' &&
			id !== 'address' &&
			id !== 'q_creditScore'
		) {
			// Field-aware validation. Person/entity contexts have permissive rules
			// that allow legitimate Indian names (K.K. Sharma, O'Brien, Mary-Anne)
			// and company names (AAA Industries, 5G Networks, M&A Partners).
			// Generic context preserves the legacy strip-and-reject behaviour.
			const context = resolveValidationContext(id);
			const result = checkGibberish(val.trim(), context);

			if (context === 'generic' && result.severity === 'block') {
				// Legacy generic-context behaviour: strip non-letter chars from the
				// input as the user types. Person/entity contexts skip this — the
				// user's input stays intact and the error message tells them why.
				const cleaned = val.replace(/[^A-Za-z\s]/g, '');
				if (cleaned !== val) {
					target.value = cleaned;
					val = cleaned;
				}
			}

			if (result.severity === 'block') {
				localInputError = result.reason;
				localInputWarning = null;
			} else if (result.severity === 'warn') {
				localInputError = null;
				localInputWarning = result.reason;
			} else {
				localInputError = null;
				localInputWarning = null;
			}
			inputErrorsState.set(id, localInputError ?? '');
		}

		// Update either array or single value
		if (Array.isArray(placeholder)) {
			const currentValue = Array.isArray(value)
				? [...value]
				: new Array(placeholder.length).fill('');
			if (typeof index === 'number') currentValue[index] = val;
			onInput(currentValue, index);
		} else {
			onInput(val);
		}

		errorHandling();
	}

	function handleTyping(event: Event, index?: number) {
		const target = event.target as HTMLInputElement;
		let val = target.value ?? '';

		// ---- ONLY number-to-words here ----
		if (uiType === 'number' && enableNumberToWords) {
			const num = Number(val);
			if (!isNaN(num) && val !== '') {
				numberToWordsState.set(id, toWords.convert(num));
			} else {
				numberToWordsState.set(id, '');
			}
		}

		// DO NOT run validation here
		// DO NOT update inputErrors here
		// DO NOT call onInput here
	}

	const areaOptions = [
		{ value: 'Feet', label: 'Sq. Ft.' },
		{ value: 'Meter', label: 'Sq. Mt.' },
		{ value: 'Yard', label: 'Sq. Yd.' }
	];

	let filteredTitles = $derived.by(() => {
		return allTitles.filter((t) => {
			// normalize loanName into array
			const loanNames = Array.isArray(loanName) ? loanName : [loanName];

			// convert to lowercase for comparison
			const loanNamesLower = loanNames.map((ln) => ln.toLowerCase());

			// check if any loan name matches the filter condition
			const removeTitles = ['home loan', 'plot loan', 'lap'];
			if (
				loanNamesLower.some((ln) => removeTitles.includes(ln) && tellUsWhoIsApplying === 'Couple')
			) {
				return t !== 'Miss';
			}

			return true;
		});
	});

	let showTitles = $derived(customTitles ?? filteredTitles);

	let isMultiInput = $derived(Array.isArray(placeholder));

	let iconsArray = $derived(
		Array.isArray(icon)
			? icon.map((ic) => (ic ? toPascalCase(ic) : ''))
			: placeholder && Array.isArray(placeholder)
				? new Array(placeholder.length).fill('')
				: [icon ? toPascalCase(icon) : '']
	);

	function handleTitleChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onTitleChange(target.value);
	}

	function handleUnitChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		onUnitChange(target.value);
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

	function handleButtonClick() {
		onButtonClick();
	}
</script>

{#if continueButton}
	<div class={`${textFieldClass} flex w-full flex-col`}>
		<label
			for={id}
			class={`text-labelQuestion ${labelClass} ${
				(value == null || value === '') && formState.applicationData.checkUnsecureData
					? 'text-stone-700'
					: ''
			}`}
		>
			{@html sanitizeHtml(label)}
			{#if required}
				<span class="label-required">*</span>
			{/if}
			{#if description}
				<DescriptionTooltip {description} {modalWidth} />
			{/if}
			{#if descriptionHeader}
				<p class="smallText mt-1 mb-3 text-[var(--form-text-label)]">
					{@html sanitizeHtml(descriptionHeader)}
				</p>
			{/if}
			{#if descriptionText}
				<DescriptionTooltip {description} {modalWidth} {descriptionText} />
			{/if}
		</label>

		{#if isMultiInput}
			<div class="space-y-2">
				{#each placeholder as ph, i}
					<div class="relative flex w-full flex-row justify-between overflow-hidden rounded-md">
						{#if iconsArray[i] && getIcon(iconsArray[i])}
							{@const ArrayIcon = getIcon(toPascalCase(iconsArray[i]))}
							{@const hasValue = Array.isArray(value) ? value[i] && value[i] !== '' : false}
							<div
								class="absolute left-0 flex h-full w-8 items-center justify-center rounded-l-md transition-all duration-300
								{isFocused ? 'icon-focused' : hasValue ? 'icon-filled' : 'icon-empty'}"
							>
								<ArrayIcon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
							</div>
						{/if}
						<input
							type="text"
							inputmode={uiType === 'number' || fieldType === 'pincode' ? 'numeric' : 'text'}
							id={i === 0 ? id : `${id}_${i}`}
							name={`${id}_${i}`}
							value={getDisplayValue(value, i)}
							placeholder={ph}
							{readonly}
							{disabled}
							onfocus={() => {
								isTouched = false; // Hide errors when user starts editing
							}}
							onblur={() => {
								isTouched = true;
								validateOnBlur();
								onBlur();
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									isTouched = true;
									onEnter();
								}
							}}
							onfocusout={(e) => {
								isTouched = true;
								handleTyping(e, i);
							}}
							oninput={(e) => handleInput(e, i)}
							class={`text-labelText !m-0 w-full rounded-l-md rounded-r-xl ${inputFieldClass} border
							${value && value !== '' ? 'border-[var(--ddsa-primary-500)]' : 'border-[var(--form-border)]'}
							bg-[var(--form-bg-card)] py-[0.8rem]
							pr-4 pl-14 text-[var(--form-text-label)] placeholder-[var(--form-text-muted)] transition-colors outline-none
							focus:border-[var(--ddsa-primary-500)]
							focus:ring-1 focus:ring-[var(--ddsa-primary-500)] ${iconsArray[i] ? 'pl-[3.5rem]' : ''} ${
								disabled || readonly
									? 'text-[var(--form-text-muted) cursor-not-allowed bg-[var(--form-bg-disabled)]'
									: ''
							}`}
						/>
					</div>
				{/each}
			</div>
		{:else}
			{#if getValue}
				<p class="smallText">
					{@html sanitizeHtml(getLimitCheckerText)}
					{isAsyncValueLoading ? 'Calculating...' : (asyncValue ?? 'â€”')}
				</p>
			{/if}
			<div class="relative flex w-full flex-row justify-between">
				{#if showTitleDropdown}
					<select
						name="title"
						aria-label="Title"
						bind:value={title}
						onchange={handleTitleChange}
						class={`inputText  icon-selected absolute top-0 h-full rounded-l-sm text-center ${
							title !== '' ? 'text-white dark:text-gray-900' : 'text-primary'
						} font-titleBold outline-none
    					${title === '' ? 'fast-pulse' : ''}`}
					>
						<option value="" disabled>??</option>
						{#each showTitles as t}
							<option value={t}>{t}</option>
						{/each}
					</select>
				{:else if showAreaUnitDropdown}
					<select
						name="area"
						aria-label="Unit"
						bind:value={areaUnit}
						onchange={handleUnitChange}
						class="inputText icon-filled absolute top-0 h-full rounded-l-sm text-center text-white outline-none dark:text-gray-900"
					>
						{#each areaOptions as option}
							<option value={option.value} class="">{option.label}</option>
						{/each}
					</select>
				{:else if IconComponent}
					{@const hasValue = value && value !== ''}
					{@const Icon = IconComponent}
					<div
						class="absolute top-0 left-0 z-10 flex h-full w-12 items-center justify-center rounded-l-md transition-all duration-200
					{isFocused ? 'icon-focused' : hasValue ? 'icon-filled' : 'icon-empty'}"
					>
						<Icon class="h-5 w-5 shrink-0 text-white dark:text-gray-900" />
					</div>
				{/if}

				<input
					{id}
					name={id}
					{type}
					inputmode={uiType === 'number' || fieldType === 'pincode' ? 'numeric' : 'text'}
					maxlength={uiType === 'email' ? 254 : uiType !== 'number' ? maxLength : undefined}
					value={getDisplayValue(value)}
					placeholder={Array.isArray(placeholder) ? placeholder[0] : placeholder}
					{readonly}
					{disabled}
					onfocus={() => {
						isTouched = false;
						isFocused = true;
					}}
					onblur={() => {
						isTouched = true;
						isFocused = false;
						validateOnBlur();
						onBlur();
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							isTouched = true;
							onEnter();
						}
					}}
					onfocusout={(e) => {
						isTouched = true;
						handleTyping(e);
					}}
					oninput={(e) => handleInput(e)}
					class={`text-labelText !m-0 w-full  ${inputFieldClass} border-2
					${value && value !== '' ? 'border-[var(--ddsa-primary-500)]' : 'border-[var(--form-border)]'}
					bg-[var(--form-bg-card)] py-[0.8rem]
					pr-4 pl-14 text-[var(--form-text-label)] placeholder-[var(--form-text-muted)] caret-[var(--ddsa-primary-500)] transition-colors
					outline-none focus:border-[var(--ddsa-primary-500)]
					focus:border-[var(--ddsa-primary-500)] focus:ring-1 focus:ring-[var(--ddsa-primary-500)]  ${
						showAreaUnitDropdown ? 'pl-[4.7rem]' : showTitleDropdown || IconComponent ? 'pl-16' : ''
					} ${disabled || readonly ? 'text-[var(--form-text-muted) cursor-not-allowed bg-[var(--form-bg-disabled)]' : ''}`}
				/>

				{#if button}
					<button
						class="gold-gradient buttonText absolute right-0 flex h-full cursor-pointer items-center gap-1 rounded px-4 text-white transition hover:opacity-90 disabled:opacity-50"
						type="button"
						onclick={handleButtonClick}
						{disabled}
					>
						{#if buttonIcon}
							{@const ButtonIcon = buttonIcon}
							<ButtonIcon class="h-5 w-5" />
						{/if}
						<span>{buttonText}</span>
					</button>
				{/if}
			</div>
		{/if}

		<div class="flex flex-col mt-1">
			{#if enableNumberToWords && computedWordsText && !inputErrorsState.get(id) && value}
				<p class="smallText pl-12 text-[var(--form-text-muted)]">
					{computedWordsText}
				</p>
			{/if}

			{#if helperText}
				<p class="smallText pl-12 text-[var(--form-text-muted)]">
					{helperText}
				</p>
			{/if}

			<!-- {#if isTouched && error}
				<p role="alert" id={id + '-error'} class="smallText pl-12 text-error">{error}</p>
			{/if} -->

			{#if error}
				<div role="alert" class="error-message">
					<XCircle class="h-5 w-5 shrink-0 text-red-500" />
					<p class="alertText text-red-600">{error}</p>
				</div>
			{/if}

			<!--
				inputErrorsState display, severity-aware:
				- Both numeric and text fields surface block-level format/range
				  errors AFTER BLUR (via isTouched). User-reported (S104): pre-S104
				  numeric fields showed "Minimum amount is ₹1,00,000" on every
				  keystroke as the user typed "1" then "2" then "3" etc., which
				  is normal incremental entry below the limit. The error firing
				  per-keystroke was hostile UX. Gating by isTouched matches the
				  text-field behavior already in place — errors appear when the
				  user leaves the field, not while they're typing into it.
				- `!error` prevents double-rendering when the parent already passes
				  an `error` prop.
			-->
			{#if uiType === 'number' && isTouched && !error && inputErrorsState.get(id)}
				<div role="alert" class="error-message">
					<XCircle class="h-5 w-5 shrink-0 text-red-500" />

					<p class="alertText text-red-600">{inputErrorsState.get(id)}</p>
				</div>
			{:else if uiType === 'text' && isTouched && !error && inputErrorsState.get(id)}
				<div role="alert" class="error-message">
					<XCircle class="h-5 w-5 shrink-0 text-red-500" />
					<p class="alertText text-red-600">{inputErrorsState.get(id)}</p>
				</div>
			{/if}

			{#if isTouched && !error && !inputErrorsState.get(id) && localInputWarning}
				<div role="status" class="warning-message">
					<TriangleAlert class="text-currentColor h-5 w-5 shrink-0" />
					<p class="alertText text-currentColor">{localInputWarning}</p>
				</div>
			{/if}

			{#if warning}
				<div role="status" class="warning-message">
					<TriangleAlert class="text-currentColor h-5 w-5 shrink-0" />
					<p class="alertText text-currentColor">{warning}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	input[type='number']::-webkit-inner-spin-button,
	input[type='number']::-webkit-outer-spin-button {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		margin: 0;
	}

	.fast-pulse {
		animation: pulse 0.5s linear infinite; /* faster than default 1.5s */
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

	.icon-selected {
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-600, #0d9488) 0%,
			var(--ddsa-primary-700, #0f766e) 100%
		);
	}
</style>
