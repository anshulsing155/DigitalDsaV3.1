# Daily Code Review — 2026-05-31

## Header

**Profile:** Standard (T1-T6, T9) — 8 commits in 24hr window across 4 workstreams (DPDP §11 self-export, RM dashboard audit fixes, QBC notification emails + Plot variant stash, review-finding fixes from prior report). Standard profile: no auth-flow or payment-processing changes; billing touches are notification emails only (best-effort, non-transactional).
**Reviewed against:** committed `main` @ **`2917a6ae`** (top of tree).
**Prior review:** [`CODE-REVIEW-2026-05-30.md`](CODE-REVIEW-2026-05-30.md) (43-commit full profile @ `2d3604ef`).
**Delta range:** `2d3604ef..2917a6ae` — 8 commits (≈6 code, ≈2 docs/ops).
**Authors this window:** Prashant (single author).

| Command | Status | Result | Delta vs `2026-05-30` prior |
|---------|--------|--------|------------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings (committed tree clean) | **improved** — prior had in-flight `quotaBlockedEmails.ts:80` TS error; now fixed |
| `pnpm test:unit -- --run` | PASS | 285 files, **12,711 tests** | +81 tests (from 12,630) |
| `pnpm test:contrast` | PASS | **456/456 pairs** WCAG AA across every theme | unchanged |
| `git log … co-authored-by` | PASS | 0 trailer lines in this window | unchanged |

---

## Commits Reviewed (8, grouped by workstream)

### Workstream A — DPDP §11 Self-Export (E.1)

Full server-side + client-side implementation of the self-service data export. New dependency `jszip`. New collection `DataExportRequests` with compound index. Two paths: inline ZIP stream (≤200 cases) or ops-ticket email (>200 cases). 30-day rate limit. DSA scope exports 10 collections; RM scope exports profile-only (v1).

| SHA | Subject | Surface |
|-----|---------|---------|
| `00713f84` | feat(account): E.1 DPDP §11 self-export — server side | 8 files (+1,184) |
| `7e7012a2` | feat(account): E.1 DPDP §11 self-export — DSA + RM profile UI section | 3 files (+208) |

### Workstream B — RM Dashboard Audit Fixes

Closes multiple findings from the RM dashboard audit. Policy library dark mode + search/filter/sort. Unread badges on Communication threads. SuggestedDsas + PipelineFunnel zones now rendered (were computed but never displayed). Terminology fixes. Dead "Corporate" tab removed.

| SHA | Subject | Surface |
|-----|---------|---------|
| `2917a6ae` | feat(dashboard/rm): policy library dark mode + unread badges + supporting indexes | 6 files (+173/-28) |
| `eef65853` | feat(dashboard/rm): render suggestedDsas + pipeline funnel on home | 3 files (+437) |
| `22ac48c4` | feat(dashboard/rm): UI cleanups — terminology, filters, dead tab, clickable cards | 7 files (+57/-51) |
| `9d040139` | fix(dashboard/rm): scope active-versions query to RM + preserve KPIs on empty threads | 1 file (+15/-2) |

### Workstream C — QBC Notification Emails + Plot Variant Stash

Three QBC lifecycle emails (buffer-save, auto-unblock, archive-expired). Fixed the prior review's H3 finding (TS narrowing in `resolveDsaEmailRecipient`). Generalized `_stashedLoanVariant` into a declarative `variantStashRegistry`. Archive cron now fires emails per-DSA after archival.

| SHA | Subject | Surface |
|-----|---------|---------|
| `32b1fe97` | feat(billing+form): QBC notification emails + Plot variant stash registry | 8 files (+858/-32) |

### Workstream D — Prior Review Findings Fix

Closes 7 findings from CODE-REVIEW-2026-05-30 in a single dedicated commit.

| SHA | Subject | Surface |
|-----|---------|---------|
| `76916f2d` | chore(review): close 7 findings from CODE-REVIEW-2026-05-30 | 9 files (+823/-12) |

---

## Standing Grep Rules — T1-T6 + T9 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch | T1 | 127 files match the broad fetch-with-method grep. Spot-checked new endpoints: `data-export/+server.ts` is a server route (no CSRF needed — server-to-server). `mark-seen/+server.ts` uses `secureFetch` from the client caller. `DataExportSection.svelte` uses `secureFetch`. 0 new violations. | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | Same inventory as prior. No new `{@html}` in this delta. | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server/API | T1 | 0 hits in `src/routes/api/`. `src/lib/server/` — same 5 approved (logger internals + OTel bootstrap). | unchanged |
| **G (Co-Authored-By)** | T1 | 0 trailer lines. | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | No new credentials in source. New `jszip` dependency has no secret-bearing config. | unchanged |
| **SEC-2 (PII in logging)** | T1 | New `dataExport.ts` logs `user_id` (hex string) + `role` + `case_count` + `size_bytes` — no email/name/mobile in log output. `quotaBlockedEmails.ts` logs `dsa_id` only — no recipient address in log output. `email.ts` bounce handler now uses `maskEmailForLog` per L5 fix (`76916f2d`). **L5 finding CLOSED.** | **improved** |
| **SEC-3 (cookie security)** | T1 | No cookie changes this window. | unchanged |
| **SEC-4 (eval/exec)** | T1 | Same 2 approved. | unchanged |
| **SEC-5 (env var exposure)** | T1 | No new `VITE_*` exposures. | unchanged |
| **SEC-6 (rate limiting)** | T1 | New `/api/account/data-export` has a 30-day DB-backed rate limit. `mark-seen` endpoint has no rate limiter but is write-light (single `$set` update, no compute, BOLA-scoped). See M-N1 below. | **noted** |
| **SEC-7 (client storage PII)** | T1 | No new client-storage writes in this delta. | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (module-scope fetch)** | T2 | 0 | unchanged |
| **D (typeof window SSR guard)** | T2 | 0 | unchanged |
| **I (state_referenced_locally)** | T2 | 0 from `pnpm check` | unchanged |
| **J (engines.node pin)** | T2 | `"22.x"` | unchanged |
| **SSR-1 (browser import in server)** | T2 | 0 | unchanged |
| **SSR-2 (noExternal coverage)** | T2 | New `jszip` — pure JS, no native bindings, works in SSR. No `noExternal` change needed. | unchanged |
| **H1 ($-prefix Query)** | T3 | 0 | unchanged |
| **K (loan-switch chokepoint)** | T3 | `migrateApplicantsToRecoveryOnLoanSwitch` called only from orchestrator. | unchanged |
| **L (reload detection)** | T3 | Only in `isReloadOfCurrentPath.ts` + perf e2e + test. | unchanged |
| **M (combinedAnswers collision)** | T3 | 0 in components. | unchanged |
| **S (unsanitized {@html})** | T3 | Same as E. | unchanged |
| **CQ-1 through CQ-5** | T3 | All pass. | unchanged |
| **PH-1 (archived route stubs)** | T5 | All 7 archived `+server.ts` files import only `'./$types'` + `'$lib/server/apiResponse.js'`. | unchanged |
| **PH-2 through PH-7** | T5 | All pass. | unchanged |
| **Pitfall #41 (variant page index)** | T3 | Relevant — `32b1fe97` rewrites variant-stash logic. `how-can-we-help/+page.svelte` still has `VARIANT_SHAPING_KEYS` + `resetLoanPageIndex`. New `variantStashRegistry.ts` is called AFTER key writes, no page-index impact. | unchanged |
| **Pitfall #48 (native build)** | T5 | `.node` file present. | unchanged |
| **Pitfall #63 (archived routes)** | T5 | All clean. | unchanged |
| **Pitfall #68 (CSFLE switch)** | T1 | No CSFLE-related changes this window. | unchanged |
| **PERF-1 through PERF-6** | T6 | `dataExport.ts` does unbounded `find().toArray()` for DSAs with ≤200 cases. At the 200-case threshold + ~3 snapshots/case, the in-memory materialization is ~600 docs × ~10KB avg ≈ 6MB — within Vercel's 256MB function memory limit. See observation M-N2. | **noted** |
| **OBS-1 (structured logging)** | T6 | All new code uses `logger`. | unchanged |
| **OBS-2 (OTel PII scrub)** | T6 | `obsTelemetryScrubbing.test.ts` PASS. | unchanged |
| **T9 (blast radius)** | T9 | See [Blast Radius](#blast-radius-assessment-t9). | **moderate** |

---

## CI Lock Tests — All Pass

| Test file | Pitfall(s) | Status |
|-----------|-----------|--------|
| `account/dataExport.test.ts` | E.1 (new) | PASS — 10 tests |
| `account/dataExportEndpoint.test.ts` | E.1 (new) | PASS — 8 tests |
| `billing/quotaBlockedEmails.test.ts` | QBC (new) | PASS — 7 tests |
| `variantStashRegistry.test.ts` | Plot stash (new) | PASS — 8 tests |
| `previousMonthlyAnchor.test.ts` | M-N2 fix (new) | PASS — 7 tests |
| `emailBounceMask.test.ts` | L5 fix (new) | PASS — 7 tests |
| `legacyPayloadFieldsAbsent.test.ts` | L-N4 fix (new) | PASS — 6 tests |
| `affordabilityScenarioGatingShape.test.ts` | H2/Pitfall #43 fix (new) | PASS — 6 tests |
| `propertyNotIdentifiedTrafficLightShape.test.ts` | H2/Pitfall #43 fix (new) | PASS — 7 tests |
| All existing CI lock tests (24 files) | #26,#39-#68 | PASS |

12,711 / 12,711 unit tests passing (+81 from baseline `12,630`).

---

## Prior Review Findings — Status Update

| Finding | Prior Severity | Status | Resolved by |
|---------|---------------|--------|-------------|
| H2 — Pitfall #43 CI tests missing | High | **CLOSED** — both `affordabilityScenarioGatingShape.test.ts` and `propertyNotIdentifiedTrafficLightShape.test.ts` created | `76916f2d` |
| H3 — `pnpm check` fails on `quotaBlockedEmails.ts:80` | High | **CLOSED** — `resolveDsaEmailRecipient` restructured: `if (!dsa)` guard before `to` derivation eliminates the TS narrowing gap | `32b1fe97` |
| M-N1 — planResolver override 2 unconditional findOne reads | Medium-low | CARRY — no change this window | — |
| M-N2 — `cycleStartAt` 30-day arithmetic vs calendar-month | Medium-low | **CLOSED** — `previousMonthlyAnchor()` implemented with proper `setMonth(-1)` + day-overflow handling + 7 edge-case tests | `76916f2d` |
| M-N3 — Lender-offers loader empty catch | Medium-low | **CLOSED** — `logger.warn` added to catch block with `err`, `case_id`, and descriptive message | `76916f2d` |
| L-N4 — Legacy payload field removal lock | Low | **CLOSED** — `legacyPayloadFieldsAbsent.test.ts` created scanning for `lapType`, `PRODUCT_TYPE_MAP`, `bank-loan-management` | `76916f2d` |
| L5 — SEC-2 bounce-handler raw email logging | Low (carry) | **CLOSED** — `maskEmailForLog()` with 7 edge-case tests; bounce handler now masks before logging | `76916f2d` |
| L6 — SubscribeRecurringSection comment literal | Low | **CLOSED** — `TRIAL_DAYS-day` comment updated to reference `TRIAL_DAYS` by import; copy now uses template literal | `76916f2d` |
| L-N1 — debug patch stack-frame leak | Low (closed) | Remains closed — no regression | — |
| L-N2 — QBC sessionStorage PII-adjacent | Low | CARRY — no change | — |
| L-N3 — Authorities resolver LAP parity | Low (info) | CARRY — no change | — |

**All 7 actionable findings from the prior review are now closed.** Turnaround: 1 commit, <24hr.

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M-N1 — `/api/rm/threads/[thread_id]/mark-seen` has no rate limiter

**Confidence:** 60
**Severity:** Medium-low
**File:** [`src/routes/api/rm/threads/[thread_id]/mark-seen/+server.ts`](src/routes/api/rm/threads/[thread_id]/mark-seen/+server.ts)

The endpoint is correctly BOLA-guarded (ownership verified via `CommunicationThreads.findOne` with `rm_id` filter), uses `requireRoleApi` + `blockDemoWrite`, and does a single indexed `updateOne`. The write is idempotent (repeated calls just bump `rm_last_seen_at` to `new Date()`). However, it has no rate-limiter — CLAUDE.md §15 convention is that all state-changing endpoints use the centralized rate limiter.

**Risk assessment:** low. The endpoint is RM-only, idempotent, and costs one indexed `findOne` + one indexed `updateOne`. Abuse would just bump a timestamp. No data corruption possible. But for convention parity:

**Recommendation:** add a generous rate-limit (e.g. 20 per 10 seconds per user) so a broken client-side `$effect` can't spam it. Non-urgent; no UX or security impact.

### M-N2 — Data export inline path materializes all snapshots into memory

**Confidence:** 55
**Severity:** Medium-low (observation)
**File:** [`src/lib/server/account/dataExport.ts:155-172`](src/lib/server/account/dataExport.ts:155-172)

The inline path calls `FormSnapshots.find({ case_id: { $in: caseIds } }).toArray()` + same for `LenderResultsSnapshots`. At the 200-case INLINE_THRESHOLD with ~3 snapshots/case averaging ~10KB, this materializes ~6MB in-function before the JSZip compression pass. Within Vercel's 256MB limit but worth noting:

1. Snapshots can be larger for complex cases (multi-applicant, 6+ lender results) — a 200-case DSA with dense cases could push 20-30MB.
2. The `toJsonPretty` pass (pretty-printed JSON) inflates memory 2-3x vs minified.

Not a blocker for v1 (the threshold was owner-locked at 200), but if the threshold is ever raised, switch to cursor-based streaming or chunked ZIP assembly.

---

## Low Findings / Observations

### L-N1 — `communication/+page.server.ts` loads ALL messages for ALL threads at once

**Confidence:** 70
**Severity:** Low (performance observation)
**File:** [`src/routes/dashboard/rm/communication/+page.server.ts:30-31`](src/routes/dashboard/rm/communication/+page.server.ts:30-31)

```typescript
const threadsRaw = await CommunicationThreads.find({ rm_id: rmId })
    .sort({ updated_at: -1 })
    .toArray();
```

Each thread embeds its full `messages[]` array. For an RM with 20 threads averaging 30 messages each, the server load ships ~600 messages to the client — most of which the DSA never sees (only the selected thread's messages are visible). Pre-loading enables instant thread switching without a refetch, which is a valid UX trade-off at current scale. Note for when thread volumes grow: paginate threads (limit 20) + lazy-load messages per thread on selection.

### L-N2 — `DsaApplications.find()` in suggestedDsas scans up to 100 docs without a geo index

**Confidence:** 50
**Severity:** Low (performance, tiny dataset)
**File:** [`src/routes/dashboard/rm/+page.server.ts:798-835`](src/routes/dashboard/rm/+page.server.ts:798-835)

The suggested-DSA matching loads up to 100 `DsaApplications` docs (`.limit(100)`) and does in-memory city + bank matching. No geo-index or `$match` on city pushes the city-filter to the app layer. At 100 docs with a `{ _id, name, workingCity, city, preferredBanks }` projection this is sub-50ms and fine for the foreseeable DSA count. If DSA count reaches thousands, add a compound index on `{ workingCity: 1, onboardingCompleted: 1, is_suspended: 1 }` and `$match` at the query level.

### L-N3 — `mark-seen` RM resolution does ObjectId-first then mobile-fallback, but the mobile-fallback calls `decryptUserPii`

**Confidence:** 60
**Severity:** Low
**File:** [`src/routes/api/rm/threads/[thread_id]/mark-seen/+server.ts:30-37`](src/routes/api/rm/threads/[thread_id]/mark-seen/+server.ts:30-37)

```typescript
try {
    rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
} catch {
    const rmDocRaw = await findUserByMobile(rmApplications, user.mobileNumber);
    rmDoc = await decryptUserPii(rmDocRaw);
}
```

The `decryptUserPii` call in the fallback path is unnecessary for this endpoint — it only needs `rmDoc._id` to verify thread ownership. The decrypt is harmless (PII just goes out of scope) but wastes a CSFLE round-trip if the fallback path fires. Non-urgent; note for next touch of this file.

### L-N4 — Policies page uses hardcoded `bg-amber-*` / `text-red-*` Tailwind colors in dark mode

**Confidence:** 55
**Severity:** Low (visual)
**File:** [`src/routes/dashboard/rm/policies/+page.svelte:127-159`](src/routes/dashboard/rm/policies/+page.svelte:127-159)

The renewal-warning banners use static Tailwind utilities (`border-red-200 bg-red-50`, `text-amber-500`, etc.) instead of the `var(--dash-*)` token system. These won't adapt to dark mode or custom color schemes. The rest of the page correctly uses CSS custom properties. The policy library page was just refactored for dark mode (`2917a6ae`) so this is likely an oversight in the renewal-warning section that was carried forward rather than freshly introduced.

**Recommendation:** replace the 6 static color utilities with the equivalent dashboard tokens (`--dash-warning-bg`, `--dash-warning-text`, `--dash-contrast-*`).

### L5 (prior carry) — QBC sessionStorage PII-adjacent

Unchanged. Acceptable per prior analysis.

### L-N5 — `dataExport.ts` `buildReadme` hardcodes `tech@digitaldsa.com`

**Confidence:** 40
**Severity:** Low (informational)
**File:** [`src/lib/server/account/dataExport.ts:323`](src/lib/server/account/dataExport.ts:323)

The README.txt embedded in the export ZIP hardcodes `tech@digitaldsa.com` as the support contact. If the support email changes, the ZIP README will drift. Very minor — the ops ticket email already uses the exported `OPS_TICKET_RECIPIENT` constant. Not worth abstracting unless a second support-email reference appears.

---

## Security Surface Summary

### E.1 Data Export — sound design

The implementation follows the spec closely. Key security properties verified:

1. **Auth**: `requireAuthApi` — JWT-authenticated, DSA or RM only (admin explicitly excluded with 403).
2. **BOLA**: user can only export their own data — all queries filter by `userId` resolved from `locals.user`.
3. **Rate limit**: 30-day DB-backed window per user. Prevents abuse and gives ops a manageable ticket rate.
4. **No PII in logs**: `logger.info` output is `user_id` (hex) + `role` + counts + bytes — no email/name/mobile.
5. **No persistent storage**: ZIP is assembled in-memory and streamed back or the ops ticket fires. No S3/disk artifact.
6. **Privacy headers**: `Cache-Control: private, no-store, max-age=0` on the ZIP response.
7. **Scope boundaries**: DSA export excludes RM-owned data; RM export excludes DSA case data. Cross-tenant boundary respected.

No issues found.

### RM mark-seen endpoint — BOLA-safe

The `mark-seen` endpoint correctly verifies thread ownership via `CommunicationThreads.findOne({ _id: threadOid, rm_id: rmDoc._id })` before writing. The `updateOne` re-asserts `rm_id` in its filter as defense-in-depth. Only writes a single timestamp field.

### QBC notification emails — best-effort, no data exposure

All three email templates route through `sendEmail` (which respects SEC-8 provider routing). Recipients are looked up via `resolveDsaEmailRecipient` (single-doc projection, no decrypt). Email bodies contain plan name, case label, cycle date — no PII beyond the recipient's own email address. Failures are logged + swallowed (never roll back the underlying stage transition).

---

## Blast Radius Assessment (T9)

| Module | Change type | Consumers affected | Risk |
|--------|-----------|-------------------|------|
| `mongo.ts` | +2 collection exports (`DataExportRequests`, new indexes for `CommunicationThreads`) | All server loads (warm-up cost of `ensureIndexes`) | **Low** — indexes are additive; no schema migration |
| `quotaState.ts` | `cycleStartAt` derivation changed from 30-day arithmetic to `previousMonthlyAnchor()` | Sidebar quota indicator (3 render modes), any future consumer of `cycleStartAt` | **Low** — calendar-correct is strictly better; locked by 7 edge-case tests |
| `email.ts` | `maskEmailForLog` + `_maskEmailForLog` export added; bounce handler updated | Email bounce path (currently un-implemented — SNS handler is a TODO stub) | **Low** — additive; no call-path change |
| `quotaBlockedEmails.ts` (new) | 3 email templates + recipient lookup | `quotaUnblock.ts` (auto-unblock caller), `evaluate-and-persist` (buffer-save caller), archive cron | **Low** — all call sites are best-effort + try/catch |
| `variantStashRegistry.ts` (new) | Replaces inline `_stashedLoanVariant` logic in `how-can-we-help/+page.svelte` | Plot Loan scope-flip UX | **Low** — pure function, locked by 8 unit tests; picker call site simplified (fewer inline lines) |
| `how-can-we-help/+page.svelte` | Rewired from inline stash/restore to `applyVariantStashRules` + archive cron email integration | All loan families' picker page | **Low** — stash logic is Plot-only (other loans have no matching rule in the registry); functional behavior unchanged |
| `+layout.server.ts` (case_id) | `logger.warn` added to catch block | Case-detail layout load | **Negligible** — additive logging only |
| `+page.server.ts` (RM home) | Active-versions query scoped to RM + empty-thread KPI fix | RM home page | **Low** — fix is a filter narrowing (fewer results, not different shape) |

No breaking changes to shared exports. New modules are additive.

---

## Performance Notes

- **Data export inline path**: ~6MB peak memory for a 200-case DSA. Assembly time ~15-20s per owner estimate. Fits within Vercel Pro's 60s function limit. The INLINE_THRESHOLD constant is the safety valve.
- **`previousMonthlyAnchor`**: pure arithmetic, sub-microsecond. No perf concern vs the prior `Date.now() - 30 * DAY_MS` approach.
- **RM home `+page.server.ts`**: `lenderAssignments` query added in prior window (C.1); `9d040139` adds no new queries, just scopes the active-versions query to `source_rm_id` (potentially faster due to selectivity).
- **Communication page**: loads all messages for all threads. Fine at current scale (tens of threads). Note for future.

No performance regressions detected.

---

## Top Actions (priority order)

1. **Replace hardcoded Tailwind colors in policy renewal warnings** with dashboard CSS tokens (`--dash-warning-bg`, etc.) for dark-mode parity (L-N4). ~15-minute fix, same session as next policy-library touch.
2. **(Optional) Add rate-limiter to `mark-seen`** endpoint for convention parity (M-N1). Non-urgent; no security impact.
3. **(Watch) Data export memory at scale** — if INLINE_THRESHOLD is ever raised above 200, switch to cursor-based streaming or chunked ZIP assembly (M-N2).
4. **(Optional) Lazy-load thread messages** on selection instead of pre-loading all in the communication server load (L-N1). Non-urgent at current thread volumes.

---

## Known-Safe Inventory Update

- `DataExportRequests` collection + `{ user_id: 1, requested_at: -1 }` compound index — audit trail only, never storage.
- `quotaBlockedEmails.ts` — 3 templates, best-effort dispatch, `dsa_id`-only logging, no PII in log output.
- `variantStashRegistry.ts` — pure function, no I/O, no runes. Plot-only rule in v1. Locked by 8 tests.
- `mark-seen/+server.ts` — BOLA-safe (double ownership filter), idempotent, write-light.
- `previousMonthlyAnchor.test.ts` — 7 edge cases covering day-overflow (Jan 31 → Dec 31), Feb-28/29, year-boundary.
- `emailBounceMask.test.ts` — 7 edge cases covering short locals, no-dot domains, empty strings.
- `legacyPayloadFieldsAbsent.test.ts` — removal lock for `lapType`, `PRODUCT_TYPE_MAP`, `bank-loan-management`.
- `affordabilityScenarioGatingShape.test.ts` + `propertyNotIdentifiedTrafficLightShape.test.ts` — Pitfall #43 coverage now 3/3 (was 1/3).

---

*Report generated 2026-05-31. No source code modified during review. All findings are against the committed `main` tree at `2917a6ae`.*
