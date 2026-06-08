---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 6
capability_key: module.commission
---

# Commission Domain

## What this domain is

A CommissionRecord tracks money the DSA earns on a disbursed case. It moves through four states with explicit transitions and evidence.

V3 had zero commission tracking. V5 makes this a first-class entity — the thing DSAs care about most after the engine result.

## The 4-state machine

```
Expected
   │
   │  (lender confirms payout in writing)
   ▼
Approved
   │
   │  (bank credit received)
   ▼
Received  ──→  (closed)
   ▲
   │
   └──  Disputed  (if mismatch with expected)
```

Illegal transitions (e.g., Received → Expected) are rejected at the type and service layer.

## Schema

```typescript
type CommissionState =
  | { kind: 'expected'; amount_inr: number; expected_at: Date; basis: PayoutBasis }
  | { kind: 'approved'; amount_inr: number; approved_at: Date; evidence_ref: string }
  | { kind: 'received'; amount_inr: number; received_at: Date; bank_ref: string }
  | { kind: 'disputed'; amount_inr: number; reason: string; disputed_at: Date; resolution_target?: Date };

type PayoutBasis =
  | { kind: 'percent_of_disbursement'; percent_bp: number }   // basis points: 250 = 2.50%
  | { kind: 'flat'; amount_inr: number }
  | { kind: 'tiered'; brackets: Array<{ from_inr: number; to_inr?: number; percent_bp: number }> };

export const CommissionRecordSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  case_id: ObjectIdSchema,
  customer_id: ObjectIdSchema,                     // denormalised
  lender: z.string(),
  product_code: z.string().optional(),
  lender_application_id: ObjectIdSchema,           // which lender row in the case
  disbursed_amount_inr: z.number(),
  disbursed_at: z.date(),

  // The state machine
  current_state: z.unknown(),                     // CommissionState
  state_history: z.array(z.unknown()),            // CommissionState[]

  // Splits
  corp_dsa_id: ObjectIdSchema.optional(),
  corp_dsa_payout_inr: z.number().optional(),     // total from CorpDSA
  facilitation_fee_inr: z.number().optional(),    // DigitalDSA's flat fee (Phase 2B)
  net_to_org_inr: z.number(),                     // org's take after splits

  partner_split: z.object({
    partner_id: ObjectIdSchema,
    amount_inr: z.number(),
    paid: z.boolean().default(false),
    paid_at: z.date().optional(),
  }).optional(),

  employee_split: z.object({
    user_id: ObjectIdSchema,
    amount_inr: z.number(),
    note: z.string().optional(),
  }).optional(),

  // Evidence chain
  evidence_refs: z.array(z.object({
    kind: z.enum(['lender_email', 'lender_pdf', 'bank_statement', 'screenshot', 'note']),
    file_ref: z.string().optional(),
    note: z.string().optional(),
    added_by_user_id: ObjectIdSchema,
    added_at: z.date(),
  })).default([]),

  created_at: z.date(),
  updated_at: z.date(),
  settled_at: z.date().optional(),
  schema_version: z.literal(1),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, current_state.kind, created_at)` | "Pending" / "Approved" tabs |
| `(org_id, lender, created_at)` | Bank-wise slicing |
| `(org_id, disbursed_at)` | Month-wise slicing |
| `(org_id, employee_split.user_id)` sparse | Employee-wise |
| `(org_id, partner_split.partner_id)` sparse | Partner-wise |
| `(case_id)` unique | One commission per case |
| `(org_id, corp_dsa_id)` sparse | CorpDSA reconciliation |

## Service methods

```typescript
class CommissionsService {
  // Auto-creation
  autoCreateOnDisbursed(caseId): Promise<CommissionRecord>  // called from CasesService

  // State transitions
  approve(id, amount, evidenceRef, by): Promise<Result<CommissionRecord, 'invalid_state'>>
  recordReceived(id, amount, bankRef, by): Promise<Result<CommissionRecord, 'invalid_state'>>
  dispute(id, reason, by): Promise<Result<CommissionRecord, 'invalid_state'>>
  resolveDispute(id, outcome, by): Promise<Result<CommissionRecord, 'invalid_state'>>

  // Splits
  setPartnerSplit(id, partnerId, amount, by): Promise<CommissionRecord>
  payPartnerSplit(id, by): Promise<void>
  setEmployeeSplit(id, userId, amount, by): Promise<CommissionRecord>

  // Read
  findById(orgId, id): Promise<Result<CommissionRecord, 'not_found'>>
  list(orgId, filters, pagination): Promise<{ items: CommissionRecord[]; total: number }>
  aggregate(orgId, sliceBy, dateRange): Promise<CommissionAggregate>  // for reports

  // Reconciliation
  reconcileBankSettlementFile(orgId, csv): Promise<{ matched: number; unmatched: number }>
  // bulk approve/receive based on lender SFTP / upload settlements
}
```

## Auto-creation flow

```typescript
// In CasesService.transitionStage
async transitionStage(id, to, notes, by) {
  // ... existing logic
  if (to === 'disbursed' && existing.stage !== 'disbursed') {
    await this.commissions.autoCreateOnDisbursed(id);
  }
}
```

The commission row gets created in `Expected` state with computed `amount_inr` based on the lender's payout policy from PMS (or the CorpDSA payout slab if a CorpDSA is selected).

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/commissions` | `module.commission` |
| GET | `/api/internal/commissions/:id` | `module.commission` |
| POST | `/api/internal/commissions/:id/approve` | `module.commission` |
| POST | `/api/internal/commissions/:id/receive` | `module.commission` |
| POST | `/api/internal/commissions/:id/dispute` | `module.commission` |
| POST | `/api/internal/commissions/:id/splits/partner` | `module.commission` |
| POST | `/api/internal/commissions/:id/splits/employee` | `module.commission` |
| POST | `/api/internal/commissions/reconcile` | `module.commission` (admin role) |
| GET | `/api/internal/commissions/aggregate` | `module.commission` |

## UI surfaces

| Screen | Description |
|---|---|
| `/paisa` (Money pillar) | Tabs: Pending · Approved · Received · Disputed. Filters: bank / month / employee / partner / CorpDSA. CSV export. |
| Case detail → Money tab | Commission record for this case |
| Commission detail drawer | State transitions with evidence upload |
| Mobile: status-tab swipe | Each tab swipes to next; evidence uploaded via camera |

## CorpDSA integration

If the case has a `corp_dsa_selection`, the commission record:
- Sets `corp_dsa_id`
- Computes `corp_dsa_payout_inr` from the slab version (FROZEN at selection time, not at receipt time)
- Computes `facilitation_fee_inr` as the flat DigitalDSA fee
- Computes `net_to_org_inr = corp_dsa_payout_inr - facilitation_fee_inr - (partner_split?.amount_inr ?? 0)`

The facilitation fee is a server-side constant, audit-logged on change. **Lock test (A-20):** across 50 fixture cases, facilitation fee does not vary by CorpDSA selection.

## Reconciliation

Lenders send monthly settlement files (CSV via SFTP or uploaded to admin). The reconciliation handler:
1. Parses each row
2. Matches by `lender + lender_reference_number + amount` to commission records in `approved` or `expected` state
3. Transitions matched records to `received`
4. Reports unmatched rows for admin review

## Cross-domain interactions

| Other domain | When |
|---|---|
| Cases | Stage `disbursed` → auto-create commission |
| Customers | Denormalised on the record for reporting |
| Partners | Partner split flows to `partner_commission_payable` |
| Teams | Employee split for sub-DSA scenarios |
| CorpDSAs | Slab version frozen at selection; commission computed against it |
| ClickHouse | `fact_commissions` for slicing aggregations |
| Audit | Every state transition + split + dispute logged |

## Capability key

`module.commission` — depends on `module.cases` and `module.customers`. Premium-tier feature.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [02-CASE.md](02-CASE.md)
- [08-PARTNER.md](08-PARTNER.md)
- [09-CORP-DSA.md](09-CORP-DSA.md)
- [../09-sprints/V5-PHASE-2A/sprint-6-commission.md](../09-sprints/V5-PHASE-2A/sprint-6-commission.md)
