<script lang="ts">
	import {
		Lightbulb,
		Info,
		CheckCircle2,
		HelpCircle,
		AlertTriangle
	} from '$lib/utils/iconRegistry';
	import type { SectionContextInfo, CaseRouteData } from '$lib/types/wizard';
	import CaseRouteSummary from './CaseRouteSummary.svelte';

	interface Props {
		sectionLabel: string;
		subsectionLabel?: string;
		contextInfo?: SectionContextInfo;
		loanProduct?: string;
		caseRouteData?: CaseRouteData;
	}

	let {
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
</script>

<aside class="context-panel">
	<!-- Scrollable guidance area -->
	<div class="context-guidance">
		<!-- Header -->
		<div class="context-header">
			<div class="context-badge bg-ddsa-gradient-primary">
				<Info class="h-5 w-5" />
			</div>
			<div>
				<h3 class="text-sectionHeadingText font-titleBold !m-0 text-[#C3C6BB]">
					{displayContext?.title || subsectionLabel || sectionLabel}
				</h3>
				{#if subsectionLabel && subsectionLabel !== sectionLabel}
					<p class="descriptionText text-[#a8ac9a]">{sectionLabel}</p>
				{/if}
			</div>
		</div>

		{#if hasDsaGuidance}
			<!-- DSA Guidance: Summary -->
			{#if dsa?.summary}
				<div class="context-section">
					<p class="context-description alertText">{dsa.summary}</p>
				</div>
			{/if}

			<!-- DSA Guidance: Key Points -->
			{#if dsa?.keyPoints && dsa.keyPoints.length > 0}
				<div class="context-section">
					<div class="context-section-header buttonText !text-[#C3C6BB]">
						<CheckCircle2 class="h-4 w-4 text-[var(--ddsa-primary-500)]" />
						<span>Key Points</span>
					</div>
					<ul class="context-list alertText">
						{#each dsa.keyPoints as item}
							<li class="context-list-item">
								<span class="key-bullet"></span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- DSA Guidance: Watch For -->
			{#if dsa?.watchFor && dsa.watchFor.length > 0}
				<div class="context-section context-watchfor">
					<div class="context-section-header buttonText !text-[#C3C6BB]">
						<AlertTriangle class="h-4 w-4 text-[var(--ddsa-warning)]" />
						<span>Watch For</span>
					</div>
					<ul class="context-list alertText">
						{#each dsa.watchFor as item}
							<li class="context-list-item">
								<span class="watch-bullet"></span>
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- DSA Guidance: Pro Tips -->
			{#if dsa?.proTips && dsa.proTips.length > 0}
				<div class="context-section context-tips">
					<div class="context-section-header buttonText !text-[#C3C6BB]">
						<Lightbulb class="h-4 w-4 text-[var(--ddsa-primary-500)]" />
						<span>Pro Tips</span>
					</div>
					<ul class="context-list alertText">
						{#each dsa.proTips as tip}
							<li class="context-list-item">
								<span class="tip-bullet"></span>
								<span>{tip}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{:else}
			<!-- Legacy fallback: show old-style content if no DSA guidance -->
			{#if displayContext?.description}
				<div class="context-section">
					<p class="context-description alertText">{displayContext.description}</p>
				</div>
			{/if}

			{#if displayContext?.whyImportant && displayContext.whyImportant.length > 0}
				<div class="context-section">
					<div class="context-section-header buttonText !text-[#C3C6BB]">
						<HelpCircle class="h-4 w-4 text-[var(--ddsa-primary-500)]" />
						<span>Why is this important?</span>
					</div>
					<ul class="context-list alertText">
						{#each displayContext.whyImportant as item}
							<li class="context-list-item">
								<CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-[var(--ddsa-primary-500)]" />
								<span>{item}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if displayContext?.tips && displayContext.tips.length > 0}
				<div class="context-section context-tips">
					<div class="context-section-header buttonText !text-[#C3C6BB]">
						<Lightbulb class="h-4 w-4 text-[var(--ddsa-primary-500)]" />
						<span>Quick Tips</span>
					</div>
					<ul class="context-list alertText">
						{#each displayContext.tips as tip}
							<li class="context-list-item">
								<span class="tip-bullet"></span>
								<span>{tip}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Bottom tracker -->
	{#if caseRouteData}
		<div class="context-tracker">
			<CaseRouteSummary routeData={caseRouteData} />
		</div>
	{/if}
</aside>

<style>
	/* ── Panel shell — matches left sidebar gradient ── */
	.context-panel {
		width: 380px;
		min-width: 380px;
		height: 100vh;
		position: sticky;
		top: 0;
		background: linear-gradient(165deg, #1e2430 0%, #151a24 50%, #0f1318 100%);
		border-left: 1px solid rgba(255, 255, 255, 0.06);
		display: none;
		flex-direction: column;
	}

	@media (min-width: 1280px) {
		.context-panel {
			display: flex;
		}
	}

	/* ── Guidance (top 2/3) — scrollable ── */
	.context-guidance {
		flex: 2;
		min-height: 0;
		overflow-y: auto;
		padding: 1.5rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.context-guidance::-webkit-scrollbar {
		width: 4px;
	}

	.context-guidance::-webkit-scrollbar-track {
		background: transparent;
	}

	.context-guidance::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
	}

	.context-guidance::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.25);
	}

	/* ── Tracker (bottom 1/3) ── */
	.context-tracker {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		--route-text: rgba(255, 255, 255, 0.85);
		--route-text-muted: rgba(255, 255, 255, 0.45);
		--route-text-accent: var(--ddsa-primary-500);
	}

	/* ── Header ── */
	.context-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.context-badge {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		/* background: linear-gradient(135deg, var(--ddsa-primary-500) 0%, var(--ddsa-accent-500) 100%); */
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.3);
	}

	/* ── Section cards — dark translucent ── */
	.context-section {
		background: rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1rem 1.125rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.context-section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		/* font-family: 'PoppinsMedium', sans-serif; */
		/* font-size: 0.875rem; */
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 0.75rem;
	}

	.context-description {
		/* font-size: 0.8125rem; */
		color: rgba(255, 255, 255, 0.7);
		/* line-height: 1.6; */
		margin: 0;
	}

	.context-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.context-list-item {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		/* font-size: 0.8125rem; */
		color: rgba(255, 255, 255, 0.65);
		line-height: 1.5;
	}

	/* ── Bullets ── */
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

	/* ── Watch For — subtle warm tint ── */
	.context-watchfor {
		background: rgba(245, 158, 11, 0.06);
		border-color: rgba(245, 158, 11, 0.15);
	}

	/* ── Pro Tips — subtle gradient tint ── */
	.context-tips {
		background: rgba(203, 153, 126, 0.06);
		border-color: rgba(203, 153, 126, 0.12);
	}
</style>
