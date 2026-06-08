<script lang="ts">
	/**
	 * IncomeModalContent — Individual Applicant Modal Interior
	 * ═══════════════════════════════════════════════════════════════════
	 * Extracted from IncomePageNew to separate the multi-applicant
	 * modal content from the page orchestrator. Contains:
	 *   - Tab navigation (ModalTabs)
	 *   - NRI info banner
	 *   - Role info banner (collateral / not participating)
	 *   - IncomeTabContent with all income form props
	 *   - Cross-field warning banner
	 *   - Previous / Next / Done navigation buttons
	 * ═══════════════════════════════════════════════════════════════════
	 */

	import ModalTabs from './ModalTabs.svelte';
	import IncomeTabContent from './IncomeTabContent.svelte';
	import CrossFieldWarningBanner from './CrossFieldWarningBanner.svelte';
	import { detachOrphanDirector } from '$lib/utils/detachOrphanDirector';
	import { ChevronLeft, ChevronRight, Check } from '$lib/utils/iconRegistry';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
	import type { Contradiction } from '$lib/utils/crossStepValidator';
	import { areAllTabsComplete } from '$lib/utils/incomeTabState';
	import { needsFullFinancials, type ApplicantDerivedRole } from '$lib/utils/applicantRoleUtils';

	// ── Props ────────────────────────────────────────────────────────
	interface Props {
		applicant: any;
		selectedIndex: number;
		activeTab: string;
		tabs: Array<{ id: string; label: string; complete: boolean }>;
		sectionCompletion: Record<string, boolean>;
		selectedProfiles: IncomeProfileType[];
		answersContext: Record<string, unknown>;
		incomeEntries: IncomeSourceEntry[];
		restorePromptProfiles: IncomeProfileType[];
		editingEntry: IncomeSourceEntry | null;
		lockedProfiles: IncomeProfileType[];
		noIncomeReason: string;
		emiPaidByRequired: boolean;
		loanProduct: string;
		loanScope: string;
		professionalCategory: string;
		isLinkedEntry?: boolean;
		linkedSourceName?: string;
		linkedEntryWarnings?: {
			stakeWarning: string;
			opcWarning: string;
			hasAnyWarning: boolean;
		} | null;
		linkedOtherShareholding?: number;
		/** Firm-name combobox options — passed through to IncomeTabContent/IncomeSourceForm. */
		firmNameOptions?: import('$lib/utils/firmNameOptions').FirmNameOption[];
		modalCrossWarnings: Contradiction[];
		selectedRole: ApplicantDerivedRole | null | undefined;
		hasPendingValidObligation: boolean;
		incomeTabRef?: any;

		// Callbacks
		onTabChange: (id: string) => void;
		onNoIncomeReasonChange: (val: string) => void;
		onProfileSelectionChange: (profiles: IncomeProfileType[]) => void;
		onAddEntry: (entry: IncomeSourceEntry) => void;
		onUpdateEntry: (entry: IncomeSourceEntry) => void;
		onCancelEdit: () => void;
		onEditEntry: (entry: IncomeSourceEntry) => void;
		onDeleteEntry: (entryId: string) => void;
		onRestoreProfile: (profile: IncomeProfileType) => void;
		onDenyRestore: (profile: IncomeProfileType) => void;
		onCreditScoreChange: (answers: Record<string, unknown>) => void;
		onObligationUpdate: (data: Record<string, any>) => void;
		onObligationsRunningChange: (val: string) => void;
		onPendingValidChange: (hasPending: boolean) => void;
		onDoneClick: () => void;

		// Navigation
		canGoToPreviousTab: () => boolean;
		canGoToNextTab: () => boolean;
		goToPreviousTab: () => void;
		goToNextTab: () => void;
		getCurrentTabIndex: () => number;
	}

	let {
		applicant = $bindable({}),
		selectedIndex,
		activeTab,
		tabs,
		sectionCompletion,
		selectedProfiles,
		answersContext,
		incomeEntries,
		restorePromptProfiles,
		editingEntry,
		lockedProfiles,
		noIncomeReason,
		emiPaidByRequired,
		loanProduct,
		loanScope,
		professionalCategory,
		isLinkedEntry = false,
		linkedSourceName = '',
		linkedEntryWarnings = null,
		linkedOtherShareholding = 0,
		firmNameOptions,
		modalCrossWarnings,
		selectedRole,
		hasPendingValidObligation,
		incomeTabRef = $bindable(null),

		onTabChange,
		onNoIncomeReasonChange,
		onProfileSelectionChange,
		onAddEntry,
		onUpdateEntry,
		onCancelEdit,
		onEditEntry,
		onDeleteEntry,
		onRestoreProfile,
		onDenyRestore,
		onCreditScoreChange,
		onObligationUpdate,
		onObligationsRunningChange,
		onPendingValidChange,
		onDoneClick,

		canGoToPreviousTab,
		canGoToNextTab,
		goToPreviousTab,
		goToNextTab,
		getCurrentTabIndex
	}: Props = $props();

	/** Check if all tabs except obligations are complete */
	function allTabsCompleteExceptObligations(completion: Record<string, boolean>): boolean {
		return Object.entries(completion).every(([key, val]) => key === 'obligations_details' || val);
	}
</script>

<!-- Tab Navigation -->
<ModalTabs {tabs} {activeTab} {onTabChange} />

<!-- NRI Info Banner — shown for NRI applicants on income-related tabs -->
{#if applicant?.isNRI === 'Yes' && (activeTab === 'income_profiles' || activeTab === 'income_details')}
	<div
		class="mx-1 mt-2 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30"
	>
		<span class="mt-0.5 shrink-0 text-amber-500">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-amber-800 dark:text-amber-300">
			<strong>NRI applicant:</strong> Only salaried and passive income sources (rental, investment) are
			accepted. Business and professional income cannot be verified by lenders for NRI applicants.
		</p>
	</div>
{/if}

{#if selectedRole && !needsFullFinancials(selectedRole) && !applicant?.applicantClassification}
	<!-- Legacy banner: only shown when new classification is NOT set.
		 New classification banners below handle all cases with better accuracy. -->
	<div
		class="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<span class="mt-0.5 shrink-0">
			<svg
				class="h-4 w-4 text-blue-600 dark:text-blue-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-blue-800 dark:text-blue-300">
			{#if selectedRole === 'collateral'}
				<strong>Collateral only</strong> — this applicant provides property security but is not on the
				loan EMI. Only credit score is required for lender evaluation.
			{:else}
				<strong>Not participating in loan</strong> — no financial details needed.
			{/if}
		</p>
	</div>
{/if}

{#if applicant?.applicantClassification === 'guarantor_financial'}
	<div
		class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
	>
		<span class="mt-0.5 shrink-0">
			<svg
				class="h-4 w-4 text-amber-600 dark:text-amber-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-amber-800 dark:text-amber-200">
			<strong>Guarantor (Financial)</strong> — Income is assessed independently and NOT added to the eligibility
			pool. Lender verifies this person can cover the full EMI if the borrower defaults. CIBIL score must
			be 750+ for most lenders.
		</p>
	</div>
{/if}

{#if applicant?.applicantClassification === 'non_applicant_full_financial'}
	<div
		class="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30"
	>
		<span class="mt-0.5 shrink-0">
			<svg
				class="h-4 w-4 text-orange-600 dark:text-orange-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-orange-800 dark:text-orange-200">
			<strong>Non-Applicant (Full Financial)</strong> — Lender requires complete financial verification
			for this person. Family member not on EMI or property — lenders investigate to verify there is no
			hidden credit risk. Full income and obligation details are needed.
		</p>
	</div>
{/if}

{#if applicant?.applicantClassification === 'non_applicant_cibil_only'}
	<div
		class="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<span class="mt-0.5 shrink-0">
			<svg
				class="h-4 w-4 text-blue-600 dark:text-blue-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-blue-800 dark:text-blue-300">
			<strong>Non-Applicant (KYC & CIBIL)</strong> — Only credit score and identity verification required.
			This person is not on the loan or property — just a CIBIL check for the lender.
		</p>
	</div>
{/if}

{#if applicant?.applicantClassification === 'co_applicant_non_financial'}
	<div
		class="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
	>
		<span class="mt-0.5 shrink-0">
			<svg
				class="h-4 w-4 text-blue-600 dark:text-blue-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg
			>
		</span>
		<p class="font-paragraph text-xs leading-relaxed text-blue-800 dark:text-blue-300">
			<strong>Co-Applicant (Non-Financial)</strong> — On property agreement, credit score is the primary
			assessment. Income is not pooled into eligibility calculation.
		</p>
	</div>
{/if}

<!-- Tab Content -->
<div class="flex flex-col gap-4 pt-2">
	<IncomeTabContent
		bind:this={incomeTabRef}
		{activeTab}
		{selectedProfiles}
		{answersContext}
		{incomeEntries}
		{restorePromptProfiles}
		{editingEntry}
		currentApplicantIndex={selectedIndex}
		bind:applicantData={applicant}
		{loanProduct}
		{lockedProfiles}
		{noIncomeReason}
		{onNoIncomeReasonChange}
		{emiPaidByRequired}
		{professionalCategory}
		{isLinkedEntry}
		{linkedSourceName}
		{linkedEntryWarnings}
		{linkedOtherShareholding}
		{firmNameOptions}
		{onProfileSelectionChange}
		{onAddEntry}
		{onUpdateEntry}
		{onCancelEdit}
		{onEditEntry}
		{onDeleteEntry}
		{onRestoreProfile}
		{onDenyRestore}
		{onCreditScoreChange}
		{onObligationUpdate}
		{loanScope}
		{onObligationsRunningChange}
		{onPendingValidChange}
	/>

	<!-- Cross-field warnings — above nav so user sees before proceeding -->
	{#if modalCrossWarnings.length > 0}
		<div class="mt-1">
			<CrossFieldWarningBanner
				warnings={modalCrossWarnings}
				onNavigate={(tabId) => {
					onTabChange(tabId);
				}}
				onFixContradiction={detachOrphanDirector}
			/>
		</div>
	{/if}

	<!-- Tab Navigation Buttons -->
	<div class="mt-2 flex items-center justify-between pt-4">
		{#if canGoToPreviousTab()}
			<button
				type="button"
				class="flex cursor-pointer items-center gap-2 rounded-lg bg-(--form-bg-alt) px-5 py-2.5
					font-titleMedium text-sm text-(--form-text)
					transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
				onclick={goToPreviousTab}
			>
				<ChevronLeft class="h-4 w-4" />
				<span>Previous</span>
			</button>
		{:else}
			<div></div>
		{/if}

		{#if getCurrentTabIndex() < tabs.length - 1}
			<button
				type="button"
				class="flex items-center gap-2 rounded-lg px-5 py-2.5 font-titleMedium text-sm
					{canGoToNextTab()
					? 'nav-btn-gradient text-white shadow-[0_4px_12px_rgba(221,190,169,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)]'
					: 'cursor-not-allowed bg-(--form-bg-alt) text-(--form-text-muted) opacity-50'}
					transition-all duration-200 active:scale-[0.98]"
				onclick={goToNextTab}
				disabled={!canGoToNextTab()}
			>
				<span>Next</span>
				<ChevronRight class="h-4 w-4" />
			</button>
		{:else}
			{@const allDone = areAllTabsComplete(applicant, sectionCompletion)}
			{@const hasModalWarnings = modalCrossWarnings.length > 0}
			{@const wouldCompleteWithPending =
				!allDone &&
				hasPendingValidObligation &&
				allTabsCompleteExceptObligations(sectionCompletion)}
			{@const canClose = (allDone || wouldCompleteWithPending) && !hasModalWarnings}
			<button
				type="button"
				class="flex items-center gap-2 rounded-lg px-5 py-2.5 font-titleMedium text-sm
					{canClose
					? 'nav-btn-gradient text-white shadow-[0_4px_12px_rgba(221,190,169,0.25)] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(221,190,169,0.35)]'
					: 'cursor-not-allowed bg-(--form-bg-alt) text-(--form-text-muted) opacity-50'}
					transition-all duration-200 active:scale-[0.98]"
				onclick={onDoneClick}
				disabled={!canClose}
			>
				<Check class="h-4 w-4" />
				<span>{canClose ? 'Done' : hasModalWarnings ? 'Fix issues first' : 'Done'}</span>
			</button>
		{/if}
	</div>
</div>
