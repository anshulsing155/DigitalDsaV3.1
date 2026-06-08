---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Capability System — How Modular Switches Work

## The idea, in plain English

Every loan type and every module in V5 is a switch on a fuse box. Each tenant (DSA organisation) has their own fuse box. They can turn switches on and off, and that decides what they see in the app. When a switch is off, the section doesn't show up in the navigation, the URL returns 404, the database tables are still there but unused. Turn it back on — everything reappears, with data intact.

**Example:** Rahul is a small DSA in Pune who only does Home Loans and Personal Loans. His fuse box has:
- `loan.home` ON
- `loan.personal` ON
- `loan.lap` OFF
- `loan.business` OFF
- `loan.plot` OFF
- `loan.professional` OFF
- `module.customers` ON
- `module.commission` ON
- `module.team` OFF (he's solo)
- `module.builder_whitelabel` OFF

When he logs in, his nav shows Home Loan, Personal Loan, Customers, Commission. Nothing else. If his business grows and he wants Team next year, we flip `module.team` ON — the menu items appear, his existing data flows through.

## Why this matters

Three reasons:

1. **One product, many configurations.** Solo DSAs pay less and get fewer modules. Large DSAs pay more and get the full suite. A builder white-label tenant gets only the embed-related capabilities. Same codebase, different fuse boxes.
2. **Beta cohort can opt in to features as they're built.** When Commission ships in Sprint 6, we enable it for 10 Beta DSAs first, watch what breaks, then roll wider. The flip is a database update, not a deploy.
3. **Disabling is non-destructive.** A tenant who removes a module doesn't lose data. A tenant who pauses a module during a busy month can restore it later. Data lives on; visibility toggles.

## How it's built

### Step 1 — Define capabilities in a manifest

There's one file: `packages/types/src/capabilities.ts`. It lists every capability that exists.

```typescript
// packages/types/src/capabilities.ts
export const CAPABILITIES = {
  // Loan types
  'loan.home':              { kind: 'loan', label: 'Home Loan' },
  'loan.lap':               { kind: 'loan', label: 'Loan Against Property' },
  'loan.plot':              { kind: 'loan', label: 'Plot Loan' },
  'loan.personal':          { kind: 'loan', label: 'Personal Loan' },
  'loan.business':          { kind: 'loan', label: 'Business Loan' },
  'loan.professional':      { kind: 'loan', label: 'Professional Loan' },
  'loan.bt_topup':          { kind: 'loan', label: 'Balance Transfer + Top-up' },

  // Modules
  'module.customers':       { kind: 'module', label: 'Customers',           depends_on: [] },
  'module.cases':           { kind: 'module', label: 'Cases',               depends_on: [] },
  'module.conversations':   { kind: 'module', label: 'Conversations',       depends_on: ['module.customers'] },
  'module.leads':           { kind: 'module', label: 'Leads',               depends_on: [] },
  'module.follow_ups':      { kind: 'module', label: 'Follow-ups',          depends_on: [] },
  'module.documents':       { kind: 'module', label: 'Documents',           depends_on: ['module.cases'] },
  'module.commission':      { kind: 'module', label: 'Commission',          depends_on: ['module.cases', 'module.customers'] },
  'module.partners':        { kind: 'module', label: 'Referral Partners',   depends_on: ['module.leads'] },
  'module.team':            { kind: 'module', label: 'Team Management',     depends_on: [] },
  'module.lender_hub':      { kind: 'module', label: 'Lender Hub',          depends_on: ['module.cases'] },
  'module.corp_dsa_compare':{ kind: 'module', label: 'CorpDSA Comparison',  depends_on: ['module.cases'] },
  'module.reports':         { kind: 'module', label: 'Reports & Analytics', depends_on: ['module.cases'] },
  'module.knowledge':       { kind: 'module', label: 'Knowledge Center',    depends_on: [] },

  // Distribution
  'module.builder_whitelabel': { kind: 'distribution', label: 'Builder White-label', depends_on: ['module.partners'] },
  'module.api_platform':       { kind: 'distribution', label: 'API + Webhooks',      depends_on: [] },

  // Sub-DSA
  'feature.sub_dsa':        { kind: 'feature', label: 'Sub-DSA Sourcing',   depends_on: ['module.team', 'module.commission'] },
} as const;

export type CapabilityKey = keyof typeof CAPABILITIES;
```

This is the **single source of truth**. Adding a capability means editing this file. Nothing else in the codebase declares capabilities.

### Step 2 — Store per-tenant state in MongoDB

```typescript
// domains/capabilities/types.ts
interface CapabilityState {
  org_id: ObjectId;
  enabled: Set<CapabilityKey>;           // Capabilities currently on for this tenant
  bundle: 'starter' | 'pro' | 'enterprise' | 'builder' | 'custom';
  effective_since: Date;
  scheduled_changes: Array<{
    key: CapabilityKey;
    action: 'enable' | 'disable';
    at: Date;
    by: ObjectId;
  }>;
  updated_at: Date;
}
```

Per-tenant. Loaded once per session, cached in Redis with 60s TTL.

### Step 3 — Gate at the request boundary

In `hooks.server.ts`:

```typescript
export const handle = async ({ event, resolve }) => {
  // Auth resolves event.locals.user (with org_id)
  event.locals.user = await authenticate(event);
  if (!event.locals.user) return resolve(event); // public route, fall through

  // Load capability state (Redis-cached)
  event.locals.capabilities = await capabilityService.forOrg(event.locals.user.org_id);

  // Find the required capability for this route
  const required = getRequiredCapabilityForRoute(event.url.pathname);
  if (required && !event.locals.capabilities.enabled.has(required)) {
    // 404, not 403 — the tenant should not know this capability even exists
    return new Response('Not Found', { status: 404 });
  }

  return resolve(event);
};
```

### Step 4 — Each route declares its capability

Routes register themselves via a small module export:

```typescript
// src/routes/api/internal/customers/+server.ts
export const capability_required: CapabilityKey = 'module.customers';

export async function GET({ locals }) { /* ... */ }
export async function POST({ request, locals }) { /* ... */ }
```

A build-time script collects all `capability_required` exports into a route-to-capability map, used by `getRequiredCapabilityForRoute()`.

### Step 5 — UI gates with a component

In Svelte 5:

```svelte
<!-- packages/ui/src/CapabilityGate.svelte -->
<script lang="ts">
  import type { CapabilityKey } from '$types/capabilities';
  let { key, children } = $props<{ key: CapabilityKey; children: any }>();
  let caps = $derived(globalThis.app.capabilities); // from context
</script>

{#if caps.enabled.has(key)}
  {@render children()}
{/if}
```

Usage:

```svelte
<CapabilityGate key="module.commission">
  <NavItem href="/commission" icon={DollarIcon} label="Paisa" />
</CapabilityGate>
```

### Step 6 — Tenant settings UI

Admin → Tenant Manager → per-tenant capability matrix:

- Each capability shown as a card with a toggle
- Dependency warnings: enabling `module.commission` shows "this also requires Customers — would you like to enable that too?"
- Bundle picker: a dropdown that flips multiple capabilities at once
- Schedule changes: "enable on March 1" instead of immediate

## Bundle definitions

```typescript
export const BUNDLES = {
  starter: [
    'loan.home', 'loan.personal',
    'module.cases', 'module.customers', 'module.leads', 'module.follow_ups',
    'module.documents', 'module.conversations',
  ],
  pro: [
    ...BUNDLES.starter,
    'loan.lap', 'loan.business', 'loan.plot', 'loan.professional', 'loan.bt_topup',
    'module.commission', 'module.partners', 'module.team',
    'module.lender_hub', 'module.reports', 'module.knowledge',
  ],
  enterprise: [
    ...BUNDLES.pro,
    'module.corp_dsa_compare', 'module.api_platform', 'feature.sub_dsa',
  ],
  builder: [
    'module.builder_whitelabel', 'module.partners',
    // No DSA-side modules — this is a builder portal
  ],
} as const;
```

## Disabling is safe

When a capability is disabled:

1. The route returns 404, the UI hides
2. **Database data persists** — Cases, Customers, all their history stays
3. **Audit log records the disable event** with `by` and `at`
4. **Scheduled jobs check capability state at runtime** — a commission auto-create job will skip an org with `module.commission` disabled rather than fail

If the capability is re-enabled, all data is immediately available. No re-import, no re-onboarding.

## Audit and observability

- `capability_audit` collection records every change (org_id, key, action, before/after, by, at)
- Telemetry events: `cap.toggled`, `cap.bundle_changed`
- Sentry breadcrumb on every request showing active capability set (capability keys only, no PII)

## How capabilities interact with billing

Each capability has a billable dimension in `BILLING_DIMENSIONS`:

```typescript
export const BILLING_DIMENSIONS = {
  'loan.home':         { unit: 'flat', amount_inr: 0 },         // included in base
  'loan.lap':          { unit: 'flat', amount_inr: 0 },
  'module.commission': { unit: 'flat', amount_inr: 0 },         // included in Pro
  'module.team':       { unit: 'per_seat', amount_inr: 200 },   // ₹200/seat/month
  'module.api_platform': { unit: 'flat', amount_inr: 5000 },    // ₹5000/month
  // ...
};
```

Billing service computes monthly invoice by summing `BILLING_DIMENSIONS[key]` for each enabled capability, applying bundle discounts. Plan changes flow through capability changes.

## Related docs

- [01-SYSTEM-OVERVIEW.md](01-SYSTEM-OVERVIEW.md)
- [../07-backend/04-CAPABILITY-RUNTIME.md](../07-backend/04-CAPABILITY-RUNTIME.md) — Runtime details
- [../05-domains/13-CAPABILITY.md](../05-domains/13-CAPABILITY.md) — Domain spec
- [../09-sprints/V5-PHASE-2A/sprint-0-foundation.md](../09-sprints/V5-PHASE-2A/sprint-0-foundation.md) — When this gets built
