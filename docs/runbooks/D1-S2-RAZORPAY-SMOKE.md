# D.1 S2 — Razorpay Adapter Smoke-Test Runbook

**Purpose**: live-verify the RazorpayProvider implementation (`src/lib/server/billing/providers/razorpay.ts`) against Razorpay's test-mode sandbox **without going live**. Drives every code path that real S2 traffic will hit, in a controlled environment.

**Cost**: ₹0. Razorpay test mode is free; no real money moves. You can run this as many times as you need.

**Time**: ~15 min from setup to last verification.

---

## Prerequisites

### 1. Razorpay test-mode keys (already have these)

Confirm these env vars are set in `.env`:

```bash
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

These are the same keys the existing one-time-order code uses (`src/routes/api/billing/subscribe/+server.ts`). No change needed.

### 2. Razorpay webhook secret (NEW — must set up)

Steps in Razorpay Dashboard (test mode):

1. Log in at https://dashboard.razorpay.com — **switch to TEST MODE** (top-right toggle)
2. Go to **Settings → Webhooks → + Add New Webhook**
3. **URL**: leave a placeholder for now (we don't have an endpoint live yet — S2 build adds it). For this smoke test, use https://webhook.site (free) to capture payloads and verify signature manually, OR use ngrok to expose your local dev server.
4. **Active events**: enable these (D.1 spec §4 S2 + §3.1):
   - `token.confirmed`
   - `token.cancelled`
   - `subscription.charged`
   - `subscription.cancelled`
   - `payment.captured`
   - `payment.failed`
   - `refund.processed`
   - `settlement.processed`
5. **Secret**: Razorpay generates one. **COPY IT NOW** — only shown once.
6. Add to `.env`:
   ```bash
   RAZORPAY_WEBHOOK_SECRET=<the secret from step 5>
   ```
7. Restart dev server so SvelteKit picks up the new env var.

### 3. Optional — Atlas test user

If you want to test the full DSA-side flow including subscription doc storage, you need an authenticated DSA. Use:
- Mobile: `9811556664`
- OTP: `9811` (dev login per `MEMORY.md`)

---

## Test Plan

These tests progress from simplest (unit-level) to deepest (full integration). Stop after any test if you hit something unexpected.

### Test 1 — Unit-test re-run (sanity baseline)

```powershell
pnpm test:unit -- --run src/lib/testing/__tests__/billing/
```

**Expected**: all billing tests pass. **If this fails, stop** — something regressed before live testing makes sense.

### Test 2 — Constructor + env validation

In a Node REPL (or a one-off script `scripts/d1-smoke-1.mjs`):

```javascript
import { createBillingProvider } from './src/lib/server/billing/providerRegistry.js';
process.env.BILLING_PROVIDER = 'razorpay';
const provider = createBillingProvider();
console.log('name:', provider.name);  // expect: 'razorpay'
```

**Expected**: prints `name: razorpay` without throwing.

**Failure mode to watch for**: if it throws "missing env vars", check `.env` has all 3 (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).

### Test 3 — registerMandate creates a real Razorpay customer + registration link

⚠️ This call hits Razorpay's test API. It will create a real customer + invoice in your test-mode dashboard. Free, but visible.

```javascript
import { createBillingProvider } from './src/lib/server/billing/providerRegistry.js';
process.env.BILLING_PROVIDER = 'razorpay';
const provider = createBillingProvider();

const result = await provider.registerMandate({
  dsa_id: 'smoke_test_dsa_1',
  plan_id: 'pro',
  max_amount_paise: 599_800,  // ₹5,998 = monthly × 1.5 per §11 Q3
  frequency: 'monthly',
  customer_name: 'Smoke Test DSA',
  customer_email: 'smoke-test@digitaldsa.com',
  customer_mobile: '+919811556664'
});

console.log(result);
```

**Expected output shape**:
```json
{
  "pending_registration_id": "inv_xxxxxxxxxxxxxx",
  "customer_id": "cust_xxxxxxxxxxxxxx",
  "authorization_url": "https://rzp.io/i/xxxxxxxxxx",
  "expires_at": "2026-05-26T...Z"
}
```

**Cross-check in Razorpay dashboard**:
- Customers → should see "Smoke Test DSA"
- Invoices → should see one with type "link" and amount ₹1 (the verification charge)

**Failure modes**:
- "Unauthorized" → wrong keys
- "missing short_url" → Razorpay SDK returned an unexpected shape; check the SDK version + their docs
- Hanging > 30s → network or sandbox issue

### Test 4 — Complete mandate authorization in browser (the only manual step)

This is the part I cannot do for you — it requires browser interaction with Razorpay's hosted page.

1. Open the `authorization_url` from Test 3 in your browser.
2. You'll land on Razorpay's eNACH authorization page.
3. **Test bank**: select any bank (Razorpay test mode lets you select any without real auth).
4. **Test credentials**: use any test account number / name (Razorpay test mode accepts anything).
5. Complete authorization.
6. You'll be redirected to a "success" page.

**What happened server-side**:
- Razorpay fires the `token.confirmed` webhook to your webhook URL (currently webhook.site or ngrok).
- The webhook payload contains the `token.id` — THIS is what becomes `mandate_token` in our system.
- The ₹1 verification charge is automatically refunded by Razorpay (per the registration link's behavior).

**Cross-check**: in webhook.site / ngrok / Razorpay dashboard → Events, find the `token.confirmed` event. Note the `payload.token.entity.id` — copy it for Test 5.

### Test 5 — chargeMandate using the authorized token

⚠️ This will attempt a REAL test-mode charge. Free, but visible in dashboard.

```javascript
const charge = await provider.chargeMandate({
  mandate_token: 'token_xxxxxxxxxxxxxx',  // from Test 4 webhook
  amount_paise: 399_900,  // ₹3,999 = Pro monthly
  attempt_id: `smoke-test-${Date.now()}`,
  description: 'Smoke test recurring charge',
  customer_id: 'cust_xxxxxxxxxxxxxx',     // from Test 3
  customer_email: 'smoke-test@digitaldsa.com',
  customer_mobile: '+919811556664'
});

console.log(charge);
```

**Expected output**:
```json
{
  "status": "succeeded",   // or "pending" if eNACH async-settles
  "provider_payment_id": "pay_xxxxxxxxxxxxxx",
  "raw_response": { ... }
}
```

**Cross-check**: Razorpay dashboard → Payments → should see the ₹3,999 payment.

### Test 6 — Idempotency

Run Test 5 again with the SAME `attempt_id`. Razorpay should reject the duplicate order creation. Result should still be a deterministic outcome (not a duplicate charge).

**Expected**:
- The SECOND call's `orders.create` throws Razorpay's "duplicate receipt" error
- `chargeMandate` interprets this via `interpretRazorpayError` → returns `status: 'failed', failure_code: 'UNKNOWN'`
- **No second debit** in Razorpay dashboard

**This is a known sharp edge** — the spec says we should re-fetch the existing order + check if a payment exists for it, and return that. S3 cron build will refine.

### Test 7 — queryMandateStatus

```javascript
const status = await provider.queryMandateStatus('token_xxxxxxxxxxxxxx');
console.log(status);  // expect: 'active'
```

**Expected**: `active`. If you cancelled the mandate in dashboard between Test 4 and now, expect `revoked`.

### Test 8 — refundCharge

```javascript
const refund = await provider.refundCharge({
  provider_payment_id: 'pay_xxxxxxxxxxxxxx',  // from Test 5
  amount_paise: 399_900,  // full refund
  reason: 'smoke_test_cleanup',
  attempt_id: `refund-${Date.now()}`
});

console.log(refund);
```

**Expected**:
```json
{ "status": "succeeded", "provider_refund_id": "rfnd_xxxxxxxxxxxxxx", "raw_response": {...} }
```

**Cross-check**: Razorpay dashboard → Refunds → should see the refund.

### Test 9 — Webhook signature verification (real Razorpay payload)

Take a real webhook payload captured from webhook.site / ngrok:

```javascript
const provider = createBillingProvider();
const body = '<raw JSON string from webhook.site>';  // exact body
const signature = '<X-Razorpay-Signature header value>';

const valid = provider.verifyWebhookSignature(body, signature);
console.log('valid:', valid);  // expect: true
```

**Expected**: `true`.

**If false**: most likely `RAZORPAY_WEBHOOK_SECRET` in your .env doesn't match the secret in Razorpay dashboard. Re-copy from dashboard.

### Test 10 — parseWebhookEvent on real payload

```javascript
const body = JSON.parse('<raw JSON from webhook.site>');
const event = provider.parseWebhookEvent(body);
console.log(event);
```

**Expected**: a `NormalizedEvent` object with `event_type` mapped from Razorpay's name (e.g. `subscription.charged` → `charge.succeeded`).

---

## Cleanup

After smoke-testing, clean up in Razorpay dashboard:
- **Customers** → delete "Smoke Test DSA"
- **Subscriptions/Invoices** → cancel the test mandate
- **Webhook** → optional: delete it (or leave it for S2 build to use)

---

## Pass/Fail Criteria

D.1 S2 mechanical fills are verified working if **all 10 tests pass**.

If a test fails:
1. Save the error message + full Razorpay response
2. File a CHANGELOG note + spec-update if the SDK behavior diverges from what's coded
3. The fix likely lives in one method of `src/lib/server/billing/providers/razorpay.ts`

---

## What this runbook does NOT verify

- DSA-facing UI flow — no subscribe modal yet (S2.1b)
- Multi-DSA concurrency — single-user test
- Production-scale settlement reconciliation — S7 territory

All of those are downstream slices. This runbook proves the **adapter** works against real Razorpay; the orchestration above the adapter is its own verification (Tests 11-14 below cover the S2.1 endpoints that wire the adapter to MongoDB).

---

## S2.1 endpoint smoke tests (covers persistence + dispatch + cron + status)

Added 2026-05-26 — verifies the 4 endpoints that make the S2 adapter
user-facing without yet building the UI. Authentication uses the dev
login (mobile `9811556664` / OTP `9811` per MEMORY.md).

### Test 11 — Subscribe via endpoint

```powershell
# Log in via the web UI first to capture cookies in your browser,
# OR use the auth/otp endpoints to get a JWT (out of scope here).

curl -X POST http://localhost:5173/api/billing/subscribe-recurring `
  -H "Content-Type: application/json" `
  -H "Cookie: <your auth cookies>" `
  -d '{"plan_id":"pro"}'
```

**Expected**: 200 OK with body
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://rzp.io/i/xxxxxxxx",
    "pending_registration_id": "inv_xxx",
    "expires_at": "...",
    "first_charge_at": "...",  // next anchor day at 00:00 IST
    "free_days_count": 1-6,
    "disclosure": {
      "verification_charge": "Your bank may show a ₹1 debit and ₹1 refund...",
      "free_access": "Your first charge of ₹3,999 will be on..."
    }
  }
}
```

**Verify in Mongo** (`billingSubscriptions` collection):
- One doc for your dsa_id, `state: 'pending_mandate'`
- `pending_registration_id` matches response
- `provider_customer_id` populated (Razorpay cust_xxx)
- `mandate_token` NOT set (arrives via webhook)
- `state_history` has one entry: `not_subscribed → pending_mandate`

### Test 12 — Re-subscribe blocked (409)

```powershell
# Run Test 11 again (without completing the mandate authorization).
# Expected: 409 Conflict.
```

**Expected** (per pending re-subscribe policy §4 S2):
```json
{
  "success": false,
  "error": "A subscription authorization is already pending. Complete it or wait for it to expire.",
  "code": "PENDING_AUTHORIZATION",
  "currentState": "pending_mandate"
}
```

### Test 13 — Status polling (return-from-auth UX)

```powershell
curl http://localhost:5173/api/billing/subscription/status `
  -H "Cookie: <your auth cookies>"
```

**Expected** (immediately after Test 11): 200 with `state: 'pending_mandate'`.

After completing browser authorization (Test 4 above) and Razorpay fires
the webhook to your local tunnel: `state: 'active'`, `mandate_token` set,
`anchor_day` and `next_charge_at` populated.

**Verify NEVER returned**: `mandate_token`, `provider_customer_id` (PII per §6).

### Test 14 — Pending-cleanup cron

```powershell
# Manually advance a pending_mandate doc's updated_at to >24h ago
# in Mongo, then trigger the cron:

curl -X POST http://localhost:5173/api/cron/billing-pending-cleanup `
  -H "x-cron-secret: <CRON_SECRET from .env>"
```

**Expected**: 200 OK with `{ swept: N }` where N = count of stale pendings transitioned to `not_subscribed`.

**Verify in Mongo**: docs that were `pending_mandate` with `updated_at < now-24h` are now `state: 'not_subscribed'` with a new `state_history` entry.

### Test 15 — Webhook signature rejection

```powershell
curl -X POST http://localhost:5173/api/billing/webhook/razorpay `
  -H "Content-Type: application/json" `
  -H "x-razorpay-signature: forged" `
  -d '{"event":"subscription.charged"}'
```

**Expected**: 401 Unauthorized. Logged as `razorpay webhook: signature verification failed`.

### Test 16 — Webhook idempotency

```powershell
# Capture a real webhook (Test 4 above gives you token.confirmed) and
# replay the exact same body twice within an hour.
```

**Expected**: first call 200 with `data.processed: true`, second call 200 with `data.duplicate: true`. Subscription doc state_history shows only ONE transition (no double-apply).

---

## Pass/Fail Criteria — updated

D.1 S2 + S2.1 are verified working if **all 16 tests pass**:
- Tests 1-10: adapter-level (S2)
- Tests 11-16: endpoint-level (S2.1)

If a test fails, save the error + Razorpay response, file a CHANGELOG note, and the fix likely lives in one of:
- `src/lib/server/billing/providers/razorpay.ts` (adapter)
- `src/lib/server/billing/subscriptionStore.ts` (persistence)
- One of the 4 endpoint files under `src/routes/api/billing/` or `src/routes/api/cron/`
