<script lang="ts">
	import { Mail, AlertCircle, CheckCircle2 } from '$lib/utils/iconRegistry';

	interface Props {
		id?: string;
		label?: string;
		placeholder?: string;
		value?: string;
		error?: string | null;
		readonly?: boolean;
		required?: boolean;
		onInput?: (val: string) => void;
	}

	let {
		id = 'email',
		label = 'Email',
		placeholder = 'Enter email address',
		value = $bindable(),
		error = $bindable(null),
		readonly = false,
		required = false,
		onInput = () => {}
	}: Props = $props();

	let localError: string | null = $state(null);
	let isFocused = $state(false);
	let isTouched = $state(false);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const val = target.value;
		// Clear stale error while user is still typing
		if (localError) localError = null;
		onInput(val);
	}

	function handleFocus() {
		isFocused = true;
		isTouched = false;
	}

	function handleBlur() {
		isFocused = false;
		isTouched = true;
		// Validate on blur — not during typing
		const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		localError = value && !regex.test(value) ? 'Please enter a valid email address' : null;
	}

	let hasError = $derived(isTouched && (error || localError));
	let isValid = $derived(isTouched && value && !hasError);
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
			<Mail class="input-icon" />
		</div>

		<input
			{id}
			type="email"
			{placeholder}
			{value}
			{readonly}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="input-modern input-modern-with-icon inputText
				{hasError ? 'input-error' : ''}
				{isValid ? 'input-success' : ''}
				{readonly ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}"
			aria-describedby={hasError ? id + '-error' : undefined}
			aria-invalid={hasError ? 'true' : 'false'}
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
		<div class="error-message" id="{id}-error">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error || localError}</span>
		</div>
	{/if}
</div>
