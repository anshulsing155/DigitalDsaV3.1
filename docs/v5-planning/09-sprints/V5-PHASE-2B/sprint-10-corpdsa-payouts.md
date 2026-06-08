---
type: sprint
phase: V5-PHASE-2B
sprint: 10
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 10 — CorpDSA Per-File Payout Comparison (Weeks 21-22)

## Goal

DSA opens an offer card → sees a comparison of which CorpDSAs pay them how much for this specific file. Picks the best one. DigitalDSA charges flat facilitation fee. Monthly slab update flow operational.

## Scope

### CorpDSA + PayoutSlab entities

- Schemas ([../../05-domains/09-CORP-DSA.md](../../05-domains/09-CORP-DSA.md))
- Versioned slabs with `valid_from` and `valid_to`
- Global (DigitalDSA-managed), not per-tenant

### Slab data entry flow

- Admin UI per CorpDSA: rate card editor or CSV upload
- Creates new version with `valid_from = first of month`
- Previous version auto-superseded
- Source evidence ref to S3

### Comparison API

- `GET /api/internal/cases/:id/payout-comparison`
- Returns sorted CorpDSA options
- DigitalDSA flat facilitation fee shown explicitly
- Frozen slab_version on selection

### Comparison UI

- Expandable section on offer card per lender
- Per CorpDSA: slab, settlement cycle, computed payout, net to DSA
- Default sort: net to DSA (highest first)
- Mobile: stacked cards; desktop: table
- Selection button per row → confirms freeze

### Monthly update digest

- Email to DSAs by 5th of month: "September payouts updated"
- Dashboard "Payouts updated" badge on affected cases
- Compare new vs old slabs for "you could've earned more if you'd picked X this month" insight

### A-20 lock test

Facilitation fee independent of CorpDSA selection — asserted across 50 fixture cases.

## Tasks

| Task | Acceptance |
|---|---|
| CorpDSA + PayoutSlab schemas | Per spec |
| Admin slab editor | CSV upload + manual editor |
| Comparison API | < 500ms for 10-CorpDSA case |
| Comparison UI (mobile + desktop) | Per design |
| Selection writes frozen values to case | Tested |
| Monthly update digest email | Templated, localised |
| ClickHouse fact_corp_dsa_selections | Populated |
| A-20 lock test | Passes |
| Audit log on every fee change | Settings-level constant |
| Commission integration | corp_dsa_payout, facilitation_fee flow to commission record |

## Tests

- Slab version overlap detection
- Lookup correctness across date boundaries
- A-20: fee flat across selections
- Selection rollback on case-update failure
- Monthly digest email rendering

## Decisions needed

- D-2 confirmed (payout figures + flat fee)

## Exit criteria

- A-20 passes
- §13 aligned-by-construction CorpDSA monetisation live
- First 2-3 CorpDSAs onboarded with September slabs

## Owner involvement

4-6 hours/day. Ops process for monthly slab updates needs owner attention (assign person, set cadence).
