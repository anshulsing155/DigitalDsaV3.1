---
type: sprint
phase: V5-PHASE-2A
sprint: 8
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 8 — GA Readiness (Weeks 17-18)

## Goal

Migrate Beta cohort from V3 to V5. Final hardening. Public GA launch.

## Scope

### V3 → V5 migration script

- Per-tenant migration:
  1. Read V3 cases for tenant
  2. Extract `optional_contact` blobs
  3. Normalise mobile, blind-index
  4. Dedup within tenant → create Customer records
  5. Set `customer_id` on V5 cases
  6. Re-root V3 `CommunicationThread` → V5 Conversation/ConversationEvent
  7. Carry forward consent records (with grace period if needed)
  8. Emit timeline events for the migration
- Idempotent, resumable, batched at 100 docs/sec
- Tested on V3 staging clone before each tenant migration

### Beta cohort onboarding to V5

- Per-DSA migration runs during their natural off-hours
- Welcome email: "Your DigitalDSA upgraded to V5. Here's what's new and what to expect."
- Onboarding call within 48h
- V3 stays read-only for 6 months

### Smoke tests across all Phase 2A surfaces

- Lead → Customer → Case → Engine → Offers → Documents → WhatsApp → Commission
- Every critical path covered by Playwright E2E

### Public-launch hardening

- SEC-7 credential rotation (deferred during Beta v1; mandatory before GA)
- Final BOLA sweep on all endpoints
- Penetration test (external firm)
- DPDP compliance audit (legal sign-off)
- RBI DSA guidelines review
- Cost monitoring + capacity planning verified for GA scale

### Marketing site updates

- digitaldsa.com landing page
- Pricing page with bundle preview
- Privacy notice with India residency commitment
- Status page link visible
- Open registration (with capacity cap)

### Support readiness

- Support team trained
- Runbook for top 20 issues
- WhatsApp + email + status page channels live
- First-response SLA: 4 hours business, 24 hours weekends

## Tasks

| Task | Acceptance |
|---|---|
| V3 → V5 migration script | Tested on staging clone of every Beta tenant's data |
| Per-tenant migration scheduled + executed | All Beta DSAs migrated by Week 17 Friday |
| Smoke tests all green | 5 critical paths × 90 fixture cases |
| Penetration test | Report cleared; high-severity findings resolved |
| SEC-7 credential rotation | All credentials rotated; old keys archived |
| DPDP compliance audit | Legal sign-off documented |
| Marketing site updates | Landing, pricing, privacy, status all live |
| Public registration | Capacity-capped initially (200/day) |
| Support team trained | All team members on runbook |
| Status page integrated | Real signals, no false-positives |

## V3 → V5 dual-write window

Beta cohort cases created in V3 during migration sprint also get mirrored to V5 in real-time. After cutover, V3 goes read-only.

## Tests

- Migration script: idempotent rerun
- Migration script: per-tenant isolation
- Migration script: dedup correctness on cases with same applicant
- Conversation re-rooting: V3 threads land as V5 Conversations
- Capacity test: 1000 concurrent DSAs simulated

## Exit criteria

- All Beta cohort migrated
- V3 in read-only mode
- All Phase-1 exit clauses pass
- Public registration open
- First non-Beta DSAs onboard
- Status page shows green
- Owner sleeps OK

## Owner involvement

Full-time during this sprint. Public launch is owner's call; safety net is hands-on.
