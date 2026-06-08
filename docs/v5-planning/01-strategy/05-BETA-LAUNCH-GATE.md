---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Beta Launch Gate — 10 Gates That Must Pass

We launch V3 Beta only if every one of these is green. If any is red on Week 6 Friday, we slip Beta by a week. No rushing. Customer feedback is only useful if the product underneath it is sound.

## The 10 gates

| # | Gate | Owner | How we verify |
|---|---|---|---|
| 1 | **90-case regression fixture: all pass with full engine result** | Engineer 7 | CI run on main branch shows green; manual spot-check on 10 random cases |
| 2 | **File-builder produces clean PDF for all 6 loan types** | Engineer 7 | Manual QA pass on 90-case fixture; PDF rendered, opens, content correct, PII redacted |
| 3 | **≥ 50 of 60 PMS cells green** (top 10 lenders × 6 loan types) | Engineers 3-6 | Admin coverage matrix screenshot; amber cells documented with reason |
| 4 | **MongoDB Atlas region = Mumbai (verified)** | Engineer 8 | Atlas console screenshot in runbook; verified via API query for region |
| 5 | **Sentry self-hosted on Mumbai VPS, PII scrub working** | Engineer 8 | Sentry instance reachable; test event with PII pattern (mobile, PAN, Aadhaar) shows scrubbed payload |
| 6 | **No PII pattern detected in last 7 days of logs** | Engineer 8 | Log scan script reports clean; lint rule live in CI |
| 7 | **In-app feedback widget on every page** | Engineer 9 | Manual click-through on all 20+ DSA-facing routes; one-click form opens, attaches breadcrumb, lands in support inbox |
| 8 | **Onboarding flow works for new DSA in under 5 minutes** | Engineer 9 | Time-trial: new DSA goes from sign-up → sample case visible → ready to create real case, in under 300 seconds |
| 9 | **Team runbook covers top 10 likely Beta issues** | Engineer 10 | Runbook reviewed by Lead + Owner; each issue has steps to triage + escalate |
| 10 | **Status page + support email live** | Engineer 10 | status.digitaldsa.com loads, support@digitaldsa.com routes to team queue |

## The 90-case regression fixture

Six loan types × five representative borrower profiles × three cities = 90 cases.

**Loan types:** Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, Professional Loan.

**Borrower profiles:**
1. Salaried, ₹50k/month, age 32, no co-applicant
2. Salaried, ₹2L/month, age 42, with spouse co-applicant
3. Self-employed, ₹1.5L/month declared, age 38, 5-year ITR history
4. Self-employed professional (CA), ₹3L/month, age 45, with property collateral
5. Business owner, ₹5L/month, age 50, with two co-applicants and a guarantor

**Cities:** Mumbai (Tier-1 metro), Pune (Tier-1 non-metro), Indore (Tier-2).

**Expected outcomes per case:**
- Engine returns at least one offer per lender configured for that combination
- Eligibility verdict computed (eligible / restricted / rejected) with reasons
- LTV / FOIR / EMI math correct against fixture expectations
- File-builder PDF generates without errors
- PDF contains all required disclaimers and no full PII (Aadhaar fully masked, mobile mid-masked)

## Slip policy

If any gate is red on Week 6 Friday:

| Gates red | Action |
|---|---|
| Gates 4, 5, 6 (India infra) red | Hard slip — Beta cannot launch without data sovereignty |
| Gates 1, 2 (engine + PDF) red | Hard slip — Beta cannot launch with broken core |
| Gate 3 amber (40-49 green of 60) | Soft slip — launch with reduced lender coverage, target 50/60 by Week 8 |
| Gates 7, 8, 9, 10 (operational) red | Soft slip — 1 week extension, do not invite DSAs until green |

**Owner makes the final call.** Engineers do not soft-launch on their own initiative.

## What "ready" looks like

When all 10 gates are green:

1. **Owner sends Beta cohort invitations** (first 10 DSAs from the shortlist).
2. **Team engineers open onboarding calls** within 48 hours of invite acceptance.
3. **Status page shows green.** Public messaging: "DigitalDSA Beta is live."
4. **Daily monitoring rhythm starts.** Team lead reviews Sentry + status + feedback widget daily.
5. **Owner is on standby** for first 72 hours — if anything critical breaks, escalates to V5 from V3.

## Related docs

- [03-V3-STABILIZATION.md](03-V3-STABILIZATION.md) — Week-by-week plan that delivers these gates
- [06-CUSTOMER-FEEDBACK-LOOP.md](06-CUSTOMER-FEEDBACK-LOOP.md) — Post-Beta-launch rhythm
- [../04-security/01-PII-DISCIPLINE.md](../04-security/01-PII-DISCIPLINE.md) — Why gates 5 and 6 matter
