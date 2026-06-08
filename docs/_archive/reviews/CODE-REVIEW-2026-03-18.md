# Code Review — 2026-03-18

**Scope:** Uncommitted working tree changes (3 files)
**Reviewer:** Automated daily review

---

## Files Changed

| File | Lines | Summary |
|------|-------|---------|
| `AddApplicantBusiness.svelte` | +75 / -180 | Sole prop refactor: multi-applicant "Add + Table" → single inline form with auto-save on Next |
| `CustomSelect.svelte` | +8 / -2 | Space-stripping in search filter so "110025" matches "110 025" |
| `LocationGroup.svelte` | +26 / -0 | **Bug fix:** Restore city/area options on back-navigation |

---

## Findings

### 1. [BUG FIX] LocationGroup: city/area reset on back-navigation

**File:** `LocationGroup.svelte`
**Status:** Fixed in this review session

**Bug:** User fills pincode → state → city → area, navigates forward, comes back — city and area dropdowns reset to "Select City" / "Select Area" while pincode and state are retained.

**Root cause:** When navigating back, `LocationGroup` re-mounts with restored answers (`stateValue="Delhi"`, `cityValue="New Delhi"`), but `cityOptions` and `areaEntries` start as empty `[]`. The `CustomSelect` can't find the value in empty options, so it shows placeholder text.

**Fix:** Added two `$effect` blocks that detect restored values with empty option lists and fetch the options without clearing downstream values:
- Effect 1: If `stateValue` exists but `cityOptions` is empty → fetch cities
- Effect 2: If `cityValue` exists but `areaEntries` is empty (and `cityOptions` loaded) → fetch areas

Guards: `loadingCities`/`loadingAreas` flags prevent re-entry. Area effect gates on `cityOptions.length > 0` to ensure correct sequencing.

**Risk:** None — the effects only fire when options are empty (fresh mount), not on user-initiated changes which go through `handleStateChange`/`handleCityChange`.

---

### 2. [MEDIUM — Dead Code] AddApplicantBusiness: unused imports and functions after sole prop refactor

**File:** `AddApplicantBusiness.svelte`

The sole prop path was refactored from a multi-applicant "Add + Table" pattern to a single inline form. The entire applicant table, Add button, Edit/Delete actions, and editing state were removed from the template. However, several supporting items may now be dead code:

**Likely unused imports:**
- `CirclePlus` — was on the "Add Applicant" button
- `Trash2` — was on table delete buttons
- `Pencil` — was on table edit buttons
- `scrollToFirstError` — was called in old `validateStep`

**Likely unused functions/state (verify before removing):**
- `saveIndividual()` — old "Add" button handler
- `startEdit()` / `cancelEdit()` — old table edit flow
- `deleteApplicant()` — old table delete handler
- `getDisplayName()` / `getSubDetails()` / `getIndividualNumber()` — old table display helpers
- `editingIndex` state — no longer in template
- `individualApplicants` / `totalApplicantCount` / `applicantCompletionStatus` / `duplicateIndexes` — derived values for old table
- `MAX_APPLICANTS` constant

**Action:** Audit each item — if not used by the company path in this file, remove them. Leaving dead code creates confusion about which code paths are active.

**Risk:** Low (no functional impact, hygiene only)

---

### 3. [MEDIUM — Consistency] isNextEnabled vs validateStep use different question sets

**File:** `AddApplicantBusiness.svelte`

The `isNextEnabled` effect (line ~338) calls `getIndividualErrors()` which iterates `INDIVIDUAL_QUESTIONS` (5 fields). But `validateStep()` (line ~963) iterates `PROP_QUESTIONS` (6 fields — includes `businessTradeName`).

Currently safe because `businessTradeName` is `required: false`, so it passes validation in both paths. But if `businessTradeName` ever becomes required, `isNextEnabled` would enable prematurely while `validateStep` would block.

**Recommendation:** Use the same question set in both paths. Either:
- Pass `PROP_QUESTIONS` to `getIndividualErrors()`, or
- Create a `getProprietorErrors()` helper used by both

**Risk:** Low (no current bug, future-proofing)

---

### 4. [LOW — Fragility] existingIdx matches by applicantType instead of id

**File:** `AddApplicantBusiness.svelte` (line ~984)

```js
const existingIdx = formState.applicants.findIndex(
    (a) => a.applicantType === 'Individual'
);
```

For sole prop today this is safe (only one Individual). But if a co-applicant feature is added, `findIndex` returns the first match, potentially overwriting the wrong applicant.

**Recommendation:** Match by `formApplicant.id` instead:
```js
const existingIdx = formState.applicants.findIndex(
    (a) => a.id === formApplicant.id
);
```

**Risk:** Low (defensive improvement)

---

### 5. [OK] CustomSelect: space-stripping search normalization

**File:** `CustomSelect.svelte`

Both search query and option labels are stripped of spaces before comparison, so "110025" matches "(110 025)". This is correct for the pincode/area search use case.

The IIFE pattern inside `$derived` is standard Svelte 5 (could also use `$derived.by()` but functionally equivalent).

**Risk:** None

---

### 6. [OK] Sole prop auto-save on Next pattern

**File:** `AddApplicantBusiness.svelte`

The refactored pattern:
1. User fills proprietor form inline (no "Add" button)
2. On Next: validate all `PROP_QUESTIONS` → auto-save to `formState.applicants` → proceed
3. `selectedIncomeProfiles` auto-set via `getAutoSelectedProfiles()`
4. `index` hardcoded to `0` for single-applicant rendering

This is simpler and more intuitive than the old Add→Table flow for a single-person entity. The auto-save pattern matches the company path.

**Note:** Income profiles are overwritten on every Next press. This is correct for sole prop (profiles are deterministic), but worth noting.

---

## Security Assessment

No security concerns:
- No new API endpoints or auth changes
- No `{@html}` additions with user-controlled content
- No PII handling changes
- CustomSelect search is label-only, no code injection vector

## Summary

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | BUG | LocationGroup city/area reset on back-navigation | **Fixed** |
| 2 | MEDIUM | Dead code in AddApplicantBusiness after refactor | Open — cleanup recommended |
| 3 | MEDIUM | isNextEnabled / validateStep question set mismatch | Open — low urgency |
| 4 | LOW | existingIdx fragility | Open — defensive fix |
| 5 | OK | CustomSelect search normalization | No action needed |
| 6 | OK | Sole prop auto-save pattern | No action needed |

**Critical fix applied:** LocationGroup restoration effects ensure city/area options are fetched on back-navigation without clearing saved answers.
