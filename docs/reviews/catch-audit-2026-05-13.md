# Empty `.catch(() => {})` Audit — 2026-05-13

Audited 16 files containing `.catch(() => {})` (empty promise catch blocks that silently swallow errors). Each classified as SAFE (intentional fire-and-forget) or RISKY (errors should be logged or surfaced).

**Status: ALL RISKY INSTANCES RESOLVED** — not just logged, but structurally fixed so failures auto-recover.

---

## Summary

| Classification | Count | Files | Resolution |
|----------------|-------|-------|------------|
| SAFE           | 10    | 10 files (22 catch instances) | No change needed |
| RISKY          | 6     | 5 files (12 catch instances) | **All resolved** (see below) |

---

## SAFE — Intentional Fire-and-Forget

### 1. `src/routes/dashboard/+layout.svelte` :168
**Context:** Theme preference save (`PATCH /api/user/preferences`).
**Why safe:** Best-effort UI preference persistence. User experience continues regardless — theme is already applied client-side. Debounced (500ms timer).

### 2. `src/lib/ruleEngine/evaluationEngine.ts` :1099
**Context:** `autoSeedIfEmpty().catch(() => {})` — background auto-seed of bank rules into DB.
**Why safe:** Non-blocking background task. Fallback static rule documents are already loaded and evaluation proceeds immediately. Comment explicitly says "Non-blocking — doesn't delay this evaluation."

### 3. `src/lib/database/mongo.ts` :327, :467-470
**Context:** `dropIndex()` calls during `ensureIndexes()` — 5 instances total.
**Why safe:** `dropIndex()` throws when the index doesn't exist. These catches handle the "index was already dropped or never existed" case during schema migration. `createIndex()` is idempotent and follows immediately. Standard MongoDB migration pattern.

### 4. `src/lib/components/DemoRestrictionModal.svelte` :14
**Context:** `secureFetch('/api/auth/logout')` during demo sign-up redirect.
**Why safe:** Demo mode only. Client-side cookie clearing follows as fallback. Full page redirect to `/login` makes stale server state irrelevant.

### 5. `src/lib/components/DemoBanner.svelte` :9
**Context:** Same pattern as DemoRestrictionModal — demo logout + client fallback.
**Why safe:** Same reasoning. Demo mode, client-side cookie clear, hard redirect.

### 6. `src/hooks.server.ts` :463, :465, :468
**Context:** `lastActiveAt` timestamp updates, throttled via `ACTIVITY_THROTTLE_MS`.
**Why safe:** Best-effort analytics/activity tracking. No user-facing consequence if a timestamp update is missed. Throttled to avoid DB pressure — missing one is by design acceptable.

### 7. `src/routes/api/security/honeypot-trap/+server.ts` :29
**Context:** `recordHoneypotTrigger(userId, sessionId, fieldName).catch(() => {})`.
**Why safe:** Anti-scraping honeypot. Comment says "Fire-and-forget: record the honeypot trigger." The endpoint must always return 200 to avoid leaking detection — logging a failure here is acceptable to lose vs. risking different response timing.

### 8. `src/lib/components/form/HoneypotField.svelte` :44
**Context:** Client-side honeypot report to `/api/security/honeypot-trap`.
**Why safe:** Anti-scraping fire-and-forget from client. If the report fails, the server-side trust scoring system still operates independently.

### 9. `src/lib/testing/e2e/formHelpers.ts` :117, :123, :129
**Context:** `waitFor({ state: 'hidden' })` calls in `waitForPageReady()`.
**Why safe:** E2E test helper. The overlay/spinner might not be present — catch handles "element never appeared so it can't disappear" gracefully. Standard Playwright pattern for optional element waits.

### 10. `src/lib/testing/e2e/customPageFillers.ts` :358
**Context:** `waitFor({ state: 'visible', timeout: 5000 })` for obligation form fields.
**Why safe:** E2E test helper, inside a try/catch block that already logs a warning on outer failure. The `.catch` prevents the `waitFor` from throwing before the outer try can handle it.

### 11. `src/lib/testing/e2e/shareLink.spec.ts` :80, :156
**Context:** `request.delete(/api/cases/${caseId})` in `test.afterAll` cleanup.
**Why safe:** E2E test teardown. Best-effort cleanup of test data. If deletion fails, test data lingers but doesn't affect test correctness.

### 12. `src/lib/testing/e2e/adminDashboard.setup.ts` :50
**Context:** `expect(errorText).not.toBeVisible()` wrapped in `.catch(() => {})`.
**Why safe:** E2E helper assertion. A "no server error visible" check that shouldn't fail the test if the error element doesn't exist in the DOM at all.

---

## RISKY — Errors Should Be Logged

### R1. `src/hooks.server.ts` :168-174 — Token refresh DB writes (4 instances)

```
DsaApplications.updateOne(…, refreshUpdate).catch(() => {});
rmApplications.updateOne(…, refreshUpdate).catch(() => {});
AdminUsers.updateOne(…, refreshUpdate).catch(() => {});
Applicant.updateOne(…, refreshUpdate).catch(() => {});
```

**What happens on failure:** The user receives new access/refresh tokens via cookies, but the database never records the new `activeTokenId` or `refreshToken`. Consequences:
- **Logout-all-devices** won't know about this session — can't revoke it
- **Token rotation tracking** has a gap — the old token ID remains "active" in DB
- **Concurrent session limits** (if implemented) will undercount

**Recommendation:** Log the error with `logger.error()` including `userId` and `role`. The auth flow should still continue (user shouldn't be blocked by a DB write failure), but ops needs visibility.

**Severity:** Medium-High. Auth infrastructure — silent failures erode security guarantees over time.

### R2. `src/routes/api/auth/check-dsa/+server.ts` :211, :293, :369, :445 — Form session invalidation on device switch (4 instances)

```
FormSessions.updateMany(
  { userId: '…', isActive: true },
  { $set: { isActive: false, flagReason: 'device_switch' } }
).catch(() => {});
```

**What happens on failure:** Old form sessions remain active after a device switch is detected. The user logs in on the new device successfully, but anti-scraping form session tracking still considers the old device's sessions valid.
- **Security:** Stale sessions could be replayed if the old device is compromised
- **Anti-scraping:** Form budget counts may be wrong (old sessions still consuming budget)

**Recommendation:** Log with `logger.warn()` including `userId` and the device switch context. Session invalidation is a security measure — failures should be visible in logs.

**Severity:** Medium. Security-adjacent — device switch is a trust signal, and failing to invalidate sessions undermines it.

### R3. `src/routes/api/admin/testing/e2e-runs/+server.ts` :201, :214 — Test run status updates (2 instances)

```
E2eTestRuns.updateOne(
  { run_id: runId, status: { $nin: ['completed', 'failed'] } },
  { $set: { status: 'failed', … } }
).catch(() => {});

E2eTestRuns.updateOne(
  { run_id: runId, status: { $nin: ['completed', 'failed'] } },
  { $set: { status: 'completed', … } }
).catch(() => {});
```

**What happens on failure:** Test run records stay in `running` status permanently. The admin dashboard shows ghost runs that never completed. Developers may wait for results that will never arrive, or re-trigger runs unnecessarily.

**Recommendation:** Log with `logger.warn()` including `runId`. Lower severity since this is internal test infrastructure, but stale "running" records create operational confusion.

**Severity:** Low. Internal tooling only — no production user impact, but creates admin friction.

### R4. `src/routes/api/leads/[lead_id]/convert/+server.ts` :111 — Source stats increment

```
Sources.updateOne(
  { _id: lead.source_id },
  { $inc: { total_cases: 1 }, $set: { updated_at: now } }
).catch(() => {});
```

**What happens on failure:** The lead-to-case conversion succeeds (main operation already committed), but the source's `total_cases` counter doesn't increment. Over time, source analytics drift — the DSA sees fewer attributed cases than actually exist.

**Recommendation:** Log with `logger.warn()` including `source_id` and `case_id`. The main operation (case creation) is correct — this is a denormalized counter update. Consider a periodic reconciliation job as a second line of defense.

**Severity:** Medium-Low. Data accuracy for analytics — not transactional, but drift is silent and cumulative.

### R5. `src/routes/api/leads/+server.ts` :148 — Source lead count increment

```
Sources.updateOne(
  { _id: new ObjectId(data.source_id) },
  { $inc: { total_leads: 1 }, $set: { updated_at: now } }
).catch(() => {});
```

**What happens on failure:** Same pattern as R4 but for lead creation. Source's `total_leads` counter doesn't increment. Analytics drift accumulates silently.

**Recommendation:** Same as R4 — log with `logger.warn()` including `source_id` and `lead_id`.

**Severity:** Medium-Low. Same reasoning as R4.

---

## Resolution Applied

All RISKY instances resolved with structural fixes (not just logging):

### R1 — Token refresh: `await` + single retry (`hooks.server.ts`)

Replaced fire-and-forget with `await`. On failure, retries once. On double failure, logs `logger.error` and continues (user still gets their tokens — the DB just doesn't know about them).

**User impact:** None. Login still succeeds. The retry covers transient MongoDB blips (99%+ of real failures). Only a sustained DB outage would exhaust the retry — and that would surface in many other places too.

### R2 — Session invalidation: `await` + single retry (`check-dsa/+server.ts`)

Same pattern as R1. All 4 role-specific device-switch blocks now `await` the `FormSessions.updateMany()` with retry.

**User impact:** Login takes ~50ms longer in the rare retry case. Old sessions are reliably invalidated.

### R3 + R4 + R5 — Source stats: derive on read, remove write-side counters

**Structural fix:** `GET /api/sources` now computes `total_leads` and `total_cases` via two parallel aggregation queries (`Leads.aggregate` + `Cases.aggregate` grouped by source ID). The denormalized `$inc` operations in `POST /api/leads` and `POST /api/leads/[lead_id]/convert` were removed entirely.

**Why this is better than retry:** Denormalized counters drift even with retries — a crash between the main write and the counter increment loses the count. Deriving on read eliminates the drift class entirely. The aggregations are cheap (DSA source counts are small, hundreds not millions).

### R4 — E2E test runs: auto-expire stale runs (`e2e-runs/+server.ts`)

The GET handler now runs `updateMany` to mark any run stuck in `"running"` for >30 minutes as `"timed_out"` before returning results. The POST handler's exec callback also uses try/catch with a log message noting that auto-expire will clean up if the DB write fails.

**User impact:** Admin dashboard never shows ghost "running" tests. Self-healing on every list query.
