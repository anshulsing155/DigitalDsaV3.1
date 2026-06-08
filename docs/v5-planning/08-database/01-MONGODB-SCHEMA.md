---
type: database
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# MongoDB Schema — All Collections

## Region and connection

- Atlas cluster: ap-south-1 (Mumbai), locked
- Connection string in `MONGO_CONNECTION_STRING`
- CSFLE: configured per collection (see `packages/db/src/csfle.ts`)
- Driver: native MongoDB driver (no Mongoose/Prisma)

## Collections

| Collection | Domain | Phase | PII fields encrypted | Indexes |
|---|---|---|---|---|
| `customers` | customers | 2A.1 | full_name, mobile, email, pan, address lines, spouse_name | (org_id, mobile.blind_index) unique, (org_id, pan.blind_index) sparse, (org_id, updated_at), (org_id, last_contacted_at), (aadhaar_hmac) |
| `cases` | cases | 2A.0 | (only refs to PII; not directly) | (org_id, customer_id, created_at), (org_id, stage, updated_at), (org_id, assigned_to_user_id), (case_number) unique |
| `case_lender_applications` | cases (sub) | 2A.0 | — | (case_id), (lender, status) |
| `conversations` | conversations | 2A.2 | — | (org_id, customer_id) unique, (org_id, last_event_at desc) |
| `conversation_events` | conversations | 2A.2 | body_encrypted | (conversation_id, created_at), (case_id, created_at) sparse, (wa_message_id) sparse unique |
| `leads` | leads | 2A.3 | optional_contact.* | (org_id, status, updated_at), (org_id, follow_up_date) sparse, (lead_number) unique |
| `follow_ups` | follow-ups | 2A.4 | — | (owner_user_id, status, due_at), (case_id, status) sparse, (customer_id, status) sparse |
| `vault_documents` | documents | 2A.5 + 2B.13 | file_ref (encrypted blob in S3) | (org_id, customer_id, doc_kind), (org_id, validity.valid_until) sparse, (sha256) |
| `case_checklist_items` | documents | 2A.5 | — | (case_id, status), (org_id, expires_at) sparse |
| `secure_upload_tokens` | documents | 2A.5 | — | (token_hash) unique, (expires_at) TTL |
| `commission_records` | commissions | 2A.6 | — | (org_id, current_state.kind, created_at), (case_id) unique, (org_id, disbursed_at) |
| `partners` | partners | 2B.9 | full_name, mobile, email, address | (org_id, type, status), (org_id, mobile.blind_index) unique |
| `partner_commission_payables` | partners | 2B.9 | — | (org_id, partner_id, state), (commission_record_id) |
| `corp_dsas` | corp-dsas | 2B.10 | contact.email (lighter) | (name) |
| `corp_dsa_payout_slabs` | corp-dsas | 2B.10 | — | (corp_dsa_id, valid_from), (lender, loan_type, valid_from) |
| `lenders` | lenders | 2B.11 | — | (code) unique |
| `lender_editorial` | lenders | 2B.11 | — | (lender_code, loan_type, profile_segment, geo_tier), (last_reviewed) |
| `users` | (auth) | 2A.0 | mobile (encrypted) | (mobile.blind_index) unique |
| `team_members` | teams | 2B.12 | — | (org_id, user_id), (org_id, role, status) |
| `branches` | teams | 2B.12 | — | (org_id, parent_branch_id) |
| `builders` | builders | 2B.9 | contact.* | (name), (subscription_id) |
| `dsa_pools` | builders | 2B.9 | — | (builder_id) |
| `builder_leads` | builders | 2B.9 | captured_data.* | (builder_id, status), (routing.selected_dsa_org_id) |
| `capability_states` | capabilities | 2A.0 | — | (org_id) unique |
| `capability_audit` | capabilities | 2A.0 | — | (org_id, at) |
| `audit_events` | (cross) | 2A.0 | before/after exclude encrypted fields | (org_id, created_at), (subject_kind, subject_id) |
| `audit_merkle_roots` | (cross) | 2B.16 | — | (day) unique |
| `billing_subscriptions` | (billing) | 2A.0 (ported V3) | — | (org_id) unique |
| `billing_transactions` | (billing) | 2A.0 | — | (org_id, created_at) |
| `invoices` | (billing) | 2A.0 | — | (org_id, invoice_number) unique |
| `api_keys` | (api platform) | 2B.15 | key_hash | (org_id, revoked_at) sparse |
| `webhook_subscriptions` | (api platform) | 2B.15 | secret (encrypted) | (org_id, active) |
| `webhook_deliveries` | (api platform) | 2B.15 | — | (subscription_id, next_retry_at) sparse |
| `sources` | leads | 2A.3 (lighter than partners) | — | (org_id, kind) |
| `decryption_events` | (security) | 2A.0 | — | (org_id, actor_user_id, created_at) |

## CSFLE configuration

```typescript
// packages/db/src/csfle.ts

export const csfleSchemaMap = {
  'digitaldsa_v5.customers': {
    bsonType: 'object',
    encryptMetadata: {
      keyId: '/customer_dek',     // pointer to DEK in key vault
    },
    properties: {
      full_name: { encrypt: { keyId: '/customer_dek', bsonType: 'string', algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' } },
      mobile: {
        bsonType: 'object',
        properties: {
          ciphertext: { encrypt: { keyId: '/customer_dek', bsonType: 'string', algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random' } },
          blind_index: { bsonType: 'string' },  // not encrypted; it IS an HMAC
        },
      },
      pan: { /* similar */ },
      email: { /* similar */ },
      // address.line1, line2, etc. encrypted
    },
  },
  // ... per collection
};
```

Per-org DEKs are created on org signup. KEK lives in AWS KMS Mumbai.

## Index strategy principles

1. **Every read query has an index.** No collection scans on hot paths.
2. **Tenant-scoped indexes start with `org_id`.** Compound indexes that don't are admin-only or global.
3. **Unique indexes enforce business invariants.** E.g., `(org_id, mobile.blind_index)` unique on customers.
4. **TTL indexes** for ephemeral data: `secure_upload_tokens.expires_at` TTL.
5. **Sparse indexes** for nullable fields used in queries.
6. **No text indexes.** Full-text search isn't needed yet (search uses blind indexes + normalised name prefix).

## Schema versioning

Every document has `schema_version: 1`. Migrations bump this and add a converter that runs on read:

```typescript
function migrateOnRead(doc: any): Customer {
  if (doc.schema_version === 1) return doc;
  // ... future versions
}
```

Forward-only. We never allow stale-version documents on writes.

## Per-collection details

Each domain doc (`05-domains/`) carries the full Zod schema. This doc is the cross-collection summary.

## Multi-tenant safety

**Every query MUST scope by org_id.** Lint rule + code review.

```typescript
// Bad
await db.collection('customers').findOne({ _id: customerId });

// Good
await db.collection('customers').findOne({ _id: customerId, org_id: locals.user.org_id });
```

BOLA tests run on every endpoint: a request with valid auth for org A tries to access org B's data → must 404.

## Backups

- Atlas snapshots: daily, retained 30 days
- Encrypted, stored in S3 Mumbai
- Restore drill quarterly to a sandbox cluster
- Cross-region backup snapshot to Mumbai-different-AZ for DR

## Capacity planning

| Metric | Beta | GA |
|---|---|---|
| Customers per org | ~500 | ~5,000 |
| Cases per org per month | ~50 | ~300 |
| Conversations per org | ~500 | ~5,000 |
| Total org count | 50 | 1,000 |
| Total doc count estimate | 1M | 50M |

Atlas tier: M10 (Beta) → M20 (early GA) → M30+ (scale).

## Related docs

- [02-CLICKHOUSE-SCHEMA.md](02-CLICKHOUSE-SCHEMA.md)
- [03-MIGRATION-PATTERN.md](03-MIGRATION-PATTERN.md)
- Per-domain docs in `../05-domains/`
- [../04-security/01-PII-DISCIPLINE.md](../04-security/01-PII-DISCIPLINE.md)
