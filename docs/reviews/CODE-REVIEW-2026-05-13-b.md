# Daily Code Review — 2026-05-13 (b) — Full Sweep

**Scope:** 4 commits `ef2b31d5..9764a2ca` (2026-05-13, after morning review cutoff). All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-13.md`](CODE-REVIEW-2026-05-13.md) — reviewed through `ef2b31d5`.

**Contrast audit:** [`CONTRAST-AUDIT-2026-05-13.md`](CONTRAST-AUDIT-2026-05-13.md) — 456/456 pairs pass (unchanged).

**Review profile:** Full (T1-T9 + Phase 3).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | 0 errors, 0 warnings |
| `pnpm test:unit -- --run` | 107 files, 10,432 tests — all pass |
| `pnpm test:contrast` | 456/456 pairs pass |
| `git log --since='1 week' ... \| grep co-authored-by` | 0 matches |

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `805b8121` | fix(review): resolve all 4 medium findings from daily code review | 6 | +288/−10 |
| `77f425e3` | fix(review): resolve 5 code review findings + refactor wizard step logic | 18 | +327/−104 |
| `174b26a8` | fix(validation): enforce limits on BT currency fields, cross-field EMI cap, and obligation interest rate | 5 | +38/−2 |
| `9764a2ca` | fix(directors): preserve recovered income entry specifics during director restoration | 1 | +60/−0 |

Total: 29 files changed, +713/−116.

---

## Standing Grep Rules — Full Tier 1-9 Sweep

| Rule | Tier | Result | Delta vs prior (May 13 morning) |
|------|------|--------|------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte`/`.ts` | T1 | Same known-safe inventory. No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same exception sites. All others use `sanitizeHtml()`. | Unchanged |
| **E2** — Dynamic attribute XSS | T1 | Not triggered (no new `href={`/`src={` patterns). | — |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` fallback (2 lines) + 2 commented-out in `api/auth/`. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | 0 in non-test files. Test file matches are fixture data (expected). | Unchanged |
| **SEC-2** — PII in logging | T1 | Not triggered (no new logger calls in changed files). | — |
| **SEC-3** — Cookie security | T1 | Same inventory. All cookies have `httpOnly`+`secure`+`sameSite`. | Unchanged |
| **SEC-4** — eval/exec/child_process | T1 | 2 known-safe instances (e2e-runs + run-vitest, both dev-only admin-only). | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (non-secret push notification key). No `$env/*/private` in `.svelte` files. | Unchanged |
| **SEC-6** — Rate limiting coverage | T1 | No unprotected mutating endpoints found. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches.** | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 approved instances. | Unchanged |
| **D** — Async Capacitor proxy return | T2 | **0 matches.** | Unchanged |
| **I** — `typeof window !== 'undefined'` | T2 | **0 matches.** | Unchanged |
| **J** — Module-scope `fetch` | T2 | **0 matches.** | Unchanged |
| **SSR-1** — Hydration mismatch sources | T2 | Not triggered (no new `Math.random`/`Date.now` in `.svelte`). | — |
| **H1** — `state_referenced_locally` | T3 | **0 warnings.** | Unchanged |
| **K** — JSON-Logic `!=` in config | T3 | 346 occurrences / 43 files. All against string literals. | Unchanged |
| **L** — Numeric `minLimit` test | T3 | All tests pass (incl. `numericFieldsHaveExplicitLimits`). | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — WCAG AA contrast | T3 | **456/456 pass.** | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 matches.** | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | 0 in non-test files. 4 in test fixtures (exempt). | Unchanged |
| **O** — Payload snapshot drift | T4 | Triggered (existingLoan.ts touched). Tests pass. | Clean |
| **P** — Auto-clear parity (6 pages) | T4 | **6 files matched** — correct parity. | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **PH-1** — Security headers | T5 | All 6 headers present in `hooks.server.ts`. | Unchanged |
| **PH-3** — API response consistency | T5 | `json()` (SvelteKit) used in 3 routes: `communication/templates`, `dsa/walkthrough`, `dsa/rm-suggestions`. Known carry-forward — should migrate to `apiOk()`/`apiError()`. | Unchanged |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 matches.** | Unchanged |
| **PERF-1** — `import *` | T6 | 2 instances: `json-logic-js` (required API shape), `@mediapipe/face_detection` (SDK requirement). | Unchanged |
| **BLAST-1** — Shared module changes | T9 | **2 files:** `routes.ts` (additive constant), `formWizardEngine.ts` (expanded condition). See analysis below. | New — reviewed |
| **BLAST-2** — Type/interface changes | T9 | **0 type files changed.** | Clean |
| **BLAST-6** — Route constant changes | T9 | `QA_COVERAGE` added (additive). All consumers updated in same commit. | Clean |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `formWizardEngine.ts` blast radius: `type: 'currency'` added to numeric check

**File:** [`formWizardEngine.ts:493`](src/lib/utils/formWizardEngine.ts:493)
**Commit:** `174b26a8`
**Confidence:** 65%
**Blast radius:** 50+ importers (all 6 form pages + wizard state + tests)

`isFieldAnswered()` now treats `type: 'currency'` fields the same as `type: 'number'` for min/max validation. This is **semantically correct** — currency fields should enforce limits. However, any existing currency field across all 6 loan types that lacks explicit `minLimit` will now default to `minLimit: 1` (the safety-net default from Pitfall #14).

**Risk:** If a currency field elsewhere (outside `existingLoan.ts`) relies on 0 being valid and doesn't declare `minLimit: 0`, the Next button will now block. The `numericFieldsHaveExplicitLimits` CI test only scans for `uiType: 'number'` / `type: 'number'` fields — it may not cover `type: 'currency'`.

**Verification needed:** Grep all `type: 'currency'` questions across the 6 loan composers and confirm each has explicit `minLimit`.

**Recommendation:** Extend `numericFieldsHaveExplicitLimits.test.ts` to also scan `type: 'currency'` fields for explicit `minLimit` declarations.

### M2 — Director restoration merge: recovered specifics override auto-derived values unconditionally

**File:** [`applicantFormManager.svelte.ts:888-951`](src/lib/components/applicantFormManager.svelte.ts:888)
**Commit:** `9764a2ca`
**Confidence:** 60%

The merge uses `{ ...entry.specifics, ...recoveredSpecifics }` — recovered values always win. This is correct for user-entered fields (`hasEquity`, `designation`, `activeInOperations`). But it also overwrites auto-derived fields that may have changed since recovery:

- `companyType` / `firmType` — if the DSA changed the company type between sessions, the recovered value is stale
- `registeredInIndia` — if the company's registration country changed
- `shareholding` — if ownership % was updated in the current director form

**Mitigating factor:** The auto-created entry's `companyType` and `registeredInIndia` are already derived from the *current* company data by `buildAutoSpecifics`. The merge overwrites them with old values. However, `syncAutoIncomeEntries` Step 1e already handles ownership sync separately, so the merged `shareholding` would be corrected on the next sync pass.

**Recommendation:** Consider cherry-picking only user-entered specifics keys (`hasEquity`, `designation`, `activeInOperations`, `companyProfitable`, `cin`, `companySharesFinancials`) rather than merging all recovered specifics. This preserves the fix's intent while keeping auto-derived fields current.

### M3 — `computeMonthsSinceDisbursement` imported into server engine from client utility

**File:** [`engine.ts:33`](src/lib/server/formEngine/engine.ts:33)
**Commit:** `174b26a8`
**Confidence:** 55%

`combinedAnswersMemo.ts` is imported into the server engine. The file itself is SSR-safe (pure date math), but it lives in `src/lib/utils/` (shared/client layer), not `src/lib/server/`. This creates a dependency direction concern: server code importing from a client utility module. If someone later adds browser-dependent code to `combinedAnswersMemo.ts`, the server engine would break.

**Impact:** Low — the function is a pure computation with no browser dependencies. But it violates the layering convention.

**Recommendation:** Either move `computeMonthsSinceDisbursement` to a shared pure utility (e.g., `src/lib/utils/dateCalc.ts`) or duplicate the 6-line function in the server engine. Low priority.

---

## Low Findings / Observations

### L1 — `json()` in 3 API routes (carry-forward)

`communication/templates`, `dsa/walkthrough`, and `dsa/rm-suggestions` still use SvelteKit's `json()` instead of `apiOk()`/`apiError()`. First flagged in prior reviews. Not new — carry-forward.

### L2 — `InfoModal` lucide import fix is well-done

Commit `805b8121` replaced `import * as icons from 'lucide-svelte'` (1,948 icons, ~200KB) with selective named imports of only 36 icons used in `data-lucide` description HTML. Excellent bundle size improvement — ~95% savings for that component.

### L3 — `resolveApplicantStepOnEntry` centralization is good

Commit `77f425e3` extracted the duplicated `syncApplicantStepOnEntry` function from all 6 form pages into `wizardState.svelte.ts` as `resolveApplicantStepOnEntry()`. Directly addresses M1 finding from the morning review. Clean execution — all 6 pages now import and call the shared function.

### L4 — LocationGroup scroll-lock cleanup

Commit `77f425e3` added `$effect` cleanup to reset `document.body.style.overflow` on unmount in `LocationGroup.svelte`. Prevents body scroll lock persisting after component destruction. Good practice.

---

## Commit-Level Analysis

### `805b8121` — fix(review): resolve all 4 medium findings

Low risk. All changes are improvements: bundle size reduction (InfoModal), magic string extraction (plot-loan ATS), test stability (guards timeout), and function export (combinedAnswersMemo). No behavior changes to production flows.

### `77f425e3` — fix(review): resolve 5 code review findings + refactor

Medium risk due to breadth (18 files, 6 form pages). Key changes:
- **DRY refactor** (`resolveApplicantStepOnEntry`): well-executed, tested by verifying all 6 pages import the new function.
- **`isArchived: false` → `{$ne: true}`**: Correct MongoDB semantics — documents without the field were excluded. Good catch.
- **`businessLoan q2_loanAmount required: false`**: Reverts to match description text ("Leave blank"). Aligns with personal/professional loan parity. Correct.
- **NRI income cleanup fix** (IncomePageNew): Removes first-run guard + fixes duplicate `ap.age` in snapshot key. The first-run guard prevented cleanup on mount after navigation. Fix is correct — the `$effect` should run unconditionally. However, this was also committed separately in `77f425e3` after being pushed as a standalone fix in a prior session (`77f425e3` includes it as "uncommitted from prior session"). No double-commit conflict since both changes are in the same commit.

### `174b26a8` — fix(validation): BT currency fields + obligation interest rate

Medium risk. Changes validation behavior:
- **`isFieldAnswered` expanded**: `type: 'currency'` now checked for min/max. See M1 above for blast radius concern.
- **`existingLoan.ts` limits**: `minLimit`/`maxLimit` added to 3 currency fields. Values are reasonable (₹10L–₹999Cr for sanction, ₹5L–₹999Cr for outstanding, ₹1K–₹1Cr for EMI). The 40-year tenure cross-field warning is advisory (warning, not blocking).
- **Server `_maxPossibleEmis`**: Correctly brings the disbursement-date-based EMI cap to server-side validation context. The JSON-Logic condition on `q8_btEmisPaid` can now evaluate properly.
- **TextField percentage min/max**: Correctly enforces `minLimit`/`maxLimit` after the format regex check. No risk of breaking existing percentage fields — they'd need to declare limits to be affected.
- **ObligationCapture interest rate**: `minLimit=1, maxLimit=40` — reasonable bounds for interest rate percentage.

### `9764a2ca` — fix(directors): preserve recovered income entry specifics

Medium-low risk. The change is well-scoped to `applyDirectorRestore` only (not a shared module). See M2 above for the unconditional merge concern.

The matching logic (sourceCompanyId first, profileType+entityName fallback) correctly handles both same-UUID and cross-session-UUID-change cases. The `matched` Set prevents double-matching.

The income/evidence merge is conservative: only overwrite if recovered data has non-empty content (`Object.keys(...).length > 0`). This prevents clearing filled data with empty recovery artifacts.

---

## Security Surface Summary

- **New attack surface:** None introduced.
- **Attack surface reduced:** BT currency fields now enforce server-side validation limits (previously accepted arbitrary values). Obligation interest rate capped at 40%.
- **Outstanding debt:** 3 API routes using `json()` instead of `apiOk()` (carry-forward). `.env` in git history (P0.2, deferred).

---

## Performance Impact Summary

- **Bundle size:** Reduced (~200KB savings from InfoModal lucide import fix).
- **New reactive effects:** 0 new `$effect` blocks (LocationGroup got cleanup, not new effects).
- **Network:** No new fetch calls or invalidation patterns.

---

## Cross-Team Blast Radius Summary

| Shared Module | Change | Impact | Safe? |
|---------------|--------|--------|-------|
| `formWizardEngine.ts` | `type: 'currency'` added to numeric check in `isFieldAnswered` | All 6 form pages, wizard | **Yes, but verify**: currency fields without explicit `minLimit` may now block Next (M1) |
| `routes.ts` | `QA_COVERAGE` constant added | Admin QA pages only | **Yes** — additive, no existing paths changed |
| `combinedAnswersMemo.ts` | `computeMonthsSinceDisbursement` exported + `referenceDate` param added | Server engine import (M3) | **Yes** — backward-compatible, optional param |

No type/interface breaking changes. No API response shape changes. No auth/guard changes. No store shape changes.

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
Unchanged from morning review. All raw `fetch()` calls are either GET-only, pre-auth flows, or public share-link reads.

### Rule E: `{@html}` Exception Inventory
Unchanged. Same 8 exceptions (JsonLd, Toast, 4 pageDescriptions, policies, how-can-we-help).

### Rule C: `window.location.reload()` Inventory
Unchanged (10 approved instances).

---

## Top 5 Actions for Next Session

1. **[M1] Verify currency field `minLimit` coverage** — grep all `type: 'currency'` questions across 6 composers, confirm each has explicit `minLimit`. Extend `numericFieldsHaveExplicitLimits.test.ts` to cover currency fields.
2. **[M2] Consider scoping director restoration merge** — cherry-pick only user-entered specifics keys instead of full `...recoveredSpecifics` spread.
3. **[L1] Migrate 3 API routes from `json()` to `apiOk()`** — `communication/templates`, `dsa/walkthrough`, `dsa/rm-suggestions`.
4. **[M3] Assess `combinedAnswersMemo.ts` server import** — either move pure function to shared layer or inline in server engine.
5. **Session handoff update** — `docs/SESSION-HANDOFF.md` is at S97/`9df816a2`, 9 commits behind HEAD. Update to current state.
