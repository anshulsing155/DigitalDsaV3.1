---
type: sprint
phase: V5-PHASE-2A
sprint: 1
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 1 — Customer Entity (Weeks 3-4)

## Goal

Real Customer entity with CSFLE encryption, blind indexes, multi-tenant isolation, profile pages on mobile and desktop. The schema spine that every other Phase 2A sprint depends on.

## Scope

### Engine port (parallel track)

Copy V3's `packages/engine` work into V5 unchanged. This is sprint 0.5 effectively — Engineer-equivalent work but done by us as a chunk. Rule engine, form schemas, file builder, PMS structure all transplanted.

This is the moat. Don't touch the logic.

### Customer schema

Full schema as in [../../05-domains/01-CUSTOMER.md](../../05-domains/01-CUSTOMER.md).

### Customer repository

```typescript
class CustomersRepository {
  findById(orgId, id)
  findByMobileBlindIndex(orgId, mobile)
  findByPanBlindIndex(orgId, pan)
  search(orgId, query, types)
  list(orgId, filters, pagination)
  create(input)
  update(id, patch)
  archive(id)
  markForErasure(id)
}
```

### Customer service

- `findOrCreate(input, by)` — the critical dedup function
- `create`, `update`, `archive`, `markForErasure`
- `recordConsent`, `revokeConsent`
- `listCasesForCustomer`, `listConversationsForCustomer`, `listDocumentsForCustomer`

### UI screens

| Screen | Mobile + Desktop |
|---|---|
| `/people/customers` | List view: card grid (mobile), table (desktop), filters (active, dormant, has-open-case), search input |
| `/people/customers/[id]` | Profile with tabs: Overview · Cases · Conversations · Documents · Activity |
| `/people/customers/new` | Quick create form |

### Components in `packages/ui`

- `CustomerCard.svelte` — for list view
- `CustomerProfileHeader.svelte` — for detail page
- `MaskedMobile.svelte` — for display
- `<CapabilityGate key="module.customers">` wraps the section

## Tasks

| Task | Acceptance |
|---|---|
| Port engine from V3 | All engine tests pass in V5 |
| Customer schema + types | Zod schema in domain folder, types derived |
| CSFLE config for customers collection | Server can encrypt + decrypt round-trip |
| Blind index for mobile | `findByMobileBlindIndex` works |
| Repository methods | All 10 methods implemented + tested |
| Service `findOrCreate` | Dedups within org; allows same mobile across orgs |
| API endpoints | All routes from spec implemented |
| Customer list UI (mobile + desktop) | Renders, paginates, search works |
| Customer profile UI (mobile + desktop) | Tabs work, no errors when empty |
| BOLA isolation test | Org A's request for Org B's customer returns 404 |
| Migration script template | For when V3 → V5 import happens in Sprint 8 |

## Tests

- Schema accept/reject per field
- Service `create` happy path, dedup, cross-org
- Service `findOrCreate` returns existing on second call
- Repository blind-index correctness
- Repository CSFLE round-trip
- Repository tenant isolation
- UI: customer list renders + filters work
- UI: customer profile loads with empty/populated data
- E2E: create customer → search → open profile

## Decisions needed

- D-6 (final pipeline stage list) — needed before Sprint 2
- D-7 (DPDP consent wording) — needed for Customer creation flow

## What's not in this sprint

- Conversations (Sprint 2)
- Real Lead → Customer → Case (Sprint 3)
- Customer Vault for documents (Phase 2B)
- Relationship-health surfaces (loan anniversaries, dormancy nudges) — schema in place but UI defers to Phase 2B

## Exit criteria

- Owner can create a customer via UI
- Search for that customer by mobile, by name prefix, returns them
- A second create with same mobile finds the existing customer (no duplicate)
- Customer profile shows empty Cases / Conversations / Documents tabs
- BOLA isolation test passes
- All 20 code rules satisfied; PR template + Principle 12 block filled
- Mobile + desktop screenshots in PR

## Owner involvement

5-7 hours/day. Customer entity is foundational; we don't shortcut here.
