<script lang="ts">
	import { formState } from '$lib/state/form.svelte';
	import SwitchToggleButton from './SwitchToggleButton.svelte';
	import DescriptionTooltip from './DescriptionTooltip.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import type { Applicant } from '$lib/types/formTypes';
	import jsonLogic from 'json-logic-js';

	interface Option {
		label: string;
		value: string | number;
		showWhen?: any;
	}

	interface Props {
		id?: string;
		label?: string;
		description?: string;
		error?: string | null;
		disabled?: boolean;
		descriptionHeader?: string;
		multipleSelectClass?: string;
		applicantIndex?: number;
		allOptions?: Option[];
		bindsValue?: string;
		continueBtn?: boolean;
		applicantIsAnswered?: boolean;
	}

	let {
		id = '',
		label = '',
		description = '',
		error = null,
		disabled = false,
		descriptionHeader = '',
		multipleSelectClass = '',
		applicantIndex = 0,
		allOptions = [],
		bindsValue = '',
		continueBtn = false,
		applicantIsAnswered = $bindable(false)
	}: Props = $props();

	let visibleOptions: Option[] = $state([]);

	const optionStores = new Map<string | number, Writable<boolean | undefined>>();
	const optionUnsub = new Map<string | number, () => void>();

	// ✅ FIX: Per-applicant validation state (not shared)
	let validationActive = $state(true);

	let missingOptions = $state(new Set<string | number>());

	let applicant = $derived(formState.applicants[applicantIndex] as Applicant | undefined);

	function removeMissing(key: string | number) {
		if (missingOptions.has(key)) {
			missingOptions.delete(key);
			missingOptions = new Set(missingOptions);
		}
	}

	const handleContinue = () => {
		validationActive = true;
		validateAndMark(applicant?.[bindsValue], visibleOptions);

		formState.applicants[applicantIndex].validationActive = validationActive;

		applicantIsAnswered = missingOptions.size === 0;
		return applicantIsAnswered;
	};

	onMount(() => {
		if (formState.applicants[applicantIndex].validationActive) {
			handleContinue();
		}
	});

	// Validate which visible options are unanswered (neutral / undefined)
	function validateAndMark(
		selections: Record<string, boolean> | Set<string | number> | undefined,
		visible: Option[] | undefined
	) {
		const newMissing = new Set<string | number>();
		if (!visible || !selections) {
			if (visible) {
				for (const opt of visible) {
					newMissing.add(opt.value);
				}
			}
			missingOptions = newMissing;
			return;
		}

		for (const opt of visible) {
			const key = opt.value;
			let val: boolean | undefined;
			if (selections instanceof Set) {
				val = selections.has(key) ? true : undefined;
			} else {
				val = (selections as Record<string, boolean>)[String(key)];
			}

			if (val === undefined) newMissing.add(key);
		}

		missingOptions = newMissing;

		if (missingOptions.size > 0) {
			const first = Array.from(missingOptions)[0];
			const el = document.querySelector(`[data-option-uid="${String(first)}"]`);
			if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
				(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	}

	///////// add function

	$effect(() => {
		if (
			!formState.applicants[applicantIndex].businessActivityDetails ||
			Object.keys(formState.applicants[applicantIndex].businessActivityDetails || {}).length === 0
		) {
			validationActive = false;
			applicantIsAnswered = false;
		} else if (formState.applicants[applicantIndex].validationActive) {
			// 	validateAndMark(applicant?.[bindsValue], visibleOptions);
			// 	if(missingOptions.size == 0){
			// 		applicantIsAnswered = true;
			// 		validationActive = true;
			// 	}

			applicantIsAnswered = true;
			validationActive = true;

			// handleContinue()
		} else {
			applicantIsAnswered = false;
			validationActive = false;
		}
	});

	//////  functiondsd

	// ✅ FIX: Re-validate whenever visible options change (reactive block)
	$effect(() => {
		if (validationActive && visibleOptions) {
			validateAndMark(applicant?.[bindsValue], visibleOptions);
			applicantIsAnswered = missingOptions.size === 0;
		}
	});

	// Create per-option stores and subscriptions
	$effect(() => {
		if (visibleOptions && applicant) {
			const visibleKeys = visibleOptions.map((o) => o.value);

			for (const key of visibleKeys) {
				if (!optionStores.has(key)) {
					const initial = applicant[bindsValue]?.[key];
					const s = writable<boolean | undefined>(initial);
					optionStores.set(key, s);

					const unsub = s.subscribe((val) => {
						const updatedList = (formState.applicants as any[]).map((a, i) =>
							i === applicantIndex
								? (() => {
										const g = { ...(a[bindsValue] || {}) } as Record<string, boolean>;
										if (val === undefined) {
											delete g[String(key)];
										} else {
											g[String(key)] = val;
										}
										return { ...a, [bindsValue]: g };
									})()
								: a
						);
						formState.replaceApplicants(updatedList as any);

						// ✅ When user changes any option, reset validation state
						// applicantIsAnswered = false;

						// validationActive = false;

						// ✅ If validation was active, re-validate on change
						if (validationActive && val !== undefined) {
							removeMissing(key);
							applicantIsAnswered = missingOptions.size === 0;
						}
					});

					optionUnsub.set(key, unsub);
				} else {
					const s = optionStores.get(key)!;
					const current = getStoreValue(s);
					const desired = applicant[bindsValue]?.[key];
					if (current !== desired) s.set(desired);
				}
			}

			for (const k of Array.from(optionStores.keys())) {
				if (!visibleKeys.includes(k)) {
					const unsub = optionUnsub.get(k);
					if (unsub) unsub();
					optionUnsub.delete(k);
					optionStores.delete(k);
				}
			}
		}
	});

	$effect(() => {
		return () => {
			for (const u of optionUnsub.values()) u();
			optionUnsub.clear();
			optionStores.clear();
		};
	});

	function getStoreValue<T>(w: Writable<T>) {
		let v: T | undefined;
		const unsub = w.subscribe((x) => (v = x));
		unsub();
		return v as T;
	}

	function getVisibleBusinessOptions(
		radioValue: any,
		allOptions: Option[],
		questionId: string
	): Option[] {
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
					value: opt.value
				}));
		}

		return allOptions.map((opt: Option) => ({
			label: opt.label,
			value: opt.value
		}));
	}

	$effect(() => {
		visibleOptions = getVisibleBusinessOptions(applicant, allOptions, id);
	});
</script>

<div>
	<div class={`${multipleSelectClass} flex w-full flex-col gap-1 md:gap-2`}>
		<label for={id} class="labelText mb-1 block text-black">
			{@html label}
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
				Available Options
			</div>
			<div class="flex max-h-80 flex-col gap-2 overflow-y-auto px-2 py-2 md:px-3">
				{#each visibleOptions as option (option.value)}
					<div
						data-option-uid={option.value}
						class="inputText relative flex w-full items-center justify-between gap-4 rounded-md border border-gray-300 bg-[var(--form-bg-card)] px-2 py-1 hover:border-primary hover:bg-primary/5 md:p-2"
						class:ring-[0.02rem]={missingOptions.has(option.value)}
						class:ring-red-500={missingOptions.has(option.value)}
					>
						<span>{option.label}</span>

						<SwitchToggleButton
							valueStore={optionStores.get(option.value) ?? null}
							onToggle={() => {
								applicantIsAnswered = false; // reset validation flag
							}}
							{applicantIndex}
							onClick={() => {
								validationActive = false;
								formState.applicants[applicantIndex].validationActive = false;
							}}
							{disabled}
						/>
					</div>
				{/each}
			</div>
		</div>

		<div class="mt-3 flex items-center justify-end gap-4">
			{#if continueBtn}
				{#if validationActive}
					{#if applicantIsAnswered}
						<p class="text-sm font-medium text-green-600">✓ All questions answered</p>
					{:else}
						<p class="text-sm font-medium text-stone-600">
							Please answer all questions in this category
						</p>
					{/if}
				{:else if !(validationActive && applicantIsAnswered) && missingOptions.size == 0}
					<p>Options change click here to continue</p>
				{/if}
				<button
					type="button"
					class="buttonText rounded-md px-4 py-2 text-white hover:brightness-90 disabled:opacity-50"
					class:bg-green-500={applicantIsAnswered}
					class:bg-primary={!applicantIsAnswered}
					onclick={() => handleContinue()}
				>
					Continue
				</button>
			{/if}
		</div>

		{#if error}
			<p class="smallText mt-1 text-error">{error}</p>
		{/if}
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
