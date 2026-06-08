<script lang="ts">
	import type { WizardState } from './wizardState.svelte';

	interface Props {
		wizardState: WizardState;
		currentPageId: string | undefined;
		onNavigate: (pageIndex: number) => void;
		visiblePages: Array<{ id?: string }> | null;
	}

	let { wizardState, currentPageId, onNavigate, visiblePages }: Props = $props();

	let currentLocation = $derived(wizardState.findSectionForPage(currentPageId));
	let pillsContainer: HTMLDivElement | undefined = $state();

	// Auto-scroll active pill into view
	$effect(() => {
		if (!pillsContainer || !currentLocation) return;
		const activePill = pillsContainer.querySelector('[data-active="true"]');
		if (activePill) {
			activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
		}
	});

	function handlePillClick(sectionId: string) {
		const reachable = wizardState.sectionReachability[sectionId] ?? true;
		if (!reachable) return;
		const idx = wizardState.getFirstPageIndexForSection(sectionId, visiblePages);
		if (idx !== null) onNavigate(idx);
	}

	function getSectionState(sectionId: string): 'active' | 'complete' | 'locked' | 'default' {
		const isActive = currentLocation?.sectionId === sectionId;
		if (isActive) return 'active';
		const isComplete = wizardState.sectionCompletion[sectionId]?.complete ?? false;
		if (isComplete) return 'complete';
		const isReachable = wizardState.sectionReachability[sectionId] ?? true;
		if (!isReachable) return 'locked';
		return 'default';
	}
</script>

<div class="mobile-sections" bind:this={pillsContainer}>
	{#each wizardState.visibleSections as section}
		{@const state = getSectionState(section.id)}
		<button
			class="section-pill"
			class:pill-active={state === 'active'}
			class:pill-complete={state === 'complete'}
			class:pill-locked={state === 'locked'}
			data-active={state === 'active'}
			onclick={() => handlePillClick(section.id)}
			type="button"
			aria-disabled={state === 'locked'}
			title={state === 'locked' ? 'Complete the previous steps to unlock' : undefined}
		>
			{#if state === 'complete'}
				<svg
					class="pill-check"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
			{/if}
			{#if state === 'locked'}
				<svg
					class="pill-lock"
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
					<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
				</svg>
			{/if}
			<span class="pill-label">{section.label}</span>
		</button>
	{/each}
</div>

<style>
	.mobile-sections {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		overflow-x: auto;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.mobile-sections::-webkit-scrollbar {
		display: none;
	}

	.section-pill {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		border: 1.5px solid var(--form-border);
		background: var(--form-bg-card);
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.pill-label {
		font-family: var(--font-paragraph);
		font-size: 0.75rem;
		color: var(--form-text-secondary);
		line-height: 1;
	}

	.pill-active {
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		border-color: transparent;
	}

	.pill-active .pill-label {
		color: white;
		font-family: var(--font-title);
		font-weight: 500;
	}

	.pill-complete {
		border-color: transparent;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
	}

	.pill-complete .pill-label {
		color: white;
	}

	.pill-check {
		color: white;
		flex-shrink: 0;
	}

	.pill-locked {
		opacity: 0.45;
		cursor: not-allowed;
		border-color: var(--form-border);
	}

	.pill-lock {
		color: var(--form-text-secondary);
		flex-shrink: 0;
	}
</style>
