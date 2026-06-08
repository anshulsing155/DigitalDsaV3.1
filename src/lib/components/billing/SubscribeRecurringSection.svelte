<script lang="ts">
	/**
	 * D.1 S2.1b — Subscribe-to-Recurring section on Billing page
	 * ══════════════════════════════════════════════════════════════
	 * Wires the DSA-facing UI for D.1 recurring billing:
	 *   1. Loads current subscription status via GET /api/billing/subscription/status
	 *   2. If not_subscribed / cancelled / downgraded → shows plan picker
	 *      + Subscribe Recurring button
	 *   3. Click → opens disclosure modal (₹1 + free-days copy per §11.1 + §4 S2)
	 *   4. Confirm → POSTs /api/billing/subscribe-recurring, redirects to auth URL
	 *   5. On return from auth, status polling kicks in (up to 60s waiting for
	 *      pending_mandate → active transition via webhook)
	 *
	 * Lives ALONGSIDE the existing one-time-payment flow during S8 migration.
	 * Hidden if DSA already has an active recurring subscription.
	 *
	 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S2 + §11.1
	 */
	import { onMount } from 'svelte';
	import {
		PLAN_LIST,
		getGstBreakdown,
		TRIAL_DAYS,
		type PlanId,
		type BillingPlan
	} from '$lib/config/billing';
	// Note: annual-cycle imports (BillingCycle, getAnnualPrice,
	// getAnnualSavings, ANNUAL_PRICE_MULTIPLIER) were removed on
	// 2026-05-28 per owner decision — monthly only, no toggle.
	import { secureFetch } from '$lib/utils/csrf';
	import { openAuthorizationUrl } from '$lib/utils/billingAuthReturn';
	import { getOrCreateDeviceId } from '$lib/utils/deviceId';

	// ── D.6 dedup: features shared by every plan, shown once in a header ──
	// Computed at module load — the intersection of every plan's features
	// excluding the "N active cases" line (which IS the per-tier
	// distinguisher). Cards render only the tier-specific extras.
	const SHARED_FEATURES: readonly string[] = (() => {
		const isCaseLine = (f: string) => /\bcases?\b/i.test(f);
		const planFeatureSets = PLAN_LIST.map((p) =>
			new Set(p.features.filter((f) => !isCaseLine(f)))
		);
		return PLAN_LIST[0].features
			.filter((f) => !isCaseLine(f))
			.filter((f) => planFeatureSets.every((s) => s.has(f)));
	})();

	function getTierExtras(plan: BillingPlan): string[] {
		// Per-tier additions vs the shared base. The case-limit line shows
		// separately as the headline differentiator.
		const isCaseLine = (f: string) => /\bcases?\b/i.test(f);
		return plan.features.filter((f) => !isCaseLine(f) && !SHARED_FEATURES.includes(f));
	}

	function formatCaseLimit(plan: BillingPlan): string {
		return plan.caseLimit === Infinity ? 'Unlimited cases' : `${plan.caseLimit} active cases`;
	}

	// ── State ──────────────────────────────────────────────────

	type SubState = 'not_subscribed' | 'pending_mandate' | 'active' | 'paused' |
		'dunning_t0' | 'dunning_grace' | 'dunning_final' | 'downgraded' | 'cancelled' | 'loading' | 'load_error' | 'wrong_identity';

	let subState = $state<SubState>('loading');
	let planId = $state<PlanId | null>(null);
	let planName = $state<string | null>(null);
	let nextChargeAt = $state<string | null>(null);
	let anchorDay = $state<number | null>(null);

	let selectedPlanId = $state<PlanId>('pro');
	let showDisclosureModal = $state(false);
	let isSubscribing = $state(false);
	let subscribeError = $state('');

	// Monthly-only pricing per owner decision. Derives the GST split per
	// ADR-0019 (prices include 18% GST) for display alongside the inclusive
	// total. An earlier version of this derived also handled an annual
	// cycle; that branch + the toggle UI were removed 2026-05-28 — the
	// product does monthly subscriptions only.
	const displayPriceFor = $derived((plan: BillingPlan) => {
		const inclusive = plan.priceMonthly;
		const { netTaxable, gst, total } = getGstBreakdown(inclusive);
		return {
			inclusive,
			netTaxable,
			gst,
			total,
			period: '/mo'
		};
	});

	// D.6: single Recommended badge, not the legacy dual-badge field.
	// Default to Pro (marketing default, matches landing-page PricingSection).
	// Slice 4 update: when the upgrade modal routes the DSA here with a
	// ?recommend=<planId> query param (set by confirmAndSubmit on a 402
	// case_limit_reached), override the default and auto-select that plan
	// so the DSA lands on the panel pre-aimed at the right upgrade.
	const VALID_PLAN_IDS: ReadonlySet<PlanId> = new Set(['basic', 'pro', 'enterprise']);
	let recommendedPlanId = $state<PlanId>('pro');

	// Trial state (2026-05-28). Drives whether the trial CTA ("Start free
	// trial — N days, no card") shows OR the standard plan picker with a
	// friendly returning-customer note. N is interpolated from TRIAL_DAYS
	// at render time so a constant flip in $lib/config/billing propagates
	// without a code edit here. The server is the authoritative eligibility
	// gate; we just render what the status endpoint says.
	let trialEligible = $state(false);
	let trialIneligibleReason = $state<string | null>(null);
	/**
	 * Set after a click-time eligibility rejection (subscribe-recurring
	 * 409). When the server reported `blocking_identifier: 'device'`, we
	 * flip this to true so the UI swaps the generic returning-customer
	 * copy for a device-specific friendly note. Other identifiers stay
	 * generic (we don't tell abusers which PII identifier matched).
	 */
	let deviceMatched = $state(false);
	/** True when the disclosure modal was opened from the trial CTA (vs paid). */
	let modalForTrial = $state(false);

	let isPolling = $state(false);
	let pollIntervalId: ReturnType<typeof setInterval> | null = null;

	// ── Derived ────────────────────────────────────────────────

	const canSubscribe = $derived(
		subState === 'not_subscribed' ||
			subState === 'downgraded' ||
			subState === 'cancelled' ||
			// Include 'wrong_identity' so the plan picker renders as a read-only
			// preview for RM/admin viewers who landed on /dashboard/dsa/billing.
			// The Subscribe button is disabled in that state (see button render)
			// and a notice at the top of the container explains why.
			subState === 'wrong_identity'
	);

	const selectedPlan = $derived(
		PLAN_LIST.find((p: BillingPlan) => p.id === selectedPlanId) ?? PLAN_LIST[1]
	);

	const proPlan = $derived(
		PLAN_LIST.find((p: BillingPlan) => p.id === 'pro') ?? PLAN_LIST[1]
	);

	// ── Status load + polling ──────────────────────────────────

	async function loadStatus(): Promise<void> {
		try {
			const res = await fetch('/api/billing/subscription/status');
			if (!res.ok) {
				// 401 means the session expired — the token refresh scheduler
				// or hooks.server.ts redirect should handle this. Don't fall
				// back to 'not_subscribed' (could prompt a duplicate subscribe).
				// 500+ is a transient server issue — show an error state so the
				// DSA knows the load failed instead of seeing a false "subscribe"
				// prompt.
				if (res.status === 403) {
					// Identity mismatch: caller is authenticated but not a DSA
					// (RM or admin browsing /dashboard/dsa/billing). Surface
					// a clear notice instead of the Subscribe button — the
					// button would otherwise 403 from /subscribe-recurring
					// for exactly the same reason.
					const body = await res.json().catch(() => ({}));
					if (body?.code === 'USER_NOT_DSA') {
						subState = 'wrong_identity';
						return;
					}
					subState = 'load_error';
				} else if (res.status === 404) {
					subState = 'not_subscribed';
				} else {
					subState = 'load_error';
				}
				return;
			}
			const { data } = await res.json();
			subState = data.state ?? 'not_subscribed';
			planId = data.plan_id ?? null;
			planName = data.plan_name ?? null;
			nextChargeAt = data.next_charge_at ?? null;
			anchorDay = data.anchor_day ?? null;
			trialEligible = data.trial_eligible ?? false;
			trialIneligibleReason = data.trial_ineligible_reason ?? null;
		} catch {
			// Network failure — don't pretend "not subscribed".
			subState = 'load_error';
		}
	}

	function startPolling(): void {
		if (pollIntervalId) return;
		isPolling = true;
		let attempts = 0;
		const MAX_ATTEMPTS = 30; // 60s @ 2s interval
		pollIntervalId = setInterval(async () => {
			attempts++;
			await loadStatus();
			if (subState !== 'pending_mandate' || attempts >= MAX_ATTEMPTS) {
				stopPolling();
			}
		}, 2000);
	}

	function stopPolling(): void {
		if (pollIntervalId) {
			clearInterval(pollIntervalId);
			pollIntervalId = null;
		}
		isPolling = false;
	}

	onMount(() => {
		// D.6 Slice 4: when the upgrade modal routes the DSA here from a
		// case-creation 402, the URL carries ?recommend=<planId>. Override
		// the default Pro recommendation + pre-select that plan so the
		// panel opens aimed at the right upgrade. Validate against the
		// PlanId union to ignore malformed inputs (e.g. ?recommend=foo).
		const params = new URLSearchParams(window.location.search);
		const recommend = params.get('recommend');
		if (recommend && VALID_PLAN_IDS.has(recommend as PlanId)) {
			recommendedPlanId = recommend as PlanId;
			selectedPlanId = recommend as PlanId;
		}

		void loadStatus().then(() => {
			// Auto-poll whenever the loaded status is pending_mandate, regardless
			// of how the user got here. Pre-2026-06-02 polling required a
			// ?status=success URL param (the assumption being Razorpay would
			// redirect back with it), but Razorpay's hosted-invoice flow does
			// NOT redirect on completion — the user either closes the tab and
			// returns manually, or navigates back via the browser. Either way,
			// if the status is pending_mandate when this page loads, the webhook
			// could land at any moment (prod) or the operator may flip it via
			// scripts/dev-activate-pending-mandate.mjs (dev); polling either
			// way is the correct behavior.
			if (subState === 'pending_mandate') {
				startPolling();
			}
		});
		return stopPolling;
	});

	// ── Subscribe handlers ─────────────────────────────────────

	/** Standard paid-subscribe click — opens disclosure for the picked plan. */
	function handleSubscribeClick(): void {
		subscribeError = '';
		modalForTrial = false;
		showDisclosureModal = true;
	}

	/** Trial CTA click — server forces plan_id to 'pro'; we still open the modal for transparency. */
	function handleTrialClick(): void {
		subscribeError = '';
		modalForTrial = true;
		// Pre-select Pro so the modal preview ("Free for TRIAL_DAYS days then ₹X")
		// shows the right number even though the server will force this anyway.
		selectedPlanId = 'pro';
		showDisclosureModal = true;
	}

	async function confirmSubscribe(): Promise<void> {
		isSubscribing = true;
		subscribeError = '';
		try {
			// Capture device-id ONLY for trial signups (not paid). Paid users
			// don't get the abuse gate; sending the id would waste a hash + a
			// blocklist write on the server with no benefit. The device-id is
			// stable per-device (localStorage UUID) so the same person reaching
			// the trial path twice will produce the same hash both times.
			const deviceId = modalForTrial ? getOrCreateDeviceId() : null;

			const res = await secureFetch('/api/billing/subscribe-recurring', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					plan_id: selectedPlanId,
					...(modalForTrial && { trial: true }),
					...(deviceId && { device_id: deviceId })
				})
			});
			const body = await res.json();
			if (!res.ok || !body.success) {
				// Surface the structured error code if present (TRIAL_INELIGIBLE,
				// TRIAL_PAN_REQUIRED) so we can show the right inline hint.
				// When the server reports `blocking_identifier: 'device'`, flip
				// our local deviceMatched state so the upcoming canSubscribe
				// re-render shows the device-specific friendly note. Also
				// downgrade trialEligible so the trial CTA disappears.
				if (body?.data?.blocking_identifier === 'device') {
					deviceMatched = true;
					trialEligible = false;
					trialIneligibleReason = 'device_match';
					showDisclosureModal = false;
				} else if (body?.error_code === 'TRIAL_INELIGIBLE' || body?.code === 'TRIAL_INELIGIBLE') {
					trialEligible = false;
					trialIneligibleReason = 'prior_trial';
					showDisclosureModal = false;
				}
				subscribeError = body.error ?? 'Subscription failed. Please try again.';
				isSubscribing = false;
				return;
			}
			// Redirect to Razorpay's hosted authorization URL.
			// openAuthorizationUrl handles web + Capacitor.
			await openAuthorizationUrl(body.data.authorization_url);
		} catch (err) {
			subscribeError =
				err instanceof Error ? err.message : 'Network error. Please try again.';
			isSubscribing = false;
		}
	}

	function cancelDisclosureModal(): void {
		if (isSubscribing) return; // can't cancel mid-redirect
		showDisclosureModal = false;
	}
</script>

<section class="subscribe-recurring-section">
	{#if subState === 'loading'}
		<p class="text-regularText">Loading subscription status…</p>
	{:else if subState === 'load_error'}
		<div class="info-card error">
			<h3 class="text-titleText">Couldn't load subscription status</h3>
			<p class="text-regularText">
				Something went wrong loading your subscription. This is usually temporary.
			</p>
			<button
				type="button"
				class="subscribe-btn"
				onclick={() => { subState = 'loading'; void loadStatus(); }}
				style="margin-top: 0.75rem; max-width: 12rem;"
			>
				Try again
			</button>
		</div>
	{:else if isPolling}
		<div class="info-card pending">
			<h3 class="text-titleText">Waiting for authorization…</h3>
			<p class="text-regularText">
				Your bank is confirming the mandate. This usually takes a few seconds.
			</p>
		</div>
	{:else if subState === 'active'}
		<div class="info-card active">
			<h3 class="text-titleText">Auto-pay active</h3>
			<p class="text-regularText">
				{planName ?? 'Subscription'} · Next charge on
				{nextChargeAt ? new Date(nextChargeAt).toLocaleDateString() : 'TBD'}
			</p>
		</div>
	{:else if subState === 'pending_mandate'}
		<div class="info-card pending">
			<h3 class="text-titleText">Authorization pending</h3>
			<p class="text-regularText">
				Complete the authorization in your bank's window. We'll activate
				your subscription as soon as it's confirmed (usually 1-2 minutes).
			</p>
		</div>
	{:else if canSubscribe && trialEligible}
		<!-- Trial path — eligible DSAs see a single trial CTA, no plan picker.
		     Per the locked design (2026-05-28): trial is always Pro tier. -->
		<div class="subscribe-container trial-container">
			<div class="trial-badge">{TRIAL_DAYS}-day free trial</div>
			<h3 class="text-titleText">Try Pro free for {TRIAL_DAYS} days</h3>
			<p class="text-regularText">
				Get full access to the Pro plan — 50 active cases, all 6 loan types, CRM &amp; team
				features, lender matching, priority support. We'll set up auto-pay now (₹1 verification only);
				the first real charge of <strong>₹{proPlan.priceMonthly.toLocaleString('en-IN')}</strong>
				fires automatically after day {TRIAL_DAYS} unless you cancel.
			</p>

			<ul class="trial-bullets">
				<li>No charge for {TRIAL_DAYS} days</li>
				<li>Cancel anytime before day {TRIAL_DAYS} — no charge at all</li>
				<li>Auto-renews monthly after trial; cancel from this page anytime</li>
			</ul>

			<button
				type="button"
				class="subscribe-btn trial-cta"
				onclick={handleTrialClick}
				disabled={isSubscribing}
			>
				Start {TRIAL_DAYS}-day free trial
			</button>

			{#if subscribeError}
				<p class="error-text" role="alert">{subscribeError}</p>
			{/if}
		</div>
	{:else if canSubscribe}
		<!-- Paid path — DSA is ineligible for trial OR no trial was ever offered.
		     Friendly returning-customer note when their identifiers matched a prior trial
		     (option (b) from the 2026-05-28 design: transparent over silent).
		     Device match (added 2026-05-28) gets a specifically-tailored note because
		     telling the user "this device has been used" leaks nothing they don't
		     already know (they're literally on the device). -->
		<div class="subscribe-container">
			{#if subState === 'wrong_identity'}
				<!-- Caller authenticated but not a DSA (RM or admin browsing
				     /dashboard/dsa/billing). The plan cards render below as a
				     read-only preview; the Subscribe button is disabled (see
				     `disabled` binding below). Admin impersonation does NOT
				     land here — during impersonation the JWT user IS the
				     target DSA, so the status endpoint returns the normal
				     not_subscribed/active payload instead of 403. -->
				<div class="wrong-identity-banner" role="status">
					<strong>You're not signed in as a DSA.</strong> Auto-pay is tied to a
					DSA account — you're currently in as a different role (RM or admin).
					Sign out and log back in choosing the DSA role to subscribe. Plans
					below are shown for reference only.
				</div>
			{:else if deviceMatched || trialIneligibleReason === 'device_match'}
				<div class="returning-note" role="status">
					<strong>This device has already been used for a free trial.</strong> Free trials are
					once-per-DSA — pick a plan below to set up auto-pay. You can cancel anytime.
				</div>
			{:else if trialIneligibleReason === 'prior_trial' || trialIneligibleReason === 'mobile_match' || trialIneligibleReason === 'pan_match' || trialIneligibleReason === 'gst_match'}
				<div class="returning-note" role="status">
					<strong>Welcome back!</strong> Free trials are once-per-DSA — pick a plan below to set up
					auto-pay. You can cancel anytime.
				</div>
			{:else if trialIneligibleReason === 'pan_missing'}
				<div class="returning-note" role="status">
					Add your PAN in your profile to unlock the {TRIAL_DAYS}-day free trial. Or pick a plan to subscribe
					with auto-pay now.
				</div>
			{/if}

			<h3 class="text-titleText">Set up auto-pay</h3>
			<p class="text-regularText">
				Choose your plan. We'll set up a one-time authorization, then
				bill you automatically every cycle. Cancel anytime.
			</p>

			<!-- D.6: shared features header — shown ONCE so cards can focus
			     on the per-tier distinguishers (case limit + extras). -->
			<!-- Note: a monthly/annual toggle briefly lived above this block
			     during D.6 Slice 3 and was removed 2026-05-28 per owner
			     decision (monthly only). -->
			{#if SHARED_FEATURES.length > 0}
				<p class="shared-features-note">
					All plans include: {SHARED_FEATURES.join(' · ')}
				</p>
			{/if}

			<!-- D.6 polish: card-grid layout. The hidden radio under each card
			     keeps the existing $state bindings working unchanged; the
			     visible "Choose" button is just an aria-friendly affordance
			     that toggles the same selectedPlanId. -->
			<div class="plan-list" role="radiogroup" aria-label="Plan selection">
				{#each PLAN_LIST as plan (plan.id)}
					{@const priceInfo = displayPriceFor(plan)}
					{@const extras = getTierExtras(plan)}
					{@const isSelected = selectedPlanId === plan.id}
					{@const isRecommended = plan.id === recommendedPlanId}
					<label
						class="plan-option"
						class:selected={isSelected}
						class:recommended={isRecommended}
					>
						<input
							type="radio"
							name="plan"
							value={plan.id}
							bind:group={selectedPlanId}
							class="sr-only"
						/>
						<div class="plan-detail">
							<div class="plan-header">
								<span class="plan-name text-labelText">{plan.name}</span>
								{#if isRecommended}
									<span class="plan-badge">Recommended</span>
								{/if}
							</div>
							<div class="plan-price-block">
								<span class="plan-price text-regularText">
									₹{priceInfo.inclusive.toLocaleString('en-IN')}{priceInfo.period}
								</span>
								<!-- D.6: GST disclosure per ADR-0019 (prices inclusive). -->
								<span class="plan-gst-note">
									(₹{priceInfo.netTaxable.toLocaleString('en-IN')} + 18% GST ₹{priceInfo.gst.toLocaleString(
										'en-IN'
									)})
								</span>
							</div>
							<div class="plan-features">
								<div class="plan-case-limit">{formatCaseLimit(plan)}</div>
								{#each extras as extra}
									<div class="plan-extra">+ {extra}</div>
								{/each}
							</div>
							<span class="plan-choose" aria-hidden="true">
								{isSelected ? '✓ Selected' : 'Choose'}
							</span>
						</div>
					</label>
				{/each}
			</div>

			<button
				type="button"
				class="subscribe-btn"
				onclick={handleSubscribeClick}
				disabled={isSubscribing || subState === 'wrong_identity'}
				title={subState === 'wrong_identity'
					? 'Sign in as a DSA to subscribe'
					: undefined}
			>
				{subState === 'wrong_identity' ? 'Sign in as DSA to subscribe' : 'Set up auto-pay'}
			</button>

			{#if subscribeError}
				<p class="error-text" role="alert">{subscribeError}</p>
			{/if}
		</div>
	{/if}

	<!-- Disclosure modal — locks ₹1 + free-access copy per §11.1 + §4 S2 -->
	{#if showDisclosureModal}
		<div
			class="modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="subscribe-disclosure-title"
		>
			<div class="modal-content">
				<h2 id="subscribe-disclosure-title" class="text-titleText">
					{modalForTrial ? `Start your ${TRIAL_DAYS}-day free ${selectedPlan.name} trial` : `Set up auto-pay for ${selectedPlan.name}`}
				</h2>

				<div class="disclosure-block">
					<h4 class="text-labelText">What happens next</h4>
					<ul>
						<li>
							You'll be redirected to your bank's secure page to authorize
							recurring debits up to
							<strong>₹{Math.round(selectedPlan.priceMonthly * 1.5).toLocaleString('en-IN')}</strong>
							per debit (covers the {selectedPlan.name} plan price with headroom).
						</li>
						<li>
							Your bank may show a <strong>₹1 debit and ₹1 refund</strong>
							— that's the standard authorization step. No money is moved.
						</li>
						{#if modalForTrial}
							<li>
								<strong>Free for {TRIAL_DAYS} days.</strong> On day {TRIAL_DAYS} your card/UPI is auto-charged
								<strong>₹{selectedPlan.priceMonthly.toLocaleString('en-IN')}</strong>
								for your first {selectedPlan.name} cycle.
							</li>
							<li>
								<strong>Cancel anytime in the {TRIAL_DAYS} days</strong> from the Manage panel — no charge fires.
							</li>
						{:else}
							<li>
								Your first real charge of
								<strong>₹{selectedPlan.priceMonthly.toLocaleString('en-IN')}</strong>
								will be on the next billing cycle (1-6 days from today).
							</li>
							<li>Cancel anytime from this page.</li>
						{/if}
					</ul>
				</div>

				<div class="modal-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={cancelDisclosureModal}
						disabled={isSubscribing}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn-primary"
						onclick={confirmSubscribe}
						disabled={isSubscribing}
					>
						{isSubscribing ? 'Redirecting…' : 'Continue to bank authorization'}
					</button>
				</div>

				{#if subscribeError}
					<p class="error-text" role="alert">{subscribeError}</p>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.subscribe-recurring-section {
		margin: 1rem 0;
	}

	.info-card {
		padding: 1rem;
		border-radius: 0.5rem;
		border: 1px solid var(--ddsa-border-color, #e5e7eb);
		/* Explicit foreground so h3.text-titleText (which inherits color)
		   contrasts against the tinted bg in BOTH light and dark mode.
		   text-regularText already sets color; here we ensure the heading
		   has a sensible default too. */
		color: var(--color-text-main);
	}

	/* Status cards use the live --ddsa-{success,warning,error}-bg tokens
	   declared in src/app.css for both light AND dark mode. Pre-2026-06-02
	   these referenced a non-existent --ddsa-*-50/200 numeric scale and
	   silently fell back to hardcoded light-mode hex literals, producing
	   near-invisible heading text on dark-mode pages (the "Auto-pay
	   active" header was unreadable). Fixed to use the live tokens. */
	.info-card.active {
		background: var(--ddsa-success-bg);
		border-color: var(--ddsa-success);
	}

	.info-card.pending {
		background: var(--ddsa-warning-bg);
		border-color: var(--ddsa-warning);
	}

	.info-card.error {
		background: var(--ddsa-error-bg);
		border-color: var(--ddsa-error);
	}

	.subscribe-container {
		padding: 1.5rem;
		border: 1px solid var(--ddsa-border-color, #e5e7eb);
		border-radius: 0.5rem;
	}

	/* Trial-specific container — slightly more emphasis (border tint + gradient)
	   so the trial CTA reads as a featured offer, not just another card. */
	.trial-container {
		border-color: var(--ddsa-primary-300, #93c5fd);
		background: linear-gradient(
			135deg,
			var(--ddsa-primary-50, #f0f9ff) 0%,
			transparent 60%
		);
	}

	/* Floating chip above the heading to anchor the "30-day free trial" framing. */
	.trial-badge {
		display: inline-block;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		background: var(--ddsa-primary-500, #0d92f4);
		color: white;
		margin-bottom: 0.625rem;
	}

	/* Bullet checklist inside the trial card. Uses tokens so it matches the
	   surrounding shell in light + dark mode. */
	.trial-bullets {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.trial-bullets li {
		position: relative;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--ddsa-text-secondary, #4b5563);
		line-height: 1.5;
	}

	.trial-bullets li::before {
		content: '✓';
		position: absolute;
		left: 0;
		top: 0;
		font-weight: 700;
		color: var(--ddsa-primary-500, #0d92f4);
	}

	.subscribe-btn.trial-cta {
		font-weight: 700;
	}

	/* Friendly returning-customer note for DSAs who consumed a prior trial.
	   Surfaces transparently (option (b) from the 2026-05-28 design) without
	   revealing WHICH identifier matched. */
	.returning-note {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border-radius: 0.5rem;
		background: var(--ddsa-warning-50, #fffbeb);
		border: 1px solid var(--ddsa-warning-200, #fde68a);
		color: var(--ddsa-warning-800, #92400e);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	/* Wrong-identity banner — caller is authenticated but isn't a DSA, so the
	   plan picker below is rendered read-only. Uses the live --ddsa-error-*
	   design tokens (defined in app.css for both light and dark mode) instead
	   of the --ddsa-error-50/200/800 scale that's referenced elsewhere here
	   but never actually declared (those fall back to the hardcoded hex on
	   dark backgrounds, hence the unreadable contrast in dark mode). */
	.wrong-identity-banner {
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		border-radius: 0.5rem;
		background: var(--ddsa-error-bg);
		border: 1px solid var(--ddsa-error);
		border-left: 4px solid var(--ddsa-error);
		color: var(--color-text-main);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.wrong-identity-banner strong {
		color: var(--ddsa-error-dark, var(--ddsa-error));
	}

	/* ─── D.6 polish: 3-col card grid ────────────────────────────────
	   Layout mirrors AffordabilityBreakdown.svelte:197-211 (3 cols
	   desktop, 2 cols tablet, 1 col mobile) so the page stays
	   consistent with the other Dashboard surfaces.
	   Surfaces use --dash-* tokens (dark-mode + 5 schemes adapt
	   automatically); accents use --ddsa-primary-* so the colored
	   highlights track the active scheme. */
	.plan-list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin: 1rem 0;
		align-items: stretch;
	}

	@media (max-width: 1023px) {
		.plan-list {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (max-width: 767px) {
		.plan-list {
			grid-template-columns: 1fr;
		}
	}

	.plan-option {
		display: flex;
		flex-direction: column;
		padding: 1.25rem 1.125rem;
		border: 1px solid var(--dash-border-light, #f1f5f9);
		border-radius: 0.875rem;
		background: var(--dash-bg-card, #ffffff);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
		cursor: pointer;
		position: relative;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s ease;
	}

	.plan-option:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
	}

	/* Recommended = soft visual cue: badge in the header + a subtle drop
	   shadow + slight scale on desktop. NO border-color change — that's
	   reserved for "selected" so the two states stay visually distinct
	   when a card is both (e.g. Pro is recommended by default AND chosen
	   by the user). Pre-2026-06-01 both states applied the same primary
	   border ring, making every card look selected. */
	.plan-option.recommended {
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
	}

	@media (min-width: 1024px) {
		.plan-option.recommended {
			transform: scale(1.02);
		}
	}

	/* Selected wins visually — strong primary-green border + ring. Declared
	   AFTER .recommended so when a card has both classes the selection
	   ring takes precedence (CSS rule order at equal specificity). */
	.plan-option.selected {
		border-color: var(--ddsa-primary-500);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ddsa-primary-500) 18%, transparent);
	}

	/* Screen-reader-only utility for the hidden radio input — keeps the
	   form semantics intact while the visible affordance is the card +
	   the Choose pill. */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.plan-detail {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.625rem;
	}

	.plan-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.plan-name {
		font-weight: 600;
		font-size: 1rem;
		color: var(--dash-text, #0f172a);
	}

	.plan-badge {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.1875rem 0.5rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--ddsa-primary-500) 14%, transparent);
		color: var(--ddsa-primary-700);
	}

	.plan-price-block {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.plan-price {
		font-weight: 700;
		font-size: 1.5rem;
		color: var(--dash-text, #0f172a);
		line-height: 1.1;
	}

	.plan-gst-note {
		font-size: 0.75rem;
		color: var(--dash-text-muted, #64748b);
	}

	.plan-features {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: var(--dash-text-secondary, #475569);
		flex: 1;
	}

	.plan-case-limit {
		font-weight: 600;
		color: var(--dash-text, #0f172a);
	}

	.plan-extra {
		color: var(--dash-text-secondary, #475569);
	}

	/* Card-bottom Choose pill — text-only when un-selected; flips to a
	   checked-state pill on the selected card. Card click + radio focus
	   both drive selection; the pill is decorative (aria-hidden). */
	.plan-choose {
		margin-top: auto;
		padding-top: 0.875rem;
		font-size: 0.8125rem;
		font-weight: 600;
		text-align: center;
		color: var(--ddsa-primary-700);
	}

	.plan-option.selected .plan-choose {
		color: var(--ddsa-primary-500);
	}

	/* D.6: shared features header (shown once above the cards) */
	.shared-features-note {
		font-size: 0.75rem;
		color: var(--ddsa-text-muted, #64748b);
		margin: 0 0 0.5rem;
		font-style: italic;
	}

	.subscribe-btn {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--ddsa-primary-500, #0d92f4);
		color: white;
		border: 0;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
	}

	.subscribe-btn:hover:not(:disabled) {
		background: var(--ddsa-primary-600, #0a75c4);
	}

	.subscribe-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal-content {
		/* Use the theme token so dark mode swaps to a dark surface — without
		   this the modal stays white in dark mode and inherited body text
		   colors (light in dark mode) become invisible (CLAUDE.md Pitfall #10). */
		background: var(--form-bg-card);
		color: var(--form-text);
		max-width: 32rem;
		width: 100%;
		padding: 1.5rem;
		border-radius: 0.75rem;
	}

	.disclosure-block {
		margin: 1rem 0;
	}

	.disclosure-block ul {
		margin: 0.5rem 0 0 1.25rem;
		padding: 0;
	}

	.disclosure-block li {
		margin: 0.5rem 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.25rem;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.btn-primary {
		background: var(--ddsa-primary-500, #0d92f4);
		color: white;
	}

	.btn-secondary {
		/* Theme token instead of hardcoded white — matches modal-content
		   surface in both light and dark modes. */
		background: var(--form-bg-card);
		color: var(--ddsa-primary-500, #0d92f4);
		border-color: var(--ddsa-primary-500, #0d92f4);
	}

	.btn-primary:disabled,
	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-text {
		color: var(--ddsa-error-600, #dc2626);
		margin-top: 0.75rem;
	}
</style>
