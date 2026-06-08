# DigitalDSA — Form Logic Audit Report

> **Generated**: 2026-03-11 | **Session**: 19 | **Scope**: All 6 loan types + applicant schemas + income profiles + CIBIL
> **Method**: Automated cross-schema analysis of showWhen conditions, option visibility, and domain logic
> **Findings**: 48 issues (9 Tier-1 broken code, 12 Tier-2 wrong questions, 14 Tier-3 missing logic, 13 Tier-4 quality)

---

## How to Use This Document

1. **Implementers**: Work top-down by tier. Tier 1 fixes are safe one-liners. Tier 2 needs schema + component changes. Tier 3 is conditional logic additions. Tier 4 is polish.
2. **QA**: Use the "Test Scenario" for each issue to verify the fix.
3. **Product**: Tier 3 issues were flagged during customer testing — prioritize these for user trust.
4. **Schema sync**: ALL schema changes must update BOTH `src/lib/config/` AND `src/lib/server/formEngine/schemas/` atomically.

---

## Summary by Tier

| Tier                                   | Count | Nature                                                                   | Est. Effort |
| -------------------------------------- | ----- | ------------------------------------------------------------------------ | ----------- |
| **Tier 1** — Broken/Dead Code          | 9     | Silent data loss, questions never appear, dead branches                  | 1-2 days    |
| **Tier 2** — Wrong Questions Shown     | 12    | Confusing/incorrect questions for certain answer combinations            | 2-3 days    |
| **Tier 3** — Missing Conditional Logic | 14    | Obvious answers not auto-derived, age gates missing, redundant questions | 3-4 days    |
| **Tier 4** — Quality & Enhancements    | 13    | Naming, deduplication, range adjustments, consistency                    | Ongoing     |

---

## TIER 1: BROKEN/DEAD CODE

These are **silent failures** — data is never collected, questions never appear, or incorrect data is silently stored.

---

### T1-01: `projectName` Never Shows (Wrong Field Name)

**File**: `src/lib/config/homeLoanSchemaV2.json` — page `propertyCharacter_homeLoan`
**Key**: `projectName`
**Loan**: Home Loan

**Problem**: showWhen checks `constructionType == "Under Construction"`, but `constructionType` only stores `"House"`, `"Flat"`, or `"Floor"`. The correct field is `PropertyStage`.

**Current showWhen**:

```json
{ "==": [{ "var": "constructionType" }, "Under Construction"] }
```

**Fix**:

```json
{ "==": [{ "var": "PropertyStage" }, "Under Construction"] }
```

**Impact**: Project/society name is NEVER collected for any under-construction flat.
**Test**: Select Flat + Under Construction → verify `projectName` field now appears.

---

### T1-02: `sellerOwnershipType` Tautological ShowWhen

**File**: `src/lib/config/homeLoanSchemaV2.json` — page `sellerTransaction_homeLoan`
**Key**: `sellerOwnershipType`
**Loan**: Home Loan

**Problem**: showWhen is `(purchaseType != resale_endorsement) OR (purchaseType == resale_endorsement)` = always true. Shows unconditionally. For endorsement, options like "Inherited", "Gift deed" don't apply to builders.

**Current showWhen**:

```json
{
	"or": [
		{ "!=": [{ "var": "purchaseType" }, "resale_endorsement"] },
		{ "==": [{ "var": "purchaseType" }, "resale_endorsement"] }
	]
}
```

**Fix**: Restrict to `resale_normal` only (endorsement has builder as seller):

```json
{ "==": [{ "var": "purchaseType" }, "resale_normal"] }
```

**Impact**: Endorsement buyers (builder-to-buyer transfer) see irrelevant ownership type options.
**Test**: Select resale_endorsement → verify `sellerOwnershipType` is hidden.

---

### T1-03: Authority Page Uses `bindsTo` Instead of `bindsTo_template`

**File**: `src/lib/config/homeLoanSchemaV2.json` — page `sellerTransaction_authority_homeLoan`
**Keys**: `authorityName`, `allotmentLetterStatus`, `allotmentDate`, `authorityPaymentStatus`, `possessionCertificateStatus`, `authorityDuesStatus`
**Loan**: Home Loan

**Problem**: All 6 questions use `"bindsTo": "..."` instead of `"bindsTo_template": "..."`. The form engine's `resolveBindsTo()` processes `bindsTo_template`. If no fallback exists for bare `bindsTo`, authority purchase data is silently dropped.

**Fix**: Replace `"bindsTo"` with `"bindsTo_template"` on all 6 questions.

**Impact**: All authority purchase data (DDA, MHADA, CIDCO) potentially not persisted.
**Test**: Submit authority purchase → verify answers stored at correct bindsTo keys.

---

### T1-04: `Self-employed(Professional)` Option Always Hidden

**File**: `src/lib/config/applicantQuestion.json` — `q_employmentType`
**Key**: Employment type option for SE Professional
**Loan**: Home Loan (secured)

**Problem**: showWhen compares `ApplicantIsNRI == ["Couple", "Family"]` — string vs array, always false. The intent was `tellUsApplying in ["Couple", "Family"]`.

**Current showWhen**:

```json
{ "==": [{ "var": "ApplicantIsNRI" }, ["Couple", "Family"]] }
```

**Fix**:

```json
{ "in": [{ "var": "tellUsApplying" }, ["Couple", "Family"]] }
```

**Impact**: No CA, Doctor, Lawyer, or Architect can select their employment type on Home Loan form.
**Test**: Home Loan Couple flow → verify Self-employed(Professional) appears.

---

### T1-05: `business_3plus_years` Option Referenced But Never Defined

**Files**: `businessOtherQuestions.json`, `professionalQuestion.json`, `applicantQuestion.json`
**Key**: `businessActivityDetails.business_3plus_years`
**Loan**: All self-employed (Business, Professional, Home Loan SE)

**Problem**: 6+ showWhen conditions reference this key, but no option with `value: "business_3plus_years"` exists in any `businessActivityDetails` multi-select. Result:

- `profit_last_3_years` (requires `== true`) → **permanently hidden**
- `profit_since_starting` (requires `== false`) → always shows (undefined == false)

**Fix**: Add missing option to `businessActivityDetails` multi-select:

```json
{
	"label": "Business / practice established for more than 3 years",
	"value": "business_3plus_years"
}
```

**Impact**: 3-year profitability signal is NEVER captured for any self-employed applicant.
**Test**: Self-employed Business → check `business_3plus_years` option appears → select it → verify `profit_last_3_years` becomes visible.

---

### T1-06: Business Loan Obligations Permanently Suppressed

**File**: `src/lib/config/businessOtherQuestions.json` — `q_Obligation`
**Key**: `ObligationsRunning`
**Loan**: Business Loan

**Problem**: showWhen includes `{ "!=": ["loanName", "Business Loan"] }` — permanently false for Business Loans. Running loan obligations are NEVER collected.

**Fix**: Remove the `loanName != "Business Loan"` condition.

**Impact**: FOIR (Fixed Obligation to Income Ratio) calculation is impossible for every Business Loan submission. The rule engine gets zero obligation data.
**Test**: Business Loan → reach obligations page → verify question appears.

---

### T1-07: Plot Loan `==` With Array Literals (Likely Dead Branches)

**File**: `src/lib/config/plot-loan-schema.json`
**Keys**: `purchaseType` and multiple others
**Loan**: Plot Loan

**Problem**: showWhen uses `{ "==": [{ "var": "loanType" }, ["Plot Loan Only"]] }` — comparing string to array. Standard JSON-Logic returns false for scalar-vs-array equality. Multiple questions may be permanently hidden.

**Fix**: Replace `==` with `in` for all array comparisons:

```json
{ "in": [{ "var": "loanType" }, ["Plot Loan Only", "Plot & Construction Loan"]] }
```

**Impact**: Multiple plot loan questions may be dead branches depending on JSON-Logic implementation.
**Test**: Plot Loan Only → verify `purchaseType` and dependent questions appear correctly.

---

### T1-08: BT Path Blocked for OC/CC and Municipal Approval

**File**: `src/lib/config/homeLoanSchemaV2.json` — page `propertyCondition_homeLoan`
**Keys**: `ocCcAvailable`, `municipalApproval`
**Loan**: Home Loan (Balance Transfer)

**Problem**: Both questions have double `PropertyStage == "Ready To Move"` AND-wrap. The outer AND eliminates the BT path even though inner `or` was intended to allow `isRegistryDone == "Yes"` as an alternate trigger.

**Fix**: Remove the redundant outer AND condition. Keep only the inner `or`:

```json
{
	"or": [
		{ "==": [{ "var": "PropertyStage" }, "Ready To Move"] },
		{
			"and": [
				{
					"in": [{ "var": "loanType" }, ["Balance Transfer Only", "Balance Transfer With Top-up"]]
				},
				{ "==": [{ "var": "isRegistryDone" }, "Yes"] }
			]
		}
	]
}
```

**Impact**: BT cases with registered properties are NEVER asked about OC/CC or municipal approval.
**Test**: BT + isRegistryDone = Yes → verify both questions appear.

---

### T1-09: Invalid CIBIL Scores Accepted for Homemaker/Unemployed

**File**: `src/lib/config/unemployedPerson.json` — `q_creditScore`
**Key**: `creditScore`
**Loan**: All (homemaker/unemployed co-applicants)

**Problem**: Minimum validation is `< 0` instead of `< 300`. Scores 1-299 are accepted — these are impossible (CIBIL only issues 300-900, -1, or 0).

**Fix**: Change to `< 300` with message "Credit Score must be at least 300".

**Impact**: Invalid CIBIL scores silently stored. Rule engine may calculate incorrect eligibility.
**Test**: Enter credit score 150 for homemaker → verify validation error appears.

---

## TIER 2: WRONG QUESTIONS SHOWN

These show questions that are **irrelevant or confusing** given prior answers.

---

### T2-01: RERA Question for Authority Purchases

**File**: `homeLoanSchemaV2.json` — `propertyCondition_homeLoan`
**Key**: `reraRegistrationStatus`
**Loan**: Home Loan

**Problem**: Shows for `propertyAreaType == "PLANNED_AUTHORITY"` without checking `purchaseType`. DDA/MHADA/CIDCO properties don't need RERA. No correct answer exists for authority buyers.

**Fix**: Add `{ "!=": [{ "var": "purchaseType" }, "direct_from_authority"] }` to showWhen.

---

### T2-02: Builder Track Record + Approvals for Authority Under-Construction

**File**: `homeLoanSchemaV2.json` — `propertyCondition_homeLoan`
**Keys**: `builderTrackRecord`, `projectApprovals`
**Loan**: Home Loan

**Problem**: Shows when `PropertyStage == "Under Construction"` without `purchaseType` check. Authority under-construction (DDA Awas, PMAY) has no "builder" to rate.

**Fix**: Add `{ "!=": [{ "var": "purchaseType" }, "direct_from_authority"] }`.

---

### T2-03: Builder Demand for Pure Resale

**File**: `homeLoanSchemaV2.json` — `sellerTransaction_homeLoan`
**Key**: `isAnyBuilderDemand`
**Loan**: Home Loan

**Problem**: Shows for `resale_normal` where there is no builder. Only relevant for `direct_from_builder` and `resale_endorsement`.

**Fix**:

```json
{ "in": [{ "var": "purchaseType" }, ["direct_from_builder", "resale_endorsement"]] }
```

---

### T2-04: Seller Loan + Acquisition Method for Endorsement

**File**: `homeLoanSchemaV2.json` — `sellerTransaction_homeLoan`
**Keys**: `sellerOnLoan`, `propertyAcquisitionMethod`
**Loan**: Home Loan

**Problem**: Shows for `resale_endorsement` where seller = builder. Options like "Inherited", "Gift deed" don't apply to builders. Builder doesn't have "a home loan" on a flat they're endorsing.

**Fix**: Add `{ "!=": [{ "var": "purchaseType" }, "resale_endorsement"] }`.

---

### T2-05: Duplicate OC/CC for Authority Purchases

**File**: `homeLoanSchemaV2.json` — `propertyCondition_homeLoan`
**Keys**: `ocCcAvailable`, `isPossessionOfferedByAuthority`
**Loan**: Home Loan

**Problem**: Authority buyers see BOTH "Has building received OC/CC?" AND "Has authority granted possession (OC/CC issued)?" — same question twice.

**Fix**: Add `{ "!=": [{ "var": "purchaseType" }, "direct_from_authority"] }` to `ocCcAvailable`. Also fix duplicate `"direct_from_authority"` entry in `isPossessionOfferedByAuthority`'s `in` array.

---

### T2-06: Salary Bank Account Required for SE Personal Loan

**File**: `personal-loan-schema.json` — `locationPage`
**Key**: `salariedBankName`
**Loan**: Personal Loan

**Problem**: Required for ALL personal loan applicants including self-employed. SE applicants don't have a salary account. Blocks form progression.

**Fix**: Add `{ "in": [{ "var": "employmentType" }, ["Salaried(Private)", "Salaried(Government)"]] }` to showWhen. Add separate `banksOfCurrentAccount` for SE applicants.

---

### T2-07: Current Account Required for Salaried Professionals

**File**: `professional-loan-schema.json` — `locationPage`
**Key**: `banksOfCurrentAccount`
**Loan**: Professional Loan

**Problem**: Required for ALL professional loan applicants. Salaried professionals (doctor at hospital, CA at firm) don't have a current account.

**Fix**: Add `{ "==": [{ "var": "employmentType" }, "Self-employed(Professional)"] }` to showWhen.

---

### T2-08: "Why Low CIBIL?" for 750+ Scores

**Files**: `salariedQuestion.json`, `pensionerPerson.json`, `professionalQuestion.json`, `businessOtherQuestions.json`
**Key**: `whyPrimaryLowCredit`
**Loan**: All

**Problem**: showWhen triggers for ALL valid scores (300-900). An 800-score applicant is asked "What factors contributed to this CIBIL score?" — implies their score is problematic.

**Fix**: Change upper bound to 699:

```json
{ "and": [{ ">=": ["creditScore", 300] }, { "<=": ["creditScore", 699] }] }
```

---

### T2-09: Form 16 Label for Government Employees

**File**: `salariedQuestion.json`
**Key**: `govt_salary_slip_received`
**Loan**: All

**Problem**: Label says "Receives Form 16 regularly" but government employees receive DDO salary slips, not Form 16 (which is a TDS certificate).

**Fix**: Change label to "Receives salary slip / DDO certificate regularly".

---

### T2-10: `enquiryReason` Stuck for 1-2 Enquiries

**File**: `src/lib/components/CreditScoreSection.svelte`
**Key**: `enquiryReason`, `showEnquiryReason`
**Loan**: All

**Problem**: When DSA selects "1-2 enquiries", code clears `enquiryReason` but `showEnquiryReason` still returns true. Required field is shown but empty — form is stuck.

**Fix**: Add `'1_2'` to suppression in `showEnquiryReason`:

```typescript
let showEnquiryReason = $derived(
	recentEnquiryCount !== 'none' && recentEnquiryCount !== '1_2' && recentEnquiryCount !== ''
);
```

---

### T2-11: Financial Table Shown Without ITR

**File**: `professionalQuestion.json` — `q_financialsTable`
**Key**: `financialsTable`
**Loan**: Professional Loan

**Problem**: 3-year profit/depreciation/receipts table shows when `businessActivityDetailsValidate == true`, even if `itr_filed_regularly == false`. Nonsensical to fill financials without tax records.

**Fix**: Add `{ "==": ["businessActivityDetails.itr_filed_regularly", true] }` to showWhen.

---

### T2-12: Business Loan Location Binds to Wrong Keys

**File**: `businessLoanSchema.json` — `locationPage`
**Keys**: `residenceStateName`, `residenceCityName`, `residencePincode`
**Loan**: Business Loan

**Problem**: Labels say "Business Location" but bindsTo keys are `residenceStateName/City/Pincode`. Professional Loan correctly uses `businessStateName/City/Pincode`. Geographic lender matching is broken.

**Fix**: Change bindsTo_template to `businessStateName`, `businessCityName`, `businessPincode`. Update BOTH schema locations atomically.

---

## TIER 3: MISSING CONDITIONAL LOGIC

Obvious answers not auto-derived, age gates missing, contradictory combinations allowed.

---

### T3-01: MNC/Listed Employees — "Salary Credited to Bank" Redundant

**File**: `salariedQuestion.json`
**Key**: `salary_credited_regularly`
**Loan**: All

**Problem**: MNC/Listed companies are legally mandated to credit salary to bank. DSA accidentally leaving this unchecked → false rejection.

**Fix**: When `works_for_reputed_org = true`, auto-set `salary_credited_regularly = true` or hide the question:

```json
"showWhen": {
  "and": [
    { "==": ["employmentType", "Salaried(Private)"] },
    { "==": ["salariedActivityDetails.works_for_reputed_org", false] }
  ]
}
```

---

### T3-02: MNC Employees Lose "100+ Employees" Signal

**File**: `salariedQuestion.json`
**Key**: `company_100plus_employees`
**Loan**: All

**Problem**: Hidden when `works_for_reputed_org = true`, but MNCs definitionally have 100+ employees. The payload loses this signal. Rule engine may undercount.

**Fix**: Auto-derive `company_100plus_employees = true` in `payloadEnricher.ts` when `works_for_reputed_org = true`.

---

### T3-03: Employment Tenure Hidden When PF Not Deducted

**File**: `salariedQuestion.json`
**Key**: `employed_2plus_years`
**Loan**: All

**Problem**: Gated on `provides_staff_benefits == true` (PF deduction). IT/consulting/senior employees at firms without PF registration lose their tenure signal — one of the most important credit signals.

**Fix**: Remove PF dependency:

```json
"showWhen": { "==": ["employmentType", "Salaried(Private)"] }
```

---

### T3-04: Probation Question Hidden for 2+ Year Tenure

**File**: `salariedQuestion.json`
**Key**: `govt_probation_completed`
**Loan**: All (Government)

**Problem**: Requires `govt_more_than_2_years == false`. State government probation can be 3 years. A 3-year probationer with `govt_more_than_2_years = true` never sees the probation question.

**Fix**: Keep only `govt_position_permanent == false`:

```json
"showWhen": {
  "and": [
    { "==": ["employmentType", "Salaried(Government)"] },
    { "==": ["salariedActivityDetails.govt_position_permanent", false] }
  ]
}
```

---

### T3-05: "No Disciplinary Actions" Only Post-Probation

**File**: `salariedQuestion.json`
**Key**: `govt_no_disciplinary_action`
**Loan**: All (Government)

**Problem**: Gated on `govt_probation_completed == true`. Permanent confirmed government employees (most creditworthy) NEVER see this question. Rule engine gets no disciplinary status for them.

**Fix**: Show for ALL government employees:

```json
"showWhen": { "==": ["employmentType", "Salaried(Government)"] }
```

---

### T3-06: Pension Available for 18-Year-Olds

**File**: `src/lib/config/incomeProfiles/profileCards.ts`
**Key**: Pension profile card
**Loan**: All

**Problem**: No minimum age guard. Any 18-year-old can select Pension income. Minimum retirement age in India is 58 (state govt) to 60 (central govt).

**Fix**: Add age gate:

```typescript
showWhen: {
	and: [{ '==': ['isApplicantNRI', 'No'] }, { '>=': ['selectedAge', 45] }];
}
```

---

### T3-07: Government Options Bleed Into Private Sector

**File**: `salariedQuestion.json`
**Keys**: `govt_itr_filed`, `govt_other_income_source`
**Loan**: All

**Problem**: No showWhen for employment type — visible for both Private and Government employees.

**Fix**: Add `{ "==": ["employmentType", "Salaried(Government)"] }` to both options.

---

### T3-08: Professional Practice Card Bypasses Education Gate

**File**: `src/lib/config/incomeProfiles/profileCards.ts`
**Key**: `professional_practice` card
**Loan**: All

**Problem**: `loanCategory == "professional"` bypasses the `education == "professional"` gate. A trader taking a professional loan sees incorrect income profile.

**Fix**: Remove `loanCategory` bypass. Keep only `education == "professional"` gate.

---

### T3-09: Defence Employee Gated on "Central Govt" Checkbox

**File**: `salariedQuestion.json`
**Key**: `govt_defense_employee`
**Loan**: All (Government)

**Problem**: State paramilitary (CRPF, BSF, state armed police) employees who don't check "Central Govt" can never identify as defence.

**Fix**: Show for ALL government employees:

```json
"showWhen": { "==": ["employmentType", "Salaried(Government)"] }
```

---

### T3-10: Age Dropdown Caps at 50

**File**: `applicantQuestion.json`
**Key**: `selectedAge`
**Loan**: Home Loan (co-applicants)

**Problem**: Parent co-applicants (55-75 years) can't be entered. The `q_age` field in `applicantBasicDetailsSecuredLoans.json` allows up to 80 — inconsistent.

**Fix**: Extend options array to at least age 75.

---

### T3-11: Family Pension + "Continues Beyond 75" Contradicts

**File**: `pensionerPerson.json`
**Key**: `pension_continues_75plus`
**Loan**: All (Pensioner)

**Problem**: Can be combined with `family_pension`. Family pensions in India typically end at 75 (DOP&PW rules).

**Fix**: Add `{ "==": ["pensionActivityDetails.family_pension", false] }` to showWhen.

---

### T3-12: Income Documentation Only Asks Salaried Documents

**File**: `personal-loan-schema.json` — `collateral_free_selectionPage`
**Key**: `incomeDocAvailable`
**Loan**: Personal Loan

**Problem**: Only offers Payslip/Form 16 options. SE applicants with ITR have no relevant option. "Neither available" misleadingly signals zero documentation.

**Fix**: Add "ITR available (self-employed)" and "Bank statement available" options. Or gate entire question on salaried employment type.

---

### T3-13: Business Loan Entity Type Duplication

**File**: `applicantBasicDetailsUnsecuredLoans.json`
**Keys**: `businessEntityType` (form-level) + `applicantType` (per-applicant)
**Loan**: Business Loan

**Problem**: Business Loan asks both `businessEntityType` AND per-applicant `applicantType: Individual/Company`. Creates redundant and potentially conflicting entity data.

**Fix**: Suppress `applicantType` for business loans: `{ "!=": ["loanCategory", "business"] }`.

---

### T3-14: `holds_permanent_position` (Private) Has No Employment Type Gate

**File**: `salariedQuestion.json`
**Key**: `holds_permanent_position`
**Loan**: All

**Problem**: No showWhen — appears for government employees too, duplicating `govt_position_permanent`.

**Fix**: Add `{ "==": ["employmentType", "Salaried(Private)"] }`.

---

## TIER 4: QUALITY & ENHANCEMENTS

---

### T4-01: Redundant Pension Questions

**File**: `pensionerPerson.json` | **Keys**: `pension_credited_monthly`, `pension_regular`
Merge into single: "Pension is credited regularly to bank account (without delay)".

### T4-02: Pension Loan Deduction vs Obligations Contradiction

**File**: `pensionerPerson.json` | **Key**: `no_pension_loan_deduction`
Gate on `ObligationsRunning == "No"` to prevent contradiction.

### T4-03: Spouse Pension No Marital Status Guard

**File**: `pensionerPerson.json` | **Key**: `spouse_pension_applicable`
Add marital status check or make optional.

### T4-04: Education Captured Twice

**File**: `applicantQuestion.json` | **Keys**: `singleWomenQualification` + `has_professional_qualification`
Consolidate into single education data point.

### T4-05: Key Naming — `singleWomenHusbandCibil`

**File**: `applicantQuestion.json` | Applies to married women, not single women.
Rename to `marriedWomanHusbandCibil`.

### T4-06: Only 4 Professions Listed

**File**: `professionalQuestion.json`, `applicantQuestion.json` | **Key**: `professionType`
Add CS, Dentist, CMA, Engineer, Physiotherapist, "Other Licensed Professional".

### T4-07: ₹20,000 Minimum Blocks Lower-Grade Govt Employees

**File**: `salariedQuestion.json` | **Key**: `grossIncome`
Lower to ₹15,000 for Government employees (Level 1 = ₹18,000 basic, some states lower).

### T4-08: ₹20,000 Pension Minimum Blocks Small Pension Holders

**File**: `pensionerPerson.json` | **Key**: `netIncome`
Lower to ₹10,000 for pensioner co-applicants on secured loans.

### T4-09: `selectedAge` Starts at 19 Instead of 18

**File**: `applicantQuestion.json` | Start dropdown at 18.

### T4-10: Age Gate Inconsistency — Business (>23) vs Professional (>25)

**Files**: `businessOtherQuestions.json` vs `professionalQuestion.json`
Align both to >=25 or document rationale for difference.

### T4-11: LAP Legal Questions Unconditional + Encumbrance Duplication

**File**: `LAP-schema.json` — `propertyLegal_LAP`
4 questions have no showWhen. `encumbranceCertificateVerified` duplicates `existingEncumbrance`. Add gates, merge duplicate.

### T4-12: Plot Loan `propertyAge` Only for Resale

**File**: `plot-loan-schema.json` | **Key**: `propertyAge`
Show for all purchase types (authority plots can be decades old).

### T4-13: Government Pension Eligible — No Age/NPS Guard

**File**: `salariedQuestion.json` | **Key**: `govt_pension_eligible`
Add `age >= 45` and clarify "under old pension scheme (OPS), not NPS".

---

## ALSO IDENTIFIED: Infrastructure Bug

### AgreeModal Not in Form Layout

**File**: `src/routes/(app)/form/+layout.svelte`
**Component**: `AgreeModal.svelte`

**Problem**: `AgreeModal` is only rendered in `home-loan/+page.svelte:2285`. The FEMA notice (foreign company → India reset) fires via `dialogState.openAgreeModal()` in `QuestionRenderer.svelte`, but for LAP, Plot, and all unsecured loan forms, no `AgreeModal` is mounted to render it.

**Fix**: Move `<AgreeModal />` from `home-loan/+page.svelte` to `src/routes/(app)/form/+layout.svelte`.

---

## ALSO IDENTIFIED: Feature Requests (From Customer Testing)

### FR-01: NRI City Question — GPA Perspective

When asking city for NRI applicants, mention it's from the perspective of General Power of Attorney (GPA). NRIs need to know they're being asked about the Indian city where the GPA will be executed, not their overseas city.

### FR-02: Government/MNC — Skip Obvious Questions

Government and MNC employees should not be asked questions where the answer is obvious:

- "Is salary credited to bank account?" → Always yes for Government/MNC
- "PF deducted?" → Always yes for Government
- If on probation → Cannot have been at same company for 5+ years

---

## Implementation Order (Recommended)

### Batch 1 — Broken Code (Tier 1) — 1-2 days

Fix T1-01 through T1-09. These are mostly one-line fixes in JSON schemas. Safe, no regression risk.

### Batch 2 — Wrong Questions (Tier 2 critical subset) — 1-2 days

Fix T2-01 through T2-05 (authority/builder), T2-06, T2-07, T2-08, T2-10, T2-12. These are showWhen additions.

### Batch 3 — Missing Logic (Tier 3 customer-facing) — 2-3 days

Fix T3-01 through T3-06 (the issues flagged during customer testing). Also AgreeModal layout fix.

### Batch 4 — Remaining Tier 2/3 + Tier 4 — 2-3 days

Polish, deduplication, naming, range adjustments.

---

## Cross-References

- **Existing remediation plan**: `docs/INTEGRATED-REMEDIATION-PLAN.md` (22 schema issues from Session 12 audit — some overlap with T1-02, T1-08)
- **Property compliance spec**: `docs/specs/AREA-SPECIFIC-COMPLIANCE-REDESIGN.md`
- **Home loan redesign spec**: `docs/specs/HOME-LOAN-FORM-REDESIGN-SPEC.md`
- **Payload documentation**: `docs/PAYLOAD_DOCUMENTATION.md`
