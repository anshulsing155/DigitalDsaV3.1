---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Stabilisation — 6-Week Close-out

## Goal

A V3 that lets 50 Beta DSAs evaluate real loan files and produce real offer PDFs, with the engine producing complete results for every encoded lender × loan combination. Six weeks. Then we hand it to the team and pivot to V5.

## What we cut, explicitly

We cut everything that isn't directly needed for "Beta DSA evaluates loan files and produces offer documents." All architecture changes, all new modules, all customer-entity work — that's V5.

| Tempting addition | Decision |
|---|---|
| Customer entity in V3 | **CUT** — V5 |
| Universal Search | **CUT** — V5 |
| WhatsApp Business API dispatch | **CUT** — V3 keeps wa.me deeplinks |
| Follow-up engine | **CUT** — V5 |
| Commission tracking | **CUT** — V5 |
| 7-role team | **CUT** — V5 |
| Lender Hub 3-band | **CUT** — V5 |
| Hinglish locale | **CUT** — V5 |
| Mobile app polish | **CUT** — V5 has parity from day 1 |
| External Partner CRM | **CUT** — V5 |

## Week-by-week

### Week 1 — Discharge in-flight + start LEND-1 close-out

| Task | Owner | Exit criteria |
|---|---|---|
| Commit S216 (billing UX) batch | Engineer 1 | On main, tests green |
| Commit S217 (Plot & Equity Ph 1/2) batch | Engineer 1 | On main, tests green |
| Ship ConfirmModal redesign | Engineer 2 | 5 decisions surfaced, on main, age counter resets |
| Begin LEND-1 Phase 3 (parser spec) | Engineer 2 | First half drafted |

### Week 2 — Finish LEND-1 + PMS gap analysis

| Task | Owner | Exit criteria |
|---|---|---|
| LEND-1 Phase 3 complete (parser spec additions) | Engineer 2 | Document signed off, in repo |
| LEND-1 Phase 4 (offer card UI + file-builder PDF) | Engineer 2 | UI shipped, PDF mirrors 4-number breakdown |
| PMS gap analysis spreadsheet | Engineers 3-6 | Coverage matrix of 6 loan types × top 10 lenders, current state graded red/amber/green |
| Engineer assignments per loan type | Lead | Eng 3 = Home, Eng 4 = LAP, Eng 5 = Personal, Eng 6 = Business; Eng 2 covers Plot, Pro after LEND-1 |

### Week 3 — PMS coverage push

| Task | Owner | Exit criteria |
|---|---|---|
| PMS encode for Home Loan top 10 lenders | Engineer 3 | All green or amber with reason |
| PMS encode for LAP top 10 lenders | Engineer 4 | Same |
| PMS encode for Personal top 10 lenders | Engineer 5 | Same |
| PMS encode for Business top 10 lenders | Engineer 6 | Same |
| PMS encode for Plot + Professional | Engineer 2 | Same |
| Coverage matrix view live in admin | Engineer 8 | Real-time grade per cell |

**Gate at end of week 3:** ≥ 50 of 60 cells (top 10 lenders × 6 loan types) green. Remaining amber cells documented in UI as "Lender not yet fully configured."

### Week 4 — Engine regression sweep + file builder verification

| Task | Owner | Exit criteria |
|---|---|---|
| 90-case regression fixture (6 loans × 5 profiles × 3 cities) | Engineer 7 | In CI, runs on every PR |
| Fix any "lender not configured" leakage | Engineer 7 | All 90 cases produce complete results |
| File-builder PDF clean for all 6 loan types | Engineer 7 | Manual QA pass on 90 cases |
| PII redaction on PDF output verified | Engineer 8 | Lock test on PDF render |
| Engine evaluation p95 < 2 seconds per case | Engineer 7 | Measured, in dashboard |

### Week 5 — Beta tooling + India infra basics + monitoring

| Task | Owner | Exit criteria |
|---|---|---|
| Mongo Atlas region verified Mumbai-locked | Engineer 8 | Atlas screenshot in runbook |
| Log PII sweep: no mobile/PAN/Aadhaar in any log line | Engineer 8 | Lint rule live, 7-day log audit clean |
| Sentry self-hosted on Mumbai VPS | Engineer 8 | Live, PII scrub on `beforeSend` |
| In-app feedback widget on every page | Engineer 9 | One-click form, attaches breadcrumbs to issue |
| New-DSA onboarding flow with sample case | Engineer 9 | Under 5 min, language picker live |
| Beta invite system | Engineer 10 | Invite codes, capacity caps, usage tracking |

### Week 6 — Smoke + handoff

| Task | Owner | Exit criteria |
|---|---|---|
| Final 90-case smoke + manual QA pass | Engineer 7 | All pass |
| Team runbook (top 10 likely Beta issues) | Engineer 10 | Doc in repo, reviewed |
| Support email + status page live | Engineer 10 | support@digitaldsa.com routing, status.digitaldsa.com hosting on Mumbai VPS |
| First 10-20 Beta DSAs invited | Team lead | Onboarded, first cases created |

## SEC decisions for V3 Beta

### SEC-7 (credential rotation) — keep deferred

The `.env` was committed to git history 19 times historically. Rotating all credentials (Atlas, Razorpay, MSG91, ImageKit, JWT, HMAC, CSRF) takes ~1 week of operational work. With Beta being a closed 50-DSA cohort and the repo private, the exposure window is acceptable for V3 Beta.

**Mandatory before V5 GA. Not before V3 Beta.**

### SEC-8 (SES email) — sandbox or production

AWS Support case 177987930900751 is open for SES production access. Two scenarios:

| AWS state at end of Week 5 | Action |
|---|---|
| Production approved | Real-recipient sends work, full email flow live |
| Still pending | Ship Beta in SES sandbox mode — only verified recipients receive email. Verify each Beta DSA's email at onboarding. |

Either way, V3 Beta launches Week 6.

## Our daily time budget on V3 close-out

Roughly 1 hour each per day. Code review, blocker triage, the occasional decision. We don't write V3 code ourselves — the team does. We supervise.

The other 5-7 hours of our day go to V5 Sprint 0 planning (running in parallel — see [02-PHASING.md](02-PHASING.md) calendar view).

## Related docs

- [04-TEAM-CHARTER.md](04-TEAM-CHARTER.md) — Engineer assignments and team's mission during Beta
- [05-BETA-LAUNCH-GATE.md](05-BETA-LAUNCH-GATE.md) — 10 gates that must pass before Beta opens
- [06-CUSTOMER-FEEDBACK-LOOP.md](06-CUSTOMER-FEEDBACK-LOOP.md) — How Beta feedback flows back to V5
