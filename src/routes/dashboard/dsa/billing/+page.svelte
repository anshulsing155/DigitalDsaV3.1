<script lang="ts">
	/**
	 * Billing dashboard — DSA-facing page
	 * ══════════════════════════════════════════════════════════════
	 * Composed entirely of two self-fetching components:
	 *   - SubscribeRecurringSection  — shown when DSA has no active sub
	 *     (handles plan picker → ₹1 verification → mandate auth flow)
	 *   - ManageSubscriptionPanel    — shown when DSA has an active sub
	 *     (3 tabs: Subscription / Transactions / Payment method)
	 *
	 * Each component self-hides based on subscription state, so this page
	 * just provides a clean shell. The previous legacy one-time-pay flow
	 * (status card, plan grid, Razorpay checkout, cancel modal, history
	 * table) was retired in the D.1 S8-skip cleanup (2026-05-28) — see
	 * the spec rationale in docs/specs/D-1-RECURRING-BILLING-SPEC.md.
	 * ══════════════════════════════════════════════════════════════
	 */
	import { Shield, Lock, RefreshCw } from 'lucide-svelte';
	import SubscribeRecurringSection from '$lib/components/billing/SubscribeRecurringSection.svelte';
	import ManageSubscriptionPanel from '$lib/components/billing/ManageSubscriptionPanel.svelte';
</script>

<svelte:head>
	<title>Billing & Subscription — DigitalDSA</title>
</svelte:head>

<div class="billing-page">
	<header class="billing-header">
		<h1 class="billing-title">Billing & Subscription</h1>
		<p class="billing-subtitle">
			Manage your auto-pay plan, view transactions, and update your payment method.
		</p>
	</header>

	<!-- Subscribe entry (self-hides when DSA already has an active recurring sub) -->
	<SubscribeRecurringSection />

	<!-- Manage panel (self-hides when DSA has no recurring sub) -->
	<ManageSubscriptionPanel />

	<!-- Trust footer — sets expectations for the recurring billing model -->
	<section class="trust-strip" aria-label="How recurring billing works">
		<div class="trust-item">
			<div class="trust-icon"><Shield size={16} /></div>
			<div>
				<p class="trust-label">RBI-compliant auto-pay</p>
				<p class="trust-detail">
					eNACH mandate issued via Razorpay. You authorise once; we charge on your monthly anchor
					date.
				</p>
			</div>
		</div>
		<div class="trust-item">
			<div class="trust-icon"><Lock size={16} /></div>
			<div>
				<p class="trust-label">No card details stored</p>
				<p class="trust-detail">
					Razorpay holds the mandate token. We only see the per-cycle debit status.
				</p>
			</div>
		</div>
		<div class="trust-item">
			<div class="trust-icon"><RefreshCw size={16} /></div>
			<div>
				<p class="trust-label">Cancel or pause anytime</p>
				<p class="trust-detail">
					Pause for up to 90 days, change plans, or cancel from the Manage panel. Changes apply
					from your next anchor date.
				</p>
			</div>
		</div>
	</section>
</div>

<style>
	.billing-page {
		max-width: 64rem;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}

	/* ── Header ──────────────────────────────────────────── */

	.billing-header {
		margin-bottom: 1.5rem;
	}

	.billing-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--dash-text);
		margin: 0;
	}

	.billing-subtitle {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
		max-width: 42rem;
		line-height: 1.5;
	}

	/* ── Trust strip ─────────────────────────────────────── */

	.trust-strip {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
		gap: 1rem;
		margin-top: 2.5rem;
		padding: 1.25rem;
		border-radius: 0.75rem;
		background: var(--dash-bg-alt);
		border: 1px solid var(--dash-border);
	}

	.trust-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.trust-icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		background: var(--dash-bg-card);
		border: 1px solid var(--dash-border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--dash-text-secondary);
	}

	.trust-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--dash-text);
		margin: 0;
	}

	.trust-detail {
		font-size: 0.75rem;
		color: var(--dash-text-secondary);
		margin-top: 0.25rem;
		line-height: 1.4;
	}

	/* ── Mobile responsive ───────────────────────────────── */

	@media (max-width: 640px) {
		.billing-title {
			font-size: 1.25rem;
		}

		.trust-strip {
			padding: 1rem;
			margin-top: 2rem;
		}
	}
</style>
