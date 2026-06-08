# Code Review — March 12, 2026 (C) — Post-Fix Verification

**Previous review:** `CODE-REVIEW-2026-03-12-B.md` — 16 issues found
**New commits since B review:** 3

| Commit     | Description                                                            |
| ---------- | ---------------------------------------------------------------------- |
| `b8e2ab6c` | feat: code review fixes + server-on-next-only + unsecured loan rebuild |
| `7075a50d` | fix: resolve 7 test failures + implement FR-01/FR-02 customer feedback |
| `b9b224d0` | getPropertyLocation has been fixed in applicantProfilePage             |

---

## Previous Issues — Fix Verification

| #     | Issue (from B review)                        | Status           | Notes                                                                 |
| ----- | -------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| 1     | Clear-samples wrong endpoint + no CSRF       | ✅ **FIXED**     | Now uses `secureFetch` + correct `DELETE /api/cases/sample-data`      |
| 2     | Plot edit mode blank form                    | ✅ **FIXED**     | `selectedLoan = 'Plot Loan'` — correct                                |
| 3     | payloadEnricher wrong path                   | ✅ **FIXED**     | Now reads from `lt` (loanTransaction), + 7 new tests added            |
| 4     | navBarReserve double-subtracted              | ✅ **FIXED**     | Single subtraction, correct calculation                               |
| 5     | Construction sidebar no showWhen             | ⚠️ **NEW BUG**   | `showWhen` added but uses `&` — schema uses `and` — see Issue 1       |
| 6     | Bare console.error LAP + Plot                | ⚠️ **PARTIAL**   | LAP fixed. **Plot still unguarded** — see Issue 2                     |
| 7     | Tasks API validation                         | ✅ **FIXED**     | Status validated against allowlist, NaN limit handled                 |
| 8     | Credit history icons inverted                | ⚠️ **PARTIAL**   | Unsecured schemas fixed. **Plot schema still inverted** — see Issue 3 |
| 9     | Bare fetch broadcasts                        | ❌ **NOT FIXED** | See Issue 4                                                           |
| 10    | constructionProgress before constructionType | ❓ Not verified  | Schema may have been regenerated                                      |
| 11    | loanName → IncomeProfileSelector             | ✅ **FIXED**     | All 5 form pages now pass `loanName` prop                             |
| 12    | pincodeError shared across fields            | ❓ Not verified  | May need separate check                                               |
| 13-16 | Lower priority items                         | —                | Not in scope for this fix pass                                        |

**Score: 6 of 9 targeted issues fully resolved.**

---

## Remaining + New Issues

### Issue 1 — Construction sidebar `showWhen` value mismatch (NEW BUG)

**Commit:** `b8e2ab6c` | **Confidence:** 88%
**File:** `src/lib/config/wizardSections/plotLoan.ts`, lines 160-163

The fix added `showWhen` but uses the wrong string values. The sidebar checks for `'Plot & Construction Loan'` (ampersand), but the form schema stores `'Plot and Construction Loan'` (word "and"). Confirmed by the submit path at `plot-loan/+page.svelte` line 933: `loanType: 'Plot and Construction Loan'`.

Result: the Construction sidebar entry will **never** appear, even for Plot & Construction loans.

```diff
  showWhen: (answers) => {
      const lt = answers['loanType'] as string | undefined;
-     return lt === 'Plot & Construction Loan' || lt === 'Construction Loan Only';
+     return lt === 'Plot and Construction Loan' || lt === 'Construction Loan Only';
  },
```

---

### Issue 2 — Bare `console.error` in Plot submit path (UNFIXED)

**Confidence:** 100% (confirmed by both agents)
**File:** `src/routes/(app)/form/plot-loan/+page.svelte`, line 921

LAP was fixed (`if (dev) console.error(...)` at line 914). Plot was missed.

```diff
  if (validationErrors.length > 0) {
-     console.error('Validation errors:', validationErrors);
+     if (dev) console.error('Validation errors:', validationErrors);
      submitError = 'Please fill all required fields: ' + validationErrors.join(', ');
```

---

### Issue 3 — Credit history icons still inverted in Plot schema (MISSED)

**Confidence:** 97%
**Files:** `src/lib/config/plot-loan-schema.json` + `src/lib/server/formEngine/schemas/plot-loan-schema.json`, lines 30-48

`b8e2ab6c` fixed the unsecured schemas (personal/business/professional) but missed Plot. "Clean record" still shows `ThumbsDown`, adverse options still show `ThumbsUp`.

```diff
- { "label": "None — clean record", "icon": "ThumbsDown" }
- { "label": "Yes — involved in default...", "icon": "ThumbsUp" }
+ { "label": "None — clean record", "icon": "ThumbsUp" }
+ { "label": "Yes — involved in default...", "icon": "AlertTriangle" }
```

Update both schema locations atomically.

---

### Issue 4 — RM broadcasts bare `fetch` POST (UNFIXED)

**Confidence:** 100%
**File:** `src/routes/dashboard/rm/broadcasts/+page.svelte`, line 51

State-changing POST on a dashboard route uses bare `fetch` without CSRF token. `secureFetch` is not even imported.

```diff
+ import { secureFetch } from '$lib/utils/csrf';
  // ...
- const res = await fetch('/api/rm/broadcasts', {
+ const res = await secureFetch('/api/rm/broadcasts', {
      method: 'POST',
```

---

### Issue 5 — `getCityOptions` filter uses wrong data source (NEW)

**Commit:** `b9b224d0` | **Confidence:** 88%
**File:** `src/lib/components/ApplicantProfilePage.svelte`, lines 336-339 + 592

`b9b224d0` added `getPropertyLocation()` helper to read property city/state from the correct `loanData` path. But the actual filters in `getCityOptions` and the state dropdown still reference `formState.applicationData.propertyCityName` / `.propertyStateName` — which are not declared in the `ApplicationData` Zod schema and only work via `catchall(z.any())` smuggling.

```diff
  // getCityOptions filter — line 336-339
- .filter((cities) => cities.label !== formState.applicationData.propertyCityName)
+ .filter((cities) => cities.label !== getPropertyLocation().city)

  // State dropdown — line 592
- .filter((state) => state.label !== formState.applicationData.propertyStateName)
+ .filter((state) => state.label !== getPropertyLocation().state)
```

---

## Items Verified Clean

| Item                                      | Status                                             |
| ----------------------------------------- | -------------------------------------------------- |
| `getPropertyLocation()` logic             | Correct — reads from `loanData[loanName]` properly |
| payloadEnricher.test.ts — 7 new tests     | All test real derivation paths, correct assertions |
| Tasks API status + limit validation       | Correct allowlist + NaN fallback                   |
| All 5 form pages `loanName` prop          | Correctly forwarded                                |
| Schema sync (plot + LAP)                  | Both locations match                               |
| `b9b224d0` ApplicantProfilePage structure | `getPropertyLocation` approach is sound            |
| `7075a50d` test fixes                     | 7 test failures resolved, FR-01/FR-02 implemented  |

---

## Action Summary

5 remaining issues — all straightforward one-line fixes:

| #   | Severity   | Fix                                               | Est.              |
| --- | ---------- | ------------------------------------------------- | ----------------- |
| 1   | **HIGH**   | plotLoan.ts: `&` → `and`                          | 1 line            |
| 2   | **HIGH**   | plot-loan/+page.svelte: add `if (dev)`            | 1 line            |
| 3   | **HIGH**   | plot-loan-schema.json × 2: swap icons             | 4 lines × 2 files |
| 4   | **HIGH**   | rm/broadcasts: import + use `secureFetch`         | 2 lines           |
| 5   | **MEDIUM** | ApplicantProfilePage: use `getPropertyLocation()` | 2 lines           |
