<script lang="ts">
	import { tick } from 'svelte';
	import type { WizardSection, WizardSubsection } from '$lib/types/wizard';
	import type { WizardState } from './wizardState.svelte';
	import FormSidebarSection from './FormSidebarSection.svelte';
	import { goto } from '$app/navigation';
	import { Home, Gauge, Trash2, Sun, Moon, Laptop } from '$lib/utils/iconRegistry';
	import { ROUTES } from '$lib/config/routes.js';
	import { themeState } from '$lib/stores/theme.svelte';

	let themeMode = $derived(themeState.mode);

	interface Props {
		wizardState: WizardState;
		currentPageId: string | undefined;
		onNavigate: (pageIndex: number) => void;
		onApplicantStepChange?: (step: number) => void;
		visiblePages: Array<{ id?: string }> | null;
		onClearForm?: () => void;
	}

	let {
		wizardState,
		currentPageId,
		onNavigate,
		onApplicantStepChange,
		visiblePages,
		onClearForm
	}: Props = $props();

	let currentLocation = $derived(wizardState.findSectionForPage(currentPageId));

	// Auto-scroll active section into view
	let sidebarContentEl: HTMLElement | undefined = $state();

	$effect(() => {
		// Track currentPageId to trigger scroll on page change
		const _trigger = currentPageId;
		tick().then(() => {
			if (!sidebarContentEl) return;
			const activeEl = sidebarContentEl.querySelector('.active');
			if (activeEl) {
				activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		});
	});

	function getVisibleSubsections(section: WizardSection) {
		return wizardState.visibleSubsectionsMap[section.id] ?? section.subsections;
	}

	function getSubsectionCompletion(
		section: WizardSection
	): Record<string, { answered: number; total: number }> {
		const result: Record<string, { answered: number; total: number }> = {};
		const subs = getVisibleSubsections(section);
		for (const sub of subs) {
			let answered = 0;
			let total = 0;
			for (const pageId of sub.pageIds) {
				// Use step-specific key for applicant subsections
				const lookupKey =
					sub.applicantStep !== undefined ? `${pageId}__step${sub.applicantStep}` : pageId;
				const pc = wizardState.completionMap[lookupKey];
				if (pc) {
					answered += pc.answered;
					total += pc.total;
				}
			}
			result[sub.id] = { answered, total };
		}
		return result;
	}

	function isSectionLocked(sectionId: string): boolean {
		return !(wizardState.sectionReachability[sectionId] ?? true);
	}

	function getSubsectionLocked(section: WizardSection): Record<string, boolean> {
		const result: Record<string, boolean> = {};
		const subs = getVisibleSubsections(section);
		for (const sub of subs) {
			result[sub.id] = !(wizardState.subsectionReachability[sub.id] ?? true);
		}
		return result;
	}

	function handleSectionClick(sectionId: string) {
		if (isSectionLocked(sectionId)) return;
		// If the first subsection of this section has an applicantStep, navigate to that step
		const subs = getVisibleSubsections(
			wizardState.visibleSections.find((s) => s.id === sectionId)!
		);
		if (subs.length > 0 && subs[0].applicantStep !== undefined && onApplicantStepChange) {
			onApplicantStepChange(subs[0].applicantStep);
		}
		const idx = wizardState.getFirstPageIndexForSection(sectionId, visiblePages);
		if (idx !== null) onNavigate(idx);
	}

	function handleSubsectionNavigate(subsectionId: string) {
		if (!(wizardState.subsectionReachability[subsectionId] ?? true)) return;
		const applicantStep = wizardState.getSubsectionApplicantStep(subsectionId);
		if (applicantStep !== undefined && onApplicantStepChange) {
			onApplicantStepChange(applicantStep);
		}
		const idx = wizardState.getFirstPageIndexForSubsection(subsectionId, visiblePages);
		if (idx !== null) onNavigate(idx);
	}
</script>

<nav class="wizard-sidebar">
	<div class="sidebar-content" bind:this={sidebarContentEl}>
		<FormSidebarSection
			index={0}
			label="How Can We Help?"
			subsections={[{ id: 'loan-selection', label: 'Loan Selection', pageIds: [] }]}
			isActive={false}
			isComplete={true}
			isLast={false}
			locked={false}
			subsectionLocked={{}}
			subsectionCompletion={{ 'loan-selection': { answered: 1, total: 1 } }}
			onNavigate={() => goto(ROUTES.FORM.HOW_CAN_WE_HELP)}
			onSectionClick={() => goto(ROUTES.FORM.HOW_CAN_WE_HELP)}
		/>

		{#each wizardState.visibleSections as section, i}
			<FormSidebarSection
				index={i + 1}
				label={section.label}
				subsections={getVisibleSubsections(section)}
				isActive={currentLocation?.sectionId === section.id}
				isComplete={wizardState.sectionCompletion[section.id]?.complete ?? false}
				isLast={i === wizardState.visibleSections.length - 1}
				locked={isSectionLocked(section.id)}
				subsectionLocked={getSubsectionLocked(section)}
				subsectionCompletion={getSubsectionCompletion(section)}
				activeSubsectionId={currentLocation?.sectionId === section.id
					? currentLocation?.subsectionId
					: undefined}
				onNavigate={handleSubsectionNavigate}
				onSectionClick={() => handleSectionClick(section.id)}
			/>
		{/each}
	</div>

	<div class="sidebar-actions">
		<a href={ROUTES.HOME} class="sidebar-action-btn">
			<Home size={16} />
			<span>Home</span>
		</a>
		<button
			type="button"
			class="sidebar-action-btn"
			onclick={() => themeState.toggleTheme()}
			aria-label="Toggle theme, current: {themeMode}"
			title="Theme: {themeMode}"
		>
			{#if themeMode === 'light'}
				<Sun size={16} class="sidebar-action-icon" />
				<span>Light Mode</span>
			{:else if themeMode === 'dark'}
				<Moon size={16} class="sidebar-action-icon" />
				<span>Dark Mode</span>
			{:else}
				<Laptop size={16} class="sidebar-action-icon" />
				<span>System</span>
			{/if}
		</button>
		<a href={ROUTES.DASHBOARD.ROOT} class="sidebar-action-btn">
			<Gauge size={16} />
			<span>Dashboard</span>
		</a>
		{#if onClearForm}
			<button type="button" class="sidebar-action-btn sidebar-action-danger" onclick={onClearForm}>
				<Trash2 size={16} />
				<span>Clear Form</span>
			</button>
		{/if}
	</div>
</nav>

<style>
	.wizard-sidebar {
		width: 280px;
		min-width: 280px;
		background: linear-gradient(165deg, #1e2430 0%, #151a24 50%, #0f1318 100%);
		border-right: 1px solid rgba(255, 255, 255, 0.06);
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
	}

	.sidebar-content {
		padding: 2rem 1rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.sidebar-content::-webkit-scrollbar {
		width: 4px;
	}

	.sidebar-content::-webkit-scrollbar-track {
		background: transparent;
	}

	.sidebar-content::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
	}

	.sidebar-content::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	.sidebar-actions {
		padding: 0.75rem 1rem 1.25rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex-shrink: 0;
	}

	.sidebar-action-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.55);
		font-size: 0.8rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		border: none;
		background: none;
		width: 100%;
		transition: all 0.15s ease;
	}

	.sidebar-action-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	.sidebar-action-danger:hover {
		color: #f87171;
		background: rgba(248, 113, 113, 0.08);
	}
</style>
