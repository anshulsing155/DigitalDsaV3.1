---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 0 (ported from V3)
capability_key: module.cases
---

# Case Domain

## What this domain is

A Case is one loan opportunity — one unit of work and one unit of payout. Cases hang off Customers (the customer is who; the case is what they want this time).

## Schema

```typescript
export const CaseSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,

  // Identity
  case_number: z.string(),                  // e.g., "CASE-2026-04531"
  customer_id: ObjectIdSchema,              // primary applicant
  co_applicant_ids: z.array(ObjectIdSchema).default([]),
  guarantor_ids: z.array(ObjectIdSchema).default([]),

  // Loan details (loan_type drives schema-on-schema rendering)
  loan_type: z.enum(['home', 'lap', 'plot', 'personal', 'business', 'professional', 'bt_topup']),
  facility_type: z.string().optional(),     // sub-type
  loan_variant: z.string().optional(),
  loan_amount_requested_inr: z.number().positive(),
  tenure_months: z.number().int().positive().optional(),
  purpose: z.string().optional(),

  // Form payload (loan-type-specific, schema-driven from packages/engine)
  form_payload: z.record(z.unknown()),
  form_payload_sha256: z.string(),          // immutable snapshot ID
  form_versions: z.array(z.object({
    version_id: z.string(),                 // SHA-256
    snapshot_at: z.date(),
    snapshot_by_user_id: ObjectIdSchema,
  })).default([]),

  // Pipeline
  stage: z.string(),                        // config-driven, see PipelineConfig
  stage_history: z.array(z.object({
    from: z.string(),
    to: z.string(),
    transitioned_at: z.date(),
    by_user_id: ObjectIdSchema,
    notes: z.string().optional(),
  })),
  stage_entered_at: z.date(),               // for SLA / breach views

  // Engine output
  evaluation_result: z.unknown().optional(),
  evaluation_result_at: z.date().optional(),
  evaluation_engine_version: z.string().optional(),

  // Lender applications (multi-lender file-build)
  lender_applications: z.array(LenderApplicationSchema).default([]),

  // Source attribution
  source_attribution: z.object({
    lead_id: ObjectIdSchema.optional(),
    source_partner_id: ObjectIdSchema.optional(),
    attributed_at: z.date(),
  }).optional(),

  // CorpDSA selection (Phase 2B)
  corp_dsa_selection: z.object({
    corp_dsa_id: ObjectIdSchema,
    slab_version: z.string(),
    expected_payout_inr: z.number(),
    facilitation_fee_inr: z.number(),
    selected_at: z.date(),
    selected_by_user_id: ObjectIdSchema,
  }).optional(),

  // Sample-data flag for demo orgs
  is_sample: z.boolean().default(false),

  // Lifecycle
  created_at: z.date(),
  updated_at: z.date(),
  created_by_user_id: ObjectIdSchema,
  assigned_to_user_id: ObjectIdSchema.optional(),  // for team assignment
  branch_id: ObjectIdSchema.optional(),
  closed_at: z.date().optional(),
  drop_reason: z.string().optional(),

  schema_version: z.literal(1),
});

const LenderApplicationSchema = z.object({
  _id: ObjectIdSchema,
  lender: z.string(),
  product_code: z.string(),
  status: z.enum(['shortlisted', 'file_built', 'submitted', 'login_received', 'credit', 'sanctioned', 'rejected', 'disbursed']),
  status_history: z.array(/* ... */),
  reference_number: z.string().optional(),
  sanctioned_amount_inr: z.number().optional(),
  sanctioned_terms: z.unknown().optional(),
  disbursed_amount_inr: z.number().optional(),
  disbursed_at: z.date().optional(),
  document_checklist: z.array(DocumentChecklistItemSchema).default([]),
  bank_queries: z.array(BankQuerySchema).default([]),
  notes: z.string().optional(),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, customer_id, created_at)` | "all cases for this customer" |
| `(org_id, stage, updated_at)` | Pipeline view by stage |
| `(org_id, assigned_to_user_id)` | "my cases" for team members |
| `(org_id, source_attribution.source_partner_id)` | Partner attribution reports |
| `(org_id, created_at)` | Recent cases |
| `(case_number)` unique | Lookup by case number |

## Service methods

```typescript
class CasesService {
  create(input, by): Promise<Result<Case, 'invalid' | 'quota_exceeded'>>
  findById(orgId, id): Promise<Result<Case, 'not_found'>>
  listForCustomer(orgId, customerId): Promise<Case[]>
  listForOrg(orgId, filters, pagination): Promise<{ items: Case[]; total: number }>
  transitionStage(id, to, notes, by): Promise<Result<Case, 'invalid_transition'>>
  runEvaluation(id): Promise<Result<EvaluationResult, 'engine_error'>>
  addLenderApplication(id, lender, by): Promise<Case>
  updateLenderApplication(id, lenderApplicationId, patch, by): Promise<Case>
  assignTo(id, userId, by): Promise<void>
  selectCorpDsa(id, corpDsaId, by): Promise<Result<Case, 'invalid_corp_dsa'>>
  close(id, drop_reason, by): Promise<void>
}
```

`transitionStage` enforces allowed transitions per `PipelineConfig`. Records `stage_entered_at` and pushes to `stage_history`.

`runEvaluation` snapshots the current form payload, computes SHA-256, stores the snapshot version, calls the engine, caches the result with timestamp.

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/cases` | `module.cases` |
| GET | `/api/internal/cases/:id` | `module.cases` |
| POST | `/api/internal/cases` | `module.cases` |
| PATCH | `/api/internal/cases/:id` | `module.cases` |
| POST | `/api/internal/cases/:id/stage` | `module.cases` |
| POST | `/api/internal/cases/:id/evaluate` | `module.cases` |
| POST | `/api/internal/cases/:id/lenders` | `module.cases` |
| PATCH | `/api/internal/cases/:id/lenders/:lenderAppId` | `module.cases` |
| POST | `/api/internal/cases/:id/assign` | `module.cases` + `module.team` |

## UI surfaces

| Screen | Capability | Description |
|---|---|---|
| `/cases` | `module.cases` | Pipeline view (board by stage) + list view |
| `/cases/[id]` | `module.cases` | Case detail tabs: Overview · Form · Offers · Documents · Communications · Timeline · Tasks |
| `/cases/new` | `module.cases` | New case wizard (Quick vs Full) |
| Embedded form | `module.cases` | The comprehensive loan-form, schema-driven |

## Cross-domain interactions

| Other domain | When |
|---|---|
| Customers | Every Case has a `customer_id`; on transitions, may update Customer's signals |
| Conversations | ConversationEvent.case_id can link to Case (optional) |
| Documents | Per-case document checklist; customer vault docs may be linked in |
| Commissions | On stage transition to `disbursed`, auto-creates CommissionRecord |
| Engine | `runEvaluation` calls engine; cached result in `evaluation_result` |
| CorpDSA | `selectCorpDsa` writes the selection chain |
| Follow-ups | Stage transitions can trigger auto-follow-up (e.g., "Bank query raised → 1-day follow-up") |
| Leads | On lead conversion, Case is created with `source_attribution.lead_id` |

## Capability key

`module.cases` — fundamental; cannot be disabled (it's a prerequisite for almost everything else).

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [01-CUSTOMER.md](01-CUSTOMER.md)
- [04-LEAD.md](04-LEAD.md)
- [07-COMMISSION.md](07-COMMISSION.md)
- [10-LENDER.md](10-LENDER.md)
