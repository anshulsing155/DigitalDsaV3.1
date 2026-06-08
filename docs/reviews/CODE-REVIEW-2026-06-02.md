# Daily Code Review — 2026-06-02

## Header

**Profile:** Full (T1-T9) — 28 commits in review window across 8+ workstreams (tech-debt cleanup, naming renames, UI unification, payload-builder refactor, errorAlert improvements, billing bug fixes, Razorpay lazy-load, dead-code archival). Full profile triggered by: shared module changes (hooks.server.ts, routes.ts, formWizardEngine.ts, loanTypes.ts), billing provider bug fix, and high commit volume.
**Reviewed against:** committed `main` @ **`b80c7d6a`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-06-01.md`](CODE-REVIEW-2026-06-01.md) (12 commits, Full profile @ `52ba1503`).
**Delta range:** `52ba1503..b80c7d6a` — 28 commits, 139 files changed, +4798/−2167.
**Authors this window:** Prashant (single author).
**WIP (uncommitted, NOT reviewed):** 12 staged/unstaged files + 4 untracked — appears to be LEND-1 Phase 1b in-flight (Plot & Equity canonical payload fields, ADR-0025, keyRegistry updates, dev-activate-pending-mandate helper). Not reviewed; will be covered when committed.

| Command | Status | Result | Delta vs `2026-06-01` prior |
|---------|--------|--------|------------------------------|
| `pnpm check` | PASS | 0 errors, 3 warnings (in uncommitted WIP files per git status) | unchanged vs committed tree |
| `pnpm test:unit -- --run` | PASS | 299 files, **12,918 tests** | +54 tests (from 12,864) |
| `pnpm test:contrast` | PASS | **456/456 pairs** WCAG AA across every theme | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines in this window | unchanged |
| Registry integrity check | PASS | All 16 active form keys found | unchanged |

---

## Commits Reviewed (28, grouped by workstream)

### Workstream A — TECH-DEBT-CLEANUP S208–S215 (nomenclature rename + cleanup)

The bulk of the delta: multi-session loan field nomenclature rename (`loanVariant` → `loanScope`, `LAPType` → `facilityType`), tech-debt items D1–D15, dead-code archival, snapshot regeneration, and spec closure.

| SHA | Subject | Surface |
|-----|---------|---------|
| `535e99da` | fix(forms): nomenclature post-rename stragglers — restore dual-tenure + Plot & Equity payload + sidebar parity | 23 files (+1067/−39) |
| `e211595a` | refactor(ui): unify form components on shared style tokens + iconRegistry | 10 files (+277/−449) |
| `debae82c` | chore(docs+cleanup): S207 session-close docs + S208 tech-debt-cleanup Session 1 (D3/D11/D12/D14) | 12 files (+208/−135) |
| `362e3041` | chore(tests): S208.5 — regenerate 4 pre-migration snapshots to lock canonical post-rename state | 5 files (+17/−9) |
| `216aa108` | refactor(naming): S209 — rename loanVariant prop → loanScope across misnamed-scope chain (D1 + D2) | 20 files (+103/−96) |
| `94aea8cb` | refactor(payload-builder): S210 — time injection via opts.now (D-incoming-4, Level-3 architectural fix) | 6 files (+300/−18) |
| `e53eafba` | refactor(testing): S210 Phase 3-5 — fixture audit cleanup + D-incoming-1/5 resolved | 9 files (+146/−45) |
| `a24ab09e` | refactor(testing): S211 Commit 1 — D4 core + cascade + coverageReport field renames | 4 files (+33/−29) |
| `dcaa5a3d` | refactor(testing): S211 Commit 2 — LoanType type + 3 constants + 7 consumers | 9 files (+122/−114) |
| `82094480` | refactor(cleanup): S211 Commit 3 — D6/D10/D15 + spec maintenance | 6 files (+65/−10) |
| `3d36d6e5` | test(wizard): S212 — D13 wizardSidebarPageGatesLock + 2 dead-UI fixes | 4 files (+226/−31) |
| `c631d33a` | chore(cleanup): S214 — D7 bank-loan-management archival + offers architecture doc | 12 files (+571/−1065) |
| `85aef3a4` | chore(restore): S213 cherry-pick — restore work dropped by parallel session's rebase | 20 files (+575/−73) |
| `75453a58` | chore(cleanup): S215 B — 'Business Loan - Secured' case-level dead handlers removed | 10 files (+16/−33) |
| `56ffb89d` | chore(cleanup): S215 A — Plot & Equity payload-patch reform (path c — remove patches, canonicalize lock) | 3 files (+178/−76) |

### Workstream B — ErrorAlert Improvements

| SHA | Subject | Surface |
|-----|---------|---------|
| `e51ca39d` | fix(errorAlert): collapse SSR sub-500 noise into one dedup bucket (A1) | 3 files (+219/−8) |

### Workstream C — Billing Bug Fixes (S216 — deroute session)

Razorpay eMandate amount=0 fix, structured 403 for non-DSA callers, dev-mode admin bypass, plan-card visual ambiguity fix, Razorpay checkout.js lazy-loading.

| SHA | Subject | Surface |
|-----|---------|---------|
| `1c494625` | perf(razorpay): lazy-load checkout.js to silence 700+ preload warnings | 2 files (+36/−1) |
| `8ad52af9` | fix(billing): structured 403 USER_NOT_DSA when caller is RM/admin, not DSA | 5 files (+123/−15) |
| `2f9b69b8` | fix(billing): dev-mode admin bypass + visual fix for recommended vs selected | 4 files (+165/−61) |
| `55cbbb13` | fix(billing): eMandate amount=0 provider bug + 2 §16 lock-test retargets + 4 new coverage tests | 4 files (+201/−15) |

### Workstream D — Docs / Session Lifecycle

| SHA | Subject | Surface |
|-----|---------|---------|
| `643222eb` | docs: S210 session close — handoff + changelog + INDEX regen | 4 files (+75/−40) |
| `e3f3f2a0` | docs: S214 /end — close session, restore S213, renumber Tailwind pitfall → #70 | 10 files (+174/−53) |
| `6541589e` | docs(maintenance): regenerate DECISIONS.md after S214 close | 1 file |
| `019cdfe1` | docs(cleanup): S215 C — TECH-DEBT-CLEANUP-2026-05-31 archived (status: shipped) | 4 files (+50/−13) |
| `38af8e49` | docs(lend-1): S215 Phase 1a — Pitfall #33 canonical-decision locked | 1 file |
| `f5156985` | docs: S215 session-close docs pass — handoff + changelog + dev-plan | 3 files (+92/−58) |
| `ec54881d` | docs(maintenance): regenerate specs INDEX after S215 close | 1 file |
| `b80c7d6a` | docs: S216 /end — billing-UX deroute close, +4 tests, ConfirmModal forcing-function age 7 | 3 files (+72/−16) |
| `f6fcc7db` | fix(docs): unbreak Vercel build — remove backslash path from CODE-REVIEW-2026-05-30 | 1 file |

---

## Standing Grep Rules — T1-T6 + T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE fetch | T1 | No new violations. All billing endpoints use `secureFetch` on client side. | unchanged |
| **E (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | 30 matches total. Known-safe inventory: `JsonLd.svelte` (JSON.stringify), `Toast.svelte` (internal SVG), 6 form `pageDescription` sites (server schema), `admin/policies` (admin-only), `how-can-we-help` (hardcoded). All non-exception sites use `sanitizeHtml()`. 2 matches in `_archive/` (exempt). | unchanged |
| **E2 (XSS attrs)** | T1 | No new dynamic `href`/`src`/`action` injection vectors. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` | T1 | 5 matches: `logger.ts` (2, fallback), `telemetry.ts` (3, OTel bootstrap). All approved. 0 in `src/routes/api/`. | unchanged |
| **G (Co-Authored-By)** | T1 | 0 trailer lines. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | All matches in `*.test.ts` files (exempt) + `_archive/csrfClient.ts` (archived). No source secrets. | unchanged |
| **SEC-2 (PII in logging)** | T1 | New billing endpoint logs: `jwt_user_id`, `user_role`, `active_role`, `roles` — all non-PII hex/string values. No email/mobile/name logged. | clean |
| **SEC-3 (cookie security)** | T1 | No new cookie sites. Existing inventory unchanged. | unchanged |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved sites (`e2e-runs`, `run-vitest`) + regex `.exec()` in tests (safe). `new Function` in `moneyCollectionsTtlAbsence.test.ts` (test-only, exempt). | unchanged |
| **SEC-5 (env var exposure)** | T1 | Same 2 `VITE_VAPID_PUBLIC_KEY` sites (public, non-sensitive). No `$env/*/private` in `.svelte` files. | unchanged |
| **SEC-6 (rate limiting)** | T1 | **CARRY-FORWARD** — 8 new endpoints from prior review still lack `rateLimit()`. No new endpoints added in this delta. | unchanged (carry) |
| **SEC-7 (client storage PII)** | T1 | ~20 storage write sites. All store non-PII: theme, language, walkthrough, form drafts, director forms, fingerprint test. `_archive/clientSession.ts` stores tokens (archived, not active). | unchanged |
| **B (Capacitor static import)** | T2 | 0 | unchanged |
| **C (window.location.reload)** | T2 | 13 sites. All in known-safe inventory: error pages (4), `hooks.client.ts`, `LanguageSelector`, `ResetDataButton`, `ErrorBoundary`, admin pages (4). | unchanged |
| **D (Capacitor proxy return)** | T2 | 0 | unchanged |
| **I (typeof window)** | T2 | 0 | unchanged |
| **J (module-scope fetch)** | T2 | 0 | unchanged |
| **SSR-1 (hydration mismatch)** | T2 | Not scanned (no new `.svelte` in render-path commits). | n/a |
| **H1 (state_referenced_locally)** | T3 | 0 from `pnpm check`. | unchanged |
| **K (JSON-Logic `!=`)** | T3 | Existing inventory in config files. Several new `!=` patterns in `businessLoan/questionBank/loanRequirement.ts` — all compare against `''` (empty string, not null). This is the "unanswered = hide" pattern (Pitfall #1): `'!=': [{ var: 'loanType' }, '']` means "show when loanType is answered." These are safe (checking for non-empty, not null-checking). | **+8 new patterns**, all safe |
| **L (numeric fields minLimit)** | T3 | Not tested separately — full `pnpm test:unit` green. | unchanged |
| **M (combinedAnswers collision)** | T3 | 0 matches in components. | unchanged |
| **S (contrast audit)** | T3 | 456/456 pass. | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 matches. | unchanged |
| **CQ-2 (memory leaks)** | T3 | No new `setInterval`/`addEventListener` in this delta. | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | 4 matches, all in `*.test.ts` (exempt). | unchanged |
| **CQ-4 (error boundary coverage)** | T3 | Same structure: root `+error.svelte` + `(app)` + `(auth)` + `dashboard`. | unchanged |
| **CQ-5 (TODO/FIXME/HACK)** | T3 | **44 across 20 files** (was ~35 across 13 in protocol baseline). Increase is spread across billing, server, rule engine, and testing. Most are `TODO` markers for follow-up work items. | **+9 count, +7 files** |
| **PH-1 (security headers)** | T5 | All 6 headers present in `hooks.server.ts` (lines 808-821). | unchanged |
| **PH-2 (auth guard coverage)** | T5 | No new unguarded endpoints. | unchanged |
| **PH-3 (API response consistency)** | T5 | 0 `new Response(JSON.stringify)` in API routes. All use `apiOk`/`apiError`/`apiStructuredError`. | unchanged |
| **PH-5 (MongoDB injection)** | T5 | 0 `$where`/`$function`/`$accumulator`. | unchanged |
| **PH-7 (parseJsonBody)** | T5 | Not scanned individually — no new POST handlers in this delta. | unchanged |
| **PERF-1 (heavy imports)** | T6 | 3 `import *` sites: `json-logic-js` (required by lib API), `@mediapipe/face_detection` (camera util), `iconRegistry.ts` (comment only). | unchanged |
| **PERF-2 ($effect churn)** | T6 | No new `$effect` blocks in high-frequency components. | unchanged |
| **PERF-3 (duplicate network)** | T6 | No new `invalidateAll()` calls. | unchanged |
| **T9 (blast radius)** | T9 | See [Blast Radius Assessment](#cross-team-blast-radius-summary-t9). | **assessed — low** |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M-1 — CQ-5 TODO/FIXME/HACK accumulation — 44 total (+9 from baseline)

**Confidence:** 90%
**Severity:** Medium (tech debt indicator)
**Scope:** 20 files across `src/`

The TODO/FIXME/HACK count has grown from ~35 (protocol baseline) to 44 across 20 files. Notable concentrations:
- [`src/lib/server/fileConfigurator.ts`](src/lib/server/fileConfigurator.ts) — 9 TODOs (PDF generation follow-ups)
- [`src/lib/server/_archive/notifications.ts`](src/lib/server/_archive/notifications.ts) — 8 in archived file (acceptable)
- [`src/lib/server/billing/`](src/lib/server/billing/) — 4 across billing modules (new from recent D.1 work)

**Recommendation:** Triage the 4 billing TODOs in the next session — they're in active production-path code. The `_archive` TODOs can be ignored.

---

## Low Findings / Observations

### L-1 — `verification_charge_paise: 100` passed but ignored for eMandate

**Confidence:** 80%
**Severity:** Low (latent inconsistency)
**File:** [`src/routes/api/billing/subscribe-recurring/+server.ts:276`](src/routes/api/billing/subscribe-recurring/+server.ts)

The endpoint still passes `verification_charge_paise: 100` to the provider, but `razorpay.ts` now hardcodes `amount: 0` and `first_payment_amount: 0` for eMandate. The `BillingProvider.ts` interface documents this behavior (line 41-43: "NOTE: forced to 0 for eMandate..."). No runtime impact, but the dead parameter is confusing. Consider either: (a) removing the field from the call site, or (b) making the endpoint pass `0` explicitly so the code reads consistently.

### L-2 — `_archive/TwoSideMultipleSelectField.svelte` has unsanitized `{@html}`

**Confidence:** 70%
**Severity:** Low (archived code)
**File:** [`src/lib/components/_archive/TwoSideMultipleSelectField.svelte:58,90`](src/lib/components/_archive/TwoSideMultipleSelectField.svelte)

Two `{@html}` usages without `sanitizeHtml()` wrapper. Archived component, not mounted in any active route. No runtime risk. Note for if the component is ever un-archived.

### L-3 — `_archive/MultiSelectionTrueFalse.svelte` has unsanitized `{@html}`

**Confidence:** 70%
**Severity:** Low (archived code)
**File:** [`src/lib/components/_archive/MultiSelectionTrueFalse.svelte:189`](src/lib/components/_archive/MultiSelectionTrueFalse.svelte)

Same pattern as L-2. Archived, not mounted.

---

## Commit-Level Analysis

### Code-Affecting Commits (non-docs)

**`535e99da` — nomenclature post-rename stragglers (23 files, +1067/−39)**

Largest commit in the window. Restores dual-tenure BT/Top-up logic after the field rename, adds Plot & Equity payload lock test, fixes sidebar parity across 5 loan types. Creates the initial `TECH-DEBT-CLEANUP-2026-05-31.md` spec + `CODE-REVIEW-2026-06-01.md`.

- Security: no new attack surface
- SSR: no browser-API usage outside guards
- Correctness: adds `ruleValidator.ts` guards and `evaluationEngine.ts` enrichments for the renamed fields. Lock tests (`dualTenureBTTopup.test.ts`, `plotEquityPayloadPatchLock.test.ts`) verify canonical values.
- Parity: sidebar `wizardSections/*.ts` updated across all 6 loan types (business, home, LAP, personal, plot, professional)
- Blast radius: touches `formWizardEngine.ts` (comment-only), `evaluationEngine.ts` (logic), `closureOptions.ts`, `obligationOptions.ts`. All consumers verified by `pnpm check` + tests.

**`e211595a` — UI unify form components (10 files, +277/−449)**

Refactors 8 form components to use shared style tokens and `iconRegistry.ts`. Net reduction of 172 lines. Removes hardcoded colors in favor of CSS custom properties.

- No functional behavior changes — pure visual token consolidation
- `GPAOfNriApplicant.svelte`, `RelationshipCapture.svelte` family significantly simplified

**`e51ca39d` — errorAlert fingerprint collapse (3 files, +219/−8)**

Introduces `SUB500_NOISE_FP` sentinel fingerprint and `dedupWindowFor()` to collapse sub-500 SSR responses (bot probes) into a single dedup bucket with 1-hour window. Well-structured separation of concerns. 160-line lock test covers all branches.

- Security: no weakening of alert pipeline — 5xx still fire normally
- Performance: reduces email volume under scan campaigns without hiding real errors
- The `fingerprint()` and `dedupWindowFor()` are now exported (previously internal) — lock test needs access. Acceptable trade-off.

**`1c494625` — Razorpay checkout.js lazy-load (2 files, +36/−1)**

Removes eager `<script>` tag from `+layout.svelte`; memoizes lazy injection in `home-loan/+page.svelte` `buyCoins()`. Clean performance win.

- Only `home-loan/+page.svelte` uses the coins flow — correct scoping
- Memoization via module-level `let loaded = false` — SSR-safe (module re-executes per request in SSR, but `buyCoins()` is never called server-side since it's in an `onclick` handler)

**`8ad52af9` — structured 403 USER_NOT_DSA (5 files, +123/−15)**

Adds identity validation in `subscribe-recurring` and `subscription/status` endpoints. Non-DSA callers get `403 { code: 'USER_NOT_DSA' }` instead of a confusing 404. Client-side: `SubscribeRecurringSection` + `ManageSubscriptionPanel` handle the new 403 gracefully.

- Security: **improves** — previously RM/admin callers could hit a confusing code path that might create orphan data
- The `wrong_identity` state is correctly excluded from the subscribe button's enabled set
- `ManageSubscriptionPanel` self-hides on wrong identity (avoids showing stale/wrong subscription data)

**`2f9b69b8` — dev-mode admin bypass + visual fix (4 files, +165/−61)**

Two changes bundled:
1. `if (!dsaDoc && !dev)` gate allows admin testers in dev to exercise Razorpay flows. The `example.com` email fallback (RFC 2606) replaces `.placeholder` TLD that Razorpay rejected.
2. CSS rule-order fix: `.plan-option.selected` declared AFTER `.recommended` so selection ring wins at equal specificity.

- Security: dev bypass is properly gated behind `$app/environment.dev` — no production exposure
- The `@example.com` fallback is correct for test-mode only (production always has a DSA doc)

**`55cbbb13` — eMandate amount=0 fix + tests (4 files, +201/−15)**

Fixes the real provider bug: Razorpay's eNACH API requires `amount: 0` and `first_payment_amount: 0`. Previous `100` (₹1) was a Card/UPI-Autopay concept misapplied to eMandate.

- Critical bug fix — would have blocked any live eMandate registration
- Lock test retargets: `razorpayProvider.test.ts` now asserts `amount: 0` (was 100), `billingCardGridLayout.test.ts` asserts canonical CSS split (recommended = no ring, selected = ring)
- 4 new billing endpoint tests cover the USER_NOT_DSA + dev-bypass paths

**`85aef3a4` — S213 cherry-pick restore (20 files, +575/−73)**

Restores work dropped by a parallel session's rebase. Includes ADR-0024, new pitfalls (#68, #69), form archive, evaluation engine KNOWN LIMITATION block, closure options fix. This is a restore, not new work — all code was previously reviewed in its original session.

**`c631d33a` — D7 archival + offers architecture (12 files, +571/−1065)**

Archives `homeLoanApi.ts` → `_archive/homeLoanApi-S214.ts`, archives 2 dead offer pages (`balance-transfer-offers`, `topup-loan-offers`). Creates `OFFERS-ARCHITECTURE.md` documenting the full offers pipeline. Net −494 lines of dead code removed.

- Archived routes render 410 stubs per Pitfall #63 convention
- Legacy payload field absence lock test added (`legacyPayloadFieldsAbsent.test.ts`)

---

## Security Surface Summary

- **Attack surface reduced:** Dead offer routes archived (−2 publicly-reachable `.svelte` pages); structured 403 replaces confusing 404 on billing identity mismatch; sub-500 error alert noise collapsed (frees alert budget for real incidents)
- **No new attack surface:** No new API endpoints, no new public routes, no new cookie sites
- **Outstanding security debt:** SEC-6 carry-forward (8 endpoints from prior review lack rate limiter), SEC-7 credential rotation (deferred to beta per owner decision)

---

## Performance Impact Summary

- **Bundle size:** Razorpay checkout.js lazy-loaded (no longer in global layout bundle). Net −892 LOC from dead code archival.
- **New reactive effects:** 0 new `$effect` blocks in render-path components
- **Network requests:** No new endpoints or `invalidateAll()` calls
- **Error alert email volume:** Reduced under bot-scan campaigns (sub-500 collapse to 1/hour)

---

## Cross-Team Blast Radius Summary (T9)

### Shared modules changed

| File | Change | Risk |
|------|--------|------|
| [`src/hooks.server.ts`](src/hooks.server.ts) | `status` promoted to first-class field in `sendErrorAlert()` call; `status` removed from `extra` object | **Low** — `errorAlert.ts` handles both old and new shapes; the `status?: number` field is optional |
| [`src/lib/config/routes.ts`](src/lib/config/routes.ts) | Removed `TOPUP` + `BALANCE_TRANSFER` from `ROUTES.OFFERS`; removed `'Business Loan - Secured'` from `LOAN_TYPE_FORM_ROUTES` | **Low** — all were verified dead code with zero consumers before removal |
| [`src/lib/utils/formWizardEngine.ts`](src/lib/utils/formWizardEngine.ts) | Comment-only: `LAPType` → `facilityType` in JSDoc | **None** — zero code change |
| [`src/lib/types/loanTypes.ts`](src/lib/types/loanTypes.ts) | Removed `LoanApplication`, `LimitEntry`, `ApplicantDetail` interfaces | **Low** — verified zero live consumers via `pnpm check` before deletion; all were carry-overs from dormant bank-loan-management API |

**Overall T9 assessment: LOW.** All shared module changes are either dead-code removals verified by type-checker or additive optional fields. No breaking type changes, no API shape changes, no guard/auth logic modifications.

---

## Known-Safe Inventory Updates

### Rule A: Raw `fetch()` Inventory
No changes. Carry forward from prior review.

### Rule E: `{@html}` Exception Inventory
No changes. Same 8 approved exception sites. 2 unsanitized sites in `_archive/` (L-2, L-3 above — not mounted).

### Rule C: `window.location.reload()` Inventory
No changes. 13 sites, all in known-safe locations (error pages, admin, language, reset).

---

## Prior Review Findings — Status Update

| Finding | Prior Severity | Status | Notes |
|---------|---------------|--------|-------|
| M-H1 — Admin 2FA `/confirm` no rate limiter | Medium | CARRY — no change this window | — |
| M-H2 — 7 more endpoints lack `rateLimit()` | Medium | CARRY — no change this window | — |
| M-N1 — mark-seen no rate limiter | Medium-low | CARRY | — |
| M-N2 — data export memory at scale | Medium-low | CARRY — acceptable at scale | — |
| L-N1 — communication page loads all messages | Low | CARRY — acceptable at scale | — |
| L-N3 — mark-seen unnecessary `decryptUserPii` | Low | CARRY | — |
| L-N4 — policies page hardcoded Tailwind colors | Low | CARRY | — |
| L-N5 — dataExport hardcodes email | Low | CARRY — acceptable | — |
| L5 (05-30) — QBC sessionStorage PII-adjacent | Low | CARRY — acceptable per analysis | — |

---

## Observations

**Positive patterns worth highlighting:**
- **Test count trajectory is strong**: +54 tests this window (12,864 → 12,918). Test coverage continues to grow with every code change.
- **Dead code archival is disciplined**: 2 dead offer routes + `homeLoanApi.ts` archived with 410 stubs + absence lock tests. Net −892 LOC. This is exactly how the CLAUDE.md §16 Rule #4 pattern should work.
- **Error alert collapse (`e51ca39d`) is well-designed**: The sub-500 fingerprint sentinel with 1-hour dedup window is a clean solution to the bot-probe noise problem. The 160-line lock test covers boundary conditions thoroughly.
- **§16 Rule #16 pattern demonstrated correctly**: Two lock-test retargets in `55cbbb13` (Razorpay amount + billing card grid layout) show the right discipline — when a lock test ratifies a bug, retarget it to the correct value rather than just deleting the test.
- **CSS specificity fix is correct**: Declaring `.selected` after `.recommended` at equal specificity ensures selection state wins visually. The approach avoids specificity hacks.
- **S213 restore via cherry-pick is clean**: The parallel-session rebase that dropped S213 work was recovered cleanly without force-pushes.

**Architecture improvements:**
- `OFFERS-ARCHITECTURE.md` documents the full offers pipeline for the first time — good institutional knowledge capture.
- `errorAlert.ts` exports `fingerprint()` and `dedupWindowFor()` for testability — correct trade-off (internal becomes semi-public for lock-test access).
- `BillingProvider.ts` interface comment documents the `verification_charge_paise` provider-override behavior at the type level — good source-of-truth discipline.

---

## Top 5 Actions for Next Session

1. **SEC-6 rate limiting (carry-forward)** — 8 endpoints from S216 prior review still lack `rateLimit()`. Priority: Admin 2FA `/confirm` endpoint (M-H1 from prior review).
2. **CQ-5 TODO triage** — 4 billing-module TODOs in active production code. Triage into either "do now" or "track in DEVELOPMENT-PLAN."
3. **L-1 cleanup** — Remove or zero-out the `verification_charge_paise: 100` in subscribe-recurring to match what the provider actually does.
4. **Dark-mode CSS token sweep** — SESSION-HANDOFF notes `--ddsa-error-50/200/800` tokens referenced but never declared. The `wrong-identity-banner` correctly uses `--ddsa-error-bg` (live token), but other billing components still reference phantom tokens.
5. **ConfirmModal forcing function** — Age 7, third consecutive close past escalation threshold. Owner decision needed: resume, demote, or cancel.
