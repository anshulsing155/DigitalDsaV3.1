---
type: sprint
phase: V5-PHASE-2A
sprint: 4
status: planned
last_verified: 2026-06-02
owner: tech@digitaldsa.com
---

# V5 Sprint 4 — Follow-up Engine + Work Queue (Weeks 9-10)

## Goal

Home becomes a task-driven Work Queue. Follow-ups are first-class with auto-creation rules, snooze, forced next-action. The most-used screen of the product.

## Scope

### Follow-up entity

- Schema ([../../05-domains/05-FOLLOW-UP.md](../../05-domains/05-FOLLOW-UP.md))
- Repository + service

### Auto-creation rules

Initial rule set:
- `bank_query_raised → +1d follow-up (type: bank_query)`
- `doc_request_sent → +2d (type: doc_collection)`
- `stage.sanctioned → +7d (type: disbursement_check)`
- `lead.created → +7d (type: call) only if status still 'new'`

Rule engine in `domains/follow-ups/rules.ts` (config-driven; future-proof to move to DB).

### Work Queue aggregator

`/api/internal/work-queue` returns ranked feed of:
- Follow-ups due (manual + auto)
- Stuck-stage detection (case stage not advanced in N days)
- Open RM queries
- Expected disbursements (case sanctioned, awaiting disburse)
- Expiring documents (vault docs in next 14 days)

### Home redesign

- Mobile: Work Queue dominant; groups Overdue / Today / Tomorrow / This Week; swipe-right complete, swipe-left snooze
- Desktop: Three-column (Work Queue, Recent Activity, Stats)
- Recent Activity feed (WhatsApp-style)
- Stats demoted to secondary band

### Forced next-action

On follow-up completion:
- Modal: "What's next?"
- Options: pick date for next follow-up, mark "no next action," or "convert to case" (lead context)
- Default to a reasonable next date based on type

### Push notifications

- BullMQ cron checks `due_at` and `reminder_sent_at`
- Fires FCM (mobile) + Web Push (desktop)
- Notification payload is "doorbell only" (no PII)
- Tap → opens the follow-up's subject

## Tasks

| Task | Acceptance |
|---|---|
| Follow-up schema, repo, service | Per spec |
| Auto-creation rule engine | Bank query → follow-up tested |
| Work Queue aggregator endpoint | < 400ms p95 for 500-case org |
| Home redesign (mobile) | Swipe gestures work; haptic feedback |
| Home redesign (desktop) | Keyboard shortcuts (e/s/j/k) |
| Recent Activity feed renders | Real-time-ish (5s poll initially; SSE in Sprint 5) |
| Forced next-action modal | Cannot exit without choice |
| Push notification queue + dispatch | FCM + Web Push working |
| Locale labels in en/hi/Hinglish | "Aaj ka kaam", etc. |
| Snooze with smart suggestions | 1h, 4h, tomorrow, next week, custom |

## Tests

- Follow-up CRUD + transitions
- Auto-creation: bank_query event → follow-up appears within 1 minute
- Forced next-action lock test
- Work Queue endpoint perf
- Mobile gesture E2E
- Notification delivery (mock FCM in test)

## Exit criteria

- A solo DSA opens the app, sees their day's work, completes a task, gets prompted to set next action
- Auto-creation visibly working (raise a bank query → follow-up appears)
- Push notifications delivered on mobile
- FR-FUP-1..5 satisfied
- FR-HOME-1 unified Work Queue passes acceptance

## Owner involvement

5-7 hours/day. UX details matter most this sprint.
