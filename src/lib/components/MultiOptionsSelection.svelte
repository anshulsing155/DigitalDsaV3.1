<script lang="ts">
	import { shouldShow } from '$lib/config/showWhenEngine';
	import { onMount } from 'svelte';
	import type { Answers } from '$lib/types/formTypes';

	interface OptionType {
		label: string;
		value: string;
		description?: string;
		showWhen?: unknown;
	}

	interface Props {
		options?: OptionType[];
		questionId: string;
		answers: Answers;
		compact?: boolean;
	}

	let { options = [], questionId, answers = $bindable({}), compact = false }: Props = $props();

	// Ref for scroll container
	let listRef: HTMLElement | null = $state(null);

	// Handle wheel events - pass through when at scroll boundaries
	function handleWheel(e: WheelEvent) {
		if (!listRef) return;

		const { scrollTop, scrollHeight, clientHeight } = listRef;
		const atTop = scrollTop <= 0;
		const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

		// If scrolling up at top, or scrolling down at bottom, let parent handle it
		if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
			// Don't prevent default - let it bubble to parent
			return;
		}

		// Otherwise, handle scroll internally
		e.stopPropagation();
	}

	let dataIterable: OptionType[] = $state([]);
	let selected: Record<string, boolean> = $state({});
	let visibleSelected: Record<string, boolean> = $state({});
	let errorMsg: string = $state('');
	let validated: boolean = $state(false);
	let wasValidated: boolean = $state(false); // Track if user previously validated then changed answer

	// Derived: check if all visible options are answered
	let checkContinue = $derived(
		dataIterable.length > 0 && dataIterable.every((opt) => selected[opt.value] !== undefined)
	);

	// refs for option DOM elements so we can scroll to them
	// (removed optionRefs - using DOM query instead)

	// Load existing values
	onMount(() => {
		selected = answers?.[questionId] ?? {};
		visibleSelected = answers?.[questionId + 'Visible'] ?? {};

		// Check if all visible options are answered
		const visibleOptions = options.filter((opt) => shouldShow(opt.showWhen as any, answers));
		const allAnswered =
			visibleOptions.length > 0 && visibleOptions.every((opt) => selected[opt.value] !== undefined);

		// Only keep Validate=true if all options are answered
		// Otherwise reset to false - user must click continue
		if (!allAnswered) {
			answers[questionId + 'Validate'] = false;
		}
	});

	// When user selects Yes/No
	function choose(val: boolean, key: string) {
		selected = { ...selected, [key]: val };

		// Update visibleSelected
		visibleSelected = dataIterable.reduce((acc: Record<string, boolean>, opt: OptionType) => {
			acc[opt.value] = selected[opt.value];
			return acc;
		}, {});

		// Track if user changed answer after previously validating
		if (validated) {
			wasValidated = true;
		}
		validated = false;

		// Use Object.assign to mutate the existing object (preserves $state proxy)
		answers[questionId] = selected;
		answers[questionId + 'Visible'] = visibleSelected;
		answers[questionId + 'Validate'] = false;

		errorMsg = '';
	}

	// Derived: filter visible options based on answers (read-only, no state mutation)
	let filteredOptions = $derived(options.filter((opt) => shouldShow(opt.showWhen as any, answers)));

	// Track previous options count to detect when new options appear
	let prevOptionsCount = $state(0);

	// Effect 1: Update dataIterable when filteredOptions changes
	$effect(() => {
		const newCount = filteredOptions.length;
		const optionsAdded = newCount > prevOptionsCount && prevOptionsCount > 0;

		dataIterable = filteredOptions;
		prevOptionsCount = newCount;

		// Only reset validation if NEW options were added (not on initial load or removal)
		// This ensures Continue button works, but adding new options requires re-validation
		if (optionsAdded) {
			answers[questionId + 'Validate'] = false;
		}
	});

	// Effect 2: Sync selected with answers on mount/change (with guard to prevent loops)
	let lastSyncHash = '';
	$effect(() => {
		// Include both answers and dataIterable in hash to re-run when either changes
		const answersHash = JSON.stringify(answers[questionId] ?? {});
		const optionsHash = dataIterable.map((o) => o.value).join(',');
		const currentHash = `${answersHash}-${optionsHash}`;

		if (currentHash === lastSyncHash) return;
		lastSyncHash = currentHash;

		const current = answers[questionId] ?? {};
		const newSelected: Record<string, boolean> = {};

		for (const opt of dataIterable) {
			if (opt.value in current) {
				newSelected[opt.value] = current[opt.value];
			}
		}

		selected = newSelected;
	});

	// Auto-validate in compact mode when all options are answered
	$effect(() => {
		if (!compact) return;
		if (checkContinue && !answers[questionId + 'Validate']) {
			answers[questionId] = selected;
			answers[questionId + 'Visible'] = visibleSelected;
			answers[questionId + 'Validate'] = true;
			validated = true;
		} else if (!checkContinue && answers[questionId + 'Validate']) {
			answers[questionId + 'Validate'] = false;
			validated = false;
		}
	});

	function ContinueFunction() {
		if (!checkContinue) {
			errorMsg = 'Select all options';

			// find first unselected option and scroll to it
			const firstMissing = dataIterable.find((opt) => selected[opt.value] === undefined);
			if (firstMissing) {
				const el = document.querySelector(`[data-opt-value="${firstMissing.value}"]`);
				if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
					(el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
					const btn = el.querySelector('button');
					if (btn) (btn as HTMLElement).focus();
				}
			}
			return;
		}

		validated = true;
		wasValidated = false; // Reset after successful validation

		// Use direct mutation to preserve $state proxy
		answers[questionId] = selected;
		answers[questionId + 'Visible'] = visibleSelected;
		answers[questionId + 'Validate'] = true;
	}
</script>

{#if dataIterable?.length > 0 && dataIterable}
	{@const answeredCount = dataIterable.filter((opt) => selected[opt.value] !== undefined).length}
	{@const totalCount = dataIterable.length}
	{@const progressPercent = Math.round((answeredCount / totalCount) * 100)}

	<div class="statement-container" class:compact>
		{#if !compact}
			<!-- Header with Progress -->
			<div class="statement-header">
				<div class="header-content">
					<div class="header-icon">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
							<path
								d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
					<div class="header-text">
						<h3 class="header-title">Confirm Each Statement</h3>
						<p class="header-subtitle">Please verify by selecting Yes or No</p>
					</div>
				</div>
				<div class="progress-badge" class:complete={checkContinue}>
					<span class="progress-count">{answeredCount}/{totalCount}</span>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="progress-bar-container">
				<div class="progress-bar-fill" style="width: {progressPercent}%"></div>
			</div>
		{/if}

		<!-- Statements List -->
		<div
			class="statements-list"
			class:compact-list={compact}
			bind:this={listRef}
			onwheel={handleWheel}
		>
			{#each dataIterable as opt, index (opt.value)}
				{@const isAnswered = selected[opt.value] !== undefined}
				{@const isYes = selected[opt.value] === true}
				{@const isNo = selected[opt.value] === false}

				<div
					data-opt-value={opt.value}
					tabindex="-1"
					class="statement-card"
					class:answered={isAnswered}
					class:unanswered-error={errorMsg && !isAnswered}
				>
					<div class="statement-number">
						{#if isAnswered}
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
							>
								<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						{:else}
							{index + 1}
						{/if}
					</div>

					<div class="statement-content">
						<p class="statement-text">{opt.label}</p>
						{#if opt.description}
							<p class="statement-description">{opt.description}</p>
						{/if}
					</div>

					<div class="button-group">
						<button
							type="button"
							onclick={() => choose(true, opt.value)}
							class="choice-btn yes-btn"
							class:selected={isYes}
							aria-label="Yes"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
							>
								<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<span>Yes</span>
						</button>

						<button
							type="button"
							onclick={() => choose(false, opt.value)}
							class="choice-btn no-btn"
							class:selected={isNo}
							aria-label="No"
						>
							<svg
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
							<span>No</span>
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if !compact}
			<!-- Footer -->
			<div class="statement-footer">
				{#if errorMsg}
					<p class="error-message">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
						Please answer all statements to continue
					</p>
				{/if}

				<button
					type="button"
					onclick={ContinueFunction}
					class="continue-btn"
					class:enabled={checkContinue}
					class:needs-reconfirm={checkContinue && wasValidated}
				>
					{#if checkContinue && wasValidated}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round" />
							<path
								d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Re-confirm & Continue
					{:else if checkContinue}
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
						</svg>
						All Done - Continue
					{:else}
						{answeredCount} of {totalCount} answered
					{/if}
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.statement-container {
		background: var(--form-bg-card);
		border: 1px solid var(--form-border);
		border-radius: 16px;
		overflow: hidden;
	}

	.statement-container.compact {
		border: none;
		border-radius: 0;
		background: transparent;
	}

	/* Header */
	.statement-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		background: #1a1a1a;
		color: #ffffff;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--color-primary);
		border-radius: 10px;
		color: #1a1a1a;
	}

	.header-title {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 16px;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.header-subtitle {
		font-family: var(--font-paragraph);
		font-size: 13px;
		color: #999999;
		margin: 0.125rem 0 0 0;
	}

	.progress-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		background: var(--form-border);
		border-radius: 20px;
		transition: all 0.3s ease;
	}

	.progress-badge.complete {
		background: var(--color-primary);
	}

	.progress-count {
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 14px;
		color: #ffffff;
	}

	.progress-badge.complete .progress-count {
		color: #1a1a1a;
	}

	/* Progress Bar */
	.progress-bar-container {
		height: 4px;
		background: var(--form-border);
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.4s ease;
	}

	/* Statements List */
	.statements-list {
		max-height: 400px;
		overflow-y: auto;
		overscroll-behavior: contain; /* Prevents scroll trapping at boundaries */
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		scroll-behavior: smooth;
	}

	.statements-list.compact-list {
		max-height: none;
		overflow-y: visible;
		padding: 0;
	}

	/* Scrollbar */
	.statements-list::-webkit-scrollbar {
		width: 6px;
	}

	.statements-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.statements-list::-webkit-scrollbar-thumb {
		background: var(--form-border-hover);
		border-radius: 10px;
	}

	.statements-list::-webkit-scrollbar-thumb:hover {
		background: var(--form-text-muted);
	}

	.statement-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--form-bg-alt);
		border: 2px solid transparent;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.statement-card:hover {
		background: var(--form-bg-disabled);
	}

	.statement-card.answered {
		background: var(--form-bg-card);
		border-color: var(--color-primary);
	}

	.statement-card.unanswered-error {
		border-color: #ef4444;
		animation: shake 0.4s ease;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		25% {
			transform: translateX(-4px);
		}
		75% {
			transform: translateX(4px);
		}
	}

	.statement-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		min-width: 32px;
		background: var(--form-border);
		border-radius: 50%;
		font-family: var(--font-title);
		font-weight: 700;
		font-size: 13px;
		color: var(--form-text-muted);
		transition: all 0.2s ease;
	}

	.statement-card.answered .statement-number {
		background: var(--color-primary);
		color: #1a1a1a;
	}

	.statement-content {
		flex: 1;
		min-width: 0;
	}

	.statement-text {
		font-family: var(--font-paragraph);
		font-size: 14px;
		color: var(--form-text);
		margin: 0;
		line-height: 1.4;
	}

	.statement-description {
		font-family: var(--font-paragraph);
		font-size: 12px;
		color: var(--form-text-muted);
		margin: 0.25rem 0 0 0;
	}

	/* Button Group */
	.button-group {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.choice-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border: 2px solid var(--form-border);
		border-radius: 8px;
		background: var(--form-bg-card);
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 13px;
		color: var(--form-text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.choice-btn:hover {
		border-color: var(--form-border-hover);
		background: var(--form-bg-input);
	}

	.yes-btn.selected {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: #1a1a1a;
	}

	.no-btn.selected {
		background: #1a1a1a;
		border-color: #1a1a1a;
		color: #ffffff;
	}

	:global(.dark) .no-btn.selected {
		background: #e5e7eb;
		border-color: #e5e7eb;
		color: #1a1a1a;
	}

	/* Footer */
	.statement-footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		background: var(--form-bg-alt);
		border-top: 1px solid var(--form-border);
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-paragraph);
		font-size: 13px;
		color: #ef4444;
		margin: 0;
	}

	.continue-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		max-width: 280px;
		padding: 0.875rem 1.5rem;
		background: var(--form-border);
		border: none;
		border-radius: 10px;
		font-family: var(--font-title);
		font-weight: 500;
		font-size: 15px;
		color: var(--form-text-muted);
		cursor: not-allowed;
		transition: all 0.2s ease;
	}

	.continue-btn.enabled {
		background: var(--color-primary);
		color: #1a1a1a;
		cursor: pointer;
	}

	.continue-btn.enabled:hover {
		background: #e6b800;
		transform: translateY(-1px);
	}

	.continue-btn.needs-reconfirm {
		background: var(--color-primary);
		color: #1a1a1a;
		cursor: pointer;
		animation: pulse-btn 1.5s ease-in-out infinite;
	}

	@keyframes pulse-btn {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(255, 204, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(255, 204, 0, 0);
		}
	}

	/* Mobile */
	@media (max-width: 640px) {
		.statement-header {
			padding: 1rem 1.25rem;
			flex-wrap: wrap;
			gap: 0.75rem;
		}

		.header-icon {
			width: 36px;
			height: 36px;
		}

		.header-title {
			font-size: 15px;
		}

		.progress-badge {
			padding: 0.375rem 0.75rem;
		}

		.statements-list {
			padding: 0.75rem;
			max-height: 350px;
		}

		.statement-card {
			flex-wrap: wrap;
			padding: 0.875rem 1rem;
			gap: 0.75rem;
		}

		.statement-number {
			width: 28px;
			height: 28px;
			min-width: 28px;
			font-size: 12px;
		}

		.statement-content {
			flex: 1 1 calc(100% - 44px);
			order: 1;
		}

		.button-group {
			width: 100%;
			order: 2;
			justify-content: flex-end;
		}

		.choice-btn {
			padding: 0.5rem 1rem;
			flex: 1;
			justify-content: center;
		}

		.statement-footer {
			padding: 1rem 1.25rem;
		}

		.continue-btn {
			max-width: 100%;
		}
	}
</style>
