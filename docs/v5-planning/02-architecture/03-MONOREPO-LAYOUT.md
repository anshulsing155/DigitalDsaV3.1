---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Monorepo Layout

## Why monorepo

Three apps (DSA, Builder, Admin) share code: UI components, types, the rule engine, the public SDK. Without a monorepo, every shared change becomes a publish-and-republish dance across three repos.

We use **pnpm workspaces + Turborepo** (Turbo for parallel build/test orchestration, pnpm for package resolution). Both are simple, well-supported, and don't lock us in.

## Folder structure

```
DigitalDSA-V5/
├── README.md                    Quick-start, how to run
├── CLAUDE.md                    Execution context for Claude (~15KB target)
├── CONTRIBUTING.md              How to submit a PR
├── pnpm-workspace.yaml          Workspace definitions
├── turbo.json                   Turbo task graph
├── package.json                 Root scripts (lint, test, build)
├── tsconfig.base.json           Shared TypeScript config
├── tsconfig.json                Path aliases
├── .github/
│   └── workflows/
│       ├── ci.yml               Type-check + tests + lint
│       ├── deploy-dsa.yml       DSA app to Vercel
│       ├── deploy-builder.yml
│       └── pii-audit.yml        Nightly PII scan
├── .husky/                      Pre-commit + pre-push hooks
├── .claude/                     Claude session management
│   ├── commands/                /start, /end, /sync, /review-queue, /spec
│   ├── skills/                  Reusable workflows
│   └── projects/                (per-engineer local, gitignored)
├── apps/
│   ├── dsa-app/                 Main DSA dashboard
│   │   ├── src/
│   │   │   ├── routes/          SvelteKit routes
│   │   │   ├── lib/             App-specific helpers
│   │   │   ├── hooks.server.ts
│   │   │   ├── hooks.client.ts
│   │   │   └── app.html
│   │   ├── static/
│   │   ├── capacitor.config.ts  Android wrapper config
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── builder-app/             Builder white-label portal (Sprint 9)
│   │   └── (same shape)
│   └── admin-app/               Internal admin (Sprint 0 minimal, grows)
│       └── (same shape)
├── packages/
│   ├── ui/                      Shared component library
│   │   ├── src/
│   │   │   ├── primitives/      Button, Input, Card, etc.
│   │   │   ├── compounds/       Modal, Drawer, Sheet, Toast
│   │   │   ├── domain/          CustomerCard, CaseRow, etc.
│   │   │   └── tokens.ts        Colors, spacing, type ramp
│   │   ├── stories/             Storybook stories
│   │   └── package.json
│   ├── engine/                  Rule engine (copied from V3, modernised)
│   │   ├── src/
│   │   │   ├── income/          12-type income profiling
│   │   │   ├── eligibility/     Eligibility gates
│   │   │   ├── math/            EMI, FOIR, LTV
│   │   │   ├── deviation/       Red → amber recovery
│   │   │   └── policies/        JSON-Logic policy resolver
│   │   └── __tests__/
│   ├── types/                   Shared TypeScript types
│   │   ├── src/
│   │   │   ├── primitives.ts    Encrypted<T>, Money, Phone, etc.
│   │   │   ├── api.ts           ApiResponse, ApiError envelopes
│   │   │   └── index.ts
│   ├── sdk/                     Public API SDK (Sprint 15)
│   │   └── (Phase 2B)
│   ├── icons/                   Icon set (Lucide forked + custom)
│   └── config/                  Shared lint, prettier, TS configs
│       ├── eslint/
│       ├── tsconfig/
│       └── tailwind/
├── domains/                     The business model (shared across apps)
│   ├── customers/
│   │   ├── schema.ts            Zod schema
│   │   ├── types.ts             Derived TS types
│   │   ├── repository.ts        MongoDB access
│   │   ├── service.ts           Business rules
│   │   ├── routes.ts            Capability + route registry
│   │   ├── __tests__/
│   │   │   ├── service.test.ts
│   │   │   ├── repository.test.ts
│   │   │   ├── schema.test.ts
│   │   │   └── factories.ts
│   │   ├── CLAUDE.md            Domain-local execution context
│   │   └── README.md
│   ├── cases/
│   ├── conversations/
│   ├── leads/
│   ├── follow-ups/
│   ├── documents/
│   ├── commissions/
│   ├── partners/
│   ├── corp-dsas/
│   ├── lenders/
│   ├── teams/
│   ├── builders/
│   └── capabilities/
├── docs/                        Long-form documentation
│   ├── PROJECT.md
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── INFRA.md
│   ├── SECURITY.md
│   ├── PITFALLS.md              On-demand (not auto-loaded)
│   ├── FILE-MAP.md              On-demand
│   ├── SESSIONS/                Per-session handoffs
│   ├── SPECS/                   Per-sprint specs
│   ├── ADR/                     Architecture decisions
│   └── V5-INPUT/                Weekly customer feedback from team
├── etl/                         Analytics pipeline (Sprint 7)
│   ├── consumers/               MongoDB change-stream consumers
│   ├── transforms/              Fact/dim builders
│   └── schemas/                 ClickHouse table definitions
├── infra/                       Infrastructure-as-code
│   ├── terraform/               (optional, Sprint 8+)
│   ├── docker/                  Docker Compose for local dev
│   │   └── docker-compose.yml   Mongo + Redis + ClickHouse + Sentry
│   └── runbooks/
└── scripts/                     Utility scripts
    ├── migrate/                 Forward + rollback per migration
    ├── seed/                    Local dev seed data
    └── audit/                   PII audit, log scan, etc.
```

## Why each folder exists

### `apps/`

One folder per SvelteKit application. Each is independently deployable. None of them contain domain logic — they consume `domains/*` and `packages/*`.

### `packages/`

Code shared across apps. Each package has its own `package.json`, build output, and TypeScript config.

- **`ui/`** — components (Storybook-documented, mobile + desktop variants)
- **`engine/`** — the rule engine, ported from V3
- **`types/`** — primitive types like `Encrypted<T>`, `Money`, `Phone`
- **`sdk/`** — public SDK for external integrations
- **`icons/`** — icon set
- **`config/`** — shared lint/prettier/tsconfig/tailwind base configs

### `domains/`

The business model lives here, separate from any app. Domains can be imported by any app — DSA app, Admin app, even the SDK.

Why separate from `packages/`? Convention: `packages/` are general utilities; `domains/` are business entities. Different folders make the distinction visible.

### `etl/`

Analytics pipeline. Run as a separate worker process (BullMQ jobs) — doesn't ship with the apps but lives in the monorepo so types stay aligned.

### `infra/`

Docker Compose for local dev so every engineer can run Mongo + Redis + ClickHouse + Sentry locally without a shared dev environment. Runbooks for production operations.

### `docs/`

Long-form documentation. **The CLAUDE.md at repo root is intentionally separate** — it's the always-on doc for Claude sessions, kept tight (target 15KB). The rest are read on demand.

### `.claude/`

Claude session management — commands, skills, project state. Most of this folder is committed (skills, commands) so the whole team shares them. Per-engineer session storage is gitignored.

## Path aliases

`tsconfig.json` defines:

```json
{
  "compilerOptions": {
    "paths": {
      "$domains/*": ["domains/*"],
      "$ui": ["packages/ui/src"],
      "$ui/*": ["packages/ui/src/*"],
      "$engine": ["packages/engine/src"],
      "$engine/*": ["packages/engine/src/*"],
      "$types": ["packages/types/src"],
      "$types/*": ["packages/types/src/*"],
      "$lib/*": ["apps/dsa-app/src/lib/*"]
    }
  }
}
```

So imports read clean:

```typescript
import { CustomersService } from '$domains/customers/service';
import { Button } from '$ui/primitives/Button.svelte';
import type { Encrypted } from '$types/primitives';
```

## Turbo task graph

`turbo.json` defines the dependency between tasks:

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".svelte-kit/**"] },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "lint": { "outputs": [] },
    "type-check": { "dependsOn": ["^build"], "outputs": [] }
  }
}
```

`pnpm test` runs all tests across all packages and apps in parallel where possible.

## When to add a new package

Only add a new top-level `packages/` folder when:
- Code is genuinely shared across 2+ apps
- It has its own build / test boundary
- It justifies its own README and CLAUDE.md

Otherwise put new code in an existing package or in a domain.

## When to add a new domain

Add a new `domains/` folder when:
- It's a distinct business entity (Customer, Lead, Conversation are domains)
- It has its own schema, repository, service
- An engineer could work in it for a week without touching other domains

Don't add a new domain for:
- A utility function (goes in `packages/`)
- A UI variation (goes in `packages/ui`)
- A single API endpoint (goes in an existing domain)

## Related docs

- [02-CODE-ARCHITECTURE.md](02-CODE-ARCHITECTURE.md) — Inside a domain folder
- [07-TECH-STACK.md](07-TECH-STACK.md) — Tools used
- [../03-conventions/01-CODE-RULES.md](../03-conventions/01-CODE-RULES.md) — Folder discipline rules
