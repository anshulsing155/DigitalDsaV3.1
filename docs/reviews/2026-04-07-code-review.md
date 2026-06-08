# Code Review — Sessions 57-59 (2026-04-07)

**Commits reviewed:** `8d2b7e1c` (S57), `e60cb05b` (S58), `9aedf1b4` (S59)
**Author:** `tech@eyantrik.com` (all commits from our sessions — no third-party commits found)

---

## CRITICAL (fix before next session)

### C1. Missing `requireRoleApi` guard on `/api/rm/sample-data`

**File:** `src/routes/api/rm/sample-data/+server.ts` L60, L88
**Confidence:** 95

The DELETE and POST handlers check `locals.user` but never call `requireRoleApi(locals, 'rm')`. Any authenticated DSA can hit this RM endpoint. The companion `preferred-dsas` endpoint correctly uses the guard.

**Fix:**
```ts
export const DELETE: RequestHandler = async ({ locals }) => {
    const denied = requireRoleApi(locals, 'rm');
    if (denied) return denied;
    // ...
};
```

---

### C2. Bare `fetch` on mutating calls in RM dashboard (CSRF bypass)

**File:** `src/routes/dashboard/rm/+page.svelte` L153, L187
**Confidence:** 92

DELETE and POST calls use raw `fetch()` instead of `secureFetch()`. The import exists (line 14) but is never used — dead code. The DSA dashboard correctly uses `secureFetch` for its equivalent calls.

**Fix:** Replace `fetch` with `secureFetch` on lines 153 and 187.

---

### C3. In-memory rate limiter sliding-window bug

**File:** `src/lib/server/rateLimiter.ts` L60-84
**Confidence:** 95

`ipBuckets[identifier].last = now` resets the window forward on every request. Under sustained load, the window never expires because `now - last > windowMs` is never true. The window should be anchored to the first request, not slid forward.

**Fix:** Rename `last` to `windowStart`, only set it when creating a new bucket — not on every increment.

```typescript
// WRONG: resets window with every request
ipBuckets[identifier].count++;
ipBuckets[identifier].last = now;   // keeps pushing the window forward

// CORRECT: only set windowStart at bucket creation
ipBuckets[identifier].count++;
// do NOT update windowStart here
```

---

## IMPORTANT (address soon)

### I1. Raw `json()` instead of `apiOk()`/`apiError()`

**Files:** `src/routes/api/rm/sample-data/+server.ts`, `src/routes/api/rm/preferred-dsas/+server.ts`
**Confidence:** 90

~21 raw `json()` returns across both files. CLAUDE.md dev rule 10: "Always use `apiOk()` / `apiError()` — no raw `Response` returns."

---

### I2. Hardcoded route strings in RM dashboard

**File:** `src/routes/dashboard/rm/+page.svelte` L142, L330, L399
**Confidence:** 83

Three hardcoded paths (`/dashboard/rm`, `/dashboard/rm/submissions`, `/dashboard/rm/dsa-search`) while `ROUTES` constants are available and partially used in the same file (L347).

---

### I3. `getCoinsFromDB` defined but never called

**File:** `src/routes/+page.svelte` L80-93
**Confidence:** 82

Function is defined but never invoked. Coins will always show 0/stale for authenticated users on the landing page. Needs to be called from `onMount`.

---

### I4. `formatTimeAgo` duplicated in two components

**Files:** `src/lib/components/dashboard/RecentCasesZone.svelte` L51-65, `src/lib/components/dashboard/DSAConnectionsZone.svelte` L51-65
**Confidence:** 80

Byte-for-byte identical. Canonical `formatTimeAgo` exists in `$lib/i18n`.

---

### I5. Billing subscribe non-atomic write

**File:** `src/routes/api/billing/subscribe/+server.ts` L148-175
**Confidence:** 82

Subscription activation (updateOne) and audit record (insertOne) are two separate operations with no transaction. If insertOne fails, subscription activates with no audit trail and broken idempotency on retry. Fix: either wrap in a MongoDB transaction or run insertOne first.

---

### I6. `console.warn` in client store

**File:** `src/lib/stores/applicantDataStore.svelte.ts` L76, L93
**Confidence:** 88

Two bare `console.warn` calls for sessionStorage failures. Violates no-bare-console rule.

---

## No issues found in:

- DSA dashboard home page (correct `secureFetch`, `ROUTES` usage, Svelte 5 runes)
- Server-side load functions (`+page.server.ts` for both dashboards)
- Landing page color system and hero section redesign
- All docs-only commits
- `$effect` cascade reductions and lazy import optimizations (Session 57)
