---
type: sprint
phase: V5-PHASE-2A
sprint: 3
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 3 — Real Lead → Customer → Case + Principle 12 PR Gate (Weeks 7-8)

## Goal

Make Lead → Case a real feature, not a status flip. The conversion creates/links a Customer, creates a Case, pre-fills the comprehensive form, attaches source attribution chain. Zero re-keying.

Plus: enforce the Principle 12 four-question gate as a CI check.

## Scope

### Lead domain

- Schema with structured intake fields ([../../05-domains/04-LEAD.md](../../05-domains/04-LEAD.md))
- Repository + service
- API endpoints (CRUD, transition, convert, drop)

### The transactional convert flow

- `LeadsService.convertToCase` runs in a MongoDB transaction:
  1. `findOrCreateCustomer` on lead's mobile
  2. Create Case with `customer_id` + `prefill_payload`
  3. Re-root Conversation if lead had one
  4. Flip lead status
  5. Audit event
- Rollback on any failure → no orphaned data
- Acceptance A-2: zero re-keying

### Case entity (port from V3)

- Schema with form_payload, stage history, lender_applications
- Repository + service (basic methods; full elaboration in later sprints)
- Form embed integration (D-1 decision applies)

### Pre-fill form

- Lead → Case carries `prefill_payload`
- Comprehensive form initialises with prefill on first render
- Each field tagged with `field_source: 'lead' | 'manual'` for audit
- DSA can edit any pre-filled field

### Principle 12 PR template + CI gate

- PR template with four-question block (see [../../04-security/04-PRINCIPLE-12-GATE.md](../../04-security/04-PRINCIPLE-12-GATE.md))
- CI script: greps PR body for the block; fails if missing
- If Q4 = "yes" without owner Co-approved-by trailer, blocks merge

## Tasks

| Task | Acceptance |
|---|---|
| Lead schema + intake fields | Per spec |
| Lead repository + service | CRUD + transition + convert + drop |
| Lead UI list + detail (mobile + desktop) | Per design |
| Lead create flow (quick + detailed) | Works on mobile and desktop |
| Case entity port from V3 | Schema, repo, service basics |
| Transactional `convertToCase` | Tested rollback on each step failure |
| Form embed integration | D-1 decision applied (default: embedded) |
| Pre-fill payload propagates | Every captured field carries forward |
| Source attribution chain | Lead → Case → (eventual) Commission |
| Convert modal UX | "Pre-fills [list]" preview before commit |
| Principle 12 PR template | In `.github/PULL_REQUEST_TEMPLATE.md` |
| CI check for Principle 12 block | Fails PR if missing |
| A-2 lock test | Convert a lead → assert every captured field is pre-filled |

## Tests

- Lead create + transition flows
- Convert: customer auto-found-or-created
- Convert: case created with prefill
- Convert: source attribution chain set
- Convert: rollback on simulated case-create failure
- Convert: customer's existing conversation re-rooted
- A-2: zero re-keying assertion in CI

## What's not in this sprint

- Follow-up engine (Sprint 4)
- WhatsApp (Sprint 5)
- Commission auto-create on disbursed (Sprint 6)

## Exit criteria

- A-2 passes in CI
- Convert a lead → form opens with prefilled fields
- Audit chain visible: lead → customer → case
- Principle 12 PR template enforced; CI blocks missing/invalid blocks
- Mobile + desktop both work

## Owner involvement

5-7 hours/day.
