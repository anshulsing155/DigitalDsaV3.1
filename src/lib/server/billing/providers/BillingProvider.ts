/**
 * D.1 Recurring Billing — Provider-agnostic interface
 * ══════════════════════════════════════════════════════════════════
 * Path 2 architecture (ADR-0014): orchestration is ours, payment rail
 * is swappable. Every slice S2-S7 calls this interface, never a
 * specific Razorpay/sponsor-bank method directly.
 *
 * v1 leaf is RazorpayProvider (ADR-0014 locked 2026-05-25). The
 * MockProvider in this folder is for tests + the R11 simulate-event
 * driver.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.1
 * ══════════════════════════════════════════════════════════════════
 */

import type { BillingProviderName } from '$lib/types/billingSubscription';

// ── Mandate registration ────────────────────────────────────────

export interface MandateRegistrationRequest {
	dsa_id: string;
	plan_id: string;
	/** RBI requirement: per-debit ceiling (NOT annual). monthly × 1.5 per §11 Q3. */
	max_amount_paise: number;
	/**
	 * Always `'monthly'` post-2026-05-29 — annual billing was removed as a
	 * product feature (commit `cb0f3139`). See parallel narrowing in
	 * `$lib/types/billingSubscription` → `BillingSubscriptionDoc.billing_cycle`.
	 */
	frequency: 'monthly';
	customer_name: string;
	customer_email: string;
	/** E.164 (+91XXXXXXXXXX) */
	customer_mobile: string;
	/**
	 * Verification charge to fire during mandate auth — 100 paise (₹1)
	 * per §11.1 ₹1 auth-then-refund pattern. Refunded by the provider
	 * implementation on mandate.authorized. NOTE: forced to 0 for eMandate
	 * registration in the Razorpay adapter (Razorpay's API requires
	 * `amount: 0` for eNACH; the ₹1 verification concept is a Card /
	 * UPI-Autopay rail thing, not eMandate — see razorpay.ts S216 fix).
	 */
	verification_charge_paise?: number;
}

export interface MandateRegistrationResult {
	/**
	 * Provider's identifier for the PENDING registration attempt (NOT the
	 * chargeable mandate token — that arrives via the webhook later).
	 * Used to correlate the eventual `mandate.authorized` webhook and to
	 * poll status during the 24h authorization window.
	 *
	 * For Razorpay this is the registration_link id; for Mock it's a
	 * synthetic UUID.
	 */
	pending_registration_id: string;
	/**
	 * Provider's customer id — required by chargeMandate(). Stored on the
	 * subscription doc alongside the mandate_token (which webhook fills in).
	 */
	customer_id: string;
	/** Hosted authorization URL — DSA visits to complete bank-side auth. */
	authorization_url: string;
	/** When this pending registration attempt expires (24h TTL). */
	expires_at: Date;
}

// ── Charge ──────────────────────────────────────────────────────

export interface ChargeRequest {
	mandate_token: string;
	amount_paise: number;
	/**
	 * OUR idempotency key — UUID generated per attempt. Providers should
	 * dedupe on this; we re-send the same attempt_id on retry.
	 */
	attempt_id: string;
	/** Customer-facing description (appears on the bank statement). */
	description: string;
	/**
	 * Provider's customer id from MandateRegistrationResult. REQUIRED for
	 * Razorpay's createRecurringPayment; Mock ignores. Orchestration layer
	 * pulls from subscription doc.
	 */
	customer_id?: string;
	/** Customer's email — required by Razorpay's createRecurringPayment. */
	customer_email?: string;
	/** Customer's mobile (E.164) — required by Razorpay's createRecurringPayment. */
	customer_mobile?: string;
}

export type ChargeStatus = 'succeeded' | 'pending' | 'failed';

/**
 * Provider-independent failure codes (§3.3). Each provider's translation
 * table lives in its implementation file.
 */
export type FailureCode =
	| 'INSUFFICIENT_FUNDS' // retryable per S4
	| 'MANDATE_INVALID' // terminal — straight to downgraded
	| 'BANK_DECLINED' // retryable per §11.2 #4 (most are transient)
	| 'PROVIDER_TIMEOUT' // → pending, reconcile cron resolves
	| 'UNKNOWN'; // operator alert + manual review

export interface ChargeResult {
	status: ChargeStatus;
	/** Populated when status === 'succeeded'. */
	provider_payment_id?: string;
	failure_code?: FailureCode;
	failure_message?: string;
	/** Raw provider response — preserved for audit + debugging. */
	raw_response: unknown;
}

// ── Refund ──────────────────────────────────────────────────────

export interface RefundRequest {
	provider_payment_id: string;
	amount_paise: number; // partial refunds allowed
	reason: string;
	attempt_id: string;
}

export interface RefundResult {
	status: 'succeeded' | 'failed';
	provider_refund_id?: string;
	raw_response: unknown;
}

// ── Mandate revocation (S6 M3) ──────────────────────────────────

export interface RevokeMandateResult {
	status: 'succeeded' | 'failed' | 'not_supported';
	/** Raw provider response — preserved for audit + debugging. */
	raw_response: unknown;
}

// ── Mandate status query ────────────────────────────────────────

export type ProviderMandateStatus =
	| 'pending_authorization'
	| 'active'
	| 'paused'
	| 'halted'
	| 'revoked'
	| 'expired';

// ── Settlement (S7 reconcile) ───────────────────────────────────

export interface SettlementEntry {
	provider_payment_id: string;
	amount_paise: number;
	settled_at: Date;
	type: 'charge' | 'refund';
}

// ── Webhook normalization ───────────────────────────────────────

export interface NormalizedEvent {
	/** Provider-supplied event id — used for dedup via processedWebhookEvents. */
	provider_event_id: string;
	event_type:
		| 'mandate.authorized'
		| 'mandate.revoked'
		| 'charge.succeeded'
		| 'charge.failed'
		| 'settlement.completed';
	mandate_token?: string;
	provider_payment_id?: string;
	amount_paise?: number;
	failure_code?: FailureCode;
	occurred_at: Date;
	raw: unknown;
}

// ── The interface ───────────────────────────────────────────────

export interface BillingProvider {
	/** Stable identifier — `razorpay`, `mock`, etc. */
	name: BillingProviderName;

	/** Step 1 of subscribe (§4 S2). Returns the hosted auth URL the DSA visits. */
	registerMandate(req: MandateRegistrationRequest): Promise<MandateRegistrationResult>;

	/** Recurring charge — called by the renewal cron (§4 S3) and by retries (§4 S4). */
	chargeMandate(req: ChargeRequest): Promise<ChargeResult>;

	/** Refund a previous charge (D.3). */
	refundCharge(req: RefundRequest): Promise<RefundResult>;

	/** Backup poll for mandate state — used in webhook-miss scenarios + admin tooling. */
	queryMandateStatus(mandate_token: string): Promise<ProviderMandateStatus>;

	/**
	 * Best-effort revoke of an existing mandate at the provider (§4 S6 M3).
	 * Called by the webhook handler after a replacement mandate is
	 * authorized, so the old mandate can no longer be charged from the
	 * bank side. Failure is logged but does NOT block the our-side swap —
	 * the operator can clean up via the provider dashboard.
	 *
	 * Razorpay note: Razorpay's recurring tokens don't have a
	 * dedicated "revoke" REST endpoint distinct from cancelling the
	 * subscription/plan that owns them. Implementations may best-effort
	 * with `subscriptions.cancel()` or similar; the contract here is
	 * just "we tried, here's the result."
	 */
	revokeMandate(mandate_token: string): Promise<RevokeMandateResult>;

	/**
	 * Settlement report for a given IST calendar day (§4 S7).
	 * Returns the matched + unmatched charges + refunds.
	 */
	fetchSettlements(istDate: Date): Promise<SettlementEntry[]>;

	/** HMAC verification — every provider exposes the secret per env var. */
	verifyWebhookSignature(body: string, signature: string): boolean;

	/** Parse provider-specific webhook payload into our NormalizedEvent shape. */
	parseWebhookEvent(body: unknown): NormalizedEvent | null;
}
