# SEC-2 — Atlas Queryable Encryption Plan (SUPERSEDED)

> **Status**: Superseded 2026-05-18. See [SEC-2-CSFLE-PLAN.md](SEC-2-CSFLE-PLAN.md) for the current implementation plan.
>
> **Why we pivoted**: MongoDB Queryable Encryption requires shipping a ~30 MB native binary (`crypt_shared`) with the Vercel Serverless Function. The Vercel function bundle has a 250 MB compressed limit, and the binary's deployment complexity was the single highest-risk item in the original plan. CSFLE explicit encryption needs no native binary, works on Vercel out of the box, and provides everything we actually need (we never range-query PII fields — only equality lookups, which deterministic CSFLE supports).
>
> **What survives from this plan**:
> - The field inventory (which fields are PII) — carried into the CSFLE plan
> - The local-KMS-first / AWS-KMS-later strategy — carried into the CSFLE plan
> - The 4-phase migration shape (A: infra → B: encrypt new writes → C: backfill → D: cleanup) — carried into the CSFLE plan
>
> **What does not carry over**:
> - The `encryptedFieldsMap` JSON schema (QE-specific)
> - The `crypt_shared` binary deployment plan (not needed for CSFLE)
> - The `formSnapshots.payload` opaque-blob gap (CSFLE explicit handles nested-path PII via a key-name walk — see CSFLE plan §7)
> - The bsonType-uniformity audit (QE-specific; CSFLE explicit accepts any input type)
>
> **Kept for the audit trail**: the original analysis below documents why we considered QE, what we found, and what made the decision. Future readers debating "should we move to QE?" can read this to understand the trade-off.

---

*The full original Atlas QE plan content has been replaced by this superseded notice. See [SEC-2-CSFLE-PLAN.md](SEC-2-CSFLE-PLAN.md) for the active design. If you need the original analysis text, recover it from git history at commit prior to this supersession.*
