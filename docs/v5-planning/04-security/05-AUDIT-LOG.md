---
type: security
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Tamper-Evident Audit Log

## The commitment

Every mutating action in V5 is logged. Logs are append-only, cryptographically chained, exportable for independent verification.

This delivers two trust properties:
1. **Accountability** — every change has an actor, timestamp, and before/after
2. **Detectability** — tampering (deletion, backdating) is mathematically detectable

## What gets logged

| Event | Examples |
|---|---|
| Customer events | created, updated, archived, marked-for-erasure |
| Case events | stage transition, lender added, document uploaded |
| Conversation events | sent, received, attached-to-case |
| Commission events | created, approved, received, disputed |
| Consent events | granted, revoked |
| Auth events | login, logout, role-switched, password-changed |
| Capability events | enabled, disabled, bundle-changed |
| Admin events | tenant created, plan changed, support intervention |
| Decryption events | who decrypted what field of what record, when (rate-limited; bulk patterns alerted) |

## What does NOT go in audit

- Read-only views (browsing the dashboard)
- Search queries (separately logged with HMAC of query, not plaintext)
- Hover/scroll telemetry (separate product analytics)

## The schema

```typescript
interface AuditEvent {
  _id: ObjectId;
  org_id: ObjectId;
  actor_user_id: ObjectId | null;        // null for system events
  actor_kind: 'user' | 'system' | 'cron' | 'api_key';
  event_type: string;                    // e.g., 'customer.created', 'case.stage_transition'
  subject_kind: 'customer' | 'case' | 'conversation' | /* ... */;
  subject_id: ObjectId;
  before?: Record<string, unknown>;      // snapshot of changed fields before (Loggable only)
  after?: Record<string, unknown>;       // snapshot after (Loggable only)
  metadata?: Record<string, unknown>;    // additional context
  ip_address?: string;                   // for auth events
  user_agent_hash?: string;              // hashed
  created_at: Date;

  // Chain fields (set on insert, never updated)
  prev_event_hash: string;               // SHA-256 of previous event's content_hash
  content_hash: string;                  // SHA-256 of this event's stable canonical form
}
```

**`before` and `after` snapshot only Loggable fields.** Encrypted fields are excluded — we record "the mobile changed" not "the old mobile was X."

## The chain

Each new event references the previous event's `content_hash` as its `prev_event_hash`. The chain forms a hash list:

```
event_1 (content_hash = H1, prev_event_hash = "GENESIS")
   ↓
event_2 (content_hash = H2, prev_event_hash = H1)
   ↓
event_3 (content_hash = H3, prev_event_hash = H2)
   ↓
...
```

If any event is mutated or deleted, the chain breaks at that point — every subsequent event's `prev_event_hash` mismatches the recomputed previous hash.

## Daily Merkle root

At end of each day (IST midnight), a Merkle tree is computed over that day's events:

```
                        Merkle Root (R_day)
                       /                  \
                     ...                  ...
                    /   \                /   \
                  H1    H2             H3    H4
                 / |    | \           / |    | \
              ev1 ev2  ev3 ev4    ev5 ev6  ev7 ev8
```

The Merkle root is:
1. **Stored** in `audit_merkle_roots` collection
2. **Anchored** to S3 with a versioned filename: `audit-roots/2026-09-15.json`
3. **Optionally published** to a public log (e.g., a public S3 bucket or a public commit in a separate repo) — this is a future Phase 2B step

A customer (DSA) can request a Merkle proof for any event in their org — they receive the leaf + sibling hashes up to the root, and verify independently.

## Verification API

`/api/internal/audit/verify-chain` — given a start and end timestamp, recompute chain hashes for that range and report any breaks.

`/api/internal/audit/export` — exports a verifiable archive: events JSON + per-day Merkle roots + signature.

These run nightly as a self-check; any chain break alerts owner immediately.

## Decryption logging

Every CSFLE decryption (when a service reads a PII field) is logged:

```typescript
interface DecryptionEvent {
  _id: ObjectId;
  org_id: ObjectId;
  actor_user_id: ObjectId;
  field_kind: 'customer.mobile' | 'customer.full_name' | 'customer.pan' | /* ... */;
  subject_id: ObjectId;
  purpose: 'display' | 'whatsapp_dispatch' | 'export' | 'support_intervention';
  request_id: string;            // ties to HTTP request
  created_at: Date;
}
```

Rate-limited: a single user decrypting >100 customers in an hour triggers an alert. Bulk decryption patterns are investigated.

## Audit retention

| Event type | Retention |
|---|---|
| Audit events | 7 years (DSA compliance; can be longer if regulator requires) |
| Decryption events | 1 year |
| Merkle roots | 7 years |

Audit data is excluded from data subject erasure — it's record-keeping required for compliance. We disclose this in privacy notice.

## How the DSA sees their audit

In settings → "Activity log," the DSA sees a human-readable view of audit events affecting their org:

> 2026-09-15 14:23 — You added a new lender contact for HDFC Bank
> 2026-09-15 14:21 — Engine evaluated case CASE-1283 for Priya Singh
> 2026-09-15 14:18 — Aadhaar verified for Priya Singh (last 4: 1234)

Decryption events show:

> 2026-09-15 11:02 — DigitalDSA support viewed your customer Priya Singh's profile while handling ticket #4521

That level of transparency — "you can see when our staff looked at your data" — is the trust architecture commitment from §13.4. Even when our staff have legitimate access, the access is visible.

## Implementation phases

| Phase | What |
|---|---|
| Sprint 0 | Basic audit logging — chain field present but verification not enforced |
| Sprint 6 | Merkle root computation daily |
| Sprint 16 (Phase 2B) | Verification API, public log anchoring, DSA-facing audit view, support-intervention transparency |

## Related docs

- [01-PII-DISCIPLINE.md](01-PII-DISCIPLINE.md)
- [02-DPDP-COMPLIANCE.md](02-DPDP-COMPLIANCE.md)
- [../09-sprints/V5-PHASE-2B/sprint-16-trust-hardening.md](../09-sprints/V5-PHASE-2B/sprint-16-trust-hardening.md)
