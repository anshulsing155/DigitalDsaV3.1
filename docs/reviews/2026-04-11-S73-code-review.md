# Code Review — Session 73 (2026-04-11)

**Scope**: 2 commits (`a53ab3ab..80c43235`) — code review fixes, same-company sync, auto-income pre-fill, value migration  
**Author**: Prashant (all commits)  
**Reviewer**: Automated daily review  

---

## HIGH

### H1. `registeredInIndia` not backfilled for pre-existing auto-created entries
**File**: `src/lib/utils/directorAutoIncome.ts` ~lines 243-261

The migration step 1c converts old full-name strings to short codes (`'Private Limited'` -> `'pvt_ltd'`), but does NOT add `registeredInIndia` to entries that lack it. Entries created before commit `80c43235` will have specifics without `registeredInIndia`. Since the company-type dropdown is gated behind `registeredInIndia` via showWhen, those directors will **still see a blank company-type dropdown**.

The fix in `80c43235` only helps newly-created entries going forward.

**Fix**: Add a step 1d migration in `syncAutoIncomeEntries` that sets `registeredInIndia: true` (or derives from `registrationCountry`) for any `autoCreated` entry where it's `undefined`.

### H2. `plApplicantSelector.extractMonthlyIncome` misses director income fields
**File**: `src/lib/ruleEngine/plApplicantSelector.ts` ~lines 186-222

`extractMonthlyIncome` sums `grossMonthlySalary`, `netMonthlySalary`, `netProfessionalIncome`, etc. — but does NOT check `monthlySalaryAmount` (director salary) or `averageProfitPerWithdrawal` (director/partner profit).

A director applicant whose only income is company salary/profit will have `monthlyIncome = 0`, failing the eligibility gate at line 287 and being **incorrectly marked ineligible** for the PL bridge.

**Fix**: Add `monthlySalaryAmount` and `averageProfitPerWithdrawal` to the income extraction loop.

---

## MEDIUM

### M1. `buildVariationContext` spread order silently overrides named fields
**File**: `src/lib/ruleEngine/variationMatcher.ts` ~lines 35-71

The object literal defines named mappings (`loanType`, `gender`, `age`, etc.) then spreads `...tx` at line 70, which **overrides all preceding keys** that exist in `tx`. Today this is safe because most named fields are derived from `tx`. But if `loanTransaction` ever gains a field named `gender`, `age`, `isNRI`, `creditScore`, or `employmentType`, it would silently shadow the primary-applicant mapping.

Comment says "named fields above take precedence" — which is **wrong**; spread at the end overrides.

**Fix**: Move `...tx` to the **top** of the return object.

### M2. Same-company dialog: accessibility gaps
**File**: `src/lib/components/IncomePageNew.svelte` ~lines 1943-1974

- Missing `aria-labelledby` pointing to the heading
- No focus trap — keyboard users can tab into background content
- Overlay `<div>` has a11y suppression comments (`a11y_click_events_have_key_events`, `a11y_no_static_element_interactions`)

**Fix**: Add `aria-labelledby`, `id` on heading, and focus-trap behavior.

### M3. Migration steps use early returns — entry needing two fixes only gets one per invocation
**File**: `src/lib/utils/directorAutoIncome.ts` ~lines 197-263

Steps 1b (shareholding) and 1c (value migration) use early `return` in a single `map()`. An entry needing both only gets the first fix per invocation. Converges on the second call, but briefly shows wrong values for one render cycle.

**Fix**: Accumulate all changes in a local variable before returning, instead of early returns.

---

## LOW

### L1. `sameCompanyPrompt.sourceSpecifics` captured at dialog open — stale if source edits concurrently
**File**: `src/lib/components/IncomePageNew.svelte` ~line 1003

Extremely unlikely in single-user DSA session. No action needed.

### L2. `normalizeEntityName` filters names under 2 chars after normalization
**File**: `src/lib/utils/sameCompanySync.ts` ~line 103

Conservative guard. Indian company names are always longer. No practical impact.

---

## POSITIVE

- **Same-company sync** (`sameCompanySync.ts`) is well-structured: clean separation of detection, extraction, sync, and linked-key stamping. Good test coverage (380-line test file).
- **DataCloneError fix** — correct approach using `$state.snapshot()` before `structuredClone()`.
- **Code review H2 fix** from previous review (changed/formsChanged reset per-company) was correctly implemented.
- **+41 tests** added (9,675 -> 9,716), covering same-company sync, stakeholder management, and auto-income migration.

---

## Summary

| Severity | Count | Action needed |
|----------|-------|---------------|
| HIGH | 2 | H1: backfill migration for `registeredInIndia`; H2: add director income fields to PL selector |
| MEDIUM | 3 | M1: fix spread order; M2: dialog a11y; M3: migration early-return ordering |
| LOW | 2 | No action needed |
