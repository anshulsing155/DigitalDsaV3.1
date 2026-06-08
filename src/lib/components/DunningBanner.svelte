<!--
  D.1 S5 M4 — Persistent dunning banner
  ══════════════════════════════════════════════════════════════════
  Rendered above every DSA-facing page when their subscription is in
  dunning_t0 / dunning_grace / dunning_final. State + dunningStartedAtIso
  arrive via root +layout.server.ts → data.dunningBanner.

  Two CTAs:
    - "Update payment method" → navigates to /dashboard/dsa/billing
    - "Retry now"             → POST /api/billing/subscription/retry-now
                                via secureFetch (CSRF). On success,
                                invalidateAll() re-runs the server load
                                and the banner clears once state → active.

  Copy varies by state (see messageFor):
    dunning_t0    → first failure, reassuring "we'll retry over a few days"
    dunning_grace → urgency ramping, "X days of access left"
    dunning_final → final notice, "access ends tomorrow"

  NOT DISMISSIBLE (locked per spec 2026-05-25). No X button, no localStorage
  hide flag. The banner is the only persistent in-app signal that a DSA's
  subscription is failing — letting them dismiss it would silently lose
  the funnel.

  Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S5
  ══════════════════════════════════════════════════════════════════
-->
<script lang="ts">
	import { secureFetch } from '$lib/utils/csrf';
	import { goto, invalidateAll } from '$app/navigation';
	import { uiState } from '$lib/state/ui.svelte';

	interface Props {
		bannerState: 'dunning_t0' | 'dunning_grace' | 'dunning_final';
		dunningStartedAtIso: string;
	}

	let { bannerState, dunningStartedAtIso }: Props = $props();

	// In-flight guard for the Retry Now button so a double-click can't
	// race the rate limiter. Resets after the response (success OR error).
	let retrying = $state(false);

	// Days elapsed since first failure — matches the server-side
	// daysSinceFirstFailure helper (Pitfall #62 of staleness — we use
	// same elapsed-24h math, no calendar-day rounding). Computed once
	// at render time; we don't tick the value live because the banner
	// is event-driven (next navigation re-loads state from server).
	let daysSinceFailure = $derived.by(() => {
		const startedAt = new Date(dunningStartedAtIso);
		const diffMs = Date.now() - startedAt.getTime();
		if (diffMs <= 0) return 0;
		return Math.floor(diffMs / (24 * 60 * 60 * 1000));
	});

	// Days remaining until downgrade — driven by spec thresholds:
	//   downgrade fires at dunning_final + 8 days from dunning_started_at.
	// The "8" is the cumulative day-N for the final → downgraded transition.
	let daysUntilDowngrade = $derived(Math.max(0, 8 - daysSinceFailure));

	// Human-readable "X days" that accounts for 0, 1, and plural.
	let daysLeftLabel = $derived(
		daysUntilDowngrade === 0
			? 'today'
			: daysUntilDowngrade === 1
				? 'tomorrow'
				: `in ${daysUntilDowngrade} days`
	);

	let messageFor = $derived.by(() => {
		switch (bannerState) {
			case 'dunning_t0':
				return {
					title: "Your last payment didn't go through",
					body:
						"We'll retry over the next few days. If it was a temporary issue, the next retry will clear it. If your card or bank account changed, update your payment method now."
				};
			case 'dunning_grace':
				return {
					title: `Payment still failing — ${daysUntilDowngrade} days of access left`,
					body:
						"We've been unable to charge your subscription for several days. Update your payment method to keep your access running."
				};
			case 'dunning_final':
				return {
					// Dynamic label instead of hardcoded "tomorrow" — at grace→final
					// boundary (day 6) daysUntilDowngrade is 2, not 1.
					title: `Access ends ${daysLeftLabel} — final notice`,
					body:
						"This is the last chance to fix your payment method before your subscription is downgraded. Updating now keeps everything running."
				};
		}
	});

	async function handleRetryNow() {
		if (retrying) return;
		retrying = true;
		try {
			const res = await secureFetch('/api/billing/subscription/retry-now', {
				method: 'POST'
			});
			// secureFetch returns the raw fetch response; check status + parse body
			if (res.ok) {
				const body = await res.json().catch(() => ({}) as Record<string, unknown>);
				// Engine outcomes are mapped on the endpoint; the success shape is
				// { ok: true, data: { outcome: 'succeeded' | 'failed_retryable' | ... } }
				const data = (body as { data?: { outcome?: string } }).data ?? {};
				if (data.outcome === 'succeeded') {
					uiState.success('Payment went through — access restored.', 5000);
					await invalidateAll(); // re-runs +layout.server.ts → banner clears
				} else {
					uiState.error(
						"That retry didn't work either. Update your payment method to fix the underlying issue.",
						8000
					);
				}
			} else if (res.status === 429) {
				uiState.error(
					'Too many retries — please wait a few minutes before trying again.',
					6000
				);
			} else {
				const body = await res.json().catch(() => ({}) as Record<string, unknown>);
				const message =
					(body as { error?: string }).error ?? 'Retry failed. Please try again.';
				uiState.error(message, 6000);
			}
		} catch (err) {
			uiState.error(
				"Couldn't reach the server. Check your connection and try again.",
				6000
			);
		} finally {
			retrying = false;
		}
	}

	function handleUpdatePaymentMethod() {
		void goto('/dashboard/dsa/billing');
	}
</script>

<aside
	class="dunning-banner"
	class:t0={bannerState === 'dunning_t0'}
	class:grace={bannerState === 'dunning_grace'}
	class:final={bannerState === 'dunning_final'}
	role="alert"
	aria-live="polite"
	data-testid="dunning-banner"
>
	<div class="content">
		<div class="text">
			<h3 class="title">⚠ {messageFor.title}</h3>
			<p class="body">{messageFor.body}</p>
		</div>
		<div class="actions">
			<button
				type="button"
				class="btn btn-primary"
				onclick={handleUpdatePaymentMethod}
				data-testid="dunning-banner-update-payment"
			>
				Update payment method
			</button>
			<button
				type="button"
				class="btn btn-secondary"
				onclick={handleRetryNow}
				disabled={retrying}
				data-testid="dunning-banner-retry-now"
			>
				{retrying ? 'Retrying…' : 'Retry now'}
			</button>
		</div>
	</div>
</aside>

<style>
	.dunning-banner {
		/* Sticky placement is OK; the banner sits at the top of every page
		   above all content. NOT dismissible — no close button. */
		position: sticky;
		top: 0;
		z-index: 50;
		padding: 12px 20px;
		border-bottom: 2px solid var(--_banner-border);
		font-size: 14px;
		line-height: 1.45;
		background: var(--_banner-bg);
		color: var(--_banner-text);
	}

	/* Color intensity scales with urgency. Custom properties let themes
	   override via --ddsa-warning-* / --ddsa-error-* tokens. */
	.dunning-banner.t0 {
		--_banner-bg: var(--ddsa-warning-50, #fff8e6);
		--_banner-text: var(--ddsa-warning-800, #8a6500);
		--_banner-border: var(--ddsa-warning-400, #e0b441);
	}
	.dunning-banner.grace {
		--_banner-bg: var(--ddsa-dunning-grace-bg, #fef0e3);
		--_banner-text: var(--ddsa-dunning-grace-text, #a14d11);
		--_banner-border: var(--ddsa-dunning-grace-border, #d97f3a);
	}
	.dunning-banner.final {
		--_banner-bg: var(--ddsa-error-50, #fde4e4);
		--_banner-text: var(--ddsa-error-800, #9b1c1c);
		--_banner-border: var(--ddsa-error-400, #d04545);
	}

	.content {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		max-width: 1200px;
		margin: 0 auto;
	}

	.text {
		flex: 1 1 320px;
	}

	.title {
		margin: 0 0 4px;
		font-size: 15px;
		font-weight: 600;
	}
	.body {
		margin: 0;
		font-size: 13px;
		opacity: 0.92;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn {
		padding: 8px 16px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid currentColor;
		transition: background-color 0.15s, color 0.15s;
	}
	.btn-primary {
		background: currentColor;
		color: white;
	}
	.btn-primary:hover {
		opacity: 0.9;
	}
	.btn-secondary {
		background: transparent;
		color: inherit;
	}
	.btn-secondary:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.04);
	}
	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	/* Dark mode — override the scoped custom properties. */
	@media (prefers-color-scheme: dark) {
		.dunning-banner.t0 {
			--_banner-bg: var(--ddsa-warning-900, #3a2e0e);
			--_banner-text: var(--ddsa-warning-200, #f4d27a);
			--_banner-border: var(--ddsa-warning-600, #a17a25);
		}
		.dunning-banner.grace {
			--_banner-bg: var(--ddsa-dunning-grace-bg-dark, #3d2110);
			--_banner-text: var(--ddsa-dunning-grace-text-dark, #f0a96a);
			--_banner-border: var(--ddsa-dunning-grace-border-dark, #b86833);
		}
		.dunning-banner.final {
			--_banner-bg: var(--ddsa-error-900, #3d1313);
			--_banner-text: var(--ddsa-error-200, #f4a8a8);
			--_banner-border: var(--ddsa-error-600, #b54040);
		}
	}
</style>
