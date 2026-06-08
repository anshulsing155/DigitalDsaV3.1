# Daily Code Review — 2026-05-15 — Standard Sweep

**Scope:** 3 commits `80496866..8d229da4` (post-S101 close). 1 source commit, 2 docs-only. All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-14.md`](CODE-REVIEW-2026-05-14.md) — reviewed through `d0160eba` + addendum for `80496866`.

**Review profile:** Standard (T1-T6, T9). Light commit day — single source commit directly closes two prior findings.

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 112 files, **10,568 tests** — all pass (unchanged) |
| `git log --since='1 week' ... \| co-authored-by` | 1 false positive (rule discussion text, not a trailer) — unchanged |

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `78db1788` | fix(api): rate-limit /api/location/cities (M1) + apiStructuredError helper (M2) | 4 | +55/−17 |
| `61476137` | docs(handoff): S101 session close — review addendum, FORM-3 catalog entry, M1/M2 writeup | 5 | +469/−5 |
| `8d229da4` | docs(handoff): S100/S101 deferred-verification procedures for PERF-4 + OBS-1 | 1 | +48/−2 |

Total: 10 files changed, +572/−24. Dominated by docs (+517).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **M1** — `/api/location/cities` lacks rate limiting | **RESOLVED** ✅ | [`cities/+server.ts:43-53`](src/routes/api/location/cities/+server.ts:43) — IP-based 60/min rate limit via canonical `rateLimit()` helper. `apiError('Too many requests...', 429)` on limit hit. |
| **M2** — Lock routes import `json` alongside `apiOk`/`apiError` | **RESOLVED** ✅ | New `apiStructuredError()` in [`apiResponse.ts:86-108`](src/lib/server/apiResponse.ts:86). Both [`lock/+server.ts`](src/routes/api/cases/[case_id]/lock/+server.ts) and [`unlock-and-relock/+server.ts`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts) migrated; `json` import dropped from both. |
| **N1** — Pitfall #17 in ApplicantSelect/BooleanSelect/NewSelect | **Carry-forward** | Tracked as FORM-3 in `ARCHITECTURE-EVOLUTION.md`. Latent, no user reports. |
| **M3** — `check-dsa/+server.ts` uses `json()` | **Carry-forward** | Not touched. |
| **L5** — `json()` carry-forward (remaining routes) | **Carry-forward** | Unchanged. Lock routes now fully migrated. |

---

## Standing Grep Rules — Full Tier 1-6, T9 Sweep

| Rule | Tier | Result | Delta vs prior (May 14) |
|------|------|--------|------|
| **A** — CSRF: raw `fetch()` + POST | T1 | Same known-safe inventory. No new `fetch` calls in today's commits. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same exception sites. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` fallback (2 lines) + 2 commented-out in auth. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | 1 false positive (same). **0 real violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | Not re-scanned (no new source patterns). | Unchanged |
| **SEC-2** — PII in logging | T1 | No new logger calls. | Unchanged |
| **SEC-3** — Cookie security | T1 | No new `cookies.set` sites. | Unchanged |
| **SEC-4** — eval/exec/child_process | T1 | 2 known-safe instances. | Unchanged |
| **SEC-5** — Client env exposure | T1 | 0 `$env/*/private` in `.svelte`. | Unchanged |
| **SEC-6** — Rate limiting coverage | T1 | **Prior M1 resolved** — `/api/location/cities` now rate-limited. | **−1 gap** ✅ |
| **SEC-7** — Client storage PII | T1 | Not re-scanned (no new client storage). | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches.** | Unchanged |
| **C** — `window.location.reload()` | T2 | **12 instances.** All guarded by `browser`. | Unchanged |
| **D** — Async Capacitor proxy return | T2 | **0 matches.** | Unchanged |
| **I** — `typeof window !== 'undefined'` | T2 | **0 matches.** | Unchanged |
| **J** — Module-scope `fetch` | T2 | **0 matches.** | Unchanged |
| **H1** — `state_referenced_locally` | T3 | **0 warnings.** `pnpm check` clean. | Unchanged |
| **K** — JSON-Logic `!=` in config | T3 | Not re-scanned (no form config changes). | Unchanged |
| **L** — Numeric `minLimit` test | T3 | Not re-run (no form schema changes). | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | Not re-scanned (no form config changes). | Unchanged |
| **S** — WCAG AA contrast | T3 | Not re-run (no UI changes). Prior: 456/456. | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | Not re-scanned (no new try/catch). | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | 0 in non-test files. 5 in tests (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | **3 boundaries** (root, app, dashboard). | Unchanged |
| **CQ-5** — TODO/FIXME/HACK count | T3 | **16 across 7 files.** | Unchanged |
| **P** — Auto-clear parity (6 pages) | T4 | **6 files matched** — correct parity. | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. | Unchanged |
| **PH-3** — API response consistency (`json()` usage) | T5 | Lock routes fully migrated. Carry-forward routes unchanged. | **Improved** (−2 `json` imports) |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 matches.** | Unchanged |
| **PERF-1** — `import *` | T6 | 2 known instances (`json-logic-js`, `@mediapipe/face_detection`). | Unchanged |
| **BLAST-1** — Shared module changes | T9 | `apiResponse.ts` — additive function only. See analysis below. | Reviewed |
| **BLAST-2** — Type/interface changes | T9 | No type/interface changes. | Clean |

---

## New Findings

### L1 — `apiStructuredError` docstring overwrite claim is inaccurate

**File:** [`apiResponse.ts:94`](src/lib/server/apiResponse.ts:94)
**Introduced by:** `78db1788`
**Confidence:** 100%

The docstring states: "The payload is shallow-merged AFTER the `{ success, error }` keys, so it cannot accidentally overwrite them." This is factually backwards — JavaScript spread semantics mean `{ success: false, error: message, ...payload }` allows `payload` keys to overwrite `success` and `error` if a caller passes them. In practice the helper is internal-only and both current call sites pass correct payloads (`consumed`, `total`, `can_topup`), so this is a documentation accuracy issue, not a bug.

**Recommendation:** Fix the docstring to say "callers must not include `success` or `error` in the payload" or swap the spread order to `{ ...payload, success: false, error: message }` to enforce the invariant. Low priority.

---

## Commit-Level Analysis

### `78db1788` — fix(api): rate-limit /api/location/cities (M1) + apiStructuredError helper (M2)

**Risk:** Low. Directly closes two prior review findings with minimal, well-scoped changes.

**Strengths:**
- Rate limit implementation follows project conventions exactly: `rateLimit()` from `$lib/server/rateLimiter`, IP-based identifier, 60/min cap, `apiError(..., 429)` on limit hit.
- Comment explains the 60/min ceiling rationale (onboarding makes ~2 calls, ceiling handles retries while blocking scraping).
- `apiStructuredError()` has comprehensive JSDoc with `@example`, explains when to use it vs `apiError()`/`apiValidationError()`.
- Both lock routes are mechanically consistent — same migration pattern applied to both.
- `json` import cleanly removed from both lock routes — no vestigial imports.
- Endpoint header comment updated to document the rate limit and explain why no auth.

**Issues:**
- L1 above (docstring accuracy — cosmetic).

**No functional issues found.** Clean fix commit.

### `61476137` + `8d229da4` — docs-only commits

**Risk:** None.

`61476137` updates SESSION-HANDOFF, CHANGELOG, DEVELOPMENT-PLAN, ARCHITECTURE-EVOLUTION, and the prior review (addendum). `8d229da4` adds deferred-verification procedures for PERF-4 and OBS-1 to SESSION-HANDOFF. Both are well-structured session documentation.

---

## Security Surface Summary

- **Attack surface reduced:** `/api/location/cities` now rate-limited at 60/min per IP. SEC-6 gap from prior review closed.
- **No new attack surface** introduced.
- **Outstanding debt:** `.env` in git history (P0.2, deferred). Enterprise overage TOCTOU (accepted for beta).

---

## Performance Impact Summary

- No bundle or runtime performance changes. Commit is server-only.
- Rate limiter on `/api/location/cities` adds negligible per-request overhead (in-memory check).

---

## Cross-Team Blast Radius Summary

| Shared Module | Change | Impact | Safe? |
|---------------|--------|--------|-------|
| `apiResponse.ts` | Added `apiStructuredError()` export | New export — purely additive, no existing exports changed | **Yes** |
| Lock routes (2 files) | 402 response now via `apiStructuredError` instead of raw `json()` | Response body shape is identical: `{ success: false, error, consumed, total, can_topup }` | **Yes** — no client-facing change |

No breaking type/interface changes. No API response shape changes. No store shape changes.

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
No changes.

### Rule SEC-6: Rate Limiting Inventory
- **Updated:** `/api/location/cities` — now has IP-based 60/min rate limit (was flagged as gap).

### Rule PH-3: `json()` Import Inventory
- **Removed:** `lock/+server.ts` — no longer imports `json` from `@sveltejs/kit`
- **Removed:** `unlock-and-relock/+server.ts` — no longer imports `json` from `@sveltejs/kit`

---

## Top 5 Actions for Next Session

1. **[N1, carry-forward] Migrate 3 select components to `position: fixed` pattern** — ApplicantSelect, BooleanSelect, NewSelect still use `position: absolute` dropdowns (Pitfall #17 / FORM-3). Mechanical, scoped.
2. **[L1] Fix `apiStructuredError` docstring** — swap spread order or correct the overwrite claim. Cosmetic.
3. **[Carry-forward] Migrate remaining `json()` routes** — `check-dsa`, `communication/templates`, `dsa/walkthrough`, `dsa/rm-suggestions`, `appliedApplication` still use SvelteKit's `json()` exclusively.
4. **[Carry-forward] Enterprise overage TOCTOU** — acceptable for beta, needs idempotency guard before production scale.
5. **[Carry-forward] PERF-4 + OBS-1 production proof** — visually verify onboarding city dropdown works post-deploy; trigger a test error to confirm email alert pipeline.
