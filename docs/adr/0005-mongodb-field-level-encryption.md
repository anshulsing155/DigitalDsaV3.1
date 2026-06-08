# ADR-0005 — MongoDB field-level encryption strategy for PII

**Status**: Accepted (design locked 2026-05-15) — Operational rollout deferred to SEC-2 production-rollout session per CLAUDE.md §8. Implementation infrastructure partially shipped 2026-05-18; production flip reverted 2026-06-01 per Pitfall #68 (`CSFLE_ENABLED='true'` is the operational switch — flipping it without a complete DEK + master-key + backfill sequence breaks fresh logins).
**Date**: 2026-05-15 (design) · Last reviewed: 2026-06-02
**Session**: S103 (design) · S203/204 (Pitfall #68 incident + revert)
**Roadmap item**: SEC-2
**Pre-rollout enforcement**: per Pitfall #68, before flipping `CSFLE_ENABLED='true'` on any environment again, run `node scripts/diagnose-csfle-state.mjs` + do a real fresh-OTP incognito login within 5 minutes of the flip.

---

## Context

PII lives in plaintext across multiple MongoDB collections today. The exposure surface:

**Collections carrying PII (confirmed via `src/lib/types/index.ts` + Mongo collection refs):**

| Collection | Plaintext PII fields | Source |
| --- | --- | --- |
| `DsaApplications` | `mobileNumber`, `emailAddress`, `panNumber`, `aadhaarNumber`, `dateOfBirth`, `fullName`, `gstNumber` | DSA onboarding |
| `rmApplications` | `mobileNumber`, `rmOfficialEmail` (PII-equivalent — bank identity) | RM onboarding |
| `AdminUsers` | `mobileNumber`, `email`, `name` | Admin profiles |
| `Applicant` (snapshot collection) | `mobileNumber`, `email`, `panNumber`, `aadhaarNumber`, `dateOfBirth`, `fullName`, plus joint applicants & directors | Form submissions — the highest-volume PII collection |
| `Cases` | Referenced PII via applicant snapshots embedded in case payloads | Wraps the snapshot lineage |
| `Leads` | `mobileNumber`, `email` (lead contact info) | Pre-conversion lead capture |
| `PolicyCaptures` | `source_rm_name`, `source_rm_email` (sometimes), free-text fields that may have customer names | RM-submitted policy data |

**Threats this addresses:**

1. **Backup theft / DB dump exposure.** If a MongoDB Atlas backup is exfiltrated (e.g. via a leaked Atlas API key, an insider with read-only DB access, a forgotten dev snapshot), every customer's Aadhaar / PAN / mobile is currently in cleartext.
2. **`.env` in git history (SEC-7).** The repo's history contains `MONGODB_URI` from earlier commits. Anyone with git history access who can reach that DB endpoint reads PII. SEC-7 rotates the URI, but doesn't help with historical exposure or the next-credential-leak scenario.
3. **Compliance posture.** RBI's data protection guidance + the DPDP Act 2023 (India) treats Aadhaar and PAN as sensitive personal data. Encryption-at-rest using application-managed keys is the recognized control. MongoDB Atlas's storage-level encryption is NOT sufficient for this class — it protects from disk theft only, not from a compromised connection string.

**Threats this does NOT address (must be handled separately):**

- A compromised application server with the decryption key in memory can still read all PII. Key-rotation cadence + IAM scoping + runtime secret management limit blast radius but don't eliminate it.
- API responses still return decrypted PII to authenticated clients (by design — DSAs need to see their applicants' details). FLE protects DB-side, not response-side.
- Compromised browser sessions can still scrape decrypted PII from logged-in views. Out of scope for FLE; addressed by token rotation, CSP, and short session TTLs.

---

## Decision

**Adopt MongoDB Atlas Queryable Encryption (QE) for the PII fields enumerated below, with application-side fallback (extended `encryption.ts`) for fields that don't need equality search.** Phased migration over ~1 week of implementation work.

### Why QE over the alternatives

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **A. MongoDB Atlas Queryable Encryption (QE)** | Automatic encrypt/decrypt at driver level; equality queries on encrypted fields supported (critical for "find user by mobile" pattern); SDK does the heavy lifting; AWS/GCP/Azure KMS integration | Requires Atlas (which we already use); range queries not supported (we don't need them on PII); slightly higher write latency (~5-10ms per encrypted field) | **Chosen** |
| B. Classic Client-Side Field-Level Encryption (CSFLE) | Older, stable, supports deterministic + randomized encryption | No equality queries on randomized fields → would force a schema-level decision per field; less ergonomic than QE | Rejected — QE is the successor pattern for this exact workload |
| C. Application-level AES-256-GCM (extend `encryption.ts`) | Zero MongoDB-version constraint; full control over key rotation; we already have this for API keys | Every read/write needs manual encrypt/decrypt; no equality queries (would need hash-on-write + hash-on-query); breaks aggregations | Used as **fallback for non-searchable PII fields** (notes, free-text addresses) — see "Field classification" below |
| D. Atlas Encryption at Rest only (current) | Already enabled, free | Doesn't protect against compromised connection strings | **Not sufficient** — that's the current state and the threat we're closing |

### Field classification

Each PII field gets one of three encryption modes:

**Mode 1 — QE Equality Indexed (need to search by this value):**
- `mobileNumber` — DSA login lookup, applicant lookup. Encrypted with `{ algorithm: 'equality' }` so `findOne({ mobileNumber: enc })` still works after the driver re-encrypts the query.
- `emailAddress` / `email` — same rationale.
- `panNumber` — duplicate-applicant detection during onboarding queries by PAN.

**Mode 2 — QE Randomized (no need to search):**
- `aadhaarNumber` — never queried by value; only displayed back to the owner DSA. Randomized encryption is strictly stronger than deterministic — two records with the same Aadhaar produce different ciphertexts.
- `dateOfBirth` — same rationale.
- `fullName` — display only.

**Mode 3 — Application-level AES-256-GCM via `encryption.ts`:**
- Free-text address fields (when collected) — variable-length, not queried, can use the existing pattern that already works for API keys.
- Notes / comments fields that may incidentally contain PII (DSA-entered notes about applicants) — same approach.

### Key management

**KMS choice: AWS KMS** (matches Atlas's first-class integration; project already needs an AWS account for SEC-8's SES adoption, so this consolidates IAM surface).

**Key hierarchy:**

```
AWS KMS Customer Master Key (CMK)
  └── encrypts → Data Encryption Keys (DEKs) stored in `__keyVault.datakeys` collection
        └── encrypt/decrypt → individual PII field values
```

**Why this hierarchy:** the CMK never leaves AWS KMS; the application never sees it. The DEKs are encrypted blobs in MongoDB; the app calls KMS to decrypt them at startup and caches them in process memory. Rotating a DEK doesn't require re-encrypting any field — only re-wrapping the DEK with a new CMK version. Rotating the CMK is a KMS-side operation, also non-disruptive.

**Key separation:**
- Production DEKs are NEVER usable in staging or dev. Each environment has its own CMK + DEK chain.
- Test fixtures use a separate `TEST_DEK` provisioned at test-suite boot — never touches AWS KMS, never reads real DEKs from prod.

---

## Migration plan

### Phase 0 — Infrastructure (1 day)

- Provision AWS KMS CMK for production (Mumbai region for data-locality compliance).
- Set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_KMS_REGION` / `AWS_KMS_CMK_ARN` env vars in Vercel + dev `.env.example`.
- Install `mongodb-client-encryption` (already a transitive dep — promote to direct).
- Create `src/lib/server/mongoEncryption.ts` — initializes the driver with `AutoEncryptionOptions`, loads DEKs from `__keyVault`, exposes `encryptedClient` alongside the existing `mongo.ts` client.

### Phase 1 — Encryption-aware new writes (1 day)

- Update Mongo client init to use `MongoClient(uri, { autoEncryption: { ... } })` with the encryption schema map (`encryptedFieldsMap`).
- Schema map enumerates the fields-to-encrypt per collection (per the classification above) — driver handles per-write encryption automatically.
- New writes immediately produce ciphertext. Existing rows stay plaintext (drivers handle mixed reads gracefully when the field is `keyVaultNamespace`-aware).

### Phase 2 — Backfill migration (2-3 days)

- Background script `scripts/migratePiiToEncrypted.ts` (run once per environment, idempotent):
  - For each target collection, stream rows with `{ <piiField>: { $type: 'string' } }` (still plaintext).
  - Re-write each row through the encrypted client — the driver encrypts on write.
  - Progress log per 1k rows, resumable via a `_migration.encryption.piiV1` flag on each row.
- Run on a maintenance window or off-peak (writes are blocking).
- Verify: after the run, `db.collection.find({ <piiField>: { $type: 'string' } }).count() === 0` for every target collection.

### Phase 3 — Read path validation (1 day)

- All API routes that read PII go through the encrypted client (which the driver wires up — no per-route changes needed if the client is the singleton).
- Verify each PII-reading endpoint:
  - `/api/auth/check-dsa` returns decrypted mobileNumber
  - `/api/cases/[case_id]` shows applicant details correctly
  - PDF generation (`fileBuilder.ts`) reads PII from snapshots — needs the encrypted client too.
- Pin contract with a CI test: insert a row → confirm `db.collection.findOne(...)` from a RAW unencrypted client returns ciphertext, while the encrypted client returns plaintext.

### Phase 4 — Cleanup + monitoring (1 day)

- Remove the migration script's resumability flag (`_migration.encryption.piiV1`) once verified.
- Add Atlas metrics watch: encryption errors, KMS call failures, DEK cache misses.
- Update CLAUDE.md §3 with pitfalls discovered during implementation (e.g. aggregation pipelines that don't transparently decrypt — `$lookup` on encrypted fields needs special handling).
- Add ADR follow-up entry: "What we discovered during implementation that wasn't in this design."

---

## Consequences

**Enables:**

- DB backup theft / read-access compromise no longer leaks PII in plaintext.
- DPDP Act 2023 + RBI data-protection guidance compliance posture matches what regulators expect.
- Key rotation becomes a KMS operation, not a code release.
- Per-environment key isolation prevents prod-DEK accidents in dev/staging.

**Accepts as trade-offs:**

- **Write latency.** Each encrypted field adds ~5-10ms per write call (KMS roundtrip is cached for the DEK; only the AES encrypt is in the hot path). Bulk inserts during form submission may go from ~50ms to ~80-100ms. Acceptable for the data class.
- **No range queries on encrypted fields.** Today we don't range-query PII (no "born between 1980 and 1990" requirement). If this ever changes, it requires a schema change OR a pre-computed range tag with its own encryption.
- **Aggregation pipeline complexity.** `$lookup`, `$group` on encrypted fields require careful design — sometimes a hash-of-encrypted-value index is needed. Per-endpoint discovery during Phase 3.
- **Key loss = data loss.** If both AWS KMS CMK AND all DEK snapshots are lost, encrypted data is irrecoverable. Mitigation: KMS multi-region replication, scheduled DEK export to encrypted offline storage.
- **Cost.** AWS KMS charges per-request after a free tier. Estimate at current write volume: ~$5-15/month. Negligible.
- **One-week implementation cost.** Engineering effort during a feature-development window.

**Reversal path:**

QE-encrypted fields can be migrated back to plaintext by running the inverse migration script (decrypt → write back). The decision is reversible at any time, modulo the data-protection regression that would re-introduce.

**Hard prerequisites before starting impl:**

1. **SEC-7 (.env credential rotation) MUST be in flight or done.** Today's `MONGODB_URI` was historically exposed in git. Starting FLE without rotating credentials means historical credential leaks still reach the new ciphertext DB — defeating most of the value of FLE.
2. **Production maintenance window scheduled** for Phase 2 backfill (write-blocking against the snapshot collection; estimate ~30-60 min for current data volume).
3. **AWS account + KMS region locked in** (Mumbai for India data-locality).

---

## Open decisions for the impl session

These need to be resolved BEFORE writing the first encryption-aware write:

1. **`fullName` — Mode 2 (randomized) or Mode 1 (equality)?** If DSA search needs to find applicants by name match (substring or exact), Mode 1 is required. Today's search-by-name endpoints are: confirm via `grep -rn "fullName.*\$" src/routes/api/cases/`.
2. **`Cases` collection PII strategy** — the case docs embed snapshots. Should we encrypt the embedded fields (more granular) OR encrypt the snapshot payload as a single blob (simpler, but loses queryability across cases)? Recommend: encrypt at the field level, per Mode 2, to preserve the existing cross-case analytics queries.
3. **PDF generation read path** — the PDF builder reads PII to render documents. Does it go through the encrypted client today? If the file-builder runs in a separate process (cron, webhook), it needs its own KMS-aware init.
4. **Test fixture strategy** — do we provision a real TEST_DEK in each test run, or mock the encryption layer entirely? Recommend: provision a real test DEK so the end-to-end encrypt/decrypt path is exercised; mocking risks letting encryption errors slip through.

---

## Why not just adopt CSFLE manually field-by-field

The catalog item read "Use MongoDB Atlas FLE." Two refinements after design:

- **QE is the modern API.** MongoDB recommends QE over the older CSFLE for new deployments since MongoDB 7.0. Atlas supports QE out of the box. CSFLE's "deterministic vs randomized" choice is more error-prone than QE's "equality vs randomized" naming.
- **Mixed-mode (some fields QE, some application-level AES) is intentional, not a compromise.** QE for queryable PII (mobile, email, PAN) gets us the search semantics we need. App-level AES for free-text fields (notes, addresses) is simpler and reuses the existing `encryption.ts` infrastructure. Two encryption modes is more code than one; for the right reasons it's worth it.

---

## Next steps (when this ADR moves from Proposed → Accepted)

1. Confirm AWS KMS region + IAM roles with the team.
2. Provision the prod CMK + DEK keyvault collection.
3. Open the `mongodb-fle.md` protocol file in `.claude/protocols/` with the Phase 0-4 checklist as concrete commands.
4. Begin Phase 0 in a feature branch off `main`.
