# Codebase Overhaul — Change Tracker

> Branch: `refactor/codebase-overhaul`
> Started: 2025-02-19
> Status: IN PROGRESS

This document tracks every change made during the codebase overhaul for easy reference and rollback to `main` branch originals.

---

## Change Log

### Phase 0: Setup Tracking Infrastructure

| # | Action | Original Path | New Path | Reason |
|---|--------|--------------|----------|--------|
| 0.1 | Created | — | `docs/OVERHAUL-CHANGELOG.md` | Change tracking document |
| 0.2 | Created | — | `src/_archived/README.md` | Archive directory for safely-removed files |

---

### Phase 1: Centralized Route Constants

**Created:** `src/lib/config/routes.ts` — single source of truth for all navigation paths.

| # | Action | File Modified | What Changed | Reason |
|---|--------|--------------|-------------|--------|
| 1.1 | Created | `src/lib/config/routes.ts` | New file: ROUTES constant, LOAN_TYPE_FORM_ROUTES, howCanWeHelpRoute() | Centralize 100+ hardcoded route strings |
| 1.2 | Modified | `src/lib/server/caseHelpers.ts` | Removed local `LOAN_TYPE_FORM_ROUTE` object, imports from `routes.ts` | Eliminate duplicate route mapping |
| 1.3 | Modified | `src/lib/form/firstPage/navigation.ts` | Removed local routes object, imports `LOAN_TYPE_FORM_ROUTES` | Eliminate duplicate route mapping |
| 1.4 | Modified | `src/lib/config/landing-page-config.ts` | 6 hardcoded `/form/how-can-we-help?loan=...` → `howCanWeHelpRoute()` | Centralize landing page routes |
| 1.5 | Modified | `src/routes/(app)/(offers)/*` (9 files) | All `goto('/form/...')` → `goto(ROUTES.FORM.*)` | Centralize offer page routes |
| 1.6 | Modified | `src/routes/(app)/form/*.svelte` (7 files) | All `goto('/form/how-can-we-help')` → `goto(ROUTES.FORM.HOW_CAN_WE_HELP)` | Centralize form page routes |
| 1.7 | Modified | `src/routes/dashboard/dsa/*.svelte` (4 files) | `href="/form/how-can-we-help"` → `href={ROUTES.FORM.HOW_CAN_WE_HELP}` | Centralize dashboard routes |
| 1.8 | Modified | `src/routes/dashboard/+layout.svelte` | Sidebar "New Case" href → `ROUTES.FORM.HOW_CAN_WE_HELP` | Centralize sidebar nav |
| 1.9 | Modified | `src/lib/components/dashboard/CaseListCompact.svelte` | href → ROUTES constant | Centralize component routes |
| 1.10 | Modified | `src/lib/components/form-wizard/FormSidebar.svelte` | hrefs → ROUTES constants | Centralize component routes |
| 1.11 | Modified | `src/lib/components/form-wizard/MobileSidebarDrawer.svelte` | hrefs → ROUTES constants | Centralize component routes |
| 1.12 | Modified | `src/lib/components/landing/TopBar.svelte` | href → ROUTES constant | Centralize component routes |
| 1.13 | Modified | `src/lib/components/landing/FloatingNav.svelte` | href → ROUTES constant | Centralize component routes |
| 1.14 | Modified | `src/lib/components/mobile/Tiles.svelte` | Fallback route → ROUTES constant | Centralize component routes |
| 1.15 | Modified | `src/lib/components/mobile/BottomTabs.svelte` | href → ROUTES constant | Centralize component routes |
| 1.16 | Modified | `src/routes/(app)/form/how-can-we-help/+page.svelte` | goto() calls → ROUTES constants | Centralize form entry routes |
| 1.17 | Modified | `src/routes/(app)/evaluating/+page.svelte` | goto() calls → ROUTES constants | Centralize evaluating routes |
| 1.18 | Modified | `src/lib/state/landingNavigation.svelte.ts` | goto() calls → ROUTES constants | Centralize state navigation |
| 1.19 | Modified | `src/lib/testing/e2e/*.setup.ts` (6 files) | Local ROUTES → APP_ROUTES imports | Centralize E2E test routes |
| 1.20 | Modified | `src/lib/testing/e2e/formHelpers.ts` | Local FORM_ROUTES → APP_ROUTES import | Centralize E2E helper routes |
| 1.21 | Modified | `src/lib/testing/e2e/*.spec.ts` (4 files) | Hardcoded assertions → APP_ROUTES constants | Centralize E2E test assertions |
| 1.22 | Modified | `src/lib/testing/homeLoan/pageFlowMap.ts` | Local ROUTES → APP_ROUTES imports | Centralize test flow map routes |

**Remaining (intentionally not migrated):**
- `src/routes/applicantForm/` — legacy routes, will be archived in Phase 2
- `src/routes/(app)/form/*.ts` — commented-out redirects, will be cleaned in Phase 4
- `src/lib/config/routes.ts` — the source of truth itself

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 2: Dead Code Archival + Schema Consolidation

| # | Action | Original Path | New/Archive Path | Reason |
|---|--------|--------------|-----------------|--------|
| 2.1a | Modified | `src/lib/testing/schema/schemaExtractor.ts` | (same) | Redirected imports from `$lib/config/schemas/` → `$lib/server/formEngine/schemas/` |
| 2.1b | Archived | `src/lib/config/schemas/formSchema.json` | `src/_archived/lib/config/schemas/formSchema.json` | Duplicate of canonical source |
| 2.1c | Archived | `src/lib/config/schemas/applicantQuestion.json` | `src/_archived/lib/config/schemas/applicantQuestion.json` | Duplicate of canonical source |
| 2.1d | Archived | `src/lib/config/schemas/homeLoanSchema.json` | `src/_archived/lib/config/schemas/homeLoanSchema.json` | Duplicate of canonical source |
| 2.2a | Archived | `src/routes/test/+page.svelte` | `src/_archived/routes/test/+page.svelte` | Legacy debug route |
| 2.2b | Archived | `src/routes/testAPI/+page.svelte` | `src/_archived/routes/testAPI/+page.svelte` | Legacy debug route |
| 2.2c | Archived | `src/routes/testing-relationship/+page.svelte` | `src/_archived/routes/testing-relationship/+page.svelte` | Legacy debug route |
| 2.3a | Archived | `src/routes/applicantForm/+layout.svelte` | `src/_archived/routes/applicantForm/+layout.svelte` | Legacy form route tree |
| 2.3b | Archived | `src/routes/applicantForm/+page.svelte` | `src/_archived/routes/applicantForm/+page.svelte` | Legacy form route tree |
| 2.3c | Archived | `src/routes/applicantForm/incomePage/+page.svelte` | `src/_archived/routes/applicantForm/incomePage/+page.svelte` | Legacy form route tree |
| 2.3d | Archived | `src/routes/applicantForm/obligationPage/+page.svelte` | `src/_archived/routes/applicantForm/obligationPage/+page.svelte` | Legacy form route tree |
| 2.3e | Archived | `src/routes/applicantForm/relationShip/+page.svelte` | `src/_archived/routes/applicantForm/relationShip/+page.svelte` | Legacy form route tree |
| 2.3f | Archived | `src/routes/applicantForm/unsecureLoan/+page.svelte` | `src/_archived/routes/applicantForm/unsecureLoan/+page.svelte` | Legacy form route tree |

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 3: Config Directory Naming → camelCase

| # | Action | Original Path | New Path | Reason |
|---|--------|--------------|----------|--------|
| 3.1a | Renamed | `src/lib/config/ApplicantOptions/` | `src/lib/config/applicantOptions/` | camelCase convention |
| 3.1b | Modified | `src/lib/components/ExistingLoanDetails.svelte` | (same) | Updated import path |
| 3.1c | Modified | `src/lib/components/onboarding/v2/BusinessProfileSection.svelte` | (same) | Updated import path |
| 3.2a | Renamed | `src/lib/config/wizard-sections/` | `src/lib/config/wizardSections/` | camelCase convention |
| 3.2b | Modified | 6 form page `+page.svelte` files | (same) | Updated import paths |

**Merged from main:** `1ca3d05c` (MonthYearModal fix)

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 4: Route Renaming → kebab-case (IN PROGRESS)

| # | Action | Original Path | New Path | Reason |
|---|--------|--------------|----------|--------|
| 4.1a | Renamed | `src/routes/(app)/form/home-Loan/` | `src/routes/(app)/form/home-loan/` | kebab-case convention |
| 4.1b | Modified | `src/lib/config/routes.ts` | (same) | `HOME_LOAN: '/form/home-Loan'` → `'/form/home-loan'` |
| 4.2a | Renamed | `src/routes/(app)/form/Lap/` | `src/routes/(app)/form/lap/` | kebab-case convention |
| 4.2b | Modified | `src/lib/config/routes.ts` | (same) | `LAP: '/form/Lap'` → `'/form/lap'` |
| 4.3a | Renamed | `src/routes/(app)/form/plot-Loan/` | `src/routes/(app)/form/plot-loan/` | kebab-case convention |
| 4.3b | Modified | `src/lib/config/routes.ts` | (same) | `PLOT_LOAN: '/form/plot-Loan'` → `'/form/plot-loan'` |
| 4.3c | Modified | `src/lib/types/form.ts` | (same) | Updated comment: route names to kebab-case |
| 4.3d | Modified | `src/lib/testing/e2e/plotLoan-happyPath.spec.ts` | (same) | Updated URL assertion regex |
| 4.4a | Renamed | `src/routes/(app)/form/unsecureLoan/Professional-Loan/` | `src/routes/(app)/form/unsecure-loan/professional-loan/` | kebab-case convention |
| 4.4b | Renamed | `src/routes/(app)/form/unsecureLoan/personal-Loan/` | `src/routes/(app)/form/unsecure-loan/personal-loan/` | kebab-case convention |
| 4.4c | Renamed | `src/routes/(app)/form/unsecureLoan/business-Loan/` | `src/routes/(app)/form/unsecure-loan/business-loan/` | kebab-case convention |
| 4.4d | Renamed | `src/routes/(app)/form/unsecureLoan/` | `src/routes/(app)/form/unsecure-loan/` | kebab-case convention (parent dir) |
| 4.4e | Modified | `src/lib/config/routes.ts` | (same) | All UNSECURE_LOAN paths → kebab-case |
| 4.4f | Modified | `src/lib/testing/e2e/professionalLoan-happyPath.spec.ts` | (same) | Updated URL assertion regex |
| 4.4g | Modified | `src/lib/testing/e2e/personalLoan-happyPath.spec.ts` | (same) | Updated URL assertion regex |
| 4.4h | Modified | `src/lib/testing/e2e/businessLoan-happyPath.spec.ts` | (same) | Updated URL assertion regex |
| 4.5a | Modified | `src/routes/(app)/form/how-can-we-help/+page.server.ts` | (same) | Updated comment: `home-Loan` → `home-loan` |
| 4.5b | Modified | `src/lib/testing/e2e/homeLoan-multiApplicant.spec.ts` | (same) | Updated URL check: `home-Loan` → `home-loan` |

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 5: Component Naming → PascalCase

| # | Action | Original Path | New Path | Reason |
|---|--------|--------------|----------|--------|
| 5.1a | Renamed | `src/lib/components/customIncomeTable.svelte` | `src/lib/components/CustomIncomeTable.svelte` | PascalCase convention |
| 5.1b | Modified | `src/lib/components/Company.svelte` | (same) | Updated import path |
| 5.1c | Modified | `src/lib/components/IncomeSourceForm.svelte` | (same) | Updated import path |
| 5.1d | Modified | `src/lib/components/SelfEmploymentProfessional.svelte` | (same) | Updated import path |
| 5.1e | Modified | `src/lib/components/SelfEmploymentOther.svelte` | (same) | Updated import path |
| 5.2a | Renamed | `src/lib/components/onboarding/NewSelect.svelte` | `src/lib/components/onboarding/OnboardingSelect.svelte` | Resolve duplicate name ambiguity |
| 5.2b | Modified | `src/lib/components/onboarding/DSADetails.svelte` | (same) | Updated import + template usage |
| 5.2c | Modified | `src/lib/components/onboarding/BasicFields.svelte` | (same) | Updated import + template usage |
| 5.2d | Modified | `src/routes/(onboarding)/rm-onboarding/+page.svelte` | (same) | Updated import + template usage |

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 6: Barrel Exports

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 6.1 | Created | `src/lib/config/applicantOptions/index.ts` | Barrel re-exporting `personalLoanType`, `businessLoanType` | Consistent with existing pattern |
| 6.2 | Created | `src/lib/config/bankSelection/index.ts` | Barrel re-exporting `bankData` | Consistent with existing pattern |

**Existing barrels verified:** `incomeProfiles/index.ts`, `wizardSections/index.ts` — both valid.

**Test results:** 52 files, 4,451 tests — ALL PASSED ✅

---

### Phase 7: Documentation

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 7.1 | Updated | `docs/OVERHAUL-CHANGELOG.md` | Finalized with all phase entries | Complete change record |
| 7.2 | Updated | `docs/OVERHAUL-PLANNER.md` | Updated status: all phases complete | Living state document |
| 7.3 | Updated | `CLAUDE.md` | Added `routes.ts` to important files | Route centralization reference |
| 7.4 | Updated | `docs/DEVELOPMENT-PLAN.md` | Added overhaul summary | Per project convention |

---

---

## Deep Refactoring — Phase 2 (Code Quality & Engineering Standards)

> Started: 2025-02-19 (same session as Phase 1 completion)

### Pass 0: Dead Code Cleanup

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 0.1 | Modified | 7 `.svelte` files | Removed all commented-out `// $:` blocks (275 lines) | Dead Svelte 4 artifacts post-migration |
| 0.2 | Archived | `src/lib/utils/isvIsible.ts` → `src/_archived/lib/utils/isvIsible.ts` | Zero importers, typo in filename, superseded by showWhenEngine.ts | Dead code |

### Pass 1: Logger Fix + Adoption

| # | Action | File(s) | What Changed | Reason |
|---|--------|---------|-------------|--------|
| 1A | Fixed | `src/lib/server/logger.ts` | Added missing `console.info()` call in `info()` method | Bug: info() was a no-op |
| 1B | Modified | 144 server files | Replaced all `console.error/warn/log` → structured `logger.error/warn/info` | Consistent structured logging |

**Result:** Zero `console.error/warn` calls remain in `src/routes/api/` and `src/routes/dashboard/**/+page.server.ts`. Only `logger.ts` itself (correctly) uses console internally.

### Pass 2A: API Response Standardization

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 2A | Created | `src/lib/server/apiResponse.ts` | New module: `apiOk`, `apiError`, `apiServerError`, `apiValidationError`, `parseJsonBody` | Codify existing { success, data, error } pattern |

### Pass 3: Rate Limiter Consolidation

| # | Action | File(s) | What Changed | Reason |
|---|--------|---------|-------------|--------|
| 3.1 | Modified | `src/routes/api/auth/send-otp/+server.ts` | Removed ~40 lines of local Map + helpers → `rateLimit()` | Use centralized rate limiter |
| 3.2 | Modified | `src/routes/api/auth/resend-otp/+server.ts` | Removed ~55 lines of local Map + helpers → `rateLimit()` | Use centralized rate limiter |
| 3.3 | Modified | `src/routes/api/share-link/verify-otp/+server.ts` | Removed ~20 lines of inline Map logic → `rateLimit()` | Use centralized rate limiter |

### Passes 4-6: Developer Documentation

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 4.1 | Created | `src/lib/config/README.md` | Config directory documentation (14 KB) | Developer onboarding |
| 5.1 | Created | `src/lib/utils/README.md` | Utilities directory documentation (15 KB) | Developer onboarding |
| 6.1 | Created | `src/lib/server/README.md` | Server modules documentation (14 KB) | Developer onboarding |
| 6.2 | Created | `src/lib/stores/README.md` | State management documentation (10 KB) | Developer onboarding |

### Pass 7: Final Documentation

| # | Action | File | What Changed | Reason |
|---|--------|------|-------------|--------|
| 7.1 | Updated | `docs/OVERHAUL-CHANGELOG.md` | Added complete Phase 2 entries | Change tracking |
| 7.2 | Updated | `docs/OVERHAUL-PLANNER.md` | Phase 2 status → COMPLETE | Living state document |
| 7.3 | Updated | `CLAUDE.md` | Added `apiResponse.ts` to important files | Reference update |

---

## Summary Statistics (Phase 1 + Phase 2 Combined)

| Metric | Phase 1 | Phase 2 | Total |
|--------|---------|---------|-------|
| **Commits** | 18 | 8 | 26 |
| **Files created** | 5 | 5 (apiResponse.ts + 4 READMEs) | 10 |
| **Files modified** | 50+ | 152 (144 logger + 7 dead code + 3 rate limiter) | 200+ |
| **Files archived** | 12 | 1 (isvIsible.ts) | 13 |
| **Lines removed** | — | 275 (dead code) + 152 (rate limiters) = 427 | 427+ |
| **Tests passing** | 4,451 | 4,451 | 4,451 (all 52 files) |

---

## Phase 3 — apiResponse.ts Adoption (Deferred D11)

> Completes the deferred Pass 2B-2N: adopting `apiResponse.ts` helpers across all non-guarded API routes.

### Main Branch Sync (adopted before Phase 3 work)

| # | Source Commit | What Adopted | Files |
|---|---------------|-------------|-------|
| S1 | `bb138ee4` | svelte-check warning fixes: `state_referenced_locally`, a11y labels, button wrapping | 17 .svelte files |
| S2 | `bd45809d` | Login +page.js → +page.ts with PageLoad type, Vercel runtime nodejs22.x | 2 files |
| S3 | `caf19204` | Remove unused zod import, delete 6 dead form +page.ts files | 7 files |

### Pass 2B: apiResponse.ts Adoption

Applied `apiResponse.ts` helpers to all 27 API routes that weren't using `guards.ts` (which already provides standardized responses).

| Domain | Files Modified | Changes |
|--------|---------------|---------|
| **auth** | 18 | `apiError()` for validation/auth errors, `apiServerError()` for catch blocks, `apiOk()`/`apiOkMessage()` for successes. Custom shapes (tokens, cookies, otpSent, reqId) left as `json()`. |
| **share-link** | 3 | upload, submit, verify-otp — full adoption |
| **disclaimer** | 2 | accept, check — full adoption |
| **rm-contacts** | 1 | suggest — full adoption |
| **upload** | 1 | Partial (custom `{ files, warnings }` shape kept as `json()`) |
| **user** | 1 | language — partial (custom `{ language }` shape kept) |
| **test** | 1 | e2e-run-config — full adoption |

**Skipped (correctly):**
- `test/e2e-auth` — already uses guards
- `test/results` — no `{ success }` pattern (returns raw data)

**Net impact:** -246 lines of boilerplate removed across 27 files.

**Verification:** 4,451 tests pass ✅ | svelte-check: 0 errors, 0 warnings ✅

---
