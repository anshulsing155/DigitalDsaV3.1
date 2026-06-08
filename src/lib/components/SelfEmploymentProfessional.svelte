<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import professionalQuestion from '$lib/config/professionalQuestion.json';
	import MultiOptionsSelection from './MultiOptionsSelection.svelte';
	import CustomIncomeTable from './CustomIncomeTable.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import DatePickerYearAndMonth from './DatePickerYearAndMonth.svelte';
	import ExistingLoanDetails from './ExistingLoanDetails.svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { ToWords } from 'to-words';
	import { securedClone } from '$lib/utils/securedClone';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import CollapsibleSection from './CollapsibleSection.svelte';

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

	const professionalApplicant = professionalQuestion.professionalApplicant;

	// Use $state for answers to ensure fine-grained reactivity
	let answers: Record<string, any> = $state({});

	let numberWordsMap: Record<string, string> = $state({});
	let touchedFields: Record<string, boolean> = $state({});
	let lastemploymentType: string | null = $state(null);
	let previousCompletion: boolean | null = $state(null);

	let isHydrated: boolean = $state(false);
	let schemaDirty: boolean = $state(false);
	let visibleKey: string[] = $state([]);
	const toWords = new ToWords();

	const isSecured = ['Home Loan', 'Plot Loan', 'Loan Against Property'].includes(
		(formState.applicationData.loanName ?? '') as any
	);

	onMount(() => {
		const applicant = (formState.applicants as any[])[selectedIndex];
		if (!applicant) return;

		// Use securedClone to convert reactive proxies to plain object, then assign to $state
		const cloned = securedClone(applicant);
		Object.assign(answers, cloned);
		lastemploymentType = answers?.employmentType ?? null;

		// Check if there's a saved income profile for this employment type
		const savedProfile = incomeProfileStore.getProfile(
			selectedIndex,
			'Self-employed(Professional)'
		);
		if (savedProfile) {
			// Restore saved profile data (without overwriting basic info)
			Object.assign(answers, savedProfile.data);
		}

		isHydrated = true;
		initializeNumberWords();
	});

	// Save income profile when component is destroyed (user switches employment type)
	$effect(() => {
		return () => {
			if (isHydrated && answers?.employmentType === 'Self-employed(Professional)') {
				incomeProfileStore.saveProfile(selectedIndex, 'Self-employed(Professional)', answers);
			}
		};
	});

	function initializeNumberWords() {
		professionalApplicant.forEach((q) => {
			if (q.type === 'number' && q.showNumberInWords && shouldShow(q.showWhen as any, answers)) {
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

	// ── Derived NRI flag from the store ──────────────────────────────────
	// Extracts just the isNRI primitive so that the sync effect
	// below only re-runs when NRI status actually changes — not on every
	// store notification (which would happen with a direct (formState.applicants as any[]) read).
	const storeNRI = $derived((formState.applicants as any[])[selectedIndex]?.isNRI);

	$effect(() => {
		if (!isHydrated) return;
		if (storeNRI !== undefined && storeNRI !== answers.isNRI) {
			answers.isNRI = storeNRI;
		}
	});

	// ── Sync validation flags to the store for tab completion tracking ────
	const businessActivityDetailsValidateLocal = $derived(answers?.businessActivityDetailsValidate);
	$effect(() => {
		if (!isHydrated) return;
		const localVal = businessActivityDetailsValidateLocal;
		const storeVal = untrack(
			() => (formState.applicants as any[])[selectedIndex]?.businessActivityDetailsValidate
		);
		if (localVal !== storeVal) {
			const updated = [...formState.applicants] as any[];
			updated[selectedIndex] = {
				...updated[selectedIndex],
				businessActivityDetailsValidate: localVal
			};
			formState.replaceApplicants(updated);
		}
	});

	// ── Sync income fields to store for tab completion detection ────
	const financialsTableValidateLocal = $derived(answers?.financialsTableValidate);
	const averageBankBalanceLocal = $derived(answers?.averageBankBalance);
	const cashAmountLocal = $derived(answers?.cashAmount);
	const creditScoreLocal = $derived(answers?.creditScore);
	const whyPrimaryLowCreditValidateLocal = $derived(answers?.whyPrimaryLowCreditValidate);
	const obligationsRunningLocal = $derived(answers?.ObligationsRunning);
	const tableLoanEntriesLocal = $derived(answers?.tableLoanEntries);
	const tableLimitEntriesLocal = $derived(answers?.tableLimitEntries);

	$effect(() => {
		if (!isHydrated) return;
		const updates: Record<string, any> = {};
		let hasChanges = false;

		const checkAndAdd = (key: string, localVal: any) => {
			const storeVal = untrack(() => (formState.applicants as any[])[selectedIndex]?.[key]);
			const localStr = JSON.stringify(localVal);
			const storeStr = JSON.stringify(storeVal);
			if (localStr !== storeStr && localVal !== undefined) {
				updates[key] = localVal;
				hasChanges = true;
			}
		};

		checkAndAdd('financialsTableValidate', financialsTableValidateLocal);
		checkAndAdd('averageBankBalance', averageBankBalanceLocal);
		checkAndAdd('cashAmount', cashAmountLocal);
		checkAndAdd('creditScore', creditScoreLocal);
		checkAndAdd('whyPrimaryLowCreditValidate', whyPrimaryLowCreditValidateLocal);
		checkAndAdd('ObligationsRunning', obligationsRunningLocal);
		checkAndAdd('tableLoanEntries', tableLoanEntriesLocal);
		checkAndAdd('tableLimitEntries', tableLimitEntriesLocal);

		if (hasChanges) {
			const updated = [...formState.applicants] as any[];
			updated[selectedIndex] = {
				...updated[selectedIndex],
				...updates
			};
			formState.replaceApplicants(updated);
		}
	});

	$effect(() => {
		if (!isHydrated || !answers?.employmentType) return;

		const current = answers.employmentType;

		if (lastemploymentType !== null && current !== lastemploymentType) {
			schemaDirty = true;

			// Use direct mutation to preserve $state proxy
			answers.tableLoanEntries = [];
			answers.tableLimitEntries = [];
			answers.tableLoanEntriesValidate = false;
			answers.tableLimitEntriesValidate = false;
			answers.ObligationsRunning = '';

			lastemploymentType = current;
			previousCompletion = false;

			// Use untrack to avoid circular dependency
			const hasApplicant = untrack(() => (formState.applicants as any[])[selectedIndex]);
			if (hasApplicant) {
				queueMicrotask(() => {
					const updated = [...formState.applicants] as any[];
					updated[selectedIndex] = {
						...updated[selectedIndex],
						__completion: false
					};
					formState.replaceApplicants(updated);
				});
			}

			queueMicrotask(() => {
				schemaDirty = false;
			});
		}
	});

	$effect(() => {
		if (formState.applicationData?.checkUnsecureData && !isSecured) {
			visibleKey = Array.from(
				new Set(
					professionalApplicant
						.filter((q) => shouldShow(q.showWhen as any, answers))
						.map((q) => q.key)
				)
			);
			formState.applicationData.checkUnsecureData = false;
		}
	});

	function validateField(q: Record<string, unknown>, answersLocal: Record<string, unknown>) {
		const validation = (q.validation as Record<string, unknown[]>) ?? {};
		const groups = Object.keys(validation);
		const mainErrorKey = q.key + 'Error';
		answersLocal[mainErrorKey] = '';

		const resolve = (obj: unknown): number => {
			if (typeof obj === 'number') return obj;
			if (obj && typeof obj === 'object' && 'var' in obj)
				return Number(answersLocal[(obj as { var: string }).var] ?? 0);
			return 0;
		};

		for (const group of groups) {
			for (const rule of validation[group] ?? []) {
				const ruleObj = rule as Record<string, unknown>;
				const condition = (ruleObj.case ?? {}) as Record<string, unknown[]>;
				const errorKey = Object.keys(ruleObj).find((k: string) => k.endsWith('Error'));
				if (!errorKey) continue;

				const errorMsg = ruleObj[errorKey];

				if (condition['<']) {
					const [l, r] = condition['<'];
					if (resolve(l) < resolve(r)) {
						answersLocal[errorKey] = errorMsg;
						answersLocal = { ...answersLocal };
						return false;
					}
				}

				if (condition['>']) {
					const [l, r] = condition['>'];
					if (resolve(l) > resolve(r)) {
						answersLocal[errorKey] = errorMsg;
						answersLocal = { ...answersLocal };
						return false;
					}
				}

				answersLocal[errorKey] = '';
			}
		}

		answersLocal = { ...answersLocal };
		return true;
	}

	function validateErrors(obj: any) {
		const data = { ...obj };
		let hasError = false;

		for (const key of Object.keys(data)) {
			if (key.endsWith('Error')) {
				const v = data[key]?.trim?.();
				if (!v) delete data[key];
				else hasError = true;
			}
		}
		return { data, status: !hasError };
	}

	// Use $derived for completion computation - answers is now $state so reactivity works
	const visibleQuestions = $derived(
		professionalApplicant.filter((q) => shouldShow(q.showWhen as any, answers))
	);

	const allKeys = $derived(
		visibleQuestions
			.filter((q) => q.required)
			.map((q) => {
				if (q.type === 'multiple-select') {
					if (q.key === 'whyPrimaryLowCredit') {
						return 'whyPrimaryLowCreditValidate';
					} else if (q.key === 'businessActivityDetails') {
						return 'businessActivityDetailsValidate';
					} else {
						return `${q.key}Validate`;
					}
				} else if (q.type === 'table') {
					return `${q.key}Validate`;
				} else {
					return q.key;
				}
			})
	);

	// Since answers is now $state, fine-grained reactivity works automatically
	const missingKeys = $derived(
		allKeys.filter((key) => {
			const v = answers[key];
			if (v === undefined || v === null) return true;
			if (typeof v === 'string' && v.trim() === '') return true;
			if (typeof v === 'boolean' && v === false) return true;
			if (typeof v === 'number' && v === 0) return false;
			return false;
		})
	);

	const allPresent = $derived(missingKeys.length === 0);

	const hasErrors = $derived(
		Object.keys(answers).some((k) => k.endsWith('Error') && answers[k]?.trim?.())
	);

	const hasEntries = $derived(
		answers.ObligationsRunning === 'No' ||
			(answers.ObligationsRunning === 'Yes' &&
				((answers.tableLoanEntries?.length ?? 0) > 0 ||
					(answers.tableLimitEntries?.length ?? 0) > 0))
	);

	const isComplete = $derived.by(() => {
		if (!isHydrated) return false;
		if (schemaDirty) return false;

		return (formState.applicationData.loanName ?? '') === 'Professional Loan'
			? allPresent && !hasErrors
			: allPresent && !hasErrors && hasEntries;
	});

	/* ───────── Sync Completion to Store ───────── */
	let completionSyncTimeout: ReturnType<typeof setTimeout> | null = null;

	// ── Sync completion flag to the shared applicants store ───────────────
	// Writes the __completion flag so the parent can enable/disable "Next".
	// Triple-guarded to prevent infinite loops: if the value hasn't
	// changed locally, in the store, or by the time the timeout runs,
	// we skip the write entirely (avoiding a new object reference that
	// would re-trigger every effect reading (formState.applicants as any[])).
	$effect(() => {
		if (!isHydrated || schemaDirty) return;

		const current = isComplete;

		// Guard 1 — skip if our local tracker already matches
		if (current === previousCompletion) return;
		previousCompletion = current;

		// Clear any pending sync
		if (completionSyncTimeout) {
			clearTimeout(completionSyncTimeout);
		}

		// Guard 2 — skip if the store already has the correct value
		const storeCompletion = untrack(
			() => (formState.applicants as any[])[selectedIndex]?.__completion
		);
		if (current === storeCompletion) return;

		// Use setTimeout to break synchronous chain and prevent infinite loops
		completionSyncTimeout = setTimeout(() => {
			// Guard 3 — re-check inside the timeout because other code
			// may have updated the store between scheduling and execution.
			const latest = (formState.applicants as any[])[selectedIndex]?.__completion;
			if (latest === current) return;

			const upd = [...formState.applicants] as any[];
			upd[selectedIndex] = {
				...upd[selectedIndex],
				__completion: current
			};
			formState.replaceApplicants(upd);
		}, 0);
	});

	/* ───────── Submit (ONLY authority) ───────── */
	function submitForm() {
		if (!isComplete) return;

		const validated = validateErrors(answers);
		if (!validated.status) return;

		const updated = [...formState.applicants] as any[];
		updated[selectedIndex] = {
			...updated[selectedIndex],
			...validated.data,
			__completion: true
		};
		formState.replaceApplicants(updated);

		lastemploymentType = answers.employmentType;
		schemaDirty = false;

		if (isSecured && showmodal !== undefined) {
			showmodal = false;
		}
	}

	function handleNumberInput(value: number | number[] | null, question: Record<string, unknown>) {
		const questionId = question.id as string;
		if (typeof value === 'number' && !isNaN(value) && question.showNumberInWords === true) {
			numberWordsMap = {
				...numberWordsMap,
				[questionId]: `${toWords.convert(value)}`
			};
		} else {
			numberWordsMap = {
				...numberWordsMap,
				[questionId]: ''
			};
		}
	}
	function handleTableUpdate(data: { questionId: string; value: any }) {
		const { questionId, value } = data;
		answers[questionId] = value;
	}

	function handleTableValidate(data: { questionId: string; valid: boolean }) {
		const { questionId, valid } = data;
		answers[questionId + 'Validate'] = valid;
	}

	// ── Section definitions for collapsible grouping ─────────────────────
	const sectionDefs = [
		{ id: 'employment_specifics', title: 'Employment Specifics', stepNumber: 1 },
		{ id: 'income', title: 'Income', stepNumber: 2 },
		{ id: 'credit_score', title: 'Credit Score', stepNumber: 3 },
		{ id: 'obligations_details', title: 'Existing Loans', stepNumber: 4 }
	];

	const questionSectionMap: Record<string, string> = {
		q_yourProfession: 'employment_specifics',
		q_isLawyerBarCouncil: 'employment_specifics',
		q_businessActivityDetails: 'employment_specifics',
		q_GSTRegistrationYear: 'income',
		q_financialsTable: 'income',
		q_averageBankBalance: 'income',
		q_cashAmount: 'income',
		q_creditScore: 'credit_score',
		q_whyPrimaryLowCredit: 'credit_score',
		q_Obligation: 'credit_score'
	};

	function getQuestionsForSection(sectionId: string) {
		return professionalApplicant.filter((q) => questionSectionMap[q.id] === sectionId);
	}

	function isQuestionAnswered(q: (typeof professionalApplicant)[0]): boolean {
		let key: string;
		if (q.type === 'multiple-select') {
			if (q.key === 'whyPrimaryLowCredit') key = 'whyPrimaryLowCreditValidate';
			else if (q.key === 'businessActivityDetails') key = 'businessActivityDetailsValidate';
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
		const ctx = { ...answers, ...formState.applicationData };
		const hasObligations = answers?.ObligationsRunning === 'Yes';

		return sectionDefs
			.filter((sec) => {
				// Only include obligations_details tab if ObligationsRunning === 'Yes'
				if (sec.id === 'obligations_details') return hasObligations;
				return true;
			})
			.map((sec) => {
				const allQuestions = getQuestionsForSection(sec.id);
				const visible = allQuestions.filter((q) => shouldShow(q.showWhen as any, ctx));
				const requiredVisible = visible.filter((q) => q.required);

				let completed: boolean;
				if (sec.id === 'obligations_details') {
					// For obligations tab, check if loan/limit entries exist
					completed =
						answers?.tableLoanEntries?.length > 0 || answers?.tableLimitEntries?.length > 0;
				} else {
					completed =
						requiredVisible.length > 0 && requiredVisible.every((q) => isQuestionAnswered(q));
				}

				// For obligations_details, always has content if shown
				const hasContent = sec.id === 'obligations_details' ? true : visible.length > 0;

				return { ...sec, questions: allQuestions, visible, completed, hasContent };
			});
	});

	let userToggledSection = $state<string | null>(null);

	const activeSection = $derived.by(() => {
		if (userToggledSection !== null) return userToggledSection;
		const firstIncomplete = sections.find((s) => s.hasContent && !s.completed);
		if (firstIncomplete) return firstIncomplete.id;
		const lastWithContent = [...sections].reverse().find((s) => s.hasContent);
		return lastWithContent?.id ?? 'employment_specifics';
	});

	function toggleSection(sectionId: string) {
		if (activeSection === sectionId) {
			userToggledSection = null;
		} else {
			userToggledSection = sectionId;
		}
	}

	let lastCompletedSnapshot = '';
	$effect(() => {
		const snapshot = sections.map((s) => `${s.id}:${s.completed}`).join(',');
		if (snapshot !== lastCompletedSnapshot) {
			const prev = lastCompletedSnapshot;
			lastCompletedSnapshot = snapshot;
			if (prev !== '') {
				userToggledSection = null;
			}
		}
	});
</script>

{#snippet sectionContent(section: (typeof sections)[0])}
	{#each section.questions as q}
		{#if shouldShow(q.showWhen as any, { ...answers, ...formState.applicationData })}
			<div class="mt-[1.5rem] md:mt-[2rem]">
				<div class="flex flex-col gap-1 md:gap-2">
					{#if q.type !== 'multiple-select'}
						<h2 class="text-labelText {visibleKey.includes(q.key) ? 'text-red-500' : 'text-black'}">
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
							icon={q.icon as any}
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
						/>
						{#if answers[q.key + 'Error'] && touchedFields[q.key]}
							<p class="text-sm text-red-600">{answers[q.key + 'Error']}</p>
						{/if}
					{/if}

					{#if q.type === 'radio'}
						<RadioCustom
							options={q.options}
							value={answers[q.key]}
							gridClass="grid grid-cols-1 sm:grid-cols-2 gap-3"
							onchange={(val) => {
								answers[q.key] = val;
							}}
						/>
					{/if}

					{#if q.type === 'table'}
						<CustomIncomeTable
							bind:answers
							questionId={q.key}
							onUpdate={handleTableUpdate}
							onValidate={handleTableValidate}
						/>
					{/if}

					{#if q.type === 'calendar'}
						<DatePickerYearAndMonth
							id={q.id}
							value={answers[q.key]}
							applicantIndex={selectedIndex}
							questionId={q.key}
							minYear={2017}
							introduceMonthIndia={6}
							onchange={(e) => {
								answers[q.key] = e.detail;
							}}
						/>
					{/if}
				</div>
			</div>
		{/if}
	{/each}

	<!-- ExistingLoanDetails inside the obligations_details section -->
	{#if section.id === 'obligations_details'}
		<ExistingLoanDetails idx={selectedIndex} bind:answers />
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
					expanded={activeSection === section.id}
					completed={section.completed}
					onToggle={() => toggleSection(section.id)}
				>
					{@render sectionContent(section)}
				</CollapsibleSection>
			{/if}
		{/each}
	{/if}

	{#if isSecured && !modalActiveTab}
		<div class="pt-5">
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
