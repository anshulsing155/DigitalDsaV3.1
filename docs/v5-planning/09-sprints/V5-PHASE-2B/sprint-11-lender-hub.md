---
type: sprint
phase: V5-PHASE-2B
sprint: 11
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 11 — Lender Hub 3-Band Model (Weeks 23-24)

## Goal

Three visually distinct trust bands for lender info: published (engine) · editorial (DigitalDSA view, bylined) · data (case-derived, volume-gated). Contextual surfacing inside cases.

## Scope

### Editorial entity + admin CRUD

- Schema with stance enum, note, recommendation, author, last_reviewed, is_stale_computed
- Admin app: editorial editor + queue view of stale entries

### Data band materialised view

- ClickHouse `mv_lender_data_band` (already set up in Sprint 7)
- Volume gate: minimum 20 cases per (lender, loan_type, profile_segment, geo_tier) in last 90 days

### Engine enrichment

- Offer endpoint returns `lenderIntel[]` array
- Includes matching published + editorial + data entries

### Lender Hub UI

- `/lenders` browse view (under More pillar)
- Per-lender detail page with three bands
- Visually distinct styling (no risk of confusion)
- Stale entries flagged "Needs review"

### Contextual surfacing in case detail

- When case opens, matching editorial entry surfaces alongside engine offers
- Match on (loan_type, profile_segment, geo_tier)

### A-11 through A-14

- A-11: bands render visually distinct (colour-blind reviewer passes)
- A-12: editorial shows author + last-reviewed; stale flag works
- A-13: contextual surfacing tested
- A-14: data band gated correctly

## Tasks

| Task | Acceptance |
|---|---|
| Editorial schema + admin CRUD | Per spec |
| Staleness computation | Server-side, refreshed on read |
| Data band volume gate | Below threshold → hidden |
| Engine endpoint enriched | Returns lenderIntel[] |
| Lender browse UI | 3-band layout, mobile + desktop |
| Contextual surfacing in case detail | Editorial appears alongside offers |
| Stale entry queue (admin) | Re-review workflow |
| A-11..A-14 lock tests | All pass |

## Tests

- Three bands distinct in DOM
- Editorial author + date always present
- Stale flag flips after review_window_days
- Data band hidden below threshold
- Contextual match works for various (loan_type, segment, geo_tier) combinations

## Decisions needed

- D-9 (review window + threshold) — defaults to 90 days + 20 cases

## Exit criteria

- FR-LEN-1..9 satisfied
- 10-20 editorial entries authored (content ops work in parallel)
- Lender Hub is real, not a contact list

## Owner involvement

4-6 hours/day. Editorial governance setup is owner's call.
