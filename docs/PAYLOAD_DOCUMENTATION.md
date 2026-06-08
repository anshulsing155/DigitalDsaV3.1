# Loan Application Payload Documentation

This document explains every field in the loan application payload that gets sent to the bank calculation API. Each field is explained in simple terms for easy understanding.

> **Related docs:**
> - [Quick Reference](PAYLOAD-QUICK-REFERENCE.md) — Field lookup cheat sheet
> - [Enricher Spec](PAYLOAD-ENRICHER-SPEC.md) — All `_computed` derived fields
> - [API Integration Guide](PAYLOAD-API-GUIDE.md) — How to use `buildLoanPayload()` and `enrichPayload()`

---

## Table of Contents

1. [Payload Overview](#payload-overview)
2. [Submission Pipeline — Raw Memory vs Filtered View (S77c)](#submission-pipeline--raw-memory-vs-filtered-view-s77c)
3. [Loan Transaction Details](#loan-transaction-details)
4. [Applicant Details](#applicant-details)
5. [Employment Profiles](#employment-profiles)
6. [Income & Financial Details](#income--financial-details)
7. [Credit & Obligations](#credit--obligations)
8. [Company-Specific Fields](#company-specific-fields)
9. [NRI-Specific Fields](#nri-specific-fields)
10. [Multi-Select Options Explained](#multi-select-options-explained)
11. [Enricher-Derived Fields](#enricher-derived-fields)
12. [Key Differences from Old Payload](#key-differences-from-old-payload)

---

## Payload Overview

The final payload has three main sections:

```json
{
  "loanTransaction": { ... },        // Loan, property & transaction details
  "allApplicantDetails": [ ... ],    // Array of all applicants
  "relationships": [ ... ]           // Inter-applicant relationships (optional)
}
```

### File Structure

The payload builder is organized as a barrel export:

```
src/lib/utils/payloadBuilder/
  index.ts                  // Barrel export (re-exports everything)
  types.ts                  // All TypeScript interfaces
  sanitizers.ts             // toNumber(), toBoolean(), deriveTitle()
  activityProfiles.ts       // Profile builders (salaried, business, pension, etc.)
  incomePayload.ts          // Income entry extraction
  obligationPayload.ts      // Obligation/debt processing
  applicantPayload.ts       // Single applicant builder
  loanTransaction.ts        // Loan transaction + orchestrators
  comparePayloads.ts        // Diff utility for debugging
```

---

## Submission Pipeline — Raw Memory vs Filtered View (S77c)

> **TL;DR** — `formState.loanData` and `formState.applicants` are **raw memory** (every answer the user ever gave across navigation, for back-nav UX). Before anything touches rule-engine / persisted snapshot / external API, the store derives a **filtered view** via `src/lib/utils/payloadFilter.ts:buildFilteredAnswers()` and the payload builders consume that filtered view. Never pass raw memory directly into `buildLoanPayload()` / `buildCasePayload()`.

### Why this exists

Users navigate freely across form pages and sometimes switch high-level choices mid-form (e.g. employment type from Self-Employed → Salaried). The raw stores keep every answer ever typed so that going **back** to the previous path restores the user's progress. But the rule engine, the persisted snapshot, and the external API must only see **answers on the current-route visible path** — otherwise stale keys from the abandoned path leak through and poison derivations like `_is_business_file`, `_computed._total_gross_monthly`, and `loanAmount` fallbacks.

### Contract

| | Memory payload (raw) | Submission payload (filtered) |
|---|---|---|
| Storage | `formState.loanData[loanName]` + `formState.applicants` — untouched, full history | Derived on read, never mutates raw |
| Contains | Every answer user ever gave (restoration UX) | Current-route visible keys + derived keys computed from them |
| Consumed by | Form bindings, `combinedAnswers` for rendering / `isQuestionVisible` | `cleanPayload.svelte.ts` → `buildLoanPayload` → rule engine, persisted snapshot, external API |

### Two layers on top of raw memory

Implemented in `src/lib/utils/payloadFilter.ts`:

- **Layer A (floor, schema-driven)** — `buildCleanAnswers(schema, rawAnswers)` drops every key whose page or question is invisible at the current route. Default-safe: any new question added to the schema is automatically excluded from the submission payload when it is hidden. Requires schema at the call site.
  - **Current status (post-S77d Phase 1.6)**: Layer A is passthrough on BOTH submission entry points — client `cleanPayloadStore.svelte.ts:currentSchema()` returns `null`, and server `src/routes/api/evaluate-and-persist/+server.ts:_buildPayloadFromFormState()` calls `buildFilteredAnswers(null, ...)`. Posture is symmetric by design. Live Layer A activation is tracked as **Phase 1.6b** in SESSION-HANDOFF — scheduled post-S77e (schema-driven fixture factory) because activating Layer A against drifted fixtures would produce false confidence. Recommended pivot once fixtures are rebuilt: a server endpoint that accepts raw and returns filtered, leveraging `schemaLoader.ts`'s deep-frozen schema cache.
- **Layer B (exceptions, gate-driven)** — Pure functions `(filtered, raw) => filtered` that pull specific keys back from raw memory when business rules demand them even though their source page is hidden. Live on BOTH submission entry points (client since S77c, server since S77d Phase 1.6). `includeGuarantorObligations` + `includeSelectedIncomeProfiles` run identically in the client store and in `/api/evaluate-and-persist`. No schema dependency.

### Gate registry

Two live gates at `payloadFilter.ts:APPLICANT_GATES` (frozen, per-applicant):

- **`includeGuarantorObligations`** — business rule: when an applicant declares `isGuarantorOnOtherLoan === 'Yes'` but `ObligationsRunning === 'No'`, the obligations page is hidden (they have no **own** obligations), yet we still need the guarantor obligation entries to reach the payload. Gate filters the obligations array (unified `obligations`, with fallback to legacy `tableLoanEntries` / `tableLimitEntries`) to only entries where `role === 'guarantor'`. Also normalizes legacy-shape obligations onto the unified `obligations` field on write.
- **`includeSelectedIncomeProfiles`** — business rule: when `selectedIncomeProfiles` is present and non-empty, income entries must be filtered to only those whose `profileType` is in the selected set. Prevents deselected profiles from bleeding into the submission payload. No-op when `selectedIncomeProfiles` is absent or empty.

`LOAN_ANSWERS_GATES` is present but currently empty — reserved for future loan-level overrides where a loan-scope answer must survive visibility.

### Invariants

- `buildFilteredAnswers()` never mutates its inputs. Every gate returns at minimum a shallow copy of the applicant. Non-mutation is asserted by `src/lib/testing/__tests__/payloadFilterRegression.test.ts` via deep equality of raw inputs post-filter.
- Gates are pure functions — no I/O, no side effects, no global state reads.
- Gates run in registry order. Order is declarative: if two gates both touch `obligations`, order the latter one to receive the former's output.
- Gates must not re-introduce keys that were never in raw memory. They only lift keys from raw that Layer A dropped.
- The submission view is structurally identical to raw (`{ loanAnswers: Record<string, unknown>, applicants: ApplicantData[] }`) so that payload builders need no shape change.

### Read path

```
formState.loanData[loanName] ──────┐
formState.applicants ──────────────┼─→ buildFilteredAnswers(schema, loanAnswers, applicants)
(currentSchema() — null today) ────┘      │
                                          ├─ Layer A: buildCleanAnswers(schema, loanAnswers)  [passthrough when schema=null]
                                          ├─ LOAN_ANSWERS_GATES.reduce(loanAnswers)            [currently empty]
                                          └─ APPLICANT_GATES.reduce(perApplicant)              [2 gates]
                                          ↓
                                          FilteredView { loanAnswers, applicants }
                                          ↓
                                  cleanPayloadStore.svelte.ts
                                   ├─ cleanPayload = $derived.by(buildLoanPayload(view.loanAnswers, view.applicants))
                                   └─ casePayload  = $derived.by(buildCasePayload(view.loanAnswers, view.applicants))
```

### When to add a new gate vs. a new visibility rule

- **Prefer visibility rule** (Layer A). If the answer should genuinely be absent from the submission when the user is off that path, add/fix the page or question `showWhen` and let Layer A drop it.
- **Add a gate** (Layer B) only when the answer **must survive** hidden parents because of a business rule — like the guarantor case. Every gate needs a documented business justification in the file.
- Never add a gate to paper over a buggy `showWhen`. Fix the `showWhen`.

### Diagnostic

`explainFilter(schema, rawLoanAnswers, rawApplicants)` returns an object describing which keys Layer A dropped, which gates mutated which applicants, and the final shape — useful when diagnosing "why did field X vanish from my payload" during development.

### Tests

`src/lib/testing/__tests__/payloadFilterRegression.test.ts` — 14 tests. Four describe blocks: Layer A schema-driven drop (3 tests inc. `explainFilter` diagnostic), guarantor-only mode (3 tests inc. legacy-shape normalization), `selectedIncomeProfiles` filter (2 tests), non-mutation invariant (3 tests), gate registry sanity (3 tests — frozen, no duplicate names, passes shape).

`src/lib/testing/__tests__/ruleEngine/evaluateAndPersistFilter.test.ts` — 9 tests (S77d Phase 1.6). Server-side twin of the client suite. Uses `vi.hoisted` + `vi.mock('$lib/utils/payloadBuilder/index.js')` to spy on `buildLoanPayload` so tests can inspect the filter's output in isolation without requiring valid minimal per-loan-type payloads (fixtures were known-drifted this session — fixture factory rebuild scheduled for S77e). Breadth sweep covers all 6 loan paths (Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, Professional Loan); cross-cutting asserts cover Layer A passthrough, non-mutation invariant on raw formState, and legacy-split-array fold. Inline fixtures carry a `THROWAWAY FIXTURES` banner pointing at SESSION-HANDOFF "Fixture Overhaul" for S77e migration.

---

## Loan Transaction Details

These fields describe the loan being applied for, property details (for secured loans), and transaction context.

### Core Loan Details (All 6 Loan Types)

| Field | Type | Description |
|---|---|---|
| `loanName` | string | **Type of loan product** — "Home Loan", "Personal Loan", "Business Loan", "Loan Against Property", "Plot Loan", "Professional Loan" |
| `loanType` | string | **Scope of the request — consistent across every loan family** — "New Loan", "Balance Transfer Only", "Balance Transfer With Top-up", "Top-up Only", "Debt Consolidation", "Debt Consolidation with Extra Funds". Plot Loan stores its scope here too (it stopped being the special case in the 2026-05-31 rename — see [ADR-0020](adr/0020-loan-field-nomenclature.md)). |
| `facilityType` | string? | **Facility / lending instrument** — set by LAP + the three unsecured loans (Personal / Business / Professional). Undefined for Home Loan and Plot Loan (no facility axis). Values: `"Term Loan"`, `"Overdraft (OD)"`, `"Drop-line OverDraft (DOD)"`, `"Flexi Drop-line OverDraft (Flexi DOD)"`, `"Cash Credit (CC)"`. |
| `loanVariant` | string? | **Subproduct** — currently used only by Plot Loan. Values: `"Plot Loan Only"`, `"Plot & Construction Loan"`, `"Plot & Equity Loan"`, `"Construction Loan Only"`. Undefined for every other loan family. |
| `numberOfApplicants` | number | **Total people applying** — Count of primary + co-applicants. Banks may add all their incomes for eligibility |
| `applicationStructure` | string? | **Who is applying together** — "Individual", "Couple", "Family" |
| `loanAmount` | number | **How much loan is needed in rupees** — Example: 6000000 (60 lakhs) |
| `tenureYears` | number | **Loan repayment period in years** — Example: 20 (for 20-year loan). Max depends on applicant age |

### Case Intake (Shared Page 0)

| Field | Type | Description |
|---|---|---|
| `assessmentStatus` | string? | **Has this case been assessed before?** — "fresh", "rejected", "sanctioned_not_disbursed" |
| `assessmentLenders` | string[]? | **Which lenders assessed previously** — Bank names from prior attempts |
| `rejectionReasons` | string[]? | **Why was it rejected?** — Reasons from prior rejections |
| `sanctionNotDisbursedReasons` | string[]? | **Why wasn't it disbursed?** — Reasons sanction didn't convert |

### Property Details (Secured Loans: Home Loan, LAP, Plot Loan)

| Field | Type | Description |
|---|---|---|
| `propertyIdentified` | boolean? | **Has the buyer found a property?** — `true` if property is already selected, `false` if just checking eligibility |
| `propertyState` | string? | **State where property is located** — "Maharashtra", "Karnataka", "Delhi" |
| `propertyCity` | string? | **City where property is located** — "Mumbai", "Bangalore", "Gurgaon" |
| `propertyPincode` | string? | **Property pincode** — For granular geo-matching in policy rules |
| `propertyType` | string? | **Type of property** — "1BHK", "2BHK", "Plot", "Land", "Independent House", "Villa", "Commercial" |
| `purchaseType` | string? | **How is the property being bought?** — "Direct Sale", "Resale", "Endorsement" |
| `constructionStatus` | string? | **Current state of construction** — "Ready to Move", "Under Construction", "Plot + Construction" |
| `propertyStage` | string? | **For under-construction: current stage** — "Under Construction", "Ready Possession" |
| `propertyComplianceStatus` | string? | **Compliance status** — "fully_compliant", "authorized_not_per_plan", "not_authorized" |
| `propertyRegistered` | boolean? | **Is property already registered?** — Has the sale deed been registered with sub-registrar? |
| `propertyCost` | number? | **Total cost of property in rupees** — Builder price or deal value. Example: 7500000 (75 lakhs) |
| `atsValue` | number? | **Value as per Agreement to Sell** — The price in the ATS document. May differ from actual deal |
| `downPayment` | number? | **Amount buyer is paying from own pocket** — Banks typically need 10-25%. Example: 1500000 (15 lakhs) |

### Three-Cost Model (V2 — Home Loan)

| Field | Type | Description |
|---|---|---|
| `marketValue` | number? | **Current market value** — For LTTV (Loan-to-Total-Value) calculation |
| `registryValue` | number? | **Documented/registry value** — For LCR (Loan-to-Cost Ratio) calculation |
| `advanceInAgreement` | number? | **Advance paid to seller** — Already-paid amount mentioned in agreement |

### Property Usage

| Field | Type | Description |
|---|---|---|
| `propertyUsageIntent` | string? | **How will the property be used?** — "SELF_USE", "INVESTMENT", "RENTAL", "COMMERCIAL" |

### Residence Details

| Field | Type | Description |
|---|---|---|
| `residenceSameAsProperty` | boolean? | **Is applicant living where property is?** — `true` if buying in same city as residence |
| `applicantResidingInProperty` | boolean? | **LAP: any applicant living in the property?** — Determines occupancy status |
| `propertyOccupancyStatus` | string? | **LAP: if no applicant resides** — Current occupancy/usage |
| `residenceState` | string? | **State where applicant currently lives** — If different from property location |
| `residenceCity` | string? | **City where applicant currently lives** — If different from property location |
| `businessState` | string? | **Business/Professional loans: state of business** — For geo-matching |
| `businessCity` | string? | **Business/Professional loans: city of business** — For geo-matching |

### Balance Transfer Specific

| Field | Type | Description |
|---|---|---|
| `currentBank` | string? | **Bank where existing loan is** — The bank from which loan is being transferred. Example: "HDFC Bank" |
| `principalOutstanding` | number? | **How much is still owed on current loan** — The remaining principal amount |
| `currentInterestRate` | number? | **Interest rate on existing loan** — Example: 9.5 (means 9.5% per year) |
| `remainingTenure` | number? | **Months left on current loan** — Example: 180 (15 years remaining) |
| `currentEMI` | number? | **Current monthly EMI amount** — What applicant is paying now per month |
| `sixMonthsAfterRegistry` | boolean? | **Has 6 months passed since property registration?** — Most banks require this for BT |
| `currentPropertyValue` | number? | **Current market value of property** — May have appreciated since purchase |
| `newTenure` | number? | **New tenure requested after BT** — Can extend/reduce tenure during transfer |

### V2 BT Signals (Additional)

| Field | Type | Description |
|---|---|---|
| `interestRateType` | string? | **Rate type on existing loan** — "Floating", "Fixed", "Unknown" |
| `emiBounceHistory` | string? | **EMI bounces on existing loan** — "0", "1", "2", "3+" |
| `sanctionAmount` | number? | **Original loan sanction amount** — What was originally sanctioned |
| `loanVintageMonths` | number? | **Derived: months since disbursement** — Auto-calculated from disbursement date |
| `loanDisbursementDate` | string? | **When was loan disbursed** — Format: "YYYY-MM" |
| `btEmisPaid` | number? | **Number of EMIs paid on BT loan** — Track record indicator |
| `loanAccountNumber` | string? | **Loan account number** — For NOC/foreclosure reference |
| `loanVintage` | string? | **Loan age bucket** — "0-1yr", "1-3yr", "3-5yr" |
| `repaymentTrack` | string? | **Repayment track record** — Quality indicator |

### Home Loan Redesign Signals

| Field | Type | Description |
|---|---|---|
| `registryTimeline` | string? | **When is property registration planned** — Timeline for registration |
| `auctionPropertyStatus` | string? | **Auction property status** — "STANDARD", "AUCTION_AWARE", "AUCTION_UNAWARE" |
| `priorAssessmentHistory` | string? | **Prior assessment history** — "First assessment", "1-2 lenders", "3+", "Previously rejected" |

### Top-up Specific

| Field | Type | Description |
|---|---|---|
| `topUpAmount` | number? | **Additional loan amount needed** — Extra money on top of existing/transferred loan |
| `topUpTenure` | number? | **Tenure for top-up portion in years** — Usually equal to or less than main loan tenure |
| `topUpPurpose` | string? | **Purpose of top-up** — "RENOVATION", "EXTENSION", etc. |

### Dropline OD Specific

| Field | Type | Description |
|---|---|---|
| `dodMonthlyWithdrawal` | number? | **Expected monthly withdrawal** — For DOD facility sizing |

### LAP-Specific Property Details

| Field | Type | Description |
|---|---|---|
| `carpetArea` | number? | **Carpet area in sq ft** — Converted from meters/yards if needed |
| `carpetAreaUnit` | string? | **Original unit of measurement** — For display/conversion reference |
| `carpetAreaRaw` | number? | **Raw area before conversion** — Original value in original unit |
| `propertyAreaType` | string? | **Area classification** — "PLANNED", "CONVERTED_RESIDENTIAL", "NON_PLANNED" |
| `societyStatus` | string? | **Housing society status** — Formation/registration status |
| `pendingSocietyDues` | string? | **Outstanding society dues** — Affects property clearance |
| `approachRoadWidth` | string? | **Road width to property** — Affects valuation |
| `restrictedZone` | string? | **Is property in restricted zone?** — Military/airport/eco-sensitive |
| `floodDisasterZone` | string? | **Is property in flood/disaster zone?** — Insurance/risk implications |
| `leaseRemainingPeriod` | string? | **Remaining lease period** — For leasehold properties |
| `existingEncumbrance` | string? | **Any existing charge on property?** — Existing loans/liens |
| `ocCcAvailable` | string? | **Occupation/Completion certificate available?** — Required for most lenders |
| `municipalApproval` | string? | **Municipal/local body approval** — Building plan approval status |
| `rentalIncome` | number? | **Monthly rental income from property** — If property is rented out |
| `loanPurpose` | string? | **Purpose of LAP** — Business expansion, personal, etc. |

### Property Compliance & Legal (V2)

| Field | Type | Description |
|---|---|---|
| `reraRegistrationStatus` | string? | **RERA registration** — "REGISTERED", "NOT_REGISTERED", "EXEMPT" |
| `naConversionStatus` | string? | **Non-agricultural conversion** — "REGISTERED", "APPLIED", "NOT_STARTED" |
| `zoneClassification` | string? | **Zone type** — "RESIDENTIAL", "COMMERCIAL", "MIXED_USE" |
| `municipalTaxStatus` | string? | **Property tax status** — "PAID_REGULAR", "PAID_IRREGULAR", "UNPAID" |
| `unauthorizedAdditions` | string? | **Unauthorized construction** — "NONE", "MINOR", "MAJOR" |
| `revenueRecordStatus` | string? | **Revenue records** — "AVAILABLE_CURRENT", "AVAILABLE_OUTDATED", "NOT_AVAILABLE" |
| `colonyRegularizationStatus` | string? | **Colony regularization** — "REGULARIZED", "PENDING", "NOT_REGULARIZED" |
| `gramPanchayatPermission` | string? | **Gram panchayat permission** — "YES", "NO", "NOT_REQUIRED" |
| `titleChainStatus` | string? | **Title chain** — "CLEAR", "PARTIAL_GAPS", "UNCLEAR" |
| `encumbranceCertStatus` | string? | **Encumbrance certificate** — "CLEAR", "ENCUMBERED", "NOT_OBTAINED" |
| `successionStatus` | string? | **Succession/inheritance** — "NOT_INHERITED", "SUCCESSION_COMPLETE", "PENDING" |
| `revenueRecordMutation` | string? | **Mutation status** — "MUTATED", "MUTATION_PENDING", "NOT_MUTATED" |

### Seller & Transaction Details (V2)

| Field | Type | Description |
|---|---|---|
| `sellerOwnershipType` | string? | **Seller's ownership** — "SOLE_OWNER", "JOINT_OWNERS", "INHERITED", "POA_HOLDER" |
| `poaRegistrationStatus` | string? | **POA registration** — "REGISTERED", "NOT_REGISTERED" |
| `propertyAcquisitionMethod` | string? | **How seller acquired property** — "PURCHASED", "INHERITED", "GIFT_DEED", "AGREEMENT_POA" |
| `agreementPoaRegistryWilling` | string? | **Will seller do registry?** — For agreement/POA properties |
| `agreementPoaNbfcKnown` | string? | **Is NBFC for POA funding known?** |
| `agreementPoaNbfcName` | string? | **NBFC name** — If POA funding through NBFC |
| `lastRegistryDuration` | string? | **Time since last registry** — "underSixMonths", "underOneYear", etc. |
| `isAnyBuilderDemand` | string? | **Any outstanding builder demand?** |
| `sellerOnLoan` | string? | **Is seller's property currently on loan?** — "Yes" / "No". Enricher derives `isPropertyOnLoan` |
| `sellerOutstandingAmount` | number? | **Seller's outstanding loan amount** — Enricher derives `foreclosureAmount` |
| `sellerCurrentLender` | string? | **Which bank holds the seller's loan** — Enricher derives `sellerLoanBankName` |

### BT Authority Possession & Demand (V2 Merged)

| Field | Type | Description |
|---|---|---|
| `bt_possessionAndDemandStatus` | string? | **Combined possession + demand status** — Enricher splits into `isPossessionOfferedByAuthority` and `isAnyDemandFromTheBuilder` |

### Property Dispute (V2)

| Field | Type | Description |
|---|---|---|
| `propertyDisputeStatus` | string? | **Property dispute status** — "CLEAR", "PENDING", "DISPUTED". Enricher derives `noLegalDispute` |

### Mortgage Year Custom

| Field | Type | Description |
|---|---|---|
| `mortgageYearCustom` | string? | **Custom mortgage year** — When `mortgageYear` = "OTHER", this stores the actual year. Enricher resolves to `effectiveMortgageYear` |

### Authority Purchase (direct_from_authority)

| Field | Type | Description |
|---|---|---|
| `authorityName` | string? | **Name of the authority** — DDA, HUDA, MHADA, etc. |
| `allotmentLetterStatus` | string? | **Allotment letter status** — "ORIGINAL_AVAILABLE", "COPY_AVAILABLE" |
| `allotmentDate` | string? | **Date of allotment** |
| `authorityPaymentStatus` | string? | **Payment to authority** — "FULLY_PAID", "PARTIALLY_PAID" |
| `possessionCertificateStatus` | string? | **Possession certificate** — "POSSESSION_CERT_AVAILABLE", "TDR" |
| `authorityDuesStatus` | string? | **Outstanding dues to authority** — "NO_DUES", "MINOR_DUES", "MAJOR_DUES" |

### Documentation & Legal Readiness

| Field | Type | Description |
|---|---|---|
| `documentationReadiness` | string[]? | **Available documents** — Multi-select codes |
| `nocFromPreviousLender` | string? | **NOC from previous lender** — For BT cases |
| `originalDocumentsAvailable` | string? | **Are original title docs available?** |
| `ownershipChainComplete` | string? | **Is ownership chain complete?** |
| `noLegalDispute` | string? | **Any legal disputes on property?** |
| `encumbranceCertificateVerified` | string? | **EC verified?** |
| `rentalAgreementType` | string? | **Type of rental agreement** — If property is rented |

### Unsecured Common Fields

| Field | Type | Description |
|---|---|---|
| `urgencyLevel` | string? | **How urgently is the loan needed?** |
| `existingBankRelationship` | string? | **Does applicant have existing bank relationship?** |
| `dcExistingBank` | string? | **Bank name for debt consolidation** — Specific bank for DC purpose |

### Bank Preferences

| Field | Type | Description |
|---|---|---|
| `preferredBanks` | string[]? | **Banks applicant wants to apply with** — User's preferred bank list |
| `excludedBanks` | string[]? | **Banks to exclude from offers** — Banks user doesn't want to see |

### NRI Flag

| Field | Type | Description |
|---|---|---|
| `hasNRIApplicant` | boolean? | **Is any applicant NRI?** — Non-Resident Indian. Different documentation needed |

---

## Applicant Details

Each applicant (primary + co-applicants) has these fields.

### Identity & Basic Details

| Field | Type | Description |
|---|---|---|
| `applicantType` | string | **Individual person or Company?** — "Individual" for people, "Company" for Pvt Ltd/LLP/etc. |
| `title` | string? | **Salutation before name** — Auto-derived: "Mr." (Male), "Mrs." (Female+Married), "Ms." (Female+Single). See `deriveTitle()` |
| `fullName` | string | **Full legal name** — As per PAN card/Aadhaar. Example: "Rajesh Kumar Sharma" |
| `age` | number | **Current age in years** — Used to calculate max tenure. Banks use: 60 (retirement) - age = max tenure |
| `gender` | string | **Gender** — "Male", "Female", "Others". Some banks offer lower rates for women |
| `maritalStatus` | string | **Marital status** — "Single", "Married", "Divorced", "Widowed". Affects spouse as co-applicant option |

### Profile & Demographics

| Field | Type | Description |
|---|---|---|
| `education` | string? | **Education level** — "10th Pass", "12th Pass", "Graduate+", "Professional". Some banks correlate with income stability |
| `religion` | string? | **Religion** — "Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain". Used to gate SC/ST category question |
| `casteCategory` | string? | **SC/ST Category** (Hindu only) — "General", "OBC", "SC", "ST". Banks like SBI, PNB, BOB offer reduced interest rates for SC/ST |
| `hasDisability` | string? | **Disability status** — "No" or "Yes". PMAY and some banks offer interest rate concessions for persons with disabilities |
| `ownedResidentialProperties` | string? | **How many residential properties owned** — "None", "1", "2", "3+". Affects LTV limits and PMAY eligibility |
| `applicantResidencePattern` | string? | **Where applicant lives relative to property** — "SAME_CITY", "DIFFERENT_CITY", "DIFFERENT_STATE". Affects verification requirements |

### Role & Relationship

| Field | Type | Description |
|---|---|---|
| `roleInApplication` | string? | **What role does this person play?** — "Primary", "Co-Borrower", "Guarantor" |
| `relationshipWithPrimary` | string? | **Relation with main applicant** — "spouse", "sibling", "parent", "child", etc. |
| `otherRelationship` | string? | **Custom relationship** — If standard relations don't apply. Example: "Business Partner" |

### Residence

| Field | Type | Description |
|---|---|---|
| `residenceType` | string? | **Type of current home** — "Owned", "Rented", "Company Provided", "Family Property". Owned shows stability |
| `yearsAtCurrentAddress` | number? | **How long at current address** — Longer stay = more stability for banks |
| `isNRI` | boolean? | **Is this person NRI?** — Living/working outside India. Different documents needed |
| `applicantResidenceState` | string? | **Per-applicant residence state** — V2 per-applicant field |
| `applicantResidenceCity` | string? | **Per-applicant residence city** — V2 per-applicant field |
| `applicantResidencePincode` | string? | **Per-applicant residence pincode** — V2 per-applicant field |
| `nriCountry` | string? | **NRI country of residence** — Which country the NRI lives in |

### Credit History (Per-Applicant, V2)

| Field | Type | Description |
|---|---|---|
| `creditHistoryStatus` | string? | **Credit history classification** — "defaulter", "guarantor", "both", "neither" |
| `emiBounceCount` | string? | **Number of EMI bounces** — Historical bounce count |
| `defaultSettlementStatus` | string? | **Has default been settled?** — Settlement status of past defaults |
| `recentEnquiryCount` | string? | **Recent credit enquiries** — Number of recent credit pulls |
| `bounceReason` | string? | **Why EMIs bounced** — Explanation for bounce history |
| `defaultReason` | string? | **Why loan defaulted** — Explanation for past defaults |
| `enquiryReason` | string? | **Why multiple enquiries** — Explanation for recent enquiry burst |

### Employment

| Field | Type | Description |
|---|---|---|
| `employmentType` | string | **Primary income source** — Determines what income proof is needed. See "Employment Profiles" section |

### Non-Earning Status

| Field | Type | Description |
|---|---|---|
| `isNonEarning` | boolean? | **Is this applicant non-earning?** — `true` when "no_current_income" selected |
| `noIncomeReason` | string? | **Why no income?** — "homemaker", "student", "retired_no_pension", etc. |

### Unsecured Loan Business Profile (E2E Fill)

| Field | Type | Description |
|---|---|---|
| `businessEntityType` | string? | **Entity type** — "Proprietorship", "Partnership", "LLP", etc. |
| `businessIndustrySector` | string? | **Industry sector** — "Trading", "Manufacturing", "Services" |
| `businessVintage` | string? | **Business age** — "<1yr", "1-3yr", "3-5yr", etc. |
| `gstRegistrationStatus` | string? | **GST registration** — "REGISTERED", "NOT_REGISTERED", "EXEMPT" |
| `annualTurnoverRange` | string? | **Annual turnover** — "BELOW_50L", "50L_1CR", "1CR_5CR" |
| `numberOfEmployees` | string? | **Employee count** — "1_10", "11_50", "51_200", "200+" |
| `banksOfCurrentAccount` | string[]? | **Banks where current account exists** — For existing relationship signals |

---

## Employment Profiles

Based on `employmentType`, different profile data is captured. Each profile is built from multi-select activity details in the form.

### Salaried (Private) — `salariedProfile`

For employees of private companies:

| Field | Meaning | Why Banks Care |
|---|---|---|
| `worksForReputedOrg` | Works for listed company/MNC | Lower risk — stable employer |
| `companyHas100PlusEmployees` | Company has 100+ staff | Larger company = more stable |
| `employerIsProprietorship` | Employer is proprietorship/partnership | Higher risk — can close suddenly |
| `employerSharesFinancials` | Employer ready to share financials | Needed if employer verification required |
| `isPermanentEmployee` | Has permanent position | Contractors have unstable income |
| `twoYearsWithSameEmployer` | 2+ years with same company | Shows job stability |
| `threeYearsTotalExperience` | 3+ years total experience | More experience = stable career |
| `hasProvidentFund` | PF is deducted | Confirms formal employment |
| `salaryInBankAccount` | **Salary comes to bank** | **CRITICAL — banks MUST see salary credits** |
| `receivesBonus` | Gets performance bonus | Extra income consideration |
| `receivesSalarySlip` | Gets Form 16 regularly | Income proof available |
| `hasHigherEducation` | Graduate or higher | Correlated with stable income |

### Salaried (Government) — `governmentProfile`

For government/PSU employees:

| Field | Meaning | Why Banks Care |
|---|---|---|
| `isCentralGovt` | Central government employee | Most stable — lowest risk |
| `isDefense` | Defense/Paramilitary forces | Stable but may have posting issues |
| `isStateGovt` | State government employee | Stable — low risk |
| `isPermanent` | Permanent/confirmed position | Permanent = guaranteed income |
| `isContractual` | Contractual position | Less stable than permanent |
| `probationCompleted` | Probation period done | Confirmed employee now |
| `twoYearsService` | 2+ years in government | Shows stability |
| `noDisciplinaryAction` | No pending cases | Clean record |
| `nonAccessiblePosting` | In restricted/border area | Verification may be difficult |
| `verificationPossible` | Physical verification ok | Can verify employment |
| `alternateAddressAvailable` | Alternate address for verification | Backup verification option |
| `receivesBonus` | Gets bonus/incentive | Additional income |
| `pensionEligible` | Will get pension | Post-retirement security |
| `receivesSalarySlip` | Gets Form 16 | Income proof |
| `filesITR` | Files income tax returns | Proper tax compliance |
| `ownsProperty` | Owns property already | Shows financial stability |
| `hasOtherIncome` | Additional income sources | More income for EMI |

### Self-Employed (Professional) — `businessProfile`

For Doctors, Lawyers, CAs, Architects:

| Field | Meaning | Why Banks Care |
|---|---|---|
| `professionType` | Which profession | Different income patterns per profession |
| `hasBarCouncilChamber` | Lawyer with Bar Council chamber | Established legal practice |
| `gstRegistered` | Has GST registration | Formal business setup |
| `hasCurrentAccount` | Has current account | Business transactions tracked |
| `usesSavingsAccount` | Uses savings for business | Less preferred — informal setup |
| `filesITRRegularly` | Files ITR for 2+ years | Income proof for banks |
| `profitableLast3Years` | Profit in last 3 years | Business is sustainable |
| `profitableSinceStart` | Always profitable | Strong business track record |
| `majorCashSales` | 40%+ sales in cash | Hard to verify — higher risk |
| `fewKeyClients` | Depends on 1-2 clients | Concentration risk |
| `hasCCOD` | Has running CC/OD | Already has credit relationship |
| `hasOtherIncome` | Other income sources | More cushion for EMI |
| `hasProfessionalLicense` | Valid license/registration | Legally practicing |
| `hasCommercialPremises` | Has office/clinic/chamber | Established practice |
| `ownsPremises` | Owns the premises | Asset ownership |
| `enrolledWithProfessionalBody` | MCI/ICAI/Bar Council member | Professional credibility |
| `priorExperience` | 2+ years before own practice | Not first-time entrepreneur |
| `gstRegistrationDate` | When GST was taken | How long formally operating |

### Self-Employed (Other) — `businessProfile`

For traders, manufacturers, service providers. Same fields as Professional plus:

| Field | Meaning | Why Banks Care |
|---|---|---|
| `businessType` | Manufacturing/Trading/Services/etc. | Different risk profiles |
| `threeYearsInBusiness` | Business running 3+ years | Proven survival |
| `seasonalBusiness` | Seasonal income pattern | Irregular income = higher risk |

### Pensioner — `pensionProfile`

For retired individuals receiving pension:

| Field | Meaning | Why Banks Care |
|---|---|---|
| `pensionInBankAccount` | Pension comes to bank | Verifiable income |
| `pensionRegular` | No delays in pension | Consistent income |
| `isGovernmentPension` | Central/State government pension | Most reliable |
| `isPSUDefensePension` | PSU/Defense pension | Very reliable |
| `isLifelongPension` | Pension continues till death | Not fixed-term pension |
| `isFamilyPension` | Family pension (after spouse death) | May be lower amount |
| `continuesBeyond75` | Continues after 75 years | Important for older applicants |
| `receivesPensionSlip` | Gets pension slip/PPO | Income proof available |
| `nationalizedBankAccount` | Account in nationalized bank | Preferred by some lenders |
| `noPensionLoanDeduction` | No existing pension loan | Full pension available |
| `hasOtherIncome` | Additional income | More EMI capacity |
| `ownsProperty` | Owns property | Asset backup |
| `spousePensionApplicable` | Spouse pension if applicable | Future income security |
| `filesITR` | Files ITR on pension | Tax compliance |
| `verificationPossible` | Can verify residence | KYC completion possible |

---

## Income & Financial Details

### Structured Income Entries (V2 — Preferred)

Each applicant can have multiple income sources via `incomeEntries: CleanIncomeEntry[]`:

```typescript
interface CleanIncomeEntry {
  profileType: string;    // One of 14 income profile types (see below)
  entityName: string;     // Employer/company name
  income: Record<string, unknown>;  // Profile-specific income fields
  evidence: {
    itrFiled: boolean;
    hasDocumentaryEvidence: boolean;
    vintageYears?: number;  // Years in this income source
  };
}
```

### All 14 Income Profile Types

| Profile Type | Description | Haircut Applied |
|---|---|---|
| `salaried_regular` | Regular private sector salaried | 0% (full income) |
| `salaried_contractual` | Contractual/fixed-term employment | 0% |
| `government_central` | Central government employee | 0% |
| `government_state` | State government employee | 0% |
| `government_defense` | Defense/military personnel | 0% |
| `business_proprietorship` | Sole proprietor | 30% |
| `business_partnership` | Partnership firm partner | 30% |
| `director_company` | Company director (salary + profit) | 30% |
| `professional_practice` | CA, Lawyer, Doctor (private practice) | 30% |
| `pension` | Retired pensioner | 0% |
| `rental_income` | Rental property income | 30% |
| `freelance_consulting` | Freelancer/consultant | 50% |
| `agriculture_income` | Agricultural income | 75% |
| `investment_income` | Stock dividends, mutual funds, bonds | 75% |

### Legacy Flat Income Fields (Still Supported)

| Field | Type | Description |
|---|---|---|
| `grossIncome` | number? | **Monthly salary before deductions** — Total salary including all allowances. Example: 85000 |
| `netIncome` | number? | **Monthly take-home salary** — After PF, TDS, insurance deductions. Example: 72000 |
| `monthlyOtherIncome` | number? | **Additional monthly income** — Rent, bonus, freelance, etc. |

### For Self-Employed Applicants — `financials`

| Field | Type | Description |
|---|---|---|
| `financials.grossReceipts` | number[] | **Total business turnover each year** — Sales/revenue per year. Example: [5000000, 6000000, 7000000] |
| `financials.netProfit` | number[] | **Profit after expenses each year** — What's left after all costs. Example: [800000, 1000000, 1200000] |
| `financials.depreciation` | number[] | **Depreciation + Interest each year** — Added back to profit for loan calculation |
| `financials.itrFiled` | string[] | **Which years ITR was filed** — Example: ["FY23-24", "FY22-23"] |
| `averageBankBalance` | number? | **Average balance in current account** — Average of last 12 months. Shows cash flow health |
| `averageCashAmount` | number? | **Daily cash sales average** — For cash-heavy businesses |

---

## Credit & Obligations

### Credit Score

| Field | Type | Description |
|---|---|---|
| `creditScore` | number | **CIBIL/Credit score (0-900)** — Higher is better. 750+ excellent. 650-750 good. Below 650 needs explanation |

### Low Credit Score Reasons — `lowCreditReasons`

If credit score is below 750, capture why:

| Field | Meaning | How It Affects Approval |
|---|---|---|
| `delayedEMI` | Paid EMIs late in past | Shows payment discipline issues |
| `highCreditUtilization` | Using >70% of credit limit | Looks credit-hungry |
| `noCreditHistory` | No loans/cards before | New to credit — need other proofs |
| `minimumDueOnly` | Pays only minimum on cards | Poor credit behavior |
| `multipleEnquiries` | Many loan applications recently | Looks desperate for credit |
| `coApplicantDefault` | Was co-applicant on defaulted loan | Not primary defaulter |
| `loanDefault` | Defaulted on own loan | Major red flag |
| `onlyUnsecuredLoans` | Only personal loans/cards | No secured loan track record |

### Existing Obligations — `obligations` array

Each obligation (loan or credit line) has:

| Field | Type | Description |
|---|---|---|
| `id` | string | **Unique identifier** — UUID for tracking |
| `obligationType` | string | **Classification** — `"term_loan"` or `"credit_line"` |
| `loanType` | string | **Type** — "Personal Loan", "Home Loan", "CC Limit", "OD Limit", "Dropline OD", etc. |
| `bankName` | string | **Which bank/NBFC** — Lender name |
| `emi` | string | **Monthly EMI** — Term loans only. Numeric string, sanitized to number |
| `totalLimit` | string | **Sanctioned limit** — Credit lines only |
| `tenure` | string | **Original tenure in months** |
| `interestRate` | string | **Interest rate** — Percentage |
| `selectedToClose` | string | **Closure plan** — "Self-funded", "Top-up", "Keep running", "Not my liability" (required) |
| `remainingLimit` | string? | **Remaining principal** |
| `remainingTenure` | string? | **Months still to pay** |
| `utilizedAmount` | string? | **Currently utilized** — For credit lines |
| `sanctionedLimit` | string? | **Sanctioned limit** — For Dropline OD |
| `sanctionedTenure` | string? | **Sanctioned tenure** — For Dropline OD |
| `emiDelayHistory` | string? | **EMI delay track** — "NONE", "1", "2+" |
| `role` | string? | **Applicant's role in this loan** — "Primary Borrower", "Co-Borrower", "Guarantor" |
| `borrowerCount` | string? | **Total borrowers** — "1", "2", "3", "4+" |
| `emiMethod` | string? | **EMI deduction method** |
| `applicantEmiShare` | number? | **Computed EMI share** — Server-side computed, NEVER trust client value |
| `emiPaidBy` | string? | **Who pays this EMI?** — "self", "spouse", "parent", "other" |
| `emiPaymentMode` | string? | **Payment method** — "directly_to_bank", "through_salary", etc. |
| `emiPaidByName` | string? | **Payer's name** — If emiPaidBy != 'self' |
| `loanCapacity` | string? | **Capacity of borrowing** — "as_individual", "as_director", "as_partner" |
| `ownershipPercent` | number? | **Ownership stake** — For proportional EMI splits |

### Obligation Type Classification

| Type | Description | EMI Calculation |
|---|---|---|
| `term_loan` | Fixed EMI, fixed tenure, fully repaid at end | Direct EMI amount |
| `credit_line` | Revolving facility, no fixed EMI | 5% of limit (configurable in `systemConfig.ts`) |

**Credit line types detected automatically:** CC Limit, OD Limit, Dropline OD

---

## Company-Specific Fields

When `applicantType` is "Company":

### Company Identity

| Field | Type | Description |
|---|---|---|
| `companyName` | string? | **Registered company name** — As per MCA/ROC records. Example: "ABC Technologies Pvt Ltd" |
| `companyType` | string? | **Type of registration** — "Pvt Ltd", "Public", "LLP", "Partnership", "Proprietorship", "OPC" |
| `companyAge` | number? | **Years since incorporation** — Older companies are lower risk. Banks typically need 3+ years |
| `companyOfficeProximity` | string? | **Office proximity to property** |
| `companyOwnedProperties` | string? | **Properties owned by company** |
| `companyOfficeState` | string? | **State of registered office** |
| `companyOfficeCity` | string? | **City of registered office** |
| `companyOfficePincode` | string? | **Pincode of registered office** |

### Director/Partner Details — `directors` array

Each director/partner in the company has:

| Field | Type | Description |
|---|---|---|
| `name` | string | **Director's full name** — Used for cross-company matching (exact match + prefix match for recovery) |
| `age` | number | **Director's age** — Used for max tenure calculation when director is a co-applicant |
| `designation` | string? | **Role in company** — "Director", "Partner", "Managing Director", "CEO", etc. |
| `din` | string? | **Director Identification Number** — MCA-assigned unique ID |
| `sharePercent` | number? | **Stake percentage (1-100)** — `null` means "Not sure". Validation per entity type (exact_100 or max_100) |
| `location` | string? | **Director location** — "SAME_CITY", "DIFFERENT_CITY", "DIFFERENT_STATE" |
| `isCoApplicant` | boolean? | **Derived**: true if director is on property or EMI. Determines if director becomes Individual applicant |
| `cibil` | number? | **Director's credit score** |

### Company Profile (Enricher-Derived)

Auto-derived from director relationship graph by `payloadEnricher.ts`:

| Field | Type | Description |
|---|---|---|
| `companyProfile.familyControlled` | boolean | **Is this a family-run business?** — Auto-derived, never self-declared |
| `companyProfile.familyStakePercent` | number | **Family's total ownership stake** |
| `companyProfile.familyDominance` | string | **Level of family control** — "HIGH", "MEDIUM", "LOW" |
| `companyProfile.familyClusterSize` | number | **Number of family members as directors** |
| `companyProfile.totalDirectors` | number | **Total director count** |
| `companyProfile.outsiderCount` | number | **Non-family directors** |
| `companyProfile.familyClusterIds` | string[] | **IDs of family-linked directors** |

### Cross-Company Director Matching

When the same person is a director at multiple companies:
- **Exact name match** across companies triggers cross-company linking
- Identity fields (age, gender, maritalStatus, isNRI) are shared — single source of truth
- Role fields (ownershipPercent, designation, loanRole) remain per-company

The company also uses `businessProfile` (same as self-employed) for business activity details and `financials` for financial data.

---

## NRI-Specific Fields

### GPA (General Power of Attorney) Details

When an applicant is NRI and needs a local representative:

| Field | Type | Description |
|---|---|---|
| `gpaDetails.fullName` | string | **GPA holder's full name** — Person authorized to act on NRI's behalf |
| `gpaDetails.age` | number | **GPA holder's age** |
| `gpaDetails.relationship` | string | **Relationship with NRI** — "Father", "Spouse", "Brother", etc. |
| `gpaDetails.address` | string? | **GPA holder's address** — For verification purposes |

---

## Multi-Select Options Explained

Multi-select questions let users select multiple applicable options. These are stored as objects where key = option ID, value = true/false.

### How Multi-Select Data Flows

**In the form (raw data):**

```json
{
  "salariedActivityDetailsVisible": {
    "works_for_reputed_org": true,
    "company_100plus_employees": true,
    "salary_credited_regularly": true,
    "receives_bonus": false
  }
}
```

**In clean payload (transformed):**

```json
{
  "salariedProfile": {
    "worksForReputedOrg": true,
    "companyHas100PlusEmployees": true,
    "salaryInBankAccount": true,
    "receivesBonus": false
  }
}
```

### Why This Matters

1. **Old payload** sent `financialsTableVisible` as-is (messy)
2. **New payload** extracts to `financials` with clean structure
3. **Old payload** missed multi-select options entirely in some cases
4. **New payload** captures all selected options in named profile objects

---

## Enricher-Derived Fields

The `payloadEnricher.ts` module derives additional fields from per-applicant data. These are available to bank rule documents for eligibility evaluation without requiring rule authors to iterate over applicant arrays.

> **Full specification:** See [Enricher Spec](PAYLOAD-ENRICHER-SPEC.md)

### Case-Level Aggregations

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._total_gross_monthly` | Sum of gross monthly income across all applicants | Total household income for FOIR |
| `_computed._total_obligations_monthly` | Sum of EMI shares (credit lines at 5% of limit) | Total monthly debt burden |
| `_computed._third_party_emi_total` | EMIs paid by someone other than borrower | Income relief for FOIR |
| `_computed._applicant_count` | Number of applicants | Multi-applicant eligibility |
| `_computed._has_co_applicant` | true if > 1 applicant | Co-applicant eligibility gates |

### Primary Applicant Signals

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._primary_age` | Age of first applicant | Max tenure calculation |
| `_computed._primary_employment` | Employment type of first applicant | Employment-based eligibility |

### Credit Profile Aggregates

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._max_cibil` | Highest CIBIL among all applicants | Best credit signal |
| `_computed._min_cibil` | Lowest CIBIL among all applicants | Worst credit signal |

### Employment Classification

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._is_business_file` | true if ANY applicant is self-employed | Business file processing |
| `_computed._is_salaried_file` | true if PRIMARY is salaried | Salaried file processing |

### Income Profile Classification

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._income_source_count` | Total incomeEntries across all applicants | Income diversity signal |
| `_computed._income_profile_types` | Array of unique profile types | Which income types present |
| `_computed._total_vintage_years` | Max vintage years from any applicant | Experience signal |

### Facility Classification (Unsecured Loans)

| Derived Field | Logic | Assessment Use |
|---|---|---|
| `_computed._facility_type` | Pass-through from `loanTransaction.facilityType` | Facility-specific rules |
| `_computed._is_credit_line_facility` | true if OD/DOD/CC | Branch FOIR/EMI calculations |

### Special Status Flags

| Derived Field | Source | Logic |
|---|---|---|
| `isSCST` | `casteCategory` | "Yes" if ANY applicant is SC or ST |
| `hasDisabledApplicant` | `hasDisability` | "Yes" if ANY applicant has disability |
| `_computed._has_non_earner` | `isNonEarning` | true if ANY applicant is non-earning |

### Property Compliance Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `hasBlackMoney` | registryValue, propCost | true if registryValue < propertyCost |
| `approvedByAuthority` | propertyComplianceStatus | true if status indicates authority approval |
| `asPerApprovedMap` | propertyComplianceStatus | true if construction matches approved plan |
| `naConversionComplete` | naConversionStatus | true if status = REGISTERED |
| `isResidentialZone` | zoneClassification | true if zone = RESIDENTIAL |
| `isSelfOccupied` | propertyUsageIntent | true if = "self_occupied" |
| `isInvestmentProperty` | propertyUsageIntent | true if = "investment" |
| `hasMunicipalTaxRecords` | municipalTaxStatus | true if paid (regular or irregular) |
| `hasUnauthorizedConstruction` | unauthorizedAdditions | true if MINOR or MAJOR |
| `hasRevenueRecords` | revenueRecordStatus | true if available (current or outdated) |
| `isColonyRegularized` | colonyRegularizationStatus | true if REGULARIZED |
| `encumbranceCertificateVerified` | encumbranceCertStatus | true if CLEAR |
| `ownershipChainComplete` | titleChainStatus | true if CLEAR |
| `isDifferATSAndPropertyValue` | propertyCost, registryValue | true if propertyCost != registryValue |
| `isNonRERA_UC` | propertyStage, reraRegistrationStatus | true if Under Construction + NOT_REGISTERED |

### Seller & Transaction Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `isPoaSale` | sellerOwnershipType | true if = "POA_HOLDER" |
| `isInheritedProperty` | sellerOwnershipType, propertyAcquisitionMethod | true if either = "INHERITED" |
| `poaRegistered` | poaRegistrationStatus | true if = "REGISTERED" |
| `isAgreementPoaDeal` | propertyAcquisitionMethod | true if = "AGREEMENT_POA" |
| `isRecentRegistry` | lastRegistryDuration | true if "underSixMonths" or "underOneYear" |
| `isPropertyOnLoan` | sellerOnLoan | Direct pass-through |
| `foreclosureAmount` | sellerOutstandingAmount | Direct pass-through (numeric) |
| `sellerLoanBankName` | sellerCurrentLender | Direct pass-through |

### Authority Purchase Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `isAuthorityFullyPaid` | authorityPaymentStatus | true if = "FULLY_PAID" |
| `hasAllotmentLetter` | allotmentLetterStatus | true if "ORIGINAL_AVAILABLE" or "COPY_AVAILABLE" |
| `hasPossessionCert` | possessionCertificateStatus | true if = "POSSESSION_CERT_AVAILABLE" |
| `hasAuthorityDues` | authorityDuesStatus | true if "MINOR_DUES" or "MAJOR_DUES" |

### Purchase Type Normalization

| Derived Field | Source | Logic |
|---|---|---|
| `purchaseType` | purchaseType, plotSource | Normalized: "direct_from_builder"/"direct_from_authority" -> "Direct Sale", "resale_normal"/"resale_endorsement" -> "Resale" |
| `isAuthorityPurchase` | purchaseType | true if original = "direct_from_authority" |
| `isEndorsement` | purchaseType | true if original = "resale_endorsement" |

### Auction Property Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `auctionedProperty` | auctionPropertyStatus | "No" if STANDARD, "Yes" if AUCTION_AWARE/UNAWARE |
| `understandsAsIsBasis` | auctionPropertyStatus | "Yes" if AUCTION_AWARE, "No" if AUCTION_UNAWARE |

### BT Possession & Demand Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `isPossessionOfferedByAuthority` | bt_possessionAndDemandStatus | "Yes" if status starts with "POSSESSION_" |
| `isAnyDemandFromTheBuilder` | bt_possessionAndDemandStatus | "Yes" if status ends with "_WITH_DEMAND" |

### Mortgage & Tenure Derivations

| Derived Field | Source | Logic |
|---|---|---|
| `effectiveMortgageYear` | mortgageYear, mortgageYearCustom | Resolves "OTHER" to custom value, "MAX" stays as "MAX", otherwise numeric |

### Backward Compatibility Derivations

| Old Field | New Merged Field | Derived Logic |
|---|---|---|
| `isDefaulter` | `creditHistoryStatus` | "defaulter" or "both" -> "Yes" |
| `madeGuarantor` | `creditHistoryStatus` | "guarantor" or "both" -> "Yes" |
| `approvedByAuthority` | `propertyComplianceStatus` | "not_authorized" -> "No" |
| `asPerMap` | `propertyComplianceStatus` | "fully_compliant" -> "Yes" |
| `payslips` | `incomeDocAvailable` | "payslips_only" or "both" -> "Yes" |
| `Form16Available` | `incomeDocAvailable` | "form16_only" or "both" -> "Yes" |

---

## Inter-Applicant Relationships

The `relationships` array captures how applicants are related to each other:

```typescript
interface RelationshipEntry {
  fromIndex: number;      // First applicant index
  toIndex: number;        // Second applicant index
  relationType: string;   // "spouse", "child", "parent", "sibling", etc.
  category: string;       // "family" | "non_family"
}
```

Used by the enricher for family control derivation in company applicants.

---

## Sanitization & Conversion

The `sanitizers.ts` module handles data cleaning:

```typescript
// Indian currency string -> number
toNumber("12,50,000")  // -> 1250000
toNumber("125.5")      // -> 125.5
toNumber("")           // -> null

// String/Boolean coercion
toBoolean("Yes")       // -> true
toBoolean("No")        // -> false
toBoolean(1)           // -> true

// Title derivation (auto-computed, not form input)
deriveTitle("Male", "Married")   // -> "Mr."
deriveTitle("Female", "Married") // -> "Mrs."
deriveTitle("Female", "Single")  // -> "Ms."
```

---

## Key Differences from Old Payload

| Aspect | Old Approach | New Approach |
|---|---|---|
| Multi-select options | Often missing or sent as "Visible" suffix | Properly extracted into named profile objects |
| UI state fields | Included (`shake`, `hasError`, `touchedFields`) | Excluded — only business data |
| Formatted fields | Duplicate data (`emi` + `emiFormatted`) | Only numeric values, no formatted duplicates |
| Validation flags | Included (`salariedActivityDetailsValidate`) | Excluded — only actual data |
| Financial tables | Raw with all columns | Clean with only meaningful data |
| Null/empty values | Included as empty strings | Omitted entirely |
| Income sources | Single flat fields | Structured `incomeEntries` array with 14 profile types |
| Obligations | Split between loans and credit lines | Unified `obligations` array with `obligationType` discriminator |
| Credit history | Single `isDefaulter` boolean | Structured `creditHistoryStatus` with enricher backward-compat |
| EMI shares | Client-computed | Server-side recomputed (NEVER trust client) |
| Relationships | Implicit | Explicit `relationships` array |

---

## Summary

This payload system:

1. **Extracts only relevant user data** — No UI state, validation flags, or temporary fields
2. **Properly handles multi-select** — Converts to clean profile objects
3. **Documents every field** — Easy to understand what's being sent
4. **Type-safe** — Full TypeScript types for reliability (`types.ts` — 645 lines)
5. **Comparable** — Can diff old vs new payloads to see changes
6. **Enrichable** — `payloadEnricher.ts` adds `_computed` fields for rule engine consumption
7. **14 income profile types** — With per-type haircuts (0% to 75%)
8. **Unified obligations** — Term loans and credit lines in one array
9. **Server-side EMI recomputation** — Client values never trusted

The result is a clean, well-documented payload that accurately represents the user's final choices for bank assessment.
