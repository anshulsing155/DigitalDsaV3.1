<script lang="ts">
	/**
	 * D.1 S6 M5 — Manage subscription panel (3 tabs)
	 * ══════════════════════════════════════════════════════════════
	 * Central DSA-facing surface for managing the recurring subscription.
	 * Self-hides when the DSA has no D.1 recurring subscription yet
	 * (the legacy one-time billing flow lives elsewhere on the page).
	 *
	 * Tabs (locked 2026-05-25 per critique MISS-3):
	 *   1. Subscription — current plan, next charge, status badges, action
	 *      buttons (Pause / Resume / Cancel / Update payment method /
	 *      Change plan) with confirm modals
	 *   2. Transactions — paginated BillingTransaction history with
	 *      filters; ₹1 verification rows hidden by default
	 *   3. Payment method — mandate summary + Update Payment Method button
	 *
	 * Auth flows that redirect away (update-payment-method, subscribe-
	 * recurring) reuse the existing openAuthorizationUrl helper for
	 * Capacitor-vs-web URL handling.
	 *
	 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §4 S6 M5
	 */
	import { onMount } from 'svelte';
	import { PLAN_LIST, PLANS, type PlanId } from '$lib/config/billing';
	import { secureFetch } from '$lib/utils/csrf';
	import { openAuthorizationUrl } from '$lib/utils/billingAuthReturn';
	import { AlertTriangle, CheckCircle, Clock, CreditCard, RefreshCw } from 'lucide-svelte';

	// ── State ──────────────────────────────────────────────────

	type TabKey = 'subscription' | 'transactions' | 'payment_method';
	let activeTab = $state<TabKey>('subscription');

	type SubState =
		| 'not_subscribed'
		| 'pending_mandate'
		| 'active'
		| 'paused'
		| 'dunning_t0'
		| 'dunning_grace'
		| 'dunning_final'
		| 'downgraded'
		| 'cancelled'
		| 'loading'
		| 'load_error';

	interface SubStatus {
		state: SubState;
		plan_id: PlanId | null;
		plan_name: string | null;
		anchor_day: number | null;
		next_charge_at: string | null;
		paused_from_state: string | null;
		failed_attempt_count: number;
		cancel_at_cycle_end: boolean;
		pending_downgrade_to: PlanId | null;
		pending_downgrade_to_plan_name: string | null;
		max_amount_paise: number;
		mandate_present: boolean;
		pending_replacement_in_flight: boolean;
		pending_replacement_expires_at: string | null;
		/** Trial fields (2026-05-28 free-trial feature). */
		is_trial: boolean;
		trial_until: string | null;
		trial_days_remaining: number | null;
	}

	let status = $state<SubStatus | null>(null);
	let actionInProgress = $state<string | null>(null);
	let actionError = $state('');

	// Confirm modal state — generic so all 5 actions share one modal.
	let modalAction = $state<
		'pause' | 'resume' | 'cancel' | 'update-payment' | 'change-plan' | null
	>(null);
	let modalPlanId = $state<PlanId | null>(null);
	let modalKind = $state<'upgrade' | 'downgrade' | null>(null);

	// Transactions tab state.
	interface TxRow {
		id: string;
		kind: 'recurring_charge' | 'webhook_confirmation' | 'legacy_one_time';
		plan_id: string | null;
		amount_rupees: number;
		status: string;
		failure_code: string | null;
		provider_payment_id: string | null;
		charged_at: string | null;
		created_at: string | null;
		/** D.2 — populated when an Invoice row exists for this txn. Drives the per-row Download link. */
		invoice_id: string | null;
	}
	let txItems = $state<TxRow[]>([]);
	let txPage = $state(1);
	let txTotal = $state(0);
	let txHasMore = $state(false);
	let txLoading = $state(false);
	let txError = $state('');
	let txStatusFilter = $state<string>('');
	let txShowTestAuth = $state(false);

	// ── Derived ───────────────────────────────────────────────

	const hasRecurringSub = $derived(
		status !== null &&
			status.state !== 'loading' &&
			status.state !== 'load_error' &&
			status.state !== 'not_subscribed'
	);

	const canPause = $derived(
		status !== null &&
			['active', 'dunning_t0', 'dunning_grace', 'dunning_final'].includes(status.state)
	);
	const canResume = $derived(status?.state === 'paused');
	const canCancel = $derived(
		status !== null && (status.state === 'active' || status.state === 'paused')
	);
	const canUpdatePayment = $derived(
		status !== null &&
			['active', 'paused', 'dunning_t0', 'dunning_grace', 'dunning_final'].includes(
				status.state
			) &&
			!status.pending_replacement_in_flight
	);
	const canChangePlan = $derived(status?.state === 'active');

	// ── Load + actions ────────────────────────────────────────

	async function loadStatus() {
		try {
			const res = await fetch('/api/billing/subscription/status');
			if (!res.ok) {
				if (res.status === 404) {
					status = makeEmptyStatus('not_subscribed');
				} else if (res.status === 403) {
					// Identity mismatch (USER_NOT_DSA): caller is RM/admin, not
					// a DSA. The Subscribe section renders its own "Not signed
					// in as a DSA" notice; this panel self-hides by leaving
					// status null. The top-level template gates on
					// hasRecurringSub && status, so null = render nothing.
					const body = await res.json().catch(() => ({}));
					if (body?.code === 'USER_NOT_DSA') {
						status = null;
						return;
					}
					status = makeEmptyStatus('load_error');
				} else {
					status = makeEmptyStatus('load_error');
				}
				return;
			}
			const { data } = await res.json();
			status = { ...makeEmptyStatus(data.state), ...data };
		} catch {
			status = makeEmptyStatus('load_error');
		}
	}

	function makeEmptyStatus(state: SubState): SubStatus {
		return {
			state,
			plan_id: null,
			plan_name: null,
			anchor_day: null,
			next_charge_at: null,
			paused_from_state: null,
			failed_attempt_count: 0,
			cancel_at_cycle_end: false,
			pending_downgrade_to: null,
			pending_downgrade_to_plan_name: null,
			max_amount_paise: 0,
			mandate_present: false,
			pending_replacement_in_flight: false,
			pending_replacement_expires_at: null,
			is_trial: false,
			trial_until: null,
			trial_days_remaining: null
		};
	}

	async function loadTransactions() {
		txLoading = true;
		txError = '';
		try {
			const params = new URLSearchParams({
				page: String(txPage),
				page_size: '20'
			});
			if (txStatusFilter) params.set('status', txStatusFilter);
			if (txShowTestAuth) params.set('include_test_auth', '1');
			const res = await fetch(`/api/billing/transactions?${params}`);
			if (!res.ok) {
				txError = 'Failed to load transactions';
				return;
			}
			const { data } = await res.json();
			txItems = data.items;
			txTotal = data.total;
			txHasMore = data.has_more;
		} catch {
			txError = 'Network error loading transactions';
		} finally {
			txLoading = false;
		}
	}

	onMount(() => {
		loadStatus();
	});

	// Re-fetch transactions when filters change OR tab opens.
	$effect(() => {
		if (activeTab === 'transactions') {
			// Reference reactive deps so $effect tracks them.
			txStatusFilter;
			txShowTestAuth;
			txPage;
			loadTransactions();
		}
	});

	// ── Action handlers ───────────────────────────────────────

	async function performAction(action: 'pause' | 'resume' | 'cancel') {
		actionInProgress = action;
		actionError = '';
		try {
			const res = await secureFetch(`/api/billing/subscription/${action}`, {
				method: 'POST'
			});
			const body = await res.json();
			if (!body.success) {
				actionError = body.error || `${action} failed`;
				return;
			}
			await loadStatus();
			closeModal();
		} catch {
			actionError = 'Network error. Please try again.';
		} finally {
			actionInProgress = null;
		}
	}

	async function performUpdatePayment() {
		actionInProgress = 'update-payment';
		actionError = '';
		try {
			const res = await secureFetch('/api/billing/subscription/update-payment-method', {
				method: 'POST'
			});
			const body = await res.json();
			if (!body.success) {
				actionError = body.error || 'Failed to start update flow';
				return;
			}
			closeModal();
			openAuthorizationUrl(body.data.authorization_url);
		} catch {
			actionError = 'Network error. Please try again.';
		} finally {
			actionInProgress = null;
		}
	}

	async function performChangePlan() {
		if (!modalPlanId || !modalKind) return;
		actionInProgress = 'change-plan';
		actionError = '';
		try {
			const res = await secureFetch('/api/billing/subscription/change-plan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ new_plan_id: modalPlanId, change_kind: modalKind })
			});
			const body = await res.json();
			if (!body.success) {
				// Special handling: NEEDS_REMANDATE → switch the modal to ask the
				// DSA to update their payment method first.
				if (body.code === 'NEEDS_REMANDATE') {
					actionError =
						'This upgrade requires a new payment authorization. Update your payment method first, then try again.';
					return;
				}
				actionError = body.error || 'Plan change failed';
				return;
			}
			await loadStatus();
			closeModal();
		} catch {
			actionError = 'Network error. Please try again.';
		} finally {
			actionInProgress = null;
		}
	}

	function openModal(
		action: 'pause' | 'resume' | 'cancel' | 'update-payment' | 'change-plan',
		options?: { plan_id?: PlanId; kind?: 'upgrade' | 'downgrade' }
	) {
		modalAction = action;
		modalPlanId = options?.plan_id ?? null;
		modalKind = options?.kind ?? null;
		actionError = '';
	}

	function closeModal() {
		modalAction = null;
		modalPlanId = null;
		modalKind = null;
		actionError = '';
	}

	function handleModalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closeModal();
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatRupees(paise: number): string {
		return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
	}

	function planChangePreview(
		currentPlanId: PlanId,
		targetPlanId: PlanId,
		nextChargeAt: string | null
	): { kind: 'upgrade' | 'downgrade'; copy: string } {
		const current = PLANS[currentPlanId];
		const target = PLANS[targetPlanId];
		const kind = target.amountPaise > current.amountPaise ? 'upgrade' : 'downgrade';
		const dateStr = nextChargeAt ? formatDate(nextChargeAt) : 'the next billing date';
		if (kind === 'upgrade') {
			return {
				kind,
				copy: `Upgrade to ${target.name}: instant access. Next charge on ${dateStr} at ₹${target.priceMonthly.toLocaleString('en-IN')}/mo.`
			};
		}
		return {
			kind,
			copy: `Downgrade to ${target.name}: you keep ${current.name} access through ${dateStr}, then switch to ${target.name}.`
		};
	}
</script>

{#if status?.state === 'load_error'}
	<div class="msp-card msp-error">
		<AlertTriangle size={18} />
		<div>
			<p class="msp-error-title">Couldn't load your subscription</p>
			<p class="msp-error-detail">
				This is usually a temporary issue. <button class="msp-link" onclick={loadStatus}
					>Try again</button
				>.
			</p>
		</div>
	</div>
{:else if hasRecurringSub && status}
	<div class="msp-wrapper">
		<div class="msp-header">
			<h2 class="msp-title">Manage subscription</h2>
			<p class="msp-subtitle">Your recurring auto-pay plan</p>
		</div>

		<!-- Tab nav -->
		<div class="msp-tabs" role="tablist">
			<button
				class="msp-tab"
				class:msp-tab-active={activeTab === 'subscription'}
				role="tab"
				aria-selected={activeTab === 'subscription'}
				onclick={() => (activeTab = 'subscription')}
			>
				Subscription
			</button>
			<button
				class="msp-tab"
				class:msp-tab-active={activeTab === 'transactions'}
				role="tab"
				aria-selected={activeTab === 'transactions'}
				onclick={() => (activeTab = 'transactions')}
			>
				Transactions
			</button>
			<button
				class="msp-tab"
				class:msp-tab-active={activeTab === 'payment_method'}
				role="tab"
				aria-selected={activeTab === 'payment_method'}
				onclick={() => (activeTab = 'payment_method')}
			>
				Payment method
			</button>
		</div>

		<!-- ── Subscription tab ── -->
		{#if activeTab === 'subscription'}
			<div class="msp-tab-panel" role="tabpanel">
				<div class="msp-summary">
					<div class="msp-summary-row">
						<span class="msp-label">Plan</span>
						<span class="msp-value">{status.plan_name ?? '—'}</span>
					</div>
					<div class="msp-summary-row">
						<span class="msp-label">Status</span>
						<span class="msp-value">
							<span class="msp-badge msp-badge-{status.state}">{status.state}</span>
						</span>
					</div>
					<div class="msp-summary-row">
						<span class="msp-label">Next charge</span>
						<span class="msp-value">{formatDate(status.next_charge_at)}</span>
					</div>
					<div class="msp-summary-row">
						<span class="msp-label">Anchor day</span>
						<span class="msp-value">{status.anchor_day ?? '—'}</span>
					</div>
				</div>

				{#if status.is_trial && status.trial_days_remaining !== null}
					<!-- Free-trial banner (2026-05-28). Distinct color from cancellation
					     (amber) and dunning (red) — uses primary/info tone so it reads
					     as positive ("you're getting Pro free") rather than alarming. -->
					{@const trialPlanPrice =
						PLANS[status.plan_id ?? 'pro']?.priceMonthly?.toLocaleString('en-IN') ?? ''}
					{@const trialDaysLeft = status.trial_days_remaining}
					{@const trialEndDate = formatDate(status.trial_until)}
					{@const cancelledDuringTrial = status.cancel_at_cycle_end}
					<div class="msp-callout msp-callout-trial">
						<Clock size={14} />
						<div>
							<strong>Free trial — {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining.</strong>
							{#if !cancelledDuringTrial}
								First charge of ₹{trialPlanPrice} fires on {trialEndDate} unless you cancel before
								then.
							{:else}
								You've cancelled — no charge will fire. Access continues until {trialEndDate}.
							{/if}
						</div>
					</div>
				{/if}
				{#if status.cancel_at_cycle_end && !status.is_trial}
					<div class="msp-callout msp-callout-warning">
						<AlertTriangle size={14} />
						Cancellation scheduled — access continues until {formatDate(status.next_charge_at)}.
					</div>
				{/if}
				{#if status.pending_downgrade_to}
					<div class="msp-callout msp-callout-info">
						<Clock size={14} />
						Downgrade to {status.pending_downgrade_to_plan_name} takes effect on
						{formatDate(status.next_charge_at)}.
					</div>
				{/if}
				{#if status.state === 'dunning_t0' || status.state === 'dunning_grace' || status.state === 'dunning_final'}
					<div class="msp-callout msp-callout-error">
						<AlertTriangle size={14} />
						Your last payment failed ({status.failed_attempt_count} attempts). Update your payment
						method to keep access.
					</div>
				{/if}

				<div class="msp-actions">
					{#if canPause}
						<button
							class="msp-btn msp-btn-secondary"
							onclick={() => openModal('pause')}
							disabled={!!actionInProgress}
						>
							Pause
						</button>
					{/if}
					{#if canResume}
						<button
							class="msp-btn msp-btn-primary"
							onclick={() => openModal('resume')}
							disabled={!!actionInProgress}
						>
							Resume
						</button>
					{/if}
					{#if canUpdatePayment}
						<button
							class="msp-btn msp-btn-secondary"
							onclick={() => openModal('update-payment')}
							disabled={!!actionInProgress}
						>
							Update payment method
						</button>
					{/if}
					{#if canChangePlan}
						<div class="msp-change-plan">
							<label for="msp-plan-select" class="msp-label">Change plan</label>
							<select
								id="msp-plan-select"
								class="msp-select"
								disabled={!!actionInProgress}
								onchange={(e) => {
									const target = e.currentTarget.value as PlanId;
									if (target && target !== status?.plan_id) {
										const preview = planChangePreview(
											status!.plan_id!,
											target,
											status!.next_charge_at
										);
										openModal('change-plan', { plan_id: target, kind: preview.kind });
									}
									e.currentTarget.value = ''; // reset so re-selecting same plan re-fires
								}}
							>
								<option value="">Switch to…</option>
								{#each PLAN_LIST as plan}
									{#if plan.id !== status.plan_id}
										<option value={plan.id}
											>{plan.name} — ₹{plan.priceMonthly.toLocaleString('en-IN')}/mo</option
										>
									{/if}
								{/each}
							</select>
						</div>
					{/if}
					{#if canCancel && !status.cancel_at_cycle_end}
						<button
							class="msp-btn msp-btn-danger"
							onclick={() => openModal('cancel')}
							disabled={!!actionInProgress}
						>
							Cancel subscription
						</button>
					{/if}
				</div>

				{#if status.pending_replacement_in_flight}
					<div class="msp-callout msp-callout-info">
						<Clock size={14} />
						A payment method update is in progress. Your existing method continues to work until you
						complete the authorization.
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Transactions tab ── -->
		{#if activeTab === 'transactions'}
			<div class="msp-tab-panel" role="tabpanel">
				<div class="msp-tx-filters">
					<select
						class="msp-select"
						bind:value={txStatusFilter}
						onchange={() => (txPage = 1)}
						aria-label="Filter by status"
					>
						<option value="">All statuses</option>
						<option value="succeeded">Succeeded</option>
						<option value="failed">Failed</option>
						<option value="refunded">Refunded</option>
					</select>
					<label class="msp-checkbox">
						<input
							type="checkbox"
							bind:checked={txShowTestAuth}
							onchange={() => (txPage = 1)}
						/>
						Show ₹1 authorization charges
					</label>
					<button class="msp-btn-icon" onclick={loadTransactions} aria-label="Refresh">
						<RefreshCw size={14} />
					</button>
				</div>

				{#if txError}
					<div class="msp-callout msp-callout-error">{txError}</div>
				{/if}

				{#if txLoading && txItems.length === 0}
					<p class="msp-empty">Loading transactions…</p>
				{:else if txItems.length === 0}
					<p class="msp-empty">No transactions match your filters.</p>
				{:else}
					<div class="msp-tx-table">
						<div class="msp-tx-header">
							<span>Date</span>
							<span>Plan</span>
							<span>Amount</span>
							<span>Status</span>
							<span>Invoice</span>
						</div>
						{#each txItems as tx (tx.id)}
							<div class="msp-tx-row">
								<span>{formatDate(tx.charged_at ?? tx.created_at)}</span>
								<span class="msp-capitalize">{tx.plan_id ?? '—'}</span>
								<span>₹{tx.amount_rupees.toLocaleString('en-IN')}</span>
								<span class="msp-tx-status msp-tx-status-{tx.status}">{tx.status}</span>
								<span>
									{#if tx.invoice_id && tx.status === 'succeeded'}
										<!-- D.2 — Download link is a plain anchor so the browser handles
										     the PDF stream natively (Content-Disposition: inline). -->
										<a
											class="msp-invoice-link"
											href={`/api/billing/invoices/${tx.invoice_id}/pdf`}
											target="_blank"
											rel="noopener noreferrer"
											aria-label="Download invoice PDF"
										>
											Download
										</a>
									{:else}
										<span class="msp-dim">—</span>
									{/if}
								</span>
							</div>
						{/each}
					</div>

					<div class="msp-pager">
						<button
							class="msp-btn-icon"
							disabled={txPage === 1 || txLoading}
							onclick={() => (txPage = Math.max(1, txPage - 1))}
						>
							Previous
						</button>
						<span class="msp-pager-info">Page {txPage} — {txTotal} total</span>
						<button
							class="msp-btn-icon"
							disabled={!txHasMore || txLoading}
							onclick={() => (txPage = txPage + 1)}
						>
							Next
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Payment method tab ── -->
		{#if activeTab === 'payment_method'}
			<div class="msp-tab-panel" role="tabpanel">
				<div class="msp-summary">
					<div class="msp-summary-row">
						<span class="msp-label">Mandate status</span>
						<span class="msp-value">
							{#if status.mandate_present}
								<CheckCircle size={14} class="msp-icon-ok" />
								Active
							{:else}
								<AlertTriangle size={14} class="msp-icon-warn" />
								Not set up
							{/if}
						</span>
					</div>
					<div class="msp-summary-row">
						<span class="msp-label">Per-debit cap</span>
						<span class="msp-value">{formatRupees(status.max_amount_paise)}</span>
					</div>
					{#if status.pending_replacement_in_flight}
						<div class="msp-summary-row">
							<span class="msp-label">Update in progress</span>
							<span class="msp-value">
								Authorization pending — expires {formatDate(
									status.pending_replacement_expires_at
								)}
							</span>
						</div>
					{/if}
				</div>

				<div class="msp-actions">
					{#if canUpdatePayment}
						<button
							class="msp-btn msp-btn-primary"
							onclick={() => openModal('update-payment')}
							disabled={!!actionInProgress}
						>
							<CreditCard size={14} /> Update payment method
						</button>
					{/if}
				</div>

				<p class="msp-fine-print">
					Your bank/UPI mandate is stored only by Razorpay — we never see or store your card or
					UPI details directly.
				</p>
			</div>
		{/if}
	</div>
{/if}

<!-- ── Confirm Modal ── -->
{#if modalAction}
	<div
		class="msp-modal-backdrop"
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeModal();
		}}
		onkeydown={handleModalKeydown}
	>
		<div class="msp-modal">
			<h3 class="msp-modal-title">
				{#if modalAction === 'pause'}
					Pause subscription?
				{:else if modalAction === 'resume'}
					Resume subscription?
				{:else if modalAction === 'cancel'}
					Cancel subscription?
				{:else if modalAction === 'update-payment'}
					Update payment method?
				{:else if modalAction === 'change-plan'}
					{modalKind === 'upgrade' ? 'Upgrade plan?' : 'Downgrade plan?'}
				{/if}
			</h3>
			<div class="msp-modal-body">
				{#if modalAction === 'pause'}
					<p>
						Pausing stops your next billing cycle. You can resume anytime — your existing payment
						method stays active at your bank.
					</p>
				{:else if modalAction === 'resume'}
					<p>
						Resuming reactivates billing.
						{#if status?.paused_from_state && status.paused_from_state !== 'active'}
							You were paused during a payment-failure escalation — the previous state will be
							restored and the dunning clock continues.
						{:else}
							The next charge will fire today.
						{/if}
					</p>
				{:else if modalAction === 'cancel'}
					<p>
						{#if status?.state === 'paused'}
							Your subscription will be cancelled immediately. You can re-subscribe anytime.
						{:else}
							Your access continues until the next billing date ({formatDate(
								status?.next_charge_at ?? null
							)}), after which the subscription will be cancelled.
						{/if}
					</p>
				{:else if modalAction === 'update-payment'}
					<p>
						You'll be redirected to your bank/UPI app to authorize a new payment method. Your
						existing method continues to work until the new one is authorized.
					</p>
					<p class="msp-fine-print">
						A ₹1 verification debit + refund may be shown by your bank — no money is moved.
					</p>
				{:else if modalAction === 'change-plan' && modalPlanId && status?.plan_id}
					<p>{planChangePreview(status.plan_id, modalPlanId, status.next_charge_at).copy}</p>
				{/if}

				{#if actionError}
					<p class="msp-modal-error">{actionError}</p>
				{/if}
			</div>
			<div class="msp-modal-actions">
				<button class="msp-btn msp-btn-ghost" onclick={closeModal} disabled={!!actionInProgress}>
					{modalAction === 'cancel' ? 'Keep subscription' : 'Cancel'}
				</button>
				<button
					class="msp-btn msp-btn-primary"
					disabled={!!actionInProgress}
					onclick={() => {
						if (modalAction === 'pause' || modalAction === 'resume' || modalAction === 'cancel')
							performAction(modalAction);
						else if (modalAction === 'update-payment') performUpdatePayment();
						else if (modalAction === 'change-plan') performChangePlan();
					}}
				>
					{#if actionInProgress}
						Working…
					{:else if modalAction === 'cancel'}
						Yes, cancel
					{:else if modalAction === 'update-payment'}
						Continue to bank
					{:else if modalAction === 'change-plan'}
						Confirm {modalKind}
					{:else}
						Confirm
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.msp-wrapper {
		border: 1px solid var(--dash-border);
		border-radius: 0.75rem;
		background: var(--dash-bg-card);
		padding: 1.25rem;
		margin: 1.5rem 0;
	}

	.msp-header {
		margin-bottom: 1rem;
	}

	.msp-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--dash-text);
		margin: 0;
	}

	.msp-subtitle {
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
		margin: 0.125rem 0 0;
	}

	.msp-tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--dash-border);
		margin-bottom: 1rem;
		overflow-x: auto;
	}

	.msp-tab {
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--dash-text-secondary);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
	}

	.msp-tab:hover {
		color: var(--dash-text);
	}

	.msp-tab-active {
		color: var(--dash-text);
		border-bottom-color: var(--ddsa-primary, #cb997e);
	}

	.msp-tab-panel {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.msp-summary {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		background: var(--dash-bg-alt);
		border-radius: 0.5rem;
	}

	.msp-summary-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.8125rem;
	}

	.msp-label {
		color: var(--dash-text-secondary);
	}

	.msp-value {
		color: var(--dash-text);
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.msp-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.msp-badge-active {
		background: #d1fae5;
		color: #065f46;
	}

	.msp-badge-paused {
		background: #e5e7eb;
		color: #374151;
	}

	.msp-badge-dunning_t0,
	.msp-badge-dunning_grace,
	.msp-badge-dunning_final {
		background: #fef3c7;
		color: #92400e;
	}

	.msp-badge-cancelled,
	.msp-badge-downgraded {
		background: #fee2e2;
		color: #991b1b;
	}

	.msp-badge-pending_mandate {
		background: #dbeafe;
		color: #1e40af;
	}

	.msp-callout {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.msp-callout-info {
		background: var(--ddsa-info-bg, #eff6ff);
		color: var(--ddsa-info-text, #1e40af);
		border: 1px solid var(--ddsa-info-border, #bfdbfe);
	}

	.msp-callout-warning {
		background: var(--ddsa-warning-bg, #fef3c7);
		color: var(--ddsa-warning-text, #92400e);
		border: 1px solid var(--ddsa-warning-border, #fde68a);
	}

	.msp-callout-error {
		background: var(--ddsa-error-bg, #fef2f2);
		color: var(--ddsa-error-text, #991b1b);
		border: 1px solid var(--ddsa-error-border, #fecaca);
	}

	/* Trial callout — positive primary/info tone (this is a good thing,
	   not a warning). Slightly heavier border than info-bg so it stands
	   out enough to be the first thing a trial DSA sees. */
	.msp-callout-trial {
		background: var(--ddsa-primary-50, #eff6ff);
		color: var(--ddsa-primary-900, #1e3a8a);
		border: 1px solid var(--ddsa-primary-300, #93c5fd);
	}

	.msp-callout-trial strong {
		font-weight: 700;
	}

	.msp-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.msp-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		font-weight: 600;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s;
	}

	.msp-btn:disabled {
		cursor: default;
		opacity: 0.6;
	}

	.msp-btn-primary {
		background: var(--ddsa-primary, #cb997e);
		color: white;
	}

	.msp-btn-primary:hover:not(:disabled) {
		background: var(--ddsa-primary-hover, #b07d62);
	}

	.msp-btn-secondary {
		background: var(--dash-bg-alt);
		color: var(--dash-text);
		border-color: var(--dash-border);
	}

	.msp-btn-secondary:hover:not(:disabled) {
		background: var(--dash-bg-hover, #f3f4f6);
	}

	.msp-btn-danger {
		background: transparent;
		color: #b91c1c;
		border-color: transparent;
	}

	.msp-btn-danger:hover:not(:disabled) {
		text-decoration: underline;
	}

	.msp-btn-ghost {
		background: transparent;
		color: var(--dash-text-secondary);
	}

	.msp-btn-ghost:hover:not(:disabled) {
		background: var(--dash-bg-hover, #f3f4f6);
		color: var(--dash-text);
	}

	.msp-btn-icon {
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		border-radius: 0.375rem;
		background: var(--dash-bg-alt);
		color: var(--dash-text-secondary);
		border: 1px solid var(--dash-border);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.msp-btn-icon:hover:not(:disabled) {
		color: var(--dash-text);
	}

	.msp-btn-icon:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.msp-change-plan {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.msp-select {
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid var(--dash-border);
		background: var(--dash-bg-card);
		color: var(--dash-text);
		font-size: 0.8125rem;
	}

	.msp-checkbox {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--dash-text-secondary);
	}

	.msp-tx-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.625rem;
		align-items: center;
	}

	.msp-tx-table {
		border: 1px solid var(--dash-border);
		border-radius: 0.5rem;
		overflow-x: auto;
	}

	.msp-tx-header,
	.msp-tx-row {
		display: grid;
		/* D.2 — added 5th column for Invoice download link. */
		grid-template-columns: 1.1fr 0.9fr 0.9fr 0.75fr 0.85fr;
		padding: 0.5rem 0.875rem;
		font-size: 0.8125rem;
		align-items: center;
	}

	.msp-invoice-link {
		color: var(--ddsa-primary-600, #0d92f4);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.8125rem;
	}

	.msp-invoice-link:hover {
		text-decoration: underline;
	}

	.msp-dim {
		color: var(--dash-text-secondary, #9ca3af);
	}

	.msp-tx-header {
		background: var(--dash-bg-alt);
		font-weight: 600;
		color: var(--dash-text-secondary);
		border-bottom: 1px solid var(--dash-border);
	}

	.msp-tx-row {
		border-bottom: 1px solid var(--dash-border-light, #e5e7eb);
		color: var(--dash-text);
	}

	.msp-tx-row:last-child {
		border-bottom: none;
	}

	.msp-capitalize {
		text-transform: capitalize;
	}

	.msp-tx-status {
		font-weight: 600;
		font-size: 0.75rem;
	}

	.msp-tx-status-succeeded,
	.msp-tx-status-completed {
		color: #059669;
	}

	.msp-tx-status-failed,
	.msp-tx-status-cancelled {
		color: #dc2626;
	}

	.msp-tx-status-refunded {
		color: #d97706;
	}

	.msp-pager {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.8125rem;
	}

	.msp-pager-info {
		color: var(--dash-text-secondary);
	}

	.msp-empty {
		text-align: center;
		color: var(--dash-text-secondary);
		font-size: 0.875rem;
		padding: 1.5rem 0;
		margin: 0;
	}

	.msp-fine-print {
		font-size: 0.75rem;
		color: var(--dash-text-secondary);
		margin: 0;
	}

	.msp-link {
		background: none;
		border: none;
		padding: 0;
		color: var(--ddsa-primary, #cb997e);
		cursor: pointer;
		text-decoration: underline;
		font: inherit;
	}

	/* ── Error card ── */
	.msp-card {
		display: flex;
		gap: 0.5rem;
		padding: 0.875rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		margin: 1.5rem 0;
	}

	.msp-error {
		background: var(--ddsa-warning-bg, #fef3c7);
		color: var(--ddsa-warning-text, #92400e);
		border: 1px solid var(--ddsa-warning-border, #fde68a);
	}

	.msp-error-title {
		font-weight: 600;
		margin: 0;
	}

	.msp-error-detail {
		margin: 0.25rem 0 0;
	}

	/* ── Modal ── */
	.msp-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		padding: 1rem;
	}

	.msp-modal {
		width: 100%;
		max-width: 28rem;
		background: var(--dash-bg-card);
		border-radius: 0.75rem;
		padding: 1.25rem;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.msp-modal-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--dash-text);
		margin: 0 0 0.5rem;
	}

	.msp-modal-body {
		font-size: 0.875rem;
		color: var(--dash-text-secondary);
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.msp-modal-body p {
		margin: 0 0 0.5rem;
	}

	.msp-modal-error {
		color: #b91c1c;
		font-weight: 500;
	}

	.msp-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.msp-icon-ok {
		color: #059669;
	}

	.msp-icon-warn {
		color: #d97706;
	}

	/* ── Dark mode ── */
	:global(.dark) .msp-badge-active {
		background: #064e3b;
		color: #a7f3d0;
	}

	:global(.dark) .msp-badge-paused {
		background: #374151;
		color: #e5e7eb;
	}

	:global(.dark) .msp-badge-dunning_t0,
	:global(.dark) .msp-badge-dunning_grace,
	:global(.dark) .msp-badge-dunning_final {
		background: #78350f;
		color: #fde68a;
	}

	:global(.dark) .msp-badge-cancelled,
	:global(.dark) .msp-badge-downgraded {
		background: #7f1d1d;
		color: #fecaca;
	}

	:global(.dark) .msp-badge-pending_mandate {
		background: #1e3a8a;
		color: #bfdbfe;
	}

	@media (max-width: 640px) {
		.msp-summary-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.125rem;
		}

		.msp-tx-header,
		.msp-tx-row {
			/* D.2 — 5 columns at desktop, compressed at <640px. */
			grid-template-columns: 0.95fr 0.7fr 0.7fr 0.55fr 0.7fr;
			padding: 0.5rem 0.625rem;
			font-size: 0.75rem;
		}
	}
</style>
