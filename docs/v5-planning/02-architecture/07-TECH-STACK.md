---
type: architecture
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Tech Stack — Every Tool, Why It's Chosen

## Frontend

| Tool | Version | Why |
|---|---|---|
| SvelteKit | 5.x | SSR-first, Svelte 5 runes are concise and reactive, deploy-anywhere |
| Svelte | 5.x | Runes (`$state`, `$derived`, `$effect`) replace stores; cleaner than React/Vue |
| TypeScript | 5.x | Strict mode, derived from Zod schemas |
| Tailwind CSS | 4.x | Utility-first, design-token-driven, mobile-first by default |
| TanStack Query | 5.x | Server-state cache, refetch logic, optimistic updates |
| shadcn-style components | (copy-pasted in `packages/ui`) | Owned by us, customised, no npm dependency drift |
| Lucide Icons | (forked + custom) | Open-source icon set, India-localised additions |
| Storybook | 8.x | Component documentation, mobile + desktop variants |

## Backend (SvelteKit server)

| Tool | Why |
|---|---|
| Node.js 22 LTS | Production-stable, native fetch, performant |
| MongoDB Native Driver | No ORM (Mongoose / Prisma overhead), CSFLE-native |
| Zod | Single source of truth for schemas, runtime validation, type derivation |
| jose | JWT signing and verification |
| argon2 | Password hashing (where used), API key hashing |
| pino | Structured JSON logging, fast |
| BullMQ | Job queue (replaces Inngest for India) |

## Database

| Tool | Where | Why |
|---|---|---|
| MongoDB Atlas | ap-south-1 (Mumbai) | OLTP. CSFLE-native. Operationally mature. |
| Redis | Self-hosted Mumbai VPS | Cache, queue state, sessions. Battle-tested. |
| ClickHouse | Self-hosted Mumbai VPS | OLAP. Columnar. Sub-second on billion-row aggregations. Free self-host. |

## External services (India-based)

| Service | Vendor | Purpose |
|---|---|---|
| Payments | Razorpay | Subscriptions (eNACH), one-time payments, refunds |
| OTP / SMS | MSG91 | Mobile OTP for login |
| WhatsApp Business | Gupshup | Outbound + inbound business messaging |
| Email | AWS SES (Mumbai) | Transactional email |
| File storage | ImageKit (Mumbai origin) + AWS S3 (Mumbai) | Documents, attachments, backups |
| KMS | AWS KMS (Mumbai) | CSFLE key management |

## External services (foreign, with discipline)

| Service | Vendor | Why we accept the foreign location |
|---|---|---|
| Hosting (Vercel) | US-based, Mumbai edge | PII never persisted at app tier; logs scrubbed |
| Push notifications | Google FCM | Payloads contain no PII; FCM is just a doorbell |
| Captcha (if used) | hCaptcha India POP | India edge; data routes through us first |

## Self-hosted on Mumbai VPS (replacing US SaaS)

| Self-hosted | Replaces | Why self-host |
|---|---|---|
| Sentry | Sentry Cloud (US) | India sovereignty + lower cost at scale |
| Uptime Kuma | Statuspage / Better Uptime | India sovereignty + free |
| Metabase | Looker / Tableau Cloud | India sovereignty + free + reads from ClickHouse |
| BullMQ | Inngest | India sovereignty + simpler |

Alternative for Sentry: **GlitchTip** (open-source, Sentry-API-compatible, lighter). If Sentry self-hosting is operationally heavy, GlitchTip is the fallback.

## Mobile

| Tool | Why |
|---|---|
| Capacitor 7 | Native Android wrapper, plugin ecosystem, simpler than Cordova |
| Android Studio | Build, sign, submit to Play Store |
| FCM | Push notifications |

## DevOps

| Tool | Why |
|---|---|
| pnpm | Workspace-aware, fast, deterministic |
| Turborepo | Parallel task execution, smart caching |
| Docker Compose | Local dev environment (Mongo + Redis + CH + Sentry locally) |
| GitHub Actions | CI/CD (free for our scale) |
| Vercel | App deployment |
| Lefthook | Pre-commit hooks (faster than Husky) |
| Renovate | Dependency updates |
| Conventional Commits | Auto-changelog |

## Testing

| Tool | Why |
|---|---|
| Vitest | Unit tests, fast, watch mode |
| Playwright | E2E for critical paths |
| MSW | API mocking for frontend dev |
| Storybook | Visual regression for components |

## Observability

| Tool | What |
|---|---|
| Sentry (self-hosted) | Errors |
| Uptime Kuma (self-hosted) | Status page |
| ClickHouse + Metabase | Product analytics, BI |
| Vercel Speed Insights | Web vitals |
| Pino + log aggregation | Structured logs (no PII) |

## Critical "No" list

Tools we deliberately don't use, with reasoning:

| Avoided | Reasoning |
|---|---|
| GraphQL | REST + Zod is enough at our scale; GraphQL adds toolchain complexity |
| State management library (Redux, Pinia, etc.) | Svelte runes + TanStack Query is enough |
| ORM (Prisma, Mongoose, TypeORM) | CSFLE compatibility issues; native driver is cleaner |
| Google Analytics, Mixpanel, Segment | Foreign trackers; we use our own ClickHouse telemetry |
| Cloudflare in front of app | Cloudflare control plane is foreign; we use Vercel's CDN |
| Auth0, Clerk, Supabase Auth | Foreign-hosted auth; we own auth ourselves |
| Firebase | Foreign; FCM only for push payloads (no PII) |
| AWS Amplify | Vendor lock-in we don't need |
| Vercel Postgres / Vercel KV | Vercel data is foreign; ours is in Mumbai |
| Inngest, Trigger.dev | Foreign job-queue services; BullMQ is enough |
| ChatGPT plugins / OpenAI SDK in client | Client-side calls leak PII; if AI is used, it's server-side with redaction |

## When to add a new dependency

PR description must answer:

1. **What does this do that we can't do ourselves in 50 lines?**
2. **What's the bundle-size impact?**
3. **Is it India-friendly (no telemetry to foreign servers without our control)?**
4. **What's the maintenance status (last commit, open issues, license)?**

Without satisfactory answers, the dependency doesn't merge.

## Related docs

- [01-SYSTEM-OVERVIEW.md](01-SYSTEM-OVERVIEW.md)
- [05-INDIA-INFRA.md](05-INDIA-INFRA.md)
- [03-MONOREPO-LAYOUT.md](03-MONOREPO-LAYOUT.md)
