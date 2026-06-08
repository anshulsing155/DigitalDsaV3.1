# Credit Risk Intelligence — Implementation Tiers

> **Created**: 2026-02-23 | **Status**: APPROVED PLAN
> **Prerequisite**: Read `CREDIT-RISK-IMPLEMENTATION-PROMPT.md` for rules and constraints.
> **Design source**: `HOME-LOAN-SCHEMA-DESIGN.md` for full question specs.

---

## Tier 1: Financial & Credit Intelligence (Existing Pages, No Replacements)

**Scope**: 4 new questions on existing pages. No page restructure. No question replacement.
**Goal**: Result page shows smarter output using data already being collected + 4 new signals.

### Step 0: Wire existing data better (NO form changes)

Before adding any question, enhance the rule engine to use existing fields that are underutilized:

| Existing Field                                                               | Currently Used For    | Enhancement                                                                              |
| ---------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| `propertyAreaType` (AUTHORITY/CONVERTED/MUNICIPAL/VILLAGE)                   | showWhen routing only | Add to `_computed.propertyLegalRisk` — VILLAGE = higher risk tier                        |
| `PropertyStage` (Ready/Under Construction/Plot)                              | Hard gate only        | Feed into approval_probability — under construction = lower probability for some lenders |
| `constructionType` (Flat/House/Villa)                                        | Not used in scoring   | House/Villa = individual construction risk vs Flat in society                            |
| `propertyComplianceStatus` (authorized_per_plan/not_per_plan/not_authorized) | Not used in scoring   | Direct risk signal — not_authorized = very few lenders                                   |
| `creditScore` + `lowCreditReasons`                                           | Basic CIBIL gate      | Per-lender CIBIL tolerance varies (NBFC flexible, PSU strict)                            |

**Files to modify**: `payloadEnricher.ts`, `evaluationEngine.ts` (Stage 9 or new 9.5), `resultBuilder.ts`, `discomfortAnalyzer.ts`, `systemConfig.ts`
**Verify**: Fill existing form → result page shows richer factors/suggestions using existing data.

### Step 1A: `valuationAssessment` — add to propertyFinancial_homeLoan

| Field           | Value                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------- |
| **contextKey**  | `valuationAssessment`                                                                         |
| **type**        | radio, required                                                                               |
| **question**    | "Based on your knowledge, how does the agreed deal value compare to the area's market rates?" |
| **showWhen**    | `dealValue != "" OR propertyCost != ""`                                                       |
| **Options**     | `AT_MARKET` / `SLIGHTLY_ABOVE` / `SIGNIFICANTLY_ABOVE` / `UNSURE`                             |
| **Add to page** | `propertyFinancial_homeLoan` — after deposit/downpayment, before ATS questions                |

**Full-stack wiring:**

- Schema JSON (both copies) — add question
- `types.ts` — add `valuationAssessment?: string` to LoanTransactionPayload
- `loanTransaction.ts` — extract from answers
- `payloadEnricher.ts` — add `_computed.valuationRisk` (AT_MARKET=0, SLIGHTLY_ABOVE=25, SIGNIFICANTLY_ABOVE=75, UNSURE=40)
- `evaluationEngine.ts` — use `_computed.valuationRisk` in approval_probability adjustment
- `resultBuilder.ts` — add factor: "Deal value appears above market rates — bank valuation may be lower, reducing effective LTV"
- `discomfortAnalyzer.ts` — add warning zone when SIGNIFICANTLY_ABOVE
- Tests — add to fixtures, assertions

### Step 1B: `cashComponent` — add to propertyFinancial_homeLoan

| Field           | Value                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **contextKey**  | `cashComponent`                                                                                    |
| **type**        | radio, required                                                                                    |
| **question**    | "Is any part of this transaction being settled outside the registered agreement (cash component)?" |
| **showWhen**    | `valuationAssessment != ""`                                                                        |
| **Options**     | `NIL` / `MINOR` / `SIGNIFICANT` / `PREFER_NOT_SAY`                                                 |
| **Add to page** | `propertyFinancial_homeLoan` — after valuationAssessment                                           |

**Full-stack wiring:**

- Schema JSON (both copies) — add question
- `types.ts` — add `cashComponent?: string` to LoanTransactionPayload
- `loanTransaction.ts` — extract from answers
- `payloadEnricher.ts` — add `_computed.cashRisk` (NIL=0, MINOR=30, SIGNIFICANT=70, PREFER_NOT_SAY=50)
- `evaluationEngine.ts` — cash component affects effective LTV: registered value < actual deal → lower loan amount
- `resultBuilder.ts` — factor: "Cash component means registered value is lower — loan amount capped at X% of registered value, not deal value"
- `discomfortAnalyzer.ts` — DSA coaching: "Consider reducing cash component to maximize loan amount"
- Tests

### Step 1C: `bounceQuality` — add to credit behavior flow

| Field           | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| **contextKey**  | `bounceQuality`                                                           |
| **type**        | radio, required                                                           |
| **question**    | "If any EMI bounces have occurred, what best describes them?"             |
| **showWhen**    | `emiBounceHistory in ["1", "2", "3+"]` (only when bounces > 0, BT/top-up) |
| **Options**     | `TECHNICAL` / `TIMING` / `GENUINE_RESOLVED` / `GENUINE_EXTENDED`          |
| **Add to page** | `existingLoanInfo_homeLoan` — after `emiBounceHistory` question           |

**Full-stack wiring:**

- Schema JSON (both copies) — add question to existingLoanInfo_homeLoan page
- `types.ts` — add `bounceQuality?: string` to LoanTransactionPayload
- `loanTransaction.ts` — extract from answers
- `payloadEnricher.ts` — add `_computed.bounceRisk` (TECHNICAL=5, TIMING=20, GENUINE_RESOLVED=50, GENUINE_EXTENDED=90)
- `evaluationEngine.ts` — adjust bounce-related hard gates: TECHNICAL bounces should not trigger rejection at lenient lenders
- `resultBuilder.ts` — factor: "EMI bounces were technical in nature — most lenders will overlook these"
- `discomfortAnalyzer.ts` — coaching based on bounce type
- Tests

### Step 1D: `recentInquiries` — add to credit behavior flow

| Field           | Value                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **contextKey**  | `recentInquiries`                                                                                                                    |
| **type**        | radio, required                                                                                                                      |
| **question**    | "How many loan inquiries (hard pulls) has the applicant had in the last 6 months?"                                                   |
| **showWhen**    | After credit score is filled (all loan types)                                                                                        |
| **Options**     | `NONE_OR_ONE` / `TWO_THREE` / `FOUR_FIVE` / `SIX_PLUS`                                                                               |
| **Add to page** | `selection_homeLoan` — as question 3 (after existing 2 questions), OR create minimal `creditBehavior_homeLoan` page if user approves |

**Full-stack wiring:**

- Schema JSON (both copies) — add question
- `types.ts` — add `recentInquiries?: string` to ApplicantPayload (per-applicant)
- `applicantPayload.ts` — extract from answers
- `payloadEnricher.ts` — add `_computed.inquiryRisk` (NONE_OR_ONE=0, TWO_THREE=15, FOUR_FIVE=50, SIX_PLUS=90)
- `evaluationEngine.ts` — SIX_PLUS = hard reject at PSU banks, warning at others
- `resultBuilder.ts` — factor: "Multiple recent inquiries detected — apply to best-fit lender first"
- `discomfortAnalyzer.ts` — DSA coaching: "Wait 7 days between applications to avoid inquiry poisoning"
- Tests

---

## Tier 2: Seller Profile & Project Approval (New Pages, Additive)

**Scope**: 2 new pages, 7 new questions. No existing questions touched.
**Goal**: Resale cases show relevant offers only. Project-approved lender filtering.
**Prerequisite**: Tier 1 complete and verified.

### Step 2A: `sellerProfile_homeLoan` page (4 questions)

**Page showWhen**: `purchaseType == "Resale"` AND seller has running loan (from existing property_location questions OR new logic)

| #   | contextKey               | Question                                                       | Options                                                           |
| --- | ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `sellerLender`           | "Which lender is the seller's existing home loan with?"        | Dynamic — bank master list (select)                               |
| 2   | `sellerForeclosureRange` | "Approximate outstanding/foreclosure amount on seller's loan?" | UNDER_10L / 10L_TO_30L / 30L_TO_50L / 50L_TO_1CR / ABOVE_1CR      |
| 3   | `sellerCooperation`      | "How cooperative is the seller with the loan process?"         | FULLY_COOPERATIVE / MOSTLY_COOPERATIVE / RELUCTANT / UNKNOWN      |
| 4   | `transactionMechanism`   | "How will the seller's existing loan be handled?"              | TPM_AGREED / SELLER_GUARANTOR / INTERNAL_TRANSFER / NOT_DISCUSSED |

**Full-stack wiring:**

- Schema, types, payload extraction, enricher, engine (transaction complexity scoring), result builder (seller-specific factors), discomfort (DSA coaching on TPM vs guarantor), wizard sidebar, tests
- Result builder: "Seller has NBFC loan — paper release may take 45-60 days. Factor this into timeline."
- Result builder: "This lender requires seller as guarantor until registry — confirm seller agreement."

### Step 2B: `projectApproval_homeLoan` page (3 questions)

**Page showWhen**: `propertyIdentified == "Yes"` (both Direct Sale and Resale)

| #   | contextKey               | Question                                                   | Options                                                            |
| --- | ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `builderReputation`      | "How would you describe the builder/developer?"            | TIER1_REPUTED / KNOWN_LOCAL / FIRST_TIME / INDIVIDUAL_CONSTRUCTION |
| 2   | `projectApprovedLenders` | "Which lenders have approved this project?" (multi-select) | Dynamic — bank master list                                         |
| 3   | `projectCompletion`      | "Current status of the project/building?"                  | COMPLETE_OC / COMPLETE_NO_OC / PARTIAL / UNDER_CONSTRUCTION        |

**Full-stack wiring:**

- Schema, types, payload extraction, enricher, engine
- **Critical**: `projectApprovedLenders` acts as a FILTER — if provided, only lenders in this list should show offers. This is the single highest-value feature for DSAs.
- Result builder: "Only showing offers from lenders who have approved this project"
- Result builder: When builder is FIRST_TIME — "Limited lender options — first-time builder projects have fewer approvals"

---

## Tier 3: Question Merges & Graduations (Replace Binary with Graduated)

**Scope**: Replace existing binary questions with graduated alternatives. Full backward-compat required.
**Goal**: Richer risk signals from same question count.
**Prerequisite**: Tier 1 + Tier 2 complete and verified.

### Step 3A: `transactionNature` replaces `purchaseType`

- Add `transactionNature` (6 options) to `propertyTechnical_homeLoan`
- flagKey sets `purchaseType` for backward compat (all existing showWhen keeps working)
- Remove old `purchaseType` question ONLY after verifying all downstream works
- **Full checklist from Rule 11 applies** — grep all layers for `purchaseType`

### Step 3B: `titleClarity` replaces 3 binary legal questions

- Add `titleClarity` (4 graduated) to `propertyLegal_homeLoan`
- Enricher bridges: `titleClarity: CLEAR` → `ownershipChainComplete: "Yes"`, `originalDocumentsAvailable: "Yes"`, `encumbranceCertificateVerified: "Yes"`
- Keep old questions hidden (showWhen: false) until fully verified, then remove
- **Full checklist from Rule 11 applies**

### Step 3C: `legalEncumbrance` replaces 2 binary legal questions

- Add `legalEncumbrance` (4 graduated) to `propertyLegal_homeLoan`
- Enricher bridges: `legalEncumbrance: CLEAN` → `noLegalDispute: "Yes"`, `nocFromPreviousLender: "Yes"`
- Same hide-then-remove approach
- **Full checklist from Rule 11 applies**

---

## Tier 4: Applicant Stability & Advanced Credit Behavior (New Pages)

**Scope**: 2 new pages, 8 new questions. Applicant-level intelligence.
**Goal**: Profile stability and behavioral risk signals.
**Prerequisite**: Tier 1-3 complete and verified.

### Step 4A: `applicantStability_homeLoan` page (4 questions)

| #   | contextKey            | Question                                    | Options                                                                      |
| --- | --------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | `livingSituation`     | "Current living arrangement?"               | OWN_3PLUS / FAMILY_OWNED / RENTED_STABLE / RENTED_RECENT / EMPLOYER_PROVIDED |
| 2   | `employmentVintage`   | "How long in current job/business?"         | FIVE_PLUS / TWO_TO_FIVE / ONE_TO_TWO / UNDER_ONE                             |
| 3   | `incomeDocQuality`    | "ITR vs bank statement match?"              | CLEAN_MATCH / MINOR_GAP / MAJOR_MISMATCH / CASH_HEAVY                        |
| 4   | `bankingRelationship` | "Existing relationship with target lender?" | YES_SALARY / YES_OTHER / NO                                                  |

### Step 4B: `creditBehavior_homeLoan` page (4 questions)

| #   | contextKey              | Question                                    | Options                                                  |
| --- | ----------------------- | ------------------------------------------- | -------------------------------------------------------- |
| 1   | `bounceQuality`         | (move from Tier 1 location if needed)       | TECHNICAL / TIMING / GENUINE_RESOLVED / GENUINE_EXTENDED |
| 2   | `recentInquiries`       | (move from Tier 1 location if needed)       | NONE_OR_ONE / TWO_THREE / FOUR_FIVE / SIX_PLUS           |
| 3   | `debtVelocity`          | "New loans/cards in last 12 months?"        | STABLE / ONE_NEW / MULTIPLE_NEW                          |
| 4   | `familyCreditAwareness` | "Family member with loan repayment issues?" | NO_ISSUES / YES_RESOLVED / YES_ACTIVE                    |

---

## Summary

| Tier  | Questions                       | Pages Changed | Risk Level          | Prerequisite                |
| ----- | ------------------------------- | ------------- | ------------------- | --------------------------- |
| **1** | 4 new                           | 2 existing    | Low                 | Step 0 (wire existing data) |
| **2** | 7 new                           | 2 new pages   | Medium              | Tier 1 verified             |
| **3** | 3 graduated (replace ~8 binary) | 2 existing    | Higher (key merges) | Tier 2 verified             |
| **4** | 8 new                           | 2 new pages   | Medium              | Tier 3 verified             |

**Total when complete**: ~22 new/merged questions across 4 tiers, each wired end-to-end before the next.

---

_This document is the execution plan. For question design details, see `HOME-LOAN-SCHEMA-DESIGN.md`. For rules and constraints, see `CREDIT-RISK-IMPLEMENTATION-PROMPT.md`._
