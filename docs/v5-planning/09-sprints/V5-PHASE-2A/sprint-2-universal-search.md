---
type: sprint
phase: V5-PHASE-2A
sprint: 2
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 2 — Universal Search + Conversation Inversion (Weeks 5-6)

## Goal

Make search instant from anywhere. Build the Conversation entity (customer-rooted). These two together because Search needs the Conversation foundation for "show me the last message thread" results.

## Scope

### Universal Search

- Persistent top bar on desktop, icon-to-fullscreen on mobile
- `Ctrl/Cmd+K` keyboard shortcut on desktop
- Search resolves Customer / Case / Lead / Partner via:
  - Name prefix match (normalised, non-encrypted side-channel field — see ADR for the tradeoff)
  - Mobile via blind index
  - PAN via blind index
  - Case ID (exact match)
- Result panel with typed groups
- Recent searches cached locally

### Conversation Entity

- Schema as in [../../05-domains/03-CONVERSATION.md](../../05-domains/03-CONVERSATION.md)
- Customer-rooted; events optionally case-linked
- Created on Customer create (one Conversation per Customer)
- No WhatsApp integration yet — placeholder for Sprint 5
- UI: customer profile → Conversations tab shows empty thread

### Voice input on the search bar

- Mic icon next to input
- Web Speech API (desktop) / Capacitor speech-recognition (mobile)
- Recognition language per user locale

## Tasks

| Task | Acceptance |
|---|---|
| Search backend `POST /api/internal/search` | Returns grouped results in < 300ms p95 |
| Multi-collection parallel queries (Customer + Case + Lead + Partner) | Ranked by recency × match strength |
| Blind-index lookups for mobile + PAN | Constant-time equality lookup |
| Normalised-name prefix index | Documented in ADR-0006 as accepted tradeoff |
| Top bar search component (desktop) | Persistent, Ctrl+K, accessible |
| Mobile search sheet | Fullscreen on tap, keyboard-friendly |
| Result panel | Groups, deep links, keyboard navigable |
| Recent searches local cache | Per user, 10 entries |
| Voice input | Toggle mic, transcript appears in input |
| Conversation entity schema | Per spec |
| Conversation repository + service | Basic CRUD + appendEvent |
| Customer create → auto-create Conversation | Tested |
| Conversation tab on customer profile | Renders empty state |

## Tests

- Search returns results across all 4 types
- Search by partial name finds customer
- Search by mobile finds customer
- Search by PAN finds customer (when PAN present)
- BOLA: Org A search doesn't return Org B's data
- Voice input: speech transcribes correctly in en/hi
- Conversation auto-creation on Customer create
- Conversation tab renders without errors

## Decisions needed

- D-9 (editorial review window) — not needed this sprint
- Tradeoff ADR on normalised name field

## What's not in this sprint

- Inbox screen (defer to Sprint 5 with WhatsApp)
- Conversation events (Sprint 5)
- Search for documents (Phase 2B)
- Search via API for external integrations (Phase 2B)

## Exit criteria

- Search finds a customer by partial name from any screen
- Search finds a customer by mobile blind index
- Search response p95 < 300ms on 10k-customer org
- Voice input works on mobile in Hindi
- Customer profile → Conversations tab works (even if empty)
- A-17 acceptance test passes in CI

## Owner involvement

5-7 hours/day.
