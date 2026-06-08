# Session 53 — Phase B: Director/Company Chain

## Quick Context

You are continuing development on DigitalDSA V3, a fintech platform for Indian loan DSAs. Session 52 completed a docs overhaul, 5 critical Phase A fixes, and built a property affordability back-calculator module.

**Read these files in order:**
1. `CLAUDE.md` — architectural truth, conventions, key file paths
2. `docs/SESSION-HANDOFF.md` — current state, what was done, what's next
3. This prompt — specific Phase B instructions

**Current state:** `main` branch | 0 type errors | 9,237 tests (74 files) | Latest commit: `e60c4444`

---

## What to Build: Phase B — Director/Company Chain

7 items, each unblocking the next. Estimated 2-3 sessions.

### Item 1: AD-9 — Trace Duplicate UUID Root Cause (START HERE)

**Problem:** Director applicants sometimes appear as duplicates in the applicant list. Three dedup guards mask the crash:
1. `formState.replaceApplicants()` — dedup by ID at source
2. `commitDirectorsToApplicants()` — dedup before return
3. `sortedApplicantEntries` — display-level dedup

**Investigation approach:**
- Search for all places that ADD applicants to `formState.applicants[]`
- Trace `commitDirectorsToApplicants()` call sites (defined in `src/lib/utils/directorFormUtils.ts:529`)
- Called from: `applicantFormManager.svelte.ts` (lines 388, 544, 624), `AddApplicantBusiness.svelte:1069`, `AddApplicantProfessional.svelte:1257`
- Check if any code path calls commit twice without clearing first
- Check if `$effect` blocks trigger re-commit on state changes

**Goal:** Find WHY duplicates are created, fix the root cause, then verify the 3 guards can be simplified.

### Item 2: AD-3 — Directors as Full Applicants from Save

**Current flow:** Directors captured in `directorFormsMap` (per-company sub-forms). Only "committed" to applicant array when company is saved via `commitDirectorsToApplicants()`.

**Target flow:** Directors become Individual applicants IMMEDIATELY when saved in `DirectorFormModal`. No deferred commit.

**Key files:**
- `src/lib/components/DirectorFormModal.svelte` — where director is saved
- `src/lib/components/applicantFormManager.svelte.ts` — orchestrator
- `src/lib/utils/directorFormUtils.ts` — `commitDirectorsToApplicants()` at line 529
- `docs/specs/COMPANY-DIRECTOR-ARCHITECTURE.md` — spec (Phases 1-3 done, Phase 4 parked)

### Item 3: AD-4 — Full Financial Restoration

**Problem:** When restoring a director from recovery bin, only identity fields (name, age, gender) are restored. Income profiles, obligations, CIBIL are lost.

**Key:** `_structured` snapshots ARE captured at recovery time (in `applicant.svelte.ts:446`). They're just not unpacked back into `applicantDataStore`.

**Files:** `directorRestoreHandler.ts`, `applicantRestoreHandler.ts`, `applicant.svelte.ts`

### Item 4: AD-5 — Wire Auto-Income for Directors

**THE CODE EXISTS. IT JUST NEEDS TO BE CALLED.**

`src/lib/utils/directorAutoIncome.ts` (227 lines) has:
- `createDirectorIncomeEntry()` — creates single entry
- `syncAutoIncomeEntries()` — full reconciliation
- `orphanIncomeForCompany()` — flags entries when company deleted

Import already exists in `applicantFormManager.svelte.ts` line 76. The functions are NEVER CALLED.

Wire `syncAutoIncomeEntries()` into the director commit/save flow.

### Item 5: AD-7 — Orphan Director Detach Button

`CrossFieldWarningBanner.svelte` has `onFixContradiction` prop (line 35). `Company.svelte` handles basic detach (lines 357-369). Missing: orphan income entries, update `directorFormsMap`, confirmation dialog.

### Item 6: AD-6 — Multi-Company Income

A director on 3 boards needs 3 locked income entries. Depends on AD-5 being wired. The income system supports multiple entries of same type via `entityName`.

### Item 7: AD-8 — Company DC Obligations Split

No `obligationOwner: 'company' | 'personal'` field exists. Company obligations and director personal obligations are treated identically. Need: field, UI, and rule engine separation.

---

## Coding Standards (MANDATORY)

These are top-priority standing instructions. Follow for ALL code:

1. **Human-readable variable names** — `maxAffordableProperty` not `mAP`. Domain abbreviations OK (EMI, FOIR, LTV).
2. **Step-by-step with comments** — Comment WHY, not WHAT. Number multi-step algorithms.
3. **Small focused files** — ~200-300 lines max. One file = one responsibility.
4. **No unnecessary complexity** — Simple `if/else` over clever ternary chains. Prefer named intermediates over chained expressions.

---

## Reference Documents

| Need | File |
|---|---|
| Full platform audit (117 items) | `docs/reviews/2026-04-04-full-platform-audit.md` |
| Dependency-ordered roadmap | `docs/DEVELOPMENT-ROADMAP.md` |
| Director architecture spec | `docs/specs/COMPANY-DIRECTOR-ARCHITECTURE.md` |
| Director UX overhaul spec | `docs/specs/DIRECTOR-LINKED-APPLICANT-UX-OVERHAUL.md` |
| Affordability calculator spec | `docs/specs/PROPERTY-AFFORDABILITY-BACK-CALCULATOR.md` |
| Affordability module (built) | `src/lib/ruleEngine/affordabilityCalculator.ts` |

---

## After Phase B

Phase C: Rule Engine Pipeline (wire RM policies, facility FOIR, NBFC negative areas, offer cards, affordability cross-lender optimization). See `docs/DEVELOPMENT-ROADMAP.md`.
