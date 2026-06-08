---
type: sprint
phase: V5-PHASE-2A
sprint: 5
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 5 — WhatsApp Business API + Doc Collection (Weeks 11-12)

## Goal

Real WhatsApp dispatch from inside the app. Inbound webhooks route into customer-rooted conversations. Secure upload links for doc collection. "Without leaving the portal" — finally true.

## Scope

### Gupshup integration

- Provider facade (`packages/messaging/src/whatsapp/`)
- GupshupAdapter as first implementation
- Outbound dispatch via BullMQ queue
- Inbound webhook with signature verification
- 5 core templates approved with Gupshup → Meta:
  - Doc request
  - Status update: Sanctioned
  - Status update: Disbursed
  - Follow-up call reminder
  - Generic check-in

### Outbound flow

- DSA clicks "Send WhatsApp" on customer or case
- Template picker (or freeform if within 24h session)
- Customer's locale chosen automatically
- Enqueued, dispatched, status tracked
- ConversationEvent created with delivery_status

### Inbound flow

- Customer replies on their WhatsApp
- Gupshup webhook → our `/api/webhooks/whatsapp/gupshup`
- Signature verified
- Customer found by `from_number` blind index
- ConversationEvent created
- If unknown sender: logged, alert raised (not a customer of any org)
- Push notification to DSA

### Untagged inbound UX

- Inbound message lands on Customer thread with no case link
- Banner: "Which case is this about?"
- DSA picks from chip list of customer's active cases
- Event gets case_id attached

### Secure upload links

- DSA picks doc types to request
- Backend creates token (HMAC-signed, 7-day expiry, single-purpose)
- WhatsApp message sent with link: `digitaldsa.com/upload/<token>`
- Customer taps → mobile-optimised upload page
- File uploaded → virus scanned → encrypted blob in S3 Mumbai → VaultDocument created → auto-attached to case checklist

### SSE real-time updates

- `/api/internal/conversations/:id/stream` Server-Sent Events
- Conversation view updates in real-time as messages arrive
- Recent Activity feed (from Sprint 4) also pushed via SSE

### Voice notes outbound

- Mobile: hold mic button → record → release → preview → send
- Capacitor microphone permission
- Audio sent as attachment via Gupshup

## Tasks

| Task | Acceptance |
|---|---|
| Gupshup adapter | Sandbox sends + receives in test |
| Template approval process | All 5 templates approved by Gupshup |
| Outbound dispatch queue | Status flows queued → sent → delivered → read |
| Inbound webhook routing | Customer found via blind index; event created |
| Untagged inbound UX | Banner, chip selector, attach-to-case flow |
| Secure upload token generation | HMAC-signed, single-use, virus-scanned |
| Mobile upload page (public, token-gated) | Works without app install |
| Conversation thread UI (mobile + desktop) | WhatsApp-aesthetic; delivery badges |
| SSE for real-time updates | Browser tab updates without poll |
| Voice notes (mobile) | Record + send + receive |
| Push notifications for inbound | FCM payload no PII |

## Tests

- Outbound template send + delivery status update
- Inbound webhook → customer found → event created
- Untagged inbound A-15: 2-case customer's untagged message lands on Customer, attaches on disambiguation
- Secure upload token: single-use, expiry, file-type allowlist
- A-5: doc request → customer uploads → file lands in correct case + Customer vault
- Provider-adapter swap (mock Gupshup → mock other) test

## Decisions needed

- D-3 confirmed (Gupshup) — by Week 4 (well before this sprint)

## Exit criteria

- A-5 passes
- A-15 passes
- DSA can converse with customer end-to-end without leaving the app
- Doc collection round-trip working
- FR-COMM-1..6 satisfied
- The "without leaving the portal" Phase-1 exit clause becomes true

## Owner involvement

5-7 hours/day. Gupshup template approvals require legal/wording attention from owner.
