---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 0
---

# Capability Domain

Tracks which modules each tenant has enabled. See [../02-architecture/04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md) for the conceptual model and [../07-backend/04-CAPABILITY-RUNTIME.md](../07-backend/04-CAPABILITY-RUNTIME.md) for runtime details.

## Schema

```typescript
export const CapabilityStateSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,                       // one per org

  enabled: z.array(z.string()),                  // CapabilityKey strings
  bundle: z.enum(['starter', 'pro', 'enterprise', 'builder', 'custom']),

  effective_since: z.date(),

  scheduled_changes: z.array(z.object({
    key: z.string(),
    action: z.enum(['enable', 'disable']),
    at: z.date(),
    by_user_id: ObjectIdSchema,
  })).default([]),

  updated_at: z.date(),
  schema_version: z.literal(1),
});

export const CapabilityAuditSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  key: z.string(),
  action: z.enum(['enable', 'disable', 'scheduled_enable', 'scheduled_disable', 'bundle_change']),
  by_user_id: ObjectIdSchema,
  by_actor_kind: z.enum(['user', 'system', 'admin']),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string().optional(),
  at: z.date(),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id)` unique | One state per org |
| `(scheduled_changes.at)` | Cron for scheduled flips |
| `capability_audit: (org_id, at)` | History view |

## Service methods

```typescript
class CapabilitiesService {
  forOrg(orgId): Promise<CapabilityState>       // cached 60s
  enable(orgId, key, by, reason?): Promise<CapabilityState>
  disable(orgId, key, by, reason?): Promise<CapabilityState>
  applyBundle(orgId, bundleName, by): Promise<CapabilityState>
  schedule(orgId, key, action, at, by): Promise<CapabilityState>
  resolveDependencies(keys): { needed: string[]; missing: string[] }  // helper for UI
  computeMonthlyBill(orgId): Promise<{ items: BillingLineItem[]; total_inr: number }>
}
```

`forOrg` is the hot path — called on every request. Implemented with Redis cache (60s TTL); invalidated on `enable/disable/applyBundle`.

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/capabilities` | (read, own org) |
| POST | `/api/internal/capabilities/:key/enable` | (owner role) |
| POST | `/api/internal/capabilities/:key/disable` | (owner role) |
| POST | `/api/internal/capabilities/bundle` | (owner role) |
| GET | `/admin/orgs/:id/capabilities` | admin |
| POST | `/admin/orgs/:id/capabilities/:key` | admin |

## UI surfaces

| Screen | Description |
|---|---|
| Settings → Modules (`/settings/modules`) | Card grid per capability with toggle, dependency badges, "what changes" preview |
| Settings → Plan | Bundle selector with monthly cost preview |
| Admin → Tenant Manager → Capabilities tab | Per-tenant capability matrix |

## Dependencies UI

When user tries to enable `module.commission`:

```
"Enable Commission Management?"
"This requires: Customers (already enabled)"
"This requires: Cases (already enabled)"
"Monthly cost change: +₹0 (included in Pro bundle)"
[Enable] [Cancel]
```

When user tries to disable `module.customers`:

```
"Disable Customers?"
"⚠ This will also hide: Conversations, Commission, Lender Hub"
"Data will be preserved. You can re-enable anytime."
[Disable] [Cancel]
```

## Capability key

The capability domain itself isn't gated by a capability — it's foundational. Always accessible (but admin-role-gated).

## Related docs

- [../02-architecture/04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md) — Conceptual model
- [../07-backend/04-CAPABILITY-RUNTIME.md](../07-backend/04-CAPABILITY-RUNTIME.md) — Runtime
- [../09-sprints/V5-PHASE-2A/sprint-0-foundation.md](../09-sprints/V5-PHASE-2A/sprint-0-foundation.md)
