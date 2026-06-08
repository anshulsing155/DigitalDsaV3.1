# ADR-0009 — CSFLE Explicit Encryption Over Queryable Encryption

**Status**: Accepted
**Date**: 2026-05-19
**Session**: 2026-05-19 (SEC-2 implementation)
**Supersedes**: ADR-0005 §"Key management" only (field classification + threat model + migration phases all remain valid)

## Context

ADR-0005 (2026-05-15) chose MongoDB Atlas Queryable Encryption (QE) with AWS KMS Mumbai as the SEC-2 implementation strategy. The decision was design-only — no implementation work had begun. When SEC-2 implementation started on 2026-05-19, two findings re-opened the KMS / encryption-mode question:

1. **QE requires `crypt_shared` native binary on Vercel.** MongoDB's auto-encryption (which QE depends on) needs a Shared Library binary (`mongo_crypt_v1.so`) at runtime — approximately 30 MB. Vercel Serverless Functions support bundling native files via `includeFiles` in `vercel.json`, but the function bundle has a 250 MB compressed limit. The platform's current bundle was already substantial (Svelte runtime, Tailwind, PDF generation libs, etc.) and adding the binary risked pushing it over. Even if it fit, the deployment complexity (downloading the right binary per runtime OS, committing it to the repo, configuring the path env var) added a tricky operational surface.

2. **Range queries on encrypted PII fields are never needed.** The PII surface (name, mobile, PAN, Aadhaar, DOB, email, address) is consumed by equality lookups only: "find DSA by mobile" (login), "find admin by email" (login), "duplicate-check PAN before signup". The application never asks "find users whose mobile is between X and Y" or "list applicants with DOB after 1990". QE's only material advantage over CSFLE is range queries on encrypted fields — that advantage delivers nothing for our use case.

Additionally, AWS KMS Mumbai provisioning was partner-blocked (no AWS account was set up at session time), which would have delayed SEC-2 implementation by weeks. The user wanted to ship SEC-2 immediately without waiting on infrastructure procurement.

## Decision

Pivot SEC-2 from MongoDB Atlas Queryable Encryption to **MongoDB Client-Side Field Level Encryption (CSFLE) in explicit mode**, with the **local KMS provider** carrying a Customer Master Key (CMK) injected as a Vercel secret. AWS KMS Mumbai migration via `ClientEncryption.rewrapManyDataKey` is the planned upgrade path post-beta.

Specifically:

- **CSFLE explicit mode** — application code calls `clientEncryption.encrypt(value)` and `clientEncryption.decrypt(value)` directly on specific fields. No schema map, no `crypt_shared` binary required, no `mongocryptd` sidecar.

- **Deterministic encryption** for fields we look up by value (mobile, email, PAN, rmOfficialEmail). Same plaintext always produces the same ciphertext, so `findOne({ mobileNumber: encryptedX })` still works.

- **Random encryption** for fields we never query by value (name, aadhaar, DOB, address, GST). Stronger security; cannot be queried.

- **Local KMS provider** with a 96-byte CMK base64-encoded in `QE_LOCAL_MASTER_KEY` (Vercel secret). Separate CMK per environment (Production / Preview / Dev). CMK backed up in 1Password separately from Vercel.

- **AWS KMS Mumbai upgrade path** — when AWS account is provisioned, run `ClientEncryption.rewrapManyDataKey({}, { provider: 'aws', masterKey: { key: ARN, region: 'ap-south-1' } })`. This re-wraps each DEK with the AWS CMK; no field data is re-encrypted. Online operation; no downtime; rollback by re-running the rewrap targeting `local`.

- **Encryption gating** — `CSFLE_ENABLED='true'` env var gates the whole system. When unset, helpers passthrough plaintext. This lets code deploy safely BEFORE the operator runs the DEK init script.

## Consequences

**Enables:**
- SEC-2 ships immediately without waiting on AWS account provisioning.
- No risk of breaking the Vercel bundle-size limit. No deployment complexity around the native binary.
- Standard MongoDB driver (no `crypt_shared` library, no `mongocryptd` sidecar) — simpler operational surface and faster cold starts.
- Per-collection helpers (`encryptUserPii`, `decryptUserPii`) provide a clean abstraction; consumer routes don't think about which field is which.
- Phase B routes can deploy with encryption code gated off, then activated cluster-by-cluster when the operator runs the init script.

**Prevents (vs QE):**
- **Range queries on encrypted PII fields** — we lose the ability to write `{ mobileNumber: { $gt: X } }` against encrypted data. Not currently used; if a future feature needs it, the affected field can be moved to plaintext or the query moved to a separate plaintext index.
- **Auto-encryption** — application code is responsible for calling encrypt/decrypt explicitly. We mitigate via collection-shaped helpers (`encryptUserPii`/`decryptUserPii`) that walk the doc and only touch registry fields.
- **`formSnapshots.payload` opaque-blob field-level encryption** — this was already unsolvable for QE (dynamic field paths), still unsolvable for CSFLE. Future work: a separate payload-key walker that encrypts known PII paths inside the blob. Documented in SEC-2-CSFLE-PLAN.md §7.

**Tradeoffs accepted:**
- **CMK is not hardware-protected.** Local KMS stores the CMK in a Vercel secret (env var) rather than an HSM-backed AWS KMS key. Compromise requires both a Vercel dashboard breach AND a MongoDB Atlas breach simultaneously. Acceptable for current beta risk profile; AWS migration mitigates post-launch.
- **Every PII-writing route must remember to call `encryptUserPii`.** A new contributor who forgets will silently store plaintext. We mitigate via per-collection helpers (single chokepoint per write), CI grep recipes, and the encryption gate (when off, plaintext is the safe default).
- **MongoDB Memory Server cannot test the encrypted path.** Unit tests use passthrough mode only. Real-encryption integration tests need a live Atlas dev cluster — separate nightly CI workflow, not in the unit grid.

## Alternatives Considered

- **Stay with Atlas QE + AWS KMS (ADR-0005 original).** Rejected because: (a) AWS account was unavailable at session start, blocking implementation for weeks; (b) `crypt_shared` binary risked Vercel bundle limit; (c) QE's range-query advantage delivers no value for our PII surface.

- **Atlas QE + local KMS.** Rejected because the `crypt_shared` binary problem persists regardless of KMS choice — the binary is required by QE's auto-encryption layer, not by the KMS provider.

- **Application-level AES-256-GCM via existing `src/lib/server/encryption.ts`.** Rejected because: (a) we'd lose deterministic encryption (every encryption operation generates a fresh IV → no equality queries possible); (b) we'd reimplement key management ourselves rather than delegating to MongoDB's mature CSFLE infrastructure; (c) DEK rotation would require custom code rather than one driver call. The existing `encryption.ts` is still appropriate for non-queryable secrets like API key storage (used by `PolicyEngineApiKeys` route).

- **Defer SEC-2 until AWS account is provisioned.** Rejected because the user explicitly chose to unblock encryption immediately and accept the local-KMS-now → AWS-later migration cost.

## References

- [ADR-0005 — MongoDB Field-Level Encryption](0005-mongodb-field-level-encryption.md) — supersedes the KMS-choice section only; field classification + threat model + migration phases all remain valid
- [docs/specs/SEC-2-CSFLE-PLAN.md](../specs/SEC-2-CSFLE-PLAN.md) — active implementation plan
- [docs/specs/SEC-2-ATLAS-QE-PLAN.md](../specs/SEC-2-ATLAS-QE-PLAN.md) — superseded; one-page redirect to the CSFLE plan
- [CHANGELOG.md 2026-05-19 entry](../CHANGELOG.md) — Phase A+B implementation narrative
- [MongoDB CSFLE Quick Start](https://www.mongodb.com/docs/manual/core/csfle/)
- Vercel Function bundle-size limit: 250 MB compressed (documented in Vercel platform limits)
