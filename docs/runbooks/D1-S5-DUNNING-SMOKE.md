# D.1 S5 — Dunning Escalation Smoke-Test Runbook

**Purpose**: live-verify the S5 dunning advance cron + email dispatch + persistent in-app banner before S5 is declared ready for production. Companion to `D1-S3-RENEWAL-CRON-SMOKE.md` and `D1-S4-RETRY-SMOKE.md`.

**Cost**: ₹0. No provider calls — the dunning-advance cron does not charge; it only walks state + sends email. Email goes through the SES adapter; while AWS Support case 177987930900751 is in review (sandbox mode), real-recipient sends only work for verified addresses on your AWS account.

**Time**: ~15 min from setup to the last assertion.

**Prerequisites**:
- `pnpm dev` running locally (or a Vercel preview deploy)
- `CRON_SECRET` set in `.env`
- Test DSA in `dunning_t0` with `dunning_started_at` set. Easiest path: run the S4 smoke through Test S4-1 (force a single `failed_retryable` from `active`) which lands the sub in `dunning_t0` with `dunning_started_at ≈ now`. Then proceed.

---

## Test S5-1 — dunning_t0 at day 0: no advancement

The cron should be a no-op when day-N has not yet reached the threshold. This catches accidental floor-zero bugs.

```bash
DSA_ID="<your-test-dsa-id>"
CRON_SECRET="<your local .env value>"

curl -X POST http://localhost:5175/api/cron/billing-dunning-advance \
  -H "x-cron-secret: $CRON_SECRET" -s | python3 -m json.tool
```

Verify in MongoDB:

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);  // still dunning_t0
```

✅ **PASS** if the response shows `advanced: 0` and the subscription state is still `dunning_t0`.

---

## Test S5-2 — dunning_t0 at day 3: escalates to dunning_grace + email sent

Backdate `dunning_started_at` by 3 days, then run the cron.

```js
// In mongosh:
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { dunning_started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }
);
```

Then re-run the cron POST.

Verify:

```js
const sub = db.billingSubscriptions.findOne({ dsa_id: ObjectId(DSA_ID) });
print('state:', sub.state);  // dunning_grace
print('dunning_started_at:', sub.dunning_started_at);  // UNCHANGED (3 days ago)
print('failed_attempt_count:', sub.failed_attempt_count);  // bumped by 1
const lastTransition = sub.state_history[sub.state_history.length - 1];
print('last transition:', lastTransition.from, '->', lastTransition.to);  // dunning_t0 -> dunning_grace
```

Then check the audit log:

```js
db.billingAuditLogs.find(
  { dsa_id: ObjectId(DSA_ID), event_name: 'dunning_t0->dunning_grace' }
).limit(1).pretty();
```

✅ **PASS** if state is `dunning_grace`, `dunning_started_at` survived (still 3 days ago), `failed_attempt_count` bumped, and an audit row exists with `payload.daysSinceFailure: 3`.

Also check the server logs for an email dispatch line:
```
dunning-advance: email send  kind=dunning_grace  dsa_id=...
```
(In dev with no SES creds, the email is log-only — that's expected. In SES sandbox mode, only emails to verified recipients land for real.)

---

## Test S5-3 — dunning_grace at day 7: escalates to dunning_final

Backdate further:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { dunning_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
);
```

Run cron. Verify state advances to `dunning_final`, `dunning_started_at` still preserved, audit row for `dunning_grace->dunning_final` exists with `daysSinceFailure: 7`.

✅ **PASS** mirror of S5-2.

---

## Test S5-4 — dunning_final at day 8: downgrades

Backdate to 8 days:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  { $set: { dunning_started_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } }
);
```

Run cron. Verify state is now `downgraded`, audit row exists for `dunning_final->downgraded` with `daysSinceFailure: 8`. Note: **D.6 case-creation fence has not shipped yet** — `downgraded` state is set correctly but the actual feature-revoke (blocking case creation) is a D.6 line item.

---

## Test S5-5 — In-app banner renders on the DSA dashboard

With the test DSA logged into a browser session, force the sub back to `dunning_grace`:

```js
db.billingSubscriptions.updateOne(
  { dsa_id: ObjectId(DSA_ID) },
  {
    $set: {
      state: 'dunning_grace',
      dunning_started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    }
  }
);
```

Hard-refresh the dashboard (Ctrl+Shift+R). Expected:
- Orange banner pinned to the top of every page
- Title: `Payment still failing — 3 days of access left` (8 - 5 = 3)
- Two buttons: **Update payment method** + **Retry now**
- No close/dismiss button

✅ **PASS** if the banner renders and matches the copy above.

---

## Test S5-6 — Retry now button restores state to active + clears banner

Set the sub to `dunning_t0` with `next_charge_at <= now` (so the chargeEngine considers it eligible for retry). Then click the **Retry now** button.

Since the test environment uses MockProvider via the provider registry, the retry will succeed (default success outcome).

Expected:
- Toast appears: "Payment went through — access restored."
- Page invalidates (small load spinner blip)
- Banner disappears
- Subscription state is now `active`, `dunning_started_at` is cleared, `failed_attempt_count` is 0

✅ **PASS** if the banner clears and the subscription returns to `active`.

---

## Test S5-7 — Banner does NOT render for non-DSA users

Switch session to an admin or RM account (or use Test 5 of the cron-job.org setup runbook for the impersonation pattern). The banner must NOT render — `loadDunningBannerState` short-circuits before the Mongo query for non-DSA roles.

✅ **PASS** if the banner is absent on `/dashboard/admin` and `/dashboard/rm`.

---

## Test S5-8 — cron-job.org provisioner adds the third job

After running `node scripts/setup-cron-jobs.mjs` post-S5, the cron-job.org dashboard should show three jobs:

| Title | Schedule (UTC) | Schedule (IST) |
|---|---|---|
| `d1-billing-charge` | 20:30 daily | 02:00 |
| `d1-billing-charge-reminder` | 21:00 daily | 02:30 |
| `d1-billing-dunning-advance` | 21:30 daily | 03:00 |

The script is idempotent on `title` — re-running it picks up the existing two jobs and **creates** the new one.

✅ **PASS** if the third job appears with HTTP 200 in the post-create verification step.

---

## Operational notes

**Daily cadence ordering (important):**
- `billing-charge` fires at 20:30 UTC (02:00 IST) — processes anchor-day debits + S4 retries
- `billing-charge-reminder` fires at 21:00 UTC (02:30 IST) — pre-charge reminders for the next anchor day
- `billing-dunning-advance` fires at 21:30 UTC (03:00 IST) — walks dunning state

The 30-minute gap between renewal-charge and dunning-advance is intentional: a charge that succeeds at 02:00 (DSA fixed their bank balance) recovers their sub to `active` before 03:00, so the advance cron sees zero eligible rows for that DSA. Running them in the opposite order would email about a state the DSA is no longer in.

**Backdating semantics:**
- The dunning-advance cron evaluates `days_since_failure` from `dunning_started_at`. To skip ahead in tests, backdate `dunning_started_at` — NOT `next_charge_at` (which is the charge cron's clock).
- `dunning_started_at` MUST survive across all retries within dunning; only `dunning_* → active` recovery clears it. The state-machine side-effect in `subscriptionState.ts` enforces this.

**Email landing (SES sandbox while AWS reviews):**
- AWS Support case 177987930900751 is open for sandbox lift. Until approved, SES will accept only verified-recipient addresses; non-verified addresses will be silently dropped by SES.
- Add your own email to SES verified identities (AWS console → SES → Verified identities) so you can receive the dunning emails during smoke.
- Once AWS approves, no code change is needed; the same `sendEmail` path delivers to any recipient.

**If a smoke test fails:**
- `advanced: 0` when you expected `1` → check `dunning_started_at` is set on the sub doc + the date arithmetic (backdate must be `> threshold * 24h` ago).
- Cron returns 401 → `CRON_SECRET` header doesn't match `.env` (or `.env` was truncated by Pitfall #60's `#`/`$` parser quirk).
- Cron returns 200 but `total: 0` → no subscriptions in any `dunning_*` state. Check the test DSA's state is correct before invoking.
- Banner doesn't appear → check the browser network panel for `+layout.server.ts` load returning `dunningBanner: null`. The helper short-circuits for non-DSA, non-ObjectId, or non-dunning subscriptions.

**Sign-off:**

```
[ ] Tests S5-1 through S5-8 all pass
[ ] cron-job.org dashboard shows the d1-billing-dunning-advance job
[ ] verifyEndpoint() in setup-cron-jobs.mjs returned HTTP 200 for the new job
[ ] SES verified identities include the operator's email (until sandbox lift)
```
