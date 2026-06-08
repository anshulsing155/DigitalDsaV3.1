# Session 61 Prompt — Wire Offers End-to-End

## Context

Read first:
1. `CLAUDE.md` — stable architectural rules
2. `docs/SESSION-HANDOFF.md` — current state from Session 60
3. `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\MEMORY.md` — standing instructions

Session 60 completed the payload integrity audit — all form fields now reach the payload. The **evaluation pipeline is architecturally complete** (enricher → engine → result builder). What's missing is the **wiring** to actually trigger it and display results.

## Objective

**Make it possible to fill out any of the 6 loan forms and see real bank offers at the end.** This is the #1 priority — everything else is polish.

## Tasks (in priority order)

### Task 1: Seed Real Bank Rules on DB Init (Small)

**Problem**: `seedRealBankRuleDocuments()` in `src/lib/ruleEngine/realBankRuleDocs.ts` exists with 7 fully-implemented Indian bank rule documents (HDFC, ICICI, Axis, SBI, Bajaj Housing, Tata Capital, LIC HF) but is **never called**. Fresh DB → falls back to sample lenders with names like "Sample PVT Bank".

**Fix**:
- Create an admin API endpoint (or hook into existing DB initialization) that calls `seedRealBankRuleDocuments()` if `LenderRuleArtifacts` collection is empty
- Alternatively, add a check at the top of `evaluatePayload()` in `evaluationEngine.ts` — if `loadActiveRuleDocuments()` returns empty AND fallback is sample docs, auto-seed real docs
- The seed function already handles upsert logic — safe to call multiple times

**Key files**:
- `src/lib/ruleEngine/realBankRuleDocs.ts` — has `seedRealBankRuleDocuments()` and `ALL_REAL_BANK_RULE_DOCS`
- `src/lib/ruleEngine/evaluationEngine.ts` — `loadActiveRuleDocuments()` and `loadFallbackRuleDocuments()`
- `src/routes/api/admin/` — existing admin endpoints

### Task 2: Wire Evaluate-and-Persist for 3 Unsecured Forms (Medium)

**Problem**: Only 3 secured forms (Home Loan, LAP, Plot Loan) call `/api/evaluate-and-persist` on final submit. The 3 unsecured forms (Personal, Business, Professional) call `/api/form/evaluate` but **never persist results or create cases**.

**What secured forms do (copy this pattern)**:
1. `secureFetch('/api/evaluate-and-persist', { body: { loanAnswers, applicants, applicationData, relationships } })`
2. Receive `{ caseId, offerCount, ... }` response
3. Navigate to `/dashboard/dsa/cases/${caseId}/results`
4. Fire-and-forget `eligibility-sync` call

**Key files to wire**:
- `src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte` — needs evaluate-and-persist on submit
- `src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte` — same
- `src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte` — same
- Reference: `src/routes/(app)/form/home-loan/+page.svelte` (lines ~1630-1680) — the working pattern

**Important**: The `evaluate-and-persist` endpoint already handles both secured and unsecured payloads. No backend changes needed — just wire the frontend submit.

### Task 3: Pre-Submit Reconciler (Medium)

**Problem**: `formState.applicants` and `applicantDataStore` can diverge on partial session reload. Income entries and obligations are written to BOTH stores simultaneously, but they use different sessionStorage keys.

**Create** `src/lib/utils/preSubmitReconciler.ts`:
- Function `reconcileBeforeSubmit(formState, applicantDataStore)`
- For each applicant: if `applicantDataStore` has newer/more complete income entries or obligations, merge them into `formState.applicants`
- Priority: `applicantDataStore` wins for income/obligations (it's the "source of truth" for the income page)
- Don't touch identity fields (name, age, etc.) — those live in `formState.applicants`

**Integrate**: Call `reconcileBeforeSubmit()` just before the `evaluate-and-persist` fetch in all 6 form submit handlers.

### Task 4: Payload Completeness Tests (Medium)

**Create** `src/lib/testing/__tests__/payloadCompleteness.test.ts`:
- For each of the 6 loan types, create a sample raw form state
- Call `buildLoanPayload()` and verify every field in `LoanTransactionPayload` type that should be populated IS populated
- Call `buildApplicantPayload()` and verify per-applicant fields
- Test enricher: call `enrichPayload()` and verify all `_computed.*` fields exist
- Test edge cases: BT fields only present for BT loan types, unsecured fields only for unsecured, etc.

## Verification

After all tasks:
1. `pnpm check` — 0 errors
2. `pnpm test:unit` — all passing
3. Manual test: fill Home Loan form → submit → see results page with HDFC/ICICI/SBI etc. (not "Sample PVT Bank")
4. Manual test: fill Personal Loan form → submit → see results page (currently broken — should work after Task 2)

## What NOT to Do

- Don't touch the rule engine internals (evaluationEngine, resultBuilder, payloadEnricher) — they work
- Don't add new lender rule documents — 7 is enough for launch
- Don't refactor the form submit flow — just wire the missing pieces
- Don't work on dashboard redesign, landing page, or security (CSP) this session
- Don't work on credential rotation or email hardening (Phase H — do last)
