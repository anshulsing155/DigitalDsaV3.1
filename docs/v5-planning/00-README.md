---
type: index
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# DigitalDSA V5 Planning — Documentation Index

This folder holds the full planning documentation for the next 8 months of work — finishing V3 cleanly for Beta, then building V5 from scratch on India-only infrastructure with a customer-rooted data model and modular architecture.

Built from a long planning conversation in June 2026. Everything here is plain-English with concrete examples; the technical depth is in the per-doc specs.

## How to read these docs

If you're new to V5, read them in this order:

1. **Strategy** — Why V5, what it is, how we phase it
2. **Architecture** — The shape of the system
3. **Conventions** — How we write code
4. **Security** — How we protect data
5. **Domains** — The objects the system manages (Customer, Case, Conversation, …)
6. **UI/UX** — How the screens look and work
7. **Backend** — How the services and APIs work
8. **Database** — How data is stored and migrated
9. **Sprints** — The week-by-week build plan
10. **Decisions** — Open questions that need owners

## Folder map

```
docs/v5-planning/
  00-README.md                          ← you are here
  01-strategy/                          Why V5, V3 close-out, team charter
  02-architecture/                      System shape, monorepo, capability system
  03-conventions/                       Code rules, PR process, Claude sessions
  04-security/                          PII, DPDP, Aadhaar, Principle 12
  05-domains/                           Customer, Case, Conversation, ...
  06-ui-ux/                             Design principles, navigation, screens
  07-backend/                           API conventions, WhatsApp, analytics
  08-database/                          MongoDB, ClickHouse, migrations
  09-sprints/                           V3 close-out + V5 Phase 2A + 2B
  10-decisions/                         Open decisions, ADRs
```

## The five things to know before you start

1. **V3 lives on for 6 weeks**, then becomes Beta. The team of 10 engineers runs it.
2. **V5 is built by just two people** (the owner + Claude) in a new repo named `DigitalDSA-V5`.
3. **Database in Mumbai. App anywhere. No customer data ever leaks outside India.**
4. **Customer is the master record**, Case is the master unit of work — not the other way around.
5. **Every loan type and every screen is a switch.** Tenants get the modules they pay for. Disabled modules don't show; data persists.

## Quick index of all docs

### 01-strategy
- [01-VISION.md](01-strategy/01-VISION.md) — What V5 is, the moat, the principles
- [02-PHASING.md](01-strategy/02-PHASING.md) — Phase 2A → GA, Phase 2B post-GA
- [03-V3-STABILIZATION.md](01-strategy/03-V3-STABILIZATION.md) — 6-week close-out plan
- [04-TEAM-CHARTER.md](01-strategy/04-TEAM-CHARTER.md) — Team owns V3, we own V5
- [05-BETA-LAUNCH-GATE.md](01-strategy/05-BETA-LAUNCH-GATE.md) — 10 gates that must pass
- [06-CUSTOMER-FEEDBACK-LOOP.md](01-strategy/06-CUSTOMER-FEEDBACK-LOOP.md) — Weekly V5-input template

### 02-architecture
- [01-SYSTEM-OVERVIEW.md](02-architecture/01-SYSTEM-OVERVIEW.md) — High-level shape
- [02-CODE-ARCHITECTURE.md](02-architecture/02-CODE-ARCHITECTURE.md) — Route → Service → Repository
- [03-MONOREPO-LAYOUT.md](02-architecture/03-MONOREPO-LAYOUT.md) — Folder structure
- [04-CAPABILITY-SYSTEM.md](02-architecture/04-CAPABILITY-SYSTEM.md) — Modular switches
- [05-INDIA-INFRA.md](02-architecture/05-INDIA-INFRA.md) — DB Mumbai, app anywhere
- [06-MOBILE-DESKTOP-PARITY.md](02-architecture/06-MOBILE-DESKTOP-PARITY.md) — Same codebase, two viewports
- [07-TECH-STACK.md](02-architecture/07-TECH-STACK.md) — All chosen tools

### 03-conventions
- [01-CODE-RULES.md](03-conventions/01-CODE-RULES.md) — The locked list
- [02-TYPESCRIPT-PATTERNS.md](03-conventions/02-TYPESCRIPT-PATTERNS.md) — Encrypted<T>, Zod, runes
- [03-TESTING-STRATEGY.md](03-conventions/03-TESTING-STRATEGY.md) — Vitest, Playwright, MSW
- [04-PR-PROCESS.md](03-conventions/04-PR-PROCESS.md) — Template, CI gates, review queue
- [05-CLAUDE-SESSION-MGMT.md](03-conventions/05-CLAUDE-SESSION-MGMT.md) — /start /end and friends

### 04-security
- [01-PII-DISCIPLINE.md](04-security/01-PII-DISCIPLINE.md) — Encrypted<T>, no PII in logs
- [02-DPDP-COMPLIANCE.md](04-security/02-DPDP-COMPLIANCE.md) — Consent, erasure, audit
- [03-AADHAAR-MASKING.md](04-security/03-AADHAAR-MASKING.md) — Display + storage rules
- [04-PRINCIPLE-12-GATE.md](04-security/04-PRINCIPLE-12-GATE.md) — Four questions PR template
- [05-AUDIT-LOG.md](04-security/05-AUDIT-LOG.md) — Tamper-evident chain

### 05-domains
- [00-OVERVIEW.md](05-domains/00-OVERVIEW.md) — All domains and their relationships
- [01-CUSTOMER.md](05-domains/01-CUSTOMER.md)
- [02-CASE.md](05-domains/02-CASE.md)
- [03-CONVERSATION.md](05-domains/03-CONVERSATION.md)
- [04-LEAD.md](05-domains/04-LEAD.md)
- [05-FOLLOW-UP.md](05-domains/05-FOLLOW-UP.md)
- [06-DOCUMENT.md](05-domains/06-DOCUMENT.md)
- [07-COMMISSION.md](05-domains/07-COMMISSION.md)
- [08-PARTNER.md](05-domains/08-PARTNER.md)
- [09-CORP-DSA.md](05-domains/09-CORP-DSA.md)
- [10-LENDER.md](05-domains/10-LENDER.md)
- [11-TEAM.md](05-domains/11-TEAM.md)
- [12-BUILDER.md](05-domains/12-BUILDER.md)
- [13-CAPABILITY.md](05-domains/13-CAPABILITY.md)

### 06-ui-ux
- [01-DESIGN-PRINCIPLES.md](06-ui-ux/01-DESIGN-PRINCIPLES.md)
- [02-NAVIGATION-MODEL.md](06-ui-ux/02-NAVIGATION-MODEL.md)
- [03-LANGUAGE-LOCALES.md](06-ui-ux/03-LANGUAGE-LOCALES.md)
- [04-KEY-SCREENS.md](06-ui-ux/04-KEY-SCREENS.md)

### 07-backend
- [01-API-CONVENTIONS.md](07-backend/01-API-CONVENTIONS.md)
- [02-WHATSAPP-DISPATCH.md](07-backend/02-WHATSAPP-DISPATCH.md)
- [03-ANALYTICS-PIPELINE.md](07-backend/03-ANALYTICS-PIPELINE.md)
- [04-CAPABILITY-RUNTIME.md](07-backend/04-CAPABILITY-RUNTIME.md)

### 08-database
- [01-MONGODB-SCHEMA.md](08-database/01-MONGODB-SCHEMA.md)
- [02-CLICKHOUSE-SCHEMA.md](08-database/02-CLICKHOUSE-SCHEMA.md)
- [03-MIGRATION-PATTERN.md](08-database/03-MIGRATION-PATTERN.md)

### 09-sprints
- V3-STABILIZATION (6 weeks)
- V5-PHASE-2A (8 sprints to GA)
- V5-PHASE-2B (8 sprints post-GA)

### 10-decisions
- [OPEN-DECISIONS.md](10-decisions/OPEN-DECISIONS.md) — D-1 through D-14, with owners and deadlines

---

**This is a living set of docs.** As decisions land, ADRs go into `10-decisions/`. As sprints ship, the sprint docs get `status: shipped` in frontmatter. The README is the navigation surface; updates flow into the per-section docs first.
