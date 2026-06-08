# Code Review — 2026-03-21

**Scope:** 5 commits from `a559a882` to `edc4246e` (Session 34: applicant role engine, sole proprietor, unsecured director redesign, BT structure, case intake redesign, bug fixes)
**Reviewer:** Automated daily review

---

## Commits Reviewed

| Hash | Summary |
|------|---------|
| `a559a882` | Applicant role engine, sole proprietor sub-type, validation UX fixes |
| `c667af2b` | Make businessTradeName required for sole proprietor + show tag in table |
| `5fda4808` | Unsecured director redesign, BT property labels, DC bank resolver |
| `33e5f296` | Restored applicant edit-or-new prompt + BT applicant structure |
| `edc4246e` | Case intake redesign + bug fixes |

**Total:** +1,846 / -322 lines across 32 files

---

## High Severity

### H1. BT Structure Section Never Renders (Known Bug, Committed Unfixed)
**Commits:** `33e5f296`, `edc4246e` | **Confidence: 95**
**File:** `src/lib/components/AddApplicant.svelte:95–104`

`isBTCase` derives `currentLoanType` from `currentLoanAnswers.loanType` via a two-step nested lookup, but `currentLoanName` is empty on initial render before `formState.loanData` is populated. The entire BT applicant structure feature (radio with 5 options, expected count banner, mismatch warning) is dead code — it never renders.

Already tracked in MEMORY.md but should be prioritized since the feature was the primary deliverable of commit `33e5f296`.

**Fix:** Use `formState.applicationData.loanName` (populated earlier) as fallback:
```typescript
const currentLoanName = $derived(
    (formState.applicationData?.loanName as string) ||
    ((formState.loanData as Record<string, unknown>).loanName as string) || ''
);
```

---

### H2. "Don't Know" Selection Permanently Blocks Next on Home Loan Case Assessment
**Commit:** `edc4246e` | **Confidence: 90**
**File:** `src/routes/(app)/form/home-loan/+page.svelte:578–581`

Home loan's `isNextEnabled` blocks Next whenever ANY visible question has an active warning. The new `q1_assessmentStatus` has a warning for `assessmentStatus === 'unknown'`. A DSA who legitimately selects "Don't Know" — an intentionally provided option — cannot advance. Other 5 loan types don't have this warning-blocks-next logic, creating inconsistent behavior.

**Fix:** Scope warning-blocking to contradiction warnings only (not advisory ones), or add a `blocking: boolean` flag to the warning schema.

---

### H3. `getRelevantFields` Drops `applicantSubType` and `businessTradeName`
**Commit:** `a559a882` | **Confidence: 90**
**File:** `src/lib/components/AddApplicant.svelte:1390–1408`

The `individualFields` whitelist in `getRelevantFields` does not include `applicantSubType` or `businessTradeName`. Any table-row edit that triggers `getRelevantFields` silently drops sole proprietor data from the applicant object.

**Fix:** Add both fields to `individualFields`:
```typescript
const individualFields = [
    ...baseFields, 'fullNameOfApplicant', 'gender', 'age', 'maritalStatus',
    'isApplicantNRI', 'applicantSubType', 'businessTradeName',
    'employmentType', ...(hasRoleQuestions ? ['isGuarantor'] : [])
];
```

---

### H4. Director Name Mutation Corrupts `fullName` on Duplicate Force-Through
**Commits:** `a559a882`, `5fda4808` | **Confidence: 85**
**File:** `src/lib/components/DirectorCards.svelte:720–729`

When a director's details are 100% identical to another and DSA confirms twice, the code appends `_director02` to `fullName`. This mutated name persists to `formState`, rule engine, and derived PDFs. Per AD-03/AD-05, File Builder derives from form data — a corrupted name will appear in loan files.

**Fix:** Use a separate `disambiguationTag` field instead of mutating the canonical `fullName`. Display logic can show the tag visually.

---

### H5. `cancelEdit()` Leaves Stale `restoredFromData` — False Edit-or-New Prompt
**Commit:** `33e5f296` | **Confidence: 82**
**File:** `src/lib/components/AddApplicant.svelte:1220`

`cancelEdit()` resets `formApplicant` but never clears `restoredFromData = null`. If a user cancels gap-fill and then edits a different applicant without `__restoredFrom`, the stale snapshot triggers false "Update vs Add as New" prompts.

**Fix:** Add `restoredFromData = null;` to `cancelEdit()`.

---

### H6. `isCoApplicantDerived` Always False for Unsecured Directors
**Commit:** `5fda4808` | **Confidence: 88**
**File:** `src/lib/components/DirectorCards.svelte:121–123, 364–368`

Unsecured mode hardcodes `onProperty` and `onEMI` to `'false'`, so `isCoApplicantDerived()` always returns `false`. `isGuarantor` is always set to `'No'`. For unsecured business loans (OD/CC), a director may still be a co-applicant on the EMI obligation. The current logic silently prevents any director from being flagged as a co-applicant for unsecured loans.

**Fix:** Document if this is intentional design, or add a separate unsecured co-applicant control.

---

### H7. `validateOnNext` Missing Minimum-Applicant Guard
**Commit:** `a559a882` | **Confidence: 82**
**File:** `src/lib/components/AddApplicant.svelte:470–488`

Two exported validators exist: `validateOnNext()` and `validateStep()`. Only `validateStep` checks for zero applicants. If any wizard page calls `validateOnNext()` instead, zero-applicant submission could pass validation.

**Fix:** Add the same guard to `validateOnNext`, or consolidate to a single exported validator.

---

## Medium Severity

### M1. `__restoredFrom` Snapshot Contains Self-Referential Nesting
**Commit:** `33e5f296`, `edc4246e` | **Confidence: 85**
**Files:** `home-loan/+page.svelte:2565`, `lap/+page.svelte:1675`, `plot-loan/+page.svelte:1761`

`(restoredEntry as any).__restoredFrom = { ...restoredEntry }` takes the spread AFTER setting `__restoredFrom` on the same object. On repeated restores, nesting grows unbounded, bloating sessionStorage.

**Fix:** Strip `__restoredFrom` before snapshotting:
```typescript
const { __restoredFrom: _, ...snapshot } = restoredEntry as any;
(restoredEntry as any).__restoredFrom = snapshot;
```

---

### M2. `q2_assessmentLenders` Required + Empty Fallback = Silent Next Block
**Commit:** `edc4246e` | **Confidence: 83**
**File:** `src/lib/config/schema/caseIntakeQuestions.ts:77–123`

`required: true` with `options: []` fallback. If `bankData` is unavailable in `optionResolver` context, the question renders as empty required multi-select — DSA sees no options but can't proceed.

**Fix:** Set `required: false` (the showWhen already gates visibility), or add a fallback empty-state message.

---

### M3. `applicantSubType` Not Checked in `computeSectionCompletion`
**Commit:** `a559a882` | **Confidence: 83**
**File:** `src/lib/utils/incomeTabState.ts:301–309`

Profile tab completion doesn't check `applicantSubType` or `businessTradeName`. A sole-proprietor applicant shows profile complete without these fields, allowing premature `__completion = true`.

**Fix:** Add checks to `profileComplete`:
```typescript
const subTypeOk = !!applicant.applicantSubType;
const tradeNameOk = applicant.applicantSubType !== 'sole_proprietor' || !!applicant.businessTradeName;
```

---

### M4. Warning Conditions Sent Plaintext (showWhen is XOR-Encrypted)
**Commit:** `5fda4808` | **Confidence: 81**
**File:** `src/lib/server/formEngine/engine.ts:567–571`

Warning `condition` arrays contain the same `{ var: 'fieldName' }` references as `showWhen` but are not XOR-encrypted. An attacker can inspect API responses to learn business logic rules (e.g., GST status + turnover thresholds = decline signal). Inconsistent with AD-14 (8-layer anti-scraping).

**Fix:** Apply `encodeShowWhen()` to warning conditions in production, or strip them from client response and use server-evaluated `validationWarnings` array.

---

### M5. `saveApplicantAsNew` Direct Proxy Mutation
**Commit:** `33e5f296` | **Confidence: 85**
**File:** `src/lib/components/AddApplicant.svelte:1216`

`formApplicant.id = uuidv4()` directly mutates a `$state` proxy. While functional, it's inconsistent with the reassignment pattern used elsewhere and could cause snapshot timing issues.

**Fix:** `formApplicant = { ...formApplicant, id: uuidv4() };`

---

### M6. `console.warn` in Production (3 Instances)
**Commits:** `a559a882`, `33e5f296` | **Confidence: 82**
**File:** `src/lib/components/AddApplicant.svelte:1512, 1525, 1534`

Three `console.warn` calls in `deleteApplicant()` fire in production. Per CLAUDE.md: "Never use bare `console`." These leak internal labels to browser console.

**Fix:** Wrap with `if (dev) { ... }`.

---

### M7. Total Director Ownership Can Exceed 100%
**Commit:** `5fda4808` | **Confidence: 80**
**File:** `src/lib/components/DirectorCards.svelte:648–690, 784`

`validateSingleCard` checks 1–100 per director but no cross-card total validation. Three directors at 60% each (180% total) passes validation. Lenders will flag this.

**Fix:** Add `getTotalOwnership(companyId) > 100` check to `validateStep()`.

---

### M8. `as unknown as string` Type Casts Bypass TypeScript
**Commit:** `edc4246e` | **Confidence: 82**
**File:** `src/lib/config/schema/caseIntakeQuestions.ts:101, 115`

Switch/case objects cast to `string` to satisfy `RawSchemaQuestion` type. Runtime works but compile-time safety is lost.

**Fix:** Update `RawSchemaQuestion` type to accept `string | SwitchExpression` for `question` and `description` fields.

---

### M9. Premature BT Mismatch Warning
**Commit:** `33e5f296` | **Confidence: 80**
**File:** `src/lib/components/AddApplicant.svelte:136`

Warning fires as soon as `actualCount > 0` doesn't match `btExpectedCount`. If DSA selects "Borrower + Co-borrower" (count=2) and saves the first applicant, the mismatch warning appears before they've had a chance to add the second.

**Fix:** Only show the warning after `validateStep` is called, or use threshold logic.

---

## Low Severity

| Issue | File | Confidence |
|-------|------|------------|
| "Maritial" typo in validation message | `applicantBasicDetailsSecuredLoans.json` | 100 |
| `isTrulyEmptyApplicant` treats `false` as non-empty | `AddApplicant.svelte:766–779` | 80 |
| Stale `restoredFrom` label after name edit | `DirectorCards.svelte:998–1001` | 80 |
| Dual `onMount` blocks — potential flicker | `AddApplicant.svelte:594, 625` | 80 |
| Scope-bypass in legacy `detectCachedApplicant` | `AddApplicant.svelte:1453–1457` | 80 |
| Fragile one-way `btExistingStructure` sync effect | `AddApplicant.svelte:108–113` | 80 |

---

## Pre-Existing (Not Introduced by These Commits)

| Issue | Note |
|-------|------|
| XSS via `resolveTemplatePlaceholders` + `{@html}` | `textResolver.ts:73–76` — answer values injected unescaped into HTML descriptions. DSA-only tool mitigates risk, but should be HTML-escaped at substitution time. |
| `shortHash()` collision risk | `engine.ts:60` — djb2 variant, 8-char base-36. Birthday collision possible for 10+ questions/page. |
| 30 components on legacy lifecycle hooks | Per codebase maintenance review |

---

## Recommended Fix Priority

| Priority | Items | Impact |
|----------|-------|--------|
| **Fix Now** | H2 (Don't Know blocks Next), H3 (sole proprietor data dropped) | DSA-facing blockers on common flows |
| **Fix Soon** | H1 (BT section invisible), H5 (stale restore prompt), M1 (nested snapshots), M3 (completion gap) | Feature regressions, data quality |
| **Fix Next** | H4 (name corruption), H6 (unsecured co-applicant), M2 (empty lender options), M6 (console.warn), M7 (ownership >100%) | Edge cases, convention violations |
| **Backlog** | H7 (dual validators), M4 (warning encryption), M5 (proxy mutation), M8 (type casts), M9 (premature warning) | Hardening, type safety |

---

*Review covers commits `a559a882..edc4246e` (Session 34). Previous review: `CODE-REVIEW-2026-03-20.md` covering up to `77b5c65c`.*
