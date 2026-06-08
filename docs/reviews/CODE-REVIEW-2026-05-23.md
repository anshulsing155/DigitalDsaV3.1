# Enterprise Code Review — 2026-05-23 (Delta Sweep)

**Profile:** Standard (T1–T6 + T9). 27 commits in scope; no auth/payment changes triggering Full.
**Reviewed against:** committed `main` @ **`c5cfeeef`** ("/end close for 2026-05-23 late-evening — billing-aware re-submission UX"), working tree clean.
**Prior full review:** [`CODE-REVIEW-2026-05-22-full.md`](CODE-REVIEW-2026-05-22-full.md) (baseline @ `a4fe2cc9`).
**Delta range:** `a4fe2cc9..c5cfeeef` — 27 commits across two same-day sessions (2026-05-23 PM big-batch + 2026-05-23 evening Epic C + 2026-05-23 late-evening billing UX).

---

## Header — Commands Executed

| Command | Status | Result | Delta vs `2026-05-22-full` |
|---------|--------|--------|----------------------------|
| `pnpm check` | ✅ PASS | 0 errors, 0 warnings | unchanged ✅ |
| `pnpm test:unit -- --run` | ✅ PASS | 200 files, **11,652 tests** | 🟢 +173 tests since 11,479 |
| `pnpm audit --prod` | ✅ PASS | **0 vulnerabilities** | 🟢 13→0 (F2 from -22 closed via overrides) |
| `git log … co-authored-by` | ✅ PASS | 0 matches (last week) | unchanged ✅ |

---

## Commits Reviewed (27, oldest first)

### 2026-05-23 morning (close-out of -22 findings)

| SHA | Subject | Surface |
|-----|---------|---------|
| `a0ce2b4f` | fix(theme): restore `--ddsa-gray-300` to `#a8ac9a` (revert accidental darkening) | css tokens |
| `98eb56c6` | fix(sec): close `CODE-REVIEW-2026-05-22` F2–F5; audit clean (13→0) | deps + 5 catch-block PII + auth error route + 6 mutation rate-limits |

### 2026-05-23 PM (big-batch: 8 commits)

| SHA | Subject | Surface |
|-----|---------|---------|
| `2722847a` | refactor(api): `location/states` → `apiOk` envelope + consumer reads | API DX-4 location carve-out |
| `1d7f2992` | refactor(api): `location/cities` → `apiOk` envelope + consumer reads | API DX-4 |
| `19f16793` | refactor(api): `pincodes` → `apiOk` envelope + consumer reads | API DX-4 |
| `3408ce36` | fix(form-wizard): surface a reason for every blocked Next/Submit/Show-Offers | Pitfall #26 class fix |
| `ed19958f` | fix(results): surface below-floor cause + remove double rupee delta glyph | results page UX |
| `6315b268` | fix(income): preserve in-progress income-source draft across step navigation | new buffer module |
| `251d639d` | docs(reviews): E2E test report 2026-05-23 | docs only |
| `72e2045a` | merge: 3 parallel worktree-agent fixes (A browser-back + B BL/HL parity + D restore) | new Pitfall #46 + static-scan |
| `c881b1a2` | docs: /end close | docs only |

### 2026-05-23 evening (Epic C — 9 commits)

| SHA | Subject | Surface |
|-----|---------|---------|
| `e887456e` | fix(professional-loan): wire director Restore through `handleRestoreModalConfirm` | Prof Loan parity |
| `320321e1` | feat(C.4): wire Impersonate into admin Users + DSA support + audit | **privileged admin action** — new cookie payload + 2 endpoints |
| `49be621f` | feat(C.2): Policy Library search + type filter + sort + last-verified | new pure helpers |
| `c5bd4b34` | fix(C.8): collapse duplicate rows in admin Quick-Test + DSA Needs Attention | dedup helpers |
| `d8864650` | feat(C.6): canonical `getLenderCoverageStats` + relabel admin policies counts | new stats fn |
| `f654590c` | feat(C.5): shared `writeAuditLog` helper + user/role/refund actions | new audit util + AuditAction union extension |
| `34f735ef` | feat(C.3): broadcast engagement clarity — opened % + recipient-aware Send | metrics helper |
| `57af88d9` | feat(C.1): RM Home — Policy Coverage KPI row + greeting fallback + Capture CTA | RM home additions |
| `25ecf442` | feat(C.7): test-entity filter — gate samples in prod, hide E2E rows | new shared filter + 3 wirings |
| `79942b68` | docs: /end close | docs only |

### 2026-05-23 late-evening (Pitfall #47 billing UX — 5 commits)

| SHA | Subject | Surface |
|-----|---------|---------|
| `c4886bf0` | docs(architecture-evolution): refresh header | docs only |
| `ac2eef73` | fix(evaluating): `replaceState` so browser-back skips animation replay | UX flow |
| `8daca01c` | feat(results): guard back-to-form nav with re-submit billing reminder | `beforeNavigate` on /results |
| `e0759327` | feat(billing-ux): pre-submit ConfirmModal across all 6 loan forms (Pitfall #47) | new `confirmAndSubmit` shim + 6 page wirings |
| `5b52dfb7` | fix(test): self-allowlist `preSubmitConfirmWiring` static scan | test-only |
| `c5cfeeef` | docs: /end close | docs only |

---

## Standing Grep Rules — T1–T6 Sweep

| Rule | Result | Delta |
|------|--------|-------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch outside `secureFetch` | 🟢 0 in `src/lib` + `src/routes` | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | 🟢 only documented exceptions: `Toast.svelte:87` (internal toastStyle config), `JsonLd.svelte:10` (controlled JSON-LD), `_archive/*` (3 files) | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in `src/lib/server` / `src/routes/api` | 🟢 4 hits all legitimate: `logger.ts`/`telemetry.ts` (logger implementations themselves), `auth/init-widget`/`auth/resend-otp` (both `// //console.log` commented-out diagnostics) | unchanged |
| **G (Co-Authored-By)** | 🟢 0 in last week | unchanged |
| **B (Capacitor proxy at scope)** | 🟢 0 | unchanged |
| **I (`typeof window` SSR guard)** — Pitfall #9 | 🟢 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | 🟢 0 | unchanged |
| **H1-svelte (`state_referenced_locally`)** — Pitfall #10 | 🟢 0 runtime warnings (`pnpm check` clean); 84 markdown/comment string-matches are docs references | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | 🟢 43 `'!=':` files surfaced by smell-grep; spot-checked — all are value comparisons, no `!= null` patterns | unchanged |
| **PH-5 (`$where`)** | 🟢 0 | unchanged |
| **BUILD-2 (audit)** | 🟢 **0 vulnerabilities** (was 13) | 🟢 13→0 |
| **BUILD-3 (typecheck)** | 🟢 0/0 | unchanged |
| **BUILD-4 (tests)** | 🟢 11,652/11,652 | 🟢 +173 |

---

## Findings

### F1 — Impersonate `/start` endpoint has no rate-limit (Low — defense-in-depth)

**Status:** Open. Defense-in-depth only; not exploitable from a non-admin actor.

**Where:** [src/routes/api/admin/impersonate/start/+server.ts](src/routes/api/admin/impersonate/start/+server.ts)

**What:** The new admin-impersonate endpoint shipped in `320321e1` is properly auth-gated (`requireRoleApi(['admin'])`), validates inputs (target user exists, not self, not suspended, role ∈ {dsa, rm}, reason required) and writes a `PolicyAuditLog` row per invocation. It does **not** wire a `rateLimit` from `$lib/server/rateLimiter`.

**Why this is Low not Medium:** the endpoint is admin-only — a non-admin can't reach it. The audit log row is mandatory so abuse is detectable post-hoc. The C.5 review pattern ("every privileged mutation has a rate limit") would catch repeated misuse from a compromised admin account, but the `/exit` companion can clear the cookie regardless, so the blast radius of misuse is bounded.

**Fix sketch:** add `await rateLimit({ key: \`impersonate-start:\${locals.user.id}\`, max: 30, windowMs: 60 * 60 * 1000 })` near the top of POST. 30/hour is generous enough for legitimate admin troubleshooting and tight enough to surface anomalies.

**Cross-reference:** C.5 (`writeAuditLog`) ships the audit-trail half; rate-limit is the companion gate.

---

### F2 — `IncomeSourceForm.svelte:1688/1692` direct `sanitizeHtml(field.label/description)` on raw schema strings (Carry-forward observation, Low)

**Status:** Carry-forward. Not new this session.

**Where:** [src/lib/components/IncomeSourceForm.svelte:1688](src/lib/components/IncomeSourceForm.svelte:1688)

**What:** The pattern `{@html sanitizeHtml(field.label)}` is correct per CLAUDE.md §3 Pitfall #15, but `field.label`/`field.description` flow from the form schema configs (which are TS-authored, not user-input), so the `{@html}` is required only for the `<sup>`/`<strong>` markup the configs sometimes contain. Worth a one-line code comment naming why the directive is needed; otherwise a future contributor may "simplify" to `{label}` and silently strip the markup.

---

### Already-resolved this delta

| ID | Finding (in `-22` review) | Closure |
|----|---------------------------|---------|
| F1 (–22) | `--ddsa-gray-300` accidentally darkened | `a0ce2b4f` one-line revert; contrast back to 456/456 |
| F2 (–22) | 13 vulns incl. 1 high (devalue DoS) | `98eb56c6` overrides → 0 vulns |
| F3 (–22) | 5 catch-blocks logging email PII | `98eb56c6` switched to `dsaId`/`lenderId` |
| F4 (–22) | 6 privacy/A.2 mutations unguarded | `98eb56c6` rate-limited |
| F5 (–22) | `(auth)/+error.svelte` missing | `98eb56c6` added |

---

## Commit-Level Analysis (high-touch commits)

### `e0759327` — feat(billing-ux): pre-submit ConfirmModal across all 6 loan forms (Pitfall #47)

🟢 **High-quality.** New thin UI shim `src/lib/utils/confirmAndSubmit.ts` wraps `submitFormForEvaluation`. The author kept `formSubmitHandler.ts` pure (no DOM) and confined modal interaction to the shim. New static-scan `preSubmitConfirmWiring.test.ts` locks the contract — every loan page goes through `confirmAndSubmit`, only one canonical caller of `submitFormForEvaluation` outside the definer. Modal copy is extracted as a `COPY` constant for easy i18n swap later. Dismiss path correctly resolves with `{ cancelled: true }` per Pitfall #39. **Verified live this session** — back-nav modal opens with correct copy, both Cancel and Confirm paths route correctly.

### `8daca01c` — feat(results): guard back-to-form nav with re-submit billing reminder

🟢 **Clean.** `beforeNavigate` filter is precise (`nav.to.url.pathname.startsWith('/form/')`) — sidebar, dashboard, logout nav are unaffected. `bypassFormNavGuard` flag avoids re-prompt loop on confirm. **Verified live this session** — Edit link click intercepts, "Stay on offers" cancel preserves /results URL, "Edit and resubmit" navigates through cleanly.

### `ac2eef73` — fix(evaluating): replaceState

🟢 **Minimal + correct.** Single-line change to `goto(results, { replaceState: true })`. Removes `/evaluating` from back-history stack so browser-back from /results lands directly on the form (where the back-nav guard fires). API call already happens before this page mounts, so no race.

### `320321e1` — feat(C.4): admin Impersonate

🟡 **Mostly clean, one gap (F1 above).** Cookie payload refactor is correct (validates legacy shape to null rather than crashing). `hooks.server.ts` resolver properly branches between DsaApplications and rmApplications by `targetRole`. Self-impersonation, suspended-user, blank-reason all blocked. teamContext **deliberately not propagated** during DSA impersonation — documented limitation in commit body. Cookie roundtrip + shape validation tests landed (+11). **Recommend follow-up:** add rate-limit per F1.

### `f654590c` — feat(C.5): writeAuditLog helper

🟢 **Excellent factoring.** Centralises audit-row writes after replacing 3 distinct ad-hoc patterns (direct insertOne, hacky `target_type:'lender'` rows for non-policy events, silent no-audit for suspend). `details.email`-free shape; uses `logger` not console. Best-effort error handling (insert failure is logged loudly but never thrown — correct, since the privileged action already mutated state). `retention: 'standard'|'extended'` hint plumbed forward for Epic E money-row 6-year retention.

### `25ecf442` — feat(C.7): test-entity filter

🟢 **Well-tested (+34 cases).** False-positive guards explicit ("Attesting Bank", "Greatest Bank", "Manifestation Finance" — all real-sounding names that contain test-substring shapes — stay clean). The `is_test: { $in: [false, null] }` filter clause correctly handles pre-C.7 rows missing the marker. `shouldShowTestEntities()` reads `dev` from `$app/environment` so dev surfaces still see test rows.

### `72e2045a` — merge: 3 parallel worktree-agent fixes

🟢 **Honest atomic merge.** Three sub-agents in isolated worktrees produced A/B/D fixes; main-checkout owner applied with `git apply --3way`, ran full suite + type-check, then committed as one. The interdependency (D's new commit site needed B's sync call — caught by B's static-scan test) is exactly why ONE merge commit is honest here, not three. New Pitfall #46 added. Documented standing rule: "after merging a worktree to main, always `git worktree remove --force`".

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New privileged endpoints | 2 (`impersonate/start`, `impersonate/exit`) | Auth-gated; F1 rate-limit gap noted |
| New audit-log call sites | 5 (suspend/reactivate × DSA+RM, role-change × admin promote/demote, refund placeholder) | All via shared `writeAuditLog` helper |
| New mutating endpoints (non-impersonate) | C.2 policy-library is read-only; C.3 broadcasts uses existing endpoint; C.4 audit endpoints below; C.7 only changes existing reads | n/a |
| CSFLE / PII boundary | No new plaintext storage; admin-impersonate banner targetName is derived at request time, not persisted | clean |
| Anti-scraping budget | Unchanged | n/a |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| `getLenderCoverageStats` (C.6) | 4 parallel `Promise.all` counts; tested for parallelism. Adds 4 lightweight `countDocuments` to admin policies page load — bounded. |
| Policy Library filters (C.2) | Filters/sorts are `$derived` in-component (no server round-trip). Server projection adds `lastVerifiedAt` ISO string per row — bounded by row count (~lender count). |
| `getTestingActivity` group-by-lender (C.8) | Replaces N rows per lender with 1; net DB cost unchanged, render cost lower. |
| `computeAttentionItems` extraction (C.8) | Pure-function move out of `+page.server.ts` into testable utility; no perf delta. |
| `confirmAndSubmit` shim | Adds a microtask + modal open before each submit click. Imperceptible to user. |
| `beforeNavigate` on /results | Single registration per page mount; pathname check is O(1). |

---

## Cross-Team Blast Radius

The delta touches:
- **6 loan-form `+page.svelte`** files (Pitfall #47 wiring)
- **Results page** for all 6 loan types (single shared `+page.svelte` at `dashboard/dsa/cases/[case_id]/results`)
- **5 new shared modules** under `src/lib/server/` and `src/lib/utils/`: `auditLog`, `broadcastMetrics`, `confirmAndSubmit`, `dsaAttentionItems`, `policyLibraryFilter`, `testEntityFilter` (+ `getLenderCoverageStats` in `adminStats`)
- **2 new admin endpoints** + cookie payload shape change in `hooks.server.ts` (legacy `{adminId, rmId}` cookies validate to null cleanly)

No removed exports, no breaking signature changes. `formSubmitHandler.ts`'s `SubmitOptions`/`SubmitResult` types newly exported (additive). `AuditAction` and `target_type` unions extended (additive only — no enum removal). `apiResponse.ts` untouched. `bankData` / lender static config untouched.

**Blast-radius signal:** all additive, all single-author this session, all tested. Safe.

---

## Known-Safe Inventory Updates

- **`{@html}` allowlist** unchanged: `Toast.svelte:87` (internal toastStyle config) + `JsonLd.svelte:10` (controlled JSON-LD) + `_archive/*` (3 files).
- **Server `console.*` allowlist** unchanged: `logger.ts` + `telemetry.ts` (implementations); `auth/init-widget` + `auth/resend-otp` (commented-out diagnostics).
- **Raw `json()` route allowlist** unchanged (~30 routes, intentionally bespoke per `90b1c002`).
- **New static-scan tests** added this session: `preSubmitConfirmWiring`, `directorAutoIncomeWiring` (Pitfall #46), `confirmModalDismissal` (Pitfall #39 extension). These now lock the wiring for future contributors.

---

## Top 5 Actions for Next Session

1. **(F1)** Add rate-limit to [impersonate/start/+server.ts](src/routes/api/admin/impersonate/start/+server.ts). 30/hour per `locals.user.id`. ~15 min.
2. **Browser-smoke the rest of yesterday's work** — admin Impersonate (full path: /users → button → modal → DSA dashboard with banner → exit → audit rows), C.2 Policy Library filters, C.3 broadcast chip, C.6 4-card lender coverage row. Last session smoked only billing UX; the 8 Epic C items still need live verification.
3. **C.7 PR-2 cleanup script** — `scripts/sanitize-test-data.ts` is written and type-checks clean (added this session). Operator dry-run against dev MongoDB needs `pnpm add -D tsx` first (or convert to `.mjs` shadow like `sec2-init-deks-standalone.mjs`). ~10 min infra prep + dry-run.
4. **F2 carry-forward** — add a one-line comment at `IncomeSourceForm.svelte:1688` explaining why `{@html}` is needed on `field.label`/`field.description`. Trivial, but preempts a future "simplification" regression.
5. **Tier 3 — Audit Epic D** (billing/GST/refund/dunning/reconciliation/pricing-fence) per `DEVELOPMENT-PLAN.md` unified order. Pitfall #47 billing UX already prepares the DSA expectation surface; Epic D adds the enforcement surface at `evaluate-and-persist`.

---

## Observations

- **Two paired-shim pattern this session is healthy.** Pitfall #47 ships a UI shim (`confirmAndSubmit`) that's separate from the network shim (`submitFormForEvaluation`); C.5 ships an audit shim (`writeAuditLog`) that's separate from the mutation. Each shim is independently testable and the bug surface is localized.
- **Static-scan tests proliferating in a good way.** `preSubmitConfirmWiring.test.ts` joins `directorAutoIncomeWiring.test.ts`, `confirmModalDismissal.test.ts`, `monthPickerWiring.test.ts`, etc. Each locks a wiring contract that would otherwise be regression-prone. The "self-allowlist" pattern (`5b52dfb7`) is now established for tests whose assertion messages contain the symbols they guard.
- **Test count grew +173 in one day** (11,479 → 11,652) — almost all attributable to the Pitfall #47 wiring tests + the Epic C feature tests. The CI gate (`pnpm check` + `pnpm test:unit`) is the friend here; nothing in this delta would have survived a broken type-check or red test.

---

## Reviewer Notes (this session)

Browser-smoke of the billing UX feature was completed in this session as task #1 — back-nav guard ConfirmModal fully verified live (modal opens, Cancel preserves /results, Confirm navigates through, dismissal paths all route to `onCancel`). The pre-submit ConfirmModal on the new-submit path was not driven via a full form fill (would require manually answering ~30 questions on Personal Loan) — coverage is provided by the static-scan test + source-code review of `confirmAndSubmit.ts`. The /evaluating `replaceState` is a 1-line change verified by source-read.
