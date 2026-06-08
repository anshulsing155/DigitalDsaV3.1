# Daily Code Review — 2026-05-17

**Scope:** 2 commits `40ea218a..4ab00bdd` (last 24 hours). SEC-5 BOLA defense-in-depth (5 routes), PERF-3 TanStack Query migration (2 components), XSS fix in RM email, DATA-3 production runbook. All by primary author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-15-b.md`](CODE-REVIEW-2026-05-15-b.md) — Full sweep of S102. Carry-forward: L1 (apiServerError context), L5 (DX-4 `json()` migration queue), M3 (`check-dsa` flat shape).

**Review profile:** **Standard** (T1-T6, T9). 2 commits, no auth/payment changes. T9 triggered because NotificationBell is a shared component (renders in the app shell for all roles).

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 112 files, **10,835 tests** — all pass (+267 from prior review baseline of 10,568) |
| `git log --since='1 week' \| co-authored-by` | 1 false positive (CLAUDE.md rule text). **0 real violations.** |

---

## Commits Reviewed

| SHA | Subject | Files | +/- | Source/Docs |
|-----|---------|-------|-----|-------------|
| `40ea218a` | chore(roadmap): DATA-3 runbook + SEC-5 RM-portal batch + PERF-3 e2e-run page | 7 | +402/−52 | src + docs |
| `4ab00bdd` | chore(roadmap): SEC-5 batch 2 (8 routes) + PERF-3 NotificationBell migration | 5 | +135/−73 | src + docs |

Total: **2 commits**. Source: 6 files (3 API routes, 2 Svelte components, 1 runbook). Docs: 4 (CHANGELOG ×2, ARCHITECTURE-EVOLUTION ×2).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **L1** — Lost `captureId` context in `apiServerError` | **Carry-forward** | No changes to `apiResponse.ts` this session. Enhancement still recommended. |
| **L5** — Raw `json()` carry-forward in routes | **Extended** | Today's 5 touched routes still use `json()`. DX-4 queue grows by 5. See Note N1. |
| **M3** — `check-dsa` uses `json()` for success path | **Carry-forward** | Unchanged. |

---

## Standing Grep Rules — T1-T6 + T9 Sweep

| Rule | Tier | Result | Delta vs 2026-05-15-b |
|------|------|--------|----------------------|
| **A** — CSRF: raw `fetch()` + POST/PUT/DELETE/PATCH in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, read-only GETs). NotificationBell uses `secureFetch` for all mutations (PATCH mark-read, POST mark-all-read). **0 new violations.** | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same approved exception sites (JsonLd, Toast icon, server pageDescription ×5, admin policies human_readable, sanitizeHtml-wrapped components). **0 new violations.** | Unchanged |
| **E2** — Raw HTML interpolation in email templates | T1 | **RM thread messages route now escapes all interpolated values** (`rmName`, `caseId`, `messageText`) via `escapeHtml()` from `$lib/utils/sanitize`. Previously raw. | **−1 vulnerability** ✅ |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts:47,54` (the formatter), `telemetry.ts:186,211,215` (OTel bootstrap). `routes/api/` has 2 commented-out lines only. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | 0 real violations. | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | No new source patterns. | Unchanged |
| **SEC-2** — PII in logging | T1 | No new `logger` calls with PII. RM routes use existing patterns. | Unchanged |
| **SEC-3** — Cookie security | T1 | No new `cookies.set` sites. | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | 2 known-safe (unchanged). | Unchanged |
| **SEC-5** — Client env exposure | T1 | 0 violations. | Unchanged |
| **SEC-6** — Rate limiting on auth | T1 | 8/8 critical auth routes hardened (unchanged from prior). | Unchanged |
| **SEC-7** — Client storage PII | T1 | 10 known-safe files (unchanged). | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | Only `@capacitor/core` static (safe boolean check). | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** TanStack Query `createQuery` calls are at component scope, not module scope. | Unchanged |
| **I** — `window.*` without browser guard | T2 | NotificationBell's `window.addEventListener('click', ...)` is inside `onMount` — SSR-safe. | Unchanged |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | 10 known-safe files (unchanged). | Unchanged |
| **SSR-1** — `@tanstack/svelte-query` `$`-prefix | T2 | **0 violations** in `src/routes` and `src/lib`. Only hit: comment in `queryClient.ts:26` (documentation). New `NotificationBell.svelte` and `e2e-run/+page.svelte` both use bare-name access. | Unchanged |
| **SSR-2** — TanStack Query provider wiring | T2 | `QueryClientProvider` in `+layout.svelte`, `QueryClient` setup in `queryClient.ts`. Both new components import `createQuery`/`useQueryClient` — provider chain verified. | Unchanged |
| **H1** — JSON-Logic `!=` (Pitfall #1) | T3 | Same carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **K** — `$state(prop)` without `$derived` (Pitfall #10) | T3 | `pnpm check` 0 warnings. All instances annotated with `svelte-ignore`. | Unchanged |
| **L** — `combinedAnswers` collisions (Pitfall #13) | T3 | No form/sidebar code touched. | Unchanged |
| **M** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No form question changes. | Unchanged |
| **S** — Shared `bindsTo` overrides | T3 | No form question changes. | Unchanged |
| **CQ-1..CQ-5** — Various correctness | T3 | No new violations. | Unchanged |
| **PH-1** — Vercel Node pin | T5 | `engines.node: "22.x"` — correct. | Unchanged |
| **PH-2** — `ssr.noExternal` chain | T5 | Unchanged: `pino`, `gsap`, `gsap/dist/ScrollTrigger`, isomorphic-dompurify chain, `razorpay`. No new deps added. `@tanstack/svelte-query` is ESM-native and doesn't need noExternal. | Unchanged |
| **PH-3..PH-7** — Other production hygiene | T5 | No changes. | Unchanged |
| **PERF-1** — Dashboard SSR-load | T6 | CLOSED (prior review). | Unchanged |
| **PERF-2** — Client bundle | T6 | No new heavy imports. TanStack Query was already in the bundle. | Unchanged |
| **PERF-3** — TanStack Query migration | T6 | **+2 components migrated**: `NotificationBell.svelte` (polling + optimistic → query invalidation), `e2e-run/+page.svelte` (setInterval → conditional refetchInterval). Both follow the canonical pattern. | **+2 migrated** ✅ |
| **PERF-4..PERF-6** — Other perf | T6 | Unchanged. | Unchanged |
| **OBS-1** — Client error tracking | T6 | Unchanged. | Unchanged |
| **OBS-2** — OpenTelemetry | T6 | Unchanged (deferred). | Unchanged |
| **T9** — Cross-team blast radius | T9 | `NotificationBell.svelte` renders in the app shell for all roles. Migration is behavioral-equivalent (same endpoints, same intervals). `unreadCountQuery` polls 60s matching the old `setInterval(60_000)`. `listQuery` fetches on panel open matching old `fetchNotifications()`. Query invalidation replaces optimistic local updates — slightly slower to reflect (waits for refetch) but correct-by-construction (no stale local state). | No blast |

---

## Findings (this review)

### High — none

### Medium — none

### Low

#### L1 — `pushSubscribed` assignment without unmount guard (NotificationBell)

**Severity:** Low (correctness, not crash)
**Location:** [`src/lib/components/NotificationBell.svelte:155`](src/lib/components/NotificationBell.svelte:155)
**Commit:** `4ab00bdd`

The pre-migration code guarded the push subscription check with `if (mounted)`:
```javascript
isSubscribedToPush().then((subscribed) => {
    if (mounted) pushSubscribed = subscribed;
});
```

The post-migration code drops the guard:
```javascript
isSubscribedToPush().then((subscribed) => {
    pushSubscribed = subscribed;
});
```

This is inside `onMount`, but the `.then()` fires asynchronously. If the component unmounts before the promise resolves, `pushSubscribed = subscribed` writes to garbage state. In Svelte 5, this doesn't crash (the `$state` proxy silently accepts the write), and the push check typically resolves in <100ms, making the window vanishingly small.

**Impact:** Negligible. The worst case is a no-op write to unmounted state. No error, no visible effect.

**Recommendation:** Accept as-is. The TanStack migration intentionally removed the `mounted` pattern; re-introducing it for one fire-and-forget call would be over-engineering. If a future change makes push checks slow (e.g., network round-trip), revisit.

### Notes (informational)

#### N1 — DX-4 carry-forward inventory expanded

The 5 routes touched for BOLA defense-in-depth still use `json()` instead of `apiOk()/apiError()`:
- `src/routes/api/crm-lenders/[lender_id]/+server.ts`
- `src/routes/api/sources/[source_id]/+server.ts`
- `src/routes/api/rm/submissions/[id]/+server.ts`
- `src/routes/api/rm/submissions/[id]/documents/+server.ts`
- `src/routes/api/rm/threads/[thread_id]/messages/+server.ts`

The BOLA changes were intentionally scoped to defense-in-depth (write filter tightening) without mixing in DX-4 response-helper migration. Correct choice — single-purpose commits. These 5 join the existing DX-4 queue.

#### N2 — Email XSS hardening (positive finding)

[`src/routes/api/rm/threads/[thread_id]/messages/+server.ts:127-135`](src/routes/api/rm/threads/[thread_id]/messages/+server.ts:127) — Previously, `rmName`, `thread.case_id`, and `messageText` were interpolated raw into an HTML email body. `messageText` is RM-typed free text and was the primary injection vector. All three are now escaped via `escapeHtml()` from `$lib/utils/sanitize`. Defense-in-depth: DB-sourced values (rmName, case_id) are also escaped even though they're less likely to contain malicious content.

This closes a real stored XSS / email injection vector that existed since the RM communication feature was introduced.

---

## Commit-Level Analysis

### `40ea218a` — DATA-3 runbook + SEC-5 RM-portal batch + PERF-3 e2e-run page

**Docs:**
- New `docs/runbooks/DATA-3-PRODUCTION-WIRING.md` (292 lines) — comprehensive production wiring guide. Correct next step per SESSION-HANDOFF.md. Docs-only.

**SEC-5 BOLA defense-in-depth (3 RM routes):**
- `rm/submissions/[id]` PATCH: write filter scoped to `(submission_id, rm_id)`. The `rm_id` is derived from `rmDoc._id.toString()` — correct, matches the collection's string-typed `rm_id` field.
- `rm/submissions/[id]/documents` POST: same pattern. `$push` to document_ids now also scoped by `rm_id`.
- `rm/threads/[thread_id]/messages` POST: write filter scoped to `(_id, rm_id)`. Uses `rmDoc._id` directly (ObjectId) — correct, CommunicationThreads stores `rm_id` as ObjectId.
- **XSS fix**: `escapeHtml` imported and applied to all 3 interpolated values in the notification email template. Verified: `escapeHtml()` in `$lib/utils/sanitize.ts:39` performs standard HTML entity encoding (`&`, `<`, `>`, `"`, `'`). Correct and complete.
- All 3 routes retain their existing `findOne` BOLA gate; the write-scope is strictly additive defense-in-depth.

**PERF-3 — e2e-run TanStack Query migration:**
- Replaced manual `setInterval(pollStatus, 2000)` + `stopPolling()` + local `runStatus` state with `createQuery` + conditional `refetchInterval` function.
- The `refetchInterval` callback correctly stops polling when status is `completed` or `failed`.
- New `starting` flag bridges POST-submit → first-poll gap (previously covered by `running = true` before the setInterval started).
- `running` is now `$derived.by()` — combines `starting` flag with terminal-status check. Correct logic.
- No `$`-prefix on `runQuery` (Pitfall #28 compliant).
- `enabled: !!activeRunId` prevents polling before a run starts.

### `4ab00bdd` — SEC-5 batch 2 (8 routes) + PERF-3 NotificationBell migration

**SEC-5 BOLA defense-in-depth (2 DSA routes):**
- `crm-lenders/[lender_id]` PATCH: write filter scoped to `(_id, dsa_id)`. Uses `result.dsaId` from the preceding `findOne` result — correct.
- `sources/[source_id]` PATCH: same pattern. Comment notes DELETE handler already had this scoping; PATCH brought to parity. Verified: [`sources/[source_id]/+server.ts:97`](src/routes/api/sources/[source_id]/+server.ts:97) shows `updateOne({ _id: sourceId, dsa_id: result.dsaId }, ...)` on the delete path (soft-deactivate). PATCH now matches.

**PERF-3 — NotificationBell TanStack Query migration:**
- **Pre-migration state:** 2 fetch functions (`fetchNotifications`, `fetchUnreadCount`), `mounted` guard, `setInterval(60_000)`, manual optimistic updates after mark-as-read/mark-all-read. ~50 lines of lifecycle management.
- **Post-migration state:** 2 queries (`unreadCountQuery` polls 60s, `listQuery` enabled when panel open), `queryClient.invalidateQueries` after mutations. ~30 lines. Lifecycle reduced to push check + window click listener.
- Display values (`unreadCount`, `notifications`, `loading`) are `$derived` — correct Svelte 5 pattern.
- `Notification` type extracted as a named type alias at component scope — cleaner than the inline array type.
- `handleNotificationClick` parameter type updated from `(typeof notifications)[0]` to `Notification` — matches the new type.
- Panel toggle simplified: `listQuery.enabled: isOpen` auto-fetches when panel opens. No manual `fetchNotifications()` call needed.
- `markAsRead` / `markAllRead`: replaced optimistic local mutations with `queryClient.invalidateQueries({ queryKey: ['notifications'] })`. Slightly slower (waits for refetch) but eliminates the dual-state drift risk (optimistic local count vs server count). Correct trade-off for a notification badge.
- SSR safety: `createQuery` and `useQueryClient` are component-scope calls, not module-scope. `onMount` wraps browser-only APIs. No SSR violations.

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| BOLA defense-in-depth | **+5 routes hardened** (3 RM, 2 DSA). Write filters now scoped to owner ID alongside document _id. |
| XSS / email injection | **−1 vulnerability**: RM thread email template now escapes all interpolated values. |
| CSRF | Unchanged. NotificationBell mutations use `secureFetch`. |
| Auth | Unchanged. No auth route changes. |
| Rate limiting | Unchanged. |

## Performance Summary

| Metric | Status |
|--------|--------|
| PERF-3 TanStack Query | **+2 components migrated** (NotificationBell, e2e-run). Both eliminate manual polling lifecycle in favor of declarative query config. |
| Bundle impact | Negligible — `@tanstack/svelte-query` already in bundle from prior adoption. New imports add no new chunks. |
| Network | NotificationBell: count-only poll reduced from `?limit=10` to `?limit=1` for the 60s background check (only fetches full list when panel opens). **Slight bandwidth improvement.** |

## Blast Radius Summary (T9)

| Shared module | Change | Risk |
|--------------|--------|------|
| `NotificationBell.svelte` | Full rewrite (TanStack migration) | **Low** — renders identically, same endpoints, same intervals. Behavioral change: mutations now refetch instead of optimistic update (slight delay on badge count update after mark-read). Affects all 3 roles. |
| `$lib/utils/sanitize.ts` | No change (only imported) | None |
| API routes | Write filter tightening only | **Zero** — additive filter can only reduce results, never produce wrong results. If `dsa_id`/`rm_id` mismatch somehow occurs, the update silently no-ops (same as 404 — existing findOne gate would have caught it). |

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `json()` carry-forward routes (DX-4) | ~128 of ~150 | ~128 + 5 touched but not migrated | +5 in queue |
| BOLA defense-in-depth routes | (new tracking) | 5 (3 RM + 2 DSA) | New inventory |
| PERF-3 TanStack migrations | 0 (prior to today) | 2 | +2 |
| Auth rate-limited routes | 19 | 19 | Unchanged |

---

## Top 5 Actions

1. **No immediate action required** — all findings are Low or informational.
2. (**Carry-forward**) Enhance `apiServerError` to accept optional context object (prior review L1).
3. (**Carry-forward**) Continue DX-4 `json()` → `apiOk()/apiError()` migration (5 more routes in queue from today).
4. (**Track**) Audit remaining RM and DSA parameterized routes for BOLA defense-in-depth parity — today hardened 5; inventory the rest.
5. (**Track**) Survey other email templates for raw HTML interpolation — the RM thread fix may not be the only template.
