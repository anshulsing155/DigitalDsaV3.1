---
type: decisions
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Open Decisions — D-1 through D-14

Tracked decisions that gate sprint starts. Each has an owner, a deadline, and a default if not decided in time.

## Decision log

| # | Decision | Blocks | Owner | Deadline | Default if undecided |
|---|---|---|---|---|---|
| D-1 | Loan form: embedded view vs launched route | Sprint 2A.3 | Owner + Eng Lead | Week 4 | Embedded in case shell |
| D-2 | Offer/CorpDSA payout display: which payout figures shown, confirm DigitalDSA fee is flat regardless of CorpDSA pick | Sprint 2B.10 | Owner + Product | Week 16 | Show all payout figures; flat fee enforced as A-20 |
| D-3 | WhatsApp BSP and template approval ownership | Sprint 2A.5 | Owner + Backend | Week 4 | **Gupshup** (Indian, MSG91-adjacent, well-documented) |
| D-4 | Offline conflict policy for structured case fields | Sprint 2A.0 | Eng Lead | Week 6 | Last-write-wins for notes; flagged-merge for structured fields |
| D-5 | Exact role set and permission matrix per persona tier, including Sub-DSA scope | Sprint 2B.12 | Owner + Product | Week 20 | 7 roles per SRS §5.8 + Sub-DSA per §6.4 |
| D-6 | Final pipeline stage list, made config-driven from start | Sprint 2A.0 | Owner | Week 2 | Current V3 12 stages, kept config-driven |
| D-7 | DPDP consent wording for KYC reuse | Sprint 2A.1 | Owner + Legal | Week 6 | Model consent text drafted in [04-security/02-DPDP-COMPLIANCE.md](../04-security/02-DPDP-COMPLIANCE.md) |
| D-8 | Subscription/billing placement — Money pillar vs Settings | Sprint 2A.6 | Owner | Week 8 | Under Money pillar (per SRS) |
| D-9 | Editorial review window + data-band volume threshold | Sprint 2B.11 | Owner + Product | Week 22 | 90-day review window, 20-case threshold |
| D-10 | Revenue model: subscription-only at launch + flat facilitation fee + data-pool wall — ratify as binding architecture | Sprint 2B.9 | Owner | Week 14 | Subscription-only, flat fee, wall — all as binding |
| D-11 | Reputation signals: gradeable conduct events, due-process/appeal flow, encryption-boundary stance ("we cannot see" vs "we will not see") | Sprint 2B.16 | Owner + Legal | Week 28 | Computed signals only; appeal via human review; "we cannot see" (CSFLE keys per-org) |
| D-12 | Builder lead-routing transparency: merit-based vs partly paid; paid placements labelled "promoted" | Sprint 2B.9 | Owner | Week 18 | Merit-based default (proximity × reputation × load); paid placement labelled "promoted" |
| D-13 | Capability bundle pricing — Starter / Pro / Enterprise / Builder | Sprint 2A.0 | Owner + Finance | Week 8 | Draft pricing in [04-CAPABILITY-SYSTEM.md](../02-architecture/04-CAPABILITY-SYSTEM.md) |
| D-14 | OLAP DB confirmation — ClickHouse vs alternative | Sprint 2A.7 | Eng Lead + Owner | Week 12 | ClickHouse self-hosted on Mumbai VPS |

## What "default" means

Each decision has a default. If the deadline passes and the decision isn't formally taken, the default ships. This prevents sprints from stalling on missing decisions.

If we want to override a default later, that's a normal change order — a new ADR documents the swap.

## How decisions get made

| Decision class | Who decides | Mechanism |
|---|---|---|
| Architecture | Owner + Claude in conversation | ADR written, committed to `docs/ADR/` |
| Product / UX | Owner | Spec doc + acceptance criteria |
| Legal / Compliance | Owner + external counsel | Memo + ADR if affects architecture |
| Operational | Owner | Recorded in V5-input weekly notes |

## Active ADRs (planned to write)

| Slug | Decision it codifies |
|---|---|
| ADR-0001 | V5 monorepo with three apps + capability system |
| ADR-0002 | India infrastructure: DB Mumbai, app anywhere with PII discipline |
| ADR-0003 | Customer-rooted data model |
| ADR-0004 | Conversation owned by Customer; Case is optional link |
| ADR-0005 | CSFLE with per-org KEKs |
| ADR-0006 | Blind index for searchable encrypted fields |
| ADR-0007 | ClickHouse for OLAP |
| ADR-0008 | Gupshup as WhatsApp BSP |
| ADR-0009 | Principle 12 four-question gate as CI requirement |
| ADR-0010 | CorpDSA flat facilitation fee + monthly slab versioning |
| ADR-0011 | Builder white-label data-pool wall (signed contracts only) |
| ADR-0012 | Audit log Merkle chain |
| ADR-0013 | V3 → V5 migration approach (Beta cohort cutover at GA) |
| ADR-0014 | Repository pattern as the only DB access path |
| ADR-0015 | Capability gating returns 404 (not 403) for disabled features |
| ADR-0016 | Subscription-only revenue at launch |
| ADR-0017 | No customer-facing portal at launch (WhatsApp as transport) |
| ADR-0018 | Sub-DSA as User with sourcing role, not Partner |
| ADR-0019 | Hinglish as first-class locale |
| ADR-0020 | Document Vault per customer (not just per case) |

ADRs get authored as the corresponding decisions land. The list above is the target inventory; we accumulate naturally.

## Decision freeze

Once a decision lands and ships, it shouldn't be relitigated casually. To reopen:
1. A specific failure mode must be documented
2. A counter-proposal must be drafted as a new ADR
3. Old ADR's status updates to `superseded`
4. New ADR's status starts as `proposed`

If a decision is reopened more than once a year, that's a signal the original framing was wrong; sit on it longer next time.

## Related docs

- [../README.md](../00-README.md)
- ADRs live in `docs/ADR/`
- Per-sprint specs reference their gating decisions
