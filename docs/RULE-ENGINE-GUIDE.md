# Rule Engine — Complete Developer Guide

> **Purpose**: A newcomer-friendly deep-dive into how the Rule Engine evaluates loan applications, generates offer cards, produces suggestions/warnings, and how to safely modify it.
>
> **Audience**: Any developer joining the project who needs to understand, debug, or extend the rule engine.
>
> **Related docs**:
> - `RULE-ENGINE-SPECIFICATION.md` — Rule *authoring* pipeline (parsing bank PDFs into JSON-Logic)
> - `LOAN-ASSESSMENT-API-INTEGRATION.md` — External API contract for the evaluation endpoint
> - `PAYLOAD_DOCUMENTATION.md` — How form answers map to the evaluation payload

---

## Table of Contents

1. [What Is the Rule Engine?](#1-what-is-the-rule-engine)
2. [The Big Picture — End-to-End Data Flow](#2-the-big-picture--end-to-end-data-flow)
3. [The 8-Stage Evaluation Pipeline](#3-the-8-stage-evaluation-pipeline)
4. [Income Assessment — The Competitive Moat](#4-income-assessment--the-competitive-moat)
5. [Obligation Load Computation](#5-obligation-load-computation)
6. [EMI & Amount Calculations (Pure Math)](#6-emi--amount-calculations-pure-math)
7. [Discomfort Analysis — Gap Detection & Calculated Solutions](#7-discomfort-analysis--gap-detection--calculated-solutions)
8. [Suggestions, Warnings & Feedback — How They Are Generated](#8-suggestions-warnings--feedback--how-they-are-generated)
9. [Ratings & Approval Probability](#9-ratings--approval-probability)
10. [The Final Offer Card — LenderResult Structure](#10-the-final-offer-card--lenderresult-structure)
11. [Lender Policies — What Exists Today](#11-lender-policies--what-exists-today)
12. [RM Policy Capture System](#12-rm-policy-capture-system)
13. [Form Fields Consumed by the Engine](#13-form-fields-consumed-by-the-engine)
14. [Payload Enrichment — Backward Compatibility & Computed Fields](#14-payload-enrichment--backward-compatibility--computed-fields)
15. [Worked Examples — Step-by-Step Calculations](#15-worked-examples--step-by-step-calculations)
16. [How to Make Changes Safely](#16-how-to-make-changes-safely)
17. [File Map — Where Everything Lives](#17-file-map--where-everything-lives)
18. [Common Pitfalls & Debugging Tips](#18-common-pitfalls--debugging-tips)
19. [Glossary](#19-glossary)

---

## 1. What Is the Rule Engine?

The Rule Engine is the **core differentiator** of DigitalDSA. It is an evaluation pipeline that:

1. Takes a **loan application** (form data from the DSA wizard)
2. Evaluates it against **every active lender policy** simultaneously
3. Returns a **per-lender offer card** with traffic light (GREEN/AMBER/RED/GREY), eligible amount, EMI, ROI, ratings, suggestions, and calculated solutions

Think of it as: *"Given this applicant's profile, which banks will approve this loan, for how much, at what rate, and what can the DSA do to improve weak results?"*

### Why It Matters

- **DSAs** get instant, multi-bank comparison — no manual policy lookups
- **12 income types** with per-source haircuts (salaried, business, rental, pension, etc.)
- **Calculated solutions** with real numbers ("extend tenure 5yr → EMI drops ₹42K to ₹36K")
- **Deviation model** — a RED result can become AMBER if a manager can approve an exception

### Key Design Principles

| Principle | What It Means |
|-----------|--------------|
| **Pure pipeline** | Each stage reads input, produces output — no mutations |
| **JSON-Logic rules** | All gate logic, parameters, deviations use JSON-Logic — no code changes for rule updates |
| **Per-lender isolation** | Each lender is evaluated independently; failures in one don't affect others |
| **Calculated, not hardcoded** | Suggestions include real before/after numbers, not generic tips |
| **Backward compatible** | Enricher derives legacy field names so old rules work with new form data |

---

## 2. The Big Picture — End-to-End Data Flow

```
DSA fills loan wizard (18 pages for Home Loan)
         │
         ▼
payloadBuilder.ts converts form answers → LoanApplicationPayload
         │
         ▼
POST /api/rule-engine/evaluate
         │
         ▼
evaluatePayload(payload)                    ← evaluationEngine.ts:595
  ├─ loadActiveRuleDocuments(loanName)      ← Queries MongoDB for active rules
  │     Returns: ParsedLenderRuleDocument[] (currently 7 lenders)
  │
  ├─ filterExcludedBanks()                  ← DSA can exclude specific banks
  │
  └─ FOR EACH LENDER:
       ├─ enrichPayload()                   ← Adds _computed.* fields + backward compat
       ├─ evaluateHardGates()               ← 7 gate categories (pass/fail)
       ├─ extractParameters()               ← ROI, FOIR cap, LTV, tenure, fees
       ├─ assessIncomeV2()                  ← Multi-source income per applicant
       ├─ computeObligationLoad()           ← Term loans + credit lines
       ├─ Calculate amounts                 ← FOIR-eligible, LTV-capped, offered, EMI
       ├─ checkDeviations()                 ← Can failed gates be recovered?
       └─ assignTrafficLight()              ← GREEN/AMBER/RED/GREY
         │
         ▼
  assignRatings()                           ← Percentile-based cross-lender comparison
         │
         ▼
  FOR EACH EVALUATION:
       ├─ buildFactors()                    ← Gate results → decision factors
       ├─ buildSuggestions()                ← Deviation + static suggestions
       ├─ analyzeDiscomfort()               ← Zone detection + calculated solutions
       ├─ calculateApprovalProbability()    ← Base + modifiers → 0-1 score
       ├─ buildTrancheBreakdown()           ← Disbursement structure (Phase 4)
       └─ buildLenderResult()               ← Assemble final offer card
         │
         ▼
  buildSummary()                            ← Overview across all lenders
         │
         ▼
LenderResultsData { summary, results[], cross_sell[], computed_at }
         │
         ▼
Dashboard renders offer cards to DSA
```

---

## 3. The 8-Stage Evaluation Pipeline

Each lender goes through this pipeline independently. If any stage fails, subsequent stages may still run (to provide partial data for suggestions).

### Stage 1: Pre-Checks

**What**: Verify the lender supports this loan type and applicant data exists.

**Outcome**: If either fails → immediately return a GREY evaluation (cannot proceed).

```
Does lender support "Home Loan"?  → Yes: continue | No: GREY
Does payload have applicant data? → Yes: continue | No: GREY
```

### Stage 2: Payload Enrichment

**What**: Compute 15+ derived fields that JSON-Logic rules can reference.

**Why**: Rules need computed values like "total gross monthly income" or "is this a business file?" — these don't exist in raw form data.

**Key computed fields** (available as `_computed.*` in JSON-Logic):

| Field | Description | Example |
|-------|-------------|---------|
| `_total_gross_monthly` | Sum of all applicants' gross income | ₹1,50,000 |
| `_total_obligations_monthly` | Sum of counted obligations | ₹30,000 |
| `_applicant_count` | Number of applicants | 2 |
| `_has_co_applicant` | More than one applicant? | true |
| `_primary_age` | First applicant's age | 45 |
| `_primary_employment` | First applicant's employment type | "Salaried(Private)" |
| `_is_business_file` | Any applicant self-employed? | false |
| `_max_cibil` | Highest CIBIL score among applicants | 780 |
| `_min_cibil` | Lowest CIBIL score | 720 |
| `_income_profile_types` | Array of unique income types | ["salaried_regular", "rental_income"] |

**Backward compatibility**: The enricher also derives legacy field names. For example, the form now uses a merged `creditHistoryStatus` field, but old rules reference `isDefaulter` and `madeGuarantor` separately — the enricher derives both.

> See [Section 14](#14-payload-enrichment--backward-compatibility--computed-fields) for the full list.

### Stage 3: Hard Gates

**What**: Evaluate pass/fail eligibility rules. These are the "must have" requirements.

**7 gate categories**:

| Category | What It Checks | Example Rule |
|----------|---------------|-------------|
| `eligibility` | Age, applicant type, residency | "Age must be 21-65" |
| `cibil` | Credit score minimum | "CIBIL must be 700+" |
| `property` | Location, property type, compliance | "Property must be in approved area" |
| `transaction` | Deal structure, possession, title | "Possession must be within 3 years" |
| `documentation` | Income proof, property docs | "ITR required for self-employed" |
| `nri` | NRI eligibility, GPA rules | "NRI must have GPA in India" |
| `company` | Company age, turnover, shareholding | "Company vintage must be 3+ years" |

**How it works**:

```
For each hard_gate rule in each section:
  1. Check applies_when (JSON-Logic) — should this rule even run?
  2. Evaluate rule.logic (JSON-Logic) against enriched payload
  3. Collect GateResult { rule_id, passed, fail_message, section }
```

**Output**: Array of `GateResult[]` — one per rule evaluated. Failed gates feed into the deviation system.

### Stage 4: Parameter Extraction

**What**: Extract numeric parameters (ROI, FOIR cap, LTV, tenure) from tiered rules.

**How tiers work**: Rules have conditions — the last matching rule wins (like CSS specificity).

Example: HDFC has 4 ROI tiers based on CIBIL:

| CIBIL Range | ROI |
|-------------|-----|
| 800+ | 8.50% |
| 750-799 | 8.85% |
| 700-749 | 9.15% |
| Below 700 | 9.85% |

The engine evaluates each tier's `applies_when` condition, and the last match determines the ROI.

**Required parameters** (if missing → GREY):
- `roi` — interest rate (annual %)
- `max_foir` — maximum FOIR ratio (0-1, e.g., 0.55 = 55%)
- `max_tenure_months` — maximum tenure in months
- `max_age_at_maturity` — oldest age at loan end (years)
- `max_ltv` — maximum LTV % *(secured loans only)*

### Stage 5: Income Assessment

> This is the competitive moat. See [Section 4](#4-income-assessment--the-competitive-moat) for full details.

**What**: Compute total assessed (bankable) income across all applicants and their income sources.

**Key**: Each applicant can have *multiple* income entries (salaried + rental + pension). Each entry gets its own haircut.

### Stage 6: Amount Calculations

> See [Section 6](#6-emi--amount-calculations-pure-math) for formulas.

**What**: Calculate the maximum loan the applicant qualifies for.

Three constraints are checked:

1. **FOIR-eligible amount** — How much income supports after obligations
2. **LTV-capped amount** — How much property value supports (secured loans only)
3. **Offered amount** = `min(requested, FOIR-eligible, LTV-capped)`

Then: `EMI = standard reducing-balance formula on offered amount`

### Stage 7: Deviation Check

**What**: Can failed hard gates be "recovered" with manager approval?

Each lender defines deviation rules:

```
If gate "cibil-min-700" failed:
  Check deviation: "CIBIL 650-699 acceptable if income > ₹1.5L/month"
  If condition matches → RED can become AMBER
  Authority required: "branch_manager"
  Probability penalty: -15%
```

**Outcome**: If ALL failed gates have covering deviations → traffic light changes from RED to AMBER.

### Stage 8: Traffic Light Assignment

| Light | Condition |
|-------|-----------|
| **GREEN** | All gates pass AND offered ≥ requested |
| **AMBER** | Gates failed but all covered by deviations, OR offered < requested |
| **RED** | Gates failed, no deviation coverage |
| **GREY** | Cannot evaluate (missing data, unsupported loan type, missing params) |

---

## 4. Income Assessment — The Competitive Moat

**File**: `incomeAssessorV2.ts` (233 lines) — V2 is canonical, V1 is deprecated.

### The 12 Income Profile Types

| # | Profile Type | How Gross Is Extracted | Typical Haircut |
|---|-------------|----------------------|-----------------|
| 1 | `salaried_regular` | grossMonthlySalary or netMonthlySalary | 0% |
| 2 | `salaried_contractual` | contractMonthlyPayment | 0-10% |
| 3 | `business_proprietorship` | avg(netProfitArray) / 12 | 20-25% |
| 4 | `business_partnership` | avg(netProfitArray) / 12 | 20-25% |
| 5 | `director_company` | salary + annualDividend/12 | 15-20% |
| 6 | `professional_practice` | netProfessionalIncome or (receipts - expenses) | 10-15% |
| 7 | `pension` | monthlyPension | 0-10% |
| 8 | `rental_income` | monthlyRent or annualRent/12 | 30% |
| 9 | `freelance_consulting` | averageMonthlyIncome | 20-30% |
| 10 | `agriculture_income` | annualAgricultureIncome / 12 | 30-50% |
| 11 | `investment_income` | annualInvestmentIncome / 12 | 30-50% |
| 12 | `no_current_income` | → 0 | 100% (rejected) |

Gross extraction logic is centralized in `systemConfig.ts:154` (`INCOME_EXTRACTORS` registry).

### How Assessment Works Per Entry

```
For each non-guarantor applicant:
  For each incomeEntry in applicant.incomeEntries[]:
    1. grossAmount = INCOME_EXTRACTORS[profileType](entry.income)
    2. matchingRule = find lender's income rule for this profileType
       (exact match preferred, wildcard "*" as fallback)
    3. If rule has conditions (JSON-Logic):
         Evaluate condition against payload
         If false → income rejected (haircut = 100%)
    4. If rule has assessment_logic (custom JSON-Logic):
         assessedAmount = evaluate logic with entry context
       Else:
         assessedAmount = grossAmount × (1 - haircut_percent / 100)
    5. Apply max_contribution_percent cap:
         If secondary source and cap exists:
           finalAmount = min(assessedAmount, runningTotal × cap%)
    6. Accumulate into totalAssessed
```

### Example: Multi-Source Assessment

**Applicant A (Primary)**:
| Source | Gross | Haircut | Assessed |
|--------|-------|---------|----------|
| Salaried | ₹70,000/mo | 0% | ₹70,000 |
| Rental | ₹20,000/mo | 30% | ₹14,000 |
| *Total A* | | | *₹84,000* |

**Applicant B (Co-applicant)**:
| Source | Gross | Haircut | Assessed |
|--------|-------|---------|----------|
| Business | ₹60,000/mo | 25% | ₹45,000 |
| *Total B* | | | *₹45,000* |

**Combined household assessed income: ₹84,000 + ₹45,000 = ₹1,29,000/month**

### Key Points

- **Haircuts are per-lender**, not global. HDFC may use 20% for business; SBI may use 25%.
- **Secondary source caps**: Some lenders cap rental income at 50% of primary income.
- **Guarantors are excluded** from income assessment.
- **Company applicants**: Director salary + dividend from incomeEntries, processed identically.

---

## 5. Obligation Load Computation

**What**: Calculate how much of the applicant's income is already committed to existing loans.

### Two Obligation Types

| Type | How It's Counted | Example |
|------|-----------------|---------|
| **Term loan** | `count_factor × EMI` (usually 100%) | Car loan EMI ₹15,000 → counted ₹15,000 |
| **Credit line** (OD/DOD/CC) | `credit_line_factor × total_limit` (usually 5%) | CC limit ₹5,00,000 → counted ₹25,000 |

### Closure Treatment

If an applicant marks an obligation as "Will close before disbursement":
- Lender may ignore it entirely (counted as ₹0)
- Some lenders still count it at reduced factor

### Why It Matters

Obligations directly reduce the FOIR-eligible amount:

```
maxEMI = (assessedIncome × maxFOIR) - totalObligations
```

Higher obligations → lower maxEMI → lower eligible amount → potentially RED.

---

## 6. EMI & Amount Calculations (Pure Math)

**File**: `emiCalculator.ts` (95 lines) — All pure functions, no side effects.

### EMI Formula

```
EMI = P × r × (1+r)^n / ((1+r)^n - 1)

where:
  P = principal (loan amount)
  r = monthly interest rate (annual_rate / 100 / 12)
  n = tenure in months
```

**Example**: ₹50,00,000 @ 8.5% for 20 years (240 months)

```
r = 0.085 / 12 = 0.007083
factor = (1.007083)^240 = 5.4368
EMI = 50,00,000 × 0.007083 × 5.4368 / (5.4368 - 1) = ₹43,391
```

### FOIR-Eligible Amount (Reverse EMI)

```
maxEMI = (assessedIncome × maxFOIR) - existingObligations
principal = maxEMI × ((1+r)^n - 1) / (r × (1+r)^n)
```

**Example**: Income ₹1,00,000, FOIR 55%, obligations ₹25,000, rate 8.5%, tenure 240m

```
maxEMI = (1,00,000 × 0.55) - 25,000 = ₹30,000
principal = 30,000 × (5.4368 - 1) / (0.007083 × 5.4368) = ₹34,56,892
```

### LTV-Capped Amount

```
propertyValue = min(marketValue, propertyCost)
ltvCapped = propertyValue × (maxLTV / 100)
```

**Example**: Property cost ₹62,50,000, market value ₹55,00,000, LTV 80%

```
propertyValue = min(62,50,000, 55,00,000) = ₹55,00,000
ltvCapped = 55,00,000 × 0.80 = ₹44,00,000
```

### Offered Amount

```
offered = min(requested, foirEligible, ltvCapped)
```

The most constraining factor wins. This is the amount the bank will actually offer.

### Effective Tenure

```
ageLimitedMonths = max(0, (maxAgeAtMaturity - primaryAge) × 12)
effectiveTenure = max(12, min(requestedMonths, ageLimitedMonths, lenderMaxMonths))
```

**Example**: Age 50, maturity 65, requested 25yr, lender max 30yr

```
ageLimit = (65 - 50) × 12 = 180 months (15 years)
effective = min(300, 180, 360) = 180 months  ← age is the constraint
```

---

## 7. Discomfort Analysis — Gap Detection & Calculated Solutions

**File**: `discomfortAnalyzer.ts` (693 lines)

### Philosophy

Every loan rejection comes from discomfort on two axes:

- **ABILITY**: Can the applicant(s) repay? (FOIR, income, age, obligations)
- **INTENT**: Will they repay? (CIBIL, LTV/down payment, business vintage)

The analyzer **detects** what's wrong and **calculates** specific fixes with real numbers.

### 7 Zone Types Detected

| Zone | Category | Trigger | Severity |
|------|----------|---------|----------|
| `foir_breach` | Ability | FOIR exceeds max cap | Blocking |
| `foir_marginal` | Ability | FOIR within 5% of cap | Marginal |
| `ltv_shortfall` | Intent | LTV cap limits amount below FOIR-eligible | Limiting |
| `cibil_below_threshold` | Intent | CIBIL gate failed | Blocking/Limiting |
| `age_maturity_limit` | Ability | Tenure reduced by age cap | Limiting |
| `income_insufficiency` | Ability | Offered < 80% of requested | Limiting/Blocking |
| `obligation_overload` | Ability | Obligations > 30% of income | Limiting |

Plus: Each failed hard gate (non-CIBIL) generates a **gate failure zone** with severity "blocking".

### Zone Structure

```typescript
{
  zone_id: "foir_breach",
  category: "ability",
  label: "FOIR Breach",
  severity: "blocking",
  current_value: 0.58,          // Actual FOIR (58%)
  required_value: 0.55,         // Max allowed (55%)
  gap: 3,                       // 3 percentage points
  gap_unit: "%",
  explanation: "FOIR at 58%, needs ≤55%. Gap: 3% (≈₹3,900/month excess obligations)"
}
```

### Calculated Solutions (Not Hardcoded!)

For each zone, solver functions compute **specific fixes**. These are NOT generic text — they include real before/after numbers.

#### FOIR Breach Solvers:

| Solution | Calculation | Example Output |
|----------|------------|----------------|
| **Extend tenure** | Recalculate EMI with +60 months | "EMI drops ₹43K→₹37K, FOIR drops 58%→52%" |
| **Close top obligation** | Remove highest obligation from load | "Closing ₹8K/mo car loan → FOIR drops 58%→52%" |
| **Add co-applicant** | Calculate required additional income | "Additional ₹25K/mo income brings FOIR within 55% cap" |
| **Reduce loan amount** | Calculate EMI at FOIR-eligible amount | "Reducing ₹50L→₹35L brings FOIR within limit" |

#### LTV Shortfall Solvers:

| Solution | Calculation | Example Output |
|----------|------------|----------------|
| **Increase down payment** | Required DP = cost - LTV-capped | "Arrange ₹14L down payment to meet 80% LTV" |
| **PL bridge** | Calculate PL EMI + combined FOIR | "PL of ₹8L feasible — combined FOIR 54%" + intent risk warning |
| **Cheaper property** | Max property = offered / LTV% | "At 80% LTV, max supported property: ₹45L" |

#### CIBIL Solvers:

| Solution | Calculation | Example Output |
|----------|------------|----------------|
| **Add strong co-applicant** | — | "Co-applicant with CIBIL 750+ strengthens case" |
| **Improve CIBIL** (gap ≤70) | — | "Pay CC util below 30%, +20-40 pts in 45-60 days" |

#### Age Limit Solvers:

| Solution | Calculation | Example Output |
|----------|------------|----------------|
| **Add younger co-applicant** | Recalculate tenure with age ~30 | "Younger co-applicant extends 15yr→20yr, EMI drops ₹43K→₹37K" |

### Solution Structure

```typescript
{
  id: "extend-tenure-foir",
  zone_id: "foir_breach",
  title: "Extend tenure to 25 years",
  description: "Increasing tenure reduces EMI, lowering FOIR.",
  impact: {
    metric: "foir",
    before: 0.58,               // Current FOIR
    after: 0.48,                // After extending tenure
    improvement: "FOIR drops from 58% to 48%"
  },
  effort: "easy",               // easy | moderate | significant
  timeframe: "immediate",       // immediate | weeks | months
  intent_risk: "none",          // none | low | high
  intent_risk_note: undefined   // Only for PL bridge (high risk)
}
```

Only **top 5** solutions are returned, ranked by impact. Duplicates are de-duplicated by `id`.

### Async Hints

Signals for deeper analysis (not calculated inline):

```typescript
{
  needs_inverse_solve: boolean,  // LTV or income gap → need optimal property price
  needs_cross_lender: boolean,   // Gate failure → check other lenders' policies
  needs_pl_bridge: boolean       // LTV gap + FOIR headroom → PL option possible
}
```

---

## 8. Suggestions, Warnings & Feedback — How They Are Generated

### Feedback Taxonomy

The engine produces **5 types of feedback**. None are hardcoded per bank. All are computed from evaluation metrics.

| Type | Purpose | Source | Count |
|------|---------|--------|-------|
| **Decision Factors** | Explain WHY a result is what it is | Gate results + computed metrics | 5-15 per lender |
| **Improvement Suggestions** | Actionable steps to improve eligibility | Deviations + discomfort + static logic | 1-5 per lender |
| **Discomfort Zones** | Quantified gaps blocking eligibility | Metric analysis | 0-5 per lender |
| **Quick Solutions** | Calculated fixes with before/after numbers | Zone solvers | 0-5 per lender |
| **Async Hints** | Signals for deeper analysis | Boolean flags | 3 flags |

### How Decision Factors Are Built

**Source**: `resultBuilder.ts` → `buildFactors()` (line 112)

Each hard gate result becomes a factor:

```typescript
{
  id: "cibil-gate-1",
  label: "CIBIL Score",
  impact: "positive",                        // gate passed
  description: "CIBIL 780 meets minimum 700",
  category: "credit",
  metric: {
    label: "CIBIL",
    value: "780",
    benchmark: "min 700"
  }
}
```

Plus computed factors for FOIR, income, LTV, and obligations — with real numbers.

### How Improvement Suggestions Are Built

**Source**: `resultBuilder.ts` → `buildSuggestions()` (line 203)

Three layers merged in priority order:

1. **Discomfort-derived** (highest priority) — from `analyzeDiscomfort()` solutions, converted to `ImprovementSuggestion` format. These have real calculated numbers.

2. **Deviation-derived** — when deviations turned RED → AMBER:
   ```
   Title: "CIBIL deviation — branch manager approval"
   Effort: moderate (mapped from authority level)
   ```

3. **Legacy static** (lowest priority) — generic suggestions triggered by evaluation state:
   - "Add a co-applicant with income" → when single applicant, low income
   - "Close existing obligations" → when FOIR > 40%
   - "Extend tenure to reduce EMI" → when secured loan, tenure < 25 years
   - "Increase down payment" → when LTV is the bottleneck

### Are Suggestions Hardcoded or Dynamic?

| Element | Hardcoded? | Dynamic? |
|---------|-----------|---------|
| Decision factor labels | Template-based | Values are real |
| Discomfort zone detection | Zone types are fixed | Thresholds, gaps, numbers are calculated |
| Quick solution generation | Solution templates are fixed | All numbers are calculated per-evaluation |
| Quick solution impact text | Template pattern | Before/after values are real |
| Deviation suggestions | Template: "Deviation possible with {X} approval" | Authority is from rule doc |
| Legacy static suggestions | Trigger conditions are fixed | — |
| Traffic light colors | 4 fixed colors | Assignment logic is dynamic |
| Ratings | Threshold values are fixed | Percentiles are cross-lender dynamic |

**Bottom line**: The *categories* of feedback are predefined, but the *content* (numbers, explanations, impact calculations) is fully dynamic and computed per evaluation.

---

## 9. Ratings & Approval Probability

### Relative Rating System

**Source**: `resultBuilder.ts` → `assignRatings()` (line 315)

Lenders are ranked against **each other**, not against absolute thresholds. Only GREEN + AMBER lenders participate.

**4 metrics rated**:

| Metric | Weight | Direction | Best = |
|--------|--------|-----------|--------|
| Amount offered | 40% | Higher is better | Highest offered |
| ROI | 30% | Lower is better | Lowest rate |
| EMI | 20% | Lower is better | Lowest payment |
| Tenure | 10% | Longer is better | Longest tenure |

**Percentile → Rating**:

| Percentile | Rating |
|-----------|--------|
| ≥ 75% | Excellent |
| ≥ 50% | Good |
| ≥ 25% | Average |
| < 25% | Poor |

**Overall rating**: Weighted average of all 4 metric ratings.

RED and GREY lenders automatically get "poor" on all metrics.

### Approval Probability

**Source**: `resultBuilder.ts` → `calculateApprovalProbability()` (line 401)

| Traffic Light | Base Probability |
|--------------|-----------------|
| GREEN | 88% |
| AMBER | 55% |
| RED | 5% |
| GREY | 0% |

**Penalties applied** (cumulative):

| Condition | Penalty |
|-----------|---------|
| Each deviation applied | -8% to -25% (from `deviation.probability_modifier`) |
| FOIR ≥ 90% of cap | -8% |
| FOIR ≥ 80% of cap | -4% |
| CIBIL gate failed | -10% |

Final result is clamped to [0, 1].

**Example**: GREEN base 88%, FOIR at 85% of cap → 88% - 4% = **84% approval probability**.

---

## 10. The Final Offer Card — LenderResult Structure

**Type**: `LenderResult` in `src/lib/types/lenderResults.ts:200`

```typescript
{
  // ── Identity ──
  lender_application_id: "hdfc-bank",
  lender_name: "HDFC Bank",

  // ── Traffic Light ──
  traffic_light: "green" | "amber" | "red" | "grey",
  traffic_light_message: "Eligible for full requested amount",

  // ── Financials ──
  eligible_amount: 5000000,       // What income supports (FOIR-eligible)
  ltv_capped_amount: 4400000,     // What property supports (secured only)
  offered_amount: 4400000,        // Final: min(requested, eligible, ltv)
  roi: 8.85,                      // Annual interest rate %
  emi: 38521,                     // Monthly payment
  tenure_months: 240,             // Effective tenure
  processing_fee_percent: 0.50,   // Processing fee %

  // ── Ratings ──
  rating: "excellent",            // Overall
  metric_ratings: {
    amount: "excellent",
    roi: "good",
    emi: "good",
    tenure: "excellent"
  },

  // ── Analysis ──
  factors: DecisionFactor[],        // 5-15 factors explaining the result
  suggestions: ImprovementSuggestion[],  // 1-5 actionable suggestions
  corporate_dsas: CorporateDsaRec[],     // Corporate DSA channel recommendations

  // ── Key Metrics ──
  key_metrics: {
    foir: 45,                     // Actual FOIR %
    ltv: 80,                      // Actual LTV %
    net_income: 129000,           // Total assessed income
    cibil: 780,                   // Primary CIBIL
    approval_probability: 0.88    // 0-1 score
  },

  // ── Discomfort ──
  discomfort: {
    discomfort_zones: DiscomfortZone[],
    quick_solutions: QuickSolution[],
    async_hints: { needs_inverse_solve, needs_cross_lender, needs_pl_bridge }
  },

  // ── Phase 4 Enrichments ──
  tranche_breakdown: TrancheBreakdown | undefined,
  nri_gpa_policy: string | undefined,
  registry_urgency: "urgent" | "normal" | undefined,
  bt_appreciation: BTAppreciationSignal | undefined,

  computed_at: "2026-03-26T12:00:00Z"
}
```

### Results Summary

```typescript
{
  total_lenders: 7,
  green_count: 4,
  amber_count: 2,
  red_count: 1,
  best_amount: { value: 5000000, lender: "HDFC Bank" },
  best_roi: { value: 8.00, lender: "SBI" },
  best_emi: { value: 36000, lender: "SBI" },
  requested_amount: 5000000,
  loan_type: "Home Loan"
}
```

---

## 11. Lender Policies — What Exists Today

### 7 Hard-Coded Lenders

**File**: `realBankRuleDocs.ts` (2,319 lines)

| # | Lender | ID | Class | Loan Types | CIBIL Min | Age | Max Tenure | FOIR Tiers | ROI Range | LTV | Proc. Fee |
|---|--------|-----|-------|-----------|-----------|-----|-----------|-----------|-----------|-----|-----------|
| 1 | HDFC Bank | `hdfc-bank` | PVT | HL, LAP | 700 | 21-65 | 30yr | 45/50/60% | 8.50-9.85% | 75-90% | 0.50% |
| 2 | ICICI Bank | `icici-bank` | PVT | HL, LAP | 650 | 21-65 | 30yr | 50/55/65% | 8.75-9.90% | 75-90% | 0.50% |
| 3 | Axis Bank | `axis-bank` | PVT | HL, LAP | 700 | 21-60 | 30yr | 55/60/70% | 8.70-10.10% | 75-85% | 1.00% |
| 4 | SBI | `sbi` | GOV | HL, LAP, BL | 650 | 18-70 | 30yr | 45/50/55% | 8.00-9.15% | 75-90% | 0.35% |
| 5 | Bajaj Housing | `bajaj-housing` | NBFC | HL, LAP, BL | 700 | 23-75 | 40yr | 50/55/60% | 8.25-10.25% | 75-85% | 2.00% |
| 6 | Tata Capital | `tata-capital` | NBFC | HL, LAP, BL | 650 | 24-65 | 25yr | 50/55/60% | 8.75-10.50% | 70-80% | 2.00% |
| 7 | LIC HFL | `lic-hfl` | NBFC | HL, LAP, BL | 650 | 21-60 | 30yr | 50/55/60% | 8.00-9.50% | 75-85% | 0.25% |

### Bank Master List: 50+ Banks

**File**: `src/lib/config/bankSelection/bankName.ts`

- **24 Private**: HDFC, ICICI, Axis, Kotak, HSBC, Yes Bank, Federal, etc.
- **12 Government**: SBI, PNB, BoB, Union Bank, Indian Bank, Central Bank, etc.
- **14 NBFC**: Bajaj, LIC, Tata Capital, IIFL, HDB, L&T Finance, PNB HF, etc.

Only the 7 hard-coded lenders produce offer cards today. The other 43+ are available in the bank master list for DSA selection but have no rule documents yet.

### Policy Structure Per Lender

Each `ParsedLenderRuleDocument` has **16 rule sections**:

| Section | Purpose | Typical Rules |
|---------|---------|--------------|
| `eligibility` | Age, applicant type gates | 2-3 rules |
| `cibil` | Credit score minimum + NRI adjustments | 1-2 rules |
| `foir` | Income-based FOIR caps (tiered) | 3-5 rules |
| `income_assessment` | Per-income-type haircuts | 8-12 rules |
| `ltv` | Loan-to-value caps (tiered by amount) | 3-4 rules |
| `obligation_treatment` | Term loan + credit line counting | 2-3 rules |
| `property` | Property-specific rules | 0-3 rules |
| `transaction` | Deal structure rules | 0-2 rules |
| `tenure` | Max tenure + age-at-maturity | 2 rules |
| `roi` | Interest rates (tiered by CIBIL) | 4-5 rules |
| `fees` | Processing fees | 1 rule |
| `disbursement` | Disbursement conditions | null (future) |
| `documentation` | Documentation requirements | 0-2 rules |
| `nri` | NRI eligibility gates | 0-2 rules |
| `company` | Company vintage/turnover | 0-2 rules |
| `balance_transfer` | BT-specific rules | null (future) |

Plus: `deviations[]` (2-4 per lender) and `policies[]` (4-5 display fields).

### How Lenders Are Loaded

```typescript
// evaluationEngine.ts:58
const artifacts = await LenderRuleArtifacts.find({
  status: 'active',
  loan_types: loanName    // e.g., "Home Loan"
}).toArray();
```

The 7 lenders are seeded into MongoDB by `seedRealBankRuleDocuments()` at startup. Future RM-submitted policies will also live in this collection.

---

## 12. RM Policy Capture System

### Overview

RMs (Relationship Managers) can submit bank policies through a **10-step wizard**. These go through admin review before becoming active rule documents.

**Status**: UI built, API routes exist, but the **transformation pipeline** (PolicyCapture → active rule doc) is not yet connected. This is the next major integration task.

### 10 Wizard Steps

| Step | Component | What It Captures |
|------|-----------|-----------------|
| 1 | `CoreParametersStep` | ROI type, FOIR slabs, tenure, LTV, fees |
| 2 | `EligibilityStep` | Age limits, employment types, NRI conditions |
| 3 | `CreditCibilStep` | CIBIL score requirements |
| 4 | `IncomeAssessmentStep` | Per-income-type haircuts (all 12 types) |
| 5 | `PropertyRulesStep` | Property types, LTV by property, compliance |
| 6 | `ObligationsStep` | Term loan factor, credit line method |
| 7 | `BTTopupStep` | Balance transfer & top-up rules |
| 8 | `FeesPoliciesStep` | Processing fees, turnaround time, 25+ policy fields |
| 9 | `DeviationsStep` | Gate relaxation conditions |
| 10 | `ReviewSubmitStep` | Final review before submission |

### Workflow

```
RM fills 10-step wizard → PolicyCapture (status: 'draft')
         │
         ▼
RM clicks "Submit" → PolicyCapture (status: 'submitted')
         │
         ▼
Admin reviews → 'under_review' → 'accepted' or 'rejected' or 'clarification_needed'
         │
         ▼
If accepted → PolicyVersion created (immutable, SHA-256 hash)
         │
         ▼
[PENDING] Transformer converts PolicyVersion → ParsedLenderRuleDocument
         │
         ▼
[PENDING] Seeded into LenderRuleArtifacts with status: 'active'
         │
         ▼
evaluatePayload() picks it up automatically via loadActiveRuleDocuments()
```

### Routes & API

| Route | Purpose |
|-------|---------|
| `GET /dashboard/rm/policy-capture` | List RM's captures |
| `GET /dashboard/rm/policy-capture/new` | Create new capture |
| `GET /dashboard/rm/policy-capture/[capture_id]` | Edit capture |
| `POST /api/rm/policy-captures` | Create capture |
| `PATCH /api/rm/policy-captures/[capture_id]` | Auto-save step |
| `POST /api/rm/policy-captures/[capture_id]/submit` | Submit for review |

### Types

**File**: `src/lib/types/policyCapture.ts` — 10+ step data interfaces

**File**: `src/lib/types/policyEngine.ts` — Full policy engine type system (Lender, LenderProduct, ProductVariation, GeoScope, PolicyRule, PolicyVersion, etc.)

### Two-Axis Resolution (Future)

The policy engine is designed for **CSS-specificity-style** rule resolution:

1. **Product axis**: Lender → ProductType → ProductVariation
2. **Geography axis**: PAN-India → State → City → Zone

Most specific rule wins. Geo specificity: zone (30) > city (20) > state (10) > pan_india (0).

---

## 13. Form Fields Consumed by the Engine

### Loan Transaction Level

| bindsTo Key | What It Is | Used In |
|------------|-----------|---------|
| `loanName` | "Home Loan", "Personal Loan", etc. | Rule loading, loan type check |
| `loanType` | "New Loan", "Balance Transfer", "Top-up" | Enricher, tranche breakdown |
| `loanAmount` | Requested loan amount (₹) | Amount calculation |
| `tenureYears` | Requested tenure in years | Tenure calculation |
| `propertyCost` | Deal price (₹) | LTV calculation |
| `marketValue` | Market assessment (₹) | LTV calculation (V2) |
| `registryValue` | Registered value (₹) | LCR calculation, tranche |
| `propertyIdentified` | "Yes" / "No" | Tranche breakdown guard |
| `propertyAreaType` | Area classification | Compliance derivation |
| `creditHistoryStatus` | "defaulter" / "guarantor" / "both" / "none" | Enricher → legacy compat |
| `propertyComplianceStatus` | Compliance state | Enricher → legacy compat |
| `incomeDocAvailable` | "payslips_only" / "form16_only" / "both" / "none" | Enricher → legacy compat |
| `numberOfApplicants` | Count | _computed._applicant_count |
| `excludedBanks` | Banks DSA wants to skip | Pre-filter |

### Per Applicant

| Field | What It Is | Used In |
|-------|-----------|---------|
| `applicantType` | "Individual" / "Company" | Gate evaluation |
| `roleInApplication` | "Primary" / "Co-applicant" / "Guarantor" | Income assessment (guarantors excluded) |
| `age` | Applicant's age | Eligibility gate, tenure calculation |
| `employmentType` | "Salaried(Private)" / "Self-employed(Other)" / etc. | _computed._primary_employment |
| `creditScore` | CIBIL score | CIBIL gate, ROI tier |
| `incomeEntries[]` | Array of income sources | Income assessment V2 |
| `obligations[]` | Array of existing loans | Obligation load |
| `isNRI` | NRI status | NRI gate |
| `hasExistingObligations` | Has obligations? | Obligation processing |

### Per Income Entry

| Field | What It Is | Used In |
|-------|-----------|---------|
| `profileType` | One of 12 income types | Rule matching |
| `income.*` | Type-specific income fields | Gross extraction |
| `evidence.vintageYears` | Income vintage | Rule conditions |
| `entityName` | Company/firm name | Reporting |

### Per Obligation

| Field | What It Is | Used In |
|-------|-----------|---------|
| `obligationType` | "term_loan" / "credit_line" | Treatment rule matching |
| `emi` | Monthly EMI (string) | Obligation counting |
| `totalLimit` | Credit limit (string) | Credit line counting |
| `selectedToClose` | "Will close" / "Keep running" | Closure treatment |

---

## 14. Payload Enrichment — Backward Compatibility & Computed Fields

**File**: `payloadEnricher.ts` (718 lines)

### Why Enrichment Exists

The form uses **merged questions** (single field for multiple concepts), but older JSON-Logic rules reference **legacy field names**. The enricher bridges this gap.

### Key Backward-Compat Derivations

| Merged Form Field | Legacy Fields Derived | Logic |
|-------------------|---------------------|-------|
| `creditHistoryStatus` | `isDefaulter`, `madeGuarantor` | "defaulter"/"both" → isDefaulter="Yes" |
| `propertyComplianceStatus` | `approvedByAuthority`, `asPerMap` | "fully_compliant" → both="Yes" |
| `incomeDocAvailable` | `payslips`, `Form16Available` | "payslips_only"/"both" → payslips="Yes" |
| `marketValue` (V2) | `atsValue` (V1) | If no V1 atsValue, use marketValue |

### Three-Cost Property Model

For Home Loans with under-registration:

| Cost | Purpose | Used For |
|------|---------|---------|
| `propertyCost` | Deal price | LTV (as denominator with marketValue) |
| `marketValue` | Market assessment | LTV (min with propertyCost) |
| `registryValue` | Registered value (lower) | LCR, tranche breakdown |

### Company Family Control

For Company applicants with directors, the enricher derives:

```typescript
applicant.companyProfile = {
  familyControlled: boolean,        // >50% family stake
  familyStakePercent: number,
  familyDominance: "high" | "medium" | "low" | "none",
  familyClusterSize: number,
  totalDirectors: number
}
```

---

## 15. Worked Examples — Step-by-Step Calculations

### Example 1: Home Loan — Full Approval (GREEN)

**Application**:
- Loan: Home Loan, ₹50,00,000 requested, 20 years
- Property: cost ₹65,00,000, market value ₹60,00,000
- Applicant A: Age 35, salaried ₹1,20,000/mo, CIBIL 780
- Applicant B: Age 32, rental ₹25,000/mo, CIBIL 740
- Obligations: Car loan EMI ₹15,000, CC limit ₹3,00,000

**Step 1 — Income Assessment** (HDFC, haircuts: salaried 0%, rental 30%):
```
A: ₹1,20,000 × (1 - 0%) = ₹1,20,000
B: ₹25,000 × (1 - 30%) = ₹17,500
Total assessed: ₹1,37,500/month
```

**Step 2 — Obligation Load**:
```
Car loan: ₹15,000 × 1.0 (100% count) = ₹15,000
CC: ₹3,00,000 × 0.05 (5% of limit) = ₹15,000
Total obligations: ₹30,000/month
```

**Step 3 — Effective Tenure**:
```
Age limit: (65 - 35) × 12 = 360 months
Lender max: 360 months
Requested: 240 months
Effective: min(240, 360, 360) = 240 months
```

**Step 4 — Parameters** (HDFC, CIBIL 780):
```
ROI: 8.50% (780 tier)
FOIR: 50% (income > ₹1L tier)
LTV: 80% (loan < ₹75L tier)
```

**Step 5 — Amount Calculation**:
```
maxEMI = (₹1,37,500 × 0.50) - ₹30,000 = ₹38,750
FOIR-eligible = reverse-calc(₹38,750, 8.50%, 240m) = ₹47,72,415

propertyValue = min(₹65,00,000, ₹60,00,000) = ₹60,00,000
LTV-capped = ₹60,00,000 × 0.80 = ₹48,00,000

offered = min(₹50,00,000, ₹47,72,415, ₹48,00,000) = ₹47,72,415
EMI = calculateEMI(₹47,72,415, 8.50%, 240) = ₹37,123
actualFOIR = (₹30,000 + ₹37,123) / ₹1,37,500 = 48.8%
```

**Step 6 — Traffic Light**:
```
All gates pass ✓
Offered (₹47.7L) < Requested (₹50L) → AMBER (partial amount)
Message: "Eligible with reduced amount due to policy constraints"
```

**Step 7 — Discomfort Analysis**:
```
Zone: income_insufficiency (offered 95.4% of requested — marginal)
Solution: "Close CC (₹15K/mo freed) → FOIR drops to 38%, full amount eligible"
```

### Example 2: Personal Loan — RED with Deviation → AMBER

**Application**:
- Loan: Personal Loan, ₹10,00,000 requested, 5 years
- Applicant: Age 28, business income ₹80,000/mo, CIBIL 660

**ICICI Evaluation**:
```
Income: ₹80,000 × (1 - 25%) = ₹60,000 assessed
CIBIL gate: min 650 → PASS (660 ≥ 650)
FOIR: 55% (income < ₹1L tier)
maxEMI = ₹60,000 × 0.55 = ₹33,000
FOIR-eligible = reverse-calc(₹33,000, 13%, 60m) = ₹15,02,000
offered = min(₹10L, ₹15L) = ₹10,00,000 → GREEN
```

**HDFC Evaluation**:
```
CIBIL gate: min 700 → FAIL (660 < 700) → RED
Deviation: "CIBIL 650-699 if income > ₹50K" → condition MET
→ RED becomes AMBER
Authority: branch_manager
Probability: 55% base - 15% deviation = 40%
```

### Example 3: GREY Evaluation

```
Lender: Tata Capital (only supports Home Loan, LAP, Business Loan)
Application: Professional Loan
→ Loan type not in lender's loan_types array
→ GREY: "Cannot evaluate — unsupported loan type"
```

---

## 16. How to Make Changes Safely

### Changing Form Fields

If you rename, remove, or restructure a form field (bindsTo key), trace through this chain:

```
1. payloadBuilder.ts → Does it use the old key?
2. payloadEnricher.ts → Does it derive backward-compat fields from it?
3. realBankRuleDocs.ts → Do any JSON-Logic rules reference it?
4. evaluationEngine.ts → Is it used in _computed fields?
5. incomeAssessorV2.ts → Is it part of incomeEntry structure?
6. discomfortAnalyzer.ts → Does it read it from the payload?
```

**Critical rule**: JSON-Logic rules reference field names by string. If a field is renamed, the rule silently returns `null`/`undefined` and the condition may evaluate to `false` — causing **silent failures** (gates pass when they shouldn't, or parameters don't extract).

### Adding a New Income Type

1. Add extractor to `systemConfig.ts` → `INCOME_EXTRACTORS` registry
2. Add to form config (income profile options)
3. Each lender's `income_assessment` rules should handle it (or wildcard `*` catches it)
4. Add tests

### Adding a New Lender

1. Create a `ParsedLenderRuleDocument` constant in `realBankRuleDocs.ts` (follow existing pattern)
2. Add to `ALL_REAL_BANK_RULE_DOCS` array
3. Add to bank master list (`bankSelection/bankName.ts`) if not already there
4. Run `seedRealBankRuleDocuments()` to insert into MongoDB
5. Run tests — the engine will automatically evaluate against it

### Modifying a Lender's Rules

1. Find the lender constant in `realBankRuleDocs.ts` (e.g., `HDFC_BANK` at line ~175)
2. Modify the relevant section (e.g., add a new ROI tier, change CIBIL minimum)
3. Re-seed by calling `seedRealBankRuleDocuments()` (it upserts by `lender_id`)
4. Run tests

### Adding a New Gate Category

1. Add to `HARD_GATE_SECTIONS` in `src/lib/ruleEngine/types.ts`
2. Add rules to lender documents under the new section
3. The engine automatically iterates all gate sections — no engine code changes needed
4. Add corresponding zone detector in `discomfortAnalyzer.ts` if relevant

### Adding a New Computed Field

1. Add to `ComputedFields` interface in `payloadEnricher.ts:27`
2. Compute the value in `enrichPayload()` function
3. JSON-Logic rules can now reference it via `_computed.your_new_field`

### Modifying Constants

All tunable constants are in `systemConfig.ts`. Change there — no hunting across files:

- Rating weights → `RATING_WEIGHTS`
- Probability bases → `PROBABILITY_BASE`
- FOIR penalties → `FOIR_PROXIMITY_PENALTIES`
- Required params → `REQUIRED_PARAMS`
- Min tenure → `MIN_TENURE_MONTHS`
- Loan types → `LOAN_TYPE_CONFIG`

---

## 17. File Map — Where Everything Lives

### Core Engine (6 files, ~3,400 lines)

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `evaluationEngine.ts` | 655 | Core orchestrator | `evaluatePayload()`, `loadActiveRuleDocuments()` |
| `incomeAssessorV2.ts` | 233 | Multi-source income assessment | `assessIncomeV2()` |
| `payloadEnricher.ts` | 718 | Computed fields + backward compat | `enrichPayload()` |
| `resultBuilder.ts` | 847 | Offer card assembly + ratings | `buildLenderResult()`, `assignRatings()`, `buildSummary()` |
| `discomfortAnalyzer.ts` | 693 | Gap detection + calculated solutions | `analyzeDiscomfort()` |
| `emiCalculator.ts` | 95 | Pure math functions | `calculateEMI()`, `calculateFoirEligibleAmount()`, etc. |

### Configuration (2 files, ~2,500 lines)

| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `systemConfig.ts` | 219 | All constants + registries | `RATING_WEIGHTS`, `PROBABILITY_BASE`, `INCOME_EXTRACTORS`, etc. |
| `realBankRuleDocs.ts` | 2,319 | 7 hard-coded lender policies | `ALL_REAL_BANK_RULE_DOCS`, `seedRealBankRuleDocuments()` |

### Types (3 files, ~1,000 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/types/lenderResults.ts` | 282 | Output types (LenderResult, DiscomfortZone, etc.) |
| `src/lib/types/policyCapture.ts` | 300+ | RM policy capture step types |
| `src/lib/types/policyEngine.ts` | 700+ | Full policy engine type system |
| `src/lib/ruleEngine/types.ts` | — | Internal types (ParsedRule, GateResult, LenderEvaluation, etc.) |

### Policy Capture UI (11 components)

| File | Purpose |
|------|---------|
| `src/lib/components/policy-capture/PolicyCaptureWizard.svelte` | Main wizard shell |
| `.../steps/CoreParametersStep.svelte` | ROI, FOIR, tenure, LTV |
| `.../steps/EligibilityStep.svelte` | Age, employment, NRI |
| `.../steps/CreditCibilStep.svelte` | CIBIL requirements |
| `.../steps/IncomeAssessmentStep.svelte` | Income type haircuts |
| `.../steps/PropertyRulesStep.svelte` | Property rules |
| `.../steps/ObligationsStep.svelte` | Obligation treatment |
| `.../steps/BTTopupStep.svelte` | Balance transfer |
| `.../steps/FeesPoliciesStep.svelte` | Processing fees, 25+ fields |
| `.../steps/DeviationsStep.svelte` | Gate relaxation conditions |
| `.../steps/ReviewSubmitStep.svelte` | Final review |

### Related Files

| File | Purpose |
|------|---------|
| `src/lib/utils/payloadBuilder.ts` | Converts form answers → LoanApplicationPayload |
| `src/lib/config/bankSelection/bankName.ts` | 50+ bank master list |
| `src/lib/ruleEngine/incomeAssessor.ts` | V1 income assessor (deprecated, kept for fallback) |
| `src/lib/ruleEngine/ruleValidator.ts` | Rule validation on submission |

---

## 18. Common Pitfalls & Debugging Tips

### Pitfall 1: Silent JSON-Logic Failures

**Problem**: You renamed a form field, but JSON-Logic rules still reference the old name. The condition evaluates to `false` (because the field is `undefined`), and the gate "passes" when it shouldn't — or a parameter tier doesn't match.

**How to detect**: Search `realBankRuleDocs.ts` for the old field name:
```bash
grep -n "oldFieldName" src/lib/ruleEngine/realBankRuleDocs.ts
```

**Fix**: Either update the rule doc OR add backward-compat derivation in `payloadEnricher.ts`.

### Pitfall 2: Missing Server Pipeline Passthrough

**Problem**: You added a new field to the schema (e.g., `exclusive` on options), but it doesn't reach the client.

**Why**: The server explicitly picks which fields to pass through. See `toClientOption()` in `optionResolver.ts` and `toClientQuestion()` in `engine.ts`. Missing this = field is `undefined` on client.

### Pitfall 3: Enricher Not Deriving a Field

**Problem**: A rule references a field like `isDefaulter`, but the form now uses `creditHistoryStatus`. The enricher must derive `isDefaulter` from `creditHistoryStatus`.

**How to check**: Read `payloadEnricher.ts` lines 230-500 — all backward-compat derivations are there.

### Pitfall 4: GREY Instead of GREEN/RED

**Problem**: A lender shows GREY (cannot evaluate) when it should show a result.

**Common causes**:
1. Missing required parameter (ROI, FOIR, tenure, age, or LTV for secured)
2. Lender's `loan_types` array doesn't include this loan type
3. Rule doc has no `sections` object
4. Malformed JSON-Logic that returns `null` instead of a number

**Debug**: Look at the parameter validation step — it logs which params are missing.

### Pitfall 5: Income = 0

**Problem**: Income assessment returns 0 for an applicant who clearly has income.

**Common causes**:
1. `incomeEntries` array is empty (V1 fallback used, but V1 fields also empty)
2. `profileType` doesn't match any rule (no wildcard `*` either)
3. Income rule has a `conditions` block that evaluates to false
4. Income entry's fields don't match the extractor (e.g., `grossMonthlySalary` misspelled)

**Debug**: Check `INCOME_EXTRACTORS` in `systemConfig.ts` — does the profile type have an extractor? Does the income object have the expected fields?

### Pitfall 6: Obligations Not Counted

**Problem**: Applicant has obligations but they're not affecting FOIR.

**Common causes**:
1. `hasExistingObligations` is false (obligations array skipped)
2. `emi` field is a string "0" or empty string
3. All obligations marked "Will close" and lender ignores closed ones
4. `obligationType` doesn't match any rule

### Debugging Checklist

When a result looks wrong:

1. **Check the payload** — Is the data correct in `LoanApplicationPayload`?
2. **Check enrichment** — Are `_computed.*` fields correct?
3. **Check gate results** — Which gates passed/failed?
4. **Check parameters** — Did ROI/FOIR/LTV extract correctly?
5. **Check income** — Is `totalAssessed` correct? Check per-source breakdown.
6. **Check obligations** — Is `totalMonthly` correct?
7. **Check amounts** — Is the bottleneck FOIR or LTV?
8. **Check deviations** — Are they matching failed gates correctly?

### Running Tests

```bash
# Run all rule engine tests
pnpm run test:unit

# Run specific test file
pnpm run test:unit -- --grep "evaluationEngine"

# Current: 7,155 passing tests across 62 files
```

---

## 19. Glossary

| Term | Definition |
|------|-----------|
| **CIBIL** | Credit score (300-900). Higher = better. Most lenders require 650-700+. |
| **EMI** | Equated Monthly Installment — the fixed monthly payment. |
| **FOIR** | Fixed Obligation to Income Ratio — (obligations + EMI) / income. Lower = better. Capped at 45-70% depending on lender. |
| **LTV** | Loan-to-Value ratio — loan amount / property value. Capped at 70-90% depending on lender and amount. |
| **LCR** | Loan Coverage Ratio — used for loans against registered property value. |
| **Haircut** | Percentage reduction applied to income. Salaried: 0% (full acceptance), Business: 20-30% (conservative). |
| **Hard Gate** | Pass/fail rule. If it fails, the applicant is RED (unless a deviation covers it). |
| **Deviation** | Exception rule that can convert a RED (failed gate) to AMBER (recoverable with manager approval). |
| **Traffic Light** | GREEN (full approval), AMBER (partial/deviation needed), RED (hard block), GREY (cannot evaluate). |
| **JSON-Logic** | A JSON format for expressing logical rules. Used for all gate conditions, parameter tiers, and deviations. See [jsonlogic.com](http://jsonlogic.com). |
| **ParsedLenderRuleDocument** | Complete policy for one lender — all gates, parameters, income rules, deviations. |
| **Enriched Payload** | Form data + 15 computed fields + backward-compat derivations. What JSON-Logic rules evaluate against. |
| **DiscomfortZone** | A quantified gap between current metrics and requirements. E.g., "FOIR at 58%, needs ≤55%". |
| **QuickSolution** | A calculated fix for a discomfort zone, with real before/after numbers. |
| **MetricRating** | Percentile-based rating: excellent / good / average / poor. Relative to other lenders. |
| **PVT / GOV / NBFC** | Lender classifications: Private bank / Government bank / Non-Banking Financial Company. |
| **bindsTo** | The key under which a form answer is stored. Rules reference these keys, not question IDs. |
| **BT** | Balance Transfer — refinancing an existing loan to a new lender. |
| **GPA** | General Power of Attorney — required for NRI applicants in India. |
| **OD / DOD / CC** | Overdraft / Demand Overdraft / Cash Credit — credit line facility types. |

---

> **Last updated**: 2026-03-26 (Session 41)
>
> **Companion docs**: `RULE-ENGINE-SPECIFICATION.md` (authoring pipeline), `LOAN-ASSESSMENT-API-INTEGRATION.md` (API contract), `PAYLOAD_DOCUMENTATION.md` (form→payload mapping)
