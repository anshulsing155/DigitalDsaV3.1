# SEC-2 Phase C — Backfill + formSnapshots Payload Walker (Plan)

**Item**: SEC-2 (MongoDB field-level encryption for PII)
**Drafted**: 2026-05-19
**Status**: Design only — no code. Awaits user sign-off before implementation.
**Depends on**:
- Phase A — CSFLE infrastructure (✅ shipped 2026-05-19, commit `05a95539`)
- Phase B — 38 routes + 4 shared helpers wired (✅ shipped 2026-05-19, 14 commits ending `2bd38807`)
- Operator step — `pnpm tsx scripts/sec2-init-deks.ts` against Atlas (Production / Preview / Dev). Not yet run.

Once Phase B + DEK init are live, every NEW row in the 4 user collections is encrypted. Phase C addresses the two remaining pieces: backfilling the millions of pre-existing rows, and dealing with the denormalized PII that lives inside `formSnapshots.payload`.

---

## 1. Scope

Two distinct workstreams. Each can ship independently. Treat them as separate sub-phases.

### C.1 — User-collection backfill

Convert plaintext PII to ciphertext in the four user collections that Phase B targets:

| Collection | Estimated row count (prod) | PII fields per row |
|---|---|---|
| `userApplications` (Applicant) | ~10s of K | mobile, email, name, dob, aadhaar, address, gst |
| `DsaApplications` | ~hundreds | mobile, email, name, dob, address, gst, pan |
| `rmApplications` | ~hundreds | mobile, email, rmOfficialEmail, name |
| `AdminUsers` | <50 | mobile, email, name |

Once backfilled, the `findUserByMobile` plaintext-fallback branch (`userCrypto.ts:188`) becomes dead code in steady-state but stays in the codebase as a safety net.

### C.2 — `formSnapshots.payload` PII walker

The wizard payload contains denormalized copies of the same PII fields (applicant names, mobiles, PANs, DOBs, addresses, GSTs) across deeply nested structures: `payload.applicants[]`, `payload.coApplicants[]`, `payload.guarantors[]`, `payload.propertyOwners[]`, `payload.directors[]`, `payload.gpa[]`, plus any `payload.builderName` / `payload.authorityName` fields.

Payloads are **immutable** (per AD-05 / AD-02) — each form edit creates a new versioned snapshot with `payload_hash: SHA-256`. That hash is used by the rule engine + the file builder. Encrypting payload fields in place would invalidate every existing hash.

This is the trickier of the two pieces. §4 below lays out three approaches with trade-offs.

---

## 2. Non-goals for Phase C

- Encrypting `cases.derived` (derived numerics — no PII).
- Encrypting `rules`/`policies` collections — no PII; only artifact_id + rule body.
- Encrypting attachment URLs from ImageKit — DATA-3 handles file deletion; the URL itself isn't PII.
- AWS KMS migration — Phase D scope. Local KMS stays until that lands.

---

## 3. C.1 Design — Backfill Script

### 3.1 Approach

A **chunked, resumable, idempotent** Node script run by an operator (not a cron) against each environment (Dev → Preview → Production). Same pattern as `sec2-init-deks.ts` — operator-launched, fails loud, single-purpose.

### 3.2 File layout

```
scripts/sec2-backfill-users.ts        — orchestrator (small)
src/lib/server/csfle/backfill.ts      — pure logic (testable)
```

The pure-logic split mirrors how Phase A separated `setup.ts` (idempotent installer) from `scripts/sec2-init-deks.ts` (CLI wrapper). Lets us unit-test the per-row encryption + idempotency check without a live MongoDB.

### 3.3 Per-row state machine

For every row in each collection:

```
1. Read row.
2. For each PII field listed in the per-collection registry:
   - if value is undefined/null → skip
   - if isEncryptedBinary(value) → already encrypted, skip (idempotent)
   - else → encrypt via encryptUserPii's single-field path
3. If any field changed, updateOne by _id with the new field values.
   - Use $set with only the modified fields (don't re-write unmodified ones).
4. Record state in a sidecar audit collection (see §3.5).
```

The encrypted-binary check in step 2 is the idempotency guarantee — a partial run that crashes mid-collection can be resumed; rows already converted are detected and skipped.

### 3.4 Chunking + observability

- Page through each collection with `_id` cursor pagination at `BATCH_SIZE = 500`. Avoids Mongo's offset-pagination performance cliff and survives restarts cleanly.
- Per batch: log a one-liner `{ collection, batch_n, range_start_id, range_end_id, encrypted_count, skipped_count, ms_elapsed }`.
- Per collection: emit a final `{ total_rows, total_encrypted, total_skipped, total_errors, duration_ms }`.
- Hard fail on any individual row's encrypt-or-update error. Don't continue past unknown errors — surface for human triage.

### 3.5 Audit collection

Write to a new `csfleBackfillAudit` collection:

```ts
{
  _id: ObjectId,
  collection: 'Applicant' | 'DsaApplications' | ...,
  row_id: ObjectId,         // original row's _id
  encrypted_fields: string[], // which fields were converted in this run
  ran_at: Date,
  ran_by: string,           // hostname or operator
}
```

Audit purpose:
- Forensic — answer "which rows did the 2026-MM-DD backfill run touch and what fields?"
- Resume — on rerun, query this collection to confirm idempotency assumptions.
- Compliance — DPDP / cert audit may need this evidence.

### 3.6 Operator runbook (sketch)

```
1. Operator: confirm DEK init ran (scripts/sec2-init-deks.ts) for the target env.
2. Operator: enable maintenance mode (or pick a low-traffic window — read paths
   handle both plaintext and ciphertext rows already, but writes during the run
   create more plaintext rows that the run won't pick up).
   → Acceptable: leave maintenance mode off; run twice for sweep-completion.
3. Operator: run `pnpm tsx scripts/sec2-backfill-users.ts --collection=Applicant`.
4. Operator: review the audit log + sanity-check 5 rows with a `find` query.
5. Operator: repeat for DsaApplications, rmApplications, AdminUsers.
6. Operator: optional final pass with --include-already-encrypted to log the
   final state of the collection.
```

### 3.7 Risk + mitigation

| Risk | Mitigation |
|---|---|
| Crash mid-batch | Resume from last logged `range_end_id`. Idempotency guard in §3.3 handles re-encryption attempts. |
| Auth route doing a lookup during the run hits a half-encrypted row | The dual-query in `findUserByMobile` already handles both shapes. Worst case: 2 queries instead of 1 during the window. |
| Operator runs against wrong env | Require `CSFLE_ENABLED=true` AND `BACKFILL_TARGET_ENV=production` env vars to match. Refuse to start without both. |
| Index issues — deterministic ciphertext changes the index distribution | Verify post-run: `db.userApplications.getIndexes()` unchanged; deterministic ciphertext is bytewise stable so existing unique indexes on `mobileNumber` continue to work. |
| Driver memory leak on millions of rows | Cursor-based pagination (already designed) + explicit `await batch.close()` per chunk. |

### 3.8 Effort estimate

~4-6 hours of focused implementation. Half of that is testing (unit + dev-env dry-run). Production execution is operator-side, ~30 min for current row counts.

---

## 4. C.2 Design — formSnapshots.payload Walker

This is the architectural piece. **Three approaches**; recommendation at the end.

### 4.1 Approach A — Encrypt payload PII fields in-place + rehash

**What:** Define a registry of dotted-path PII fields inside `payload`. Walker traverses each snapshot, encrypts matching values, recomputes `payload_hash`, updates the row.

**Pros:**
- Symmetry with user-collection encryption — read paths decrypt; write paths encrypt; same model.
- Strong defense-in-depth: even if a stray admin tool exports `formSnapshots`, PII is ciphertext.

**Cons:**
- **Breaks the immutability invariant (AD-05).** `payload_hash` was the integrity proof that no one tampered with the snapshot. Recomputing it on backfill means we lose the historical hash. We'd need a new field `payload_hash_pre_csfle` to preserve it for audit.
- **Rule engine + file builder must be encryption-aware.** Both read `payload` directly. They'd need to decrypt before evaluation. The rule engine currently runs hot (sub-100ms target); decrypting nested PII on every eval is unwelcome latency.
- **Walker complexity is high.** PII is nested ≥4 levels deep in some payloads (e.g. `payload.applicants[7].coBorrowers[2].fullName`). The walker needs a path-registry + array traversal + edge cases (missing applicants, sparse arrays, legacy field names from pre-migration migrations).
- **Hash rehash means we can't detect pre-CSFLE tampering** in the historical record. We'd be replacing a known-good hash with a new computed one.

### 4.2 Approach B — Encrypt payload at the document level (BSON Binary blob)

**What:** Stop treating `payload` as a queryable subdocument. Serialize the entire JSON to a string, encrypt the string with the `name-key` random DEK, store as `Binary(subtype=6)`. Read path decrypts to string, JSON.parses, returns to caller.

**Pros:**
- **Single point of encrypt/decrypt** — no path registry, no walker, no per-field logic.
- Immutable `payload_hash` unchanged (computed before encrypt; verified after decrypt).
- Rule engine + file builder unchanged at the field level — they just receive a `payload` object after decryption.

**Cons:**
- **Breaks aggregation queries on payload fields.** If any current admin tool runs `db.formSnapshots.find({ 'payload.loanType': 'home' })`, that query stops working. Need to audit consumers.
- Adds a ~5-15ms latency floor to every snapshot read (decrypt the blob first).
- Storage grows ~33% (encrypt-and-base64 vs raw JSON) — Atlas pricing impact for high-volume tenants. Probably negligible at our scale, but worth noting.
- Backfill is simpler but still touches every row.

### 4.3 Approach C — Scrub PII from payload at write-time (don't store it)

**What:** Stop denormalizing PII into `payload` entirely. Replace `payload.applicants[i].fullName` with `payload.applicants[i].applicantRef = ObjectId(...)`. Resolve names at read-time by joining against the user-collection (which IS encrypted).

**Pros:**
- **Eliminates the dual-write hazard at the root** — no copies of PII to keep in sync.
- DPDP-friendly — payload is structurally non-PII; only refs.
- No encryption needed on payload; the encryption lives in the user collection only.
- Rule engine + file builder continue to read structured data; just chase the ref when they need a name.

**Cons:**
- **Biggest blast radius of the three.** Every payload-consumer in the codebase needs auditing: `casePayloadBuilder.ts`, `applicantPayload.ts`, `loanPayload.ts`, all of `ruleEngine/`, the file builder, the PDF generator. Estimated >50 read sites.
- **Historical payloads can't be migrated cleanly** — the applicant they referenced may have been deleted (GDPR-style erase request). Need a "tombstone" mechanism: `applicantRef` resolves to `{ status: 'erased' }` for deleted applicants.
- Schema migration is non-trivial: existing payloads must be walked, names extracted, applicants found-or-created in the user collection, refs substituted. Lossy for orphaned payloads.
- **Rule engine evaluation latency goes up** — every name lookup is now a DB join instead of a payload field read. Could be mitigated with batched `$lookup`s but adds complexity.

### 4.4 Recommendation

**Approach B (document-level Binary encryption)** as the primary path, with these specifics:

- **Why B over A:** Avoids the immutability-invariant break (hash stays valid pre-encrypt). Avoids the rule-engine latency cost of per-field decryption. Walker complexity is bounded — one JSON.stringify + one encryptValue call per row.
- **Why B over C:** C is the architecturally cleanest but blows scope to 2-3 sprints minimum. We can do C as a future SEC-10 item if compliance demands true PII-elimination from payloads. B closes the at-rest exposure now.
- **Migration plan for B:**
  1. Add `payload_encrypted: Binary | null` field to the schema; keep `payload` as the live read field.
  2. Backfill script walks every snapshot, encrypts payload, writes to `payload_encrypted`, leaves `payload` plaintext for safety during cutover.
  3. Read path: when `payload_encrypted` exists, prefer it (decrypt + parse); fall through to `payload` for rows the backfill hasn't reached yet (migration-safety pattern, mirrors user-collection dual-query).
  4. After backfill completes and a soak period passes, a second migration script clears `payload` and keeps only `payload_encrypted`. Single source of truth re-established.
- **Audit of payload-aggregation consumers:** before starting, grep the codebase for `db.formSnapshots.aggregate` and `formSnapshots.find({ 'payload.` patterns. If any production code path queries inside payload (not just by case_id/version), B is harder than expected — flag and reconsider.
- **Hash treatment:** `payload_hash` continues to be computed over the **plaintext** payload (just like today). At read time: decrypt → parse → verify hash matches. Tampering detection preserved.

### 4.5 Effort estimate

If grep confirms no payload-field aggregations (likely — payloads are read by `case_id + version`, not searched by content):
- ~6-8 hours implementation.
- ~4 hours testing (round-trip property tests + integration test with a real CSFLE provider).
- Operator-side backfill: 10-20 min per environment.

If payload-field aggregations exist:
- Add 4-8 hours per consumer to refactor before encrypting.

---

## 5. Sequencing

Recommended order — neither piece blocks the other, but C.1 is lower-risk:

1. **C.1 first** (next session). User-collection backfill. Low blast radius — the read path already handles both plaintext and ciphertext rows.
2. **Operator runs the backfill** against Dev, then Preview, then Production.
3. **C.2 grep audit** (next session). Confirm no payload-field aggregations in the codebase.
4. **C.2 implementation** (after C.1 lands). Document-level Binary encryption of `payload`.
5. **C.2 cutover** — after soak period, drop the plaintext `payload` field.

---

## 6. Open questions for user sign-off

1. **Approach B is recommended** for C.2. Confirm before implementation, or pick A/C.
2. **Maintenance window** for the C.1 backfill — preferred to run during low-traffic window, but not strictly required (dual-query handles half-encrypted state). User preference?
3. **Audit collection retention** — `csfleBackfillAudit` is append-only. Keep forever, or TTL after 90 days?
4. **Hash policy for C.2** — keep `payload_hash` computed over plaintext (recommended for tamper detection), or recompute over ciphertext (simpler but loses the integrity proof)?
5. **DEK rotation timing** — Phase D adds AWS KMS Mumbai. Recommendation is to backfill once with local KMS, then `rewrapManyDataKey` to AWS in Phase D — no second backfill needed. Confirm.

---

## 7. Verification gates (per phase)

### C.1 (user backfill) is "done" when:

- [ ] Unit tests: per-row encryption is idempotent (run twice → no double-encryption).
- [ ] Unit tests: encryption-disabled passthrough still works (CSFLE_ENABLED=false).
- [ ] Dev-env dry-run: backfill completes against a clone of production data without errors.
- [ ] Sanity-spot-check 10 random rows post-run — each PII field is Binary(subtype=6).
- [ ] `findUserByMobile` E2E: log in with a backfilled row's mobile, verify login succeeds.
- [ ] Audit collection contains one row per converted row.
- [ ] Production backfill executed by operator + recorded in `docs/CHANGELOG.md`.

### C.2 (payload walker) is "done" when:

- [ ] Property test: arbitrary payload → encrypt → decrypt → equal to input (including edge cases: deeply nested, unicode, large strings).
- [ ] Integration test against a real CSFLE provider (separate nightly suite).
- [ ] Rule-engine evaluation latency P95 ≤ +20ms vs. baseline.
- [ ] No payload-field aggregation queries broken (grep + grep-via-CI gate).
- [ ] `payload_hash` continues to verify post-round-trip.
- [ ] Tampering test: modify ciphertext → decrypt should fail; modify decrypted payload → hash check should fail.

---

*Spec authored 2026-05-19 during Round 3 of session-resume work. Parent SEC-2 catalog entry: `docs/ARCHITECTURE-EVOLUTION.md` §SEC-2. Sibling: `docs/specs/SEC-2-CSFLE-PLAN.md` (Phase A+B), `docs/adr/ADR-0009.md` (Atlas-QE → CSFLE pivot rationale).*
