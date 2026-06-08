# D.1 — Recurring Billing (Provider-Agnostic Architecture, Razorpay v1 leaf)

**Status**: ✅ **APPROVED — implementation cleared to start (2026-05-25)**. All 6 §11 lock-downs decided; all P0 critique items applied; top-priority P1/P2/P3/MISS items closed; 16 additional policy decisions (§11.2 batch-decision log) explicitly owner-confirmed in plain-English review. Next step is S1 code (Subscription state model + MockProvider + R11 test driver, ~1.5 days).
**Owner**: Prashant (digitaldsa)
**Created**: 2026-05-23 night, planning session. Leaf-provider decision added 2026-05-25 after Yes Bank evaluation.
**Sequence**: First slice of Epic D (D-NOW); D.2 (GST invoicing), D.3 (refund), D.4 (dunning), D.5 (reconciliation), D.6 (pricing fence) depend on this.
**Related**: [ADR-0014](../adr/0014-billing-rail-provider-agnostic.md) (rail + leaf provider decision); CLAUDE.md §16 (process rules); existing PLANS config in `src/lib/config/billing-plans.ts`; existing Razorpay one-time-order code at `src/routes/api/razorpay/`.

---

## 1. Purpose

The platform launches without launch-grade recurring billing. DSAs pay manually every cycle (one-time Razorpay orders), with no auto-pay, no eNACH, no retry-on-failure, no GST invoice, no in-app refund button, no failed-payment escalation, no daily reconciliation against settlements. The pricing fence has no teeth (43 cases observed on no-plan; Basic caps at 10).

This spec replaces that with **provider-agnostic recurring billing** — an orchestration layer that owns the subscription state machine, retry logic, dunning escalation, and reconciliation, and treats the underlying payment rail (Razorpay vs Yes Bank sponsor-bank vs anything else) as a swappable leaf.

---

## 2. Decision context — the rail question

Three viable architectures were considered. The choice between them comes down to **NPCI access** (regulatory) and **operational overhead** (organizational), not code.

| Path | What we build | What we rent | Per-debit cost | First-day ready | Re-eval trigger |
|---|---|---|---:|---|---|
| **Path 1** | Webhook listener + dunning emails + GST invoices | Razorpay Subscriptions (state machine + retries + lifecycle events) | ~2% | ~3 days | n/a — locked in |
| **Path 2** | State machine + cron + retry + dunning + reconcile + webhook listener + GST invoices | Razorpay one-time charges via existing API (payment-rail only) | ~2% | ~11.5 days | volume + Path 3 readiness |
| **Path 3** | Same as Path 2 | Sponsor-bank eNACH/UPI-AutoPay origination (likely **Yes Bank** — see §9) | ~₹2-5 flat | ~11.5 days + ~4-12 weeks bank onboarding | n/a — terminal |

**Path 2 is chosen** for v1 architecture, with **Razorpay as the v1 leaf provider** (decision 2026-05-25 — see [ADR-0014](../adr/0014-billing-rail-provider-agnostic.md) "Yes Bank evaluation outcome"). The reasoning:

1. **Path 1 locks us into Razorpay's subscription model.** Razorpay's recurring product handles only standard fixed-tier monthly/annual cycles cleanly; future requirements like usage-based pricing (per-case rather than per-month) or hybrid plans don't fit. Once committed, migration off is a rewrite. **We use Razorpay's standard charge/refund APIs, NOT Razorpay Subscriptions** — the orchestration is ours.
2. **Path 2's orchestration is identical regardless of rail.** The state machine, retry logic, dunning, reconciliation, audit, kill-switch — all provider-independent. Building Path 2 against Razorpay-as-rail today lets us swap to a sponsor bank tomorrow by implementing one new file.
3. **The 2% fee is meaningful but not blocking at v1 volume.** Even at ₹50L/month GMV, the difference between Razorpay (~₹100K/mo fees) and direct sponsor-bank (~₹25K/mo fees + ops) is ~₹75K/mo — material but bounded. At launch volume it's tens of thousands of rupees, below the cost of getting RBI compliance wrong.
4. **Yes Bank was evaluated and not pursued for v1** (see §9). Multiple soft disqualifiers (fee economics, onboarding timeline, sandbox/API maturity gap on R11 simulation events, ops load) — not one dealbreaker, but the net evaluation said wait. Re-evaluation triggers in ADR-0014 still apply.
5. **The `BillingProvider` interface (§3) keeps the door open.** v1 ships `RazorpayProvider`; if a future sponsor bank becomes viable, we add one new file + flip an env var.

---

## 3. Provider-agnostic architecture

### 3.1 The `BillingProvider` interface

Every Path 2 slice (S3 cron, S4 retry, S5 dunning, S7 reconcile, D.3 refund) calls the interface, not a specific Razorpay/Yes Bank method. Swapping providers = implement one new file + flip an env var.

```typescript
// src/lib/server/billing/BillingProvider.ts
export interface MandateRegistrationRequest {
  dsa_id: string;
  plan_id: string;                    // our PLANS config id
  max_amount_paise: number;           // RBI requires max-amount cap
  frequency: 'monthly' | 'yearly';
  customer_name: string;
  customer_email: string;
  customer_mobile: string;            // E.164 format
}

export interface MandateRegistrationResult {
  mandate_token: string;              // opaque provider-specific token
  authorization_url: string;          // checkout / hosted-page URL
  expires_at: Date;                   // when this registration attempt times out
}

export interface ChargeRequest {
  mandate_token: string;
  amount_paise: number;
  attempt_id: string;                 // OUR idempotency key (UUID)
  description: string;                // shows on the customer's bank statement
}

export type ChargeStatus = 'succeeded' | 'pending' | 'failed';

export interface ChargeResult {
  status: ChargeStatus;
  provider_payment_id?: string;       // populated on 'succeeded'
  failure_code?: string;              // standardized across providers (see §3.3)
  failure_message?: string;
  raw_response: unknown;              // for audit
}

export interface RefundRequest {
  provider_payment_id: string;
  amount_paise: number;               // partial allowed
  reason: string;
  attempt_id: string;
}

export interface RefundResult {
  status: 'succeeded' | 'failed';
  provider_refund_id?: string;
  raw_response: unknown;
}

export type MandateStatus =
  | 'pending_authorization'
  | 'active'
  | 'paused'
  | 'halted'
  | 'revoked'
  | 'expired';

export interface BillingProvider {
  name: 'razorpay' | 'yes_bank' | string;
  registerMandate(req: MandateRegistrationRequest): Promise<MandateRegistrationResult>;
  chargeMandate(req: ChargeRequest): Promise<ChargeResult>;
  refundCharge(req: RefundRequest): Promise<RefundResult>;
  queryMandateStatus(mandate_token: string): Promise<MandateStatus>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  parseWebhookEvent(body: unknown): NormalizedEvent | null;
}

export interface NormalizedEvent {
  provider_event_id: string;          // for dedup
  event_type:
    | 'mandate.authorized'
    | 'mandate.revoked'
    | 'charge.succeeded'
    | 'charge.failed'
    | 'settlement.completed';
  mandate_token?: string;
  provider_payment_id?: string;
  amount_paise?: number;
  occurred_at: Date;
  raw: unknown;
}
```

Implementation files (per leaf):
- `src/lib/server/billing/providers/razorpay.ts` — `RazorpayProvider` class
- `src/lib/server/billing/providers/yesbank.ts` — `YesBankProvider` class (only built if Path 3 chosen)
- `src/lib/server/billing/providers/mock.ts` — `MockProvider` for tests + dev fixture-injection

Provider selection at boot:
```typescript
// src/lib/server/billing/providerRegistry.ts
const PROVIDER = process.env.BILLING_PROVIDER ?? 'razorpay';
export const billingProvider: BillingProvider =
  PROVIDER === 'yes_bank' ? new YesBankProvider()
  : PROVIDER === 'mock'    ? new MockProvider()
                           : new RazorpayProvider();
```

### 3.2 The subscription state machine

THE critical artifact. Every audit, every monitoring metric, every UI label flows from these states.

```
                           ┌──────────────────┐
                           │   not_subscribed │  (DSA never subscribed, or fully expired)
                           └────────┬─────────┘
                                    │ DSA clicks Subscribe
                                    ▼
                           ┌──────────────────┐
                           │  pending_mandate │  ← mandate registration in flight at provider
                           │  (24h TTL)       │     no access granted yet
                           └────────┬─────────┘
                                    │ mandate.authorized webhook
                                    ▼
                           ┌──────────────────┐
              ┌────────────┤      active      ├────────────┐
              │            └────────┬─────────┘            │
              │  charge.succeeded   │ charge.failed        │  DSA paused
              │  (cycle renewed)    │ (attempt result)     │
              │                     ▼                      ▼
              │            ┌──────────────────┐    ┌──────────────────┐
              │            │   dunning_t0     │    │      paused      │
              │            │  (failed, day 0) │    │                  │
              │            └────────┬─────────┘    └──────┬───────────┘
              │                     │                     │  DSA resume
              │  retry succeeded   │ Day 3 advance       │
              │ ◄───────────────────┤                     │
              │                     ▼                     │
              │            ┌──────────────────┐           │
              │            │  dunning_grace   │           │
              │            │  (day 3-6)       │           │
              │            └────────┬─────────┘           │
              │                     │ Day 7 advance       │
              │                     ▼                     │
              │            ┌──────────────────┐           │
              │            │ dunning_final    │           │
              │            └────────┬─────────┘           │
              │                     │ Day 8 advance       │
              │                     ▼                     │
              │            ┌──────────────────┐           │
              └────────────►   downgraded     │           │
                           │ (free tier, ke-  │           │
                           │  ep data)        │◄──────────┘
                           └────────┬─────────┘
                                    │ DSA cancels OR mandate revoked
                                    ▼
                           ┌──────────────────┐
                           │    cancelled     │  (terminal — audit retained)
                           └──────────────────┘
```

State storage on the `subscription` document:

```typescript
{
  dsa_id: ObjectId,
  state: 'not_subscribed' | 'pending_mandate' | 'active' | 'paused'
       | 'dunning_t0' | 'dunning_grace' | 'dunning_final'
       | 'downgraded' | 'cancelled',
  plan_id: string,
  billing_cycle: 'monthly' | 'yearly',

  // Provider linkage
  provider: 'razorpay' | 'yes_bank',
  mandate_token: string,        // opaque, redacted from logs
  max_amount_paise: number,

  // Cycle bookkeeping
  next_charge_at: Date,         // when the next debit should fire
  last_charge_attempt_at?: Date,
  last_charge_succeeded_at?: Date,
  cycle_anchor_day?: number,    // 1-28 (avoiding 29-31 for month-boundary safety)

  // Dunning bookkeeping
  dunning_started_at?: Date,
  failed_attempt_count: number,

  // Audit
  state_history: Array<{ from: string; to: string; at: Date; reason: string }>,

  // Timestamps
  created_at: Date,
  updated_at: Date,
}
```

State transition rules enforced by a `transitionSubscription(from, to, reason)` helper. Illegal transitions throw (unit-tested). Every transition writes a `writeAuditLog` row (C.5 helper, money-retention path — see §6).

### 3.2.1 Transition table (source of truth)

The diagram above is illustrative; this table is the **authoritative enumeration** of every legal (from, to, trigger). The `transitionSubscription` helper enforces it; anything not listed throws. Added 2026-05-25 per critique P1-1 (the diagram had at least 6 missing edges).

| # | From | To | Trigger |
|---|---|---|---|
| 1 | `not_subscribed` | `pending_mandate` | DSA clicks Subscribe → `registerMandate()` returns auth URL |
| 2 | `pending_mandate` | `active` | webhook `mandate.authorized` — `next_charge_at` is set to the **nearest future anchor day** per §11 Q2 (NOT to "today + 1 month"); the auth-time ₹1 verification charge per §11.1 is refunded as part of this transition |
| 3 | `pending_mandate` | `not_subscribed` | 24h TTL expires; user abandoned authorization (cron `billing-pending-cleanup` advances) |
| 4 | `pending_mandate` | `pending_mandate` | DSA re-clicks Subscribe within the 24h window: query existing mandate at provider; if still pending, **abort the new request with 409** ("complete the prior authorization or wait for it to expire"); if provider says expired/revoked, overwrite the token and emit `pending_mandate.replaced` audit row |
| 5 | `active` | `active` | webhook `charge.succeeded` (cycle renewed); `next_charge_at` extended by 1 cycle (same anchor day, next month) per §11 Q2 |
| 6 | `active` | `dunning_t0` | webhook/sync `charge.failed` with retryable code (INSUFFICIENT_FUNDS / BANK_DECLINED / UNKNOWN) |
| 7 | `active` | `downgraded` | webhook/sync `charge.failed` with non-retryable code (MANDATE_INVALID) |
| 8 | `active` | `paused` | DSA hits `POST /api/billing/subscription/pause`; `paused_from_state = 'active'` |
| 8a | `dunning_t0` / `dunning_grace` / `dunning_final` | `paused` | DSA hits pause while in dunning; `paused_from_state = ‹current state›`; preserves `dunning_started_at` + `failed_attempt_count`; dunning-advance cron skips paused rows (locked 2026-05-25) |
| 9 | `active` | `cancelled` | post-cron-tick when `cancel_at_cycle_end` flag is set and `next_charge_at` is reached |
| 10 | `dunning_t0` | `active` | retry attempt at t+1d/t+3d/t+5d succeeds |
| 11 | `dunning_t0` | `dunning_grace` | S5 dunning-advance cron sees `days_since_failure ≥ 3` and still failing |
| 12 | `dunning_t0` | `downgraded` | retry attempt returns MANDATE_INVALID (mandate died mid-dunning) |
| 13 | `dunning_grace` | `active` | retry attempt succeeds during grace window |
| 14 | `dunning_grace` | `dunning_final` | S5 dunning-advance cron sees `days_since_failure ≥ 7` and still failing |
| 15 | `dunning_grace` | `downgraded` | retry attempt returns MANDATE_INVALID |
| 16 | `dunning_final` | `active` | retry attempt succeeds during final window |
| 17 | `dunning_final` | `downgraded` | S5 dunning-advance cron sees `days_since_failure ≥ 8` |
| 18 | `dunning_final` | `downgraded` | retry attempt returns MANDATE_INVALID |
| 19 | `paused` | `paused_from_state` (default `active`) | DSA hits `POST /api/billing/subscription/resume`; resumes to the state they were in pre-pause (so dunning escalation continues from where it stopped); `next_charge_at` set to today for `active`, recomputed from `dunning_started_at` for dunning states; clears `paused_from_state` |
| 20 | `paused` | `cancelled` | DSA hits cancel while paused (rare path; immediate cancel since no active cycle to wait for) |
| 20a | `paused` | `cancelled` | 90-day pause auto-cancel cron (locked 2026-05-25); reminder email at day 60; mandate revoked at provider |
| 21 | `downgraded` | `pending_mandate` | DSA re-subscribes (via S2 mandate registration; creates fresh `mandate_token`) |
| 22 | `cancelled` | `pending_mandate` | DSA re-subscribes after cancellation; same path as #21 |

**Illegal transitions** (helper throws):
- Any `pending_mandate → dunning_*` / `paused → dunning_*` / `cancelled → active` (must go via re-subscribe path)
- Any `downgraded → active` without going through `pending_mandate` first (mandate is dead; can't skip authorization)
- Any backward dunning transition (`dunning_grace → dunning_t0`, etc.)

### 3.3 Provider-independent failure codes

Each provider returns its own error vocabulary. We normalize at the boundary so the state machine and dunning logic are provider-agnostic:

| Our code | Razorpay error | Yes Bank error | State machine effect |
|---|---|---|---|
| `INSUFFICIENT_FUNDS` | `BAD_REQUEST_ERROR` + `Insufficient balance` | NPCI return code Y2/Y3 | → `dunning_t0`, retry per S4 |
| `MANDATE_INVALID` | `GATEWAY_ERROR` + mandate-revoked variant | NPCI return code Z1/Z2 | → `downgraded` (skip dunning) |
| `BANK_DECLINED` | various | NPCI return code Y* | → `dunning_t0`, retry per S4 |
| `PROVIDER_TIMEOUT` | network timeout | network timeout | → pending — reconcile cron resolves |
| `UNKNOWN` | anything not classified | anything not classified | → operator alert + manual review |

Translation tables live in each provider's implementation file. New provider = new translation table; everything else unchanged.

---

## 4. The 8 slices

Each ships as its own PR. Sequenced so each can be smoke-tested before the next begins.

### S1 — Subscription state model + test driver (1.5 days)

**Files**: new `src/lib/server/billing/subscriptionState.ts`, extended type in `src/lib/types/subscription.ts`, migration helper for existing one-time-paid users (no schema change — just populate the new fields with `not_subscribed` until they re-subscribe). Also: new `src/lib/server/billing/providers/mock.ts` (`MockProvider` for tests), and new `src/routes/api/test/billing/simulate-event/+server.ts` (R11 test driver — gated on `import { dev } from '$app/environment'` per §6).

**Tests**: every legal transition (✅) from §3.2.1 transition table, every illegal transition (throws), state history append-only, idempotent re-application of the same transition. **MockProvider contract tests** (per critique MISS-2) — the mock must behave like Razorpay's sandbox so tests written against it don't break when hitting real sandbox; assert contract conformance for all `BillingProvider` interface methods including failure code translation (§3.3).

**Acceptance**: existing `subscription` documents continue to work unchanged (back-compat verified by E2E driver smoke). MockProvider passes the same contract test suite that S2 will run against Razorpay sandbox.

### S2 — Mandate registration flow (1.5 days)

**Provider-side**: `BillingProvider.registerMandate()` implemented for the v1 leaf (Razorpay per ADR-0014). Calls Razorpay's recurring-tokens / mandate-creation API with **`verification_charge_paise: 100`** (the ₹1 auth-then-refund pattern per §11.1) and returns the authorization URL the DSA visits to complete bank-side auth. The ₹1 is refunded on `mandate.authorized` webhook (see §11.1 step 2).

**Subscribe modal copy (locked 2026-05-25 — disclose-the-₹1 decision)**: the modal MUST include this disclosure verbatim or equivalent: *"Your bank may show a ₹1 debit and ₹1 refund — that's the standard authorization step for recurring payments. No money is moved."* Without this, DSAs see the ₹1 line on their statement, don't recognize it, and open support tickets ("what is this charge?"). Disclosure-in-modal is cheaper than support load.

**Anchor assignment** (per §11 Q2): when the subscribe endpoint is hit, server computes `assigned_anchor = nearestFutureAnchor(now, [1, 5, 10, 15, 20, 25])`. This value is stored on the subscription doc as `anchor_day` (1-25) and is the `cycle_anchor_day` for all future debits. The first `next_charge_at` is set to the first occurrence of `anchor_day` at or after now. The DSA has full product access from subscribe time (state = `active`) but no debit fires until `next_charge_at`. Average free-access window 2.5 days, range 1-6.

**Our side**:
- `POST /api/billing/subscribe-recurring` — `requireRoleApi('dsa')` + CSRF + rate-limit 5/hr/user. Computes `assigned_anchor`, calls `provider.registerMandate({..., verification_charge_paise: 100})`, sets state to `pending_mandate` with 24h TTL, returns `authorization_url` + `assigned_anchor` + `first_charge_at` for client redirect / disclosure.
- `POST /api/billing/webhook/[provider]` — provider-specific HMAC-verified webhook endpoint. Calls `provider.parseWebhookEvent()` then dispatches to a shared handler. On `mandate.authorized` → transition to `active`, set `next_charge_at`. Idempotent by `provider_event_id` via `processedWebhookEvents` collection (**18-month TTL** for DR scenarios — bumped from 90d per critique P3-3).
- **Pending re-subscribe policy** (per critique P1-2; covers transition #4 in §3.2.1): if DSA re-clicks Subscribe while in `pending_mandate`, the endpoint first calls `provider.queryMandateStatus(existing_token)`. If still pending, return **409 Conflict** with "complete the prior authorization or wait for it to expire". If provider says expired/revoked, overwrite the token, emit a `pending_mandate.replaced` audit row, and proceed. Prevents two concurrent mandate tokens for the same DSA.
- **Pending cleanup cron** (new): `/api/cron/billing-pending-cleanup` runs every 4h, scans subscriptions in `pending_mandate` older than 24h, transitions to `not_subscribed` (transition #3 in §3.2.1).
- UI change on Billing page: subscribe CTA opens hosted authorization flow; on return shows "Mandate authorization complete — your subscription is active." Page **polls** `GET /api/billing/subscription/status` for up to 60s if the webhook hasn't arrived by the time the user returns (handles slow webhook delivery without leaving the user staring at a stale screen).

**Tests**: webhook signature verification (positive + negative); idempotent re-application; pending_mandate auto-expiry after 24h via cleanup cron; pending re-subscribe returns 409 when prior is still live; pending re-subscribe overwrites when prior is expired.

**Acceptance**: end-to-end in Razorpay test mode — subscribe → authorize mandate → state goes `not_subscribed → pending_mandate → active`. Also: abandon authorization → cleanup cron after 24h transitions to `not_subscribed`. Also: re-click Subscribe within 24h → 409 (verify error UX).

### S2.5 — Capacitor mandate-auth bridge (Android) (0.5 day, per critique P1-11)

The platform ships Capacitor 7 Android per CLAUDE.md §7. Hosted authorization pages (Razorpay's checkout / mandate-auth) need to either open in the in-app WebView with deep-link return, or open in the system browser via Custom Tabs.

**Approach**: open in system browser using `@capacitor/browser` plugin. Return path via a custom URL scheme (`digitaldsa://billing/auth-return?status=...`) configured in `capacitor.config.ts`. On return, the app routes back to the Billing page and triggers the same status polling described in S2.

**Files**: `capacitor.config.ts` (add intent filter + URL scheme), `src/lib/utils/billingAuthReturn.ts` (deep-link handler), `src/routes/(app)/dashboard/billing/+page.svelte` (platform-detect + branch).

**Fallback**: if user kills the system browser without completing, the standard `pending_mandate` 24h TTL + cleanup cron handles cleanup. No special handling needed beyond surfacing "We didn't see your authorization complete — try again or wait for the email confirmation."

**Tests**: deep-link parse; platform-detect branch (Capacitor vs web); fallback path.

**Acceptance**: smoke on Android emulator — Subscribe → Custom Tab opens → complete auth → deep-link returns to Billing page → state shows active.

### S3 — Renewal cron, happy path (2 days)

**Cron**: `/api/cron/billing-charge` — `x-cron-secret` gated, runs daily at 02:00 IST = 20:30 UTC prior day. Schedule via existing cron pattern (matches `data2-revoke-sweep`, `data4-analytics-etl`). On non-anchor days (e.g. the 3rd, 7th) the cron still runs but finds zero eligible subscriptions; this is intentional — cheaper to always-run-and-filter than to maintain per-anchor cron schedules. Real billing waves on the 1st, 5th, 10th, 15th, 20th, 25th (per §11 Q2).

**Logic** (per subscription where `state = 'active' AND next_charge_at <= now`):
1. Acquire global lock on `cronLocks` (TTL 30 min) — prevents double-run if two regions invoke
2. Per-subscription advisory lock (in case S6 pause hits mid-batch)
3. Generate fresh `attempt_id` UUID
4. **Two-phase persist**: write `ChargeAttempts` row with status `pending` BEFORE calling provider
5. Call `provider.chargeMandate({ mandate_token, amount_paise, attempt_id, description })`
6. On success: update attempt to `succeeded`, write `BillingTransaction`, extend `next_charge_at` by one cycle, emit invoice generation hook for D.2, **send charge-confirmation email** ("Your subscription was renewed — ₹X charged. View invoice." — per critique P3-1; cheap to add now, expensive to retrofit; silent debits surprise users → support tickets)
7. On failure: update attempt to `failed`, normalize error code, transition state per §3.3

**Batch size**: 100 subscriptions per cron tick (configurable). Concurrency: 5 parallel per batch (don't hammer the provider).

**Pre-charge reminder email (locked 2026-05-25)**: a separate cron `/api/cron/billing-charge-reminder` runs daily 02:30 IST. For each subscription where `state = 'active' AND next_charge_at` is within the next 3-4 days, send email *"Reminder: ₹X will debit from your account on ‹anchor date› for your DigitalDSA Pro subscription."* Reduces failed-debit rate (DSA tops up if low balance) and reduces "unexpected debit" support tickets. Email dedupe key on subscription_id + cycle to prevent double-sends on cron re-runs.

**Tests**: idempotent re-run (same `attempt_id` rejected by provider); crash mid-batch leaves a clean restart point; timezone correctness across month boundaries (Feb 28, Apr 30, etc.).

**Acceptance**: in provider's test mode, manually advance `next_charge_at`, run cron, observe `BillingTransaction` row + state stays `active` + `next_charge_at` extended.

### S4 — Retry state machine (1.5 days)

On `charge.failed` event (whether from cron's direct call or async webhook):
1. Increment `failed_attempt_count`
2. Transition state per failure code:
   - `MANDATE_INVALID` → `downgraded` (skip retries; mandate is dead)
   - `INSUFFICIENT_FUNDS` / `BANK_DECLINED` / other retryable → `dunning_t0`, schedule next attempt at `now + 1d`
3. Retry schedule (matches Razorpay's smart-retry timing pattern observed publicly):
   - Attempt 1 (original): t+0
   - Attempt 2: t+1d
   - Attempt 3: t+3d
   - Attempt 4: t+5d (final retry — after this, S5 advances to dunning_grace if still failing)
4. Each retry is a fresh `attempt_id` (idempotent on Razorpay/Yes Bank side too)
5. Retry succeeds → transition `dunning_* → active`, reset `failed_attempt_count`, clear `dunning_started_at`, **send recovery email** ("Your payment went through — thanks!")

**Tests**: state-machine table-driven tests for every (current_state, event, failure_code) → next_state combination.

**Acceptance**: in provider's test mode, force a failure → verify retries fire at t+1, t+3, t+5 → force success on day 3 → verify recovery email + state back to `active`.

### S5 — Failure escalation / dunning (2 days, folds in D.4)

Cron `/api/cron/billing-dunning-advance` (separate from charge cron, runs 03:00 IST daily):

**"Day N" definition** (per critique P1-10): `N = floor((now - first_failure_at) / 24h)` evaluated in **IST**. No business-day calculation; weekends and holidays count as normal days. The `first_failure_at` is captured when the first `dunning_t0` transition fires; it does NOT reset on retry attempts within dunning (only resets on successful recovery back to `active`).

For each subscription in `dunning_*`:
- `dunning_t0` and `days_since_failure ≥ 3` → `dunning_grace`, send email "Still can't process payment — 4 days of access left"
- `dunning_grace` and `days_since_failure ≥ 7` → `dunning_final`, send email "Access ends tomorrow"
- `dunning_final` and `days_since_failure ≥ 8` → `downgraded`, send email "Downgraded — resubscribe anytime", revoke pro features (D.6 fence enforces this on next case-create attempt)

In-app banner (rendered by `+layout.svelte` for DSAs in any `dunning_*` state): "⚠ Your last payment failed. Update your payment method to keep access. [Update] [Retry now]". **Banner is persistent until resolved** (locked 2026-05-25 — DSA can't dismiss; resolves only when retry succeeds OR they pause/cancel). The "Retry now" button (locked 2026-05-25) calls a new endpoint:

- `POST /api/billing/subscription/retry-now` — `requireRoleApi('dsa')` + CSRF + rate-limit **3/hr/user**. Validates `state IN ('dunning_t0', 'dunning_grace', 'dunning_final')` (404 otherwise). Triggers the same charge logic as the renewal cron (two-phase persist + `provider.chargeMandate`). On success: standard `dunning_* → active` transition + recovery email + clear banner. On fail: increment `failed_attempt_count`, but DO NOT advance dunning state (manual retries are bonus attempts, not replacements for the cron schedule). Improves recovery rate when DSA fixes their bank issue and wants to recover immediately.

Email templates: 4 separate templates per state, in en/hi/mr (i18n deferred to Epic H per project convention). **Our emails are sent in addition to Razorpay's own failed-payment notification** (locked 2026-05-25 — Razorpay's may not deliver or land in spam; the failure email is the most important one in the funnel, we don't depend on a third party for it). Both emails will reach the DSA — accepted tradeoff for reliability.

**Tests**: state advancement under accelerated clock fixture; recovery resets dunning_state and clears banner; downgrade revokes case-creation access.

**Acceptance**: synthetic failure → manually advance time via cron → verify state walks t0 → grace → final → downgraded with correct emails at each step.

### S6 — Pause / Resume / Cancel / Update payment method / Change plan (2 days)

**Endpoints**:
- `POST /api/billing/subscription/pause` — DSA-initiated. From `active` → transitions to `paused`; cancels scheduled `next_charge_at`. **From `dunning_t0`/`dunning_grace`/`dunning_final`** (locked 2026-05-25): transitions to `paused` but records `paused_from_state` on the subscription doc AND preserves `dunning_started_at` + `failed_attempt_count`. While paused, dunning-advance cron skips the row (no day-counting). Mandate stays alive at provider. **90-day auto-cancel** (locked 2026-05-25): after 90 days in `paused`, system auto-transitions to `cancelled` with reminder email at day 60 ("paused 60d, will auto-cancel in 30d unless you resume"). Prevents zombie subs.
- `POST /api/billing/subscription/resume` — `paused → {paused_from_state || 'active'}`. If `paused_from_state` is a dunning state, DSA returns to that dunning state with the SAME `dunning_started_at` (so the dunning escalation clock continues from where it stopped). `next_charge_at` is set to today for `active`, or recomputed from `dunning_started_at` for dunning states. Clears `paused_from_state`.
- `POST /api/billing/subscription/cancel` — sets a `cancel_at_cycle_end` flag; at next `next_charge_at` the cron skips the charge and transitions to `cancelled`. Mandate is revoked at provider via `provider.queryMandateStatus()` → operator action.
- **`POST /api/billing/subscription/update-payment-method`** (added per critique P1-3 — risk R6 referenced this flow but it had no slice). DSA-initiated; acquires the same advisory lock R6 references (5-min TTL); calls `provider.registerMandate()` for a replacement mandate against the same `plan_id`; on `mandate.authorized` webhook the old mandate is revoked at provider and the subscription's `mandate_token` is replaced with the new one in a single atomic write. Subscription stays in whatever state it was in (active / dunning_t0 / etc.) throughout. If the new mandate authorization is abandoned (24h TTL), the old mandate stays in force (no degradation).
- **`POST /api/billing/subscription/change-plan`** (per R8 v1 policy decision 2026-05-25). Body: `{new_plan_id, change_kind: 'upgrade' | 'downgrade'}`. Server validates the kind against current `plan_id` (caller can't trick a downgrade into an upgrade). For UPGRADE: atomically flip `plan_id` to the new tier (DSA gets immediate access change), keep existing `anchor_day` + `next_charge_at`, audit-log the change. Mandate's `max_amount_paise` is re-checked against new tier's monthly × 1.5 (§11 Q3) — if the new tier's required cap exceeds the existing mandate's cap, response is `409 Conflict {needs_remandate: true}` and UI prompts re-mandate via update-payment-method first. For DOWNGRADE: stamp `pending_downgrade_to: <plan_id>` on the subscription; the next cron-tick at anchor flips `plan_id` to the new tier BEFORE computing the charge amount, then clears the flag.

All five: `requireRoleApi('dsa')` + CSRF + rate-limit 10/hr/user (more lenient than subscribe — these are legitimate DSA actions, not abuse vectors).

**UI**: "Manage subscription" panel on Billing page is the central DSA-facing billing surface. Tabs/sections (locked 2026-05-25 — transaction history folded in here per critique MISS-3 decision):

1. **Subscription** — current plan, next charge date+amount, status badge, anchor day. Pause / Resume / Cancel / **Update payment method** / **Change plan** buttons with confirmation modals (ConfirmModal pattern from Pitfall #47). Change-plan modal shows "Upgrade — instant access, next charge on `<next anchor>` at new tier" or "Downgrade — current tier through next anchor (`<date>`), then `<new tier>`" so the asymmetric handling is transparent.
2. **Transaction history** (NEW per MISS-3) — paginated table of `BillingTransaction` rows for this DSA: date, amount, status (succeeded/failed/refunded), invoice link (D.2), refund link if applicable (D.3). Filters by date range + status. ₹1 verification rows hidden by default (toggle "Show authorization charges" reveals them). Covers v1 transaction-history needs without a dedicated slice.
3. **Payment method** — current mandate summary (bank, last-4, status); Update Payment Method button (same as in Subscription tab).

Update-payment-method opens the same hosted auth flow as Subscribe (incl. S2.5 Capacitor bridge).

**Tests**: state transitions; "cancel takes effect at cycle end" semantics (DSA cancels on day 5 of cycle → access continues until next anchor → state goes cancelled then); concurrent operations (cancel while cron is mid-charge — advisory lock prevents); update-payment-method while cron is mid-charge (advisory lock makes cron skip; cron picks up next tick); update-payment-method abandonment leaves old mandate intact; **upgrade flips plan immediately + preserves anchor + gifts days till next anchor; downgrade defers to next anchor**; upgrade across tiers that exceed existing mandate cap returns 409 with re-mandate prompt.

**Acceptance**: DSA pauses → no charge fires next cycle; DSA resumes → next charge fires today; DSA cancels → access continues to cycle end then downgrades.

### S7 — Reconciliation (1.5 days, folds in D.5)

Cron `/api/cron/billing-reconcile` runs daily at 04:00 IST (after the previous day's settlements have posted at the provider).

**Settlement window definition** (per critique P1-8): "prior day" = prior **IST calendar day** [00:00:00.000 IST – 23:59:59.999 IST]. Fetch the provider's settlement reports that fall within this window. Razorpay's settlement batch closes at ~23:30 IST; verify the actual cutoff during S7 build and adjust the cron schedule if needed so we never reconcile against an open batch.

**Logic**:
1. Fetch provider's settlement report for prior IST day (`provider.fetchSettlements(istDate)` — new method, provider-specific)
2. For each settled payment: find matching `BillingTransaction` by `provider_payment_id`
3. Flag any of:
   - Provider says settled, we don't have a transaction → **missing-our-side** (most concerning)
   - We have a transaction, provider doesn't show it settled → **missing-provider-side** (likely timing)
   - Amount mismatch → **amount-mismatch** (concerning)
4. Special-case the ₹1 auth-then-refund pairs (§11.1): match the debit row to its refund row in the same window; flag any unmatched ₹1 debit > 1h old (refund failed at provider — operator alert)
5. Write `ReconciliationRuns` row with counts + per-discrepancy detail
6. Email admin if any drift > 0

**Admin view**: `/dashboard/admin/billing/reconciliation` — paginated table of daily runs with drill-down.

**Tests**: matching logic with synthetic settlement data; timezone handling (settlement date vs our created_at — settle on IST calendar day); refund handling (refund in settlement → matched against refund record, not original); ₹1 auth-pair matching.

**Acceptance**:
1. Backfill 7 days of synthetic settlements → verify all matched.
2. Introduce a deliberate gap → verify the gap is flagged in admin view.
3. **Kill-switch dry-run** (per critique P3-4) — execute the §8 Path 2 → Path 1 revert procedure against staging; full revert in <2h verified end-to-end (otherwise the §8 "1-2 days" estimate is hopeful, not measured).

### S8 — Existing-user migration (1 day)

**⛔ SKIPPED 2026-05-28** — owner confirmed there is no real legacy cohort. The S8 detection filter (`state='active' AND mandate_token IS NULL`) would have matched zero rows anyway: legacy one-time-paid users lived on `DsaApplications.subscription`, not on `BillingSubscriptions`, and no bulk-migration step ever populated the new collection at `state='active'`. Instead of building reminder/grace/downgrade machinery for an empty population, the slice was replaced with a small cleanup pass:

1. **Archive 3 legacy code paths** to SvelteKit-private `_archived/` folders so they no longer route: `api/billing/subscribe`, `api/billing/cancel`, `api/cron/billing-trial-reminder`.
2. **Migrate 5 active legacy reads** from `DsaApplications.subscription` → `BillingSubscriptions.plan_id` via new `src/lib/server/billing/planResolver.ts`: the subscription gates in `evaluate-and-persist` + `rule-engine/evaluate`, the case-limit gate in `evaluate-and-persist`, and the tier reads in `da-quota` + `da-topup`.
3. **Wipe `DsaApplications.subscription`** in every environment via `scripts/d1-s8-skip-legacy-cleanup.mjs` (idempotent, `--dry-run` flag).
4. **Stamp `archived_at`** on every legacy `BillingTransactions` row (kind: 'legacy_one_time' or no kind). Rows retained on disk for 6-year audit compliance; filtered out of the new transactions UI.
5. **Simplify the billing dashboard** — `+page.server.ts` reduced to auth-only; `+page.svelte` now composed of the existing `SubscribeRecurringSection` + `ManageSubscriptionPanel` self-fetching components plus a trust strip (RBI-compliant auto-pay / no card storage / cancel-or-pause).

If a future cohort ever needs migration (e.g. new one-time-pay tier introduced as a different product), S8 can be built then against concrete requirements rather than speculatively.

— *Original S8 spec below preserved for reference:*

**Detection**: subscription where `state = 'active' BUT mandate_token IS NULL` → legacy one-time-paid user. Cron flags them.

**Trigger**: when `expires_at - now < 7 days`, the Billing page swaps the CTA from "Pay now" (one-time) to "Set up auto-pay" (mandate registration via S2).

**Email reminder**: 7 days before expiry, send "Set up auto-pay so your access doesn't lapse." Second reminder at expires_at - 1d if still no mandate.

**Post-expiry behavior** (locked 2026-05-25 — owner picked grace over immediate downgrade): at `expires_at`, if no mandate is set up, set `grace_until = expires_at + 3 days` and keep `state = 'active'` (with a `grace_period: true` flag for UI). Send "Your subscription expired — you have 3 days to set up auto-pay before access ends." During grace, Billing page shows a prominent banner; the standard "Update payment method" / "Set up auto-pay" CTAs remain visible. At `grace_until`, if still no mandate, transition to `downgraded` (standard S5 terminal). DSA can resubscribe any time.

**Tests**: legacy detection; CTA swap at threshold; reminder email fired exactly once per cycle; grace-period UI shown for [expires_at, grace_until]; downgrade fires at grace_until if no mandate.

**Acceptance**: create a legacy `active` subscription with `expires_at = now + 5d`, no mandate → verify Billing page shows new CTA + reminder email queued.

---

### S8 addendum — Free trial (added 2026-05-28)

**Status**: ✅ Shipped 2026-05-28 alongside the S8-skip cleanup.

After the S8 retirement, the owner asked for a **30-day free trial** for every new DSA. This slot in the spec captures the design; deeper rationale lives in [`ADR-0018`](../adr/0018-trial-abuse-defense-via-identifier-hashing.md).

**Shape** (Option A — Stripe-style "free trial, mandate required"):
- DSA picks "Start 30-day free trial" → server checks eligibility → if eligible, registers the recurring mandate normally (₹1 verification fires) → trial is live
- `next_charge_at` is set to `now + 30d` (instead of the standard next-anchor calculation)
- `trial_until = next_charge_at` and `is_trial = true` on the sub doc
- Charge cron fires the first real charge on day 30 — same code path as a regular renewal, no new cron
- DSA can cancel any time during the 30 days → `cancel_at_cycle_end = true` → cron sees this at day 30 and transitions to `cancelled` with NO charge

**Plan**: Trial is **always Pro tier** (locked 2026-05-28). The DSA can change plans during the trial via the existing change-plan flow (S6 M4); downgrade applies at trial-end, upgrade is subject to mandate-cap check (NEEDS_REMANDATE if Enterprise exceeds the Pro × 1.5 cap).

**Eligibility** (one-trial-per-DSA — ADR-0018):
- New `TrialIdentifierBlocklist` collection stores SHA-256(value || `TRIAL_PEPPER`) for mobile / PAN / GST / **device-id** (added 2026-05-28 amendment) of every DSA who's claimed a trial
- Eligibility check matches all 4 hashes; ANY match → ineligible. Order: PII first (mobile → PAN → GST), device last (additional "lazy abuser" layer)
- PAN required (else the gate is too weak); GST + device-id optional (gate degrades gracefully if absent)
- Device-id is a stable per-device UUID held in `localStorage` (web) / WebView storage (Capacitor mobile); reset on cookie-clear / incognito / factory reset — strictly weaker than PII identifiers but catches the same-device-new-PAN abuse pattern
- Admin override at `POST /api/admin/billing/grant-trial` stamps `revoked_at` on matching mobile/PAN/GST rows (audit-logged); device row stays unless admin runs the override twice
- **Retention is INDEFINITE — no TTL on the collection.** One-trial-per-DSA is a forever rule. Hashes are tiny so storage cost is negligible even at long-term scale. Diverges from `BillingTransactions` / `BillingAuditLogs` (6-year retention) because the blocklist is a gating mechanism, not a financial record.

**Email**: The existing pre-charge reminder cron (T-4 days before `next_charge_at`) sends a **trial-end variant** when `is_trial === true` — "Your trial ends on X — ₹Y will be charged. Cancel anytime before then." Implementation in `reminderEngine.ts`'s `sendReminderForSubscription` (single branch, two templates).

**UI**:
- `SubscribeRecurringSection` shows EITHER a trial CTA (when `trial_eligible: true`) OR the standard plan picker with a friendly returning-customer note (option (b) — transparent: "Free trials are once-per-DSA. Pick a plan to continue.")
- `ManageSubscriptionPanel` shows a primary-tone "Free trial — N days remaining" banner while `is_trial: true` and `trial_until > now`
- Disclosure modal copy adapts based on `modalForTrial`

**On trial-end charge success**: `chargeEngine.handleSuccess` `$unset`s `is_trial` + `trial_until` so the banner clears and downstream consumers see a normal paid sub. Blocklist rows persist — that's the gate's point.

**Files**:
- new `src/lib/server/billing/trialEligibility.ts` (+ tests)
- new `src/lib/utils/deviceId.ts` — client UUID utility (web + Capacitor WebView)
- new `src/routes/api/admin/billing/grant-trial/+server.ts`
- new `docs/adr/0018-trial-abuse-defense-via-identifier-hashing.md`
- extended: `BillingSubscriptionDoc` (`trial_until?`, `is_trial?`, `pending_device_id_hash?`), `TrialIdentifierBlocklistDoc` (new — `identifier_kind` union extended to include `'device'`), `mongo.ts` (collection + 2 indexes), `subscribeStore.createOrRefreshPending` (`is_trial` + `pending_device_id_hash` flags), webhook handler (record blocklist with device hash + set trial fields), `chargeEngine.handleSuccess` (clear trial flags), `subscription/status` (surface trial fields + eligibility), `subscribe-recurring` (eligibility check + plan force + 30d offset + device-id hash persistence), `SubscribeRecurringSection.svelte` (CTA branch + friendly note + device-specific copy + sends `device_id`), `ManageSubscriptionPanel.svelte` (trial banner), `reminderEngine` (trial-end email template)

---

## 5. Risk register (14 attended-to risks)

| # | Risk | Likelihood | Impact | Mitigation (built-in to slices above) |
|---|---|---|---|---|
| **R1** | Charge succeeds at provider but our DB write fails | Medium | DSA charged, our state says unpaid | **Two-phase persist** (S3): `ChargeAttempts` row written BEFORE provider call; reconcile cron (S7) catches stuck-pending |
| **R2** | Cron crashes mid-batch | Medium | Partial billing | Each subscription is its own atomic operation; cron re-run picks up where it stopped via `last_attempted_at` check |
| **R3** | DSA's mandate revoked at bank but we keep trying to charge | High over time | Wasted attempts, confusing dunning | Failure code `MANDATE_INVALID` (§3.3) → skip dunning, straight to `downgraded` + audit |
| **R4** | Webhook arrives before our charge response | Low | State machine confused | Webhook is authoritative; charge-response handler sees state already moved forward, no-ops |
| **R5** | Bank reverses a "successful" charge days later | Low | DSA's access extended without payment | Reconcile cron (S7) catches "extended without settled payment" pair, flags for admin |
| **R6** | Retry fires while DSA is updating card | Medium | Confusing UX, possible double-charge | Card-update flow holds advisory lock (5min); cron skips locked subscriptions (S3) |
| **R7** | Timezone bug at month boundaries | Medium first month | Cycles drift or fire twice | All `next_charge_at` math in IST; off-by-one tests for Feb 28/29, Apr 30, Dec 31 (S3 tests) |
| **R8** | DSA changes plan mid-cycle | Medium | Pro-ration unclear | **Policy (locked 2026-05-25 per critique P1-4):** Asymmetric handling — UPGRADE = immediate access to new tier + days remaining until next anchor are **gifted** (no proration math; max 5-6 days of free tier-difference; consistent with the initial subscribe free-access pattern §11 Q2). Current cycle's already-charged amount stays as-is (no refund of old tier). Next debit fires on the same anchor day at the NEW tier's rate. DOWNGRADE = takes effect at next anchor (DSA keeps higher tier through current cycle ~30 days; generous). No proration code in either direction — keeps S6 simple and UX consistent with the anchor model. |
| **R9** | Concurrent operations (cancel during charge) | Low | Charge after cancel | Atomic `findOneAndUpdate` on state read+write; cancel sets `cancel_at_cycle_end` first; cron's atomic read sees the flag |
| **R10** | Invoice numbering gap (legal violation) | Low if right; catastrophic if not | GST audit failure | Gapless counter via atomic `findOneAndUpdate({_id:'fy_2026'}, {$inc:{value:1}})`; issued AFTER charge succeeds (D.2); reconcile (S7) cross-checks invoice count vs charge count |
| **R10b** | GST credit-note numbering gap for refunds (per critique P1-9) | Low if right; catastrophic if not | GST audit failure | Same atomic gapless-counter pattern, **separate counter doc** `{_id: 'cn_fy_2026'}`; credit note issued AFTER refund succeeds at provider (D.3); reconcile (S7) cross-checks credit-note count vs refund count |
| **R11** | Test mode parity — can't simulate every failure | High during dev | Bugs survive to prod | Build `/api/test/billing/simulate-event` (gated on **`import { dev } from '$app/environment'`** — NOT `process.env.NODE_ENV`, which is truthy on Vercel preview deploys per critique P1-7; `is_test:true` stamp); fires synthetic events to drive state machine. **Owned by S1** (must exist before S3 can be tested). |
| **R12** | RBI/NPCI compliance on mandate language | Medium (regulatory) | Legal exposure | Mandate registration must declare max-amount per Q3, frequency, duration; subscribe screen shows same disclosure; legal review checklist as S2 acceptance gate |
| **R13** | Refund-after-cancel edge case | Medium | Logic gap | D.3 explicitly handles refunds against any state including `cancelled`; BillingTransaction is independent of subscription state |
| **R14** | Operator runs cron twice (region duplicate) | Low but possible | Double-charge | `cronLocks` collection — TTL **5 min** with **heartbeat extension every 60s** while cron is running (NOT a static 30 min TTL — per critique P1-6 a static 30 min holds the lock through a crash and stalls recovery); second invocation exits clean |
| **R15** | Dunning emails land in spam → silent downgrade | Medium until SEC-8 ships | Angry DSA + churn (they never saw the warning) | **SEC-8 (Nodemailer → SES + SPF/DKIM/DMARC) is bumped from "deferred until beta" to a HARD PREREQUISITE for D.1 launch.** Added 2026-05-25 per critique P1-5. Dunning emails sent from current Nodemailer config have a real chance of being filtered, defeating the entire dunning escalation. CLAUDE.md §8 production-blockers table updated in lockstep. |

Each risk has a regression test in the slice that introduces it (exception: R12 RBI compliance — process gate, not a regression test; documented in S2 acceptance checklist).

---

## 6. Security checklist

| Layer | Control |
|---|---|
| Webhook endpoint | HMAC-SHA256 via `provider.verifyWebhookSignature()`, constant-time compare, secret per-provider env var (`RAZORPAY_WEBHOOK_SECRET`) |
| Webhook idempotency | `provider_event_id` stored in `processedWebhookEvents` (**18-month TTL** for DR scenarios; bumped from 90d per critique P3-3); duplicates 200-no-op |
| Subscribe / pause / resume / cancel / update-payment-method | `requireRoleApi('dsa')` + CSRF (`secureFetch`) + rate-limit 5-10/hr/user |
| Refund (D.3) | `requireRoleApi('admin')` + `requireAdminPermission` + rate-limit + `writeAuditLog` (C.5) |
| Cron endpoints | `x-cron-secret` header gated; 403 on mismatch; matches existing pattern (`data2-revoke-sweep`, `data4-analytics-etl`) |
| Mandate token storage | Stored on subscription doc; **redacted from logs** via extension to `PII_ATTR_KEYS` in `src/lib/server/telemetry.ts` |
| PII in audit rows | `writeAuditLog` shape carries `dsa_id` only — no PAN, no card last-4, no email |
| Test endpoints | Gated on **`import { dev } from '$app/environment'`** (NOT `process.env.NODE_ENV` — Vercel preview deploys run in production mode but are not real production; per critique P1-7); returns `new Response(null, { status: 404 })` when `dev === false`. Fixtures stamped `is_test:true` per C.7. |
| Money-row retention | **6-year retention** in isolated `BillingAuditLogs` collection (§11 Q1 decision). PolicyAuditLogs stays at 2yr default TTL. |
| ₹1 verification charges | Stamped `is_test_auth: true` on `BillingTransaction` rows (and the matched refund). Revenue reports filter these out. Reconcile cron (S7) treats the debit+refund pair within 1h as no-real-money-movement. |
| Email deliverability | **SEC-8 (Nodemailer → SES + SPF/DKIM/DMARC) is a hard prerequisite for D.1 launch** (per critique P1-5 + R15). Dunning escalation depends on emails reaching the DSA's inbox; spam-filtered dunning emails = silent downgrade. |

---

## 7. Operator readiness — what "nothing unattended" means

| Observable | Threshold | Action |
|---|---|---|
| Cron failure / no-run | Daily charge cron didn't emit a `cron_run` audit row by 03:00 IST | Page operator (email to tech@digitaldsa.com) |
| Charge attempts → no provider response | >2% timeouts in a 1-hour window | Circuit breaker trips, cron pauses 30 min, page operator |
| Subscription stuck in `dunning_t0` >12h | Any | Daily audit-log scan + email summary |
| Reconcile drift | Any drift row in S7 | Red badge in admin Reconciliation view + daily summary email |
| Webhook signature mismatches | >0/day | Security alert (probe or misconfigured secret) |
| Cancel rate | >3× the 30-day baseline | Possible payment-rail issue; review last 24h failures |

Hooks into existing `logger` (Pino) + OTel (when enabled). No new monitoring stack needed.

A dedicated `docs/runbooks/BILLING-RUNBOOK.md` is produced as a deliverable of S3 — covers env vars, operator manual operations, incident response walkthroughs, disaster-recovery (full-state rebuild from provider's payment history).

---

## 8. Kill switch — Path 2 → Path 1 fallback

Critical to plan up front. If S3-S5 prove harder than estimated, we cleanly revert to Razorpay Subscriptions.

**Reversibility baked in**: the subscription document shape is **superset of what Razorpay Subscriptions needs**. Revert procedure:

1. Stop the renewal cron (`crontab.disable billing-charge`)
2. For each `active` subscription: call Razorpay's `subscriptions.create()` with the same plan_id + mandate_token already on the doc; store the returned `razorpay_subscription_id`
3. Razorpay takes over from the next cycle; our cron stays dormant
4. Webhook handler stays as-is (already handles Razorpay events; just enable the subscription-specific event types)

Estimated revert effort: **1-2 days** if reached after S5.

**Triggers for kill switch**:
- > 0.5% of charges in a 7-day window fail with operator-attention-required errors not covered by R1-R14
- Reconciliation drift > 3% sustained over 7 days
- Any RBI compliance advisory we can't comply with in our state machine

---

## 9. Yes Bank specifics

> **⚠️ Outcome (2026-05-25): NOT pursued for v1.** Yes Bank was evaluated as a candidate sponsor-bank rail for Path 3. The evaluation surfaced multiple soft disqualifiers (fee economics, onboarding timeline, R11 sandbox gaps, operational load including limited card-mandate support) — no single dealbreaker, but the net call was that Yes Bank is not the right v1 leaf. v1 ships `RazorpayProvider` per [ADR-0014](../adr/0014-billing-rail-provider-agnostic.md) "Yes Bank evaluation outcome". This section is preserved for posterity and for any future re-evaluation (ADR-0014 re-evaluation trigger #1).

### What's publicly confirmed (sources at end of section)

- **First bank in India** to launch API-based digital NACH onboarding for corporate clients
- **2-day mandate registration** via online authentication (vs 15-20 days paper-based)
- **PSP capability for UPI AutoPay** — powers 12 of 37 third-party UPI apps as Payee PSP
- **Fintech-pedigree partnerships**: Juspay HyperUPI, BharatPe Credit-on-UPI, PhonePe (original UPI launch)
- **API banking portal** with sandbox environment + developer credentials + go-live process
- Owner of digitaldsa already holds a corporate account at Yes Bank → KYC pre-cleared, established relationship for negotiating

### What's NOT publicly known (the 10-question RM agenda)

Below are the questions the owner should ask Yes Bank's corporate banking RM. Answers gate the provider decision in §2.

| # | Question | Why it matters |
|---|---|---|
| 1 | What's the per-transaction fee for eNACH debit origination? | Razorpay is 2%. Yes Bank's direct rate is likely ₹2-10 flat — core cost driver. |
| 2 | Is there a setup fee, and is it waivable for existing account holders? | Industry standard ₹50K-₹2L. As existing customer there's negotiating leverage. |
| 3 | What's the minimum monthly volume commitment? | Some sponsor banks require ₹50L+ GMV. v1 might fail this threshold. |
| 4 | Is UPI AutoPay merchant onboarding bundled with eNACH, or separate contract? | If bundled, both rails in one go. If separate, complexity doubles. |
| 5 | Realistic onboarding timeline — KYC + agreement + technical integration? | Technical 2 days. Business side could be 4 weeks to 3 months. |
| 6 | Do they handle chargeback/dispute/mandate-revocation flows, or do we? | Critical operational load question. Razorpay handles these end-to-end. |
| 7 | Is there API access for partial refunds + credit-note linkage? | D.2/D.3 dependencies. |
| 8 | Sandbox quality — can we drive synthetic mandate-authorized, charge-success, charge-failed, mandate-revoked events for testing? | R11 mitigation hinges on this. |
| 9 | What happens to existing mandates if we switch sponsor banks later? | Lock-in risk; Razorpay's mandates are migratable, should confirm Yes Bank's. |
| 10 | Does the eNACH product cover card mandates, or is that separate / not offered? | If Yes Bank skips cards, we still need a card provider — affects v1 scope. |

### Sources

- [YES BANK launches API-based NACH onboarding for corporate clients](https://thepaypers.com/payments/news/yes-bank-launches-api-based-nach-onboarding-for-corporate-clients)
- [YES BANK Introduces API-based Digital NACH On-boarding for Corporate Clients](https://www.dqindia.com/yes-bank-introduces-api-based-digital-nach-boarding-corporate-clients/)
- [Transform Your Business with our API Banking Solutions — Yes Bank](https://www.yes.bank.in/digital-banking/payment-solutions/api-banking)
- [Manage Your Recurring Merchant Transactions — Yes Bank](https://www.yes.bank.in/manage-recurring-merchant-transactions)
- [Yes Bank API — Corporate Banking & UPI Integration (FintegrationFS)](https://www.fintegrationfs.com/fintechapis/yes-bank-api)
- [Yes & Axis Bank: The banks powering India's UPI flywheel (The Painted Stork)](https://www.thepaintedstork.com/p/71-yes-and-axis-bank-the-banks-powering)
- [YES BANK partners with Juspay; launches HyperUPI (Elets BFSI)](https://bfsi.eletsonline.com/yes-bank-partners-with-juspay-launches-hyperupi-a-upi-based-plug-in-service/)
- [eNACH e-mandate for recurring payments — what is it & how it works (Mondaq India)](https://www.mondaq.com/india/financial-services/1613956/enach-e-mandate-for-recurring-payments-what-is-it-how-it-works)

---

## 10. Sequencing

```
Week 0:  ✅ Provider decision landed (Razorpay, 2026-05-25)
         Owner decisions on Q1-Q5 remaining lock-downs
         Spec sign-off (this doc, after P0 fixes from critique 2026-05-25)

Week 1:  S1 (state model)  → S2 (mandate registration, RazorpayProvider impl)
         Smoke: subscribe → mandate authorized → state=active

Week 2:  S3 (renewal cron) → S4 (retry state machine)
         Smoke: manual charge → succeeds; force-fail → retries fire at +1, +3, +5

Week 3:  S5 (dunning)      → S6 (pause/resume/cancel)
         Smoke: full lifecycle including DSA-initiated cancel + recovery

Week 4:  S7 (reconciliation) → S8 (existing-user migration)
         Smoke: prod-shape data dry-run; one volunteer DSA on the new rail
```

Each slice gates the next via manual smoke + reconcile-clean before progressing. If any slice surfaces something that breaks the model in S1, stop and reconsider (potentially kill-switch).

### 10.1 Pre-launch operator verification (one-time, before D.1 production traffic)

Items that don't fit a slice but MUST be verified before D.1 takes real customer money:

1. **RBI data-locality compliance** (per critique MISS-1) — RBI requires payment-related data stored within India. Verify the MongoDB Atlas cluster region is in India (Mumbai / Hyderabad / Chennai). Verify Razorpay's data residency contractually. Verify no provider PII (mandate_token, email, mobile) leaks to non-India regions via OTel exports, log aggregation, or backups. Document the verification in `docs/runbooks/BILLING-RUNBOOK.md`.
2. **SEC-8 email hardening** (per R15) — SES (or SendGrid/Resend) live; SPF + DKIM + DMARC records published for digitaldsa.com; inbox-delivery smoke against 3 major Indian email providers (Gmail, Outlook, Yahoo) confirms no spam.
3. **Razorpay live-mode webhook secret** + production endpoint URL configured in Razorpay dashboard, secret stored in Vercel env vars.
4. **Production cron secret** (`x-cron-secret`) rotated from test value.
5. **Operator runbook drill** — at least one operator has walked through `docs/runbooks/BILLING-RUNBOOK.md` end-to-end including kill-switch revert.

These are not slices but they ARE D.1 launch blockers. Track in DEVELOPMENT-PLAN's pre-launch checklist.

---

## 11. Lock-down questions (owner decisions required before code)

These touch policy, not just code. Need decisions before S3 starts.

> **All 6 lock-down questions DECIDED 2026-05-25.** Owner confirmed each in plain-English review. The table below records the final decisions; the original options + tradeoffs are preserved in [`docs/reviews/D1-SPEC-CRITIQUE-2026-05-25.md`](../reviews/D1-SPEC-CRITIQUE-2026-05-25.md) for posterity.

| # | Question | ✅ Decision (2026-05-25) | Bears on |
|---|---|---|---|
| **1** | Billing audit log location — isolated `BillingAuditLogs` collection vs co-located with `PolicyAuditLogs` (6-year retention identical either way; query-locality decision, not retention) | **Isolated `BillingAuditLogs` collection.** PolicyAuditLogs stays at 2yr default TTL. Admin tooling that needs full-DSA history queries both and stitches. Trades a small dev-time convenience for clean separation + TTL safety. | Every `writeAuditLog` call from S3 onward |
| **2** | Cycle anchoring — when do debits fire? | **Six concentrated anchors per month: 1st, 5th, 10th, 15th, 20th, 25th.** On subscribe, DSA is assigned to the **nearest future anchor**; days between subscribe-date and first anchor are **free access** (no debit, but full product access). From first anchor onward, debit fires on that same anchor day every cycle. Average free-access window ≈ 2.5 days (range 1-6). Cron load distributed across 6 buckets (~17% each). The 25th→next-1st gap varies 3-6 days by month length — acceptable. **Subscribe modal MUST disclose**: "Your first charge is on `<assigned anchor date>` — that's `<N>` days of free access until then." | RBI mandate language; S2 anchor assignment; S3 cron schedule; subscribe-modal copy |
| **3** | Per-debit max-amount cap on mandates — RBI sets a per-debit ceiling, not annual | **Monthly × 1.5.** For ₹3,999 Pro plan → cap = ₹5,998. Gives one price-increase headroom before re-mandate is required. Mandate-auth screen shows the ₹5,998 number, which is small enough not to spook DSAs at authorization time. | S2 mandate request; RBI per-debit disclosure |
| **4** | Trial period in v1 | **No trial.** Charge on first anchor (NOT day 0 — see Q2's free-access window which is operationally a 1-6 day deterministic trial). Real "marketing trial" (7+ days free with notification) deferred to Growth (Epic F). | S2 + S3 logic |
| **5** | Annual billing variant in v1 | **No annual plans in v1; monthly only.** Annual billing deferred to D.6 or later. If annual is added later it likely needs a separate mandate type (forces an `annual_mandate_token` on subscription doc + a separate cap), NOT a higher monthly cap that retroactively makes mandate-auth scarier for monthly subscribers. | S3 cycle math; D.6 pricing-fence annual toggle |
| **6** | Provider choice | **`RazorpayProvider` first** (per [ADR-0014](../adr/0014-billing-rail-provider-agnostic.md); Yes Bank not pursued for v1 — see §9 outcome banner). | S2 implementation locked to Razorpay |

### 11.1 Subscribe-time mandate verification

Razorpay's recurring-mandate setup requires a small verification charge during authorization. **Decision (2026-05-25): ₹1 auth-then-refund pattern.** At subscribe time:
1. `provider.registerMandate({..., verification_charge_paise: 100})` — Razorpay debits ₹1, returns mandate token.
2. On webhook `mandate.authorized`: immediately `provider.refundCharge(..., reason: 'mandate_verification')` — DSA sees both lines on their statement (industry-normal).
3. Subscription state transitions `pending_mandate → active` per §3.2.1 #2, with `next_charge_at` set to the assigned anchor (from §11 Q2).

The ₹1 auth charges are stamped `is_test_auth: true` on `BillingTransaction` rows so revenue reports don't double-count them. The refund row is similarly marked. Reconciliation cron (S7) treats these as a matched pair (₹1 debit + ₹1 refund within 1h = no real money movement).

**Subscribe modal must disclose the ₹1 line** to DSAs at subscribe time — see S2 "Subscribe modal copy" subsection. Without disclosure, the unexpected ₹1 entry on bank statements generates avoidable support tickets.

---

### 11.2 Owner decision log (16 additional policies locked 2026-05-25)

These touched UX / operational policy rather than architecture, but they were captured explicitly in plain-English review so future readers know *these were considered, not just defaulted*. Each is also threaded into the relevant slice/section above.

| # | Question | Decision | Lives in |
|---|---|---|---|
| 1 | Dunning total window (first-fail → downgrade) | **8 days** (day 0 / 3 / 7 / 8 escalation) | §4 S5 |
| 2 | Cancellation refund of unused cycle portion | **No refund** — access continues to next anchor, state goes cancelled then | §4 S6, R8 |
| 3 | Pause subscription duration cap | **90 days then auto-cancel**; reminder email at day 60 | §3.2.1 #20a, §4 S6 |
| 4 | `BANK_DECLINED` failure treatment | **Retry per S4 schedule** (t+1/t+3/t+5); most are transient | §3.3, §4 S4 |
| 5 | Manual "Retry now" button during dunning | **Yes** — DSA-initiated immediate retry, rate-limited 3/hr/user; doesn't advance dunning state on failure | §4 S5 |
| 6 | Dunning in-app banner dismissibility | **Persistent** until resolved (retry succeeds or DSA pauses/cancels) | §4 S5 |
| 7 | S8 legacy-user migration prompt window | **7 days** before expiry (CTA flip + email reminder) | §4 S8 |
| 8 | D.3 refund self-service vs admin-only | **Admin-only** for v1 (D.3 stays simple; clean audit trail; catches mistaken requests) | D.3 (downstream) |
| 9 | DSA transaction history UI location | **Folded into S6 Manage Subscription panel** as a tab | §4 S6 |
| 10 | Pricing-change communication policy | **Deferred** — decide when we actually change prices (not pre-deciding in v1) | (none — explicit defer) |
| 11 | Webhook delivery backup mechanism | **None — reconcile cron is enough** (S7 catches misses within 24h) | §4 S7 |
| 12 | Pause-from-dunning behavior | **Pause halts retries, dunning state persists.** Resume continues dunning from where it stopped via `paused_from_state` field | §3.2.1 #8a + #19, §4 S6 |
| 13 | ₹1 verification disclosure at subscribe | **Disclose in subscribe modal** verbatim ("Your bank may show a ₹1 debit and ₹1 refund — standard authorization step, no money is moved") | §4 S2, §11.1 |
| 14 | Pre-charge reminder email | **Yes** — 3 days before each debit, separate cron `/api/cron/billing-charge-reminder` | §4 S3 |
| 15 | Our failed-charge email vs Razorpay's only | **We send our own** in addition to Razorpay's — the failure email is too important to depend on a third party for deliverability | §4 S5 |
| 16 | Legacy user post-expiry behavior | **3-day grace period** post-expiry (state stays `active` with `grace_period: true` flag; downgrade at `grace_until` if no mandate set up) | §4 S8 |

---

## 12. References

- ADR-0014 — Recurring billing rail decision (this work)
- `docs/specs/POST-AUDIT-IMPLEMENTATION-MASTER-SPEC.md` §D.1 (original outline; this spec supersedes for D.1 architecture)
- `docs/CHANGELOG.md` — 2026-05-23 late-evening (Pitfall #47 billing UX) + 2026-05-23 night (this planning conversation)
- `src/lib/server/auditLog.ts` (C.5 shared helper, ships now → consumed by §6 here)
- `src/lib/config/billing-plans.ts` (existing PLANS structure, untouched by this spec)
- CLAUDE.md §13 AD-11 (no PII in PDF), §15 (apiOk/secureFetch/logger conventions)
