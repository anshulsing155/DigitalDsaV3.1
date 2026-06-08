# Payload Enricher Specification

> Complete reference for `src/lib/ruleEngine/payloadEnricher.ts` — all `_computed` fields, backward-compatibility derivations, and rule usage examples.

---

## Overview

The payload enricher transforms a clean `LoanApplicationPayload` into a rule-engine-ready structure by:

1. **Computing aggregate fields** from per-applicant data (so rule authors don't iterate arrays)
2. **Deriving backward-compatible fields** from merged V2 questions (so old rules still work)
3. **Classifying the case** by employment type, facility type, income sources
4. **Recomputing EMI shares** server-side (NEVER trusting client values)

**Location:** `src/lib/ruleEngine/payloadEnricher.ts` (~799 lines)
**Called:** Server-side only, before rule engine evaluation
**Output:** Enriched payload with `_computed` object + top-level derived fields

---

## Architecture

```
                    ┌─────────────────┐
  Clean Payload ──> │ payloadEnricher  │ ──> Enriched Payload
                    │                  │
                    │  1. Aggregate    │     loanTransaction + derived fields
                    │  2. Classify     │     allApplicantDetails (unchanged)
                    │  3. Derive       │     _computed: { ... }
                    │  4. Compat       │
                    └─────────────────┘
```

### Processing Pipeline

1. **Income aggregation** — Sum gross monthly across all applicants
2. **Obligation recomputation** — Recompute EMI shares server-side, sum obligations
3. **Credit profiling** — Find min/max CIBIL across applicants
4. **Employment classification** — Determine if business file, salaried file
5. **Income classification** — Count sources, collect profile types, find max vintage
6. **Facility classification** — Determine credit line vs term loan
7. **Status flags** — SC/ST, disability, non-earner detection
8. **Property compliance** — Derive boolean flags from status enums
9. **Backward compatibility** — Map merged V2 fields to legacy field names

---

## Complete `_computed` Fields Reference

### Income & Obligation Aggregates

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_total_gross_monthly` | number | Sum of `grossIncome` across all applicants. Falls back to income entries if flat field missing | FOIR denominator |
| `_total_obligations_monthly` | number | Sum of all EMI shares. Credit lines counted at 5% of limit (configurable in `systemConfig.ts`) | FOIR numerator (existing obligations) |
| `_third_party_emi_total` | number | EMIs where `emiPaidBy !== 'self'` — paid by spouse, parent, or other | Can be excluded from FOIR |

**Rule example — FOIR check:**
```json
{
  "<=": [
    { "/": [
      { "+": [
        { "var": "_computed._total_obligations_monthly" },
        { "var": "_computed._proposed_emi" }
      ]},
      { "var": "_computed._total_gross_monthly" }
    ]},
    0.50
  ]
}
```

### Applicant Composition

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_applicant_count` | number | Length of `allApplicantDetails` array | Multi-applicant rules |
| `_has_co_applicant` | boolean | `true` if `_applicant_count > 1` | Co-applicant eligibility gates |

**Rule example — require co-applicant for high loan:**
```json
{
  "if": [
    { "and": [
      { ">": [{ "var": "loanTransaction.loanAmount" }, 5000000] },
      { "!": { "var": "_computed._has_co_applicant" } }
    ]},
    "Co-applicant required for loans above 50L",
    "OK"
  ]
}
```

### Primary Applicant Signals

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_primary_age` | number | `allApplicantDetails[0].age` | Max tenure = retirement age - primary age |
| `_primary_employment` | string | `allApplicantDetails[0].employmentType` | Employment-specific eligibility |

**Rule example — max tenure:**
```json
{
  "min": [
    30,
    { "-": [60, { "var": "_computed._primary_age" }] }
  ]
}
```

### Credit Profile Aggregates

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_max_cibil` | number | Highest `creditScore` across all applicants | Best credit signal for eligibility |
| `_min_cibil` | number | Lowest `creditScore` across all applicants | Worst credit — for risk flagging |

**Rule example — minimum CIBIL gate:**
```json
{
  "if": [
    { "<": [{ "var": "_computed._min_cibil" }, 650] },
    "REJECT: One or more applicants below minimum CIBIL",
    "PASS"
  ]
}
```

### Employment Classification

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_is_business_file` | boolean | `true` if ANY applicant's `employmentType` contains "Self-Employed" | Business-specific policies |
| `_is_salaried_file` | boolean | `true` if PRIMARY applicant's `employmentType` contains "Salaried" | Salaried-specific policies |

**Rule example — different FOIR limits:**
```json
{
  "if": [
    { "var": "_computed._is_salaried_file" },
    { "<=": [{ "var": "foir" }, 0.50] },
    { "<=": [{ "var": "foir" }, 0.65] }
  ]
}
```

### Income Profile Classification

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_income_source_count` | number | Total `incomeEntries` across all applicants | Income diversity — more sources = better |
| `_income_profile_types` | string[] | Unique set of `profileType` values from all income entries | Check if specific income type exists |
| `_total_vintage_years` | number | Maximum `evidence.vintageYears` from any income entry | Experience/stability signal |

**Rule example — check for rental income:**
```json
{
  "if": [
    { "in": ["rental_income", { "var": "_computed._income_profile_types" }] },
    "Has rental income - apply 30% haircut",
    "No rental income"
  ]
}
```

### Facility Classification (Unsecured Loans)

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_facility_type` | string | Pass-through from `loanTransaction.facilityType`. Empty string for secured loans | Facility-specific calculations |
| `_is_credit_line_facility` | boolean | `true` if facility is OD, DOD, or CC. `false` for Term Loan and all secured loans | Branch EMI vs interest-only calculations |

**Rule example — different calculation for credit lines:**
```json
{
  "if": [
    { "var": "_computed._is_credit_line_facility" },
    "Calculate interest-only burden",
    "Calculate full EMI burden"
  ]
}
```

> **Full spec:** See `docs/specs/UNSECURED-FACILITY-TYPE-SPEC.md` for facility type data flow and pending tasks.

### Special Status Flags

| Field | Type | Derivation | Rule Usage |
|---|---|---|---|
| `_has_non_earner` | boolean | `true` if ANY applicant has `isNonEarning === true` | Exclude from income calculations |

---

## Top-Level Enriched Fields

These are added directly to the payload root (not under `_computed`), for backward compatibility with existing rules.

### Applicant Profile Aggregations

| Field | Type | Derivation |
|---|---|---|
| `isSCST` | "Yes" \| "No" | "Yes" if ANY applicant has `casteCategory` = "SC" or "ST" |
| `hasDisabledApplicant` | "Yes" \| "No" | "Yes" if ANY applicant has `hasDisability` = "Yes" |

**Rule example — SC/ST rate concession:**
```json
{
  "if": [
    { "==": [{ "var": "isSCST" }, "Yes"] },
    { "-": [{ "var": "baseRate" }, 0.05] },
    { "var": "baseRate" }
  ]
}
```

### Property Compliance Derivations

Derived from V2 enum fields → simplified booleans for rule consumption.

| Derived Field | Source Field | Logic |
|---|---|---|
| `hasBlackMoney` | `registryValue`, `propertyCost` | `true` if `registryValue < propertyCost` |
| `approvedByAuthority` | `propertyComplianceStatus` | `true` if status indicates authority approval |
| `asPerApprovedMap` | `propertyComplianceStatus` | `true` if status = "fully_compliant" |
| `naConversionComplete` | `naConversionStatus` | `true` if status = "REGISTERED". For CONVERTED_RESIDENTIAL, auto-derived from propertyComplianceStatus |
| `isResidentialZone` | `zoneClassification` | `true` if zone = "RESIDENTIAL" |
| `isSelfOccupied` | `propertyUsageIntent` | `true` if = "self_occupied" |
| `isInvestmentProperty` | `propertyUsageIntent` | `true` if = "investment" |
| `hasMunicipalTaxRecords` | `municipalTaxStatus` | `true` if "PAID_REGULAR" or "PAID_IRREGULAR" |
| `hasUnauthorizedConstruction` | `unauthorizedAdditions` | `true` if "MINOR" or "MAJOR" |
| `hasRevenueRecords` | `revenueRecordStatus` | `true` if "AVAILABLE_CURRENT" or "AVAILABLE_OUTDATED" |
| `isColonyRegularized` | `colonyRegularizationStatus` | `true` if = "REGULARIZED" |
| `encumbranceCertificateVerified` | `encumbranceCertStatus` | `true` if = "CLEAR" |
| `ownershipChainComplete` | `titleChainStatus` | `true` if = "CLEAR" |
| `isDifferATSAndPropertyValue` | `propertyCost`, `registryValue` | `true` if propertyCost != registryValue |
| `isNonRERA_UC` | `PropertyStage`, `reraRegistrationStatus` | `true` if Under Construction + NOT_REGISTERED (banks excluded, NBFCs only) |

**Rule example — property compliance gate:**
```json
{
  "and": [
    { "var": "approvedByAuthority" },
    { "var": "asPerApprovedMap" },
    { "!": { "var": "hasUnauthorizedConstruction" } },
    { "var": "encumbranceCertificateVerified" }
  ]
}
```

### Seller & Transaction Derivations

| Derived Field | Source Field | Logic |
|---|---|---|
| `isPoaSale` | `sellerOwnershipType` | `"Yes"` if = "POA_HOLDER" |
| `isInheritedProperty` | `sellerOwnershipType`, `propertyAcquisitionMethod` | `"Yes"` if either = "INHERITED" |
| `poaRegistered` | `poaRegistrationStatus` | `"Yes"` if = "REGISTERED" |
| `isAgreementPoaDeal` | `propertyAcquisitionMethod` | `"Yes"` if = "AGREEMENT_POA" |
| `isRecentRegistry` | `lastRegistryDuration` | `"Yes"` if "underSixMonths" or "underOneYear" |
| `isPropertyOnLoan` | `sellerOnLoan` | Direct pass-through |
| `foreclosureAmount` | `sellerOutstandingAmount` | Direct pass-through (numeric) |
| `sellerLoanBankName` | `sellerCurrentLender` | Direct pass-through |

### Authority Purchase Derivations

| Derived Field | Source Field | Logic |
|---|---|---|
| `isAuthorityFullyPaid` | `authorityPaymentStatus` | `"Yes"` if = "FULLY_PAID" |
| `hasAllotmentLetter` | `allotmentLetterStatus` | `"Yes"` if "ORIGINAL_AVAILABLE" or "COPY_AVAILABLE" |
| `hasPossessionCert` | `possessionCertificateStatus` | `"Yes"` if = "POSSESSION_CERT_AVAILABLE" |
| `hasAuthorityDues` | `authorityDuesStatus` | `"Yes"` if "MINOR_DUES" or "MAJOR_DUES" |

### Purchase Type Normalization

The enricher normalizes V2 purchase type values to V1 format for backward compatibility:

| Raw Value | Normalized `purchaseType` | Also Sets |
|---|---|---|
| `direct_from_builder` | "Direct Sale" | — |
| `direct_from_authority` | "Direct Sale" | `isAuthorityPurchase = true` |
| `resale_normal` | "Resale" | — |
| `resale_endorsement` | "Resale" | `isEndorsement = true` |
| `authority_allotment`, `developer_project` | "Direct Sale" | — |
| `approved_layout`, `revenue_site`, `individual_resale`, `landowner_purchase`, `inherited_partition` | "Resale" | — |

### Auction Property Derivations

| Derived Field | Source Field | Logic |
|---|---|---|
| `auctionedProperty` | `auctionPropertyStatus` | `"No"` if STANDARD, `"Yes"` if AUCTION_AWARE/UNAWARE |
| `understandsAsIsBasis` | `auctionPropertyStatus` | `"Yes"` if AUCTION_AWARE, `"No"` if AUCTION_UNAWARE |

### BT Possession & Demand Derivations

| Derived Field | Source Field | Logic |
|---|---|---|
| `isPossessionOfferedByAuthority` | `bt_possessionAndDemandStatus` | `"Yes"` if status starts with "POSSESSION_" |
| `isAnyDemandFromTheBuilder` | `bt_possessionAndDemandStatus` | `"Yes"` if status ends with "_WITH_DEMAND" |

### Mortgage & Tenure Derivations

| Derived Field | Source Field | Logic |
|---|---|---|
| `effectiveMortgageYear` | `mortgageYear`, `mortgageYearCustom` | If "OTHER" → custom value, if "MAX" → stays "MAX", else → numeric |
| `mortgageYear` | `loanTenure` | Unsecured loans: `loanTenure` → `mortgageYear` normalization |

### BT Market Value Backward Compatibility

For BT/Top-up paths, when `marketValue` is present but `propertyCost` is not, the enricher sets `propertyCost = marketValue` for backward compatibility with rules that reference `propertyCost`.

### Documentation Readiness Backward Compatibility

When the merged `documentationReadiness` field is present, the enricher derives:

| Derived Field | Logic |
|---|---|
| `ownershipChainComplete` | `"Yes"` if = "ALL_READY" |
| `originalDocumentsAvailable` | `"Yes"` if = "ALL_READY" |
| `encumbranceCertificateVerified` | `"Yes"` if = "ALL_READY" or "PARTIAL" |

### Property Dispute Backward Compatibility

| Derived Field | Source Field | Logic |
|---|---|---|
| `noLegalDispute` | `propertyDisputeStatus` | `"Yes"` if = "CLEAR" |

### MNC Signal Auto-Derivation

When `salariedActivityDetails.works_for_reputed_org === true`, the enricher auto-sets `company_100plus_employees = true` (MNCs/listed firms always have 100+ employees, and the form hides this question for MNC employees).

---

## Backward Compatibility Derivations

When V2 merged multiple questions into single fields, the enricher derives the old field names so existing rules continue working.

| Old Field Name | New V2 Field | Derivation Logic |
|---|---|---|
| `isDefaulter` | `creditHistoryStatus` | `"Yes"` if status is "defaulter" or "both" |
| `madeGuarantor` | `creditHistoryStatus` | `"Yes"` if status is "guarantor" or "both" |
| `approvedByAuthority` | `propertyComplianceStatus` | `"No"` if status is "not_authorized", else `"Yes"` |
| `asPerMap` | `propertyComplianceStatus` | `"Yes"` if status is "fully_compliant" |
| `payslips` | `incomeDocAvailable` | `"Yes"` if value is "payslips_only" or "both" |
| `Form16Available` | `incomeDocAvailable` | `"Yes"` if value is "form16_only" or "both" |

**Important:** These derived fields produce `"Yes"` / `"No"` strings (not booleans) to match the original field format that existing rules expect.

---

## EMI Share Recomputation

The enricher recomputes every obligation's `applicantEmiShare` server-side. **Client values are NEVER trusted.**

### Computation Logic

1. **Term loans:** `emi / borrowerCount` (equal split among all borrowers)
2. **Credit lines:** `totalLimit * 0.05 / borrowerCount` (5% of limit, split equally)
3. **Third-party EMIs:** If `emiPaidBy !== 'self'`, the EMI is tracked separately in `_third_party_emi_total` and may be excluded from the applicant's FOIR

### Why Server-Side?

- Client could be manipulated to show lower EMI burden
- Rounding errors differ across browsers
- Business rules for split calculation may change (centralized in enricher)

---

## Company Family Control Derivation

For company applicants, the enricher auto-derives family control metrics:

```typescript
companyProfile: {
  familyControlled: boolean;       // true if family members hold majority
  familyStakePercent: number;      // combined family ownership %
  familyDominance: 'HIGH' | 'MEDIUM' | 'LOW';
  familyClusterSize: number;       // count of related directors
  totalDirectors: number;
  outsiderCount: number;           // directors not in family cluster
  familyClusterIds: string[];      // IDs of linked directors
}
```

### Derivation Process

1. Build relationship graph from `relationships` array
2. Find connected components (family clusters) using union-find
3. Sum ownership percentages within largest cluster
4. Classify dominance: HIGH (>66%), MEDIUM (34-66%), LOW (<34%)

---

## Integration with Rule Engine

### How Rules Access Enriched Data

```json
{
  "var": "_computed._max_cibil"
}
```

The `_computed` object is merged into the rule evaluation context alongside `loanTransaction` and flattened applicant fields.

### Available Variable Paths in Rules

```
loanTransaction.loanName
loanTransaction.loanType
loanTransaction.loanAmount
loanTransaction.tenureYears
loanTransaction.propertyState
...

_computed._total_gross_monthly
_computed._total_obligations_monthly
_computed._max_cibil
_computed._min_cibil
_computed._is_business_file
_computed._facility_type
...

isSCST
hasDisabledApplicant
hasBlackMoney
approvedByAuthority
...
```

### Adding New Enricher Fields

To add a new derived field:

1. Add the field to the `_computed` object construction in `payloadEnricher.ts`
2. Add TypeScript type to the `ComputedFields` interface
3. Document in this spec and in `PAYLOAD_DOCUMENTATION.md`
4. Reference in rules using `{ "var": "_computed._your_field" }`

---

## Configuration

Enricher behavior is controlled by `src/lib/ruleEngine/systemConfig.ts`:

| Config | Default | Purpose |
|---|---|---|
| Credit line EMI factor | 5% | Percentage of limit used as notional EMI for FOIR |
| Retirement age (salaried) | 60 | Max tenure = retirement age - age |
| Retirement age (self-employed) | 65 | Higher for self-employed |
| Max loan tenure | 30 years | Cap on tenure calculation |

---

## File Reference

| File | Lines | Purpose |
|---|---|---|
| `src/lib/ruleEngine/payloadEnricher.ts` | ~799 | All enrichment logic |
| `src/lib/ruleEngine/systemConfig.ts` | ~220 | Centralized constants |
| `src/lib/utils/payloadBuilder/types.ts` | ~645 | Type definitions |
| `src/lib/ruleEngine/evaluationEngine.ts` | — | Consumes enriched payload |
