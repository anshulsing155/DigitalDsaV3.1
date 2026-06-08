/**
 * D.1 Recurring Billing — Subscription document shape
 * ══════════════════════════════════════════════════════════════════
 * This is the NEW recurring-billing subscription model introduced by
 * Epic D.1. The legacy `DsaSubscription` (in dsaOnboardingV2.ts) and
 * the User.subscription field stay untouched — they describe the
 * pre-D.1 one-time-payment model. S8 migrates legacy subs into the
 * shape below as DSAs set up auto-pay.
 *
 * Spec: docs/specs/D-1-RECURRING-BILLING-SPEC.md §3.2 + §11.2
 * ══════════════════════════════════════════════════════════════════
 */

import type { ObjectId } from 'mongodb';
import type { PlanId } from '$lib/config/billing';

// ── State machine ───────────────────────────────────────────────

/**
 * The 9 states from §3.2 (state machine diagram).
 *
 * Lifecycle: not_subscribed → pending_mandate → active
 *   → (paused | dunning_t0 | downgraded | cancelled)
 * Dunning escalation: dunning_t0 → dunning_grace → dunning_final → downgraded
 * Re-subscribe path: downgraded | cancelled → pending_mandate
 *
 * See §3.2.1 transition table for the full set of 22 legal transitions.
 */
export type SubscriptionState =
	| 'not_subscribed'
	| 'pending_mandate'
	| 'active'
	| 'paused'
	| 'dunning_t0'
	| 'dunning_grace'
	| 'dunning_final'
	| 'downgraded'
	| 'cancelled';

/** Provider identifier for the rail behind the mandate. v1 = razorpay. */
export type BillingProviderName = 'razorpay' | 'mock';

// ── Audit-trail entry ───────────────────────────────────────────

export interface StateTransitionEntry {
	from: SubscriptionState;
	to: SubscriptionState;
	at: Date;
	/** Plain-English reason — required at every transition. Stored in audit log too. */
	reason: string;
	/**
	 * Optional structured payload — provider event id, attempt id, etc.
	 * Kept lean to avoid bloating the document; full audit detail lives in
	 * BillingAuditLogs (per §11 Q1 decision).
	 */
	meta?: Record<string, unknown>;
}

// ── Subscription document ───────────────────────────────────────

export interface BillingSubscriptionDoc {
	/** Mongo document id */
	_id?: ObjectId;

	/** Owning DSA — one subscription per DSA in v1. */
	dsa_id: ObjectId;

	// ── State machine ──
	state: SubscriptionState;
	/**
	 * When in `paused`, records the state we were in pre-pause so resume
	 * can restore it (locked 2026-05-25 §11.2 #12 — pause-from-dunning
	 * preserves dunning state). When NOT paused, this is undefined.
	 */
	paused_from_state?: Exclude<SubscriptionState, 'paused'>;

	// ── Plan ──
	plan_id: PlanId;
	/**
	 * Always `'monthly'` post-2026-05-29 — annual billing was removed as a
	 * product feature on 2026-05-29 (commit `cb0f3139`). Type kept as a
	 * single-element literal (rather than dropped) so the field shape is
	 * preserved for the persisted doc + future re-add (if product reverses)
	 * is a 2-character edit. If product DOES bring annual back, expand to
	 * `'monthly' | 'yearly'` here, in `BillingProvider.frequency`, and add
	 * the cycle-aware date arithmetic per the original `eea241b0` design.
	 */
	billing_cycle: 'monthly';
	/** Pending downgrade flag — applied on next anchor by the charge cron (§4 S6 change-plan). */
	pending_downgrade_to?: PlanId;

	// ── Provider linkage ──
	provider: BillingProviderName;
	/**
	 * Opaque provider-specific token (e.g. Razorpay token_id) that the
	 * webhook delivers after the DSA completes authorization. Used in
	 * every subsequent chargeMandate call. Redacted from logs via
	 * telemetry PII_ATTR_KEYS.
	 *
	 * Undefined in: not_subscribed, pending_mandate. Set on
	 * pending_mandate → active transition.
	 */
	mandate_token?: string;
	/**
	 * Provider's identifier for the pending registration attempt — used to
	 * correlate the eventual mandate.authorized webhook to the right
	 * subscription doc (Razorpay sends `payload.token.entity.entity_id`
	 * or similar; we look it up by this id).
	 *
	 * Defined while in pending_mandate; cleared on successful authorization
	 * (state → active) since mandate_token then takes over.
	 */
	pending_registration_id?: string;
	/**
	 * Provider's customer id (Razorpay cust_xxx). Required by every charge
	 * call. Set at registerMandate time and retained across the subscription's
	 * lifetime (so re-mandate doesn't reset the customer relationship).
	 */
	provider_customer_id?: string;
	/**
	 * Customer email + mobile snapshot at mandate-registration time
	 * (decided per S3 I-1 — store here vs per-charge user lookup). Razorpay's
	 * createRecurringPayment REQUIRES both per call, and the charge cron runs
	 * outside any user-request context, so we cache them on the subscription
	 * doc instead of paying an extra DsaApplications read per charge ×
	 * hundreds of subscriptions per cron tick.
	 *
	 * These are PII; they MUST be redacted from logs (telemetry PII_ATTR_KEYS)
	 * and MUST NOT appear in any non-billing audit. The subscription doc
	 * itself is access-restricted to billing endpoints + cron only.
	 *
	 * Refresh path: on `update-payment-method` (S6) we re-mandate with whatever
	 * email/mobile is current on DsaApplications, overwriting these fields.
	 * Don't read them as a source of truth elsewhere — DsaApplications stays
	 * canonical for DSA contact.
	 */
	customer_email?: string;
	customer_mobile?: string;
	/** Per-debit cap in paise (RBI requirement). monthly × 1.5 per §11 Q3. */
	max_amount_paise: number;

	// ── Cycle bookkeeping (anchor model per §11 Q2) ──
	/** Day-of-month anchor: 1, 5, 10, 15, 20, or 25 */
	anchor_day?: 1 | 5 | 10 | 15 | 20 | 25;
	/** Next debit fires at or after this time (cron picks up when <= now AND state=active). */
	next_charge_at?: Date;
	last_charge_attempt_at?: Date;
	last_charge_succeeded_at?: Date;

	// ── Dunning bookkeeping ──
	/**
	 * Set when first dunning_t0 transition fires. Drives `days_since_failure`
	 * math in S5. Does NOT reset on retry attempts within dunning — only on
	 * successful recovery back to active.
	 */
	dunning_started_at?: Date;
	failed_attempt_count: number;

	// ── Pre-charge reminder bookkeeping (S3 M4) ──
	/**
	 * When the most recent pre-charge reminder email was dispatched. The
	 * reminder cron uses this as a dedup gate: skip if
	 * `last_reminder_sent_at >= next_charge_at - 4 days`. A single field on
	 * the subscription doc is cheaper than a sibling `remindersSent` collection
	 * for our volume and atomically updateable via `$set`.
	 *
	 * Reset semantics: do NOT clear on charge success — the next anchor will
	 * have a new `next_charge_at` further in the future, so the dedup gate
	 * naturally re-opens 4 days before the next charge.
	 */
	last_reminder_sent_at?: Date;

	// ── Pending cancel ──
	/** Set when DSA hits cancel; cron transitions to cancelled at next anchor. */
	cancel_at_cycle_end?: boolean;

	// ── Pause auto-cancel (S6 M6) ──
	/**
	 * Stamped on day-60 of a `paused` stretch by the pause-sweep cron.
	 * Dedup gate so the reminder email fires exactly once per pause cycle.
	 * Cleared on resume (paused → non-paused side-effect — TODO if/when
	 * resume cycles need a fresh reminder window). For v1 the field is
	 * never cleared; if a DSA resumes then re-pauses, the reminder will
	 * NOT fire again — operator accepts the tradeoff (the day-90 auto-
	 * cancel still fires regardless).
	 */
	pause_reminder_sent_at?: Date;

	// ── Replacement mandate (S6 M3 update-payment-method) ──
	/**
	 * Set when the DSA initiates an update-payment-method flow. Holds the
	 * provider's new registration id so the inbound `mandate.authorized`
	 * webhook can correlate the event to THIS subscription doc (the
	 * existing pending_registration_id lookup won't match because the
	 * subscription isn't in pending_mandate state — it's still active or
	 * dunning_X or paused). Cleared on swap success or natural expiry.
	 *
	 * Lifecycle: M3 endpoint sets → webhook clears on swap → if no
	 * webhook arrives within 24h, the field is effectively dead (the
	 * provider's registration link has expired). M3 endpoint treats a
	 * row with an expired registration as eligible for overwrite.
	 */
	pending_replacement_registration_id?: string;
	/**
	 * 24h TTL for the replacement registration. The provider's hosted
	 * auth link expires at this time too. After expiry, the DSA must
	 * start a fresh update-payment-method flow.
	 */
	pending_replacement_expires_at?: Date;
	/**
	 * Short advisory lock (5 min from M3 endpoint fire). While set AND
	 * unexpired, chargeEngine.processOneSubscription SKIPS this row to
	 * avoid charging the old mandate moments before the swap webhook
	 * lands. R6 mitigation. Cleared on swap success; auto-expires
	 * regardless (the field is consulted via `> now` check, not via TTL
	 * index — no cleanup cron needed).
	 */
	mandate_update_lock_until?: Date;

	// ── S8 legacy migration grace ──
	/**
	 * Set when a legacy one-time-paid sub reaches expires_at without an
	 * auto-pay mandate. Sub stays `state=active` with `grace_period: true`
	 * until grace_until, then downgrades (§4 S8 + §11.2 #16, 3-day grace).
	 *
	 * NOTE: As of 2026-05-28 S8 was skipped (no legacy cohort). Fields
	 * retained on the schema for future legacy-migration scenarios; never
	 * set today.
	 */
	grace_period?: boolean;
	grace_until?: Date;

	// ── Free trial (2026-05-28) ──
	/**
	 * When the TRIAL_DAYS-day trial window ends. Equals `next_charge_at` during the
	 * trial — the cron fires the first real charge on this date.
	 *
	 * Cleared (unset) on first successful charge so that downstream consumers
	 * never confuse a paid sub for a trial sub. Inspect `is_trial` for the
	 * live boolean signal during the window.
	 *
	 * Always set together with `is_trial: true` when a new sub is created
	 * via the trial path; never set retroactively.
	 */
	trial_until?: Date;
	/**
	 * True while the sub is in its initial free-trial window. Flips false
	 * (or unset) on first successful charge. Drives:
	 *   - Trial banner in ManageSubscriptionPanel
	 *   - Trial-end reminder email at T-3d (via existing pre-charge reminder cron)
	 *   - "Cancel during trial → no charge" UX copy
	 *
	 * The reason this isn't derived from `trial_until > now` is that we want
	 * a stable boolean even after `trial_until` is cleared — for audit /
	 * support tooling that wants to know "did this sub start as a trial?".
	 */
	is_trial?: boolean;
	/**
	 * SHA-256(device_id || TRIAL_PEPPER) — the client-side device-id hash
	 * captured at trial subscribe-click time. Persisted on the pending_mandate
	 * doc so the async webhook handler can insert a `kind: 'device'` blocklist
	 * row alongside the mobile/PAN/GST rows on successful mandate authorization.
	 *
	 * Cleared (unset) after the webhook writes the blocklist row — no further
	 * need on the sub doc. If the DSA abandons authorization, the field lingers
	 * until the pending-cleanup cron transitions the sub to not_subscribed,
	 * which clears it via the existing $unset on re-subscribe.
	 *
	 * Optional because clients without localStorage (incognito, locked-down
	 * environments) can't supply a device_id; in that case the gate falls
	 * back to the 3 PII identifiers only.
	 */
	pending_device_id_hash?: string;

	// ── Audit ──
	state_history: StateTransitionEntry[];

	// ── Timestamps ──
	created_at: Date;
	updated_at: Date;
}

// ── Helper type for transitionSubscription input ───────────────

/**
 * Minimal shape needed for the pure transition function — accepts any object
 * with the state-machine-relevant fields, so callers don't have to materialize
 * a full document. The function mutates a copy and returns it.
 */
export type TransitionInput = Pick<
	BillingSubscriptionDoc,
	| 'state'
	| 'paused_from_state'
	| 'state_history'
	| 'dunning_started_at'
	| 'failed_attempt_count'
	| 'updated_at'
>;

// ── ChargeAttempts (S3 M1) ──────────────────────────────────────

/**
 * Per-cycle charge attempt row written by `chargeEngine.ts` BEFORE the
 * provider call (two-phase persist, spec R1/R2). The combination
 * `(subscription_id, cycle_anchor)` is the per-cycle idempotency key —
 * if a row with status='succeeded' already exists for the current
 * `next_charge_at`, the engine MUST skip calling `chargeMandate` (this
 * is what prevents double-charge if the cron fires twice from two
 * regions or a retry — Razorpay's per-attempt receipt dedup does NOT
 * catch this because the second cron run generates a fresh `attempt_id`).
 *
 * Crash-recovery semantics: a `pending` row older than ~30 min on the
 * NEXT cron run means a prior run crashed between insert and the
 * provider response. The engine re-invokes `chargeMandate` with the SAME
 * `attempt_id` so Razorpay's receipt-dedup catches the duplicate and
 * returns the original payment status — the engine updates the row to
 * `succeeded` and continues.
 *
 * Indexes (see mongo.ts):
 *   - (subscription_id, cycle_anchor) compound — the idempotency probe
 *   - (status, created_at) — the "stale pending" resume query
 *   - dsa_id — operator dashboards / debugging
 */
export interface ChargeAttemptDoc {
	_id?: ObjectId;
	/** UUID v4 — also passed to Razorpay as the order receipt for provider-side dedup. */
	attempt_id: string;
	subscription_id: ObjectId;
	dsa_id: ObjectId;
	plan_id: PlanId;
	amount_paise: number;
	status: 'pending' | 'succeeded' | 'failed';
	/** Provider-independent code from `FailureCode` (`BillingProvider.ts`). */
	failure_code?: string;
	failure_message?: string;
	/** Populated on succeeded. */
	provider_payment_id?: string;
	/** The `next_charge_at` value this attempt was for — anchors the idempotency probe. */
	cycle_anchor: Date;
	/** Raw provider response (audit + debugging). */
	provider_raw_response?: unknown;
	created_at: Date;
	updated_at: Date;
}

// ── BillingTransactions (D.1 extension) ─────────────────────────

/**
 * The `billingTransactions` collection predates D.1 and was originally
 * written ONLY by the one-time-payment subscribe/cancel endpoints
 * (`src/routes/api/billing/subscribe/+server.ts`,
 * `src/routes/api/billing/cancel/+server.ts`). Those rows are kept as-is
 * for backward compatibility (no `kind` field).
 *
 * D.1's charge cron writes rows with `kind: 'recurring_charge'` and the
 * S3 webhook handler writes `kind: 'webhook_confirmation'` when
 * `charge.succeeded` arrives asynchronously after the cron has already
 * recorded the success (the second write is idempotent on
 * `(subscription_id, provider_payment_id)`).
 *
 * Readers (the DSA billing dashboard) discriminate by the OPTIONAL
 * `kind` field — absent means legacy.
 */
export type BillingTransactionDoc = LegacyBillingTransactionDoc | RecurringBillingTransactionDoc;

/**
 * Pre-D.1 shape. Do not extend; new fields go on the Recurring variant.
 *
 * `kind: 'legacy_one_time'` is required on the TYPE so the discriminated
 * union narrows cleanly. Old rows in the DB written before this type
 * existed have NO `kind` field — those rows still load (Mongo doesn't
 * enforce schema), and the dashboard reader treats both
 * `kind === 'legacy_one_time'` and a missing kind as legacy via the
 * "neither recurring variant" branch.
 */
export interface LegacyBillingTransactionDoc {
	_id?: ObjectId;
	kind: 'legacy_one_time';
	dsa_id: ObjectId;
	plan: string;
	amount: number;
	amount_paise?: number;
	razorpay_order_id?: string;
	razorpay_payment_id?: string;
	status: 'completed' | 'cancelled' | 'failed' | 'refunded';
	created_at: Date;
	/** Free-text operator note (used by cancel endpoint). */
	notes?: string;
	/**
	 * Stamped by `scripts/d1-s8-skip-legacy-cleanup.mjs` (2026-05-28) on every
	 * legacy `kind: 'legacy_one_time'` row (and rows with no `kind` at all).
	 * The /api/billing/transactions reader filters these out by default so
	 * they don't surface in the new recurring-billing UI — but the rows are
	 * retained on disk for 6-year billing audit compliance (§11 Q1).
	 *
	 * NOT set on recurring rows (kind: 'recurring_charge' /
	 * 'webhook_confirmation'). Adding it to the legacy variant only.
	 */
	archived_at?: Date;
}

export interface RecurringBillingTransactionDoc {
	_id?: ObjectId;
	kind: 'recurring_charge' | 'webhook_confirmation';
	dsa_id: ObjectId;
	subscription_id: ObjectId;
	attempt_id: string;
	plan_id: PlanId;
	amount_paise: number;
	status: 'succeeded' | 'failed';
	provider: BillingProviderName;
	provider_payment_id?: string;
	failure_code?: string;
	cycle_anchor: Date;
	charged_at: Date;
	created_at: Date;
}

// ── BillingAuditLogs (S3 M1) ────────────────────────────────────

/**
 * Append-only audit trail for every billing state transition + cron run
 * + webhook event. Separate collection from `policyAuditLog` and the
 * generic `auditLog` to allow per-class retention (spec §11 Q1: billing
 * keeps 6 years for regulatory compliance vs operational logs at 1 year).
 *
 * The `writeAuditLog` helper in `src/lib/server/auditLog.ts` will be
 * extended to take an optional `collection` argument (per S3 I-4
 * decision) so S3 can route here without a parallel helper.
 *
 * `_id` is auto-assigned. There are no unique constraints — the same
 * event can produce multiple audit rows (one per actor-aware view); the
 * `event_id` field is for grouping, not dedup.
 */
export interface BillingAuditLogDoc {
	_id?: ObjectId;
	/** Coarse classification — drives retention + redaction policy. */
	event_class:
		| 'subscription_transition'
		| 'charge_attempt'
		| 'webhook_event'
		| 'cron_run'
		| 'admin_action';
	/** Specific event name within the class (e.g. 'active->dunning_t0', 'charge.succeeded'). */
	event_name: string;
	/** Optional grouping key — events that belong to the same logical operation share it. */
	event_id?: string;
	subscription_id?: ObjectId;
	dsa_id?: ObjectId;
	actor: 'cron' | 'webhook' | 'dsa' | 'admin' | 'system';
	actor_id?: ObjectId;
	/** PII-safe payload only. Secrets / tokens MUST be scrubbed before write. */
	payload: Record<string, unknown>;
	created_at: Date;
}

// ── CronLocks (S3 M1) ───────────────────────────────────────────

/**
 * Global lock for cron jobs that MUST NOT run concurrently. Used by the
 * charge cron to prevent two Vercel regions (or a retry-on-failure) from
 * processing the same eligible subscriptions twice.
 *
 * Heartbeat pattern per spec R14: a static long TTL holds the lock past
 * cron completion if the process crashes; a static short TTL releases
 * mid-cron if the batch runs long. So the cron acquires with a SHORT
 * TTL (~5 min) and extends it every ~60s via `extendCronLock` until the
 * batch finishes, then releases explicitly.
 *
 * Acquisition uses `findOneAndUpdate` with upsert + a `released_at == null
 * OR expires_at < now` precondition; the atomic compare-and-set guarantees
 * only one caller observes the success path.
 */
export interface CronLockDoc {
	_id?: ObjectId;
	/** Stable lock name — e.g. 'billing-charge', 'billing-reminder'. Unique. */
	name: string;
	/** Opaque identifier of the holder — UUID generated on acquire. */
	holder_id: string;
	acquired_at: Date;
	/** Heartbeat-extended; if `Date.now() > expires_at` the lock is stale. */
	expires_at: Date;
	/** Set on explicit release. A row with `released_at != null` is reusable. */
	released_at?: Date | null;
}

// ── TrialIdentifierBlocklist (2026-05-28) ───────────────────────

/**
 * Append-only ledger of identifiers (hashed) that have ever consumed a
 * free trial. Used by the subscribe-recurring endpoint to enforce the
 * one-trial-per-DSA invariant across mobile / PAN / GST simultaneously.
 *
 * Why three identifiers (defense-in-depth): a determined abuser can
 * change one of them — get a second SIM (mobile), have a relative
 * sign up (PAN), spin a new business entity (GST). All three at once
 * requires committing actual identity fraud, which we don't try to
 * defeat — that's the bank's KYC role.
 *
 * Why hashed (not plaintext): we don't want a second copy of PII
 * lying around just for this gate. SHA-256 with a server-side pepper
 * (env var `TRIAL_PEPPER`) means a leaked dump of this collection
 * is still useless for re-identifying users.
 *
 * Lifecycle: rows are inserted on successful trial mandate authorization
 * (webhook handler, NOT on subscribe-click — see §4). Never deleted in
 * the normal flow. Admin override endpoint can soft-delete a row to
 * re-grant a trial for a specific support case (audit-logged).
 *
 * Indexes (registered in mongo.ts):
 *   - (identifier_kind, identifier_hash) compound + unique — the lookup
 *     query in checkTrialEligibility. Uniqueness here means a single
 *     identifier can't be inserted twice; two DSAs sharing the same
 *     phone (rare but possible) means the second one's insert fails
 *     gracefully — engine treats that as "already consumed."
 *   - dsa_id — operator/admin dashboards (who used this identifier?)
 */
export interface TrialIdentifierBlocklistDoc {
	_id?: ObjectId;
	/**
	 * Identifier category. Ordered loosely by strength of identity binding:
	 *   - 'mobile' / 'pan' / 'gst' — PII identifiers tied to the human or
	 *     business entity. Strong (PAN especially) — gaming requires actual
	 *     identity fraud.
	 *   - 'device' (added 2026-05-28) — client-side device fingerprint.
	 *     Weaker than the PII identifiers because browser fingerprints reset
	 *     on cookie clear / incognito / fresh browser; mobile Capacitor IDs
	 *     reset on factory reset / app reinstall. Catches the LAZY abuser
	 *     (same physical device, new PAN/phone). Combined with the 3 PII
	 *     identifiers it raises the bar meaningfully.
	 */
	identifier_kind: 'mobile' | 'pan' | 'gst' | 'device';
	/** SHA-256(value || TRIAL_PEPPER) hex string. 64 chars. */
	identifier_hash: string;
	/** The DSA who claimed this identifier (for admin lookup). */
	dsa_id: ObjectId;
	granted_at: Date;
	source: 'auto' | 'admin_override';
	/** Audit pointer for admin overrides — links to billingAuditLogs entry. */
	override_audit_id?: ObjectId;
	/**
	 * Set when an admin grants a SECOND trial (override) — the original
	 * row stays in place but its `revoked_at` is stamped, and we insert
	 * fresh rows for the new trial grant. Lets admin tooling answer
	 * "show me every trial this identifier has ever claimed" by sorting
	 * on granted_at without losing history.
	 *
	 * RETENTION: rows are kept indefinitely (no TTL). One-trial-per-DSA
	 * is a forever rule by design — a DSA who consumed a trial today
	 * should still match the gate five years from now. Hashes are tiny
	 * (64 bytes each); even at scale this collection stays small (~MB
	 * range) so the storage cost is negligible relative to the abuse
	 * defense it provides.
	 */
	revoked_at?: Date;
}
