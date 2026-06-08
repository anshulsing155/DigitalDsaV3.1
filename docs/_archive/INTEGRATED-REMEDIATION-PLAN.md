# DigitalDSA HomeLoan Schema — Integrated Remediation Plan

**Version 2.0** | Updated: 2026-03-11 (Session 19 — expanded with cross-schema audit)
**Scope:** 22 original schema issues + 8 domain logic gaps + **48 new cross-schema findings** from Form Logic Audit
**Audience:** Architects, backend engineers, QA leads

---

## Executive Summary

The `homeLoanSchemaV2.json` schema is structurally sound but carries **22 technical + semantic issues** across 4 severity tiers:

| Tier              | Count | Impact                                           | Timeline                        |
| ----------------- | ----- | ------------------------------------------------ | ------------------------------- |
| **P0** (Critical) | 6     | Data corruption, silent failures, dead code      | **1-2 days**                    |
| **P1** (High)     | 4     | Latent bugs under specific flows, data integrity | **3-5 days**                    |
| **P2** (Medium)   | 7     | Redundancy, maintenance burden                   | **1-2 weeks** (refactor sprint) |
| **P3** (Low)      | 5     | Cosmetic, naming, tech debt                      | **Ongoing**                     |

**Session 19 Update**: A comprehensive cross-schema Form Logic Audit added **48 new issues** across ALL 6 loan types + applicant schemas + income profiles + CIBIL. See `docs/FORM-LOGIC-AUDIT.md` for the full report.

| Tier                                   | Count | Nature                                                  | Est. Effort           |
| -------------------------------------- | ----- | ------------------------------------------------------- | --------------------- |
| **Tier 1** — Broken/Dead Code          | 9     | Silent data loss, dead branches, wrong comparisons      | **DONE** (`b6d17e8b`) |
| **Tier 2** — Wrong Questions Shown     | 12    | Confusing/incorrect questions for certain answer combos | **DONE** (`9ba32f3a`) |
| **Tier 3** — Missing Conditional Logic | 14    | Obvious answers not auto-derived, age gates missing     | **DONE** (`a35a868c`) |
| **Tier 4** — Quality & Enhancements    | 13    | Naming, dedup, range adjustments, consistency           | **DONE** (`cc59f6d7`) |

**Overlap with original plan**: T1-02 = P0-2 (tautological showWhen). T1-08 = P2-9 (redundant PropertyStage check). New issues also expand the domain logic fixes (D1-D5) with additional authority/builder/endorsement gating requirements.

**Key Risks Eliminated:**

- ❌ Orphaned enum values causing dead logic branches
- ❌ Typos in contextKeys preventing downstream rule engine access
- ❌ Tautological conditions that mask broken filtering
- ❌ Redundant questions causing data overwrites
- ❌ Page ordering that references undefined values
- ❌ Domain-inappropriate questions for specific flows

**This plan is:**

- ✅ **No-code-breaking** — All changes maintain backward compatibility or are isolated to schema/types layers
- ✅ **Modular** — Organized by architectural layer (schema → types → validators → rule engine enrichment)
- ✅ **Atomic** — Each phase ships as a coherent unit with rollback capability
- ✅ **Testable** — Every fix has a dedicated test scenario
- ✅ **Parallelizable** — Where safe, tasks can run in parallel

---

## Part 1: Architecture Alignment

### Current Schema Architecture (Your System)

```
┌─────────────────────────────────────────────────────────────┐
│ Form Data Input (DSA fills form)                             │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ FormEngine (schema-driven evaluation)                        │
│ - Loads homeLoanSchemaV2.json                               │
│ - Evaluates showWhen conditions (JSON-Logic)                │
│ - Returns PageResponse with questions                       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Form Component Rendering                                    │
│ - Client matches pageId to rendered component               │
│ - Radio, text, date inputs bound to contextKey values       │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Payload Extraction (loanTransaction.ts)                     │
│ - Reads form values by contextKey                           │
│ - Maps to PayloadFormData types                             │
│ - Validates against ruleValidator.ts keys                   │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Rule Engine (evaluationEngine.ts)                           │
│ - Enriches payload with derivations                         │
│ - Evaluates 50+ bank policies                               │
│ - Returns eligibility + offer structure                     │
└──────────────────┬──────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ PDF Generation / Case Display                               │
└─────────────────────────────────────────────────────────────┘
```

### Impact Zones of Each Issue

| Layer                                      | P0 Issues    | P1 Issues                       | P2 Issues    | P3 Issues  |
| ------------------------------------------ | ------------ | ------------------------------- | ------------ | ---------- |
| **Schema** (showWhen, options, contextKey) | P0-1,2,3,5,6 | P1-1,3                          | P2-2,3,5,8,9 | P3-1,2,3,4 |
| **Types** (PayloadFormData, CasePayload)   | —            | P1-2 (derived)                  | —            | —          |
| **Validators** (ruleValidator.ts)          | P0-6         | P1-2 (must pair with area type) | —            | —          |
| **Rule Engine** (evaluationEngine.ts)      | —            | P1-1,2                          | —            | —          |
| **Renderers** (form components)            | P0-2,4       | —                               | P2-1         | P3-3       |

---

## Part 2: Detailed Issue Mapping & Fixes

### PHASE 1: Critical Fixes (P0) — 1-2 Days

#### P0-1: Dead Compliance Question for Converted Land

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~1402
**Problem:** `q1b_propertyComplianceStatus_converted` has `showWhen: { "==": [{ "var": "propertyAreaType" }, "PLACEHOLDER_REMOVED_FOR_Q6"] }` — impossible condition.

**Root Cause:** When Q6 (`naConversionStatus`) was added, the placeholder wasn't removed from Q1b's showWhen.

**Fix Strategy:**

1. Verify `q6_naConversionStatus` fully handles CONVERTED_RESIDENTIAL compliance
2. Delete `q1b_propertyComplianceStatus_converted` entirely
3. Update dependent questions: ensure any questions gated on `propertyComplianceStatus` don't depend on this deleted question

**Test Scenario:**

```
Loan Type: New Loan
propertyAreaType: CONVERTED_RESIDENTIAL
→ Verify: q6_naConversionStatus appears ✓
→ Verify: q1b disappears (was never visible anyway) ✓
→ Submit with q6_naConversionStatus value
→ Rule engine receives propertyComplianceStatus via derivation? Or only naConversionStatus?
```

**Effort:** 15 minutes
**Risk:** **NONE** — question is dead code, deletion can only improve clarity

---

#### P0-2: Tautological ShowWhen Condition

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~3003 (`q1_sellerOwnershipType`)
**Problem:**

```json
"showWhen": {
  "or": [
    { "!=": [{ "var": "purchaseType" }, "resale_endorsement"] },
    { "==": [{ "var": "purchaseType" }, "resale_endorsement"] }
  ]
}
```

This is `A OR NOT A` = always true. Question shows unconditionally on the Seller Transaction page.

**Fix Options:**

**Option A (Most Likely):** Remove showWhen entirely

```json
// DELETE the entire "showWhen" key
// Question shows on page if page is reached
```

**Option B:** Hide for endorsement

```json
"showWhen": { "!=": [{ "var": "purchaseType" }, "resale_endorsement"] }
```

But domain audit says this is ALREADY handled by the Seller Transaction page-level `showWhen` which hides the entire page for endorsement? So Option A is correct.

**Verification Steps:**

1. Check `sellerTransaction_homeLoan` page-level showWhen — does it already gate endorsement?
2. If yes → remove question-level showWhen (redundant)
3. If no → fix page-level showWhen to hide endorsement

**Test Scenario:**

```
Loan Type: New Loan, propertyIdentified: Yes
purchaseType: resale_endorsement
→ Verify: Seller Transaction page doesn't show (page-level gating)

purchaseType: resale_normal
→ Verify: Seller Transaction page shows
→ Verify: q1_sellerOwnershipType appears with clean showWhen
```

**Effort:** 15 minutes
**Risk:** **LOW** — fixing a tautology to a cleaner state; either remove or fix to a meaningful condition

---

#### P0-3: Mismatched Loan Type Value

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~2909 (`sellerTransaction_homeLoan` page showWhen)
**Problem:**

```json
"showWhen": {
  "or": [
    { "==": [{ "var": "propertyIdentified" }, "Yes"] },
    { "in": [{ "var": "loanType" }, ["New Home Loan"]] }  ← WRONG VALUE
  ]
}
```

All other schema references use `"New Loan"`, not `"New Home Loan"`.

**Fix:**

```json
"or": [
  { "==": [{ "var": "propertyIdentified" }, "Yes"] },
  { "in": [{ "var": "loanType" }, ["New Loan"]] }  ← CORRECTED
]
```

**Verify entire schema for other occurrences:**

```bash
grep -n "New Home Loan" homeLoanSchemaV2.json
```

**Expected result:** Only in `optionResolver` lists or removed entirely.

**Test Scenario:**

```
Loan Type: New Loan, propertyIdentified: Yes
→ Seller Transaction page shows via first OR branch ✓

Loan Type: New Loan, propertyIdentified: No (pre-sanction)
→ Seller Transaction page should show via second OR branch after fix ✓
```

**Effort:** 5 minutes
**Risk:** **NONE** — fixing typo

---

#### P0-4: Case-Sensitive Validation Key

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~406 (`q4_propertyStateName` validation)
**Problem:**

```json
{ "Case": { "==": [...] }, "then": "State is required" }
     ↑ UPPERCASE — WRONG
```

All other validations use lowercase `"case"`.

**Fix:**

```json
{ "case": { "==": [...] }, "then": "State is required" }
     ↑ lowercase — correct
```

**Full grep for other occurrences:**

```bash
grep -n '"Case"' homeLoanSchemaV2.json
grep -n '"case"' homeLoanSchemaV2.json
```

**Test Scenario:**

```
propertyStateName: (empty)
required: true
→ Validation fires with message "State is required" ✓
```

**Effort:** 5 minutes
**Risk:** **NONE** — fixing typo in validation key

---

#### P0-5: Orphaned PurchaseType Enum Values

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~2005, ~4227, ~4809
**Problem:** References to `"Resale"` and `"Direct Sale"` which are not valid enum values.

**Valid purchaseType values:**

- `direct_from_builder`
- `direct_from_authority`
- `resale_normal`
- `resale_endorsement`

**Dead references found:**

1. **Line ~2005** (`isPossessionOfferedByAuthority`):

   ```json
   "showWhen": { "==": [{ "var": "purchaseType" }, "Direct Sale"] }
   // Should be: "direct_from_authority" or ["direct_from_builder", "direct_from_authority"]
   ```

2. **Line ~4227** (`successionStatus`):

   ```json
   "showWhen": { "in": [{ "var": "purchaseType" }, ["Resale"]] }
   // Should be: ["resale_normal", "resale_endorsement"] or just "resale_normal"
   ```

3. **Line ~4809** (`propCost` dynamic question):
   ```json
   "showWhen": { "in": [{ "var": "purchaseType" }, ["Resale"]] }
   // Same as above
   ```

**Fix Strategy:**

For each location, determine the **domain intent**:

1. **isPossessionOfferedByAuthority** — Clearly for authority allotments only

   ```json
   "showWhen": { "==": [{ "var": "purchaseType" }, "direct_from_authority"] }
   ```

2. **successionStatus** — For resale properties where the current owner inherited it

   ```json
   "showWhen": { "in": [{ "var": "purchaseType" }, ["resale_normal", "resale_endorsement"]] }
   ```

   Actually, inheritance is about history. Check domain audit: succession applies to all resales. Keep as-is but fix enum.

3. **propCost dynamic question** — Asks for deal price; relevant for all purchase types
   ```json
   "showWhen": { "in": [{ "var": "purchaseType" }, ["resale_normal", "resale_endorsement"]] }
   ```
   OR make it show for all types (not conditional).

**Test Scenario:**

```
purchaseType: direct_from_authority
→ isPossessionOfferedByAuthority shows ✓

purchaseType: resale_normal
→ successionStatus shows ✓
→ propCost question text populates correctly ✓

purchaseType: direct_from_builder
→ isPossessionOfferedByAuthority hides ✓
```

**Effort:** 30 minutes (requires domain intent verification)
**Risk:** **LOW** — fixing enum values to valid options; test scenario will confirm intent

---

#### P0-6: Contextual Key Typo

**Files:** `homeLoanSchemaV2.json` (both locations), and downstream references
**Lines:** ~5502 (`q8_remainingTenure` in BT Existing Loan Details)
**Problem:**

```json
"contextKey": "orignalRemaningTenure",  ← DOUBLE TYPO
"bindsTo_template": "remainingTenure"   ← Correct spelling
```

**Audit:** Check downstream consumers for references to the typo:

```bash
# Find consumers
grep -r "orignalRemaningTenure" src/lib/
grep -r "remainingTenure" src/lib/
```

**Fix:** Determine which spelling is canonical:

**Option A:** Fix schema to match template

```json
"contextKey": "remainingTenure"
```

**Option B:** Fix template to match schema (unlikely, template is likely correct)

**Likely fix:** Option A — contextKey should match bindsTo_template.

**Establish rule:** Add comment to schema authoring guide: "contextKey must always match bindsTo_template for consistency."

**Test Scenario:**

```
loanType: Balance Transfer Only
Fill: q8_remainingTenure = 5 years
→ Payload extraction captures contextKey value
→ Rule engine can access via "remainingTenure" key
→ Evaluation produces correct EMI calculations
```

**Effort:** 30 minutes (includes downstream audit)
**Risk:** **MEDIUM** — if downstream code already uses the typo, must coordinate fix. Check before committing to either spelling.

---

### PHASE 2: High-Priority Fixes (P1) — 3-5 Days

#### P1-1: Duplicate RERA Registration Question

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~2031 (`q5_reraRegistrationStatus` in Property Condition), ~4349 (`q8_reraRegistrationStatus` in Legal Verification)
**Problem:** Two questions, same contextKey, different option values (`EXEMPT` vs `EXEMPTED`).

**Domain Logic:**

- RERA is under-construction property compliance
- Both Property Condition (compliance focus) and Legal Verification (documentation focus) could own it
- Property Condition is more natural (under-construction is asked there)

**Fix Strategy:**

1. **Keep in Property Condition** (q5), remove from Legal Verification
   - Property Condition is where under-construction questions live
   - Removes redundancy
   - Legal Verification still captures general documentation readiness

2. **Standardize value to `"EXEMPTED"`** (matches "REGISTERED" / "NOT_REGISTERED" pattern better than "EXEMPT")

3. **Update option values:**

   ```json
   // BEFORE (q5 — keep this)
   "options": [
     { "value": "REGISTERED", "label": "Registered" },
     { "value": "EXEMPT", "label": "Exempt" },  // ← CHANGE TO
     { "value": "EXEMPTED", "label": "Exempted" },
     { "value": "NOT_REGISTERED", ... },
     { "value": "UNKNOWN", ... }
   ]
   // AFTER
   "options": [
     { "value": "REGISTERED", "label": "Registered" },
     { "value": "EXEMPTED", "label": "Exempted" },  // ← CONSISTENT
     { "value": "NOT_REGISTERED", ... },
     { "value": "UNKNOWN", ... }
   ]
   ```

4. **Remove q8 from Legal Verification**

5. **Audit policy rules** that reference `reraRegistrationStatus` and ensure they check for `"EXEMPTED"` (not `"EXEMPT"`)

**Test Scenario:**

```
propertyAreaType: PLANNED_AUTHORITY
PropertyStage: Under Construction
→ q5_reraRegistrationStatus appears in Property Condition ✓
→ q8_reraRegistrationStatus does NOT appear in Legal Verification ✓

Select q5 = "EXEMPTED"
→ Payload captures { reraRegistrationStatus: "EXEMPTED" }
→ Policy rules that check for exempted status fire correctly ✓
```

**Effort:** 1 hour (includes rule validation and test)
**Risk:** **LOW** — removing redundant question; as long as property condition is the authoritative source, no data loss

---

#### P1-2: Conflated Compliance Values Across Area Types

**Files:** Schema + `ruleValidator.ts` + `payloadEnricher.ts`
**Problem:** Five area-type variants of `propertyComplianceStatus` all use the same three values (`fully_compliant`, `authorized_not_per_plan`, `not_authorized`), but the semantic meaning differs per area type.

| Area Type         | `authorized_not_per_plan` means     |
| ----------------- | ----------------------------------- |
| PLANNED_AUTHORITY | Minor building plan deviations      |
| OLD_MUNICIPAL     | Municipal plan deviations           |
| LOCAL_COLONY      | Regularization partially approved   |
| UNKNOWN           | Generic authorized-but-not-per-plan |

**Problem:** Policy rules evaluating `propertyComplianceStatus == "authorized_not_per_plan"` treat all equally, but risk profiles differ drastically.

**Fix Strategy: Option A (Recommended)** — Keep shared values, enforce area-type pairing in rules

1. **Document in rule authoring guide:**
   - Rule: `IF propertyComplianceStatus == "authorized_not_per_plan" THEN ...`
   - Must ALSO check: `AND propertyAreaType in [specific_areas]`
   - Add lint rule to catch non-paired usage

2. **Add validation to ruleValidator.ts:**

   ```typescript
   // Pseudo-code
   if (payload.propertyComplianceStatus === 'authorized_not_per_plan') {
   	if (!payload.propertyAreaType) {
   		throw new Error('propertyComplianceStatus requires propertyAreaType context');
   	}
   }
   ```

3. **Audit all 50+ bank policies** for rules using `propertyComplianceStatus` and add area checks

4. **Add comment to schema** near compliance questions:
   ```json
   "description": "Compliance status. Semantic varies by area type — always pair with propertyAreaType in policy rules."
   ```

**Alternative: Option B** — Use area-specific values (higher upfront cost, eliminates conflation)

```json
// Change from:
"value": "authorized_not_per_plan"

// To area-prefixed:
"value": "planned_minor_deviation"
"value": "converted_na_pending"
"value": "municipal_plan_deviation"
"value": "colony_partial_regularization"
```

**Recommendation:** **Option A** — less disruptive, achievable via documentation + validation.

**Test Scenario:**

```
Loan Type: New Loan
propertyAreaType: PLANNED_AUTHORITY
propertyComplianceStatus: authorized_not_per_plan
→ Policy rules that check this value MUST also verify propertyAreaType ✓

propertyAreaType: LOCAL_COLONY
propertyComplianceStatus: authorized_not_per_plan
→ Same rule may produce different output (conditional on area type) ✓

Rule engine validation catches orphaned usage ✓
```

**Effort:** 2-4 hours (includes audit of all policy rules)
**Risk:** **MEDIUM** — Requires updating rules database; thorough testing needed

---

#### P1-3: BT Page Ordering — Registry Question Too Late

**Files:** `homeLoanSchemaV2.json` (page order array)
**Problem:** Pages 2 & 3 reference `isRegistryDone` in showWhen, but it's only asked on page 4 (BT Registry & Possession).

**Current Order:**

1. Case Intake
2. Property Location & Type ← references isRegistryDone (undefined)
3. Property Character ← references isRegistryDone (undefined)
4. **BT Registry & Possession** ← isRegistryDone asked HERE
5. Property Condition
   ...

**Impact:** On pages 2-3, `{ "!": { "and": [...isRegistryDone == "Yes"...] } }` evaluates to `true` (negation of undefined), so questions meant to be hidden for "registry done" cases show prematurely.

**Fix Strategy:**

**Option A (Preferred):** Move BT Registry page to position 2

```json
"BT_TOPUP_PAGE_ORDER": [
  "caseIntake_homeLoan",
  "btRegistry_homeLoan",           // ← MOVED UP
  "propertyLocation_homeLoan",     // ← Now isRegistryDone is defined
  "propertyCharacter_homeLoan",    // ← Now isRegistryDone is defined
  "propertyCondition_homeLoan",
  ...
]
```

**Option B:** Make showWhen conditions defensive (explicit empty check first)

```json
// Current (unsafe)
"showWhen": { "!": { "and": [isRegistryDone == "Yes", ...] } }

// Defensive
"showWhen": { "and": [
  { "!=": [{ "var": "isRegistryDone" }, ""] },  // ← Explicit: if not answered yet
  { "!": { "and": [isRegistryDone == "Yes", ...] } }
]}
```

**Recommendation:** **Option A** — cleaner, more logical flow. Page asking "Is registry done?" should come before pages that act on the answer.

**Important:** BT_TOPUP_PAGE_ORDER is defined in **3 places** (per memory) — must update all atomically:

```bash
grep -rn "BT_TOPUP_PAGE_ORDER" src/
```

**Test Scenario:**

```
loanType: Balance Transfer Only

Page 2 (Property Location):
→ Load page with isRegistryDone = undefined
→ Show page without question flashing ✓

Answer isRegistryDone on page 4:
→ Return to page 2 (via edit flow)
→ Questions gate/ungate correctly based on isRegistryDone value ✓

Walk through full flow:
btOnly_registryDone: [caseIntake, btRegistry(yes), propertyLocation(short), ...]
btOnly_registryNotDone: [caseIntake, btRegistry(no), propertyLocation(full), btPossession, ...]
→ Both paths gate correctly ✓
```

**Effort:** 2-3 hours (includes all 3 locations)
**Risk:** **MEDIUM** — Page reordering affects flow logic; thorough BT flow testing required

---

#### P1-4: Zone Classification Warning References Non-existent Option

**Files:** `homeLoanSchemaV2.json` (both locations)
**Lines:** ~2270 (`q7_zoneClassification` warning)
**Problem:** Warning checks for `GREEN_BELT` option, but available options are only: `RESIDENTIAL`, `COMMERCIAL`, `MIXED_USE`.

**Fix:**

1. **If GREEN_BELT was intentionally removed:** Delete the warning

   ```json
   // DELETE:
   "if": { "==": [{ "var": "zoneClassification" }, "GREEN_BELT"] },
   "then": "..."
   ```

2. **If GREEN_BELT should exist:** Add it back as an option

   ```json
   "options": [
     { "value": "RESIDENTIAL", ... },
     { "value": "COMMERCIAL", ... },
     { "value": "MIXED_USE", ... },
     { "value": "GREEN_BELT", ... },  // ← ADD
   ]
   ```

3. **Consider adding meaningful warning for COMMERCIAL** (banks may decline residential loans on commercial-zoned land)

**Domain Logic:** For converted land, zone classification is critical. Commercial zoning may significantly reduce lender appetite for residential loan. A warning is valuable.

**Recommendation:** Add both COMMERCIAL and GREEN_BELT if they're valid outcomes; keep warning logic.

**Test Scenario:**

```
zoneClassification: COMMERCIAL
→ Warning fires: "Lenders may have restrictions on commercial-zoned residential properties" ✓

zoneClassification: GREEN_BELT
→ Warning fires: "Green belt/eco-sensitive zones may require special lender approval" ✓

zoneClassification: RESIDENTIAL
→ No warning ✓
```

**Effort:** 15 minutes
**Risk:** **LOW** — Adding/removing a warning; non-critical logic

---

### PHASE 3: Refactor Sprint (P2) — 1-2 Weeks

**These are medium-priority improvements suited for a dedicated refactor sprint. Summary only; detailed implementation deferred.**

#### P2-1: Strip Redundant `uiMeta.icon: "Circle"` from Radio Options

**Scope:** ~80+ radio options
**Issue:** Every radio option has redundant `"uiMeta": { "icon": "Circle" }` alongside a meaningful `icon` field.
**Action:**

1. Identify which field the radio renderer actually uses (`icon` vs `uiMeta.icon`)
2. Remove redundant one via jq script
3. Estimated lines saved: ~400

**Effort:** 30 minutes (scripted)

---

#### P2-2: Merge `purchaseType` Variants (q2a + q2b)

**Issue:** Two near-identical purchaseType questions differing only by one option.
**Fix:** Merge into single question with conditional options (if renderer supports option-level showWhen).

**Effort:** 1 hour

---

#### P2-3: Consolidate `documentationReadiness` Variants

**Issue:** Five Q1a-Q1e with identical options, varying only by text/description.
**Fix:** Extract shared options into reusable reference or accept duplication with documentation.

**Effort:** 1.5 hours

---

#### P2-4: Split Property Condition Page

**Issue:** 16+ conditional questions in one page.
**Fix:** Split into 3 logical sub-pages:

- Compliance & Approvals
- Municipal & Colony Specifics
- Construction Status

**Effort:** 3-4 hours

---

#### P2-5 through P2-9

See remediation plan document for details on:

- P2-5: `registryDateReason` necessity
- P2-6: Carpet area collection for RTM
- P2-7: `projectName` excluding House construction
- P2-8: Redundant AND condition in `ifPropertyRegistered`
- P2-9: Redundant nested PropertyStage check in `ocCcAvailable`

**Total P2 Effort:** 1-2 weeks (suitable for dedicated sprint)

---

### PHASE 4: Ongoing (P3) — Fix Opportunistically

#### P3-1 through P3-4

Low-priority cosmetic issues. Update as you touch related code. See remediation plan for details.

---

## Part 3: Domain Logic Fixes (Flow-Specific)

The domain audit identified **8 loan flows with logic gaps**. These require strategic question gating updates.

### Summary: Domain Logic Issues by Flow

| Flow                          | Key Domain Issues                                                                                                      | Action                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Top-up Only**               | priorAssessmentHistory wrong, purchaseType irrelevant, specialAreaRestriction redundant, builderTrackRecord irrelevant | Hide for top-up; reframe assessment question                                        |
| **BT Registry NOT Done**      | purchaseType framing unclear                                                                                           | Reframe as "How was property originally acquired?"                                  |
| **BT Registry Done**          | purchaseType hidden correctly ✓                                                                                        | Verify page order fix (P1-3)                                                        |
| **New Loan Direct Authority** | specialAreaRestriction wrong, seller transaction all wrong (5 questions)                                               | Hide restrictions for direct_from_authority; rebuild seller page for authority flow |
| **Resale Endorsement**        | sellerOnLoan hidden (should show), registrationQuestion illogical                                                      | Show sellerOnLoan; auto-answer registration as "No"                                 |
| **Old Municipal Resale**      | ocCcAvailable awkward for old properties                                                                               | Add conditional for old properties (pre-OC/CC era)                                  |
| **Local Colony**              | colonialRegularization redundant with q1d                                                                              | Merge or make conditional                                                           |
| **Converted Residential**     | zoneClassification missing "Agricultural" option                                                                       | Add option                                                                          |

### Implementation Strategy: Domain Logic Layer

Create a **domain logic module** mapping flow characteristics to question gating:

**File:** `src/lib/config/flowDomainLogic.ts`

```typescript
export const FLOW_DOMAIN_LOGIC = {
	'New Loan + Direct Authority': {
		hideQuestions: [
			'q1b_specialAreaRestriction', // authority clears zones
			'q1_sellerOwnershipType', // no personal seller
			'q3_propertyAcquisitionMethod',
			'q7_sellerOnLoan',
			'q10_ifPropertyRegistered',
			'q11_lastRegistryDuration'
		],
		reframeQuestions: {
			q1a_propertyComplianceStatus:
				'Authority properties typically pre-verified. Mark as compliant unless modifications noted.'
		}
	},
	'Top-up Only': {
		hideQuestions: [
			'q1_priorAssessmentHistory', // already assessed (existing loan exists)
			'q2a/q2b_purchaseType', // no purchase happening
			'q1b_specialAreaRestriction', // existing lender cleared this
			'q15_builderTrackRecord', // already evaluated
			'q16_projectApprovals'
		],
		reframeQuestions: {
			q1_priorAssessmentHistory: 'Has this top-up request been evaluated by any lender?'
		}
	}
	// ... etc for other flows
};
```

**Then update showWhen conditions to reference this mapping:**

Instead of:

```json
"showWhen": { "!=": [...] }
```

Use domain-aware logic:

```json
"showWhen": { "and": [
  { "!=": [{ "var": "loanType" }, "Top-up Only"] },
  { "!=": [{ "var": "purchaseType" }, "direct_from_authority"] }
]}
```

### Specific Domain Gating Changes

#### D1: Hide `specialAreaRestriction` for Direct Authority

**File:** `homeLoanSchemaV2.json` (lines ~1300)
**Current showWhen:**

```json
{
	"and": [
		{ "!=": [{ "var": "propertyAreaType" }, ""] },
		{ "!=": [{ "var": "propertyStateName" }, ""] },
		{ "!=": [{ "var": "propertyCityName" }, ""] }
	]
}
```

**Updated showWhen:**

```json
{
	"and": [
		{ "!=": [{ "var": "propertyAreaType" }, ""] },
		{ "!=": [{ "var": "propertyStateName" }, ""] },
		{ "!=": [{ "var": "propertyCityName" }, ""] },
		{ "!=": [{ "var": "purchaseType" }, "direct_from_authority"] } // ← ADD
	]
}
```

**Rationale:** Development authorities (DDA, HUDA) allot only in approved zones by definition.

---

#### D2: Reframe Purchase Type for BT Registry Not Done

**File:** `homeLoanSchemaV2.json` (lines ~q2a/q2b)
**Current description:**

```json
"description": "What is the nature of property purchase?"
```

**Updated description:**

```json
"description": "How was this property originally acquired by the original owner?"
```

**Updated helper text:**

```json
"helperText": "For balance transfer, the original purchase type affects title chain verification with the new lender."
```

**showWhen update** (only show for BT flows):

```json
"showWhen": { "in": [{ "var": "loanType" }, ["Balance Transfer Only", "Balance Transfer With Top-up"]] }
```

---

#### D3: Top-up Only — Hide Irrelevant Questions

**File:** `homeLoanSchemaV2.json`
**Update showWhen for these questions to exclude "Top-up Only":**

| Question                      | New showWhen                                            |
| ----------------------------- | ------------------------------------------------------- |
| `q1_priorAssessmentHistory`   | `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }`      |
| `q2a/q2b_purchaseType`        | `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }`      |
| `q1b_specialAreaRestriction`  | Add: `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }` |
| `q15_builderTrackRecord`      | Add: `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }` |
| `q16_projectApprovals`        | Add: `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }` |
| `q5_reraRegistrationStatus`   | Add: `{ "!=": [{ "var": "loanType" }, "Top-up Only"] }` |
| `q6_successionStatus` (Legal) | Already hidden for top-up? Verify.                      |

---

#### D4: Reframe `priorAssessmentHistory` for All Flows

**File:** `homeLoanSchemaV2.json`
**Current question:** "Has this case been assessed by any lender before?"
**Current options:** First assessment / Assessed 1-2 lenders / Assessed 3+ lenders / Previously rejected

**Problem:** Same phrasing for New Loan, BT, Top-up makes no sense.

**Fix Strategy:** Use dynamic description based on `loanType`

**File to create/update:** `src/lib/config/dynamicQuestionText.ts`

```typescript
export function getAssessmentHistoryQuestion(loanType: string): string {
	switch (loanType) {
		case 'New Loan':
			return 'Has this borrower + property combination been assessed by any lender before?';
		case 'Balance Transfer Only':
		case 'Balance Transfer With Top-up':
			return 'Has this BT case been evaluated by any new lender?';
		case 'Top-up Only':
			return 'Has this top-up request been evaluated by any lender?';
		default:
			return 'Has this case been assessed before?';
	}
}
```

**Then in schema, reference the dynamic function or add conditional text via renderer.**

---

#### D5: Add Authority-Specific Seller Transaction Sub-flow

**This is a major refactor.** The Seller Transaction page assumes individual sellers; authority allotments need different questions.

**File:** `homeLoanSchemaV2.json` (add new page)

**New page:** `sellerTransaction_authority_homeLoan`

**Questions:**

- `q1_allotmentLetterStatus` — Is the allotment letter received from authority?
- `q2_authorityPaymentStatus` — Has payment to authority been completed?
- `q3_authorityPendingDues` — Any pending dues/demands from authority?
- `q4_transferLetterStatus` — Has transfer letter been issued?
- `q5_possessionLetterStatus` — Has possession letter been received?

**Page showWhen:**

```json
{
	"and": [
		{ "==": [{ "var": "propertyIdentified" }, "Yes"] },
		{ "==": [{ "var": "purchaseType" }, "direct_from_authority"] }
	]
}
```

**Replace entire Seller Transaction page logic** — show authority version for direct_from_authority, regular version for others.

---

## Part 4: Implementation Roadmap

### Week 1: Critical Fixes (P0) + High Fixes (P1)

```
Monday-Tuesday: P0 Critical Fixes
├── P0-1: Delete dead compliance question       [15 min]
├── P0-2: Fix tautology showWhen                [15 min]
├── P0-3: Fix "New Home Loan" → "New Loan"      [5 min]
├── P0-4: Fix validation "Case" → "case"        [5 min]
├── P0-5: Fix orphaned purchaseType values      [30 min]
└── P0-6: Fix contextKey typo (with audit)      [30 min]
        TOTAL: ~2-3 hours
        Commit: "fix: P0 critical schema fixes"

Wednesday: P1 High Fixes (Part 1)
├── P1-1: Deduplicate RERA question             [1 hr]
├── P1-2: Audit compliance value pairing        [2-3 hrs]
└── Update rule authoring guide
        TOTAL: ~3-4 hours
        Commit: "fix: P1-1 and P1-2 compliance"

Thursday: P1 High Fixes (Part 2)
├── P1-3: Fix BT page ordering (all 3 locations) [2 hrs]
├── P1-4: Fix zone classification warning       [15 min]
├── Update BT_TOPUP_PAGE_ORDER everywhere       [30 min]
└── Full BT flow testing
        TOTAL: ~3 hours
        Commit: "fix: P1-3 and P1-4 BT flows"

Friday: Integration + Smoke Testing
├── Verify all P0 + P1 fixes together           [1 hr]
├── Run test suite (unit + e2e)                 [1 hr]
├── Test 5+ critical flows end-to-end           [1 hr]
└── Update DEVELOPMENT-PLAN.md
        TOTAL: ~3 hours
```

### Week 2: Domain Logic Fixes + Prep for P2

```
Monday: Domain Logic Setup
├── Create flowDomainLogic.ts module             [1 hr]
├── Implement flow-aware gating functions        [1 hr]
└── Update component renderers to use module     [1.5 hrs]
        TOTAL: ~3.5 hours

Tuesday-Thursday: Domain Logic Gating Updates
├── D1: Hide specialAreaRestriction for authority    [30 min]
├── D2: Reframe purchaseType for BT                  [30 min]
├── D3: Hide top-up questions                        [1 hr]
├── D4: Dynamic priorAssessmentHistory description   [1 hr]
└── D5: Add authority-specific seller page           [2-3 hrs]
        TOTAL: ~5.5 hours
        Commit: "feat: domain-aware question gating"

Friday: Testing + Plan for P2
├── Test all 8 flows with domain changes         [1.5 hrs]
├── Document P2 refactor sprint plan             [1 hr]
└── Update MEMORY.md with session progress
        TOTAL: ~2.5 hours
```

---

## Part 5: Atomic Schema Updates

All schema changes must be made **atomically** in both locations:

1. `src/lib/config/homeLoanSchemaV2.json` (mirror)
2. `src/lib/server/formEngine/schemas/homeLoanSchemaV2.json` (canonical)

### Update Checklist Template

For each fix, use this process:

```bash
# 1. Read both schema files to verify current state
code src/lib/config/homeLoanSchemaV2.json
code src/lib/server/formEngine/schemas/homeLoanSchemaV2.json

# 2. Make identical changes to BOTH files using Edit tool
# Edit canonical location
# Edit mirror location

# 3. Verify they match
diff -u src/lib/server/formEngine/schemas/homeLoanSchemaV2.json \
         src/lib/config/homeLoanSchemaV2.json

# 4. Test the specific fix
pnpm run test:unit -- [fix-specific-test]

# 5. Commit atomically
git add src/lib/config/homeLoanSchemaV2.json \
        src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
git commit -m "fix: [P0/P1-X] [brief description]"
```

---

## Part 6: Cross-Schema Form Logic Audit (Session 19)

> **Added**: 2026-03-11 | **Full report**: `docs/FORM-LOGIC-AUDIT.md`
> **Scope**: All 6 loan types + applicant schemas + income profiles + CIBIL + infrastructure

This audit extends the original home-loan-only remediation plan to cover the ENTIRE form system. 48 issues found across 4 tiers.

### Key Findings Not Covered by Original Plan

#### New Broken Code (not in original P0-P3)

| ID    | Scope           | Issue                                                                                             |
| ----- | --------------- | ------------------------------------------------------------------------------------------------- |
| T1-03 | Home Loan       | Authority page `bindsTo` vs `bindsTo_template` — data may be silently dropped                     |
| T1-04 | Home Loan       | `Self-employed(Professional)` employment type option always hidden (string vs array comparison)   |
| T1-05 | All SE loans    | `business_3plus_years` referenced by 6 showWhen conditions but never defined as selectable option |
| T1-06 | Business Loan   | Obligations question permanently suppressed — FOIR calc impossible                                |
| T1-07 | Plot Loan       | `==` with array literals — potential dead branches                                                |
| T1-09 | All (homemaker) | Credit score minimum 0 instead of 300                                                             |

#### New Cross-Loan Logic Issues

| ID    | Scope             | Issue                                                                    |
| ----- | ----------------- | ------------------------------------------------------------------------ |
| T2-06 | Personal Loan     | Salary bank account required for self-employed applicants                |
| T2-07 | Professional Loan | Current account required for salaried professionals                      |
| T2-08 | All loans         | "Why low CIBIL?" shown for 750+ scores                                   |
| T2-10 | All loans         | `enquiryReason` form stuck for 1-2 enquiries (CreditScoreSection.svelte) |
| T2-12 | Business Loan     | Location binds to residence keys instead of business keys                |
| T3-01 | All salaried      | MNC salary-to-bank should be auto-derived                                |
| T3-03 | All salaried      | Tenure hidden when PF not deducted (IT/consulting employees)             |
| T3-06 | All loans         | Pension available for 18-year-olds                                       |

#### Infrastructure Bug

| ID    | Scope              | Issue                                                                          |
| ----- | ------------------ | ------------------------------------------------------------------------------ |
| Infra | All non-home forms | `AgreeModal` only in home-loan page — FEMA popup broken for LAP/Plot/unsecured |

### Implementation Merge Strategy

The original plan's Weeks 1-2 roadmap remains valid for home-loan-specific P0-P1 fixes. The new audit findings should be implemented in **parallel batches**:

| Batch                                      | What                                           | Timing                |
| ------------------------------------------ | ---------------------------------------------- | --------------------- |
| **Original P0**                            | Home loan schema fixes (P0-1 through P0-6)     | Week 1 Mon-Tue        |
| **New Tier 1**                             | Cross-schema broken code (T1-01 through T1-09) | Week 1 Wed-Thu        |
| **Original P1 + New Tier 2**               | High-priority + wrong questions                | Week 2                |
| **New Tier 3**                             | Missing conditional logic (customer-facing)    | Week 3                |
| **Original D1-D5 + New Tier 2 remainders** | Domain logic + authority/builder gating        | Week 3-4              |
| **Original P2-P3 + New Tier 4**            | Refactor sprint + quality                      | **DONE** (`cc59f6d7`) |

### Files Affected (Comprehensive)

| File                                       | Issues                                                               |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `homeLoanSchemaV2.json`                    | T1-01, T1-02, T1-03, T1-08, T2-01 through T2-05 + all original P0-P3 |
| `salariedQuestion.json`                    | T2-08, T2-09, T3-01 through T3-05, T3-07, T3-09, T3-14               |
| `applicantQuestion.json`                   | T1-04, T3-10, T4-04, T4-05, T4-09                                    |
| `businessOtherQuestions.json`              | T1-05, T1-06, T2-08                                                  |
| `professionalQuestion.json`                | T1-05, T2-08, T2-11                                                  |
| `pensionerPerson.json`                     | T2-08, T3-06, T3-11, T4-01 through T4-03, T4-08, T4-13               |
| `unemployedPerson.json`                    | T1-09                                                                |
| `personal-loan-schema.json`                | T2-06, T3-12                                                         |
| `businessLoanSchema.json`                  | T2-12, T3-13                                                         |
| `professional-loan-schema.json`            | T2-07                                                                |
| `plot-loan-schema.json`                    | T1-07, T4-12                                                         |
| `LAP-schema.json`                          | T4-11                                                                |
| `applicantBasicDetailsUnsecuredLoans.json` | T3-13                                                                |
| `incomeProfiles/profileCards.ts`           | T3-06, T3-08                                                         |
| `CreditScoreSection.svelte`                | T2-10                                                                |
| `+layout.svelte` (form)                    | Infra (AgreeModal)                                                   |

---

## Part 6: Testing Strategy

### Unit Tests (Vitest)

**Create test file:** `src/lib/testing/homeLoan/__tests__/schemaFixes.test.ts`

```typescript
describe("HomeLoan Schema Fixes", () => {
  describe("P0-1: Dead compliance question removal", () => {
    it("should not render q1b_propertyComplianceStatus_converted", async () => {
      const engine = new FormEngine(homeLoanSchemaV2);
      const propertyConditionPage = engine.getPage("propertyCondition_homeLoan");
      const deadQuestion = propertyConditionPage.questions.find(
        q => q.id === "q1b_propertyComplianceStatus_converted"
      );
      expect(deadQuestion).toBeUndefined();
    });

    it("should render q6_naConversionStatus for CONVERTED_RESIDENTIAL", async () => {
      const engine = new FormEngine(homeLoanSchemaV2);
      const state = { propertyAreaType: "CONVERTED_RESIDENTIAL" };
      const page = engine.getPage("propertyCondition_homeLoan", state);
      const q6 = page.questions.find(q => q.id === "q6_naConversionStatus");
      expect(q6).toBeDefined();
      expect(q6.showWhen).toBeTruthy();
    });
  });

  describe("P0-3: Loan type value fix", () => {
    it('should not reference "New Home Loan" in schema', async () => {
      const schema = JSON.parse(fs.readFileSync(...));
      const invalidRefs = findAllValues(schema, "New Home Loan");
      expect(invalidRefs).toEqual([]);  // Should be empty
    });

    it("should reference only 'New Loan' for loanType checks", async () => {
      const schema = JSON.parse(...);
      const validRefs = schema.pages
        .map(p => p.questions || [])
        .flat()
        .filter(q => q.showWhen?.in?.["var"] === "loanType");
      validRefs.forEach(q => {
        q.showWhen.in.values.forEach(val => {
          expect(["New Loan", "Balance Transfer Only", ...]).toContain(val);
        });
      });
    });
  });

  // ... tests for P0-4, P0-5, P0-6, P1-1 through P1-4
});
```

### E2E Tests (Playwright)

**Create test file:** `src/lib/testing/homeLoan/__tests__/e2e/schemaFlows.spec.ts`

```typescript
test.describe('HomeLoan Schema Flow Fixes', () => {
	test('Top-up Only should not ask purchaseType', async ({ page }) => {
		await page.goto('/form/home-loan');
		await selectLoanType('Top-up Only');

		// Should NOT see purchaseType question
		const purchaseTypeQuestion = page.locator("[data-testid='q2a_purchaseType']");
		await expect(purchaseTypeQuestion).not.toBeVisible();
	});

	test('Direct from Authority should not ask specialAreaRestriction', async ({ page }) => {
		await page.goto('/form/home-loan');
		await selectLoanType('New Loan');
		await selectPropertyIdentified('Yes');
		await selectPropertyAreaType('PLANNED_AUTHORITY');
		await selectPurchaseType('Direct from Development Authority');

		// Should NOT see specialAreaRestriction
		const zoneQuestion = page.locator("[data-testid='q1b_specialAreaRestriction']");
		await expect(zoneQuestion).not.toBeVisible();
	});

	test('BT Registry question should appear before Property Location', async ({ page }) => {
		// Verify page order
		const pages = await page.locator('.wizard-page-title');
		const pageTexts = await pages.allTextContents();
		const caseIntakeIdx = pageTexts.findIndex((t) => t.includes('Case Intake'));
		const registryIdx = pageTexts.findIndex((t) => t.includes('Registry'));
		const locationIdx = pageTexts.findIndex((t) => t.includes('Location'));

		expect(registryIdx).toBeGreaterThan(caseIntakeIdx);
		expect(registryIdx).toBeLessThan(locationIdx);
	});
});
```

### Manual Testing Flows

Use the **Testing Checklist from remediation_plan.md**, running each flow end-to-end:

- [ ] **New Loan → Planned Authority → Direct from Builder** (verify no specialAreaRestriction)
- [ ] **Top-up Only** (verify no purchaseType, no priorAssessmentHistory)
- [ ] **BT Registry Not Done** (verify page order, no premature visibility flashing)
- [ ] **New Loan → Direct from Authority** (verify no seller questions, authority-specific page shows)
- [ ] **Resale Endorsement** (verify sellerOnLoan shows, registration question auto-hides)

---

## Part 7: Modularity & Dependency Map

### Schema Structure (Atomic Units)

```
homeLoanSchemaV2.json (both locations)
├── pages[]
│   ├── caseIntake_homeLoan
│   │   ├── q1_priorAssessmentHistory (P2-Domain)
│   │   └── q2_propertyIdentified
│   │
│   ├── propertyLocation_homeLoan
│   │   ├── q1_propertyAreaType (D1)
│   │   ├── q2a_purchaseType (D2)
│   │   ├── q4_propertyStateName (P0-4)
│   │   ├── q5_propertyCityName
│   │   ├── q7_pincode
│   │   └── q1b_specialAreaRestriction (D1)
│   │
│   ├── propertyCondition_homeLoan
│   │   ├── q1a-q1e_propertyComplianceStatus (P1-2)
│   │   ├── q2_ocCcAvailable (P2-9)
│   │   ├── q5_reraRegistrationStatus (P1-1, remove q8)
│   │   ├── q6_naConversionStatus (P0-1)
│   │   ├── q7_zoneClassification (P1-4)
│   │   ├── q13_constructionProgress (D3)
│   │   ├── q15_builderTrackRecord (D3)
│   │   └── q16_projectApprovals (D3)
│   │
│   ├── sellerTransaction_homeLoan (P0-2, P0-3)
│   │   ├── q1_sellerOwnershipType (P0-2, D4)
│   │   ├── q3_propertyAcquisitionMethod (D4)
│   │   ├── q7_sellerOnLoan (D5)
│   │   └── [NEW] sellerTransaction_authority_homeLoan (D5)
│   │
│   ├── legalVerification_homeLoan
│   │   ├── q1a-q1e_documentationReadiness (P2-3)
│   │   ├── q8_reraRegistrationStatus (DELETE — P1-1)
│   │   └── q6_successionStatus (D3)
│   │
│   ├── btRegistry_homeLoan (page order: P1-3)
│   │   ├── q1_isRegistryDone
│   │   ├── q2_bt_possessionAndDemandStatus
│   │   └── q4_sixMonthsPassedAfterRegistry
│   │
│   └── btExistingLoan_homeLoan
│       ├── q8_remainingTenure (P0-6)
│       └── [other BT-specific questions]
```

### Types Dependencies

```
types/form.ts (PayloadFormData)
├── propertyAreaType ← propertyLocation
├── propertyComplianceStatus ← propertyCondition (P1-2: requires pairing with area type)
├── reraRegistrationStatus ← propertyCondition (P1-1, singular source)
├── naConversionStatus ← propertyCondition
├── zoneClassification ← propertyCondition
├── purchaseType ← propertyLocation (D2: reframe for BT)
├── isRegistryDone ← btRegistry (P1-3: move earlier)
└── remainingTenure ← btExistingLoan (P0-6: fix contextKey typo)

types/casePayload.ts (derived fields)
└── Must have pairs when referencing "authorized_not_per_plan" (P1-2)

ruleValidator.ts (valid keys)
└── Must add validation for mandatory pairings (P1-2)

payloadEnricher.ts
└── May need updates for area-type derivations (P1-2)
```

### Rule Engine Dependencies

```
realBankRuleDocs.ts (policy rules)
├── Rules checking propertyComplianceStatus (P1-2)
│   └── MUST also check propertyAreaType context
└── Rules checking reraRegistrationStatus (P1-1)
    └── Update to use standardized "EXEMPTED" value

evaluationEngine.ts
└── Add validation warning if orphaned compliance values detected
```

### Configuration & Domain Logic Module (NEW)

```
config/flowDomainLogic.ts (CREATE)
├── FLOW_DOMAIN_LOGIC object mapping flow → hidden questions
├── getAssessmentHistoryDescription(loanType)
├── getAuthorityQuestions() → authority seller transaction questions
└── isQuestionValidForFlow(questionId, loanType, purchaseType, etc.)
```

---

## Part 8: Risk Mitigation

### Rollback Procedure

If anything breaks in production:

```bash
# 1. Identify commit hash
git log --oneline | head -5

# 2. Determine impact (which phase?)
# P0: Critical (commit immediately after)
# P1: High (commit after full integration testing)
# P2/P3: Medium/Low (can wait for fix)

# 3. Rollback single commit
git revert [commit-hash]
git push origin main

# 4. OR rollback entire phase
git checkout [last-known-good-commit]
git push --force origin main  # Only if pre-production!

# 5. Post-mortem
# - Update testing checklist
# - Add regression test
# - Document in DEVELOPMENT-PLAN.md
```

### Safety Checks Before Each Commit

- [ ] **Schema validation:** Both locations match exactly

  ```bash
  diff -q src/lib/config/homeLoanSchemaV2.json \
           src/lib/server/formEngine/schemas/homeLoanSchemaV2.json
  ```

- [ ] **Type checking:** 0 errors

  ```bash
  pnpm run check
  ```

- [ ] **Unit tests:** All passing

  ```bash
  pnpm run test:unit
  ```

- [ ] **Smoke test:** At least 1 flow end-to-end

  ```bash
  pnpm run test:e2e -- [specific-test]
  ```

- [ ] **Grep for orphaned references**
  ```bash
  grep -n "New Home Loan" src/lib/
  grep -n "Resale\|Direct Sale" src/lib/
  ```

---

## Part 9: Success Metrics

### Before-and-After Comparison

| Metric                 | Before                 | After                       | Target        |
| ---------------------- | ---------------------- | --------------------------- | ------------- |
| **Schema issues (P0)** | 6 dead/broken          | 0                           | 0 ✓           |
| **Schema issues (P1)** | 4 latent bugs          | 0                           | 0 ✓           |
| **Domain logic gaps**  | 8 flows misaligned     | ≤2 (acceptable UX)          | Clean ✓       |
| **Test coverage**      | Existing               | +12 new tests               | >90% ✓        |
| **Type errors**        | 0                      | 0                           | 0 ✓           |
| **BT flow testing**    | Limited                | Full matrix                 | 9 scenarios ✓ |
| **Rule engine**        | Rules may miss context | Rules paired with area type | Validated ✓   |

### Validation Checklist (Post-Deployment)

- [ ] All P0 + P1 fixes deployed and passing tests
- [ ] All 8 flows tested end-to-end (test checklist from remediation_plan.md)
- [ ] Zero regression in existing test suite
- [ ] Domain logic mapping documented in code
- [ ] Rule authoring guide updated with compliance pairing requirement
- [ ] Downstream consumers (policy rules, templates) audited
- [ ] MEMORY.md and DEVELOPMENT-PLAN.md updated

---

## Part 10: Files to Create/Modify

### Files to MODIFY (Schema + Type Updates)

1. **`src/lib/config/homeLoanSchemaV2.json`** (mirror)
   - All P0, P1, domain logic changes

2. **`src/lib/server/formEngine/schemas/homeLoanSchemaV2.json`** (canonical)
   - All P0, P1, domain logic changes (atomic with #1)

3. **`src/lib/types/form.ts`**
   - Verify all P1-2 fields present
   - Add mandatory pairing documentation

4. **`src/lib/ruleEngine/ruleValidator.ts`**
   - P1-2: Add validation for compliance+area pairing

5. **`src/lib/ruleEngine/payloadEnricher.ts`**
   - P1-2: Update/add derivation rules if needed

6. **`src/lib/testing/homeLoan/pageFlowMap.ts`**
   - Update question registry if IDs change
   - Update page order (P1-3)

### Files to CREATE

1. **`src/lib/config/flowDomainLogic.ts`** (domain logic module)
   - Maps loan types to hidden/reframed questions
   - Provides getters for flow-aware descriptions

2. **`src/lib/config/dynamicQuestionText.ts`** (optional, for dynamic descriptions)
   - Functions to dynamically set question text based on loanType

3. **`src/lib/testing/homeLoan/__tests__/schemaFixes.test.ts`**
   - Unit tests for all P0, P1 fixes

4. **`src/lib/testing/homeLoan/__tests__/e2e/schemaFlows.spec.ts`**
   - E2E tests for all 8 flows

### Files to UPDATE (Documentation)

1. **`docs/DEVELOPMENT-PLAN.md`**
   - Add "Phase 5: Schema Remediation" with status

2. **`docs/RULE-ENGINE-SPECIFICATION.md`**
   - Add "Compliance Values — Mandatory Area-Type Pairing" section (P1-2)

3. **`C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md`**
   - Add session summary with commit hashes

4. **Rule authoring guide (if exists)** or create new
   - Document `propertyComplianceStatus` pairing requirement

---

## Part 11: Estimated Effort & Timeline

### Phase Breakdown

| Phase                     | Tasks                         | Effort   | Days      | Risk   |
| ------------------------- | ----------------------------- | -------- | --------- | ------ |
| **P0 Critical**           | 6 fixes                       | 2-3 hrs  | 0.5-1     | LOW    |
| **P1 High**               | 4 fixes                       | 5-7 hrs  | 1-2       | MEDIUM |
| **Domain Logic**          | 5 gating updates + 1 new page | 6-7 hrs  | 1-2       | MEDIUM |
| **Testing + Integration** | Unit + E2E + manual           | 5-6 hrs  | 1-1.5     | MEDIUM |
| **P2 Medium**             | 7 optimizations               | 8-12 hrs | 2-3       | LOW    |
| **TOTAL**                 | 22+ issues                    | ~28 hrs  | 6-10 days | MEDIUM |

### Critical Path

```
Days 1-2:  P0 Fixes + P1-1,P1-2 + Testing
Days 3-4:  P1-3,P1-4 + Domain Logic Fixes
Days 5-6:  Integration Testing + Documentation
Week 2:    P2 Refactor Sprint (can overlap with production use)
```

**Can ship production with P0+P1+Domain fixes (days 1-6), defer P2 to next sprint.**

---

## Summary: Implementation Order

1. ✅ **Read and validate** this plan (you are here)
2. **Phase 1 (P0-P1):** Start with critical/high fixes
   - Use `Edit` tool for atomic schema updates
   - Commit each logical group
3. **Domain Logic:** Implement flow-aware gating
   - Create `flowDomainLogic.ts`
   - Update question showWhen conditions
4. **Testing:** Run full test matrix
   - 9 BT/Top-up scenarios
   - 8 loan flows
   - Regression suite
5. **Documentation:** Update MEMORY.md, DEVELOPMENT-PLAN.md, rule guides
6. **P2 Refactor:** Schedule for dedicated sprint

---

**Next Step:** Proceed to Phase 1. Start with P0-1 (delete dead question) as a warm-up. Commits will be atomic and reversible.
