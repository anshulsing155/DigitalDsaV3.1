<script lang="ts">
	import { getIcon, Check } from '$lib/utils/iconRegistry';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { formState } from '$lib/state/form.svelte';
	import WhyAskedHint from './WhyAskedHint.svelte';

	interface QuestionOption {
		label: string;
		value: string;
		icon?: string;
		description?: string;
		showWhen?: any;
	}

	interface Props {
		error?: string;
		required?: boolean;
		showValidationErrors?: boolean;
		questionLabel?: string;
		name: string;
		onChange: (value: string) => void;
		question: {
			key: string;
			options: QuestionOption[];
		};
		selected: string;
		containerClass?: string;
		/** Explains WHY this question is asked — from lender perspective */
		whyAsked?: string;
	}

	let {
		error = '',
		required = false,
		showValidationErrors = true,
		questionLabel = '',
		name,
		onChange,
		question,
		selected = $bindable(''),
		containerClass = '',
		whyAsked = ''
	}: Props = $props();
</script>

<div class={`w-full ${containerClass}`}>
	{#if questionLabel}
		<label for="" class="text-labelText mb-1 block">
			{questionLabel}
		</label>
		{#if whyAsked}
			<div class="mb-2">
				<WhyAskedHint text={whyAsked} />
			</div>
		{/if}
	{/if}

	<div class="grid w-full grid-cols-2 gap-2 md:gap-4">
		{#each question.options as opt}
			{#if shouldShow(opt.showWhen, formState.applicationData)}
				{@const isSelected = selected === opt.value}
				{@const OptIcon = opt.icon ? getIcon(opt.icon) : undefined}
				<label class="w-full cursor-pointer">
					<input
						type="radio"
						{name}
						value={opt.value}
						bind:group={selected}
						class="peer sr-only"
						onchange={() => onChange(opt.value)}
					/>

					<div
						class={`buttonText relative flex w-full items-center justify-center gap-3 rounded-lg
						border px-1.5 py-1.5 transition-all duration-200
						peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2
						${
							isSelected
								? 'radio-icon-selected border-transparent'
								: error && showValidationErrors
									? 'border-red-500 bg-red-50 dark:bg-red-900/20'
									: 'border-gray-300 hover:border-primary/50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
						}`}
					>
						<!-- Option icon -->
						{#if OptIcon}
							<div class={isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>
								<OptIcon size={18} />
							</div>
						{/if}

						<!-- Label + description -->
						<div class="flex min-w-0 flex-1 flex-col">
							<p class={isSelected ? 'font-medium text-white' : 'text-gray-700 dark:text-gray-300'}>
								{opt.label}
							</p>
							{#if opt.description}
								<p
									class={`mt-0.5 text-xs leading-tight whitespace-pre-line ${isSelected ? 'text-white/75' : 'text-gray-400 dark:text-gray-500'}`}
								>
									{opt.description}
								</p>
							{/if}
						</div>

						<!-- Selected tick -->
						{#if isSelected}
							<div class="shrink-0 text-white">
								<Check size={15} strokeWidth={3} />
							</div>
						{/if}
					</div>
				</label>
			{/if}
		{/each}
	</div>

	{#if error && showValidationErrors}
		<p class="mt-2 flex items-start gap-1 text-sm text-red-600">
			<span>•</span>
			<span>{error}</span>
		</p>
	{/if}
</div>

<style>
	.radio-icon-selected {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	}
</style>
