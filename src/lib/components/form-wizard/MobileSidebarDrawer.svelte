<script lang="ts">
	import { X, ChevronRight, HelpCircle, Home, Gauge, Trash2 } from '$lib/utils/iconRegistry';
	import type { WizardState } from './wizardState.svelte';
	import FormSidebarSection from './FormSidebarSection.svelte';
	import type { WizardSection } from '$lib/types/wizard';
	import { ROUTES } from '$lib/config/routes.js';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		wizardState: WizardState;
		currentPageId: string | undefined;
		onNavigate: (pageIndex: number) => void;
		onApplicantStepChange?: (step: number) => void;
		visiblePages: Array<{ id?: string }> | null;
		onClearForm?: () => void;
	}

	let {
		isOpen,
		onClose,
		wizardState,
		currentPageId,
		onNavigate,
		onApplicantStepChange,
		visiblePages,
		onClearForm
	}: Props = $props();

	let currentLocation = $derived(wizardState.findSectionForPage(currentPageId));

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
		const subs = getVisibleSubsections(
			wizardState.visibleSections.find((s) => s.id === sectionId)!
		);
		if (subs.length > 0 && subs[0].applicantStep !== undefined && onApplicantStepChange) {
			onApplicantStepChange(subs[0].applicantStep);
		}
		const idx = wizardState.getFirstPageIndexForSection(sectionId, visiblePages);
		if (idx !== null) {
			onNavigate(idx);
			onClose();
		}
	}

	function handleSubsectionNavigate(subsectionId: string) {
		if (!(wizardState.subsectionReachability[subsectionId] ?? true)) return;
		const applicantStep = wizardState.getSubsectionApplicantStep(subsectionId);
		if (applicantStep !== undefined && onApplicantStepChange) {
			onApplicantStepChange(applicantStep);
		}
		const idx = wizardState.getFirstPageIndexForSubsection(subsectionId, visiblePages);
		if (idx !== null) {
			onNavigate(idx);
			onClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="drawer-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="presentation"
	>
		<!-- Drawer -->
		<div
			class="drawer-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Form sections"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<!-- Header -->
			<div class="drawer-header">
				<h2 class="drawer-title">Form Sections</h2>
				<button type="button" class="drawer-close-btn" onclick={onClose} aria-label="Close sidebar">
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Progress Overview -->
			<div class="drawer-progress">
				<div class="progress-info">
					<span class="progress-label">Overall Progress</span>
					<span class="progress-value">{Math.round(wizardState.overallProgress)}%</span>
				</div>
				<div class="progress-bar-bg">
					<div class="progress-bar-fill" style="width: {wizardState.overallProgress}%"></div>
				</div>
			</div>

			<!-- Sections List -->
			<div class="drawer-content">
				<a href={ROUTES.FORM.HOW_CAN_WE_HELP} class="how-can-we-help-link" onclick={onClose}>
					<HelpCircle size={16} />
					<span>How Can We Help?</span>
				</a>

				{#each wizardState.visibleSections as section, i}
					<FormSidebarSection
						index={i}
						label={section.label}
						subsections={getVisibleSubsections(section)}
						isActive={currentLocation?.sectionId === section.id}
						isComplete={wizardState.sectionCompletion[section.id]?.complete ?? false}
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

			<!-- Navigation Actions (Home / Dashboard / Clear Form) -->
			<div class="drawer-actions">
				<a href={ROUTES.HOME} class="drawer-action-btn" onclick={onClose}>
					<Home size={16} />
					<span>Home</span>
				</a>
				<a href={ROUTES.DASHBOARD.ROOT} class="drawer-action-btn" onclick={onClose}>
					<Gauge size={16} />
					<span>Dashboard</span>
				</a>
				{#if onClearForm}
					<button
						type="button"
						class="drawer-action-btn drawer-action-danger"
						onclick={() => {
							onClearForm?.();
							onClose();
						}}
					>
						<Trash2 size={16} />
						<span>Clear Form</span>
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	.drawer-panel {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: min(320px, 85vw);
		background: linear-gradient(165deg, #1e2430, #151a24, #0f1318);
		box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		animation: slideInLeft 0.25s ease-out;
		z-index: 1001;
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
	}

	.drawer-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 1.125rem;
		color: white;
		margin: 0;
	}

	.drawer-close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.drawer-close-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.drawer-progress {
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-label {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.progress-value {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--ddsa-primary-400, #fbbf24);
	}

	.progress-bar-bg {
		height: 6px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.how-can-we-help-link {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px 8px 20px;
		margin-bottom: 12px;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.55);
		font-family: var(--font-paragraph);
		font-size: 12px;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.15s ease;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 12px;
	}

	.how-can-we-help-link:hover {
		color: var(--ddsa-primary-500, #cb997e);
		background: rgba(203, 153, 126, 0.06);
	}

	.drawer-actions {
		padding: 0.75rem 1rem 1.25rem;
		padding-bottom: calc(1.25rem + env(safe-area-inset-bottom));
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.drawer-action-btn {
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

	.drawer-action-btn:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.06);
	}

	.drawer-action-danger:hover {
		color: #f87171;
		background: rgba(248, 113, 113, 0.08);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideInLeft {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
</style>
