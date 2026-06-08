<script lang="ts">
	import {
		X,
		Lightbulb,
		Info,
		CheckCircle2,
		HelpCircle,
		AlertTriangle,
		ChevronDown
	} from '$lib/utils/iconRegistry';
	import type { SectionContextInfo, CaseRouteData } from '$lib/types/wizard';
	import CaseRouteSummary from './CaseRouteSummary.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		sectionLabel: string;
		subsectionLabel?: string;
		contextInfo?: SectionContextInfo;
		loanProduct?: string;
		caseRouteData?: CaseRouteData;
	}

	let {
		isOpen,
		onClose,
		sectionLabel,
		subsectionLabel = '',
		contextInfo,
		loanProduct = 'Loan',
		caseRouteData
	}: Props = $props();

	let displayContext = $derived(contextInfo);
	let dsa = $derived(displayContext?.dsaGuidance);
	let hasDsaGuidance = $derived(
		!!(dsa?.summary || dsa?.keyPoints?.length || dsa?.watchFor?.length || dsa?.proTips?.length)
	);

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

	function handleDragDown(e: TouchEvent) {
		const touch = e.changedTouches[0];
		if (touch && touch.clientY > window.innerHeight * 0.7) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="sheet-backdrop"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="presentation"
	>
		<!-- Bottom Sheet -->
		<div
			class="sheet-panel"
			role="dialog"
			aria-modal="true"
			aria-label="Section help and tips"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
		>
			<!-- Drag Handle -->
			<div class="sheet-handle-area" role="button" tabindex="-1" ontouchend={handleDragDown}>
				<div class="sheet-handle"></div>
			</div>

			<!-- Header -->
			<div class="sheet-header">
				<div class="sheet-header-content">
					<div class="sheet-badge">
						<Info class="h-5 w-5" />
					</div>
					<div>
						<h3 class="sheet-title">
							{displayContext?.title || subsectionLabel || sectionLabel}
						</h3>
						{#if subsectionLabel && subsectionLabel !== sectionLabel}
							<p class="sheet-subtitle">{sectionLabel}</p>
						{/if}
					</div>
				</div>
				<button
					type="button"
					class="sheet-close-btn"
					onclick={onClose}
					aria-label="Close help panel"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Content -->
			<div class="sheet-content">
				{#if hasDsaGuidance}
					<!-- DSA Summary -->
					{#if dsa?.summary}
						<div class="sheet-section">
							<p class="sheet-description">{dsa.summary}</p>
						</div>
					{/if}

					<!-- Key Points -->
					{#if dsa?.keyPoints && dsa.keyPoints.length > 0}
						<div class="sheet-section">
							<div class="sheet-section-header">
								<CheckCircle2 class="h-4 w-4 text-[var(--ddsa-primary-600)]" />
								<span>Key Points</span>
							</div>
							<ul class="sheet-list">
								{#each dsa.keyPoints as item}
									<li class="sheet-list-item">
										<span class="key-bullet"></span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Watch For -->
					{#if dsa?.watchFor && dsa.watchFor.length > 0}
						<div class="sheet-section sheet-watchfor">
							<div class="sheet-section-header">
								<AlertTriangle class="h-4 w-4 text-[var(--ddsa-warning)]" />
								<span>Watch For</span>
							</div>
							<ul class="sheet-list">
								{#each dsa.watchFor as item}
									<li class="sheet-list-item">
										<span class="watch-bullet"></span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Pro Tips -->
					{#if dsa?.proTips && dsa.proTips.length > 0}
						<div class="sheet-section sheet-tips">
							<div class="sheet-section-header">
								<Lightbulb class="h-4 w-4 text-[var(--trial-dark)]" />
								<span>Pro Tips</span>
							</div>
							<ul class="sheet-list">
								{#each dsa.proTips as tip}
									<li class="sheet-list-item">
										<span class="tip-bullet"></span>
										<span>{tip}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{:else}
					<!-- Legacy fallback -->
					{#if displayContext?.description}
						<div class="sheet-section">
							<p class="sheet-description">{displayContext.description}</p>
						</div>
					{/if}

					{#if displayContext?.whyImportant && displayContext.whyImportant.length > 0}
						<div class="sheet-section">
							<div class="sheet-section-header">
								<HelpCircle class="h-4 w-4 text-[var(--ddsa-primary-600)]" />
								<span>Why is this important?</span>
							</div>
							<ul class="sheet-list">
								{#each displayContext.whyImportant as item}
									<li class="sheet-list-item">
										<CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-[var(--ddsa-primary-600)]" />
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if displayContext?.tips && displayContext.tips.length > 0}
						<div class="sheet-section sheet-tips">
							<div class="sheet-section-header">
								<Lightbulb class="h-4 w-4 text-[var(--trial-dark)]" />
								<span>Quick Tips</span>
							</div>
							<ul class="sheet-list">
								{#each displayContext.tips as tip}
									<li class="sheet-list-item">
										<span class="tip-bullet"></span>
										<span>{tip}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/if}

				<!-- Case Route Tracker -->
				{#if caseRouteData}
					<div class="sheet-tracker">
						<CaseRouteSummary routeData={caseRouteData} />
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	.sheet-panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		max-height: 85vh;
		background: var(--form-bg-card);
		border-radius: 20px 20px 0 0;
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
		z-index: 1001;
	}

	.sheet-handle-area {
		display: flex;
		justify-content: center;
		padding: 0.75rem 0 0.5rem;
		cursor: grab;
	}

	.sheet-handle {
		width: 40px;
		height: 4px;
		background: var(--form-border-hover);
		border-radius: 2px;
	}

	.sheet-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 0 1.25rem 1rem;
		border-bottom: 1px solid var(--form-border);
	}

	.sheet-header-content {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
	}

	.sheet-badge {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	}

	.sheet-title {
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 1.125rem;
		color: var(--form-text);
		margin: 0;
		line-height: 1.4;
	}

	.sheet-subtitle {
		font-size: 0.8125rem;
		color: var(--form-text-muted);
		margin: 0.25rem 0 0 0;
	}

	.sheet-close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--form-bg-alt);
		color: var(--form-text-muted);
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.sheet-close-btn:hover {
		background: var(--form-border);
		color: var(--form-text);
	}

	.sheet-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sheet-section {
		background: var(--form-bg-card);
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(43, 45, 66, 0.06);
		border: 1px solid var(--form-border);
	}

	.sheet-section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--form-text);
		margin-bottom: 0.75rem;
	}

	.sheet-description {
		font-size: 0.875rem;
		color: var(--form-text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.sheet-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.sheet-list-item {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--form-text-secondary);
		line-height: 1.5;
	}

	.key-bullet {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ddsa-primary-500);
		margin-top: 0.4rem;
		flex-shrink: 0;
	}

	.watch-bullet {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--ddsa-warning);
		margin-top: 0.4rem;
		flex-shrink: 0;
	}

	.tip-bullet {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%);
		margin-top: 0.4rem;
		flex-shrink: 0;
	}

	.sheet-watchfor {
		background: color-mix(in srgb, var(--ddsa-warning) 6%, var(--form-bg-card));
		border-color: color-mix(in srgb, var(--ddsa-warning) 20%, var(--form-border));
	}

	.sheet-tips {
		background: var(--form-bg-alt);
		border: 1px solid var(--form-border);
	}

	.sheet-tracker {
		background: var(--form-bg-alt);
		border-radius: 12px;
		border: 1px solid var(--form-border);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
