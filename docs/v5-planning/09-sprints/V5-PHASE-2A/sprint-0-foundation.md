---
type: sprint
phase: V5-PHASE-2A
sprint: 0
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 0 — Foundation (Weeks 1-2, in parallel with V3 close-out)

## Goal

Open the V5 repo with the engineering operating system fully set up. No user-visible features. Pure scaffold.

By end of Sprint 0, we can write `domains/customers/` (Sprint 1) cleanly, with all the discipline (conventions, CI gates, capability system, India infra) already in place.

## Deliverables

### 1. Repo created and pushed

- `DigitalDSA-V5` private repo on GitHub
- `main` branch initial commit with monorepo skeleton
- README, CLAUDE.md, CONTRIBUTING.md
- License (proprietary, internal)

### 2. Monorepo scaffolded

- pnpm workspaces + Turborepo configured
- `apps/dsa-app` SvelteKit shell
- `apps/admin-app` SvelteKit shell (minimal)
- `apps/builder-app` placeholder (defer real build to Phase 2B)
- `packages/ui` initial component library (Button, Input, Card, etc.)
- `packages/types` with `Encrypted<T>`, `Loggable`, primitives
- `packages/engine` placeholder (will copy from V3 in Sprint 1)
- `packages/icons` initial set
- `packages/config` shared eslint, prettier, tsconfig, tailwind

### 3. Conventions enforced

- ESLint with all custom rules (no-raw-mongo, no-console, no-typeof-window, no-raw-fetch-mutations, require-capability, no-pii-in-url, no-hardcoded-user-strings)
- Prettier with consistent config
- Lefthook pre-commit (format, lint, type-check, PII pattern scan)
- Commitlint with Conventional Commits

### 4. CI pipeline

- GitHub Actions: type-check, lint, test, bundle-size check, PII audit
- PR template enforcement (Principle 12 block detection)
- Deploy preview to Vercel on every PR
- Production deploy on merge to main

### 5. India infrastructure

- MongoDB Atlas Mumbai cluster created (M10 starter)
- AWS KMS Mumbai key for CSFLE
- AWS S3 Mumbai bucket for files
- AWS SES Mumbai (reuse from V3)
- Vercel project linked; environment variables set
- Sentry self-hosted on Mumbai VPS (or GlitchTip) — DSN in env
- Redis on Mumbai VPS

### 6. Auth foundation

- JWT signing, refresh token rotation
- MSG91 OTP integration
- `hooks.server.ts` resolves `event.locals.user`
- Capacitor SecureStorage for mobile token persistence

### 7. Capability system

- Manifest in `packages/types/src/capabilities.ts`
- `<CapabilityGate>` component in `packages/ui`
- `domains/capabilities/` folder with schema, repo, service
- `hooks.server.ts` loads CapabilityState and gates routes
- Settings → Modules screen (placeholder; expanded in Sprint 1)

### 8. End-to-end smoke

A "Hello Customer" route demonstrates the full stack:
- Route `/api/internal/customers/hello` declares `capability_required = 'module.customers'`
- A toy `CustomersService.hello()` returns `{ message: "Hello, multi-tenant world." }`
- Capability disabled → 404; enabled → 200
- Logger logs only IDs; PII pattern scan would catch a violation
- Test passes; CI green

### 9. Claude session management

- `.claude/commands/` with `/start`, `/end`, `/sync`, `/review-queue`, `/spec`, `/principle12`, `/handoff`, `/new-domain`, `/migrate-collection`
- `.claude/skills/` initial set (add-domain-method, add-route, audit-pii, review-pr)
- Per-domain CLAUDE.md template
- Root CLAUDE.md drafted (target 15KB)
- `docs/SESSIONS/CURRENT.md` initialised
- Git hooks update SESSIONS/CURRENT.md on every commit

### 10. Documentation moved over

The `docs/v5-planning/` from V3 gets copied into V5's `docs/` as the architectural baseline.

## Daily breakdown (rough)

| Day | Owner+Claude focus |
|---|---|
| 1 | Repo create, monorepo scaffold, basic SvelteKit apps |
| 2 | packages/types primitives, eslint configs |
| 3 | India infra setup (Mongo, KMS, S3, Sentry-Mumbai) |
| 4 | Auth foundation (JWT, MSG91) |
| 5 | hooks.server.ts, capability registry skeleton |
| 6 | CapabilityGate component, Settings → Modules screen |
| 7 | CSFLE config, Encrypted<T> primitives in use |
| 8 | "Hello Customer" route end-to-end |
| 9 | CI pipeline, PR template, Principle 12 gate |
| 10 | Claude session management, docs migration |

## What we're explicitly NOT building in Sprint 0

- Real Customer schema (Sprint 1)
- Cases (Sprint 2 — actually Sprint 1 since we copy from V3)
- UI screens beyond Settings/Modules placeholder
- WhatsApp integration
- Engine port (Sprint 1)
- Form embedding

## Exit criteria

- V5 repo lives and runs locally on owner's + Claude's machine
- A demo session: log in, see Settings → Modules with one capability gated, toggle a capability, route disappears
- CI pipeline green on a meaningful PR
- All 20 code rules enforceable
- Principle 12 PR template + CI check live
- Owner can run `claude /start` and get a useful handoff

## Owner involvement

5-7 hours/day. This is the most-detailed sprint and sets the discipline for everything after.
