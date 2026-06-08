# Code Review — March 12, 2026 (B) — Sessions 17–22

**Commits reviewed:** 10 code commits, 8 docs-only skipped
**Period:** `91405769` through `b269b8ef`
**Reviewers:** 5 parallel code-reviewer agents, deduplicated + merged

| Commit     | Description                                                     |
| ---------- | --------------------------------------------------------------- |
| `91405769` | feat: income profile tracker, CIBIL layout, financial table fix |
| `eae281db` | feat: pincode typeahead, task system, dropdown fix, dashboard   |
| `b6d17e8b` | fix: Tier 1 broken code — 9 schema fixes + AgreeModal           |
| `9ba32f3a` | fix: Tier 2 wrong questions — 12 showWhen fixes                 |
| `a35a868c` | fix: Tier 3 missing logic — 14 conditional fixes + enricher     |
| `cc59f6d7` | fix: Tier 4 quality — 13 schema polish fixes                    |
| `a046c90f` | fix: customer testing — dropdown clipping, pincode blocking     |
| `e9b50b35` | fix: LAP/Plot audit — area type gating, NRI labels              |
| `fd75574f` | feat: LAP questionnaire redesign                                |
| `b269b8ef` | feat: Plot Loan questionnaire redesign                          |

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| CRITICAL  | 3      |
| HIGH      | 8      |
| MEDIUM    | 3      |
| LOW       | 2      |
| **Total** | **16** |

**Clean commits:** `9ba32f3a` (Tier 2), `cc59f6d7` (Tier 4), `e9b50b35` (LAP/Plot audit)

---

## CRITICAL — Fix Immediately

### 1. "Clear Samples" button — wrong endpoint + no CSRF

**Commit:** `eae281db` | **Confidence:** 100%
**File:** `src/routes/dashboard/dsa/+page.svelte`, line 413

Two bugs in one line. Calls `POST /api/cases/clear-samples` which does not exist (actual: `DELETE /api/cases/sample-data`), AND uses bare `fetch` instead of `secureFetch`. Every new DSA who clicks "Clear Samples" gets a silent 404. Feature is completely broken.

```diff
- const res = await fetch('/api/cases/clear-samples', { method: 'POST' });
+ const res = await secureFetch('/api/cases/sample-data', { method: 'DELETE' });
```

---

### 2. Plot Loan edit mode renders blank form

**Commit:** `b269b8ef` | **Confidence:** 100% (found by 2 independent agents)
**File:** `src/routes/(app)/form/plot-loan/+page.svelte`, line 567

`selectedLoan` hardcoded to `'Plot and Construction Loan'` in edit mode, but all Plot data is stored under key `'Plot Loan'`. `currentAnswers` (line 272) reads from the wrong key → `{}` → blank form. Additionally, `'Plot and Construction Loan'` is NOT in `schemaLoader.ts`'s `mainSchemaMap` — evaluation may throw.

Compare: LAP (line 292) and Home Loan (line 628) both correctly match their edit-mode key.

```diff
- selectedLoan = 'Plot and Construction Loan'; // Plot-specific
+ selectedLoan = 'Plot Loan'; // matches commonPage.json loanName value
```

---

### 3. payloadEnricher backward compat reads from always-undefined path

**Commit:** `a35a868c` | **Confidence:** 95%
**File:** `src/lib/ruleEngine/payloadEnricher.ts`, lines 259, 266, 273

`LoanApplicationPayload` has two top-level keys: `loanTransaction` and `allApplicantDetails`. The enriched payload spread does NOT hoist nested properties. Three reads are always `undefined`:

```typescript
const creditHistory = enriched.creditHistoryStatus; // line 259 — undefined
const compliance = enriched.propertyComplianceStatus; // line 266 — undefined
const incomeDocs = enriched.incomeDocAvailable; // line 273 — undefined
```

Impact:

- `approvedByAuthority` + `asPerMap`: **never derived**. Bank rules gating on authority approval silently receive `undefined` — legitimate loans may fail eligibility.
- `payslips` + `Form16Available`: **never derived**. Personal loan salaried-income rules are blind to these.
- `isDefaulter` + `madeGuarantor`: mitigated by per-applicant aggregation at lines 586-597 (dead code, not a live regression).

**Fix:** Move block below line 283 where `const lt = enriched.loanTransaction` is defined, and read/write from `lt`:

```typescript
const compliance = lt?.propertyComplianceStatus as string | undefined;
if (compliance && !lt.approvedByAuthority) {
	lt.approvedByAuthority = compliance === 'not_authorized' ? 'No' : 'Yes';
	lt.asPerMap = compliance === 'fully_compliant' ? 'Yes' : 'No';
}
const incomeDocs = lt?.incomeDocAvailable as string | undefined;
if (incomeDocs && !lt.payslips) {
	lt.payslips = ['both', 'payslips_only'].includes(incomeDocs) ? 'Yes' : 'No';
	lt.Form16Available = ['both', 'form16_only'].includes(incomeDocs) ? 'Yes' : 'No';
}
```

---

## HIGH — Fix This Week

### 4. `navBarReserve` double-subtracted in dropdown height

**Commit:** `a046c90f` | **Confidence:** 95%
**File:** `src/lib/components/CustomSelect.svelte`, lines 62 + 75

`navBarReserve` (70px) is subtracted once when defining `spaceBelow` (line 62), then subtracted again in `dropdownMaxHeight` (line 75). Result: dropdown forced to 100px minimum far more often than intended.

```diff
// Line 75 — remove redundant subtraction
- dropdownMaxHeight = Math.min(spaceBelow - gap - navBarReserve - viewportPadding, maxAllowed);
+ dropdownMaxHeight = Math.min(spaceBelow - gap - viewportPadding, maxAllowed);
```

---

### 5. Single `pincodeError` shared across two pincode fields

**Commit:** `a046c90f` | **Confidence:** 88%
**Files:** `form/lap/+page.svelte` (lines 188, 1256) + `form/plot-loan/+page.svelte` (lines 263, 1283)

`propertyIdentificationPage` has two pincode fields (`propertyPincode` + `residencePincode`). Both write to the same `pincodeError` state. When the DSA types in the second field, it emits `onerror('')`, clearing the first field's error. The Next button re-enables despite an invalid property pincode.

**Fix:** Replace single string with per-field error map:

```typescript
let pincodeErrors = $state<Record<string, string>>({});
// isNextEnabled check: Object.values(pincodeErrors).some(e => e)
// template: onerror={(err) => { pincodeErrors[question.bindsTo] = err; }}
```

---

### 6. Construction sidebar always visible for Plot Loan Only

**Commit:** `b269b8ef` | **Confidence:** 85% (found by 2 independent agents)
**File:** `src/lib/config/wizardSections/plotLoan.ts`, lines 155-180

The `construction` subsection has no `showWhen`. Schema page correctly gates itself, but sidebar "Construction" label is always visible. DSAs with "Plot Loan Only" see a nav item leading to a hidden page.

```typescript
showWhen: (answers) => {
    const lt = answers['loanType'] as string;
    return lt === 'Plot & Construction Loan' || lt === 'Construction Loan Only';
},
```

---

### 7. `constructionProgress` visible before `constructionType` selected

**Commit:** `b269b8ef` | **Confidence:** 90%
**File:** `scripts/build-plot-schema.cjs`, lines 321-327 (and generated JSON)

For new loans (`PlotLoanActivity != 'Balance Transfer Only'`), the `or` evaluates to `true` immediately. `constructionProgress` appears without context.

**Fix:** Gate first branch on `constructionType != ''`:

```json
{
	"and": [
		{ "!=": [{ "var": "PlotLoanActivity" }, "Balance Transfer Only"] },
		{ "!=": [{ "var": "constructionType" }, ""] }
	]
}
```

---

### 8. `creditHistoryStatus` icons semantically inverted — 4 schemas

**Commit:** `b6d17e8b` | **Confidence:** 90%
**Files:** plot/personal/business/professional-loan-schema.json (+ server copies = 8 files)

"Clean record" → `ThumbsDown`, "Defaulter/Guarantor" → `ThumbsUp`. Backwards vs every other Yes/No in the codebase.

**Fix:** `clean` → `ThumbsUp` (or `CheckCircle`), adverse options → `AlertTriangle`.

---

### 9. Bare `console.error` in LAP + Plot submit paths

**Commits:** `fd75574f` + `b269b8ef` | **Confidence:** 90%
**Files:** `form/lap/+page.svelte:889`, `form/plot-loan/+page.svelte:896,950`

Unguarded `console.error()` in submit handlers. All other loan types use `if (dev)`.

**Fix:** Wrap in `if (dev) console.error(...)`.

---

### 10. Tasks API — status param unvalidated + NaN limit passthrough

**Commit:** `eae281db` | **Confidence:** 82%
**File:** `src/routes/api/tasks/+server.ts`, lines 28-38

Any string as `?status=INVALID` silently returns empty 200. And `parseInt('abc')` → `NaN` → `Math.min(50, NaN)` → `NaN` → MongoDB `.limit(NaN)` returns all documents.

**Fix:** Validate status against enum, fallback limit to 10 on NaN.

---

### 11. Bare `fetch` for broadcasts — convention violation

**Commit:** `eae281db` | **Confidence:** 85%
**File:** `src/routes/dashboard/dsa/+page.svelte`, line 261

Uses bare `fetch` instead of `secureFetch`. Same file correctly uses `secureFetch` at line 273 for tasks.

**Fix:** `const broadcastP = secureFetch('/api/dsa/broadcasts')`

---

## MEDIUM

### 12. `loanName` not forwarded to IncomeProfileSelector

**Commit:** `91405769` | **Confidence:** 83%
**File:** `src/lib/components/IncomeTabContent.svelte`, lines 72-78

`IncomeTabContent` receives `loanType` prop but doesn't pass it as `loanName` to `IncomeProfileSelector`. Profile card reordering by loan relevance silently does nothing.

**Fix:** Add `loanName={loanType}` to the component.

---

### 13. `ApplicantIsNRI` case inconsistency across schemas

**Pre-existing (not corrected in these commits)** | **Confidence:** 85%
**File:** `src/lib/config/personal-loan-schema.json`, lines 155-156

Personal loan uses `ApplicantIsNRI` (capital A), business/professional use `applicantIsNRI` (lowercase). Cross-loan-type NRI checks miss personal loan applicants.

---

### 14. Dead intermediate assignment in Plot build script

**Commit:** `b269b8ef` | **Confidence:** 85%
**File:** `scripts/build-plot-schema.cjs`, lines 168-175

`propTypeQ.showWhen` assigned twice — first with `propertyComplianceStatus` gate, immediately overwritten. If the compliance gate was intentional, it's silently lost.

---

## LOW

### 15. Backward compat block positioned before `const lt` definition

**Commit:** `a35a868c` | **Confidence:** 95%
**File:** `src/lib/ruleEngine/payloadEnricher.ts`, lines 258-277 vs 283

Structurally encourages reading from wrong path. Related to Critical #3.

### 16. No test coverage for backward compat derivations

**Commit:** `a35a868c` | **Confidence:** 92%
**File:** `src/lib/testing/__tests__/ruleEngine/payloadEnricher.test.ts`

Zero tests for `propertyComplianceStatus → approvedByAuthority`, `incomeDocAvailable → payslips`, or `creditHistoryStatus → isDefaulter`. Root cause of Critical #3 not being caught before merge.

---

## Verified Clean — No Issues

| Area                                | Status                                                       |
| ----------------------------------- | ------------------------------------------------------------ |
| `9ba32f3a` (Tier 2 showWhen)        | All `in` operator usage correct                              |
| `cc59f6d7` (Tier 4 quality)         | Label/option corrections only, no logic changes              |
| `e9b50b35` (LAP/Plot audit)         | Area type gating, NRI labels, validation correct             |
| Schema sync                         | All 4 schema pairs match across both locations               |
| `schemaLoader.ts`                   | `'Plot Loan'` and `'Loan Against Property'` mapped correctly |
| `payloadGrouping.ts`                | All new page IDs registered                                  |
| `showWhen` arrays                   | All use `in` operator throughout                             |
| `"New Loan"` enum                   | Used correctly in all schemas                                |
| `{@html pageDescription}`           | Schema-sourced, not user input — not XSS                     |
| LAP edit mode                       | `selectedLoan = 'Loan Against Property'` matches normal mode |
| `constructionDetails_Plot` showWhen | Correctly uses `in` against loan type array                  |
| NRI text updates                    | GPA (General Power of Attorney) mentioned correctly          |

---

## Previous Review Items — Status

### Still Open from Earlier Reviews

| #   | Issue                                             | Status                                       |
| --- | ------------------------------------------------- | -------------------------------------------- |
| 1   | Bare fetch in file-builder (CSRF)                 | 2 bare POST calls remain                     |
| 2   | Login redirect missing property_consultant        | Works via fallback, not explicit             |
| 3   | Professional Practice income profile hidden       | No `loanCategory` override                   |
| 4   | Income Profile Type Strings in getDynamicGuidance | `'salaried'` instead of `'salaried_regular'` |
