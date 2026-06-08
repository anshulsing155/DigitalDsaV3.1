<script lang="ts">
	import InputField from '$lib/components/InputField.svelte';
	import NewSelect from '$lib/components/NewSelect.svelte';
	import { formState } from '$lib/state/form.svelte';
	import applicantBasicDetails from '$lib/config/applicantBasicDetails.json';
	import { onMount } from 'svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';

	interface Props {
		selectedIndex?: number;
		allVisibleQuestionsFilled?: boolean;
	}

	let { selectedIndex = $bindable(0), allVisibleQuestionsFilled = $bindable(false) }: Props =
		$props();

	// Local reactive state for answers - NOT a bindable prop
	let answers: Record<string, any> = $state({});
	let visibleQuestion: any[] = $state([]);
	let visibleKey: string[] = $state([]);
	let lastPayload: any = $state(null);
	let errors: Record<string, string> = $state({});
	let syncScheduled = false;
	let mounted = false;

	// ── Derived store length for deduplication ────────────────────────────
	// Pulling out a primitive (number) via $derived means downstream effects
	// only re-run when the length actually changes, not on every store set.
	const storeLength = $derived(formState.applicants?.length ?? 0);

	function removeArrayKeysIfObjectHasValue(
		array: string[],
		obj: Record<string, unknown>
	): string[] {
		return array.filter(function (key: string) {
			if (key === 'salariedActivityDetails') {
				return obj.salariedActivityDetailsValidate !== true;
			}

			if (!Object.prototype.hasOwnProperty.call(obj, key)) {
				return true;
			}

			var value = obj[key];

			if (key === 'grossIncome' || key === 'netIncome') {
				return value === 0 || value === null || value === undefined || value === '';
			}

			return value === undefined || value === null || value === '';
		});
	}

	// ── Debounced sync — push local answers back to the shared store ──────
	// Called after every user input/blur/select.  Uses queueMicrotask so
	// multiple rapid changes get batched into one store update.
	function syncToStore(): void {
		if (syncScheduled || !mounted) return;
		syncScheduled = true;
		queueMicrotask(() => {
			syncScheduled = false;
			if (!mounted) return;
			const currentApplicants = formState.applicants as Record<string, unknown>[];
			const updated = [...currentApplicants];
			updated[selectedIndex] = { ...updated[selectedIndex], ...answers };
			formState.replaceApplicants(updated as any);
		});
	}

	// ── Hydrate local answers from the shared store on mount ──────────────
	// Copies the existing applicant data into a local $state object so
	// that form inputs can bind to it without directly mutating the store
	// on every keystroke.
	onMount(() => {
		mounted = true;
		const storeData = formState.applicants[selectedIndex];
		if (storeData) {
			const cloned = structuredClone(storeData);
			for (const [key, value] of Object.entries(cloned)) {
				answers[key] = value;
			}
		}

		Object.keys(answers).forEach((key) => {
			if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') {
				validateField(key, answers[key]);
			}
		});

		return () => {
			mounted = false;
		};
	});

	// ── Load the basic-details question list ──────────────────────────────
	// Uses derived storeLength (not formState.applicants directly) so this
	// effect only re-runs when the count actually changes.
	$effect(() => {
		if (storeLength == 1) {
			visibleQuestion = applicantBasicDetails.applicant;
		}
	});

	// ── Validation trigger — highlight unanswered required fields ──────
	// When the parent sets checkUnsecureData = true (via the Next button
	// on applicantPage), this figures out which required keys still have
	// no value and marks them for the error UI.
	$effect(() => {
		if (formState.applicationData?.checkUnsecureData && visibleQuestion.length > 0) {
			let tempKeys = Array.from(
				new Set(
					visibleQuestion.filter((q: any) => shouldShow(q.showWhen, answers)).map((q: any) => q.key)
				)
			);

			if (tempKeys.length > 0) {
				visibleKey = removeArrayKeysIfObjectHasValue(tempKeys, answers);
			}
		}
	});

	// ── Build the applicant payload for this section ──────────────────────
	// Determines which basic-detail questions are visible (based on showWhen
	// rules) and saves them into applicantsStorePayload so the submission
	// handler knows which fields were actually shown to the user.
	function buildApplicantPayload(
		applicant: Record<string, unknown>,
		applicationDataParam: Record<string, unknown>
	) {
		const questions = applicantBasicDetails.applicant.filter((q: Record<string, unknown>) =>
			shouldShow(q.showWhen as any, { ...applicant, ...applicationDataParam })
		);

		return [
			{
				AddApplicantQuestions: questions
			}
		];
	}

	// ── Build and sync the applicant payload ─────────────────────────────
	// Uses get() for a non-reactive read of the store since this only
	// needs to run when answers or applicationData change, not on every
	// store notification.  The JSON guard prevents redundant writes.
	$effect(() => {
		const _answers = answers;
		const appData = formState.applicationData;
		const applicant = formState.applicants[selectedIndex];
		const newPayload = buildApplicantPayload(applicant, appData);
		const newPayloadStr = JSON.stringify(newPayload);

		if (newPayloadStr !== JSON.stringify(lastPayload)) {
			lastPayload = newPayload;
			// Use .update() instead of direct index assignment to ensure
			// Svelte's store contract is respected — direct mutation like
			// $store[i] = x can silently fail to notify subscribers.
			queueMicrotask(() => {
				const safePayload = Array.isArray(formState.applicantsPayload)
					? [...formState.applicantsPayload]
					: [];
				safePayload[selectedIndex] = { ...safePayload[selectedIndex], ...newPayload[0] } as any;
				formState.replaceApplicantsPayload(safePayload as any);
			});
		}
	});

	// ── Check if all visible basic-detail questions are filled ────────────
	// Updates the bound prop `allVisibleQuestionsFilled` which the parent
	// component (ApplicantFormUnsecured) reads to decide whether to show
	// the income sub-forms.
	$effect(() => {
		const _answers = answers;
		const _errors = errors;

		if (visibleQuestion.length === 0) {
			allVisibleQuestionsFilled = false;
		} else {
			const currentlyVisibleQuestions = visibleQuestion.filter((q: any) =>
				shouldShow(q.showWhen, _answers)
			);

			if (currentlyVisibleQuestions.length === 0) {
				allVisibleQuestionsFilled = false;
			} else {
				allVisibleQuestionsFilled = currentlyVisibleQuestions.every((q: any) => {
					const value = _answers[q.key];
					const hasError = _errors[q.key];

					const isFilled =
						value !== undefined &&
						value !== null &&
						value !== '' &&
						!(typeof value === 'number' && isNaN(value));

					const isValid = !hasError || hasError === '';

					return isFilled && isValid;
				});
			}
		}
	});

	function validateFullName(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'Full Name is required';
		}
		if (value.trim().length < 2) {
			return 'Name must be at least 2 characters';
		}
		if (!/^[A-Za-z\s]+$/.test(value)) {
			return 'Name can contain only letters and spaces';
		}
		if (/(.)\1{2,}/.test(value)) {
			return 'Name should not contain repetitive characters';
		}
		return '';
	}

	function validateAge(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'Age is required';
		}
		const age = Number(value);
		if (!Number.isFinite(age) || isNaN(age)) {
			return 'Age must be a valid number';
		}
		if (age < 18) {
			return 'Age must be at least 18';
		}
		if (age > 80) {
			return 'Age must be at most 80';
		}
		return '';
	}

	function validateGender(value: string, fieldName: string): string {
		if (!value || value.trim().length === 0) {
			return `${fieldName} is required`;
		}
		return '';
	}

	function validateemploymentType(value: string, fieldName: string): string {
		if (!value || value.trim().length === 0) {
			return `${fieldName} is required`;
		}
		return '';
	}

	function validateCompanyName(value: string): string {
		if (!value || value.trim().length === 0) {
			return 'Company name is required';
		}

		const name = value.trim();

		if (name.length < 2) {
			return 'Company name must be at least 2 characters';
		}

		const allowedCharsRegex = /^[A-Za-z0-9 .&'()-]+$/;
		if (!allowedCharsRegex.test(name)) {
			return "Allowed characters: A–Z, 0–9, space, . & ' ( ) -";
		}

		const repeatedLettersRegex = /(.)\1{2,}/;
		if (repeatedLettersRegex.test(name)) {
			return 'Company name should not contain repetitive characters';
		}

		if (/^[.&'()-]|[.&'()-]$/.test(name)) {
			return 'Company name cannot start or end with special characters';
		}

		const repeatedSpecialCharsRegex = /([.&'()-])\1+/;
		if (repeatedSpecialCharsRegex.test(name)) {
			return 'Company name should not contain consecutive special characters';
		}

		return '';
	}

	function validateField(key: string, value: any) {
		let error = '';

		switch (key) {
			case 'fullName':
				error = validateFullName(value);
				break;

			case 'age':
				error = validateAge(value);
				break;

			case 'gender':
				error = validateGender(value, 'Gender');
				break;

			case 'employmentType':
				error = validateemploymentType(value, 'Employment Type');
				break;

			case 'companyName':
				error = validateCompanyName(value);
				break;
		}

		errors = {
			...errors,
			[key]: error
		};

		return error;
	}

	function handleInput(key: string, value: any) {
		if (errors[key]) {
			errors = { ...errors, [key]: '' };
		}
		syncToStore();
	}

	function handleBlur(key: string, value: any) {
		validateField(key, value);
		syncToStore();
	}

	function handleSelectChange(key: string, value: any) {
		validateField(key, value);
		syncToStore();
	}
</script>

<div>
	{#if visibleQuestion?.length > 0}
		<div class="flex flex-col gap-4">
			{#each visibleQuestion as item, i}
				{#if shouldShow(item.showWhen, { ...answers, ...formState.applicationData })}
					{#if item.type === 'text' || item.type === 'number'}
						<div class="mt-[2rem] md:mt-[3rem]">
							<div class="flex flex-col gap-1 md:gap-2">
								<label
									for={item.key}
									class="text-labelText {visibleKey.includes(item.key)
										? 'text-red-500'
										: 'text-black dark:text-[var(--form-text)]'} font-medium"
								>
									{item.question}
								</label>
								<InputField
									id={item.key}
									type={item.type}
									inputRestriction={item.inputRestriction}
									maxlength={item.maxlength}
									bind:value={answers[item.key]}
									icon={item.icon}
									placeholder={item.placeholder}
									error={errors[item.key]}
									onBlur={() => handleBlur(item.key, answers[item.key])}
									onInput={() => handleInput(item.key, answers[item.key])}
									validateOnInput={true}
									required
								/>
							</div>
						</div>
					{:else if item.type === 'selection'}
						{#if item.id == 'q_employmentType' && formState.applicationData.loanName == 'Personal Loan'}
							<div class="mt-[2rem] md:mt-[3rem]">
								<div class="flex flex-col gap-1 md:gap-2">
									<label
										for={item.key}
										class="text-labelText {visibleKey.includes(item.key)
											? 'text-red-500'
											: 'text-black dark:text-[var(--form-text)]'} font-medium"
									>
										{item.question}
									</label>
									<NewSelect
										id={item.key}
										bind:value={answers[item.key]}
										options={item.options}
										error={errors[item.key]}
										onChange={() => {
											handleSelectChange(item.key, answers[item.key]);
										}}
										icon={item.icon}
										required
									/>
								</div>
							</div>
						{:else if item.id != 'q_employmentType'}
							<div class="mt-[2rem] md:mt-[3rem]">
								<div class="flex flex-col gap-1 md:gap-2">
									<label
										for={item.key}
										class="text-labelText {visibleKey.includes(item.key)
											? 'text-red-500'
											: 'text-black dark:text-[var(--form-text)]'} font-medium"
									>
										{item.question}
									</label>
									<NewSelect
										id={item.key}
										bind:value={answers[item.key]}
										options={item.options}
										error={errors[item.key]}
										onChange={() => {
											handleSelectChange(item.key, answers[item.key]);
										}}
										disabled={item.id === 'q_companyType' &&
											formState.applicationData.loanName === 'Business Loan'}
										icon={item.icon}
										required
									/>
								</div>
							</div>
						{/if}
					{/if}
				{/if}
			{/each}
		</div>
	{/if}
</div>
