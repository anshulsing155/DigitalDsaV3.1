# Daily Code Review — 2026-05-30

## Header

**Profile:** Full (T1-T9) — 43 commits in 24hr window across ≥8 workstreams (loan-field nomenclature rename Batches 1-12, Quota-Blocked-Cases S1-S3 + UX inversion, dashboard P1 batch, billing admin-override revert+revive, CSFLE prod-down + Pitfall #68 capture, native-binding build fix, results affordability label, Plot dev-authority resolver, form-schema browser-smoke hotfix). Full profile triggered by >10 commits AND auth + billing + rule-engine + build-system + form-engine surface coverage.
**Reviewed against:** committed `main` @ **`2d3604ef`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-29-b.md`](CODE-REVIEW-2026-05-29-b.md) (30-commit evening delta @ `66abd7a6`).
**Delta range:** `66abd7a6..2d3604ef` — 43 commits (≈26 code, ≈17 docs/tests/ops).
**Authors this window:** Prashant (single author + parallel agent — multi-agent worktree coordination evident in interleaved commit timestamps; no collisions or duplicate landings detected).

| Command | Status | Result | Delta vs `2026-05-29-b` prior |
|---------|--------|--------|------------------------------|
| `pnpm check` | **FAIL** | 1 error in [`src/lib/server/billing/quotaBlockedEmails.ts:80`](src/lib/server/billing/quotaBlockedEmails.ts:80) — `'dsa' is possibly 'null'`. **In-flight uncommitted file** (not on `main`). 0 errors against committed tree. | unchanged on committed tree; FAIL on working tree (in-flight) |
| `pnpm test:unit -- --run` | PASS | 276 files, **12,630 tests** | +28 tests (from 12,602) |
| `pnpm test:contrast` | PASS | **456/456 pairs** WCAG AA across every theme | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines in this window | unchanged |

---

## Commits Reviewed (43, grouped by workstream)

### Workstream A — Loan-Field Nomenclature Rename (Batches 1-12, ADR-0020)

The dominant theme of the window — 16 commits replacing `PlotLoanActivity` / `LAPType` / `unSecureLoanType` with the unified `loanType` / `loanVariant` / `facilityType` model via single-PR hard cutover (no soak). Strategy shift from three-phase soak captured in `e0a9af42` (Batch 11 amendments). Pitfall #33 marked obsolete in `5cf793a6`.

| SHA | Subject | Surface |
|-----|---------|---------|
| `d969e1b5` | Batch 1 — delete dead PRODUCT_TYPE_MAP | 1 file (-25) |
| `2ae92434` | Batch 2 — commonPage.json field rename | 1 file (+85/-124) |
| `408fd6eb` | Batch 3 — per-loan question banks field rename | 9 files (+51/-51) |
| `46559eb1` | Batch 4 — wizard configs `LAPType` → `facilityType` | 3 files (+6/-6) |
| `d6263970` | Batch 5 — form route components field reads | 8 files (+11/-23) |
| `b0ea9210` | Batch 6 — payload builders + rule engine reads + lapType payload field drop | 8 files (+45/-50) |
| `a123b8b6` | Batch 7 — test journeys + scenarios + factories | 11 files (+106/-99) |
| `fc6e05a9` | Batch 8a — regenerate 6 plot/LAP payload snapshots | 6 files (+8/-6) |
| `4c79a07c` | Batch 8b — rewrite 3 unit-test data sets to new field shape | 3 files (+34/-23) |
| `ecef5013` | Batch 9 — nomenclature regression lock test | 1 file (+87) |
| `5cf793a6` | Batch 10 — mark Pitfall #33 obsolete, update §4 #41 grep, §16 #11 rule | 2 files (+11/-5) |
| `e0a9af42` | Batch 11 — ADR + spec + integration doc amendments for hard-cutover | 4 files (+29/-12) |
| `fc942743` | Batch 12 — wipe + check + runbook scripts | 3 files (+371) |
| `0f9f1bd7` | Spec — durable execution plan committed | 1 file (+260) |
| `e271bfef` | Plot variant stash-and-restore + dotenv drop + runbook touchup | 3 files (+45/-13) |
| `4efeb791` | Regen 6 stale fixture snapshots + update 3 plot-fixture assertions | 8 files (+558/-528) |
| `e971ea66` | Browser-smoke hotfix — gate unsecured-only options to unsecured loanName | 1 file (+225/-45) |
| `092ebcff` | Lowercase collection names in wipe script (mongo is case-sensitive) | 1 file (+10/-8) |
| `a0b86484` | Drop dotenv dep from wipe script (same fix as rule-doc check) | 1 file (+12/-17) |

### Workstream B — Quota-Blocked Cases (QBC) end-to-end

Per-plan save buffer (Basic 1, Pro 5, Enterprise N/A) with auto-unblock on plan upgrade or cycle reset. ADR-0022. Honest follow-up commits address two unilateral deferrals (UX inversion + offer-computation cron) flagged by owner.

| SHA | Subject | Surface |
|-----|---------|---------|
| `edf9c4ce` | spec draft for owner sign-off | docs |
| `58f5cafa` | renumber ADR reference 0020 → 0022 | docs |
| `f835da37` | lock all 3 open questions (owner sign-off) | docs |
| `f12e7486` | **S1 core feature shipped** | 19 files (+863/-358) |
| `89f5b464` | S2 + S3 auto-unblock + archive cron | 4 files (+344/-1) |
| `ed94aeb8` | ADR-0022 — Per-Plan Quota-Blocked Save Buffer | 1 file (+109) |
| `d329b08e` | close two unilateral deferrals (UX inversion + offer-computation cron) | 7 files (+892/-268) |
| `dc29a6e8` | replace QBC offer-computation cron with **inline call** — reflexive over-architecture | 7 files (+538/-270) |
| `884aba82` | route sessionStorage through safeSessionStorage + register storage keys | 4 files (+32/-10) |
| `2b5f29f3` | session-close 2026-05-30 — QBC ship + cron→function discipline | docs |

### Workstream C — Dashboard P1 batch (owner screenshot feedback)

Six UI items shipped across two commits — quota indicator split across sidebar / top-bar chip / mobile banner, prominent Edit button, richer cases-list LOAN label, file-builder copy fix, dedup of Add Lender CTAs, Add Lender modal with inline offer details.

| SHA | Subject | Surface |
|-----|---------|---------|
| `5aca6deb` | P1 items 1 + 3 — persistent quota indicator + Edit button prominence | 7 files (+322/-14) |
| `4fc0cc99` | P1 batch — quota split + LOAN column format + Edit prominence + Add Lender modal | 10 files (+558/-189) |
| `2d3604ef` | session-close 2026-06-01 — CSFLE fix + admin override + P1 UI batch | docs |

### Workstream D — Production incident (CSFLE master-key mismatch)

13-day latent break surfaced once Pitfall #48 fix landed and the native binding finally loaded. Pitfall #68 added to capture the "CSFLE_ENABLED is the switch, no intermediate dormant state" institutional memory.

| SHA | Subject | Surface |
|-----|---------|---------|
| `70862a9f` | allow `mongodb-client-encryption` + `protobufjs` build scripts (Pitfall #48) | 1 file (+3/-1) |
| `5e5fccfd` | **debug(auth): TEMP — surface detect-roles exception text in response body** | 1 file (+20/-2) |
| `2915f7cc` | revert temp debug patch + document CSFLE_ENABLED-is-the-switch root cause (Pitfall #68) | 5 files (+237/-33) |
| `44e47d6e` | session-close 2026-05-31 — loan-field rename + open P0 production 500 | docs |

### Workstream E — Billing admin/is_test Pro-tier override (revert + revive)

Initially shipped, reverted defensively as auth-bisect during incident, confirmed innocent, re-shipped with defensive try/catch.

| SHA | Subject | Surface |
|-----|---------|---------|
| `b93b61dd` | feat — admin + test-flagged DSAs treated as Pro for case quota | 1 file (+22/-1) |
| `54882b87` | test — extend planResolver mock + 3 tests for internal-profile override | 1 file (+46) |
| `eb35e3c9` | **Revert** "test(billing): extend planResolver mock + 3 tests" | 1 file (-46) |
| `4523d4b3` | **Revert** "feat(billing): admin + test-flagged DSAs get treated as Pro" | 1 file (+1/-22) |
| `b21ddda7` | re-implement admin + is_test Pro-tier override **defensively** in resolveActivePlanId | 2 files (+119/-1) |

### Workstream F — Form / Results UX fixes

| SHA | Subject | Surface |
|-----|---------|---------|
| `bbbce1e8` | dynamic loan-name label on affordability card (was hardcoded 'Home Loan') | 4 files (+16/-9) |
| `cecbdd37` | Plot Loan dev-authority dropdown city-filter (parity with Home Loan) | 3 files (+72/-104) |

---

## Standing Grep Rules — Full T1-T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch in .svelte / .ts | T1 | 0 violations. Grep `fetch(... method: 'POST|PUT|DELETE|PATCH')` returns no files. All state-changing calls route through `secureFetch`. | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | 22 files match `{@html`; non-sanitized cases are all server-controlled / developer-authored / archive: `Toast.svelte:87` (controlled icon obj), 4 loan `+page.svelte` `serverPage?.pageDescription` (schema-authored), `JsonLd.svelte:10` (schema JSON-LD), `admin/policies/[artifact_id]/+page.svelte:407` (admin-tool human_readable), `how-can-we-help/+page.svelte:505` (static `NoteWorthyMessage` w/ one `<span>` literal), `_archive/*` (archived). 0 new violations. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server/API | T1 | 0 hits in `src/routes/api/`. | unchanged |
| **G (Co-Authored-By)** | T1 | 0 trailer lines in 43 commits. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | No new credentials in source. | unchanged |
| **SEC-2 (PII in logging)** | T1 | Bounce handler (`email.ts:394`) still logs raw email addresses on permanent bounce (carry from prior; pre-existing). New QBC email module deliberately does NOT log recipient `to` — only `dsa_id` strings. **No new PII leakage.** Note: the temp debug patch `5e5fccfd` would have leaked stack frames to clients; correctly reverted by `2915f7cc` within ~50 minutes. | unchanged (carry) |
| **SEC-3 (cookie security)** | T1 | No cookie changes this window. | unchanged |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved (test-runner, RegExp.exec). | unchanged |
| **SEC-5 (env var exposure)** | T1 | No new VITE_* exposures. | unchanged |
| **SEC-6 (rate limiting)** | T1 | `detect-roles` rate-limit at 10/10-min retained through debug-patch cycle. | unchanged |
| **SEC-7 (client storage PII)** | T1 | QBC sessionStorage handoff carries form input (DSA's own data); not rule-engine internals. `884aba82` migrated to `safeSessionStorage` wrapper + registered both keys (`qbc.pendingSubmission`, `evaluationPayload`) in `storageKeys.ts`. | **improved** |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (module-scope fetch)** | T2 | 0 | unchanged |
| **D (typeof window SSR guard)** | T2 | 0 — Pitfall #9. | unchanged |
| **I (state_referenced_locally)** | T2 | 0 from `pnpm check` against committed tree | unchanged |
| **J (engines.node pin)** | T2 | `"22.x"` — specific major. | unchanged |
| **SSR-1 (browser import in server)** | T2 | 0 | unchanged |
| **SSR-2 (noExternal coverage)** | T2 | No new SSR-externalized deps. The `70862a9f` build allowance is a pnpm `onlyBuiltDependencies` change (postinstall scripts approved for `mongodb-client-encryption` + `protobufjs`), not a Vite externals change. | unchanged |
| **H1 ($-prefix Query)** | T3 | 0 — Pitfall #28. | unchanged |
| **K (loan-switch chokepoint)** | T3 | `migrateApplicantsToRecoveryOnLoanSwitch` called only from `loanSwitchOrchestrator.svelte.ts:349` (definition + 1 orchestrator call site). | unchanged |
| **L (reload detection)** | T3 | `getEntriesByType('navigation')` only in `isReloadOfCurrentPath.ts` + perf e2e + test file. | unchanged |
| **M (combinedAnswers collision)** | T3 | 0 in `src/lib/components`. | unchanged |
| **S (unsanitized {@html})** | T3 | Same as E. | unchanged |
| **CQ-1 (pre-submit confirm)** | T3 | `submitFormForEvaluation` is now a thin stash+nav shim (post-QBC inversion `d329b08e`); rule-engine call lives in the new `callEvaluateAndPersist` consumed only by `/evaluating/+page.svelte`. All 6 loan `+page.svelte` files still wire through `confirmAndSubmit`. Static-scan `preSubmitConfirmWiring.test.ts` PASS. | structurally changed (acknowledged) |
| **CQ-2 (ConfirmModal dismissal)** | T3 | All dismissal paths via `dismissConfirmModal`. | unchanged |
| **CQ-3 (token refresh scheduler)** | T3 | `(app)/+layout.svelte` lines 5/6/19/20 wire start+stop; `auth.svelte.ts:142` stops on logout. | unchanged |
| **CQ-4 (NRI income stash)** | T3 | All 3 unsecured AddApplicant components import `applyNriIncomeStashForApplicant`. | unchanged |
| **CQ-5 (case-level disabled reason)** | T3 | All 3 unsecured loan pages import `getCaseLevelDisabledReason`. | unchanged |
| **PH-1 (archived route stubs)** | T5 | All 7 archived `+server.ts` files (incl. the new `_archived_process_unblocked_cases/+server.ts` from `dc29a6e8`) import only from `'./$types'` + `'$lib/server/apiResponse.js'`. | unchanged — **new stub clean** |
| **PH-2 (enricher stale fields)** | T5 | `inc.netProfessionalIncome` / `inc.averageMonthlyReceipts` / `inc.averageMonthlyExpenses` — 0 hits in `payloadEnricher.ts`. Pitfall #67 stays closed. | unchanged |
| **PH-3 (guarantor assessed_amount)** | T5 | `s.final_amount` — 0 hits in `src/lib/ruleEngine/`. Pitfall #64 compliant. | unchanged |
| **PH-4 (director stake recompute)** | T5 | BL + Prof both import `recomputeStakeAfterEntityChange`. | unchanged |
| **PH-5 (obligation caseHasCompany)** | T5 | `ObligationCapture.svelte` references `caseHasCompany` (3 hits). | unchanged |
| **PH-6 (charge engine idempotency)** | T5 | `chargeEngineIdempotency.test.ts` PASS. | unchanged |
| **PH-7 (income profile auto-drop)** | T5 | `incomeProfileSelectorAutoDrop.test.ts` PASS. | unchanged |
| **Pitfall #1 (`!=` null check JSON-Logic)** | T3 | 80+ `!=` usages across `src/lib/config/`, all compare to value literals (`''`, `true`, value strings), not nullable forms. No new null-check `!=` regressions. | unchanged |
| **Pitfall #19 (calendar text inputs)** | T3 | `monthPickerWiring.test.ts` PASS. | unchanged |
| **Pitfall #41 (per-loan page index reset)** | T3 | `VARIANT_SHAPING_KEYS` + `resetLoanPageIndex` wired in `how-can-we-help/+page.svelte` + orchestrator. Comment updated to new field names by `5cf793a6`. | unchanged |
| **Pitfall #42 (reload detection on loan pages)** | T3 | All routes use `isReloadOfCurrentPath`. | unchanged |
| **Pitfall #48 (mongo-client-encryption native build)** | T5 | `node_modules/mongodb-client-encryption/build/Release/mongocrypt.node` PRESENT. `70862a9f` adds `onlyBuiltDependencies` to package.json so `pnpm install` no longer silently skips the postinstall. | **improved** (was a worktree-only hazard, now repo-wide guard) |
| **Pitfall #63 (archived routes compile)** | T5 | New stub `_archived_process_unblocked_cases/+server.ts` from QBC over-architecture revert verified pure-410 shape. | unchanged |
| **Pitfall #68 (CSFLE_ENABLED is the switch)** | T1/T5 | **NEW** — `2915f7cc` adds the pitfall, the diagnostic script `scripts/diagnose-csfle-state.mjs`, the SESSION-HANDOFF update, and a 3-step discipline (diagnose → fresh-OTP smoke → never trust "no-op passthrough" notes). | **added this window** |
| **PERF-1 through PERF-6** | T6 | No new regressions. `b21ddda7` adds 2 indexed `findOne` lookups to the plan-resolver hot path, but they're `Promise.all`-parallelized and projected (`{ _id: 1 }` / `{ is_test: 1 }`) — sub-millisecond on indexed reads. See observation below. | unchanged |
| **OBS-1 (structured logging)** | T6 | All new code paths use `logger`. QBC email module logs `dsa_id` only, never `to`. | unchanged |
| **OBS-2 (OTel PII scrub)** | T6 | `obsTelemetryScrubbing.test.ts` PASS. | unchanged |
| **T9 (blast radius)** | T9 | Shared modules touched extensively. See [Blast Radius](#blast-radius-assessment-t9). | **broad** |

---

## CI Lock Tests — All Pass (against committed tree)

| Test file | Pitfall(s) | Status |
|-----------|-----------|--------|
| `loanFieldNomenclatureLock.test.ts` | rename (new) | PASS |
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
| `billing/upgradePromptWiring.test.ts` | QBC handoff shape | PASS |
| `billing/caseLimitWarnLevel.test.ts` | QBC | PASS |
| `billing/planResolver.test.ts` | override + defensive fallback | PASS |
| `stageTransitions.test.ts` | QBC quota_blocked → intake gate | PASS |

12,630 / 12,630 unit tests passing (+28 from baseline `12,602`).

---

## Prior Review Findings — Status Update

| Finding | Prior Severity | Status | Resolved by |
|---------|---------------|--------|-------------|
| H1 — TRIAL_DAYS hardcoded "30 days" | High | CLOSED prior | `beb5071f` |
| H2 — Pitfall #43 affordability test files missing | High | **STILL OPEN** | — |
| M1 — Dead 'yearly' billing_cycle | Medium | CLOSED prior | `142fb764` |
| M2 — Dead refund_issued status | Medium | CLOSED prior | `d6e83b2b` |
| M3 — Redundant check-dsa in verify-otp | Medium | CLOSED prior | `00435a3f` |
| L5 — SEC-2 bounce-handler raw email logging | Low (carry) | **CARRY** — pre-existing; rises to Medium when SES production access lands | — |
| L6 — SubscribeRecurringSection.svelte:100 comment `"TRIAL_DAYS-day"` literal | Low | **STILL OPEN** (cosmetic) | — |

---

## Critical Findings

None.

---

## High-Priority Findings

### H2 — (CARRIED) Two Pitfall #43 CI tests still do not exist

**Confidence:** 100
**Status:** Unchanged from `2026-05-29-b`. Files still missing:
- `src/lib/testing/__tests__/affordabilityScenarioGating.test.ts`
- `src/lib/testing/__tests__/propertyNotIdentifiedTrafficLight.test.ts`

`propertyNotIdentifiedPayload.test.ts` exists; the other two do not. Pitfall #43 enforcement is one-third covered. **Especially relevant this window** because [`bbbce1e8`](src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte) shipped a dynamic loan-name fix to the affordability surface — a future regression on that surface would slip past CI again.

### H3 — In-flight: `pnpm check` FAILS on uncommitted [`quotaBlockedEmails.ts:80`](src/lib/server/billing/quotaBlockedEmails.ts:80)

**Confidence:** 100
**Status:** In working tree only (not on `main`). `dsa` is `possibly null` at the final `return { to, name: dsa.name }` despite the guard above. TypeScript fails to narrow `dsa` through the `if (!dsa || !to)` pattern because `to` was derived via optional-chain.

```typescript
const dsa = await DsaApplications.findOne(...);
const to = dsa?.email?.trim();
if (!dsa || !to) { ... return null; }
return { to, name: dsa.name };  // ← TS still sees `dsa` as nullable
```

**Suggested fix:**
```typescript
if (!dsa) { logger.warn(...); return null; }
const to = dsa.email?.trim();
if (!to) { logger.warn(...); return null; }
return { to, name: dsa.name };
```

Or assert: `return { to, name: dsa!.name };` after the guard.

**Why it matters now:** the CI `pnpm check` gate (CLAUDE.md §5 Done Checklist step 1) will block the next commit on this file unless the type narrowing is fixed first. The current `main` is clean — this is an in-flight blocker for the next QBC follow-up commit.

---

## Medium Findings

### M-N1 — `b21ddda7` planResolver override adds 2 unconditional `findOne` reads to every `resolveActivePlanId` call

**Confidence:** 70
**Severity:** Medium-low (observation, not a bug)
**File:** [`src/lib/server/billing/planResolver.ts:99-117`](src/lib/server/billing/planResolver.ts:99-117)

The defensive re-implementation parallelizes `AdminUsers.findOne` + `DsaApplications.findOne` with `Promise.all` and projects only the `_id` / `is_test` fields. Indexed `_id` lookups on tiny projections are sub-millisecond, but `resolveActivePlanId` is on the hot path of:

- `/api/evaluate-and-persist` case-create gate
- every dashboard quota read
- `getQuotaState` (called from at least 3 `+page.server.ts` loads)

Per call site this is ~2 extra round trips. At 50ms p95 budgets per page-server load this is a small but measurable overhead — and the override exists for QA convenience, not for correctness.

**Recommendation:** consider caching the admin/is_test booleans on the JWT (resolved at login in `check-dsa`) so the override resolves from `locals.user` instead of a DB hit. Defer until profiling shows real impact — for now the defensive try/catch is the right design.

### M-N2 — `getQuotaState` `cycleStartAt` uses 30-day arithmetic; real billing cycle is calendar-anchored

**Confidence:** 75
**Severity:** Medium-low (cosmetic)
**File:** [`src/lib/server/billing/quotaState.ts:115-122`](src/lib/server/billing/quotaState.ts:115-122)

```typescript
cycleStartAt: new Date(
  activePlan.next_charge_at.getTime() - 30 * 24 * 60 * 60 * 1000
).toISOString()
```

Real monthly anchors stay on the same calendar day-of-month — May 31 → June 30 → July 31 — which is *not* 30 days. The sidebar pill will read "1 May 26 – 30 May 26" when the actual cycle is "31 Apr 26 – 31 May 26" (or "30 Apr 26 – 30 May 26" in months without a 31st). At the May/Mar/Jul/Aug/Oct/Dec boundaries the displayed start can be off by 1-2 days. Harmless for accounting (only the sidebar pill consumes it) but visible to the DSA.

**Recommendation:** derive `cycleStartAt` from a calendar subtraction:
```typescript
const next = activePlan.next_charge_at;
const start = new Date(next);
start.setMonth(start.getMonth() - 1);
```
This stays exact on every month boundary. Alternative: stamp `cycle_start_at` on `BillingSubscriptions` at charge time and read it back.

### M-N3 — Lender-offers loader in `[case_id]/+layout.server.ts` swallows all errors silently

**Confidence:** 65
**Severity:** Medium-low
**File:** [`src/routes/dashboard/dsa/cases/[case_id]/+layout.server.ts:325-345`](src/routes/dashboard/dsa/cases/[case_id]/+layout.server.ts:325-345)

```typescript
} catch {
  // Non-fatal — modal falls back to plain lender list.
}
```

Empty catch with no `logger.warn`. If the snapshot read or coercion fails for a real reason (corrupt `payload.results` shape, ObjectId mismatch, projection drift), the Add Lender modal silently falls back to the no-offers state with no operator signal. UX is degraded but invisible to logs/dashboards.

**Recommendation:** at least add a `logger.warn({ err, case_id }, '[case-layout] failed to load LenderResultsSnapshots — modal will show no-offers state')`. Cheap, scoped, doesn't change behavior.

---

## Low Findings / Observations

### L-N1 — `5e5fccfd` debug patch correctly reverted within ~50min, but could have leaked stack frames

**Confidence:** 85
**Severity:** Low (closed)
**Files:** [`src/routes/api/auth/detect-roles/+server.ts`](src/routes/api/auth/detect-roles/+server.ts) (now reverted)

The temp `__debug` field (exception name + message + first 6 stack lines) would have shipped stack frames over the wire to any unauthenticated client hitting `/api/auth/detect-roles`. This was a deliberate diagnostic patch (clearly marked TEMP with revert instructions), and `2915f7cc` cleaned it up cleanly ~50 minutes later. **Documenting here for the institutional record** — a future "TEMP" debug ship on the same path should consider deploying to a non-prod Preview first, or gating on `dev` mode.

The Pitfall #68 entry in CLAUDE.md / PITFALLS.md already captures the underlying root cause; this observation is about the DIAGNOSTIC step that followed, not the bug.

### L-N2 — QBC handoff via sessionStorage carries DSA form input but is technically PII-adjacent

**Confidence:** 60
**Severity:** Low
**Files:** [`src/lib/utils/formSubmitHandler.ts`](src/lib/utils/formSubmitHandler.ts), [`src/routes/(app)/evaluating/+page.svelte`](src/routes/(app)/evaluating/+page.svelte), [`src/lib/config/storageKeys.ts`](src/lib/config/storageKeys.ts)

The `qbc.pendingSubmission` key carries `SubmitOptions` (form state JSON + case ID + DSA ID) for ~1 navigation hop between form submit and `/evaluating`. Already documented in the commit message as "DSA's own form input ... not rule-engine internals", and the `safeSessionStorage` wrapper minimizes the lifetime. **Sufficient for now**; revisit if shared-device scenarios become a documented threat model.

### L-N3 — Authorities resolver: `cecbdd37` correctly shares `buildAuthorityOptions` between HL + Plot; no equivalent yet for LAP

**Confidence:** 50
**Severity:** Low (informational)
**File:** [`src/lib/server/formEngine/optionResolver.ts`](src/lib/server/formEngine/optionResolver.ts)

Commit message confirms "LAP doesn't have an equivalent question so it doesn't need this fix." This is correct today; record as known-safe inventory so a future LAP "development authority" question gets wired through the same resolver instead of re-introducing a hardcoded list.

### L-N4 — `lapType` payload field dropped without deprecation; `b0ea9210` confirmed zero consumers but worth a CI lock

**Confidence:** 60
**Severity:** Low
**File:** [`src/lib/utils/payloadBuilder/types.ts`](src/lib/utils/payloadBuilder/types.ts), [`src/lib/utils/payloadBuilder/loanTransaction.ts`](src/lib/utils/payloadBuilder/loanTransaction.ts)

Batch 6 dropped the `lapType` field from `LoanTransactionPayload` after a grep audit showed zero consumers. Reasonable, but the same audit was done for `PRODUCT_TYPE_MAP` (Batch 1) and `bank-loan-management` (Batch 11) — three "no-consumer" claims in one PR. Worth a small `legacyPayloadFieldsAbsent.test.ts` that scans for the removed names as a USAGE shape (per Pitfall #66) to lock them as gone-and-staying-gone.

### L5 — SEC-2 bounce-handler raw email logging (CARRY from prior)

**Confidence:** 80
**File:** [`src/lib/server/email.ts:394`](src/lib/server/email.ts:394)

Pre-existing. Becomes a higher-priority finding once AWS SES production access lands (case 177987930900751). QBC adds 3 new email sites that route through the same `sendEmail` — same logger pattern, same risk surface, no new violations introduced.

### L6 — SubscribeRecurringSection comment literal (CARRY from prior)

**Confidence:** 60
**File:** [`src/lib/components/billing/SubscribeRecurringSection.svelte:100`](src/lib/components/billing/SubscribeRecurringSection.svelte:100)

Cosmetic; unchanged.

---

## Security Surface Summary

### Loan-field rename Batch 6 — payload schema change, blast-radius reviewed

`b0ea9210` adds `loanVariant?: string` to `LoanTransactionPayload`, drops `lapType`, and changes the read source for `facilityType` across LAP + 3 unsecured products. The committed snapshots (`fc6e05a9`) and unit-test data sets (`4c79a07c`) re-baseline against the new shape. The nomenclature lock test (`ecef5013`) is a static-scan that asserts the legacy `{ var: 'PlotLoanActivity' }` / `{ var: 'LAPType' }` / `{ var: 'unSecureLoanType' }` JSON-Logic forms are absent in `src/lib/config/` (excluding `_archive*` per Pitfall #66 discipline). Combined with the live submit path going through the new fields, the rename is end-to-end coherent. Live rule docs were verified clean by the operator-step `scripts/check-rule-docs-field-refs.mjs` (per runbook).

### CSFLE production incident — Pitfall #68 captured cleanly

The 13-day latent break was rooted in a master-key mismatch (DEKs minted with key A; current `QE_LOCAL_MASTER_KEY` is key B). The native binding fix (`70862a9f`) was the trigger, not the cause — encryption finally executed. The debug patch (`5e5fccfd`) and its revert (`2915f7cc`) handled the diagnosis cleanly with explicit TEMP markers. The new diagnostic script ([`scripts/diagnose-csfle-state.mjs`](scripts/diagnose-csfle-state.mjs)) is read-only — prints DEK metadata + auth-collection mobile type distribution + per-collection PII shapes (types only, never values). **Verified safe** to run against production. The new memory entry `~/.claude/projects/F--TECH-DigitalDSA-REPOs-DigitalDSA-V3/memory/feedback_diagnose_before_revert.md` captures the cautionary-tale aspect of the incident.

### Billing admin/is_test override — defensive try/catch is correct design

`b21ddda7` wraps the two override lookups in a try/catch that falls through to the normal `BillingSubscriptions` resolution on any DB exception. Logger.warn surfaces the silent fall-through to operators. The override is a QA convenience, never a correctness gate; losing it for one request during a transient DB blip is strictly better than 500-ing every downstream consumer. **Sound pattern; recommend codifying** as a feedback memory if not already.

### QBC sessionStorage handoff — auditable, low blast radius

The form-submit-to-`/evaluating` handoff via `safeSessionStorage` (`884aba82`) is appropriate for the use case. The data carried is the DSA's own form input (already in the page that just submitted it) plus a `dsaId` they own. Single-hop lifetime (read + clear on `/evaluating` mount). Both keys are registered in `storageKeys.ts` with the new `form-submit` domain.

---

## Blast Radius Assessment (T9)

Window is heavy on shared-module touches, but the impact is well-contained per module by tests + types + new lock tests.

| Module | Change type | Consumers affected | Risk |
|--------|-----------|-------------------|------|
| `payloadBuilder/loanTransaction.ts` | Field-source change + `lapType` drop + `loanVariant` add | All 6 loan products' submit path | **Medium** — mitigated by 6 snapshot regens (`fc6e05a9`, `4efeb791`), 3 unit data sets (`4c79a07c`), nomenclature lock (`ecef5013`), and field-rename CI test |
| `combinedAnswersMemo.ts` | Aliasing source rename | All form pages reading `combinedAnswers.*` | **Low** — aliases keep the same shape; Pitfall #13 collision scan clean |
| `commonPage.json` | 270-line rewrite | Every loan + how-can-we-help question render | **Medium** — `e971ea66` browser-smoke hotfix caught one duplicate-key crash post-rewrite; recommend a second smoke pass next session |
| `optionResolver.ts` | Shared `buildAuthorityOptions` for HL + Plot | Both loan products' authority dropdown | **Low** — purely additive registration |
| `planResolver.ts` | +2 unconditional indexed reads on hot path | All quota/billing reads | **Low** — bounded by Promise.all + `_id` projection |
| `quotaUnblock.ts` + `quotaBlockedEmails.ts` (in-flight) | +3 email templates + best-effort dispatch | Plan upgrade + cycle reset paths | **Low** — failures logged + swallowed, never roll back stage transitions |
| `+layout.server.ts` (case_id) | +lenderOffers projection load | Case-detail overview tab | **Low** — defensive try/catch; modal degrades gracefully |
| `formSubmitHandler.ts` | Split `submitFormForEvaluation` → stash-shim + new `callEvaluateAndPersist` | All 6 loan submit flows | **Medium** — flow now branches at `/evaluating`; `upgradePromptWiring.test.ts` covers the new shape |
| `+page.svelte` (`/evaluating`) | Becomes the branching consumer of the new flow | All loan submits | **Medium** — only one consumer; behavior of save/no/upgrade prompts verified by tests |

**No breaking signature changes** in publicly-exported helpers. The `lapType` drop was preceded by a documented grep audit. The QBC inversion is the largest behavioral change but is gated by the in-place lock tests.

---

## Performance Notes

- Plan-resolver override (`b21ddda7`): +2 indexed `findOne` reads per call. Parallelized + minimally projected — sub-millisecond on a healthy cluster. Acknowledged trade-off for QA convenience.
- Auto-unblock batch (`89f5b464` + `dc29a6e8`): inline call replaces a cron, bounded by `saveBuffer` (max 5 cases × ~2s eval ≈ 10s worst case). Within Vercel Pro's 60s function limit; correct architectural call per the commit-message rationale.
- LenderOffers loader (`4fc0cc99`): one `findOne` with light projection on case-detail layout load. Indexed by `case_id`, sorted by `version` (also indexed). No N+1 introduced.

No performance regressions detected.

---

## Top Actions (priority order)

1. **Fix in-flight type narrowing** at [`quotaBlockedEmails.ts:80`](src/lib/server/billing/quotaBlockedEmails.ts:80) so `pnpm check` is clean before the next QBC follow-up commit lands (H3).
2. **Create the two missing Pitfall #43 CI tests** — `affordabilityScenarioGating.test.ts` + `propertyNotIdentifiedTrafficLight.test.ts`. Especially timely since `bbbce1e8` just changed the affordability surface (H2, carried).
3. **Pick a `cycleStartAt` strategy** — either calendar-month subtraction in `quotaState.ts` or stamp `cycle_start_at` on `BillingSubscriptions` (M-N2). Sidebar pill is visible to every DSA on every page load.
4. **Add `logger.warn` to the lender-offers loader catch block** in `[case_id]/+layout.server.ts:344` (M-N3) — 3-line change, restores operator signal.
5. (**Optional, low**) Add a `legacyPayloadFieldsAbsent.test.ts` lock for `lapType`, `PRODUCT_TYPE_MAP`, `bank-loan-management` references to permanently codify the three "no-consumer" claims from this PR (L-N4).
6. (**Optional, when SES production access lands**) Mask email addresses in [`email.ts:394`](src/lib/server/email.ts:394) bounce log (L5).
7. (**Optional, cosmetic**) Re-word the `"TRIAL_DAYS-day"` comment literal at [`SubscribeRecurringSection.svelte:100`](src/lib/components/billing/SubscribeRecurringSection.svelte:100) (L6).

---

## Known-Safe Inventory Update

- `scripts/diagnose-csfle-state.mjs` — read-only CSFLE diagnostic; safe against production (added 2026-05-30, `2915f7cc`).
- `scripts/wipe-pre-rename-cases.mjs` — dry-run by default; `--execute` required for destructive path; lowercase collection names confirmed by `092ebcff`.
- `scripts/check-rule-docs-field-refs.mjs` — read-only audit script; uses Node 22 `--env-file`, no dotenv dependency.
- `loanFieldNomenclatureLock.test.ts` — static-scan lock asserting absence of legacy JSON-Logic var names in `src/lib/config/` (Pitfall #66-compliant; targets USAGE shapes, not bare identifiers).
- `billing/planResolver.test.ts` — internal-profile override + defensive-fallback (3+3 cases).
- `billing/upgradePromptWiring.test.ts` — accepts both `safeSessionStorage` and raw `sessionStorage` (wrapper transparency).
- `_archived_process_unblocked_cases/+server.ts` — 410 stub, pure (`'./$types'` + `apiResponse.js` only).
- ADR-0022 (Per-Plan Quota-Blocked Save Buffer) added.
- Pitfall #68 (CSFLE_ENABLED is the switch) added with full timeline + discipline.

---

*Report generated 2026-05-30. No source code modified during review. `pnpm check` failure is on the uncommitted in-flight file `quotaBlockedEmails.ts` (H3); committed `main` is clean.*
