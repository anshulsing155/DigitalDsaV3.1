<script lang="ts">
	import type { SvelteComponent } from 'svelte';
	import { getIcon } from '$lib/utils/iconRegistry';
	import type { Option } from '$lib/types/optionType/option';
	import DescriptionTooltip from '../DescriptionTooltip.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	interface Props {
		value?: string | number | null | undefined;
		onChange?: (value: string | number) => void;
		id: string;
		label: string;
		options?: Option[];
		error?: string | null;
		warning?: string | null;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		icon?: string;
		labelClass?: string;
		selectClass?: string;
		description?: string;
		modalWidth?: string;
	}

	let {
		value = $bindable(),
		onChange = () => {},
		id,
		label,
		options = [],
		error = null,
		warning = null,
		disabled = false,
		required = false,
		readonly = false,
		icon = '',
		labelClass = '',
		selectClass = '',
		description,
		modalWidth = ''
	}: Props = $props();

	let stringValue = $derived(value != null ? String(value) : '');

	function updateValue(e: Event) {
		const target = e.target as HTMLSelectElement;
		const match = options.find((o) => String(o.value) === target.value);
		value = match ? match.value : target.value;
		onChange(value);
	}

	function pascal(str: string) {
		return str
			.split('-')
			.map((s) => s[0].toUpperCase() + s.slice(1))
			.join('');
	}

	let IconComponent = $derived(icon ? (getIcon(pascal(icon)) ?? null) : null);
</script>

<div class={`${selectClass} flex flex-col gap-1 md:gap-2`}>
	<label for={id} class="text-labelText text-[var(--dash-text)] {labelClass}">
		{@html sanitizeHtml(label)}
		{#if description}
			<DescriptionTooltip {description} {modalWidth} />
		{/if}
	</label>

	<div class="relative">
		{#if IconComponent}
			{@const Icon = IconComponent}
			<div
				class="absolute left-0 flex h-full w-12 items-center justify-center rounded-l-md bg-[var(--dash-bg-elevated)]"
			>
				<Icon class="h-5 w-5 text-[var(--dash-text-secondary)]" />
			</div>
		{/if}

		<select
			value={stringValue}
			onchange={updateValue}
			{disabled}
			{required}
			class={`inputText w-full rounded-md border px-3 py-[0.8rem] focus:outline-none
				${IconComponent ? 'pl-14' : ''}
				${
					disabled || readonly
						? 'pointer-events-none cursor-not-allowed border-[var(--dash-border)] bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'
						: 'border-[var(--dash-border)] bg-[var(--dash-bg-card)] text-[var(--dash-text)] focus:border-primary focus:ring-2 focus:ring-primary'
				}`}
		>
			<option value="" disabled>Select an option</option>
			{#each options as o}
				<option value={String(o.value)}>{o.label}</option>
			{/each}
		</select>
	</div>

	{#if error}
		<p class="smallText pl-[3rem] text-error">{error}</p>
	{/if}

	{#if warning}
		<div
			class="smallText mt-1 rounded-md border border-primary py-3 pl-3 text-[var(--dash-text-secondary)] italic"
		>
			{warning}
		</div>
	{/if}
</div>
