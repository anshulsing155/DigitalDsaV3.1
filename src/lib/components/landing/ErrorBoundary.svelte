<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { secureFetch } from '$lib/utils/csrf';
	import { browser, dev } from '$app/environment';

	interface Props {
		fallback?: boolean;
		children?: Snippet;
	}

	let { fallback = false, children }: Props = $props();

	let hasError = $state(false);
	let errorMessage = $state('');

	/**
	 * Decide whether an error should trigger the full-page fallback.
	 *
	 * Default is "yes, treat as critical" — we want to catch real bugs in our
	 * code. This function filters out known non-critical sources so a single
	 * SW registration failure or browser-extension noise doesn't replace the
	 * entire page with the error screen.
	 *
	 * Filters (all return false → not critical → no fallback):
	 *   - Browser extensions (chrome-extension://, moz-extension://, etc.)
	 *   - Third-party scripts that handle their own errors (Razorpay, GA, GTM)
	 *   - Service worker registration failures (non-essential for landing)
	 *   - ResizeObserver loop warnings (benign, fired by the browser itself)
	 *   - Cross-origin "Script error" with no detail (browser-redacted, can't act on)
	 *
	 * Add to this list when you observe a noisy non-critical error in production.
	 */
	function isCriticalError(opts: {
		message?: string;
		filename?: string;
		stack?: string;
		reason?: unknown;
	}): boolean {
		const { message = '', filename = '', stack = '', reason } = opts;
		const reasonText =
			typeof reason === 'object' && reason !== null
				? String((reason as Error).message ?? reason)
				: String(reason ?? '');
		const allText = [message, filename, stack, reasonText].join(' ');

		// Browser extensions injecting code into the page
		if (/chrome-extension:\/\/|moz-extension:\/\/|safari-web-extension:\/\//.test(allText)) {
			return false;
		}

		// Third-party scripts that own their error UX
		if (
			/razorpay\.com|googletagmanager\.com|google-analytics\.com|doubleclick\.net/.test(allText)
		) {
			return false;
		}

		// Non-critical browser-internal or framework patterns
		if (
			/Failed to register a ServiceWorker/i.test(allText) ||
			/ResizeObserver loop (limit exceeded|completed)/i.test(allText) ||
			/^Script error\.?$/.test(message)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Fire-and-forget POST to the server reporting endpoint. Server handles
	 * dedup + rate-limit + email delivery via sendErrorAlert. Wrapped in
	 * try/catch so a failed report can't itself trigger another error event
	 * (would create an infinite loop).
	 */
	async function reportToServer(payload: {
		message: string;
		stack?: string;
		filename?: string;
	}): Promise<void> {
		try {
			await secureFetch('/api/errors/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: payload.message,
					stack: payload.stack,
					filename: payload.filename,
					path: window.location.pathname + window.location.search
				})
			});
		} catch {
			// best-effort — never throw out of this function
		}
	}

	onMount(() => {
		const handleError = (event: ErrorEvent) => {
			const critical = isCriticalError({
				message: event.message,
				filename: event.filename,
				stack: event.error?.stack
			});
			// Always log so devs see the full picture in DevTools
			console.error('[ErrorBoundary]', critical ? 'CRITICAL' : 'ignored', {
				message: event.message,
				filename: event.filename,
				error: event.error
			});
			if (critical) {
				// In dev mode: console log only (already done above). Don't replace UI
				// with the fallback or send alert emails — let developers see the raw
				// crash in DevTools and debug it. In production: show fallback UI and
				// auto-report to ops via email.
				if (dev) return;
				hasError = true;
				errorMessage = 'Something went wrong loading the page. Please refresh and try again.';
				reportToServer({
					message: event.message ?? '(no message)',
					stack: event.error?.stack,
					filename: event.filename
				});
			}
		};

		const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			const reasonMessage = (reason as Error)?.message ?? String(reason);
			const reasonStack = (reason as Error)?.stack;
			const critical = isCriticalError({
				reason,
				stack: reasonStack,
				message: reasonMessage
			});
			console.error('[ErrorBoundary]', critical ? 'CRITICAL' : 'ignored', { reason });
			if (critical) {
				// Dev: console only, no UI replacement, no alert email.
				if (dev) return;
				hasError = true;
				errorMessage = 'Failed to load some content. Please refresh the page.';
				reportToServer({
					message: reasonMessage,
					stack: reasonStack
				});
			}
		};

		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});

	function handleRefresh() {
		if (browser) window.location.reload();
	}

	function handleGoHome() {
		if (browser) window.location.href = '/';
	}
</script>

{#if hasError || fallback}
	<div class="error-overlay">
		<div class="error-container">
			<!-- Error Icon -->
			<div class="error-icon-wrap">
				<div class="error-icon-bg">
					<svg
						class="error-icon-svg"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="1.5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
				</div>
			</div>

			<!-- Error Message -->
			<h1 class="error-title">Something went wrong</h1>
			<p class="error-description">
				{errorMessage ||
					'We encountered an unexpected error while loading the page. Our team has been notified.'}
			</p>

			<!-- Action Buttons -->
			<div class="error-actions">
				<button onclick={handleRefresh} class="error-btn error-btn--primary">
					<svg
						class="error-btn-icon"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
						/>
					</svg>
					Refresh Page
				</button>
				<button onclick={handleGoHome} class="error-btn error-btn--outline">
					<svg
						class="error-btn-icon"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
						/>
					</svg>
					Go Home
				</button>
			</div>

			<!-- Support Info -->
			<div class="error-support">
				<div class="error-support-divider"></div>
				<p class="error-support-label">Need help? Contact our support team</p>
				<div class="error-support-contacts">
					<span>(+91) 120-4994466</span>
					<span class="error-support-separator">|</span>
					<span>support@digitaldsa.com</span>
				</div>
			</div>
		</div>
	</div>
{:else if children}
	{@render children()}
{/if}

<style>
	.error-overlay {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: var(--landing-bg);
	}

	.error-container {
		text-align: center;
		max-width: 28rem;
		width: 100%;
	}

	/* Icon */
	.error-icon-wrap {
		margin-bottom: 2rem;
	}

	.error-icon-bg {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 5rem;
		height: 5rem;
		border-radius: 9999px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.error-icon-svg {
		width: 2.5rem;
		height: 2.5rem;
		color: #f87171;
	}

	/* Title and description */
	.error-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--landing-text);
		margin-bottom: 0.75rem;
		letter-spacing: -0.01em;
	}

	.error-description {
		font-size: 0.9375rem;
		line-height: 1.7;
		color: var(--landing-text-secondary);
		margin-bottom: 2rem;
	}

	/* Buttons */
	.error-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		justify-content: center;
	}

	@media (min-width: 640px) {
		.error-actions {
			flex-direction: row;
		}
	}

	.error-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 600;
		padding: 0.75rem 1.75rem;
		border-radius: 9999px;
		cursor: pointer;
		transition: all 0.25s ease;
		border: none;
	}

	.error-btn--primary {
		background: var(--landing-accent);
		color: #0f172a;
		box-shadow: 0 2px 10px rgba(255, 204, 0, 0.25);
	}

	.error-btn--primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 16px rgba(255, 204, 0, 0.35);
	}

	.error-btn--outline {
		background: transparent;
		color: var(--landing-text-secondary);
		border: 1px solid var(--landing-border);
	}

	.error-btn--outline:hover {
		background: var(--landing-bg-alt);
		border-color: var(--landing-text-muted);
		transform: translateY(-1px);
	}

	.error-btn-icon {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* Support */
	.error-support {
		margin-top: 2.5rem;
	}

	.error-support-divider {
		width: 3rem;
		height: 1px;
		background: var(--landing-border);
		margin: 0 auto 1.25rem;
	}

	.error-support-label {
		font-size: 0.8125rem;
		color: var(--landing-text-muted);
		margin-bottom: 0.375rem;
	}

	.error-support-contacts {
		font-size: 0.8125rem;
		color: var(--landing-text-muted);
	}

	.error-support-separator {
		margin: 0 0.5rem;
		opacity: 0.5;
	}
</style>
