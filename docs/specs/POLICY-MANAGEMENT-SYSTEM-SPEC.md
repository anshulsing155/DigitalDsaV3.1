# Policy Management System (PMS) — Full Specification

**Status:** Draft for review  
**Date:** 2026-04-23  
**Author:** DigitalDSA Engineering  
**Reviewers:** QA Team, Rule Engine Design Team

---

## 1. Purpose and Context

### 1.1 Problem Statement

Bank lending policies arrive as natural language documents — PDFs, circulars, RM field notes, aggregator summaries. Today these are hand-translated by developers into TypeScript config files. This process is:

- Slow (developer bottleneck)
- Error-prone (no validation that encoding matches intent)
- Non-auditable (no link between source document and code)
- Not RM-editable (RMs with ground-truth knowledge cannot contribute directly)
- Not version-tracked in a way that connects policy versions to case evaluations

The Policy Management System replaces this with a UI-driven, role-gated, version-controlled system where policies are stored in MongoDB, expressed exclusively in JSON-Logic using form payload keys, and validated for semantic equivalence with their source documents before publication.

### 1.2 Platform Context

DigitalDSA is a multi-lender loan orchestration platform for DSAs (Direct Selling Agents) in India. It supports 6 loan products:

- Home Loan (HL)
- Loan Against Property (LAP)
- Plot and Construction Loan
- Personal Loan (PL)
- Business Loan (BL)
- Professional Loan (Prof)

The rule engine evaluates each case against 77+ lenders simultaneously. Each lender has a policy that governs eligibility, income assessment, FOIR, LTV, tenure, ROI, and geographic coverage. The PMS is the system that creates and maintains these policies.

### 1.3 Current Architecture (to be replaced/extended)

Policies currently live in:

```
src/lib/config/lenderPolicies/
  categoryDefaults.ts     — base defaults per classification (PSB/PVT/HFC/NBFC/SFB)
  lenderOverrides.ts      — per-lender scalar overrides
  lenderDirectory.ts      — lender metadata (geo, products, classification)
  compiler.ts             — merges defaults + overrides into compiled policy
  helpers.ts              — rule template functions (the template library)
  types.ts                — type definitions
```

The PMS does not delete this architecture. It adds a MongoDB layer on top so policies can be authored and edited via UI, with the compiled output feeding the same evaluation engine.

### 1.4 The Existing Compiler — What It Does and Why It Matters

Understanding `compiler.ts` is essential to understanding how the PMS works.

**The core idea:** Developers never write raw JSON-Logic by hand. Instead, they write simple scalar values in TypeScript:

```typescript
// Developer writes this — simple, readable
const sbiPolicy = {
  minCibil: 550,
  foir: { highCap: 0.65, highThreshold: 150000, midCap: 0.55, lowCap: 0.5 }
};
```

`compiler.ts` calls `helpers.ts` — a library of **named rule template functions** — that generate the correct JSON-Logic mechanically:

```typescript
// helpers.ts generates this from minCibil: 550
makeCibilRules('sbi', 550, 0.7)
// →
{
  rule_id: "sbi-cibil-min",
  logic: { ">=": [{ "var": "_computed._max_cibil" }, 550] },
  fail_message: "CIBIL score below minimum of 550",
  confidence: 0.7
}
```

The template function handles everything that a manual JSON-Logic author would get wrong:
- Correct payload path (`_computed._max_cibil`, not `allApplicantDetails.0.creditScore` directly — the enricher computes the household max)
- Correct operator for the null-safety semantics of our json-logic engine
- Correct fail_category, confidence structure, applies_when scope

**Why this matters for the PMS:**

The PMS extends this same idea to the UI. Instead of asking RMs or analysts to write raw JSON-Logic (which has 40+ operators, subtle null-handling bugs, and requires developer-level knowledge), the PMS gives them a **library of parameterised rule templates**. They fill in the parameters. The system generates the JSON-Logic.

This is called **Template-Parameterised Rule Authoring** and is described fully in Section 6.3.

**What the compiler does NOT handle today:**

- Complex conditional rules ("if salaried AND metro AND CIBIL > 750 THEN FOIR = 65%") — these are currently hardcoded per-lender in `realBankRuleDocs.ts`
- Rules derived from non-standard policy language — the normalization layer (Stage 0) is entirely absent
- Any audit trail connecting a rule to its source policy document

The PMS fills all three gaps.

---

## 2. Core Principle: Form-Key-Bound Policy Logic

### 2.1 The Fundamental Rule

Every policy condition must be expressible as a logical combination of actual payload field paths produced by `buildLoanPayload()` and its enricher `payloadEnricher.ts`. The policy system is not a free-text annotation system. Its vocabulary is strictly the form's output keys plus computed enricher fields.

**Example — correct:**
```json
{
  "and": [
    { "===": [{ "var": "allApplicantDetails.0.gender" }, "female"] },
    { "in": [{ "var": "allApplicantDetails.0.employmentType" },
             ["Self-employed(Business)", "Self-employed(Professional)"]] }
  ]
}
```

**Example — forbidden:**
```
"Women entrepreneurs get preferential rates"
```

Natural language conditions do not exist inside the system. They exist only in source documents (input) and reconstructed descriptions (validation output).

### 2.2 The Per-Product Key Registry

A key registry defines exactly which payload field paths are valid for each loan product. The condition builder enforces this — no key outside the registry for the selected product can be entered.

Keys fall into two categories: **form keys** (direct from `buildLoanPayload()`) and **computed keys** (added by `payloadEnricher.ts`). Both are valid for policy authoring — they are all present in the enriched payload object that rules evaluate against.

**Universal keys** — present in all 6 products:

| Key Path | Type | Notes |
|---|---|---|
| `allApplicantDetails.N.employmentType` | enum | Salaried(Private), Salaried(Government), Self-employed(Business), Self-employed(Professional), Pensioner |
| `allApplicantDetails.N.creditScore` | number | 300–900 |
| `allApplicantDetails.N.age` | number | Years |
| `allApplicantDetails.N.gender` | enum | male, female |
| `allApplicantDetails.N.residenceType` | enum | Owned, Rented, Employer-provided, Family-owned |
| `allApplicantDetails.N.isNRI` | enum | Yes, No |
| `allApplicantDetails.N.applicantType` | enum | Individual, Company |
| `allApplicantDetails.N.roleInApplication` | enum | Primary, Co-applicant |
| `allApplicantDetails.N.maritalStatus` | enum | Single, Married, Divorced, Widowed |
| `loanTransaction.loanAmount` | number | INR |
| `loanTransaction.loanName` | enum | Home Loan, Loan Against Property, ... |
| `loanTransaction.numberOfApplicants` | number | |

**Product-scoped keys** — secured loans only (HL / LAP / Plot):

| Key Path | Type | Notes |
|---|---|---|
| `loanTransaction.constructionStatus` | enum | Flat, House, Floor, Under Construction, ... |
| `loanTransaction.propertyAreaType` | enum | RERA_APPROVED, PLANNED_AUTHORITY, CONVERTED_RESIDENTIAL, ... |
| `loanTransaction.propertyState` | string | Indian state name |
| `loanTransaction.propertyCity` | string | City name |
| `loanTransaction.loanType` | enum | New Loan, Balance Transfer Only, Top-up Only, BT + Top-up |
| `loanTransaction.propertyRegistered` | boolean | |
| `loanTransaction.tenureYears` | number | |

**Product-scoped keys** — unsecured loans only (PL / BL / Prof):

| Key Path | Type | Notes |
|---|---|---|
| `loanTransaction.unSecureLoanType` | enum | Standard, Debt Consolidation, ... |

**Professional Loan specific:**

| Key Path | Type | Notes |
|---|---|---|
| `allApplicantDetails.0.professionalCategory` | enum | Doctor, CA, Lawyer, Architect, Engineer, ... |
| `allApplicantDetails.0.practiceVintage` | number | Years in practice |

**Business/Company applicant specific:**

| Key Path | Type | Notes |
|---|---|---|
| `allApplicantDetails.N.companyType` | enum | Private Limited, LLP, Partnership Firm, OPC |
| `allApplicantDetails.N.companyVintageYears` | number | |

**Computed fields** (produced by `payloadEnricher.ts` — fully valid as policy keys):

| Key Path | Type | Notes |
|---|---|---|
| `_computed._max_cibil` | number | Household-maximum CIBIL across all applicants |
| `_computed._min_cibil` | number | Household-minimum CIBIL |
| `_computed._primary_age` | number | Primary applicant age |
| `_computed._primary_employment` | string | Primary applicant employment type |
| `_computed._total_gross_monthly` | number | Combined gross monthly income, all applicants |
| `_computed._total_obligations_monthly` | number | Total EMI obligations |
| `_computed._applicant_count` | number | Total applicant count |
| `_computed._has_co_applicant` | boolean | |
| `_computed._is_business_file` | boolean | Any applicant is self-employed business |
| `_computed._is_salaried_file` | boolean | All applicants are salaried |
| `_computed._income_source_count` | number | Distinct income types across applicants |
| `_computed._income_profile_types` | string[] | Array of income type strings |
| `_computed._facility_type` | string | Term Loan / Overdraft / Drop-line / Cash Credit |
| `_computed._is_credit_line` | boolean | OD/DOD/CC vs term loan |

### 2.3 Scope Selectors

Because many rules apply to a specific subset of applicants, the condition builder exposes a scope selector that generates the correct JSON-Logic path automatically. RMs never write paths manually.

| Scope | JSON-Logic pattern generated |
|---|---|
| Primary applicant | `{ "var": "allApplicantDetails.0.field" }` |
| Any co-applicant | `{ "some": [{ "var": "allApplicantDetails" }, { "===": [{ "var": "field" }, value] }] }` |
| All financially-involved | Filter by `roleInApplication` + financial flag, then `every` |
| Loan-level | `{ "var": "loanTransaction.field" }` |
| Household computed | `{ "var": "_computed._field" }` |

---

## 3. Data Model

### 3.1 PolicyDocument (MongoDB collection: `lender_policies`)

```typescript
interface PolicyDocument {
  _id: ObjectId;
  lenderId: string;               // kebab-case: "hdfc-bank"
  loanProduct: LoanProduct;       // "Home Loan" | "Loan Against Property" | ...
  version: number;                // increments on each publish
  hash: string;                   // SHA-256 of the compiled JSON-Logic
  status: 'draft' | 'submitted' | 'approved' | 'published' | 'archived';
  validFrom: Date;                // effective date
  validTo: Date | null;           // null = currently active

  // Core policy sections — scalar base values
  sections: {
    eligibility: EligibilityConfig;
    income: IncomeConfig;
    foir: FoirConfig;
    ltv: LtvConfig | null;        // null for unsecured
    obligations: ObligationConfig;
    tenure: TenureConfig;
    roi: RoiConfig;
    geo: GeoConfig;
    fees: FeeConfig;
  };

  // Conditional overrides — JSON-Logic conditions that modify section values
  conditionalOverrides: ConditionalOverride[];

  // Clauses that could not be expressed in JSON-Logic
  bankCardNotes: BankCardNote[];

  // Source document reference
  sourceDocument: {
    text: string;                 // original policy text (full or excerpt)
    uploadedAt: Date;
    uploadedBy: string;
  };

  // Reconciliation record
  reconciliation: ReconciliationRecord;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  publishedBy: string | null;
  publishedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
}
```

### 3.2 ConditionalOverride

```typescript
interface ConditionalOverride {
  id: string;                     // uuid
  label: string;                  // human label: "Women borrower rate discount"
  sourceClauseId: string;         // links back to source clause
  authoringMode: 'template' | 'custom_json';  // which mode was used
  templateId: string | null;      // template name if authoringMode = 'template'
  templateParams: Record<string, unknown> | null;  // params if template-based
  condition: JsonLogicRule;       // the compiled JSON-Logic (always present)
  effect: PolicyEffect;           // what changes when condition is true
  scope: ConditionScope;          // primary | any_applicant | all_financial | loan_level
  source: DataSource;             // website | rm_confirmed | aggregator | assumed
  confidence: number;             // 0.0–1.0
  notes: string;
  addedBy: string;
  addedAt: Date;
}

interface PolicyEffect {
  fieldPath: string;              // dot-path into sections: "roi.baseRate"
  operation: 'set' | 'add' | 'multiply' | 'max' | 'min';
  value: number | string | boolean;
}
```

### 3.3 BankCardNote

```typescript
interface BankCardNote {
  id: string;
  text: string;                   // human-readable note shown on offer card
  appliesWhen: string;            // plain language: "Self-employed(Business) applicants"
  sourceClauseId: string;
  routingReason: 'no_key_exists' | 'queued_for_form_question';
  addedBy: string;
  addedAt: Date;
}
```

### 3.4 ReconciliationRecord

```typescript
interface ReconciliationRecord {
  completedAt: Date | null;
  completedBy: string | null;
  signedOff: boolean;             // explicit human sign-off
  clauses: ClauseRecord[];
}

interface ClauseRecord {
  id: string;
  originalText: string;           // raw clause from source document (pre-normalization)
  normalizedText: string;         // after synonym resolution and atomization
  tag: ClauseTag;                 // applicant_related | income_related | ...
  relevance: 'in_scope' | 'out_of_scope' | 'ambiguous';
  status: 'matched' | 'missing' | 'contradicting' | 'partial' | 'bank_card' | 'queued';
  encodedAs: string[];            // override ids that encode this clause
  resolution: string | null;      // notes on how discrepancy was resolved
}
```

### 3.5 PolicySuggestion (MongoDB collection: `policy_suggestions`)

DSA ground-truth suggestions:

```typescript
interface PolicySuggestion {
  _id: ObjectId;
  lenderId: string;
  loanProduct: LoanProduct;
  clauseId: string | null;        // specific clause if referencing one
  fieldPath: string | null;       // specific field if field-level suggestion
  currentValue: unknown;
  suggestedValue: unknown;
  dsaNote: string;
  caseReference: string | null;   // case ID where DSA observed this
  branchCity: string | null;
  status: 'pending' | 'accepted' | 'dismissed';
  reviewedBy: string | null;
  reviewNote: string | null;
  submittedBy: string;            // DSA user id
  submittedAt: Date;
}
```

### 3.6 FutureEnhancementItem (MongoDB collection: `policy_future_queue`)

Unmappable clauses pending form question design:

```typescript
interface FutureEnhancementItem {
  _id: ObjectId;
  conditionText: string;          // normalized clause text
  lenderIds: string[];            // which lenders have this requirement
  suggestedKey: string;           // proposed bindsTo key: "hasBISCertification"
  suggestedValues: string[];      // proposed options: ["Yes", "No"]
  suggestedQuestion: string;      // proposed form question label
  applicableProducts: LoanProduct[];
  status: 'pending' | 'threshold_met' | 'form_question_added';
  raisedAt: Date;
  promotedAt: Date | null;        // when threshold_met was set
  formQuestionId: string | null;  // once added to form
}
```

Threshold: when `lenderIds.length >= 3`, status → `threshold_met`. Admin sees a promotion banner in the policy dashboard.

### 3.7 CanonicalTermEntry (in-memory, maintained in codebase)

The term dictionary is not stored in MongoDB — it changes infrequently and must be code-reviewed before updates. It lives in `src/lib/config/pms/termDictionary.ts`.

```typescript
interface CanonicalTermEntry {
  canonical: string;              // our standard term
  synonyms: string[];             // all known bank variants
  targetKey: string | null;       // payload key if directly mappable
  targetValues: Record<string, string> | null;  // synonym → enum value mapping
  productScope: LoanProduct[] | 'all';
  notes: string;
}
```

---

## 4. Canonical Term Dictionary

Banks use inconsistent vocabulary across policy documents. The same concept appears under different names in different lenders' documents, sometimes within the same document. The PMS maintains a curated dictionary that resolves bank-specific terminology to our canonical payload keys and values before any encoding begins.

This dictionary is **human-curated, not AI-generated**. The AI uses it during Stage 0 normalization. Humans (RM + Admin) extend it when new synonyms are discovered during encoding.

### 4.1 Loan Type Synonyms

| Bank Says | Canonical Term | Our Payload Value |
|---|---|---|
| balance transfer / BT / loan takeover / takeover / portfolio buyout / loan acquisition | Balance Transfer | `loanTransaction.loanType = "Balance Transfer Only"` |
| top-up / top up / additional loan / enhancement / top-up loan | Top-up | `loanTransaction.loanType = "Top-up Only"` |
| BT with top-up / takeover with enhancement | BT + Top-up | `loanTransaction.loanType = "BT + Top-up"` |
| fresh / new / new purchase / acquisition | New Loan | `loanTransaction.loanType = "New Loan"` |

### 4.2 Applicant / Employment Type Synonyms

| Bank Says | Canonical Term | Our Payload Value |
|---|---|---|
| SEP / self-employed professional / professional | Self-Employed Professional | `employmentType = "Self-employed(Professional)"` |
| SENP / self-employed non-professional / businessman / trader / manufacturer / merchant | Self-Employed Business | `employmentType = "Self-employed(Business)"` |
| salaried / service class / job holder / employee | Salaried | `employmentType = "Salaried(Private)"` or `"Salaried(Government)"` (context-dependent) |
| government employee / PSU employee / central/state govt employee | Government Salaried | `employmentType = "Salaried(Government)"` |
| pensioner / retiree / retired govt employee | Pensioner | `employmentType = "Pensioner"` |
| NRI / non-resident Indian / overseas Indian / NRE / NRO holder | NRI | `isNRI = "Yes"` |

### 4.3 Property / Loan Terms

| Bank Says | Canonical Term | Our Payload Value |
|---|---|---|
| own contribution / self contribution / self pay / margin / promoter contribution / equity | Down payment | `loanTransaction.downPaymentPercent` or derived from LTV |
| ready possession / ready to move / RTM / completed | Ready property | `constructionStatus = "Flat"` / `"House"` / `"Floor"` (type-specific) |
| under construction / UC / OC pending | Under construction | `constructionStatus = "Under Construction"` |
| RERA registered / RERA approved | RERA approved | `propertyAreaType = "RERA_APPROVED"` |
| gram panchayat / village authority / GP property | Gram panchayat | `propertyAreaType = "GRAM_PANCHAYAT"` |
| resale / secondary purchase | Resale property | `purchaseType = "resale_normal"` |
| LCR / loan to cost ratio / loan to value / LTV | LTV | `loanTransaction.loanAmount / property cost` |
| EMI / equated monthly instalment / monthly instalment | EMI | obligation entry amount |

### 4.4 Income / FOIR Terms

| Bank Says | Canonical Term | Our Concept |
|---|---|---|
| FOIR / fixed obligation income ratio / obligation ratio / debt to income | FOIR | `_computed._total_obligations / _total_gross_monthly` |
| gross income / gross salary / CTC / cost to company | Gross income | `grossIncome` |
| net income / take home / net salary / net of deductions | Net income | `netIncome` |
| ITR average / average of last 2/3 years ITR | ITR average income | income assessment with vintage-based averaging |
| audited P&L / profit and loss / net profit (per P&L) | Business net profit | self-employed business income entry |
| CA-certified income / certified net profit | CA-certified income | income with `caVerified: true` |
| rental income / rent receipts | Rental income | income type `rental` |
| agriculture income / farm income | Agriculture income | income type `agriculture` |
| stipend / allowance | Usually excluded | → bank card note unless specific key available |

### 4.5 CIBIL / Credit Score Terms

| Bank Says | Canonical Term | Our Payload |
|---|---|---|
| CIBIL score / credit score / bureau score / TransUnion score | CIBIL | `creditScore` |
| minimum CIBIL / CIBIL floor / credit cutoff | Minimum CIBIL | `eligibility.minCibil` |
| -1 / NH (no hit) / new to credit / NTC | No CIBIL / NTC | `creditScore = -1` |

### 4.6 Company / Director Terms

| Bank Says | Canonical Term | Our Payload Value |
|---|---|---|
| Pvt Ltd / Private Limited company / company applicant | Private Limited | `companyType = "Private Limited"` |
| LLP / limited liability partnership | LLP | `companyType = "LLP"` |
| partnership firm / firm | Partnership | `companyType = "Partnership Firm"` |
| proprietor / proprietorship | Proprietor | individual self-employed (no company applicant) |
| director / promoter director | Director | director income entry in company applicant |
| vintage / continuity / years in business / age of business / date of incorporation | Business vintage | `companyVintageYears` |

### 4.7 Terms That Are Out of Scope (irrelevant to evaluation)

These appear in policy documents but are operational/regulatory, not evaluation rules:

- KYC norms, PAN/Aadhaar verification requirements — bank ops, not our gate
- Legal due diligence process, title search requirements — bank's procedure
- Insurance mandate (life/property) — offered by bank, not an eligibility gate
- Branch sanctioning authority / approval matrix — bank-internal
- Regulatory capital requirements, RBI circulars — compliance, not evaluation
- Moratorium procedures — post-disbursement, not eligibility
- Staff loan policies — not applicable to DSA cases
- Banker's cheque / NACH mandate / repayment mode — disbursement ops

The normalization layer marks these as `out_of_scope` automatically; human confirms before discard.

---

## 5. The 6-Stage Pipeline

The pipeline processes one raw policy document into a published, evaluated, version-controlled policy. Stages run sequentially; each produces a reviewable artifact before the next stage begins.

---

### Stage 0: Normalize

**Purpose:** Convert raw, inconsistent bank policy text into clean, structured, DigitalDSA-vocabulary clauses before any encoding begins. This stage exists because policy documents are not structured — they read like legal documents, mix relevant and irrelevant content, use inconsistent terminology, and pack multiple conditions into single sentences.

**Input:** Raw policy text (pasted or parsed from PDF/doc).

**Step 0a — Terminology Resolution (Synonym Normalization):**

The full canonical term dictionary (Section 4) is applied to the raw text. Every known synonym is replaced with the canonical term:

```
Raw:    "For takeover cases, self contribution must be minimum 20%"
After:  "For Balance Transfer cases, down payment must be minimum 20%"

Raw:    "SENP applicants with 3 years vintage and CA certified P&L..."
After:  "Self-Employed Business applicants with 3 years companyVintageYears and CA-certified income..."
```

AI performs this substitution with the dictionary injected into context. Unknown terms that cannot be matched to any canonical term are **flagged** (not assumed) — the RM sees them highlighted for manual resolution.

**Step 0b — Relevance Classification:**

Each paragraph or sentence is classified:

| Class | Meaning | Action |
|---|---|---|
| `in_scope` | Eligibility, income, FOIR, LTV, tenure, ROI, fees, geography | Proceed to atomization |
| `out_of_scope` | KYC, legal due diligence, ops, insurance mandate, staff policy, RBI compliance | Mark and skip — shown to RM as discarded |
| `ambiguous` | Unclear whether it's a rule we can encode or an operational procedure | Hold for RM review before proceeding |

RM reviews all `ambiguous` classifications and confirms or reclassifies. `out_of_scope` items are shown in a collapsed panel — RM can override and pull back to `in_scope` if the AI misclassified.

**Step 0c — Clause Atomization:**

Long compound sentences are split into atomic IF-THEN statements. Each atom = one condition + one outcome.

```
Raw clause:
"For salaried applicants with minimum 3 years of service in current organization, 
 where gross monthly income exceeds ₹75,000 and CIBIL score is 750 or above 
 in Tier 1 cities, maximum FOIR permissible is 65%, subject to overall loan 
 not exceeding ₹5 crores."

Atomized output:
  Atom 1:  IF employmentType = Salaried AND currentEmployerVintageYears >= 3
  Atom 2:  AND grossMonthly > 75,000
  Atom 3:  AND maxCibil >= 750
  Atom 4:  AND propertyCity IN [tier1_cities]
  Outcome: foirCap = 0.65
  Outcome: maxLoanAmount = 50,000,000
```

Each atom becomes one row in the clause list. The RM can merge atoms back or split further.

**Step 0d — Ambiguity Flagging:**

The AI flags clauses it cannot confidently interpret:

- Multiple interpretations possible: flagged with both interpretations for RM to choose
- Conflicting with another clause in the same document: flagged as internal conflict
- References another document ("as per RBI circular dated..."): flagged as external reference, not encoded
- Uses unmapped terminology after synonym lookup: flagged for dictionary extension or bank card routing

**Output of Stage 0:** An ordered, annotated clause list where each clause has canonical terminology, a relevance tag, an atomized structure, and any ambiguity flags resolved. This is what Stage 1 receives.

---

### Stage 1: Ingest

**Input:** Normalized clause list from Stage 0.

**Process:**
1. The clause list is presented to the RM in a reviewable form — one clause per row, with the original and normalized text shown side-by-side
2. RM can merge/split/retag/delete before proceeding
3. New synonyms discovered during review can be submitted for addition to the term dictionary (admin-approved addition to `termDictionary.ts`)

**Output:** Confirmed list of `ClauseRecord` objects with `status: 'pending'` and `relevance: 'in_scope'`.

---

### Stage 2: Encode

For each clause, attempt mapping to JSON-Logic using the per-product key registry.

**Encoding attempt (AI-assisted with key registry injected into prompt):**

The AI receives:
- The normalized clause text (atoms from Stage 0)
- The full key registry for the selected loan product (keys, types, valid values, computed field descriptions)
- The template library: list of available template names and their parameter schemas
- Instruction: prefer a named template over raw JSON-Logic; only use key paths from the registry; never invent keys

AI returns:
```typescript
{
  mappable: boolean,
  preferredMode: 'template' | 'custom_json',
  templateId: string | null,        // if preferredMode = 'template'
  templateParams: Record<string, unknown> | null,
  rawConditions: [{keyPath, operator, value, scope}],  // if preferredMode = 'custom_json'
  confidence: number,
  unmappableReason: string | null   // if mappable = false
}
```

**Three routing outcomes:**

| Outcome | Condition | Action |
|---|---|---|
| **Encoded** | Fully mappable | Pre-fill condition builder in preferred mode. Status → `pending_review`. |
| **Bank Card** | Unmappable + unique to this lender | Route to `BankCardNote`. Status → `bank_card`. |
| **Future Queue** | Unmappable + 3+ lenders share it | Route to `FutureEnhancementItem`. Status → `queued`. |

`bank_card` and `queued` clauses are excluded from Stage 4 reconciliation. They are shown in a separate panel so the RM knows exactly what was not encoded and why.

**Condition Builder (human validation layer):**

For each `encoded` clause, the RM sees a visual condition builder pre-filled by AI in one of three authoring modes (see Section 6.3):

```
Clause: "CIBIL score must be at least 750 for salaried applicants"

Authoring Mode: [Template-Parameterised ▼]
Template:       [MinCibilByEmploymentType]

  Parameter: CIBIL Floor       [750]
  Parameter: Employment Types  [Salaried(Private) ✕] [Salaried(Government) ✕] [+ Add]

Effect:    Applies as: [Eligibility gate ▼]
           Field:      [eligibility.minCibil]

Source:    [Website ▼]   Confidence: [0.92]
Notes:     _______________
```

RM can: accept AI suggestion as-is, modify parameters, switch authoring mode, or discard and encode manually.

---

### Stage 3: Reconstruct

After the RM completes encoding all clauses, the system generates natural language back from the JSON-Logic rules.

**Two parallel methods:**

**Method A — Template-based (deterministic, primary validation source):**

Each template produces a canonical English description from its stored parameters. For custom JSON-Logic, patterns map to English templates. Examples:

```
Template: MinCibilByEmploymentType(floor=750, types=["Salaried(Private)", "Salaried(Government)"])
→ "For salaried applicants (private or government), minimum CIBIL score must be 750"

{ ">=": [{ "var": "allApplicantDetails.0.age" }, 21] }
→ "Primary applicant must be at least 21 years of age"

{ "===": [{ "var": "allApplicantDetails.0.gender" }, "female"] }
  AND effect: { "roi.baseRate": { "add": -0.25 } }
→ "Female applicants receive a 0.25% reduction in base ROI"

Template: FoirByIncomeBand(high=0.65, highThreshold=75000, mid=0.55, low=0.45)
→ "FOIR capped at 65% for income above ₹75,000/month; 55% for mid-band; 45% for lower income"
```

**Method B — AI prose reconstruction (readability layer):**

The full compiled JSON-Logic is sent to AI with the key registry and term dictionary for context. AI generates a complete policy description in the same style as real bank policy documents. Used alongside Method A — more readable, but not treated as ground truth. Discrepancies between Method A and Method B output themselves flag encoding ambiguities.

---

### Stage 4: Reconcile

**The semantic equivalence gate.** This stage does not complete until the RM confirms the reconstructed policy means the same thing as the original document.

**Three-column comparison interface:**

```
┌─────────────────────────────┬─────────────────────────────┬──────────────┬──────────┐
│ Original Clause (normalized) │ Reconstructed (Template)     │ Status       │ Action   │
├─────────────────────────────┼─────────────────────────────┼──────────────┼──────────┤
│ CIBIL ≥ 750 for salaried    │ CIBIL ≥ 750 for salaried    │ ✓ Matched    │ —        │
│ Women get 0.25% rate cut    │ Women get 0.25% rate cut    │ ✓ Matched    │ —        │
│ Min 2 yrs job stability      │ [absent]                    │ ✗ Missing    │ [Add]    │
│ Max age 65 at maturity       │ Max age 60 at maturity      │ ✗ Contradicts│ [Fix]    │
│ NRI accepted (with GPA)     │ NRI accepted                │ ⚠ Partial    │ [Extend] │
│ BIS cert for manufacturing  │ —                           │ 🏦 Bank Card │ —        │
└─────────────────────────────┴─────────────────────────────┴──────────────┴──────────┘
```

**Resolution actions:**

- **Missing → [Add]:** Opens condition builder pre-filled with AI suggestion for the missing clause. RM encodes → reconstructed text updates instantly → status rechecks.
- **Contradicting → [Fix]:** Opens the offending condition in editor with the discrepancy highlighted. RM corrects value/operator → re-encodes → status rechecks.
- **Partial → [Extend]:** Opens the condition → RM adds missing sub-conditions → re-encodes → status rechecks.
- **Bank Card / Queued:** Shown as informational rows. No action required — excluded from reconciliation.

**Iteration:** The loop runs until all non-excluded clauses show ✓ Matched.

**Human sign-off:** RM/Admin must explicitly check: *"The reconstructed policy accurately reflects the original document in all material respects."* This checkbox is the legal/compliance anchor. Publishing is blocked until it is checked.

**What "same meaning" means operationally:**
- Every clause in the original that was claimed to be encoded must appear in the reconstructed text
- No reconstructed clause may contradict the original
- Partial matches must be extended until fully captured
- It is acceptable for the reconstructed text to be more precise or structured than the original — the standard is meaning equivalence, not word equivalence

---

### Stage 5: Validate and Publish

**QA scenario test:**

Run the new policy against all synthetic profiles (37 journeys × 8 city/CIBIL variations = 296 profiles). Show diff table:

```
Profile ID              | Eligibility      | FOIR  | ROI Band | Tenure | Changed
VG-HL-SAL-CLEAN-V01    | Eligible         | 42.3% | Standard | 360mo  | —
VG-HL-SE-PRO-V03       | Ineligible ← NEW | 51.1% | —        | —      | ✓ FLIPPED
VG-EDGE-GOVT-SAL-V07   | Eligible         | 38.9% | Premium  | 300mo  | ✓ ROI ↑
VG-EDGE-NRI-V02        | Eligible ← NEW   | 44.0% | Standard | 360mo  | ✓ FLIPPED
```

Each changed row is clickable → full evaluation trace, before vs after policy values, which specific rule caused the change.

**Unexpected flips → return to Stage 4.** Expected flips → Admin notes them as intentional and approves.

**Approval workflow:**

```
RM submits → Admin reviews (impact report + reconciliation log) → Admin approves → Published
```

**Published version stores:**
- Compiled JSON-Logic rules (immutable)
- Reconstructed natural language summary (Stage 3 output)
- Original source document text
- Full normalization record (Stage 0 — synonym substitutions, discarded clauses, ambiguity resolutions)
- Full reconciliation log (clause-by-clause status + resolution notes)
- QA scenario test result snapshot
- `validFrom` effective date
- SHA-256 hash
- Published by, approved by, timestamps

---

## 6. Role Access Matrix

| Action | Admin | RM | DSA |
|---|---|---|---|
| Create new policy draft | ✓ | ✓ | — |
| Edit draft (all sections) | ✓ | Own lenders only | — |
| Mark field as `rm_confirmed` | ✓ | ✓ | — |
| Submit for approval | ✓ | ✓ | — |
| Approve and publish | ✓ | — | — |
| View all published policies | ✓ | ✓ | Read-only |
| Submit DSA suggestion | — | — | ✓ |
| Review/dismiss DSA suggestion | ✓ | ✓ | — |
| View future enhancement queue | ✓ | ✓ | — |
| Promote queue item to form question | ✓ | — | — |
| View version history | ✓ | ✓ | ✓ |
| Roll back to previous version | ✓ | — | — |
| Add entry to term dictionary | ✓ | Suggest only | — |

---

## 7. Editing Modes

### 7.1 Mode A — Progressive Form (primary)

Section-by-section, field-by-field UI. Each field shows:
- Current value
- Source badge: `assumed` / `website` / `aggregator` / `rm_confirmed`
- Confidence indicator (0–100%)
- Last verified date
- Free-text notes field
- Inline edit + save per field or per section

Sections map directly to `PolicyDocument.sections`:
1. Lender Identity (classification, geo, products)
2. Applicant Rules (age, CIBIL, employment acceptance, NRI, company)
3. Income Rules (per-type haircuts, acceptance flags, multi-source combining)
4. Obligation Rules (term loan method, credit line method, ignore-if-closing)
5. FOIR (tiered caps by income band)
6. LTV — secured only (tiered by loan slab, max LCR)
7. Tenure + ROI (per loan product)
8. Fees + Operational (processing fee, TAT, login fee, special schemes)
9. Conditional Overrides (the JSON-Logic conditions list — uses Rule Authoring Modes below)
10. Bank Card Notes (what was excluded and why)

### 7.2 Mode B — Direct JSON (power users)

Raw JSON editor for the full compiled policy object. Features:
- Syntax highlighting
- Schema validation on keystroke (key paths validated against key registry)
- Diff view vs previous published version
- Cannot save if schema validation fails

Both modes operate on the same underlying `PolicyDocument`. Switching between them is live — changes in one immediately reflect in the other.

### 7.3 Rule Authoring Modes (for Conditional Overrides section)

When authoring or editing a conditional override in Section 9 of the Progressive Form, three authoring modes are available. These are applied in order of preference:

---

**Authoring Mode 1 — Template-Parameterised (preferred, covers ~85% of policy clauses)**

The RM selects a named rule template from the library and fills in only the variable parameters. The system generates correct, pre-tested JSON-Logic from the template.

This is the same mechanism that `compiler.ts` + `helpers.ts` use internally for static policies — extended to the UI so non-developer analysts can author rules without knowing JSON-Logic.

Benefits:
- Templates are pre-tested — the `!=` null-safety bug and other JSON-Logic edge cases are already handled inside the template
- Parameters are domain-vocabulary (CIBIL floor, FOIR cap, income band threshold) — not JSON-Logic operators
- NL reconstruction from a template is trivial and 100% deterministic
- Audit record stores `templateId + params`, which is more human-readable than raw JSON-Logic

**Current template library (mirrors `helpers.ts` + PMS extensions):**

| Template ID | Parameters | What it generates |
|---|---|---|
| `MinCibil` | `floor: number` | Minimum CIBIL gate (household max) |
| `MinCibilByEmploymentType` | `floor: number, employmentTypes: string[]` | CIBIL floor conditional on employment |
| `FoirByIncomeBand` | `high, mid, low: number; highThreshold, lowThreshold: number` | 3-tier FOIR cap |
| `FoirFlat` | `cap: number` | Single FOIR cap regardless of income |
| `MinAge` | `age: number` | Primary applicant minimum age |
| `MaxAge` | `age: number` | Primary applicant maximum age |
| `MaxAgeAtMaturity` | `age: number` | Age at loan maturity gate |
| `LtvByLoanSlab` | `high, mid, low: number; highSlab, midSlab: number` | 3-tier LTV by loan amount |
| `LtvByCibilBand` | `highCibil, midCibil, lowCibil: number; highThreshold, midThreshold: number` | LTV conditioned on CIBIL |
| `GeoExcludeStates` | `states: string[]` | Block specific states |
| `GeoIncludeStates` | `states: string[]` | Allow only listed states |
| `ProductEligibility` | `products: string[]` | Which loan products this lender accepts |
| `EmploymentAcceptance` | `acceptedTypes: string[]` | Which employment types accepted |
| `CompanyVintage` | `minYears: number` | Company applicant minimum vintage |
| `SalariedVintage` | `minMonths: number` | Salaried minimum current employer tenure |
| `ProfessionalCategory` | `acceptedCategories: string[]` | Which professional types accepted (Prof Loan) |
| `RoiDiscountByGender` | `discount: number, gender: string` | ROI reduction for gender segment |
| `RoiByEmploymentType` | `type: string, roi: RoiConfig` | Different ROI for employment type |
| `MaxLoanAmount` | `amount: number` | Hard cap on loan amount |
| `MinLoanAmount` | `amount: number` | Minimum loan ticket size |
| `NriGpa` | _(no params)_ | NRI requires GPA details |
| `NtcAccepted` | `accepted: boolean` | No-credit-history policy |

New templates are added when a pattern appears in 3+ lenders' policies and no existing template covers it (same 3-lender threshold as the future enhancement queue).

---

**Authoring Mode 2 — Custom JSON-Logic (developer-only)**

For complex conditions that no template covers. Features:
- Full JSON-Logic expression editor with syntax highlighting
- Live key registry validation — any `var` path not in the registry highlights red
- Null-safety linter — flags use of `!=` / `!==` for unset-value checks, suggests `!` instead (CLAUDE.md CRITICAL PITFALL #1)
- Preview panel shows the reconstructed NL (Method A template match if found, Method B AI prose otherwise)
- Requires explicit "Custom encoding confirmed" checkbox before saving
- Admin must co-approve custom JSON-Logic overrides at Stage 5 (extra approval step)

---

**Authoring Mode 3 — Bank Card Note (not a rule, shown as card text)**

For policy clauses that cannot be expressed through any template or key path. The clause is recorded as a human-readable note displayed on the lender offer card when the DSA views results.

This mode is the escape valve — it ensures no clause is silently lost, even when it cannot be encoded. The reconciliation view in Stage 4 shows it as an explicit "🏦 Bank Card" row, not a gap.

---

## 8. DSA Suggestion Flow

1. DSA views an offer card and sees a policy value they believe is incorrect based on ground experience
2. DSA clicks **"Suggest correction"** on the offer card or in the policy browser
3. DSA fills:
   - What they observed (free text)
   - Which branch/city it relates to
   - Which case reference (optional)
   - Supporting evidence (upload, optional)
4. System creates a `PolicySuggestion` document linked to the specific field and lender
5. RM/Admin sees pending suggestions inline in the policy editor, next to the relevant field:
   ```
   [💬 1 DSA suggestion] FOIR cap: "I've seen 65% accepted at HDFC Bandra — CA profile, high income"
                          — DSA Ramesh, Case #HL-2026-4821, Mumbai ↳ [Accept] [Dismiss]
   ```
6. Accept → pre-fills the field with suggested value for RM to confirm and mark `rm_confirmed`
7. Dismiss → stores dismissal note visible to the DSA

---

## 9. Version Control

- Every published policy is an immutable snapshot
- `version` increments on each publish (not each edit)
- Evaluations store the policy version ID at time of evaluation — historical evaluations are always reproducible
- Version history is viewable with full diff between any two versions
- Rollback: Admin can repoint `status: 'published'` to any previous version, archiving the current one

---

## 10. Future Enhancement Queue — Promotion Flow

```
Clause: "Applicant must hold valid BIS/ISO certification"

Lenders with this requirement: [hdfc-bank] [icici-bank] [axis-bank]  ← 3 reached

Status: THRESHOLD MET

Suggested key:      hasBISCertification
Suggested values:   Yes / No
Suggested question: "Does the applicant hold a valid BIS or ISO certification?"
Applicable to:      Business Loan, Professional Loan

[→ Open Form Question Design]   [Dismiss]
```

When Admin clicks **Open Form Question Design**, a pre-filled form question spec is created in the form config system. Once the question is live in the form and the `bindsTo` key is added to the key registry, all queued clauses for this key can be re-encoded from Stage 2.

The same 3-lender threshold applies to new rule templates: if a clause appears across 3+ lenders and can almost-but-not-quite be expressed by an existing template (e.g., needs one new parameter), a new template is proposed instead of a form question.

---

## 11. Key Design Decisions

### 11.1 Base values are scalar; conditions are JSON-Logic

Policy section base values (`eligibility.minCibil = 700`) remain scalar. Only conditional overrides use JSON-Logic. This keeps the base policy readable, auditable, and diff-friendly. JSON-Logic complexity is isolated to the overrides list.

### 11.2 AI is a draft assistant, not an author

AI participates in Stage 0 (normalization, synonym resolution, clause atomization), Stage 1 (segmentation review suggestions), Stage 2 (encoding suggestions, template matching), and Stage 3 (prose reconstruction). In every case, AI output is a starting point for human review — never auto-saved without RM/Admin confirmation. The reconciliation sign-off is always human.

### 11.3 Templates are the primary encoding path

Raw JSON-Logic authoring (Mode 2) is explicitly a power-user / developer path. The default UI presents Mode 1 (templates) first. Mode 2 requires an extra confirmation step and additional admin approval at Stage 5. This is intentional: it keeps the system accessible to analysts, and it keeps JSON-Logic complexity bounded to patterns the evaluation engine has been tested against.

### 11.4 Normalization is pre-coding, not in-coding

The synonym dictionary and relevance classifier run before any JSON-Logic encoding begins. This ensures the encoding AI operates on clean, standard-vocabulary input — not raw bank language. This separation also means the term dictionary can be improved over time without re-encoding existing policies.

### 11.5 Lender-product scope enforcement

The policy editor only shows product tabs that are in the lender's `loanProducts` list in `lenderDirectory`. Policies cannot be created for products a lender does not offer. This prevents phantom policies from entering the evaluation pipeline.

### 11.6 Clause-to-rule traceability

Every `ConditionalOverride` stores `sourceClauseId`. Every `ClauseRecord` stores `encodedAs: string[]` (override IDs). This bidirectional link means:

- When a bank updates a specific clause, the exact JSON-Logic conditions to update are immediately known
- Audit queries: "which rule came from which part of which policy document?"
- DSA suggestions can reference a specific clause by ID

The normalization record (Stage 0 output) is also stored in the published version, so the chain from raw bank language → canonical term → JSON-Logic is fully traceable.

### 11.7 Gender key normalisation

The form currently captures gender as lowercase (`male`, `female`). Policy conditions must use the same casing as the stored values. Before writing gender-based policy rules, normalise the `applicantQuestions.ts` option values to a single canonical casing (recommendation: `Female` / `Male` capitalised, consistent with other enum values in the payload). One normalisation, applied once, before policies go live.

---

## 12. Open Questions (for review)

The following are explicitly flagged for second-opinion review:

1. **AI provider for normalization and encoding:** Claude API (already in stack) vs a lighter rule-based clause extractor for cost management. What's the acceptable cost per policy encoding session?

2. **Term dictionary update governance:** Currently proposed as code-review-gated (`termDictionary.ts`). Should it be database-managed so RMs can propose additions from the UI without a code deploy? If database-managed, what prevents low-quality additions?

3. **Handling conflicting synonyms across products:** "Vintage" means `companyVintageYears` for business applicants and `currentEmployerVintageYears` for salaried. The atomizer must use context to disambiguate. What's the fallback when context is insufficient — flag for human, or pick the most common interpretation for the product being encoded?

4. **Approval workflow granularity:** Current spec has a single RM → Admin approval gate. Should there be a second-approval step for policies affecting high-volume lenders (SBI, HDFC) given the impact on live cases?

5. **Effective date handling:** Policy says "effective from 1st May 2026." The `validFrom` field supports this. But does the evaluation engine check `validFrom` at evaluation time, or is it the admin's responsibility to publish on the right date? Current spec assumes admin publishes at the right time — no scheduled publish automation.

6. **Impact on open cases:** When a policy changes, open cases (submitted but not evaluated) may get different results on next evaluation. Should the system notify DSAs whose open cases are affected by a policy change? Notification spec is not included here.

7. **Policy inheritance vs override:** Current model is: category defaults + lender overrides = compiled policy. The PMS needs to decide whether RMs edit the override layer only, or whether they can also edit the category defaults (which affect ALL lenders of that classification). Recommendation: category defaults are admin-only, lender overrides are RM-editable.

---

## 13. Out of Scope (this spec)

- Form question design workflow (triggered by Future Enhancement queue promotion — separate spec)
- Lender onboarding (adding a new lender to the directory — separate flow)
- DSA-facing policy browser UI (read-only view — simpler, derive from this spec)
- Production credential management for AI API calls
- Audit log retention and compliance export (GDPR/RBI data retention — separate spec)
- Term dictionary UI management (currently code-gated — see Open Question 2)

---

## 14. Payload System Reference (for QA and Rule Engine teams)

### 14.1 End-to-end data flow

```
DSA fills form
     ↓
buildLoanPayload(loanAnswers, applicants, applicationData, relationships)
     ↓
{ loanTransaction: {...}, allApplicantDetails: [...] }
     ↓
payloadEnricher.ts — adds _computed.* fields (FOIR inputs, age at maturity, etc.)
     ↓
evaluationEngine.ts — runs per lender:
    1. Geo filter        — is lender active in applicant's state/city?
    2. Eligibility gates — age, CIBIL, NRI, company vintage, product availability
    3. Income assessment — 12 income types, per-type haircuts, multi-source
    4. FOIR calculation  — net income vs obligations, tiered caps
    5. LTV check         — loan amount vs property cost (secured only)
    6. Deviation recovery — red → amber when conditions partially met
    7. ROI assignment    — premium/standard/base/fallback based on classification
     ↓
Per-lender result: { eligible, classification, income_assessed, foir, ltv, roi, deviations }
     ↓
resultBuilder.ts → offer cards ranked for DSA
```

### 14.2 loanTransaction fields (key subset)

| Field | Type | Set from |
|---|---|---|
| `loanName` | string | Form answer `loanName` |
| `loanType` | string | Form answer `loanType` (New/BT/TopUp) |
| `loanAmount` | number | Form answer |
| `tenureYears` | number | Form answer |
| `constructionStatus` | string | Derived from `constructionType` answer |
| `propertyAreaType` | string | Form answer |
| `propertyState` | string | Form answer `propertyStateName` |
| `numberOfApplicants` | number | `applicants.length` |
| `assessmentStatus` | string | fresh / bt / topup |

### 14.3 allApplicantDetails entry fields (key subset)

| Field | Type | Set from |
|---|---|---|
| `applicantType` | Individual / Company | Applicant form |
| `employmentType` | string | Applicant profile |
| `age` | number | Applicant profile |
| `gender` | string | Applicant profile |
| `creditScore` | number | Income page |
| `grossIncome` / `netIncome` | number | Income page or journey |
| `salariedProfile` | object | From salaried activity answers |
| `businessProfile` | object | From business activity answers |
| `obligations` | array | Obligation capture |
| `roleInApplication` | Primary / Co-applicant | Applicant form |
| `isNRI` | Yes / No | Applicant form |

### 14.4 Policy evaluation per lender

```
getCategoryDefaults(classification)         — PSB/PVT/HFC/NBFC/SFB base values
+ applyOverride(base, LENDER_OVERRIDES[id]) — lender-specific scalar overrides
+ evaluate ConditionalOverrides             — JSON-Logic conditions from PMS
= compiled policy for this lender
→ run JSON-Logic rules against enriched payload
→ emit per-lender EvaluationResult
```

### 14.5 Income types and haircuts (rule engine moat — do not simplify)

| Income Type | Typical haircut | Notes |
|---|---|---|
| Salaried | 0% | Net salary as-is |
| Self-employed Professional | 15–20% | Per ITR net profit |
| Self-employed Business | 25–35% | Per audited P&L |
| Partnership | 25–35% | Partner's share |
| Director salary | 20–30% | From company payroll |
| Pension | 0% | Full pension amount |
| Rental | 30% | Max 40–50% of total income |
| Freelance/Contractual | 35–40% | |
| Agriculture | 40–50% | Not accepted by all lenders |
| Investment | 50% | Not accepted by all lenders |

Multi-source: applicant may have multiple income types. Each is haircut independently, then combined. Lender policy controls which types are accepted and what max contribution % applies.

---

*End of specification.*

*For implementation plan (DB schema migrations, API routes, admin UI pages, build sequence), see next document.*
