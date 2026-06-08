# Home Loan Questionnaire - Complete Decision Tree

This tree is derived from:

- `src/lib/server/formEngine/schemas/homeLoanSchemaV2.json`
- Runtime flow logic in `src/routes/(app)/form/home-loan/+page.svelte`

## 1) Master Flow Tree

```text
Home Loan Questionnaire
|
+-- Q0: loanType
|   |
|   +-- A) New Loan
|   |   |
|   |   +-- Q1: propertyIdentified
|   |       |
|   |       +-- A1) No (Pre-sanction flow)
|   |       |   |
|   |       |   +-- caseIntake_homeLoan
|   |       |   +-- tellUs_homeLoan (multi-applicant component flow)
|   |       |   +-- [single applicant only]
|   |       |   |   +-- applicantProfilePage
|   |       |   |   +-- incomeProfilesPage
|   |       |   |   +-- incomeDetailsPage (hidden if only_no_current_income)
|   |       |   |   +-- creditScorePage
|   |       |   |   +-- obligationsPage (only if ObligationsRunning == "Yes")
|   |       |   +-- sanctionProfile_homeLoan
|   |       |       +-- mortgageYear (+ custom if OTHER)
|   |       |       +-- sanctionType
|   |       |       +-- deposit (if Based on Downpayment)
|   |       |       +-- withPersonalLoan (if Based on Downpayment + deposit filled)
|   |       |
|   |       +-- A2) Yes (Property-identified flow)
|   |           |
|   |           +-- propertyLocation_homeLoan
|   |           |   +-- propertyAreaType
|   |           |   +-- purchaseType
|   |           |   +-- propertyStateName -> propertyCityName -> pincode
|   |           |
|   |           +-- propertyCharacter_homeLoan
|   |           |   +-- constructionType
|   |           |   +-- PropertyStage (mostly)
|   |           |   +-- propertyAge (for Ready / BT-registry shortcuts)
|   |           |   +-- carpetArea
|   |           |   +-- projectName (special branch)
|   |           |
|   |           +-- propertyCondition_homeLoan (area + stage-specific branching)
|   |           +-- sellerTransaction_homeLoan (for resale purchase types)
|   |           +-- sellerTransaction_authority_homeLoan (direct_from_authority only)
|   |           +-- legalVerification_homeLoan (area + legal chain branching)
|   |           +-- tellUs_homeLoan (multi-applicant component flow)
|   |           +-- [single applicant only] applicantProfilePage -> incomeProfilesPage -> incomeDetailsPage -> creditScorePage -> obligationsPage
|   |           +-- dealFinancials_homeLoan
|   |
|   +-- B) Balance Transfer Only
|   |   |
|   |   +-- caseIntake_homeLoan
|   |   +-- btRegistry_homeLoan (isRegistryDone branch)
|   |   +-- propertyLocation_homeLoan
|   |   +-- propertyCharacter_homeLoan
|   |   +-- propertyCondition_homeLoan
|   |   +-- sellerTransaction_homeLoan (if resale)
|   |   +-- legalVerification_homeLoan (includes NOC branch for BT types)
|   |   +-- tellUs_homeLoan (+ single-applicant pages where applicable)
|   |   +-- btExistingLoan_homeLoan
|   |   +-- loanRequirements_homeLoan (top-up fields hidden)
|   |
|   +-- C) Top-up Only
|   |   |
|   |   +-- caseIntake_homeLoan
|   |   +-- btRegistry_homeLoan
|   |   +-- propertyLocation_homeLoan
|   |   +-- propertyCharacter_homeLoan
|   |   +-- propertyCondition_homeLoan
|   |   +-- sellerTransaction_homeLoan (if resale)
|   |   +-- legalVerification_homeLoan
|   |   +-- tellUs_homeLoan (+ single-applicant pages where applicable)
|   |   +-- btExistingLoan_homeLoan
|   |   +-- loanRequirements_homeLoan (top-up fields shown)
|   |
|   +-- D) Balance Transfer With Top-up
|       |
|       +-- Same as BT flow until loanRequirements_homeLoan
|       +-- loanRequirements_homeLoan
|           +-- showResultOfBtWithTopUp
|           +-- if Yes -> topUpTenure -> topUpAmount -> topUpPurpose
|           +-- if No  -> BT-only style outcome
|
+-- Submission: /api/evaluate-and-persist
```

## 2) Property Subtree (New Loan + PropertyIdentified = Yes)

```text
propertyLocation_homeLoan
|
+-- propertyAreaType
|   +-- PLANNED_AUTHORITY
|   |   +-- purchaseType: direct_from_builder | direct_from_authority | resale_normal | resale_endorsement
|   +-- CONVERTED_RESIDENTIAL
|   |   +-- purchaseType: direct_from_builder | resale_normal | resale_endorsement
|   +-- OLD_MUNICIPAL
|   |   +-- purchaseType: direct_from_builder | resale_normal | resale_endorsement
|   +-- LOCAL_COLONY
|   |   +-- purchaseType: direct_from_builder | resale_normal | resale_endorsement
|   +-- UNKNOWN
|       +-- purchaseType: direct_from_builder | resale_normal | resale_endorsement
|
+-- propertyCharacter_homeLoan
|   +-- constructionType: House | Flat | Floor
|   +-- PropertyStage: Under Construction | Ready To Move (context-dependent)
|   +-- Under Construction -> constructionProgress + expectedCompletionDate + builderTrackRecord + projectApprovals
|
+-- propertyCondition_homeLoan
|   +-- Compliance branch by area type
|   |   +-- PLANNED_AUTHORITY -> q1a
|   |   +-- CONVERTED_RESIDENTIAL -> q1b
|   |   +-- OLD_MUNICIPAL -> q1c
|   |   +-- LOCAL_COLONY -> q1d
|   |   +-- UNKNOWN/empty -> q1e
|   +-- Area-specific conditional sets:
|       +-- Planned: RERA-related checks
|       +-- Converted: NA conversion + zone checks
|       +-- Municipal: tax + unauthorized additions
|       +-- Colony: revenue/regularization/panchayat chain
|
+-- sellerTransaction_homeLoan (only resale purchase types at page level)
|   +-- sellerOwnershipType
|   |   +-- if POA_HOLDER -> poaRegistrationStatus
|   +-- propertyAcquisitionMethod
|   |   +-- if AGREEMENT_POA -> registry willingness -> NBFC known -> NBFC name
|   +-- sellerOnLoan -> sellerOutstandingAmount -> sellerCurrentLender
|   +-- ifPropertyRegistered -> lastRegistryDuration
|   +-- isAnyBuilderDemand
|
+-- sellerTransaction_authority_homeLoan (direct_from_authority + New Loan only)
|   +-- allotmentLetterStatus
|   +-- allotmentDate
|   +-- authorityPaymentStatus
|   +-- possessionCertificateStatus
|   +-- authorityDuesStatus
|
+-- legalVerification_homeLoan
    +-- Documentation readiness branch by area type (q1a..q1e)
    +-- For BT types: nocFromPreviousLender
    +-- titleChainStatus -> encumbranceCertStatus -> succession/revenue mutation branches
    +-- Planned area may show RERA legal status branch
```

## 3) Applicant Subtree

`tellUs_homeLoan` is a component-driven flow (`ApplicantFormSecured`) and branches by applicant count/type.

```text
tellUs_homeLoan
|
+-- Applicant count / structure (individual/couple/family/company combos)
|
+-- If __applicantCount <= 1 (single applicant flattening):
|   +-- applicantProfilePage
|   +-- incomeProfilesPage
|   +-- incomeDetailsPage (unless only no_current_income profile)
|   +-- creditScorePage
|   +-- obligationsPage (only if ObligationsRunning == "Yes")
|
+-- If __applicantCount > 1:
    +-- stays in tellUs component tabs/steps:
        +-- basic details
        +-- relationships
        +-- profile & financials
```

## 4) BT/Top-up Loan Requirement Subtree

```text
loanRequirements_homeLoan
|
+-- if loanType == "Balance Transfer Only"
|   +-- top-up branch hidden
|
+-- if loanType == "Top-up Only"
|   +-- topUpTenure -> topUpAmount -> topUpPurpose
|
+-- if loanType == "Balance Transfer With Top-up"
    +-- showResultOfBtWithTopUp
        +-- Yes -> topUpTenure -> topUpAmount -> topUpPurpose
        +-- No  -> behave like BT-only output
```

## 5) Terminal Path Catalog (Operational Cases)

Use these as your scenario buckets for QA, analytics, and rule-debugging:

1. `NLPRE`: New Loan + Property Not Identified (Pre-sanction)
2. `NL-PA-DB`: New Loan + Planned Area + Direct from Builder
3. `NL-PA-DA`: New Loan + Planned Area + Direct from Authority
4. `NL-PA-RN`: New Loan + Planned Area + Resale Normal
5. `NL-PA-RE`: New Loan + Planned Area + Resale Endorsement
6. `NL-CR-*`: New Loan + Converted Residential + purchaseType variants
7. `NL-OM-*`: New Loan + Old Municipal + purchaseType variants
8. `NL-LC-*`: New Loan + Local Colony + purchaseType variants
9. `NL-UK-*`: New Loan + Unknown Area + purchaseType variants
10. `BT`: Balance Transfer Only
11. `TU`: Top-up Only
12. `BTTU-Y`: BT with Top-up + top-up selected (Yes path)
13. `BTTU-N`: BT with Top-up + top-up not selected (No path)

## 6) High-Impact Branch Controls (for dashboards and coverage)

Track these keys to classify every submission into a case bucket:

1. `loanType`
2. `propertyIdentified`
3. `propertyAreaType`
4. `purchaseType`
5. `isRegistryDone` (BT family)
6. `constructionType`
7. `PropertyStage`
8. `sellerOwnershipType`
9. `propertyAcquisitionMethod`
10. `documentationReadiness`
11. `ObligationsRunning`
12. `showResultOfBtWithTopUp`

## 7) Schema Risk Notes Discovered During Tree Analysis

These are logic risks affecting branch reachability:

1. Some showWhen rules still reference `"New Home Loan"` instead of `"New Loan"` (can hide intended New Loan questions).
2. One compliance branch uses `propertyAreaType == "PLACEHOLDER_REMOVED_FOR_Q6"` (likely unreachable).
3. Some conditions compare against `constructionType == "Under Construction"` where stage likely belongs to `PropertyStage`.

If needed, this document can be extended with a machine-generated path count and explicit question-level path IDs.
