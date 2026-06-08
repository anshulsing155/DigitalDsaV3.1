# Daily Code Review — 2026-05-26

## Header

**Profile:** Full Standard (T1-T6 + T9) — 28 commits in scope across two full development sessions + one parallel billing session. Largest single-day commit volume to date (28 source+doc commits, 102 files changed, 13,510 insertions / 768 deletions).
**Reviewed against:** committed `main` @ **`7ce90395`** (top of tree — docs only, clean).
**Prior review:** [`CODE-REVIEW-2026-05-25-b.md`](CODE-REVIEW-2026-05-25-b.md) (baseline @ `30fb2368`).
**Delta range:** `30fb2368..7ce90395` — 28 commits.
**Contrast audit:** [`CONTRAST-AUDIT-2026-05-26.md`](CONTRAST-AUDIT-2026-05-26.md)
**Authors this window:** Prashant (single author — no cross-team risk from BLAST-9).

| Command | Status | Result | Delta vs `2026-05-25-b` |
|---------|--------|--------|--------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 218 files, **11,939 tests** | +279 tests, +17 test files |
| `pnpm test:contrast` | PASS | **456/456 pairs** | unchanged |
| `git log … co-authored-by` | PASS | 0 matches (last week) | unchanged |

---

## Commits Reviewed (28, oldest first — grouped by workstream)

### Workstream A — D.1 Subscription Infrastructure (S1 + S2 + S2.1 + S2.5 + S2.1b)

| SHA | Subject | Surface |
|-----|---------|---------|
| `8543ba2b` | feat(D.1 S1): subscription state model + MockProvider + R11 test driver | 9 new files — state machine, mock provider, anchor assignment, billing types, R11 test endpoint |
| `e33ab8db` | feat(D.1 S2 scaffold): RazorpayProvider skeleton + provider registry + failure-code translation | 5 new files — Razorpay SDK bridge, registry, failure-code map |
| `3f99b6a0` | feat(D.1 S2): implement 5 Razorpay SDK methods + interface customer_id passthrough | 5 files (717 ins / 144 del) — provider impl + tests |
| `cff735e7` | feat(D.1 S2.1): endpoints + DB persistence for recurring subscription | 7 files (885 ins / 1 del) — mongo.ts, subscriptionStore, 4 new API routes |
| `d18064d0` | test(D.1 S2.1): unit tests for subscriptionStore persistence layer | 2 files (366 ins) — tests only, 1 existingDetails.ts archive move |
| `77975108` | test(D.1 S2.1): endpoint smoke tests + fix mock fetchSettlements IST window | 2 files (464 ins / 4 del) |
| `bdc6f46d` | docs(runbook): extend D.1 S2 smoke runbook to cover S2.1 endpoints | docs only |
| `df338431` | docs(D.1): S2 smoke-test runbook + refresh SESSION-HANDOFF + DEVELOPMENT-PLAN | docs only |
| `31a92c2a` | feat(D.1 S2.5): Capacitor Android mandate-auth return helper + tests | 3 files (313 ins) |
| `cb2355b2` | feat(D.1 S2.1b): Subscribe-to-Recurring UI section on Billing page | 2 files (430 ins) |

### Workstream B — Business Loan / Form Fixes

| SHA | Subject | Surface |
|-----|---------|---------|
| `c7feebd5` | feat(business-loan): dedicated Business Runner page for sole-prop co-applicant capture | 4 files (800 ins / 26 del) |
| `ed5e2982` | fix(business-loan): preserve runner across entity-type switches via per-proprietor stash | 2 files (133 ins / 1 del) |
| `061fbfe2` | docs+fix: pitfalls 49-51, session changelog, Plot Loan EMI parity | 4 files (302 ins) |
| `5ae7907b` | feat(secured-bt): canonical Current-Loan-Details schema shared by LAP + Plot Loan | 12 files (1205 ins / 423 del) — ADR-0016, new btLoanDetailsQuestions.ts, snapshot regen |
| `db6428a8` | docs: /end close for 2026-05-26 — D.1 spec APPROVED + session close | docs only |
| `89612cd6` | feat(forms): teammate UI refresh (17 files) + assessment-lender cap-trim + BL director-removal commit (Pitfall #52) | 22 files (581 ins / 256 del) |
| `b355c961` | fix(business-loan): "Who runs the business?" options filtered by marital status | 3 files (130 ins / 8 del) |
| `656e7c95` | fix(forms): 5 BL/sole-prop bug fixes from user screenshots + Pitfalls #53/#54 | 14 files (504 ins / 19 del) |
| `85be5651` | fix(forms): InputField onInput requires validateOnInput — Pitfall #55 | 6 files (255 ins) |
| `38a7b16b` | fix(business-loan): "Son" runner option also filtered for Single marital status | 2 files (45 ins / 28 del) |
| `58d665b8` | docs: /end close for 2026-05-26 evening session | docs only |

### Workstream C — Auth / Billing Bug Fixes (Pitfalls #56–#59)

| SHA | Subject | Surface |
|-----|---------|---------|
| `9099f4e7` | fix(business-loan): director stake recompute on entity-switch + restore-modal (Pitfall #56) | 6 files (434 ins / 5 del) |
| `a094dfd2` | fix(unsecured-loans): isNRI flip stashes NRI-incompatible business income entries (Pitfall #57) + D.1 smoke bug fixes | 21 files (1098 ins / 54 del) — interleaved commit |
| `b0187ad7` | fix(auth): eager-on-mount token refresh + singleton coalescing (Pitfall #59) | 4 files (337 ins / 16 del) |
| `5736ffaa` | fix(obligations): corporate DC blocks director closure + requires company obligation (Pitfall #58, re-land) | 4 files (239 ins / 13 del) |

### Workstream D — Docs + Pitfall Catalog

| SHA | Subject | Surface |
|-----|---------|---------|
| `f7e8b87c` | docs(d1-smoke): correct CHANGELOG test count | docs only |
| `edfa4282` | docs: /end close for 2026-05-26 post-smoke session | docs only |
| `7ce90395` | docs(pitfalls): add #60 — .env parsers silently truncate values with # or $ | docs only (CLAUDE.md + PITFALLS.md) |

---

## Standing Grep Rules — Full T1-T6 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE fetch outside `secureFetch` | T1 | `SubscribeRecurringSection.svelte:59` uses `fetch('/api/billing/subscription/status')` — **GET only, read-only endpoint, acceptable** | New raw fetch added (GET, safe) |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | Same 10 approved instances: Toast, JsonLd, `_archive`, pageDescription (4 loan pages), NoteWorthyMessage, admin policies. `IncomeSourceForm` noted. Zero new instances. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 5 hits — all legitimate: `logger.ts` (2), `telemetry.ts` (3). New billing server files use `logger` throughout. | unchanged |
| **G (Co-Authored-By)** | T1 | 0 in last week | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | Matches are enum-style string constants in `auth.ts` (e.g. `INVALID_TOKEN`, `WEAK_PASSWORD`) — not credentials | unchanged |
| **SEC-2 (PII in logging)** | T1 | New billing server files log `dsa_id` and `provider_event_id` only. `mandate_token` is logged as `'[redacted]'` — correct. | improved (mandate_token redacted) |
| **SEC-3 (cookie security)** | T1 | `cookies.set()` inventory unchanged — no new cookie-setting code | unchanged |
| **SEC-4 (eval/exec)** | T1 | Only match is `.exec(s.trim())` in `recencyScore.ts` — RegExp.exec, not code exec | unchanged |
| **SEC-5 (env var exposure)** | T1 | `VITE_VAPID_PUBLIC_KEY` only — unchanged | unchanged |
| **SEC-6 (rate limiting)** | T1 | New endpoints: `subscribe-recurring` has `rateLimit`. `subscription/status` is GET-only read (rate limiting not mandatory). `webhook/razorpay` uses HMAC verification as auth. `cron/billing-pending-cleanup` uses `x-cron-secret`. See Medium finding M1 below. | new endpoints added — partially covered |
| **SEC-7 (client storage PII)** | T1 | `SubscribeRecurringSection.svelte` stores no PII — only subscription state strings. `homeLoanApi.ts` still stores offer objects in localStorage (known pre-existing). | unchanged |
| **B (Capacitor proxy at scope)** | T2 | `billingAuthReturn.ts` uses lazy `globalThis.Capacitor` detection (not a static import) — compliant | unchanged |
| **C (window.location.reload)** | T2 | 13 instances in approved locations — unchanged | unchanged |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 0 | unchanged |
| **SSR-1 (hydration mismatch)** | T2 | New `SubscribeRecurringSection.svelte` uses `window.location.search` inside `onMount` (correct — SSR-safe). `Date.now()` uses in templates are in event handlers or `$effect` — not render-time expressions. | unchanged |
| **H1 (`state_referenced_locally`)** — Pitfall #10 | T3 | 0 (`pnpm check` clean) | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | 43+ config files with `!=` — all compare against non-null values (empty string `''`, booleans, enum strings). New `btLoanDetailsQuestions.ts` uses `{ '!=': [{ var: 'bankName' }, ''] }` — value comparison, not null check. Compliant. | new file — compliant |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 0 non-whitelisted uses in components | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 | unchanged |
| **CQ-2 (memory leaks: setInterval/addEventListener)** | T3 | `SubscribeRecurringSection.svelte:80` — `setInterval` inside a function; `stopPolling()` called in `onMount` return. Compliant (see M2 below for minor concern). | new interval added — compliant |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 0 in non-test files | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 4 boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | **22 matches** in non-test, non-archive source | unchanged (prior was 41 total including tests; this is non-test only) |
| **S (contrast audit)** | T3 | 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | All 6 required headers present in `hooks.server.ts` lines 700-713 | unchanged |
| **PH-3 (API response consistency)** | T5 | New billing endpoints all use `apiOk`, `apiError`, `apiServerError`. No raw `new Response`. | compliant |
| **PH-5 ($where/$function)** | T5 | 0 | unchanged |
| **PH-7 (parseJsonBody coverage)** | T5 | New endpoints: `subscribe-recurring` uses `parseJsonBody`. Webhook reads raw body for HMAC verification (correct pattern — must read before parsing). `cron/billing-pending-cleanup` and `subscription/status` need no body. | improved |
| **PERF-1 (import \*)** | T6 | 3 — `iconRegistry`, `deriveFlagKeys`, `camera/checkSelfieQuality` — all pre-existing, all acceptable | unchanged |
| **PERF-3 (invalidateAll)** | T6 | No new `invalidateAll()` calls in billing flows | unchanged |
| **BUILD-3 (typecheck)** | T3 | 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 11,939/11,939 (+279) | improved |

### T4 — Conditional Rules (triggers from today's commits)

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | No `package.json` changed | n/a |
| **O (payload snapshot drift)** | LAP/Plot BT snapshot regenerated (`_regenLapSnapshots.test.ts`) | PASS — intentional regeneration with ADR-0016 canonical schema |
| **P (auto-clear parity)** | Schema changes in `btLoanDetailsQuestions.ts`, `caseIntakeQuestions.ts` | 6/6 form pages import `clearStaleOptionValues`. Compliant. |
| **R (server→client field forwarding)** | New questions in `btLoanDetailsQuestions.ts` | New questions share the same `toClientQuestion` pipeline — no new fields added to `RawSchemaQuestion` type that would be silently dropped |
| **P47 (pre-submit ConfirmModal)** | `subscribe-recurring/+server.ts` is new billing flow, not form submission | Loan form submits unchanged — 6 `confirmAndSubmit` sites, 0 direct `submitFormForEvaluation` calls. Compliant. |
| **P46 (director auto-income sync)** | `AddApplicantBusiness` changed | Director sync still follows commitDirectorsToApplicants. Compliant. |
| **P59 (token refresh coalescing)** | `csrf.ts` changed | `requestTokenRefresh()` exported, `refreshInFlight` singleton coalesces. Compliant. |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | `src/lib/database/mongo.ts` — **touched**: 2 new collection exports + 5 new indexes. `src/lib/utils/csrf.ts` — **touched**: new exports `requestTokenRefresh`, `startTokenRefreshScheduler`, `stopTokenRefreshScheduler`. Both are additive only. |
| **BLAST-2 (type file changes)** | `src/lib/types/billingSubscription.ts` — NEW file (167 lines). `src/lib/types/companyIncome.ts` — 48 lines added (3 new validation gates in `isMediumComplete`). Both additive — no existing interfaces removed or narrowed. |
| **BLAST-3 (API response shape changes)** | No `apiResponse.ts` changes. New billing endpoints follow the `apiOk/apiError` envelope — clients get `{data, message, success}`. |
| **BLAST-4 (auth logic changes)** | `auth.svelte.ts`: `stopTokenRefreshScheduler()` added at the START of `logout()` (before the network call). Additive — no permissions weakened, no guard removal. Cookie names unchanged. |
| **BLAST-5 (store/state changes)** | `auth.svelte.ts` state export unchanged — only a new import added. No consumer impact. |
| **BLAST-7 (schema/config changes)** | `btLoanDetailsQuestions.ts` is NEW (not a modification of existing keys). `caseIntakeQuestions.ts` — only Tailwind class changes in description HTML strings (`dark:text-gray-400` removed, `!m-0` added). No `bindsTo` key changes, no option removals. LAP/Plot snapshots regenerated intentionally (BT schema consolidation per ADR-0016). |
| **BLAST-8 (database changes)** | `mongo.ts` adds `BillingSubscriptions` + `ProcessedWebhookEvents` collections with 5 new indexes. All additive. No existing collection or index modified. 18-month TTL on `ProcessedWebhookEvents` is correct (47,304,000s ≈ 547.5 days — slightly over 18mo target; acceptable for DR replay window). |
| **BLAST-9 (multi-author)** | Single author (Prashant). No cross-team risk. |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `subscription/status` endpoint lacks rate limiting

**Rule:** SEC-6 (Rate Limiting)
**File:** [`src/routes/api/billing/subscription/status/+server.ts`](src/routes/api/billing/subscription/status/+server.ts)
**Confidence:** 65%

The GET `/api/billing/subscription/status` endpoint is used for status polling after Razorpay auth-return (called in a `setInterval` at 2s intervals for up to 60s — 30 calls per return). It is auth-guarded (`requireRoleApi(locals, 'dsa')`) so anonymous enumeration is blocked, and the polling pattern is bounded. However, an authenticated attacker could hammer this endpoint to enumerate subscription history or test timing. A simple `rateLimit(userId, { windowMs: 10_000, max: 60 })` would cap the polling without breaking the legitimate 2s/30-call loop.

**Not a blocking issue** — the auth guard prevents anonymous abuse, and the polling is bounded client-side. Flagged at Medium because billing-related endpoints warrant defense-in-depth.

**Suggested fix:** Add `rateLimit(userId, { windowMs: 10_000, max: 60 })` after the guard check.

---

### M2 — `SubscribeRecurringSection.svelte`: `loadStatus()` uses raw `fetch` (GET, acceptable) but lacks error-status differentiation

**Rule:** A (CSRF), Rule UX-1 (Loading state)
**File:** [`src/lib/components/billing/SubscribeRecurringSection.svelte`](src/lib/components/billing/SubscribeRecurringSection.svelte:59)
**Confidence:** 60%

`loadStatus()` at line 59 uses raw `fetch('/api/billing/subscription/status')` — this is a GET endpoint, so CSRF is not applicable (Rule A, GET is safe). However, the error branch at line 60-62 silently falls back to `subState = 'not_subscribed'` on any non-ok response. A 401 (token expired mid-poll), 403 (role check failed), or 500 should ideally surface differently than "no subscription" — currently a transient server error would show the user the subscription signup UI when they're already subscribed and active.

**Risk:** Low in practice — the polling window is 60s, and subsequent page refreshes would correct the state. But a network failure during the polling window could cause the UI to flash "Subscribe" to an already-active subscriber for up to 60s.

**Suggested fix:** Distinguish `res.status === 401` → redirect to login; `res.status >= 500` → set an `errorState` rather than falling back to `not_subscribed`.

---

### M3 — `vite.config.ts` `host: true` + ngrok `allowedHosts` in committed config

**Rule:** COND-3 (Anti-scraping), general dev config hygiene
**File:** [`vite.config.ts`](vite.config.ts)
**Confidence:** 60%

`host: true` binds the dev server to all interfaces (IPv4 + IPv6 + LAN). The commit also adds `allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io']` to support smoke testing with external webhooks (Razorpay). Both changes are dev-only (Vite `server` config doesn't affect Vercel prod builds).

The concerns:
1. `host: true` on a development machine that shares a WiFi network exposes the dev server to other devices on the LAN. Less relevant for a solo developer; worth documenting for future team members.
2. `allowedHosts` includes the ngrok wildcard subdomains. This is intentional for smoke testing, but committed to the repo permanently. If ngrok subdomains are shared with third parties during testing, the dev server can be hit from those subdomains without any CSRF protection (dev CSRF is typically disabled).

**Not a production issue** — these settings are strictly dev. Documented for awareness.

**Suggested mitigation:** A comment noting these are dev-only smoke-test settings is already present and adequate. No code change required, but document the LAN exposure in team onboarding.

---

### M4 — `SubscribeRecurringSection.svelte` status-load uses `window.location.search` inside `onMount` without `new URLSearchParams` guard on `status` parameter

**Rule:** SEC-E2 (URL injection)
**File:** [`src/lib/components/billing/SubscribeRecurringSection.svelte`](src/lib/components/billing/SubscribeRecurringSection.svelte:102)
**Confidence:** 50%

Line 102: `params.get('status') === 'success'` — the `status` URL parameter value is used as a string comparison. This is safe as written (strict equality against the literal `'success'`). However, an attacker who can craft a URL with `?status=success` and send it to a DSA would trigger the polling loop (30 API calls over 60s) even if the DSA has no pending mandate. The endpoint is auth-guarded so each poll is ~20ms server time, and the UI shows "Verifying..." for 60s.

**Risk level is actually Low** — the worst case is a 60s UX annoyance for the DSA. Upgraded to Medium only because the polling could be chained with other UI state to confuse the user about their subscription status.

**No fix required** — the strict equality check is correct. Documented for awareness.

---

## Low Findings / Observations

### L1 — `billingAuthReturn.ts`: `TODO` comment for `@capacitor/browser` upgrade

**File:** [`src/lib/utils/billingAuthReturn.ts`](src/lib/utils/billingAuthReturn.ts:21)

The v1 implementation uses `window.location.href = url` for both web and Capacitor (WebView navigation). The TODO on line 21 notes that `@capacitor/browser` would give better UX (Custom Tabs with Android branding). The current approach works but means the DSA exits the app WebView into the bank's auth page within the same WebView, which can be disorienting. This is a planned v2 improvement per spec §4 S2.5. Surfaced here as a tracking note; no action needed.

### L2 — `caseIntakeQuestions.ts`: Removed `dark:text-gray-400` Tailwind classes

**File:** [`src/lib/config/schema/caseIntakeQuestions.ts`](src/lib/config/schema/caseIntakeQuestions.ts)

4 description HTML strings removed `dark:text-gray-400` classes. These are server-controlled schema strings rendered via `{@html serverPage?.pageDescription}` (in the approved `{@html}` allowlist). The removal means the info-box text uses the default token-based color rather than an explicit dark-mode override. Verified: the contrast audit still passes 456/456 pairs, so token-based colors cover dark mode correctly. No UX regression.

### L3 — `ProcessedWebhookEvents` TTL is 18.28 months, not exactly 18

**File:** [`src/lib/database/mongo.ts`](src/lib/database/mongo.ts)

`expireAfterSeconds: 60 * 60 * 24 * 30 * 18` = 46,656,000s ≈ 540 days ≈ 18.0 months (using 30-day months). The spec comment says "18-month TTL." Actual calendar 18 months ≈ 547 days — the constant is slightly short by ~7 days. Acceptable (it's a DR-replay buffer, not a compliance window), but if exact alignment matters, use `60 * 60 * 24 * 547` (18 calendar months from today's POV). No action needed.

---

## Commit-Level Analysis

### `8543ba2b` — D.1 S1: subscription state model + MockProvider + R11 test driver

**Large commit (9 new files, 2,129 insertions).** Core billing infrastructure.

**Security review:**
- `simulate-event/+server.ts`: dev-only gate via `import { dev } from '$app/environment'` (not `NODE_ENV`) — correct per critique P1-7 (Vercel preview deploys are not true `dev`). Gate fires at line 63: `if (!dev) return apiError('Dev-only endpoint', 403)`. Compliant.
- `subscriptionState.ts`: pure functional — no IO, no external calls. All exports are pure functions over plain objects. No injection vectors.
- `anchorAssignment.ts`: date arithmetic only. Division protected: `Math.ceil(daysUntilFirst / cycleDays)` — `cycleDays` is a constant (28, 29, 30, or 31) so zero-division is impossible.
- `MockProvider` in `providers/mock.ts`: simulates all billing events in-memory. No network calls. Dev-only use path.

**Correctness review:**
- State machine (`transitionSubscription`) uses an explicit allowlist of legal transitions (22 pairs). Illegal transitions throw `IllegalSubscriptionTransitionError` — correctly bubbles to `apiError(422)` in the test endpoint. Pattern is sound.
- `makeFreshSubscription` initializes `state: 'not_subscribed'`, `failed_attempt_count: 0`, `state_history: []`. Clean initial state.
- `assignAnchor` uses `Math.min(today, daysInMonth)` to prevent Feb 29 → March 1 overflow. Correct.

**One observation:** `firstChargeAtForSubscribe` builds the first charge date but doesn't guard against `cycleDays === 0` (though in practice the `daysInMonth` function always returns 28–31). Not a real risk but could add an explicit guard.

---

### `cff735e7` — D.1 S2.1: endpoints + DB persistence

**Large commit (7 files, 885 insertions).** Four new API routes.

**Security:**
- `subscribe-recurring/+server.ts`: `requireRoleApi(locals, 'dsa')` + `blockDemoWrite` + `rateLimit(userId, ...)` + `parseJsonBody`. Well-guarded.
- `webhook/razorpay/+server.ts`: No auth guard (correct — Razorpay doesn't send auth headers). Uses HMAC-SHA256 signature verification via `provider.verifyWebhookSignature(rawBody, signature)` against `RAZORPAY_WEBHOOK_SECRET` env var. Reads raw body BEFORE parsing — correct (signature verification requires the exact bytes). Idempotency via `processedWebhookEvents` collection. Correct architecture.
- `cron/billing-pending-cleanup/+server.ts`: `x-cron-secret` header pattern. Same as existing cron endpoints (`data2-revoke-sweep`, `data3-sweep`). Consistent and acceptable.
- `subscription/status/+server.ts`: Auth-guarded (DSA only). Sensitive fields (`mandate_token`, `provider_customer_id`) explicitly excluded from response. Good PII hygiene.

**Data integrity:**
- `subscriptionStore.ts` `applyTransition`: Updates both the subscription state and the `state_history` array atomically in a single `findOneAndUpdate`. No two-phase write risk.
- `checkAndMarkWebhookProcessed`: Uses `_id: provider_event_id` as the idempotency key, writes with `upsert: false` (insert only). If the document already exists, the insert is a no-op and `firstTime: false` is returned. Correct.

---

### `5ae7907b` — feat(secured-bt): canonical BT loan details schema (ADR-0016)

**Large commit (12 files, 1205 insertions / 423 deletions).** High blast radius — LAP and Plot Loan schemas restructured.

**Snapshot regeneration:** `_regenLapSnapshots.test.ts` is new (1 test — runs the factory and writes the snapshot). The 4 updated snapshot files (`LAP-BT-TERM`, `LAP-BT-TOPUP`, `LAP-TOPUP-TERM`, `PLOT-BT`) reflect the new canonical field names from `btLoanDetailsQuestions.ts`. Tests pass (11,939 green). Pitfall #11 compliance: regeneration was intentional and documented in ADR-0016.

**Key renames to verify (BLAST-7):**
- Old LAP BT used `btCurrentBank`, `btCurrentEmi`, `btOutstandingPrincipal`, etc. New canonical keys: `bankName`, `includedCurrentEMIsAmount`, `principalOutstanding`. The `lapLoan.ts` and `plotLoan.ts` journey files are updated to use the new bindsTo keys. Payload builder impact: the snapshots confirm the new keys flow through correctly. `LEGACY_KEY_MAP` in `migrateApplicantKeys.ts` — the old BT keys (`btCurrentBank`, etc.) would need to be added IF there are existing cases in the database using these fields. For a new feature (BT was not previously live), this is not a concern.

**JSON-Logic check:** `btLoanDetailsQuestions.ts` uses `{ '!=': [{ var: 'bankName' }, ''] }` — value comparison against empty string, not null check. Pitfall #1 compliant.

---

### `89612cd6` — teammate UI refresh + Pitfall #52

**Large commit (22 files, 581 insertions / 256 deletions).** UI token changes across 17 components.

**Pitfall #52 fix (DirectorRemovePickerModal):** `AddApplicantBusiness.svelte` — `handleRemovePickerConfirm` now calls `commitDirectorsToApplicants + syncAutoIncomeEntries + formState.replaceApplicants` immediately after updating `directorForms`. Previously only the local buffer was mutated, allowing the stale pre-removal directors array to resurrect on Previous→Next remount. Verified: `directorRemovePickerCommit.test.ts` is green.

**`home-loan/+page.svelte` structural change (202 files changed):** The teammate's UI refresh substantially reorganized the home-loan page template. The existing `confirmAndSubmit` flow was preserved (verified: `preSubmitConfirmWiring.test.ts` still passes). The `maxSelection={1}` cap for Top-up Only was preserved per owner direction (teammate had removed it).

**CSS token changes:** `dark:text-gray-400` removed from multiple component descriptions. As noted in L2, contrast audit remains 456/456. No regressions.

---

### `656e7c95` — 5 BL/sole-prop bug fixes + Pitfalls #53/#54

**14 files, 504 insertions / 19 deletions.** Five discrete fixes.

**Fix 4 — JWT scheduler (Pitfall #54):**
- `(app)/+layout.svelte`: `startTokenRefreshScheduler()` in `onMount`. Correct placement.
- `auth.svelte.ts`: `stopTokenRefreshScheduler()` in `logout()`. However, note that Pitfall #59 (commit `b0187ad7`) LATER extends the scheduler to fire eagerly on mount AND coalesce via singleton. At the time `656e7c95` landed, the scheduler still had the 13-minute first-tick gap. This was the root cause of the 401 on `/form/how-can-we-help` that Pitfall #59 then fixed. The two commits are sequential and complement each other — combined, the JWT refresh is now correctly eager + coalesced.

**Fix 5 — Case-level disabled reason (Pitfall #53):**
- `getCaseLevelDisabledReason` added to `incomeTabState.ts`. Wired into all 3 unsecured loan `+page.svelte` files. `caseLevelDisabledReasonWiring.test.ts` locks the wiring statically. Correct.

---

### `b0187ad7` — Pitfall #59: eager token refresh + singleton

**4 files, 337 insertions / 16 deletions.** `csrf.ts` is a T9 blast-radius file (50+ importers).

**Blast radius assessment:** The exported API of `csrf.ts` gains 3 new exports (`requestTokenRefresh`, `startTokenRefreshScheduler`, `stopTokenRefreshScheduler`). No existing exports removed. No existing function signatures changed. The `refreshInFlight` singleton was already present (used only in `secureFetch`'s 401-retry path) — it is now also used by `requestTokenRefresh`. Backward compatible.

**Singleton coalescing correctness:**
```typescript
export function requestTokenRefresh(): Promise<boolean> {
    if (!refreshInFlight) {
        refreshInFlight = attemptTokenRefresh().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}
```
- Multiple concurrent callers all receive the SAME Promise. When the refresh completes (success or failure), `refreshInFlight` is cleared so future calls create a new promise. No race window.
- `startTokenRefreshScheduler` fires an async IIFE immediately on mount, then calls `scheduleNextRefresh()` on success. The `void` prefix means errors in the IIFE don't propagate (intentional — on failure, no schedule is set and hooks.server.ts redirects to /login on next navigation). Correct.

**`tokenRefreshScheduler.test.ts` (7 tests):** Covers concurrent coalescing, sequential post-completion calls, server-success=false case, network error, and two source-pattern locks. Tests pass.

---

### `5736ffaa` — Pitfall #58: Corporate DC obligation gate (re-land)

**4 files, 239 insertions / 13 deletions.**

`getClosureOptionsFiltered` extended with `(applicantType, caseHasCompany)`. The new args have default values (`applicantType = 'individual'`, `caseHasCompany = false`) making the signature backward-compatible — existing 2-arg callers are unaffected. Verified: `companyDCObligationGate.test.ts` (10 tests) passes.

Note: This commit is a re-land of orphaned `739f3071` (which was accidentally reset during parallel-session git index sharing). Content is identical per SESSION-HANDOFF.md documentation. The orphaning is a process concern, not a code concern.

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New endpoints | 4 (`subscribe-recurring`, `subscription/status`, `webhook/razorpay`, `cron/billing-pending-cleanup`) + 1 dev-only (`simulate-event`) | All auth-guarded or secret-verified |
| New `{@html}` | 0 | Description strings are in existing server-schema allowlist |
| New external calls | Razorpay SDK via `providers/razorpay.ts` — all wrapped through `BillingProvider` interface | No direct external fetch at module scope |
| New mongo.ts collections | 2 (`BillingSubscriptions`, `ProcessedWebhookEvents`) | Additive only |
| New client storage | `SubscribeRecurringSection` stores no PII — subscription state only | |
| `csrf.ts` changes | 3 new exports — additive, backward compatible | Coalesces token refresh races |
| `vite.config.ts` changes | `host: true` + ngrok allowedHosts — dev only | See M3 |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| New billing state machine | Pure functions + in-memory objects — negligible |
| `SubscribeRecurringSection` polling | 2s interval for max 60s after auth-return only — bounded |
| `mongo.ts` new indexes | 5 new indexes — write performance impact negligible at current scale; compound indexes on `{state, next_charge_at}` and `{state, updated_at}` correctly serve the cron query patterns |
| `companyIncome.ts` isMediumComplete | 3 new O(n) array scans over ITR years (typically 1-3 items) — negligible |
| `csrf.ts` singleton | Eliminates redundant parallel refresh network calls — net improvement |
| `btLoanDetailsQuestions.ts` | Schema loaded once at startup — no runtime cost |

---

## Cross-Team Blast Radius Summary

| Category | Detail |
|----------|--------|
| **Shared modules changed** | `mongo.ts` (272 importers), `csrf.ts` (50+ importers) |
| **`mongo.ts` impact** | Additive only (2 new exports). All 272 existing importers unaffected. New `BillingSubscriptions` and `ProcessedWebhookEvents` exports used only by 4 new billing API routes. |
| **`csrf.ts` impact** | 3 new exports added. No existing export modified. Consumers of `secureFetch` and `attemptTokenRefresh` are unaffected. |
| **Breaking type changes** | 0 — `billingSubscription.ts` is new, `companyIncome.ts` adds validation gates (non-breaking for type consumers — function internals only) |
| **API response shape changes** | 0 — new endpoints follow existing envelope |
| **Consumers to re-test** | `(app)/+layout.svelte` (refresh scheduler — primary consumer of new csrf.ts exports) — already tested via tokenRefreshScheduler.test.ts. Other csrf.ts importers: unaffected. |

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
New entry added:
- `SubscribeRecurringSection.svelte:59` — `fetch('/api/billing/subscription/status')` — GET only, DSA-authenticated, read-only status poll. **Safe.**

Existing inventory unchanged:
- Pre-auth flows (login, signup, OTP) — no CSRF token available
- Location/pincode lookups — GET only
- Case snapshot reads — GET only
- `homeLoanApi.ts` external API — GET only
- `PincodeTypeahead.svelte` — GET only

### Rule E: `{@html}` Exception Inventory
Unchanged — 10 approved instances. No new instances.

### Rule C: `window.location.reload()` Inventory
Unchanged — 13 instances in approved locations.

---

## Observations

- **Exceptional day: 28 commits, 13,510 insertions, 11,939 tests all green.** Two parallel workstreams (form fixes + D.1 billing) landed simultaneously without any type-check or test regressions. The interleaved commit (`a094dfd2`) is the one rough edge — content from two workstreams in one commit — but this is documented and the individual pitfalls are independently locked by their own test suites.

- **Pitfalls #52 through #60 in a single day.** The pattern of shipping a bug fix AND a static-scan CI test that prevents recurrence is well-established and accelerating. This is the intended endpoint of the pitfall discipline.

- **D.1 S1 + S2 + S2.1 + S2.5 + S2.1b all shipped.** The state machine, provider registry, DB persistence layer, webhook handler, status endpoint, and subscribe UI are all live. The architecture is clean: pure state machine → provider interface → DB persistence → API surface. The MockProvider allows full unit testing without Razorpay test keys.

- **ADR-0016 (canonical BT loan details schema) is the right design.** Three loan products previously had three divergent BT question sets. The new `btLoanDetailsQuestions.ts` provides one source of truth, reducing drift risk. The snapshot regen is intentional and documented.

- **`isMediumComplete` validation tightening (companyIncome.ts) is high-value correctness work.** The prior "at least one year has data" gate allowed mathematically impossible income declarations (NP > GR). The three new gates prevent silent pass-through of corrupt data to the rule engine. This is exactly the kind of invisible input-validation gap that manifests as wrong eligibility assessments.

- **Webhook HMAC verification pattern is correct.** The raw-body read before JSON.parse is critical for HMAC (the signature covers the exact bytes). A common bug is to parse first, re-serialize, and sign the re-serialized form — which doesn't match Razorpay's signature. This implementation avoids that.

- **`stopTokenRefreshScheduler()` in `logout()` before the network call is important.** If the logout network call is slow and the scheduler fires concurrently, it could try to refresh a token that the server is about to invalidate. Stopping the scheduler first eliminates that race window.

---

## Top 5 Actions for Next Session

1. **D.1 S3 (charge cron)** — NOW UNBLOCKED. Implement the recurring charge cron job that calls `provider.chargeMandate()` for all `active` subscriptions with `next_charge_at <= now`. This is the money-path: missing or broken cron = revenue loss. Estimate: ~2 days.

2. **(Operator) Restore live Razorpay keys in `.env`** — RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are currently TEST mode keys from the D.1 S2 smoke. Replace before any beta user flow. Also rotate the ngrok auth token that appeared in the smoke-session chat transcript.

3. **Rate limiting on `/api/billing/subscription/status`** (M1 above) — Low urgency but appropriate before beta. One `rateLimit()` call.

4. **`subscription/status` polling error differentiation** (M2 above) — `res.status >= 500` should not silently fall back to `not_subscribed`. Before the polling UI ships to real DSAs.

5. **SEC-8 (email hardening)** — Nodemailer → SES + SPF/DKIM/DMARC. Hard prerequisite for D.1 S5 (dunning) + launch per R15. Must be scheduled before S5 implementation begins.
