---
type: review
epic: none
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Daily Code Review — 2026-06-02 (PM Supplement)

## Header

**Profile:** Standard (T1-T6, T9) — 18 commits, single author, shared module change (hooks.server.ts) triggers T9 but no auth/payment logic changes → Standard profile sufficient.
**Reviewed against:** committed `main` @ **`dc5b614e`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-06-02.md`](CODE-REVIEW-2026-06-02.md) (28 commits, Full profile @ `b80c7d6a`).
**Delta range:** `35b2de62..dc5b614e` — 18 commits, 65 files changed, +3780/−444.
**Authors this window:** Prashant (single author).
**WIP (uncommitted, NOT reviewed):** `docs/v5-planning/` (untracked, docs-only).

---

## Automated Health Check

| Command | Status | Result | Delta vs prior (`2026-06-02` AM) |
|---------|--------|--------|----------------------------------|
| `pnpm check` | PASS | 0 errors, 3 warnings (CSS `-webkit-line-clamp`) | unchanged |
| `pnpm test:unit -- --run` | PASS | 304 files, **12,987 tests** | **+69 tests** (from 12,918) |
| `pnpm test:contrast` | PASS | **456/456 pairs** WCAG AA | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines | unchanged |
| Registry integrity check | PASS | All 16 active form keys found | unchanged |

---

## Commits Reviewed (18)

### Workstream A — LEND-1 Plot & Equity (4 commits)

| SHA | Subject | Files | Tests |
|-----|---------|-------|-------|
| `26e5a5df` | feat(lend-1): Phases 1a/1b/1c/2 — 3-cap math + payload aliasing + propertyIdentified force-true | 31 (+1563/−165) | plotEquity3CapEngine (459 lines), plotEquityCanonicalFields (211 lines) |
| `c2e58e22` | docs(lend-1): Phase 3 — parser spec additions | 2 (docs only) | — |
| `d0c71683` | feat(lend-1): Phase 4 — Plot & Equity UI + file-builder PDF | 6 (+490/−13) | fileBuilderLenderOffer (128 lines) |
| `693ec928` | feat(lend-1): buyer-margin-on-registered sub-note (P4 follow-up) | 7 (+85/−6) | +19 lines to existing suite |

### Workstream B — Billing & ConfirmModal redesign (3 commits)

| SHA | Subject | Files | Tests |
|-----|---------|-------|-------|
| `35b2de62` | chore(billing): S216 follow-up batch — parallel-session billing + review docs + dev helper | 8 (+625/−17) | — |
| `997ba003` | feat(billing): ConfirmModal redesign — quota-aware submit/edit gate | 20 (+1088/−170) | computeConfirmModalState (295 lines) |
| `5a6f3458` | fix(billing): synthetic Pro plan cycle anchor + topbar quota refresh | 4 (+88/−5) | planResolver (+37 lines) |

### Workstream C — Walkthrough / Product Guide (3 commits)

| SHA | Subject | Files | Tests |
|-----|---------|-------|-------|
| `5fe4327e` | fix(walkthrough): auto-trigger fires once-per-lifetime + content refresh | 8 (+419/−31) | walkthroughAutoTriggerLifetime (198 lines) |
| `4ea60ddf` | fix(walkthrough): clamp IntroGuideHint tooltip away from sidebar | 1 (+21/−2) | — |
| `b08b7802` | fix(dashboard): surface case_id in Recent Cases rows | 1 (+14/−1) | — |

### Workstream D — Performance parallelization (3 commits)

| SHA | Subject | Files | Tests |
|-----|---------|-------|-------|
| `83add975` | perf(dashboard): parallelize layout queries + merge two findOnes | 2 (+168/−72) | dashboardLayoutParallelQueries (65 lines) |
| `7a2e85c2` | perf(evaluate-and-persist): dedupe activePlan lookup + parallelize quota | 1 (+37/−13) | — |
| `1ffcd59f` | perf(otel): lazy-load SDK modules for cold-start savings | 2 (+36/−18) | — |

### Workstream E — Snapshot resilience (2 commits)

| SHA | Subject | Files | Tests |
|-----|---------|-------|-------|
| `eac11c29` | fix(snapshots): per-row decrypt resilience + parallelize DSA + Case queries | 2 (+36/−7) | — |
| `dc5b614e` | fix(snapshots): fall through to plaintext payload on decrypt failure | 1 (+14/−4) | — |

### Workstream F — Docs / housekeeping (3 commits)

| SHA | Subject |
|-----|---------|
| `459acfe6` | docs: S217 docs-sync close |
| `d59eb74a` | docs: S218 /end close — LEND-1 epic done + ConfirmModal + ADR-0026 + 4 live-bug fixes |
| `641e8dbf` | chore(audit): Pitfall #3 re-verify + provision QBC archive cron |
| `9b5bea4a` | docs(spec+adr): single-session login enforcement — C-strict philosophy |

---

## Standing Grep Rules Sweep (T1-T6 + T9)

### Tier 1 — Security

| Rule | ID | Result | Delta vs prior |
|------|----|--------|----------------|
| CSRF: raw `fetch()` in .svelte | A | 25 files | unchanged — all use `secureFetch` via `confirmAndSubmit` |
| XSS: `{@html}` | E | 21 files, all sanitized or documented safe | unchanged |
| XSS: dynamic attr injection | E2 | no new sites | unchanged |
| Logging: bare `console` in server | F | 2 files (`telemetry.ts`, `logger.ts`) — both approved | unchanged |
| Co-Authored-By trailer | G | **0** | unchanged |
| Hardcoded secrets | SEC-1 | 20 files — all test fixtures or type defs | unchanged |
| PII in logging | SEC-2 | clean — new `confirmModalContext.ts` logs `dsaId` only (not PII) | unchanged |
| Cookie security flags | SEC-3 | 20 files | unchanged |
| Injection: eval/exec/Function | SEC-4 | 12 files — all test files + 2 approved admin routes | unchanged |
| Env var client exposure | SEC-5 | 0 `$env/*/private` in `.svelte` | unchanged |
| Rate limiting coverage | SEC-6 | **CARRY-FORWARD** — see prior review M-H2 | unchanged |
| Client storage PII | SEC-7 | 23 files — **+2 new** (`walkthrough.svelte.ts`): stores `ddsa_intro_auto_triggered` (boolean) + `ddsa_intro_auto_triggered_this_session` (boolean). **Not PII — safe.** | +2 localStorage keys, both boolean markers |

### Tier 2 — Crash / SSR / 500

| Rule | ID | Result | Delta |
|------|----|--------|-------|
| SSR: Capacitor static import | B | **0** | unchanged |
| State loss: `window.location.reload()` | C | 12 files (all approved sites) | unchanged |
| Async: Capacitor proxy return | D | **0** | unchanged |
| SSR guard: `typeof window` | I | **0** | unchanged |
| Module-scope `fetch` | J | **0** | unchanged |
| Hydration: non-deterministic | SSR-1 | no new sites in `.svelte` components | unchanged |

### Tier 3 — Correctness & Quality

| Rule | ID | Result | Delta |
|------|----|--------|-------|
| `state_referenced_locally` | H1 | **0** | unchanged |
| JSON-Logic `!=` | K | 354 across 44 files — no changes to questionBank files today | unchanged |
| Numeric `minLimit` | L | not re-run (no form schema changes today) | n/a |
| `combinedAnswers` alias collision | M | **0** new sites | unchanged |
| Color contrast WCAG AA | S | **456/456** | unchanged |
| Empty catch blocks | CQ-1 | **0** | unchanged |
| Memory leaks: intervals/listeners | CQ-2 | 22 files — no new uncleaned intervals | unchanged |
| Banned clone: `JSON.parse(JSON.stringify)` | CQ-3 | 3 test files only | **−1** (was 4 in prior; `evaluateAndPersistFilter.test.ts` refactored) |
| Error boundary coverage | CQ-4 | root + 3 route groups | unchanged |
| TODO/FIXME/HACK count | CQ-5 | **44 total** across 20 files | unchanged vs prior |

### Tier 5 — Production Hardening

| Rule | ID | Result | Delta |
|------|----|--------|-------|
| Security headers | PH-1 | **6 headers** in `hooks.server.ts` | unchanged |
| Auth guard coverage | PH-2 | **0** unguarded mutating endpoints | unchanged |
| API response consistency | PH-3 | **0** raw `new Response(JSON.stringify)` | unchanged |
| MongoDB injection vectors | PH-5 | **0** (`$where` / `$function` / `$accumulator`) | unchanged |
| `parseJsonBody` coverage | PH-7 | no new JSON-accepting endpoints | unchanged |

### Tier 6 — Performance & Observability

| Rule | ID | Result | Delta |
|------|----|--------|-------|
| Heavy `import * as` | PERF-1 | 3 files (approved) | unchanged |
| $effect count | PERF-2 | 431 across 141 files — **+3 new** (`ConfirmModal.svelte`, `IntroGuideHint.svelte`, `dialog.svelte.ts`) | +3 — all single-purpose, no read-write-same-state |
| `invalidateAll()` | PERF-3 | 57 across 35 files — evaluating page uses targeted `invalidate('app:quotaState')` (correct pattern) | unchanged — no new `invalidateAll()` |
| Structured logging | OBS-1 | **0** new bare `console` in server routes | unchanged |

### Tier 9 — Blast Radius

| Rule | ID | Result | Assessment |
|------|----|--------|------------|
| Shared module detection | BLAST-1 | `hooks.server.ts` changed | **LOW** — `startTelemetry()` sync→async. No auth/guard/permission/CSRF logic touched. Only telemetry bootstrap. `void` correctly handles async return. |
| Type/interface breaking | BLAST-2 | `lenderResults.ts` + `ruleEngine/types.ts` changed | **LOW** — additive only (new optional fields `plot_equity_market_value`, `plot_equity_registry_value`). No removal/rename. |
| API response shape | BLAST-3 | Snapshot endpoint adds `decrypt_error` + `used_plaintext_fallback` fields | **LOW** — additive, only present on error rows. Client `LoadFromPreviousCase` modal should render gracefully with unknown fields. |
| Store/state shape | BLAST-5 | `dialog.svelte.ts`, `walkthrough.svelte.ts` changed | **LOW** — additive fields (`ConfirmModalBadge`, `_introAutoTriggered`). No renames or removals. |

---

## Findings

### Critical: 0

### High: 0

### Medium

#### M-PM1 — Snapshot `decrypt_error` field may leak internal error strings

**File:** [`src/routes/api/cases/[case_id]/snapshots/+server.ts`](src/routes/api/cases/[case_id]/snapshots/+server.ts)
**Commit:** `dc5b614e`
**Severity:** Medium
**Confidence:** 70%

The per-row catch block surfaces `decryptErr.message` directly to the API response. If the underlying crypto library throws an error containing key IDs, algorithm names, or internal MongoDB CSFLE metadata, this could leak infrastructure details to authenticated clients. The endpoint is auth-gated so the exposure is limited to logged-in DSAs, not the public.

**Recommendation:** Sanitize the error message to a fixed set of known-safe strings (e.g. `'snapshot_decrypt_failed'`) and log the original message server-side at `warn` level for debugging.

#### M-PM2 — CARRY-FORWARD: Rate limiting gap on admin/internal endpoints

**Carry-forward from:** Prior review M-H2.
**No change this window.** The same set of admin, cron, test, and webhook endpoints lack explicit `rateLimit()` calls. These are all behind `requireAuth`/`requireAdmin` guards, so the risk is privilege-escalation-only. Flagged for hardening when the billing/admin workstream completes.

### Low

#### L-PM1 — Parallel `blockedCount` query on under-quota path

**File:** [`src/routes/api/evaluate-and-persist/+server.ts`](src/routes/api/evaluate-and-persist/+server.ts)
**Commit:** `7a2e85c2`
**Severity:** Low
**Confidence:** 90%

The refactored Promise.all always fires `blockedCount` even when the DSA is under quota (common path). The prior code only ran this query inside the `isExhausted` branch. The trade-off is acknowledged in comments — cold-start budget prioritized over per-request DB cost. Acceptable.

#### L-PM2 — Dashboard layout: wasted queries on onboarding-redirect path

**File:** [`src/routes/dashboard/+layout.server.ts`](src/routes/dashboard/+layout.server.ts)
**Commit:** `83add975`
**Severity:** Low
**Confidence:** 90%

When a DSA hasn't completed onboarding, the parallel fan-out runs `dsaDocQuery` + `caseCountQuery` unnecessarily before the redirect fires. Documented and accepted — the redirect path is uncommon (only brand-new users), and the common path (completed onboarding) benefits from the parallelization.

#### L-PM3 — CARRY-FORWARD: `verification_charge_paise` dead param

**Carry-forward from:** Prior review L-1. No change.

#### L-PM4 — CARRY-FORWARD: Archived component XSS (2 files in `_archive/`)

**Carry-forward from:** Prior review L-2, L-3. Not mounted, not a risk.

---

## Security Summary

No new security concerns introduced. The hooks.server.ts change is cosmetic (telemetry bootstrap timing). New localStorage keys store boolean markers only (not PII). The snapshot `decrypt_error` field (M-PM1) is the only item warranting attention. All new server-side code uses `logger`, `apiOk`/`apiError`, and proper auth guards.

## Performance Summary

Net positive: 3 commits focused on parallelization reduce sequential DB round-trips in the two hottest server paths (dashboard layout, evaluate-and-persist). The telemetry lazy-load saves 100-300ms cold-start for the default (OTEL-disabled) path. Trade-off: one extra `blockedCount` query on the common evaluate path. Test count grew by +69 (12,918 → 12,987), mostly Plot & Equity engine tests and ConfirmModal state tests.

## Blast Radius Summary

**LOW overall.** `hooks.server.ts` changed but only the telemetry bootstrap line — no auth/guard/CSRF logic touched. Type changes are additive only (new optional fields). No breaking API response shape changes. No store/state renames.

---

## Known-Safe Inventory Updates

| Item | Count | Change |
|------|-------|--------|
| Test count | 12,987 | +69 |
| Test files | 304 | +5 |
| WCAG AA contrast pairs | 456/456 | unchanged |
| `{@html}` sites | 21 | unchanged |
| `$effect` count | 431 | +3 |
| TODO/FIXME/HACK | 44 | unchanged |
| `invalidateAll()` | 57 | unchanged |
| localStorage keys (walkthrough) | +2 new | boolean markers, not PII |

---

## Top 5 Actions

1. **M-PM1**: Sanitize `decrypt_error` message in snapshot endpoint — replace raw `decryptErr.message` with a fixed enum string, log the original server-side.
2. **M-PM2 (carry-forward)**: Add `rateLimit()` to remaining admin/internal endpoints when admin workstream completes.
3. **Test gap**: Snapshot per-row resilience (commits `eac11c29`, `dc5b614e`) has no unit test. Consider a test that simulates a decrypt failure on one row and verifies the response contains both the healthy rows and the error-marked row.
4. **Test gap**: Dashboard layout parallel queries test (`dashboardLayoutParallelQueries.test.ts`, 65 lines) exists but should verify the onboarding-redirect path still works correctly when queries resolve with wasted results.
5. **Monitor**: Walkthrough auto-trigger persistence — verify the three-layer guard (DB + localStorage + sessionStorage) works correctly across tab/session boundaries. The walkthroughAutoTriggerLifetime test covers the state machine but not the cross-tab race.
