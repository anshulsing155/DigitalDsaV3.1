<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n';

	interface Props {
		step: number;
		totalSteps: number;
		title: string;
		description?: string;
		icon?: string;
		onNext?: () => void;
		onPrevious?: () => void;
		nextDisabled?: boolean;
		children: Snippet;
	}

	let {
		step,
		totalSteps,
		title,
		description = '',
		icon = '📋',
		onNext = () => {},
		onPrevious = () => {},
		nextDisabled = false,
		children
	}: Props = $props();

	const progress = $derived((step / totalSteps) * 100);
	const isLastStep = $derived(step === totalSteps);
</script>

<div class="plain-language-wrapper">
	<!-- Progress Bar -->
	<div class="progress-section">
		<div class="progress-bar" style="width: {progress}%"></div>
		<div class="progress-text">
			{t('help.complete', { percent: Math.round(progress) })}
		</div>
	</div>

	<!-- Step Header -->
	<div class="step-header">
		<div class="step-icon">{icon}</div>
		<div class="step-info">
			<h2 class="step-title">{title}</h2>
			{#if description}
				<p class="step-description">{description}</p>
			{/if}
		</div>
	</div>

	<!-- Form Content -->
	<div class="form-content" in:fly={{ y: 20, duration: 300, easing: quintOut }}>
		{@render children()}
	</div>

	<!-- Navigation -->
	<div class="form-navigation">
		{#if step > 1}
			<button
				type="button"
				class="btn btn-secondary"
				onclick={onPrevious}
				aria-label={t('common.back')}
			>
				← {t('common.back')}
			</button>
		{/if}
		<button
			type="button"
			class="btn btn-primary"
			disabled={nextDisabled}
			onclick={onNext}
			aria-label={isLastStep ? t('common.submit') : t('common.next')}
		>
			{isLastStep ? t('common.submit') : t('common.next')} →
		</button>
	</div>
</div>

<style>
	.plain-language-wrapper {
		max-width: 600px;
		margin: 0 auto;
		padding: 24px 20px;
	}

	/* Progress Bar */
	.progress-section {
		margin-bottom: 32px;
	}

	.progress-bar {
		height: 6px;
		background: linear-gradient(
			to right,
			var(--ddsa-primary-600, #b8956a),
			var(--ddsa-primary-500, #cb997e)
		);
		border-radius: 3px;
		transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		margin-bottom: 12px;
	}

	.progress-text {
		font-size: 13px;
		color: var(--form-text-secondary, #6b7280);
		font-weight: 500;
		letter-spacing: 0.3px;
	}

	/* Step Header */
	.step-header {
		display: flex;
		gap: 20px;
		margin-bottom: 32px;
		align-items: flex-start;
	}

	.step-icon {
		font-size: 48px;
		text-align: center;
		min-width: 60px;
		line-height: 1;
	}

	.step-info {
		flex: 1;
		padding-top: 4px;
	}

	.step-title {
		font-size: 24px;
		font-weight: 600;
		margin: 0;
		color: var(--form-text, #1f2937);
		line-height: 1.2;
		letter-spacing: -0.3px;
	}

	.step-description {
		font-size: 14px;
		color: var(--form-text-secondary, #6b7280);
		margin: 8px 0 0 0;
		line-height: 1.5;
	}

	/* Form Content */
	.form-content {
		margin-bottom: 40px;
		min-height: 120px;
	}

	/* Navigation */
	.form-navigation {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 40px;
		padding-top: 24px;
		border-top: 1px solid var(--form-border, #e5e7eb);
	}

	@media (max-width: 640px) {
		.form-navigation {
			justify-content: stretch;
			gap: 10px;
		}
	}

	/* Buttons */
	.btn {
		padding: 12px 20px;
		font-size: 16px;
		font-weight: 500;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.btn-primary {
		flex: 1;
		background: var(--ddsa-primary-600, #b8956a);
		color: white;
		min-height: 44px;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--ddsa-primary-700, #a88567);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(203, 153, 126, 0.2);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		flex: 1;
		background: var(--form-bg-alt, #f3f4f6);
		color: var(--form-text, #1f2937);
		min-height: 44px;
		border: 1px solid var(--form-border, #e5e7eb);
	}

	.btn-secondary:hover {
		background: var(--form-bg-hover, #e5e7eb);
		transform: translateY(-1px);
	}

	.btn-secondary:active {
		transform: translateY(0);
	}

	/* Dark mode */
	:global(.dark) .step-title {
		color: var(--form-text-dark, #f3f4f6);
	}

	:global(.dark) .step-description {
		color: var(--form-text-secondary-dark, #d1d5db);
	}

	:global(.dark) .progress-text {
		color: var(--form-text-secondary-dark, #d1d5db);
	}

	:global(.dark) .progress-bar {
		background: linear-gradient(
			to right,
			var(--ddsa-primary-500, #cb997e),
			var(--ddsa-primary-400, #ddbea9)
		);
	}

	:global(.dark) .btn-secondary {
		background: var(--form-bg-alt-dark, #2d2d2d);
		color: var(--form-text-dark, #f3f4f6);
		border-color: var(--form-border-dark, #4b5563);
	}

	:global(.dark) .btn-secondary:hover {
		background: var(--form-bg-hover-dark, #3d3d3d);
	}

	:global(.dark) .form-navigation {
		border-top-color: var(--form-border-dark, #4b5563);
	}
</style>
