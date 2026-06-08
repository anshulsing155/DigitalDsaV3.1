---
type: sprint
phase: V5-PHASE-2A
sprint: 7
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 7 — Analytics Foundation (Weeks 15-16)

## Goal

Stand up ClickHouse on Mumbai VPS. CDC pipeline from MongoDB. Foundation for every report and BI surface in Phase 2B.

No user-facing screens — pure infrastructure.

## Scope

### ClickHouse self-hosted

- AWS EC2 t3.large in ap-south-1 (Mumbai)
- ClickHouse 24.x stable
- Database `digitaldsa_olap`
- Backups to S3 Mumbai daily
- Internal-only access (no public exposure)

### Star schema

- Dimensions: `dim_dsa_orgs`, `dim_lenders`, `dim_loan_types`, `dim_partners`, `dim_corp_dsas`, `dim_users`, `dim_time`
- Facts: `fact_cases`, `fact_commissions`, `fact_conversations`, `fact_follow_ups`, `fact_lender_outcomes`
- Materialised view: `mv_lender_data_band` (precomputed for fast lookup)

### CDC pipeline

- MongoDB change streams per collection
- BullMQ consumer per fact table
- Transformers (`etl/transforms/*.ts`)
- Idempotent inserts (ReplacingMergeTree on _id + version)
- Backfill script for historical data

### Erasure propagation

- Tombstone events when MongoDB record marked for erasure
- CH rows updated with `is_erased: 1`
- All queries filter `WHERE is_erased = 0`

### Metabase

- Self-hosted on the same Mumbai VPS
- Connected to ClickHouse with read-only role
- Initial dashboards:
  - Org fleet overview (owner)
  - Lender coverage matrix (engineering)
  - Pipeline health by stage (ops)

## Tasks

| Task | Acceptance |
|---|---|
| ClickHouse VPS deployed | Reachable on internal network |
| Star schema DDL | All tables + dimensions + facts created |
| CDC consumer for fact_cases | Mongo updates appear in CH within 5 min |
| CDC consumer for fact_commissions | Same |
| CDC consumer for fact_conversations | Same |
| CDC consumer for fact_follow_ups | Same |
| Materialised view for lender data band | Refresh on insert |
| Erasure tombstone propagation | DPDP erasure marks CH rows |
| Backfill script | Reads existing Mongo data into CH |
| Metabase deployed | Reachable internally; ClickHouse connected |
| 3 initial dashboards | Org fleet, lender coverage, pipeline health |
| Cron backup to S3 Mumbai | Daily; encrypted |
| Cost monitoring | CH compute cost tracked |

## Tests

- CDC idempotency: replay same event → same CH row
- Erasure: mark customer → fact_cases.is_erased flips
- Lag SLO: 95% of changes propagate < 5 min
- Backfill: re-run on empty CH → produces same result
- Pipeline lag monitoring in Sentry

## Decisions needed

- D-14 (ClickHouse confirmed) — by Week 12, well before this sprint

## What's not in this sprint

- User-facing Reports module (Sprint 14 in Phase 2B)
- Lender Hub 3-band UI (Sprint 11) — data band materialised view is ready but UI defers

## Exit criteria

- ClickHouse running with all star tables
- CDC pipeline live for all 5 fact tables
- Backfill of existing data complete
- Metabase reachable; 3 dashboards working
- Lag SLO holding
- A-19 / A-20 lock tests can read from CH (planned use)

## Owner involvement

3-5 hours/day. More ops-heavy; engineer assistance OK if pulled briefly from V3 team.
