# Daily Code Review — 2026-05-14 — Standard Sweep

**Scope:** 13 commits `3b349d06..d0160eba` across sessions S98-S100. All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-13-c.md`](CODE-REVIEW-2026-05-13-c.md) — reviewed through `3b349d06`.

**Contrast audit:** 456/456 pairs pass ([`CONTRAST-AUDIT-2026-05-14.md`](CONTRAST-AUDIT-2026-05-14.md)).

**Review profile:** Standard (T1-T6, T9). DX-5 migration (43 routes) warranted extra spot-check coverage on auth guard correctness.

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — **improved** (was 2 errors in prior review) |
| `pnpm test:unit -- --run` | 112 files, **10,568 tests** — all pass (unchanged count) |
| `pnpm test:contrast` | **456/456 pairs pass** |
| `git log --since='1 week' ... \| co-authored-by` | 1 false positive (rule discussion text in commit body, not a trailer) |
| `numericFieldsHaveExplicitLimits` test | All pass |

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `b171d318` | fix(ssr): add isomorphic-dompurify chain to ssr.noExternal for Vercel | 2 | +28/−3 |
| `61822c91` | fix(review): resolve 8 enterprise-review findings (C1 H1 H2 M1-M3 M5 L3) | 18 | +674/−181 |
| `7d23f73b` | feat(meta): bootstrap session-lifecycle system + architecture-evolution roadmap | 11 | +3,663/−3 |
| `877452b1` | docs(handoff): S98 session updates | 4 | +81/−4 |
| `9cf77e11` | fix(security): server-side tier validation + correct error codes in lock routes | 6 | +66/−23 |
| `801bc178` | feat(dx): CI quality gates in pre-push hook + Vercel build command (DX-1) | 2 | +32/−0 |
| `8f3f238f` | docs(handoff): S99 session updates | 4 | +79/−55 |
| `129f7852` | perf(bundle): eliminate pincode client chunk (PERF-4) + lazy reverse index (PERF-5) | 6 | +89/−48 |
| `5b823d21` | feat(observability): forward SvelteKit-caught client errors to /api/errors/report (OBS-1) | 1 | +70/−0 |
| `bc9f77e7` | refactor(auth): migrate 12 routes — DX-5 batch 1 | 12 | +49/−68 |
| `0fc64f99` | refactor(auth): migrate 8 case routes — DX-5 batch 2 | 8 | +36/−60 |
| `0e3c6304` | refactor(auth): migrate 23 routes — DX-5 batch 3 | 23 | +95/−162 |
| `d0160eba` | docs(handoff): S100 session updates + ADR-0004 | 5 | +161/−9 |

Total: 102 files changed, +5,123/−616. Dominated by docs/lifecycle bootstrapping (+3,663) and review fixes (+674).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **H1** — `'timed_out'` not in `E2eTestRun.status` union | **RESOLVED** ✅ | [`e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32) — type union now includes `'timed_out'`. `pnpm check` 0 errors. |
| **H2** — Lock routes lack role guard + rate limiting | **RESOLVED** ✅ | Both [`lock/+server.ts`](src/routes/api/cases/[case_id]/lock/+server.ts) and [`unlock-and-relock/+server.ts`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts) now have `requireRoleApi(locals, 'dsa')`, `requireTeamPermission`, `blockDemoWrite`, and `rateLimit()`. |
| **H3** — Lock routes use `json()` instead of `apiOk()` | **MOSTLY RESOLVED** ✅ | All responses use `apiOk()`/`apiError()`/`apiServerError()` except the 402 quota-exhausted response, which carries structured data (`consumed`/`total`/`can_topup`) that `apiError()` can't express. Documented inline. Acceptable. |
| **H4** — Client-supplied `tier` trusted for billing | **RESOLVED** ✅ | Both routes now fetch tier via `DsaApplications.findOne()`. `tier` removed from Zod request schemas. |
| **M1** — TOCTOU gap in enterprise overage | **ACKNOWLEDGED** | Warning comment added in [`daQuota.ts:194`](src/lib/server/billing/daQuota.ts:194). Acceptable for beta (single-user DSA accounts). |
| **M2** — Misleading `'not_doc_upload_mode'` reason on missing case | **RESOLVED** ✅ | `'case_not_found'` added to both result type unions and operation functions in [`operations.ts`](src/lib/server/caseLock/operations.ts) and [`types.ts`](src/lib/server/caseLock/types.ts). |
| **M3** — `check-dsa/+server.ts` uses `json()` | **Carry-forward** | Not touched in this review period. |
| **L5** — `json()` carry-forward (7 routes) | **Carry-forward** | Down to 5 non-lock routes using `json()` exclusively (lock routes now hybrid). DX-5 did not change response helpers, only auth guards. |

---

## Standing Grep Rules — Full Tier 1-6, T9 Sweep

| Rule | Tier | Result | Delta vs prior (May 13-c) |
|------|------|--------|------|
| **A** — CSRF: raw `fetch()` + POST | T1 | Same known-safe inventory. New `fetch('/api/location/cities')` in 2 onboarding components is GET-only — safe. New `fetch('/api/errors/report')` in `hooks.client.ts` is POST but justified (error reporting endpoint, no CSRF needed, documented inline). | +2 GET (safe), +1 POST (justified) |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same exception sites (pageDescription, JsonLd, Toast, admin policies, NoteWorthyMessage). | Unchanged |
| **E2** — Dynamic attribute XSS | T1 | Not triggered. | — |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` fallback (2 lines) + 2 commented-out in auth. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | 1 false positive — text in commit body discusses the *rule about* Co-Authored-By, not an actual trailer. **0 real violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | 0 in non-test files. Test file matches are fixture data (auth schemas, billing tests). | Unchanged |
| **SEC-2** — PII in logging | T1 | No new logger calls with PII terms. | Unchanged |
| **SEC-3** — Cookie security | T1 | No new `cookies.set` sites in today's commits. All existing sites have `httpOnly`+`secure`+`sameSite`. | Unchanged |
| **SEC-4** — eval/exec/child_process | T1 | 2 known-safe instances (`e2e-runs`, `run-vitest`). | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY`. No `$env/*/private` in `.svelte`. | Unchanged |
| **SEC-6** — Rate limiting coverage | T1 | **Prior H2 resolved** — both lock routes now have rate limiting. New `/api/location/cities` lacks rate limiting (see M1 below). | **−2 fixed, +1 new** |
| **SEC-7** — Client storage PII | T1 | Same inventory. `hooks.client.ts` uses `sessionStorage` for chunk-reload flag only (timestamp, no PII). | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches.** | Unchanged |
| **C** — `window.location.reload()` | T2 | **12 instances** (was 10). +2 new: `(app)/+error.svelte:54`, `dashboard/+error.svelte:64`. Both use `browser` guard. `hooks.client.ts:106` is client-only by design. All safe. | **+2 (safe)** |
| **D** — Async Capacitor proxy return | T2 | **0 matches.** | Unchanged |
| **I** — `typeof window !== 'undefined'` | T2 | **0 matches.** | Unchanged |
| **J** — Module-scope `fetch` | T2 | **0 matches.** | Unchanged |
| **SSR-1** — Hydration mismatch sources | T2 | Not triggered. | — |
| **H1** — `state_referenced_locally` | T3 | **0 warnings.** `pnpm check` clean. 115 properly suppressed instances across 52 files. | **Improved** (was 2 errors) |
| **K** — JSON-Logic `!=` in config | T3 | Not re-scanned (no form config changes). | Unchanged |
| **L** — Numeric `minLimit` test | T3 | All pass. | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — WCAG AA contrast | T3 | **456/456 pass.** | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | `hooks.client.ts` has 2 intentionally empty catches (error reporting best-effort). Documented. | +2 (justified) |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | 0 in non-test files. 5 in test fixtures (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | **3 error boundaries** now: root `+error.svelte`, `(app)/+error.svelte` (new), `dashboard/+error.svelte` (new). | **Improved** (was 1) |
| **CQ-5** — TODO/FIXME/HACK count | T3 | **16 across 7 files.** | **Improved** (was 35 across 13) |
| **P** — Auto-clear parity (6 pages) | T4 | **6 files matched** — correct parity. | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **PH-1** — Security headers | T5 | All 6 headers present in `hooks.server.ts`. | Unchanged |
| **PH-3** — API response consistency (`json()` usage) | T5 | Lock routes: down from 100% `json()` to 1 justified call (402). Carry-forward: auth, walkthrough, rm-suggestions, communication/templates, appliedApplication, check-dsa still use `json()`. | **Improved** |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 matches.** | Unchanged |
| **PERF-1** — `import *` | T6 | 2 known instances (`json-logic-js`, `@mediapipe/face_detection`). | Unchanged |
| **BLAST-1** — Shared module changes | T9 | **3 files:** `hooks.client.ts` (new), `engineContext.ts` (refactored), `vite.config.ts` (noExternal). See blast radius analysis. | **Reviewed below** |
| **BLAST-2** — Type/interface changes | T9 | `e2eTestRun.ts` — `'timed_out'` added to status union. `case.ts` — additive type additions. No breaking changes. | Clean |

---

## New Findings

### M1 — `/api/location/cities` endpoint lacks rate limiting

**File:** [`location/cities/+server.ts`](src/routes/api/location/cities/+server.ts)
**Introduced by:** `129f7852`
**Confidence:** 75%

The new city list endpoint has no auth guard and no rate limiting. Since it returns public reference data (city names from a static JSON dataset), no auth is correctly omitted (needed by onboarding flows pre-auth). However, the absence of rate limiting means it can be hammered at arbitrary rate. The endpoint is cheap (pre-computed lists at module scope, ~941 bytes response), so the blast radius is low, but a rate limit would be consistent with project conventions.

**Recommendation:** Add a lightweight IP-based rate limit (`maxRequests: 60, windowMs: 60_000`). Low priority.

### M2 — Lock routes still import `json` from `@sveltejs/kit` alongside `apiOk`/`apiError`

**Files:**
- [`lock/+server.ts:30`](src/routes/api/cases/[case_id]/lock/+server.ts:30)
- [`unlock-and-relock/+server.ts:33`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts:33)

**Introduced by:** `61822c91` (retained from `3b349d06`)
**Confidence:** 100%

Both lock routes import both `json` and `apiOk`/`apiError`/`apiServerError`. The single `json()` usage is for the 402 quota-exhausted response which carries structured data (`consumed`, `total`, `can_topup`). This is documented with an inline comment. However, the proper fix would be to add an `apiStructuredError()` helper to `apiResponse.ts` that supports arbitrary JSON payloads, then remove the `json` import entirely.

**Impact:** Low. Convention debt, not a bug.

### L1 — `hooks.client.ts` error reporting uses `fetch` (not `secureFetch`) for POST

**File:** [`hooks.client.ts:73`](src/hooks.client.ts:73)
**Introduced by:** `5b823d21`
**Confidence:** 100%

Intentionally uses raw `fetch` instead of `secureFetch` for the POST to `/api/errors/report`. The inline comment explains why: the endpoint is authenticated by IP rate limiting only, not by CSRF. This is architecturally correct — error reporting must work even when the CSRF token setup has failed (which itself could be the error being reported). **Not a violation — documenting for inventory.**

### L2 — Pre-push hook runs full test suite on every push

**File:** [`.husky/pre-push`](.husky/pre-push)
**Introduced by:** `801bc178`
**Confidence:** 100%

The pre-push hook runs `pnpm check` + `pnpm test:unit -- --run --reporter=basic` on every push. With 10,568 tests, this adds ~25-30 seconds to every push. The admin bypass (`SKIP_PUSH_GUARD=1`) exists for urgent pushes. This is a conscious trade-off (DX-1 was motivated by commit `c0cf8e18` shipping with 2 type errors). Acceptable.

### L3 — Error boundaries use `clientLogger` instead of `reportToServer`

**Files:**
- [`(app)/+error.svelte:41`](src/routes/(app)/+error.svelte:41)
- [`dashboard/+error.svelte`](src/routes/dashboard/+error.svelte)

**Introduced by:** `61822c91`
**Confidence:** 80%

Both new error boundaries use `clientLogger.error()` for error logging. `hooks.client.ts` (OBS-1) uses `reportToServer()` which sends to `/api/errors/report`. These are two independent reporting paths — `clientLogger` logs to console while `reportToServer` emails the team. Since `HandleClientError` in `hooks.client.ts` fires for the same errors that trigger the error boundary render, the email path IS covered. The `clientLogger` in the error boundary adds console visibility for debugging. **Not a gap — documenting for clarity.**

### L4 — DX-5 migration quality: consistent, well-scoped

The DX-5 batch 1-3 commits (`bc9f77e7`, `0fc64f99`, `0e3c6304`) migrated 43 routes from inline `if (!locals.user)` checks to `requireAuthApi(locals)`. Spot-checked 5 routes across all 3 batches:

- Pattern is consistent: `const denied = requireAuthApi(locals); if (denied) return denied;`
- `locals.user!` non-null assertion used at subsequent use sites (correct — the guard ensures non-null)
- Layout files intentionally excluded (returns `{ user: null }` for landing pages, or redirects to login)
- One page-load route (`timeline/+page.server.ts`) correctly uses `requireAuth(locals)` (throw variant for page loads)

No issues found. The migration is clean and complete.

---

## Commit-Level Analysis

### `b171d318` — fix(ssr): add isomorphic-dompurify chain

**Risk:** Low. Additive-only change to `vite.config.ts` and CLAUDE.md.

**Assessment:** Correct. The `isomorphic-dompurify → jsdom → html-encoding-sniffer → @exodus/bytes` chain added to `noExternal` addresses a CJS→ESM crossing that only manifests on Vercel (Pitfall #7). CLAUDE.md updated with the new chain and verification steps.

### `61822c91` — fix(review): resolve 8 enterprise-review findings

**Risk:** Medium (touches lock routes, auth state, error boundaries, types).

**Strengths:**
- Resolves H1 (type error), H2-H4 (lock route security), M1-M3, L3 from prior review.
- New error boundaries at `(app)` and `dashboard` route groups — good coverage improvement.
- Dead services archived (`authService.ts`, `sessionService.ts`, `clientSession.ts`).
- `auth.svelte.ts` simplified from ~120 lines to ~27 lines (dead session management removed).
- Director auto-income test coverage expanded with 134 new lines.

**No issues found.** Comprehensive fix commit.

### `9cf77e11` — fix(security): server-side tier validation

**Risk:** Medium (billing/security logic).

**Assessment:** Correctly adds `requireRoleApi('dsa')`, rate limiting, and server-side tier lookup to both lock routes. Removed `tier` from Zod schemas. `case_not_found` reason code added. Test expectations updated. Clean fix that directly addresses the most critical prior findings (H2, H4, M2).

### `801bc178` — feat(dx): CI quality gates

**Risk:** Low (new files only — `.husky/pre-push`, `vercel.json`).

**Assessment:** Well-structured pre-push hook with layered checks: divergence → linear history → type-check → tests. Admin bypass via env var. Vercel build command adds `pnpm check` gate before `pnpm build`. Both changes are purely additive and correctly scoped.

### `129f7852` — perf(bundle): eliminate pincode client chunk

**Risk:** Medium (touches shared `engineContext.ts`, new API endpoint, onboarding components).

**Strengths:**
- `/api/location/cities` is clean: pre-computed lists at module scope, correct dataset selection via query param.
- `engineContext.ts` lazy-build pattern mirrors the existing `all`-source pattern — consistent.
- Onboarding components correctly fetch on mount with error handling.

**Issues:**
- New endpoint lacks rate limiting (see M1). Low risk since data is static and response is tiny.

### `5b823d21` — feat(observability): hooks.client.ts (OBS-1)

**Risk:** Medium (new client-side error reporting, touches every error path).

**Strengths:**
- `isReportable()` noise filter is comprehensive: browser extensions, third-party scripts, ServiceWorker, ResizeObserver.
- `sendBeacon`-first delivery survives page unload — correct for error reporting.
- Dev mode skipped — no email noise during development.
- All error paths wrapped in try/catch — reporting failure can't cascade.
- Documented justification for using raw `fetch` instead of `secureFetch`.

**No issues found.** Clean implementation that closes the OBS-1 gap.

### `bc9f77e7` + `0fc64f99` + `0e3c6304` — DX-5 auth migration (batches 1-3)

**Risk:** Medium (43 route files changed). Mitigated by mechanical nature of the change.

**Assessment:** Consistent pattern applied across all 43 routes. Guard import, early return, non-null assertion. No behavioral changes beyond auth enforcement. Spot-checks across all 3 batches confirm correctness. Layout exclusions are intentional and documented. See L4 above.

### `d0160eba` — docs(handoff): S100 session updates + ADR-0004

**Risk:** None (docs only).

**Assessment:** ADR-0004 documents the decision to use email-based error reporting over Sentry. Handoff, changelog, plan, and evolution docs updated. Clean.

---

## Security Surface Summary

- **Attack surface reduced:** 43 routes upgraded from inline auth checks to canonical guard functions (DX-5). Guards are battle-tested and consistent.
- **Prior security findings resolved:** Lock routes now have proper role enforcement, rate limiting, and server-side tier validation (H2, H4 from May 13-c).
- **New attack surface:** `/api/location/cities` (GET, no auth, no rate limit — public static data), `/api/errors/report` now receives client-side errors (already had rate limiting).
- **Outstanding debt:** `.env` in git history (P0.2, deferred). Enterprise overage TOCTOU (M1 from May 13-c, accepted for beta).

---

## Performance Impact Summary

- **Bundle size improved:** PERF-4 removed 763 KB pincode JSON from client bundle. PERF-5 reduced `engineContext.js` server chunk by 99.6% (1,607 KB → 6.23 KB).
- **New reactive effects:** 0 in today's commits.
- **Network:** 2 new `fetch('/api/location/cities')` calls in onboarding (mount-time, ~941 bytes response). 1 new `sendBeacon`/`fetch` call on client errors (fire-and-forget).
- **Pre-push hook:** Adds ~25-30s to every push (type-check + test suite). Acceptable trade-off.

---

## Cross-Team Blast Radius Summary

| Shared Module | Change | Impact | Safe? |
|---------------|--------|--------|-------|
| `hooks.client.ts` (new) | OBS-1: error reporting pipeline | Every client-side SvelteKit error now reported to server | **Yes** — fire-and-forget, wrapped in try/catch, can't cascade |
| `engineContext.ts` | PERF-5: lazy-build reverse index | First call per function instance pays ~50ms | **Yes** — cached thereafter, same API surface |
| `vite.config.ts` | `noExternal` extended with isomorphic-dompurify chain | SSR bundling | **Yes** — additive, fixes existing Vercel 500 |
| `e2eTestRun.ts` | Added `'timed_out'` to status union | Any code reading `status` now sees the new variant | **Yes** — additive, no existing code breaks |
| `case.ts` | Additive type additions | New types for lock operations | **Yes** — additive only |
| 43 API routes | `requireAuthApi` guard migration | Auth enforcement path | **Yes** — same behavior, canonical guard |

No breaking type/interface changes. No API response shape changes. No store shape changes. No route constant changes.

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
- **Added:** `hooks.client.ts:73` — POST to `/api/errors/report` (intentionally no CSRF — error reporting, documented)
- **Added:** `AboutYou.svelte:17`, `DSADetails.svelte:19` — GET `/api/location/cities` (safe, GET-only)

### Rule E: `{@html}` Exception Inventory
Unchanged. Same approved exceptions.

### Rule C: `window.location.reload()` Inventory
- **Added:** `(app)/+error.svelte:54` — guarded by `browser`
- **Added:** `dashboard/+error.svelte:64` — guarded by `browser`
- **Added:** `hooks.client.ts:106` — client-only file by design
- Total: **12 instances** (was 10).

### Rule CQ-4: Error Boundary Inventory
- `src/routes/+error.svelte` — root (existing)
- `src/routes/(app)/+error.svelte` — app group (new)
- `src/routes/dashboard/+error.svelte` — dashboard group (new)
- Total: **3 boundaries** (was 1). **Improved.**

### Rule SEC-4: Known `exec()` Sites
Unchanged. 2 known-safe (`e2e-runs`, `run-vitest`).

---

## Top 5 Actions for Next Session

1. **[M1] Add rate limiting to `/api/location/cities`** — consistent with project conventions. Low priority but quick win.
2. **[M2] Consider `apiStructuredError()` helper** for the 402 quota-exhausted response shape, allowing lock routes to fully drop the `json` import. Convention cleanup.
3. **[Carry-forward] Migrate remaining `json()` routes** — `check-dsa`, `communication/templates`, `dsa/walkthrough`, `dsa/rm-suggestions`, `appliedApplication` still use SvelteKit's `json()` exclusively.
4. **[M1 from May 13-c, carry-forward] Enterprise overage TOCTOU** — acceptable for beta, needs idempotency guard before production scale.
5. **[Verification] PERF-4 + OBS-1 production proof** — visually verify onboarding city dropdown works post-deploy; trigger a test error to confirm email alert pipeline.

---

## Addendum — S101 Post-S100 Form Fix Review (commit `80496866`)

**Scope:** Single commit reviewed after the main S98-S100 sweep — `80496866` "fix(form): personal loan location wording, modal dropdown clipping, DC joint(2) trap". 10 files changed, +260/−37. Authored Thu May 14 19:18:20 2026 +0530.

**Why a separate addendum:** The S98-S100 review captured through `0e3c6304`; `80496866` shipped after and produced 3 new CLAUDE.md pitfalls (#16, #17, #18) plus their pre-flight greps. Worth verifying the form-fix didn't leave systemic instances unfixed elsewhere in the codebase.

### Commands Executed

| Command | Result |
|---------|--------|
| `git show --stat 80496866` | 10 files changed (form pages, schema, components, CLAUDE.md) |
| Pitfall #16 grep — `Residence/Loan Processing/Business Location` across `src/lib/config` | 29 files matched — verified consistent per loan type |
| Pitfall #17 grep — `position: absolute` in `src/lib/components` | 41 hits, 3 real popover candidates beyond the fixed CustomSelect |
| Pitfall #18 grep — `loanVariant` in `incomeTabState.ts` + form routes | 21 files matched — verified case-level flag flows correctly |
| `pnpm audit --prod` | **7 vulns** (1 low + 6 moderate) — unchanged from S100, no new patches |

### Commit Content — `80496866` review

**Risk:** Low-medium. Three independent fixes for three pitfall patterns, each scoped to the smallest necessary surface.

**Strengths:**
- Each fix added a corresponding pre-flight grep to CLAUDE.md §4 and a numbered pitfall to §3 — the institutional-memory discipline is being honored
- `CustomSelect.svelte` `position: fixed` migration includes a capture-phase scroll/resize listener (`window.addEventListener('scroll', reposition, true)`) — correctly handles nested scrollable ancestors, not just `window`
- DC joint(2) fix correctly identifies the bug as case-level vs per-applicant — the `caseHasDcClosure` flag is computed once at page level and passed into per-applicant checkers. No replication.
- Personal Loan wording fix changed all 4 surfaces in lockstep: question text, description override, page title (fresh + DC), wizard sidebar (fresh + DC)

**Verification of systemic reach:**

- **Pitfall #16 — Business/Professional Loan wording drift?** ✅ **Clean.** Business Loan: "Business Location" consistent across `questionBank/location.ts`, `pages.ts:110/121`, and wizard sidebar. Professional Loan: "Practice Location" consistent across `questionBank/location.ts`, `pages.ts:103/114`, and `wizardSections/professionalLoan.ts:202/618/639/642`. Personal Loan was the only one that drifted because it was the only one where the question was *repurposed* (residence → loan processing); Business/Professional locations are natively about the business/practice and never repurposed.
- **Pitfall #18 — Same DC trap on secured loans (home/lap/plot)?** ✅ **Already covered transitively.** Home Loan, LAP, and Plot Loan `+page.svelte` files have `incomeValueCheck` that reads `__completion` per applicant. The `__completion` flag is computed by `IncomePageNew.svelte:1607-1623` via `getCompletionOptionsFor(applicant)`, which already includes `caseHasDcClosure` (line 656). Secured loans route through `IncomePageNew`, so the case-level fix applies. The unsecured-loan page-level changes were needed because `ApplicantFormUnsecured` is a separate path that bypasses `IncomePageNew`. Fix is correctly scoped.

### New Finding — N1 (latent, deferred)

#### N1 — Pitfall #17 pattern present in 3 other custom-select components

**Files:**
- [`ApplicantSelect.svelte:528`](src/lib/components/ApplicantSelect.svelte:528) — `.app-select-dropdown-wrapper { position: absolute; left: 0; right: 0; z-index: 100; ... }`
- [`BooleanSelect.svelte:429`](src/lib/components/BooleanSelect.svelte:429) — `.custom-bool-select-dropdown { position: absolute; left: 0; right: 0; z-index: 100; ... }`
- [`NewSelect.svelte:466`](src/lib/components/NewSelect.svelte:466) — `.new-select-dropdown { position: absolute; left: 0; right: 0; z-index: 100; ... }`

**Confidence:** 100% on pattern presence; **30% on user-visible manifestation** — depends on whether each is rendered inside a modal/dialog/sticky-overflow ancestor in any live flow.

All three components implement the same pattern that `CustomSelect.svelte` exhibited pre-fix: a button-relative dropdown positioned with `position: absolute` and `left/right: 0`. If any of these components is rendered inside an ancestor with `overflow: auto | hidden | clip` (Modal body, sticky panel, dialog scroll region), the dropdown will be clipped at the ancestor's edges — exactly the bug the commit fixed in `CustomSelect`.

`ApplicantSelect` is at minimum used in `BasicInfoFields.svelte`, `BasicInfoUnsecureLoan.svelte`, and `GPAOfNriApplicant.svelte` — components that themselves render inside the multi-applicant editor (`DirectorFormModal`, `ApplicantFormSecured`, `ApplicantFormUnsecured`). `BooleanSelect` and `NewSelect` usage not surveyed.

**Recommendation:** Defer to a dedicated follow-up session. Migrate all three to the canonical pattern from `CustomSelect.svelte` (position: fixed + `getBoundingClientRect()` + capture-phase scroll/resize listener). Bundling here would expand the session scope by 3 component refactors; cleaner as a focused commit.

**Priority:** P2 — bug is latent, not reported by users. The form-fix commit established the canonical pattern; replicating to the other 3 is mechanical.

### Other Verifications (clean)

- **CLAUDE.md additions** — 3 new pitfalls (#16, #17, #18) follow the documented template (wrong→right→root cause→detection→grep). 3 new pre-flight greps added to §4. Verification dates set to 2026-05-14.
- **Test suite** — Commit message states 10,568 / 10,568 passing. Not re-run (cached, S100 baseline).
- **Type check** — Commit message states 0 errors, 0 warnings. Not re-run.
- **Co-Authored-By** — 0 trailers in commit body. ✅
- **No console.log/warn/error** added — verified by review of changed files.
- **No raw `fetch` for state-changing requests** — verified, no fetch calls added.

### S101 Outstanding Items (for fix-pass)

Carrying forward from main S98-S100 review:
- **M1** — Rate limit on `/api/location/cities` (still open)
- **M2** — `apiStructuredError()` helper to drop `json` import from lock routes (still open)

New from this addendum:
- **N1** — Pitfall #17 pattern in ApplicantSelect / BooleanSelect / NewSelect (latent, deferred to follow-up session)

**S101 scope decision:** fix M1 + M2 only in this session. N1 is latent (no reported user-facing manifestation) and bundling 3 component refactors would expand scope beyond the focused S101 close.
