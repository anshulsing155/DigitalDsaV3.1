---
type: backend
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Capability Runtime

How the capability system runs at request time. Concept is in [../02-architecture/04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md); this doc is the implementation.

## Request lifecycle

```
HTTP request arrives
  ↓
hooks.server.ts
  1. Resolve user (decode JWT)
  2. Load CapabilityState for user.org_id
  3. Identify route's required capability
  4. If route requires capability and org doesn't have it → 404
  5. Else: attach capabilities to locals
  ↓
Route handler runs
  ↓
Service does its thing
  ↓
Response
```

## Loading capability state

```typescript
// In hooks.server.ts
import { capabilitiesService } from '$services/capabilities';

export const handle = async ({ event, resolve }) => {
  event.locals.user = await authenticate(event);

  if (event.locals.user) {
    event.locals.capabilities = await capabilitiesService.forOrg(event.locals.user.org_id);
  }

  const requiredCap = getRequiredCapabilityForRoute(event.url.pathname);
  if (requiredCap && (!event.locals.capabilities?.has(requiredCap))) {
    return new Response('Not Found', { status: 404 });
  }

  return resolve(event);
};
```

## `capabilitiesService.forOrg` — the hot path

```typescript
class CapabilitiesService {
  async forOrg(orgId: ObjectId): Promise<CapabilityStateView> {
    const cacheKey = `cap:${orgId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const state = await this.repo.findByOrg(orgId);
    if (!state) {
      throw new Error('capability state missing — must be created at signup');
    }

    const view = {
      enabled: new Set(state.enabled),
      bundle: state.bundle,
      has(key: string) { return this.enabled.has(key); },
    };

    await redis.setex(cacheKey, 60, JSON.stringify({ enabled: state.enabled, bundle: state.bundle }));
    return view;
  }

  async invalidate(orgId: ObjectId): Promise<void> {
    await redis.del(`cap:${orgId}`);
  }
}
```

Cached 60 seconds. Invalidated on any `enable/disable/applyBundle`.

## Route capability registration

Two patterns:

### Pattern A — Filename-based (preferred)

A build-time script reads every route file looking for an exported `capability_required`:

```typescript
// src/routes/api/internal/customers/+server.ts
export const capability_required = 'module.customers';

export async function GET({ locals }) { /* ... */ }
```

The script produces `src/lib/server/route-capabilities.ts`:

```typescript
export const ROUTE_CAPABILITIES: Record<string, string> = {
  '/api/internal/customers': 'module.customers',
  '/api/internal/customers/[id]': 'module.customers',
  '/api/internal/customers/[id]/cases': 'module.customers',
  '/api/internal/commissions': 'module.commission',
  // ...
};
```

`getRequiredCapabilityForRoute(pathname)` matches the path against this table.

### Pattern B — Manifest in domain `routes.ts`

For grouped capability declarations:

```typescript
// domains/customers/routes.ts
import { defineRoutes } from '$lib/server/routes';

export default defineRoutes({
  capability: 'module.customers',
  routes: [
    { method: 'GET',  path: '/customers' },
    { method: 'GET',  path: '/customers/:id' },
    { method: 'POST', path: '/customers' },
    // ...
  ],
});
```

Both feed the same `ROUTE_CAPABILITIES` table at build.

## UI gating

`<CapabilityGate>`:

```svelte
<!-- packages/ui/src/CapabilityGate.svelte -->
<script lang="ts">
  import { getContext } from 'svelte';
  let { key, children } = $props<{ key: string; children: any }>();
  let caps = getContext<CapabilityStateView>('capabilities');
</script>

{#if caps?.has(key)}
  {@render children()}
{/if}
```

Set context once in root `+layout.svelte`:

```svelte
<script>
  import { setContext } from 'svelte';
  let { data } = $props();
  setContext('capabilities', data.capabilities);
</script>
```

## Nav filtering

```typescript
// packages/ui/src/nav/NavSidebar.svelte
const visibleItems = $derived(
  NAV_CONFIG.pillars
    .map(pillar => ({
      ...pillar,
      children: pillar.children?.filter(c => !c.capability_required || caps.has(c.capability_required)),
    }))
    .filter(pillar => !pillar.capability_required || caps.has(pillar.capability_required))
);
```

A pillar with no visible children disappears entirely.

## Scheduled changes

A BullMQ cron job runs hourly:

```typescript
schedulerQueue.process('apply-scheduled-capability-changes', async () => {
  const dueChanges = await capabilityRepo.findDueScheduledChanges(new Date());
  for (const change of dueChanges) {
    if (change.action === 'enable') {
      await capabilitiesService.enable(change.org_id, change.key, systemUser);
    } else {
      await capabilitiesService.disable(change.org_id, change.key, systemUser);
    }
    await capabilityRepo.removeScheduledChange(change._id);
  }
});
```

Used for:
- Trial expiry → disable premium modules
- Plan upgrade scheduled for billing cycle start
- Beta feature rollout — enable for 10 orgs at a time

## Audit

Every capability change writes a `capability_audit` row:

```typescript
async enable(orgId, key, by, reason): Promise<CapabilityState> {
  const before = await this.forOrg(orgId);
  if (before.has(key)) return; // already on

  await this.repo.addKey(orgId, key);
  await this.auditRepo.record({
    org_id: orgId,
    key,
    action: 'enable',
    by_user_id: by._id,
    before: Array.from(before.enabled),
    after: Array.from(new Set([...before.enabled, key])),
    reason,
    at: new Date(),
  });

  await this.invalidate(orgId);
  return this.forOrg(orgId);
}
```

Owner can see capability history in Settings → Activity.

## Billing computation

```typescript
class CapabilitiesService {
  async computeMonthlyBill(orgId): Promise<MonthlyBill> {
    const caps = await this.forOrg(orgId);
    const teamMemberCount = await teamService.countActive(orgId);

    const lineItems: BillingLineItem[] = [];

    for (const key of caps.enabled) {
      const dim = BILLING_DIMENSIONS[key];
      if (!dim) continue;

      if (dim.unit === 'flat') {
        lineItems.push({ capability: key, amount_inr: dim.amount_inr });
      } else if (dim.unit === 'per_seat') {
        lineItems.push({ capability: key, amount_inr: dim.amount_inr * teamMemberCount });
      }
    }

    // Apply bundle discount if any
    const bundleDiscount = computeBundleDiscount(caps.bundle, lineItems);

    return {
      line_items: lineItems,
      bundle_discount_inr: bundleDiscount,
      total_inr: sum(lineItems.map(li => li.amount_inr)) - bundleDiscount,
    };
  }
}
```

Computed at billing cycle start; the result drives the Razorpay invoice.

## Testing

```typescript
describe('capability gating', () => {
  it('returns 404 when capability disabled', async () => {
    await givenOrgWith(orgId, { disabled: ['module.commission'] });
    const res = await fetch('/api/internal/commissions', { headers: { Authorization: ... } });
    expect(res.status).toBe(404);
  });

  it('hides nav items for disabled capabilities', async () => {
    // ...
  });

  it('disabling preserves data', async () => {
    await givenOrgWith(orgId, { enabled: ['module.commission'] });
    const commission = await createCommission();
    await capabilitiesService.disable(orgId, 'module.commission', adminUser);

    const fromDb = await commissionsRepo.findById(orgId, commission._id);
    expect(fromDb).toBeDefined();  // data still there
  });
});
```

## Related docs

- [../02-architecture/04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md)
- [../05-domains/13-CAPABILITY.md](../05-domains/13-CAPABILITY.md)
- [../03-conventions/01-CODE-RULES.md](../03-conventions/01-CODE-RULES.md) — Rule 5 (every route declares capability)
