<script lang="ts">
	import { deviceState } from '$lib/stores/device.svelte';
	import type { WizardState } from './wizardState.svelte';
	import FormSidebar from './FormSidebar.svelte';
	import FormTopProgress from './FormTopProgress.svelte';
	import FormMobileSections from './FormMobileSections.svelte';
	import FormContextPanel from './FormContextPanel.svelte';
	import MobileSidebarDrawer from './MobileSidebarDrawer.svelte';
	import MobileContextSheet from './MobileContextSheet.svelte';
	import MobileFloatingButtons from './MobileFloatingButtons.svelte';
	import { setContext, type Snippet } from 'svelte';
	import type { CaseRouteData } from '$lib/types/wizard';
	import { getStorageWarning, clearStorageWarning, formState } from '$lib/state/form.svelte';
	import { Building2, FlaskConical, X } from '$lib/utils/iconRegistry';
	import { dev } from '$app/environment';
	import { DEV_QA_SAVE_CONTEXT_KEY, type DevQaSaveContext } from './devQaSaveContext';
	import { addToast } from '$lib/state/ui.svelte';
	import { deriveFixtureName } from '$lib/testing/deriveFixtureName';
	import { secureFetch } from '$lib/utils/csrf';
	import { get } from 'svelte/store';
	import { userRelationships } from '$lib/components/relationship-capture/relationshipStore';

	interface Props {
		wizardState: WizardState;
		currentPageId: string | undefined;
		onNavigate: (pageIndex: number) => void;
		onApplicantStepChange?: (step: number) => void;
		visiblePages: Array<{ id?: string }> | null;
		currentPageIndex: number;
		totalPages: number;
		children: Snippet;
		navigation?: Snippet;
		loanProduct?: string;
		onClearForm?: () => void;
		answers?: Record<string, unknown>;
	}

	let {
		wizardState,
		currentPageId,
		onNavigate,
		onApplicantStepChange,
		visiblePages,
		currentPageIndex,
		totalPages,
		children,
		navigation,
		loanProduct = 'Loan',
		onClearForm,
		answers = {}
	}: Props = $props();

	// R4: Derive pending company documentation needs from applicant data
	// (Legacy: __pendingCompanyLink was used for auto-creation prompts.
	//  Now serves as documentation flag only — company is NOT auto-added.)
	let pendingCompanyLinks = $derived(
		(formState.applicants ?? [])
			.filter((a: any) => a.__pendingCompanyLink && a.applicantType === 'Individual')
			.map((a: any) => ({
				applicantName: (a.fullName as string) || 'Applicant',
				companyName: a.__pendingCompanyLink as string
			}))
	);

	// Derive case route data from answers for the tracker
	// Uses fallback chain: property (secured) → business (professional) → residence (unsecured)
	let caseRouteData: CaseRouteData = $derived.by(() => {
		const a = answers;

		// Location: property keys (Home/LAP/Plot) → business keys (Professional) → residence keys (Personal/Business)
		const state =
			(a['propertyStateName'] as string) ||
			(a['businessStateName'] as string) ||
			(a['residenceStateName'] as string) ||
			'';
		const city =
			(a['propertyCityName'] as string) ||
			(a['businessCityName'] as string) ||
			(a['residenceCityName'] as string) ||
			'';
		const area = [city, state].filter(Boolean).join(', ') || undefined;

		// Amount: secured loans = propCost − deposit (the actual loan gap);
		// unsecured loans = explicit loanAmount. Mirrors the payload-builder
		// derivation in src/lib/utils/payloadBuilder/loanTransaction.ts so the
		// sidebar matches what the rule engine sees, instead of showing the
		// full property cost (the prior calc made down-payment + loan look
		// like they exceeded the property cost).
		const propCost = Number(a['propCost']);
		const deposit = Number(a['deposit']) || 0;
		const explicitLoanAmount = Number(a['loanAmount']);
		const amount = explicitLoanAmount
			? explicitLoanAmount
			: propCost > 0
				? Math.max(0, propCost - deposit)
				: undefined;

		return {
			loanName: (a['loanName'] as string) || loanProduct || 'Loan',
			loanType: (a['loanType'] as string) || undefined,
			propertyArea: area,
			propertyStage: (a['PropertyStage'] as string) || undefined,
			applicantCount: (a['__applicantCount'] as number) || undefined,
			loanAmount: amount
		};
	});

	// Mobile drawer/sheet state
	let isSidebarOpen = $state(false);
	let isContextSheetOpen = $state(false);

	let currentSection = $derived(wizardState.findSectionForPage(currentPageId));
	let currentSectionData = $derived(
		wizardState.visibleSections.find((s) => s.id === currentSection?.sectionId)
	);
	let currentSectionLabel = $derived(currentSectionData?.label ?? '');

	// Get current subsection data
	let currentSubsectionData = $derived.by(() => {
		if (!currentSectionData || !currentSection?.subsectionId) return undefined;
		return currentSectionData.subsections.find((sub) => sub.id === currentSection?.subsectionId);
	});

	// Get context info - prefer subsection context, fall back to section context
	// Merge static dsaGuidance with answer-aware dynamic guidance
	let currentContextInfo = $derived.by(() => {
		const base = currentSubsectionData?.contextInfo || currentSectionData?.contextInfo;
		if (!base) return undefined;

		const dynamicFn = base.getDynamicGuidance;
		if (!dynamicFn || !answers) return base;

		const dynamic = dynamicFn(answers);
		if (!dynamic) return base;

		const merged = { ...base };
		const baseDsa = base.dsaGuidance || {};
		merged.dsaGuidance = {
			summary: dynamic.summary || baseDsa.summary,
			keyPoints: [...(baseDsa.keyPoints || []), ...(dynamic.keyPoints || [])],
			watchFor: [...(baseDsa.watchFor || []), ...(dynamic.watchFor || [])],
			proTips: [...(baseDsa.proTips || []), ...(dynamic.proTips || [])]
		};
		return merged;
	});

	function openSidebar() {
		isSidebarOpen = true;
	}

	function closeSidebar() {
		isSidebarOpen = false;
	}

	function openContextSheet() {
		isContextSheetOpen = true;
	}

	function closeContextSheet() {
		isContextSheetOpen = false;
	}

	// ── Dev-mode QA scenario capture ─────────────────────────────────────────
	let isQaSaveOpen = $state(false);
	let qaNote = $state('');
	let isSaving = $state(false);

	let qaSavePreviewName = $derived(
		answers && Object.keys(answers).length > 0
			? deriveFixtureName(answers, formState.applicants as Record<string, unknown>[])
			: '(fill the form to generate a name)'
	);

	// Expose an opener to FormNavigationBar so it can render an inline button
	// next to the Submit/Show Offers button on the final page (dev-only).
	setContext<DevQaSaveContext>(DEV_QA_SAVE_CONTEXT_KEY, {
		open: () => {
			isQaSaveOpen = true;
		}
	});

	async function saveQaScenario() {
		isSaving = true;
		try {
			const relationships = get(userRelationships).map((r) => ({
				fromId: r.fromId,
				toId: r.toId,
				relationType: r.relationType as string,
				category: r.category as string
			}));

			const response = await secureFetch('/api/qa/scenarios', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					loanAnswers: $state.snapshot(answers),
					applicationData: $state.snapshot(formState.applicationData),
					applicants: $state.snapshot(formState.applicants),
					relationships,
					testerNote: qaNote
				})
			});

			const json = await response.json();
			if (response.ok) {
				addToast({ type: 'success', message: `QA scenario saved: "${json.data?.autoName}"` });
				isQaSaveOpen = false;
				qaNote = '';
			} else {
				// apiError returns `{ success: false, error: '...' }` — old code read `.message`
				// which was always undefined, masking the real failure reason with the fallback.
				addToast({
					type: 'error',
					message: json.error ?? json.message ?? 'Failed to save scenario'
				});
			}
		} catch (err) {
			addToast({ type: 'error', message: 'Network error saving QA scenario' });
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="wizard-shell">
	{#if !deviceState.isMobile && !deviceState.isNative}
		<FormSidebar
			{wizardState}
			{currentPageId}
			{onNavigate}
			{onApplicantStepChange}
			{visiblePages}
			{onClearForm}
		/>
	{/if}

	<div class="wizard-content">
		<FormTopProgress
			overallProgress={wizardState.overallProgress}
			{currentSectionLabel}
			currentStepIndex={currentPageIndex}
			totalSteps={totalPages}
			showStepText={deviceState.isMobile || deviceState.isNative}
		/>

		<!-- Storage quota warning — shown when sessionStorage is full -->
		{#if getStorageWarning()}
			<div class="warning-message mx-auto max-w-4xl">
				<div class="flex items-center justify-between gap-3">
					<p>{getStorageWarning()}</p>

					<button
						onclick={() => clearStorageWarning()}
						class="shrink-0 cursor-pointer"
						aria-label="Dismiss warning"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>
		{/if}

		<!-- R4: Company financials documentation banner -->
		{#each pendingCompanyLinks as link (link.applicantName + link.companyName)}
			<div class="warning-message mx-auto w-full max-w-4xl">
				<div class="flex items-center gap-3">
					<Building2 class="h-4 w-4 shrink-0" />
					<span class="flex-1">
						Company financials needed: <strong>{link.companyName}</strong> documents required for {link.applicantName}'s
						income verification
					</span>
				</div>
			</div>
		{/each}

		<!-- Old mobile sections - replaced by floating buttons + drawer -->
		<!-- {#if deviceState.isMobile || deviceState.isNative}
			<FormMobileSections
				{wizardState}
				{currentPageId}
				{onNavigate}
				{visiblePages}
			/>
		{/if} -->

		<div
			class="wizard-content-inner"
			class:mobile-padding={deviceState.isMobile || deviceState.isNative}
		>
			{@render children()}
		</div>

		{#if navigation}
			<div
				class="navigation-wrapper"
				class:with-fab-space={deviceState.isMobile || deviceState.isNative}
			>
				{@render navigation()}
			</div>
		{/if}
	</div>

	{#if !deviceState.isMobile && !deviceState.isNative}
		<FormContextPanel
			sectionLabel={currentSectionLabel}
			subsectionLabel={currentSubsectionData?.label}
			contextInfo={currentContextInfo}
			{loanProduct}
			{caseRouteData}
		/>
	{/if}
</div>

<!-- Mobile Floating Action Buttons -->
{#if deviceState.isMobile || deviceState.isNative}
	<MobileFloatingButtons
		onSectionsClick={openSidebar}
		onHelpClick={openContextSheet}
		overallProgress={wizardState.overallProgress}
	/>

	<!-- Mobile Sidebar Drawer -->
	<MobileSidebarDrawer
		isOpen={isSidebarOpen}
		onClose={closeSidebar}
		{wizardState}
		{currentPageId}
		{onNavigate}
		{onApplicantStepChange}
		{visiblePages}
		{onClearForm}
	/>

	<!-- Mobile Context/Help Bottom Sheet -->
	<MobileContextSheet
		isOpen={isContextSheetOpen}
		onClose={closeContextSheet}
		sectionLabel={currentSectionLabel}
		subsectionLabel={currentSubsectionData?.label}
		contextInfo={currentContextInfo}
		{loanProduct}
		{caseRouteData}
	/>
{/if}

{#if dev}
	<!--
		Dev-mode QA capture: the trigger button is rendered by FormNavigationBar
		(inline next to Submit/Show Offers on the final page) via Svelte context.
		Only the modal lives here.
	-->

	<!-- QA Save Modal -->
	{#if isQaSaveOpen}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div
				class="w-full max-w-md rounded-xl border border-[var(--form-border)] bg-white p-6 shadow-2xl dark:bg-gray-900"
			>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<FlaskConical class="h-4 w-4 text-primary" />
						<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							Save as QA Scenario
						</h2>
						<span class="tinyText rounded bg-[var(--ddsa-accent-600)] px-1.5 py-0.5">Dev</span>
					</div>
					<button
						onclick={() => (isQaSaveOpen = false)}
						class="smallText cursor-pointer"
						aria-label="Close"
					>
						<X class="h-4 w-4  shrink-0" />
					</button>
				</div>

				<!-- Auto-generated name preview -->
				<div class="mb-4">
					<p class="smallText text-[var(--form-text-label)]">Auto-generated name</p>
					<p class="smallText text-[var(--form-text-label)]">
						{qaSavePreviewName}
					</p>
				</div>

				<!-- Tester note -->
				<div class="mb-5">
					<label for="qa-tester-note" class="smallText text-[var(--form-text-label)]">
						Tester note <span class="">(optional)</span>
					</label>
					<textarea
						id="qa-tester-note"
						bind:value={qaNote}
						rows={3}
						placeholder="What edge case or scenario does this cover?"
						class="smallText w-full resize-none rounded-lg border border-[var(--ddsa-accent-100)] bg-white px-3 py-2 text-[var(--form-text-label)] placeholder-gray-400 focus:border-[var(--ddsa-accent-400)] focus:ring-1 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
					></textarea>
				</div>

				<div class="flex justify-end gap-2">
					<button
						onclick={() => (isQaSaveOpen = false)}
						class="buttonText cursor-pointer rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
					>
						Cancel
					</button>
					<button
						onclick={saveQaScenario}
						disabled={isSaving}
						class="buttonText flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--ddsa-primary-500)] px-4 py-2 transition-all hover:bg-[var(--ddsa-primary-600)] disabled:opacity-60"
					>
						{#if isSaving}
							Saving…
						{:else}
							<FlaskConical class="h-3.5 w-3.5" />
							Save Scenario
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}

<style>
	.wizard-shell {
		display: flex;
		min-height: 100vh;
		width: 100%;
	}

	.wizard-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: var(--form-bg-alt);
	}

	.wizard-content-inner {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		padding-top: 0;
		padding-bottom: 5rem; /* Space for fixed nav bar — dropdowns auto-position upward */
	}

	.wizard-content-inner.mobile-padding {
		padding-bottom: 7rem; /* Space for fixed nav bar + floating buttons */
	}

	@media (min-width: 768px) {
		.wizard-content-inner {
			padding: 1rem 1.5rem;
			padding-top: 0.5rem;
			padding-bottom: 5rem;
		}

		.wizard-content-inner.mobile-padding {
			padding-bottom: 5rem;
		}
	}
</style>
