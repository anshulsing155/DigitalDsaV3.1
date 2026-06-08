---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 5 (basic) / 2B Sprint 13 (vault + camera)
capability_key: module.documents
---

# Document Domain

## What this domain is

Documents are KYC and supporting files: PAN cards, Aadhaar (stored masked), salary slips, ITRs, bank statements, property papers. Documents exist at two levels:

1. **Case-level checklist** — what THIS lender needs for THIS case
2. **Customer-level vault** — what the DSA has collected from THIS customer (reusable across cases)

## Schema — Customer Vault Document

```typescript
export const VaultDocumentSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  customer_id: ObjectIdSchema,

  doc_kind: z.enum([
    'pan_card', 'aadhaar', 'passport', 'voter_id', 'driving_licence',
    'salary_slip', 'form_16', 'itr', 'computation', 'audited_financials',
    'bank_statement', 'cancelled_cheque',
    'property_deed', 'sale_agreement', 'allotment_letter', 'noc',
    'photo', 'signature',
    'other',
  ]),
  doc_subkind: z.string().optional(),           // e.g., 'salary_slip_april_2026'

  file_ref: z.string(),                         // S3 key (encrypted blob)
  file_name: z.string(),
  size_bytes: z.number(),
  mime: z.string(),
  sha256: z.string(),                           // for dedup
  page_count: z.number().optional(),

  // Validity window
  validity: z.object({
    valid_from: z.date().optional(),
    valid_until: z.date().optional(),
  }).optional(),

  // Source
  captured_at: z.date(),
  captured_by_user_id: ObjectIdSchema,
  captured_via: z.enum(['upload', 'whatsapp_link', 'in_app_camera', 'in_person']),
  source_case_id: ObjectIdSchema.optional(),    // case during which captured

  // Status
  status: z.enum(['received', 'verified', 'rejected', 'expired', 'archived']),
  rejected_reason: z.string().optional(),

  // OCR extracted fields (Phase 2B+ — schema reserved)
  extracted_fields: z.record(z.unknown()).optional(),
  extraction_confidence: z.number().min(0).max(1).optional(),

  // Consent for cross-case reuse (DPDP)
  reuse_consents: z.array(z.object({
    case_id: ObjectIdSchema,
    granted_at: z.date(),
    granted_by_user_id: ObjectIdSchema,
  })).default([]),

  schema_version: z.literal(1),
});
```

## Schema — Case Checklist Item

```typescript
export const ChecklistItemSchema = z.object({
  _id: ObjectIdSchema,
  case_id: ObjectIdSchema,
  lender_application_id: ObjectIdSchema,         // which lender requested this
  doc_kind: z.string(),
  required_by_lender: z.boolean().default(true),
  notes: z.string().optional(),

  // 5-state status (the SRS requires this)
  status: z.enum(['missing', 'pending', 'received', 'rejected', 'expired']),
  status_history: z.array(z.object({ from: z.string(), to: z.string(), at: z.date(), by: ObjectIdSchema })).default([]),
  vault_document_id: ObjectIdSchema.optional(),  // if attached from vault

  requested_at: z.date().optional(),
  received_at: z.date().optional(),
  expires_at: z.date().optional(),
});
```

## Indexes

| Collection | Index | Purpose |
|---|---|---|
| `vault_documents` | `(org_id, customer_id, doc_kind)` | Vault list per customer |
| `vault_documents` | `(org_id, validity.valid_until)` sparse | Expiry watcher |
| `vault_documents` | `(sha256)` | Dedup |
| `case_checklist_items` | `(case_id, status)` | Case detail render |
| `case_checklist_items` | `(org_id, expires_at)` sparse | Expiry watcher |

## Service methods

```typescript
class DocumentsService {
  // Vault
  uploadToVault(customerId, file, doc_kind, by): Promise<VaultDocument>
  listVault(customerId): Promise<VaultDocument[]>
  attachFromVault(checklistItemId, vaultDocumentId, by): Promise<ChecklistItem>
  recordReuseConsent(vaultDocumentId, caseId, by): Promise<void>
  archiveVaultDoc(id, by): Promise<void>

  // Case checklist
  buildChecklistForLender(caseId, lenderApplicationId, lender): Promise<ChecklistItem[]>
  updateChecklistStatus(itemId, status, notes, by): Promise<ChecklistItem>
  requestFromCustomer(caseId, docKinds, by): Promise<{ secure_link_url, expires_at }>
  ingestFromWhatsAppUpload(token, file): Promise<VaultDocument>  // called by upload webhook

  // Expiry
  detectExpiring(orgId, lookahead_days): Promise<VaultDocument[]>  // for cron + Work Queue
}
```

## The doc collection flow (Phase 2A — basic; 2B — polished)

```
DSA clicks "Request documents" on a case
   ↓
Multi-select doc types (PAN, salary slip, bank statement)
   ↓
Backend: generateSecureUploadLink(customer_id, expected_kinds)
   ↓
Token created in `secure_upload_tokens` (HMAC-signed, 7-day expiry, single-purpose)
   ↓
WhatsApp template sent to customer with URL: digitaldsa.com/upload/<token>
   ↓
Customer taps link on phone
   ↓
Mobile-optimised upload page (no app install required)
   ↓
File uploaded → virus-scanned (ClamAV via BullMQ job) → encrypted blob in S3 Mumbai
   ↓
VaultDocument created on Customer
   ↓
If matches expected doc_kinds → auto-attaches to case ChecklistItem (status: received)
   ↓
DSA sees the doc appear in the case + Customer vault simultaneously
```

## In-app camera flow (Phase 2B)

```
DSA in case detail → Documents tab → "Capture with camera"
   ↓
Capacitor Camera plugin opens full-screen viewfinder
   ↓
Take photo of physical document
   ↓
Client-side perspective correction (opencv-wasm)
   ↓
Preview → confirm or retake
   ↓
Upload to vault → attach to case checklist
```

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/customers/:id/documents` | `module.documents` |
| POST | `/api/internal/customers/:id/documents` | `module.documents` |
| POST | `/api/internal/cases/:id/checklist/:itemId/request` | `module.documents` |
| POST | `/api/internal/cases/:id/checklist/:itemId/attach-vault` | `module.documents` |
| PATCH | `/api/internal/cases/:id/checklist/:itemId/status` | `module.documents` |
| GET | `/upload/[token]` | none (public, token-gated) |
| POST | `/api/upload/[token]/submit` | none (public, token-gated) |

## UI surfaces

| Screen | Description |
|---|---|
| Case detail → Documents tab | 5-state checklist, request button, attach-from-vault button |
| Customer profile → Documents tab | Vault: every doc collected from this customer |
| Home / Work Queue | Expiring docs surfaced as auto-tasks |
| Public upload page | Customer-facing upload (no app, no login, mobile-optimised) |

## Cross-domain interactions

| Other domain | When |
|---|---|
| Conversations | Inbound WhatsApp attachments auto-flow here; doc requests go out via WA |
| Cases | Per-case checklist; receipts mark progress |
| Customers | Vault is customer-scoped, consent for cross-case reuse |
| Follow-ups | Expiry triggers auto-follow-up |
| Audit | Every upload, status change, consent recorded |

## Capability key

`module.documents` — depends on `module.cases`. The Customer Vault sub-capability is `module.documents` itself; basic checklist comes with cases.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [01-CUSTOMER.md](01-CUSTOMER.md)
- [02-CASE.md](02-CASE.md)
- [03-CONVERSATION.md](03-CONVERSATION.md)
- [../04-security/03-AADHAAR-MASKING.md](../04-security/03-AADHAAR-MASKING.md)
- [../09-sprints/V5-PHASE-2B/sprint-13-documents-vault.md](../09-sprints/V5-PHASE-2B/sprint-13-documents-vault.md)
