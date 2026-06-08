---
type: domain
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
phase_introduced: 2A Sprint 3
capability_key: module.leads
---

# Lead Domain

## What this domain is

A Lead is a pre-conversion prospect. Captured loosely (often just name + mobile + loan interest), enriched over time with intake info, then promoted to a Customer + Case.

**Plain example.** A telecaller takes 30 calls a day. Each one starts as a Lead with mobile + interest. Some convert to Cases over the following weeks; most don't. Leads accumulate intake data progressively as the DSA learns more — and when conversion happens, that data pre-fills the case form, no re-keying.

## Schema

```typescript
export const LeadSchema = z.object({
  _id: ObjectIdSchema,
  org_id: ObjectIdSchema,
  lead_number: z.string(),                          // LD-2026-04531

  // Identity (intentionally lighter than Customer — may grow as we learn)
  optional_contact: z.object({
    full_name_plaintext: z.string().optional(),     // becomes Encrypted on conversion
    mobile_plaintext: z.string().optional(),
    email_plaintext: z.string().optional(),
  }).optional(),
  customer_id: ObjectIdSchema.optional(),           // set if we've identified the existing customer

  // Loan interest
  loan_type: z.enum(['home', 'lap', 'plot', 'personal', 'business', 'professional', 'bt_topup']),
  estimated_amount_inr: z.number().optional(),
  estimated_tenure_months: z.number().int().optional(),
  property_pincode: z.string().length(6).optional(),

  // Lifecycle
  status: z.enum(['new', 'contacted', 'qualified', 'interested', 'application_started', 'converted', 'disbursed', 'dropped']),
  status_history: z.array(z.object({
    from: z.string(),
    to: z.string(),
    at: z.date(),
    by_user_id: ObjectIdSchema,
    notes: z.string().optional(),
  })),
  follow_up_date: z.date().optional(),
  drop_reason: z.string().optional(),

  // Source
  source_kind: z.enum(['walk_in', 'self', 'referral', 'builder', 'ca', 'dealer', 'facebook', 'google', 'existing_customer', 'other']),
  source_partner_id: ObjectIdSchema.optional(),     // links to Partner if applicable
  source_notes: z.string().optional(),

  // Intake — progressively captured (pre-fills form on conversion)
  intake: z.object({
    income_type: z.string().optional(),
    employment_type: z.string().optional(),
    declared_monthly_income_inr: z.number().optional(),
    credit_score_estimate: z.number().optional(),
    co_applicant_present: z.boolean().optional(),
    target_lender_preferences: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),

  // Conversation
  conversation_id: ObjectIdSchema.optional(),       // optional; some leads have a thread before conversion
  call_log: z.array(z.object({
    call_at: z.date(),
    duration_seconds: z.number().int(),
    outcome: z.string(),
    notes: z.string(),
    by_user_id: ObjectIdSchema,
  })).default([]),

  // Conversion result
  converted_case_id: ObjectIdSchema.optional(),
  converted_at: z.date().optional(),

  // Lifecycle
  created_at: z.date(),
  updated_at: z.date(),
  created_by_user_id: ObjectIdSchema,
  assigned_to_user_id: ObjectIdSchema.optional(),
  branch_id: ObjectIdSchema.optional(),
  schema_version: z.literal(1),
});
```

## Indexes

| Index | Purpose |
|---|---|
| `(org_id, status, updated_at)` | Pipeline view by status |
| `(org_id, follow_up_date)` sparse | "follow up today" |
| `(org_id, assigned_to_user_id)` | "my leads" |
| `(org_id, source_partner_id)` sparse | Partner-attribution reports |
| `(lead_number)` unique | Lookup |

## Service methods

```typescript
class LeadsService {
  create(input, by): Promise<Lead>
  findById(orgId, id): Promise<Result<Lead, 'not_found'>>
  list(orgId, filters, pagination): Promise<{ items: Lead[]; total: number }>
  update(id, patch, by): Promise<Result<Lead, 'not_found' | 'invalid'>>
  transitionStatus(id, to, notes, by): Promise<Lead>

  // Conversion — the critical method
  convertToCase(id, by: User): Promise<Result<{ case: Case; customer: Customer }, 'invalid' | 'duplicate'>>

  drop(id, reason, by): Promise<void>
}
```

### `convertToCase` — the transactional flow

This is the method that makes Lead → Case a real feature (not the V3 status-flip + blob-copy).

```typescript
async convertToCase(id: ObjectId, by: User): Promise<Result<...>> {
  return this.db.withTransaction(async (session) => {
    const lead = await this.repo.findById(by.org_id, id);
    if (!lead) return err('not_found');
    if (lead.status === 'converted') return err('already_converted');

    // 1. Find or create the Customer
    const customer = await this.customers.findOrCreate({
      full_name_plaintext: lead.optional_contact?.full_name_plaintext,
      mobile_plaintext: lead.optional_contact?.mobile_plaintext,
      // ... pass through whatever we have
    }, by);

    // 2. Create the Case with pre-fill payload
    const prefillPayload = buildPrefillFromLead(lead);
    const case_ = await this.cases.create({
      customer_id: customer._id,
      loan_type: lead.loan_type,
      loan_amount_requested_inr: lead.estimated_amount_inr ?? 0,
      form_payload: prefillPayload,
      source_attribution: {
        lead_id: lead._id,
        source_partner_id: lead.source_partner_id,
        attributed_at: new Date(),
      },
    }, by);

    // 3. Re-root the Conversation (if lead had one) to the customer
    if (lead.conversation_id) {
      await this.conversations.rerootToCustomer(lead.conversation_id, customer._id);
    }

    // 4. Update Lead
    await this.repo.update(id, {
      status: 'converted',
      converted_case_id: case_._id,
      customer_id: customer._id,
      converted_at: new Date(),
    });

    // 5. Audit
    await this.audit.record('lead.converted', { lead_id: id, case_id: case_._id, customer_id: customer._id }, by);

    return ok({ case: case_, customer });
  });
}
```

If any step fails, the whole transaction rolls back — the Lead remains pre-conversion, no orphaned data.

## Routes

| Method | Path | Capability |
|---|---|---|
| GET | `/api/internal/leads` | `module.leads` |
| GET | `/api/internal/leads/:id` | `module.leads` |
| POST | `/api/internal/leads` | `module.leads` |
| PATCH | `/api/internal/leads/:id` | `module.leads` |
| POST | `/api/internal/leads/:id/status` | `module.leads` |
| POST | `/api/internal/leads/:id/convert` | `module.leads` |
| POST | `/api/internal/leads/:id/drop` | `module.leads` |

## UI surfaces

| Screen | Description |
|---|---|
| `/leads` | Pipeline view (Kanban by status) + list view + source breakdown |
| `/leads/[id]` | Lead detail: timeline, call log, intake form, conversion CTA |
| `/leads/new` | Quick create (mobile + loan type) or detailed intake |
| Convert modal | Shows what data will pre-fill into the case form |

## Cross-domain interactions

| Other domain | When |
|---|---|
| Customers | On conversion — `findOrCreate` |
| Cases | On conversion — Case created with pre-fill payload + source attribution |
| Conversations | Pre-conversion Conversation moves to Customer on conversion |
| Partners | `source_partner_id` ties to Partner |
| Follow-ups | Lead can carry follow-ups |
| Reports | Source attribution flows to revenue analytics |

## Capability key

`module.leads` — independent module; many small DSAs use this even without other modules.

## Related docs

- [00-OVERVIEW.md](00-OVERVIEW.md)
- [01-CUSTOMER.md](01-CUSTOMER.md)
- [02-CASE.md](02-CASE.md)
- [08-PARTNER.md](08-PARTNER.md)
- [../09-sprints/V5-PHASE-2A/sprint-3-lead-to-case.md](../09-sprints/V5-PHASE-2A/sprint-3-lead-to-case.md)
