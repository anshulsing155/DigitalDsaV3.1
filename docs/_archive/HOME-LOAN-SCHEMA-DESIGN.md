# ⚠️ SUPERSEDED — Do NOT use this document

> **This document is from the REVERTED 5-phase schema restructure (2026-02-23).**
> **It has been fully superseded by: `docs/HOME-LOAN-FORM-REDESIGN-SPEC.md`**
> **Use the new spec for ALL implementation work.**

---

# Home Loan Schema — Credit Risk Intelligence Design (ARCHIVED)

> **Created**: 2026-02-23 | **Status**: ~~DESIGN DOCUMENT~~ **SUPERSEDED** — see `HOME-LOAN-FORM-REDESIGN-SPEC.md`
> **Purpose**: Blueprint for adding risk intelligence questions to the Home Loan schema JSON. Read this before modifying `homeLoanSchema.json`.
> **Prerequisite**: Read `docs/CREDIT-RISK-INTELLIGENCE-SPEC.md` for full context on the 8 risk dimensions.

---

## 1. DESIGN PRINCIPLES

1. **One question = multiple risk signals** — A well-framed question with 4-6 graduated options replaces 2-3 binary questions
2. **Graduated, not binary** — Options map to risk tiers: `low` / `medium` / `high` / `very_high`
3. **All applicants are co-applicants** — No fixed "primary" role. The lender's "primary" = highest eligibility (system-determined). The form never assigns this.
4. **Per-lender scoring** — Same answer = different weight for different lenders. Options carry raw risk signals; the scoring engine interprets them per lender appetite.
5. **Context-aware flow** — showWhen logic creates adaptive paths: Resale shows seller section, Builder purchase shows project approval, BT shows track record.
6. **Never ask discriminatory questions** — Derive community/area/profile risk from profession, employer type, business type, locality. The form captures; the engine interprets.
7. **Project approval is independent from seller's lender** — The seller's running-loan lender may have banned the project. Capture both data points separately.
8. **Soft gates at high tickets** — Policy thresholds are starting points, not cliffs. The design must support "negotiable at higher ticket" signals.

---

## 2. CURRENT SCHEMA ANALYSIS

### 2.1 What Stays Untouched

| Page ID                      | Title              | Questions   | Reason                                                           |
| ---------------------------- | ------------------ | ----------- | ---------------------------------------------------------------- |
| `selection_homeLoan`         | A few checkpoints  | 2           | Credit history + compliance — already graduated (3-4 options)    |
| `property_location_homeLoan` | Property Location  | 14          | Location + BT registry flow — works well, complex showWhen logic |
| `tellUs_homeLoan`            | Applicant Details  | 0 (dynamic) | Infrastructure page for dynamic applicant rendering              |
| `incomeProfilesPage`         | Income Profiles    | 0 (dynamic) | Income type selection — the competitive moat, don't touch        |
| `incomeDetailsPage`          | Income Details     | 0 (dynamic) | Income detail capture — don't touch                              |
| `creditScorePage`            | Credit Score       | 0 (dynamic) | CIBIL score input — will be enhanced (see Section 3.6)           |
| `obligationsPage`            | Existing Loans     | 0 (dynamic) | Obligation capture — don't touch                                 |
| `finalVerification_homeLoan` | Final Verification | 3           | Auction property — niche, keep as-is                             |
| `existingLoanInfo_homeLoan`  | Existing Details   | 10          | BT/top-up existing loan — complex, working well                  |
| `loanRequirements_homeLoan`  | Loan Requirements  | 6           | BT/top-up amounts — working well                                 |
| `sanctionProfile_homeLoan`   | Your Sanction      | 5           | Unidentified property flow — working well                        |

### 2.2 What Gets Redesigned

| Page ID                      | Current Qs | Issue                                                              | Action                                                                                                         |
| ---------------------------- | ---------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `propertyTechnical_homeLoan` | 9          | `purchaseType` is binary (Direct/Resale), no marketability signals | Expand `purchaseType` to 6 options. Add 2 new questions (surroundings, building conformity). Keep 7 existing.  |
| `propertyLegal_homeLoan`     | 10         | 6 binary Yes/No questions with no gradation                        | Replace binary legal checks with 3 graduated questions. Keep seller-registration and builder-demand questions. |
| `propertyFinancial_homeLoan` | 9          | No valuation gap or cash component signals                         | Add 2 new questions (valuation assessment, cash component). Keep all 9 existing.                               |

### 2.3 What Gets Added (New Pages)

| New Page ID                   | Title                  | Shows When                                        | Questions |
| ----------------------------- | ---------------------- | ------------------------------------------------- | --------- |
| `sellerProfile_homeLoan`      | Seller & Existing Loan | Resale + seller has running loan                  | 5         |
| `projectApproval_homeLoan`    | Builder & Project      | Property identified (both Direct Sale and Resale) | 4         |
| `applicantStability_homeLoan` | Applicant Profile      | All loan types                                    | 4         |
| `creditBehavior_homeLoan`     | Credit Behavior        | All loan types, after credit score                | 4         |

---

## 3. NEW & REDESIGNED QUESTIONS

### 3.1 Property Technical — Redesigned Questions

#### Q-TECH-1: Transaction Nature (REPLACES `purchaseType`)

> **Replaces**: `q2_purchaseType` (currently 2 options: Direct Sale / Resale)

| Field                | Value                                              |
| -------------------- | -------------------------------------------------- |
| **id**               | `q_transactionNature`                              |
| **bindsTo_template** | `transactionNature`                                |
| **contextKey**       | `transactionNature`                                |
| **type**             | `radio`                                            |
| **required**         | true                                               |
| **question**         | "What is the nature of this property transaction?" |
| **showWhen**         | Same as current `q2_purchaseType`                  |

**Options (6):**

| Value                | Label                                                                | Risk Signals Captured                                                               |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `BUILDER_NEW`        | "Buying directly from builder/developer (new booking)"               | Direct sale, builder risk applies, project approval needed, clean transaction       |
| `RESALE_NO_LOAN`     | "Buying from individual owner (no existing loan on property)"        | Clean resale, title chain critical, no foreclosure complexity                       |
| `RESALE_BANK_LOAN`   | "Buying from owner who has a running loan from a bank (PSU/Private)" | Seller loan risk, bank foreclosure (standard process), TPM likely needed            |
| `RESALE_NBFC_LOAN`   | "Buying from owner who has a running loan from NBFC/HFC"             | Higher risk — NBFC papers harder to release, limited lender options, longer process |
| `ALLOTMENT_TRANSFER` | "Builder allotment/rights transfer (original allottee transferring)" | Builder must allow, additional legal checks, under-construction only                |
| `AUCTION`            | "Auction property (bank/court/authority auction)"                    | As-is basis, limited lender appetite, legal complexity                              |

**flagKey mappings:**

- `BUILDER_NEW` → `{ purchaseType: "Direct Sale", sellerHasLoan: false }`
- `RESALE_NO_LOAN` → `{ purchaseType: "Resale", sellerHasLoan: false }`
- `RESALE_BANK_LOAN` → `{ purchaseType: "Resale", sellerHasLoan: true, sellerLenderType: "BANK" }`
- `RESALE_NBFC_LOAN` → `{ purchaseType: "Resale", sellerHasLoan: true, sellerLenderType: "NBFC_HFC" }`
- `ALLOTMENT_TRANSFER` → `{ purchaseType: "Direct Sale", isAllotmentTransfer: true }`
- `AUCTION` → `{ purchaseType: "Resale", isAuctionProperty: true }`

**Risk tier mapping:**
| Value | Dim 1 (Legal) | Dim 3 (Financial) | Transaction Complexity |
|-------|---------------|-------------------|----------------------|
| `BUILDER_NEW` | low | low | low |
| `RESALE_NO_LOAN` | medium | low | low |
| `RESALE_BANK_LOAN` | medium | medium | medium |
| `RESALE_NBFC_LOAN` | medium | high | high |
| `ALLOTMENT_TRANSFER` | high | medium | high |
| `AUCTION` | very_high | high | very_high |

**Backward compatibility**: The `purchaseType` contextKey is preserved via flagKey so downstream showWhen logic in existing questions (property legal, financial pages) continues to work using `purchaseType: "Direct Sale"` or `purchaseType: "Resale"`.

---

#### Q-TECH-2: Property Surroundings (NEW)

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| **id**               | `q_propertySurroundings`                                         |
| **bindsTo_template** | `propertySurroundings`                                           |
| **contextKey**       | `propertySurroundings`                                           |
| **type**             | `radio`                                                          |
| **required**         | true                                                             |
| **question**         | "How would you describe the property's surroundings and access?" |
| **showWhen**         | `propertyAreaType != ""` (after area type is selected)           |

**Options (4):**

| Value       | Label                                                                                      | Risk Signals                                               |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `EXCELLENT` | "Well-planned colony/society with wide roads (12ft+), clear access, good infrastructure"   | High marketability, easy recovery, all lenders comfortable |
| `GOOD`      | "Established residential area with adequate road access (9-12ft), standard infrastructure" | Good marketability, most lenders OK                        |
| `MODERATE`  | "Older/dense area with motorable approach road, mixed development"                         | Moderate marketability, some lenders cautious              |
| `POOR`      | "Narrow lanes, shared/private access, or difficult approach"                               | Low marketability, recovery risk, PSU banks likely reject  |

**Dimension mapping**: Dim 2 (Technical & Marketability) — road width, access quality, area type, recovery feasibility

---

#### Q-TECH-3: Building Conformity (NEW — House/Villa only)

| Field                | Value                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| **id**               | `q_buildingConformity`                                                               |
| **bindsTo_template** | `buildingConformity`                                                                 |
| **contextKey**       | `buildingConformity`                                                                 |
| **type**             | `radio`                                                                              |
| **required**         | true                                                                                 |
| **question**         | "How does the actual construction compare to the sanctioned/approved building plan?" |
| **showWhen**         | `constructionType == "House" AND PropertyStage == "Ready To Move"`                   |

**Options (4):**

| Value              | Label                                                        | Risk Signals                                        |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------- |
| `AS_PER_PLAN`      | "Construction matches the sanctioned plan"                   | No deviations, all lenders accept                   |
| `MINOR_DEVIATIONS` | "Minor deviations (small extensions, covered balcony, etc.)" | Regularizable, most lenders accept with note        |
| `MAJOR_DEVIATIONS` | "Major deviations (additional floor, significant changes)"   | Valuation risk, many lenders reject, NBFC territory |
| `NO_PLAN`          | "No sanctioned plan exists / built without approval"         | Very high risk, only select NBFCs                   |

**Replaces**: Subsumes `q_municipalApproval` (current binary: APPROVED / PARTIAL / NO_PLAN / UNKNOWN). The new question captures the same info plus deviation severity.

**Dimension mapping**: Dim 2 (Technical & Marketability) — building conformity, valuation risk, lender acceptance

---

### 3.2 Property Legal — Redesigned Questions

#### Q-LEGAL-1: Title Clarity (REPLACES multiple binary questions)

> **Replaces**: `q_ownershipChainComplete` + `q_originalDocumentsAvailable` + `q_encumbranceCertificateVerified`

| Field                | Value                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| **id**               | `q_titleClarity`                                                       |
| **bindsTo_template** | `titleClarity`                                                         |
| **contextKey**       | `titleClarity`                                                         |
| **type**             | `radio`                                                                |
| **required**         | true                                                                   |
| **question**         | "How would you describe the property's title/ownership documentation?" |
| **showWhen**         | `(propertyIdentified == "Yes" OR loanType in [BT, BT+TU, TU])`         |

**Options (4):**

| Value               | Label                                                                                                   | Risk Signals                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `CLEAR`             | "Clear title — single/joint owner, complete chain of ownership, original documents available, clean EC" | Low risk, all lenders accept, fast processing                     |
| `MINOR_GAPS`        | "Mostly clear — complete chain but some documents are copies, or minor resolved issues in EC"           | Low-medium risk, most lenders accept with conditions              |
| `INHERITED_COMPLEX` | "Inherited / partitioned / multiple owners across generations — requires legal opinion"                 | Medium-high risk, needs legal verification, some lenders cautious |
| `DISPUTED_UNCLEAR`  | "Ongoing or past legal dispute, unclear ownership, missing documents, or government claim"              | Very high risk, most banks reject, specialized NBFCs only         |

**Dimension mapping**: Dim 1 (Legal Risk) — title clarity, ownership chain, encumbrance, document availability

---

#### Q-LEGAL-2: Legal & Encumbrance Status (REPLACES `q_noLegalDispute` + `q_nocFromPreviousLender`)

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| **id**               | `q_legalEncumbrance`                                         |
| **bindsTo_template** | `legalEncumbrance`                                           |
| **contextKey**       | `legalEncumbrance`                                           |
| **type**             | `radio`                                                      |
| **required**         | true                                                         |
| **question**         | "What is the legal and encumbrance status of this property?" |
| **showWhen**         | `titleClarity != ""`                                         |

**Options (4):**

| Value           | Label                                                                                        | Risk Signals                                      |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `CLEAN`         | "No legal disputes, no pending litigation, clean encumbrance certificate"                    | Low risk                                          |
| `RESOLVED`      | "Had minor issues in the past but all resolved — clean now"                                  | Low-medium risk, lender may ask for legal opinion |
| `PENDING_MINOR` | "Minor pending matter (municipal dues, society dispute, NOC pending from previous lender)"   | Medium risk, delays likely, some lenders reject   |
| `PENDING_MAJOR` | "Pending civil case, government dispute, revenue department matter, or bank lien unreleased" | High-very high risk, most lenders reject          |

**Dimension mapping**: Dim 1 (Legal Risk) — litigation, encumbrance, government claims

---

#### Q-LEGAL-3: Property Registration Status (KEEPS existing but enhanced for Resale)

> **Keeps**: `q_ifPropertyRegistered` — but adds contextual follow-up

The existing `q_ifPropertyRegistered` (Yes/No for resale) stays. But when the answer is "Yes", we now ask `q_lastRegistryDuration` (already exists). No change needed here.

---

### 3.3 Property Financial — New Questions

#### Q-FIN-1: Valuation Assessment (NEW)

| Field                | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **id**               | `q_valuationAssessment`                                                                       |
| **bindsTo_template** | `valuationAssessment`                                                                         |
| **contextKey**       | `valuationAssessment`                                                                         |
| **type**             | `radio`                                                                                       |
| **required**         | true                                                                                          |
| **question**         | "Based on your knowledge, how does the agreed deal value compare to the area's market rates?" |
| **showWhen**         | `(dealValue != "" OR propertyCost != "")` — after property cost/deal value is entered         |

**Options (4):**

| Value                 | Label                                                              | Risk Signals                                                |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `AT_MARKET`           | "Deal value is at or below the area's going rate per sq.ft"        | Low risk, valuation will likely match or exceed             |
| `SLIGHTLY_ABOVE`      | "Slightly above area rates (builder premium, floor premium, etc.)" | Low-medium, explainable premium                             |
| `SIGNIFICANTLY_ABOVE` | "Noticeably above area rates (15%+ premium)"                       | High risk, bank valuation will likely be lower, LTV squeeze |
| `UNSURE`              | "Not sure how it compares to area rates"                           | Neutral, bank will determine through own valuation          |

**Dimension mapping**: Dim 3 (Financial & Valuation Risk) — agreement vs valuation gap, value inflation detection

---

#### Q-FIN-2: Cash Component (NEW)

| Field                | Value                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **id**               | `q_cashComponent`                                                                                  |
| **bindsTo_template** | `cashComponent`                                                                                    |
| **contextKey**       | `cashComponent`                                                                                    |
| **type**             | `radio`                                                                                            |
| **required**         | true                                                                                               |
| **question**         | "Is any part of this transaction being settled outside the registered agreement (cash component)?" |
| **showWhen**         | `valuationAssessment != ""`                                                                        |

**Options (4):**

| Value            | Label                                                                     | Risk Signals                                               |
| ---------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `NIL`            | "No — entire amount is through banking channels and registered agreement" | Low risk, clean transaction                                |
| `MINOR`          | "Small amount (under 10% of deal value) outside agreement"                | Medium risk, common in resale, most lenders overlook       |
| `SIGNIFICANT`    | "Significant amount (10-25%) outside agreement"                           | High risk, bank valuation issues, LTV calculation affected |
| `PREFER_NOT_SAY` | "Prefer not to disclose"                                                  | Treated as medium-high by engine (conservative default)    |

**Dimension mapping**: Dim 3 (Financial & Valuation Risk) — cash component, transaction transparency, LTV accuracy

---

### 3.4 Seller Profile — New Page

**Page ID**: `sellerProfile_homeLoan`
**Title**: "Seller's Existing Loan Details"
**showWhen**: `sellerHasLoan == true` (set by Q-TECH-1 flagKey for RESALE_BANK_LOAN or RESALE_NBFC_LOAN)

#### Q-SELLER-1: Seller's Lender

| Field                | Value                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **id**               | `q_sellerLender`                                                                                                                       |
| **bindsTo_template** | `sellerLender`                                                                                                                         |
| **contextKey**       | `sellerLender`                                                                                                                         |
| **type**             | `select`                                                                                                                               |
| **required**         | true                                                                                                                                   |
| **question**         | "Which lender is the seller's existing home loan with?"                                                                                |
| **description**      | "Select the bank/NBFC where the seller's current loan is running. This determines the foreclosure process and paper release timeline." |

**Options**: Dynamic — populated from bank master list (same as `selectSingleBank` in existing loan info page).

---

#### Q-SELLER-2: Foreclosure Amount Range

| Field                | Value                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| **id**               | `q_sellerForeclosureRange`                                                     |
| **bindsTo_template** | `sellerForeclosureRange`                                                       |
| **contextKey**       | `sellerForeclosureRange`                                                       |
| **type**             | `radio`                                                                        |
| **required**         | true                                                                           |
| **question**         | "What is the approximate outstanding/foreclosure amount on the seller's loan?" |
| **showWhen**         | `sellerLender != ""`                                                           |

**Options (5):**

| Value        | Label                |
| ------------ | -------------------- |
| `UNDER_10L`  | "Under 10 Lakhs"     |
| `10L_TO_30L` | "10-30 Lakhs"        |
| `30L_TO_50L` | "30-50 Lakhs"        |
| `50L_TO_1CR` | "50 Lakhs - 1 Crore" |
| `ABOVE_1CR`  | "Above 1 Crore"      |

---

#### Q-SELLER-3: Seller Cooperation

| Field                | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| **id**               | `q_sellerCooperation`                                  |
| **bindsTo_template** | `sellerCooperation`                                    |
| **contextKey**       | `sellerCooperation`                                    |
| **type**             | `radio`                                                |
| **required**         | true                                                   |
| **question**         | "How cooperative is the seller with the loan process?" |
| **showWhen**         | `sellerForeclosureRange != ""`                         |

**Options (4):**

| Value                | Label                                                                                   | Risk Signals                     |
| -------------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| `FULLY_COOPERATIVE`  | "Fully cooperative — willing to provide all documents, attend meetings, sign as needed" | Low risk, smooth process         |
| `MOSTLY_COOPERATIVE` | "Mostly cooperative but has timeline constraints or limited availability"               | Low-medium risk                  |
| `RELUCTANT`          | "Reluctant or difficult — pushing for quick closure, hesitant on paperwork"             | Medium-high risk, process delays |
| `UNKNOWN`            | "Haven't engaged with seller on loan process yet"                                       | Neutral, risk unknown            |

**Dimension mapping**: Dim 8 (Behavioral) — seller willingness, process risk

---

#### Q-SELLER-4: Transaction Mechanism Preference

| Field                | Value                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| **id**               | `q_transactionMechanism`                                                              |
| **bindsTo_template** | `transactionMechanism`                                                                |
| **contextKey**       | `transactionMechanism`                                                                |
| **type**             | `radio`                                                                               |
| **required**         | true                                                                                  |
| **question**         | "Has there been any discussion about how the seller's existing loan will be handled?" |
| **showWhen**         | `sellerCooperation != ""`                                                             |

**Options (4):**

| Value               | Label                                                                             | Risk Signals                                    |
| ------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `TPM_AGREED`        | "Tripartite memorandum (TPM) at registrar — seller, buyer, and buyer's bank"      | Standard mechanism, most lenders prefer this    |
| `SELLER_GUARANTOR`  | "Seller will act as guarantor on buyer's loan until registry + papers in custody" | Some lenders require this, adds complexity      |
| `INTERNAL_TRANSFER` | "Seller will first do BT to buyer's chosen lender, then buyer takes loan"         | Complex, requires lender-to-lender coordination |
| `NOT_DISCUSSED`     | "Not yet discussed — need guidance"                                               | Neutral, DSA coaching opportunity               |

---

### 3.5 Project Approval — New Page

**Page ID**: `projectApproval_homeLoan`
**Title**: "Builder & Project Details"
**showWhen**: `propertyIdentified == "Yes" AND transactionNature in [BUILDER_NEW, RESALE_BANK_LOAN, RESALE_NBFC_LOAN, RESALE_NO_LOAN, ALLOTMENT_TRANSFER]`

This page shows for BOTH builder purchases AND resale — because in resale, the buyer still needs to know which lenders have approved the project.

#### Q-PROJECT-1: Builder Reputation

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| **id**               | `q_builderReputation`                                            |
| **bindsTo_template** | `builderReputation`                                              |
| **contextKey**       | `builderReputation`                                              |
| **type**             | `radio`                                                          |
| **required**         | true                                                             |
| **question**         | "How would you describe the builder/developer of this property?" |

**Options (4):**

| Value                     | Label                                                               | Risk Signals                                           |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| `TIER1_REPUTED`           | "Tier-1 / nationally known developer (Godrej, Prestige, DLF, etc.)" | Low risk, pre-approved with most lenders               |
| `KNOWN_LOCAL`             | "Known local builder with completed projects in this area"          | Low-medium risk, likely approved with regional lenders |
| `FIRST_TIME`              | "First-time builder or relatively new developer"                    | Medium-high risk, limited project approvals expected   |
| `INDIVIDUAL_CONSTRUCTION` | "Individual/self-built construction (not a developer project)"      | N/A for project approval, different legal path         |

**Dimension mapping**: Dim 3 (Financial & Valuation Risk) — builder reputation, project delivery risk

**Note**: When `INDIVIDUAL_CONSTRUCTION` is selected, Q-PROJECT-2 and Q-PROJECT-3 are hidden (no project approval concept).

---

#### Q-PROJECT-2: Approved Lenders for This Project

| Field                | Value                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **id**               | `q_projectApprovedLenders`                                                                                                                                                 |
| **bindsTo_template** | `projectApprovedLenders`                                                                                                                                                   |
| **contextKey**       | `projectApprovedLenders`                                                                                                                                                   |
| **type**             | `multiple-select`                                                                                                                                                          |
| **required**         | false                                                                                                                                                                      |
| **question**         | "Which lenders have approved this specific project/builder? (Select all that apply)"                                                                                       |
| **description**      | "Only lenders who have approved the project can provide loans here. If you're unsure, skip this — but providing this information dramatically narrows down viable offers." |
| **showWhen**         | `builderReputation != "INDIVIDUAL_CONSTRUCTION"`                                                                                                                           |

**Options**: Dynamic — populated from bank master list.

**Important note**: This is `multiple-select`, not `select`. The DSA selects all lenders that have approved this project. This is the **buyer-side lender eligibility filter** — independent from the seller's running loan lender.

---

#### Q-PROJECT-3: Project Completion Status

| Field                | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| **id**               | `q_projectCompletion`                                 |
| **bindsTo_template** | `projectCompletion`                                   |
| **contextKey**       | `projectCompletion`                                   |
| **type**             | `radio`                                               |
| **required**         | true                                                  |
| **question**         | "What is the current status of the project/building?" |
| **showWhen**         | `builderReputation != "INDIVIDUAL_CONSTRUCTION"`      |

**Options (4):**

| Value                | Label                                                 | Risk Signals                                    |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| `COMPLETE_OC`        | "Completed with OC/CC issued"                         | Low risk, full disbursement possible            |
| `COMPLETE_NO_OC`     | "Construction complete but OC/CC pending"             | Medium risk, limited lenders for BT             |
| `PARTIAL`            | "Partially complete (some phases done, some ongoing)" | Medium risk, tranche disbursement               |
| `UNDER_CONSTRUCTION` | "Under construction (active building in progress)"    | Higher risk, milestone-linked disbursement only |

---

#### Q-PROJECT-4: Seller's Lender vs Project Approval Note (Resale only)

This is NOT a form question — it's a **DSA coaching tooltip** that appears when:

- `sellerHasLoan == true` AND `projectApprovedLenders` is filled

**Display text**: "Note: The seller's current lender ({sellerLender}) may or may not be in the list of lenders currently approving this project. A lender can stop accepting new loans on a project even if they have existing loans running there."

This is rendered as a `description` on Q-PROJECT-2, not a separate question.

---

### 3.6 Applicant Stability — New Page

**Page ID**: `applicantStability_homeLoan`
**Title**: "Applicant Profile"
**showWhen**: Always shown (all loan types). Placed after applicant details pages but before financial pages.

These questions apply to ALL applicants (the form framework already handles per-applicant rendering for dynamic pages).

#### Q-STABILITY-1: Current Living Situation

| Field                | Value                                     |
| -------------------- | ----------------------------------------- |
| **id**               | `q_livingSituation`                       |
| **bindsTo_template** | `livingSituation`                         |
| **contextKey**       | `livingSituation`                         |
| **type**             | `radio`                                   |
| **required**         | true                                      |
| **question**         | "Applicant's current living arrangement?" |

**Options (5):**

| Value               | Label                                                 | Risk Signals                               |
| ------------------- | ----------------------------------------------------- | ------------------------------------------ |
| `OWN_3PLUS`         | "Owns and lives in current residence for 3+ years"    | Stability, roots, low migration risk       |
| `FAMILY_OWNED`      | "Lives in family-owned property"                      | Stable but no ownership stake              |
| `RENTED_STABLE`     | "Rented in same city for 2+ years"                    | Stable renter, moderate risk               |
| `RENTED_RECENT`     | "Rented, moved within last 2 years or multiple moves" | Frequent mover, higher risk                |
| `EMPLOYER_PROVIDED` | "Employer-provided / company accommodation"           | Dependent on job, address changes with job |

**Dimension mapping**: Dim 4 (Applicant Profile) + Dim 8 (Behavioral) — stability, migration risk, address verification, community rootedness

---

#### Q-STABILITY-2: Employment/Business Vintage

| Field                | Value                                                            |
| -------------------- | ---------------------------------------------------------------- |
| **id**               | `q_employmentVintage`                                            |
| **bindsTo_template** | `employmentVintage`                                              |
| **contextKey**       | `employmentVintage`                                              |
| **type**             | `radio`                                                          |
| **required**         | true                                                             |
| **question**         | "How long has the applicant been in their current job/business?" |

**Options (4):**

| Value         | Label                                  | Risk Signals                               |
| ------------- | -------------------------------------- | ------------------------------------------ |
| `FIVE_PLUS`   | "5+ years in same role/business"       | High stability, all lenders prefer         |
| `TWO_TO_FIVE` | "2-5 years"                            | Good stability, most lenders comfortable   |
| `ONE_TO_TWO`  | "1-2 years"                            | Medium risk, may need co-applicant support |
| `UNDER_ONE`   | "Less than 1 year or frequent changes" | High risk, limited lender options          |

**Dimension mapping**: Dim 4 (Applicant Profile) — employment stability, profession risk, income continuity

---

#### Q-STABILITY-3: Income Documentation Quality

| Field                | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| **id**               | `q_incomeDocQuality`                                                        |
| **bindsTo_template** | `incomeDocQuality`                                                          |
| **contextKey**       | `incomeDocQuality`                                                          |
| **type**             | `radio`                                                                     |
| **required**         | true                                                                        |
| **question**         | "How well does the applicant's ITR/tax filing match their bank statements?" |

**Options (4):**

| Value            | Label                                                                       | Risk Signals                                          |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| `CLEAN_MATCH`    | "ITR income matches bank deposits closely"                                  | Low risk, clean documentation                         |
| `MINOR_GAP`      | "Minor difference — bank deposits slightly higher or lower (explainable)"   | Low-medium risk, most lenders OK with explanation     |
| `MAJOR_MISMATCH` | "Significant gap — bank deposits much higher than ITR (cash income likely)" | High risk, PSU banks reject, NBFCs may use surrogates |
| `CASH_HEAVY`     | "Mostly cash-based income with limited banking trail"                       | Very high risk, only aggressive NBFCs, higher rates   |

**Dimension mapping**: Dim 5 (Income Assessment & Surrogate Risk) — documentation quality, surrogate reliance, cash flow credibility

---

#### Q-STABILITY-4: Banking Relationship

| Field                | Value                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **id**               | `q_bankingRelationship`                                                                                                     |
| **bindsTo_template** | `bankingRelationship`                                                                                                       |
| **contextKey**       | `bankingRelationship`                                                                                                       |
| **type**             | `radio`                                                                                                                     |
| **required**         | false                                                                                                                       |
| **question**         | "Does the applicant have an existing relationship (salary account, FD, credit card) with any bank they'd like a loan from?" |

**Options (3):**

| Value        | Label                                                             | Risk Signals                                                      |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `YES_SALARY` | "Yes — salary account or regular savings with a potential lender" | Strong positive, rate advantage (0.1-0.25%), higher approval odds |
| `YES_OTHER`  | "Yes — FD, credit card, or other product with a potential lender" | Moderate positive, relationship benefit                           |
| `NO`         | "No existing relationship with any target lender"                 | Neutral, standard processing                                      |

**Dimension mapping**: Dim 8 (Behavioral) — relationship depth, per-lender advantage, operational convenience

---

### 3.7 Credit Behavior — New Page

**Page ID**: `creditBehavior_homeLoan`
**Title**: "Credit Behavior"
**showWhen**: After credit score page is complete. `creditScore != ""`

#### Q-CREDIT-1: EMI Bounce Quality (for BT/top-up, enhances `emiBounceHistory`)

| Field                | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| **id**               | `q_bounceQuality`                                                    |
| **bindsTo_template** | `bounceQuality`                                                      |
| **contextKey**       | `bounceQuality`                                                      |
| **type**             | `radio`                                                              |
| **required**         | true                                                                 |
| **question**         | "If any EMI bounces have occurred, what best describes them?"        |
| **showWhen**         | `emiBounceHistory in ["1", "2", "3+"]` (only shows when bounces > 0) |

**Options (4):**

| Value              | Label                                                         | Risk Signals                           |
| ------------------ | ------------------------------------------------------------- | -------------------------------------- |
| `TECHNICAL`        | "Technical bounces (small shortfall, reversed same/next day)" | Low risk, lenders generally overlook   |
| `TIMING`           | "Timing issues (salary delayed, cleared within a few days)"   | Low-medium risk, explainable           |
| `GENUINE_RESOLVED` | "Genuine bounces but resolved within 30 days"                 | Medium risk, shows stress but recovery |
| `GENUINE_EXTENDED` | "Bounces that remained unpaid for 30+ days"                   | High risk, DPD flags on bureau         |

**Dimension mapping**: Dim 7 (CIBIL Risk) — bounce severity, repayment behavior quality

---

#### Q-CREDIT-2: Recent Loan Inquiries

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| **id**               | `q_recentInquiries`                                                                |
| **bindsTo_template** | `recentInquiries`                                                                  |
| **contextKey**       | `recentInquiries`                                                                  |
| **type**             | `radio`                                                                            |
| **required**         | true                                                                               |
| **question**         | "How many loan inquiries (hard pulls) has the applicant had in the last 6 months?" |

**Options (4):**

| Value         | Label                 | Risk Signals                                                 |
| ------------- | --------------------- | ------------------------------------------------------------ |
| `NONE_OR_ONE` | "None or 1 inquiry"   | Clean, no concern                                            |
| `TWO_THREE`   | "2-3 inquiries"       | Normal if shopping, minor flag                               |
| `FOUR_FIVE`   | "4-5 inquiries"       | Sanction shopping signal, some lenders cautious              |
| `SIX_PLUS`    | "6 or more inquiries" | Strong negative, multiple sourcing risk, many lenders reject |

**Dimension mapping**: Dim 7 (CIBIL Risk) — inquiry poisoning, sanction shopping, multiple sourcing risk

**DSA coaching output**: When `SIX_PLUS` selected, system should advise: "Apply to best-fit lender first. Wait 7 days before approaching others."

---

#### Q-CREDIT-3: Debt Accumulation Pattern

| Field                | Value                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| **id**               | `q_debtVelocity`                                                                    |
| **bindsTo_template** | `debtVelocity`                                                                      |
| **contextKey**       | `debtVelocity`                                                                      |
| **type**             | `radio`                                                                             |
| **required**         | true                                                                                |
| **question**         | "Has the applicant taken multiple new loans or credit cards in the last 12 months?" |

**Options (3):**

| Value          | Label                                         | Risk Signals                                      |
| -------------- | --------------------------------------------- | ------------------------------------------------- |
| `STABLE`       | "No new loans/cards in last 12 months"        | Stable debt profile                               |
| `ONE_NEW`      | "1 new loan or card in last 12 months"        | Normal, no concern                                |
| `MULTIPLE_NEW` | "2 or more new loans/cards in last 12 months" | Debt spiral signal, alarm bell even if FOIR is OK |

**Dimension mapping**: Dim 6 (Obligations & FOIR) + Dim 7 (CIBIL) — velocity of debt accumulation, financial stress indicators

---

#### Q-CREDIT-4: Family Credit Awareness

| Field                | Value                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **id**               | `q_familyCreditAwareness`                                                                                                       |
| **bindsTo_template** | `familyCreditAwareness`                                                                                                         |
| **contextKey**       | `familyCreditAwareness`                                                                                                         |
| **type**             | `radio`                                                                                                                         |
| **required**         | false                                                                                                                           |
| **question**         | "Is any immediate family member (spouse, parent, sibling) a co-applicant or guarantor on a loan that has had repayment issues?" |

**Options (3):**

| Value          | Label                                               | Risk Signals                                                      |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `NO_ISSUES`    | "No — no family members with loan repayment issues" | Clean, no contamination risk                                      |
| `YES_RESOLVED` | "Yes, but the issue has been fully resolved"        | Low-medium risk, may surface during verification                  |
| `YES_ACTIVE`   | "Yes, there is an active issue"                     | High risk, family contamination, affects co-applicant eligibility |

**Dimension mapping**: Dim 7 (CIBIL Risk) + Dim 8 (Behavioral) — family contamination, guilt by association

---

## 4. PAGE FLOW & SHOW-WHEN LOGIC

### 4.1 Complete Page Order (New Loan, Property Identified)

```
1. selection_homeLoan          ─ Credit history, compliance
2. property_location_homeLoan  ─ State, city, residence
3. propertyTechnical_homeLoan  ─ Type, stage, area, surroundings, conformity
                                 + Transaction nature (REPLACES purchaseType)
4. projectApproval_homeLoan    ─ [NEW] Builder reputation, approved lenders, completion
                                 Shows when: transactionNature != AUCTION, != INDIVIDUAL_CONSTRUCTION
5. tellUs_homeLoan             ─ Applicant details (dynamic)
6. incomeProfilesPage          ─ Income types (dynamic)
7. incomeDetailsPage           ─ Income details (dynamic)
8. applicantStability_homeLoan ─ [NEW] Living situation, vintage, doc quality, banking
9. creditScorePage             ─ CIBIL score (dynamic)
10. creditBehavior_homeLoan    ─ [NEW] Bounce quality, inquiries, debt velocity, family
11. obligationsPage            ─ Existing loans (dynamic)
12. propertyLegal_homeLoan     ─ Title clarity, legal status
                                 (redesigned: graduated instead of binary)
13. sellerProfile_homeLoan     ─ [NEW] Shows only when sellerHasLoan == true
                                 Seller's lender, foreclosure, cooperation, mechanism
14. propertyFinancial_homeLoan ─ Tenure, cost, downpayment, ATS
                                 + Valuation assessment, cash component [NEW]
15. finalVerification_homeLoan ─ Auction checks
16. sanctionProfile_homeLoan   ─ Sanction type (only when propertyIdentified == "No")
```

### 4.2 Conditional Page Visibility

| Page                          | Shows When                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `projectApproval_homeLoan`    | `propertyIdentified == "Yes" AND builderReputation != "INDIVIDUAL_CONSTRUCTION"` |
| `sellerProfile_homeLoan`      | `sellerHasLoan == true` (from transactionNature flagKey)                         |
| `applicantStability_homeLoan` | Always (all loan types)                                                          |
| `creditBehavior_homeLoan`     | `creditScore != ""`                                                              |
| `propertyLegal_homeLoan`      | `propertyIdentified == "Yes" OR loanType in [BT, BT+TU, TU]`                     |
| `propertyFinancial_homeLoan`  | `loanType == "New Loan" AND propertyIdentified == "Yes"`                         |

### 4.3 BT/Top-up Flow Additions

For BT/top-up, the existing flow stays largely the same. Additional pages:

- `applicantStability_homeLoan` — shows for all
- `creditBehavior_homeLoan` — shows for all
- `projectApproval_homeLoan` — shows if property identified and not individual construction
- `sellerProfile_homeLoan` — N/A for BT (the borrower IS the owner, no "seller")

---

## 5. PAYLOAD FIELD MAPPING

### 5.1 New LoanTransactionPayload Fields

| Schema Field (bindsTo)   | Payload Field            | Type       | Notes                                                                      |
| ------------------------ | ------------------------ | ---------- | -------------------------------------------------------------------------- |
| `transactionNature`      | `transactionNature`      | `string`   | One of 6 values. Also sets `purchaseType` via flagKey for backward compat. |
| `propertySurroundings`   | `propertySurroundings`   | `string`   | `EXCELLENT` / `GOOD` / `MODERATE` / `POOR`                                 |
| `buildingConformity`     | `buildingConformity`     | `string`   | `AS_PER_PLAN` / `MINOR_DEVIATIONS` / `MAJOR_DEVIATIONS` / `NO_PLAN`        |
| `titleClarity`           | `titleClarity`           | `string`   | `CLEAR` / `MINOR_GAPS` / `INHERITED_COMPLEX` / `DISPUTED_UNCLEAR`          |
| `legalEncumbrance`       | `legalEncumbrance`       | `string`   | `CLEAN` / `RESOLVED` / `PENDING_MINOR` / `PENDING_MAJOR`                   |
| `valuationAssessment`    | `valuationAssessment`    | `string`   | `AT_MARKET` / `SLIGHTLY_ABOVE` / `SIGNIFICANTLY_ABOVE` / `UNSURE`          |
| `cashComponent`          | `cashComponent`          | `string`   | `NIL` / `MINOR` / `SIGNIFICANT` / `PREFER_NOT_SAY`                         |
| `sellerLender`           | `sellerLender`           | `string`   | Bank name from master list                                                 |
| `sellerForeclosureRange` | `sellerForeclosureRange` | `string`   | Amount range enum                                                          |
| `sellerCooperation`      | `sellerCooperation`      | `string`   | Cooperation level enum                                                     |
| `transactionMechanism`   | `transactionMechanism`   | `string`   | TPM/guarantor/internal/not_discussed                                       |
| `builderReputation`      | `builderReputation`      | `string`   | `TIER1_REPUTED` / `KNOWN_LOCAL` / `FIRST_TIME` / `INDIVIDUAL_CONSTRUCTION` |
| `projectApprovedLenders` | `projectApprovedLenders` | `string[]` | Array of lender names/IDs                                                  |
| `projectCompletion`      | `projectCompletion`      | `string`   | `COMPLETE_OC` / `COMPLETE_NO_OC` / `PARTIAL` / `UNDER_CONSTRUCTION`        |

### 5.2 New ApplicantPayload Fields (Per Applicant)

| Schema Field (bindsTo)  | Payload Field           | Type     | Notes                             |
| ----------------------- | ----------------------- | -------- | --------------------------------- |
| `livingSituation`       | `livingSituation`       | `string` | 5 stability tiers                 |
| `employmentVintage`     | `employmentVintage`     | `string` | 4 vintage tiers                   |
| `incomeDocQuality`      | `incomeDocQuality`      | `string` | 4 quality tiers                   |
| `bankingRelationship`   | `bankingRelationship`   | `string` | `YES_SALARY` / `YES_OTHER` / `NO` |
| `bounceQuality`         | `bounceQuality`         | `string` | 4 severity tiers                  |
| `recentInquiries`       | `recentInquiries`       | `string` | 4 inquiry count tiers             |
| `debtVelocity`          | `debtVelocity`          | `string` | 3 velocity tiers                  |
| `familyCreditAwareness` | `familyCreditAwareness` | `string` | 3 contamination tiers             |

---

## 6. RISK DIMENSION → QUESTION MAPPING

| Dimension                                     | Questions Feeding It                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Dim 1: Property Legal**                     | `titleClarity`, `legalEncumbrance`, `transactionNature`                                                    |
| **Dim 2: Property Technical & Marketability** | `propertySurroundings`, `buildingConformity`, `propertyAreaType` (existing), `constructionType` (existing) |
| **Dim 3: Property Financial & Valuation**     | `valuationAssessment`, `cashComponent`, `builderReputation`, `transactionNature`                           |
| **Dim 4: Applicant Profile & Stability**      | `livingSituation`, `employmentVintage`, existing employment type + activity profiles                       |
| **Dim 5: Income Assessment & Surrogate**      | `incomeDocQuality`, existing income entries + financials                                                   |
| **Dim 6: Obligations & FOIR**                 | `debtVelocity`, existing obligations + EMI data                                                            |
| **Dim 7: Credit Bureau**                      | `bounceQuality`, `recentInquiries`, existing `creditScore` + `lowCreditReasons`                            |
| **Dim 8: Behavioral & Silent Rejection**      | `sellerCooperation`, `familyCreditAwareness`, `bankingRelationship`, `livingSituation`                     |
| **Seller Profile**                            | `sellerLender`, `sellerForeclosureRange`, `sellerCooperation`, `transactionMechanism`                      |
| **Project/Builder**                           | `builderReputation`, `projectApprovedLenders`, `projectCompletion`                                         |

---

## 7. PROJECT APPROVAL + SELLER LOAN DATA MODEL

### 7.1 Two Independent Data Points

```
RESALE with seller loan:
  ├── sellerLender: "HDFC Bank"              ← WHERE seller's loan is running
  ├── sellerLenderType: "BANK"               ← Derived from transactionNature
  └── projectApprovedLenders: ["SBI", "LIC HFC", "Axis Bank"]  ← WHO can fund buyer
      ↑ HDFC may NOT be in this list (banned project for new loans)
```

### 7.2 How the Engine Uses This

1. **Filter lenders**: Only lenders in `projectApprovedLenders` can make offers (if list is provided)
2. **Foreclosure logistics**: `sellerLender` + `sellerLenderType` determines:
   - Paper release timeline (bank: standard 30 days, NBFC: potentially longer)
   - TPM requirement vs guarantor vs internal transfer
   - Inter-bank relationship availability
3. **Risk scoring**: `sellerLenderType == "NBFC_HFC"` = higher transaction risk weight for most lenders
4. **DSA coaching**: If seller's lender is NOT in approved lenders list, warn DSA about the implication

### 7.3 Builder Purchase (No Seller Loan)

```
BUILDER_NEW:
  ├── sellerHasLoan: false                   ← No seller loan complexity
  └── projectApprovedLenders: ["SBI", "HDFC", "LIC HFC"]  ← WHO can fund buyer
      ↑ Only these lenders should show offers
```

---

## 8. QUESTIONS REMOVED / REPLACED

| Removed Question                            | Replaced By                             | Reason                                                                                |
| ------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- |
| `q2_purchaseType` (Direct/Resale)           | `q_transactionNature` (6 options)       | Multi-signal: captures transaction nature + seller loan + lender type in one question |
| `q_municipalApproval` (4 options)           | `q_buildingConformity` (4 options)      | Same info + deviation severity                                                        |
| `q_ownershipChainComplete` (Yes/No)         | `q_titleClarity` (4 tiers)              | Graduated version captures more nuance                                                |
| `q_originalDocumentsAvailable` (Yes/No)     | `q_titleClarity` (4 tiers)              | Folded into title assessment                                                          |
| `q_encumbranceCertificateVerified` (Yes/No) | `q_titleClarity` + `q_legalEncumbrance` | Split across two graduated questions                                                  |
| `q_noLegalDispute` (Yes/No)                 | `q_legalEncumbrance` (4 tiers)          | Graduated legal status                                                                |
| `q_nocFromPreviousLender` (Yes/No/N/A)      | `q_legalEncumbrance` (4 tiers)          | Folded into encumbrance assessment                                                    |
| `q_auctionedProperty` (Yes/No)              | `q_transactionNature` option `AUCTION`  | Folded into transaction nature                                                        |
| `q_understandsAsIsBasis` (Yes/No)           | Removed — DSA coaching output instead   | System informs DSA, not a form question                                               |
| `q_loanForAuctionPayment` (Yes/No)          | Removed — all auction loans need this   | Redundant when auction is selected                                                    |

**Net change**: -10 binary questions, +17 graduated questions = net +7 questions but dramatically more risk signal capture.

---

## 9. IMPLEMENTATION CHECKLIST (for JSON session)

### Phase 1: Schema JSON Changes

- [ ] Add `transactionNature` question to `propertyTechnical_homeLoan` (replaces `purchaseType`)
- [ ] Add `propertySurroundings` question to `propertyTechnical_homeLoan`
- [ ] Add `buildingConformity` question to `propertyTechnical_homeLoan` (replaces `municipalApproval`)
- [ ] Redesign `propertyLegal_homeLoan` with `titleClarity` and `legalEncumbrance`
- [ ] Add `valuationAssessment` and `cashComponent` to `propertyFinancial_homeLoan`
- [ ] Create `sellerProfile_homeLoan` page with 4 questions
- [ ] Create `projectApproval_homeLoan` page with 3 questions + coaching tooltip
- [ ] Create `applicantStability_homeLoan` page with 4 questions
- [ ] Create `creditBehavior_homeLoan` page with 4 questions
- [ ] Remove replaced questions (see Section 8)
- [ ] Update all showWhen conditions that reference `purchaseType` to use flagKey compatibility
- [ ] Verify page order in the JSON pages array

### Phase 2: Payload Builder Changes

- [ ] Add 14 new fields to `LoanTransactionPayload` in `types.ts`
- [ ] Add 8 new fields to `ApplicantPayload` in `types.ts`
- [ ] Add extraction logic in `loanTransaction.ts` for new loan-level fields
- [ ] Add extraction logic in `applicantPayload.ts` for new applicant-level fields
- [ ] Add `projectApprovedLenders` array handling (multi-select → string[])

### Phase 3: Rule Engine Wiring

- [ ] New fields automatically available via JSON-Logic `var` paths
- [ ] Add risk classification logic in Stage 2.5 (future)
- [ ] Add risk appetite scoring in Stage 9.5 (future)

### Phase 4: Testing

- [ ] Update test fixtures with new field values
- [ ] Add integration tests for new showWhen conditions
- [ ] Verify backward compatibility (existing `purchaseType` references still work via flagKey)
- [ ] Type check: `pnpm run check`
- [ ] Full test suite: `pnpm run test:unit`

---

_Last updated: 2026-02-23 — Schema design document complete. Ready for JSON implementation._
