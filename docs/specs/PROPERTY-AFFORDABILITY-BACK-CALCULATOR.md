# Property Affordability Back-Calculator — Specification

> **Created**: 2026-04-04 | **Status**: SPEC — Ready for implementation in Phase C (Rule Engine)
> **This is the MOAT** — no competitor does threshold-smoothed back-calculation per lender

---

## 1. Problem

When `propertyIdentified = No`, there's no `propCost`. The DSA needs to know: **"What property can my client afford?"**

Current system: shows nothing until property is identified.
Target system: per-lender back-calculated property affordability with threshold smoothing.

---

## 2. Inputs Available (from form + rule engine)

| Input | Source | Per-Lender? |
|---|---|---|
| Total assessed income (after haircuts) | Income profiling (12 types, multi-source) | Yes (haircuts vary) |
| Existing obligations (monthly EMI burden) | Obligations page | No (same across lenders) |
| Max FOIR | Lender policy | Yes |
| Interest rate (ROI) | Lender policy | Yes |
| Max tenure | Lender policy + applicant age | Yes |
| LTV slabs | Lender policy (typically 3 slabs) | Yes |
| Available down payment | DSA input | No |
| Unsecured loan rate (for bridge) | Market rate / lender-specific | Yes |
| Unsecured loan tenure | Typically 5 years | Configurable |

**Derived**:
- Max affordable new EMI = (Income × FOIR) − existing obligations
- Max loan amount = back-calculate from (max EMI, ROI, tenure) using standard EMI formula inverted

---

## 3. Three Calculation Modes

### Mode A: Pure Eligibility (assume DP available)

```
Max Loan = EMI_to_Loan(maxAffordableEMI, roi, tenure)
Property = MaxLoan / (1 − DP%)     where DP% = (1 − LTV)

But which LTV slab? → Iterative: guess property → pick LTV → compute → check consistency
```

### Mode B: Down Payment Constrained

```
DSA provides: availableDP
Property = availableDP / DP%      where DP% = (1 − LTV) for the applicable slab
Loan needed = Property × LTV
EMI for that loan = Loan_to_EMI(loan, roi, tenure)
Check: EMI ≤ maxAffordableEMI? → If yes, feasible. If no, reduce property.
```

### Mode C: Hybrid with Unsecured Bridge ("What If" Toggle)

When eligibility is high but DP is low, the DSA can toggle: **"What if client takes a personal loan to increase down payment?"**

```
Total EMI capacity = maxAffordableEMI
Split between:
  - Home loan EMI (at secured rate, long tenure)
  - Personal loan EMI (at unsecured rate, short tenure) → proceeds go to DP

Optimization: find the property cost P that maximizes P subject to:
  homeLoan = P × LTV(P)
  bridgeLoan = P × (1 − LTV(P)) − availableDP
  homeLoanEMI + bridgeLoanEMI ≤ maxAffordableEMI
  bridgeLoan ≥ 0
```

---

## 4. LTV Threshold Smoothing (THE CORE INNOVATION)

### The Problem: LTV Cliffs

Standard LTV slabs (example — each lender has their own):

| Property Cost | LTV | Down Payment % |
|---|---|---|
| ≤ ₹33.33L | 90% | 10% |
| ₹33.33L – ₹75L | 80% | 20% |
| > ₹75L | 75% | 25% |

At each boundary, DP% jumps 5-10 percentage points. This creates a **dead zone** where properties just above the threshold are HARDER to afford than properties at the threshold.

### The Solution: Balance Points

At each LTV threshold boundary, there exists a **balance point** — a property cost where the transition from the lower slab to the higher slab is fully absorbed.

**Example: ₹75L boundary (80% → 75% LTV)**

Balance point ≈ **₹92.5L** (approximate — varies per lender based on rates)

This is the property cost where:
- A client who could exactly afford ₹75L at 80% LTV
- Can also exactly afford ₹92.5L at 75% LTV
- By redistributing their EMI: part to home loan (bigger), part to unsecured bridge (covering DP gap)
- Total EMI burden is identical in both scenarios

### How to Find the Balance Point

The balance point B for a threshold at property cost T, transitioning from LTV_high to LTV_low:

```
At threshold T with LTV_high:
  loan_T = T × LTV_high
  dp_T = T × (1 − LTV_high)
  emi_T = Loan_to_EMI(loan_T, securedRate, securedTenure)

At balance point B with LTV_low:
  loan_B = B × LTV_low
  dp_B = B × (1 − LTV_low)
  dp_gap = dp_B − dp_T                              (extra DP needed)
  bridge_emi = Loan_to_EMI(dp_gap, unsecuredRate, unsecuredTenure)
  home_emi_B = Loan_to_EMI(loan_B, securedRate, securedTenure)

Balance condition: home_emi_B + bridge_emi = emi_T
```

This is a single equation in one unknown (B). Solve numerically:

```
f(B) = Loan_to_EMI(B × LTV_low, sRate, sTenure)
     + Loan_to_EMI(B × (1 − LTV_low) − dp_T, uRate, uTenure)
     − emi_T

Find B where f(B) = 0    (binary search between T and 2T)
```

### Transition Zone Behavior

Between threshold T and balance point B:

```
Property in [T, B]:
  TRANSITION ZONE — EMI splits three ways:
  1. Home loan EMI (increases with property cost)
  2. Unsecured bridge EMI (covers DP gap, decreases as ratio stabilizes)
  3. Net: property cost increases sub-linearly

  At T: all EMI goes to home loan, DP from own funds
  At B: EMI split stabilizes, transition fully absorbed
  Above B: clean LTV_low zone, linear again
```

The three-way split ratio changes continuously through the zone, creating a smooth curve instead of a cliff.

### What's Universal vs Per-Lender

**LTV slabs are RBI-mandated — same for ALL lenders.** The threshold boundaries (₹33.33L, ₹75L) and LTV percentages (90%, 80%, 75%) are regulatory, not lender policy.

This means: **Balance points are also nearly universal** — the threshold is the same for everyone. What varies per lender is the EMI↔loan conversion (due to different rates and FOIR), which shifts the balance point by small amounts (the ~1% variance).

| Universal (RBI) | Per-Lender |
|---|---|
| LTV slab boundaries | Interest rate (ROI) |
| LTV percentages | FOIR limit |
| Threshold property costs | Max tenure |
| | Unsecured bridge rate |

So the balance point calculation uses **RBI LTV slabs** (constant) but **lender-specific rates** (variable), producing slightly different affordable property values per lender — not because LTV changes, but because the EMI capacity and loan amount change.

---

## 5. ~1% Accuracy Note

The iterative convergence has ~1% inaccuracy at the exact threshold boundary because:
1. The EMI-to-loan conversion involves exponential terms (not perfectly linear)
2. The balance point equation has the piecewise LTV function embedded
3. The unsecured bridge rate and tenure create a different compounding curve than the home loan
4. Convergence is stopped when successive iterations are within ~₹50K-₹75K

This is acceptable — the DSA sees "affordable property: ~₹92.5L" not "₹92,47,832".

---

## 6. UI Integration (Enhancement to Offer Cards)

**When**: `propertyIdentified = No` and lender results are generated

**What**: Each lender's offer card shows:

```
┌──────────────────────────────────────────┐
│  HDFC Home Loan                     🟢   │
│                                          │
│  Max Affordable Property: ₹68.5L        │
│  Based on: Eligibility ₹54.8L loan      │
│           + ₹13.7L down payment (20%)   │
│                                          │
│  [What if I bridge the down payment?]    │  ← Toggle (Mode C)
│                                          │
│  With ₹8L personal loan bridge:         │  ← Shown when toggled
│  Max Property: ₹82.3L                   │
│  Home Loan: ₹61.7L  EMI: ₹53,500       │
│  Bridge Loan: ₹8L   EMI: ₹18,600       │
│  Total EMI: ₹72,100                     │
│                                          │
│  ⚠️ Crosses 75% LTV threshold at ₹75L  │
│  Balance point: ₹92.5L                  │
└──────────────────────────────────────────┘
```

**The "What if" toggle** activates Mode C (unsecured bridge). Not automatic — DSA explicitly explores it.

---

## 7. Implementation Location

| Component | File | What to Add |
|---|---|---|
| Balance point calculator | `src/lib/ruleEngine/affordabilityCalculator.ts` (NEW) | `findBalancePoint()`, `calculateAffordableProperty()`, `calculateBridgeScenario()` |
| Per-lender integration | `src/lib/ruleEngine/evaluationEngine.ts` | Call affordability calculator when `propertyIdentified = false` |
| Result output | `src/lib/ruleEngine/resultBuilder.ts` | Add `affordability` field to `LenderResult` |
| UI | Offer card component | Show affordability section with bridge toggle |
| Config | `src/lib/ruleEngine/systemConfig.ts` | Default unsecured bridge rate/tenure |

---

## 8. Dependencies

- **AD-1** (RM Policy → Rule Engine): Needs real lender LTV slabs, rates, FOIR limits
- **AD-2** (Facility FOIR/EMI): Needs correct EMI calculation for unsecured products
- **AD-10** (Geo scoring): Needs geography for per-lender rate selection

This is Phase C work — after the rule engine pipeline is wired with real policies.

---

## 9. V1 Schema Elimination

As part of this work, eliminate all V1 key fallbacks:
- Remove `propertyCost || propCost` dual-key patterns
- Remove `downPayment || deposit` dual-key patterns
- Make V2 (TS composition) the only schema path
- Clean break — grep for all V1 references and remove

This simplifies the affordability calculator (only one set of keys to work with).
