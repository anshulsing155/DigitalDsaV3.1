# DigitalDSA — Improvement Plan (Living Document)

> **Created**: 2026-02-20 (Post-merge: refactor/codebase-overhaul → main)
> **Last Updated**: 2026-02-20
> **Approach**: Engineering-first — codebase quality → UX polish → product features
> **Baseline**: 4,451 tests, 0 TS errors, 0 svelte-check warnings

---

## Status Summary

| Phase | Status | Tasks | Done |
|-------|--------|-------|------|
| E1: Component Architecture | IN PROGRESS | 4 | 3 |
| E2: Unified Component Library | DONE | 5 | 4 |
| E3: i18n Expansion | DONE | 4 | 4 |
| U1: Form UX Quick Wins | DONE | 5 | 5 |
| U2: Dashboard UX | DONE | 4 | 4 |
| U3: Accessibility Pass | DONE | 5 | 5 |
| P0: Critical Fixes | DONE | 3 | 3 |
| P1: Product Features | DONE | 4 | 4 |

---

## Phase E1: Component Architecture (Engineering)

> Split oversized components, reduce duplication, improve maintainability.

### E1.1 — Extract shared FormPage logic from 5 loan page files
**Status**: DEFERRED (High risk — each page has intricate per-loan differences in updateAnswer(), goNext/goPrev, handleSubmit. Requires careful incremental approach.)
**Files**: `home-loan/+page.svelte` (1,660 lines), `lap/+page.svelte`, `plot-loan/+page.svelte`, `business-loan/+page.svelte`, `personal-loan/+page.svelte`
**Goal**: ~74% reduction (7,000 lines → ~1,800) by extracting shared form rendering into a reusable `FormPage` component.
**What**: The 5 form pages share 60-70% identical code (wizard setup, server evaluation, answer syncing, navigation, submission). Extract into:
- `FormPage.svelte` — shared orchestrator (~800 lines)
- Per-loan config files (~200 lines each) — loan-specific pages, custom handlers
**Analysis**: Completed deep analysis of all 5 files. Shared: evaluateOnServer, debounce, error helpers, updateAnswerByKey, resume logic, wizard nav, income handlers. Per-loan: updateAnswer cascades, goNext/goPrev flow, handleSubmit payload, special field types. Approach: incremental extraction of shared utilities first, then template consolidation.

### E1.2 — Split payloadBuilder.ts by domain
**Status**: DONE
**File**: `src/lib/utils/payloadBuilder.ts` (1,697 → 80 lines barrel re-export)
**Result**: Split into 8 domain files under `payloadBuilder/`:
- `types.ts` — All type definitions (~310 lines)
- `sanitizers.ts` — toNumber, toBoolean, deriveTitle (~45 lines)
- `activityProfiles.ts` — Multi-select activity → profile builders (~130 lines)
- `incomePayload.ts` — Income & financial extraction (~60 lines)
- `obligationPayload.ts` — Obligation/debt processing (~60 lines)
- `applicantPayload.ts` — Single applicant payload builder + relationship resolver (~220 lines)
- `loanTransaction.ts` — Loan transaction + orchestrators (buildLoanPayload, buildStructuredPayload) (~230 lines)
- `comparePayloads.ts` — Payload diff utility (~55 lines)
- `index.ts` — Barrel export (~55 lines)
- Original `payloadBuilder.ts` → thin re-export barrel (zero consumer changes needed)

### E1.3 — Split UnsecuredObligation.svelte
**Status**: DONE
**File**: `src/lib/components/UnsecuredObligation.svelte` (1,147 → 1,036 lines)
**Result**: Extracted `ObligationTable.svelte` (101 lines) — reusable table component for both term loans and credit lines. Eliminated duplicate table markup (two near-identical inline tables → single parametric component). Moved `shortRole()` and `shortEmiMethod()` helpers into the extracted component.

### E1.4 — Split IncomePageNew.svelte
**Status**: DONE
**File**: `src/lib/components/IncomePageNew.svelte` (1,172 → 1,045 lines)
**Result**: Extracted `IncomeTabContent.svelte` (207 lines) — shared tab content for all 4 income page tabs (income_profiles, income_details, credit_score, obligations_details). Eliminated duplicate tab rendering between single-applicant inline view and multi-applicant modal view. Moved restore-prompt styles to the extracted component. Removed unused imports (IncomeProfileSelector, IncomeSourceForm, IncomeSourceEntries, CreditScoreSection, UnsecuredObligation, RotateCcw, getDropdownLabel, validateProfileSelection).

---

## Phase E2: Unified Component Library (Engineering)

> Consolidate inconsistent components into a single design system.

### E2.1 — Unified Button component with variants
**Status**: DEFERRED (Low impact — Button.svelte has 0 consumers, ActionButton has 1. Codebase uses inline `<button>` elements with Tailwind. Migration cost outweighs benefit.)

### E2.2 — Modal keyboard support
**Status**: DONE
**Files**: `ConfirmModal.svelte`, `AgreeModal.svelte`, `WideModal.svelte`
**Result**: Converted ConfirmModal and AgreeModal from `<div>` overlays to native `<dialog>` elements — ESC key now works natively, proper `role="alertdialog"`, `aria-labelledby`/`aria-describedby`, zoom-in animation. WideModal already used `<dialog>` but was missing `onclose` handler — added ESC sync + `aria-modal`. InfoModal and Modal.svelte already had proper `<dialog>` usage.

### E2.3 — Unified EmptyState component
**Status**: DONE
**Files**: `EmptyState.svelte` (new), 4 dashboard pages migrated
**Result**: Created `EmptyState.svelte` with props: icon (any lucide component), title, description, variant (default/filtered/compact), action snippet slot. Three variants: `default` (dashed border, gradient icon bg), `filtered` (dashed border, neutral icon bg), `compact` (solid border, smaller). Migrated 4 pages: DSA cases (2 states: filtered + no-data with CTA buttons), CRM leads, lenders, sources (compact text-only). 7 more pages remain for future migration.

### E2.4 — Unified Pagination component
**Status**: DONE
**Files**: `Pagination.svelte` (new), admin audit page migrated
**Result**: Created `Pagination.svelte` with props: page, totalPages, totalCount (optional), onPageChange callback. Previous/Next buttons with ChevronLeft/Right icons, "Page X of Y (Z entries)" center text (count hidden on mobile). Admin audit page migrated from 35 lines of inline markup to single `<Pagination>` component.

### E2.5 — Loading skeleton system
**Status**: DONE
**Files**: `Skeleton.svelte` (new)
**Result**: Created `Skeleton.svelte` with 4 variants: `text` (single line or multi-line with last line at 60% width), `card` (rounded rectangle), `row` (circle avatar + 2 text lines), `field` (label + input). Shimmer animation via CSS `background-size: 200%` with sliding gradient. All variants support custom width/height. `aria-hidden="true"` for screen readers.

---

## Phase E3: i18n Expansion (Engineering)

> Expand translation coverage from ~25% to full coverage.

### E3.1 — Audit and extract all hardcoded strings
**Status**: DONE
**Result**: Comprehensive audit of ~350-450 hardcoded UI strings across 20+ file categories: dashboard (80+), cases (60+), auth/login (10+), errors (14), form wizard (15+), time formatting (7), stages (11), loan types (9), documents (15+), eligibility (4+), credit/legal status (11), result badges (5), improvement tips (3), rating aspects (5), pagination (3), communication channels (2), and sample data labels (5).

### E3.2 — Complete en.ts translation file
**Status**: DONE
**Result**: Expanded `en.ts` from 157 keys to 315+ keys. Added 16 new namespaces: `auth.*` (10), `error.*` (14), `dashboard.*` (50+), `cases.*` (20), `stage.*` (11), `loan.*` (9), `eligibility.*` (4), `factor.*` (6), `badge.*` (5), `effort.*` (3), `doc.*` (12), `credit.*` (11), `time.*` (7), `pagination.*` (3), `form.*` (11), `rating.*` (6), `comm.*` (2), `status.*` (7), `sample.*` (5).

### E3.3 — Complete hi.ts (Hindi) and mr.ts (Marathi)
**Status**: DONE
**Result**: Full Hindi and Marathi translations for all 315+ keys. Hinglish register (Devanagari script, English technical terms retained) per AD-13 style guide. Mumbai/Pune casual register for Marathi. Both files 100% coverage matching en.ts baseline.

### E3.4 — Add pluralization and number formatting
**Status**: DONE
**Result**: Added to `i18n/index.ts`: `tPlural()` — picks one_key or many_key based on count with `{{count}}` substitution. `formatNumber()` — Indian locale grouping (12,34,567) with Arabic numerals for all languages. `formatCurrency()` — INR formatting with optional compact mode (₹12.3L, ₹1.5Cr). `formatTimeAgo()` — relative time using i18n time.* keys. Locale map forces `latn` numbering for hi/mr (industry standard).

---

## Phase U1: Form UX Quick Wins

### U1.1 — Autosave indicator
**Status**: DONE
**Files**: `SaveIndicator.svelte` (new), all 6 loan page files
**Result**: Created `SaveIndicator.svelte` component showing "Saving..." (pulsing) during evaluation and "Saved" (green checkmark, fades after 2s) on completion. Placed next to page title in all 6 loan pages.

### U1.2 — Error summary on disabled Next button
**Status**: DONE
**Files**: `FormNavigationBar.svelte`, all 6 loan page files
**Result**: Added `errorSummary` prop to FormNavigationBar — when Next is muted and server has validation errors, shows "Missing: [field1], [field2], [field3]" hint (max 3 items) above the navigation buttons. Each page derives `errorSummary` from `serverPage.validationErrors` mapped to question labels with HTML tags stripped.

### U1.3 — Loading state during server evaluation
**Status**: DONE
**Files**: `FormStepContainer.svelte`, all 6 loan page files
**Result**: Added `evaluating` prop to FormStepContainer — content fades to 60% opacity + pointer-events disabled during server evaluation. Sliding gradient bar at viewport top with `aria-live="polite"` for screen readers. All 6 loan pages pass `{evaluating}` through to FormStepContainer.

### U1.4 — Income section running total
**Status**: DONE
**Files**: `IncomeTotalBar.svelte` (new), `incomeEstimate.ts` (new), `IncomeTabContent.svelte`, all 6 loan page files
**Result**: Created `incomeEstimate.ts` utility with `estimateMonthlyIncome()` that maps all 12 income profile types to their monthly equivalent (handles salary, profit frequency, annual-to-monthly conversions, P&L table averages). `IncomeTotalBar.svelte` renders "Est. Monthly Income: ₹X,XX,XXX" (Indian number formatting) below income entries. Added to both `IncomeTabContent` (multi-applicant modal) and all 6 form pages (single-applicant inline). Bar only shows when entries exist and total > 0.

### U1.5 — Form field required indicators
**Status**: DONE
**Files**: All 7 form page files (home-loan, lap, plot-loan, business-loan, personal-loan, professional-loan, how-can-we-help)
**Result**: Added `required={question.required ?? false}` to all RadioField usages (7 files). MultipleSelectField already had the prop. TextField, SelectField, DerivedSelect already passed it. Now all form field types consistently show red asterisk (*) on required fields.

---

## Phase U2: Dashboard UX

### U2.1 — Replace native confirm() with ConfirmModal
**Status**: DONE
**Files**: `dashboard/+layout.svelte`, `admin/users/admins/+page.svelte`, `admin/settings/+page.svelte`, `dsa/cases/[case_id]/+page.svelte`, `dsa/rm-contacts/+page.svelte`, `dsa/shared-links/+page.svelte`
**Result**: Added `<ConfirmModal />` to the dashboard root layout for global availability. Replaced all 5 native `confirm()` calls with `openConfirmModal()` using contextual titles, descriptive messages, and labeled confirm buttons (Deactivate, Delete, Remove, Revoke). Each destructive action now shows a styled modal with Cancel/Confirm instead of a browser-native dialog.

### U2.2 — Consistent empty states across all dashboard pages
**Status**: DONE
**Files**: `dsa/shared-links/+page.svelte`, `dsa/rm-contacts/+page.svelte`, `dsa/cases/[case_id]/+page.svelte`, `dsa/analytics/+page.svelte`
**Result**: Migrated 4 additional pages (8 empty states total) to the unified `EmptyState` component created in E2.3. Uses `default` variant for primary empty states with CTA action snippets, `filtered` variant for filter-dependent states, and `compact` variant for sidebar/secondary sections.

### U2.3 — Breadcrumbs on case detail pages
**Status**: DONE
**Files**: `Breadcrumbs.svelte` (new), `dsa/cases/[case_id]/+layout.svelte`
**Result**: Created accessible `Breadcrumbs.svelte` component with `<nav aria-label="Breadcrumb">`, chevron separators, and current-page indication. Replaced the "Back to Cases" link in case detail layout with dynamic breadcrumbs: `Cases > Case Label > [Tab Name]`. Active sub-tab (Results, File Builder, Timeline) auto-detected from URL path.

### U2.4 — Dashboard search/command palette
**Status**: DONE
**Files**: `CommandPalette.svelte` (new), `dashboard/+layout.svelte`
**Result**: Created `CommandPalette.svelte` with Cmd+K / Ctrl+K keyboard shortcut. Role-aware page registry (DSA: 12 pages, Admin: 8 pages, RM: 9 pages) with fuzzy text search, grouped results (Pages/Actions), keyboard navigation (Arrow keys + Enter), and Esc to close. Renders as overlay at 20vh from top with animated backdrop.

---

## Phase U3: Accessibility Pass

### U3.1 — Focus management on modals
**Status**: DONE
**Result**: Created `focusTrap.ts` Svelte action (Tab cycling + focus restore). Applied `use:focusTrap` to conditionally-rendered modals (MonthYearModal, CommandPalette). Added `previouslyFocused` save/restore to always-in-DOM modals (Modal, ConfirmModal, AgreeModal, WideModal, InfoModal) via their `$effect` hooks. Native `<dialog>.showModal()` already traps focus.

### U3.2 — Skip-to-main-content link
**Status**: DONE
**Result**: Added `<a href="#main-content" class="skip-link">` to root layout. Positioned off-screen by default, slides into view on `:focus`. Added `id="main-content"` to both root `<main>` and dashboard `<main>`.

### U3.3 — ARIA labels on color-only indicators
**Status**: DONE
**Result**: Traffic light dots (LenderResultCard, ResultsSummaryBar, ResultsSortFilterBar) — `aria-hidden="true"` on decorative dots with adjacent text labels, `aria-label` on summary counts. Severity dots (case detail) — `role="img" aria-label="Critical"/"Warning"`. Policy status dots — `role="img" aria-label="Has/No active version"`. Parsing indicators — `aria-hidden="true"` (text label present).

### U3.4 — Keyboard navigation for forms
**Status**: DONE
**Result**: Added global `:focus-visible` outline ring (2px solid accent, 2px offset) in app.css. Form inputs excluded (already have border-color focus styles). FormNavigationBar buttons get white outline with accent ring on `:focus-visible`. Buttons already had aria-labels and logical tab order.

### U3.5 — Screen reader announcements for dynamic content
**Status**: DONE
**Result**: ToastContainer — `role="status" aria-live="polite"`. SaveIndicator — wrapped in `aria-live="polite" aria-atomic="true"`. FormTopProgress step text — `aria-live="polite"`. Progress bar — `role="progressbar"` with aria-valuenow/min/max. FormStepContainer evaluating indicator already had aria-live.

---

## Phase P0: Critical Quick Fixes

### P0.1 — Login "Contact Support" button goes nowhere
**Status**: DONE
**File**: `src/routes/(auth)/login/+page.svelte`
**Fix**: Changed `goto('#')` to `goto('/contact')`.

### P0.2 — Privacy policy contradicts NRI login exception
**Status**: DONE
**File**: `src/routes/(legal)/privacy/+page.svelte`
**Fix**: Added NRI exception (12.1) and temporary travel exception (12.2) sub-sections to Section 12.

### P0.3 — Contact form rate limiting
**Status**: DONE
**File**: `src/routes/(legal)/contact/+page.server.ts`
**Fix**: Added rate limit using existing `rateLimit()` — 1 submission per IP per 5 minutes.

---

## Phase P1: Product Features

### P1.1 — Draft export (JSON)
**Status**: DONE
**Files**: `DraftExportButton.svelte` (new), `form/+layout.svelte`
**Result**: Created `DraftExportButton.svelte` — floating download button (bottom-right, above ResetDataButton) that exports the full `formState.toJSON()` as a timestamped JSON file (`DigitalDSA-{LoanType}-Draft-{date}.json`). Only visible on actual form pages (not how-can-we-help). Added to form layout alongside existing ResetDataButton.

### P1.2 — Prefill from previous application
**Status**: DONE
**Files**: `how-can-we-help/+page.svelte`, `iconRegistry.ts`
**Result**: Added "Load Previous Case" button in form start page navigation. Opens modal showing last 10 cases fetched from `GET /api/cases`. Each case shows label, loan type, stage badge, and relative date. Clicking a case fetches its latest snapshot via `/api/cases/{id}/snapshots?limit=1`, calls `formState.fromJSON()` to restore form state, then navigates to the appropriate loan form page. Loading and error states handled. Original case is unchanged — creates a new application.

### P1.3 — OTP resend timer on shared link
**Status**: DONE
**File**: `src/routes/f/[token]/+page.svelte`
**Result**: 30-second countdown timer on resend OTP button. Client-side cooldown check prevents spam before server rate limit kicks in. Timer starts on initial OTP send and each resend. Button shows `Resend OTP (Xs)` during countdown, disabled until timer completes. Uses `setInterval` with cleanup on component destroy.

### P1.4 — Shared link session timeout warning
**Status**: DONE
**File**: `src/routes/f/[token]/+page.svelte`
**Result**: Session monitoring starts when OTP is verified (or immediately if no OTP required). Checks every 10 seconds against `data.link.expiresAt`. Shows warning modal at 5 minutes ("Session Expiring Soon") and at 1 minute ("less than 1 minute!") before expiry. Each warning only shows once (dismissible). Force-reloads page when session expires to show server-rendered error state. Modal uses `role="dialog" aria-modal="true"` for accessibility.

---

## Changelog

| Date | Task | What Changed | Tests | Errors |
|------|------|-------------|-------|--------|
| 2026-02-20 | Merge | refactor/codebase-overhaul merged into main (78 commits, 342 files, 17 conflicts resolved) | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | P0.1 | Login "Contact Support" → routes to /contact instead of # | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | P0.2 | Privacy policy Section 12: added NRI + travel exceptions (12.1, 12.2) | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | P0.3 | Contact form: rate limited to 1 submission per IP per 5 min via existing rateLimiter | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E1.2 | payloadBuilder.ts split into 8 domain files under payloadBuilder/ (1,697 → 80 lines barrel). Zero consumer changes. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E1.3 | Extracted ObligationTable.svelte (101 lines) from UnsecuredObligation (1,147 → 1,036). Deduplicated term loan / credit line tables. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E1.4 | Extracted IncomeTabContent.svelte (207 lines) from IncomePageNew (1,172 → 1,045). Deduplicated inline/modal tab content. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E2.2 | Modal keyboard support: ConfirmModal + AgreeModal → native `<dialog>` (ESC key, role="alertdialog", ARIA). WideModal → added onclose + aria-modal. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U1.3 | FormStepContainer evaluating state: opacity fade + pointer-events disable + sliding gradient bar + aria-live. All 6 loan pages wired up. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U1.5 | Required field indicators: added `required` prop to all 7 RadioField usages. All form field types now consistently show asterisk on required fields. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U1.1 | SaveIndicator component: "Saving..." pulse during evaluation, "Saved" checkmark on completion (2s fade). Added to all 6 loan pages next to page title. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U1.2 | Error summary on disabled Next: FormNavigationBar shows "Missing: [field1], [field2]..." hint from server validation errors. All 6 loan pages derive errorSummary. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U1.4 | Income running total: `incomeEstimate.ts` maps all 12 profile types to monthly income. `IncomeTotalBar.svelte` shows "Est. Monthly Income: ₹X,XX,XXX" in Indian format. Added to IncomeTabContent + all 6 form pages. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E2.3 | Unified `EmptyState.svelte` with 3 variants (default/filtered/compact), icon + title + description + action snippet. Migrated DSA cases (2 states), CRM leads, lenders, sources. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E2.4 | Unified `Pagination.svelte` with Previous/Next, page counter, total count. Migrated admin audit page (35 lines → single component). | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | E2.5 | `Skeleton.svelte` with 4 variants (text/card/row/field), shimmer animation, custom dimensions, multi-line support. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U2.1 | Replaced 5 native `confirm()` calls with `openConfirmModal()`. Added `<ConfirmModal />` to dashboard layout. Custom titles + confirm labels per action. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U2.2 | Migrated 4 additional pages (8 empty states) to unified EmptyState: shared-links, rm-contacts, case detail (lenders + timeline), analytics. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U2.3 | `Breadcrumbs.svelte` component + replaced "Back to Cases" link. Dynamic: Cases > Case Label > [Tab]. Accessible with aria-label. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U2.4 | `CommandPalette.svelte` with Cmd+K shortcut. Role-aware page registry (DSA 12/Admin 8/RM 9). Fuzzy search, keyboard nav, grouped results. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U3.1 | Focus trap: `focusTrap.ts` action + focus restore on all 7 modals (5 dialog-based + 2 div-based). | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U3.2 | Skip-to-main-content link in root layout, visible on Tab focus. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U3.3 | ARIA labels on 10+ color-only indicators (traffic lights, severity dots, policy status, parsing). | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U3.4 | Global `:focus-visible` outline ring + FormNavigationBar button focus styles. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-20 | U3.5 | `aria-live` on ToastContainer, SaveIndicator, FormTopProgress step text + progressbar role. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | E3.1 | Comprehensive i18n audit: ~350-450 hardcoded strings across 20+ file categories identified. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | E3.2 | Expanded en.ts: 157 → 315+ keys across 16 new namespaces (auth, error, dashboard, cases, stages, loans, eligibility, docs, credit, time, form, etc.). | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | E3.3 | Full hi.ts and mr.ts translations: 315+ keys each, Hinglish/Marathi casual register, 100% en.ts coverage. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | E3.4 | `tPlural()`, `formatNumber()`, `formatCurrency()` (compact: ₹12.3L/₹1.5Cr), `formatTimeAgo()`. Indian locale with latn digits. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | P1.1 | `DraftExportButton.svelte` — floating download button exports `formState.toJSON()` as timestamped JSON. Added to form layout. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | P1.2 | "Load Previous Case" button + modal on how-can-we-help page. Fetches last 10 cases, loads snapshot via `formState.fromJSON()`, navigates to form. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | P1.3 | 30s OTP resend timer on shared link page. Client-side countdown + cooldown. Button shows remaining seconds. | 4,451 pass | 0 errors, 0 warnings |
| 2026-02-21 | P1.4 | Session timeout warnings at 5min and 1min before shared link expiry. Warning modal with dismiss. Force-reload on expiry. | 4,451 pass | 0 errors, 0 warnings |
