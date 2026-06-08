# D.1 S3 — Renewal Cron Smoke-Test Runbook

**Purpose**: live-verify the S3 renewal-charge engine (`src/lib/server/billing/chargeEngine.ts`) and the two cron endpoints (`billing-charge` + `billing-charge-reminder`) before scheduling them with the external cron service. Drives every documented code path against a test subscription in your dev / preview environment.

**Cost**: ₹0. Uses the in-memory MockProvider via the dev-only `/api/test/billing/simulate-charge` endpoint; no real Razorpay traffic, no real money.

**Time**: ~20 min from setup to last assertion.

**Prerequisites**:
- Local dev server running (`pnpm dev`) OR a Vercel preview deploy
- `CRON_SECRET` set in `.env` (any 32+ char value — recommend `openssl rand -hex 32`)
- One test DSA with an existing subscription in `state: 'active'` and a `mandate_token` set. If you don't have one, run the S2 smoke first to create one via the real subscribe flow; the test endpoints below only work on a subscription that has reached `active`.
- MongoDB CLI access OR a query tool that can read/edit `billingSubscriptions`, `chargeAttempts`, `billingTransactions`, `billingAuditLogs`, `cronLocks`

---

## Pre-flight — confirm the foundation

Run these queries before starting. Each should return what's listed.

```bash
# 1. Indexes exist
mongosh "$MONGODB_URI" --eval '
  db.chargeAttempts.getIndexes().map(i => i.name)
'
# Expect: ['_id_', 'subscription_id_1_cycle_anchor_1', 'status_1_created_at_1',
#          'dsa_id_1_created_at_-1', 'attempt_id_1']

mongosh "$MONGODB_URI" --eval '
  db.billingAuditLogs.getIndexes().map(i => i.name)
'
# Expect: ['_id_', 'subscription_id_1_created_at_-1',
#          'event_class_1_created_at_-1', 'event_id_1']

mongosh "$MONGODB_URI" --eval '
  db.cronLocks.getIndexes().map(i => i.name)
'
# Expect: ['_id_', 'name_1', 'expires_at_1'] (name_1 must be unique)

# 2. Your test subscription is active
mongosh "$MONGODB_URI" --eval '
  db.billingSubscriptions.findOne({ dsa_id: ObjectId("YOUR_DSA_ID") },
    { state: 1, plan_id: 1, mandate_token: 1, anchor_day: 1, next_charge_at: 1,
      customer_email: 1, customer_mobile: 1 })
'
# Expect: state: 'active', mandate_token present, customer_email present
```

If `customer_email` is missing on the sub but present on the DSA, you're testing against a sub created BEFORE S3 M1 added the field. Either:
- Re-create the sub via fresh subscribe flow, OR
- Manually patch: `db.billingSubscriptions.updateOne({_id: ObjectId(...)}, {$set: {customer_email: 'dsa@example.com', customer_mobile: '+919999999999'}})`

---

## Test 1 — Cron endpoint auth gating

**Goal**: 401 without the cron secret; 401 with a wrong one.

```bash
# No header
curl -X POST http://localhost:5173/api/cron/billing-charge -i
# Expect: HTTP/1.1 401, body: { error: "Unauthorized" }

# Wrong secret
curl -X POST http://localhost:5173/api/cron/billing-charge \
  -H "x-cron-secret: wrong-value" -i
# Expect: HTTP/1.1 401

# Correct secret, no eligible subs
curl -X POST http://localhost:5173/api/cron/billing-charge \
  -H "x-cron-secret: $CRON_SECRET" -i
# Expect: HTTP/1.1 200, body contains: { total: 0, succeeded: 0, ... }
#   (unless your test sub's next_charge_at is already <= now — see Test 4)
```

✅ **PASS** if all three behave as above.

---

## Test 2 — CronLock contention

**Goal**: two simultaneous cron invocations cannot both process the batch.

```bash
# Fire two requests as close to simultaneous as possible
(curl -X POST http://localhost:5173/api/cron/billing-charge \
  -H "x-cron-secret: $CRON_SECRET" -i &
 curl -X POST http://localhost:5173/api/cron/billing-charge \
  -H "x-cron-secret: $CRON_SECRET" -i &
 wait)
```

Expected: ONE returns the normal `{ total: ..., succeeded: ..., ... }` envelope; the OTHER returns `{ skipped: "lock_contention", started_at: ... }`. Both are HTTP 200.

Confirm via the cronLocks collection:

```bash
mongosh "$MONGODB_URI" --eval '
  db.cronLocks.findOne({ name: "billing-charge" })
'
# Expect: a row exists, with released_at: <recent date>
```

✅ **PASS** if exactly one invocation processed the batch; both returned 200.

---

## Test 3 — Pre-charge reminder cron

**Goal**: reminder cron runs without errors, returns aggregate counts.

```bash
curl -X POST http://localhost:5173/api/cron/billing-charge-reminder \
  -H "x-cron-secret: $CRON_SECRET" -i
# Expect: 200, body: { total: N, sent: N, skipped: 0, failed: 0, ... }
#   where N = number of subs with next_charge_at in [now+3d, now+4d]
```

If you have no subs in that window, `total: 0`. To force one:

```bash
# Set a test sub's next_charge_at to 3.5 days from now
mongosh "$MONGODB_URI" --eval '
  db.billingSubscriptions.updateOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { $set: {
        next_charge_at: new Date(Date.now() + 3.5*24*60*60*1000),
        last_reminder_sent_at: null
    }}
  )
'
# Run the reminder cron again — expect total: 1, sent: 1
```

Check the SMTP log (or your inbox if `SMTP_*` env vars are real). The email subject should be `Reminder: ₹<amount> will debit on <date>`.

Verify dedupe: run the reminder cron a SECOND time within a few seconds. Expect `total: 1, sent: 0, skipped: 1` (dedup gate via `last_reminder_sent_at`).

✅ **PASS** if both runs return correct counts AND only ONE email was dispatched.

---

## Test 4 — Successful charge (the happy path)

**Goal**: simulate-charge endpoint drives the engine through the success path; verify state + DB rows.

```bash
# Capture before state
mongosh "$MONGODB_URI" --eval '
  print(JSON.stringify(db.billingSubscriptions.findOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { state: 1, next_charge_at: 1, last_charge_succeeded_at: 1 }
  )))
'

# Drive a simulated success
curl -X POST http://localhost:5173/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d '{ "dsa_id": "YOUR_DSA_ID", "outcome": "succeeded" }' -i
# Expect: 200, body.outcome.kind === 'succeeded'
```

Verify in MongoDB:

```bash
mongosh "$MONGODB_URI" --eval '
  const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId("YOUR_DSA_ID") });
  print("state:", sub.state);                    // active
  print("next_charge_at:", sub.next_charge_at);  // ~30 days in future
  print("last_charge_succeeded_at:", sub.last_charge_succeeded_at); // recent

  const attempts = db.chargeAttempts.find(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { attempt_id: 1, status: 1, provider_payment_id: 1, cycle_anchor: 1 }
  ).sort({ created_at: -1 }).limit(1).toArray();
  print("latest attempt:", JSON.stringify(attempts[0]));
  // status: succeeded, provider_payment_id: simulate_pay_..., cycle_anchor matches old next_charge_at

  const tx = db.billingTransactions.find(
    { dsa_id: ObjectId("YOUR_DSA_ID"), kind: "recurring_charge" }
  ).sort({ created_at: -1 }).limit(1).toArray();
  print("latest tx:", JSON.stringify(tx[0]));
  // kind: recurring_charge, status: succeeded, plan_id matches

  const audit = db.billingAuditLogs.find(
    { dsa_id: ObjectId("YOUR_DSA_ID"), event_name: "charge.succeeded" }
  ).sort({ created_at: -1 }).limit(1).toArray();
  print("audit row exists:", audit.length === 1);
'
```

✅ **PASS** if all four (sub state, ChargeAttempt, BillingTransaction, audit row) match expectations.

---

## Test 5 — Idempotency (the critical invariant)

**Goal**: re-running the simulate-charge for the SAME cycle does NOT double-charge.

The previous test extended `next_charge_at` ~30 days forward. To re-run for the same cycle, the simulator fast-forwards `next_charge_at` to `now` again. The probeExistingAttempt check should then find the prior succeeded attempt (matching on the new `next_charge_at` which equals `now`) — but actually the prior attempt's `cycle_anchor` is the OLD `next_charge_at`, so the probe won't match!

To test idempotency cleanly:

```bash
# Manually set next_charge_at BACK to the old cycle_anchor that's in ChargeAttempts
mongosh "$MONGODB_URI" --eval '
  const lastAttempt = db.chargeAttempts.find(
    { dsa_id: ObjectId("YOUR_DSA_ID"), status: "succeeded" }
  ).sort({ created_at: -1 }).limit(1).toArray()[0];
  db.billingSubscriptions.updateOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { $set: { next_charge_at: lastAttempt.cycle_anchor } }
  );
  print("Set next_charge_at back to:", lastAttempt.cycle_anchor);
'

# Now run simulate-charge — engine should SKIP because the prior attempt matches
curl -X POST http://localhost:5173/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d '{ "dsa_id": "YOUR_DSA_ID", "outcome": "succeeded" }' -i
# Expect: 200, body.outcome.kind === 'skipped_already_charged'
```

Verify NO new ChargeAttempt or BillingTransaction was created:

```bash
mongosh "$MONGODB_URI" --eval '
  print("ChargeAttempts for this DSA:",
    db.chargeAttempts.countDocuments({ dsa_id: ObjectId("YOUR_DSA_ID") }));
  // Should equal the count from Test 4 — no new row
'
```

✅ **PASS** if outcome is `skipped_already_charged` AND counts are unchanged.

---

## Test 6 — Retryable failure (active → dunning_t0)

**Goal**: an INSUFFICIENT_FUNDS failure transitions to dunning, not downgraded.

Reset the sub's `next_charge_at` to a fresh value first (so the probe is clean):

```bash
mongosh "$MONGODB_URI" --eval '
  db.billingSubscriptions.updateOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { $set: {
        next_charge_at: new Date(),
        state: "active",
        cancel_at_cycle_end: false
    }, $unset: { dunning_started_at: "" } }
  )
'

curl -X POST http://localhost:5173/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d '{ "dsa_id": "YOUR_DSA_ID", "outcome": "failed_retryable" }' -i
# Expect: 200, body.outcome.kind === 'failed_retryable'
```

Verify:

```bash
mongosh "$MONGODB_URI" --eval '
  const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId("YOUR_DSA_ID") });
  print("state:", sub.state);                       // dunning_t0
  print("failed_attempt_count:", sub.failed_attempt_count);  // >= 1
  print("dunning_started_at:", sub.dunning_started_at);      // recent
'
```

✅ **PASS** if state is `dunning_t0` and dunning bookkeeping is set.

---

## Test 7 — Terminal failure (active → downgraded)

**Goal**: MANDATE_INVALID skips dunning, goes straight to downgraded.

```bash
# Reset
mongosh "$MONGODB_URI" --eval '
  db.billingSubscriptions.updateOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { $set: { next_charge_at: new Date(), state: "active", failed_attempt_count: 0 },
      $unset: { dunning_started_at: "" } }
  )
'

curl -X POST http://localhost:5173/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d '{ "dsa_id": "YOUR_DSA_ID", "outcome": "failed_mandate_invalid" }' -i
# Expect: 200, body.outcome.kind === 'failed_terminal'

mongosh "$MONGODB_URI" --eval '
  print("state:", db.billingSubscriptions.findOne({ dsa_id: ObjectId("YOUR_DSA_ID") }).state);
'
# Expect: downgraded
```

✅ **PASS** if state is `downgraded`.

---

## Test 8 — cancel_at_cycle_end

**Goal**: setting the flag transitions to cancelled at next cron, no charge.

```bash
# Reset
mongosh "$MONGODB_URI" --eval '
  db.billingSubscriptions.updateOne(
    { dsa_id: ObjectId("YOUR_DSA_ID") },
    { $set: { next_charge_at: new Date(), state: "active" } }
  )
'

curl -X POST http://localhost:5173/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d '{ "dsa_id": "YOUR_DSA_ID", "outcome": "cancel_at_end" }' -i
# Expect: 200, body.outcome.kind === 'skipped_cancel_at_end'

mongosh "$MONGODB_URI" --eval '
  const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId("YOUR_DSA_ID") });
  print("state:", sub.state);                                // cancelled
  print("cancel_at_cycle_end:", sub.cancel_at_cycle_end);   // false (cleared)
'
```

✅ **PASS** if state is `cancelled` and the flag is cleared.

---

## Schedule wiring (production)

Owner is on Vercel FREE tier (S3 I-5 decision) — Vercel Cron is capped at 2/day and `billing-pending-cleanup` already consumes one slot. So `billing-charge` and `billing-charge-reminder` need an EXTERNAL scheduler.

**Recommended**: [cron-job.org](https://cron-job.org) (free, reliable, header support).

Per cron, configure:
- **URL**: `https://digitaldsa.com/api/cron/billing-charge` (and `/billing-charge-reminder`)
- **Method**: `POST`
- **Headers**: `x-cron-secret: <CRON_SECRET from production env>`
- **Schedule (charge)**: `30 20 * * *` UTC = 02:00 IST
- **Schedule (reminder)**: `0 21 * * *` UTC = 02:30 IST
- **Timeout**: 60 seconds (Vercel function timeout is configurable but 60s covers a 25-sub batch comfortably; raise if batch grows)
- **Notify-on-failure**: configure email alerts so a failed cron run pages someone

After scheduler is set up, verify by:
1. Watching the Vercel function logs for the two endpoints on the first scheduled fire
2. Checking that `cronLocks.findOne({name: 'billing-charge'})` shows a recent `acquired_at` + `released_at`
3. Checking that `billingAuditLogs.find({event_name: 'billing-charge'}).sort({created_at: -1}).limit(1)` shows the latest run

---

## Sign-off

Test results (paste here when running):

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 1 | Auth gating | ☐ | |
| 2 | CronLock contention | ☐ | |
| 3 | Pre-charge reminder + dedupe | ☐ | |
| 4 | Successful charge | ☐ | |
| 5 | Idempotency (skip on prior succeeded) | ☐ | |
| 6 | Retryable failure → dunning_t0 | ☐ | |
| 7 | Terminal failure → downgraded | ☐ | |
| 8 | cancel_at_cycle_end → cancelled | ☐ | |

**S3 is shippable when**: all 8 tests pass + external scheduler configured for the 2 crons + production `CRON_SECRET` is set (and audited per Pitfall #60 — no `#` or `$` characters that dotenv would truncate).

**Then**: S3 is done. S4 (retry state machine) is unblocked.
