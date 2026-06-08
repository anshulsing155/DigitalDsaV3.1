<script lang="ts">
	/**
	 * Company.svelte — 5-Tab Company Applicant Wizard (Refactored)
	 * ═══════════════════════════════════════════════════════════════════
	 * Uses existing patterns: bind:applicantData, centralized completion,
	 * reuses CreditScoreSection + UnsecuredObligation (same as Individual).
	 *
	 * Tab 1: Business Identity — CompanyBusinessProfile
	 * Tab 2: Business Character — CompanyCharacterTab
	 * Tab 3: Income (4 mediums) — CompanyIncomeTab
	 * Tab 4: CIBIL — CreditScoreSection (reused from Individual)
	 * Tab 5: Obligations — UnsecuredObligation (reused from Individual)
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import { formState } from '$lib/state/form.svelte';
	import { onMount, untrack, tick } from 'svelte';
	import ModalTabs from './ModalTabs.svelte';
	import CompanyBusinessProfile from './CompanyBusinessProfile.svelte';
	import CompanyCharacterTab from './CompanyCharacterTab.svelte';
	import CompanyIncomeTab from './CompanyIncomeTab.svelte';
	import CreditScoreSection from './CreditScoreSection.svelte';
	import ObligationCapture from './ObligationCapture.svelte';
	import { ChevronLeft, ChevronRight } from '$lib/utils/iconRegistry';
	import { createEmptyCompanyIncome } from '$lib/types/companyIncome';
	import { computeCompanyCompletion } from '$lib/utils/incomeTabState';
	import { createModalAutoScroll } from '$lib/utils/modalAutoScroll';
	import {
		IDENTITY_QUESTIONS,
		CHARACTER_COMMON_QUESTIONS,
		CHARACTER_CONDITIONAL_QUESTIONS,
		getCategorySections
	} from '$lib/config/companyProfile/questions';
	import type { BusinessCategoryEntry } from '$lib/types/companyIncome';
	import { runCrossFieldValidation } from '$lib/utils/crossStepValidator';
	import CrossFieldWarningBanner from './CrossFieldWarningBanner.svelte';
	import { detachOrphanDirector } from '$lib/utils/detachOrphanDirector';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		selectedIndex?: number;
		showmodal?: boolean;
		answers?: any;
		modalActiveTab?: string;
		onSubmit?: () => void;
		loanCategory?: 'personal' | 'business' | 'professional';
		businessEntityType?: string;
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

	// ── Applicant Data — single source of truth ─────────────────────
	// Direct reference to formState applicant, passed down via bind:
	let applicantData = $derived(formState.applicants[selectedIndex] ?? {});

	let isHydrated = $state(false);
	let previousCompletion: boolean | null = $state(null);

	// ── Hydration (ensure companyIncome exists) ──────────────────────
	onMount(() => {
		const applicant = (formState.applicants as any[])[selectedIndex];
		if (!applicant) return;

		if (!applicant.companyIncome) {
			const updated = [...formState.applicants] as any[];
			updated[selectedIndex] = {
				...updated[selectedIndex],
				companyIncome: migrateOldIncomeData(applicant)
			};
			formState.replaceApplicants(updated);
		}

		isHydrated = true;
	});

	/** Migrate old flat financial fields to new companyIncome structure */
	function migrateOldIncomeData(applicant: Record<string, unknown>) {
		const income = createEmptyCompanyIncome();
		const table = applicant.financialsTable as any;
		if (table) {
			const currentYear = new Date().getFullYear();
			const count = Math.max(
				table.netProfitArray?.length ?? 0,
				table.depreciationArray?.length ?? 0,
				table.turnOverArray?.length ?? 0,
				3
			);
			for (let i = 0; i < count; i++) {
				const fy = `${currentYear - count + i}-${(currentYear - count + i + 1).toString().slice(-2)}`;
				income.itr.years.push({
					year: fy,
					netProfit: Number(table.netProfitArray?.[i]) || undefined,
					depreciation: Number(table.depreciationArray?.[i]) || undefined,
					grossReceipts: Number(table.turnOverArray?.[i]) || undefined,
					itrFiled: table.itrFiled?.[i] ?? false
				});
			}
		}
		if (applicant.averageBankBalance) {
			income.banking.avgBalance = Number(applicant.averageBankBalance) || undefined;
		}
		if (applicant.cashAmount) {
			income.cash.dailySales = Number(applicant.cashAmount) || undefined;
		}
		return income;
	}

	// ── Tab System ───────────────────────────────────────────────────
	const TAB_IDS = {
		IDENTITY: 'identity',
		CHARACTER: 'character',
		INCOME: 'income',
		CIBIL: 'credit_score',
		OBLIGATIONS: 'obligations_details'
	} as const;

	// Centralized completion — derived from applicant data, no callbacks
	const completion = $derived(computeCompanyCompletion(applicantData));

	const tabs = $derived([
		{ id: TAB_IDS.IDENTITY, label: 'Business Identity', complete: completion.identity ?? false },
		{ id: TAB_IDS.CHARACTER, label: 'Business Character', complete: completion.character ?? false },
		{ id: TAB_IDS.INCOME, label: 'Income', complete: completion.income ?? false },
		{ id: TAB_IDS.CIBIL, label: 'CIBIL', complete: completion.credit_score ?? false },
		{
			id: TAB_IDS.OBLIGATIONS,
			label: 'Obligations',
			complete: completion.obligations_details ?? false
		}
	]);

	let activeTab = $state<string>(TAB_IDS.IDENTITY);
	const currentTab = $derived(externalTab ?? activeTab);

	function isTabLocked(tabId: string): boolean {
		const idx = tabs.findIndex((t) => t.id === tabId);
		for (let i = 0; i < idx; i++) {
			if (!tabs[i].complete) return true;
		}
		return false;
	}

	// ── Auto-scroll (adapted from form pages for modal context) ─────
	const autoScroll = createModalAutoScroll();

	async function smartScrollForTab(tabId: string) {
		const isComplete = completion[tabId] ?? false;
		// Wait for Svelte render + DOM settle
		await tick();
		await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
		await new Promise<void>((r) => setTimeout(r, 80));

		const modalEl = document.querySelector('[data-modal-scroll]') as HTMLElement | null;
		if (!modalEl) return;

		if (isComplete) {
			// Tab complete — scroll to bottom so Next is visible
			modalEl.scrollTop = modalEl.scrollHeight;
		} else {
			// Look for first unanswered field — only scroll to top if the tab is truly empty
			const emptyField = modalEl.querySelector(
				'input:placeholder-shown:not([disabled]), .field-input-error'
			) as HTMLElement | null;

			if (emptyField) {
				emptyField.scrollIntoView({ behavior: 'smooth', block: 'center' });
			} else {
				modalEl.scrollTop = 0;
			}
		}
	}

	function handleTabChange(tabId: string) {
		if (!isTabLocked(tabId)) {
			activeTab = tabId;
			smartScrollForTab(tabId);
		}
	}

	// Identity tab auto-scroll
	const identityKeys = ['businessCategories', ...IDENTITY_QUESTIONS.map((q) => q.key)];

	// Character tab auto-scroll (common + conditional + category-specific deep profile)
	const characterBaseKeys = [
		...CHARACTER_COMMON_QUESTIONS.map((q) => q.key),
		...CHARACTER_CONDITIONAL_QUESTIONS.map((q) => q.key)
	];

	$effect(() => {
		if (currentTab === TAB_IDS.IDENTITY) {
			const answers: Record<string, unknown> = {};
			for (const key of identityKeys) answers[key] = applicantData[key];
			autoScroll.update(identityKeys, answers);
		} else if (currentTab === TAB_IDS.CHARACTER) {
			// Build dynamic keys: common + conditional + category-specific deep profile
			const categories = (applicantData.businessCategories as BusinessCategoryEntry[]) ?? [];
			const catSections = getCategorySections(categories.map((c) => c.category));
			const deepKeys = catSections.flatMap((s) => s.questions.map((q) => q.key));
			const allCharKeys = [...characterBaseKeys, ...deepKeys];

			// Answers: common/conditional from applicantData, deep profile from applicantData.deepProfile
			const deepProfile = (applicantData.deepProfile as Record<string, unknown>) ?? {};
			const answers: Record<string, unknown> = {};
			for (const key of characterBaseKeys) answers[key] = applicantData[key];
			for (const key of deepKeys) answers[key] = deepProfile[key];

			autoScroll.update(allCharKeys, answers);
		}
	});

	function canGoToPreviousTab() {
		return tabs.findIndex((t) => t.id === currentTab) > 0;
	}
	function canGoToNextTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		return idx < tabs.length - 1 && !isTabLocked(tabs[idx + 1].id);
	}
	function goToPreviousTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		if (idx > 0) {
			activeTab = tabs[idx - 1].id;
			smartScrollForTab(tabs[idx - 1].id);
		}
	}
	function goToNextTab() {
		const idx = tabs.findIndex((t) => t.id === currentTab);
		if (idx < tabs.length - 1 && !isTabLocked(tabs[idx + 1].id)) {
			activeTab = tabs[idx + 1].id;
			smartScrollForTab(tabs[idx + 1].id);
		}
	}

	// ── Cross-field warnings (shown inside modal on CIBIL / Obligations tabs) ──
	// Pure derived — same inputs always give same outputs. Runs only when
	// applicantData changes, not on every render.
	//
	// Pass the FULL applicant array so cross-applicant checks (e.g. the NBFC
	// single-applicant warning, no_primary_borrower) evaluate against the real
	// applicant count. Previously we passed [selectedApplicant] alone, which
	// made cross-applicant checks see length=1 and fire incorrectly even when
	// 2+ applicants existed. Filter back down to either (a) warnings about
	// the currently-edited applicant or (b) cross-applicant warnings
	// (applicantIndex = -1) which should always show. Detected 2026-05-05.
	const crossWarnings = $derived.by(() => {
		if (!isHydrated) return [];
		const allApplicants = formState.applicants as Record<string, any>[];
		const result = runCrossFieldValidation(
			allApplicants,
			formState.applicationData as Record<string, any>
		);
		return result.warnings.filter(
			(w) => w.applicantIndex === selectedIndex || w.applicantIndex === -1
		);
	});

	// ── Overall Completion ───────────────────────────────────────────
	const isComplete = $derived(isHydrated && Object.values(completion).every(Boolean));

	// Sync __completion to formState (for wizard gate)
	// Uses direct proxy mutation (NOT replaceApplicants) to avoid
	// creating a new object reference that destroys child components.
	$effect(() => {
		if (!isHydrated) return;
		const current = isComplete;
		if (current === previousCompletion) return;
		previousCompletion = current;
		untrack(() => {
			const applicant = (formState.applicants as any[])[selectedIndex];
			if (!applicant || applicant.__completion === current) return;
			// Direct proxy mutation — preserves object identity
			applicant.__completion = current;
			applicant.companyCompletion = current;
			formState.scheduleSave(); // Persist completion change to sessionStorage
		});
	});

	// ── Credit Score Change Handler ──────────────────────────────────
	// Maps CreditScoreSection callback to applicant fields (same as IncomePageNew)
	function handleCreditScoreChange(answers: Record<string, unknown>) {
		const newList = [...formState.applicants] as any[];
		const mapped: Record<string, unknown> = {};
		if ('creditScore' in answers) mapped.creditScore = answers.creditScore;
		if ('whyLowCredit' in answers) mapped.whyPrimaryLowCredit = answers.whyLowCredit;
		if ('creditFactorsAnswered' in answers)
			mapped.creditFactorsAnswered = answers.creditFactorsAnswered;
		if ('creditFactorAnswers' in answers) mapped.creditFactorAnswers = answers.creditFactorAnswers;
		if ('creditFactorReasons' in answers) mapped.creditFactorReasons = answers.creditFactorReasons;
		if ('creditHistoryStatus' in answers) mapped.creditHistoryStatus = answers.creditHistoryStatus;
		if ('emiBounceCount' in answers) mapped.emiBounceCount = answers.emiBounceCount;
		if ('defaultSettlementStatus' in answers)
			mapped.defaultSettlementStatus = answers.defaultSettlementStatus;
		if ('recentEnquiryCount' in answers) mapped.recentEnquiryCount = answers.recentEnquiryCount;
		if ('bounceReason' in answers) mapped.bounceReason = answers.bounceReason;
		if ('defaultReason' in answers) mapped.defaultReason = answers.defaultReason;
		if ('enquiryReason' in answers) mapped.enquiryReason = answers.enquiryReason;
		newList[selectedIndex] = { ...newList[selectedIndex], ...mapped };
		formState.replaceApplicants(newList);
	}

	// ── Pending obligation state (for Submit button auto-save) ──────
	let hasPendingValidObligation = $state(false);
	let obligationCaptureRef: any = $state(null);

	// ── Obligation Update Handler ────────────────────────────────────
	function handleObligationUpdate(data: Record<string, any>) {
		const newList = [...formState.applicants] as any[];
		newList[selectedIndex] = { ...newList[selectedIndex], ...data };
		formState.replaceApplicants(newList);
	}

	async function submitForm() {
		// Auto-save pending obligation before checking completion
		if (hasPendingValidObligation) {
			obligationCaptureRef?.commitPendingEntry?.();
			await tick();
		}
		// Cross-field findings are advisory: Submit checks completeness only.
		// Errors live in `globalRoleError` upstream (filtered by page ownership);
		// `crossWarnings` here are `severity: 'warning'` advisories that should
		// inform the DSA without blocking. Detected 2026-05-04: an LAP case was
		// stuck on "Fix data issues first" because a misclassified NBFC warning
		// fired and blocked Submit.
		if (!isComplete) return;
		showmodal = false;
		onSubmit?.();
	}
</script>

<div class="company-wrapper">
	<!-- ── Tab Navigation ────────────────────────────────────────── -->
	<ModalTabs {tabs} activeTab={currentTab} onTabChange={handleTabChange} />

	<!-- ── Tab Content — {#if} switching (same as Individual) ──── -->
	<div class="flex flex-col gap-4 pt-2">
		{#if currentTab === TAB_IDS.IDENTITY}
			<CompanyBusinessProfile
				bind:applicantData={formState.applicants[selectedIndex]}
				applicantIndex={selectedIndex}
				{loanCategory}
			/>
		{:else if currentTab === TAB_IDS.CHARACTER}
			<CompanyCharacterTab bind:applicantData={formState.applicants[selectedIndex]} />
		{:else if currentTab === TAB_IDS.INCOME}
			<CompanyIncomeTab bind:applicantData={formState.applicants[selectedIndex]} />
		{:else if currentTab === TAB_IDS.CIBIL}
			<CreditScoreSection
				creditScore={(applicantData.creditScore as string | number) ?? ''}
				whyLowCredit={(applicantData.whyPrimaryLowCredit as string[]) ?? []}
				creditHistoryStatus={(applicantData.creditHistoryStatus as string) ?? ''}
				emiBounceCount={(applicantData.emiBounceCount as string) ?? ''}
				defaultSettlementStatus={(applicantData.defaultSettlementStatus as string) ?? ''}
				recentEnquiryCount={(applicantData.recentEnquiryCount as string) ?? ''}
				bounceReason={(applicantData.bounceReason as string) ?? ''}
				defaultReason={(applicantData.defaultReason as string) ?? ''}
				enquiryReason={(applicantData.enquiryReason as string) ?? ''}
				creditFactorAnswers={(applicantData.creditFactorAnswers as Record<string, 'Yes' | 'No'>) ??
					{}}
				creditFactorReasons={(applicantData.creditFactorReasons as Record<
					string,
					string | string[]
				>) ?? {}}
				onAnswerChange={handleCreditScoreChange}
			/>
		{:else if currentTab === TAB_IDS.OBLIGATIONS}
			<ObligationCapture
				bind:this={obligationCaptureRef}
				loanProduct={loanCategory ?? 'business'}
				bind:currentAnswers={formState.applicants[selectedIndex]}
				onupdateApplicant={handleObligationUpdate}
				allApplicants={formState.applicants}
				currentApplicantIndex={selectedIndex}
				loanScope=""
				onObligationsRunningChange={(val) => {
					const newList = [...formState.applicants] as any[];
					newList[selectedIndex] = { ...newList[selectedIndex], ObligationsRunning: val };
					formState.replaceApplicants(newList);
				}}
				onPendingValidChange={(v) => {
					hasPendingValidObligation = v;
				}}
			/>
		{/if}
	</div>

	<!-- ── Cross-field warnings — above nav so user sees before proceeding ── -->
	{#if crossWarnings.length > 0}
		<div class="mt-3">
			<CrossFieldWarningBanner
				warnings={crossWarnings}
				onNavigate={handleTabChange}
				onFixContradiction={detachOrphanDirector}
			/>
		</div>
	{/if}

	<!-- ── Prev / Next / Submit ── -->
	{#if !externalTab}
		<div class="mt-4 flex items-center justify-between border-t border-[var(--form-border)] pt-3">
			{#if canGoToPreviousTab()}
				<button
					type="button"
					class="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--form-bg-alt)] px-5 py-2.5
						font-titleMedium text-sm text-[var(--form-text)]
						transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
					onclick={goToPreviousTab}
				>
					<ChevronLeft class="h-4 w-4" />
					<span>Previous</span>
				</button>
			{:else}
				<div></div>
			{/if}

			{#if tabs.findIndex((t) => t.id === currentTab) < tabs.length - 1}
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 font-titleMedium text-sm
						{canGoToNextTab()
						? 'nav-btn-gradient text-white shadow-[0_4px_12px_rgba(221,190,169,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)]'
						: 'cursor-not-allowed bg-[var(--form-bg-alt)] text-[var(--form-text-muted)] opacity-50'}
						transition-all duration-200 active:scale-[0.98]"
					onclick={goToNextTab}
					disabled={!canGoToNextTab()}
				>
					<span>Next</span>
					<ChevronRight class="h-4 w-4" />
				</button>
			{:else if tabs.findIndex((t) => t.id === currentTab) === tabs.length - 1}
				{@const wouldCompleteWithPending =
					!isComplete &&
					hasPendingValidObligation &&
					Object.entries(completion).every(([k, v]) => k === 'obligations_details' || v)}
				{@const canSubmit = isComplete || wouldCompleteWithPending}
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg px-5 py-2.5 font-titleMedium text-sm
						{canSubmit
						? 'nav-btn-gradient text-white shadow-[0_4px_12px_rgba(221,190,169,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)]'
						: 'cursor-not-allowed bg-[var(--form-bg-alt)] text-[var(--form-text-muted)] opacity-50'}
						transition-all duration-200 active:scale-[0.98]"
					onclick={submitForm}
					disabled={!canSubmit}
				>
					<span>{canSubmit ? 'Submit' : 'Fill all fields'}</span>
					{#if canSubmit}<ChevronRight class="h-4 w-4" />{/if}
				</button>
			{:else}
				<div></div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.company-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Nav gradient (reuse from IncomePageNew) ───────────────────── */
	:global(.nav-btn-gradient) {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500) 0%,
			var(--ddsa-accent-500) 51%,
			var(--ddsa-primary-500) 100%
		);
		background-size: 200% auto;
		transition: all 0.4s ease;
	}

	:global(.nav-btn-gradient:hover:not(:disabled)) {
		background-position: right center;
	}
</style>
