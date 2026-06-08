# Enterprise Code Review — 2026-05-25 (Delta Sweep)

**Profile:** Standard (T1–T6 + T9). 5 commits in scope; P16 director-stake alignment + STAKE constant split + Pitfall #48 doc promotion + late-landing of 3 prior-session artifacts. No auth/payment changes triggering Full.
**Reviewed against:** committed `main` @ **`994f33e0`** ("docs: land 3 untracked artifacts from prior sessions"), working tree clean.
**Prior review:** [`CODE-REVIEW-2026-05-24.md`](CODE-REVIEW-2026-05-24.md) (baseline @ `77341be2`).
**Delta range:** `77341be2..994f33e0` — 5 commits across the 2026-05-25 session (P16 alignment + STAKE split + Pitfall #48 + /end close + untracked-artifact landing).

> **Note on HEAD scope.** The triggering prompt listed `55f1b97a` as HEAD; one additional commit (`994f33e0`) landed at 12:37 IST staging three docs files that had been written across prior sessions but never committed. It's pure docs (GTM brief, prior review report, prior contrast report) — no source. Treated as part of the 5-commit delta. The 4 commits in the prompt are all reviewed individually below.

---

## Header — Commands Executed

| Command | Status | Result | Delta vs `2026-05-24` |
|---------|--------|--------|------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 201 files, **11,660 tests** | +2 tests (P16 stake-boundary lock-in) |
| `pnpm test:contrast` | PASS | **456/456 pairs** (report written to [`CONTRAST-AUDIT-2026-05-25.md`](CONTRAST-AUDIT-2026-05-25.md)) | unchanged |
| `git log … co-authored-by` | PASS | 0 matches (last week) | unchanged |

---

## Commits Reviewed (5, oldest first)

| SHA | Subject | Surface |
|-----|---------|---------|
| `c5c2234e` | docs: Pitfall #48 (worktree mongodb-client-encryption) + refresh stale plan banner | docs (CLAUDE.md +6, PITFALLS.md +42, DEVELOPMENT-PLAN.md ±2) |
| `a0f07423` | fix(P16): align director stake threshold to backend's 20% across UI + validators | **source** — 3 production files + 1 test file (4 files, 66 ins / 22 del) |
| `091c77ce` | refactor(applicantRoleUtils): split STAKE constant by operator semantics | **source** — 1 file (`applicantRoleUtils.ts`, 42 ins / 5 del) |
| `55f1b97a` | docs: /end close for 2026-05-25 — loose-end sweep + P16 alignment + STAKE split | docs only (CHANGELOG, DEVELOPMENT-PLAN, SESSION-HANDOFF) |
| `994f33e0` | docs: land 3 untracked artifacts from prior sessions (GTM brief + 5-24 review + 5-23 contrast) | docs only (3 new files, 499 ins) |

---

## Standing Grep Rules — T1–T6 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch outside `secureFetch` | T1 | 0 in `src/lib` + `src/routes` | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | only documented exceptions (Toast, JsonLd, `_archive`, `pageDescription`, NoteWorthyMessage, admin policies, F2-commented IncomeSourceForm) | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 5 hits all legitimate: `logger.ts` (2), `telemetry.ts` (3) | unchanged |
| **F (API routes)** — bare `console.*` in `routes/api` | T1 | 2 hits: both `// //console.log` commented-out diagnostics in `init-widget`/`resend-otp` | unchanged |
| **G (Co-Authored-By)** | T1 | 0 in last week | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | all matches are test files | unchanged |
| **SEC-3 (cookie security)** | T1 | unchanged — no new `cookies.set` calls in delta | unchanged |
| **SEC-4 (eval/exec)** | T1 | unchanged — no exec/eval changes in delta | unchanged |
| **SEC-5 (env public exposure)** | T1 | unchanged — `VITE_VAPID_PUBLIC_KEY` only | unchanged |
| **SEC-7 (client storage PII)** | T1 | unchanged — no `localStorage`/`sessionStorage` writes in delta | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (window.location.reload)** | T2 | 13 instances in approved locations (hooks.client, +error.svelte ×3, LanguageSelector, ResetDataButton, ErrorBoundary, admin testing, admin policies) | unchanged |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 0 | unchanged |
| **H1 (`state_referenced_locally`)** — Pitfall #10 | T3 | 0 (`pnpm check` clean) | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | 43 config files — all are value comparisons, not null checks (smell-grep) | unchanged |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 0 non-whitelisted uses in components | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 empty catch blocks | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 3 matches, all in test files (exempt) | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 4 error boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | 41 across 17 files | (–24 vs prior 35 / +6 occurrences and +4 files — see note below) |
| **S (contrast audit)** | T3 | 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | all 6 headers present in `hooks.server.ts` | unchanged |
| **PH-5 ($where/$function)** | T5 | 0 | unchanged |
| **PERF-1 (import *)** | T6 | 3 (iconRegistry, deriveFlagKeys, camera) — all acceptable | unchanged |
| **PERF-3 (invalidateAll)** | T6 | unchanged — no `+page.server.ts` mutations in delta | unchanged |
| **BUILD-3 (typecheck)** | T3 | 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 11,660/11,660 | +2 |

> **CQ-5 note:** The +6 raw count and +4 file count vs prior is a methodology shift, not a real delta. The 2026-05-24 review reported `35 across 13 files`; today's broader `TODO|FIXME|HACK|XXX` scan over `src/` returns 41 across 17 files. Neither this delta's 5 commits nor any source file modified in the last week introduced new TODO/FIXME/HACK markers (the 4 changed source files — `applicantRoleUtils.ts`, `directorFormUtils.ts`, `DirectorFormModal.svelte`, `stakeholderManagement.test.ts` — contain none). No action.

### T4 — Conditional Rules

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | not triggered (no `package.json` touched) | n/a |
| **P28 (TanStack `$Query.` prefix)** | check ran | 1 match in `queryClient.ts:26` — inside a JSDoc comment showing the **wrong** legacy pattern as a teaching example. Allow-list. |
| **P30 (component-local `restoreAskedForKey` `$state`)** | check ran | `BasicInfoFields.svelte:74` declares `let restoreAskedForKey: string | null = null` (plain TypeScript, not `$state`); grep recipe whitelists this — Pitfall #30 specifically targets `$state` declarations |
| **P38 (loan-switch chokepoint)** | check ran | `migrateApplicantsToRecoveryOnLoanSwitch` invoked from exactly 2 sites: `loanSwitchOrchestrator.svelte.ts:271` (caller) + `loanTypeChangeCleanup.svelte.ts:61` (definition). Compliant with chokepoint rule. |
| **P42 (reload-detection)** | check ran | only `isReloadOfCurrentPath.ts` + tests + e2e specs touch `performance.getEntriesByType('navigation')` — compliant |
| **P47 (pre-submit ConfirmModal wiring)** | check ran | 6 `confirmAndSubmit(` call sites (one per loan +page.svelte) — exactly the expected count. 0 direct `submitFormForEvaluation(` calls outside the wrapper. |
| **P48 (mongodb-client-encryption build)** | informational | New pitfall, documented this delta. No CI impact; main and CI unaffected. |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | `applicantRoleUtils.ts` is a shared util — touched by both P16 commits. Constant rename impact contained: `STAKE_FULL_FINANCIALS_THRESHOLD` is a NEW export (not breaking), `STAKE_SUBSTANTIAL_INTEREST_THRESHOLD` is a NEW export (not breaking), `STAKE_THRESHOLD_PERCENT` was a NEW addition in earlier work that was promoted/split here. All consumers (`directorFormUtils.ts`, `DirectorFormModal.svelte`, `stakeholderManagement.test.ts`) updated in lockstep within the same commits. |
| **BLAST-2 (type file changes)** | 0 type files touched |
| **BLAST-5 (store/state changes)** | 0 stores touched |
| **BLAST-9 (multi-author)** | single author (Prashant) |

---

## Findings

### F1 — Stale "≤ 25%" comments in `applicantRoleUtils.ts` after P16 alignment

- **Severity**: 🟡 Low (documentation drift, no behavioral impact)
- **File**: [`src/lib/utils/applicantRoleUtils.ts`](../../src/lib/utils/applicantRoleUtils.ts)
- **Lines**: 287, 316
- **Found by**: line-grep for `\b25\b` in `applicantRoleUtils.ts` after the P16 alignment commit

**Issue:** P16 (`a0f07423`) aligned the frontend stake threshold from a hardcoded `25` to the backend's `STAKE_FULL_FINANCIALS_THRESHOLD = 20`. The fix touched comments at lines 153/164/165/168/178/198/246/318 — but **missed two adjacent comments** in the `isDirectorSkippable` block that still read:

```ts
287:  // Conditions: totalDirectors > 4, non-family member, stake ≤ 25%,
...
316:  // Must have ≤ 25% stake
317:  const ownershipPercent = Number(applicant.ownershipPercent) || 0;
318:  if (ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD) return false;
```

The code is **correct** (line 318 references the constant, which equals 20). The comments are **stale** — a future reader scanning the function header will think the gate is 25% when the actual gate is 20%. This is exactly the "drift bait" pattern that motivated `091c77ce` (the STAKE-split refactor) — same constant + different documentation = silent disagreement.

**Recommendation:** Replace both `≤ 25%` with `≤ STAKE_FULL_FINANCIALS_THRESHOLD (20%)` to match the convention established for lines 153/164/178. No code change. ~2-line follow-up commit.

**Why this slipped:** The P16 commit message lists "3 places" where `> 25` was hardcoded (DirectorFormModal, directorFormUtils.isCardComplete, directorFormUtils.validateDirectorForm). The `isDirectorSkippable` gate was already using `STAKE_FULL_FINANCIALS_THRESHOLD` in the code but had pre-existing stale `25%` comments — they were not in P16's scope, so the alignment sweep missed them.

---

### No other new findings.

All prior review findings from `CODE-REVIEW-2026-05-24.md` were already closed (F1, F2 from 2026-05-23 review). Nothing carries forward from 2026-05-24.

---

## Commit-Level Analysis

### `c5c2234e` — docs: Pitfall #48 + refresh stale plan banner

**Clean docs commit, no source changes.** Two unrelated doc fixes bundled:

1. **Pitfall #48** added to [`docs/PITFALLS.md`](../PITFALLS.md) (42 lines including wrong/right/why/detection/enforcement), with index row in [`CLAUDE.md`](../../CLAUDE.md) §3 and a grep recipe in §4. Documents the worktree-specific `pnpm install` skipping `mongodb-client-encryption` native build, causing auth/CSFLE 500s on first hit. Workaround: `pnpm approve-builds`. The scope note clearly delimits this to worktree workflows — main and CI are unaffected. Good pitfall: real failure (2026-05-23 worktree session), class-wide (any new worktree), grep + workaround documented, wrong/right examples present.

2. **DEVELOPMENT-PLAN.md top-banner correction** — 4-line diff. The banner had been claiming P3/P4/P6/P7/P8/P9/P12 were "queued for next session" but the 2026-05-22 PM commit had shipped them. This is the third doc-drift catch in recent reviews; reinforces the value of `/end` audits.

No CI impact. No source impact.

---

### `a0f07423` — fix(P16): align director stake threshold to backend's 20% across UI + validators

**Source change.** Aligns three frontend hardcodes (`> 25`) to the existing backend constant `STAKE_FULL_FINANCIALS_THRESHOLD = 20`. 

**Files reviewed:**

- [`src/lib/components/DirectorFormModal.svelte`](../../src/lib/components/DirectorFormModal.svelte) (+18 / −6) — adds the import (line 53), renames `stakeExceeds25` → `stakeExceedsThreshold` at lines 558/564, updates the badge label at 586 to compose the threshold value dynamically (`stake exceeds ${STAKE_FULL_FINANCIALS_THRESHOLD}%` → "stake exceeds 20%"). The badge is the user-visible piece — verified by reading the surrounding template that the badge is shown when `> threshold` resolves true.
- [`src/lib/utils/directorFormUtils.ts`](../../src/lib/utils/directorFormUtils.ts) (+15 / −5) — imports the constant (line 11), renames the local in `isCardComplete` (line 372) and `validateDirectorForm` (line 476) from `stakeOver25` → `stakeOverThreshold`. Two block comments (361, 468) explain the P16 rationale and warn future readers not to drift back.
- [`src/lib/utils/applicantRoleUtils.ts`](../../src/lib/utils/applicantRoleUtils.ts) (+3 / −3) — three stale "> 25%" comment references updated to mention the constant. (This commit DID NOT update the comments at lines 287/316 that became my F1 finding — those are in a different function.)
- [`src/lib/testing/__tests__/stakeholderManagement.test.ts`](../../src/lib/testing/__tests__/stakeholderManagement.test.ts) (+30 / −8) — adds two boundary tests:
  - 22% stake (between old 25 and new 20) completes without `loanRole`
  - 20% stake (exactly at threshold) still requires `loanRole` (rule is `>`, not `>=` for the director-skip path)
  
  These lock in the new behavior. Test count went from 11,658 → 11,660 — matches the commit message exactly.

**Risk assessment:** Single 5-percentage-point UX shift. A director with 21-25% ownership previously had to pick a `loanRole` (and could pick "Information only" expecting it to stick, but the backend silently overrode to `borrower`). Now the UX matches the backend: 21-25% directors get the full-financials gate auto-triggered. **This is a UX correctness win**, not a regression — the user's reported "loanRole" was being ignored anyway.

**Parity check:** Director-stake gating is centralized in these 3 frontend files + 1 backend rule. No other code path duplicates the 25/20 comparison. ✅ Parity preserved.

**Behavioral verification:** The new tests cover both sides of the new boundary (20 strict, 22 above-threshold). Type-check clean. No browser smoke documented in the commit message — acceptable because the visible change is one badge label substitution and one pre-existing validator already covered by the test suite.

---

### `091c77ce` — refactor(applicantRoleUtils): split STAKE constant by operator semantics

**Pure refactor.** Same numeric values at every site, same operators, just renamed constants. The motivation is excellent — `applicantRoleUtils.ts` had ONE constant (`STAKE_FULL_FINANCIALS_THRESHOLD = 20`) used with TWO different operators against the same percent value:

- `>` at lines 198/246/318 — director loanRole override (business rule: must EXCEED to override)
- `>=` at lines 497/527/532 — 6-way classification (IT Act §2(32): "substantial interest = 20% or more")

Both are correct, but "same constant, different operators" is drift bait — if a future PR amends the IT Act threshold to 25%, the temptation is to update ONE constant and accidentally move both rules.

**Solution:** Split into `STAKE_FULL_FINANCIALS_THRESHOLD = 20` (paired with `>`) and `STAKE_SUBSTANTIAL_INTEREST_THRESHOLD = 20` (paired with `>=`). Both have a JSDoc warning ("DO NOT normalize"). Consumer sites at lines 497/527/532 switched from `STAKE_FULL_FINANCIALS_THRESHOLD` → `STAKE_SUBSTANTIAL_INTEREST_THRESHOLD`.

**Verification:** Grep confirms 3 `>` sites + 3 `>=` sites, all using their semantically-paired constant. Test count unchanged (11,660 — pure refactor, no behavioral delta). The boundary tests added in `a0f07423` continue to pass.

This is a clean example of a "make-it-impossible-to-do-the-wrong-thing" refactor that the session-handoff explicitly highlights as a generalisable pattern.

---

### `55f1b97a` — docs: /end close for 2026-05-25

**Pure docs.** SESSION-HANDOFF refresh, CHANGELOG entry for the 3 source/doc commits in this session, DEVELOPMENT-PLAN banner update. Multi-paragraph CHANGELOG narrative including a "Course correction" section calling out the 3 doc-state drifts discovered during the loose-end sweep. No source change.

The session-handoff entry also documents the generalisable lesson ("same constant + different operators in same module = drift bait") for future ADR consideration.

---

### `994f33e0` — docs: land 3 untracked artifacts from prior sessions

**Pure docs commit, staging 3 files that had been written across prior sessions but never staged.**

- [`docs/GTM-CONTEXT-BRIEF.md`](../GTM-CONTEXT-BRIEF.md) (+262, new) — paste-ready brief for external AI tools (ChatGPT/Gemini/Claude.ai) with no repo access. Solo-founder GTM context. **PII check:** Read first 50 lines and scanned headers — generic founder context, no real customer/RM names, no contact info, no credentials. The "team is two people" mention is non-identifying. Safe to commit.
- [`docs/reviews/CODE-REVIEW-2026-05-24.md`](CODE-REVIEW-2026-05-24.md) (+213) — the prior-session review report (cross-referenced throughout this report). Should have been committed in its own session; landing it now keeps the review-doc trail intact.
- [`docs/reviews/CONTRAST-AUDIT-2026-05-23.md`](CONTRAST-AUDIT-2026-05-23.md) (+24) — 456/456 pairs passing across 12 themes. Auto-generated by `pnpm test:contrast` and previously orphaned.

No source impact. The commit message acknowledges this was a working-tree-vs-HEAD hygiene fix.

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New endpoints | 0 | no `+server.ts` files touched |
| Rate-limit gaps closed | 0 (none open since F1 closure 2026-05-24) | n/a |
| New operator scripts | 0 | n/a |
| CSFLE / PII boundary | Unchanged | No new plaintext storage. P48 documents a worktree-only build hazard that prevents CSFLE endpoints from running — not a leak risk. |
| Anti-scraping budget | Unchanged | n/a |
| New permissions | 0 | n/a |
| Threshold alignment (P16) | UX-only — backend rule unchanged | Director 21-25% directors now see correct full-financials gate. No security implication; the backend rule was already authoritative. |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| `applicantRoleUtils.ts` constant split | Zero runtime impact — two `const = 20` exports vs one. Constant-folding eliminates any duplication at build time. |
| `DirectorFormModal` template substitution | Badge label now interpolates the constant instead of a hardcoded string. Negligible — runs once per Director modal mount. |
| `directorFormUtils` rename | Pure variable rename, zero runtime impact. |
| 3 new docs files | No bundle impact (docs only). |
| Test count +2 | Adds ~10ms to test runtime; negligible. |

---

## Cross-Team Blast Radius Summary

**One shared module touched** (`applicantRoleUtils.ts`) by 2 commits (`a0f07423` + `091c77ce`). The changes are additive (new exports) + targeted (rename of operator-specific sites). All consumers were updated within the same commits. Test suite expanded with 2 boundary tests that pin the new behavior. Single-author delta, no cross-team regression risk.

No other shared modules touched. No type files, no stores, no schemas, no API contracts.

---

## Known-Safe Inventory Updates

- **`{@html}` allowlist** unchanged.
- **Server `console.*` allowlist** unchanged: `logger.ts` (2) + `telemetry.ts` (3); `auth/init-widget` + `auth/resend-otp` (commented-out).
- **`window.location.reload()` inventory** unchanged: 13 instances across approved locations.
- **`exec()` allowlist** unchanged.
- **Raw `json()` route inventory** unchanged (no API route changes in delta).
- **`STAKE_*` constant inventory (NEW):** `STAKE_FULL_FINANCIALS_THRESHOLD` (paired with strict `>`, business rule, 3 sites) + `STAKE_SUBSTANTIAL_INTEREST_THRESHOLD` (paired with `>=`, IT Act §2(32), 3 sites). Both = 20 today; split prevents future drift. Document this pairing if either rule changes in future.

---

## Observations

- **One real finding (F1 above).** Two comments in `applicantRoleUtils.ts:isDirectorSkippable` (lines 287 + 316) still say "≤ 25%" after the P16 alignment sweep. Code is correct; comments are stale. Trivial fix — would take 30 seconds in a future commit.
- **The P16 → STAKE-split sequence is a textbook example of incremental safety improvement.** P16 (`a0f07423`) fixed a real UX bug (5pp frontend/backend disagreement). The follow-up refactor (`091c77ce`) noticed that the resulting code had the "same constant + different operators" smell and split it preemptively. The CHANGELOG explicitly captures the generalisable lesson — promising candidate for an ADR or memory file when the pattern recurs.
- **Pitfall #48 is well-scoped.** The grep recipe + workaround + scope-note (worktree-only, main and CI unaffected) is exactly the documentation density the §17 hygiene rules call for. No CI test exists because the bug is environmental, not in source — appropriate.
- **`994f33e0` is a quiet but useful commit.** Three doc files had been written across prior sessions but never staged, leaving working-tree drift relative to HEAD. Landing them keeps the review-doc trail (CODE-REVIEW-2026-05-24 was previously untracked and would have been invisible to a fresh-clone reviewer).
- **GTM context brief is now in-repo** but explicitly marked for external AI consumption. This is a new genre of in-repo doc. Worth flagging at the next ADR review whether this kind of "brief for external context windows" deserves its own folder convention or naming pattern.

---

## Top 5 Actions for Next Session

1. **Trivial follow-up: update the two stale `≤ 25%` comments in `applicantRoleUtils.ts:287/316`** to reference `STAKE_FULL_FINANCIALS_THRESHOLD (20%)` per F1. Single 2-line commit, 30 seconds. Either standalone or piggy-backed on the next commit touching the file.
2. **Yes Bank RM call** — sharpened framing for Q4/Q6/Q9 from the 2026-05-25 web-research session is ready. Per SESSION-HANDOFF ▶ NEXT SESSION pointer, this is the primary next-session action.
3. **Optional: promote the "same constant + different operators in same module = drift bait" pattern** to an ADR or `MEMORY.md` pointer. The P16 → STAKE-split sequence shows the value clearly. Defer until the pattern recurs.
4. **Epic D planning** continues from prior reviews — Yes Bank RM call + 6 lock-down decisions still gating implementation start.
5. **Pre-existing `/form/how-can-we-help` 500** carries forward from 2026-05-24. Per-user data condition for un-onboarded DSA account; not caused by any commit in this delta.
