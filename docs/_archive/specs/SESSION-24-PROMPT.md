# Session 24 — Prompt & Context

> **Date**: Next session after 2026-03-12 | **Branch**: `main` | **Last commit**: `24c2ec47`
> **Previous**: Session 23 (code review fixes, server-on-next-only, unsecured loan rebuild, auto-scroll)

---

## 🔴 START HERE — Read These First

1. `docs/SESSION-HANDOFF.md` — Session state + architecture decisions
2. `CLAUDE.md` — Project conventions + tech stack
3. This file — Exact tasks with file paths and line numbers

---

## Priority 1: Remaining Code Review Fixes (5 items, ~15 min)

These are verified-still-existing issues from `docs/reviews/CODE-REVIEW-2026-03-12-C.md`. All are one-liner fixes.

### Fix 1: Plot credit history icons inverted (HIGH)

**Files**: `src/lib/config/plot-loan-schema.json` + `src/lib/server/formEngine/schemas/plot-loan-schema.json`
**Lines**: ~30-42 (creditHistoryStatus options)

"None — clean record" has `ThumbsDown`, adverse options have `ThumbsUp`. Should be the opposite.

```diff
- { "label": "None — clean record", "value": "clean", "icon": "ThumbsDown" }
- { "label": "Yes — involved in default or settlement", "value": "defaulter", "icon": "ThumbsUp" }
- { "label": "Yes — was guarantor on unpaid/settled loan", "value": "guarantor", "icon": "ThumbsUp" }
- { "label": "Both — default/settlement AND guarantor", "value": "both", "icon": "ThumbsUp" }
+ { "label": "None — clean record", "value": "clean", "icon": "ThumbsUp" }
+ { "label": "Yes — involved in default or settlement", "value": "defaulter", "icon": "AlertTriangle" }
+ { "label": "Yes — was guarantor on unpaid/settled loan", "value": "guarantor", "icon": "AlertTriangle" }
+ { "label": "Both — default/settlement AND guarantor", "value": "both", "icon": "AlertTriangle" }
```

**CRITICAL**: Update BOTH schema locations atomically.

### Fix 2: Bare `console.error` in Plot submit path (HIGH)

**File**: `src/routes/(app)/form/plot-loan/+page.svelte`
**Line**: ~924

```diff
  if (validationErrors.length > 0) {
-     console.error('Validation errors:', validationErrors);
+     if (dev) console.error('Validation errors:', validationErrors);
      submitError = 'Please fill all required fields: ' + validationErrors.join(', ');
```

Also verify LAP at line ~917 has the same pattern (may also be unguarded).

### Fix 3: RM broadcasts bare `fetch` (HIGH — CSRF bypass)

**File**: `src/routes/dashboard/rm/broadcasts/+page.svelte`
**Line**: 51

```diff
+ import { secureFetch } from '$lib/utils/csrf';
  // ...
- const res = await fetch('/api/rm/broadcasts', {
+ const res = await secureFetch('/api/rm/broadcasts', {
      method: 'POST',
```

### Fix 4: Submit path loanType string mismatch (MEDIUM)

**File**: `src/routes/(app)/form/plot-loan/+page.svelte`
**Lines**: 936, 965

The submit path sets `loanType: 'Plot and Construction Loan'` (word "and") but the schema options use `'Plot & Construction Loan'` (ampersand). These should match.

```diff
- loanType: 'Plot and Construction Loan',
+ loanType: 'Plot & Construction Loan',
```

Check both occurrences (lines 936 and 965).

### Fix 5: DSA dashboard bare `fetch` for broadcasts (MEDIUM)

**File**: `src/routes/dashboard/dsa/+page.svelte`
**Line**: ~261

```diff
- const broadcastP = fetch('/api/dsa/broadcasts')
+ const broadcastP = secureFetch('/api/dsa/broadcasts')
```

Already flagged in CODE-REVIEW-2026-03-12-B.md as CR-11.

---

## Priority 2: Applicant Restoration Investigation (~20 min)

**User report**: "applicant restoration not happening also" (Session 23)

**What we know from Session 23 investigation**:

- `RestoreApplicantModal` IS rendered in all 6 form pages ✅
- State bridge exists in `AddApplicant.svelte` (lines 157-185) ✅
- `detectCachedApplicantForForm()` triggers on name input ≥2 chars ✅
- `restoreIntentState.set({ open: true, ... })` fires ✅

**What to investigate**:

1. **Open the dev server** and test: Add an applicant to a home loan case → save → start new case → type same name → does the modal appear?
2. Check if `detectCachedApplicantForForm` actually finds matches — the function queries MongoDB via `/api/form/deleted-applicants?name=X`
3. Check if the API endpoint exists and returns data
4. Check if `restoreIntentState.open` change propagates to the modal
5. Clarify with user: What exact scenario triggers the issue? Which form? New case or edit?

**Key files**:

- `src/lib/components/AddApplicant.svelte` — detection trigger (lines 288-334)
- `src/lib/stores/restoreApplicantIntent.svelte.ts` — shared state
- `src/lib/components/RestoreApplicantModal.svelte` — modal component
- All 6 form `+page.svelte` files — modal rendering

---

## Priority 3: Wizard Sections Phase 4 — Shared Page Guidance (~1 hour)

**Goal**: Add consistent DSA guidance to shared pages (creditScore, obligations, income profiles) across all 6 loan types.

**Current state**: Wizard sections for all 6 loan types have the NEW `dsaGuidance` format for loan-specific pages, but shared pages (income, obligations, credit check) either have no guidance or use legacy format.

**Shared pages needing guidance**:

1. `creditScorePage` — CIBIL/credit score collection
2. `obligationsPage` — Existing loan obligations entry
3. `incomeSelectionPage` — Income source type selection
4. `incomeDetailsPage` — Income detail entry
5. `applicantProfilePage` — Applicant basic details

**Pattern to follow** (from `homeLoan.ts`):

```typescript
dsaGuidance: {
    summary: 'What this section does from DSA perspective',
    keyPoints: ['Key operational point 1', ...],
    watchFor: ['Common pitfall 1', ...],
    proTips: ['Experienced DSA tip 1', ...]
}
```

**Files**:

- `src/lib/config/wizardSections/homeLoan.ts` — reference implementation
- `src/lib/config/wizardSections/lapLoan.ts`
- `src/lib/config/wizardSections/plotLoan.ts`
- `src/lib/config/wizardSections/personalLoan.ts`
- `src/lib/config/wizardSections/businessLoan.ts`
- `src/lib/config/wizardSections/professionalLoan.ts`

---

## Priority 4: Remaining Lower-Priority Items

### 4a. Policy Capture → Rule Engine Integration

Convert RM-captured policies into `PolicyRule` objects the evaluation engine can use.

- **Types**: `src/lib/types/policyCapture.ts`
- **API**: `/api/rm/policy-captures`
- **Next step**: Create conversion function `captureToRules()` in `src/lib/ruleEngine/`

### 4b. downpaymentPercentage() V1→V2 Key Fix

**File**: `src/routes/(app)/form/home-loan/+page.svelte`
Uses `propertyCost`/`downPayment` instead of V2 keys `propCost`/`deposit`. Display-only bug, not blocking.

### 4c. NBFC Negative Area System (Home Loan Phase 5)

Home loan phase 5 from the original spec. Needs design first.

---

## Architecture Context (Critical for Session 24)

### Server-on-Next-Only (Session 23 — KEY CHANGE)

1. **Server** (`engine.ts`) returns ALL questions per page — no visibility filtering
2. **Client** (`shouldShow()`) is sole visibility filter
3. **No per-answer server calls** — `updateAnswer()` only stores locally
4. **State→city options**: New `/api/form/options` endpoint + `formOptionFetcher.ts`

### Auto-Scroll System (Session 23)

- Single utility: `src/lib/utils/formAutoScroll.ts` → `createFormAutoScroll()`
- Never `scrollIntoView` with `block: start/center`
- Always `window.scrollBy()` for minimal scrolling
- `setTimeout(80ms)` for DOM timing
- No inline `$effect`s — centralized only

### Schema Sync Rule

Both locations MUST be updated atomically:

- `src/lib/config/{schema}.json`
- `src/lib/server/formEngine/schemas/{schema}.json`

### showWhen Comparisons

Always use VALUES not LABELS: `"direct_from_authority"` not `"Direct from Authority"`

---

## Verification Checklist

After all fixes:

- [ ] `pnpm run check` — 0 errors
- [ ] `pnpm run test:unit` — all pass
- [ ] Plot credit history icons: ThumbsUp for clean, AlertTriangle for adverse
- [ ] Plot submit path: loanType matches schema values
- [ ] RM broadcasts uses secureFetch
- [ ] DSA broadcasts uses secureFetch
- [ ] No bare `console.error` in submit paths
- [ ] Applicant restoration tested (or clarified with user)
- [ ] Dev server starts without errors
