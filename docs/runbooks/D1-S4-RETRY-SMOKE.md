# D.1 S4 — Retry State Machine Smoke-Test Runbook

**Purpose**: live-verify the S4 retry logic (`chargeEngine` retry scheduling + recovery email + `retry-now` endpoint) before S4 is declared ready for production. Companion to `D1-S3-RENEWAL-CRON-SMOKE.md` — S3 was the foundation, S4 adds the retry scheduling on top.

**Cost**: ₹0. Uses the dev-only `/api/test/billing/simulate-charge` endpoint with the inline provider stub (no real Razorpay traffic).

**Time**: ~15 min from setup to last assertion.

**Prerequisites**:
- `pnpm dev` running (or a Vercel preview deploy)
- `CRON_SECRET` set in `.env`
- One test DSA with `active` subscription + `mandate_token` — same pre-req as S3 smoke. If you don't have one, run the S3 smoke's setup steps first or use the synthetic-sub helper from S3 M6.

---

## Test S4-1 — First failure: state lands in dunning_t0 with next_charge_at = now + 1d

```bash
DSA_ID="<your-test-dsa-id>"
# Force the sub to active + next_charge_at=now (same as S3 Test 6 setup)
# … via mongosh or the helper from S3 M6 …

curl -X POST http://localhost:5175/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d "{ \"dsa_id\": \"$DSA_ID\", \"outcome\": \"failed_retryable\" }" -s | python3 -m json.tool
```

**Verify in MongoDB**:

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);                       // dunning_t0
print('failed_attempt_count:', sub.failed_attempt_count); // 1
print('dunning_started_at:', sub.dunning_started_at);     // ~now
// The critical S4 assertion: next_charge_at must be ~24h in the future
const drift = sub.next_charge_at.getTime() - sub.dunning_started_at.getTime();
const days = drift / (24 * 60 * 60 * 1000);
print('next_charge_at offset (days from dunning_started_at):', days);  // ≈ 1
```

✅ **PASS** if state is `dunning_t0`, count is 1, and next_charge_at is ~24h after dunning_started_at.

---

## Test S4-2 — Second failure (count=2): next_charge_at = dunning_started_at + 3d

To simulate the day-1 retry firing, set the sub's `next_charge_at` to "now" then re-run simulate-charge with `failed_retryable`. This is exactly what the cron does when it picks up an eligible sub.

```js
// Step 1: fast-forward — set next_charge_at to "now" while preserving dunning_started_at
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { next_charge_at: new Date() } }
);
```

Then run simulate-charge again with `failed_retryable`. Verify the new next_charge_at = `dunning_started_at + 3 days`:

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
const offset = (sub.next_charge_at.getTime() - sub.dunning_started_at.getTime()) / (24 * 3600 * 1000);
print('offset (days):', offset);  // ≈ 3
print('failed_attempt_count:', sub.failed_attempt_count); // 2
print('dunning_started_at preserved:', sub.dunning_started_at); // SAME as Test S4-1
```

✅ **PASS** if next_charge_at is exactly +3d from the ORIGINAL dunning_started_at (not +3d from now) and count is 2.

---

## Test S4-3 — Third failure (count=3): next_charge_at = dunning_started_at + 5d

Same procedure as Test S4-2. Expected offset: 5 days. Count: 3.

---

## Test S4-4 — Fourth failure (count=4): NO new next_charge_at — S5 takes over

This is the critical "stop retrying" case. After the t+5d attempt fails:

```js
// Verify: next_charge_at is left as-is (pointing at the t+5d attempt that just failed)
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state still:', sub.state);                       // dunning_t0
print('failed_attempt_count:', sub.failed_attempt_count); // 4
print('next_charge_at unchanged from prior retry:', sub.next_charge_at);
// last_charge_attempt_at SHOULD have been updated (operators can see retry happened)
print('last_charge_attempt_at:', sub.last_charge_attempt_at);  // ~now
```

✅ **PASS** if count is 4, next_charge_at is unchanged from the t+5d attempt's day, and last_charge_attempt_at is fresh.

After this point, the day-counting from `dunning_started_at` will be on day 5. S5's dunning-advance cron (when shipped) will detect `days_since_failure >= 3` (it's actually 5) and transition `dunning_t0 → dunning_grace`. **Without S5 shipped yet, the sub will sit in dunning_t0 indefinitely** — that's the expected interim state.

---

## Test S4-5 — Retry succeeds → state recovers to active + recovery email sent

Reset for a clean recovery test:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { state: 'active', failed_attempt_count: 0, next_charge_at: new Date() },
    $unset: { dunning_started_at: '' } }
);
```

Then 1) fail once, 2) success on retry:

```bash
# Step 1: first failure (drops into dunning_t0)
curl -X POST http://localhost:5175/api/test/billing/simulate-charge -H "Content-Type: application/json" \
  -d "{ \"dsa_id\": \"$DSA_ID\", \"outcome\": \"failed_retryable\" }"

# Step 2: fast-forward
mongosh "$MONGODB_URI" --eval "db.billingSubscriptions.updateOne({dsa_id: ObjectId('$DSA_ID')}, {\$set: {next_charge_at: new Date()}})"

# Step 3: success on retry
curl -X POST http://localhost:5175/api/test/billing/simulate-charge -H "Content-Type: application/json" \
  -d "{ \"dsa_id\": \"$DSA_ID\", \"outcome\": \"succeeded\" }"
```

Verify:

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);                          // active
print('failed_attempt_count (reset):', sub.failed_attempt_count); // 0
print('dunning_started_at (cleared):', sub.dunning_started_at);   // undefined
print('next_charge_at advanced ~30d:', sub.next_charge_at);
// Audit row should be charge.recovery (NOT charge.succeeded)
const recovery = db.billingAuditLogs.findOne(
  { dsa_id: ObjectId(DSA_ID), event_name: 'charge.recovery' },
  { sort: { created_at: -1 } }
);
print('recovery audit:', recovery ? 'YES' : 'NO');
```

If SMTP is configured: check the test DSA's inbox for "Your payment went through — thanks!". If not, the email call is logged-only — check the dev server logs for the entry.

✅ **PASS** if state is `active`, dunning bookkeeping is cleared, and there's a `charge.recovery` audit row.

---

## Test S4-6 — POST /api/billing/subscription/retry-now (manual retry endpoint)

Authenticate as the test DSA first (the endpoint requires a real session). Quickest path: log in via the dev UI as the test DSA, then use the same browser session to POST.

OR use a fixed-OTP login + the resulting JWT (per `reference_dev_login.md`):

```bash
# After logging in via UI as DSA mobile 9811556664 with OTP 9811, copy the auth cookie.
COOKIE="<paste session cookie here>"

curl -X POST http://localhost:5175/api/billing/subscription/retry-now \
  -H "Cookie: $COOKIE" \
  -H "x-csrf-token: <get from /api/auth/csrf-token>" \
  -i -s | head -20
```

**Expected response shapes**:

- 401 if not authenticated
- 404 if no subscription OR state is `active` / `cancelled` / etc.
- 200 with `{ result: 'succeeded' | 'failed_retryable' | 'failed_terminal', ... }` when state is in dunning

**Critical S4-6 assertion**: a successful retry-now should NOT change `next_charge_at` from the cron's scheduled retry. Before retry-now, note the sub's `next_charge_at`. After a FAILED retry-now, that value should be unchanged. After a SUCCESSFUL retry-now, it advances to the next anchor (~30 days).

✅ **PASS** if 401/404/200 paths work AND failed retry-now does NOT override the cron's scheduled `next_charge_at`.

---

## Test S4-7 — In-flight race protection

Simulate two concurrent calls for the same DSA:

```bash
(curl -X POST http://localhost:5175/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d "{ \"dsa_id\": \"$DSA_ID\", \"outcome\": \"succeeded\" }" -s &
 curl -X POST http://localhost:5175/api/test/billing/simulate-charge \
  -H "Content-Type: application/json" \
  -d "{ \"dsa_id\": \"$DSA_ID\", \"outcome\": \"succeeded\" }" -s &
 wait)
```

One should return `kind: 'succeeded'`; the other should return `kind: 'skipped_already_charged'` because the FIRST caller's pending ChargeAttempt was visible to the SECOND caller's probe. Only ONE ChargeAttempt row should exist for the (subscription_id, cycle_anchor) after both complete.

✅ **PASS** if exactly one charge succeeded AND exactly one ChargeAttempt row exists.

---

## Sign-off

```
[ ] S4-1: first failure → dunning_t0 + next_charge_at +1d
[ ] S4-2: second failure → next_charge_at +3d (dunning_started_at preserved)
[ ] S4-3: third failure → next_charge_at +5d
[ ] S4-4: fourth failure → no new next_charge_at (S5 takes over)
[ ] S4-5: retry succeeds → active + recovery email + audit row
[ ] S4-6: POST /retry-now — 401/404/200 paths AND no override on failure
[ ] S4-7: concurrent calls → in-flight race protection works
```

**S4 is shippable when all 7 pass.** Then S5 (dunning escalation, ~2d, SEC-8 prerequisite) is unblocked.
