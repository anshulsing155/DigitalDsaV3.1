<script lang="ts">
	import { CircleAlert } from '$lib/utils/iconRegistry';
	import BtStructurePanel from './BtStructurePanel.svelte';
	import ApplicantFormCard from './ApplicantFormCard.svelte';
	import ApplicantSummaryTable from './ApplicantSummaryTable.svelte';
	import SuggestPrimaryBanner from './form-wizard/SuggestPrimaryBanner.svelte';
	import DirectorFormModal from './DirectorFormModal.svelte';
	import DirectorRemovePickerModal from './DirectorRemovePickerModal.svelte';
	import CompanyDeleteDialog from './CompanyDeleteDialog.svelte';
	import { formState } from '$lib/state/form.svelte';
	import type { LegacyApplicant } from '$lib/stores/loanData';
	import defaultSecuredConfig from '$lib/config/applicantBasicDetailsSecuredLoans.json';
	import QuestionRenderer from './QuestionRenderer.svelte';
	import { onMount } from 'svelte';
	import { createApplicantFormManager } from './applicantFormManager.svelte';
	import { validateCompanyOwnershipTotals } from '$lib/utils/sameCompanySync';

	interface Props {
		title?: string;
		label?: string;
		isNextEnabled?: boolean;
		disabledReason?: string;
		configJson?: { formLevelQuestions?: any[]; questions: any[] };
	}

	let {
		title = 'Add Applicant',
		label: _label = '',
		isNextEnabled = $bindable(false),
		disabledReason = $bindable(''),
		configJson = defaultSecuredConfig
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	const m = createApplicantFormManager({
		configJson,
		setIsNextEnabled: (v: boolean) => {
			isNextEnabled = v;
		},
		setDisabledReason: (v: string) => {
			disabledReason = v;
		}
	});

	onMount(() => {
		m.initOnMount();
	});

	export function validateStep(): boolean {
		return m.validateStep();
	}

	export function validateOnNext(): boolean {
		return m.validateOnNext();
	}

	export function applyDirectorRestore(
		companyId: string,
		dirIdx: number,
		restore: Parameters<typeof m.applyDirectorRestore>[2] & {
			companyId?: string;
			directorIdx?: number;
		}
	) {
		m.applyDirectorRestore(companyId, dirIdx, restore);
	}

	// Director modal data (derived from manager state)
	const directorModalData = $derived(m.getDirectorModalData());

	// Aggregate per-Company ownership violations. The DirectorCards step only
	// validates total <= 100% at commit time; data can drift later via inline
	// edits, name-matched auto-linking of standalone Individuals, or restore.
	// Surfacing it here makes the violation visible the moment the user lands
	// on the Applicants list, instead of leaving Next greyed without a reason.
	const companyOwnershipViolations = $derived(
		validateCompanyOwnershipTotals(formState.applicants as Array<Record<string, unknown>>)
	);
</script>

<div>
	<!-- ── Zone 1: Form-level questions (applicationStructure, follow-ups) ── -->
	{#if (configJson.formLevelQuestions ?? []).length > 0}
		<div class="mb-4 rounded-xl border-2 border-[var(--form-border)] bg-[var(--form-bg-card)] p-4">
			<h3 class="mb-3 text-sm font-semibold text-[var(--form-text)]">Application Structure</h3>
			<div class="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-6 lg:gap-x-8">
				{#each m.getVisibleFormLevelQuestions(formState.applicationData) as q (q.key)}
					<QuestionRenderer
						q={q as any}
						index={0}
						applicant={formState.applicationData}
						applicationData={formState.applicationData}
						applicantErrors={{ 0: m.formLevelErrors }}
						showValidationErrors={formState.applicantStepTouched}
						isTouched={true}
						onValidate={(_app, _idx, key) => m.validateFormLevelField(key)}
						onFieldChange={m.updateFormLevelField}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── BT Applicant Structure ── -->
	<BtStructurePanel
		isBTCase={m.isBTCase}
		btCoApplicantCount={m.btCoApplicantCount}
		btGuarantorCount={m.btGuarantorCount}
		btExpectedCount={m.btExpectedCount}
		btMismatchWarning={m.btMismatchWarning}
		onCoApplicantCountChange={m.setBtCoApplicantCount}
		onGuarantorCountChange={m.setBtGuarantorCount}
	/>

	<!-- ── Global error banners ── -->
	{#if m.globalRoleError}
		<div data-error="true" class="error-message mt-3 mb-2">
			<CircleAlert size="20" class="shrink-0" />
			<p class="font-titleMedium alertText">
				{m.globalRoleError}
			</p>
		</div>
	{:else if m.globalRoleDistributionError}
		<div data-error="true" class="error-message mt-3 mb-2">
			<CircleAlert size="20" class="shrink-0" />
			<p class="font-titleMedium alertText">
				{m.globalRoleDistributionError}
			</p>
		</div>
	{/if}

	{#if m.directorError}
		<div data-error="true" class="error-message mt-3 mb-2">
			<CircleAlert size="20" class="shrink-0" />
			<p class="font-titleMedium alertText">
				{m.directorError}
			</p>
		</div>
	{/if}

	{#if m.femalePropertyWarning}
		<div class="warning-message mt-3 mb-2">
			<CircleAlert size="20" class="shrink-0" />
			<p class="font-titleMedium alertText">
				{m.femalePropertyWarning}
			</p>
		</div>
	{/if}

	{#if m.opcDuplicateWarning}
		<div class="warning-message mt-3 mb-2">
			<CircleAlert size="20" class="shrink-0" />
			<p class="font-titleMedium alertText">{m.opcDuplicateWarning}</p>
		</div>
	{/if}

	<!-- ── Applicant Entry Form ── -->
	<ApplicantFormCard
		editingIndex={m.editingIndex}
		formApplicant={m.formApplicant}
		formErrors={m.formErrors}
		hasTriedToAddApplicant={m.hasTriedToAddApplicant}
		isRestoredAndModified={m.isRestoredAndModified}
		restoredChangedKeys={m.restoredChangedKeys}
		hasDeniedRecoveryMatches={m.hasDeniedRecoveryMatches}
		{title}
		visibleQuestions={m.visibleFormQuestions}
		applicantIndex={m.editingIndex ?? formState.applicants.length}
		applicationData={formState.applicationData}
		maxReached={formState.applicants.filter((a) => a.applicantType).length >= m.MAX_APPLICANTS}
		onFieldChange={m.updateFormField}
		onFieldBlur={m.handleFormFieldBlur}
		onValidateField={(app, idx, key) =>
			m.validateApplicantFieldJSON(app as LegacyApplicant, idx, key)}
		onSave={m.saveApplicant}
		onSaveAsNew={m.saveApplicantAsNew}
		onCancelEdit={m.cancelEdit}
		onCancelNew={m.cancelNewApplicant}
		onRetriggerRecovery={m.retriggerRecoveryDetection}
	/>

	<!-- ── Cross-applicant ownership invariant: company totals must not exceed 100% ── -->
	{#if companyOwnershipViolations.length > 0}
		<div class="error-message mt-6" role="alert" data-testid="company-ownership-violation-banner">
			<div class="flex items-start gap-3">
				<CircleAlert class="h-5 w-5 shrink-0" />
				<div class="flex-1">
					<p class="alertText font-titleBold">Ownership total exceeds 100%</p>
					<ul class="alertText mt-1.5 list-disc space-y-1 pl-2">
						{#each companyOwnershipViolations as v (v.companyId)}
							<li>{v.message}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Applicant Summary Table ── -->
	<ApplicantSummaryTable
		sortedEntries={m.sortedApplicantEntries}
		editingIndex={m.editingIndex}
		hasRoleQuestions={m.hasRoleQuestions}
		applicantRoleErrors={m.applicantRoleErrors}
		duplicateIndexes={m.duplicateApplicantIndexes}
		pendingHighlightIndexes={m.pendingHighlightIndexes}
		applicantCount={formState.applicants.filter((a) => a.applicantType).length}
		onEdit={m.startEdit}
		onDelete={m.deleteApplicant}
		getDisplayName={m.getApplicantDisplayName}
		getStatus={(applicant, index) => m.getApplicantStatus(applicant, index)}
		directorRows={m.directorRowsMap}
		onEditDirector={m.handleEditDirector}
	/>

	<!-- ── Suggest Primary Applicant Banner ── -->
	<!-- Shown below the applicant list when a co-applicant would make a stronger primary. -->
	<SuggestPrimaryBanner
		applicants={formState.applicants as Array<Record<string, unknown>>}
		loanName={String(formState.applicationData.loanName ?? '')}
		onSetPrimary={(i) => formState.setPrimaryApplicant(i)}
	/>
</div>

<!-- ── Director Form Modal ── -->
{#if m.directorModalOpen && directorModalData}
	<DirectorFormModal
		open={m.directorModalOpen}
		directorIndex={m.editingDirectorIdx ?? 0}
		initialData={directorModalData.form}
		allForms={directorModalData.allForms}
		companyType={directorModalData.companyType}
		memberLabel={directorModalData.memberLabel}
		isUnsecured={false}
		applicants={formState.applicants as Array<Record<string, unknown>>}
		allCompanyDirectorForms={directorModalData.allCompanyDirectorForms}
		currentCompanyId={directorModalData.currentCompanyId}
		companyApplicants={directorModalData.companyApplicants}
		recoveryScope="secured::individual"
		onSave={m.handleDirectorSave}
		onClose={m.handleDirectorModalClose}
	/>
{/if}

<!-- ── Company Delete Dialog ── -->
{#if m.companyDeleteDialog.show}
	<CompanyDeleteDialog
		companyName={m.companyDeleteDialog.companyName}
		companyId={m.companyDeleteDialog.companyId}
		directors={m.companyDeleteDialog.directors}
		onConfirm={m.handleCompanyDeleteConfirm}
		onCancel={m.handleCompanyDeleteCancel}
	/>
{/if}

<!-- ── Director Remove Picker Modal ── -->
{#if m.showDirectorRemovePicker}
	<DirectorRemovePickerModal
		open={m.showDirectorRemovePicker}
		memberLabel={m.removePickerMemberLabel}
		filledDirectors={m.removePickerFilled}
		targetCount={m.removePickerTargetCount}
		onConfirm={m.handleRemovePickerConfirm}
		onCancel={m.handleRemovePickerCancel}
	/>
{/if}
