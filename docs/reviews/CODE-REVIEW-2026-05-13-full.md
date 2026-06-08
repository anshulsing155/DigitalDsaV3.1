# Enterprise Code Review — 2026-05-13 (Full Sweep)

**Profile:** Full (T1-T9 + Phase 3 build/test verification)
**Scope:** Entire codebase against all 66 rules, commit-level analysis for `9764a2ca..HEAD` (3 commits since the last full review cutoff).
**Prior full review:** [`CODE-REVIEW-2026-05-13-b.md`](CODE-REVIEW-2026-05-13-b.md) — reviewed through `9764a2ca`.
**Contrast audit:** [`CONTRAST-AUDIT-2026-05-13.md`](CONTRAST-AUDIT-2026-05-13.md) — 456/456 pairs pass.

---

## Header — Commands Executed

| Command | Status | Result |
|---------|--------|--------|
| `pnpm check` | ❌ **FAIL** | **2 errors** in [`src/routes/api/admin/testing/e2e-runs/+server.ts`](src/routes/api/admin/testing/e2e-runs/+server.ts) — `'timed_out'` not in `status` type union |
| `pnpm test:unit -- --run` | ✅ pass | 112 files, 10,564 tests — all pass |
| `pnpm test:contrast` | ✅ pass | 456/456 pairs pass WCAG AA across all 12 themes |
| `pnpm build` | ✅ pass | Built in 1m 41s (Vite ignores TS errors; CI typecheck would still block) |
| `pnpm audit --production` | ⚠️ | **24 vulnerabilities**: 4 high (all axios via razorpay), 18 moderate, 2 low |
| `git log --since='1 week' \| grep -i 'co-authored-by'` | ✅ pass | 0 matches |

---

## Commits Reviewed (since last full review `9764a2ca`)

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `3b349d06` | feat: port case-lock + DA billing modules from parser worktree | 18 | +4,429/−0 |
| `8e80e73f` | fix(review): resolve M1 + M2 findings from enterprise code review | 16 | +86/−13 |
| `c0cf8e18` | fix(reliability): eliminate silent failures in 12 fire-and-forget DB operations | 7 | +295/−74 |

Total: 41 files changed, +4,810/−87. **`3b349d06` is a large new feature port** — case-lock + DA quota subsystem (4,429 new LOC across 6 source modules, 5 test files, 2 new API routes, 1 new type file, 1 config addition, 1 DB migration). Requires extra scrutiny.

---

## Standing Grep Rules — Full T1-T9 Sweep (all 66 rules)

### Tier 1 — Security (13 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **A** — CSRF: raw `fetch()` on mutating endpoints | Known-safe inventory intact. All public/auth-pre-login fetches are GET or pre-auth. Share-link POSTs are CSRF-exempt by design (no auth session yet). | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | **0 new violations.** Same 8 documented exceptions (JsonLd, Toast, 5 pageDescriptions, policies/[artifact_id], how-can-we-help). | Unchanged |
| **E2** — Dynamic attribute XSS (`href={...}`, `src={...}`) | No user-controlled URL injection vectors found. Markdown/marked usage: none in client. | Unchanged |
| **F** — Bare `console.log/error/warn` in server | **0 violations.** Only 2 known logger.ts fallback lines + 2 commented-out lines in `api/auth/init-widget`, `api/auth/resend-otp`. | Unchanged |
| **G** — `Co-Authored-By` in commits | **0 matches** in last 2 weeks. | Unchanged |
| **SEC-1** — Hardcoded secrets | 0 in non-test files. Test files have fixture data (`TEST_SECRET = 'test-csrf-secret-key-for-unit-tests'`, etc. — expected). | Unchanged |
| **SEC-2** — PII in logging | Sample reviewed: 188 server files use logger. Spot-check on new case-lock code shows `dsaId.toString()` only — no full user object dumps. PAN values are SHA-256 hashed before storage. ✅ | Reviewed |
| **SEC-3** — Cookie security | All `cookies.set()` calls in production paths use `httpOnly: true` + `secure: !dev` + `sameSite: 'lax'`. Same inventory as prior review. | Unchanged |
| **SEC-4** — eval/exec/child_process | 2 known-safe instances: `e2e-runs/+server.ts` (admin-only, dev-only, enum-validated `testType`), `run-vitest/+server.ts` (admin-only, allowlist regex). 1 hit in `communicationTemplates.test.ts` is `regex.exec()` (false positive). | Unchanged |
| **SEC-5** — Client env exposure | Only `VITE_VAPID_PUBLIC_KEY` (non-sensitive push notification key). 0 `$env/*/private` in `.svelte`. ✅ | Unchanged |
| **SEC-6** — Rate limiting coverage | 38 files of 162 POST/PUT/DELETE/PATCH handlers use `rateLimit()`. ⚠️ **New gap:** `/api/cases/[case_id]/lock` and `/api/cases/[case_id]/unlock-and-relock` (both added in `3b349d06`) have no rate limiter — see L1. | **Worsened** (2 new unlimited endpoints) |
| **SEC-7** — Client storage PII | Mixed. `lib/utils/clientSession.ts:128` writes user object to localStorage including PII (name/email/mobile). Currently orphaned (only imported by `sessionService.ts` which is itself unwired from production routes), but the code is still in the bundle. See L2. | **Newly surfaced** (orphaned dead code) |

### Tier 2 — SSR / Crash (7 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **B** — Static `@capacitor/*` imports | 1 allowed match: `@capacitor/core` in `src/lib/utils/api.ts` (core is SSR-safe). 0 plugin imports at module scope. | Unchanged |
| **C** — `window.location.reload()` | 10 instances — all guarded by `if (browser)` or in approved files (`+error.svelte`, `hooks.client.ts`, `ResetDataButton`, `LanguageSelector`, admin pages). | Unchanged |
| **D** — Async function returning Capacitor proxy | 0 matches. | Unchanged |
| **I** — `typeof window !== 'undefined'` | **0 matches.** Pitfall #9 fully eliminated. | Unchanged |
| **J** — Module-scope `fetch` | **0 matches.** | Unchanged |
| **SSR-1** — Non-deterministic render output | 21 `.svelte` files use `Math.random()` / `Date.now()`. Spot-checked: all sites use them inside `onMount`/`$effect`/event handlers (e.g., `landing/LoadingScreen.svelte`, `+error.svelte`, login OTP timers). | Unchanged |
| **SSR-2** — Unhandled rejections in load functions | No instances of `.then(...)` without `.catch(...)` in `+page.server.ts` or `+layout.server.ts`. Async/await pattern with try/catch is the project standard. | Unchanged |

### Tier 3 — Correctness & Quality (11 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **H1** — `state_referenced_locally` | **0 warnings** in `pnpm check`. | Unchanged |
| **H2** — `$effect` reading+writing same `$state` | 405 `$effect` blocks in 132 files. Manual scan of `c0cf8e18` + `3b349d06` shows no new self-tracking effects. | Reviewed |
| **K** — JSON-Logic `!=` in config | 346 occurrences / 43 files. All against string literals (not unset/null). | Unchanged |
| **L** — Numeric fields without explicit `minLimit` | All tests pass including extended `numericFieldsHaveExplicitLimits.test.ts` (now scans `type:'currency'` too — fix landed in `8e80e73f`). | **Improved** (test coverage extended) |
| **M** — `combinedAnswers` alias collision | **0 matches** in `src/lib/components/` after known-safe filter. | Unchanged |
| **S** — WCAG AA contrast | **456/456 pairs pass** across all 12 themes. | Unchanged |
| **CQ-1** — Empty catch blocks | **0 matches.** | Unchanged |
| **CQ-2** — Memory leaks | 21 `.svelte` files use `setInterval` or `addEventListener`. Spot-checked: all use Svelte 5 `$effect` cleanup or `onDestroy`. | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify())` | 0 in production code. 5 in test files (acceptable — payload snapshot fixtures). | Unchanged |
| **CQ-4** — Error boundary coverage | Still only **1** `+error.svelte` at the root. No new route-group boundaries added. See L3. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK | 35 across 13 files — same as prior review. | Unchanged |

### Tier 4 — Conditional Rules (run unconditionally per Full profile)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **O** — Payload snapshot drift | Triggered (questionBank changes in `8e80e73f` added `minLimit`/`maxLimit` but didn't change field structure). All snapshot tests pass. | Clean |
| **P** — Auto-clear parity (6 form pages) | **6 files matched** — correct parity. | Unchanged |
| **Q** — `engines.node` pin | `"22.x"` — correctly pinned. | Unchanged |
| **R** — Server→client field forwarding | `toClientOption` + `toClientQuestion` still wired in [`engine.ts`](src/lib/server/formEngine/engine.ts) + [`optionResolver.ts`](src/lib/server/formEngine/optionResolver.ts). | Unchanged |
| **COND-1** — Upload security | `MAX_FILE_SIZE = 10MB`, `ALLOWED_MIME_MAP` allowlist, `sanitizeFilename()`, `crypto.randomUUID()` storage names — all intact in [`api/upload/+server.ts`](src/routes/api/upload/+server.ts). | Unchanged |
| **COND-2** — Financial calculation review | New: DA quota module ([`daQuota.ts`](src/lib/server/billing/daQuota.ts)). Atomic `$expr` gate prevents over-consumption. No division-by-zero risk (no divisions in the quota math). PAN values SHA-256 hashed before storage (no PII leakage). ✅ | Reviewed |
| **COND-3** — Anti-scraping layer integrity | All 8 layers intact in `engine.ts`, `formGuard.ts`. No changes. | Unchanged |
| **COND-4** — Vercel function size | Build output: largest chunk is `pincode_IN_all.js` at **3.5MB** (intentional — geography data). `engineContext.js` 1.6MB, `HoneypotField.js` 512KB. Below 50MB per-function limit. No new heavyweight deps. | Unchanged |

### Tier 5 — Production Hardening (7 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **PH-1** — Security headers | All 6 headers present in [`hooks.server.ts:635-648`](src/hooks.server.ts:635). | Unchanged |
| **PH-2** — Auth guard coverage | Spot-checked all 15 routes without explicit `requireAuth*` helpers — all do `if (!locals.user)` inline or are intentionally public (newsletter, share-link, cron with `x-cron-secret`). Newsletter + cron endpoints verified to use rate-limiting and secret-header gates respectively. ✅ | Unchanged |
| **PH-3** — API response consistency | **159 route files** still use SvelteKit's `json()` instead of `apiOk()/apiError()` (vs `~3` claimed in prior daily review — the prior review's count was wrong; this is much wider tech debt). Both new lock endpoints in `3b349d06` use `json()`. See M2. | **Re-baselined** (count was understated previously) |
| **PH-4** — External API timeout/error handling | 8 server files use `externalFetch` wrapper (MSG91 OTP, AI service, etc.). 3 raw `fetch` to `bank-loan-management.vercel.app` in `homeLoanApi.ts` — these are client-side, not server. | Unchanged |
| **PH-5** — MongoDB `$where` / `$function` | **0 matches.** Anti-injection clean. | Unchanged |
| **PH-6** — Cache-Control on sensitive responses | 12 hits — auth/case endpoints use `'no-store'` or `'private, no-cache'`. ✅ | Unchanged |
| **PH-7** — `parseJsonBody` coverage | **153 of 162** POST handlers use `parseJsonBody`. 0 raw `await request.json()` matches. ✅ | Unchanged |

### Tier 6 — Performance & Observability (8 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **PERF-1** — `import *` / heavy client imports | 2 known-safe (`json-logic-js`, `@mediapipe/face_detection`) + iconRegistry doc comment. No `pdf-lib`/`sharp`/`pino` in `.svelte`. | Unchanged |
| **PERF-2** — `$effect` reactive churn | 405 effects in 132 files. New module (`3b349d06`) is pure server code — no new client effects. No spike. | Unchanged |
| **PERF-3** — `invalidateAll()` use | 30 files. Mostly dashboard mutation paths — acceptable for refresh-after-write. No new instances in loops. | Unchanged |
| **PERF-4** — Event loop blocking | New `sources/+server.ts` aggregations are bounded (`$in: sourceIds`). No unbounded `JSON.parse` on user input. Sync crypto: `createHash` / `randomBytes` — both fast. | Unchanged |
| **PERF-5** — Image optimization | 6 files use `<img>`. Not exhaustively audited this pass; no new images in recent commits. | Unchanged |
| **PERF-6** — NaN/Infinity guards in ruleEngine | No changes to ruleEngine in this window. New billing module has no divisions. | Unchanged |
| **OBS-1** — Structured logging compliance | 188 server files use `logger`. 0 bare `console.*` in `src/lib/server` or `src/routes/api/` (except `logger.ts` fallback). | Unchanged |
| **OBS-2** — Silent failure detection | **Improved** — `c0cf8e18` converted 12 fire-and-forget `.catch(() => {})` instances to await + retry + log. Remaining `.catch(() => {})` instances (hooks.server.ts activity tracking, honeypot, demo UI logout, index migrations) are documented as intentional in `docs/reviews/catch-audit-2026-05-13.md`. | **Improved** |

### Tier 7 — Build & Dependency Safety (4 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **BUILD-1** — Production build | ✅ pass — 1m 41s build time. Largest bundle: `pincode_IN_all.js` 3.5MB (intentional, geography data). | Unchanged |
| **BUILD-2** — `pnpm audit --production` | ❌ **24 vulnerabilities** — 4 high, 18 moderate, 2 low. **All 4 highs are axios** (`<1.15.1`) transitive via `razorpay`. See H1. | **Newly surfaced** |
| **BUILD-3** — TypeScript strict mode | ❌ **2 errors** in [`api/admin/testing/e2e-runs/+server.ts`](src/routes/api/admin/testing/e2e-runs/+server.ts) — `'timed_out'` not in `status` type union. See C1. | **REGRESSION** — prior was 0 errors |
| **BUILD-4** — Test suite health | ✅ 10,564 tests pass (+132 vs prior — 5 new test files from case-lock module: `caseLock.test.ts`, `caseLockInterceptor.test.ts`, `caseLockOperations.test.ts`, `daQuota.test.ts`, `billingEndpoints.test.ts`). | **Improved** |

### Tier 8 — UX / Mobile / Accessibility (4 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **UX-1** — Loading state on async actions | New endpoints in `3b349d06` are not yet wired to client UI. No regression. | N/A |
| **UX-2** — Mobile overflow / touch targets | Not exhaustively audited; no new layout components in this window. | Unchanged |
| **UX-3** — Form draft preservation | No form persistence changes in this window. | Unchanged |
| **UX-4** — Accessibility baseline | Contrast 456/456 pass. ARIA count not re-counted this pass — no new components added that would affect it. | Unchanged |

### Tier 9 — Cross-Team Blast Radius (9 rules)

| Rule | Result | Delta vs prior |
|------|--------|------|
| **BLAST-1** — Shared module changes | `hooks.server.ts` (auth path), `mongo.ts` (1 new collection), `applicantFormManager.svelte.ts` (director restoration). All reviewed below. | **3 shared modules touched** |
| **BLAST-2** — Type changes | New type file `monthlyAssessmentUsage.ts` added. **`e2eTestRun.ts` status union is INCOMPLETE** — should include `'timed_out'` (C1). | **Type regression** |
| **BLAST-3** — API response shapes | 2 new endpoints added (lock + unlock-and-relock). Both return `{ success, lock, was_idempotent }`. No existing route shape changes. | Additive |
| **BLAST-4** — Guard/auth logic changes | `hooks.server.ts` token refresh now awaits + retries. No permission semantics changed. ✅ | Improved |
| **BLAST-5** — Store/state shape changes | No state files changed in this window. | Unchanged |
| **BLAST-6** — Route constant changes | No `routes.ts` change in this window. (`QA_COVERAGE` was added before the prior review's cutoff.) | Unchanged |
| **BLAST-7** — Form schema changes | 13 questionBank files got `minLimit`/`maxLimit` additions in `8e80e73f` — additive, no `bindsTo` renames, no new `showWhen`. Auto-clear parity already covers. ✅ | Improved (currency limits) |
| **BLAST-8** — DB collection changes | New collection `MonthlyAssessmentUsage` added in `3b349d06` ([`mongo.ts`](src/lib/database/mongo.ts)). Read by `caseLock/operations.ts` and `billing/daQuota.ts`. No existing collection changes. | Additive |
| **BLAST-9** — Multi-author check | Single author (Prashant) for all 3 commits in window. No cross-team conflicts. | Single-author window |

---

## Critical Findings

### C1 — Build-breaking TypeScript errors: `'timed_out'` status value not in type union

**Files:**
- [`src/routes/api/admin/testing/e2e-runs/+server.ts:201`](src/routes/api/admin/testing/e2e-runs/+server.ts:201) — `$nin: ['completed', 'failed', 'timed_out']`
- [`src/routes/api/admin/testing/e2e-runs/+server.ts:240`](src/routes/api/admin/testing/e2e-runs/+server.ts:240) — `$set: { status: 'timed_out', ... }`
- [`src/lib/types/e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32) — `status: 'pending' | 'running' | 'page_filling' | 'completed' | 'failed';`

**Introduced by:** [`c0cf8e18`](https://github.com/anthropics) — added auto-expire feature that marks stuck runs as `'timed_out'`, but did not add the new value to the type union.

**Confidence:** 100% — `pnpm check` errors on both lines.

**Impact:** `pnpm check` exits non-zero. Any CI that runs typecheck as a gate will block deployment. Vite build itself still succeeds (Vite doesn't strict-typecheck by default). At runtime the writes succeed — MongoDB does not enforce TypeScript constraints — so the auto-expire feature actually works, but type drift now masks future regressions in this file from `pnpm check`.

**Reproduction:** `pnpm check` reproduces in 30 seconds.

**Recommended fix:** Add `'timed_out'` to the union in [`src/lib/types/e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32):

```ts
status: 'pending' | 'running' | 'page_filling' | 'completed' | 'failed' | 'timed_out';
```

This is a one-line, zero-risk fix. **The fact that this commit was merged with `pnpm check` failing means the pre-commit / pre-push typecheck is not gating effectively.** Worth investigating CLAUDE.md §5 Done Checklist enforcement.

---

## High-Priority Findings

### H1 — Axios CVEs (4 high-severity) in production dependency tree

**Source:** `pnpm audit --production` — 4 high CVEs against `axios` `<1.15.2`, all transitive via `razorpay` → `axios`.

The CVEs:
- GHSA-pmwg-cvhr-8vh7 — NO_PROXY bypass via 127.0.0.0/8 loopback (incomplete fix for CVE-2025-62718)
- GHSA-pf86-5x62-jrwf — prototype pollution gadgets (response tampering, data exfiltration, request hijacking)
- GHSA-6chq-wfr3-2hj9 — header injection via prototype pollution
- GHSA-q8qp-cvcw-x6jj — HTTP adapter prototype pollution (credential injection, request hijacking)

**Confidence:** 100% (advisory database).

**Exploitability:** Low in this codebase — `razorpay` is used server-side for payment signature verification (HMAC SHA-256). The Razorpay client never receives unvetted user URLs or `Object.prototype`-tainted inputs. But the gadgets exist in the dependency tree.

**Recommended fix:** Either (a) update `razorpay` to a version that depends on `axios >= 1.15.2`, or (b) add a `pnpm.overrides` entry to force `axios@^1.15.2`. (b) is faster:

```json
"pnpm": {
  "overrides": {
    "axios": "^1.15.2"
  }
}
```

**18 moderate** vulnerabilities also present — including `nodemailer` SMTP command injection (GHSA-vvjj-xcjg-gr5g, `<= 8.0.4`). Aligns with existing P0.2 production blocker (Nodemailer → SES migration deferred per 2026-04-22 decision).

### H2 — `applicantFormManager.svelte.ts` is a shared-module change with director-flow blast radius

**Files:** [`src/lib/components/applicantFormManager.svelte.ts:887-951`](src/lib/components/applicantFormManager.svelte.ts:887)
**Commit:** `8e80e73f`
**Confidence:** 75%

The director restoration merge change (resolving prior M2 finding) is functionally correct. Concerns:

1. **The `AUTO_DERIVED_INFRA` set is a hard-coded allowlist** (`registeredInIndia`, `companyType`, `firmType`, `shareholding`, `capitalContribution`, `companySharesFinancials`, `cin`). If a future field is added that is also auto-derived but not added to this set, the restoration will overwrite live company data with stale recovered data. No CI test enforces parity between this set and the actual auto-derived keys in `directorAutoIncome.ts` / `buildAutoSpecifics`.

2. **The filter also drops `undefined` and `''` values.** This is correct for "no recovered answer," but it means a user who intentionally cleared a field during recovery will have it restored to whatever the auto-derive currently produces. This may or may not be the intended UX — worth verifying with QA.

**Recommended action:**
- Add a unit test that grep-verifies `AUTO_DERIVED_INFRA` ⊇ `keys produced by buildAutoSpecifics`.
- Document the empty-string-filter intent with a one-line comment.

---

## Medium Findings

### M1 — No rate limiting on `/api/cases/[case_id]/lock` and `/api/cases/[case_id]/unlock-and-relock`

**Files:**
- [`src/routes/api/cases/[case_id]/lock/+server.ts`](src/routes/api/cases/[case_id]/lock/+server.ts)
- [`src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts)

**Confidence:** 80%

Both endpoints consume DA quota on each call. The atomic `$expr` gate in `consumeQuota` prevents over-consumption beyond `base_quota + topup_quota`, but:

- **`enterprise_da` tier allows overage** (`overage_charges_pending` is incremented; billed at month end). A buggy retry loop or a malicious DSA could rack up hundreds of overage charges in seconds.
- Even on hard-capped tiers, repeated 402 responses would burn DB roundtrips.

**Recommendation:** Add `rateLimit()` with conservative bounds (e.g., 10 calls/min per user) to both endpoints. Pattern matches `da-topup` (which has 5/min already).

### M2 — Both new lock endpoints use SvelteKit `json()` instead of `apiOk()/apiError()`

**Files:**
- [`src/routes/api/cases/[case_id]/lock/+server.ts`](src/routes/api/cases/[case_id]/lock/+server.ts) — 6 `json()` calls
- [`src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts`](src/routes/api/cases/[case_id]/unlock-and-relock/+server.ts) — multiple `json()` calls

**Confidence:** 90%

PH-3 rule says all API routes must use `apiOk()/apiError()` for response shape consistency. The new endpoints diverge: `{ success: false, error: 'X' }` matches the apiResponse shape, but with manual construction. Future apiResponse refactors won't pick these up.

**Also note:** `pnpm audit` / grep shows **159 files** in `src/routes/api/` use raw `json()` — far more than the "3 routes" the prior daily review claimed. The prior review's count was understated. This is wider technical debt than recognized — but the new lock endpoints add **2 more** rather than migrate any.

**Recommendation:** Either (a) migrate the 2 new endpoints to `apiOk()/apiError()` immediately (small change, ~30 lines each), or (b) accept the existing pattern and stop flagging it. Inconsistent migration is the worst outcome.

### M3 — DA quota uses `any` cast for `assessment_mode` and `lock` fields

**Files:**
- [`src/lib/server/caseLock/operations.ts:63,69,176,181`](src/lib/server/caseLock/operations.ts:63) — `(caseDoc as any).assessment_mode`, `(caseDoc as any).lock`
- [`src/lib/server/caseLock/interceptor.ts:59-67`](src/lib/server/caseLock/interceptor.ts:59) — `InterceptorCaseDoc` interface with explanatory comment

**Confidence:** 70%

The new fields aren't yet on the canonical `Case` type. Casts are inline `as any`. The code documents why:

```ts
// Check assessment_mode (typed as any since the field isn't on the Case type yet)
const assessmentMode = (caseDoc as any).assessment_mode as string | undefined;
```

This is OK as a porting strategy but represents technical debt. Future readers may not know that `assessment_mode` exists. Type-driven autocomplete won't suggest it. A field rename would not surface here as a compile error.

**Recommendation:** Add `assessment_mode?: 'manual' | 'doc_upload'` and `lock?: CaseLockState | null` to the canonical Case type. Net change: 2 lines + remove 4 casts.

### M4 — `sources/+server.ts` aggregation cost scales with source count

**File:** [`src/routes/api/sources/+server.ts`](src/routes/api/sources/+server.ts)
**Commit:** `c0cf8e18`
**Confidence:** 60%

The replacement of denormalized counters with live aggregation is architecturally clean (drift-proof), but the GET handler now runs 2 aggregation queries per call:

```ts
const [leadCounts, caseCounts] = await Promise.all([
  Leads.aggregate(...),
  Cases.aggregate(...)
]);
```

For a DSA with 50+ sources and 1000s of leads/cases, this is sub-100ms but non-zero. The denormalized counters were O(1) reads. The risk is negligible today (DSAs typically have <20 sources), but worth tracking once production traffic data is available.

**Recommendation:** Defer until usage telemetry shows >100ms latency on this endpoint. Index `source_id` on `Leads` and `source.source_contact_id` on `Cases` if not already present.

### M5 — `clientSession.ts` stores user PII in localStorage (orphaned but bundled)

**File:** [`src/lib/utils/clientSession.ts:128`](src/lib/utils/clientSession.ts:128)
**Confidence:** 70%

```ts
localStorage.setItem(`${this.SESSION_PREFIX}user`, JSON.stringify(sessionData.user));
```

The full user object (name, email, mobile, role) is written to localStorage. The comment correctly notes that tokens are excluded — but the user object itself contains PII.

**Mitigating factor:** `clientSession.ts` is only imported by `lib/services/sessionService.ts`, which is in turn imported by `lib/state/auth.svelte.ts`. None of these are referenced by routes/components in the production bundle today (verified by grep across `src/routes/` and `src/lib/components/`). The code is effectively dead.

**Risk:** Dead code that *does* something dangerous can be revived in a refactor without anyone noticing the PII implications.

**Recommendation:** Either (a) wire it intentionally (and reduce stored fields to non-PII metadata only — `id`, `role`, `expiresAt`), or (b) archive `clientSession.ts` + `sessionService.ts` + `state/auth.svelte.ts` to `_archive/` and remove from the bundle.

---

## Low Findings / Observations

### L1 — Dependency vulnerability total has grown to 24

Up from a previously-reported count. The full list:
- 4 high: axios via razorpay (see H1)
- 18 moderate: nodemailer (SMTP injection), follow-redirects (header leak), and 16 others
- 2 low: axios null-byte injection, etc.

Most are transitive. Razorpay update or pnpm.overrides resolves the highs.

### L2 — Bundle chunks are large

`pincode_IN_all.js` at 3.5MB is the heaviest server chunk (intentional — full Indian pincode dataset). `engineContext.js` 1.6MB, `HoneypotField.js` 512KB. None are above Vercel's per-function 50MB limit, but `pincode_IN_all` cold-start time is non-trivial. Lazy-load this dataset per-state if the chunk is hit at request time.

### L3 — Only 1 `+error.svelte` boundary across the entire app

Same as prior reviews — when any nested route throws, the user is taken to the root error page and loses all sidebar/wizard/form context. Worth adding at least:
- `src/routes/(app)/+error.svelte`
- `src/routes/dashboard/+error.svelte`
- `src/routes/(auth)/+error.svelte`

### L4 — `c0cf8e18` reliability improvements are well-executed

Token refresh DB write (hooks.server.ts:164-184), session invalidation (check-dsa, 4 sites), denormalized counter elimination (sources/leads), e2e-runs auto-expire — all converted from fire-and-forget with empty catch to await + retry + structured log. The companion audit doc [`docs/reviews/catch-audit-2026-05-13.md`](docs/reviews/catch-audit-2026-05-13.md) cleanly enumerates the 22 intentional remaining cases. Good discipline.

### L5 — Case-lock module has thorough test coverage

`3b349d06` introduced ~2,500 LOC of tests across 5 test files. Tests cover edit classification (minor/major), atomic quota gating, fingerprint stability (order-independent PAN sort, ₹5L amount bucket), idempotent locking, unlock-and-relock edit history append, and the billing endpoint shapes. Net coverage delta: +132 tests.

### L6 — Fingerprint formula is documented as potentially changing

[`fingerprint.ts:10-14`](src/lib/server/caseLock/fingerprint.ts:10) explicitly flags Decision 3.2 as "🟡 may change post-beta." If subtype or property.state is added later, every existing locked case will see its fingerprint shift, causing spurious unlock-and-relock charges on first edit after deploy. Worth a migration plan or `fingerprint_version` field for backward compatibility. (Not actionable today.)

---

## Commit-Level Analysis

### `3b349d06` — feat: port case-lock + DA billing modules from parser worktree

**Risk:** Medium (large additive change, new feature port).

This is a clean port:
- 6 new server modules under `caseLock/` and `billing/`
- 2 new API routes (`/api/cases/[case_id]/lock`, `/api/cases/[case_id]/unlock-and-relock`)
- 2 new billing routes already present from a prior commit (`/api/billing/da-quota`, `/api/billing/da-topup`)
- 5 new test files (~2,500 LOC of tests)
- 1 new MongoDB collection (`MonthlyAssessmentUsage`)
- 1 new type file
- Additive `billing.ts` config with tier definitions and top-up pack pricing

**Strengths:**
- Atomic quota consumption via MongoDB `$expr` gate — prevents over-consumption under concurrency
- PAN values SHA-256 hashed before storage — no PII in `case.lock.applicants_at_lock`
- Idempotent lock (same fingerprint = no-op, no double-charge)
- Razorpay signature verification on top-up purchase
- Thorough test suite

**Issues:** M1 (rate limit), M2 (apiResponse), M3 (`any` casts). All medium, none blocking.

### `8e80e73f` — fix(review): resolve M1 + M2 findings

**Risk:** Low.

**M1 fix (currency field limits):** All 27 currency fields across 6 loan types now declare explicit `minLimit`/`maxLimit`. Sensible bounds (₹0 for deposits, ₹500 for EMIs, ₹100K for property values, ₹999Cr max). `numericFieldsHaveExplicitLimits.test.ts` extended to scan `type:'currency'`. CI now catches regressions. **Excellent execution.**

**M2 fix (director restoration scope):** `applyDirectorRestore` now filters out auto-derived infrastructure keys before merging recovered specifics. The `AUTO_DERIVED_INFRA` allowlist is correct. Minor concern in H2 about future field additions not being added to the set.

### `c0cf8e18` — fix(reliability): eliminate silent failures

**Risk:** Low-medium (touches hooks.server.ts — shared module).

All changes are improvements:
1. **Token refresh DB write** — was fire-and-forget, now await + retry. Failure to persist refresh tokens would have broken logout-all-devices silently. Now visible in logs.
2. **Session invalidation on device switch** (check-dsa, 4 sites) — same pattern.
3. **Source stats counters** — eliminated denormalized counters entirely. Sources GET now aggregates from Leads + Cases. Drift-proof. See M4 for the perf observation.
4. **E2E test run auto-expire** — runs stuck >30 min now marked `'timed_out'`. **But the type union wasn't updated** (C1).

22 remaining `.catch(() => {})` instances are documented as intentional in `catch-audit-2026-05-13.md`. Verified spot-checks (hooks.server.ts activity tracking, HoneypotField, demo logout) — all correct to swallow.

---

## Security Surface Summary

**New attack surface:**
- 2 new authenticated endpoints (lock, unlock-and-relock) — both check `locals.user` + `requireTeamPermission('cases_edit')` + `blockDemoWrite`. No rate limit (M1). Mitigated by the atomic quota cap, but enterprise overage still bills per call.
- New external dependency: none added in this window.
- Razorpay HMAC verification path on `da-topup` — uses constant-time-ish string equality (`expectedSignature !== razorpay_signature`). JS `===` on hex strings is fast and not directly timing-leakable; for a defense-in-depth posture consider `crypto.timingSafeEqual` (but realistic attacker leverage here is low).

**Attack surface reduced:**
- 12 fire-and-forget DB writes now have visible failure modes (logged + retried).
- Currency input validation tightened — 27 fields now have explicit `min`/`max`.

**Outstanding security debt:**
- P0.1 — `.env` committed in git history (deferred per 2026-04-22).
- P0.2 — Nodemailer SMTP (CVE GHSA-vvjj-xcjg-gr5g) — Nodemailer → SES migration deferred.
- **NEW** H1 — Axios 4 high CVEs via razorpay (pnpm.overrides fix is ~5 lines).
- 159 API routes use `json()` instead of `apiOk()/apiError()` — consistency debt, not a vulnerability.
- M5 — Dead code in `clientSession.ts` writes PII to localStorage (orphaned, but bundled).

---

## Performance Impact Summary

- **Bundle size:** No new heavyweight deps. Largest chunks unchanged from prior review.
- **New reactive effects:** 0 new `$effect` on the client side. Case-lock is pure server code.
- **Network:** 2 new endpoints (`/api/cases/[case_id]/lock`, `/api/cases/[case_id]/unlock-and-relock`). Both single roundtrip + atomic MongoDB op.
- **Database:** 1 new collection (`MonthlyAssessmentUsage`). `Sources` GET adds 2 aggregations (M4 — bounded, acceptable today).

---

## Cross-Team Blast Radius Summary

| Shared Module | Change | Impact | Safe? |
|---------------|--------|--------|-------|
| `hooks.server.ts` | Token refresh now `await` + retry instead of fire-and-forget | Every authenticated request | **Yes** — single retry on transient DB failure; no permission semantics changed |
| `mongo.ts` | `MonthlyAssessmentUsage` collection added | DA quota module only | **Yes** — purely additive, indexes set inside the module |
| `applicantFormManager.svelte.ts` | Director restoration scope narrowed via `AUTO_DERIVED_INFRA` allowlist | All 6 form pages, multi-applicant flows | **Yes, with caveat** — see H2: future auto-derived field additions must update the set |
| `e2eTestRun.ts` | Type union missing `'timed_out'` value used in `e2e-runs/+server.ts` | Admin testing dashboard only | **NO** — see C1 |
| `sources/+server.ts` GET | Denormalized counters replaced with live aggregation | CRM sources tab, DSA dashboard | **Yes** — see M4 for perf note |

No API response shape changes affecting existing clients. No auth/guard signature changes. No store shape changes. No `routes.ts` changes.

---

## Known-Safe Inventory Refresh

### Rule A — Raw `fetch()` Inventory (CSRF-exempt by design)

Unchanged. All raw `fetch()` calls fall into one of these categories:
- GET requests (CSRF doesn't apply)
- Auth pre-login flow (no auth session yet — `login/+page.svelte`, `partner-signup/+page.svelte`)
- Share-link public flow (no auth session — `f/[token]/+page.svelte`)
- Pre-auth flows in onboarding (`AboutYou.svelte`, `BasicFields.svelte`)
- Internal csrf.ts retry logic
- External APIs (homeLoanApi.ts client-side, externalFetch wrapper server-side)
- Test/demo helpers and `_archived/` files

### Rule E — `{@html}` Exception Inventory

Unchanged. Same 8 sites:
1. `lib/components/JsonLd.svelte:10` — JSON-LD `<script>` tag (escaped JSON.stringify)
2. `lib/components/auth/Toast.svelte:87` — internal SVG icon constants
3. `routes/(app)/form/home-loan/+page.svelte:2003` — server pageDescription
4. `routes/(app)/form/business-loan/+page.svelte:1084` — server pageDescription
5. `routes/(app)/form/plot-loan/+page.svelte:1377` — server pageDescription
6. `routes/(app)/form/lap/+page.svelte:1304` — server pageDescription
7. `routes/dashboard/admin/policies/[artifact_id]/+page.svelte:371` — admin `a.human_readable`
8. `routes/(app)/form/how-can-we-help/+page.svelte:431` — hardcoded `NoteWorthyMessage()`

All other `{@html ...}` calls use `sanitizeHtml()`.

### Rule C — `window.location.reload()` Inventory

Unchanged. 10 approved instances:
1. `hooks.client.ts:46` — auth-failure path
2. `routes/+error.svelte:204` — error page retry
3. `routes/dashboard/admin/+page.svelte:197` — admin reseed
4. `routes/dashboard/admin/testing/+page.svelte:33,56` — admin testing
5. `routes/dashboard/admin/policies/[artifact_id]/test/+page.svelte:156`
6. `routes/dashboard/admin/policies/+page.svelte:98`
7. `lib/components/LanguageSelector.svelte:57` — language change
8. `lib/components/landing/ErrorBoundary.svelte:159` — landing error
9. `lib/components/ResetDataButton.svelte:48` — guest demo reset

### Rule SEC-4 — eval/exec/child_process Inventory

Unchanged. 2 approved server instances:
1. `routes/api/admin/testing/e2e-runs/+server.ts` — `exec()` with `VALID_TEST_TYPES` enum + admin + dev-only
2. `routes/api/test/run-vitest/+server.ts` — `exec()` with allowlist regex + admin + dev-only

Plus 1 unrelated false-positive (`regex.exec()` in `communicationTemplates.test.ts`).

---

## Top 5 Actions for Next Session

1. **[C1] Fix the `'timed_out'` type union** — one-line change in [`src/lib/types/e2eTestRun.ts:32`](src/lib/types/e2eTestRun.ts:32). Restores `pnpm check` to 0 errors. Then investigate why `c0cf8e18` was merged with the typecheck failing (CLAUDE.md §5 Done Checklist gating gap).
2. **[H1] Resolve axios CVEs** — add `pnpm.overrides` for `axios@^1.15.2` (~5 lines in `package.json` + `pnpm install`). Eliminates 4 high CVEs.
3. **[M1] Add rate limiting to lock + unlock-and-relock** — copy the `rateLimit(5/min)` pattern from `da-topup/+server.ts`. ~10 LOC per endpoint.
4. **[M2 / re-baseline] Decide on `apiOk()/apiError()` migration scope** — either migrate the 2 new lock endpoints now, or accept the existing 159-file pattern. Inconsistent migration is the worst state; update CLAUDE.md PH-3 baseline to reflect actual scope.
5. **[M5] Decide on `clientSession.ts` fate** — wire intentionally with PII stripped, or archive. Today's state (orphaned but bundled) is the worst of both options.

---

## Health Snapshot

| Metric | Value | Direction |
|--------|-------|-----------|
| `pnpm check` | **2 errors** | 🔴 regression (was 0) |
| Tests | 10,564 passing (107 → 112 files; +132 tests) | 🟢 improved |
| Contrast | 456/456 | 🟢 unchanged |
| Build time | 1m 41s | 🟢 stable |
| pnpm audit | 24 vulns (4H, 18M, 2L) | 🔴 H1 surfaced |
| TODO/FIXME/HACK | 35 in 13 files | 🟢 unchanged |
| `state_referenced_locally` | 0 | 🟢 unchanged |
| Co-Authored-By trailers | 0 | 🟢 unchanged |
| Total LOC delta (last full review) | +4,810/−87 | — |

---

*Report generated by automated full code review run. Hard constraints honored: no source modifications outside `docs/reviews/`, no commits pushed, no auto-fixes applied.*
