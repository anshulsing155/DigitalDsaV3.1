# Code Review: 27 Commits (df70ae02..de9d9cc0)

**Date:** 2026-04-03
**Reviewer:** Claude (automated daily review)
**Scope:** All commits since last review (`c750bf5d`)

## Executive Summary

27 commits reviewed covering director management UX, applicant dedup fixes, submit validation, company type handling, and E2E testing infrastructure. **No critical issues found.** 3 moderate issues and 9 minor issues identified.

---

## Moderate Issues (3)

### M1: String-prefix heuristic for director field locking (`0f26f81c`)

**File:** `directorFormUtils.ts` / `DirectorFormModal.svelte`
**Issue:** Cross-company match detection uses `match.source?.startsWith('Director of ')` — a display string — to decide whether to lock fields. If the label text changes (localization, wording tweak), locking silently breaks.
**Fix:** Add a typed discriminator `matchType: 'crossCompany' | 'live' | 'recovery'` on the match object.

### M2: Director restore handler duplicated across 3 secured loan pages (`bdda96fe`)

**Files:** `home-loan/+page.svelte`, `lap/+page.svelte`, `plot-loan/+page.svelte`
**Issue:** ~35 identical lines building `restoreData`, checking `wasSameCompany`, calling `applyDirectorRestore` are copy-pasted across all 3 secured loan pages. Any change to the restore shape requires updating all 3 files in lockstep.
**Fix:** Extract into a shared utility (e.g., `directorRestoreUtils.ts`).

### M3: onEMI/onProperty no longer force-set for Partnership/LLP/OPC (`382ec566`)

**Files:** Rule engine consumers (`payloadEnricher.ts`, `incomeAssessor.ts`, `emiShareCalculator.ts`)
**Issue:** Previously, Partnership/LLP/OPC directors always had `onEMI: 'false'`. Now these fields can be empty/undefined. Any downstream code that assumed they were always defined could produce incorrect rule engine or EMI calculations.
**Action needed:** Audit `payloadEnricher.ts`, `incomeAssessor.ts`, and `emiShareCalculator.ts` for unguarded `onEMI`/`onProperty` access on these company types.

---

## Minor Issues (9)

| # | Commit | Issue | Impact |
|---|--------|-------|--------|
| 1 | `63893ab0` | Inconsistent id-less applicant handling: `replaceApplicants` keeps them, `commitDirectorsToApplicants` drops them | Data loss edge case |
| 2 | `4b66a27c` | Lender `application_id` dedup counter is order-dependent; if persisted, IDs shift across re-evaluations | Audit trail confusion |
| 3 | `79aaff03` | `isPrefixMatch()` is now dead code (all callers removed in `3ded3e24`); JSDoc example "raj matches raju" is wrong given min-4 rule | Dead code + wrong docs |
| 4 | `10e74d26` | Disabled fields now included in `getVisibleQuestions()` — validation may flag required disabled fields | False validation errors |
| 5 | `158ef781` | `as any[]` cast on modal matches bypasses type safety | Type debt |
| 6 | `47ae3146` | OPC ownership fix branch runs before count fix branch; simultaneous issues may not resolve in one pass | Ordering edge case |
| 7 | `68befbc2` | 12x `!important` CSS overrides in director modal scoped styles | Maintainability |
| 8 | `bdda96fe` | Bidirectional prefix matching in recovery bin could match "Raj" (3-char) to "Rajesh Kumar" — common Indian name prefixes | False positive UX |
| 9 | `a2363d07` | Company applicants skipped in submit validation, but no Company-specific validation added | Validation gap |

---

## OK / Clean Commits (15)

| Commit | Description | Notes |
|--------|-------------|-------|
| `de9d9cc0` | Allow up to 4 consecutive same chars in company name | Reasonable relaxation for Indian names |
| `481456f5` | Reset director count on OPC exit | Correct — checks previous type was OPC |
| `a93e8d09` | Display-level dedup guard | Good defensive layer before root cause fix |
| `9a7526e7` | Full page reload landing/dashboard boundary | More secure — hooks.server.ts runs fresh |
| `3ded3e24` | Remove prefix matching from live applicants | Correct — prevents false field locking |
| `75affdfb` | Revert company type on picker cancel | Well-thought-out cancel flow |
| `8cc8472f` | Show disabled director count for OPC | Clean UX improvement |
| `e26ff134` | Rebuild itrAnswers on GST/vintage change | Clean reactive rebuild with untrack guard |
| `c933bf68` | Hide "No Current Income" when earning profiles exist | Correct exclusive card logic |
| `903a3fd1` | RestoreApplicantModal native dialog | Final state is architecturally sound |
| `9ca9b6ce` | Validate director/partner count per company type | Correct boundary validation |
| `92081b5c` | E2E testing — all 6 loan types | Infrastructure, no production code risk |
| `5c47ab39` | Visual test runner + icon crash fix | Good defensive fix for icon-as-string |
| `df70ae02` | Director bugs + unsecured onEMI + obligation split | Broad fix batch, all correct |
| `85dd0460` | Session 50 handoff docs | Documentation only |

---

## Process Observations

1. **Z-index churn:** 4 commits (`903a3fd1`, `8795ca57`, `24570e5b`, `7aabc6b1`) to resolve RestoreApplicantModal stacking, ending with `<dialog>` which makes z-index moot. The native dialog approach should have been tried first.

2. **Prefix matching iteration:** 3 commits (`79aaff03` → `3ded3e24` → `0f26f81c`) to get matching right, with `79aaff03`'s tightened logic immediately rendered dead by the next commit. Consider more upfront design for matching heuristics.

---

## Security Assessment

**No security vulnerabilities found.** Notable positives:
- Full page reload at auth boundaries (`9a7526e7`) ensures `hooks.server.ts` runs fresh
- Company name validation relaxation (`de9d9cc0`) is bounded (max 4 consecutive, other guards intact)
- No new PII exposure, no credential changes, no auth bypass paths

---

## Recommended Actions (Priority Order)

1. **Audit rule engine for empty onEMI/onProperty** on Partnership/LLP/OPC directors (M3)
2. **Extract director restore handler** to shared utility (M2)
3. **Replace string-prefix match detection** with typed discriminator (M1)
4. **Remove dead `isPrefixMatch` function** or annotate as deprecated (Minor 3)
5. **Verify validation skips disabled fields** after `disabledWhen` change (Minor 4)
