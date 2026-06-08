---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 2
capability_key: module.conversations
---

# Conversation Domain

## What this domain is

A Conversation is the message thread between the DSA's team and a single Customer (and optionally a bank RM). The Conversation is **owned by the Customer**, not by any Case. Individual ConversationEvents may optionally link to a Case.

This corrects V3's design where threads were case-rooted — a customer with two open cases (HL + LAP) sending "please call me" had no clean home.

## Schema

```typescript
export const ConversationSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  customer_id: ObjectIdSchema,                  // OWNER
  rm_id: ObjectIdSchema.optional(),             // optional bank RM participant
  status: z.enum(['active', 'archived']),
  last_event_at: z.date(),
  unread_count_for_dsa: z.number().int().nonnegative(),
  unread_count_for_rm: z.number().int().nonnegative().optional(),
  pinned: z.boolean().default(false),
  created_at: z.date(),
  schema_version: z.literal(1),
});

export const ConversationEventSchema = z.object({
  _id: ObjectIdSchema,
  conversation_id: ObjectIdSchema,
  org_id: ObjectIdSchema,                       // denormalised for indexing
  case_id: ObjectIdSchema.optional(),           // optional case link — set after disambiguation
  channel: z.enum(['whatsapp', 'sms', 'email', 'call', 'note', 'in_app']),
  direction: z.enum(['inbound', 'outbound']),
  actor_kind: z.enum(['customer', 'dsa_user', 'rm', 'system']),
  actor_user_id: ObjectIdSchema.optional(),     // if dsa_user / rm

  body_encrypted: z.instanceof(Buffer),         // CSFLE
  attachments: z.array(z.object({
    kind: z.enum(['image', 'pdf', 'audio', 'video', 'document']),
    file_ref: z.string(),                       // S3 key
    file_name: z.string(),
    size_bytes: z.number(),
    mime: z.string(),
    sha256: z.string(),
  })).default([]),

  // WhatsApp-specific
  wa_message_id: z.string().optional(),
  delivery_status: z.enum(['queued', 'sent', 'delivered', 'read', 'failed']).optional(),
  failure_reason: z.string().optional(),

  // Template tracking (for outbound WA templates)
  template_id: z.string().optional(),
  template_variables: z.record(z.string()).optional(),

  // Secure upload link (for inbound doc collection)
  upload_token_id: ObjectIdSchema.optional(),

  created_at: z.date(),
  schema_version: z.literal(1),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, customer_id)` unique | One Conversation per Customer per org |
| `(conversation_id, created_at)` | Event timeline |
| `(case_id, created_at)` sparse | "events for this case" view |
| `(org_id, last_event_at desc)` | Inbox sort |
| `(wa_message_id)` sparse unique | Dedup inbound WA webhooks |

## Service methods

```typescript
class ConversationsService {
  // Conversation
  createForCustomer(customerId, by): Promise<Conversation>
  findByCustomer(orgId, customerId): Promise<Conversation | null>
  listForOrg(orgId, filters, pagination): Promise<{ items: Conversation[]; total: number }>
  archive(id, by): Promise<void>

  // Events
  appendEvent(conversationId, input: AppendEventInput, by: User): Promise<ConversationEvent>
  listEvents(conversationId, filters, pagination): Promise<ConversationEvent[]>
  attachToCase(eventId, caseId, by: User): Promise<ConversationEvent>
  detachFromCase(eventId, by: User): Promise<ConversationEvent>
  markRead(conversationId, byActor): Promise<void>

  // WhatsApp-specific helpers
  sendWhatsAppTemplate(customerId, templateId, vars, by): Promise<ConversationEvent>
  sendWhatsAppFreeform(customerId, body, attachments, by): Promise<ConversationEvent>
  ingestInboundWhatsApp(webhookPayload): Promise<ConversationEvent>   // called by WA webhook
  generateSecureUploadLink(customerId, expectedDocs, by): Promise<{ url, expires_at }>
}
```

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/conversations` | `module.conversations` |
| GET | `/api/internal/conversations/:id` | `module.conversations` |
| GET | `/api/internal/conversations/:id/events` | `module.conversations` |
| POST | `/api/internal/conversations/:id/events` | `module.conversations` |
| POST | `/api/internal/conversations/:id/events/:eventId/attach-case` | `module.conversations` |
| POST | `/api/internal/conversations/:id/mark-read` | `module.conversations` |
| POST | `/api/internal/conversations/send-whatsapp-template` | `module.conversations` |
| POST | `/api/webhooks/whatsapp/gupshup` | none (signature-verified) |

The Gupshup webhook is **the only conversation route without a capability key** — it's external and must always accept inbound.

## UI surfaces

| Screen | Description |
|---|---|
| Customer profile → Conversations tab | Full thread for that customer; per-case filter chip |
| Cases → case detail → Communications tab | Events linked to this specific case |
| More → Inbox | Org-wide unread conversations |
| Send WhatsApp button on customer/case | Composer with template picker |
| Document request flow | Multi-select doc types → generates secure link → sends WA |

## Untagged-inbound flow

When an inbound WhatsApp message arrives:

1. Backend identifies customer via `from_number` blind-index
2. ConversationEvent created with `direction: 'inbound'`, `case_id: undefined`
3. UI shows the event on Customer's Conversation thread with a banner: "Which case is this about?"
4. DSA either:
   - Clicks "Attach to case" → picks from a chip list of customer's active cases
   - Leaves it as standalone (it's general communication, no case)

## Cross-domain interactions

| Other domain | When |
|---|---|
| Customers | Conversation is created when Customer is created; one-to-one |
| Cases | Events may link via `case_id`; case detail filters events by `case_id` |
| Documents | Inbound doc attachments auto-flow to Customer vault (if no specific case) or to case checklist (if linked) |
| Follow-ups | Outbound message can set a "waiting for reply" follow-up |
| Audit | Every send + receive logged |

## Migration from V3

V3's `CommunicationThread` was case-rooted (`case_id` required). Migration:

1. For each V3 thread: read `case_id`, find the V5 Case, find its Customer
2. Find-or-create the customer's Conversation in V5
3. Migrate V3 messages as ConversationEvents, with `case_id` linked
4. Inbound messages with no clear case stay linked to the original case (V3 always had one)

## Capability key

`module.conversations` — depends on `module.customers`. Disabling hides the section; data persists.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [01-CUSTOMER.md](01-CUSTOMER.md)
- [02-CASE.md](02-CASE.md)
- [../07-backend/02-WHATSAPP-DISPATCH.md](../07-backend/02-WHATSAPP-DISPATCH.md)
- [../09-sprints/V5-PHASE-2A/sprint-5-whatsapp.md](../09-sprints/V5-PHASE-2A/sprint-5-whatsapp.md)
