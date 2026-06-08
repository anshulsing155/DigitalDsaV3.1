# Home Loan + Personal Loan Optimization Engine
## Problem Statement, Mathematical Solution & Implementation Architecture

---

## 1. The Real-World Problem

In Indian home loan financing, an applicant's ability to buy a property is constrained not just by their income, but by a regulatory mechanism called **LTV (Loan to Value)** enforced by the RBI. This creates a structural gap that borrowers often try to fill using a Personal Loan.

### The Gap Problem

When an applicant is eligible for a high home loan based on their income, but cannot get it sanctioned because they don't have enough of their own money to put in as a down payment (Self Contribution / SC), they are stuck. The lender cannot give them more than a certain percentage of the property value — regardless of whether they can afford the EMI.

**Example:**
- Applicant income-based eligibility: ₹80L home loan
- Property they want: ₹90L
- LTV cap at this slab: 80% → Lender can give max ₹72L
- Required SC: ₹18L
- Applicant has only: ₹10L in cash
- Gap: ₹8L

The applicant takes a Personal Loan of ₹8L to fill this SC gap. But this PL now also eats into the same income that was funding the home loan EMI — which means the home loan eligibility drops. So the numbers shift again.

This is the core problem: **taking a PL to increase SC increases the HL, but the PL EMI reduces the income available for the HL EMI — creating a circular dependency.**

---

## 2. All the Rules in Play

### Rule 1 — FOIR (Fixed Obligation to Income Ratio)

Every lender has a FOIR cap — the maximum percentage of the applicant's gross monthly income that can go toward total EMI obligations (existing + new).

```
Total EMI ≤ FOIR × Gross Monthly Income
```

**Critical point:** HL lenders and PL lenders have different FOIR caps. Both lenders look at the total EMI burden — including each other's loan. So the binding FOIR is the tighter of the two.

```
Effective Available EMI = min(FOIR_HL, FOIR_PL) × Income − Existing EMIs
```

### Rule 2 — Different Interest Rates

HL and PL are priced differently. HL rates are typically 8.5%–9.5% per annum. PL rates are typically 10.5%–14% per annum. This means the EMI per rupee borrowed (called the EMI factor) is significantly different for each loan type — and it varies lender to lender.

```
EMI Factor = [r/12 × (1 + r/12)^n] / [(1 + r/12)^n − 1]

Where:
  r = annual interest rate (as decimal, e.g. 0.085)
  n = tenure in months
```

### Rule 3 — Different Tenures, Age-Capped

Maximum loan tenure depends on:
- The lender's own product cap (e.g., 30 years for HL, 7 years for PL)
- The applicant's age — lenders will not extend the loan beyond retirement (assumed age 60)

```
Effective Tenure = min(Lender Max Tenure, (60 − Applicant Age) × 12)
```

A 45-year-old applicant cannot get a 30-year HL — they get maximum 15 years (180 months), which dramatically increases the EMI factor and reduces how much they can borrow.

### Rule 4 — RBI LTV Tiers

The Loan to Value ratio is not a single number. RBI mandates it in three tiers based on the home loan amount itself:

| Home Loan Amount | Max LTV |
|---|---|
| Up to ₹30 Lakhs | 90% |
| ₹30L to ₹75 Lakhs | 80% |
| Above ₹75 Lakhs | 75% |

This means: the LTV ratio that applies depends on the HL amount, which itself depends on the LTV ratio. This is a second circular dependency layered on top of the first.

### Rule 5 — The Combinatorial Problem

Different lenders offer different rates, FOIR caps, and tenure limits for both HL and PL. The applicant can take HL from one bank and PL from a completely different bank. This means the optimization must evaluate every possible (HL lender × PL lender) combination and rank them.

**With 5 HL lenders and 5 PL lenders → 25 combinations to evaluate.**

---

## 3. Why This Is Hard — The Two Circular Dependencies

### Circular Dependency 1: PL ↔ HL (The Primary Loop)

```
PL Amount ↑
    → SC (Self Contribution) ↑         [SC = Own Cash + PL]
        → Property Value ↑             [Property = SC / (1 − LTV)]
            → HL Amount ↑              [HL = LTV × Property]
                → HL EMI ↑
                    → Less FOIR room left
                        → PL must be smaller
                            → SC ↓
                                → back to start
```

The PL amount and the HL amount are simultaneously determining each other. You cannot solve one without knowing the other.

### Circular Dependency 2: HL Amount ↔ LTV Tier

The LTV ratio to use depends on which slab the HL amount falls in. But the HL amount depends on what LTV ratio you assumed. If you assume 80% LTV and get an HL of ₹28L, that HL actually qualifies for 90% LTV — so your assumption was wrong, and you need to re-solve.

---

## 4. The Mathematical Solution — Breaking Both Loops

### Key Insight for Loop 1

Both loops only feel non-linear. Once you express HL as a function of PL through the LTV constraint, all unknowns collapse into a **single linear equation in one variable** — the PL amount X.

**Step 1 — Express everything in terms of X:**

```
SC         = C + X                    (C = applicant's own cash, X = PL amount)
Property   = SC / (1 − L)            (L = LTV ratio being tested)
HL         = L × Property = L(C + X) / (1 − L)
```

**Step 2 — Write the EMI constraint:**

```
HL × e_HL + X × e_PL ≤ A

Where:
  e_HL = EMI factor for home loan (per rupee per month)
  e_PL = EMI factor for personal loan (per rupee per month)
  A    = effective available EMI capacity
```

**Step 3 — Substitute HL:**

```
[L(C + X) / (1 − L)] × e_HL + X × e_PL ≤ A
```

**Step 4 — Expand and isolate X:**

```
[LC × e_HL / (1−L)] + X × [L × e_HL / (1−L) + e_PL] = A
```

**Step 5 — The Stabilizing Formula:**

```
                   A  −  [L × C × e_HL / (1 − L)]
X_max   =  ─────────────────────────────────────────────
                  [L × e_HL / (1 − L)]  +  e_PL
```

Once X_max is known, everything else follows deterministically:

```
SC_final       = C + X_max
Property_max   = SC_final / (1 − L)
HL_amount      = L × Property_max
HL_EMI         = HL_amount × e_HL
PL_EMI         = X_max × e_PL
Total_EMI      = HL_EMI + PL_EMI
Headroom       = A − Total_EMI
```

**Why the denominator is your stability factor:**

The denominator `[L × e_HL / (1−L)] + e_PL` represents the composite EMI cost per additional rupee of PL. The higher this value, the less PL the system can absorb. It encodes both the LTV leverage effect and the PL interest rate cost simultaneously. This is what keeps the solution stable — the loop is algebraically closed in one shot.

### Key Insight for Loop 2 — LTV Tier Consistency Check

Since we cannot know L in advance, we solve the formula three times — once for each LTV tier. We then keep only the solution that is self-consistent: the HL amount derived must actually belong to the LTV tier we assumed.

```
Assume L = 0.90  →  Solve for X  →  Derive HL
  Check: Is HL ≤ ₹30L?  →  If yes: valid. If no: discard.

Assume L = 0.80  →  Solve for X  →  Derive HL
  Check: Is ₹30L < HL ≤ ₹75L?  →  If yes: valid. If no: discard.

Assume L = 0.75  →  Solve for X  →  Derive HL
  Check: Is HL > ₹75L?  →  If yes: valid. If no: discard.
```

At most one tier will pass the consistency check. That is the correct solution for this lender pair.

---

## 5. Full Algorithm Per (HL Lender × PL Lender) Pair

```
INPUT:
  hl_lender  →  { rate, max_tenure, foir_cap, max_loan_amount }
  pl_lender  →  { rate, max_tenure, foir_cap, max_loan_amount }
  applicant  →  { gross_monthly_income, existing_emis, own_cash, age }

STEP 1 — Compute age-adjusted tenures
  hl_tenure = min(hl_lender.max_tenure, (60 − age) × 12)
  pl_tenure = min(pl_lender.max_tenure, (60 − age) × 12)
  → If either is ≤ 0: INVALID (applicant too old for this product)

STEP 2 — Compute EMI factors
  e_HL = [r_HL/12 × (1 + r_HL/12)^hl_tenure] / [(1 + r_HL/12)^hl_tenure − 1]
  e_PL = [r_PL/12 × (1 + r_PL/12)^pl_tenure] / [(1 + r_PL/12)^pl_tenure − 1]

STEP 3 — Effective EMI capacity
  eff_foir = min(hl_lender.foir_cap, pl_lender.foir_cap)
  A = eff_foir × gross_monthly_income − existing_emis
  → If A ≤ 0: INVALID (no headroom after existing obligations)

STEP 4 — For each LTV tier L in {0.90, 0.80, 0.75}:

  a) Solve for X:
       numerator   = A − (L × own_cash × e_HL) / (1 − L)
       denominator = (L × e_HL) / (1 − L) + e_PL
       X = max(0, numerator / denominator)
       (X < 0 means no PL needed — applicant can fund SC from own cash alone)

  b) Derive outcomes:
       SC       = own_cash + X
       HL       = (L × SC) / (1 − L)
       Property = SC / (1 − L)

  c) Consistency check:
       Actual tier of HL:
         HL ≤ 30L  → actual LTV = 0.90
         HL ≤ 75L  → actual LTV = 0.80
         HL > 75L  → actual LTV = 0.75
       If actual LTV ≠ assumed L: DISCARD this tier

  d) Apply lender caps:
       HL = min(HL, hl_lender.max_loan_amount)
       X  = min(X,  pl_lender.max_loan_amount)

  e) Final EMI check:
       HL_EMI    = HL × e_HL
       PL_EMI    = X × e_PL
       Total_EMI = HL_EMI + PL_EMI
       If Total_EMI > A: DISCARD (exceeds capacity after capping)

  f) Accept this solution. Stop iterating tiers.

STEP 5 — If no tier passed: INVALID (no self-consistent solution)

OUTPUT:
  HL_amount, PL_amount, Property_value, LTV_tier,
  HL_EMI, PL_EMI, Total_EMI, Headroom, PL_Burden_Ratio
```

---

## 6. Ranking All Lender Pairs

Once every (HL × PL) combination is solved, results are ranked by:

1. **Primary:** Maximize HL Amount (applicant can buy the most expensive property)
2. **Tiebreak 1:** Minimize PL Amount (least financial stress, lower risk)
3. **Tiebreak 2:** Maximize Headroom (most breathing room after EMIs)

### Output Matrix (example)

| Rank | HL Bank | PL Bank | HL Amt | PL Amt | Property | Total EMI | Headroom | PL% | Tier |
|---|---|---|---|---|---|---|---|---|---|
| 1 ★ | HDFC | ICICI | ₹72L | ₹8L | ₹90L | ₹48,200 | ₹3,800 | 18% | 80% |
| 2 | SBI | ICICI | ₹70L | ₹9L | ₹87.5L | ₹47,600 | ₹4,400 | 20% | 80% |
| 3 | HDFC | Bajaj | ₹68L | ₹10L | ₹85L | ₹49,100 | ₹2,900 | 22% | 80% |

---

## 7. Edge Cases and Guardrails

### X_max comes out negative
The numerator of the formula is negative. This means the applicant cannot afford even the base home loan (using only their own cash as SC) at this FOIR. The property target must be reduced. PL will not help.

### X_max = 0 (no PL needed)
The applicant's own cash is already sufficient as SC to reach the LTV-allowable HL at full FOIR capacity. No PL required. The formula still works — it just returns 0.

### No tier passes consistency check
This happens when the income level and LTV mechanics are so misaligned that no stable solution exists for this lender pair. Mark as INVALID with reason.

### Age boundary
A 57-year-old applicant on a lender with a 30-year HL product effectively gets only 3 years (36 months). The EMI factor for a 36-month loan at 8.75% is dramatically higher than for 360 months — the monthly payment nearly triples, collapsing eligibility. The algorithm handles this automatically through age-adjusted tenure.

### Tier boundary crossing
If the formula gives HL = ₹30.2L when assuming 90% LTV, the solution is technically inconsistent (₹30.2L falls in the 80% tier). The algorithm correctly discards this, re-solves at 80% LTV, and finds a consistent answer.

### PL lender caps exceeded
After solving for X_max mathematically, cap it at the PL lender's sanctioned limit. Then re-derive HL from the capped SC. This may shift the LTV tier — check again.

---

## 8. Key Metrics Explained

| Metric | Formula | Meaning |
|---|---|---|
| EMI Factor (e) | `[r × (1+r)^n] / [(1+r)^n − 1]` where r = monthly rate | EMI per ₹1 borrowed |
| Effective FOIR | `min(FOIR_HL, FOIR_PL)` | Binding constraint across both lenders |
| Available EMI (A) | `Eff.FOIR × Income − Existing EMIs` | Total room for new EMIs |
| Self Contribution | `Own Cash + PL Amount` | Total down payment going to property |
| Headroom | `A − Total EMI` | Monthly buffer after all obligations |
| PL Burden Ratio | `PL_EMI / Total_EMI` | % of total payment going to PL — lower is safer |
| Stability Factor | `[L × e_HL / (1−L)] + e_PL` | Denominator — composite cost per rupee of PL |

---

## 9. Implementation Architecture (SvelteKit + TypeScript)

### File Structure
```
src/
├── lib/
│   ├── types.ts               → All interfaces: Lender, ApplicantProfile, PairResult, LTVTier
│   ├── lenders.ts             → Default lender seed data (editable at runtime)
│   ├── format.ts              → inr(), pct() display formatters
│   └── engine/
│       └── calculator.ts      → emiFactor(), adjustedTenure(), solvePair(), rankAllPairs()
└── routes/
    └── +page.svelte           → UI: applicant inputs + lender config + results table
```

### Data Flow
```
User Input (Applicant Profile + Lender Config)
          ↓
  rankAllPairs(lenders, applicant)
          ↓
  for each (HL lender × PL lender):
    solvePair(hl, pl, applicant)
      ↓
      adjustedTenure() × 2
      emiFactor() × 2
      effectiveFOIR = min(...)
      for each LTV tier:
        solve X_max formula
        consistency check
        apply caps
        compute EMIs
      ↓
      return PairResult
  ↓
  sort by [hlAmount DESC, plAmount ASC, headroom DESC]
          ↓
  ResultsTable.svelte (ranked display + detail card on row click)
```

### Core Types

```typescript
interface Lender {
  id: string;
  name: string;
  type: 'HL' | 'PL' | 'BOTH';
  hl?: {
    rate: number;           // Annual % e.g. 8.75
    maxTenureMonths: number;
    foirCap: number;        // e.g. 0.65
    maxLoanAmount?: number; // Lender's own rupee cap
  };
  pl?: {
    rate: number;
    maxTenureMonths: number;
    foirCap: number;
    maxLoanAmount?: number;
  };
}

interface ApplicantProfile {
  grossMonthlyIncome: number;
  existingEMIs: number;
  ownCash: number;          // Their own SC contribution
  age: number;
}

interface PairResult {
  hlLender: Lender;
  plLender: Lender;
  hlAmount: number;
  plAmount: number;
  propertyValue: number;
  ltv: number;
  hlEMI: number;
  plEMI: number;
  totalEMI: number;
  headroom: number;
  plBurdenRatio: number;
  tier: string;
  valid: boolean;
  invalidReason?: string;
}
```

---

## 10. Practical Interpretation Guide

### When to pick a combination with lower HL but lower PL burden

If the applicant's job stability is uncertain, or the PL rate is very high (13%+), a slightly lower HL with a much lower PL is often the right choice. The PL will be cleared in 5–7 years, after which the full income capacity goes to the HL. A high PL burden makes the household fragile during that period.

### When headroom matters more than HL amount

For applicants with variable income (business owners, commission-based earners), headroom is critical. A ₹5,000/month buffer with ₹72L HL is riskier than a ₹15,000/month buffer with ₹68L HL.

### When to use same bank for both HL and PL

Some lenders offer discounted PL rates to existing HL customers. If a bank appears in both HL and PL rankings, the same-bank combination may offer relationship pricing that the model doesn't capture — negotiate this separately.

### When no valid combination exists

The formula's numerator goes negative for all tiers. This means the applicant's income, after existing obligations, cannot sustain even the minimum HL EMI given their own cash contribution. Options: reduce target property value, increase own cash, reduce existing EMIs, or add a co-applicant.

---

## Summary

The problem appears circular because PL and HL influence each other simultaneously, and the LTV tier depends on the very value it is computing. The solution is to:

1. Express both loans as functions of a single unknown (PL amount X)
2. Reduce the system to one linear equation in X using the FOIR constraint
3. Solve for X analytically — no iteration, no instability
4. Validate the solution against LTV tier consistency
5. Repeat for every (HL × PL lender) combination
6. Rank results by outcome quality

The denominator of the formula — `[L × e_HL / (1−L)] + e_PL` — is the system's stability constant. It tells you how much EMI capacity each rupee of PL consumes when all downstream effects (increased SC → increased property → increased HL → increased HL EMI) are accounted for.
