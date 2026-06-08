<script lang="ts">
	import { Check, AlertCircle } from '$lib/utils/iconRegistry';

	interface Props {
		id: string;
		label: string;
		checked?: boolean;
		error?: string | null;
		disabled?: boolean;
		required?: boolean;
		description?: string;
		onChange?: (checked: boolean) => void;
	}

	let {
		id,
		label,
		checked = $bindable(false),
		error = $bindable(null),
		disabled = false,
		required = false,
		description = '',
		onChange = () => {}
	}: Props = $props();

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		onChange(target.checked);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			checked = !checked;
			onChange(checked);
		}
	}
</script>

<div class="w-full">
	<label
		for={id}
		class="checkbox-modern group {checked ? 'checkbox-modern-checked' : ''} {disabled
			? 'cursor-not-allowed opacity-60'
			: 'cursor-pointer'}"
	>
		<!-- Custom Checkbox -->
		<div class="checkbox-box {checked ? 'checkbox-box-checked' : ''}">
			{#if checked}
				<Check class="animate-scale-in h-4 w-4 text-white" />
			{/if}
		</div>

		<input
			{id}
			name={id}
			type="checkbox"
			bind:checked
			{disabled}
			onchange={handleChange}
			class="sr-only"
		/>

		<!-- Label Content -->
		<div class="flex flex-col">
			<span
				class="inputText text-[var(--form-text)] {checked
					? 'font-medium text-[var(--form-text)]'
					: ''}"
			>
				{label}
				{#if required}
					<span class="ml-0.5 text-red-500">*</span>
				{/if}
			</span>
			{#if description}
				<span class="mt-0.5 text-xs text-[var(--form-text-secondary)]">{description}</span>
			{/if}
		</div>
	</label>

	<!-- Error Message -->
	{#if error}
		<div role="alert" class="error-message mt-2">
			<AlertCircle class="h-4 w-4 shrink-0" />
			<span>{error}</span>
		</div>
	{/if}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
