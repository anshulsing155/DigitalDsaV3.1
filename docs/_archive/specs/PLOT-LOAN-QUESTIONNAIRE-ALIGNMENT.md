# Plot Loan Questionnaire Alignment — Implementation Spec

> **Created**: 2026-03-12 (Session 21/22 handover)
> **Status**: Ready for implementation
> **Approach**: Clone Home Loan property pages, adapt for vacant land context (same as LAP alignment)
> **Reference**: LAP alignment commit `fd75574f`, Home Loan baseline `homeLoanSchemaV2.json`

---

## 1. Plot Loan Categories in India

### 1A. By Loan Structure (what the money covers)

| Structure                           | Description                                           | Tenure          | Tax Benefits                              |
| ----------------------------------- | ----------------------------------------------------- | --------------- | ----------------------------------------- |
| **Pure Plot Loan**                  | Land purchase only                                    | 10-15 years max | NONE until house is built on the plot     |
| **Plot + Construction (Composite)** | Land purchase + house construction                    | Up to 30 years  | Full home loan benefits post-construction |
| **Construction Only**               | Applicant already owns plot, needs construction money | Up to 20 years  | Full benefits                             |
| **Plot + Equity**                   | Plot purchase + additional funds                      | 10-15 years     | Partial                                   |

**Current schema captures this** via `PlotLoanActivity` and `loanType` options.

### 1B. By Source / Seller Type (who is selling the plot)

| Source                                                                                 | Bank Comfort                        | Currently Captured?                                 |
| -------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------- |
| **Development Authority allotment** (DDA, HUDA, BDA, MHADA, HMDA, JDA, LDA)            | Highest — near-universal acceptance | **NO** — critical gap                               |
| **RERA-registered developer project** (township, gated community, plotted development) | High                                | **NO**                                              |
| **Approved private layout** (approved by municipal/planning authority)                 | Moderate-High                       | **NO**                                              |
| **Revenue layout / Revenue site** (formed on unconverted agricultural land)            | Very Low — most banks refuse        | **NO**                                              |
| **Resale from individual**                                                             | Moderate                            | Partially — `purchaseType` has Direct Sale / Resale |
| **Inherited / Gifted plot**                                                            | Moderate                            | **NO**                                              |
| **Unauthorized colony**                                                                | Banks won't lend                    | **NO** — should be a red flag gate                  |

**This is the #1 eligibility filter for plot loans — the current schema completely misses it.** Adding `plotSource` is the single most important new question.

### 1C. By Land Classification

| Classification                                            | Financeable?                                   | Currently Captured?           |
| --------------------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| **Residential (NA converted or always non-agricultural)** | Yes — widely available                         | **NO** — not explicitly asked |
| **Commercial**                                            | Select lenders, higher rates                   | **NO**                        |
| **Agricultural (unconverted)**                            | Not by standard banks — only agri-lending arms | **NO**                        |
| **Industrial (MIDC/GIDC)**                                | Treated as project/business loan               | **NO**                        |
| **Mixed use**                                             | Limited                                        | **NO**                        |

**Critical gap**: No land use classification exists. Agricultural land is unfinanceable through standard channels — this must be asked upfront.

### 1D. Special Scenarios

| Scenario                                 | Key Considerations                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **NRI plot purchase**                    | FEMA restrictions: cannot buy agricultural/plantation/farmhouse. GPA needed. NRE/NRO/FCNR repayment only |
| **Authority allotment**                  | Allotment letter + possession letter sufficient. Infrastructure guaranteed                               |
| **Revenue site**                         | Formed without planning authority approval. Most banks refuse. High risk of demolition                   |
| **Converted land (Agri → NA)**           | NA Sanad/order required before any bank will consider. Conversion charges apply                          |
| **Composite loan (Plot + Construction)** | Requires approved building plan, cost estimation. Disbursement in stages                                 |
| **Construction timeline mandate**        | Banks require construction within 2-5 years. Failure → rate increase or loan recall                      |

---

## 2. Current Schema State (BEFORE)

### Structure: 9 pages, 1 property page

| Page                     | Questions | Issues                                     |
| ------------------------ | --------- | ------------------------------------------ |
| `propertyIdentification` | 14        | ALL property questions crammed into 1 page |
| `tellUsApplyingPage`     | 0         | Dynamic applicant pages                    |
| `applicantProfilePage`   | 0         | Dynamic                                    |
| `incomeProfilesPage`     | 0         | Dynamic                                    |
| `incomeDetailsPage`      | 0         | Dynamic                                    |
| `creditScorePage`        | 0         | Dynamic                                    |
| `obligationsPage`        | 0         | Dynamic                                    |
| `existingDetailsPage`    | 2         | Existing loan details                      |
| `loanRequirementPage`    | 11        | Loan amount, cost, deposit                 |

### Current Property Questions (14 questions, 1 page)

| #   | bindsTo                    | Type          | Issue                                                                   |
| --- | -------------------------- | ------------- | ----------------------------------------------------------------------- |
| 1   | `creditHistoryStatus`      | radio         | OK — keep as-is                                                         |
| 2   | `propertyComplianceStatus` | radio         | **REPLACE** — generic 3-option, needs 5 area-type variants              |
| 3   | `propertyAreaType`         | select        | OK — keep, already has 5 area types                                     |
| 4   | `propertyType`             | radio         | OK — ownership (freehold/leasehold)                                     |
| 5   | `purchaseType`             | radio         | **REPLACE** — only has Direct Sale/Resale, needs plot source            |
| 6   | `propertyAge`              | select        | **ADAPT** — means "when was plot first sold/allotted", not building age |
| 7   | `ifPropertyRegistered`     | radio         | OK — keep                                                               |
| 8   | `PlotArea`                 | text          | OK — keep                                                               |
| 9   | `propertyStateName`        | select        | OK — move to identification page                                        |
| 10  | `propertyCityName`         | derivedSelect | OK — move to identification page                                        |
| 11  | `propertyPincode`          | text          | OK — move to identification page                                        |
| 12  | `residenceStateName`       | select        | OK — move to identification page                                        |
| 13  | `residenceCityName`        | derivedSelect | OK — move to identification page                                        |
| 14  | `residencePincode`         | text          | OK — move to identification page                                        |

### Wizard Sections References Ghost Page

The wizard config references `sellerInformation` page which **does not exist** in the schema. This subsection renders empty.

---

## 3. Proposed Schema (AFTER)

### Structure: 15 pages, 6 property pages (aligned with LAP + construction page)

| Page                         | Questions | Description                                                                                                                                                           |
| ---------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `propertyIdentificationPage` | 6         | State/city/pincode for property + residence                                                                                                                           |
| `propertyLocation_Plot`      | 3         | Area type + special restriction + land use classification                                                                                                             |
| `propertyCharacter_Plot`     | 7         | Plot source, ownership, lease, plot age, plot area, boundary, access road                                                                                             |
| `constructionDetails_Plot`   | ~7        | **Conditional** — only for Plot+Construction / Construction Only. Construction type, plan approval, progress, built area, OC/CC, municipal approval, constructor type |
| `propertyCondition_Plot`     | ~16       | Area-type-specific compliance + NA conversion + revenue records + zone + RERA                                                                                         |
| `propertyLegal_Plot`         | 9         | Acquisition method, succession, title chain, encumbrance, disputes, EC, registration                                                                                  |
| `tellUsApplyingPage`         | 0         | (unchanged)                                                                                                                                                           |
| `applicantProfilePage`       | 0         | (unchanged)                                                                                                                                                           |
| `incomeProfilesPage`         | 0         | (unchanged)                                                                                                                                                           |
| `incomeDetailsPage`          | 0         | (unchanged)                                                                                                                                                           |
| `creditScorePage`            | 0         | (unchanged)                                                                                                                                                           |
| `obligationsPage`            | 0         | (unchanged)                                                                                                                                                           |
| `existingDetailsPage`        | 2         | (unchanged)                                                                                                                                                           |
| `loanRequirementPage`        | 11+       | (unchanged, possibly add construction timeline)                                                                                                                       |
| `creditHistoryPage`          | 1         | creditHistoryStatus (moved from propertyIdentification)                                                                                                               |

**Note**: `constructionDetails_Plot` entire page is conditionally visible — only shows when `loanType in ["Plot & Construction Loan", "Construction Loan Only"]` or when BT borrower indicates construction is ongoing/completed. For pure `Plot Loan Only` and `Plot & Equity Loan`, this page is skipped entirely.

---

## 4. Page-by-Page Design

### Page 1: `propertyIdentificationPage` (6 questions — cloned from LAP)

Same as LAP — state/city/pincode for both property and residence.

| #   | bindsTo              | Type          | Source         |
| --- | -------------------- | ------------- | -------------- |
| 1   | `propertyStateName`  | select        | Clone from LAP |
| 2   | `propertyCityName`   | derivedSelect | Clone from LAP |
| 3   | `propertyPincode`    | text          | Clone from LAP |
| 4   | `residenceStateName` | select        | Clone from LAP |
| 5   | `residenceCityName`  | derivedSelect | Clone from LAP |
| 6   | `residencePincode`   | text          | Clone from LAP |

### Page 2: `propertyLocation_Plot` (3 questions — cloned from LAP + 1 new)

| #   | bindsTo                  | Type   | Source         | Notes                                                                |
| --- | ------------------------ | ------ | -------------- | -------------------------------------------------------------------- |
| 1   | `propertyAreaType`       | select | Clone from LAP | 5 area types (planned, colony, converted, village, mixed)            |
| 2   | `specialAreaRestriction` | select | Clone from LAP | CRZ, cantonment, tribal, green belt, flood zone, eco-sensitive, none |
| 3   | `landUseClassification`  | radio  | **NEW**        | Residential / Commercial / Agricultural / Industrial / Mixed Use     |

**`landUseClassification`** is critical:

- **Agricultural** → show warning: "Agricultural land cannot be financed through standard bank loans. NA conversion must be completed first."
- **Industrial** → show warning: "Industrial plot financing is handled as a project/business loan by most lenders."
- Gates downstream questions (NA conversion relevant only for agricultural/converted)

### Page 3: `propertyCharacter_Plot` (7 questions)

| #   | bindsTo                | Type   | Source                      | Notes                                                                                                              |
| --- | ---------------------- | ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `plotSource`           | radio  | **NEW**                     | Authority allotment / Developer project (RERA) / Approved private layout / Revenue site / Individual resale        |
| 2   | `developmentAuthority` | select | **NEW**                     | DDA, HUDA, BDA, MHADA, HMDA, JDA, LDA, BIAPPA, DTCP, Other. Show when `plotSource == "authority_allotment"`        |
| 3   | `propertyType`         | radio  | Keep from current           | Freehold / Leasehold                                                                                               |
| 4   | `leaseRemainingPeriod` | select | Clone from LAP              | Show when leasehold                                                                                                |
| 5   | `plotAge`              | select | Adapt current `propertyAge` | "When was this plot first allotted/sold?" — ranges: 0-5yr, 5-10yr, 10-20yr, 20-30yr, 30+yr                         |
| 6   | `PlotArea`             | text   | Keep from current           | Total plot area (sq ft / sq mt / sq yd)                                                                            |
| 7   | `plotBoundaryStatus`   | radio  | **NEW**                     | Clear demarcation with boundary stones / Partially demarcated / No clear boundaries / Compound wall/fencing exists |

**`plotSource`** warnings:

- **Revenue site** → "Revenue layout plots are formed without planning authority approval. Most nationalised banks refuse to finance revenue sites. Processing will proceed but lender options may be severely limited."
- **Authority allotment** → highest acceptance, simplest documentation

**`plotBoundaryStatus`** warning:

- **No clear boundaries** → "Banks require clear boundary demarcation for physical verification. This may delay or prevent loan approval."

### Page 4: `propertyCondition_Plot` (~16 questions)

#### Area-type-specific compliance (5 variants — same pattern as LAP, adapted for land)

| #   | bindsTo                    | showWhen                                 | Question                                                                                                         |
| --- | -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | `propertyComplianceStatus` | `propertyAreaType == "planned_approved"` | "Is this plot in an approved layout with development authority / municipal corporation approval?"                |
| 2   | `propertyComplianceStatus` | `propertyAreaType == "converted_land"`   | "Has this plot been fully converted from agricultural to non-agricultural (NA) use with valid conversion order?" |
| 3   | `propertyComplianceStatus` | `propertyAreaType == "municipal_area"`   | "Is this plot within municipal corporation limits with proper layout approval and building permission zone?"     |
| 4   | `propertyComplianceStatus` | `propertyAreaType == "colony"`           | "Is this colony authorized by the development authority? Has the layout been approved?"                          |
| 5   | `propertyComplianceStatus` | `propertyAreaType == "unknown"`          | "Is the plot's legal status clear — does it have any form of government/municipal approval?"                     |

#### Land-specific compliance questions

| #   | bindsTo                      | Type  | Notes                                                                                                                                                                                             |
| --- | ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | `naConversionStatus`         | radio | Fully converted (NA Sanad obtained) / Conversion in progress / Not converted (still agricultural) / Not applicable (always non-agricultural). Show for all, critical for converted_land area type |
| 7   | `revenueRecordStatus`        | radio | Updated in applicant's name / Updated in seller's name / Mutation pending / Records unclear. Always relevant for plot loans                                                                       |
| 8   | `layoutApprovalStatus`       | radio | **NEW** — Approved by planning authority / Approved by development authority / Revenue layout (no planning approval) / Approval status unknown                                                    |
| 9   | `zoneClassification`         | radio | Clone from LAP — Residential zone / Commercial zone / Mixed use / Agricultural zone / Industrial zone / Green belt / Other restricted                                                             |
| 10  | `reraRegistrationStatus`     | radio | Clone from LAP — RERA registered / RERA not applicable / RERA status unknown. Show when `plotSource in ["developer_project"]`                                                                     |
| 11  | `municipalTaxStatus`         | radio | Clone from LAP — Taxes paid up to date / Taxes in arrears / Not applicable                                                                                                                        |
| 12  | `accessRoadStatus`           | radio | **NEW** — Public road (12ft+ wide) / Shared/private road / Narrow lane (<12ft) / No proper road access                                                                                            |
| 13  | `developmentStatus`          | radio | **NEW** — Fully developed (water, electricity, drainage) / Partially developed / Undeveloped / Under development                                                                                  |
| 14  | `unauthorizedAdditions`      | radio | Clone from LAP — No unauthorized structures / Minor additions exist / Significant unauthorized construction. Relevant if any temporary structures exist on the plot                               |
| 15  | `colonyRegularizationStatus` | radio | Clone from LAP — Show when `propertyAreaType in ["colony"]`                                                                                                                                       |
| 16  | `gramPanchayatPermission`    | radio | Clone from LAP — Show when `propertyAreaType in ["converted_land", "unknown"]`                                                                                                                    |

### Page 5: `propertyLegal_Plot` (9 questions)

| #   | bindsTo                          | Type  | Source            | Notes                                                                                                                   |
| --- | -------------------------------- | ----- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | `propertyAcquisitionMethod`      | radio | Clone from LAP    | Self-purchased / Inherited / Gift / Family partition / GPA transfer                                                     |
| 2   | `successionStatus`               | radio | Clone from LAP    | Show when inherited/gift/partition                                                                                      |
| 3   | `originalDocumentsAvailable`     | radio | Clone from LAP    | All originals available / Some missing / None available                                                                 |
| 4   | `ownershipChainComplete`         | radio | Clone from LAP    | Continuous chain 30+ years / Chain has gaps / Unknown                                                                   |
| 5   | `existingEncumbrance`            | radio | Clone from LAP    | No existing mortgage / Existing mortgage (BT) / Multiple encumbrances                                                   |
| 6   | `noLegalDispute`                 | radio | Clone from LAP    | No disputes / Pending litigation / Dispute resolved                                                                     |
| 7   | `encumbranceCertificateVerified` | radio | Clone from LAP    | EC obtained / EC not yet obtained / EC has entries                                                                      |
| 8   | `ifPropertyRegistered`           | radio | Keep from current | Is sale deed / agreement registered?                                                                                    |
| 9   | `constructionTimeline`           | radio | **NEW**           | Within 1 year / 1-3 years / 3-5 years / No immediate plans. Banks mandate construction within 2-5 years of disbursement |

**`constructionTimeline`** warning:

- **No immediate plans** → "Most banks require construction to begin within 2-3 years of plot loan disbursement. Failure may result in interest rate increase or loan recall."

---

## 5. CRITICAL: Conditional Construction Questions (Plot + Construction / Construction Only)

### The Problem

The Plot loan form supports **5 loan types**:

- `Plot Loan Only` — pure land purchase, **no construction**
- `Plot & Construction Loan` — land + build house = **essentially a Home Loan**
- `Construction Loan Only` — already owns plot, needs to build = **definitely a Home Loan**
- `Plot & Equity Loan` — plot + extra funds, **no construction**
- `Plot Balance Transfer` — refinancing, **construction status depends on original loan**

**For `Plot & Construction` and `Construction Only`, the lender assesses TWO things**: the land AND the proposed building. These loan types are essentially home loans where the land purchase comes first.

### Design Rule: Conditional, Not Removed

Construction-related questions must be **CONDITIONALLY SHOWN** when `loanType in ["Plot & Construction Loan", "Construction Loan Only"]`, NOT blanket removed. The following questions should appear on `propertyCharacter_Plot` or a new `constructionDetails_Plot` page when construction is involved:

### Construction Questions (show when `loanType in ["Plot & Construction Loan", "Construction Loan Only"]`)

| #   | bindsTo                      | Type  | Source               | Notes                                                                                                     |
| --- | ---------------------------- | ----- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `constructionType`           | radio | Clone from Home Loan | Independent House / Villa / Row House / Farm House. Filtered for plot context (no apartment/flat)         |
| 2   | `constructionApprovalStatus` | radio | **NEW**              | Approved building plan obtained / Plan submitted, pending approval / No building plan yet                 |
| 3   | `constructionProgress`       | radio | Clone from Home Loan | Not started / Foundation / Plinth / Superstructure / Finishing / Completed. Show for ongoing construction |
| 4   | `builtArea`                  | text  | Clone from Home Loan | Planned/actual built-up area in sq ft                                                                     |
| 5   | `ocCcAvailable`              | radio | Clone from Home Loan | Show when `constructionProgress == "completed"`. OC/CC obtained?                                          |
| 6   | `municipalApproval`          | radio | Clone from Home Loan | Building plan approved by municipal authority?                                                            |
| 7   | `constructorType`            | radio | **NEW**              | Self-construction / Licensed contractor / Builder. Affects documentation flow                             |

### BT/Top-up with Construction

For `Plot Balance Transfer` where the original loan was a composite, the current construction status matters:

| #   | bindsTo                | showWhen                                      | Question                                                                                           |
| --- | ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `btConstructionStatus` | `PlotLoanActivity == "Balance Transfer Only"` | "What is the current status of construction on this plot?" — Not started / In progress / Completed |
| 2   | `constructionProgress` | `btConstructionStatus == "in_progress"`       | Construction stage (foundation/plinth/etc.)                                                        |
| 3   | `ocCcAvailable`        | `btConstructionStatus == "completed"`         | OC/CC status                                                                                       |

### Questions ALWAYS REMOVED (not applicable regardless of loan type)

| Question                                                                | Why Removed                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `categoryOfProperty` (residential/commercial/industrial/mixed)          | Replaced by `landUseClassification` at location level                   |
| `PropertyStage` (under construction / ready to move)                    | Not applicable — plot stage is different from home stage                |
| `purchaseType` (direct_from_authority/resale_normal/resale_endorsement) | Replaced by `plotSource` with plot-specific options                     |
| `typeOfOccupationProperty` (self-occupied/vacant/rented)                | Plot is vacant by definition (unless BT with completed construction)    |
| `rentalIncome` / `rentalAgreementType`                                  | Not applicable for new plot purchases                                   |
| Builder-related questions (builder track record, project approvals)     | Replaced by `constructorType` + `constructionApprovalStatus`            |
| Seller-related questions (seller on loan, seller ownership type)        | Replaced by acquisition method + plot source                            |
| `carpetArea`                                                            | Use `builtArea` conditionally for construction types, `PlotArea` always |
| `propertyAge` in building sense                                         | Adapted to `plotAge` (when plot was first allotted/sold)                |

---

## 6. NEW Questions (Plot-Specific, No Home Loan Equivalent)

### Always Shown (all plot loan types)

| bindsTo                 | Why Needed                                                                | Priority |
| ----------------------- | ------------------------------------------------------------------------- | -------- |
| `landUseClassification` | #1 eligibility gate — agricultural = no loan                              | CRITICAL |
| `plotSource`            | #2 eligibility filter — authority/developer/layout/revenue/individual     | CRITICAL |
| `developmentAuthority`  | Which authority allotted (DDA/HUDA/BDA etc.) — if authority allotment     | HIGH     |
| `constructionTimeline`  | Banks mandate construction within 2-5 years (show for Plot Only / Equity) | HIGH     |
| `plotBoundaryStatus`    | Physical verification requirement                                         | HIGH     |
| `accessRoadStatus`      | Bank physical assessment, affects valuation                               | HIGH     |
| `layoutApprovalStatus`  | Layout approval type determines financeability                            | HIGH     |
| `developmentStatus`     | Infrastructure availability affects valuation                             | MEDIUM   |

### Conditional — Construction Types Only (`loanType in ["Plot & Construction Loan", "Construction Loan Only"]`)

| bindsTo                      | Why Needed                                                                | Priority       |
| ---------------------------- | ------------------------------------------------------------------------- | -------------- |
| `constructionApprovalStatus` | Building plan approval status                                             | HIGH           |
| `constructorType`            | Self-construction / Licensed contractor / Builder — affects documentation | HIGH           |
| `btConstructionStatus`       | Current construction status for BT loans                                  | HIGH (BT only) |

**Note**: `constructionType`, `constructionProgress`, `builtArea`, `ocCcAvailable`, `municipalApproval` are **cloned from Home Loan** (not new) but conditionally shown.

---

## 7. Wizard Sections (AFTER)

```
getting-started
  ├─ plot-identification     → propertyIdentificationPage
  │                            (creditHistoryPage — moved here or separate)
property
  ├─ area-type               → propertyLocation_Plot
  ├─ plot-character          → propertyCharacter_Plot
  ├─ construction            → constructionDetails_Plot  ← CONDITIONAL (Plot+Construction / Construction Only)
  ├─ condition-compliance    → propertyCondition_Plot
  └─ legal                   → propertyLegal_Plot
applicants
  ├─ whos-applying           → tellUsApplyingPage (step 0)
  ├─ relationships           → tellUsApplyingPage (step 1)
  └─ profile-financials      → tellUsApplyingPage (step 2)
profile-financial (single applicant)
  ├─ applicant-profile       → applicantProfilePage
  ├─ employment-income       → incomeProfilesPage
  ├─ income-details          → incomeDetailsPage
  ├─ credit-behaviour        → creditScorePage
  └─ credit-history          → obligationsPage
loan-details
  ├─ existing-loans          → existingDetailsPage
  └─ amount-terms            → loanRequirementPage
```

Note: Remove the ghost `sellerInformation` subsection — it references a page that doesn't exist.

---

## 8. Key Differences: Plot vs LAP vs Home Loan

| Aspect                      | Home Loan           | LAP                  | Plot Only                   | Plot + Construction           |
| --------------------------- | ------------------- | -------------------- | --------------------------- | ----------------------------- |
| **What's assessed**         | Building/flat       | Existing building    | **Vacant land**             | **Land + proposed building**  |
| **Construction questions**  | Yes (always)        | No                   | **No**                      | **Yes (conditional)**         |
| **OC/CC**                   | Yes                 | Yes                  | **No**                      | **Yes (when completed)**      |
| **Built-up area**           | Yes                 | Yes                  | **Plot area only**          | **Plot area + built-up area** |
| **Land use classification** | Assumed residential | `categoryOfProperty` | **`landUseClassification`** | **`landUseClassification`**   |
| **Plot source**             | N/A                 | N/A                  | **NEW**                     | **NEW**                       |
| **NA conversion**           | Rarely relevant     | Sometimes            | **Often critical**          | **Often critical**            |
| **Construction timeline**   | N/A                 | N/A                  | **Bank mandate**            | **Part of loan**              |
| **Revenue records**         | For village areas   | For village areas    | **Always needed**           | **Always needed**             |
| **Compliance focus**        | Building            | Building             | **Land only**               | **Land + building**           |
| **LTV**                     | Up to 90%           | 50-70%               | **70-80%**                  | **Up to 85%**                 |
| **Tenure**                  | Up to 30 years      | Up to 15 years       | **10-15 years**             | **Up to 30 years**            |
| **Tax benefits**            | Full                | Full                 | **None**                    | **Full (post-construction)**  |

**Key insight**: Plot + Construction Loan and Construction Only are essentially **home loans with a land-first step**. The questionnaire must handle both the land assessment AND the construction assessment conditionally based on `loanType`. BT of composite loans also needs current construction status.

---

## 9. Implementation Checklist

### Phase 1: Schema Build

- [ ] Write Node.js `.cjs` script to clone from LAP/Home Loan
- [ ] Build 6 property pages (identification, location, character, **construction**, condition, legal)
- [ ] Add all new plot-specific questions with `bindsTo_template` and `showWhen`
- [ ] `constructionDetails_Plot` page: conditional on `loanType in ["Plot & Construction Loan", "Construction Loan Only"]`
- [ ] Construction questions gated on loanType: `constructionType`, `constructionProgress`, `builtArea`, `ocCcAvailable`, `municipalApproval`, `constructionApprovalStatus`, `constructorType`
- [ ] BT construction status questions: `btConstructionStatus` gated on `PlotLoanActivity == "Balance Transfer Only"`
- [ ] Wire `creditHistoryStatus` (move to its own page or keep on identification)
- [ ] Preserve non-property pages (applicant, income, credit, obligations, loan details)
- [ ] Write to `src/lib/config/plot-loan-schema.json`
- [ ] Sync to `src/lib/server/formEngine/schemas/plot-loan-schema.json`

### Phase 2: Wizard Sections

- [ ] Rewrite `src/lib/config/wizardSections/plotLoan.ts`
- [ ] Add property section with 5 subsections (area-type, character, **construction**, condition, legal)
- [ ] Construction subsection conditionally shown via `showWhen` on `loanType`
- [ ] Remove ghost `sellerInformation` subsection
- [ ] Update DSA guidance text for plot-specific context
- [ ] Update `src/lib/utils/payloadGrouping.ts`

### Phase 3: Verification

- [ ] `pnpm run check` — 0 errors
- [ ] Server/client schema match verification
- [ ] Preview server — no runtime errors
- [ ] Walk through form pages visually

---

## 10. Common Plot Loan Rejection Reasons (DSA Guidance Context)

These should inform the `watchFor` and warning messages in the questionnaire:

| Rejection Reason                                    | Frequency   | Where to Flag                                              |
| --------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| Plot outside municipal/development authority limits | Very Common | `propertyAreaType` + `layoutApprovalStatus`                |
| Agricultural land without NA conversion             | Very Common | `landUseClassification` + `naConversionStatus`             |
| Unclear title chain / disputed ownership            | Very Common | `ownershipChainComplete` + `noLegalDispute`                |
| Unauthorized colony / unapproved layout             | Common      | `plotSource` (revenue site) + `colonyRegularizationStatus` |
| Low credit score (below 650-700)                    | Common      | creditScorePage                                            |
| Inadequate income / high FOIR                       | Common      | Income assessment                                          |
| Plot in CRZ / green belt / restricted zone          | Moderate    | `specialAreaRestriction`                                   |
| No proper access road                               | Moderate    | `accessRoadStatus`                                         |
| Encumbrances on property                            | Moderate    | `existingEncumbrance`                                      |
| Valuation gap (bank value << sale price)            | Moderate    | Post-assessment                                            |

---

## 11. Revenue Records by State (Reference for Future)

For DSA guidance context — state-specific revenue document names:

| State            | Key Document                       | Purpose                                      |
| ---------------- | ---------------------------------- | -------------------------------------------- |
| Maharashtra      | 7/12 Extract (Saatbara Utara) + 8A | Ownership, land use, encumbrances, mutations |
| Karnataka        | Khata Extract + RTC                | Ownership + land classification              |
| Tamil Nadu       | Patta (Chitta) + A-Register        | Ownership proof                              |
| AP / Telangana   | Pahani / Adangal + 1B              | Ownership + land use                         |
| Rajasthan        | Jamabandi + Khasra/Khatauni        | Revenue records                              |
| Gujarat          | 7/12 Extract + Village Form 6      | Ownership + mutation                         |
| UP / Bihar       | Khatauni + Khasra                  | Revenue records                              |
| Kerala           | Thandapper Extract                 | Property tax/ownership                       |
| Punjab / Haryana | Jamabandi + Fard                   | Revenue records                              |

This may be useful for a future DSA guidance enhancement that shows state-specific document requirements.

---

## 12. NRI Plot Loan Specifics

| Parameter                | Restriction                                                |
| ------------------------ | ---------------------------------------------------------- |
| **Cannot purchase**      | Agricultural land, plantation land, farmhouse plots (FEMA) |
| **LTV**                  | Up to 80% (some banks cap at ₹75L)                         |
| **Repayment**            | Must be through NRE, NRO, or FCNR accounts                 |
| **GPA required**         | For local representative to handle transactions            |
| **Construction mandate** | Must construct within 5 years                              |
| **Maximum properties**   | 2 residential properties (some interpretations)            |

Current form already handles NRI via `ApplicantIsNRI` — the FEMA warning from AgreeModal will fire. No additional NRI-specific plot questions needed beyond existing infrastructure.

---

## 13. Balance Transfer & Top-Up for Plot Loans

**Balance Transfer**: Less common than home loan BT but available. Current `existingDetailsPage` already captures `principalOutstanding` and `bankName` — sufficient for BT assessment.

**Top-Up**: Most common for construction on the plot. Current schema handles top-up flow adequately.

No additional questions needed for BT/top-up scenarios — existing infrastructure is sufficient.
