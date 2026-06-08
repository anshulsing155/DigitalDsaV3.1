---
type: sprint
phase: V3-STABILIZATION
week: 4
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 4 — Engine Regression Sweep + File Builder Verification

## Goal

Validate that the engine produces complete, correct results across the full range of Beta-likely scenarios, and the file builder produces clean PDFs.

## The 90-case fixture

6 loan types × 5 borrower profiles × 3 cities = 90 cases.

**Loan types:** Home, LAP, Plot, Personal, Business, Professional.

**Borrower profiles:**
1. Salaried, ₹50k/month, age 32, no co-applicant
2. Salaried, ₹2L/month, age 42, spouse co-applicant
3. Self-employed, ₹1.5L/month declared, age 38, 5-year ITR history
4. Self-employed professional (CA), ₹3L/month, age 45, property collateral
5. Business owner, ₹5L/month, age 50, two co-applicants + guarantor

**Cities:**
- Mumbai (Tier-1 metro)
- Pune (Tier-1 non-metro)
- Indore (Tier-2)

## Tasks

| Task | Owner | Acceptance |
|---|---|---|
| 90-case fixture in CI | Engineer 7 | Runs on every PR; passes on main |
| Each case produces a complete engine result | Engineer 7 | At least 1 offer per encoded lender per case |
| File-builder PDF generates for each case | Engineer 7 | Manual QA pass; opens, content correct |
| PII redaction lock test on PDF output | Engineer 8 | Pass on all 90 cases; no Aadhaar full digit, no full PAN unless intentional |
| Engine evaluation p95 < 2s per case | Engineer 7 | Measured; in Sentry perf budget |
| Fix any "lender not configured" leakage | Engineer 7 | Zero unhandled fall-through paths |

## Engine bug bash

Common issues to look for:
- A case profile that exposes a coding bug in 1-2 lender-specific rules
- An income type that triggers the wrong haircut
- A geo tier that's miscategorised
- An EMI calculation that mis-rounds at integer boundary

Each issue → bug ticket → fixed → fixture re-runs.

## PDF verification

For each case:
- PDF opens in standard reader (no parse errors)
- Letterhead correct
- All 7 disclaimers present (AD-11)
- Aadhaar fully masked (XXXX XXXX 1234)
- PAN partially masked (XXXX-XXXX-XXXX-1234) where shown
- No internal customer ID or org_id leaked
- File builder header shows lender + offer summary clearly

## Performance check

For each case, log:
- Engine eval time (ms)
- File-builder render time (ms)
- Total request time

Fail if p95 over the 90 cases exceeds 2 seconds end-to-end.

## Exit criteria

- 90 cases all pass engine eval with complete result
- 90 PDFs generated without errors
- PII lock test green
- p95 engine eval < 2s
- All gaps documented (no surprises waiting for Beta)
- Fixture added to CI as permanent regression

## Daily

Engineer 7 + 8 own this sprint. Owners check progress mid-week.

## Risk

If the 90-case sweep reveals systemic engine bugs (more than ~5 needing fixes), slip Beta by 1 week. Owner makes the call by Week 4 Wed.
