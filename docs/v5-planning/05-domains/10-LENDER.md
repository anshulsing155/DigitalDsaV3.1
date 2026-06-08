---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2B Sprint 11
capability_key: module.lender_hub
---

# Lender Domain

## What this domain is

Lenders are banks and NBFCs. Their data is **globally readable** (any tenant can see it) but **only DigitalDSA-authored**. Three distinct trust bands:

| Band | Source | Trust character |
|---|---|---|
| `published` | Lender-published policy (rates, eligibility, TAT, contacts) | Authoritative |
| `editorial` | DigitalDSA's view — 1-2 sentence judgement | Clearly an opinion, bylined, dated |
| `data` | Aggregated from cases across the platform | Measured evidence, volume-gated |

Dashboard renders the three bands visually distinct; never authors any of them itself.

## Schema — Lender (entity)

```typescript
export const LenderSchema = z.object({
  _id: ObjectIdSchema,
  code: z.string(),                             // e.g., "HDFC", "ICICI"
  name: z.string(),                             // "HDFC Bank Limited"
  short_name: z.string(),                       // "HDFC"
  kind: z.enum(['bank', 'nbfc', 'hfc', 'other']),
  logo_url: z.string().url().optional(),
  loan_types_offered: z.array(z.string()),
  active: z.boolean().default(true),
});
```

## Schema — LenderPublishedPolicy (managed by PMS, brought from V3)

Lender policies (eligibility, rates, TAT, requirements) are encoded in PMS by DigitalDSA staff. Schema follows V3's PMS structure — ported as-is.

## Schema — LenderEditorial

```typescript
export const LenderEditorialSchema = z.object({
  _id: ObjectIdSchema,
  lender_code: z.string(),

  // Match dimensions
  loan_type: z.enum(['home', 'lap', 'plot', 'personal', 'business', 'professional', 'bt_topup', 'all']),
  profile_segment: z.enum(['salaried', 'self_employed', 'senp', 'all']),
  geo_tier: z.enum(['tier1_metro', 'tier1_non_metro', 'tier2', 'tier3', 'all']),

  stance: z.enum(['strong', 'workable', 'avoid']),
  note: z.string().max(500),                    // free-text judgement
  recommendation: z.string().max(500).optional(), // e.g., "Send to Aavas for self-employed in tier-2 instead"

  author: z.object({
    name: z.string(),
    role: z.string(),                           // "Senior Policy Analyst"
  }),
  last_reviewed: z.date(),
  review_window_days: z.number().int().default(90),
  is_stale_computed: z.boolean(),               // server-computed: now() - last_reviewed > review_window_days

  created_at: z.date(),
  updated_at: z.date(),
  schema_version: z.literal(1),
});
```

## Schema — LenderData (computed from cases)

This is a ClickHouse materialised view, not a MongoDB collection. Refreshed daily.

```sql
-- ClickHouse materialised view
CREATE MATERIALIZED VIEW fact_lender_outcomes_mv
ENGINE = SummingMergeTree()
ORDER BY (lender_code, loan_type, profile_segment, geo_tier, window_start)
AS SELECT
  lender_code,
  loan_type,
  profile_segment,
  geo_tier,
  toStartOfMonth(disbursed_at) AS window_start,
  count() AS case_count,
  countIf(stage = 'disbursed') AS disbursed_count,
  countIf(stage = 'rejected') AS rejected_count,
  avg(days_to_sanction) AS avg_tat_days,
  avg(commission_amount_inr) AS avg_commission_inr
FROM fact_cases
GROUP BY lender_code, loan_type, profile_segment, geo_tier, window_start;
```

Data band is **gated by volume**:
- Default: minimum 20 cases per (lender, loan_type, profile_segment, geo_tier) in last 90 days
- Below threshold: data band is hidden entirely
- When shown: "Based on N cases in last 90 days" disclosure

## Service methods

```typescript
class LendersService {
  // Read
  list(): Promise<Lender[]>
  findByCode(code): Promise<Lender | null>

  // Published policies — read from PMS
  getPublishedPolicy(lenderCode, loanType): Promise<LenderPublishedPolicy>

  // Editorial
  getEditorialFor(lenderCode, loanType, profileSegment, geoTier): Promise<LenderEditorial | null>
  listEditorials(filters): Promise<LenderEditorial[]>                  // for admin
  isStale(editorial): boolean

  // Data band
  getDataFor(lenderCode, loanType, profileSegment, geoTier): Promise<LenderData | null>

  // Combined: for offer contextual surfacing
  enrichOffer(offer, caseProfile): Promise<EnrichedOffer>
  // Returns offer + matched editorial + matched data
}
```

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/lenders` | base |
| GET | `/api/internal/lenders/:code` | base |
| GET | `/api/internal/lenders/:code/published-policy/:loan_type` | base |
| GET | `/api/internal/lenders/:code/editorial?loan_type=&...` | `module.lender_hub` |
| GET | `/api/internal/lenders/:code/data?loan_type=&...` | `module.lender_hub` |
| POST | `/admin/lenders/:code/editorial` | admin (content ops role) |

## UI surfaces

| Screen | Description |
|---|---|
| Lender browse (`/lenders` under More) | List view → per-lender detail page with the three bands |
| Per-lender detail page | Published policy (top, dominant), editorial card (left rail, bylined + dated), data band (bottom, sample-size disclosed) |
| Inside case detail → offer card | Editorial match surfaces alongside the engine's offer ("Note from DigitalDSA: HDFC strong for salaried HL in tier-1; consider Aavas for self-employed in tier-2") |
| Admin → editorial editor | CRUD for editorial entries with author + last-reviewed tracking |

### Visual hierarchy enforcement

- `published` uses card primary style (dominant)
- `editorial` uses left-rail callout with author badge + last-reviewed badge — never styled identically to published
- `data` uses subtle bottom card with sample-size badge — clearly an aggregate, not policy

Lock test: each band's rendered DOM has distinct CSS classes; visual regression captures any change.

## Staleness handling

`is_stale_computed` is set by:
```typescript
const isStale = (now - editorial.last_reviewed) > editorial.review_window_days * day_ms;
```

UI shows a "Needs review" badge on stale entries. Admin sees a list of stale entries in their queue. Content ops re-validate and bump `last_reviewed`.

## Editorial governance

This is ops process, not just schema:
- Every entry has an author and last-reviewed date
- 90-day default review window (configurable per entry)
- Stale entries flagged in admin queue
- Quarterly editorial audit: random sample, do they still reflect reality?
- Sunset triggers: if a lender materially changes policy, all editorial entries for that lender flagged

## Cross-domain interactions

| Other domain | When |
|---|---|
| Cases | Engine returns offers; service enriches with editorial + data |
| Engine | Reads published policies for evaluation |
| ClickHouse | Data band reads from `fact_lender_outcomes` |
| Admin app | Editorial CRUD lives here |

## Capability key

`module.lender_hub` — for the browse view and contextual surfacing. The published-policy access is always available (it's how the engine works); the editorial and data bands are the gated parts.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [02-CASE.md](02-CASE.md)
- [../07-backend/03-ANALYTICS-PIPELINE.md](../07-backend/03-ANALYTICS-PIPELINE.md)
- [../09-sprints/V5-PHASE-2B/sprint-11-lender-hub.md](../09-sprints/V5-PHASE-2B/sprint-11-lender-hub.md)
