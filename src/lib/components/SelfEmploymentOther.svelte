<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { formState } from '$lib/state/form.svelte';
	import businessOtherQuestions from '$lib/config/businessOtherQuestions.json';
	import ExistingLoanDetails from './ExistingLoanDetails.svelte';
	import MultiOptionsSelection from './MultiOptionsSelection.svelte';
	import CustomIncomeTable from './CustomIncomeTable.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import DatePickerYearAndMonth from './DatePickerYearAndMonth.svelte';
	import CollapsibleSection from './CollapsibleSection.svelte';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { ToWords } from 'to-words';
	import { securedClone } from '$lib/utils/securedClone';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';

	interface Props {
		selectedIndex?: number;
		showmodal?: boolean;
		modalActiveTab?: string;
	}

	let {
		selectedIndex = $bindable(0),
		showmodal = $bindable(false),
		modalActiveTab = undefined
	}: Props = $props();

	let businessOtherApplicant = businessOtherQuestions.businessOtherApplicant;

	// Use $state for answers to ensure fine-grained reactivity
	let answers: Record<string, any> = $state({});

	let lastemploymentType: string | null = $state(null);
	let previousCompletion: boolean | null = $state(null);
	let isHydrated: boolean = $state(false);
	let schemaDirty: boolean = $state(false);
	let numberWordsMap: Record<string, string> = $state({});
	let touchedFields: Record<string, boolean> = $state({});
	let visibleKey: string[] = $state([]);
	const toWords = new ToWords();

	const isSecured = ['Home Loan', 'Plot Loan', 'Loan Against Property'].includes(
		(formState.applicationData.loanName ?? '') as any
	);

	function initializeNumberWords() {
		businessOtherApplicant.forEach((q) => {
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

	onMount(() => {
		const applicant = (formState.applicants as any[])[selectedIndex];
		if (!applicant) return;

		// Use securedClone to convert reactive proxies to plain object, then assign to $state
		const cloned = securedClone(applicant);
		Object.assign(answers, cloned);
		lastemploymentType = answers?.employmentType ?? null;

		// Check if there's a saved income profile for this employment type
		const savedProfile = incomeProfileStore.getProfile(selectedIndex, 'Self-employed(Other)');
		if (savedProfile) {
			Object.assign(answers, savedProfile.data);
		}

		isHydrated = true;
		initializeNumberWords();
	});

	// Save income profile when component is destroyed (user switches employment type)
	$effect(() => {
		return () => {
			if (isHydrated && answers?.employmentType === 'Self-employed(Other)') {
				incomeProfileStore.saveProfile(selectedIndex, 'Self-employed(Other)', answers);
			}
		};
	});

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
			// For arrays, compare stringified versions
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
		if (isHydrated && answers?.employmentType) {
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
				// isComplete is now $derived from schemaDirty — no need to assign directly

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
		}
	});

	$effect(() => {
		if (formState.applicationData?.checkUnsecureData && !isSecured) {
			visibleKey = Array.from(
				new Set(
					businessOtherApplicant
						.filter((q: any) => shouldShow(q.showWhen as any, answers))
						.map((q: any) => q.key)
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
						return false;
					}
				}

				if (condition['>']) {
					const [l, r] = condition['>'];
					if (resolve(l) > resolve(r)) {
						answersLocal[errorKey] = errorMsg;
						return false;
					}
				}

				answersLocal[errorKey] = '';
			}
		}
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

	// ── isComplete as $derived ──────────────────────────────────────────
	// Using $derived instead of $effect + $state avoids an intermediate
	// state write that can cascade through child effects.  $derived only
	// notifies downstream consumers when the computed boolean CHANGES,
	// which prevents effect_update_depth_exceeded when answers is
	// replaced with a new object but the completion status is unchanged.
	const isComplete = $derived.by(() => {
		if (!isHydrated) return false;
		if (schemaDirty) return false;

		const vq = businessOtherApplicant.filter((q) => shouldShow(q.showWhen as any, answers));

		const keys = vq
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
			});

		const missing = keys.filter((key) => {
			const v = answers?.[key];
			if (v === undefined || v === null) return true;
			if (typeof v === 'string' && v.trim() === '') return true;
			if (typeof v === 'boolean' && v === false) return true;
			if (typeof v === 'number' && v === 0) return false;

			return false;
		});

		const ap = missing.length === 0;

		const he = Object.keys(answers ?? {}).some((k) => k.endsWith('Error') && answers[k]?.trim?.());

		const ent =
			answers?.ObligationsRunning === 'No' ||
			(answers?.ObligationsRunning === 'Yes' &&
				((answers.tableLoanEntries?.length ?? 0) > 0 ||
					(answers.tableLimitEntries?.length ?? 0) > 0));

		return (formState.applicationData.loanName ?? '') === 'Business Loan'
			? ap && !he
			: ap && !he && ent;
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
			() => (formState.applicants as any[])[selectedIndex]?.__completion
		);
		if (current === storeCompletion) return;

		queueMicrotask(() => {
			// Guard 3 — re-check inside the microtask
			const latest = (formState.applicants as any[])[selectedIndex]?.__completion;
			if (latest === current) return;

			const upd = [...formState.applicants] as any[];
			upd[selectedIndex] = {
				...upd[selectedIndex],
				__completion: current
			};
			formState.replaceApplicants(upd);
		});
	});

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

		if (isSecured) {
			showmodal = false;
		}
	}

	function handleNumberInput(value: number | number[] | null, question: Record<string, unknown>) {
		const questionId = question.id as string;
		// Show words ONLY when explicitly enabled
		if (!question?.showNumberInWords) {
			numberWordsMap = {
				...numberWordsMap,
				[questionId]: ''
			};
			return;
		}

		// Ignore arrays completely (defensive)
		if (Array.isArray(value)) {
			numberWordsMap = {
				...numberWordsMap,
				[questionId]: ''
			};
			return;
		}

		// Clear words only when value is truly empty
		if (value === null || isNaN(value)) {
			numberWordsMap = {
				...numberWordsMap,
				[questionId]: ''
			};
			return;
		}

		// Value is valid number (including 0 if needed)
		numberWordsMap = {
			...numberWordsMap,
			[questionId]: toWords.convert(value)
		};
	}

	// function handleNumberInput(value: number | number[] | null, question) {
	// 	if (typeof value === 'number' && !isNaN(value) && question.showNumberInWords === true) {
	// 		numberWordsMap = {
	// 			...numberWordsMap,
	// 			[question.id]: `${toWords.convert(value)}`
	// 		};
	// 	} else {
	// 		numberWordsMap = {
	// 			...numberWordsMap,
	// 			[question.id]: ''
	// 		};
	// 	}
	// }
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
		q_businessType: 'employment_specifics',
		q_businessActivityDetails: 'employment_specifics',
		q3_addressSameOrNot: 'employment_specifics',
		q_GSTRegistrationYear: 'employment_specifics',
		q_selectedBusinessExperience: 'employment_specifics',
		q5_financialsTable: 'income',
		q_averageBankBalance: 'income',
		q_cashAmount: 'income',
		q_creditScore: 'credit_score',
		q_whyPrimaryLowCredit: 'credit_score',
		q_Obligation: 'credit_score'
	};

	// Group questions by section
	function getQuestionsForSection(sectionId: string) {
		return businessOtherApplicant.filter((q) => questionSectionMap[q.id] === sectionId);
	}

	// Check if a required question's answer key is filled
	function isQuestionAnswered(q: (typeof businessOtherApplicant)[0]): boolean {
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

	// Compute per-section: visible questions, has content, is completed
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

	// Active section: auto-advance to first incomplete section with content
	let userToggledSection = $state<string | null>(null);

	const activeSection = $derived.by(() => {
		// If user manually toggled a section, respect it
		if (userToggledSection !== null) return userToggledSection;
		// Auto-expand first incomplete section that has content
		const firstIncomplete = sections.find((s) => s.hasContent && !s.completed);
		if (firstIncomplete) return firstIncomplete.id;
		// All complete — expand the last section with content
		const lastWithContent = [...sections].reverse().find((s) => s.hasContent);
		return lastWithContent?.id ?? 'employment_specifics';
	});

	function toggleSection(sectionId: string) {
		if (activeSection === sectionId) {
			userToggledSection = null; // collapse — auto-pick takes over
		} else {
			userToggledSection = sectionId;
		}
	}

	// Reset manual toggle when a section completes (so auto-advance works)
	let lastCompletedSnapshot = '';
	$effect(() => {
		const snapshot = sections.map((s) => `${s.id}:${s.completed}`).join(',');
		if (snapshot !== lastCompletedSnapshot) {
			const prev = lastCompletedSnapshot;
			lastCompletedSnapshot = snapshot;
			if (prev !== '') {
				// A section status changed — reset manual toggle so auto-advance kicks in
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
						<h2 class="text-labelText block text-black">{q.question}</h2>
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
								if (answers[q.key] !== val) {
									answers[q.key] = val;
								}
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
							minYear={(q as any).minYear ?? null}
							introduceMonthIndia={(q as any).introduceMonthIndia ?? null}
							onchange={(e) => {
								if (answers[q.key] !== e.detail) {
									answers[q.key] = e.detail;
								}
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
		<!-- Modal mode: render only the active tab's section content without collapsible wrapper -->
		{#each sections as section}
			{#if section.id === modalActiveTab && section.hasContent}
				{@render sectionContent(section)}
			{/if}
		{/each}
	{:else}
		<!-- Inline mode: render all sections with CollapsibleSection wrappers -->
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
				onclick={submitForm}
				disabled={!isComplete}
				class="mt-6 w-full rounded-lg py-3 font-medium transition {isComplete
					? 'bg-[#e3cab9] text-white hover:bg-[#ddbea9]'
					: 'cursor-not-allowed bg-gray-300 text-gray-600'}"
			>
				{isComplete ? 'Submit →' : 'Please fill all required fields'}
			</button>
		</div>
	{/if}
</div>
