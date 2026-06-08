---
type: domain-overview
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Domain Model — Overview

## The 13 domains

Each is a self-contained folder in `domains/`. Each has its own schema, repository, service, routes, tests, and CLAUDE.md.

| # | Domain | Owns | Phase introduced |
|---|---|---|---|
| 1 | **customers** | The master person identity | Phase 2A Sprint 1 |
| 2 | **cases** | The master unit of work | Phase 2A Sprint 0 (ported from V3) |
| 3 | **conversations** | Customer-owned message threads | Phase 2A Sprint 2 |
| 4 | **leads** | Pre-conversion prospects | Phase 2A Sprint 3 |
| 5 | **follow-ups** | Scheduled DSA tasks | Phase 2A Sprint 4 |
| 6 | **documents** | KYC files at case + customer level | Phase 2A Sprint 5 (basic) / 2B Sprint 13 (vault) |
| 7 | **commissions** | DSA payout records | Phase 2A Sprint 6 |
| 8 | **partners** | External referral sources (builders, CAs, dealers) | Phase 2B Sprint 9 |
| 9 | **corp-dsas** | CorpDSA aggregators with payout slabs | Phase 2B Sprint 10 |
| 10 | **lenders** | Bank/NBFC reference data (3-band model) | Phase 2B Sprint 11 |
| 11 | **teams** | DSA org structure, roles, branches | Phase 2B Sprint 12 |
| 12 | **builders** | White-label tenant configuration | Phase 2B Sprint 9-10 |
| 13 | **capabilities** | Per-org module switches | Phase 2A Sprint 0 |

## The relationships

```
Organisation (DSA business)
  ├─ has many → User (team member with role)
  ├─ has one → CapabilityState
  ├─ has many → Customer
  │             ├─ has one → Conversation
  │             │            └─ has many → ConversationEvent
  │             │                          └─ optional → Case
  │             ├─ has many → Document (Customer Vault)
  │             ├─ has many → Case
  │             │              ├─ has many → LenderApplication
  │             │              ├─ has many → Document (Case Checklist)
  │             │              ├─ has many → FollowUp
  │             │              ├─ has many → Offer (from Engine, cached)
  │             │              ├─ has many → BankInteraction
  │             │              └─ has one → CommissionRecord
  │             ├─ has many → Opportunity (cross-sell)
  │             └─ owns its → consent history
  ├─ has many → Lead
  │             └─ attributed to → Partner (optional)
  ├─ has many → Partner
  │             └─ has many → PartnerCommissionPayable
  └─ has many → Builder (Phase 2B)
                └─ has DSAPool

Global (DigitalDSA-owned, all-org-readable):
  ├─ Lenders
  ├─ LenderPolicies (PMS-authored)
  ├─ LenderEditorial (DigitalDSA view band)
  ├─ CorpDSAs (with monthly PayoutSlabs)
  └─ PipelineConfig (default stages)
```

## The two foundational rules

### 1. Customer is master identity; Case is master unit of work

A Customer can have many Cases. A Case belongs to one Customer (the primary applicant) plus optional co-applicant and guarantor Customer references.

**Plain example.** Priya takes a Home Loan in 2024 through Rahul (one Case). In 2026 she takes a LAP through the same Rahul (second Case). Both Cases point to the same Customer. Rahul sees Priya as one person with two cases on her profile.

### 2. Conversation is owned by Customer, not by Case

A WhatsApp message from a customer doesn't have to be tied to a specific case at the moment it arrives. A Customer owns the Conversation thread. Each ConversationEvent optionally links to a Case.

**Plain example.** Priya sends "Hi Rahul, please call me." Rahul receives it. He doesn't yet know if it's about her active LAP or her old Home Loan question. The message lands on Priya's Conversation. When Rahul calls and finds out, he tags the event to the LAP case afterward.

## What lives at the tenant level vs. globally

| Tenant-scoped (per org_id) | Globally readable |
|---|---|
| Customers, Cases, Conversations, Leads, Documents | Lenders (entity) |
| Follow-ups, Commissions | Lender policies (PMS) |
| Partners (each org curates its own) | Lender editorial (DigitalDSA view) |
| Users, Teams, Branches | CorpDSAs + PayoutSlabs (versioned) |
| CapabilityState | Pipeline config defaults |
| Audit events | Capability manifest |

Cross-tenant access is **never** allowed at the data level. Even global-readable data is read-only for tenants — only DigitalDSA staff (via admin app) can write.

## Why we split data this way

If we let tenants write to a shared collection (say, RM contacts), one tenant's bad data corrupts everyone's view. So global data is **DigitalDSA-curated**. Where crowdsourcing helps (RM contacts, lender editorial nudges), we accept submissions but they go through admin review before flipping into the global view.

## The Engine and PMS — separate but referenced

The rule engine (in `packages/engine`) and PMS (Policy Management System, in `packages/engine/policies` + admin app) are not domains in the same sense — they're **services** that domains call.

When a Case runs evaluation:
1. The Case service collects all evaluation inputs (Customer KYC, applicants, loan details)
2. Calls the Engine with those inputs
3. The Engine reads PMS-encoded policies and produces Offers
4. Offers get cached on the Case with a freshness timestamp

The dashboard never computes rates or eligibility itself. **"The dashboard is dumb about lenders."**

## How a new domain is added

1. Create `domains/<name>/` folder
2. Add `schema.ts` (Zod), `types.ts` (derived), `repository.ts`, `service.ts`, `routes.ts`
3. Add `__tests__/` with factories + service/repo/schema tests
4. Add `CLAUDE.md` (5KB max) and `README.md`
5. Register capability in `packages/types/src/capabilities.ts`
6. Add migration script if it needs DB collection setup
7. Document in this overview (one row in the table above)
8. Open PR — full review including Principle 12 gate

## Per-domain doc structure

Each domain doc (`01-CUSTOMER.md`, `02-CASE.md`, …) follows the same structure:

1. **What this domain is** — one paragraph
2. **Schema** — the Zod / TS schema in full
3. **Key fields explained** — why each non-obvious field exists
4. **Indexes** — what's indexed and why
5. **Service methods** — public API of the service
6. **Routes** — what HTTP endpoints exist
7. **UI surfaces** — what screens render this domain
8. **Cross-domain interactions** — what other domains call this one
9. **Migrations** — how this evolves
10. **Tests** — coverage approach
11. **Capability key** — which capability gates this domain

## Related docs

- Per-domain specs: `01-CUSTOMER.md` through `13-CAPABILITY.md`
- [../02-architecture/02-CODE-ARCHITECTURE.md](../02-architecture/02-CODE-ARCHITECTURE.md) — How a domain is structured internally
- [../08-database/01-MONGODB-SCHEMA.md](../08-database/01-MONGODB-SCHEMA.md) — Full collection list
