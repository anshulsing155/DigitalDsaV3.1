---
type: strategy
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Vision

## What V5 is, in one paragraph

DigitalDSA V5 is the operating system for a Direct Selling Agent's loan business in India. It runs the daily flow — capturing leads, processing cases against multiple lenders, collecting documents, talking to customers and bank RMs, managing partners and team members, tracking commission. It's mobile-first, works offline on a mid-range Android phone, speaks Hindi and Hinglish natively, never lets anyone bypass the DSA, and never lets a customer's data leave India.

## Why V5 exists

V3 — what we have today — is genuinely strong in one place: the underwriting engine. The rule engine, the 12-type income profiling, the file builder, the policy management system — those are the moat. They evaluate a loan file better than anything in the Indian market.

But V3 is shallow everywhere else. It treats Customer as a blob attached to each case (so the same person taking two loans appears as two unrelated records). It has no real WhatsApp dispatch, no follow-up engine, no commission tracking, no search beyond a nav menu. The brain is great; the body is a stick figure.

V5 fixes the body without touching the brain. The engine, forms, file builder, and PMS get copied across as proven components. Everything else is rebuilt.

## The five non-negotiables

These shape every feature. If a feature violates one of these, it doesn't ship.

1. **Customer is the master identity.** Case is the master unit of work. A person has many cases; cases belong to a person. Built into the schema from line one.
2. **The DSA can never be bypassed.** No feature lets a lender, builder, partner, customer, or DigitalDSA itself transact around the DSA. This is the Principle 12 four-question gate, enforced on every PR.
3. **Customer data never leaves India.** Database is locked to Mumbai. Logs, caches, error reports — all on Indian servers. Foreign app servers may execute code briefly but must not store or log anything that identifies a person.
4. **Every loan type and every module is a switch.** Tenants enable what they pay for. Disabling a module hides it but never destroys data.
5. **Mobile and desktop ship together.** One codebase, two viewports. Every feature works one-handed on a 360px phone and ten-handed on a 1440px desktop, from sprint 1.

## The three things V5 must do that V3 doesn't

- **Customer-rooted everything.** Search by name → find the person → see every loan they've ever done with you. Send a WhatsApp message → it lives on the customer, not on a single case. Two cases for the same person are visibly the same person.
- **A real work queue.** The first screen the DSA opens shows "what do I do next?" — follow-ups due, documents waiting, bank queries open, customers to call back. Not a status dashboard. A to-do list.
- **Commission tracking that closes the money loop.** Every disbursed case auto-creates a commission row that flows Expected → Approved → Received. Sliceable by bank, month, partner, employee, CorpDSA. The DSA never opens Excel again.

## The three things V5 builds that no one else has

- **CorpDSA per-file payout comparison** with a flat DigitalDSA facilitation fee. The DSA picks the CorpDSA that pays them most for this specific file. We don't bias the choice; we earn the same either way.
- **Lender Hub three-band model.** Bank-published policy, our editorial view, your own case history — three visually distinct trust levels, in one place, surfaced inside the case so the DSA never has to leave to look something up.
- **Builder white-label that routes to nearby DSAs.** A builder embeds an eligibility widget on their site. Leads route to high-rated nearby DSAs in a transparent ranking. Builders in the pool are independently signed by us — never harvested from a DSA's partner list. This is how a builder grows a DSA's pipeline without ever bypassing them.

## The principles that govern every design call

1. **The DSA thinks in tasks, not modules.** Home answers "what do I do next?", never "how did I do this month?".
2. **Five primary destinations, hard cap.** Bottom nav has at most 5 items.
3. **One primary action per screen.** The single most likely next step is visually dominant.
4. **Status uses colour AND icon AND word.** A first-timer DSA can't be expected to learn the pipeline by colour alone.
5. **Hindi and Hinglish are first-class locales.** Not "translated from English" — written natively.
6. **₹ and lakh/crore everywhere.** Never millions, never $.
7. **Customer is the master identity; Case is the master unit of work.**
8. **Configuration over conditionals.** Adding a loan type or a stage is a config change, not a code change.
9. **The dashboard is dumb about lenders.** It renders what the engine returns. No rates or eligibility logic in the dashboard.
10. **Offline-tolerant.** Core read and capture flows work without a connection.
11. **Reliability before intelligence.** Document tracking before document OCR. AI surfaces inside existing screens; it isn't a tab.
12. **Amplify, never replace, the DSA.** The four-question test runs on every feature.

## Who V5 is for

- **Solo DSA** (one person, mid-range Android, basic English, Hindi-first). Primary optimisation target.
- **Small DSA firm** (2-20 people, a team lead plus sales/processing/telecallers).
- **Large DSA** (20+, multiple branches, role hierarchy).

Navigation and core flows don't change between these. Bigger tiers unlock more capabilities (team management, branch scoping, analytics), they don't restructure the app.

## What V5 explicitly does not do

- **No customer-facing portal.** Customers live on WhatsApp; we meet them there.
- **No RM portal as a standalone web app.** Bank RMs use WhatsApp + our in-app chat.
- **No AI as a destination.** AI helps inside existing screens (suggested follow-ups, policy lookups, document confirmation) but isn't a tab in the nav.
- **No public DSA leaderboard.** A single visible grade reads as surveillance, is gameable, and invites liability. Reputation is earned, portable, and private.
- **No revenue stream that bypasses the DSA.** Subscription from DSAs, flat facilitation on CorpDSA payouts, builder subscription with provable data-pool walls. That's the menu. Anything else is forbidden.

## Related docs

- [02-PHASING.md](02-PHASING.md) — How we get there
- [04-TEAM-CHARTER.md](04-TEAM-CHARTER.md) — Who builds what
- [../04-security/04-PRINCIPLE-12-GATE.md](../04-security/04-PRINCIPLE-12-GATE.md) — How the bypass rule is enforced
