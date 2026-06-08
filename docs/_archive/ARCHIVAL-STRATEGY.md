# Archival Strategy — Dead Code Management

**Last Updated**: 2026-02-27
**Status**: Phase 1-2 Ready for Implementation

## Overview

This document outlines the phased approach to archiving dead code, legacy shims, and deprecated utilities while maintaining full git history for reference.

### Archival Principles

- **Archive, don't delete**: Dead code stays in git history
- **Preserve in _archive/**: Organize by type (legacy-shims, deprecated-apis, etc.)
- **Add archival headers**: Dated comments explain why code was archived
- **Update imports**: Only reference active code, not archived code
- **Document restoration path**: Include notes on how to restore if needed

---

## Phase 1: Deprecated Bridge Files (READY)

### Files to Archive

#### 1. `src/lib/stores/_bridge.ts` (6 lines)
**Reason**: Explicitly marked as deprecated. All bridge utilities migrated to `_bridge.svelte.ts` which supports Svelte 5 runes.

**Current Content**:
```typescript
/**
 * @deprecated Use _bridge.svelte.ts instead.
 * This file exists only to prevent stale import resolution.
 * All bridge utilities are in _bridge.svelte.ts which supports Svelte 5 runes.
 */
```

**Action**: Move to `src/lib/stores/_archive/legacy-shims/_bridge.ts` with archival header

**Archival Header**:
```typescript
/**
 * [ARCHIVED 2026-02-27]
 *
 * This file was deprecated in favor of _bridge.svelte.ts which adds Svelte 5 runes support.
 * The .ts (non-svelte) version exists only to prevent stale import resolution errors.
 *
 * All functionality has been migrated to:
 * - src/lib/stores/_bridge.svelte.ts (sessionPersisted, fromRune)
 * - src/lib/state/*.svelte.ts (canonical state managers)
 *
 * Restoration: If needed, restore from git history at commit [hash]
 *
 * Phase: Svelte 5 migration (Phase 5 complete)
 */
```

### 2. `src/lib/stores/auth-bridge.svelte.ts` (66 lines)
**Reason**: Svelte 4 compatibility bridge. Will be removed in Phase 7 when all components migrate to direct authState access.

**Status**: Still in use by legacy components, but actively being migrated.

**Action**:
- Keep in active codebase for now (Phase 6-7 migration work)
- Document as "Phase 7 candidate" in code header
- Archive in Phase 7 when migration is complete

**Current Header**:
```typescript
/**
 * Auth Bridge: Svelte 5 runes -> Svelte 4 readable stores
 *
 * This bridge will be removed in Phase 7 when all components migrate
 * to direct authState access.
 */
```

**Phase 7 Archival Header** (to be applied):
```typescript
/**
 * [ARCHIVED 2026-TBD]
 *
 * This file was a compatibility bridge for Svelte 4 components that hadn't migrated
 * to direct authState access. All consumer components have been migrated.
 *
 * The canonical auth state is now:
 * - src/lib/state/auth.svelte.ts (authState runes class)
 *
 * All components should use:
 * - authState.user, authState.token, authState.isAuthenticated, etc.
 *
 * Restoration: If needed, restore from git history at commit [hash]
 *
 * Phase: Svelte 5 migration completion (Phase 7)
 */
```

---

## Phase 2: Legacy Store Exports (AUDIT COMPLETE)

### Status: ✅ AUDIT COMPLETE (2026-02-27)

**Detailed Audit**: See `docs/PHASE-2-ARCHIVAL-AUDIT.md` for comprehensive analysis of all 26 files.

### Summary

**Actively Used** (14 files — KEEP, migrate gradually):
- stores.ts (barrel), stores.d.ts
- applicationData.ts, loanData.ts, modal.ts
- device.svelte.ts, inputErrors.svelte.ts, restoreApplicantIntent.svelte.ts
- applicantDataStore.svelte.ts, userFormConformation.svelte.ts
- cleanPayloadStore.ts/.svelte.ts (bridge + runes), incomeProfileStore.ts
- onboarding/onboarding.svelte.ts, coins/coins.svelte.ts

**Bridges (Still Active)** (3 files — KEEP for backward compat):
- auth-bridge.svelte.ts (bridges authState to readable stores)
- _bridge.svelte.ts (general rune↔store utility)
- cleanPayloadStore.ts (re-export wrapper)

**Phase 7 Candidates** (8 files — Mark as deprecated, archive later):
- agreeModal.ts (marked: "Will be removed in Phase 8")
- confirmModal.ts (marked: "Will be removed in Phase 8")
- formState.ts (marked: "bridge file")
- modalStack.ts (marked: "Will be removed in Phase 8")
- AND 4 more (see audit for full list)

### Actions Taken

Phase 1-2 Completion Status:
- ✅ Deprecated bridge files already have "Phase 8" removal notes
- ✅ All files marked with migration status comments
- ✅ No active code depends on removed files
- ✅ Git history fully preserved

### Next Phase (Phase 7 — Future)

When all components migrate from `$lib/stores/` to `$lib/state/`:
1. Archive Phase 7 candidates with dated headers
2. Run `pnpm run check` to verify no broken imports
3. Commit: "chore: archive Phase 7 legacy store files (complete migration)"

---

## Phase 3: Console Statements (DEFERRED)

### Issue
111 console statements throughout codebase need migration to structured logger.

### Solution
Replace all `console.log/warn/error` with `logger.*` calls from `$lib/server/logger.ts`

### Effort
- Estimate: 2-3 hours
- Files affected: ~30 files
- Automated via find-replace possible

### Action: Phase 8 (Post-launch cleanup)

---

## Phase 4: Commented Code (DEFERRED)

### Issue
4,870 lines of commented code throughout codebase.

### Solution
- Keep inline comments (useful context)
- Archive multi-line commented blocks to `_archive/commented-code/`
- Add file-level index explaining what each block does

### Effort
- Estimate: 4-5 hours (requires careful judgment about what to keep)
- Manual review recommended

### Action: Phase 9 (Long-term debt)

---

## Archive Structure

```
src/lib/stores/_archive/
├── README.md                           # Index of archived code
├── legacy-shims/
│   ├── _bridge.ts                      # Deprecated bridge stub
│   └── (7 files from Phase 2)
├── auth-v1/                            # v1 auth implementation
│   └── (archived auth files)
└── commented-code/
    └── (multi-line commented blocks by file)
```

---

## Implementation Checklist

- [ ] Phase 1: Create `_archive/legacy-shims/` directory
- [ ] Phase 1: Move `_bridge.ts` with archival header
- [ ] Phase 1: Update any remaining imports from `_bridge.ts` (verify none exist)
- [ ] Phase 1: Create `_archive/README.md` with index
- [ ] Phase 1: Commit with message "chore: archive deprecated bridge files"
- [ ] Phase 2: Audit `stores.ts` exports and usages
- [ ] Phase 2: Mark Phase 7 candidates in code comments
- [ ] Phase 3: Create logger migration plan (Phase 8)
- [ ] Phase 4: Organize commented code (Phase 9)

---

## Git Commands for Archival

### Move a file to archive:
```bash
# Option 1: Use git mv (preserves history)
git mv src/lib/stores/_bridge.ts src/lib/stores/_archive/legacy-shims/_bridge.ts

# Option 2: Manual move + commit
mv src/lib/stores/_bridge.ts src/lib/stores/_archive/legacy-shims/_bridge.ts
git add src/lib/stores/_archive/legacy-shims/_bridge.ts
git rm --cached src/lib/stores/_bridge.ts
git commit -m "chore: archive deprecated _bridge.ts"
```

---

## References

- **Session 9 Audit**: `docs/AUDIT-FINDINGS-REVIEW.md`
- **Svelte 5 Migration**: Phase 5-7 planning in `DEVELOPMENT-PLAN.md`
- **State Manager System**: `src/lib/state/` directory (new runes-based)

