---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# Phasing — How We Get from V3 Today to V5 GA

## Three milestones

| Milestone | When | What ships | Who's building |
|---|---|---|---|
| **V3 Beta** | Week 6 | The current system, finished and stable, with the engine producing complete results for 50 hand-picked DSAs | The 10-engineer team |
| **V5 Phase 2A → GA** | Week 6 + 5 months ≈ Month 6 | Customer-rooted operating system on India infra: Customer entity, Universal Search, Real Lead→Case, Follow-up engine, WhatsApp dispatch, Commission machine | Just us (owner + Claude) |
| **V5 Phase 2B (post-GA)** | Months 7–10 | Differentiators: Partner CRM, CorpDSA payouts UI, Lender Hub 3-band, Builder white-label, 7-role team, API platform, Trust hardening | Just us, incrementally, driven by Beta feedback |

## V3 Beta — what's in scope

The narrow goal: a V3 that lets 50 Beta DSAs evaluate real loan files and produce real offer PDFs, with the engine producing complete results for every encoded lender × loan combination.

**In scope for V3 Beta:**
- Discharge in-flight work (ConfirmModal, S216, S217 batches)
- Finish LEND-1 Phase 3 + 4 (Plot & Equity)
- PMS coverage push: top 10 lenders × 6 loan types
- Engine regression sweep: 90 representative cases all produce complete results
- File builder verified for all 6 loan types
- India infra: Mongo Mumbai locked, Sentry self-hosted in Mumbai, logs swept of PII
- Beta tooling: in-app feedback widget, onboarding flow, sample case
- Team runbook, support email, status page

**Explicitly cut from V3 Beta** (all coming in V5):
- Customer entity (V3 stays case-rooted)
- Universal Search beyond the nav palette
- Follow-up engine
- WhatsApp Business API dispatch (V3 keeps wa.me deeplinks — opens user's WhatsApp app)
- Commission tracking
- External Partner CRM (V3 keeps F.1 DSA-to-DSA only)
- 7-role team scale (V3 keeps 4 roles)
- Lender Hub 3-band model
- Hinglish locale (V3 keeps en/hi/mr)
- Reports module (V3 keeps Analytics scorecard only)
- Knowledge Center

## V5 Phase 2A — what's in scope

The must-haves for public market launch. ~8 sprints, ~5 months with just us.

| Sprint | Weeks | Goal |
|---|---|---|
| Sprint 0 — Foundation | 1–2 | New repo, conventions, India infra, capability system, Customer schema, first end-to-end "Hello Customer" |
| Sprint 1 — Customer Entity | 3–4 | Real Customer with CSFLE, multi-tenant blind index, profile pages, migration helper for V3 import |
| Sprint 2 — Universal Search + Conversation Inversion | 5–6 | Persistent top search, customer-rooted Conversation entity, ConversationEvent with optional Case link |
| Sprint 3 — Real Lead→Case + Principle 12 PR Gate | 7–8 | Lead carries structured intake, conversion pre-fills form, source attribution chain, PR template enforced |
| Sprint 4 — Follow-up Engine + Work Queue | 9–10 | Follow-up entity, Home becomes Work Queue, auto-creation rules, forced next-action |
| Sprint 5 — WhatsApp Business API + Doc Collection | 11–12 | Gupshup adapter, outbound dispatch, inbound webhook routing, secure upload links |
| Sprint 6 — Commission 4-state Machine | 13–14 | Auto-create on disbursed, state transitions with evidence, slicing by bank/month/employee |
| Sprint 7 — Analytics Foundation | 15–16 | ClickHouse self-hosted in Mumbai, CDC pipeline from MongoDB, first reports |
| Sprint 8 — GA Readiness | 17–18 | Migration from V3 cohort, smoke tests, public-launch hardening, GA |

**Exit criterion for GA:** A solo DSA can run a case end-to-end — lead → customer → case → docs collected via WhatsApp → offers compared → disbursed → commission tracked — without leaving the portal or re-keying a person, and can find any record instantly via search.

## V5 Phase 2B — what's in scope

The differentiators, post-GA, sequenced by Beta-cohort feedback rather than fixed order.

| Sprint | Weeks (approx) | Goal |
|---|---|---|
| Sprint 9 — Partner CRM + Source Attribution | 19–20 | External Partner entity (builders, CAs, dealers), commission payable ledger, attribution chain |
| Sprint 10 — CorpDSA Payouts | 21–22 | Per-file per-lender comparison UI, flat facilitation fee enforcement, monthly update flow |
| Sprint 11 — Lender Hub 3-band | 23–24 | Published + editorial + data bands, contextual surfacing inside case, staleness flagging |
| Sprint 12 — Team Scale + Sub-DSA | 25–26 | 7 roles, branch scoping, assignment, Sub-DSA as sourcing User with internal split |
| Sprint 13 — Documents Real 5-state + Customer Vault + Camera Scan | 27–28 | Missing/Pending/Received/Rejected/Expired states, customer-level vault, Capacitor camera flow |
| Sprint 14 — Config-driven Pipeline + Hinglish + Knowledge + Reports | 29–30 | Stages from config not enum, Hinglish locale, Knowledge Center, Reports module |
| Sprint 15 — API Platform + Webhooks | 31–32 | Public API, signed webhooks, partner SDK |
| Sprint 16 — Trust Hardening + Tamper-evident Audit | 33–34 | SEC-7 credential rotation, Merkle audit chain, one-click export, A-19 evidence |

## V3 → V5 migration plan

At end of Phase 2A (around Month 6):

1. **Beta cohort invited to V5.** They keep V3 read-only access for 6 months.
2. **One-time migration script** ports their cases to V5's customer-rooted model. Cases are deduped on (org_id, normalised_mobile) into Customer records; conversation threads re-rooted.
3. **V3 frozen.** Bug fixes only. No new features.
4. **V3 archived** at Month 12.

## Calendar view

```
Month 1    Month 2    Month 3    Month 4    Month 5    Month 6    Month 7    Month 8    Month 9    Month 10
|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
V3 close-out (team)
V3 Beta (team operates, captures feedback)
                Sprint 0  Sprint 1  Sprint 2  Sprint 3  Sprint 4  Sprint 5  Sprint 6  Sprint 7  Sprint 8 = GA
                                                                                                          V5 Sprint 9, 10, 11, …
```

## What we tell Beta DSAs about V3 vs V5

> "V3 evaluates loan files brilliantly and produces client-ready offer documents. Use it for real cases right now. The full operating system — customer view, WhatsApp inside the app, commission tracking, follow-up engine — comes in V5 around month 6. You'll get migrated to V5 with all your data intact when it's ready. Until then, tell us what hurts most about V3; that drives what we build first in V5."

## Related docs

- [03-V3-STABILIZATION.md](03-V3-STABILIZATION.md)
- [04-TEAM-CHARTER.md](04-TEAM-CHARTER.md)
- [05-BETA-LAUNCH-GATE.md](05-BETA-LAUNCH-GATE.md)
- [../09-sprints/](../09-sprints/) — Per-sprint specs
