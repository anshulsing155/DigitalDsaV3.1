---
type: sprint
phase: V5-PHASE-2A
sprint: 6
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 6 — Commission 4-state Machine (Weeks 13-14)

## Goal

Commission tracking with explicit 4-state machine, auto-creation on disbursed, sliceable by every dimension. Money pillar live.

## Scope

### Commission entity

- Schema with discriminated union state machine ([../../05-domains/07-COMMISSION.md](../../05-domains/07-COMMISSION.md))
- Repository + service
- Auto-create trigger on case → `disbursed` stage

### State machine

- Expected → Approved → Received → (closed)
- Disputed branch from any state
- Illegal transitions rejected at type and service layer
- Each transition requires evidence (PDF, ref number, screenshot, note)

### Money pillar UI

- Nav item appears (capability `module.commission`)
- Tabs: Pending · Approved · Received · Disputed
- Filters: bank / month / employee / partner / CorpDSA
- Detail drawer per record with state-transition UI
- CSV export

### Mobile UX

- Status-tab swipe (left-right through Pending/Approved/Received)
- Evidence upload via camera
- Pull-to-refresh

### Slicing aggregations

- ClickHouse fact_commissions (start of analytics foundation — Sprint 7 builds full warehouse, but this populates the table)
- Pre-computed nightly into materialised view for fast slicing

### Reconciliation (basic)

- CSV upload UI for lender settlement files
- Match by lender + ref + amount
- Bulk-transition matched records
- Report unmatched rows for review

## Tasks

| Task | Acceptance |
|---|---|
| Commission entity schema + state machine | Type-safe, illegal transitions rejected |
| Auto-create on stage transition to disbursed | Tested |
| Money pillar UI (mobile + desktop) | Tabs, filters, drawer all work |
| State transition flows with evidence | Required evidence enforced |
| Slicing endpoint | `/api/internal/commissions/aggregate` returns sliced data |
| Reconciliation CSV upload | Admin role; match logic works |
| Mobile status-tab swipe | Tested on actual device |
| Push notification on state change | Optional — opt-in setting |

## Tests

- A-7: case disbursed → commission auto-created in Expected state
- A-7: slice by bank / month / employee / partner returns correct totals
- Illegal transition lock test (e.g., Received → Expected blocked)
- Auto-create with CorpDSA selection populates corp_dsa_id + facilitation_fee
- Reconciliation matches by lender + ref correctly
- BOLA isolation

## Decisions needed

- D-8 (billing placement) — defaults to Money pillar (per SRS)

## Exit criteria

- A-7 passes
- FR-MONEY-1..3 satisfied
- A solo DSA sees their pending/approved/received commission for the month
- CSV export works
- The "commission tracked" Phase-1 exit clause becomes true

## Owner involvement

5-7 hours/day. Money flows are high-risk — careful review needed.
