# Daily Code Review — 2026-05-20

**Scope:** 18 commits `2c1c8e7f..2dceaa10` (last 24 hours). Rule engine property-not-identified secured flow fix, A.2 admin proxy-capture wizard (3 API routes + 3 pages), A.1 RM Settings auto-provision + profile complete endpoint, cross-field validation error clearing (all 6 form pages), UI/UX mobile/uniform refresh (28 files), DATA-4 analytics warehouse v1 (8 slices + 1 type fix), product audit Pass-2 + post-audit implementation specs, docs commits. Single author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-19-b.md`](CODE-REVIEW-2026-05-19-b.md) — 30 commits (Full profile). Carry-forward: M2 (auth route `json()` migration), M3 (DATA endpoint rate limits), L2 (PII in billing logger).

**Review profile:** **Full** (T1-T9). 18 commits, new API routes (admin proxy-capture, RM profile complete), shared module changes (rmHelpers, evaluationEngine, formWizardEngine, 6 form pages).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 173 files, **11,371 tests** — all pass (**+69** from prior: 11,302) |
| `pnpm test:contrast` | **456/456 pairs passed** — all WCAG AA across every theme |
| `git log --since='1 week' \| co-authored-by` | **0 violations** |

---

## Commits Reviewed

| SHA | Subject | Files | +/− | Category |
|-----|---------|-------|-----|----------|
| `2dceaa10` | fix(rule-engine): property-not-identified secured flow — affordability + traffic light | 5 | +181/−19 | Rule engine fix |
| `b33b66ad` | docs(plan): A.2 Slices 1-2 done; next = Slice 3 RM-side confirm | 1 | +6/−3 | Docs |
| `769d8507` | feat(admin): A.2 Slice 2 — admin proxy-capture wizard reuse + Step 0 UI | 9 | +604/−5 | Feature |
| `868f7aae` | feat(admin): A.2 Slice 1 — proxy-capture backend (provenance + create + rm-search) | 5 | +367/−2 | Feature |
| `e68a9409` | docs(plan): mark Epic A.1 done, point to A.2 Gap A | 1 | +4/−4 | Docs |
| `0fb59186` | fix(rm): A.1 — RM Settings auto-provision + graceful setup/error states | 8 | +727/−267 | Feature/fix |
| `97794046` | fix(form): clear stale cross-field validation error so corrected field re-enables Next | 9 | +92/−0 | Bug fix |
| `c5154d16` | docs(plan): Tier 0 cleared — SEC-2 + PERF-3 closed | 2 | +6/−6 | Docs |
| `817cb0f8` | docs(plan): unify roadmap + audit program into one sequenced Execution Order | 2 | +46/−8 | Docs |
| `2c1c8e7f` | docs(close): tracking docs for 2026-05-20 — DATA-4 v1 complete + next track | 4 | +82/−14 | Docs |
| `e6958cd4` | docs(audit): finalize POST-AUDIT-IMPLEMENTATION program spec (8 epics, Phase 0) | 2 | +404/−20 | Docs |
| `94f2ac41` | fix(data4): resolve two type errors in etlJob caught by pre-push gate | 1 | +13/−5 | Fix |
| `f3745612` | docs: product audit Pass-2 findings + post-audit implementation specs | 7 | +3478/−0 | Docs |
| `6c7cfc8e` | style(form): 2026-05-20 mobile / uniform-UI refresh | 28 | +648/−672 | Style |
| `a0e84523` | feat(data4): Slices 6-8 — privacy contract test + ETL runbook | 3 | +231/−13 | Feature |
| `5f8f1e1b` | feat(data4): Slice 5 — analytics ETL job + cron endpoint + run audit | 6 | +444/−2 | Feature |
| `d90ad73a` | feat(data4): Slice 4 — buildAnalyticsCase orchestrator + spec reconciliation | 5 | +538/−24 | Feature |
| `75bc219e` | feat(data4): Slice 3 — de-identification helpers + unit tests | 9 | +403/−0 | Feature |
| `f338b3d9` | feat(data4): Slice 2 — analytics_cases collection + types + indexes | 3 | +141/−0 | Feature |
| `3fdba220` | feat(data4): Slice 1 — ANALYTICS_PEPPER + person_id one-way bridge | 5 | +183/−2 | Feature |

Total: **18 code/feature commits** + docs-only commits. Source: ~85 unique files. Tests: +69 new tests (new test files for rule engine + proxy-capture provisioning).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **M2** — `check-dsa` + `signup` success paths still use raw `json()` | **Carry-forward** | Wire-contract change deferred under DX-4. Not touched today. |
| **M3** — Missing rate limiting on 5 DATA-1/DATA-2 mutating endpoints | **Carry-forward** | Endpoints not modified today. Still pre-UI — no client consumers. |
| **L2** — PII (email) in billing logger | **Carry-forward** | `trial-reminder/+server.ts` not modified today. |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs 2026-05-19 (evening) |
|------|------|--------|-------------------------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, GETs). New `proxy-capture/new/+page.svelte` uses raw `fetch` for GET `/api/admin/rm-search` (typeahead — not mutating, safe). POST call at line 111 correctly uses `secureFetch`. **0 new violations.** | +1 (safe GET) |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same 33+ approved exception sites. New admin policy `[artifact_id]/+page.svelte` uses `{@html a.human_readable` — pre-existing from prior commit, within admin-only rendered page. No new unsanitized patterns in today's commits. | Unchanged |
| **E2** — Dynamic attribute / URL injection | T1 | No new risk patterns. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts` (formatter), `telemetry.ts` (OTel bootstrap). `routes/api/`: 2 commented-out lines only. New proxy-capture + rm-search + rm/profile/complete routes all use `logger`. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | All matches are test files or type enums. New proxy-capture code loads no secrets — uses existing CSFLE infrastructure. New DATA-4 `ANALYTICS_PEPPER` loaded from `$env/dynamic/private`. | Unchanged |
| **SEC-2** — PII in logging | T1 | **0 new PII in logger calls.** New endpoints log only IDs, counts, and status. `rm-search/+server.ts` returns only `mobileLast4` (not full mobile). | Verified clean |
| **SEC-3** — Cookie security | T1 | No new `cookies.set()` calls. 18 known files unchanged. | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | Same known-safe instances. No new patterns in today's commits. | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (public by design). New DATA-4/proxy-capture env vars are server-private. | Unchanged |
| **SEC-6** — Rate limiting on auth | T1 | Auth routes unchanged. New `POST /api/rm/profile/complete` rate-limited 5/hr/user ✅. New `POST /api/admin/policies/proxy-capture` rate-limited 30/hr/admin ✅. New `GET /api/admin/rm-search` rate-limited 60/min/admin ✅. | +3 (all rate-limited) |
| **SEC-7** — Client storage PII | T1 | Same known-safe sites. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** (excluding `@capacitor/core`). | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** | Unchanged |
| **I** — `window.*` without browser guard | T2 | No new browser-API usage in today's commits. | Unchanged |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | Same 67 known files. No new additions. | Unchanged |
| **SSR-1** — TanStack Query `$`-prefix | T2 | **0 violations.** `queryClient.ts` comment (documentation only) is the only match. | Unchanged |
| **SSR-2** — TanStack Query provider wiring | T2 | Provider chain intact. | Unchanged |
| **H1** — JSON-Logic `!=` (Pitfall #1) | T3 | Same carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **K** — `$state(prop)` without `$derived` (Pitfall #10) | T3 | `pnpm check` 0 warnings. | Unchanged |
| **L** — `combinedAnswers` collisions (Pitfall #13) | T3 | No new collision-risk patterns. | Unchanged |
| **M** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No new form question additions today. | Unchanged |
| **S** — Contrast audit (WCAG AA) | T3 | 456/456 pairs passed. | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 empty catch blocks.** New `proxy-capture/new/+page.svelte` line 38 uses bare `catch { }` for search failure (empty, but for a non-critical typeahead — acceptable). | Unchanged |
| **CQ-2** — Memory leaks: intervals/listeners | T3 | New `proxy-capture/new/+page.svelte` uses `setTimeout` with `clearTimeout` pattern — correctly cleaned up on re-input. No `setInterval` additions. | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | Only in test files (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | `+error.svelte` at root, `(app)`, `dashboard`. Known gap: `(auth)`. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK | T3 | 16 occurrences across 7 files (case-sensitive scan). | Unchanged |
| **PH-1** — Vercel Node pin | T5 | `engines.node: "22.x"` — correct. | Unchanged |
| **PH-2** — `ssr.noExternal` chain | T5 | `pino`, `gsap`, `gsap/dist/ScrollTrigger`, isomorphic-dompurify chain (build-only), `razorpay`. No new deps added. | Unchanged |
| **PH-3** — API response consistency | T5 | `return json(` remaining: **108 files** — unchanged. All 7 new API routes (3 proxy-capture, 1 rm-search, 1 rm/profile/complete, 1 analytics-etl, 1 evaluate-and-persist update) use `apiOk`/`apiError`/`apiServerError` exclusively. | Unchanged |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 violations.** | Unchanged |
| **PH-7** — `parseJsonBody` coverage | T5 | All new POST/PATCH endpoints use `parseJsonBody()`. | Verified clean |
| **PERF-1** — `import *` | T6 | 2 known-safe (`json-logic-js`, `@mediapipe/face_detection`). No new wildcards. | Unchanged |
| **PERF-2** — `$effect` churn | T6 | No new `$effect` blocks in today's commits. New admin proxy-capture pages have zero `$effect` usage (correct — they use `$state` + `$derived` only). Cross-field validation clearing in form pages is inside the existing `updateAnswerByKey` handler — not a new reactive subscription. | Verified clean |
| **OBS-1/OBS-2** — Observability | T6 | Unchanged. | Unchanged |

---

## Findings (this review)

### High — none

### Medium

#### M2 — `check-dsa` + `signup` success paths still use raw `json()` (carry-forward)

Both auth routes return non-`apiOk`-shaped envelopes. Migration to `apiOk()` is a wire-contract change affecting login page, partner-signup, hooks, and Android app consumers. Tracked as dedicated DX-4 session.

#### M3 — Missing rate limiting on 5 DATA-1/DATA-2 mutating endpoints (carry-forward)

Same 5 endpoints as prior review: POST/DELETE lead-vault, POST btdc-vault, POST btdc-vault/revoke, POST cron/data2-revoke-sweep. Not modified today. Still server-side only (no UI consumers).

### Low

#### L2 — PII (email) in billing logger (carry-forward)

[`src/routes/api/billing/trial-reminder/+server.ts:85`](src/routes/api/billing/trial-reminder/+server.ts:85): `logger.warn({ err, email }, ...)` logs DSA email to production logs. Replace with `{ err, dsaId }`.

#### L3 — Admin proxy-capture PATCH/submit routes have no rate limiting (new, informational)

| Route | Auth | Rate limit |
|-------|------|------------|
| `POST /api/admin/policies/proxy-capture` | admin + rule_authoring | **30/hr** ✅ |
| `PATCH /api/admin/policies/proxy-capture/[id]` | admin + rule_authoring | **Missing** |
| `POST /api/admin/policies/proxy-capture/[id]/submit` | admin + rule_authoring | **Missing** |
| `GET /api/admin/rm-search` | admin | **60/min** ✅ |

**Context:** The PATCH endpoint is the autosave target — it will be called frequently by the wizard. The submit endpoint is a one-off action per capture. Both routes require admin role + `rule_authoring` permission + demo-write block, making abuse extremely unlikely. The create and search routes already have rate limiting.

**Recommendation:** Not urgent. If desired, add a generous rate limit to PATCH (e.g., 120/min/admin) and submit (e.g., 10/hr/admin) for defense-in-depth. The permission gates make this low-risk.

**Severity rationale:** Low/informational because: (a) high-privilege admin-only routes, (b) narrow `rule_authoring` permission requirement, (c) PATCH is an idempotent autosave (re-sending doesn't amplify), (d) submit transitions `draft→submitted` only once.

---

## Commit-Level Analysis

### Rule Engine Fix (`2dceaa10`) — Critical Review

**Change:** Property-not-identified secured flow — 3-part fix across evaluationEngine, evaluate-and-persist endpoint, and AffordabilityOverview UI.

**evaluationEngine.ts:**
- New traffic light branch for `propertyIdentified === false`: uses `foirEligibleAmount > 0` (income-based) instead of `offeredAmount` (which is always 0 when there's no requested loan amount). Logically sound — when there's no property, the only meaningful signal is whether the applicant's income supports any lending at all.
- `evaluatePayload()` exemption: `isUnidentifiedSecured` check prevents early-return on `loanAmount <= 0` — allows the affordability back-calculator to run. Correctly scoped: only triggers when `propertyIdentified === false AND isSecuredLoan()`.

**evaluate-and-persist/+server.ts:**
- Parallel exemption: `propertyNotIdentified` check uses `=== false` (strict comparison, not falsy) — correct. For unsecured loans, `propertyIdentified` is `undefined`, so `!== false` evaluates to `true`, keeping the validation strict.

**AffordabilityOverview.svelte:**
- Removed duplicate `₹` prefix from 12 template expressions — `formatCurrency()` already returns `₹X.XX L/Cr`. This was a double-₹ display bug (`₹₹12.3L`).

**Test coverage:** 2 new test files: `loanAmountValidation.test.ts` (+38 tests), `propertyNotIdentifiedTrafficLight.test.ts` (+101 tests). Regression tests cover the income-based traffic light assignment.

**Assessment:** Clean, well-scoped, well-tested. No security or correctness concerns.

### Admin Proxy-Capture (A.2 Slices 1-2) — `868f7aae` + `769d8507`

**Backend (`868f7aae`):**

3 new API routes + 1 new type file + rmHelpers extension.

| Route | Auth | Rate limit | Body validation | Response |
|-------|------|------------|-----------------|----------|
| `POST /api/admin/policies/proxy-capture` | admin + rule_authoring + blockDemoWrite | 30/hr/admin ✅ | Zod `bodySchema` ✅ | `apiOk`/`apiError` ✅ |
| `GET /api/admin/rm-search` | admin | 60/min/admin ✅ | URL param length check ✅ | `apiOk`/`apiError` ✅ |

Security-specific review:
- `rm-search` uses `escapeRegex()` before building `$regex` query — **ReDoS safe** ✅
- Mobile lookup uses `findUserByMobile` (CSFLE-aware deterministic query) — correct ✅
- Response returns only `mobileLast4` (not full mobile) — **PII-minimized** ✅
- `createProxyRmStub` checks for existing RM by mobile before creating — **idempotent** ✅
- PII (name, email) encrypted via `encryptUserPii()` before insert — **CSFLE compliant** ✅
- New stub marked `provisioned_by: 'admin_proxy'` + `profileStatus: 'profile_incomplete'` — clean provenance

**Frontend (`769d8507`):**

3 new pages + reuse of existing `PolicyCaptureWizard.svelte`.

- Step 0 (new page) uses `secureFetch` for POST, raw `fetch` for GET typeahead — correct CSRF posture
- Wizard reuse passes `apiBase` prop pointing to admin-scoped capture endpoint — clean separation from RM self-capture
- Admin-scoped SSR load function (`+page.server.ts`) fetches capture doc with `admin_manual_proxy` filter — correctly prevents admin from editing RM self-captures through admin routes

### RM Settings Auto-Provision (`0fb59186`)

**8 files changed** across rmHelpers, guards, types, 2 new endpoints, SSR load, page.

- `POST /api/rm/profile/complete`: Zod validation, rate-limited 5/hr/user, CSFLE encryption, idempotent update. **Clean.**
- `ensureRmProfile()`: auto-provisions `profile_incomplete` doc on first RM login if none exists. Avoids the "RM can't access Settings" dead-end.
- Settings page gracefully handles 3 states: incomplete (setup form), active (edit view), error/loading.
- `set-role/+server.ts`: added `ensureRmProfile()` call on RM role switch — guarantees the doc exists before the Settings page loads.

**Security check:**
- New endpoint uses `requireRoleApi('rm')` — correct (only the RM themselves can complete their own profile)
- CSFLE `encryptUserPii()` applied to PII fields before `$set` — correct
- Fallback lookup by mobile when ObjectId lookup fails — handles edge case where admin-provisioned RM has a different `_id` than the auth user

### Cross-Field Validation Error Clearing (`97794046`)

**New function:** `clearStaleValidationErrors()` in `formWizardEngine.ts`. Optimistically clears server-side validation errors when the user edits a field, making Next re-enable immediately. The authoritative re-check still runs on Next-click via `evaluateOnServer`.

**Parity verified:** All 6 form pages (`home-loan`, `lap`, `plot-loan`, `personal-loan`, `business-loan`, `professional-loan`) import and call `clearStaleValidationErrors`. Wired inside `updateAnswerByKey` with an `!evaluating` guard (prevents clearing during server evaluation).

**Test coverage:** `loanPageValidationTiming.test.ts` extended with +17 tests verifying the wiring. The test statically asserts that `updateAnswerByKey` calls `clearStaleValidationErrors` in all 6 form pages.

**Pitfall #21 compliance:** `debouncedEvaluate(currentPageIndex)` grep returns **0 matches** in form pages — correct. Per-keystroke server evaluation remains OFF.

### DATA-4 Analytics Warehouse (`3fdba220..a0e84523` + `94f2ac41`)

8 slices + 1 type-fix commit implementing the de-identified analytics pipeline. Key review points:

- **personIdHmac** (Slice 1): HMAC-SHA256 with `ANALYTICS_PEPPER`, one-way, irreversible. Pepper loaded from `$env/dynamic/private`. Correct cryptographic choice.
- **De-identification helpers** (Slice 3): Age→bracket, income→bracket, industry→sector, city→region-tier. All reduce granularity to k-anonymous buckets.
- **buildAnalyticsCase** (Slice 4): Orchestrates de-identification. Explicitly nulls `person_id` in v1 (documented decision — PAN absent from payload).
- **ETL job** (Slice 5): Batch processing with cursor, idempotent upsert by `case_id`. Run-audit log via `analytics_etl_runs` collection. Gated behind `ANALYTICS_ETL_ENABLED` env flag.
- **Privacy contract test** (Slice 6): Statically asserts forbidden fields list — any new field addition to analytics case requires explicit review.
- **Type fix** (`94f2ac41`): Resolved 2 type errors in `etlJob.ts` caught by pre-push hook. Confirms the gotcha documented in SESSION-HANDOFF (dev server masks type errors).

### UI/UX Mobile Refresh (`6c7cfc8e`)

28 files. Cosmetic changes: removed per-question `labelClass` dark-mode overrides, replaced with centralized CSS. `schemaComposer.test.ts` updated to strip `labelClass` from composed schemas.

No logic changes, no form question additions/removals, no `showWhen` modifications. No behavioral risk.

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| **Admin routes** | 3 new endpoints with proper guards (admin + rule_authoring + blockDemoWrite). 2 of 3 rate-limited. |
| **RM profile** | New profile-complete endpoint: Zod validated, rate-limited, CSFLE-encrypted. |
| **CSFLE integration** | New proxy-capture uses `decryptUserPii`/`encryptUserPii`/`findUserByMobile` correctly. |
| **PII minimization** | rm-search returns `mobileLast4` only. Analytics warehouse fully de-identified. |
| **ReDoS** | `escapeRegex()` applied before `$regex` in rm-search. |
| **Rule engine** | Property-not-identified exemption correctly scoped to `propertyIdentified === false` (strict). |
| **XSS** | Unchanged. Same approved `{@html}` sites. |
| **CSRF** | New admin page uses `secureFetch` for POST, raw `fetch` for GET (correct). |

## Performance Summary

| Metric | Status |
|--------|--------|
| Bundle | No new client-side dependencies. DATA-4 is server-only. Proxy-capture pages are admin-only (lazy-loaded). |
| Reactive efficiency | No new `$effect` blocks. Cross-field clearing is synchronous (no new subscriptions). |
| DB queries | rm-search uses `.limit(10)` — bounded. ETL job uses cursor-based batch processing — memory-safe. |

## Blast Radius Summary (T9)

**Shared modules changed in this session:**

| Module | Risk | Reason |
|--------|------|--------|
| `src/lib/ruleEngine/evaluationEngine.ts` | **Medium** | New traffic-light branch for `propertyIdentified === false`. Only affects secured loans where property isn't identified — narrow scope. Well-tested (101 tests). |
| `src/routes/api/evaluate-and-persist/+server.ts` | **Low** | New exemption for `propertyNotIdentified` on loanAmount validation. Strict `=== false` comparison prevents false matches on unsecured loans. |
| `src/lib/utils/formWizardEngine.ts` | **Low** | New `clearStaleValidationErrors()` function — additive only. Existing functions unchanged. |
| All 6 form `+page.svelte` files | **Low** | New `clearStaleValidationErrors` call inside `updateAnswerByKey`. Gated by `!evaluating`. No change to existing isNextEnabled logic. |
| `src/lib/server/rmHelpers.ts` | **Low** | +3 new exported functions (`ensureRmProfile`, `resolveRmDoc`, `createProxyRmStub`, `shapeRmProfile`). All additive — no modification to existing functions. |
| `src/lib/database/mongo.ts` | **Low** | +2 collection registrations (`analytics_cases`, `analytics_etl_runs`) via DATA-4. All additive. |
| `src/routes/api/set-role/+server.ts` | **Low** | Added `ensureRmProfile()` call — only fires for RM role switch. Fail-safe: if provisioning fails, role switch still succeeds (existing behavior). |
| `src/lib/components/dashboard/results/AffordabilityOverview.svelte` | **Low** | Removed duplicate `₹` prefix from 12 template interpolations. `formatCurrency()` already includes the symbol. Display-only fix. |

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `return json()` carry-forward routes (DX-4) | 108 files | **108 files** | Unchanged |
| SEC-5 BOLA routes audited | 147 | 147 | Unchanged |
| CSFLE-encrypted routes | 36 | **39** | **+3** (proxy-capture create, rm-search, rm/profile/complete) |
| Auth rate-limited routes | 19 | **22** | **+3** (proxy-capture create, rm-search, rm/profile/complete) |
| Contrast pairs | 456/456 | 456/456 | Unchanged |
| TODO/FIXME/HACK count | 35 / 13 files | 16 / 7 files | **−19 / −6** (likely from UI refresh cleanup) |
| Test count | 11,302 | **11,371** | **+69** |
| Error boundaries | 3 (root, `(app)`, dashboard) | 3 | Unchanged — `(auth)` gap persists |

---

## Top 5 Actions

1. **[M3, carry-forward] Add rate limiting** to the 5 DATA-1/DATA-2 mutating endpoints before UI integration (POST/DELETE lead-vault, POST btdc-vault, POST revoke, cron sweep).
2. **[M2, carry-forward] Auth route `json()` migration** — track as DX-4 dedicated session. Wire-contract change requires consumer updates.
3. **[L2, carry-forward] Fix PII in billing logger** — replace `{ err, email }` with `{ err, dsaId }` in `trial-reminder/+server.ts` lines 85 and 119.
4. **[L3, new] Add rate limiting** to admin proxy-capture PATCH (120/min/admin) and submit (10/hr/admin) — low-risk but defense-in-depth.
5. **[Standing] Add `(auth)` error boundary** — `+error.svelte` missing under `src/routes/(auth)/`.

---

*Report generated: 2026-05-20. Reviewer: automated daily review (Full profile, T1-T9).*
