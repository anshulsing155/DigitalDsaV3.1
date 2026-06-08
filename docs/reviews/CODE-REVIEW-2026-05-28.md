# Daily Code Review — 2026-05-28

## Header

**Profile:** Full (T1-T9) — 45 commits in 24hr window across 9 workstreams (D.1 S6 M3-M7, D.1 S7 reconciliation, D.1 S8 skip, D.2 invoicing, billing trial + device-id, archived route stubs + Pitfall #63, rule engine audit fixes, form fixes, UI design token refresh). Largest commit-count day on record. Full profile triggered by >10 commits + billing/auth/rule-engine changes.
**Reviewed against:** committed `main` @ **`023512a0`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-27.md`](CODE-REVIEW-2026-05-27.md) (baseline @ `652b3fd8`).
**Delta range:** `652b3fd8..023512a0` — 45 commits.
**Authors this window:** Prashant (single author — no cross-team risk from BLAST-9).

| Command | Status | Result | Delta vs `2026-05-27` |
|---------|--------|--------|------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 262 files, **12,407 tests** | +293 tests, +29 test files |
| `pnpm test:contrast` | PASS | **456/456 pairs** | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines (mentions in commit bodies are review-doc references) | unchanged |

---

## Commits Reviewed (45, oldest first — grouped by workstream)

### Workstream A — D.1 S6 M3-M7 (Lifecycle Management)

| SHA | Subject | Surface |
|-----|---------|---------|
| `fff2d65a` | feat(d.1 s6 m3): update-payment-method endpoint + webhook swap + advisory lock | 11 files (1,064 ins) |
| `f2916f0e` | feat(d.1 s6 m4): change-plan endpoint with asymmetric upgrade/downgrade | 2 files (639 ins) |
| `f195a42f` | feat(d.1 s6 m5): Manage subscription panel (3 tabs) + transactions endpoint | 4 files (1,386 ins) |
| `943c832e` | feat(d.1 s6 m6): 90-day pause auto-cancel cron + day-60 reminder | 5 files (797 ins) |
| `ee61edde` | docs(d.1 s6 m7): smoke runbook + cross-module integration tests | 2 files (751 ins) |
| `b78b974f` | docs: D.1 S6 M3-M7 close | docs only |

### Workstream B — D.1 S7 Reconciliation

| SHA | Subject | Surface |
|-----|---------|---------|
| `d38130d6` | feat(d.1 s7): daily reconciliation cron + engine + drift email | 7 files (1,520 ins) |
| `804e7a70` | feat(d.1 s7): admin reconciliation view | 2 files (589 ins) |
| `57fddac9` | chore(d.1 s7): provisioner + smoke runbook | 2 files (283 ins) |
| `027ae496` | docs: D.1 S7 close | docs only |

### Workstream C — D.1 S8 Skip (Legacy Retirement + Billing Dashboard Rewrite)

| SHA | Subject | Surface |
|-----|---------|---------|
| `ba3fdab2` | chore(d.1 s8 skip): archive legacy one-time-pay routes | 4 files (8 ins) |
| `aac42b42` | feat(d.1 s8 skip): plan reads via BillingSubscriptions (planResolver) | 6 files (261 ins) |
| `a191facb` | feat(d.1 s8 skip): billing dashboard rewrite + legacy-data archival hooks | 5 files (239 ins) |
| `29258212` | docs: D.1 implementation complete | docs only |

### Workstream D — Billing Trial + Device-ID

| SHA | Subject | Surface |
|-----|---------|---------|
| `f361ddf7` | feat(billing trial): schema + collection + trialEligibility module | 4 files (745 ins) |
| `be9673c4` | feat(billing trial): wire trial through subscribe + webhook + status + charge | 5 files (223 ins) |
| `2565bb06` | feat(billing trial): UI — subscribe CTA + manage banner + disclosure modal | 2 files (215 ins) |
| `d049cc10` | feat(billing trial): trial-ending email + admin override endpoint | 2 files (208 ins) |
| `797b8e47` | feat(billing trial device-id): schema + module extension + tests | 3 files (230 ins) |
| `a07f0da5` | feat(billing trial device-id): wire client → subscribe → webhook → UI | 5 files (241 ins) |
| `e2afe655` | docs: ADR-0018 trial-abuse defense | docs only |
| `99c6fd18` | docs: ADR-0018 amendment + spec update | docs only |

### Workstream E — D.2 Invoicing

| SHA | Subject | Surface |
|-----|---------|---------|
| `8be710b7` | feat(d.2): Invoices + InvoiceCounters schema + collection registration | 2 files (181 ins) |
| `b7596176` | feat(d.2): invoice engine + PDF renderer + invoice-ready email + 19 tests | 5 files (1,312 ins) |
| `ddb39571` | feat(d.2): API endpoints + Transactions tab Invoice column + chargeEngine hook | 7 files (318 ins) |
| `beca1c22` | docs: ADR-0019 inclusive-pricing decision | docs only |

### Workstream F — Archived Route Stubs (Pitfall #63)

| SHA | Subject | Surface |
|-----|---------|---------|
| `b1a6d2ee` | fix(build): stub archived da-topup route to unbreak Vercel build | 1 file (14 ins / 154 del) |
| `43c7e1d8` | chore(archive): convert 3 remaining _archived_* billing routes to 410 stubs | 5 files (148 ins / 448 del) |
| `a9948e71` | chore(pitfall-63): lock archived-route stub invariant in pre-push hook + vitest | 4 files (240 ins / 242 del) |

### Workstream G — Rule Engine Fixes (Senior-Teammate Audit)

| SHA | Subject | Surface |
|-----|---------|---------|
| `dac1bca2` | fix(rule-engine): normalize 'Plot Loan' to canonical name + 10 tests | 5 files (134 ins) |
| `084ec605` | fix(rule-engine): guard Mode C bridge scenario against FOIR overshoot | 2 files (174 ins) |
| `97f968ca` | fix(rule-engine): apply LCR cap to offered amount | 3 files (137 ins) |
| `4dc7c08d` | fix(rule-engine): MAX tenure was silently floored to 12 months | 2 files (162 ins) |
| `09dde629` | fix(payload): BT/Topup/Plot Construction sizing — BUG-A/B/D + 28 tests | 16 files (981 ins / 398 del) |
| `175994ea` | fix(rule-engine): Top-up Only LTV exposure + Resale DP boundary — BUG-F/G + 10 tests | 4 files (193 ins) |
| `023512a0` | docs: audit Session 3 entry (BUG-F/G + BUG-H verified false) | docs only |

### Workstream H — Form Fixes

| SHA | Subject | Surface |
|-----|---------|---------|
| `05f2c1e7` | fix: block past months on "Planned registration month" picker | 7 files (185 ins) |
| `ba5110bd` | fix: reject non-India registrationCountry to block FEMA persistence | 2 files (144 ins) |
| `518a19cb` | fix: block 2+ guarantors on secured loans | 3 files (286 ins) |
| `f39ba1f2` | fix: hide Close-by-loan on BT-only flows | 7 files (260 ins) |
| `b310b1a1` | fix: register q1_bankName resolver for Plot/LAP BT | 2 files (128 ins) |
| `8e10cee4` | fix: NBFC single-applicant advisory fires on secured loans only | 3 files (205 ins) |
| `964498e2` | fix: pass currentCompanyId to DirectorFormModal in BL + Professional | 3 files (133 ins) |
| `07dcb012` | fix: render all 5 income tabs for Guarantor (Financial) on secured loans | 2 files (132 ins) |
| `7c125ac1` | fix: month picker enforces 7-day lead-time on current month | 2 files (37 ins) |
| `3595bd11` | fix(form): wire monthYear picker for plot-loan + LAP BT disbursement date | 2 files (52 ins) |
| `62dd4f6c` | fix(loan-switch): register page-index fields with chokepoint | 1 file (47 ins) |
| `62e2e794` | docs: lock Guarantor eligibility spec | docs only |
| `f1e1150d` | docs: log Guarantor eligibility roadmap item | docs only |

### Workstream I — UI / Infra / Docs

| SHA | Subject | Surface |
|-----|---------|---------|
| `383f9e8f` | merge(ui): apply teammate UI tweaks to 8 files | 8 files (119 ins / 86 del) |
| `21738588` | fix(dark-mode): replace hardcoded background:white with theme tokens | 3 files (19 ins) |
| `d102f86d` | fix(admin): add Billing nav-link to admin sidebar | 1 file (11 ins) |
| `5eef8874` | feat(billing): one-extra-case gesture on case-limit gate | 1 file (39 ins) |
| `e35f015c` | feat(SES): route all sends through SES_CONFIGURATION_SET | 1 file (12 ins) |
| `f4f21c97` | refactor(urls): env-driven PUBLIC_APP_BASE_URL for outbound links | 11 files (92 ins) |
| `85eb2f50` | refactor(crons): move all cron-secret endpoints under /api/cron/* | 6 files (181 ins) |
| `95bde4ac` | fix: resolve 7 open findings from past code reviews | 7 files (196 ins) |
| `360eb5c0` | docs: deployment context — pin operator actions to rinn Vercel project | docs only |
| `a8b2d9e7` | docs: session close | docs only |
| `c1d1c072` | docs: UI merge + production fixes session entry | docs only |
| `4a6e026a` | docs: Pitfall #63 + BT/Topup payload sizing handoff | docs only |
| `83c7a2ac` | docs: CHANGELOG night entry | docs only |
| `fa828c81` | docs: daily code review report 2026-05-27 | docs only |
| `8670b04b` | docs: HL pre-approval fix + UI/CSS addendum | docs only |
| `c1b664e7` | docs: D.1 S5 + SES bounce + S6-M1+M2 + refactors close | docs only |
| `9d7a8ae3` | docs: review-audit sweep + 7 code fixes close | docs only |

---

## Standing Grep Rules — Full T1-T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch in .svelte | T1 | 0 violations. All mutating calls use `secureFetch`. New billing UI components (`ManageSubscriptionPanel`, `SubscribeRecurringSection`) — all POST calls go through `secureFetch`. | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | 10 hits total, 0 violations. 2 new in `IncomeSourceForm.svelte` — both use `sanitizeHtml()`. | +2 (both safe) |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 7 hits total: `logger.ts` (2), `telemetry.ts` (3) — approved. 2 double-commented `// //console.log` in `init-widget` + `resend-otp` — dead code. All new billing server files (`invoiceEngine`, `invoicePdf`, `reconcileEngine`, `reconciliationEmail`, `pauseSweepEngine`, `trialEligibility`, `planResolver`, `grant-trial`) use `logger` exclusively. | +2 dead-code comments (harmless) |
| **G (Co-Authored-By)** | T1 | 0 trailer lines in last week. Commit body references to the rule are review-doc text. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | All matches are test fixtures or enum constants. New billing test files use `'test-*'` prefix fixtures. `deviceId.ts` stores a UUIDv4, not a secret. | unchanged |
| **SEC-2 (PII in logging)** | T1 | 3 email-address logging sites in error paths: `email.ts:394` (`bounceRecipients`), `emailService.ts:112`, `emailSend.ts:77`. All warn/error-level, not routine info/debug. **Pre-existing, not new today** — but warrants cleanup before D.1 production launch. See M1. | unchanged (flagged for first time) |
| **SEC-3 (cookie security)** | T1 | All `cookies.set()` calls have `httpOnly`, `secure: !dev`, `sameSite: 'lax'`. `activeRole` cookie deliberately `httpOnly: false` (client needs read). No new cookie calls today. | unchanged |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved: test-runner files (admin/dev-only, enum-validated). `RegExp.exec` in recencyScore. No new instances. | unchanged |
| **SEC-5 (env var exposure)** | T1 | `VITE_VAPID_PUBLIC_KEY` only. No server env vars in client components. | unchanged |
| **SEC-6 (rate limiting)** | T1 | All new endpoints rate-limited: `invoices` (60/min), `invoices/[id]/pdf` (60/min), `grant-trial` (10/hr), `change-plan` (10/hr), `update-payment-method` (10/hr), `pause/resume/cancel` (10/hr each), `billing-reconcile` (cron-secret auth). **Standing gap**: `subscription/status` still lacks rate limit (carried M4 from prior). Cron endpoints use `x-cron-secret` + `cronLock` (rate limit n/a). | **improved** (+8 new rate-limited endpoints) |
| **SEC-7 (client storage PII)** | T1 | `deviceId.ts` stores a UUIDv4 in localStorage (non-PII). Form data in sessionStorage is by design (crash recovery). No new storage of PII. | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (window.location.reload)** | T2 | 13 files (+1: `admin/testing/+page.svelte` — correctly guarded by `if (browser)` + `setTimeout`). | +1 (correctly guarded) |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 0. `deviceId.ts` correctly uses `browser` from `$app/environment`. | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 0 | unchanged |
| **SSR-1 (hydration mismatch)** | T2 | `deviceId.ts` uses `browser` guard. `ManageSubscriptionPanel` date computations are inside event handlers. No new SSR mismatch risk. | unchanged |
| **SSR-2 (Svelte 5 `$state` init from prop)** — Pitfall #10 | T3 | `pnpm check` 0 `state_referenced_locally`. | unchanged |
| **H1 (`state_referenced_locally`)** | T3 | 0 via `pnpm check` | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | 1 hit — in archived file (`_archive/existingDetails.ts:188`). Not active code. | unchanged |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 0 non-whitelisted uses | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 | unchanged |
| **CQ-2 (memory leaks: setInterval/addEventListener)** | T3 | All properly cleaned up via `$effect` return or `onDestroy`. New `ManageSubscriptionPanel` — no intervals. `tokenRefreshScheduler` — properly cleaned via `stopTokenRefreshScheduler`. | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 0 in non-test files | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 4 boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | **35** across source files. | -2 vs prior (37→35, cleanup from archive stubs) |
| **S (contrast audit)** | T3 | 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | All 6 required headers in `hooks.server.ts` | unchanged |
| **PH-3 (API response consistency)** | T5 | All new billing/invoice/reconciliation endpoints use `apiOk`/`apiError`/`apiServerError`. `invoices/[id]/pdf` correctly uses raw `Response` for binary PDF streaming. Pre-existing SES webhook `Response` exception documented. | compliant |
| **PH-5 ($where/$function)** | T5 | 0 | unchanged |
| **PH-7 (parseJsonBody coverage)** | T5 | All new POST endpoints use `parseJsonBody`: `grant-trial`, `subscribe-recurring` (body changes), `change-plan`, `update-payment-method`. GET endpoints (`invoices`, `transactions`) use URL params only. Cron endpoints use header auth only. | compliant |
| **PERF-1 (import \*)** | T6 | 3 pre-existing | unchanged |
| **PERF-3 (invalidateAll)** | T6 | 44 call sites (baseline correction — prior review understated as 1). 0 new today. All are in dashboard/admin pages after user actions (appropriate usage). | baseline corrected: 44 |
| **BUILD-3 (typecheck)** | T3 | 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 12,407/12,407 (+293) | improved |

### T4 — Conditional Rules (triggers from today's commits)

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | `mongo.ts` changed (new collections) | `"engines": { "node": "22.x" }` — correctly pinned. |
| **O (payload snapshot drift)** | Payload builders changed (`loanTransaction.ts`, `casePayloadBuilder.ts`, `loanPayload.ts`, `resultBuilder.ts`) | 12,407 tests pass. 8 snapshots intentionally regenerated in `09dde629` via dedicated regen helper (Pitfall #11 compliant). |
| **P42 (reload detection)** | No `getEntriesByType('navigation')` changes | Only `isReloadOfCurrentPath.ts` (approved util). n/a. |
| **P46 (director auto-income sync)** | Director components changed (`AddApplicantBusiness`, `AddApplicantProfessional`) | `directorAutoIncomeWiring.test.ts` — PASS. |
| **P47 (pre-submit ConfirmModal)** | No submit flow changes | `preSubmitConfirmWiring.test.ts` — PASS. n/a. |
| **P63 (archived route stubs)** | 6 archived routes converted to stubs | `archivedRouteStubInvariant.test.ts` — PASS. All 6 stubs verified clean: `_archived_cancel`, `_archived_da_quota`, `_archived_da_topup`, `_archived_subscribe`, `_archived/billing-trial-reminder`, `_archive/builder-projects`. |
| **Payload tests** | BT/Topup/Plot payloads rewritten | `btTopupPayloadSizing`, `btTopupStringMatching`, `btTopupTenureMapping` — all PASS. |
| **Rule engine tests** | 6 new suites for audit fixes | `plotLoanNameAlias`, `lcrAppliedToOffered`, `maxTenureEvaluation`, `bridgeScenarioEmiCeiling`, `topupLtvExposure`, `resaleDownPaymentBoundary` — all PASS. |
| **CSRF cron skip** | Cron endpoints moved to `/api/cron/*` | CSRF skip pattern in `hooks.server.ts` already covers `/api/cron/*`. Each cron endpoint authenticates via `x-cron-secret` header. Consistent. |
| **BT variant matching** | `obligationOptions.ts` changed | `closureOptionBtOnlyGate.test.ts` — PASS. |
| **Guarantor tab visibility** | `incomeTabState.ts` changed | `guarantorFinancialTabVisibility.test.ts` — PASS. |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | **`src/lib/database/mongo.ts`** — +82 lines: 5 new collections (`TrialIdentifierBlocklist`, `Invoices`, `InvoiceCounters`, `ReconciliationRuns`, `ReconciliationDrifts`) + associated indexes. All additive — 272+ existing importers unaffected. **`src/lib/config/routes.ts`** — 4 cron endpoints moved from `/api/{path}` to `/api/cron/{path}`. External cron-job.org URL configuration must match (see Operator Action below). **`src/hooks.server.ts`** — not touched today. |
| **BLAST-2 (type file changes)** | `billingSubscription.ts` — additive: `trial_until?: Date`, `is_trial?: boolean`, device-id fields. `invoice.ts` — new file (147 lines). `reconciliation.ts` — new file (102 lines). All additive; no existing interfaces narrowed. |
| **BLAST-3 (API response shape changes)** | No `apiResponse.ts` changes. All new endpoints follow `apiOk/apiError` envelope. Invoice PDF endpoint returns binary (correct). |
| **BLAST-4 (auth logic changes)** | No JWT or role logic changed. New `grant-trial` endpoint is admin-only (`requireRoleApi(locals, 'admin')`). |
| **BLAST-5 (store/state changes)** | `dialog.svelte.ts` — added `futureOnly?: boolean` to `DateAreaOpenContext` with backward-compatible default `false`. No client-side store changes for billing. |
| **BLAST-7 (schema/config changes)** | `obligationOptions.ts` — `getClosureOptionsFiltered` gating on BT-only flows. `applicantFormValidation.ts` — new foreign-country validation. Both localized; no cross-loan impact. |
| **BLAST-8 (database changes)** | `mongo.ts` adds 5 new collections + 7 new indexes. All additive. Existing collections + indexes unchanged. TTL indexes: `ReconciliationRuns` (365 days), `ReconciliationDrifts` (365 days). `InvoiceCounters` uses `_id` as natural key. |
| **BLAST-9 (multi-author)** | Single author (Prashant). No cross-team risk. |
| **BLAST-10 (root layout)** | No root layout changes today. `dunningBanner` from prior day is stable. |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — Email addresses logged in error paths (SEC-2 pre-existing)

**Rule:** SEC-2 (PII in logging)
**Files:** [`src/lib/server/billing/email.ts:394`](src/lib/server/billing/email.ts:394), [`src/lib/services/emailService.ts:112`](src/lib/services/emailService.ts:112), [`src/lib/utils/emailSend.ts:77`](src/lib/utils/emailSend.ts:77)
**Confidence:** 55%

Three files log email addresses in error/warn paths (bounce-recipient mapping, OTP send failure, generic send failure). All are error-level only (not routine info/debug), so exposure is limited to log aggregators.

**Risk:** Low. Error logs are internal-only. However, email addresses are PII under GDPR/IT Act. If the log aggregator is ever breached or shared, these become a liability.

**Suggested action:** Before D.1 production launch, hash or truncate email in error log context (e.g., `j***@example.com` or log only the domain part). Not urgent for sandbox/trial phase.

---

### M2 — Prior M4 unfixed: `subscription/status` lacks rate limiting

**Rule:** SEC-6
**File:** [`src/routes/api/billing/subscription/status/+server.ts`](src/routes/api/billing/subscription/status/+server.ts)
**Confidence:** 65%

Carried forward from 2026-05-26 M1 → 2026-05-27 M4. GET endpoint used for 2s-interval polling (up to 30 calls per auth-return). Auth-guarded but no rate limit. The 8 new billing endpoints added today ALL have rate limiting — this endpoint is now the only billing endpoint without it.

**Suggested fix:** `rateLimit(userId, { windowMs: 10_000, max: 60 })`.

---

### M3 — Prior M1 carried: `DunningBanner.svelte` hardcoded hex colors

**Rule:** UI consistency, dark-mode token discipline
**File:** [`src/lib/components/DunningBanner.svelte`](src/lib/components/DunningBanner.svelte)
**Confidence:** 55%

Carried from 2026-05-27 M1. 6 hardcoded hex color pairs for urgency-scaled dunning states. Contrast audit passes. Risk: if app-level dark mode toggle is added (vs system preference), these won't respond.

**No change in status** — defer to billing dashboard design review.

---

## Low Findings / Observations

### L1 — `invoiceEngine.ts` IST math is correct but fragile

**File:** [`src/lib/server/billing/invoiceEngine.ts:64`](src/lib/server/billing/invoiceEngine.ts:64)

`fyForDate()` computes IST by adding `5.5 * 60 * 60 * 1000` to UTC and reading `getUTCFullYear()`/`getUTCMonth()`. This is correct and avoids timezone-library dependencies. However:
- India has never observed DST, but if it ever did (practically impossible but technically unbounded), this code would break.
- The pattern is consistent with the existing IST calculation in `reconcileEngine.ts` (`priorIstDayWindow`).

**No action needed** — the approach is standard for Indian financial systems. Documenting for awareness.

### L2 — `window.location.reload()` count updated to 13

**File:** [`src/routes/dashboard/admin/testing/+page.svelte`](src/routes/dashboard/admin/testing/+page.svelte)

+1 from prior baseline of 12. The new call is in the admin testing page, correctly guarded by `if (browser)` + `setTimeout`. Admin-only, non-production. Baseline updated.

### L3 — `PERF-3 invalidateAll` baseline corrected

Prior reviews reported "1 (DunningBanner)" — actual count is **44** pre-existing call sites across admin/DSA/RM dashboards. All are appropriate (full data refresh after user actions). 0 new today. Future reviews should baseline at 44.

### L4 — `routes.ts` cron path change requires operator action

**File:** [`src/lib/config/routes.ts`](src/lib/config/routes.ts)

Commit `85eb2f50` moved 4 cron endpoints from scattered paths to `/api/cron/*` prefix. If cron-job.org targets the old paths, billing/reconciliation/reminder crons will 404 silently. Verify the external scheduler in the `rinn` Vercel project is updated.

### L5 — 2 dead-code `// //console.log` lines

**Files:** `src/routes/api/auth/init-widget/+server.ts`, `src/routes/api/auth/resend-otp/+server.ts`

Double-commented console.log lines. Harmless dead code. Consider cleanup when next touching these files.

### L6 — `one-extra-case` gesture introduces billing flexibility risk

**File:** [`src/routes/api/evaluate-and-persist/+server.ts`](src/routes/api/evaluate-and-persist/+server.ts) (commit `5eef8874`)

When a DSA hits their plan's case limit, this commit adds a grace gesture allowing one extra case. The comment documents it as a product decision (soft boundary, not hard wall). Architecturally sound — the grace is tracked and counted. No rate-limit bypass; the DSA still needs to be authenticated.

**Risk:** Very low. The gesture is bounded (one extra, not unlimited). If product decides to remove it later, it's a single-file change.

---

## Commit-Level Analysis — High-Risk Commits

### `b7596176` — D.2: invoice engine + PDF renderer + email (1,312 ins, 5 files)

**Architecture:** Clean 3-layer design: `invoiceEngine.ts` (tax math + counter) → `invoicePdf.ts` (pdf-lib rendering) → `invoiceEmail.ts` (nodemailer dispatch). Each layer has single responsibility.

**Financial correctness:**
- Tax back-computation: `computeInvoiceMoney(total_paise, taxKind)` correctly derives taxable base from GST-inclusive total. Rounding-with-adjustment (one paisa drift fix) is explicitly handled. The `CGST+SGST` split and `IGST` paths are correct.
- Gapless counter: `getNextInvoiceSeq(fy)` uses `findOneAndUpdate` with `$inc` — atomic, no skips. Unique index on `(fy, invoice_number)` in `InvoiceCounters` prevents duplicates. FY calculation uses IST (correct for Indian GST jurisdiction).
- Idempotency: `billing_transaction_id` unique index on `Invoices` prevents duplicate invoice generation on concurrent calls (E11000 → treat as success).

**Security:** Invoice PDF does NOT include PII (no customer name/PAN/Aadhaar in the rendered output — only plan name, amount, tax breakdown, invoice number). Correct per AD-06.

**Tests:** 19 tests in `invoiceEngine.test.ts` covering: FY boundaries (March 31 / April 1), tax computation for all 3 tax kinds, counter atomicity, idempotency, edge cases. Comprehensive.

### `d38130d6` — D.1 S7: reconciliation cron + engine (1,520 ins, 7 files)

**Security:** Cron endpoint uses `x-cron-secret` header auth. `cronLock('billing-reconcile')` prevents double-runs. Unique index on `(run_date, provider)` is the second idempotency line.

**Architecture:** `reconcileEngine.ts` is pure computation (compares provider settlements vs local transactions). `reconciliationEmail.ts` only fires on drift > 0. Admin view (`reconciliation/+page.svelte`) is read-only.

**Blast radius:** New `ReconciliationRuns` + `ReconciliationDrifts` collections are standalone. No existing collection queries modified.

### `f361ddf7` + `be9673c4` — Billing trial: schema + wiring (968 ins combined)

**Security:**
- `trialEligibility.ts` uses SHA-256 hashing for identifier comparison (mobile/PAN/GST/device-id). Raw identifiers are never stored in the blocklist — only hashes. Correct privacy-by-design.
- `hashIdentifier()` uses `node:crypto` `createHash('sha256')`. Lowercase normalization before hashing. Consistent.
- Trial eligibility check is server-side only. Client cannot bypass.

**Device-ID (`deviceId.ts`):**
- Uses `browser` guard (not `typeof window` — Pitfall #9 compliant).
- Stores UUIDv4 in localStorage (non-PII). SessionStorage fallback for restricted environments.
- `crypto.randomUUID()` with math-based fallback. Fine for device-id (uniqueness, not unguessability).

### `09dde629` — BT/Topup/Plot Construction payload sizing (981 ins / 398 del)

**Financial correctness:** Critical fix — BT/Topup payloads were deriving `loanAmount` from wrong fallback fields, causing false RED rejections or false GREEN over-offers. The fix keys derivation off `loanType` + `PlotLoanActivity` (type-aware). 28 tests + 8 regenerated snapshots verify the new shape.

**Blast radius:** `loanTransaction.ts` is called from `buildLoanPayload()` → `evaluate-and-persist`. Changes are gated by `loanType` switch — non-BT/Topup/Plot paths are untouched.

### `a9948e71` — Pitfall #63: archived-route stub enforcement (240 ins / 242 del)

**Build safety:** Two enforcement layers:
1. `.husky/pre-push` grep (~10ms) — blocks push if any archived `+server.ts` has non-stub imports
2. `archivedRouteStubInvariant.test.ts` — vitest source-pattern scan (19 tests), auto-discovers archives

The vitest layer is intentionally stricter than the hook grep (catches `@sveltejs/kit` raw helpers, `$app/environment`, npm packages — not just `$lib/`). Correct defense-in-depth.

### `5eef8874` — One-extra-case billing gesture

**Security:** The grace gesture runs inside the existing `evaluate-and-persist` endpoint (already auth-guarded, rate-limited, role-checked). The one-extra logic is a product decision, not a security bypass. The existing case count check is preserved; only the boundary shifts by 1.

---

## Summary

### Metrics Delta

| Metric | Prior (05-27) | Today (05-28) | Change |
|--------|---------------|---------------|--------|
| Tests | 12,114 | 12,407 | **+293** |
| Test files | 233 | 262 | **+29** |
| Type errors | 0 | 0 | — |
| Warnings | 0 | 0 | — |
| Contrast pairs | 456/456 | 456/456 | — |
| TODO/FIXME/HACK | 37 | 35 | **-2** |
| Pitfalls documented | 63 | 63 | — |
| `window.location.reload` files | 12 | 13 | +1 (guarded) |
| `invalidateAll` call sites | ~~1~~ 44 | 44 | baseline corrected |

### Top 5 Actions

1. **Add rate limit to `subscription/status` endpoint** — only billing endpoint without one (carried 3 days, M2)
2. **Hash/truncate email addresses in error log context** — 3 sites (M1), before D.1 production
3. **Verify cron-job.org URLs** in the `rinn` Vercel project match the new `/api/cron/*` prefix (L4)
4. **Clean up 2 dead-code `// //console.log` lines** in auth endpoints (L5)
5. **Consider design-token migration for `DunningBanner`** hex colors when billing UI is next reviewed (M3, carried)

### Known-Safe Inventory Updates

| Item | Status |
|------|--------|
| Archived route stubs (6 total) | All 410 stubs, locked by husky hook + vitest test |
| Invoice PDF output | No PII — AD-06 compliant |
| Trial identifier storage | SHA-256 hashed only — no raw PII in blocklist |
| Device-ID | UUIDv4 in localStorage — non-PII |
| New billing endpoints (8) | All rate-limited, auth-guarded, use `apiOk`/`apiError` |
| New cron endpoints (2: reconcile, pause-sweep) | `x-cron-secret` + `cronLock` |
| `invalidateAll` baseline | 44 call sites (corrected from 1) |
| `window.location.reload` baseline | 13 files (all approved) |

---

*Report generated automatically. No source code modified.*
