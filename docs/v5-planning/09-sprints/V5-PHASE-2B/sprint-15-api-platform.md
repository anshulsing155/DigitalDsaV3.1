---
type: sprint
phase: V5-PHASE-2B
sprint: 15
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 15 — API Platform + Webhooks (Weeks 31-32)

## Goal

External API for partner integrations. Signed webhook subscriptions. Distribution surface beyond the dashboard.

## Scope

### Public API surface

- `/api/v1/*` versioned, OpenAPI-documented
- Endpoints: cases, customers (consent-gated), commissions (read-only), leads (write)
- Auth: API keys with scopes
- Rate limits per key + per org + per endpoint

### Webhook subscriptions

- Org can register webhook URLs with event subscriptions
- Events: case.stage_changed, commission.received, lead.routed, document.received
- HMAC-signed payloads
- Retry with exponential backoff up to 24h
- Delivery audit trail

### Builder white-label foundation (placeholder)

This sprint sets up the API surface; full builder white-label is Phase 2B+ extended sprint.

### OpenAPI documentation site

- digitaldsa.com/docs/api/v1/
- Auto-generated from Zod schemas
- Interactive console for testing

## Tasks

| Task | Acceptance |
|---|---|
| API key entity + management | Argon2-hashed; revocable |
| Scope enforcement per endpoint | Tested |
| Per-key + per-org rate limits | 429 with Retry-After |
| Webhook subscription entity + service | CRUD |
| Webhook signing + verification | HMAC-SHA256 |
| Webhook delivery retry | Exponential backoff |
| Audit log on every API call | Per-key, per-endpoint |
| OpenAPI spec generation | Lives at docs site |
| First integration partner onboarded | Real call working |

## Tests

- API key auth + scope enforcement
- Webhook retry behaviour (deliver 1st attempt → fail → retry → succeed)
- Rate limit correctness
- DPDP: customer API access requires explicit consent flag
- Audit log completeness

## Decisions needed

- API pricing model — defaults to free up to N calls/month, then per-call

## Exit criteria

- Public API live, documented
- First integration partner integrated
- Webhook delivery monitored in Sentry

## Owner involvement

3-5 hours/day.
