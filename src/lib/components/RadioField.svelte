<script lang="ts">
	import {
		getIcon,
		XCircle,
		Circle,
		Check,
		AlertTriangle,
		CheckCircle2,
		TriangleAlert
	} from '$lib/utils/iconRegistry';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { formState } from '$lib/state/form.svelte';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	type Option = {
		label: string | { var: string };
		value: string | number;
		icon?: string;
		color?: string;
		selectedColor?: string;
		labelDescription?: string | { var: string };
	};

	interface Props {
		id?: string;
		optionContainerClass?: string;
		radioClass?: string;
		labelClass?: string;
		name?: string;
		label?: string;
		labelDescription?: string;
		description?: string;
		descriptionText?: string;
		descriptionHeader?: string;
		modalWidth?: string;
		options?: Option[];
		value?: string | number;
		error?: string | null;
		warning?: string | null;
		affirmative?: string | null;
		continueButton?: boolean;
		required?: boolean;
		onChange?: (value: string | number) => void;
		getOptionValue?: (opt: Option) => string | number;
		getOptionLabel?: (opt: Option) => string;
		getOptionLabelDescription?: (opt: Option) => string;
		selectedClass?: string;
		unselectedClass?: string;
		disabled?: boolean;
	}

	let {
		id = '',
		optionContainerClass = '',
		radioClass = '',
		labelClass = '',
		name = '',
		label = 'Select an Option',
		labelDescription = '',
		description = '',
		descriptionText = '',
		descriptionHeader = '',
		modalWidth = '',
		options = [],
		value = $bindable(),
		error = $bindable(null),
		warning = $bindable(null),
		affirmative = $bindable(null),
		continueButton = true,
		required = false,
		disabled = false,
		onChange = () => {},
		getOptionValue = (opt: Option) => opt.value,
		getOptionLabel = (opt: Option) =>
			typeof opt.label === 'object' && (opt.label as any).var
				? (opt.label as any).var
				: (opt.label as string),
		getOptionLabelDescription = (opt: Option) =>
			typeof opt.labelDescription === 'object' && (opt.labelDescription as any).var
				? (opt.labelDescription as any).var
				: (opt.labelDescription as string),
		selectedClass = '',
		unselectedClass = ''
	}: Props = $props();

	// When options count is odd and a 2-col grid is specified, fall back to single column
	// so the last item doesn't sit alone looking unbalanced
	let effectiveContainerClass = $derived(
		optionContainerClass.includes('grid-cols-2') && options.length % 2 !== 0
			? optionContainerClass.replace('md:grid-cols-2', '')
			: optionContainerClass
	);

	// Most callers pass only `id` and rely on the component to scope radios into a group.
	// Fall back to `id` when `name` isn't supplied so every <input> in this RadioField
	// shares a unique group name on the page (prevents cross-group radio bleed +
	// silences Chrome's "form field needs id or name" autofill warning).
	let effectiveName = $derived(name || id);

	function handleChange(optValue: string | number) {
		if (disabled) return;
		value = optValue; // Update bindable for two-way binding
		onChange(optValue);
	}
</script>

{#if continueButton}
	<div class={`${radioClass} flex flex-col`}>
		<!--
			Question heading. Was previously <label for={id}> but `id` referred to the
			RadioField as a whole — no <input> with that exact id existed, so the for=
			pointed nowhere (Chrome flagged it as a broken label association). Each radio
			input below now has its own id={`${id}_${value}`} for proper a11y.
		-->
		<div
			class="text-labelQuestion {(value == null || value === '') &&
			formState.applicationData.checkUnsecureData
				? 'text-labelQuestion'
				: ''} {labelClass}"
		>
			{@html sanitizeHtml(label)}
			{#if required}
				<span class="label-required">*</span>
			{/if}
			{#if description}
				<DescriptionTooltip {description} {modalWidth} {descriptionText} />
			{/if}

			{#if descriptionHeader}
				<p class="smallText text-[var(--form-text-label)] mt-1 mb-3">
					{@html sanitizeHtml(descriptionHeader)}
				</p>
			{/if}
		</div>

		<div class="flex flex-col gap-4">
			<div
				class="{effectiveContainerClass || 'flex flex-col gap-3'} {disabled
					? 'pointer-events-none cursor-not-allowed opacity-60'
					: ''}"
			>
				{#each options as opt (getOptionValue(opt))}
					{@const isSelected = value === getOptionValue(opt)}
					{@const OptionIcon = opt.icon ? getIcon(opt.icon) : null}

					<label
						class="radio-card
							{isSelected ? 'radio-card-selected' : ''}
							{disabled ? 'cursor-not-allowed' : ''}"
					>
						<input
							type="radio"
							id={`${id}_${getOptionValue(opt)}`}
							name={effectiveName}
							value={getOptionValue(opt)}
							checked={isSelected}
							onchange={() => handleChange(getOptionValue(opt))}
							class="sr-only"
						/>

						{#if OptionIcon}
							<div
								class="shrink-0 {isSelected
									? 'text-(--ddsa-accent-500)'
									: 'text-[var(--form-text-muted)]'}"
							>
								<OptionIcon class="h-5 w-5" />
							</div>
						{/if}

						<div class="flex min-w-0 grow flex-col">
							<span
								class={`text-labelText ${isSelected ? '!m-0 text-[var(--form-text-label)]' : '!m-0 text-[var(--form-text-muted)]'}`}
							>
								{@html sanitizeHtml(getOptionLabel(opt))}
							</span>
							{#if getOptionLabelDescription(opt)}
								<span class="tinyText mt-0.5 text-[var(--form-text-muted)]">
									{@html sanitizeHtml(getOptionLabelDescription(opt))}
								</span>
							{/if}
						</div>

						<div class="shrink-0">
							{#if isSelected}
								<CheckCircle2 class="h-5 w-5 text-(--ddsa-accent-500)" />
							{:else}
								<Circle class="h-5 w-5 text-[var(--form-border)]" />
							{/if}
						</div>
					</label>
				{/each}
			</div>

			<!-- Error Message -->
			{#if error}
				<div role="alert" class="error-message">
					<XCircle class="h-5 w-5 shrink-0" />
					<p class="alertText">{error}</p>
				</div>
			{/if}

			<!-- Affirmative/Warning Messages -->
			{#if affirmative}
				<div class="success-message">
					<Check class="h-5 w-5 shrink-0" />
					<p class="alertText">
						{@html sanitizeHtml(affirmative)}
					</p>
				</div>
			{/if}

			{#if warning}
				<div class="warning-message">
					<TriangleAlert class="h-5 w-5 shrink-0" />
					<p class="alertText">{warning}</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

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
