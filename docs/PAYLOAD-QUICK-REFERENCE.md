# Payload Quick Reference

> Cheat sheet for field names, types, and enricher keys. For full details see [PAYLOAD_DOCUMENTATION.md](PAYLOAD_DOCUMENTATION.md).

---

## Payload Shape

```
LoanApplicationPayload
  loanTransaction: LoanTransactionPayload
  allApplicantDetails: ApplicantPayload[]
  relationships?: RelationshipEntry[]
```

---

## Loan Transaction Fields

### Core (All Loans)
| Field | Type | Required |
|---|---|---|
| `loanName` | string | Yes |
| `loanType` | string | Yes |
| `loanAmount` | number | Yes |
| `tenureYears` | number | Yes |
| `numberOfApplicants` | number | Yes |
| `applicationStructure` | string | No |
| `facilityType` | string | Unsecured only |

### Case Intake
| Field | Type |
|---|---|
| `assessmentStatus` | "fresh" \| "rejected" \| "sanctioned_not_disbursed" |
| `assessmentLenders` | string[] |
| `rejectionReasons` | string[] |
| `sanctionNotDisbursedReasons` | string[] |

### Property (Secured Only)
| Field | Type |
|---|---|
| `propertyIdentified` | boolean |
| `propertyState` / `propertyCity` / `propertyPincode` | string |
| `propertyType` | string |
| `purchaseType` | "Direct Sale" \| "Resale" \| "Endorsement" |
| `constructionStatus` / `propertyStage` | string |
| `propertyComplianceStatus` | "fully_compliant" \| "authorized_not_per_plan" \| "not_authorized" |
| `propertyCost` / `atsValue` / `downPayment` | number |
| `marketValue` / `registryValue` / `advanceInAgreement` | number (V2 three-cost) |
| `propertyUsageIntent` | "SELF_USE" \| "INVESTMENT" \| "RENTAL" \| "COMMERCIAL" |

### Residence
| Field | Type |
|---|---|
| `residenceSameAsProperty` | boolean |
| `applicantResidingInProperty` | boolean (LAP) |
| `residenceState` / `residenceCity` | string |
| `businessState` / `businessCity` | string (BL/PL) |

### Balance Transfer
| Field | Type |
|---|---|
| `currentBank` | string |
| `principalOutstanding` / `currentEMI` / `currentPropertyValue` | number |
| `currentInterestRate` | number |
| `remainingTenure` / `newTenure` | number |
| `sixMonthsAfterRegistry` | boolean |
| `interestRateType` | "Floating" \| "Fixed" \| "Unknown" |
| `emiBounceHistory` | "0" \| "1" \| "2" \| "3+" |
| `sanctionAmount` / `loanVintageMonths` / `btEmisPaid` | number |
| `loanDisbursementDate` | "YYYY-MM" |
| `loanAccountNumber` | string |
| `loanVintage` / `repaymentTrack` | string |

### Home Loan Redesign Signals
| Field | Type |
|---|---|
| `registryTimeline` | string |
| `auctionPropertyStatus` | "STANDARD" \| "AUCTION_AWARE" \| "AUCTION_UNAWARE" |
| `priorAssessmentHistory` | string |

### Top-up
| Field | Type |
|---|---|
| `topUpAmount` / `topUpTenure` | number |
| `topUpPurpose` | string |

### Bank Preferences
| Field | Type |
|---|---|
| `preferredBanks` / `excludedBanks` | string[] |
| `hasNRIApplicant` | boolean |

---

## Applicant Fields

### Identity
| Field | Type |
|---|---|
| `applicantType` | "Individual" \| "Company" |
| `title` | string (auto-derived) |
| `fullName` | string |
| `age` | number |
| `gender` | "Male" \| "Female" \| "Others" |
| `maritalStatus` | "Single" \| "Married" \| "Divorced" \| "Widowed" |

### Demographics
| Field | Type |
|---|---|
| `education` | "10th Pass" \| "12th Pass" \| "Graduate+" \| "Professional" |
| `religion` / `casteCategory` | string |
| `hasDisability` | "Yes" \| "No" |
| `ownedResidentialProperties` | "None" \| "1" \| "2" \| "3+" |
| `applicantResidencePattern` | "SAME_CITY" \| "DIFFERENT_CITY" \| "DIFFERENT_STATE" |

### Role
| Field | Type |
|---|---|
| `roleInApplication` | "Primary" \| "Co-Borrower" \| "Guarantor" |
| `relationshipWithPrimary` | string |

### Residence
| Field | Type |
|---|---|
| `residenceType` | "Owned" \| "Rented" \| "Company Provided" \| "Family Property" |
| `yearsAtCurrentAddress` | number |
| `isNRI` | boolean |
| `nriCountry` | string |
| `applicantResidenceState` / `City` / `Pincode` | string |

### Credit History (V2)
| Field | Type |
|---|---|
| `creditHistoryStatus` | "defaulter" \| "guarantor" \| "both" \| "neither" |
| `emiBounceCount` / `recentEnquiryCount` | string |
| `defaultSettlementStatus` | string |
| `bounceReason` / `defaultReason` / `enquiryReason` | string |

### Employment & Income
| Field | Type |
|---|---|
| `employmentType` | string |
| `salariedProfile` | 12 boolean fields |
| `governmentProfile` | 17 boolean fields |
| `businessProfile` | 17 boolean fields |
| `pensionProfile` | 15 boolean fields |
| `creditScore` | number (0-900) |
| `lowCreditReasons` | 8 boolean fields |
| `grossIncome` / `netIncome` / `monthlyOtherIncome` | number (legacy) |
| `incomeEntries` | CleanIncomeEntry[] (V2 preferred) |
| `financials` | FinancialsData (self-employed) |
| `isNonEarning` | boolean |
| `noIncomeReason` | string |

### Obligations
| Field | Type |
|---|---|
| `hasExistingObligations` | boolean |
| `obligations` | ObligationEntry[] |

### Company-Specific
| Field | Type |
|---|---|
| `companyName` / `companyType` / `companyAge` | string/number |
| `directors` | DirectorInfo[] |
| `companyProfile` | enricher-derived family control |

---

## 14 Income Profile Types

| # | Profile Type | Haircut |
|---|---|---|
| 1 | `salaried_regular` | 0% |
| 2 | `salaried_contractual` | 0% |
| 3 | `government_central` | 0% |
| 4 | `government_state` | 0% |
| 5 | `government_defense` | 0% |
| 6 | `business_proprietorship` | 30% |
| 7 | `business_partnership` | 30% |
| 8 | `director_company` | 30% |
| 9 | `professional_practice` | 30% |
| 10 | `pension` | 0% |
| 11 | `rental_income` | 30% |
| 12 | `freelance_consulting` | 50% |
| 13 | `agriculture_income` | 75% |
| 14 | `investment_income` | 75% |

---

## Enricher `_computed` Fields

| Field | Type | Source |
|---|---|---|
| `_total_gross_monthly` | number | Sum of all applicant incomes |
| `_total_obligations_monthly` | number | Sum of EMI shares |
| `_third_party_emi_total` | number | Non-borrower EMIs |
| `_applicant_count` | number | Applicant array length |
| `_has_co_applicant` | boolean | > 1 applicant |
| `_primary_age` | number | First applicant age |
| `_primary_employment` | string | First applicant employment |
| `_max_cibil` / `_min_cibil` | number | Across all applicants |
| `_is_business_file` | boolean | Any self-employed |
| `_is_salaried_file` | boolean | Primary is salaried |
| `_income_source_count` | number | Total income entries |
| `_income_profile_types` | string[] | Unique profile types |
| `_total_vintage_years` | number | Max vintage years |
| `_facility_type` | string | Pass-through |
| `_is_credit_line_facility` | boolean | OD/DOD/CC |
| `_has_non_earner` | boolean | Any non-earning applicant |

### Top-Level Enriched Flags

| Field | Logic |
|---|---|
| `isSCST` | Any applicant SC or ST |
| `hasDisabledApplicant` | Any applicant has disability |
| `hasBlackMoney` | registryValue < propertyCost |
| `approvedByAuthority` | from propertyComplianceStatus |
| `asPerApprovedMap` | from propertyComplianceStatus |
| `naConversionComplete` | naConversionStatus = REGISTERED |
| `isResidentialZone` | zoneClassification = RESIDENTIAL |
| `isSelfOccupied` | propertyUsageIntent = self_occupied |
| `isInvestmentProperty` | propertyUsageIntent = investment |
| `hasMunicipalTaxRecords` | PAID_REGULAR or PAID_IRREGULAR |
| `hasUnauthorizedConstruction` | MINOR or MAJOR |
| `hasRevenueRecords` | AVAILABLE_CURRENT or AVAILABLE_OUTDATED |
| `isColonyRegularized` | colonyRegularizationStatus = REGULARIZED |
| `encumbranceCertificateVerified` | encumbranceCertStatus = CLEAR |
| `ownershipChainComplete` | titleChainStatus = CLEAR |
| `isDifferATSAndPropertyValue` | propertyCost != registryValue |
| `isNonRERA_UC` | Under Construction + NOT_REGISTERED |
| `isPoaSale` | sellerOwnershipType = POA_HOLDER |
| `isInheritedProperty` | seller/acquisition = INHERITED |
| `poaRegistered` | poaRegistrationStatus = REGISTERED |
| `isAgreementPoaDeal` | propertyAcquisitionMethod = AGREEMENT_POA |
| `isRecentRegistry` | underSixMonths or underOneYear |
| `isAuthorityFullyPaid` | authorityPaymentStatus = FULLY_PAID |
| `hasAllotmentLetter` | ORIGINAL or COPY AVAILABLE |
| `hasPossessionCert` | POSSESSION_CERT_AVAILABLE |
| `hasAuthorityDues` | MINOR_DUES or MAJOR_DUES |
| `auctionedProperty` | STANDARD=No, AUCTION_*=Yes |
| `understandsAsIsBasis` | AUCTION_AWARE=Yes |
| `isAuthorityPurchase` | purchaseType = direct_from_authority |
| `isEndorsement` | purchaseType = resale_endorsement |
| `isPropertyOnLoan` | from sellerOnLoan |
| `foreclosureAmount` | from sellerOutstandingAmount |
| `sellerLoanBankName` | from sellerCurrentLender |
| `effectiveMortgageYear` | resolved from mortgageYear + custom |
| `isPossessionOfferedByAuthority` | from bt_possessionAndDemandStatus |
| `isAnyDemandFromTheBuilder` | from bt_possessionAndDemandStatus |
| `noLegalDispute` | propertyDisputeStatus = CLEAR |

---

## Obligation Types

| Type | EMI Calculation | Examples |
|---|---|---|
| `term_loan` | Direct EMI amount | Home Loan, Personal Loan, Car Loan |
| `credit_line` | 5% of limit | CC Limit, OD Limit, Dropline OD |

---

## File Map

| File | Purpose |
|---|---|
| `payloadBuilder/types.ts` | All interfaces (645 lines) |
| `payloadBuilder/sanitizers.ts` | toNumber, toBoolean, deriveTitle |
| `payloadBuilder/activityProfiles.ts` | 5 profile builders |
| `payloadBuilder/incomePayload.ts` | Income entry extraction |
| `payloadBuilder/obligationPayload.ts` | Obligation cleaning |
| `payloadBuilder/applicantPayload.ts` | Single applicant builder |
| `payloadBuilder/loanTransaction.ts` | Loan transaction + main orchestrator |
| `payloadBuilder/comparePayloads.ts` | Diff utility |
| `ruleEngine/payloadEnricher.ts` | All _computed field derivations (799 lines) |
| `ruleEngine/systemConfig.ts` | Centralized constants (220 lines) |
