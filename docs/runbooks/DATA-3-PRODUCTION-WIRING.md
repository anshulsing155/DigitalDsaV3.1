# DATA-3 — Production Wiring Runbook

**Audience**: ops (the person turning the feature on in production).
**Effort**: 30 minutes to wire + 48 hours to monitor before fully relying.
**Risk**: low. Feature is gated off by default; turning it on is a single env-var flip and a cron schedule. Rolling back is faster than rolling forward — unset the flag and deletions stop within one sweep cycle.

This runbook assumes the DATA-3 code is already deployed to production (commit `b8eb0b04` and forward). The runbook covers the **platform-side configuration** (Vercel env vars + cron) and the **observation window** before fully enabling.

---

## 1. What you're turning on

A daily sweep (`POST /api/cron/data3-sweep`) that:

1. Finds documents in `cases.lender_applications[*].document_checklist[*]` with `extraction_status === 'verified'` AND whose retention floor (30–365 days depending on document type) has elapsed.
2. For each match, calls ImageKit to delete the underlying file, writes an audit row to `ArtifactDeletionLog`, and `$unset`s the file URL + ID from the case document (keeping the extracted fields intact).
3. Logs aggregate counters (candidates / deleted / skipped / abandoned / errors) to the structured logger.

The sweep refuses to call ImageKit unless the env flag `DATA3_DELETION_ENABLED` is the literal string `'true'`. Without the flag, the sweep still runs but only counts candidates — useful for confirming the cron + auth + query plumbing without any destructive operations.

Spec: [`docs/specs/DATA-3-FILE-DELETION-SPEC.md`](../specs/DATA-3-FILE-DELETION-SPEC.md). Sequencing decision: [ADR-0006](../adr/0006-data-segregation-and-sequencing.md).

---

## 2. Pre-flight checks

Before touching anything in Vercel, confirm:

- [ ] **`CRON_SECRET` is set in production env.** Other cron endpoints depend on it; if it's already working for `/api/pms/cron/publish-scheduled`, you're fine. Verify by:
  ```bash
  curl -X POST https://<prod-domain>/api/pms/cron/publish-scheduled \
    -H "x-cron-secret: <secret>"
  # → expect 200 with { promoted: 0 } or similar; 401 means CRON_SECRET is wrong
  ```
- [ ] **`IMAGEKIT_PRIVATE_KEY` is set.** The deletion call needs it (same key used for uploads). Already required, so this should be a yes — but verify the value matches the ImageKit account whose files you want to delete.
- [ ] **MongoDB Atlas connection is healthy.** The sweep writes to `ArtifactDeletionLog` and updates `cases`. Atlas connection is already required for the app to run; if the app is up, this is fine.
- [ ] **DATA-3 collections exist.** They auto-create on the next Mongo write attempt — no manual creation needed. But the indexes are ensured at app startup via `ensureIndexes()` in [`src/lib/database/mongo.ts`](../../src/lib/database/mongo.ts). After the first deploy of the DATA-3 code, check the Atlas dashboard for these collections:
  - `artifactDeletionLogs` (will be empty until the first deletion attempt)
  - `documentRetentionOverrides` (will be empty until the first DSA opt-out)

---

## 3. Phase A — Dark launch (observation only)

**Goal:** confirm the cron fires, auth works, and the sweep query returns sensible results. No deletions happen in this phase.

### A.1 Configure the cron in Vercel

Vercel crons are configured in the project dashboard, NOT in `vercel.json` for this repo (project convention — see [`docs/specs/ENV-VARIABLES.md`](../specs/ENV-VARIABLES.md) and existing cron endpoints).

1. Open the Vercel dashboard → the production project → **Settings → Cron Jobs**.
2. Click **Add cron**.
3. Fields:
   - **Path**: `/api/cron/data3-sweep`
   - **Schedule**: `0 3 * * *` (daily at 03:00 UTC). Adjust if your traffic pattern needs a different quiet window.
   - **Region**: same as the function regions for the rest of the app.
4. Save.

### A.2 Confirm the cron has auth

The endpoint requires the `x-cron-secret` header. Vercel's cron invocation sets `Authorization: Bearer <CRON_SECRET>` by default — but our endpoint reads the `x-cron-secret` header, not `Authorization`. Two options:

- **Option 1 (recommended)**: Vercel's cron headers are configurable per-project. In the cron config, set a custom header `x-cron-secret` with the value of `$CRON_SECRET`. Vercel will substitute the env var at invocation time.
- **Option 2**: Add an `Authorization` header read to the route as a fallback. NOT recommended — keeps the deploy clean by sticking to one header convention.

### A.3 Verify the cron fires

After 24 hours, check Vercel function logs for `/api/cron/data3-sweep`. Expected output (observation mode):

```
[INFO] DATA-3 sweep: deletion disabled, observation-only run { enabledFlag: 'unset' }
```

If you see `401 Unauthorized` in the logs, the `x-cron-secret` header isn't being set correctly — go back to A.2.

You can also trigger the cron manually for a faster feedback loop:

```bash
curl -X POST https://<prod-domain>/api/cron/data3-sweep \
  -H "x-cron-secret: <secret>" \
  -H "Content-Type: application/json"
```

Expected response (observation mode):
```json
{
  "success": true,
  "data": {
    "enabled": false,
    "candidates": 0,
    "deleted": 0,
    "already_deleted": 0,
    "skipped_gate": 0,
    "skipped_override": 0,
    "abandoned": 0,
    "errors": 0
  }
}
```

`candidates: 0` is expected at this stage — the Gemini extraction pipeline that transitions documents to `extraction_status === 'verified'` is not yet wired (per S104 roadmap). DATA-3 will report zero candidates until extraction goes live. **This is the correct dormant state.**

### A.4 Watch for 24 hours

Confirm the cron fires automatically (Vercel logs should show one invocation per day at the scheduled time). If the log line appears with no errors, the dark-launch is healthy and you can proceed.

If `candidates` jumps from 0 to a non-zero number, that means the Gemini extraction pipeline just landed. The sweep would still NOT delete anything because the flag is off — but you should pause and re-read the spec §5 verify gate before flipping the flag, because the sweep is now operating on real data.

---

## 4. Phase B — Enable deletions

**Goal:** flip the flag, let the sweep run for one or two cycles, monitor outcomes.

**Pre-requisite:** Phase A has shown clean observation-only runs for at least 24 hours.

### B.1 Set the env var

In the Vercel dashboard → **Settings → Environment Variables**:

- **Name**: `DATA3_DELETION_ENABLED`
- **Value**: `true` (literal string, all lowercase, no quotes).
- **Environment**: Production only (do not propagate to Preview / Development unless you have a specific reason).

Save. Vercel will redeploy the production deployment with the new var (or you can manually redeploy).

### B.2 Manually trigger the first run

Rather than wait until 03:00 UTC, manually invoke once to confirm behavior:

```bash
curl -X POST https://<prod-domain>/api/cron/data3-sweep \
  -H "x-cron-secret: <secret>"
```

Expected response shape:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "candidates": <n>,
    "deleted": <n>,
    "already_deleted": <n>,
    "skipped_gate": <n>,
    "skipped_override": <n>,
    "abandoned": <n>,
    "errors": <n>
  }
}
```

### B.3 What "healthy" looks like

In Vercel function logs after a real run:

```
[INFO] DATA-3 sweep: candidates collected { candidates: 7, batchLimit: 500 }
[INFO] DATA-3 sweep: complete { enabled: true, candidates: 7, deleted: 5, already_deleted: 1, skipped_gate: 1, skipped_override: 0, abandoned: 0, errors: 0 }
```

Cross-check against `ArtifactDeletionLog` in Atlas:

```js
// In Atlas data explorer
db.artifactDeletionLogs.find({}).sort({ started_at: -1 }).limit(10)
```

Each `deleted` and `already_deleted` from the sweep result should correspond to exactly one row with `status: 'success'`. Each `abandoned` should correspond to a row with `status: 'failed'` and an `error_code` like `IMAGEKIT_401` or `IMAGEKIT_5XX`.

Cross-check against the affected cases:

```js
db.cases.findOne(
  { case_id: "<one of the case_ids from the audit log>" },
  { "lender_applications.document_checklist": 1 }
)
```

The checklist item should have:
- `extraction_status: 'deleted'`
- `deleted_at: <recent date>`
- `upload.file_url` removed (or undefined)
- `upload.file_id` removed (or undefined)
- `upload.file_size`, `upload.file_type`, `upload.uploaded_at` STILL PRESENT (we keep metadata; we drop the URL + ID)
- `extracted_fields` STILL PRESENT (the structured fields are what we kept; they're why we could delete the original safely)

### B.4 What "unhealthy" looks like and what to do

| Symptom | Likely cause | Action |
|---|---|---|
| `errors > 0` | Audit row insert failed (Mongo issue) or unhandled exception | Check function logs for the actual error. ImageKit was NOT called for rows where the audit insert failed — that's the audit-log-first guarantee. Safe to investigate. |
| `abandoned > 0` and the audit shows `IMAGEKIT_401` | Bad / expired ImageKit credentials | Rotate `IMAGEKIT_PRIVATE_KEY`. Affected rows are in `deletion_abandoned` state — re-eligible after manual ops intervention (flip them back to `verified` in Mongo, or wait for the next sweep cycle to retry... actually they won't retry; abandoned is terminal). |
| `abandoned > 0` and the audit shows `IMAGEKIT_5XX` after multiple retries | ImageKit outage during the sweep window | Wait for ImageKit to recover. Flip the abandoned rows back to `verified` in Mongo if you want them re-attempted: `db.cases.updateOne({ case_id, "lender_applications.$[la].document_checklist.$[dc].doc_id": "<doc_id>" }, { $set: { "lender_applications.$[la].document_checklist.$[dc].extraction_status": "verified" } }, { arrayFilters: [...] })`. |
| `skipped_gate` is consistently high | Cases unlocking / billing race | Expected if your fleet has churn between lock and sweep. If unexpected, audit which gates are failing — see `verifyGate.ts` for the per-gate reason strings. |
| Vercel cron didn't fire at the scheduled time | Cron config issue | Re-check the schedule string, re-verify the `x-cron-secret` header. Re-trigger manually to confirm the endpoint still works. |
| `deleted` > 0 but Atlas case doc unchanged | Bug in the sweep's `$unset` arrayFilter | Hold the flag OFF, escalate to dev. Check the `cases.updateOne` arrayFilters logic in [`sweepJob.ts`](../../src/lib/server/data3/sweepJob.ts). |

### B.5 Roll back if needed

If anything looks wrong, **unset `DATA3_DELETION_ENABLED`** (or set to anything other than `'true'`) in the Vercel dashboard. The sweep will revert to observation-only on the next invocation. Any deletions already committed are not recoverable — but the audit trail in `ArtifactDeletionLog` is exhaustive.

---

## 5. Phase C — 48-hour monitoring

After Phase B, watch for 48 hours:

- [ ] Day 1, post-flag-flip — manually trigger once + watch logs. Check audit rows.
- [ ] Day 2 — let the daily cron fire on schedule. Confirm logs look the same shape.
- [ ] Day 3 — sample a few `deleted` rows and verify the case documents in Atlas look correct (extracted_fields preserved, file_url + file_id gone).

If all three checks pass, DATA-3 is operational. Future operations:

- New documents will flow through the lifecycle automatically once Gemini extraction lands and starts transitioning rows to `verified`.
- Retention overrides (DSA "do not auto-delete" tags) write to `documentRetentionOverrides` and the sweep respects them — auto-expire 365 days after creation.
- Audit log retention is **7 years** per spec §7 — no TTL index. Plan accordingly for Atlas storage.

---

## 6. Operational considerations

### Quotas

- ImageKit deletion does NOT count against the upload quota. Free tier supports the volumes we're at; no concern there.
- MongoDB writes per sweep are bounded by `batchLimit` (default 500). At full saturation that's 500 `$unset` + 500 audit inserts + 500 audit updates = 1500 ops per sweep. Atlas M10+ handles this trivially.

### Volume estimation

To estimate how many candidates you'll see once extraction is live:

```js
db.cases.aggregate([
  { $unwind: "$lender_applications" },
  { $unwind: "$lender_applications.document_checklist" },
  {
    $match: {
      "lender_applications.document_checklist.upload.file_id": { $exists: true }
    }
  },
  { $count: "total_files_in_imagekit" }
])
```

Files older than 30 days that have extracted_fields populated AND verified_at set are the deletion candidates. The first sweep after extraction-pipeline-launch will likely process a backlog — keep `batchLimit` at 500 and let it drain over multiple days.

### Customer DPDP requests

DPDP §13 grants data principals the right to request erasure. The DATA-3 sweep is automatic; manual erasure for a specific customer is a separate flow (not built yet — future work). If you receive a DPDP request before that flow ships, manual deletion is:

```js
// 1. List affected files for the customer
db.cases.find({ "applicants.mobileNumber": "<customer-mobile>" }, { case_id: 1, "lender_applications.document_checklist.upload": 1 })

// 2. For each file_id, call imagekit.files.delete() (e.g. via the admin tools)

// 3. Write an audit row marking actor: 'admin', reason: 'admin_force_delete'

// 4. $unset the case doc upload fields
```

Plan to ship a customer-erasure flow before relying on manual DPDP handling at volume.

---

## 7. Quick reference

| Action | Command / step |
|---|---|
| Enable in prod | Set `DATA3_DELETION_ENABLED='true'` in Vercel env |
| Disable in prod | Unset or change `DATA3_DELETION_ENABLED` |
| Manual trigger | `curl -X POST https://<host>/api/cron/data3-sweep -H "x-cron-secret: <secret>"` |
| Audit row query | `db.artifactDeletionLogs.find({}).sort({ started_at: -1 })` |
| Retention override (DSA opt-out) | `db.documentRetentionOverrides.insertOne({ case_id, document_checklist_id, reason, tagged_at, tagged_by_dsa_id, last_renewed_at: now, expires_at: <365d>, is_active: true })` |
| Code location | [`src/lib/server/data3/`](../../src/lib/server/data3/) |
| Spec | [`docs/specs/DATA-3-FILE-DELETION-SPEC.md`](../specs/DATA-3-FILE-DELETION-SPEC.md) |
| Sequencing | [ADR-0006](../adr/0006-data-segregation-and-sequencing.md) |

---

## 8. Sign-off checklist

After completing Phase C:

- [ ] Cron is firing daily at the configured time (verify last 3 days in Vercel logs).
- [ ] Audit rows match sweep result counters (sample at least one day's worth).
- [ ] Case documents are correctly updated (sample 3-5 deleted rows in Atlas).
- [ ] No `errors > 0` or `abandoned > 0` runs in the last 48 hours.
- [ ] `IMAGEKIT_PRIVATE_KEY` is the production key for the production ImageKit account.
- [ ] CHANGELOG.md updated with "DATA-3 enabled in production on <date>".

Once all check, the feature is live and routine.
