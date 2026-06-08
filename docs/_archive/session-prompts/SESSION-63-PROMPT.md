# Session 63 Prompt — Restoration Fix + Grouped Form Design + Regression Tests

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state from Session 62 (read Session 62 Summary + Session 63 Priority section)
3. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 62 was massive — mobile responsive, i18n, landing page demo, 8 bug fixes, billing fix, LAP reordering. But applicant restoration has 4 critical gaps that need a dedicated session, plus the user wants grouped form layouts for property/BT/TopUp pages.

**Current metrics**: 0 type errors | 9,343 tests passing (78 files)

## Objective

**Fix applicant restoration completely, redesign BT/TopUp/LAP/Property pages into grouped form layouts, and build regression tests so bugs don't come back.**

## Tasks (in priority order)

### Task 1: Applicant Restoration Fix (HIGH — CRITICAL)

**Problem**: Restoring an existing applicant from a previous case breaks income linking and doesn't restore all data. Four specific gaps identified in S62 investigation.

**File**: `src/lib/utils/applicantRestoreHandler.ts`

**Gap 1: Income profile selection never restored**
- Line 83: `restoredEntry.selectedIncomeProfiles = []` — cleared in Phase 1
- Phase 2 restores income entries to `applicantDataStore` but never restores the `selectedIncomeProfiles` array
- **Fix**: In Phase 2 (`commitApplicantRestore`), read income entries from structured data and rebuild `selectedIncomeProfiles` from the restored entries' `profileType` values

**Gap 2: Director-company re-linking missing**
- After restoration, `commitDirectorsToApplicants()` is never called
- Directors lose their `linkedCompanyId` and income visibility breaks
- **Fix**: After Phase 2 completes, if restored applicant was a director, re-call linking logic

**Gap 3: Company link timing issue**
- Phase 1 checks if company exists (line 91: `newList.some(a => a.id === linkedId)`)
- But if the company is being restored in the same batch, it may not be in `newList` yet
- **Fix**: Defer company-link validation to Phase 2, or ensure company restoration happens before individual restoration

**Gap 4: No multiple-profile selection UI**
- When a person has multiple income profiles stored (e.g., salaried + director), all are restored without user choice
- If contradicting profiles exist (e.g., "no income" + "director profile"), no flag shown
- **Fix**: After restoration, run contradiction check. If conflicting profiles found, show a picker modal. If no conflicts, auto-select all.

**Related files to read**:
- `src/lib/utils/applicantRestoreHandler.ts` (Phase 1 + Phase 2)
- `src/lib/utils/directorFormUtils.ts` (`commitDirectorsToApplicants`, lines 529+)
- `src/lib/utils/restoreRelationships.ts`
- `src/lib/stores/applicantFormManager.svelte.ts` (orchestrator)
- `src/routes/(app)/form/home-loan/+page.svelte` (entry point, lines 1724-2053)

### Task 2: Grouped Form Layout for BT/TopUp/LAP/Property Pages (MEDIUM)

**Problem**: Property financials, BT details, Top-up details, and LAP requirement pages use progressive Q&A (one question at a time). The user wants these redesigned as grouped form layouts where related fields appear together in a visual container.

**Current State (all pages use sequential Q&A — no grouping)**:

#### Page A: Home Loan Deal & Financials (`dealFinancials_homeLoan`) — 11 questions
Key groups to create:
1. **Property Valuation Group**: Market Value (q3), Property/Deal Cost (q4), Registry Value (q5), Deposit (q6), Advance Paid (q6a)
   - These 5 fields should appear in a single card/container once the first is answered
   - Title: "Property Valuation & Payment"
2. **Loan Term Group**: Mortgage Year (q2), Custom Term (q2a)
3. **Registration Group**: Timeline (q7), Planned Date (q7a), Reason (q7b)

#### Page B: Home Loan BT Existing (`btExistingLoan_homeLoan`) — 10 questions
Key groups:
1. **Loan Basics**: Sanction Amount (q1), Disbursement Date (q3)
2. **Current Terms**: Interest Rate Type (q4), EMI Bounces (q5)
3. **Outstanding**: Principal (q6), Interest Rate (q7), Remaining Tenure (q8)
4. **Lender**: Bank (q9), Current EMI (q10)

#### Page C: LAP Existing Details (`existingDetailsPage`) — 7 questions
Key groups:
1. **Outstanding & Rate**: Principal (q1), Interest Rate (q2), Remaining Tenure (q3)
2. **Loan History**: Vintage (q4), Repayment Track (q5)
3. **Lender**: Bank (q6), Current EMI (q7)

#### Page D: LAP Top-Up Details (`topUpDetailstPage`) — 4 questions
Key groups:
1. **Property & Amount**: Property Value (q1), Top-Up Amount (q2)
2. **Purpose & Tenure**: Purpose (q_btLoanPurpose), Tenure (q_topTenure)

#### Page E: LAP Loan Requirement (`loanRequirementPage`) — 5 questions
Key groups:
1. **Loan Terms**: Tenure (q1), Purpose (q_loanPurpose)
2. **Amount**: Property Value (q3_propCost), Loan Amount (q3_loanAmount)
3. **DOD**: Monthly Withdrawal (q_dodMonthlyWithdrawal) — conditional

**Approach — Two options (investigate which is better)**:

**Option A: Schema-level grouping (new `groupId` field on questions)**
- Add `groupId?: string` and `groupTitle?: string` to `RawSchemaQuestion`
- Questions with same `groupId` render inside a shared container div
- Form engine renders groups as cards with shared title
- Pro: Declarative, reusable. Con: Schema change affects all loan types.

**Option B: Page-level component override**
- Create dedicated components like `PropertyValuationForm.svelte`, `BTDetailsForm.svelte`
- These render the grouped fields directly, bypassing the Q&A engine for these pages
- Pro: Full visual control. Con: Breaks the engine-driven pattern.

**Recommendation**: Option A is better — it's consistent with the existing pattern and scales to all loan types. The form engine already handles `descriptionHeader` for group-level text — extend this to support visual containers.

### Task 3: Regression Test Suite (HIGH — prevents regressions)

**Problem**: Bugs fixed in S62 (and earlier sessions) keep coming back because there are no tests for component-level behaviors.

**Write Vitest tests for**:
1. **OPC locking**: When companyType='opc', designation must be 'md', shareholding must be 100, both immutable
2. **Clear button**: After resetForm(), all state (currentProfileType, incomeAnswers, specificsAnswers, isEditing) must be empty
3. **Zero income validation**: drawsSalary=false + receivesProfit=false must produce validation error for director_company entries
4. **ITR toggle**: When itrReflectsIncome changes to false, evidenceAnswers.itrFiled must become false
5. **BT/Top-up closure**: getClosureOptionsFiltered() for BT and Top-up variants must include "Close by this new loan" label
6. **onProperty-only income check**: detectBorrowerZeroIncome() must return empty array when onEMI=false, onProperty=true
7. **Restoration income profiles**: After commitApplicantRestore(), selectedIncomeProfiles must match restored entries
8. **LAP page ordering**: getAllPages() must return loanRequirementPage at index 1 (after intake)

**Test file**: `src/lib/testing/__tests__/regressionBugs.test.ts`

For testable pure functions (items 5, 6, 8), write direct unit tests.
For state-dependent behaviors (items 1-4, 7), test the functions/logic that drive them.

### Task 4: Complete Mobile Responsive Audit (MEDIUM — carried from S62)

**Problem**: S62 fixed CRM nav, billing, and filter bar overflow but did NOT verify:
- DSA home page (`/dashboard/dsa`) — 3-zone GlanceCard layout at 375px
- Results page card stacking at 375px — verify LenderResultCard stack vertically properly
- Sticky bar usability on mobile — text truncation, button reachable
- Tablet viewport (768x1024) across all dashboard pages
- Touch targets — minimum 44px on all interactive elements

**Approach**:
1. Use preview tools to resize to mobile (375px) and tablet (768px)
2. Navigate to DSA home, results, CRM, billing pages
3. Screenshot and fix any overflow, cramped layout, or unreachable targets
4. Specific components to verify:
   - `GlanceCard.svelte` — already has mobile media query, verify it works
   - `LenderResultCard.svelte` — already has mobile CSS (2x2 metrics grid), verify stacking
   - `ResultsSummaryBar.svelte` — verify flex-wrap works at 375px
   - Sticky bar — verify names hidden, CTA reachable
   - `NeedsAttentionZone.svelte` — verify action button wraps below content

### Task 5: Unsecured Loan Location Placement Review (LOW — clarification)

**Context**: In S62, investigation confirmed that location questions at the end of unsecured loans is INTENTIONAL for Debt Consolidation variants only. Fresh/New loan variants have location early. This is documented and correct. No code change needed — just verify the user understands the design:
- Fresh Personal/Business/Professional: Location at position 3 (early)
- DC variants: Location moved to end (after obligations)

**No action needed unless user wants to change this.**

## Verification

After all tasks:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing (9,343 + new regression tests)
3. Manual test: restore an applicant with director/company income → verify income profiles and company links preserved
4. Manual test: LAP form → verify loan requirement page appears after intake
5. Manual test: BT obligation → verify "Close by this new loan" appears
6. Visual check: DSA home at 375px — GlanceCards 2-col, no overflow
7. Visual check: Results page at 375px — cards stack, sticky bar usable

## What NOT to Do

- Don't touch the rule engine or evaluation pipeline
- Don't modify the landing page (ProductDemoSection built in S62)
- Don't change billing/trial system
- Don't work on CSP/HSTS or credential rotation
- Don't simplify income profiling (it's the moat)
- Don't break existing Q&A rendering for pages NOT being redesigned
- Don't implement the communication hub send (research only in S62)
