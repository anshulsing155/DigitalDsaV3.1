# Daily Code Review — 2026-05-11

**Scope:** No new commits since last review (`91a605a5` — 2026-05-06). All standing grep rules re-verified. Working tree has 19 files with uncommitted changes (193 insertions, 18 deletions) — unchanged from May 9/10 reviews.

**Authors:** N/A (no new commits). Uncommitted work is by primary author.

**Prior review:** [`CODE-REVIEW-2026-05-10.md`](CODE-REVIEW-2026-05-10.md)

---

## Standing Grep Rules — Full Tier 1-4 Sweep

| Rule | Tier | Result | Delta vs May 10 |
|------|------|--------|-----------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte`/`.ts` | T1 | Same known-safe inventory (see below). No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same 8 exception sites. All other instances use `sanitizeHtml()`. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` has 2 intentional `console.error`/`console.warn` (logger fallback). `api/auth/` has 2 commented-out lines. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** Clean. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** — clean | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 instances — all approved exceptions (`+error.svelte`, `hooks.client.ts`, `LanguageSelector`, `ErrorBoundary`, `ResetDataButton`, 4 admin pages, 1 admin test page) | Unchanged |
| **D** — Async returning Capacitor proxy | T2 | **0 matches** — clean | Unchanged |
| **I** — `typeof window !== 'undefined'` (Pitfall #9) | T2 | **0 matches** — eradicated | Unchanged |
| **J** — Module-scope `fetch` (Pitfall #4) | T2 | **0 matches** — clean | Unchanged |
| **H1** — `state_referenced_locally` warning | T3 | **0 errors, 0 warnings** — `pnpm check` passes clean | Unchanged |
| **K** — JSON-Logic `!=` in `src/lib/config/` | T3 | 353 occurrences across 43 files — stable set, all against string literals. No new null-check patterns. | Unchanged |
| **L** — Numeric fields without explicit `minLimit` | T3 | **107 test files pass, 10,432 tests green** (`numericFieldsHaveExplicitLimits` included). All 6 loan composers covered. | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — Color token contrast audit (WCAG AA) | T3 | **456/456 pairs pass** across all 12 themes. Report: [`CONTRAST-AUDIT-2026-05-11.md`](CONTRAST-AUDIT-2026-05-11.md) | Unchanged (456/456 baseline maintained) |
| **P** — Auto-clear parity (6 form pages) | T4 | **6 files matched** — correct parity. Not triggered (no form page commits). | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **O** — Payload snapshot drift | T4 | Not triggered (no payloadBuilder commits). | N/A |
| **R** — Server→client field forwarding | T4 | Not triggered (no schema type commits). | N/A |

---

## Commits Reviewed

No new commits since `91a605a5` (2026-05-06). The last 5 days have produced zero commits.

---

## Uncommitted Working Tree — Status Check

The 19-file change set (193 insertions, 18 deletions) is **identical to what was reviewed in detail on May 9**. No new changes have been added to the working tree since then. The May 9 review (WTR-1 through WTR-5) remains the authoritative analysis.

Summary of uncommitted work (all reviewed clean on May 9):
- **WTR-1** — `isAutoLocked` / `isAutoFillPending` split in [`IncomeSourceForm.svelte`](src/lib/components/IncomeSourceForm.svelte) — resolves M1 carry-forward
- **WTR-2** — `_stableStringify` replaces raw `JSON.stringify` in [`form.svelte.ts`](src/lib/state/form.svelte.ts) — resolves M2 carry-forward
- **WTR-3** — try/finally on re-entrancy flags in [`applicantFormManager.svelte.ts`](src/lib/components/applicantFormManager.svelte.ts) — resolves M3 carry-forward
- **WTR-4** — Explicit `minLimit`/`maxLimit` on 15 numeric questions across 12 questionBank files (homeLoan, lapLoan, plotLoan) — enforces Pitfall #14
- **WTR-5** — CLAUDE.md Pitfalls #14 & #15, formEngine.ts JSDoc, schemaComposer.test.ts strip, `test:contrast:unit` script

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — Uncommitted work now sitting for 5+ days (ESCALATED from May 10)

**Confidence:** 95%

The 19-file change set was first identified on May 6, reviewed clean on May 9, and has now been uncommitted for **5 consecutive days** across 3 consecutive daily reviews. All changes have been reviewed clean three times. This is the longest uncommitted-change gap observed in the project history.

**Risk:**
- Merge conflicts if other agents or sessions work on `main`
- Loss of work if working tree is accidentally reset (3 stashes already exist — see below)
- Review staleness — the changes were verified against the codebase state on May 9; if dependencies or surrounding code shift, the review conclusions may no longer hold

**Stash inventory (observed):** 3 stashes exist from earlier sessions — `stash@{0}` ("pre-switch from main"), `stash@{1}` (WIP from overhaul branch), `stash@{2}` (MonthYearModal fix). These are separate from the uncommitted working tree.

**Recommendation:** Commit and push at earliest opportunity. Suggested message:
```
fix(review): resolve M1-M3 carry-forwards + enforce Pitfall #14 numeric limits

- IncomeSourceForm: split isAutoLocked/isAutoFillPending (M1)
- form.svelte.ts: _stableStringify for idempotent comparisons (M2)
- applicantFormManager: try/finally on re-entrancy flags (M3)
- 12 questionBank files: explicit minLimit/maxLimit on 15 numeric questions
- CLAUDE.md: add Pitfalls #14 and #15
- schemaComposer.test.ts: strip obsolete assertion
- package.json: add test:contrast:unit script
```

### M2 — Guards test flaky timeout (carry-forward from May 6, 5th consecutive review)

**File:** [`src/lib/testing/__tests__/guards.test.ts:269`](src/lib/testing/__tests__/guards.test.ts:269)
**Confidence:** 75%

Note: the full test suite now passes cleanly (10,432/10,432) on this run. The flaky timeout was not observed today, but it has appeared in 4 of the past 5 review runs. Dynamic `import('$lib/server/guards')` likely contends with MongoDB setup in parallel test files.

**Impact:** Low — CI false-red risk. Not a code bug.

**Recommendation:** Add `{ timeout: 10000 }` to the specific test or restructure the database mock. Longest-standing open finding (5th consecutive review).

---

## Resolved Carry-Forwards

| ID | From | Finding | Status |
|----|------|---------|--------|
| M1 (May 6) | `IncomeSourceForm.svelte` | `AUTO_LOCKED_KEYS` locked-empty state | **Resolved** (WTR-1, reviewed May 9) — awaiting commit |
| M2 (May 6) | `form.svelte.ts` | `_jsonEquals` JSON.stringify ordering | **Resolved** (WTR-2, reviewed May 9) — awaiting commit |
| M3 (May 6) | `applicantFormManager.svelte.ts` | `_companyTypeChangeConfirmed` try/finally | **Resolved** (WTR-3, reviewed May 9) — awaiting commit |
| M4 (May 6) | `scripts/contrast/*.mjs` | Contrast scripts untyped, no unit tests | **Addressed** (scripts/contrast/__tests__/ added) — awaiting commit |

---

## Rule A — Known-Safe Raw `fetch` Inventory (unchanged from May 10)

| Location | Method | Why safe |
|----------|--------|----------|
| `(auth)/login/+page.svelte` | POST (8x) | Pre-auth pages — no session, CSRF irrelevant |
| `(auth)/partner-signup/+page.svelte` | POST (5x) | Pre-auth — same reason |
| `f/[token]/+page.svelte` | POST (3x) | Public share-link — token-gated, no session |
| `onboarding/BasicFields.svelte` | POST (2x) | Pre-session onboarding |
| `onboarding/steps/AboutYou.svelte` | POST (2x) | Pre-session onboarding |
| All form pages (`snapshots?limit=1`) | GET | Read-only data fetch |
| `how-can-we-help/+page.svelte` | GET | Read-only |
| `ApplicantProfilePage`, `ProfileTabContent`, `PincodeTypeahead` | GET | Location lookups |
| `CheckForUpdatesButton`, `OverviewTab` | GET | Read-only |
| `_archived/testAPI` | External tunnel | Archived test page |
| `dashboard/rm/+page.svelte` | GET | Preferred DSAs list |
| `services/sessionService.ts` | POST (6x) | Auth service — session management, pre-auth or auth-layer internal |
| `services/verifyEmailOTP.ts` | POST (2x) | Onboarding email verification — pre-session |
| `services/homeLoanApi.ts` | POST (3x) | External API calls — no CSRF scope |
| `services/authService.ts` | POST (3x) | Auth service — login/register/verify — pre-session |
| `utils/csrf.ts` | POST (3x) | The `secureFetch` wrapper itself |
| `utils/api.ts` | N/A | Capacitor platform wrapper — native app only |
| `server/externalFetch.ts` | N/A | Server-side external fetch utility |

No changes from prior review.

---

## Rule E — Known `{@html}` Exception Inventory (unchanged from May 10)

| Location | Content | Why safe |
|----------|---------|----------|
| `JsonLd.svelte` | JSON-LD structured data | Escaped via `JSON.stringify` |
| `Toast.svelte` | Internal SVG icon constants | Hardcoded, no user input |
| 4x form `pageDescription` | `serverPage?.pageDescription` | Server-controlled schema strings |
| `policies/[artifact_id]/+page.svelte` | `a.human_readable` | Admin-role only, internal policy text |
| `how-can-we-help/+page.svelte` | `NoteWorthyMessage()` | Hardcoded HTML strings, no user input |
| `_archive/` components (3x) | Various | Archived, not mounted |

All non-exception instances use `sanitizeHtml()`.

---

## Observations (Informational)

### O1 — Codebase health metrics stable

- **Test suite:** 10,432 tests across 107 files. All pass (guards.test.ts did not flake this run).
- **Type-check:** 0 errors, 0 warnings.
- **Contrast audit:** 456/456 pairs pass WCAG AA across all 12 themes.
- **Security surface:** No new violations across all Tier 1 rules.

### O2 — 5 consecutive days with no commits

The last commit (`91a605a5`) was 2026-05-06. This is the longest gap between commits in the recent project history (prior average was 1-2 commits/day). The uncommitted work is clean and ready — the gap appears to be an operational pause, not a technical blocker.

### O3 — 3 stashes accumulating

Three stashes exist from earlier sessions. While benign, they represent orphaned state that could be cleaned up during the next active session to reduce cognitive overhead.

---

## Top 3 Actions for Next Session

1. **Commit the 19-file working tree (URGENT)** — Now reviewed clean across **three** consecutive daily reviews (May 9, 10, 11). 5 days uncommitted is the primary risk — every additional day increases merge conflict probability and work-loss exposure.

2. **Fix guards.test.ts flaky timeout** — 5th consecutive review flagging this. Add `{ timeout: 10000 }` to the specific test or restructure the database mock. Longest-standing open finding.

3. **Clean up stash inventory** — Review 3 stashes (`stash@{0}` pre-switch, `stash@{1}` WIP overhaul, `stash@{2}` MonthYearModal fix) and either apply or drop. Stale stashes are a source of confusion in future sessions.
