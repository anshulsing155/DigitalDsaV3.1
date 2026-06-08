# Credit Risk Intelligence System — Specification & Session Context

> **Created**: 2026-02-22 | **Status**: DESIGN PHASE (not yet implemented)
> **Purpose**: Resume document for Claude Code sessions. Read this to continue the Credit Risk Intelligence work from where we left off.

---

## HOW TO USE THIS DOCUMENT

**If you're a new Claude session**: Read this entire document. It contains everything needed to continue the Credit Risk Intelligence System design and implementation. After reading, ask the user what to work on next.

**If conversation gets too long**: The user will start a new session and say "Read CREDIT-RISK-INTELLIGENCE-SPEC.md and continue." That's your cue.

---

## 1. THE PROBLEM

The current system answers: **"Does this applicant meet this lender's stated policy?"**

It does NOT answer: **"Will this lender's credit manager actually approve this file?"**

### What's Missing

The current form collects data for **regulatory compliance checks** (LTV, FOIR, age limits, KYC). But real loan decisions happen on a **discretionary risk layer** that credit managers apply informally. Same profile gets approved at one lender and rejected at another — not because of policy, but because of **risk appetite**.

### Real-World Example

- Property in Gram Panchayat → most banks reject → but cooperative banks and some HFCs thrive there
- Cash-intensive business → SBI says no → but NBFC sees it as opportunity with higher rate
- Builder with delays → HDFC avoids → but LIC HFC has approved that project
- Seller has NBFC loan on the property → most banks require foreclosure first → some do internal transfer only
- Project approved by only 3 lenders → showing 50 bank offers is useless to the DSA

### What Was Lost in Recent Cleanup

A form cleanup removed/simplified questions that are critical for resale cases:

- Seller's existing loan details (lender name, NBFC vs bank, foreclosure amount)
- Seller guarantor requirement (some lenders make seller guarantor until registry + papers custody)
- Which lenders have approved specific builder/project/phase
- Internal transfer requirements
- Geographic lender coverage for property type

These need to be restored as part of this redesign, not as a separate fix.

---

## 2. THE VISION

Build a **two-layer evaluation system**:

### Layer 1: Policy Compliance (Existing, Enhanced)

RBI regulatory + stated lender rules. Binary pass/fail.

- Hard gates, FOIR, LTV, income assessment, EMI calculations
- Already built in `evaluationEngine.ts` (9-stage pipeline)
- Enhance with better property and seller data inputs

### Layer 2: Credit Risk Intelligence (New)

Per-lender risk appetite scoring. Graduated, not binary.

- Same risk signal → different score per lender
- Property risk × Applicant risk × Documentation risk × Marketability risk → per-lender approval probability
- Output: "HDFC won't touch this because NBFC seller + narrow access. But LIC HFC will because they've approved this builder and operate in this area."

### Key Principle

**The same answer means different things to different lenders.** The system must model per-lender variance in risk appetite, not a global risk score.

---

## 3. THE 8 RISK DIMENSIONS

These are the real-world risk dimensions credit managers evaluate (mapped from DSA owner's domain expertise):

### Dimension 1: Property — Legal Risk

| Signal                 | Low Risk                                | Medium Risk                    | High Risk                         | Very High Risk                 |
| ---------------------- | --------------------------------------- | ------------------------------ | --------------------------------- | ------------------------------ |
| Title clarity          | Single owner, clear chain ≥30yr         | Multiple owners, all traceable | Inherited / partitioned           | Ongoing or past dispute        |
| Land/approval status   | Fully approved layout, NA, OC available | Approved but OC pending        | Regularized / Akrama-Sakrama type | Unapproved / Gram Panchayat    |
| Litigation/encumbrance | Nil (clean EC)                          | Minor resolved issues          | Pending civil case                | Government / authority dispute |

### Dimension 2: Property — Technical & Marketability Risk

| Signal              | Low Risk                  | Medium Risk      | High Risk              | Very High Risk              |
| ------------------- | ------------------------- | ---------------- | ---------------------- | --------------------------- |
| Access & approach   | ≥12-ft road, clear access | 9-12 ft road     | Narrow / shared access | Access through private land |
| Building conformity | As per sanctioned plan    | Minor deviations | Major deviations       | No sanctioned plan          |
| Resale liquidity    | High-demand locality      | Average demand   | Low transaction volume | Distress-sale prone area    |

### Dimension 3: Property — Financial & Valuation Risk

| Signal                 | Low Risk              | Medium Risk            | High Risk            | Very High Risk             |
| ---------------------- | --------------------- | ---------------------- | -------------------- | -------------------------- |
| Agreement vs valuation | Valuation ≥ agreement | Marginally lower (≤5%) | 5-15% lower          | >15% lower                 |
| Cash component         | Nil (100% accounted)  | Minor (<10%)           | Significant (10-25%) | High / undisclosed         |
| Builder reputation     | Tier-1 / reputed      | Known local builder    | First-time builder   | History of delays/disputes |

### Dimension 4: Applicant — Profile & Stability Risk

| Signal                   | Low Risk                        | Medium Risk       | High Risk                  | Very High Risk              |
| ------------------------ | ------------------------------- | ----------------- | -------------------------- | --------------------------- |
| Employment stability     | Same role/business ≥5yr         | 2-5 years         | <2 years                   | Frequent changes / unstable |
| Profession risk          | Salaried PSU/MNC                | Salaried SME      | Self-employed professional | Cash-intensive / commission |
| Age & tenure feasibility | Tenure ends ≤55 (sal) / 65 (SE) | Marginally higher | Requires co-applicant      | Exceeds retirement norms    |

### Dimension 5: Income Assessment & Surrogate Risk

| Signal                  | Low Risk                        | Medium Risk                | High Risk                 | Very High Risk              |
| ----------------------- | ------------------------------- | -------------------------- | ------------------------- | --------------------------- |
| Income documentation    | Clean ITR + bank match          | Minor mismatch explainable | Heavy surrogate reliance  | Income largely unverifiable |
| Income source diversity | Single stable source            | Multiple stable sources    | One stable + one volatile | Mostly volatile             |
| Expense realism         | Conservative household expenses | Moderate assumptions       | Aggressive assumptions    | Expenses understated        |

### Dimension 6: Obligations & FOIR Risk

| Signal               | Low Risk          | Medium Risk     | High Risk            | Very High Risk     |
| -------------------- | ----------------- | --------------- | -------------------- | ------------------ |
| Existing liabilities | None / negligible | Manageable EMIs | High but within FOIR | High and stretched |
| FOIR after loan      | ≤40%              | 40-50%          | 50-60%               | >60%               |
| Dependency load      | Low dependents    | Moderate        | High                 | Unusually high     |

### Dimension 7: Credit Bureau (CIBIL) Risk

| Signal          | Low Risk                | Medium Risk              | High Risk                     | Very High Risk       |
| --------------- | ----------------------- | ------------------------ | ----------------------------- | -------------------- |
| Score band      | ≥780                    | 720-779                  | 680-719                       | <680                 |
| Credit behavior | Clean repayment history | Occasional 30-day delays | Past settlements / write-offs | Active DPDs          |
| Credit vintage  | ≥10 years               | 5-10 years               | <5 years                      | Thin / new-to-credit |

### Dimension 8: Behavioral & Silent Rejection Signals

| Signal              | Low Risk                      | Medium Risk         | High Risk                 | Very High Risk              |
| ------------------- | ----------------------------- | ------------------- | ------------------------- | --------------------------- |
| Disclosure honesty  | Fully transparent             | Minor gaps          | Inconsistent statements   | Misrepresentation suspected |
| Address & residency | Long-term ownership residence | Long-term rented    | Frequent moves            | High-risk locality          |
| Effort vs loan size | Clean, well-prepared file     | Average preparation | Requires heavy follow-ups | Exception-driven file       |

### Important Notes on These Dimensions

- **Not all questions are asked directly** — many are interpreted from combinations of answers
- **Each option maps to risk points (0-100)** per lender
- **Property + profile + marketability weighted higher** than income
- **Final output per lender**: High probability / Medium (bank-specific) / Low (exceptional only) / Very low (don't apply)

---

## 4. ADDITIONAL RISK DIMENSIONS (Not in the 8 above)

These are critical for resale/BT cases and lender-fit matching:

### Seller Profile (Resale Cases)

- Is seller's loan running? Which lender? NBFC vs Bank?
- Foreclosure amount and timeline
- Will seller agree to be guarantor until registry + papers custody?
- Internal transfer requirement (seller's BT first, then buyer's loan)
- Seller's cooperation level / urgency

### Builder/Project Approval

- Which lenders have approved this specific builder/project/phase?
- Project completion status (complete, partial phases, under construction)
- OC given but registry pending?
- Builder's track record in that micro-market

### Geographic Lender Coverage

- Which lenders actually operate in this area for this property type?
- Lender branch proximity / operational convenience
- City/area exposure limits per lender

### Balance Transfer Specifics

- Existing lender classification (PSU/PVT/NBFC/HFC)
- Outstanding vs original sanction ratio
- Track record with current lender (bounces, delays)
- Reason for BT (rate reduction, top-up need, service issues)
- Minimum vintage requirements per new lender

---

## 5. CURRENT SYSTEM ARCHITECTURE (What Exists)

### Rule Engine Pipeline (9 stages)

```
LoanApplicationPayload (from form)
  → Stage 1: Pre-checks (loan type, applicant presence)
  → Stage 2: Payload enrichment (_computed.* fields)
  → Stage 3: Hard gate evaluation (eligibility, CIBIL, property, transaction)
  → Stage 4: Parameter extraction (ROI, max FOIR, max LTV, max tenure)
  → Stage 5: Income assessment (12 types, multi-source, haircuts)
  → Stage 6: Obligation load computation (term loans + credit lines)
  → Stage 7: Financial math (tenure, FOIR-eligible, LTV-capped, EMI, offered amount)
  → Stage 8: Deviation checking (RED → AMBER recovery)
  → Stage 9: Traffic light assignment (GREEN/AMBER/RED/GREY)
  → buildResults() → LenderResultsData (to UI)
```

### Key Files

| File                                       | Purpose                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/lib/ruleEngine/evaluationEngine.ts`   | Main 9-stage orchestrator                                    |
| `src/lib/ruleEngine/types.ts`              | Internal pipeline types                                      |
| `src/lib/ruleEngine/resultBuilder.ts`      | Builds final lender results, ratings, factors, suggestions   |
| `src/lib/ruleEngine/discomfortAnalyzer.ts` | 7 zone detectors + solution generators                       |
| `src/lib/ruleEngine/systemConfig.ts`       | Centralized config (weights, thresholds, base probabilities) |
| `src/lib/ruleEngine/emiCalculator.ts`      | Pure math (EMI, FOIR, LTV, tenure)                           |
| `src/lib/ruleEngine/incomeAssessor.ts`     | Per-entry multi-source income assessment                     |
| `src/lib/ruleEngine/payloadEnricher.ts`    | Adds \_computed.\* fields for JSON-Logic rules               |
| `src/lib/types/lenderResults.ts`           | Output type definitions                                      |
| `src/lib/types/ruleArtifact.ts`            | Rule artifact + applicability types                          |

### Current Output Structure (per lender)

```
LenderResult {
  traffic_light: GREEN/AMBER/RED/GREY
  offered_amount, roi, emi, tenure
  rating: excellent/good/average/poor (percentile-based)
  factors[]: decision factors with impact (positive/negative/neutral)
  suggestions[]: improvement suggestions with effort level
  key_metrics: { foir%, ltv%, net_income, cibil, approval_probability }
  discomfort: { zones[], quick_solutions[], async_hints }
}
```

### Current Form Schema (Home Loan)

- 14 sections, ~68 questions
- Property questions: location, type, stage, age, area type, carpet area, OC/CC, municipal approval
- Resale questions: registry status, seller registration, builder demands, ownership chain, encumbrance cert
- BT/Top-up: existing loan details, vintage, EMI bounces, outstanding, current lender
- **All binary (Yes/No)** — no risk gradation
- showWhen uses JSON-Logic format

### What's Missing in Current Form

| Real Decision Dimension                                 | Currently Captured?                             |
| ------------------------------------------------------- | ----------------------------------------------- |
| Borrower profile risk (stability, profession, industry) | Partially (employment type only)                |
| Residence & community risk                              | No                                              |
| Property marketability                                  | No                                              |
| Documentation quality                                   | No (binary checks only)                         |
| Surrogate income reliance                               | Partially (income types exist, no risk grading) |
| Fraud/misrepresentation signals                         | No                                              |
| Tenure & age strategy                                   | Partially (age cap, no nuance)                  |
| Portfolio risk (bank exposure)                          | No                                              |
| Operational convenience                                 | No                                              |
| Seller loan details (resale)                            | No (was removed in cleanup)                     |
| Builder/project lender approvals                        | No                                              |
| Geographic lender coverage                              | No                                              |

---

## 6. PROPOSED ARCHITECTURE (Where Risk Scoring Fits)

### Enhanced Pipeline (add 2 new stages)

```
Existing Stage 2: Payload enrichment
  → NEW Stage 2.5: Applicant Risk Classification
    - Classify: income stability tier, CIBIL tier, obligation tier, vintage tier
    - Add to _computed.* for downstream JSON-Logic rules
    - Enables risk-aware gate evaluation

Existing Stages 3-9: (unchanged)

  → NEW Stage 9.5: Risk Appetite Scoring (per-lender)
    - Input: LenderEvaluation + form risk signals + lender risk appetite config
    - Each lender has its own risk appetite profile
    - Same signal → different weight per lender
    - Output: risk-adjusted approval probability + risk drivers
    - Feeds into lender ranking and fit scoring
```

### Per-Lender Risk Appetite Config (New)

```typescript
interface LenderRiskAppetite {
	lender_id: string;
	// Property risk tolerance
	property_legal_tolerance: 'strict' | 'moderate' | 'flexible';
	property_marketability_tolerance: 'strict' | 'moderate' | 'flexible';
	// Applicant risk tolerance
	income_surrogate_tolerance: 'none' | 'limited' | 'standard' | 'aggressive';
	profession_risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
	// Geographic & builder
	approved_builders: string[]; // or "all"
	operating_areas: GeoScope[];
	// Resale handling
	seller_nbfc_loan_policy: 'reject' | 'conditional' | 'accept';
	internal_transfer_required: boolean;
	seller_guarantor_policy: 'required' | 'preferred' | 'not_needed';
	// Classification
	classification: 'PSU' | 'PVT' | 'NBFC' | 'HFC' | 'COOP';
	// Risk weights (how much each dimension matters to this lender)
	dimension_weights: {
		property_legal: number; // 0-100
		property_technical: number;
		property_financial: number;
		applicant_profile: number;
		income_quality: number;
		obligations: number;
		credit_bureau: number;
		behavioral: number;
	};
}
```

### Enhanced Output (per lender)

```
Existing: traffic_light, offered_amount, roi, emi, factors, suggestions, discomfort
New additions:
  - risk_score: 0-100 (per-lender, not global)
  - risk_category: 'low' | 'medium' | 'high' | 'very_high'
  - risk_drivers[]: what's increasing/decreasing risk for THIS lender
  - lender_fit: 'excellent' | 'good' | 'conditional' | 'poor'
  - approval_probability: refined (risk-adjusted, not just traffic-light-based)
  - actionable_blockers[]: "Seller has NBFC loan — this lender requires foreclosure first"
  - seller_specific[]: (resale only) seller loan handling requirements
  - builder_specific[]: (if applicable) project approval status with this lender
```

---

## 7. IMPLEMENTATION PLAN

### Phase 1: Home Loan Form Redesign

- Map all 8 risk dimensions + seller/builder/geo to form questions
- Design graduated options (4-level risk scale, not binary Yes/No)
- Restore missing resale/seller/builder/project sections
- Combine scattered questions into fewer, smarter ones
- showWhen logic creates adaptive flow (resale → seller section, BT → track section)
- Keep question count reasonable
- **Status: DESIGN PHASE** — user has more input to add before we start

### Phase 2: Risk Scoring Engine

- Add risk classification to payload enricher (Stage 2.5)
- Build per-lender risk appetite configs
- Add risk-adjusted approval probability (Stage 9.5)
- Enhance result builder with risk output
- Update discomfort analyzer for risk-driven suggestions

### Phase 3: Extend to Other Loan Types

- LAP (next most complex, shares property dimensions)
- Plot Loan (unique purchase-type considerations)
- Personal/Business/Professional (no property, focus on applicant + income risk)
- Shared dimensions reuse, unique dimensions per type

---

## 8. USER'S DOMAIN EXPERTISE (Key Insights)

These are the DSA owner's real-world observations that must guide the design:

### How Credit Managers Actually Decide

1. **Regulatory layer** (RBI, non-negotiable): LTV, FOIR, age, KYC, AML, property title, approved layouts, valuation, exposure caps. Binary: pass or reject.
2. **Everything else is discretionary credit risk management** — this is where real rejections happen.

### The 10 Real Decision Filters

1. **Borrower Risk**: Not just income/CIBIL. Stability of profession, industry risk, litigation-prone profiles, enforcement risk, political exposure.
2. **Residence & Community Risk**: Internally tagged by credit managers — high-default areas, migration clusters, high-cash zones. Can't reject on "community" so reject on address mismatch, marketability, valuation variance.
3. **Property Marketability**: Often the strongest hidden filter — narrow access, no parking, HT line nearby, irregular plans, builder reputation, society litigation, redevelopment uncertainty.
4. **Documentation Quality**: Multiple income versions, cash without trail, frequent job changes, ITR-bank mismatch. Credit managers hate "explainable but not provable."
5. **Surrogate Income**: Gross receipts multipliers, industry norms, bank credit turnover. Same profile, different branch, different outcome.
6. **Fraud & Misrepresentation**: Overstated property value, fake co-applicant income, round-tripping. Even suspicion kills the file.
7. **Tenure & Age Strategy**: Oldest vs youngest applicant, retirement buffer, medical risk, succession risk.
8. **Portfolio Risk**: City/builder/segment exposure limits. Good file rejected because portfolio is full.
9. **Operational Convenience**: Time-consuming files, legally complex, need exceptions, need HO approval → rejected on "policy mismatch."
10. **Reputation & Noise Risk**: Media risk, political pressure, legal harassment, staff intimidation.

### Formal vs Actual Rejection Reasons

| Formal (what they write) | Actual (why they reject)                         |
| ------------------------ | ------------------------------------------------ |
| Income inadequate        | Hard to recover                                  |
| Property not acceptable  | Hard to resell                                   |
| Legal issue              | Hard to manage                                   |
| Policy deviation         | High nuisance potential / high fraud probability |

### The True Decision Engine

Legal compliance (RBI) → Property liquidity → Borrower controllability → Documentation credibility → Portfolio strategy → Discretionary risk filters

**Anything that scores poorly on recoverability and controllability gets rejected, even if it is "legal."**

### Resale-Specific Critical Knowledge

- Seller on loan → needs buyer/bank payment to repay → get papers free → then registry
- Some lenders make seller guarantor on buyer's loan until registry done + papers in buyer's lender custody
- Incomplete/partial projects → only approved lenders do loans there
- OC given but registry pending → limited lender options
- Some lenders do internal transfer only → need seller's BT first, then buyer's loan
- Seller's foreclosure amount + lender type (bank/NBFC) = critical decision input
- Which lender operates in that area/property type/builder = determines viable offers

---

## 9. DESIGN PRINCIPLES

1. **Fewer questions, smarter options** — one well-framed question with 4 graduated options > 3 binary questions
2. **Interpret, don't ask** — derive risk signals from combinations where possible
3. **Context-aware flow** — resale shows seller section, BT shows track section, new shows builder section
4. **Per-lender scoring** — same answer = different weight for different lenders
5. **Graduated, not binary** — 4-level risk scale (low/medium/high/very-high), not Yes/No
6. **Actionable output** — "don't apply here because X" not just "RED"
7. **DSA-first UX** — feels like a knowledgeable credit manager guiding assessment, not a government form

---

## 10. WHAT HAPPENS NEXT

**Current status**: User has confirmed:

- Home Loan first (reference implementation)
- Risk scoring inside rule engine (per-lender appetite configs)
- Seller/resale questions as part of redesign (not separate fix)

**User still wants to add**: More input/context before form design begins. Wait for them.

**When ready to start Phase 1**:

1. Read current `homeLoanSchema.json` (5,261 lines, 14 sections, ~68 questions)
2. Design new question set mapping all risk dimensions
3. Design showWhen logic for context-aware flow
4. Design graduated options with risk point mapping
5. Add seller/builder/project sections
6. Prototype in schema JSON format

---

## 11. TECHNICAL REFERENCE

### Current Home Loan Schema Sections (14)

1. selection_homeLoan — Initial eligibility
2. property_location_homeLoan — State, city, registry
3. propertyTechnical_homeLoan — Type, stage, age, area, OC/CC
4. tellUs_homeLoan — Applicant details (dynamic)
5. incomeProfilesPage — Income type selection (dynamic)
6. incomeDetailsPage — Income details (dynamic)
7. creditScorePage — CIBIL score (dynamic)
8. obligationsPage — Existing loans (dynamic)
9. propertyLegal_homeLoan — Seller details, legal checks
10. propertyFinancial_homeLoan — Deal value, down payment, ATS
11. finalVerification_homeLoan — Auction property
12. existingLoanInfo_homeLoan — BT/Top-up existing loan details
13. loanRequirements_homeLoan — Tenure, top-up amount/purpose
14. sanctionProfile_homeLoan — Final confirmation

### showWhen JSON-Logic Format

```json
{
  "==": [{ "var": "fieldName" }, "expectedValue"],
  "!=": [{ "var": "fieldName" }, "value"],
  "in": [{ "var": "fieldName" }, ["opt1", "opt2"]],
  "and": [{...}, {...}],
  "or": [{...}, {...}],
  "!": { "and": [{...}] }
}
```

### Question Types Available

- radio (binary/small options)
- select (dropdown)
- derivedSelect (dependent dropdown)
- number (currency, area, rates)
- text (free text)
- checkbox (acknowledgment)
- percentage (rates)

### Payload Flow

```
Form UI → payloadBuilder (8 modules) → LoanApplicationPayload
  → loanTransaction: { loanName, loanType, propertyState, propertyCost, ... }
  → allApplicantDetails[]: { age, cibil, incomeEntries[], obligations[], ... }
```

### Rule Artifact Applicability (per-lender)

```typescript
PolicyApplicability {
  geo_scope: 'pan_india' | 'state' | 'city';
  state?, city?: string;
  area_types?, property_types?, property_categories?: string[];
  profile_types?, specific_builder?: string;
}
```

---

---

## IMPLEMENTATION PLAN (4 Tiers)

> Merged from `CREDIT-RISK-IMPLEMENTATION-TIERS.md` (archived)

| Tier  | Questions                                                                                | Pages Changed | Risk Level | Prerequisite                |
| ----- | ---------------------------------------------------------------------------------------- | ------------- | ---------- | --------------------------- |
| **1** | 4 new (`valuationAssessment`, `cashComponent`, `bounceQuality`, `recentInquiries`)       | 2 existing    | Low        | Step 0 (wire existing data) |
| **2** | 7 new (`sellerProfile` 4q + `projectApproval` 3q)                                        | 2 new pages   | Medium     | Tier 1 verified             |
| **3** | 3 graduated (replace ~8 binary: `transactionNature`, `titleClarity`, `legalEncumbrance`) | 2 existing    | Higher     | Tier 2 verified             |
| **4** | 8 new (`applicantStability` 4q + `creditBehavior` 4q)                                    | 2 new pages   | Medium     | Tier 3 verified             |

**Total**: ~22 new/merged questions across 4 tiers, each wired end-to-end before the next.

**Mandatory order**: Step 0 (wire existing data better) → Tier 1 → Tier 2 → Tier 3 → Tier 4.

Full tier details: see `docs/_archive/CREDIT-RISK-IMPLEMENTATION-TIERS.md`

---

## LESSONS FROM FAILED ATTEMPT (DO NOT REPEAT)

> Merged from `CREDIT-RISK-IMPLEMENTATION-PROMPT.md` (archived)

A previous Claude session tried to implement this and failed across 3 sessions. The entire restructure was reverted:

1. **Replaced existing working questions instead of adding alongside them** — `purchaseType` was ripped out and replaced by `transactionNature` using flagKey. flagKey values were never resolved. Correct: KEEP old question, ADD new one alongside, verify, THEN remove.
2. **Changed schema without wiring to rule engine** — 17 new questions added but NONE consumed by rule engine/result builder. DSAs saw MORE questions but results were IDENTICAL.
3. **Restructured pages (14→19) without need** — Broke all test infrastructure, visibility logic, page flow, wizard sidebar, E2E helpers. Existing structure works fine.
4. **Worked on form BEFORE engine** — Results must improve FIRST, then form collects more data.

**Non-negotiable rules**: (1) Results must improve before form changes. (2) Never remove existing questions until replacement proven. (3) Never restructure pages without approval. (4) Both schema copies must stay in sync. (5) Small commits — one per step.

Full implementation prompt: see `docs/_archive/CREDIT-RISK-IMPLEMENTATION-PROMPT.md`

---

_This document will be updated as the design progresses. Last updated: 2026-03-09._
