# Home Loan Form Redesign — Complete Implementation Specification

> **Created**: 2026-02-24 | **Status**: DESIGN COMPLETE — Ready for implementation
> **Supersedes**: `HOME-LOAN-SCHEMA-DESIGN.md` (from reverted restructure attempt)
> **Prerequisite reading**: `CLAUDE.md`, `CREDIT-RISK-INTELLIGENCE-SPEC.md` (risk dimensions context)
> **Reference conversation**: Session `69528c4d-6043-4224-aa64-0c8bdc48b0d5` ("Policy vs Reality")

---

## HOW TO USE THIS DOCUMENT

This is the **single source of truth** for the home loan form redesign. It captures every decision from the design conversation so implementation can begin in a fresh session with zero assumptions.

**Implementation sequence** (Section 14) defines the order of work. Start there.

**Decision markers:**

- ✅ = Explicitly decided by the user (non-negotiable)
- 📐 = Designed during conversation, reviewed and approved
- 💡 = Proposed by design (may need user confirmation during implementation)

**The existing `homeLoanSchema.json` MUST be preserved as-is.** New schema is a separate file. If anything breaks, we fall back to the original.

---

## TABLE OF CONTENTS

1. [Key Terminology](#1-key-terminology)
2. [Design Principles](#2-design-principles)
3. [Three-Cost Property Valuation Model](#3-three-cost-property-valuation-model)
4. [Current Schema Baseline](#4-current-schema-baseline)
5. [Pages 1–7: Property & Legal](#5-pages-17-property--legal)
6. [Pages 8–12: Applicant & Financial Profile (Components)](#6-pages-812-applicant--financial-profile-components)
7. [Page 13: Deal & Financials](#7-page-13-deal--financials)
8. [Page 14: BT Existing Loan Details](#8-page-14-bt-existing-loan-details)
9. [Page 15: Loan Requirements (BT/Top-up)](#9-page-15-loan-requirements-bttop-up)
10. [Page 16: Pre-Sanction Profile](#10-page-16-pre-sanction-profile)
11. [Enricher Derivation Plan](#11-enricher-derivation-plan)
12. [Rule Engine Additions](#12-rule-engine-additions)
13. [Offer Card Requirements](#13-offer-card-requirements)
14. [Implementation Sequence](#14-implementation-sequence)
15. [Dead Keys Register](#15-dead-keys-register)
16. [Backward Compatibility Plan](#16-backward-compatibility-plan)
17. [NBFC Negative Area System](#17-nbfc-negative-area-system)
18. [DSA Journey Paths](#18-dsa-journey-paths)
19. [Cross-Page Dependencies](#19-cross-page-dependencies)
20. [Open Questions](#20-open-questions)
21. [Insights & Suggestions](#21-insights--suggestions)
22. [UX Safeguards & Quality Assurance](#22-ux-safeguards--quality-assurance)

---

## 1. KEY TERMINOLOGY

Understanding these terms is critical. They are NOT interchangeable.

### Property Valuation Terms

| Term               | Full Name               | Definition                                                                        | Used By                                                                    |
| ------------------ | ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **LTTV**           | Loan to Technical Value | Loan Amount / Market Value                                                        | RBI regulations; what banks internally assess                              |
| **LCR**            | Loan to Cost Ratio      | Loan Amount / Registry Value (Documented Value)                                   | Can go up to 90% of registry value; for RBI audit/paper compliance         |
| **Market Value**   | —                       | What the property is actually worth in the open market                            | Banks for sanctioning decisions (risk calculation)                         |
| **Deal Value**     | —                       | What buyer and seller agree on (actual transaction amount, incl. cash component)  | Total arrangement amount the buyer needs to fund                           |
| **Registry Value** | —                       | What goes on the registration document (at or above Ready Reckoner / Circle Rate) | Generally the lowest of the three; basis for stamp duty and RBI compliance |

### Loan Structuring Terms

| Term                           | Definition                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tranche**                    | A portion of the total sanctioned amount released at different times or under different product categories                                             |
| **Home Loan tranche**          | Loan amount based on LCR (registry value × LTV%) — the "documented" home loan                                                                          |
| **Additional tranche**         | Difference between LTTV-sanctioned amount and LCR-based home loan — given as furniture/fixing/renovation loan at same or slightly higher interest rate |
| **Post-registry disbursement** | The additional tranche released AFTER property registration (this is the deal-breaker — see Section 3)                                                 |

### Risk Terms

| Term                               | Definition                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Risk tiers are lender-specific** | ✅ One lender's "high risk" is another's opportunity. The form captures raw signals; the rule engine scores per lender appetite |
| **FOIR**                           | Fixed Obligation to Income Ratio — monthly obligations / monthly income                                                         |
| **FOIR waiver**                    | Some lenders waive FOIR check for BT cases with clean repayment track (not applicable to top-up)                                |
| **Loan vintage**                   | Time since original loan disbursement — lenders require minimum 6–24 months before accepting BT                                 |

---

## 2. DESIGN PRINCIPLES

These were established across multiple sessions and are non-negotiable.

### Form Design

| #     | Principle                         | Detail                                                                                                                                      |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ P1 | **Existing keys stay intact**     | If a contextKey contributes anywhere (direct, indirect, derived), it MUST remain. Never delete a working key.                               |
| ✅ P2 | **New keys must enhance results** | No orphan questions. Every new question must improve assessment/offers/DSA value.                                                           |
| ✅ P3 | **Graduated, not binary**         | Replace Yes/No with 3-4 option scales that capture the same signal with more nuance.                                                        |
| ✅ P4 | **3–7 questions per page**        | Min 3, max ~8. Create new pages if needed. Exception: sequential-reveal pages (BT) where only 1-2 new questions appear at a time.           |
| ✅ P5 | **Short option labels**           | For mobile visibility. All options equal height for visual symmetry.                                                                        |
| ✅ P6 | **Lucide icons only**             | Monochrome SVG stroke icons using `currentColor`. Styled via CSS classes (`text-primary`, `text-muted-foreground`). No colored/emoji icons. |
| ✅ P7 | **Organic flow**                  | The form should feel like a natural conversation, not a bureaucratic checklist.                                                             |
| ✅ P8 | **Risk is lender-specific**       | The form captures signals. The rule engine scores them per-lender. No universal "risk tiers" in the form.                                   |
| ✅ P9 | **Keep original schema**          | `homeLoanSchema.json` preserved as reference/fallback. New schema is a separate file.                                                       |

### Technical

| #     | Principle                              | Detail                                                                                                     |
| ----- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| ✅ T1 | **Wire to rule engine FIRST**          | Enricher derivations + rule engine keys BEFORE form changes. Results must improve, not regress.            |
| ✅ T2 | **Enricher backward compat**           | Merged questions derive old keys in `payloadEnricher.ts`. The 80+ file references to old keys don't break. |
| ✅ T3 | **No primary applicant**               | All applicants are co-applicants. Lender's "primary" = highest eligibility (system-determined).            |
| ✅ T4 | **Questions adapt to context**         | showWhen logic creates adaptive paths based on purchaseType, areaType, constructionType, loanType.         |
| ✅ T5 | **Component pages use Svelte 5 runes** | Pages 8-12 are component-driven, not schema-driven. Use `$state`, `$derived`, `$effect`.                   |

---

## 3. THREE-COST PROPERTY VALUATION MODEL

✅ This is the fundamental financial model for the redesign.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  MARKET VALUE (typically highest)                            │
│  ├─ What the property is worth in the open market            │
│  ├─ Source: Avg of 99acres, MagicBricks, Housing.com         │
│  │   for similar properties in same project/area             │
│  ├─ Used for: LTTV calculation (bank risk assessment)        │
│  ├─ RBI's LTV rules apply to THIS value                     │
│  └─ contextKey: marketValue (NEW)                            │
│                                                              │
│  DEAL VALUE (middle — what buyer actually pays)              │
│  ├─ Agreement between buyer and seller                       │
│  ├─ Includes any cash component                              │
│  ├─ Used for: Total arrangement, down payment calculation    │
│  └─ contextKey: propCost (backward compat with 80+ files)    │
│                                                              │
│  REGISTRY VALUE (typically lowest)                           │
│  ├─ What goes on the registration document                   │
│  ├─ At or above Ready Reckoner / Circle Rate                 │
│  ├─ Used for: LCR calculation (Loan to Documented Value)     │
│  ├─ LCR can go up to 90% of this value                      │
│  └─ contextKey: registryValue (NEW)                          │
│                                                              │
│  ═══════════════════════════════════════════════════════════  │
│                                                              │
│  LOAN STRUCTURING (per lender, shown on offer cards):        │
│                                                              │
│  Home Loan tranche = Registry Value × LCR%                   │
│    → Released before/at registry                             │
│                                                              │
│  Additional tranche = (Market Value × LTTV%) − Home Loan     │
│    → Category: Furniture/Fixing/Renovation                   │
│    → Interest: Same or slightly higher rate                  │
│    → Released: AFTER registry (this causes problems!)        │
│                                                              │
│  THE DEAL-BREAKER PROBLEM:                                   │
│  Seller wants ALL money before signing at registrar office.  │
│  But additional tranche releases AFTER registry.             │
│  This breaks many deals.                                     │
│                                                              │
│  MIDDLE ROUTE (practical mitigation):                        │
│  Buyer provides a cheque (preferably from spouse/family)     │
│  for the post-registry tranche amount, to the seller.       │
│  Once lender releases funds, cheque is returned/cancelled.   │
│  DSA must inform lender when such arrangement is planned.    │
│                                                              │
│  OFFER CARD MUST SHOW:                                       │
│  1. Each tranche amount                                      │
│  2. Tranche category (Home Loan / Furniture & Fixing / etc)  │
│  3. Interest rate per tranche                                │
│  4. Disbursement timing (before/after registry)              │
│  5. Mitigation guidance (cheque arrangement, if applicable)  │
│                                                              │
│  FOR BT CASES:                                               │
│  Lenders want 6-12 months of appreciation                    │
│  (current market value > original market value at purchase)  │
│  Higher appreciation = higher sanctionable amount for        │
│  BT + Top-up.                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. CURRENT SCHEMA BASELINE

**File**: `src/lib/config/homeLoanSchema.json` (~168KB)
**Pages**: 14 | **Questions**: 73 | **Unique contextKeys**: 58

| Current Page # | Page ID                      | Questions | Status in Redesign                        |
| -------------- | ---------------------------- | --------- | ----------------------------------------- |
| 1              | `selection_homeLoan`         | 2         | ✅ Replaced by Page 1 (Case Intake)       |
| 2              | `property_location_homeLoan` | 14        | ✅ Split into Pages 2-3                   |
| 3              | `propertyTechnical_homeLoan` | 9         | ✅ Absorbed into Pages 3, 5               |
| 4              | `tellUs_homeLoan`            | Component | ✅ Enhanced (Page 8)                      |
| 5              | `incomeProfilesPage`         | Component | Unchanged (Page 9)                        |
| 6              | `incomeDetailsPage`          | Component | Unchanged (Page 10)                       |
| 7              | `creditScorePage`            | Component | ✅ Redesigned (Page 11)                   |
| 8              | `obligationsPage`            | Component | ✅ Enhanced (Page 12)                     |
| 9              | `propertyLegal_homeLoan`     | 10        | ✅ Replaced by Pages 6-7                  |
| 10             | `propertyFinancial_homeLoan` | 9         | ✅ Replaced by Page 13 (three-cost model) |
| 11             | `finalVerification_homeLoan` | 3         | ✅ ELIMINATED (merged into Page 13 Q1)    |
| 12             | `existingLoanInfo_homeLoan`  | 10        | ✅ Updated as Page 14                     |
| 13             | `loanRequirements_homeLoan`  | 6         | ✅ Updated as Page 15                     |
| 14             | `sanctionProfile_homeLoan`   | 4         | ✅ Updated as Page 16                     |

**Key stat**: 27 of 73 questions were binary Yes/No. The redesign replaces most with graduated 3-4 option selectors.

---

## 5. PAGES 1–7: PROPERTY & LEGAL

> **Note**: These pages were designed in earlier sessions. The key decisions and changes are documented below. For exact question text and option values where not specified, refer to the design conversation transcript. Implementation should follow the patterns established here and refine wording as needed.

---

### Page 1: Case Intake

**Page ID**: `caseIntake_homeLoan`
**Shows when**: Always
**Questions**: 2

| Q#  | Label                    | contextKey               | Type  | Options                                                                              | Status          |
| --- | ------------------------ | ------------------------ | ----- | ------------------------------------------------------------------------------------ | --------------- |
| 1   | Prior assessment history | `priorAssessmentHistory` | radio | 💡 First assessment / Assessed by 1-2 lenders / Assessed by 3+ / Previously rejected | NEW             |
| 2   | Property identified?     | `propertyIdentified`     | radio | Yes / No                                                                             | EXISTING (kept) |

**Key decisions:**

- ✅ `creditHistoryStatus` REMOVED from this page → moved to CIBIL section per applicant (was "blocker and intimidating" on Page 1)
- ✅ `propertyComplianceStatus` REMOVED from this page → moved to Page 5 (Property Condition)
- ✅ Prior assessment question added — helps lenders understand if other lenders passed on this case
- 📐 Old `selection_homeLoan` page eliminated entirely

**Enricher**: `priorAssessmentHistory` is a NEW rule engine key. Lenders who specialize in "second-look" cases can score this differently.

---

### Page 2: Property Location & Type

**Page ID**: `propertyLocation_homeLoan`
**Shows when**: `propertyIdentified == "Yes"`
**Questions**: 5–7 (path-dependent)

**Key decisions:**

- ✅ `propertyAreaType` moved immediately after `propertyIdentified` (first question on this page)
- ✅ `purchaseType` expanded from 2 to 3 options:

| Old Value     | New Value             | Label                         |
| ------------- | --------------------- | ----------------------------- |
| `Direct Sale` | `direct_from_builder` | Direct from Builder/Authority |
| `Resale`      | `resale_normal`       | Resale (Normal)               |
| _(new)_       | `resale_endorsement`  | Resale via Endorsement        |

- ✅ Questions and options CHANGE based on `propertyAreaType` and `constructionType`
- ✅ For resale: if seller is on a loan, trigger seller-on-loan questionnaire
- ✅ NBFC negative area check for property location (see Section 17)
- 📐 Enricher maps new purchaseType values back to legacy:
  - `direct_from_builder` → `purchaseType: "Direct Sale"` (backward compat)
  - `resale_normal` → `purchaseType: "Resale"`
  - `resale_endorsement` → `purchaseType: "Resale"` + `isEndorsement: true`

**Existing keys kept**: `propertyIdentified`, `propertyAreaType`, `purchaseType`, `propertyState`, `propertyCity`, `pincode`

---

### Page 3: Property Character

**Page ID**: `propertyCharacter_homeLoan`
**Shows when**: `propertyIdentified == "Yes"`
**Questions**: 4–6 (varies by area type and construction type)

**Key decisions:**

- 📐 Questions adapt based on `propertyAreaType` (Corporation/Municipal/Grampanchayat) and construction type
- 📐 Property technical details from old Page 3 absorbed here
- ✅ Context-dependent: Builder properties show project-related questions; independent construction shows different set

**Existing keys kept**: `constructionType`, `carpetArea`, `projectName`, `builderName`

---

### Page 4: BT Registry Status

**Page ID**: `btRegistry_homeLoan`
**Shows when**: `loanType != "New Loan"` (BT/Top-up only)
**Questions**: 3–4

**Key decisions:**

- 📐 BT-specific registry and possession status captured here
- 📐 `bt_possessionAndDemandStatus` NEW merged question replacing 2 binary questions:
  - `isPossessionOfferedByAuthority` (BT context)
  - `isAnyDemandFromTheBuilder` (BT context)
- 📐 Enricher derives the two legacy keys from the merged question (see Section 11)

---

### Page 5: Property Condition & Compliance

**Page ID**: `propertyCondition_homeLoan`
**Shows when**: `propertyIdentified == "Yes"`
**Questions**: 4–6

**Key decisions:**

- ✅ `propertyComplianceStatus` moved here from Page 1 — kept as a direct question (NOT derived) because it has 4 showWhen references in the financial pages
- 📐 `propertyCondition`: Ready to move / Under construction / Semi-finished / etc. (graduated)
- 📐 `isPossessionOfferedByAuthority` (New Loan context) — distinct from BT context on Page 4
- 📐 OC/CC availability, municipal approval status

**Existing keys kept**: `propertyComplianceStatus`, `ocCcAvailable`, `municipalApproval`, `isPossessionOfferedByAuthority`

**Critical dependency**: `propertyComplianceStatus` has 4 showWhen conditions in the financial section (Page 13, Q8/Q9 in OLD schema). In the new schema, these references are removed because the ATS suggestion flow is eliminated. However, `propertyComplianceStatus` still feeds the rule engine directly.

---

### Page 6: Seller & Transaction Details

**Page ID**: `sellerTransaction_homeLoan`
**Shows when**: Resale/Endorsement + `propertyIdentified == "Yes"`
**Questions**: 4–6

**Key decisions:**

- ✅ Seller-on-loan detection: Is the seller's property currently under a home loan?
- ✅ If seller is on loan: seller's outstanding amount, seller's lender
- ✅ Project-approved lenders are INDEPENDENT from seller's loan lender — capture both separately
- 📐 Transaction structure questions based on resale type (normal vs endorsement)

**New keys**: `sellerOnLoan`, `sellerOutstandingAmount`, `sellerCurrentLender`

---

### Page 7: Legal Verification

**Page ID**: `legalVerification_homeLoan`
**Shows when**: `propertyIdentified == "Yes"`
**Questions**: 3–4

**Key decisions:**

- 📐 `documentationReadiness` NEW merged question replacing 5 dead binary legal keys:

| Old Key (all DEAD — never reached rule engine) | Merged Into                        |
| ---------------------------------------------- | ---------------------------------- |
| `ownershipChainComplete`                       | `documentationReadiness`           |
| `originalDocumentsAvailable`                   | `documentationReadiness`           |
| `encumbranceCertificateVerified`               | `documentationReadiness`           |
| `noLegalDispute`                               | `propertyDisputeStatus` (separate) |
| `nocFromPreviousLender`                        | kept separately for BT context     |

- 📐 `documentationReadiness`: graduated options (All ready / Partially ready / Not started / Issues found)
- 📐 `propertyDisputeStatus`: graduated options (Clear / Minor issues / Active dispute / Litigation)
- 📐 `nocFromPreviousLender`: BT context only
- 📐 `registryNotDoneAck` auto-set via info banner (not a question)

**Enricher derivations**: See Section 11 for how `documentationReadiness` derives the 3 legacy keys.

---

## 6. PAGES 8–12: APPLICANT & FINANCIAL PROFILE (COMPONENTS)

These are component-driven pages (Svelte components, not schema JSON). Changes are to the component code.

---

### Page 8: Applicant Details (`AddApplicant.svelte`)

**Key changes:**

| Change                               | Detail                                                                                                                                                              | Status     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ✅ `employmentType` removed from UI  | Derived from income profile selection on Page 9. Key stays in 80 files — only UI input removed.                                                                     | ✅         |
| ✅ Education dropdown added          | Per-applicant. Options: 💡 Under Graduate / Graduate / Post Graduate / Professional (CA, Doctor, Lawyer) / Doctorate. For unwritten lender policies.                | NEW        |
| ✅ Religion dropdown added           | Per-applicant. Options: 💡 Hindu / Muslim / Christian / Sikh / Buddhist / Jain / Other. For unwritten on-ground lender policies.                                    | NEW        |
| ✅ Residence pattern: graduated      | Old: `residenceOptionSame` (boolean — "all same city?"). New: `applicantResidencePattern` graduated options per co-applicant pair.                                  | REDESIGN   |
| ✅ NRI: GPA location                 | When ALL applicants are NRI → ask GPA state + city. If ANY applicant is Indian, that person IS the GPA (no GPA questions).                                          | NEW        |
| ✅ Per-applicant property count      | "How many residential properties in this applicant's name?" Options: 💡 None / 1 / 2 / 3+. Affects LTV (higher property count = lower LTV allowed by some lenders). | NEW        |
| ✅ Applicant residence negative area | NBFC negative area check for applicant's residence location (see Section 17).                                                                                       | NEW        |
| ✅ GPA relationship                  | NOT on form — per-lender config on offer cards. "As per lender's policy, which type of GPA will be required."                                                       | OFFER CARD |

**Residence pattern redesign:**

Old: Boolean `residenceOptionSame` (Yes/No — "Do all applicants reside at same location?")
New: Graduated per applicant (captured at applicant level):

| Label                      | Value             | Signal                                             |
| -------------------------- | ----------------- | -------------------------------------------------- |
| Same city as property      | `SAME_CITY`       | No extra verification needed                       |
| Different city, same state | `DIFFERENT_CITY`  | Might need residence proof                         |
| Different state            | `DIFFERENT_STATE` | Full address verification, state-specific policies |

Enricher: derives `residenceOptionSame` = "Yes" if all applicants are `SAME_CITY`, "No" otherwise.

**employmentType derivation:**

- ✅ When DSA selects income profiles on Page 9, the system derives employmentType:
  - Salary income → Salaried
  - Business income → Self Employed
  - Professional income → Self Employed Professional
  - Pension income → Pensioner
  - If multiple income types → take primary (highest income source)
- The `employmentType` key continues to exist in 80 files — only the UI INPUT is removed
- `applicantRecovery.ts` `buildIndividualSignature` already has `employmentType` as optional — NO change needed

---

### Page 9: Income Profiles (Component)

**No changes.** 12 income types with per-type haircuts. This is the competitive moat — never simplify.

---

### Page 10: Income Details (Component)

**No changes.** Income detail capture per selected profile.

---

### Page 11: CIBIL / Credit Score (Component — `CreditScoreSection.svelte`)

**Major redesign: 8 binary questions → 3 graduated questions + explanations**

| Old (ALL DEAD — only in 5 UI files) | New        |
| ----------------------------------- | ---------- |
| 8 credit factor Yes/No questions    | ELIMINATED |
| `creditFactorAnswers` object        | ELIMINATED |
| `creditFactorReasons` object        | ELIMINATED |

**New per-applicant questions:**

**Q1: EMI Bounce History** (replaces credit factor #1-2)

|            |                  |
| ---------- | ---------------- |
| contextKey | `emiBounceCount` |
| type       | radio            |
| icon       | `ShieldCheck`    |

| Label      | Value |
| ---------- | ----- |
| No bounces | `0`   |
| 1 bounce   | `1`   |
| 2 bounces  | `2`   |
| 3 or more  | `3+`  |

**Q2: Default / Settlement History** (replaces credit factor #3-4)

|            |                           |
| ---------- | ------------------------- |
| contextKey | `defaultSettlementStatus` |
| type       | radio                     |
| icon       | `AlertTriangle`           |

| Label                         | Value            |
| ----------------------------- | ---------------- |
| 💡 No defaults or settlements | `CLEAN`          |
| 💡 Settled (paid and closed)  | `SETTLED`        |
| 💡 Written off (unpaid)       | `WRITTEN_OFF`    |
| 💡 Active default             | `ACTIVE_DEFAULT` |

**Q3: Recent Enquiries (last 2 months)**

|            |                      |
| ---------- | -------------------- |
| contextKey | `recentEnquiryCount` |
| type       | radio                |
| icon       | `Search`             |

| Label            | Value |
| ---------------- | ----- |
| 💡 None          | `0`   |
| 💡 1-2 enquiries | `1_2` |
| 💡 3-5 enquiries | `3_5` |
| 💡 6+ enquiries  | `6+`  |

✅ **Timeframe is 2 months** (not 6) — that's the window lenders check for enquiry shopping.

**Explanations (conditional, shown when negative signal detected):**

- ✅ Explanations are **select dropdown options** (not free text)
- If `emiBounceCount >= 1`: show `bounceReason` select (💡 Technical issue / Cash flow gap / Bank error / Account switch / Other)
- If `defaultSettlementStatus != "CLEAN"`: show `defaultReason` select (💡 Job loss / Medical emergency / Business downturn / Dispute with lender / Other)
- If `recentEnquiryCount >= "3_5"`: show `enquiryReason` select (💡 Rate shopping / Multiple applications / Pre-approval checks / Co-applicant enquiries / Other)

**Per-applicant credit history status:**

- ✅ `creditHistoryStatus` moved here from old Page 1
- 📐 Per-applicant (not case-level) — each co-applicant gets their own assessment
- Enricher aggregates to case level: `isDefaulter`, `madeGuarantor` (backward compat)

**Existing kept**: `cibilScore`, `hasRunningObligations` (gates to Obligations page)

---

### Page 12: Obligations (Component — `ObligationsSection.svelte`)

**Key enhancements:**

| Change                              | Detail                                                                                           | Status      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| ✅ Per-obligation EMI delay history | New field on each obligation entry                                                               | NEW         |
| ✅ BT loan guard                    | Prevent DSA from entering the loan being transferred as an obligation (prevents double-counting) | NEW         |
| ✅ FOIR waiver signal               | Clean 1-year history on all obligations → enables FOIR waiver for BT (NOT for top-up)            | RULE ENGINE |

**Per-obligation new field: `emiDelayHistory`**

| Label     | Value  | Signal                                  |
| --------- | ------ | --------------------------------------- |
| None      | `NONE` | Clean — FOIR waiver eligible            |
| 1 delay   | `1`    | Marginal — some lenders may still waive |
| 2 or more | `2+`   | Not clean — no FOIR waiver              |

**BT loan guard implementation:**

- 📐 When `loanType` includes "Balance Transfer", show info banner: "Do NOT enter the loan being transferred here. BT loan details are captured separately."
- 📐 Cross-check: if obligation's lender matches `selectSingleBank` (from Page 14) AND amount is similar to `includedCurrentEMIsAmount`, show warning
- 📐 This prevents the BT loan EMI from being counted in FOIR twice

---

## 7. PAGE 13: DEAL & FINANCIALS

**Page ID**: `dealFinancials_homeLoan`
**Shows when**: `loanType == "New Loan"` AND `propertyIdentified == "Yes"`
**Questions**: 8 (all visible, no complex branching)

This page implements the three-cost model. The old 9-question ATS flow with 5 conditional branches is replaced by 8 direct questions with zero branching.

---

### Q1 · Property Acquisition Mode 📐

| Property       | Value                   |
| -------------- | ----------------------- |
| **contextKey** | `auctionPropertyStatus` |
| **type**       | radio                   |
| **icon**       | `Gavel`                 |
| **required**   | true                    |
| **showWhen**   | always                  |

| Label                    | Value             | Icon          |
| ------------------------ | ----------------- | ------------- |
| Standard purchase        | `STANDARD`        | `ShoppingBag` |
| Auction — terms accepted | `AUCTION_AWARE`   | `Gavel`       |
| Auction — terms unclear  | `AUCTION_UNAWARE` | `CircleAlert` |

**Enricher derivation:**

```
auctionPropertyStatus → auctionedProperty: STANDARD → "No", AUCTION_* → "Yes"
auctionPropertyStatus → understandsAsIsBasis: AUCTION_AWARE → "Yes", AUCTION_UNAWARE → "No"
```

**Eliminated**: `loanForAuctionPayment` (dead — never mapped anywhere). Old Page 11 (`finalVerification_homeLoan`) fully absorbed.

---

### Q2 · Preferred Loan Term ✅

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **contextKey** | `mortgageYear`                                   |
| **type**       | radio-with-input (quick-picks + manual fallback) |
| **icon**       | `CalendarRange`                                  |
| **required**   | true                                             |
| **showWhen**   | always                                           |

| Label        | Value                         | Icon            |
| ------------ | ----------------------------- | --------------- |
| 10 yrs       | `10`                          | `Calendar`      |
| 15 yrs       | `15`                          | `Calendar`      |
| 20 yrs       | `20`                          | `Calendar`      |
| 25 yrs       | `25`                          | `Calendar`      |
| 30 yrs       | `30`                          | `Calendar`      |
| Max possible | `MAX`                         | `CalendarRange` |
| Other        | → reveals number input (5–40) | `PenLine`       |

- ✅ Quick-pick selection, then manual input for "Other"
- **"Max possible"**: Rule engine calculates per-lender maximum based on youngest applicant's age, retirement age policy, and lender's max term. Each offer card shows its own max.
- **UI pattern**: 4-column grid of equal-height chips (first 6); "Other" spans full width with inline number input when selected.

---

### Q3 · Market Value ✅ NEW

| Property       | Value                |
| -------------- | -------------------- |
| **contextKey** | `marketValue`        |
| **type**       | number               |
| **icon**       | `TrendingUp`         |
| **required**   | true                 |
| **showWhen**   | `mortgageYear != ""` |

- **Question**: "Estimated current market value of the property?"
- **Description**: _"Check average price for similar properties in same project/area on 99acres, MagicBricks, Housing.com — 3rd party evaluators use the same approach."_
- Validation: min ₹25L
- **Purpose**: LTTV calculation — what banks use to determine sanctionable amount (risk assessment)
- **NEW rule engine key**: `marketValue` added to `LOAN_TRANSACTION_KEYS`

---

### Q4 · Deal Value ✅

| Property       | Value                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| **contextKey** | `propCost` _(backward compat — existing rule engine key, 80+ file refs)_ |
| **type**       | number                                                                   |
| **icon**       | `IndianRupee`                                                            |
| **required**   | true                                                                     |
| **showWhen**   | `marketValue != ""`                                                      |

- **Question (dynamic)**:
  - Direct from Builder: "Agreed total cost with builder?"
  - Resale / Endorsement: "Agreed deal value with seller?"
- **Description**: _"Total amount agreed between parties, including any cash component."_
- Validation: min ₹25L
- **Purpose**: Actual transaction amount. Buyer must arrange: loan + down payment = deal value.

---

### Q5 · Registry Value ✅ NEW (replaces entire ATS flow)

| Property       | Value            |
| -------------- | ---------------- |
| **contextKey** | `registryValue`  |
| **type**       | number           |
| **icon**       | `FileText`       |
| **required**   | true             |
| **showWhen**   | `propCost != ""` |

- **Question**: "Expected registration value?"
- **Description**: _"Value at which property will be registered. Generally at or above Ready Reckoner / Circle Rate."_
- Validation: warning if `registryValue > propCost` ("Registry value is typically ≤ deal value")
- **Purpose**: LCR calculation (Loan to Documented Value). Lenders structure loan tranches using this:
  - Home Loan tranche = Registry Value × LCR%
  - Additional tranche = (Market Value × LTTV%) − Home Loan tranche
- **NEW rule engine key**: `registryValue` added to `LOAN_TRANSACTION_KEYS`
- **Enricher**: `agreementSellValue = registryValue` (backward compat with old ATS key)

---

### Q6 · Down Payment ✅

| Property       | Value                 |
| -------------- | --------------------- |
| **contextKey** | `deposit`             |
| **type**       | number                |
| **icon**       | `Wallet`              |
| **required**   | true                  |
| **showWhen**   | `registryValue != ""` |

- **Question**: "Available down payment amount?"
- Validation: max 90% of `propCost` (deal value)
- **CRITICAL rule engine key**: loan amount = deal value − deposit

---

### Q7 · Registry Timeline ✅ NEW

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| **contextKey** | `registryTimeline`                     |
| **type**       | radio (with conditional sub-questions) |
| **icon**       | `CalendarDays`                         |
| **required**   | true                                   |
| **showWhen**   | `deposit != ""`                        |

- **Question**: "When is property registration planned?"

| Label          | Value                                   | Icon            |
| -------------- | --------------------------------------- | --------------- |
| Within 1 month | `WITHIN_1_MONTH`                        | `Clock`         |
| 1–3 months     | `1_3_MONTHS`                            | `CalendarRange` |
| 3–6 months     | `3_6_MONTHS`                            | `CalendarClock` |
| Specific date  | `SPECIFIC_DATE` → reveals sub-questions | `CalendarHeart` |

**If `SPECIFIC_DATE` selected:**

- `registryPlannedDate`: Date picker (month/year via MonthYearModal)
- `registryDateReason`: Select dropdown

| Reason Label   | Value          |
| -------------- | -------------- |
| Auspicious day | `AUSPICIOUS`   |
| Anniversary    | `ANNIVERSARY`  |
| Birthday       | `BIRTHDAY`     |
| Tax planning   | `TAX_PLANNING` |
| Festive season | `FESTIVE`      |
| Other          | `OTHER`        |

**Why this matters**:

- Tells lenders processing urgency (< 1 month = fast-track needed)
- Fixed dates (auspicious/anniversary) are NON-NEGOTIABLE in Indian culture — lender must meet the deadline or lose the deal
- Becomes a sorting/priority factor on offer cards — lenders with faster processing rank higher for urgent timelines

---

### Page 13: What Was Eliminated

| Old Question                                  | Old contextKey          | What Happened                                                                      |
| --------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| "Is ATS value different from property value?" | `differentATSandPV`     | **DERIVED** by enricher: `propCost !== registryValue`                              |
| "Is ATS ready?"                               | `ATSReady`              | **DERIVED** → always "Yes" (we capture registry value directly)                    |
| "Want our ATS suggestion?"                    | `ATSvalue`              | **ELIMINATED** — depends on lender multipliers; move to offer cards if ever needed |
| "ATS property value" (readonly computed)      | `agreementSellValue`    | **DERIVED** from `registryValue`                                                   |
| "ATS down payment" (readonly computed)        | `depositAsPerATS`       | **ELIMINATED** — per-lender loan structuring on offer cards                        |
| "Auction: purchased in auction?"              | `auctionedProperty`     | **DERIVED** from `auctionPropertyStatus`                                           |
| "Auction: aware of as-is?"                    | `understandsAsIsBasis`  | **DERIVED** from `auctionPropertyStatus`                                           |
| "Auction: loan for auction payment?"          | `loanForAuctionPayment` | **ELIMINATED** (dead — never mapped)                                               |

**Net**: Old financial page (9 questions, 5 branches) + old auction page (3 questions) = 12 questions → New: 8 questions, 0 branches.

---

## 8. PAGE 14: BT EXISTING LOAN DETAILS

**Page ID**: `btExistingLoan_homeLoan`
**Shows when**: `loanType != "New Loan"` (BT / Top-up / BT+Top-up)
**Questions**: 10 total, sequential chain (each appears when previous is answered)

---

### Q1 · Original Sanction Amount

| Property       | Value                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| **contextKey** | `sanctionAmount`                                                                         |
| **type**       | number                                                                                   |
| **icon**       | `BadgeIndianRupee`                                                                       |
| **required**   | true                                                                                     |
| **showWhen**   | `loanType` in `["Top-up Only", "Balance Transfer Only", "Balance Transfer With Top-up"]` |

Validation: min ₹10L, max ₹9,99,99,99,999. Used in cross-validation: `principalOutstanding < sanctionAmount`.

---

### Q2 · Loan Account Number ✅ OPTIONAL

| Property       | Value                                            |
| -------------- | ------------------------------------------------ |
| **contextKey** | `loanAccountNumber`                              |
| **type**       | text                                             |
| **icon**       | `Hash`                                           |
| **required**   | **false** ← ✅ Changed from required to optional |
| **showWhen**   | `sanctionAmount != ""`                           |

Operational use only — for case submission to lender. No rule engine value.

---

### Q3 · Disbursement Date ✅ UPDATED

| Property       | Value                                                  |
| -------------- | ------------------------------------------------------ |
| **contextKey** | `loanDisbursementDate`                                 |
| **type**       | monthYear (MonthYearModal — layout already renders it) |
| **icon**       | `Calendar`                                             |
| **required**   | true                                                   |
| **showWhen**   | `sanctionAmount != ""`                                 |

- **Question**: "When was this loan originally disbursed?"
- Stores: `"YYYY-MM"` format (e.g., `"2024-06"`)
- ✅ **Validation warning at 6 months** (changed from 12): _"Loan disbursed less than 6 months ago. Most lenders require minimum 6 EMI payments before considering balance transfer."_
- **Enricher**: derives `loanVintageMonths` = months between disbursement and today
- **Purpose**: Loan vintage is critical for BT — lenders have minimum vintage requirements (6/12/24 months). Combined with current market value (Page 15), shows property appreciation timeline.

---

### Q4 · Interest Rate Type (BT-only)

| Property       | Value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **contextKey** | `interestRateType`                                                                                         |
| **type**       | radio                                                                                                      |
| **icon**       | `TrendingUp`                                                                                               |
| **required**   | true                                                                                                       |
| **showWhen**   | `loanDisbursementDate != ""` AND `loanType` in `["Balance Transfer Only", "Balance Transfer With Top-up"]` |

| Label    | Value      | Icon         |
| -------- | ---------- | ------------ |
| Floating | `FLOATING` | `TrendingUp` |
| Fixed    | `FIXED`    | `Lock`       |
| Not sure | `UNKNOWN`  | `HelpCircle` |

**🔌 TO WIRE**: Currently dead. Fixed→floating conversion is a primary BT benefit signal.

---

### Q5 · EMI Bounce Track Record (BT loan-specific)

| Property       | Value                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **contextKey** | `emiBounceHistory`                                                                                                      |
| **type**       | radio                                                                                                                   |
| **icon**       | `ShieldCheck`                                                                                                           |
| **required**   | true                                                                                                                    |
| **showWhen**   | (`loanType` in BT types AND `interestRateType != ""`) OR (`loanType == "Top-up Only"` AND `loanDisbursementDate != ""`) |

| Label       | Value | Icon            |
| ----------- | ----- | --------------- |
| Clean track | `0`   | `ShieldCheck`   |
| 1 bounce    | `1`   | `AlertCircle`   |
| 2 bounces   | `2`   | `AlertTriangle` |
| 3 or more   | `3+`  | `Ban`           |

**🔌 TO WIRE**: Currently dead. Clean track → FOIR waiver for BT (not top-up).

**Important — 3 distinct bounce signals, NO overlap:**

1. **Per-applicant** `emiBounceCount` (Page 11 CIBIL): Overall credit behavior across ALL loans
2. **BT loan-specific** `emiBounceHistory` (this question): Track record on the SPECIFIC loan being transferred
3. **Per-obligation** `emiDelayHistory` (Page 12): Per-obligation EMI delay — but BT loan is EXCLUDED from obligations page (guard prevents double-counting)

---

### Q6 · Principal Outstanding

| Property       | Value                    |
| -------------- | ------------------------ |
| **contextKey** | `principalOutstanding`   |
| **type**       | number                   |
| **icon**       | `IndianRupee`            |
| **required**   | true                     |
| **showWhen**   | `emiBounceHistory != ""` |

Validation: min ₹5L, cannot exceed `sanctionAmount`. **CRITICAL rule engine key.**

---

### Q7 · Current Interest Rate

| Property       | Value                        |
| -------------- | ---------------------------- |
| **contextKey** | `existingInterestRate`       |
| **type**       | number (percentage)          |
| **icon**       | `Percent`                    |
| **required**   | true                         |
| **showWhen**   | `principalOutstanding != ""` |

Validation: 1%–40%. **CRITICAL rule engine key** — BT savings = existing rate − new rate.

---

### Q8 · Remaining Tenure

| Property       | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| **contextKey** | `orignalRemaningTenure` _(keeping existing typo for backward compat)_ |
| **type**       | number (months)                                                       |
| **icon**       | `Clock`                                                               |
| **required**   | true                                                                  |
| **showWhen**   | `existingInterestRate != ""`                                          |

Validation: 12–420 months. **CRITICAL rule engine key.**

---

### Q9 · Current Lender

| Property       | Value                               |
| -------------- | ----------------------------------- |
| **contextKey** | `selectSingleBank`                  |
| **type**       | select (dynamic — bank master list) |
| **icon**       | `Building2`                         |
| **required**   | true                                |
| **showWhen**   | `remainingTenure != ""`             |

Options: `[]` — dynamically populated. **CRITICAL rule engine key** (lender exclusion: can't BT to same bank).

---

### Q10 · Current Monthly EMI

| Property       | Value                       |
| -------------- | --------------------------- |
| **contextKey** | `includedCurrentEMIsAmount` |
| **type**       | number                      |
| **icon**       | `IndianRupee`               |
| **required**   | true                        |
| **showWhen**   | `selectSingleBank != ""`    |

Has `limit: "emiLimit"` (system-calculated expected EMI). **CRITICAL rule engine key.**

---

## 9. PAGE 15: LOAN REQUIREMENTS (BT/TOP-UP)

**Page ID**: `loanRequirements_homeLoan`
**Shows when**: `loanType != "New Loan"`
**Questions**: 3–6 visible depending on loan type

---

### Q1 · Current Market Value ✅ UPDATED

| Property       | Value                                                 |
| -------------- | ----------------------------------------------------- |
| **contextKey** | `marketValue` _(changed from `propCost` for clarity)_ |
| **type**       | number                                                |
| **icon**       | `TrendingUp`                                          |
| **required**   | true                                                  |
| **showWhen**   | always                                                |

- **Question**: "Estimated current market value of the property?"
- **Description**: _"Check average price on 99acres, MagicBricks, Housing.com for similar properties. Lenders look for value appreciation since original purchase to maximize sanctionable amount for BT/Top-up."_
- Validation: min ₹25L
- **Enricher**: For BT path, `propCost = marketValue` (backward compat — in BT, market value IS the relevant property cost for LTV)
- ✅ **Market value needed in every case** (New / Endorsement / Resale / BT) because builders also use cash components in deals. Top-up amount is decided based on this.

---

### Q2 · New Tenure Preference ✅ UPDATED

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| **contextKey** | `mortgageYear`                                |
| **type**       | radio-with-input (same quick-pick as Page 13) |
| **icon**       | `CalendarRange`                               |
| **required**   | true                                          |
| **showWhen**   | `loanType != "Top-up Only"`                   |

Same options as Page 13 Q2: 10/15/20/25/30/Max/Other.

---

### Q3 · Want Top-up With BT?

| Property       | Value                                        |
| -------------- | -------------------------------------------- |
| **contextKey** | `showResultOfBtWithTopUp`                    |
| **type**       | radio                                        |
| **icon**       | `CirclePlus`                                 |
| **required**   | true                                         |
| **showWhen**   | `loanType == "Balance Transfer With Top-up"` |

| Label               | Value | Icon    |
| ------------------- | ----- | ------- |
| Yes, include top-up | `Yes` | `Plus`  |
| No, BT only         | `No`  | `Minus` |

---

### Q4 · Top-up Tenure

| Property       | Value                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **contextKey** | `topUpTenure`                                                                                                        |
| **type**       | select (dynamic 1–15 years)                                                                                          |
| **icon**       | `CalendarClock`                                                                                                      |
| **required**   | true                                                                                                                 |
| **showWhen**   | `loanType == "Top-up Only"` OR (`loanType == "Balance Transfer With Top-up"` AND `showResultOfBtWithTopUp == "Yes"`) |

---

### Q5 · Top-up Amount

| Property       | Value                               |
| -------------- | ----------------------------------- |
| **contextKey** | `topUpAmount`                       |
| **type**       | number                              |
| **icon**       | `IndianRupee`                       |
| **required**   | true                                |
| **showWhen**   | top-up conditions + tenure answered |

Has `limit: "sanctionLimit"` (system-calculated max based on LTV). Validation: min ₹5L. **CRITICAL rule engine key.**

---

### Q6 · Top-up Purpose

| Property       | Value                                   |
| -------------- | --------------------------------------- |
| **contextKey** | `topUpPurpose`                          |
| **type**       | select                                  |
| **icon**       | `Target`                                |
| **required**   | true                                    |
| **showWhen**   | top-up conditions + `topUpAmount != ""` |

| Label                      | Value                |
| -------------------------- | -------------------- |
| Renovation / repair        | `RENOVATION`         |
| Extension / construction   | `EXTENSION`          |
| Furnishing / interior      | `FURNISHING`         |
| Medical expenses           | `MEDICAL`            |
| Education                  | `EDUCATION`          |
| Business / working capital | `BUSINESS`           |
| Debt consolidation         | `DEBT_CONSOLIDATION` |
| Wedding / family event     | `WEDDING`            |
| Personal / other           | `PERSONAL`           |

**🔌 TO WIRE**: Currently dead — wire to rule engine for product classification and lender appetite scoring.

---

## 10. PAGE 16: PRE-SANCTION PROFILE

**Page ID**: `sanctionProfile_homeLoan`
**Shows when**: `loanType == "New Loan"` AND `propertyIdentified == "No"`
**Questions**: 2–4 visible depending on path

---

### Q1 · Preferred Loan Term ✅ UPDATED

| Property       | Value                          |
| -------------- | ------------------------------ |
| **contextKey** | `mortgageYear`                 |
| **type**       | radio-with-input (quick-picks) |
| **icon**       | `CalendarRange`                |

| Label        | Value                 | Icon            |
| ------------ | --------------------- | --------------- |
| 10 yrs       | `10`                  | `Calendar`      |
| 15 yrs       | `15`                  | `Calendar`      |
| 20 yrs       | `20`                  | `Calendar`      |
| 25 yrs       | `25`                  | `Calendar`      |
| Max possible | `MAX`                 | `CalendarRange` |
| Other        | → number input (5–25) | `PenLine`       |

Note: Max 25 years for pre-sanction (no property = conservative). No "30 yrs" option.

---

### Q2 · Assessment Mode

| Property       | Value          |
| -------------- | -------------- |
| **contextKey** | `sanctionType` |
| **type**       | radio          |
| **icon**       | `Gauge`        |

| Label                 | Value                  | Icon          |
| --------------------- | ---------------------- | ------------- |
| Based on eligibility  | `Based On Eligibility` | `Gauge`       |
| Based on down payment | `Based on Downpayment` | `IndianRupee` |

Algorithmic routing — controls which calculation path the assessment engine uses.

---

### Q3 · Down Payment Budget (downpayment mode only)

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| **contextKey** | `deposit`                                |
| **type**       | number                                   |
| **icon**       | `Wallet`                                 |
| **required**   | true                                     |
| **showWhen**   | `sanctionType == "Based on Downpayment"` |

---

### Q4 · Personal Loan Bridge

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| **contextKey** | `withPersonalLoan`                                           |
| **type**       | radio                                                        |
| **icon**       | `HandCoins`                                                  |
| **required**   | true                                                         |
| **showWhen**   | `sanctionType == "Based on Downpayment"` AND `deposit != ""` |

| Label             | Value | Icon         |
| ----------------- | ----- | ------------ |
| Yes, show options | `Yes` | `ThumbsUp`   |
| No thanks         | `No`  | `ThumbsDown` |

**🔌 TO WIRE**: Currently dead (hardcoded to "No" in loanPayload.ts). Enables bridge-loan assessment mode.

---

## 11. ENRICHER DERIVATION PLAN

All derivations go in `src/lib/ruleEngine/payloadEnricher.ts`. Existing derivations (lines 245-280) are unchanged. These are ADDITIONS.

### New Derivations

```typescript
// ============================================================
// THREE-COST MODEL DERIVATIONS
// ============================================================

// Market value → new rule engine key
enriched.marketValue = answers.marketValue;

// Registry value → new key + backward compat
enriched.registryValue = answers.registryValue;
enriched.agreementSellValue = answers.registryValue; // old ATS key compat

// Derive eliminated ATS flow keys for backward compat
enriched.isDifferATSAndPropertyValue =
	Number(answers.propCost) !== Number(answers.registryValue) ? 'Yes' : 'No';
enriched.isATSReady = 'Yes'; // always — we capture registry value directly

// BT path: market value → propCost backward compat
if (isBTPath && answers.marketValue && !answers.propCost) {
	enriched.propCost = Number(answers.marketValue);
}

// ============================================================
// LOAN VINTAGE (from MonthYearModal)
// ============================================================
if (answers.loanDisbursementDate) {
	const [year, month] = answers.loanDisbursementDate.split('-').map(Number);
	const now = new Date();
	enriched.loanVintageMonths = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

// ============================================================
// AUCTION PROPERTY (merged from 3 → 1 question)
// ============================================================
const auctionStatus = enriched.auctionPropertyStatus as string | undefined;
if (auctionStatus) {
	enriched.auctionedProperty = auctionStatus === 'STANDARD' ? 'No' : 'Yes';
	enriched.understandsAsIsBasis =
		auctionStatus === 'AUCTION_AWARE' ? 'Yes' : auctionStatus === 'AUCTION_UNAWARE' ? 'No' : null;
}

// ============================================================
// TENURE "MAX POSSIBLE"
// ============================================================
if (answers.mortgageYear === 'MAX') {
	// Pass through — rule engine calculates per-lender max based on:
	// - youngest applicant's age at maturity
	// - lender's retirement age policy (58/60/65/70)
	// - lender's max term policy
	// - property type constraints
	enriched.mortgageYear = 'MAX'; // each offer card shows lender-specific max
}

// ============================================================
// BT POSSESSION & DEMAND (merged 2 → 1, Page 4)
// ============================================================
const btStatus = enriched.bt_possessionAndDemandStatus as string | undefined;
if (btStatus && !enriched.isPossessionOfferedByAuthority) {
	enriched.isPossessionOfferedByAuthority = btStatus.startsWith('POSSESSION_') ? 'Yes' : 'No';
	enriched.isAnyDemandFromTheBuilder = btStatus.endsWith('_WITH_DEMAND') ? 'Yes' : 'No';
}

// ============================================================
// RESIDENCE PATTERN (graduated → boolean compat)
// ============================================================
// If ALL applicants have applicantResidencePattern == "SAME_CITY"
// then residenceOptionSame = "Yes", otherwise "No"
// (Implemented in applicant-level processing loop)

// ============================================================
// DOCUMENTATION READINESS (merged 3 legal → 1)
// ============================================================
const docReady = enriched.documentationReadiness as string | undefined;
if (docReady) {
	enriched.ownershipChainComplete = docReady === 'ALL_READY' ? 'Yes' : 'No';
	enriched.originalDocumentsAvailable = docReady === 'ALL_READY' ? 'Yes' : 'No';
	enriched.encumbranceCertificateVerified =
		docReady === 'ALL_READY' || docReady === 'PARTIAL' ? 'Yes' : 'No';
}

// ============================================================
// PROPERTY DISPUTE (graduated → boolean compat)
// ============================================================
const disputeStatus = enriched.propertyDisputeStatus as string | undefined;
if (disputeStatus) {
	enriched.noLegalDispute = disputeStatus === 'CLEAR' ? 'Yes' : 'No';
}

// ============================================================
// PER-APPLICANT CREDIT → CASE-LEVEL AGGREGATION
// ============================================================
// Per-applicant creditHistoryStatus aggregated:
// If ANY applicant has active default → case-level isDefaulter = "Yes"
// If ANY applicant has madeGuarantor → case-level madeGuarantor = "Yes"
// (Implemented in applicant-level processing loop)

// ============================================================
// NRI: GPA LOCATION → RESIDENCE COMPAT
// ============================================================
// When ALL applicants are NRI and GPA location is captured:
// gpaStateName → residenceStateName (for rule engine location matching)
// gpaCityName → residenceCityName (for rule engine location matching)

// ============================================================
// PURCHASE TYPE BACKWARD COMPAT
// ============================================================
const pt = enriched.purchaseType as string | undefined;
if (pt) {
	if (pt === 'direct_from_builder') {
		enriched.purchaseType = 'Direct Sale'; // backward compat
	} else if (pt === 'resale_normal' || pt === 'resale_endorsement') {
		enriched.purchaseType = 'Resale'; // backward compat
		enriched.isEndorsement = pt === 'resale_endorsement';
	}
}
```

---

## 12. RULE ENGINE ADDITIONS

### New Keys for `ruleValidator.ts` → `LOAN_TRANSACTION_KEYS`

| Key                      | Type   | Source                              | Purpose                                                      |
| ------------------------ | ------ | ----------------------------------- | ------------------------------------------------------------ |
| `marketValue`            | number | Page 13 Q3 / Page 15 Q1             | LTTV calculation (sanctionable amount)                       |
| `registryValue`          | number | Page 13 Q5                          | LCR calculation (documented value, loan tranche structuring) |
| `loanVintageMonths`      | number | Derived from `loanDisbursementDate` | BT eligibility gate (min 6 months)                           |
| `interestRateType`       | string | Page 14 Q4                          | BT benefit: fixed→floating conversion value                  |
| `emiBounceHistory`       | string | Page 14 Q5                          | BT loan-specific track record → FOIR waiver eligibility      |
| `topUpPurpose`           | string | Page 15 Q6                          | Product classification, lender appetite scoring              |
| `registryTimeline`       | string | Page 13 Q7                          | Processing urgency, lender sorting                           |
| `auctionPropertyStatus`  | string | Page 13 Q1                          | Auction property risk assessment                             |
| `priorAssessmentHistory` | string | Page 1 Q1                           | "Second look" case identification                            |

### New Keys for `APPLICANT_KEYS`

| Key                          | Type   | Source     | Purpose                                      |
| ---------------------------- | ------ | ---------- | -------------------------------------------- |
| `emiBounceCount`             | string | Page 11 Q1 | Per-applicant credit behavior                |
| `defaultSettlementStatus`    | string | Page 11 Q2 | Per-applicant default/settlement history     |
| `recentEnquiryCount`         | string | Page 11 Q3 | Enquiry shopping detection                   |
| `applicantResidencePattern`  | string | Page 8     | Same city / different city / different state |
| `ownedResidentialProperties` | string | Page 8     | LTV impact (higher count = stricter LTV)     |
| `education`                  | string | Page 8     | Unwritten lender policies                    |
| `religion`                   | string | Page 8     | Unwritten on-ground lender policies          |
| `creditHistoryStatus`        | string | Page 11    | Per-applicant (moved from case-level)        |

### Keys to Wire (Currently Dead → Must Flow to Rule Engine)

| Key                    | Current State                         | Action                                                         |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------- |
| `interestRateType`     | Collected, only in `_raw.loanAnswers` | Add to `LOAN_TRANSACTION_KEYS`, include in BT benefit calc     |
| `emiBounceHistory`     | Collected, only in `_raw.loanAnswers` | Add to `LOAN_TRANSACTION_KEYS`, wire to FOIR waiver logic      |
| `topUpPurpose`         | Collected, only in `_raw.loanAnswers` | Add to `LOAN_TRANSACTION_KEYS`, wire to product classification |
| `withPersonalLoan`     | Hardcoded to "No" in loanPayload.ts   | Wire to enable bridge-loan assessment mode                     |
| `loanDisbursementDate` | Collected, UI warning only            | Derive `loanVintageMonths`, add to `LOAN_TRANSACTION_KEYS`     |

---

## 13. OFFER CARD REQUIREMENTS

### Tranche Display ✅

Every lender's offer card MUST show:

| Field                           | Description                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Home Loan tranche**           | Amount based on LCR (Registry Value × LTV%)                                                                                            |
| **Home Loan interest rate**     | Rate for the documented home loan                                                                                                      |
| **Additional tranche**          | Remaining amount (LTTV sanction − LCR loan)                                                                                            |
| **Additional tranche category** | Furniture & Fixing / Renovation / etc.                                                                                                 |
| **Additional tranche rate**     | Same or slightly higher than home loan rate                                                                                            |
| **Disbursement timing**         | Which tranches before registry, which after                                                                                            |
| **Post-registry gap**           | Amount released after registry (the deal-breaker amount)                                                                               |
| **Mitigation guidance**         | If post-registry gap exists: "Buyer may arrange cheque from spouse/family member for ₹X until lender releases funds post-registration" |

### NRI GPA Policy ✅

When ALL applicants are NRI, each offer card shows:

- "As per [Lender Name]'s policy, [relationship types] are eligible as GPA"
- This is per-lender config, NOT a form question

### Processing Speed Indicator

Based on `registryTimeline`:

- If < 1 month: show "URGENT — fast processing required" badge
- Sort/prioritize lenders with faster documented turnaround times

---

## 14. IMPLEMENTATION SEQUENCE

✅ User directive: "Wire to rule engine FIRST, then change the form."

### Phase 1: Rule Engine Wiring (No form changes)

1. **Add new keys to `ruleValidator.ts`** — `LOAN_TRANSACTION_KEYS` and `APPLICANT_KEYS` (Section 12)
2. **Add enricher derivations to `payloadEnricher.ts`** (Section 11) — all backward-compat derivations
3. **Wire dead keys**: `interestRateType`, `emiBounceHistory`, `topUpPurpose`, `withPersonalLoan`, `loanDisbursementDate`
4. **Update `loanPayload.ts`** — ensure new keys flow to rule engine payload
5. **Update `casePayloadBuilder.ts`** — add `marketValue`, `registryValue` to case payload structure
6. **Update type definitions** — `src/lib/utils/payloadBuilder/types.ts`, `src/lib/types/form.ts`
7. **Run tests** — ensure 6,971 tests still pass, no regression

### Phase 2: Component Page Changes (Pages 8-12)

8. **Update `AddApplicant.svelte`** — education, religion dropdowns; remove employmentType UI; residence graduated; property count
9. **Update `CreditScoreSection.svelte`** — replace 8 binary with 3 graduated + explanations
10. **Update `ObligationsSection.svelte`** — add `emiDelayHistory` per obligation, BT loan guard
11. **Update applicant types** in `form.ts` — new fields
12. **Run tests + type check**

### Phase 3: Schema-Driven Page Changes (Pages 1-7, 13-16)

13. **Create new schema file** — `homeLoanSchemaV2.json` (keep original as fallback)
14. **Implement Pages 1-7** — case intake, property pages, legal
15. **Implement Page 13** — three-cost model (Deal & Financials)
16. **Implement Pages 14-16** — BT pages with updates (optional account number, 6-month warning, MonthYearModal, quick-pick tenure)
17. **Update both schema locations atomically** — `src/lib/config/` AND `src/lib/server/formEngine/schemas/`
18. **Run full test suite + type check**

### Phase 4: Offer Card Updates

19. **Implement tranche display** on offer cards
20. **Add NRI GPA policy** per-lender config
21. **Add registry timeline urgency** sorting
22. **Add market value appreciation** signal for BT

### Phase 5: NBFC Negative Area System

23. **Data model** for negative area lists
24. **RM onboarding collection** interface
25. **Runtime query** for property location + applicant residence

---

## 15. DEAD KEYS REGISTER

Complete list of keys collected by the form but never consumed by rule engine or case payload.

### Eliminated (removed from form)

| Key                                | Was On                 | Reason                                                       |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------ |
| `loanForAuctionPayment`            | Old Page 11            | Never mapped to case payload, rule engine, or loanPayload.ts |
| `ATSvalue` (ourSuggestionOrBySelf) | Old Page 10            | UI-only gating; ATS suggestion flow eliminated               |
| `depositAsPerATS`                  | Old Page 10            | Computed; loan structuring now per-lender on offer cards     |
| 8× `creditFactorAnswers` keys      | Old CreditScoreSection | Only in 5 UI files; never reached payload or rule engine     |

### Now Wired (were dead, will be connected)

| Key                    | Was On  | Now                              |
| ---------------------- | ------- | -------------------------------- |
| `interestRateType`     | Page 14 | → BT benefit calculation         |
| `emiBounceHistory`     | Page 14 | → FOIR waiver eligibility        |
| `topUpPurpose`         | Page 15 | → Product classification         |
| `withPersonalLoan`     | Page 16 | → Bridge-loan assessment mode    |
| `loanDisbursementDate` | Page 14 | → `loanVintageMonths` derivation |

### Legacy Dead (were dead before, still dead — from original audit)

| Key                             | Location    | Status                            |
| ------------------------------- | ----------- | --------------------------------- |
| `emiBounceHistory` (old format) | Old Page 12 | Replaced by new graduated version |
| `lastRegistryDuration`          | Old schema  | Never consumed                    |

---

## 16. BACKWARD COMPATIBILITY PLAN

### Keys with 80+ File References

| Key                   | Files | Strategy                                                                                                                     |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `employmentType`      | 80    | Remove UI input only; derive from income profile. Key stays in all files.                                                    |
| `residenceOptionSame` | 32    | Replace UI with graduated `applicantResidencePattern`; enricher derives boolean `residenceOptionSame` for all 32 references. |
| `propCost`            | 80+   | Keep as contextKey for deal value; enricher sets from `marketValue` for BT path.                                             |
| `purchaseType`        | 50+   | New values in form; enricher maps to legacy "Direct Sale"/"Resale" for all downstream.                                       |

### Derived Keys (enricher creates for backward compat)

| New Question                        | Old Key(s) Derived                                                                       | Method                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------- |
| `auctionPropertyStatus`             | `auctionedProperty`, `understandsAsIsBasis`                                              | Enricher (Section 11)             |
| `registryValue`                     | `agreementSellValue`, `isDifferATSAndPropertyValue`, `isATSReady`                        | Enricher (Section 11)             |
| `bt_possessionAndDemandStatus`      | `isPossessionOfferedByAuthority`, `isAnyDemandFromTheBuilder`                            | Enricher (Section 11)             |
| `documentationReadiness`            | `ownershipChainComplete`, `originalDocumentsAvailable`, `encumbranceCertificateVerified` | Enricher (Section 11)             |
| `propertyDisputeStatus`             | `noLegalDispute`                                                                         | Enricher (Section 11)             |
| `applicantResidencePattern`         | `residenceOptionSame`                                                                    | Enricher (Section 11)             |
| Per-applicant `creditHistoryStatus` | Case-level `isDefaulter`, `madeGuarantor`                                                | Enricher aggregation (Section 11) |
| NRI `gpaStateName`/`gpaCityName`    | `residenceStateName`/`residenceCityName`                                                 | Enricher (Section 11)             |
| New `purchaseType` values           | Legacy `purchaseType` ("Direct Sale"/"Resale")                                           | Enricher (Section 11)             |

### Test Impact

| Test Area                    | Files        | Expected Changes                                                                          |
| ---------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `formPathScenarios.ts`       | 20 scenarios | All reference `propertyComplianceStatus: 'fully_compliant'` — update to new page location |
| `pageFlowMap.ts`             | 1 file       | Complete rewrite for 16-page structure                                                    |
| `homeLoan.setup.ts`          | E2E          | Update question IDs for new schema                                                        |
| `nextButtonLogic.test.ts`    | 1 file       | Update required keys for new pages                                                        |
| `questionVisibility.test.ts` | 1 file       | Update question IDs                                                                       |

---

## 17. NBFC NEGATIVE AREA SYSTEM

✅ Novel feature — reverse identification of NBFC negative areas.

### Concept

Every NBFC maintains a list of "negative areas" where they won't lend. Currently, DSAs discover this AFTER application submission → wasted time. The platform collects these lists proactively.

### Data Collection

- During RM onboarding (when NBFC relationship managers join), collect their bank's negative area list
- Store per-NBFC: `{ nbfcId, negativeAreas: [{ state, city, localities[] }] }`
- Build UNION of all NBFC negative areas → show consolidated list to DSA

### Runtime Check — Two Points

1. **Property location** (Page 2): After DSA enters property state/city/locality → check if ANY NBFC has this as negative area → show advisory: "X NBFCs don't lend in this area. Y lenders remain."
2. **Applicant residence** (Page 8): Same check for each applicant's residence location → "If applicant resides in negative area, some lenders won't process."

### Data Model (💡 Proposed)

```typescript
interface NbfcNegativeArea {
	nbfcId: string;
	bankName: string;
	areas: {
		state: string;
		city: string;
		localities: string[]; // empty = entire city is negative
	}[];
	updatedAt: Date;
	sourceRmId: string; // which RM provided this data
}
```

### Implementation Notes

- This is a POST-LAUNCH feature (Phase 5 in implementation sequence)
- Requires RM portal enhancement for data collection
- The negative area data becomes a platform data moat over time — no individual DSA or NBFC has the complete picture

---

## 18. DSA JOURNEY PATHS

### Journey Lengths by Scenario

| Scenario                                        | Pages Visited                  | Est. Questions |
| ----------------------------------------------- | ------------------------------ | -------------- |
| **New Loan + property (Direct Sale, standard)** | 1, 2, 3, 5, 7, 8-12, 13        | ~40-50         |
| **New Loan + property (Resale)**                | 1, 2, 3, 5, 6, 7, 8-12, 13     | ~45-55         |
| **New Loan + property (Endorsement)**           | 1, 2, 3, 5, 6, 7, 8-12, 13     | ~45-55         |
| **New Loan, no property**                       | 1, 8-12, 16                    | ~25-30         |
| **BT + property**                               | 1, 2, 3, 4, 5, 7, 8-12, 14, 15 | ~55-65         |
| **BT + Top-up + property**                      | 1, 2, 3, 4, 5, 7, 8-12, 14, 15 | ~58-70         |
| **Top-up Only**                                 | 1, 2, 3, 5, 7, 8-12, 14, 15    | ~50-60         |

### Comparison with Original

Original: 73 questions, most paths ~50-65 visible.
Redesign: Similar question counts but **graduated options capture 2-3× more signal per question**. Net signal increase ~40-60% with similar or lower DSA effort.

---

## 19. CROSS-PAGE DEPENDENCIES

### Shared contextKeys (only one page active per path)

| contextKey     | Pages                                                           | Guard                                           |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| `mortgageYear` | Page 13 / Page 15 / Page 16                                     | Each page has different showWhen; never coexist |
| `propCost`     | Page 13 (deal value) / Page 15 (enricher sets from marketValue) | BT path uses enricher derivation                |
| `deposit`      | Page 13 / Page 16                                               | Different paths (property identified vs not)    |
| `marketValue`  | Page 13 (New Loan) / Page 15 (BT)                               | Different paths                                 |

### Cross-Page Validation Dependencies

| Validation                              | Source Page | References Key From                                                 |
| --------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `principalOutstanding < sanctionAmount` | Page 14 Q6  | Page 14 Q1 (same page)                                              |
| `deposit ≤ 90% of propCost`             | Page 13 Q6  | Page 13 Q4 (same page)                                              |
| `registryValue ≤ propCost` (warning)    | Page 13 Q5  | Page 13 Q4 (same page)                                              |
| BT loan guard on obligations            | Page 12     | Page 14 Q9 (`selectSingleBank`) + Q10 (`includedCurrentEMIsAmount`) |

### showWhen Dependencies Across Pages

| Question                              | Depends On                            | From Page                      |
| ------------------------------------- | ------------------------------------- | ------------------------------ |
| Page 13 Q4 (deal value) question text | `purchaseType`                        | Page 2                         |
| Page 14 Q4 (interestRateType)         | `loanType`                            | Page 1 (implicit — page-level) |
| Page 15 Q2 (new tenure)               | `loanType`                            | Page 1 (implicit)              |
| Page 15 Q3-Q6 (top-up flow)           | `loanType`, `showResultOfBtWithTopUp` | Page 1, Page 15 Q3             |

---

## 20. OPEN QUESTIONS

Items that may need user confirmation during implementation:

| #   | Question                                                          | Context                                                                        | Default If Not Answered           |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| 1   | Exact option labels for `priorAssessmentHistory` (Page 1 Q1)      | Proposed: First assessment / 1-2 lenders / 3+ / Previously rejected            | Use proposed                      |
| 2   | Exact option labels for `defaultSettlementStatus` (Page 11 Q2)    | Proposed: Clean / Settled / Written off / Active default                       | Use proposed                      |
| 3   | Exact option labels for `recentEnquiryCount` (Page 11 Q3)         | Proposed: None / 1-2 / 3-5 / 6+                                                | Use proposed                      |
| 4   | `bounceReason` / `defaultReason` / `enquiryReason` select options | Need DSA-friendly labels                                                       | Design during implementation      |
| 5   | Pages 2-3 exact question specs                                    | Key decisions documented; exact question text needs finalization               | Reference conversation transcript |
| 6   | Page 5-6 exact question specs                                     | Key decisions documented; exact question text needs finalization               | Reference conversation transcript |
| 7   | `registryDateReason` — are the proposed reason options complete?  | Proposed: Auspicious / Anniversary / Birthday / Tax planning / Festive / Other | Use proposed, extend if needed    |
| 8   | Property count options                                            | Proposed: None / 1 / 2 / 3+                                                    | Use proposed                      |
| 9   | Max tenure for "Other" manual input on BT page                    | Currently proposed 5-40 for New Loan, 5-25 for Pre-sanction. BT?               | 5-35 for BT                       |

---

## 21. INSIGHTS & SUGGESTIONS

### For the Platform Owner

1. **The form is a training tool.** Graduated options (0/1/2/3+ bounces instead of Yes/No) inherently teach junior DSAs what thresholds matter. When a new DSA sees "Clean track / 1 bounce / 2 bounces / 3+", they learn the scoring tiers without formal training. This is a subtle but powerful onboarding accelerant.

2. **Three-cost model is a genuine differentiator.** No competing DSA tool in India properly captures Market Value / Deal Value / Registry Value as three separate data points and shows per-lender loan tranche structuring. Most tools ask one "property value" and leave the DSA to figure out the rest.

3. **Registry timeline + tranche visibility prevents deal failures.** Most DSAs discover post-registry tranche problems AFTER sanctioning — leading to last-minute deal collapses. Showing tranches + timing + mitigation (cheque arrangement) UPFRONT on offer cards means DSAs can prepare buyers AND sellers in advance. This prevents failures and builds DSA credibility with both parties.

4. **The "middle route" cheque arrangement should be calculable.** Since we have all three values (market, deal, registry) and per-lender LTV policies, the system can auto-calculate: "For this lender, ₹X will be released after registry. Buyer should arrange a cheque for this amount." This makes the DSA look like a financial advisor, not just a form-filler.

5. **Market value + disbursement date = appreciation data over time.** Every BT case gives us: property area, original disbursement year, current market value. Over hundreds of BT cases, the platform builds property appreciation curves per area/project. This becomes predictive: "Properties in [area] appreciated 15% in 2 years — optimal BT timing for maximum top-up." This is proprietary data no individual DSA has.

6. **NBFC negative area lists become a data moat.** As multiple DSAs contribute negative area data from different NBFCs over time, the platform builds a comprehensive negative area map that no individual DSA, NBFC, or competitor platform has. This is genuinely sellable data/intelligence.

7. **The graduated credit section trains DSAs on what matters to lenders.** By structuring CIBIL questions as EMI bounces / defaults-settlements / recent enquiries (the three things lenders actually check), new DSAs learn the lender's evaluation framework through the form itself. Experienced DSAs already know this; the form codifies their knowledge.

8. **"Prior assessment history" has a hidden use.** Beyond helping "second-look specialist" lenders, it also signals to the platform: cases assessed by 3+ lenders likely have issues that didn't surface. The system could flag these for extra scrutiny or route to lenders with more flexible policies.

---

## APPENDIX A: FILE REFERENCE MAP

| I need to modify...    | File path                                                                     |
| ---------------------- | ----------------------------------------------------------------------------- |
| Enricher derivations   | `src/lib/ruleEngine/payloadEnricher.ts` (add after line ~280)                 |
| Rule engine known keys | `src/lib/ruleEngine/ruleValidator.ts`                                         |
| Loan payload mapping   | `src/lib/utils/loanPayload.ts`                                                |
| Case payload builder   | `src/lib/utils/casePayloadBuilder.ts`                                         |
| Payload types          | `src/lib/utils/payloadBuilder/types.ts`                                       |
| Applicant types        | `src/lib/types/form.ts`                                                       |
| Schema (NEW)           | `src/lib/config/homeLoanSchemaV2.json` + `src/lib/server/formEngine/schemas/` |
| Schema (KEEP)          | `src/lib/config/homeLoanSchema.json` (never delete)                           |
| Applicant component    | `src/lib/components/AddApplicant.svelte`                                      |
| Credit score component | `src/lib/components/CreditScoreSection.svelte`                                |
| Obligations component  | `src/lib/components/ObligationsSection.svelte`                                |
| Form engine            | `src/routes/(app)/form/+page.svelte` (flagKey resolution)                     |
| Form layout            | `src/routes/(app)/form/+layout.svelte` (MonthYearModal)                       |
| Test scenarios         | `src/lib/testing/scenarios/formPathScenarios.ts`                              |
| Page flow map          | `src/lib/testing/scenarios/pageFlowMap.ts`                                    |
| E2E setup              | `src/lib/testing/e2e/homeLoan.setup.ts`                                       |
| Route constants        | `src/lib/config/routes.ts`                                                    |
| Bank master            | `src/lib/config/bankSelection/`                                               |
| i18n (3 files)         | `src/lib/i18n/en.ts`, `hi.ts`, `mr.ts` — new question/option labels           |

---

## APPENDIX B: TERMINOLOGY QUICK REFERENCE

```
LTTV = Loan to Technical Value = Loan / Market Value
     → RBI's LTV rules apply here
     → Banks internally call it "Loan to Technical Value"
     → This determines the SANCTIONABLE amount

LCR  = Loan to Cost Ratio = Loan / Registry Value
     → "Loan to Documented Value"
     → Can go up to 90% of registry value
     → This determines the HOME LOAN TRANCHE

Gap  = LTTV-based sanction − LCR-based loan amount
     → Given as additional product (Furniture/Fixing/Renovation)
     → Disbursed AFTER registry
     → THE DEAL-BREAKER: seller wants all money before signing

Middle Route = Buyer provides cheque (from spouse/family)
     → Covers the post-registry gap amount
     → Returned when lender releases funds
     → Must be disclosed to lender (transparency)
```

---

## 22. UX SAFEGUARDS & QUALITY ASSURANCE

**⚠️ CRITICAL**: Every phase of implementation MUST preserve existing UX functionality and verify against this checklist. No phase is "done" until ALL applicable items pass.

### 22.1 Global Form Validations (MUST NOT BREAK)

These are existing validation mechanisms that touch EVERY schema page. Changes to any page must verify these still work.

| Validation System            | Where                                      | What It Does                                                                                                             | Verify After                    |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **Next button logic**        | `+page.svelte`, `nextButtonLogic`          | `allRequiredAnswered` mode — button enables only when all visible required questions are answered                        | Every page change               |
| **Cross-field validation**   | Schema `validation.condition` blocks       | E.g., `deposit > 90% of propCost` → error message. Uses JSON-Logic `var` references across the combined answers context  | Every question add/change       |
| **showWhen evaluation**      | Form engine `engine.ts`                    | Questions appear/hide based on combined answers. If a derived key is missing, dependent questions won't show             | Every enricher change           |
| **flagKey resolution**       | `engine.ts` + `+page.svelte`               | Selected radio option writes flagKey values to answers context. The 2026-02-23 bugfix MUST remain intact                 | Every radio question change     |
| **Limit checker**            | Schema `limit` + `limitCheckerText` fields | System-calculated max values (e.g., `sanctionLimit`, `emiLimit`). Shows advisory text when DSA approaches/exceeds limit  | Every number input change       |
| **Dynamic question text**    | Schema `question.switch` blocks            | Question wording changes based on other answers (e.g., "property cost" vs "deal value" based on purchaseType)            | Every question that uses switch |
| **Readonly computed fields** | Schema `uiMeta.readonly: true`             | Some fields are system-calculated (old ATS suggestion). Since we're REMOVING these, verify no orphan readonly references | Phase 3 (schema changes)        |

### 22.2 Applicant Recovery & Restoration (MUST NOT BREAK)

| System                            | Where                              | What To Verify                                                                                                                                                                              |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`buildIndividualSignature`**    | `applicantRecovery.ts`             | Uses (name, gender, maritalStatus, age, employmentType?). Adding education/religion to applicant does NOT affect signature — those fields are NOT in the signature. Verify this stays true. |
| **RestoreApplicantModal**         | Invoked from `AddApplicant.svelte` | When duplicate signature detected → modal offers restore. New applicant fields (education, religion, property count, residence pattern) must be included in restoration data.               |
| **`formState.applicants[]` sync** | `+page.svelte` → `AddApplicant`    | `$effect` watching `restoreIntentState.open` syncs restored data into local `formApplicant`. New fields must be part of this sync.                                                          |
| **Edit mode lock**                | `AddApplicant.svelte`              | When applicant type changes during edit, certain fields lock. Adding education/religion dropdowns must respect this lock pattern.                                                           |

### 22.3 Dashboard & Data Linkage

| Linkage                     | Where                                  | What To Verify                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Case list display**       | Dashboard case cards                   | If case payload structure changes (new fields in `buildPropertyFinancial`, `buildBalanceTransfer`, etc.), dashboard cards that display property value, loan amount, etc. must reflect new keys                                            |
| **Case detail view**        | Case detail page                       | `marketValue`, `registryValue` are new fields — case detail should display them (or at minimum, not break if they're present)                                                                                                             |
| **Case payload versioning** | `casePayloadBuilder.ts`                | Immutable snapshots (AD-02, AD-05). New payload fields must be additive — never remove/rename existing fields in case payload. Old cases with old field names must still render correctly.                                                |
| **PDF generation**          | `pdf-lib` server-side                  | Review PDF (v1) never has PII. If new fields (marketValue, registryValue) should appear in PDF, add them. But verify PII redaction rules still apply.                                                                                     |
| **Rule engine results**     | `evaluationEngine.ts` → result display | New rule engine keys (marketValue, registryValue, loanVintageMonths) must flow through evaluation and appear in lender results/offer cards. Verify results page doesn't regress — this was the EXACT failure of the reverted restructure. |

### 22.4 Per-Phase Testing Requirements

#### Phase 1: Rule Engine Wiring

| Test                                                 | How                                                            | Pass Criteria                                          |
| ---------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Existing 6,971 unit tests                            | `pnpm run test:unit`                                           | ALL pass, 0 failures                                   |
| Type check                                           | `pnpm run check`                                               | 0 errors, 0 warnings                                   |
| Enricher backward compat                             | Add unit tests for EACH new derivation                         | Old keys derived correctly from new inputs             |
| Rule validator                                       | Add tests for new `LOAN_TRANSACTION_KEYS` and `APPLICANT_KEYS` | New keys accepted, old keys still accepted             |
| **Regression**: Submit existing form with old schema | Manual or E2E                                                  | Results page shows same or better offers (NEVER fewer) |

#### Phase 2: Component Page Changes

| Test                                        | How                                              | Pass Criteria                                                   |
| ------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| AddApplicant: education/religion            | Add E2E tests                                    | Dropdowns render, values persist, restore works                 |
| AddApplicant: employmentType removal        | Run existing tests that reference employmentType | All pass — key still works, just not in UI                      |
| CreditScoreSection: new graduated questions | Add unit tests for each question's options       | Values flow to per-applicant payload                            |
| CreditScoreSection: explanations            | Test conditional display                         | Explanation dropdowns appear only when negative signal selected |
| ObligationsSection: emiDelayHistory         | Add per-obligation field test                    | Value persists per obligation entry                             |
| ObligationsSection: BT loan guard           | Test with BT loanType                            | Warning shows when obligation matches BT loan details           |
| Applicant recovery                          | Test with new fields                             | buildIndividualSignature unchanged, restore includes new fields |
| **Regression**: Full form flow              | E2E                                              | Complete a New Loan + BT case end-to-end, verify results        |

#### Phase 3: Schema Changes

| Test                                 | How                                           | Pass Criteria                                                      |
| ------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------ |
| Page flow                            | Update `pageFlowMap.ts`, run tests            | 16-page structure navigates correctly                              |
| showWhen on every page               | Update `questionVisibility.test.ts`           | All conditional questions show/hide correctly                      |
| Next button on every page            | Update `nextButtonLogic.test.ts`              | Button enables at correct answer state per page                    |
| Cross-field validations              | Test all validation.condition blocks          | Error messages appear at correct thresholds                        |
| Three-cost model (Page 13)           | New E2E scenario                              | marketValue → dealValue → registryValue → deposit flow works       |
| Quick-pick tenure (radio-with-input) | New component test                            | Quick picks set value, "Other" reveals input, "Max" passes through |
| MonthYearModal on BT page            | Test disbursement date                        | Modal opens, YYYY-MM stored, 6-month warning triggers              |
| Registry timeline                    | Test specific date flow                       | Sub-questions (date + reason) appear when "Specific date" selected |
| `formPathScenarios.ts`               | Update all 20 scenarios                       | All paths complete without errors                                  |
| **Regression**: Results page         | E2E with both old-schema and new-schema cases | Offers display correctly for both                                  |

#### Phase 4: Offer Card Updates

| Test                      | How                           | Pass Criteria                                                  |
| ------------------------- | ----------------------------- | -------------------------------------------------------------- |
| Tranche display           | Visual + data test            | Home Loan tranche, additional tranche, rates, timing all shown |
| Post-registry gap warning | Test with cases where gap > 0 | Mitigation guidance displayed                                  |
| NRI GPA policy            | Test with all-NRI applicants  | Per-lender GPA relationship shown                              |
| Registry urgency          | Test with < 1 month timeline  | Urgency badge shown, lender sorting affected                   |

### 22.5 New UI Patterns (Implementation Notes)

| Pattern                                                    | Challenge                                                                                        | Suggested Approach                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`radio-with-input`** (tenure quick-pick)                 | Form engine doesn't support hybrid radio+text natively                                           | Option A: New question type `radioWithInput` in schema engine. Option B: Svelte component override for `mortgageYear` contextKey specifically. Option C: Two linked questions (radio + conditional text). **Recommend Option A** for reusability. |
| **MonthYearModal in schema page**                          | MonthYearModal is layout-level, triggered by store flag. Schema pages don't directly control it. | Add a `uiType: "monthYear"` that renders a button opening the modal via the existing store pattern. Capture result as `YYYY-MM` string.                                                                                                           |
| **Compound questions** (registry timeline → date + reason) | Schema doesn't support sub-questions within a radio option                                       | Option A: Separate questions with showWhen on parent value. Option B: New `compound` question type. **Recommend Option A** — simpler, works with existing engine.                                                                                 |
| **Per-obligation field** (emiDelayHistory)                 | Obligations are component-driven, not schema                                                     | Add field directly to ObligationsSection component. Standard Svelte 5 rune state.                                                                                                                                                                 |

### 22.6 Extensibility Scope

The redesign is structured to allow future UX intelligence enhancements WITHOUT structural changes:

| Future Enhancement                           | How It Plugs In                                                                                              | Effort                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| **Smart defaults** based on area/project     | `marketValue` field could pre-populate from platform's appreciation database (built from BT cases over time) | Medium — needs data accumulation first              |
| **Real-time lender count** as DSA fills form | After each answer, show "X lenders match so far" — uses rule engine's fast-path evaluation                   | Medium — needs progressive evaluation API           |
| **Confidence meter** per question            | Show how much each answer affects the number of eligible lenders (e.g., "This answer affects 12 lenders")    | Low — enricher already tags signal strength         |
| **Auto-suggest registry value**              | Based on area's Ready Reckoner rates (public data)                                                           | Medium — needs RR rate database                     |
| **Cross-case learning**                      | "DSAs in your area typically see 15% appreciation over 2 years" — from BT market value data                  | High — needs significant data volume                |
| **Smart obligation entry**                   | If DSA enters an obligation matching a known lender's product, auto-suggest EMI/tenure                       | Low — bank master already has product data          |
| **Question-level help tooltips**             | "Why do we ask this?" expandable for each question — trains junior DSAs                                      | Low — schema already supports `description` field   |
| **Progress estimation**                      | "4 more questions on this page" / "3 pages remaining" based on current answers and showWhen tree             | Medium — needs showWhen pre-evaluation              |
| **Form completion analytics**                | Track where DSAs drop off, which questions take longest → optimize form ordering                             | Low — event tracking on answer timestamps           |
| **Comparative offer highlights**             | "This lender saves ₹X/month vs your current EMI" on BT offer cards                                           | Low — data already available (existing rate vs new) |
| **Deal structure visualization**             | Pie chart showing: loan portion / down payment / cash component / post-registry gap                          | Medium — needs frontend chart component             |

### 22.7 i18n Impact

All new questions, options, descriptions, and validation messages need translations in:

- `src/lib/i18n/en.ts` (English — primary, design first)
- `src/lib/i18n/hi.ts` (Hindi — colloquial Devanagari, NOT formal)
- `src/lib/i18n/mr.ts` (Marathi — colloquial Devanagari)

Currently 315+ keys each. Estimate ~40-50 new keys per language file for this redesign.

**Translation approach**: Design English first, translate after form is working. Use i18n key pattern consistent with existing: `form.homeLoan.{pageId}.{questionId}.*`

---

_Document complete. All design decisions, UX safeguards, testing requirements, and extensibility scope captured. Ready for implementation._
