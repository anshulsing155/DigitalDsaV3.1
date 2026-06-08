---
type: sprint
phase: V3-STABILIZATION
week: 1
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 1 — Discharge In-Flight + Start LEND-1 Close-out

## Goal

Clear the in-flight backlog (S216 + S217 + ConfirmModal) so Weeks 2-6 can focus on engine completeness without legacy debt.

## Tasks

| Task | Owner | Acceptance |
|---|---|---|
| Commit pending S216 (billing UX) batch | Engineer 1 | On main, tests green, no regression |
| Commit pending S217 (Plot & Equity Ph 1/2) batch | Engineer 1 | On main, tests green, ADR-0025 referenced |
| ConfirmModal redesign — 5 decisions surfaced | Engineer 2 | New modal shipped, age counter resets, A11y check |
| LEND-1 Phase 3 — parser spec additions (start) | Engineer 2 | First half drafted in LOAN_POLICY_PARSER_SPEC_V7.md |

## ConfirmModal 5 decisions to surface

The 8-session-old debt. Decisions needed inline:
1. Headline copy ("Are you sure?" vs "Confirm action")
2. Icon choice (warning triangle vs neutral)
3. Exhausted-state UX (when quota hit)
4. In-flight footer policy (status text)
5. Quota badge wording

Owner reviews the 5 options inline with engineer; ships same day.

## Engineering practices

- Standard PR review by owner + Claude
- No `--no-verify` on push; husky hooks enforced
- S216 + S217 batches committed individually (not amended into one)
- Tests must pass on each commit

## Exit criteria

- `git log` shows clean tip with S216 + S217 in (separately)
- Tests green
- ConfirmModal redesign live in production
- LEND-1 Phase 3 ~50% drafted
- Engineer 3-6 briefed on Week 2 PMS gap analysis

## Risks

- S216 + S217 batches conflict on rebase → resolve by committing S217 first since it's the larger feature
- ConfirmModal decisions deferred → forces another sprint slip

## Daily owner involvement

~1 hour. Mostly PR reviews + ConfirmModal decision call (30 min) + LEND-1 phase 3 review (30 min).

Owner's other 5-7 hours: V5 Sprint 0 planning kicks off in parallel.
