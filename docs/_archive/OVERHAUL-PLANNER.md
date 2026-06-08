# Codebase Overhaul — Dynamic Planner

> **Purpose**: Living "state of the world" document to survive context compaction.
> Complements `OVERHAUL-CHANGELOG.md` (which tracks _what changed_) with _where we are and why_.
>
> **Last Updated**: Phase 2 Complete

---

## 1. Objectives & Principles

### Primary Objective
Full codebase overhaul for enterprise-grade nomenclature, logical file placement, consistent conventions, and code quality — eliminating ambiguity and establishing production-ready standards.

### Core Principles
1. **Archive, never delete** — All removed files go to `src/_archived/` preserving original structure
2. **Single source of truth** — Routes centralized in `routes.ts`, schemas in `formEngine/schemas/`
3. **SvelteKit conventions** — kebab-case routes, camelCase config dirs, PascalCase components
4. **Test after every commit** — `pnpm run test:unit` minimum, Playwright for route changes
5. **Do NOT merge with main** — Keep branch separate; only check main for changes, user merges manually after browser testing
6. **Structured logging** — All server-side code uses `$lib/server/logger.ts` (no bare console calls)

### Standing User Instructions
- **Work isolation**: Work ONLY in worktree `F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\.claude\worktrees\recursing-heisenberg`. User works on main branch in VS Code separately.
- **Go slow**: Check, test, rectify, correct, maintain log
- **Test after commits**: Use Playwright separately to test intended changes
- **Check main regularly**: Adopt aligned changes from main branch (but DO NOT merge — user merges after browser testing)
- **Update docs**: Always update DEVELOPMENT-PLAN.md when completing tasks

---

## 2. Phase Status

### Phase 1 (Structural Overhaul) — COMPLETE ✅
- [x] **Phase 0**: Setup tracking infrastructure (changelog + archive dir)
- [x] **Phase 1**: Centralized route constants (`routes.ts` + migrate 40+ files)
- [x] **Phase 2**: Archive dead code + schema consolidation
  - [x] 2.1: Redirect schemaExtractor imports → archive `config/schemas/`
  - [x] 2.2: Archive legacy debug routes (`test/`, `testAPI/`, `testing-relationship/`)
  - [x] 2.3: Archive legacy `applicantForm/` route tree
- [x] **Phase 3**: Config directory naming → camelCase
  - [x] 3.1: `ApplicantOptions/` → `applicantOptions/`
  - [x] 3.2: `wizard-sections/` → `wizardSections/`
- [x] **Phase 4**: Route renaming → kebab-case
  - [x] 4.1–4.5: All loan form routes kebab-cased + old reference sweep
- [x] **Phase 5**: Component naming → PascalCase
  - [x] 5.1: `customIncomeTable.svelte` → `CustomIncomeTable.svelte`
  - [x] 5.2: `onboarding/NewSelect.svelte` → `OnboardingSelect.svelte`
- [x] **Phase 6**: Barrel exports for `applicantOptions/` and `bankSelection/`
- [x] **Phase 7**: Documentation (DEVELOPMENT-PLAN.md, CLAUDE.md, CHANGELOG)

### Phase 2 (Code Quality & Engineering Standards) — COMPLETE ✅
- [x] **Pass 0**: Dead code cleanup (275 lines of `// $:` blocks + archive `isvIsible.ts`)
- [x] **Pass 1**: Logger fix + adoption
  - [x] 1A: Fixed `logger.info()` no-op bug (missing `console.info()` call)
  - [x] 1B: Migrated 144 server files from `console.error/warn/log` to structured logger
- [x] **Pass 2A**: Created `src/lib/server/apiResponse.ts` (standardized response helpers)
- [x] **Pass 3**: Consolidated 3 inline rate limiters to centralized `rateLimiter.ts`
- [x] **Pass 4-6**: Developer onboarding READMEs (config, utils, server, stores)
- [x] **Pass 7**: Final documentation updates (CHANGELOG, PLANNER, CLAUDE.md)

---

## 3. Current State

| Item | Value |
|------|-------|
| **Branch** | `refactor/codebase-overhaul` |
| **Worktree** | `F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\.claude\worktrees\recursing-heisenberg` |
| **Tests** | 52 files, 4,451 tests — ALL PASSING |
| **TypeScript** | 5 pre-existing errors in `dashboard/admin/policies/` (not from overhaul) |
| **Main Last Checked** | `4d381d2a` (adopted all changes incl. 6 quick-win features — do NOT merge) |
| **Phase 1 Commits** | 18 |
| **Phase 2 Commits** | 8 |
| **Phase 3 Commits** | 6 (main syncs + apiResponse adoption + feature adoption) |
| **Total Files Changed** | 250+ |

### Key New Infrastructure (Phase 2)
- `src/lib/server/apiResponse.ts` — Standardized API response helpers
- `src/lib/server/logger.ts` — Fixed + adopted across all server files
- `src/lib/server/rateLimiter.ts` — Now the sole rate limiter (3 duplicates consolidated)
- 4 README files: `config/`, `utils/`, `server/`, `stores/`

---

## 4. Key Decisions & Discussions

### Decision Log
| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| D1 | Archive instead of delete | User wants rollback safety; archived files serve as main branch reference | Session start |
| D2 | Maintain living changelog | Track every change for reference in case of issues | Session start |
| D3 | `src/lib/stores/` is NOT dead code | 165 imports across 94 files — Svelte 4→5 bridge, actively used | Plan phase |
| D4 | `src/lib/form/` is NOT dead code | 5 active importers in production | Plan phase |
| D5 | `test-dashboard/` preserved | Active dev-only testing dashboard, not legacy | Plan phase |
| D6 | No redirects needed for route renames | Authenticated app — forms accessed via in-app navigation only | Plan phase |
| D7 | Windows two-step `git mv` | Case-insensitive FS requires: `git mv A _tmp && git mv _tmp a` | Phase 3 |
| D8 | Create dynamic planner | Survive context compaction, keep objectives alive | Mid-Phase 4 |
| D9 | Do NOT merge with main | User works on main in parallel; branch stays separate until user browser-tests | Phase 2 |
| D10 | Defer component reorganization | Design decisions (Select variants, TextField props) are out of scope for mechanical refactoring | Phase 2 plan |
| D11 | ~~Defer apiResponse.ts adoption~~ **DONE** | Helpers created (Pass 2A), route-by-route adoption completed in Phase 3 — 27 routes, -246 lines | Phase 3 |
| D12 | payloadBuilder section headers already exist | Both payloadBuilder.ts (9 sections) and casePayloadBuilder.ts (18 sections) already well-structured — no work needed | Phase 2 |

### Critical Corrections (from plan exploration)
These findings corrected initial Phase 1 exploration that incorrectly flagged active code as dead:
- `src/lib/stores/` → 165 occurrences across 94 files (active, DO NOT touch)
- `src/lib/form/` → 5 active importers (production code, DO NOT touch)
- `src/lib/config/schemas/` → 1 importer (redirected in Phase 2, then archived)

---

## 5. Commit History

### Phase 3 (apiResponse.ts Adoption + Main Sync)
```
414cda9a feat: adopt 6 quick-win feature batches from main (4d381d2a)              ← Main sync
54118978 docs: update overhaul documentation for Phase 3 (apiResponse adoption)    ← Docs
19678bd9 refactor: adopt apiResponse.ts helpers across 27 non-guarded API routes   ← Pass 2B
3af7e247 fix: adopt main changes — login TS, dead page.ts cleanup, Vercel runtime  ← Main sync
798e0e26 fix: adopt svelte-check warning fixes from main (bb138ee4)                ← Main sync
9da83d9a docs: finalize Phase 2 documentation — changelog, planner, CLAUDE.md      ← Pass 7
```

### Phase 2 (Code Quality & Engineering Standards)
```
e5a310ce docs: add developer onboarding READMEs for config, utils, server, stores  ← Pass 4-6
a7c09d95 refactor: consolidate inline rate limiters to centralized rateLimiter.ts   ← Pass 3
83157c14 feat: create standardized API response helpers (apiResponse.ts)            ← Pass 2A
cb0dc201 refactor: migrate all server console.error/warn/log to structured logger   ← Pass 1B
f1f99632 fix: logger.info() was a no-op — add missing console.info() call          ← Pass 1A
0fd38d4d refactor: archive dead utility isvIsible.ts (zero importers)               ← Pass 0.2
d3e828a0 refactor: remove commented-out Svelte 4 reactive declarations              ← Pass 0.1
```

### Phase 1 (Structural Overhaul)
```
cbf879bd refactor: add barrel exports for applicantOptions and bankSelection  ← Phase 6
c41e17db refactor: rename onboarding NewSelect to OnboardingSelect            ← Phase 5.2
cb12a54d refactor: rename customIncomeTable to CustomIncomeTable (PascalCase) ← Phase 5.1
daf560c8 refactor: sweep remaining old route string references                ← Phase 4.5
941df016 refactor: rename unsecureLoan route tree to unsecure-loan            ← Phase 4.4
273e89ae refactor: rename plot-Loan route to plot-loan (kebab-case)           ← Phase 4.3
b3bfa156 refactor: rename Lap route to lap (kebab-case)                       ← Phase 4.2
4ec0cfca refactor: rename home-Loan route to home-loan (kebab-case)           ← Phase 4.1
ae8486f5 Merge branch 'main' into refactor/codebase-overhaul                 ← Main sync
0eb26dd5 refactor: rename wizard-sections to wizardSections (camelCase)       ← Phase 3.2
ce50d28f refactor: rename ApplicantOptions to applicantOptions (camelCase)    ← Phase 3.1
7d50b8a0 refactor: archive legacy applicantForm route tree                    ← Phase 2.3
e378daad refactor: archive legacy debug routes                                ← Phase 2.2
20da2702 refactor: redirect schema imports and archive config/schemas         ← Phase 2.1
a6804c14 refactor: complete Phase 1 route centralization for remaining files  ← Phase 1 (final)
ab9d30eb fix: MonthYearModal year sync, click/dblclick fix, route central.   ← Phase 1 (bulk)
178f2bcb chore: setup overhaul tracking infrastructure                        ← Phase 0
```

---

## 6. Post-Overhaul Verification Checklist

### Phase 1 (Structure)
- [x] `pnpm run test:unit` — all 4,451 tests pass (verified after every commit)
- [x] Grep: zero hits for old patterns in active code (only `_archived/` has old references)
- [x] All archived files present in `src/_archived/` with original structure
- [x] `OVERHAUL-CHANGELOG.md` has complete record of every change
- [x] `DEVELOPMENT-PLAN.md` updated with overhaul summary

### Phase 2 (Code Quality)
- [x] `pnpm run test:unit` — all 4,451 tests pass (verified after every commit)
- [x] Zero `console.error/warn` in `src/routes/api/` (all migrated to structured logger)
- [x] Zero `// $:` commented-out blocks in active `.svelte` files
- [x] Zero inline rate limiters (all consolidated to `rateLimiter.ts`)
- [x] `apiResponse.ts` helpers created and available for adoption
- [x] README files exist for: `config/`, `utils/`, `server/`, `stores/`
- [x] `OVERHAUL-CHANGELOG.md` updated with Phase 2 entries

### Pending (User Action)
- [ ] `pnpm run check` — TypeScript clean (excluding pre-existing 5 errors)
- [ ] `pnpm run build` — production build succeeds
- [ ] Manual smoke test: all 6 loan form flows (dashboard → how-can-we-help → form)
- [ ] `pnpm run test:e2e` — all E2E specs pass (if Playwright available)
- [ ] User browser testing before merge to main
