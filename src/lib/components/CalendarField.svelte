<script lang="ts">
	/**
	 * CalendarField — Date input component
	 * ═══════════════════════════════════════════════════════════════════
	 * A lightweight date picker that wraps the native HTML date input.
	 * Styled to match the existing input-modern design system.
	 *
	 * Used by IncomeSourceForm for calendar-type specifics questions
	 * (e.g., GST registration date, practice start date).
	 *
	 * Props mirror the pattern used by TextField/RadioField:
	 *   - id, label, value, required, error, onInput
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { Calendar, AlertCircle } from '$lib/utils/iconRegistry';

	interface Props {
		/** Unique field identifier */
		id: string;
		/** Display label */
		label: string;
		/** Date value in YYYY-MM-DD format (bindable) */
		value?: string;
		/** Whether the field is required */
		required?: boolean;
		/** Error message to display */
		error?: string | null;
		/** Minimum date (YYYY-MM-DD) */
		min?: string;
		/** Maximum date (YYYY-MM-DD) */
		max?: string;
		/** Whether the field is disabled */
		disabled?: boolean;
		/** Callback when value changes */
		onInput?: (value: string) => void;
	}

	let {
		id,
		label,
		value = $bindable(''),
		required = false,
		error = $bindable(null),
		min = undefined,
		max = undefined,
		disabled = false,
		onInput
	}: Props = $props();

	let isFocused = $state(false);

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		onInput?.(target.value);
	}

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur() {
		isFocused = false;
	}
</script>

<div class="flex w-full flex-col">
	<!-- Label -->
	<label for={id} class="text-labelText mb-1.5 text-[var(--form-text-secondary)]">
		{label}
		{#if required}
			<span class="label-required">*</span>
		{/if}
	</label>

	<!-- Input with icon -->
	<div class="group relative">
		<div class="input-icon-wrapper {isFocused ? 'input-icon-wrapper-primary' : ''}">
			<Calendar class="input-icon" />
		</div>

		<input
			{id}
			name={id}
			type="date"
			bind:value
			{min}
			{max}
			{disabled}
			{required}
			onchange={handleChange}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="input-modern input-modern-with-icon inputText
				{error ? 'input-error' : ''}
				{disabled ? 'cursor-not-allowed opacity-60' : ''}"
		/>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="error-message">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>
