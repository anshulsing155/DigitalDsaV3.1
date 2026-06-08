<script lang="ts">
	import type { DsaOnboardingV2Data } from '$lib/types/dsaOnboardingV2';
	import type {
		DsaBusinessProfile,
		DsaPainPoints,
		DsaGoals,
		DsaWorkflow,
		DsaModuleSelection
	} from '$lib/types/dsaOnboardingV2';
	import type { ModuleId } from '$lib/data/modules';
	import { dsaOnboardingV2StepSchema } from '$lib/schemas/onboarding/dsaOnboardingV2.schema';

	import BusinessProfileSection from './BusinessProfileSection.svelte';
	import PainPointsSection from './PainPointsSection.svelte';
	import GoalsSection from './GoalsSection.svelte';
	import WorkflowSection from './WorkflowSection.svelte';
	import ModuleSelectionSection from './ModuleSelectionSection.svelte';

	import {
		Building2,
		AlertTriangle,
		TrendingUp,
		Waypoints,
		Layers,
		ChevronLeft,
		ChevronRight,
		Check,
		AlertCircle
	} from '$lib/utils/iconRegistry';

	interface AvailableModule {
		id: string;
		name: string;
		description: string;
	}

	interface Props {
		initialData: DsaOnboardingV2Data;
		onComplete: (data: DsaOnboardingV2Data) => void;
		onSave: (data: DsaOnboardingV2Data) => void;
		painPointOptions: string[];
		availableModules: AvailableModule[];
	}

	let { initialData, onComplete, onSave, painPointOptions, availableModules }: Props = $props();

	// ── Step definitions ─────────────────────────────────────────
	const steps = [
		{
			id: 'business_profile',
			label: 'Business Profile',
			shortLabel: 'Business',
			icon: Building2,
			color: 'text-stone-600'
		},
		{
			id: 'pain_points',
			label: 'Pain Points',
			shortLabel: 'Pain Points',
			icon: AlertTriangle,
			color: 'text-red-500'
		},
		{
			id: 'goals',
			label: '6-Month Goals',
			shortLabel: 'Goals',
			icon: TrendingUp,
			color: 'text-emerald-600'
		},
		{
			id: 'workflow',
			label: 'Workflow',
			shortLabel: 'Workflow',
			icon: Waypoints,
			color: 'text-purple-600'
		},
		{
			id: 'module_selection',
			label: 'Modules',
			shortLabel: 'Modules',
			icon: Layers,
			color: 'text-indigo-600'
		}
	];

	// ── State ────────────────────────────────────────────────────
	let currentStep = $state(0);
	let stepErrors = $state<Record<string, string>>({});
	let saving = $state(false);
	let completing = $state(false);

	// ── Section data (internal copies, one-time snapshot from prop) ──
	// svelte-ignore state_referenced_locally
	let businessProfile = $state<DsaBusinessProfile>(
		initialData.business_profile ?? {
			team_size: 'solo',
			monthly_file_volume: '0-5',
			primary_loan_types: [],
			empanelled_lenders: [],
			geography: { city: '' },
			current_tools: [],
			has_website: false,
			lead_sources: []
		}
	);

	// svelte-ignore state_referenced_locally
	let painPoints = $state<DsaPainPoints>(
		initialData.pain_points_ranking ?? {
			ranked_items: [],
			ranked_at: new Date()
		}
	);

	// svelte-ignore state_referenced_locally
	let goals = $state<DsaGoals>(
		initialData.goals ?? {
			files_per_month: { current: 0, target: 0 },
			disbursement_volume: { current: 0, target: 0 },
			active_lender_count: { current: 0, target: 0 },
			repeat_referral_rate: { current: 0, target: 0 },
			avg_processing_days: { current: 0, target: 0 },
			set_at: new Date()
		}
	);

	// svelte-ignore state_referenced_locally
	let workflow = $state<DsaWorkflow>(
		initialData.workflow ?? {
			customer_interaction: '' as any,
			document_collection: '' as any,
			file_preparation: '' as any,
			lender_submission: '' as any,
			training_preference: '' as any
		}
	);

	// svelte-ignore state_referenced_locally
	let moduleSelection = $state<DsaModuleSelection>({
		active_modules: initialData.active_modules ?? []
	});

	// ── Build full data object ───────────────────────────────────
	function buildFullData(): DsaOnboardingV2Data {
		return {
			business_profile: businessProfile,
			pain_points_ranking: painPoints,
			goals: goals,
			workflow: workflow,
			active_modules: moduleSelection.active_modules as ModuleId[],
			onboarding_v2_completed: false
		};
	}

	// ── Section update callbacks ─────────────────────────────────
	function handleBusinessProfileUpdate(data: DsaBusinessProfile) {
		businessProfile = data;
	}

	function handlePainPointsUpdate(data: DsaPainPoints) {
		painPoints = data;
	}

	function handleGoalsUpdate(data: DsaGoals) {
		goals = data;
	}

	function handleWorkflowUpdate(data: DsaWorkflow) {
		workflow = data;
	}

	function handleModuleSelectionUpdate(data: DsaModuleSelection) {
		moduleSelection = data;
	}

	// ── Validation ───────────────────────────────────────────────
	function validateCurrentStep(): boolean {
		stepErrors = {};

		try {
			switch (currentStep) {
				case 0:
					dsaOnboardingV2StepSchema.business_profile.parse(businessProfile);
					break;
				case 1:
					dsaOnboardingV2StepSchema.pain_points.parse(painPoints);
					break;
				case 2:
					dsaOnboardingV2StepSchema.goals.parse(goals);
					break;
				case 3:
					dsaOnboardingV2StepSchema.workflow.parse(workflow);
					break;
				case 4:
					dsaOnboardingV2StepSchema.module_selection.parse(moduleSelection);
					break;
			}
			return true;
		} catch (err: any) {
			if (err.issues) {
				const errors: Record<string, string> = {};
				for (const issue of err.issues) {
					const path = issue.path.join('.');
					if (!errors[path]) {
						errors[path] = issue.message;
					}
				}
				stepErrors = errors;
			}
			return false;
		}
	}

	// ── Navigation ───────────────────────────────────────────────
	function goNext() {
		if (!validateCurrentStep()) return;
		if (currentStep < steps.length - 1) {
			currentStep++;
			scrollToTop();
		}
	}

	function goPrev() {
		if (currentStep > 0) {
			stepErrors = {};
			currentStep--;
			scrollToTop();
		}
	}

	function goToStep(index: number) {
		// Allow going back to any completed step or the current step
		if (index <= currentStep) {
			stepErrors = {};
			currentStep = index;
			scrollToTop();
		}
	}

	function scrollToTop() {
		// Scroll to the wizard container top
		const el = document.getElementById('onboarding-v2-wizard');
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// ── Save & Continue Later ────────────────────────────────────
	async function handleSave() {
		saving = true;
		try {
			await onSave(buildFullData());
		} finally {
			saving = false;
		}
	}

	// ── Complete Onboarding ──────────────────────────────────────
	async function handleComplete() {
		if (!validateCurrentStep()) return;
		completing = true;
		try {
			const data = buildFullData();
			data.onboarding_v2_completed = true;
			await onComplete(data);
		} finally {
			completing = false;
		}
	}

	// ── Derived ──────────────────────────────────────────────────
	let isLastStep = $derived(currentStep === steps.length - 1);
	let isFirstStep = $derived(currentStep === 0);
	let progressPercent = $derived(Math.round(((currentStep + 1) / steps.length) * 100));
	let hasErrors = $derived(Object.keys(stepErrors).length > 0);
</script>

<div id="onboarding-v2-wizard" class="mx-auto max-w-3xl">
	<!-- ── Step Indicator ──────────────────────────────────────── -->
	<div class="mb-8">
		<!-- Progress bar -->
		<div class="mb-6 h-1.5 w-full rounded-full bg-[var(--dash-bg-alt)]">
			<div
				class="h-1.5 rounded-full bg-gradient-to-r from-stone-500 to-neutral-500 transition-all duration-500 ease-out"
				style="width: {progressPercent}%"
			></div>
		</div>

		<!-- Step pills -->
		<div class="flex items-center justify-between gap-1">
			{#each steps as step, index}
				{@const isActive = index === currentStep}
				{@const isPast = index < currentStep}
				{@const isFuture = index > currentStep}
				<button
					type="button"
					onclick={() => goToStep(index)}
					disabled={isFuture}
					class="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all
						{isActive
						? 'border-2 border-[var(--dash-text)] bg-[var(--dash-bg-card)] text-[var(--dash-text)] shadow-sm'
						: isPast
							? 'cursor-pointer border-2 border-transparent bg-[var(--dash-bg-alt)] text-[var(--dash-text-secondary)] hover:bg-[var(--dash-hover)]'
							: 'cursor-not-allowed border-2 border-transparent bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
				>
					<div
						class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
						{isActive
							? 'bg-[var(--dash-text)] text-white'
							: isPast
								? 'bg-emerald-500 text-white'
								: 'bg-[var(--dash-bg-alt)] text-[var(--dash-text-muted)]'}"
					>
						{#if isPast}
							<Check class="h-3.5 w-3.5" />
						{:else}
							<span class="text-[10px] font-bold">{index + 1}</span>
						{/if}
					</div>
					<span class="hidden md:inline">{step.label}</span>
					<span class="md:hidden">{step.shortLabel}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- ── Error banner ───────────────────────────────────────── -->
	{#if hasErrors}
		<div
			class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40"
		>
			<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
			<div>
				<p class="text-sm font-medium text-red-800 dark:text-red-400">
					Please fix the errors below before continuing
				</p>
				<ul class="mt-1 space-y-0.5">
					{#each Object.entries(stepErrors) as [field, message]}
						<li class="text-xs text-red-600 dark:text-red-400">{message}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- ── Section Content ────────────────────────────────────── -->
	<div
		class="rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-bg-card)] p-6 shadow-sm md:p-8"
	>
		{#if currentStep === 0}
			<BusinessProfileSection
				data={businessProfile}
				onUpdate={handleBusinessProfileUpdate}
				errors={stepErrors}
			/>
		{:else if currentStep === 1}
			<PainPointsSection
				data={painPoints}
				onUpdate={handlePainPointsUpdate}
				{painPointOptions}
				errors={stepErrors}
			/>
		{:else if currentStep === 2}
			<GoalsSection data={goals} onUpdate={handleGoalsUpdate} errors={stepErrors} />
		{:else if currentStep === 3}
			<WorkflowSection data={workflow} onUpdate={handleWorkflowUpdate} errors={stepErrors} />
		{:else if currentStep === 4}
			<ModuleSelectionSection
				data={moduleSelection}
				onUpdate={handleModuleSelectionUpdate}
				{availableModules}
				errors={stepErrors}
			/>
		{/if}
	</div>

	<!-- ── Navigation Footer ──────────────────────────────────── -->
	<div class="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
		<!-- Left side: Save & Continue Later -->
		<button
			type="button"
			onclick={handleSave}
			disabled={saving}
			class="cursor-pointer text-sm font-medium text-[var(--dash-text-secondary)] underline underline-offset-4 transition-colors hover:text-[var(--dash-text)] disabled:opacity-50"
		>
			{saving ? 'Saving...' : 'Save & Continue Later'}
		</button>

		<!-- Right side: Nav buttons -->
		<div class="flex items-center gap-3">
			{#if !isFirstStep}
				<button
					type="button"
					onclick={goPrev}
					class="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-[var(--dash-border)] px-5 py-3 text-sm font-medium text-[var(--dash-text-secondary)] transition-all hover:border-[var(--dash-border)] hover:bg-[var(--dash-hover)]"
				>
					<ChevronLeft class="h-4 w-4" />
					Previous
				</button>
			{/if}

			{#if isLastStep}
				<button
					type="button"
					onclick={handleComplete}
					disabled={completing}
					class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-semibold
						text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
				>
					{#if completing}
						Completing...
					{:else}
						<Check class="h-4 w-4" />
						Complete Onboarding
					{/if}
				</button>
			{:else}
				<button
					type="button"
					onclick={goNext}
					class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--ddsa-primary-600)] to-[var(--ddsa-primary-700)] px-6 py-3 text-sm
						font-semibold text-white shadow-lg shadow-stone-300/20 transition-all hover:from-[var(--ddsa-primary-700)] hover:to-[var(--ddsa-primary-800)] dark:shadow-stone-500/10"
				>
					Next
					<ChevronRight class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Step indicator text (mobile) ────────────────────────── -->
	<p class="mt-4 text-center text-xs text-[var(--dash-text-muted)] md:hidden">
		Step {currentStep + 1} of {steps.length}
	</p>
</div>
