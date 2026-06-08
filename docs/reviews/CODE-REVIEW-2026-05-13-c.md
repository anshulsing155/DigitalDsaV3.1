# Daily Code Review — 2026-05-13 (c) — Standard Sweep

**Scope:** 3 commits `9764a2ca..3b349d06` (2026-05-13 evening, after afternoon review cutoff). All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-13-b.md`](CODE-REVIEW-2026-05-13-b.md) — reviewed through `9764a2ca`.

**Contrast audit:** [`CONTRAST-AUDIT-2026-05-13.md`](CONTRAST-AUDIT-2026-05-13.md) — 456/456 pairs pass (unchanged, carried forward).

**Review profile:** Standard (T1-T6, T9). Elevated to include deep commit review on `3b349d06` (4,429 LOC new feature — case-lock + billing).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **2 errors**, 0 warnings — **regression** (was 0 errors in prior review) |
| `pnpm test:unit -- --run` | 112 files, **10,564 tests** — all pass (+132 from prior 10,432) |
| `pnpm test:contrast` | 456/456 pairs pass (carried forward, unchanged) |
| `git log --since='1 week' ... \| co-authored-by` | 0 matches |
| `numericFieldsHaveExplicitLimits` test | All pass (currency fields now covered) |

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `c0cf8e18` | fix(reliability): eliminate silent failures in 12 fire-and-forget DB operations | 7 | +295/−74 |
| `8e80e73f` | fix(review): resolve M1 + M2 findings from enterprise code review | 16 | +86/−13 |
| `3b349d06` | feat: port case-lock + DA billing modules from parser worktree | 18 | +4,429/−0 |

Total: 41 files changed, +4,810/−87.

---

## Standing Grep Rules — Full Tier 1-6, T9 Sweep

| Rule | Tier | Result | Delta vs prior (May 13 afternoon) |
|------|------|--------|------|
| **A** — CSRF: raw `fetch()` + POST | T1 | Same known-safe inventory. No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same exception sites. | Unchanged |
| **E2** — Dynamic attribute XSS | T1 | Not triggered. | — |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` fallback (2 lines) + 2 commented-out in auth. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | 0 in non-test files. Test file matches are fixture data. | Unchanged |
| **SEC-2** — PII in logging | T1 | No new logger calls with PII terms. | Unchanged |
| **SEC-3** — Cookie security | T1 | **New cookies.set sites in check-dsa/+server.ts** (commit `c0cf8e18` expanded). All have `httpOnly`+`secure`+`sameSite`. Compliant. | +12 sites (all safe) |
| **SEC-4** — eval/exec/child_process | T1 | 2 known-safe instances + 1 regex.exec (not a vuln). | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY`. No `$env/*/private` in `.svelte`. | Unchanged |
| **SEC-6** — Rate limiting coverage | T1 | **2 new unprotected mutating endpoints** — see H2. | **+2 new** |
| **SEC-7** — Client storage PII | T1 | Same inventory. No PII in localStorage/sessionStorage. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches.** | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 approved instances. | Unchanged |
| **D** — Async Capacitor proxy return | T2 | **0 matches.** | Unchanged |
| **I** — `typeof window !== 'undefined'` | T2 | **0 matches.** | Unchanged |
| **J** — Module-scope `fetch` | T2 | **0 matches.** | Unchanged |
| **SSR-1** — Hydration mismatch sources | T2 | Not triggered. | — |
| **H1** — `state_referenced_locally` | T3 | **0 warnings** (but `pnpm check` fails on type errors — see H1 finding). | **Regression** |
| **K** — JSON-Logic `!=` in config | T3 | 346 / 43 files. | Unchanged |
| **L** — Numeric `minLimit` test | T3 | All pass. Currency fields now covered (commit `8e80e73f`). | Improved |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — WCAG AA contrast | T3 | **456/456 pass.** | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 matches.** | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | 0 in non-test files. 5 in test fixtures (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | 1 file (`+error.svelte` at root only). | Unchanged |
| **CQ-5** — TODO/FIXME/HACK count | T3 | **35 across 13 files.** | Unchanged |
| **P** — Auto-clear parity (6 pages) | T4 | **6 files matched** — correct parity. | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **PH-1** — Security headers | T5 | All 6 headers present in `hooks.server.ts`. | Unchanged |
| **PH-3** — API response consistency | T5 | `json()` used in 3 legacy routes + **2 new routes** (case lock endpoints). See H3. | **+2 new** |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 matches.** | Unchanged |
| **PERF-1** — `import *` | T6 | 2 known instances (`json-logic-js`, `@mediapipe/face_detection`). | Unchanged |
| **BLAST-1** — Shared module changes | T9 | **2 files:** `hooks.server.ts`, `mongo.ts`. See blast radius analysis. | New — reviewed |
| **BLAST-2** — Type/interface changes | T9 | **1 new type file** (`monthlyAssessmentUsage.ts`). Additive — no breaking changes. | Clean |

---

## High-Priority Findings

### H1 — `pnpm check` regression: `'timed_out'` not in `E2eTestRun.status` union

**File:** [`e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32)
**Introduced by:** `c0cf8e18`
**Confidence:** 100%
**Impact:** Build-breaking — `pnpm check` fails with 2 errors

The `E2eTestRun.status` type is `'pending' | 'running' | 'page_filling' | 'completed' | 'failed'`. Commit `c0cf8e18` added `'timed_out'` as a new status value in `e2e-runs/+server.ts` (lines 201 and 240) without updating the type definition.

**Fix:** Add `'timed_out'` to the status union in [`e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32):
```ts
status: 'pending' | 'running' | 'page_filling' | 'completed' | 'failed' | 'timed_out';
```

### H2 — Case lock routes lack role guard + rate limiting — billing bypass risk

**Files:**
- [`cases/[case_id]/lock/+server.ts:60-62`](src/routes/api/cases/[case_id]/lock/+server.ts:60)
- [`cases/[case_id]/unlock-and-relock/+server.ts:63-66`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts:63)

**Introduced by:** `3b349d06`
**Confidence:** 95%

Two related issues in the new case lock API routes:

**a) Missing `requireRoleApi('dsa')`:** Both routes use a bare `if (!locals.user)` check + `requireTeamPermission(locals, 'cases_edit')`. However, `requireTeamPermission` does not enforce the DSA role — an RM with `cases_edit` permission could call these endpoints and consume DA quota belonging to the DSA. The `da-topup` route in the same commit correctly uses `requireRoleApi(locals, 'dsa')`.

**b) No rate limiting:** Neither route calls `rateLimit()`. Since these endpoints consume billable DA quota, an attacker (or a client bug loop) could repeatedly lock/unlock-relock a case, exhausting monthly quota instantly. The idempotency guard only protects against re-locking the same fingerprint — it does not prevent repeated unlock-and-relock cycles.

**Fix:** Add `requireRoleApi(locals, 'dsa')` as the first guard and `rateLimit(ip, { identifier: 'case-lock:${userId}', maxRequests: 10, windowMs: 60_000 })` at the top of both handlers.

### H3 — Case lock routes use `json()` instead of `apiOk()`/`apiError()` — convention violation

**Files:**
- [`cases/[case_id]/lock/+server.ts`](src/routes/api/cases/[case_id]/lock/+server.ts) — lines 30, 62, 78, 111-143, 147
- [`cases/[case_id]/unlock-and-relock/+server.ts`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts) — lines 33, 66, 82, 113-150

**Introduced by:** `3b349d06`
**Confidence:** 100%

Both handlers import `{ json } from '@sveltejs/kit'` and use it for every response. This violates CLAUDE.md §15 (all API routes must use `apiOk()`/`apiError()`/`apiServerError()`). The `da-quota` and `da-topup` routes in the same commit are compliant — only the lock routes diverge.

**Fix:** Replace all `json(...)` calls with the canonical response helpers.

### H4 — Client-supplied `tier` trusted without server-side cross-check — quota bypass

**Files:**
- [`cases/[case_id]/lock/+server.ts:101`](src/routes/api/cases/[case_id]/lock/+server.ts:101)
- [`cases/[case_id]/unlock-and-relock/+server.ts:105`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts:105)

**Introduced by:** `3b349d06`
**Confidence:** 88%

The `tier` field from the request body is Zod-validated as `z.enum(['basic_da', 'pro_da', 'enterprise_da'])` but its value is trusted for billing decisions (whether overage is allowed). A DSA on `basic_da` could POST `tier: 'enterprise_da'` and bypass the hard quota cap. The `da-topup` route correctly reads the tier from the database (`DsaApplications.findOne(...)`).

**Fix:** After `resolveEffectiveDsaId`, fetch the DSA's actual subscription tier from the database and discard the client-supplied value.

---

## Medium Findings

### M1 — Enterprise overage path in `consumeQuota` has a TOCTOU gap

**File:** [`daQuota.ts:193-218`](src/lib/server/billing/daQuota.ts:193)
**Introduced by:** `3b349d06`
**Confidence:** 85%

The normal quota path is genuinely atomic (the `$expr` gate in `findOneAndUpdate` prevents double-consumption). However, the enterprise overage fallback (lines 193-218) is a second unconditional `findOneAndUpdate` with no guard — it runs whenever the first update finds no slot. Two concurrent requests that both fail the `$expr` gate will both enter the overage branch, resulting in 2 overage charges for what should be 1 lock.

**Impact:** Under high concurrency on a busy `enterprise_da` account, this can over-bill. Low probability in beta (single-user DSA accounts), but incorrect by design.

**Recommendation:** Add an idempotency guard (e.g., case-fingerprint dedup) to the overage path, or log a warning for future hardening.

### M2 — `unlockAndRelockCase` returns misleading reason code on missing case

**File:** [`operations.ts:173`](src/lib/server/caseLock/operations.ts:173)
**Introduced by:** `3b349d06`
**Confidence:** 90%

When `caseDoc` is null in `unlockAndRelockCase`, the function returns `{ ok: false, reason: 'not_doc_upload_mode' }`. The correct reason should be a distinct code (e.g., `'case_not_found'`). The API route maps this to a 400 with message "Case is not in doc-upload mode", which is misleading when the real problem is a missing document.

### M3 — `check-dsa/+server.ts` uses `json()` extensively (carry-forward, expanded)

**File:** [`check-dsa/+server.ts`](src/routes/api/auth/check-dsa/+server.ts)
**Commit:** `c0cf8e18` (expanded the file significantly)

The refactored `check-dsa` handler was already using SvelteKit's `json()` — this is pre-existing. However, commit `c0cf8e18` expanded the file (+61/−8) and perpetuated the pattern across ~15 `json()` call sites. Should migrate to `apiOk()`/`apiError()` when next touched.

---

## Low Findings / Observations

### L1 — Commit `8e80e73f` directly addresses prior review findings M1 + M2

Excellent responsiveness — the M1 finding (currency fields missing `minLimit`) and M2 finding (director restoration merge scope) from `CODE-REVIEW-2026-05-13-b.md` were both resolved within hours:

- **M1 resolved:** 27 currency fields across 6 loan types now have explicit `minLimit`/`maxLimit`. The `numericFieldsHaveExplicitLimits.test.ts` was extended to scan `type:'currency'` fields. CI will now catch future omissions.
- **M2 resolved:** `applyDirectorRestore` now uses a `USER_ENTERED_SPECIFICS_KEYS` allowlist instead of spreading all recovered specifics. Auto-derived infrastructure keys (`companyType`, `firmType`, `registeredInIndia`, `shareholding`, etc.) are excluded.

### L2 — `c0cf8e18` reliability improvements are architecturally sound

The fire-and-forget → await+retry pattern in `hooks.server.ts` (token refresh DB write) is a correct reliability improvement. The denormalized counter elimination in `sources/+server.ts` (replaced with live aggregation) is drift-proof by design.

### L3 — `3b349d06` test coverage is excellent

The case-lock + billing commit ships with 132 new tests across 5 test files covering all major paths: lock operations, interceptor logic, quota consumption, billing endpoints. This is good practice for a dormant module.

### L4 — `3b349d06` `da-quota` and `da-topup` routes are well-structured

These routes correctly use `apiOk()`/`apiError()`/`apiServerError()`, `requireRoleApi`, `rateLimit`, `parseJsonBody`, and `logger`. They can serve as the reference pattern for fixing the lock routes (H2, H3).

### L5 — `json()` in API routes (carry-forward count)

Routes still using SvelteKit's `json()` instead of `apiOk()`/`apiError()`:
- `communication/templates` (legacy)
- `dsa/walkthrough` (legacy)
- `dsa/rm-suggestions` (legacy)
- `auth/check-dsa` (expanded in `c0cf8e18`)
- `cases/[case_id]/lock` (**new** — `3b349d06`)
- `cases/[case_id]/unlock-and-relock` (**new** — `3b349d06`)
- `appliedApplication` (legacy)

Total: 7 routes (was 3+1 in prior review, now +2 new from case-lock).

---

## Commit-Level Analysis

### `c0cf8e18` — fix(reliability): eliminate silent failures

**Risk:** Medium (touches `hooks.server.ts`, dev-only e2e route).

**Strengths:**
- Fire-and-forget → await+retry in `hooks.server.ts` is correct. The retry is single-attempt with structured logging — not a loop.
- Denormalized counters replaced with live aggregation in `sources/+server.ts` — eliminates drift entirely.
- Audit document (`catch-audit-2026-05-13.md`) shows systematic review of all 22 catch blocks.

**Issues:**
- **Type error (H1):** `'timed_out'` status written to DB without updating the `E2eTestRun.status` type union. Build-breaking.
- The `hooks.server.ts` change converts the token refresh write from fire-and-forget to awaited. This adds latency to the JWT refresh path (2 DB round-trips on failure). Acceptable for reliability, but the retry should be bounded with a timeout to avoid blocking request handling.

### `8e80e73f` — fix(review): resolve M1 + M2 findings

**Risk:** Low. All changes are additive (`minLimit`/`maxLimit` declarations) or scoping down an existing merge.

**Strengths:**
- Directly addresses prior review findings with correct implementations.
- Test extended to catch future currency field omissions.
- `businessLoan q2_loanAmount minLimit` lowered from ₹10L to ₹1L to match `required: false` semantics.
- Director restoration merge properly scoped to `USER_ENTERED_SPECIFICS_KEYS` allowlist.

### `3b349d06` — feat: port case-lock + DA billing modules

**Risk:** High (4,429 lines, billing/payment logic, new API routes, shared module changes).

**Strengths:**
- 132 tests across 5 files — comprehensive coverage.
- Atomic quota consumption via MongoDB `$expr` gate — correctly prevents double-consumption in the normal path.
- Clean module separation (types, fingerprint, editImpact, operations, interceptor).
- `da-quota` and `da-topup` routes follow all project conventions.
- Deliberately dormant — interceptor is not wired into production routes yet.

**Issues:**
- **H2-H4:** Case lock routes have security gaps (missing role guard, no rate limiting, client-supplied tier trusted).
- **H3:** Convention violation (`json()` instead of `apiOk()`).
- **M1:** Enterprise overage path has a TOCTOU gap.
- **M2:** Wrong reason code on missing case document.

---

## Security Surface Summary

- **New attack surface:** 4 new API routes (billing + case lock). `da-quota` and `da-topup` are properly secured. `lock` and `unlock-and-relock` have authorization and rate-limiting gaps (H2).
- **Attack surface reduced:** Token refresh DB write no longer silently fails — improves logout-all-devices reliability.
- **Outstanding debt:** 7 routes using `json()` (carry-forward + 2 new). `.env` in git history (P0.2, deferred). Case lock routes need role guard + rate limiting before production activation.

---

## Performance Impact Summary

- **Bundle size:** No client-side changes. All new code is server-only.
- **New reactive effects:** 0.
- **Network:** `hooks.server.ts` token refresh now awaited (adds ~1-5ms on refresh, ~10ms on retry). Acceptable.
- **Database:** New `MonthlyAssessmentUsage` collection with unique index. `sources/+server.ts` GET now runs aggregation instead of reading denormalized counters — slightly more expensive per call but drift-proof.

---

## Cross-Team Blast Radius Summary

| Shared Module | Change | Impact | Safe? |
|---------------|--------|--------|-------|
| `hooks.server.ts` | Token refresh: fire-and-forget → await+retry | Every request with expired access token | **Yes** — functional improvement, no behavior change for callers |
| `mongo.ts` | `MonthlyAssessmentUsage` collection + index added | Database startup | **Yes** — purely additive, no existing collections affected |

No type/interface breaking changes. No API response shape changes for existing routes. No store shape changes. No route constant changes.

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
Unchanged. No new raw `fetch()` calls in `.svelte` files.

### Rule E: `{@html}` Exception Inventory
Unchanged. Same approved exceptions.

### Rule C: `window.location.reload()` Inventory
Unchanged (10 approved instances).

### Rule SEC-4: Known `exec()` Sites
Unchanged. 2 known-safe (e2e-runs, run-vitest).

---

## Top 5 Actions for Next Session

1. **[H1] Fix type error** — add `'timed_out'` to `E2eTestRun.status` in [`e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32). Build is currently broken.
2. **[H2] Add `requireRoleApi('dsa')` + `rateLimit()` to both case lock routes** — before these endpoints are wired into production. Currently dormant but the code exists and could be activated.
3. **[H3+H4] Fix lock route convention violations** — replace `json()` with `apiOk()`/`apiError()`, read `tier` from database instead of trusting client.
4. **[M1] Add idempotency guard to enterprise overage path** in `daQuota.ts` to prevent double-charging under concurrent requests.
5. **[M3] Migrate `check-dsa/+server.ts` from `json()` to `apiOk()`** — the file was significantly expanded in `c0cf8e18` and now has ~15 `json()` call sites.
