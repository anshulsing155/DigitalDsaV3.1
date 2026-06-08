---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2B Sprint 9
capability_key: module.partners
---

# Partner Domain

## What this domain is

A Partner is an external referral source — builders, property dealers, CAs, architects, existing customers who refer business. This is **distinct from V3's F.1 referral program** which is DSA-to-DSA. Partners refer customers; F.1 referred DSAs to the platform.

## Schema

```typescript
export const PartnerSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,

  // Identity
  type: z.enum(['builder', 'property_dealer', 'ca', 'architect', 'existing_customer', 'employee', 'other']),
  business_name: z.string().optional(),         // for B2B partners
  full_name: EncryptedString,                   // contact person
  mobile: BlindIndexedMobile,
  email: EncryptedString.optional(),

  address: z.object({
    line1: EncryptedString.optional(),
    city: z.string(),
    state: z.string(),
    pincode: z.string().length(6),
  }).optional(),

  // KYC (lighter than Customer; B2B-flavoured)
  kyc: z.object({
    pan: z.object({ ciphertext: z.instanceof(Buffer), blind_index: z.string() }).optional(),
    gst_number: z.string().optional(),
    incorporation_number: z.string().optional(),
  }).optional(),

  // Commission terms (per partner per loan-type if needed)
  commission_terms: z.array(z.object({
    loan_type: z.enum(['home', 'lap', 'plot', 'personal', 'business', 'professional', 'bt_topup', 'all']),
    basis: z.enum(['percent_of_disbursement', 'flat', 'tiered']),
    percent_bp: z.number().optional(),
    flat_inr: z.number().optional(),
    notes: z.string().optional(),
    effective_from: z.date(),
    effective_to: z.date().optional(),
  })).default([]),

  // Lifecycle
  status: z.enum(['active', 'inactive', 'archived']),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).default([]),

  created_at: z.date(),
  updated_at: z.date(),
  created_by_user_id: ObjectIdSchema,

  schema_version: z.literal(1),
});

// Partner commission ledger
export const PartnerPayableSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  partner_id: ObjectIdSchema,
  commission_record_id: ObjectIdSchema,
  case_id: ObjectIdSchema,
  amount_inr: z.number(),
  state: z.enum(['accrued', 'approved_for_payment', 'paid', 'disputed']),
  paid_at: z.date().optional(),
  paid_via: z.enum(['bank_transfer', 'upi', 'cheque', 'cash', 'in_kind']).optional(),
  payment_ref: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.date(),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, type, status)` | Partner list, filtered |
| `(org_id, mobile.blind_index)` unique | Dedup |
| `(org_id, business_name)` | Search |
| `(org_id, status)` | Active partners |
| `partner_payables: (org_id, partner_id, state)` | Per-partner ledger |
| `partner_payables: (org_id, commission_record_id)` | Reverse lookup |

## Service methods

```typescript
class PartnersService {
  create(input, by): Promise<Partner>
  findById(orgId, id): Promise<Result<Partner, 'not_found'>>
  list(orgId, filters, pagination): Promise<{ items: Partner[]; total: number }>
  update(id, patch, by): Promise<Partner>
  archive(id, by): Promise<void>

  // Commission terms
  updateCommissionTerms(id, terms, by): Promise<Partner>
  computePayableFor(commissionRecord): Promise<{ partner_id, amount_inr } | null>

  // Payables ledger
  listPayables(orgId, filters): Promise<PartnerPayable[]>
  approvePayable(id, by): Promise<PartnerPayable>
  recordPayment(id, paid_via, ref, by): Promise<PartnerPayable>

  // Analytics
  getPartnerStats(partnerId, dateRange): Promise<PartnerStats>
  // { leads_sent, leads_converted, revenue_generated, commission_payable_outstanding }
}
```

## Cross-domain interactions

| Other domain | When |
|---|---|
| Leads | `source_partner_id` set when lead attributed to a partner |
| Cases | `source_attribution.source_partner_id` carries through |
| Commissions | On commission auto-create, if case has partner attribution, partner_split computed from terms |
| Customers | Partners are not customers; we keep them separate (different KYC, B2B flavour) |

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/partners` | `module.partners` |
| GET | `/api/internal/partners/:id` | `module.partners` |
| POST | `/api/internal/partners` | `module.partners` |
| PATCH | `/api/internal/partners/:id` | `module.partners` |
| GET | `/api/internal/partners/:id/payables` | `module.partners` |
| POST | `/api/internal/partners/:id/payables/:payableId/approve` | `module.partners` |
| POST | `/api/internal/partners/:id/payables/:payableId/paid` | `module.partners` |
| GET | `/api/internal/partners/:id/stats` | `module.partners` |

## UI surfaces

| Screen | Description |
|---|---|
| `/people/partners` | Partner list (cards on mobile, table on desktop) |
| `/people/partners/[id]` | Partner profile: contact, KYC, terms, leads sent timeline, payables ledger |
| Lead form → partner selector | Autocomplete from existing or quick "+ new partner" inline |
| Money pillar → partner payables tab | Outstanding payables to clear |

## Principle 12 — the bypass risk

A Partner CRM is a Q4 trap if not designed carefully. We do NOT:
- Show the partner the customer's mobile or PAN
- Show the partner the lender details
- Let the partner contact the customer directly through us

We DO:
- Show the partner case status (Applied / Sanctioned / Disbursed / Rejected)
- Show commission payable
- Provide a partner login (Phase 2B+) that shows ONLY their referred leads and aggregate revenue

This makes the Partner CRM aligned-by-construction — partner sees enough to know it's working, never enough to bypass the DSA.

## Capability key

`module.partners` — depends on `module.leads`. Premium-tier.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [04-LEAD.md](04-LEAD.md)
- [07-COMMISSION.md](07-COMMISSION.md)
- [12-BUILDER.md](12-BUILDER.md) — Builder white-label is a separate distribution model
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md)
