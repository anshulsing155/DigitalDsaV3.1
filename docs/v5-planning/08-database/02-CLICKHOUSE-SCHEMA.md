---
type: database
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# ClickHouse Schema

## Deployment

- Self-hosted on Mumbai VPS (AWS Mumbai EC2 or Indian provider)
- Version: ClickHouse 24.x stable
- Cluster: single-node initially, multi-node if needed at GA scale
- Backup: snapshot to S3 Mumbai daily
- Access: Metabase + select engineers via SQL client; no direct app code access

## Database structure

```
digitaldsa_olap
  ├─ dimensions
  │   ├─ dim_dsa_orgs
  │   ├─ dim_lenders
  │   ├─ dim_loan_types
  │   ├─ dim_partners
  │   ├─ dim_corp_dsas
  │   ├─ dim_users
  │   └─ dim_time
  ├─ facts
  │   ├─ fact_cases
  │   ├─ fact_commissions
  │   ├─ fact_conversations
  │   ├─ fact_follow_ups
  │   ├─ fact_lender_outcomes
  │   ├─ fact_corp_dsa_selections
  │   ├─ fact_partner_attribution
  │   └─ fact_audit_summary
  └─ materialised_views
      ├─ mv_lender_data_band
      ├─ mv_org_monthly_summary
      └─ mv_partner_conversion_funnel
```

## Sample fact tables

(For full DDL see `etl/schemas/`.)

### fact_cases

```sql
CREATE TABLE digitaldsa_olap.fact_cases (
  case_id String,
  org_id String,
  customer_id_hash String,                -- HMAC, not the actual customer_id (defence in depth)
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
  is_erased UInt8 DEFAULT 0,
  updated_at DateTime,
  version UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (org_id, case_id)
PARTITION BY toYYYYMM(created_at);
```

Partition by month — drops trivially when retention expires.

### fact_lender_outcomes (the data band source)

```sql
CREATE TABLE digitaldsa_olap.fact_lender_outcomes (
  case_id String,
  org_id String,
  lender String,
  loan_type String,
  profile_segment String,                -- 'salaried', 'self_employed', 'senp'
  geo_tier String,                       -- 'tier1_metro', 'tier1_non_metro', 'tier2', 'tier3'
  outcome String,                        -- 'sanctioned', 'rejected', 'disbursed', 'dropped'
  disbursed_at Nullable(DateTime),
  rejected_at Nullable(DateTime),
  days_to_outcome UInt16,
  is_erased UInt8 DEFAULT 0
) ENGINE = MergeTree()
ORDER BY (lender, loan_type, profile_segment, geo_tier, disbursed_at)
PARTITION BY toYYYYMM(disbursed_at);
```

### mv_lender_data_band (materialised view)

```sql
CREATE MATERIALIZED VIEW digitaldsa_olap.mv_lender_data_band
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
  countIfState(outcome = 'sanctioned') AS sanctioned_count,
  countIfState(outcome = 'rejected') AS rejected_count,
  avgState(days_to_outcome) AS avg_tat_days
FROM digitaldsa_olap.fact_lender_outcomes
WHERE is_erased = 0
GROUP BY lender, loan_type, profile_segment, geo_tier, window_start;
```

Queried at request time for Lender Hub data-band rendering.

## PII safety

**No PII column anywhere.** All identity references are either:
- `org_id`, `case_id`, `customer_id_hash` (HMACs) — opaque
- `lender`, `loan_type` — non-PII categorical

Aggregates over many orgs (for DigitalDSA-internal lender intelligence) tolerate multi-tenant data because individual rows are pseudonymised.

## DPDP erasure

Erasure propagates from MongoDB:
1. MongoDB `markedForErasure` event
2. CDC consumer updates corresponding CH rows with `is_erased = 1` and version bumped
3. All production queries filter `WHERE is_erased = 0`
4. After 90-day backup window, a maintenance job DROP PARTITIONS for old months OR runs `OPTIMIZE FINAL` and `ALTER TABLE … DELETE WHERE is_erased = 1`

## Retention policy

| Table | Retention |
|---|---|
| fact_cases | 7 years (for DSA business records) |
| fact_commissions | 7 years (financial record) |
| fact_conversations | 2 years (active reference) + 5 year audit-only |
| fact_follow_ups | 1 year |
| fact_lender_outcomes | 3 years rolling |
| dim_* | Indefinite |

Implemented via `TTL` clauses and monthly partition drops.

## Backups

- Daily `BACKUP DATABASE digitaldsa_olap TO Disk('mumbai_s3', 'backup/YYYY-MM-DD')`
- Retained 30 days
- Restore drill quarterly

## Access control

Three roles:

| Role | Access |
|---|---|
| `etl_writer` | INSERT on all fact_* and dim_* |
| `metabase_reader` | SELECT on all (read-only) |
| `analyst` | SELECT on all + temp table CREATE for analysis |

Owner is the only one with full DDL access.

## Query performance

| Query | Target |
|---|---|
| Single-org monthly summary | < 100ms |
| Lender data band lookup | < 500ms |
| Cross-org owner dashboard | < 2s |
| Custom ad-hoc query | best effort |

Indexes via ORDER BY (in ClickHouse, the order-by is the sort key); materialised views for repeated aggregates.

## Cost projection

| Stage | Storage | Monthly cost |
|---|---|---|
| Beta | < 50GB | ₹3,000-5,000 (small VPS) |
| Early GA | < 500GB | ₹8,000-15,000 |
| Scale GA | 1-5TB | ₹25,000-50,000 |

Stays cheap relative to value because columnar compression is excellent for our shape of data.

## Related docs

- [01-MONGODB-SCHEMA.md](01-MONGODB-SCHEMA.md)
- [../07-backend/03-ANALYTICS-PIPELINE.md](../07-backend/03-ANALYTICS-PIPELINE.md)
- [../09-sprints/V5-PHASE-2A/sprint-7-analytics-foundation.md](../09-sprints/V5-PHASE-2A/sprint-7-analytics-foundation.md)
