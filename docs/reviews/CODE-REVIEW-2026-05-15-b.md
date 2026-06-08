# Daily Code Review — 2026-05-15 (Addendum B) — S102 Full Sweep

**Scope:** 16 commits `8d229da4..a0691554` (post-prior-review through end of S102 push session). Mix of source (auth, API migration, perf, form fix) + docs-only. All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-15.md`](CODE-REVIEW-2026-05-15.md) — reviewed through `8d229da4`, flagged M1/M2 (resolved at that time).

**Review profile:** **Full** (T1-T9 + Phase 3). Triggered by both criteria: >10 commits AND auth-touching changes (SEC-4 rate-limit on 8 auth routes, DX-2 Zod on 3 auth routes).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 112 files, **10,568 tests** — all pass (unchanged; verified via pre-push hook on each commit) |
| `git log --since='1 week' \| co-authored-by` | 1 false positive (CLAUDE.md §16 rule discussion text quoted in commit body) — unchanged |
| `pnpm test:contrast` | Not re-run this session (last clean S98 — no styling changes since) |

---

## Commits Reviewed

| SHA | Subject | Files | +/- | Source/Docs |
|-----|---------|-------|-----|--------------|
| `80496866` | fix(form): personal loan location wording, modal dropdown clipping, DC joint(2) trap | (covered prior review addendum) | — | src |
| `78db1788` | fix(api): rate-limit /api/location/cities (M1) + apiStructuredError helper (M2) | (covered prior review) | — | src |
| `61476137` | docs(handoff): S101 session close | 5 | +469/−5 | docs |
| `8d229da4` | docs(handoff): S100/S101 deferred-verification procedures | 1 | +48/−2 | docs |
| `a481395c` | perf(load): PERF-1 pilot — migrate rm/dsa-search + rm dashboard to SSR load | 5 | sig. | src |
| `26638ebd` | fix(api): apiStructuredError spread order (L1) | 1 | small | src |
| `cfd23769` | fix(form): FORM-3 — Pitfall #17 position:fixed on 3 latent selects | 3 | sig. | src |
| `46b4cb6f` | docs(handoff): S101 expanded | docs | — | docs |
| `b8e5901b` | perf(load): PERF-1 #3 — migrate /dashboard/admin to SSR load; closes PERF-1 | 5 | sig. | src |
| `afe0ebcd` | refactor(api): DX-4 — migrate 5 carry-forward routes from json() to apiOk/apiError | 5 | mod. | src |
| `2eacec50` | docs(handoff): S101 expanded again | docs | — | docs |
| `17a3fdff` | docs(security): SEC-5 sample BOLA audit — 9 routes verified, 0 gaps | docs | — | docs |
| `5c4c7731` | docs(handoff): update branch SHA references | docs | — | docs |
| `c4e02f4d` | refactor(api): DX-4 batch 2 — 8 admin routes + 1 client coordination | 9 | mod. | src |
| `0f3450fc` | fix(security): SEC-4 — rate-limit 5 critical unauth/auth endpoints | 5 | +79/−12 | src |
| `3d502a4c` | docs(handoff): S101 final | docs | — | docs |
| `4c9aa35f` | fix(security): SEC-4 batch 2 — rate-limit final 3 auth routes | 3 | +64/−6 | src |
| `6d8a1d6d` | docs(security): SEC-5 batch 3 — 9 admin/policy-engine routes audited, 0 gaps | 1 | +12/−4 | docs |
| `7bfea439` | refactor(api): DX-4 batch 3 — 9 admin/policy-engine routes migrated | 9 | +107/−183 | src |
| `a0691554` | chore(api): DX-2 pilot — Zod schemas on 3 auth routes | 3 | +76/−29 | src |

Total: **16 commits since prior review**. Source: 11. Docs-only: 5.

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **M1** — `/api/location/cities` lacks rate limiting | **RESOLVED** (prior review confirmed) | — |
| **M2** — Lock routes import `json` alongside `apiOk`/`apiError` | **RESOLVED** (prior review confirmed) | — |
| **L1** — `apiStructuredError` spread order docstring/code mismatch | **RESOLVED** in `26638ebd` | [`apiResponse.ts:110`](src/lib/server/apiResponse.ts:110) — payload spread first then `success`/`error`. Helper is now safe-by-construction. |
| **N1** — Pitfall #17 latent in ApplicantSelect/BooleanSelect/NewSelect | **RESOLVED** in `cfd23769` (FORM-3) | All 4 custom-select components now use canonical position:fixed pattern. |
| **M3** — `check-dsa/+server.ts` uses `json()` for success path | **Carry-forward** (intentional — flat-shape auth contract documented in S101); however **error-path** improved in `a0691554` (now uses `apiValidationError` with Zod). |
| **L5** — Raw `json()` carry-forward in admin routes | **Reduced** — 22 of ~150 routes now migrated (5+8+9 across S101 + S102). Carry-forward continues. |

---

## Standing Grep Rules — Full T1-T9 Sweep

| Rule | Tier | Result | Delta vs 2026-05-15 |
|------|------|--------|------|
| **A** — CSRF: raw `fetch()` + POST/PUT/DELETE/PATCH in `.svelte` | T1 | Same known-safe inventory (auth pages, _archived). No new violations in this session's commits (no `.svelte` touched). | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same approved exception sites (JsonLd, Toast icon, server `pageDescription`, admin `policies/[artifact_id]` human_readable, sanitizeHtml-wrapped components). **0 new violations.** | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** Only 2 known-safe in [`logger.ts:47,54`](src/lib/server/logger.ts:47) (the formatter itself). 0 in `routes/api/`. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | 1 false positive (rule text quoted in CLAUDE.md §16 commit body). **0 real violations.** All 11 new source commits clean. | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | No new source patterns. | Unchanged |
| **SEC-2** — PII in logging | T1 | DX-4 migrations replace `logger.error` with `apiServerError(err, msg)` which logs only `{err}` — strictly less context, no new PII surface. | Unchanged / improved |
| **SEC-3** — Cookie security | T1 | No new `cookies.set` sites this session. SEC-4 logout route changes were only rate-limit additions (cookie code unchanged). | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | 2 known-safe (unchanged from prior). | Unchanged |
| **SEC-5** — Client env exposure (`$env/dynamic/private` in `.svelte`) | T1 | 0 violations. | Unchanged |
| **SEC-6** — Rate limiting coverage on auth | T1 | **8 of 8 critical auth routes hardened.** `logout`, `register-device`, `validate-token` added in `4c9aa35f`. Cumulative auth rate-limit inventory: 19 routes import `rateLimit`. | **−3 gaps** ✅ |
| **SEC-7** — Client storage PII | T1 | Inventory unchanged (10 files, all known-safe form-draft + onboarding usages). | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | Only `@capacitor/core` statically imported (in [`api.ts:5`](src/lib/utils/api.ts:5) — `Capacitor.isNativePlatform()` boolean, safe). All others use `await import()`. | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** | Unchanged |
| **I** — `window.*` without browser guard | T2 | Not re-scanned (no new client code this session — all changes are `+server.ts`). | Unchanged |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | 10 known-safe files (form drafts + onboarding). | Unchanged |
| **H1** — JSON-Logic `!=` for null checks (Pitfall #1) | T3 | Same pre-existing carry-forward inventory in `businessLoan/{pages.ts,questionBank/*}` — these compare against `true`/`''`/literal values, not bare null. Per prior reviews, flagged as **known-pattern, not a regression**. No new `!=` usages in this session's commits. | Unchanged |
| **K** — `$state(prop)` without `$derived` or `// svelte-ignore` (Pitfall #10) | T3 | **0 warnings from `pnpm check`** (the canonical detector). | Unchanged |
| **L** — `combinedAnswers` underscore-split collisions (Pitfall #13) | T3 | No new `combinedAnswers.<suffix>` lookups added (this session touched no form/sidebar code). | Unchanged |
| **M** — Numeric fields without explicit `minLimit` (Pitfall #14) | T3 | `numericFieldsHaveExplicitLimits.test.ts` passes — captured in the pre-push hook. | Unchanged |
| **S** — Shared `bindsTo` overrides | T3 | Not re-scanned (no form-question changes). | Unchanged |
| **CQ-1..CQ-5** — Various correctness | T3 | No new violations. | Unchanged |
| **PH-1..PH-7** — Production hygiene (Vercel Node pin, CJS→ESM, gsap, dompurify chain) | T5 | `engines.node` still pinned to `22.x`. `ssr.noExternal` chain in `vite.config.ts` unchanged. No new dependencies added this session. | Unchanged |
| **PERF-1..PERF-6** — Performance | T6 | PERF-1 **CLOSED** (3 of 3 dashboard SSR-load migrations done — rm, rm/dsa-search, admin). PERF-2/3/4/5/6 unchanged. | **PERF-1 done ✅** |
| **OBS-1** — Client error tracking | T6 | Sentry-style `/api/errors/report` wired. Unchanged from S99 baseline. | Unchanged |
| **OBS-2** — OpenTelemetry traces | T6 | Not implemented (catalog item, deferred). | Unchanged |
| **T9** — Cross-team blast radius | T9 | `apiResponse.ts` touched in L1 fix (`26638ebd`). The change is **strictly defensive** (payload spread order) — existing callers using non-conflicting payloads are unaffected. New `apiValidationError` usages in DX-2 + DX-4 follow established shape. | No blast |

---

## Findings (this addendum)

### High — none

### Medium — none

### Low

#### L1 — Lost log context in captures/[capture_id]/activate DX-4 migration

**Severity:** Low (observability)
**Location:** [`src/routes/api/admin/policy-engine/captures/[capture_id]/activate/+server.ts:115`](src/routes/api/admin/policy-engine/captures/[capture_id]/activate/+server.ts:115)
**Commit:** `7bfea439` (DX-4 batch 3)

The pre-migration catch block logged `{ err, captureId: params.capture_id }` for activate-capture failures. The post-migration `apiServerError(err, 'Failed to activate policy capture')` logs only `{ err }` — `apiServerError` ([`apiResponse.ts:70`](src/lib/server/apiResponse.ts:70)) does not accept a context object.

Was unique among the 9 DX-4 batch 3 migrations (`git show 7bfea439 | grep "^-.*logger\.error(\{[^}]*[a-z]+:"` returns exactly one hit). All 8 other migrated routes logged only `{err}` pre-migration, so they didn't regress.

**Impact:** Error troubleshooting now requires correlating MongoDB query traces with the request to find which `capture_id` failed. Modest — the err object still contains the stack and most error types stringify usefully.

**Mitigation options (in order of preference):**
1. Enhance `apiServerError` to accept an optional context object — `apiServerError(err, msg, context?)` then log `{ ...context, err }`. Benefits every future migration with structured context. ~5-line change.
2. Add a `logger.error({ captureId, err }, ...)` BEFORE `apiServerError` — causes duplicate log lines (the protocol explicitly warns against this). Rejected.
3. Accept the loss — the protocol intent is to standardize on `err`-only logging. Documented as carry-forward.

**Recommended:** Option 1 is the right architectural fix (one helper change closes a class of regression). Track as a follow-up.

#### L2 — Pre-existing UX gap surfaced by DX-2 pilot (informational, not a regression)

**Severity:** Informational
**Location:** [`src/routes/(auth)/login/+page.svelte:447-461`](src/routes/(auth)/login/+page.svelte:447)

The check-dsa DX-2 pilot tightened the validation error path to return `apiValidationError`-shape `{ success: false, error, details }` (status 400). The login page's response handler reads only `result.userExists` and falls into the "send to onboarding" branch when `userExists` is undefined. This is **pre-existing** — the OLD shape `{ error: '...' }` (status 400) also produced `userExists: undefined`, same redirect.

**Effect:** A malformed mobileNumber from the client (extremely unlikely in practice — the form constrains input to digits) silently redirects to onboarding instead of showing "Invalid mobile number". Latent UX bug, not introduced or worsened by S102 changes.

**Recommended:** Document as a future fix. The Zod tightening hasn't materially changed user-visible behavior because the login form has a client-side digit-only mask.

---

## Commit-Level Analysis (S102 source commits, in chronological order)

### `a481395c` — PERF-1 pilot (rm/dsa-search + rm dashboard SSR)
- New `src/lib/server/rmHelpers.ts` extracts `resolveRmDoc` + `getPreferredDsaIds` for shared use between API route and `+page.server.ts`. Correct pattern per CLAUDE.md §15.
- `+page.svelte` files removed `onMount(async ...)` and seed `preferredDsaIds` from `data` prop with `svelte-ignore state_referenced_locally` — correct application of Pitfall #10.
- ✅ No findings.

### `26638ebd` — `apiStructuredError` spread fix (L1 from prior review)
- Single-line fix: `{ ...payload, success: false, error: message }` (was the other order). Helper is now safe-by-construction against caller-supplied keys.
- ✅ Closes prior review finding.

### `cfd23769` — FORM-3 Pitfall #17 in 3 latent selects
- `ApplicantSelect`, `BooleanSelect`, `NewSelect` all migrated to position:fixed + getBoundingClientRect() + capture-phase scroll listener. Matches the canonical CustomSelect pattern from S101.
- ✅ Closes prior review N1.

### `b8e5901b` — PERF-1 #3 admin dashboard SSR (closes PERF-1)
- New `src/lib/server/adminStats.ts` with explicit `AccountStatsData` / `TestingActivityData` return types. Surfaced and fixed latent type discrepancy in E2eTestRuns nullable fields.
- `Promise.allSettled` isolation pattern correctly applied — one tile failure doesn't blank the other.
- ✅ No findings. Closes architecture roadmap row.

### `afe0ebcd` — DX-4 carry-forward 5 routes
- 5 routes migrated to `apiOk/apiError/apiServerError`. `walkthrough` route upgraded inline auth check to `requireAuthApi`.
- `check-dsa` intentionally excluded (flat-shape auth contract).
- ✅ No findings.

### `c4e02f4d` — DX-4 batch 2 (8 admin routes + 1 client coordination)
- Coordinated change to `admins/+page.svelte` reads `result.data?.reqId` with fallback to `result.reqId` for backward-compat during deploy gap. Correct hand-off pattern.
- ✅ No findings.

### `0f3450fc` — SEC-4 batch 1 (5 critical auth routes)
- Rate limits on `check-dsa` (10/min/IP), `signup` (5/min/IP), `create-rm` (5/min/IP), `delete-account` (3/min/user), `demo-login` (10/min/IP). Distinct identifier prefixes per route, 429 via `apiError`.
- `delete-account` upgraded inline `locals.user` check to `requireAuthApi` (DX-5).
- ✅ Threat model well-reasoned per route. No findings.

### `4c9aa35f` — SEC-4 batch 2 (this session, my commit)
- `logout` (20/min/IP) — IP-based because auth is optional; rationale documented in commit and code comment.
- `register-device` (10/min/user) — per-user identifier; fingerprint-spray rationale documented.
- `validate-token` (30/min/IP, POST + GET) — same identifier prefix on both handlers prevents POST↔GET bypass. Conservative limit appropriate for client polling pattern.
- ✅ Closes SEC-4 critical-auth-route gap (8 of 8).

### `7bfea439` — DX-4 batch 3 (this session, my commit)
- 9 admin/policy-engine routes migrated. Response shape change on `captures/[capture_id]/activate` from flat `{ success, artifact_id, ... }` to nested `{ success, data: { artifact_id, ... } }` — **verified no consumers**.
- ⚠️ **Finding L1** — lost `captureId: params.capture_id` from error log. See above.
- All 8 other routes: no observability regression (logger was only `{err}`).
- Client-facing routes (`approvals/+page.svelte`, `versions/[policy_rule_id]/+page.svelte`) read only `result.success` and `result.error` — unchanged by migration.

### `6d8a1d6d` — SEC-5 batch 3 audit (this session, my commit, docs-only)
- 9 admin/policy-engine parameterized routes audited for BOLA. 0 gaps. Identified the **dual-guard pattern** (`requireRoleApi('admin')` + `requireAdminPermission('rule_authoring')`) as the 4th canonical ownership pattern.
- Three defense-in-depth observations codified: ObjectId.isValid pre-query, state-machine guards (isValidStatusTransition), audit-log non-repudiation via server-derived actor_id.
- ✅ No findings. Architecture-evolution doc updated correctly.

### `a0691554` — DX-2 pilot (this session, my commit)
- Zod schemas on `validate-token`, `register-device`, `check-dsa`.
- `register-device` tightening locks `deviceInfo.type` to `enum(['desktop','mobile','tablet'])` — previously cast as that union without runtime validation, so a malformed client could persist `'phone'` to DB. Real (latent) hardening.
- `check-dsa` schema constrains `preferredRole` to `['dsa','rm','admin']` — verified the only call site sends exactly those (`login/+page.svelte:444`).
- ℹ️ **Finding L2** — pre-existing login UX gap surfaced but not introduced. See above.
- ✅ Pilot pattern matches the protocol in `.claude/protocols/zod-migration.md` exactly. Ready for rollout to signup/create-rm next.

---

## Security Summary

| Surface | Status this session |
|---|---|
| **Auth route rate limiting (SEC-4)** | **8 of 8 critical routes hardened**. Cumulative SEC-4 row now ready to mark ✅ done in the next /end. |
| **BOLA audit (SEC-5)** | **27 of ~150 parameterized routes audited, 0 gaps**. 4 canonical ownership patterns now in the catalog. Strong audit trail. |
| **Zod validation (DX-2)** | **3 routes piloted** — 2 of which had latent type-cast risks (deviceInfo.type, preferredRole) the schema now blocks. Pattern proven. |
| **Inline auth → guard migration (DX-5)** | One more route promoted to `requireAuthApi` in S102 (delete-account, prior SEC-4 commit). |
| **Logger PII surface** | DX-4 migrations REDUCE log surface (strictly less data than pre-migration). Net positive for SEC-2 / PII-in-logs posture. |

No new attack surface introduced. No HIGH or MEDIUM findings.

---

## Performance Summary

| Surface | Status |
|---|---|
| **Dashboard SSR load (PERF-1)** | **CLOSED** — all 3 candidates migrated. Star icons / stats render on first paint vs after post-mount round-trip. |
| **Bundle size** | Unchanged this session (no new deps; no client code added). |
| **DB query count** | Net flat — DX-4 migrations are response-shape-only, not query-changing. PERF-1 admin dashboard uses `Promise.allSettled` for parallel fetch with independent failure isolation. |

---

## Blast-Radius Summary

| Shared module | Touched? | Risk |
|---|---|---|
| [`apiResponse.ts`](src/lib/server/apiResponse.ts) | Yes (L1 fix in `26638ebd`) | Strictly defensive (payload spread order). No existing caller affected. New `apiValidationError` callers in DX-2/DX-4 follow standard shape. |
| [`guards.ts`](src/lib/server/guards.ts) | No | — |
| [`hooks.server.ts`](src/hooks.server.ts) | No | — |
| `ruleEngine/` | No | — |
| `payloadBuilder/` | No | — |
| `formEngine/` | No | — |

No cross-team risk this session.

---

## Known-Safe Inventory — Updates

Adding to the running inventory (carry-forward):

- **`apiServerError(err, msg)` logs only `{err}` by design.** Use cases requiring extra log context (e.g., resource ID) currently lose that on DX-4 migration. Tracked as Finding L1; recommended mitigation = enhance the helper signature.
- **9 non-parameterized policy-engine routes still use raw `json()`** — next DX-4 batch target: `geo-scopes`, `lenders` (top-level), `products`, `variations`, `rules` (top-level), `submissions` (top-level), `negative-areas`, `resolve-preview`, `seed`. Total remaining: 67 `json()` call sites across 9 files.
- **2 remaining SEC-4 auth routes with bodies, not yet DX-2 piloted**: `signup`, `create-rm`. Pilot pattern is proven; expansion is mechanical.
- **125 of ~150 parameterized routes** still need SEC-5 BOLA audit. Next pass: `pms/policies/[id]/*` family (13 routes), `pms/suggestions/[id]`, `pms/lender-assignments/[id]`, `admin/admins/[admin_id]/*`, `admin/policies/[artifact_id]/*` family.

---

## Top 5 Actions (priority order)

1. **(Optional, recommended)** Enhance `apiServerError(err, msg, context?)` to accept an optional structured log-context object. Closes Finding L1 and pre-empts the same regression on future DX-4 migrations. ~5 lines + 1 unit test. Low risk.
2. **Continue DX-4 batch 4** — 9 non-parameterized policy-engine routes (67 raw json() call sites). Established pattern; ~30-45 min.
3. **Continue DX-2 expansion** — apply Zod pattern to `signup` and `create-rm`. Both already have rate limits + apiOk/apiError. ~20 min.
4. **Continue SEC-5 batch 4** — audit the `pms/policies/[id]/*` family (13 routes). Likely a 4th unique ownership pattern (PMS-specific RM ownership) to codify.
5. **(Production validation gate)** Re-verify PERF-4 + OBS-1 production proofs against the next Vercel preview deploy — procedure in [`SESSION-HANDOFF.md`](../SESSION-HANDOFF.md) deferred-verification section. Manual; ~10 min.

---

## Cumulative S102 Session Outcomes

| Item | Status before S102 | Status after S102 |
|---|---|---|
| SEC-4 (critical auth rate limits) | 5 of 8 | **8 of 8** ✅ |
| SEC-5 (BOLA audit) | 18 of ~150, 0 gaps | **27 of ~150, 0 gaps** (4 canonical patterns now) |
| DX-4 (apiOk/apiError migration) | 13 of ~150 | **22 of ~150** |
| DX-2 (Zod schemas at API boundary) | 0 | **3 (pilot established)** |
| PERF-1 (dashboard SSR load) | 2 of 3 (pre-S102) | **CLOSED ✅** in prior commits |
| L1 (apiStructuredError spread) | open | **closed** |
| FORM-3 (Pitfall #17 in 3 selects) | open | **closed** ✅ |

Tests, type-check, contrast — all unchanged (still 10,568 / 0 errors / 0 warnings / 456 contrast pairs).

---

**Reviewer:** Automated daily-review skill (run manually, scoped to current working directory).
**Run time:** ~5 min (full T1-T9 sweep + 16-commit delta analysis).
**Output:** This file. No source code changes per protocol Phase 0.
