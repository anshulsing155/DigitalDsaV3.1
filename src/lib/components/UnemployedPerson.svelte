<script lang="ts">
	import unemployedQuestion from '$lib/config/unemployedPerson.json';
	import { formState } from '$lib/state/form.svelte';
	import MultiOptionsSelection from './MultiOptionsSelection.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { onMount, untrack } from 'svelte';
	import { ToWords } from 'to-words';
	import { computeCompletion } from '$lib/utils/ApplicantUtils/computeCompletion';
	import { securedClone } from '$lib/utils/securedClone';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import CollapsibleSection from './CollapsibleSection.svelte';
	import ExistingLoanDetails from './ExistingLoanDetails.svelte';

	interface Props {
		selectedIndex?: number;
		showmodal?: boolean;
		modalActiveTab?: string;
	}

	let {
		selectedIndex = $bindable(0),
		showmodal = $bindable(undefined),
		modalActiveTab = undefined
	}: Props = $props();

	let resolvedIndex = $derived(Number.isInteger(selectedIndex) ? selectedIndex : 0);

	// Use $state for answers to ensure fine-grained reactivity
	let answers: Record<string, any> = $state({});

	let numberWordsMap: Record<string, string> = $state({});
	let touchedFields: Record<string, boolean> = $state({});
	let isNextEnabled: boolean = $state(false);
	let unemployedQuestions = unemployedQuestion.unemployedQuestions;
	let schemaDirty: boolean = $state(false);
	let lastemploymentType: string | null = $state(null);
	let isHydrated: boolean = $state(false);
	let previousCompletion: boolean | null = $state(null);
	let visibleKey: string[] = $state([]);
	const toWords = new ToWords();
	const isSecuredLoan = ['Home Loan', 'Plot Loan', 'Loan Against Property'].includes(
		formState.applicationData.loanName ?? ''
	);

	onMount(() => {
		const applicant = (formState.applicants as any[])[resolvedIndex];
		if (!applicant) return;

		// Use securedClone to convert reactive proxies to plain object, then assign to $state
		const cloned = securedClone(applicant);
		Object.assign(answers, cloned);
		lastemploymentType = (answers?.employmentType ?? null) as string;

		// Check if there's a saved income profile for this employment type
		const savedProfile = incomeProfileStore.getProfile(resolvedIndex, 'Unemployed');
		if (savedProfile) {
			Object.assign(answers, savedProfile.data);
		}

		isHydrated = true;
		initializeNumberWords();
	});

	// Save income profile when component is destroyed (user switches employment type)
	$effect(() => {
		return () => {
			if (isHydrated && answers?.employmentType === 'Unemployed') {
				incomeProfileStore.saveProfile(resolvedIndex, 'Unemployed', answers);
			}
		};
	});

	// ── Derived NRI flag from the store ──────────────────────────────────
	// Extracts just the isNRI primitive so that the sync effect
	// below only re-runs when NRI status actually changes — not on every
	// store notification (which would happen with a direct (formState.applicants as any[]) read).
	const storeNRI = $derived((formState.applicants as any[])[resolvedIndex]?.isNRI);

	$effect(() => {
		if (!isHydrated) return;
		if (storeNRI !== undefined && storeNRI !== answers.isNRI) {
			answers.isNRI = storeNRI;
		}
	});

	function initializeNumberWords() {
		unemployedQuestions.forEach((q) => {
			if (q.type === 'number' && q.showNumberInWords && shouldShow(q.showWhen, answers)) {
				const value = answers[q.key];
				if (value !== null && value !== undefined && !isNaN(value)) {
					numberWordsMap = {
						...numberWordsMap,
						[q.id]: toWords.convert(value)
					};
				}
			}
		});
	}

	function validateField(q: Record<string, unknown>, answersLocal: Record<string, unknown>) {
		const validation = (q.validation as Record<string, unknown[]>) ?? {};
		const groups = Object.keys(validation);

		const mainErrorKey = (q.key as string) + 'Error';
		answersLocal[mainErrorKey] = '';

		const resolve = (obj: unknown): number => {
			if (typeof obj === 'number') return obj;
			if ((obj as Record<string, unknown>)?.var)
				return Number(answersLocal[(obj as Record<string, string>).var] ?? 0);
			return 0;
		};

		for (const group of groups) {
			const rules = validation[group] ?? [];
			for (const rule of rules as Record<string, unknown>[]) {
				const condition = (rule.case as Record<string, unknown[]>) ?? {};
				const errorKey = Object.keys(rule).find((k: string) => k.endsWith('Error'));
				const errorMsg = errorKey ? rule[errorKey] : 'Invalid value';

				if (!errorKey) continue;

				// < operator
				if (condition['<']) {
					const [left, right] = condition['<'];
					if (resolve(left) < resolve(right)) {
						answersLocal[errorKey] = errorMsg;
						answersLocal = { ...answersLocal };
						return false;
					}
				}

				// > operator
				if (condition['>']) {
					const [left, right] = condition['>'];
					if (resolve(left) > resolve(right)) {
						answersLocal[errorKey] = errorMsg;
						answersLocal = { ...answersLocal };
						return false;
					}
				}

				// <=
				if (condition['<=']) {
					const [left, right] = condition['<='];
					if (resolve(left) <= resolve(right) === false && resolve(left) > resolve(right)) {
					}
				}

				answersLocal[errorKey] = '';
			}
		}

		answersLocal = { ...answersLocal };
		return true;
	}

	function hasEntries() {
		return (
			answers?.ObligationsRunning === 'No' ||
			(answers?.ObligationsRunning === 'Yes' &&
				(answers.tableLimitEntries?.length > 0 || answers.tableLoanEntries?.length > 0))
		);
	}

	// Memoized completion — eliminates $effect cascade (schemaDirty → isComplete → sync)
	const isComplete = $derived.by(() => {
		if (!isHydrated) return false;
		if (schemaDirty) return false;
		return computeCompletion({ questions: unemployedQuestions, answers });
	});

	// ── Sync completion flag to the shared applicants store ───────────────
	// Writes the __completion flag so the parent can enable/disable "Next".
	// Triple-guarded to prevent infinite loops: if the value hasn't
	// changed locally, in the store, or by the time the microtask runs,
	// we skip the write entirely (avoiding a new object reference that
	// would re-trigger every effect reading (formState.applicants as any[])).
	$effect(() => {
		if (schemaDirty) return;

		const current = isComplete;

		// Guard 1 — skip if our local tracker already matches
		if (current === previousCompletion) return;
		previousCompletion = current;

		// Guard 2 — skip if the store already has the correct value
		const storeCompletion = untrack(
			() => (formState.applicants as any[])[resolvedIndex]?.__completion
		);
		if (current === storeCompletion) return;

		queueMicrotask(() => {
			// Guard 3 — re-check inside the microtask because other code
			// may have updated the store between scheduling and execution.
			const latest = (formState.applicants as any[])[resolvedIndex]?.__completion;
			if (latest === current) return;

			const upd = [...formState.applicants] as any[];
			upd[resolvedIndex] = {
				...upd[resolvedIndex],
				__completion: current
			};
			formState.replaceApplicants(upd);
		});
	});

	function validateErrors(obj: any) {
		const data = { ...obj };
		let hasError = false;

		for (const key of Object.keys(data)) {
			if (key.endsWith('Error')) {
				let v = data[key];

				if (typeof v === 'string') v = v.trim();

				if (!v) {
					delete data[key]; // remove empty error keys
				} else {
					hasError = true;
				}
			}
		}

		return { data, status: !hasError };
	}

	function removeArrayKeysIfObjectHasValue(array: string[], obj: Record<string, unknown>) {
		return array.filter(function (key: string) {
			if (key === 'salariedActivityDetails') {
				return obj.salariedActivityDetailsValidate !== true;
			}
			if (key === 'whyPrimaryLowCredit') {
				return obj.whyPrimaryLowCreditValidate !== true;
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

	function submitForm() {
		if (!isComplete) return;

		const updated = [...formState.applicants] as any[];
		updated[resolvedIndex] = {
			...updated[resolvedIndex],
			...answers,
			__completion: true
		};
		formState.replaceApplicants(updated);

		lastemploymentType = answers.employmentType;
		schemaDirty = false;

		if (isSecuredLoan && showmodal !== undefined) {
			showmodal = false;
		}
	}

	function handleNumberInput(value: number | number[] | null, question: Record<string, unknown>) {
		// Show words ONLY when explicitly enabled
		if (!question?.showNumberInWords) {
			numberWordsMap = {
				...numberWordsMap,
				[question.id as string]: ''
			};
			return;
		}

		// Ignore arrays completely (defensive)
		if (Array.isArray(value)) {
			numberWordsMap = {
				...numberWordsMap,
				[question.id as string]: ''
			};
			return;
		}

		// Clear words only when value is truly empty
		if (value === null || isNaN(value)) {
			numberWordsMap = {
				...numberWordsMap,
				[question.id as string]: ''
			};
			return;
		}

		// Value is valid number (including 0 if needed)
		numberWordsMap = {
			...numberWordsMap,
			[question.id as string]: toWords.convert(value)
		};
	}

	// ── Section definitions for collapsible grouping ─────────────────────
	const sectionDefs = [
		{ id: 'credit_obligations', title: 'Credit Score & Obligations', stepNumber: 2 }
	];

	const questionSectionMap: Record<string, string> = {
		q_creditScore: 'credit_obligations',
		q_whyPrimaryLowCredit: 'credit_obligations',
		q_Obligation: 'credit_obligations'
	};

	function getQuestionsForSection(sectionId: string) {
		return unemployedQuestions.filter((q) => questionSectionMap[q.id] === sectionId);
	}

	function isQuestionAnswered(q: (typeof unemployedQuestions)[0]): boolean {
		let key: string;
		if (q.type === 'multiple-select') {
			if (q.key === 'whyPrimaryLowCredit') key = 'whyPrimaryLowCreditValidate';
			else key = `${q.key}Validate`;
		} else if (q.type === 'table') {
			key = `${q.key}Validate`;
		} else {
			key = q.key;
		}
		const v = answers?.[key];
		if (v === undefined || v === null) return false;
		if (typeof v === 'string' && v.trim() === '') return false;
		if (typeof v === 'boolean' && v === false) return false;
		return true;
	}

	const sections = $derived.by(() => {
		return sectionDefs.map((sec) => {
			const allQuestions = getQuestionsForSection(sec.id);
			const visible = allQuestions.filter((q) => shouldShow(q.showWhen as any, answers));
			const requiredVisible = visible.filter((q) => q.required);
			const completed =
				requiredVisible.length > 0 && requiredVisible.every((q) => isQuestionAnswered(q));
			return {
				...sec,
				questions: allQuestions,
				visible,
				completed,
				hasContent: visible.length > 0
			};
		});
	});

	let sectionExpanded = $state(true);
</script>

{#snippet sectionContent(section: (typeof sections)[0])}
	{#each section.questions as q}
		{#if shouldShow(q.showWhen as any, answers)}
			<div class="mt-[1.5rem] md:mt-[2rem]">
				<div class="flex flex-col gap-1 md:gap-2">
					{#if q.type !== 'multiple-select'}
						<h2
							class="text-labelText text-black {visibleKey.includes(q.key)
								? 'text-red-500'
								: 'text-black'}"
						>
							{q.question}
						</h2>
					{/if}

					{#if q.type === 'multiple-select'}
						<MultiOptionsSelection options={q.options} questionId={q.key} bind:answers compact />
					{/if}

					{#if q.type === 'number'}
						<NumberFieldIndianFormat
							value={answers[q.key]}
							isTouched={touchedFields[q.key]}
							maxLength={q.maxLength}
							max={q.max}
							showNumberInWords={q.showNumberInWords}
							onBlur={() => {
								touchedFields[q.key] = true;
								validateField(q, answers);
							}}
							onInput={(value) => {
								answers[q.key] = value;
								touchedFields[q.key] = false;
								validateField(q, answers);
							}}
							icon={q.icon as any}
						/>

						{#if answers[q.key + 'Error'] && touchedFields[q.key]}
							<p class="text-sm text-red-600">{answers[q.key + 'Error']}</p>
						{/if}
					{/if}

					{#if q.type === 'radio'}
						<RadioCustom
							options={q.options}
							value={answers[q.key]}
							onchange={(val) => {
								answers[q.key] = val;
							}}
						/>
					{/if}
				</div>
			</div>
		{/if}
	{/each}

	{#if section.id === 'credit_obligations' && answers?.ObligationsRunning === 'Yes'}
		<ExistingLoanDetails idx={resolvedIndex} bind:answers />
	{/if}
{/snippet}

<div class="flex flex-col">
	{#if modalActiveTab}
		{#each sections as section}
			{#if section.id === modalActiveTab && section.hasContent}
				{@render sectionContent(section)}
			{/if}
		{/each}
	{:else}
		{#each sections as section}
			{#if section.hasContent}
				<CollapsibleSection
					title={section.title}
					stepNumber={section.stepNumber}
					expanded={sectionExpanded}
					completed={section.completed}
					onToggle={() => {
						sectionExpanded = !sectionExpanded;
					}}
				>
					{@render sectionContent(section)}
				</CollapsibleSection>
			{/if}
		{/each}
	{/if}

	{#if isSecuredLoan && (formState.applicants as any[]).length > 1 && !modalActiveTab}
		<div class="mt-8">
			<button
				disabled={!isComplete}
				onclick={submitForm}
				class="w-full rounded-lg py-3 font-medium transition
				{isComplete
					? 'bg-[#e3cab9] text-white hover:bg-[#ddbea9]'
					: 'cursor-not-allowed bg-gray-300 text-gray-600'}"
			>
				{isComplete ? 'Submit →' : 'Please fill all required fields'}
			</button>
		</div>
	{/if}
</div>
