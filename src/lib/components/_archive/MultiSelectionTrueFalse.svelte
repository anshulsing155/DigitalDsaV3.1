<script lang="ts">
	import { onMount } from 'svelte';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { formState } from '$lib/state/form.svelte';
	import jsonLogic from 'json-logic-js';

	type Option = {
		label: string;
		value: string;
		optionsDescription?: string;
		showWhen?: unknown;
	};

	interface Props {
		questionId: string | number;
		applicantIndex: number;
		allQuestions: Record<string, any>;
		checkAllAnswerIsFill?: boolean;
		selectedAnswers?: Record<string, boolean>;
		continueBtn?: boolean;
		label?: string;
	}

	let {
		questionId,
		applicantIndex,
		allQuestions,
		checkAllAnswerIsFill = $bindable(false),
		selectedAnswers = $bindable({}),
		continueBtn = true,
		label = undefined
	}: Props = $props();

	let labelHeader: string = $state('');
	let descriptionHeader: string = $state('');
	let visibleOptions: Option[] = $state([]);
	let description: string = $state('');
	let checkSomeValueIsFill: boolean = $state(false);
	let checkMissingData: boolean = $state(false);
	let validationActive: boolean = $state(false);
	let allOptions: Option[] = $state([]);
	let applicant: any = $state([]);
	let unSelectedOptions: string[] = $state([]);

	$effect(() => {
		applicant = structuredClone(formState.applicants[applicantIndex]);
	});

	function getVisibleBusinessOptions(allOptions: Option[], questionId: string | number): Option[] {
		if (questionId === 'q_businessActivityDetails') {
			return allOptions
				.filter((opt: Option) => {
					if (!opt.showWhen) return true;

					const context = {
						selectedAge: applicant?.selectedAge,
						selectedBusinessType: applicant?.selectedBusinessType,
						employmentType: applicant?.employmentType,
						...applicant?.businessActivityDetails,
						businessActivityDetails: applicant?.businessActivityDetails
					};

					try {
						return jsonLogic.apply(opt.showWhen, context);
					} catch (e) {
						console.error('JsonLogic error:', e);
						return true;
					}
				})
				.map((opt: Option) => ({
					label: opt.label,
					value: opt.value,
					optionsDescription: opt.optionsDescription
				}));
		} else {
			return allOptions.map((opt: Option) => ({
				label: opt.label,
				value: opt.value,
				optionsDescription: opt.optionsDescription
			}));
		}
	}

	$effect(() => {
		if (formState.applicants[applicantIndex].employmentType) {
			visibleOptions = getVisibleBusinessOptions(allOptions, questionId);
			visibleOptions = [...visibleOptions];
		}
	});

	onMount(() => {
		if (allQuestions && Object.keys(allQuestions).length > 0) {
			labelHeader = allQuestions.question;
			descriptionHeader = allQuestions.descriptionHeader;
			allOptions = allQuestions.options;
			visibleOptions = getVisibleBusinessOptions(allOptions, questionId);
			visibleOptions = [...visibleOptions];
			description = allQuestions.description;
		}

		if (selectedAnswers && Object.keys(selectedAnswers).length > 0) {
			continueButton();
		}
	});

	function selectionValue(value: boolean, key: string) {
		unSelectedOptions = [];
		checkMissingData = false;
		validationActive = false;
		checkAllAnswerIsFill = false;
		visibleOptions = getVisibleBusinessOptions(allOptions, questionId);
		visibleOptions = [...visibleOptions];
		if (selectedAnswers[key] === value) {
			return;
		} else {
			selectedAnswers = {
				...selectedAnswers,
				[key]: value
			};
		}
	}

	// function continueButton() {
	// 	validationActive = true;
	// 	if (Object.keys(selectedAnswers).length > 0) {
	// 		let visibleKey = visibleOptions.map((item) => item.value);
	// 		let selectedAnswerKey = Object.keys(selectedAnswers || {});
	// 		const allVisibleSelected = (visibleKey, selectedAnswerKey) =>
	// 			Array.isArray(visibleKey) &&
	// 			Array.isArray(selectedAnswerKey) &&
	// 			visibleKey.every((key) => selectedAnswerKey.includes(key));

	// 		checkAllAnswerIsFill = allVisibleSelected(visibleKey, selectedAnswerKey);
	// 	} else {
	// 		checkAllAnswerIsFill = false;
	// 		checkMissingData = true;
	// 	}
	// 	unSelectedOptions = visibleOptions
	// 		.filter((item) => !selectedAnswers[item.value])
	// 		.map((item) => item.value);
	// }
	function continueButton() {
		validationActive = true;

		if (Object.keys(selectedAnswers).length > 0) {
			let visibleKey = visibleOptions.map((item) => item.value);
			let selectedAnswerKey = Object.keys(selectedAnswers || {});

			const allVisibleSelected = (visibleKey: string[], selectedAnswerKey: string[]) =>
				Array.isArray(visibleKey) &&
				Array.isArray(selectedAnswerKey) &&
				visibleKey.every((key: string) => selectedAnswerKey.includes(key));

			checkAllAnswerIsFill = allVisibleSelected(visibleKey, selectedAnswerKey);
		} else {
			checkAllAnswerIsFill = false;
			checkMissingData = true;
		}

		// ✅ Find all unselected options
		unSelectedOptions = visibleOptions
			.filter((item) => selectedAnswers[item.value] === undefined)
			.map((item) => item.value);

		// ✅ Scroll to first unselected option
		if (unSelectedOptions.length > 0) {
			const firstUnselected = document.getElementById(
				`option-${applicantIndex}-${unSelectedOptions[0]}`
			);
			if (firstUnselected) {
				firstUnselected.scrollIntoView({
					behavior: 'smooth',
					block: 'center'
				});
			}
		}
	}
</script>

{#if continueBtn}
	<div>
		<div class={`mt-8 flex w-full flex-col gap-1 md:mt-12 md:gap-2`}>
			<label for="" class="labelText mb-1 block text-black">
				{labelHeader}
				{#if description}
					<DescriptionTooltip {description} />
				{/if}
				{#if descriptionHeader}
					<p class="smallText mt-1">{@html descriptionHeader}</p>
				{/if}
			</label>

			<div
				class="flex flex-col overflow-hidden rounded-md border border-grayTwo bg-[var(--form-bg-card)]"
			>
				<div class="buttonText sticky top-0 z-10 bg-primary py-2 text-center text-black">
					Answer all the {visibleOptions.length} statements <br />
					{#if Object.keys(selectedAnswers).filter( (key) => visibleOptions.some((opt) => opt.value === key) ).length > 0}
						<span class="smallText">
							{Object.keys(selectedAnswers).filter((key) =>
								visibleOptions.some((opt) => opt.value === key)
							).length} of {visibleOptions.length} statements answered</span
						>
					{/if}
				</div>
				<div class="flex max-h-80 flex-col gap-2 overflow-y-auto px-2 py-2 md:px-3">
					{#each visibleOptions as option (option.value)}
						<div
							id={`option-${applicantIndex}-${option.value}`}
							class="inputText relative flex w-full items-center justify-between gap-4 rounded-md border border-gray-300 bg-[var(--form-bg-card)] px-2 py-1 hover:border-primary hover:bg-primary/5 md:p-2
                        {validationActive && unSelectedOptions?.includes(option.value)
								? 'border-red-300 ring-[0.02rem] ring-red-300'
								: ''}
		{selectedAnswers[option.value] !== undefined ? 'border-green-500' : ''}"
						>
							<div class="flex flex-col">
								<span>{option.label}</span>
								<span class="smallText text-gray-600">{option.optionsDescription}</span>
							</div>
							<div class=" flex gap-2">
								<button
									onclick={() => {
										selectionValue(true, option.value);
									}}
									class=" h-10 w-10 rounded-md border border-gray-300 {selectedAnswers[
										option.value
									] !== undefined && selectedAnswers[option.value] === true
										? 'bg-green-500 '
										: ''}"
								>
									<span class="flex items-center justify-center">✓</span></button
								>
								<button
									onclick={() => selectionValue(false, option.value)}
									class="h-10 w-10 rounded-md border border-gray-300
                                    {selectedAnswers[option.value] !== undefined &&
									selectedAnswers[option.value] === false
										? 'bg-red-500 p-1'
										: ''}"
								>
									<span class="flex items-center justify-center">✕</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="flex items-center justify-end gap-4">
				{#if validationActive}
					{#if checkAllAnswerIsFill}
						<p class="text-sm font-medium text-green-600">✓ All questions answered</p>
					{:else}
						<p class="text-sm font-medium text-stone-600">
							Please answer remaining {visibleOptions.length -
								Object.keys(selectedAnswers).filter((key) =>
									visibleOptions.some((opt) => opt.value === key)
								).length} questions in this category
						</p>
					{/if}
				{:else if checkSomeValueIsFill && validationActive}
					<p>Options change click here to continue</p>
				{/if}
				<button
					type="button"
					class="buttonText rounded-md px-4 py-2 text-white hover:brightness-90 disabled:opacity-50"
					class:bg-green-500={checkAllAnswerIsFill}
					class:bg-primary={!checkAllAnswerIsFill}
					onclick={continueButton}
				>
					Continue
				</button>
			</div>

			<!-- {#if error}
			<p class="smallText mt-1 text-error">{error}</p>
		{/if} -->
		</div>
	</div>

	<style>
		::-webkit-scrollbar {
			height: 6px;
			width: 6px;
		}
		::-webkit-scrollbar-track {
			background: transparent;
		}
		::-webkit-scrollbar-thumb {
			background: linear-gradient(90deg, #ddbea9, #e3cab9);
			border-radius: 4px;
			transition: all 0.3s ease;
		}
		::-webkit-scrollbar-thumb:hover {
			background: linear-gradient(90deg, #ddbea9, #e3cab9);
			box-shadow: 0 0 6px rgba(221, 190, 169, 0.6);
		}
		* {
			scrollbar-width: thin;
			scrollbar-color: #ddbea9 transparent;
		}
	</style>
{/if}
