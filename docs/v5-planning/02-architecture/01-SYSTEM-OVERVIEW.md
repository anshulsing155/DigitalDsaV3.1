---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 System Overview

## The shape, in one diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Clients                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ DSA web      │  │ DSA Android  │  │ Builder web  │        │
│  │ (SvelteKit)  │  │ (Capacitor)  │  │ embed widget │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼─────────────────┼─────────────────┼────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│  App tier (SvelteKit SSR on Vercel — anywhere)                │
│  Routes → Services → Repositories                             │
│  Capability gate at request boundary                          │
│  No PII storage; in-memory only during request                │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Data tier (Mumbai, locked)                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐    │
│  │ MongoDB Atlas  │  │ Redis (BullMQ) │  │ ClickHouse   │    │
│  │ ap-south-1     │  │ ap-south-1     │  │ self-hosted  │    │
│  │ CSFLE-encrypted│  │ no PII payloads│  │ aggregated   │    │
│  └────────┬───────┘  └────────────────┘  │ no PII       │    │
│           │                              └──────▲───────┘    │
│           └─── CDC pipeline ─────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  External services (India-based where possible)               │
│  Razorpay │ MSG91 │ Gupshup │ AWS SES Mumbai │ ImageKit │ KMS │
└──────────────────────────────────────────────────────────────┘
```

## The three apps

V5 is a monorepo with three SvelteKit applications sharing common packages.

### `apps/dsa-app`

The main product. The DSA-facing operating system. SSR-rendered, mobile-first, runs as a PWA in browsers and wrapped as a native Android app via Capacitor 7. This is where 95% of feature work happens.

### `apps/builder-app`

The Builder white-label portal (Phase 2B Sprint 9). Separate URL, builder-themed, used by a builder's marketing team to manage their embed widget, see leads captured, see DSA-pool performance, manage subscription. The customer-facing eligibility widget is embedded on the builder's own site as a small JS bundle (separate from this app).

### `apps/admin-app`

Internal admin. Used by DigitalDSA staff for: lender PMS policy authoring, capability bundle management for tenants, support tooling, audit log review. Not customer-facing.

## The four data stores

### MongoDB Atlas — Mumbai region

The primary operational database (OLTP). All entities live here: customers, cases, conversations, leads, partners, commissions, audit events, the works.

- **Region: ap-south-1 (Mumbai), locked.** Region cannot be changed without owner approval.
- **CSFLE (Client-Side Field-Level Encryption)** on every PII field. Customer names, mobiles, PANs, Aadhaar, financial numbers — encrypted at the driver layer before they leave the app server. The Atlas operators see ciphertext only.
- **Key management:** AWS KMS Mumbai. Per-org KEKs; field-level DEKs derived per-org.
- **Indexes:** Tenanted by `org_id`. Blind indexes (HMAC) on searchable encrypted fields (mobile, PAN, email).
- **Backups:** Atlas snapshot daily; encrypted; stored in S3 Mumbai.

### Redis — Mumbai VPS

Used for:
- **BullMQ queues** (background jobs: WhatsApp dispatch, email send, OCR, analytics CDC)
- **Session store** for SvelteKit (auth tokens cached, no PII)
- **Rate-limiter state** (per-IP, per-user, per-API-key)
- **Capability flag cache** (per-org, 60s TTL)

Job payloads carry IDs, not PII. If a job needs customer data, it reads from MongoDB at runtime, never from the queue payload.

### ClickHouse — Mumbai VPS (Sprint 7)

The analytics database (OLAP). Used for:
- Reports module (Sales, Operations, Finance, Team)
- BI dashboards (Metabase self-hosted)
- CorpDSA / Builder analytics
- Lender data band (case-derived signals)

**No PII columns.** Names are hashed; mobiles are blind-indexed; amounts and counts are clear. Data subject erasure (DPDP) propagates from MongoDB to ClickHouse via tombstone events.

CDC pipeline from MongoDB to ClickHouse runs via BullMQ jobs (change-streams → queue → CH insert). Lag SLO: <5 min for hot tables, <1 hour for cold.

### S3 (Mumbai)

Used for:
- File storage for documents (resumes, ITRs, bank statements) — sometimes via ImageKit's signed-URL pipeline
- Audit log archive (daily Merkle-chained roots)
- Backups
- Static assets for the Builder white-label embed CDN

**Region: ap-south-1, locked.** Bucket policies enforce no-cross-region replication.

## Multi-tenancy

Every record is scoped to an `org_id`. Every query filters by `org_id`. There is no shared global data except:

- Lender policies (PMS) — read-only globally, authored by DigitalDSA staff
- Lender editorial entries — read-only globally
- Pipeline stage config defaults — overridable per-org
- Capability manifest — defines what capabilities exist; per-org state controls what's enabled

Cross-org access requests are 404'd (not 403'd) — a tenant should not even learn another tenant exists.

## Authentication and session

- **JWT-based** with 15-minute access tokens + 7-day refresh tokens
- **MSG91 OTP** for primary auth (mobile-based, Indian users)
- **Magic-link email** for builder portal logins (lower-frequency users)
- **Capacitor SecureStorage** for mobile token persistence
- **`activeRole` cookie** resolved server-side in `hooks.server.ts`; client selection is advisory only

## Capability gating at the edge

`hooks.server.ts` loads the org's `CapabilityState` at request boundary. Every route registers its required capability key in its manifest. If the org doesn't have that capability:

- The route returns 404 (not 403 — disabled capabilities don't exist for the tenant)
- The nav item doesn't render in `<NavSidebar>` / `<NavBottomBar>`
- The capability gate component (`<CapabilityGate key="...">`) hides the section

## API surface

Three distinct API surfaces:

| Surface | Audience | Auth | Versioning |
|---|---|---|---|
| `/api/internal/...` | The three SvelteKit apps | JWT session | Internal — change freely |
| `/api/v1/...` | External integrations (partners, CorpDSAs) | API key | Semver — versioned, breaking changes require new version |
| `/embed/v1/...` | Builder embed widget | Per-builder JWT | Versioned |

## Frontend architecture

- **Svelte 5 Runes** — `$state`, `$derived`, `$effect` — no legacy stores
- **TanStack Query** for server-state caching
- **Tailwind 4 + design tokens** — no hardcoded colours, sizes, or spacing
- **shadcn-style component library** in `packages/ui` — copy-pasted in, customised, owned by us
- **Container queries + viewport breakpoints** — mobile and desktop layouts in the same component
- **SvelteKit SSR** for first paint; client hydration follows

## Observability

- **Self-hosted Sentry on Mumbai VPS** — error tracking with strict `beforeSend` PII scrub
- **Self-hosted Uptime Kuma** — public status page (status.digitaldsa.com)
- **Metabase on Mumbai VPS** — internal BI from ClickHouse
- **Custom telemetry events** to ClickHouse for product analytics (funnel events, capability usage, performance metrics)

No third-party analytics (no GA, no Mixpanel, no Segment). Everything self-hosted.

## Related docs

- [02-CODE-ARCHITECTURE.md](02-CODE-ARCHITECTURE.md) — How code inside the app tier is organised
- [03-MONOREPO-LAYOUT.md](03-MONOREPO-LAYOUT.md) — Folder structure
- [04-CAPABILITY-SYSTEM.md](04-CAPABILITY-SYSTEM.md) — How the switches work
- [05-INDIA-INFRA.md](05-INDIA-INFRA.md) — Region-locking details, vendor map
- [07-TECH-STACK.md](07-TECH-STACK.md) — Full tool inventory
