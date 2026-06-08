---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 4
capability_key: module.follow_ups
---

# Follow-up Domain

## What this domain is

A Follow-up is a scheduled DSA task — a moment in the future when the DSA must do something on a specific Case, Customer, or Lead. Follow-ups are the heart of the Work Queue.

V3 had no Follow-up entity — only a single `follow_up_date` field on Lead. V5 makes Follow-up first-class with auto-creation, types, snoozing, completion-forces-next-action.

## Schema

```typescript
export const FollowUpSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  owner_user_id: ObjectIdSchema,                // who must do this

  // Subject (exactly one of these is set)
  customer_id: ObjectIdSchema.optional(),
  case_id: ObjectIdSchema.optional(),
  lead_id: ObjectIdSchema.optional(),

  // What
  type: z.enum([
    'call',
    'doc_collection',
    'bank_query',
    'customer_response',
    'sanction_letter',
    'disbursement_check',
    'meeting',
    'site_visit',
    'custom',
  ]),
  title: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
  due_at: z.date(),

  // Lifecycle
  status: z.enum(['pending', 'completed', 'snoozed', 'cancelled']),
  source: z.enum(['manual', 'auto']),           // auto if rule-engine created
  source_rule_id: z.string().optional(),        // which rule fired
  completed_at: z.date().optional(),
  completed_by_user_id: ObjectIdSchema.optional(),
  completion_outcome: z.string().optional(),    // free-text "what happened"
  next_followup_id: ObjectIdSchema.optional(),  // if completion spawned next
  snooze_until: z.date().optional(),
  snooze_history: z.array(z.object({ snoozed_at: z.date(), until: z.date(), by: ObjectIdSchema })).default([]),

  // Notification state
  reminder_sent_at: z.date().optional(),

  created_at: z.date(),
  created_by_user_id: ObjectIdSchema,
  updated_at: z.date(),
  schema_version: z.literal(1),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(owner_user_id, status, due_at)` | Work Queue load |
| `(case_id, status)` sparse | "follow-ups for this case" |
| `(customer_id, status)` sparse | "follow-ups for this customer" |
| `(org_id, due_at)` | Org-wide overview |
| `(reminder_sent_at, due_at)` sparse | Push reminder cron |

## Service methods

```typescript
class FollowUpsService {
  create(input, by): Promise<FollowUp>
  findById(orgId, id): Promise<Result<FollowUp, 'not_found'>>
  listForOwner(userId, filters): Promise<FollowUp[]>      // for personal Work Queue
  listForCase(caseId): Promise<FollowUp[]>
  listForCustomer(customerId): Promise<FollowUp[]>
  complete(id, outcome, by): Promise<{ completed: FollowUp; nextSuggested?: NextFollowUpSuggestion }>
  snooze(id, until, by): Promise<FollowUp>
  cancel(id, by): Promise<FollowUp>
  reschedule(id, newDueAt, by): Promise<FollowUp>

  // Auto-creation
  applyAutoRules(triggerEvent): Promise<FollowUp[]>       // called from case/conversation services
}
```

### Auto-creation rules

Configurable rules that emit follow-ups on triggering events:

```typescript
// Example rule registry (config-driven, can move to MongoDB later)
export const AUTO_RULES = [
  {
    id: 'bank_query_raised',
    on: { domain: 'cases', event: 'bank_query.created' },
    create: {
      type: 'bank_query',
      due_offset_hours: 24,
      title: 'Respond to bank query: {bank_query.question_short}',
      assigned_to: 'case.assigned_to_user_id',
    },
  },
  {
    id: 'doc_requested_not_received',
    on: { domain: 'cases', event: 'doc_request.sent' },
    create: {
      type: 'doc_collection',
      due_offset_hours: 48,
      title: 'Follow up on document: {doc_request.doc_type}',
    },
  },
  {
    id: 'disbursement_expected',
    on: { domain: 'cases', event: 'stage.sanctioned' },
    create: {
      type: 'disbursement_check',
      due_offset_hours: 168, // 7 days
      title: 'Confirm disbursement for {case.customer_name}',
    },
  },
  {
    id: 'lead_no_contact_7d',
    on: { domain: 'leads', event: 'created' },
    create: {
      type: 'call',
      due_offset_hours: 168,
      title: 'Check in with {lead.customer_name} — no contact in 7 days',
      only_if: 'lead.status == "new"',
    },
  },
];
```

### Force-next-action on completion

When a follow-up is completed:
1. UI shows "What's next?" modal
2. Options: pick a date for next follow-up, mark "no next action needed" (rare), or "convert to case" (if lead context)
3. If "next follow-up," the new one is created with `created_by source: 'manual'` and linked via `next_followup_id`

This prevents Cases/Leads from going silent without intent.

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/work-queue` | `module.follow_ups` (aggregator endpoint) |
| GET | `/api/internal/follow-ups/:id` | `module.follow_ups` |
| POST | `/api/internal/follow-ups` | `module.follow_ups` |
| PATCH | `/api/internal/follow-ups/:id` | `module.follow_ups` |
| POST | `/api/internal/follow-ups/:id/complete` | `module.follow_ups` |
| POST | `/api/internal/follow-ups/:id/snooze` | `module.follow_ups` |

`/api/internal/work-queue` merges follow-ups + auto-derived tasks (stuck-stage detection, expiring docs, open RM queries, expected disbursements) into one ranked feed.

## UI surfaces

| Screen | Description |
|---|---|
| Home / Work Queue | Single grouped list: Overdue · Today · Tomorrow · This Week |
| Case detail → Tasks tab | Follow-ups specific to this case |
| Customer profile → Activity tab | Follow-ups (open + done) |
| Quick-create from any screen | + button on case/customer/lead → "New follow-up" |

### Mobile gestures

- Swipe-right on an item → mark complete (opens "what's next?" modal)
- Swipe-left → snooze chooser (1h / 4h / tomorrow / next week / custom)
- Long-press → quick-edit
- Tap → opens the subject (case or customer)

### Desktop keyboard shortcuts

- `e` — mark complete (focused row)
- `s` — snooze
- `j` / `k` — navigate up / down
- `r` — reschedule
- `c` — convert (if lead context)

## Cross-domain interactions

| Other domain | When |
|---|---|
| Cases | Stage transitions can trigger auto-follow-ups |
| Conversations | Outbound message can offer "set a follow-up" |
| Leads | Status transitions can trigger auto-follow-ups |
| Push notifications | Cron checks `due_at` and `reminder_sent_at`, triggers FCM |
| Audit | Every create + complete + snooze logged |

## Capability key

`module.follow_ups` — independent; many DSAs need this even without other modules.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [02-CASE.md](02-CASE.md)
- [04-LEAD.md](04-LEAD.md)
- [../09-sprints/V5-PHASE-2A/sprint-4-followup-engine.md](../09-sprints/V5-PHASE-2A/sprint-4-followup-engine.md)
