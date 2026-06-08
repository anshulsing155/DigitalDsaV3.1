---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2B Sprint 10
capability_key: module.corp_dsa_compare
---

# CorpDSA Domain

## What this domain is

A CorpDSA (Corporate DSA) is a large aggregator that has its own master DSA codes with banks. Small DSAs file their cases through a CorpDSA to access banks they can't onboard with directly. Each CorpDSA pays a different per-file payout depending on lender + product + DSA's own loan profile.

DigitalDSA's role: show the DSA which CorpDSA pays them the most for THIS file, and charge a **flat facilitation fee** so we don't bias the comparison.

This is a §13 aligned-by-construction monetisation feature: helps the DSA earn more (Q1), doesn't bypass them (Q4).

## Schema — CorpDSA

```typescript
export const CorpDsaSchema = z.object({
  _id: ObjectIdSchema,
  // CorpDSAs are global (DigitalDSA-managed), not per-org
  name: z.string(),                              // e.g., "Andromeda", "BankBazaar Distribution"
  corporate_entity: z.string(),                  // legal entity name
  terms_url: z.string().url(),                   // T&C document
  settlement_cycle_days: z.number().int(),       // e.g., 30 = monthly settlement
  contact: z.array(z.object({
    role: z.enum(['relationship_manager', 'accounts', 'escalation']),
    name: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  })).default([]),
  active: z.boolean().default(true),
  notes_for_dsa: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
  schema_version: z.literal(1),
});
```

## Schema — PayoutSlab (versioned, monthly)

```typescript
export const PayoutSlabSchema = z.object({
  _id: ObjectIdSchema,
  corp_dsa_id: ObjectIdSchema,
  lender: z.string(),
  loan_type: z.enum(['home', 'lap', 'plot', 'personal', 'business', 'professional', 'bt_topup']),
  product_variant: z.string().optional(),        // e.g., "self_employed_LAP"
  profile_segment: z.enum(['salaried', 'self_employed', 'senp', 'all']).optional(),
  geo_tier: z.enum(['tier1_metro', 'tier1_non_metro', 'tier2', 'tier3', 'all']).optional(),

  basis: z.enum(['percent_of_disbursement', 'flat', 'tiered']),
  percent_bp: z.number().optional(),             // basis points (250 = 2.50%)
  flat_inr: z.number().optional(),
  tiered_brackets: z.array(z.object({
    from_inr: z.number(),
    to_inr: z.number().optional(),
    percent_bp: z.number(),
  })).optional(),

  // Versioning — immutable
  version: z.string(),                           // e.g., "2026-09" (year-month)
  valid_from: z.date(),
  valid_to: z.date().optional(),                 // auto-set when superseded
  source_evidence_url: z.string().optional(),    // S3 link to the CorpDSA's emailed rate card

  created_at: z.date(),
  created_by_user_id: ObjectIdSchema,            // admin user
  schema_version: z.literal(1),
});
```

## The monthly update flow

The trickiest operational piece. CorpDSAs send updated payout rate cards monthly (usually by 5th of each month, effective 1st).

```
By 5th of month:
  Admin user (DigitalDSA ops) receives rate card from each CorpDSA
   ↓
  Admin UI: per-CorpDSA rate card editor or CSV upload
   ↓
  Creates new PayoutSlab versions with valid_from = first of month
   ↓
  Previous version's valid_to auto-set to (new valid_from - 1 second)
   ↓
  Lookup at any future time uses the version where valid_from <= now < valid_to
   ↓
  If a DSA had selected an old version on a case, the case keeps that frozen
  selection — new versions don't retroactively change historical commissions
   ↓
  Email digest goes to DSAs: "September payouts updated. 12 of your active cases may now have different best-CorpDSA picks."
   ↓
  Dashboard shows "Payouts updated" badge on affected cases
```

## Lookup logic

```typescript
async function findBestPayoutForCase(case_: Case, asOf: Date = new Date()): Promise<CorpDsaPayoutComparison[]> {
  // Find all CorpDSAs that have an active slab for this lender + loan_type
  const slabs = await payoutSlabs.find({
    lender: case_.lender,
    loan_type: case_.loan_type,
    valid_from: { $lte: asOf },
    $or: [{ valid_to: null }, { valid_to: { $gt: asOf } }],
    // ... match profile_segment / geo_tier if specified
  });

  // Compute expected payout for each
  const comparisons = slabs.map(slab => ({
    corp_dsa: getCorpDsa(slab.corp_dsa_id),
    slab_version: slab.version,
    computed_payout_inr: computePayout(slab, case_.disbursement_estimate_inr),
    facilitation_fee_inr: FLAT_FACILITATION_FEE_INR,  // CONSTANT — does not vary
    net_to_dsa_inr: computed_payout_inr - facilitation_fee_inr,
  }));

  // Default sort: highest net_to_dsa first
  return comparisons.sort((a, b) => b.net_to_dsa_inr - a.net_to_dsa_inr);
}
```

## The flat facilitation fee — locked

```typescript
// In a config, audit-logged on every change
export const FLAT_FACILITATION_FEE_INR = 500;  // example value

// Server-side constant, NEVER varies based on selection
```

**Lock test (A-20):**

```typescript
describe('CorpDSA payout comparison', () => {
  it('A-20: facilitation fee independent of CorpDSA selection', async () => {
    for (const fixture of corpDsaFixtures) {
      const comparison = await service.compare(fixture.case);
      const feeValues = new Set(comparison.map(c => c.facilitation_fee_inr));
      expect(feeValues.size).toBe(1);  // exactly one unique value
    }
  });
});
```

## Service methods

```typescript
class CorpDsaService {
  // Admin
  createCorpDsa(input, by): Promise<CorpDsa>            // admin role only
  updateCorpDsa(id, patch, by): Promise<CorpDsa>
  importSlabs(corpDsaId, csvBuffer, version, by): Promise<{ created: number; replaced: number }>

  // Read
  listActive(): Promise<CorpDsa[]>                       // for any tenant
  findById(id): Promise<Result<CorpDsa, 'not_found'>>

  // Lookup
  findBestPayoutForCase(case_, asOf): Promise<CorpDsaPayoutComparison[]>

  // Selection
  selectForCase(caseId, corpDsaId, by: User): Promise<Case>
  // freezes slab_version and computed values on the case
}
```

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/corp-dsas` | (read, all tenants) |
| POST | `/admin/corp-dsas` | admin role |
| POST | `/admin/corp-dsas/:id/slabs/import` | admin role |
| GET | `/api/internal/cases/:id/payout-comparison` | `module.corp_dsa_compare` |
| POST | `/api/internal/cases/:id/corp-dsa-selection` | `module.corp_dsa_compare` |

## UI surfaces

| Screen | Description |
|---|---|
| Offer card → Payout comparison section | Expandable section showing all CorpDSAs that handle this lender × loan, with payout per case |
| Above the table | "DigitalDSA facilitation fee: ₹500 flat regardless of choice" (transparent) |
| Sort | Default: net to DSA, descending. Other sorts exposed but default is fixed. |
| Mobile | Stacked cards per CorpDSA |
| Case detail | If selected: "You picked X. Expected ₹Y. Frozen at this slab version." |
| Admin → CorpDSA Manager | Per-CorpDSA slab editor + history view |

## Cross-domain interactions

| Other domain | When |
|---|---|
| Cases | Selection freezes onto the case |
| Commissions | On disbursed, commission record references the frozen slab + facilitation fee |
| ClickHouse | `fact_corp_dsa_selections` for analytics ("which CorpDSAs win the comparison most?") |
| Audit | Every selection logged; facilitation fee changes audit-logged |

## Capability key

`module.corp_dsa_compare` — depends on `module.cases`. Premium-tier (typically Enterprise bundle).

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [02-CASE.md](02-CASE.md)
- [07-COMMISSION.md](07-COMMISSION.md)
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md)
- [../09-sprints/V5-PHASE-2B/sprint-10-corpdsa-payouts.md](../09-sprints/V5-PHASE-2B/sprint-10-corpdsa-payouts.md)
