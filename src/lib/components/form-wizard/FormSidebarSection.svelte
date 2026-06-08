<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { WizardSubsection } from '$lib/types/wizard';
	import { Check, Lock } from '$lib/utils/iconRegistry';

	interface Props {
		index: number;
		label: string;
		subsections: WizardSubsection[];
		isActive: boolean;
		isComplete: boolean;
		isLast?: boolean;
		locked?: boolean;
		subsectionLocked?: Record<string, boolean>;
		subsectionCompletion: Record<string, { answered: number; total: number }>;
		activeSubsectionId?: string;
		onNavigate: (subsectionId: string) => void;
		onSectionClick: () => void;
	}

	let {
		index,
		label,
		subsections,
		isActive,
		isComplete,
		isLast = false,
		locked = false,
		subsectionLocked = {},
		subsectionCompletion,
		activeSubsectionId = '',
		onNavigate,
		onSectionClick
	}: Props = $props();

	// Only expand active section (or sections not yet complete)
	let expanded = $derived(isActive || (!isComplete && !locked));

	function getSubsectionComplete(subId: string): boolean {
		const comp = subsectionCompletion[subId];
		return comp ? comp.total > 0 && comp.answered >= comp.total : false;
	}

	function isSubLocked(subId: string): boolean {
		return subsectionLocked[subId] ?? false;
	}
</script>

<div class="step-container" class:active={isActive} class:locked class:complete={isComplete}>
	<!-- Timeline line -->
	{#if !isLast}
		<div class="timeline-line" class:line-complete={isComplete} class:line-active={isActive}></div>
	{/if}

	<button
		class="step-header"
		class:step-locked={locked}
		onclick={locked ? undefined : onSectionClick}
		type="button"
		aria-disabled={locked}
		title={locked ? 'Complete the previous steps to unlock this section' : undefined}
	>
		<!-- Step number node -->
		<div
			class="step-node"
			class:node-active={isActive}
			class:node-complete={isComplete && !isActive}
			class:node-locked={locked && !isActive}
		>
			<span class="step-number smallText font-titleBold">{index + 1}</span>
			{#if isComplete && !isActive}
				<div class="node-check">
					<Check class="h-4 w-4 shrink-0" />
				</div>
			{:else if locked && !isActive}
				<div class="node-lock">
					<Lock class="h-3 w-3 shrink-0" />
				</div>
			{/if}
		</div>

		<!-- Label and status -->
		<div class="step-content">
			<span
				class="step-label buttonText"
				class:label-active={isActive}
				class:label-locked={locked && !isActive}>{label}</span
			>
			{#if isComplete}
				<span class="tinyText step-status complete-status">Complete</span>
			{:else if isActive}
				<span class="tinyText step-status active-status">In Progress</span>
			{:else if locked}
				<span class="tinyText step-status locked-status">Locked</span>
			{/if}
		</div>
	</button>

	{#if expanded}
		<div class="substep-list" transition:slide={{ duration: 200 }}>
			{#each subsections as sub, subIndex}
				{@const subLocked = isSubLocked(sub.id)}
				{@const subComplete = getSubsectionComplete(sub.id)}
				{@const isSubActive = activeSubsectionId === sub.id && !subLocked}
				<button
					class="substep-item"
					class:substep-active={isSubActive}
					class:substep-complete={subComplete && !subLocked}
					class:substep-locked={subLocked}
					onclick={subLocked ? undefined : () => onNavigate(sub.id)}
					type="button"
					aria-disabled={subLocked}
					title={subLocked ? 'Complete the previous steps to unlock' : undefined}
				>
					<span
						class="substep-dot"
						class:dot-active={isSubActive}
						class:dot-complete={subComplete && !subLocked}
						class:dot-locked={subLocked}
					></span>
					<span class="substep-label smallText">{sub.label}</span>
					{#if subComplete && !subLocked}
						<Check class="h-3 w-3 text-[var(--ddsa-primary-500)]" />
					{:else if subLocked}
						<Lock class="h-3 w-3 text-[rgba(255, 255, 255, 0.4)]" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.step-container {
		position: relative;
		padding-left: 20px;
	}

	.step-container.locked {
		opacity: 0.6;
	}

	/* Timeline connector line */
	.timeline-line {
		position: absolute;
		left: 30px;
		top: 34px;
		bottom: -10px;
		width: 2px;
		background: rgba(255, 255, 255, 0.12);
		transition: background 0.3s ease;
	}

	.line-complete {
		background: var(--ddsa-primary-500, #cb997e);
	}

	.line-active {
		background: rgba(255, 255, 255, 0.25);
	}

	.step-header {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		width: 100%;
		padding: 8px 12px 8px 0;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
	}

	.step-header:hover:not(.step-locked) {
		transform: translateX(2px);
	}

	.step-locked {
		cursor: not-allowed;
	}

	/* Step number node */
	.step-node {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid rgba(255, 255, 255, 0.15);
		flex-shrink: 0;
		transition: all 0.25s ease;
	}

	.node-active {
		background: #fff;
		border-color: #fff;
		box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
	}

	.node-complete {
		background: var(--ddsa-primary-500, #cb997e);
		border-color: var(--ddsa-primary-500, #cb997e);
	}

	.node-locked {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.step-number {
		color: rgba(255, 255, 255, 0.65);
		transition: color 0.2s ease;
	}

	.node-active .step-number {
		color: #1f2937;
	}

	.node-complete .step-number {
		display: none;
	}

	.node-locked .step-number {
		color: rgba(255, 255, 255, 0.3);
		display: none;
	}

	.node-check {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
	}

	.node-lock {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.4);
	}

	/* Step content */
	.step-content {
		flex: 1;
		padding-top: 2px;
	}

	.step-label {
		display: block;
		font-family: var(--font-paragraph);
		font-size: 13px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.75);
		transition: color 0.2s ease;
		letter-spacing: 0.01em;
	}

	.label-active {
		color: #fff;
		font-weight: 600;
	}

	.label-locked {
		color: rgba(255, 255, 255, 0.4);
	}

	.step-status {
		display: inline-block;
		margin-top: 2px;
		font-family: var(--font-paragraph);
		font-size: 10px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.complete-status {
		color: var(--ddsa-primary-500, #cb997e);
	}

	.active-status {
		color: rgba(255, 255, 255, 0.55);
	}

	.locked-status {
		color: rgba(255, 255, 255, 0.3);
	}

	/* Substeps */
	.substep-list {
		margin-left: 12px;
		padding: 4px 0 8px 24px;
		border-left: 1px dashed rgba(255, 255, 255, 0.1);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.substep-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 6px;
		transition: all 0.15s ease;
	}

	.substep-item:hover:not(.substep-locked) {
		background: rgba(255, 255, 255, 0.06);
	}

	.substep-active {
		background: rgba(203, 153, 126, 0.12);
	}

	.substep-locked {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.substep-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
		transition: all 0.2s ease;
	}

	.dot-active {
		background: var(--ddsa-primary-500, #cb997e);
		box-shadow: 0 0 8px rgba(203, 153, 126, 0.6);
	}

	.dot-complete {
		background: var(--ddsa-primary-500, #cb997e);
	}

	.dot-locked {
		background: rgba(255, 255, 255, 0.1);
	}

	.substep-label {
		flex: 1;
		font-family: var(--font-paragraph);
		font-size: 12px;
		font-weight: 450;
		color: rgba(255, 255, 255, 0.6);
		text-align: left;
		transition: color 0.15s ease;
	}

	.substep-active .substep-label {
		color: var(--ddsa-primary-500, #cb997e);
		font-weight: 600;
	}

	.substep-complete .substep-label {
		color: rgba(255, 255, 255, 0.75);
	}
</style>
