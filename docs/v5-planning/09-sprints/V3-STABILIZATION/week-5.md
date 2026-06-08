---
type: sprint
phase: V3-STABILIZATION
week: 5
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 5 — Beta Tooling + India Infra + Monitoring

## Goal

Make V3 operationally ready: India data sovereignty verified, monitoring live, feedback collection embedded, new-DSA onboarding smooth.

## Tasks

| Task | Owner | Acceptance |
|---|---|---|
| Verify MongoDB Atlas region = Mumbai | Engineer 8 | Atlas console screenshot in runbook; verified via API |
| Log PII sweep: no mobile/PAN/Aadhaar in logger calls | Engineer 8 | Lint rule live; 7-day log audit clean; Sentry scrub config tested |
| Sentry self-hosted on Mumbai VPS | Engineer 8 | Up at sentry.internal.digitaldsa.com; PII scrub on `beforeSend` |
| In-app feedback widget on every DSA-facing page | Engineer 9 | One-click form; attaches breadcrumbs; routes to support inbox |
| New-DSA onboarding flow with sample case | Engineer 9 | New DSA can sign up → see sample case → understand workflow in < 5 min |
| Beta invite system | Engineer 10 | Invite codes (limited supply), capacity caps, usage tracking |
| Status page (Uptime Kuma on Mumbai VPS) | Engineer 10 | status.digitaldsa.com live; monitors web, API, Mongo, WA, Razorpay |
| Support email routing | Engineer 10 | support@digitaldsa.com → team queue with Sentry-link enrichment |

## Mongo Atlas Mumbai verification

```bash
# Via API
mongocli atlas clusters describe <cluster> --output json | jq '.providerSettings.regionName'
# Expected: AP_SOUTH_1

# Via UI
Atlas console → Cluster → Configuration → Region: should show "Mumbai (ap-south-1)"
```

Screenshot in `docs/runbooks/INFRA-VERIFICATION.md`.

## Log PII sweep

1. Pull last 7 days of Vercel logs via API
2. Pattern-scan for:
   - 10-digit sequences (mobile)
   - PAN pattern: `\b[A-Z]{5}\d{4}[A-Z]\b`
   - Aadhaar pattern: `\b\d{4}\s?\d{4}\s?\d{4}\b`
   - Email pattern: `\b[\w.+-]+@[\w-]+\.[\w.-]+\b`
3. Report findings; for each: identify the source code line; remove or scrub
4. Add lint rule for future PRs
5. Add Sentry `beforeSend` scrub as defence-in-depth

## Sentry self-host on Mumbai VPS

Two options:
1. **Sentry Open Source** (full Sentry, complex setup)
2. **GlitchTip** (Sentry-API-compatible, lightweight, simpler)

We pick **GlitchTip** for Beta — easier to operate. Migrate to full Sentry later if we need advanced features.

Setup:
- AWS EC2 t3.small in ap-south-1
- Docker Compose with GlitchTip + Postgres + Redis (all in Mumbai)
- HTTPS via Let's Encrypt
- DSN replaces existing Sentry DSN in app config

## Feedback widget design

Bottom-right of every DSA-facing page:
- Floating "?" button
- Click → small form:
  - Type: bug / suggestion / praise / question
  - Description (1-3 sentences)
  - Optional screenshot attach (mobile camera or file pick)
- Submit → POST to `/api/internal/feedback` → email to support + attach breadcrumbs

## Onboarding flow with sample case

New DSA signs up → sample case appears in their dashboard pre-loaded:
- Customer: "Demo Borrower" (clearly marked sample)
- Case: HL with realistic-but-fake numbers
- Walkthrough modal explains: "Here's what the engine produced. Try editing the form. Try requesting a doc. When ready, create your first real case."
- Sample data is flagged `is_sample: true` and excluded from analytics

Language picker at the very start: en / hi / Hinglish.

## Status page

Uptime Kuma instance:
- Monitors: dashboard.digitaldsa.com, api.digitaldsa.com, MongoDB connectivity, WhatsApp BSP synthetic test, Razorpay API ping
- Status: Up / Degraded / Down per service
- Incident history visible
- Public

## Exit criteria

- All 8 tasks above complete and signed off
- Mumbai infra verified end-to-end
- Sentry-Mumbai live; PII scrub tested with fake-PII test event
- Feedback widget tested on each major page
- Onboarding flow timed to < 5 min for a fresh DSA
- Status page live and monitoring everything

## Owner involvement

- Approval on infra decisions (GlitchTip choice, VPS sizing)
- Review of onboarding copy (language, tone)
- ~1 hour/day
