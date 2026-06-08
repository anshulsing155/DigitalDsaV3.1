# Code Review — 2026-03-16

**Scope:** 2 commits from `c68b90fa` to `2078fbff` + uncommitted working tree (9 files)
**Period:** March 15–16, 2026 (Session 28)
**Reviewer:** Automated daily review

---

## Executive Summary

Session 28 covered: (1) plot loanType fix, (2) applicant restoration threshold bug fix, (3) wizard dynamic guidance for 5 non-home loan types, (4) unsecured loan form audit with page reorder, completion fix, and obligations bug fix. Plus uncommitted professional/business loan refinements.

**Verdict:** 2 HIGH bugs that block Debt Consolidation loan path, 2 HIGH schema gaps in professional loan, 3 MEDIUM consistency issues, 4 LOW items. **11 total action items.**

---

## 1. HIGH — Obligations Page Blocks Next Button for Debt Consolidation Path

**Files:** `src/lib/utils/incomeTabState.ts:124-133`, `src/lib/config/commonPage.json:706-725`
**Commit:** `2078fbff`

Two interlocking issues create a dead-end for Debt Consolidation users:

**Root cause A:** `q3_obligationsRunning` in `commonPage.json` only shows when `loanType == "New Loan"` or `unSecureLoanType == "Drop-line OverDraft (DOD)"`. When `loanType` is `"Debt Consolidation"`, this question is never shown, so `ObligationsRunning` is never set.

**Root cause B:** `computeSectionCompletion` in `incomeTabState.ts` only computes `obligations_details` when `applicant.ObligationsRunning === 'Yes'`. But the `obligationsPage` schema `showWhen` fires for DC types regardless — showing the page but leaving Next permanently disabled (completion key is never set → `false`).

**Impact:** Any DSA selecting "Debt Consolidation" or "Debt Consolidation with Extra Funds" for Business or Professional loans hits an unresolvable dead end at the obligations page.

**Fix:** Either:

- Add DC loan types to `q3_obligationsRunning` showWhen in `commonPage.json`, OR
- In `computeSectionCompletion`, also compute `obligations_details` when `loanType` is a DC variant, OR
- For DC types, auto-set `ObligationsRunning = "Yes"` (since DC implies existing obligations)

---

## 2. HIGH — `__individualApplicantCount` Never Populated

**Files:** `src/lib/config/wizardSections/businessLoan.ts:203`, `src/lib/config/wizardSections/professionalLoan.ts:172`
**Commit:** `c68b90fa` / uncommitted

The `relationships` wizard subsection uses:

```typescript
showWhen: (answers) => (answers['__individualApplicantCount'] as number) > 1;
```

But neither the business-loan nor professional-loan Svelte pages populate `__individualApplicantCount` in their `combinedAnswers`. Only `__applicantCount` is set. The relationships sidebar step will **never** appear, even with multiple individual co-applicants.

**Fix:** Either populate `__individualApplicantCount` in both Svelte pages, or change the wizard showWhen to use `__applicantCount`.

---

## 3. HIGH — Professional Loan Schema Missing `__multiApplicantMode` Guards

**File:** `src/lib/config/professionalLoan/pages.ts:65-97`
**Commit:** `2078fbff` / uncommitted

`buildIncomeProfilesPage()`, `buildIncomeDetailsPage()`, `buildCreditScorePage()`, and `buildObligationsPage()` are all called without the `{ "!=": [{ var: "__multiApplicantMode" }, true] }` guard that `businessLoan/pages.ts` correctly applies. In multi-applicant mode, both the standalone income/credit pages AND the per-applicant income steps would be visible simultaneously — creating duplicate data entry paths.

**Fix:** Mirror the business loan pattern — pass the `__multiApplicantMode` guard to all four shared page builders.

---

## 4. HIGH — `q6_banksOfCurrentAccount` Permanently Hidden in Professional Loan

**File:** `src/lib/config/professionalLoan/questionBank/location.ts:87-114`
**Commit:** uncommitted

The bank accounts question gates on `employmentType == "Self-employed(Professional)"`, but the professional loan schema never sets `employmentType` — it uses `practiceType`, `professionalCategory`, etc. This question will never appear for any professional loan applicant.

**Fix:** Replace the `employmentType` condition with `practiceType`:

```typescript
showWhen: {
	and: [
		{ in: [{ var: 'practiceType' }, ['own_practice', 'both', 'consulting']] },
		{ '!=': [{ var: 'businessStateName' }, ''] },
		{ '!=': [{ var: 'businessCityName' }, ''] }
	];
}
```

---

## 5. MEDIUM — Qualification/Council Questions Show All Options Regardless of Profession

**File:** `src/lib/config/professionalLoan/questionBank/professionalProfile.ts:82-183`
**Commit:** `c68b90fa`

`q2_professionalQualification` and `q3_registrationCouncilType` show ALL options (doctor, CA, architect, lawyer qualifications) regardless of which `professionalCategory` was selected. A CA sees "MBBS / BDS", a lawyer sees "CA Final / ICAI Member", etc.

**Fix:** Add per-option `showWhen` filtering based on `professionalCategory`.

---

## 6. MEDIUM — Credit-Behaviour Dynamic Guidance Creates Near-Duplicate Messages

**Files:** `src/lib/config/wizardSections/businessLoan.ts:403-423`, `professionalLoan.ts:373-393`
**Commit:** `c68b90fa`

`getDynamicGuidance` returns `watchFor`/`proTips` arrays that get **appended** to base arrays by `FormShell.svelte` merge logic. For credit-behaviour, the base already has score-related tips, and the dynamic guidance adds similar score-band-specific tips — resulting in near-duplicate messages (e.g., base: "Business loan applicants need 700+ CIBIL" + dynamic: "Below 700 — limited to select lenders").

**Fix:** Either clear the base `watchFor`/`proTips` for credit-behaviour (since dynamic guidance handles all bands), or have `getDynamicGuidance` return a `replace: true` flag.

---

## 7. MEDIUM — `selectedIncomeProfiles` Cast Without `Array.isArray` Check

**Files:** `src/lib/config/wizardSections/businessLoan.ts:361`, `professionalLoan.ts:331`
**Commit:** `c68b90fa`

```typescript
const profiles = a['selectedIncomeProfiles'] as string[];
if (profiles) { profiles.includes(...) }
```

If `selectedIncomeProfiles` were somehow a string instead of an array, `String.prototype.includes` would match differently. Defensive check should use `Array.isArray(profiles)`.

---

## 8. LOW — Dead Import `sharedApplicantProfilePage`

**Files:** `src/lib/config/professionalLoan/pages.ts:13`, `businessLoan/pages.ts:11`
**Commit:** `2078fbff`

`buildApplicantProfilePage` is imported as `sharedApplicantProfilePage` but never called in either file. Creates false impression of an ApplicantProfile page in the schema.

---

## 9. LOW — `registrationStatus: "renewal_pending"` Has No Warning

**File:** `src/lib/config/professionalLoan/questionBank/professionalProfile.ts:336-350`
**Commit:** `c68b90fa`

The `q6_registrationStatus` question warns for `"expired"` but not `"renewal_pending"`. Most banks require active registration at approval time — DSAs should get a heads-up for pending renewals too.

---

## 10. LOW — `console.log` in Dev Block Violates Logger Convention

**Files:** Both unsecured loan Svelte pages
**Pre-existing** (visible in diff context)

Project rule says "Never use bare `console`" — use `logger` from `$lib/server/logger`. These are gated behind `if (dev)` so they won't reach production, but they violate the convention.

---

## 11. LOW — `commonPage.json` Two-Copy Sync: VERIFIED IN SYNC

Both `src/lib/config/commonPage.json` and `src/lib/server/formEngine/schemas/commonPage.json` are byte-for-byte identical. No sync issue.

---

## Security Assessment

No security vulnerabilities found in the reviewed changes. All modifications are configuration/schema changes (wizard sections, question banks, page definitions). No server routes, auth logic, PII handling, or `{@html}` rendering was touched. The anti-scraping hardening from Session 27 remains intact.

---

## Priority Action Items

| #   | Severity | Issue                                                                   | Effort |
| --- | -------- | ----------------------------------------------------------------------- | ------ |
| 1   | HIGH     | Fix Debt Consolidation dead-end (obligations completion + showWhen)     | 1hr    |
| 2   | HIGH     | Populate `__individualApplicantCount` or fix wizard showWhen            | 30min  |
| 3   | HIGH     | Add `__multiApplicantMode` guards to professional loan pages.ts         | 30min  |
| 4   | HIGH     | Fix `q6_banksOfCurrentAccount` showWhen (employmentType → practiceType) | 15min  |
| 5   | MEDIUM   | Add per-option showWhen to qualification/council questions              | 1hr    |
| 6   | MEDIUM   | Fix credit-behaviour guidance duplication                               | 30min  |
| 7   | MEDIUM   | Add `Array.isArray` guard for selectedIncomeProfiles                    | 5min   |
| 8   | LOW      | Remove dead import                                                      | 2min   |
| 9   | LOW      | Add renewal_pending warning                                             | 10min  |
| 10  | LOW      | Replace console.log with logger                                         | 10min  |
