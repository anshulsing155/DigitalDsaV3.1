# D.1 S3 — cron-job.org Scheduler Setup

**Purpose**: configure the external scheduler that drives the S3 renewal cron + pre-charge reminder cron. Owner-driven, ~5 min UI work.

**Why an external scheduler?** Vercel Free tier caps cron jobs at 2/day; `billing-pending-cleanup` already consumes one slot. S3 adds two more crons → exceeds the cap → external scheduler is the cleanest fix per S3 I-5 owner decision (2026-05-27).

**Why cron-job.org?** Free, supports POST + custom headers + failure-on-non-2xx email notifications. UI-driven. Public API available for later automation if needed.

---

## Prerequisites

| What | Where | Status |
|---|---|---|
| cron-job.org free account | https://cron-job.org/en/signup/ | sign up if you haven't |
| `CRON_SECRET` value | local `.env` line 103 (64-char hex starting `d3e9f6df...`) | ✅ matches Vercel env per owner |
| Target URL host | Vercel preview alias `rinn-git-main-<team>.vercel.app` OR explicit preview URL OR `www.rinn.in` for prod (MUST be `www`, see callout below) | choose per current phase |
| `CRON_SECRET` in Vercel env vars (preview + prod) | https://vercel.com/dashboard → `rinn` project → Settings → Environment Variables | required — owner confirmed it matches local |

⚠️ **DO NOT paste `CRON_SECRET` into chat or commit it.** cron-job.org's UI is fine (HTTPS, encrypted at rest); just don't repeat it elsewhere.

---

## Step 1 — Get the target URL

Run `vercel login` then `vercel ls` to see deployment URLs. Pick:

- **Stable preview alias** (recommended for "preview only for now"): `https://rinn-git-main-<team>.vercel.app`. Survives across new deploys to `main`. The team slug is on your Vercel dashboard sidebar (under the team name).
- **Latest preview** (fragile): the `https://rinn-<random>-<team>.vercel.app` URL. Breaks on next push. Only use for a one-off smoke.
- **Production**: `https://www.rinn.in` once S4 ships and you're ready for live charges. **Must be `www.rinn.in`, NOT the apex `rinn.in`** — Vercel redirects apex → www with a 308, and cron-job.org does **not** follow redirects, so an apex URL silently fails every scheduled run with `Failed (308 Permanent Redirect)`. (Burned us once on 2026-05-27; provisioner script now defaults to `www.rinn.in`.)

For this runbook below, substitute `$HOST` with your chosen URL.

---

## Step 2 — Create the billing-charge cron

1. Sign in at https://cron-job.org → click **+ CREATE CRONJOB** (top right).
2. **Common tab**:
   - Title: `billing-charge`
   - URL: `https://$HOST/api/cron/billing-charge`
   - Schedule (Custom): use the cron-job.org schedule UI, but conceptually it's `30 20 * * *` UTC (= 02:00 IST).
     - Open the **Schedule** section, set to **Custom**
     - Minutes: `30`
     - Hours: `20`
     - Days/Months/Days-of-week: leave as `every`
     - **Time zone: UTC** (critical — cron-job.org defaults to your account TZ; switch it to UTC explicitly so the 20:30 means 20:30 UTC, not 20:30 local)
   - Save the schedule
3. **Advanced tab**:
   - **Request method**: `POST`
   - **Request headers**: click **+ ADD HEADER**
     - Name: `x-cron-secret`
     - Value: paste the 64-char `CRON_SECRET` from your local `.env` line 103 (must match Vercel env)
   - **Connection timeout**: `60` seconds
   - **Request timeout**: `60` seconds
   - **Treat redirects as success**: OFF
   - **Save responses**: ON (helpful for debugging; cron-job.org keeps the last N response bodies)
4. **Notifications tab**:
   - **Notify when**: `Job fails` (any non-2xx response or timeout)
   - **Send to**: your owner email (tech@digitaldsa.com or wherever you want alerts)
5. **Create cronjob** → confirm it appears in the dashboard with status `Active`.

---

## Step 3 — Create the billing-charge-reminder cron

Repeat Step 2 with these differences:

| Field | Value |
|---|---|
| Title | `billing-charge-reminder` |
| URL | `https://$HOST/api/cron/billing-charge-reminder` |
| Minutes | `0` |
| Hours | `21` |
| Time zone | **UTC** (= 02:30 IST) |
| Header | same `x-cron-secret: <CRON_SECRET>` |
| Failure notification | enable, same email |

Everything else identical.

---

## Step 3b — Create the billing-dunning-advance cron (D.1 S5)

Repeat Step 2 with these differences:

| Field | Value |
|---|---|
| Title | `billing-dunning-advance` |
| URL | `https://$HOST/api/cron/billing-dunning-advance` |
| Minutes | `30` |
| Hours | `21` |
| Time zone | **UTC** (= 03:00 IST) |
| Header | same `x-cron-secret: <CRON_SECRET>` |
| Failure notification | enable, same email |

Order is important: this fires AFTER the renewal-charge cron at 02:00 IST so a successful retry that recovers a sub to `active` is no longer in dunning when this cron looks. Reverse the order and you'd email DSAs about a state they just left.

The provisioner script (`scripts/setup-cron-jobs.mjs`) handles all three jobs idempotently — re-run it once after S5 ships to upsert the third.

---

## Step 4 — Verify all jobs fire correctly (NOW, not at 02:00 IST tomorrow)

Each job's row in the dashboard has a **"Run now"** action (▶ icon). Click it for each.

**Expected for `billing-charge`:**
- HTTP 200
- Response body: `{"success":true,"data":{"total":0,"succeeded":0,...,"batch_size":25,...}}` (zero subs means no eligible subscriptions today — expected when targeting a preview with no test data, OR a non-anchor day for prod)
- Run duration: < 1 second

**Expected for `billing-charge-reminder`:**
- HTTP 200
- Response body: `{"success":true,"data":{"total":0,"sent":0,"skipped":0,"failed":0,...}}` (zero reminders to send means no subs in the 3-4 day window)
- Run duration: < 1 second

**Expected for `billing-dunning-advance` (S5):**
- HTTP 200
- Response body: `{"success":true,"data":{"total":0,"advanced":0,"no_advancement_due":0,"skipped":0,"errors":0,...}}` (zero advances means no subs in any `dunning_*` state — expected in a clean test environment)
- Run duration: < 1 second

**Failure signatures:**
- 401 → header `x-cron-secret` wrong or missing. Check the value matches Vercel env var EXACTLY (no trailing whitespace, no quotes). Compare lengths first.
- 404 → URL wrong. Confirm `/api/cron/billing-charge` (not `billing-charges` or other typo).
- 500 → real server error. Check Vercel logs for the deploy at that URL.
- Timeout → preview deploy is cold. Trigger a real page load against the preview URL first to warm it.

---

## Step 5 — Curl verification from your terminal (independent of cron-job.org)

This proves the endpoint works WITHOUT the scheduler, so if cron-job.org shows a failure you can isolate whether the issue is the scheduler config or the deploy.

```bash
# In PowerShell on your dev machine (read CRON_SECRET from local .env)
$cron = (Get-Content .env | Select-String "^CRON_SECRET=" | ForEach-Object { $_ -replace "^CRON_SECRET=", "" })

# Replace $HOST with your chosen URL
curl.exe -X POST "https://$HOST/api/cron/billing-charge" `
  -H "x-cron-secret: $cron" -i

curl.exe -X POST "https://$HOST/api/cron/billing-charge-reminder" `
  -H "x-cron-secret: $cron" -i
```

**Both should return HTTP 200 with the same payload shape as Step 4.** If curl works but cron-job.org's "Run now" 401s, the issue is a header config in cron-job.org. If curl 401s too, the issue is the secret mismatch between local + Vercel env.

---

## Step 6 — Switch from preview to production (when S4 ships + you're ready for live charges)

When the time comes (post-S4 smoke pass):

1. cron-job.org dashboard → `billing-charge` row → **Edit**
2. Update URL: `https://$HOST/api/cron/billing-charge` → `https://www.rinn.in/api/cron/billing-charge` (canonical — NOT the apex `rinn.in`, which 308-redirects and silently fails because cron-job.org doesn't follow redirects)
3. Save. Verify the production `CRON_SECRET` env var matches.
4. Hit **Run now** to verify.
5. Repeat for `billing-charge-reminder`.

cron-job.org persists the schedule + headers across URL changes — only the URL field needs updating.

---

## Operational notes

**Daily cadence:**
- Both cron-job.org jobs fire every 24h regardless of whether today is an anchor day. The cron endpoints are designed for this — on non-anchor days the eligibility query returns 0 rows in O(log n) via the compound index (`state_1_next_charge_at_1`).
- Expect ~365 invocations/year per job. Well within cron-job.org's free tier limits.

**On the first real anchor day with real subscribers:**
- Watch the cron-job.org execution log for the first natural fire (or hit "Run now" the morning after a subscriber registers).
- Verify in MongoDB: `db.chargeAttempts.find({status: 'succeeded'}).sort({created_at: -1}).limit(5)` should show fresh attempt rows.
- Verify in `BillingTransactions`: matching `kind: 'recurring_charge'` rows.
- DSA's `billingSubscriptions.next_charge_at` should advance ~30 days.

**If a cron fires twice on the same anchor day (deploy race, scheduler retry):**
- `withCronLock('billing-charge')` will let one through, return `{skipped: 'lock_contention'}` for the other. NOT an error.
- Application-layer `probeExistingAttempt` (Pitfall #61) is the deterministic backstop — even if the lock window expired between two firings, the per-cycle idempotency probe prevents double-charge.

**If you stop getting daily success notifications:**
- cron-job.org sends ONLY failure notifications by default. Silence = success. If you want a daily "all good" email, enable "Notify when: Always" instead of "Job fails" — but that's noise after the first week.

**Rotating the CRON_SECRET:**
- Generate new hex: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
- Update Vercel env (preview AND prod)
- Update local `.env`
- Re-deploy
- Update both cron-job.org jobs' `x-cron-secret` header value
- Curl-verify from terminal before relying on the scheduler

**Sign-off** (paste here when done):

```
[ ] cron-job.org account active
[ ] Vercel env var CRON_SECRET set to the same 64-char hex on preview + (later) prod
[ ] billing-charge job created with x-cron-secret header, schedule 30 20 * * * UTC
[ ] billing-charge-reminder job created, schedule 0 21 * * * UTC
[ ] Both jobs return HTTP 200 on "Run now" against preview
[ ] Curl from terminal also returns 200 (independent verification)
[ ] Failure notifications wired to owner email
[ ] (Post-S4) URLs switched from preview to https://www.rinn.in/api/cron/... (must be `www`, not apex)
```
