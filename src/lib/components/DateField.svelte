<script lang="ts">
	import { Calendar, AlertCircle } from '$lib/utils/iconRegistry';

	interface Props {
		id: string;
		label: string;
		value?: string;
		error?: string | null;
		min?: string | undefined;
		max?: string | undefined;
		disabled?: boolean;
		required?: boolean;
		onChange?: (value: string) => void;
	}

	let {
		id,
		label,
		value = $bindable(),
		error = $bindable(null),
		min = undefined,
		max = undefined,
		disabled = false,
		required = false,
		onChange = () => {}
	}: Props = $props();

	let isFocused = $state(false);

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onChange(target.value);
	}

	function handleFocus() {
		isFocused = true;
	}

	function handleBlur() {
		isFocused = false;
	}
</script>

<div class="flex w-full flex-col">
	<label for={id} class="label-modern">
		{label}
		{#if required}
			<span class="label-required">*</span>
		{/if}
	</label>

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
		<div role="alert" class="error-message">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>
