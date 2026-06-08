# Code Review — 2026-04-26

**Scope**: 3 commits since last review (2026-04-25), covering `761c3bca..0ff1881b`
**Reviewer**: Automated daily review (Claude Code)
**Focus**: Security, bugs, UX issues, codebase alignment

---

## Previous Review Follow-Up

The 2026-04-25 review raised 3 CRITICAL, 5 HIGH, 7 MEDIUM, and 3 LOW findings. Status of the most urgent:

| Finding | Status | Notes |
|---------|--------|-------|
| C-1 — `Math.random()` OTP | **Fixed S92** | `crypto.randomInt()` in `otp/send/+server.ts` |
| C-2 — pmsOtpToken has no expiry | **Open** | HMAC still has no timestamp component |
| C-3 — LLM output stored without Zod validation | **Fixed S92** | `parseJsonResponse<T>` + Pass1–Pass5 Zod schemas |
| H-1 — CRON_SECRET reused as PMS signing key | **Fixed S92** | `PMS_SIGNING_SECRET` env var, 4 call sites updated |
| H-2 — No rate limiting on OTP send/verify | **Fixed S92** | 5/min send, 3/15min verify |
| M-3 — `upsertAdminClauseComment` race condition | **Open** | Still two separate updateOne calls |
| M-4 — `clearApplicationFields` fires before resume modal | **Open** | Not addressed |

---

## Commits Reviewed

| Commit | Description | Risk |
|--------|-------------|------|
| `9ce89664` | **PMS Phase 6** — admin review & approval UI + clause-comment API + submit notifications | MEDIUM |
| `85ac41ae` | Docs: daily code review 2026-04-25 | TRIVIAL |
| `0ff1881b` | Docs: update S87 handoff context | TRIVIAL |

Only `9ce89664` contains code changes (12 files, +1,193 lines). The other two are documentation-only.

---

## Findings

### HIGH

#### H-1: Reject API field name mismatch — every rejection will fail with 400 ✅ Fixed

**Files**: `src/routes/dashboard/admin/policies/pms/[policyId]/+page.svelte:54` vs `src/routes/api/pms/policies/[id]/reject/+server.ts:32-34`

The UI sends `{ note }` but the API expects `{ rejectionNote }`:

```svelte
// +page.svelte:54
body: JSON.stringify({ note })
```

```ts
// reject/+server.ts:32-34
const { rejectionNote, clauseComments } = body.data;
if (!rejectionNote?.trim()) return apiError('rejectionNote is required', 400);
```

Every admin rejection attempt will fail with `400 "rejectionNote is required"`. The feature is non-functional for its reject path.

**Fix**: Change `+page.svelte:54` to `body: JSON.stringify({ rejectionNote: note })`, or change the API to accept `note`.

---

### MEDIUM

#### M-1: Approve/reject notification sent without guarding `reconciliationAssignedTo` ✅ Fixed

**Files**: `src/routes/api/pms/policies/[id]/approve/+server.ts:45-57`, `reject/+server.ts:52-68`

Both endpoints send a notification to `policy.reconciliationAssignedTo` without checking if the field is set:

```ts
await Notifications.insertOne({
    user_id: policy.reconciliationAssignedTo,  // could be undefined
    ...
});
```

If a policy was created before this field was mandatory (or via a code path that doesn't set it), `user_id` will be `undefined`, inserting a notification that no user can see and that pollutes the collection. The reject endpoint has the same pattern at line 53.

**Fix**: Guard with `if (policy.reconciliationAssignedTo)` before the `insertOne` call.

#### M-2: Submit notification projects unused `mobileNumber` field ✅ Fixed

**File**: `src/routes/api/pms/policies/[id]/submit/+server.ts:71`

```ts
const admins = await AdminUsers.find(
    {},
    { projection: { _id: 1, mobileNumber: 1 } }
).toArray();
```

`mobileNumber` is fetched but never used — only `_id` is consumed. This is not a bug but unnecessarily exposes PII in server memory and could become a data-leak surface if logging is added later.

**Fix**: Remove `mobileNumber` from the projection: `{ projection: { _id: 1 } }`.

---

### LOW

#### L-1: No rate limiting on clause-comment endpoint ✅ Fixed

**File**: `src/routes/api/pms/policies/[id]/clause-comment/+server.ts`

The new `clause-comment` POST endpoint has no `rateLimit()` call. The AI pipeline endpoint correctly uses `rateLimit()`. This endpoint is admin-only (guarded by `requireRoleApi(locals, 'admin')`), so risk is minimal, but for consistency with the project's security posture it should be rate-limited.

**Fix**: Add `rateLimit(ip, { maxRequests: 30, windowMs: 60_000, identifier: 'pms_clause_comment' })`.

#### L-2: ReconciliationTab uses `window.location.reload()` after comment save ✅ Fixed

**File**: `src/routes/dashboard/admin/policies/pms/[policyId]/_tabs/ReconciliationTab.svelte:104`

After saving a clause comment, the component calls `window.location.reload()` instead of using SvelteKit's `invalidateAll()`. This causes a full-page reload (losing scroll position, tab state, and any unsaved draft comments on other clauses). Same pattern as L-3 from the previous review (edit page reload).

**Fix**: Use `invalidateAll()` from `$app/navigation` and update the local `adminClauseComments` state reactively.

#### L-3: `actionError` state variable is never written to ✅ Fixed

**File**: `src/routes/dashboard/admin/policies/pms/[policyId]/+page.svelte:15,96-98`

`actionError` is declared as `$state('')` and rendered in the template, but no code path ever sets it. The approve/reject callbacks redirect via `window.location.href` on success, and errors are handled inside the modals' own `errorMessage` state.

**Fix**: Remove the `actionError` declaration and its template rendering, or wire it into the approve/reject error paths.

---

---

### Additional Finding (caught separately, fixed in same session)

#### A-1: Policy upload page uses raw `fetch` — CSRF 403 on submit ✅ Fixed

**File**: `src/routes/dashboard/admin/policies/upload/+page.svelte:88`

`fetch('/api/admin/policies/upload', ...)` omits the CSRF token header. Every upload attempt returns 403 "Invalid CSRF token". Fixed by switching to `secureFetch` from `$lib/utils/csrf.js`. Same pattern as the three S89 regressions.

Additionally, `approve`, `reject`, and `runLegacyCompare` in the policy review page were also using raw `fetch` — all switched to `secureFetch` in the same fix pass.

---

## Positive Observations

1. **Auth guards consistently applied** — all new routes use `requireRole` (page) or `requireRoleApi` (API) correctly. Admin-only actions are properly restricted.
2. **No XSS vectors** — zero `{@html}` usage in any new template. All user-supplied text (comments, notes) rendered via safe text interpolation.
3. **Clean Svelte 5 patterns** — `$state`, `$derived`, `$props` used throughout. No legacy stores or `<svelte:component>`.
4. **Proper API response patterns** — `apiOk()`, `apiError()`, `apiServerError()` used consistently. No raw `Response` objects.
5. **Good separation of concerns** — `_tabs/` subdirectory cleanly separates tab components and modals from the main page.
6. **Proper serialization** — `serializeReviewPolicy()` carefully converts all `Date` objects to ISO strings for client transfer.

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| HIGH | 1 | Field name mismatch breaks reject flow entirely |
| MEDIUM | 2 | Missing null guard on notification recipient, unused PII in projection |
| LOW | 3 | Missing rate limit, full-page reload, dead state variable |

Phase 6 is architecturally sound — auth, XSS protection, and API patterns are all correct. The one HIGH finding (H-1: `note` vs `rejectionNote` mismatch) is a straightforward field name bug that makes the reject path non-functional. Should be a one-line fix.

**Priority**: Fix H-1 immediately (reject is broken). M-1 and M-2 should be addressed before the feature is used in production.

The CRITICAL and HIGH findings from the 2026-04-25 review (OTP hardening, key separation, LLM validation) remain open and should be prioritized before any production use of the PMS feature.
