<script lang="ts">
	/**
	 * IncomeTabContent — Shared tab content for income page tabs.
	 * Used by both single-applicant inline view and multi-applicant modal.
	 */
	import ProfileTabContent from './ProfileTabContent.svelte';
	import IncomeProfileSelector from './IncomeProfileSelector.svelte';
	import IncomeSourceForm from './IncomeSourceForm.svelte';
	import IncomeSourceEntries from './IncomeSourceEntries.svelte';
	import CreditScoreSection from './CreditScoreSection.svelte';
	import ObligationCapture from './ObligationCapture.svelte';
	import { RotateCcw, CircleCheck, CircleAlert } from '$lib/utils/iconRegistry';
	import { getDropdownLabel } from '$lib/config/incomeProfiles';
	import type { IncomeProfileType, IncomeSourceEntry } from '$lib/types/incomeProfile';
	import { hasIncomeData } from '$lib/utils/incomeTabState';
	import type { FirmNameOption } from '$lib/utils/firmNameOptions';

	interface Props {
		activeTab: string;
		selectedProfiles: IncomeProfileType[];
		answersContext: Record<string, unknown>;
		incomeEntries: IncomeSourceEntry[];
		restorePromptProfiles: IncomeProfileType[];
		editingEntry: IncomeSourceEntry | null;
		/** Current applicant data from formState */
		applicantData: Record<string, unknown>;
		/** Loan type from applicationData */
		loanProduct: string;
		/** All applicants array (for UnsecuredObligation) */
		allApplicants?: Record<string, unknown>[];
		/** Current applicant index (for UnsecuredObligation) */
		currentApplicantIndex?: number;
		// Callbacks
		onProfileSelectionChange: (profiles: IncomeProfileType[]) => void;
		onAddEntry: (entry: IncomeSourceEntry) => void;
		onUpdateEntry: (entry: IncomeSourceEntry) => void;
		onCancelEdit: () => void;
		onEditEntry: (entry: IncomeSourceEntry) => void;
		onDeleteEntry: (entryId: string) => void;
		onRestoreProfile: (profileType: IncomeProfileType) => void;
		onDenyRestore: (profileType: IncomeProfileType) => void;
		onCreditScoreChange: (answers: Record<string, unknown>) => void;
		onObligationUpdate: (data: Record<string, any>) => void;
		/** Loan sub-type for DC/BT auto-detection */
		loanScope?: string;
		/** Callback when ObligationsRunning changes on obligations tab */
		onObligationsRunningChange?: (value: string) => void;
		/** Profiles that cannot be deselected (auto-set by loan/entity type) */
		lockedProfiles?: IncomeProfileType[];
		/** Current noIncomeReason value */
		noIncomeReason?: string;
		/** Callback when noIncomeReason changes */
		onNoIncomeReasonChange?: (reason: string) => void;
		/** Whether emiPaidBy is mandatory on every obligation (no income or mismatch) */
		emiPaidByRequired?: boolean;
		/** Professional category from applicant page — auto-fills professionType in income form */
		professionalCategory?: string;
		/** Notifies parent when obligation form has a valid pending entry (for Done button) */
		onPendingValidChange?: (hasPendingValid: boolean) => void;
		/** true when editing entry is linked to another applicant's same-company entry */
		isLinkedEntry?: boolean;
		/** Name of the applicant whose entry this was linked from */
		linkedSourceName?: string;
		/** Cross-applicant validation warnings for linked entries */
		linkedEntryWarnings?: {
			stakeWarning: string;
			opcWarning: string;
			hasAnyWarning: boolean;
		} | null;
		/** Other co-applicants' total shareholding at same company (for real-time preview) */
		linkedOtherShareholding?: number;
		/**
		 * Firm-name suggestion list — passed through to IncomeSourceForm.
		 * Computed by the page-level mount (IncomePageNew) from formState.applicants.
		 * When undefined, the partner-firm field falls back to plain TextField.
		 */
		firmNameOptions?: FirmNameOption[];
	}

	let obligationCaptureRef: any = $state(null);

	/** Called by parent before modal close — commits pending obligation if valid */
	export function commitPendingObligation(): boolean {
		return obligationCaptureRef?.commitPendingEntry?.() ?? false;
	}

	let {
		activeTab,
		selectedProfiles,
		answersContext,
		incomeEntries,
		restorePromptProfiles,
		editingEntry,
		applicantData = $bindable({}),
		loanProduct,
		allApplicants,
		currentApplicantIndex,
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
		loanScope = '',
		onObligationsRunningChange,
		lockedProfiles = [],
		noIncomeReason = '',
		onNoIncomeReasonChange,
		emiPaidByRequired = false,
		professionalCategory,
		onPendingValidChange,
		isLinkedEntry = false,
		linkedSourceName = '',
		linkedEntryWarnings = null,
		linkedOtherShareholding = 0,
		firmNameOptions
	}: Props = $props();

	let profileSelectionError = $state<string | null>(null);
</script>

{#if activeTab === 'profile'}
	<ProfileTabContent applicantIndex={currentApplicantIndex ?? 0} />
{:else if activeTab === 'income_profiles'}
	<IncomeProfileSelector
		{selectedProfiles}
		{answersContext}
		loanName={loanProduct}
		onSelectionChange={onProfileSelectionChange}
		bind:error={profileSelectionError}
		{lockedProfiles}
		{noIncomeReason}
		{onNoIncomeReasonChange}
	/>
{:else if activeTab === 'income_details'}
	<div class="flex flex-col gap-16">
		<!-- Profile Completion Tracker (only when 2+ earning profiles) -->
		{#if selectedProfiles.filter((p) => p !== 'no_current_income').length > 1}
			<div
				id="income-profile-tracker"
				class="flex flex-wrap items-center gap-2 rounded-xl border border-(--form-border)/60 bg-(--form-bg-alt)/30 px-4 py-3 transition-all duration-300"
			>
				<span class="mr-1 text-xs font-medium text-(--form-text-muted)"> Entries needed: </span>
				{#each selectedProfiles.filter((p) => p !== 'no_current_income') as profile (profile)}
					{@const hasEntry = incomeEntries.some(
						(e) => e.profileType === profile && hasIncomeData(e)
					)}
					<span
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors
							{hasEntry
							? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
							: 'border border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-400'}"
					>
						{#if hasEntry}
							<CircleCheck class="h-3 w-3" />
						{:else}
							<CircleAlert class="h-3 w-3" />
						{/if}
						{getDropdownLabel(profile)}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Restore Prompt Banners -->
		{#each restorePromptProfiles as profileType (profileType)}
			<div class="restore-prompt">
				<RotateCcw class="h-5 w-5 shrink-0 text-stone-600 dark:text-stone-400" />
				<span class="flex-1 text-sm text-stone-800 dark:text-stone-200">
					Previously entered data found for <strong>{getDropdownLabel(profileType)}</strong>.
					Restore it?
				</span>
				<button type="button" class="restore-btn-yes" onclick={() => onRestoreProfile(profileType)}>
					Restore
				</button>
				<button type="button" class="restore-btn-no" onclick={() => onDenyRestore(profileType)}>
					No thanks
				</button>
			</div>
		{/each}

		<IncomeSourceForm
			{selectedProfiles}
			existingEntries={incomeEntries}
			{onAddEntry}
			{onUpdateEntry}
			{editingEntry}
			{onCancelEdit}
			applicantIndex={currentApplicantIndex ?? 0}
			{professionalCategory}
			{isLinkedEntry}
			{linkedSourceName}
			{linkedEntryWarnings}
			{linkedOtherShareholding}
			{firmNameOptions}
		/>
		<IncomeSourceEntries entries={incomeEntries} onEdit={onEditEntry} onDelete={onDeleteEntry} />
	</div>
{:else if activeTab === 'credit_score'}
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
		creditFactorAnswers={(applicantData.creditFactorAnswers as Record<string, 'Yes' | 'No'>) ?? {}}
		creditFactorReasons={(applicantData.creditFactorReasons as Record<string, string | string[]>) ??
			{}}
		onAnswerChange={onCreditScoreChange}
	/>
{:else if activeTab === 'obligations_details'}
	<ObligationCapture
		bind:this={obligationCaptureRef}
		{loanProduct}
		{loanScope}
		bind:currentAnswers={applicantData}
		onupdateApplicant={onObligationUpdate}
		{allApplicants}
		{currentApplicantIndex}
		{onObligationsRunningChange}
		{onPendingValidChange}
	/>
{/if}

<style>
	/* ── Restore prompt banner ────────────────────────── */
	.restore-prompt {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
		border: 1px solid #fcd34d;
		border-radius: 0.75rem;
		animation: fadeInUp 0.3s ease-out;
	}

	:global(.dark) .restore-prompt {
		background: linear-gradient(135deg, rgba(120, 53, 15, 0.2) 0%, rgba(146, 64, 14, 0.15) 100%);
		border-color: rgba(251, 191, 36, 0.3);
	}

	.restore-btn-yes {
		font-size: 0.8125rem;
		font-family: var(--font-title);
		font-weight: 500;
		color: #92400e;
		background: #fde68a;
		padding: 0.25rem 0.75rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s ease;
	}

	.restore-btn-yes:hover {
		background: #fcd34d;
	}

	:global(.dark) .restore-btn-yes {
		color: #fde68a;
		background: rgba(146, 64, 14, 0.4);
	}

	:global(.dark) .restore-btn-yes:hover {
		background: rgba(146, 64, 14, 0.6);
	}

	.restore-btn-no {
		font-size: 0.8125rem;
		font-family: var(--font-title);
		font-weight: 500;
		color: #6b7280;
		background: transparent;
		padding: 0.25rem 0.5rem;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s ease;
	}

	.restore-btn-no:hover {
		color: #374151;
	}

	:global(.dark) .restore-btn-no {
		color: #9ca3af;
	}

	:global(.dark) .restore-btn-no:hover {
		color: #d1d5db;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
