# Area-Specific Property Compliance & Legal Verification Redesign

> **Created**: 2026-02-25 | **Status**: Planned, approved, ready for implementation
> **Prerequisite**: Working tree clean, 7,009 tests passing, 0 type errors

---

## Problem

The "Property Condition & Compliance" page (`propertyCondition_homeLoan`) and "Legal Verification" page (`legalVerification_homeLoan`) show the **same generic questions regardless of which property area type the user selected**. Selecting "Local Colony / Village / Panchayat Area" still asks about OC/CC certificates and municipal building plans — concepts that don't exist in villages.

**User confirmed**: Full area-specific redesign of both pages + area-specific legal questions.

---

## Property Area Types (contextKey: `propertyAreaType`)

Defined on `propertyLocation_homeLoan` page (homeLoanSchemaV2.json lines 156-195).

| Value                   | Label                                     | Indian Real Estate Context                                                              |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `PLANNED_AUTHORITY`     | Planned / Development Authority Area      | Townships, HUDA/PMRDA layouts, RERA projects. OC/CC standard. Bank-friendly.            |
| `CONVERTED_RESIDENTIAL` | Converted Land / Approved Residential Use | Agricultural→residential. **NA conversion order is THE key document.** Banks cautious.  |
| `OLD_MUNICIPAL`         | Old Municipal Area / Traditional Mohalla  | Within city limits, old houses. May predate formal approvals. Complex title chains.     |
| `LOCAL_COLONY`          | Local Colony / Village / Panchayat Area   | Non-planned, organic. 7/12 extracts, Gram Panchayat. Most banks won't fund — NBFCs may. |
| `UNKNOWN`               | Not sure                                  | Generic fallback — show all questions.                                                  |

---

## Current State (What Exists Today)

### Property Condition Page (lines 974-1296 in homeLoanSchemaV2.json)

| #   | ID                                  | contextKey                       | Shown When                         | Issue                                            |
| --- | ----------------------------------- | -------------------------------- | ---------------------------------- | ------------------------------------------------ |
| Q1  | `q1_propertyComplianceStatus`       | `propertyComplianceStatus`       | Always (when page visible)         | Generic — partially answered by area type itself |
| Q2  | `q2_ocCcAvailable`                  | `ocCcAvailable`                  | Flat/Floor + Ready To Move         | Not relevant for LOCAL_COLONY                    |
| Q3  | `q3_municipalApproval`              | `municipalApproval`              | House + Ready To Move              | Not relevant for LOCAL_COLONY                    |
| Q4  | `q4_isPossessionOfferedByAuthority` | `isPossessionOfferedByAuthority` | New Loan + Builder + Ready To Move | Not relevant for LOCAL_COLONY or OLD_MUNICIPAL   |

**None gated by `propertyAreaType`.**

### Legal Verification Page (lines 1547-1735)

| #   | ID                          | contextKey               | Shown When              |
| --- | --------------------------- | ------------------------ | ----------------------- |
| Q1  | `q1_documentationReadiness` | `documentationReadiness` | Always                  |
| Q2  | `q2_propertyDisputeStatus`  | `propertyDisputeStatus`  | After Q1 answered       |
| Q3  | `q3_nocFromPreviousLender`  | `nocFromPreviousLender`  | After Q2 + BT loan type |

**No area-specific questions at all.**

---

## Redesign: Property Condition Page

### Q1 — propertyComplianceStatus (5 VARIANTS, same contextKey)

Replace the single generic Q1 with **5 area-specific variants**, each gated on `propertyAreaType`. All share `contextKey: "propertyComplianceStatus"` and `bindsTo_template: "propertyComplianceStatus"` — **backward compatible**, same 3 output values (`fully_compliant`, `authorized_not_per_plan`, `not_authorized`).

Only ONE variant is visible at a time. The existing payloadEnricher mapping (`propertyComplianceStatus → approvedByAuthority + asPerMap`) continues to work unchanged.

| Variant | showWhen                                      | Question Text                                                                        | Option Labels                                                                                                                                                          |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1a** | `propertyAreaType == "PLANNED_AUTHORITY"`     | "Is the property part of an approved layout or township by a development authority?" | "Yes — approved layout, authority-approved plan" / "Approved layout, but construction has deviations" / "Not part of any approved layout"                              |
| **Q1b** | `propertyAreaType == "CONVERTED_RESIDENTIAL"` | "Has this land been officially converted to residential (NA order available)?"       | "Yes — NA order available, construction per approved plan" / "NA order available, but construction has deviations or no plan" / "NA order not available or pending"    |
| **Q1c** | `propertyAreaType == "OLD_MUNICIPAL"`         | "Is this property recognized by the municipal corporation?"                          | "Yes — municipal records exist, property tax being paid" / "Municipal area but property has unauthorized additions/extensions" / "No municipal records or recognition" |
| **Q1d** | `propertyAreaType == "LOCAL_COLONY"`          | "What is the legal status of this colony or village property?"                       | "Regularized colony with valid revenue records" / "Colony exists on revenue records but not regularized" / "No formal recognition — purely organic settlement"         |
| **Q1e** | `propertyAreaType == "UNKNOWN"`               | Same as current generic text                                                         | Same as current                                                                                                                                                        |

### Q2-Q4 — Add Area Gates to Existing Questions

**Q2 `ocCcAvailable`** — Add to existing showWhen:

```json
{
	"in": [
		{ "var": "propertyAreaType" },
		["PLANNED_AUTHORITY", "CONVERTED_RESIDENTIAL", "OLD_MUNICIPAL", "UNKNOWN"]
	]
}
```

Hides for LOCAL_COLONY (no OC/CC concept in villages).

**Q3 `municipalApproval`** — Same area gate as Q2. Hides for LOCAL_COLONY.

**Q4 `isPossessionOfferedByAuthority`** — Area gate:

```json
{ "in": [{ "var": "propertyAreaType" }, ["PLANNED_AUTHORITY", "CONVERTED_RESIDENTIAL", "UNKNOWN"]] }
```

Hides for LOCAL_COLONY and OLD_MUNICIPAL.

### 7 NEW Area-Specific Questions

#### CONVERTED_RESIDENTIAL Only

**Q5 — `naConversionStatus`**

- Question: "What is the status of the NA (Non-Agricultural) conversion order?"
- Type: radio, required
- showWhen: `propertyAreaType == "CONVERTED_RESIDENTIAL"`
- Options:
  - `REGISTERED` — "NA order received and registered"
  - `RECEIVED_NOT_REGISTERED` — "NA order received but not yet registered"
  - `PENDING` — "NA conversion applied, pending"
  - `NOT_APPLIED` — "Not applied yet"
  - `UNKNOWN` — "Not sure"

**Q6 — `zoneClassification`**

- Question: "Is the property in a residential zone as per the town planning scheme?"
- Type: radio, required
- showWhen: `propertyAreaType == "CONVERTED_RESIDENTIAL" AND naConversionStatus != ""`
- Options:
  - `RESIDENTIAL` — "Yes — residential zone"
  - `MIXED_USE` — "Mixed-use zone"
  - `NON_RESIDENTIAL` — "Agricultural / non-residential zone"
  - `UNKNOWN` — "Not sure"

#### OLD_MUNICIPAL Only

**Q7 — `municipalTaxStatus`**

- Question: "Is property tax being paid to the municipal corporation for this property?"
- Type: radio, required
- showWhen: `propertyAreaType == "OLD_MUNICIPAL"`
- Options:
  - `PAID_REGULAR` — "Yes — tax paid regularly, receipts available"
  - `PAID_IRREGULAR` — "Tax paid but receipts are old or incomplete"
  - `NO_RECORDS` — "No property tax records found"
  - `UNKNOWN` — "Not sure"

**Q8 — `unauthorizedAdditions`**

- Question: "Have any extra rooms, floors, or extensions been added without approval?"
- Type: radio, required
- showWhen: `propertyAreaType == "OLD_MUNICIPAL" AND municipalTaxStatus != ""`
- Options:
  - `NONE` — "No — original construction only"
  - `MINOR` — "Minor additions (balcony enclosed, extra room)"
  - `MAJOR` — "Major additions (extra floor, significant extension)"
  - `UNKNOWN` — "Not sure"

#### LOCAL_COLONY Only

**Q9 — `revenueRecordStatus`**

- Question: "Do revenue records (7/12 extract or Khasra-Khatauni) exist for this property?"
- Type: radio, required
- showWhen: `propertyAreaType == "LOCAL_COLONY"`
- Options:
  - `AVAILABLE_CURRENT` — "Yes — revenue records available and up to date"
  - `AVAILABLE_OUTDATED` — "Revenue records exist but are old or need mutation"
  - `NOT_AVAILABLE` — "No revenue records found"
  - `UNKNOWN` — "Not sure"

**Q10 — `colonyRegularizationStatus`**

- Question: "Has this colony been regularized by the government?"
- Type: radio, required
- showWhen: `propertyAreaType == "LOCAL_COLONY" AND revenueRecordStatus != ""`
- Options:
  - `REGULARIZED` — "Yes — colony is regularized / notified"
  - `PENDING` — "Regularization applied, pending"
  - `NOT_REGULARIZED` — "Not regularized"
  - `UNKNOWN` — "Not sure"

**Q11 — `gramPanchayatPermission`**

- Question: "Was any construction permission taken from the Gram Panchayat?"
- Type: radio, required
- showWhen: `propertyAreaType == "LOCAL_COLONY" AND colonyRegularizationStatus != ""`
- Options:
  - `YES` — "Yes — Gram Panchayat NOC / permission available"
  - `NO` — "No formal permission taken"
  - `N/A` — "Not applicable (no Panchayat governance here)"
  - `UNKNOWN` — "Not sure"

### Questions Visible Per Area Type (Property Condition)

| Question                    | PLANNED | CONVERTED | OLD_MUNI | LOCAL | UNKNOWN |
| --------------------------- | :-----: | :-------: | :------: | :---: | :-----: |
| Q1 (compliance variant)     |    ✓    |     ✓     |    ✓     |   ✓   |    ✓    |
| Q2 (OC/CC)                  |   ✓\*   |    ✓\*    |   ✓\*    |   —   |   ✓\*   |
| Q3 (Municipal approval)     |   ✓\*   |    ✓\*    |   ✓\*    |   —   |   ✓\*   |
| Q4 (Authority possession)   |   ✓\*   |    ✓\*    |    —     |   —   |   ✓\*   |
| Q5 (NA conversion)          |    —    |     ✓     |    —     |   —   |    —    |
| Q6 (Zone classification)    |    —    |     ✓     |    —     |   —   |    —    |
| Q7 (Municipal tax)          |    —    |     —     |    ✓     |   —   |    —    |
| Q8 (Unauthorized additions) |    —    |     —     |    ✓     |   —   |    —    |
| Q9 (Revenue records)        |    —    |     —     |    —     |   ✓   |    —    |
| Q10 (Colony regularization) |    —    |     —     |    —     |   ✓   |    —    |
| Q11 (GP permission)         |    —    |     —     |    —     |   ✓   |    —    |

`*` = existing conditions (constructionType, PropertyStage, loanType) still apply on top of area gate

---

## Redesign: Legal Verification Page

### Q1 — documentationReadiness (5 VARIANTS, same contextKey)

Same pattern as propertyComplianceStatus. Area-specific question text, same 4 options (`ALL_READY` / `PARTIAL` / `NOT_STARTED` / `ISSUES_FOUND`), same `contextKey: "documentationReadiness"`.

| Variant | showWhen                                      | Question Text                                                                                |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Q1a     | `propertyAreaType == "PLANNED_AUTHORITY"`     | "What is the status of property documents (allotment letter, sale deed, builder agreement)?" |
| Q1b     | `propertyAreaType == "CONVERTED_RESIDENTIAL"` | "What is the status of property documents (NA order, sale deed, zone certificate)?"          |
| Q1c     | `propertyAreaType == "OLD_MUNICIPAL"`         | "What is the status of property documents (sale deed, tax receipts, succession records)?"    |
| Q1d     | `propertyAreaType == "LOCAL_COLONY"`          | "What is the status of property documents (revenue records, sale deed, Panchayat docs)?"     |
| Q1e     | `propertyAreaType == "UNKNOWN"`               | Same as current generic text                                                                 |

### Q2-Q3: Keep As-Is (Universal)

- `propertyDisputeStatus` — Legal disputes apply everywhere
- `nocFromPreviousLender` — BT-only, area-irrelevant

### 5 NEW Legal Questions

**Q4 — `titleChainStatus`**

- Question: "Is the chain of title clear from the original allotment/sale to current owner?"
- showWhen: `propertyAreaType in [PLANNED_AUTHORITY, CONVERTED_RESIDENTIAL, UNKNOWN] AND documentationReadiness != ""`
- Options: `CLEAR` / `PARTIAL_GAPS` / `MAJOR_GAPS` / `NOT_CHECKED`

**Q5 — `encumbranceCertStatus`**

- Question: "Has an Encumbrance Certificate (EC) been obtained from the sub-registrar?"
- showWhen: `propertyAreaType in [PLANNED_AUTHORITY, CONVERTED_RESIDENTIAL, OLD_MUNICIPAL, UNKNOWN] AND documentationReadiness != ""`
- Options: `CLEAR` / `HAS_CHARGES` / `NOT_OBTAINED` / `UNKNOWN`

**Q6 — `successionStatus`**

- Question: "If this is an inherited/ancestral property, is the succession/partition deed done?"
- showWhen: `propertyAreaType == "OLD_MUNICIPAL" AND documentationReadiness != ""`
- Options: `NOT_APPLICABLE` / `SUCCESSION_DONE` / `PARTITION_DONE` / `PENDING` / `UNKNOWN`

**Q7 — `revenueRecordMutation`**

- Question: "Is the name mutation (namantar / dakhil kharij) done in revenue records for the current owner?"
- showWhen: `propertyAreaType == "LOCAL_COLONY" AND documentationReadiness != ""`
- Options: `DONE` / `PENDING` / `NOT_DONE` / `UNKNOWN`

**Q8 — `reraRegistrationStatus`**

- Question: "Is this project registered with RERA?"
- showWhen: `propertyAreaType == "PLANNED_AUTHORITY" AND documentationReadiness != "" AND PropertyStage == "Under Construction"`
- Options: `YES` / `NO` / `EXEMPT` / `UNKNOWN`

### Questions Visible Per Area Type (Legal Verification)

| Question                    | PLANNED | CONVERTED | OLD_MUNI | LOCAL | UNKNOWN |
| --------------------------- | :-----: | :-------: | :------: | :---: | :-----: |
| Q1 (docs readiness variant) |    ✓    |     ✓     |    ✓     |   ✓   |    ✓    |
| Q2 (dispute status)         |    ✓    |     ✓     |    ✓     |   ✓   |    ✓    |
| Q3 (NOC from prev lender)   |   BT    |    BT     |    BT    |  BT   |   BT    |
| Q4 (title chain)            |    ✓    |     ✓     |    —     |   —   |    ✓    |
| Q5 (encumbrance cert)       |    ✓    |     ✓     |    ✓     |   —   |    ✓    |
| Q6 (succession status)      |    —    |     —     |    ✓     |   —   |    —    |
| Q7 (revenue mutation)       |    —    |     —     |    —     |   ✓   |    —    |
| Q8 (RERA registration)      |   UC    |     —     |    —     |   —   |    —    |

`UC` = Under Construction only | `BT` = Balance Transfer only

---

## Implementation

### Phase 1: Schema + Types (Lowest Risk)

**Files:**
| File | Change |
|------|--------|
| `src/lib/config/homeLoanSchemaV2.json` | Replace Q1 with 5 variants, area-gate Q2-Q4, add Q5-Q11 to Property Condition. Replace Legal Q1 with 5 variants, add Q4-Q8. |
| `src/lib/server/formEngine/schemas/homeLoanSchemaV2.json` | Mirror — must be atomically identical |
| `src/lib/utils/payloadBuilder/types.ts` | Add 12 new optional fields to `LoanTransactionPayload` |
| `src/lib/types/casePayload.ts` | Add fields to `CasePropertyLegal` interface |
| `src/lib/ruleEngine/ruleValidator.ts` | Add 12 new keys to `LOAN_TRANSACTION_KEYS` |

**New fields in `LoanTransactionPayload`:**

```typescript
// Property Condition — area-specific
naConversionStatus?: 'REGISTERED' | 'RECEIVED_NOT_REGISTERED' | 'PENDING' | 'NOT_APPLIED' | 'UNKNOWN';
zoneClassification?: 'RESIDENTIAL' | 'MIXED_USE' | 'NON_RESIDENTIAL' | 'UNKNOWN';
municipalTaxStatus?: 'PAID_REGULAR' | 'PAID_IRREGULAR' | 'NO_RECORDS' | 'UNKNOWN';
unauthorizedAdditions?: 'NONE' | 'MINOR' | 'MAJOR' | 'UNKNOWN';
revenueRecordStatus?: 'AVAILABLE_CURRENT' | 'AVAILABLE_OUTDATED' | 'NOT_AVAILABLE' | 'UNKNOWN';
colonyRegularizationStatus?: 'REGULARIZED' | 'PENDING' | 'NOT_REGULARIZED' | 'UNKNOWN';
gramPanchayatPermission?: 'YES' | 'NO' | 'N/A' | 'UNKNOWN';

// Legal Verification — area-specific
titleChainStatus?: 'CLEAR' | 'PARTIAL_GAPS' | 'MAJOR_GAPS' | 'NOT_CHECKED';
encumbranceCertStatus?: 'CLEAR' | 'HAS_CHARGES' | 'NOT_OBTAINED' | 'UNKNOWN';
successionStatus?: 'NOT_APPLICABLE' | 'SUCCESSION_DONE' | 'PARTITION_DONE' | 'PENDING' | 'UNKNOWN';
revenueRecordMutation?: 'DONE' | 'PENDING' | 'NOT_DONE' | 'UNKNOWN';
reraRegistrationStatus?: 'YES' | 'NO' | 'EXEMPT' | 'UNKNOWN';
```

**Verify:** `pnpm run check` (0 errors)

### Phase 2: Payload Builders + Enricher

**Files:**
| File | Change |
|------|--------|
| `src/lib/utils/payloadBuilder/loanTransaction.ts` | Extract 12 new contextKeys from `loanAnswers` |
| `src/lib/utils/casePayloadBuilder.ts` | Extract to `CasePropertyLegal` |
| `src/lib/ruleEngine/payloadEnricher.ts` | Add area-specific boolean derivations |

**PayloadEnricher new derivations** (after existing line 270):
| Derived Field | Source | Rule |
|--------------|--------|------|
| `naConversionComplete` | `naConversionStatus` | `== 'REGISTERED'` → Yes |
| `isResidentialZone` | `zoneClassification` | `== 'RESIDENTIAL'` → Yes |
| `hasMunicipalTaxRecords` | `municipalTaxStatus` | `in ['PAID_REGULAR', 'PAID_IRREGULAR']` → Yes |
| `hasUnauthorizedConstruction` | `unauthorizedAdditions` | `in ['MINOR', 'MAJOR']` → Yes |
| `hasRevenueRecords` | `revenueRecordStatus` | `in ['AVAILABLE_CURRENT', 'AVAILABLE_OUTDATED']` → Yes |
| `isColonyRegularized` | `colonyRegularizationStatus` | `== 'REGULARIZED'` → Yes |
| `encumbranceCertificateVerified` | `encumbranceCertStatus` | `== 'CLEAR'` → Yes |
| `ownershipChainComplete` | `titleChainStatus` | `== 'CLEAR'` → Yes |

**Existing mapping preserved (lines 265-270):**

```typescript
propertyComplianceStatus → approvedByAuthority + asPerMap  // UNCHANGED
```

**Verify:** `pnpm run check` + `pnpm run test:unit`

### Phase 3: Test Fixtures + Flow Maps

**Files:**
| File | Change |
|------|--------|
| `src/lib/testing/homeLoan/pageFlowMap.ts` | Update question registry for both pages |
| `src/lib/testing/scenarios/formPathScenarios.ts` | Add area-specific fields to scenarios |
| `src/lib/testing/generators/archetypes/archetypeHelpers.ts` | Generate area-specific fields |
| `src/lib/testing/generators/profileGenerator.ts` | Generate area-specific field values |
| `src/lib/testing/__tests__/questionVisibility.test.ts` | Add area-gated visibility tests |
| `src/lib/testing/__tests__/nextButtonLogic.test.ts` | Update Q1 reference |

**Verify:** `pnpm run test:unit` (all pass)

### Phase 4: Bug Fix + Polish

- Fix `downpaymentPercentage()` V1→V2 keys in `home-loan/+page.svelte` (lines ~765-805)
- Update `src/lib/testing/e2e/homeLoan.setup.ts` for area-specific fills
- Manual smoke test each area type in form

**Verify:** `pnpm run check` + `pnpm run test:unit` + `pnpm run test:e2e`

---

## Backward Compatibility

1. **`propertyComplianceStatus` contextKey preserved** — 5 variants all write same key, same 3 values. All 50+ test references survive unchanged.
2. **`payloadEnricher.ts` mapping unchanged** — `propertyComplianceStatus → approvedByAuthority + asPerMap` still works.
3. **`documentationReadiness` contextKey preserved** — 5 variants, same 4 option values.
4. **No bank rules use these fields** — Validated in `ruleValidator.ts` but not referenced in `realBankRuleDocs.ts`. No rule breakage possible.
5. **New questions are additive** — All new contextKeys are optional fields; old payloads without them still work.

---

## Also Fix: downpaymentPercentage() V1→V2 Key Mismatch

**File:** `src/routes/(app)/form/home-loan/+page.svelte` (lines ~765-805)
**Problem:** Uses old V1 keys (`propertyCost`, `downPayment`) instead of V2 keys (`propCost`, `deposit`). Display-only bug — shows 0% or NaN.
**Fix:** Update to V2 keys, fallback to V1 for backward compat.

---

## Cross-References

| Resource                          | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `CLAUDE.md`                       | Project conventions, key files, architecture decisions      |
| `MEMORY.md`                       | Session memory, next-session context, critical bug patterns |
| `DEVELOPMENT-PLAN.md`             | Living plan, task status, methodology                       |
| `CHANGELOG.md`                    | Per-session work log (append-only)                          |
| `HOME-LOAN-FORM-REDESIGN-SPEC.md` | Original redesign spec (Phases 1-5)                         |
| `ARCHITECTURE.md`                 | System deep-dive (rule engine, form engine, schema pattern) |
