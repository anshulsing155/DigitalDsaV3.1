<script lang="ts">
	import { AlertCircle } from '$lib/utils/iconRegistry';

	interface Props {
		id: string;
		label: string;
		description?: string;
		value?: string;
		error?: string | null;
		rows?: number;
		disabled?: boolean;
		required?: boolean;
		placeholder?: string;
		maxlength?: number;
		onInput?: (value: string) => void;
	}

	let {
		id,
		label,
		description = undefined,
		value = $bindable(),
		error = null,
		rows = 4,
		disabled = false,
		required = false,
		placeholder = '',
		maxlength = undefined,
		onInput = () => {}
	}: Props = $props();

	let isFocused = $state(false);
	let charCount = $derived(value?.length || 0);

	function handleInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		onInput(target.value);
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

	{#if description}
		<p class="mb-2 text-sm text-[var(--form-text-secondary)]">{description}</p>
	{/if}

	<div class="relative">
		<textarea
			{id}
			bind:value
			{rows}
			{disabled}
			{required}
			{placeholder}
			{maxlength}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			class="inputText focus:border-trial-accent focus:shadow-trial-accent min-h-[100px] w-full resize-y rounded-2xl
				border-2 border-[var(--form-border)] bg-[var(--form-bg-input)] px-4 py-3.5 text-[var(--form-text)]
				transition-all duration-300
				ease-out outline-none
				hover:border-[var(--form-border-hover,var(--form-border))] hover:shadow-sm focus:bg-[var(--form-bg-card)] focus:shadow-lg
				{error ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:shadow-red-500/10' : ''}
				{disabled ? 'cursor-not-allowed bg-[var(--form-bg-alt)] opacity-60' : ''}"
		></textarea>

		<!-- Character Count -->
		{#if maxlength}
			<div class="absolute right-3 bottom-3 text-xs text-[var(--form-text-muted)]">
				<span class={charCount > maxlength * 0.9 ? 'text-[#ddbea9]' : ''}>{charCount}</span
				>/{maxlength}
			</div>
		{/if}
	</div>

	<!-- Error Message -->
	{#if error}
		<div role="alert" class="error-message">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>
