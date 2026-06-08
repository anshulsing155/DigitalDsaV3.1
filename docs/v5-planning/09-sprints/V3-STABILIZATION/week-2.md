---
type: sprint
phase: V3-STABILIZATION
week: 2
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V3 Week 2 — Finish LEND-1 + PMS Gap Analysis

## Goal

Complete LEND-1 (Plot & Equity full UI + PDF), then produce the PMS coverage matrix that drives Weeks 3 work.

## Tasks

| Task | Owner | Acceptance |
|---|---|---|
| LEND-1 Phase 3 complete (parser spec) | Engineer 2 | Doc signed off, in repo |
| LEND-1 Phase 4: offer card UI + file-builder PDF | Engineer 2 | 4-number breakdown shown; PDF mirrors |
| PMS gap analysis — 6 loan types × top 10 lenders | Engineers 3-6 | Matrix in spreadsheet + admin UI |
| Engineer assignments per loan type for Week 3 | Lead | Eng 3=Home, 4=LAP, 5=Personal, 6=Business; Eng 2 picks up Plot + Pro after LEND-1 |
| Coverage matrix view live in admin | Engineer 8 | Real-time grade per cell with red/amber/green |

## PMS gap analysis output

A 6×10 matrix:

| Lender | Home | LAP | Plot | Personal | Business | Professional |
|---|---|---|---|---|---|---|
| HDFC | 🟢 | 🟡 | 🔴 | 🟢 | 🟢 | 🟡 |
| ICICI | 🟢 | 🟢 | 🔴 | 🟢 | 🟡 | 🔴 |
| SBI | 🟡 | 🟡 | 🔴 | 🟢 | 🔴 | 🔴 |
| Axis | 🟢 | 🟢 | 🟡 | 🟢 | 🟢 | 🔴 |
| Kotak | 🟡 | 🔴 | 🔴 | 🟢 | 🟢 | 🔴 |
| ... |  |  |  |  |  |  |

🟢 = engine produces complete result with no defaults
🟡 = engine produces result but with some defaults flagged
🔴 = engine cannot fully evaluate (missing rules)

Target by end of Week 3: ≥ 50 cells 🟢.

## Coverage grade computation

```typescript
function gradeCoverage(lender: string, loanType: string): 'green' | 'amber' | 'red' {
  const required = REQUIRED_RULES_PER_LOAN[loanType];
  const encoded = countEncodedRules(lender, loanType);
  const ratio = encoded / required;

  if (ratio >= 0.95) return 'green';
  if (ratio >= 0.70) return 'amber';
  return 'red';
}
```

Implemented in admin coverage matrix view; updates on every policy save.

## LEND-1 Phase 4 specifics

| Aspect | Spec |
|---|---|
| Offer card UI | Shows 4 numbers: sanction headline, seller disbursement, buyer cash component, buyer net out-of-pocket |
| File-builder PDF | Mirrors the same 4-number breakdown in the PDF output |
| Tests | Extends `plotEquity3CapEngine.test.ts` to cover edge cases (₹0 seller, registry > market, etc.) |
| ADR | ADR-0025 already covers the canonical fields aliasing |

## Exit criteria

- LEND-1 Phase 3 + 4 both shipped and tested
- PMS gap analysis matrix complete and shared
- Coverage matrix admin UI live
- Engineers 3-6 have clear Week 3 assignments
- Owner has approved the 50-cell green target

## Owner involvement

~1 hour daily.
