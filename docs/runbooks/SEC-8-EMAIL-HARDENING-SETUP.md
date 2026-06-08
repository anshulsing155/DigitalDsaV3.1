# SEC-8 — AWS SES Email Hardening — Operator Setup Runbook

**Purpose**: provision AWS SES for `digitaldsa.com`, configure SPF/DKIM/DMARC, request production access, and wire Vercel env vars so the SEC-8 code (already shipped per `src/lib/server/emailProviders/sesProvider.ts`) starts routing real emails. Without this runbook, the SES adapter exists but is gated off — emails continue via the existing Nodemailer SMTP path.

**Why this matters**: per D.1 spec R15, dunning escalation emails (S5) MUST land in inboxes. Nodemailer through a generic SMTP relay without SPF/DKIM/DMARC has a non-trivial spam-filter rate → silent dunning downgrade → angry DSAs + churn. SES with verified domain identity + DKIM signing fixes this.

**Cost**: ~$0 for v1. SES free tier is 200 emails/day from EC2 → not applicable to Vercel; outside that it's **$0.10 per 1,000 emails**. We send a few thousand a month at launch volume → under $1/month.

**Time**: 90 min active work + 24-72 hr AWS-side review for production-access request.

**Prerequisites**:
- AWS account (existing or new — IAM-only access is fine)
- DNS access to `digitaldsa.com` (Cloudflare / Route53 / wherever the zone lives)
- Vercel project access (`rinn`) to set env vars

---

## Phase 1 — AWS SES domain verification (15 min)

### Step 1.1 — Sign in to AWS Console

Go to https://console.aws.amazon.com → switch region to **ap-south-1 (Mumbai)** (top-right region dropdown). Mumbai chosen per owner decision 2026-05-27 for latency.

### Step 1.2 — Create SES domain identity

1. Search **SES** → open **Amazon Simple Email Service**.
2. Sidebar → **Identities** → **Create identity**.
3. Identity type: **Domain**.
4. Domain: `digitaldsa.com`.
5. **Use a custom MAIL FROM domain**: enable. Set to `bounce.digitaldsa.com` (lets SES bounce-handling use a subdomain so production bounces don't pollute the main domain reputation).
6. **DKIM**: enabled by default. Identity type: **Easy DKIM (RSA_2048_BIT)**. Publishing: **Publish DNS records to Route 53** if hosted there; otherwise **Print records**.
7. **Custom configuration set**: skip for v1 (default config set is fine).
8. Click **Create identity**.

You'll see the identity in **Pending Verification** status until DNS records propagate.

---

## Phase 2 — DNS records (20 min)

If your DNS is in Route 53, AWS auto-creates these. Otherwise add manually at your DNS provider (Cloudflare / GoDaddy / etc.).

You need **5 records total**: 3 DKIM CNAMEs + 1 SPF TXT + 1 DMARC TXT. SES also gave you 2 MAIL FROM records (MX + TXT for `bounce.digitaldsa.com`).

### Step 2.1 — DKIM CNAMEs (3 records from SES)

SES gives you 3 CNAMEs like:
```
Name:  abc123._domainkey.digitaldsa.com   →   Value:  abc123.dkim.amazonses.com
Name:  def456._domainkey.digitaldsa.com   →   Value:  def456.dkim.amazonses.com
Name:  ghi789._domainkey.digitaldsa.com   →   Value:  ghi789.dkim.amazonses.com
```

Add all 3 as CNAME records at your DNS provider. **No TTL change needed; default is fine.**

### Step 2.2 — Custom MAIL FROM (2 records)

SES gives you:
```
Name:  bounce.digitaldsa.com       Type: MX    Value:  10 feedback-smtp.ap-south-1.amazonses.com
Name:  bounce.digitaldsa.com       Type: TXT   Value:  v=spf1 include:amazonses.com ~all
```

Add both.

### Step 2.3 — SPF on the apex (1 record)

If you DON'T already have an SPF record on the root domain:

```
Name:  digitaldsa.com              Type: TXT   Value:  v=spf1 include:amazonses.com -all
```

If you DO already have one (e.g. from another mail provider), **append** `include:amazonses.com` to the existing record:

```
v=spf1 include:_spf.google.com include:amazonses.com -all
```

⚠️ **Only ONE SPF record per domain.** Two SPF TXT records = invalid SPF = all your mail starts failing SPF checks. If unsure, check existing records first:

```bash
dig digitaldsa.com TXT +short | grep spf
```

### Step 2.4 — DMARC (1 record)

```
Name:  _dmarc.digitaldsa.com       Type: TXT   Value:  v=DMARC1; p=quarantine; rua=mailto:dmarc@digitaldsa.com; ruf=mailto:dmarc@digitaldsa.com; fo=1; adkim=r; aspf=r
```

- `p=quarantine`: messages failing DKIM/SPF go to spam (start here; tighten to `p=reject` after a few weeks of clean reports)
- `rua` / `ruf`: aggregate + forensic reports go to `dmarc@digitaldsa.com` (create this mailbox or alias to your security inbox)
- `adkim=r` / `aspf=r`: relaxed alignment (lets subdomain mail like `bounce.digitaldsa.com` align with the apex)

### Step 2.5 — Verify propagation

```bash
# DKIM (3 records, should resolve to dkim.amazonses.com)
dig abc123._domainkey.digitaldsa.com CNAME +short

# MAIL FROM (MX + SPF)
dig bounce.digitaldsa.com MX +short
dig bounce.digitaldsa.com TXT +short

# Apex SPF
dig digitaldsa.com TXT +short

# DMARC
dig _dmarc.digitaldsa.com TXT +short
```

Wait 5-30 min for DNS to propagate, then go back to SES console → Identities → your domain. It should flip from **Pending Verification** → **Verified** within a few minutes after DNS resolves.

---

## Phase 3 — IAM credentials (10 min)

SEC-8 spec calls for least-privilege IAM access. Create a dedicated user for the app — no console access, just programmatic.

### Step 3.1 — Create IAM policy

1. Console → **IAM** → **Policies** → **Create policy**.
2. JSON editor — paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SendEmailFromAnyIdentity",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowGetSendingStats",
      "Effect": "Allow",
      "Action": [
        "ses:GetSendQuota",
        "ses:GetSendStatistics",
        "ses:GetAccount"
      ],
      "Resource": "*"
    }
  ]
}
```

⚠️ **Why `Resource: "*"` and not a narrow `identity/<domain>` ARN?** SES v2's IAM evaluation (the v2 SendEmail API at `/v2/email/outbound-emails`) is stricter about resource matching than the v1 ARN format `identity/<domain>` suggests. A policy scoped to `arn:aws:ses:<region>:<acct>:identity/digitaldsa.com` returns **403 Access Denied** on every v2 SendEmail call, even though that ARN format works fine for SES v1 SendEmail. Surfaced during 2026-05-27 setup: first IAM policy used the narrow ARN, every send 403'd. Broadening to `Resource: "*"` fixed it instantly.

**Risk of `Resource: "*"` for this account**: low. You only have ONE verified identity (`digitaldsa.com`) in this account, so the IAM user can only send from that one identity anyway. If you later add multiple identities and want strict per-identity scoping, see the AWS SES v2 IAM docs for the correct resource format — the classic `identity/<name>` does NOT work as documented.

3. Name: `digitaldsa-ses-send-policy`. Create.

### Step 3.2 — Create IAM user

1. **IAM** → **Users** → **Create user**.
2. Name: `digitaldsa-ses-sender`.
3. Console access: NO. Programmatic only.
4. **Attach policies directly** → search `digitaldsa-ses-send-policy` → check it.
5. Create user.

### Step 3.3 — Create access key

1. Open the user → **Security credentials** → **Create access key**.
2. Use case: **Application running outside AWS** (Vercel).
3. Acknowledge the recommendation, **Next**, **Create**.
4. **Copy both** `Access key ID` and `Secret access key` IMMEDIATELY (the secret is shown ONCE).

---

## Phase 4 — Vercel env vars (5 min)

Vercel dashboard → `rinn` project → **Settings** → **Environment Variables**.

Add the following **to both Production AND Preview scopes**:

| Name | Value |
|---|---|
| `EMAIL_PROVIDER` | `ses` |
| `AWS_REGION` | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | (Access key ID from Phase 3.3) |
| `AWS_SECRET_ACCESS_KEY` | (Secret access key from Phase 3.3) |
| `SES_FROM_EMAIL` | `noreply@digitaldsa.com` |

**Optional but recommended**:

| Name | Value |
|---|---|
| `SES_REPLY_TO_EMAIL` | `support@digitaldsa.com` |

After saving, **redeploy** (Vercel auto-redeploys on env-var change; or trigger manually).

---

## Phase 5 — Request production access (24-72 hr Amazon review)

New SES domains start in **sandbox mode** — you can only send to verified recipients. To send to real DSAs, request production access.

1. SES Console → **Sending statistics** → top of page should show a yellow banner: **"Your Amazon SES account is in the sandbox."** Click **Request production access**.
2. **Use case description**:

> DigitalDSA is a B2B SaaS platform serving Direct Selling Agents (DSAs) in India for multi-lender loan orchestration. We send transactional emails ONLY: account verification OTPs, subscription renewal confirmations, dunning notices for failed payments, and team-invite links. All recipients are authenticated DSAs who have created an account and consented to platform communications. No marketing or bulk sends. Estimated volume: ~2,000-5,000 emails/month at launch, growing to ~20,000/month within 6 months.

3. **How do you plan to handle bounces and complaints**:

> Our application logs every send and tracks bounce/complaint rates via the SES console. We will subscribe an SNS topic for bounce notifications (planned for the next phase) and mark hard-bounced recipient emails as invalid in our user database to prevent further sends. We comply with CAN-SPAM and use a single transactional From address with a Reply-To set to our support inbox.

4. **Mail type**: Transactional.
5. **Website URL**: `https://rinn.in`.
6. **Additional contacts**: your security/ops email.

Submit. AWS reviews within 24-72 hr; you'll receive a follow-up email. If they ask clarifying questions, respond promptly — silence stalls the request.

Until approval lands, you're stuck in sandbox: SES sends only succeed to verified recipient addresses. You can verify your own test emails in the SES console to keep developing in the meantime.

---

## Phase 6 — Live verification (after Vercel redeploy + sandbox-or-production-ready)

### Step 6.1 — Verify SES is the selected provider

Curl an admin health-check endpoint OR check the dev server logs after any email send — log lines should now show `provider: 'ses'` instead of `provider: 'nodemailer'` or `provider: 'log-only'`.

### Step 6.2 — Trigger a real send

In SANDBOX mode, first verify a test recipient email in SES console (Identities → Create identity → Email address). Then:

```bash
# Trigger the existing OTP flow against your dev/preview against a verified recipient
curl -X POST https://rinn-git-main-<team>.vercel.app/api/auth/send-email-verification \
  -H "Content-Type: application/json" \
  -d '{ "email": "you+sestest@digitaldsa.com" }' -i
```

Verify in your inbox:
- Email received (not in spam)
- Headers show `Authentication-Results: ... dkim=pass ... spf=pass ... dmarc=pass`
- From address: `noreply@digitaldsa.com`

In PRODUCTION (post-approval):
- Same curl works without recipient pre-verification
- DMARC reports start arriving at `dmarc@digitaldsa.com` (typically within 24 hr; review weekly for the first month, then monthly)

### Step 6.3 — Tighten DMARC (after 2-4 weeks of clean reports)

Once DMARC reports show 100% of digitaldsa.com mail authenticated through SES (no spoofers, no misconfigured subsystems), tighten:

```
v=DMARC1; p=reject; rua=mailto:dmarc@digitaldsa.com; ruf=mailto:dmarc@digitaldsa.com; fo=1; adkim=s; aspf=s
```

- `p=reject`: spoofed mail bounces (vs `quarantine` which sends to spam)
- `adkim=s` / `aspf=s`: strict alignment (subdomain mail must align exactly)

---

## Operational notes

**Bounce handling** (post-launch enhancement, NOT in SEC-8 v1 scope): subscribe an SNS topic to your SES configuration set, wire it to a Vercel endpoint that marks the bounced email as invalid on the user doc. Hard bounces (permanent: invalid mailbox) → mark user email invalid + stop sending. Soft bounces (temporary: mailbox full) → retry next cycle.

**Complaint handling**: same SNS pattern. A user clicking "Report spam" on a transactional email is a red flag — the abuse rate threshold AWS enforces is 0.1%; above that, your sending privileges get throttled.

**Reputation monitoring**: SES Console → Sending statistics → daily review for the first month. Bounce rate target: <5%. Complaint rate target: <0.1%. Above thresholds → review your audience list and email content.

**Key rotation**: rotate `AWS_SECRET_ACCESS_KEY` every 90 days. AWS doesn't enforce this; it's a hygiene practice. Easiest path: create a second access key, update Vercel env to use it, redeploy, then delete the old key from the IAM user.

**Removing Nodemailer eventually**: once SES has been running cleanly for 30 days, the Nodemailer SMTP creds in `.env` can be removed (set `SMTP_USER=` to empty). The provider-selection facade in `email.ts` will skip the Nodemailer branch and either use SES (live) or log-only (dev with no AWS creds). The Nodemailer package can be removed from dependencies in a separate cleanup PR per owner decision 2026-05-27 (kept as fallback for v1).

---

## Sign-off

Paste here when each phase is done:

```
[ ] Phase 1: SES domain identity created (digitaldsa.com, ap-south-1) — Pending status
[ ] Phase 2: All 5+ DNS records added (DKIM × 3, MAIL FROM × 2, SPF × 1, DMARC × 1)
[ ] Phase 2: SES identity flipped to Verified status
[ ] Phase 3: IAM user digitaldsa-ses-sender created with policy attached
[ ] Phase 3: Access key generated and copied
[ ] Phase 4: Vercel env vars set (Production + Preview scopes) and redeploy triggered
[ ] Phase 5: Production access request submitted (date: ____________)
[ ] Phase 5: Production access approved (date: ____________)
[ ] Phase 6: Live test send succeeded; headers show dkim=pass, spf=pass, dmarc=pass
[ ] Phase 6: dmarc@digitaldsa.com mailbox / alias receiving aggregate reports
```

**SEC-8 is fully done** when all 10 checkboxes are ticked. Until then the code (already shipped) routes through Nodemailer or log-only — production fallback path stays intact.

**Then**: D.1 S5 dunning escalation is unblocked. The dunning emails (4 templates, sent at day 3/7/8 boundaries) finally have a high-deliverability path that won't silently spam-filter into oblivion.
