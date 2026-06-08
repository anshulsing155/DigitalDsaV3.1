# Code Review #2 — March 9, 2026 (Evening Batch)

**Commits reviewed:** 3 new non-Claude commits since morning review
**Authors:** Mrityunjay (2), Rishabh (1)

| Commit     | Author     | Description                                             |
| ---------- | ---------- | ------------------------------------------------------- |
| `1c612138` | Mrityunjay | Add RERA warning logic + CIBIL score placeholder        |
| `9d90e052` | Mrityunjay | Fix Legal & Seller page navigation + sub-page rendering |
| `28d6e2f6` | Rishabh    | Home loan common page icons                             |

---

## HIGH — Fix This Week

### 1. Income Profile Type Strings Are Wrong — Dynamic Guidance Is Dead Code

**Author:** Mrityunjay
**File:** `src/lib/config/wizardSections/homeLoan.ts` — around lines 700-720
**Confidence:** 87%

In `getDynamicGuidance` for the income details subsection, the profile type strings don't match the actual `IncomeProfileType` values from `profileCards.ts`. This means the conditional guidance branches **never execute** — DSAs get no contextual tips for business, professional, rental, or agriculture income types.

**What's written (wrong):**

```typescript
if (profiles.includes('self_employed_business')) { ... }     // ← never matches
if (profiles.includes('self_employed_professional')) { ... }  // ← never matches
if (profiles.includes('rental')) { ... }                      // ← never matches
if (profiles.includes('agriculture')) { ... }                 // ← never matches
```

**What the actual profile type values are** (from `profileCards.ts`):

```
business_proprietorship, business_partnership, director_company
professional_practice
rental_income
pension
agriculture_income
```

**Fix:**

```typescript
if (profiles.includes('business_proprietorship') || profiles.includes('director_company')) { ... }
if (profiles.includes('professional_practice')) { ... }
if (profiles.includes('rental_income')) { ... }
if (profiles.includes('agriculture_income')) { ... }
```

---

### 2. RERA Warning Is Advisory Only — Not a Form Gate

**Author:** Mrityunjay
**File:** `src/lib/config/wizardSections/homeLoan.ts` — around lines 164-167
**Confidence:** 92%

The RERA warning for under-construction projects without registration only shows as right-panel guidance text. A DSA can set `PropertyStage = Under Construction` and `reraRegistrationStatus = NOT_REGISTERED` and **advance the form** without any validation error or warning popup.

If the intent was just advisory text — this is fine. But if the intent was to **warn or block** when RERA isn't registered for UC projects, the implementation doesn't achieve that. The server schema already has a `reraRegistrationStatus` question — a `validationWarning` should be added there if blocking is needed.

**Question for Mrityunjay:** Was this intended as a soft advisory or should it actually prevent/warn the DSA from proceeding?

---

### 3. Bare `fetch()` for DELETE — CSRF Token Missing

**Author:** Mrityunjay (pre-existing, visible in modified file)
**File:** `src/routes/dashboard/dsa/cases/[case_id]/+page.svelte` — lines 202-207
**Confidence:** 100%

The `removeLender()` function uses bare `fetch()` for a `DELETE` request, bypassing CSRF protection. Every other mutation in this same file correctly uses `secureFetch()`. This one was missed.

**Fix (one line):**

```diff
- const res = await fetch(
+ const res = await secureFetch(
    `/api/cases/${caseData.case_id}/lender-applications/${lenderAppId}`,
    { method: 'DELETE' }
  );
```

> Note: `secureFetch` is already imported at line 4 of this file. Literally just change `fetch` → `secureFetch`.

---

### 4. Schema Icons May Not Be Synced to Server Copy

**Author:** Rishabh
**Files:** `src/lib/config/commonPage.json`, `src/lib/config/applicantBasicDetailsSecuredLoans.json`
**Confidence:** 85%

Icon fields (`"icon": "Home"`, `"icon": "TreePine"`, etc.) were added to client-side schema JSON files. Per project convention, schemas in `src/lib/config/` and `src/lib/server/formEngine/schemas/` must be updated **atomically**.

**Action:** Check if `applicantBasicDetailsSecuredLoans.json` has a server-side copy. If yes, add the same icon fields there. (`commonPage.json` appears to be client-only so that one may be fine.)

---

## MEDIUM — Track for Cleanup

### 5. `removeLender()` Has No Loading Guard — Double-Click Possible

**Author:** Mrityunjay
**File:** `src/routes/dashboard/dsa/cases/[case_id]/+page.svelte` — lines 195-221
**Confidence:** 83%

Unlike `addLender` (which has `addingLender` state boolean), `removeLender` has no loading state. The delete button can be clicked multiple times while the request is in flight.

**Fix:** Add a `removingLender` state:

```typescript
let removingLender = $state(false);

async function removeLender(lenderAppId: string) {
	if (removingLender) return;
	removingLender = true;
	try {
		/* existing logic */
	} finally {
		removingLender = false;
	}
}
```

---

### 6. `"Construction"` Icon May Not Exist in Lucide

**Author:** Rishabh
**File:** `src/lib/config/commonPage.json`
**Confidence:** 80%

Icon names `"Construction"` and `"HardHat"` were added. `HardHat` is valid Lucide, but `"Construction"` is not a standard Lucide icon name. If it's not in the icon registry, the icon silently won't render.

**Action:** Check `src/lib/utils/iconRegistry` for `"Construction"`. If missing, use `"HardHat"` or `"Building2"` instead.

---

### 7. `creditScore = 0` Falls Through All Guidance Branches

**Author:** Mrityunjay
**File:** `src/lib/config/wizardSections/homeLoan.ts` — around lines 749-762
**Confidence:** 82%

`getDynamicGuidance` checks `score >= 750`, then `score >= 650`, then `score > 0`. A score of exactly 0 (user typed 0 or field stored as 0) silently shows no guidance. Should add a fallback branch.

---

## LOW — Nice to Have

### 8. `formatINR()` Duplicated — Use Existing `formatCurrency()`

`src/routes/dashboard/dsa/cases/[case_id]/+layout.svelte` and `+page.svelte` both define identical `formatINR()` functions. The project already has `formatCurrency()` in `$lib/i18n` that handles ₹12.3L / ₹1.5Cr formatting. Remove the duplicates.

---

## Who Should Fix What

| Developer      | Items                                                                                                                            | Priority  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **Mrityunjay** | #1 (profile type strings), #2 (RERA intent clarification), #3 (CSRF fix), #5 (loading guard), #7 (score=0), #8 (formatINR dedup) | This week |
| **Rishabh**    | #4 (schema sync check), #6 (Construction icon check)                                                                             | This week |

---

## Status of Previous Review Items (Morning Batch)

For reference, the morning review (`CODE-REVIEW-2026-03-09.md`) identified 12 items. The Claude commit `fb3c78fc` ("fix: implement code review findings") addressed 11 of those. Remaining open:

| #   | Issue                                | Status                                                                 |
| --- | ------------------------------------ | ---------------------------------------------------------------------- |
| 1   | `.env` tracked in git                | **STILL OPEN** — needs admin action to untrack + rotate credentials    |
| 2   | Missing CSRF on dashboard PATCH/POST | **PARTIALLY FIXED** — DELETE still uses bare `fetch()` (item #3 above) |
