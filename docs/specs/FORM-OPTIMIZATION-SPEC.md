# Form Optimization Specification — Derive, Remove, Combine

> **Created**: 2026-04-04 | **Session**: 54 | **Status**: Specification only — not implemented
> **Scope**: All 6 loan types (Home, LAP, Plot, Personal, Business, Professional)
> **Method**: Every question traced to its downstream consumer (evaluationEngine, payloadEnricher, incomeAssessor, resultBuilder, discomfortAnalyzer)

---

## Executive Summary

280 total form questions across 6 loan types. After deep analysis tracing every field to its rule engine consumer:

- **4 questions** can be **auto-derived** (calculated from existing answers)
- **6 questions** have **no rule engine consumer** (captured but never evaluated)
- **13 question interactions** can be **combined** into smarter visual blocks
- **Net result**: ~13 fewer interactions per case, ~3 minutes saved per case

---

## TIER 1: AUTO-DERIVE (Don't Ask — Calculate)

These questions ask the DSA for information the system already has or can compute.

### 1.1 PropertyStage for Resale Properties

| Field | `PropertyStage` |
|---|---|
| **Current** | Radio: "Under Construction" / "Ready To Move" — shown conditionally |
| **Problem** | For `purchaseType === 'resale_normal'`, the answer is ALWAYS "Ready To Move". A flagKey already auto-sets it, but the question still conditionally renders. |
| **Fix** | Hide the question entirely when `purchaseType === 'resale_normal'`. Auto-set via existing flagKey. |
| **Risk** | ZERO — behavior already correct, just removing a redundant UI element |
| **Files** | `homeLoan/questionBank/propertyCharacter.ts` (q2_PropertyStage showWhen) |

### 1.2 Six Months Passed After Registry

| Field | `sixMonthsPassedAfterRegistry` |
|---|---|
| **Current** | Yes/No radio on BT Registry page |
| **Problem** | DSA already enters `loanDisbursementDate` (month/year) two questions earlier. Whether 6 months have passed is simple date math: `today - disbursementDate > 6 months`. |
| **Fix** | Remove the question. Auto-calculate from disbursement date. Show result as an info badge: "✅ 6+ months since disbursement" or "⚠️ Only X months since disbursement — most lenders require 6 months minimum." |
| **Risk** | LOW — disbursement date may differ from registry date in edge cases. Could keep as confirmatory Yes/No with auto-suggested answer. |
| **Files** | `homeLoan/questionBank/btRegistry.ts` (q4_sixMonthsPassedAfterRegistry) |

### 1.3 Current EMI (Auto-Calculate with Override)

| Field | `includedCurrentEMIsAmount` |
|---|---|
| **Current** | Currency input: "What is the current monthly EMI of this home loan?" |
| **Problem** | By the time the DSA reaches this question, they've already entered `principalOutstanding`, `existingInterestRate`, and `remainingTenure`. EMI is a deterministic formula: `EMI = P × r × (1+r)^n / ((1+r)^n - 1)` |
| **Fix** | Auto-calculate and pre-fill. Show: "Calculated EMI: ₹XX,XXX — Edit if different". DSA can override if the actual EMI differs (due to rounding, insurance, etc). |
| **Risk** | LOW — formula may not match exactly due to processing fees bundled into EMI, insurance premiums, or partial-month adjustments. Override option mitigates this. |
| **Files** | `homeLoan/questionBank/existingLoan.ts` (q10_includedCurrentEMIsAmount) |
| **Formula** | `P × r × (1+r)^n / ((1+r)^n - 1)` where P = principalOutstanding, r = existingInterestRate/12/100, n = remainingTenure (months) |

### 1.4 Principal Outstanding (Auto-Suggest with Override)

| Field | `principalOutstanding` |
|---|---|
| **Current** | Currency input: "What is the outstanding principal as of today?" |
| **Problem** | Can be approximated from `sanctionAmount`, `btEmisPaid`, and standard amortization. Less reliable than EMI calculation because of possible prepayments. |
| **Fix** | Auto-suggest with prominent "Edit" option. Show: "Estimated from sanction amount and EMIs paid: ₹XX,XX,XXX — Enter actual if different". |
| **Risk** | MEDIUM — prepayments, moratorium periods, and rate changes make this estimate less reliable. Override is mandatory. |
| **Files** | `homeLoan/questionBank/existingLoan.ts` (q6_principalOutstanding) |

---

## TIER 2: QUESTIONS WITH NO RULE ENGINE CONSUMER

These fields are captured in the form payload but never consumed by evaluationEngine, payloadEnricher, incomeAssessor, resultBuilder, or discomfortAnalyzer. They exist only in the immutable snapshot.

### 2.1 registryDateReason — REMOVE

| Field | `registryDateReason` |
|---|---|
| **Question** | "Why a specific date?" (Auspicious / Anniversary / Birthday / Tax planning / Festive / Other) |
| **Rule Engine Usage** | ❌ NONE — not in evaluationEngine, payloadEnricher, resultBuilder, or discomfortAnalyzer |
| **Lender Impact** | ZERO — no lender cares why the date was chosen |
| **DSA Impact** | ZERO — DSA doesn't use this information for anything |
| **Recommendation** | **Remove entirely.** This question adds friction without any business value. |
| **Files** | `homeLoan/questionBank/dealFinancials.ts` (q7b_registryDateReason) |

### 2.2 propertyAge — WIRE TO RULE ENGINE OR DEFER

| Field | `propertyAge` |
|---|---|
| **Question** | "How old is this property?" (0-5 / 6-10 / 11-15 / 16-20 / 21-25 / 26-30 / 30+) |
| **Rule Engine Usage** | ❌ NOT consumed — only used in form-level warnings (tenure + age > 40 years) |
| **Lender Impact** | HIGH in theory — most lenders cap total property life at 40-50 years. But the rule engine doesn't use it. |
| **Recommendation** | **Wire to rule engine** — add property age check to eligibility gates: `max_tenure = min(standard_max, (40 - propertyAge_midpoint))`. This makes the question valuable instead of decorative. If not wiring, defer to File Builder metadata. |
| **Files** | `homeLoan/questionBank/propertyCharacter.ts` (q3_propertyAge), `ruleEngine/evaluationEngine.ts` (add gate) |

### 2.3 constructionProgress — DEFER TO POST-SANCTION

| Field | `constructionProgress` |
|---|---|
| **Question** | "What is the current construction status?" (Early / Mid / Near Complete / Done Awaiting OC) |
| **Rule Engine Usage** | ❌ NONE |
| **Lender Impact** | Operational only — affects disbursement tranche scheduling, not eligibility or pricing |
| **DSA Impact** | Useful for case planning but not for lender matching |
| **Recommendation** | **Defer to post-sanction execution form.** The DSA needs this info when coordinating disbursement with the builder, not during initial assessment. |
| **Files** | `homeLoan/questionBank/propertyCondition.ts` (q13_constructionProgress) |

### 2.4 expectedCompletionDate — DEFER TO POST-SANCTION

| Field | `expectedCompletionDate` |
|---|---|
| **Question** | "When is the project expected to be completed?" (month-year picker) |
| **Rule Engine Usage** | ❌ NONE |
| **Lender Impact** | Operational — affects disbursement timeline, not eligibility |
| **Recommendation** | **Defer to post-sanction.** Same reasoning as constructionProgress. |
| **Files** | `homeLoan/questionBank/propertyCondition.ts` (q14_expectedCompletionDate) |

### 2.5 builderTrackRecord — REMOVE

| Field | `builderTrackRecord` (if exists on compliance page) |
|---|---|
| **Question** | Builder's funding/completion track record |
| **Rule Engine Usage** | ❌ NONE — crowdsourced intelligence, not wired |
| **Recommendation** | **Defer to post-case crowdsourced data collection.** Valuable long-term for the platform's intelligence database but shouldn't slow down case creation. |

### 2.6 reraRegistrationStatus (Compliance Page) — WIRE OR DEFER

| Field | `reraRegistrationStatus` |
|---|---|
| **Question** | "Is the project registered under RERA?" (Registered / Not Registered / Exempted / Unknown) |
| **Rule Engine Usage** | Listed in `ruleValidator.ts` as valid field but ❌ NOT evaluated in any gate or calculation |
| **Lender Impact** | HIGH in theory — banks won't fund non-RERA under-construction projects |
| **Recommendation** | **Wire to rule engine** — add hard gate: if `PropertyStage === 'Under Construction'` AND `reraRegistrationStatus === 'NOT_REGISTERED'` → exclude all banks (only NBFCs). Currently the warning exists on the form but the rule engine ignores it. |
| **Files** | `homeLoan/questionBank/propertyCondition.ts` (q5_reraRegistrationStatus) |

---

## TIER 3: COMBINE INTO SMARTER QUESTIONS

### 3.1 Property Values Visual Table (4 questions → 1 visual block)

**Current flow (4 sequential questions):**
```
q3_marketValue      → "Estimated current market value?"     → Currency input
q4_propCost         → "Agreed deal value?"                  → Currency input
q5_registryValue    → "Expected registration value?"        → Currency input
q6_deposit          → "Available down payment?"             → Currency input
```

**Proposed single visual block:**
```
┌─────────────────────────────────────────────────┐
│  Property Financials                            │
│                                                 │
│  Market Value        ₹ _______________          │
│  Deal Value          ₹ _______________          │
│  Registry Value      ₹ _______________          │
│  Down Payment        ₹ _______________          │
│                                                 │
│  ─── Auto-calculated ───────────────────────    │
│  LTV:  72%  │  Loan Required: ₹45,00,000       │
│  LCR:  85%  │  Shortfall @ Registry: ₹2,50,000 │
│                                                 │
│  ⚠️ Registry < Deal: ₹5L cash needed at        │
│     registration (not from loan disbursement)   │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- Same 4 bindsTo keys, same data captured
- DSA sees all four values together (can spot inconsistencies immediately)
- Auto-calculated LTV/LCR shown in real-time (currently only visible after submission)
- Cross-validation warnings shown inline (registry > deal, deposit > 90%, etc.)

**Implementation:** New `PropertyFinancialsBlock` component replacing 4 sequential `<QuestionRenderer>` calls. Binds to same 4 keys. No payload/rule engine changes needed.

**Files:** `homeLoan/questionBank/dealFinancials.ts`, new `PropertyFinancialsBlock.svelte` component

### 3.2 BT Loan Vintage Block (3 questions → 1 block)

**Current flow:**
```
q3_loanDisbursementDate  → Month/Year picker
q3b_btEmisPaid           → Number input
q4_interestRateType      → Fixed / Floating / Not Sure
```

**Proposed single block:**
```
┌─────────────────────────────────────────────────┐
│  Existing Loan Profile                          │
│                                                 │
│  Disbursement Date    [Month] [Year]            │
│  EMIs Paid            [___] (auto: 14 from date)│
│  Rate Type            ○ Fixed  ○ Floating       │
│                                                 │
│  ✅ Loan vintage: 14 months (6+ EMIs — eligible │
│     for balance transfer with most lenders)     │
└─────────────────────────────────────────────────┘
```

**Benefits:**
- EMI count auto-calculated from disbursement date (with override)
- Instant vintage badge shows BT eligibility status
- Rate type captured inline (saves one screen transition)

**Files:** `homeLoan/questionBank/existingLoan.ts`

### 3.3 BT Rate Block (2 questions → 1 inline block)

**Current flow:**
```
q4_interestRateType       → "Fixed or Floating?" (radio)
q7_existingInterestRate   → "Current interest rate?" (number input)
```

**Proposed inline block:**
```
Current Loan Interest:  ○ Fixed  ○ Floating  ○ Not Sure   at  [___]% p.a.
                                                               └── shown inline
```

**Benefits:** One visual row instead of two separate questions.

**Files:** `homeLoan/questionBank/existingLoan.ts`

### 3.4 Registration Timeline (3 questions → 1)

**Current flow:**
```
q7_registryTimeline      → Within 1M / 1-3M / 3-6M / Specific Date
q7a_registryPlannedDate  → Month/Year (if specific)
q7b_registryDateReason   → Why? (REMOVE — see Tier 2.1)
```

**Proposed (after removing q7b):**
```
Registration Timeline:  ○ Within 1 month  ○ 1-3 months  ○ 3-6 months  ○ Specific: [MM-YYYY]
                                                                         └── inline picker
```

**Benefits:** Collapses 3 questions to 1 with inline conditional.

**Files:** `homeLoan/questionBank/dealFinancials.ts`

### 3.5 Area-Type Compliance Consolidation (5 definitions → 1 dynamic)

**Current:** 5 separate question definitions (`q1a` through `q1e_propertyComplianceStatus`) — one per area type (Planned Authority, Converted Residential, Old Municipal, Local Colony, Unknown). Each has different options and descriptions.

**Proposed:** Single question definition with option-level `showWhen` to filter options by `propertyAreaType`. Same pattern already used for `documentationReadiness` options and `professionalQualification` options.

```typescript
export const q1_propertyComplianceStatus: RawSchemaQuestion = {
  id: 'q1_propertyComplianceStatus',
  bindsTo_template: 'propertyComplianceStatus',
  type: 'radio',
  required: true,
  question: {
    switch: [
      { case: { '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] },
        then: 'Is the property built as per the development authority's sanctioned plan?' },
      { case: { '==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] },
        then: 'Has the land been formally converted from agricultural to residential use?' },
      // ... etc
    ]
  },
  options: [
    // Planned Authority options
    { label: 'Yes — fully as per approved plan', value: 'fully_compliant',
      showWhen: { '==': [{ var: 'propertyAreaType' }, 'PLANNED_AUTHORITY'] } },
    // Converted Residential options
    { label: 'Yes — NA order received', value: 'fully_compliant',
      showWhen: { '==': [{ var: 'propertyAreaType' }, 'CONVERTED_RESIDENTIAL'] } },
    // ... all area-specific options with showWhen
  ]
};
```

**Benefits:**
- 5 question definitions → 1 (less code, fewer branching paths)
- Same UX — DSA sees the same area-specific question and options
- Easier to maintain — changes to compliance logic in one place

**Risk:** MEDIUM — need to verify the auto-clear `$effect` handles option-level showWhen correctly when area type changes. This pattern is already proven with `documentationReadiness` options.

**Files:** `homeLoan/questionBank/propertyCondition.ts`, `lapLoan/questionBank/propertyCondition.ts`, `plotLoan/questionBank/propertyCondition_Plot.ts`

### 3.6 Documentation Readiness Consolidation (5 definitions → 1 dynamic)

Same approach as 3.5 — consolidate 5 `documentationReadiness` variants into 1 question with option-level `showWhen` filtering by area type.

**Files:** `homeLoan/questionBank/legal.ts`, `lapLoan/questionBank/propertyLegal.ts`

---

## CROSS-LOAN-TYPE OBSERVATIONS

### Shared Question Patterns (Already Consistent)

| Pattern | Home | LAP | Plot | Personal | Business | Professional |
|---|---|---|---|---|---|---|
| Location (compound) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Loan Purpose | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Loan Tenure | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Loan Amount | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Urgency Level | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Unsecured Loans (Personal, Business, Professional) — Already Lean

These have only 7-17 questions each. No optimization needed — they're already minimal and every question drives a decision.

### Secured Loans (Home, LAP, Plot) — Optimization Target

The bulk of optimization opportunity is in secured loans, particularly Home Loan (102 questions). LAP (70) and Plot (69) share many of the same patterns and would benefit from the same consolidations.

---

## IMPLEMENTATION PRIORITY (When Ready)

| Priority | Item | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | Remove `registryDateReason` | Quick win | 15 min | ZERO |
| 2 | Auto-derive `sixMonthsPassedAfterRegistry` | 1 question removed | 1 hr | LOW |
| 3 | Auto-derive `PropertyStage` for resale | 1 question hidden | 30 min | ZERO |
| 4 | Registration Timeline collapse (3→1) | 2 questions merged | 1 hr | LOW |
| 5 | BT Rate Block inline (2→1) | 1 question merged | 2 hrs | LOW |
| 6 | Property Values visual table (4→1) | Best UX improvement | 4-6 hrs | LOW (new component) |
| 7 | BT Loan Vintage block (3→1) | Good UX improvement | 3-4 hrs | LOW |
| 8 | Auto-calculate currentEMI | 1 question auto-filled | 2 hrs | LOW |
| 9 | Wire `propertyAge` to rule engine | Makes captured data useful | 2-3 hrs | MEDIUM |
| 10 | Wire `reraRegistrationStatus` to gates | Makes captured data useful | 1-2 hrs | MEDIUM |
| 11 | Compliance consolidation (5→1 dynamic) | Code cleanup, same UX | 4-6 hrs | MEDIUM |
| 12 | Documentation consolidation (5→1 dynamic) | Code cleanup, same UX | 4-6 hrs | MEDIUM |
| 13 | Defer constructionProgress + expectedCompletion | 2 questions deferred | 1 hr | ZERO |

**Total estimated effort**: 25-35 hours across all items
**Net questions removed/simplified**: ~17 interactions per case
**DSA time saved per case**: ~3-4 minutes

---

## What This Spec Does NOT Cover

- **Income form optimization** — separate analysis needed (income profiling is the competitive moat, CLAUDE.md explicitly says "NEVER simplify")
- **Applicant page optimization** — relationship/director/company questions are structurally complex and recently redesigned (Sessions 37-53)
- **Post-sanction forms** — not yet built; should be designed with deferred questions in mind
- **Cross-lender affordability** — separate spec exists (`PROPERTY-AFFORDABILITY-BACK-CALCULATOR.md`)

---

## References

| Document | Relevance |
|---|---|
| `CLAUDE.md` | Non-negotiable invariants (income profiling, immutable snapshots) |
| `docs/PAYLOAD_DOCUMENTATION.md` | Form → API data mapping (22KB) |
| `docs/RULE-ENGINE-SPECIFICATION.md` | Rule authoring/evaluation (49KB) |
| `docs/specs/CASCADING-INTELLIGENCE-AND-RISK-SIGNALS.md` | Risk signal architecture |
| `src/lib/ruleEngine/evaluationEngine.ts` | Which fields drive eligibility |
| `src/lib/ruleEngine/payloadEnricher.ts` | Which fields get enriched |
