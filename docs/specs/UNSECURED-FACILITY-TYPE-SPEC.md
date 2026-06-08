# Unsecured Loan Facility Type Architecture

> **Created**: 2026-03-16 (Session 29)
> **Status**: PARTIALLY IMPLEMENTED — Form + payload + enricher done. Rule engine policy integration pending.
>
> ### Implementation Status (updated 2026-04-06)
> - **Section 2 (Data Flow)**: ✅ DONE — `facilityType` flows from form → `loanTransaction.facilityType` → `_computed._facility_type` + `_is_credit_line_facility`.
> - **Section 3 (Rule Engine)**: ✅ DONE — FOIR branching (OD/CC: % of limit, DOD: declining balance, Term: EMI-based), EMI branching, `FACILITY_TYPE_CONFIG` + `isRevolvingFacility()` + `getFacilityConfig()` in systemConfig.ts, tenure handling per facility type, 25 tests in facilityBranching.test.ts.

---

## 1. What Changed

Previously, `unSecureLoanType` held the **loan product name** ("Personal Loan", "Business Loan", "Professional Loan"). This was redundant with `loanName` and blocked facility-type differentiation.

Now, `unSecureLoanType` holds the **facility type** — the actual lending instrument:

| Value                       | What It Is                               | How It Works                                                                       |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `Term Loan`                 | Traditional loan with fixed EMI schedule | Lump sum disbursement, equal monthly installments                                  |
| `Overdraft (OD)`            | Revolving credit line with a limit       | Interest on utilized amount only; repay and redraw freely                          |
| `Drop-line OverDraft (DOD)` | OD with limit that reduces over time     | Like OD but limit drops monthly (drop-line), ensuring gradual repayment            |
| `Cash Credit (CC)`          | Working capital credit line              | Similar to OD but typically for inventory/trade; interest on daily closing balance |

**Applies to**: Personal Loan, Business Loan, Professional Loan (all unsecured).
**Does NOT apply to**: Home Loan, LAP, Plot Loan (secured — these have property-based facility structures).

---

## 2. Data Flow

```
Form (commonPage)                 Payload Builder              Enricher              Rule Engine
─────────────────                 ───────────────              ────────              ───────────
q2_unSecureLoanType               loanTransaction              _computed              JSON-Logic
  "Term Loan"                       .facilityType                ._facility_type         rules can
  "Overdraft (OD)"          →       = "Overdraft (OD)"    →     = "Overdraft (OD)"  →  reference
  "Drop-line OverDraft (DOD)"                                   ._is_credit_line        both paths
  "Cash Credit (CC)"                                            = true
```

### Key Fields

| Location        | Field                                | Type    | Values                                                                                       |
| --------------- | ------------------------------------ | ------- | -------------------------------------------------------------------------------------------- |
| **Form answer** | `unSecureLoanType`                   | string  | `"Term Loan"` \| `"Overdraft (OD)"` \| `"Drop-line OverDraft (DOD)"` \| `"Cash Credit (CC)"` |
| **Payload**     | `loanTransaction.facilityType`       | string? | Same as above. `undefined` for secured loans.                                                |
| **Enricher**    | `_computed._facility_type`           | string  | Same as above. Empty string `""` for secured loans.                                          |
| **Enricher**    | `_computed._is_credit_line_facility` | boolean | `true` for OD/DOD/CC, `false` for Term Loan and secured loans                                |

### What `loanType` Holds (Separate Field)

`loanType` (from q4) holds the **loan purpose/variant**, NOT the facility type:

| Facility  | Available loanType Options                                 |
| --------- | ---------------------------------------------------------- |
| Term Loan | New Loan, Debt Consolidation, DC with Extra Funds          |
| OD        | New OD Facility, OD Takeover, OD Takeover + Enhancement    |
| DOD       | New DOD Facility, DOD Takeover, DOD Takeover + Enhancement |
| CC        | New CC Facility, CC Takeover, CC Takeover + Enhancement    |

`mapLoanType()` normalizes these to: `"New Loan"` or `"Balance Transfer"` for downstream.

---

## 3. Why This Matters for Rule Engine / Policies

### 3.1 Different Calculation Models

| Aspect                   | Term Loan                 | Credit Line (OD/DOD/CC)                        |
| ------------------------ | ------------------------- | ---------------------------------------------- |
| **EMI**                  | Fixed monthly EMI         | No fixed EMI — interest on utilization         |
| **FOIR treatment**       | EMI / gross income        | % of sanctioned limit (e.g., 5% of limit)      |
| **Tenure**               | Fixed (1-7 years)         | Renewable annually (OD/CC) or fixed drop (DOD) |
| **Interest calculation** | On outstanding principal  | On daily utilized balance                      |
| **Repayment**            | Fixed schedule, no redraw | Flexible — repay and redraw within limit       |

### 3.2 Bank Policy Differences

Banks have different policies per facility type:

- **Minimum income**: May be higher for credit lines (banks want stable cash flow)
- **Max limit**: OD/CC limits may differ from max term loan amounts
- **Vintage requirements**: Banks may need longer business vintage for OD/CC
- **CIBIL thresholds**: Some banks require higher CIBIL for revolving credit
- **Collateral requirements**: Some banks offer OD only with collateral (which would make it LAP-OD, not unsecured)

### 3.3 How Rule Authors Should Use These Fields

In JSON-Logic rules, reference these paths:

```json
// Check if it's a credit line facility
{ "==": [{ "var": "_computed._is_credit_line_facility" }, true] }

// Check for specific facility type
{ "==": [{ "var": "_computed._facility_type" }, "Overdraft (OD)"] }

// Gate: Only apply this rule to term loans
{ "==": [{ "var": "_computed._is_credit_line_facility" }, false] }

// Gate: Apply to OD and DOD (not CC, not Term)
{ "in": [{ "var": "_computed._facility_type" }, ["Overdraft (OD)", "Drop-line OverDraft (DOD)"]] }
```

Or via raw payload (if enricher computed path not needed):

```json
{ "==": [{ "var": "loanTransaction.facilityType" }, "Cash Credit (CC)"] }
```

---

## 4. Implementation Checklist

### Done (Session 29)

- [x] `commonPage.json` — `q2_unSecureLoanType` now holds facility type with 4 options
- [x] `commonPage.json` — `q4_loanType` has facility-specific options with option-level `showWhen`
- [x] `commonPage.json` — `q3_obligationsRunning` switch cases fixed to use `loanName` not `unSecureLoanType`
- [x] `rules.ts` — `applyAutoLoanRules()` converted to no-op (users pick explicitly)
- [x] `personal-loan/+page.svelte` — DOD auto-set `$effect` removed, fallback → `'Term Loan'`
- [x] `business-loan/+page.svelte` — fallback → `'Term Loan'`
- [x] `professional-loan/+page.svelte` — fallback → `'Term Loan'`
- [x] `UnsecuredObligation.svelte` — closure logic handles `'New Loan'`
- [x] `ObligationTable.svelte` — display guard handles `'New Loan'`
- [x] `payloadBuilder/types.ts` — `facilityType?: string` added to `LoanTransactionPayload`
- [x] `payloadBuilder/loanTransaction.ts` — `facilityType` populated for unsecured loans
- [x] `payloadEnricher.ts` — `_facility_type` + `_is_credit_line_facility` computed fields
- [x] Test scenarios, fixture profiles, archetype templates, e2e helpers updated

### Rule Engine Policy Integration (Session 56)

- [x] **FOIR calculation**: OD/CC use % of limit, DOD uses declining balance, Term Loan uses EMI-based
- [x] **EMI calculation**: OD/CC use proxy EMI (factor × limit), DOD uses declining balance, Term Loan uses standard
- [x] **Tenure handling**: OD/CC default 12 months (annual renewal), DOD default 60 months, Term uses age-at-maturity
- [x] **systemConfig.ts**: `FACILITY_TYPE_CONFIG` with 4 facility types + `isRevolvingFacility()` + `getFacilityConfig()`
- [ ] **Rule parsing prompt**: Update Section 3 of RULE-ENGINE-SPECIFICATION.md with facility type keys
- [x] **Payload key registry**: `_computed._facility_type` + `_computed._is_credit_line_facility` already enriched
- [x] **Test fixtures**: 25 tests in `facilityBranching.test.ts` covering all 4 facility types

### Pending — UI/Form Enhancements

- [ ] **Tenure question**: For OD/CC, change "Loan tenure in years" label to "Facility period" or "Renewal period"
- [ ] **Amount question**: For OD/CC/DOD, change "Loan amount" label to "Credit limit required"
- [ ] **Obligations page**: Add "Utilization %" field for credit-line obligations (for accurate FOIR)

---

## 5. File Reference

| File                                                | What It Does                                                 |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/config/commonPage.json`                    | Client-side form schema with facility type options           |
| `src/lib/server/formEngine/schemas/commonPage.json` | Server-side copy (must stay in sync)                         |
| `src/lib/utils/mapLoanType.ts`                      | Maps loanType variants → "New Loan" / "Balance Transfer"     |
| `src/lib/utils/payloadBuilder/types.ts`             | `LoanTransactionPayload` interface with `facilityType`       |
| `src/lib/utils/payloadBuilder/loanTransaction.ts`   | Populates `facilityType` from form answers                   |
| `src/lib/ruleEngine/payloadEnricher.ts`             | Computes `_facility_type` + `_is_credit_line_facility`       |
| `src/lib/ruleEngine/systemConfig.ts`                | Future: `FACILITY_TYPE_CONFIG` defaults                      |
| `src/lib/ruleEngine/evaluationEngine.ts`            | Future: facility-aware FOIR/EMI branching                    |
| `src/lib/ruleEngine/incomeAssessor.ts`              | Already handles `term_loan` vs `credit_line` for obligations |
| `src/lib/form/firstPage/rules.ts`                   | No-op (legacy auto-rules removed)                            |

---

## 6. Migration Notes

### Breaking Changes for Existing Data

| Before                                   | After                            | Impact                                |
| ---------------------------------------- | -------------------------------- | ------------------------------------- |
| `unSecureLoanType = "Personal Loan"`     | `unSecureLoanType = "Term Loan"` | Old saved forms will have stale value |
| `unSecureLoanType = "Business Loan"`     | `unSecureLoanType = "Term Loan"` | Same                                  |
| `loanType = "Start Fresh with New Loan"` | `loanType = "New Loan"`          | Payload mapper already handles both   |

### Backward Compatibility

- `mapLoanType()` still handles `"Start Fresh with New Loan"` → `"New Loan"` for any old data
- `UnsecuredObligation.svelte` checks both `"Start Fresh with New Loan"` AND `"New Loan"`
- `facilityType` is `undefined` for secured loans — no impact on existing home/LAP/plot flows
- `_computed._facility_type` is `""` (empty string) for secured loans — safe for JSON-Logic `==`/`!=`
- `_computed._is_credit_line_facility` is `false` for secured loans and term loans — safe default
