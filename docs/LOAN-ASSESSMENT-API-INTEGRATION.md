# Loan Assessment API — Integration Specification

> **Version**: 1.0
> **Date**: 2026-02-16
> **Platform**: DigitalDSA
> **Purpose**: Complete specification for the external Loan Assessment API. Covers what we send, what we receive, what we need, and how results are consumed. This document is self-contained — no verbal explanation required.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Flow](#2-data-flow)
3. [API Endpoints (Current)](#3-api-endpoints-current)
4. [Request Payload — What We Send](#4-request-payload--what-we-send)
5. [Response Format — What We Currently Receive](#5-response-format--what-we-currently-receive)
6. [Ideal Response Format — What We Need](#6-ideal-response-format--what-we-need)
7. [Field Mapping: Current vs Ideal](#7-field-mapping-current-vs-ideal)
8. [Loan-Type-Specific Variations](#8-loan-type-specific-variations)
9. [Error Handling Contract](#9-error-handling-contract)
10. [Appendix A: Full Type Definitions](#appendix-a-full-type-definitions)
11. [Appendix B: Sample Payloads](#appendix-b-sample-payloads)

---

## 1. Overview

DigitalDSA is a platform for Direct Selling Agents (DSAs) who process home loans, LAP, personal loans, business loans, and more. When a DSA fills out a loan application form, the platform:

1. Collects structured data (loan details + applicant profiles + income + obligations)
2. Sends the data to an **external Loan Assessment API**
3. Receives per-lender eligibility results (eligible amount, ROI, EMI, tenure)
4. Persists results in MongoDB and displays them to the DSA

**6 loan types** are supported:

| #   | Loan Type                   | Internal Key                 | Category  |
| --- | --------------------------- | ---------------------------- | --------- |
| 1   | Home Loan                   | `Home Loan`                  | Secured   |
| 2   | Loan Against Property (LAP) | `Loan Against Property`      | Secured   |
| 3   | Plot & Construction Loan    | `Plot and Construction Loan` | Secured   |
| 4   | Personal Loan               | `Personal Loan`              | Unsecured |
| 5   | Business Loan               | `Business Loan - Unsecured`  | Unsecured |
| 6   | Professional Loan           | `Business Loan - Secured`    | Unsecured |

---

## 2. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DigitalDSA Platform                          │
│                                                                 │
│  ┌──────────┐    ┌────────────────┐    ┌───────────────────┐   │
│  │ Form Page │───>│ /evaluating    │───>│ POST to Loan      │   │
│  │ (6 types) │    │ (orchestrator) │    │ Assessment API     │──────> External API
│  └──────────┘    └────────────────┘    └───────────────────┘   │
│                          │                      │               │
│                          │              Response (LoanOffer[])  │
│                          │                      │               │
│                          v                      v               │
│                  ┌────────────────┐    ┌───────────────────┐   │
│                  │ Create Case    │    │ Transform to      │   │
│                  │ + FormSnapshot │    │ LenderResultsData │   │
│                  └────────────────┘    └───────────────────┘   │
│                          │                      │               │
│                          v                      v               │
│                  ┌────────────────────────────────────┐        │
│                  │ MongoDB: Case + FormSnapshot +     │        │
│                  │ LenderResultsSnapshot              │        │
│                  └────────────────────────────────────┘        │
│                          │                                      │
│                          v                                      │
│                  ┌────────────────────────────────────┐        │
│                  │ Results Page: per-lender cards,    │        │
│                  │ traffic lights, comparisons        │        │
│                  └────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

**Key point**: The API call is made from the client browser (not server-to-server). The payload is sent as `POST` with `Content-Type: application/json`.

---

## 3. API Endpoints (Current)

> **2026-05-31 correction:** `bank-loan-management.vercel.app` is **dead infrastructure from DigitalDSA-V3's perspective**. Investigation during the field-nomenclature rename confirmed `submitHomeLoanApplication` / `submitBalanceTransferApplication` / `submitTopupLoanApplication` (in `src/lib/services/homeLoanApi.ts`) — the only DigitalDSA code that POSTs to that endpoint — have **zero callers across `src/routes/`**. The live submit path goes through `POST /api/evaluate-and-persist` (in-house, server-side) → in-house rule engine (`src/lib/ruleEngine/`) → MongoDB. No outbound call to bank-loan-management is made during DSA form submission. The table below documents the **historical contract** of the bank-loan-management endpoint (still potentially relevant for the other repo's standalone API consumers); the **DigitalDSA submit flow is internal**.

### Historical contract — bank-loan-management endpoint (DigitalDSA does NOT hit this)

| Loan Type           | Endpoint                                                           | Method |
| ------------------- | ------------------------------------------------------------------ | ------ |
| Home Loan           | `https://bank-loan-management.vercel.app/api/loan-offers`          | POST   |
| LAP                 | `https://bank-loan-management.vercel.app/api/loan-offers`          | POST   |
| Plot & Construction | `https://bank-loan-management.vercel.app/api/loan-offers`          | POST   |
| Personal Loan       | `https://bank-loan-management.vercel.app/api/loan-offers`          | POST   |
| Business Loan       | `https://bank-loan-management.vercel.app/api/loan-offers`          | POST   |
| Professional Loan   | `https://bank-loan-ground.vercel.app/api/loan-offers`              | POST   |

### Live DigitalDSA-V3 submit path (post-rename)

```
loan form +page.svelte
  → confirmAndSubmit() [Pitfall #47 modal wrapper]
    → submitFormForEvaluation() [src/lib/utils/formSubmitHandler.ts]
      → POST /api/evaluate-and-persist (in-house, server-side)
        → evaluatePayload() [src/lib/ruleEngine/]
        → persist LenderResultsSnapshot to MongoDB
      → goto('/evaluating') → goto('/dashboard/dsa/cases/[case_id]/results')
```

Payload shape: camelCase canonical (`loanName` / `loanType` / `facilityType` / `loanVariant`) per the 2026-05-31 four-field model. See ADR-0020.

**Notes**:

- Response is expected as JSON.
- Cleanup of the dormant `homeLoanApi.ts` module + 2 dormant offer pages + 4 dead OFFERS route constants is tracked as a follow-up to the field-nomenclature rename (see [ADR-0020 §"2026-05-31 Amendment"](adr/0020-loan-field-nomenclature.md)).

---

## 4. Request Payload — What We Send

Every request has the same top-level structure:

```typescript
{
  "loanTransaction": { ... },        // Loan details, property info, BT/top-up details
  "allApplicantDetails": [ ... ]     // Array of applicant objects (or single object for unsecured)
}
```

### 4.1 `loanTransaction` — Common Fields (All Loan Types)

| Field                                | Type   | Required | Description                                                                                                                           |
| ------------------------------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `LoanName`                           | string | YES      | `"Home Loan"`, `"Loan Against Property"`, `"Plot and Construction Loan"`, `"Personal Loan"`, `"Business Loan"`, `"Professional Loan"` |
| `LoanType`                           | string | YES      | `"New Loan"`, `"Balance Transfer"`, `"Top-up"`                                                                                        |
| `mortgageYear`                       | number | YES      | Requested tenure in years                                                                                                             |
| `RequiredLoanAmount` or `loanAmount` | number | YES      | Requested loan amount in INR                                                                                                          |
| `numberOfDirectorOrApplicant`        | number | NO       | Number of applicants (default: 1)                                                                                                     |

### 4.2 `loanTransaction` — Secured Loan Fields (Home Loan, LAP, Plot)

| Field                  | Type   | Required | Description                                                                 |
| ---------------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `propertyIdentified`   | string | YES      | Always `"Yes"`                                                              |
| `approvedByAuthority`  | string | YES      | `"Yes"` / `"No"`                                                            |
| `ContinuityProof`      | string | YES      | Always `"Yes"`                                                              |
| `ifPropertyRegistered` | string | YES      | `"Yes"` / `"No"`                                                            |
| `propertyStateName`    | string | NO       | State where property is located                                             |
| `propertyCityName`     | string | NO       | City where property is located                                              |
| `propertyType`         | string | NO       | `"Flat"`, `"House"`, `"Villa"`, `"Plot"`, `"Commercial"`                    |
| `purchaseType`         | string | NO       | `"Direct Sale"`, `"Resale"`                                                 |
| `constructionType`     | string | NO       | `"House"`, `"Flat"`, etc.                                                   |
| `PropertyStage`        | string | NO       | `"Foundation"`, `"Plinth"`, `"Superstructure"`, `"Finishing"`, `"Complete"` |
| `propertyCost`         | number | NO       | Total property cost / deal value in INR                                     |
| `dealValue`            | number | NO       | Transaction value (if different from cost)                                  |
| `downPayment`          | number | NO       | Down payment amount in INR                                                  |

### 4.3 `loanTransaction` — LAP-Specific Fields

| Field                                  | Type   | Required | Description                                          |
| -------------------------------------- | ------ | -------- | ---------------------------------------------------- |
| `LAPType`                              | string | YES      | LAP sub-type from form                               |
| `BasedOnITR`                           | string | NO       | `"Based on 3 years of ITRs"` (default)               |
| `incomeTaxAvailableThreeFinancialYear` | string | NO       | `"Yes"` / `"No"`                                     |
| `typeOfOccupationProperty`             | string | NO       | `"Self-occupied"`, `"Rented"`, `"Vacant"`            |
| `carpetArea`                           | number | NO       | Property area (normalized to sq ft)                  |
| `carpetAreaUnit`                       | string | NO       | Original unit: `"Feet"`, `"Meter"`, `"Yard"`         |
| `propertyAreaType`                     | string | NO       | Land type classification                             |
| `leaseRemainingPeriod`                 | string | NO       | If leasehold                                         |
| `existingEncumbrance`                  | string | NO       | `"Yes"` / `"No"` — existing mortgage on property     |
| `ocCcAvailable`                        | string | NO       | `"BOTH"`, `"CC_ONLY"`, `"NONE"`, `"UNKNOWN"`         |
| `municipalApproval`                    | string | NO       | `"APPROVED"`, `"PARTIAL"`, `"NO_PLAN"`               |
| `rentalIncome`                         | number | NO       | Monthly rental if property is rented                 |
| `loanPurpose`                          | string | NO       | `"BUSINESS_EXPANSION"`, `"DEBT_CONSOLIDATION"`, etc. |

### 4.4 `loanTransaction` — Unsecured Loan Fields (Personal, Business, Professional)

| Field                | Type   | Required | Description                                                 |
| -------------------- | ------ | -------- | ----------------------------------------------------------- |
| `unSecureLoanType`   | string | YES      | `"Personal Loan"`, `"Business Loan"`, `"Professional Loan"` |
| `ObligationsRunning` | string | YES      | `"Yes"` / `"No"`                                            |
| `tenure`             | number | NO       | Alternative to `mortgageYear` for unsecured                 |

### 4.5 `loanTransaction` — Balance Transfer Fields

These are present only when `LoanType === "Balance Transfer"`:

| Field                          | Type   | Description                                         |
| ------------------------------ | ------ | --------------------------------------------------- |
| `selectSingleBank`             | string | Current lender bank name                            |
| `principalOutstanding`         | number | Outstanding principal in INR                        |
| `existingInterestRate`         | number | Current interest rate %                             |
| `remainingTenure`              | number | Remaining tenure (months)                           |
| `includedCurrentEMIsAmount`    | number | Current EMI amount                                  |
| `sixMonthsPassedAfterRegistry` | string | `"Yes"` / `"No"`                                    |
| `currentPropertyValue`         | number | Current market value for LTV                        |
| `newTenure`                    | number | Desired new tenure                                  |
| `loanVintage`                  | string | Time with current lender (e.g., `"2-3 years"`)      |
| `repaymentTrack`               | string | `"CLEAN"`, `"MINOR_IRREGULAR"`, `"MAJOR_IRREGULAR"` |

### 4.6 `loanTransaction` — Top-Up Fields

These are present only when `LoanType === "Top-up"`:

| Field                                 | Type   | Description          |
| ------------------------------------- | ------ | -------------------- |
| `requiredTopupAmount` / `topUpAmount` | number | Top-up amount needed |
| `topupTerm` / `topUpTenure`           | number | Top-up tenure        |

---

### 4.7 `allApplicantDetails` — Per-Applicant Fields

**For Secured loans** (Home Loan, LAP, Plot): this is an **array** of applicant objects.
**For Unsecured loans** (Personal, Business, Professional): this is a **single object** (not wrapped in array).

Each applicant object contains:

#### Identity & Demographics

| Field                 | Type   | Required | Description                                                   |
| --------------------- | ------ | -------- | ------------------------------------------------------------- |
| `fullNameOfApplicant` | string | YES      | Full name                                                     |
| `selectedAge`         | number | YES      | Age in years                                                  |
| `gender`              | string | NO       | `"Male"`, `"Female"`, `"Other"`                               |
| `maritalStatus`       | string | NO       | `"Single"`, `"Married"`, `"Divorced"`, `"Widowed"`            |
| `title`               | string | NO       | `"Mr"`, `"Mrs"`, `"Ms"`, `"Dr"`                               |
| `TypeOfResidence`     | string | NO       | `"Owned"`, `"Rented"`, `"Company Provided"`, `"Family Owned"` |
| `applicantType`       | string | NO       | `"Individual"` (default) or `"Company"`                       |

#### Employment & Income

| Field                | Type          | Required    | Description                                                                                           |
| -------------------- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `employmentType`     | string        | YES         | See [Employment Types](#employment-types) below                                                       |
| `creditScore`        | number/string | YES         | CIBIL score (300-900)                                                                                 |
| `grossIncome`        | number        | CONDITIONAL | Monthly gross (salaried only)                                                                         |
| `netIncome`          | number        | CONDITIONAL | Monthly net (salaried/pensioner only)                                                                 |
| `fixedSalary`        | number        | CONDITIONAL | Monthly fixed salary (salaried only)                                                                  |
| `monthlyOtherIncome` | number        | CONDITIONAL | Other monthly income (salaried only)                                                                  |
| `grossReceipts`      | number[]      | CONDITIONAL | Year-wise gross receipts (self-employed, 3 years)                                                     |
| `netProfit`          | number[]      | CONDITIONAL | Year-wise net profit (self-employed, 3 years) — `netProfitArray` in some contexts                     |
| `depreciation`       | number[]      | CONDITIONAL | Year-wise depreciation (self-employed, 3 years) — `depreciationArray` in some contexts                |
| `turnOver`           | number[]      | CONDITIONAL | Year-wise turnover (self-employed)                                                                    |
| `itrFiled`           | string[]      | CONDITIONAL | ITR filing status per year (e.g., `["Filed", "Filed", "Not Filed"]`) — **never converted to numbers** |

#### Employment Types

| Value                           | Category      | Income Fields Used                                       |
| ------------------------------- | ------------- | -------------------------------------------------------- |
| `"Salaried(Private)"`           | Salaried      | grossIncome, netIncome, fixedSalary, monthlyOtherIncome  |
| `"Salaried(Government)"`        | Salaried      | grossIncome, netIncome, fixedSalary, monthlyOtherIncome  |
| `"Self-employed(Professional)"` | Self-employed | grossReceipts[], netProfit[], depreciation[], turnOver[] |
| `"Self-employed(Businessman)"`  | Self-employed | grossReceipts[], netProfit[], depreciation[], turnOver[] |
| `"Self-employed(Other)"`        | Self-employed | grossReceipts[], netProfit[], depreciation[], turnOver[] |
| `"Pensioner"`                   | Pension       | netIncome                                                |

**Important**: When employment type is self-employed, salaried income fields are **deleted** from the payload (and vice versa). The API must handle both shapes.

#### Obligations

| Field                | Type         | Required    | Description                                    |
| -------------------- | ------------ | ----------- | ---------------------------------------------- |
| `ObligationsRunning` | string       | NO          | `"Yes"` / `"No"`                               |
| `obligations`        | array        | CONDITIONAL | Only present if `ObligationsRunning === "Yes"` |
| `tableLoanEntries`   | LoanEntry[]  | CONDITIONAL | Existing loan details                          |
| `tableLimitEntries`  | LimitEntry[] | CONDITIONAL | Existing credit limits                         |

Each `LoanEntry`:

```typescript
{
  loanType: string,           // "Home Loan", "Car Loan", "Personal Loan", etc.
  bankName: string,
  selectedToClose: string,    // "Self-funded", "Top-up", "Keep running", "Not my liability"
  emi: string,                // Monthly EMI (Indian formatted: "45,000")
  totalLimit: string,
  tenure: string,             // Remaining tenure in months
  interestRate: string,       // Current rate %
  remainingLimit: string,
  utilizedAmount: string
}
```

#### Company Applicant (when `applicantType === "Company"`)

| Field                | Type   | Description                                                                                     |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `companyName`        | string | Registered company name                                                                         |
| `companyType`        | string | `"One Person Company (OPC)"`, `"Private Limited"`, `"LLP"`, `"Partnership"`, `"Proprietorship"` |
| `companySelectedAge` | number | Years since incorporation                                                                       |
| `directors`          | array  | Director details (only if NOT OPC)                                                              |
| `numberOfDirectors`  | number | Count of directors                                                                              |

#### Multi-Applicant Fields (Secured Loans)

| Field                 | Type   | Description                                                                |
| --------------------- | ------ | -------------------------------------------------------------------------- |
| `relationType`        | string | Relationship category                                                      |
| `relation`            | string | Specific relationship (e.g., `"Spouse"`, `"Father"`, `"Business Partner"`) |
| `relatedApplicant`    | string | Name of related applicant                                                  |
| `RelationWithPrimary` | string | Explicit: `"Spouse"` (auto-set for couples)                                |

#### NRI Applicant

| Field            | Type   | Description                                 |
| ---------------- | ------ | ------------------------------------------- |
| `isApplicantNRI` | string | `"Yes"` / `"No"`                            |
| (GPA details)    | object | Power of Attorney holder information if NRI |

---

## 5. Response Format — What We Currently Receive

The API returns a JSON array of `LoanOffer` objects (one per lender):

```typescript
// Response: LoanOffer[]
[
	{
		// ── Core Loan Terms ──
		SanctionAmount: 4500000, // Approved amount in INR
		emi: 38750, // Monthly EMI in INR
		tenure: 240, // Tenure in months
		annualRate: 8.75, // Interest rate %
		maximumEligibleEmi: 45000,

		// ── Eligibility Status ──
		error: {
			status: 'Eligible', // "Eligible" | "Partially Eligible" | "Not Eligible" | "Rejected"
			reasons: [], // Array of reason strings (populated for non-eligible)
			message: 'Eligible for full amount' // Optional human-readable message
		},

		// ── Deep Eligibility Data ──
		checkEligibilityData: {
			maxEligibleLoanAmount: 5200000, // Max eligible before caps
			foir: 0.42, // Fixed Obligation to Income Ratio (0-1)
			emi: 38750,
			interestRate: 8.75,
			eligibleTenure: 240,
			tenure: 240,
			RequiredLoanAmount: 4500000,
			maximumLoanCapacity: 6000000,
			totalMonthlyIncome: 125000,

			// Tenure constraints (why tenure was limited)
			maximumTenure: [
				{ maxTenure: 360, reasonValue: 35, reason: 'Age-based maximum' },
				{ maxTenure: 240, reasonValue: 0, reason: 'Product limit' }
			],

			// ROI constraints (why rate is what it is)
			minimumInterestRate: [
				{ minInterestRate: 8.5, reasonValue: 780, reason: 'CIBIL score' },
				{ minInterestRate: 8.75, reasonValue: 0, reason: 'Salaried rate' }
			],

			// FOIR constraints (why FOIR was capped)
			highestFOIR: [
				{ maxFOIR: 0.55, reasonValue: 125000, reason: 'Income bracket' },
				{ maxFOIR: 0.5, reasonValue: 0, reason: 'Product policy' }
			],

			loanCharges: ['Processing fee: 0.5%', 'Stamp duty: As applicable'],
			requiredDocument: ['PAN Card', 'Aadhaar', '3 months salary slips', '6 months bank statement'],
			bank_feature: {
				flexibility: ['Part prepayment allowed', 'Top-up available after 12 EMIs'],
				digital: ['Online disbursement tracking', 'E-mandate facility']
			}
		},

		// ── Lender Identity ──
		bankName: 'Axis Bank', // IMPORTANT: Lender name
		productName: 'Home Loan Regular', // Product variant

		// ── Additional Info ──
		suggestionMsg: [
			'Adding a co-applicant with income can increase eligibility by 30%',
			'Consider 25-year tenure for lower EMI'
		],
		requiredDocuments: ['PAN', 'Aadhaar', 'Salary slips (3 months)'],
		loanCharges: ['0.5% processing fee', 'Nil prepayment charges'],
		feature: {
			flexibility: ['Part prepayment allowed after 6 months'],
			benefits: ['No hidden charges']
		},

		// ── Display Fields ──
		loanType: 'Home Loan',
		downPayment: 500000,
		propertyValue: 5000000,
		showDetails: false
	}
	// ... more lender objects
];
```

### Current Response Gaps

The following fields are **NOT in the current response** but are needed by our platform:

| Missing Field                          | Why We Need It                                      | Current Workaround                                    |
| -------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `lender_id` (unique, stable)           | Track lender across re-evaluations                  | We generate `lender-{index}-{name}` (fragile)         |
| `traffic_light` (explicit)             | We derive it from `error.status` string matching    | Derive: "Eligible"=green, "Partially"=amber, else=red |
| `ltv_capped_amount`                    | Show LTV-constrained amount separately              | Not shown                                             |
| `processing_fee_percent`               | Show true cost of borrowing                         | Not shown                                             |
| `approval_probability` (0-1)           | Confidence score                                    | We hardcode: green=0.8, amber=0.5, red=0.2            |
| `cibil_used`                           | Which CIBIL score was applied                       | Not shown                                             |
| Per-factor `impact` classification     | Know if a factor helped or hurt                     | We guess from context                                 |
| `improvement_suggestions` (structured) | Actionable advice per lender                        | `suggestionMsg` is unstructured text                  |
| `corporate_dsa_channels`               | Compare DSA payout channels                         | Not available                                         |
| `rm_contact`                           | RM assignment per lender                            | Not available                                         |
| `cross_sell_opportunities`             | When LTV gap exists, suggest personal/business loan | Not available                                         |

---

## 6. Ideal Response Format — What We Need

If the API is being redesigned, here is the **ideal response format** our platform is built to consume. This maps directly to our internal `LenderResultsData` type:

```typescript
// Ideal API Response
{
  "summary": {
    "total_lenders": 32,
    "green_count": 18,
    "amber_count": 8,
    "red_count": 6,
    "best_amount": { "value": 5200000, "lender": "SBI" },
    "best_roi": { "value": 8.35, "lender": "Bank of Baroda" },
    "best_emi": { "value": 35200, "lender": "Bank of Baroda" },
    "requested_amount": 4500000,
    "loan_type": "Home Loan"
  },

  "results": [
    {
      "lender_application_id": "axis-hl-regular",   // Stable, unique per lender-product combo
      "lender_name": "Axis Bank",
      "traffic_light": "green",                      // Explicit, not derived
      "traffic_light_message": "Eligible for full requested amount",

      "eligible_amount": 5200000,                    // Before LTV cap
      "ltv_capped_amount": 4500000,                  // After LTV cap (secured only)
      "offered_amount": 4500000,                     // Final offered = min(eligible, LTV, requested)
      "roi": 8.75,
      "emi": 38750,
      "tenure_months": 240,
      "processing_fee_percent": 0.5,

      "rating": "good",                              // "excellent" | "good" | "average" | "poor"
      "metric_ratings": {
        "amount": "good",
        "roi": "average",
        "emi": "good",
        "tenure": "good"
      },

      "factors": [
        {
          "id": "foir-check",
          "label": "FOIR",
          "impact": "positive",                      // "positive" | "negative" | "neutral"
          "description": "FOIR at 42% is within the 55% limit",
          "metric": {
            "label": "FOIR",
            "value": "42%",
            "benchmark": "max 55%"
          },
          "category": "obligation"                   // "income" | "credit" | "property" | "obligation" | "profile" | "policy"
        },
        {
          "id": "cibil-check",
          "label": "CIBIL Score",
          "impact": "positive",
          "description": "Score of 780 qualifies for best rates",
          "metric": {
            "label": "CIBIL",
            "value": "780",
            "benchmark": "min 700"
          },
          "category": "credit"
        },
        {
          "id": "age-tenure",
          "label": "Age-Based Tenure",
          "impact": "negative",
          "description": "Tenure capped at 20 years due to applicant age (45)",
          "metric": {
            "label": "Max Tenure",
            "value": "20 years",
            "benchmark": "30 years (age < 35)"
          },
          "category": "profile"
        }
      ],

      "suggestions": [
        {
          "id": "add-coapplicant",
          "title": "Add a co-applicant",
          "description": "Adding a co-applicant with ₹50K+ income can increase eligible amount by 30-40%",
          "potential_impact": {
            "metric": "amount",
            "direction": "increase",
            "estimated_value": "up to ₹20L more"
          },
          "effort": "moderate"                       // "easy" | "moderate" | "significant"
        }
      ],

      "corporate_dsas": [
        {
          "name": "Axis Home Finance Channel",
          "payout_percent": 0.75,
          "comparison": "better",                    // vs DSA's own channel
          "benefits": ["Faster processing", "Dedicated RM"]
        }
      ],

      "rm_contact": {
        "rm_name": "Rahul Sharma",
        "phone": "+919876543210",
        "whatsapp": "+919876543210",
        "designation": "Senior Manager - Home Loans"
      },

      "key_metrics": {
        "foir": 0.42,
        "ltv": 0.75,
        "net_income": 125000,
        "cibil": 780,
        "approval_probability": 0.85
      },

      "computed_at": "2026-02-16T10:30:00Z"
    }
    // ... more lender results
  ],

  "cross_sell": [
    {
      "parent_lender": "HDFC Bank",
      "shortfall": 1500000,                          // Gap between eligible and LTV-capped
      "loan_type": "Personal Loan",
      "explanation": "HDFC can sanction ₹60L but LTV limits it to ₹45L. The ₹15L gap can be covered with a Personal Loan.",
      "options": [
        { "lender": "Bajaj Finserv", "amount": 1500000, "roi": 11.5, "emi": 35800 },
        { "lender": "IDFC First", "amount": 1500000, "roi": 12.0, "emi": 36200 }
      ]
    }
  ],

  "computed_at": "2026-02-16T10:30:00Z"
}
```

---

## 7. Field Mapping: Current vs Ideal

### 7.1 Fields We Can Map Today (Current API → Internal Format)

| Current API Field                            | Internal Field            | Quality                      |
| -------------------------------------------- | ------------------------- | ---------------------------- |
| `bankName` / `productName`                   | `lender_name`             | Good                         |
| `error.status`                               | `traffic_light`           | Derived (string matching)    |
| `error.message`                              | `traffic_light_message`   | Good                         |
| `checkEligibilityData.maxEligibleLoanAmount` | `eligible_amount`         | Good                         |
| `SanctionAmount`                             | `offered_amount`          | Good                         |
| `annualRate`                                 | `roi`                     | Good                         |
| `emi`                                        | `emi`                     | Good                         |
| `tenure`                                     | `tenure_months`           | Good                         |
| `checkEligibilityData.foir`                  | `key_metrics.foir`        | Good                         |
| `checkEligibilityData.totalMonthlyIncome`    | `key_metrics.net_income`  | Good                         |
| `error.reasons[]`                            | `factors[]` (as negative) | Partial — no impact/category |
| `suggestionMsg[]`                            | `factors[]` (as neutral)  | Partial — unstructured text  |
| `requiredDocuments`                          | (displayed separately)    | Good                         |
| `loanCharges`                                | (displayed separately)    | Good                         |

### 7.2 Fields We Cannot Map (Missing from Current API)

| Internal Field                     | Status    | Impact on Platform                                                           |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `lender_application_id` (stable)   | MISSING   | We generate fragile index-based IDs; change deltas across versions may break |
| `ltv_capped_amount`                | MISSING   | Cannot show LTV analysis for secured loans                                   |
| `processing_fee_percent`           | MISSING   | Cannot calculate true cost of borrowing                                      |
| `rating`                           | DERIVED   | Approximated from traffic_light (not lender-specific)                        |
| `metric_ratings.*`                 | DERIVED   | Approximated against static benchmarks                                       |
| `key_metrics.cibil`                | MISSING   | Cannot show CIBIL as a decision factor                                       |
| `key_metrics.ltv`                  | MISSING   | Cannot show LTV ratio                                                        |
| `key_metrics.approval_probability` | HARDCODED | Using 0.8/0.5/0.2 based on traffic light                                     |
| `factors[].impact`                 | MISSING   | Cannot distinguish positive/negative factors                                 |
| `factors[].category`               | MISSING   | Cannot group factors by category                                             |
| `suggestions[]` (structured)       | MISSING   | No actionable improvement advice                                             |
| `corporate_dsas[]`                 | MISSING   | No payout channel comparison                                                 |
| `rm_contact`                       | MISSING   | No RM assignment                                                             |
| `cross_sell[]`                     | MISSING   | No gap analysis / cross-sell                                                 |

---

## 8. Loan-Type-Specific Variations

### 8.1 Payload Shape Differences

| Feature                                              | Home Loan | LAP   | Plot  | Personal      | Business      | Professional  |
| ---------------------------------------------------- | --------- | ----- | ----- | ------------- | ------------- | ------------- |
| `allApplicantDetails` type                           | Array     | Array | Array | Single Object | Single Object | Single Object |
| Max applicants                                       | 4         | 4     | 4     | 1             | 1             | 1             |
| Property fields                                      | YES       | YES   | YES   | NO            | NO            | NO            |
| `LAPType` field                                      | NO        | YES   | NO    | NO            | NO            | NO            |
| `unSecureLoanType` field                             | NO        | NO    | NO    | YES           | YES           | YES           |
| `ObligationsRunning` in loanTransaction              | NO        | NO    | NO    | YES           | YES           | YES           |
| Balance Transfer support                             | YES       | YES   | NO    | YES           | YES           | YES           |
| Top-up support                                       | YES       | YES   | NO    | YES           | YES           | YES           |
| Company applicant support                            | YES       | YES   | YES   | NO            | YES           | YES           |
| Directors array                                      | YES       | YES   | YES   | NO            | YES           | YES           |
| LAP-specific fields (carpet area, encumbrance, etc.) | NO        | YES   | NO    | NO            | NO            | NO            |

### 8.2 Employment-Based Income Field Routing

The API must handle that **different employment types send different income fields**:

| Employment Type                                | Fields PRESENT                                                                                            | Fields ABSENT                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Salaried (Private/Government)                  | `grossIncome`, `netIncome`, `fixedSalary`, `monthlyOtherIncome`                                           | `netProfitArray`, `turnOver`, `depreciationArray`, `grossReceipts` |
| Self-employed (Professional/Businessman/Other) | `netProfitArray` or `netProfit[]`, `turnOver`, `depreciationArray` or `depreciation[]`, `grossReceipts[]` | `monthlyOtherIncome`, `grossIncome`, `fixedSalary`, `netIncome`    |
| Pensioner                                      | `netIncome`                                                                                               | Most other income fields                                           |

---

## 9. Error Handling Contract

### 9.1 Expected HTTP Responses

| Status | Meaning         | Body                                    |
| ------ | --------------- | --------------------------------------- |
| 200    | Success         | `LoanOffer[]` (array of lender results) |
| 400    | Invalid payload | `{ "error": "description" }`            |
| 429    | Rate limited    | `{ "error": "Too many requests" }`      |
| 500    | Server error    | `{ "error": "Internal server error" }`  |

### 9.2 Per-Lender Error Handling

Individual lenders can fail while others succeed. This is communicated via the `error.status` field within each `LoanOffer`:

| `error.status`                    | Our Interpretation             | Traffic Light |
| --------------------------------- | ------------------------------ | ------------- |
| `"Eligible"` / `"Fully Eligible"` | Full eligibility               | GREEN         |
| `"Partially Eligible"`            | Reduced amount/different terms | AMBER         |
| `"Not Eligible"` / `"Rejected"`   | Cannot offer                   | RED           |
| (missing/unknown)                 | Indeterminate                  | GREY          |

### 9.3 Timeout Handling

- We show a "taking longer" message after **8 seconds**
- We show a retry button after **15 seconds**
- No hard timeout from our side — we wait for the API response or browser timeout

---

## Appendix A: Full Type Definitions

### A.1 What We Send — `LoanApplication`

```typescript
interface LoanApplication {
	loanTransaction: {
		LoanName: string;
		LoanType: string;
		unSecureLoanType?: string;
		existingLoan?: string;
		payslips?: string;
		Form16Available?: string;
		ApplicantIsNRI?: string;
		residenceStateName?: string;
		residenceCityName?: string;
		salariedBankName?: string;
		tellUsApplying?: string;
		mortgageYear?: number;
		SpecificLoanRequirement?: string;
		tableLoanEntries?: LoanEntry[];
		tableLimitEntries?: LimitEntry[];
		RequiredLoanAmount?: number;
		loanAmount?: number;
		// ... all fields from Section 4
	};
	allApplicantDetails: ApplicantDetail[] | ApplicantDetail;
}
```

### A.2 What We Receive — `LoanOffer`

```typescript
interface LoanOffer {
	SanctionAmount: number;
	emi: number;
	tenure: number;
	annualRate: number;
	maximumEligibleEmi: number;
	suggestionMsg: string[];
	suggestions?: string[];
	error?: {
		status: string;
		reasons: string[];
		message?: string;
	};
	requiredDocuments: string[];
	loanCharges: string[];
	feature: { [key: string]: string[] };
	checkEligibilityData: {
		error?: { status: string; reasons: string[] };
		maxEligibleLoanAmount: number;
		foir: number;
		emi: number;
		maximumTenure: Array<{ maxTenure: number; reasonValue: number; reason: string }>;
		minimumInterestRate: Array<{ minInterestRate: number; reasonValue: number; reason: string }>;
		highestFOIR: Array<{ maxFOIR: number; reasonValue: number; reason: string }>;
		interestRate: number;
		eligibleTenure: number;
		tenure: number;
		RequiredLoanAmount: number;
		maximumLoanCapacity: number;
		loanCharges: string[];
		totalMonthlyIncome: number;
		requiredDocument: string[];
		bank_feature: { [key: string]: string[] };
	};
	bankName?: string;
	productName?: string;
	loanType?: string;
	topDetails?: Record<string, any>;
	principalOutstandingDetail?: Record<string, any>;
	loanData?: Record<string, any>;
	showDetails?: boolean;
	downPayment?: number;
	message?: string;
	propertyValue?: number;
	estimatedEmi?: number;
	requiredDeposit?: number;
	shortDownPayment?: number;
}
```

### A.3 What We Want — `LenderResultsData` (Ideal)

```typescript
interface LenderResultsData {
	summary: {
		total_lenders: number;
		green_count: number;
		amber_count: number;
		red_count: number;
		best_amount: { value: number; lender: string };
		best_roi: { value: number; lender: string };
		best_emi: { value: number; lender: string };
		requested_amount: number;
		loan_type: string;
	};
	results: Array<{
		lender_application_id: string;
		lender_name: string;
		traffic_light: 'green' | 'amber' | 'red' | 'grey';
		traffic_light_message: string;
		eligible_amount: number;
		ltv_capped_amount?: number;
		offered_amount: number;
		roi: number;
		emi: number;
		tenure_months: number;
		processing_fee_percent?: number;
		rating: 'excellent' | 'good' | 'average' | 'poor';
		metric_ratings: {
			amount: 'excellent' | 'good' | 'average' | 'poor';
			roi: 'excellent' | 'good' | 'average' | 'poor';
			emi: 'excellent' | 'good' | 'average' | 'poor';
			tenure: 'excellent' | 'good' | 'average' | 'poor';
		};
		factors: Array<{
			id: string;
			label: string;
			impact: 'positive' | 'negative' | 'neutral';
			description: string;
			metric?: { label: string; value: string; benchmark?: string };
			category: 'income' | 'credit' | 'property' | 'obligation' | 'profile' | 'policy';
		}>;
		suggestions: Array<{
			id: string;
			title: string;
			description: string;
			potential_impact?: { metric: string; direction: string; estimated_value?: string };
			effort: 'easy' | 'moderate' | 'significant';
		}>;
		corporate_dsas: Array<{
			name: string;
			payout_percent: number;
			comparison: 'best' | 'better' | 'same';
			benefits?: string[];
		}>;
		rm_contact?: {
			rm_name: string;
			phone?: string;
			whatsapp?: string;
			designation?: string;
		};
		key_metrics: {
			foir: number;
			ltv?: number;
			net_income: number;
			cibil: number;
			approval_probability: number;
		};
		computed_at: string;
	}>;
	cross_sell: Array<{
		parent_lender: string;
		shortfall: number;
		loan_type: 'Personal Loan' | 'Business Loan';
		explanation: string;
		options: Array<{ lender: string; amount: number; roi: number; emi: number }>;
	}>;
	computed_at: string;
}
```

---

## Appendix B: Sample Payloads

### B.1 Sample Request — Home Loan (New, Salaried, Single Applicant)

```json
{
	"loanTransaction": {
		"LoanName": "Home Loan",
		"LoanType": "New Loan",
		"propertyIdentified": "Yes",
		"numberOfDirectorOrApplicant": 1,
		"approvedByAuthority": "Yes",
		"ContinuityProof": "Yes",
		"constructionType": "House",
		"ifPropertyRegistered": "Yes",
		"mortgageYear": 20,
		"propertyCost": 7500000,
		"downPayment": 1500000,
		"RequiredLoanAmount": 6000000,
		"propertyStateName": "Maharashtra",
		"propertyCityName": "Mumbai"
	},
	"allApplicantDetails": [
		{
			"fullNameOfApplicant": "Rajesh Kumar",
			"selectedAge": 35,
			"gender": "Male",
			"maritalStatus": "Married",
			"TypeOfResidence": "Rented",
			"employmentType": "Salaried(Private)",
			"creditScore": 780,
			"grossIncome": 150000,
			"netIncome": 125000,
			"fixedSalary": 120000,
			"monthlyOtherIncome": 5000,
			"ObligationsRunning": "Yes",
			"obligations": [
				{
					"loanType": "Car Loan",
					"bankName": "HDFC Bank",
					"selectedToClose": "Keep running",
					"emi": "15000",
					"totalLimit": "800000",
					"tenure": "36",
					"interestRate": "9.5"
				}
			]
		}
	]
}
```

### B.2 Sample Request — Personal Loan (Unsecured, Self-Employed)

```json
{
	"loanTransaction": {
		"LoanName": "Personal Loan",
		"unSecureLoanType": "Personal Loan",
		"LoanType": "New Loan",
		"ObligationsRunning": "No",
		"loanAmount": 500000,
		"tenure": 3
	},
	"allApplicantDetails": {
		"fullNameOfApplicant": "Priya Sharma",
		"selectedAge": 32,
		"employmentType": "Self-employed(Professional)",
		"creditScore": 750,
		"grossReceipts": [2400000, 2800000, 3200000],
		"netProfit": [800000, 950000, 1100000],
		"depreciation": [50000, 60000, 70000],
		"itrFiled": ["Filed", "Filed", "Filed"],
		"ObligationsRunning": "No"
	}
}
```

### B.3 Sample Request — LAP (Balance Transfer, Company Applicant)

```json
{
	"loanTransaction": {
		"LoanName": "Loan Against Property",
		"LoanType": "Balance Transfer",
		"LAPType": "Commercial Property",
		"propertyIdentified": "Yes",
		"BasedOnITR": "Based on 3 years of ITRs",
		"incomeTaxAvailableThreeFinancialYear": "Yes",
		"ContinuityProof": "Yes",
		"ifPropertyRegistered": "Yes",
		"typeOfOccupationProperty": "Self-occupied",
		"mortgageYear": 15,
		"loanAmount": 15000000,
		"carpetArea": 2500,
		"carpetAreaUnit": "Feet",
		"existingEncumbrance": "Yes",
		"ocCcAvailable": "BOTH",
		"municipalApproval": "APPROVED",
		"loanVintage": "3-5 years",
		"repaymentTrack": "CLEAN",
		"selectSingleBank": "ICICI Bank",
		"principalOutstanding": 12000000,
		"existingInterestRate": 10.5,
		"remainingTenure": 120
	},
	"allApplicantDetails": [
		{
			"fullNameOfApplicant": "Vertex Solutions Pvt Ltd",
			"applicantType": "Company",
			"companyType": "Private Limited",
			"companySelectedAge": 8,
			"employmentType": "Self-employed(Businessman)",
			"creditScore": 720,
			"grossReceipts": [50000000, 55000000, 62000000],
			"netProfit": [5000000, 5800000, 6500000],
			"depreciation": [200000, 250000, 300000],
			"itrFiled": ["Filed", "Filed", "Filed"],
			"directors": [
				{ "name": "Amit Patel", "din": "08234567", "sharePercent": 60 },
				{ "name": "Sneha Patel", "din": "08234568", "sharePercent": 40 }
			],
			"numberOfDirectors": 2,
			"ObligationsRunning": "Yes",
			"obligations": [
				{
					"loanType": "Working Capital",
					"bankName": "ICICI Bank",
					"selectedToClose": "Top-up",
					"emi": "125000",
					"totalLimit": "10000000"
				}
			]
		}
	]
}
```

---

**End of Document**

> If the API response format is being redesigned, we strongly recommend adopting the [Ideal Response Format (Section 6)](#6-ideal-response-format--what-we-need) directly. Our platform will immediately consume it without any transformation layer, resulting in richer, more accurate results for DSAs.
>
> For questions, refer to the field mapping tables in [Section 7](#7-field-mapping-current-vs-ideal). Every field gap is documented with its impact on the platform.
