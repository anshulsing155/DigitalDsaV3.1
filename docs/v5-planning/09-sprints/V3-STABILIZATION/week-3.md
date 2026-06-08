---
type: sprint
phase: V3-STABILIZATION
week: 3
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 3 — PMS Coverage Push

## Goal

Bring 60 cells (top 10 lenders × 6 loan types) to ≥ 50 green. Engine should produce a complete result for any combination a Beta DSA picks among the top lenders.

## Tasks per engineer

| Engineer | Loan type | Target lenders | Acceptance |
|---|---|---|---|
| 3 | Home Loan | HDFC, ICICI, SBI, Axis, Kotak, BoB, PNB, ICICI HFL, LIC HFL, IIFL | 9+ of 10 green |
| 4 | LAP | HDFC, ICICI, SBI, Axis, Kotak, Aavas, IIFL, IIFL HF, BoB, PNB | 8+ of 10 green |
| 5 | Personal | HDFC, ICICI, SBI, Axis, Kotak, BoB, IDFC, IndusInd, RBL, Yes | 9+ of 10 green |
| 6 | Business | HDFC, ICICI, SBI, Axis, Kotak, BoB, IDFC, Lendingkart, NeoGrowth, IIFL | 8+ of 10 green |
| 2 | Plot + Professional | (top 10 each) | 7+ of 10 green each |

## What "encoding green" means

For a cell to be 🟢:
1. All required rule types are encoded (eligibility, income haircut, EMI, FOIR, LTV, deviations)
2. Engine produces evaluation result with no warnings or defaults
3. Smoke test (representative profile) returns at least one offer
4. File builder PDF generates cleanly

For 🟡:
1. Some rules encoded
2. Engine returns result but with at least one default warning
3. Smoke test returns an offer but with caveats

🔴 = engine can't evaluate; would show "Lender not yet fully configured" in Beta UI.

## Daily rhythm

- Morning: each engineer picks 2 lenders × 1 loan type for the day
- Mid-day: check-in on blockers (often: missing reference documents from lender, need to ask owner)
- End of day: commit, update coverage matrix
- Engineers 3-6 collaborate on a shared "tricky rule patterns" doc

## Beta UI surfacing of amber/red

When a Beta DSA opens a case and picks a lender that's amber or red:

- 🟡: "Some rules are still being finalised for this lender. The engine will use best estimates."
- 🔴: "Lender not yet fully configured. Please pick another lender for now — we're adding this one soon."

## Exit criteria

- ≥ 50 of 60 cells are 🟢
- All 🟡 cells documented with what's missing
- All 🔴 cells listed for Phase 1 finish-line (Week 5 or post-Beta)
- Coverage matrix view in admin shows the current state
- Documentation tracker updated

## Owner involvement

- Daily reviews of policy encoding decisions where engineer is uncertain
- Approving rule interpretations that affect liability (e.g., "HDFC has stopped lending to X profile — confirm before encoding")
- ~1.5-2 hours/day during this sprint (higher than normal)
