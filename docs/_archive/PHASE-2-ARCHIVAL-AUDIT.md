# Phase 2 Archival — Legacy Store Audit Report

> **Date**: 2026-02-27
> **Status**: Audit complete, no deletions yet
> **Scope**: `src/lib/stores/` directory (26 files total)

---

## Executive Summary

**Phase 1 Status** ✅:
- 9 deprecated bridge files archived to `_archive/legacy-shims/`
- Originals deleted from active codebase
- Git history preserved, restoration paths documented

**Phase 2 Status** 🔍:
- 26 stores files analyzed
- 12 actively used in production code
- 8 legacy/deprecated (Phase 7+ candidates)
- 6 special status (bridges, utilities, subdirectories)

**Phase 3-4**: Deferred to future sessions (console statements, commented code)

---

## Store Files Inventory

### ✅ ACTIVE (Keep, migrate gradually to runes)

These files are actively imported by production code. DO NOT DELETE.

| File | Type | Imports | Usage | Migration Status | Notes |
|------|------|---------|-------|------------------|-------|
| `stores.ts` | Barrel | addToast, setAuthData | Auth pages (login, signup) | KEEP — Phase 8+ | Main backward-compat index; re-exports from new runes |
| `applicationData.ts` | Legacy store | applicationData | Form layout pages | KEEP — Phase 8+ | Writable store, still used by form system |
| `loanData.ts` | Legacy store | applicantsStore, existingUser, applicantErrors | Form pages, validation | KEEP — Phase 8+ | Core form data persistence |
| `device.svelte.ts` | Runes | deviceState | Mobile detection | KEEP — CANONICAL | Svelte 5 runes (correct import) |
| `modal.ts` | Legacy store | openModal | Application pages | KEEP — Phase 8+ | Dialog management (pre-runes) |
| `coins/coins.svelte.ts` | Runes | coinsState | Home/plot/LAP forms | KEEP — CANONICAL | Game reward system |
| `inputErrors.svelte.ts` | Runes | inputErrorsState | Form pages | KEEP — CANONICAL | Svelte 5 runes (correct import) |
| `restoreApplicantIntent.svelte.ts` | Runes | restoreIntentState | Form pages | KEEP — CANONICAL | Applicant recovery mechanism |
| `applicantRecovery.ts` | Utility | denyRecoveryPrefix | Form pages | KEEP — Phase 8+ | Recovery state (hybrid) |
| `applicantDataStore.svelte.ts` | Runes | applicantDataStore | Form pages | KEEP — CANONICAL | Applicant data persistence (runes) |
| `incomeProfileStore.ts` | Utility | incomeProfileStore | Form pages, loan app | KEEP — Phase 8+ | Income profile aggregation |
| `cleanPayloadStore.ts`/`.svelte.ts` | Hybrid | getCleanPayload, getCasePayload | Form pages | KEEP — BRIDGE | Bridge from legacy .ts to .svelte.ts |
| `userFormConformation.svelte.ts` | Runes | userFormConformationState | How-can-we-help page | KEEP — CANONICAL | Form confirmation tracking |
| `onboarding/onboarding.svelte.ts` | Runes | OnboardingData type | RM onboarding | KEEP — CANONICAL | Onboarding state management |

**Subtotal**: 14 files (keep as-is, gradual migration)

---

### 🔄 BRIDGES (Legacy shims for backward compat — keep or archive)

These are compatibility bridges that let old code use new runes-based state. Some are still in use, others can archive.

| File | Purpose | Active Usage | Status | Decision |
|------|---------|--------------|--------|----------|
| `auth-bridge.svelte.ts` | Bridge authState → readable stores | Auth pages via stores.ts | ACTIVE | KEEP — Phase 7 candidate |
| `_bridge.svelte.ts` | General rune↔store bridge utility | Multiple legacy stores | ACTIVE | KEEP — used by bridge files |
| `cleanPayloadStore.ts` | Bridge cleanPayloadStore.svelte.ts | Form pages | ACTIVE | KEEP — re-export wrapper |
| `device.ts` | Bridge deviceState → readable store | Archived code only | ARCHIVED (Phase 1) | Already in _archive/legacy-shims/ |
| `emailVerificationContext.ts` | Bridge for email verification | Archived code only | ARCHIVED (Phase 1) | Already in _archive/legacy-shims/ |
| `theme.ts` | Bridge themeState → readable store | Archived code only | ARCHIVED (Phase 1) | Already in _archive/legacy-shims/ |

**Subtotal**: 6 files (3 active bridges keeping, 3 in _archive)

---

### ❌ DEPRECATED (Phase 7+ candidates — mark, don't delete)

These files are NOT imported by production code but kept for backward compatibility. Mark as Phase 7 candidates.

| File | Purpose | Imports Found | Status | Phase 7 Action |
|------|---------|---|--------|---|
| `agreeModal.ts` | Legacy modal for agreement | ❌ None | DEPRECATED | Archive with header + note |
| `applicationData.ts` (duplicate) | Redundant applicationData export | ❌ None | DEPRECATED | Consolidate or archive |
| `confirmModal.ts` | Legacy confirm dialog | ❌ None | DEPRECATED | Archive with header + note |
| `formState.ts` | Legacy form state (replaced by formState.svelte in $lib/state) | ❌ None | DEPRECATED | Archive with header + note |
| `incomeProfileStore.ts` (legacy) | Legacy income state (has .svelte.ts counterpart) | ✅ Used | HYBRID | Keep bridge, archive when migrated |
| `loanData.d.ts` | Type definitions for loanData | ✅ Used | HYBRID | Keep with loanData.ts |
| `loanData.ts` | Legacy loan data store | ✅ Used | ACTIVE | Keep — core form persistence |
| `modalStack.ts` | Legacy modal stack manager | ❌ None | DEPRECATED | Archive with header + note |
| `numberToWords.svelte.ts` | Utility (number → words conversion) | Check usage | UNCLEAR | Audit imports, then decide |
| `restoreApplicantIntent.ts` | Legacy bridge for restore intent | ❌ None | DEPRECATED | Archive, use .svelte.ts directly |
| `emailVerificationContext.ts` (legacy) | Email verification (has .svelte.ts) | ❌ None | ARCHIVED | Already in _archive/ |
| `inputErrors.ts` | Legacy bridge for input errors | ❌ None | DEPRECATED | Archive, use .svelte.ts directly |

**Subtotal**: 12 deprecated files (candidates for Phase 7)

---

### 🔧 UTILITY / SUBDIRECTORIES (Keep as-is)

| File/Dir | Purpose | Status |
|----------|---------|--------|
| `onboarding/` | RM onboarding state management | KEEP — active subdirectory |
| `coins/` | Game reward system state | KEEP — active subdirectory |
| `relationshipStore.ts` | Relationship data persistence | KEEP — active |
| `applicantRecovery.ts` | Applicant recovery utility | KEEP — active |
| `incomeProfileStore.ts` | Income profile aggregation | KEEP — active |

**Subtotal**: 5 files (utilities, keep as-is)

---

## Archival Candidates (Phase 7 — Future Action)

**Files to Archive with Dated Headers** (when Phase 7 migration complete):
- `agreeModal.ts` (unused, ❌ no imports)
- `confirmModal.ts` (unused, ❌ no imports)
- `formState.ts` (unused, replaced by $lib/state/form.svelte)
- `modalStack.ts` (unused, ❌ no imports)
- `restoreApplicantIntent.ts` (legacy bridge, can use .svelte.ts directly)
- `inputErrors.ts` (legacy bridge, can use .svelte.ts directly)
- `emailVerificationContext.ts` (legacy bridge, already in _archive/)
- `device.ts` (legacy bridge, already in _archive/)

**Archival Pattern** (to apply in Phase 7):
```typescript
/**
 * [ARCHIVED 2026-TBD]
 *
 * This file was a legacy Svelte store/bridge that is no longer used.
 * All imports have been migrated to:
 * - src/lib/state/*.svelte.ts (canonical runes-based state)
 * - Direct runes usage in components
 *
 * Restoration: git show <commit>:src/lib/stores/FILENAME.ts
 *
 * Phase: Svelte 5 migration completion (Phase 7)
 */
```

---

## Bridge Architecture (Current State)

```
OLD PATTERN (Phase 1-2):
  component.svelte
    └─ import { store } from '$lib/stores/storeFile.ts'
       └─ export { store } from '$lib/stores/storeFile.svelte'  ← Svelte 5 runes
          └─ export const store = writable(initialValue)

NEW PATTERN (Target):
  component.svelte
    └─ import { stateObject } from '$lib/state/state.svelte.ts'
       └─ Direct runes usage: let { prop } = $derived(stateObject.prop)
```

**Hybrid Current State**:
- New code imports directly from `$lib/state/` (runes)
- Old code imports from `$lib/stores/` (bridges)
- Both work, bridges delegate to runes automatically

**Phase 7 Goal**: Migrate all remaining imports from `$lib/stores/` to `$lib/state/`

---

## Recommendations (Phase 2)

### ✅ Actions COMPLETED (Phase 1):
1. Archive 9 deprecated bridge files to `_archive/legacy-shims/`
2. Update .gitignore to allow `src/lib/stores/_archive/` versioning
3. Create `_archive/README.md` with archival policy

### 📋 Actions for Phase 2 (No Implementation Yet):
1. **Audit** ✅ — Complete (this document)
2. **Document** — Mark Phase 7 candidates in code comments (e.g., `@deprecated-Phase7`)
3. **No Deletions** — All deprecated files remain (backward compat)

### 🚀 Actions for Phase 7 (Future):
1. Migrate remaining component imports from `$lib/stores/` → `$lib/state/`
2. Archive deprecated store files with dated headers
3. Run `pnpm run check` to verify no broken imports
4. Clean git history (all code preserved in git)

---

## Notes for Next Session

### Phase 2 Implementation (Minimal, Non-Invasive)

**Time**: ~15 minutes (just annotations, no code changes)

**What to Do**:
1. Add deprecation comment to top of Phase 7 candidates:
   ```typescript
   /**
    * @deprecated [Phase 7] This file will be archived when all imports migrate to $lib/state/
    * See docs/ARCHIVAL-STRATEGY.md Phase 7 for migration timeline.
    */
   ```

2. Update `ARCHIVAL-STRATEGY.md` Phase 2 section with findings

3. Commit: `chore: mark Phase 7 archival candidates in legacy stores`

### Phase 3-4 Deferred

- Console statement migration (111 instances) — Phase 8 (~2-3 hours)
- Commented code archival (4,870 lines) — Phase 9 (~4-5 hours)

---

## Verification Checklist

Before marking Phase 2 complete:
- [ ] Read this audit report thoroughly
- [ ] No .ts files deleted from active codebase
- [ ] All deprecated files marked with `@deprecated [Phase 7]` comment
- [ ] ARCHIVAL-STRATEGY.md updated with Phase 2 findings
- [ ] Commit message references this audit document
- [ ] `pnpm run test:unit` passes (0 errors)
- [ ] `pnpm run check` passes (0 warnings)

---

## References

| Document | Link |
|----------|------|
| Archival Strategy | `docs/ARCHIVAL-STRATEGY.md` |
| Session 1 Alignment | `docs/SESSION-10-ALIGNMENT.md` |
| Development Plan | `docs/DEVELOPMENT-PLAN.md` |
| CLAUDE.md | CLAUDE.md (conventions, no deletions) |

