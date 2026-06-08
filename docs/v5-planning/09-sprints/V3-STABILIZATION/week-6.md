---
type: sprint
phase: V3-STABILIZATION
week: 6
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 6 — Smoke + Handoff + Beta Launch

## Goal

Final pre-launch verification, team handoff documentation, Beta cohort invitations sent.

## Tasks

| Task | Owner | Acceptance |
|---|---|---|
| Final 90-case smoke run (week 4 fixture rerun) | Engineer 7 | All pass; no regression since Week 4 |
| Manual QA pass on 10 random cases | Engineer 7 + Lead | Each case completed end-to-end manually |
| Team runbook (top 10 likely Beta issues) | Engineer 10 | Doc in repo with triage steps |
| Beta DSA onboarding pack | Engineer 10 + Owner | Welcome email, walkthrough video, consent template |
| Support email + queue system | Engineer 10 | First-response SLA defined; team rotation set |
| First 10-20 Beta DSAs invited | Team lead + Owner | Invitations sent; onboarding calls scheduled |
| First-day live monitoring | All engineers | Sentry + status page watched; bugs triaged in real-time |

## The Beta launch gate review

Walk through all 10 gates from [../../01-strategy/05-BETA-LAUNCH-GATE.md](../../01-strategy/05-BETA-LAUNCH-GATE.md). Owner makes the launch call by Wednesday.

If any gate is red:
- Mongo region not Mumbai → hard slip
- Engine regression failing → hard slip
- PMS coverage < 50/60 → soft slip (launch with reduced cohort coverage)
- Sentry not Mumbai-self-hosted → hard slip (can't have PII routing to US)
- Feedback widget broken → soft slip
- Onboarding flow > 5 min → soft slip

## Team runbook contents

For each of the 10 likely Beta issues:
1. Symptom (what the DSA sees)
2. Triage steps (what engineer checks first)
3. Common root cause
4. Fix (or escalation path)
5. How to reply to DSA

Example issue: "Engine result shows 'no offers' for a case I expected to pass."
- Triage: check engine eval log for that case
- Common cause: PMS encoding gap on that lender × loan type
- Fix: add to PMS gap queue; reply: "We're adding [LenderName] coverage this week."

## Beta DSA onboarding pack

- Welcome email in en/hi/Hinglish
- 10-minute walkthrough video (screen-recorded, voiced)
- Consent letter template (DPDP-compliant, 4 languages)
- Quick-reference card (PDF) with top 10 things to know
- WhatsApp group invite (Beta-only support channel)
- Locked subscription rate guarantee letter

## Day-1 monitoring rhythm

- 9am: team check-in
- 10am: first DSAs go live (in their own time)
- Every 2 hours: status page review, Sentry triage
- 5pm: daily wrap-up + retrospective
- Owner on standby for first 72 hours

## Exit criteria

- All 10 launch gates green
- First 10-20 DSAs onboarded by Friday
- First real cases created
- Support inbox functioning
- Monitoring dashboards healthy
- Beta cohort connected via WhatsApp group

## What success looks like by end of Week 6

- 10-20 DSAs using V3 for real cases
- First V5-input doc filed by team lead
- Owner pivots focus to V5 Sprint 1 (Customer entity) which has been pre-planned in parallel
- Bug rate low (< 5 P1 issues in first week)

## Owner involvement

- Final go/no-go call Wednesday morning
- Personal note in each invite email
- Joins first 3 DSA onboarding calls (with the engineer owning that DSA)
- Available for triage Mon-Sun for first week
