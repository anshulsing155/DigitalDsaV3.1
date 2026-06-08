# LOAN POLICY TO JSON-LOGIC PARSER SPECIFICATION v7.0 (PRODUCTION)

## 🎯 PURPOSE

Convert natural language bank loan policies of **ANY COMPLEXITY LEVEL** into structured, executable JSON-Logic rules that can be directly evaluated by the execution engine (`newEngine.ts`).

This specification handles:
- ✅ Simple policies (single conditions)
- ✅ Medium policies (3-5 nested conditions)
- ✅ Complex policies (6-10 nested conditions)
- ✅ Very complex policies (10+ conditions, multi-dimensional matrices)
- ✅ Arbitrary nesting depth
- ✅ Cumulative calculations with multiple factors
- ✅ Multi-dimensional decision matrices
- ✅ **Strict schema enforcement** (NEW in v7)
- ✅ **Ambiguity detection** (NEW in v7)
- ✅ **Hallucination prevention** (NEW in v7)

---

## 🚨 RULE #0: STRICT SCHEMA ENFORCEMENT (ABSOLUTE - READ THIS FIRST)

### THE IRON LAW

**Parser can ONLY use variables that are EXPLICITLY in the provided schema. Nothing else. Period.**
```
### Understanding Policy Terms → Schema Variables

You will receive **applicant_home_loan_new.md** - your schema file with rich descriptions that map common policy terms to schema variables.

Each field in the schema includes:
- **Description**: What the field means
- **Policy Terms**: Alternative names used in policies (e.g., "property cost", "property price" → `propCost`)
- **Examples**: Sample values
- **Usage Notes**: Special considerations and warnings
- **Critical Warnings**: Common mistakes to avoid

**Key Mappings** (examples from schema):

| Policy Terms | → | Schema Variable |
|--------------|---|----------------|
| "property cost", "property price", "property value" | → | `propCost` |
| "FOIR", "DTI", "DBR", "debt ratio" | → | Section: `foirRules` |
| "LTV", "loan to value" | → | Section: `ltvRules` |
| "CIBIL", "credit score", "bureau score" | → | `creditScore` |
| "relationship", "relation" | → | `relationshipType` |
| "on property", "property owner", "co-owner" | → | `onProperty` |
| "net income", "take home", "in-hand salary" | → | `netIncome` |
| "gross income", "CTC" | → | `grossIncome` |
| "defaulter", "loan defaulter" | → | `isDefaulter` |
| "NRI", "non-resident" | → | `ApplicantIsNRI` |
| "market value", "appraised value", "fair market value", "lender valuation" | → | `marketValue` (Plot & Equity Loan only) |
| "registry value", "stamp duty value", "circle rate value", "ATS value" | → | `registryValue` (Plot & Equity Loan only) |
| "plot variant", "plot type" (Plot Loan policies) | → | `loanVariant` (Plot Loan only) |

**How to Use**:
1. Policy says: "Property price should be less than 50 lakhs"
2. Check schema → `propertyCost` field description lists "property price" as policy term
3. Schema warning shows: "CRITICAL: In code, use 'propCost' NOT 'propertyCost'"
4. Generate: `{"<": [{"var": "propCost"}, 5000000]}`

**Example Workflow**:
```
Policy: "FOIR should not exceed 60% for government employees"

Step 1: Check schema for "FOIR"
Step 2: See note at bottom: "FOIR (DTI/DBR) → Section: foirRules"
Step 3: Check "EmploymentType" field → See exact value: "Employed(Government)"
Step 4: Generate:
{
  "foirRules": [{
    "if": [
      {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
      60,
      50
    ]
  }]
}
```

**Schema Bottom Section Includes**:
- **Field Name Mappings**: propertyCost→propCost, relation→relationshipType
- **Important Conventions**: "Yes"/"No" are strings not booleans, exact formats required
- **No Main Applicant Concept**: All applicants are equal co-applicants
- **Calculated Terms Reference**: FOIR, LTV, ROI, ATS and their sections

### Absolute Rules

1. ✅ **If variable is in schema** → Use it (exact spelling, exact case)
2. ❌ **If variable is NOT in schema** → DO NOT USE IT
3. ❌ **Do not use similar names** (propertyCost vs propCost)
4. ❌ **Do not use variations** (relation vs relationshipType)
5. ❌ **Do not assume values** (Self, Primary, Spouse)
6. ❌ **Do not create new variables**
7. ❌ **Do not guess field names**
8. ❌ **Do not use "close enough" names**

### Common Mistakes to Avoid

| ❌ DO NOT USE | ✅ USE INSTEAD | Why |
|--------------|----------------|-----|
| `propertyCost` | `propCost` | Schema uses abbreviated name |
| `relation` | `relationshipType` | Schema uses full field name |
| `Self` | (check actual values) | Not a stored value in schema |
| `Spouse` | (check actual values) | Schema may use "husband"/"wife" |
| `Primary` | (no main applicant) | All applicants are equal |
| `loanTransaction.propCost` | `propCost` | No object prefixes in JSON-Logic |
| `propCost` for Plot & Equity sanction caps | `marketValue` | Plot & Equity uses canonical `marketValue` / `registryValue` (see block below) |
| Collapsing 3 Plot & Equity caps into `ltvRules` `max_ltv` | 3 separate `parameter_key`s (`plot_equity_*`) | Caps are independent — single `max_ltv` breaks the math (see block below) |

---

### 🚨 CRITICAL: propCost vs dealValue (MUST READ)

**Background**:
- `propCost`: Used for **Direct Sale** (new property from builder/authority, first owner)
- `dealValue`: Used for **Resale** (second-hand property from existing owner)
- **CRITICAL**: Application data contains **EITHER propCost OR dealValue, NEVER BOTH**

**The Problem**:
Banks use ambiguous terms like "property value", "property cost", "deal value" in policies. Parser must understand context!

**Detection Rules**:

#### Rule 1: Generic "property value" (no Direct/Resale distinction)
```
Policy: "LTV is 80% of property value up to 50 lakhs"

Parser MUST use OR operator:
{"<=": [
  {"or": [{"var": "propCost"}, {"var": "dealValue"}]},
  5000000
]}

Why: Works for both Direct Sale and Resale because only one is filled
```

#### Rule 2: Explicit "Direct Sale" / "New Property"
```
Policy: "For direct sale from builder, LTV is 85%"

Parser uses propCost:
{"if": [
  {"==": [{"var": "purchaseType"}, "Direct Sale"]},
  {"<=": [{"var": "propCost"}, 5000000]},
  ...
]}

Why: Explicitly refers to Direct Sale scenario
```

#### Rule 3: Explicit "Resale" / "Second-hand"
```
Policy: "For resale properties, LTV is 75%"

Parser uses dealValue:
{"if": [
  {"==": [{"var": "purchaseType"}, "Resale"]},
  {"<=": [{"var": "dealValue"}, 5000000]},
  ...
]}

Why: Explicitly refers to Resale scenario
```

#### Rule 4: "ATS value" consideration (Resale only)
```
Policy: "For resale, if ATS differs from deal value, use lower value"

Parser checks ATS:
{"if": [
  {"and": [
    {"==": [{"var": "purchaseType"}, "Resale"]},
    {"==": [{"var": "isDifferATSAndPropertyValue"}, "Yes"]}
  ]},
  {"min": [
    {"var": "dealValue"},
    {"var": "propertyValueAsPerATS"}
  ]},
  {"var": "dealValue"}
]}

Why: ATS (Agreement to Sale) may differ from actual deal value in Resale
```

**Common Mistakes**:

❌ **WRONG**: Using only propCost (breaks Resale)
```json
{"<=": [{"var": "propCost"}, 5000000]}
// Fails for all Resale properties!
```

❌ **WRONG**: Using AND with both (always false)
```json
{"and": [
  {"<=": [{"var": "propCost"}, 5000000]},
  {"<=": [{"var": "dealValue"}, 5000000]}
]}
// Never true - only one field exists!
```

✅ **CORRECT**: Using OR for generic terms
```json
{"<=": [
  {"or": [{"var": "propCost"}, {"var": "dealValue"}]},
  5000000
]}
// Works for both scenarios!
```

**Quick Reference Table**:

| Policy Says | Use This | Example Rule |
|-------------|----------|--------------|
| "property value" (generic) | `{"or": [{"var": "propCost"}, {"var": "dealValue"}]}` | Works for both |
| "Direct Sale" / "Builder" / "Authority" | `{"var": "propCost"}` | Direct Sale only |
| "Resale" / "Second-hand" | `{"var": "dealValue"}` | Resale only |
| "ATS value" / "Agreement value" | `{"var": "propertyValueAsPerATS"}` | Resale with ATS check |
| "market value" (Plot & Equity context) | `{"var": "marketValue"}` | Lender's appraisal — distinct from registry (see Plot & Equity block) |
| "registry value" / "ATS value" / "circle rate" (Plot & Equity context) | `{"var": "registryValue"}` | Documented sale value (Plot & Equity only) |

**Validation Checklist**:
- [ ] Generic "property value" uses OR operator
- [ ] Direct Sale rules use propCost
- [ ] Resale rules use dealValue
- [ ] Never check both with AND
- [ ] ATS value only for Resale cases
- [ ] Plot & Equity policies use `marketValue` + `registryValue` (NOT `propCost` / `dealValue`) — see the next block

---

### 🚨 CRITICAL: Plot Loan variants — `loanVariant` vs `loanType` (MUST READ for Plot Loan policies)

**Background**:

Plot Loan is the only one of DigitalDSA's 6 loans with a second type-axis beyond `loanType` (scope). The Plot-specific variant lives in `loanVariant`, with 4 values:

- `'Plot Loan Only'` — funds the registry-value purchase only.
- `'Plot & Construction Loan'` — registry purchase + staged construction tranches.
- `'Plot & Equity Loan'` — registry purchase + LAP-on-plot giving the buyer cash for the seller's off-paper demand.
- `'Construction Loan Only'` — construction tranches on already-owned land.

**Critical distinction from `loanType`**:

| Field | What it carries | Plot Loan values |
|-------|-----------------|------------------|
| `loanType` | Scope — same axis across all 6 loans | `'New Loan'` / `'Balance Transfer Only'` / `'Top-up Only'` / `'Balance Transfer With Top-up'` |
| `loanVariant` | Plot-specific variant (Plot Loan ONLY field) | `'Plot Loan Only'` / `'Plot & Construction Loan'` / `'Plot & Equity Loan'` / `'Construction Loan Only'` |

Most Plot Loan policies are variant-agnostic and apply to all 4. Plot & Equity is the exception — see the next block for its 3-cap framework.

**Variant Synonyms in Policy Documents**:

| Policy Text | → | `loanVariant` Value |
|-------------|---|---------------------|
| "plot purchase", "plot loan", "land purchase" | → | `'Plot Loan Only'` |
| "plot + construction", "composite plot loan", "self-construction on plot" | → | `'Plot & Construction Loan'` |
| "plot + equity", "purchase plus cash", "plot loan with cash-out", "registered + market gap funding" | → | `'Plot & Equity Loan'` |
| "construction only", "house construction on owned plot" | → | `'Construction Loan Only'` |

**Gating Pattern** (variant-specific rules):

```json
{
  "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]}
}
```

**Validation Checklist**:

- [ ] Variant-specific rules use `loanVariant`, NOT `loanType`
- [ ] Generic Plot Loan rules (apply to all 4 variants) do NOT filter on `loanVariant`
- [ ] Plot & Equity-specific math uses the 3-cap framework (next block), NOT standard `ltvRules`

---

### 🚨 CRITICAL: Plot & Equity Loan 3-cap framework (MUST READ)

**Background**:

Plot & Equity is structurally **two lender loan files** on a single transaction:
- A **Plot Loan** funds the seller against the registry value.
- A **LAP** against the just-purchased plot gives the buyer cash to satisfy the seller's off-paper (market − registry) demand.

The deal is bounded by **three independent caps**, NOT a single LTV. Mishandling this is the largest single source of wrong offer amounts for Plot & Equity policies — see Common Mistakes below.

**The 3 Caps** (universal shape; per-lender X / Y / Z percentages):

| Cap | Formula | Parameter Key |
|-----|---------|---------------|
| **Rule 1 — Headline sanction** | `X% × marketValue` | `plot_equity_overall_sanction_ltv` |
| **Rule 2 — Seller disbursement** | `min(Y% × registryValue, sanction)` | `plot_equity_seller_disbursement_cap` |
| **Rule 3 — Buyer cash (LAP on plot)** | `min(Z% × marketValue, sanction − seller)` | `plot_equity_lap_on_plot_cap` |

The "remaining sanction" term in Rule 3 enforces the combined-cap guarantee: `seller + buyer cash ≤ sanction` always.

**Schema Variables**:

- `marketValue` — lender's appraised market value of the plot. Aliases in policy: "appraised value", "fair market value", "lender valuation", "valuer estimate", "assessed market value".
- `registryValue` — registered / stamp-duty / ATS value. Aliases: "stamp duty value", "circle rate value", "sale deed value", "agreement to sell value", "ATS value", "declared value", "documented value".
- `loanVariant` — must equal `'Plot & Equity Loan'` for these caps to apply.

⚠️ **Do NOT use `propCost` or `dealValue` for Plot & Equity policies.** The market-vs-registry distinction is the entire point of the product. The payload builder aliases `propCost → marketValue` and `agreementSellValue → registryValue` for Plot & Equity Loan only (see ADR-0025), so the parser MUST reference the canonical names.

**Gold-Standard Worked Example** (validate your output against this):

| Input | Value |
|---|---|
| `marketValue` | ₹1,00,00,000 |
| `registryValue` | ₹20,00,000 |
| Seller's off-paper cash demand | ₹80,00,000 (= market − registry) |
| Lender policy: X / Y / Z | 70% / 90% / 40% |

Expected engine output:

| Field | Formula | Result |
|---|---|---|
| `plot_equity_sanction_headline` | 70% × ₹1Cr | **₹70,00,000** |
| `plot_equity_seller_disbursement` | min(90% × ₹20L, ₹70L) = min(₹18L, ₹70L) | **₹18,00,000** |
| `plot_equity_buyer_cash_component` | min(40% × ₹1Cr, ₹70L − ₹18L) = min(₹40L, ₹52L) | **₹40,00,000** |
| `plot_equity_buyer_net_out_of_pocket` | (₹20L − ₹18L) + (₹1Cr − ₹20L) − ₹40L | **₹42,00,000** |

(Lock test `src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts` enforces these. Engine math at `src/lib/ruleEngine/evaluationEngine.ts` Step 6c is the canonical implementation.)

**Parser Output for the Example Policy**:

Policy: *"For Plot & Equity loans, sanction is 70% of market value; seller gets up to 90% of registry value; buyer cash component is capped at 40% of market value."*

Maps to **three separate parameter-tier rules** inside `ltvRules`, each gated on `loanVariant`:

```json
{
  "ltvRules": [
    {
      "rule_id": "plot_equity_sanction_x",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_overall_sanction_ltv",
      "parameter_value": 70
    },
    {
      "rule_id": "plot_equity_seller_y",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_seller_disbursement_cap",
      "parameter_value": 90
    },
    {
      "rule_id": "plot_equity_lap_z",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_lap_on_plot_cap",
      "parameter_value": 40
    }
  ]
}
```

The engine does the 3-cap math once these three values land (see `evaluationEngine.ts` Step 6c). The parser emits ONLY the percentages — it does NOT compute the four output amounts.

**Common Mistakes**:

❌ **WRONG**: Collapsing into single `ltvRules` entry
```json
{"ltvRules": [{"tier": "parameter", "logic": true, "parameter_key": "max_ltv", "parameter_value": 70}]}
```
This sets the standard LTV path to 70%, hiding the seller-disbursement and LAP-on-plot caps entirely. Engine falls through to legacy LTV math and produces a single (wrong) number. The four Plot & Equity output fields stay undefined.

❌ **WRONG**: Using `propCost` instead of `marketValue`
```json
{
  "parameter_key": "plot_equity_overall_sanction_ltv",
  "parameter_value": 70,
  "logic": {"<=": [{"var": "propCost"}, 10000000]}
}
```
`propCost` is the Home Loan / Direct Sale variable. For Plot & Equity the canonical names are `marketValue` and `registryValue` (the payload builder aliases for you — ADR-0025). Using `propCost` works today by coincidence; it breaks the day the alias is sunset.

❌ **WRONG**: Omitting `applies_when` gate
```json
{"parameter_key": "plot_equity_overall_sanction_ltv", "parameter_value": 70, "logic": true}
```
Without `applies_when`, the 70% would leak to all 4 Plot variants. The 3-cap math fires only for `'Plot & Equity Loan'`; other variants must fall through to legacy LTV.

✅ **CORRECT**: Three separate parameter rules, each gated on `loanVariant`, parameter keys matching the engine extraction names verbatim (see `evaluationEngine.ts:514-522`).

**Quick Reference Table** (Plot & Equity Loan policies):

| Policy Says | Use This | Parameter Key |
|-------------|----------|---------------|
| "X% of market value (sanction / overall LTV)" | `parameter_value: X` | `plot_equity_overall_sanction_ltv` |
| "Y% of registry value to seller" | `parameter_value: Y` | `plot_equity_seller_disbursement_cap` |
| "Z% of market value as buyer cash / LAP on plot" | `parameter_value: Z` | `plot_equity_lap_on_plot_cap` |
| "Combined never exceeds sanction" | (handled by engine — no parser action) | — |
| "Buyer net out-of-pocket" | (engine-derived from above 3 + market + registry) | — |

**Validation Checklist**:

- [ ] All 3 caps emitted as SEPARATE `tier: 'parameter'` rules inside `ltvRules`
- [ ] Each rule's `applies_when` gates on `{"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]}`
- [ ] Parameter keys exactly match engine extraction names: `plot_equity_overall_sanction_ltv` / `plot_equity_seller_disbursement_cap` / `plot_equity_lap_on_plot_cap`
- [ ] Variables `marketValue` and `registryValue` used (NOT `propCost` / `dealValue`)
- [ ] No standalone `max_ltv` parameter rule for Plot & Equity (would override and hide the 3-cap math)
- [ ] Parser does NOT compute sanction / seller / buyer amounts — engine handles that
- [ ] Validate parser output against gold-standard fixture (₹1Cr / ₹20L / 70-90-40 → ₹70L / ₹18L / ₹40L / ₹42L)

**Cross-references**:
- Design spec: [`docs/specs/PLOT-EQUITY-LOAN-DESIGN.md`](../../../../docs/specs/PLOT-EQUITY-LOAN-DESIGN.md)
- Decisions: [ADR-0021](../../../../docs/adr/0021-plot-equity-loan-modeling.md) (3-cap structure) + [ADR-0025](../../../../docs/adr/0025-plot-equity-canonical-payload-fields.md) (payload aliasing)
- Engine math: `src/lib/ruleEngine/evaluationEngine.ts` Step 6c
- Lock test: `src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts`
- Numbered §SECTION SPECIFICATIONS entries: §26-28 below

---

### Workflow: Check Schema Before Every Variable

```
STEP 1: Policy mentions "property cost"
STEP 2: Check schema → Find "propCost" ✓
STEP 3: Use {"var": "propCost"}

NOT: {"var": "propertyCost"} ❌
```

```
STEP 1: Policy mentions "relationship"
STEP 2: Check schema → Find "relationshipType" ✓
STEP 3: Use {"var": "relationshipType"}

NOT: {"var": "relation"} ❌
```

### If Variable Doesn't Exist

**DO NOT guess or invent.** Add to `confirmationRequired`:

```json
{
  "confirmationRequired": [{
    "ruleId": "MISSING_VAR_001",
    "originalText": "Policy text that needs this variable",
    "category": "missing-variable",
    "parserReasoning": "Policy requires variable 'X' but it doesn't exist in schema",
    "suggestedAction": "Add variable 'X' to schema, or clarify how to map this to existing variables",
    "possibleAlternatives": ["var1", "var2"]
  }]
}
```

### Validation

Before outputting, mentally verify:
- [ ] Every `{"var": "X"}` → X is in the provided schema
- [ ] No object prefixes (loanTransaction.X)
- [ ] No array notation (applicantData[0].X)
- [ ] Exact spelling matches schema

**One invalid variable = entire output rejected.**

---

## 🚨 RULE #0.5: HANDLING AMBIGUOUS TERMS

### The Problem

Policies often use ambiguous terms without specifying exact logic:

**Examples**:
- "Club income" (does this mean 100% each, or weighted?)
- "Consider co-applicant" (at what percentage?)
- "Based on relationship" (what percentages for each relationship?)

### Mandatory Response: Add to confirmationRequired

**DO NOT guess percentages, weightages, or logic.**

If policy says:
```
"Income calculation: club
Relationships: husband, wife, brother, sister"
```

But doesn't specify percentages → Add to `confirmationRequired`:

```json
{
  "confirmationRequired": [{
    "ruleId": "AMB_INCOME_001",
    "originalText": "incomeCalculation: club. Relationships: husband, wife, brother, sister",
    "category": "ambiguous-calculation",
    "parserReasoning": "Policy uses term 'club income' but does not specify weightage percentages for each relationship type",
    "possibleInterpretations": [
      {
        "interpretation": "Simple sum (100% of each applicant)",
        "logic": "Sum all incomes without weighting",
        "whenToUse": "If 'club' means equal treatment"
      },
      {
        "interpretation": "Conditional based on property ownership",
        "logic": "If onProperty=Yes then 100%, else 0% or lower percentage",
        "whenToUse": "If weightage depends on being on property title"
      },
      {
        "interpretation": "Fixed percentages by relationship",
        "logic": "Specify: husband %, wife %, brother %, sister %",
        "whenToUse": "If bank has standard relationship weightages"
      }
    ],
    "suggestedAction": "Clarify: What percentage of each relationship's income should be considered? Should it depend on onProperty field?",
    "affectsSection": "multipleAppIncomeRules"
  }],
  
  "suggestionMsg": [{
    "type": "clarification",
    "message": "multipleAppIncomeRules: Policy stated 'club income' without percentages. Implemented simple sum (100% each). CONFIRM this matches lender's policy or provide correct weightages.",
    "severity": "warning",
    "affectsSection": "multipleAppIncomeRules"
  }]
}
```

### Common Ambiguous Terms

| Ambiguous Term | What's Missing | Required Clarification |
|----------------|----------------|------------------------|
| "Club income" | Percentages | Specify % for each relationship |
| "Consider co-applicant" | How much | 100%? 50%? Conditional? |
| "Based on relationship" | Percentages per type | husband %, wife %, brother %, etc. |
| "Combined income" | Calculation method | Simple sum or weighted? |
| "Joint application" | Equal or weighted | 50-50 or based on role? |
| "Additional income" | How much counts | Full amount or percentage? |

### Best-Effort Implementation

If you must implement without clarification:

1. **Provide most conservative interpretation**
2. **Document assumption clearly** in `suggestionMsg`
3. **Add to confirmationRequired** with alternatives
4. **Never be confident** about assumed values

Example:
```json
{
  "multipleAppIncomeRules": [{
    "sum": [
      {"map": [
        {"var": "applicantData"},
        {
          "if": [
            {"==": [{"var": "onProperty"}, "Yes"]},
            {"var": "income"},
            0
          ]
        }
      ]}
    ]
  }],
  
  "confirmationRequired": [{
    "ruleId": "AMB_INCOME_001",
    "originalText": "Club income for all applicants",
    "category": "ambiguous-calculation",
    "parserReasoning": "Implemented conservative approach: 100% income only for applicants on property (onProperty=Yes), 0% otherwise. Verify this matches lender policy.",
    "suggestedAction": "Confirm weightage rules for applicants on/off property"
  }],
  
  "suggestionMsg": [{
    "type": "clarification",
    "message": "Assumed 100% income only for applicants with onProperty=Yes. If all applicants should be counted regardless of property ownership, or if different weightages apply, please clarify.",
    "severity": "warning",
    "affectsSection": "multipleAppIncomeRules"
  }]
}
```

---

## 🚨 RULE #0.75: NO HALLUCINATED VALUES

### The Problem

Parser might invent values that seem reasonable but aren't in the schema.

**Examples of Hallucinations**:
- Using "Self" as a relationship (not in schema)
- Using "Spouse" when schema has "husband"/"wife"
- Inventing percentages (75%, 50%, 25%) when policy doesn't specify
- Assuming hierarchical relationships (Father/Mother/Son/Daughter) when schema has peer relationships (husband/wife/brother/sister)

### Absolute Rules

1. **Relationship values**: Only use values that exist in schema or policy
   - ❌ If schema has "husband", "wife" → Don't use "Spouse"
   - ❌ If schema has peer relations → Don't use "Self", "Primary"
   - ✅ Use exact values from schema

2. **Percentages/Weightages**: Only use if explicitly stated in policy
   - ❌ Don't invent 75%, 50%, 25% without policy stating them
   - ✅ If policy doesn't specify → add to confirmationRequired

3. **Conditions**: Only check fields that exist
   - ❌ Don't check `{"var": "relation"}` if schema has `relationshipType`
   - ✅ Use exact field names from schema

### Examples

#### ❌ WRONG (Hallucinated)
```json
{
  "multipleAppIncomeRules": [{
    "sum": [{
      "map": [
        {"var": "applicantData"},
        {
          "if": [
            {"==": [{"var": "relation"}, "Self"]},
            {"var": "income"},
            
            {"==": [{"var": "relation"}, "Spouse"]},
            {"*": [{"var": "income"}, 0.75]},
            
            0
          ]
        }
      ]
    }]
  }]
}
```

#### ✅ CORRECT (Schema-based)
```json
{
  "multipleAppIncomeRules": [{
    "sum": [{
      "map": [
        {"var": "applicantData"},
        {
          "if": [
            {"==": [{"var": "onProperty"}, "Yes"]},
            {"var": "income"},
            0
          ]
        }
      ]
    }]
  }],
  
  "confirmationRequired": [{
    "ruleId": "AMB_INCOME_001",
    "category": "ambiguous-calculation",
    "parserReasoning": "Policy didn't specify weightages. Implemented: 100% for onProperty=Yes, 0% otherwise. Confirm if different logic needed.",
    "suggestedAction": "Specify income calculation: Should all applicants count equally? Should it depend on relationshipType? Different percentages?"
  }]
}
```

---

## ⚠️ CRITICAL: SCHEMA PATHS vs JSON-LOGIC VARIABLES

### THE MOST IMPORTANT RULE

**Schema Documentation Shows Structure**:
```
loanTransaction.propCost              ← Documentation of where data comes from
allApplicantDetails[i].EmploymentType ← Shows data hierarchy
```

**JSON-Logic Uses Direct Property Names**:
```json
{"var": "propCost"}         ← Actual variable in JSON-Logic
{"var": "EmploymentType"}   ← No parent object, no array index
```

### ❌ NEVER USE
```json
{"var": "loanTransaction.propCost"}
{"var": "allApplicantDetails[0].EmploymentType"}
{"var": "allApplicantDetails.0.age"}
```

### ✅ ALWAYS USE
```json
{"var": "propCost"}
{"var": "EmploymentType"}
{"var": "age"}
```

---

## 📐 CORE PRINCIPLES

1. **Engine is Immutable** - Never modify `newEngine.ts`
2. **Schema is Truth** - Use ONLY variables from provided schema (STRICT)
3. **Ambiguity is Documented** - Unknown percentages/logic → confirmationRequired
4. **No Hallucinations** - Don't invent values, percentages, or field names
5. **Structure is Sacred** - Each section returns array `[{...rule}]`
6. **Types are Enforced** - Each section has specific return types
7. **Context Matters** - Each section receives different data contexts
8. **Complexity is Expected** - Policies can have arbitrary nesting depth
9. **Patterns are Recognized** - Parser must identify complexity patterns

---

## 🎯 COMPLEXITY LEVELS & HANDLING STRATEGY

### Level 1: Simple (1-2 conditions)
**Characteristics**: Single if-then-else, basic comparison  
**Strategy**: Auto-parse with high confidence  
**Example**: "If CIBIL ≥ 700 → 80% LTV, else 75%"  
**Confidence**: 95%+

### Level 2: Medium (3-5 conditions)
**Characteristics**: Cascading if-else, basic AND/OR  
**Strategy**: Parse with validation  
**Example**: "If CIBIL ≥ 800 → 85%, ≥ 750 → 80%, ≥ 700 → 75%, else 70%"  
**Confidence**: 85-95%

### Level 3: Complex (6-10 conditions)
**Characteristics**: Nested AND/OR, multiple factors, cumulative additions  
**Strategy**: Parse + flag for human review  
**Example**: "LTV depends on: employment type, city tier, property cost, CIBIL"  
**Confidence**: 70-85%

### Level 4: Very Complex (10+ conditions)
**Characteristics**: Multi-dimensional matrices, deep nesting (5+ levels)  
**Strategy**: Best-effort parse + confirmationRequired entry  
**Example**: "Rate = base(CIBIL) + employment loading + city loading + property loading + 5 credit behavior loadings - 2 discounts"  
**Confidence**: 50-70%

### Complexity Scoring Formula
```
Score = (num_conditions × 1) + (nesting_depth × 2) + (num_operators × 0.5)

0-5: Simple
6-10: Medium
11-20: Complex
21+: Very Complex
```

---

## 📊 15 COMPLEXITY PATTERNS (CORE FEATURES)

### Pattern 1: Simple Conditional
```
IF condition THEN value ELSE other_value
```

**Recognition Keywords**: "if", "then", "else", "otherwise"

**JSON-Logic**:
```json
{
  "if": [
    condition,
    value,
    other_value
  ]
}
```

**Example**: "If CIBIL ≥ 700 → 80%, else 75%"
```json
{
  "if": [
    {">=": [{"var": "creditScore"}, 700]},
    80,
    75
  ]
}
```

---

### Pattern 2: Multi-Level Conditional (Cascading)
```
IF condition1 THEN value1
ELSE IF condition2 THEN value2
ELSE IF condition3 THEN value3
ELSE default
```

**Recognition Keywords**: "else if", multiple ranges, "greater than...less than"

**JSON-Logic**:
```json
{
  "if": [
    condition1, value1,
    condition2, value2,
    condition3, value3,
    default
  ]
}
```

**Example**: "CIBIL ≥ 800 → 8.5%, ≥ 750 → 8.8%, ≥ 700 → 9.2%, else 9.5%"
```json
{
  "if": [
    {">=": [{"var": "creditScore"}, 800]}, 8.5,
    {">=": [{"var": "creditScore"}, 750]}, 8.8,
    {">=": [{"var": "creditScore"}, 700]}, 9.2,
    9.5
  ]
}
```

---

### Pattern 3: Nested AND Conditions
```
IF (condition1 AND condition2 AND condition3) THEN value
```

**Recognition Keywords**: "and", "both", "all of", comma-separated conditions

**JSON-Logic**:
```json
{
  "if": [
    {"and": [condition1, condition2, condition3]},
    value,
    else_value
  ]
}
```

**Example**: "If government employee AND metro city AND CIBIL ≥ 750 → 90%"
```json
{
  "if": [
    {"and": [
      {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
      {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore"]]},
      {">=": [{"var": "creditScore"}, 750]}
    ]},
    90,
    80
  ]
}
```

---

### Pattern 4: Nested OR Conditions
```
IF (condition1 OR condition2 OR condition3) THEN value
```

**Recognition Keywords**: "or", "either", "any of"

**JSON-Logic**:
```json
{
  "if": [
    {"or": [condition1, condition2, condition3]},
    value,
    else_value
  ]
}
```

**Example**: "If doctor OR CA OR lawyer → 8.0%"
```json
{
  "if": [
    {"or": [
      {"==": [{"var": "professionType"}, "MBBS Doctor"]},
      {"==": [{"var": "professionType"}, "Chartered Accountant"]},
      {"==": [{"var": "professionType"}, "Lawyer"]}
    ]},
    8.0,
    8.5
  ]
}
```

---

### Pattern 5: Complex Boolean Logic
```
IF ((condition1 AND condition2) OR (condition3 AND condition4)) THEN value
```

**Recognition Keywords**: Mixed "and"/"or", parenthetical groupings

**JSON-Logic**:
```json
{
  "if": [
    {"or": [
      {"and": [condition1, condition2]},
      {"and": [condition3, condition4]}
    ]},
    value,
    else_value
  ]
}
```

**Example**: "If (Government AND Metro) OR (Private AND CIBIL>800) → 90%"
```json
{
  "if": [
    {"or": [
      {"and": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}
      ]},
      {"and": [
        {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
        {">": [{"var": "creditScore"}, 800]}
      ]}
    ]},
    90,
    85
  ]
}
```

---

### Pattern 6: Deeply Nested Conditionals
```
IF condition1
  THEN IF condition2
    THEN IF condition3
      THEN value1
      ELSE value2
    ELSE value3
  ELSE value4
```

**Recognition Keywords**: Multiple levels of "if...then", hierarchical structure

**JSON-Logic**:
```json
{
  "if": [
    condition1,
    {
      "if": [
        condition2,
        {
          "if": [
            condition3,
            value1,
            value2
          ]
        },
        value3
      ]
    },
    value4
  ]
}
```

**Example**: "Government: if metro then (if property<50L then 90% else 85%) else 80%"
```json
{
  "if": [
    {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
    {
      "if": [
        {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]},
        {
          "if": [
            {"<": [{"var": "propCost"}, 5000000]},
            90,
            85
          ]
        },
        80
      ]
    },
    75
  ]
}
```

---

### Pattern 7: Cumulative Additions
```
Base + adjustment1 + adjustment2 + adjustment3 - discount
```

**Recognition Keywords**: "plus", "add", "additional", "loading", "discount", "less"

**JSON-Logic**:
```json
{
  "+": [
    base,
    adjustment1,
    adjustment2,
    adjustment3,
    negative_discount
  ]
}
```

**Example**: "Rate 8% + city loading + employment loading - gender discount"
```json
{
  "+": [
    8.0,
    {"if": [{"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}, 0.5, 0]},
    {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Private)"]}, 0.3, 0]},
    {"if": [{"==": [{"var": "gender"}, "Female"]}, -0.2, 0]}
  ]
}
```

---

### Pattern 8: Conditional Cumulative Additions
```
IF condition THEN (base + sum of applicable adjustments) ELSE rejection
```

**Recognition Keywords**: "if eligible, then rate/value is X plus..."

**JSON-Logic**:
```json
{
  "if": [
    condition,
    {
      "+": [
        base,
        {"+": [adjustment1, adjustment2, adjustment3]}
      ]
    },
    rejection
  ]
}
```

**Example**: "If CIBIL ≥ 700, rate = 8% + loadings, else rejected"
```json
{
  "if": [
    {"<": [{"var": "creditScore"}, 700]},
    "Rejected: Minimum CIBIL 700 required",
    {
      "+": [
        8.0,
        {"if": [{"==": [{"var": "highCardUtilization"}, "Yes"]}, 0.5, 0]},
        {"if": [{"==": [{"var": "multipleLoanEnquiries"}, "Yes"]}, 0.3, 0]}
      ]
    }
  ]
}
```

---

### Pattern 9: Multi-Dimensional Decision Matrix
```
Decision based on MULTIPLE independent factors (3D, 4D, 5D+ matrices)
```

**Recognition Keywords**: "depends on", "based on", multiple factor lists

**JSON-Logic**: Nested if-statements for each dimension

**Example**: "LTV = f(employment, city, property cost, CIBIL)" - 4D matrix
```json
{
  "if": [
    {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
    {
      "if": [
        {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]},
        {
          "if": [
            {"<=": [{"var": "propCost"}, 3000000]},
            {
              "if": [
                {">=": [{"var": "creditScore"}, 750]},
                90,
                85
              ]
            },
            {
              "if": [
                {">=": [{"var": "creditScore"}, 750]},
                85,
                80
              ]
            }
          ]
        },
        {
          "if": [
            {"<=": [{"var": "propCost"}, 3000000]},
            85,
            80
          ]
        }
      ]
    },
    
    {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
    {
      "if": [
        {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]},
        {
          "if": [
            {">=": [{"var": "creditScore"}, 750]},
            85,
            80
          ]
        },
        75
      ]
    },
    
    70
  ]
}
```

---

### Pattern 10: Array-Based Calculations
```
Sum/Min/Max across multiple applicants or values
```

**Recognition Keywords**: "combined", "total", "sum of", "minimum of", "maximum of"

**JSON-Logic**:
```json
{
  "sum": [
    {"map": [
      {"var": "array"},
      expression
    ]}
  ]
}
```

**Example**: "Combined income from all applicants on property"
```json
{
  "sum": [
    {"map": [
      {"var": "applicantData"},
      {
        "if": [
          {"==": [{"var": "onProperty"}, "Yes"]},
          {"var": "income"},
          0
        ]
      }
    ]}
  ]
}
```

---

### Pattern 11: Range-Based with Multiple Factors
```
Value depends on which range input falls into, with nested conditions
```

**Recognition Keywords**: "between", "from...to", "up to", "above", range brackets

**JSON-Logic**:
```json
{
  "if": [
    {"<=": [var, range1_max]},
    {nested_conditions_for_range1},
    
    {"and": [{">": [var, range1_max]}, {"<=": [var, range2_max]}]},
    {nested_conditions_for_range2},
    
    {nested_conditions_for_range3}
  ]
}
```

**Example**: "Property ≤30L → (employment-based LTV), 30L-75L → (different LTV), >75L → (lowest LTV)"
```json
{
  "if": [
    {"<=": [{"var": "propCost"}, 3000000]},
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        90,
        85
      ]
    },
    
    {"and": [
      {">": [{"var": "propCost"}, 3000000]},
      {"<=": [{"var": "propCost"}, 7500000]}
    ]},
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        85,
        80
      ]
    },
    
    75
  ]
}
```

---

### Pattern 12: Conditional Formula Selection
```
Different calculation formulas based on conditions
```

**Recognition Keywords**: "calculate as", "use formula", "method depends on"

**JSON-Logic**: Return different calculation structures

**Example**: "Income: Salaried=netIncome, Self-employed=ITR average/12"
```json
{
  "if": [
    {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
    {
      "income": {"var": "netIncome"},
      "incomeType": "government"
    },
    
    {"==": [{"var": "EmploymentType"}, "Self-employed(Professional)"]},
    {
      "if": [
        {">=": [{"var": "netProfitArray.length"}, 2]},
        {
          "income": {"/": [
            {"+": [
              {"average": [{"var": "netProfitArray"}]},
              {"average": [{"var": "depreciationArray"}]}
            ]},
            12
          ]},
          "incomeType": "ITRBase"
        },
        {
          "income": 0,
          "incomeType": "insufficient_itr"
        }
      ]
    },
    
    {
      "income": 0,
      "incomeType": "unknown"
    }
  ]
}
```

---

### Pattern 13: Percentage/Factor Tables (Lookup)
```
Lookup table with ranges and factors
```

**Recognition Keywords**: Table structure, "factor", "percentage", "multiplier"

**JSON-Logic**: Nested conditions representing table

**Example**: "Business multiplier: Manufacturing(3+ yrs)=0.9, (2 yrs)=0.8, Trading=0.7"
```json
{
  "if": [
    {"==": [{"var": "businessType"}, "manufacturing"]},
    {
      "if": [
        {"==": [{"var": "selectedBusinessExperience"}, "3plus"]},
        0.9,
        {"==": [{"var": "selectedBusinessExperience"}, "3"]},
        0.85,
        {"==": [{"var": "selectedBusinessExperience"}, "2"]},
        0.8,
        0.7
      ]
    },
    
    {"==": [{"var": "businessType"}, "trading"]},
    {
      "if": [
        {"==": [{"var": "selectedBusinessExperience"}, "3plus"]},
        0.7,
        0.6
      ]
    },
    
    0.5
  ]
}
```

---

### Pattern 14: Exclusion/Negative Conditions
```
Reject if ANY of multiple conditions are true
```

**Recognition Keywords**: "not eligible if", "rejected if", "exclude if"

**JSON-Logic**: Chain of rejection checks

**Example**: "Reject if: defaulter OR NRI OR unapproved property"
```json
{
  "if": [
    {"==": [{"var": "isDefaulter"}, "Yes"]},
    "Rejected: Defaulter not eligible",
    
    {"==": [{"var": "ApplicantIsNRI"}, "Yes"]},
    "Rejected: NRI not eligible",
    
    {"==": [{"var": "approvedByAuthority"}, "No"]},
    "Rejected: Property not authorized",
    
    true
  ]
}
```

---

### Pattern 15: Minimum/Maximum Constraints
```
Apply min/max limits based on multiple factors
```

**Recognition Keywords**: "minimum", "maximum", "not more than", "at least", "capped at"

**JSON-Logic**:
```json
{
  "min": [factor1, factor2, factor3]
}
```

**Example**: "Tenure = min(bank policy, retirement age limit, property age limit)"
```json
{
  "min": [
    30,
    {"-": [
      {
        "if": [
          {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
          60,
          65
        ]
      },
      {"var": "age"}
    ]},
    {
      "if": [
        {"==": [{"var": "PropertyStage"}, "Under Construction"]},
        25,
        30
      ]
    }
  ]
}
```

---

## 🔄 PARSER DECISION LOGIC (FLOWCHART)

```
┌─────────────────────────────────────┐
│    INPUT: Natural Language Policy    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 0: Load Schema                │
│   - Extract all allowed variables    │
│   - Note exact spellings             │
│   - Identify value types             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 1: Tokenize & Extract         │
│   - Identify keywords                │
│   - Extract conditions & values      │
│   - Detect operators                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 1.5: Check for Ambiguity      │
│   - Missing percentages?             │
│   - Vague terms (club, consider)?    │
│   - Unclear logic?                   │
│   → If YES: Add to confirmationReq   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 2: Pattern Recognition        │
│   - Count conditions (N)             │
│   - Detect nesting depth (D)         │
│   - Identify operators (AND/OR)      │
│   - Calculate: Score=N+(D×2)         │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │ Score 0-5?  │
        │  (Simple)   │
        └──────┬──────┘
               │ Yes
               ▼
    ┌────────────────────────┐
    │ Pattern 1 or 2         │
    │ Confidence: 95%+       │
    │ → Auto-parse           │
    └────────────────────────┘
               │ No
        ┌──────┴──────┐
        │ Score 6-10? │
        │  (Medium)   │
        └──────┬──────┘
               │ Yes
               ▼
    ┌────────────────────────┐
    │ Pattern 3-5            │
    │ Confidence: 85-95%     │
    │ → Parse + validate     │
    └────────────────────────┘
               │ No
        ┌──────┴──────┐
        │ Score 11-20?│
        │ (Complex)   │
        └──────┬──────┘
               │ Yes
               ▼
    ┌────────────────────────┐
    │ Pattern 6-11           │
    │ Confidence: 70-85%     │
    │ → Parse + flag review  │
    └────────────────────────┘
               │ No
        ┌──────┴──────┐
        │  Score 21+? │
        │(VeryComplex)│
        └──────┴──────┘
               │ Yes
               ▼
    ┌────────────────────────────────┐
    │ Pattern 9-15 (complex)         │
    │ Confidence: 50-70%             │
    │ → Best effort + confirmation   │
    │   Required entry               │
    └────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 3: Generate JSON-Logic       │
│   - Apply identified pattern        │
│   - Build nested structure          │
│   - VERIFY: All vars in schema      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 4: Schema Validation         │
│   - Extract all used variables      │
│   - Check each against schema       │
│   - If invalid → STOP & FIX         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   STEP 5: Confidence Check          │
│   - If < 70%: Add to                │
│     confirmationRequired            │
│   - If < 80%: Flag for review       │
│   - If ≥ 80%: Proceed               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   OUTPUT: JSON-Logic Rules          │
└─────────────────────────────────────┘
```

---

## 📊 DATA FLOW & CONTEXT (4 TYPES)

### Context 1: Pure loanTransaction

**Sections**: `transactionRules`, `atsValue`, `ltvRules`, `maxLoanAmount`, `documentOfPropertyType`

**Data Structure**:
```javascript
{
  propCost: 5000000,
  PropertyStage: "Ready To Move",
  propertyCityNormalized: "mumbai",
  approvedByAuthority: "Yes",
  purchaseType: "Direct Sale",
  dealValue: 5500000
  // All loanTransaction properties - flat, no nesting
}
```

**Variable Access**: Direct property names
```json
{"var": "propCost"}
{"var": "PropertyStage"}
{"var": "propertyCityNormalized"}
```

---

### Context 2: Merged (Single Applicant + loanTransaction)

**Sections**: `incomeRules`, `interestRateRules`, `foirRules`, `tenureRules`, `roiWithGen`, `tenureWithGen`, `specialCaseOfBusiness`, `SurrogacyLtvRule`, `SurrogacyIncomeRule`

**Data Structure**:
```javascript
{
  // From applicant:
  EmploymentType: "Employed(Government)",
  netIncome: 80000,
  age: 35,
  creditScore: 750,
  gender: "Female",
  
  // From loanTransaction (merged):
  propCost: 5000000,
  PropertyStage: "Ready To Move",
  propertyCityNormalized: "mumbai"
  
  // ALL AT SAME LEVEL - no nesting!
}
```

**Variable Access**: Direct property names from both sources
```json
{"var": "EmploymentType"}
{"var": "netIncome"}
{"var": "propCost"}
```

---

### Context 3: Multi-Applicant (loanTransaction + applicantData array)

**Sections**: `multipleAppIncomeRules`, `multipleAppInterestRules`, `multipleAppTenureRules`, `multipleAppFoirRules`, `multipleAppCalEligibilityRules`, `obligationsRule`

**Data Structure**:
```javascript
{
  // loanTransaction properties at root:
  propCost: 5000000,
  PropertyStage: "Ready To Move",
  
  // Array of CALCULATED applicants:
  applicantData: [
    {
      name: "John",
      income: 80000,
      interestRate: 8.5,
      tenure: 25,
      foir: 65,
      totalEMIs: 15000,
      totalLimit: 200000,
      relationshipType: "husband",
      onProperty: "Yes"
    },
    {
      name: "Jane",
      income: 60000,
      interestRate: 8.8,
      tenure: 23,
      foir: 60,
      relationshipType: "wife",
      onProperty: "Yes"
    }
  ]
}
```

**Variable Access**:
```json
{"var": "applicantData"}
{"map": [{"var": "applicantData"}, {"var": "income"}]}
{"var": "relationshipType"}
{"var": "onProperty"}
```

---

### Context 4: Selected Properties Only

**Sections**: `documentOfKyc`, `charges`

**Data Structure**:
```javascript
{
  EmploymentType: "Employed(Government)"
}
```

**Variable Access**:
```json
{"var": "EmploymentType"}
```

---

## 📋 SECTION SPECIFICATIONS WITH COMPLEX EXAMPLES

### 1. transactionRules (Context 1) - Pattern 14

**Purpose**: Multi-condition eligibility checks

**Complex Example** (Multiple exclusions + nested conditions):
```json
{
  "transactionRules": [
    {
      "if": [
        {"==": [{"var": "isDefaulter"}, "Yes"]},
        "Rejected: Applicant is a defaulter",
        
        {"==": [{"var": "ApplicantIsNRI"}, "Yes"]},
        "Rejected: NRI applicants not eligible for this scheme",
        
        {"==": [{"var": "approvedByAuthority"}, "No"]},
        "Rejected: Property not in authorized area",
        
        {"==": [{"var": "asPerMap"}, "No"]},
        "Rejected: Property construction not as per approved map",
        
        {"==": [{"var": "propertyRelatedQuestionsVisible"}, "auctioned_property"]},
        "Rejected: Auction properties not allowed",
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Resale"]},
          {"==": [{"var": "ifPropertyRegistered"}, "No"]}
        ]},
        "Rejected: Resale property must be registered in seller's name",
        
        {"and": [
          {">": [{"var": "propCost"}, 20000000]},
          {"<": [{"var": "creditScore"}, 750]}
        ]},
        "Rejected: Properties above 2Cr require minimum CIBIL 750",
        
        {"and": [
          {"==": [{"var": "propertyType"}, "Lease Hold"]},
          {">": [{"var": "propCost"}, 10000000]}
        ]},
        "Rejected: Lease hold properties above 1Cr not eligible",
        
        true
      ]
    }
  ]
}
```

---

### 2. atsValue (Context 1) - Pattern 11

**Complex Example** (Purchase type × Property stage × Builder type):
```json
{
  "atsValue": [
    {
      "if": [
        {"and": [
          {"==": [{"var": "purchaseType"}, "Direct Sale"]},
          {"==": [{"var": "PropertyStage"}, "Under Construction"]},
          {"==": [{"var": "purchasedFrom"}, "Builder"]},
          {"==": [{"var": "builderType"}, "Renowned Builder"]}
        ]},
        {"*": [{"var": "dealValue"}, 1.4]},
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Direct Sale"]},
          {"==": [{"var": "PropertyStage"}, "Under Construction"]},
          {"==": [{"var": "builderType"}, "Small / Local builder"]}
        ]},
        {"*": [{"var": "dealValue"}, 1.2]},
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Direct Sale"]},
          {"==": [{"var": "PropertyStage"}, "Ready To Move"]}
        ]},
        {"*": [{"var": "dealValue"}, 1.4]},
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Resale"]},
          {"==": [{"var": "PropertyStage"}, "Under Construction"]}
        ]},
        {
          "min": [
            {"*": [{"var": "dealValue"}, 0.9]},
            {"-": [{"var": "dealValue"}, {"var": "deposit"}]}
          ]
        },
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Resale"]},
          {"==": [{"var": "PropertyStage"}, "Ready To Move"]},
          {"==": [{"var": "isPropertyOnLoan"}, "Yes"]}
        ]},
        {
          "if": [
            {">": [{"var": "foreclosureAmount"}, 0]},
            {"-": [
              {"*": [{"var": "dealValue"}, 1.4]},
              {"var": "foreclosureAmount"}
            ]},
            {"*": [{"var": "dealValue"}, 1.4]}
          ]
        },
        
        {"and": [
          {"==": [{"var": "purchaseType"}, "Resale"]},
          {"==": [{"var": "PropertyStage"}, "Ready To Move"]}
        ]},
        {"*": [{"var": "dealValue"}, 1.4]},
        
        "Error: Unable to compute ATS - invalid purchaseType/PropertyStage combination"
      ]
    }
  ]
}
```

---

### 3. ltvRules (Context 1) - Pattern 9

**Complex Example** (4D Matrix: Property cost × City × Employment × CIBIL):
```json
{
  "ltvRules": [
    {
      "if": [
        {"<=": [{"var": "propCost"}, 3000000]},
        {
          "if": [
            {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad"]]},
            {
              "if": [
                {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 90, {">=": [{"var": "creditScore"}, 700]}, 85, 80]},
                {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 85, {">=": [{"var": "creditScore"}, 700]}, 80, 75]},
                {"in": [{"var": "EmploymentType"}, ["Self-employed(Professional)", "Self-employed(Other)"]]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 80, 75]},
                70
              ]
            },
            {
              "if": [
                {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 85, 80]},
                {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 80, 75]},
                70
              ]
            }
          ]
        },
        
        {"and": [{">": [{"var": "propCost"}, 3000000]}, {"<=": [{"var": "propCost"}, 7500000]}]},
        {
          "if": [
            {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore"]]},
            {
              "if": [
                {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 85, 80]},
                {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
                {"if": [{">=": [{"var": "creditScore"}, 750]}, 80, 75]},
                70
              ]
            },
            {"if": [{">=": [{"var": "creditScore"}, 750]}, 75, 70]}
          ]
        },
        
        {">": [{"var": "propCost"}, 7500000]},
        {
          "if": [
            {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]},
            {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 80, 75]},
            70
          ]
        },
        
        "Error: Property cost not provided"
      ]
    }
  ]
}
```

---

### 4. maxLoanAmount (Context 1)

```json
{
  "maxLoanAmount": [
    {
      "if": [
        {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]},
        {"if": [{"<=": [{"var": "propCost"}, 5000000]}, 10000000, {"<=": [{"var": "propCost"}, 10000000]}, 15000000, 20000000]},
        {"in": [{"var": "propertyCityNormalized"}, ["bangalore", "pune", "hyderabad", "chennai"]]},
        {"if": [{"<=": [{"var": "propCost"}, 5000000]}, 7500000, 10000000]},
        5000000
      ]
    }
  ]
}
```

---

### 5-6. professionalIncomeType & businessOtherIncomeType

```json
{
  "professionalIncomeType": [
    {
      "if": [
        {"==": [{"var": "professionType"}, "MBBS Doctor"]},
        {"if": [{"==": [{"var": "itrFiled"}, "true"]}, ["ITRBase", "cashBase"], ["cashBase", "averageBankBalance"]]},
        {"==": [{"var": "professionType"}, "Chartered Accountant"]},
        {"if": [{">=": [{"var": "selectedBusinessExperience"}, "3"]}, ["ITRBase", "turnOverBase", "averageBankBalance"], ["ITRBase", "averageBankBalance"]]},
        {"and": [{"==": [{"var": "professionType"}, "Lawyer"]}, {"==": [{"var": "isLawyerBarCouncil"}, "Yes"]}]},
        ["ITRBase", "cashBase"],
        {"==": [{"var": "professionType"}, "Architect"]},
        ["ITRBase"],
        ["ITRBase"]
      ]
    }
  ]
}
```

---

### 7-8. SurrogacyLtvRule & SurrogacyIncomeRule (Context 2)

```json
{
  "SurrogacyLtvRule": [
    {
      "if": [
        {"and": [{">": [{"var": "totalLimit"}, 500000]}, {">=": [{"var": "averageBankBalance"}, 200000]}, {">=": [{"var": "creditScore"}, 700]}]},
        75,
        {"and": [{">": [{"var": "totalLimit"}, 300000]}, {">=": [{"var": "creditScore"}, 700]}]},
        70,
        0
      ]
    }
  ],

  "SurrogacyIncomeRule": [
    {
      "if": [
        {">": [{"var": "totalLimit"}, 0]},
        [{"income": {"/": [{"var": "totalLimit"}, 10]}, "incomeType": "creditCardBased"}],
        {">": [{"var": "averageBankBalance"}, 0]},
        [{"income": {"/": [{"var": "averageBankBalance"}, 6]}, "incomeType": "bankBalanceBased"}],
        []
      ]
    }
  ]
}
```

---

### 9. incomeRules (Context 2) - Pattern 12

**Complex Example** (Employment × Profession × ITR × Alternatives):
```json
{
  "incomeRules": [
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        {"income": {"var": "netIncome"}, "incomeType": "government"},
        
        {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
        {
          "if": [
            {">": [{"var": "grossIncome"}, 100000]},
            {"income": {"var": "netIncome"}, "incomeType": "private_high"},
            {"income": {"*": [{"var": "netIncome"}, 0.9]}, "incomeType": "private_regular"}
          ]
        },
        
        {"==": [{"var": "EmploymentType"}, "Pensioner"]},
        {"income": {"var": "monthlyOtherIncome"}, "incomeType": "pension"},
        
        {"==": [{"var": "EmploymentType"}, "Self-employed(Professional)"]},
        {
          "if": [
            {"==": [{"var": "itrFiled"}, "true"]},
            {
              "if": [
                {">=": [{"var": "netProfitArray.length"}, 3]},
                {
                  "if": [
                    {">": [{"average": [{"var": "netProfitArray"}]}, 0]},
                    {"income": {"/": [{"+": [{"average": [{"var": "netProfitArray"}]}, {"average": [{"var": "depreciationArray"}]}]}, 12]}, "incomeType": "ITRBase_3years"},
                    {"income": 0, "incomeType": "negative_profit"}
                  ]
                },
                {"==": [{"var": "netProfitArray.length"}, 2]},
                {
                  "if": [
                    {">": [{"average": [{"var": "netProfitArray"}]}, 0]},
                    {"income": {"/": [{"+": [{"average": [{"var": "netProfitArray"}]}, {"average": [{"var": "depreciationArray"}]}]}, 12]}, "incomeType": "ITRBase_2years"},
                    {"income": 0, "incomeType": "negative_profit"}
                  ]
                },
                {"income": 0, "incomeType": "insufficient_itr"}
              ]
            },
            {">": [{"var": "cashAmount"}, 0]},
            {"income": {"var": "cashAmount"}, "incomeType": "cashBase"},
            {">": [{"var": "averageBankBalance"}, 0]},
            {"income": {"/": [{"var": "averageBankBalance"}, 6]}, "incomeType": "bankBalance"},
            {"income": 0, "incomeType": "no_proof"}
          ]
        },
        
        {"==": [{"var": "EmploymentType"}, "Self-employed(Other)"]},
        {
          "if": [
            {"==": [{"var": "itrFiled"}, "true"]},
            {
              "if": [
                {">=": [{"var": "netProfitArray.length"}, 2]},
                {"income": {"/": [{"+": [{"average": [{"var": "netProfitArray"}]}, {"average": [{"var": "depreciationArray"}]}]}, 12]}, "incomeType": "ITRBase"},
                {"income": 0, "incomeType": "insufficient_itr"}
              ]
            },
            {">": [{"var": "averageBankBalance"}, 0]},
            {"income": {"/": [{"var": "averageBankBalance"}, 6]}, "incomeType": "bankBalance"},
            {"income": 0, "incomeType": "no_proof"}
          ]
        },
        
        {"income": 0, "incomeType": "unknown_employment"}
      ]
    }
  ]
}
```

---

### 10. interestRateRules (Context 2) - Pattern 8

**Complex Example** (CIBIL-based + Employment + City + Credit behavior loadings):
```json
{
  "interestRateRules": [
    {
      "if": [
        {"<": [{"var": "creditScore"}, 650]},
        "Rejected: CIBIL score below minimum 650",
        
        {">=": [{"var": "creditScore"}, 800]},
        {
          "+": [
            7.9,
            {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 0, {"==": [{"var": "EmploymentType"}, "Employed(Private)"]}, 0.1, 0.2]},
            {"if": [{"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}, 0.2, {"in": [{"var": "propertyCityNormalized"}, ["bangalore", "pune", "hyderabad"]]}, 0.1, 0]},
            {"if": [{"==": [{"var": "propertyType"}, "Lease Hold"]}, 0.3, 0]},
            {"+": [
              {"if": [{"==": [{"var": "highCardUtilization"}, "Yes"]}, 0.5, 0]},
              {"if": [{"==": [{"var": "fullCreditLimitUsed"}, "Yes"]}, 0.4, 0]},
              {"if": [{"==": [{"var": "multipleLoanEnquiries"}, "Yes"]}, 0.3, 0]},
              {"if": [{"==": [{"var": "onlyUnsecuredLoans"}, "Yes"]}, 0.2, 0]},
              {"if": [{"==": [{"var": "noCreditHistory"}, "Yes"]}, 0.1, 0]}
            ]}
          ]
        },
        
        {">=": [{"var": "creditScore"}, 750]},
        {
          "+": [
            8.25,
            {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 0, 0.1]},
            {"if": [{"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}, 0.2, 0]},
            {"if": [{"==": [{"var": "propertyType"}, "Lease Hold"]}, 0.3, 0]},
            {"+": [
              {"if": [{"==": [{"var": "highCardUtilization"}, "Yes"]}, 0.5, 0]},
              {"if": [{"==": [{"var": "fullCreditLimitUsed"}, "Yes"]}, 0.4, 0]},
              {"if": [{"==": [{"var": "multipleLoanEnquiries"}, "Yes"]}, 0.3, 0]},
              {"if": [{"==": [{"var": "onlyUnsecuredLoans"}, "Yes"]}, 0.2, 0]},
              {"if": [{"==": [{"var": "noCreditHistory"}, "Yes"]}, 0.1, 0]}
            ]}
          ]
        },
        
        {">=": [{"var": "creditScore"}, 700]},
        {
          "+": [
            8.5,
            {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 0, 0.1]},
            {"if": [{"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}, 0.2, 0]},
            {"if": [{"==": [{"var": "propertyType"}, "Lease Hold"]}, 0.3, 0]},
            {"+": [
              {"if": [{"==": [{"var": "highCardUtilization"}, "Yes"]}, 0.5, 0]},
              {"if": [{"==": [{"var": "fullCreditLimitUsed"}, "Yes"]}, 0.4, 0]},
              {"if": [{"==": [{"var": "multipleLoanEnquiries"}, "Yes"]}, 0.3, 0]},
              {"if": [{"==": [{"var": "onlyUnsecuredLoans"}, "Yes"]}, 0.2, 0]},
              {"if": [{"==": [{"var": "noCreditHistory"}, "Yes"]}, 0.1, 0]}
            ]}
          ]
        },
        
        {">=": [{"var": "creditScore"}, 650]},
        {
          "+": [
            8.75,
            {"if": [{"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 0, 0.1]},
            {"if": [{"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi"]]}, 0.2, 0]},
            {"if": [{"==": [{"var": "propertyType"}, "Lease Hold"]}, 0.3, 0]},
            {"+": [
              {"if": [{"==": [{"var": "highCardUtilization"}, "Yes"]}, 0.5, 0]},
              {"if": [{"==": [{"var": "fullCreditLimitUsed"}, "Yes"]}, 0.4, 0]},
              {"if": [{"==": [{"var": "multipleLoanEnquiries"}, "Yes"]}, 0.3, 0]},
              {"if": [{"==": [{"var": "onlyUnsecuredLoans"}, "Yes"]}, 0.2, 0]},
              {"if": [{"==": [{"var": "noCreditHistory"}, "Yes"]}, 0.1, 0]}
            ]}
          ]
        },
        
        9.0
      ]
    }
  ]
}
```

---

### 11. foirRules (Context 2) - Pattern 2 or 6

```json
{
  "foirRules": [
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        {
          "if": [
            {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore"]]},
            {"if": [{">": [{"var": "income"}, 150000]}, 70, 65]},
            65
          ]
        },
        {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
        {
          "if": [
            {">": [{"var": "income"}, 150000]},
            {"if": [{"==": [{"var": "ObligationsRunning"}, "No"]}, 65, 60]},
            {"if": [{"==": [{"var": "ObligationsRunning"}, "No"]}, 60, 55]}
          ]
        },
        {"==": [{"var": "EmploymentType"}, "Pensioner"]},
        55,
        {"in": [{"var": "EmploymentType"}, ["Self-employed(Professional)", "Self-employed(Other)"]]},
        {"if": [{">": [{"var": "income"}, 100000]}, 55, 50]},
        45
      ]
    }
  ]
}
```

---

### 12. tenureRules (Context 2) - Pattern 15

```json
{
  "tenureRules": [
    {
      "if": [
        {"<": [{"var": "age"}, 21]},
        "Rejected: Minimum age requirement is 21 years",
        {">": [{"var": "age"}, 65]},
        "Rejected: Maximum age at application is 65 years",
        {
          "min": [
            {"if": [
              {"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 30,
              {"==": [{"var": "EmploymentType"}, "Employed(Private)"]}, 25,
              {"in": [{"var": "EmploymentType"}, ["Self-employed(Professional)", "Self-employed(Other)"]]}, 20,
              {"==": [{"var": "EmploymentType"}, "Pensioner"]}, 15,
              20
            ]},
            {"-": [
              {"if": [
                {"==": [{"var": "EmploymentType"}, "Employed(Government)"]}, 60,
                {"==": [{"var": "EmploymentType"}, "Employed(Private)"]}, 65,
                {"in": [{"var": "EmploymentType"}, ["Self-employed(Professional)", "Self-employed(Other)"]]}, 70,
                75
              ]},
              {"var": "age"}
            ]},
            {"if": [{"==": [{"var": "PropertyStage"}, "Under Construction"]}, 25, 30]},
            {"if": [{"<": [{"var": "creditScore"}, 700]}, 20, {"<": [{"var": "creditScore"}, 750]}, 25, 30]}
          ]
        }
      ]
    }
  ]
}
```

---

### 13. obligationsRule (Context 3) - MANDATORY

```json
{
  "obligationsRule": [
    {
      "+": [
        {"sum": [{"map": [{"var": "applicantData"}, {"var": "totalEMIs"}]}]},
        {"*": [{"sum": [{"map": [{"var": "applicantData"}, {"var": "totalLimit"}]}]}, 0.05]}
      ]
    }
  ]
}
```

---

### 14-16. roiWithGen, tenureWithGen, specialCaseOfBusiness

```json
{
  "roiWithGen": [{"if": [{"==": [{"var": "gender"}, "Female"]}, -0.2, 0]}],

  "tenureWithGen": [{"if": [{"==": [{"var": "gender"}, "Female"]}, 2, 0]}],

  "specialCaseOfBusiness": [
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Self-employed(Professional)"]},
        {
          "if": [
            {"==": [{"var": "professionType"}, "MBBS Doctor"]}, 1.2,
            {"==": [{"var": "professionType"}, "Chartered Accountant"]}, 1.0,
            0.9
          ]
        },
        {"==": [{"var": "EmploymentType"}, "Self-employed(Other)"]},
        {
          "if": [
            {"==": [{"var": "businessType"}, "manufacturing"]},
            {"if": [
              {"==": [{"var": "selectedBusinessExperience"}, "3plus"]}, 90,
              {"==": [{"var": "selectedBusinessExperience"}, "3"]}, 85,
              {"==": [{"var": "selectedBusinessExperience"}, "2"]}, 80,
              70
            ]},
            {"==": [{"var": "businessType"}, "trading"]},
            {"if": [
              {"==": [{"var": "selectedBusinessExperience"}, "3plus"]}, 70,
              {"==": [{"var": "selectedBusinessExperience"}, "3"]}, 65,
              60
            ]},
            {"in": [{"var": "businessType"}, ["b2b_services", "b2c_services"]]},
            60,
            50
          ]
        },
        100
      ]
    }
  ]
}
```

---

### 17-21. Multi-Applicant Sections (Context 3) — ALL MANDATORY

**CRITICAL**: No main applicant concept. All applicants are equal co-applicants.

**17. multipleAppIncomeRules** — WARNING: if policy doesn't specify weightage, add to `confirmationRequired`

```json
{
  "multipleAppIncomeRules": [{
    "sum": [{"map": [{"var": "applicantData"}, {"if": [{"==": [{"var": "onProperty"}, "Yes"]}, {"var": "income"}, 0]}]}]
  }]
}
```

**18. multipleAppInterestRules**:
```json
{"multipleAppInterestRules": [{"min": [{"map": [{"var": "applicantData"}, {"var": "interestRate"}]}]}]}
```

**19. multipleAppTenureRules**:
```json
{"multipleAppTenureRules": [{"min": [{"map": [{"var": "applicantData"}, {"var": "tenure"}]}]}]}
```

**20. multipleAppFoirRules**:
```json
{"multipleAppFoirRules": [{"max": [{"map": [{"var": "applicantData"}, {"var": "foir"}]}]}]}
```

**21. multipleAppCalEligibilityRules** — HOW to calculate loan eligibility with multiple applicants:

```json
{
  "multipleAppCalEligibilityRules": [
    {
      "calculateType": "individual",
      "formulaExplanation": "Each applicant contributes (Income × Their_FOIR - Obligations). Sum all contributions."
    }
  ]
}
```

Or for combined method:
```json
{
  "multipleAppCalEligibilityRules": [
    {
      "calculateType": "combined",
      "combinedCalculationRules": {"foirSelection": "max"},
      "formulaExplanation": "Pool all incomes, apply highest FOIR to total, deduct total obligations."
    }
  ]
}
```

Default to `"individual"` if policy is silent — add WARNING in `suggestionMsg`.

---

### 22-25. Document and Static Sections

**documentOfKyc** (Context 4):
```json
{
  "documentOfKyc": [
    {
      "if": [
        {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
        ["PAN Card", "Aadhaar Card", "Salary Slip (3 months)", "Bank Statement (6 months)", "Form 16 (2 years)"],
        {"==": [{"var": "EmploymentType"}, "Employed(Private)"]},
        ["PAN Card", "Aadhaar Card", "Salary Slip (3 months)", "Bank Statement (6 months)", "Employment Letter"],
        {"==": [{"var": "EmploymentType"}, "Pensioner"]},
        ["PAN Card", "Aadhaar Card", "Pension documents", "Bank Statement (6 months)"],
        {"in": [{"var": "EmploymentType"}, ["Self-employed(Professional)", "Self-employed(Other)"]]},
        ["PAN Card", "Aadhaar Card", "ITR (Last 2 years)", "Bank Statement (12 months)", "CA Certificate"],
        ["PAN Card", "Aadhaar Card"]
      ]
    }
  ]
}
```

**documentOfPropertyType** (Context 1):
```json
{
  "documentOfPropertyType": [
    {
      "if": [
        {"==": [{"var": "PropertyStage"}, "Ready To Move"]},
        ["Sale Deed", "Title Deed", "Encumbrance Certificate", "Property Tax Receipt", "Occupancy Certificate"],
        {"==": [{"var": "PropertyStage"}, "Under Construction"]},
        ["Agreement to Sell", "Builder-Buyer Agreement", "Payment Receipts", "RERA Certificate"],
        []
      ]
    }
  ]
}
```

**charges** (Context 4):
```json
{"charges": [{"processingFee": 7000, "loginFee": 2000, "technicalFee": 5000}]}
```

**features** (Static):
```json
{"features": [["Prepayment allowed after 6 months", "No prepayment charges after 1 year", "Balance transfer facility available"]]}
```

---

### 26-28. Plot & Equity 3-cap parameter keys (parameter-tier within `ltvRules`)

These three parameter keys configure the engine's Plot & Equity Loan 3-cap math. They are NOT top-level rule sections — they ride inside `ltvRules` as `tier: 'parameter'` rules. The engine extracts them at `evaluationEngine.ts:514-522`. See the upfront §"Plot & Equity Loan 3-cap framework" block (right after the propCost-vs-dealValue critical block) for the full framework, gold-standard fixture, and common-mistake patterns.

**Gating** (required for all 3): `applies_when: {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]}`. Without this gate, the values leak to the other 3 Plot variants and break their math.

**26. plot_equity_overall_sanction_ltv** — X% of `marketValue` → headline sanction (Rule 1)

```json
{
  "ltvRules": [
    {
      "rule_id": "plot_equity_sanction_2024",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_overall_sanction_ltv",
      "parameter_value": 70
    }
  ]
}
```

Conditional variant (X varies by city tier):
```json
{
  "ltvRules": [
    {
      "rule_id": "pe_sanction_metro",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore"]]},
      "parameter_key": "plot_equity_overall_sanction_ltv",
      "parameter_value": 70
    },
    {
      "rule_id": "pe_sanction_nonmetro",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_overall_sanction_ltv",
      "parameter_value": 60
    }
  ]
}
```

**27. plot_equity_seller_disbursement_cap** — Y% of `registryValue` → max seller portion (Rule 2)

```json
{
  "ltvRules": [
    {
      "rule_id": "plot_equity_seller_2024",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_seller_disbursement_cap",
      "parameter_value": 90
    }
  ]
}
```

Note: Y assumes the buyer brings the remaining margin on the registered portion (Y=90 means buyer brings 10% on registry). Engine clamps to the overall sanction — if `Y% × registry` would exceed sanction, the engine takes the lower of the two.

**28. plot_equity_lap_on_plot_cap** — Z% of `marketValue` → max buyer cash from LAP file (Rule 3)

```json
{
  "ltvRules": [
    {
      "rule_id": "plot_equity_lap_2024",
      "tier": "parameter",
      "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
      "logic": true,
      "parameter_key": "plot_equity_lap_on_plot_cap",
      "parameter_value": 40
    }
  ]
}
```

Note: Z is the lender's LAP-on-plot ceiling. Engine clamps to whatever sanction remains after the seller's portion — combined caps guarantee `seller + buyer cash ≤ sanction`.

**Combined Example — All 3 caps for one lender**:

```json
{
  "ltvRules": [
    {"rule_id": "pe_x", "tier": "parameter",
     "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
     "logic": true, "parameter_key": "plot_equity_overall_sanction_ltv", "parameter_value": 70},
    {"rule_id": "pe_y", "tier": "parameter",
     "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
     "logic": true, "parameter_key": "plot_equity_seller_disbursement_cap", "parameter_value": 90},
    {"rule_id": "pe_z", "tier": "parameter",
     "applies_when": {"==": [{"var": "loanTransaction.loanVariant"}, "Plot & Equity Loan"]},
     "logic": true, "parameter_key": "plot_equity_lap_on_plot_cap", "parameter_value": 40}
  ]
}
```

Engine output (when `marketValue=1,00,00,000` and `registryValue=20,00,000`):

- `plot_equity_sanction_headline`: ₹70,00,000
- `plot_equity_seller_disbursement`: ₹18,00,000
- `plot_equity_buyer_cash_component`: ₹40,00,000
- `plot_equity_buyer_net_out_of_pocket`: ₹42,00,000

(Lock test `src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts` validates these.)

---

## 🎯 GOVERNANCE SECTIONS

### confirmationRequired

```json
{
  "confirmationRequired": [
    {
      "ruleId": "CR001",
      "originalText": "exact text from policy",
      "category": "ambiguous | multi-section | missing-context | contradiction | missing-variable | unclear-logic",
      "complexityScore": 25,
      "parserReasoning": "Why clarification is needed",
      "possibleInterpretations": [
        {"interpretation": "Option 1", "logic": "What would be implemented", "whenToUse": "Conditions"},
        {"interpretation": "Option 2", "logic": "Alternative", "whenToUse": "Conditions"}
      ],
      "suggestedAction": "Specific question to ask lender",
      "relatedVariables": ["var1", "var2"],
      "parserAttempt": {},
      "affectsSection": "section name"
    }
  ]
}
```

### lenderApprovalRequired

```json
{
  "lenderApprovalRequired": [
    {
      "ruleId": "LA001",
      "originalText": "CIBIL 650-700 may be considered case-by-case",
      "approvalType": "case-by-case | deviation | exception | manual-underwriting | credit-committee",
      "triggerConditions": {},
      "approvalCriteria": "what lender should evaluate",
      "defaultAction": "approve | reject | hold",
      "riskLevel": "low | medium | high",
      "requiredDocumentation": ["doc1", "doc2"],
      "affectsSection": "transactionRules"
    }
  ]
}
```

### flexibilityRules

```json
{
  "flexibilityRules": [
    {
      "ruleId": "FL001",
      "originalText": "LTV can be 90% if down payment >30%",
      "flexibilityType": "relaxation | trade-off | compensating-factor | conditional-adjustment",
      "baseRule": "LTV: 80%",
      "flexibleRule": {},
      "conditions": {},
      "affectsSection": "ltvRules",
      "maxDeviation": "+10% on LTV",
      "requiresApproval": false,
      "riskImplication": "Lower risk due to higher equity"
    }
  ]
}
```

### suggestionMsg

```json
{
  "suggestionMsg": [
    {
      "type": "observation | clarification | edge-case | recommendation | missing-info",
      "message": "detailed message",
      "severity": "info | warning | critical",
      "affectsSection": "section name"
    }
  ]
}
```

---

## 🏙️ CITY NORMALIZATION (MANDATORY)

Always use `{"var": "propertyCityNormalized"}` — never `{"var": "propertyCityName"}`.

Format: Lowercase, no spaces — "New Delhi" → "newdelhi", "Mumbai" → "mumbai"

---

## 🔧 ALLOWED OPERATORS

Arithmetic: `+, -, *, /, %`  
Comparison: `==, !=, <, <=, >, >=, in`  
Logical: `and, or, !`  
Control: `if, var`  
Collection: `map, filter, max, min, sum, average`

---

## ✅ VALIDATION CHECKLIST

### Schema Enforcement (CRITICAL)
- [ ] Every variable checked against schema
- [ ] NO variables used that aren't in schema
- [ ] Exact spelling matches (propCost NOT propertyCost)
- [ ] NO invented values (Self, Spouse, Primary)

### Ambiguity Handling
- [ ] Vague terms flagged in confirmationRequired
- [ ] Assumptions documented in suggestionMsg

### Variable Usage
- [ ] NO `loanTransaction.` prefixes
- [ ] NO array notation `[0].`
- [ ] `propertyCityNormalized` used for cities
- [ ] `relationshipType` used (not "relation")
- [ ] `propCost` used (not "propertyCost")

### Multi-Applicant (CRITICAL)
- [ ] `multipleAppIncomeRules` — NOT EMPTY
- [ ] `multipleAppInterestRules` — NOT EMPTY
- [ ] `multipleAppTenureRules` — NOT EMPTY
- [ ] `multipleAppFoirRules` — NOT EMPTY
- [ ] `multipleAppCalEligibilityRules` — NOT EMPTY
- [ ] `obligationsRule` — NOT EMPTY
- [ ] NO "Self" or "Primary" concept

---

## 📤 OUTPUT REQUIREMENTS

1. Valid JSON only
2. All 25 sections present
3. Multi-applicant sections populated
4. Only schema variables used (STRICT)
5. Ambiguities documented in confirmationRequired
6. Assumptions documented in suggestionMsg
7. Governance sections included

---

# END OF SPECIFICATION v7.0

> Source: AI_Based_Bank_Management repo — `src/lib/policyMdFile/LOAN_POLICY_PARSER_SPEC_V7_PRODUCTION.md`
> Staged here for use as AI prompt seed in PMS Phase 3 (term dictionary + prompt engineering).

---

# DigitalDSA V3 Integration Layer

> **This section overrides or supplements the V7 spec above wherever there is a conflict.**
> The V7 spec is an excellent foundation for prompt engineering patterns (ambiguity detection,
> hallucination prevention, complexity scoring, 15 patterns). Everything below adapts it for
> the V3 engine, data model, and pipeline architecture.

---

## V3.1 — Where This Spec Is Used in the 6-Pass Pipeline

The V7 spec (above) describes a single-pass parser. V3 uses a **6-pass pipeline**:

| Pass | Purpose | Uses This Spec? |
|------|---------|-----------------|
| Pass 1 | Terminology normalization + relevance classification | No — separate prompt |
| Pass 2 | Clause atomization + ambiguity flagging | No — separate prompt |
| **Pass 3** | **Encode clauses to ConditionalOverride JSON-Logic** | **YES — this is the primary use** |
| Pass 4 | Encoding verification (score 0–100) | No — verifier prompt |
| Pass 5 | Correction re-encode (if score < 85) | Yes — same as Pass 3 |
| Pass 6 | Reconstruction (deterministic + AI prose) | No — reconstruction prompt |

**Pass 3 input**: A single atomized clause from Pass 2 (e.g., "For government employees in metro cities, LTV is 90% if CIBIL ≥ 750, else 85%.") plus the V3 key registry.

**Pass 3 output**: A single `ConditionalOverride` object (see §V3.2 below), NOT one of the 25 sections.

---

## V3.2 — Output Format: ConditionalOverride (NOT 25 sections)

**The 25-section output format from V7 does NOT apply to V3.**

V3 output for each clause is a single `ConditionalOverride`:

```typescript
interface ConditionalOverride {
  id: string;                     // generated uuid — AI leaves as ""
  label: string;                  // short human-readable name, max 60 chars
  sourceClauseId: string;         // from Pass 2 output — AI echoes back
  authoringMode: 'template' | 'custom_json';
  templateId: string | null;      // if a V3 template matched (see §V3.5)
  templateParams: Record<string, unknown> | null;

  // THE CORE ENCODING — uses V7 patterns
  condition: JsonLogicRule;       // WHEN does this override apply?
  effect: PolicyEffect;           // WHAT does it change?
  scope: ConditionScope;

  confidence: number;             // 0.0–1.0 (AI-computed, same as V7 confidence / 100)
  aiConfidence: number;           // same value — stored separately for audit

  // Governance (carry from V7)
  confirmationRequired: ConfirmationItem[];
  suggestionMsg: SuggestionItem[];
}

interface PolicyEffect {
  fieldPath: string;    // e.g. "ltv.maxPercent" — see §V3.3 for valid paths
  operation: 'set' | 'add' | 'multiply' | 'max' | 'min';
  value: number | string | boolean;
}

interface ConditionScope {
  loanProducts: LoanProduct[] | 'all';
  applicantScope: 'any' | 'all' | 'primary';
}
```

### Output example — single ConditionalOverride

Clause: "For government employees in metro cities, LTV is 90% if CIBIL ≥ 750, else 85%."

```json
{
  "id": "",
  "label": "Government metro LTV by CIBIL",
  "sourceClauseId": "clause_003",
  "authoringMode": "custom_json",
  "templateId": null,
  "templateParams": null,
  "condition": {
    "and": [
      {"==": [{"var": "EmploymentType"}, "Employed(Government)"]},
      {"in": [{"var": "propertyCityNormalized"}, ["mumbai", "delhi", "bangalore", "chennai", "kolkata", "hyderabad"]]}
    ]
  },
  "effect": {
    "fieldPath": "ltv.maxPercent",
    "operation": "set",
    "value": {
      "if": [
        {">=": [{"var": "creditScore"}, 750]},
        90,
        85
      ]
    }
  },
  "scope": {
    "loanProducts": ["Home Loan", "Loan Against Property"],
    "applicantScope": "primary"
  },
  "confidence": 0.92,
  "aiConfidence": 0.92,
  "confirmationRequired": [],
  "suggestionMsg": []
}
```

---

## V3.3 — Valid PolicyEffect Field Paths (Key Registry)

The AI **must only use field paths from the V3 key registry** (injected at Pass 3 runtime as `keyRegistry.ts` content). Do not invent paths.

Common paths (illustrative — always defer to the injected registry):

| Section | fieldPath | type | Notes |
|---------|-----------|------|-------|
| LTV | `ltv.maxPercent` | number | 0–100 |
| LTV | `ltv.minDownPaymentPercent` | number | |
| Income | `income.haircut` | number | 0.0–1.0 multiplier |
| Income | `income.types` | string[] | allowed income sources |
| FOIR | `foir.maxPercent` | number | 0–100 |
| Rate | `roi.basePercent` | number | |
| Rate | `roi.loadingPercent` | number | additive |
| Rate | `roi.discountPercent` | number | subtractive |
| Tenure | `tenure.maxYears` | number | |
| Tenure | `tenure.retirementAge` | number | |
| Eligibility | `eligibility.minCibil` | number | |
| Eligibility | `eligibility.minAge` | number | |
| Eligibility | `eligibility.maxAge` | number | |
| Eligibility | `eligibility.rejected` | string | rejection reason string |
| Obligations | `obligations.creditCardFactor` | number | fraction of limit counted |
| Docs | `documents.required` | string[] | |
| Fees | `fees.processingFeeRs` | number | absolute ₹ |
| Fees | `fees.processingFeePercent` | number | percent of loan amount |

**If the effect cannot be mapped to any registered field path:** Do not invent one. Add to `confirmationRequired` with `category: "missing-field-path"`.

---

## V3.4 — V3 Variable Names (Key Registry Replaces "Schema")

Where V7 says "check the provided schema", V3 says "check the injected `keyRegistry.ts`".

The variable names in the V7 examples above largely match V3's enriched payload:

| V7 Example Variable | V3 Status | Notes |
|--------------------|-----------|-------|
| `creditScore` | ✅ Same | Direct match |
| `EmploymentType` | ✅ Same | Exact casing required |
| `propCost` | ✅ Same | Direct Sale only |
| `dealValue` | ✅ Same | Resale only |
| `propertyCityNormalized` | ✅ Same | Lowercase, no spaces |
| `PropertyStage` | ✅ Same | Capital P |
| `purchaseType` | ✅ Same | "Direct Sale" / "Resale" |
| `isDefaulter` | ✅ Same | "Yes" / "No" strings |
| `ApplicantIsNRI` | ✅ Same | Capital A |
| `netIncome` | ✅ Same | Monthly net |
| `grossIncome` | ✅ Same | Monthly gross |
| `gender` | ✅ Same | "Male" / "Female" |
| `age` | ✅ Same | Integer years |
| `onProperty` | ✅ Same | "Yes" / "No" |
| `relationshipType` | ✅ Same | Not "relation" |
| `applicantData` | ✅ Same | Multi-applicant array |
| `income` | ✅ Same | Inside applicantData map |
| `relation` | ❌ Wrong | Use `relationshipType` |
| `propertyCost` | ❌ Wrong | Use `propCost` |
| `Self`, `Spouse`, `Primary` | ❌ Wrong | Check registry for actual values |

**Always defer to the injected key registry.** The table above is illustrative only.

---

## V3.5 — Template Matching (Prefer Templates Over custom_json)

V3 has a **22-template library** (`src/lib/config/pms/templates/`). Before encoding as `custom_json`, check if the clause matches a template. Template matches should set `authoringMode: 'template'`, `templateId`, and `templateParams`.

Common templates and their IDs:

| Template ID | Pattern | Example Clause |
|-------------|---------|----------------|
| `CIBIL_TIERED_LTV` | CIBIL ranges → LTV % | "CIBIL ≥ 750 → 90%, ≥ 700 → 85%, else 80%" |
| `EMPLOYMENT_FOIR` | Employment type → FOIR % | "Govt 65%, Private 60%, Self-emp 55%" |
| `PROPERTY_COST_LTV` | Property cost brackets → LTV | "≤30L → 90%, 30L-75L → 80%, >75L → 75%" |
| `CITY_TIER_RATE` | Metro/non-metro → rate loading | "+0.25% for non-metro" |
| `GENDER_RATE_DISCOUNT` | Female → rate reduction | "-0.05% for female borrower" |
| `TENURE_RETIREMENT_CAP` | Retirement age cap on tenure | "Max tenure limited by retirement at 60" |
| `REJECTION_DEFAULTER` | isDefaulter=Yes → reject | Hard rejection rule |
| `REJECTION_NRI` | NRI not eligible | Hard rejection rule |
| `DOC_BY_EMPLOYMENT` | Employment type → document list | Salaried vs self-employed docs |
| `PROCESSING_FEE_FLAT` | Fixed processing fee | "₹7,000 processing fee" |
| `PROCESSING_FEE_PERCENT` | % of loan amount | "0.5% of loan amount, min ₹5,000" |
| `SURROGATE_LTV` | Credit card/bank balance surrogate | Surrogate income LTV rules |

If no template matches, use `authoringMode: 'custom_json'` and apply V7 patterns.

---

## V3.6 — Primary Applicant Concept (V3 differs from V7)

**V7 Rule**: "No Main Applicant concept. All applicants are equal co-applicants."

**V3 Override**: V3 DOES have a primary applicant concept. The `isPrimaryApplicant` field exists in the payload.

- **For most rules (LTV, tenure, rate, FOIR)**: Evaluate against primary applicant only. Use `applicantScope: 'primary'` in scope.
- **For income rules**: May aggregate across applicants. Use `applicantScope: 'any'` or `'all'` depending on clause.
- **For multi-applicant income**: V7's `applicantData` array pattern (Pattern 10) still applies, but filter for primary when clause specifies "main applicant" or "borrower".

```json
// V3 primary-applicant scope
{
  "scope": {
    "loanProducts": "all",
    "applicantScope": "primary"
  }
}

// V3 any-applicant scope (e.g., CIBIL check on any applicant)
{
  "scope": {
    "loanProducts": "all",
    "applicantScope": "any"
  }
}
```

**Relationship values in V3**: Check the injected key registry. Common values: `"husband"`, `"wife"`, `"father"`, `"mother"`, `"son"`, `"daughter"`, `"brother"`, `"sister"`. Do NOT use `"Spouse"`, `"Self"`, `"Primary"`.

---

## V3.7 — V7 Section → V3 Field Path Mapping

The V7 25-section output maps to V3 field paths as follows. Use this when encountering clauses that would have gone into a V7 section:

| V7 Section | V3 fieldPath(s) |
|-----------|-----------------|
| `transactionRules` | `eligibility.rejected` (rejection string) |
| `ltvRules` | `ltv.maxPercent` |
| `maxLoanAmount` | `ltv.maxLoanAmountRs` |
| `incomeRules` | `income.types`, `income.haircut` |
| `interestRateRules` | `roi.basePercent`, `roi.loadingPercent` |
| `foirRules` | `foir.maxPercent` |
| `tenureRules` | `tenure.maxYears`, `tenure.retirementAge` |
| `roiWithGen` | `roi.discountPercent` (with gender condition) |
| `tenureWithGen` | `tenure.extensionYears` (with gender condition) |
| `specialCaseOfBusiness` | `income.businessMultiplier` |
| `obligationsRule` | `obligations.creditCardFactor` |
| `multipleAppIncomeRules` | `income.multiApplicantMethod` |
| `documentOfKyc` | `documents.kyc` |
| `documentOfPropertyType` | `documents.property` |
| `charges` | `fees.processingFeeRs`, `fees.loginFeeRs` |
| `features` | `features.list` |
| `SurrogacyLtvRule` | `ltv.surrogateMaxPercent` |
| `SurrogacyIncomeRule` | `income.surrogateMethod` |

---

## V3.8 — Governance Object Mapping

V7 governance objects (`confirmationRequired`, `suggestionMsg`, `lenderApprovalRequired`, `flexibilityRules`) are carried through into the V3 `ConditionalOverride.confirmationRequired[]` and `ConditionalOverride.suggestionMsg[]` arrays unchanged. The structures are identical.

`lenderApprovalRequired` items → use `authoringMode: 'bank_card'` + add to `BankCardNote` (separate from ConditionalOverride).

`flexibilityRules` items → encode as a second ConditionalOverride with its trigger condition.

---

## V3.9 — `!=` Operator Safety Note

The V7 spec uses `!=` in JSON-Logic rules. This is correct for V3 policy evaluation.

**CLAUDE.md Pitfall #1 scope**: The `!=` override in `src/lib/server/formEngine/visibility.ts` applies **only to form field visibility** (checking unanswered/null form fields). It does NOT affect policy evaluation.

Policy rules run against **fully-populated enriched payloads** via `jsonLogic.apply()` in `evaluationEngine.ts`. All fields are present — there are no null/undefined gaps from unanswered questions. `!=` behaves as standard JSON-Logic in this context.

✅ `{"!=": [{"var": "ApplicantIsNRI"}, "Yes"]}` — correct for policy rules
✅ `{"!=": [{"var": "isDefaulter"}, "No"]}` — correct for policy rules

The `!` operator is reserved for checking falsy/null values in form visibility only.

---

## V3.10 — Multi-Pass Context for Pass 5 (Correction)

Pass 5 is triggered when Pass 4 verification score < 85 or finds critical issues. Pass 5 re-runs Pass 3 encoding with:

1. The original clause text
2. The failed `ConditionalOverride` from Pass 3
3. Pass 4's specific issue list (e.g., "wrong operator", "missing condition branch", "stale key detected")

The re-encoding prompt should include the Pass 4 issues as explicit corrections:

```
CORRECTION REQUIRED:
- Issue: Missing condition branch for CIBIL < 650
- Issue: Used propertyCost instead of propCost (stale key)
- Severity: critical

Re-encode the clause addressing ALL issues above.
```

Pass 5 output replaces the Pass 3 output entirely — it is a full new `ConditionalOverride`, not a patch.

---

## V3.11 — Batch Mode (Multiple Clauses)

When encoding multiple clauses from a single Pass 2 output, Pass 3 receives them one at a time (sequential calls). Each call produces one `ConditionalOverride`. The wizard UI shows progress per clause.

Do NOT batch multiple clauses into a single API call. Each clause gets its own:
- Confidence score
- `confirmationRequired` list
- `suggestionMsg` list
- Template match decision

The 30-second timeout (per clause) applies to each call independently.

---

## V3.12 — Delta Parse Mode (Edit Flow)

When an RM submits a change circular rather than a full policy document, Pass 1 is told to classify clauses as:
- `new` — clause not present in current published policy
- `modified` — clause changes an existing rule (by field path)
- `removed` — clause removes an existing rule
- `unchanged` — clause confirms existing rule, no encoding needed

Pass 3 only encodes `new` and `modified` clauses. `removed` clauses are flagged for admin to manually archive the relevant `ConditionalOverride`. `unchanged` clauses are skipped.

The output for `modified` clauses must include the **existing `ConditionalOverride.id`** in `sourceClauseId` so the admin review UI can show a diff.

---

# END OF V3 INTEGRATION LAYER

**Summary of what changes from V7 for V3:**
1. Output = `ConditionalOverride[]` (one per clause), not 25 sections
2. Field paths from key registry replace section names
3. Primary applicant scope exists (set in `scope.applicantScope`)
4. Templates preferred over custom_json when a match exists
5. `!=` is safe in policy rules (visibility.ts override is form-only)
6. Each clause encoded independently (no batch)
7. Delta parse mode for edit flow (change circulars)
8. Pass 5 correction re-encodes the full override, not a patch
