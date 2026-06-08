# Rule Engine Specification

> **Version**: 1.0
> **Date**: 2026-02-17
> **Branch**: `main` (originally branched from `store-redesign`)
> **Purpose**: Complete specification for the Rule Engine — how bank policies are parsed, stored, validated, and evaluated. Covers the parsing prompt, MongoDB schema, validation pipeline, and test strategy.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Rule Authoring Pipeline](#2-rule-authoring-pipeline)
3. [Parsing Prompt](#3-parsing-prompt)
4. [Rule Document Schema (MongoDB)](#4-rule-document-schema-mongodb)
5. [Payload Key Registry](#5-payload-key-registry)
6. [Evaluation Engine Contract](#6-evaluation-engine-contract)
7. [Output Schema (What the API Returns)](#7-output-schema-what-the-api-returns)
8. [Deviation Model](#8-deviation-model)
9. [Policy Display Objects](#9-policy-display-objects)
10. [Test Strategy](#10-test-strategy)
11. [RM Portal Integration](#11-rm-portal-integration)

---

## 1. Architecture Overview

```
AUTHORING SIDE                          RUNTIME SIDE

Bank Policy Doc                         DSA fills form
  (PDF/image/handwritten)                 |
        |                                 v
        v                               payloadBuilder.ts builds
[AI Parser + Strict Prompt]              LoanApplicationPayload
        |                                 |
        v                                 v
Structured JSON-Logic Rules      POST /api/rule-engine/evaluate
  + Human-Readable Doc                    |
        |                                 v
        v                         Rule Engine reads lender_rules
[AI Reverse Writer]               from MongoDB, evaluates payload
        |                         against ALL active rulesets
        v                                 |
[AI Comparator: 4 rounds max]            v
        |                         Returns LenderResultsData[]
        v                         (per docs/LOAN-ASSESSMENT-API-INTEGRATION.md
[Human review if still ambiguous]  Section 6 "Ideal Response Format")
        |                                 |
        v                                 v
[RM Portal verification]          Offer cards rendered to DSA
        |
        v
Published to lender_rules collection
```

**Key rule**: The Rule Engine is an API. It receives `LoanApplicationPayload` and returns results per `LOAN-ASSESSMENT-API-INTEGRATION.md` Section 6. The parsing/authoring side is a separate workflow that populates the MongoDB rules collection.

---

## 2. Rule Authoring Pipeline

### 2.1 Pipeline Stages

```
STAGE 1: PARSE
  Input:  Bank policy document (any format)
  Tool:   AI with strict parsing prompt (Section 3)
  Output: JSON-Logic rules + confidence scores + source excerpts
  Rule:   Missing sections = null (NEVER assumed)

STAGE 2: REVERSE-WRITE
  Input:  JSON-Logic rules from Stage 1
  Tool:   AI reverse-writer
  Output: Human-readable policy document (generated FROM JSON-Logic)
  Rule:   Must be generated from rules, NOT from source document

STAGE 3: DIFF & CORRECT (max 4 iterations)
  Input:  Source document + Generated document
  Tool:   AI comparator
  Output: Structured diff report (per-section, with severity)
  Rule:   If diff found -> correct JSON-Logic -> re-generate readable -> re-compare
          If still ambiguous after 4 rounds -> HUMAN INTERVENTION

STAGE 4: FINALIZE
  Output: Paired artifact (JSON-Logic + Human-Readable)
  Status: draft -> ready_for_review

STAGE 5: RM VERIFICATION
  Input:  Human-readable document on RM Portal
  Tool:   CommunicationThreads (existing infrastructure)
  Output: RM approved / RM raised queries
  Rule:   Only DigitalDSA team executes corrections from RM queries

STAGE 6: PUBLISH
  Input:  Approved paired artifact
  Output: New version in lender_rules collection
  Status: active
```

### 2.2 Paired Artifact Schema

Every rule authoring cycle produces a paired artifact stored in `lender_rule_artifacts`:

```typescript
interface RuleArtifactPair {
	_id: ObjectId;
	artifact_id: string; // e.g., "hdfc-hl-v3"
	lender_id: string; // matches bankName.ts value
	lender_name: string;
	classification: 'PVT' | 'GOV' | 'NBFC';
	loan_types: string[]; // which loan types this covers
	version: number;

	status: 'draft' | 'in_review' | 'rm_pending' | 'approved' | 'active' | 'superseded';

	// The pair -- always together, never separate
	json_logic: LenderRuleDocument; // Section 4
	human_readable: string; // markdown format

	// Audit trail
	parse_iterations: Array<{
		iteration: number; // 1-4
		diff_report: DiffReport;
		corrections_made: string[];
		resolved: boolean;
		human_intervention_needed: boolean;
		completed_at: Date;
	}>;

	rm_review: {
		thread_id?: ObjectId; // CommunicationThreads reference
		queries: RMQuery[];
		approved_by?: string;
		approved_at?: Date;
	};

	// Source traceability
	source_document_urls: string[]; // ImageKit URLs
	parsed_by: string; // team member name
	reviewed_by?: string;

	created_at: Date;
	activated_at?: Date;
}

interface DiffReport {
	overall_match: boolean;
	sections: Array<{
		section: string; // 'ltv', 'foir', 'cibil', etc.
		match:
			| 'exact'
			| 'semantic_match'
			| 'minor_diff'
			| 'major_diff'
			| 'missing_in_source'
			| 'missing_in_output';
		source_says: string;
		output_says: string;
		diff_type?: 'value' | 'condition' | 'interpretation' | 'omission';
		severity: 'info' | 'warning' | 'critical';
		suggested_correction?: string;
	}>;
}

interface RMQuery {
	query_id: string;
	category:
		| 'rule_incorrect'
		| 'rule_missing'
		| 'rule_outdated'
		| 'clarification_needed'
		| 'conditional_rule'
		| 'internal_policy';
	section: string;
	query_text: string;
	attachments?: string[];
	resolution?: {
		action: 'corrected' | 'no_change_needed' | 'escalated';
		correction_detail?: string;
		resolved_by: string;
		resolved_at: Date;
	};
}
```

---

## 3. Parsing Prompt

This is the STRICT prompt used in Stage 1 to convert bank policy documents into JSON-Logic rules.

**IMPORTANT**: This prompt must be used exactly as written. Do not modify the section names, output format, or key references.

---

### THE PROMPT

```
You are a financial rule parser for an Indian loan processing platform. Your job is to convert a bank/NBFC's lending policy document into structured JSON-Logic rules.

=== CRITICAL CONSTRAINTS ===

1. ONLY use keys from the PAYLOAD KEY REGISTRY below. If a policy mentions a concept that has no matching payload key, you MUST:
   - Flag it in the `unmapped_policies` section
   - NEVER invent new keys
   - NEVER assume a mapping

2. If a section has NO rules in the source document, output `null` for that section. NEVER assume default values. NEVER infer rules from general banking practice. If the document does not explicitly state it, it is null.

3. Every rule must include:
   - `source_excerpt`: The exact text from the source document this rule was derived from
   - `confidence`: 0.0 to 1.0 (how certain you are about the interpretation)
   - If confidence < 0.7, add an `ambiguity_note` explaining what is unclear

4. Numbers must be exact as stated in the document. Do not round, convert, or normalize unless the document itself provides the conversion.

5. For conditional rules (if X then Y), use JSON-Logic operators: ==, !=, >, >=, <, <=, and, or, not, if, var, in, missing, missing_some, min, max, merge, cat

=== PAYLOAD KEY REGISTRY ===

These are the ONLY keys you may reference in JSON-Logic `var` expressions.

LOAN TRANSACTION (prefix: loanTransaction.)
  loanName              string    "Home Loan" | "Loan Against Property" | "Plot and Construction Loan" | "Personal Loan" | "Business Loan - Unsecured" | "Business Loan - Secured"
  loanType              string    "New Loan" | "Balance Transfer" | "Top-up" | "Balance Transfer With Top-up"
  numberOfApplicants    number    Count of all applicants
  applicationStructure  string    "Individual" | "Couple" | "Family"
  propertyIdentified    boolean
  propertyState         string    State name
  propertyCity          string    City name
  propertyType          string    "Flat" | "Independent House" | "Villa" | "Plot" | "Commercial"
  purchaseType          string    "Direct Sale" | "Resale"
  constructionStatus    string    "Ready to Move" | "Under Construction" | "Plot + Construction"
  propertyStage         string    "Foundation" | "Plinth" | "Superstructure" | "Finishing" | "Complete"
  approvedByAuthority   boolean
  asPerApprovedMap      boolean
  propertyRegistered    boolean
  propertyCost          number    In INR
  atsValue              number    Agreement to Sell value in INR
  downPayment           number    In INR
  residenceSameAsProperty boolean
  residenceState        string
  residenceCity         string
  loanAmount            number    In INR
  tenureYears           number
  currentBank           string    For BT
  principalOutstanding  number    For BT, in INR
  currentInterestRate   number    For BT, percentage
  remainingTenure       number    For BT, in months
  currentEMI            number    For BT, in INR
  sixMonthsAfterRegistry boolean  For BT
  currentPropertyValue  number    For BT, in INR
  newTenure             number    For BT, in years
  topUpAmount           number    In INR
  topUpTenure           number    In years
  hasNRIApplicant       boolean
  preferredBanks        string[]
  excludedBanks         string[]
  carpetArea            number    Sq ft (LAP)
  carpetAreaUnit        string    "Feet" | "Meter" | "Yard"
  carpetAreaRaw         number    Original value before normalization
  propertyAreaType      string    "PLANNED_AUTHORITY" | "CONVERTED_RESIDENTIAL" | "OLD_MUNICIPAL" | "LOCAL_COLONY" | "UNKNOWN"
  leaseRemainingPeriod  string    For leasehold (LAP)
  existingEncumbrance   string    "Yes" | "No" (LAP)
  ocCcAvailable         string    "BOTH" | "CC_ONLY" | "NONE" | "UNKNOWN" (LAP)
  municipalApproval     string    "APPROVED" | "PARTIAL" | "NO_PLAN" | "UNKNOWN" (LAP)
  rentalIncome          number    Monthly, in INR (LAP)
  loanPurpose           string    "BUSINESS_EXPANSION" | "PERSONAL_NEEDS" | "DEBT_CONSOLIDATION" (LAP)
  loanVintage           string    For BT
  repaymentTrack        string    "CLEAN" | "MINOR_IRREGULAR" | "MAJOR_IRREGULAR" (BT)
  dodMonthlyWithdrawal  number    For Dropline OD

APPLICANT (prefix: allApplicantDetails.{index}. where index is 0-based)
  applicantType         string    "Individual" | "Company"
  title                 string    "Mr." | "Ms." | "Mrs." | "Dr."
  fullNameOfApplicant   string
  age                   number
  gender                string    "Male" | "Female" | "Others"
  maritalStatus         string    "Single" | "Married" | "Divorced" | "Widowed"
  roleInApplication     string    "Primary" | "Co-applicant" | "Guarantor"
  relationshipWithPrimary string  "Self" | "Spouse" | "Father" | "Mother" | "Son" | etc.
  residenceType         string    "Owned" | "Rented" | "Company Provided" | "Family Owned"
  yearsAtCurrentAddress number
  isNRI                 boolean
  employmentType        string    "Salaried(Private)" | "Salaried(Government)" | "Self-employed(Professional)" | "Self-employed(Other)" | "Pensioner" | "Unemployed"
  professionType        string    "Lawyer" | "Chartered Accountant(CA)" | "MBBS Doctor" | "Architect" | etc.
  hasBarCouncilChamber  boolean
  businessType          string    "Manufacturing" | "Trading" | "B2B Services" | "B2C Services" | "Commission Based" | "Freelancer"
  gstRegistrationDate   string    "YYYY-MM" format

  salariedProfile.worksForReputedOrg           boolean
  salariedProfile.companyHas100PlusEmployees    boolean
  salariedProfile.employerIsProprietorship     boolean
  salariedProfile.employerSharesFinancials     boolean
  salariedProfile.isPermanentEmployee          boolean
  salariedProfile.twoYearsWithSameEmployer     boolean
  salariedProfile.threeYearsTotalExperience    boolean
  salariedProfile.hasProvidentFund             boolean
  salariedProfile.salaryInBankAccount          boolean
  salariedProfile.receivesBonus                boolean
  salariedProfile.receivesSalarySlip           boolean
  salariedProfile.hasHigherEducation           boolean

  governmentProfile.isCentralGovt              boolean
  governmentProfile.isDefense                  boolean
  governmentProfile.isStateGovt                boolean
  governmentProfile.isPermanent                boolean
  governmentProfile.isContractual              boolean
  governmentProfile.probationCompleted         boolean
  governmentProfile.twoYearsService            boolean
  governmentProfile.noDisciplinaryAction       boolean
  governmentProfile.nonAccessiblePosting       boolean
  governmentProfile.verificationPossible       boolean
  governmentProfile.alternateAddressAvailable  boolean
  governmentProfile.receivesBonus              boolean
  governmentProfile.pensionEligible            boolean
  governmentProfile.receivesSalarySlip         boolean
  governmentProfile.filesITR                   boolean
  governmentProfile.ownsProperty               boolean
  governmentProfile.hasOtherIncome             boolean

  businessProfile.gstRegistered                boolean
  businessProfile.hasCurrentAccount            boolean
  businessProfile.usesSavingsAccount           boolean
  businessProfile.filesITRRegularly            boolean
  businessProfile.profitableLast3Years         boolean
  businessProfile.profitableSinceStart         boolean
  businessProfile.majorCashSales               boolean
  businessProfile.fewKeyClients                boolean
  businessProfile.hasCCOD                      boolean
  businessProfile.hasOtherIncome               boolean
  businessProfile.hasProfessionalLicense       boolean
  businessProfile.hasCommercialPremises        boolean
  businessProfile.ownsPremises                 boolean
  businessProfile.threeYearsInBusiness         boolean
  businessProfile.enrolledWithProfessionalBody boolean
  businessProfile.priorExperience              boolean
  businessProfile.seasonalBusiness             boolean

  pensionProfile.pensionInBankAccount          boolean
  pensionProfile.pensionRegular                boolean
  pensionProfile.isGovernmentPension           boolean
  pensionProfile.isPSUDefensePension           boolean
  pensionProfile.isLifelongPension             boolean
  pensionProfile.isFamilyPension               boolean
  pensionProfile.continuesBeyond75             boolean
  pensionProfile.receivesPensionSlip           boolean
  pensionProfile.nationalizedBankAccount       boolean
  pensionProfile.noPensionLoanDeduction        boolean
  pensionProfile.hasOtherIncome                boolean
  pensionProfile.ownsProperty                  boolean
  pensionProfile.spousePensionApplicable       boolean
  pensionProfile.filesITR                      boolean
  pensionProfile.verificationPossible          boolean

  grossIncome           number    Monthly, in INR
  netIncome             number    Monthly, in INR
  monthlyOtherIncome    number    Monthly, in INR
  financials.grossReceipts  number[]  Year-wise (self-employed)
  financials.netProfit      number[]  Year-wise (self-employed)
  financials.depreciation   number[]  Year-wise (self-employed)
  financials.itrFiled       string[]  Year-wise (self-employed)
  averageBankBalance    number    In INR
  averageCashAmount     number    In INR
  creditScore           number    300-900
  lowCreditReasons.delayedEMI              boolean
  lowCreditReasons.highCreditUtilization   boolean
  lowCreditReasons.noCreditHistory         boolean
  lowCreditReasons.minimumDueOnly          boolean
  lowCreditReasons.multipleEnquiries       boolean
  lowCreditReasons.coApplicantDefault      boolean
  lowCreditReasons.loanDefault             boolean
  lowCreditReasons.onlyUnsecuredLoans      boolean
  hasExistingObligations  boolean
  obligations             array     Each entry has: obligationType, loanType, bankName, selectedToClose, emi, totalLimit, tenure, interestRate, remainingLimit, remainingTenure, utilizedAmount, sanctionedLimit, sanctionedTenure
  companyName           string
  companyType           string    "Private Limited" | "LLP" | "Partnership" | "Proprietorship" | "Public Limited"
  companyAge            number
  directors             array     Each: name, age, designation, din
  gpaDetails.fullName   string
  gpaDetails.age        number
  gpaDetails.relationship string
  gpaDetails.address    string

=== OUTPUT FORMAT ===

Return a JSON object with this EXACT structure:

{
  "lender_id": "<value from bankName.ts>",
  "lender_name": "<human-readable name>",
  "classification": "PVT" | "GOV" | "NBFC",
  "loan_types": ["<which loan types these rules cover>"],
  "source_document_description": "<brief description of source>",

  "sections": {
    "eligibility": <array of hard-gate rules or null>,
    "cibil": <array of CIBIL-related rules or null>,
    "foir": <array of FOIR/affordability rules or null>,
    "income_assessment": <array of income acceptance/haircut rules or null>,
    "ltv": <array of LTV rules or null>,
    "obligation_treatment": <array of obligation counting rules or null>,
    "property": <array of property eligibility rules or null>,
    "transaction": <array of transaction/deal structure rules or null>,
    "tenure": <array of tenure calculation rules or null>,
    "roi": <array of interest rate determination rules or null>,
    "fees": <array of fee/charge rules or null>,
    "disbursement": <array of disbursement process rules or null>,
    "documentation": <array of required document rules or null>,
    "nri": <array of NRI-specific rules or null>,
    "company": <array of company-applicant rules or null>,
    "balance_transfer": <array of BT-specific rules or null>,
    "top_up": <array of top-up-specific rules or null>
  },

  "deviations": <array of deviation rules or null>,

  "policies": <array of display-only policy objects or null>,

  "unmapped_policies": <array of policies that reference concepts not in our payload>,

  "parse_metadata": {
    "total_rules_extracted": <number>,
    "sections_with_rules": <number>,
    "sections_null": <number>,
    "average_confidence": <number 0-1>,
    "low_confidence_count": <number of rules with confidence < 0.7>,
    "unmapped_count": <number>
  }
}

=== RULE OBJECT FORMAT ===

Each rule in any section array must follow this format:

{
  "rule_id": "<LENDER>_<SECTION>_<DESCRIPTOR>",
  "description": "<human-readable description>",
  "tier": "hard_gate" | "computed" | "parameter",
  "logic": { <JSON-Logic expression using ONLY payload keys> },
  "fail_message": "<message if rule fails -- for hard_gate tier>",
  "fail_category": "<rejection category if fails>",
  "compute_output": "<what this rule produces -- for computed tier>",
  "parameter_key": "<what parameter this sets -- for parameter tier>",
  "parameter_value": <value>,
  "applies_when": { <JSON-Logic condition for when this rule is active, or null for always> },
  "confidence": <0.0 to 1.0>,
  "ambiguity_note": "<what is unclear -- only if confidence < 0.7>",
  "source_excerpt": "<exact text from source document>"
}

Tier definitions:
- hard_gate:  Pass/fail check. If fails, lender is RED for this applicant.
- computed:   Produces a numeric or derived value (FOIR cap, income haircut, LTV cap, etc.)
- parameter:  Sets a fixed parameter (ROI, processing fee %, max tenure, etc.)

=== DEVIATION OBJECT FORMAT ===

{
  "deviation_id": "<LENDER>_DEV_<DESCRIPTOR>",
  "description": "<what deviation allows>",
  "deviates_from": "<rule_id of the rule being deviated>",
  "condition": { <JSON-Logic: when this deviation is possible> },
  "approval_authority": "branch_manager" | "regional_head" | "credit_manager" | "zonal_head" | "coo",
  "max_deviation": "<how much deviation is allowed>",
  "probability_modifier": <-0.1 to -0.3, reduces approval probability>,
  "source_excerpt": "<exact text from source>",
  "confidence": <0.0 to 1.0>
}

=== POLICY DISPLAY OBJECT FORMAT ===

For policies that should appear on offer cards but are not computable rules:

{
  "policy_key": "<UNIVERSAL key -- same across all lenders>",
  "label": "<human-readable label>",
  "value": "<string or number or boolean or string[]>",
  "display_on_offer_card": true | false,
  "category": "roi_structure" | "processing_fee" | "prepayment" | "insurance" | "turnaround" | "documentation" | "special_scheme" | "disbursement_process" | "balance_transfer_terms" | "general"
}

Universal policy_key values (use EXACTLY these across all lenders):
  roi_type                    "Fixed" | "Floating" | "Hybrid"
  roi_benchmark               "MCLR" | "RLLR" | "EBLR" | "T-REPO" | "PLR"
  roi_spread                  e.g., "0.25% above EBLR"
  roi_range                   e.g., "8.40% - 9.75%"
  teaser_rate                 e.g., "First year at 6.75%"
  processing_fee_percent      number
  processing_fee_flat         number (in INR)
  processing_fee_waiver       string (conditions for waiver)
  prepayment_charge_floating  e.g., "Nil for floating rate"
  prepayment_charge_fixed     e.g., "2% + GST"
  lock_in_period_months       number
  insurance_mandatory         boolean
  insurance_type              "Life" | "Property" | "Both"
  login_to_sanction_days      number (average)
  login_to_disbursal_days     number (average)
  max_age_at_maturity         number
  min_loan_amount             number (in INR)
  max_loan_amount             number (in INR)
  women_borrower_discount     string (e.g., "0.05% lower ROI")
  festive_offer               string (description, or null)
  stamp_duty_info             string
  legal_technical_fee          string
  cersai_charge               string
  moratorium_available        boolean
  part_disbursement_allowed   boolean
  tranche_disbursement_info   string

=== INCOME ASSESSMENT RULES ===

For income_assessment section, each rule should specify:
{
  "rule_id": "<LENDER>_INCOME_<PROFILE_TYPE>",
  "income_profile_type": "<from 12 types: salaried_regular, salaried_contractual, business_proprietorship, business_partnership, director_company, professional_practice, pension, rental_income, freelance_consulting, agriculture_income, investment_income, no_current_income>",
  "accepted": true | false,
  "haircut_percent": <0-100, percentage NOT accepted>,
  "conditions": { <JSON-Logic: additional conditions for acceptance> },
  "max_contribution_percent": <cap on how much this income type contributes to total>,
  "computation_method": "<how bank calculates assessable income from this type>",
  "source_excerpt": "<exact text>",
  "confidence": <0.0 to 1.0>
}

=== OBLIGATION TREATMENT RULES ===

For obligation_treatment section, each rule should specify:
{
  "rule_id": "<LENDER>_OBL_<TYPE>",
  "obligation_type": "term_loan" | "credit_line",
  "loan_type_filter": "<specific loan type or 'all'>",
  "treatment": {
    "count_factor": <0.0 to 1.0, e.g., 1.0 = full EMI, 0.5 = half>,
    "ignore_if_closing": <boolean>,
    "credit_line_method": "percentage_of_limit" | "actual_emi" | "minimum_payment",
    "credit_line_factor": <percentage of limit, e.g., 0.05 = 5%>,
    "ignore_below_amount": <INR threshold below which obligation is ignored>,
    "guarantor_factor": <0.0 to 1.0, how to treat guarantor obligations>
  },
  "source_excerpt": "<exact text>",
  "confidence": <0.0 to 1.0>
}

=== EXAMPLES ===

Example 1: CIBIL hard gate
{
  "rule_id": "HDFC_CIBIL_MIN_PRIMARY",
  "description": "Primary applicant must have CIBIL score of 700 or above",
  "tier": "hard_gate",
  "logic": { ">=": [{ "var": "allApplicantDetails.0.creditScore" }, 700] },
  "fail_message": "Primary applicant CIBIL score must be 700+",
  "fail_category": "cibil_score",
  "applies_when": null,
  "confidence": 0.95,
  "source_excerpt": "Minimum CIBIL score for primary borrower: 700"
}

Example 2: FOIR cap (computed)
{
  "rule_id": "HDFC_FOIR_SALARIED_BELOW_50K",
  "description": "FOIR capped at 50% for salaried with net income below 50K",
  "tier": "computed",
  "logic": {
    "if": [
      { "and": [
        { "in": [{ "var": "allApplicantDetails.0.employmentType" }, ["Salaried(Private)", "Salaried(Government)"]] },
        { "<": [{ "var": "allApplicantDetails.0.netIncome" }, 50000] }
      ]},
      { "max_foir": 0.50 },
      null
    ]
  },
  "compute_output": "max_foir",
  "applies_when": null,
  "confidence": 0.9,
  "source_excerpt": "For salaried borrowers with net income below Rs. 50,000: Maximum FOIR of 50%"
}

Example 3: LTV parameter
{
  "rule_id": "HDFC_LTV_RESALE_BELOW_30L",
  "description": "Maximum LTV 80% for resale properties below 30 lakhs",
  "tier": "parameter",
  "logic": {
    "and": [
      { "==": [{ "var": "loanTransaction.purchaseType" }, "Resale"] },
      { "<": [{ "var": "loanTransaction.propertyCost" }, 3000000] }
    ]
  },
  "parameter_key": "max_ltv_percent",
  "parameter_value": 80,
  "applies_when": { "==": [{ "var": "loanTransaction.loanName" }, "Home Loan"] },
  "confidence": 0.95,
  "source_excerpt": "Resale properties below Rs. 30 lakhs: Maximum LTV 80%"
}

Example 4: Deviation
{
  "deviation_id": "HDFC_DEV_CIBIL_HIGH_INCOME",
  "description": "CIBIL relaxed to 650 for high-income profiles (net income > 2L)",
  "deviates_from": "HDFC_CIBIL_MIN_PRIMARY",
  "condition": {
    "and": [
      { ">=": [{ "var": "allApplicantDetails.0.creditScore" }, 650] },
      { ">=": [{ "var": "allApplicantDetails.0.netIncome" }, 200000] }
    ]
  },
  "approval_authority": "credit_manager",
  "max_deviation": "CIBIL 650-699 accepted",
  "probability_modifier": -0.15,
  "source_excerpt": "For profiles with net income above Rs. 2,00,000, CIBIL relaxation up to 650 with credit manager approval",
  "confidence": 0.85
}

Example 5: Income assessment
{
  "rule_id": "HDFC_INCOME_RENTAL",
  "income_profile_type": "rental_income",
  "accepted": true,
  "haircut_percent": 30,
  "conditions": {
    "and": [
      { "==": [{ "var": "allApplicantDetails.0.incomeEntries.0.evidence.itrFiled" }, true] },
      { ">=": [{ "var": "allApplicantDetails.0.incomeEntries.0.evidence.vintageYears" }, 2] }
    ]
  },
  "max_contribution_percent": 40,
  "computation_method": "70% of declared rental income (30% haircut for maintenance/vacancy), capped at 40% of total assessed income",
  "source_excerpt": "Rental income: 70% considered, ITR mandatory, minimum 2 years lease. Cannot exceed 40% of total income for assessment.",
  "confidence": 0.9
}

=== FINAL INSTRUCTIONS ===

1. Parse the ENTIRE document. Do not skip sections.
2. If a section is not covered in the document, output null. Do not leave it out.
3. If two rules in the document contradict each other, include BOTH with confidence < 0.7 and an ambiguity_note explaining the contradiction.
4. For range values (e.g., "ROI 8.5% to 10.5%"), capture both bounds.
5. For slab-based rules (e.g., "LTV 90% for loans up to 30L, 80% for 30L-75L"), create one rule per slab.
6. Obligations: NEVER pre-compute totals. The rule defines how each obligation type is TREATED (factor, method). The engine computes the total at runtime.
7. ALWAYS include the source_excerpt. If you cannot point to specific text, set confidence < 0.5.
```

---

## 4. Rule Document Schema (MongoDB)

### 4.1 Collection: `lender_rules` (Runtime)

This is what the evaluation engine reads. Lean and fast.

```typescript
interface LenderRuleDocument {
	_id: ObjectId;
	lender_id: string;
	lender_name: string;
	classification: 'PVT' | 'GOV' | 'NBFC';
	loan_types: string[];
	version: number;

	effective_from: Date;
	effective_until: Date | null; // null = currently active

	sections: {
		eligibility: JsonLogicRule[] | null;
		cibil: JsonLogicRule[] | null;
		foir: JsonLogicRule[] | null;
		income_assessment: IncomeAssessmentRule[] | null;
		ltv: JsonLogicRule[] | null;
		obligation_treatment: ObligationTreatmentRule[] | null;
		property: JsonLogicRule[] | null;
		transaction: JsonLogicRule[] | null;
		tenure: JsonLogicRule[] | null;
		roi: JsonLogicRule[] | null;
		fees: JsonLogicRule[] | null;
		disbursement: JsonLogicRule[] | null;
		documentation: JsonLogicRule[] | null;
		nri: JsonLogicRule[] | null;
		company: JsonLogicRule[] | null;
		balance_transfer: JsonLogicRule[] | null;
		top_up: JsonLogicRule[] | null;
	};

	deviations: DeviationRule[] | null;
	policies: PolicyDisplayObject[] | null;

	artifact_id: string; // links to lender_rule_artifacts
	created_at: Date;
	updated_at: Date;
}
```

### 4.2 Collection: `lender_rule_artifacts` (Audit)

Full authoring history. See Section 2.2.

### 4.3 Collection: `lender_rule_fixtures` (Testing)

```typescript
interface RuleFixture {
	_id: ObjectId;
	fixture_id: string; // e.g., "salaried-80k-cibil780"
	description: string;
	category:
		| 'salaried_standard'
		| 'self_employed_itr'
		| 'self_employed_cash'
		| 'pensioner'
		| 'nri'
		| 'company'
		| 'bt_clean'
		| 'bt_irregular'
		| 'low_cibil'
		| 'high_obligations'
		| 'multi_applicant'
		| 'edge_case';
	payload: LoanApplicationPayload; // full payload matching payloadBuilder.ts
	expected_outcomes: {
		lender_id: string;
		expected_traffic_light: 'green' | 'amber' | 'red';
		expected_amount_range?: { min: number; max: number };
		expected_gates_failed?: string[];
		notes?: string;
	}[];
	created_at: Date;
	updated_at: Date;
}
```

---

## 5. Payload Key Registry

The authoritative source is `src/lib/utils/payloadBuilder.ts`. The parsing prompt in Section 3 contains the full key list extracted from that file.

**Validation rule**: Before any rule document is saved to `lender_rules`, a validator MUST check that every `{ "var": "..." }` path in every JSON-Logic expression resolves to a key in the payload registry. If any key is not found, the save is REJECTED.

### 5.1 Facility Type Keys (Unsecured Loans)

These keys are available for unsecured loan rules (Personal, Business, Professional). For secured loans (Home, LAP, Plot), `facilityType` is `undefined` and computed fields default to `""` / `false`.

| Key Path                             | Type    | Values                                                                                       | Use                                       |
| ------------------------------------ | ------- | -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `loanTransaction.facilityType`       | string? | `"Term Loan"` \| `"Overdraft (OD)"` \| `"Drop-line OverDraft (DOD)"` \| `"Cash Credit (CC)"` | Raw facility type from form               |
| `_computed._facility_type`           | string  | Same as above, or `""` for secured                                                           | Enricher-derived, safe for all loan types |
| `_computed._is_credit_line_facility` | boolean | `true` for OD/DOD/CC, `false` otherwise                                                      | Quick boolean for branching logic         |

**Rule authoring examples**:

```json
// Gate: Only apply to credit-line facilities
{ "==": [{ "var": "_computed._is_credit_line_facility" }, true] }

// Gate: Only apply to term loans
{ "==": [{ "var": "_computed._is_credit_line_facility" }, false] }

// Specific facility check
{ "==": [{ "var": "_computed._facility_type" }, "Cash Credit (CC)"] }

// Multiple facilities
{ "in": [{ "var": "_computed._facility_type" }, ["Overdraft (OD)", "Drop-line OverDraft (DOD)"]] }
```

**Pending integration** (not yet implemented in evaluation engine):

- FOIR calculation should branch on `_is_credit_line_facility` — use % of limit for credit lines instead of EMI
- EMI calculation should be skipped for OD/CC (no fixed EMI); DOD uses drop-line schedule
- Tenure handling differs: term loan = fixed years, OD/CC = renewal period, DOD = drop-line period

> **Full spec**: See `docs/specs/UNSECURED-FACILITY-TYPE-SPEC.md` for complete architecture and pending tasks.

---

## 6. Evaluation Engine Contract

### 6.1 Input

```typescript
POST /api/rule-engine/evaluate

Request body: LoanApplicationPayload
// (as defined in src/lib/utils/payloadBuilder.ts)
```

### 6.2 Processing

```
1. Read payload.loanTransaction.loanName
2. Query lender_rules for ALL documents where:
   - loan_types includes loanName
   - effective_from <= now
   - effective_until is null OR effective_until >= now
3. For each lender ruleset:
   a. Evaluate hard_gate rules (eligibility, cibil, property, etc.)
      - If ANY hard_gate fails -> traffic_light = "red"
      - Collect all fail_messages
   b. Evaluate computed rules (foir, income_assessment, ltv, tenure, roi)
      - Calculate assessed_income (per income_assessment rules)
      - Calculate obligation load (per obligation_treatment rules)
      - Calculate FOIR (NOTE: for credit-line facilities — OD/DOD/CC — use % of limit, not EMI)
      - Calculate max eligible amount
      - Calculate LTV-capped amount (secured loans only)
      - Determine ROI (per roi rules)
      - Calculate EMI (NOTE: skip for OD/CC — no fixed EMI; for DOD — use drop-line schedule)
   c. Check deviations for any failed hard_gates
      - If deviation exists -> traffic_light = "amber" (not red)
   d. Collect policies for display
   e. Build output per Section 7
4. Sort results: green first, then amber, then red
5. Compute summary (best amount, best ROI, best EMI, counts)
6. Return response
```

### 6.3 Output

Per `LOAN-ASSESSMENT-API-INTEGRATION.md` Section 6 ("Ideal Response Format").

---

## 7. Output Schema (What the API Returns)

The output schema is ALREADY defined in `docs/LOAN-ASSESSMENT-API-INTEGRATION.md` Section 6 and Appendix A.3 (`LenderResultsData`).

The Rule Engine MUST return that exact format. No additional fields, no missing fields.

Key mapping from rule evaluation to output:

| Rule Evaluation Result                      | Output Field                                |
| ------------------------------------------- | ------------------------------------------- |
| All hard_gates passed, full amount          | `traffic_light: "green"`                    |
| Some hard_gates failed but deviations exist | `traffic_light: "amber"`                    |
| Hard_gates failed, no deviations            | `traffic_light: "red"`                      |
| Cannot evaluate (missing data)              | `traffic_light: "grey"`                     |
| Assessed income after haircuts              | `key_metrics.net_income`                    |
| FOIR calculation result                     | `key_metrics.foir`                          |
| LTV calculation result                      | `key_metrics.ltv`                           |
| Primary applicant CIBIL                     | `key_metrics.cibil`                         |
| Each hard_gate result                       | `factors[]` with impact = positive/negative |
| Deviation matches                           | `suggestions[]`                             |
| Policy display objects                      | Mapped to relevant output fields            |
| Income haircut details                      | Part of `factors[]`                         |

---

## 8. Deviation Model

Deviations are rules that CAN be broken with authority approval. They are critical for real-world DSA work.

### 8.1 When Deviations Apply

A deviation is checked ONLY when a hard_gate fails. The engine:

1. Finds the failed hard_gate's `rule_id`
2. Searches deviations for any with `deviates_from` matching that `rule_id`
3. Evaluates the deviation's `condition` against the payload
4. If condition passes -> deviation is AVAILABLE (amber, not red)

### 8.2 Impact on Output

- Traffic light changes from RED to AMBER
- `factors[]` entry shows the failed gate with `impact: "negative"`
- `suggestions[]` entry shows the deviation with `effort: "moderate"` or `"significant"`
- `key_metrics.approval_probability` is reduced by `probability_modifier`

---

## 9. Policy Display Objects

Policies are non-computable information displayed on offer cards. They use UNIVERSAL keys across all lenders.

See the parsing prompt (Section 3) for the full list of universal `policy_key` values.

**Rendering rule**: The offer card component reads `policies[]` and renders each by `category`. If a policy_key is null for a lender, it shows "Not specified" (never blank, never assumed).

---

## 10. Test Strategy

### 10.1 Backend Tests (Vitest)

Location: `src/lib/testing/__tests__/ruleEngine/`

#### Test Category 1: Rule Validator

Tests that the rule validator catches invalid rules.

```typescript
// ruleValidator.test.ts
describe('Rule Validator', () => {
	// 1. Valid keys pass
	test('accepts rules using valid payload keys', () => {});

	// 2. Invalid keys fail
	test('rejects rules using keys not in payload registry', () => {});

	// 3. Nested key validation
	test('validates nested keys like salariedProfile.worksForReputedOrg', () => {});

	// 4. Array index keys
	test('validates array-indexed keys like allApplicantDetails.0.creditScore', () => {});

	// 5. Obligation sub-keys
	test('validates obligation entry keys', () => {});

	// 6. Null sections pass
	test('accepts null for missing sections', () => {});

	// 7. Missing required fields fail
	test('rejects rules without rule_id', () => {});
	test('rejects rules without confidence', () => {});
	test('rejects rules without source_excerpt', () => {});

	// 8. Deviation references
	test('rejects deviations referencing non-existent rule_id', () => {});

	// 9. Policy key validation
	test('rejects policies with non-universal policy_key', () => {});

	// 10. Full document validation
	test('validates a complete lender rule document', () => {});
});
```

#### Test Category 2: Rule Evaluation

Tests that rules evaluate correctly against known payloads.

```typescript
// ruleEvaluation.test.ts
describe('Rule Evaluation', () => {
	// CIBIL gates
	test('GREEN: CIBIL 780 passes 700 minimum gate', () => {});
	test('RED: CIBIL 620 fails 700 minimum gate', () => {});
	test('AMBER: CIBIL 670 fails gate but deviation exists for high income', () => {});

	// FOIR computation
	test('computes FOIR correctly for salaried with no obligations', () => {});
	test('computes FOIR correctly with mixed obligations (term + credit line)', () => {});
	test('applies correct FOIR cap per income bracket', () => {});

	// Income assessment
	test('applies 100% for salaried net income', () => {});
	test('applies 30% haircut for rental income without ITR', () => {});
	test('rejects agriculture income when lender does not accept it', () => {});
	test('caps secondary income at max_contribution_percent', () => {});

	// LTV
	test('computes LTV correctly for new purchase', () => {});
	test('applies lower LTV for resale properties', () => {});
	test('LTV not applicable for unsecured loans', () => {});

	// Obligation treatment
	test('counts term loan EMI at full factor', () => {});
	test('counts credit line at 5% of sanctioned limit', () => {});
	test('ignores obligations marked as closing', () => {});
	test('counts guarantor obligation at 50% factor', () => {});

	// Multi-applicant
	test('evaluates primary + co-applicant combined income', () => {});
	test('uses lowest CIBIL across all applicants for eligibility', () => {});

	// Edge cases
	test('handles zero-income applicant (guarantor)', () => {});
	test('handles applicant with no obligations', () => {});
	test('handles company applicant with directors', () => {});
	test('handles NRI applicant', () => {});
	test('handles pensioner with family pension', () => {});
});
```

#### Test Category 3: Output Contract

Tests that the output matches the expected schema.

```typescript
// outputContract.test.ts
describe('Output Contract', () => {
	test('output has summary with all required fields', () => {});
	test('output has results array with all required fields per entry', () => {});
	test('traffic_light is one of green/amber/red/grey', () => {});
	test('factors array has valid impact values', () => {});
	test('suggestions array has valid effort values', () => {});
	test('key_metrics has all required fields', () => {});
	test('policies use only universal policy_key values', () => {});
	test('results are sorted: green first, then amber, then red', () => {});
	test('summary counts match actual results', () => {});
	test('best_amount/best_roi/best_emi are correct', () => {});
});
```

#### Test Category 4: Fixture Regression

Tests that known applicant profiles produce expected results.

```typescript
// fixtureRegression.test.ts
describe('Fixture Regression', () => {
	// 15 fixture profiles
	test('Fixture 1: Salaried 80K, CIBIL 780, no obligations -> majority GREEN', () => {});
	test('Fixture 2: Salaried 35K, CIBIL 720, car loan running -> mixed GREEN/AMBER', () => {});
	test('Fixture 3: Self-employed 3yr ITR, CIBIL 750, 2 running loans -> GREEN for NBFC, AMBER for PVT', () => {});
	test('Fixture 4: Self-employed cash-heavy, CIBIL 680, no ITR -> mostly RED', () => {});
	test('Fixture 5: Pensioner 40K, CIBIL 800, no obligations -> GREEN for select lenders', () => {});
	test('Fixture 6: NRI salaried, CIBIL 760, no obligations -> GREEN where NRI accepted', () => {});
	test('Fixture 7: Company (Pvt Ltd), 8yr old, profitable -> GREEN for business loan', () => {});
	test('Fixture 8: BT clean track, CIBIL 770 -> GREEN for BT', () => {});
	test('Fixture 9: BT irregular track, CIBIL 650 -> mostly RED, some AMBER with deviation', () => {});
	test('Fixture 10: CIBIL 580 (default history) -> all RED', () => {});
	test('Fixture 11: High obligations (FOIR > 70%) -> RED for most, AMBER for NBFC', () => {});
	test('Fixture 12: Multi-applicant (couple, both salaried) -> GREEN with higher amounts', () => {});
	test('Fixture 13: Very high income (20L/month) -> GREEN everywhere, max amounts', () => {});
	test('Fixture 14: Young (23yr) first-time buyer -> reduced tenure, GREEN if CIBIL OK', () => {});
	test('Fixture 15: Senior (58yr) pensioner -> very short tenure, limited lenders', () => {});
});
```

### 10.2 Browser-Based Tests (Manual + Playwright)

These tests verify the FULL flow: form fill -> API call -> result rendering.

Location: `src/lib/testing/e2e/ruleEngine/`

#### Manual Test Plan (Browser)

You (the human) run these in the browser. Each test has:

- **Precondition**: What to set up
- **Steps**: What to do
- **Expected**: What to verify on screen
- **Pass criteria**: Specific, measurable

```
TEST-RE-001: Basic Home Loan Eligibility
  Precondition: Login as DSA, navigate to Home Loan form
  Steps:
    1. Fill: Home Loan, New Loan, 60L, 20 years
    2. Property: Mumbai, Flat, Direct Sale, Ready to Move, Approved, 75L cost, 15L down
    3. Applicant: Salaried Private, Age 35, CIBIL 780, Net Income 1.25L
    4. No obligations
    5. Submit
  Expected:
    - Results page loads within 15 seconds
    - At least 10 lender cards appear
    - At least 5 are GREEN (Eligible)
    - Each GREEN card shows: loan amount, EMI, tenure, interest rate
    - Interest rates are between 8% and 12%
    - EMI values are reasonable (30K-60K range for 60L/20yr)
  Pass: All GREEN cards have non-zero amount, EMI, tenure, rate

TEST-RE-002: Low CIBIL Rejection
  Precondition: Same as RE-001
  Steps:
    1. Same as RE-001 but CIBIL = 580
    2. Select "Loan Default" as reason
    3. Submit
  Expected:
    - Most cards are RED
    - RED cards show rejection reason mentioning CIBIL
    - Some NBFC cards may be AMBER with deviation note
    - No card shows GREEN with CIBIL < 600
  Pass: Zero GREEN cards, rejection reasons mention CIBIL

TEST-RE-003: Self-Employed Income Assessment
  Precondition: Login as DSA, Home Loan form
  Steps:
    1. Applicant: Self-employed Professional (CA), Age 40, CIBIL 750
    2. Financial: 3yr ITR, Net Profit [10L, 12L, 14L], Gross Receipts [30L, 35L, 40L]
    3. Loan: Home Loan, New Loan, 50L, 15 years
    4. Submit
  Expected:
    - GREEN cards show assessed income (lower than gross receipts due to method)
    - FOIR shown in eligibility details
    - Income assessment factors visible in details section
  Pass: Assessed income < total gross receipts, FOIR is computed

TEST-RE-004: Multi-Applicant Combined Income
  Precondition: Home Loan form, 2 applicants
  Steps:
    1. Primary: Salaried 80K net, CIBIL 760
    2. Co-applicant: Salaried 50K net, CIBIL 740, Spouse
    3. Loan: 80L, 25 years
    4. Submit
  Expected:
    - Combined income of 1.3L reflected in assessment
    - Higher eligible amount than single applicant
    - CIBIL used = 740 (lowest of both)
  Pass: Total income shows 1.3L, eligible amounts are higher than for 80K alone

TEST-RE-005: Balance Transfer
  Precondition: Home Loan form, BT type
  Steps:
    1. BT: Current bank HDFC, Outstanding 40L, Current rate 10%, Remaining 180 months, EMI 42K
    2. 6 months after registry: Yes
    3. Current property value: 70L
    4. New tenure: 15 years
    5. Applicant: Salaried 90K, CIBIL 770
    6. Submit
  Expected:
    - Results show BT-specific details (outstanding amount section)
    - New EMI should be lower than 42K (current) for most lenders
    - Savings shown (current EMI - new EMI)
  Pass: At least some lenders offer rate < 10%, new EMI < 42K

TEST-RE-006: Obligation Impact on FOIR
  Precondition: Home Loan form
  Steps:
    1. Applicant: Salaried 1L net, CIBIL 760
    2. Obligations: Car loan EMI 25K, Personal loan EMI 15K, CC limit 5L
    3. Loan: 40L, 20 years
    4. Submit
  Expected:
    - FOIR in details > 40% (existing EMIs are 40K on 1L income)
    - Some lenders RED due to high FOIR
    - Eligible amounts lower than TEST-RE-001 (with same income but no obligations)
  Pass: Eligible amounts are measurably lower, FOIR is shown correctly

TEST-RE-007: LAP Specific
  Precondition: LAP form
  Steps:
    1. LAP, New Loan, 30L, 15 years
    2. Property: Commercial, Self-occupied, OC+CC available, Municipal approved
    3. Carpet area: 2500 sq ft
    4. Applicant: Self-employed Businessman, CIBIL 730, 3yr ITR
    5. Submit
  Expected:
    - LAP-specific details shown (carpet area, property type)
    - LTV typically lower than Home Loan (60-70% vs 75-90%)
    - Eligible lenders may be fewer than Home Loan
  Pass: LAP cards appear with correct property details

TEST-RE-008: Personal Loan (Unsecured)
  Precondition: Personal Loan form
  Steps:
    1. Personal Loan, New Loan, 5L, 3 years
    2. Applicant: Salaried 60K, CIBIL 750
    3. No obligations
    4. Submit
  Expected:
    - No property section shown
    - Higher interest rates than Home Loan (12-18%)
    - Shorter tenure options
    - No LTV-related factors
  Pass: Cards show PL-specific terms, no property fields

TEST-RE-009: Edge Case - Zero Down Payment
  Precondition: Home Loan form
  Steps:
    1. Home Loan, 75L loan, 75L property cost, 0 down payment
    2. Standard salaried applicant
    3. Submit
  Expected:
    - Most/all lenders RED (100% LTV not allowed)
    - Rejection reasons mention LTV or down payment
    - Suggestions mention increasing down payment
  Pass: No GREEN cards (LTV > max allowed)

TEST-RE-010: Offer Card Detail Completeness
  Precondition: Any successful submission with GREEN results
  Steps:
    1. Click "Show Details" on a GREEN card
    2. Check all 4 tabs: Overview, Documents, Charges, Features
  Expected:
    - Overview: FOIR, max eligible, monthly income, loan capacity
    - Documents: Non-empty list
    - Charges: Processing fee, stamp duty, etc.
    - Features: At least one feature category
  Pass: All 4 tabs have non-empty content
```

#### Playwright E2E Tests

```typescript
// ruleEngineE2E.spec.ts
// These automate the manual tests above

test.describe('Rule Engine E2E', () => {
	test('RE-001: Basic Home Loan produces GREEN results', async ({ page }) => {
		// Fill form programmatically
		// Submit
		// Assert: results page loads
		// Assert: GREEN cards > 0
		// Assert: each card has amount, EMI, tenure, rate
	});

	test('RE-002: Low CIBIL produces RED results', async ({ page }) => {
		// Same form but CIBIL = 580
		// Assert: no GREEN cards
		// Assert: rejection reasons present
	});

	test('RE-010: Offer card details are complete', async ({ page }) => {
		// Click show details on first GREEN card
		// Assert: overview tab has FOIR
		// Assert: documents tab has items
		// Assert: charges tab has items
		// Assert: features tab has items
	});
});
```

---

## 11. RM Portal Integration

### 11.1 Rule Review on RM Portal

The RM Portal (`/dashboard/rm/policies`) will show:

1. Human-readable version of the rule document
2. Section-by-section breakdown
3. Query submission form per section
4. Resolution status tracking

### 11.2 Query Communication

Uses existing `CommunicationThreads` collection with:

- `message_type: 'query'` for RM questions
- `message_type: 'response'` for team answers
- New thread per rule artifact review

### 11.3 Query Categories

| Category               | Example                                 | Auto-Correctable?                       |
| ---------------------- | --------------------------------------- | --------------------------------------- |
| `rule_incorrect`       | "Our LTV for resale is 75%, not 80%"    | Yes (value swap)                        |
| `rule_missing`         | "You haven't included our NRI policy"   | No (needs new rules)                    |
| `rule_outdated`        | "This was updated last month"           | Partial (needs new source)              |
| `clarification_needed` | "What does 'sound profile' mean?"       | No (needs human decision)               |
| `conditional_rule`     | "This applies only for loans above 50L" | No (structural change)                  |
| `internal_policy`      | "Don't show this on offer cards"        | Yes (set display_on_offer_card = false) |

---

## Appendix: File References

| File                                                      | Purpose                          |
| --------------------------------------------------------- | -------------------------------- |
| `src/lib/utils/payloadBuilder.ts`                         | Authoritative payload key source |
| `src/lib/types/loanTypes.ts`                              | Current LoanOffer response type  |
| `docs/LOAN-ASSESSMENT-API-INTEGRATION.md`                 | API contract (input/output)      |
| `docs/PAYLOAD_DOCUMENTATION.md`                           | Human-readable payload docs      |
| `src/lib/components/LoanOfferCard.svelte`                 | Offer card rendering             |
| `src/routes/(app)/(offers)/home-loan-offers/+page.svelte` | Home loan results page           |
| `src/lib/server/rejectionAnalyzer.ts`                     | Rejection analysis logic         |
| `src/lib/config/bankSelection/bankName.ts`                | Bank master list                 |

---

**End of Document**
