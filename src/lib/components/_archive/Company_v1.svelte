<script lang="ts">
	import { formState } from '$lib/state/form.svelte';
	import NewCompanyQuestion from '$lib/config/NewCompanyQuestion.json';
	import { shouldShow } from '$lib/config/showWhenEngine';
	import MultiOptionsSelection from './MultiOptionsSelection.svelte';
	import CustomIncomeTable from './CustomIncomeTable.svelte';
	import NumberFieldIndianFormat from './NumberFieldIndianFormat.svelte';
	import RadioCustom from './RadioCustom.svelte';
	import DatePickerYearAndMonth from './DatePickerYearAndMonth.svelte';
	import ExistingLoanDetails from './ExistingLoanDetails.svelte';
	import CompanyBusinessProfile from './CompanyBusinessProfile.svelte';
	import ModalTabs from './ModalTabs.svelte';
	import { onMount, untrack } from 'svelte';
	import { ToWords } from 'to-words';
	import { computeCompletion } from '$lib/utils/ApplicantUtils/computeCompletion';
	import { securedClone } from '$lib/utils/securedClone';
	import { incomeProfileStore } from '$lib/stores/incomeProfileStore';
	import { ChevronLeft, ChevronRight, TrendingUp, FileText } from '$lib/utils/iconRegistry';

	interface Props {
		selectedIndex?: number;
		showmodal?: boolean;
		answers?: any;
		modalActiveTab?: string;
		onSubmit?: () => void; // called after successful submit — parent can run cleanup (e.g. closeModal)
		/** Loan category context for deep profiling */
		loanCategory?: 'personal' | 'business' | 'professional';
		/** Business entity type (Business Loan) */
		businessEntityType?: string;
		/** Professional category (Professional Loan) */
		professionalCategory?: string;
	}

	let {
		selectedIndex = $bindable(0),
		showmodal = $bindable(false),
		answers = $bindable({}),
		modalActiveTab: externalTab = undefined,
		onSubmit = undefined,
		loanCategory = undefined,
		businessEntityType = undefined,
		professionalCategory = undefined
	}: Props = $props();

	let numberWordsMap: Record<string, string> = $state({});
	let touchedFields: Record<string, boolean> = $state({});
	// Only financials/credit questions are driven by the JSON schema in this component.
	// Tab 1 (business profile) is now handled by CompanyBusinessProfile.
	const allCompanyQuestions = NewCompanyQuestion.companyQuestions;
	const BUSINESS_PROFILE_IDS = new Set([
		'companySelectedAge',
		'q_businessType',
		'q_businessActivityDetails',
		'q_GSTRegistrationYear'
	]);
	const companyQuestions = allCompanyQuestions.filter(
		(q: { id: string }) => !BUSINESS_PROFILE_IDS.has(q.id)
	);
	let lastemploymentType: string | null = $state(null);
	let previousCompletion: boolean | null = $state(null);
	const toWords = new ToWords();
	let isHydrated: boolean = $state(false);
	let schemaDirty: boolean = $state(false);
	let visibleKey: string[] = $state([]);

	// NOTE: Director count + director detail rows have been moved to Step 0.5 (DirectorCards).
	// This component no longer handles director capture.

	// ── Bridge: CompanyBusinessProfile → old showWhen + CustomIncomeTable fields ──
	//
	// CompanyBusinessProfile (tab 1) stores data in new field names:
	//   financialIndicators[], operationalIndicators[], gstRegistered, businessVintage
	// But NewCompanyQuestion.json showWhen conditions AND CustomIncomeTable read old fields:
	//   businessActivityDetailsValidate, businessActivityDetailsVisible.*, businessActivityDetails.*
	//   GSTRegistrationYear
	//
	// This bridge maps ALL new fields to old format so tab 2 (Financials) works.
	// It reads ONLY from formState (not local answers) to avoid circular deps.

	/** Bridge fields computed from formState — no dependency on local answers */
	const bridgeFields = $derived.by(() => {
		const applicant = (formState.applicants as any[])[selectedIndex] ?? {};
		const finIndicators = (applicant.financialIndicators as string[] | undefined) ?? [];
		const opIndicators = (applicant.operationalIndicators as string[] | undefined) ?? [];
		const gstStatus = applicant.gstRegistered as string | undefined;
		const vintage = applicant.businessVintage as string | undefined;

		// Map financialIndicators + operationalIndicators + standalone fields → old format
		const activityObj: Record<string, boolean> = {
			// From financialIndicators
			gst_registered: gstStatus === 'yes' || finIndicators.includes('valid_gst'),
			has_current_account: finIndicators.includes('active_current_account'),
			itr_filed_regularly: finIndicators.includes('itr_filed'),
			has_cc_od: finIndicators.includes('recent_credit'),
			major_cash_sales: finIndicators.includes('cash_heavy'),
			// Derived from businessVintage
			business_3plus_years: ['3_5', '5_10', 'over_10'].includes(vintage ?? ''),
			// From operationalIndicators
			has_factory_or_warehouse: opIndicators.includes('owns_premises'),
			has_inventory: opIndicators.includes('maintains_inventory'),
			has_other_income_source: opIndicators.includes('additional_income'),
			seasonal_business: opIndicators.includes('seasonal'),
			very_few_clients: opIndicators.includes('key_clients'),
			// Not captured by new UI — default false
			has_saving_account: false,
			profit_last_3_years: false,
			profit_since_starting: false,
			two_years_experience_before_business: false,
			use_savingAccount_family: false
		};

		// GSTRegistrationYear: CompanyBusinessProfile captures gstRegistered (yes/no/exempted)
		// but NOT the actual registration year. The financialsTable showWhen gates on
		// GSTRegistrationYear != ''. Use a synthetic non-empty value when GST is
		// registered so the gate passes. CustomIncomeTable uses it for fiscal year
		// column count — a synthetic value defaults to showing all 3 years.
		const gstRegYear = activityObj.gst_registered ? '2020-01' : '';

		return {
			businessActivityDetailsValidate: businessProfileComplete,
			businessActivityDetailsVisible: activityObj,
			businessActivityDetails: activityObj,
			GSTRegistrationYear: gstRegYear
		};
	});

	/** Full context for shouldShow — merges local answers + bridge fields */
	const bridgedShowWhenContext = $derived({
		...answers,
		...formState.applicationData,
		...bridgeFields
	});

	// ── Sync bridge fields into local answers for CustomIncomeTable ──
	// CustomIncomeTable reads `answers.businessActivityDetails.gst_registered` directly
	// via bind:answers, so we must write bridge fields into the local answers object.
	$effect(() => {
		if (!isHydrated) return;
		const bf = bridgeFields;
		if (!bf.businessActivityDetailsValidate) return;
		// Only write if actually changed (prevent infinite loop)
		const current = answers?.businessActivityDetailsValidate;
		const currentGst = answers?.GSTRegistrationYear;
		if (
			current === bf.businessActivityDetailsValidate &&
			currentGst === bf.GSTRegistrationYear &&
			JSON.stringify(answers?.businessActivityDetails) ===
				JSON.stringify(bf.businessActivityDetails)
		) {
			return;
		}
		answers = {
			...answers,
			businessActivityDetails: bf.businessActivityDetails,
			businessActivityDetailsVisible: bf.businessActivityDetailsVisible,
			businessActivityDetailsValidate: bf.businessActivityDetailsValidate,
			GSTRegistrationYear: answers?.GSTRegistrationYear || bf.GSTRegistrationYear
		};
	});

	// Must be $derived — loanName may not be set when the component first mounts
	const isSecured = $derived(
		['Home Loan', 'Plot Loan', 'Loan Against Property'].includes(
			(formState.applicationData.loanName ?? '') as any
		)
	);

	onMount(() => {
		const applicant = (formState.applicants as any[])[selectedIndex];
		if (!applicant) return;
		answers = securedClone(applicant);
		lastemploymentType = answers?.employmentType ?? null;

		const savedProfile = incomeProfileStore.getProfile(selectedIndex, 'Company');
		if (savedProfile) Object.assign(answers, savedProfile.data);
		isHydrated = true;
		initializeNumberWords();
	});

	$effect(() => {
		return () => {
			if (isHydrated && answers?.applicantType === 'company') {
				incomeProfileStore.saveProfile(selectedIndex, 'Company', answers);
			}
		};
	});

	// ── Unified answers → formState sync ─────────────────────────────────
	//
	// WHY THIS EXISTS:
	// onMount clones the store into local `answers` (securedClone breaks the
	// bind:answers prop binding).  From that point `answers` is local-only.
	// submitForm() writes everything back, BUT it only runs when the "Submit"
	// button is clicked — which only appears for secured loans (isSecured).
	//
	// For unsecured loans (Personal Loan, Business Loan) submitForm() is
	// NEVER called, so any field not synced here is missing from the final
	// submission payload (payloadBuilder reads from formState, not answers).
	//
	// FIELDS REQUIRED BY payloadBuilder.ts (Company branch):
	//   companyType, companySelectedAge, businessType, GSTRegistrationYear,
	//   businessActivityDetailsVisible  ← what payloadBuilder actually reads
	//   businessActivityDetailsValidate ← for completion tracking
	//   financialsTableVisible          ← what payloadBuilder actually reads
	//   financialsTableValidate         ← for completion tracking
	//   averageBankBalance, cashAmount
	//   creditScore, whyPrimaryLowCreditVisible, whyPrimaryLowCreditValidate
	//   ObligationsRunning, tableLoanEntries, tableLimitEntries
	//
	// STRATEGY: derive each field as a reactive $derived so the $effect
	// re-runs whenever any of them change.  checkAndAdd is untracked so
	// reading the store doesn't create a reactive dependency.

	const _sync_companyType = $derived(answers?.companyType);
	const _sync_companySelectedAge = $derived(answers?.companySelectedAge);
	const _sync_businessType = $derived(answers?.businessType);
	const _sync_GSTRegistrationYear = $derived(answers?.GSTRegistrationYear);
	const _sync_businessActivityDetailsValidate = $derived(answers?.businessActivityDetailsValidate);
	const _sync_businessActivityDetailsVisible = $derived(answers?.businessActivityDetailsVisible);
	const _sync_financialsTableValidate = $derived(answers?.financialsTableValidate);
	const _sync_financialsTableVisible = $derived(answers?.financialsTableVisible);
	const _sync_averageBankBalance = $derived(answers?.averageBankBalance);
	const _sync_cashAmount = $derived(answers?.cashAmount);
	const _sync_creditScore = $derived(answers?.creditScore);
	const _sync_whyPrimaryLowCreditValidate = $derived(answers?.whyPrimaryLowCreditValidate);
	const _sync_whyPrimaryLowCreditVisible = $derived(answers?.whyPrimaryLowCreditVisible);
	const _sync_ObligationsRunning = $derived(answers?.ObligationsRunning);
	const _sync_tableLoanEntries = $derived(answers?.tableLoanEntries);
	const _sync_tableLimitEntries = $derived(answers?.tableLimitEntries);

	$effect(() => {
		if (!isHydrated) return;

		// Reading all reactive sources (establishes tracking dependencies)
		const snapshot: Record<string, any> = {
			companyType: _sync_companyType,
			companySelectedAge: _sync_companySelectedAge,
			businessType: _sync_businessType,
			GSTRegistrationYear: _sync_GSTRegistrationYear,
			businessActivityDetailsValidate: _sync_businessActivityDetailsValidate,
			businessActivityDetailsVisible: _sync_businessActivityDetailsVisible,
			financialsTableValidate: _sync_financialsTableValidate,
			financialsTableVisible: _sync_financialsTableVisible,
			averageBankBalance: _sync_averageBankBalance,
			cashAmount: _sync_cashAmount,
			creditScore: _sync_creditScore,
			whyPrimaryLowCreditValidate: _sync_whyPrimaryLowCreditValidate,
			whyPrimaryLowCreditVisible: _sync_whyPrimaryLowCreditVisible,
			ObligationsRunning: _sync_ObligationsRunning,
			tableLoanEntries: _sync_tableLoanEntries,
			tableLimitEntries: _sync_tableLimitEntries
		};

		// Compare against store without creating reactive dependency on it
		const storeApplicant = untrack(() => (formState.applicants as any[])[selectedIndex]);

		const updates: Record<string, any> = {};
		let hasChanges = false;

		for (const [key, localVal] of Object.entries(snapshot)) {
			if (localVal === undefined) continue; // don't overwrite with undefined
			const storeVal = storeApplicant?.[key];
			if (JSON.stringify(localVal) !== JSON.stringify(storeVal)) {
				updates[key] = localVal;
				hasChanges = true;
			}
		}

		if (hasChanges) {
			const updated = [...untrack(() => formState.applicants)] as any[];
			updated[selectedIndex] = { ...updated[selectedIndex], ...updates };
			formState.replaceApplicants(updated);
		}
	});

	function initializeNumberWords() {
		companyQuestions.forEach((q) => {
			if (q.type === 'number' && q.showNumberInWords && shouldShow(q.showWhen as any, answers)) {
				const value = answers[q.key];
				if (value !== null && value !== undefined && !isNaN(value)) {
					numberWordsMap = { ...numberWordsMap, [q.id as string]: toWords.convert(value) };
				}
			}
		});
	}

	function toNumber(val: any): number {
		if (val === null || val === undefined) return 0;
		if (typeof val === 'number') return val;
		if (typeof val === 'string') return Number(val.replace(/,/g, ''));
		return 0;
	}

	function validateField(q: Record<string, unknown>, answersLocal: Record<string, unknown>) {
		const key = q.key as string;
		const errKey = key + 'Error';
		const value = answersLocal[key];
		if (q.required && toNumber(value) === 0) {
			answers = { ...answers, [errKey]: 'This field is required' };
			return false;
		}
		const rules = ((q.validation as Record<string, unknown>)?.condition as unknown[]) ?? [];
		const resolve = (obj: unknown): number => {
			if (typeof obj === 'number') return obj;
			if (obj && typeof obj === 'object' && 'var' in obj)
				return toNumber(answers[(obj as { var: string }).var]);
			return 0;
		};
		for (const rule of rules) {
			const ruleObj = rule as Record<string, unknown>;
			const condition = ruleObj.case as Record<string, unknown[]>;
			const ruleErrorKey = Object.keys(ruleObj).find((k: string) => k.endsWith('Error'));
			if (!ruleErrorKey) continue;
			if (condition['<'] && resolve(condition['<'][0]) < resolve(condition['<'][1])) {
				answers = { ...answers, [ruleErrorKey]: ruleObj[ruleErrorKey] };
				return false;
			}
			if (condition['>'] && resolve(condition['>'][0]) > resolve(condition['>'][1])) {
				answers = { ...answers, [ruleErrorKey]: ruleObj[ruleErrorKey] };
				return false;
			}
		}
		if (answers[errKey]) {
			const n = { ...answers };
			delete n[errKey];
			answers = n;
		}
		return true;
	}

	function hasEntries() {
		return (
			answers?.ObligationsRunning === 'No' ||
			(answers?.ObligationsRunning === 'Yes' &&
				(answers.tableLimitEntries?.length > 0 || answers.tableLoanEntries?.length > 0))
		);
	}

	const isComplete = $derived.by(() => {
		if (!isHydrated || schemaDirty) return false;
		// Use bridged context so computeCompletion sees financial questions as visible
		const ctx = bridgedShowWhenContext;
		const basic =
			(formState.applicationData.loanName ?? '') === 'Business Loan'
				? computeCompletion({ questions: companyQuestions, answers: ctx })
				: computeCompletion({ questions: companyQuestions, answers: ctx, extraCheck: hasEntries });
		return basic && businessProfileComplete;
	});

	$effect(() => {
		if (schemaDirty) return;
		const current = isComplete;
		if (current === previousCompletion) return;
		previousCompletion = current;
		const storeVal = untrack(() => (formState.applicants as any[])[selectedIndex]?.__completion);
		if (current === storeVal) return;
		queueMicrotask(() => {
			const latest = (formState.applicants as any[])[selectedIndex]?.__completion;
			if (latest === current) return;
			const upd = [...formState.applicants] as any[];
			upd[selectedIndex] = { ...upd[selectedIndex], __completion: current };
			formState.replaceApplicants(upd);
		});
	});

	function submitForm() {
		if (!isComplete) return;
		const updated = [...formState.applicants] as any[];
		updated[selectedIndex] = {
			...updated[selectedIndex],
			...answers,
			companyCompletion: true,
			__completion: true
		};
		formState.replaceApplicants(updated);
		schemaDirty = false;
		showmodal = false; // closes WideModal via $bindable; no-op when rendered inline
		onSubmit?.(); // parent cleanup (e.g. IncomePageNew.closeModal state reset)
	}

	function handleTableUpdate(data: { questionId: string; value: any }) {
		answers[data.questionId] = data.value;
	}

	function handleTableValidate(data: { questionId: string; valid: boolean }) {
		answers[data.questionId + 'Validate'] = data.valid;
	}

	// ── Tab system ────────────────────────────────────────────────────────
	const TAB_IDS = {
		BUSINESS: 'business_profile',
		FINANCIALS: 'financials_credit',
		LOANS: 'loans_directors'
	} as const;

	const QUESTION_TAB: Record<string, string> = {
		// NOTE: businessType, GSTRegistrationYear, businessActivityDetails, and companySelectedAge
		// have moved to CompanyBusinessProfile (Tab 1). They are no longer driven by JSON questions.
		q5_financialsTable: TAB_IDS.FINANCIALS,
		q_averageBankBalance: TAB_IDS.FINANCIALS,
		q_cashAmount: TAB_IDS.FINANCIALS,
		q_creditScore: TAB_IDS.FINANCIALS,
		q_whyPrimaryLowCredit: TAB_IDS.FINANCIALS,
		q_Obligation: TAB_IDS.FINANCIALS
	};

	function getQuestionsForTab(tabId: string) {
		return companyQuestions.filter((q) => QUESTION_TAB[q.id] === tabId);
	}

	function isQuestionAnswered(q: (typeof companyQuestions)[0]): boolean {
		let key: string;
		if (q.type === 'multiple-select') {
			key =
				q.key === 'whyPrimaryLowCredit'
					? 'whyPrimaryLowCreditValidate'
					: q.key === 'businessActivityDetails'
						? 'businessActivityDetailsValidate'
						: `${q.key}Validate`;
		} else if (q.type === 'table') {
			key = `${q.key}Validate`;
		} else {
			key = q.key;
		}
		const v = answers?.[key];
		if (v === undefined || v === null) return false;
		if (typeof v === 'string' && !v.trim()) return false;
		if (typeof v === 'boolean' && !v) return false;
		return true;
	}

	const hasObligations = $derived(answers?.ObligationsRunning === 'Yes');
	const obligationsSet = $derived(
		!!answers?.ObligationsRunning && answers?.ObligationsRunning !== ''
	);
	// Show Tab 3 only when company has obligations (directors now in Step 0.5)
	const showTab3 = $derived(obligationsSet && hasObligations);

	// Tab 1 completion: card-style business profile fields (CompanyBusinessProfile)
	let businessProfileComplete = $state(false);
	const tab1Complete = $derived(businessProfileComplete);

	// Tab 2 completion: financials questions + ObligationsRunning answered
	const tab2Complete = $derived.by(() => {
		const qs = getQuestionsForTab(TAB_IDS.FINANCIALS);
		const visible = qs.filter((q) => shouldShow(q.showWhen as any, bridgedShowWhenContext));
		const required = visible.filter((q) => q.required);
		return required.length > 0 && required.every((q) => isQuestionAnswered(q)) && obligationsSet;
	});

	// Tab 3 completion: loans filled (if has obligations)
	// Directors are now captured in Step 0.5 (DirectorCards)
	const tab3Complete = $derived.by(() => {
		if (!showTab3) return true;
		const loansOk =
			!hasObligations ||
			answers?.tableLoanEntries?.length > 0 ||
			answers?.tableLimitEntries?.length > 0;
		return loansOk;
	});

	const tabs = $derived.by(() => {
		const all = [
			{ id: TAB_IDS.BUSINESS, label: 'Business Profile', complete: tab1Complete },
			{ id: TAB_IDS.FINANCIALS, label: 'Financials & Credit', complete: tab2Complete },
			{ id: TAB_IDS.LOANS, label: 'Existing Loans', complete: tab3Complete }
		];
		return all.filter((t) => t.id !== TAB_IDS.LOANS || showTab3);
	});

	let activeTab = $state<string>(TAB_IDS.BUSINESS);
	const currentTab = $derived(externalTab ?? activeTab);

	function isTabLocked(tabId: string): boolean {
		const idx = tabs.findIndex((t) => t.id === tabId);
		for (let i = 0; i < idx; i++) {
			if (!tabs[i].complete) return true;
		}
		return false;
	}

	function handleTabChange(tabId: string) {
		if (!isTabLocked(tabId)) activeTab = tabId;
	}

	function canGoToPreviousTab() {
		return tabs.findIndex((t) => t.id === currentTab) > 0;
	}
	function canGoToNextTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		return idx < tabs.length - 1 && !isTabLocked(tabs[idx + 1].id);
	}
	function goToPreviousTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		if (idx > 0) activeTab = tabs[idx - 1].id;
	}
	function goToNextTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		if (idx < tabs.length - 1 && !isTabLocked(tabs[idx + 1].id)) activeTab = tabs[idx + 1].id;
	}

	// Auto-advance when current tab becomes complete
	let lastTabSnapshot = '';
	$effect(() => {
		const snapshot = tabs.map((t) => `${t.id}:${t.complete}`).join(',');
		if (snapshot === lastTabSnapshot || externalTab) return;
		const prev = lastTabSnapshot;
		lastTabSnapshot = snapshot;
		if (!prev) return;
		const curIdx = tabs.findIndex((t) => t.id === activeTab);
		if (tabs[curIdx]?.complete) {
			const next = tabs[curIdx + 1];
			if (next && !isTabLocked(next.id)) activeTab = next.id;
		}
	});
</script>

{#snippet questionField(q: (typeof companyQuestions)[0])}
	{#if shouldShow(q.showWhen as any, bridgedShowWhenContext)}
		<div class="field-row">
			{#if q.type !== 'multiple-select'}
				<p class="field-label {visibleKey.includes(q.key) ? '!text-red-500' : ''}">
					{q.question}
					{#if q.required}<span class="ml-0.5 text-red-400">*</span>{/if}
				</p>
			{/if}

			{#if q.type === 'multiple-select'}
				<div>
					<p class="field-label mb-2.5">
						{q.question}
						{#if q.required}<span class="ml-0.5 text-red-400">*</span>{/if}
					</p>
					<MultiOptionsSelection options={q.options} bind:answers questionId={q.key} compact />
				</div>
			{:else if q.type === 'number'}
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
				{#each Object.entries(answers) as [k, v]}
					{#if k.startsWith(q.key) && k.endsWith('Error') && touchedFields[q.key]}
						<p class="mt-1 text-xs text-red-500">{v}</p>
					{/if}
				{/each}
			{:else if q.type === 'radio'}
				<RadioCustom
					options={q.options}
					value={answers[q.key]}
					gridClass="grid grid-cols-1 sm:grid-cols-2 gap-3"
					onchange={(val) => {
						if (answers[q.key] !== val) answers = { ...answers, [q.key]: val };
					}}
				/>
			{:else if q.type === 'table'}
				<CustomIncomeTable
					bind:answers
					questionId={q.key}
					onUpdate={handleTableUpdate}
					onValidate={handleTableValidate}
				/>
			{:else if q.type === 'calendar' || q.type === 'month-year'}
				<DatePickerYearAndMonth
					id={q.id}
					questionId={q.key}
					value={answers[q.key]}
					applicantIndex={selectedIndex}
					minYear={q.minYear ?? null}
					introduceMonthIndia={q.introduceMonthIndia ?? null}
					onchange={(e) => {
						if (answers[q.key] !== e.detail) answers = { ...answers, [q.key]: e.detail };
					}}
				/>
			{/if}
		</div>
	{/if}
{/snippet}

<div class="company-wrapper">
	<!-- ── Stepper (same ModalTabs as Individual) ────────────────── -->
	<ModalTabs {tabs} activeTab={currentTab} onTabChange={handleTabChange} />

	<!-- ── Tab Content ───────────────────────────────────────────── -->
	<div class="tab-body">
		<!-- ════════════════════════════════════════════════════════ -->
		<!-- TAB 1 — Business Profile (card-style)                    -->
		<!-- ════════════════════════════════════════════════════════ -->
		{#if currentTab === TAB_IDS.BUSINESS}
			<CompanyBusinessProfile
				applicantIndex={selectedIndex}
				onComplete={(isComplete) => {
					businessProfileComplete = isComplete;
				}}
				{loanCategory}
				{businessEntityType}
				{professionalCategory}
			/>

			<!-- ════════════════════════════════════════════════════════ -->
			<!-- TAB 2 — Financials & Credit                              -->
			<!-- ════════════════════════════════════════════════════════ -->
		{:else if currentTab === TAB_IDS.FINANCIALS}
			<div class="tab-section">
				<div class="tab-header">
					<div class="tab-icon" style="--icon-color: #8b5cf6">
						<TrendingUp class="h-4 w-4" />
					</div>
					<div>
						<h3 class="tab-title">Financials & Credit</h3>
						<p class="tab-desc">
							Financial statements, bank balances, credit score, and loan obligations.
						</p>
					</div>
				</div>

				<div class="fields-stack">
					{#each getQuestionsForTab(TAB_IDS.FINANCIALS) as q}
						{@render questionField(q)}
					{/each}
				</div>
			</div>

			<!-- ════════════════════════════════════════════════════════ -->
			<!-- TAB 3 — Existing Loans (if obligations)                  -->
			<!-- ════════════════════════════════════════════════════════ -->
		{:else if currentTab === TAB_IDS.LOANS}
			<div class="tab-section">
				<div class="tab-header">
					<div class="tab-icon" style="--icon-color: #f59e0b">
						<FileText class="h-4 w-4" />
					</div>
					<div>
						<h3 class="tab-title">Existing Loans</h3>
						<p class="tab-desc">
							All running loans and limits the company is a borrower or co-borrower on.
						</p>
					</div>
				</div>

				<!-- Existing Loans block -->
				{#if hasObligations}
					<div class="sub-block">
						<div class="sub-block-header">
							<FileText class="h-3.5 w-3.5" />
							<span>Running Loans & Credit Limits</span>
						</div>
						<ExistingLoanDetails idx={selectedIndex} bind:answers />
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ── Prev / Next nav ───────────────────────────────────────── -->
	{#if !externalTab}
		<div class="tab-nav">
			{#if canGoToPreviousTab()}
				<button type="button" class="nav-btn nav-prev" onclick={goToPreviousTab}>
					<ChevronLeft class="h-4 w-4" /><span>Previous</span>
				</button>
			{:else}
				<div></div>
			{/if}

			{#if tabs.findIndex((t) => t.id === currentTab) < tabs.length - 1}
				<button
					type="button"
					class="nav-btn {canGoToNextTab() ? 'nav-next-on' : 'nav-next-off'}"
					onclick={goToNextTab}
					disabled={!canGoToNextTab()}
				>
					<span>Next</span><ChevronRight class="h-4 w-4" />
				</button>
			{:else if tabs.findIndex((t) => t.id === currentTab) === tabs.length - 1}
				<button
					type="button"
					onclick={submitForm}
					disabled={!isComplete}
					class="nav-btn {isComplete ? 'nav-submit' : 'nav-next-off'}"
				>
					<span>{isComplete ? 'Submit' : 'Fill all fields'}</span>
					{#if isComplete}<ChevronRight class="h-4 w-4" />{/if}
				</button>
			{:else}
				<div></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ── Wrapper ─────────────────────────────────────────────────── */
	.company-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.tab-body {
		min-height: 16rem;
	}

	/* ── Section scaffold ────────────────────────────────────────── */
	.tab-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-top: 0.25rem;
	}

	.tab-header {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		padding-bottom: 0.875rem;
		border-bottom: 1px solid var(--form-border);
	}

	.tab-icon {
		width: 2.125rem;
		height: 2.125rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 0.1rem;
		color: var(--icon-color, var(--trial-accent));
		background: color-mix(in srgb, var(--icon-color, var(--trial-accent)) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--icon-color, var(--trial-accent)) 25%, transparent);
	}

	.tab-title {
		font-family: var(--font-titleBold, sans-serif);
		font-size: 0.9375rem;
		color: var(--form-text);
		margin: 0;
		line-height: 1.3;
	}

	.tab-desc {
		font-family: var(--font-paragraph, sans-serif);
		font-size: 0.75rem;
		color: var(--form-text-secondary);
		margin: 0.2rem 0 0;
		line-height: 1.5;
	}

	/* ── Fields ──────────────────────────────────────────────────── */
	.fields-stack {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-family: var(--font-titleMedium, sans-serif);
		font-size: 0.8125rem;
		color: var(--form-text);
		line-height: 1.45;
	}

	/* ── Sub blocks (inside Tab 3) ───────────────────────────────── */
	.sub-block {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border: 1px solid var(--form-border);
		border-radius: 0.875rem;
		padding: 1rem;
		background: var(--form-bg-alt);
	}

	.sub-block-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-titleBold, sans-serif);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--form-text-secondary);
		padding-bottom: 0.625rem;
		border-bottom: 1px solid var(--form-border);
	}

	/* ── Nav row ─────────────────────────────────────────────────── */
	.tab-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1.25rem;
		margin-top: 0.5rem;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.625rem 1.125rem;
		border-radius: 0.75rem;
		font-family: var(--font-titleMedium, sans-serif);
		font-size: 0.875rem;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 44px;
	}

	.nav-btn:active {
		transform: scale(0.98);
	}

	.nav-prev {
		background: var(--form-bg-alt);
		color: var(--form-text-secondary);
	}
	.nav-prev:hover {
		background: var(--form-border);
	}

	.nav-next-on {
		background: linear-gradient(135deg, #78716c, #737373);
		color: #fff;
		box-shadow: 0 2px 8px rgba(120, 113, 108, 0.3);
	}
	.nav-next-on:hover {
		background: linear-gradient(135deg, #6b6560, #666);
		box-shadow: 0 4px 12px rgba(120, 113, 108, 0.35);
	}

	.nav-next-off {
		background: var(--form-bg-alt);
		color: var(--form-text-muted);
		cursor: not-allowed;
	}

	.nav-submit {
		background: linear-gradient(135deg, var(--trial-accent), #ddbea9);
		color: #fff;
		box-shadow: 0 2px 8px rgba(203, 153, 126, 0.35);
	}
	.nav-submit:hover {
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.45);
	}
</style>
