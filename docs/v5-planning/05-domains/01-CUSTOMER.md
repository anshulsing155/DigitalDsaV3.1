---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 1
capability_key: module.customers
---

# Customer Domain

## What this domain is

The Customer is the master person identity. One person may take many loans over time (Home Loan now, Top-up in 2 years, LAP later) — all tied to one Customer record. This domain owns identity, KYC reusability, relationship-health signals, and cross-case visibility.

**Plain example.** Rahul's customer Priya Singh appears as one record. Click her profile, see all her loans (active and historical), all her conversations across cases, all her documents from any case, anniversaries to nudge her at, total commission earned from her over time.

## Schema

```typescript
import { z } from 'zod';
import { EncryptedString, BlindIndexedMobile, ObjectIdSchema } from '$types/primitives';

export const CustomerSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,                      // tenant scope

  // Identity — encrypted at rest
  full_name: EncryptedString,
  mobile: BlindIndexedMobile,                  // ciphertext + HMAC index
  email: EncryptedString.optional(),
  pan: z.object({
    ciphertext: z.instanceof(Buffer),
    blind_index: z.string(),
  }).optional(),
  date_of_birth: z.date().optional(),
  gender: z.enum(['M', 'F', 'O']).optional(),

  // Aadhaar — only last 4 stored
  aadhaar_last4: z.string().length(4).optional(),
  aadhaar_hmac: z.string().optional(),         // for dedup detection
  aadhaar_verified: z.boolean().default(false),
  aadhaar_verified_at: z.date().optional(),

  // Personal
  marital_status: z.enum(['single', 'married', 'widowed', 'divorced']).optional(),
  family: z.object({
    spouse_name: EncryptedString.optional(),
    children_count: z.number().int().nonnegative().optional(),
    dependents_count: z.number().int().nonnegative().optional(),
  }).optional(),

  // Address (current + permanent; full history in addresses[])
  addresses: z.array(z.object({
    kind: z.enum(['current', 'permanent', 'office', 'property']),
    line1: EncryptedString,
    line2: EncryptedString.optional(),
    city: z.string(),                          // city/state not encrypted
    state: z.string(),
    pincode: z.string().length(6),
    country: z.literal('IN'),
    captured_at: z.date(),
  })).default([]),

  // Employment summary (latest known; full history in employment_history)
  employment_summary: z.object({
    type: z.enum(['salaried', 'self_employed', 'professional', 'retired', 'student', 'homemaker', 'unemployed']).optional(),
    employer_name: EncryptedString.optional(),
    designation: z.string().optional(),
    years_in_current: z.number().optional(),
  }).optional(),

  // Financial summary (denormalised; source of truth = latest case)
  financial_summary: z.object({
    last_known_income_monthly_inr: z.number().optional(),
    last_known_income_type: z.string().optional(),
    last_known_credit_score: z.number().int().min(300).max(900).optional(),
    last_known_credit_score_date: z.date().optional(),
  }).optional(),

  // Consent ledger (DPDP)
  consents: z.array(z.object({
    purpose: z.enum(['loan_processing', 'cross_case_kyc_reuse', 'communication', 'analytics_aggregate']),
    granted_at: z.date(),
    granted_by_user_id: ObjectIdSchema,
    evidence_kind: z.enum(['signed_letter', 'whatsapp_message', 'in_person_verbal', 'grace_period']),
    evidence_ref: z.string().optional(),
    revoked_at: z.date().optional(),
    revoked_reason: z.string().optional(),
  })).default([]),

  // Relationship health
  last_contacted_at: z.date().optional(),
  dormancy_flag: z.boolean().default(false),
  loan_anniversaries: z.array(z.object({
    case_id: ObjectIdSchema,
    loan_type: z.string(),
    disbursed_on: z.date(),
    lender: z.string(),
    status: z.string(),
  })).default([]),
  birthday: z.date().optional(),

  // Attribution
  source_partner_id: ObjectIdSchema.optional(),  // first-touch attribution
  source_lead_id: ObjectIdSchema.optional(),

  // Lifecycle
  created_at: z.date(),
  updated_at: z.date(),
  created_by_user_id: ObjectIdSchema,
  archived_at: z.date().optional(),
  marked_for_erasure_at: z.date().optional(),

  schema_version: z.literal(1),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = CustomerSchema.omit({
  _id: true, created_at: true, updated_at: true,
  created_by_user_id: true, archived_at: true, marked_for_erasure_at: true,
  schema_version: true, consents: true, addresses: true, loan_anniversaries: true,
}).extend({
  full_name_plaintext: z.string().min(1),
  mobile_plaintext: z.string().regex(/^\d{10}$/),
  // ... other plaintext inputs that get encrypted on write
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, mobile.blind_index)` unique | Dedup customers within org; primary search by mobile |
| `(org_id, pan.blind_index)` sparse | PAN lookup |
| `(org_id, email.blind_index)` sparse | Email lookup |
| `(org_id, full_name.normalised)` | Name prefix search (lower-sensitivity, accepted tradeoff in ADR) |
| `(org_id, updated_at)` | Recent customers list |
| `(org_id, last_contacted_at)` | Dormancy detection |
| `(org_id, marked_for_erasure_at)` sparse | Erasure batch processor |
| `(aadhaar_hmac)` | Cross-org Aadhaar dedup detection (admin-only) |

## Service methods

```typescript
class CustomersService {
  // Read
  findById(orgId, id): Promise<Result<Customer, 'not_found'>>
  findByMobile(orgId, plainMobile): Promise<Result<Customer, 'not_found'>>
  findByPan(orgId, plainPan): Promise<Result<Customer, 'not_found'>>
  search(orgId, query, types): Promise<{ customers: Customer[] }>
  list(orgId, filters, pagination): Promise<{ items: Customer[]; total: number }>

  // Write
  create(input: CreateCustomerInput, by: User): Promise<Result<Customer, 'invalid'>>
  findOrCreate(input: CreateCustomerInput, by: User): Promise<Customer>  // dedup-aware
  update(id, patch, by: User): Promise<Result<Customer, 'not_found' | 'invalid'>>
  recordConsent(id, consent: Consent, by: User): Promise<void>
  revokeConsent(id, purpose, reason, by: User): Promise<void>

  // Archival / erasure
  archive(id, by: User): Promise<void>
  markForErasure(id, by: User): Promise<void>            // begins erasure cascade

  // Cross-case
  listCasesForCustomer(id): Promise<Case[]>
  listConversationsForCustomer(id): Promise<Conversation[]>
  listDocumentsForCustomer(id): Promise<Document[]>      // customer vault
}
```

All read methods scope by `org_id` from `by.org_id`. Cross-org access returns `not_found`, never throws.

## Routes

| Method | Path | Capability | Purpose |
|---|---|---|---|
| GET | `/api/internal/customers` | `module.customers` | List with filters + pagination |
| GET | `/api/internal/customers/:id` | `module.customers` | Single profile |
| POST | `/api/internal/customers` | `module.customers` | Create (often via `findOrCreate`) |
| PATCH | `/api/internal/customers/:id` | `module.customers` | Update fields |
| POST | `/api/internal/customers/:id/consents` | `module.customers` | Record consent |
| DELETE | `/api/internal/customers/:id/consents/:purpose` | `module.customers` | Revoke consent |
| POST | `/api/internal/customers/:id/archive` | `module.customers` | Archive |
| POST | `/api/internal/customers/:id/erase` | `module.customers` | Mark for erasure |
| GET | `/api/internal/customers/:id/cases` | `module.customers` | All cases for customer |
| GET | `/api/internal/customers/:id/conversations` | `module.customers` + `module.conversations` | Conversation list |
| GET | `/api/internal/customers/:id/documents` | `module.customers` + `module.documents` | Vault list |

## UI surfaces

| Screen | What it shows |
|---|---|
| `/customers` | List + search + filters (dormant, active, has-open-case) |
| `/customers/[id]` | Profile tabs: Overview · Cases · Conversations · Documents · Activity |
| Customer chip in nav | Quick-jump to recently-viewed customers |
| Lead conversion flow | Customer auto-find-or-create |
| Case detail header | Customer link chip |

## Cross-domain interactions

| Other domain | When it calls Customers |
|---|---|
| Leads | On `convertToCase` — `findOrCreate` to attach customer to new case |
| Cases | On `create` — attach `customer_id`; on case mutations, may update Customer's `last_contacted_at`, `loan_anniversaries` |
| Conversations | On thread creation — every Conversation has a `customer_id` |
| Commissions | On `create` — denormalises customer for reporting |
| Documents | Customer vault is the cross-case document store |
| Partners | First-touch attribution sets `source_partner_id` |

## Migrations

### Migration 001 (Sprint 1, the foundational one)

Builds the Customer collection from scratch in V5. Since V5 is a new repo, this is just the initial schema; no data to migrate yet.

### Migration V3-import (Sprint 8)

When V5 GA approaches, a one-time script reads V3's case documents:
1. For each V3 case, extract `optional_contact`
2. Normalise mobile (strip +91, spaces, dashes → 10 digits)
3. Dedup within (V3 org_id mapping → V5 org_id, normalised mobile)
4. Create Customer in V5 with V3 cases linked via `customer_id`
5. Re-root V3 ConversationThread events into V5 Conversation/ConversationEvent
6. Emit timeline events for the import

Idempotent, resumable, batched at 100 docs/sec. Test on staging clone of V3 prod data before production cutover.

## Tests

- Schema accepts/rejects per field — 90% branch coverage
- Service `create` happy path + dedup case + cross-org isolation
- Service `findOrCreate` returns same customer on second call
- Service `recordConsent` appends without overwriting
- Service `markForErasure` cascades to cases (mocked) — verifies the trigger event emits
- Repository: blind-index lookup works; CSFLE round-trips; index uniqueness
- Migration V3-import: idempotent, dedup correctness, error recovery

## Capability key

`module.customers` — required for any Customer endpoint or screen. Disabling hides the section; data persists.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [02-CASE.md](02-CASE.md)
- [03-CONVERSATION.md](03-CONVERSATION.md)
- [../09-sprints/V5-PHASE-2A/sprint-1-customer-entity.md](../09-sprints/V5-PHASE-2A/sprint-1-customer-entity.md)
