# DATA-3 — Original-File Deletion After Extraction (Design Spec)

**Status**: Design only — implementation queued as two follow-up sub-sessions
**Roadmap item**: DATA-3 in [`ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — P1, 1–2 days (across 3 sub-sessions)
**Companion ADR**: [ADR-0006](../adr/) (data segregation strategy) — sequencing dependency
**Author**: 2026-05-16 (post-S104, sub-session a of bounded plan)

---

## Section index

1. [Why this exists](#1-why-this-exists)
2. [What deletion means here](#2-what-deletion-means-here) — scope
3. [Non-negotiable invariants](#3-non-negotiable-invariants)
4. [State machine](#4-state-machine)
5. [Verification gate](#5-verification-gate) — when extraction is "successful enough"
6. [Retention policy](#6-retention-policy)
7. [Audit ledger](#7-audit-ledger) — `ArtifactDeletionLog` collection
8. [Failure recovery](#8-failure-recovery)
9. [Implementation skeleton](#9-implementation-skeleton)
10. [Out of scope](#10-out-of-scope)
11. [Open questions](#11-open-questions)

---

## 1. Why this exists

DigitalDSA's case flow accepts uploaded PDFs and images — bank statements, salary slips, ITRs, KYC documents — for every co-applicant of every lender application. Each upload lands in ImageKit (the CDN) with metadata stored at `cases.lender_applications[*].document_checklist[*].upload.{file_url, file_id, ...}` (see [`src/routes/api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/upload/+server.ts`](../../src/routes/api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/upload/+server.ts)).

**These files contain PII at the highest tier the platform handles:** full PAN, Aadhaar, residential address, bank account numbers, employer name, salary history. Once Gemini-based extraction (the LLM Extraction Pipeline) lifts the structured fields out into the case payload, **the original PDF/image is no longer load-bearing** — it's a copy of data we already have, sitting at a public CDN URL.

The longer those files live, the larger our blast radius if anything goes wrong (credentials leak, ImageKit account compromise, regulator inspection, customer SAR). The fix is mechanical: once extraction is verified-successful, delete the original. Keep the extracted *fields* in MongoDB (encrypted at rest per SEC-2, eventually). Drop the raw artifact.

**This is a data-minimization feature, not a cost-saving one.** ImageKit costs are negligible at our scale. The point is that we should not be holding originals we don't need.

> Status check at S104: the Gemini extraction pipeline itself is stubbed —
> [`src/lib/server/aiService.ts`](../../src/lib/server/aiService.ts) supports Gemini but is wired
> only to policy-document parsing. The user-document extraction (bank-statement →
> structured income, ITR → revenue/profit, salary slip → gross/net/deductions) is not
> yet built. **DATA-3 is designed so the deletion machinery can ship before the
> extraction pipeline goes live, and remain dormant (`extraction_status: 'pending'`
> on every row) until extraction starts firing.** Once extraction lands, DATA-3
> activates per-document as each row transitions to `verified`.

---

## 2. What deletion means here

| Action | Done at |
|---|---|
| Remove the file blob from ImageKit | `imagekit.files.delete(fileId)` — new SDK call, never invoked today |
| Null out `cases.lender_applications[*].document_checklist[*].upload.{file_url, file_id}` | Mongo `$unset` on those two fields only |
| Keep `upload.uploaded_at`, `upload.file_type`, `upload.file_size`, and `extracted_fields` | DSA + audit can still see "yes a file was here, it was extracted on X date, here's what we read out" |
| Write a row to `ArtifactDeletionLog` | New collection — see §7 |
| **Never** delete or mutate the extracted structured fields | Those live in `extracted_fields` on the same checklist item and feed the rule engine + payload |

> The deletion is **one-way and final**. There is no "soft delete" / "trash" / "retention bin". If the deletion was wrong, the only recovery is for the DSA to re-upload — and that requires the customer's permission and effort. Hence the verification gate (§5) is strict.

---

## 3. Non-negotiable invariants

1. **Never delete an original until extraction is verified-successful** (§5 defines verified).
2. **Never delete an original while the case is in `lock.is_locked === false`** (unlock = editable = extraction may be re-run = file still needed).
3. **Never delete an original before billing for the case is confirmed** — `DsaApplications.subscription.status === 'active'` AND a `BillingTransactions` row exists for the lock fingerprint, OR the DSA is on the free tier and the lock has consumed quota. (See [billing.ts](../../src/lib/config/billing.ts).) This protects against pre-payment race conditions where extraction succeeds but billing is still settling.
4. **Every deletion writes an `ArtifactDeletionLog` row** before the ImageKit call. If the log write fails, do not call ImageKit. If ImageKit fails, the log row's `status` field flips to `deletion_failed` and a retry is scheduled.
5. **Deletion is idempotent.** Calling it twice on the same `(case_id, doc_id)` is a no-op the second time — the audit row is keyed on `(case_id, doc_id, attempt_n)`, and the `file_id` lookup returns null on second call.
6. **Deletion is gated behind an env flag** (`DATA3_DELETION_ENABLED=true`) for the first 2 weeks of production. Default off. Turning it off mid-flight halts new deletions but does not unwind completed ones.
7. **No deletion of files newer than the retention floor** (§6) regardless of extraction status. Even verified-successful extractions sit for the floor period as a human "did anything go wrong?" buffer.

---

## 4. State machine

Each `document_checklist[*]` row carries an `extraction_status` field already (or gets one added — see §9). DATA-3 reads this field plus three other things and decides whether to delete.

```
                          ┌─────────────────────┐
                          │   uploaded          │  upload happened, no extraction yet
                          │   (no extraction)   │
                          └──────────┬──────────┘
                                     │ extraction triggered
                                     ▼
                          ┌─────────────────────┐
                          │   extracting        │  Gemini call in flight or queued
                          └──────────┬──────────┘
                                     │
                  ┌──────────────────┼────────────────────┐
                  │                  │                    │
                  ▼                  ▼                    ▼
        ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
        │  extracted     │  │  partial       │  │  failed          │
        │  (all fields   │  │  (some fields  │  │  (LLM error,     │
        │  parsed OK)    │  │  null/uncertain│  │  unreadable,     │
        └────────┬───────┘  │  /low-conf)    │  │  invalid file)   │
                 │          └────────┬───────┘  └────────┬─────────┘
                 │                   │                   │
                 │ verification      │ DSA fills/        │ DSA retries
                 │ gate (§5)         │ overrides         │ extraction
                 │ passes            │ → "verified"      │ or marks
                 ▼                   ▼                   │ "human only"
        ┌────────────────────────────────────┐           │
        │           VERIFIED                 │           │
        │  (gate passed, retention floor     │           │
        │  elapsed, case locked, billed)     │           │
        └─────────────────┬──────────────────┘           │
                          │                              │
                          ▼                              ▼
              ┌───────────────────────┐      ┌─────────────────────┐
              │  deletion_pending     │      │  retained_indefinite│
              │  (queued for delete)  │      │  (no deletion ever) │
              └───────────┬───────────┘      └─────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  deletion_in_flight   │  ImageKit call started
              └───────────┬───────────┘
                          │
                  ┌───────┴────────┐
                  ▼                ▼
        ┌────────────────┐  ┌────────────────┐
        │  deleted       │  │  deletion_failed│
        │  (terminal)    │  │  (retry, max 3) │
        └────────────────┘  └────────┬───────┘
                                     │
                                     │ retries exhausted
                                     ▼
                            ┌────────────────┐
                            │  deletion_     │
                            │  abandoned     │  Alert ops; manual cleanup
                            │  (terminal)    │
                            └────────────────┘
```

### Status taxonomy stored on the checklist item

```ts
type ExtractionStatus =
  | 'uploaded'           // no extraction attempt yet
  | 'extracting'         // in flight
  | 'extracted'          // extraction completed, awaiting DSA verification
  | 'partial'            // extraction completed with gaps, DSA action required
  | 'failed'             // extraction error, DSA action required
  | 'verified'           // DSA confirmed fields are correct (manual or auto-verified — §5)
  | 'retained_indefinite' // explicit DSA opt-out from auto-deletion (rare; needs reason)
  | 'deletion_pending'   // verified + retention floor elapsed, queued for next sweep
  | 'deletion_in_flight' // ImageKit delete in progress
  | 'deleted'            // terminal — file_id + file_url unset, audit row written
  | 'deletion_failed'    // ImageKit error, retry scheduled
  | 'deletion_abandoned' // 3 retries exhausted, manual intervention needed
```

---

## 5. Verification gate

"Extraction is verified-successful" requires **all four** of these to be true. This is the strictest definition we have — losing source data on an uncertain extraction is worse than holding extra data.

| Gate | Detail |
|---|---|
| **G1 — Field completeness** | Every required field for the document type's extraction schema is non-null. Schemas live next to the extraction pipeline (e.g. bank-statement schema requires `account_holder`, `account_number_last4`, `transactions[]`, `closing_balance`, `statement_period`). Optional fields can be null. |
| **G2 — Confidence floor** | Every field's confidence score from Gemini (or whichever LLM) is ≥ 0.85. The pipeline must surface per-field confidence; if it doesn't, treat as `partial`, not `verified`. |
| **G3 — DSA confirmation** | The DSA has explicitly clicked "Looks correct" on the extraction-review screen for this document, OR 14 days have passed since extraction with no DSA changes (auto-verify floor — buys time to catch regressions). |
| **G4 — Case lock & billing** | `cases.lock.is_locked === true` AND the lock fingerprint has been billed (either via paid-tier `BillingTransactions` row or free-tier quota consumption in `MonthlyAssessmentUsage`). |

A row is `verified` the first time all four turn true simultaneously. A subsequent change that flips G4 to false (e.g. case unlock for edit) **does NOT roll the status back to `partial`** — extraction itself didn't change. But it **does pause deletion** (`deletion_pending` rows go dormant until the case re-locks AND re-bills).

> **Why G4 is in here at all.** If the DSA hasn't paid for the case yet, they're more likely to abandon it. Files for abandoned cases probably *should* be deleted, but on a different schedule (see §6, "abandoned-case sweep"). Mixing the two paths in one state machine causes confusion. Keep G4 strict for the happy path.

### What "DSA confirmation" looks like in the UI (forward-looking)

When the extraction pipeline ships, the DSA review screen will show extracted fields side-by-side with a thumbnail of the original. A "Looks correct" button does two things: (1) flips `extraction_status` to `verified`, (2) starts the retention-floor timer. The 14-day auto-verify only fires for rows where no DSA review has happened — it does not override an explicit "Looks wrong, re-extract" click.

---

## 6. Retention policy

### Floor (mandatory hold even after verified)

| Document tier | Hold |
|---|---|
| Bank statements, ITRs, salary slips, Form 16 | **30 days** post-verification |
| KYC documents (PAN card, Aadhaar card, photo) | **90 days** post-verification — KYC is more regulator-touched |
| Property documents (sale deed, agreement) | **180 days** post-verification — these often surface in disputes |
| Any document the DSA explicitly tagged as "high-stakes" | **365 days** post-verification |

After the floor, eligible rows enter `deletion_pending`. The sweep job runs daily and processes a capped batch (initially 500 rows/day) to avoid hammering ImageKit.

### Ceiling (deletion required regardless of state)

A separate, more aggressive sweep handles **abandoned cases** — cases where:
- `cases.lock.is_locked === false` for ≥ 180 days AND
- No DSA activity (case updates, applicant edits) for ≥ 180 days AND
- No billing transaction tied to the case

For these, files are deleted at the 180-day mark regardless of extraction status. The case shell remains in Mongo with `cases.is_abandoned_purge = true`; only the file artifacts go. This is policy-only — implementation is queued under a future DATA-x item, not part of DATA-3 v1.

### Indefinite retention escape hatch

A DSA can opt a specific document into `retained_indefinite` from the document-checklist UI with a free-text reason ("active dispute with lender X" etc.). This writes a `DocumentRetentionOverride` row (new collection, see §9) and excludes the row from all sweeps. Override is auto-cleared 365 days later unless re-applied — prevents quiet permanent retention.

---

## 7. Audit ledger

### New collection: `ArtifactDeletionLog`

```ts
interface ArtifactDeletionLog {
  _id: ObjectId;

  // What was deleted
  case_id: string;
  lender_application_id: string;
  document_checklist_id: string;
  doc_type: string;            // 'bank_statement_3m', 'salary_slip', etc.
  file_id: string;             // ImageKit fileId (preserved for forensic lookup)
  file_size: number;
  file_type: string;
  uploaded_at: Date;

  // Why it was deleted
  reason: 'verified_floor_elapsed' | 'abandoned_case_purge' | 'admin_force_delete';
  extraction_status_at_delete: ExtractionStatus;
  verified_at: Date | null;
  retention_floor_days: number;

  // Who triggered it
  actor: 'system_sweep' | 'admin' | 'cron';
  actor_id: string | null;     // admin user_id if actor === 'admin', else null

  // Operational
  attempt_n: number;           // 1 on first try, 2/3 on retry
  status: 'in_flight' | 'success' | 'failed';
  imagekit_response: string | null;  // raw ImageKit SDK response or error msg, scrubbed
  error_code: string | null;
  started_at: Date;
  completed_at: Date | null;
}
```

**Index**: `(case_id, document_checklist_id, attempt_n)` unique. `(status, started_at)` for retry sweep. `(uploaded_at)` for time-window queries.

**Why it's a separate collection, not nested in `cases`:**
- Survives case deletion (we keep deletion-evidence even if the case itself is purged).
- Independent retention (the audit log itself has a 7-year retention per RBI guidelines).
- Easier to ship to cold storage / SIEM later without touching the cases collection.

### Existing audit precedent

`PolicyAuditLog` already exists for the policy engine ([`src/lib/types/policyEngine.ts:515`](../../src/lib/types/policyEngine.ts:515)). `ArtifactDeletionLog` follows the same shape (actor + action + target + details + timestamp) but is a separate collection because (a) the policy log has 2-year TTL — too short for deletion evidence — and (b) the access patterns are different (deletion log queries by file_id and case_id, policy log queries by target_type).

---

## 8. Failure recovery

### Retry semantics

- ImageKit `deleteFile` failures (network, 5xx) retry up to **3 times** with exponential backoff (10s, 60s, 300s).
- ImageKit 404 (file already gone) is treated as **success** — write the audit row with `status: 'success'`, `imagekit_response: 'already_deleted'`, and mark the checklist row `deleted`. Idempotency guarantee §3.5 depends on this.
- ImageKit 4xx (permission, malformed fileId) is **abandoned** immediately — write the audit row with `status: 'failed'`, flip the checklist row to `deletion_abandoned`, page ops via the existing error-alert pipeline ([`src/lib/server/email.ts`](../../src/lib/server/email.ts) → `sendErrorAlert`).
- After 3 retries the row enters `deletion_abandoned` and is excluded from further sweeps. Ops investigates manually.

### Audit-log-first ordering

The deletion job **always** writes the `ArtifactDeletionLog` row with `status: 'in_flight'` BEFORE calling ImageKit. If the Mongo write fails, the ImageKit call is skipped. This guarantees we never have a deleted file with no audit trail. The reverse (audit row but file still exists) is recoverable; the inverse (file gone, no record) is not.

### Crash mid-flight

If the sweep crashes after writing the audit row but before calling ImageKit, the next sweep picks up `(status: 'in_flight', started_at < now - 5 min)` rows and resumes them. ImageKit's idempotency (delete on already-deleted file returns 404 = success) covers the case where the original call actually completed before the crash.

### Manual rollback

There is no rollback. The deletion is final. If ops needs to "undo" a deletion (regulatory request, customer SAR escalation), the answer is: the file is gone, we have its metadata + the extracted fields, here's the audit row showing exactly when it was deleted and why. The audit row is the rollback substitute.

---

## 9. Implementation skeleton (for sub-sessions b + c)

### Sub-session (b) — State machine + collections (~1–2 hr)

**New files:**
- `src/lib/server/data3/types.ts` — `ExtractionStatus`, `ArtifactDeletionLog`, `DocumentRetentionOverride`
- `src/lib/server/data3/stateMachine.ts` — pure function `nextStatus(current, event, gates) → ExtractionStatus`. No I/O.
- `src/lib/server/data3/verifyGate.ts` — `isVerified(checklistItem, caseDoc, billingState) → boolean` per §5.
- `src/lib/server/data3/auditLog.ts` — `recordDeletionAttempt(payload) → ArtifactDeletionLog`. CSRF / actor-scoped writes only.
- `src/lib/database/migrations/0042_data3_collections.ts` — creates `ArtifactDeletionLog`, `DocumentRetentionOverride`; adds `extraction_status`, `extracted_fields`, `extraction_confidence` to the existing embedded `document_checklist[*]` shape (no schema migration needed since Mongo is schemaless, but a backfill that sets every existing row's `extraction_status: 'uploaded'` is required).

**Tests (~30 tests):**
- State-machine: every transition arrow in §4 has at least one passing assertion.
- Verify gate: G1/G2/G3/G4 each tested in isolation + the conjunction.
- Idempotency: calling `recordDeletionAttempt` twice with the same `(case_id, doc_id, attempt_n)` is a duplicate-key error (not silently double-writing).

**No ImageKit calls yet.** This sub-session is purely Mongo + pure functions.

### Sub-session (c) — ImageKit wiring + sweep job + env flag (~1–2 hr)

**New files:**
- `src/lib/server/data3/imagekitDelete.ts` — wraps `imagekit.files.delete(fileId)` with the retry/backoff logic from §8.
- `src/lib/server/data3/sweepJob.ts` — runs daily via Vercel Cron (or self-hosted equivalent). Iterates cases with `extraction_status: 'verified'` AND `verified_at < now - retentionFloor`, batches up to 500/day, calls the delete pipeline per row.
- `src/routes/api/cron/data3-sweep/+server.ts` — cron entry point, guarded by `requireCronSecret`, calls `sweepJob`.
- Env flag: `DATA3_DELETION_ENABLED` in [`src/lib/config/env.ts`](../../src/lib/config/env.ts) (or equivalent). Default `false`. The sweep job reads the flag and short-circuits if disabled — does NOT remove the cron schedule, just no-ops the body so we can dark-launch and flip the flag mid-flight.

**Tests (~10 tests):**
- ImageKit 200 / 404 / 4xx / 5xx handling.
- Retry timing (3 attempts, exponential backoff).
- Cron entry point auth (rejects non-cron-secret callers).
- Env-flag short-circuit (sweep body never runs when flag is off).

**Manual verification:**
- Run sweep in staging with flag ON, one test case, one test document.
- Confirm the audit row, ImageKit deletion (check ImageKit dashboard manually), Mongo $unset of file_id/file_url.
- Roll forward in production with flag OFF for 7 days, monitor sweep logs.
- Flip flag ON, watch for 48h, confirm deletion counts match audit row counts.

---

## 10. Out of scope

These are not in DATA-3 v1. Each gets its own future item if/when needed:

- **Abandoned-case purge** (180-day no-activity bin): policy is in §6, implementation is a separate roadmap item.
- **Document-level encryption at rest** (covered by SEC-2 / ADR-0005).
- **Re-uploading deleted documents.** If a deleted document is needed again, the DSA goes through the normal upload flow — a fresh file_id, no resurrection. No "restore from trash" feature.
- **Customer-facing deletion request flow** (DPDP Sec. 13 — right to erasure on request). DPDP gives the data principal the right to ask. The implementation of that consent → erasure flow is its own product feature; DATA-3 is the infrastructure it'll ride on.
- **Cold-storage / Glacier tier for unverified documents.** A potential later optimization. Today, unverified docs stay on ImageKit until manually deleted or the case is purged.
- **Pre-extraction file scanning** (virus / malware / PII redaction). Separate concern (SEC-x), runs at upload time, not deletion time.

---

## 11. Open questions

These need decisions before sub-session (b) starts. Each will be resolved either inline here on update, or in ADR-0006.

1. **DPDP localization.** Does the audit log (with `file_id` referencing the ImageKit asset that held PII) need to itself be in an India-region Mongo cluster? Today our primary is on Atlas Mumbai — but the long-term retention copy (7 years) may need a clearer policy. Probable answer: yes, store everything in India region, never replicate audit-log shards out of region.
2. **Quota interaction.** If a DSA on the free tier uses up their DA quota on a case that later gets auto-deleted, do they get any quota back? Probable answer: no — quota is consumed at lock-time for the assessment work, not for the file storage. Deletion is downstream. But surface this in the UI so DSAs don't perceive it as "the system took my quota and erased my work."
3. **Cross-loan applicant carryover (Pitfall #20).** When a loan-type switch parks applicants for resume, do their documents park too? If yes, are those files held in `retained_indefinite` until the parked loan is resumed or expired? Need a clear cross-reference with the [loan-switch orchestrator](../../src/lib/utils/loanSwitchOrchestrator.svelte.ts) — DATA-3 should respect parked-loan state.
4. **PII in extracted fields vs PII in file.** The extracted fields ALSO contain PAN, account numbers, etc. Deleting the file but keeping the extracted PII in `cases.lender_applications[*].document_checklist[*].extracted_fields` reduces but doesn't eliminate exposure. ADR-0005 / SEC-2 (Atlas QE encryption) addresses the rest. Sequencing of DATA-3 vs SEC-2 belongs in ADR-0006.

---

## Appendix A — Cross-references

| Concept | Source of truth |
|---|---|
| ImageKit SDK calls | [`src/lib/imagekit/server.ts`](../../src/lib/imagekit/server.ts) |
| Upload endpoint | [`/api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/upload`](../../src/routes/api/cases/[case_id]/lender-applications/[lender_app_id]/documents/[doc_id]/upload/+server.ts) |
| Case lock + fingerprint | [`src/lib/server/caseLock/`](../../src/lib/server/caseLock/) |
| Billing config + DA tiers | [`src/lib/config/billing.ts`](../../src/lib/config/billing.ts) |
| AI service (Gemini wiring) | [`src/lib/server/aiService.ts`](../../src/lib/server/aiService.ts) |
| Audit log precedent | [`src/lib/types/policyEngine.ts`](../../src/lib/types/policyEngine.ts) (`PolicyAuditLog`) |
| Error alert pipeline | [`src/lib/server/email.ts`](../../src/lib/server/email.ts) (`sendErrorAlert`) |
| Roadmap item | [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — DATA-3 row |
