<script lang="ts">
	import type { ProductType } from '$lib/types/policyEngine.js';
	import type { PolicyCaptureData, PolicyCaptureStep } from '$lib/types/policyCapture.js';
	import { getVisibleSteps } from '$lib/types/policyCapture.js';
	import { ChevronLeft, ChevronRight, Check, AlertCircle } from '$lib/utils/iconRegistry';
	import { invalidateAll } from '$app/navigation';
	import { secureFetch } from '$lib/utils/csrf';
	import { buildCapturePatchBody } from './captureSaveContract.js';

	import CoreParametersStep from './steps/CoreParametersStep.svelte';
	import EligibilityStep from './steps/EligibilityStep.svelte';
	import CreditCibilStep from './steps/CreditCibilStep.svelte';
	import IncomeAssessmentStep from './steps/IncomeAssessmentStep.svelte';
	import PropertyRulesStep from './steps/PropertyRulesStep.svelte';
	import ObligationsStep from './steps/ObligationsStep.svelte';
	import BTTopupStep from './steps/BTTopupStep.svelte';
	import FeesPoliciesStep from './steps/FeesPoliciesStep.svelte';
	import DeviationsStep from './steps/DeviationsStep.svelte';
	import ReviewSubmitStep from './steps/ReviewSubmitStep.svelte';

	interface Props {
		captureId: string;
		productType: ProductType;
		lenderName: string;
		productTypeLabel: string;
		status: string;
		initialStep: number;
		completedSteps: number[];
		data: PolicyCaptureData;
		unknownFields: string[];
		isSecured: boolean;
		/**
		 * API base for autosave + submit. Defaults to the RM endpoints; the
		 * admin proxy-capture flow (A.2) passes its admin-scoped base so the
		 * same wizard saves through admin auth.
		 */
		apiBase?: string;
		/** Persistent "capturing on behalf of …" banner (A.2 admin proxy). */
		bannerText?: string;
		/** Submit button label — "Submit on behalf of RM" for admin proxy. */
		submitLabel?: string;
	}

	let {
		captureId,
		productType,
		lenderName,
		productTypeLabel,
		status,
		initialStep,
		completedSteps: initialCompletedSteps,
		data: initialData,
		unknownFields: initialUnknownFields,
		isSecured,
		apiBase = '/api/rm/policy-captures',
		bannerText = '',
		submitLabel = 'Submit for Review'
	}: Props = $props();

	// ── Visible steps for this product type ────────────────────────
	// svelte-ignore state_referenced_locally — intentional: productType is immutable for the wizard's lifetime
	const visibleSteps = getVisibleSteps(productType);

	// ── State ──────────────────────────────────────────────────────
	// svelte-ignore state_referenced_locally — intentional: seeds local mutable state from initial props
	let currentStep = $state(initialStep);
	// svelte-ignore state_referenced_locally
	let completedSteps = $state<number[]>([...initialCompletedSteps]);
	// svelte-ignore state_referenced_locally
	let captureData = $state<PolicyCaptureData>({ ...initialData });
	// svelte-ignore state_referenced_locally
	let unknownFields = $state<string[]>([...initialUnknownFields]);
	let saving = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let submitting = $state(false);

	// ── Derived ────────────────────────────────────────────────────
	let isReadOnly = $derived(status !== 'draft');
	let isFirstStep = $derived(currentStep === 0);
	let isLastStep = $derived(currentStep === visibleSteps.length - 1);
	let progressPercent = $derived(Math.round(((currentStep + 1) / visibleSteps.length) * 100));
	let currentStepDef = $derived(visibleSteps[currentStep]);

	// ── Auto-save on step change ───────────────────────────────────
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleSave() {
		if (isReadOnly) return;
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => doSave(), 3000);
		saveStatus = 'idle';
	}

	// `dataStepIndex` is the step whose data we flush. It is decoupled from
	// `currentStep` (recorded as the resume point) so navigation can advance the
	// view first, then still persist the step the user is leaving. See goNext.
	async function doSave(dataStepIndex = currentStep) {
		if (isReadOnly || saving) return;
		saving = true;
		saveStatus = 'saving';

		try {
			const res = await secureFetch(`${apiBase}/${captureId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					buildCapturePatchBody({
						currentStep,
						dataStepIndex,
						completedSteps,
						completionPercent: calculateCompletion(),
						unknownFields,
						captureData,
						visibleSteps
					})
				)
			});
			const result = await res.json();
			saveStatus = result.success ? 'saved' : 'error';
		} catch {
			saveStatus = 'error';
		} finally {
			saving = false;
		}
	}

	function calculateCompletion(): number {
		let filled = 0;
		let total = 0;

		const core = captureData.core_parameters;
		if (core) {
			const coreFields = [
				core.roi,
				core.max_foir,
				core.max_tenure_months,
				core.max_age_at_maturity
			];
			total += coreFields.length;
			filled += coreFields.filter((v) => v !== null).length;
		}

		const elig = captureData.eligibility;
		if (elig) {
			total += 3;
			if (elig.min_age !== null) filled++;
			if (elig.max_age !== null) filled++;
			if (elig.residency_policy !== null) filled++;
		}

		const cibil = captureData.credit_cibil;
		if (cibil) {
			total += 2;
			if (cibil.min_cibil_score !== null) filled++;
			if (cibil.cibil_applies_to !== null) filled++;
		}

		const income = captureData.income_assessment;
		if (income && income.assessments.length > 0) {
			total += 1;
			filled += 1;
		} else {
			total += 1;
		}

		return total > 0 ? Math.round((filled / total) * 100) : 0;
	}

	// ── Navigation ─────────────────────────────────────────────────
	function goNext() {
		if (currentStep < visibleSteps.length - 1) {
			if (!completedSteps.includes(currentStep)) {
				completedSteps = [...completedSteps, currentStep];
			}
			// Advance the view first so the saved current_step is the destination
			// (where the user resumes), but flush the leaving step's data.
			const leavingStep = currentStep;
			currentStep++;
			doSave(leavingStep);
			scrollToTop();
		}
	}

	function goPrev() {
		if (currentStep > 0) {
			const leavingStep = currentStep;
			currentStep--;
			doSave(leavingStep);
			scrollToTop();
		}
	}

	function goToStep(index: number) {
		if (index <= currentStep || completedSteps.includes(index)) {
			const leavingStep = currentStep;
			currentStep = index;
			doSave(leavingStep);
			scrollToTop();
		}
	}

	function scrollToTop() {
		const el = document.getElementById('policy-capture-wizard');
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// ── Submit ──────────────────────────────────────────────────────
	async function handleSubmit() {
		submitting = true;
		try {
			// Save current data first
			await doSave();

			const res = await secureFetch(`${apiBase}/${captureId}/submit`, {
				method: 'POST'
			});
			const result = await res.json();
			if (result.success) {
				await invalidateAll();
			} else {
				alert(result.error || 'Failed to submit');
			}
		} catch {
			alert('Network error — please try again');
		} finally {
			submitting = false;
		}
	}

	// ── Step data update handler ───────────────────────────────────
	function handleDataUpdate(key: keyof PolicyCaptureData, value: unknown) {
		captureData = { ...captureData, [key]: value };
		scheduleSave();
	}

	function handleUnknownFieldToggle(field: string, isUnknown: boolean) {
		if (isUnknown && !unknownFields.includes(field)) {
			unknownFields = [...unknownFields, field];
		} else if (!isUnknown) {
			unknownFields = unknownFields.filter((f) => f !== field);
		}
		scheduleSave();
	}
</script>

<div id="policy-capture-wizard" class="mx-auto max-w-3xl">
	{#if bannerText}
		<!-- A.2 — persistent "capturing on behalf of …" context banner -->
		<div
			class="mb-4 flex items-center gap-2 rounded-lg border border-[var(--dash-btn-ghost-border)] bg-[var(--dash-btn-ghost-bg)] px-4 py-2.5 text-sm font-medium text-[var(--dash-accent-text)]"
		>
			<span aria-hidden="true">📝</span>
			<span>{bannerText}</span>
		</div>
	{/if}
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-xl font-bold text-gray-900">{lenderName}</h2>
			<p class="text-sm text-gray-500">{productTypeLabel}</p>
		</div>
		<div class="flex items-center gap-3">
			{#if saveStatus === 'saving'}
				<span class="text-xs text-gray-400">Saving...</span>
			{:else if saveStatus === 'saved'}
				<span class="text-xs text-green-600">Saved</span>
			{:else if saveStatus === 'error'}
				<span class="text-xs text-red-500">Save failed</span>
			{/if}
			{#if isReadOnly}
				<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
					{status === 'submitted' ? 'Submitted' : status}
				</span>
			{/if}
		</div>
	</div>

	<!-- Step Indicator -->
	<div class="mb-8">
		<div class="mb-4 h-1.5 w-full rounded-full bg-gray-100">
			<div
				class="h-1.5 rounded-full bg-blue-500 transition-all duration-500 ease-out"
				style="width: {progressPercent}%"
			></div>
		</div>

		<div class="flex flex-wrap items-center gap-1">
			{#each visibleSteps as step, index}
				{@const isActive = index === currentStep}
				{@const isPast = completedSteps.includes(index)}
				{@const isFuture = index > currentStep && !completedSteps.includes(index)}
				<button
					type="button"
					onclick={() => goToStep(index)}
					disabled={isFuture}
					class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all
						{isActive
						? 'border border-blue-200 bg-blue-50 text-blue-700'
						: isPast
							? 'cursor-pointer bg-gray-50 text-gray-600 hover:bg-gray-100'
							: 'cursor-not-allowed bg-gray-50 text-gray-400'}"
				>
					<div
						class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold
						{isActive
							? 'bg-blue-500 text-white'
							: isPast
								? 'bg-green-500 text-white'
								: 'bg-gray-200 text-gray-500'}"
					>
						{#if isPast && !isActive}
							<Check class="h-3 w-3" />
						{:else}
							{index + 1}
						{/if}
					</div>
					<span class="hidden sm:inline">{step.shortLabel}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Step Content -->
	<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
		{#if currentStepDef?.id === 'core_parameters'}
			<CoreParametersStep
				data={captureData.core_parameters}
				{isSecured}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('core_parameters', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'eligibility'}
			<EligibilityStep
				data={captureData.eligibility}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('eligibility', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'credit_cibil'}
			<CreditCibilStep
				data={captureData.credit_cibil}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('credit_cibil', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'income_assessment'}
			<IncomeAssessmentStep
				data={captureData.income_assessment}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('income_assessment', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'property_rules'}
			<PropertyRulesStep
				data={captureData.property_rules}
				{productType}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('property_rules', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'obligations'}
			<ObligationsStep
				data={captureData.obligations}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('obligations', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'bt_topup'}
			<BTTopupStep
				data={captureData.bt_topup}
				{productType}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('bt_topup', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'fees_policies'}
			<FeesPoliciesStep
				data={captureData.fees_policies}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('fees_policies', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'deviations'}
			<DeviationsStep
				data={captureData.deviations}
				{isReadOnly}
				{unknownFields}
				onUpdate={(d) => handleDataUpdate('deviations', d)}
				onUnknownToggle={handleUnknownFieldToggle}
			/>
		{:else if currentStepDef?.id === 'special_conditions'}
			<ReviewSubmitStep
				data={captureData.special_conditions}
				{captureData}
				{unknownFields}
				{isReadOnly}
				{productType}
				onUpdate={(d) => handleDataUpdate('special_conditions', d)}
				onSubmit={handleSubmit}
				{submitting}
				{submitLabel}
			/>
		{/if}
	</div>

	<!-- Navigation Footer -->
	<div class="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
		<!-- Save indicator -->
		<button
			type="button"
			onclick={() => doSave()}
			disabled={saving || isReadOnly}
			class="flex items-center gap-1.5 text-sm font-medium text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-700 disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save Progress'}
		</button>

		<!-- Nav buttons -->
		<div class="flex items-center gap-3">
			{#if !isFirstStep}
				<button
					type="button"
					onclick={goPrev}
					class="inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50"
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</button>
			{/if}

			{#if !isLastStep}
				<button
					type="button"
					onclick={goNext}
					class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Step indicator text (mobile) -->
	<p class="mt-4 text-center text-xs text-gray-400 md:hidden">
		Step {currentStep + 1} of {visibleSteps.length}
	</p>
</div>
