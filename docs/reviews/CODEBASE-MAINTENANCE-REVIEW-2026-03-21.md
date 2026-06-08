# Codebase Maintenance Review — 2026-03-21

**Scope:** Full codebase audit for dead code, redundancy, optimization, and maintenance opportunities.
**Codebase:** DigitalDSA-V3 | 245 components | 60 test files | 7,101 tests | 0 type errors

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Components](#2-components)
3. [Stores & State](#3-stores--state)
4. [Config Files](#4-config-files)
5. [Utilities](#5-utilities)
6. [Types](#6-types)
7. [Server Code](#7-server-code)
8. [Routes](#8-routes)
9. [Rule Engine](#9-rule-engine)
10. [Testing](#10-testing)
11. [Dependencies](#11-dependencies)
12. [Archives](#12-archives)
13. [Action Plan](#13-action-plan)

---

## 1. Executive Summary

**Overall Health:** GOOD — well-organized, documented, intentional architecture decisions.

| Priority | Count | Category |
|----------|-------|----------|
| HIGH | 1 | Large components need splitting |
| MEDIUM | 11 | Duplicates, legacy patterns, consolidation |
| LOW | 14 | Organization, cleanup, docs |

**No critical bugs or security issues found.**

Key themes:
- **Component consolidation** — 17 select variants, 15 modals need unification
- **Legacy → Runes migration** — 30 components still use Svelte 4 lifecycle hooks
- **Store bridge cleanup** — Dual `.ts` / `.svelte.ts` files for same stores
- **Dead code** — Small amount, easy to remove

---

## 2. Components

### 2.1 Large Components (>1,000 Lines) — HIGH PRIORITY

| Component | Lines | Concern | Recommendation |
|-----------|-------|---------|----------------|
| `AddApplicant.svelte` | 2,331 | Combines BT structure, restore logic, edit-or-new, table + form | Split into `ApplicantTable`, `ApplicantForm`, `BtStructureSection`, `RestoreHandler` |
| `DirectorCards.svelte` | 1,590 | Director management + deep profile + validation | Extract `DirectorCard`, `DirectorTable`, `DeepProfileForm` |
| `LenderResultCard.svelte` | 1,340 | Result rendering + calculations + interactions | Extract `ResultHeader`, `ResultMetrics`, `ResultActions` |
| `AddApplicantProfessional.svelte` | 1,266 | Professional applicant flow | Merge common logic with `AddApplicantBusiness` via shared base |
| `IncomePageNew.svelte` | 1,200 | Income entry + tab management + calculations | Split `IncomeForm`, `IncomeTabManager`, `IncomeCalculator` |
| `UnsecuredObligation.svelte` | 1,186 | Obligation form + table + DC/BT logic | Extract `ObligationForm`, `ObligationTable` |
| `AddApplicantBusiness.svelte` | 920 | Business applicant flow | Merge common logic with Professional via shared base |

**Risk:** MEDIUM — Requires careful refactoring. Each is well-tested via integration.

### 2.2 Duplicate Select Components (17 variants) — MEDIUM

```
ApplicantSelect.svelte      MultipleSelectField.svelte
BooleanSelect.svelte         MultiSelectFieldWithSwitchButton.svelte
CustomSelect.svelte          MultiSelectionTrueFalse.svelte
DerivedSelect.svelte         NewSelect.svelte
IncomeProfileSelector.svelte OnboardingSelect.svelte
LanguageSelector.svelte      SelectField.svelte
MultiOptionsSelection.svelte SelectionCustom.svelte
TwoSideMultipleSelectField.svelte
ModuleSelectionSection.svelte
SelectedLendersSection.svelte
```

**Recommendation:** Consolidate into 3-4 unified components:
- `Select.svelte` — Single-select with search, icons, descriptions
- `MultiSelect.svelte` — Multi-select with toggle mode
- `ToggleSelect.svelte` — Boolean/two-option toggle
- Keep domain-specific ones (LanguageSelector, IncomeProfileSelector) as thin wrappers

### 2.3 Modal Proliferation (15 variants) — MEDIUM

```
AgreeModal              EmailVerificationModal    NavigationChoiceModal
ApplicantModal          DemoRestrictionModal      Modal
ConfirmModal            EmailOtpModal             ModalTabs
ContradictionWarningModal  InfoModal              MonthYearModal
RestoreApplicantModal   SessionResumeModal        WideModal
```

**Recommendation:** Create composable `BaseModal.svelte` with slot-based content. Most modals differ only in content/buttons. Use `variant` prop or slots instead of separate files.

### 2.4 Legacy Lifecycle Hooks (30+ components) — MEDIUM

Components still using `onMount`, `tick`, `beforeUpdate`, `afterUpdate` instead of Svelte 5 runes:

```
AddApplicant.svelte              FormSidebar.svelte
UnsecuredObligation.svelte       Company.svelte
AddApplicantProfessional.svelte  BooleanSelect.svelte
AddApplicantBusiness.svelte      ApplicantSelect.svelte
AddApplicantPersonal.svelte      ApplicantFormUnsecured.svelte
CustomSelect.svelte              ApplicantFormSecured.svelte
MultipleSelectField.svelte       FormContextPanel.svelte
IntroGuideHint.svelte            LanguageSelector.svelte
NewSelect.svelte                 OverviewTab.svelte
FloatingNav.svelte               WalkthroughDriver.svelte
UnemployedPerson.svelte          SalariedPerson.svelte
TwoSideMultipleSelectField.svelte  Pensioner.svelte
SelfEmploymentProfessional.svelte  RadioIcon.svelte
SelfEmploymentOther.svelte       MultiSelectionTrueFalse.svelte
MultiSelectFieldWithSwitchButton.svelte
```

**Note:** `onMount` is still valid in Svelte 5 for browser-only initialization. Only `beforeUpdate`/`afterUpdate` are truly deprecated. Prioritize migrating those using `beforeUpdate`/`afterUpdate`.

### 2.5 Unused Components

| Component | File | Status | Action |
|-----------|------|--------|--------|
| None confirmed unused | — | All components have at least 1 import | No deletions needed |

**Note:** Archive (`_archive/`) already handles unused components correctly per project convention.

---

## 3. Stores & State

### 3.1 Duplicate Store Files (Bridge Pattern) — MEDIUM

| Runes Version (`.svelte.ts`) | Legacy Bridge (`.ts`) | Action |
|------------------------------|----------------------|--------|
| `cleanPayloadStore.svelte.ts` | `cleanPayloadStore.ts` | Deprecate `.ts` |
| `device.svelte.ts` | `device.ts` | Deprecate `.ts` |
| `emailVerificationContext.svelte.ts` | `emailVerificationContext.ts` | Deprecate `.ts` |
| `inputErrors.svelte.ts` | (bridge in `_bridge.svelte.ts`) | Keep bridge |
| `numberToWords.svelte.ts` | (bridge in `_bridge.svelte.ts`) | Keep bridge |

**Recommendation:**
1. Add `@deprecated` JSDoc to all `.ts` bridge files
2. Grep consumers of each `.ts` file
3. Migrate consumers to `.svelte.ts` imports
4. Remove `.ts` files once all consumers migrated

### 3.2 Legacy Stores in `stores.ts` — MEDIUM

`src/lib/stores/stores.ts` exports 9 writable stores:
```typescript
toasts, isMobile, showDrawer, alertNotification,
applicationData, backURL, nextURL, formErrors, isLoading
```

These should be migrated to:
- `formState` from `$lib/state/form.svelte` (for `applicationData`, `formErrors`)
- `uiState` from `$lib/state/ui.svelte` (for `isMobile`, `showDrawer`, `isLoading`, `toasts`)

### 3.3 `applicantsPayload` vs `applicants` Confusion — FIXED

**Was:** Validation in secured loan pages checked `applicantsPayload` instead of `applicants`, causing false "No applicant added" errors.
**Status:** Fixed in commit `edc4246e` (this session).

---

## 4. Config Files

### 4.1 Old JSON Schemas (Already Archived) — LOW

Files in `src/_archived/lib/config/schemas/`:
```
homeLoanSchema.json, businessLoanSchema.json, LAP-schema.json,
personal-loan-schema.json, plot-loan-schema.json, professional-loan-schema.json
```

**Status:** Migration to TypeScript composition completed Session 27. These are reference-only.
**Action:** Safe to delete if disk space is a concern. Per project convention, keep in `_archive/`.

### 4.2 JSON Config Files with Low Usage — LOW

| File | Import Count | Status |
|------|-------------|--------|
| `businessOtherQuestions.json` | 5 | Active — used in income pages |
| `businessQuestions.json` | 2 | Active — used in self-employment |
| `companyBasicData.json` | 2 | Active — used in Company.svelte |
| `NewCompanyQuestion.json` | 4 | Active — used in Company.svelte |
| `directorTable.json` | 3 | Active — used in DirectorCards |

**Result:** All checked — all are actively used. No dead configs found.

### 4.3 Shared Question Opportunities — MEDIUM

Common questions are re-defined across loan types. The new `caseIntakeQuestions.ts` (created this session) demonstrates the shared pattern. Candidates for consolidation:

| Question Area | Currently In | Could Be Shared |
|---------------|-------------|-----------------|
| Property location | Each secured loan's questionBank | `schema/propertyLocationQuestions.ts` |
| Applicant basic details | Per-loan questionBank | `schema/applicantQuestions.ts` |
| Income questions | JSON configs per income type | Already shared ✓ |
| Obligation questions | Per-loan pages | `schema/obligationQuestions.ts` |

**Risk:** MEDIUM — showWhen conditions may differ per loan type. Need careful audit before sharing.

---

## 5. Utilities

### 5.1 Unused Utilities — LOW

| File | Exports | References | Action |
|------|---------|------------|--------|
| `deleteKeyValueFromObject.ts` | `deleteKey()` | 0 | Archive |

### 5.2 Duplicate Income Assessment — MEDIUM

| File | Lines | Exports |
|------|-------|---------|
| `ruleEngine/incomeAssessor.ts` | 387 | `assessIncome()`, `extractGrossMonthlyIncome()`, etc. |
| `ruleEngine/incomeAssessorV2.ts` | 232 | `assessIncomeV2()` |

**Question:** Which is canonical? Both are imported by `evaluationEngine.ts`.
**Action:** Investigate — if V2 supersedes V1, deprecate V1. If they serve different purposes, document clearly.

### 5.3 Utility Organization — LOW

50+ files at top level in `utils/`. Could benefit from subfolders:

```
utils/
  payload/     → payloadBuilder, loanPayload, casePayloadBuilder
  form/        → formUtils, formStateHelpers, formAutoScroll, formOptionFetcher
  validation/  → crossStepValidator, zodErrorMapper, pincodeValidator
  helpers/     → dateUtils, formatNumber, roundNumber, securedClone
```

**Risk:** LOW — Only affects import paths. Use IDE refactoring.

---

## 6. Types

### 6.1 Large Type Files — LOW

| File | Lines | Content |
|------|-------|---------|
| `form.ts` | 809 | Applicant, form data, all form-related types |
| `policyEngine.ts` | 775 | Policy engine rule types |
| `policyCapture.ts` | 683 | Policy capture wizard types |
| `casePayload.ts` | 578 | API payload types |

**Recommendation:** These are acceptable sizes for type files. Only split if maintaining becomes difficult.

### 6.2 Potential Type Overlap — LOW

```
form.ts        — Main form types
formEngine.ts  — Engine types (server-side question processing)
formTypes.ts   — Additional form types (WizardSection, etc.)
```

**Status:** Reviewed — each has distinct scope:
- `form.ts` = data structures (Applicant, FormData)
- `formEngine.ts` = server engine types (ClientQuestion, ClientOption)
- `formTypes.ts` = wizard/UI types (WizardSection, WizardSubsection)

**Result:** No consolidation needed. Names could be clearer (rename `formTypes.ts` → `wizardTypes.ts`).

---

## 7. Server Code

### 7.1 Incomplete Features (Deferred) — LOW

| File | Feature | Status |
|------|---------|--------|
| `email.ts` | AWS SES integration | Deferred (production blocker #2) |
| `email.ts` | SNS bounce handler | Deferred |
| `notifications.ts` | Web Push API | Deferred (post-launch) |

**Action:** Already tracked in DEVELOPMENT-PLAN.md. No new action needed.

### 7.2 API Response Pattern Compliance — GOOD

Spot-checked 10 API routes — all use:
- ✓ `apiOk()` / `apiError()` / `apiServerError()` from `apiResponse.ts`
- ✓ `parseJsonBody()` instead of bare `request.json()`
- ✓ `logger` instead of `console.error`
- ✓ Guards from `guards.ts`

**Result:** Consistent patterns across API routes. No violations found.

---

## 8. Routes

### 8.1 Route Organization — GOOD

```
(app)/          — Main app routes (form, dashboard)
(Application)/  — Loan application output pages
(auth)/         — Auth pages (login, OTP, signup)
(offers)/       — Offer display pages
(public)/       — Public pages (landing, pricing)
api/            — API endpoints
```

### 8.2 Potential Dead Routes — LOW

| Route | Concern | Status |
|-------|---------|--------|
| `(Application)/business-loan-application/` | Low traffic | Active — linked from evaluation results |
| `(Application)/home-loan-application/` | — | Active |
| `(offers)/loan-offers/` | Generic path | Active — redirects based on loan type |

**Result:** All routes verified as active. None are dead.

---

## 9. Rule Engine

### 9.1 Architecture — SOLID

```
evaluationEngine.ts  → Main orchestrator
incomeAssessor.ts    → Income calculations (V1)
incomeAssessorV2.ts  → Income calculations (V2)
payloadEnricher.ts   → Enriches form data
resultBuilder.ts     → Builds lender results
discomfortAnalyzer.ts → Discomfort signal analysis
systemConfig.ts      → System configuration
```

**Key concern:** V1 vs V2 income assessor needs resolution (see Section 5.2).

### 9.2 Rule Documentation — GOOD

`realBankRuleDocs.ts` contains testing documentation for real bank rules. Well-structured.

---

## 10. Testing

### 10.1 Coverage Summary

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| Unit tests | 60 | 7,101 | ✓ All passing |
| E2E tests | 30+ | — | Playwright |
| Fixtures | 2 | — | Seed data |
| Generators | 5+ | — | Synthetic data |

### 10.2 Missing Component Tests — MEDIUM

245 components, 0 component-level `.test.ts` files. Integration tests exist via form page tests, but isolated component tests are missing.

**Recommendation:** Start with critical components:
1. `AddApplicant.svelte` — Core flow
2. `FormShell.svelte` — Wizard navigation
3. `IncomePageNew.svelte` — Income calculations
4. `UnsecuredObligation.svelte` — Obligation logic

---

## 11. Dependencies

### 11.1 Duplicate Dependency — LOW

`razorpay` appears in both `dependencies` and `devDependencies` in `package.json`.
**Action:** Remove from `devDependencies`.

### 11.2 All Dependencies Verified Active

Checked all 30+ dependencies — all are actively used:
- `driver.js` → `WalkthroughDriver.svelte`
- `gsap` → Landing page animations
- `@mediapipe/tasks-vision` → Selfie quality checks
- `imagekit` → File uploads
- `pdf-lib` → Server-side PDF generation
- `razorpay` → Payment integration

---

## 12. Archives

### 12.1 Component Archive (`_archive/`)

| File | Size | Keep? |
|------|------|-------|
| `STARTER_TEMPLATES.svelte` | 8.6KB | Yes — reference templates |
| `IncomeTotalBar.svelte` | 1.3KB | Yes — may restore for income UI |
| `AddApplicantBusiness_removedCode.ts` | 8.6KB | Yes — reference for director logic |
| `applicantBasicDetailsUnsecuredLoans.json` | 24KB | Yes — old config reference |
| `incomeEstimate.ts` | 2.4KB | Yes — estimation logic reference |

**Result:** All appropriately archived. Per project convention, keep.

### 12.2 Store Archive (`_archive/`)

9 bridge files in `src/lib/stores/_archive/`. These are intermediate migration artifacts.
**Action:** Keep during Svelte 4→5 migration. Delete once complete.

---

## 13. Action Plan

### Immediate (This Sprint)

| # | Action | File(s) | Risk | Effort |
|---|--------|---------|------|--------|
| 1 | Archive `deleteKeyValueFromObject.ts` | `src/lib/utils/` | NONE | 5 min |
| 2 | Remove `razorpay` from devDependencies | `package.json` | NONE | 2 min |
| 3 | Add `@deprecated` to bridge store `.ts` files | `src/lib/stores/*.ts` | NONE | 15 min |

### Short-Term (Next 2-3 Sessions)

| # | Action | Scope | Risk | Effort |
|---|--------|-------|------|--------|
| 4 | Resolve V1 vs V2 income assessor | `ruleEngine/` | MEDIUM | 2 hrs |
| 5 | Consolidate select components (17→4) | `components/` | MEDIUM | 1 day |
| 6 | Create shared question banks | `config/schema/` | MEDIUM | 1 day |
| 7 | Split `AddApplicant.svelte` (2,331 lines) | `components/` | MEDIUM | 4 hrs |

### Medium-Term (Next Quarter)

| # | Action | Scope | Risk | Effort |
|---|--------|-------|------|--------|
| 8 | Consolidate modal components (15→1) | `components/` | MEDIUM | 1 day |
| 9 | Migrate 30 components from lifecycle → runes | `components/` | MEDIUM | 3 days |
| 10 | Add component unit tests (top 5 critical) | `testing/` | NONE | 2 days |
| 11 | Migrate legacy store consumers | `stores/` → `state/` | MEDIUM | 2 days |
| 12 | Reorganize utils into subfolders | `utils/` | LOW | 2 hrs |
| 13 | Rename `formTypes.ts` → `wizardTypes.ts` | `types/` | LOW | 30 min |

### Deferred (Post-Launch)

| # | Action | Notes |
|---|--------|-------|
| 14 | AWS SES email integration | Production blocker #2 |
| 15 | Web Push notifications | Post-launch feature |
| 16 | Component documentation (JSDoc headers) | Quality-of-life |

---

## Key Metrics

| Metric | Value | Trend |
|--------|-------|-------|
| Total components | 245 | Stable |
| Components >1,000 lines | 7 | ⚠ Needs attention |
| Select variants | 17 | ⚠ Consolidate to 4 |
| Modal variants | 15 | ⚠ Consolidate to 1 |
| Legacy lifecycle components | 30 | ⚠ Migrate to runes |
| Dead code files | 1 | ✓ Minimal |
| Type errors | 0 | ✓ Clean |
| Test count | 7,101 | ✓ Growing |
| a11y warnings | 115 | Stable (non-blocking) |

---

*Generated: 2026-03-21 | Session 34 | Reviewer: Claude Code*
