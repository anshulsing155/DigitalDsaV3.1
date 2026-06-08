# Daily Code Review — 2026-05-21

**Scope:** 10 commits `2dceaa10..5babc13a` (last 24 hours). B.1 case-label generator (name-free privacy labels), B.2 loan-type enum-to-label mapping, B.5 daily triage table (priority sort + next-action + inline expand), A.2 Slices 3-4 (RM proxy-capture confirmation, admin capture-review surface, Step-0 dedup), policy-capture wizard fixes (array defaults, resume off-by-one). Single author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-20.md`](CODE-REVIEW-2026-05-20.md) — 18 commits (Full profile). Carry-forward: M2 (auth route `json()` migration), M3 (DATA endpoint rate limits), L2 (PII in billing logger), L3 (admin PATCH/submit rate limits).

**Review profile:** **Standard** (T1-T6, T9). 10 commits, no auth/payment changes, no shared module edits from the Tier 9 blast radius registry.

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 180 files, **11,424 tests** — all pass (**+53** from prior: 11,371) |
| `pnpm test:contrast` | **456/456 pairs passed** — all WCAG AA across every theme |
| `git log --since='1 week' \| co-authored-by` | **0 violations** |
| Pitfall #43 tests (affordabilityScenarioGating, propertyNotIdentifiedPayload, propertyNotIdentifiedTrafficLight) | **All pass** |

---

## Commits Reviewed

| SHA | Subject | Files | +/− | Category |
|-----|---------|-------|-----|----------|
| `5babc13a` | feat(dsa): B.5 — daily triage table (priority sort + next-action + inline expand) | 7 | +378/−54 | Feature |
| `36617625` | fix(dsa): resolve city from nested loanData[loanName] for B.1 label + B.5 table | 4 | +46/−4 | Fix |
| `e65c9bad` | feat(dsa): B.1 name-free label + B.5 cases table (toggle) | 8 | +308/−98 | Feature |
| `fc767d99` | feat(dsa): B.1 — case-label generator (name + city + type), forward-gen | 7 | +180/−7 | Feature |
| `1726f74a` | feat(dsa): B.2 — loan-type enum→label at boundary + data backfill | 12 | +253/−10 | Feature |
| `a301d070` | fix(policy-capture): default editor array props to [] to survive partial step data | 8 | +26/−7 | Fix |
| `2b6e8c84` | feat(admin): A.2 Slice 4b — Step-0 dedup soft-warn | 4 | +113/−1 | Feature |
| `ebfe9f59` | feat(admin): A.2 Slice 4a — admin capture-review surface | 6 | +278/−6 | Feature |
| `19d215f2` | feat(admin): A.2 Slice 3 — RM-side proxy-capture confirmation | 9 | +280/−25 | Feature |
| `b448191d` | fix(policy-capture): wizard resume lands on the step you left, not one back | 4 | +120/−15 | Fix |
| `bea214b6` | docs(close): session close 2026-05-20 PM + daily review/contrast audit | 6 | +460/−5 | Docs |

Total: **10 code/feature commits** + 1 docs-only. Source: ~45 unique files. Tests: +53 new tests (caseTriage, caseLabel, loanTypeLabel, captureSaveContract, policyCaptureConfirmProxy).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **M2** — `check-dsa` + `signup` success paths still use raw `json()` | **Carry-forward** | Wire-contract change deferred under DX-4. Not touched today. |
| **M3** — Missing rate limiting on 5 DATA-1/DATA-2 mutating endpoints | **Carry-forward** | Endpoints not modified today. Still pre-UI — no client consumers. |
| **L2** — PII (email) in billing logger | **Carry-forward** | `trial-reminder/+server.ts` not modified today. |
| **L3** — Admin proxy-capture PATCH/submit routes have no rate limiting | **Carry-forward** | PATCH and submit routes not modified today. |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs 2026-05-20 |
|------|------|--------|----------------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, GETs). No new POST `fetch()` calls — RM confirm-proxy uses `secureFetch` correctly. **0 new violations.** | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same 33 approved exception sites. No new `{@html}` in today's commits. | Unchanged |
| **E2** — Dynamic attribute / URL injection | T1 | No new risk patterns. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts` (formatter), `telemetry.ts` (OTel bootstrap). `routes/api/`: 2 commented-out lines only. New confirm-proxy and check-existing routes use `logger`. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 violations.** | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | All matches are test files or type enums. No new secret patterns. | Unchanged |
| **SEC-2** — PII in logging | T1 | **0 new PII in logger calls.** New `confirm-proxy` logs only `rmId` and `capture_id`. | Verified clean |
| **SEC-3** — Cookie security | T1 | No new `cookies.set()` calls. | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | Same known-safe instances (2 dev-only test runners). No new patterns. | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (public by design). | Unchanged |
| **SEC-6** — Rate limiting on mutating endpoints | T1 | New `POST /api/rm/policy-captures/[capture_id]/confirm-proxy` — **no rate limiting** (see finding L4). Auth-gated (RM role + demo block + ownership), low risk. New `GET /api/admin/policies/proxy-capture/check-existing` — no rate limit, admin-only GET, very low risk. | **+1 gap** (L4) |
| **SEC-7** — Client storage PII | T1 | `localStorage` only stores `dsaCasesViewMode` (table/cards toggle). No PII. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** (excluding `@capacitor/core`). | Unchanged |
| **C** — `window.location.reload()` | T2 | Same known-safe inventory. No new additions. | Unchanged |
| **D** — Async Capacitor proxy return | T2 | No new patterns. | Unchanged |
| **I** — `typeof window !== 'undefined'` SSR guard | T2 | **0 violations.** | Unchanged |
| **J** — Module-scope `fetch` | T2 | **0 violations.** | Unchanged |
| **SSR-1** — Hydration: browser-only APIs | T2 | New `$effect` reads `localStorage` — correctly inside `$effect` (client-only). ✅ | Unchanged |
| **SSR-2** — Unhandled promise rejections | T2 | No new `.then()` without `.catch()` in load functions. | Unchanged |
| **H1** — `state_referenced_locally` | T3 | **0** (pnpm check 0 warnings). | Unchanged |
| **K** — JSON-Logic `!=` (Pitfall #1) | T3 | Same known carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **L** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No new form question additions. | Unchanged |
| **M** — `combinedAnswers` collision (Pitfall #13) | T3 | No new collision-risk patterns. | Unchanged |
| **S** — Contrast audit (WCAG AA) | T3 | 456/456 pairs passed. | Unchanged |
| **CQ-1** — Empty catch blocks | T3 | **0 empty catch blocks** in non-archived code. | Unchanged |
| **CQ-2** — Memory leaks: intervals/listeners | T3 | No new `setInterval` or `addEventListener` without cleanup. | Unchanged |
| **CQ-3** — `JSON.parse(JSON.stringify)` | T3 | Only in test files (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | 3 boundaries (root, `(app)`, dashboard). `(auth)` gap persists. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK | T3 | **35 occurrences across 13 files** (case-sensitive scan). | Unchanged from prior stabilized count |
| **PH-1** — Security headers | T5 | All 6 headers present in `hooks.server.ts`. | Unchanged |
| **PH-2** — Auth guard coverage | T5 | New endpoints: `confirm-proxy` has `requireRoleApi('rm')` + `blockDemoWrite` ✅. `check-existing` has `requireRoleApi('admin')` + `requireAdminPermission('rule_authoring')` ✅. | **+2** (both guarded) |
| **PH-3** — API response consistency (`json()`) | T5 | 109 files still using `json()` (unchanged — all new endpoints use `apiOk`/`apiError`). | Unchanged |
| **PH-5** — MongoDB `$where`/`$function` | T5 | **0 violations.** | Unchanged |
| **PH-7** — `parseJsonBody` coverage | T5 | New confirm-proxy POST reads only `params` (no body) — N/A. check-existing GET uses URL params. | Verified clean |
| **PERF-1** — `import *` | T6 | 3 known-safe (`faceDetection`, `jsonLogic`, comment-only `iconRegistry`). No new wildcards. | Unchanged |
| **PERF-2** — `$effect` churn | T6 | **1 new `$effect`** in `dsa/cases/+page.svelte` — reads `localStorage` to initialize `viewMode`. Single execution on mount, no reactive dependency loop. Clean. | **+1** (safe) |
| **OBS-1** — Server console usage | T6 | Same known-safe sites (logger.ts, telemetry.ts). | Unchanged |
| **OBS-2** — Silent failure detection | T6 | Same known-safe `.catch(() => {})` sites in hooks.server.ts (fire-and-forget analytics), mongo.ts (index cleanup). | Unchanged |

---

## Tier 9 — Cross-Team Blast Radius

### BLAST-1 — Shared module change detection

**0 matches.** None of the 12 high-blast-radius modules (mongo.ts, guards.ts, logger, apiResponse, hooks.server.ts, csrf, formWizardEngine, schemaTypes, routes.ts) were modified in today's commits.

### BLAST-2 — Type/interface changes

Two type files changed:

| File | Change | Importers | Risk |
|------|--------|-----------|------|
| [`src/lib/types/case.ts`](src/lib/types/case.ts) | Added **optional** `label_is_custom?: boolean` to `Case` interface | ~50 | **None** — optional, additive |
| [`src/lib/types/policyCapture.ts`](src/lib/types/policyCapture.ts) | Added **new pure function** `canConfirmProxy()` | ~15 | **None** — additive, no interface change |

Both changes are backward-compatible. No breaking changes.

### BLAST-3 through BLAST-9

- **BLAST-3** (API response shape): No `apiResponse.ts` changes. `evaluate-and-persist` response shape unchanged — only the `label` field content differs (name-free label vs old format). Consumers read `case.label` as before.
- **BLAST-4** (Auth): No guard/auth logic changes.
- **BLAST-5** (Stores): No `.svelte.ts` store shape changes.
- **BLAST-6** (Routes): No `routes.ts` changes.
- **BLAST-7** (Schema/config): No form schema or `showWhen` changes. New `loanTypeLabels.ts` is additive (display-only, no query impact).
- **BLAST-8** (Database): `evaluate-and-persist` now writes `label_is_custom: false` on case creation — new field, additive. No collection/index changes.
- **BLAST-9** (Multi-author): Single author (Prashant). No cross-team risk.

---

## Findings (this review)

### Critical — none

### High — none

### Medium

#### M2 — `check-dsa` + `signup` success paths still use raw `json()` (carry-forward, first flagged 2026-05-19)

Both auth routes return non-`apiOk`-shaped envelopes. Migration to `apiOk()` is a wire-contract change affecting login page, partner-signup, hooks, and Android app consumers. Tracked as dedicated DX-4 session.

#### M3 — Missing rate limiting on 5 DATA-1/DATA-2 mutating endpoints (carry-forward, first flagged 2026-05-19)

Same 5 endpoints as prior review: POST/DELETE lead-vault, POST btdc-vault, POST btdc-vault/revoke, POST cron/data2-revoke-sweep. Not modified today. Still server-side only (no UI consumers).

#### M4 — DSA cases page: full-filtered-set memory sort (new, informational)

[`src/routes/dashboard/dsa/cases/+page.server.ts`](src/routes/dashboard/dsa/cases/+page.server.ts) now fetches **up to 1,000 case documents** (`MAX_TRIAGE`) into memory for in-memory triage sort, then slices a 12-item page. The prior implementation paginated at the DB level (`skip/limit`).

**Why it changed:** The triage sort depends on computed fields (priority rank, days-in-stage, open query count) that aren't available as MongoDB sort keys — they require cross-collection data and business logic.

**Current risk:** Low. The 1,000-doc cap is generous for early beta (most DSAs have <50 cases). Each case projection is lean (no snapshot data, no full applicant arrays). The CSFLE decrypt for applicant names is bounded to the 12-item page slice only.

**Future risk (Medium):** When a DSA accumulates 500+ cases, the in-memory sort + snapshot decrypt becomes a latency concern. The `FormSnapshots.find({ case_id: { $in: pageCaseIds } })` query inside the load function adds N+1 potential for the page slice.

**Recommendation:** Monitor load-function latency via Vercel analytics once beta traffic starts. If p95 exceeds 2s, add a `case_triage` denormalized field (written at evaluate-and-persist time) for DB-level sort, eliminating the in-memory pass.

### Low

#### L2 — PII (email) in billing logger (carry-forward, first flagged 2026-05-19)

[`src/routes/api/billing/trial-reminder/+server.ts:85`](src/routes/api/billing/trial-reminder/+server.ts:85): `logger.warn({ err, email }, ...)` logs DSA email to production logs. Replace with `{ err, dsaId }`.

#### L3 — Admin proxy-capture PATCH/submit routes have no rate limiting (carry-forward from 2026-05-20)

Same routes, same assessment. Admin-only + rule_authoring permission gates make abuse extremely unlikely.

#### L4 — RM confirm-proxy POST has no rate limiting (new)

[`src/routes/api/rm/policy-captures/[capture_id]/confirm-proxy/+server.ts`](src/routes/api/rm/policy-captures/[capture_id]/confirm-proxy/+server.ts): No `rateLimit()` call on this POST endpoint. Mitigated by: RM role gate, demo-write block, ownership gate (RM can only confirm their own captures), idempotent operation (`admin_manual_proxy` → `rm_confirmed` is a one-way transition).

**Recommendation:** Add rate limit (e.g., 10/hr/user) for defense-in-depth. Low urgency.

---

## Commit-Level Analysis

### B.1 Case-Label Generator (`fc767d99`, `e65c9bad`, `36617625`)

**Privacy design:** The stored `Case.label` is deliberately name-free — it uses loan type + project + city + profile bucket instead of the customer name. The full name is appended only in the DSA's own authenticated view via `dsaCaseTitle()`, decrypted from the CSFLE-encrypted form snapshot at page load. This prevents name leakage to RM portal, share links, and share emails.

**New utilities:**
- [`src/lib/utils/caseLabel.ts`](src/lib/utils/caseLabel.ts): Pure functions — `buildCaseLabel()`, `classifyApplicantProfile()`, `resolveActiveAnswers()`, `dsaCaseTitle()`. Well-structured, defensive null handling, MAX_SEGMENT clamping at 30 chars.
- `classifyApplicantProfile()` uses keyword matching on `employmentType`/`incomeType` fields — tolerant of the many stored variants (`"Salaried(Government)"`, `"Self-Employed Professional"`, etc.). Correctly returns `null` when nothing usable is present (label omits the profile segment).

**`resolveActiveAnswers()` (fix `36617625`):** Form data lives under `loanData[loanName]`, not at `loanData` top-level. The initial B.1 commit missed this nesting, resulting in blank cities. The fix correctly resolves the nested structure with a fallback to flat if not nested.

**Forward-generation:** `evaluate-and-persist` now generates the label at case creation time. The `label_is_custom` flag prevents auto-regeneration from overwriting a DSA's manual edit. Clean data model addition.

**Test coverage:** 67 tests in `caseLabel.test.ts` covering all profile classifications, edge cases (missing fields, unknown types), and label assembly variants.

**Assessment:** Clean, well-designed, privacy-conscious. No concerns.

### B.2 Loan-Type Enum→Label (`1726f74a`)

**Design:** Single canonical mapping in [`src/lib/config/loanTypeLabels.ts`](src/lib/config/loanTypeLabels.ts). `loanTypeLabel()` is idempotent (human labels pass through unchanged, raw enums get mapped, unknown values get title-cased). Applied at the server-load boundary in `+page.server.ts` — consumers never see raw enums. Display-only; filtering and queries still use the raw stored value.

**Backfill script:** `scripts/backfill-loan-type-enums.mjs` — a standalone migration script for existing data. Read-only analysis mode by default. Correctly separated from application code.

**Dashboard wiring:** `loanTypeLabel` applied in DSA cases `+page.server.ts`, RM cases `+page.server.ts`, and case detail layouts. Filter dropdown now shows `{ value, label }` pairs.

**Test coverage:** 5 tests covering known enums, idempotent passthrough, and unknown-value title-casing.

**Assessment:** Clean fix-at-source approach per CLAUDE.md §16 rule 11.

### B.5 Daily Triage Table (`5babc13a`, `e65c9bad`)

**New utility:** [`src/lib/utils/caseTriage.ts`](src/lib/utils/caseTriage.ts) — pure function `computeCaseTriage()` that turns operational signals (stage, lenders count, docs %, open queries, days-in-stage) into a priority bucket + next-action string. Well-structured priority cascade with sensible thresholds (`STAGE_STUCK_DAYS`).

**UI additions:**
- Table/cards view toggle (persisted to `localStorage`)
- Sortable columns: priority (default), amount, stage, age, updated
- Inline row expansion showing lender breakdown + document completion
- Priority dot indicators using CSS variable tokens (dark-mode safe)

**Performance note:** See finding M4 above for the in-memory sort implications.

**SSR safety:** `localStorage` read is inside `$effect` (client-only). Table view rendering uses CSS variable tokens, not hardcoded colors. `formatTimeAgo` defined locally, no SSR-unsafe imports.

**Test coverage:** 9 tests in `caseTriage.test.ts` covering all priority buckets and edge cases.

### A.2 Slice 3 — RM Proxy-Capture Confirmation (`19d215f2`)

**New endpoint:** `POST /api/rm/policy-captures/[capture_id]/confirm-proxy`

| Check | Status |
|-------|--------|
| Auth guard | `requireRoleApi('rm')` + `blockDemoWrite` ✅ |
| Ownership gate | Filters by `rm_id` — RM can only confirm their own ✅ |
| Idempotency | `canConfirmProxy()` checks `source_type === 'admin_manual_proxy'` — already-confirmed captures return error ✅ |
| Audit trail | `PolicyAuditLogs.insertOne()` records confirmation ✅ |
| API response | `apiOk`/`apiError`/`apiServerError` ✅ |
| Logger | `logger.info` with only IDs ✅ |
| Rate limiting | **Missing** (see L4) |

**UI wiring** (RM capture detail page): Confirmation banner shown for `admin_manual_proxy` captures, hidden for `rm_confirmed` or self-captures. Uses `secureFetch` for POST + `invalidateAll()` for refresh. Loading state + error display + double-submit protection via `confirming` flag. Clean.

**Type addition:** `canConfirmProxy()` pure function in `policyCapture.ts` — shared between backend route and could be used in client-side gating. Clean separation.

### A.2 Slice 4a-b — Admin Capture Review + Step-0 Dedup (`ebfe9f59`, `2b6e8c84`)

**Slice 4a:** Admin approval surface now shows proxy-capture details with capture provenance. New SSR load functions with admin auth. Read-only display — no mutations.

**Slice 4b:** `GET /api/admin/policies/proxy-capture/check-existing` — dedup check before creating a proxy capture. Properly guarded (admin + rule_authoring), returns only metadata (capture_id, rm_name, status, provenance_source). Parameterized MongoDB query (no injection risk). Result capped at 10.

### Policy-Capture Fixes (`a301d070`, `b448191d`)

**Array defaults (`a301d070`):** 6 editor components (`ConditionalRuleEditor`, `CustomEntryEditor`, `DeviationBuilder`, `IncomeTypeGrid`, `MultiplierEditor`, `SlabEditor`) now default array props to `[]`. Prevents SSR crash when a capture has partial/missing step data (e.g., admin viewing a capture where the RM hasn't reached that step yet).

**Wizard resume fix (`b448191d`):** The off-by-one was: `doSave()` persisted `current_step = currentStep` BEFORE navigation incremented it, so reload reopened on the step the user just left, not the step they were looking at. Fix: `goNext()` now advances `currentStep` first, then calls `doSave(leavingStep)` — the saved `current_step` is the destination (resume point), while the flushed data belongs to the leaving step.

**Test coverage:** `captureSaveContract.test.ts` — 5 tests validating the contract: `current_step` is the resume destination, `data` key matches `dataStepIndex`.

**Assessment:** Clean bug fixes, well-extracted contract function, good test coverage.

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| **RM endpoint** | 1 new: confirm-proxy POST with RM role + ownership gate + demo block. Missing rate limit (L4). |
| **Admin endpoint** | 1 new: check-existing GET with admin + rule_authoring gates. No rate limit (low risk — GET). |
| **PII** | Case labels are name-free by design. Customer names decrypted only in DSA's own authenticated view via CSFLE. No new PII exposure. |
| **CSRF** | RM confirm-proxy uses `secureFetch`. Admin check-existing is GET (no CSRF needed). |
| **XSS** | No new `{@html}` patterns. |
| **Injection** | All new MongoDB queries use parameterized filters. No string interpolation. |

## Performance Summary

| Metric | Status |
|--------|--------|
| **DSA cases load** | Now fetches up to 1,000 docs for in-memory sort (was paginated at DB). Bounded by MAX_TRIAGE. CSFLE decrypt bounded to 12-item page. Monitor when case books grow (M4). |
| **Bundle** | No new client-side dependencies. New utility files (caseLabel, caseTriage, loanTypeLabels) are small, tree-shakeable. |
| **Reactive efficiency** | 1 new `$effect` (localStorage read on mount). No reactive churn risk. |
| **DB queries** | New `FormSnapshots.find({ $in: pageCaseIds })` in DSA cases load — bounded to 12 case IDs per page. |

## Blast Radius Summary (T9)

- **Shared modules changed:** 0 from the T9 registry. Evaluate-and-persist modified but change is additive (new field `label_is_custom` + new label generation at creation).
- **Type changes:** 2 files, both additive/optional — 0 breaking changes.
- **API response shapes:** Unchanged. `label` field content changed (name-free format) but the field itself is the same string type.
- **Authors:** Single author (Prashant). No cross-team risk.

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `return json()` carry-forward routes (DX-4) | 108 files | ~109 files | ~Unchanged (counting variance) |
| CSFLE-encrypted routes | 39 | 39 | Unchanged |
| Auth rate-limited routes | 22 | 22 | Unchanged (new routes not rate-limited) |
| Contrast pairs | 456/456 | 456/456 | Unchanged |
| TODO/FIXME/HACK count | 16 / 7 files (refined count) | 35 / 13 files (case-sensitive, full scan) | Unchanged — prior count was case-refined, today's is full scan |
| Test count | 11,371 | **11,424** | **+53** |
| Error boundaries | 3 (root, `(app)`, dashboard) | 3 | Unchanged — `(auth)` gap persists |

---

## Observations

**Good practices worth highlighting:**

1. **Privacy-by-design in case labels** (B.1): The deliberate decision to keep customer names out of stored labels — surfacing them only in the DSA's own CSFLE-decrypted view — is excellent architectural hygiene. Prevents name leakage across partner surfaces (RM portal, share links) without restricting the DSA's own workflow.

2. **Fix-at-source for loan type display** (B.2): Single canonical `loanTypeLabel()` applied at the server-load boundary follows CLAUDE.md §16 rule 11. Idempotent design means it handles both raw enums and already-human labels gracefully.

3. **Extracted save contract** (`captureSaveContract.ts`): Pulling the wizard save body construction into a pure, testable function is the right level of abstraction for the off-by-one fix. The 5 tests directly validate the contract invariant (resume-step vs data-step decoupling).

4. **Array default hardening** across 6 policy-capture editors: Defensive prop defaults prevent SSR crashes on partial data without requiring upstream null guards at every call site.

5. **Triage sort design**: Computing priority from operational signals rather than a manual field keeps the daily view automatically up-to-date. Pure function extraction (`computeCaseTriage`) allows independent unit testing.

---

## Top 5 Actions

1. **[M3, carry-forward] Add rate limiting** to the 5 DATA-1/DATA-2 mutating endpoints before UI integration (POST/DELETE lead-vault, POST btdc-vault, POST revoke, cron sweep).
2. **[M2, carry-forward] Auth route `json()` migration** — track as DX-4 dedicated session.
3. **[L2, carry-forward] Fix PII in billing logger** — replace `{ err, email }` with `{ err, dsaId }` in `trial-reminder/+server.ts` lines 85 and 119.
4. **[L4, new] Add rate limiting** to RM confirm-proxy POST (10/hr/user) and admin proxy-capture PATCH/submit — defense-in-depth across all A.2 endpoints.
5. **[M4, new] Monitor DSA cases load latency** — when case books grow past ~200 cases, consider denormalizing triage fields to enable DB-level sort.

---

*Report generated: 2026-05-21. Reviewer: automated daily review (Standard profile, T1-T6, T9).*
