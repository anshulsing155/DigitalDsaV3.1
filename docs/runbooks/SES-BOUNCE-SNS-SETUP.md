# SES Bounce/Complaint SNS — Operator Setup Runbook

**Purpose**: wire AWS SES to publish bounce + complaint events to an SNS topic, and subscribe our `/api/webhook/ses-bounce` endpoint to that topic. Once live, permanent bounces and spam complaints flip the affected DSA's `email_status` to `suppressed_bounce` / `suppressed_complaint`, and `sendEmail()` silently skips those addresses on subsequent sends.

**Why this matters**: today's safeguard is SES's account-level suppression list — AWS silently drops the message at their side. That gives us zero observability (we never see the failed delivery) and zero recovery affordance (admin tool can't flip a user's "suppressed" flag without an AWS console action). Our per-user `email_status` field fixes both.

**Cost**: ~$0. SNS HTTPS notifications are $0.60 per million; we'll send a few thousand a month at launch volume.

**Time**: ~25 min active work.

**Prerequisites**:
- SEC-8 SES domain verification already complete (see `SEC-8-EMAIL-HARDENING-SETUP.md`).
- Vercel project access (`rinn`) to set env vars.
- Code commits `02553e88` (webhook + suppression list) on `origin/main` and deployed.

---

## Phase 1 — Create the SNS topic (5 min)

### Step 1.1 — Sign in + region check

Go to https://console.aws.amazon.com → switch region to **ap-south-1 (Mumbai)** (top-right). Must match the SES region from SEC-8.

### Step 1.2 — Create the topic

1. Search **SNS** → open **Amazon Simple Notification Service**.
2. Sidebar → **Topics** → **Create topic**.
3. Type: **Standard** (FIFO not needed — SNS dedup is at the message ID level, our webhook re-dedups on `MessageId`).
4. Name: `ses-bounce-complaint`
5. Display name: `SES Bounce + Complaint`
6. Leave all other settings as default.
7. Click **Create topic**.

After creation, copy the **ARN** from the topic detail page. It looks like:
```
arn:aws:sns:ap-south-1:466798855067:ses-bounce-complaint
```
You'll need it twice — once in SES (step 2.3) and once in Vercel env vars (Phase 4).

---

## Phase 2 — Wire SES to publish events to the topic (10 min)

SES "Configuration Sets" are how SES knows to forward event types (Bounce, Complaint, Delivery, etc.) to a destination like SNS. We'll create a configuration set + event destination, then update `sendEmail` to route through that set.

### Step 2.1 — Create the configuration set

1. Search **SES** → **Configuration sets** (left sidebar) → **Create set**.
2. Name: `digitaldsa-production`
3. Leave all default settings (reputation tracking on, sending paused off).
4. Click **Create set**.

### Step 2.2 — Add SNS event destination

1. On the new config set's page, **Event destinations** tab → **Add destination**.
2. Step 1 — Event types: enable **Bounces** + **Complaints**. Optionally also enable **Deliveries** (informational, increases SNS volume — skip if cost-sensitive).
3. Step 2 — Destination type: **Amazon SNS**.
4. Step 3 — Name: `ses-bounce-sns`. SNS topic: select the `ses-bounce-complaint` topic from Phase 1.
5. Click **Add destination**.

### Step 2.3 — Verify the SES → SNS link

Back on the SNS topic page, you should NOT see a subscription yet — events flow directly from SES to the topic, and the webhook subscription is a separate step. (Don't confuse "subscription to the topic" with "SES event destination". They're different.)

---

## Phase 3 — Subscribe the webhook to the topic (5 min)

### Step 3.1 — Create the HTTPS subscription

1. SNS console → **Topics** → `ses-bounce-complaint` → **Create subscription**.
2. Protocol: **HTTPS**.
3. Endpoint: `https://www.rinn.in/api/webhook/ses-bounce`
   - **Must be `www.rinn.in`** (canonical), not apex `rinn.in` — same lesson as the cron-job.org 308 trap (commit `ea9ebedf` 2026-05-27). Apex 308-redirects, SNS doesn't follow redirects.
4. **Enable raw message delivery: OFF**. Our webhook expects the full SNS envelope (with `Signature`, `SignatureVersion`, `TopicArn`, etc.) for signature verification. Raw delivery strips that envelope.
5. Click **Create subscription**.

### Step 3.2 — Confirm the subscription (automatic)

AWS will POST a `SubscriptionConfirmation` message to our webhook within a few seconds. Our webhook:
1. Verifies the SNS signature (rejects forged confirmations).
2. Verifies the `TopicArn` matches `SES_BOUNCE_TOPIC_ARN` — **wait, you haven't set this env var yet!** The webhook will reject the confirmation with 503 until Phase 4 is done.

Two options:
- **Easier**: do Phase 4 BEFORE this step. Order is reversible.
- **If you already did this step**: after Phase 4 + redeploy, go to the SNS console subscription row and click **Request confirmation** to retry. SNS resends every 3 days for 30 days; one retry is enough.

The subscription status will flip from `Pending confirmation` to `Confirmed` once the GET hits the `SubscribeURL`.

---

## Phase 4 — Vercel env vars (3 min)

### Step 4.1 — Set SES_BOUNCE_TOPIC_ARN

1. https://vercel.com → `rinn` project → **Settings** → **Environment Variables**.
2. Add new variable:
   - **Key**: `SES_BOUNCE_TOPIC_ARN`
   - **Value**: paste the topic ARN from Phase 1 (e.g. `arn:aws:sns:ap-south-1:466798855067:ses-bounce-complaint`)
   - **Environments**: enable Production + Preview (not Development — local dev doesn't process bounces)
3. Save.

### Step 4.2 — (Optional but recommended) Route SES sends through the config set

The webhook only fires for sends that go through `digitaldsa-production`. Email currently sent without specifying a config set won't generate bounce events to our topic — only SES's account-level suppression list will record them.

For complete coverage, update the SES adapter to attach the config set on every send. Add to Vercel env:
- **Key**: `SES_CONFIGURATION_SET`
- **Value**: `digitaldsa-production`
- **Environments**: Production + Preview

Then the SES provider can read it and pass it to the `SendEmailCommand` config set parameter. **Heads-up**: this is a code change in `src/lib/server/emailProviders/sesProvider.ts`; not required for v1 sandbox but worth doing before sending real volume.

### Step 4.3 — Redeploy

Either push an empty commit or hit **Redeploy** on the latest Vercel deployment. Env-var changes don't take effect until redeploy.

---

## Phase 5 — Smoke test (3 min)

### Step 5.1 — Confirm the subscription is `Confirmed`

SNS console → `ses-bounce-complaint` → Subscriptions → the HTTPS row should show **Confirmed**.

If still **Pending confirmation**: re-trigger via **Request confirmation** on that row.

### Step 5.2 — Trigger a bounce (SES mailbox simulator)

SES provides simulator addresses that always trigger a specific outcome without sending real email. Useful for end-to-end smoke without burning real reputation.

From the AWS SES console → **Send test email**:
- From: a verified domain identity in your account (e.g. `noreply@digitaldsa.com`)
- To: `bounce@simulator.amazonses.com`
- Subject: `SES bounce smoke test`
- Body: anything
- **Configuration set**: `digitaldsa-production` ← MUST select this
- Click **Send**.

Within ~10 seconds, the webhook should receive a `Notification` message with `notificationType: 'Bounce'` and `bounceType: 'Permanent'`. Check:

1. **Vercel logs** for the deployment — search for `ses-bounce webhook: processed event`. You should see `{ event: 'Bounce', suppressed: 0 }` (zero because `bounce@simulator.amazonses.com` isn't in your DsaApplications collection, but the webhook ran successfully).

2. **MongoDB** — confirm the dedup row landed:
   ```js
   db.processedWebhookEvents.findOne({ _id: { $regex: /^sns:/ } })
   ```
   Should return a recent row matching the SNS MessageId.

### Step 5.3 — Trigger a real-recipient bounce

To verify the full path including the suppression flag, repeat 5.2 but with a real test DSA's email. Pick a DSA who:
- Already exists in `DsaApplications` (so the suppression-list write has something to match).
- Has a verified email you can later flip back to `active` from the admin tool.

Send via the SES "Send test email" feature with the recipient's address replaced by `<real-email>+bounce@<their-domain>` or use the simulator with `bounce+test@simulator.amazonses.com`. (The `+suffix` trick lets you send to a forwarding address that won't actually arrive but still triggers a SES-side delivery attempt; this only works on providers that ignore plus-addressing.)

A simpler reliable way: temporarily set a real test DSA's email to `bounce@simulator.amazonses.com` for one send, then revert.

Verify:
```js
db.dsaApplications.findOne(
  { email: '<test-email>' },
  { projection: { email: 1, email_status: 1, email_suppressed_at: 1 } }
)
```
Expect: `email_status: 'suppressed_bounce'`, `email_suppressed_at: <recent timestamp>`.

### Step 5.4 — Verify sendEmail respects the suppression

Once a DSA's `email_status` is `suppressed_bounce`, any subsequent `sendEmail` call to their address should return `{ success: false, error: 'all_recipients_suppressed' }` without calling SES. Confirm by:
1. Trigger an in-app action that emails the DSA (e.g. manually invoke a test endpoint).
2. Check Vercel logs for `sendEmail: dropped suppressed recipients`.
3. Reset by manually updating MongoDB:
   ```js
   db.dsaApplications.updateOne(
     { email: '<test-email>' },
     { $unset: { email_status: '', email_suppressed_at: '' } }
   )
   ```

---

## Operational notes

**Subscription expiry:**
SNS HTTPS subscriptions don't expire as long as the endpoint keeps returning 200. If our webhook starts 500-ing consistently (deploy issue), SNS retries with exponential backoff for a few days then disables the subscription. To re-enable: confirm again via **Request confirmation**.

**Volume:**
At launch volume (a few thousand emails/month), bounce + complaint rate is typically <1%, so SNS traffic is in the tens-of-events-per-month range. Cost is negligible. The webhook is sub-100ms server-side; Vercel cold-starts add ~500ms occasionally.

**Soft bounces:**
Our webhook NEVER suppresses on transient bounces — only `bounceType: 'Permanent'`. A DSA whose mailbox was temporarily full or whose Out-of-Office hit a quirky rule won't be silently locked out. SES's own internal retry handles transient cases.

**Complaint feedback:**
Every Complaint is treated as a hard signal regardless of `complaintFeedbackType`. The user clicked "this is spam" or similar; we suppress immediately. Operator can flip back to `active` after triage.

**Admin recovery tool (NOT IN THIS RELEASE):**
The current path to un-suppress is mongosh + manual `$unset`. A future admin-dashboard affordance (D.6 territory) will surface the suppression flag + a "Re-enable email" button. For v1, this runbook + manual Mongo is the recovery path.

**SES sandbox mode caveat:**
While AWS Support case **177987930900751** reviews production access, SES will only deliver to verified recipients. Bounces in test traffic are minimal because the simulator addresses are always-bounce by design. Once AWS approves, the bounce volume reflects real-world rates and the suppression list starts doing meaningful work.

---

## Sign-off

```
[ ] SNS topic `ses-bounce-complaint` created in ap-south-1
[ ] SES configuration set `digitaldsa-production` created
[ ] SES event destination wired (Bounces + Complaints → SNS topic)
[ ] HTTPS subscription to https://www.rinn.in/api/webhook/ses-bounce — Confirmed
[ ] Vercel env var `SES_BOUNCE_TOPIC_ARN` set on Production + Preview
[ ] Vercel redeploy triggered
[ ] Smoke 5.2 (simulator bounce) → webhook returns 200, dedup row in MongoDB
[ ] (Optional) Vercel env var `SES_CONFIGURATION_SET` set + sesProvider.ts updated
[ ] (Optional) Smoke 5.3 + 5.4 verified suppression flag set + sendEmail respects it
```
