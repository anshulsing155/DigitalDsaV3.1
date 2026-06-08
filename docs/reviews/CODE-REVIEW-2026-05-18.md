# Daily Code Review — 2026-05-18

**Scope:** 1 commit `4ab00bdd..b2018790` (last 24 hours). SEC-5 admin-bypass parity fix on PMS policies PATCH route. Single author (Prashant).

**Prior review:** [`CODE-REVIEW-2026-05-17.md`](CODE-REVIEW-2026-05-17.md) — SEC-5 batch 2 (8 routes) + PERF-3 NotificationBell migration. Carry-forward: L1 (apiServerError context), L5 (DX-4 `json()` migration queue), M3 (`check-dsa` flat shape).

**Review profile:** **Standard** (T1-T6, T9). 1 commit, no auth/payment changes, no shared-module changes. T9 not triggered — the changed file is a PMS-specific API route, not a shared module.

---

## Commands Executed

| Command | Result |
|---------|--------|
| `pnpm check` | **0 errors, 0 warnings** — unchanged |
| `pnpm test:unit -- --run` | 132 files, **10,835 tests** — all pass (unchanged from prior review) |
| `pnpm test:contrast` | **456/456 pairs passed** — all WCAG AA across every theme |
| `git log --since='1 week' \| co-authored-by` | 1 false positive (CLAUDE.md rule text). **0 real violations.** |

---

## Commits Reviewed

| SHA | Subject | Files | +/- | Source/Docs |
|-----|---------|-------|-----|-------------|
| `b2018790` | fix(pms): admin-bypass parity on /api/pms/policies/[id] PATCH (SEC-5) | 4 | +292/−4 | 1 src, 3 docs |

Total: **1 commit**. Source: 1 file (`src/routes/api/pms/policies/[id]/+server.ts`). Docs: 3 (CHANGELOG, ARCHITECTURE-EVOLUTION, prior day's review committed).

---

## Prior Review Findings — Resolution Status

| Finding | Status | Evidence |
|---------|--------|----------|
| **L1** — Lost `captureId` context in `apiServerError` | **Carry-forward** | No changes to `apiResponse.ts` this session. Enhancement still recommended. |
| **L5** — Raw `json()` carry-forward in routes | **Carry-forward** | No new routes touched. DX-4 queue unchanged. |
| **M3** — `check-dsa` uses `json()` for success path | **Carry-forward** | Unchanged. |
| **L1** (2026-05-17) — `pushSubscribed` without unmount guard | **Carry-forward** | Accepted as-is per prior review's recommendation. No change. |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs 2026-05-17 |
|------|------|--------|----------------------|
| **A** — CSRF: raw `fetch()` + POST/PUT/DELETE/PATCH in `.svelte` | T1 | Same known-safe inventory (auth pages, `_archived`, read-only GETs). **0 new violations.** | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | Same 33 approved exception sites. **0 new violations.** | Unchanged |
| **E2** — Raw HTML interpolation in email templates | T1 | Same as prior — RM thread template escapes via `escapeHtml()`. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | Known-safe: `logger.ts:47,54` (formatter), `telemetry.ts:186,211,215` (OTel bootstrap). `routes/api/` has 2 commented-out lines only. **0 violations.** | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | 0 real violations. | Unchanged |
| **SEC-1** — Hardcoded secrets | T1 | No new source patterns. All matches are test files or type enums. | Unchanged |
| **SEC-2** — PII in logging | T1 | No new `logger` calls with PII. | Unchanged |
| **SEC-3** — Cookie security | T1 | No new `cookies.set` sites. | Unchanged |
| **SEC-4** — `eval`/`exec`/`child_process` | T1 | 2 known-safe (dev/admin exec routes), 1 regex `.exec()` in test. | Unchanged |
| **SEC-5** — Client env exposure | T1 | Only `VITE_VAPID_PUBLIC_KEY` (public by design). 0 server-private leaks to `.svelte`. | Unchanged |
| **SEC-6** — Rate limiting on auth | T1 | No auth route changes. | Unchanged |
| **SEC-7** — Client storage PII | T1 | Same 20 known-safe sites (theme, language, form draft keys, security monitor). | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | Only `@capacitor/core` static (safe boolean check). | Unchanged |
| **C** — `typeof window` SSR guard (Pitfall #9) | T2 | **0 violations.** | Unchanged |
| **D** — `fetch` at module scope (Pitfall #4) | T2 | **0 violations.** | Unchanged |
| **I** — `window.*` without browser guard | T2 | All `window.*` calls inside `onMount` or `$effect`. | Unchanged |
| **J** — `localStorage`/`sessionStorage` SSR-unsafe | T2 | Same known-safe files. | Unchanged |
| **SSR-1** — `@tanstack/svelte-query` `$`-prefix | T2 | **0 violations** — only a documentation comment in `queryClient.ts:26`. | Unchanged |
| **SSR-2** — TanStack Query provider wiring | T2 | Provider chain intact. | Unchanged |
| **H1** — JSON-Logic `!=` (Pitfall #1) | T3 | Same carry-forward in `businessLoan/`. No new usages. | Unchanged |
| **K** — `$state(prop)` without `$derived` (Pitfall #10) | T3 | `pnpm check` 0 warnings. | Unchanged |
| **L** — `combinedAnswers` collisions (Pitfall #13) | T3 | No form code touched. | Unchanged |
| **M** — Numeric fields without `minLimit` (Pitfall #14) | T3 | No form question changes. | Unchanged |
| **S** — Contrast audit (WCAG AA) | T3 | 456/456 pairs passed. | Unchanged |
| **CQ-1** — Swallowed errors / empty catch | T3 | **0 empty catch blocks.** | Unchanged |
| **CQ-2** — Memory leaks: intervals/listeners | T3 | Same known inventory. No new `setInterval`/`addEventListener` sites. | Unchanged |
| **CQ-3** — Banned `JSON.parse(JSON.stringify)` | T3 | Only in test files (exempt). | Unchanged |
| **CQ-4** — Error boundary coverage | T3 | `+error.svelte` exists at root, `(app)`, and `dashboard`. Known gap: no `(auth)` boundary. | Unchanged |
| **CQ-5** — TODO/FIXME/HACK accumulation | T3 | **35 across 13 files** — unchanged from prior review. | Unchanged |
| **PH-1** — Vercel Node pin | T5 | `engines.node: "22.x"` — correct. | Unchanged |
| **PH-2** — `ssr.noExternal` chain | T5 | `pino`, `gsap`, `gsap/dist/ScrollTrigger`, isomorphic-dompurify chain (build-only), `razorpay`. No new deps. | Unchanged |
| **PH-3..PH-7** — Other production hygiene | T5 | No changes. | Unchanged |
| **PERF-1..PERF-6** — Performance rules | T6 | No changes. | Unchanged |
| **OBS-1/OBS-2** — Observability | T6 | Unchanged. | Unchanged |

---

## Findings (this review)

### High — none

### Medium — none

### Low — none

### Notes (informational)

#### N1 — Admin-bypass parity now complete across all PMS policy routes

The commit fixes the last remaining narrow admin check (`activeRole !== 'admin'`) on the PATCH handler in `policies/[id]/+server.ts`. Post-fix verification:

- **7 wide admin-bypass derivations** (`activeRole === 'admin' || adminPermissions !== undefined`) across 5 files in `src/routes/api/pms/policies/`:
  - `+server.ts` GET (line 60), POST (line 184)
  - `[id]/+server.ts` GET (line 62), PATCH (line 133) — **this commit**
  - `[id]/apply-delta/+server.ts` (line 83)
  - `[id]/revise/+server.ts` (line 36)
  - `[id]/submit/+server.ts` (line 55)

- **4 admin-only routes** correctly use `requireRoleApi(locals, 'admin')` without the bypass (approve, reject, clause-comment, admin-json-edit) — these are admin-exclusive, so RM access is intentionally blocked.

- **0 remaining narrow `activeRole !== 'admin'` checks** in all PMS routes. Only a historical reference in the PATCH comment.

The commit message includes a useful diagnostic: `grep -nE "activeRole !== 'admin'|activeRole === 'admin'" src/routes/api/pms/policies` as a co-occurrence sweep to catch parity gaps. Good practice for SEC-5 batch work.

#### N2 — DX-4 carry-forward unchanged

No new routes were migrated from `json()` to `apiOk()/apiError()`. The changed PATCH handler already used the canonical helpers. Queue size unchanged.

#### N3 — SEC-5 progress

Commit message reports **107 of ~150 routes audited** (~71%). Prior day: 96. This commit audited 11 PMS-policies routes + `rm/review/respond`, found 1 fix (this PATCH), pushed 1 fix. Clean audit; systematic.

---

## Commit-Level Analysis

### `b2018790` — fix(pms): admin-bypass parity on /api/pms/policies/[id] PATCH (SEC-5)

**The bug (correctly identified):**

The PATCH handler at line 125 used the narrow check:
```typescript
if (locals.user!.activeRole !== 'admin') { ... }
```

This fails for admin users who switch to RM mode via the top-right role-switcher: their `activeRole` is `'rm'` but `locals.adminPermissions` is still set (populated in `hooks.server.ts` for any admin). Result: admin-in-RM-mode gets subjected to the RM-Lender-Assignment gate, blocking them from editing policies for lenders they don't have an assignment for.

**The fix (correct):**

Replaced with the canonical wide derivation:
```typescript
const isAdmin =
    locals.user!.activeRole === 'admin' || locals.adminPermissions !== undefined;
if (!isAdmin) { ... }
```

Matches the GET handler in the same file and all sibling PMS routes.

**Security assessment:**

- This is the **opposite direction** from a BOLA vulnerability — it's an access denial for authorized users, not an access grant for unauthorized ones. No security risk from the bug existing; the fix correctly expands access for legitimate admins only.
- The `adminPermissions !== undefined` check is server-side only, set in `hooks.server.ts` from JWT claims. Cannot be forged by client.
- The fix is purely additive to the `if` condition — no behavioral change for RM-only users (they never have `adminPermissions`).

**Code quality:**

- Comment block (lines 125-131) thoroughly explains why the narrow check was wrong, references the sibling routes, and documents the parity motivation. Good for future auditors.
- No other changes to this file — the diff is minimal and focused.
- The `isAdmin` variable is defined twice in the file (lines 61-62 and 132-133), once for GET and once for PATCH. Not extracted to a shared helper because each handler has its own try/catch scope and the two-line derivation is clear enough to duplicate. Acceptable.

**Docs:**

- `docs/ARCHITECTURE-EVOLUTION.md` updated: SEC-5 count 96 → 107.
- `docs/CHANGELOG.md` includes full session narrative.
- `docs/reviews/CODE-REVIEW-2026-05-17.md` committed (previously untracked from the automated daily review).

---

## Security Summary

| Surface | Status this session |
|---------|---------------------|
| BOLA defense-in-depth | Unchanged (no new write-filter scoping). |
| Admin-bypass parity | **+1 fix**: PMS policies PATCH now uses wide admin derivation. All 25 PMS route files audited for this pattern — 0 remaining gaps. |
| XSS | Unchanged. |
| CSRF | Unchanged. |
| Auth | Unchanged. |

## Performance Summary

| Metric | Status |
|--------|--------|
| PERF-3 TanStack Query | Unchanged (2 components migrated as of prior review). |
| Bundle / Network | No changes. |

## Blast Radius Summary (T9)

No shared modules changed. The modified file (`src/routes/api/pms/policies/[id]/+server.ts`) is a PMS-specific API route. The behavioral change only affects admin users who switch to RM mode — a narrow population. No cross-team blast radius.

---

## Known-Safe Inventory Updates

| Category | Prior count | Current count | Change |
|----------|-------------|---------------|--------|
| `{@html}` approved sites | 33 | 33 | Unchanged |
| `json()` carry-forward routes (DX-4) | ~128 of ~150 | ~128 | Unchanged |
| BOLA defense-in-depth routes | 5 | 5 | Unchanged |
| SEC-5 admin-bypass routes audited | 96 | 107 | +11 audited |
| PERF-3 TanStack migrations | 2 | 2 | Unchanged |
| Auth rate-limited routes | 19 | 19 | Unchanged |
| Contrast pairs | 456/456 | 456/456 | Unchanged |
| TODO/FIXME/HACK count | 35 / 13 files | 35 / 13 files | Unchanged |
| Test count | 10,835 | 10,835 | Unchanged |

---

## Top 5 Actions

1. **No immediate action required** — clean commit, all findings informational.
2. (**Carry-forward**) Enhance `apiServerError` to accept optional context object (prior review L1).
3. (**Carry-forward**) Continue DX-4 `json()` → `apiOk()/apiError()` migration.
4. (**Track**) SEC-5 at 107/~150 routes (~71%) — continue sweep in next SEC-5 batch.
5. (**Track**) Survey remaining PMS routes outside `policies/` for admin-bypass parity (lender-assignments, pipeline, suggestions, OTP, registry).
