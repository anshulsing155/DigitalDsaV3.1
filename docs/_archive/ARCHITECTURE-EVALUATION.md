# DigitalDSA V3 — Architecture Evaluation & Recommendations

> **Purpose**: Honest audit of what should be merged, separated, changed, or deleted.
> **Date**: 2026-02-19
> **Scope**: Code structure, naming, duplication, boundaries, performance, maintainability

---

## Table of Contents

1. [Severity Legend](#severity-legend)
2. [CRITICAL: Schema Duplication](#1-critical-schema-duplication)
3. [CRITICAL: Oversized Components](#2-critical-oversized-components)
4. [HIGH: Route Naming Chaos](#3-high-route-naming-chaos)
5. [HIGH: State Management Hybrid](#4-high-state-management-hybrid)
6. [HIGH: Component Duplication](#5-high-component-duplication)
7. [HIGH: Type System Fragmentation](#6-high-type-system-fragmentation)
8. [HIGH: Legacy Form Directory](#7-high-legacy-form-directory)
9. [MEDIUM: Config File Sprawl](#8-medium-config-file-sprawl)
10. [MEDIUM: Monolith JSON Files](#9-medium-monolith-json-files)
11. [MEDIUM: API Route Depth](#10-medium-api-route-depth)
12. [MEDIUM: Client-Side Validation Duplication](#11-medium-client-side-validation-duplication)
13. [LOW: Specialized Dependencies](#12-low-specialized-dependencies)
14. [LOW: Test Organization](#13-low-test-organization)
15. [PERFORMANCE: Bundle & Load](#14-performance-bundle--load)
16. [Recommended Refactoring Plan](#recommended-refactoring-plan)

---

## Severity Legend

| Level | Meaning | Action |
|-------|---------|--------|
| **CRITICAL** | Actively causing bugs, blocking new features, or creating maintenance debt daily | Fix in next sprint |
| **HIGH** | Confusing for developers, slowing down onboarding, creating hidden coupling | Fix within 2-4 weeks |
| **MEDIUM** | Technical debt accumulating but not blocking | Schedule for next quarter |
| **LOW** | Nice-to-have improvements | Fix opportunistically |
| **PERFORMANCE** | Impacts user experience or build times | Profile first, fix by impact |

---

## 1. CRITICAL: Schema Duplication

### The Problem

The same JSON form schemas exist in **3 separate locations**:

```
Location 1: src/lib/config/               29 JSON files (~6.8 MB)
Location 2: src/lib/server/formEngine/schemas/  25 JSON files (~2.3 MB)
Location 3: src/lib/config/schemas/         3 JSON files  (~336 KB)
```

These are **byte-for-byte identical copies**. When a schema changes, it must be updated in 2-3 places. If someone forgets one location, the form engine and client get different schemas — causing silent bugs.

### Files Affected

| Schema | config/ | server/formEngine/schemas/ | config/schemas/ |
|--------|---------|---------------------------|-----------------|
| homeLoanSchema.json (168 KB) | Yes | Yes | Yes |
| applicantQuestion.json (148 KB) | Yes | Yes | Yes |
| LAP-schema.json (85 KB) | Yes | Yes | No |
| plot-loan-schema.json (112 KB) | Yes | Yes | No |
| personal-loan-schema.json (20 KB) | Yes | Yes | No |
| businessLoanSchema.json (18 KB) | Yes | Yes | No |
| obligation.json (12 KB) | Yes | Yes | No |
| formSchema.json (14 KB) | Yes | Yes | Yes |
| ... 17 more | Yes | Yes | No |

### Recommendation: MERGE into single source

```
KEEP:   src/lib/server/formEngine/schemas/    <- Single source of truth
DELETE: src/lib/config/schemas/                <- Remove entirely
CHANGE: src/lib/config/*.json (schema files)  <- Move to server/formEngine/schemas/

For client-side needs (if any):
  - Import from server schemas via $lib/server/formEngine/schemas/
  - OR expose via API endpoint (already done: /api/form/evaluate returns questions)
```

**Effort**: 2-3 hours. High-confidence change. Search for all imports of these JSON files and redirect.

---

## 2. CRITICAL: Oversized Components

### The Problem

10 components exceed 1,000 lines. These are impossible to review, test, or modify safely.

| Component | Lines | Size | Problem |
|-----------|-------|------|---------|
| `AddApplicant.svelte` | 1,720 | 62 KB | Does EVERYTHING: identity, employment, income, obligations, documents, NRI, company |
| `home-Loan/+page.svelte` | 1,660 | 60 KB | 8 form pages in one file |
| `home-loan-offers/+page.svelte` | 1,422 | 53 KB | Results display + comparison + selection |
| `plot-Loan/+page.svelte` | 1,421 | 52 KB | Same pattern as home-Loan |
| `Lap/+page.svelte` | 1,313 | 48 KB | Same pattern |
| `business-Loan/+page.svelte` | 1,269 | 47 KB | Same pattern |
| `UnsecuredObligation.svelte` | 1,147 | 47 KB | Obligation form + table + modals |
| `IncomePageNew.svelte` | 1,172 | 45 KB | 3-tab income system |
| `IncomeSourceForm.svelte` | 844 | 33 KB | Dynamic form per income type |
| `payloadBuilder.ts` | 1,697 | 70 KB | Form data transformation |

### Recommendation: SPLIT by responsibility

**AddApplicant.svelte (1,720 lines) -> Split into 6-8 sub-components**:

```
AddApplicant.svelte (orchestrator, ~200 lines)
  +-- ApplicantIdentity.svelte       (name, age, gender, marital)
  +-- ApplicantEmployment.svelte     (employment type + profile questions)
  +-- ApplicantIncome.svelte         (delegates to IncomePageNew)
  +-- ApplicantObligations.svelte    (delegates to UnsecuredObligation)
  +-- ApplicantDocuments.svelte      (document checklist)
  +-- ApplicantNRI.svelte            (NRI-specific: GPA, country)
  +-- ApplicantCompany.svelte        (company type, directors)
```

**Form page files (home-Loan/+page.svelte, etc.) -> Extract shared form page logic**:

The 5 form page files (home-Loan, Lap, plot-Loan, business-Loan, personal-Loan) share 60-70% identical code. Extract common form page rendering into a shared component:

```
BEFORE: 5 files x ~1,400 lines = 7,000 lines (with ~4,500 duplicated)
AFTER:  1 shared FormPage.svelte (~800 lines) + 5 config files (~200 lines each)
NET:    ~1,800 lines (74% reduction)
```

**payloadBuilder.ts (1,697 lines) -> Split by domain**:

```
payloadBuilder/
  +-- index.ts           (orchestrator, ~100 lines)
  +-- loanTransaction.ts (loan details extraction)
  +-- applicantPayload.ts (applicant data extraction)
  +-- incomePayload.ts   (income source extraction)
  +-- obligationPayload.ts (obligation extraction)
  +-- relationshipPayload.ts (relationship extraction)
  +-- sanitizers.ts      (PII stripping, value cleaning)
```

**Effort**: 2-3 days per major component. Start with AddApplicant (most painful).

---

## 3. HIGH: Route Naming Chaos

### The Problem

Route URLs use inconsistent casing conventions:

```
SECURED LOAN FORMS:
  /form/home-Loan/            <- PascalCase "Loan"
  /form/Lap/                  <- PascalCase "Lap"
  /form/plot-Loan/            <- PascalCase "Loan"

UNSECURED LOAN FORMS:
  /form/unsecureLoan/         <- camelCase
  /form/unsecureLoan/business-Loan/    <- Mixed!
  /form/unsecureLoan/personal-Loan/    <- Mixed!
  /form/unsecureLoan/Professional-Loan/ <- PascalCase!

APPLICATION RESULTS:
  /home-loan-application/     <- kebab-case (correct)
  /lap-loan-application/      <- kebab-case (correct)

OFFERS:
  /home-loan-offers/          <- kebab-case (correct)
  /lap-offers/                <- kebab-case (correct)
```

### Recommendation: Standardize to kebab-case

The web standard is kebab-case for URLs. SvelteKit handles this fine.

```
RENAME:
  /form/home-Loan/                -> /form/home-loan/
  /form/Lap/                      -> /form/lap/
  /form/plot-Loan/                -> /form/plot-loan/
  /form/unsecureLoan/             -> /form/unsecured/
  /form/unsecureLoan/business-Loan/     -> /form/unsecured/business-loan/
  /form/unsecureLoan/personal-Loan/     -> /form/unsecured/personal-loan/
  /form/unsecureLoan/Professional-Loan/ -> /form/unsecured/professional-loan/
```

**Caveat**: This changes URLs. If any external links exist (bookmarks, shared URLs), set up redirects:

```typescript
// hooks.server.ts or +layout.server.ts
const ROUTE_REDIRECTS = {
  '/form/home-Loan': '/form/home-loan',
  '/form/Lap': '/form/lap',
  // ...
};
```

**Effort**: 1-2 hours. SvelteKit folder rename + redirect map. Must also update form navigation logic and any hardcoded paths.

---

## 4. HIGH: State Management Hybrid

### The Problem

Two state management patterns coexist:

**Svelte 5 Runes (new, preferred)**: `src/lib/state/`
```
form.svelte.ts          882 lines    Active, primary form state
applicant.svelte.ts     933 lines    Active, applicant management
auth.svelte.ts          ~300 lines   Active, auth state
dialog.svelte.ts        ~100 lines   Active, modal stack
ui.svelte.ts            ~100 lines   Active, loading/errors
walkthrough.svelte.ts   ~100 lines   Active, tour state
```

**Svelte 4 Stores (old)**: `src/lib/stores/`
```
applicantDataStore.svelte.ts   13,190 bytes   UNCLEAR if still used
loanData.ts                    ~200 lines     UNCLEAR if still used
incomeProfileStore.ts          ~300 lines     UNCLEAR if still used
modal.ts, modalStack.ts        ~200 lines     CONFLICTS with dialog.svelte.ts
agreeModal.ts, confirmModal.ts ~100 lines     CONFLICTS with dialog.svelte.ts
_bridge.svelte.ts              ~200 lines     Bridge between old/new
coins/                         ~200 lines     Coin system stores
onboarding/                    ~200 lines     Onboarding stores
```

### What's Wrong

1. **Two modal systems**: `src/lib/stores/modal.ts` + `src/lib/state/dialog.svelte.ts`
2. **Two applicant stores**: `src/lib/stores/applicantDataStore.svelte.ts` + `src/lib/state/applicant.svelte.ts`
3. **Bridge file exists**: `_bridge.svelte.ts` syncs old stores to new runes — fragile coupling
4. **New developers confused**: Which one do I use? Which is authoritative?

### Recommendation: Complete the migration

```
Phase 1: AUDIT which old stores are still imported
  grep -r "from '\$lib/stores/" src/

Phase 2: For each old store with active imports:
  - Move logic to corresponding rune state file
  - Update all importers

Phase 3: DELETE src/lib/stores/ entirely (or rename to _deprecated_stores/)

Phase 4: DELETE _bridge.svelte.ts
```

**Priority order**:
1. Modal stores (conflicting with dialog.svelte.ts) — merge into `dialog.svelte.ts`
2. applicantDataStore (conflicting with applicant.svelte.ts) — merge into `applicant.svelte.ts`
3. loanData, incomeProfileStore — merge into `form.svelte.ts`
4. coins, onboarding — keep in rune files or create dedicated `subscription.svelte.ts`

**Effort**: 3-5 days. Must audit all imports, move logic, test extensively.

---

## 5. HIGH: Component Duplication

### Problem A: 12+ Select Components

```
Component                               Lines   Purpose
------------------------------------------------------
CustomSelect.svelte                     579     Full-featured dropdown
NewSelect.svelte                        538     Refined dropdown
onboarding/NewSelect.svelte             ~50     Yet another variant
BooleanSelect.svelte                    422     Yes/No toggle
ApplicantSelect.svelte                  670     Applicant-specific
SelectField.svelte                      ~150    Basic select
DerivedSelect.svelte                    ~100    Computed options
SelectionCustom.svelte                  ~200    Unknown purpose
MultipleSelectField.svelte              407     Multi-select
MultiSelectFieldWithSwitchButton.svelte 389     Multi-select + toggle
IncomeProfileSelector.svelte            ~400    Income-specific
LanguageSelector.svelte                 ~200    Language picker
```

### Recommendation: Consolidate to 3 select components

```
KEEP (refactored):
  1. Select.svelte          <- Merge CustomSelect + NewSelect + SelectField
                               Single component with variants via props:
                               variant="basic" | "searchable" | "card"

  2. MultiSelect.svelte     <- Merge MultipleSelectField + MultiSelectFieldWithSwitchButton
                               + TwoSideMultipleSelectField
                               Single component with multi-select behavior

  3. BooleanSelect.svelte   <- Keep as-is (genuinely different UX)

DELETE:
  - SelectionCustom.svelte
  - DerivedSelect.svelte (derive in parent, pass options)
  - onboarding/NewSelect.svelte (use main Select with props)

KEEP (domain-specific, but use base Select internally):
  - ApplicantSelect.svelte     <- Uses Select internally + showWhen logic
  - IncomeProfileSelector.svelte <- Uses MultiSelect internally + profile-specific UI
  - LanguageSelector.svelte    <- Uses Select internally + flag icons
```

### Problem B: 13+ Modal Variants

```
Modal.svelte (base)               WideModal.svelte
ModalTabs.svelte                  AgreeModal.svelte
ConfirmModal.svelte               InfoModal.svelte
ApplicantModal.svelte             ApplicantVerificationModal.svelte
DemoRestrictionModal.svelte       EmailOtpModal.svelte
MonthYearModal.svelte             RestoreApplicantModal.svelte
SessionResumeModal.svelte         EmailVerificationModal.svelte
```

### Recommendation: Keep base Modal, consolidate wrappers

```
KEEP:
  Modal.svelte          <- Base component (already good)
  WideModal.svelte      <- Different layout, justified

CONVERT to Modal usage (not separate components):
  ConfirmModal      -> <Modal variant="confirm"> with yes/no slots
  InfoModal         -> <Modal variant="info"> with content slot
  AgreeModal        -> <Modal variant="agree"> with terms slot

KEEP (domain-specific, complex enough to justify):
  ApplicantModal
  MonthYearModal (calendar UI)
  EmailOtpModal (OTP flow)
  SessionResumeModal (resume logic)

DELETE/MERGE:
  ModalTabs.svelte -> Merge into WideModal as variant
  DemoRestrictionModal -> Use ConfirmModal with demo content
  RestoreApplicantModal -> Use ConfirmModal with restore content
```

**Effort**: 1-2 days for select consolidation, 1 day for modal consolidation.

---

## 6. HIGH: Type System Fragmentation

### The Problem

Form-related types are split across 4-6 files with unclear responsibilities:

```
src/lib/types/form.ts           729 lines   "Comprehensive" applicant + form types
src/lib/types/formTypes.ts       ~50 lines  Re-exports from form.ts + Question/Option
src/lib/types/formEngine.ts      ~50 lines  PageResponse, FieldError, FieldWarning
src/lib/types/formSnapshot.ts    ~80 lines  FormSnapshot, version types
src/lib/types/applicationDataSchema.ts  Zod schemas
src/lib/types/casePayload.ts     ~200 lines 17 categorical interfaces
```

### What's Confusing

- `form.ts` exports `Applicant` but also `EmploymentType`, `CompanyType`, enums
- `formTypes.ts` re-exports everything from `form.ts` AND adds `Question`, `Option` types
- `formEngine.ts` has types that logically belong with the form engine but live in types/
- A developer looking for "where is the Applicant type?" finds 3 possible files

### Recommendation: Reorganize by domain

```
src/lib/types/
  |
  |-- index.ts                    User, Dsa, Rm, PropertyConsultant (KEEP)
  |
  |-- applicant.ts (NEW)          <- MERGE from form.ts:
  |                                  Applicant, ApplicantDetails, ApplicantDocuments,
  |                                  EmploymentType, CompanyType, Gender, MaritalStatus,
  |                                  LoanEntry, ObligationType
  |
  |-- form.ts (SLIM DOWN)         <- Keep ONLY form-specific types:
  |                                  FormData, FormPage, FormSection, FormQuestion,
  |                                  PageResponse, FieldError, FieldWarning
  |                                  (Merge formTypes.ts + formEngine.ts into here)
  |
  |-- case.ts                     Case, CaseStage, LenderAppStatus (KEEP)
  |
  |-- incomeProfile.ts            12 income types (KEEP)
  |
  |-- policyEngine.ts             Policy engine types (KEEP)
  |
  |-- formSnapshot.ts             Snapshot types (KEEP)
  |
  |-- casePayload.ts              Categorical interfaces (KEEP)

DELETE:
  formTypes.ts       <- Merged into form.ts
  formEngine.ts      <- Merged into form.ts
```

**Effort**: Half day. Mostly mechanical: move types, update imports.

---

## 7. HIGH: Legacy Form Directory

### The Problem

`src/lib/form/` exists with 928 lines of code:

```
src/lib/form/
  +-- firstPage/
  |     +-- schema.ts        59 lines
  +-- homeLoan/
        +-- schema.ts       140 lines
        +-- validation.ts   194 lines
        +-- visibility.ts   123 lines
        +-- types.ts         ~50 lines
```

Meanwhile, the **active** form system lives in `src/lib/server/formEngine/`:

```
src/lib/server/formEngine/
  +-- engine.ts          653 lines
  +-- visibility.ts      363 lines
  +-- optionResolver.ts  240 lines
  +-- textResolver.ts    203 lines
  +-- schemaLoader.ts    ~100 lines
  +-- schemas/           25 JSON files
```

### What's Wrong

- Unclear which is authoritative
- New developers might edit the wrong one
- `src/lib/form/` may contain dead code or may still be imported somewhere

### Recommendation: Audit and delete or merge

```
Step 1: Search for imports
  grep -r "from '\$lib/form/" src/

Step 2:
  If zero imports -> DELETE src/lib/form/ entirely
  If some imports -> Move remaining logic to formEngine, update imports, then DELETE
```

**Effort**: 1-2 hours. Grep, verify, delete.

---

## 8. MEDIUM: Config File Sprawl

### The Problem

Configuration is scattered across multiple directories with unclear ownership:

```
src/lib/config/                     64 files, various purposes
src/lib/config/incomeProfiles/      6 files (income configs)
src/lib/config/bankSelection/       1 file (bank list)
src/lib/config/ApplicantOptions/    5+ files (enums)
src/lib/config/wizard-sections/     6 files (per-loan section configs)
src/lib/config/schemas/             3 files (DUPLICATE - see issue #1)
src/lib/config/walkthrough/         3 files (tour configs)
src/lib/server/formEngine/schemas/  25 files (form schemas)
src/lib/server/data/                2 files (templates)
```

### Recommendation: Centralize by domain

```
PROPOSED STRUCTURE:
src/lib/config/
  |
  |-- forms/                      <- ALL form schemas (single source)
  |     +-- home-loan.json
  |     +-- lap.json
  |     +-- plot-loan.json
  |     +-- personal-loan.json
  |     +-- business-loan.json
  |     +-- professional-loan.json
  |     +-- applicant-questions.json
  |     +-- obligation.json
  |     +-- form-schema.json
  |
  |-- income/                     <- Rename from incomeProfiles/
  |     +-- (existing 6 files)
  |
  |-- banks/                      <- Rename from bankSelection/
  |     +-- bankName.ts
  |
  |-- applicant/                  <- Rename from ApplicantOptions/
  |     +-- loanTypes.ts
  |     +-- employmentTypes.ts
  |     +-- (others)
  |
  |-- wizard/                     <- Rename from wizard-sections/
  |     +-- (per-loan section configs)
  |
  |-- walkthrough/                <- Keep as-is
  |
  |-- permissions.ts              <- Keep at root level
  |-- showWhenEngine.ts           <- Keep at root level
  |-- landing-page-config.ts      <- Keep at root level
  +-- lenderDomains.ts            <- Keep at root level

DELETE:
  src/lib/config/schemas/         <- Merged into forms/
  src/lib/server/formEngine/schemas/ <- Server loads from config/forms/
```

**Effort**: Half day. Mechanical: rename directories, update imports.

---

## 9. MEDIUM: Monolith JSON Files

### The Problem

Several JSON files are impractically large:

| File | Size | Lines | Problem |
|------|------|-------|---------|
| `pincode_IN_all.json` | **5.4 MB** | 150,383 | Full India pincode DB in one file |
| `pincode_IN_Selected.json` | **783 KB** | 28,078 | Subset of above |
| `homeLoanSchema.json` | **168 KB** | 6,374 | Entire home loan form schema |
| `applicantQuestion.json` | **148 KB** | 3,280 | All applicant questions |
| `plot-loan-schema.json` | **112 KB** | 4,711 | Entire plot loan schema |
| `LAP-schema.json` | **85 KB** | 2,959 | Entire LAP schema |

### Recommendations

**Pincode files**: Move to database or external API

```
CURRENT:  5.4 MB JSON loaded at import time
PROPOSED: Store pincodes in MongoDB collection with index on pincode
          API endpoint: /api/lookup/pincode?q=411001
          Returns: { state, district, city, area }
          Indexed: { pincode: 1 } for fast lookup
```

This removes 5.4 MB from the bundle and enables faster startup.

**Form schemas**: Consider splitting per-section

```
CURRENT:  homeLoanSchema.json (168 KB, 6,374 lines)
PROPOSED: Split into sections that can be lazy-loaded:
  home-loan/
    +-- page1-loan-details.json
    +-- page2-property.json
    +-- page3-applicant.json
    +-- page4-income.json
    +-- page5-obligations.json
    +-- page6-documents.json
    +-- page7-review.json
    +-- page8-submit.json

  Schema loader: Load only the page being evaluated
  Benefits: Faster page evaluation, easier to edit individual pages
```

**Effort**: Pincode to DB: 1 day. Schema splitting: 2-3 days (needs formEngine updates).

---

## 10. MEDIUM: API Route Depth

### The Problem

Case → Lender Application routes are deeply nested (4+ levels):

```
/api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/+server.ts
/api/cases/[case_id]/lender-applications/[lender_app_id]/queries/+server.ts
/api/cases/[case_id]/lender-applications/[lender_app_id]/+server.ts
```

Each deeply-nested route file is 300-500 lines with duplicated auth guards and parameter parsing.

### Recommendation: Flatten with query params OR create service layer

**Option A: Flatten routes (simpler)**

```
BEFORE: /api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]
AFTER:  /api/lender-applications/[lender_app_id]/documents/[doc_id]
        (case_id derived from lender_app_id lookup)
```

**Option B: Extract shared logic (better long-term)**

```
// src/lib/server/caseService.ts
export async function getCaseWithAuth(caseId: string, locals: App.Locals) {
  const denied = requireRoleApi(locals, ['dsa', 'rm', 'admin']);
  if (denied) return { error: denied };
  const case_ = await Cases.findOne({ case_id: caseId });
  if (!case_) return { error: json({ error: 'Not found' }, { status: 404 }) };
  // ownership check
  return { case_ };
}

// Used in route:
export const GET: RequestHandler = async ({ params, locals }) => {
  const { case_, error } = await getCaseWithAuth(params.case_id, locals);
  if (error) return error;
  // ... actual logic
};
```

**Effort**: Option A: 1 day. Option B: 2-3 days but prevents future duplication.

---

## 11. MEDIUM: Client-Side Validation Duplication

### The Problem

Some validation logic exists on both client and server:

```
CLIENT: src/routes/(app)/(Application)/*/+page.svelte
  -> const missing = validateForm(formApplicationData);
  -> validateGSTState()

SERVER: src/lib/server/formEngine/engine.ts
  -> validatePage()
  -> validateAllPages()
```

The client does validation for UX (instant feedback), the server does it for security (cannot be bypassed). But if they're implementing the **same rules** independently, they can drift.

### Recommendation: Share validation schemas

```
PROPOSED:
1. Define validation rules ONCE in shared schemas (Zod or JSON-Logic)
2. Server uses schemas directly
3. Client imports same schemas for client-side validation
4. Single source of truth for validation rules

PRACTICAL APPROACH:
  - Keep server validation as authoritative (already correct)
  - Client validation should be "best effort" UX only
  - Don't duplicate complex business rules on client
  - Use simple field-level validation on client (required, min/max, format)
  - Leave business rule validation to server
```

**Effort**: Gradual. Don't try to unify all at once. When touching a form, ensure client validation is thin.

---

## 12. LOW: Specialized Dependencies

### The Situation

Three dependencies are used for very specific features:

| Package | Size | Used In | Feature |
|---------|------|---------|---------|
| `@mediapipe/face_detection` + `camera_utils` | ~2 MB | 1 file | Selfie quality check |
| `gsap` | ~200 KB | 8 files | Landing page animations |
| `driver.js` | ~60 KB | 1 component | Product walkthrough tours |

### Recommendation

- **MediaPipe**: Consider making it a lazy import (dynamic `import()`) so it doesn't bloat the main bundle. Only loaded when selfie feature is used.
- **GSAP**: Already only on landing page (SvelteKit code-splits per route). Fine as-is.
- **Driver.js**: Already lazy. Fine as-is.

No action needed unless bundle size becomes an issue.

---

## 13. LOW: Test Organization

### The Situation

```
src/lib/testing/
  +-- __tests__/           52 test files (unit tests)
  +-- e2e/                 34 specs (E2E tests)
  +-- fixtures/            Test data (fixtureProfiles.ts)
  +-- generators/          Data generators
  +-- homeLoan/            Home loan test helpers
  +-- schema/              Schema test helpers
  +-- storage/             Storage mocks
  +-- types/               Test types
  +-- utils/               Test utilities
```

### Minor Issues

1. `homeLoan/` is a sub-directory for one loan type — other loan types don't have equivalent
2. Test files in `__tests__/` are flat (52 files) — no subdirectory grouping by domain
3. Some test helpers (`formHelpers.ts`) are in `e2e/` — shared utilities should be separate

### Recommendation (low priority)

```
src/lib/testing/
  +-- unit/                    <- Rename from __tests__/
  |     +-- ruleEngine/          Already exists
  |     +-- form/                Group form-related tests
  |     +-- auth/                Group auth tests
  |     +-- case/                Group case tests
  |     +-- ...
  +-- e2e/                     Keep as-is
  +-- fixtures/                Keep as-is
  +-- helpers/                 <- Merge homeLoan/ + utils/ + storage/
  +-- generators/              Keep as-is
```

**Effort**: Half day. Mechanical rename + import updates. Do opportunistically.

---

## 14. PERFORMANCE: Bundle & Load

### Current Situation

- SvelteKit code-splits per route (good)
- Vite + Terser for minification (good)
- Large JSON files imported statically (potentially bad)

### Potential Issues

| Area | Risk | Impact |
|------|------|--------|
| Pincode JSON (5.4 MB) | Loaded at import time | Slows server startup |
| Form schemas (168 KB each) | Loaded per-form-evaluation | Memory per request |
| 189 components | Tree-shaken by Vite | Low risk |
| MongoDB connections | Native driver pooling | Low risk |

### Recommendations

1. **Pincode to DB**: Move 5.4 MB JSON to MongoDB collection (see issue #9)
2. **Schema caching**: Cache parsed JSON schemas in memory (already done by Node module system)
3. **Lazy AI imports**: `aiService.ts` imports multiple AI providers — make them dynamic imports
4. **Image optimization**: Already using ImageKit (good)

---

## Recommended Refactoring Plan

### Sprint 1 (This Week) — Quick Wins

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Delete `src/lib/config/schemas/` (3 duplicate files) | 30 min | Remove confusion |
| 2 | Audit `src/lib/form/` — delete if unused | 1 hour | Remove dead code |
| 3 | Audit `src/lib/stores/` — list what's still imported | 2 hours | Map migration scope |
| 4 | Search for all schema JSON imports, document locations | 1 hour | Prep for consolidation |

### Sprint 2 (Next 2 Weeks) — Schema & Naming

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 5 | Consolidate JSON schemas to single location | 3 hours | Eliminate duplication |
| 6 | Rename routes to kebab-case + add redirects | 2 hours | Consistent URLs |
| 7 | Merge type files (form.ts + formTypes.ts + formEngine.ts) | 4 hours | Clear type ownership |
| 8 | Delete `_bridge.svelte.ts` + merge store logic | 1 day | Remove coupling |

### Sprint 3 (Month 1) — Component Refactoring

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 9 | Split AddApplicant.svelte into sub-components | 2 days | Reviewable, testable |
| 10 | Consolidate select components (12 -> 3) | 2 days | Consistent UX |
| 11 | Extract shared FormPage component from 5 form pages | 2 days | -74% duplication |
| 12 | Complete stores -> runes migration | 3 days | Single state pattern |

### Sprint 4 (Month 2) — Data & Performance

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 13 | Move pincode data to MongoDB | 1 day | -5.4 MB from bundle |
| 14 | Split payloadBuilder.ts into modules | 1 day | Maintainable |
| 15 | Extract case API service layer | 2 days | Less route duplication |
| 16 | Reorganize config/ directory | 4 hours | Clear ownership |

### NOT Recommended (Don't Do)

| Task | Why Not |
|------|---------|
| Rewrite form engine | Working fine, well-tested. Risk >> reward. |
| Switch to ORM (Prisma/Drizzle) | MongoDB native driver is correct for flexible schemas. |
| Replace json-logic-js | 555+ tests depend on it. The right tool for the job. |
| Merge all modal variants | Domain-specific modals with complex logic justify their existence. |
| Add GraphQL | REST is working. 161 endpoints is manageable with SvelteKit routing. |
| Microservices split | Too early. Monolith is fine at current scale. |

---

## Summary Scorecard

| Area | Current State | After Refactoring |
|------|--------------|-------------------|
| Schema management | D (3 copies) | A (single source) |
| Component reuse | C (12 select variants) | B (3 base + domain) |
| Route naming | D (mixed conventions) | A (kebab-case) |
| State management | C (two patterns) | A (runes only) |
| Type organization | C (fragmented) | B (domain-grouped) |
| Config structure | C (scattered) | B (centralized) |
| Bundle size | B (pincode overhead) | A (DB-backed) |
| Test organization | B (mostly fine) | B+ (better grouping) |
| API structure | B (deep nesting) | B+ (service layer) |
| Overall maintainability | C+ | B+ |

The codebase is **functional and well-tested** (4,451 passing tests). These recommendations are about **developer experience, onboarding speed, and long-term maintainability** — not about fixing broken things.
