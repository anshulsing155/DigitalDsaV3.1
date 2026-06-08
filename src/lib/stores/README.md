# src/lib/stores/ and src/lib/state/ -- Client State Management

This project uses a **dual state management system** during the migration from Svelte 4 stores to Svelte 5 runes. Understanding which system to use is critical for new development.

---

## Architecture Overview

```
src/lib/state/          <-- Svelte 5 runes (SOURCE OF TRUTH for new code)
  7 files, singleton class pattern using $state/$derived/$effect

src/lib/stores/         <-- Svelte 4 stores (COMPATIBILITY BRIDGES)
  ~26 files, writable/derived stores + bridge wrappers

Bridge mechanism:
  state/*.svelte.ts  -->  stores/_bridge.svelte.ts  -->  stores/*.ts
  (runes class)           (fromRune() adapter)           ($store consumers)
```

**Rule**: New code imports from `$lib/state/`. Existing code continues to work via bridges. Phase 8 will remove all bridges and the `stores/` directory.

---

## Source of Truth: `src/lib/state/` (Svelte 5 Runes)

Each file exports a singleton class instance using `$state` runes. Import these in new components.

### `auth.svelte.ts` -- Authentication State

Singleton: `authState`

Manages login/logout, session validation, token refresh, role checks, and permissions. Persists via httpOnly cookies (not client storage). Provides `hasPermission()` and `hasRole()` checks against `ROLE_PERMISSIONS` config.

**Replaces**: `stores/stores.ts` auth stores (currentUser, accessToken, refreshToken, isAuthenticated, isEmailVerified)

```ts
import { authState } from '$lib/state/auth.svelte';
const isLoggedIn = $derived(authState.isAuthenticated);
const canCreate = $derived(authState.hasPermission('cases.create'));
```

### `form.svelte.ts` -- Form State

Singleton: `formState`

Central manager for all form-filling state: loanData (dynamic JSON answers), applicationData (validated schema), applicants array, navigation history, page indices, form errors. Persists to sessionStorage (debounced) and Capacitor Preferences (mobile).

**Replaces**: `stores/loanData.ts`, `stores/applicationData.ts`, `stores/stores.ts` (form portions)

```ts
import { formState } from '$lib/state/form.svelte';
formState.setLoanField('loanType', 'Home Loan');
const applicants = $derived(formState.applicants);
```

### `dialog.svelte.ts` -- Dialog & Modal State

Singleton: `dialogState`

Unified manager for all modal/dialog state: info modal, applicant modal, agree modal, confirm modal, date picker state, email OTP modal, and the modal stack (body scroll locking).

**Replaces**: `stores/modal.ts` (9 stores), `stores/agreeModal.ts`, `stores/confirmModal.ts`, `stores/modalStack.ts`

```ts
import { dialogState } from '$lib/state/dialog.svelte';
dialogState.openConfirmModal('Delete?', 'Cannot undo.', () => doDelete());
```

### `ui.svelte.ts` -- UI State

Singleton: `uiState`

Non-form UI state: toast notifications, mobile detection (window resize listener), drawer state, alert notifications.

**Replaces**: `stores/stores.ts` (UI portions: addToast, initMobileDetection)

```ts
import { uiState } from '$lib/state/ui.svelte';
uiState.success('Case created!');
const mobile = $derived(uiState.isMobile);
```

### `applicant.svelte.ts` -- Applicant State

Singleton: `applicantState`

Per-applicant data management: meta (basic details), income profiles with multi-source entries, credit score, obligations. Features soft-delete/restore for profile switching, deleted applicant recovery via signature matching, restore intent modal state. Persists to sessionStorage (debounced).

**Replaces**: `stores/applicantDataStore.svelte.ts`, `stores/applicantRecovery.ts`, `stores/incomeProfileStore.ts`, `stores/restoreApplicantIntent.ts`

```ts
import { applicantState } from '$lib/state/applicant.svelte';
applicantState.addIncomeEntry('applicant-1', entry);
const showRestore = $derived(applicantState.shouldPromptRestore('applicant-1', 'salaried_regular'));
```

### `walkthrough.svelte.ts` -- Walkthrough/Tour State

Singleton: `walkthroughState`

Manages guided tour lifecycle (intro tour, explanatory tour, per-page tours). Handles step filtering for mobile/desktop, driver.js instance management, and server-side persistence of completion state.

**No legacy equivalent** -- this was built natively with runes.

### `landingNavigation.svelte.ts` -- Landing Page Navigation

Singleton: `landingNav`

Handles landing page CTA clicks: checks auth state, detects in-progress forms in sessionStorage, shows choice modal (resume vs. go to dashboard).

**No legacy equivalent** -- built natively with runes.

---

## Compatibility Bridges: `src/lib/stores/` (Svelte 4)

These files exist so that the 100+ existing component imports using `$store` syntax, `.set()`, `.update()`, and `.subscribe()` continue to work without modification. They are **not** the source of truth.

### Bridge Infrastructure

| File                    | Purpose                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_bridge.svelte.ts`     | Core bridge utilities: `fromRune()` converts runes getters to Svelte 4-compatible stores; `sessionPersisted()` creates sessionStorage-backed stores |
| `_bridge.ts`            | Deprecated stub -- redirects to `_bridge.svelte.ts`                                                                                                 |
| `auth-bridge.svelte.ts` | Auth-specific bridge: creates readable stores from `authState` getters                                                                              |

### Bridged Stores (delegate to `src/lib/state/`)

These files re-export store-compatible wrappers. The source of truth is the corresponding state file.

| Store File           | Source of Truth                               | Consumer Count |
| -------------------- | --------------------------------------------- | -------------- |
| `loanData.ts`        | `state/form.svelte.ts`                        | 74+ consumers  |
| `applicationData.ts` | `state/form.svelte.ts`                        | 3 consumers    |
| `modal.ts`           | `state/dialog.svelte.ts`                      | many consumers |
| `stores.ts`          | `state/auth.svelte.ts` + `state/ui.svelte.ts` | many consumers |

### Independent Stores (not yet migrated)

These stores have **no runes equivalent yet**. They will be migrated or absorbed in Phase 8.

| Store File                     | Purpose                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `applicantDataStore.svelte.ts` | Per-applicant structured data (Svelte 5 runes, older version -- superseded by `state/applicant.svelte.ts`) |
| `applicantRecovery.ts`         | Deleted applicant recovery (commented out -- absorbed into `state/applicant.svelte.ts`)                    |
| `incomeProfileStore.ts`        | Employment-type switching cache (superseded by `state/applicant.svelte.ts`)                                |
| `restoreApplicantIntent.ts`    | Restore modal state (absorbed into `state/applicant.svelte.ts`)                                            |
| `cleanPayloadStore.ts`         | TOMBSTONE — archived 2026-04-21 (S77c Phase 3.3). Canonical source: `cleanPayloadStore.svelte.ts`. See `_archive/legacy-shims/cleanPayloadStore.ts`. |
| `formState.ts`                 | Capacitor Preferences + sessionStorage clear utility                                                       |
| `dashboard.ts`                 | Sample data visibility toggle (persisted to localStorage)                                                  |
| `device.ts`                    | Window width, isMobile derived, isNative flag, loader state                                                |
| `theme.ts`                     | Light/dark/system theme with localStorage persistence                                                      |
| `inputErrors.ts`               | Simple writable for field-level input errors                                                               |
| `numberToWords.ts`             | Writable for number-to-words conversion cache                                                              |
| `emailVerificationContext.ts`  | Email + role context for OTP verification flow                                                             |
| `userFormConformation.ts`      | Loan name + first page data for form confirmation                                                          |
| `onboarding/onboarding.ts`     | Onboarding wizard state (step tracking, form fields per role)                                              |
| `coins/coins.ts`               | Available/used coins counters (gamification)                                                               |
| `agreeModal.ts`                | Agree modal state (bridged to `state/dialog.svelte.ts`)                                                    |
| `confirmModal.ts`              | Confirm modal state (bridged to `state/dialog.svelte.ts`)                                                  |
| `modalStack.ts`                | Modal stack + body lock (bridged to `state/dialog.svelte.ts`)                                              |

---

## Overlap Map: Stores vs. State

This table shows which legacy stores have been absorbed into which runes state files.

| Legacy Store                          | Runes State                    | Status             |
| ------------------------------------- | ------------------------------ | ------------------ |
| `stores/stores.ts` (auth portions)    | `state/auth.svelte.ts`         | Bridged            |
| `stores/stores.ts` (UI portions)      | `state/ui.svelte.ts`           | Bridged            |
| `stores/loanData.ts`                  | `state/form.svelte.ts`         | Bridged            |
| `stores/applicationData.ts`           | `state/form.svelte.ts`         | Bridged            |
| `stores/modal.ts`                     | `state/dialog.svelte.ts`       | Bridged            |
| `stores/agreeModal.ts`                | `state/dialog.svelte.ts`       | Bridged            |
| `stores/confirmModal.ts`              | `state/dialog.svelte.ts`       | Bridged            |
| `stores/modalStack.ts`                | `state/dialog.svelte.ts`       | Bridged            |
| `stores/applicantDataStore.svelte.ts` | `state/applicant.svelte.ts`    | Superseded         |
| `stores/applicantRecovery.ts`         | `state/applicant.svelte.ts`    | Absorbed           |
| `stores/incomeProfileStore.ts`        | `state/applicant.svelte.ts`    | Superseded         |
| `stores/restoreApplicantIntent.ts`    | `state/applicant.svelte.ts`    | Absorbed           |
| `stores/device.ts`                    | `state/ui.svelte.ts` (partial) | Partially overlaps |
| `stores/dashboard.ts`                 | --                             | Not yet migrated   |
| `stores/theme.ts`                     | --                             | Not yet migrated   |
| `stores/cleanPayloadStore.ts`         | `cleanPayloadStore.svelte.ts`  | Archived (S77c)    |
| `stores/onboarding/onboarding.ts`     | --                             | Not yet migrated   |
| `stores/coins/coins.ts`               | --                             | Not yet migrated   |
| `stores/emailVerificationContext.ts`  | --                             | Not yet migrated   |
| `stores/inputErrors.ts`               | --                             | Not yet migrated   |
| `stores/numberToWords.ts`             | --                             | Not yet migrated   |
| `stores/userFormConformation.ts`      | --                             | Not yet migrated   |
| `stores/formState.ts`                 | --                             | Not yet migrated   |

---

## Phase 8: Complete Migration Plan

Phase 8 will complete the migration from `stores/` to `state/`:

1. **Migrate remaining independent stores** to runes-based state managers (either new files in `state/` or absorbed into existing ones)
2. **Update all 100+ consumers** from `$store` syntax to direct rune access (`$derived`, `$effect`)
3. **Remove all bridge files** (`_bridge.svelte.ts`, `auth-bridge.svelte.ts`, bridged `loanData.ts`, etc.)
4. **Delete the entire `stores/` directory**

The bridge pattern (`fromRune()`) ensures zero consumer breakage during the gradual migration. Each consumer file can be migrated independently.

---

## Decision Guide: Where to Import From

| Scenario                                                     | Import From                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Writing new component code                                   | `$lib/state/*.svelte`                                              |
| Modifying existing Svelte 4 component (not ready to migrate) | Keep existing `$lib/stores/*` import                               |
| Migrating an existing component to Svelte 5                  | Change import to `$lib/state/*.svelte`, remove `$store` syntax     |
| Writing server-side code                                     | N/A -- state/stores are client-only                                |
| Writing a test                                               | Import from `$lib/state/*.svelte` (singleton, can call `.reset()`) |
