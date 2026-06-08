<script lang="ts">
	import { getContext } from 'svelte';
	import { dev } from '$app/environment';
	import { ChevronLeft, ChevronRight, CircleAlert, FlaskConical } from '$lib/utils/iconRegistry';
	import { DEV_QA_SAVE_CONTEXT_KEY, type DevQaSaveContext } from './devQaSaveContext';

	// Dev-only: pulled from FormShell via context. When present AND the Submit
	// button is shown (i.e., final page of the wizard), we render a small
	// "Save QA Scenario" button to the left of Submit. Undefined in prod.
	const devQaSave = getContext<DevQaSaveContext | undefined>(DEV_QA_SAVE_CONTEXT_KEY);

	interface Props {
		showPrevious?: boolean;
		showNext?: boolean;
		showSubmit?: boolean;
		nextLabel?: string;
		previousLabel?: string;
		submitLabel?: string;
		isSubmitting?: boolean;
		nextDisabled?: boolean;
		submitDisabled?: boolean;
		onPrevious?: () => void;
		onNext?: () => void;
		onSubmit?: () => void;
		submitError?: string | null;
		errorSummary?: string[];
		/** General reason why Next is disabled (shown when errorSummary is empty) */
		disabledReason?: string;
		/** When true, show error summary even though Next is enabled (validate-on-click mode) */
		showValidationHint?: boolean;
		incompleteErrors?: Array<{ label: string; pageIndex: number }>;
		onErrorNavigate?: (pageIndex: number) => void;
	}

	let {
		showPrevious = true,
		showNext = false,
		showSubmit = false,
		nextLabel = 'Next',
		previousLabel = 'Previous',
		submitLabel = 'Show Offers',
		isSubmitting = false,
		nextDisabled = false,
		submitDisabled = false,
		onPrevious,
		onNext,
		onSubmit,
		submitError = null,
		errorSummary = [],
		disabledReason = '',
		showValidationHint = false,
		incompleteErrors = [],
		onErrorNavigate
	}: Props = $props();

	// Surface WHY the action is blocked. True when either:
	//   • Next is disabled / validate-on-click hint is active (existing behavior), OR
	//   • the Submit/Show-Offers button is shown AND disabled.
	// Gating the submit case on `showSubmit` (not bare `submitDisabled`) preserves the
	// validate-on-click UX on Next pages — those pass submitDisabled too but should NOT
	// nag proactively. On the final page a disabled Submit can't be clicked to set
	// showValidationHint, so without this the gate would have no visible reason.
	let showBlockReason = $derived(
		nextDisabled || showValidationHint || (showSubmit && submitDisabled)
	);
</script>

<div class="nav-bar">
	<div class="nav-bar-inner">
		{#if incompleteErrors.length > 0}
			<div class="error-message !border-l-1">
				<CircleAlert class="h-5 w-5 shrink-0" />
				<div class="error-list">
					<p class="alertText">Please complete all sections before submitting:</p>

					<ul class="error-links">
						{#each incompleteErrors as err}
							<li>
								<button
									type="button"
									class="error-link-btn"
									onclick={() => onErrorNavigate?.(err.pageIndex)}
								>
									{err.label}
									<ChevronRight class="h-4 w-4 shrink-0" />
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		{:else if submitError}
			<div class="error-message !border-l-1">
				<CircleAlert class="h-5 w-5 shrink-0" />
				<p class="alertText">{submitError}</p>
			</div>
		{/if}

		{#if showBlockReason && errorSummary.length > 0}
			<div class="warning-message !border-l-1">
				<CircleAlert class="h-5 w-5 shrink-0" />
				<p class="alertText">Missing : {errorSummary.join(', ')}</p>
			</div>
		{:else if showBlockReason && disabledReason}
			<div class="warning-message !border-l-1">
				<CircleAlert class="h-5 w-5 shrink-0" />
				<p class="alertText">{disabledReason}</p>
			</div>
		{/if}

		<div class="nav-buttons">
			<div class="nav-left">
				{#if showPrevious && onPrevious}
					<button
						class="nav-btn nav-btn-prev buttonText text-black dark:text-white"
						onclick={onPrevious}
						type="button"
						aria-label="Go to previous step"
					>
						<ChevronLeft class="h-4 w-4 shrink-0" />
						{previousLabel}
					</button>
				{/if}
			</div>
			<div class="nav-right">
				{#if dev && showSubmit && devQaSave}
					<button
						type="button"
						class="nav-btn nav-btn-qa-save buttonText"
						onclick={devQaSave.open}
						title="Save current form fill as a QA scenario (dev only)"
						aria-label="Save QA scenario"
					>
						<FlaskConical size={14} />
						Save QA
					</button>
				{/if}
				{#if showSubmit && onSubmit}
					<button
						class="nav-btn nav-btn-submit buttonText text-[var(--bg-header-text)]"
						onclick={onSubmit}
						disabled={submitDisabled || isSubmitting}
						type="button"
						aria-label="Submit application"
					>
						{#if isSubmitting}
							<span class="spinner-ring"></span>
							Submitting…
						{:else}
							{submitLabel}
						{/if}
					</button>
				{:else if showNext && onNext}
					<button
						class="nav-btn nav-btn-next buttonText text-[var(--bg-header-text)]"
						class:nav-btn-muted={nextDisabled}
						disabled={nextDisabled}
						onclick={onNext}
						type="button"
						aria-label="Go to next step"
					>
						{nextLabel}
						<ChevronRight class="h-4 w-4 shrink-0" />
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.nav-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 50;
		background: var(--form-nav-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--form-border);
	}

	.nav-bar-inner {
		max-width: 56rem; /* matches .form-container max-w-4xl */
		margin: 0 auto;
		/* Mobile-first: compact padding to prevent button overlap at 375px */
		padding: 0.625rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* On desktop, align nav bar with the form content area and add more padding */
	@media (min-width: 768px) {
		.nav-bar {
			left: 280px;
		}
		.nav-bar-inner {
			padding: 0.75rem 2rem;
		}
	}

	/* When context panel is visible, stop before it */
	@media (min-width: 1280px) {
		.nav-bar {
			right: 380px;
		}
	}

	.error-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: 100%;
	}

	.error-links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.error-link-btn {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-family: var(--font-paragraph);
		font-size: 0.72rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem 0.25rem;
		border-radius: 0.25rem;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.error-link-btn:hover {
		/* Fallback for browsers that don't support color-mix() */
		background: rgba(196, 112, 112, 0.15);
	}
	@supports (color: color-mix(in srgb, red 10%, blue)) {
		.error-link-btn:hover {
			background: color-mix(in srgb, var(--ddsa-error, #c47070) 15%, transparent);
		}
	}

	.nav-buttons {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		/* Allow wrapping at extreme widths to prevent overlap */
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.nav-left {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	/* Dev-only: inline QA scenario save button, sits left of Submit/Show Offers. */
	.nav-btn-qa-save {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border-radius: 9999px;
		border: 1px solid rgba(139, 92, 246, 0.45); /* violet-500 @ 45% */
		background: rgba(139, 92, 246, 0.12);
		color: #7c3aed; /* violet-600 */
		font-family: var(--font-paragraph);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.nav-btn-qa-save:hover {
		background: rgba(139, 92, 246, 0.2);
		border-color: rgba(139, 92, 246, 0.7);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		/* Mobile-first: compact padding to fit at 375px */
		padding: 0.625rem 1rem;
		border: none;
		border-radius: 0.5rem;
		/* font-family: var(--font-titleMedium);
		font-size: 0.8125rem; 13px — slightly smaller on mobile */
		white-space: nowrap;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	/* Restore full button sizing on tablet+ */
	@media (min-width: 768px) {
		.nav-btn {
			gap: 0.375rem;
			padding: 0.75rem 1.5rem;
			/* font-size: var(--font-size-14); */
		}
	}

	.nav-btn:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
		box-shadow: 0 0 0 4px var(--ddsa-accent-500, #2563eb);
	}

	.nav-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.nav-btn-muted {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-btn-prev {
		background: var(--form-bg-alt);
		/* color: var(--form-text); */
	}

	.nav-btn-prev:hover:not(:disabled) {
		opacity: 0.9;
	}

	.nav-btn-next,
	.nav-btn-submit {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500) 0%,
			var(--ddsa-accent-500) 51%,
			var(--ddsa-primary-500) 100%
		);
		background-size: 200% auto;
		/* color: white; */
		box-shadow: 0 4px 12px rgba(221, 190, 169, 0.25);
		transition: all 0.4s ease;
	}

	.nav-btn-next:hover:not(.nav-btn-muted),
	.nav-btn-submit:hover:not(:disabled) {
		background-position: right center;
		box-shadow: 0 6px 16px rgba(221, 190, 169, 0.35);
		transform: translateY(-1px);
	}

	.spinner-ring {
		display: inline-block;
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
