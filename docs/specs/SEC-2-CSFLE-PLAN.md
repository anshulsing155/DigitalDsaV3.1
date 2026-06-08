# SEC-2 — CSFLE Explicit Encryption Implementation Plan

**Status**: Implementation-ready (supersedes the earlier Queryable Encryption plan)
**Date**: 2026-05-18
**Roadmap item**: SEC-2 in `ARCHITECTURE-EVOLUTION.md` — P0
**Pivot reason**: MongoDB Queryable Encryption requires shipping a ~30 MB native binary (`crypt_shared`) with the Vercel Serverless Function. CSFLE explicit encryption needs no such binary, fits Vercel cleanly, and provides everything we actually need (we never range-query PII fields).
**Companion docs**:
- [SEC-2-ATLAS-QE-PLAN.md](SEC-2-ATLAS-QE-PLAN.md) — superseded; kept as the historical record of why we pivoted
- [DATA-2-CONSENTED-VAULT-SPEC.md](DATA-2-CONSENTED-VAULT-SPEC.md) — encryption dependency
- [DATA-1-LEAD-ATTRIBUTION-SPEC.md](DATA-1-LEAD-ATTRIBUTION-SPEC.md) — no encryption dependency (bucketed values are non-PII by design)
- [ADR-0005](../adr/0005-mongodb-field-level-encryption.md) — original SEC-2 design (field classification, threat model, phase naming all still valid; KMS-choice section superseded by §5 below)

---

## Section Index

1. [What CSFLE explicit encryption is](#1-what-csfle-explicit-encryption-is)
2. [Why we picked it](#2-why-we-picked-it)
3. [PII field inventory](#3-pii-field-inventory)
4. [Implementation pattern](#4-implementation-pattern)
5. [Key management — local KMS now, AWS later](#5-key-management)
6. [Migration plan](#6-migration-plan)
7. [Form-snapshot payload — PII-only encryption](#7-form-snapshot-payload)
8. [Query implications](#8-query-implications)
9. [Test plan](#9-test-plan)
10. [Env vars](#10-env-vars)
11. [Risks and open questions](#11-risks-and-open-questions)

---

## 1. What CSFLE Explicit Encryption Is

**Client-Side Field Level Encryption (CSFLE)** has been in MongoDB since version 4.2 (2019). It encrypts specific fields in the application before they reach the database — the database only sees ciphertext for those fields.

Two CSFLE modes exist:
- **Automatic mode** — the driver intercepts queries based on a schema map. Requires `mongocryptd` or `crypt_shared` (the same 30 MB binary as Queryable Encryption).
- **Explicit mode** — the application code directly calls `clientEncryption.encrypt(value)` and `clientEncryption.decrypt(value)` for specific fields. **No binary needed.**

We use **explicit mode**.

### Where the keys live

- **DEK (Data Encryption Key)** — one per field type (e.g., one for `mobileNumber`, one for `panNumber`). Stored in a Key Vault collection in MongoDB.
- **CMK (Customer Master Key)** — encrypts the DEKs. Stored in a KMS provider. For us: local KMS with a 96-byte CMK in a Vercel secret env var (later: AWS KMS Mumbai).

### Two encryption algorithms

- **Deterministic** — same input always produces the same ciphertext. Allows equality queries: `findOne({ mobile: '9876543210' })` still works. Use for fields we look up by value.
- **Random** — same input produces different ciphertext each time. Stronger security, but cannot be queried. Use for fields we never look up directly.

---

## 2. Why We Picked It

| Question | CSFLE explicit | Queryable Encryption |
|---|---|---|
| Native binary needed? | **No** | Yes (~30 MB) |
| Works on Vercel Serverless? | **Yes, immediately** | Depends on bundle size |
| Range queries on encrypted fields? | No | Yes |
| Equality queries on encrypted fields? | Yes (deterministic mode) | Yes |
| Maturity | Production since 2019 | Production since 2023 |
| KMS support | All major providers | All major providers |

We **never range-query PII fields** (you don't search "find users with PAN between X and Y"). We **do equality-query** them (login by mobile, duplicate-check by PAN). Deterministic CSFLE handles both.

---

## 3. PII Field Inventory

Per user direction 2026-05-18: encrypt the PII identifiers; leave non-PII fields plain so they remain analyzable.

### Encrypt (deterministic — equality-queryable)

| Field | Where stored | Why deterministic |
|---|---|---|
| `mobileNumber` | DSA, RM, User, Admin collections | Login lookup, duplicate-check |
| `panNumber` | DSA, RM, applicant data | Duplicate-check |
| `email` | DSA, RM, User, Admin | Login lookup |
| `rmOfficialEmail` | RM | Bank identity lookup |

### Encrypt (random — not queryable, stronger)

| Field | Where stored |
|---|---|
| `name` / `fullName` / `firstName` / `middleName` / `lastName` | All user collections |
| `aadhaarNumber` | RM, applicant data |
| `dateOfBirth` | applicant data |
| `currentAddress` / `permanentAddress` | applicant data |
| `alternateMobile` | applicant data (when present) |
| `gstNumber` | DSA, RM |

### Don't encrypt (non-PII — stay analyzable)

Loan amount, property price, employment type, loan type, lender selected, case stage, dates of events, ROI, tenure, FOIR/LTV computations, sanctioned amount, etc.

---

## 4. Implementation Pattern

### One-time setup

New file: `src/lib/server/encryption/csfleClient.ts`

Responsibilities:
- Load the CMK (`QE_LOCAL_MASTER_KEY` env var — 96 bytes base64).
- Build a `ClientEncryption` instance using the unencrypted MongoDB client.
- Configure key vault namespace: `encryption.__keyVault`.
- Create DEKs at startup if absent (one per logical field name — `dsa-mobile-key`, `pan-key`, `aadhaar-key`, etc.).

### Encrypt before write

```typescript
import { csfle } from '$lib/server/encryption/csfleClient';

// Before inserting a DSA application
const encryptedMobile = await csfle.encrypt(rawMobile, {
  keyAltName: 'mobile-key',
  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
});
const encryptedPan = await csfle.encrypt(rawPan, {
  keyAltName: 'pan-key',
  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
});
const encryptedName = await csfle.encrypt(rawName, {
  keyAltName: 'name-key',
  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
});

await DsaApplications.insertOne({
  mobileNumber: encryptedMobile,
  panNumber: encryptedPan,
  fullName: encryptedName,
  // ... plain fields unchanged
});
```

### Decrypt on read

```typescript
const dsa = await DsaApplications.findOne({ mobileNumber: encryptedMobile });
// findOne with deterministic-encrypted value works because the same input
// always produces the same ciphertext.

if (dsa) {
  dsa.mobileNumber = await csfle.decrypt(dsa.mobileNumber);
  dsa.panNumber   = await csfle.decrypt(dsa.panNumber);
  dsa.fullName    = await csfle.decrypt(dsa.fullName);
}
```

### Wrapper helpers

To avoid repeating encrypt/decrypt across ~80 API routes, build per-collection helper modules:

- `src/lib/server/encryption/dsaCrypto.ts` → `encryptDsa(rawDoc)`, `decryptDsa(encDoc)`
- `src/lib/server/encryption/rmCrypto.ts` → `encryptRm`, `decryptRm`
- `src/lib/server/encryption/userCrypto.ts` → `encryptUser`, `decryptUser`
- etc.

Each helper knows which fields are PII for that collection and which algorithm (deterministic vs random). API routes call one function on write, one on read — no inline crypto.

---

## 5. Key Management

### CMK generation (one-time per environment)

```bash
node -e "require('crypto').randomBytes(96).toString('base64')" | tr -d '\n'
```

Store the output as `QE_LOCAL_MASTER_KEY` in Vercel project env vars. Independent keys per environment (prod / preview / dev). Back up the CMK in a password manager (1Password / Bitwarden) separately from Vercel — if both are compromised simultaneously, encrypted data is recoverable by an attacker with MongoDB access.

### DEK lifecycle

DEKs live in `encryption.__keyVault`. The setup script creates one DEK per logical field name (e.g., `mobile-key`, `pan-key`). DEKs are themselves encrypted by the CMK — useless without it.

| Item | Rotation trigger | Procedure |
|---|---|---|
| CMK | Annual, or suspected Vercel breach | Generate new CMK → `ClientEncryption.rewrapManyDataKey({})` → swap env var → redeploy. No field data re-encrypted. |
| DEKs | Only if individually suspected | Re-provision; requires re-encrypting that field across all rows. |

### Migration to AWS KMS later

When AWS KMS Mumbai is provisioned, run `ClientEncryption.rewrapManyDataKey({}, { provider: 'aws', masterKey: {...} })` to re-wrap each DEK with the AWS CMK. No field data is re-encrypted. Online operation, no downtime.

---

## 6. Migration Plan

### Phase A — Infrastructure (1 day)

1. Generate CMK per environment. Store in Vercel + password manager.
2. Install `mongodb-client-encryption` (`pnpm add mongodb-client-encryption`).
3. Write `src/lib/server/encryption/csfleClient.ts`.
4. Write a one-time setup script `scripts/sec2-init-deks.ts` that creates all DEKs in the key vault if absent. Idempotent.
5. Deploy to preview. Confirm CMK loads, DEKs create, no runtime errors. No PII encrypted yet.

### Phase B — Encrypt new writes (2 days)

1. Write per-collection helper modules (`dsaCrypto.ts`, `rmCrypto.ts`, etc.) — one per high-PII collection.
2. For each PII-writing API route, wrap the insert with the corresponding `encryptXxx()` helper. Priority order: DSA auth routes → RM auth routes → applicant data writes (Case mutations) → admin → public form submissions.
3. New writes produce ciphertext. Existing plaintext rows remain — the explicit decrypt helpers handle both transparently (if the value is already a BSON Binary subtype 6, decrypt; if it's a raw string/number, pass through).
4. Verify: insert a new DSA → confirm `db.DsaApplications.findOne()` via mongosh returns ciphertext blobs for the PII fields.

### Phase C — Backfill (2-3 days)

1. Write `scripts/sec2-backfill.ts` — streams rows where PII fields are still plaintext, re-writes each through the encrypt helper.
2. Run during off-peak. Progress log every 1,000 rows. Resumable.
3. Order: `userApplications` → `DsaApplications` → `rmApplications` → `adminUsers` → `leads` → `communicationLogs` → `formSnapshots` (see §7).
4. After each collection: assert no plaintext PII rows remain (`find({ mobileNumber: { $type: ['int', 'string'] } }).count() === 0`).

### Phase D — Cleanup (half a day)

1. Remove the pass-through fallback from the decrypt helpers (post-backfill, everything is ciphertext).
2. CI test: assert no plaintext PII can possibly survive in target collections.
3. Update `docs/ARCHITECTURE-EVOLUTION.md` SEC-2 status to ✅.
4. Write ADR-0009 to record the CSFLE pivot.

---

## 7. Form-Snapshot Payload — PII-Only Encryption

The `formSnapshots.payload` field is a `Record<string, any>` blob. Under the user's direction (2026-05-18, "only PII sealed"), we encrypt the PII keys inside the blob — not the entire blob.

### PII field registry

A constant in `src/lib/server/encryption/payloadPiiKeys.ts`:

```typescript
export const PAYLOAD_PII_KEYS = new Set([
  'fullName', 'firstName', 'middleName', 'lastName',
  'mobileNumber', 'alternateMobile',
  'panNumber',
  'aadhaarNumber',
  'dateOfBirth',
  'email',
  'currentAddress', 'permanentAddress',
  // Add per applicant — these live nested under applicants[].*
]);
```

### Encrypt before snapshot insert

A helper `encryptPayloadPii(payload)` walks the payload object recursively. For each key in `PAYLOAD_PII_KEYS`, encrypt the value with the appropriate DEK and algorithm (mobile/email/PAN → deterministic; name/aadhaar/DOB/address → random). Return a new payload with PII values replaced by ciphertext.

### Decrypt on snapshot read

`decryptPayloadPii(payload)` is the inverse walk. Used by every server-side reader of snapshot payloads (PDF generation, lender submission, evaluation engine).

### Why this works

- The form schema is stable enough that the PII key names rarely change. When a new PII field is added to the form, the developer adds it to `PAYLOAD_PII_KEYS` — this is a one-line change.
- Non-PII fields (loan amount, property type, employment, lender selection, etc.) stay plain. The evaluation engine, PDF builder, and analytics can read them directly.
- The recursive walk handles nested structures (`applicants[].fullName`, etc.).

### Gotcha to guard against

If a new PII field lands in the form schema but is NOT added to `PAYLOAD_PII_KEYS`, it will be silently stored as plaintext. Mitigation: add a CI test that grep-scans form question definitions for known PII bindsTo keys and asserts each is in the registry. Pitfall #44 candidate; we'll add it to CLAUDE.md §3 after SEC-2 ships.

---

## 8. Query Implications

### Queries that work without changes

- `findOne({ mobileNumber: rawValue })` → driver receives the raw value, the application encrypts the comparison value via the same DEK before the query goes out. Works for any deterministic-encrypted field.
- `find({ email: rawValue })` → same.

### Queries that break

- `find({}).sort({ fullName: 1 })` — sort on randomly-encrypted field is meaningless. **Audit before Phase B**: confirm no API route sorts by `fullName`, `aadhaarNumber`, `dateOfBirth`, `currentAddress`, or `permanentAddress`. If found, sort must move to application memory after decryption.
- `{ mobileNumber: { $regex: /^9/ } }` — regex on encrypted field is impossible. Audit: expected 0 matches.
- `$group` by `fullName` in aggregation — not supported. Expected 0 use.
- `$lookup` joining on PII fields across collections — supported only if both collections use the same DEK for that field. We use one DEK per logical field name across collections, so this works.

### New index strategy

Deterministic-encrypted fields with existing unique indexes (e.g., `{ mobileNumber: 1, unique: true }` on `DsaApplications`) continue to work — MongoDB indexes ciphertext just fine, and deterministic encryption preserves uniqueness across the same DEK. No index drops needed. This is a major simplification vs the QE plan.

---

## 9. Test Plan

### Unit tests (no MongoDB needed)

| Test | Asserts |
|---|---|
| `csfleHelpers.test.ts` | `encryptDsa(plainDoc) → encDoc` produces ciphertext on PII fields, leaves non-PII unchanged |
| `payloadPiiWalk.test.ts` | `encryptPayloadPii` walks nested arrays/objects, encrypts every key in `PAYLOAD_PII_KEYS`, leaves rest |
| `decryptPassthrough.test.ts` | During Phase B/C window, `decryptDsa` accepts both ciphertext (decrypts) and plaintext (passes through) |
| `cmkFormat.test.ts` | `QE_LOCAL_MASTER_KEY` decodes to exactly 96 bytes; helpful failure if env var is malformed |

### Integration tests (against test Atlas cluster)

| Test | Asserts |
|---|---|
| `csfleRoundtrip.test.ts` | Insert encrypted → findOne by deterministic field → decrypt → equals original |
| `csfleSnapshotPii.test.ts` | Encrypt a sample formSnapshot payload, decrypt, deep-equal to original |
| `csfleNoBinaryInBundle.test.ts` | Static-scan the build output: confirm no `mongo_crypt_v1` binary is bundled (regression net against accidentally pulling in QE) |

### CI strategy

Unit tests run in every PR. Integration tests require an Atlas dev cluster + test CMK env vars; run nightly + before any production deploy.

---

## 10. Env Vars

Add to `docs/specs/ENV-VARIABLES.md`:

| Variable | Required | Purpose |
|---|---|---|
| `QE_LOCAL_MASTER_KEY` | Yes (when CSFLE_ENABLED=true) | Base64-encoded 96-byte CMK. Generate per environment. Never commit. |
| `CSFLE_ENABLED` | No | Gate flag. Unset / `'false'` = encryption helpers no-op (passthrough). Lets Phase A deploy with code present but inactive. |
| `CSFLE_KEY_VAULT_NAMESPACE` | No | Override default `encryption.__keyVault`. |

Note: we reuse `QE_LOCAL_MASTER_KEY` (rather than renaming to `CSFLE_LOCAL_MASTER_KEY`) so a later swap to AWS KMS doesn't force another env var change. The CMK is provider-agnostic — same 96 bytes work for local and AWS.

---

## 11. Risks and Open Questions

**Risk 1 — Routes that forget to encrypt.** Explicit mode means every write site is responsible for calling `encryptXxx()`. A new API route added by a future contributor could store plaintext PII. Mitigation:
- One helper per collection (forces a single chokepoint per write path).
- CI grep: assert every `.insertOne(`/`.insertMany(`/`.updateOne(`/`.findOneAndUpdate(` on PII collections imports its `encryptXxx` helper.
- Code review checklist.

**Risk 2 — Reads that forget to decrypt.** Same shape as Risk 1 but on the read path. A reader who calls `findOne()` directly without `decryptXxx()` will get ciphertext blobs back, which any UI rendering will display as garbage. This fails visibly (not silently) — easier to catch than encryption misses.

**Risk 3 — `mongodb-client-encryption` ships its own small native binding.** Not the 30 MB `crypt_shared`, but a few-MB binding shipped by the npm package. Verify Vercel bundle still fits comfortably (it should — this is a standard MongoDB driver concern that thousands of Vercel apps already handle).

**Risk 4 — PII field registry drift on the form-snapshot payload.** Documented in §7. Mitigation: CI test linking form questions to `PAYLOAD_PII_KEYS`.

**Risk 5 — Phase B/C window writes plaintext under a different code path.** During the migration window, a stale dev branch could merge with an un-helperized write site. Mitigation: backfill (Phase C) is idempotent and can run repeatedly; final assertion in Phase D ensures no plaintext remains.

**Open question 1**: Should `fullName` be deterministic (equality-queryable, allows admin search "find DSA by name") or random (stronger, no name search)? Currently the admin tool has no name-search functionality. Default: random. If a search feature is added later, re-encrypt that field deterministically — one-time backfill, no other code changes.

**Open question 2**: `deletedDsa`, `deletedRm`, `deletedUsers` archive collections inherit plaintext PII from before encryption. Add to the Phase C backfill explicitly.

**Open question 3**: Race condition during Phase B when an encrypt-helper write goes out simultaneously with a non-helper write from a stale Vercel deployment. Vercel atomic deploys make this window short (seconds). Acceptable.

---

## What Changes vs the Earlier QE Plan

| Topic | QE Plan (superseded) | CSFLE Plan (this doc) |
|---|---|---|
| Native binary on Vercel | Required (~30 MB) | Not needed |
| Form-snapshot `payload` PII | Unsolvable for QE (dynamic paths) | Handled by `payloadPiiKeys.ts` walk |
| Index conflicts on unique fields | Required dropping + recreating | No changes needed |
| Range queries | Supported | Not supported (we don't need them) |
| `mobileNumber` bsonType audit | Needed (QE rejects mismatched type) | Not needed (explicit encrypt accepts any input) |
| Phase count | 4 (A/B/C/D) | 4 (A/B/C/D — same structure) |
| Time estimate | 1 week + Vercel-binary risk | ~5 days, no Vercel-binary risk |

---

## References

- [ADR-0005](../adr/0005-mongodb-field-level-encryption.md) — original SEC-2 design (field classification still valid; KMS-choice section superseded)
- [ADR-0006](../adr/0006-data-segregation-and-sequencing.md) — sequencing: SEC-2 unblocks DATA-2; DATA-1 does not depend on SEC-2 (bucketed values are non-PII)
- [`src/lib/database/mongo.ts`](../../src/lib/database/mongo.ts) — MongoClient wiring; add `csfleClient.ts` alongside
- [MongoDB CSFLE Quick Start](https://www.mongodb.com/docs/manual/core/csfle/) — driver setup reference
- [Explicit Encryption Guide](https://www.mongodb.com/docs/manual/core/csfle/fundamentals/manual-encryption/) — confirms no `crypt_shared` needed
- [SEC-2-ATLAS-QE-PLAN.md](SEC-2-ATLAS-QE-PLAN.md) — historical record of why we pivoted
