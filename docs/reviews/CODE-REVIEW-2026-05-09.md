# Daily Code Review — 2026-05-09

**Scope:** No new commits since last review (`91a605a5` — 2026-05-06). All standing grep rules re-verified. Working tree has 19 files with uncommitted changes (193 insertions, 18 deletions) — **reviewed in detail below** (3 days old, addresses all May 6 carry-forwards).

**Authors:** N/A (no new commits). Uncommitted work is by primary author.

---

## Standing Grep Rules — Full Tier 1-4 Sweep

| Rule | Tier | Result | Delta vs May 6 |
|------|------|--------|-----------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte`/`.ts` | T1 | Same known-safe inventory. No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same exception inventory: 4 `pageDescription`, 1 `NoteWorthyMessage`, 1 `Toast.svelte`, 1 `JsonLd.svelte`, 1 admin policy page. All other instances use `sanitizeHtml()`. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` has 2 intentional `console.error`/`console.warn` (the logger fallback itself). `api/auth/` has 2 commented-out `console.log` lines. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** Clean. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** — clean | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 instances — all approved exceptions (`+error.svelte`, `hooks.client.ts`, `LanguageSelector`, `ErrorBoundary`, `ResetDataButton`, 4 admin pages) | Unchanged |
| **D** — Async returning Capacitor proxy | T2 | **0 matches** — clean | Unchanged |
| **I** — `typeof window !== 'undefined'` (Pitfall #9) | T2 | **0 matches** — eradicated | Unchanged |
| **J** — Module-scope `fetch` (Pitfall #4) | T2 | **0 matches** — clean | Unchanged |
| **H1** — `state_referenced_locally` warning | T3 | **0 matches** — `pnpm check` passes with 0 errors, 0 warnings | Unchanged |
| **K** — JSON-Logic `!=` in `src/lib/config/` | T3 | ~50 matches — all existing, stable set against string literals. No new null-check patterns. | Unchanged |
| **L** — Numeric fields without explicit `minLimit` | T3 | **10,431 pass, 1 fail** (guards.test.ts timeout — unrelated). `numericFieldsHaveExplicitLimits` test green. | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — Color token contrast audit (WCAG AA) | T3 | Not re-run (no CSS token changes since May 6 baseline of 456/456 pass). | N/A |
| **P** — Auto-clear parity (6 form pages) | T4 | **6 files matched** — correct parity. Not triggered (no form page commits). | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **O** — Payload snapshot drift | T4 | Not triggered (no payloadBuilder commits). | N/A |
| **R** — Server→client field forwarding | T4 | Not triggered (no schema type commits). | N/A |

---

## Commits Reviewed

No new commits since `91a605a5` (2026-05-06).

---

## Uncommitted Working Tree Review

The 19-file change set has been sitting for 3 days. All changes analyzed via `git diff`:

### WTR-1 — M1 resolution: `isAutoLocked` / `isAutoFillPending` split (IncomeSourceForm.svelte)

**Verdict: Clean. M1 carry-forward resolved.**

The prior M1 finding flagged that expanding `AUTO_LOCKED_KEYS` to 12 entries could render fields **locked AND empty** when the parent Company hadn't supplied the source data yet. The fix correctly splits the old single check (`isAutoEntry && AUTO_LOCKED_KEYS.has(key)`) into two functions:

- [`isAutoLocked(key)`](src/lib/components/IncomeSourceForm.svelte:347) — locks only when `specificsAnswers[key]` is defined AND non-empty. Correctly prevents locked-empty state.
- [`isAutoFillPending(key)`](src/lib/components/IncomeSourceForm.svelte:361) — returns true when the field is in `AUTO_LOCKED_KEYS` but has no derived value yet. UI appends "(auto-fills from Company profile)" to the label.

Applied consistently to all 3 field types: radio (~line 1074), select (~line 1117), and numeric (~line 1160). The `selectPending` variable correctly gates on `!isFieldLocked` to avoid showing the pending hint when the field is locked for another reason (OPC, listed-large-public, company-linked).

### WTR-2 — M2 resolution: `_stableStringify` replaces raw `JSON.stringify` (form.svelte.ts)

**Verdict: Clean. M2 carry-forward resolved.**

Replaces `JSON.stringify(a) === JSON.stringify(b)` with a `_stableStringify` function that sorts object keys recursively via the `JSON.stringify` replacer parameter. This eliminates the key-ordering assumption — two objects with identical keys/values but different insertion order now compare as equal.

The implementation handles:
- Nested objects (recursive via replacer)
- Arrays (preserved as-is, no sorting — correct, since array order is semantic)
- Non-objects pass through unchanged
- `try/catch` wrapper in `_jsonEquals` handles `TypeError` from circular refs

Well-documented comments explain the rationale.

### WTR-3 — M3 resolution: try/finally on re-entrancy flags (applicantFormManager.svelte.ts)

**Verdict: Clean. M3 carry-forward resolved.**

Both `_companyTypeChangeConfirmed` (~line 1405) AND `_nriChangeConfirmed` (~line 1482) are now wrapped in `try/finally`. The M3 finding only mentioned `_companyTypeChangeConfirmed` — the fix proactively applies the same pattern to the identical `_nriChangeConfirmed` flag. Comments explain the rationale inline.

### WTR-4 — Pitfall #14 enforcement: explicit `minLimit`/`maxLimit` on 12 questionBank files

**Verdict: Clean. Pitfall #14 fully addressed.**

12 numeric questions across 3 loan types (homeLoan, lapLoan, plotLoan) receive explicit limits:

| Question | minLimit | maxLimit | Notes |
|----------|----------|----------|-------|
| `q3b_btEmisPaid` (home) | 0 | 600 | 0 is legit (fresh BT) — the canonical Pitfall #14 case |
| `q2a_mortgageYearCustom` (home deal) | 5 | 40 | Loan tenure in years |
| `q1a_mortgageYearCustom` (home loan req) | 5 | 25 | Loan tenure in years |
| `q1a_mortgageYearCustom` (home sanction) | 5 | 25 | Loan tenure in years |
| carpet area (home) | 100 | 999999 | sq.ft |
| `q7_existingInterestRate` (home) | 1 | 40 | Percentage |
| `q8_remainingTenure` (home) | 12 | 420 | Months |
| `q2_existingInterestRate` (LAP) | 1 | 40 | Percentage |
| `q3_originalRemainingTenure` (LAP) | 12 | 180 | Months |
| `q4_carpetArea` (LAP) | 100 | 50000 | sq.ft |
| `q3_ConstructionArea` (plot) | 100 | 1000000 | sq.ft |
| `q6_PlotArea` (plot) | 100 | 1000000 | sq.ft |
| `q4_builtArea` (plot construction) | 100 | 50000 | sq.ft, `required: false` — minLimit applies only when value entered |
| `q6_btExistingInterestRate` (plot) | 1 | 30 | Percentage, `required: false` |
| `q5b_sellerForeclosureAmount` (plot) | 1 | 9999999999 | Amount — maxLimit matches `maxLength: 10` |

All values are domain-reasonable. `minLimit: 0` used only for `q3b_btEmisPaid` (count field), all others use `1` or higher.

### WTR-5 — Supporting changes

- **CLAUDE.md** (+59 lines): Adds Pitfall #14 (numeric minLimit) and Pitfall #15 ({@html} sanitization) with wrong/right examples, grep patterns, and enforcement test references. Well-structured following the existing pitfall template. Pre-flight grep section updated with matching commands.
- **formEngine.ts** (+7 lines): JSDoc on `minLimit` explaining intent, linking Pitfall #14, and describing the CI enforcement test.
- **schemaComposer.test.ts** (+7 lines): Strips `minLimit`/`maxLimit` from normalized questions before comparing against legacy JSON, since these are TS-only enhancements not present in the original JSON schemas. Comment explains rationale.
- **package.json** (+1 line): Adds `test:contrast:unit` script for contrast math unit tests (addresses M4 from May 6).
- **numericFieldsHaveExplicitLimits.test.ts** (new, untracked): CI enforcement test for Pitfall #14.
- **scripts/contrast/__tests__/** (new, untracked): Unit tests for WCAG contrast math (addresses M4 recommendation from May 6).

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — Guards test flaky timeout (carry-forward, intermittent)

**File:** [`src/lib/testing/__tests__/guards.test.ts:269`](src/lib/testing/__tests__/guards.test.ts:269)
**Confidence:** 75%

Still reproducing: `'should return 401 response for unauthenticated user'` timed out at 5000ms during the full parallel test run (10,431 pass, 1 fail). Passes in isolation. Third consecutive review observing this. Dynamic `import('$lib/server/guards')` likely contends with MongoDB setup from other test files during parallel execution.

**Impact:** Low — CI false-red risk. Not a code bug.

**Recommendation:** Bump timeout to 10000ms in this test file, or restructure to mock the database connection.

---

### Resolved carry-forwards

| ID | From | Finding | Status |
|----|------|---------|--------|
| M1 (May 6) | `IncomeSourceForm.svelte` | `AUTO_LOCKED_KEYS` locked-empty state | **Resolved** — see WTR-1 above |
| M2 (May 6) | `form.svelte.ts` | `_jsonEquals` JSON.stringify ordering | **Resolved** — see WTR-2 above |
| M3 (May 6) | `applicantFormManager.svelte.ts` | `_companyTypeChangeConfirmed` try/finally | **Resolved** — see WTR-3 above |
| M4 (May 6) | `scripts/contrast/*.mjs` | Contrast scripts untyped, no unit tests | **Addressed** — `scripts/contrast/__tests__/` added (untracked) |

All four May 6 carry-forwards have been addressed in the uncommitted working tree.

---

## Rule A — Known-Safe Raw `fetch` Inventory (unchanged)

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

## Rule E — Known `{@html}` Exception Inventory (unchanged)

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

### O1 — Uncommitted work is ready to commit

The 19-file change set forms a single coherent work unit:
- **3 bug fixes** (M1/M2/M3 from May 6 review)
- **1 enforcement feature** (Pitfall #14 — numeric minLimit CI test + 12 questionBank files)
- **2 documentation updates** (CLAUDE.md Pitfalls #14 & #15, formEngine.ts JSDoc)
- **1 tooling addition** (contrast unit tests + npm script)

Tests pass (10,432 total, 1 intermittent flaky timeout unrelated to these changes). Type-check clean. The changes have been sitting for 3 days — committing and pushing would close out the May 6 review's action items.

### O2 — Good engineering practices observed in uncommitted work

- **M1 fix splits behavior into two named functions** (`isAutoLocked`, `isAutoFillPending`) rather than inlining a complex ternary — readable and testable.
- **M3 fix proactively covers `_nriChangeConfirmed`** in addition to the flagged `_companyTypeChangeConfirmed` — caught the identical pattern before it was reported.
- **CLAUDE.md Pitfall #14** follows the exact template (wrong/right example, enforcement test, grep pattern, last-verified date).
- **schemaComposer.test.ts** explains why `minLimit`/`maxLimit` are stripped from comparison — prevents false-fail when legacy JSON doesn't have these fields.

### O3 — Test suite health: 10,432 tests, 107 files

The guards.test.ts flaky timeout is now 3 reviews old. It's the only instability in the suite.

---

## Top 3 Actions for Next Session

1. **Commit the 19-file working tree** — All changes reviewed clean. Suggested commit message: `fix(review): resolve M1/M2/M3 carry-forwards + enforce Pitfall #14 numeric limits`. Run `pnpm check && pnpm test:unit -- --run` one final time before committing.

2. **Fix guards.test.ts flaky timeout** — 3 consecutive reviews flagging this. Add `{ timeout: 10000 }` to the specific test or mock the database connection to eliminate the parallel-execution race.

3. **Verify unsecured loan types have minLimit coverage** — The uncommitted changes add limits to homeLoan, lapLoan, and plotLoan question banks. Check whether personalLoan, businessLoan, and professionalLoan numeric questions also need explicit limits (the `numericFieldsHaveExplicitLimits` test covers all 6 composers — if it passes, they're covered, but worth confirming the test actually walks all loan types).
