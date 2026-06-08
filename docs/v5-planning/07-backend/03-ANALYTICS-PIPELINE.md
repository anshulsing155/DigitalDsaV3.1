---
type: backend
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Analytics Pipeline — MongoDB → ClickHouse

## The split

| Database | Role | Region |
|---|---|---|
| MongoDB Atlas | OLTP — operational truth | Mumbai |
| ClickHouse (self-hosted) | OLAP — analytics, BI, reports | Mumbai VPS |

Why not analytics on Mongo: aggregating across millions of rows kills the OLTP server. ClickHouse columnar storage makes the same queries 100× faster.

## Pipeline

```
MongoDB change-stream
   ↓
BullMQ consumer (etl/consumers/<collection>.ts)
   ↓
Transformer (etl/transforms/<fact>.ts)
   ↓
ClickHouse insert (ReplacingMergeTree)
```

Lag SLO:
- Hot tables (cases, commissions, conversation_events): <5 min
- Cold tables (lender_outcomes daily aggregates): <1 hour

## ClickHouse schema — star pattern

### Dimensions

```sql
CREATE TABLE dim_dsa_orgs (
  org_id String,
  org_name String,
  plan String,
  region String,
  created_at DateTime,
  updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY org_id;

CREATE TABLE dim_lenders (
  lender_code String,
  lender_name String,
  kind String
) ENGINE = MergeTree() ORDER BY lender_code;

CREATE TABLE dim_loan_types (
  loan_type String,
  loan_label String
) ENGINE = MergeTree() ORDER BY loan_type;

CREATE TABLE dim_time (
  date Date,
  day_of_week UInt8,
  is_weekend UInt8,
  is_month_start UInt8,
  is_quarter_start UInt8,
  fiscal_year UInt16
) ENGINE = MergeTree() ORDER BY date;
```

### Facts

```sql
CREATE TABLE fact_cases (
  case_id String,
  org_id String,
  customer_id String,
  loan_type String,
  loan_amount_inr Decimal(15, 2),
  stage String,
  stage_entered_at DateTime,
  created_at DateTime,
  disbursed_at Nullable(DateTime),
  closed_at Nullable(DateTime),
  source_partner_id Nullable(String),
  assigned_to_user_id Nullable(String),
  branch_id Nullable(String),
  days_to_sanction Nullable(UInt16),
  days_to_disburse Nullable(UInt16),
  updated_at DateTime,
  version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (org_id, case_id);

CREATE TABLE fact_commissions (
  commission_id String,
  org_id String,
  case_id String,
  lender String,
  state String,
  amount_expected_inr Decimal(15, 2),
  amount_received_inr Nullable(Decimal(15, 2)),
  disbursed_at DateTime,
  approved_at Nullable(DateTime),
  received_at Nullable(DateTime),
  corp_dsa_id Nullable(String),
  partner_id Nullable(String),
  employee_user_id Nullable(String),
  updated_at DateTime,
  version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (org_id, commission_id);

CREATE TABLE fact_conversations (
  event_id String,
  org_id String,
  customer_id String,
  case_id Nullable(String),
  channel String,
  direction String,
  template_id Nullable(String),
  delivery_status Nullable(String),
  created_at DateTime
) ENGINE = MergeTree()
ORDER BY (org_id, created_at);

CREATE TABLE fact_follow_ups (
  follow_up_id String,
  org_id String,
  owner_user_id String,
  type String,
  due_at DateTime,
  completed_at Nullable(DateTime),
  source String,
  updated_at DateTime,
  version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (org_id, follow_up_id);

CREATE TABLE fact_corp_dsa_selections (
  case_id String,
  org_id String,
  corp_dsa_id String,
  slab_version String,
  expected_payout_inr Decimal(15, 2),
  facilitation_fee_inr Decimal(15, 2),
  selected_at DateTime
) ENGINE = MergeTree()
ORDER BY (org_id, selected_at);

CREATE TABLE fact_lender_outcomes (
  case_id String,
  org_id String,
  lender String,
  loan_type String,
  profile_segment String,
  geo_tier String,
  outcome String,                     -- 'sanctioned', 'rejected', 'disbursed'
  disbursed_at Nullable(DateTime),
  rejected_at Nullable(DateTime),
  days_to_outcome UInt16
) ENGINE = MergeTree()
ORDER BY (lender, loan_type, profile_segment, geo_tier);
```

### Materialised views (for lender data band)

```sql
CREATE MATERIALIZED VIEW mv_lender_data_band
ENGINE = AggregatingMergeTree()
ORDER BY (lender, loan_type, profile_segment, geo_tier, window_start)
AS SELECT
  lender,
  loan_type,
  profile_segment,
  geo_tier,
  toStartOfDay(disbursed_at) AS window_start,
  countState() AS case_count,
  countIfState(outcome = 'disbursed') AS disbursed_count,
  avgState(days_to_outcome) AS avg_tat_days
FROM fact_lender_outcomes
GROUP BY lender, loan_type, profile_segment, geo_tier, window_start;
```

Querying the materialised view:

```sql
SELECT
  countMerge(case_count) AS cases,
  countIfMerge(disbursed_count) AS disbursed,
  avgMerge(avg_tat_days) AS avg_tat
FROM mv_lender_data_band
WHERE lender = 'HDFC'
  AND loan_type = 'lap'
  AND profile_segment = 'salaried'
  AND geo_tier = 'tier1_metro'
  AND window_start >= now() - INTERVAL 90 DAY;
```

## PII discipline in ClickHouse

**No PII columns.** Specifically:
- No `full_name`, `mobile`, `pan`, `email`, `address` columns
- Names hashed if needed: `customer_id` (the ObjectId) is the only customer reference
- For per-DSA reports requiring "Priya Singh" display, the report joins back to MongoDB at query time — never stored in CH

The CH analyst can compute "47 customers with HDFC LAP cases" but cannot derive who those 47 are.

## CDC consumer pattern

```typescript
// etl/consumers/cases.ts
import { MongoClient } from 'mongodb';
import { Queue } from 'bullmq';

const cases = mongo.collection('cases');
const queue = new Queue('etl.fact_cases');

const changeStream = cases.watch([], { fullDocument: 'updateLookup' });

changeStream.on('change', async (change) => {
  await queue.add('upsert', {
    operation: change.operationType,           // insert/update/delete
    fullDocument: change.fullDocument,
    documentKey: change.documentKey,
  });
});
```

Worker:

```typescript
queue.process('upsert', async (job) => {
  const { operation, fullDocument } = job.data;

  if (operation === 'delete') {
    await ch.insert('fact_cases', {
      case_id: fullDocument._id.toString(),
      // ... tombstone row with version = max
    });
    return;
  }

  const row = transformCaseToFact(fullDocument);
  await ch.insert('fact_cases', row);
});
```

ReplacingMergeTree dedups on `(org_id, case_id)` with the highest `version` winning.

## Erasure propagation (DPDP)

When a customer is marked for erasure:
1. MongoDB customer doc gets `marked_for_erasure_at`
2. Cascade: customer's cases, conversations, follow-ups also marked
3. CDC consumer detects the mark
4. ClickHouse rows for those entities updated with `is_erased: true` flag
5. All queries filter `WHERE is_erased = 0`
6. After 90-day backup window, ClickHouse drop-by-tombstone removes the rows

## Backfill

For initial setup and recovery: a one-time backfill script reads MongoDB collections in batches and writes to ClickHouse. Idempotent (uses version).

## Metabase

Internal BI on top of ClickHouse. Used by:
- Owner — overall org-fleet metrics
- Per-tenant reports (when bundled to enterprise tier)
- Lender editorial team — for data band updates

Metabase is self-hosted on a Mumbai VPS with RBAC. Analysts get read-only access to a curated subset of ClickHouse.

## Cost

ClickHouse self-hosted starting: ~₹4,000-8,000/month for small instance (1-2TB).
Metabase: free (self-host on the same VPS).
BullMQ workers: minimal additional compute on the existing Redis VPS.

Total analytics infra cost at Beta scale: < ₹10k/month.

## Related docs

- [../02-architecture/01-SYSTEM-OVERVIEW.md](../02-architecture/01-SYSTEM-OVERVIEW.md)
- [../08-database/02-CLICKHOUSE-SCHEMA.md](../08-database/02-CLICKHOUSE-SCHEMA.md)
- [../09-sprints/V5-PHASE-2A/sprint-7-analytics-foundation.md](../09-sprints/V5-PHASE-2A/sprint-7-analytics-foundation.md)
