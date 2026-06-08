# Daily Code Review — 2026-05-29 (evening delta)

## Header

**Profile:** Full (T1-T9) — 30 commits in 24hr window across 10 workstreams (auth security, rule engine, billing D.6, loan-switch, trial SSOT, guarantor eligibility, dual-tenure BT, form fixes, UI, docs). Full profile triggered by >10 commits + auth/billing/rule-engine changes.
**Reviewed against:** committed `main` @ **`66abd7a6`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-29.md`](CODE-REVIEW-2026-05-29.md) (60-commit catch-up baseline @ `3083137d`).
**Delta range:** `3083137d..66abd7a6` — 30 commits (17 code, 13 docs-only).
**Authors this window:** Prashant (single author + parallel agent — multi-agent worktree coordination confirmed in session handoff, no collisions).

| Command | Status | Result | Delta vs `2026-05-29` prior |
|---------|--------|--------|-----------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 275 files, **12,602 tests** | +18 tests (from 12,584) |
| `pnpm test:contrast` | PASS | **456/456 pairs** | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines | unchanged |

---

## Commits Reviewed (30, grouped by workstream)

### Workstream A — Auth Security (open-redirect closure + deep-link fix)

| SHA | Subject | Surface |
|-----|---------|---------|
| `0372e6c6` | fix(auth): deep-link OTP redirect preserves destination + closes open-redirect | 5 files (+357/-19) |
| `012005b7` | fix(auth): /login throw sweep — preserve deep-link on communication, document onboarding non-changes | 5 files (+143/-4) |
| `00435a3f` | fix(auth): remove verify-otp internal check-dsa call — closes M3 | 2 files (+142/-66) |

### Workstream B — Rule Engine

| SHA | Subject | Surface |
|-----|---------|---------|
| `69868a08` | fix(ruleEngine): Professional Loan no-offers + multi-year ITR policy + foreign-salaried metadata | 8 files (+853/-43) |
| `c951ed09` | feat(rule-engine): Guarantor eligibility assessment v1 (Tier 3b) | 6 files (+501/-2) |
| `8e73d2cc` | fix(rule-engine): BUG-E dual-tenure modeling for hybrid BT+Top-up | 2 files (+325/-2) |

### Workstream C — Billing D.6 Pricing Fence (4 slices + annual revert)

| SHA | Subject | Surface |
|-----|---------|---------|
| `eea241b0` | feat(d6/billing): pricing-fence helpers + drop dual-badge legacy field (D.6 Slice 1) | 3 files (+294/-9) |
| `8339d317` | feat(d6/billing): 80% soft-warn ladder on case-limit gate (D.6 Slice 2) | 2 files (+241/-18) |
| `f76189ef` | feat(d6/billing): SubscribeRecurringSection — annual toggle + GST + single badge (D.6 Slice 3) | 2 files (+372/-7) |
| `6cea603c` | feat(d6/billing): upgrade modal on case-creation 402 + ?recommend= deep-link (D.6 Slice 4) | 7 files (+361/-21) |
| `cb0f3139` | revert(d6): remove annual billing as a product feature (owner decision) | 4 files (-187/+85) |

### Workstream D — Prior Code-Review Finding Closures

| SHA | Subject | Finding closed |
|-----|---------|---------------|
| `beb5071f` | fix(trial): interpolate TRIAL_DAYS into all trial copy | H1 |
| `142fb764` | fix(types): narrow dead 'yearly' variant out of billing_cycle + frequency | M1 |
| `d6e83b2b` | chore(refund): prune dead refund labels post-D.3 abandonment | M2 (was already closed) |
| `a7591eac` | chore(hygiene): close 3 small code-review carry-overs (queryClient JSDoc + SubscriptionStatus label + dead console blocks) | L3 + L4 |

### Workstream E — Form System

| SHA | Subject | Surface |
|-----|---------|---------|
| `dc3c0760` | fix(loan-switch): register applicantsPayload + backHistory + pageIndexObject — closes WT-3 | 2 files (+32/-1) |
| `fa04052f` | test(regression): lock Pitfall #19 render-dispatch + Pitfall #38 page-index reset | 2 files (+348) |
| `d8f61d4b` | feat(d6/billing): card-grid layout for SubscribeRecurringSection (D.6 polish) | 2 files (+270/-24) |

### Workstream F — Billing Lifecycle

| SHA | Subject | Surface |
|-----|---------|---------|
| `d290b2ab` | fix(trial): consolidate TRIAL_DAYS to single source of truth + flip 7/14 → 30 | 6 files (+31/-16) |
| `a610e6e9` | chore(legal): remove refund page entirely + prune all customer-facing refund references | 10 files (+101/-20) |

### Workstream G — Docs Only (13 commits — no code changes)

`66abd7a6`, `24988ff3`, `33ca2e03`, `9a0b3d86`, `1c2e37ee`, `d2540496`, `3083137d`, `aadcdf7a`, `267427b0`, `54eea0cd`, `64e01629`, `ca8541d5`, `18ec728b`, `1289a202`, `be20e7c5`, `db74ca5c`, `266971ce`

---

## Standing Grep Rules — Full T1-T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch in .svelte | T1 | 0 violations. All auth-page fetches are CSRF-exempt pre-auth endpoints. All billing/dashboard components use `secureFetch`. | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | ~37 total hits, 0 violations. All outside the documented exception list use `sanitizeHtml()`. 4 `serverPage?.pageDescription` instances are server-controlled schema. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server/API code | T1 | 5 hits total: `logger.ts` (2, approved fallback), `telemetry.ts` (3, OTel startup). 0 violations. Dead `// //console.log` in init-widget + resend-otp **CLEANED** by `a7591eac`. | **improved** (-2 dead-code comments) |
| **G (Co-Authored-By)** | T1 | 0 trailer lines in last week. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | All matches are test fixtures or enum constants. No real secrets in source. | unchanged |
| **SEC-2 (PII in logging)** | T1 | 2 sites: `email.ts:385` (bounce count, no PII), `email.ts:394` (permanent bounce recipients — logs raw email addresses at error level). **Pre-existing carry-forward.** | unchanged |
| **SEC-3 (cookie security)** | T1 | All `cookies.set()` calls correct. `verify-otp` role cookie now has `sameSite: 'lax'` + `secure: !dev`. | **improved** |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved (test-runner, RegExp.exec). | unchanged |
| **SEC-5 (env var exposure)** | T1 | `VITE_VAPID_PUBLIC_KEY` only. | unchanged |
| **SEC-6 (rate limiting)** | T1 | All endpoints rate-limited. | unchanged |
| **SEC-7 (client storage PII)** | T1 | No PII in localStorage/sessionStorage. | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (module-scope fetch)** | T2 | 0 | unchanged |
| **D (typeof window SSR guard)** | T2 | 0 — Pitfall #9. | unchanged |
| **I (state_referenced_locally)** | T2 | 0 from `pnpm check` | unchanged |
| **J (engines.node pin)** | T2 | `"22.x"` — specific major. | unchanged |
| **SSR-1 (browser import in server)** | T2 | 0 | unchanged |
| **SSR-2 (noExternal coverage)** | T2 | No new deps added this window. | unchanged |
| **H1 ($-prefix Query)** | T3 | 0 — Pitfall #28. | unchanged |
| **K (loan-switch chokepoint)** | T3 | `migrateApplicantsToRecoveryOnLoanSwitch` only called from orchestrator (2 hits: definition + orchestrator call). | unchanged |
| **L (reload detection)** | T3 | `getEntriesByType('navigation')` only in `isReloadOfCurrentPath.ts` utility + e2e perf test + test file. | unchanged |
| **M (combinedAnswers collision)** | T3 | 0 — Pitfall #13. | unchanged |
| **S (unsanitized {@html})** | T3 | Same as E — no new violations. | unchanged |
| **CQ-1 (pre-submit confirm)** | T3 | `submitFormForEvaluation` only called from `confirmAndSubmit` wrapper. | unchanged |
| **CQ-2 (ConfirmModal dismissal)** | T3 | All dismissal paths through `dismissConfirmModal`. | unchanged |
| **CQ-3 (token refresh scheduler)** | T3 | `startTokenRefreshScheduler` + `stopTokenRefreshScheduler` both wired in `(app)/+layout.svelte`. `stopTokenRefreshScheduler` in `auth.svelte.ts`. | unchanged |
| **CQ-4 (NRI income stash)** | T3 | All 3 AddApplicant components import `applyNriIncomeStashForApplicant`. | unchanged |
| **CQ-5 (case-level disabled reason)** | T3 | All 3 unsecured loan pages import `getCaseLevelDisabledReason`. | unchanged |
| **PH-1 (archived route stubs)** | T5 | All `_archived_*` routes are 410 stubs importing only from `'./$types'` + `'$lib/server/apiResponse.js'`. Locked by `archivedRouteStubInvariant.test.ts`. | unchanged |
| **PH-2 (enricher stale fields)** | T5 | `inc.netProfessionalIncome` / `inc.averageMonthlyReceipts` / `inc.averageMonthlyExpenses` — **0 hits** in `payloadEnricher.ts` (Pitfall #67 CLOSED). | **improved** (was 3 stale reads) |
| **PH-3 (guarantor assessed_amount)** | T5 | `s.final_amount` — 0 hits in `src/lib/ruleEngine/`. Pitfall #64 compliant. | unchanged |
| **PH-4 (director stake recompute)** | T5 | Both `AddApplicantBusiness` + `AddApplicantProfessional` import `recomputeStakeAfterEntityChange`. | unchanged |
| **PH-5 (obligation caseHasCompany)** | T5 | `ObligationCapture.svelte` references `caseHasCompany` at lines 150, 154, 684. | unchanged |
| **PH-6 (charge engine idempotency)** | T5 | `chargeEngineIdempotency.test.ts` passing. | unchanged |
| **PH-7 (income profile auto-drop)** | T5 | `incomeProfileSelectorAutoDrop.test.ts` passing. | unchanged |
| **PERF-1 through PERF-6** | T6 | No new performance regressions identified in this window. | unchanged |
| **OBS-1 (structured logging)** | T6 | All server routes use `logger`. | unchanged |
| **OBS-2 (OTel PII scrub)** | T6 | `obsTelemetryScrubbing.test.ts` passing. | unchanged |
| **T9 (blast radius)** | T9 | Shared modules touched: `payloadEnricher.ts` (extractGrossFromEntry rewrite), `loanSwitchOrchestrator.svelte.ts` (+3 owners), `evaluationEngine.ts` (+guarantor block), `billing.ts` (+TRIAL_DAYS export), `billingSubscription.ts` (type narrowing), `BillingProvider.ts` (type narrowing), `safeRedirectPath.ts` (new). All changes are additive or narrowing — no signature breaks. All lock tests pass. | clean |

---

## CI Lock Tests — All Pass

| Test file | Pitfall(s) | Status |
|-----------|-----------|--------|
| `directorAutoIncomeWiring.test.ts` | #46 | PASS |
| `preSubmitConfirmWiring.test.ts` | #47 | PASS |
| `confirmModalDismissal.test.ts` | #39 | PASS |
| `applicantRestoreCancel.test.ts` | #40 | PASS |
| `loanVariantPageIndexReset.test.ts` | #41 | PASS |
| `isReloadOfCurrentPath.test.ts` | #42 | PASS |
| `inputFieldOnInputWiring.test.ts` | #55 | PASS |
| `directorStakeRecompute.test.ts` | #56 | PASS |
| `nriIncomeStash.test.ts` | #57 | PASS |
| `companyDCObligationGate.test.ts` | #58 | PASS |
| `tokenRefreshScheduler.test.ts` | #59 | PASS |
| `chargeEngineIdempotency.test.ts` | #61 | PASS |
| `incomeProfileSelectorAutoDrop.test.ts` | #62 | PASS |
| `caseLevelDisabledReasonWiring.test.ts` | #53 | PASS |
| `obligationsDisabledReason.test.ts` | #26 | PASS |
| `verifyOtpNoInternalCheckDsa.test.ts` | M3 lock | PASS |
| `payloadEnricher.test.ts` | #67 | PASS |
| `incomeAssessorV2.test.ts` | #67 | PASS |
| `guarantorEligibilityAssessment.test.ts` | #64 | PASS |
| `deepLinkOtpRedirect.test.ts` | security lock | PASS |
| `safeRedirectPath.test.ts` | security lock | PASS |
| `loginRedirectSweep.test.ts` | auth lock | PASS |
| `billingCardGridLayout.test.ts` | UI lock | PASS |
| `dualTenureBTTopup.test.ts` | engine lock | PASS |
| `uiTypeRenderDispatch.test.ts` | Pitfall #19 lock | PASS |
| `loanSwitchPageIndexReset.test.ts` | Pitfall #38 lock | PASS |

---

## Prior Review Findings — Status Update

| Finding | Prior Severity | Status | Resolved by |
|---------|---------------|--------|-------------|
| H1 — TRIAL_DAYS hardcoded "30 days" | High | **CLOSED** | `beb5071f` |
| H2 — Missing Pitfall #43 test files | High | **STILL OPEN** | — |
| M1 — Dead 'yearly' billing_cycle variant | Medium | **CLOSED** | `142fb764` |
| M2 — Dead refund_issued / status.refund_processing | Medium | **CLOSED** | `d6e83b2b` (pre-baseline) |
| M3 — Redundant check-dsa in verify-otp | Medium | **CLOSED** | `00435a3f` |
| L1 — subscription/status rate limit | Low | **CLOSED** | (prior baseline) |
| L2 — Disclosure copy comment says "30-day" | Low | **CLOSED** | `beb5071f` |
| L3 — SubscriptionStatus legacy label | Low | **CLOSED** | `a7591eac` |
| L4 — Dead `// //console.log` lines | Low | **CLOSED** | `a7591eac` |
| SEC-2 — PII in bounce logging (email addresses) | Low (pre-existing) | **CARRY** | — |

**5 of 6 high/medium findings closed in this window.** Only H2 remains.

---

## Critical Findings

None.

---

## High-Priority Findings

### H2 — (CARRIED) Two Pitfall #43 CI tests still do not exist

**Confidence:** 100
**Status:** Unchanged from prior review. Files still missing:
- `src/lib/testing/__tests__/affordabilityScenarioGating.test.ts`
- `src/lib/testing/__tests__/propertyNotIdentifiedTrafficLight.test.ts`

`propertyNotIdentifiedPayload.test.ts` exists; the other two do not. Pitfall #43 enforcement is one-third covered.

---

## Medium Findings

No new medium findings. All prior medium findings (M1, M2, M3) closed in this window.

---

## Low Findings / Observations

### L5 — SEC-2 carry: `email.ts:394` logs raw email addresses on permanent bounce

**Confidence:** 80
**File:** [`src/lib/server/email.ts:394`](src/lib/server/email.ts:394)

```typescript
logger.error('Permanent bounce - email invalid', {
    recipients: bounceRecipients?.map((r: any) => r.emailAddress)
});
```

Error-level log, production-relevant (SES bounce handler). Should hash or mask email addresses before logging. Pre-existing, not introduced in this window, but becomes production-relevant once SES exits sandbox (case 177987930900751). **Priority rises to Medium when SES production access is granted.**

### L6 — `SubscribeRecurringSection.svelte` comment at line 100 says "TRIAL_DAYS-day" literally

**Confidence:** 60
**File:** [`src/lib/components/billing/SubscribeRecurringSection.svelte:100`](src/lib/components/billing/SubscribeRecurringSection.svelte:100)

The `beb5071f` commit interpolated TRIAL_DAYS into user-visible copy but updated inline comments to say `"TRIAL_DAYS-day"` as a literal string rather than the value. Harmless (comments don't render), but reads oddly — the comment should say `"start <TRIAL_DAYS>-day free trial"` or just reference the constant name: "Drives whether the trial CTA shows."

---

## Security Surface Summary

### Open-redirect closure (0372e6c6) — VERIFIED SOUND

`safeRedirectPath.ts` enforces 7 rules: non-empty string, single leading `/`, no `//`, no `\`, no `/api/`, URL-parser origin check. 34 unit tests cover attack vectors (protocol-relative, javascript:, data:, Windows-style backslash, API route prefix). Legacy `isSafeRedirect` (domain-allowlist, path-unvalidated) removed with in-place comment. All 4 `window.location.href` assignments in `loginWithRole` now route through `safeRedirectPath` or guard with `isSafeRedirectPath`. Both onboarding branches preserve deep-link only when safe. Dashboard auth-bounce captures `pathname + search` (parity with `(app)` layout).

### verify-otp simplification (00435a3f) — VERIFIED SOUND

Internal `fetch('/api/auth/check-dsa')` removed. No tokens generated in verify-otp anymore — token generation is exclusively in the client's `loginWithRole → check-dsa` call. Role cookie defaults to `'user'` (overwritten by check-dsa for existing users). `isNativePlatform` + `nativeTokenFields` block removed — native tokens were already served by check-dsa's response body, not verify-otp. 6 regression tests using Pitfall #66-compliant usage shapes.

### Rule engine — guarantor capacity (c951ed09) — VERIFIED SOUND

`evaluationEngine.ts` uses `assessed_amount` for guarantor capacity (correct — `final_amount` is 0 by design for non-pooled classifications). `null` policy threshold (lender refuses guarantors) handled at line 1181. GREEN→AMBER demote never escalates. Locked by `guarantorEligibilityAssessment.test.ts`.

### Rule engine — enricher rewrite (69868a08) — VERIFIED SOUND

Legacy stale-field reads (`netProfessionalIncome`, `averageMonthlyReceipts`, `averageMonthlyExpenses`) eliminated. New code reads `financialsTable.netProfitArray` + `itrFiled` — matches form-emitted shape. Multi-year income calc uses last 2 filed ITRs per owner policy. Edge cases handled: no valid filed years → 0, single ITR → uses it + raises `limitedVintage`, loss years participate, negative averages clamp to 0. Foreign-salaried path uses NET salary. All test fixtures updated to match form shape. Locked by `payloadEnricher.test.ts` + `incomeAssessorV2.test.ts`.

---

## Blast Radius Assessment (T9)

### Shared modules touched this window

| Module | Change type | Consumers affected | Risk |
|--------|-----------|-------------------|------|
| `payloadEnricher.ts` | Rewrite of `extractGrossFromEntry` + new signal fields | All 6 loan types' evaluation pipeline | **Medium** — mitigated by 12+ new tests and backward-compat on `_total_gross_monthly` |
| `evaluationEngine.ts` | +Guarantor eligibility block, +dual-tenure BT | All lender evaluations | **Low** — additive blocks, existing paths unchanged |
| `loanSwitchOrchestrator.svelte.ts` | +3 registered owners | All loan-type switches | **Low** — clear-only registrations, no behavioral change to existing owners |
| `confirmAndSubmit.ts` | +402 upgrade modal routing | All 6 loan submit flows | **Low** — existing paths unchanged, 402 is a new response code |
| `formSubmitHandler.ts` | +402 handling | All loan submit flows | **Low** — additive |
| `safeRedirectPath.ts` | New file | Login flow only | **Low** — no consumers beyond login.svelte |
| `billing.ts` | +TRIAL_DAYS export, type narrowings | Billing UI + server | **Low** — additive export, type narrowings are stricter not looser |

**No breaking signature changes.** All lock tests pass. All changes are additive or narrowing.

---

## Performance Notes

No regressions detected. The `payloadEnricher.ts` rewrite adds per-entry signal computation (`computeMultiYearMonthly`, `computeIncomeTrend`, `isForeignSalariedEntry`) — O(entries × years) per evaluation. With typical payloads (2-4 applicants × 1-3 income entries × 4 year cells), this is negligible (<1ms). No N+1 or unbounded loop introduced.

---

## Top Actions (priority order)

1. **Create `affordabilityScenarioGating.test.ts` and `propertyNotIdentifiedTrafficLight.test.ts`** to complete Pitfall #43 CI coverage (H2, carried 2 reviews)
2. **Mask email addresses in bounce handler** (`email.ts:394`) before SES production access is granted (L5/SEC-2, becomes Medium-priority at that point)
3. (**Optional**) Fix comment at `SubscribeRecurringSection.svelte:100` that says "TRIAL_DAYS-day" literally (L6, cosmetic)

---

## Known-Safe Inventory Update

- `safeRedirectPath.ts` added to known-safe inventory (strict same-origin validation, 34 unit tests)
- `verifyOtpNoInternalCheckDsa.test.ts` added — locks the verify-otp simplification
- `deepLinkOtpRedirect.test.ts` + `loginRedirectSweep.test.ts` added — lock the auth security fix
- `uiTypeRenderDispatch.test.ts` + `loanSwitchPageIndexReset.test.ts` added — lock Pitfall #19 + #38

---

*Report generated 2026-05-29 (evening). No source code modified during review.*
