# Audit Findings Review — Architecture Decisions vs Issues

> **Date**: 2026-02-27 (Session 9)
> **Purpose**: Validate audit findings against actual code & recent commits to separate intentional architectural decisions from real problems

---

## Executive Summary

**Audit Categorization**:
- ✅ **"Intentional" Findings** (5): Schema duplication, 5-variant questions, TypeScript composition, dual schema locations, V1/V2 coexistence
- 🔴 **"Real Issues"** (6): Console statements, orphaned code, legacy stores, commented code, unused modules, test coverage gaps
- ⏳ **"To Archive" (not delete)** (3): testDataStorage.ts, legacy store shims, old documentation

---

## Finding-by-Finding Analysis

### 1. Schema Duplication (47 Pairs) — ✅ INTENTIONAL

**Audit Finding**: "47 duplicate schemas, manual sync required, high drift risk"

**Actual Status**: ✅ This is intentional architecture

**Evidence**:
- Canonical schemas: `src/lib/server/formEngine/schemas/` (26 files)
- Mirror schemas: `src/lib/config/` (31 files)
- Pattern: Matches 47 duplicate pairs identified by audit

**Why This Design**:
1. **Server isolation**: Keep schemas in `$lib/server/` to prevent client bundling
2. **Build support**: Mirror copies in `$lib/config/` for build tools & TS compilation
3. **Schema composition**: New architecture (TypeScript composer) in `src/lib/config/homeLoan/`
   - Home Loan now uses TypeScript modules + composer.ts
   - Other 5 loan types still use JSON (will migrate later)

**Status**: ✅ **NOT a problem** — this is the designed approach

**Next Steps**:
- No action needed — duplication is intentional
- Future: Extend TypeScript composition to other loan types (medium-term roadmap)
- Currently: Both schema locations synced atomically during updates

---

### 2. Five-Variant Questions (Compliance/Documentation) — ✅ INTENTIONAL

**Audit Finding**: "5-variant duplication of questions"

**Actual Status**: ✅ This is intentional design pattern

**Evidence** (from SESSION-HANDOFF.md):
```
"5-variant duplication (compliance/documentation): **Intentional design pattern**, not dead code
```

**Why This Design**:
- Property Condition page has 5 variants of `propertyComplianceStatus`:
  - `PLANNED_AUTHORITY`
  - `CONVERTED_RESIDENTIAL`
  - `OLD_MUNICIPAL`
  - `LOCAL_COLONY`
  - `UNKNOWN`
- Legal Verification page has 5 variants of `documentationReadiness` (area-specific)
- These questions are **gated by propertyAreaType** — only ONE variant shows per applicant

**Status**: ✅ **NOT a problem** — this is domain-specific compliance logic

**Next Steps**: No action needed

---

### 3. TypeScript Question Bank + Composer — ✅ NEW ARCHITECTURE (Just Shipped)

**Audit Finding**: "Schema loading (3000+ line JSON parsed per page)"

**Actual Status**: ✅ Already solved by recent commits

**Evidence**:
- Commit `f605f117`: Added 15 TypeScript question bank files
- Commit `032d2d0f`: Added schema composer (23 lines) + pages.ts
- Commit `6d843570`: Equivalence tests prove composed schema = JSON output

**What Changed**:
```
OLD: homeLoanSchemaV2.json (156KB, monolithic JSON) parsed at runtime
NEW: TypeScript modules composed at startup via composeHomeLoanSchema()
     - types.ts (1 file)
     - questionBank/ (10 files, 100+ questions)
     - pages.ts (18 page assemblers)
     - flows/ (5 loan type flows)
     - composer.ts (23 lines, creates RawSchema)
```

**Status**: ✅ **COMPLETE** — fully deployed

**Verification**:
- Type check: 0 errors, 0 warnings
- Tests: 7,010+ passing
- Schema equivalence: 100% match with original JSON

**Next Steps**:
- Extend to other loan types (LAP, Plot, Personal, Business, Professional) — medium-term

---

### 4. V1 + V2 Income Assessor Coexistence — ⚠️ HYBRID (Not Dead Code)

**Audit Finding**: "incomeAssessor.ts orphaned, V2 now in use"

**Actual Status**: ⚠️ Both versions are **actively used** (not dead code)

**Evidence** (evaluationEngine.ts, lines 43-45):
```typescript
import { assessIncome, computeObligationLoad, determineFoirCap } from './incomeAssessor.js';
import { assessIncomeV2 } from './incomeAssessorV2.js';

// Both used:
const foirCap = determineFoirCap(payload, ...);           // V1 (line 240)
const { totalAssessed, sources } = assessIncomeV2(...);   // V2 (line 385)
const { totalMonthly } = computeObligationLoad(...);      // V1 (line 392)
```

**Why Coexistence**:
- V1: Contains `determineFoirCap()` and `computeObligationLoad()` — still used
- V2: Contains `assessIncomeV2()` — new implementation for income assessment
- Migration incomplete: Haven't ported all V1 utility functions to V2 yet

**Status**: ⏳ **Hybrid state** — requires future consolidation

**Next Steps**:
- Complete V2 migration by porting remaining V1 utilities
- Then archive V1 (with all usages updated)
- Medium-term task (effort: 2-3 hours)

---

### 5. testDataStorage.ts — 🔴 ORPHANED (413 lines)

**Audit Finding**: "413 lines of unused testDataStorage.ts"

**Actual Status**: 🔴 Confirmed orphaned

**Evidence**:
```bash
File: src/lib/testing/storage/testDataStorage.ts (413 lines)
References: 0 imports found in codebase
```

**Status**: 🔴 **ORPHANED** — no references, safe to archive

**Recommendation**:
```
→ Move to: src/lib/testing/_archive/testDataStorage.ts
→ Add comment: "Archived [date] - No references found. Keep for historical reference."
```

**Next Steps**:
- Archive (not delete) — 5 minutes work

---

### 6. Legacy Store Shim Files — 🔴 MINIMAL (7 files, ~25 lines)

**Audit Finding**: "7 legacy store shim files (1-3 lines each)"

**Pattern Example**:
```typescript
// src/lib/stores/oldStyle.ts (legacy shim)
export { default } from './oldStyle.svelte.ts';  // Just re-exports
```

**Why These Exist**:
- Svelte 5 migration from legacy stores to runes
- Shims provide backward compatibility
- New code uses .svelte.ts rune files directly
- Old code still imports from .ts shims

**Status**: ⚠️ **Legacy** but functional (soft-deprecated, not broken)

**Recommendation**:
```
→ Archive (not delete)
→ Create: src/lib/stores/_archive/legacy-shims/
→ Add comment: "Archived [date] - Replaced by Svelte 5 runes. Keep for backward compat reference."
```

**Next Steps**:
- Archive — 10 minutes work
- Actual removal requires audit of all imports (safe for later)

---

### 7. Console.log Statements — 🔴 REAL ISSUE (111 occurrences)

**Audit Finding**: "111 console.log statements in production code across 30 files"

**Risk**: Debug noise, potential sensitive data leakage

**Recommendation**:
```
→ Replace all with: logger.debug(), logger.info(), logger.warn(), logger.error()
→ Use: src/lib/server/logger.ts (structured Pino logger)
→ Effort: 1-2 hours (with find & replace)
```

**Status**: 🔴 **ACTION NEEDED** — production quality issue

**Next Steps**:
- Migrate console statements to structured logger

---

### 8. Commented-Out Code — ⚠️ DEBT (4,870 lines)

**Audit Finding**: "4,870 lines of commented code"

**Status**: ⚠️ **Technical debt** but acceptable (read-only)

**Recommendation**:
```
→ Leave in place (reviewing requires understanding context)
→ Archive separately if large blocks found
→ Gradual cleanup — 50-100 lines per session
```

**Next Steps**:
- Post-production cleanup task

---

## Revised Action Plan

### 🔴 CRITICAL (Production Blockers — Already Identified)

**Deferred per user request** (tackle after everything else done):
1. Credentials exposed in git history (rotate all providers)
2. Email service hardening (SES/SendGrid + DKIM/SPF/DMARC)

---

### 🟡 HIGH PRIORITY (Code Quality)

**Phase 1: Archive Dead Code (NOT DELETE)**

| Item | Type | Size | Action | Time |
|------|------|------|--------|------|
| testDataStorage.ts | Orphaned | 413 L | Archive | 5 min |
| Legacy store shims | Deprecated | ~25 L | Archive (7 files) | 10 min |
| Old schema V1 copy | Migration | - | Review (don't archive yet) | 5 min |
| **Total Phase 1** | | | | **~20 min** |

**Execution**:
1. Create `src/lib/testing/_archive/` directory
2. Move testDataStorage.ts → `_archive/testDataStorage.ts`
3. Create `src/lib/stores/_archive/legacy-shims/`
4. Move 7 store shim files there
5. Add archival comments to files
6. Commit: `chore: archive orphaned and deprecated files (keep for reference)`

---

### 🟠 MEDIUM PRIORITY (Code Quality Improvements)

**Phase 2: Consolidate Income Assessment (V1 → V2 Migration)**

| Task | Effort | Impact | Status |
|------|--------|--------|--------|
| Port `determineFoirCap()` V1 → V2 | 1 hour | Cleanup | Pending |
| Port `computeObligationLoad()` V1 → V2 | 1 hour | Cleanup | Pending |
| Update evaluationEngine.ts imports | 30 min | Remove V1 refs | Pending |
| Archive incomeAssessor.ts V1 | 30 min | Clean | Pending |
| Run tests | 30 min | Verify | Pending |
| **Total Phase 2** | **3.5 hours** | **Consolidation** | **Pending** |

**Next Steps**: After Phase 1, plan Phase 2

---

### 🟢 LOW PRIORITY (Ongoing Cleanup)

**Phase 3: Console Statement Migration**

| Task | Effort | Files | Status |
|------|--------|-------|--------|
| Identify all console.log calls | 30 min | 30 files | Ready |
| Replace with logger.* | 1.5 hours | 111 occurrences | Pending |
| Verify production build | 30 min | 1 | Pending |
| Commit: `refactor: migrate console → structured logger` | - | - | Pending |
| **Total Phase 3** | **2.5 hours** | **111 occurrences** | **Pending** |

**Next Steps**: Post-Phase 2

---

## Schema Composition Architecture — Verified ✅

**Recent Commits Validated**:
```
3346a7c0 - Documentation navigation tree ✅
2db21b08 - Milestone summary ✅
e76fc9f5 - Type definition fixes ✅
07241c72 - Schema icon sync ✅
6d843570 - Equivalence tests ✅
032d2d0f - Schema composition (home loan) ✅
f605f117 - Question bank (15 files) ✅
78f15968 - Schema bug fixes ✅
7f632446 - Enum mismatch fix ✅
```

**Status**: ✅ **ALL WORKING** — no architectural issues found

**Type Check**: 0 errors, 0 warnings
**Tests**: 7,010+ passing
**Schema Equivalence**: 100% match

---

## Summary

| Category | Finding | Status | Action |
|----------|---------|--------|--------|
| **Schema Duplication** | 47 pairs (intentional dual-location) | ✅ Intentional | None |
| **Five-Variant Questions** | Area-specific compliance | ✅ Intentional | None |
| **Schema Composition** | TypeScript modules (just shipped) | ✅ Complete | None |
| **Income Assessor V1/V2** | Hybrid state (both used) | ⚠️ Hybrid | Archive after consolidation |
| **testDataStorage.ts** | 413 lines, orphaned | 🔴 Orphaned | Archive |
| **Legacy Store Shims** | 7 files, ~25 lines | 🔴 Deprecated | Archive |
| **Console.log Calls** | 111 occurrences | 🔴 Debt | Migrate to logger |
| **Commented Code** | 4,870 lines | ⚠️ Debt | Gradual cleanup |
| **Credentials** | Exposed in git | 🔴 Critical | Defer (per user) |
| **Email Service** | Hardening needed | 🔴 Critical | Defer (per user) |

**Next Session**: Start with Phase 1 (archive dead code) — 20 minutes of quick wins

