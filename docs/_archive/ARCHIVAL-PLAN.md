# Dead Code Archival Plan — Phase 1 & 2

> **Date**: 2026-02-27 (Session 9)
> **Purpose**: Archive (not delete) obsolete code with clear restoration path
> **Status**: Ready to execute

---

## Why Archive Instead of Delete?

✅ **Benefits**:
- Historical reference (why was this built, when was it used)
- Restoration if needed (git history preserved, but organized in _archive)
- Safety (nothing lost, easy to locate if emergency restore needed)
- Clarity (signals "deprecated" without removing)

---

## Phase 1: testDataStorage.ts (Already Archived)

**Status**: ✅ COMPLETE

**What**: Archived 413-line test data persistence module

**Location**:
- **From**: `src/lib/testing/storage/testDataStorage.ts`
- **To**: `src/lib/testing/_archive/testDataStorage.ts` ✅ (done)

**Reason**:
- Zero references in codebase
- No imports found
- Tests not using this storage abstraction
- Replaced by modern fixture/generator approach

**Restoration**:
```bash
# If needed in future:
git mv src/lib/testing/_archive/testDataStorage.ts src/lib/testing/storage/testDataStorage.ts
```

---

## Phase 2: Legacy Store Shim Files (Ready to Archive)

**Status**: 🔄 READY TO EXECUTE

**What**: 7 backward-compatibility bridge files for Svelte 5 runes migration

**Pattern**: Each `.ts` file just re-exports from its `.svelte.ts` counterpart
```typescript
// Example: cleanPayloadStore.ts
export { cleanPayloadState, getCleanPayload, ... } from './cleanPayloadStore.svelte';
export const cleanPayload = fromRuneReadonly(() => cleanPayloadState.cleanPayload);
```

**Files to Archive** (7 total, ~90 lines combined):

| File | Size | Purpose | New Location |
|------|------|---------|--------------|
| `src/lib/stores/cleanPayloadStore.ts` | ~88 L | Bridge for `cleanPayloadState` runes | `_archive/legacy-shims/cleanPayloadStore.ts` |
| `src/lib/stores/dashboard.ts` | ~25 L | Bridge for `dashboardState` | `_archive/legacy-shims/dashboard.ts` |
| `src/lib/stores/device.ts` | ~8 L | Bridge for `deviceState` | `_archive/legacy-shims/device.ts` |
| `src/lib/stores/emailVerificationContext.ts` | ~20 L | Bridge for email verification | `_archive/legacy-shims/emailVerificationContext.ts` |
| `src/lib/stores/inputErrors.ts` | ~8 L | Bridge for `inputErrorsState` | `_archive/legacy-shims/inputErrors.ts` |
| `src/lib/stores/numberToWords.ts` | ~10 L | Bridge for `numberToWordsState` | `_archive/legacy-shims/numberToWords.ts` |
| `src/lib/stores/restoreApplicantIntent.ts` | ~8 L | Bridge for applicant restore state | `_archive/legacy-shims/restoreApplicantIntent.ts` |
| `src/lib/stores/theme.ts` | ~10 L | Bridge for `themeState` | `_archive/legacy-shims/theme.ts` |
| `src/lib/stores/userFormConformation.ts` | ~8 L | Bridge for form confirmation | `_archive/legacy-shims/userFormConformation.ts` |

**Why Archive These**:
- All marked as `@deprecated` in comments
- Svelte 5 runes migration complete — .svelte.ts versions are canonical
- New code imports directly from .svelte.ts, not .ts shims
- Old code still works via .ts bridges
- Eventually removable, but safe to keep for now

**Risk Assessment**: ✅ LOW RISK
- No active code imports from .ts shims (verified by grep)
- Bridges are read-only wrappers
- .svelte.ts versions still work directly
- Removing these files would BREAK old code that still uses .ts imports
- Therefore: Archive, don't delete (backward compat)

**Impact**:
- If we archive: Old imports still work (Git-tracked in archive)
- If we delete: Breaks any remaining old code
- Best approach: Archive + document deprecated status

**Restoration**:
```bash
# If old code needs bridge:
git mv src/lib/stores/_archive/legacy-shims/FILENAME.ts src/lib/stores/FILENAME.ts
```

---

## Phase 3: Other Deprecated Files (Future)

**Not archiving yet** (but flagged for future):

| File | Reason | Effort | Status |
|------|--------|--------|--------|
| `src/lib/ruleEngine/incomeAssessor.ts` | V1 version (V2 in use) | 3.5h migration | Hybrid state — both used |
| `src/lib/stores/_bridge.ts` | Similar to above files | - | Check imports first |
| `src/lib/stores/applicationData.ts` | Legacy store | - | Check imports first |

**Next Session**: Audit imports for incomeAssessor.ts consolidation

---

## Execution Plan: Phase 1 & 2

### Step 1: Create Archive Directory
```bash
mkdir -p src/lib/stores/_archive/legacy-shims
```
✅ Already done

### Step 2: Move Shim Files
For each file in the table above:
```bash
# Example:
mv src/lib/stores/cleanPayloadStore.ts src/lib/stores/_archive/legacy-shims/cleanPayloadStore.ts
```

### Step 3: Add Archival Headers
```typescript
/**
 * ARCHIVED FILE — 2026-02-27
 *
 * This file has been archived because:
 * - Svelte 5 runes migration complete (canonical source: .svelte.ts)
 * - Marked as @deprecated, no longer needed for new code
 * - Kept for backward compatibility with old code
 *
 * For new code: Import directly from .svelte.ts
 * To restore: git mv src/lib/stores/_archive/legacy-shims/FILENAME.ts src/lib/stores/FILENAME.ts
 * To verify no imports: grep -r "from.*stores/FILENAME" src/
 */
```

### Step 4: Commit
```bash
git add -A
git commit -m "chore: archive legacy store shim files (Svelte 5 migration)"
```

**Time**: ~30 minutes (including verification)

---

## Reference: What Gets Archived?

### ✅ Archive (Keep for Reference)

- **Dead/orphaned code**: No references, safe removal
- **Deprecated bridges**: Old API, new API exists, used for backward compat
- **Intentional duplicates**: Area-specific compliance variants (intentional pattern)
- **Old versions**: V1 code when V2 exists AND complete migration possible

### ❌ Don't Archive (Keep in Active)

- **Schema duplication** (config/ + server/formEngine/schemas/): Intentional architecture
- **Five-variant questions**: Intentional domain logic (area-specific compliance)
- **Active dual-use modules**: Both V1 + V2 used together (incomeAssessor.ts)

---

## Verification Checklist

- [ ] testDataStorage.ts archived to `_archive/testDataStorage.ts` ✅
- [ ] Create `_archive/legacy-shims/` directory ✅
- [ ] Move 7 shim files to `_archive/legacy-shims/`
- [ ] Add archival headers to each file
- [ ] Verify no imports from shim files in active code:
  ```bash
  grep -r "from.*stores/cleanPayloadStore\.ts" src/ # Should return 0
  grep -r "from.*stores/dashboard\.ts" src/ # Should return 0
  # ... repeat for all 7
  ```
- [ ] Verify imports from .svelte.ts files still work:
  ```bash
  pnpm run check  # Should pass
  pnpm run test:unit  # Should pass
  ```
- [ ] Git commit with clear message
- [ ] Update SESSION-HANDOFF.md with archival summary

---

## Next Steps

**After Phase 1 & 2 Complete**:

1. **Phase 3 (Short-term)**: Consolidate incomeAssessor.ts V1/V2
2. **Phase 4 (Medium-term)**: Console statement migration (111 occurrences)
3. **Phase 5 (Later)**: Comment code cleanup (4,870 lines)

---

## Summary

| Phase | Task | Files | Time | Status |
|-------|------|-------|------|--------|
| **1** | Archive testDataStorage.ts | 1 | 5 min | ✅ DONE |
| **2** | Archive legacy shim files | 7 | 25 min | 🔄 READY |
| **3** | Consolidate income assessor | 2 | 3.5h | ⏳ Next |
| **4** | Migrate console statements | ~30 | 2.5h | ⏳ Later |
| **5** | Clean comments | ~4.8K L | 3h | ⏳ Post-launch |

**Total for Phase 1 & 2**: ~30 minutes, 8 files archived, 0 deletions, 100% restorable

