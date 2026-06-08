# Code Review — 2026-03-22

**Scope:** 5 commits from `a559a882` to `edc4246e` (Session 34: applicant role engine, sole proprietor, unsecured director redesign, BT applicant structure, case intake redesign)
**Reviewer:** Automated daily review

---

## Commits Reviewed

| Hash | Summary |
|------|---------|
| `a559a882` | Applicant role engine, sole proprietor sub-type, and validation UX fixes |
| `c667af2b` | Make businessTradeName required for sole proprietor + show tag in table |
| `5fda4808` | Unsecured director redesign, BT property labels, DC bank resolver |
| `33e5f296` | Restored applicant edit-or-new prompt + BT applicant structure |
| `edc4246e` | Case intake redesign + bug fixes |

---

## Security Assessment

### No Critical Issues Found

1. **HTML description strings** in `caseIntakeQuestions.ts` and `applicantBasicDetailsSecuredLoans.json` use static, hardcoded HTML — no user input interpolation. Safe given server-side rendering pipeline and existing `{@html}` policy.

2. **`businessTradeName`** field: maxlength=100 enforced at schema level. Rendered via `${applicant.businessTradeName}` in Svelte template (auto-escaped by Svelte text interpolation). No XSS vector.

3. **Dynamic bank options** for `q2_assessmentLenders` and `q5_dcExistingBank` use the existing `optionResolver.ts` pipeline which maps from server-side `bankData`. Options are generated server-side, not from user input. Safe.

4. **`__restoredFrom` snapshot**: Stored on the applicant object as a shallow copy (`{ ...restoredEntry }`). This is in-memory client-side state only — not persisted to DB or sent in API payloads. No data leak risk, but see Bug #3 below.

---

## Bugs Found

### BUG-1: `btExistingStructure` one-way sync (Medium)

**File:** `AddApplicant.svelte` (lines ~105-110 in commit `33e5f296`)

```typescript
$effect(() => {
    const stored = (currentLoanAnswers.btExistingStructure as string) ?? '';
    if (stored && !btExistingStructure) {
        btExistingStructure = stored;
    }
});
```

The guard `!btExistingStructure` means once the user selects a value, navigating away and back will NOT re-sync from `loanData` if the stored value changed externally (e.g., form reset). This is a one-way initialization — generally fine for this use case, but if `loanData` is ever cleared/reset programmatically, the local `btExistingStructure` will retain the stale value.

**Severity:** Low — unlikely in current flow, but fragile.
**Suggested fix:** Remove the `!btExistingStructure` guard and always sync from stored value, or use `$derived` instead of `$state` + `$effect`.

### BUG-2: Known — `isBTCase` access pattern (documented in MEMORY.md)

**File:** `AddApplicant.svelte` — The BT detection now correctly navigates `loanData[loanName].loanType` via `currentLoanAnswers`. This is an improvement over the previous `formState.getLoanField()` approach. However, this pattern is duplicated across components. A shared utility would reduce drift risk.

**Status:** Improved but not fully resolved.

### BUG-3: `__restoredFrom` circular reference risk (Low)

**File:** `home-loan/+page.svelte`, `lap/+page.svelte`, `plot-loan/+page.svelte`

```typescript
(restoredEntry as any).__restoredFrom = { ...restoredEntry };
```

This creates a shallow copy of `restoredEntry` and attaches it as `__restoredFrom`. Since this happens AFTER setting `__completion = false`, the snapshot includes `__completion: false`. If `restoredEntry` later gets a `__restoredFrom` field itself (from a prior restore), the snapshot will contain the nested `__restoredFrom` — not a true circular reference but an unbounded nesting chain across multiple restore cycles.

**Severity:** Low — unlikely to cause issues in practice (depth is bounded by number of restores per session), but memory usage grows.
**Suggested fix:** Strip `__restoredFrom` from the snapshot: `{ ...restoredEntry, __restoredFrom: undefined }`.

### BUG-4: Home loan property location showWhen may be too permissive

**File:** `homeLoan/pages.ts` (line ~72 in commit `edc4246e`)

```typescript
const SHOW_WHEN_PROPERTY_LOCATION = {
    '!=': [{ var: 'assessmentStatus' }, '']
};
```

Previously this checked for `propertyIdentified` or BT loan type. Now it only checks `assessmentStatus` is non-empty. For New Loan cases, the `propertyIdentified` question was moved INTO the property location page — so the page itself is shown before the user answers whether they've identified a property. This is intentional (the question is now on the page), but it means the page title "Property Location" shows in the sidebar even before the user has context about what they're doing there. Minor UX concern.

**Severity:** Low — functional, just slightly premature sidebar visibility.

### BUG-5: `resolveOptionLabel` switch support — ordering concern

**File:** `textResolver.ts` (commit `5fda4808`)

```typescript
// Switch array pattern: { switch: [...], default: "..." }
if (typeof label === 'object' && isSwitchArray(label)) {
    return evaluateSwitchArray(label, answers);
}

if (typeof label === 'string') {
    return resolveFinancialYearPlaceholders(label);
}
```

The switch-array check is added BEFORE the string check, which is correct. However, the `{ var: ... }` check that was already present (line above) runs first. If a switch object somehow also has a `var` key, it would be caught by the wrong branch. In practice, switch objects have `switch` + `default` keys, not `var`, so this is safe — but the function now handles 3 object shapes (`{ var }`, `{ switch }`, fallback) without explicit type discrimination.

**Severity:** Informational — no current risk, but adding a comment documenting the precedence would help future maintainers.

---

## UX Issues

### UX-1: BT Structure section always visible for BT cases (Advisory)

The BT Applicant Structure panel in `AddApplicant.svelte` is always visible when `isBTCase` is true, even after the user has filled all applicants matching the structure. Consider collapsing or dimming this section once the expected count matches the actual count, to reduce visual noise.

### UX-2: Female property warning shows for all secured loans

The `femalePropertyWarning` derived value shows whenever there are 2+ individual applicants with at least one female, and no female is marked `onProperty: true`. This is helpful but could be noisy for cases where the female applicant is not a property co-owner by design (e.g., income co-applicant only). The warning text mentions "stamp duty benefits" which is state-specific (Maharashtra, Delhi, Haryana offer it; many states don't). Consider making this state-aware.

### UX-3: Applicant type hints are hardcoded

The new hints on applicant type buttons (`'Salaried / Self-employed, Sole Proprietor'` and `'Pvt Ltd, Partnership, LLP, OPC, Trust'`) are hardcoded English strings, bypassing the i18n system. Since i18n keys exist for 3 languages, these should use `t()`.

**Severity:** Medium — breaks Hindi/Marathi users' experience.

### UX-4: Case Assessment wizard section added to all 6 loan types — good consistency

The new `caseIntakeQuestions.ts` shared module and wizard section additions across all 6 loan types are well-structured. The DSA guidance content is consistent. This is a positive pattern.

---

## Architecture & Code Quality

### ARCH-1: Shared `caseIntakeQuestions.ts` — Good Pattern

Centralizing case intake questions in `src/lib/config/schema/caseIntakeQuestions.ts` with a `buildCaseIntakePage(pageId)` factory is clean. All 6 loan types now import from the same source. This prevents drift and makes future changes (e.g., adding more assessment status options) a single-file edit.

### ARCH-2: `applicantRoleUtils.ts` — Well-structured

The role derivation utility is cleanly separated:
- Individual vs Company role logic is distinct and well-documented
- `needsFullFinancials()` / `needsCreditOnly()` provide clear semantic APIs
- `deriveUnsecuredDirectorRole()` correctly handles Private Limited/OPC vs Partnership/LLP distinction
- The `getRequiredTabs()` function ties roles to income tab requirements

One minor note: `getRequiredTabs` returns hardcoded string arrays. If tab IDs ever change in `incomeTabState.ts`, these would silently drift. Consider importing tab ID constants.

### ARCH-3: Removal of `q3_obligationsRunning` from commonPage.json — Correct

The redundant obligations question was already asked per-applicant in the income section. Removing it from the common page prevents double-asking. The removal is clean — no orphaned references found.

### ARCH-4: `OBLIGATION_IMPLIED_TYPES` narrowed in `UnsecuredObligation.svelte`

BT/Top-up types were removed from the auto-Yes obligation list. This is correct — BT/Top-up for unsecured loans does not necessarily mean the applicant has existing obligations with the *current* lender being applied to. Only DC types imply existing obligations.

### ARCH-5: Validation error messages improved across 3 secured loan pages

Home loan, LAP, and plot loan now show contextual validation errors with navigation hints (e.g., `'go to "Applicants" section'`). The pattern of auto-navigating to the error page (`currentPageIndex = applicantIdx`) is helpful. However, if multiple validation errors exist on different pages, only the LAST error's page navigation wins — the user may not see all errors.

### ARCH-6: Home loan BT page order updated

`btRegistry_homeLoan` was replaced with `propertyCharacter_homeLoan` + `complianceLegal_homeLoan` in the BT page order. This aligns BT flow with the new case intake + property character structure. The change is intentional and correct.

---

## Compliance with Project Conventions

| Convention | Status |
|-----------|--------|
| Server-side business logic | OK — role derivation is client-side UI concern, not business logic |
| No required PII | OK — no new PII fields added |
| Existing patterns first | OK — uses existing form system, optionResolver, iconRegistry |
| Income profiling untouched | OK — role engine gates tabs but doesn't simplify profiling |
| Immutable snapshots | OK — `__restoredFrom` is advisory, not overwriting audit trail |
| i18n | PARTIAL — applicant type hints bypass i18n (UX-3) |
| No Co-Authored-By | OK — not present in commits |
| Logger usage | OK — no bare console in new server code |

---

## Summary

| Category | Critical | Medium | Low | Info |
|----------|----------|--------|-----|------|
| Security | 0 | 0 | 0 | 0 |
| Bugs | 0 | 0 | 4 | 1 |
| UX | 0 | 1 | 3 | 0 |
| Architecture | 0 | 0 | 0 | 3 |

**Overall:** Clean batch of commits. The applicant role engine and case intake redesign are well-structured. The main actionable item is **UX-3** (i18n bypass for applicant type hints) which should be addressed before Hindi/Marathi users encounter it. All other items are low-severity or informational.

### Recommended Actions (Priority Order)

1. **UX-3**: Add i18n keys for applicant type hint strings
2. **BUG-3**: Strip `__restoredFrom` from restore snapshots to prevent nesting
3. **BUG-1**: Consider `$derived` for `btExistingStructure` sync
4. **UX-2**: Make female property warning state-aware (post-launch)
