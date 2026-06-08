<script lang="ts">
	// Route-group error boundary for /(app)/* (forms, application pages, offers).
	// Catches errors thrown by load functions or +page.svelte mount logic inside
	// the (app) group, so the user keeps their app-shell context instead of being
	// dumped to the root error page (which tears down everything).
	//
	// See: docs/reviews/CODE-REVIEW-2026-05-13-full.md §L3.

	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import clientLogger from '$lib/utils/clientLogger';
	import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-svelte';

	interface ExtendedError {
		message?: string;
		code?: string;
	}

	let { error = null, status = 500 }: { error?: ExtendedError | null; status?: number } = $props();

	const determinedStatus = $derived(
		typeof $page.status === 'number' && $page.status >= 100 && $page.status < 600
			? $page.status
			: status
	);

	const friendlyMessage = $derived(
		determinedStatus === 404
			? "We couldn't find that page in your application flow."
			: determinedStatus === 403
				? "You don't have permission to access this part of the application."
				: determinedStatus === 401
					? 'Your session has expired. Please log in again.'
					: 'Something went wrong while loading this page.'
	);

	// Log once on mount so we get an entry per crash
	$effect(() => {
		if (!browser) return;
		clientLogger.error(
			{
				scope: '(app)',
				status: determinedStatus,
				message: error?.message,
				code: error?.code,
				path: window.location.pathname
			},
			`(app) route error ${determinedStatus}`
		);
	});

	function retry() {
		if (browser) window.location.reload();
	}

	function backToDashboard() {
		goto('/dashboard/dsa');
	}
</script>

<svelte:head>
	<title>Error {determinedStatus} — DigitalDSA</title>
</svelte:head>

<div class="error-container">
	<div class="error-card">
		<AlertCircle size={48} class="error-icon" />
		<h1 class="error-title">Error {determinedStatus}</h1>
		<p class="error-message">{friendlyMessage}</p>
		{#if error?.message && error.message !== friendlyMessage}
			<details class="error-details">
				<summary>Technical details</summary>
				<pre>{error.message}</pre>
			</details>
		{/if}
		<div class="error-actions">
			<button class="btn-primary" onclick={retry}>
				<RotateCcw size={16} />
				Retry
			</button>
			<button class="btn-secondary" onclick={backToDashboard}>
				<ArrowLeft size={16} />
				Back to dashboard
			</button>
		</div>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		min-height: 60vh;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
	}
	.error-card {
		max-width: 28rem;
		width: 100%;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.75rem;
		padding: 2rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	:global(.error-icon) {
		color: var(--color-danger, #dc2626);
		margin: 0 auto 1rem;
		display: block;
	}
	.error-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text-primary, #111827);
		margin: 0 0 0.5rem;
	}
	.error-message {
		color: var(--color-text-secondary, #6b7280);
		margin: 0 0 1.5rem;
		line-height: 1.5;
	}
	.error-details {
		text-align: left;
		margin: 0 0 1.5rem;
		font-size: 0.875rem;
	}
	.error-details summary {
		cursor: pointer;
		color: var(--color-text-secondary, #6b7280);
	}
	.error-details pre {
		margin: 0.5rem 0 0;
		padding: 0.75rem;
		background: var(--color-surface-muted, #f3f4f6);
		border-radius: 0.375rem;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.75rem;
	}
	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}
	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background 120ms ease;
	}
	.btn-primary {
		background: var(--color-primary, #0d92f4);
		color: white;
	}
	.btn-primary:hover {
		background: var(--color-primary-hover, #0a7dd4);
	}
	.btn-secondary {
		background: var(--color-surface, #fff);
		color: var(--color-text-primary, #111827);
		border-color: var(--color-border, #e5e7eb);
	}
	.btn-secondary:hover {
		background: var(--color-surface-muted, #f3f4f6);
	}
</style>
