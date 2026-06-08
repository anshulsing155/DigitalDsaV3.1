# Daily Code Review — 2026-04-25

**Scope:** All commits since 2026-04-20 (sessions S88–S93), focusing on teammate commits + security/correctness of new PMS features.

**Commits reviewed:** 30 commits (28 by Prashant/Claude, 2 by teammates)

---

## Teammate Commits

### `45073182` — alokRajEyantrik: showWhen simplification for q2_societyStatus (LAP)

**Verdict: BEHAVIORAL REGRESSION + code quality issue**

The commit removes the `categoryOfProperty` filter from `q2_societyStatus` showWhen in `src/lib/config/lapLoan/questionBank/propertyLocation.ts`.

**Before:**
```json
{ "and": [
  { "==": [{ "var": "propertyAreaType" }, "PLANNED_AUTHORITY"] },
  { "or": [
    { "in": [{ "var": "categoryOfProperty" }, ["Residential", "Mixed"]] },
    { "==": [{ "var": "categoryOfProperty" }, ""] }
  ]}
]}
```

**After:**
```json
{ "==": [{ "var": "propertyAreaType" }, "PLANNED_AUTHORITY"] }
```

**Impact:** Society status question now shows for **all** property categories (including Commercial and Industrial) in LAP. The original logic intentionally hid it for Commercial/Industrial properties — asking about housing society status for an industrial warehouse is irrelevant and confusing for DSAs. While the question is on an earlier page than `categoryOfProperty` (so it's always visible on first visit), users who navigate back after setting category to Commercial would previously see it hidden. This behavioral change may be intentional but lacks explanation.

**Code quality:** Extra blank lines and inconsistent indentation in the showWhen block.

**Action needed:** Verify with alokRaj whether Commercial/Industrial LAP properties should show society status. If intentional, clean up formatting and update the test journey comment at `src/lib/testing/journeys/lapLoan.ts:331`.

---

### `db391a99` — E YANTRIK: "Update app.css — just for redeploy"

Removed one blank line in `src/app.css`. Harmless. No issues.

---

## Critical Security Findings

### 1. PMS OTP token has no expiry — indefinitely replayable

**Files:** `src/routes/api/pms/otp/verify/+server.ts`, `src/lib/server/guards.ts:386–400`

The `pmsOtpToken` is HMAC over `rmUserId:lenderId:policyId:draftHash` with no timestamp or nonce. Once issued, it's valid until `draftHash` changes. For the onboard endpoint, `policyId` and `draftHash` are both empty strings — making that token **permanently valid**. If captured (browser storage, network log, compromised client), it can be replayed without time bound.

**Fix:** Embed a UTC timestamp window in the HMAC payload: `${rmUserId}:${lenderId}:${policyId}:${draftHash}:${Math.floor(Date.now() / (15 * 60 * 1000))}`. Accept current + previous window slot for clock skew tolerance.

---

### 2. Impersonation cookie shares signing key with externally-exposed CRON_SECRET

**File:** `src/lib/server/adminImpersonation.ts:17`

`signingKey()` falls back to `CRON_SECRET` when `PMS_SIGNING_SECRET` is unset. `CRON_SECRET` is sent as a bearer token in `Authorization` headers from external cron schedulers. If an attacker intercepts a cron request, they can forge valid impersonation cookies and gain full RM impersonation without admin credentials.

This is the S88 hardening item #1 — the impersonation feature makes it newly exploitable for privilege escalation.

**Fix:** Require `PMS_SIGNING_SECRET` explicitly with a startup guard. Do not fall back to `CRON_SECRET`.

---

### 3. Missing Zod validation in PMS-to-Engine adapter — silent NaN propagation

**File:** `src/lib/server/pms/pmsToEngineAdapter.ts:11, 773`

The file header promises: _"Output is Zod-validated before returning to catch schema drift early (see `validateAdapterOutput` below)."_ This function does not exist. No runtime validation occurs. A malformed PMS section (`foir.salaried` stored as string `"50"` instead of number) produces `NaN` from the `/ 100` division, which propagates silently into `offeredAmount` and `emi`. The comparison `offeredAmount < requestedAmount` returns `false` when `offeredAmount` is `NaN`, so the lender gets assigned **green** instead of grey — a **wrong loan eligibility decision**.

**Fix:** Implement the promised Zod validation before the `return doc`, or at minimum add `typeof === 'number'` guards on all numeric section fields.

---

## High-Priority Findings

### 4. IP-only rate limit on OTP verify — bypassable by IP rotation

**File:** `src/routes/api/pms/otp/verify/+server.ts:50–52`

Rate limit is `pms_otp_verify:${ip}` — 3 attempts per 15 min per IP. An attacker with multiple IPs can brute-force the 6-digit OTP (10^6 values). The per-email `otpStore` backstop (5 attempts) only kicks in after 5 attempts across all IPs — functionally no rate limit on the OTP itself.

**Fix:** Add a per-email rate limit bucket: `pms_otp_verify_email:${bankEmail}`, 3 attempts per 15 min.

### 5. `timingSafeEqual` throws on wrong-length signature in adminImpersonation

**File:** `src/lib/server/adminImpersonation.ts:38`

`crypto.timingSafeEqual` throws `RangeError` when buffer lengths differ. The `try/catch` catches it (returns `null`), but this is a fragile pattern. Compare with the correct pattern in `guards.ts:395` which checks lengths first.

**Fix:** Add `if (sigBuf.length !== expectedBuf.length) return null;` before `timingSafeEqual`.

### 6. Impersonate exit endpoint has no auth guard

**File:** `src/routes/api/admin/impersonate/exit/+server.ts`

No `requireAuthApi` or `requireRoleApi` call. Violates CLAUDE.md rule: "Always use guards for auth/permission checks in API routes." While it only deletes a cookie (low blast radius), any unauthenticated caller can invoke it.

**Fix:** Add `const denied = requireAuthApi(locals); if (denied) return denied;`

### 7. Unsafe `as number` cast on override effect value

**File:** `src/lib/server/pms/pmsToEngineAdapter.ts:662`

`override.effect.value as number` is a compile-time-only assertion. If an RM submits a string value for ROI, the engine's `extractParameters` silently ignores it — an override intended to lower ROI from 12% to 10% has no effect with no indication to the DSA.

**Fix:** Guard `typeof effect.value !== 'number'` before injection, log a warning.

### 8. `ask_rm` resolution stored as unlisted TypeScript union value

**File:** `src/routes/api/pms/policies/[id]/legacy-resolve/+server.ts:119–124`

The `LegacyDiscrepancy.resolution` union is `'pms_wins' | 'legacy_wins_pending_rm' | 'pending'`. The `ask_rm` decision is stored verbatim as `'ask_rm'` — not in the union. The `as` cast lies to TypeScript. Any exhaustive switch downstream will fail silently.

**Fix:** Add `'ask_rm'` to the union in `policyTypes.ts`.

### 9. QA runner has no rate limit

**File:** `src/routes/api/pms/policies/[id]/qa-run/+server.ts`

Admin-only but no server-side rate limit. Rapid clicks or automated callers can stack concurrent 2–5s Vercel invocations (296 profiles × `evaluateLender()` per run).

**Fix:** Add `checkRateLimit('pms_qa_run_' + locals.user!.id, 2, 60)`.

---

## Medium-Priority Findings

### 10. CIBIL floor applied twice for PMS docs — GREY instead of RED

**Files:** `evaluationEngine.ts:692–698` and `pmsToEngineAdapter.ts:114–130`

PMS docs get both a `hard_gate` rule in `sections.cibil` AND the `cibil_floor` synthetic gate. The synthetic gate runs first and returns GREY (not RED), preventing deviation recovery. A co-applicant with low CIBIL who should get AMBER (deviation exists) gets GREY instead.

### 11. In-memory rate limiter cleanup < OTP verify window

**File:** `src/lib/server/rateLimiter.ts`

`MAX_WINDOW_MS = 10 min` but OTP verify uses `windowMs: 15 min`. Under Redis fallback, the verify rate limit silently resets at ~10 min.

### 12. Partial-resolve creates duplicate PendingChange records

**File:** `src/routes/api/pms/policies/[id]/legacy-resolve/+server.ts:162–179`

No deduplication on `$push: { $each: [...] }` — submitting the same field in two partial calls creates duplicate entries.

### 13. JSON-Logic override conditions injected without depth/structure validation

**File:** `pmsToEngineAdapter.ts:660`, `evaluationEngine.ts:446–469`

`override.condition` from MongoDB is passed verbatim to `jsonLogic.apply()`. No depth limit, no operator allowlist, no check that `var` paths reference known payload keys. A condition like `{ "var": "loanTransaction" }` returns the entire object (always truthy), firing the override unconditionally.

### 14. `console.error` rule violations (2 locations)

- `src/lib/ruleEngine/evaluationEngine.ts:182` — remove bare `console.error` (logger.error follows on next line)
- `src/lib/server/pms/legacyCompare.ts:312` — remove bare `console.error` (logger.warn already present)

### 15. `locals.isSuperAdmin` set during impersonation — fragile pattern

**File:** `src/hooks.server.ts:352`

During impersonation, `locals.isSuperAdmin = true` is set alongside `locals.user.role = 'rm'`. Any future code that checks `isSuperAdmin` without first checking role will bypass admin-only restrictions for the impersonated session. Currently safe because `requireRoleApi` gates all admin endpoints, but the pattern is fragile.

### 16. `(rm as any)` casts in RM management page

**File:** `src/routes/dashboard/admin/rm-management/+page.server.ts:55–58`

Four `(rm as any)` casts for `city`, `state`, `lastActiveAt`, `createdAt`. These fields should be added to the RM type definition instead.

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| Critical | 3 | OTP token replay, impersonation key sharing, silent wrong-answer NaN path |
| High | 6 | Rate limit bypass, auth guards, type safety |
| Medium | 7 | Duplicate CIBIL check, dedup, console rules, fragile patterns |
| Teammate | 1 | showWhen behavioral regression (alokRaj) |

**Top 3 actions for next session:**
1. Add timestamp window to PMS OTP token payload (Critical #1)
2. Require `PMS_SIGNING_SECRET` — remove `CRON_SECRET` fallback in impersonation (Critical #2)
3. Implement adapter output Zod validation or numeric guards (Critical #3)

---

## Automated Health Check — 2026-04-25 18:47:35

**HEAD**: `71477192 feat(results): affordability overview banner for secured loans (no property yet)` | **Branch**: main | **Unstaged**: 3 files

| Check | Result |
|-------|--------|
| **Type Check** | 0 errors, 36 warnings |
| **Unit Tests** | 10164 passed, 0 failed (1505 files) |
| **Selector Health** | 2 failed, 1 passed |
| **Accessibility Diff** | NO CHANGES (2 pages scanned) |

### Static Pattern Guards
✅ Broken SSR window guard (Pitfall #9)
✅ Raw window.location in template/module scope

### Accessibility Diff Detail

```
UI Accessibility Diff Report — 2026-04-25T13:17:34.757Z
════════════════════════════════════════════════════════════
Pages scanned: 2
Pages with changes: 0
Total: +0 added, -0 removed, ~0 changed

✓ how-can-we-help — no changes (28 nodes)
✓ home-loan-page0 — no changes (47 nodes)
```

---

## Automated Health Check — 2026-04-25 18:47:36

**HEAD**: `71477192 feat(results): affordability overview banner for secured loans (no property yet)` | **Branch**: main | **Unstaged**: 4 files

| Check | Result |
|-------|--------|
| **Type Check** | FAILED — > ENOENT: no such file or directory, stat 'F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\.svelte-kit\types\ |
| **Unit Tests** | 10164 passed, 0 failed (1505 files) |
| **Selector Health** | 2 failed, 1 passed |
| **Accessibility Diff** | NO CHANGES (2 pages scanned) |

### Static Pattern Guards
✅ Broken SSR window guard (Pitfall #9)
✅ Raw window.location in template/module scope

### Accessibility Diff Detail

```
UI Accessibility Diff Report — 2026-04-25T13:17:34.757Z
════════════════════════════════════════════════════════════
Pages scanned: 2
Pages with changes: 0
Total: +0 added, -0 removed, ~0 changed

✓ how-can-we-help — no changes (28 nodes)
✓ home-loan-page0 — no changes (47 nodes)
```

---

## Automated Health Check — 2026-04-25 18:50:13

**HEAD**: `71477192 feat(results): affordability overview banner for secured loans (no property yet)` | **Branch**: main | **Unstaged**: 4 files

| Check | Result |
|-------|--------|
| **Type Check** | 0 errors, 36 warnings |
| **Unit Tests** | 10164 passed, 0 failed (1505 files) |
| **Selector Health** | ALL SELECTORS HEALTHY |
| **Accessibility Diff** | NO CHANGES (2 pages scanned) |

### Static Pattern Guards
✅ Broken SSR window guard (Pitfall #9)
✅ Raw window.location in template/module scope

### Accessibility Diff Detail

```
UI Accessibility Diff Report — 2026-04-25T13:20:11.431Z
════════════════════════════════════════════════════════════
Pages scanned: 2
Pages with changes: 0
Total: +0 added, -0 removed, ~0 changed

✓ how-can-we-help — no changes (28 nodes)
✓ home-loan-page0 — no changes (47 nodes)
```
