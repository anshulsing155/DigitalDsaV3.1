# Audit Cleanup — Phased Plan

**Created:** 2026-04-28
**Status:** Active — Phase 1 in progress
**Source:** Reduction-engine audit 2026-04-28 (24 deduplicated findings)

---

## Context

The reduction-engine audit on 2026-04-28 surfaced 24 deduplicated findings across security, performance, code quality, accessibility, and SEO categories. Batches A and B closed 12 mechanical/medium findings inline on `main`:

| Commit | Scope |
|--------|-------|
| `d2e0ac2e` | Batch A — 7 zero-risk fixes (password redaction, PII masking, robots.txt, etc.) |
| `b5f3343a` | Batch B — 5 medium fixes (SSR guard, ErrorBoundary, NotificationBell, CRM cap) |
| `8260341b` | Adjustments — TextField revert, ErrorBoundary dev-mode skip, CRM archive comment |

The remaining work is split into 6 phases on dedicated branches per user decision (one-time exception to standing "main only" rule, see CLAUDE.md Development Rule #8).

---

## Branching model

Per-phase feature branch:

```
main
├── phase/validation-audit        ← Phase 1
├── phase/case-archive            ← Phase 2
├── phase/critical-tests          ← Phase 3 (sub-phases 3a/3b/3c)
├── phase/logic-dedup             ← Phase 4
├── phase/console-sweep           ← Phase 5
└── phase/type-safety/<file>      ← Phase 6 (per-file, ad-hoc)
```

**Lifecycle per branch:**
1. Branch off latest `main`.
2. Develop and test on branch.
3. `pnpm check` 0 errors + tests pass + acceptance criteria met.
4. `gh pr create` with diff for review.
5. After review, `--ff` merge into `main` (preserves linear history per husky pre-push).
6. Delete branch.

**Merge mechanic:** PR-based (not direct ff-merge) for visibility, review trail, and consistency across phases.

---

## Phase 1 — Validation Rules Audit

**Branch:** `phase/validation-audit`
**Goal:** Allow legitimate Indian person names and company names through form validation; re-enable the `inputErrorsState` error display in TextField.

### Current behaviour (broken)

`src/lib/utils/checkGibberish.ts` rejects:
- Words with non-letter chars: blocks `K.K. Sharma`, `5G Networks`, `M&A`, `O'Brien`, `Mary-Anne`.
- Words shorter than 3 chars: blocks `K.` in `K. Sharma`, `M&` in `M&S`.
- First 3 chars identical: blocks `AAA Industries`, `BBB Builders`.
- `(.)\1{2,}` repeated chars: blocks `AAA` again (double-counted).
- Vowel ratio outside 0.2–0.8 on 7+ char words: heuristic rejection of legitimate names.

`TextField.svelte handleInput()` adds:
- `[^A-Za-z\s]` filter: strips dashes, numbers, dots, ampersands and shows "Only letters and spaces are allowed".
- Exemptions: `q4_GSTNumber`, `address`, `entityName`, `q_creditScore`.

### Target behaviour

Two field categories with different rules:

**Person name fields (`firstName`, `lastName`, `fullName`, etc.):**
- **Allow:** letters, spaces, dots (`K.K. Sharma`), apostrophes (`O'Brien`), hyphens (`Mary-Anne`).
- **Block:** all-numeric input, single-character spam (`a`, `xx`), > 50 chars total.
- **Soft-flag (non-blocking):** repeated-name patterns (`Rao Rao`, `Kumar Kumar`) — these are valid Indian names but warrant a "confirm correct" prompt.

**Entity/company name fields (`entityName`, `companyName`, `businessName`, `firmName`, etc.):**
- **Allow:** letters, numbers, spaces, dots, apostrophes, hyphens, ampersands, `&`, `/`.
  - `5G Networks Pvt Ltd` ✅
  - `M&A Partners` ✅
  - `7-Eleven India` ✅
  - `K.K. Industries` ✅
  - `AAA Industries` ✅
  - `AAR EES Properties` ✅
  - `Tata Consultancy Services` ✅
- **Block:** empty, > 100 chars, all-numeric, control characters.
- **Soft-flag (non-blocking):** `AAAA` (4+ consecutive identical) — flag for confirmation, do not block.

### Acceptance criteria

| Input | Field | Expected |
|-------|-------|----------|
| `Mary-Anne` | name | ✅ accept |
| `K.K. Sharma` | name | ✅ accept |
| `O'Brien` | name | ✅ accept |
| `Mohammed bin Salman` | name | ✅ accept |
| `Rao Rao` | name | ⚠ soft-flag (allow with confirm hint) |
| `aaaa` | name | ❌ block |
| `xxxxxxxx` | name | ❌ block |
| `123456` | name | ❌ block |
| `5G Networks Pvt Ltd` | entity | ✅ accept |
| `M&A Partners` | entity | ✅ accept |
| `AAA Industries` | entity | ✅ accept |
| `AAR EES Properties` | entity | ✅ accept |
| `7-Eleven India` | entity | ✅ accept |
| `Tata Consultancy Services Ltd.` | entity | ✅ accept |
| `aaaaa` (lone all-A) | entity | ⚠ soft-flag (allow with confirm hint) |
| `` (empty) | entity | ❌ block |
| `<script>alert(1)</script>` | entity | ❌ block (sanitization, not validation) |

### In scope

- Rewrite `checkGibberish.ts` with field-type parameter (`'person' | 'entity'`).
- Update `TextField.svelte handleInput()` to derive field type from `id`/`fieldType` prop.
- Add field-type prop to TextField if not derivable from existing props.
- Re-enable the `inputErrorsState` error display (commented out in commit `8260341b`).
- Surface soft-flag as a yellow warning, not a red error; non-blocking.
- New unit tests for `checkGibberish` covering all rows in the table above.

### Out of scope

- Other form components (radio, select, checkbox).
- Schema-level (Zod) validation.
- Address, GST, PAN, Aadhaar (separate format checks).

### Risk

Low — localized to two files, fully test-covered.

### Sessions

1.

### Merge gate

- Type-check 0 errors.
- New unit tests pass.
- Manual smoke test on at least one form page: enter each acceptance row, confirm expected outcome.

---

## Phase 2 — Case Archive Feature

**Branch:** `phase/case-archive`
**Goal:** Replace the 5,000-case interim cap (CRM page) with a real archive system.

### Confirmed numbers

- **Default auto-archive threshold:** 6 months.
- **User-configurable range:** 2–12 months.
- **Hard ceiling:** 12 months — anything older auto-archives regardless of user setting.

### In scope

**Schema changes:**

`Cases` collection:
```
is_archived:    boolean (default false)
archived_at:    Date | null
archive_reason: 'auto' | 'manual' | null
```

`DsaApplications` collection:
```
settings.archive_threshold_months: number (default 6, range 2-12)
```

**API endpoints:**
- `POST /api/cases/[id]/archive` — manual archive
- `POST /api/cases/[id]/unarchive` — restore
- `GET /api/cases/archived?...` — list archived (paginated)
- `PATCH /api/user/settings/archive-threshold` — update DSA threshold

**UI:**
- "Archived Cases" tab/view in dashboard CRM page with restore button per case.
- Threshold setting in DSA profile/settings.
- Confirmation modal on manual archive.

**Cron:**
- Daily 02:00 IST: scan all DSAs, archive cases past threshold; hard-archive anything past 12 months.
- Audit log entry per archive event.

**Migrations:**
- Backfill `is_archived: false` on all existing Cases.
- Default `archive_threshold_months: 6` on all DsaApplications without it.

**Cleanup:**
- Filter `is_archived: false` on all CRM/Cases queries by default.
- Remove the 5,000-case `.limit()` from `dashboard/dsa/crm/+page.server.ts`.
- Update related dashboards (case count, metrics, billing-by-case) to exclude archived by default.

### Out of scope (defer to v2)

- Bulk archive UX (multi-select).
- Archive analytics / reporting.
- Auto-restore on case re-activity.
- Bulk export of archived cases.

### Risk

Medium-High — touches DB schema, daily cron, multiple API + UI surfaces, all CRM queries.

### Sessions

2–3.

### Merge gate

- All existing tests pass.
- New tests: cron auto-archive logic, threshold edge cases (2-month exact, 12-month exact), restore flow, hard-ceiling forced archive.
- Manual smoke test: create case, force archive, confirm hidden from default CRM, restore, confirm reappears.
- Cron tested in dev with mocked clock.

---

## Phase 3 — Critical Path Tests

**Branch:** `phase/critical-tests` (single branch, three sub-phases)

| Sub-phase | File | Coverage target |
|-----------|------|-----------------|
| 3a | `src/lib/server/pdfGenerator.ts` (2,000 LOC) | 70%+ statement, 6 loan types |
| 3b | `src/lib/components/relationship-capture/relationshipValidator.ts` (1,563 LOC) | 80%+, 3+ applicant cases |
| 3c | `src/lib/server/formEngine/visibility.ts` | CLAUDE.md pitfall #1 verification |

### Risk

Low — adding tests doesn't change runtime.

### Sessions

1 per sub-phase (3 total).

### Merge gate per sub-phase

- New tests pass.
- No existing test regression.
- Coverage report shows target met.

---

## Phase 4 — Logic Deduplication

**Branch:** `phase/logic-dedup`
**Goal:** Eliminate three documented duplicates with side-by-side diff per loan type.

### 4a — `formatNumber` consolidation

- Keep i18n version (handles ₹/Cr/L formatting).
- Migrate consumers of utility version.
- Delete utility version.

### 4b — Property location questions

- 3 near-clones: `homeLoan/questionBank/propertyLocation.ts`, `lapLoan/questionBank/propertyLocation.ts`, `plotLoan/questionBank/propertyLocation_Plot.ts`.
- Produce side-by-side diff doc first showing exactly what differs.
- Extract to `src/lib/config/shared/propertyLocation.ts` with parametric factory.
- Replace in all 3 loan types.

### 4c — Applicant type fragmentation

- 4 files have overlapping definitions: `applicantData.ts`, `applicantSchema.ts`, `types/form.ts`, `types/casePayload.ts`.
- Audit each → designate one canonical → re-export others as aliases or delete.

### Risk

Medium — touches schema across loan types; consumers must keep working.

### Sessions

1–2.

### Merge gate

- All 6 loan types' form pages render identical questions.
- PDF generator produces identical output for known-input case.
- Type-check + tests clean.

---

## Phase 5 — Console-to-Logger Sweep

**Branch:** `phase/console-sweep`
**Goal:** Eliminate the 201 bare `console.*` calls across 73 files where they shouldn't be.

### Bucket plan (review with user before changes)

| Bucket | Action |
|--------|--------|
| A — Server-side (`/api/`, `$lib/server/`) | Replace with `logger.error/info/warn`. |
| B — Client error reporting (ErrorBoundary, hooks.client.ts) | Keep `console.error` — framework hooks. |
| C — Dev-only diagnostics | Wrap in `if (dev) console.log(...)`. |
| D — Seed scripts, build scripts | Keep — Node CLI output. |
| E — Genuine forgotten debug | Delete. |

After sweep: promote ESLint `no-console` to `error` level for `src/` (allow `dev/scripts/`).

### Risk

Low-Medium — mechanical once buckets agreed.

### Sessions

1–2.

### Merge gate

- ESLint passes.
- No behavioural regression.
- User signs off on bucket assignments.

---

## Phase 6 — Type Safety Refactor

**Branch:** `phase/type-safety/<filename>` (per-file, ad-hoc)
**Goal:** Replace `as any` / `as unknown as X` with proper interfaces — only with explicit per-file green-light.

### Priority order

1. `applicantFormManager.svelte.ts` (3,115 LOC, ~30 `any` casts) — highest value, highest risk.
2. `auth/signup/+server.ts` — auth-critical, smallest scope.
3. `evaluationEngine.ts` — multi-stage pipeline, intermediate type aliases.

### Risk

High per file (change-heavy code).

### Sessions

1 per file, sporadic.

### Merge gate per file

- All tests pass.
- Type errors actually caught (not silenced with new `as`).
- User signs off after diff review.

---

## Suggested execution order

1. **Phase 1** (validation audit) — small, user-visible, unblocks form UX win.
2. **Phase 3a** (PDF tests) — independent safety net before refactor work.
3. **Phase 2** (case archive) — biggest user impact, big change.
4. **Phase 3b/3c** (remaining tests) — independent, can interleave.
5. **Phase 4** (dedup) — needs Phase 3 as safety net.
6. **Phase 5** (console sweep) — independent, mechanical.
7. **Phase 6** (type safety) — last, only on green-light.

Phases 1, 3, 5 can run in parallel branches if context-switching is acceptable.

---

## Status tracker

| Phase | Branch | Status | PR | Merged |
|-------|--------|--------|-----|--------|
| 1 — Validation audit | `phase/validation-audit` | In progress | — | — |
| 2 — Case archive | `phase/case-archive` | Queued | — | — |
| 3a — PDF tests | `phase/critical-tests` | Queued | — | — |
| 3b — Relationship tests | `phase/critical-tests` | Queued | — | — |
| 3c — Visibility tests | `phase/critical-tests` | Queued | — | — |
| 4 — Logic dedup | `phase/logic-dedup` | Queued | — | — |
| 5 — Console sweep | `phase/console-sweep` | Queued | — | — |
| 6 — Type safety | `phase/type-safety/*` | Ad-hoc | — | — |

---

## Persistent decisions

- **`_archive/` folders:** intentional retention per project rule. Future audits will be told to ignore.
- **Pre-existing test failure** in `stakeholderManagement.test.ts:107` (teammate commit `82e60819`): out of scope for this plan; teammate to fix.
- **Branch policy:** "main only" remains the standing rule outside this audit-cleanup work. New non-cleanup features still go on `main` direct.
