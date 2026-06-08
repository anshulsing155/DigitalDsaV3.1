# Daily Code Review — 2026-05-27

## Header

**Profile:** Full (T1-T9) — 35 commits in 24hr window across 5 workstreams (D.1 S3 close, S4 full impl, S5 dunning, S6 lifecycle, SEC-8 SES). Largest feature surface in a single day. Full profile triggered by >10 commits + billing/auth changes.
**Reviewed against:** committed `main` @ **`652b3fd8`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-26.md`](CODE-REVIEW-2026-05-26.md) (baseline @ `7ce90395`).
**Delta range:** `7ce90395..652b3fd8` — 35 commits.
**Contrast audit:** [`CONTRAST-AUDIT-2026-05-27.md`](CONTRAST-AUDIT-2026-05-27.md) (auto-generated)
**Authors this window:** Prashant (single author — no cross-team risk from BLAST-9).

| Command | Status | Result | Delta vs `2026-05-26` |
|---------|--------|--------|------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 233 files, **12,114 tests** | +175 tests, +15 test files |
| `pnpm test:contrast` | PASS | **456/456 pairs** | unchanged |
| `git log … co-authored-by` | PASS | 0 matches (last week) | unchanged |

---

## Commits Reviewed (35, oldest first — grouped by workstream)

### Workstream A — D.1 S3 Charge Cron Close (scheduling + smoke)

| SHA | Subject | Surface |
|-----|---------|---------|
| `012d41f1` | d1(s3 m1): collections + types for charge cron / reminder cron / audit / lock | 5 files — mongo.ts, billingSubscription.ts, billing endpoints |
| `1fc86c01` | d1(s3 m2): chargeEngine + cronLock + billingAuditLog | 6 new files (1,626 ins) — engine core, idempotency, lock |
| `cc5ee1a4` | d1(s3 m3+m4): billing-charge cron endpoint + pre-charge reminder cron | 4 new files (558 ins) |
| `8c5e06bc` | d1(s3 m5): wire charge.succeeded/charge.failed webhook handlers | 2 files (180 ins) |
| `26bc6023` | d1(s3 m6): simulate-charge test driver + S3 smoke runbook | 2 files (569 ins) |
| `dcbf8b01` | docs: close D.1 S3 — Pitfall #61 + handoff/changelog/plan updates | docs only |
| `ce1eb64a` | docs(plan): flip D.1 S3 to SHIPPED | docs only |
| `e3a68bba` | d1(s3 m6 follow-up): fix failed_attempt_count not incrementing on dunning entry | 3 files (88 ins) |
| `c8ec2dde` | docs(runbook): cron-job.org setup guide | docs only |
| `041991ff` | scripts: idempotent cron-job.org scheduler setup | 1 file (284 ins) |
| `5a06a0d0` | fix(security): CSRF middleware must skip /api/cron/* endpoints | 2 files (110 ins) |
| `c759ba09` | docs: D.1 S3 close — smoke + scheduler wiring + CSRF fix logged | docs only |

### Workstream B — D.1 S4 Retry State Machine

| SHA | Subject | Surface |
|-----|---------|---------|
| `e3a7c77a` | d1(s4 m1): state-machine self-loops for retry failures within dunning | 2 files (76 ins) |
| `93ee0abc` | d1(s4 m2): chargeEngine retry scheduling + recovery email | 1 file (237 ins) |
| `21bbbd33` | d1(s4 m3): POST /api/billing/subscription/retry-now + in-flight race fix | 2 files (184 ins) |
| `3c183cac` | d1(s4 m4): tests — retry timing + recovery + manual mode + race protection | 2 files (350 ins) |
| `ab082c5d` | d1(s4 m5): close — smoke runbook + session docs | docs only |
| `227051fa` | d1(s4 m6 follow-up): 2 critical bugs surfaced by smoke + locked | 5 files (205 ins) |

### Workstream C — D.1 S5 Dunning Escalation + S6 Lifecycle

| SHA | Subject | Surface |
|-----|---------|---------|
| `16ed8267` | feat(D.1 S5): dunning escalation cron + emails + persistent in-app banner | 16 files (2,483 ins) |
| `d4a98fe2` | feat(D.1 S6 M1+M2): pause / resume / cancel endpoints | 4 files (672 ins) |
| `652b3fd8` | fix(billing/test): broaden mockEvent return type for resume/cancel handlers | 1 file (7 ins) |

### Workstream D — SEC-8 Email Hardening + SES Bounce/Complaint

| SHA | Subject | Surface |
|-----|---------|---------|
| `73fa8b9a` | sec-8(m1+m2+m3): AWS SES v2 adapter + provider-routing facade + tests | 5 files (923 ins) |
| `d23bf34b` | sec-8(m4+m5): operator setup runbook + close docs | 4 files (350 ins) |
| `eb42950a` | debug(sec-8): add diagnostic logging to sendEmail() | 1 file (29 ins) |
| `beb79ce0` | sec-8: revert diagnostic logging + fix runbook IAM policy | 2 files (8 ins / 35 del) |
| `02553e88` | feat(email): SES bounce/complaint SNS webhook + suppression list | 9 files (857 ins) |
| `07b63417` | docs(SES): operator runbook for SES bounce/complaint SNS setup | 1 file (218 ins) |

### Workstream E — Form Fixes + UI Design Token Refresh

| SHA | Subject | Surface |
|-----|---------|---------|
| `5ce6790f` | test(pitfall-55): widen onInput/validateOnInput scan to cover RendererInputField | 1 file (98 ins) |
| `b4cb0b3c` | fix(income-form): 3 team-reported issues — FY table draft, NRI profile auto-clear, restore diagnostic | 5 files (234 ins) |
| `704b00a7` | fix(forms): sort city/state options A→Z + redirect to login on 401 submit | 2 files (51 ins) |
| `b45d8bf2` | docs(end): close team-bugs session + Pitfall #62 | 5 files (170 ins) |
| `7f15971e` | test(IncomeProfileSelector): static-scan lock for Pitfall #62 auto-drop $effect | 2 files (169 ins) |
| `1e47d178` | fix(home-loan): capture intended location pre-approval + hide stale question | 5 files (189 ins) |
| `19afc944` | fix(home-loan): hide pincode + area on the pre-approval location picker | 3 files (63 ins) |
| `55b5bbb3` | ui(forms): design-token refresh across applicant + director + form components | 19 files (406 ins / 385 del) |
| `ea9ebedf` | fix(D.1 S3): point cron-job.org URLs at canonical host www.rinn.in | 2 files (14 ins) |

### Workstream F — Docs / Session Close

| SHA | Subject | Surface |
|-----|---------|---------|
| `6120fb62` | docs(plan): flip header | docs only |
| `4dff934e` | docs(plan): flip D.1 S4 to SHIPPED | docs only |
| `92d66319` | docs(/end): close session — Active Handoff | docs only |
| `08d5e539` | docs: SEC-8 close — CLAUDE.md §8 flip + CHANGELOG | docs only |
| `cd6157bf` | docs: SEC-8 close — operator setup live end-to-end | docs only |

---

## Standing Grep Rules — Full T1-T6 + T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch in .svelte | T1 | 0 mutating raw fetch. `SubscribeRecurringSection.svelte:59` unchanged (GET only). `DunningBanner.svelte` uses `secureFetch` for retry POST — **compliant**. | improved (new POST uses secureFetch) |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | Same 8 approved non-archive, non-sanitized instances (Toast icon, JsonLd, 4 loan pageDescription, NoteWorthyMessage, admin policies). New components (`DunningBanner`, `DunningEmails`) use plain text interpolation. Zero new `{@html}`. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 5 hits — all legitimate: `logger.ts` (2), `telemetry.ts` (3). All new billing server files (`chargeEngine`, `dunningEngine`, `dunningEmails`, `dunningBannerState`, `cronLock`, `billingAuditLog`, `reminderEngine`, `snsValidator`, `suppressionList`) use `logger` exclusively. **SEC-8 debug logging added (eb42950a) then cleanly reverted (beb79ce0).** | unchanged |
| **G (Co-Authored-By)** | T1 | 0 in last week (matches in commit body text are review-doc references, not trailer lines) | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | All matches are test fixtures or enum constants. New billing test files use `'test-*'` prefix fixtures. `dunningEmails.ts` `PUBLIC_BILLING_URL` is a public URL, not a secret. | unchanged |
| **SEC-2 (PII in logging)** | T1 | New billing files log `dsa_id` (ObjectId) and `state`. `mandate_token` redacted in simulate-charge. `dunningEmails.ts` logs nothing — only sends via `sendEmail`. | unchanged |
| **SEC-3 (cookie security)** | T1 | No new `cookies.set()` | unchanged |
| **SEC-4 (eval/exec)** | T1 | Same known pre-existing: RegExp.exec in recencyScore, child_process in test-runner and test scan. No new instances. | unchanged |
| **SEC-5 (env var exposure)** | T1 | `VITE_VAPID_PUBLIC_KEY` only | unchanged |
| **SEC-6 (rate limiting)** | T1 | **All 3 new S6 endpoints (pause/resume/cancel) rate-limited** at 10/hr/user. New cron endpoint (`billing-dunning-advance`) uses `x-cron-secret` auth (rate limiting not applicable for cron). SES webhook uses signature verification + TopicArn match (rate limiting not applicable). Prior M1 (subscription/status) unchanged. | **improved** (3 new rate-limited endpoints) |
| **SEC-7 (client storage PII)** | T1 | `DunningBanner.svelte` stores no data client-side (state comes from server on each nav). | unchanged |
| **B (Capacitor proxy at scope)** | T2 | No new Capacitor references | unchanged |
| **C (window.location.reload)** | T2 | 12 files — 1 fewer than prior (13). Likely a removed reference in _archive or a component. All remaining are in approved locations. | -1 (minor cleanup) |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 0 | unchanged |
| **SSR-1 (hydration mismatch)** | T2 | `DunningBanner.svelte` uses `$derived.by(() => { … Date.now() … })` for day computation — this runs at render time. **However**, the component only mounts when `data.dunningBanner` is truthy (server says "yes, dunning") so the date-derived value matches what the server side produces for the conditional check. No hydration mismatch — the component itself is client-only in its date computation (sticky banner re-renders client-side). | Reviewed — no issue |
| **SSR-2 (Svelte 5 `$state` init from prop)** — Pitfall #10 | T3 | `DunningBanner.svelte` uses `$props()` → `$derived` chain. No `$state(prop)` anti-pattern. `pnpm check` 0 `state_referenced_locally`. | unchanged |
| **H1 (`state_referenced_locally`)** | T3 | 0 via `pnpm check` | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | No new JSON-Logic config changes in this delta | unchanged |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 0 non-whitelisted uses | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 | unchanged |
| **CQ-2 (memory leaks: setInterval/addEventListener)** | T3 | No new intervals. `DunningBanner` is pure reactive (no timers). | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 0 in non-test files | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 4 boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | **37** across 16 files. New entries: `subscribe-recurring/+server.ts` (1), `email.ts` (2), `LocationGroup.svelte` (3 — pre-existing, LocationGroup was already tracked). **0 new in billing or email provider files.** | +2 net (email.ts TODO markers from SEC-8 facade comments) |
| **S (contrast audit)** | T3 | 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | All 6 required headers present in `hooks.server.ts` | unchanged |
| **PH-3 (API response consistency)** | T5 | All new billing endpoints use `apiOk`/`apiError`/`apiServerError`. SES bounce webhook uses raw `new Response()` for 4 error cases (400/401/403/503) — **intentional**: SNS expects plain HTTP responses, not JSON envelopes. Success path uses `apiOk()`. See L1 observation. | compliant (webhook exception documented) |
| **PH-5 ($where/$function)** | T5 | 0 | unchanged |
| **PH-7 (parseJsonBody coverage)** | T5 | New S6 endpoints (pause/resume/cancel) take no request body — no parsing needed. SES bounce webhook reads `request.text()` directly (SNS sends text/plain mime with JSON body). Cron endpoints use `x-cron-secret` header only. | compliant |
| **PERF-1 (import \*)** | T6 | 3 pre-existing — unchanged | unchanged |
| **PERF-3 (invalidateAll)** | T6 | 1 new instance: `DunningBanner.svelte:99` — `await invalidateAll()` after successful retry. Correct: re-runs `+layout.server.ts` to refresh banner state. | +1 (correct usage) |
| **BUILD-3 (typecheck)** | T3 | 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 12,114/12,114 (+175) | improved |

### T4 — Conditional Rules (triggers from today's commits)

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | `package.json` changed (new `@aws-sdk/client-ses` dep) | `"engines": { "node": "22.x" }` — correctly pinned. `@aws-sdk/client-ses` is ESM-native, requires Node 18+. No version conflict. |
| **CJS→ESM noExternal audit** | New `@aws-sdk/client-ses` dependency | `@aws-sdk/client-ses` is ESM-native — does NOT need noExternal entry. Verified: the SDK is only imported in server files (`sesProvider.ts`), never SSR-rendered. Vite's default SSR externalization handles it correctly. |
| **P (auto-clear parity)** | `propertyLocation.ts` changed (home-loan location) | 6/6 form pages import `clearStaleOptionValues`. LocationGroup hide/show changes flow through the existing `showWhen` mechanism — no new auto-clear logic needed. Compliant. |
| **P42 (reload detection)** | No `getEntriesByType` changes | Only `isReloadOfCurrentPath.ts` (approved util) + tests. n/a. |
| **P46 (director auto-income sync)** | No director flow changes today | n/a |
| **P47 (pre-submit ConfirmModal)** | No form submit flow changes | n/a |
| **CSRF cron skip (P-new)** | `hooks.server.ts` CSRF skip extended to `/api/webhook/*` | Verified: webhook prefix skip requires each webhook to implement its own auth (SNS signature for SES bounce, HMAC for Razorpay). SES bounce endpoint verifies `TopicArn` + signature BEFORE any state mutation. Razorpay webhook verifies HMAC. Both pattern-matched to the `/api/cron/*` skip rationale. **Compliant — no new attack surface.** |
| **O (payload snapshot drift)** | No payload schema changes today | n/a |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | **`src/lib/database/mongo.ts`** — touched: 4 new collection exports (`ChargeAttempts`, `BillingAuditLogs`, `CronLocks`, `ProcessedWebhookEvents`) + associated indexes. All additive. 272 existing importers unaffected. **`src/hooks.server.ts`** — touched: CSRF skip extended to `/api/webhook/*` prefix (was `/api/cron/*` only). Additive conditional — no existing CSRF behavior changed. **`src/routes/+layout.server.ts`** — touched: `loadDunningBannerState(locals)` added to root layout load. The helper short-circuits before Mongo for non-DSA/unauthenticated contexts — cost is one function call + two `if` checks on the hot path (RM, admin, public pages). |
| **BLAST-2 (type file changes)** | `src/lib/types/billingSubscription.ts` — extended with `ChargeAttemptDoc`, `CronLockDoc`, `BillingAuditLogDoc`. All additive new types — no existing interfaces narrowed. `src/lib/types/index.ts` — 20 new lines for SES event types. Additive. |
| **BLAST-3 (API response shape changes)** | No `apiResponse.ts` changes. All new endpoints follow the `apiOk/apiError` envelope. SES bounce webhook uses raw `Response` for error cases (intentional — see PH-3). |
| **BLAST-4 (auth logic changes)** | `hooks.server.ts`: CSRF skip for `/api/webhook/*`. Each webhook validates its own credentials. No JWT or role logic changed. |
| **BLAST-5 (store/state changes)** | No client-side store changes. `DunningBanner` reads from SSR data (`data.dunningBanner`), not a store. |
| **BLAST-7 (schema/config changes)** | `propertyLocation.ts` (home-loan question bank): `showWhen` conditions modified to hide pincode/area on pre-approval. `wizardSections/homeLoan.ts`: section restructured for intended-location step. Both localized to home-loan flow — no cross-loan impact. |
| **BLAST-8 (database changes)** | `mongo.ts` adds 4 new collections + indexes. All additive. Existing 46 collections + 108 indexes unchanged. New `CronLocks` TTL (10min) and `BillingAuditLogs` TTL (6yr = 189,216,000s) are appropriate for their use cases. |
| **BLAST-9 (multi-author)** | Single author (Prashant). No cross-team risk. |
| **BLAST-10 (root layout)** | `+layout.server.ts` gains `dunningBanner` in the return shape. `+layout.svelte` conditionally renders `DunningBanner` when `data.dunningBanner` is truthy. **Impact on non-DSA pages**: negligible — `loadDunningBannerState` returns `null` on first `if` check (role !== 'dsa'). **Impact on DSA pages**: one additional Mongo query per navigation when subscription exists and is in dunning. Covered by `dsa_id` unique index — O(log n). |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `DunningBanner.svelte` uses hardcoded hex colors, not design tokens

**Rule:** UI consistency, dark-mode token discipline (feedback_dark_mode_tokens.md)
**File:** [`src/lib/components/DunningBanner.svelte:171-196`](src/lib/components/DunningBanner.svelte:171)
**Confidence:** 55%

The dunning banner uses 6 hardcoded hex color pairs (light + dark) via `@media (prefers-color-scheme: dark)`. This shipped in the same 24hr window as commit `55b5bbb3` which did a design-token refresh across 19 files specifically to eliminate hardcoded colors.

**Mitigating factors:**
- The banner is intentionally high-visibility and non-dismissible — urgency-scaled colors (yellow → orange → red) are purpose-designed for the dunning funnel
- Design tokens may not have the right semantic slots for "urgency-level-N" banners
- The contrast audit passes 456/456 with these values

**Risk:** Low. If the project's theme system later introduces a dark mode toggle (vs system preference), these colors won't respond to it. The `prefers-color-scheme` media query matches system preference, not the app's `data-scheme` attribute.

**Suggested action:** When/if the billing dashboard UI gets a design review, evaluate whether the dunning banner should use `var(--warning-*)` / `var(--error-*)` semantic tokens. Not urgent.

---

### M2 — `+layout.server.ts` dunning banner load runs on every navigation

**Rule:** PERF-3 (invalidateAll scope)
**File:** [`src/routes/+layout.server.ts:8`](src/routes/+layout.server.ts:8)
**Confidence:** 50%

`loadDunningBannerState(locals)` runs on every SvelteKit server load (every navigation, every `invalidateAll()` call). For non-DSA contexts, this is a 2-line short-circuit (cheap). For DSA contexts with no subscription, this is a `findOne` with projection on the `dsa_id` unique index (~5ms). For DSAs in dunning, same cost.

**Impact analysis:**
- Non-DSA (RM, admin, public): ~0ms (returns null before Mongo)
- DSA without subscription: ~5ms per nav
- DSA in dunning: ~5ms per nav + banner render

This is acceptable at current scale. The risk is if the billing collection grows very large or if the index is somehow not present — but `ensureIndexes()` in `mongo.ts` creates it.

**Not a blocking issue** — flagged at Medium for awareness. If performance profiling later shows load-function latency regression on DSA dashboard, this is the first place to check.

---

### M3 — SES bounce webhook uses raw `new Response()` for error cases

**Rule:** PH-3 (API response consistency)
**File:** [`src/routes/api/webhook/ses-bounce/+server.ts:70-96`](src/routes/api/webhook/ses-bounce/+server.ts:70)
**Confidence:** 45%

Four error responses use `new Response('text', { status: N })` instead of `apiError()`. The success paths correctly use `apiOk()`. The inconsistency is intentional — SNS expects plain HTTP status codes (it retries on 5xx, drops on 4xx, confirms on 2xx) and doesn't parse JSON response bodies.

**Risk:** Very low. The inconsistency is architecturally justified. Documented here so future reviewers don't re-discover it.

**No fix required** — pattern is correct for webhook endpoints.

---

### M4 — Prior review M1 unfixed: `subscription/status` lacks rate limiting

**Rule:** SEC-6
**File:** [`src/routes/api/billing/subscription/status/+server.ts`](src/routes/api/billing/subscription/status/+server.ts)
**Confidence:** 65%

Carried forward from 2026-05-26 M1. GET endpoint used for 2s-interval polling (up to 30 calls per auth-return). Auth-guarded but no rate limit. The new S6 endpoints (pause/resume/cancel) all have rate limiting — this endpoint is now the only billing endpoint without it.

**Suggested fix:** `rateLimit(userId, { windowMs: 10_000, max: 60 })`.

---

## Low Findings / Observations

### L1 — `snsValidator.ts` mixes static + dynamic `node:crypto` imports

**File:** [`src/lib/server/emailProviders/snsValidator.ts:29,76`](src/lib/server/emailProviders/snsValidator.ts:29)

`createVerify` is statically imported at line 29, but `createPublicKey` is dynamically imported via `await import('node:crypto')` at line 76 inside `fetchCert()`. Both are from the same module. This works correctly (the dynamic import resolves from cache since the module is already loaded), but is stylistically inconsistent. Likely an artifact of iterative development.

**No action needed** — code correctness is unaffected.

### L2 — `dunningEmails.ts` has 2 TODO markers

**File:** [`src/lib/server/billing/dunningEmails.ts`](src/lib/server/billing/dunningEmails.ts)

The file contains 2 TODO comments related to future email template enhancements (i18n, personalized retry-schedule in copy). Both are tracked in the spec's roadmap (Epic H). Not a code quality issue — these are legitimate deferred items.

### L3 — chargeEngine dunning integration is well-structured

**File:** [`src/lib/server/billing/chargeEngine.ts`](src/lib/server/billing/chargeEngine.ts)

The first-failure email (`sendDunningT0Email`) fires only on `active → dunning_t0` (not on self-loops within dunning). This is correct — subsequent escalation emails are sent by the dunning-advance cron, not the charge engine. The separation of concerns is clean:
- chargeEngine: handles payments, fires first-failure email
- dunningEngine: handles day-N escalation math
- dunningEmails: handles template rendering + dispatch

### L4 — `suppressionList.ts` fail-open design is intentional

**File:** [`src/lib/server/emailProviders/suppressionList.ts:96-104`](src/lib/server/emailProviders/suppressionList.ts:96)

On Mongo failure, the suppression check returns the original recipients (fail-open). This is by design — SES's account-level suppression list is the backstop, and a Mongo blip shouldn't block all email sends. The code documents this explicitly. Correct trade-off.

### L5 — `DunningBanner` `daysUntilDowngrade` uses absolute day-N math

**File:** [`src/lib/components/DunningBanner.svelte:59`](src/lib/components/DunningBanner.svelte:59)

`Math.max(0, 8 - daysSinceFailure)` — the "8" is the absolute day-N threshold for `dunning_final → downgraded` from the `DUNNING_ADVANCE_THRESHOLDS` table. This matches the server-side computation. However, when the banner renders in `dunning_t0` state (day 0-2), "8 days until downgrade" is shown — which could confuse a DSA who sees "8 days" and thinks they have plenty of time. The escalating message copy (`messageFor`) handles this well by varying urgency, but the raw number might benefit from showing "N days until next escalation" instead of "N days until downgrade."

**Not a bug** — the copy is accurate. Flagged as a UX observation for the billing dashboard design review.

---

## Commit-Level Analysis

### `16ed8267` — D.1 S5: dunning escalation (largest commit — 2,483 ins, 16 files)

**Architecture review:** Clean 4-layer design — `dunningEngine.ts` (pure math) → `dunningEmails.ts` (templates) → `dunningBannerState.ts` (server-side state) → `DunningBanner.svelte` (client render) → `billing-dunning-advance/+server.ts` (cron endpoint). Each layer has single responsibility.

**Security:**
- Cron endpoint: `x-cron-secret` header auth (same pattern as S3). Consistent.
- `cronLock` prevents double-fire on deploy-time region race. `applyTransition` state precondition is second line of defense. Correct two-layer idempotency.
- Email fires AFTER state transition — failure doesn't roll back. Correct priority (missed email is recoverable, missed state advance is not).
- `DunningBanner` uses `secureFetch` for retry-now POST. CSRF compliant.

**SSR safety:**
- `DunningBanner` server data flows via `+layout.server.ts` → `data.dunningBanner`. Client-side date math in `$derived.by()` — no hydration mismatch risk (the date display is purely client-rendered after the conditional mount check).
- `loadDunningBannerState` returns serializable ISO strings, not Date objects. SSR boundary safe.

**Tests:** 5 new test files (dunningAdvancement, dunningBannerState, dunningBannerWiring, dunningEmails, dunningEngineBatch) — comprehensive coverage of thresholds, edge cases (missing dunning_started_at, paused subs), email dispatch, batch processing.

---

### `02553e88` — SES bounce/complaint SNS webhook + suppression list

**Security review (highest priority for this commit):**
- **SNS signature verification (`snsValidator.ts`):** Correct implementation. SigningCertURL host validation rejects non-`sns.*.amazonaws.com` hosts (prevents cert-from-attacker-host attack). Supports both SignatureVersion 1 (SHA1) and 2 (SHA256). Canonical string construction matches AWS spec (Subject field omitted when absent — a documented gotcha).
- **TopicArn allowlist:** Rejects messages from unexpected topics before processing.
- **Signature before SubscriptionConfirmation:** Correct ordering. A forged SubscriptionConfirmation can't trick the endpoint into subscribing to an attacker-controlled topic because signature verification runs first.
- **Idempotency:** Reuses `ProcessedWebhookEvents` pattern (atomic insertOne on `_id`, duplicate-key = already processed). SNS `MessageId` is globally unique per AWS.
- **Suppression logic:** Only permanent bounces trigger suppression. Transient bounces (temporary mailbox full) skip — correct, as suppressing transient bounces would lose legitimate users.

**CSRF skip for `/api/webhook/*`:**
- Added in `hooks.server.ts`. Each webhook must implement its own authentication. SES bounce endpoint does this via TopicArn + SNS signature. Razorpay webhook does this via HMAC. Pattern is consistent and the CSRF skip doesn't open new attack surface.

---

### `d4a98fe2` — D.1 S6: pause / resume / cancel endpoints

**Security:** All three endpoints have `requireRoleApi('dsa')` + `blockDemoWrite` + rate-limit (10/hr/user). Consistent with existing billing endpoints.

**State machine correctness:**
- **Pause:** Legal from active + all dunning_* states. `paused_from_state` recorded for resume restore. `next_charge_at` cleared on active→paused. Correct.
- **Resume:** Defensive fallback to 'active' if `paused_from_state` is invalid. Different `next_charge_at` handling for active (set to today) vs dunning (leave alone — S4 retry schedule handles it). Correct.
- **Cancel:** Two branches — active (sets `cancel_at_cycle_end`, defers to next billing cycle) vs paused (immediate cancellation). Idempotent for already-flagged active subs. State precondition via atomic `findOneAndUpdate`. Correct.

**One design note:** The cancel endpoint's `cancel_at_cycle_end` branch uses `BillingSubscriptions.findOneAndUpdate` directly instead of `applyTransition` — because this is a flag set, not a state transition. The subscription stays in `active` state until the charge cron processes the flag. This is architecturally correct — `applyTransition` is for state changes, not metadata updates.

**Tests:** `subscriptionLifecycleEndpoints.test.ts` covers all state combinations and edge cases. Comprehensive mocking with proper guard/rate-limiter bypass.

---

### `55b5bbb3` — UI design-token refresh (19 files, 406/385 ins/del)

**Blast radius:** 19 component files touched. All changes are CSS token updates (removing hardcoded `dark:` classes, adjusting padding/spacing). No structural HTML changes, no logic changes, no `bindsTo` key changes.

**Contrast audit:** 456/456 pairs pass — confirms the token refresh didn't break any color contrast ratios.

**Reviewed files:** `AddApplicant.svelte`, `ApplicantFormCard.svelte`, `ApplicantSelect.svelte`, `ApplicantSummaryTable.svelte`, `BooleanSelect.svelte`, `CompanyDeleteDialog.svelte`, `CustomSelect.svelte`, `DirectorFormModal.svelte`, `DirectorRemovePickerModal.svelte`, `Modal.svelte`, `QuestionRenderer.svelte`, `RadioField.svelte`, `RendererInputField.svelte`, `SelectField.svelte`, `TextField.svelte`, `FormStepContainer.svelte`, `SuggestPrimaryBanner.svelte`, `applicantBasicDetailsSecuredLoans.json`, `app.css`. All changes are presentational.

---

### `1e47d178` + `19afc944` — Home-loan pre-approval location fix

**Functional change:** Hides pincode + area fields when the DSA is in the "intended location" (pre-approval) flow where they haven't identified a specific property yet. The location question now captures state + city only for pre-approval, and adds a new "intended location" question rendering path in `ApplicantProfilePage.svelte`.

**Blast radius:** Localized to home-loan flow. `propertyLocation.ts` showWhen conditions updated. Schema test updated. No cross-loan impact.

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New endpoints | 7: `billing-dunning-advance` (cron), `pause`, `resume`, `cancel`, `retry-now`, `ses-bounce` (webhook), `simulate-charge` (dev-only) | All auth-guarded or secret/signature-verified |
| New `{@html}` | 0 | DunningBanner + DunningEmails use plain text |
| New external calls | AWS SES v2 via `sesProvider.ts`, SNS cert fetch in `snsValidator.ts` | SES: server-only. SNS cert: host-validated to amazonaws.com |
| New mongo.ts collections | 4 (`ChargeAttempts`, `BillingAuditLogs`, `CronLocks`, `ProcessedWebhookEvents`) | All additive. Appropriate TTL indexes. |
| New client storage | 0 | DunningBanner reads from SSR data |
| `hooks.server.ts` changes | CSRF skip extended to `/api/webhook/*` prefix | Each webhook has own auth (SNS sig, HMAC) |
| Root layout changes | `dunningBanner` added to server load + client render | Short-circuits for non-DSA; no data leak |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| Root layout load | +1 Mongo query per DSA navigation (covered by unique index, ~5ms). Non-DSA/unauth: 0ms (function short-circuit). |
| Dunning cron | Sequential batch processing — same pattern as charge cron. No concurrency tuning needed at current scale. |
| SES integration | `@aws-sdk/client-ses` is tree-shakeable — only `SESv2Client` + `SendEmailCommand` imported. Bundle impact: server-only, not client. |
| SNS cert cache | In-memory `Map<string, KeyObject>`. Serverless function lifetime = natural TTL. No eviction needed. |
| Suppression list check | +1 Mongo query per `sendEmail()` call (~5ms). Fail-open on error. |
| Email HTML templates | Built with string concatenation, not template engine. Zero-dependency, fast. |

---

## Cross-Team Blast Radius Summary

| Category | Detail |
|----------|--------|
| **Shared modules changed** | `mongo.ts` (272 importers), `hooks.server.ts` (global), `+layout.server.ts` (root), `+layout.svelte` (root) |
| **`mongo.ts` impact** | Additive only (4 new collection exports). All 272 existing importers unaffected. |
| **`hooks.server.ts` impact** | CSRF skip extended to `/api/webhook/*`. Additive conditional — no existing CSRF behavior changed for any other route. |
| **Root layout impact** | `loadDunningBannerState` returns `null` for non-DSA (RM/admin/public) with zero Mongo work. DSA pages get one additional covered query. `DunningBanner` conditionally rendered — zero DOM impact when `data.dunningBanner` is falsy. |
| **Breaking type changes** | 0 — all new types/interfaces are additive |
| **API response shape changes** | 0 — new endpoints follow existing envelope |
| **Consumers to re-test** | Root layout is the main blast-radius concern. The `DunningBanner` conditional guard + `loadDunningBannerState` short-circuit ensure no regression for non-dunning flows. |

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
No changes. `DunningBanner.svelte` uses `secureFetch` (not raw fetch). All prior inventory entries still valid.

### Rule E: `{@html}` Exception Inventory
Unchanged — 8 approved non-archive instances. No new instances.

### Rule C: `window.location.reload()` Inventory
12 files (was 13). Minor cleanup — all remaining in approved locations.

### Rule SEC-6: Rate Limiting Inventory
3 new rate-limited endpoints added:
- `billing/subscription/pause` — 10/hr/user
- `billing/subscription/resume` — 10/hr/user
- `billing/subscription/cancel` — 10/hr/user

Prior M1 (`subscription/status` no rate limit) still open.

---

## Observations

- **35 commits in 24 hours spanning 5 major workstreams — zero regressions.** D.1 S3 (charge cron) went from implementation to production scheduling. D.1 S4 (retry state machine) shipped and smoked. D.1 S5 (dunning) shipped as a single well-structured commit. D.1 S6 (lifecycle endpoints) shipped with full test coverage. SEC-8 (email hardening) went live end-to-end with an operator walkthrough. The interleaving of billing + form + email work didn't produce any cross-contamination.

- **SEC-8 debug→revert cycle (eb42950a → beb79ce0) was clean.** Diagnostic logging added during live SES debugging was fully reverted in the next commit. No residual `console.log` or `[SEC-8 DEBUG]` markers remain. Good hygiene.

- **SNS signature verification is hand-rolled rather than using `aws-sdk`.** The implementation is correct and follows the AWS spec. The trade-off is maintainability (if AWS changes the spec, we update ~80 LOC) vs. dependency weight (no additional SDK package). The spec hasn't changed since 2014, so the risk is very low.

- **Dunning state machine has correct priority ordering.** Email failures don't roll back state transitions. Lock contention returns a clean 200 (not an error). Race conditions hit the `applyTransition` state precondition and no-op. This three-layer defense (lock → state precondition → email-after-transition) is the same pattern as the charge engine and is well-proven.

- **The root layout load change is the highest blast-radius item today.** Every page navigation now calls `loadDunningBannerState`. The short-circuit for non-DSA is fast (2 `if` checks, no Mongo), but this is still a new code path on the critical rendering pipeline. Monitor server-load latency for DSA dashboard pages if performance profiling is ever warranted.

- **`setup-cron-jobs.mjs` is a one-shot operator script, not production code.** It reads API keys from `.env` and provisions cron jobs on cron-job.org. Correctly gated by a manual `node scripts/setup-cron-jobs.mjs` invocation — not in any CI or build pipeline.

---

## Top 5 Actions for Next Session

1. **Check AWS Support case 177987930900751 for production access approval.** SES sandbox-lift is the remaining gate for real-recipient dunning emails. If approved, update `docs/SESSION-HANDOFF.md` and remove the sandbox caveat from `CLAUDE.md` §8.

2. **D.1 S5 smoke test the dunning-advance cron end-to-end** — use the smoke runbook at `docs/runbooks/D1-S5-DUNNING-SMOKE.md`. Wire the cron-job.org scheduler entry for `billing-dunning-advance` at 03:00 IST daily (after the 02:00 IST charge cron).

3. **Rate-limit `subscription/status` endpoint** (carried M1 → M4) — one `rateLimit()` call. Now the only billing endpoint without rate limiting.

4. **D.1 S6 remaining milestones** — M3+ per the spec: DSA-facing UI for pause/resume/cancel buttons on the billing page, 90-day auto-cancel cron for paused subs.

5. **Live repro of Issue #3 (restore-button unresponsive)** — the `clientLogger.warn` from `b4cb0b3c` will surface which ref is null on next teammate repro.
