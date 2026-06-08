# Archived Code — Form Layer

Dead client-side form helpers preserved in git via the `$lib/form/_archive/`
convention. Nothing in the active codebase imports from this directory —
tsconfig.json excludes `**/_archive/**` from type-checking so stale imports
inside the archived files do not cause compile errors.

## Archival Policy

Mirrors `src/lib/stores/_archive/README.md`:

1. **Archive, don't delete** — code stays in git history with full traceability.
2. **Preserve in `_archive/`** — renamed with the original directory as a
   prefix (e.g. `homeLoan-schema.ts`) so the source-of-origin is visible.
3. **Add archival headers** — every archived file gets a dated comment block
   explaining why it was archived and pointing at the restore SHA.
4. **Do not update imports inside archived files** — they are documentation,
   not code. Leave the stale `$lib/form/homeLoan/...` paths as historical record.
5. **Do not restore without re-justifying** — the reasons for archiving are in
   the header; read those and the referenced RESOLUTION-PLAN entry first.
6. **Prove zero importers with a literal command** — every archival entry must
   include the ripgrep/grep command used to verify no live importers remain
   (e.g. `` rg "from ['\"]\$lib/form/homeLoan/schema['\"]|from ['\"]\./schema['\"]" src/ ``),
   plus its output trimmed to the set of "dead" matches. Prose summaries like
   "only inbound edge was X" have been wrong in practice — S77b-4B missed
   `homeLoan/visibility.ts:35` this way (see 2026-04-21 entry below). A
   copy-pasteable command is re-executable by future sessions and self-auditing,
   and forces the archiver to cover relative-path as well as `$lib/...` imports.

## Archived Files

### 2026-04-21 — S77b-4B (RESOLUTION-PLAN §4B: `resolveBindsTo` consolidation)

**`homeLoan-schema.ts`** (was `src/lib/form/homeLoan/schema.ts`)

- **Reason**: every export had zero live importers *as claimed at S77b-4B audit
  time*. Post-hoc correction below under "S77d correction".
  - `preprocessHomeLoanSchema` — unused (consumers use `preprocessSchema` from
    firstPage directly)
  - `resolveBindsTo` — byte-equivalent to firstPage's; S77b-4B audit claimed
    the only inbound edge was the sibling `homeLoan/validation.ts`
    (itself dead and archived in the same commit). This was wrong — see
    "S77d correction" below.
  - `buildCombinedAnswers` — unused; all 6 form pages route through
    `$lib/utils/combinedAnswersMemo.ts`
  - `getLastThreeFinancialYears` / `applyFinancialYearPlaceholders` — unused;
    server-side port lives at `$lib/server/formEngine/textResolver.ts`
  - `resolveDynamicText` — redundant re-export
- **S77d correction (2026-04-21)**: `src/lib/form/homeLoan/visibility.ts:35`
  also imported `resolveBindsTo` from this file via the relative path
  `./schema`. The S77b-4B audit grep did not cover the relative form and
  missed the edge. `homeLoan/visibility.ts` is very much alive — its 29-line
  architectural header justifies the client fail-OPEN vs server fail-HIDE
  singleton-boundary split (`jsonLogic.add_operation`; CLAUDE.md Pitfall #1),
  and it has three live consumers: `src/lib/utils/payloadGrouping.ts:17`
  (the canonical `buildCleanAnswers` / `groupAnswersBySchema` path),
  `src/lib/testing/__tests__/formEngineSafety.test.ts:24`, and its own
  re-exports. Resolution: rewired `visibility.ts:35` to import from
  `$lib/form/firstPage/schema.ts` — the canonical byte-equivalent copy —
  rather than restoring this archive. The dedup rationale still holds; only
  the audit bookkeeping was wrong. See the S77d commit:
  `fix(S77d): rewire homeLoan/visibility.ts to canonical resolveBindsTo (S77b-4B audit miss)`.
- **History**: introduced in `895470dd` as the first of an intended 6-per-loan-type
  client namespace structure; superseded by server-driven evaluation
  (`e0534f0e` + `3104d918`) before the other 5 namespaces were built. The
  `// ✅ Home-loan-specific resolver` comment was aspirational — the body
  was always a byte-equivalent copy of firstPage's resolver.
- **Restore path**: `git show 895470dd:src/lib/form/homeLoan/schema.ts` or
  `git show cfd9eb61:src/lib/form/homeLoan/schema.ts` (pre-archive).
- **Impact of archival (corrected)**: zero runtime change in practice (no code
  path actually executed the broken import between S77b-4B landing and the
  S77d repair). **Type-check did break** the moment `00a3ca7d` landed —
  `svelte-check` reports "Cannot find module './schema'" at
  `homeLoan/visibility.ts:35`. S77b-4B/C skipped host `pnpm check`
  re-verification, so the break went unnoticed until S77d Step 1. Repaired
  in the S77d commit cited above.

### 2026-06-02 — S213 (TECH-DEBT-CLEANUP-2026-05-31 D8/D9 — ADR-0024)

**`firstPage-rules-S213.ts`** (was `src/lib/form/firstPage/rules.ts`)

- **Reason**: function `applyAutoLoanRules` was already a no-op (the two
  pre-rename auto-rewrite rules — both setting legacy `'Start Fresh with New
  Loan'` — were obsoleted earlier when explicit q4_loanType selection landed
  and the obligations question's showWhen tightened). In S213 the lone caller
  in `src/routes/(app)/form/how-can-we-help/+page.svelte:245` was removed
  alongside the D8 Start Fresh sunset (formSchema.json q4_loanType value
  rename `'Start Fresh with New Loan'` → canonical `'New Loan'`, MongoDB count
  verified zero stored cases used the legacy value).
- **Zero-importer proof**:
  ```powershell
  Grep "applyAutoLoanRules" src/
  # → only src/lib/form/firstPage/rules.ts itself (now this archived file)
  ```
- **Restore path**: `git show <pre-S213-sha>:src/lib/form/firstPage/rules.ts`
  (look for the S213 commit `chore(cleanup): S213 Path B — D5/D8/D9` for the SHA).
- **Impact of archival**: zero runtime change (function body was `// No-op`).
  Zero type-check change (caller removed in same commit). Zero test change
  (no test referenced the function).

---

**`homeLoan-validation.ts`** (was `src/lib/form/homeLoan/validation.ts`)

- **Reason**: zero live importers. Only inbound edge was the sibling
  `homeLoan/schema.ts` (itself dead and archived in the same commit).
- **Exports (all unused)**: `resolveDynamicError`, `getValidationErrorMessage`,
  `resolveDynamicWarning`, `getWarningErrorMessage`. The server's
  `$lib/server/formEngine/textResolver.ts` is the canonical implementation —
  `textResolver.ts` header historically carried a "Ported from" comment
  pointing at this file, updated to point at this archive path.
- **Restore path**: `git show 895470dd:src/lib/form/homeLoan/validation.ts`.
- **Impact of archival**: zero runtime change. Zero type-check change.

## Related

- Active canonical client resolver: `src/lib/form/firstPage/schema.ts`
- Active server copy (with `locationConfig` pre-flatten branch):
  `src/lib/server/formEngine/engine.ts` around line 150
- Active scoped inline copy: `src/lib/components/ExistingLoanDetails.svelte`
- Closure document: `docs/RESOLUTION-PLAN.md` §4B
- Sibling-layer archive policy: `src/lib/stores/_archive/README.md`
