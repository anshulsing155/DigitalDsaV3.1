# Session 64 Prompt — Form Flow Fixes + Requirements Implementation

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state (read S64 Priority section)
3. `docs/specs/S64-QUEUED-REQUIREMENTS.md` — **FULL SPEC** (7 requirements, ~1300 lines, detailed flows + edge cases + implementation files)
4. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 63.5 was a requirements review session — 7 form flow issues identified from screenshots + PDF, 1 bug fix applied (obligation form visibility). The original S64 plan (classification wiring + communication hub) is deferred to S65.

**Current metrics**: 0 type errors | 9,424 tests passing (81 files)
**Bug already fixed**: `ObligationCapture.svelte:83` — obligation form now shows when `isGuarantorOnOtherLoan=Yes` (committed but not pushed)

## Objective

**Fix form flow issues across all loan types — wrong conditional logic, missing questions, restoration bugs, and company-individual linking gaps.**

The full detailed spec with flows, decision trees, edge cases, and implementation files is in `docs/specs/S64-QUEUED-REQUIREMENTS.md`. Read it thoroughly before starting each task.

## Tasks (in priority order)

### Task 1: Applicant Restoration — Strict Name Matching Fix (R3.1 — quick win)

**Problem**: Recovery suggestions show unrelated names. Typing "Pra" shows nidhi, ravi, fasf along with Pramod/Pradeep.
**File**: `src/lib/utils/applicantRecoveryDetector.ts` → `findRecoverableByName()`
**Fix**: Remove bidirectional prefix match — keep only `entryName.startsWith(currentName)`. Remove `currentName.startsWith(entryName)`.
**Also applies to**: Company name matching, Director/Partner name matching — check all callers.
**Test**: Type "Pra" → only names starting with "Pra" appear.

### Task 2: Director/Partner Modal — Wire Up Recovery Detection (R3.13)

**Problem**: `DirectorFormModal.svelte` has no recovery detection. Partner/director names typed in the modal never trigger "Previous Record Found".
**File**: `src/lib/components/DirectorFormModal.svelte`
**Fix**: Add debounced name detection (same pattern as `ApplicantFormCard.svelte`). On match → show `RestoreApplicantModal`. On restore → pre-fill director form fields (name, gender, age, marital status).
**Test**: Type a previously saved name in partner modal → restoration modal appears.

### Task 3: "Check for Previous Records" — Guaranteed Visibility (R3.2)

**Problem**: After canceling restoration, the "Check for previous records" link sometimes doesn't appear.
**File**: `src/lib/components/ApplicantFormCard.svelte`
**Fix**: Ensure link is ALWAYS visible when `hasDeniedUUIDs()` is true and name has 2+ chars. Remove any conditions that hide it during editing state.
**Test**: Cancel restoration → link appears immediately. Stays visible through state changes.

### Task 4: Plot Loan — Fix Wrong showWhen Conditions (R5.2)

**Problem**: 3 questions shown in wrong contexts for Plot Loan:
- "Existing loan/mortgage on property" → should only show for resale, not direct sale
- "Plot registered in seller name" → should only show for resale
- "Construction timeline" → needs "Do you plan to construct?" pre-question

**Files**:
- `src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts` — fix showWhen for `q5_existingEncumbrance`, `q2_ifPropertyRegistered`
- `src/lib/config/plotLoan/questionBank/constructionDetails_Plot.ts` — add construction intent pre-question

**Fix**: Add `purchaseType == 'resale_normal'` condition to existing loan and seller registration questions. Add new "Do you plan to construct?" question before timeline.
**Test**: Plot Loan + Direct from authority → no seller questions. Plot Loan + Resale → full seller flow.

### Task 5: Plot Loan — Missing Resale Seller Questions (R5.3)

**Problem**: Resale plot flow missing 4 critical questions.
**File**: `src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts`

**Add**:
1. "Which lender holds the seller's existing loan?" — select, shown when `existingEncumbrance == 'Yes'` + resale
2. "What is the approximate foreclosure amount?" — number input, same showWhen
3. "Is the seller or any co-owner an NRI?" — radio, shown for all resale
4. "Has the seller obtained NOC from their lender?" — radio, shown when existing loan + resale

**Test**: Resale + seller has loan → all 4 questions appear in correct order.

### Task 6: Location Page — Property Not Identified Flow (R2)

**Problem**: When property not identified, form asks area type and full location as if property exists.
**File**: `src/lib/config/homeLoan/questionBank/propertyLocation.ts`

**Changes**:
- Add "Not Decided Yet" option to `q1_propertyAreaType` (showWhen: `propertyIdentified == 'No'`)
- Add new question "Has the intended city been decided?" (Yes/No, showWhen: `propertyIdentified == 'No'`)
- Update `q_propertyLocation` showWhen: when `propertyIdentified == 'No'`, only show if `intendedCityDecided == 'Yes'`
- Update question text for pre-approval context

**Test**: Property not identified → "Not Decided Yet" option visible. City not decided → location skipped entirely.

### Task 7: Professional Loan — Applicant Type First (R6)

**Problem**: Professional category question asked before knowing if Individual or Company is applying.
**Files**: Professional loan question bank (find via `professionalCategory`)

**Changes**:
- Add "Who is applying?" (Individual Professional / Professional Firm) as FIRST question on loan requirements page
- Make professional category options dynamic based on applicant type answer
- Add company-specific categories: Clinic/Hospital, Law Firm, CA Firm, Architecture Firm, Engineering Consultancy
- Pre-configure Applicants page based on selection

**Test**: Select "Professional Firm" → company categories shown. Applicants page defaults to Company form.

### Task 8: Remove Existing Facility Q → Current Account Capture (R7)

**Problem**: "Which bank is existing facility with?" is redundant for Debt Consolidation (obligations already capture per-loan lender).
**Files**: Loan requirement question banks for Professional/Business/Personal loans

**Changes**:
- Remove/hide existing facility lender question for Debt Consolidation variants
- Add current account question: Company → multi-select banks directly. Individual → gate question first.

**Test**: Debt Consolidation → no "existing facility" question. Company → current account picker shown.

### Task 9: Case Assessment → Offer Page (R1 — if time permits)

**Lower priority** — document the data flow, verify bindsTo keys exist. Offer page visual changes can come later.

### Task 10: Company-Individual Income Intelligence (R4 — design only)

**Largest requirement** — per-entry qualifying questions, auto-derive company. This is complex enough to need its own session. In S64, review the spec and identify any gaps. Implementation in S65.

## Verification

After each task:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing
3. Manual verification where applicable

After all tasks:
1. Home Loan form: property not identified → correct flow
2. Plot Loan form: direct sale vs resale → correct question visibility
3. Professional Loan form: Individual vs Company → correct categories
4. Applicant restoration: strict prefix match working, director modal detection working
5. Debt Consolidation: no redundant existing facility question

## What NOT to Do

- Don't implement R4 fully (Company-Individual Income Intelligence) — too large, design review only in S64
- Don't touch classification wiring (deferred to S65)
- Don't touch communication hub (deferred to S65)
- Don't touch landing page, billing, CSP/HSTS, or credentials
- Don't simplify income profiling
- Don't delete any files — archive only
