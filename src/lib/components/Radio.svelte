<script lang="ts">
	import { getIcon, CircleCheck, Circle, XCircle, AlertTriangle } from '$lib/utils/iconRegistry';

	import DescriptionTooltip from './DescriptionTooltip.svelte';

	type Option = {
		label: string | { var: string };
		value: string | number;
		icon?: string;
		color?: string;
		selectedColor?: string;
	};

	interface Props {
		id?: string;
		optionContainerClass?: string;
		radioClass?: string;
		labelClass?: string;
		name?: string;
		label?: string;
		description?: string;
		options?: Option[];
		value?: string | number;
		error?: string | null;
		warning?: string | null;
		onChange?: (value: string | number) => void;
		getOptionValue?: (opt: Option) => string | number;
		getOptionLabel?: (opt: Option) => string;
		selectedClass?: string;
		unselectedClass?: string;
	}

	let {
		id = '',
		optionContainerClass = '',
		radioClass = '',
		labelClass = '',
		name = '',
		label = 'Select an Option',
		description = '',
		options = [],
		value = $bindable(),
		error = null,
		warning = null,
		onChange = () => {},
		getOptionValue = (opt: Option) => opt.value,
		getOptionLabel = (opt: Option) =>
			typeof opt.label === 'object' && (opt.label as { var: string }).var
				? (opt.label as { var: string }).var
				: (opt.label as string),
		selectedClass = 'bg-primary text-white border-primary shadow-md shadow-primary/50',
		unselectedClass = 'border-[var(--form-border)] bg-[var(--form-bg-card)] text-[var(--form-text)] hover:border-primary/90 hover:shadow-sm transition-all duration-200 ease-in-out hover:text-primary/70'
	}: Props = $props();

	let isTouched = $state(false);

	function handleChange(optValue: string | number) {
		isTouched = true;
		onChange(optValue);
	}
</script>

<div class={`${radioClass} flex flex-col gap-4`}>
	<label for={id} class="text-labelText block text-[var(--form-text)] {labelClass}">
		{label}
		{#if description}
			<DescriptionTooltip {description} />
		{/if}
	</label>

	<div class={optionContainerClass || 'flex flex-col gap-3'}>
		{#each options as opt (getOptionValue(opt))}
			<label
				class={`
          radioLabel relative flex cursor-pointer items-center gap-4 rounded-md 
          border px-5 py-3  
          ${value === getOptionValue(opt) ? selectedClass : unselectedClass}
        `}
			>
				<input
					type="radio"
					{name}
					value={getOptionValue(opt)}
					checked={value === getOptionValue(opt)}
					onchange={() => handleChange(getOptionValue(opt))}
					class="sr-only"
				/>

				{#if value === getOptionValue(opt)}
					<CircleCheck class="h-4 w-4 shrink-0 {opt.selectedColor || ''}" />
				{:else if opt.icon && getIcon(opt.icon)}
					{@const OptIcon = getIcon(opt.icon)}
					{#if OptIcon}
						<OptIcon class="h-4 w-4 shrink-0 {opt.selectedColor || ''}" />
					{/if}
				{:else}
					<Circle class="h-4 w-4 shrink-0 {opt.color || ''}" />
				{/if}

				<span class="flex-grow font-medium">
					{getOptionLabel(opt)}
				</span>
			</label>
		{/each}
	</div>

	{#if error && isTouched}
		<div
			class="alertText flex items-start gap-3 rounded-md border-l-4 border-red-500 bg-red-50 p-4"
		>
			<XCircle class="h-5 w-5 shrink-0 text-red-600" />
			<p>{error}</p>
		</div>
	{/if}

	{#if warning && isTouched}
		<div
			class="alertText flex items-start gap-3 rounded-md border-l-4 border-yellow-500 bg-yellow-50 p-4 text-yellow-800"
		>
			<AlertTriangle class="h-5 w-5 shrink-0 text-yellow-600" />
			<p class="italic">
				{warning}
			</p>
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
