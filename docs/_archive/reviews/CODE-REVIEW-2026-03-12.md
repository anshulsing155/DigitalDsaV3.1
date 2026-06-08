# Code Review — March 12, 2026

**Commits reviewed:** 1 new team commit since March 10 review
**Authors:** Anshul Singh (1)

| Commit     | Author       | Date   | Description                                                                                |
| ---------- | ------------ | ------ | ------------------------------------------------------------------------------------------ |
| `9f1b281e` | Anshul Singh | Mar 10 | Normalize singleton array RHS for equality operators + Plot Loan dynamic option generators |

---

## Review Result: CLEAN — No Issues Found

### What Changed

**3 files, 137 additions, 1 deletion:**

1. **`src/lib/server/formEngine/engine.ts`** (+16 lines)
   - In `transformJsonLogicToCustom()`, singleton array RHS values are now unwrapped for equality operators (`==`, `!=`, `===`, `!==`)
   - Fixes a real divergence: JSON Logic schemas sometimes encode `{"==":[{"var":"loanType"},["Plot Loan Only"]]}` — the server evaluates this as true via JS coercion, but the client `showWhen` engine uses strict equality and fails
   - Well-scoped: only targets equality ops, only single-element arrays, only RHS (index 1)

2. **`src/lib/server/formEngine/optionResolver.ts`** (+36 lines)
   - Adds 4 dynamic option generators for Plot Loan schema's location questions:
     - `q1_propertyStateName` → returns state options
     - `q2_propertyCityName` → derives cities from selected state
     - `q4_residenceStateName` → returns all state options
     - `q5_residenceCityName` → derives cities, excludes property city
   - All question IDs verified against `plot-loan-schema.json` ✓
   - Follows established patterns from Home Loan/LAP generators ✓
   - Correct bindsTo fallback chain (e.g., `answers['propertyStateName'] ?? answers['q1_propertyStateName']`) ✓

3. **`src/lib/testing/__tests__/showWhenTransform.test.ts`** (+85 lines, new file)
   - 2 integration tests using real schema + engine
   - Tests singleton array normalization for Plot Loan
   - Tests state/city option population for Plot Loan location selects
   - **Both tests pass** ✓

### Assessment

| Criteria                 | Status                                                             |
| ------------------------ | ------------------------------------------------------------------ |
| Security                 | No concerns — server-side only, no user input involved             |
| Correctness              | Singleton normalization is correct; option generators match schema |
| Conventions              | Follows existing patterns in `optionResolver.ts`                   |
| Test coverage            | Good — 2 meaningful integration tests added                        |
| Alignment with CLAUDE.md | Uses server-side patterns, no new dependencies                     |

### Minor Note (Not Actionable)

The singleton normalization only unwraps the RHS (argument index 1). If a schema ever wraps the LHS in a singleton array, that edge case is unhandled. This is extremely unlikely with JSON Logic `{"var":"..."}` references, so not worth adding complexity for.

---

## Previous Review Items — Status Tracker

### Resolved ✓

All items from previous reviews have been addressed:

| Review                             | # Items | Fixed In                | Status      |
| ---------------------------------- | ------- | ----------------------- | ----------- |
| CODE-REVIEW-2026-03-09 (19 items)  | 11      | `fb3c78fc`              | ✓ All fixed |
| CODE-REVIEW-2026-03-09-B (4 items) | 4       | `c1bb995d` + `3d5401cf` | ✓ All fixed |
| CODE-REVIEW-2026-03-10 (10 items)  | 10      | `3d5401cf`              | ✓ All fixed |

### Deferred (Known)

| Issue                                         | Status   | Decision                                      |
| --------------------------------------------- | -------- | --------------------------------------------- |
| `.env` in git history (19 secrets)            | Deferred | User decision: rotate credentials post-launch |
| Email service hardening (SMTP → SES/SendGrid) | Deferred | User decision: post-launch                    |

---

## Summary

**No new issues found.** Anshul's commit is well-crafted, correctly scoped, and properly tested. The codebase is in good shape with all previously flagged review items resolved.
