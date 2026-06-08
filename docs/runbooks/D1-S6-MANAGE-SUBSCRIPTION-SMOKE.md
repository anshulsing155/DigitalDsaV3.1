# D.1 S6 — Manage Subscription Smoke-Test Runbook

**Purpose**: live-verify the S6 self-service surface end-to-end — update-payment-method (M3), change-plan (M4), Manage panel UI (M5), and pause-sweep cron (M6) — before S6 is declared production-ready. Companion to `D1-S3-RENEWAL-CRON-SMOKE.md`, `D1-S4-RETRY-SMOKE.md`, and `D1-S5-DUNNING-SMOKE.md`.

**Cost**: ₹0. All tests use MockProvider in dev; no real Razorpay calls. Email sends go through SES (sandbox mode while AWS case 177987930900751 is in review — real-recipient sends only work for verified addresses).

**Time**: ~25 min from setup to the last assertion.

**Prerequisites**:
- `pnpm dev` running locally (or a Vercel preview deploy with these endpoints)
- `CRON_SECRET` set in `.env`
- A test DSA in `active` state with a mandate token. Easiest path: complete the D.1 S2 subscribe smoke (mock provider) so the DSA lands in `active` with `mandate_token` set and `anchor_day`/`next_charge_at` populated. Then proceed.
- `mongosh` for the DB inspection steps

---

## Setup — confirm starting state

```bash
DSA_ID="<your-test-dsa-id>"
CRON_SECRET="<your local .env value>"
HOST="http://localhost:5183"   # match your dev port
```

```js
// In mongosh:
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);                  // expect "active"
print('plan_id:', sub.plan_id);              // expect "basic" / "pro" / "enterprise"
print('mandate_token present:', !!sub.mandate_token);
print('max_amount_paise:', sub.max_amount_paise);
```

✅ **PASS** if state=`active`, mandate present.

---

# Part A — M3 update-payment-method

## Test S6-M3-1 — happy path: replacement registered

```bash
curl -X POST $HOST/api/billing/subscription/update-payment-method \
  -H "x-csrf-token: $(curl -sb $HOST/login | grep csrf)" \
  -b cookies.txt -s | python3 -m json.tool
```

(For browser smoke, click "Update payment method" from the Billing → Manage subscription tab; you'll be redirected to the MockProvider's hosted auth URL.)

Expected response: `success: true`, body with `authorization_url`, `pending_replacement_registration_id`, `expires_at`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('pending_replacement_registration_id:', sub.pending_replacement_registration_id);
print('mandate_update_lock_until:', sub.mandate_update_lock_until);
print('state:', sub.state);                  // unchanged — still active
print('mandate_token unchanged:', sub.mandate_token);  // old token still in place
```

✅ **PASS** if pending_replacement_registration_id set, lock_until ≈ now+5min, state=active, mandate_token unchanged.

## Test S6-M3-2 — second call within window: 409 REPLACEMENT_IN_FLIGHT

Repeat the same POST without completing the auth flow.

```bash
curl -X POST $HOST/api/billing/subscription/update-payment-method ...
```

✅ **PASS** if response is HTTP 409 with body `{ code: 'REPLACEMENT_IN_FLIGHT', ... }`.

## Test S6-M3-3 — charge cron skips while lock held

While `mandate_update_lock_until` is set, fire the charge cron:

```bash
curl -X POST $HOST/api/cron/billing-charge \
  -H "x-cron-secret: $CRON_SECRET" -s | python3 -m json.tool
```

In the response check `outcomes[]` for the test DSA's subscription_id — expect `kind: 'skipped_mandate_update_lock'`.

Also check the audit log:
```js
db.billingAuditLogs.find({ event_name: 'skipped_mandate_update_lock' }).sort({created_at:-1}).limit(1).pretty();
```

✅ **PASS** if cron skipped the row + audit row written.

## Test S6-M3-4 — webhook swap: token replaced atomically

Simulate the mandate.authorized webhook for the replacement. Build the webhook payload mirroring the MockProvider's parseWebhookEvent shape:

```bash
# Get the pending_registration_id from setup above:
PENDING_REG=$(mongosh --quiet --eval "db.billingSubscriptions.findOne({dsa_id: ObjectId('$DSA_ID')}).pending_replacement_registration_id")

# Note: in real Razorpay flow this fires automatically when the DSA completes
# bank-side auth. For mock smoke, hit the webhook endpoint directly.
curl -X POST $HOST/api/billing/webhook/razorpay \
  -H "content-type: application/json" \
  -H "x-razorpay-signature: <HMAC of body using webhook secret>" \
  -d '{
    "event": "token.confirmed",
    "id": "evt_swap_smoke_1",
    "payload": { "token": { "entity": { "id": "new_mandate_tok_X", "entity_id": "'$PENDING_REG'" } } }
  }' -s
```

(For dev mock the HMAC step is fiddly; easier path is to import the swap helper directly in a one-off script or use the existing webhook tests.)

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('mandate_token:', sub.mandate_token);              // expect new_mandate_tok_X
print('pending_replacement_registration_id:', sub.pending_replacement_registration_id);  // expect undefined
print('mandate_update_lock_until:', sub.mandate_update_lock_until);  // expect undefined
print('state:', sub.state);                              // unchanged — still active
```

✅ **PASS** if mandate_token swapped, replacement bookkeeping cleared, state preserved.

Also check the audit log for `mandate_replaced` + `mandate_revoke_attempt` rows.

## Test S6-M3-5 — abandonment: lock expires, old mandate keeps working

Reset to a fresh active sub. Run M3-1 to set the lock. Then fast-forward the lock:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { mandate_update_lock_until: new Date(Date.now() - 60 * 1000) } }  // expired 1 min ago
);
```

Run the charge cron with `next_charge_at <= now`:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { next_charge_at: new Date(Date.now() - 60 * 1000) } }
);
```

```bash
curl -X POST $HOST/api/cron/billing-charge -H "x-cron-secret: $CRON_SECRET" -s | python3 -m json.tool
```

Expected: cron proceeds with the OLD mandate_token (which is still on the sub doc — replacement was abandoned). Outcome should be `succeeded` (MockProvider).

✅ **PASS** if charge ran against the original mandate_token.

---

# Part B — M4 change-plan

## Test S6-M4-1 — upgrade flips plan immediately

Start with sub on `basic` (cap 149_850). Re-mandate to a higher cap first (or use mongosh to set max_amount_paise=599_850 to simulate a pro-capable mandate).

```bash
curl -X POST $HOST/api/billing/subscription/change-plan \
  -H "content-type: application/json" \
  -b cookies.txt \
  -d '{"new_plan_id":"pro","change_kind":"upgrade"}' -s | python3 -m json.tool
```

Expected: 200 OK with `{kind: 'upgrade', new_plan_id: 'pro', effective_from: 'immediately', ...}`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('plan_id:', sub.plan_id);                          // expect "pro"
print('max_amount_paise:', sub.max_amount_paise);        // expect 599_850
print('anchor_day:', sub.anchor_day);                    // unchanged
print('next_charge_at:', sub.next_charge_at);            // unchanged
```

Audit log:
```js
db.billingAuditLogs.find({event_name:'plan_upgrade'}).sort({created_at:-1}).limit(1).pretty();
```

✅ **PASS** if plan flipped, anchor preserved, audit row present.

## Test S6-M4-2 — upgrade with insufficient cap: 409 NEEDS_REMANDATE

Reset sub to `basic` with `max_amount_paise: 149_850` (the basic-tier cap). Try upgrading to enterprise:

```bash
curl -X POST $HOST/api/billing/subscription/change-plan \
  -H "content-type: application/json" \
  -b cookies.txt \
  -d '{"new_plan_id":"enterprise","change_kind":"upgrade"}' -s | python3 -m json.tool
```

Expected: HTTP 409, body `{ code: 'NEEDS_REMANDATE', needs_remandate: true, current_mandate_cap_paise: 149850, required_mandate_cap_paise: 1499850, ... }`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('plan_id:', sub.plan_id);                          // unchanged — still basic
print('max_amount_paise:', sub.max_amount_paise);        // unchanged
```

✅ **PASS** if 409 returned, NO db mutation.

## Test S6-M4-3 — downgrade defers to next anchor

Sub on `enterprise`. Downgrade to `pro`:

```bash
curl -X POST $HOST/api/billing/subscription/change-plan \
  -H "content-type: application/json" \
  -b cookies.txt \
  -d '{"new_plan_id":"pro","change_kind":"downgrade"}' -s | python3 -m json.tool
```

Expected: 200 OK with `{kind: 'downgrade', current_plan_id: 'enterprise', pending_downgrade_to: 'pro', effective_at: '<next_anchor>', ...}`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('plan_id:', sub.plan_id);                          // STILL "enterprise"
print('pending_downgrade_to:', sub.pending_downgrade_to); // "pro"
```

Now force the charge cron to fire at next_charge_at:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { next_charge_at: new Date(Date.now() - 60 * 1000) } }
);
```

```bash
curl -X POST $HOST/api/cron/billing-charge -H "x-cron-secret: $CRON_SECRET" -s | python3 -m json.tool
```

Expected: cron applies the downgrade BEFORE the charge, charges at the new (pro) amount.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('plan_id:', sub.plan_id);                          // expect "pro" (flipped)
print('pending_downgrade_to:', sub.pending_downgrade_to); // undefined (cleared)
```

✅ **PASS** if plan flipped at anchor, pending flag cleared, charge succeeded at new amount.

## Test S6-M4-4 — KIND_MISMATCH guard

Sub on `pro`. Ask for "upgrade" but target a CHEAPER plan:

```bash
curl -X POST $HOST/api/billing/subscription/change-plan \
  -H "content-type: application/json" -b cookies.txt \
  -d '{"new_plan_id":"basic","change_kind":"upgrade"}' -s
```

✅ **PASS** if 400 with `{ code: 'KIND_MISMATCH', detected_kind: 'downgrade', ... }`.

---

# Part C — M5 Manage panel UI (browser smoke)

In a browser logged in as a DSA with a recurring `active` subscription, navigate to **Billing**. The "Manage subscription" panel should render below the SubscribeRecurringSection.

## Test S6-M5-1 — three tabs render

- ✅ Tabs visible: Subscription · Transactions · Payment method
- ✅ Default tab is Subscription
- ✅ Clicking each tab switches the visible panel

## Test S6-M5-2 — Subscription tab

- ✅ Shows plan name, status badge, next charge date, anchor day
- ✅ Pause / Resume / Update payment method / Cancel buttons visible based on current state (Resume only for paused; Cancel hidden after `cancel_at_cycle_end` is set)
- ✅ "Switch to…" dropdown lists OTHER plans; selecting one opens the change-plan modal
- ✅ Modal shows upgrade vs downgrade copy correctly per `planChangePreview`
- ✅ ConfirmModal dismissal: Escape, backdrop click, and Cancel button ALL close cleanly without firing the action

## Test S6-M5-3 — Transactions tab

- ✅ Renders paginated table of `BillingTransaction` rows for THIS DSA only
- ✅ Filter by status works
- ✅ "Show ₹1 authorization charges" checkbox toggles inclusion of `is_test_auth: true` rows
- ✅ Page navigation Next/Previous works
- ✅ Refresh icon re-fetches

## Test S6-M5-4 — Payment method tab

- ✅ Shows mandate status badge + per-debit cap in ₹
- ✅ Update Payment Method button visible (hidden if `pending_replacement_in_flight`)
- ✅ When `pending_replacement_in_flight`, summary shows "Authorization pending — expires {date}"

## Test S6-M5-5 — UI ↔ M3 wiring

Click "Update payment method" → modal → Continue to bank → expect redirect to mock authorization_url.

Refresh the Billing page after: Payment method tab should show "Update in progress" until the (simulated) webhook lands.

## Test S6-M5-6 — UI ↔ M4 NEEDS_REMANDATE

Sub on basic (cap too low). Use the dropdown to select Enterprise → modal → Confirm upgrade → expect inline error: "This upgrade requires a new payment authorization. Update your payment method first, then try again."

✅ **PASS** if all M5 checks pass.

---

# Part D — M6 pause auto-cancel cron

## Test S6-M6-1 — fresh paused sub: no action

Pause an `active` sub via the endpoint:

```bash
curl -X POST $HOST/api/billing/subscription/pause -b cookies.txt -s
```

Run the pause-sweep cron:

```bash
curl -X POST $HOST/api/cron/billing-pause-sweep \
  -H "x-cron-secret: $CRON_SECRET" -s | python3 -m json.tool
```

Expected: `{total: 1, no_action: 1, reminders_sent: 0, auto_cancelled: 0, ...}`.

✅ **PASS** if no-action for a freshly-paused sub.

## Test S6-M6-2 — day 60: reminder email sent + stamped

Backdate the paused-at in state_history:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  {
    $set: {
      // Rewrite the most-recent paused entry's `at` to 60d ago
      "state_history.$[entry].at": new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    }
  },
  { arrayFilters: [{ "entry.to": "paused" }] }
);
```

Run the cron:
```bash
curl -X POST $HOST/api/cron/billing-pause-sweep -H "x-cron-secret: $CRON_SECRET" -s
```

Expected: `{reminders_sent: 1, ...}`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('pause_reminder_sent_at:', sub.pause_reminder_sent_at);  // expect today
print('state:', sub.state);  // still paused
```

✅ **PASS** if reminder field stamped, state preserved.

## Test S6-M6-3 — day 60 second call: idempotent (no double-send)

Run the cron again immediately (still at day-60+ since `pause_reminder_sent_at` is set):

```bash
curl -X POST $HOST/api/cron/billing-pause-sweep -H "x-cron-secret: $CRON_SECRET" -s
```

Expected: `{reminders_sent: 0, no_action: 1, ...}`.

✅ **PASS** if reminder is NOT re-sent.

## Test S6-M6-4 — day 90: auto-cancel + revoke attempt

Backdate to 90d:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  {
    $set: {
      "state_history.$[entry].at": new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    }
  },
  { arrayFilters: [{ "entry.to": "paused" }] }
);
```

Run the cron:
```bash
curl -X POST $HOST/api/cron/billing-pause-sweep -H "x-cron-secret: $CRON_SECRET" -s
```

Expected: `{auto_cancelled: 1, ...}`.

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);  // expect "cancelled"
```

Check the audit log for `paused->cancelled (90d auto)` + `mandate_revoke_attempt` (status: "not_supported" for RazorpayProvider stub, "succeeded" for MockProvider).

✅ **PASS** if state=cancelled, audit row present, revoke attempted.

## Test S6-M6-5 — operator scheduler check

After the smoke passes locally, on the cron-job.org dashboard verify the new 4th job is provisioned:

- **d1-billing-pause-sweep** — daily 22:00 UTC (03:30 IST)

Run `node scripts/setup-cron-jobs.mjs` to (re-)sync. The script is idempotent.

---

# Sign-off

When ALL parts (A through D, plus operator scheduler) pass, post in the team channel:

```
✅ D.1 S6 manage subscription smoke complete (M3+M4+M5+M6+M7)
   - update-payment-method: 5/5 ✅
   - change-plan: 4/4 ✅
   - Manage panel UI: 6/6 ✅
   - pause-sweep cron: 5/5 ✅
   - cron-job.org provisioner: ✅
   Operator: 4th cron job is now live.
```

The S6 territory is now production-ready pending only:
- Razorpay's real production-API plumbing (for actual mandate authorization) — M3's `revokeMandate` is intentionally stubbed as `not_supported` per the documented TODO in `providers/razorpay.ts`; operator follow-up via Razorpay dashboard
- AWS Support case 177987930900751 production-access for SES (for real-recipient reminder emails)

Both are tracked separately in SESSION-HANDOFF.md.
